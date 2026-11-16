/**
 * set-matrix-zeroes — live semantic adapter (matrix, grid kind).
 *
 * Honest TEST PROFILE (judgeable: false). The live record
 * (plugin/data/shard-5.json id 73) carries judge: null: the real LeetCode
 * profile is `setZeroes(matrix: int[][]) -> void` in place, which has no
 * return literal to compare. The honest TEST PROFILE used here is the same
 * real method shape:
 *   setZeroes(matrix: int[][]) -> void
 * Every `args[0]` is the PRE-call matrix literal; every `expected` is the
 * POST-call mutated matrix literal (void return ignored; mode exact on the
 * mutated grid). Precedents: rotate(matrix: int[][])->void,
 * mergeKLists(int[][])->int[], runTrieOps(string[],string[])->string.
 * Adapter and forge signatures equal this documented profile. Never official.
 *
 * Walkthrough algorithm: O(1)-extra-space marker method (first row / first
 * column + two booleans). Every frame is produced by running this exact
 * algorithm on the actual input matrix — no invented cells, no future values.
 * O(m*n) time, O(1) space.
 *
 * Staged source: `.workers/jobs/question-owners-150/set-matrix-zeroes/`
 * `adapter.js` (marker-method reference with frame emission, sets oracle,
 * judgeSpec) — ported to the live shape: shared `code`/`frame` helpers
 * imported from semantic-core.js, no local helper redefinitions.
 *
 * Visual bound: 1..6 rows x 1..6 cols (larger inputs rejected, never cut).
 */
import { code, frame, boundedFrames } from './semantic-core.js'

// boundedFrames is applied by semantic.js (single compaction pass); the import
// keeps this adapter on the shared helper contract. Adapters return FULL lists.

export const SLUG = 'set-matrix-zeroes'

// Honest TEST PROFILE signature (see header). Host-supported types only.
export const SIGNATURE = Object.freeze({
  name: 'setZeroes',
  params: Object.freeze([{ name: 'matrix', type: 'int[][]' }]),
  return: 'void',
})

export const SIGNATURE_TYPES = ['int[][]']

const MAX_SIDE = 6

function fail(message) { throw new Error(message) }

function decodeMatrix(value) {
  if (!Array.isArray(value) || value.length === 0) fail('Provide a non-empty matrix with 1..6 rows')
  if (value.length > MAX_SIDE) fail('Visual grids limited to ' + MAX_SIDE + ' rows (got ' + value.length + '); larger grids rejected, never cut')
  if (!Array.isArray(value[0])) fail('Every matrix row must be an array')
  const cols = value[0].length
  if (cols === 0 || cols > MAX_SIDE) fail('Visual grids limited to 1..' + MAX_SIDE + ' columns (got ' + cols + ')')
  return value.map((row, r) => {
    if (!Array.isArray(row) || row.length !== cols) fail('Matrix must be rectangular: row 0 has ' + cols + ' cols but row ' + r + ' differs')
    return row.map((cell, c) => {
      if (typeof cell !== 'number' || !Number.isSafeInteger(cell)) fail('matrix[' + r + '][' + c + '] must be an integer')
      return cell
    })
  })
}

/** Real in-place reference: marker method, mutates the grid, returns undefined (void). */
export function setZeroesInPlace(matrix) {
  const m = matrix.length
  const n = matrix[0].length
  let firstRowZero = false
  let firstColZero = false
  for (let c = 0; c < n; c++) {
    if (matrix[0][c] === 0) { firstRowZero = true; break }
  }
  for (let r = 0; r < m; r++) {
    if (matrix[r][0] === 0) { firstColZero = true; break }
  }
  for (let r = 1; r < m; r++) {
    for (let c = 1; c < n; c++) {
      if (matrix[r][c] === 0) { matrix[r][0] = 0; matrix[0][c] = 0 }
    }
  }
  for (let r = 1; r < m; r++) {
    if (matrix[r][0] === 0) for (let c = 1; c < n; c++) matrix[r][c] = 0
  }
  for (let c = 1; c < n; c++) {
    if (matrix[0][c] === 0) for (let r = 1; r < m; r++) matrix[r][c] = 0
  }
  if (firstRowZero) for (let c = 0; c < n; c++) matrix[0][c] = 0
  if (firstColZero) for (let r = 0; r < m; r++) matrix[r][0] = 0
  return undefined
}

// INDEPENDENT oracle: row/column sets collected first, then one zeroing sweep
// (O(m*n) space for the sets). Different method from the walkthrough emitter.
export function oracleSetZeroesSets(input) {
  const grid = input.map((row) => row.slice())
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

const setZeroesJava = code(`
[def] class Solution {
[def]     public void setZeroes(int[][] matrix) {
[init]         int m = matrix.length, n = matrix[0].length;
[init]         boolean firstRowZero = false, firstColZero = false;
[scan]         for (int c = 0; c < n; c++) if (matrix[0][c] == 0) { firstRowZero = true; break; }
[scan]         for (int r = 0; r < m; r++) if (matrix[r][0] == 0) { firstColZero = true; break; }
[scan]         for (int r = 1; r < m; r++)
[scan]             for (int c = 1; c < n; c++)
[mark]                 if (matrix[r][c] == 0) { matrix[r][0] = 0; matrix[0][c] = 0; }
[zerorow]         for (int r = 1; r < m; r++)
[zerorow]             if (matrix[r][0] == 0) for (int c = 1; c < n; c++) matrix[r][c] = 0;
[zerocol]         for (int c = 1; c < n; c++)
[zerocol]             if (matrix[0][c] == 0) for (int r = 1; r < m; r++) matrix[r][c] = 0;
[fixrow]         if (firstRowZero) for (int c = 0; c < n; c++) matrix[0][c] = 0;
[fixcol]         if (firstColZero) for (int r = 0; r < m; r++) matrix[r][0] = 0;
[done]         return;
[def]     }
[def] }
`)

const setZeroesCpp = code(`
[def] class Solution {
[def] public:
[def]     void setZeroes(vector<vector<int>>& matrix) {
[init]         int m = (int)matrix.size(), n = (int)matrix[0].size();
[init]         bool firstRowZero = false, firstColZero = false;
[scan]         for (int c = 0; c < n; ++c) if (matrix[0][c] == 0) { firstRowZero = true; break; }
[scan]         for (int r = 0; r < m; ++r) if (matrix[r][0] == 0) { firstColZero = true; break; }
[scan]         for (int r = 1; r < m; ++r)
[scan]             for (int c = 1; c < n; ++c)
[mark]                 if (matrix[r][c] == 0) { matrix[r][0] = 0; matrix[0][c] = 0; }
[zerorow]         for (int r = 1; r < m; ++r)
[zerorow]             if (matrix[r][0] == 0) for (int c = 1; c < n; ++c) matrix[r][c] = 0;
[zerocol]         for (int c = 1; c < n; ++c)
[zerocol]             if (matrix[0][c] == 0) for (int r = 1; r < m; ++r) matrix[r][c] = 0;
[fixrow]         if (firstRowZero) for (int c = 0; c < n; ++c) matrix[0][c] = 0;
[fixcol]         if (firstColZero) for (int r = 0; r < m; ++r) matrix[r][0] = 0;
[done]         return;
[def]     }
[def] };
`)

const setZeroesPseudo = code(`
[def] setZeroes(matrix):
[init]   m = matrix.length; n = matrix[0].length
[init]   firstRowZero = false; firstColZero = false
[scan]   scan row 0 -> firstRowZero; scan column 0 -> firstColZero; scan interior from row/col 1
[mark]   for r = 1..m-1, c = 1..n-1: if matrix[r][c] == 0: mark matrix[r][0], matrix[0][c]
[zerorow]   for r = 1..m-1: if matrix[r][0] == 0: zero row r (columns 1..n-1)
[zerocol]   for c = 1..n-1: if matrix[0][c] == 0: zero column c (rows 1..m-1)
[fixrow]   if firstRowZero: zero row 0
[fixcol]   if firstColZero: zero column 0
[done]   return (matrix mutated in place)
`)

const EXPLAIN = {
  def: 'Scope of the in-place task; execution starts in the body. Nothing is solved, only flagged.',
  init: 'Remember the size and park the two off-matrix flags. No cell has been read yet.',
  scan: 'Pre-scan one strip before markers overwrite it. Reads stop at the first zero.',
  mark: 'Interior zero found: it is original (interior untouched so far), so flag its row and column.',
  zerorow: 'Row marker is set, so zero columns 1.. of that row. Markers live in column 0, never inside.',
  zerocol: 'Column marker is set, so zero rows 1.. of that column. Row-zeroing never touched row 0.',
  fixrow: 'Re-apply the saved row-0 fact after markers destroyed row 0. Nothing reads markers after this.',
  fixcol: 'Re-apply the saved column-0 fact. Independent of the row fixup, so both may run.',
  done: 'All flagged rows and columns are 0. Nothing was allocated besides the two flags.',
}

export const EXPLAIN_LINES = {
  java: {
    16: 'End of the method scope; the matrix is mutated in place, nothing is returned.',
    17: 'End of the class scope; it performs no algorithm operation.',
  },
  cpp: {
    17: 'End of the method scope; the matrix is mutated in place, nothing is returned.',
    18: 'End of the class scope; it performs no algorithm operation.',
  },
  pseudo: {},
}

const setZeroesLesson = {
  idea: 'Use row 0 and column 0 as marker storage: an interior zero flags matrix[r][0] and matrix[0][c], then flagged rows and columns are zeroed.',
  trap: 'Never zero on the fly while scanning (fake zeroes cascade), and never start the marking scan at 0 (markers look like new zeroes).',
  time: 'O(m*n): every cell is visited a constant number of times across the marking and zeroing passes.',
  space: 'O(1): the first row and column hold the markers; only two booleans remember the strips own zeroes.',
  alt: 'Two sets (flagged rows, flagged columns): one scan records every zero row/column, one sweep zeroes them. Same O(m*n) time, O(m+n) space.',
}

// Every frame below is a REAL execution event of the marker method on the
// actual input: init / scan reads, mark writes, zerorow / zerocol writes,
// fixrow / fixcol writes, done. No projected cells, no future values.
function build(args) {
  const source = decodeMatrix(args[0])
  const m = source.length
  const n = source[0].length
  const cells = source.map((row) => row.slice())
  const reads = []
  const zeroSources = []
  const markers = []
  const writes = []
  const frames = []
  const anchors = []

  const snapshot = () => cells.map((row) => row.slice())
  const state = (current, vars) => {
    const s = {
      cells: snapshot(),
      filled: writes.map((p) => p.slice()),
      reads: reads.map((p) => p.slice()),
      frontier: markers.map((p) => p.slice()),
      path: zeroSources.map((p) => p.slice()),
      zeroSources: zeroSources.map((p) => p.slice()),
      markers: markers.map((p) => p.slice()),
      writes: writes.map((p) => p.slice()),
      vars: { m, n, firstRowZero: null, firstColZero: null, ...vars },
    }
    if (current) s.current = current.slice()
    return s
  }
  const push = (step, label, note, current, vars) => {
    frames.push(frame(step, label, note, state(current, vars)))
  }
  const anchor = (steps) => {
    if (steps.includes(frames[frames.length - 1].step)) anchors.push(frames.length - 1)
  }

  push('init', 'Remember the size', 'm=' + m + ', n=' + n + '. No cell has been read yet.', null, {})

  let firstRowZero = false
  let firstColZero = false
  for (let c = 0; c < n; c++) {
    reads.push([0, c])
    if (cells[0][c] === 0) {
      firstRowZero = true
      push('scan', 'Row 0 has a zero', 'matrix[0][' + c + '] = 0, so firstRowZero = true. Rest of row 0 skipped.', [0, c], { c, firstRowZero, firstColZero })
      break
    }
    if (c === n - 1) push('scan', 'Row 0 is clean', 'No zero in row 0, so firstRowZero stays false.', [0, c], { c, firstRowZero, firstColZero })
  }
  for (let r = 0; r < m; r++) {
    reads.push([r, 0])
    if (cells[r][0] === 0) {
      firstColZero = true
      push('scan', 'Column 0 has a zero', 'matrix[' + r + '][0] = 0, so firstColZero = true. Rest of column 0 skipped.', [r, 0], { r, firstRowZero, firstColZero })
      break
    }
    if (r === m - 1) push('scan', 'Column 0 is clean', 'No zero in column 0, so firstColZero stays false.', [r, 0], { r, firstRowZero, firstColZero })
  }

  for (let r = 1; r < m; r++) {
    for (let c = 1; c < n; c++) {
      reads.push([r, c])
      if (cells[r][c] === 0) {
        zeroSources.push([r, c])
        cells[r][0] = 0
        cells[0][c] = 0
        if (!markers.some((p) => p[0] === r && p[1] === 0)) markers.push([r, 0])
        if (!markers.some((p) => p[0] === 0 && p[1] === c)) markers.push([0, c])
        push('mark', 'Mark row ' + r + ', column ' + c, 'matrix[' + r + '][' + c + '] = 0 is original: markers matrix[' + r + '][0] and matrix[0][' + c + '].', [r, c], { r, c, firstRowZero, firstColZero })
        anchor(['mark'])
      }
    }
  }
  if (m < 2 || n < 2) push('mark', 'No interior to scan', 'm=' + m + ', n=' + n + ': no interior cells, only the strip fixups below can fire.', null, { firstRowZero, firstColZero })

  for (let r = 1; r < m; r++) {
    if (cells[r][0] === 0) {
      reads.push([r, 0])
      const before = writes.length
      for (let c = 1; c < n; c++) {
        if (cells[r][c] !== 0) {
          cells[r][c] = 0
          writes.push([r, c])
        }
      }
      push('zerorow', 'Zero row ' + r, 'Marker matrix[' + r + '][0] = 0: zero columns 1..' + (n - 1) + ' of row ' + r + ' (' + (writes.length - before) + ' changed).', [r, 0], { r, firstRowZero, firstColZero })
      anchor(['zerorow'])
    }
  }
  for (let c = 1; c < n; c++) {
    if (cells[0][c] === 0) {
      reads.push([0, c])
      const before = writes.length
      for (let r = 1; r < m; r++) {
        if (cells[r][c] !== 0) {
          cells[r][c] = 0
          writes.push([r, c])
        }
      }
      push('zerocol', 'Zero column ' + c, 'Marker matrix[0][' + c + '] = 0: zero rows 1..' + (m - 1) + ' of column ' + c + ' (' + (writes.length - before) + ' changed).', [0, c], { c, firstRowZero, firstColZero })
      anchor(['zerocol'])
    }
  }
  if (firstRowZero) {
    for (let c = 0; c < n; c++) {
      if (cells[0][c] !== 0) {
        cells[0][c] = 0
        writes.push([0, c])
      }
    }
    push('fixrow', 'Zero row 0', 'firstRowZero was saved before markers overwrote row 0: zero all of row 0 now.', [0, 0], { firstRowZero, firstColZero })
    anchor(['fixrow'])
  }
  if (firstColZero) {
    for (let r = 0; r < m; r++) {
      if (cells[r][0] !== 0) {
        cells[r][0] = 0
        writes.push([r, 0])
      }
    }
    push('fixcol', 'Zero column 0', 'firstColZero was saved before markers overwrote column 0: zero all of column 0 now.', [0, 0], { firstRowZero, firstColZero })
    anchor(['fixcol'])
  }

  push('done', 'Matrix is fixed in place', 'All flagged rows/columns are 0; only the two flags were allocated.', null, { firstRowZero, firstColZero })

  return {
    kind: 'grid',
    layout: { rows: m, cols: n, cells: source.map((row) => row.slice()) },
    frames,
    anchors,
    result: cells.map((row) => row.slice()),
  }
}

// Live-forge-compatible entry: buildScene(problem, options) -> CONTRACTS
// section 4 scene (v 1, kind grid, 6..40 frames) or null. Pure, sync.
// Accepts a full shard record (judge tests[0] args) or a direct { matrix }.
export function buildScene(problem, options = {}) {
  try {
    const direct =
      (options && Array.isArray(options.matrix)) ? options.matrix
        : (problem && Array.isArray(problem.matrix)) ? problem.matrix
          : null
    let matrixValue = direct
    if (!matrixValue) {
      const sig = problem && problem.judge && problem.judge.signature
      if (sig && sig.name !== 'setZeroes') return null
      const rawArgs = (options && Array.isArray(options.args))
        ? options.args
        : (problem && problem.judge && Array.isArray(problem.judge.tests) && problem.judge.tests[0]
          ? problem.judge.tests[0].args : null)
      if (!Array.isArray(rawArgs) || rawArgs.length !== 1) return null
      try {
        matrixValue = JSON.parse(rawArgs[0])
      } catch {
        return null
      }
    }
    const built = build([matrixValue])
    // Single compaction pass (mirrors semantic.js): full honest events in,
    // at most 40 frames out; anchors (marks/zeroing/fixups) survive budget.
    let { frames } = boundedFrames(built.frames, 40, built.anchors || [])
    if (frames.length < 6) {
      // Same short-run rule as semantic.js: honest context cards repeating
      // real snapshots, explicitly not extra operations.
      const raw = (problem && problem.judge && problem.judge.tests && problem.judge.tests[0])
        ? problem.judge.tests[0].args.join('; ') : 'matrix up to 6x6'
      const first = frames[0]
      const last = frames[frames.length - 1]
      const context = [
        { ...first, label: 'Context: input', note: String(raw).slice(0, 140) },
        { ...first, label: 'Context: task', note: 'Zero the full row and column of every 0, in place.' },
        { ...first, label: 'Context: invariant', note: 'First row/column hold markers; two flags remember the strips.' },
        { ...last, label: 'Context: returned value', note: 'Actual mutated matrix: ' + JSON.stringify(built.result).slice(0, 110) },
      ]
      const needed = 6 - frames.length
      frames = [...context.slice(0, Math.min(needed, 3)), ...frames, ...context.slice(3, needed > 3 ? 4 : 3)]
    }
    return {
      v: 1,
      kind: 'grid',
      title: 'Set Matrix Zeroes — flag the strips, then zero',
      subtitle: 'Markers in row 0 / column 0 plus two flags',
      pattern: 'matrix',
      camera: { yaw: 0.46, pitch: 0.64, dist: 12 },
      layout: { rows: built.layout.rows, cols: built.layout.cols, cells: built.layout.cells },
      frames: frames.map((f) => ({ ...f, note: String(f.note).slice(0, 140) })),
    }
  } catch {
    return null
  }
}

export const adapters = {
  'set-matrix-zeroes': {
    signature: { name: SIGNATURE.name, params: SIGNATURE_TYPES, return: SIGNATURE.return },
    lesson: setZeroesLesson,
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    code: { java: setZeroesJava, cpp: setZeroesCpp, pseudo: setZeroesPseudo },
    build,
  },
}
