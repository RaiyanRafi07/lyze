/**
 * set-matrix-zeroes — portable standalone practice builder (question-owners-150).
 *
 * TEST PROFILE slug (judgeable: false). The live record (shard-5 id 73)
 * carries judge: null: the real profile is `setZeroes(matrix: int[][]) ->
 * void` in place. The honest TEST PROFILE used here is the same method shape:
 *   setZeroes(matrix: int[][]) -> void
 * Every `args[0]` below is the PRE-call matrix literal; every `expected` is
 * the POST-call mutated matrix literal (void return ignored; mode exact on
 * the mutated grid). Precedents: rotate(matrix: int[][])->void,
 * mergeKLists(int[][])->int[], runTrieOps(string[],string[])->string.
 *
 * Produces exactly 3 deterministic GENERATED variants (Medium,
 * setZeroes(int[][])->void, mode exact). Pure ES module: no DOM, no network,
 * no dependencies, no Math.random, no Date. Fixed matrices; every expected
 * value is computed at build time by oracleRowColSets below (row/column sets
 * collected first, then one zeroing sweep), an INDEPENDENT implementation of
 * the same rule (not the walkthrough's O(1) first-row/column marker emitter;
 * the reference is the marker method setZeroesInPlace). Every case is
 * cross-checked: the void-mutation runner must reproduce the expected
 * literal; any disagreement throws so a bad literal can never ship.
 *
 * Staged source: .workers/jobs/question-owners-150/set-matrix-zeroes/
 * practice.js (seeded generated variants, sets oracle, void signature);
 * reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/
 * mode/hints). All three sets are the SAME in-place task (no rule change).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the TEST PROFILE signature, so the same test driver runs unchanged.
 * - `args` are raw matrix literal strings; `expected` is the POST-call matrix literal.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

import { setZeroesInPlace } from './adapter-set-matrix-zeroes.js'

export const SLUG = 'set-matrix-zeroes'

export const SIGNATURE = Object.freeze({
  name: 'setZeroes',
  params: Object.freeze([{ name: 'matrix', type: 'int[][]' }]),
  return: 'void',
})

export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge cases the original hides.'
export const INTENT_ADVERSARIAL = 'Same task with hostile placements: the zero sits where markers and flags overlap.'

function cloneGrid(grid) {
  return grid.map((row) => row.slice())
}

/** INDEPENDENT oracle: collect zero rows/columns into sets, then sweep. */
export function oracleRowColSets(input) {
  const grid = cloneGrid(input)
  const m = grid.length
  const n = grid[0].length
  const rows = new Set()
  const cols = new Set()
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] === 0) { rows.add(r); cols.add(c) }
    }
  }
  for (const r of rows) for (let c = 0; c < n; c++) grid[r][c] = 0
  for (const c of cols) for (let r = 0; r < m; r++) grid[r][c] = 0
  return grid
}

function outLiteral(grid) {
  return JSON.stringify(grid)
}

function runVoidMutation(literal) {
  const rooms = JSON.parse(String(literal))
  const ret = setZeroesInPlace(rooms)
  if (ret !== undefined) throw new Error('void-mutation reference must return undefined (got ' + JSON.stringify(ret) + ')')
  return rooms
}

function matchVoidMutation(mutated, expectedLiteral) {
  return JSON.stringify(mutated) === JSON.stringify(JSON.parse(String(expectedLiteral)))
}

function toTests(grids) {
  return grids.map((grid) => {
    const expected = outLiteral(oracleRowColSets(grid))
    if (!matchVoidMutation(runVoidMutation(outLiteral(grid)), expected)) {
      throw new Error('void-mutation runner mismatch on ' + outLiteral(grid))
    }
    return { args: [outLiteral(grid)], expected }
  })
}

function isShape(signature, paramTypes, returnType) {
  if (!signature || !Array.isArray(signature.params)) return false
  if (signature.params.length !== paramTypes.length) return false
  for (let i = 0; i < paramTypes.length; i++) {
    if (!signature.params[i] || signature.params[i].type !== paramTypes[i]) return false
  }
  return signature.return === returnType
}

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  }
}

function inputLine(signature, args) {
  return signature.params.map((p, i) => (p.name || 'arg' + i) + ' = ' + args[i]).join(', ')
}

function buildVariant(spec) {
  const tests = spec.tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
  const first = tests[0]
  return {
    id: spec.id,
    seedLabel: spec.seedLabel,
    intent: spec.intent,
    difficulty: DIFFICULTY,
    title: spec.title,
    statement: spec.statement,
    signature: cloneSignature(spec.signature),
    examples: [{ input: inputLine(spec.signature, first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: spec.hints.slice(0, 2),
  }
}

// Live-forge-compatible builder: (problem, signature, rng) => 3 variants.
// Returns [] on an incompatible signature (never builds against it).
// Deterministic: fixed matrices, no RNG and no Date (rng accepted, ignored).
export function buildSetMatrixZeroesVariants(problem, signature, rng) {
  void rng
  try {
    const sig = signature || (problem && problem.signature) || SIGNATURE
    if (!isShape(sig, ['int[][]'], 'void')) return []
    const base = String((problem && (problem.title || problem.slug)) || 'Set Matrix Zeroes')
    const difficulty =
      problem && (problem.difficulty === 'Easy' || problem.difficulty === 'Hard')
        ? problem.difficulty
        : DIFFICULTY
    const sourced = [[1, 1, 1], [1, 0, 1], [1, 1, 1]]
    return [
      buildVariant({
        id: 'v1', seedLabel: 'fresh 3x3 and 3x4', intent: INTENT_SAME, difficulty,
        title: base + ' — fresh matrices (generated, same in-place task)',
        statement:
          'Mutate matrix in place with setZeroes(matrix): when a cell holds 0, its whole row and column become 0. ' +
          'The first test is the sourced 3x3 example; the rest are fresh generated matrices with interior and strip zeroes. ' +
          'Expected values are the post-call mutated matrices.',
        signature: sig,
        tests: toTests([
          sourced,
          [[2, 1, 0, 4], [5, 6, 7, 8], [9, 0, 3, 1]],
          [[0, 1, 2], [3, 4, 5], [6, 7, 8]],
          [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        ]),
        hints: [
          'Record first, zero later: scan the whole matrix before writing anything except markers.',
          'Row 0 and column 0 are marker storage, so their own zeroes need the two saved flags.',
        ],
      }),
      buildVariant({
        id: 'v2', seedLabel: 'edges 1x1 1xN Nx1', intent: INTENT_EDGE, difficulty,
        title: base + ' — edge cases (generated, same in-place task)',
        statement:
          'Same in-place zeroing task with generated boundary matrices: a lone zero cell, a lone nonzero cell, a single row, a single column, and a zero-free 2x2 that must stay unchanged. ' +
          'With no interior the marker loops are empty, so only the saved strip flags can fire.',
        signature: sig,
        tests: toTests([
          [[0]],
          [[5]],
          [[2, 0, 5]],
          [[1], [0], [3]],
          [[1, 2], [3, 4]],
        ]),
        hints: [
          'With m = 1 there are no rows 1..m-1: which flag decides the answer?',
          'A zero-free matrix has no markers and no flags, so every cell keeps its value.',
        ],
      }),
      buildVariant({
        id: 'v3', seedLabel: 'origin-zero traps', intent: INTENT_ADVERSARIAL, difficulty,
        title: base + ' — adversarial origin traps (generated, same in-place task)',
        statement:
          'Same in-place zeroing task, same signature, no rule change (generated): the only zero sits at (0,0), where both marker strips and both flags overlap. ' +
          'Row 0 and column 0 must both end zeroed while the interior stays untouched. ' +
          'Skipping the strips or zeroing on the fly both fail here.',
        signature: sig,
        tests: toTests([
          [[0, 1, 2], [3, 4, 5], [6, 7, 8]],
          [[1, 0], [2, 3]],
          [[0, 1], [2, 3]],
          [[0, 0], [0, 0]],
        ]),
        hints: [
          '(0,0) is marker storage AND a real zero: the two off-matrix flags are the only honest memory of it.',
          'Zeroing on the fly while scanning creates fake zeroes the scan later discovers: mark first, zero after.',
        ],
      }),
    ]
  } catch {
    return []
  }
}

export const SETMATRIXZEROES_FORGE = Object.freeze({
  slug: SLUG,
  builder: 'buildSetMatrixZeroesVariants',
  pattern: 'matrix',
  profile: 'void-mutation(int[][])',
})

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oracleRowColSets (row/column sets then one sweep; frame emitter uses first-row/column markers)',
})
