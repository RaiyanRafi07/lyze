/**
 * meeting-rooms-ii — portable standalone practice builder.
 *
 * Produces exactly 3 deterministic variants for slug `meeting-rooms-ii`
 * (Meeting Rooms II, Medium, minMeetingRooms(int[][])->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Seeded RNG (mulberry32 over FNV-1a of the slug) for the fresh set; every
 * expected value is computed at build time by oracleMinRooms below (max
 * overlap counted at each distinct start — an INDEPENDENT O(n^2) algorithm
 * from the walkthrough's sorted starts/ends two-pointer sweep).
 * Walkthrough sweeps two sorted arrays with s/e pointers; the oracle counts
 * covering intervals per start with no sorting and no pointers.
 *
 * Honest TEST PROFILE (live shard record carries judge:null — LeetCode 253
 * is premium): minMeetingRooms(intervals) -> int, intervals as int[][]
 * literal. Precedents: mergeKLists(int[][])->int[],
 * runTrieOps(string[],string[])->string.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the honest test profile, so the same editor code compiles.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (mode 'exact').
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'meeting-rooms-ii'
export const SIGNATURE = Object.freeze({
  name: 'minMeetingRooms',
  params: Object.freeze([
    { name: 'intervals', type: 'int[][]' },
  ]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same task, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same task with the edge cases the examples hide.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial numbers: touching endpoints punish a flipped comparison.'

/**
 * INDEPENDENT oracle: max overlap counted at each distinct start.
 * No sorted starts/ends arrays, no s/e sweep pointers — deliberately a
 * different method from the walkthrough two-pointer sweep. O(n^2).
 */
export function oracleMinRooms(intervals) {
  const n = intervals.length
  if (n === 0) return 0
  let best = 0
  for (const iv of intervals) {
    const t = iv[0]
    let c = 0
    for (const o of intervals) {
      if (o[0] <= t && t < o[1]) c += 1
    }
    if (c > best) best = c
  }
  return best
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

function makeCase(intervals) {
  const args = [JSON.stringify(intervals.map((iv) => [iv[0], iv[1]]))]
  return { args, expected: String(oracleMinRooms(intervals)) }
}

function freshCase(rng) {
  const n = randInt(rng, 3, 5)
  const out = []
  for (let k = 0; k < n; k += 1) {
    const s = randInt(rng, 0, 30)
    const e = s + randInt(rng, 1, 20)
    out.push([s, e])
  }
  return makeCase(out)
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

export function buildMeetingRoomsIiVariants() {
  const rng = mulberry32(hashText('meeting-rooms-ii'))

  const v1tests = [freshCase(rng), freshCase(rng), freshCase(rng), freshCase(rng)]
  const v1 = buildVariant({
    id: 'v1',
    seedLabel: 'fresh overlaps',
    intent: INTENT_SAME,
    title: 'Meeting Rooms II — fresh overlaps (sweep drill)',
    statement:
      'Given intervals as [start,end] pairs, return the fewest rooms so all meetings fit. A room ending at time t is free for a meeting starting at t. Fresh inputs below: 3 to 5 meetings with starts between 0 and 30; recompute the peak overlap from scratch.',
    cases: v1tests,
    hints: [
      'Sort the starts and the ends separately; ends[e] is the earliest room that frees up.',
      'starts[s] < ends[e] needs a new room; otherwise (>=) reuse the freed one.',
    ],
  })

  const v2tests = [
    makeCase([[0, 40], [5, 10], [15, 20]]),
    makeCase([[4, 9]]),
    makeCase([]),
    makeCase([[0, 5], [5, 10], [10, 15]]),
    makeCase([[0, 10], [2, 5], [3, 8]]),
  ]
  const v2 = buildVariant({
    id: 'v2',
    seedLabel: 'edge cases',
    intent: INTENT_EDGE,
    title: 'Meeting Rooms II — edge cases (sweep drill)',
    statement:
      'Given intervals as [start,end] pairs, return the fewest rooms so all meetings fit. A room ending at time t is free for a meeting starting at t. Boundary inputs: the two sourced examples first, then empty input, a touching chain that reuses one room, and a nested triple that stacks three rooms.',
    cases: v2tests,
    hints: [
      'Empty input needs 0 rooms — handle it before the sorts.',
      'A chain that only touches reuses one room; nesting stacks rooms.',
    ],
  })

  const v3tests = [
    makeCase([[1, 5], [2, 6], [3, 7], [4, 8]]),
    makeCase([[1, 4], [1, 2], [1, 3]]),
    makeCase([[0, 3], [2, 5], [4, 7], [6, 9]]),
    makeCase([[0, 1000000], [500000, 600000]]),
  ]
  const v3 = buildVariant({
    id: 'v3',
    seedLabel: 'adversarial endpoints',
    intent: INTENT_ADVERSARIAL,
    title: 'Meeting Rooms II — adversarial endpoints (same task)',
    statement:
      'Given intervals as [start,end] pairs, return the fewest rooms so all meetings fit. A room ending at time t is free for a meeting starting at t. Adversarial inputs: full overlap, equal starts that all collide, a staggered chain hovering at two rooms, and constraint-scale bounds. Identical signature and question — only the numbers fight back.',
    cases: v3tests,
    hints: [
      'All-overlapping inputs force one room per meeting; staggered chains hover at 2.',
      'Equal starts all collide at once; touching start/end pairs share a room.',
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
  oracle: 'oracleMinRooms (max overlap counted at each distinct start, O(n^2); walkthrough uses sorted starts/ends two-pointer sweep)',
})
