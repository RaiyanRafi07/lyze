// Portable per-slug staged adapter for rotate-image (NeetCode150, Matrix).
// Additive only: no shared family module is copied and no integrated source is edited.
// Integrator wiring is documented in integration.json in this folder.
// Convention follows .workers/jobs/neetcode150-completion/valid-sudoku/adapter-valid-sudoku.mjs
// (import semantic-core helpers, export `adapters` keyed by slug, build() returns full honest
// event list; the single compaction pass is boundedFrames from semantic-core).
//
// Problem: rotate(matrix: int[][]) -> void. Square n x n matrix, rotated 90 degrees
// clockwise IN PLACE. The shard record (plugin/data/shard-5.json, id 48) carries
// judge: null, so there is no official signature/tests to match; the signature below
// is the real LeetCode method profile taken from the raw problem snippets
// (raw/merged_problems.json problem_slug rotate-image: `void rotate(int[][])` /
// `void rotate(vector<vector<int>>&)`), and practice tests use a PROPOSED mutation
// profile (compare the post-call matrix, mode "exact"). Never presented as official.
import { code, frame, boundedFrames } from './semantic-core.js';

export const SLUG = 'rotate-image';

// Real LeetCode method profile from the raw problem snippets (void, in place).
export const SIGNATURE = {
  name: 'rotate',
  params: [{ name: 'matrix', type: 'int[][]' }],
  return: 'void',
};

// Visual bound (honest disclosure): walkthrough grids are limited to 6x6.
// The problem constraints allow n up to 20; larger inputs are rejected, never truncated.
const MAX_SIDE = 6;

export function decodeRotateMatrix(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Rotate Image walkthrough needs a non-empty square matrix with 1..6 rows');
  }
  if (value.length > MAX_SIDE) {
    throw new Error('Visual grids are limited to 6 rows (got ' + value.length + '); larger grids are rejected, never truncated');
  }
  if (!Array.isArray(value[0])) throw new Error('Every matrix row must be an array');
  const n = value.length;
  if (value[0].length !== n) {
    throw new Error('Rotate Image needs a square matrix: row 0 has ' + value[0].length + ' columns but n = ' + n);
  }
  return value.map((row, r) => {
    if (!Array.isArray(row) || row.length !== n) {
      throw new Error('Matrix must be square: row 0 has ' + n + ' columns but row ' + r + ' has ' + (Array.isArray(row) ? row.length : 'non-array'));
    }
    return row.map((cell, c) => {
      if (typeof cell !== 'number' || !Number.isSafeInteger(cell)) {
        throw new Error('matrix[' + r + '][' + c + '] must be an integer');
      }
      return cell;
    });
  });
}

// Reference implementation: layer-by-layer in-place 4-way rotation (clockwise).
// Mirrors reference.java / reference.cpp in this folder exactly. Mutates `matrix`.
export function rotateImage(matrix) {
  const src = decodeRotateMatrix(matrix);
  for (let r = 0; r < src.length; r++) {
    for (let c = 0; c < src.length; c++) matrix[r][c] = src[r][c];
  }
  const n = matrix.length;
  for (let l = 0; l < Math.floor(n / 2); l++) {
    const last = n - 1 - l;
    for (let i = l; i < last; i++) {
      const tmp = matrix[l][i];
      matrix[l][i] = matrix[n - 1 - i][l];
      matrix[n - 1 - i][l] = matrix[last][n - 1 - i];
      matrix[last][n - 1 - i] = matrix[i][last];
      matrix[i][last] = tmp;
    }
  }
}

// Independent oracle: transpose + reverse-each-row on a COPY (different algorithm,
// never mutates its input). Cross-checked against rotateImage in selfcheck.
export function oracleRotate(matrix) {
  const src = decodeRotateMatrix(matrix);
  const n = src.length;
  const out = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => src[n - 1 - c][r]));
  return out;
}

const rotateJava = code(`
[def] class Solution {
[def]     public void rotate(int[][] matrix) {
[init]         int n = matrix.length;
[layer]         for (int l = 0; l < n / 2; l++) {
[layer]             int last = n - 1 - l;
[swap]             for (int i = l; i < last; i++) {
[swap]                 int tmp = matrix[l][i];
[swap]                 matrix[l][i] = matrix[n - 1 - i][l];
[swap]                 matrix[n - 1 - i][l] = matrix[last][n - 1 - i];
[swap]                 matrix[last][n - 1 - i] = matrix[i][last];
[swap]                 matrix[i][last] = tmp;
[swap]             }
[layer]         }
[done]         // in place: nothing to return
[def]     }
[def] }
`);

const rotateCpp = code(`
[def] class Solution {
[def] public:
[def]     void rotate(vector<vector<int>>& matrix) {
[init]         int n = (int)matrix.size();
[layer]         for (int l = 0; l < n / 2; l++) {
[layer]             int last = n - 1 - l;
[swap]             for (int i = l; i < last; i++) {
[swap]                 int tmp = matrix[l][i];
[swap]                 matrix[l][i] = matrix[n - 1 - i][l];
[swap]                 matrix[n - 1 - i][l] = matrix[last][n - 1 - i];
[swap]                 matrix[last][n - 1 - i] = matrix[i][last];
[swap]                 matrix[i][last] = tmp;
[swap]             }
[layer]         }
[done]         // in place: nothing to return
[def]     }
[def] };
`);

const rotatePseudo = code(`
[def] rotate(matrix):
[init]   n = matrix.length
[layer]   for l = 0 .. floor(n / 2) - 1:
[layer]     last = n - 1 - l
[swap]     for i = l .. last - 1:
[swap]       tmp = matrix[l][i]
[swap]       matrix[l][i] = matrix[n - 1 - i][l]
[swap]       matrix[n - 1 - i][l] = matrix[last][n - 1 - i]
[swap]       matrix[last][n - 1 - i] = matrix[i][last]
[swap]       matrix[i][last] = tmp
[done]   return nothing; matrix is rotated in place
`);

const EXPLAIN = {
  def: 'Scope of the in-place clockwise rotation task; execution starts in the body. Nothing is returned.',
  init: 'Read n from the matrix itself. A square n x n grid rotates in floor(n/2) layers.',
  layer: 'Announce ring l with far edge last = n-1-l: this pass rotates the ring cells group by group.',
  swap: 'Rotate one 4-cycle group clockwise: save top, move left to top, bottom to left, right to bottom, saved top to right.',
  done: 'Conclusion of the in-place pass: every ring cell holds its rotated value; the caller sees the mutated matrix.',
};

export const EXPLAIN_LINES = {
  java: {
    14: 'End of the layer loop: no fresh ring remains, so control falls through to the end.',
    16: 'End of the method scope; the matrix argument itself now holds the rotated image.',
    17: 'End of the class scope; it performs no algorithm operation.',
  },
  cpp: {
    15: 'End of the layer loop: no fresh ring remains, so control falls through to the end.',
    17: 'End of the method scope; the matrix argument itself now holds the rotated image.',
    18: 'End of the class scope; it performs no algorithm operation.',
  },
  pseudo: {},
};

// Every frame below is a REAL execution event: init, one layer announcement per
// ring, one swap event per 4-cycle group, plus done. Each swap frame snapshots the
// working matrix AFTER that group rotated, so cells in `filled` already hold their
// final rotated values. No future groups are revealed early.
function build(args) {
  const source = decodeRotateMatrix(args[0]);
  const n = source.length;
  const work = source.map((row) => row.slice());
  const filled = [];
  const reads = [];
  const frames = [];
  const anchors = [];
  let groups = 0;

  const snapshot = () => work.map((row) => row.slice());
  const state = (current, vars) => {
    const s = {
      cells: snapshot(),
      filled: filled.map((p) => p.slice()),
      reads: reads.map((p) => p.slice()),
      frontier: [],
      vars: { n, groups, ...vars },
    };
    if (current) s.current = current.slice();
    return s;
  };
  const push = (step, label, note, current, vars) =>
    frames.push(frame(step, label, note, state(current, vars)));

  push('init', 'Read n = ' + n, 'Square ' + n + 'x' + n + ' grid: floor(' + n + '/2) = ' + Math.floor(n / 2) + ' layer(s), nothing moved yet.', null, { l: 0, i: 0 });
  const layers = Math.floor(n / 2);
  for (let l = 0; l < layers; l++) {
    const last = n - 1 - l;
    push('layer', 'Start ring ' + (l + 1) + '/' + layers, 'Ring l=' + l + ', far edge last=' + last + ': rotate cells with row/col ' + l + '..' + last + '.', [l, l], { l, last });
    for (let i = l; i < last; i++) {
      const top = [l, i];
      const right = [i, last];
      const bottom = [last, n - 1 - i];
      const left = [n - 1 - i, l];
      const group = [top, right, bottom, left];
      const before = [work[top[0]][top[1]], work[right[0]][right[1]], work[bottom[0]][bottom[1]], work[left[0]][left[1]]];
      const tmp = work[l][i];
      work[l][i] = work[n - 1 - i][l];
      work[n - 1 - i][l] = work[last][n - 1 - i];
      work[last][n - 1 - i] = work[i][last];
      work[i][last] = tmp;
      groups++;
      for (const p of group) {
        filled.push(p);
        reads.push(p);
      }
      anchors.push(frames.length);
      const s = {
        cells: snapshot(),
        filled: filled.map((p) => p.slice()),
        reads: reads.map((p) => p.slice()),
        frontier: [],
        current: top.slice(),
        group: group.map((p) => p.slice()),
        vars: { n, l, last, i, tmp, before: before.slice(), groups, total: totalGroups(n) },
      };
      frames.push(frame(
        'swap',
        'Rotate group ' + groups + '/' + totalGroups(n),
        'T(' + top[0] + ',' + top[1] + ')=' + before[0] + ' R(' + right[0] + ',' + right[1] + ')=' + before[1] +
        ' B(' + bottom[0] + ',' + bottom[1] + ')=' + before[2] + ' L(' + left[0] + ',' + left[1] + ')=' + before[3] + ' cycle clockwise.',
        s,
      ));
    }
  }
  push('done', 'Rotated in place', n + 'x' + n + ' done: ' + groups + ' group(s) in ' + layers + ' ring(s); matrix mutated, nothing returned.', null, { result: snapshot() });
  return {
    kind: 'grid',
    layout: { rows: n, cols: n, cells: source.map((row) => row.slice()) },
    frames,
    anchors,
    result: work.map((row) => row.slice()),
  };
}

function totalGroups(n) {
  let total = 0;
  for (let l = 0; l < Math.floor(n / 2); l++) total += (n - 1 - 2 * l);
  return total;
}

// Live-forge-compatible entry: buildScene(problem, options) -> CONTRACTS section 4
// scene (v 1, kind grid, 6..40 frames) or null. Pure, synchronous, never throws.
// Accepts a full shard record (judge tests or examples) or a direct { matrix } / [matrix].
export function buildScene(problem, options = {}) {
  try {
    const direct =
      (options && Array.isArray(options.matrix)) ? options.matrix
        : (problem && Array.isArray(problem.matrix)) ? problem.matrix
          : null;
    let matrixValue = direct;
    if (!matrixValue) {
      const rawArgs = (options && Array.isArray(options.args))
        ? options.args
        : (problem && problem.judge && Array.isArray(problem.judge.tests) && problem.judge.tests[0]
          ? problem.judge.tests[0].args : null);
      if (Array.isArray(rawArgs) && rawArgs.length >= 1) {
        try {
          matrixValue = JSON.parse(rawArgs[0]);
        } catch {
          matrixValue = null;
        }
      }
      if (!matrixValue && problem && Array.isArray(problem.examples) && problem.examples[0]) {
        const m = /matrix\s*=\s*(\[[\s\S]*\])/.exec(problem.examples[0].input || '');
        if (m) {
          try {
            matrixValue = JSON.parse(m[1]);
          } catch {
            matrixValue = null;
          }
        }
      }
      if (!matrixValue) return null;
    }
    const built = build([matrixValue]);
    // Single compaction pass (mirrors semantic.js): full honest events in,
    // at most 40 frames out; anchors (swap groups) survive when budget allows.
    let { frames } = boundedFrames(built.frames, 40, built.anchors || []);
    if (frames.length < 6) {
      // Same short-run rule as sibling adapters: honest context cards repeating real
      // snapshots, explicitly not extra operations.
      const raw = Array.isArray(matrixValue) && matrixValue.length > 0
        ? 'matrix ' + matrixValue.length + 'x' + matrixValue.length + ', in place, void return'
        : 'square matrix';
      const first = frames[0];
      const last = frames[frames.length - 1];
      const context = [
        { ...first, label: 'Context: input', note: String(raw).slice(0, 140) },
        { ...first, label: 'Context: task', note: 'Rotate the image 90 degrees clockwise without a second matrix.' },
        { ...first, label: 'Context: invariant', note: 'Each 4-cycle writes final values; finished rings never move again.' },
        { ...last, label: 'Context: returned value', note: 'void: the input matrix itself now holds the rotated image.' },
      ];
      const needed = 6 - frames.length;
      frames = [...context.slice(0, Math.min(needed, 3)), ...frames, ...context.slice(3, needed > 3 ? 4 : 3)];
    }
    return {
      v: 1,
      kind: 'grid',
      title: 'Rotate Image — ring by ring, four cells at a time',
      subtitle: 'Each group cycles top, right, bottom, left clockwise',
      pattern: 'matrix',
      camera: { yaw: 0.46, pitch: 0.64, dist: 12 },
      layout: { rows: built.layout.rows, cols: built.layout.cols, cells: built.layout.cells },
      frames: frames.map((f) => ({ ...f, note: String(f.note).slice(0, 140) })),
    };
  } catch {
    return null;
  }
}

export const adapters = {
  'rotate-image': {
    // Real LeetCode method profile (void, in place). The shard record keeps
    // judge: null; this profile is proposed for practice/mutation judging only.
    signature: { name: 'rotate', params: ['int[][]'], return: 'void' },
    lesson: {
      idea: 'Rotate ring by ring: for ring l with far edge last = n-1-l, cycle each group (top (l,i), right (i,last), bottom (last,n-1-i), left (n-1-i,l)) clockwise with one saved tmp. Each group lands final, so no cell is touched twice.',
      trap: 'The mirror indices must all use n-1: left is (n-1-i, l), not (i, l), and bottom is (last, n-1-i), not (last, i). The loop stops at i < last (not <=), and inner rings start at l, not 0, or finished cells get rewritten.',
      time: 'O(n^2): each of the n^2 cells moves exactly once.',
      space: 'O(1) extra besides one tmp variable; the matrix itself is the output.',
      alt: 'Transpose then reverse each row: swap matrix[r][c] with matrix[c][r] for c > r, then reverse every row in place. Same O(n^2) time and O(1) extra space, but two simpler passes instead of one 4-way cycle.',
    },
    code: { java: rotateJava, cpp: rotateCpp, pseudo: rotatePseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
};
