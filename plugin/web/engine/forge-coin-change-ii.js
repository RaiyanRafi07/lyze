// Practice forge for `coin-change-ii` (LeetCode 518). Generated exercises,
// clearly labelled as generated in each title/statement.
// Same judge signature (change, int + int[] -> int), comparison mode `exact`.
// All `expected` values below are produced at build time by BOTH oracles:
// ccCountCombos (coin-outer counting DP, the walkthrough algorithm) and
// ccEnumCombos (memoized recursion over sorted coinIndex/remainder — an
// INDEPENDENT algorithm that never builds the dp table); any disagreement
// throws so a bad literal can never ship as "verified".
// Deterministic: fixed rows (v1 pinned from the staged seeded generator),
// no RNG.

export const SLUG = 'coin-change-ii'

export const SIGNATURE = {
  name: 'change',
  params: [
    { name: 'amount', type: 'int' },
    { name: 'coins', type: 'int[]' },
  ],
  return: 'int',
}

export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

/** Reference (counting combos): coin-outer DP; order of coins never matters. */
export function ccCountCombos(coins, amount) {
  const dp = new Array(amount + 1).fill(0)
  dp[0] = 1
  for (const c of coins) {
    for (let a = c; a <= amount; a++) dp[a] += dp[a - c]
  }
  return dp[amount]
}

/** Independent oracle: memoized recursion over (coinIndex, remainder). */
export function ccEnumCombos(coins, amount) {
  const sorted = coins.slice().sort((a, b) => a - b)
  const memo = new Map()
  function count(i, rest) {
    if (rest === 0) return 1
    if (i >= sorted.length) return 0
    const key = i + ':' + rest
    if (memo.has(key)) return memo.get(key)
    let total = 0
    for (let k = i; k < sorted.length && sorted[k] <= rest; k++) total += count(k, rest - sorted[k])
    memo.set(key, total)
    return total
  }
  return count(0, amount)
}

function numLiteral(n) {
  if (!Number.isFinite(n)) return '0'
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(6)))
}

function outLiteral(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return numLiteral(value)
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return '[' + value.map(outLiteral).join(',') + ']'
  return String(value)
}

function argLiteral(value) {
  if (typeof value === 'string') return JSON.stringify(value)
  return outLiteral(value)
}

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  }
}

function inputLine(signature, args) {
  return signature.params.map((p, i) => ((p && p.name) || 'arg' + i) + ' = ' + args[i]).join(', ')
}

const CASES = {
  v1: {
    suffix: 'fresh amounts (generated)',
    seedLabel: 'fresh amounts',
    intent: 'Same pattern, different numbers so you reproduce the reasoning.',
    statement:
      'Generated drill, same combination-counting task: return the number of combinations that make up amount with unlimited coins (order never matters). ' +
      'These fresh inputs use 2 to 3 denominations between 1 and 6 with amounts between 4 and 8. ' +
      'The signature and exact comparison are unchanged.',
    rows: [
      { amount: 4, coins: [2, 3] },
      { amount: 5, coins: [1, 4, 5] },
      { amount: 6, coins: [1, 3] },
      { amount: 7, coins: [1, 2, 6] },
    ],
    hints: [
      'Seed dp[0]=1 (empty selection), then run coins outside and amounts inside.',
      'Each coin row adds dp[a-c] into dp[a]; never loop amounts outside coins.',
    ],
  },
  v2: {
    suffix: 'edge cases (generated)',
    seedLabel: 'edge cases',
    intent: 'Same pattern with the edge case the original hides.',
    statement:
      'Generated drill, same combination-counting task: return 0 when no combination exists and 1 when amount is 0 (the empty selection). ' +
      'Inputs include the three original examples plus an empty amount and an unreachable single coin. ' +
      'The signature and exact comparison are unchanged.',
    rows: [
      { amount: 5, coins: [1, 2, 5] },
      { amount: 3, coins: [2] },
      { amount: 10, coins: [10] },
      { amount: 0, coins: [1, 2, 3] },
      { amount: 1, coins: [2] },
    ],
    hints: [
      'Amount 0 always returns 1; seed dp[0]=1 before any coin row runs.',
      'A coin larger than amount contributes nothing; its row is skipped.',
    ],
  },
  v3: {
    suffix: 'adversarial counts (generated)',
    seedLabel: 'same-task adversarial',
    intent: 'Same pattern, different numbers so you reproduce the reasoning.',
    statement:
      'Generated drill, same combination-counting task with adversarial checks: shuffled coin order must not change the answer, and inputs where counting ordered ways would overcount (amount 5 with [1,2,5] has 4 combos, not 9). ' +
      'All sets use the same change method signature and return type. ' +
      'Coin-outer order counts each combo once; amount-outer order counts permutations.',
    rows: [
      { amount: 5, coins: [1, 2, 5] },
      { amount: 4, coins: [1, 2, 3] },
      { amount: 5, coins: [5, 2, 1] },
      { amount: 2, coins: [5, 6] },
    ],
    hints: [
      'Coin-outer order counts each combo once; amount-outer order counts permutations.',
      '[5,2,1] and [1,2,5] give the same answer; verify by fixing coin order.',
    ],
  },
}

function buildOne(id, spec, signature, difficulty, baseTitle) {
  const tests = spec.rows.map(({ amount, coins }) => {
    const ref = ccCountCombos(coins, amount)
    const ind = ccEnumCombos(coins, amount)
    if (ref !== ind) throw new Error('coin-change-ii practice oracle disagreement at amount=' + amount + ' coins=[' + coins + ']')
    return { args: [String(amount), argLiteral(coins)], expected: outLiteral(ref) }
  })
  const first = tests[0]
  return {
    id,
    seedLabel: spec.seedLabel,
    intent: spec.intent,
    difficulty,
    title: baseTitle + ' — ' + spec.suffix + ' (same task)',
    statement: spec.statement,
    signature: cloneSignature(signature),
    examples: [{ input: inputLine(signature, first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: spec.hints.slice(0, 2),
  }
}

// Live-forge-compatible builder: (problem, signature, rng) => 3 variants.
// Fully deterministic (fixed rows, no RNG use); returns [] on an incompatible
// signature or slug (never builds against a wrong contract, never throws).
export function buildCoinChangeIIVariants(problem, signature, rng) {
  void rng
  try {
    if (!problem || problem.slug !== SLUG) return []
    const sig = signature || problem.signature
    if (!sig || sig.name !== 'change' || sig.return !== 'int') return []
    const params = Array.isArray(sig.params) ? sig.params : []
    if (params.length !== 2 || params[0].type !== 'int' || params[1].type !== 'int[]') return []
    const base = String(problem.title || problem.slug || 'Coin Change II')
    const difficulty =
      problem.difficulty === 'Easy' || problem.difficulty === 'Hard' ? problem.difficulty : DIFFICULTY
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
  ruleChange: false,
  oracle: 'ccEnumCombos (memoized recursion over sorted coinIndex/remainder; reference ccCountCombos is the coin-outer DP)',
})
export const ELIGIBLE_ADDITIONS = [SLUG]
export const FORGE_PATTERN = 'dp-1d'
