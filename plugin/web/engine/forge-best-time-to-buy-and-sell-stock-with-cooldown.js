// Practice forge for `best-time-to-buy-and-sell-stock-with-cooldown` (LeetCode 309).
// Generated exercises, clearly labelled as generated in each title/statement.
// Same judge signature (maxProfit, int[] -> int), comparison mode `exact`.
// All `expected` values below are produced at build time by the INDEPENDENT
// oracles bruteCooldown (exhaustive action-sequence DFS over buy/sell/hold
// with a just-sold lockout — a DIFFERENT algorithm from the walkthrough's
// hold/sold/rest state machine) and bruteNoCooldown (uptick sum for the v3
// rule twist), and cross-checked against a state-machine reference; any
// disagreement throws so a bad literal can never ship as "verified".
// Deterministic: fixed rows (v1 rows pinned from the staged seeded generator),
// no RNG.

export const SLUG = 'best-time-to-buy-and-sell-stock-with-cooldown'

export const SIGNATURE = {
  name: 'maxProfit',
  params: [{ name: 'prices', type: 'int[]' }],
  return: 'int',
}

export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

// INDEPENDENT oracle: exhaustive search over action sequences with a just-sold
// lockout (memoised on day/holding/cooling). Never the hold/sold/rest DP.
export function bruteCooldown(prices) {
  const n = prices.length
  const memo = new Map()
  function dfs(day, holding, cooling) {
    if (day >= n) return 0
    const key = day + '|' + holding + '|' + cooling
    if (memo.has(key)) return memo.get(key)
    let best
    if (holding) {
      const sell = prices[day] + dfs(day + 1, false, true)
      const keep = dfs(day + 1, true, false)
      best = sell > keep ? sell : keep
    } else if (cooling) {
      best = dfs(day + 1, false, false)
    } else {
      const buy = -prices[day] + dfs(day + 1, true, false)
      const skip = dfs(day + 1, false, false)
      best = buy > skip ? buy : skip
    }
    memo.set(key, best)
    return best
  }
  return dfs(0, false, false)
}

// INDEPENDENT oracle for the v3 twist (no cooldown): bank every uptick.
export function bruteNoCooldown(prices) {
  let profit = 0
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i - 1]) profit += prices[i] - prices[i - 1]
  }
  return profit
}

// Cross-check reference: the walkthrough's hold/sold/rest state machine.
export function referenceCooldown(prices) {
  let hold = -prices[0], sold = null, rest = 0
  for (let i = 1; i < prices.length; i++) {
    const prevHold = hold, prevSold = sold, prevRest = rest
    hold = prevHold > prevRest - prices[i] ? prevHold : prevRest - prices[i]
    sold = prevHold + prices[i]
    rest = prevSold === null || prevRest > prevSold ? prevRest : prevSold
  }
  if (prices.length === 1) return 0
  return sold === null || rest > sold ? rest : sold
}

const argLiteral = (prices) => '[' + prices.map(String).join(',') + ']'

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  }
}

function inputLine(signature, args) {
  return signature.params.map((p, i) => (p && p.name ? p.name : 'arg' + i) + ' = ' + args[i]).join(', ')
}

const CASES = {
  v1: {
    suffix: 'fresh values (generated)',
    seedLabel: 'fresh values',
    intent: 'Same pattern, different numbers so you reproduce the reasoning.',
    statement:
      'Generated drill under the real cooldown rule: with a 1-day cooldown after every sale, return the maximum profit. ' +
      'These generated inputs have 5 to 8 values between 0 and 20; reproduce the hold/sold/rest reasoning on fresh numbers. ' +
      'The signature and exact comparison are unchanged.',
    oracle: 'cooldown',
    rows: [[0, 10, 6, 14, 4, 10, 3], [7, 5, 5, 1, 1, 6, 4], [7, 4, 19, 0, 6, 20], [7, 18, 6, 8, 7, 19]],
    hints: [
      'Keep three rolling states: hold (own a share), sold (just sold), rest (free to buy).',
      'Buying may only come from rest, never from just-sold: that missing edge is the cooldown.',
    ],
  },
  v2: {
    suffix: 'edge cases (generated)',
    seedLabel: 'edge cases',
    intent: 'Same pattern with the edge case the original hides.',
    statement:
      'Generated drill, same cooldown task. ' +
      'Inputs include the single-day case (answer 0, no sale possible), pure rises and falls, a flat line, and a dip right after a sale where the cooldown blocks rebuying. ' +
      'The signature and exact comparison are unchanged.',
    oracle: 'cooldown',
    rows: [[5], [1, 2], [2, 1], [4, 4, 4], [6, 1, 6]],
    hints: [
      'A single day cannot transact: seed day 0 and return 0 without special-casing later days.',
      'After selling into a dip, the next day must rest even if the price looks tempting.',
    ],
  },
  v3: {
    suffix: 'twist: no cooldown (generated)',
    seedLabel: 'twist, same signature',
    intent: 'Same signature, different question: the twist tests whether the idea transfers.',
    statement:
      'Generated drill with an explicit RULE CHANGE: there is no cooldown — you may buy the day after a sale (unlimited transactions, Stock II rule). ' +
      'Keep the same maxProfit method signature and return type; the removed cooldown is intentional. ' +
      'Compare with the cooldown answer on the same input: the gap is exactly what the lockout costs.',
    oracle: 'noCooldown',
    rows: [[1, 2, 3, 0, 2], [7, 1, 5, 3, 6, 4], [1, 2], [2, 1]],
    hints: [
      'Without a cooldown every positive day-to-day gain can be banked independently.',
      'Compare with the cooldown answer on the same input: the gap is exactly what the lockout costs.',
    ],
  },
}

function buildOne(id, spec, signature, difficulty, baseTitle) {
  const oracle = spec.oracle === 'noCooldown' ? bruteNoCooldown : bruteCooldown
  const tests = spec.rows.map((prices) => {
    const fromOracle = oracle(prices)
    if (spec.oracle !== 'noCooldown' && referenceCooldown(prices) !== fromOracle) {
      throw new Error('cooldown practice oracle disagreement on [' + prices.join(',') + ']')
    }
    if (spec.oracle === 'noCooldown' && bruteNoCooldown(prices) !== fromOracle) throw new Error('unreachable')
    return { args: [argLiteral(prices)], expected: String(fromOracle) }
  })
  const first = tests[0]
  const twist = spec.oracle === 'noCooldown' ? ' (rule twist: no cooldown)' : ' (same task)'
  return {
    id,
    seedLabel: spec.seedLabel,
    intent: spec.intent,
    difficulty,
    title: baseTitle + ' — ' + spec.suffix + twist,
    statement: spec.statement,
    signature: cloneSignature(signature),
    examples: [{ input: inputLine(signature, first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: spec.hints.slice(0, 2),
    source: 'generated',
  }
}

// Live-forge-compatible builder: (problem, signature, rng) => 3 variants.
// Returns [] on an incompatible signature (never builds against it).
export function buildCooldownVariants(problem, signature, rng) {
  void rng
  const sig = signature || (problem && problem.signature) || SIGNATURE
  if (!sig || sig.name !== 'maxProfit' || sig.return !== 'int') return []
  const params = Array.isArray(sig.params) ? sig.params : []
  if (params.length !== 1 || params[0].type !== 'int[]') return []
  const base = String((problem && (problem.title || problem.slug)) || 'Best Time to Buy and Sell Stock with Cooldown')
  const difficulty =
    problem && (problem.difficulty === 'Easy' || problem.difficulty === 'Hard')
      ? problem.difficulty
      : DIFFICULTY
  try {
    return [
      buildOne('v1', CASES.v1, sig, difficulty, base),
      buildOne('v2', CASES.v2, sig, difficulty, base),
      buildOne('v3', CASES.v3, sig, difficulty, base),
    ]
  } catch {
    return []
  }
}

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: 'v3 no-cooldown twist only; v1/v2 same task',
  oracle: 'bruteCooldown / bruteNoCooldown (exhaustive action search; state-machine DP used only in walkthrough)',
})
