/**
 * car-fleet — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `car-fleet`
 * (Car Fleet, Medium, carFleet(int,int[],int[])->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Seeded RNG (mulberry32 over FNV-1a of the slug); every expected value is
 * computed at build time by carFleetOracle below (exact BigInt rational
 * arithmetic with cross-multiplied merge compares), an INDEPENDENT
 * implementation of the same operation (not the walkthrough's float-division
 * frame emitter). Walkthrough uses double division + scalar maxTime; the
 * oracle keeps each slowest fleet time as an exact fraction and never divides.
 *
 * Staged source: .workers/jobs/question-owners-150/car-fleet/car-fleet.variants.js
 * (statements, hints, oracle) + car-fleet.oracle.js; reshaped into the forge
 * variant contract (id/seedLabel/intent/difficulty/title/statement/signature/
 * examples/tests/mode/hints). Expected literals re-verified against the oracle
 * at build time. All three sets are the SAME task (no twist): identical
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

export const SLUG = 'car-fleet'
export const SIGNATURE = Object.freeze({
  name: 'carFleet',
  params: Object.freeze([
    { name: 'target', type: 'int' },
    { name: 'position', type: 'int[]' },
    { name: 'speed', type: 'int[]' },
  ]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same task, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same task with the edge cases the examples hide.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial numbers: near-ties punish rounded or flipped comparisons.'

/**
 * INDEPENDENT oracle: exact rational arithmetic (BigInt), no floats.
 * Keeps each slowest fleet time as num/den and decides merges by
 * cross-multiplication: behind car joins iff dist*den <= num*spd.
 * Different method from the walkthrough (double division + scalar maxTime).
 */
export function carFleetOracle(target, position, speed) {
  const n = position.length
  const order = position.map((_, k) => k).sort((a, b) => position[a] - position[b])
  let fleets = 0
  let num = 0n // slowest fleet time numerator
  let den = 1n // slowest fleet time denominator
  const T = BigInt(target)
  for (let s = n - 1; s >= 0; s--) {
    const k = order[s]
    const dist = T - BigInt(position[k])
    const spd = BigInt(speed[k])
    // joins iff dist/spd <= num/den  <=>  dist*den <= num*spd
    if (fleets > 0 && dist * den <= num * spd) continue
    fleets += 1
    num = dist
    den = spd
  }
  return fleets
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

function distinctPositions(rng, count, target) {
  const seen = new Set()
  while (seen.size < count) seen.add(randInt(rng, 0, target - 1))
  return [...seen]
}

function literal(target, position, speed) {
  return [String(target), `[${position.join(',')}]`, `[${speed.join(',')}]`]
}

function makeCase(target, position, speed) {
  const args = literal(target, position, speed)
  return { args, expected: String(carFleetOracle(target, position, speed)) }
}

function freshCase(rng) {
  const target = randInt(rng, 12, 60)
  const n = randInt(rng, 3, 6)
  const position = distinctPositions(rng, n, target)
  const speed = Array.from({ length: n }, () => randInt(rng, 1, 9))
  return makeCase(target, position, speed)
}

function inputLine(args) {
  return SIGNATURE.params.map((p, i) => `${p.name} = ${args[i]}`).join(', ')
}

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  }
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

export function buildCarFleetVariants() {
  const rng = mulberry32(hashText('car-fleet'))

  const v1tests = [freshCase(rng), freshCase(rng), freshCase(rng), freshCase(rng)]
  const v1 = buildVariant({
    id: 'v1',
    seedLabel: 'fresh values',
    intent: INTENT_SAME,
    title: 'Car Fleet — fresh values (monotonic-stack drill)',
    statement:
      'Given target, position and speed, return the number of car fleets that arrive at the destination. A faster car catches up to a fleet ahead and merges; a car that catches a fleet exactly at target still counts as merged. Fresh inputs below: 3 to 6 cars, targets between 12 and 60, speeds between 1 and 9.',
    cases: v1tests,
    hints: [
      'Sort by position, then scan from the car closest to target backwards.',
      'Keep the slowest arrival time seen; a car slower than it starts a new fleet.',
    ],
  })

  const v2tests = [
    makeCase(10, [3], [3]), // single car -> 1
    makeCase(10, [6, 8], [2, 1]), // exact tie at target: (10-6)/2 = (10-8)/1 = 2 -> 1 fleet
    makeCase(20, [0, 5, 10, 15], [4, 4, 4, 4]), // equal speeds, never meet -> 4 fleets
    makeCase(100, [0, 2, 4], [4, 2, 1]), // canonical full merge -> 1
    makeCase(1000000, [0, 999999], [1, 1]), // constraint scale, far apart same speed -> 2
  ]
  const v2 = buildVariant({
    id: 'v2',
    seedLabel: 'edge cases',
    intent: INTENT_EDGE,
    title: 'Car Fleet — edge cases (monotonic-stack drill)',
    statement:
      'Given target, position and speed, return the number of car fleets that arrive at the destination. A faster car catches up to a fleet ahead and merges; a car that catches a fleet exactly at target still counts as merged. Boundary inputs: one car alone, an exact tie at the target mile, equal speeds that never meet, a full merge, and constraint-scale values.',
    cases: v2tests,
    hints: [
      'Equal arrival times merge: the test is time > slowest, strictly, for a new fleet.',
      'Equal speeds preserve every gap, so each car stays its own fleet.',
    ],
  })

  // Same-task adversarial set: near-ties that must NOT merge, alternating
  // speeds, and large magnitudes. Same signature, same question — no twist.
  const v3tests = [
    makeCase(12, [0, 6], [3, 2]), // times 4 vs 3: behind car slower -> 2 fleets (near-miss)
    makeCase(12, [0, 6], [4, 2]), // times 3 vs 3: exact tie -> 1 fleet
    makeCase(50, [10, 20, 30, 40], [5, 1, 5, 1]), // alternating: check each merge honestly
    makeCase(1000000, [0, 500000, 999998], [1000000, 1, 2]), // huge spread, fast chaser merges
    freshCase(rng),
  ]
  const v3 = buildVariant({
    id: 'v3',
    seedLabel: 'adversarial near-ties',
    intent: INTENT_ADVERSARIAL,
    title: 'Car Fleet — adversarial near-ties (same task) (monotonic-stack drill)',
    statement:
      'Given target, position and speed, return the number of car fleets that arrive at the destination. A faster car catches up to a fleet ahead and merges; a car that catches a fleet exactly at target still counts as merged. Adversarial inputs: arrival times that differ by a hair, alternating fast/slow lines, and near-target positions at constraint scale. Identical signature and question — only the numbers fight back.',
    cases: v3tests,
    hints: [
      'A near-tie still merges only when behind-time <= slowest-ahead-time; recompute, never eyeball.',
      'Positions next to the target leave almost no distance, so slow speeds there still arrive late.',
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
  oracle: 'carFleetOracle (exact BigInt rational cross-multiplication; walkthrough uses float division + scalar maxTime)',
})
