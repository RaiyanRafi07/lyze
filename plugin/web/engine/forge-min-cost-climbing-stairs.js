/**
 * min-cost-climbing-stairs — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `min-cost-climbing-stairs`
 * (Min Cost Climbing Stairs, Easy, minCostClimbingStairs(int[])->int, mode exact).
 * Every expected value is computed at build time by suffixOracle below
 * (suffix DP from the top) and cross-checked against forwardOracle (forward
 * prefix DP, the walkthrough's algorithm) — the two independent computations
 * must agree or the builder throws.
 *
 * Staged source: .workers/jobs/question-owners-150/min-cost-climbing-stairs/practice.js
 * (seeded fresh/edge/greedy-trap rows, suffix + forward oracles, greedy-walk
 * trap proof); reshaped into the forge variant contract with 3-5 tests per
 * variant (ids v1/v2/v3), examples[0] from tests[0], exactly 2 hints each.
 * No official example is reused in any drill; no rule change (same
 * pay-on-leave rule everywhere — the twist is an adversarial input shape,
 * not a changed win condition).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (an integer string).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (integer string diff).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'min-cost-climbing-stairs'
export const SIGNATURE = Object.freeze({
  name: 'minCostClimbingStairs',
  params: Object.freeze([{ name: 'cost', type: 'int[]' }]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Easy'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_TWIST = 'Same signature, hostile shape: the twist tests whether the idea transfers.'

/** Reference for expected: suffix DP from the top (not the rendered algorithm). */
export function suffixOracle(cost) {
  const n = cost.length
  const dp = new Array(n + 2).fill(0) // dp[n] = dp[n+1] = 0: past the top is free
  for (let i = n - 1; i >= 0; i -= 1) {
    dp[i] = cost[i] + Math.min(dp[i + 1], dp[i + 2])
  }
  return Math.min(dp[0], dp[1])
}

/**
 * INDEPENDENT cross-check: forward prefix DP (the walkthrough's algorithm),
 * run here only to prove the suffix reference agrees on every drill.
 */
export function forwardOracle(cost) {
  const n = cost.length
  const dp = new Array(n + 1).fill(0)
  for (let i = 2; i <= n; i += 1) {
    dp[i] = Math.min(dp[i - 1] + cost[i - 1], dp[i - 2] + cost[i - 2])
  }
  return dp[n]
}

function hashText(text) {
  const source = String(text)
  let hash = 2166136261 >>> 0
  for (let i = 0; i < source.length; i += 1) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619) >>> 0
  return hash
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

function argLiteral(cost) {
  return `[${cost.join(',')}]`
}

function inputLine(signature, args) {
  return signature.params
    .map((param, index) => `${(param && param.name) || 'arg' + index} = ${args[index]}`)
    .join(', ')
}

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  }
}

const OFFICIAL = new Set(['[10,15,20]', '[1,100,1,1,1,100,1,1,100,1]'])

function freshCost(rng) {
  for (;;) {
    const n = 5 + Math.floor(rng() * 4)
    const cost = Array.from({ length: n }, () => Math.floor(rng() * 21))
    if (OFFICIAL.has(argLiteral(cost))) continue
    if (cost.every((value) => value === cost[0])) continue
    return cost
  }
}

function greedyWalk(cost) {
  const n = cost.length
  let pos = cost[1] <= cost[0] ? 1 : 0
  let total = 0
  for (;;) {
    if (pos >= n) return total
    total += cost[pos]
    pos += (pos + 2 <= n && (pos + 2 === n || cost[pos + 1] >= cost[pos + 2])) ? 2 : 1
  }
}

function buildVariant({ id, seedLabel, intent, title, statement, costs, hints }) {
  const tests = costs
    .map((cost) => {
      const expected = String(suffixOracle(cost))
      if (String(forwardOracle(cost)) !== expected) throw new Error('oracle disagreement on ' + argLiteral(cost))
      return { args: [argLiteral(cost)], expected }
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

export function buildMinCostClimbingStairsPractice() {
  const rng = mulberry32(hashText(SLUG))
  const fresh = [freshCost(rng), freshCost(rng), freshCost(rng), freshCost(rng)]
  const edges = [[7, 3], [0, 5], [0, 0, 0, 0], [4, 0, 4]]
  const traps = [[10, 15, 20, 10, 15], [2, 3, 10, 2, 3, 10, 2], [6, 7, 6, 7, 6, 7, 100]]
  for (const cost of traps) {
    if (!(greedyWalk(cost) > suffixOracle(cost))) throw new Error('trap fails to punish greedy on ' + argLiteral(cost))
  }
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh stairs',
      intent: INTENT_SAME,
      title: 'Min Cost Climbing Stairs — Fresh Stairs (same task)',
      statement:
        'You pay cost[i] when you leave stair i, may start on stair 0 or 1, and must reach the top past the last stair. Price REACHING each stair with dp[i] = min(dp[i-1]+cost[i-1], dp[i-2]+cost[i-2]). Fresh seeded staircases hold 5 to 8 stairs priced 0 to 20. Same rule, new numbers. The signature and exact comparison are unchanged.',
      costs: fresh,
      hints: [
        'Price REACHING each stair: dp[i] = min(dp[i-1]+cost[i-1], dp[i-2]+cost[i-2]) with dp[0]=dp[1]=0.',
        'The answer is dp[n] (the top), not the cheapest cost[i]: you never pay after arriving.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge shapes',
      intent: INTENT_EDGE,
      title: 'Min Cost Climbing Stairs — Edge Shapes (same task)',
      statement:
        'Same official pay-on-leave rule on hidden edge shapes: the shortest legal staircase, where starting on stair 1 already reaches the top in one move, and runs of zero-price stairs where the answer is 0. Zero prices are legal dp values, not unset cells. No rule change.',
      costs: edges,
      hints: [
        'With cost.length == 2 the answer is min(cost[0], cost[1]): start on the cheaper stair and step to the top.',
        'Zero prices are legal (0 <= cost[i]); dp entries are genuinely 0 there, not unset.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'greedy trap',
      intent: INTENT_TWIST,
      title: 'Min Cost Climbing Stairs — Greedy Trap (transfer)',
      statement:
        'SAME TASK, adversarial shape, no rule change: a myopic greedy walk (jumping whenever the landing looks no worse than stepping once) commits to cheap-looking stairs whose onward jumps are expensive, while the optimum jumps over the trap. Compare BOTH arrivals at every stair. The signature and exact comparison are unchanged.',
      costs: traps,
      hints: [
        'Greedy fails here: compare BOTH arrivals at every stair instead of committing to the cheaper-looking neighbor.',
        'The 2-step jump exists exactly to skip an expensive stair — check where dp[i-2]+cost[i-2] wins.',
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
  oracle: 'suffixOracle (suffix DP from the top; forward prefix DP used only in walkthrough)',
})
