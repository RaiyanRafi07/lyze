/**
 * distinct-subsequences — live walkthrough adapter (2-D DP, LeetCode 115).
 *
 * Walkthrough for https://leetcode.com/problems/distinct-subsequences/ built
 * from a REAL bottom-up DP run on the actual input: dp[i][j] counts distinct
 * subsequences of s[:i] that equal t[:j]. One frame per cell write records
 * the dependency reads (dp[i-1][j] skip, plus dp[i-1][j-1] diagonal-use on a
 * match). Uncomputed cells stay null (rendered unset), never 0.
 *
 * Signature equals the live judge signature exactly
 * (plugin/data/shard-14.json id 115):
 *   numDistinct(string, string) -> int   // numDistinct(s, t)
 *
 * Visual bounds (honest disclosure): s,t each 0..8 English letters
 * (judge keeps s.length, t.length <= 1000). Over-bound or malformed inputs
 * reject with a clear error, never truncate. The single compaction pass
 * stays in semantic.js (boundedFrames); this adapter returns the FULL
 * honest event list.
 *
 * Staged source (frames, listings, notes reused verbatim):
 * .workers/jobs/question-owners-150/distinct-subsequences/adapter.mjs
 * (walkthrough events, Java/C++/pseudocode, per-step explain, per-line
 * explainLines). No new data, no renumbered frames, no changed results.
 */
import { code, frame, boundedFrames } from './semantic-core.js'

export const SLUG = 'distinct-subsequences'

// Live judge signature (shard-14.json id 115): params are type strings here to
// match the semantic.js adapter contract (it compares signature.params types).
export const SIGNATURE = {
  name: 'numDistinct',
  params: ['string', 'string'],
  return: 'int',
}

// Visual bounds (judge keeps s.length, t.length <= 1000).
export const VISUAL_BOUNDS = { s: '0..8 English letters', t: '0..8 English letters' }
const DS_MAX_LEN = 8

function emptyGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(null))
}

function decodeString(value, label) {
  if (typeof value !== 'string') throw new Error('distinct-subsequences visual expects two strings [s, t] (got ' + typeof value + ' for ' + label + ')')
  if (value.length > DS_MAX_LEN) {
    throw new Error('distinct-subsequences visual needs s,t each 0..' + DS_MAX_LEN + ' chars (got ' + label + ' length ' + value.length + '); larger inputs are rejected, never truncated')
  }
  for (let k = 0; k < value.length; k++) {
    const ch = value[k]
    if (!/[A-Za-z]/.test(ch)) {
      throw new Error('distinct-subsequences visual needs English letters only (got ' + JSON.stringify(ch) + ' in ' + label + ')')
    }
  }
  return value
}

// Every frame below is a REAL counting event: init, base seeds
// (dp[i][0]=1, dp[0][j>0]=0), one match/skip write per (i, j) cell carrying
// the recorded {value} with skip+use==value (match) or carry (skip), plus
// return. Uncomputed cells stay null. No future rows are revealed early.
export function build(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('numDistinct expects two string arguments [s, t]')
  const s = decodeString(args[0], 's')
  const t = decodeString(args[1], 't')
  const schars = [...s]
  const tchars = [...t]
  const m = schars.length
  const n = tchars.length
  const rows = m + 1
  const cols = n + 1
  const cells = emptyGrid(rows, cols)
  const filled = []
  const frames = []
  const baseVars = { m, n }

  frames.push(frame('init', 'Allocate DP table', 'Made a ' + rows + ' x ' + cols + ' table for s="' + s + '" (' + m + ') vs t="' + t + '" (' + n + ').', {
    current: null, cells, filled, reads: [], answer: null, vars: { ...baseVars }
  }))

  for (let i = 0; i <= m; i++) {
    cells[i][0] = 1
    filled.push([i, 0])
    frames.push(frame('base', 'Base dp[' + i + '][0] = 1', i === 0 ? 'Empty t needs 1 way: delete nothing (dp[0][0] = 1).' : 'Empty t from ' + i + ' chars needs 1 way: delete all (dp[' + i + '][0] = 1).', {
      current: [i, 0], cells, filled, reads: [], answer: null, vars: { ...baseVars }
    }))
  }
  for (let j = 1; j <= n; j++) {
    cells[0][j] = 0
    filled.push([0, j])
    frames.push(frame('base', 'Base dp[0][' + j + '] = 0', 'Empty s cannot form ' + j + ' chars of t (dp[0][' + j + '] = 0).', {
      current: [0, j], cells, filled, reads: [], answer: null, vars: { ...baseVars }
    }))
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const a = schars[i - 1]
      const b = tchars[j - 1]
      if (a === b) {
        const skipWays = cells[i - 1][j]
        const useWays = cells[i - 1][j - 1]
        const value = skipWays + useWays
        cells[i][j] = value
        filled.push([i, j])
        frames.push(frame('match', 'dp[' + i + '][' + j + '] = ' + value, "'" + a + "'=='" + b + "': skip " + skipWays + " + use " + useWays + " = " + value + ".", {
          current: [i, j], cells, filled, reads: [[i - 1, j], [i - 1, j - 1]], answer: null, vars: { ...baseVars, value }
        }))
      } else {
        const value = cells[i - 1][j]
        cells[i][j] = value
        filled.push([i, j])
        frames.push(frame('skip', 'dp[' + i + '][' + j + '] = ' + value, "'" + a + "'!='" + b + "': carry skip " + value + " (dp[" + (i - 1) + "][" + j + "]).", {
          current: [i, j], cells, filled, reads: [[i - 1, j]], answer: null, vars: { ...baseVars, value }
        }))
      }
    }
  }

  const answer = cells[m][n]
  frames.push(frame('return', 'Return dp[' + m + '][' + n + '] = ' + answer, 'Ways "' + s + '" forms "' + t + '" is ' + answer + '.', {
    current: [m, n], cells, filled, reads: [], answer: [m, n], vars: { ...baseVars, answer }
  }))

  // Full event list: semantic.js performs the single honest compaction pass.
  return {
    kind: 'grid',
    layout: {
      rows, cols,
      cells: emptyGrid(rows, cols),
      rowLabels: ['\u2205', ...schars],
      colLabels: ['\u2205', ...tchars]
    },
    frames,
    result: answer
  }
}

// Staged-compat alias: the owner package calls the builder buildNumDistinct.
export const buildNumDistinct = build

const numDistinctJava = code(`
[ctx]class Solution {
[ctx]    public int numDistinct(String s, String t) {
[ctx]        int m = s.length(), n = t.length();
[init]        int[][] dp = new int[m + 1][n + 1];
[base]        for (int i = 0; i <= m; i++) dp[i][0] = 1;
[base]        for (int j = 1; j <= n; j++) dp[0][j] = 0;
[ctx]        for (int i = 1; i <= m; i++) {
[ctx]            for (int j = 1; j <= n; j++) {
[ctx]                if (s.charAt(i - 1) == t.charAt(j - 1)) {
[match]                    dp[i][j] = dp[i - 1][j] + dp[i - 1][j - 1];
[ctx]                } else {
[skip]                    dp[i][j] = dp[i - 1][j];
[ctx]                }
[ctx]            }
[ctx]        }
[return]        return dp[m][n];
[ctx]    }
[ctx]}
`)

const numDistinctCpp = code(`
[ctx]#include <string>
[ctx]#include <vector>
[ctx]using namespace std;
[ctx]class Solution {
[ctx]public:
[ctx]    int numDistinct(string s, string t) {
[ctx]        int m = (int)s.size(), n = (int)t.size();
[init]        vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
[base]        for (int i = 0; i <= m; i++) dp[i][0] = 1;
[base]        for (int j = 1; j <= n; j++) dp[0][j] = 0;
[ctx]        for (int i = 1; i <= m; i++) {
[ctx]            for (int j = 1; j <= n; j++) {
[ctx]                if (s[i - 1] == t[j - 1]) {
[match]                    dp[i][j] = dp[i - 1][j] + dp[i - 1][j - 1];
[ctx]                } else {
[skip]                    dp[i][j] = dp[i - 1][j];
[ctx]                }
[ctx]            }
[ctx]        }
[return]        return dp[m][n];
[ctx]    }
[ctx]};
`)

const numDistinctPseudo = code(`
[ctx]function numDistinct(s, t)
[ctx]  m = length(s); n = length(t)
[init]  dp = (m + 1) x (n + 1) table filled with 0
[base]  for i = 0..m: dp[i][0] = 1
[base]  for j = 1..n: dp[0][j] = 0
[ctx]  for i = 1..m:
[ctx]    for j = 1..n:
[ctx]      if s[i - 1] == t[j - 1]:
[match]        dp[i][j] = dp[i - 1][j] + dp[i - 1][j - 1]
[ctx]      else:
[skip]        dp[i][j] = dp[i - 1][j]
[return]  return dp[m][n]
`)

const EXPLAIN = {
  init: 'Allocate a table over all prefix pairs so every smaller count can be stored and reused.',
  base: 'Seed the empty-prefix column and row: empty t has one way, empty s forming nonempty t has zero ways.',
  match: 'When current chars agree, add skipping s[i-1] to using it with the diagonal count.',
  skip: 'When current chars differ, carry the skip count down without using s[i-1].',
  return: 'Report the corner cell holding the count for the full pair of strings.',
  ctx: 'Loop, branch, or scope scaffolding that organizes the table fill without itself writing a cell.'
}

// Per-line explanations, indexed by 0-based display line (presentation
// metadata, never compiled). Verbatim from the reviewed staged packet; the
// code blocks above are byte-identical to the staged listings, so indices
// apply.
const EXPLAIN_LINES = {
  java: {
    1: 'Method header: receives source s and target t; all table work starts below.',
    2: 'Declaration: cache both lengths once; all table dimensions derive from m and n.'
  },
  cpp: {
    5: 'Method header: receives source s and target t by value; table work starts below.',
    6: 'Declaration: cache both sizes once; all table dimensions derive from m and n.'
  },
  pseudo: {
    0: 'Function header: names source s and target t; table work starts below.',
    1: 'Declaration: cache both lengths once; all table dimensions derive from m and n.'
  }
}

export const adapters = {
  'distinct-subsequences': {
    signature: SIGNATURE,
    lesson: {
      idea: 'dp[i][j] counts distinct subsequences of the first i chars of s that equal the first j chars of t; a match adds skip (dp[i-1][j]) plus use (dp[i-1][j-1]), a mismatch carries skip.',
      trap: 'dp[i][0] is 1 for every i (empty t has exactly one subsequence: delete all); only add the diagonal when current chars match, never on mismatch.',
      time: 'O(m*n)',
      space: 'O(m*n) table (O(n) with one rolling row)'
    },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    code: { java: numDistinctJava, cpp: numDistinctCpp, pseudo: numDistinctPseudo },
    build
  }
}

export default adapters['distinct-subsequences']
export { boundedFrames }
