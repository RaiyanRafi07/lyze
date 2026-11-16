/**
 * min-cost-to-connect-all-points — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `min-cost-to-connect-all-points`
 * (Min Cost to Connect All Points, Medium, minCostConnectPoints(points: int[][]) -> int, exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * solvePrim below (Prim's O(n^2) growth, no edge list, no DSU), an INDEPENDENT
 * implementation of the same operation (not the walkthrough's Kruskal + DSU
 * emitter). A Kruskal solver cross-checks every expected value.
 *
 * Staged source rows: .workers/jobs/question-owners-150/min-cost-to-connect-all-points/practice.js
 * (sourced test0s, edge/adversarial rows, statements, hints); reshaped into the
 * forge variant contract (id/seedLabel/intent/difficulty/title/statement/
 * signature/examples/tests/mode/hints). Expected literals re-verified at build time
 * (Prim == Kruskal on every test or the builder throws).
 *
 * Shape follows plugin/web/engine/forge-pacific-atlantic-water-flow.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (exact integer equality).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'min-cost-to-connect-all-points'
export const SIGNATURE = Object.freeze({
  name: 'minCostConnectPoints',
  params: Object.freeze([{ name: 'points', type: 'int[][]' }]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial shapes: weight ties and translated layouts.'

export function manhattan(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])
}

function checkPoints(points) {
  if (!Array.isArray(points)) throw new Error('points must be an array of [x,y] pairs')
  if (points.length < 1 || points.length > 1000) throw new Error('points.length must be 1..1000')
  const seen = new Set()
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i]
    if (!Array.isArray(p) || p.length !== 2) throw new Error('points[' + i + '] must be a pair [x,y]')
    const [x, y] = p
    if (!Number.isInteger(x) || !Number.isInteger(y)) throw new Error('points[' + i + '] must hold integers')
    if (Math.abs(x) > 1000000 || Math.abs(y) > 1000000) throw new Error('points[' + i + '] out of sourced range |coord|<=10^6')
    const key = x + ':' + y
    if (seen.has(key)) throw new Error('points[' + i + '] duplicates [' + x + ',' + y + '] (sourced: all pairs distinct)')
    seen.add(key)
  }
}

/**
 * INDEPENDENT reference oracle: Prim's O(n^2) growth. Keep best[v] = cheapest
 * edge from the grown tree to each outside point, repeatedly attach the minimum,
 * then relax with Manhattan distances. No edge list, no sorting, no DSU.
 * Different algorithm from the walkthrough's Kruskal + DSU.
 */
export function solvePrim(points) {
  checkPoints(points)
  const n = points.length
  if (n <= 1) return 0
  const inMst = new Array(n).fill(false)
  const best = new Array(n).fill(Infinity)
  best[0] = 0
  let cost = 0
  for (let k = 0; k < n; k += 1) {
    let u = -1
    for (let i = 0; i < n; i += 1) {
      if (!inMst[i] && (u === -1 || best[i] < best[u])) u = i
    }
    inMst[u] = true
    cost += best[u]
    for (let v = 0; v < n; v += 1) {
      if (!inMst[v]) {
        const w = manhattan(points[u], points[v])
        if (w < best[v]) best[v] = w
      }
    }
  }
  return cost
}

/** Cross-check: canonical Kruskal + DSU (the walkthrough's approach). */
export function solveKruskal(points) {
  checkPoints(points)
  const n = points.length
  if (n <= 1) return 0
  const edges = []
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) edges.push([manhattan(points[i], points[j]), i, j])
  }
  edges.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])
  const parent = Array.from({ length: n }, (_, i) => i)
  const size = new Array(n).fill(1)
  const find = (x) => {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x] }
    return x
  }
  let cost = 0
  let used = 0
  for (const [w, i, j] of edges) {
    let ra = find(i)
    let rb = find(j)
    if (ra === rb) continue
    if (size[ra] < size[rb]) { const t = ra; ra = rb; rb = t }
    parent[rb] = ra
    size[ra] += size[rb]
    cost += w
    if (++used === n - 1) break
  }
  return cost
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

function toTest(points) {
  const expected = String(solvePrim(points))
  const cross = solveKruskal(points)
  if (cross !== Number(expected)) throw new Error('Oracles disagree on ' + lit(points))
  return { args: [lit(points.map((p) => [p[0], p[1]]))], expected }
}

function buildVariant({ id, seedLabel, intent, title, statement, pointRows, hints }) {
  const tests = pointRows.map(toTest).slice(0, 5)
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

export function buildMinCostPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh triangle',
      intent: INTENT_SAME,
      title: 'Min Cost to Connect All Points — fresh triangle (MST drill)',
      statement:
        'You are given points on a plane; the cost of connecting two points is the Manhattan distance |xi-xj| + |yi-yj|. Return the minimum cost to connect all points. The fresh right triangle [[0,0],[4,0],[0,3]] costs 3 + 4 = 7. Collinear chains and unit squares follow the same rule.',
      pointRows: [
        [[0, 0], [4, 0], [0, 3]],
        [[0, 0], [1, 0], [2, 0], [3, 0]],
        [[0, 0], [0, 2], [2, 0], [2, 2]],
      ],
      hints: [
        'Edge weight is |xi-xj| + |yi-yj|, not Euclidean distance: (0,0)-(4,0) costs 4, (0,0)-(0,3) costs 3.',
        'Take globally cheapest edges first and skip any edge whose endpoints are already connected; 3 + 4 = 7.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Min Cost to Connect All Points — edge cases (MST drill)',
      statement:
        'Same MST task with the boundary inputs. One point needs zero cost: there is nothing to connect. Negative coordinates work the same way: (5,5)-(-5,-5) costs |10| + |10| = 20. Collinear and mirrored layouts change nothing about the rule.',
      pointRows: [
        [[0, 0]],
        [[5, 5], [-5, -5]],
        [[0, 0], [1, 1], [2, 2]],
        [[-3, -4], [0, 0], [3, 4]],
      ],
      hints: [
        'One point needs zero cost: there is nothing to connect, and n-1 = 0 edges are taken.',
        'Negative coordinates work the same way: (5,5)-(-5,-5) costs |10| + |10| = 20.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'same-task ties',
      intent: INTENT_ADVERSARIAL,
      title: 'Min Cost to Connect All Points — same-task ties (MST drill)',
      statement:
        'Same MST question with adversarial weight ties and translated layouts. The official five-point example costs 20. The translated unit square has four weight-1 ties; any MST totals 3. The official three-point example costs 18. No rule change: signature, exact mode, and int answer are unchanged.',
      pointRows: [
        [[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]],
        [[-3, 1], [-3, 2], [-2, 1], [-2, 2]],
        [[3, 12], [-2, 5], [-4, 1]],
      ],
      hints: [
        'Many edges can tie; ties are broken deterministically but any MST totals the same minimum.',
        'Translation preserves every Manhattan distance, so a shifted square keeps the same MST total.',
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
  oracle: 'solvePrim (Prim O(n^2), no edge list, no DSU; frame emitter is Kruskal + DSU)',
})
