/**
 * 3sum — portable standalone practice builder (neetcode150-completion).
 *
 * Produces exactly 3 deterministic variants for slug `3sum`
 * (3Sum, Medium, threeSum(int[])->int[][], mode unordered).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is produced by referenceThreeSum below
 * (independent O(n^3) brute-force oracle over index triples i<j<k with
 * sorted-triple dedup), a DISTINCT algorithm from the lesson's sort +
 * converging two pointers walkthrough, and cross-checked against the
 * integrated walkthrough build in the staged selfcheck.
 *
 * Staged source: .workers/jobs/neetcode150-completion/3sum/practice-3sum.mjs
 * (rows, statements, oracle); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Outer order is free, inner triples ascending; comparison mode `unordered`.
 * All three sets are the SAME task (no output-type-changing twist).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'unordered' (outer order free, triplets ascending).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = '3sum'
export const SIGNATURE = Object.freeze({
  name: 'threeSum',
  params: Object.freeze([{ name: 'nums', type: 'int[]' }]),
  return: 'int[][]',
})
export const MODE = 'unordered'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the anchor-and-converge reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same task with duplicate-heavy shapes that punish missing dedup steps.'

/** INDEPENDENT oracle: brute force over index triples, NOT sort+two-pointers. */
export function referenceThreeSum(nums) {
  const seen = new Map()
  for (let i = 0; i < nums.length; i += 1) {
    for (let j = i + 1; j < nums.length; j += 1) {
      for (let k = j + 1; k < nums.length; k += 1) {
        if (nums[i] + nums[j] + nums[k] === 0) {
          const t = [nums[i], nums[j], nums[k]].sort((a, b) => a - b)
          seen.set(JSON.stringify(t), t)
        }
      }
    }
  }
  return [...seen.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])
}

export const outLiteral = (v) => '[' + v.map((t) => '[' + t.join(',') + ']').join(',') + ']'
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
    .map((nums) => ({ args: [arg(nums)], expected: outLiteral(referenceThreeSum(nums)) }))
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

export function buildThreesumPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh triplets',
      intent: INTENT_SAME,
      title: '3Sum — Fresh Numbers (same task)',
      statement:
        'Given an integer array nums, return all distinct triplets [a,b,c] with a+b+c == 0. Do not return duplicate triplets; the order of the triplets does not matter. These fresh inputs have 5 to 6 values with mixed signs and duplicates, so the anchor-skip and post-record dedup steps both run. The signature and unordered comparison are unchanged.',
      rows: [
        [-2, 0, 1, 1, 2],
        [3, 0, -2, -1, 1, 2],
        [-1, -1, 0, 1, 2],
        [-4, -1, -1, 0, 1, 2],
      ],
      hints: [
        'Sort first, then fix each anchor and converge lo/hi toward the negated anchor.',
        'After recording a zero-sum triple, move both ends past any duplicate values.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: '3Sum — Edge Cases (same task)',
      statement:
        'Same zero-triplet task: return every distinct [a,b,c] with a+b+c == 0, or [] when none exists. Inputs include the all-zero array, arrays with no possible triple, and single-sign arrays that force the search to exhaust without recording. The signature and unordered comparison are unchanged.',
      rows: [
        [0, 0, 0],
        [0, 1, 1],
        [1, 2, 3],
        [-5, -4, -3],
      ],
      hints: [
        'An all-zero array yields exactly one triple; dedup must collapse every repeat into [[0,0,0]].',
        'When every sum stays on one side of zero, the ends still converge until they meet with nothing recorded.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial duplicates',
      intent: INTENT_ADVERSARIAL,
      title: '3Sum — Adversarial Duplicates (same task)',
      statement:
        'SAME TASK, harder shapes: return every distinct [a,b,c] with a+b+c == 0. Duplicate-heavy and zero-heavy arrays punish solutions that skip only anchor duplicates or only post-record duplicates — both dedup steps must run. No rule change: the signature and unordered comparison are unchanged.',
      rows: [
        [-1, -1, -1, 0, 1, 1],
        [0, 0, 0, 0],
        [-4, -2, -2, 0, 1, 2, 3],
        [-1, 0, 1, 2, -1, -4],
      ],
      hints: [
        'Count how many copies of each value exist; each distinct triple is recorded exactly once.',
        'A recorded triple moves BOTH ends past duplicates — moving only one end re-records the same triple.',
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
  oracle: 'referenceThreeSum (O(n^3) index triples + sorted dedup; sort+converge used only in walkthrough)',
})
