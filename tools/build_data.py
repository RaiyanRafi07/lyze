#!/usr/bin/env python3
"""Build the LeetCode Lab dataset: plugin/data/index.json + plugin/data/shard-<n>.json.

Source : raw/merged_problems.json   (2,913 problems, do not edit)
Spec   : CONTRACTS.md sections 1-3

The pipeline is deterministic: the same raw input always produces byte-identical
JSON (generatedAt is derived from the raw file's mtime, not from wall-clock time).

Run:  python tools/build_data.py
"""

from __future__ import annotations

import collections
import html
import json
import math
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_PATH = ROOT / "raw" / "merged_problems.json"
DATA_DIR = ROOT / "plugin" / "data"
PREMIUM_EXTRA_PATH = Path(__file__).resolve().parent / "premium_problems.json"

SHARD_SIZE = 150

# ---------------------------------------------------------------------------
# Pattern taxonomy (CONTRACTS.md section 3) -- order is the tie-break order.
# ---------------------------------------------------------------------------

PATTERNS = [
    {"id": "arrays-hashing", "label": "Arrays & Hashing",
     "blurb": "Hash map / set lookups trade memory for O(1) access.",
     "color": "#5ee7ff"},
    {"id": "two-pointers", "label": "Two Pointers",
     "blurb": "Two indices converge or chase across sorted data and palindromes.",
     "color": "#7dd3fc"},
    {"id": "sliding-window", "label": "Sliding Window",
     "blurb": "Grow and shrink a contiguous window over arrays and strings.",
     "color": "#60a5fa"},
    {"id": "prefix-sum", "label": "Prefix Sum",
     "blurb": "Precompute running totals for O(1) range queries.",
     "color": "#818cf8"},
    {"id": "binary-search", "label": "Binary Search",
     "blurb": "Halve a monotone search space each step, including on the answer.",
     "color": "#a78bfa"},
    {"id": "sorting", "label": "Sorting",
     "blurb": "Order the input first so a greedy or two-pointer pass gets easy.",
     "color": "#c084fc"},
    {"id": "stack", "label": "Stack",
     "blurb": "LIFO nesting for parentheses, undo semantics and nested structure.",
     "color": "#f472b6"},
    {"id": "monotonic-stack", "label": "Monotonic Stack",
     "blurb": "Keep indices in sorted order to find next greater / smaller in O(n).",
     "color": "#fb7185"},
    {"id": "queue-deque", "label": "Queue & Deque",
     "blurb": "FIFO processing and double-ended windows for bounded lookbacks.",
     "color": "#fda4af"},
    {"id": "linked-list", "label": "Linked List",
     "blurb": "Pointer rewiring without random access; dummy heads and fast/slow pointers.",
     "color": "#fb923c"},
    {"id": "tree-dfs", "label": "Tree DFS",
     "blurb": "Recurse through a tree accumulating a path or a per-subtree aggregate.",
     "color": "#34d399"},
    {"id": "tree-bfs", "label": "Tree BFS",
     "blurb": "Level-by-level traversal with a queue for widths and depths.",
     "color": "#2dd4bf"},
    {"id": "bst", "label": "Binary Search Tree",
     "blurb": "Exploit in-order ordering to search, insert or validate a BST.",
     "color": "#4ade80"},
    {"id": "trie", "label": "Trie",
     "blurb": "Shared prefix trees for dictionaries and prefix queries.",
     "color": "#a3e635"},
    {"id": "graph-dfs", "label": "Graph DFS",
     "blurb": "Explore components, islands and cycles with a visited set.",
     "color": "#facc15"},
    {"id": "graph-bfs", "label": "Graph BFS",
     "blurb": "Shortest paths in unweighted graphs via layered frontier expansion.",
     "color": "#fbbf24"},
    {"id": "topological-sort", "label": "Topological Sort",
     "blurb": "Order dependencies by peeling zero in-degree nodes (or post-order DFS).",
     "color": "#f59e0b"},
    {"id": "union-find", "label": "Union Find",
     "blurb": "Disjoint sets with path compression for connectivity and cycle checks.",
     "color": "#f97316"},
    {"id": "backtracking", "label": "Backtracking",
     "blurb": "Choose, recurse, un-choose: enumerate valid configurations with pruning.",
     "color": "#e879f9"},
    {"id": "greedy", "label": "Greedy",
     "blurb": "Take the locally best choice with an exchange argument that it is optimal.",
     "color": "#f0abfc"},
    {"id": "intervals", "label": "Intervals",
     "blurb": "Sort by start or end and sweep overlaps to merge, insert or count.",
     "color": "#22d3ee"},
    {"id": "heap-topk", "label": "Heap & Top-K",
     "blurb": "A bounded priority queue keeps the k best or most extreme elements.",
     "color": "#f43f5e"},
    {"id": "matrix", "label": "Matrix",
     "blurb": "2D index math, in-place rotations and grid traversal boundaries.",
     "color": "#38bdf8"},
    {"id": "bit-manipulation", "label": "Bit Manipulation",
     "blurb": "XOR tricks, masks and bit counting on integers and subsets.",
     "color": "#a5b4fc"},
    {"id": "dp-1d", "label": "1-D DP",
     "blurb": "One-dimensional state transitions built from earlier subproblems.",
     "color": "#c4b5fd"},
    {"id": "dp-2d", "label": "2-D DP",
     "blurb": "Grid or table DP where each cell combines neighbours or prefixes.",
     "color": "#d8b4fe"},
    {"id": "dp-trees", "label": "Tree DP",
     "blurb": "Tree DP where each node combines the states reported by its children.",
     "color": "#e9d5ff"},
    {"id": "strings", "label": "Strings",
     "blurb": "Character-level scans, parsing, encoding and pattern matching.",
     "color": "#67e8f9"},
    {"id": "math", "label": "Math",
     "blurb": "Number theory, modular arithmetic and closed-form counting.",
     "color": "#fcd34d"},
    {"id": "design", "label": "Design",
     "blurb": "Compose maps, lists and heaps behind a data-structure API.",
     "color": "#cbd5e1"},
    {"id": "recursion", "label": "Recursion",
     "blurb": "Split the problem into smaller identical subproblems and combine.",
     "color": "#fca5a5"},
]
PATTERN_IDS = [p["id"] for p in PATTERNS]
PATTERN_ID_SET = set(PATTERN_IDS)
PATTERN_INDEX = {p: i for i, p in enumerate(PATTERN_IDS)}

# Patterns with a deterministic scene builder in web/engine/patterns.js (contract section 5).
VISUAL_PATTERNS = {
    "two-pointers", "sliding-window", "binary-search", "arrays-hashing", "stack",
    "monotonic-stack", "graph-bfs", "graph-dfs", "dp-2d", "dp-1d", "linked-list",
    "tree-dfs", "tree-bfs", "heap-topk", "intervals", "trie", "union-find",
}

# ---------------------------------------------------------------------------
# Topic -> pattern weights
# ---------------------------------------------------------------------------

TOPIC_WEIGHTS = {
    "Array": {"arrays-hashing": 1.0},
    "String": {"strings": 1.4},
    "Hash Table": {"arrays-hashing": 1.8},
    "Dynamic Programming": {"dp-1d": 1.7, "dp-2d": 1.2},
    "Math": {"math": 1.5},
    "Sorting": {"sorting": 1.9},
    "Greedy": {"greedy": 2.1},
    "Binary Search": {"binary-search": 3.0},
    "Depth-First Search": {"graph-dfs": 1.0},
    "Matrix": {"matrix": 2.6},
    "Bit Manipulation": {"bit-manipulation": 3.0},
    "Breadth-First Search": {"graph-bfs": 1.0},
    "Tree": {"tree-dfs": 1.7},
    "Prefix Sum": {"prefix-sum": 3.0},
    "Two Pointers": {"two-pointers": 3.0},
    "Simulation": {"arrays-hashing": 0.6},
    "Heap (Priority Queue)": {"heap-topk": 3.0},
    "Counting": {"arrays-hashing": 0.7},
    "Graph": {"graph-dfs": 1.7, "graph-bfs": 1.3},
    "Stack": {"stack": 2.2},
    "Sliding Window": {"sliding-window": 3.0},
    "Binary Tree": {"tree-dfs": 1.7},
    "Enumeration": {"backtracking": 0.7},
    "Design": {"design": 3.0},
    "Database": {"design": 0.6},
    "SQL": {"design": 0.6},
    "Backtracking": {"backtracking": 3.0},
    "Union Find": {"union-find": 3.0},
    "Number Theory": {"math": 1.5},
    "Linked List": {"linked-list": 3.0},
    "Ordered Set": {"design": 0.8},
    "Segment Tree": {"design": 1.0},
    "Monotonic Stack": {"monotonic-stack": 3.0},
    "Combinatorics": {"math": 0.7},
    "Bitmask": {"bit-manipulation": 2.2},
    "Trie": {"trie": 3.0},
    "Divide and Conquer": {"recursion": 0.9, "binary-search": 0.5},
    "Memoization": {"dp-1d": 1.3},
    "Recursion": {"recursion": 2.2},
    "Queue": {"queue-deque": 2.5},
    "Geometry": {"math": 1.1},
    "String Matching": {"strings": 1.3},
    "Binary Indexed Tree": {"design": 0.9},
    "Hash Function": {"arrays-hashing": 0.9},
    "Binary Search Tree": {"bst": 3.0},
    "Shortest Path": {"graph-bfs": 1.5, "graph-dfs": 0.8},
    "Topological Sort": {"topological-sort": 3.0},
    "Rolling Hash": {"strings": 1.2},
    "Game Theory": {"math": 1.1},
    "Monotonic Queue": {"queue-deque": 3.0},
    "Brainteaser": {"math": 1.0},
    "Data Stream": {"design": 0.8},
    "Randomized": {"design": 0.8},
    "Merge Sort": {"sorting": 1.1},
    "Doubly-Linked List": {"linked-list": 2.2},
    "Counting Sort": {"sorting": 1.1},
    "Quickselect": {"sorting": 1.2, "heap-topk": 0.6},
    "Bucket Sort": {"sorting": 1.1},
    "Line Sweep": {"intervals": 1.4},
    "Probability and Statistics": {"math": 0.9},
    "Concurrency": {"design": 0.8},
    "Iterator": {"design": 1.0},
    "Interactive": {"design": 1.0},
    "Suffix Array": {"strings": 1.2},
    "Shell": {"design": 0.6},
    "Reservoir Sampling": {"design": 0.8},
    "Radix Sort": {"sorting": 1.1},
    "Eulerian Circuit": {"graph-dfs": 1.3},
    "Minimum Spanning Tree": {"graph-dfs": 1.1},
    "Strongly Connected Component": {"graph-dfs": 1.1},
    "Rejection Sampling": {"math": 0.8},
    "Sort": {"sorting": 1.5},
    "Biconnected Component": {"graph-dfs": 1.0},
}

# (compiled regex over the lower-cased title) -> weights
TITLE_RULES = [
    (re.compile(r"\btwo sum\b"), {"arrays-hashing": 2.2}),
    (re.compile(r"\b(3sum|4sum|three sum|four sum)\b"), {"two-pointers": 2.2}),
    (re.compile(r"\bvalid (parentheses|parenthesis)\b"), {"stack": 2.2}),
    (re.compile(r"\bclimbing stairs\b"), {"dp-1d": 2.0}),
    (re.compile(r"\bmerge intervals\b"), {"intervals": 2.2}),
    (re.compile(r"\b(level order|zigzag level)\b"), {"tree-bfs": 3.0}),
    (re.compile(r"\bright side view\b"), {"tree-bfs": 2.6}),
    (re.compile(r"\b(bottom left|largest value in each row|average of levels|"
                r"maximum width|cousins|deepest leaves|level sum|"
                r"n-ary tree level|vertical order traversal)\b"),
     {"tree-bfs": 2.2}),
    (re.compile(r"\blru cache\b"), {"design": 2.5}),
    (re.compile(r"\bword ladder\b"), {"graph-bfs": 2.0}),
    (re.compile(r"\bcourse schedule\b"), {"topological-sort": 2.5}),
    (re.compile(r"\bnumber of islands\b"), {"graph-dfs": 2.5}),
    (re.compile(r"\b(implement trie|word dictionary)\b"), {"trie": 2.5}),
    (re.compile(r"\bmedian of two sorted arrays\b"), {"binary-search": 2.0}),
    (re.compile(r"\b(sort colors|sort an array|merge sort)\b"), {"sorting": 1.6}),
    (re.compile(r"\bdesign\b"), {"design": 1.8}),
    (re.compile(r"\b(level|depth)\b.*\btree\b|\btree\b.*\b(level|depth)\b"), {"tree-dfs": 0.8}),
    (re.compile(r"\bpath sum\b"), {"tree-dfs": 1.3}),
    (re.compile(r"\blinked list\b"), {"linked-list": 1.4}),
    (re.compile(r"\bintervals?\b"), {"intervals": 2.6}),
    (re.compile(r"\b(meeting rooms?|non-overlapping|burst balloons|"
                r"remove covered|skyline|car pooling|my calendar)\b"),
     {"intervals": 2.4}),
    (re.compile(r"\bprefix\b"), {"prefix-sum": 1.2}),
    (re.compile(r"\bpalindrom"), {"two-pointers": 1.0, "strings": 0.6}),
    (re.compile(r"\bsubstring\b"), {"sliding-window": 0.8}),
    (re.compile(r"\b(trie|prefix tree)\b"), {"trie": 2.0}),
    (re.compile(r"\bisland"), {"graph-dfs": 1.4}),
    (re.compile(r"\bmatrix\b"), {"matrix": 1.0}),
    (re.compile(r"\bkth\b"), {"heap-topk": 0.7}),
    (re.compile(r"\b(top k|k most|k least|most frequent|least frequent)\b"), {"heap-topk": 1.2}),
    (re.compile(r"\bcoin change\b"), {"dp-1d": 1.4}),
    (re.compile(r"\bhouse robber\b"), {"dp-1d": 1.4}),
    (re.compile(r"\bmaximum subarray\b"), {"dp-1d": 1.3}),
    (re.compile(r"\bunique paths\b"), {"dp-2d": 1.4}),
    (re.compile(r"\bedit distance\b"), {"dp-2d": 1.4}),
    (re.compile(r"\bregular expression\b"), {"dp-2d": 1.0}),
    (re.compile(r"\bword break\b"), {"dp-1d": 1.2}),
    (re.compile(r"\bsubsets?\b"), {"backtracking": 1.0}),
    (re.compile(r"\bpermutations?\b"), {"backtracking": 1.2}),
    (re.compile(r"\bcombination sum\b"), {"backtracking": 1.4}),
    (re.compile(r"\bn-queens\b"), {"backtracking": 1.5}),
    (re.compile(r"\bsudoku\b"), {"backtracking": 1.2}),
    (re.compile(r"\b(topological|alien dictionary)\b"), {"topological-sort": 2.0}),
    (re.compile(r"\bunion find\b"), {"union-find": 2.0}),
    (re.compile(r"\brotat(e|ed|ion)\b.*\bmatrix\b|\bmatrix\b.*\brotat"), {"matrix": 1.8}),
    (re.compile(r"\b(single number|xor|reverse bits|number of 1 bits|counting bits)\b"),
     {"bit-manipulation": 1.8}),
    (re.compile(r"\b(add two numbers|reverse linked list|merge two sorted lists|"
                r"remove nth node|reorder list|linked list cycle|copy list with random)\b"),
     {"linked-list": 2.0}),
    (re.compile(r"\b(binary search)\b"), {"binary-search": 1.6}),
    (re.compile(r"\b(sliding window|longest substring without)\b"), {"sliding-window": 1.6}),
    (re.compile(r"\btwo pointer\b"), {"two-pointers": 1.6}),
    (re.compile(r"\b(min stack|daily temperatures|largest rectangle in histogram|"
                r"trapping rain water|car fleet|next greater)\b"),
     {"stack": 1.4, "monotonic-stack": 1.6}),
]

# lower-cased term found in the (cleaned) solution -> weights.  Counting is capped.
SOLUTION_TERMS = [
    ("two pointer", {"two-pointers": 0.35}),
    ("sliding window", {"sliding-window": 0.35}),
    ("binary search", {"binary-search": 0.3}),
    ("dynamic programming", {"dp-1d": 0.3}),
    ("memoiz", {"dp-1d": 0.2}),
    ("backtrack", {"backtracking": 0.35}),
    ("greedy", {"greedy": 0.3}),
    ("union find", {"union-find": 0.4}),
    ("disjoint set", {"union-find": 0.4}),
    ("topological", {"topological-sort": 0.4}),
    ("prefix sum", {"prefix-sum": 0.35}),
    ("monotonic stack", {"monotonic-stack": 0.4}),
    ("priority queue", {"heap-topk": 0.35}),
    ("min-heap", {"heap-topk": 0.25}),
    ("max-heap", {"heap-topk": 0.25}),
    ("hash map", {"arrays-hashing": 0.2}),
    ("hash table", {"arrays-hashing": 0.2}),
    ("hash set", {"arrays-hashing": 0.2}),
    ("breadth-first", {"graph-bfs": 0.3}),
    ("bfs", {"graph-bfs": 0.25}),
    ("depth-first", {"graph-dfs": 0.3}),
    ("interval", {"intervals": 0.3}),
    ("trie", {"trie": 0.4}),
    ("bitmask", {"bit-manipulation": 0.4}),
    ("bit manipulation", {"bit-manipulation": 0.35}),
    ("recursi", {"recursion": 0.2}),
    ("linked list", {"linked-list": 0.35}),
    ("binary tree", {"tree-dfs": 0.25}),
    ("in-order", {"bst": 0.2}),
    ("matrix", {"matrix": 0.2}),
    ("top k", {"heap-topk": 0.3}),
    ("k most", {"heap-topk": 0.3}),
    ("string", {"strings": 0.15}),
]

# Manual primary-pattern pins for canonical problems, so the ladder never gets
# obviously-wrong labels on the problems the whole app is demoed with.
PATTERN_OVERRIDES = {
    "two-sum": "arrays-hashing",
    "add-two-numbers": "linked-list",
    "longest-substring-without-repeating-characters": "sliding-window",
    "median-of-two-sorted-arrays": "binary-search",
    "longest-palindromic-substring": "two-pointers",
    "reverse-integer": "math",
    "string-to-integer-atoi": "strings",
    "palindrome-number": "math",
    "container-with-most-water": "two-pointers",
    "3sum": "two-pointers",
    "3sum-closest": "two-pointers",
    "letter-combinations-of-a-phone-number": "backtracking",
    "valid-parentheses": "stack",
    "merge-two-sorted-lists": "linked-list",
    "generate-parentheses": "backtracking",
    "merge-k-sorted-lists": "heap-topk",
    "swap-nodes-in-pairs": "linked-list",
    "remove-nth-node-from-end-of-list": "linked-list",
    "valid-sudoku": "matrix",
    "trapping-rain-water": "two-pointers",
    "climbing-stairs": "dp-1d",
    "merge-intervals": "intervals",
    "insert-interval": "intervals",
    "spiral-matrix": "matrix",
    "rotate-image": "matrix",
    "set-matrix-zeroes": "matrix",
    "word-ladder": "graph-bfs",
    "number-of-islands": "graph-dfs",
    "course-schedule": "topological-sort",
    "course-schedule-ii": "topological-sort",
    "binary-tree-level-order-traversal": "tree-bfs",
    "maximum-depth-of-binary-tree": "tree-dfs",
    "validate-binary-search-tree": "bst",
    "lowest-common-ancestor-of-a-binary-tree": "tree-dfs",
    "implement-trie-prefix-tree": "trie",
    "lru-cache": "design",
    "find-median-from-data-stream": "heap-topk",
    "kth-largest-element-in-an-array": "heap-topk",
    "top-k-frequent-elements": "heap-topk",
    "sort-colors": "two-pointers",
    "next-permutation": "two-pointers",
    "search-in-rotated-sorted-array": "binary-search",
    "find-minimum-in-rotated-sorted-array": "binary-search",
    "longest-increasing-subsequence": "dp-1d",
    "coin-change": "dp-1d",
    "house-robber": "dp-1d",
    "word-break": "dp-1d",
    "unique-paths": "dp-2d",
    "edit-distance": "dp-2d",
    "longest-common-subsequence": "dp-2d",
    "regular-expression-matching": "dp-2d",
    "permutations": "backtracking",
    "subsets": "backtracking",
    "n-queens": "backtracking",
    "combination-sum": "backtracking",
    "product-of-array-except-self": "prefix-sum",
    "subarray-sum-equals-k": "prefix-sum",
    "daily-temperatures": "monotonic-stack",
    "largest-rectangle-in-histogram": "monotonic-stack",
    "valid-anagram": "arrays-hashing",
    "group-anagrams": "arrays-hashing",
    "top-k-frequent-words": "heap-topk",
    "sliding-window-maximum": "queue-deque",
    "min-stack": "design",
    "serialize-and-deserialize-binary-tree": "design",
    "binary-tree-maximum-path-sum": "tree-dfs",
    "house-robber-iii": "dp-trees",
    "diameter-of-binary-tree": "tree-dfs",
    "invert-binary-tree": "tree-dfs",
    "kth-smallest-element-in-a-bst": "bst",
    "number-of-1-bits": "bit-manipulation",
    "counting-bits": "bit-manipulation",
    "single-number": "bit-manipulation",
    "reverse-bits": "bit-manipulation",
    "missing-number": "bit-manipulation",
    "happy-number": "math",
    "sqrtx": "binary-search",
    "powx-n": "recursion",
    "fizz-buzz": "strings",
    "move-zeroes": "two-pointers",
    "remove-duplicates-from-sorted-array": "two-pointers",
    "longest-consecutive-sequence": "arrays-hashing",
    "capacity-to-ship-packages-within-d-days": "binary-search",
    "koko-eating-bananas": "binary-search",
    "redundant-connection": "union-find",
    "accounts-merge": "union-find",
    "number-of-connected-components-in-an-undirected-graph": "union-find",
}

# Explicit judge-mode pins where the statement wording is too weak to infer the
# comparison the problem actually needs.
MODE_OVERRIDES = {
    "merge-intervals": "unordered",
    "insert-interval": "unordered",
    "3sum": "unordered",
    "3sum-closest": "exact",
}

# ---------------------------------------------------------------------------
# Text cleaning
# ---------------------------------------------------------------------------

# Applied to prose fields (description / solution / constraints / hints).
PROSE_REPLACEMENTS = [
    ("\ufeff", ""), ("\u200b", ""), ("\u200c", ""), ("\u200d", ""),
    ("\u2060", ""), ("\u2061", ""), ("\u00ad", ""),
    ("\u00a0", " "), ("\u202f", " "), ("\u2007", " "), ("\u2009", " "),
    ("\u2028", "\n"), ("\u2029", "\n"),
    ("\ufffd", " "),
    ("\u2018", "'"), ("\u2019", "'"), ("\u201a", "'"), ("\u201b", "'"),
    ("\u201c", '"'), ("\u201d", '"'), ("\u201e", '"'), ("\u201f", '"'),
    ("\u2032", "'"), ("\u2033", '"'),
    ("\u2010", "-"), ("\u2011", "-"), ("\u2012", "-"), ("\u2013", "-"),
    ("\u2014", "-"), ("\u2015", "-"), ("\u2212", "-"),
    ("\u2026", "..."),
    ("\u2264", "<="), ("\u2265", ">="), ("\u2260", "!="),
    ("\u00d7", "x"), ("\u221a", "sqrt"), ("\u221e", "infinity"),
    ("\u2192", "->"), ("\u27f6", "->"), ("\u2190", "<-"), ("\u27f5", "<-"),
    ("\u2191", "^"), ("\u2193", "v"),
]

HTML_TAG_RE = re.compile(
    r"</?(?:p|br|ul|ol|li|code|pre|strong|em|sub|sup|img|table|thead|tbody|"
    r"tr|td|th|h[1-6]|div|span|a|b|i|blockquote|hr|figure|figcaption)\b[^<>]*>",
    re.I,
)
ANY_TAG_RE = re.compile(r"</?[A-Za-z][A-Za-z0-9]*(?:\s[^<>]*)?/?>")
STUB_LINE_RE = re.compile(r"^(?:Example\s*\d+\s*:?|Constraints\s*:?)$", re.I)
FOLLOW_UP_RE = re.compile(
    r"(?:^|\n)[ \t]*Follow[\s-]*up[ \t]*:[ \t]*(?P<body>.*?)"
    r"(?=(?:\n[ \t]*(?:Example\s*\d+|Constraints)\s*:?[ \t]*$)|(?:\Z))",
    re.I | re.S,
)


def normalize_prose(text: str) -> str:
    """Normalize unicode noise in free-form prose."""
    if not text:
        return ""
    for src, dst in PROSE_REPLACEMENTS:
        if src in text:
            text = text.replace(src, dst)
    return text.replace("\r\n", "\n").replace("\r", "\n")


def strip_html(text: str) -> str:
    """Strip HTML tags/entities, but only when the string really looks like HTML."""
    if not text or not HTML_TAG_RE.search(text):
        return text
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = ANY_TAG_RE.sub("", text)
    text = html.unescape(text)
    for src, dst in PROSE_REPLACEMENTS:
        if src in text:
            text = text.replace(src, dst)
    return text


EMPTY_DESCRIPTION_FALLBACK = (
    "The source dataset does not include a written statement for this problem. "
    "Use the examples, constraints and hints below."
)


def clean_description(raw: str, extracted_examples: bool = False) -> tuple[str, list[str]]:
    """Return (clean_description, follow_up_sentences_found_in_description)."""
    follow_ups: list[str] = []
    if not raw:
        return "", follow_ups

    text = strip_html(normalize_prose(raw))

    for m in FOLLOW_UP_RE.finditer(text):
        body = m.group("body")
        body = re.sub(r"\s+", " ", body).strip()
        if body and body not in follow_ups:
            follow_ups.append(body)

    lines = text.split("\n")
    kept: list[str] = []
    for line in lines:
        stripped = line.strip()
        if STUB_LINE_RE.match(stripped):
            break
        if not stripped:
            continue
        kept.append(re.sub(r"[ \t]+", " ", stripped))

    # If examples were embedded in the description we cut at "Example 1:" and
    # they are emitted through the normal examples pipeline instead.
    if extracted_examples:
        pass

    paragraphs = "\n\n".join(kept).strip()
    paragraphs = re.sub(r"\n{3,}", "\n\n", paragraphs)
    if not paragraphs:
        paragraphs = EMPTY_DESCRIPTION_FALLBACK
    return paragraphs, follow_ups


def clean_sequence(items) -> list[str]:
    out: list[str] = []
    seen = set()
    for item in items or []:
        if not isinstance(item, str):
            item = str(item)
        s = strip_html(normalize_prose(item))
        s = re.sub(r"\s+", " ", s).strip()
        # Repair exponents lost with <sup> markup: "1 <= n <= 104" -> "10^4".
        s = re.sub(r"(?<![0-9])10([3-9])(?![0-9])", r"10^\1", s)
        if not s or s in seen:
            continue
        seen.add(s)
        out.append(s)
    return out


def clean_hints(items) -> list[str]:
    out: list[str] = []
    seen = set()
    for item in items or []:
        if not isinstance(item, str):
            continue
        s = strip_html(normalize_prose(item))
        s = re.sub(r"\s+", " ", s).strip()
        if not s or s in seen:
            continue
        seen.add(s)
        out.append(s)
    return out


def clean_solution(raw: str) -> str:
    """Light editorial cleanup: drop [TOC], unwrap $$math$$, bold, links, images."""
    if not raw:
        return ""
    text = strip_html(normalize_prose(raw))
    text = text.replace("[TOC]", "")

    # Images -> drop; links -> keep the label.
    text = re.sub(r"!\[(?:\\.|[^\]\\])*\]\([^)]*\)", "", text)
    text = re.sub(r"\[([^\]\n]+)\]\([^)]*\)", r"\1", text)
    # $$...$$ display math -> inner text; $...$ inline math -> inner text.
    text = re.sub(r"\$\$(.+?)\$\$", lambda m: m.group(1).strip(), text, flags=re.S)
    text = re.sub(r"\$([^$\n]+)\$", lambda m: m.group(1).strip(), text)
    # Unmatched math delimiters / LaTeX escapes left over by the source dump.
    text = text.replace("$$", "")
    text = re.sub(r"\\text\{([^{}]*)\}", r"\1", text)
    text = re.sub(r"\\([A-Za-z]+)", r"\1", text)
    text = text.replace("\\,", " ").replace("\\;", " ").replace("\\!", "")
    text = text.replace("\\{", "{").replace("\\}", "}")
    # bold / italics markers.
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text, flags=re.S)
    text = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"\1", text)
    # fenced code fences, keep the code.
    text = re.sub(r"```[A-Za-z0-9+#_-]*\n?", "", text)
    text = text.replace("`", "")

    lines: list[str] = []
    for line in text.split("\n"):
        stripped = line.strip()
        if re.fullmatch(r"#{1,6}\s*(?:Video Solution|Solution Article|Solution|Video)\s*",
                        stripped, re.I):
            continue
        if re.fullmatch(r"[-=*_]{2,}", stripped):
            continue
        line = re.sub(r"[ \t]+", " ", line).rstrip()
        lines.append(line)

    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# --- example literal helpers ------------------------------------------------


def normalize_literal_text(text: str) -> str:
    """Whitespace/unicode normalisation for example literals (keep quotes intact)."""
    if not text:
        return ""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    for src, dst in (("\ufeff", ""), ("\u200b", ""), ("\u200c", ""),
                     ("\u200d", ""), ("\u00a0", " "), ("\u202f", " "),
                     ("\u2007", " "), ("\u2009", " "), ("\u2060", ""),
                     ("\u2212", "-")):
        if src in text:
            text = text.replace(src, dst)
    return text


def collapse_ws_outside_quotes(text: str) -> str:
    """Collapse whitespace runs outside of string literals, preserve inside."""
    out: list[str] = []
    quote = None
    escaped = False
    pending_space = False
    for ch in text:
        if quote is not None:
            out.append(ch)
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None
            continue
        if ch in "\"'":
            if pending_space and out:
                out.append(" ")
            pending_space = False
            quote = ch
            out.append(ch)
            continue
        if ch in " \t\n\r\f\v":
            pending_space = True
            continue
        if pending_space and out:
            out.append(" ")
        pending_space = False
        out.append(ch)
    return "".join(out)


def clean_raw_example(text: str) -> str:
    text = normalize_literal_text(text or "")
    lines = [ln.rstrip() for ln in text.split("\n")]
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    return "\n".join(lines)


MARKER_RE = re.compile(
    r"(?m)^[ \t]*(Input|Output|Explanation|Explantion|Note|Constraints|"
    r"Follow[\s-]?up|Example[ \t]+\d+)[ \t]*:?[ \t]*",
    re.I,
)


def parse_example_sections(text: str) -> tuple[str, str, str]:
    """Split one example blob into (input, output, explanation) strings."""
    text = normalize_literal_text(text or "")
    matches = list(MARKER_RE.finditer(text))
    sections: list[tuple[str, str]] = []
    for idx, m in enumerate(matches):
        kind = m.group(1).lower()
        kind = re.sub(r"\s+", " ", kind)
        if kind.startswith("example"):
            kind = "example"
        start = m.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        sections.append((kind, text[start:end]))

    if not sections:
        return "", "", ""

    def first_nonempty(kinds: set[str]) -> str:
        for kind, val in sections:
            if kind in kinds and val.strip():
                return val
        return ""

    raw_input = first_nonempty({"input"})
    raw_output = first_nonempty({"output"})
    raw_explain = first_nonempty({"explanation", "note"})

    def collapse(raw: str) -> str:
        return collapse_ws_outside_quotes(raw).strip()

    return collapse(raw_input), collapse(raw_output), collapse(raw_explain)


def split_top_level(text: str, sep: str = ",", angle: bool = False) -> list[str]:
    """Split on `sep` ignoring separators inside quotes / brackets / (optionally) <>."""
    parts: list[str] = []
    buf: list[str] = []
    stack: list[str] = []
    quote = None
    escaped = False
    pairs = {"(": ")", "[": "]", "{": "}"}
    if angle:
        pairs["<"] = ">"
    for ch in text:
        if quote is not None:
            buf.append(ch)
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None
            continue
        if ch in "\"'":
            quote = ch
            buf.append(ch)
            continue
        if ch in pairs:
            stack.append(pairs[ch])
            buf.append(ch)
            continue
        if ch in ")]}>":
            if stack and stack[-1] == ch:
                stack.pop()
            buf.append(ch)
            continue
        if ch == sep and not stack:
            parts.append("".join(buf))
            buf = []
            continue
        buf.append(ch)
    parts.append("".join(buf))
    return parts


def find_top_level_eq(text: str) -> int:
    """Index of the first '=' outside quotes/brackets, or -1."""
    stack: list[str] = []
    quote = None
    escaped = False
    pairs = {"(": ")", "[": "]", "{": "}"}
    for idx, ch in enumerate(text):
        if quote is not None:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None
            continue
        if ch in "\"'":
            quote = ch
            continue
        if ch in pairs:
            stack.append(pairs[ch])
            continue
        if ch in ")]}":
            if stack and stack[-1] == ch:
                stack.pop()
            continue
        if ch == "=" and not stack:
            return idx
    return -1


def split_embedded_examples(description: str) -> tuple[str, list[str]]:
    """Some records keep their examples inside the description: split them out."""
    lines = description.split("\n")
    start = None
    for idx, line in enumerate(lines):
        if re.fullmatch(r"[ \t]*Example[ \t]+\d+[ \t]*:[ \t]*", line):
            start = idx
            break
    if start is None:
        return description, []
    if "Input" not in description[start:]:
        return description, []
    prose = "\n".join(lines[:start])
    segments: list[str] = []
    current: list[str] = []
    for line in lines[start:]:
        if re.fullmatch(r"[ \t]*Example[ \t]+\d+[ \t]*:[ \t]*", line):
            if current:
                segments.append("\n".join(current))
            current = []
            continue
        current.append(line)
    if current:
        segments.append("\n".join(current))
    cleaned: list[str] = []
    for seg in segments:
        # drop a trailing Constraints section from the segment
        seg = re.split(r"(?m)^[ \t]*Constraints[ \t]*:?[ \t]*$", seg)[0]
        if "Output" in seg:
            cleaned.append(seg.strip())
    if not cleaned:
        return description, []
    return prose, cleaned


def parse_args_for_signature(input_text: str, params: list[dict]) -> list[str] | None:
    text = collapse_ws_outside_quotes(input_text).strip()
    if not text:
        return None
    parts = [p.strip() for p in split_top_level(text, ",") if p.strip()]
    if not parts:
        return None
    values: list[str] = []
    named: dict[str, str] = {}
    named_count = 0
    for part in parts:
        eq = find_top_level_eq(part)
        if eq > 0:
            lhs = part[:eq].strip()
            rhs = part[eq + 1:].strip()
            if re.fullmatch(r"[A-Za-z_]\w*", lhs) and rhs:
                if lhs not in named:
                    named[lhs] = rhs
                    named_count += 1
                values.append(rhs)
                continue
        values.append(part)
    if len(values) != len(params):
        return None
    param_names = [p["name"] for p in params]
    if named_count == len(parts) and set(named) == set(param_names):
        return [named[name] for name in param_names]
    return values


def normalize_expected(output_text: str) -> str:
    text = collapse_ws_outside_quotes(output_text or "").strip()
    text = re.sub(r"^Output\s*:\s*", "", text, flags=re.I).strip()
    return text


# Some LeetCode "Output:" lines are display prose rather than literals — e.g.
#   "2, nums = [1,2,_]"                                  (in-place array problems)
#   "Return 6, and the first 6 characters ..."           (string-compression)
#   "true We can sort [10,5,9,3,15] by ..."              (explanation glued on)
# A judge that compares those strings can never pass, so keep the unambiguous
# answer part when the return type pins it down, otherwise drop the test.
_INT_TEXT_RE = re.compile(r"-?\d+$")
_FLOAT_TEXT_RE = re.compile(r"-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$")
_LIST_RETURN_TYPES = {
    "int[]", "long[]", "double[]", "boolean[]", "string[]", "char[]",
    "int[][]", "char[][]", "string[][]", "ListNode", "TreeNode",
}
DROPPED_EXPECTED: collections.Counter = collections.Counter()
DROPPED_EXPECTED_SLUGS: collections.Counter = collections.Counter()


def expected_matches_return_type(expected: str, return_type: str) -> bool:
    """True when `expected` is a bare LeetCode literal of `return_type`."""
    text = (expected or "").strip()
    if return_type in ("int", "long"):
        return bool(_INT_TEXT_RE.fullmatch(text))
    if return_type == "double":
        return bool(_FLOAT_TEXT_RE.fullmatch(text))
    if return_type == "boolean":
        return text in ("true", "false")
    if return_type == "char":
        if len(text) == 1:
            return True
        return len(text) >= 3 and text[0] in "\"'" and text[-1] == text[0]
    if return_type == "string":
        return len(text) >= 2 and text[0] == '"' and text[-1] == '"'
    if return_type in _LIST_RETURN_TYPES:
        try:
            return isinstance(json.loads(text), list)
        except Exception:
            return False
    return True


def coerce_expected(expected: str, return_type: str) -> str | None:
    """Return a literal expected value for `return_type`, or None to drop it."""
    text = (expected or "").strip()
    if not text:
        return None
    if expected_matches_return_type(text, return_type):
        return text
    if return_type in ("int", "long"):
        match = re.match(r"^Return\s+(-?\d+)\b", text, re.I)
        if match:
            return match.group(1)
        match = re.match(r"^(-?\d+)\s*,\s*nums\s*=", text)
        if match:
            return match.group(1)
        return None
    if return_type == "double":
        match = re.match(r"^(-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)\b", text)
        return match.group(1) if match else None
    if return_type == "boolean":
        match = re.match(r"^(true|false)\b", text, re.I)
        return match.group(1).lower() if match else None
    if return_type == "char":
        if len(text) >= 3 and text[0] in "\"'" and text[-1] == text[0]:
            return text
        return text[:1] if text else None
    return None


# ---------------------------------------------------------------------------
# Java signature extraction + type mapping
# ---------------------------------------------------------------------------

TYPE_MAP = {
    "int": "int", "long": "long", "double": "double", "boolean": "boolean",
    "char": "char", "String": "string", "ListNode": "ListNode",
    "TreeNode": "TreeNode", "void": "void",
    # Boxed types only ever appear inside generics (List<Integer>, List<String>, ...)
    "Integer": "int", "Long": "long", "Double": "double", "Boolean": "boolean",
    "Character": "char",
}
SCALAR_ARRAY_BASE = {"int", "long", "double", "boolean", "char", "String"}
ALLOWED_TYPES = {
    "int", "long", "double", "boolean", "string", "char", "void",
    "ListNode", "TreeNode",
    "int[]", "long[]", "double[]", "boolean[]", "string[]", "char[]",
    "int[][]", "char[][]", "string[][]",
}
METHOD_RE = re.compile(
    r"\bpublic\s+(?:static\s+)?(.+?)\s+([A-Za-z_]\w*)\s*\(([^()]*)\)\s*\{",
    re.S,
)
PACKAGE_PREFIX_RE = re.compile(r"^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*\.")


def map_java_type(java_type: str) -> str | None:
    if not java_type:
        return None
    t = re.sub(r"\bfinal\s+", "", java_type).strip()
    t = re.sub(r"\s+", "", t)
    t = PACKAGE_PREFIX_RE.sub("", t)
    if t in TYPE_MAP:
        return TYPE_MAP[t]
    if t.endswith("[][]"):
        base = t[:-4]
        if base in SCALAR_ARRAY_BASE:
            mapped = TYPE_MAP[base] if base != "String" else "string"
            cand = mapped + "[][]"
            return cand if cand in ALLOWED_TYPES else None
        return None
    if t.endswith("[]"):
        base = t[:-2]
        if base in SCALAR_ARRAY_BASE:
            mapped = TYPE_MAP[base] if base != "String" else "string"
            cand = mapped + "[]"
            return cand if cand in ALLOWED_TYPES else None
        return None
    match = re.fullmatch(r"List<(.+)>", t)
    if match:
        inner = map_java_type(match.group(1))
        if inner is None or inner == "void":
            return None
        cand = inner + "[]"
        return cand if cand in ALLOWED_TYPES else None
    return None


def strip_comments(java: str) -> str:
    java = re.sub(r"/\*.*?\*/", " ", java, flags=re.S)
    java = re.sub(r"//[^\n]*", " ", java)
    return java


def extract_brace_body(code: str, open_index: int) -> str | None:
    depth = 0
    quote = None
    escaped = False
    for idx in range(open_index, len(code)):
        ch = code[idx]
        if quote is not None:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None
            continue
        if ch in "\"'":
            quote = ch
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return code[open_index + 1: idx]
    return None


def parse_java_signature(java: str) -> tuple[dict | None, str]:
    """Return ({'name','params','return'}, '') or (None, reason_code)."""
    code = strip_comments(java)
    class_match = re.search(r"\bclass\s+(\w+)", code)
    if not class_match:
        return None, "design"
    class_name = class_match.group(1)
    if class_name != "Solution":
        return None, "design"
    body = extract_brace_body(code, code.index("{", class_match.end()))
    if body is None:
        return None, "design"

    methods = []
    for m in METHOD_RE.finditer(body):
        ret_raw = m.group(1).strip()
        name = m.group(2)
        params_raw = m.group(3)
        if name in {"main", "Solution"} or name == class_name:
            continue
        params = []
        bad = False
        for part in split_top_level(params_raw, ",", angle=True):
            part = part.strip()
            if not part:
                continue
            pm = re.match(r"^(.*?)\s+([A-Za-z_]\w*)$", part, re.S)
            if not pm:
                bad = True
                break
            mapped = map_java_type(pm.group(1))
            if mapped is None or mapped == "void":
                bad = True
                break
            params.append({"name": pm.group(2), "type": mapped})
        if bad:
            return None, "unsupported_type"
        ret_type = map_java_type(ret_raw)
        if ret_type is None:
            return None, "unsupported_type"
        methods.append({"name": name, "params": params, "return": ret_type})

    if len(methods) != 1:
        return None, "design"
    method = methods[0]
    if method["return"] == "void":
        return None, "void"
    return method, ""


# ---------------------------------------------------------------------------
# Pattern assignment
# ---------------------------------------------------------------------------


def score_patterns(record: dict, signature: dict | None) -> dict[str, float]:
    scores: dict[str, float] = collections.defaultdict(float)
    topics = list(record.get("topics") or [])
    for topic in topics:
        for pid, weight in TOPIC_WEIGHTS.get(topic, {}).items():
            scores[pid] += weight

    topic_set = set(topics)
    if topic_set & {"Tree", "Binary Tree", "Binary Search Tree"} and "Dynamic Programming" in topic_set:
        scores["dp-trees"] += 4.0
    if topic_set & {"Tree", "Binary Tree"} and "Breadth-First Search" in topic_set:
        scores["tree-bfs"] += 2.0
    if topic_set & {"Tree", "Binary Tree"} and "Depth-First Search" in topic_set:
        scores["tree-dfs"] += 1.0
    if "Binary Search Tree" in topic_set:
        scores["bst"] += 2.5
    if "Matrix" in topic_set and "Dynamic Programming" in topic_set:
        scores["dp-2d"] += 1.2
    if "String" in topic_set and "Dynamic Programming" in topic_set:
        scores["dp-2d"] += 0.8
    if "Graph" in topic_set and "Breadth-First Search" in topic_set:
        scores["graph-bfs"] += 1.0
    if "Graph" in topic_set and "Depth-First Search" in topic_set:
        scores["graph-dfs"] += 1.0
    if "Queue" in topic_set and "Sliding Window" in topic_set:
        scores["queue-deque"] += 1.2

    title = record.get("title", "").lower()
    for regex, weights in TITLE_RULES:
        if regex.search(title):
            for pid, weight in weights.items():
                scores[pid] += weight

    solution = (record.get("solution") or "").lower()
    if solution:
        for term, weights in SOLUTION_TERMS:
            count = solution.count(term)
            if count <= 0:
                continue
            for pid, weight in weights.items():
                scores[pid] += min(weight * count, weight * 4)

    return scores


def fallback_pattern(record: dict, signature: dict | None) -> str:
    topics = set(record.get("topics") or [])
    if topics & {"Database", "SQL"}:
        return "design"
    blob = (
        (record.get("title") or "") + " " + (record.get("description") or "")[:600]
    ).lower()
    if signature is None:
        # JS / Pandas / shell style problems: classify as design rather than math.
        return "design"
    types = {p["type"] for p in signature["params"]} | {signature["return"]}
    if "TreeNode" in types:
        return "tree-dfs"
    if "ListNode" in types:
        return "linked-list"
    if "string" in types or "string[]" in types or "string[][]" in types:
        return "strings"
    if types & {"int[]", "long[]", "double[]", "boolean[]", "char[]",
                "int[][]", "char[][]"}:
        return "arrays-hashing"
    if "char" in types:
        return "strings"
    if types & {"int", "long", "double", "boolean"}:
        return "math"
    if "string" in blob:
        return "strings"
    return "arrays-hashing"


def assign_patterns(record: dict, signature: dict | None) -> tuple[str, list[str]]:
    scores = score_patterns(record, signature)
    ranked = sorted(
        (pid for pid in PATTERN_IDS if scores.get(pid, 0.0) > 0.0),
        key=lambda pid: (-round(scores[pid], 6), PATTERN_INDEX[pid]),
    )
    override = PATTERN_OVERRIDES.get(record.get("slug", ""))
    if override:
        primary = override
    elif ranked:
        primary = ranked[0]
    else:
        primary = fallback_pattern(record, signature)

    patterns = [primary]
    primary_score = scores.get(primary, 0.0)
    threshold = max(1.0, primary_score * 0.45)
    for pid in ranked:
        if len(patterns) >= 3:
            break
        if pid == primary or pid in patterns:
            continue
        if scores[pid] >= threshold:
            patterns.append(pid)
    return primary, patterns


# ---------------------------------------------------------------------------
# Judge construction
# ---------------------------------------------------------------------------

LIST_TYPES = {
    "int[]", "long[]", "double[]", "boolean[]", "string[]", "char[]",
    "int[][]", "char[][]", "string[][]",
}
DECIMAL_RE = re.compile(r"^-?\d+\.\d+$")


def decide_mode(record: dict, signature: dict, tests: list[dict]) -> str:
    ret = signature["return"]
    blob_parts = [record.get("description") or ""]
    blob_parts.extend(record.get("constraints") or [])
    for example in record.get("examples") or []:
        blob_parts.append(example.get("explain") or "")
    blob = " ".join(blob_parts).lower()

    unordered_phrase = bool(re.search(r"\b(?:in )?any\s+(?:order|sequence)\b", blob))
    # "return any ..." style multiple-valid-answer statements.  Keep this tight:
    # a bare "any of the given rectangles" is not a multiple-answer problem, and
    # "transform nums into any valid arrangement" does not make the int answer
    # non-deterministic.
    any_return = bool(
        re.search(r"\b(?:return|returns|output|outputs|print|prints)\s+"
                  r"(?:the\s+)?(?:index\s+to\s+)?(?:any|one\s+of)\b", blob)
    )
    any_phrase = any_return or bool(
        re.search(r"\bmultiple\s+(?:valid|possible)\s+(?:answers|solutions)\b", blob)
    )
    if not any_phrase and ret in (LIST_TYPES | {"string", "TreeNode", "ListNode"}):
        any_phrase = bool(
            re.search(r"\bany\s+valid\s+(?:answer|solution|arrangement|sequence|"
                      r"string|array|ordering|permutation|tree|expression|"
                      r"representation|combination)\b", blob)
            or re.search(r"\bany\s+of\s+the\s+(?:peaks|answers|solutions|"
                         r"possible\s+answers|valid\s+answers)\b", blob)
        )

    slug = record.get("slug") or record.get("problem_slug") or ""
    if slug in MODE_OVERRIDES:
        return MODE_OVERRIDES[slug]
    if ret in {"double", "double[]"}:
        return "float"
    if unordered_phrase and ret in LIST_TYPES:
        return "unordered"
    if any_phrase:
        return "any"
    if ret in {"int", "long", "double"}:
        for test in tests:
            expected = test.get("expected") or ""
            if DECIMAL_RE.match(expected):
                return "float"
    return "exact"


def parse_examples(raw_record: dict) -> tuple[list[dict], list[str]]:
    """Return (contract examples, follow_ups extracted from the description)."""
    description = raw_record.get("description") or ""
    raw_examples = raw_record.get("examples") or []
    embedded: list[str] = []
    used_embedded = False
    if not raw_examples:
        description, embedded = split_embedded_examples(description)
        used_embedded = bool(embedded)

    clean_desc, desc_follow_ups = clean_description(description, extracted_examples=used_embedded)

    examples: list[dict] = []
    counter = 0
    source_texts: list[str] = []
    for item in raw_examples:
        text = ""
        num = None
        if isinstance(item, dict):
            text = item.get("example_text") or ""
            num = item.get("example_num")
        elif isinstance(item, str):
            text = item
        if not text.strip():
            continue
        counter += 1
        source_texts.append(text)
        inp, out, explain = parse_example_sections(text)
        examples.append({
            "n": int(num) if isinstance(num, (int, float)) and num else counter,
            "input": inp,
            "output": out,
            "explain": explain,
            "raw": clean_raw_example(text),
        })
    for text in embedded:
        counter += 1
        source_texts.append(text)
        inp, out, explain = parse_example_sections(text)
        examples.append({
            "n": counter,
            "input": inp,
            "output": out,
            "explain": explain,
            "raw": clean_raw_example(text),
        })

    follow_ups: list[str] = list(clean_sequence(raw_record.get("follow_ups") or []))
    for extra in desc_follow_ups:
        if extra not in follow_ups:
            follow_ups.append(extra)
    return examples, clean_desc, follow_ups


def build_tests(examples: list[dict], signature: dict) -> tuple[list[dict], collections.Counter]:
    tests: list[dict] = []
    dropped: collections.Counter = collections.Counter()
    seen = set()
    for example in examples:
        args = parse_args_for_signature(example["input"], signature["params"])
        if args is None:
            continue
        expected = normalize_expected(example["output"])
        if not expected:
            continue
        if re.match(r"^(?:Explanation|Note|Constraints|Follow)\b", expected, re.I):
            continue
        coerced = coerce_expected(expected, signature["return"])
        if coerced is None:
            dropped[signature["return"]] += 1
            continue
        if any(not arg.strip() for arg in args):
            continue
        key = tuple(args)
        if key in seen:
            continue
        seen.add(key)
        tests.append({
            "args": args,
            "expected": coerced,
            "example": example["n"],
        })
    return tests, dropped


def build_judge(raw_record: dict, examples: list[dict]) -> tuple[dict | None, str]:
    snippets = raw_record.get("code_snippets") or {}
    java = snippets.get("java")
    if not isinstance(java, str) or not java.strip():
        return None, "no_java"
    signature, reason = parse_java_signature(java)
    if signature is None:
        return None, reason
    tests, dropped = build_tests(examples, signature)
    if dropped:
        DROPPED_EXPECTED.update(dropped)
        DROPPED_EXPECTED_SLUGS[raw_record.get("problem_slug", "?")] += sum(dropped.values())
    if not tests:
        return None, "unparsable_expected" if dropped else "no_parsable_test"
    mode = decide_mode(raw_record, signature, tests)
    return {
        "mode": mode,
        "signature": {
            "name": signature["name"],
            "params": [{"name": p["name"], "type": p["type"]}
                       for p in signature["params"]],
            "return": signature["return"],
        },
        "tests": tests,
    }, ""


# ---------------------------------------------------------------------------
# Record building
# ---------------------------------------------------------------------------


def build_snippets(raw_record: dict) -> dict[str, str]:
    raw = raw_record.get("code_snippets") or {}
    snippets: dict[str, str] = {}
    java = raw.get("java")
    if isinstance(java, str) and java.strip():
        snippets["java"] = java
    cpp = raw.get("cpp")
    if isinstance(cpp, str) and cpp.strip():
        snippets["cpp"] = cpp
    python = raw.get("python3") or raw.get("python")
    if isinstance(python, str) and python.strip():
        snippets["python"] = python
    return snippets


def build_record(raw_record: dict) -> tuple[dict, dict, dict]:
    """Return (contract shard record, index entry, build metadata)."""
    frontend_id = int(str(raw_record.get("frontend_id")).strip())
    slug = (raw_record.get("problem_slug") or "").strip()
    title = (raw_record.get("title") or "").strip()
    difficulty = (raw_record.get("difficulty") or "").strip().capitalize()
    topics = clean_sequence(raw_record.get("topics") or [])

    examples, description, follow_ups = parse_examples(raw_record)
    constraints = clean_sequence(raw_record.get("constraints") or [])
    hints = clean_hints(raw_record.get("hints") or [])
    solution = clean_solution(raw_record.get("solution") or "")
    snippets = build_snippets(raw_record)

    judge, judge_reason = build_judge(raw_record, examples)

    pattern, patterns = assign_patterns(
        {
            "title": title,
            "slug": slug,
            "topics": topics,
            "description": description,
            "solution": solution,
        },
        judge["signature"] if judge else None,
    )

    record = {
        "id": frontend_id,
        "slug": slug,
        "title": title,
        "difficulty": difficulty,
        "topics": topics,
        "pattern": pattern,
        "patterns": patterns,
        "premium": bool(raw_record.get("premium", False)),
        "description": description,
        "examples": examples,
        "constraints": constraints,
        "follow_ups": follow_ups,
        "hints": hints,
        "snippets": snippets,
        "solution": solution,
        "judge": judge,
    }
    index_entry = {
        "id": frontend_id,
        "slug": slug,
        "title": title,
        "difficulty": difficulty,
        "topics": topics,
        "pattern": pattern,
        "patterns": patterns,
        "premium": record["premium"],
        "judgeable": judge is not None,
        "hasVisual": pattern in VISUAL_PATTERNS and (judge is not None or bool(examples)),
        "shard": 0,  # filled in after sorting
    }
    meta = {
        "judge_reason": judge_reason,
        "slug": slug,
        "difficulty": difficulty,
        "frontend_id": frontend_id,
    }
    return record, index_entry, meta


def load_raw() -> list[dict]:
    with RAW_PATH.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)
    if isinstance(payload, dict) and "questions" in payload:
        questions = payload["questions"]
    elif isinstance(payload, list):
        questions = payload
    else:
        raise ValueError("Unexpected raw dataset shape")
    records = [q for q in questions if isinstance(q, dict)]
    # Optional premium overlay (added by the timeboxed mirror merge).  It must
    # use the exact raw-record shape; ids are expected to be unique.
    if PREMIUM_EXTRA_PATH.exists():
        try:
            with PREMIUM_EXTRA_PATH.open("r", encoding="utf-8") as fh:
                extra = json.load(fh)
            if isinstance(extra, dict):
                extra = extra.get("questions") or extra.get("problems") or []
            existing = {str(q.get("frontend_id")) for q in records}
            added = 0
            for q in extra:
                if not isinstance(q, dict):
                    continue
                fid = str(q.get("frontend_id"))
                if fid in existing or not q.get("problem_slug") or not q.get("title"):
                    continue
                q = dict(q)
                q["premium"] = True
                records.append(q)
                existing.add(fid)
                added += 1
            print(f"[build] premium overlay: merged {added} records from "
                  f"{PREMIUM_EXTRA_PATH.name}")
        except Exception as exc:  # pragma: no cover - defensive
            print(f"[build] premium overlay skipped ({exc})")
    return records


def generated_at() -> str:
    stamp = RAW_PATH.stat().st_mtime
    dt = datetime.fromtimestamp(stamp, timezone.utc)
    return dt.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def write_json(path: Path, payload) -> int:
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    path.write_text(text, encoding="utf-8")
    return len(text.encode("utf-8"))


def main() -> int:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DROPPED_EXPECTED.clear()
    DROPPED_EXPECTED_SLUGS.clear()

    raw_records = load_raw()
    records: list[dict] = []
    index_entries: list[dict] = []
    reasons: collections.Counter = collections.Counter()
    duplicates: list[str] = []
    seen_ids = set()
    seen_slugs = set()

    for raw_record in raw_records:
        try:
            record, index_entry, meta = build_record(raw_record)
        except Exception as exc:  # pragma: no cover - defensive
            print(f"[build] ERROR on {raw_record.get('title')!r}: {exc}", file=sys.stderr)
            raise
        if index_entry["id"] in seen_ids or index_entry["slug"] in seen_slugs:
            duplicates.append(index_entry["slug"])
            continue
        seen_ids.add(index_entry["id"])
        seen_slugs.add(index_entry["slug"])
        records.append(record)
        index_entries.append(index_entry)
        if record["judge"] is None:
            reasons[meta["judge_reason"] or "unknown"] += 1
        else:
            reasons["judgeable"] += 1

    diff_order = {"Easy": 0, "Medium": 1, "Hard": 2}
    for record in records:
        if record["difficulty"] not in diff_order:
            raise ValueError(f"Unknown difficulty {record['difficulty']!r}")
    order = sorted(
        range(len(index_entries)),
        key=lambda i: (diff_order[index_entries[i]["difficulty"]], index_entries[i]["id"]),
    )
    records = [records[i] for i in order]
    index_entries = [index_entries[i] for i in order]

    shard_count = (len(records) + SHARD_SIZE - 1) // SHARD_SIZE
    for position, index_entry in enumerate(index_entries):
        index_entry["shard"] = position // SHARD_SIZE

    problems_by_shard: list[list[dict]] = [[] for _ in range(shard_count)]
    # Re-derive shard assignment cheaply (ids are unique so map id -> position).
    position_by_id = {entry["id"]: pos for pos, entry in enumerate(index_entries)}
    for record in records:
        problems_by_shard[position_by_id[record["id"]] // SHARD_SIZE].append(record)

    counts = {
        "total": len(index_entries),
        "premium": sum(1 for e in index_entries if e["premium"]),
        "judgeable": sum(1 for e in index_entries if e["judgeable"]),
        "byDifficulty": {
            name: sum(1 for e in index_entries if e["difficulty"] == name)
            for name in ("Easy", "Medium", "Hard")
        },
        "byPattern": {
            pid: sum(1 for e in index_entries if e["pattern"] == pid)
            for pid in PATTERN_IDS
        },
    }

    index_payload = {
        "generatedAt": generated_at(),
        "counts": counts,
        "patterns": PATTERNS,
        "problems": index_entries,
    }

    index_size = write_json(DATA_DIR / "index.json", index_payload)

    shard_sizes: list[tuple[int, int, int]] = []
    for shard_index, problems in enumerate(problems_by_shard):
        size = write_json(
            DATA_DIR / f"shard-{shard_index}.json",
            {"shard": shard_index, "problems": problems},
        )
        shard_sizes.append((shard_index, len(problems), size))

    # Remove stale shards from an earlier build.
    for stale in sorted(DATA_DIR.glob("shard-*.json")):
        match = re.fullmatch(r"shard-(\d+)\.json", stale.name)
        if not match or int(match.group(1)) >= shard_count:
            stale.unlink()
            print(f"[build] removed stale {stale.name}")

    print("[build] source :", RAW_PATH, f"({RAW_PATH.stat().st_size / 1e6:.1f} MB)")
    print(f"[build] built  : {counts['total']} problems, {shard_count} shards")
    print(f"[build] index  : {index_size / 1024:.0f} KB")
    print("[build] difficulty:", counts["byDifficulty"])
    print(f"[build] judgeable: {counts['judgeable']} "
          f"({100.0 * counts['judgeable'] / max(1, counts['total']):.1f}%)")
    print("[build] judge exclusions:", dict(reasons))
    if DROPPED_EXPECTED:
        print("[build] dropped non-literal expected outputs (by type):",
              dict(DROPPED_EXPECTED))
        print("[build] affected problems:", dict(DROPPED_EXPECTED_SLUGS))
    print("[build] patterns (primary):",
          {k: v for k, v in counts["byPattern"].items() if v})
    print("[build] shard sizes:")
    for shard_index, count, size in shard_sizes:
        print(f"  shard-{shard_index:02d}: {count:3d} problems, {size / 1024:7.1f} KB")
    if duplicates:
        print(f"[build] WARN: skipped {len(duplicates)} duplicate ids/slugs: {duplicates[:5]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
