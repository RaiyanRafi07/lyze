/**
 * Subsets — portable standalone practice builder (question-owners-150/subsets).
 *
 * Produces exactly 3 deterministic variants for slug `subsets`
 * (Subsets, Medium, subsets(int[])->int[][], mode unordered).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is produced by referenceSubsetsBitmask
 * below (independent bitmask-enumeration oracle: subset k holds nums[i] for
 * each set bit i), a DISTINCT algorithm from the lesson's start-loop
 * backtracking walkthrough.
 *
 * All three sets are the SAME task and SAME signature (no output-type-changing
 * twist): return all subsets in any order. Generated inputs respect the live
 * constraints (1 <= n <= 10, -10 <= nums[i] <= 10, all unique). Labeled
 * generated: statements say "Generated practice".
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'unordered' (outer order free; comparison is order-insensitive).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'subsets'
export const SIGNATURE = Object.freeze({
  name: 'subsets',
  params: Object.freeze([{ name: 'nums', type: 'int[]' }]),
  return: 'int[][]',
})
export const MODE = 'unordered'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same task, fresh numbers so you reproduce the choose/recurse/un-choose reasoning.'
export const INTENT_EDGE = 'Same task with the edge shapes the original examples hide (single element, extremes).'
export const INTENT_ADVERSARIAL = 'Same task with unsorted and negative-heavy inputs that punish solutions which sort or assume order.'

/** INDEPENDENT oracle: bitmask enumeration, NOT start-loop backtracking. */
export function referenceSubsetsBitmask(nums) {
  const out = []
  const total = 1 << nums.length
  for (let mask = 0; mask < total; mask++) {
    const subset = []
    for (let i = 0; i < nums.length; i++) {
      if (mask & (1 << i)) subset.push(nums[i])
    }
    out.push(subset)
  }
  return out
}

export const outLiteral = (sets) => '[' + sets.map((s) => '[' + s.join(',') + ']').join(',') + ']'
const arg = (nums) => JSON.stringify(nums)

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  }
}

function inputLine(signature, args) {
  return signature.params
    .map((param, index) => `${(param && param.name) || 'arg' + index} = ${args[index]}`)
    .join(', ')
}

function buildVariant({ id, seedLabel, intent, title, statement, rows, hints }) {
  const tests = rows
    .map((nums) => ({ args: [arg(nums)], expected: outLiteral(referenceSubsetsBitmask(nums)) }))
    .map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
  const first = tests[0]
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
  }
}

/* ---------------- entry point ---------------- */

export function buildSubsetsVariants() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh numbers',
      intent: INTENT_SAME,
      title: 'Subsets — Fresh Numbers (same task, generated)',
      statement:
        'Generated practice. Given an integer array nums of unique elements, return all possible subsets (the power set) in any order. These fresh inputs use small mixed values so every choose/recurse/un-choose branch runs. The signature and unordered comparison are unchanged.',
      rows: [
        [5, -1, 3],
        [2, 7],
        [4, 0, -2],
      ],
      hints: [
        'Record the path on entry, then loop i from start: choose nums[i], recurse at i + 1, un-choose.',
        'Each recursive call owns one start value; siblings never reuse an index below their start.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Subsets — Edge Cases (same task, generated)',
      statement:
        'Generated practice. Same power-set task: return every subset in any order, or the two trivial subsets for a single element. Inputs include a lone negative value and the constraint extremes (-10 and 10), where the result shape is easy to miscount. The signature and unordered comparison are unchanged.',
      rows: [
        [-7],
        [10, -10],
        [-2, 5],
      ],
      hints: [
        'A single element still yields two subsets: [] and the element itself.',
        'Negatives and extremes change nothing: membership is by position, never by value.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'unsorted transfer',
      intent: INTENT_ADVERSARIAL,
      title: 'Subsets — Unsorted Transfer (same task, generated)',
      statement:
        'Generated practice. Same power-set task with descending and negative-heavy inputs at the walkthrough size bound (n = 4). Subsets follow input order, so a solution that sorts first still passes the judge but breaks the lesson invariant — keep input order in your trace. The signature and unordered comparison are unchanged.',
      rows: [
        [3, 2, 1],
        [8, -8, 0],
        [9, -9, 0, 7],
      ],
      hints: [
        'Trace with the given order: [3,2,1] records [3], then [3,2], never [2,3] as a path.',
        'Count check: n elements always yield exactly 2^n subsets; n = 4 gives 16.',
      ],
    }),
  ]
}

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'referenceSubsetsBitmask (bitmask enumeration over positions; walkthrough is start-loop backtracking)',
})
