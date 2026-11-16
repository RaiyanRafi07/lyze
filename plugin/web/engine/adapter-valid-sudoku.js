// Portable per-slug staged adapter for valid-sudoku (NeetCode150, Arrays & Hashing).
// Additive only: no shared family module is copied and no integrated source is edited.
//
// Problem: isValidSudoku(board: char[][]) -> boolean. 9x9 board, only filled cells
// are validated against row / column / 3x3-box uniqueness. Dots '.' are skipped.
// Live record: plugin/data/shard-5.json (id 36, Medium, pattern matrix),
// judge mode exact with two official tests; the signature below equals the live
// judge signature exactly (name/return/param types).
import { code, frame, boundedFrames } from './semantic-core.js';

export const SLUG = 'valid-sudoku';

// Live judge signature (object form). The adapters entry below carries the same
// profile in the string-array params form semantic.js compares against.
export const SIGNATURE = {
  name: 'isValidSudoku',
  params: [{ name: 'board', type: 'char[][]' }],
  return: 'boolean',
};

const SIGNATURE_TYPES = ['char[][]'];

function decodeBoard(value) {
  if (!Array.isArray(value) || value.length !== 9) {
    throw new Error('Valid Sudoku walkthrough needs a 9x9 board (got ' + (Array.isArray(value) ? value.length : typeof value) + ' rows)');
  }
  return value.map((row, r) => {
    if (!Array.isArray(row) || row.length !== 9) {
      throw new Error('Valid Sudoku walkthrough needs 9 columns in row ' + r + ' (got ' + (Array.isArray(row) ? row.length : typeof row) + ')');
    }
    return row.map((cell, c) => {
      const s = String(cell);
      if (s !== '.' && !/^[1-9]$/.test(s)) {
        throw new Error('board[' + r + '][' + c + '] must be "." or "1"-"9" (got "' + s.slice(0, 8) + '")');
      }
      return s;
    });
  });
}

// Reference implementation: single pass with three checklist families.
// Mirrors the staged reference.java / reference.cpp exactly.
export function isValidSudoku(board) {
  const src = decodeBoard(board);
  const rowSeen = Array.from({ length: 9 }, () => new Set());
  const colSeen = Array.from({ length: 9 }, () => new Set());
  const boxSeen = Array.from({ length: 9 }, () => new Set());
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const ch = src[r][c];
      if (ch === '.') continue;
      const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      if (rowSeen[r].has(ch) || colSeen[c].has(ch) || boxSeen[b].has(ch)) return false;
      rowSeen[r].add(ch);
      colSeen[c].add(ch);
      boxSeen[b].add(ch);
    }
  }
  return true;
}

// Independent oracle: pairwise comparison inside each unit (no Sets, no filing,
// different traversal order). Cross-checked against isValidSudoku in selfcheck.
export function oracleIsValidSudoku(board) {
  const src = decodeBoard(board);
  const dup = (a, b) => a !== '.' && a === b;
  for (let r = 0; r < 9; r++) {
    for (let i = 0; i < 9; i++) {
      for (let j = i + 1; j < 9; j++) {
        if (dup(src[r][i], src[r][j])) return false;
      }
    }
  }
  for (let c = 0; c < 9; c++) {
    for (let i = 0; i < 9; i++) {
      for (let j = i + 1; j < 9; j++) {
        if (dup(src[i][c], src[j][c])) return false;
      }
    }
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const cells = [];
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) cells.push(src[br * 3 + dr][bc * 3 + dc]);
      }
      for (let i = 0; i < 9; i++) {
        for (let j = i + 1; j < 9; j++) {
          if (dup(cells[i], cells[j])) return false;
        }
      }
    }
  }
  return true;
}

const sudokuJava = code(`
[def] class Solution {
[def]     public boolean isValidSudoku(char[][] board) {
[init]         boolean[][] rowSeen = new boolean[9][9];
[init]         boolean[][] colSeen = new boolean[9][9];
[init]         boolean[][] boxSeen = new boolean[9][9];
[visit]         for (int r = 0; r < 9; r++) {
[visit]             for (int c = 0; c < 9; c++) {
[skip]                 char ch = board[r][c];
[skip]                 if (ch == '.') continue;
[visit]                 int d = ch - '1';
[visit]                 int b = (r / 3) * 3 + c / 3;
[conflict]                 if (rowSeen[r][d] || colSeen[c][d] || boxSeen[b][d]) return false;
[visit]                 rowSeen[r][d] = true;
[visit]                 colSeen[c][d] = true;
[visit]                 boxSeen[b][d] = true;
[visit]             }
[visit]         }
[done]         return true;
[def]     }
[def] }
`);

const sudokuCpp = code(`
[def] class Solution {
[def] public:
[def]     bool isValidSudoku(vector<vector<char>>& board) {
[init]         bool rowSeen[9][9] = {};
[init]         bool colSeen[9][9] = {};
[init]         bool boxSeen[9][9] = {};
[visit]         for (int r = 0; r < 9; r++) {
[visit]             for (int c = 0; c < 9; c++) {
[skip]                 char ch = board[r][c];
[skip]                 if (ch == '.') continue;
[visit]                 int d = ch - '1';
[visit]                 int b = (r / 3) * 3 + c / 3;
[conflict]                 if (rowSeen[r][d] || colSeen[c][d] || boxSeen[b][d]) return false;
[visit]                 rowSeen[r][d] = true;
[visit]                 colSeen[c][d] = true;
[visit]                 boxSeen[b][d] = true;
[visit]             }
[visit]         }
[done]         return true;
[def]     }
[def] };
`);

const sudokuPseudo = code(`
[def] isValidSudoku(board):
[init]   rowSeen = 9x9 false; colSeen = 9x9 false; boxSeen = 9x9 false
[visit]   for r = 0..8:
[visit]     for c = 0..8:
[skip]       ch = board[r][c]; if ch == '.': continue
[visit]       d = ch - '1'; b = (r // 3) * 3 + c // 3
[conflict]       if rowSeen[r][d] or colSeen[c][d] or boxSeen[b][d]: return false
[visit]       rowSeen[r][d] = colSeen[c][d] = boxSeen[b][d] = true
[visit]     end
[visit]   end
[done]   return true
`);

const EXPLAIN = {
  def: 'Scope of the validation task; execution starts in the body. Nothing is solved, only checked.',
  init: 'Allocate three 9x9 checklists (rows, columns, 3x3 boxes). All flags start clear.',
  visit: 'File digit d for this row, column, and box: none of the three lists held d, so record it.',
  skip: 'Dots are empty cells: the rules only constrain filled cells, so skip without filing.',
  conflict: 'Digit d was already filed for this row, column, or box: the board violates the rules.',
  done: 'Conclusion of the single scan: every filed digit was unique in its three units.',
};

export const EXPLAIN_LINES = {
  java: {
    15: 'End of the cell loop: all columns of this row were scanned, back to the row loop.',
    16: 'End of the row loop: every row was scanned, fall through to the verdict.',
    18: 'End of the method scope; the returned boolean is the whole answer.',
    19: 'End of the class scope; it performs no algorithm operation.',
  },
  cpp: {
    16: 'End of the cell loop: all columns of this row were scanned, back to the row loop.',
    17: 'End of the row loop: every row was scanned, fall through to the verdict.',
    19: 'End of the method scope; the returned boolean is the whole answer.',
    20: 'End of the class scope; it performs no algorithm operation.',
  },
  pseudo: {
    8: 'End of the cell loop; control returns to the row loop.',
    9: 'End of the row loop; control falls through to the verdict.',
  },
};

// Every frame below is a REAL execution event: one event per scanned cell
// (visit for a filed digit, skip for a dot), plus init / conflict / done.
// Invalid boards stop at the first duplicate, exactly like the reference code.
function build(args) {
  const source = decodeBoard(args[0]);
  const rowSeen = Array.from({ length: 9 }, () => new Set());
  const colSeen = Array.from({ length: 9 }, () => new Set());
  const boxSeen = Array.from({ length: 9 }, () => new Set());
  const firstAt = new Map(); // key row|col|box + digit -> [r, c]
  const filled = [];
  const reads = [];
  const frames = [];
  const anchors = [];
  let checked = 0;
  let skipped = 0;
  let outcome = true;

  const snapshot = () => source.map((row) => row.slice());
  const state = (current, vars) => {
    const s = {
      cells: snapshot(),
      filled: filled.map((p) => p.slice()),
      reads: reads.map((p) => p.slice()),
      frontier: [],
      vars: { checked, skipped, ...vars },
    };
    if (current) s.current = current.slice();
    return s;
  };
  const push = (step, label, note, current, vars) =>
    frames.push(frame(step, label, note, state(current, vars)));

  push('init', 'Set up three checklists', 'Row, column, and box flags start clear. Scan r=0..8, c=0..8 once.', null, {});
  for (let r = 0; r < 9 && outcome; r++) {
    for (let c = 0; c < 9 && outcome; c++) {
      const ch = source[r][c];
      reads.push([r, c]);
      checked++;
      if (ch === '.') {
        skipped++;
        push('skip', 'Skip (' + r + ',' + c + ')', "Cell is '.' (empty " + checked + '/81): nothing to file, move on.', [r, c], { r, c });
        continue;
      }
      const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      const rk = 'r' + r + ':' + ch;
      const ck = 'c' + c + ':' + ch;
      const bk = 'b' + b + ':' + ch;
      if (rowSeen[r].has(ch) || colSeen[c].has(ch) || boxSeen[b].has(ch)) {
        const where = rowSeen[r].has(ch) ? 'row' : (colSeen[c].has(ch) ? 'column' : 'box');
        const prev = firstAt.get(rowSeen[r].has(ch) ? rk : (colSeen[c].has(ch) ? ck : bk));
        outcome = false;
        anchors.push(frames.length);
        push(
          'conflict',
          "Duplicate '" + ch + "' at (" + r + ',' + c + ')',
          "'" + ch + "' already in " + where + ' ' + r + '/' + c + '/' + b + " from (" + prev[0] + ',' + prev[1] + '): stop, false.',
          [r, c],
          { r, c, d: ch, b, where, first: prev.slice() },
        );
        frames[frames.length - 1].state.blocked = [[r, c], prev.slice()];
      } else {
        rowSeen[r].add(ch);
        colSeen[c].add(ch);
        boxSeen[b].add(ch);
        firstAt.set(rk, [r, c]);
        firstAt.set(ck, [r, c]);
        firstAt.set(bk, [r, c]);
        filled.push([r, c]);
        push(
          'visit',
          "File '" + ch + "' at (" + r + ',' + c + ')',
          "Cell " + checked + "/81: '" + ch + "' free in row " + r + ', col ' + c + ', box ' + b + ': record it.',
          [r, c],
          { r, c, d: ch, b },
        );
      }
    }
  }
  push(
    'done',
    outcome ? 'Board is valid' : 'Board is invalid',
    outcome
      ? 'Checked 81 cells, filed ' + filled.length + ' digits, no clash: return true.'
      : 'Stopped at cell ' + checked + '/81 after ' + filled.length + ' filings: return false.',
    null,
    { result: outcome },
  );
  return {
    kind: 'grid',
    layout: { rows: 9, cols: 9, cells: snapshot() },
    frames,
    anchors,
    result: outcome,
  };
}

// Live-forge-compatible entry: buildScene(problem, options) -> CONTRACTS section 4
// scene (v 1, kind grid, 6..40 frames) or null. Pure, synchronous, never throws.
// Accepts a full shard record (judge test[0] args) or a direct { board } / [board].
export function buildScene(problem, options = {}) {
  try {
    const direct =
      (options && Array.isArray(options.board)) ? options.board
        : (problem && Array.isArray(problem.board)) ? problem.board
          : null;
    let boardValue = direct;
    if (!boardValue) {
      const sig = problem && problem.judge && problem.judge.signature;
      if (!sig || sig.name !== 'isValidSudoku') return null;
      const rawArgs = (options && Array.isArray(options.args))
        ? options.args
        : (problem && problem.judge && Array.isArray(problem.judge.tests) && problem.judge.tests[0]
          ? problem.judge.tests[0].args : null);
      if (!Array.isArray(rawArgs) || rawArgs.length !== 1) return null;
      try {
        boardValue = JSON.parse(rawArgs[0]);
      } catch {
        return null;
      }
    }
    const built = build([boardValue]);
    // Single compaction pass (mirrors semantic.js): full honest events in,
    // at most 40 frames out; anchors (conflict) survive when budget allows.
    let { frames } = boundedFrames(built.frames, 40, built.anchors || []);
    if (frames.length < 6) {
      // Same short-run rule as semantic.js: honest context cards repeating real
      // snapshots, explicitly not extra operations.
      const raw = (problem && problem.judge && problem.judge.tests && problem.judge.tests[0])
        ? problem.judge.tests[0].args.join('; ') : 'board 9x9';
      const first = frames[0];
      const last = frames[frames.length - 1];
      const context = [
        { ...first, label: 'Context: input', note: String(raw).slice(0, 140) },
        { ...first, label: 'Context: task', note: 'Only filled cells need row/col/box uniqueness.' },
        { ...first, label: 'Context: invariant', note: 'Three checklist families; one pass; dots skipped.' },
        { ...last, label: 'Context: returned value', note: 'Actual return value: ' + JSON.stringify(built.result) },
      ];
      const needed = 6 - frames.length;
      frames = [...context.slice(0, Math.min(needed, 3)), ...frames, ...context.slice(3, needed > 3 ? 4 : 3)];
    }
    return {
      v: 1,
      kind: 'grid',
      title: 'Valid Sudoku — one pass, three checklists',
      subtitle: 'File each digit in its row, column, and 3x3 box',
      pattern: 'matrix',
      camera: { yaw: 0.46, pitch: 0.64, dist: 12 },
      layout: { rows: 9, cols: 9, cells: built.layout.cells },
      frames: frames.map((f) => ({ ...f, note: String(f.note).slice(0, 140) })),
    };
  } catch {
    return null;
  }
}

export const adapters = {
  'valid-sudoku': {
    signature: { name: 'isValidSudoku', params: SIGNATURE_TYPES, return: 'boolean' },
    lesson: {
      idea: 'Scan all 81 cells once and file each digit in three checklists: its row, its column, and its 3x3 box (box (r/3)*3 + c/3). A digit already filed means the board is invalid. Dots are skipped; the board is checked, never solved.',
      trap: 'The box index is (r/3)*3 + c/3: swapping the divisions files digits into the wrong box. Every digit needs all three lists checked, only non-dot cells count, and the first clash must stop the scan with false.',
      time: 'O(81) = O(1): the board size is fixed, so the single pass is constant work.',
      space: 'O(81) = O(1): three 9x9 flag tables (or three families of 9 small sets).',
      alt: 'Bit masks instead of flag tables: keep one 9-bit int per row, column, and box; test and set bit d for each digit. Same single pass and same O(1) bounds, but the whole checklist state fits in 27 integers.',
    },
    code: { java: sudokuJava, cpp: sudokuCpp, pseudo: sudokuPseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
};
