/**
 * burst-balloons — portable standalone practice builder (batch13).
 *
 * Produces exactly 3 deterministic variants for slug `burst-balloons`
 * (Burst Balloons, Hard, maxCoins(int[])->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * memoOracle below (top-down memo DFS over the last-burst recurrence), an
 * INDEPENDENT implementation of the same operation (not the walkthrough's
 * bottom-up interval-DP frame emitter), and cross-checked against the
 * bottom-up table — the two computations must agree or the builder throws.
 *
 * Staged source: .workers/jobs/neetcode150-completion/burst-balloons/burst-balloons.practice.js
 * (statements, hints, rows, DP + memo oracles); reshaped into the forge
 * variant contract (id/seedLabel/intent/difficulty/title/statement/
 * signature/examples/tests/mode/hints). Official examples are NOT reused in
 * any drill ([3,1,5,8] and [1,5] appear only in the lesson walkthrough).
 * Expected literals re-verified against the oracle at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (exact integer match for this slug).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (integer answers; exact match).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'burst-balloons'
export const SIGNATURE = Object.freeze({
  name: 'maxCoins',
  params: Object.freeze([{ name: 'nums', type: 'int[]' }]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Hard'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial numbers so burst-first shortcuts fail.'

/**
 * INDEPENDENT reference oracle: top-down memo DFS trying every balloon as
 * the last burst of the open interval (l, r). Never builds the bottom-up
 * table, so agreement with the walkthrough adapter is genuine cross-check
 * evidence, not shared-logic echo.
 */
export function memoOracle(nums) {
  const v = [1, ...nums, 1]
  const m = v.length
  const memo = Array.from({ length: m }, () => new Array(m).fill(-1))
  function solve(l, r) {
    if (r - l < 2) return 0
    if (memo[l][r] >= 0) return memo[l][r]
    let best = 0
    for (let k = l + 1; k < r; k++) {
      const cand = solve(l, k) + solve(k, r) + v[l] * v[k] * v[r]
      if (cand > best) best = cand
    }
    memo[l][r] = best
    return best
  }
  return solve(0, m - 1)
}

/**
 * Cross-check: canonical bottom-up interval DP (the walkthrough's
 * algorithm), run here only to prove the memo reference agrees on every
 * drill row. Throws on any disagreement.
 */
export function bottomUpCheck(nums) {
  const v = [1, ...nums, 1]
  const m = v.length
  const dp = Array.from({ length: m }, () => new Array(m).fill(0))
  for (let len = 2; len < m; len++) {
    for (let l = 0; l + len < m; l++) {
      const r = l + len
      let best = 0
      for (let k = l + 1; k < r; k++) {
        const cand = dp[l][k] + dp[k][r] + v[l] * v[k] * v[r]
        if (cand > best) best = cand
      }
      dp[l][r] = best
    }
  }
  return dp[0][m - 1]
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

function checkedTests(rows) {
  return rows.map((nums) => {
    const a = memoOracle(nums)
    const b = bottomUpCheck(nums)
    if (a !== b) throw new Error(`burst-balloons oracle disagreement on [${nums}]: memo=${a} bottomUp=${b}`)
    return { args: [lit(nums)], expected: lit(a) }
  })
}

function buildVariant({ id, seedLabel, intent, title, statement, rowList, hints }) {
  const tests = checkedTests(rowList)
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

const BASE_STATEMENT =
  'You are given n balloons where nums[i] is painted on balloon i. Bursting balloon i earns nums[i-1]*nums[i]*nums[i+1] coins, treating a missing neighbor as 1. Return the maximum coins from bursting all balloons wisely.'

export function buildBurstBalloonsPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh balloons',
      intent: INTENT_SAME,
      title: 'Burst Balloons — Fresh Balloons (same task)',
      statement:
        `${BASE_STATEMENT} These fresh inputs hold 3 to 5 balloons with values 1 to 10; work each open interval and pick the best last burst.`,
      rowList: [
        [2, 3, 7, 10],
        [4, 2, 6],
        [8, 3, 5],
        [6, 1, 4, 2, 5],
      ],
      hints: [
        'For open interval (l,r) try every inside k as the LAST burst: dp[l][k]+dp[k][r]+val[l]*val[k]*val[r].',
        'Pad with ones: val=[1,...nums,1]; fill intervals by growing length so both sides are solved.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Burst Balloons — Edge Cases (same task)',
      statement:
        `${BASE_STATEMENT} The boundary inputs: a lone balloon, a lone zero, a two-balloon pair, and all zeros. A single balloon scores 1*x*1; zeros contribute nothing.`,
      rowList: [
        [7],
        [0],
        [5, 1],
        [0, 0],
      ],
      hints: [
        'With n==1 the answer is nums[0] itself (1*nums[0]*1); no ordering choice exists.',
        'Zeros zero out any gain touching them, so all-zero rows stay at 0.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'same task',
      intent: INTENT_ADVERSARIAL,
      title: 'Burst Balloons — Adversarial Numbers (same task)',
      statement:
        `${BASE_STATEMENT} Same question, adversarial numbers only: interior zeros split the interval and huge ends reward saving a big balloon for last against the sentinel 1. No rule change.`,
      rowList: [
        [0, 5, 0, 3],
        [100, 1, 1, 100],
        [9, 9, 9],
        [50, 2, 50],
      ],
      hints: [
        'Saving 100 for last against the sentinel 1 beats bursting it early between small walls.',
        'A zero k is never a useful last burst (gain 0), but its sides must still be solved independently.',
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
  oracle: 'memoOracle (top-down memo DFS over last-burst choices; bottom-up table used only in walkthrough)',
})
