/**
 * last-stone-weight — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `last-stone-weight`
 * (Last Stone Weight, Easy, lastStoneWeight(int[])->int, mode exact).
 * Every expected value is computed at build time by lastStoneWeightOracle
 * below (sort-descending simulation), an INDEPENDENT implementation of the
 * same operation (not the walkthrough's binary max-heap smash).
 *
 * Staged source: .workers/jobs/question-owners-150/last-stone-weight/practice.js
 * (seeded rows, statements, hints, sort-based oracle); reshaped into the forge
 * variant contract (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'last-stone-weight'
export const SIGNATURE = Object.freeze({
  name: 'lastStoneWeight',
  params: Object.freeze([{ name: 'stones', type: 'int[]' }]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Easy'

export const INTENT_SAME = 'Same smash rule, different weights so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same rule with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same rule, hostile inputs: the drill tests whether the idea transfers.'

/**
 * INDEPENDENT oracle: sort-descending simulation, NOT a heap. Each round sorts
 * a copy descending, removes the two heaviest, and pushes back y - x when the
 * weights differ. Must agree with the heap walkthrough on every input.
 */
export function lastStoneWeightOracle(stones) {
  const pile = stones.slice()
  while (pile.length > 1) {
    pile.sort((a, b) => b - a)
    const y = pile.shift()
    const x = pile.shift()
    if (x !== y) pile.push(y - x)
  }
  return pile.length === 0 ? 0 : pile[0]
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

function outLiteral(value) {
  if (Array.isArray(value)) return '[' + value.map(outLiteral).join(',') + ']'
  return String(value)
}

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

function buildVariant({ id, seedLabel, intent, title, statement, stonesList, hints }) {
  const tests = stonesList
    .map((stones) => ({ args: [outLiteral(stones)], expected: String(lastStoneWeightOracle(stones)) }))
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

export function buildLastStoneWeightPractice() {
  const rng = mulberry32(hashText(SLUG))
  const randInt = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1))
  const freshRow = () => {
    const n = randInt(2, 7)
    return Array.from({ length: n }, () => randInt(1, 9))
  }
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh weights',
      intent: INTENT_SAME,
      title: 'Last Stone Weight — Fresh Weights (same task)',
      statement:
        'Given an integer array stones, repeatedly smash the two heaviest stones: equal weights both vanish, otherwise the difference y - x survives. Return the last stone weight, or 0 when none remain. Fresh inputs hold 2 to 7 weights in [1, 9]. The signature and exact comparison are unchanged.',
      stonesList: [freshRow(), freshRow(), freshRow(), freshRow()],
      hints: [
        'Always take the two heaviest remaining; a max-heap surfaces both.',
        'When x equals y, push nothing back — both stones are destroyed.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Last Stone Weight — Edge Cases (same task)',
      statement:
        'Same smash rule and same return contract. Edge inputs include a single stone (returned as-is), an equal pair (both vanish, answer 0), an odd triple, and a long equal run. No rule change.',
      stonesList: [[1], [2, 2], [1, 1, 1], [5, 5, 5, 5]],
      hints: [
        'One stone means no smash happens; return that stone.',
        'An empty heap returns 0, never null or an error.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial drill',
      intent: INTENT_ADVERSARIAL,
      title: 'Last Stone Weight — Adversarial Drill (transfer)',
      statement:
        'SAME TASK, hostile inputs: chained differences across many rounds so a "subtract the smallest" shortcut fails, with equal-pair traps hidden mid-run. A surviving difference re-enters the pile and may smash again. No rule change: the signature and exact comparison are unchanged.',
      stonesList: [[3, 7, 2], [10, 4, 4, 8], [9, 3, 2, 10], [6, 6, 4, 4, 2]],
      hints: [
        'A surviving difference re-enters the pile and may smash again.',
        'Re-sort (or re-heapify) every round: the heaviest pair changes each time.',
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
  oracle: 'lastStoneWeightOracle (sort-descending simulation; binary max-heap smash used only in walkthrough)',
})
