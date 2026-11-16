/** Live-forge-compatible drills: longest-consecutive-sequence.
 *
 * Staged path: `.workers/jobs/delivery-sprint-20261107/longest-consecutive-sequence/variants.longest-consecutive-sequence.mjs`
 * Live target: merge `buildLongestConsecutiveDrills` into `plugin/web/engine/variants.js`
 *   (see integration.json for the exact registry + eligibility patch).
 *
 * Contract (mirrors plugin/web/engine/variants.js, standalone so staged
 * `node` checks run without live source):
 * - `buildLongestConsecutiveDrills(problem, signature, rng)` returns exactly
 *   3 variants (v1 fresh / v2 edge / v3 explicit same-signature twist) or null.
 * - Same real signature (forge shape {name, params:[{name,type}], return}),
 *   mode 'exact', 2 hints each, examples[0] derived from tests[0].
 * - Seeded determinism: with the forge-passed rng (mulberry32 over the slug)
 *   output is identical across calls; standalone default reseeds from the slug.
 * - Every `expected` comes from the independent sort-based oracle; the
 *   hash-set reference cross-checks v1/v2 (never the twist, which asks a
 *   different question and has its own oracle + brute-force reference).
 */

export const STATEMENT = 'Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence. You must write an algorithm that runs in O(n) time.';
export const CONSTRAINTS = ['0 <= nums.length <= 10^5', '-10^9 <= nums[i] <= 10^9'];
export const SOURCE = 'plugin/data/shard-5.json id=128 slug=longest-consecutive-sequence (description/constraints/tests only; solution empty in source)';

const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.';
const INTENT_EDGE = 'Same pattern with the edge case the original hides.';
const INTENT_TWIST = 'Same signature, different question: the twist tests whether the idea transfers.';

/* ---------------- seeding (same algorithms as the live forge) ---------------- */
function hashText(text) {
  const source = String(text);
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < source.length; i += 1) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619) >>> 0;
  return hash;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}
function shuffled(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const swap = out[i];
    out[i] = out[j];
    out[j] = swap;
  }
  return out;
}
function sampleRange(rng, count, lo, hi) {
  const pool = [];
  for (let value = lo; value <= hi; value += 1) pool.push(value);
  return shuffled(rng, pool).slice(0, Math.min(count, pool.length));
}

/* ---------------- literals (same shapes as the live forge) ---------------- */
function outLiteral(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return '[' + value.map(outLiteral).join(',') + ']';
  return String(value);
}
function argLiteral(value) {
  if (typeof value === 'string') return JSON.stringify(value);
  return outLiteral(value);
}
function inputLine(signature, args) {
  return signature.params.map((param, index) => `${(param && param.name) || 'arg' + index} = ${args[index]}`).join(', ');
}

/* ---------------- signature ---------------- */
function paramTypesOf(signature) {
  if (!signature || !Array.isArray(signature.params)) return null;
  return signature.params.map((p) => (typeof p === 'string' ? p : p && p.type));
}
function isIntArrayToInt(signature) {
  const types = paramTypesOf(signature);
  return !!signature && Array.isArray(types) && types.length === 1 && types[0] === 'int[]' && signature.return === 'int';
}
function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => (typeof p === 'string' ? { name: 'nums', type: p } : { name: String(p.name || 'nums'), type: p.type })),
    return: signature.return,
  };
}

/* ---------------- oracles ---------------- */
/** Independent oracle: sort + dedupe + linear run (NOT the hash-set walk). */
export function oracleLongest(nums) {
  if (nums.length === 0) return 0;
  const s = [...new Set(nums)].sort((a, b) => a - b);
  let best = 1;
  let run = 1;
  for (let i = 1; i < s.length; i += 1) {
    run = s[i] === s[i - 1] + 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}
/** Reference: canonical O(n) hash-set algorithm (mirrors the staged adapter). */
export function referenceLongest(nums) {
  if (nums.length === 0) return 0;
  const set = new Set(nums);
  let best = 1;
  for (const x of set) {
    if (!set.has(x - 1)) {
      let cur = x;
      let len = 1;
      while (set.has(cur + 1)) { cur += 1; len += 1; }
      if (len > best) best = len;
    }
  }
  return best;
}
/** Twist oracle: count maximal consecutive groups via sorted distinct segments. */
export function oracleGroupCount(nums) {
  if (nums.length === 0) return 0;
  const s = [...new Set(nums)].sort((a, b) => a - b);
  let groups = 1;
  for (let i = 1; i < s.length; i += 1) {
    if (s[i] !== s[i - 1] + 1) groups += 1;
  }
  return groups;
}
/** Twist brute-force reference: a group starts exactly where x-1 is absent. */
export function referenceGroupCount(nums) {
  if (nums.length === 0) return 0;
  const set = new Set(nums);
  let groups = 0;
  for (const x of set) if (!set.has(x - 1)) groups += 1;
  return groups;
}

/* ---------------- variant shape (same as live buildVariant) ---------------- */
function buildVariant(spec) {
  const tests = spec.tests.slice(0, 5).map((test) => ({ args: test.args.map(String), expected: String(test.expected) }));
  const first = tests[0];
  return {
    id: spec.id,
    seedLabel: spec.seedLabel,
    intent: spec.intent,
    difficulty: spec.difficulty,
    title: spec.title,
    statement: spec.statement,
    signature: cloneSignature(spec.signature),
    examples: [{ input: inputLine(spec.signature, first.args), output: first.expected, explain: '' }],
    tests,
    mode: spec.mode || 'exact',
    hints: spec.hints.slice(0, 2),
  };
}
function titleOf(problem) {
  const raw = String((problem && (problem.title || problem.slug)) || 'Problem').trim();
  return raw.length > 46 ? raw.slice(0, 46).trim() + '…' : raw;
}
function difficultyOf(problem) {
  const value = problem && problem.difficulty;
  return value === 'Easy' || value === 'Medium' || value === 'Hard' ? value : 'Medium';
}

/**
 * Forge-style builder: (problem, signature, rng) -> [v1, v2, v3] | null.
 * Accepts the exact slug only; never claims other (int[])->int problems.
 */
export function buildLongestConsecutiveDrills(problem, signature, rng) {
  try {
    if (!problem || problem.slug !== 'longest-consecutive-sequence') return null;
    if (!isIntArrayToInt(signature)) return null;
    const rand = typeof rng === 'function' ? rng : mulberry32(hashText('longest-consecutive-sequence'));
    const base = titleOf(problem);
    const difficulty = difficultyOf(problem);
    const make = (id, suffix, seedLabel, intent, statement, tests, mode, hints) => buildVariant({
      id, seedLabel, intent, difficulty,
      title: base + ' — ' + suffix + ' (consecutive-run drill)',
      statement, signature, tests, mode, hints,
    });

    const v1rows = [];
    for (let n = 0; n < 4; n += 1) {
      const nums = [];
      const len = randInt(rand, 5, 9);
      for (let i = 0; i < len; i += 1) nums.push(randInt(rand, -30, 40));
      const expected = oracleLongest(nums);
      if (referenceLongest(nums) !== expected) return null;
      v1rows.push({ args: [argLiteral(nums)], expected: outLiteral(expected) });
    }

    const v2nums = [[], [7], [5, 5, 5, 5], [1, 3, 5, 7], [-3, -2, -1, 0]];
    const v2rows = v2nums.map((nums) => {
      const expected = oracleLongest(nums);
      if (referenceLongest(nums) !== expected) return null;
      return { args: [argLiteral(nums)], expected: outLiteral(expected) };
    });

    const v3nums = [[100, 4, 200, 1, 3, 2], [1, 3, 5, 7], [5, 5, 5], []];
    const v3rows = v3nums.map((nums) => {
      const expected = oracleGroupCount(nums);
      if (referenceGroupCount(nums) !== expected) return null;
      return { args: [argLiteral(nums)], expected: outLiteral(expected) };
    });

    return [
      make('v1', 'fresh numbers', 'fresh numbers', INTENT_SAME,
        'Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence. You must write an algorithm that runs in O(n) time. These fresh inputs hold 5 to 9 values between -30 and 40; order and duplicates never matter.',
        v1rows, 'exact',
        ['Put every value in a set, then only start counting where x - 1 is missing.', 'Walking upward from a proven start visits each value at most once.']),
      make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
        'Same consecutive-sequence task with the boundary inputs. Given nums, return the length of the longest consecutive run, or 0 when nums is empty. A single value answers 1, duplicates collapse to one key, and disjoint values never form a run.',
        v2rows, 'exact',
        ['An empty array has no run, so the answer is 0 without touching the set.', 'For [5,5,5,5] the set holds one key, so the only run has length 1.']),
      make('v3', 'twist: count runs', 'twist, same signature', INTENT_TWIST,
        'RULE CHANGE: given nums, return how many maximal consecutive groups it holds instead of the longest length. A group is a run no neighbor extends, so [100,4,200,1,3,2] holds 3 groups ({1,2,3,4}, {100}, {200}). Empty nums holds 0 groups. Keep the same longestConsecutive method signature and return type; the changed question is intentional.',
        v3rows, 'exact',
        ['Count the proven starts: each value with x - 1 missing opens exactly one group.', 'A set finds every start in linear time; sorting is unnecessary.']),
    ];
  } catch {
    return null;
  }
}
