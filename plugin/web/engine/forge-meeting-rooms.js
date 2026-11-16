/**
 * meeting-rooms — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `meeting-rooms`
 * (Meeting Rooms, Easy, canAttendMeetings(int[][])->boolean, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * oracleBrute below (pairwise O(n^2) overlap check, no sorting), an
 * INDEPENDENT implementation of the same operation (not the walkthrough's
 * sort+sweep frame emitter). Walkthrough sorts by start then sweeps with
 * prevEnd; the oracle compares every pair with max(starts) < min(ends).
 *
 * Staged source: .workers/jobs/neetcode150-completion/meeting-rooms/meeting-rooms-practice.mjs
 * (statements, hints, oracle) + meeting-rooms.mjs (profile); reshaped into the
 * forge variant contract (id/seedLabel/intent/difficulty/title/statement/
 * signature/examples/tests/mode/hints). Expected literals re-verified against
 * the oracle at build time. All three sets are the SAME task (no twist):
 * identical signature, identical question — v2 covers edges, v3 is
 * adversarial same-task placements only.
 *
 * TEST PROFILE (documented; no live judge record exists, judge:null): the
 * NeetCode interface uses Interval objects; the single-function test profile
 * below flattens rows to int[][] for executability:
 *   canAttendMeetings(intervals:int[][]) -> boolean
 * Every walkthrough frame, practice test, and expected value uses this
 * profile. Never presented as official.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the documented TEST PROFILE, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (mode 'exact').
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'meeting-rooms'
export const SIGNATURE = Object.freeze({
  name: 'canAttendMeetings',
  params: Object.freeze([{ name: 'intervals', type: 'int[][]' }]),
  return: 'boolean',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Easy'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same question with adversarial placements that punish sort-skipping shortcuts.'

/**
 * INDEPENDENT oracle: brute-force pairwise O(n^2) overlap check, no sorting.
 * Returns true iff no two meetings strictly overlap (touching is fine).
 * Different method from the walkthrough (sort by start + single prevEnd sweep).
 */
export function oracleBrute(matrix) {
  if (!Array.isArray(matrix)) throw new Error('oracle expects a matrix')
  for (let i = 0; i < matrix.length; i += 1) {
    for (let j = i + 1; j < matrix.length; j += 1) {
      if (Math.max(matrix[i][0], matrix[j][0]) < Math.min(matrix[i][1], matrix[j][1])) return false
    }
  }
  return true
}

export function parseMatrixLiteral(raw) {
  const v = JSON.parse(String(raw))
  if (!Array.isArray(v)) throw new Error('not a matrix literal: ' + raw)
  return v
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

function buildVariant({ id, seedLabel, intent, titleSuffix, statement, tests, hints }) {
  const signature = cloneSignature(SIGNATURE)
  const norm = tests.map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
  const first = norm[0]
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title: 'Meeting Rooms — ' + titleSuffix + ' (attendance drill)',
    statement,
    signature,
    examples: [{ input: inputLine(signature, first.args), output: first.expected, explain: '' }],
    tests: norm,
    mode: MODE,
    hints: hints.slice(0, 2),
  }
}

function toTest(literal) {
  const m = parseMatrixLiteral(literal)
  return { args: [literal], expected: String(oracleBrute(m)) }
}

function buildAll() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh values',
      intent: INTENT_SAME,
      titleSuffix: 'fresh values',
      statement: 'Given meeting intervals as [[start,end],...] in arbitrary order, return true if one person can attend every meeting and false otherwise. A meeting ending at time t frees the person for a meeting starting at t. Sourced constraints: 0..500 intervals, 0 <= start < end <= 1000000.',
      tests: [
        toTest('[[0,30],[5,10],[15,20]]'),
        toTest('[[7,10],[2,4]]'),
        toTest('[[1,5],[2,6],[8,10]]'),
        toTest('[[13,15],[1,4],[6,9]]'),
      ],
      hints: [
        'Sort a copy by start, then compare each start with the running prevEnd.',
        'Unsorted input hides the conflict: [[7,10],[2,4]] is disjoint only after sorting.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      titleSuffix: 'edge cases',
      statement: 'Same attendance question with the boundary inputs. Given [[start,end],...], return true if one person can attend all meetings. Empty and single-meeting schedules always fit; touching endpoints such as [1,4],[4,5] also fit.',
      tests: [
        toTest('[[5,8],[9,15]]'),
        toTest('[]'),
        toTest('[[4,9]]'),
        toTest('[[1,4],[4,5]]'),
      ],
      hints: [
        'Zero or one meeting can never conflict — guard that before seeding prevEnd.',
        'Touching endpoints use strict less-than: [1,4],[4,5] has 4 < 4 false, so it fits.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial shapes',
      intent: INTENT_ADVERSARIAL,
      titleSuffix: 'adversarial shapes, same task',
      statement: 'SAME-TASK adversarial drill (no rule change): given [[start,end],...], return true iff one person can attend every meeting. Nested meetings, duplicate rows, touching chains, and max-coordinate bounds punish solutions that skip the sort or use <= instead of <.',
      tests: [
        toTest('[[1,10],[2,3]]'),
        toTest('[[2,4],[2,4]]'),
        toTest('[[5,7],[1,3],[3,5]]'),
        toTest('[[0,999999],[999999,1000000]]'),
      ],
      hints: [
        'Nesting still conflicts: [2,3] starts at 2 < prevEnd 10 even though it ends early.',
        'Duplicate rows always overlap themselves; touching chains need the max prevEnd update.',
      ],
    }),
  ]
}

// Registry-style entry mirroring variants.js BUILDERS conventions:
// slug-gated and shape-gated on the documented TEST PROFILE, returns exactly
// three variants or null. Never throws.
export function buildMeetingRoomsDrills(problem, signature) {
  try {
    if (!problem || problem.slug !== 'meeting-rooms') return null
    const sig = signature || SIGNATURE
    if (!sig || sig.name !== 'canAttendMeetings') return null
    if (!Array.isArray(sig.params) || sig.params.length !== 1) return null
    const t = sig.params[0] && sig.params[0].type
    if (t !== 'int[][]') return null
    if (sig.return !== 'boolean') return null
    return buildAll()
  } catch {
    return null
  }
}

export function buildMeetingRoomsVariants() {
  return buildAll()
}

export const VARIANTS = buildMeetingRoomsVariants()

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oracleBrute (pairwise O(n^2) overlap check with no sorting; walkthrough runs sort-by-start + prevEnd sweep)',
})
