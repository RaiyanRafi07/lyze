/**
 * trapping-rain-water — portable standalone practice builder (batch13).
 *
 * Produces exactly 3 deterministic variants for slug `trapping-rain-water`
 * (Trapping Rain Water, Hard, trap(int[])->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * trapOracle below (per-index min(prefixMax,suffixMax)-h), an INDEPENDENT
 * implementation of the same operation (not the walkthrough's two-pointer
 * frame emitter).
 *
 * Staged source: .workers/jobs/neetcode150-completion/trapping-rain-water/practice.mjs
 * (statements, hints, rows, oracle); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
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

export const SLUG = 'trapping-rain-water'
export const SIGNATURE = Object.freeze({
  name: 'trap',
  params: Object.freeze([{ name: 'height', type: 'int[]' }]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Hard'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same task, harder shapes so the pointer rule is stressed.'

/**
 * INDEPENDENT reference oracle: per-index min(prefixMax, suffixMax) - h.
 * Never uses the two-pointer convergence, so agreement with the walkthrough
 * adapter is genuine cross-check evidence, not shared-logic echo.
 */
export function trapOracle(height) {
  const n = height.length
  let total = 0
  for (let i = 0; i < n; i += 1) {
    let lmax = height[0]
    for (let k = 1; k <= i; k += 1) if (height[k] > lmax) lmax = height[k]
    let rmax = height[n - 1]
    for (let k = n - 2; k >= i; k -= 1) if (height[k] > rmax) rmax = height[k]
    const bound = lmax < rmax ? lmax : rmax
    if (bound > height[i]) total += bound - height[i]
  }
  return total
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

function buildVariant({ id, seedLabel, intent, title, statement, heightList, hints }) {
  const tests = heightList
    .map((height) => ({ args: [lit(height)], expected: lit(trapOracle(height)) }))
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

export function buildTrappingRainWaterPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh heights',
      intent: INTENT_SAME,
      title: 'Trapping Rain Water — Fresh Heights (same task)',
      statement:
        'You are given an elevation map height where height[i] is a bar of width 1. After raining, water pools in the dips between bars. Return the total units of trapped water. Fresh numbers, same two-pointer rule as the lesson.',
      heightList: [
        [3, 0, 2, 0, 4],
        [0, 2, 0, 4, 0, 3, 0],
        [5, 1, 2, 1, 5],
        [2, 0, 2],
      ],
      hints: [
        'Settle the smaller end first: its water level is already decided by its own side max.',
        'A bar at or above its side max raises the ceiling and traps nothing on this step.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Trapping Rain Water — Edge Cases (same task)',
      statement:
        'Same trapped-water task on the boundary inputs the examples never show: a single bar, a flat roof, a pure descent, and a pure ascent. Each traps nothing — return 0 without crashing.',
      heightList: [
        [0],
        [4, 4, 4, 4],
        [5, 4, 3, 2, 1],
        [1, 2, 3, 4, 5],
      ],
      hints: [
        'With one bar, or bars that never dip, no water can pool — the answer is 0.',
        'A monotonic run keeps raising the side max every step, so no trap step ever fires.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial valleys',
      intent: INTENT_ADVERSARIAL,
      title: 'Trapping Rain Water — Adversarial Valleys (same task)',
      statement:
        'Same trapped-water task, same int output — no twist. These shapes stress the rule instead: alternating full-height walls with empty pits, a wide flat pit, and a rising staircase of valleys. Count every unit exactly as before.',
      heightList: [
        [9, 0, 9, 0, 9, 0, 9],
        [0, 0, 0, 0],
        [3, 0, 0, 0, 3],
        [1, 0, 2, 0, 3, 0, 4],
      ],
      hints: [
        'Alternating walls still settle one side per step — each pit fills to the lower of its two walls.',
        'On the staircase the left max climbs 1, 2, 3 while the right wall at 4 seals every valley.',
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
  oracle: 'trapOracle (per-index min(prefixMax,suffixMax)-h; two-pointer used only in walkthrough)',
})
