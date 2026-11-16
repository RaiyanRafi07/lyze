/**
 * surrounded-regions — portable standalone practice builder (question-owners-150).
 *
 * TEST PROFILE slug (judgeable: false). The live record (shard-5 id 130)
 * carries judge: null: the real profile is `solve(board: char[][]) -> void`
 * in place. The honest TEST PROFILE used here is
 * `solve(board: char[][]) -> char[][]`: board in as a char[][] literal, the
 * mutated board out for exact comparison (precedents: mergeKLists(int[][])->int[],
 * reorderList(head:int[])->int[]). All test expectations below are POST-call
 * boards; void return is ignored.
 *
 * Produces exactly 3 deterministic GENERATED variants (Medium,
 * solve(char[][])->char[][], mode exact). Pure ES module: no DOM, no network,
 * no dependencies, no Math.random, no Date. LCG-seeded fresh boards; every
 * expected value is computed at build time by independentOracleBFS below
 * (BFS queue), an INDEPENDENT implementation of the same rule (not the
 * walkthrough's iterative-DFS frame emitter; the reference is DFS + E-mark).
 * Staged source: .workers/jobs/question-owners-150/surrounded-regions/practice.js
 * (reference/oracle/boards); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * All three sets are the SAME task (no rule change, no output-type twist).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the TEST PROFILE signature, so the same test driver compiles unchanged.
 * - `args` are raw board literal strings; `expected` is the POST-call board literal.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'surrounded-regions'
export const SIGNATURE = Object.freeze({
  name: 'solve',
  params: Object.freeze([{ name: 'board', type: 'char[][]' }]),
  return: 'char[][]',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same capture rule on fresh seeded boards so you reproduce the border-seed reasoning.'
export const INTENT_EDGE = 'Same rule on the boundary shapes a 4x4 walkthrough hides.'
export const INTENT_ADVERSARIAL = 'Same rule, adversarial transfer: one border cell decides whether a whole ring flips or escapes.'

function clone(board) { return board.map((r) => r.slice()) }

// Canonical reference: iterative DFS from borders, mark 'E', then flip.
export function referenceSolve(input) {
  const b = clone(input)
  const rows = b.length, cols = b[0].length
  const stack = []
  const push = (r, c) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols || b[r][c] !== 'O') return
    b[r][c] = 'E'
    stack.push([r, c])
  }
  for (let r = 0; r < rows; r++) { push(r, 0); push(r, cols - 1) }
  for (let c = 0; c < cols; c++) { push(0, c); push(rows - 1, c) }
  while (stack.length) {
    const [r, c] = stack.pop()
    push(r + 1, c); push(r - 1, c); push(r, c + 1); push(r, c - 1)
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (b[r][c] === 'O') b[r][c] = 'X'
    else if (b[r][c] === 'E') b[r][c] = 'O'
  }
  return b
}

// INDEPENDENT oracle: BFS queue (different traversal order, same capture rule).
// Different method from the walkthrough's iterative-DFS frame emitter.
export function independentOracleBFS(input) {
  const b = clone(input)
  const rows = b.length, cols = b[0].length
  const q = []
  const mark = (r, c) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols || b[r][c] !== 'O') return
    b[r][c] = 'E'
    q.push([r, c])
  }
  for (let r = 0; r < rows; r++) { mark(r, 0); mark(r, cols - 1) }
  for (let c = 0; c < cols; c++) { mark(0, c); mark(rows - 1, c) }
  for (let h = 0; h < q.length; h++) {
    const [r, c] = q[h]
    mark(r + 1, c); mark(r - 1, c); mark(r, c + 1); mark(r, c - 1)
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (b[r][c] === 'O') b[r][c] = 'X'
    else if (b[r][c] === 'E') b[r][c] = 'O'
  }
  return b
}

export function boardLiteral(board) {
  return '[' + board.map((row) => '[' + row.map((v) => JSON.stringify(v)).join(',') + ']').join(',') + ']'
}

// Deterministic LCG so the seed always yields the same boards (no Math.random).
function lcg(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

function freshBoard(rng) {
  return Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: 4 }, (_, c) => {
      if (r === 0 || r === 3 || c === 0 || c === 3) return rng() < 0.45 ? 'O' : 'X'
      return rng() < 0.55 ? 'O' : 'X'
    }))
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

function toTest(grid) {
  const ref = referenceSolve(grid)
  const via = independentOracleBFS(grid)
  if (JSON.stringify(ref) !== JSON.stringify(via)) throw new Error('surrounded-regions oracle disagreement')
  return { args: [boardLiteral(grid)], expected: boardLiteral(via) }
}

function buildVariant({ id, seedLabel, intent, title, statement, grids, hints }) {
  const tests = grids
    .map((g) => toTest(g))
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

export function buildSurroundedVariants(seed = 130150) {
  const rng = lcg(seed)
  const fresh = [freshBoard(rng), freshBoard(rng), freshBoard(rng), freshBoard(rng)]

  const closed = [
    ['X', 'X', 'X', 'X', 'X'],
    ['X', 'O', 'O', 'O', 'X'],
    ['X', 'O', 'X', 'O', 'X'],
    ['X', 'O', 'O', 'O', 'X'],
    ['X', 'X', 'X', 'X', 'X'],
  ]
  const openedBottom = closed.map((r) => r.slice())
  openedBottom[4][2] = 'O'
  const openedTop = closed.map((r) => r.slice())
  openedTop[0][2] = 'O'

  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh boards',
      intent: INTENT_SAME,
      title: 'Surrounded Regions — fresh boards (same task)',
      statement:
        'Generated practice. Same capture rule: flip every O that is NOT connected to the border through O cells into X, in place; the mutated board is the answer. Fresh seeded 4x4 boards below mix a border-connected cluster (survives) with enclosed cells (flip). The return value of the real method is void; this test profile returns the board.',
      grids: fresh,
      hints: [
        'Seed marking only from border O cells; interior O cells are never starting points.',
        'An O survives only through a 4-directional O path to the border — diagonals do not count.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge boards',
      intent: INTENT_EDGE,
      title: 'Surrounded Regions — edge boards (same task)',
      statement:
        'Generated practice. Same rule on boundary shapes: 1x1 O, a single row, a single column, and a fully enclosed 2x2 block. In a 1-row or 1-column board every cell touches the border, so no O can be captured. The mutated board is the answer; the real void return is ignored.',
      grids: [
        [['O']],
        [['O', 'X', 'O']],
        [['X'], ['O'], ['X']],
        [['X', 'X', 'X', 'X'], ['X', 'O', 'O', 'X'], ['X', 'O', 'O', 'X'], ['X', 'X', 'X', 'X']],
      ],
      hints: [
        'In a 1-row or 1-column board every cell touches the border, so no O can be captured.',
        'Mark escapes with a temporary symbol before flipping, or the flip pass cannot tell survivors apart.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'closed vs opened rings',
      intent: INTENT_ADVERSARIAL,
      title: 'Surrounded Regions — closed vs opened rings (same task)',
      statement:
        'Generated practice. Same rule, adversarial transfer: a closed 5x5 O ring flips entirely, while opening one border cell (bottom edge, then top edge) lets the whole ring escape. Compare the three boards to see why border seeding must come first. One cell decides everything; no rule change.',
      grids: [closed, openedBottom, openedTop],
      hints: [
        'Trace the O path from the opening to the ring before deciding any flip.',
        'Flipping O to X during the border walk breaks the connectivity test for later neighbours.',
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
  oracle: 'independentOracleBFS (BFS queue; reference is iterative DFS; walkthrough emits DFS frames)',
})
