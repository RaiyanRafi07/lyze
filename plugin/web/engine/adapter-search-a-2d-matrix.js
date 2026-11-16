/**
 * search-a-2d-matrix — standalone walkthrough adapter (batch13).
 *
 * Flattened binary search: the m*n matrix is sorted in row-major order, so
 * flat index k holds matrix[k/cols][k%cols] and the whole matrix behaves like
 * one sorted array of length rows*cols. Probe flat mid, decode to (r,c), drop
 * the provably wrong half; a hit returns true, an empty window proves absence.
 *
 * Staged source: .workers/jobs/question-owners-150/search-a-2d-matrix/search-a-2d-matrix.adapter.mjs
 * (build/frames/steps/notes, code blocks, lesson, explain) — reshaped into the
 * live adapter contract (signature/lesson/explain/explainLines/code/build).
 * Code blocks, lesson and explain are byte-faithful to staged; explainLines is
 * converted 1:1 from staged index-aligned arrays to index-keyed objects (the
 * form semantic.js resolveLineExplain reads). Uses the shared semantic-core
 * code/frame helpers (every staged line already carries a [step] tag).
 * Official example 1 emits 9 frames, so no host compaction applies.
 *
 * Signature equals the live judge signature exactly:
 * searchMatrix(matrix: int[][], target: int) -> boolean (plugin/data/shard-5.json).
 */

import { code, frame, boundedFrames } from './semantic-core.js'

void boundedFrames

const MAX_SIDE = 6

function decodeArgs(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('Provide [matrix, target] for this walkthrough')
  const matrix = args[0]
  const target = args[1]
  if (!Array.isArray(matrix) || matrix.length === 0) throw new Error('matrix must be a non-empty int[][] array')
  if (matrix.length > MAX_SIDE) throw new Error('Visual walkthrough limited to ' + MAX_SIDE + ' rows (got ' + matrix.length + '); narrow the input')
  if (!Array.isArray(matrix[0]) || matrix[0].length === 0) throw new Error('Every matrix row must be a non-empty array')
  const cols = matrix[0].length
  if (cols > MAX_SIDE) throw new Error('Visual walkthrough limited to ' + MAX_SIDE + ' columns (got ' + cols + '); narrow the input')
  const source = matrix.map((row, r) => {
    if (!Array.isArray(row) || row.length !== cols) throw new Error('Matrix must be rectangular: row 0 has ' + cols + ' columns but row ' + r + ' differs')
    return row.map((cell, c) => {
      if (typeof cell !== 'number' || !Number.isSafeInteger(cell)) throw new Error('matrix[' + r + '][' + c + '] must be an integer')
      return cell
    })
  })
  if (!Number.isSafeInteger(target)) throw new Error('target must be an integer')
  return { source, target }
}

const searchMatrixJava = code(`
[def] class Solution {
[def]     public boolean searchMatrix(int[][] matrix, int target) {
[init]         int rows = matrix.length, cols = matrix[0].length;
[init]         int lo = 0, hi = rows * cols - 1;
[probe]         while (lo <= hi) {
[probe]             int mid = lo + (hi - lo) / 2;
[probe]             int val = matrix[mid / cols][mid % cols];
[hit]             if (val == target) return true;
[keep]             if (val > target) hi = mid - 1;
[drop]             else lo = mid + 1;
[def]         }
[miss]         return false;
[def]     }
[def] }
`)

const searchMatrixCpp = code(`
[def] class Solution {
[def] public:
[def]     bool searchMatrix(vector<vector<int>>& matrix, int target) {
[init]         int rows = (int)matrix.size(), cols = (int)matrix[0].size();
[init]         int lo = 0, hi = rows * cols - 1;
[probe]         while (lo <= hi) {
[probe]             int mid = lo + (hi - lo) / 2;
[probe]             int val = matrix[mid / cols][mid % cols];
[hit]             if (val == target) return true;
[keep]             if (val > target) hi = mid - 1;
[drop]             else lo = mid + 1;
[def]         }
[miss]         return false;
[def]     }
[def] };
`)

const searchMatrixPseudo = code(`
[def] searchMatrix(matrix, target):
[init]   rows = len(matrix); cols = len(matrix[0])
[init]   lo = 0; hi = rows * cols - 1
[probe]   while lo <= hi:
[probe]     mid = lo + (hi - lo) // 2
[probe]     val = matrix[mid // cols][mid % cols]
[hit]     if val == target: return true
[keep]     if val > target: hi = mid - 1
[drop]     else: lo = mid + 1
[miss]   return false
`)

function build(args) {
  const { source, target } = decodeArgs(args)
  const rows = source.length
  const cols = source[0].length
  const total = rows * cols
  const frames = []
  const probed = []
  const path = []
  const state = (current, vars) => ({
    current,
    cells: source.map((row) => row.slice()),
    filled: probed.map((p) => p.slice()),
    reads: probed.map((p) => p.slice()),
    frontier: [],
    path: path.map((p) => p.slice()),
    answer: [],
    vars: { rows, cols, total, target, ...vars }
  })
  const push = (step, label, note, current, vars = {}) =>
    frames.push(frame(step, label, note, state(current, vars)))

  let lo = 0
  let hi = total - 1
  push('init', 'Set flat window', 'rows=' + rows + ' cols=' + cols + '; lo=0 hi=' + hi + ' over ' + total + ' cells; target=' + target, null, { lo, hi })

  let result = false
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2)
    const r = Math.floor(mid / cols)
    const c = mid % cols
    const val = source[r][c]
    probed.push([r, c])
    path.push([r, c])
    push('probe', 'Probe flat mid=' + mid, 'mid=' + mid + ' -> (' + r + ',' + c + ')=' + val + ' vs target=' + target + ' in [' + lo + ',' + hi + ']', [r, c], { lo, hi, mid, r, c, val })
    if (val === target) {
      result = true
      push('hit', 'Report found', 'matrix[' + r + '][' + c + ']=' + val + '==target; return true', [r, c], { lo, hi, mid, r, c, val })
      break
    } else if (val > target) {
      hi = mid - 1
      push('keep', 'Drop right half', val + '>target: hi=' + mid + '-1=' + hi + ' keep [' + lo + ',' + hi + ']', [r, c], { lo, hi, mid, r, c, val })
    } else {
      lo = mid + 1
      push('drop', 'Drop left half', val + '<target: lo=' + mid + '+1=' + lo + ' keep [' + lo + ',' + hi + ']', [r, c], { lo, hi, mid, r, c, val })
    }
  }
  if (!result) {
    push('miss', 'Report absent', 'lo=' + lo + '>hi=' + hi + ': window empty, target missing; return false', null, { lo, hi })
  }
  // Full event list: the host performs the single honest compaction pass.
  return {
    kind: 'grid',
    layout: { rows, cols, cells: source.map((row) => row.slice()) },
    frames,
    result
  }
}

export const adapters = {
  'search-a-2d-matrix': {
    signature: { name: 'searchMatrix', params: ['int[][]', 'int'], return: 'boolean' },
    lesson: {
      idea: 'Treat the row-major matrix as one sorted array of length rows*cols: probe flat mid and decode it to matrix[mid/cols][mid%cols].',
      trap: 'Searching rows then columns as two loops is O(log m + log n) thinking but the required bound is one O(log(m*n)) pass; also mid/cols vs mid%cols swapped decodes the wrong cell.',
      time: 'O(log(m*n))',
      space: 'O(1)'
    },
    // Per-step explanations (presentation metadata, never compiled).
    // Staged source: search-a-2d-matrix.adapter.mjs (explain verbatim).
    explain: {
      def: 'Structural wrapper: declares the class and method scope; no matrix operation runs here.',
      init: 'Initialize the live flat window [lo..hi] over all rows*cols cells; the sorted row-major invariant holds from here on.',
      probe: 'Probe the flat midpoint, decode mid to (mid/cols, mid%cols), and read that single cell against target.',
      hit: 'Equality probe: the only read that can return true; a hit ends the search immediately.',
      keep: 'Cell value exceeds target, so the flat right half cannot hold it; discard it with hi=mid-1.',
      drop: 'Cell value is below target, so the flat left half cannot hold it; discard it with lo=mid+1.',
      miss: 'Exhaustion exit: the flat window is empty, so target is absent; report false.'
    },
    // Converted 1:1 from the staged index-aligned explainLines arrays (14/15/10).
    explainLines: {
      java: {
        0: 'Class wrapper holding the LeetCode entry point; no execution by itself.',
        1: 'Entry point: receives the row-major sorted matrix and the wanted target; returns a boolean.',
        2: 'rows and cols fix the flat decoding used for every probe below.',
        3: 'lo starts at flat 0 and hi at the last flat index: the live window covers every cell.',
        4: 'Loop while the live flat window is non-empty; an empty window proves absence.',
        5: 'mid is the floor midpoint of [lo..hi]; the lo+(hi-lo)/2 form never overflows.',
        6: 'Decode mid to row mid/cols and column mid%cols and read that one cell.',
        7: 'Equality probe: the only read that can return; a hit reports true at once.',
        8: 'Cell above target: the flat right half is sorted-above target, so drop it.',
        9: 'Otherwise the cell is below target: the flat left half is sorted-below it, so drop it.',
        10: 'Close of the loop body; the invariant is restored for the smaller window.',
        11: 'Exhaustion exit: the window is empty, so target is absent; report false.',
        12: 'Close of the method scope.',
        13: 'Close of the class scope.'
      },
      cpp: {
        0: 'Class wrapper holding the LeetCode entry point; no execution by itself.',
        1: 'Access specifier: exposes the method exactly as the judge calls it.',
        2: 'Entry point: matrix reference plus target; returns a boolean.',
        3: 'rows and cols fix the flat decoding; the casts keep signed index arithmetic safe.',
        4: 'lo starts at flat 0 and hi at the last flat index: the live window covers every cell.',
        5: 'Loop while the live flat window is non-empty; an empty window proves absence.',
        6: 'mid is the floor midpoint of [lo..hi]; the lo+(hi-lo)/2 form never overflows.',
        7: 'Decode mid to row mid/cols and column mid%cols and read that one cell.',
        8: 'Equality probe: the only read that can return; a hit reports true at once.',
        9: 'Cell above target: the flat right half is sorted-above target, so drop it.',
        10: 'Otherwise the cell is below target: the flat left half is sorted-below it, so drop it.',
        11: 'Close of the loop body; the invariant is restored for the smaller window.',
        12: 'Exhaustion exit: the window is empty, so target is absent; report false.',
        13: 'Close of the method scope.',
        14: 'Close of the class scope.'
      },
      pseudo: {
        0: 'Function header: names the inputs matrix and target and the boolean contract.',
        1: 'rows and cols fix the flat decoding used for every probe below.',
        2: 'lo starts at flat 0 and hi at the last flat index: the window covers every cell.',
        3: 'Loop while candidates remain; exit means the flat window is empty.',
        4: 'Pick the floor midpoint of [lo..hi]; the probe index for this iteration.',
        5: 'Decode mid to (mid//cols, mid%cols) and read that one cell.',
        6: 'Equality probe: a hit returns true at once; otherwise a half is dropped.',
        7: 'Cell above target: drop the flat right half with hi=mid-1.',
        8: 'Otherwise the cell is below target: drop the flat left half with lo=mid+1.',
        9: 'Exhaustion exit: no candidate left, so report false.'
      }
    },
    code: { java: searchMatrixJava, cpp: searchMatrixCpp, pseudo: searchMatrixPseudo },
    build
  }
}

export const visualBounds = { maxSide: MAX_SIDE }
