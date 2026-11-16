/**
 * hand-of-straights — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `hand-of-straights`
 * (Hand of Straights, Medium, isNStraightHand(int[],int)->boolean, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Seeded RNG (mulberry32 over FNV-1a of the slug); every expected value is
 * computed at build time by isNStraightHandOracle below (ascending sweep
 * tracking open straights with a FIFO queue), an INDEPENDENT implementation
 * of the same operation (not the walkthrough's window-decrement frame emitter).
 * Walkthrough subtracts `need` from each window card; the oracle never does a
 * window write — it counts how many straights are open at each value and closes
 * them exactly groupSize steps later.
 *
 * Staged source: .workers/jobs/neetcode150-completion/hand-of-straights/hand-of-straights.variants.js
 * (statements, hints, oracle) + hand-of-straights.oracle.js; reshaped into the forge
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

export const SLUG = 'hand-of-straights'
export const SIGNATURE = Object.freeze({
  name: 'isNStraightHand',
  params: Object.freeze([
    { name: 'hand', type: 'int[]' },
    { name: 'groupSize', type: 'int' },
  ]),
  return: 'boolean',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same task, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same task with the edge cases the examples hide.'
export const INTENT_ADVERSARIAL = 'Same task and signature; harder numbers that punish start-card mistakes.'

/**
 * INDEPENDENT oracle: open-groups sweep, no window decrement loop.
 * Sweeps distinct values ascending, tracking how many straights are currently
 * open. `started = count - open` new groups begin at each value; a FIFO queue
 * remembers starts so groups that began groupSize steps ago close exactly on
 * time. Any gap with open > 0, or any value with fewer copies than the open
 * demand, is impossible. Different method from the walkthrough (which
 * subtracts `need` from each window card).
 */
export function isNStraightHandOracle(hand, groupSize) {
  if (hand.length % groupSize !== 0) return false
  if (groupSize === 1) return true
  const count = new Map()
  for (const x of hand) count.set(x, (count.get(x) || 0) + 1)
  const keys = [...count.keys()].sort((a, b) => a - b)
  let open = 0
  let queue = []
  let prev = null
  for (const key of keys) {
    if (prev !== null && key !== prev + 1) {
      if (open > 0) return false
      queue = []
      open = 0
    }
    const have = count.get(key) || 0
    if (have < open) return false
    const started = have - open
    queue.push(started)
    open = have
    if (queue.length === groupSize) {
      open -= queue.shift()
    }
    prev = key
  }
  return open === 0
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

function shuffled(rng, list) {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const t = out[i]; out[i] = out[j]; out[j] = t
  }
  return out
}

function literal(hand, groupSize) {
  return [`[${hand.join(',')}]`, String(groupSize)]
}

function makeCase(hand, groupSize) {
  const args = literal(hand, groupSize)
  return { args, expected: String(isNStraightHandOracle(hand, groupSize)) }
}

function validHand(rng, groupSize, groups, base) {
  const cards = []
  for (let g = 0; g < groups; g++) {
    const start = base + randInt(rng, 0, 4) + g * (groupSize + randInt(rng, 0, 1))
    for (let d = 0; d < groupSize; d++) cards.push(start + d)
  }
  return shuffled(rng, cards)
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

export function buildHandOfStraightsVariants() {
  const rng = mulberry32(hashText('hand-of-straights'))

  // v1: fresh seeded numbers (3 valid + 1 broken by removing one card).
  const h1 = validHand(rng, 3, 2, 1)
  const h2 = validHand(rng, 2, 3, 5)
  const h3 = validHand(rng, 4, 2, 10)
  const broken = h3.slice(1) // drop one card -> length not divisible -> false
  const v1tests = [
    makeCase(h1, 3),
    makeCase(h2, 2),
    makeCase(h3, 4),
    makeCase(broken, 4),
  ]
  const v1 = buildVariant({
    id: 'v1',
    seedLabel: 'fresh values',
    intent: INTENT_SAME,
    title: 'Hand of Straights — fresh values (greedy drill)',
    statement:
      'Given hand and groupSize, return true iff the cards can be rearranged into groups of groupSize consecutive values. Fresh inputs below: shuffled hands of 6 to 8 cards with group sizes 2 to 4.',
    cases: v1tests,
    hints: [
      'Sort the distinct values, then always start the next straight at the smallest leftover card.',
      'Each window card must have at least as many copies as the start card; consume them all at once.',
    ],
  })

  // v2: hidden edges the two examples do not cover.
  const v2tests = [
    makeCase([7], 1), // single card, groupSize 1 -> true
    makeCase([1, 2, 3], 2), // length not divisible -> false
    makeCase([1, 1, 2, 2, 3, 3], 3), // duplicate pairs split into two straights -> true
    makeCase([1, 2, 4, 5, 6, 7], 3), // gap after 2 kills the first straight -> false
    makeCase([999999998, 999999999, 1000000000], 3), // constraint-scale values -> true
  ]
  const v2 = buildVariant({
    id: 'v2',
    seedLabel: 'edge cases',
    intent: INTENT_EDGE,
    title: 'Hand of Straights — edge cases (greedy drill)',
    statement:
      'Given hand and groupSize, return true iff the cards can be rearranged into groups of groupSize consecutive values. Boundary inputs: groupSize 1, an uneven split, duplicate pairs, a gap inside the first window, and constraint-scale values.',
    cases: v2tests,
    hints: [
      'groupSize 1 is always true; an uneven total is always false — check that first.',
      'Duplicates are fine only when every window card matches the start-card multiplicity.',
    ],
  })

  // Same-task adversarial set: duplicate-heavy windows, near-miss
  // multiplicities, unsorted hands, all-gap failures. Same signature,
  // same question — no twist.
  const v3tests = [
    makeCase([1, 2, 3, 3, 4, 5, 6, 7, 8], 3), // extra 3 forces a second straight that still works -> true
    makeCase([1, 2, 3, 4, 4, 5, 6, 7], 4), // duplicate 4 with k=4: windows [1..4],[4..7] -> true, near-miss shape
    makeCase([1, 2, 2, 3, 4, 5, 5, 6], 4), // duplicate 2s and 5s but only one 3/4: second straight starves -> false
    makeCase([5, 4, 3, 2, 1, 6, 7, 8], 4), // reverse-sorted valid hand -> true
    makeCase([1, 3, 5, 7, 9, 11], 2), // all gaps, no consecutive pair -> false
  ]
  const v3 = buildVariant({
    id: 'v3',
    seedLabel: 'same-task adversarial',
    intent: INTENT_ADVERSARIAL,
    title: 'Hand of Straights — adversarial numbers (same task) (greedy drill)',
    statement:
      'Given hand and groupSize, return true iff the cards can be rearranged into groups of groupSize consecutive values. Adversarial same-task inputs: duplicate-heavy windows, near-miss multiplicities, unsorted hands, and all-gap failures. The rules and signature are unchanged.',
    cases: v3tests,
    hints: [
      'Never pick the largest or a middle card as the start; only the smallest leftover is safe.',
      'Count copies, not just presence: one short window card fails the whole hand.',
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
  oracle: 'isNStraightHandOracle (open-groups FIFO sweep; walkthrough uses window-decrement emitter)',
})
