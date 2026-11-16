/**
 * reverse-integer — live semantic adapter (Math).
 *
 * Walkthrough algorithm: pop the lowest digit of x (x % 10), shrink x by
 * truncating division, and push the digit onto rev — guarding rev against
 * 32-bit overflow BEFORE each push by comparing against MAX/10 with the edge
 * digits 7 / -8. One pass per decimal digit: O(log(x)) time, O(1) space.
 *
 * Staged source: .workers/jobs/neetcode150-completion/reverse-integer/reverse-integer-adapter.js
 * (SIGNATURE, reverseCode, LESSON, EXPLAIN, EXPLAIN_LINES, build) — ported
 * verbatim to the live shape: shared helpers imported from semantic-core.js,
 * no local code/frame redefinitions. Code text, explain notes, and build
 * events are unchanged (see also the verbatim reference in
 * .workers/jobs/question-owners-150/reverse-integer/reference.js).
 *
 * Signature equals the live judge signature exactly:
 * reverse(x: int) -> int (plugin/data/shard-5.json id 7, mode exact).
 */

import { code, frame, boundedFrames } from './semantic-core.js'

export const INT_MAX = 2147483647
export const INT_MIN = -2147483648
export const MAX_FRAMES = 40

const reverseJava = code(`
[structure] class Solution {
[signature]     public int reverse(int x) {
[init]         int rev = 0;
[loop]         while (x != 0) {
[pop]             int pop = x % 10;
[pop]             x /= 10;
[check]             if (rev > Integer.MAX_VALUE / 10 || (rev == Integer.MAX_VALUE / 10 && pop > 7)) return 0;
[check]             if (rev < Integer.MIN_VALUE / 10 || (rev == Integer.MIN_VALUE / 10 && pop < -8)) return 0;
[push]             rev = rev * 10 + pop;
[loop]         }
[done]         return rev;
[structure]     }
[structure] }
`)

const reverseCpp = code(`
[structure] class Solution {
[structure] public:
[signature]     int reverse(int x) {
[init]         int rev = 0;
[loop]         while (x != 0) {
[pop]             int pop = x % 10;
[pop]             x /= 10;
[check]             if (rev > INT_MAX / 10 || (rev == INT_MAX / 10 && pop > 7)) return 0;
[check]             if (rev < INT_MIN / 10 || (rev == INT_MIN / 10 && pop < -8)) return 0;
[push]             rev = rev * 10 + pop;
[loop]         }
[done]         return rev;
[structure]     }
[structure] };
`)

const reversePseudo = code(`
[init] reverse(x): rev = 0
[loop] while x != 0:
[pop]   pop = x mod 10; x = trunc(x / 10)
[check]   if rev > MAX/10 or (rev == MAX/10 and pop > 7) return 0; if rev < MIN/10 or (rev == MIN/10 and pop < -8) return 0
[push]   rev = rev * 10 + pop
[done] return rev
`)

function decodeX(value) {
  if (!Number.isSafeInteger(value)) throw new Error('Provide x as an integer for this walkthrough')
  if (value < INT_MIN || value > INT_MAX) {
    throw new Error(`Visual walkthrough needs x in [${INT_MIN}, ${INT_MAX}] (${value} given)`)
  }
  return value
}

function finish(digits, frames, result) {
  // Single compaction point (shared helper, no invented state): 10-digit
  // inputs yield up to 42 raw events; the helper keeps first/last and notes
  // the skip count honestly. Short runs (<6) are padded by the live
  // buildSemanticWalkthrough context cards, never here.
  return {
    kind: 'array',
    layout: { values: digits, label: 'digits of |x|, MSB..LSB' },
    frames: boundedFrames(frames, MAX_FRAMES).frames,
    result,
  }
}

export function buildReverseInteger(args) {
  if (!Array.isArray(args) || args.length !== 1) {
    throw new Error('reverse-integer expects [x]')
  }
  let x = decodeX(args[0])
  const digits = String(Math.abs(x)).split('').map((d) => Number(d))
  const frames = []
  let rev = 0
  let pass = 0
  let riCmp = 0, riWrites = 0
  const riOps = () => ({ cmp: riCmp, writes: riWrites })

  frames.push(frame(
    'init',
    'Seed rev',
    `x=${x}; rev=0. Nothing moved yet.`,
    { vars: { x, rev } },
  ))

  while (x !== 0) {
    pass += 1
    riCmp += 1
    frames.push(frame(
      'loop',
      `Pass ${pass}`,
      `x=${x} still holds digits; run pass ${pass}.`,
      { vars: { x, rev, pass }, ops: riOps() },
    ))
    const pop = x % 10
    const rest = Math.trunc(x / 10)
    const pos = digits.length - pass
    frames.push(frame(
      'pop',
      `Pop ${pop}`,
      `pop=${x}%10=${pop}; x shrinks to ${rest}.`,
      { pointers: { pos }, highlights: { [pos]: 'accent' }, vars: { x: rest, rev, pop, pass }, ops: riOps() },
    ))
    x = rest
    const hiQ = Math.trunc(INT_MAX / 10)
    const loQ = Math.trunc(INT_MIN / 10)
    const overPos = rev > hiQ || (rev === hiQ && pop > 7)
    const overNeg = rev < loQ || (rev === loQ && pop < -8)
    if (overPos || overNeg) {
      frames.push(frame(
        'check',
        'Overflow',
        `rev=${rev}, pop=${pop} breaches the limit; return 0.`,
        { pointers: { pos }, highlights: { [pos]: 'bad' }, vars: { x, rev, pop, pass }, ops: riOps() },
      ))
      frames.push(frame(
        'done',
        'Return 0',
        'Reversal leaves 32-bit range; answer is 0.',
        { pointers: { pos }, highlights: { [pos]: 'bad' }, vars: { x, rev, answer: 0 }, ops: riOps() },
      ))
      return finish(digits, frames, 0)
    }
    frames.push(frame(
      'check',
      'Guard passes',
      `rev=${rev}, pop=${pop} fits; push is safe.`,
      { pointers: { pos }, highlights: { [pos]: 'ok' }, vars: { x, rev, pop, pass }, ops: riOps() },
    ))
    rev = rev * 10 + pop
    riWrites += 2
    frames.push(frame(
      'push',
      `rev=${rev}`,
      `rev=${rev}; ${x === 0 ? 'x empty — done.' : `x=${x} remains.`}`,
      { pointers: { pos }, highlights: { [pos]: 'ok' }, vars: { x, rev, pop, pass }, ops: riOps() },
    ))
  }

  frames.push(frame(
    'done',
    'Return rev',
    `All digits moved; reverse(${args[0]})=${rev}.`,
    { highlights: Object.fromEntries(digits.map((_, i) => [i, 'ok'])), vars: { answer: rev, rev }, ops: riOps() },
  ))
  return finish(digits, frames, rev)
}

export const adapters = {
  'reverse-integer': {
    signature: { name: 'reverse', params: ['int'], return: 'int' },
    lesson: {
      idea: 'Pop the last digit of x and push it onto rev; guard rev against 32-bit overflow before each push.',
      trap: 'Checking overflow after rev * 10 + pop is too late — the multiply itself overflows. Compare rev to MAX/10 first.',
      time: 'O(log(x)) — one pass per decimal digit',
      space: 'O(1)',
    },
    explain: {
      def: 'Return x with its decimal digits reversed, or 0 when the reversal leaves the 32-bit signed range.',
      init: 'Seed the answer at zero; no digits have been moved yet and the input is untouched.',
      loop: 'Keep passing while digits remain; x reaching zero means every digit was consumed.',
      pop: 'Read the lowest digit with mod 10, then drop it from x with truncating division.',
      check: 'Test whether another push could overflow, using MAX/10 and the edge digits 7 / -8.',
      push: 'Append the popped digit: shift rev left one decimal place and add pop.',
      done: 'Return rev, the fully reversed value, or 0 on the early overflow exit.',
    },
    explainLines: {
      java: [
        'Structural wrapper: the Solution class scope. No operation runs here.',
        'Signature: reverse takes int x and returns int. Execution starts in the body.',
        'Init: rev = 0 — the answer accumulates here, one digit per pass.',
        'Loop header: while x != 0 — one pass per remaining digit; zero digits ends the sweep.',
        'Pop the digit: pop = x % 10 reads the lowest digit (sign follows x in Java).',
        'Drop the digit: x /= 10 truncates toward zero, consuming the digit just read.',
        'Check positive overflow: rev beyond MAX/10, or equal with pop > 7, cannot push — return 0.',
        'Check negative overflow: rev below MIN/10, or equal with pop < -8, cannot push — return 0.',
        'Push: rev = rev * 10 + pop appends the digit; safe only because both checks passed.',
        'Loop footer: end of this pass; the next pass reads the new lowest digit.',
        'Done: return rev — every digit moved and no guard fired.',
        'Structural wrapper: close the method scope; no operation runs here.',
        'Structural wrapper: close the class scope; no operation runs here.',
      ],
      cpp: [
        'Structural wrapper: the Solution class scope. No operation runs here.',
        'Structural wrapper: public section opener. No operation runs here.',
        'Signature: reverse takes int x and returns int. Execution starts in the body.',
        'Init: rev = 0 — the answer accumulates here, one digit per pass.',
        'Loop header: while x != 0 — one pass per remaining digit; zero digits ends the sweep.',
        'Pop the digit: pop = x % 10 reads the lowest digit (sign follows x).',
        'Drop the digit: x /= 10 truncates toward zero, consuming the digit just read.',
        'Check positive overflow: rev beyond INT_MAX/10, or equal with pop > 7, cannot push — return 0.',
        'Check negative overflow: rev below INT_MIN/10, or equal with pop < -8, cannot push — return 0.',
        'Push: rev = rev * 10 + pop appends the digit; safe only because both checks passed.',
        'Loop footer: end of this pass; the next pass reads the new lowest digit.',
        'Done: return rev — every digit moved and no guard fired.',
        'Structural wrapper: close the method scope; no operation runs here.',
        'Structural wrapper: class terminator. No operation runs here.',
      ],
      pseudo: [
        'Init: name the task and seed rev = 0 before any digit moves.',
        'Loop: repeat once per remaining digit until x is fully consumed.',
        'Pop: split off the lowest digit and shrink x by one decimal place.',
        'Check: compare rev against the MAX/10 and MIN/10 limits (edge digits 7 and -8) first.',
        'Push: shift rev one place left and add the popped digit.',
        'Done: return the reversed value accumulated in rev.',
      ],
    },
    code: { java: reverseJava, cpp: reverseCpp, pseudo: reversePseudo },
    build: buildReverseInteger,
  },
}
