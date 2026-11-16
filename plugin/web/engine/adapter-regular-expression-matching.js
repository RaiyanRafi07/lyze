/**
 * regular-expression-matching — live walkthrough adapter (2-D Dynamic Programming, LeetCode 10).
 *
 * Prefix-match table dp[i][j] = "does s[:i] match p[:j]": the empty row is
 * seeded past each star ("x*" matches ""), a letter/dot copies the diagonal
 * on first-char agreement, and a star takes zero-of-x (dp[i][j-2]) OR
 * consume-one-more (dp[i-1][j] when s[i-1] agrees with the star element).
 *
 * Ported from .workers/jobs/neetcode150-completion/regular-expression-matching/adapter.mjs
 * (frames, verdicts, code listings and line notes unchanged) plus the additive
 * layout patch from .workers/jobs/question-owners-150/regular-expression-matching/adapter.mjs:
 * layout also exposes the real input chars (layout.rowLabels/colLabels =
 * ['∅', ...s/p]) so the 2D visual renders axis labels from recorded data.
 * Pure, synchronous, dependency-free ES module. No DOM, no network, no randomness.
 * Primary source: https://leetcode.com/problems/regular-expression-matching/
 *
 * Signature equals the live judge signature exactly:
 * isMatch(s: string, p: string) -> boolean (plugin/data/shard-14.json).
 */

import { code, frame, boundedFrames } from './semantic-core.js';

void boundedFrames;

const MAX_S = 6;
const MAX_P = 6;

const isMatchJava = code(`
[def] class Solution {
[def]     public boolean isMatch(String s, String p) {
[init]         int m = s.length();
[init]         int n = p.length();
[init]         boolean[][] dp = new boolean[m + 1][n + 1];
[init]         dp[0][0] = true;
[base]         for (int j = 1; j <= n; j++) {
[base]             if (p.charAt(j - 1) == '*') {
[base]                 dp[0][j] = dp[0][j - 2];
[base]             }
[base]         }
[loop]         for (int i = 1; i <= m; i++) {
[loop]             for (int j = 1; j <= n; j++) {
[star]                 if (p.charAt(j - 1) == '*') {
[star]                     dp[i][j] = dp[i][j - 2];
[star]                     if (firstMatch(s, p, i, j - 1)) {
[star]                         dp[i][j] = dp[i][j] || dp[i - 1][j];
[star]                     }
[match]                 } else if (firstMatch(s, p, i, j)) {
[match]                     dp[i][j] = dp[i - 1][j - 1];
[match]                 }
[loop]             }
[loop]         }
[return]         return dp[m][n];
[def]     }
[def]     private boolean firstMatch(String s, String p, int i, int j) {
[match]         if (j == 0) {
[match]             return false;
[match]         }
[match]         if (p.charAt(j - 1) == '.') {
[match]             return true;
[match]         }
[match]         return s.charAt(i - 1) == p.charAt(j - 1);
[def]     }
[def] }
`);

const isMatchCpp = code(`
[def] #include <string>
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     bool isMatch(string s, string p) {
[init]         int m = (int)s.size();
[init]         int n = (int)p.size();
[init]         vector<vector<char>> dp(m + 1, vector<char>(n + 1, 0));
[init]         dp[0][0] = 1;
[base]         for (int j = 1; j <= n; j++) {
[base]             if (p[j - 1] == '*') {
[base]                 dp[0][j] = dp[0][j - 2];
[base]             }
[base]         }
[loop]         for (int i = 1; i <= m; i++) {
[loop]             for (int j = 1; j <= n; j++) {
[star]                 if (p[j - 1] == '*') {
[star]                     dp[i][j] = dp[i][j - 2];
[star]                     if (firstMatch(s, p, i, j - 1)) {
[star]                         dp[i][j] = dp[i][j] || dp[i - 1][j];
[star]                     }
[match]                 } else if (firstMatch(s, p, i, j)) {
[match]                     dp[i][j] = dp[i - 1][j - 1];
[match]                 }
[loop]             }
[loop]         }
[return]         return dp[m][n];
[def]     }
[def] private:
[def]     bool firstMatch(const string& s, const string& p, int i, int j) {
[match]         if (j == 0) {
[match]             return false;
[match]         }
[match]         if (p[j - 1] == '.') {
[match]             return true;
[match]         }
[match]         return s[i - 1] == p[j - 1];
[def]     }
[def] };
`);

const isMatchPseudo = code(`
[def] isMatch(s, p):
[init]   m = len(s); n = len(p); dp = (m+1) x (n+1) false; dp[0][0] = true
[base]   for j = 1..n: if p[j-1] == '*': dp[0][j] = dp[0][j-2]
[loop]   for i = 1..m: for j = 1..n:
[star]     if p[j-1] == '*': dp[i][j] = dp[i][j-2] or (first(i,j-1) and dp[i-1][j])
[match]     else if first(i,j): dp[i][j] = dp[i-1][j-1]
[match]     first(i,j): j > 0 and (p[j-1] == '.' or s[i-1] == p[j-1])
[return]   return dp[m][n]
`);

function decodeArgs(args) {
  if (!Array.isArray(args) || args.length !== 2 || typeof args[0] !== 'string' || typeof args[1] !== 'string') {
    throw new Error('regular-expression-matching walkthrough needs args [s, p] with two strings');
  }
  const s = args[0];
  const p = args[1];
  if (!/^[a-z]*$/.test(s)) throw new Error('regular-expression-matching walkthrough needs s over [a-z]; got ' + JSON.stringify(s));
  if (s.length > MAX_S) throw new Error('Walkthrough visual bound: s length 0..' + MAX_S + ' (judge allows up to 20); got ' + s.length);
  if (p.length < 1 || p.length > MAX_P) throw new Error('Walkthrough visual bound: p length 1..' + MAX_P + ' (judge allows up to 20); got ' + p.length);
  if (!/^[a-z.*]*$/.test(p)) throw new Error('Walkthrough needs p over [a-z.*]; got ' + JSON.stringify(p));
  for (let k = 0; k < p.length; k += 1) {
    if (p[k] === '*' && (k === 0 || p[k - 1] === '*')) throw new Error('Invalid pattern: every * needs a preceding element; got ' + JSON.stringify(p));
  }
  return [s, p];
}

const T = (v) => (v ? 'T' : 'F');

function firstMatchAt(s, p, i, j) {
  if (j <= 0) return false;
  if (p[j - 1] === '.') return true;
  if (i <= 0) return false;
  return s[i - 1] === p[j - 1];
}

function build(args) {
  const [s, p] = decodeArgs(args);
  const m = s.length;
  const n = p.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(false));
  dp[0][0] = true;
  const filled = [[0, 0]];
  const filledSet = new Set(['0,0']);
  let cmp = 0;
  let writes = 1;
  const frames = [];
  const snap = () => dp.map((row) => row.map((v) => (v ? 1 : 0)));

  const state = (current, extra = {}) => ({
    current,
    filled: filled.map((c) => c.slice()),
    cells: snap(),
    reads: extra.reads || [],
    ops: { cmp, writes },
    vars: { m, n, i: extra.i ?? 0, j: extra.j ?? 0, ans: dp[m][n] ? 1 : 0 },
  });
  const push = (step, label, note, current, extra = {}) =>
    frames.push(frame(step, label, note, state(current, extra)));

  push('init', 'dp[0][0] = true', 's="' + s + '" (m=' + m + '), p="' + p + '" (n=' + n + '); empty matches empty.', [0, 0], { i: 0, j: 0 });

  for (let j = 1; j <= n; j += 1) {
    let v = false;
    let reads = [];
    let note;
    cmp += 1;
    if (p[j - 1] === '*') {
      v = dp[0][j - 2];
      reads = [[0, j - 2]];
      note = "p[" + (j - 1) + "]='*': empty vs '" + p.slice(0, j) + "' copies dp[0][" + (j - 2) + "]=" + T(v) + '.';
    } else {
      note = "p[" + (j - 1) + "]='" + p[j - 1] + "' can't match empty: dp[0][" + j + ']=F.';
    }
    dp[0][j] = v;
    writes += 1;
    const key = '0,' + j;
    if (!filledSet.has(key)) { filledSet.add(key); filled.push([0, j]); }
    push('base', 'dp[0][' + j + '] = ' + T(v), note, [0, j], { i: 0, j, reads });
  }

  for (let i = 1; i <= m; i += 1) {
    push('loop', 'Row i=' + i, 'Match prefix "' + s.slice(0, i) + '": s[' + (i - 1) + "]='" + s[i - 1] + "'.", [i, 0], { i, j: 0 });
    for (let j = 1; j <= n; j += 1) {
      cmp += 1;
      if (p[j - 1] === '*') {
        const zero = dp[i][j - 2];
        const fm = firstMatchAt(s, p, i, j - 1);
        cmp += 1;
        const consume = fm && dp[i - 1][j];
        const v = zero || consume;
        dp[i][j] = v;
        writes += 1;
        const reads = fm ? [[i, j - 2], [i - 1, j]] : [[i, j - 2]];
        const note = "p[" + (j - 1) + "]='*': zero->dp[" + i + '][' + (j - 2) + ']=' + T(zero) + '; '
          + (fm ? "s[" + (i - 1) + "]~p[" + (j - 2) + ']&dp[' + (i - 1) + '][' + j + ']=' + T(dp[i - 1][j]) + '->' + T(v) : "s[" + (i - 1) + "]!~p[" + (j - 2) + ']->' + T(v)) + '.';
        const key = i + ',' + j;
        if (!filledSet.has(key)) { filledSet.add(key); filled.push([i, j]); }
        push('star', 'dp[' + i + '][' + j + '] = ' + T(v), note, [i, j], { i, j, reads });
      } else {
        const fm = firstMatchAt(s, p, i, j);
        cmp += 1;
        const v = fm && dp[i - 1][j - 1];
        dp[i][j] = v;
        writes += 1;
        const note = fm
          ? "p[" + (j - 1) + "]='" + p[j - 1] + "'~s[" + (i - 1) + "]='" + s[i - 1] + "': carry dp[" + (i - 1) + '][' + (j - 1) + ']=' + T(v) + '.'
          : "p[" + (j - 1) + "]='" + p[j - 1] + "'!~s[" + (i - 1) + "]='" + s[i - 1] + "': dp[" + i + '][' + j + ']=F.';
        const key = i + ',' + j;
        if (!filledSet.has(key)) { filledSet.add(key); filled.push([i, j]); }
        push('match', 'dp[' + i + '][' + j + '] = ' + T(v), note, [i, j], { i, j, reads: [[i - 1, j - 1]] });
      }
    }
  }

  const ans = dp[m][n];
  push(
    'return',
    'dp[' + m + '][' + n + '] = ' + T(ans),
    's="' + s + '" ' + (ans ? 'matches' : 'does not match') + ' p="' + p + '": return ' + ans + '.',
    [m, n],
    { i: m, j: n, reads: [[m, n]] },
  );
  // Full event list: the host performs the single honest compaction pass.
  return {
    kind: 'grid',
    layout: { rows: m + 1, cols: n + 1, cells: snap(), rowLabels: ['∅', ...s], colLabels: ['∅', ...p] },
    frames,
    result: ans,
  };
}

export const adapters = {
  'regular-expression-matching': {
    signature: { name: 'isMatch', params: ['string', 'string'], return: 'boolean' },
    lesson: {
      idea: 'dp[i][j]: does s[:i] match p[:j]? A star either drops its element or eats one more char.',
      trap: 'A star never stands alone: dp[i][j] reads dp[i][j-2] (zero) and dp[i-1][j] (consume), not the diagonal.',
      time: 'O(m*n)',
      space: 'O(m*n)',
    },
    // Per-step explanations (presentation metadata, never compiled).
    // Staged source: neetcode150-completion/regular-expression-matching/lesson.mjs (idea/traps) + adapter.mjs.
    explain: {
      def: 'Structural wrapper: declares the class and method scope; no table operation runs here.',
      init: 'Size the (m+1)x(n+1) prefix table; empty matches empty, so dp[0][0] is true.',
      base: 'Seed the empty row: a star lets its prefix match "", so dp[0][j] copies dp[0][j-2].',
      loop: 'Grow the string prefix one row at a time; every read hits an already computed cell.',
      star: 'Star branch: zero of the element (drop "x*") or, on agreement, consume one more char and keep the star.',
      match: 'Plain branch: the two chars must agree, then carry the diagonal shorter-prefixes verdict.',
      return: 'Bottom-right cell decided the full strings against the full pattern; return it.',
    },
    // Converted 1:1 from the staged per-line notes (lesson.mjs javaNotes/cppNotes/pseudoNotes).
    explainLines: {
      java: {
        0: 'Container the judge instantiates; the method lives inside it.',
        1: 'Entry point: string and pattern in, full-match verdict out.',
        2: 'String prefix count: rows of the table.',
        3: 'Pattern prefix count: columns of the table.',
        4: 'dp[i][j]: does s[:i] match p[:j]? Java defaults all to false.',
        5: 'Base of everything: empty matches empty.',
        6: 'Seed the empty row: which prefixes can match "".',
        7: 'Only a star lets a nonempty pattern match the empty string.',
        8: 'Drop "x*": empty vs p[:j] is whatever empty vs p[:j-2] was.',
        9: 'Close of the star-seed branch.',
        10: 'Close of the empty-row seeding loop.',
        11: 'Grow the string prefix one char at a time.',
        12: 'Grow the pattern prefix; reads only touch earlier cells.',
        13: 'Star branch: zero of x, or eat one more char with x.',
        14: 'Zero option first: ignore "x*" and inherit two columns back.',
        15: 'Can x eat s[i-1]? Test s[i-1] against p[j-2] (or dot).',
        16: 'Consume option: keep the star, drop one string char.',
        17: 'Close of the star branch.',
        18: 'Plain branch: single chars must agree, then carry the diagonal.',
        19: 'Agreement holds, so inherit the shorter-prefixes verdict.',
        20: 'Close of the plain branch.',
        21: 'Close of the inner pattern loop.',
        22: 'Close of the outer string loop.',
        23: 'Bottom-right cell matched the full strings against the full pattern.',
        24: 'Close of the method scope.',
        25: 'Helper: does s[i-1] agree with p[j-1] (dot counts)?',
        26: 'No pattern char left to offer: nothing can agree.',
        27: 'Empty pattern position never matches a char.',
        28: 'Close of the empty-position guard.',
        29: 'Dot branch: the wildcard agrees with anything.',
        30: 'Dot matches this one char; the table decides the rest.',
        31: 'Close of the dot branch.',
        32: 'Otherwise the two literal chars must be equal.',
        33: 'Close of the helper scope.',
        34: 'Close of the class scope.',
      },
      cpp: {
        0: 'Brings in std::string for the s and p parameters.',
        1: 'Brings in std::vector for the DP table.',
        2: 'Lets the code write string/vector without std::.',
        3: 'Container the judge instantiates; the method lives inside it.',
        4: 'Makes isMatch callable from outside the class.',
        5: 'Entry point: string and pattern in, full-match verdict out.',
        6: 'String prefix count: rows of the table.',
        7: 'Pattern prefix count: columns of the table.',
        8: 'dp[i][j]: does s[:i] match p[:j]? Chars act as booleans.',
        9: 'Base of everything: empty matches empty.',
        10: 'Seed the empty row: which prefixes can match "".',
        11: 'Only a star lets a nonempty pattern match the empty string.',
        12: 'Drop "x*": empty vs p[:j] is whatever empty vs p[:j-2] was.',
        13: 'Close of the star-seed branch.',
        14: 'Close of the empty-row seeding loop.',
        15: 'Grow the string prefix one char at a time.',
        16: 'Grow the pattern prefix; reads only touch earlier cells.',
        17: 'Star branch: zero of x, or eat one more char with x.',
        18: 'Zero option first: ignore "x*" and inherit two columns back.',
        19: 'Can x eat s[i-1]? Test s[i-1] against p[j-2] (or dot).',
        20: 'Consume option: keep the star, drop one string char.',
        21: 'Close of the star branch.',
        22: 'Plain branch: single chars must agree, then carry the diagonal.',
        23: 'Agreement holds, so inherit the shorter-prefixes verdict.',
        24: 'Close of the plain branch.',
        25: 'Close of the inner pattern loop.',
        26: 'Close of the outer string loop.',
        27: 'Bottom-right cell matched the full strings against the full pattern.',
        28: 'Close of the method scope.',
        29: 'The helper is an implementation detail, not judge API.',
        30: 'Helper: does s[i-1] agree with p[j-1] (dot counts)?',
        31: 'No pattern char left to offer: nothing can agree.',
        32: 'Empty pattern position never matches a char.',
        33: 'Close of the empty-position guard.',
        34: 'Dot branch: the wildcard agrees with anything.',
        35: 'Dot matches this one char; the table decides the rest.',
        36: 'Close of the dot branch.',
        37: 'Otherwise the two literal chars must be equal.',
        38: 'Close of the helper scope.',
        39: 'Close of the class scope.',
      },
      pseudo: {
        0: 'Takes the string and pattern; returns the full-match verdict.',
        1: 'Size the prefix table; empty matches empty.',
        2: 'Seed the empty row by dropping each "x*" in turn.',
        3: 'Fill row by row; every read hits an already computed cell.',
        4: 'Star: zero of x, or x eats s[i-1] and the star stays.',
        5: 'Letter or dot: agree now and inherit the diagonal.',
        6: 'Agreement test: in range, and dot-or-equal.',
        7: 'Full prefixes decided: the answer sits bottom-right.',
      },
    },
    code: { java: isMatchJava, cpp: isMatchCpp, pseudo: isMatchPseudo },
    build,
  },
};

export const visualBounds = { minS: 0, maxS: MAX_S, minP: 1, maxP: MAX_P };
