/**
 * permutation-in-string — live walkthrough adapter (Sliding Window, LeetCode 567).
 *
 * Live signature matches the judge record in plugin/data/shard-6.json exactly:
 * checkInclusion(string s1, string s2) -> boolean. Fixed window of s1.length
 * over s2 with a matches counter over the 26 frequency slots.
 *
 * Ported from .workers/jobs/question-owners-150/permutation-in-string/permutation-in-string.adapter.js
 * (frames, verdicts, signature, code listings and explain map unchanged) plus the same
 * additive layout patch: layout() also exposes the real s1 string and need[] counts
 * (layout.s1 / layout.need) so the 2D visual renders the target row from recorded data.
 * Pure, synchronous, dependency-free ES module. No DOM, no network, no randomness.
 * Primary source: https://leetcode.com/problems/permutation-in-string
 */
import { code, frame, boundedFrames } from './semantic-core.js';

export const SLUG = 'permutation-in-string';

export const SIGNATURE = {
  name: 'checkInclusion',
  params: [{ name: 's1', type: 'string' }, { name: 's2', type: 'string' }],
  return: 'boolean',
};

const EXPLAIN = {
  need: 'Count each letter of s1 once; equal counts define a permutation, so this is the target.',
  init: 'Fill the first window from s2 and count positions where need and window agree (all 26).',
  check: 'Test matches == 26: every letter frequency agrees, so the current window is a permutation.',
  slide: 'Advance the fixed window by one: the next s2 character enters and the oldest one leaves.',
  update: 'Edit matches only around the two touched letters: drop the stale equality before the edit, restore it after.',
  done: 'Return whether any window matched; reaching the end with matches < 26 means no permutation exists.',
};

const javaLines = code(`
[need] class Solution {
[need]     public boolean checkInclusion(String s1, String s2) {
[need]         if (s1.length() > s2.length()) return false;
[need]         int[] need = new int[26];
[need]         for (int i = 0; i < s1.length(); i++) need[s1.charAt(i) - 'a']++;
[need]         int[] window = new int[26];
[init]         for (int i = 0; i < s1.length(); i++) window[s2.charAt(i) - 'a']++;
[init]         int matches = 0;
[init]         for (int c = 0; c < 26; c++) if (need[c] == window[c]) matches++;
[check]         if (matches == 26) return true;
[slide]         for (int right = s1.length(); right < s2.length(); right++) {
[slide]             char add = s2.charAt(right);
[slide]             char remove = s2.charAt(right - s1.length());
[update]             if (need[add - 'a'] == window[add - 'a']) matches--;
[update]             window[add - 'a']++;
[update]             if (need[add - 'a'] == window[add - 'a']) matches++;
[update]             if (need[remove - 'a'] == window[remove - 'a']) matches--;
[update]             window[remove - 'a']--;
[update]             if (need[remove - 'a'] == window[remove - 'a']) matches++;
[check]             if (matches == 26) return true;
[slide]         }
[done]         return false;
[done]     }
[done] }
`);

const cppLines = code(`
[need] class Solution {
[need] public:
[need]     bool checkInclusion(string s1, string s2) {
[need]         if ((int)s1.size() > (int)s2.size()) return false;
[need]         vector<int> need(26, 0), window(26, 0);
[need]         for (char c : s1) need[c - 'a']++;
[init]         for (int i = 0; i < (int)s1.size(); i++) window[s2[i] - 'a']++;
[init]         int matches = 0;
[init]         for (int c = 0; c < 26; c++) if (need[c] == window[c]) matches++;
[check]         if (matches == 26) return true;
[slide]         for (int right = (int)s1.size(); right < (int)s2.size(); right++) {
[slide]             char add = s2[right];
[slide]             char remove = s2[right - (int)s1.size()];
[update]             if (need[add - 'a'] == window[add - 'a']) matches--;
[update]             window[add - 'a']++;
[update]             if (need[add - 'a'] == window[add - 'a']) matches++;
[update]             if (need[remove - 'a'] == window[remove - 'a']) matches--;
[update]             window[remove - 'a']--;
[update]             if (need[remove - 'a'] == window[remove - 'a']) matches++;
[check]             if (matches == 26) return true;
[slide]         }
[done]         return false;
[done]     }
[done] };
`);

const pseudoLines = code(`
[need] function checkInclusion(s1, s2):
[need]   if length(s1) > length(s2): return false
[need]   need = 26 zero counts; for c in s1: need[c] += 1
[init]   window = 26 zero counts; for i in 0..length(s1)-1: window[s2[i]] += 1
[init]   matches = count of c in 0..25 with need[c] == window[c]
[check]   if matches == 26: return true
[slide]   for right from length(s1) to length(s2)-1:
[slide]     add = s2[right]; remove = s2[right - length(s1)]
[update]     if need[add] == window[add]: matches -= 1
[update]     window[add] += 1; if need[add] == window[add]: matches += 1
[update]     if need[remove] == window[remove]: matches -= 1
[update]     window[remove] -= 1; if need[remove] == window[remove]: matches += 1
[check]     if matches == 26: return true
[done]   return false
`);

// Per-line notes derived from the real parsed lines: each line explains its own
// recorded operation step (never invented; structural wrappers get scope notes
// from semantic.js).
const explainLinesFor = (lines) => lines.map((l) => EXPLAIN[l.step] || null);
const EXPLAIN_LINES = {
  java: explainLinesFor(javaLines),
  cpp: explainLinesFor(cppLines),
  pseudo: explainLinesFor(pseudoLines),
};

function stringArg(value, max = 40) {
  if (typeof value !== 'string' || value.length > max) {
    throw new Error('Use a string of at most ' + max + ' characters for this walkthrough');
  }
  return value;
}

function build(args) {
  if (!Array.isArray(args) || args.length !== 2 || typeof args[0] !== 'string' || typeof args[1] !== 'string') {
    throw new Error('permutation-in-string walkthrough needs args [s1, s2] with two strings');
  }
  const s1 = stringArg(args[0], 40);
  const s2 = stringArg(args[1], 40);
  if (s1.length < 1) throw new Error('permutation-in-string needs s1.length >= 1 (judge constraint)');
  if (s2.length < 1) throw new Error('permutation-in-string needs s2.length >= 1 (judge constraint)');
  if (!/^[a-z]*$/.test(s1) || !/^[a-z]*$/.test(s2)) {
    throw new Error('permutation-in-string walkthrough supports lowercase a-z only (judge constraint)');
  }
  const m = s1.length;
  const n = s2.length;
  const chars = Array.from(s2);
  const frames = [];
  const anchors = [];
  const need = new Array(26).fill(0);
  for (const ch of s1) need[ch.charCodeAt(0) - 97]++;
  // Additive layout detail: expose the real s1 target string and its real need[]
  // counts so the 2D visual renders the target row without parsing display text.
  const needMap = {};
  for (let c = 0; c < 26; c++) if (need[c] > 0) needMap[String.fromCharCode(97 + c)] = need[c];
  const layout = () => ({ chars: chars.slice(), mapKind: 'counts', s1, need: { ...needMap } });
  const window = new Array(26).fill(0);

  const seenOf = () => {
    const o = {};
    for (let c = 0; c < 26; c++) {
      if (need[c] > 0) o[String.fromCharCode(97 + c)] = window[c] + '/' + need[c];
    }
    return o;
  };
  const stateOf = (left, right, extra = {}) => {
    const highlights = {};
    if (left !== null && right !== null && left <= right) {
      for (let k = left; k <= right; k++) highlights[k] = 'ok';
      highlights[right] = 'accent';
    }
    Object.assign(highlights, extra.highlights || {});
    return {
      pointers: left === null ? {} : { left, right },
      window: left === null ? [0, -1] : [left, right],
      highlights,
      seen: seenOf(),
      vars: { m, n, matches: extra.matches !== undefined ? extra.matches : matches, ...(extra.vars || {}) },
    };
  };

  frames.push(frame('need', 'Count s1="' + s1 + '"',
    'Need ' + m + ' letters; permutation means matching all 26 frequency slots.',
    { pointers: {}, window: [0, -1], highlights: {}, seen: seenOf(), vars: { m, n, matches: 0 } }));

  if (m > n) {
    frames.push(frame('done', 's1 longer than s2',
      's1 has ' + m + ' letters but s2 has ' + n + '; no window fits, return false.',
      { pointers: {}, window: [0, -1], highlights: {}, seen: seenOf(), vars: { m, n, matches: 0 } }));
    return { kind: 'string', layout: layout(), frames, result: false, anchors };
  }

  for (let i = 0; i < m; i++) window[s2.charCodeAt(i) - 97]++;
  let matches = 0;
  for (let c = 0; c < 26; c++) if (need[c] === window[c]) matches++;
  frames.push(frame('init', 'First window [0, ' + (m - 1) + ']',
    'Window "' + s2.slice(0, m) + '" gives matches=' + matches + ' of 26 slots.',
    stateOf(0, m - 1, { matches })));
  anchors.push(frames.length - 1);
  frames.push(frame('check', matches === 26 ? 'Match at [0, ' + (m - 1) + ']' : 'No match yet',
    matches === 26
      ? 'matches=26: every frequency agrees, return true.'
      : 'matches=' + matches + ' < 26: keep sliding.',
    stateOf(0, m - 1, { matches, highlights: matches === 26 ? { 0: 'ok', [m - 1]: 'ok' } : {} })));
  if (matches === 26) {
    frames.push(frame('done', 'Found "' + s2.slice(0, m) + '"',
      'Window [0, ' + (m - 1) + '] is a permutation of s1; return true.',
      stateOf(0, m - 1, { matches, highlights: { 0: 'ok', [m - 1]: 'ok' } })));
    return { kind: 'string', layout: layout(), frames, result: true, anchors };
  }

  for (let right = m; right < n; right++) {
    const left = right - m;
    const add = s2[right];
    const remove = s2[left];
    frames.push(frame('slide', 'Slide to [' + (left + 1) + ', ' + right + ']',
      "Drop '" + remove + "' at " + left + ", take '" + add + "' at " + right + '.',
      stateOf(left + 1, right, { matches, highlights: { [left]: 'warn', [right]: 'accent' } })));
    // Entering character.
    if (need[add.charCodeAt(0) - 97] === window[add.charCodeAt(0) - 97]) matches--;
    window[add.charCodeAt(0) - 97]++;
    if (need[add.charCodeAt(0) - 97] === window[add.charCodeAt(0) - 97]) matches++;
    frames.push(frame('update', "Add '" + add + "'",
      "Post-update: '" + add + "' is " + window[add.charCodeAt(0) - 97] + '/' + need[add.charCodeAt(0) - 97] + ', matches=' + matches + '.',
      stateOf(left + 1, right, { matches })));
    // Leaving character.
    if (need[remove.charCodeAt(0) - 97] === window[remove.charCodeAt(0) - 97]) matches--;
    window[remove.charCodeAt(0) - 97]--;
    if (need[remove.charCodeAt(0) - 97] === window[remove.charCodeAt(0) - 97]) matches++;
    frames.push(frame('update', "Drop '" + remove + "'",
      "Post-update: '" + remove + "' is " + window[remove.charCodeAt(0) - 97] + '/' + need[remove.charCodeAt(0) - 97] + ', matches=' + matches + '.',
      stateOf(left + 1, right, { matches })));
    frames.push(frame('check', matches === 26 ? 'Match at [' + (left + 1) + ', ' + right + ']' : 'Window [' + (left + 1) + ', ' + right + ']',
      matches === 26
        ? 'matches=26 on "' + s2.slice(left + 1, right + 1) + '": return true.'
        : 'matches=' + matches + ' < 26 on "' + s2.slice(left + 1, right + 1) + '": continue.',
      stateOf(left + 1, right, { matches, highlights: matches === 26 ? { [left + 1]: 'ok', [right]: 'ok' } : { [right]: 'accent' } })));
    if (matches === 26) {
      anchors.push(frames.length - 1);
      frames.push(frame('done', 'Found "' + s2.slice(left + 1, right + 1) + '"',
        'Window [' + (left + 1) + ', ' + right + '] is a permutation of s1; return true.',
        stateOf(left + 1, right, { matches, highlights: { [left + 1]: 'ok', [right]: 'ok' } })));
      return { kind: 'string', layout: layout(), frames, result: true, anchors };
    }
  }

  frames.push(frame('done', 'No permutation found',
    'All ' + (n - m + 1) + ' windows checked, matches never hit 26; return false.',
    { pointers: { left: n - m, right: n - 1 }, window: [n - m, n - 1], highlights: {}, seen: seenOf(), vars: { m, n, matches } }));
  return { kind: 'string', layout: layout(), frames, result: false, anchors };
}

export const adapters = {
  'permutation-in-string': {
    signature: { name: 'checkInclusion', params: ['string', 'string'], return: 'boolean' },
    lesson: {
      idea: 'A permutation means equal 26-letter counts, so a fixed window of s1.length over s2 with a matches counter decides it.',
      trap: 'Rebuilding counts per window is O(26*n); comparing only at the end misses the early hit — update matches on entry and exit.',
      time: 'O(n)',
      space: 'O(1)',
      why: 'Sorting each window costs O(m log m) per step; two 26-slot count arrays plus a matches counter turn every slide into two O(1) count edits.',
      alt: 'Genuine alternative: sort s1 once and sort each s2 window of length m — same verdict, O((n-m)*m log m) time, O(m) space; fine for tiny inputs, too slow at 10^4.',
    },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    code: { java: javaLines, cpp: cppLines, pseudo: pseudoLines },
    build,
  },
};

export default adapters['permutation-in-string'];
export { boundedFrames };
