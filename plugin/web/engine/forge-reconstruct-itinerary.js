/**
 * reconstruct-itinerary — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `reconstruct-itinerary`
 * (Reconstruct Itinerary, Hard, findItinerary(tickets: string[][]) -> string[], exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * oracleBacktrack below (lexical-order backtracking DFS with edge removal), an
 * INDEPENDENT implementation of the same operation (not the walkthrough's
 * Hierholzer post-order emitter). An iterative Hierholzer oracle plus a
 * ticket-multiset validator cross-check every expected value.
 *
 * Staged source rows: .workers/jobs/neetcode150-completion/reconstruct-itinerary/practice.json
 * (3 same-task sets x 3 literal tests, each test0 == a shard example, statements, hints);
 * reshaped into the forge variant contract (id/seedLabel/intent/difficulty/title/
 * statement/signature/examples/tests/mode/hints). Expected literals re-verified
 * at build time (pinned literals must equal the live oracle output).
 *
 * Shape follows plugin/web/engine/forge-pacific-atlantic-water-flow.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (exact lexical-minimum itinerary).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'reconstruct-itinerary'
export const SIGNATURE = Object.freeze({
  name: 'findItinerary',
  params: Object.freeze([{ name: 'tickets', type: 'string[][]' }]),
  return: 'string[]',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Hard'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same question with adversarial shapes that punish greedy shortcuts.'

/**
 * INDEPENDENT reference oracle: backtracking DFS with edge removal. From the
 * current airport, try departures in lexical order; remove the ticket, recurse,
 * and restore it when the recursion cannot consume everything. The first
 * complete trail found is the lexical minimum. Exponential worst-case time,
 * but a different search strategy from the walkthrough's Hierholzer post-order.
 */
export function oracleBacktrack(tickets) {
  const edges = tickets.map((t) => [t[0], t[1]])
  edges.sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) : (a[0] < b[0] ? -1 : 1)))
  const used = new Array(edges.length).fill(false)
  const path = ['JFK']
  function dfs(u, count) {
    if (count === edges.length) return true
    for (let i = 0; i < edges.length; i++) {
      if (used[i] || edges[i][0] !== u) continue
      used[i] = true
      path.push(edges[i][1])
      if (dfs(edges[i][1], count + 1)) return true
      path.pop()
      used[i] = false
    }
    return false
  }
  if (!dfs('JFK', 0)) throw new Error('No Eulerian trail from JFK (statement guarantees one exists)')
  return path.slice()
}

/** Cross-check oracle: iterative Hierholzer (sorted copies + advancing index). */
export function oracleHierholzer(tickets) {
  const adj = new Map()
  for (const [a, b] of tickets) {
    if (!adj.has(a)) adj.set(a, [])
    adj.get(a).push(b)
  }
  for (const v of adj.values()) v.sort()
  const idx = new Map([...adj.keys()].map((k) => [k, 0]))
  const route = []
  const stack = ['JFK']
  while (stack.length) {
    const u = stack[stack.length - 1]
    const list = adj.get(u) || []
    const i = idx.get(u) || 0
    if (i < list.length) { idx.set(u, i + 1); stack.push(list[i]) }
    else route.push(stack.pop())
  }
  return route.reverse()
}

/** Ticket-multiset validator: uses every ticket exactly once, starts at JFK. */
export function usesAllTickets(tickets, out) {
  if (!Array.isArray(out) || out.length !== tickets.length + 1) return false
  if (out[0] !== 'JFK') return false
  const need = new Map()
  for (const [a, b] of tickets) need.set(a + '>' + b, (need.get(a + '>' + b) || 0) + 1)
  for (let i = 0; i + 1 < out.length; i++) {
    const k = out[i] + '>' + out[i + 1]
    if (!need.has(k) || need.get(k) === 0) return false
    need.set(k, need.get(k) - 1)
  }
  for (const v of need.values()) if (v !== 0) return false
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

function toTest(tickets) {
  const expected = lit(oracleBacktrack(tickets))
  const cross = lit(oracleHierholzer(tickets))
  if (expected !== cross) throw new Error('Oracles disagree on ' + lit(tickets))
  if (!usesAllTickets(tickets, JSON.parse(expected))) throw new Error('Trail invalid on ' + lit(tickets))
  return { args: [lit(tickets)], expected }
}

function buildVariant({ id, seedLabel, intent, title, statement, ticketRows, hints, pinned }) {
  const tests = ticketRows.map(toTest).slice(0, 5)
    .map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
  if (pinned) {
    for (let i = 0; i < pinned.length && i < tests.length; i++) {
      if (tests[i].expected !== pinned[i]) throw new Error('Pinned literal mismatch in ' + id + ' test ' + i)
    }
  }
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

export function buildReconstructItineraryPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh lex order',
      intent: INTENT_SAME,
      title: 'Reconstruct Itinerary — fresh lex order (ticket drill)',
      statement:
        'You are given a list of airline tickets [from, to]. Reconstruct the itinerary from JFK using every ticket exactly once and return it as a list of airports. When several trails exist, the answer is the smallest in lexical order. These fresh trails include the official second example plus a 3-chain and the classic KUL/NRT trap.',
      ticketRows: [
        [['JFK', 'SFO'], ['JFK', 'ATL'], ['SFO', 'ATL'], ['ATL', 'JFK'], ['ATL', 'SFO']],
        [['JFK', 'AAA'], ['AAA', 'BBB'], ['BBB', 'CCC']],
        [['JFK', 'KUL'], ['JFK', 'NRT'], ['NRT', 'JFK']],
      ],
      pinned: ['["JFK","ATL","JFK","SFO","ATL","SFO"]', '["JFK","AAA","BBB","CCC"]', '["JFK","NRT","JFK","KUL"]'],
      hints: [
        'Sort each airport\'s arrivals ascending and always fly the smallest unused ticket first.',
        'Append each airport only after its departures run out (post-order); the stuck airport is the end, not the next stop.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Reconstruct Itinerary — edge cases (ticket drill)',
      statement:
        'Same itinerary task with the boundary inputs. With one ticket the answer is just [from, to]. Duplicate tickets are separate edges: flying JFK->ATL twice needs two copies consumed, not one. The official first example anchors this set.',
      ticketRows: [
        [['MUC', 'LHR'], ['JFK', 'MUC'], ['SFO', 'SJC'], ['LHR', 'SFO']],
        [['JFK', 'LAX']],
        [['JFK', 'ATL'], ['ATL', 'JFK'], ['JFK', 'ATL'], ['ATL', 'SFO']],
      ],
      pinned: ['["JFK","MUC","LHR","SFO","SJC"]', '["JFK","LAX"]', '["JFK","ATL","JFK","ATL","SFO"]'],
      hints: [
        'With one ticket the answer is just [from, to]; the walk is one fly plus two backtracks.',
        'Duplicate tickets are separate edges: flying JFK->ATL twice needs two copies consumed, not one.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial same-task',
      intent: INTENT_ADVERSARIAL,
      title: 'Reconstruct Itinerary — adversarial same-task (ticket drill)',
      statement:
        'Same itinerary question with adversarial shapes that punish greedy shortcuts. A dead-end airport (no unused departures) belongs at the back: prepend it and keep flying from its caller. The official first example anchors this set; the other trails need full post-order discipline. No rule change.',
      ticketRows: [
        [['MUC', 'LHR'], ['JFK', 'MUC'], ['SFO', 'SJC'], ['LHR', 'SFO']],
        [['JFK', 'AAA'], ['JFK', 'BBB'], ['BBB', 'JFK']],
        [['JFK', 'ATL'], ['ATL', 'SFO'], ['SFO', 'JFK'], ['JFK', 'SFO']],
      ],
      pinned: ['["JFK","MUC","LHR","SFO","SJC"]', '["JFK","BBB","JFK","AAA"]', '["JFK","ATL","SFO","JFK","SFO"]'],
      hints: [
        'A dead-end airport (no unused departures) belongs at the back: prepend it and keep flying from its caller.',
        'Check your trail by crossing off every ticket exactly once; smallest-first without post-order still fails these.',
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
  oracle: 'oracleBacktrack (lexical backtracking DFS with edge removal; frame emitter is iterative Hierholzer post-order)',
})
