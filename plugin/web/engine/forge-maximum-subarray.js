/**
 * maximum-subarray — portable practice builder (delivery-extension-20261107).
 *
 * Produces exactly 3 deterministic variants reusing the official judge signature
 * maxSubArray(int[]) -> int with literal-string tests, exact mode, 2 hints each.
 * All drills are GENERATED (seeded from slug); none reuse official examples verbatim
 * except where an edge row coincides by value (documented in the staged REVIEW).
 * Oracles: brute-force O(n^2) for standard max subarray (independent of Kadane),
 * brute-force circular check for the v3 twist.
 *
 * Staged source: .workers/jobs/delivery-extension-20261107/maximum-subarray/maximum-subarray.practice.js
 * (CommonJS draft flagged for ESM adaptation; logic preserved verbatim, seeded
 * determinism intact). v3 is an explicit RULE CHANGE (circular wrap) with the
 * same signature, labeled honestly.
 */

function hashText(s) {
  s = String(s);
  // NOTE: no >>> 0 inside the loop — byte-faithful to the staged reviewed
  // draft so the seeded v1 rows reproduce bit-for-bit.
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d9b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function numLiteral(v) {
  return String(v);
}

function argLiteral(nums) {
  return '[' + nums.map(numLiteral).join(',') + ']';
}

function outLiteral(v) {
  return String(v);
}

function inputLine(signature, args) {
  return signature.params
    .map((p, i) => `${(p.name || 'arg' + i)} = ${args[i]}`)
    .join(', ');
}

// INDEPENDENT oracle (brute force): max over all nonempty subarrays. Never Kadane.
export function bruteMaxSubarray(nums) {
  let best = nums[0];
  for (let l = 0; l < nums.length; l += 1) {
    let sum = 0;
    for (let r = l; r < nums.length; r += 1) {
      sum += nums[r];
      if (sum > best) best = sum;
    }
  }
  return best;
}

// INDEPENDENT circular oracle: max over all nonempty subarrays allowing wrap-around.
export function bruteCircular(nums) {
  const n = nums.length;
  let best = nums[0];
  for (let l = 0; l < n; l += 1) {
    let sum = 0;
    for (let len = 1; len <= n; len += 1) {
      sum += nums[(l + len - 1) % n];
      if (sum > best) best = sum;
    }
  }
  return best;
}

function toTests(rows, oracle) {
  return rows.map((nums) => ({ args: [argLiteral(nums)], expected: outLiteral(oracle(nums)) }));
}

function cloneSignature(sig) {
  return { name: sig.name, params: sig.params.map((p) => ({ name: p.name, type: p.type })), return: sig.return };
}

function buildVariant(spec) {
  const tests = spec.tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
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
    mode: 'exact',
    hints: spec.hints.slice(0, 2),
    source: 'generated',
  };
}

const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.';
const INTENT_EDGE = 'Same pattern with the edge case the original hides.';
const INTENT_TWIST = 'Same signature, different question: the twist tests whether the idea transfers.';

export function officialSignature() {
  return { name: 'maxSubArray', params: [{ name: 'nums', type: 'int[]' }], return: 'int' };
}

export function buildMaximumSubarrayVariants(problem, options) {
  void options;
  const signature = (problem && problem.judge && problem.judge.signature) || officialSignature();
  if (signature.name !== 'maxSubArray' || signature.return !== 'int') return [];
  const types = (signature.params || []).map((p) => p.type);
  if (types.length !== 1 || types[0] !== 'int[]') return [];
  const difficulty = (problem && problem.difficulty) || 'Medium';
  const base = (problem && problem.title) || 'Maximum Subarray';
  const slug = (problem && problem.slug) || 'maximum-subarray';
  const rng = mulberry32(hashText(slug));

  function make(id, suffix, seedLabel, intent, statement, tests, hints) {
    return buildVariant({
      id,
      seedLabel,
      intent,
      difficulty,
      title: `${base} — ${suffix} (kadane drill)`,
      statement,
      signature,
      tests,
      mode: 'exact',
      hints,
    });
  }

  // v1: fresh data, same rule. 4 seeded rows, lengths 5..9, values -9..9; force a mix.
  const v1rows = [];
  for (let k = 0; k < 4; k += 1) {
    const len = randInt(rng, 5, 9);
    const row = [];
    for (let i = 0; i < len; i += 1) row.push(randInt(rng, -9, 9));
    if (row.every((v) => v >= 0)) row[randInt(rng, 0, len - 1)] = randInt(rng, -9, -1);
    if (row.every((v) => v < 0)) row[randInt(rng, 0, len - 1)] = randInt(rng, 1, 9);
    v1rows.push(row);
  }

  // v2: hidden edges — all-negative trap, single element, single negative, mixed with zeros.
  const v2rows = [[-4, -2, -7, -1], [1], [-5], [2, -1, 0, -3, 2]];

  // v3: RULE CHANGE (same signature): circular wrap-around allowed.
  const v3rows = [[5, -3, 5], [-2, -3, -1], [3, -1, 2, -1], [8, -1, -1, 8]];

  return [
    make(
      'v1',
      'fresh values',
      'fresh values',
      INTENT_SAME,
      'Given an integer array nums, return the largest sum of any nonempty contiguous subarray. These generated inputs have 5 to 9 values between -9 and 9 with mixed signs; reproduce the Kadane reasoning on fresh numbers.',
      toTests(v1rows, bruteMaxSubarray),
      ['Track the best subarray ending at each index: restart at nums[i] or extend the running sum.', 'Keep a separate global best; it never decreases even when the running sum dips.']
    ),
    make(
      'v2',
      'edge cases',
      'edge cases',
      INTENT_EDGE,
      'Same task: largest sum of any nonempty contiguous subarray. Inputs include the all-negative trap (answer is the least-negative element, never 0), single-element arrays, and zeros mixed with negatives.',
      toTests(v2rows, bruteMaxSubarray),
      ['An empty subarray is not allowed, so all-negative input cannot answer 0.', 'Seed both running and global best at nums[0] before scanning from index 1.']
    ),
    make(
      'v3',
      'twist: circular wrap',
      'twist, same signature',
      INTENT_TWIST,
      'RULE CHANGE: the subarray may wrap around the end of nums (circular array); return the largest sum of any nonempty subarray allowing wrap. Keep the same maxSubArray method signature and return type; the wrap rule is intentional.',
      toTests(v3rows, bruteCircular),
      ['Compare the standard best against total minus the minimum subarray, guarding the all-negative case.', 'A wrap subarray is the complement of a dropped middle segment, not a plain Kadane run.']
    ),
  ];
}

export const PRACTICE_INFO = Object.freeze({
  slug: 'maximum-subarray',
  mode: 'exact',
  difficulty: 'Medium',
  variantCount: 3,
  ruleChange: 'v3 circular wrap only; v1/v2 same task',
  oracle: 'bruteMaxSubarray / bruteCircular (brute force; Kadane used only in walkthrough)',
});
