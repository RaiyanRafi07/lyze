/**
 * valid-sudoku — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `valid-sudoku`
 * (Valid Sudoku, Medium, isValidSudoku(char[][])->boolean, mode exact).
 * Pure ES module: no DOM, no network, no Math.random, no Date.
 * Fixed 9x9 literal boards; every expected value ("true"/"false") is computed
 * at build time by validSudokuOracle below (pairwise duplicate scan inside
 * each row, column, and 3x3 box), an INDEPENDENT implementation of the same
 * operation (not the walkthrough's single-pass filing emitter), and
 * cross-checked against the walkthrough reference at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL live judge signature, so the same editor code
 *   compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (boolean answers; exact literal comparison).
 * - `hints` holds exactly 2 hints per variant.
 */

import { isValidSudoku } from './adapter-valid-sudoku.js';

export const SLUG = 'valid-sudoku';
export const SIGNATURE = Object.freeze({
  name: 'isValidSudoku',
  params: Object.freeze([{ name: 'board', type: 'char[][]' }]),
  return: 'boolean',
});
export const MODE = 'exact';
export const DIFFICULTY = 'Medium';

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.';
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.';
export const INTENT_ADVERSARIAL = 'Same task, hostile placements: the rule is unchanged, the clash hides.';

/** INDEPENDENT reference oracle: pairwise duplicate scan inside each unit. */
export function validSudokuOracle(board) {
  if (!Array.isArray(board) || board.length !== 9) return null;
  const src = [];
  for (let r = 0; r < 9; r++) {
    if (!Array.isArray(board[r]) || board[r].length !== 9) return null;
    src.push(board[r].map((cell) => String(cell)));
  }
  for (const row of src) {
    for (const ch of row) {
      if (ch !== '.' && !/^[1-9]$/.test(ch)) return null;
    }
  }
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

const SOLVED_ROWS = [
  '534678912',
  '672195348',
  '198342567',
  '859761423',
  '426853791',
  '713924856',
  '961537284',
  '287419635',
  '345286179',
];

const rowsToBoard = (rows) => rows.map((row) => [...row]);
const cloneBoard = (board) => board.map((row) => row.slice());
const emptyBoard = () => Array.from({ length: 9 }, () => new Array(9).fill('.'));
const SOLVED = rowsToBoard(SOLVED_ROWS);
// Any subset of a valid solution is still valid: deterministic sparse/dense takes.
const maskBoard = (src, keep) =>
  src.map((row, r) => row.map((ch, c) => (keep(r, c) ? ch : '.')));

function withCell(board, r, c, ch) {
  const next = cloneBoard(board);
  next[r][c] = ch;
  return next;
}

const BOARDS = {
  solved: SOLVED,
  sparseValid: maskBoard(SOLVED, (r, c) => (r * 9 + c) % 4 === 0),
  denseValid: maskBoard(SOLVED, (r, c) => (r * 9 + c) % 2 === 0),
  // Row 0 gains a second '5' at (0,2); the rest of the solved board is untouched.
  rowDup: withCell(SOLVED, 0, 2, '5'),
  // Box 0 gains a second '8' at (0,0) next to the one at (2,2).
  boxDup: withCell(SOLVED, 0, 0, '8'),
  allDots: emptyBoard(),
  single: withCell(emptyBoard(), 4, 4, '5'),
  // Two '7's share column 3 from different rows and different boxes: column-only clash.
  colDupOnly: withCell(withCell(emptyBoard(), 0, 3, '7'), 5, 3, '7'),
  // Two '1's share box 0 from different rows and columns: box-only clash.
  boxDupOnly: withCell(withCell(emptyBoard(), 0, 0, '1'), 1, 1, '1'),
  // Solved board with the very last cell flipped to clash: the scan fails at cell 81.
  lastRowDup: withCell(SOLVED, 8, 8, '3'),
  // Solved board with (8,8) flipped into its box-mate at (7,6): bottom-right-box trap.
  bottomRightBox: withCell(SOLVED, 8, 8, '6'),
  // Two '9's share column 8 from boxes 2 and 8: column-only clash across the board.
  colSpanOnly: withCell(withCell(emptyBoard(), 2, 8, '9'), 7, 8, '9'),
  // rowDup with (0,0) and (8,2) emptied: the tempting second '5' at (0,2)
  // stands alone in its row, column, and box: valid.
  nearMissValid: withCell(withCell(withCell(SOLVED, 0, 2, '5'), 0, 0, '.'), 8, 2, '.'),
};

const lit = (v) => JSON.stringify(v);

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  };
}

function inputLine(signature, args) {
  return signature.params
    .map((param, index) => `${(param && param.name) || 'arg' + index} = ${args[index]}`)
    .join(', ');
}

// One judge test from a board. The independent oracle and the walkthrough
// reference must agree; disagreement throws so a bad literal can never ship
// as a "verified" expectation.
function toTest(board) {
  const want = validSudokuOracle(board);
  if (want === null) throw new Error('valid-sudoku practice oracle rejected a board literal');
  const ref = isValidSudoku(board);
  if (ref !== want) throw new Error('valid-sudoku practice oracle disagreement');
  return { args: [lit(board)], expected: want ? 'true' : 'false' };
}

function buildVariant({ id, seedLabel, intent, title, statement, boardsList, hints }) {
  const tests = boardsList.map((b) => toTest(b));
  const first = tests[0];
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
  };
}

/* ---------------- entry point ---------------- */

export function buildValidSudokuVariants() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh boards',
      intent: INTENT_SAME,
      title: 'Valid Sudoku — Fresh Boards (same task)',
      statement:
        'Given a 9x9 board of "." and digits "1"-"9", return true when every filled row, column, and 3x3 box holds no repeated digit, otherwise false. These fresh boards mix sparse and dense valid fillings with row and box clashes. The signature and exact-match judge mode are unchanged.',
      boardsList: [BOARDS.sparseValid, BOARDS.denseValid, BOARDS.rowDup, BOARDS.boxDup],
      hints: [
        'File each digit in its row, column, and box lists; a digit already filed rejects the board.',
        'Skip "." cells entirely: only filled cells can clash.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Valid Sudoku — Edge Cases (same task)',
      statement:
        'Same validation task with the boundary inputs. An empty board and a single digit are both valid; a fully solved board is valid only when every unit is clean. Single-unit clashes hide in one column or one box while every row stays clean. The signature and exact comparison are unchanged.',
      boardsList: [BOARDS.allDots, BOARDS.single, BOARDS.solved, BOARDS.colDupOnly, BOARDS.boxDupOnly],
      hints: [
        'Zero or one digit can never repeat, so emptiness is valid by definition.',
        'Check all three unit families: a clean row set does not excuse a dirty column or box.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial shapes',
      intent: INTENT_ADVERSARIAL,
      title: 'Valid Sudoku — Adversarial Shapes (same task)',
      statement:
        'Same validation task with hostile placements and the same boolean answer shape: no rule change. Clashes sit at the last scanned cell, inside the bottom-right box, or stretched across distant boxes in one column, while one tempting board stays valid because its suspect cell was emptied. The signature and exact comparison are unchanged.',
      boardsList: [BOARDS.lastRowDup, BOARDS.bottomRightBox, BOARDS.colSpanOnly, BOARDS.nearMissValid],
      hints: [
        'Scan to the very end: a clash at cell 81 still fails the whole board.',
        'A near-duplicate is innocent when its partner cell is ".": compare actual digits, not shapes.',
      ],
    }),
  ];
}

// Registry-style entry mirroring variants.js BUILDERS conventions:
// slug-gated and shape-gated, returns exactly three variants or null. Never throws.
export function buildValidSudokuDrills(problem, signature) {
  try {
    if (!problem || problem.slug !== 'valid-sudoku') return null;
    const sig = signature || (problem.judge && problem.judge.signature) || SIGNATURE;
    if (!sig || sig.name !== 'isValidSudoku' || sig.return !== 'boolean') return null;
    if (!Array.isArray(sig.params) || sig.params.length !== 1 || sig.params[0].type !== 'char[][]') return null;
    return buildValidSudokuVariants();
  } catch {
    return null;
  }
}

export const VARIANTS = buildValidSudokuVariants();

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'validSudokuOracle (pairwise duplicate scan inside each row/column/box; frame emitter files checklists in one pass)',
});
