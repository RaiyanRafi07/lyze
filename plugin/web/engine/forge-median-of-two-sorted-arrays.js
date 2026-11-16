/**
 * median-of-two-sorted-arrays — portable standalone practice builder (batch13).
 *
 * Produces exactly 3 deterministic variants for slug `median-of-two-sorted-arrays`
 * (Median of Two Sorted Arrays, Hard, findMedianSortedArrays(int[],int[])->double,
 * mode float). Pure ES module: no DOM, no network, no dependencies, no
 * Math.random, no Date. Fixed inputs; every expected value is computed at build
 * time by oracleMedian below (plain merge-then-middle), an INDEPENDENT
 * implementation of the same operation (not the walkthrough's partition
 * binary-search frame emitter).
 *
 * Staged source: .workers/jobs/question-owners-150/median-of-two-sorted-arrays/practice.js
 * (rows, hints, oracle, float compare) — reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Stored expectations re-verified against the oracle at build time; a mismatch
 * throws instead of shipping a wrong literal. Variant ids are exactly v1/v2/v3
 * (source set ids kept as seedLabels).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (float compare with 1e-5 tolerance for this slug).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'float' (median answers; tolerance compare).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'median-of-two-sorted-arrays'
export const SIGNATURE = Object.freeze({
  name: 'findMedianSortedArrays',
  params: Object.freeze([{ name: 'nums1', type: 'int[]' }, { name: 'nums2', type: 'int[]' }]),
  return: 'double',
})
export const MODE = 'float'
export const DIFFICULTY = 'Hard'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same median task on adversarial data (no output-type change).'

/** INDEPENDENT reference oracle: plain merge-then-middle. Separate code path from the partition walkthrough. */
export function oracleMedian(nums1, nums2) {
  const merged = nums1.concat(nums2).sort((a, b) => a - b)
  const t = merged.length
  if (t === 0) throw new Error('oracle: empty total')
  if (t % 2 === 1) return merged[(t - 1) / 2]
  return (merged[t / 2 - 1] + merged[t / 2]) / 2
}

export function floatEqual(a, b, tol = 1e-5) {
  return Math.abs(Number(a) - Number(b)) <= tol
}

const lit = (v) => JSON.stringify(v)

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
    .map(([a, b]) => {
      const expected = lit(oracleMedian(JSON.parse(a), JSON.parse(b)))
      return { args: [String(a), String(b)], expected }
    })
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

export function buildMedianSortedArraysPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh numbers',
      intent: INTENT_SAME,
      title: 'Median of Two Sorted Arrays — fresh numbers (same task)',
      statement:
        'Given two sorted arrays nums1 and nums2, return the median of the two sorted arrays with O(log (m+n)) time. Five fresh pairs mix odd and even totals with uneven lengths, including negatives.',
      rows: [
        ['[1,5,9]', '[2,3,7,10]'],
        ['[1,3]', '[2]'],
        ['[4,6,8]', '[1,2,3]'],
        ['[10,20]', '[30,40,50]'],
        ['[-5,0,5]', '[1,2]'],
      ],
      hints: [
        'Binary-search the split of the smaller array; derive the other split from half=(m+n+1)/2.',
        'Return only when maxLA<=minRB and maxLB<=minRA; use -inf/+inf at empty edges.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'hidden edge',
      intent: INTENT_EDGE,
      title: 'Median of Two Sorted Arrays — empty-side edge (same task)',
      statement:
        'Given two sorted arrays nums1 and nums2 with 1 <= m+n <= 2000, return the median. One array may be empty; duplicates and negatives are allowed.',
      rows: [
        ['[]', '[1]'],
        ['[1]', '[2,3,4,5,6]'],
        ['[0,0]', '[0,0]'],
        ['[-3,-1]', '[2]'],
        ['[2]', '[3,4]'],
      ],
      hints: [
        'An empty side forces pa=0 or pb=0: the missing border must be -inf/+inf, never an array read.',
        'Duplicates are fine: the partition test uses <= on both sides, not strict <.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'same-task adversarial',
      intent: INTENT_ADVERSARIAL,
      title: 'Median of Two Sorted Arrays — adversarial overlap (same task)',
      statement:
        'Same task, same signature: median of two sorted arrays. Inputs overlap, repeat, or sit at value extremes; the partition logic must still hold.',
      rows: [
        ['[1,1,1]', '[1,1]'],
        ['[-1000000]', '[1000000]'],
        ['[1,2,3,4,5]', '[6,7,8,9,10]'],
        ['[1,3,5,7]', '[2,4,6,8]'],
        ['[1,2]', '[3,4]'],
      ],
      hints: [
        'Interleaved arrays force several probe steps: check pa+pb==half on every frame before trusting borders.',
        'Extreme values still compare numerically: average the two middle borders as doubles for even totals.',
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
  oracle: 'oracleMedian (plain merge-then-middle; partition binary search used only in walkthrough)',
})
