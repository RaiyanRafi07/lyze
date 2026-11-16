// Word Search II — practice variants (staged, generated).
// Slug `word-search-ii` (id 212, Hard, trie). Same real signature:
//   findWords(char[][] board, string[] words) -> string[] ; judge mode "exact"
//   with sorted expectations (the reference sorts its verdict deterministically).
// Exactly 3 deterministic variants from the slug hash (no Math.random, no Date).
// Every `expected` is computed by the independent oracle below (plain per-word
// DFS with an explicit visited set — no trie, no shared-prefix logic) and
// cross-checked against the trie reference at build time.
// Standalone ES module: no imports, no DOM, no network. Returns [] (never throws)
// when the record is not the word-search-ii judgeable shape.

export const SLUG = 'word-search-ii';

export const CANONICAL_SIGNATURE = {
  name: 'findWords',
  params: [
    { name: 'board', type: 'char[][]' },
    { name: 'words', type: 'string[]' },
  ],
  return: 'string[]',
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
  if (!signature || signature.name !== 'findWords') return null;
  if (!Array.isArray(signature.params) || signature.params.length !== 2) return null;
  if (signature.params[0].type !== 'char[][]' || signature.params[1].type !== 'string[]') return null;
  if (signature.return !== 'string[]') return null;
  return cloneSignature(signature);
}

function inputLine(signature, args) {
  return signature.params.map((param, index) => param.name + ' = ' + args[index]).join(', ');
}

// INDEPENDENT oracle: for each word, a fresh visited-set DFS with no trie.
// Algorithmically distinct from the reference (no shared prefixes, no marks,
// no word-null dedupe); agreement between the two is a real cross-check.
export function solveOracle(board, words) {
  const rows = board.length;
  const cols = board[0].length;
  const out = [];
  const seenCells = (word) => {
    const visited = new Set();
    const key = (r, c) => r * cols + c;
    // dfs(r,c,k): (r,c) is in bounds and unvisited; completes word[k..] from here.
    function dfs(r, c, k) {
      if (board[r][c] !== word[k]) return false;
      if (k === word.length - 1) return true; // this cell is the last letter
      visited.add(key(r, c));
      const nb = [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]];
      for (const [nr, nc] of nb) {
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (visited.has(key(nr, nc))) continue;
        if (dfs(nr, nc, k + 1)) {
          visited.delete(key(r, c));
          return true;
        }
      }
      visited.delete(key(r, c));
      return false;
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c] === word[0] && dfs(r, c, 0)) return true;
      }
    }
    return false;
  };
  for (const w of words) {
    if (seenCells(w)) out.push(w);
  }
  out.sort();
  return out;
}

// Trie reference (same decisions as reference.js) — build-time cross-check only.
function solveRef(boardIn, wordsIn) {
  const rows = boardIn.length;
  const cols = boardIn[0].length;
  const board = boardIn.map((r) => r.slice());
  const root = { next: new Array(26).fill(null), word: null };
  for (const w of wordsIn) {
    let node = root;
    for (const ch of w) {
      const t = ch.charCodeAt(0) - 97;
      if (!node.next[t]) node.next[t] = { next: new Array(26).fill(null), word: null };
      node = node.next[t];
    }
    node.word = w;
  }
  const out = [];
  function dfs(r, c, node) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    const ch = board[r][c];
    if (ch === '#') return;
    const t = ch.charCodeAt(0) - 97;
    const child = node.next[t];
    if (!child) return;
    if (child.word !== null) {
      out.push(child.word);
      child.word = null;
    }
    board[r][c] = '#';
    dfs(r + 1, c, child);
    dfs(r - 1, c, child);
    dfs(r, c + 1, child);
    dfs(r, c - 1, child);
    board[r][c] = ch;
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) dfs(r, c, root);
  out.sort();
  return out;
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const LETTERS = 'abcdef';

function randBoard(rng, rows, cols, alphabet) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => alphabet[Math.floor(rng() * alphabet.length)])
  );
}

// Carve a guaranteed-present word along a random self-avoiding path.
function carveWord(rng, board, len, alphabet) {
  const rows = board.length;
  const cols = board[0].length;
  let r = Math.floor(rng() * rows);
  let c = Math.floor(rng() * cols);
  const used = new Set([r * cols + c]);
  const pathCells = [[r, c]];
  while (pathCells.length < len) {
    const opts = [];
    for (const d of DIRS) {
      const nr = r + d[0];
      const nc = c + d[1];
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !used.has(nr * cols + nc)) opts.push([nr, nc]);
    }
    if (!opts.length) break;
    const pick = opts[Math.floor(rng() * opts.length)];
    r = pick[0];
    c = pick[1];
    used.add(r * cols + c);
    pathCells.push([r, c]);
  }
  const word = pathCells.map(() => alphabet[Math.floor(rng() * alphabet.length)]).join('');
  for (let i = 0; i < pathCells.length; i++) board[pathCells[i][0]][pathCells[i][1]] = word[i];
  return word;
}

function toTest(board, words) {
  const expected = solveOracle(board, words);
  const ref = solveRef(board, words);
  if (JSON.stringify(ref) !== JSON.stringify(expected)) {
    throw new Error('oracle/reference disagree during variant build');
  }
  return {
    args: [JSON.stringify(board), JSON.stringify(words)],
    expected: JSON.stringify(expected),
  };
}

function buildVariant(spec) {
  const tests = spec.tests.map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
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
    generated: true,
  };
}

function difficultyOf(problem) {
  const v = problem && problem.difficulty;
  return v === 'Easy' || v === 'Medium' || v === 'Hard' ? v : 'Hard';
}

function titleOf(problem) {
  const raw = String((problem && (problem.title || problem.slug)) || 'Word Search II').trim();
  return raw.length > 46 ? raw.slice(0, 46).trim() + '…' : raw;
}

// Forge-compatible entry point: exactly 3 variants, or [] when unsupported.
export function buildPracticeVariants(problem, options) {
  void options;
  try {
    if (!problem || typeof problem !== 'object') return [];
    if (problem.slug !== SLUG) return [];
    const signature = signatureOf(problem) || cloneSignature(CANONICAL_SIGNATURE);
    if (problem.judge && problem.judge.mode !== 'exact') return [];
    const rng = mulberry32(hashText(SLUG));
    const base = titleOf(problem);
    const difficulty = difficultyOf(problem);

    // v1 — fresh same-task boards (2 carved-present + 2 random, small alphabet).
    const v1tests = [];
    {
      const b1 = randBoard(rng, 3, 4, LETTERS);
      const w1 = carveWord(rng, b1, 4, LETTERS);
      const w2 = carveWord(rng, b1, 3, LETTERS);
      v1tests.push(toTest(b1, [w1, w2, 'qzx']));
      const b2 = randBoard(rng, 4, 4, LETTERS);
      const w3 = carveWord(rng, b2, 5, LETTERS);
      v1tests.push(toTest(b2, [w3, 'qqqq', 'zzz']));
      for (let n = 0; n < 2; n++) {
        const rows = 2 + Math.floor(rng() * 3); // 2..4
        const cols = 3 + Math.floor(rng() * 2); // 3..4
        const board = randBoard(rng, rows, cols, LETTERS);
        const words = [];
        for (let k = 0; k < 3; k++) {
          const len = 2 + Math.floor(rng() * 4); // 2..5
          words.push(Array.from({ length: len }, () => LETTERS[Math.floor(rng() * LETTERS.length)]).join(''));
        }
        v1tests.push(toTest(board, [...new Set(words)]));
      }
    }

    // v2 — hidden edge cases (oracle-verified at build time).
    const v2tests = [
      toTest([['a']], ['a']), // single cell, single letter
      toTest([['a']], ['aa']), // one cell cannot supply two letters
      toTest([['a', 'b'], ['c', 'd']], ['abdc', 'acdb']), // reuse/order trap
      toTest([['a', 'a'], ['a', 'a']], ['a', 'aa', 'aaa']), // dedupe + depth ladder
      toTest([['o', 'a'], ['e', 't']], ['oaet', 'oae', 'tae']), // shared prefixes, mixed hits
    ];

    // v3 — adversarial same-task drill: dense boards + prefix-sharing word lists.
    // No trie sharing across starts and no word-null dedupe => TLE/double-count.
    const v3tests = [
      toTest(
        [
          ['a', 'a', 'a', 'a'],
          ['a', 'a', 'a', 'a'],
          ['a', 'a', 'a', 'a'],
          ['a', 'a', 'a', 'b'],
        ],
        ['aaaa', 'aaaaa', 'aaaaab', 'aaab']
      ),
      toTest(
        [
          ['e', 'a', 't'],
          ['a', 't', 'e'],
          ['t', 'e', 'a'],
        ],
        ['eat', 'ate', 'tea', 'eta', 'tae']
      ),
      toTest(
        [
          ['a', 'b'],
          ['c', 'd'],
        ],
        ['abcdabcd', 'abdc', 'acdb']
      ),
      toTest(
        [
          ['s', 's', 's'],
          ['s', 'e', 's'],
          ['s', 's', 's'],
        ],
        ['sees', 'sess', 'seess']
      ),
    ];

    const sameStatement =
      'Given an m x n board of lowercase letters and a list of unique words, return all words that can be built ' +
      'from sequentially adjacent cells (horizontal/vertical only, no cell reused). These fresh boards are small ' +
      '(at most 4x4) with short words; the answer list is sorted.';
    const edgeStatement =
      'Same Word Search II task: return every word buildable from adjacent cells without reuse. ' +
      'Inputs are boundary cases: a 1x1 board, a word longer than the available cells, words sharing prefixes ' +
      'with mixed hits, and a repeated-letter ladder that reports each word exactly once.';
    const advStatement =
      'Same Word Search II task and signature, adversarial boards: dense repeated letters force deep backtracking ' +
      'shared across many prefix-sharing words, and near-miss words die only at the last letter. ' +
      'A per-word DFS without a trie rewalks every shared prefix; a missing word-null dedupe double-counts.';

    return [
      buildVariant({
        id: 'v1', seedLabel: 'fresh boards', intent: 'Same pattern, different boards so you reproduce the reasoning.',
        difficulty, title: base + ' — fresh boards (word-search-ii drill)', statement: sameStatement,
        signature, tests: v1tests, hints: [
          'Insert all words into one trie, then DFS once per board cell; a missing child edge kills the branch for every word at once.',
          'Mark a cell while it is on the current path, null the terminal word after reporting, restore before returning.',
        ],
      }),
      buildVariant({
        id: 'v2', seedLabel: 'edge cases', intent: 'Same pattern with the edge cases the original hides.',
        difficulty, title: base + ' — edge cases (word-search-ii drill)', statement: edgeStatement,
        signature, tests: v2tests, hints: [
          'One cell supplies one letter: a 2-letter word needs two distinct adjacent cells.',
          'Report each word once even when several paths spell it; sort the final list.',
        ],
      }),
      buildVariant({
        id: 'v3', seedLabel: 'adversarial boards', intent: 'Adversarial same-task drill: dense boards that punish missing trie pruning or dedupe.',
        difficulty, title: base + ' — adversarial boards (word-search-ii drill)', statement: advStatement,
        signature, tests: v3tests, hints: [
          'Shared prefixes are walked once because trie nodes are shared; per-word search repeats them.',
          'Forgetting word=null after a report collects the same word twice on dense boards.',
        ],
      }),
    ];
  } catch {
    return [];
  }
}
