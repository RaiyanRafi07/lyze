/**
 * subsets-ii — portable standalone practice builder (batch13).
 *
 * Produces exactly 3 deterministic variants for slug `subsets-ii`
 * (Subsets II, Medium, subsetsWithDup(int[]) -> int[][], mode unordered).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is produced by referenceSubsetsII below
 * (independent O(n * 2^n) bitmask enumeration over index masks with
 * sorted-subset dedup via a key set), a DISTINCT algorithm from the lesson's
 * sort + same-level skip DFS.
 *
 * Staged source: .workers/jobs/question-owners-150/subsets-ii/practice-subsets-ii.js
 * (rows, hints, oracle) — reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Staged rows are kept verbatim; each variant gains one extra honest row so every
 * variant carries 3 tests, with expectations computed by the oracle at build time.
 * Variant ids are exactly v1/v2/v3. All rows are generated practice inputs.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (outer order free, inner subsets ascending).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'unordered' (outer order free, inner subsets ascending).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'subsets-ii'
export const SIGNATURE = Object.freeze({
  name: 'subsetsWithDup',
  params: Object.freeze([{ name: 'nums', type: 'int[]' }]),
  return: 'int[][]',
})
export const MODE = 'unordered'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, fresh numbers so you reproduce the sort-then-skip reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the originals hide: total duplication and a singleton.'
export const INTENT_ADVERSARIAL = 'Same task with unsorted and negative duplicates that punish a missing sort-first step.'

/** INDEPENDENT oracle: bitmask enumeration over index subsets, NOT sort+skip DFS. */
export function referenceSubsetsII(nums) {
  const n = nums.length
  const seen = new Map()
  for (let mask = 0; mask < (1 << n); mask++) {
    const s = []
    for (let i = 0; i < n; i++) {
      if ((mask >> i) & 1) s.push(nums[i])
    }
    s.sort((a, b) => a - b)
    const key = JSON.stringify(s)
    if (!seen.has(key)) seen.set(key, s)
  }
  return [...seen.values()].sort((a, b) => {
    if (a.length !== b.length) return a.length - b.length
    for (let k = 0; k < a.length; k++) {
      if (a[k] !== b[k]) return a[k] - b[k]
    }
    return 0
  })
}

export const outLiteral = (subsets) => '[' + subsets.map((s) => '[' + s.join(',') + ']').join(',') + ']'
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
    .map((nums) => ({ args: [arg(nums)], expected: outLiteral(referenceSubsetsII(nums)) }))
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

export function buildSubsetsPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh duplicates',
      intent: INTENT_SAME,
      title: 'Subsets II — fresh duplicate pair',
      statement:
        'Given nums = [1,3,3] (may contain duplicates), return all distinct subsets in any order. A second drill on [0,2,2] and a third on [2,2,3] repeat the same skip rule with different anchors. (Generated practice rows; same signature, unordered comparison.)',
      rows: [[1, 3, 3], [0, 2, 2], [2, 2, 3]],
      hints: [
        'Sort first: [1,3,3] is already sorted, so the repeat 3s sit together for the level test.',
        'At each level keep the first 3 and skip the second (i > start && nums[i] == nums[i-1]).',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'all-equal edge',
      intent: INTENT_EDGE,
      title: 'Subsets II — all-equal edge',
      statement:
        'Given nums = [5,5,5] (every value duplicated), return all distinct subsets in any order. Expect exactly n+1 subsets on the all-equal rows; a singleton [7] checks the trivial branch. (Generated practice rows; same signature, unordered comparison.)',
      rows: [[5, 5, 5], [7], [4, 4]],
      hints: [
        'With all values equal, each level keeps index start only; every deeper i is a same-level repeat.',
        'Expect exactly n + 1 subsets here ([], [5], [5,5], [5,5,5]); more means the skip is missing.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'unsorted negatives',
      intent: INTENT_ADVERSARIAL,
      title: 'Subsets II — unsorted with negatives',
      statement:
        'Given nums = [-1,2,-1] (unsorted, duplicates, negatives), return all distinct subsets in any order. Further drills on [3,1,2,1] and [0,-1,-1] force a real sort before duplicate pairs meet. (Generated practice rows; same signature, unordered comparison.)',
      rows: [[-1, 2, -1], [3, 1, 2, 1], [0, -1, -1]],
      hints: [
        'Sort before branching: [-1,2,-1] becomes [-1,-1,2]; skipping on the raw order misses the duplicate pair.',
        'The skip test compares values (nums[i] == nums[i-1]), never positions: -1 and 2 are different families.',
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
  oracle: 'referenceSubsetsII (bitmask enumeration over index masks with sorted-subset dedup; sort+skip DFS used only in walkthrough)',
})
