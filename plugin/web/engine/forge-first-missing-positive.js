/**
 * first-missing-positive — portable standalone practice builder.
 *
 * Produces exactly 3 deterministic variants for slug `first-missing-positive`
 * (First Missing Positive, Hard, firstMissingPositive(int[])->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Seeded inputs; every expected value is computed at build time by
 * placeOracle below (the real cyclic-placement algorithm), and the selfcheck
 * cross-verifies each stored value with an INDEPENDENT presence-scan oracle
 * (presenceOracle), distinct from the walkthrough's in-place frame emitter.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'first-missing-positive';
export const SIGNATURE = Object.freeze({
  name: 'firstMissingPositive',
  params: Object.freeze([{ name: 'nums', type: 'int[]' }]),
  return: 'int',
});
export const MODE = 'exact';
export const DIFFICULTY = 'Hard';

export const INTENT_SAME = 'Same task, different numbers so you reproduce the place-then-scan reasoning.';
export const INTENT_EDGE = 'Same task with the edge cases the worked examples hide.';
export const INTENT_ADVERSARIAL = 'Same task, adversarial shapes that punish sort-and-scan or hash-set shortcuts.';

/** Reference oracle: the real cyclic-placement algorithm (mutates a copy). */
export function placeOracle(values) {
  const nums = values.slice();
  const n = nums.length;
  for (let i = 0; i < n; i++) {
    while (nums[i] >= 1 && nums[i] <= n && nums[nums[i] - 1] !== nums[i]) {
      const correct = nums[i] - 1;
      const tmp = nums[i];
      nums[i] = nums[correct];
      nums[correct] = tmp;
    }
  }
  for (let i = 0; i < n; i++) {
    if (nums[i] !== i + 1) return i + 1;
  }
  return n + 1;
}

/**
 * INDEPENDENT oracle: presence scan over 1..n+1. Returns the smallest positive
 * integer absent from the input. Deliberately NOT placement, so selfcheck
 * agreement between the two is a real cross-check.
 */
export function presenceOracle(values) {
  const present = new Set(values);
  for (let k = 1; ; k += 1) {
    if (!present.has(k)) return k;
  }
}

function hashText(text) {
  const s = String(text);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
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

const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

function shuffled(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

const lit = (arr) => JSON.stringify(arr);

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  };
}

function inputLine(signature, args) {
  return signature.params
    .map((param, index) => `${(param && param.name) || 'arg' + index} = ${args[index]}`)
    .join(', ');
}

function makeCase(values) {
  return { args: [lit(values)], expected: String(placeOracle(values)) };
}

function buildVariant({ id, seedLabel, intent, title, statement, cases, hints }) {
  const tests = cases
    .map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
    .slice(0, 5);
  const first = tests[0];
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title,
    statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(SIGNATURE, first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: hints.slice(0, 2),
  };
}

// Seeded fresh generator: length 4..6, values drawn from a pool that mixes
// in-range [1,n], out-of-range, negatives and duplicates.
function freshRow(rng) {
  const n = randInt(rng, 4, 6);
  const pool = [];
  for (let v = 1; v <= n; v += 1) pool.push(v);
  pool.push(0, -1, -3, n + 1, n + 4);
  pool.push(1, 2);
  const row = [];
  for (let k = 0; k < n; k += 1) row.push(pool[randInt(rng, 0, pool.length - 1)]);
  return row;
}

/* ---------------- entry point ---------------- */

export function buildFirstMissingPositiveVariants() {
  const rng = mulberry32(hashText(SLUG + ':fresh-v1'));
  const v1rows = [freshRow(rng), freshRow(rng), freshRow(rng), freshRow(rng)];

  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh numbers',
      intent: INTENT_SAME,
      title: 'First Missing Positive — fresh numbers (same task)',
      statement:
        'Given an unsorted integer array nums, return the smallest positive integer that is not present in nums. ' +
        'These fresh inputs mix in-range values, duplicates, negatives and out-of-range entries; place each value v at index v-1, then scan for the first gap.',
      cases: v1rows.map(makeCase),
      hints: [
        'Value v belongs at index v-1: only swap while nums[i] is in [1,n] and its home holds a different value.',
        'After placement, the first index i with nums[i] != i+1 names the answer; if every home matches, return n+1.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'First Missing Positive — edge cases (same task)',
      statement:
        'Same missing-positive task with the boundary inputs. Cases include the minimal single-element arrays ([1] asks for 2, [2] and [0] ask for 1) and the fully-packed prefix [1,2,3], whose answer is n+1 = 4.',
      cases: [[1], [2], [0], [1, 2, 3]].map(makeCase),
      hints: [
        'A single out-of-range value never moves: [0] and [2] both leave home 1 empty, so the answer is 1.',
        'When homes 1..n are all occupied there is no gap to find — the only missing positive left is n+1.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial shapes',
      intent: INTENT_ADVERSARIAL,
      title: 'First Missing Positive — adversarial shapes (same task)',
      statement:
        'Same missing-positive task, no rule change: adversarial shapes punish sorting, hash-set memory, and off-by-one scans. ' +
        'Inputs include an all-high out-of-range array, duplicate-heavy bindings, a reversed prefix, and one 10-entry judge-only row above the 8-entry walkthrough bound. The signature and exact comparison are unchanged.',
      cases: [
        [7, 8, 9, 11, 12],
        [1, 1, 2, 2, 3, 3],
        [5, 4, 3, 2, 1],
        [3, 10, -4, 1, 1, 7, 2, 9, 0, 5],
      ].map(makeCase),
      hints: [
        'The duplicate guard matters: with [1,1,2,2,3,3] the second copy of each value finds its home taken and must stop, not swap.',
        'The 10-entry row is judge-only: the walkthrough must refuse it with the bounds error, never render it.',
      ],
    }),
  ];
}

// Registry-style entry mirroring variants.js conventions:
// slug-gated and shape-gated, returns exactly three variants or []. Never throws.
export function buildVariants(problem) {
  try {
    if (!problem || problem.slug !== SLUG) return [];
    const sig = problem.judge && problem.judge.signature;
    if (!sig || sig.name !== SIGNATURE.name || sig.return !== SIGNATURE.return) return [];
    if (!Array.isArray(sig.params) || sig.params.length !== 1 || sig.params[0].type !== 'int[]') return [];
    const variants = buildFirstMissingPositiveVariants();
    if (!Array.isArray(variants) || variants.length !== 3) return [];
    return variants;
  } catch {
    return [];
  }
}

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'placeOracle (cyclic placement on a copy; cross-checked by presenceOracle set scan)',
});
