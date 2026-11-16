/**
 * Shared execution profiles — return value, input mutation, operation transcript.
 *
 * Staged in:
 *   .workers/jobs/deck-release/catalog-expansion/platform/shared-execution-and-trace/
 * Proposed live home (see INTEGRATION.md):
 *   plugin/web/engine/execution-profiles.mjs   (pure, dependency-free, browser+node)
 *   tools/ shim imports profileOf() for readiness parity (no grader rewrite).
 *
 * Source compatibility (grader is source of truth — this module never judges):
 * - Profile taxonomy mirrors tools/problem_readiness.mjs `judgeKind()` and
 *   plugin/host/app.js branching (`judgeOps.isOpsSlug()` vs `judge.mutates`
 *   vs single-call signature). CONTRACTS.md §1 (signature vocabulary,
 *   judge.mutates, judge.mode incl. graph/round-trip) + §7 (`kind:
 *   "operations"` transcripts) + docs/QUESTION_DELIVERY_TEMPLATE.md
 *   ("return value, input mutation, or stateful operation transcript").
 * - Literal strings use the judge's literal-string format
 *   (CONTRACTS.md §1: args/raw + §4: "Method-test args and expected values
 *   use the judge's literal-string format"), e.g. `[1,2]`, `"bar"`, `true`,
 *   `null`. toLiteral() is byte-identical to the `JSON.stringify` helpers it
 *   replaces for all JSON values; fromLiteral() decodes like the grader's
 *   outputsMatch decode step (JSON.parse, LeetCode-literal fallback).
 * - compareLiterals() is a *Practice selfcheck mirror only* of
 *   plugin/host/judge.js outputsMatch() for exact/unordered/float/graph/
 *   round-trip. The grader remains the only judge; parity is tested, not
 *   assumed. Mode "any" is intentionally NOT mirrored (property scoring such
 *   as alienOrderValid lives in the grader).
 *
 * What this replaces (one real duplicate, pattern for the rest):
 * - `const lit = (v) => JSON.stringify(v)` (and argLiteral/outLiteral/
 *   opsLiteral/qstr/literalOf variants) repeated in ~dozens of
 *   plugin/web/engine/forge-*.js files — replaced by `toLiteral`.
 * - String arms of judge.js `q()` and judge-ops.js `jLit`/`cLit` use the same
 *   quoting; this module documents the canonical form for future ports.
 * - `try { ... } catch { return [] }` practice guards and
 *   `{ ok:false, unavailable:true }` trace fallbacks get canonical
 *   constructors (traceUnavailable/noJudge/practiceEmpty) so Trace and
 *   Practice surfaces share one fallback shape.
 */

export const JUDGE_TYPES = Object.freeze(new Set([
  'int', 'long', 'double', 'boolean', 'string', 'char',
  'int[]', 'long[]', 'double[]', 'boolean[]', 'string[]', 'char[]',
  'int[][]', 'string[][]', 'char[][]', 'ListNode', 'ListNode[]', 'TreeNode', 'Node',
]));

export const PROFILE_KINDS = Object.freeze(['return-value', 'mutation', 'operations']);

export const COMPARE_MODES = Object.freeze(
  ['exact', 'unordered', 'float', 'any', 'graph', 'round-trip'],
);

/**
 * Classify a judge record into an execution profile.
 * Mirrors tools/problem_readiness.mjs judgeKind() exactly (same inputs, same
 * outputs) so staged + readiness + host/app.js agree without touching them.
 *
 * @param {object|null} judge shard judge record (judge.signature/mutates/ops/…)
 * @returns {'return-value'|'mutation'|'operations'|null}
 */
export function profileOf(judge) {
  if (!judge || typeof judge !== 'object') return null;
  if (judge.ops === true && judge.transcripts > 0) return 'operations';
  const signature = judge.signature;
  if (!signature || !Array.isArray(signature.params) || !judge.tests?.length) return null;
  if (!signature.params.every((p) => JUDGE_TYPES.has(p?.type))) return null;
  if (signature.return === 'void') return judge.mutates?.length ? 'mutation' : null;
  return JUDGE_TYPES.has(signature.return) ? 'return-value' : null;
}

/**
 * Full profile description: kind + comparison mode + signature echo.
 * Mode passes through unchanged (grader owns semantics).
 */
export function describeProfile(problem) {
  const judge = problem?.judge ?? null;
  const kind = profileOf(judge);
  return {
    kind,
    mode: kind ? (judge.mode || 'exact') : null,
    signature: judge?.signature
      ? {
          name: judge.signature.name,
          params: (judge.signature.params || []).map((p) => ({ name: p.name, type: p.type })),
          return: judge.signature.return,
        }
      : null,
    mutates: Array.isArray(judge?.mutates) ? judge.mutates.slice() : [],
    operations: judge?.ops === true ? Number(judge.transcripts || 0) : 0,
  };
}

/* ------------------------------------------------- literal-string format */

/**
 * Canonical literal-string emission for judge comparison + Practice
 * args/expected. Byte-identical to `JSON.stringify(value)` for every JSON
 * value (the exact helper it replaces in forge-*.js); additionally maps
 * `undefined` -> "null" (grader decodes missing as null) instead of
 * returning undefined like raw JSON.stringify does.
 */
export function toLiteral(value) {
  if (value === undefined) return 'null';
  const out = JSON.stringify(value);
  return out === undefined ? 'null' : out;
}

/** True when text parses as the judge's literal dialect (JSON superset). */
export function isLiteral(text) {
  return fromLiteral(text).ok;
}

/**
 * Decode one literal string, mirroring the grader's outputsMatch decode
 * step: JSON.parse first, LeetCode-literal fallback (unquoted strings,
 * bare true/false/null, numbers) second. Never throws.
 */
export function fromLiteral(text) {
  const raw = String(text ?? '').trim();
  if (raw === '') return { ok: false, value: undefined, error: 'empty literal' };
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    /* fall through to literal fallback */
  }
  const lower = raw.toLowerCase();
  if (lower === 'null' || lower === 'none' || lower === 'undefined') return { ok: true, value: null };
  if (lower === 'true') return { ok: true, value: true };
  if (lower === 'false') return { ok: true, value: false };
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw)) {
    const n = Number(raw);
    if (Number.isFinite(n)) return { ok: true, value: n };
  }
  if ((raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) ||
      (raw.startsWith("'") && raw.endsWith("'") && raw.length >= 2)) {
    return { ok: true, value: raw.slice(1, -1) };
  }
  // Bare words are tolerated as strings (engine/parse.js parseAtom parity).
  if (/^[A-Za-z_][\w.]*$/.test(raw)) return { ok: true, value: raw };
  return { ok: false, value: undefined, error: 'unparsable literal: ' + raw.slice(0, 60) };
}

/* ------------------------------------------- comparison mirror (selfcheck) */

function deepEqual(a, b, tolerant = false) {
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length &&
      a.every((v, i) => deepEqual(v, b[i], tolerant));
  }
  if (typeof a === 'number' && tolerant) {
    return Number.isFinite(a) && Number.isFinite(b) &&
      Math.abs(a - b) <= 1e-5 * Math.max(1, Math.abs(a));
  }
  return a === b;
}

/**
 * Pure comparison mirror of plugin/host/judge.js outputsMatch() for
 * Practice-oracle selfchecks. Grader stays authoritative; this exists so
 * staged Practice builders can validate oracles without spawning javac/g++.
 * Mode "any" always returns false here (property scoring lives in grader).
 */
export function compareLiterals(expected, got, mode = 'exact') {
  const a = fromLiteral(expected);
  const b = fromLiteral(got);
  if (!a.ok || !b.ok) return false;
  const x = a.value;
  const y = b.value;
  if (deepEqual(x, y, mode === 'float')) return true;
  if (mode === 'round-trip') return false; // ordered equality == exact; named separately by contract
  if (mode === 'graph') {
    if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length) return false;
    return x.every((row, i) => {
      if (!Array.isArray(row) || !Array.isArray(y[i])) return false;
      const s1 = row.slice().map(Number).sort((p, q) => p - q);
      const s2 = y[i].slice().map(Number).sort((p, q) => p - q);
      return s1.length === s2.length && s1.every((v, k) => v === s2[k]);
    });
  }
  if (mode !== 'unordered' || !Array.isArray(x) || !Array.isArray(y) || x.length !== y.length) return false;
  const stringGroups = (vs) => vs.every((r) => Array.isArray(r) && r.every((v) => typeof v === 'string'));
  const groups = stringGroups(x) && stringGroups(y);
  const keys = (vs) => vs.map((v) => JSON.stringify(groups ? v.slice().sort() : v)).sort();
  return deepEqual(keys(x), keys(y));
}

/* ------------------------------------------------------------- fallbacks */

/** Canonical "trace unavailable" result (host/trace.js + app.js + UI shape). */
export function traceUnavailable(error) {
  return { ok: false, unavailable: true, error: String(error || 'trace unavailable') };
}

/** Canonical "no deterministic judge" result (host/app.js shape). */
export function noJudgeResult(error) {
  return { ok: false, mode: 'any', fallback: true, error: String(error || 'no deterministic judge') };
}

/** Canonical empty Practice set (variants.js unsupported-shape contract). */
export function practiceEmpty() {
  return [];
}

/**
 * Trace result kind: 'operations' (recorded call transcript, CONTRACTS §7),
 * 'loop' (recorded loop events), or 'unavailable' (honest fallback).
 */
export function traceKindOf(result) {
  if (!result || typeof result !== 'object') return 'unavailable';
  if (result.ok === true && result.kind === 'operations' && Array.isArray(result.events)) return 'operations';
  if (result.ok === true && Array.isArray(result.events)) return 'loop';
  return 'unavailable';
}

/**
 * Validate one Practice variant's execution shape (contract §4):
 * signature preserved, args are literal strings, examples[0] matches
 * tests[0], mode present, exactly 2 hints. Returns {ok, error}.
 */
export function checkPracticeVariant(variant) {
  try {
    if (!variant || typeof variant !== 'object') return { ok: false, error: 'variant is not an object' };
    const sig = variant.signature;
    if (!sig?.name || !Array.isArray(sig.params) || typeof sig.return !== 'string') {
      return { ok: false, error: 'variant signature missing name/params/return' };
    }
    if (!Array.isArray(variant.tests) || variant.tests.length === 0) {
      return { ok: false, error: 'variant has no tests' };
    }
    for (const t of variant.tests) {
      if (!Array.isArray(t?.args) || !t.args.every((a) => typeof a === 'string')) {
        return { ok: false, error: 'variant test args must be literal strings' };
      }
      if (typeof t.expected !== 'string') return { ok: false, error: 'variant expected must be a literal string' };
      for (const a of t.args) {
        if (!isLiteral(a)) return { ok: false, error: 'variant arg not a literal: ' + a.slice(0, 60) };
      }
      if (!isLiteral(t.expected)) return { ok: false, error: 'variant expected not a literal' };
    }
    const first = variant.tests[0];
    const ex = variant.examples?.[0];
    const wantInput = sig.params.map((p, i) => `${p?.name || 'arg' + i} = ${first.args[i]}`).join(', ');
    if (!ex || ex.input !== wantInput || ex.output !== first.expected) {
      return { ok: false, error: 'variant examples[0] must match tests[0]' };
    }
    if (!COMPARE_MODES.includes(variant.mode)) return { ok: false, error: 'variant mode unknown' };
    if (!Array.isArray(variant.hints) || variant.hints.length !== 2) {
      return { ok: false, error: 'variant must carry exactly 2 hints' };
    }
    return { ok: true, error: '' };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}
