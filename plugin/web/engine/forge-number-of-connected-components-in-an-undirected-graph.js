/**
 * number-of-connected-components-in-an-undirected-graph — portable standalone practice builder.
 *
 * Produces exactly 3 deterministic variants for slug
 * `number-of-connected-components-in-an-undirected-graph`
 * (Count Connected Components, Medium). TEST PROFILE signature
 * countComponents(n: int, edges: int[][]) -> int, mode exact: LeetCode 323
 * is premium with NO shard record in plugin/data, so there is no live judge
 * to compile against; the profile mirrors the NeetCode method shape and both
 * walkthrough + forge use it (judgeable:false, judgeCase:null).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * oracleCountComponents below (BFS flood over adjacency lists), an
 * INDEPENDENT implementation of the same operation (not the walkthrough's
 * union-find with path halving + union by size), so agreement is meaningful.
 *
 * Staged source: .workers/jobs/question-owners-150/number-of-connected-components-in-an-undirected-graph/practice.js
 * (statements, hints, BFS oracle); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time. All three
 * sets are the SAME task (no twist): identical signature, identical question —
 * v3 is adversarial same-task shapes only.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the documented TEST PROFILE (judge-null record), stable for drills.
 * - `args` are raw literal strings; `expected` is the literal the judge compares.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'number-of-connected-components-in-an-undirected-graph'
export const SIGNATURE = Object.freeze({
  name: 'countComponents',
  params: Object.freeze([
    { name: 'n', type: 'int' },
    { name: 'edges', type: 'int[][]' },
  ]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same task, fresh small graphs so you reproduce the scan-roots-and-count reasoning.'
export const INTENT_EDGE = 'Same task with the official examples and the boundary inputs the walkthrough hides.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial shapes: cycles and isolates punish edge-counting.'

/**
 * INDEPENDENT oracle: BFS flood over adjacency lists, no DSU.
 * Counts how many times a fresh flood must start; each start is one component.
 * Different method from the walkthrough (union-find parent/size + path halving).
 */
export function oracleCountComponents(n, edges) {
  if (!Number.isInteger(n) || n < 1) throw new Error('oracle needs n >= 1')
  const adj = Array.from({ length: n }, () => [])
  for (const pair of edges) {
    const [a, b] = pair
    adj[a].push(b)
    adj[b].push(a)
  }
  const seen = new Array(n).fill(false)
  let count = 0
  for (let v = 0; v < n; v++) {
    if (seen[v]) continue
    count++
    const stack = [v]
    seen[v] = true
    while (stack.length) {
      const cur = stack.pop()
      for (const w of adj[cur]) {
        if (!seen[w]) { seen[w] = true; stack.push(w) }
      }
    }
  }
  return count
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
      const want = oracleCountComponents(n, edges)
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

export function buildConnectedComponentsVariants() {
  const v1 = buildVariant({
    id: 'v1',
    seedLabel: 'fresh chains and pairs',
    intent: INTENT_SAME,
    title: 'Connected Components — Fresh Chains (same task)',
    statement:
      'Count the connected components of an undirected graph with vertices 0..n-1 and the given edge list. Fresh small graphs below mix chains and separate pairs, so isolated vertices still count. Start the count at n and subtract exactly one per edge that joins two different sets. The test-profile signature and exact comparison are unchanged.',
    cases: [
      { n: 6, edges: [[0, 1], [1, 2], [2, 3], [4, 5]] },
      { n: 4, edges: [[0, 1], [2, 3]] },
      { n: 5, edges: [[0, 1], [1, 2], [3, 4]] },
      { n: 7, edges: [[0, 1], [2, 3], [3, 4], [5, 6]] },
    ],
    hints: [
      'Start the count at n and subtract exactly one per edge that joins two different sets.',
      'Isolated vertices never appear in edges but each still counts.',
    ],
  })

  const v2 = buildVariant({
    id: 'v2',
    seedLabel: 'officials plus boundary',
    intent: INTENT_EDGE,
    title: 'Connected Components — Officials Plus Boundary (same task)',
    statement:
      'Same component-count task on the official examples plus boundary inputs: a full chain that collapses to one set, a lone vertex with no edges, and one spanning edge over three vertices. Empty edge lists are allowed here even though the sourced brief bounds edges at 1..5000. No rule change.',
    cases: [
      { n: 5, edges: [[0, 1], [1, 2], [2, 3], [3, 4]] },
      { n: 1, edges: [] },
      { n: 3, edges: [[0, 1]] },
      { n: 5, edges: [[0, 1], [1, 2], [3, 4]] },
    ],
    hints: [
      'With no edges, no union can happen — the answer is the starting count itself.',
      'A chain of unions grows one set; only the count of successful merges matters, not the edge count.',
    ],
  })

  // Same-task adversarial set: cycle edges merge nothing, so counting edges
  // instead of merges fails; isolates stand alone. Same signature, same
  // question — only the graph shape fights back.
  const v3 = buildVariant({
    id: 'v3',
    seedLabel: 'cycles plus isolates',
    intent: INTENT_ADVERSARIAL,
    title: 'Connected Components — Cycles Plus Isolates (same task)',
    statement:
      'SAME TASK, harder shapes: triangles whose third edge merges nothing, two triangles plus two isolates, and a square with a diagonal. Six edges can still mean only four successful merges, while untouched vertices each stand alone. Track roots, not edges, and skip same-root edges without touching the count.',
    cases: [
      { n: 8, edges: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3]] },
      { n: 4, edges: [[0, 1], [1, 2], [2, 0]] },
      { n: 6, edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]] },
      { n: 5, edges: [[0, 1], [2, 3]] },
    ],
    hints: [
      'The third edge of each triangle finds both endpoints already sharing a root — skip it without touching the count.',
      'Trace the roots, not the edge count: cycle edges never decrement.',
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
  oracle: 'oracleCountComponents (BFS flood over adjacency lists; walkthrough uses DSU with path halving)',
})
