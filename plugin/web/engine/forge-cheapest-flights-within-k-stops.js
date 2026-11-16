/**
 * cheapest-flights-within-k-stops — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug
 * `cheapest-flights-within-k-stops` (Cheapest Flights Within K Stops, Medium,
 * findCheapestPrice(int,int[][],int,int,int)->int, mode exact). Every expected
 * value is computed at build time by the reference below and cross-checked
 * against an INDEPENDENT oracle (DFS path enumeration, never relaxes tables):
 * v1/v2 use the stop-counting pair (cheapestBF vs cheapestBrute), v3 uses the
 * disclosed twist pair (cheapestBFEdges vs cheapestBruteEdges, k counts
 * EDGES instead of stops).
 *
 * Staged source: .workers/jobs/question-owners-150/cheapest-flights-within-k-stops/practice.mjs
 * (seeded generator, curated edges, official examples, twist pair, both oracles);
 * reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle pair at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'cheapest-flights-within-k-stops'
export const SIGNATURE = Object.freeze({
  name: 'findCheapestPrice',
  params: Object.freeze([
    { name: 'n', type: 'int' },
    { name: 'flights', type: 'int[][]' },
    { name: 'src', type: 'int' },
    { name: 'dst', type: 'int' },
    { name: 'k', type: 'int' },
  ]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same stop-budget rule on fresh seeded graphs so you reproduce the frozen-snapshot reasoning.'
export const INTENT_EDGE = 'Same task with the boundary inputs the worked examples hide.'
export const INTENT_TWIST = 'Same signature, changed counting rule: k counts edges instead of stops.'

/** Reference: k+1 Bellman-Ford rounds, snapshot per round (mirrors the walkthrough). */
export function cheapestBF(n, flights, src, dst, k) {
  const INF = Number.MAX_SAFE_INTEGER
  let dist = new Array(n).fill(INF)
  dist[src] = 0
  for (let i = 0; i <= k; i++) {
    const next = dist.slice()
    for (const [u, v, w] of flights) {
      if (dist[u] === INF) continue
      if (dist[u] + w < next[v]) next[v] = dist[u] + w
    }
    dist = next
  }
  return dist[dst] === INF ? -1 : dist[dst]
}

/**
 * INDEPENDENT oracle: DFS over simple paths with at most k+1 edges. Never
 * relaxes, never copies tables — pure path search, so agreement with the
 * reference validates the walkthrough rather than repeating it.
 */
export function cheapestBrute(n, flights, src, dst, k) {
  const adj = Array.from({ length: n }, () => [])
  for (const [u, v, w] of flights) adj[u].push([v, w])
  let best = Infinity
  const seen = new Array(n).fill(false)
  function dfs(u, edgesUsed, cost) {
    if (cost >= best) return
    if (u === dst) {
      best = cost
      return
    }
    if (edgesUsed === k + 1) return
    seen[u] = true
    for (const [v, w] of adj[u]) {
      if (!seen[v]) dfs(v, edgesUsed + 1, cost + w)
    }
    seen[u] = false
  }
  dfs(src, 0, 0)
  return best === Infinity ? -1 : best
}

/** v3 reference (RULE CHANGE): k counts edges, so only k rounds run. */
export function cheapestBFEdges(n, flights, src, dst, k) {
  const INF = Number.MAX_SAFE_INTEGER
  let dist = new Array(n).fill(INF)
  dist[src] = 0
  for (let i = 0; i < k; i++) {
    const next = dist.slice()
    for (const [u, v, w] of flights) {
      if (dist[u] === INF) continue
      if (dist[u] + w < next[v]) next[v] = dist[u] + w
    }
    dist = next
  }
  return dist[dst] === INF ? -1 : dist[dst]
}

/** v3 oracle (RULE CHANGE): DFS with at most k edges. */
export function cheapestBruteEdges(n, flights, src, dst, k) {
  const adj = Array.from({ length: n }, () => [])
  for (const [u, v, w] of flights) adj[u].push([v, w])
  let best = Infinity
  const seen = new Array(n).fill(false)
  function dfs(u, edgesUsed, cost) {
    if (cost >= best) return
    if (u === dst) {
      best = cost
      return
    }
    if (edgesUsed === k) return
    seen[u] = true
    for (const [v, w] of adj[u]) {
      if (!seen[v]) dfs(v, edgesUsed + 1, cost + w)
    }
    seen[u] = false
  }
  dfs(src, 0, 0)
  return best === Infinity ? -1 : best
}

/** mulberry32: 32-bit seeded PRNG, identical output for identical seeds. */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const flightsLiteral = (flights) => '[' + flights.map((f) => `[${f[0]},${f[1]},${f[2]}]`).join(',') + ']'

function caseTests(rows, ref, oracle) {
  return rows.map(({ n, flights, src, dst, k }) => {
    const a = ref(n, flights, src, dst, k)
    const b = oracle(n, flights, src, dst, k)
    if (a !== b) throw new Error(`oracle mismatch for n=${n} src=${src} dst=${dst} k=${k}: ref=${a} brute=${b}`)
    return {
      args: [String(n), flightsLiteral(flights), String(src), String(dst), String(k)],
      expected: String(a),
    }
  })
}

function randomCase(rng, nMin, nMax) {
  const n = nMin + Math.floor(rng() * (nMax - nMin + 1))
  const maxPairs = n * (n - 1)
  const count = 1 + Math.floor(rng() * Math.min(maxPairs, 8))
  const used = new Set()
  const flights = []
  let guard = 0
  while (flights.length < count && guard < 300) {
    guard += 1
    const u = Math.floor(rng() * n)
    const v = Math.floor(rng() * n)
    if (u === v || used.has(u + '->' + v)) continue
    used.add(u + '->' + v)
    flights.push([u, v, 20 + Math.floor(rng() * 480)])
  }
  let src = Math.floor(rng() * n)
  let dst = Math.floor(rng() * n)
  if (src === dst) dst = (dst + 1) % n
  const k = Math.floor(rng() * Math.min(n, 4))
  return { n, flights, src, dst, k }
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

function buildVariant({ id, seedLabel, intent, title, statement, rows, ref, oracle, hints }) {
  const tests = caseTests(rows, ref, oracle)
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

export function buildCheapestFlightsPractice(seed = 78701) {
  const rng = mulberry32(seed)
  const seen = new Set()
  const fresh = []
  let guard = 0
  while (fresh.length < 4 && guard < 800) {
    guard += 1
    const c = randomCase(rng, 4, 6)
    const key = `${c.n}|${flightsLiteral(c.flights)}|${c.src}|${c.dst}|${c.k}`
    if (seen.has(key)) continue
    seen.add(key)
    fresh.push(c)
  }
  if (fresh.length < 4) throw new Error('seeded generator failed to produce 4 fresh rows')

  const edges = [
    { n: 4, flights: [[0, 1, 100], [1, 2, 100], [2, 0, 100], [1, 3, 600], [2, 3, 200]], src: 0, dst: 3, k: 1 },
    { n: 3, flights: [[0, 1, 100], [1, 2, 100], [0, 2, 500]], src: 0, dst: 2, k: 1 },
    { n: 3, flights: [[0, 1, 100], [1, 2, 100], [0, 2, 500]], src: 0, dst: 2, k: 0 },
    { n: 3, flights: [[0, 1, 100], [1, 2, 100]], src: 0, dst: 2, k: 0 },
    { n: 2, flights: [], src: 0, dst: 1, k: 1 },
  ]

  const twist = [
    { n: 3, flights: [[0, 1, 100], [1, 2, 100], [0, 2, 500]], src: 0, dst: 2, k: 1 },
    { n: 3, flights: [[0, 1, 100], [1, 2, 100], [0, 2, 500]], src: 0, dst: 2, k: 2 },
    { n: 4, flights: [[0, 1, 50], [1, 2, 50], [2, 3, 50], [0, 3, 500]], src: 0, dst: 3, k: 2 },
    { n: 4, flights: [[0, 1, 50], [1, 2, 50], [2, 3, 50], [0, 3, 500]], src: 0, dst: 3, k: 3 },
  ]

  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh graphs',
      intent: INTENT_SAME,
      title: 'Cheapest Flights — Fresh Graphs (same task)',
      statement:
        'There are n cities (0..n-1) and directed flights [from, to, price]. Return the cheapest price from src to dst using at most k stops (at most k+1 flights), or -1 when no such route exists. Seeded graphs hold 4 to 6 cities and 1 to 8 priced flights. The signature and exact comparison are unchanged.',
      rows: fresh,
      ref: cheapestBF,
      oracle: cheapestBrute,
      hints: [
        'Run k+1 rounds; each round relaxes every flight against a frozen copy of the previous round.',
        'A seller unreachable in the snapshot cannot sell this round — skip, do not write.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edges + officials',
      intent: INTENT_EDGE,
      title: 'Cheapest Flights — Edges Plus Officials (same task)',
      statement:
        'Same cheapest-price-within-k-stops task on boundary inputs: the three official examples, an unreachable destination, and an empty flight list. k=0 allows only a direct flight; a cheaper path needing more stops must be ignored. No rule change.',
      rows: edges,
      ref: cheapestBF,
      oracle: cheapestBrute,
      hints: [
        'k=0 allows only a direct flight; with no direct flight the answer is -1 even if a longer path exists.',
        'A cheaper path that needs more stops than k allows must be ignored — compare stop counts, not just prices.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'k counts edges',
      intent: INTENT_TWIST,
      title: 'Cheapest Flights — Twist: K Counts Edges (transfer)',
      statement:
        'RULE CHANGE, signature unchanged: k now counts EDGES (flights taken) instead of stops — only routes using at most k flights count, or -1 when none exists. k=1 therefore allows only a direct flight. The changed counting rule is intentional and disclosed.',
      rows: twist,
      ref: cheapestBFEdges,
      oracle: cheapestBruteEdges,
      hints: [
        'Run exactly k rounds instead of k+1; the first round buys the first edge.',
        'Recompute small cases by hand: with k=1 only direct flights can answer.',
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
  ruleChange: 'v3 counts k as edges, disclosed in the variant statement',
  oracle: 'cheapestBrute (DFS path enumeration; Bellman-Ford used only in walkthrough)',
})
