/**
 * palindrome-number — live semantic adapter (Math).
 *
 * Half-reversal: reject negatives and trailing-zero numbers, then move only the
 * lower half of x into rev and compare the halves. Pure + synchronous; never
 * throws on import. Out-of-range or non-integer inputs throw instead of rendering.
 *
 * Staged source: .workers/jobs/deck-release/catalog-expansion/lessons/palindrome-number/palindrome-number-adapter.js
 * (SIGNATURE, palindromeCode, LESSON, EXPLAIN, EXPLAIN_LINES, build) — ported
 * verbatim to the live shape: shared helpers imported from semantic-core.js,
 * no local code/frame redefinitions. Code text, explain notes, and build
 * events are unchanged.
 *
 * Signature equals the live judge signature exactly:
 * isPalindrome(x: int) -> boolean (plugin/data/shard-0.json id 9, mode exact).
 */

import { code, frame, boundedFrames } from './semantic-core.js'

export const INT_MAX = 2147483647
export const INT_MIN = -2147483648
export const MAX_FRAMES = 40

export const SIGNATURE = Object.freeze({
  name: 'isPalindrome',
  params: Object.freeze(['int']),
  return: 'boolean',
})

const palindromeCode = {
  java: code(`
[structure] class Solution {
[signature]     public boolean isPalindrome(int x) {
[reject]         if (x < 0 || (x % 10 == 0 && x != 0)) return false;
[init]         int rev = 0;
[loop]         while (x > rev) {
[push]             rev = rev * 10 + x % 10;
[push]             x /= 10;
[loop]         }
[done]         return x == rev || x == rev / 10;
[structure]     }
[structure] }
`),
  cpp: code(`
[structure] class Solution {
[structure] public:
[signature]     bool isPalindrome(int x) {
[reject]         if (x < 0 || (x % 10 == 0 && x != 0)) return false;
[init]         int rev = 0;
[loop]         while (x > rev) {
[push]             rev = rev * 10 + x % 10;
[push]             x /= 10;
[loop]         }
[done]         return x == rev || x == rev / 10;
[structure]     }
[structure] };
`),
  pseudo: code(`
[reject] isPalindrome(x): if x < 0 or (x mod 10 == 0 and x != 0) return false
[init]   rev = 0
[loop]   while x > rev:
[push]     rev = rev * 10 + x mod 10; x = trunc(x / 10)
[done]   return x == rev or x == trunc(rev / 10)
`),
}

export const LESSON = Object.freeze({
  idea: 'Reject negatives and trailing-zero numbers, then reverse only the lower half into rev; the middle digit may stay in rev for odd lengths.',
  trap: 'Reversing the whole number risks 32-bit overflow and wastes work — stop when x <= rev, and keep the x != 0 carve-out or 0 itself fails.',
  time: 'O(log10(x)) — one pass per digit in the lower half',
  space: 'O(1)',
})

export const EXPLAIN = Object.freeze({
  def: 'Return true when the decimal digits of x read the same forward and backward; negatives and trailing-zero numbers (except 0 itself) are never palindromes.',
  reject: 'Filter the two impossible shapes first: a minus sign can never mirror, and a trailing zero would need a leading zero.',
  init: 'Seed the half-reversal accumulator at zero; no digits have been moved yet.',
  loop: 'Keep folding digits while the unprocessed prefix x still exceeds the reversed suffix rev; meeting means the half is done.',
  push: 'Move the lowest digit of x onto rev and drop it from x with truncating division.',
  done: 'Compare the halves: even lengths need x == rev, odd lengths allow one middle digit via rev / 10.',
})

export const EXPLAIN_LINES = Object.freeze({
  java: [
    'Structural wrapper: the Solution class scope. No operation runs here.',
    'Signature: isPalindrome takes int x and returns boolean. Execution starts in the body.',
    'Reject: x < 0 can never mirror; x % 10 == 0 with x != 0 would need a leading zero — return false.',
    'Init: rev = 0 — the reversed lower half accumulates here, one digit per pass.',
    'Loop header: while x > rev — each pass moves one digit; meeting means the half is complete.',
    'Fold the digit: rev = rev * 10 + x % 10 appends the lowest remaining digit to the suffix.',
    'Drop the digit: x /= 10 truncates toward zero, consuming the digit just folded.',
    'Loop footer: end of this pass; the next pass compares the shrunken x against the grown rev.',
    'Done: return x == rev (even length) or x == rev / 10 (odd length drops the middle digit).',
    'Structural wrapper: close the method scope; no operation runs here.',
    'Structural wrapper: close the class scope; no operation runs here.',
  ],
  cpp: [
    'Structural wrapper: the Solution class scope. No operation runs here.',
    'Structural wrapper: public section opener. No operation runs here.',
    'Signature: isPalindrome takes int x and returns bool. Execution starts in the body.',
    'Reject: x < 0 can never mirror; x % 10 == 0 with x != 0 would need a leading zero — return false.',
    'Init: rev = 0 — the reversed lower half accumulates here, one digit per pass.',
    'Loop header: while x > rev — each pass moves one digit; meeting means the half is complete.',
    'Fold the digit: rev = rev * 10 + x % 10 appends the lowest remaining digit to the suffix.',
    'Drop the digit: x /= 10 truncates toward zero, consuming the digit just folded.',
    'Loop footer: end of this pass; the next pass compares the shrunken x against the grown rev.',
    'Done: return x == rev (even length) or x == rev / 10 (odd length drops the middle digit).',
    'Structural wrapper: close the method scope; no operation runs here.',
    'Structural wrapper: class terminator. No operation runs here.',
  ],
  pseudo: [
    'Reject: name the task and filter negatives plus trailing-zero numbers (except 0 itself).',
    'Init: seed rev = 0 before any digit moves.',
    'Loop: repeat while the unprocessed prefix still exceeds the reversed suffix.',
    'Push: fold the lowest digit of x onto rev and shrink x by one decimal place.',
    'Done: compare the halves, allowing one middle digit for odd lengths.',
  ],
})

/** Independent oracle: decimal string mirror. No half-reverse arithmetic. */
export function palindromeOracle(x) {
  if (!Number.isSafeInteger(x)) return false
  if (x < 0) return false
  const s = String(x)
  return s === s.split('').reverse().join('')
}

function decodeX(value) {
  if (!Number.isSafeInteger(value)) throw new Error('Provide x as an integer for this walkthrough')
  if (value < INT_MIN || value > INT_MAX) {
    throw new Error(`Visual walkthrough needs x in [${INT_MIN}, ${INT_MAX}] (${value} given)`)
  }
  return value
}

function finish(digits, frames, result) {
  return {
    kind: 'array',
    layout: { values: digits, label: 'digits of |x|, MSB..LSB' },
    frames: boundedFrames(frames, MAX_FRAMES).frames,
    result,
  }
}

export function build(args) {
  if (!Array.isArray(args) || args.length !== 1) {
    throw new Error('palindrome-number expects [x]')
  }
  let x = decodeX(args[0])
  const digits = String(Math.abs(x)).split('').map((d) => Number(d))
  const frames = []
  let rev = 0
  let iter = 0
  let pnCmp = 0, pnWrites = 0
  const pnOps = () => ({ cmp: pnCmp, writes: pnWrites })

  const rejectedEarly = x < 0 || (x % 10 === 0 && x !== 0)
  pnCmp += 1
  frames.push(frame(
    'reject',
    rejectedEarly ? 'Reject early' : 'Guard passes',
    rejectedEarly
      ? (x < 0 ? `x=${x} is negative; a minus sign can never mirror.` : `x=${x} ends in 0 but is not 0; no leading zero exists.`)
      : `x=${x} survives: non-negative and no trailing-zero trap.`,
    { vars: { x }, ops: pnOps() },
  ))
  if (rejectedEarly) {
    const highlights = x !== 0 && x % 10 === 0 ? { [digits.length - 1]: 'bad' } : {}
    frames.push(frame(
      'done',
      'Return false',
      `Early shape decides it; isPalindrome(${args[0]})=false.`,
      { highlights, vars: { x, rev, answer: false }, ops: pnOps() },
    ))
    return finish(digits, frames, false)
  }

  frames.push(frame(
    'init',
    'Seed rev',
    `x=${x}; rev=0. Nothing moved yet.`,
    { vars: { x, rev } },
  ))

  while (x > rev) {
    iter += 1
    pnCmp += 1
    const pos = digits.length - iter
    frames.push(frame(
      'loop',
      `Pass ${iter}`,
      `x=${x} > rev=${rev}; fold one more digit.`,
      { pointers: { pos }, vars: { x, rev, iter }, ops: pnOps() },
    ))
    const digit = x % 10
    const rest = Math.trunc(x / 10)
    rev = rev * 10 + digit
    x = rest
    pnWrites += 2
    frames.push(frame(
      'push',
      `rev=${rev}`,
      `digit=${digit} moves; now x=${x}, rev=${rev}.`,
      { pointers: { pos }, highlights: { [pos]: 'accent' }, vars: { x, rev, digit, iter }, ops: pnOps() },
    ))
  }
  pnCmp += 1

  const answer = x === rev || x === Math.trunc(rev / 10)
  frames.push(frame(
    'done',
    answer ? 'Halves match' : 'Halves differ',
    answer
      ? `x=${x} matches rev=${rev}${x === rev ? '' : ` via rev/10=${Math.trunc(rev / 10)} (middle digit)`}; palindrome.`
      : `x=${x} matches neither rev=${rev} nor rev/10=${Math.trunc(rev / 10)}; not a palindrome.`,
    {
      highlights: answer
        ? Object.fromEntries(digits.map((_, i) => [i, 'ok']))
        : Object.fromEntries(digits.map((_, i) => [i, 'dim'])),
      vars: { x, rev, answer },
      ops: pnOps(),
    },
  ))
  return finish(digits, frames, answer)
}

export const adapters = {
  'palindrome-number': {
    signature: SIGNATURE,
    lesson: LESSON,
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    code: palindromeCode,
    build,
  },
}
