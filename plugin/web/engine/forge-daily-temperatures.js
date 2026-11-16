/**
 * daily-temperatures — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `daily-temperatures`
 * (Daily Temperatures, Medium, dailyTemperatures(int[])->int[], mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * dailyTemperaturesOracle below (brute-force next-warmer scan, O(n^2)), an
 * INDEPENDENT implementation of the same operation (not the walkthrough's
 * monotonic-stack frame emitter).
 *
 * Staged source: .workers/jobs/neetcode150-completion/daily-temperatures/practice.daily-temperatures.js
 * (statements, hints, rows, oracle); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time. All three
 * sets are the SAME task (no twist): identical signature, identical question —
 * v3 is adversarial same-task shapes only (plateaus, spikes, late hot day).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (exact integer-array match for this slug).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'daily-temperatures'
export const SIGNATURE = Object.freeze({
  name: 'dailyTemperatures',
  params: Object.freeze([{ name: 'temperatures', type: 'int[]' }]),
  return: 'int[]',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same question on plateau and spike shapes that punish equality mistakes.'

/**
 * INDEPENDENT reference oracle: brute-force next-warmer scan, O(n^2).
 * Never uses the monotonic stack; for each day scans forward for the first
 * strictly warmer temperature. Different method from the walkthrough emitter.
 */
export function dailyTemperaturesOracle(temps) {
  const n = temps.length
  const ans = new Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (temps[j] > temps[i]) { ans[i] = j - i; break }
    }
  }
  return ans
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

function toTests(rows) {
  return rows
    .map((temps) => ({ args: [lit(temps)], expected: lit(dailyTemperaturesOracle(temps)) }))
    .slice(0, 5)
    .map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
}

function buildVariant({ id, seedLabel, intent, title, statement, rows, hints }) {
  const tests = toTests(rows)
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

export function buildDailyTemperaturesVariants() {
  const v1 = buildVariant({
    id: 'v1',
    seedLabel: 'fresh values',
    intent: INTENT_SAME,
    title: 'Daily Temperatures — fresh values (same task)',
    statement:
      'Given temperatures, return answer where answer[i] is the days to wait for a strictly warmer day, or 0 when none exists. Fresh seeded inputs use 5 to 9 days with values from 30 to 100. The signature and exact comparison are unchanged.',
    rows: [
      [62, 41, 88, 55, 70, 36, 91, 48],
      [54, 76, 52, 44, 52, 57],
      [42, 31, 84, 81, 85, 36, 38, 36, 95],
      [80, 77, 73, 44, 71],
    ],
    hints: [
      'Stack indices of days still waiting; resolve them when a warmer day arrives.',
      'Only a strictly greater temperature pops; equal days stay on the stack.',
    ],
  })

  const v2 = buildVariant({
    id: 'v2',
    seedLabel: 'edge cases',
    intent: INTENT_EDGE,
    title: 'Daily Temperatures — edge cases (same task)',
    statement:
      'Solve the same next-warmer-day task on the boundary inputs the examples hide. A single day, all-equal days, a strictly falling run, and a strictly rising run are included. No rule change: equal neighbours never resolve each other and leftovers keep 0.',
    rows: [
      [73],
      [70, 70, 70],
      [90, 80, 70, 60],
      [30, 40, 50, 60],
    ],
    hints: [
      'One day can never see a warmer day, so the answer is [0].',
      'A falling run leaves every answer at 0; a rising run leaves all but the last at 1.',
    ],
  })

  // SAME-TASK adversarial shapes (no rule change): plateaus where equals must
  // NOT pop, alternating spikes, and one late hot day that settles many waiters.
  const v3 = buildVariant({
    id: 'v3',
    seedLabel: 'same-task adversarial',
    intent: INTENT_ADVERSARIAL,
    title: 'Daily Temperatures — adversarial shapes (same task)',
    statement:
      'SAME-TASK drill with no rule change: plateaus where equal neighbours must not resolve each other, alternating spikes, and one late hot day that settles many waiters at once. The signature and exact comparison are unchanged, so each answer is still the index distance i - j.',
    rows: [
      [55, 55, 55, 60, 55, 55, 65],
      [100, 30, 100, 30, 100],
      [45, 60, 60, 60, 44, 61],
      [71, 69, 72, 69, 76, 73],
    ],
    hints: [
      'Trace [55,55,55,60]: the equal 55s resolve only when 60 arrives, with distances 3, 2, 1.',
      'A late spike resolves the whole stack in one cascade; each answer is still i - j.',
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
  oracle: 'dailyTemperaturesOracle (brute-force O(n^2) next-warmer scan; walkthrough uses monotonic index stack)',
})
