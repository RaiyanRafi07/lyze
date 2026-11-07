#!/usr/bin/env python3
"""Validate the generated LeetCode Lab data against CONTRACTS.md sections 1-3.

Run:  python tools/validate_data.py

Exits non-zero and lists every violation if any invariant is broken.
"""

from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "plugin" / "data"
INDEX_PATH = DATA_DIR / "index.json"
SHARD_SIZE = 150

TAXONOMY = [
    "arrays-hashing", "two-pointers", "sliding-window", "prefix-sum",
    "binary-search", "sorting", "stack", "monotonic-stack", "queue-deque",
    "linked-list", "tree-dfs", "tree-bfs", "bst", "trie", "graph-dfs",
    "graph-bfs", "topological-sort", "union-find", "backtracking", "greedy",
    "intervals", "heap-topk", "matrix", "bit-manipulation", "dp-1d", "dp-2d",
    "dp-trees", "strings", "math", "design", "recursion",
]
TAXONOMY_SET = set(TAXONOMY)

VISUAL_PATTERNS = {
    "two-pointers", "sliding-window", "binary-search", "arrays-hashing", "stack",
    "monotonic-stack", "graph-bfs", "graph-dfs", "dp-2d", "dp-1d", "linked-list",
    "tree-dfs", "tree-bfs", "heap-topk", "intervals", "trie", "union-find",
}

TYPE_VOCAB = {
    "int", "long", "double", "boolean", "string", "char", "void",
    "ListNode", "TreeNode",
    "int[]", "long[]", "double[]", "boolean[]", "string[]", "char[]",
    "int[][]", "char[][]", "string[][]",
}
LIST_TYPES = {
    "int[]", "long[]", "double[]", "boolean[]", "string[]", "char[]",
    "int[][]", "char[][]", "string[][]",
}
_INT_TEXT_RE = re.compile(r"-?\d+$")
_FLOAT_TEXT_RE = re.compile(r"-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$")


def expected_is_literal(expected: str, return_type: str) -> bool:
    """True when an expected string is a bare LeetCode literal of return_type."""
    text = expected.strip()
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
    if return_type in LIST_TYPES or return_type in ("ListNode", "TreeNode"):
        try:
            return isinstance(json.loads(text), list)
        except Exception:
            return False
    return True

MODES = {"exact", "unordered", "float", "any"}
DIFFICULTIES = ("Easy", "Medium", "Hard")

INDEX_PROBLEM_FIELDS = {
    "id": int, "slug": str, "title": str, "difficulty": str, "topics": list,
    "pattern": str, "patterns": list, "premium": bool, "judgeable": bool,
    "hasVisual": bool, "shard": int,
}
RECORD_FIELDS = {
    "id": int, "slug": str, "title": str, "difficulty": str, "topics": list,
    "pattern": str, "patterns": list, "premium": bool, "description": str,
    "examples": list, "constraints": list, "follow_ups": list, "hints": list,
    "snippets": dict, "solution": str, "judge": (dict, type(None)),
}
HEX_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
STUB_LINE_RE = re.compile(r"^(?:Example\s*\d+\s*:?|Constraints\s*:?)$", re.I)
# Only real HTML tags count; "<num1>" style placeholders are legitimate notation.
HTML_TAG_RE = re.compile(
    r"</?(?:p|br|ul|ol|li|code|pre|strong|em|sub|sup|img|table|thead|tbody|"
    r"tr|td|th|h[1-6]|div|span|a|b|i|blockquote|hr)\b",
    re.I,
)

errors: list[str] = []
warnings: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def check_constant(value) -> None:
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        fail(f"non-finite number in JSON: {value!r}")
    elif isinstance(value, str) and "\ufffd" in value:
        fail(f"U+FFFD replacement character found: {value[:80]!r}")


def walk_constants(node, path: str = "$") -> None:
    check_constant(node)
    if isinstance(node, dict):
        for key, value in node.items():
            walk_constants(value, f"{path}.{key}")
    elif isinstance(node, list):
        for idx, value in enumerate(node):
            walk_constants(value, f"{path}[{idx}]")


def load_json(path: Path):
    def reject_constant(token: str):
        raise ValueError(f"invalid JSON constant {token} in {path}")

    try:
        text = path.read_text(encoding="utf-8")
        return json.loads(text, parse_constant=reject_constant)
    except Exception as exc:  # pragma: no cover - fatal
        fail(f"cannot parse {path.name}: {exc}")
        return None


def check_fields(obj: dict, spec: dict, where: str) -> None:
    if not isinstance(obj, dict):
        fail(f"{where}: expected object, got {type(obj).__name__}")
        return
    for name, expected_type in spec.items():
        if name not in obj:
            fail(f"{where}: missing field {name!r}")
            continue
        value = obj[name]
        if isinstance(expected_type, tuple):
            ok = isinstance(value, expected_type)
        else:
            ok = isinstance(value, expected_type)
        if not ok:
            fail(f"{where}.{name}: expected {expected_type}, got {type(value).__name__}")


def validate_patterns_meta(patterns) -> set[str]:
    if not isinstance(patterns, list):
        fail("index.patterns: expected list")
        return set()
    seen = set()
    for idx, pattern in enumerate(patterns):
        where = f"index.patterns[{idx}]"
        if not isinstance(pattern, dict):
            fail(f"{where}: expected object")
            continue
        for name in ("id", "label", "blurb", "color"):
            if not isinstance(pattern.get(name), str) or not pattern.get(name):
                fail(f"{where}.{name}: expected non-empty string")
        pid = pattern.get("id")
        if pid in seen:
            fail(f"{where}: duplicate pattern id {pid!r}")
        seen.add(pid)
        if pid not in TAXONOMY_SET:
            fail(f"{where}: pattern id {pid!r} is not in the contract taxonomy")
        if not HEX_COLOR_RE.match(pattern.get("color", "")):
            fail(f"{where}.color: {pattern.get('color')!r} is not a #rrggbb color")
    missing = TAXONOMY_SET - seen
    if missing:
        fail(f"index.patterns: missing taxonomy ids {sorted(missing)}")
    unknown = seen - TAXONOMY_SET
    if unknown:
        fail(f"index.patterns: unknown ids {sorted(unknown)}")
    return seen


def validate_example(example, where: str) -> None:
    if not isinstance(example, dict):
        fail(f"{where}: expected object")
        return
    if not isinstance(example.get("n"), int):
        fail(f"{where}.n: expected int")
    for name in ("input", "output", "explain", "raw"):
        if not isinstance(example.get(name), str):
            fail(f"{where}.{name}: expected string")
    if not example.get("raw", "").strip():
        fail(f"{where}.raw: empty raw example text")


def validate_judge(record: dict, where: str) -> None:
    judge = record.get("judge")
    judgeable = bool(record.get("judgeable", judge is not None))
    if judge is None:
        if judgeable:
            fail(f"{where}: judgeable true but judge is null")
        return
    if not judgeable and "judgeable" in record:
        fail(f"{where}: judge present but judgeable false")
    if not isinstance(judge, dict):
        fail(f"{where}.judge: expected object or null")
        return
    if judge.get("mode") not in MODES:
        fail(f"{where}.judge.mode: invalid mode {judge.get('mode')!r}")
    signature = judge.get("signature")
    if not isinstance(signature, dict):
        fail(f"{where}.judge.signature: expected object")
        return
    name = signature.get("name")
    if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z_]\w*", name):
        fail(f"{where}.judge.signature.name: invalid {name!r}")
    params = signature.get("params")
    if not isinstance(params, list) or not params:
        fail(f"{where}.judge.signature.params: expected non-empty list")
        params = []
    names = set()
    for idx, param in enumerate(params):
        pwhere = f"{where}.judge.signature.params[{idx}]"
        if not isinstance(param, dict):
            fail(f"{pwhere}: expected object")
            continue
        pname = param.get("name")
        ptype = param.get("type")
        if not isinstance(pname, str) or not re.fullmatch(r"[A-Za-z_]\w*", pname):
            fail(f"{pwhere}.name: invalid {pname!r}")
        if pname in names:
            fail(f"{pwhere}.name: duplicate parameter name {pname!r}")
        names.add(pname)
        if ptype not in TYPE_VOCAB:
            fail(f"{pwhere}.type: {ptype!r} not in contract vocabulary")
        if ptype == "void":
            fail(f"{pwhere}.type: void is not a legal parameter type")
    return_type = signature.get("return")
    if return_type not in TYPE_VOCAB:
        fail(f"{where}.judge.signature.return: {return_type!r} not in contract vocabulary")
    if return_type == "void":
        fail(f"{where}.judge.signature.return: void problems must have judge null")

    tests = judge.get("tests")
    if not isinstance(tests, list) or not tests:
        fail(f"{where}.judge.tests: expected non-empty list")
        return
    for idx, test in enumerate(tests):
        twhere = f"{where}.judge.tests[{idx}]"
        if not isinstance(test, dict):
            fail(f"{twhere}: expected object")
            continue
        args = test.get("args")
        if not isinstance(args, list):
            fail(f"{twhere}.args: expected list")
            continue
        if len(args) != len(params):
            fail(f"{twhere}: {len(args)} args but {len(params)} parameters")
        for arg in args:
            if not isinstance(arg, str) or not arg.strip():
                fail(f"{twhere}.args: expected non-empty strings")
        expected = test.get("expected")
        if not isinstance(expected, str) or not expected:
            fail(f"{twhere}.expected: expected non-empty string")
        if not isinstance(test.get("example"), int):
            fail(f"{twhere}.example: expected int")
        if expected and re.match(r"^(?:Explanation|Note|Constraints|Follow)\b",
                                 expected, re.I):
            fail(f"{twhere}.expected: looks like explanation text")
        if expected and not expected_is_literal(expected, return_type):
            fail(f"{twhere}.expected: not a bare {return_type} literal: "
                 f"{expected[:60]!r}")


def validate_index(index: dict) -> tuple[list, dict]:
    if not isinstance(index, dict):
        fail("index.json: expected object")
        return [], {}
    for name in ("generatedAt", "counts", "patterns", "problems"):
        if name not in index:
            fail(f"index.json: missing top-level field {name!r}")
    generated_at = index.get("generatedAt")
    if not isinstance(generated_at, str) or not re.fullmatch(
            r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z", generated_at):
        fail(f"index.json.generatedAt: invalid ISO timestamp {generated_at!r}")

    patterns_meta = index.get("patterns")
    known_patterns = validate_patterns_meta(patterns_meta)
    pattern_meta_by_id = {p.get("id"): p for p in patterns_meta
                          if isinstance(p, dict)} if isinstance(patterns_meta, list) else {}

    counts = index.get("counts")
    if not isinstance(counts, dict):
        fail("index.json.counts: expected object")
        counts = {}

    problems = index.get("problems")
    if not isinstance(problems, list):
        fail("index.json.problems: expected list")
        return [], counts
    if not problems:
        fail("index.json.problems: empty")

    seen_ids = set()
    seen_slugs = set()
    for position, entry in enumerate(problems):
        where = f"index.problems[{position}]"
        check_fields(entry, INDEX_PROBLEM_FIELDS, where)
        if not isinstance(entry, dict):
            continue
        pid = entry.get("id")
        slug = entry.get("slug")
        if pid in seen_ids:
            fail(f"{where}: duplicate problem id {pid!r}")
        if slug in seen_slugs:
            fail(f"{where}: duplicate slug {slug!r}")
        seen_ids.add(pid)
        seen_slugs.add(slug)
        if entry.get("difficulty") not in DIFFICULTIES:
            fail(f"{where}.difficulty: invalid {entry.get('difficulty')!r}")
        if entry.get("pattern") not in TAXONOMY_SET:
            fail(f"{where}.pattern: unknown pattern id {entry.get('pattern')!r}")
        patterns = entry.get("patterns")
        if not isinstance(patterns, list) or not (1 <= len(patterns) <= 3):
            fail(f"{where}.patterns: expected 1-3 ids")
        else:
            if patterns[0] != entry.get("pattern"):
                fail(f"{where}.patterns: primary id is not first")
            if len(set(patterns)) != len(patterns):
                fail(f"{where}.patterns: duplicate ids")
            for pid_pattern in patterns:
                if pid_pattern not in TAXONOMY_SET:
                    fail(f"{where}.patterns: unknown pattern id {pid_pattern!r}")
        topics = entry.get("topics")
        if not isinstance(topics, list) or not all(isinstance(t, str) for t in topics):
            fail(f"{where}.topics: expected list of strings")
        shard = entry.get("shard")
        if not isinstance(shard, int) or shard != position // SHARD_SIZE:
            fail(f"{where}.shard: {shard!r} != floor({position}/{SHARD_SIZE})")
        expected_visual = (
            entry.get("pattern") in VISUAL_PATTERNS
        )
        # judgeability / example presence is checked against the shard record later.
        if entry.get("hasVisual") and not expected_visual:
            fail(f"{where}.hasVisual: true for non-visual pattern "
                 f"{entry.get('pattern')!r}")

    # order check
    diff_rank = {name: rank for rank, name in enumerate(DIFFICULTIES)}
    previous_key = None
    order_ok = True
    for position, entry in enumerate(problems):
        if not isinstance(entry, dict) or entry.get("difficulty") not in diff_rank:
            order_ok = False
            break
        key = (diff_rank[entry["difficulty"]], entry["id"])
        if previous_key is not None and key < previous_key:
            fail(f"index.problems[{position}]: out of grind order "
                 f"({previous_key} then {key})")
            order_ok = False
            break
        previous_key = key
    if not order_ok:
        fail("index.problems: order violated")

    # counts consistency
    if counts:
        if counts.get("total") != len(problems):
            fail(f"counts.total: {counts.get('total')} != {len(problems)}")
        by_difficulty = counts.get("byDifficulty") or {}
        for difficulty in DIFFICULTIES:
            actual = sum(1 for e in problems if isinstance(e, dict)
                         and e.get("difficulty") == difficulty)
            if by_difficulty.get(difficulty) != actual:
                fail(f"counts.byDifficulty.{difficulty}: "
                     f"{by_difficulty.get(difficulty)} != {actual}")
        by_pattern = counts.get("byPattern") or {}
        if not isinstance(by_pattern, dict):
            fail("counts.byPattern: expected object")
        else:
            for pattern_id in TAXONOMY:
                actual = sum(1 for e in problems if isinstance(e, dict)
                             and e.get("pattern") == pattern_id)
                if by_pattern.get(pattern_id) != actual:
                    fail(f"counts.byPattern.{pattern_id}: "
                         f"{by_pattern.get(pattern_id)} != {actual}")
            unknown = set(by_pattern) - TAXONOMY_SET
            if unknown:
                fail(f"counts.byPattern: unknown ids {sorted(unknown)}")
        premium = sum(1 for e in problems if isinstance(e, dict) and e.get("premium"))
        judgeable = sum(1 for e in problems if isinstance(e, dict) and e.get("judgeable"))
        if counts.get("premium") != premium:
            fail(f"counts.premium: {counts.get('premium')} != {premium}")
        if counts.get("judgeable") != judgeable:
            fail(f"counts.judgeable: {counts.get('judgeable')} != {judgeable}")

    return problems, counts


def validate_shards(index_entries: list) -> dict:
    shard_files = sorted(DATA_DIR.glob("shard-*.json"))
    expected_count = (len(index_entries) + SHARD_SIZE - 1) // SHARD_SIZE
    for stale in DATA_DIR.glob("shard-*.json"):
        match = re.fullmatch(r"shard-(\d+)\.json", stale.name)
        if not match or int(match.group(1)) >= expected_count:
            fail(f"unexpected stale shard file {stale.name}")

    records_by_id: dict[int, dict] = {}
    shard_sizes: dict[int, int] = {}
    total_records = 0
    for shard_index in range(expected_count):
        path = DATA_DIR / f"shard-{shard_index}.json"
        if not path.exists():
            fail(f"missing {path.name}")
            continue
        size = path.stat().st_size
        shard_sizes[shard_index] = size
        if size > int(1.5 * 1024 * 1024):
            fail(f"{path.name}: {size / 1024:.0f} KB exceeds the 1.5 MB target")
        payload = load_json(path)
        if payload is None:
            continue
        if not isinstance(payload, dict):
            fail(f"{path.name}: expected object")
            continue
        if payload.get("shard") != shard_index:
            fail(f"{path.name}.shard: {payload.get('shard')!r} != {shard_index}")
        problems = payload.get("problems")
        if not isinstance(problems, list):
            fail(f"{path.name}.problems: expected list")
            continue
        expected_len = SHARD_SIZE
        if shard_index == expected_count - 1:
            expected_len = len(index_entries) - SHARD_SIZE * (expected_count - 1)
        if len(problems) != expected_len:
            fail(f"{path.name}: {len(problems)} problems, expected {expected_len}")
        total_records += len(problems)
        for offset, record in enumerate(problems):
            position = shard_index * SHARD_SIZE + offset
            where = f"shard-{shard_index}.problems[{offset}]"
            check_fields(record, RECORD_FIELDS, where)
            if not isinstance(record, dict):
                continue
            if position >= len(index_entries):
                fail(f"{where}: extra record beyond index length")
                continue
            entry = index_entries[position]
            for field in ("id", "slug", "title", "difficulty", "topics",
                          "pattern", "patterns", "premium"):
                if record.get(field) != entry.get(field):
                    fail(f"{where}.{field}: differs from index entry at "
                         f"position {position}")
            records_by_id[record.get("id")] = record
            if record.get("difficulty") not in DIFFICULTIES:
                fail(f"{where}.difficulty: invalid {record.get('difficulty')!r}")
            record["judgeable"] = entry.get("judgeable")  # used by validate_judge
            validate_judge(record, where)
            description = record.get("description")
            if not isinstance(description, str) or not description.strip():
                fail(f"{where}.description: empty")
            elif "\ufffd" in description:
                fail(f"{where}.description: contains U+FFFD")
            elif "\u00a0" in description:
                fail(f"{where}.description: contains non-breaking space")
            elif HTML_TAG_RE.search(description):
                warnings.append(f"{where}.description: possible HTML tag left in")
            elif any(STUB_LINE_RE.match(line.strip())
                     for line in description.split("\n")):
                warnings.append(f"{where}.description: stub line left in description")
            examples = record.get("examples")
            if not isinstance(examples, list):
                fail(f"{where}.examples: expected list")
            else:
                for example_index, example in enumerate(examples):
                    validate_example(example, f"{where}.examples[{example_index}]")
                if not examples:
                    warnings.append(f"{where}: no examples")
            snippets = record.get("snippets")
            if isinstance(snippets, dict):
                for lang, code in snippets.items():
                    if lang not in {"java", "cpp", "python"}:
                        fail(f"{where}.snippets: unexpected language {lang!r}")
                    if not isinstance(code, str) or not code.strip():
                        fail(f"{where}.snippets.{lang}: expected non-empty string")
                if "java" not in snippets:
                    warnings.append(f"{where}.snippets: no java snippet")
            for field in ("constraints", "follow_ups", "hints"):
                values = record.get(field)
                if not isinstance(values, list) or not all(
                        isinstance(item, str) for item in values):
                    fail(f"{where}.{field}: expected list of strings")
            solution = record.get("solution")
            if not isinstance(solution, str):
                fail(f"{where}.solution: expected string")
            elif "\ufffd" in solution:
                fail(f"{where}.solution: contains U+FFFD")
            elif "[TOC]" in solution:
                fail(f"{where}.solution: contains [TOC]")
            # hasVisual consistency against judgeability + examples
            entry_visual = (
                entry.get("pattern") in VISUAL_PATTERNS
                and (entry.get("judgeable") or bool(examples))
            )
            if entry.get("hasVisual") != entry_visual:
                fail(f"{where}: index.hasVisual {entry.get('hasVisual')} != "
                     f"derived {entry_visual}")

    if total_records != len(index_entries):
        fail(f"shards contain {total_records} records, index has {len(index_entries)}")
    return {"sizes": shard_sizes, "records": records_by_id, "shards": expected_count}


SAMPLE_SLUGS = [
    "two-sum",
    "add-two-numbers",
    "climbing-stairs",
    "binary-tree-level-order-traversal",
    "merge-intervals",
]


def main() -> int:
    if not INDEX_PATH.exists():
        print(f"FATAL: missing {INDEX_PATH}")
        return 1
    index = load_json(INDEX_PATH)
    if index is None:
        print("FATAL: index.json could not be parsed")
        return 1
    walk_constants(index)

    index_entries, counts = validate_index(index)
    shard_info = validate_shards(index_entries)
    records_by_id = shard_info.get("records", {})
    shard_sizes = shard_info.get("sizes", {})

    # no NaN / inf in any shard either
    for path in DATA_DIR.glob("shard-*.json"):
        try:
            walk_constants(json.loads(path.read_text(encoding="utf-8")))
        except Exception as exc:
            fail(f"{path.name}: unreadable JSON ({exc})")

    # ... and that judgeable flags agree between index and shards.
    for entry in index_entries:
        if not isinstance(entry, dict):
            continue
        record = records_by_id.get(entry.get("id"))
        if record is None:
            continue
        if (record.get("judge") is not None) != bool(entry.get("judgeable")):
            fail(f"problem {entry.get('id')}: index.judgeable "
                 f"{entry.get('judgeable')} disagrees with shard judge")

    total = len(index_entries)
    judgeable = sum(1 for e in index_entries if isinstance(e, dict) and e.get("judgeable"))
    by_difficulty = counts.get("byDifficulty", {}) if isinstance(counts, dict) else {}
    by_pattern = counts.get("byPattern", {}) if isinstance(counts, dict) else {}

    print("=" * 72)
    print("LeetCode Lab data validation")
    print("=" * 72)
    print(f"total            : {total}")
    print(f"byDifficulty     : {by_difficulty}")
    print(f"judgeable        : {judgeable} ({100.0 * judgeable / max(1, total):.1f}%)")
    print(f"non-judgeable    : {total - judgeable}")
    print(f"premium          : {counts.get('premium') if isinstance(counts, dict) else '?'}")
    print(f"index size       : {INDEX_PATH.stat().st_size / 1024:.0f} KB"
          f"  ({'ok' if INDEX_PATH.stat().st_size <= 700 * 1024 else 'note: above ~700 KB estimate'})")
    top_patterns = sorted(by_pattern.items(), key=lambda kv: (-kv[1], kv[0]))[:20]
    print("byPattern (top 20, primary assignment):")
    for pattern_id, count in top_patterns:
        label = pattern_id
        for meta in index.get("patterns", []):
            if isinstance(meta, dict) and meta.get("id") == pattern_id:
                label = f"{pattern_id} ({meta.get('label')})"
                break
        print(f"  {label:<40} {count:5d}")
    print(f"shards           : {shard_info.get('shards')} files")
    sizes = sorted(shard_sizes.items())
    if sizes:
        print(f"shard sizes      : min {min(s for _, s in sizes) / 1024:.0f} KB, "
              f"max {max(s for _, s in sizes) / 1024:.0f} KB, "
              f"avg {sum(s for _, s in sizes) / len(sizes) / 1024:.0f} KB")

    print("\nsample judge specs:")
    printed = 0
    for slug in SAMPLE_SLUGS:
        entry = next((e for e in index_entries
                      if isinstance(e, dict) and e.get("slug") == slug), None)
        if entry is None:
            continue
        record = records_by_id.get(entry["id"])
        if record is None:
            continue
        judge = record.get("judge")
        print(f"\n- {record['title']}  [{record['difficulty']}]  slug={slug}  "
              f"pattern={record['pattern']}")
        if judge is None:
            print("    judge: null (not judgeable)")
        else:
            signature = judge["signature"]
            params = ", ".join(f"{p['name']}:{p['type']}" for p in signature["params"])
            print(f"    signature: {signature['name']}({params}) -> {signature['return']}")
            print(f"    mode     : {judge['mode']}")
            for test in judge["tests"]:
                print(f"    test {test['example']}: args={json.dumps(test['args'], ensure_ascii=False)}"
                      f"  expected={test['expected']}")
        printed += 1
        if printed >= 5:
            break

    if warnings:
        print(f"\nWARNINGS ({len(warnings)}):")
        for message in warnings[:20]:
            print(f"  - {message}")
        if len(warnings) > 20:
            print(f"  ... and {len(warnings) - 20} more")

    print()
    if errors:
        print(f"FAILED with {len(errors)} error(s):")
        for message in errors[:60]:
            print(f"  - {message}")
        if len(errors) > 60:
            print(f"  ... and {len(errors) - 60} more")
        return 1
    print("OK: all contract invariants hold.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
