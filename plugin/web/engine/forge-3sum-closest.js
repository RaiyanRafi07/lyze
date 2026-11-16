/**
 * 3sum-closest — portable standalone practice builder.
 *
 * Produces exactly 3 deterministic variants for slug `3sum-closest`
 * (3Sum Closest, Medium, threeSumClosest(int[],int)->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is produced by closestPracticeOracle
 * below (independent O(n^3) brute-force oracle over index triples i<j<k),
 * a DISTINCT algorithm from the lesson's sort + anchor-and-converge walkthrough,
 * and cross-checked against the integrated walkthrough build in the staged
 * selfcheck.
 *
 * Staged source: .workers/jobs/deck-release/catalog-expansion/lessons/3sum-closest
 * (rows, statements, oracle); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * All three sets are the SAME task (no output-type-changing twist).
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

export const SLUG = '3sum-closest';
export const SIGNATURE = Object.freeze({
  name: 'threeSumClosest',
  params: Object.freeze([{ name: 'nums', type: 'int[]' }, { name: 'target', type: 'int' }]),
  return: 'int',
});
export const MODE = 'exact';
export const DIFFICULTY = 'Medium';

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the anchor-and-converge reasoning.';
export const INTENT_EDGE = 'Same pattern with the edge cases the original hides.';
export const INTENT_ADVERSARIAL = 'Same task with duplicate-heavy shapes that punish missing best-tracking.';

/** INDEPENDENT oracle: brute force over index triples, NOT sort+two-pointers. */
export function closestPracticeOracle(nums, target) {
  let best = nums[0] + nums[1] + nums[2];
  for (let i = 0; i < nums.length; i += 1) {
    for (let j = i + 1; j < nums.length; j += 1) {
      for (let k = j + 1; k < nums.length; k += 1) {
        const s = nums[i] + nums[j] + nums[k];
        if (Math.abs(s - target) < Math.abs(best - target)) best = s;
      }
    }
  }
  return best;
}

const argNums = (nums) => JSON.stringify(nums);
const argTarget = (target) => String(target);

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

function buildVariant({ id, seedLabel, intent, title, statement, rows, hints }) {
  const tests = rows
    .map(([nums, target]) => ({ args: [argNums(nums), argTarget(target)], expected: String(closestPracticeOracle(nums, target)) }))
    .slice(0, 5)
    .map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
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

/* ---------------- entry point ---------------- */

export function build3sumClosestPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh numbers',
      intent: INTENT_SAME,
      title: '3Sum Closest — Fresh Numbers (same task)',
      statement:
        'Given an integer array nums and an integer target, return the sum of three integers that is closest to target. ' +
        'Fresh inputs with mixed signs: reproduce the sort, anchor, and converging lo/hi reasoning and keep the closest sum seen. ' +
        'The signature and exact comparison are unchanged.',
      rows: [
        [[-1, 2, 1, -4], 1],
        [[1, 2, 4, 8, 16], 10],
        [[-3, -2, -1, 0, 1, 2, 3], 0],
        [[4, 0, 5, -2, -1], 3],
      ],
      hints: [
        'Sort first, then fix each anchor and converge lo/hi toward target minus the anchor.',
        'Keep best as a real triple sum; adopt a new sum only when strictly closer to target.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: '3Sum Closest — Edge Cases (same task)',
      statement:
        'Same closest-sum task on the boundaries: the minimal triple, an exact hit at zero, ' +
        'a target far above every sum so the answer is the maximum triple, and constraint-extreme ' +
        'values (-1000, 0, 1000). The signature and exact comparison are unchanged.',
      rows: [
        [[0, 0, 0], 1],
        [[0, 0, 0], 0],
        [[10, 20, 30], 100],
        [[-1000, 0, 1000], 500],
      ],
      hints: [
        'Seed best from the first three sorted values, not from 0 or target: best must be reachable.',
        'When every sum sits on one side of target, the ends still converge until they meet.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial duplicates',
      intent: INTENT_ADVERSARIAL,
      title: '3Sum Closest — Adversarial Duplicates (same task)',
      statement:
        'SAME TASK, harder shapes: duplicate-heavy and order-scrambled arrays that punish solutions ' +
        'that skip sorting, stop after the first anchor, or return a triple instead of its sum. ' +
        'No rule change: the signature and exact comparison are unchanged.',
      rows: [
        [[-1, -1, -1, 0, 1, 1], 0],
        [[5, 5, 5, 5], 13],
        [[0, 2, 1, -3], 1],
        [[1, 1, 1, 0], -100],
      ],
      hints: [
        'Sort before converging: unsorted input hides which half is proven impossible.',
        'Return the sum (an int), not the triple; duplicates never change the distance rule.',
      ],
    }),
  ];
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
    const variants = build3sumClosestPractice();
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
  oracle: 'closestPracticeOracle (O(n^3) index triples; walkthrough uses sort+converge)',
});
