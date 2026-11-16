/**
 * roman-to-integer — live semantic adapter (Hash Table / Math / String).
 *
 * Walkthrough algorithm: right-to-left single pass. Seed total = 0 and
 * prev = 0; visit characters from the least-significant end; cur is the
 * value of s[i]; when cur < prev the numeral is a subtractive prefix so
 * total -= cur, otherwise total += cur; then prev = cur. O(n) time, O(1).
 *
 * Staged source: .workers/jobs/deck-release/catalog-expansion/lessons/roman-to-integer/adapter-roman-to-integer.js
 * (SIGNATURE, romanToInt, LESSON, EXPLAIN, EXPLAIN_LINES, build) — ported
 * verbatim to the live shape: shared helpers imported from semantic-core.js,
 * no local code/frame redefinitions. Code text, explain notes, and build
 * events are unchanged.
 *
 * Signature equals the live judge signature exactly:
 * romanToInt(s: string) -> int (plugin/data/shard-0.json id 13, mode exact).
 * Provenance: description/examples/constraints/judge from the live shard
 * record; no invented data. Official examples: s="III"->3, s="LVIII"->58,
 * s="MCMXCIV"->1994.
 */

import { code, frame, boundedFrames } from './semantic-core.js'

const VAL = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }
const ROMAN_RE = /^[IVXLCDM]+$/
export const MAX_WALK_CHARS = 15
export const SLUG = 'roman-to-integer'
export const SIGNATURE = Object.freeze({
  name: 'romanToInt',
  params: Object.freeze([{ name: 's', type: 'string' }]),
  return: 'int',
})
const SIGNATURE_TYPES = ['string']

// ---- reference implementation (walkthrough emitter basis) ----
export function romanToInt(s) {
  let total = 0
  let prev = 0
  for (let i = s.length - 1; i >= 0; i--) {
    const cur = VAL[s[i]]
    if (cur < prev) total -= cur
    else total += cur
    prev = cur
  }
  return total
}

// ---- code listings (presentation; Learn replay uses the same steps) ----
export const codeJava = code(`
[structure] class Solution {
[signature]     public int romanToInt(String s) {
[init]         int total = 0;
[init]         int prev = 0;
[loop]         for (int i = s.length() - 1; i >= 0; i--) {
[read]             int cur = 0;
[read]             switch (s.charAt(i)) { case 'I': cur = 1; break; case 'V': cur = 5; break; case 'X': cur = 10; break; case 'L': cur = 50; break; case 'C': cur = 100; break; case 'D': cur = 500; break; default: cur = 1000; break; }
[compare]             if (cur < prev) {
[sub]                 total -= cur;
[compare]             } else {
[add]                 total += cur;
[compare]             }
[loop]             prev = cur;
[loop]         }
[done]         return total;
[structure]     }
[structure] }
`)

export const codeCpp = code(`
[structure] class Solution {
[structure] public:
[signature]     int romanToInt(string s) {
[init]         int total = 0;
[init]         int prev = 0;
[loop]         for (int i = (int)s.size() - 1; i >= 0; i--) {
[read]             int cur = 0;
[read]             switch (s[i]) { case 'I': cur = 1; break; case 'V': cur = 5; break; case 'X': cur = 10; break; case 'L': cur = 50; break; case 'C': cur = 100; break; case 'D': cur = 500; break; default: cur = 1000; break; }
[compare]             if (cur < prev) {
[sub]                 total -= cur;
[compare]             } else {
[add]                 total += cur;
[compare]             }
[loop]             prev = cur;
[loop]         }
[done]         return total;
[structure]     }
[structure] };
`)

export const codePseudo = code(`
[signature] romanToInt(s):
[init]   total = 0; prev = 0
[loop]   for i from length(s)-1 down to 0:
[read]     cur = value(s[i])  // I=1 V=5 X=10 L=50 C=100 D=500 M=1000
[compare]     if cur < prev:
[sub]       total -= cur      // subtractive prefix (IV, IX, XL, XC, CD, CM)
[compare]     else:
[add]       total += cur      // otherwise add the numeral
[loop]     prev = cur
[done]   return total
`)

export const EXPLAIN = {
  structure: 'Structural wrapper: the Solution class scope. No operation runs here.',
  signature: 'Function signature: names the input string s and the int result; execution starts in the body.',
  init: 'Seed total = 0 and prev = 0: nothing read yet, so no value has been added or compared.',
  loop: 'Visit each position once from right to left; i reaching -1 means every numeral was consumed.',
  read: 'Read the value of the current numeral s[i] (I=1 V=5 X=10 L=50 C=100 D=500 M=1000).',
  compare: 'Compare cur against prev (the value just right of i): smaller means this numeral is a subtractive prefix.',
  add: 'Otherwise add: cur meets or beats everything to its right, so it grows the total.',
  sub: 'Subtractive case: cur prefixes a larger numeral (IV, IX, XL, XC, CD, CM), so it shrinks the total.',
  done: 'Return total: every numeral was added or subtracted exactly once, leftmost last.',
}

function linesFor(lines) {
  return lines.map((l) => EXPLAIN[l.step] || null)
}

export const EXPLAIN_LINES = {
  java: linesFor(codeJava),
  cpp: linesFor(codeCpp),
  pseudo: linesFor(codePseudo),
}

export const LESSON = {
  idea: 'Scan once from right to left keeping prev (the value just consumed): subtract cur when cur < prev, otherwise add it.',
  trap: 'Adding every numeral ignores the six subtractive pairs (IV, IX, XL, XC, CD, CM): IV is 4, not 6. Compare against the right neighbour, not the left one.',
  time: 'O(n) — one visit per character',
  space: 'O(1)',
  alt: 'Genuine alternative: sweep left to right with a pair table (IV=4, IX=9, XL=40, XC=90, CD=400, CM=900): when s[i]+s[i+1] is a pair, consume both and add the pair value, else add value(s[i]). Same O(n) time and O(1) space; the practice oracle uses exactly this pair-table method, independently of the right-to-left prev walkthrough.',
}

function decodeArg(raw) {
  if (typeof raw !== 'string') return raw
  const text = raw.trim()
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    try { return JSON.parse(text) } catch { return text }
  }
  return raw
}

export function buildRomanToInteger(args) {
  if (!Array.isArray(args) || args.length !== 1) throw new Error('roman-to-integer expects [s]')
  const s = decodeArg(args[0])
  if (typeof s !== 'string') throw new Error('Walkthrough needs s as a string like "MCMXCIV"')
  if (s.length < 1 || s.length > MAX_WALK_CHARS) throw new Error('Walkthrough visual bound: 1..' + MAX_WALK_CHARS + ' chars (judge allows up to 15); got ' + s.length)
  if (!ROMAN_RE.test(s)) throw new Error('s may only contain IVXLCDM for this walkthrough; got ' + JSON.stringify(s))
  const chars = Array.from(s)
  const n = chars.length
  const frames = []
  let total = 0
  let prev = 0
  let rcCmp = 0, rcWrites = 0
  const rcOps = () => ({ cmp: rcCmp, writes: rcWrites })
  const stateOf = (i, extra = {}) => ({
    pointers: i === null || i === undefined ? {} : { i },
    highlights: { ...(i === null || i === undefined ? {} : { [String(i)]: 'accent' }), ...(extra.highlights || {}) },
    vars: { n, total, prev, ...(extra.vars || {}) },
  })
  frames.push(frame('init', 'Seed total = 0', 's="' + s + '" (' + n + ' numerals); total=0, prev=0, nothing consumed.', stateOf(null)))
  for (let i = n - 1; i >= 0; i--) {
    const ch = chars[i]
    const cur = VAL[ch]
    frames.push(frame('loop', 'Visit i=' + i, 'i=' + i + ' holds ' + ch + '=' + cur + '; total=' + total + ', prev=' + prev + '.', { ...stateOf(i, { vars: { i } }), ops: rcOps() }))
    frames.push(frame('read', 'Read ' + ch + '=' + cur, '' + ch + ' at i=' + i + ' is worth ' + cur + '; right neighbour prev=' + prev + '.', { ...stateOf(i, { vars: { i, cur } }), ops: rcOps() }))
    if (cur < prev) {
      rcCmp += 1
      frames.push(frame('compare', cur + ' < ' + prev, cur + ' < prev=' + prev + ': subtractive prefix, so subtract.', { ...stateOf(i, { highlights: { [String(i)]: 'warn' }, vars: { i, cur } }), ops: rcOps() }))
      total -= cur
      rcWrites += 2
      frames.push(frame('sub', 'total=' + total, 'total-=' + cur + ' -> ' + total + '; prev becomes ' + cur + '.', { ...stateOf(i, { highlights: { [String(i)]: 'warn' }, vars: { i, cur, delta: -cur } }), ops: rcOps() }))
    } else {
      rcCmp += 1
      frames.push(frame('compare', cur + ' >= ' + prev, cur + ' >= prev=' + prev + ': meets or beats the right side, so add.', { ...stateOf(i, { highlights: { [String(i)]: 'ok' }, vars: { i, cur } }), ops: rcOps() }))
      total += cur
      rcWrites += 2
      frames.push(frame('add', 'total=' + total, 'total+=' + cur + ' -> ' + total + '; prev becomes ' + cur + '.', { ...stateOf(i, { highlights: { [String(i)]: 'ok' }, vars: { i, cur, delta: cur } }), ops: rcOps() }))
    }
    prev = cur
  }
  if (!Number.isSafeInteger(total) || total < 1 || total > 3999) throw new Error('Walkthrough needs a numeral in range [1, 3999]; got "' + s + '" = ' + total)
  frames.push(frame('done', 'Return ' + total, 'Every numeral consumed once; romanToInt("' + s + '")=' + total + '.', { ...stateOf(null, { highlights: Object.fromEntries(chars.map((_, k) => [String(k), 'ok'])), vars: { answer: total } }), ops: rcOps() }))
  const compacted = boundedFrames(frames, 40)
  return { kind: 'string', layout: { chars: chars.slice() }, frames: compacted.frames, result: total, anchors: [] }
}

export const adapters = {
  'roman-to-integer': {
    signature: { name: 'romanToInt', params: SIGNATURE_TYPES, return: 'int' },
    lesson: LESSON,
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    code: { java: codeJava, cpp: codeCpp, pseudo: codePseudo },
    build: buildRomanToInteger,
  },
}

export default adapters['roman-to-integer']
