/**
 * n-queens — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `n-queens`
 * (N-Queens, Hard, solveNQueens(int)->string[][], mode unordered).
 * Pure ES module: no DOM, no network, no Math.random, no Date.
 * Fixed board sizes; every expected value is computed at build time by
 * oracleBoards below (column-permutation enumeration with pairwise diagonal
 * checks), an INDEPENDENT implementation of the same operation (not the
 * walkthrough's row DFS + occupancy sets).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL live judge signature, so the same editor code
 *   compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (order-insensitive for this slug).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'unordered' (board-set answers; any order accepted).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'n-queens';
export const SIGNATURE = Object.freeze({
  name: 'solveNQueens',
  params: Object.freeze([{ name: 'n', type: 'int' }]),
  return: 'string[][]',
});
export const MODE = 'unordered';
export const DIFFICULTY = 'Hard';

export const INTENT_SAME = 'Same pattern, different board sizes so you reproduce the reasoning.';
export const INTENT_EDGE = 'Same pattern with the edge cases the official examples hide.';
export const INTENT_ADVERSARIAL = 'Same question on larger boards that punish exponential shortcuts; no rule change.';

/**
 * Independent oracle: enumerate column permutations (one queen per row AND per
 * column by construction) and keep the ones with pairwise-safe diagonals.
 * Deliberately different machinery from the walkthrough row DFS + occupancy sets.
 */
export function oracleBoards(n) {
  const cols = Array.from({ length: n }, (_, i) => i);
  const out = [];
  const used = new Array(n).fill(false);
  const perm = new Array(n);
  const safe = (row) => {
    for (let i = 0; i < row; i++) {
      if (Math.abs(perm[i] - perm[row]) === row - i) return false;
    }
    return true;
  };
  const render = () => {
    const rows = [];
    for (let r = 0; r < n; r++) {
      let line = '';
      for (let c = 0; c < n; c++) line += perm[r] === c ? 'Q' : '.';
      rows.push(line);
    }
    return rows;
  };
  const dfs = (row) => {
    if (row === n) {
      out.push(render());
      return;
    }
    for (let c = 0; c < n; c++) {
      if (used[c]) continue;
      perm[row] = c;
      if (!safe(row)) continue;
      used[c] = true;
      dfs(row + 1);
      used[c] = false;
    }
  };
  dfs(0);
  return out;
}

const literal = (boards) => JSON.stringify(boards);

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

function buildVariant({ id, seedLabel, intent, title, statement, rows, hints }) {
  const tests = rows.map((n) => ({ args: [String(n)], expected: literal(oracleBoards(n)) }));
  const first = tests[0];
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title: 'N-Queens — ' + title,
    statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(SIGNATURE, first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: hints.slice(0, 2),
  };
}

function buildAll() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh boards',
      intent: INTENT_SAME,
      title: 'fresh boards (same question)',
      statement:
        'The n-queens puzzle is the problem of placing n queens on an n x n chessboard so that no two queens attack each other. Given an integer n, return all distinct solutions. Each solution contains a distinct board configuration with Q and . You may return the answer in any order. These fresh inputs use n = 5, 6, 2, 3.',
      rows: [5, 6, 2, 3],
      hints: [
        'Force one queen per row, then let the column and diagonal sets reject attacked squares.',
        'Every placement must be undone on the way back up, or sibling branches inherit stale attacks.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'edge cases (same question)',
      statement:
        'Same n-queens task with the boundary inputs. Given an integer n, return all distinct n-queens placements (Q and ., any order). n = 1 has exactly one board; n = 2 and n = 3 have no solution at all, so the answer is the empty list; n = 4 is the two-solution example.',
      rows: [1, 2, 3, 4],
      hints: [
        'A 1x1 board is already solved by its single square; trace the base case first.',
        'Sizes 2 and 3 are impossible: every first-row choice attacks the whole next row.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'scaling stress, same task',
      intent: INTENT_ADVERSARIAL,
      title: 'scaling stress (same task, no twist)',
      statement:
        'SAME-TASK SET, no rule change: the identical n-queens question on larger boards (n = 7, 8, 5, 6). Given n, return every distinct placement of n non-attacking queens as boards of Q and . in any order. n = 7 has 40 solutions and n = 8 has 92; only an O(1) validity test per square keeps the search affordable.',
      rows: [7, 8, 5, 6],
      hints: [
        'Count the branching: without the diagonal sets each row re-scans every placed queen.',
        'Boards are unordered in the answer, so never sort or number them inside the search.',
      ],
    }),
  ];
}

// Registry-style entry mirroring variants.js BUILDERS conventions:
// slug-gated and shape-gated, returns exactly three variants or null. Never throws.
export function buildNQueensDrills(problem, signature) {
  try {
    if (!problem || problem.slug !== 'n-queens') return null;
    const sig = signature || (problem.judge && problem.judge.signature) || SIGNATURE;
    if (!sig || sig.name !== 'solveNQueens' || sig.return !== 'string[][]') return null;
    if (!Array.isArray(sig.params) || sig.params.length !== 1 || sig.params[0].type !== 'int') return null;
    return buildAll();
  } catch {
    return null;
  }
}

export function buildNQueensVariants() {
  return buildAll();
}

export const VARIANTS = buildNQueensVariants();

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oracleBoards (column-permutation enumeration with pairwise diagonal checks; frame emitter runs row DFS + occupancy sets)',
});
