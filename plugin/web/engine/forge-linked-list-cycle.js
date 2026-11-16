// Deterministic practice forge for linked-list-cycle (generated exercises).
// Real judge profile is hasCycle(ListNode head) -> boolean (mode exact);
// the judge wires pos internally, so a ListNode cannot be spelled as a judge
// literal. This harness therefore uses an explicit two-literal practice
// profile head:int[] + pos:int (clearly labeled generated extension) so the
// cycle wiring is testable. Expected outputs come only from the independent
// oracles below, never hand-written. Seeded from the slug: same 3 variants
// every run, no Math.random, no Date.

export const SLUG = 'linked-list-cycle'

// Generated practice profile (extension): head array + pos wiring index.
// Real signature preserved separately in the lesson adapter
// (hasCycle, params ['ListNode'], return 'boolean').
export const SIGNATURE = {
  name: 'hasCycle',
  params: [
    { name: 'head', type: 'int[]' },
    { name: 'pos', type: 'int' }
  ],
  return: 'boolean'
}

export const MODE = 'exact'

// ---- independent oracles (separate logic paths) ----
// Reference path: Floyd two-pointer walk on the successor table.
export function floydOracle(values, pos) {
  const n = values.length
  if (n === 0) return false
  const next = values.map((_, i) => (i + 1 < n ? i + 1 : (pos >= 0 ? pos : -1)))
  let slow = 0
  let fast = 0
  for (let i = 0; i < 4 * n + 5; i++) {
    if (fast === -1 || next[fast] === -1) return false
    slow = next[slow]
    fast = next[next[fast]]
    if (fast === -1 || slow === -1) return false
    if (slow === fast) return true
  }
  return false
}

// Independent path: single-pointer walk with a visited-identity set.
export function visitedOracle(values, pos) {
  const n = values.length
  if (n === 0) return false
  if (pos !== -1 && (!Number.isSafeInteger(pos) || pos < 0 || pos >= n)) {
    throw new Error('pos out of range for oracle')
  }
  const seen = new Set()
  let id = 0
  for (let i = 0; i <= n; i++) {
    if (id === -1 || id === null) return false
    if (seen.has(id)) return true
    seen.add(id)
    id = id + 1 < n ? id + 1 : (pos >= 0 ? pos : -1)
  }
  return pos >= 0
}

function hashText(text) {
  let h = 2166136261 >>> 0
  const s = String(text)
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0
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

function argLiteral(value) {
  if (Array.isArray(value)) return '[' + value.join(',') + ']'
  return String(value)
}

function outLiteral(bool) {
  return bool ? 'true' : 'false'
}

function inputLine(args) {
  return 'head = ' + args[0] + ', pos = ' + args[1]
}

function checkPair(values, pos) {
  const a = floydOracle(values, pos)
  const b = visitedOracle(values, pos)
  if (a !== b) throw new Error('oracle disagreement on ' + JSON.stringify(values) + ' pos=' + pos)
  if (a !== (pos !== -1)) throw new Error('oracle contradicts wiring on ' + JSON.stringify(values) + ' pos=' + pos)
  return a
}

function toTest(values, pos) {
  const expected = checkPair(values, pos)
  return { args: [argLiteral(values), String(pos)], expected: outLiteral(expected) }
}

function distinctFromRaw(values, pos) {
  const raw = new Set(['[3,2,0,-4]|1', '[1,2]|0', '[1]|-1'])
  return !raw.has(argLiteral(values) + '|' + pos)
}

function buildVariant({ id, seedLabel, intent, title, statement, tests, hints }) {
  const first = tests[0]
  return {
    id,
    seedLabel,
    intent,
    difficulty: 'Easy',
    title,
    statement,
    signature: JSON.parse(JSON.stringify(SIGNATURE)),
    examples: [{ input: inputLine(first.args), output: first.expected, explain: '' }],
    tests: tests.map(t => ({ args: t.args.map(String), expected: String(t.expected) })),
    mode: MODE,
    hints: hints.slice(0, 2)
  }
}

// Live-forge-compatible entry point: returns exactly 3 variants.
export function buildPracticeVariants() {
  const rng = mulberry32(hashText(SLUG))

  // v1 — same question, fresh wiring (deterministic generated, none equals a raw example).
  const v1rows = []
  let guard = 0
  while (v1rows.length < 4 && guard++ < 300) {
    const n = 2 + Math.floor(rng() * 5) // 2..6
    const pool = []
    for (let v = -9; v <= 9; v++) pool.push(v)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      const t = pool[i]; pool[i] = pool[j]; pool[j] = t
    }
    const values = pool.slice(0, n)
    const wantCycle = rng() < 0.6
    const pos = wantCycle ? Math.floor(rng() * n) : -1
    if (!distinctFromRaw(values, pos)) continue
    const key = argLiteral(values) + '|' + pos
    if (v1rows.some(r => r.args[0] + '|' + r.args[1] === key)) continue
    v1rows.push(toTest(values, pos))
  }
  // Deterministic fallback (verified by oracles at build time).
  while (v1rows.length < 4) v1rows.push(toTest([4 - v1rows.length, 7, -2], v1rows.length % 2 ? -1 : 1))

  // v2 — edge cases: empty, singletons, self-loop, short acyclic (fixed literals).
  const v2rows = [
    toTest([], -1),
    toTest([1], -1),
    toTest([1], 0),
    toTest([1, 2], -1)
  ]

  // v3 — transfer/adversarial, same output type: duplicate values with and
  // without a cycle (values never decide), long tail into an early entry,
  // tail self-loop. Punishes value-equality and head-only checks.
  const v3rows = [
    toTest([7, 7, 7, 7], 2),
    toTest([7, 7, 7, 7], -1),
    toTest([5, 4, 3, 2, 1, 0, -1, -2, -3, -4], 1),
    toTest([9, 8, 7], 2)
  ]

  return [
    buildVariant({
      id: 'v1', seedLabel: 'fresh wiring', intent: 'Same question with fresh lists so you reproduce the runner reasoning.',
      title: 'Linked List Cycle — fresh wiring (same-task drill, generated)',
      statement: 'Given head, the head of a linked list of the given values where the tail links to index pos (pos = -1 means the tail links to null), return true if there is a cycle, else false. Generated drill: same rule as the original, fresh values and wiring. Solve with O(1) memory.',
      tests: v1rows,
      hints: [
        'Start slow and fast at head; stride +1/+2 only while fast and fast.next are non-null.',
        'Compare node identities after each stride; equal values at different nodes are not a meeting.'
      ]
    }),
    buildVariant({
      id: 'v2', seedLabel: 'edge cases', intent: 'Boundary wirings the original examples only partly cover.',
      title: 'Linked List Cycle — edge cases (same-task drill, generated)',
      statement: 'Same cycle rule on boundary wirings: an empty list, a lone node with and without a self-loop, and a short acyclic pair. Generated drill: return true only when the tail wiring actually loops back. Solve with O(1) memory.',
      tests: v2rows,
      hints: [
        'Empty head returns false with no strides; a lone node cycles only when pos = 0.',
        'The loop guard must fail immediately for acyclic tails so fast never steps past null.'
      ]
    }),
    buildVariant({
      id: 'v3', seedLabel: 'adversarial wiring', intent: 'Wirings that punish value-equality and head-only checks.',
      title: 'Linked List Cycle — adversarial wiring (same-task drill, generated)',
      statement: 'Same cycle rule with adversarial wiring and no rule change: all-equal values with and without a loop, a 10-node tail feeding an early entry, and a tail self-loop. Generated drill: only the links decide, never the values. Solve with O(1) memory.',
      tests: v3rows,
      hints: [
        'All-equal values still need identity comparison: the acyclic twin must return false.',
        'A late meeting after a long tail is still a cycle; keep striding until the guard fails or identities match.'
      ]
    })
  ]
}

export const practice = buildPracticeVariants()
