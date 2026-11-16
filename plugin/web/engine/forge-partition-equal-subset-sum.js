/**
 * partition-equal-subset-sum — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `partition-equal-subset-sum`
 * (Partition Equal Subset Sum, Medium, canPartition(int[])->boolean, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Seeded RNG (mulberry32 over FNV-1a of the slug); every expected value is
 * computed at build time by oracleCanPartition below (recursive memoized
 * dfs(i, rem) over suffixes, no iterative table), an INDEPENDENT
 * implementation of the same operation (not the walkthrough's backward 1-D
 * dp frame emitter). Walkthrough scans s backward writing dp[s]; the oracle
 * never builds that table and instead memoizes suffix decisions.
 *
 * Staged source: .workers/jobs/question-owners-150/partition-equal-subset-sum/practice.mjs
 * (statements, hints, oracle pair) + reference.md; reshaped into the forge
 * variant contract (id/seedLabel/intent/difficulty/title/statement/signature/
 * examples/tests/mode/hints). Expected literals re-verified against the oracle
 * at build time (and cross-checked vs the iterative reference; builder throws
 * on disagreement). All three sets are the SAME task (no twist): identical
 * signature, identical question — v3 is adversarial same-task numbers only.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (mode 'exact').
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'partition-equal-subset-sum'
export const SIGNATURE = Object.freeze({
  name: 'canPartition',
  params: Object.freeze([{ name: 'nums', type: 'int[]' }]),
  return: 'boolean',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'

/**
 * INDEPENDENT oracle: recursive memoized dfs(i, rem) over suffix nums[i..].
 * Shares no code with the iterative dp table, so a table bug cannot hide.
 * Different method from the walkthrough (backward 1-D dp with early exit).
 */
export function oracleCanPartition(nums) {
  const tot = nums.reduce((a, b) => a + b, 0)
  if (tot % 2 !== 0) return false
  const half = tot / 2
  const memo = new Map()
  function dfs(i, rem) {
    if (rem === 0) return true
    if (i >= nums.length || rem < 0) return false
    const k = i + ',' + rem
    if (memo.has(k)) return memo.get(k)
    const r = dfs(i + 1, rem) || dfs(i + 1, rem - nums[i])
    memo.set(k, r)
    return r
  }
  return dfs(0, half)
}

/** Cross-check reference: backward 1-D dp (mirrors the lesson adapter). */
export function referenceCanPartition(nums) {
  const tot = nums.reduce((a, b) => a + b, 0)
  if (tot % 2 !== 0) return false
  const half = tot / 2
  const dp = new Array(half + 1).fill(false)
  dp[0] = true
  for (const num of nums) {
    for (let s = half; s >= num; s -= 1) {
      if (dp[s - num]) dp[s] = true
    }
    if (dp[half]) return true
  }
  return dp[half]
}

function hashText(text) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0
  return h
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1))

function outLiteral(v) {
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (Array.isArray(v)) return '[' + v.map(outLiteral).join(',') + ']'
  return String(v)
}

function toTest(nums) {
  for (const x of nums) {
    if (!Number.isSafeInteger(x) || x < 1 || x > 100) throw new Error('practice nums out of judge range')
  }
  if (nums.length < 1 || nums.length > 200) throw new Error('practice length out of judge range')
  const expected = oracleCanPartition(nums)
  if (referenceCanPartition(nums) !== expected) throw new Error('oracle disagreement on [' + nums + ']')
  return { args: [outLiteral(nums.slice())], expected: outLiteral(expected) }
}

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  }
}

function inputLine(args) {
  return SIGNATURE.params.map((p, i) => `${p.name} = ${args[i]}`).join(', ')
}

function buildVariant({ id, seedLabel, intent, title, statement, cases, hints }) {
  const tests = cases
    .map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
    .slice(0, 5)
  const first = tests[0]
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
  }
}

/* ---------------- entry point ---------------- */

export function buildPartitionPractice() {
  const rng = mulberry32(hashText(SLUG))
  const seen = new Set(['[1,5,11,5]'])
  const v1rows = []
  let guard = 0
  while (v1rows.length < 4 && guard++ < 500) {
    const n = randInt(rng, 3, 6)
    const nums = Array.from({ length: n }, () => randInt(rng, 1, 12))
    const key = JSON.stringify(nums)
    if (seen.has(key)) continue
    seen.add(key)
    v1rows.push(toTest(nums))
  }
  if (v1rows.length < 4) throw new Error('seeded v1 generation failed')

  const v1 = buildVariant({
    id: 'v1',
    seedLabel: 'fresh sums',
    intent: INTENT_SAME,
    title: 'Partition Equal Subset Sum — fresh sums (subset-sum drill)',
    statement:
      'Given an integer array nums, return true if the array can be partitioned into two subsets with equal sums, otherwise false. These fresh inputs hold 3 to 6 seeded values between 1 and 12; recompute the total, the half target, and the backward dp scan on the new numbers. The signature and exact-match judge mode are unchanged.',
    cases: v1rows,
    hints: [
      'If the total is odd there is no split; otherwise the target is total/2 and dp[0]=true seeds the empty subset.',
      'Scan sums from half down to num so each number is used at most once; forward scans silently reuse a number.',
    ],
  })

  const v2rows = [[1], [2, 2], [1, 2, 3], [5, 5, 5, 5], [100, 100]].map(toTest)
  const v2 = buildVariant({
    id: 'v2',
    seedLabel: 'edge cases',
    intent: INTENT_EDGE,
    title: 'Partition Equal Subset Sum — edge cases (subset-sum drill)',
    statement:
      'Same equal-partition task with the boundary inputs: a single element, a minimal true pair, an odd total that short-circuits to false, an all-same quad, and a max-value pair. The signature and exact comparison are unchanged.',
    cases: v2rows,
    hints: [
      'A single positive element always sums to an odd-or-unmatched total; only the empty subset reaches 0.',
      'Max values behave like small ones: [100,100] halves to 100 with one backward pass.',
    ],
  })

  const v3rows = [[3, 3, 3, 4, 5], [2, 2, 1, 1], [1, 1, 1, 1, 1, 1, 1, 1], [6, 10, 14, 8]].map(toTest)
  const v3 = buildVariant({
    id: 'v3',
    seedLabel: 'adversarial sums',
    intent: INTENT_SAME,
    title: 'Partition Equal Subset Sum — adversarial sums (subset-sum drill)',
    statement:
      'Same equal-partition question with adversarial placements and no rule change: duplicate pools where greedy pairing fails, an all-ones street with many routes to half, and a near-miss total where only the full backward scan convicts. Same signature, same exact comparison.',
    cases: v3rows,
    hints: [
      'Duplicates never decide by pairing alone: only the reachable-sums table proves half is attainable.',
      'A near-miss total looks splittable until the backward pass shows dp[half] stays false.',
    ],
  })

  return [v1, v2, v3]
}

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oracleCanPartition (recursive memoized dfs over suffixes; walkthrough uses backward 1-D dp table)',
})
