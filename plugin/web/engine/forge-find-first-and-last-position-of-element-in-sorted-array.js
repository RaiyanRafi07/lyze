/**
 * find-first-and-last-position-of-element-in-sorted-array — portable standalone
 * practice builder.
 *
 * Produces exactly 3 deterministic variants for slug
 * `find-first-and-last-position-of-element-in-sorted-array`
 * (Medium, searchRange(int[],int)->int[], mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * rangePracticeOracle below (single linear scan), an INDEPENDENT implementation
 * of the same operation (not the walkthrough's two biased binary-search passes).
 *
 * Live: plugin/web/engine/forge-find-first-and-last-position-of-element-in-sorted-array.js
 * Staged source: .workers/jobs/deck-release/catalog-expansion/lessons/find-first-and-last-position-of-element-in-sorted-array/forge-find-first-and-last-position-of-element-in-sorted-array.js (verbatim below).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (mode 'exact': "[3,4]" / "[-1,-1]").
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'find-first-and-last-position-of-element-in-sorted-array';
export const SIGNATURE = Object.freeze({
  name: 'searchRange',
  params: Object.freeze([{ name: 'nums', type: 'int[]' }, { name: 'target', type: 'int' }]),
  return: 'int[]',
});
export const MODE = 'exact';
export const DIFFICULTY = 'Medium';

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.';
export const INTENT_EDGE = 'Same pattern with the edge cases the original hides.';
export const INTENT_ADVERSARIAL = 'Same question with adversarial placements that punish one-sided shortcuts.';

/** INDEPENDENT oracle: one linear scan, no lo/hi halving, no bias flag. */
export function rangePracticeOracle(nums, target) {
  let first = -1;
  let last = -1;
  for (let i = 0; i < nums.length; i += 1) {
    if (nums[i] === target) {
      if (first === -1) first = i;
      last = i;
    }
  }
  return [first, last];
}

const lit = (v) => JSON.stringify(v);

function makeCase(nums, target) {
  const expected = lit(rangePracticeOracle(nums, target));
  return { args: [lit(nums), String(target)], expected };
}

function inputLine(args) {
  return SIGNATURE.params.map((p, i) => `${p.name} = ${args[i]}`).join(', ');
}

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  };
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
    examples: [{ input: inputLine(first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: hints.slice(0, 2),
  };
}

/* ---------------- entry point ---------------- */

export function buildRangeVariants() {
  const v1 = buildVariant({
    id: 'v1',
    seedLabel: 'fresh duplicate runs',
    intent: INTENT_SAME,
    title: 'Find First and Last Position — fresh duplicate runs (range drill)',
    statement:
      'Same task: given nums sorted non-decreasing and a target, return [first, last] or [-1,-1]. ' +
      'Fresh inputs below use new duplicate runs (a triple 4-run, a double 2-run, a single 9, and a miss inside the range). ' +
      'Run the two biased passes: hits keep searching the biased side, misses halve normally.',
    cases: [
      makeCase([1, 2, 4, 4, 4, 5, 9], 4),
      makeCase([1, 2, 2, 3, 5, 6], 2),
      makeCase([1, 3, 5, 9, 12], 9),
      makeCase([1, 3, 5, 9, 12], 7),
    ],
    hints: [
      'A hit never returns: record mid, then keep the biased half (left for first, right for last).',
      'A miss halves the same way in both passes; only hits differ by bias.',
    ],
  });

  const v2 = buildVariant({
    id: 'v2',
    seedLabel: 'edge cases',
    intent: INTENT_EDGE,
    title: 'Find First and Last Position — edge cases (range drill)',
    statement:
      'Same range task with the boundary inputs. nums may be empty, hold one value that hits or misses, ' +
      'hold all identical values, or miss below every element and above every element. ' +
      'Return [first, last] with both -1 only when the target never appears.',
    cases: [
      makeCase([], 0),
      makeCase([5], 5),
      makeCase([5], 3),
      makeCase([7, 7, 7, 7], 7),
      makeCase([2, 4, 6], 8),
    ],
    hints: [
      'An empty array runs zero probes in both passes: both bounds stay -1.',
      'When every value equals the target, the first bound is 0 and the last is n-1.',
    ],
  });

  // Same-task adversarial set: long duplicate runs and boundary-hugging targets
  // that punish first-hit-return and single-pass shortcuts. Identical signature
  // and question — no twist, no output-type change.
  const v3 = buildVariant({
    id: 'v3',
    seedLabel: 'adversarial runs',
    intent: INTENT_ADVERSARIAL,
    title: 'Find First and Last Position — adversarial runs (same task) (range drill)',
    statement:
      'Same range question, no rule change: a long run of 8s inside a wider array, ' +
      'a target owning the first two slots, a target owning the last slot, and a ' +
      'negative run straddling zero. Identical signature and question — only the ' +
      'duplicate runs fight back against returning the first hit.',
    cases: [
      makeCase([1, 2, 8, 8, 8, 8, 8, 9, 10], 8),
      makeCase([3, 3, 4, 5, 6, 7], 3),
      makeCase([1, 2, 3, 4, 5, 5], 5),
      makeCase([-5, -5, -3, 0, 0, 2], -5),
    ],
    hints: [
      'A 5-long run needs several biased hits after the first probe before the edge is proven.',
      'Edge-owned targets (first slots, last slot) still require the full biased pass to certify the far end.',
    ],
  });

  return [v1, v2, v3];
}

/** Live-forge entry shape: `buildVariants(problem)` scoped to this slug. */
export function buildVariants(problem) {
  try {
    if (!problem || typeof problem !== 'object') return [];
    if (problem.slug !== SLUG) return [];
    const signature = problem?.judge?.signature;
    if (!signature || signature.name !== SIGNATURE.name) return [];
    if (signature.return !== SIGNATURE.return) return [];
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return [];
    if (signature.params[0]?.type !== 'int[]') return [];
    if (signature.params[1]?.type !== 'int') return [];
    const variants = buildRangeVariants();
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
  oracle: 'rangePracticeOracle (single linear scan; walkthrough uses two biased binary-search passes)',
});
