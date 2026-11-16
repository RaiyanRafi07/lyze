// Word Search practice variants — live-forge-compatible per-slug builder (staged).
// Slug `word-search` (id 79, Medium, backtracking). Same real signature:
//   exist(char[][] board, String word) -> boolean ; judge mode "exact".
// Produces exactly 3 deterministic variants from the problem slug (no Math.random,
// no Date): v1 fresh same-task boards, v2 hidden edge cases, v3 adversarial
// same-task drill (dense boards that punish missing-restore / reuse bugs).
// Every `expected` ("true"/"false") is computed by the independent iterative
// oracle below and cross-checked against the recursive reference at build time.
// Standalone ES module: no imports, no DOM, no network. Returns [] (never throws)
// when the record is not the word-search judgeable shape.

export const SLUG = 'word-search';

export const CANONICAL_SIGNATURE = {
  name: 'exist',
  params: [
    { name: 'board', type: 'char[][]' },
    { name: 'word', type: 'string' },
  ],
  return: 'boolean',
};

function hashText(text) {
  const source = String(text);
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < source.length; i += 1) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619) >>> 0;
  return hash;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  };
}

function signatureOf(problem) {
  const judge = problem && problem.judge;
  const signature = judge && judge.signature;
  if (!signature || typeof signature.name !== 'string' || signature.name.trim() === '') return null;
  if (!Array.isArray(signature.params) || signature.params.length !== 2) return null;
  if (signature.params[0].type !== 'char[][]' || signature.params[1].type !== 'string') return null;
  if (signature.return !== 'boolean') return null;
  return {
    name: signature.name.trim(),
    params: [
      { name: String(signature.params[0].name || 'board'), type: 'char[][]' },
      { name: String(signature.params[1].name || 'word'), type: 'string' },
    ],
    return: 'boolean',
  };
}

function inputLine(signature, args) {
  return signature.params.map((param, index) => param.name + ' = ' + args[index]).join(', ');
}

// Reference solver: recursive match-mark-recurse-unmark (mirrors staged references).
export function solveRef(board, word) {
  const rows = board.length;
  const cols = board[0].length;
  const g = board.map((r) => r.slice());
  function dfs(r, c, k) {
    if (k === word.length) return true;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    if (g[r][c] !== word[k]) return false;
    const saved = g[r][c];
    g[r][c] = '#';
    const ok =
      dfs(r + 1, c, k + 1) || dfs(r - 1, c, k + 1) || dfs(r, c + 1, k + 1) || dfs(r, c - 1, k + 1);
    g[r][c] = saved;
    return ok;
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (g[r][c] === word[0] && dfs(r, c, 0)) return true;
    }
  }
  return false;
}

// INDEPENDENT oracle: iterative explicit-stack DFS over (r,c,k,visitedMask).
// No recursion, no in-place board marks — algorithmically distinct from solveRef.
export function solveOracle(board, word) {
  const rows = board.length;
  const cols = board[0].length;
  const at = (r, c) => r * cols + c;
  for (let sr = 0; sr < rows; sr++) {
    for (let sc = 0; sc < cols; sc++) {
      if (board[sr][sc] !== word[0]) continue;
      const stack = [{ r: sr, c: sc, k: 0, mask: 0 }];
      while (stack.length) {
        const cur = stack.pop();
        const r = cur.r, c = cur.c, k = cur.k, mask = cur.mask;
        if (k === word.length) return true;
        if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
        const bit = 1 << at(r, c);
        if (mask & bit) continue;
        if (board[r][c] !== word[k]) continue;
        const m2 = mask | bit;
        const nk = k + 1;
        if (nk === word.length) return true;
        stack.push({ r: r + 1, c, k: nk, mask: m2 });
        stack.push({ r: r - 1, c, k: nk, mask: m2 });
        stack.push({ r, c: c + 1, k: nk, mask: m2 });
        stack.push({ r, c: c - 1, k: nk, mask: m2 });
      }
    }
  }
  return false;
}

const LETTERS = 'ABCDE';
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function randBoard(rng, rows, cols, alphabet) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => alphabet[Math.floor(rng() * alphabet.length)])
  );
}

// Carve a guaranteed-true word along a random self-avoiding path.
function carveBoard(rng, rows, cols, alphabet, len) {
  const board = randBoard(rng, rows, cols, alphabet);
  let r = Math.floor(rng() * rows);
  let c = Math.floor(rng() * cols);
  const used = new Set([r * cols + c]);
  const path = [[r, c]];
  while (path.length < len) {
    const opts = [];
    for (const d of DIRS) {
      const nr = r + d[0], nc = c + d[1];
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !used.has(nr * cols + nc)) opts.push([nr, nc]);
    }
    if (!opts.length) break;
    const pick = opts[Math.floor(rng() * opts.length)];
    r = pick[0]; c = pick[1];
    used.add(r * cols + c);
    path.push([r, c]);
  }
  const word = path.map(() => alphabet[Math.floor(rng() * alphabet.length)]).join('');
  for (let i = 0; i < path.length; i++) board[path[i][0]][path[i][1]] = word[i];
  return { board, word };
}

function toTest(board, word) {
  const expected = solveOracle(board, word);
  const ref = solveRef(board, word);
  if (ref !== expected) throw new Error('oracle/reference disagree during variant build');
  return { args: [JSON.stringify(board), JSON.stringify(word)], expected: expected ? 'true' : 'false' };
}

function buildVariant(spec) {
  const tests = spec.tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
  const first = tests[0];
  return {
    id: spec.id,
    seedLabel: spec.seedLabel,
    intent: spec.intent,
    difficulty: spec.difficulty,
    title: spec.title,
    statement: spec.statement,
    signature: cloneSignature(spec.signature),
    examples: [{ input: inputLine(spec.signature, first.args), output: first.expected, explain: '' }],
    tests,
    mode: 'exact',
    hints: spec.hints.slice(0, 2),
  };
}

function difficultyOf(problem) {
  const v = problem && problem.difficulty;
  return v === 'Easy' || v === 'Medium' || v === 'Hard' ? v : 'Medium';
}

function titleOf(problem) {
  const raw = String((problem && (problem.title || problem.slug)) || 'Word Search').trim();
  return raw.length > 46 ? raw.slice(0, 46).trim() + '…' : raw;
}

// Forge-compatible entry point: exactly 3 variants, or [] when unsupported.
export function buildVariants(problem, options) {
  void options;
  try {
    if (!problem || typeof problem !== 'object') return [];
    if (problem.slug !== SLUG) return [];
    const signature = signatureOf(problem) || cloneSignature(CANONICAL_SIGNATURE);
    if (problem.judge && (problem.judge.mode !== 'exact' || !signatureOf(problem))) return [];
    const rng = mulberry32(hashText(SLUG));
    const base = titleOf(problem);
    const difficulty = difficultyOf(problem);

    // v1 — fresh same-task boards (deterministic seed; 2 carved-true + 2 random).
    const v1tests = [];
    {
      const c1 = carveBoard(rng, 3, 4, LETTERS, 5);
      v1tests.push(toTest(c1.board, c1.word));
      const c2 = carveBoard(rng, 4, 3, LETTERS, 6);
      v1tests.push(toTest(c2.board, c2.word));
      for (let n = 0; n < 2; n++) {
        const rows = 2 + Math.floor(rng() * 3); // 2..4
        const cols = 3 + Math.floor(rng() * 2); // 3..4
        const board = randBoard(rng, rows, cols, LETTERS);
        const len = 2 + Math.floor(rng() * 5); // 2..6
        const word = Array.from({ length: len }, () => LETTERS[Math.floor(rng() * LETTERS.length)]).join('');
        v1tests.push(toTest(board, word));
      }
    }

    // v2 — hidden edge cases (fixed boards, oracle-verified at build time).
    const v2tests = [
      toTest([['A']], 'A'), // single cell match
      toTest([['A']], 'AA'), // single cell cannot be reused
      toTest([['A', 'X'], ['X', 'B']], 'AB'), // diagonal steps are illegal
      toTest([['a', 'B']], 'AB'), // letters compare exactly (case sensitive)
      toTest([['A', 'A'], ['A', 'A']], 'ABC'), // frequency prune: no B/C on board
    ];

    // v3 — adversarial same-task drill: dense boards, deep snakes, false starts.
    const v3tests = [
      toTest(
        [['A', 'B', 'A', 'B', 'A'], ['B', 'A', 'B', 'A', 'B'], ['A', 'B', 'A', 'B', 'C']],
        'ABABABAC'
      ),
      toTest(
        [['A', 'A', 'A'], ['A', 'A', 'B'], ['A', 'A', 'C']],
        'ABC'
      ),
      toTest(
        [['A', 'B'], ['C', 'D']],
        'ABCDABCD'
      ),
      toTest(
        [['S', 'S', 'S'], ['S', 'E', 'S'], ['S', 'S', 'S']],
        'SEES'
      ),
    ];

    const sameStatement =
      'Given an m x n grid of characters board and a string word, return true if word exists in the grid. ' +
      'The word is built from sequentially adjacent cells (horizontal or vertical neighbors only); no cell may be used twice. ' +
      'These fresh boards are small (at most 4 rows by 4 columns) with words of length 2 to 6.';
    const edgeStatement =
      'Same word-search task: return true if word can be built from sequentially adjacent cells without reusing a cell, otherwise false. ' +
      'Inputs are boundary cases: a single cell, a word longer than the available cells, diagonal-only adjacency (illegal), ' +
      'exact case-sensitive matching, and a board missing a required letter.';
    const advStatement =
      'Same word-search task and signature, adversarial boards: dense alternating letters force deep backtracking, ' +
      'many false starts must be exhausted before the true path wins, and reuse of a consumed cell is never allowed. ' +
      'A missing restore of the board cell after recursion fails these boards.';

    return [
      buildVariant({
        id: 'v1', seedLabel: 'fresh boards', intent: 'Same pattern, different boards so you reproduce the reasoning.',
        difficulty, title: base + ' — fresh boards (word-search drill)', statement: sameStatement,
        signature, tests: v1tests, hints: [
          'Start a DFS from every cell matching word[0]; advance k by one per 4-neighbor step.',
          'Mark a cell while it is on the current path and restore it before returning.',
        ],
      }),
      buildVariant({
        id: 'v2', seedLabel: 'edge cases', intent: 'Same pattern with the edge cases the original hides.',
        difficulty, title: base + ' — edge cases (word-search drill)', statement: edgeStatement,
        signature, tests: v2tests, hints: [
          'One cell can supply only one letter: the second step has no unvisited neighbor.',
          'Diagonal cells are not adjacent, and letter comparison is case sensitive.',
        ],
      }),
      buildVariant({
        id: 'v3', seedLabel: 'adversarial boards', intent: 'Adversarial same-task drill: dense boards that punish missing restore or reuse bugs.',
        difficulty, title: base + ' — adversarial boards (word-search drill)', statement: advStatement,
        signature, tests: v3tests, hints: [
          'Exhaust every start cell in row-major order; an early start failing does not end the search.',
          'Forgetting to restore board[r][c] after recursion poisons sibling branches on dense boards.',
        ],
      }),
    ];
  } catch {
    return [];
  }
}
