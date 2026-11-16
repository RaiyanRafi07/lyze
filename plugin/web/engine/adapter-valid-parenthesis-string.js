/**
 * valid-parenthesis-string — live walkthrough adapter (Greedy, LeetCode 678).
 *
 * Live signature matches the judge record in plugin/data/shard-7.json exactly:
 * checkValidString(string s) -> boolean, judge mode "exact".
 * Greedy [lo, hi] range of possible open counts: '(' lifts both ends, ')'
 * lowers both, '*' widens (lo-1, hi+1); clamp lo at 0, reject when hi < 0,
 * accept iff lo == 0 at the end. O(n) time, O(1) space.
 *
 * Ported from .workers/jobs/neetcode150-completion/valid-parenthesis-string/valid-parenthesis-string-adapter.js
 * (frames, verdicts, signature, code listings and explain map unchanged) plus the
 * live-file wrapper-tag convention ([def] on class/scope lines, as in
 * adapter-valid-sudoku.js and adapter-generate-parentheses.js). Pure,
 * synchronous, dependency-free ES module. No DOM, no network, no randomness.
 * Primary source: https://leetcode.com/problems/valid-parenthesis-string/
 */
import { code, frame, boundedFrames } from './semantic-core.js'

export const SLUG = 'valid-parenthesis-string'

// Live judge signature (object form). The adapters entry below carries the same
// profile in the string-array params form semantic.js compares against.
export const SIGNATURE = {
  name: 'checkValidString',
  params: [{ name: 's', type: 'string' }],
  return: 'boolean',
}

const SIGNATURE_TYPES = ['string']

// Canonical greedy reference (also the walkthrough's frame emitter basis).
// Exported so the forge practice builder can cross-check its independent
// brute-force oracle against it at build time.
export function checkValidString(s) {
  let lo = 0
  let hi = 0
  for (const c of s) {
    if (c === '(') {
      lo += 1
      hi += 1
    } else if (c === ')') {
      lo -= 1
      hi -= 1
    } else {
      lo -= 1
      hi += 1
    }
    if (hi < 0) return false
    if (lo < 0) lo = 0
  }
  return lo === 0
}

const validParenthesisStringJava = code(`
[def] class Solution {
[def]     public boolean checkValidString(String s) {
[init]         int lo = 0, hi = 0;
[read]         for (int i = 0; i < s.length(); i++) {
[read]             char c = s.charAt(i);
[open]             if (c == '(') { lo++; hi++; }
[close]             else if (c == ')') { lo--; hi--; }
[star]             else { lo--; hi++; }
[fail]             if (hi < 0) return false;
[clamp]             if (lo < 0) lo = 0;
[read]         }
[done]         return lo == 0;
[def]     }
[def] }
`)

const validParenthesisStringCpp = code(`
[def] class Solution {
[def] public:
[def]     bool checkValidString(string s) {
[init]         int lo = 0, hi = 0;
[read]         for (int i = 0; i < (int)s.size(); i++) {
[read]             char c = s[i];
[open]             if (c == '(') { lo++; hi++; }
[close]             else if (c == ')') { lo--; hi--; }
[star]             else { lo--; hi++; }
[fail]             if (hi < 0) return false;
[clamp]             if (lo < 0) lo = 0;
[read]         }
[done]         return lo == 0;
[def]     }
[def] };
`)

const validParenthesisStringPseudo = code(`
[def] function checkValidString(s):
[init]   lo = 0; hi = 0
[read]   for i from 0 to length(s)-1:
[read]     c = s[i]
[open]     if c == '(': lo += 1; hi += 1
[close]     else if c == ')': lo -= 1; hi -= 1
[star]     else: lo -= 1; hi += 1
[fail]     if hi < 0: return false
[clamp]     if lo < 0: lo = 0
[done]   return lo == 0
`)

const EXPLAIN = {
  def: 'Scope of the solver: class and method wrappers that hold the code but execute no algorithm step.',
  init: 'Set lo = hi = 0: with nothing read, the only possible open count is zero.',
  read: 'Read the current character; it decides how the possible range moves.',
  open: "'(' must be an open, so every possibility gains one open: lo++ and hi++.",
  close: "')' must close one open, so every possibility loses one: lo-- and hi--.",
  star: "'*' is the wildcard: as ')' it lowers lo, as '(' it raises hi, widening the range.",
  fail: "hi < 0 means even treating every star as '(' cannot match this ')'; reject.",
  clamp: 'lo < 0 is recoverable: choose empty for some earlier stars, so clamp lo back to 0.',
  done: 'Accept only when lo == 0: some assignment of the stars closes every open.',
}

// Per-line notes derived from the real parsed lines: each line explains its own
// recorded operation step (never invented; structural wrappers get scope notes
// from semantic.js, [def] lines get the def note above).
const explainLinesFor = (lines) => lines.map((l) => EXPLAIN[l.step] || null)
const EXPLAIN_LINES = {
  java: explainLinesFor(validParenthesisStringJava),
  cpp: explainLinesFor(validParenthesisStringCpp),
  pseudo: explainLinesFor(validParenthesisStringPseudo),
}

function stringInput(value, max = 100) {
  if (typeof value !== 'string' || value.length < 1 || value.length > max) {
    throw new Error('Use a string of 1..' + max + ' characters for this walkthrough')
  }
  if (!/^[()*]+$/.test(value)) throw new Error('Input may only contain the characters ( ) *')
  return value
}

function decodeArg(raw) {
  if (typeof raw !== 'string') return raw
  const text = raw.trim()
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }
  return raw
}

// Every frame below is a REAL execution event of the greedy range scan above:
// one init, one read plus one effect event (open/close/star, with clamp/fail
// follow-ups where the real code takes those branches), and one done.
// No future values revealed; every lo/hi shown is the live variable value.
function build(args) {
  const s = stringInput(decodeArg(args[0]))
  const chars = Array.from(s)
  const frames = []
  let lo = 0
  let hi = 0

  const stateOf = (i, extra = {}) => ({
    pointers: i === null || i === undefined ? {} : { i },
    highlights: {
      ...(i === null || i === undefined ? {} : { [String(i)]: 'accent' }),
      ...(extra.highlights || {}),
    },
    vars: { n: chars.length, lo, hi, ...(extra.vars || {}) },
  })

  const push = (step, label, note, state) => {
    frames.push(frame(step, label, note, state))
  }

  push(
    'init',
    'Start with lo = hi = 0',
    'Nothing read yet, so the only possible open count is 0 for "' + s + '".',
    stateOf(null),
  )

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]
    push(
      'read',
      "Read '" + c + "' at index " + i,
      c === '('
        ? 'An opener lifts every possibility by one.'
        : c === ')'
          ? 'A closer drops every possibility by one.'
          : 'A star widens the range: empty lowers lo, opener raises hi.',
      stateOf(i),
    )
    if (c === '(') {
      lo += 1
      hi += 1
      push(
        'open',
        "'(' at " + i + ': lo=' + lo + ' hi=' + hi,
        'Post-update: both range ends rose by 1.',
        stateOf(i),
      )
    } else if (c === ')') {
      lo -= 1
      hi -= 1
      push(
        'close',
        "')' at " + i + ': lo=' + Math.max(lo, 0) + ' hi=' + hi,
        hi < 0
          ? 'Post-update: hi is negative, so no assignment can match this closer.'
          : 'Post-update: both range ends fell by 1.',
        stateOf(i, hi < 0 ? { highlights: { [String(i)]: 'warn' }, vars: { reason: 'hi-negative' } } : {}),
      )
      if (hi < 0) {
        push(
          'fail',
          'Reject: hi=' + hi + ' < 0',
          "Even every star as '(' leaves an unmatched ')'. Return false.",
          stateOf(i, { highlights: { [String(i)]: 'warn' }, vars: { reason: 'hi-negative' } }),
        )
        return { kind: 'string', layout: { chars }, frames, result: false }
      }
      if (lo < 0) {
        lo = 0
        push(
          'clamp',
          'Clamp lo to 0 at index ' + i,
          'Post-update: treat an earlier star as empty; hi stays ' + hi + '.',
          stateOf(i),
        )
      }
    } else {
      lo -= 1
      hi += 1
      push(
        'star',
        "'*' at " + i + ': lo=' + Math.max(lo, 0) + ' hi=' + hi,
        'Post-update: worst case it closed one (lo-1), best case it opened one (hi+1).',
        stateOf(i),
      )
      if (hi < 0) {
        push(
          'fail',
          'Reject: hi=' + hi + ' < 0',
          "Even every star as '(' leaves an unmatched ')'. Return false.",
          stateOf(i, { highlights: { [String(i)]: 'warn' } }),
        )
        return { kind: 'string', layout: { chars }, frames, result: false }
      }
      if (lo < 0) {
        lo = 0
        push(
          'clamp',
          'Clamp lo to 0 at index ' + i,
          'Post-update: use this star as empty on the low end; hi stays ' + hi + '.',
          stateOf(i),
        )
      }
    }
  }

  const valid = lo === 0
  push(
    'done',
    valid ? 'lo=0: the string is valid' : 'lo=' + lo + ' > 0: unmatched opens remain',
    valid
      ? 'Some star assignment closes every bracket. Return true.'
      : "Even using stars as ')' cannot close every open. Return false.",
    stateOf(null),
  )
  return { kind: 'string', layout: { chars }, frames, result: valid }
}

export const adapters = {
  'valid-parenthesis-string': {
    signature: { name: 'checkValidString', params: SIGNATURE_TYPES, return: 'boolean' },
    lesson: {
      idea: "Track the range [lo, hi] of possible open counts: '(' lifts both ends, ')' lowers both, '*' widens the range, and lo clamps at 0. Accept only when lo ends at 0.",
      trap: "Fixing '*' to one meaning up front fails: '(*))' needs '*' as '(' while '(*()' needs '*' as empty. Keep the whole range, and clamp lo (not hi) at 0.",
      time: 'O(n)',
      space: 'O(1)',
      alt: "Genuine alternative: two stacks holding indices of unmatched '(' and '*'. Sweep left to right pushing indices; on ')' match an open first else a star. Then match leftover opens against later stars in order. Same O(n) time, O(n) space, but the range version needs no storage.",
    },
    code: { java: validParenthesisStringJava, cpp: validParenthesisStringCpp, pseudo: validParenthesisStringPseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
}

export default adapters['valid-parenthesis-string']
export { boundedFrames }
