/**
 * search-a-2d-matrix — portable standalone practice builder (batch13).
 *
 * Produces exactly 3 deterministic variants for slug `search-a-2d-matrix`
 * (Search a 2D Matrix, Medium, searchMatrix(int[][],int)->boolean, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by matrixOracle
 * below (brute-force flat scan), an INDEPENDENT implementation of the same
 * operation (not the walkthrough's flat binary-search frame emitter).
 *
 * Staged source: .workers/jobs/question-owners-150/search-a-2d-matrix/practice.json
 * (sets corner-hits / gap-misses / thin-matrices, hints, stored expectations) —
 * reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Stored expectations re-verified against the oracle at build time; a mismatch
 * throws instead of shipping a wrong literal. Variant ids are exactly v1/v2/v3
 * (source set ids kept as seedLabels).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (exact boolean match for this slug).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (boolean answers; exact match).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'search-a-2d-matrix'
export const SIGNATURE = Object.freeze({
  name: 'searchMatrix',
  params: Object.freeze([{ name: 'matrix', type: 'int[][]' }, { name: 'target', type: 'int' }]),
  return: 'boolean',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same question with adversarial placements that punish greedy shortcuts.'

/**
 * INDEPENDENT reference oracle: brute-force flat scan over every cell.
 * Never uses binary search or flat-window halving, so agreement with the
 * walkthrough adapter is genuine cross-check evidence, not shared-logic echo.
 */
export function matrixOracle(matrix, target) {
  for (const row of matrix) for (const cell of row) if (cell === target) return true
  return false
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

function toTest(matrixLiteral, targetLiteral) {
  const matrix = JSON.parse(matrixLiteral)
  const target = JSON.parse(targetLiteral)
  const expected = lit(matrixOracle(matrix, target))
  return { args: [String(matrixLiteral), String(targetLiteral)], expected }
}

function buildVariant({ id, seedLabel, intent, title, statement, rows, hints }) {
  const tests = rows
    .map(([m, t]) => toTest(m, t))
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

export function buildSearchMatrixPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'corner hits',
      intent: INTENT_SAME,
      title: 'Search a 2D Matrix — Corner Hits (matrix drill)',
      statement:
        'Same task: return true if target is in the row-major sorted matrix, else false. The first tests hunt the corner values 1 and 60 in the 3x4 example matrix, then check the gap miss 13 and the over-range miss 61.',
      rows: [
        ['[[1,3,5,7],[10,11,16,20],[23,30,34,60]]', '1'],
        ['[[1,3,5,7],[10,11,16,20],[23,30,34,60]]', '60'],
        ['[[1,3,5,7],[10,11,16,20],[23,30,34,60]]', '13'],
        ['[[1,3,5,7],[10,11,16,20],[23,30,34,60]]', '61'],
      ],
      hints: [
        'First and last cells are flat indices 0 and rows*cols-1: check what your hi starts at.',
        'A gap miss still walks the full window; absence is proven only when lo passes hi.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'gap misses',
      intent: INTENT_ADVERSARIAL,
      title: 'Search a 2D Matrix — Adversarial Gaps (matrix drill)',
      statement:
        'Same task: return true if target is in the row-major sorted matrix, else false. These targets probe adjacent-value gaps (2 between 1 and 3, 8 between 7 and 10), the out-of-range low end 0, and a mid-matrix hit on 34.',
      rows: [
        ['[[1,3,5,7],[10,11,16,20],[23,30,34,60]]', '0'],
        ['[[1,3,5,7],[10,11,16,20],[23,30,34,60]]', '2'],
        ['[[1,3,5,7],[10,11,16,20],[23,30,34,60]]', '8'],
        ['[[1,3,5,7],[10,11,16,20],[23,30,34,60]]', '34'],
      ],
      hints: [
        'Targets below the minimum and above the maximum must still terminate with an empty window.',
        'Adjacent-value gaps (2 between 1 and 3, 8 between 7 and 10) catch decoders that round mid to the wrong cell.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'thin matrices',
      intent: INTENT_EDGE,
      title: 'Search a 2D Matrix — Thin Matrices (matrix drill)',
      statement:
        'Same task on degenerate shapes with the same boolean output — no rule change. Shapes shrink to 1x1, 1x4 and 4x1, where a single probe can decide everything and a miss still walks the window to empty.',
      rows: [
        ['[[5]]', '5'],
        ['[[5]]', '4'],
        ['[[1,3,5,7]]', '5'],
        ['[[1],[10],[23],[30]]', '11'],
        ['[[1],[10],[23],[30]]', '23'],
      ],
      hints: [
        'A 1x1 matrix has lo == hi == 0: exactly one probe decides everything.',
        'A single row (or column) is the degenerate flat array: row is always 0 (or column is always 0).',
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
  oracle: 'matrixOracle (brute-force flat scan over every cell; binary search used only in walkthrough)',
})
