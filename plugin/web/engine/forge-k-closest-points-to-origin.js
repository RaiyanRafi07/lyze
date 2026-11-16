/**
 * k-closest-points-to-origin — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `k-closest-points-to-origin`
 * (K Closest Points to Origin, Medium, kClosest(int[][],int)->int[][], mode unordered).
 * Every expected value is computed at build time by kClosestOracle below
 * (full sort by squared distance, take first k), an INDEPENDENT implementation
 * of the same operation (not the walkthrough's size-k max-heap eviction).
 *
 * Staged source: .workers/jobs/neetcode150-completion/k-closest-points-to-origin/practice-k-closest-points-to-origin.json
 * (three same-task sets, hints, unordered comparison rule, sort oracle);
 * reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (order-insensitive for this slug).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'unordered' (coordinate multisets; any order accepted).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'k-closest-points-to-origin'
export const SIGNATURE = Object.freeze({
  name: 'kClosest',
  params: Object.freeze([{ name: 'points', type: 'int[][]' }, { name: 'k', type: 'int' }]),
  return: 'int[][]',
})
export const MODE = 'unordered'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same closest-k rule on sourced examples plus one fresh case.'
export const INTENT_EDGE = 'Same task with the edge cases the original hides (single point, k equals n).'
export const INTENT_ADVERSARIAL = 'Same task with adversarial coordinates: origin, bounds, and colinear points.'

/** INDEPENDENT oracle: full sort by squared distance, take the first k. */
export function kClosestOracle(points, k) {
  const key = (p) => p[0] * p[0] + p[1] * p[1]
  return points
    .map((p, i) => ({ p: p.slice(), d: key(p), i }))
    .sort((a, b) => (a.d - b.d) || (a.i - b.i))
    .slice(0, k)
    .map((e) => e.p)
}

export function compareUnordered(got, expected) {
  const norm = (v) => {
    if (!Array.isArray(v)) return null
    const keys = []
    for (const p of v) {
      if (!Array.isArray(p) || p.length !== 2 || !Number.isInteger(p[0]) || !Number.isInteger(p[1])) return null
      keys.push(p[0] + ',' + p[1])
    }
    return keys.sort()
  }
  const g = norm(got)
  const e = norm(expected)
  if (!g || !e || g.length !== e.length) return false
  for (let i = 0; i < g.length; i++) if (g[i] !== e[i]) return false
  return true
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

function buildVariant({ id, seedLabel, intent, title, statement, pointsList, hints }) {
  const tests = pointsList
    .map(([points, k]) => ({ args: [lit(points), String(k)], expected: lit(kClosestOracle(points, k)) }))
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

export function buildKClosestPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'sourced fresh',
      intent: INTENT_SAME,
      title: 'K Closest — Sourced Plus Fresh (same task)',
      statement:
        'Run the same closest-k rule on the two official examples plus one fresh case: keep a max-heap of size k keyed by squared distance, evicting the farthest point whenever the heap overflows. Compare x^2+y^2, never sqrt: the order is identical and stays integer-exact. Any answer order is accepted.',
      pointsList: [
        [[[1, 3], [-2, 2]], 1],
        [[[3, 3], [5, -1], [-2, 4]], 2],
        [[[4, 5], [-1, -1], [3, 1], [0, -3]], 2],
      ],
      hints: [
        'Compare x^2+y^2, never sqrt: sqrt is monotone so the order is identical and stays integer-exact.',
        'Example 1: [1,3] has d^2=10, [-2,2] has d^2=8, so k=1 keeps [-2,2].',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'K Closest — Edge Cases (same task)',
      statement:
        'Same closest-k task on boundary inputs: the second official example as an anchor, a single point with k=1, and k equal to n where no eviction ever fires. The heap rule and the unordered comparison are unchanged. No rule change.',
      pointsList: [
        [[[3, 3], [5, -1], [-2, 4]], 2],
        [[[0, 1]], 1],
        [[[2, 0], [0, 2], [1, 1]], 3],
      ],
      hints: [
        'k == points.length means no eviction ever fires: the answer is every point, in any order.',
        'A single-point input takes the offer path once and returns it; guard 1 <= k <= n first.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial coords',
      intent: INTENT_ADVERSARIAL,
      title: 'K Closest — Adversarial Coordinates (transfer)',
      statement:
        'SAME TASK, hostile coordinates: the first official example as an anchor, then the origin point plus bound extremes, then eight colinear points on the x-axis. Rank every d^2 value exactly; [0,0] has d^2=0 and beats everything. No rule change: the signature and unordered comparison are unchanged.',
      pointsList: [
        [[[1, 3], [-2, 2]], 1],
        [[[0, 0], [10000, 10000], [-10000, -10000], [1, 0], [0, 2]], 2],
        [[[7, 0], [-3, 0], [2, 0], [-8, 0], [5, 0], [0, 0], [4, 0], [-1, 0]], 3],
      ],
      hints: [
        '[0,0] has d^2=0 and beats everything; bound coords +-10000 give d^2 up to 2*10^8, still integer-exact.',
        'On the colinear set, rank d^2 values 49,9,4,64,25,0,16,1: the 3 smallest are 0,1,4.',
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
  oracle: 'kClosestOracle (full sort by dist2, take first k; size-k max-heap eviction used only in walkthrough)',
})
