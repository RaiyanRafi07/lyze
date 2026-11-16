/** Longest Valid Parentheses — portable per-slug adapter (Stack).
 * Sentinel-base scan: push -1 as the initial base, push each '(' index, on ')'
 * pop then either plant a new base (stack empty) or measure i - stack.top into
 * best. Pure + synchronous; never throws on import. Out-of-range inputs
 * (non-string, length > 40 for the walkthrough, other characters) throw
 * instead of rendering. Register under slug `longest-valid-parentheses`
 * (see integration.json).
 * Target: plugin/web/engine/adapter-longest-valid-parentheses.js (new file;
 * no existing export is renamed), wired into semantic.js + variants.js.
 * Family precedent: adapter-valid-parenthesis-string.js (stack scan of the
 * actual input, shared `semantic-core.js` helpers, kind 'string').
 */
import { code, frame, boundedFrames } from './semantic-core.js';

export const MAX_FRAMES = 40;
export const MAX_WALK_CHARS = 40;

export const SIGNATURE = Object.freeze({
  name: 'longestValidParentheses',
  params: Object.freeze(['string']),
  return: 'int',
});

const SIGNATURE_TYPES = ['string'];

const longestValidParenthesesCode = {
  java: code(`
[structure] class Solution {
[signature]     public int longestValidParentheses(String s) {
[init]         Deque<Integer> stack = new ArrayDeque<>();
[init]         stack.push(-1);
[init]         int best = 0;
[read]         for (int i = 0; i < s.length(); i++) {
[open]             if (s.charAt(i) == '(') stack.push(i);
[close]             else {
[close]                 stack.pop();
[base]                 if (stack.isEmpty()) stack.push(i);
[best]                 else best = Math.max(best, i - stack.peek());
[close]             }
[read]         }
[done]         return best;
[structure]     }
[structure] }
`),
  cpp: code(`
[structure] class Solution {
[structure] public:
[signature]     int longestValidParentheses(string s) {
[init]         vector<int> stack;
[init]         stack.push_back(-1);
[init]         int best = 0;
[read]         for (int i = 0; i < (int)s.size(); i++) {
[open]             if (s[i] == '(') stack.push_back(i);
[close]             else {
[close]                 stack.pop_back();
[base]                 if (stack.empty()) stack.push_back(i);
[best]                 else best = max(best, i - stack.back());
[close]             }
[read]         }
[done]         return best;
[structure]     }
[structure] };
`),
  pseudo: code(`
[signature] longestValidParentheses(s):
[init]   stack = [-1]; best = 0
[read]   for i from 0 to length(s)-1:
[open]     if s[i] == '(': push i onto stack
[close]     else:
[close]       pop stack
[base]       if stack is empty: push i (new base)
[best]       else: best = max(best, i - top(stack))
[done]   return best
`),
};

export const LESSON = Object.freeze({
  idea: 'Keep a stack of indices with -1 as the first base: push every opener, on a closer pop and measure i minus the new top; an empty stack plants a new base at i.',
  trap: 'Popping into an empty stack with no re-base, or measuring from the popped index instead of the new top, breaks every substring that starts after an unmatched closer.',
  time: 'O(n) — one left-to-right pass',
  space: 'O(n) — the index stack in the worst case',
});

export const EXPLAIN = Object.freeze({
  def: 'Return the length of the longest contiguous substring of s that is a correctly nested (balanced) parenthesis string.',
  init: 'Seed the base: -1 stands left of index 0 so the first valid span measures i - (-1); best starts at 0.',
  read: 'Read the current character; an opener is remembered, a closer resolves the most recent unmatched position.',
  open: "'(' cannot close anything yet — remember its index for a future closer.",
  close: "')' consumes one unmatched position: pop the top, which is either an opener index or the current base.",
  base: 'The pop exposed an empty stack, so this closer is unmatched — plant i as the new base no later span may cross.',
  best: 'The pop exposed a live base or opener, so s[base+1..i] is valid — keep the longest such span in best.',
  done: 'Return best: every valid substring ends at some closer, and each was measured exactly when its closer was read.',
});

export const EXPLAIN_LINES = Object.freeze({
  java: [
    'Structural wrapper: the Solution class scope. No operation runs here.',
    'Signature: longestValidParentheses takes String s and returns int. Execution starts in the body.',
    'Init: create the index stack that will hold bases and unmatched opener indices.',
    'Init: push -1 — the sentinel base left of index 0, so a span from 0 measures i + 1.',
    'Init: best = 0 — no valid substring seen yet; the empty input answers 0.',
    'Read: advance i across the string, one character per pass.',
    'Open: s[i] is an opener — push i; it may start or extend a future valid span.',
    'Close: s[i] is a closer — enter the resolve branch.',
    'Close: pop the top: the most recent unmatched opener index, or the current base.',
    'Base: stack is empty, so this closer matches nothing — push i as the new base.',
    'Best: stack is live — s[top+1..i] is valid; best keeps the maximum span length.',
    'Close: end of the resolve branch; the next pass reads s[i+1].',
    'Read: loop footer; every closer already measured its span before moving on.',
    'Done: return best — the longest valid-substring length seen on any pass.',
    'Structural wrapper: close the method scope; no operation runs here.',
    'Structural wrapper: close the class scope; no operation runs here.',
  ],
  cpp: [
    'Structural wrapper: the Solution class scope. No operation runs here.',
    'Structural wrapper: public section opener. No operation runs here.',
    'Signature: longestValidParentheses takes string s and returns int. Execution starts in the body.',
    'Init: create the index stack (vector back = top) for bases and opener indices.',
    'Init: push_back(-1) — the sentinel base left of index 0.',
    'Init: best = 0 — no valid substring seen yet; the empty input answers 0.',
    'Read: advance i across the string, one character per pass.',
    'Open: s[i] is an opener — push_back(i) for a future closer.',
    'Close: s[i] is a closer — enter the resolve branch.',
    'Close: pop_back the top: most recent unmatched opener index, or the base.',
    'Base: stack is empty, so this closer matches nothing — push_back(i) as the new base.',
    'Best: stack is live — s[back+1..i] is valid; best keeps the maximum span length.',
    'Close: end of the resolve branch; the next pass reads s[i+1].',
    'Read: loop footer; every closer already measured its span before moving on.',
    'Done: return best — the longest valid-substring length seen on any pass.',
    'Structural wrapper: close the method scope; no operation runs here.',
    'Structural wrapper: class terminator. No operation runs here.',
  ],
  pseudo: [
    'Signature: name the task; execution starts by seeding the registers.',
    'Init: seed the sentinel stack [-1] and best = 0 before scanning.',
    'Read: visit each index once, left to right.',
    'Open: an opener is remembered by pushing its index.',
    'Close: a closer pops one unmatched position.',
    'Close: the pop consumed the top of the stack.',
    'Base: nothing left to match — the closer itself becomes the new base.',
    'Best: a live top remains — measure i minus that top into best.',
    'Done: best is the longest valid span; return it.',
  ],
});

/** Independent oracle: DP over the actual string — longest valid substring
 * ending at each position. No index stack, no sentinel base, no i - top
 * measurement: a different method from the walkthrough's sentinel scan. */
export function longestValidParenthesesOracle(s) {
  if (typeof s !== 'string') return 0;
  const n = s.length;
  const dp = new Array(n).fill(0);
  let best = 0;
  for (let i = 1; i < n; i++) {
    if (s[i] !== ')') continue;
    if (s[i - 1] === '(') {
      dp[i] = 2 + (i >= 2 ? dp[i - 2] : 0);
    } else {
      const prev = i - dp[i - 1] - 1;
      if (prev >= 0 && s[prev] === '(') {
        dp[i] = dp[i - 1] + 2 + (prev >= 1 ? dp[prev - 1] : 0);
      }
    }
    if (dp[i] > best) best = dp[i];
  }
  return best;
}

function decodeArg(raw) {
  if (typeof raw !== 'string') return raw;
  const text = raw.trim();
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return raw;
}

function stringInput(value, max = MAX_WALK_CHARS) {
  if (typeof value !== 'string' || value.length > max) {
    throw new Error('Use a string of at most ' + max + ' characters for this walkthrough');
  }
  if (!/^[()]*$/.test(value)) throw new Error('Input may only contain the characters ( and )');
  return value;
}

function finish(chars, frames, result) {
  return {
    kind: 'string',
    layout: { chars: chars.slice() },
    frames: boundedFrames(frames, MAX_FRAMES).frames,
    result,
  };
}

/** Real sentinel-stack execution on the actual input: one init frame, one
 * read plus one effect event (open / close+base / close+best) per character,
 * and one done frame. Every best shown is the live variable value; bestL and
 * bestR are derived from the same run (the span attaining best) and labeled
 * as derived in the notes. No future characters are revealed. */
export function build(args) {
  if (!Array.isArray(args) || args.length !== 1) {
    throw new Error('longest-valid-parentheses expects [s]');
  }
  const s = stringInput(decodeArg(args[0]));
  const chars = Array.from(s);
  const frames = [];
  const stack = [-1];
  let best = 0;
  let bestL = null;
  let bestR = null;
  let lvpCmp = 0;
  let lvpWrites = 0;

  const stateOf = (i, extra = {}) => ({
    pointers: i === null || i === undefined ? {} : { i },
    highlights: {
      ...(i === null || i === undefined ? {} : { [String(i)]: 'accent' }),
      ...(extra.highlights || {}),
    },
    stack: stack.slice(),
    vars: { best, top: stack.length ? stack[stack.length - 1] : null, ...(extra.vars || {}) },
  });

  const push = (step, label, note, state) => {
    frames.push(frame(step, label, note, state));
  };

  push(
    'init',
    'Base -1 pushed; best = 0',
    chars.length === 0
      ? 'Empty string: there is nothing to scan, so the answer stays 0.'
      : 'Stack = [-1]; nothing read yet, so the longest valid span so far is 0.',
    stateOf(null),
  );

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    lvpCmp += 1;
    push(
      'read',
      "Read '" + c + "' at index " + i,
      c === '('
        ? 'An opener is remembered — its index will anchor a future span.'
        : 'A closer resolves one position — pop, then re-base or measure.',
      { ...stateOf(i), ops: { cmp: lvpCmp, writes: lvpWrites } },
    );
    if (c === '(') {
      stack.push(i);
      lvpWrites += 1;
      push(
        'open',
        "'(' at " + i + ': remember ' + i,
        'Post-update: stack top is now ' + i + '; best stays ' + best + '.',
        { ...stateOf(i), ops: { cmp: lvpCmp, writes: lvpWrites } },
      );
    } else {
      stack.pop();
      lvpWrites += 1;
      if (stack.length === 0) {
        stack.push(i);
        lvpWrites += 1;
        push(
          'base',
          "Unmatched ')' at " + i + ': new base ' + i,
          'Post-update: this closer matches nothing, so no later span may cross ' + i + '.',
          { ...stateOf(i, { highlights: { [String(i)]: 'warn' }, vars: { reason: 'new-base' } }), ops: { cmp: lvpCmp, writes: lvpWrites } },
        );
      } else {
        push(
          'close',
          "Matched ')' at " + i + ': pop, top is ' + stack[stack.length - 1],
          'Post-update: s[' + (stack[stack.length - 1] + 1) + '..' + i + '] is valid, length ' + (i - stack[stack.length - 1]) + '.',
          { ...stateOf(i), ops: { cmp: lvpCmp, writes: lvpWrites } },
        );
        const span = i - stack[stack.length - 1];
        if (span > best) {
          best = span;
          bestL = stack[stack.length - 1] + 1;
          bestR = i;
          lvpWrites += 1;
        }
        const derived = bestL === null ? {} : { bestL, bestR, derived: 'span-of-best' };
        push(
          'best',
          'best = ' + best,
          bestL === null
            ? 'Post-update: no valid span yet; best stays 0.'
            : 'Post-update: longest span so far is s[' + bestL + '..' + bestR + '] (derived from this run), length ' + best + '.',
          { ...stateOf(i, {
            highlights: { ...(bestL === null ? {} : { [String(bestR)]: 'ok' }), [String(i)]: bestL !== null && bestR === i ? 'ok' : 'accent' },
            vars: derived,
          }), ops: { cmp: lvpCmp, writes: lvpWrites } },
        );
      }
    }
  }

  const spanHl = {};
  if (bestL !== null) {
    for (let k = bestL; k <= bestR; k++) spanHl[String(k)] = 'ok';
  }
  push(
    'done',
    best === 0 ? 'No valid span: answer 0' : 'Longest span length ' + best,
    best === 0
      ? 'No closer ever measured a span; longestValidParentheses returns 0.'
      : 'The longest span seen is s[' + bestL + '..' + bestR + '] (derived from this run); return ' + best + '.',
    { ...stateOf(null, { highlights: spanHl, vars: { bestL, bestR, answer: best, derived: bestL === null ? null : 'span-of-best' } }), ops: { cmp: lvpCmp, writes: lvpWrites } },
  );
  return finish(chars, frames, best);
}

export const adapter = {
  signature: { name: 'longestValidParentheses', params: SIGNATURE_TYPES, return: 'int' },
  lesson: {
    idea: LESSON.idea,
    trap: LESSON.trap,
    time: 'O(n)',
    space: 'O(n)',
  },
  code: { java: longestValidParenthesesCode.java, cpp: longestValidParenthesesCode.cpp, pseudo: longestValidParenthesesCode.pseudo },
  explain: EXPLAIN,
  explainLines: EXPLAIN_LINES,
  build,
};

export default adapter;

export const adapters = {
  'longest-valid-parentheses': {
    signature: { name: 'longestValidParentheses', params: SIGNATURE_TYPES, return: 'int' },
    lesson: {
      idea: LESSON.idea,
      trap: LESSON.trap,
      time: 'O(n)',
      space: 'O(n)',
    },
    code: { java: longestValidParenthesesCode.java, cpp: longestValidParenthesesCode.cpp, pseudo: longestValidParenthesesCode.pseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
};
