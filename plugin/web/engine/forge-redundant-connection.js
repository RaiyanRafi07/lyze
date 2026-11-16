/**
 * redundant-connection — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `redundant-connection`
 * (Redundant Connection, Medium, findRedundantConnection(int[][])->int[], mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * redundantConnectionOracle below (incremental connectivity via BFS on the
 * edges seen so far), an INDEPENDENT implementation of the same operation
 * (not the walkthrough's union-find frame emitter). Walkthrough uses DSU with
 * path halving + union by size; the oracle keeps an adjacency list and runs a
 * fresh BFS per edge, so agreement is meaningful.
 *
 * Staged source: .workers/jobs/question-owners-150/redundant-connection/practice notes
 * (statements, hints, BFS oracle); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time. All three
 * sets are the SAME task (no twist): identical signature, identical question —
 * v3 is adversarial same-task shapes only.
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

export const SLUG = 'redundant-connection'
export const SIGNATURE = Object.freeze({
  name: 'findRedundantConnection',
  params: Object.freeze([{ name: 'edges', type: 'int[][]' }]),
  return: 'int[]',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same task, fresh small graphs so you reproduce the scan-roots-and-stop reasoning.'
export const INTENT_EDGE = 'Same task with the edge shapes the worked examples hide.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial shapes: branches and long chains punish eyeballing roots.'

/**
 * INDEPENDENT oracle: incremental BFS connectivity, no DSU.
 * Adds edges one by one; the first edge whose endpoints are already joined
 * by earlier edges is the redundant one. Different method from the
 * walkthrough (DSU parent/size arrays with path halving).
 */
export function redundantConnectionOracle(edges) {
  if (!Array.isArray(edges)) return null
  const adj = new Map()
  const ensure = (x) => { if (!adj.has(x)) adj.set(x, []) }
  const reachable = (s, t) => {
    if (s === t) return true
    const seen = new Set([s])
    const q = [s]
    while (q.length) {
      const x = q.shift()
      for (const y of (adj.get(x) || [])) {
        if (y === t) return true
        if (!seen.has(y)) { seen.add(y); q.push(y) }
      }
    }
    return false
  }
  for (const pair of edges) {
    if (!Array.isArray(pair) || pair.length !== 2) return null
    const [a, b] = pair
    ensure(a); ensure(b)
    if (reachable(a, b)) return [a, b]
    adj.get(a).push(b); adj.get(b).push(a)
  }
  return null
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

function buildVariant({ id, seedLabel, intent, title, statement, edgesList, hints }) {
  const tests = edgesList
    .map((edges) => ({ args: [lit(edges)], expected: lit(redundantConnectionOracle(edges)) }))
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

export function buildRedundantConnectionVariants() {
  const v1 = buildVariant({
    id: 'v1',
    seedLabel: 'fresh triangles',
    intent: INTENT_SAME,
    title: 'Redundant Connection — Fresh Triangles (same task)',
    statement:
      'Scan edges in input order with union-find and return the first edge whose endpoints already share a root. Fresh triangle-style graphs below: three or four nodes where one closing edge completes the single cycle. The signature and exact comparison are unchanged.',
    edgesList: [
      [[1, 2], [2, 3], [1, 3]],
      [[1, 3], [2, 3], [1, 2]],
      [[1, 2], [1, 3], [1, 4], [2, 4]],
      [[1, 2], [2, 3], [3, 4], [1, 5], [4, 5]],
    ],
    hints: [
      'Process edges left to right; the first edge whose endpoints already share a DSU root is the answer.',
      'Compare find(a) vs find(b) roots, never raw parent[a] vs parent[b]; union the roots by size.',
    ],
  })

  const v2 = buildVariant({
    id: 'v2',
    seedLabel: 'edge shapes',
    intent: INTENT_EDGE,
    title: 'Redundant Connection — Edge Shapes (same task)',
    statement:
      'Same scan-roots task on edge shapes: the official three-node example, a four-chain plus its closing edge, a star with a cross edge, and two disjoint pairs joined twice. Short inputs, but only the last edge in each list can share a root. No rule change.',
    edgesList: [
      [[1, 2], [1, 3], [2, 3]],
      [[1, 2], [2, 3], [3, 4], [1, 4]],
      [[1, 2], [1, 3], [1, 4], [2, 3]],
      [[1, 2], [3, 4], [2, 3], [1, 4]],
    ],
    hints: [
      'A chain of unions grows one set; only the closing edge can see a shared root.',
      'Path halving rewrites parent[x] to its grandparent on every hop; roots stay correct as chains lengthen.',
    ],
  })

  // Same-task adversarial set: branched shapes and a long chain where the
  // redundant edge is far from the cycle start. Same signature, same
  // question — only the graph shape fights back.
  const v3 = buildVariant({
    id: 'v3',
    seedLabel: 'adversarial branches',
    intent: INTENT_ADVERSARIAL,
    title: 'Redundant Connection — Adversarial Branches (same task)',
    statement:
      'SAME TASK, harder shapes: the official five-node example anchors the set, then a branched graph, a six-chain with a far-away closer, and a diamond where both paths interleave. Track which root each union attaches before judging the last edge. The signature and exact comparison are unchanged.',
    edgesList: [
      [[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]],
      [[1, 2], [1, 3], [3, 4], [3, 5], [4, 5]],
      [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [1, 6]],
      [[1, 2], [2, 4], [1, 3], [3, 4]],
    ],
    hints: [
      'Same task, branched shape: track which root the middle unions attach to before judging the final edge.',
      'On the long chain, every union merges into one growing set; the far-away closer is the only shared-root edge.',
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
  oracle: 'redundantConnectionOracle (incremental BFS connectivity; walkthrough uses DSU with path halving)',
})
