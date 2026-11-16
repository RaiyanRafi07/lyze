/**
 * interleaving-string — live semantic adapter (2-D DP, LeetCode 97).
 *
 * Walkthrough algorithm: iterative (m+1) x (n+1) boolean table where
 * dp[i][j] covers s1[:i] + s2[:j] vs s3[:i+j]. Length gate first
 * (m + n !== s3.length -> false), dp[0][0] = true, base edges carry the
 * AND down the first row/column, interior k = i + j - 1 with
 * takeS1 = dp[i-1][j] && s1[i-1] == s3[k],
 * takeS2 = dp[i][j-1] && s2[j-1] == s3[k], dp[i][j] = takeS1 || takeS2.
 * O(m*n) time, O(m*n) space (O(n) rolling follow-up exists but the table
 * is what the walkthrough draws).
 *
 * Staged source: `.workers/jobs/question-owners-150/interleaving-string/`
 * (SIGNATURE, iterative table, memoized-DFS oracle, per-slug grid scene
 * builder, reference Java/C++) — ported to the live shape: shared
 * `code`/`frame` helpers from semantic-core.js, no local helper
 * redefinitions. Signature equals the live judge signature exactly.
 *
 * Visual bound: s1/s2 each at most 12 chars, s3 at most 24 chars; larger
 * inputs are rejected, never truncated. Full base row/column plus all
 * interior cells when (m+1)*(n+1) <= 38, otherwise 9 evenly sampled
 * interior cells with an honest disclosure frame; 40-frame host ceiling.
 */
import { code, frame, boundedFrames } from './semantic-core.js'

// boundedFrames is applied by semantic.js (single compaction pass); the import
// keeps this adapter on the shared helper contract. Adapters return FULL lists.
export { boundedFrames }

export const SLUG = 'interleaving-string'

export const SIGNATURE = {
  name: 'isInterleave',
  params: [{ name: 's1', type: 'string' }, { name: 's2', type: 'string' }, { name: 's3', type: 'string' }],
  return: 'boolean',
}

const VISUAL_MAX_SIDE = 12

const EXPLAIN = {
  check: 'Length gate: an interleave consumes every char exactly once, so |s1|+|s2| must equal |s3| before any DP cell is read.',
  init: 'Allocate the (m+1) x (n+1) table and seed dp[0][0] = true: empty + empty makes empty, the root of every cell.',
  base: 'Seed the first row/column: with only one source available the s3 prefix must equal that source prefix, carried by AND.',
  fill: 'Interior cell: s3[k] (k = i+j-1) comes from s1[i-1] via dp[i-1][j] or from s2[j-1] via dp[i][j-1]; either branch suffices.',
  return: 'Report dp[m][n]: whether the full prefixes interleave, which is exactly the question asked.',
  ctx: 'Loop, branch, or scope scaffolding that orders the table fill without itself writing a table cell.',
}

const javaLines = code(`
[ctx]class Solution {
[ctx]    public boolean isInterleave(String s1, String s2, String s3) {
[ctx]        int m = s1.length(), n = s2.length();
[check]        if (m + n != s3.length()) return false;
[init]        boolean[][] dp = new boolean[m + 1][n + 1];
[init]        dp[0][0] = true;
[base]        for (int i = 1; i <= m; i++) dp[i][0] = dp[i - 1][0] && s1.charAt(i - 1) == s3.charAt(i - 1);
[base]        for (int j = 1; j <= n; j++) dp[0][j] = dp[0][j - 1] && s2.charAt(j - 1) == s3.charAt(j - 1);
[ctx]        for (int i = 1; i <= m; i++) {
[ctx]            for (int j = 1; j <= n; j++) {
[ctx]                int k = i + j - 1;
[fill]                dp[i][j] = (dp[i - 1][j] && s1.charAt(i - 1) == s3.charAt(k)) || (dp[i][j - 1] && s2.charAt(j - 1) == s3.charAt(k));
[ctx]            }
[ctx]        }
[return]        return dp[m][n];
[ctx]    }
[ctx]}
`)

const cppLines = code(`
[ctx]#include <string>
[ctx]#include <vector>
[ctx]using namespace std;
[ctx]class Solution {
[ctx]public:
[ctx]    bool isInterleave(string s1, string s2, string s3) {
[ctx]        int m = (int)s1.size(), n = (int)s2.size();
[check]        if (m + n != (int)s3.size()) return false;
[init]        vector<vector<char>> dp(m + 1, vector<char>(n + 1, 0));
[init]        dp[0][0] = 1;
[base]        for (int i = 1; i <= m; i++) dp[i][0] = dp[i - 1][0] && s1[i - 1] == s3[i - 1];
[base]        for (int j = 1; j <= n; j++) dp[0][j] = dp[0][j - 1] && s2[j - 1] == s3[j - 1];
[ctx]        for (int i = 1; i <= m; i++) {
[ctx]            for (int j = 1; j <= n; j++) {
[ctx]                int k = i + j - 1;
[fill]                dp[i][j] = (dp[i - 1][j] && s1[i - 1] == s3[k]) || (dp[i][j - 1] && s2[j - 1] == s3[k]);
[ctx]            }
[ctx]        }
[return]        return dp[m][n];
[ctx]    }
[ctx]};
`)

const pseudoLines = code(`
[ctx]function isInterleave(s1, s2, s3):
[ctx]  m = length(s1); n = length(s2)
[check]  if m + n != length(s3): return false
[init]  dp = (m + 1) x (n + 1) table of false
[init]  dp[0][0] = true
[base]  for i in 1..m: dp[i][0] = dp[i-1][0] and s1[i-1] == s3[i-1]
[base]  for j in 1..n: dp[0][j] = dp[0][j-1] and s2[j-1] == s3[j-1]
[ctx]  for i in 1..m:
[ctx]    for j in 1..n:
[ctx]      k = i + j - 1
[fill]      dp[i][j] = (dp[i-1][j] and s1[i-1] == s3[k]) or (dp[i][j-1] and s2[j-1] == s3[k])
[return]  return dp[m][n]
`)

// Per-line notes derived from the real parsed lines: each line explains its own
// recorded operation step (never invented; structural wrappers get scope notes
// from semantic.js).
const explainLinesFor = (lines) => lines.map((l) => EXPLAIN[l.step] || null)
const EXPLAIN_LINES = {
  java: explainLinesFor(javaLines).map((note, i) => {
    if (i === 1) return 'Method header: receives s1, s2, s3; the table work starts below.'
    if (i === 3) return 'Length gate: mismatched totals cannot interleave, so answer false with no table.'
    if (i === 14) return 'Return the corner cell: full prefixes consumed, the exact question asked.'
    return note
  }),
  cpp: explainLinesFor(cppLines).map((note, i) => {
    if (i === 5) return 'Method header: receives s1, s2, s3 by value; the table work starts below.'
    if (i === 7) return 'Length gate: mismatched totals cannot interleave, so answer false with no table.'
    if (i === 18) return 'Return the corner cell: full prefixes consumed, the exact question asked.'
    return note
  }),
  pseudo: explainLinesFor(pseudoLines).map((note, i) => {
    if (i === 0) return 'Function header: names s1, s2, s3; the table work starts below.'
    if (i === 2) return 'Length gate: mismatched totals cannot interleave, so answer false with no table.'
    if (i === 11) return 'Return the corner cell: full prefixes consumed, the exact question asked.'
    return note
  }),
}

function clipText(s, n) {
  s = String(s)
  return s.length > n ? s.slice(0, n) : s
}

function clipNote(s) {
  s = String(s).replace(/\s+/g, ' ').trim()
  return s.length > 140 ? s.slice(0, 137) + '...' : s
}

function stringArg(value, max, name) {
  if (typeof value !== 'string') throw new Error('interleaving-string walkthrough needs args [s1, s2, s3] with three strings')
  if (value.length > max) {
    throw new Error('interleaving-string visual supports ' + name + ' of at most ' + max + ' characters (got ' + value.length + '); larger inputs are rejected, never truncated')
  }
  if (!/^[a-z]*$/.test(value)) {
    throw new Error('interleaving-string walkthrough supports lowercase a-z only (judge constraint)')
  }
  return value
}

// One true backtrack path from the real table (final frame only).
function reconstructPath(table, s1, s2, s3) {
  if (!table) return []
  let i = s1.length
  let j = s2.length
  if (!table[i][j]) return []
  const path = [[i, j]]
  while (i > 0 || j > 0) {
    const k = i + j - 1
    if (i > 0 && table[i - 1][j] && s1[i - 1] === s3[k]) {
      i--
    } else if (j > 0 && table[i][j - 1] && s2[j - 1] === s3[k]) {
      j--
    } else if (i > 0 && j === 0) {
      i--
    } else if (j > 0 && i === 0) {
      j--
    } else {
      break
    }
    path.push([i, j])
  }
  return path.reverse()
}

// Deterministic interior-cell sampling so frames stay within the 40-frame
// host ceiling with honest disclosure (a note names the sampled cells).
function sampleInteriorCells(m, n) {
  const all = []
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) all.push([i, j])
  }
  if (all.length <= 9) return { cells: all, sampled: false }
  const picked = []
  for (let t = 0; t < 9; t++) {
    picked.push(all[Math.round((t * (all.length - 1)) / 8)])
  }
  const uniq = [...new Set(picked.map((c) => c.join(',')))].map((s) => s.split(',').map(Number))
  if (uniq[uniq.length - 1].join(',') !== m + ',' + n) {
    uniq[uniq.length - 1] = [m, n]
  }
  return { cells: uniq, sampled: true }
}

export function buildInterleave(args) {
  if (!Array.isArray(args) || args.length !== 3) {
    throw new Error('interleaving-string walkthrough needs args [s1, s2, s3] with three strings')
  }
  const s1 = stringArg(args[0], VISUAL_MAX_SIDE, 's1')
  const s2 = stringArg(args[1], VISUAL_MAX_SIDE, 's2')
  const s3 = stringArg(args[2], 2 * VISUAL_MAX_SIDE, 's3')
  const m = s1.length
  const n = s2.length
  const rows = m + 1
  const cols = n + 1
  const emptyCells = () => Array.from({ length: rows }, () => new Array(cols).fill(null))
  const rowLabels = ['∅', ...s1]
  const colLabels = ['∅', ...s2]

  const finishLayout = () => ({
    rows,
    cols,
    cells: emptyCells(),
    rowLabels: rowLabels.slice(),
    colLabels: colLabels.slice(),
  })

  // Length-gate short scene: answer is false without a table.
  if (m + n !== s3.length) {
    const frames = []
    frames.push(frame('check', 'length check',
      clipNote('|s1|+|s2|=' + (m + n) + ', |s3|=' + s3.length + '. Lengths differ, so no interleave.'),
      { current: null, cells: emptyCells(), filled: [], reads: [], answer: null, vars: { m, n } }))
    frames.push(frame('return', 'answer: false',
      clipNote('Length mismatch forces false; no DP table is needed.'),
      { current: null, cells: emptyCells(), filled: [], reads: [], answer: null, vars: { m, n, answer: false } }))
    return { kind: 'grid', layout: finishLayout(), frames, result: false }
  }

  // Real iterative table (the walkthrough target).
  const table = Array.from({ length: rows }, () => new Array(cols).fill(false))
  table[0][0] = true
  for (let i = 1; i <= m; i++) table[i][0] = table[i - 1][0] && s1[i - 1] === s3[i - 1]
  for (let j = 1; j <= n; j++) table[0][j] = table[0][j - 1] && s2[j - 1] === s3[j - 1]
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const k = i + j - 1
      table[i][j] = (table[i - 1][j] && s1[i - 1] === s3[k]) || (table[i][j - 1] && s2[j - 1] === s3[k])
    }
  }

  const cells = emptyCells()
  const filled = []
  const filledKeys = new Set()
  const frames = []
  const MAX_FRAMES = 40

  const blockedOf = () => {
    const out = []
    for (const [r, c] of filled) {
      if (!table[r][c]) out.push([r, c])
    }
    return out
  }

  const snapshot = () => cells.map((row) => row.slice())

  const push = (step, label, note, r, c, reads, extra) => {
    if (frames.length >= MAX_FRAMES - 1) return
    cells[r][c] = table[r][c] ? 1 : 0
    filled.push([r, c])
    filledKeys.add(r + ',' + c)
    frames.push(frame(step, clipText(label, 40), clipNote(note), {
      current: [r, c],
      cells: snapshot(),
      filled: filled.map((p) => p.slice()),
      blocked: blockedOf(),
      reads: reads.map((p) => p.slice()),
      answer: null,
      vars: { m, n, i: r, j: c, k: r + c - 1, cell: table[r][c] ? 1 : 0, ...(extra || {}) },
    }))
  }

  push('init', 'setup grid',
    'dp rows=s1 "' + clipText(s1, 8) + '"+1, cols=s2 "' + clipText(s2, 8) + '"+1. dp[i][j]=prefix match.',
    0, 0, [])
  for (let j = 1; j <= n; j++) {
    push('base', 'dp[0][' + j + ']=' + (table[0][j] ? 1 : 0),
      'Row 0: s2[' + (j - 1) + "]='" + s2[j - 1] + "' vs s3[" + (j - 1) + "]='" + (s3[j - 1] ?? '') + "' carry=" + (table[0][j] ? 1 : 0) + '.',
      0, j, [[0, j - 1]])
  }
  for (let i = 1; i <= m; i++) {
    push('base', 'dp[' + i + '][0]=' + (table[i][0] ? 1 : 0),
      'Col 0: s1[' + (i - 1) + "]='" + s1[i - 1] + "' vs s3[" + (i - 1) + "]='" + (s3[i - 1] ?? '') + "' carry=" + (table[i][0] ? 1 : 0) + '.',
      i, 0, [[i - 1, 0]])
  }

  const fullInterior = (m + 1) * (n + 1) <= 38
  const picks = fullInterior
    ? { cells: (() => { const a = []; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) a.push([i, j]); return a })(), sampled: false }
    : sampleInteriorCells(m, n)
  if (picks.sampled && frames.length < MAX_FRAMES - 1) {
    const last = frames[frames.length - 1].state
    frames.push(frame('init', 'sampling note',
      clipNote('Table is ' + rows + 'x' + cols + '; showing ' + picks.cells.length + ' sampled interior cells + full base.'),
      last))
  }
  for (const [i, j] of picks.cells) {
    const k = i + j - 1
    const fromUp = table[i - 1][j] && s1[i - 1] === s3[k]
    const fromLeft = table[i][j - 1] && s2[j - 1] === s3[k]
    push('fill', 'dp[' + i + '][' + j + ']=' + (table[i][j] ? 1 : 0),
      "s3[" + k + "]='" + s3[k] + "': up s1='" + s1[i - 1] + "'" + (fromUp ? '=ok' : 'x') + " or left s2='" + s2[j - 1] + "'" + (fromLeft ? '=ok' : 'x') + '.',
      i, j, [[i - 1, j], [i, j - 1]], { takeS1: fromUp ? 1 : 0, takeS2: fromLeft ? 1 : 0 })
  }

  const path = reconstructPath(table, s1, s2, s3)
  const allFilled = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) allFilled.push([r, c])
  }
  const finalCells = table.map((row) => row.map((v) => (v ? 1 : 0)))
  const finalBlocked = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!table[r][c]) finalBlocked.push([r, c])
    }
  }
  frames.push(frame('return', 'answer: ' + (table[m][n] ? 'true' : 'false'),
    clipNote(table[m][n]
      ? 'dp[' + m + '][' + n + ']=1: s3 is an interleave of s1 and s2.'
      : 'dp[' + m + '][' + n + ']=0: s3 is NOT an interleave of s1 and s2.'),
    {
      current: [m, n],
      cells: finalCells,
      filled: allFilled,
      blocked: finalBlocked,
      reads: [],
      answer: [m, n],
      vars: { m, n, answer: table[m][n] ? true : false },
      ...(path.length ? { path } : {}),
    }))

  return { kind: 'grid', layout: finishLayout(), frames, result: table[m][n] }
}

export const adapters = {
  'interleaving-string': {
    signature: { name: 'isInterleave', params: ['string', 'string', 'string'], return: 'boolean' },
    lesson: {
      idea: 'dp[i][j] covers s1[:i]+s2[:j] vs s3[:i+j]; s3[k] (k=i+j-1) comes from s1 via dp[i-1][j] or s2 via dp[i][j-1].',
      trap: 'Skip the length gate, index s3 by i or j instead of i+j-1, or AND the two branches instead of OR.',
      time: 'O(m*n)',
      space: 'O(m*n)',
    },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    code: { java: javaLines, cpp: cppLines, pseudo: pseudoLines },
    build: buildInterleave,
  },
}

export default adapters['interleaving-string']
