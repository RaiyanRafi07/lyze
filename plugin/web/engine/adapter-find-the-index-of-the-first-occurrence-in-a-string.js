/** Find the Index of the First Occurrence in a String (strStr) — portable per-slug adapter.
 *
 * Naive left-to-right scan of the actual inputs: try each start i in
 * [0, n-m] in order, compare needle[0..m) against haystack[i..i+m)
 * character by character, and return the first i whose whole needle
 * matches; return -1 when every start fails. Pure + synchronous, never
 * throws on import. Out-of-range or non-lowercase inputs throw instead of
 * rendering. Register under slug
 * `find-the-index-of-the-first-occurrence-in-a-string` (see
 * integration.json).
 * Target: a new per-slug file
 * plugin/web/engine/adapter-find-the-index-of-the-first-occurrence-in-a-string.js
 * (additive; no existing export is renamed) — or the strings family file the
 * integrator chooses, as long as the key, signature, steps, kind and visual
 * bound below are kept verbatim. Family precedent:
 * plugin/web/engine/adapter-permutation-in-string.js (two-string layout with
 * additive needle detail + shared `semantic-core.js` helpers).
 */
import { code, frame, boundedFrames } from './semantic-core.js';

export const SLUG = 'find-the-index-of-the-first-occurrence-in-a-string';
export const MAX_HAYSTACK = 9;
export const MAX_NEEDLE = 6;
export const MAX_FRAMES = 40;

export const SIGNATURE = Object.freeze({
  name: 'strStr',
  params: Object.freeze(['string', 'string']),
  return: 'int',
});

const strStrCode = {
  java: code(`
[init] class Solution {
[init]     public int strStr(String haystack, String needle) {
[init]         int n = haystack.length();
[init]         int m = needle.length();
[init]         if (m == 0) return 0;
[align]         for (int i = 0; i <= n - m; i++) {
[compare]             int j = 0;
[compare]             while (j < m && haystack.charAt(i + j) == needle.charAt(j)) {
[compare]                 j++;
[compare]             }
[match]             if (j == m) return i;
[align]         }
[fail]         return -1;
[init]     }
[init] }
`),
  cpp: code(`
[init] class Solution {
[init] public:
[init]     int strStr(string haystack, string needle) {
[init]         int n = (int)haystack.size();
[init]         int m = (int)needle.size();
[init]         if (m == 0) return 0;
[align]         for (int i = 0; i <= n - m; i++) {
[compare]             int j = 0;
[compare]             while (j < m && haystack[i + j] == needle[j]) {
[compare]                 j++;
[compare]             }
[match]             if (j == m) return i;
[align]         }
[fail]         return -1;
[init]     }
[init] };
`),
  pseudo: code(`
[init] function strStr(haystack, needle):
[init]   n = length(haystack); m = length(needle)
[init]   if m == 0: return 0
[align]   for i from 0 to n - m:
[compare]     j = 0
[compare]     while j < m and haystack[i + j] == needle[j]: j += 1
[match]     if j == m: return i
[fail]   return -1
`),
};

export const LESSON = Object.freeze({
  idea: 'Try each start i from 0 to n-m in order; compare the needle left to right and return the first i whose whole needle matches.',
  trap: 'Stopping at the first partial match, or looping i < n-m instead of i <= n-m, drops the end-aligned hit such as "a" in "ba"; after a mismatch resume at i+1, never skip ahead.',
  time: 'O(n·m) — one probe per (start, offset) pair',
  space: 'O(1)',
});

export const EXPLAIN = Object.freeze({
  init: 'Read n and m; an empty needle matches at 0 before any scan runs.',
  align: 'Pick the next start i; every earlier start already failed, so the first occurrence (if any) is at or after i.',
  compare: 'Probe haystack[i+j] against needle[j]; a mismatch abandons this start, while m agreements in a row prove it.',
  match: 'All m characters agreed, so i is the first occurrence — return it immediately without scanning later starts.',
  fail: 'Every start failed (or the needle is longer than the haystack), so the needle never occurs — return -1.',
});

export const EXPLAIN_LINES = Object.freeze({
  java: [
    'Structural wrapper: the Solution class scope. No operation runs here.',
    'Signature: strStr takes haystack and needle strings and returns int. Execution starts in the body.',
    'Read n: haystack length fixes how many starts fit; nothing is compared yet.',
    'Read m: needle length fixes the per-start probe count; nothing is compared yet.',
    'Empty-needle guard: a zero-length needle matches at index 0 by definition.',
    'Outer loop: visit starts 0..n-m in order so the first full match found is the answer.',
    'Seed the per-start offset j at 0 before probing this start.',
    'Probe loop: keep comparing while characters agree and offsets remain inside the needle.',
    'Advance j past one agreed character; the next probe compares the following pair.',
    'End of the probe loop: j now counts how many leading characters agreed.',
    'Full-match test: j == m means all m probes agreed, so return this start immediately.',
    'End of one start: control advances to i+1; no valid answer was skipped.',
    'No start matched, so return -1: the needle occurs nowhere in the haystack.',
    'Structural wrapper: close the method scope. No operation runs here.',
    'Structural wrapper: close the class scope. No operation runs here.',
  ],
  cpp: [
    'Structural wrapper: the Solution class scope. No operation runs here.',
    'Structural wrapper: public section opener. No operation runs here.',
    'Signature: strStr takes haystack and needle strings and returns int. Execution starts in the body.',
    'Read n: haystack size fixes how many starts fit; nothing is compared yet.',
    'Read m: needle size fixes the per-start probe count; nothing is compared yet.',
    'Empty-needle guard: a zero-length needle matches at index 0 by definition.',
    'Outer loop: visit starts 0..n-m in order so the first full match found is the answer.',
    'Seed the per-start offset j at 0 before probing this start.',
    'Probe loop: keep comparing while characters agree and offsets remain inside the needle.',
    'Advance j past one agreed character; the next probe compares the following pair.',
    'End of the probe loop: j now counts how many leading characters agreed.',
    'Full-match test: j == m means all m probes agreed, so return this start immediately.',
    'End of one start: control advances to i+1; no valid answer was skipped.',
    'No start matched, so return -1: the needle occurs nowhere in the haystack.',
    'Structural wrapper: close the method scope. No operation runs here.',
    'Structural wrapper: class terminator. No operation runs here.',
  ],
  pseudo: [
    'Name the task: strStr reads both strings and returns the first start index or -1.',
    'Read n and m before any comparison; the bounds of the whole scan.',
    'Empty-needle guard: return 0 without scanning.',
    'Visit starts 0..n-m in ascending order so the first hit is the answer.',
    'Seed offset j at 0 for this start.',
    'Probe while characters agree; j counts leading agreements.',
    'Return i as soon as all m characters agree.',
    'Reached only after every start failed: return -1.',
  ],
});

/** Independent oracle: the platform substring search. No per-character loop,
 * no i/j counters, no n-m bound arithmetic — a different method from the
 * walkthrough (which probes haystack[i+j] vs needle[j] inside nested loops).
 */
export function strStrOracle(haystack, needle) {
  return String(haystack).indexOf(String(needle));
}

function decodeInput(value, label, max) {
  if (typeof value !== 'string') {
    throw new Error(label + ' walkthrough needs a string input like "sadbutsad"');
  }
  if (value.length < 1 || value.length > max) {
    throw new Error(
      label + ' walkthrough supports lengths 1..' + max +
      ' (judge allows up to 10^4); got length ' + value.length,
    );
  }
  if (!/^[a-z]*$/.test(value)) {
    throw new Error(label + ' walkthrough supports lowercase a-z only (judge constraint)');
  }
  return value;
}

function finish(haystackChars, needle, frames, result) {
  return {
    kind: 'string',
    layout: { chars: haystackChars.slice(), needle },
    frames: boundedFrames(frames, MAX_FRAMES).frames,
    result,
  };
}

export function build(args) {
  if (!Array.isArray(args) || args.length !== 2) {
    throw new Error('strstr walkthrough expects [haystack, needle]');
  }
  const haystack = decodeInput(args[0], 'haystack', MAX_HAYSTACK);
  const needle = decodeInput(args[1], 'needle', MAX_NEEDLE);
  const h = Array.from(haystack);
  const nd = Array.from(needle);
  const n = h.length;
  const m = nd.length;
  const frames = [];
  const windowOf = (i) => [i, i + m - 1];
  let strCmp = 0;
  const strWrites = 0;
  const strOps = () => ({ cmp: strCmp, writes: strWrites });

  frames.push(frame(
    'init',
    `Read n=${n}, m=${m}`,
    m > n
      ? `Needle (${m}) is longer than haystack (${n}); no start fits.`
      : `Starts 0..${n - m} will be tried in order; the first full match wins.`,
    { pointers: {}, window: [0, -1], highlights: {}, vars: { n, m } },
  ));
  if (m > n) {
    frames.push(frame(
      'fail',
      'Needle longer than haystack',
      `No window of ${m} fits in ${n} characters, so return -1.`,
      { pointers: {}, window: [0, -1], highlights: {}, vars: { n, m, answer: -1 }, ops: strOps() },
    ));
    return finish(h, needle, frames, -1);
  }

  for (let i = 0; i <= n - m; i++) {
    const candidate = haystack.slice(i, i + m);
    frames.push(frame(
      'align',
      `Start ${i}`,
      `Try haystack[${i}..${i + m - 1}] "${candidate}" against needle "${needle}".`,
      {
        pointers: { i },
        window: windowOf(i),
        highlights: { [i]: 'accent' },
        vars: { n, m, i, j: 0 },
        ops: strOps(),
      },
    ));
    let j = 0;
    while (j < m && h[i + j] === nd[j]) {
      strCmp += 1;
      frames.push(frame(
        'compare',
        `Match haystack[${i + j}]='${h[i + j]}' == needle[${j}]`,
        j + 1 === m
          ? `Equal — all ${m} characters agree, start ${i} is proven.`
          : `Equal — advance j to ${j + 1} of ${m}.`,
        {
          pointers: { i, j: i + j },
          window: windowOf(i),
          highlights: { [i + j]: 'accent' },
          vars: { n, m, i, j: j + 1 },
          ops: strOps(),
        },
      ));
      j += 1;
    }
    if (j === m) {
      const highlights = {};
      for (let k = i; k < i + m; k++) highlights[k] = 'ok';
      frames.push(frame(
        'match',
        `Match at ${i}`,
        `All ${m} characters agreed; the first occurrence is ${i}.`,
        {
          pointers: { i },
          window: windowOf(i),
          highlights,
          vars: { n, m, i, j, answer: i },
          ops: strOps(),
        },
      ));
      return finish(h, needle, frames, i);
    }
    strCmp += 1;
    frames.push(frame(
      'compare',
      `Mismatch at start ${i}`,
      `haystack[${i + j}]='${h[i + j]}' vs needle[${j}]='${nd[j]}'; abandon start ${i}.`,
      {
        pointers: { i, j: i + j },
        window: windowOf(i),
        highlights: { [i]: 'warn', [i + j]: 'warn' },
        vars: { n, m, i, j },
        ops: strOps(),
      },
    ));
  }

  frames.push(frame(
    'fail',
    'No occurrence',
    `All ${n - m + 1} starts failed; return -1.`,
    { pointers: {}, window: [n - m, n - 1], highlights: {}, vars: { n, m, answer: -1 }, ops: strOps() },
  ));
  return finish(h, needle, frames, -1);
}

export const adapters = {
  'find-the-index-of-the-first-occurrence-in-a-string': {
    signature: SIGNATURE,
    lesson: LESSON,
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    code: strStrCode,
    build,
  },
};
