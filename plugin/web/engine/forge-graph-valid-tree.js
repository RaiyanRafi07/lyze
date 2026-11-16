/**
 * graph-valid-tree — portable standalone practice builder (batch13).
 *
 * Produces exactly 3 deterministic variants for slug `graph-valid-tree`
 * (Graph Valid Tree, Medium). TEST PROFILE signature
 * validTree(n: int, edges: int[][]) -> boolean, mode exact: there is NO
 * shard record in plugin/data for this slug and the live curriculum carries
 * judge:false, so there is no live judge to compile against; the profile
 * mirrors the observed NeetCode method shape and both walkthrough + forge
 * use it (judgeable:false, judgeCase:null, negative:null).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value ("true"/"false") is computed at build
 * time by oracleValidTree below (union-find with path compression), an
 * INDEPENDENT implementation of the same operation (not the walkthrough's
 * iterative DFS with parent tracking), and cross-checked against the DFS
 * reference; disagreement throws.
 *
 * Staged source: .workers/jobs/question-owners-150/graph-valid-tree/
 * practice-graph-valid-tree.json (9 tests across 3 sets, literal profile,
 * union-find oracle); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time. All three
 * sets are the SAME task (no twist): identical signature, identical question —
 * v3 is adversarial same-task shapes only.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the documented TEST PROFILE (judge-null record), stable for drills.
 * - `args` are raw literal strings; `expected` is the literal the test driver compares.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'graph-valid-tree'
export const SIGNATURE = Object.freeze({
  name: 'validTree',
  params: Object.freeze([
    { name: 'n', type: 'int' },
    { name: 'edges', type: 'int[][]' },
  ]),
  return: 'boolean',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same task, fresh valid trees so you reproduce the count-gate plus DFS reasoning.'
export const INTENT_EDGE = 'Same task with the cycle shapes the worked tree hides.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial shapes: n-1 edges that still fail, and forests that look dense.'

/** Canonical DFS reference (mirrors the walkthrough emitter): edge-count gate, then DFS with parent skip. */
export function referenceValidTree(n, edges) {
  if (!Number.isInteger(n) || n < 0) return false
  if (!Array.isArray(edges)) return false
  if (n <= 1) return edges.length === 0
  if (edges.length !== n - 1) return false
  const adj = Array.from({ length: n }, () => [])
  for (const e of edges) {
    if (!Array.isArray(e) || e.length !== 2) return false
    const [a, b] = e
    if (!Number.isInteger(a) || !Number.isInteger(b)) return false
    if (a < 0 || b < 0 || a >= n || b >= n) return false
    if (a === b) return false
    adj[a].push(b)
    adj[b].push(a)
  }
  const seen = new Array(n).fill(false)
  const stack = [[0, -1]]
  seen[0] = true
  while (stack.length) {
    const [u, parent] = stack.pop()
    for (const v of adj[u]) {
      if (v === parent) continue
      if (seen[v]) return false
      seen[v] = true
      stack.push([v, u])
    }
  }
  return seen.every(Boolean)
}

/**
 * INDEPENDENT oracle: union-find with path compression + union by rank.
 * Rejects unless edges == n-1, then unions each edge, rejects on same-root
 * (cycle), and finally requires one root. Different method from the
 * walkthrough (iterative DFS frame emitter with parent tracking).
 */
export function oracleValidTree(n, edges) {
  if (!Number.isInteger(n) || n < 0) return false
  if (!Array.isArray(edges)) return false
  if (n <= 1) return edges.length === 0
  if (edges.length !== n - 1) return false
  const parent = Array.from({ length: n }, (_, i) => i)
  const rank = new Array(n).fill(0)
  const find = (x) => {
    let r = x
    while (parent[r] !== r) r = parent[r]
    while (parent[x] !== r) { const nxt = parent[x]; parent[x] = r; x = nxt }
    return r
  }
  for (const e of edges) {
    if (!Array.isArray(e) || e.length !== 2) return false
    const [a, b] = e
    if (!Number.isInteger(a) || !Number.isInteger(b)) return false
    if (a < 0 || b < 0 || a >= n || b >= n || a === b) return false
    const ra = find(a)
    const rb = find(b)
    if (ra === rb) return false
    if (rank[ra] < rank[rb]) parent[ra] = rb
    else if (rank[ra] > rank[rb]) parent[rb] = ra
    else { parent[rb] = ra; rank[ra]++ }
  }
  const root = find(0)
  for (let i = 1; i < n; i++) if (find(i) !== root) return false
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

function buildVariant({ id, seedLabel, intent, title, statement, cases, hints }) {
  if (cases.length < 3 || cases.length > 5) throw new Error('variant ' + id + ' needs 3-5 tests')
  const tests = cases
    .map(({ n, edges }) => {
      const want = oracleValidTree(n, edges)
      const check = referenceValidTree(n, edges)
      if (check !== want) throw new Error('graph-valid-tree oracle disagreement on n=' + n + ' ' + lit(edges))
      return { args: [String(n), lit(edges)], expected: String(want) }
    })
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

export function buildGraphValidTreeVariants() {
  const v1 = buildVariant({
    id: 'v1',
    seedLabel: 'fresh valid trees',
    intent: INTENT_SAME,
    title: 'Graph Valid Tree — Fresh Valid Trees (same task)',
    statement:
      'Decide whether an undirected graph with vertices 0..n-1 is a tree: connected and acyclic. The official star example anchors the set, then a chain, a wider star, and the single-node boundary case. Every input below answers true: the n-1 count passes, DFS from 0 reaches all vertices, and no back edge appears. The test-profile signature and exact comparison are unchanged.',
    cases: [
      { n: 5, edges: [[0, 1], [0, 2], [0, 3], [1, 4]] },
      { n: 4, edges: [[0, 1], [1, 2], [2, 3]] },
      { n: 4, edges: [[0, 1], [0, 2], [0, 3]] },
      { n: 1, edges: [] },
    ],
    hints: [
      'A tree on n nodes has exactly n-1 edges: check the count first, then confirm DFS from 0 reaches every node.',
      'Mark seen on push and skip only the arrival edge; every other neighbor of a visited node is still unvisited here.',
    ],
  })

  const v2 = buildVariant({
    id: 'v2',
    seedLabel: 'cycles plus triangle',
    intent: INTENT_EDGE,
    title: 'Graph Valid Tree — Cycles Rejected (same task)',
    statement:
      'Same tree test on the cycle shapes the worked example hides. The official five-node cycle anchors the set, then the adversarial triangle-plus-isolate whose edge count still totals n-1, a plain triangle, and a square with a diagonal. Every input below answers false: a non-parent edge reaches an already-seen node, so a cycle exists. No rule change.',
    cases: [
      { n: 5, edges: [[0, 1], [1, 2], [2, 3], [1, 3], [1, 4]] },
      { n: 4, edges: [[0, 1], [1, 2], [2, 0]] },
      { n: 3, edges: [[0, 1], [1, 2], [0, 2]] },
      { n: 4, edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]] },
    ],
    hints: [
      'Skip only the parent edge; any other edge to an already-visited node is a cycle.',
      'The n=4 triangle-plus-isolate has 3 == n-1 edges yet fails: the count gate passes, DFS finds the cycle.',
    ],
  })

  // Same-task adversarial set: forests and count-passing failures. Same
  // signature, same question — only the graph shape fights back.
  const v3 = buildVariant({
    id: 'v3',
    seedLabel: 'disconnected shapes',
    intent: INTENT_ADVERSARIAL,
    title: 'Graph Valid Tree — Disconnected Shapes (same task)',
    statement:
      'SAME TASK, harder shapes: two disjoint pairs, three lone vertices, a chain that strands one vertex, and a triangle fused to a path whose total still hits n-1. Every input below answers false with no cycle found by the count gate alone: DFS from 0 leaves vertices unvisited, so the final all-seen check rejects. Track reachability, not just edges.',
    cases: [
      { n: 4, edges: [[0, 1], [2, 3]] },
      { n: 3, edges: [] },
      { n: 5, edges: [[0, 1], [1, 2], [2, 3]] },
      { n: 6, edges: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5]] },
    ],
    hints: [
      'Edge count alone is not connectivity: run DFS from 0 and require every vertex seen at the end.',
      'A cycle plus an isolated vertex can still total n-1 edges; the all-seen check is the half that rejects it.',
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
  oracle: 'oracleValidTree (union-find with path compression; walkthrough uses iterative DFS with parent tracking)',
})
