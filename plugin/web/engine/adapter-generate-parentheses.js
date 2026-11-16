/**
 * generate-parentheses — portable per-slug semantic adapter (question-owners-150).
 *
 * Walkthrough for https://leetcode.com/problems/generate-parentheses/ built from
 * REAL backtracking execution state: every frame is recorded during an actual DFS
 * run (open/close counters, live prefix, finished set). No invented values.
 *
 * Signature equals the live judge signature exactly
 * (plugin/data/shard-5.json record id 22):
 *   generateParenthesis(n: int) -> string[]
 *
 * Visual bound: n <= 4 for the walkthrough (Catalan(5)=42 leaves already needs
 * sampling); larger legal inputs (n <= 8) are rejected with a clear error,
 * never truncated. The single compaction pass stays in semantic.js
 * (boundedFrames); this adapter returns the FULL honest event list plus anchor
 * indices (leaf records) so pedagogical frames survive sampling.
 *
 * Staged sources (reused verbatim for the code blocks, tags added):
 * .workers/jobs/neetcode150-completion/generate-parentheses/reference.java
 * .workers/jobs/neetcode150-completion/generate-parentheses/reference.cpp
 * .workers/jobs/neetcode150-completion/generate-parentheses/pseudocode.md
 * Per-line notes: .workers/jobs/question-owners-150/generate-parentheses/code-notes.json
 */
import { code, frame, boundedFrames } from './semantic-core.js'

export const SLUG = 'generate-parentheses'

// Live judge signature (shard-5.json id 22): params are type strings here to
// match the semantic.js adapter contract (it compares signature.params types).
export const SIGNATURE = {
  name: 'generateParenthesis',
  params: ['int'],
  return: 'string[]',
}

// Visual bound (honest disclosure): the decision tree explodes with Catalan(n),
// so the walkthrough stays tiny and rejects larger inputs with a clear error
// instead of truncating them. Judge/forge practice still uses the full 1..8.
const MAX_N = 4

export function catalan(n) {
  const c = [1]
  for (let i = 1; i <= n; i++) {
    c[i] = 0
    for (let j = 0; j < i; j++) c[i] += c[j] * c[i - 1 - j]
  }
  return c[n]
}

function decodeN(value) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error('Provide an integer n for this walkthrough')
  }
  if (value < 1 || value > 8) {
    throw new Error('Generate Parentheses needs 1 <= n <= 8 (' + value + ' given)')
  }
  if (value > MAX_N) {
    throw new Error('Visual walkthrough limited to n <= ' + MAX_N + ' (' + value + ' given); Catalan(' + value + ')=' + catalan(value) + ' leaves explode')
  }
  return value
}

// Canonical reference: open/close backtracking. '(' while open<n, ')' while
// close<open; record at length 2n. Discovery order is open-first DFS, matching
// the shard examples verbatim.
export function generateParenthesisReference(n) {
  const out = []
  const dfs = (open, close, cur) => {
    if (cur.length === 2 * n) { out.push(cur); return }
    if (open < n) dfs(open + 1, close, cur + '(')
    if (close < open) dfs(open, close + 1, cur + ')')
  }
  dfs(0, 0, '')
  return out
}

// Every code line below is byte-identical to its staged reference file; only
// the [step] tags are added (semantic-core requires one tag per line).
// Blanks are tagged [def]: they open no operation, matching code-notes index 6.
const generateParenthesesJava = code(`
[def] class Solution {
[init]     public List<String> generateParenthesis(int n) {
[init]         List<String> out = new ArrayList<>();
[explore]         backtrack(n, 0, 0, new StringBuilder(), out);
[return]         return out;
[def]     }
[def]
[def]     private void backtrack(int n, int open, int close,
[def]                            StringBuilder cur, List<String> out) {
[record]         if (cur.length() == 2 * n) {
[record]             out.add(cur.toString());
[record]             return;
[def]         }
[choose]         if (open < n) {
[choose]             cur.append('(');
[explore]             backtrack(n, open + 1, close, cur, out);
[unchoose]             cur.deleteCharAt(cur.length() - 1);
[def]         }
[choose]         if (close < open) {
[choose]             cur.append(')');
[explore]             backtrack(n, open, close + 1, cur, out);
[unchoose]             cur.deleteCharAt(cur.length() - 1);
[def]         }
[def]     }
[def] }
`)

const generateParenthesesCpp = code(`
[def] class Solution {
[def] public:
[init]     vector<string> generateParenthesis(int n) {
[init]         vector<string> out;
[init]         string cur;
[explore]         backtrack(n, 0, 0, cur, out);
[return]         return out;
[def]     }
[def]
[def] private:
[def]     void backtrack(int n, int open, int close,
[def]                    string& cur, vector<string>& out) {
[record]         if ((int)cur.size() == 2 * n) {
[record]             out.push_back(cur);
[record]             return;
[def]         }
[choose]         if (open < n) {
[choose]             cur.push_back('(');
[explore]             backtrack(n, open + 1, close, cur, out);
[unchoose]             cur.pop_back();
[def]         }
[choose]         if (close < open) {
[choose]             cur.push_back(')');
[explore]             backtrack(n, open, close + 1, cur, out);
[unchoose]             cur.pop_back();
[def]         }
[def]     }
[def] };
`)

const generateParenthesesPseudo = code(`
[def] GENERATE(n):
[init]     out ← []
[explore]     BACKTRACK(open=0, close=0, cur=""):
[record]         if len(cur) = 2n:
[record]             append cur to out
[record]             return
[choose]         if open < n:
[explore]             BACKTRACK(open+1, close, cur + "(")
[choose]         if close < open:
[explore]             BACKTRACK(open, close+1, cur + ")")
[return]     return out
`)

const EXPLAIN = {
  def: 'Scope of the solver: grouping braces and headers that hold the methods but execute no algorithm step.',
  init: 'Seed the search: empty accumulator plus the empty prefix with both counters at zero.',
  choose: 'Guard plus placement: extend the live prefix only while the guard holds; open needs open<n, close needs close<open.',
  explore: 'Recurse into the child call; it owns the appended bracket until it returns.',
  record: 'Prefix reached length 2n, so it is complete and valid; snapshot it into the answer.',
  unchoose: 'Undo the placement so siblings start from the same prefix; skipping this leaks characters across branches.',
  return: 'Hand the full answer set to the caller; the working prefix is empty again at the top level.',
}

// Per-line explanations, indexed by 0-based display line (presentation metadata,
// never compiled). Verbatim from the reviewed question-owners-150 code-notes.json;
// the code blocks above are byte-identical to the staged files, so indices apply.
const EXPLAIN_LINES = {
  java: {
    0: 'Class wrapper required by the judge harness; the tested entry point is the method on line 1.',
    1: 'Entry: generateParenthesis(n) returns the full set of well-formed strings; n is the pair count (1 <= n <= 8).',
    2: 'Accumulator for complete strings; returned at the end in open-first DFS discovery order.',
    3: 'Seeds the search from the empty prefix with both counters at zero — the root frame of the visual walkthrough.',
    4: 'Hands the accumulator to the caller; for n=3 it holds exactly the 5 shard-expected strings.',
    5: 'Closes the entry method; all recursion happens inside backtrack below.',
    6: 'Blank separator between the public entry and the recursive worker (no executable meaning).',
    7: 'Worker signature, split over two lines: n is the budget, open/close count placed brackets, cur is the live prefix.',
    8: 'Continuation of the worker signature: cur is a mutable buffer shared by every call on the current stack.',
    9: 'Base case: the prefix used all n pairs, so it is complete — and valid, because the guards below only ever extend valid prefixes.',
    10: 'Snapshots the buffer into a fresh string; pushing the live buffer itself would corrupt every entry later.',
    11: 'Stops this branch: a complete string has no children in the decision tree.',
    12: 'Closes the base-case block; longer prefixes are never built.',
    13: "Open guard: '(' is legal only while pairs remain. Trying '(' first fixes the canonical discovery order.",
    14: "Places '(' on the shared buffer — the left (open-first) child edge in the tree view.",
    15: 'Recurses with one more open bracket; this call owns the appended character until line 16 runs.',
    16: "Undo: removes the '(' so siblings start from the same prefix. Forgetting this is the #1 Java/C++ porting bug.",
    17: 'Closes the open-branch block; control falls through to test the close guard on the restored prefix.',
    18: "Close guard: ')' is legal only while an unmatched '(' exists. This single test prunes every invalid prefix.",
    19: "Places ')' on the shared buffer — the right child edge in the tree view.",
    20: 'Recurses with one more close bracket; this call owns the appended character until line 21 runs.',
    21: "Undo: removes the ')' so the caller’s prefix is intact when this call returns.",
    22: 'Closes the close-branch block; both children explored means this call’s work is done.',
    23: 'Closes the worker method; returning unwinds one level of the live path shown in the visual.',
    24: 'Closes the class; no state escapes except the returned list.',
  },
  cpp: {
    0: 'Class wrapper required by the judge harness; the tested entry point is the method on line 2.',
    1: 'Access label: the entry below must be callable by the harness.',
    2: 'Entry: generateParenthesis(n) returns the full set of well-formed strings; n is the pair count (1 <= n <= 8).',
    3: 'Accumulator for complete strings; returned at the end in open-first DFS discovery order.',
    4: 'Single mutable buffer holding the live prefix; shared by every call on the current stack, undone after each child.',
    5: 'Seeds the search from the empty prefix with both counters at zero — the root frame of the visual walkthrough.',
    6: 'Hands the accumulator to the caller; for n=3 it holds exactly the 5 shard-expected strings.',
    7: 'Closes the entry method; all recursion happens inside backtrack below.',
    8: 'Blank separator between the public entry and the recursive worker (no executable meaning).',
    9: 'Access label: the worker below is an internal detail, not called by the harness.',
    10: 'Worker signature, split over two lines: n is the budget, open/close count placed brackets.',
    11: 'Continuation of the worker signature: both strings are mutable references, so each call must undo what it appends.',
    12: 'Base case: the buffer used all n pairs, so it is complete — and valid, because the guards below only ever extend valid prefixes.',
    13: 'Copies the buffer into the accumulator; the copy (not a reference) is what keeps entries stable.',
    14: 'Stops this branch: a complete string has no children in the decision tree.',
    15: 'Closes the base-case block; longer prefixes are never built.',
    16: "Open guard: '(' is legal only while pairs remain. Trying '(' first fixes the canonical discovery order.",
    17: "Places '(' on the shared buffer — the left (open-first) child edge in the tree view.",
    18: 'Recurses with one more open bracket; this call owns the appended character until line 19 runs.',
    19: "Undo: pops the '(' so siblings start from the same prefix. Forgetting this is the #1 C++ porting bug.",
    20: 'Closes the open-branch block; control falls through to test the close guard on the restored prefix.',
    21: "Close guard: ')' is legal only while an unmatched '(' exists. This single test prunes every invalid prefix.",
    22: "Places ')' on the shared buffer — the right child edge in the tree view.",
    23: 'Recurses with one more close bracket; this call owns the appended character until line 24 runs.',
    24: "Undo: pops the ')' so the caller’s prefix is intact when this call returns.",
    25: 'Closes the close-branch block; both children explored means this call’s work is done.',
    26: 'Closes the worker method; returning unwinds one level of the live path shown in the visual.',
    27: 'Closes the class; no state escapes except the returned vector.',
  },
  pseudo: {
    0: 'GENERATE(n): top-level task — produce every well-formed string of n pairs, nothing else.',
    1: 'out ← []: accumulator for complete strings; the only collection that ever holds answers.',
    2: 'BACKTRACK(open=0, close=0, cur=""): recursive worker over the live prefix and its two counters, seeded empty.',
    3: 'if len(cur) = 2n: base case — the prefix consumed the whole budget, so it is a complete candidate.',
    4: 'append cur to out: record it; the guards guarantee every recorded string is balanced (no post-filter).',
    5: 'return: a complete string is a leaf — it has no children, so unwind one level.',
    6: "if open < n: open guard — '(' may extend the prefix only while pairs remain.",
    7: 'Recurse on cur + "(": the open-first child; immutable strings mean no undo step is needed here.',
    8: "if close < open: close guard — ')' may extend the prefix only while an unmatched '(' exists; this is the whole pruning rule.",
    9: 'Recurse on cur + ")": the close child; unreachable whenever the prefix is already balanced.',
    10: 'return out: after the root call finishes, out holds exactly the Catalan(n) well-formed strings.',
  },
}

// Every frame below is a REAL execution event from the DFS above: one init,
// one choose+explore pair per taken branch (JS strings are immutable, so there
// is honestly no undo event), one record per emitted leaf, one return.
// Each frame snapshots the live prefix, both counters, the current tree node,
// the live recursion path, and the finished set. No future leaves revealed.
function build(args) {
  const n = decodeN(args[0])
  const total = catalan(n)
  const result = []
  const nodes = [{ id: 0, value: '(empty)', label: '(empty)' }]
  const edges = []
  const frames = []
  const anchors = []
  const finished = []
  const finishedSet = new Set()
  const stack = [0]
  let nextId = 1

  const snap = (current) => ({
    current,
    path: stack.slice(),
    visited: finished.slice(),
    n,
    answer: result.length,
    vars: { n, depth: stack.length - 1, found: result.length },
  })

  const stateOf = (id, prefix, open, close) => ({
    ...snap(id),
    prefix,
    open,
    close,
    found: result.slice(),
    vars: { n, open, close, depth: stack.length - 1, found: result.length },
  })

  const push = (step, label, note, state) => {
    frames.push(frame(step, label, note, state))
  }

  push('init', 'Initialize n=' + n, 'Gen ' + total + ' well-formed strings of ' + n + ' pair' + (n === 1 ? '' : 's') + ". '(' while open<" + n + ', ' + "')' while close<open.", snap(0))

  function dfs(prefix, open, close, id) {
    if (prefix.length === 2 * n) {
      result.push(prefix)
      push('record', 'Emit ' + prefix, 'Complete "' + prefix + '" recorded (' + result.length + ' of ' + total + ').', stateOf(id, prefix, open, close))
      anchors.push(frames.length - 1)
      finishedSet.add(id)
      finished.push(id)
      return
    }
    if (open < n) {
      const child = nextId++
      nodes.push({ id: child, value: prefix + '(', label: prefix + '(' })
      edges.push([id, child])
      push('choose', "Choose '('", "Open guard holds (" + open + '<' + n + '): place \'(\' at "' + prefix + '".', stateOf(id, prefix, open, close))
      stack.push(child)
      push('explore', 'Enter "' + prefix + '("', 'Recurse open=' + (open + 1) + ' close=' + close + ' on "' + prefix + '("; depth ' + (stack.length - 1) + '.', stateOf(child, prefix + '(', open + 1, close))
      dfs(prefix + '(', open + 1, close, child)
      stack.pop()
    }
    if (close < open) {
      const child = nextId++
      nodes.push({ id: child, value: prefix + ')', label: prefix + ')' })
      edges.push([id, child])
      push('choose', "Choose ')'", "Close guard holds (" + close + '<' + open + '): place \')\' at "' + prefix + '".', stateOf(id, prefix, open, close))
      stack.push(child)
      push('explore', 'Enter "' + prefix + ')"', 'Recurse open=' + open + ' close=' + (close + 1) + ' on "' + prefix + ')"; depth ' + (stack.length - 1) + '.', stateOf(child, prefix + ')', open, close + 1))
      dfs(prefix + ')', open, close + 1, child)
      stack.pop()
    }
    finishedSet.add(id)
    finished.push(id)
  }

  dfs('', 0, 0, 0)

  const seq = result.join(' ')
  push('return', 'Return ' + result.length + ' strings', 'Done: ' + result.length + ' strings' + (seq ? ': ' + seq : '') + '. Each leaf has length 2n.', { ...snap(0), found: result.slice(), vars: { n, found: result.length } })

  return {
    kind: 'tree',
    layout: { nodes, edges, rootId: 0 },
    frames,
    result: result.slice(),
    anchors,
  }
}

export const adapters = {
  'generate-parentheses': {
    signature: SIGNATURE,
    lesson: {
      idea: 'Backtrack over the live prefix with open/close counters: append ( while open<n, append ) while close<open, emit at length 2n; the close<=open<=n invariant makes every leaf valid.',
      trap: 'close<open, not close<n; undo the shared buffer in Java/C++ after each recursion; emit at len==2n, not open==n; order never matters.',
      time: 'O(n * 4^n / sqrt(n)): one O(n) copy per Catalan(n) leaf; n<=8.',
      space: 'O(n) recursion depth plus the output array.',
      alt: 'Closure-number recursion: split on the partner of the first ( as G(n)=union over c of ( + G(c) + ) + G(n-1-c); same output, cacheable subproblems. Brute-force enumeration of all 2^2n strings is the simpler cross-check oracle.',
    },
    code: { java: generateParenthesesJava, cpp: generateParenthesesCpp, pseudo: generateParenthesesPseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
}
