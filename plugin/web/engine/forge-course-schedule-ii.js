/**
 * course-schedule-ii — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `course-schedule-ii`
 * (Course Schedule II, Medium, findOrder(int,int[][])->int[], mode any).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs inside visual bounds (1<=n<=7, edges<=12) and judge constraints;
 * every expected value is computed at build time by findOrderDfsOracle below
 * (iterative DFS 3-color post-order reversed), an INDEPENDENT implementation
 * of the same operation (not the walkthrough's largest-ready-first Kahn
 * frame emitter). Post-order reversed is a valid topological order; a back
 * edge proves a cycle and pins [].
 *
 * Staged source: .workers/jobs/question-owners-150/course-schedule-ii/practice.js
 * (statements, hints, fixtures, any-order acceptance); reshaped into the forge
 * variant contract (id/seedLabel/intent/difficulty/title/statement/signature/
 * examples/tests/mode/hints). Expected literals re-verified against the DFS
 * oracle at build time and cross-checked with isValidOrder below.
 *
 * Comparison semantics (preserved from the live judge record, shard-5):
 * - `expected` pins one deterministic valid order (DFS post-order reversed),
 *   so the first test doubles as the displayed example.
 * - Acceptance uses `isValidOrder` (any-order oracle): a submission passes
 *   iff it is a permutation of 0..n-1 with every b before its a, or [] iff
 *   the graph is cyclic. A different valid order (e.g. FIFO Kahn [0,1,2,3]
 *   on the dataset diamond) is VALID and must not be rejected.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (order-insensitive for this slug: mode any).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'any' (same-task practice; any valid order accepted).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'course-schedule-ii'
export const SIGNATURE = Object.freeze({
  name: 'findOrder',
  params: Object.freeze([{ name: 'numCourses', type: 'int' }, { name: 'prerequisites', type: 'int[][]' }]),
  return: 'int[]',
})
export const MODE = 'unordered'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the ready-heap reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge cases the original hides.'
export const INTENT_ADVERSARIAL = 'Same task with interleaved components that punish smallest-first or FIFO habits.'

/**
 * INDEPENDENT reference oracle: iterative DFS with explicit 3 colors.
 * Post-order reversed is a topological order; a back edge (child still
 * in-stack) proves a cycle and returns []. Different method from the
 * walkthrough (largest-ready-first Kahn with indegrees and a ready heap):
 * no counters, no queue, no heap. Deterministic: input edge order fixes
 * adjacency, vertices start in 0..n-1 order.
 */
export function findOrderDfsOracle(n, prereqs) {
  if (!Number.isInteger(n) || n < 0) return null
  const adj = Array.from({ length: n }, () => [])
  for (const p of prereqs) {
    if (!Array.isArray(p) || p.length !== 2) return null
    const a = p[0], b = p[1]
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || a >= n || b < 0 || b >= n) return null
    adj[b].push(a)
  }
  const color = new Array(n).fill(0) // 0 unvisited, 1 in-stack, 2 done
  const post = []
  for (let s = 0; s < n; s++) {
    if (color[s] !== 0) continue
    color[s] = 1
    const stack = [[s, 0]]
    while (stack.length) {
      const top = stack[stack.length - 1]
      const u = top[0]
      if (top[1] < adj[u].length) {
        const v = adj[u][top[1]++]
        if (color[v] === 1) return []
        if (color[v] === 0) { color[v] = 1; stack.push([v, 0]) }
      } else { color[u] = 2; post.push(u); stack.pop() }
    }
  }
  return post.reverse()
}

/** Cycle probe behind the acceptance oracle (same DFS discipline, no order kept). */
export function hasCycle(n, prereqs) {
  const adj = Array.from({ length: n }, () => [])
  for (const p of prereqs) adj[p[1]].push(p[0])
  const color = new Array(n).fill(0)
  for (let s = 0; s < n; s++) {
    if (color[s] !== 0) continue
    color[s] = 1
    const stack = [[s, 0]]
    while (stack.length) {
      const top = stack[stack.length - 1]
      const u = top[0]
      if (top[1] < adj[u].length) {
        const v = adj[u][top[1]++]
        if (color[v] === 1) return true
        if (color[v] === 0) { color[v] = 1; stack.push([v, 0]) }
      } else { color[u] = 2; stack.pop() }
    }
  }
  return false
}

/**
 * INDEPENDENT any-order acceptance oracle: true iff `got` is a valid answer.
 * Permutation of 0..n-1 with every prerequisite b placed before its a;
 * [] is valid iff the graph is cyclic (and only then).
 */
export function isValidOrder(n, prereqs, got) {
  if (!Array.isArray(got)) return false
  if (got.length === 0) return hasCycle(n, prereqs)
  if (got.length !== n) return false
  const seen = new Array(n).fill(false)
  for (const v of got) {
    if (!Number.isInteger(v) || v < 0 || v >= n || seen[v]) return false
    seen[v] = true
  }
  const pos = new Map(got.map((v, i) => [v, i]))
  for (const p of prereqs) {
    if (!Array.isArray(p) || p.length !== 2) return false
    const a = p[0], b = p[1]
    if (pos.get(b) > pos.get(a)) return false
  }
  return !hasCycle(n, prereqs)
}

export const outLiteral = (arr) => JSON.stringify(arr)
export const argLiteral = (n, edges) => [String(n), JSON.stringify(edges)]

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

function buildVariant({ id, seedLabel, intent, title, statement, rows, hints }) {
  const tests = rows
    .map(([n, edges]) => ({ args: argLiteral(n, edges), expected: outLiteral(findOrderDfsOracle(n, edges)) }))
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

/* ---------------- entry point (documented portable builder) ---------------- */

export function buildCourseScheduleIIVariants() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'generated: diamond with tail',
      intent: INTENT_SAME,
      title: 'Course Schedule II — Diamond with Tail (generated, same task)',
      statement:
        'GENERATED practice (same task, fresh input): numCourses = 5 with a diamond plus a tail edge [4,2]. ' +
        'Return any valid order that takes every prerequisite first, and return [] only if a cycle makes completion impossible. ' +
        'One valid order is [0,2,4,1,3], and every other topological order is accepted too.',
      rows: [
        [5, [[1, 0], [2, 0], [3, 1], [3, 2], [4, 2]]],
        [4, [[1, 0], [2, 0], [3, 1], [3, 2]]],
        [2, [[1, 0]]],
        [3, [[1, 0], [2, 1]]],
      ],
      hints: [
        'Pair [a,b] is an edge b -> a: b must appear before a in your answer.',
        'When courses 1 and 2 are both ready, either may come next; both choices stay valid.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'generated: hidden edge cases',
      intent: INTENT_EDGE,
      title: 'Course Schedule II — Hidden Edges (generated, same task)',
      statement:
        'GENERATED practice (same task, edge inputs): a lone course with no prerequisites, a reversed pair [[0,1]] meaning course 1 comes first, and 2-cycles where a free course cannot rescue the answer. ' +
        'An empty answer is correct only when a cycle exists. ' +
        'Read each pair carefully: [a,b] always means b before a.',
      rows: [
        [1, []],
        [2, [[0, 1]]],
        [3, [[0, 1], [1, 0]]],
        [2, [[1, 0], [0, 1]]],
      ],
      hints: [
        'Read the pair order carefully: [0,1] needs course 1 before course 0.',
        'A free course does not rescue a cycle elsewhere: if any component is cyclic the whole answer is [].',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'generated: interleaved chains',
      intent: INTENT_ADVERSARIAL,
      title: 'Course Schedule II — Interleaved Components (generated, same task)',
      statement:
        'GENERATED practice (same task, adversarial input): numCourses = 6 with two independent chains sharing the ready heap. ' +
        'Smallest-first habits place 0 before 1 and miss the pinned order [1,5,4,0,3,2]. ' +
        'Any valid topological order is accepted, and a FIFO pass is valid here too.',
      rows: [
        [6, [[2, 0], [3, 0], [4, 1], [5, 1]]],
        [7, [[1, 0], [2, 1], [3, 1], [4, 2], [5, 3], [6, 3]]],
        [4, [[1, 0], [2, 0], [3, 1], [3, 2]]],
        [5, [[3, 0], [3, 1], [4, 1], [4, 2]]],
      ],
      hints: [
        'Disconnected components interleave freely: after seeding {0,1}, course 1 leaves first under largest-ready-first.',
        'A plain FIFO pass yields [0,1,2,3,4,5] on the first input and is equally valid; the pinned output is one deterministic choice.',
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
  oracle: 'findOrderDfsOracle (iterative DFS 3-color post-order reversed; frame emitter uses largest-ready-first Kahn)',
})
