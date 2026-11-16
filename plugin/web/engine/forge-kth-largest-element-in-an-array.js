/**
 * kth-largest-element-in-an-array — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `kth-largest-element-in-an-array`
 * (Kth Largest Element in an Array, Medium, findKthLargest(int[],int)->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by oracleKth below
 * (sort-descending readback), an INDEPENDENT implementation of the same operation
 * (not the walkthrough's min-heap frame emitter), so adapter/oracle bugs cannot
 * silently agree.
 *
 * Staged source: .workers/jobs/neetcode150-completion/kth-largest-element-in-an-array/practice-kth-largest.js
 * (statements, hints, oracle, seeded rows); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time.
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

export const SLUG = 'kth-largest-element-in-an-array'

export const SIGNATURE = Object.freeze({
  name: 'findKthLargest',
  params: Object.freeze([
    { name: 'nums', type: 'int[]' },
    { name: 'k', type: 'int' },
  ]),
  return: 'int',
})

export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial shapes that punish shortcut reasoning.'

/** INDEPENDENT oracle: kth largest in sorted-descending order (not a heap). */
export function oracleKth(nums, k) {
  return nums.slice().sort((a, b) => b - a)[k - 1]
}

const lit = (nums) => '[' + nums.join(',') + ']'

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
    .map(([nums, k]) => ({ args: [lit(nums), String(k)], expected: String(oracleKth(nums, k)) }))
    .slice(0, 5)
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

export function buildKthLargestPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh numbers',
      intent: INTENT_SAME,
      title: 'Kth Largest Element in an Array — fresh numbers (same-task drill)',
      statement:
        'Given an integer array nums and an integer k, return the kth largest element in the array (kth in sorted order, not the kth distinct value). These fresh inputs use new numbers between -10 and 10 with lengths 5 to 7; the signature and exact-match judge mode are unchanged.',
      rows: [
        [[7, -2, 9, 4, 1, 8], 3],
        [[-5, -1, -8, 0, 3], 2],
        [[10, 10, 4, 6, 10, 2], 4],
        [[1, 2, 3, 4, 5, 6, 7], 7],
      ],
      hints: [
        'Keep only the k largest values seen; the smallest kept value is the answer.',
        'Duplicates count separately: kth largest is by position in sorted order, not distinct rank.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Kth Largest Element in an Array — edge cases (same-task drill)',
      statement:
        'Same kth-largest task with the boundary inputs. nums may hold a single element, k may be 1 (the maximum) or n (the minimum), all values may be equal, and values may be negative. The signature and exact-match judge mode are unchanged.',
      rows: [
        [[5], 1],
        [[5, 1, 4], 1],
        [[5, 1, 4], 3],
        [[2, 2, 2, 2], 2],
        [[-1, -5, 0, 3], 2],
      ],
      hints: [
        'With k = 1 the answer is the maximum; with k = n it is the minimum.',
        'A single-element array returns that element; equal values never change the answer.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial shapes',
      intent: INTENT_ADVERSARIAL,
      title: 'Kth Largest Element in an Array — adversarial shapes (same task, no rule change)',
      statement:
        'SAME TASK, no rule change: return the kth largest element in sorted order. These adversarial shapes punish shortcuts — pre-sorted ascending/descending runs, k landing inside a run of duplicates, and extremes with k = n. The signature and exact-match judge mode are unchanged; any correct kth-largest method (heap, sort, quickselect) agrees on every test.',
      rows: [
        [[1, 2, 3, 4, 5, 6], 2],
        [[6, 5, 4, 3, 2, 1], 4],
        [[5, 5, 5, 1, 1, 4, 5], 3],
        [[-10000, 10000, -10000, 10000, 0], 5],
      ],
      hints: [
        'Sorted input needs no special case: the heap eviction step is still required.',
        'When k lands inside a duplicate run, the answer equals the repeated value — do not skip duplicates.',
      ],
    }),
  ]
}

// Staged-compat alias: same builder, family-style name.
export const buildPracticeVariants = buildKthLargestPractice

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oracleKth (sort-descending readback; frame emitter uses a min-heap of size k)',
})

export default buildKthLargestPractice
