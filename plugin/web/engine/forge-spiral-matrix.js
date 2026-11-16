/**
 * spiral-matrix — portable standalone practice builder (neetcode150-completion).
 *
 * Produces exactly 3 deterministic variants for slug `spiral-matrix`
 * (Spiral Matrix, Medium, spiralOrder(int[][])->int[], mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * spiralDirectionWalk below (direction-vector + visited-set walk), a
 * DISTINCT algorithm from the lesson's boundary-layer top/right/bottom/left
 * walkthrough.
 *
 * Staged source: .workers/jobs/neetcode150-completion/spiral-matrix/practice-spiral-matrix.mjs
 * (rows, statements, hints, oracle); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (same-task practice only, no rule change).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'spiral-matrix'
export const SIGNATURE = Object.freeze({
  name: 'spiralOrder',
  params: Object.freeze([{ name: 'matrix', type: 'int[][]' }]),
  return: 'int[]',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different grids so you reproduce the boundary-peeling reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same task with guard-stressing shapes that punish single-bound re-entry.'

/** INDEPENDENT reference oracle: direction-vector walk with a visited set (NOT boundary layers). */
export function spiralDirectionWalk(matrix) {
  const rows = matrix.length
  const cols = matrix[0].length
  const seen = Array.from({ length: rows }, () => new Array(cols).fill(false))
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]
  let r = 0
  let c = 0
  let d = 0
  const out = []
  for (let k = 0; k < rows * cols; k += 1) {
    out.push(matrix[r][c])
    seen[r][c] = true
    let nr = r + dirs[d][0]
    let nc = c + dirs[d][1]
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || seen[nr][nc]) {
      d = (d + 1) % 4
      nr = r + dirs[d][0]
      nc = c + dirs[d][1]
    }
    r = nr
    c = nc
  }
  return out
}

export const outLiteral = (values) => '[' + values.join(',') + ']'
const arg = (matrix) => JSON.stringify(matrix)

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
    .map((matrix) => ({ args: [arg(matrix)], expected: outLiteral(spiralDirectionWalk(matrix)) }))
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

export function buildSpiralPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh numbers',
      intent: INTENT_SAME,
      title: 'Spiral Matrix — Fresh Numbers (same task)',
      statement:
        'Given an m x n matrix, return all elements of the matrix in spiral order. These fresh inputs use new values on square, wide, tall, and mixed-sign grids, so the full four-side walk runs on every layer. The signature and exact comparison are unchanged.',
      rows: [
        [[7, 8, 9], [10, 11, 12], [13, 14, 15]],
        [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]],
        [[-5, 2, 0], [-1, 4, 6], [7, -8, 3]],
        [[1, 2], [3, 4], [5, 6], [7, 8]],
      ],
      hints: [
        'Peel one outer ring at a time: top row, right column, bottom row, left column, then shrink all four bounds.',
        'After each side, shrink its bound before the next side so visited cells can never be re-entered.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Spiral Matrix — Edge Shapes (same task)',
      statement:
        'Same spiral-order task: return every element by walking the boundary inward. Inputs include the single cell, the single row, the single column, and the smallest square, which force the walk to skip sides whose guards fail. The signature and exact comparison are unchanged.',
      rows: [
        [[42]],
        [[1, 2, 3, 4, 5]],
        [[1], [2], [3], [4]],
        [[1, 2], [3, 4]],
      ],
      hints: [
        'A single row has no right, bottom, or left side to walk; the guards must skip all three after the top row.',
        'A two-by-two grid walks each side exactly once with no inner layer left over.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial guards',
      intent: INTENT_ADVERSARIAL,
      title: 'Spiral Matrix — Adversarial Guards (same task)',
      statement:
        'SAME TASK, harder shapes: return all elements in spiral order. Flat, tall, and odd-layered grids punish solutions that re-enter the bottom row or left column without re-checking both bounds — the middle strip would repeat. No rule change: the signature and exact comparison are unchanged.',
      rows: [
        [[1, 2, 3], [4, 5, 6]],
        [[1, 2], [3, 4], [5, 6]],
        [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15], [16, 17, 18, 19, 20], [21, 22, 23, 24, 25]],
        [[9], [8], [7], [6], [5], [4]],
      ],
      hints: [
        'Re-check both bounds before the bottom row and again before the left column, not just one of them.',
        'Picture the final inner strip: when one row or one column remains, only one side of the ring may legally run.',
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
  oracle: 'spiralDirectionWalk (direction-vector + visited set; boundary layers used only in walkthrough)',
})
