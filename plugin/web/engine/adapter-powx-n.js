/**
 * powx-n — live semantic adapter (Pow(x, n), LeetCode 50).
 *
 * Walkthrough algorithm: iterative binary exponentiation. e = |n| as a 64-bit
 * value (Java `long` / C++ `long long`); result folds in the current base
 * exactly on the 1-bits of e. The JS trace below uses `% 2` /
 * `Math.floor(e / 2)` instead of bitwise ops because JS coerces bitwise
 * operands to 32 bits, which breaks for e = 2^31 (the n = INT_MIN case); the
 * Java/C++ references keep `& 1` / `>>= 1` on their 64-bit `e`, where they
 * are correct.
 *
 * Staged source: .workers/jobs/neetcode150-completion/powx-n/adapter.mjs
 * (powJava/powCpp/powPseudo/powExplain/powExplainLines/decodePowArgs/powTrace/
 * buildPow) — ported verbatim to the live shape: shared helpers imported from
 * semantic-core.js, no local code/frame/boundedFrames redefinitions. Code
 * text, explain notes, and build events are unchanged.
 *
 * Signature equals the live judge signature exactly:
 * myPow(x: double, n: int) -> double (plugin/data/shard-5.json id 50, mode float).
 */

import { code, frame, boundedFrames } from './semantic-core.js'

export const MAX_FRAMES = 40

const powJava = code(`
[structure] class Solution {
[signature]     public double myPow(double x, int n) {
[init]         long e = n;
[init]         if (e < 0) { x = 1 / x; e = -e; }
[init]         double result = 1.0;
[loop]         while (e > 0) {
[compare]             if ((e & 1) == 1) {
[update]                 result *= x;
[compare]             }
[square]             x *= x;
[square]             e >>= 1;
[loop]         }
[done]         return result;
[structure]     }
[structure] }
`)

const powCpp = code(`
[structure] class Solution {
[structure] public:
[signature]     double myPow(double x, int n) {
[init]         long long e = n;
[init]         if (e < 0) { x = 1 / x; e = -e; }
[init]         double result = 1.0;
[loop]         while (e > 0) {
[compare]             if ((e & 1) == 1) {
[update]                 result *= x;
[compare]             }
[square]             x *= x;
[square]             e >>= 1;
[loop]         }
[done]         return result;
[structure]     }
[structure] };
`)

const powPseudo = code(`
[init] myPow(x, n): e = n as 64-bit; if e < 0: x = 1/x; e = -e; result = 1
[loop]   while e > 0:
[compare]     if e is odd:
[update]       result = result * x
[square]     x = x * x; e = e >> 1
[done]   return result
`)

function clipNote(s) {
  const t = String(s)
  return t.length <= 140 ? t : t.slice(0, 137) + '...'
}

function fmtNum(v) {
  if (Object.is(v, -0)) return '0'
  return String(v)
}

/** Visual input contract: the problem constraints, unclipped. */
function decodePowArgs(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('powx-n expects [x, n]')
  const [xRaw, nRaw] = args
  if (typeof xRaw !== 'number' || !Number.isFinite(xRaw)) throw new Error('x must be a finite number (got ' + JSON.stringify(xRaw) + ')')
  if (xRaw <= -100 || xRaw >= 100) throw new Error('x must satisfy -100 < x < 100 (got ' + xRaw + ')')
  if (!Number.isInteger(nRaw) || nRaw < -2147483648 || nRaw > 2147483647) {
    throw new Error('n must be an integer with -2^31 <= n <= 2^31-1 (got ' + JSON.stringify(nRaw) + ')')
  }
  if (xRaw === 0 && nRaw <= 0) throw new Error('0^0 and 0 to a negative power are outside the problem guarantees')
  return [xRaw, nRaw]
}

/**
 * Real execution trace of iterative binary exponentiation.
 * Returns { flipped, base0, e0, result, steps } where each step is
 * { eBefore, odd, resultBefore, resultAfter, baseBefore, baseAfter, eAfter }.
 * Uses % 2 and Math.floor(/2): JS bitwise ops coerce to 32 bits and break
 * for e = 2^31 (n = INT_MIN); the recorded arithmetic matches the reference.
 */
function powTrace(xRaw, nRaw) {
  const [x0, n0] = decodePowArgs([xRaw, nRaw])
  let x = x0
  let e = n0
  const flipped = e < 0
  if (flipped) {
    x = 1 / x
    e = -e
  }
  const base0 = x
  const e0 = e
  let result = 1
  const steps = []
  while (e > 0) {
    const eBefore = e
    const odd = (e % 2) === 1
    const resultBefore = result
    const baseBefore = x
    if (odd) result *= x
    x *= x
    e = Math.floor(e / 2)
    steps.push({ eBefore, odd, resultBefore, resultAfter: result, baseBefore, baseAfter: x, eAfter: e })
  }
  return { flipped, base0, e0, result, steps }
}

function bitsMsbFirst(e0) {
  if (e0 === 0) return [0]
  const bits = []
  let v = e0
  while (v > 0) {
    bits.unshift(v % 2)
    v = Math.floor(v / 2)
  }
  return bits
}

export function buildPowXn(args) {
  const [x0, n0] = decodePowArgs(args)
  const trace = powTrace(x0, n0)
  const { flipped, base0, e0, result, steps } = trace
  const bits = bitsMsbFirst(e0)
  const L = bits.length
  // Bit index in the MSB-first layout for the k-th processed (LSB-first) step.
  const bitIndex = (k) => (e0 === 0 ? 0 : L - 1 - k)
  const frames = []
  const anchors = []
  const baseState = (k, extra = {}) => ({
    values: bits.slice(),
    pointers: k === null ? {} : { bit: bitIndex(k) },
    highlights: k === null ? {} : { [bitIndex(k)]: 'accent' },
    vars: { x: fmtNum(base0), e: e0, result: fmtNum(1), ...extra },
  })

  frames.push(frame(
    'init',
    'Normalize the sign',
    clipNote(flipped
      ? `n=${n0} < 0: x=1/(${fmtNum(x0)})=${fmtNum(base0)}, e=${e0}; result=1.`
      : `n=${n0} >= 0: keep x=${fmtNum(base0)}, e=${e0}; result=1.`),
    baseState(null, { x: fmtNum(base0), e: e0, result: '1' }),
  ))

  if (steps.length === 0) {
    frames.push(frame(
      'loop',
      'Loop guard fails',
      clipNote(`e=0: the body never runs; x^0=1 for x=${fmtNum(x0)}.`),
      { values: bits.slice(), vars: { x: fmtNum(base0), e: 0, result: '1' } },
    ))
  }

  steps.forEach((s, k) => {
    frames.push(frame(
      'compare',
      `Test bit ${k}`,
      clipNote(s.odd
        ? `e=${s.eBefore} odd: fold base ${fmtNum(s.baseBefore)} into result ${fmtNum(s.resultBefore)}.`
        : `e=${s.eBefore} even: skip the fold; result stays ${fmtNum(s.resultBefore)}.`),
      {
        values: bits.slice(),
        pointers: { bit: bitIndex(k) },
        highlights: { [bitIndex(k)]: s.odd ? 'accent' : 'dim' },
        vars: { x: fmtNum(s.baseBefore), e: s.eBefore, result: fmtNum(s.resultBefore), bit: k },
      },
    ))
    if (s.odd) {
      anchors.push(frames.length)
      frames.push(frame(
        'update',
        'Fold into result',
        clipNote(`result=${fmtNum(s.resultBefore)}*${fmtNum(s.baseBefore)}=${fmtNum(s.resultAfter)}.`),
        {
          values: bits.slice(),
          pointers: { bit: bitIndex(k) },
          highlights: { [bitIndex(k)]: 'ok' },
          vars: { x: fmtNum(s.baseBefore), e: s.eBefore, result: fmtNum(s.resultAfter), bit: k },
        },
      ))
    }
    frames.push(frame(
      'square',
      'Square and shift',
      clipNote(`x=${fmtNum(s.baseBefore)}->${fmtNum(s.baseAfter)}; e=${s.eBefore}->${s.eAfter}.`),
      {
        values: bits.slice(),
        pointers: { bit: bitIndex(k) },
        highlights: { [bitIndex(k)]: 'ok' },
        vars: { x: fmtNum(s.baseAfter), e: s.eAfter, result: fmtNum(s.resultAfter), bit: k },
      },
    ))
  })

  anchors.push(frames.length)
  frames.push(frame(
    'done',
    'Return the power',
    clipNote(`e=0: every bit consumed; myPow(${fmtNum(x0)}, ${n0}) = ${fmtNum(result)}.`),
    {
      values: bits.slice(),
      highlights: Object.fromEntries(bits.map((b, i) => [i, b === 1 ? 'ok' : 'dim'])),
      vars: { x: fmtNum(x0), n: n0, answer: fmtNum(result) },
    },
  ))

  // Short runs (e.g. n=0: init/loop/done = 3 frames) reuse the integrated
  // semantic.js convention: honest context cards repeating an actual snapshot,
  // explicitly not extra operations, to satisfy the 6-frame scene minimum.
  let full = frames
  if (full.length < 6) {
    const first = full[0]
    const last = full[full.length - 1]
    const context = [
      { ...first, label: 'Context · input', note: `x = ${fmtNum(x0)}; n = ${n0}` },
      { ...first, label: 'Context · task', note: 'Compute x raised to the power n.' },
      { ...first, label: 'Context · invariant', note: 'result holds the folded 1-bits; x holds 2^k place values.' },
      { ...last, label: 'Context · returned value', note: `Actual return value: ${fmtNum(result)}` },
    ]
    const needed = 6 - full.length
    full = [...context.slice(0, Math.min(needed, 3)), ...full, ...context.slice(3, needed > 3 ? 4 : 3)]
  }

  const { frames: compact, omitted } = boundedFrames(full, MAX_FRAMES, anchors)
  return {
    kind: 'array',
    layout: { values: bits.slice(), label: 'bits of |n|, MSB first · 1-bits fold into result' },
    frames: compact.map((f) => ({ ...f, note: String(f.note).slice(0, 140) })),
    result,
    omitted,
  }
}

export const adapters = {
  'powx-n': {
    signature: { name: 'myPow', params: ['double', 'int'], return: 'double' },
    lesson: {
      idea: 'Read the binary digits of |n|: square the base each step and fold it into result exactly on 1-bits. One sign flip up front handles negative n.',
      trap: 'Negating n = -2^31 overflows a 32-bit int, so widen to 64 bits first. Flipping to 1/x must happen before the loop, not inside it.',
      time: 'O(log n)',
      space: 'O(1)',
    },
    explain: {
      def: 'Compute x raised to the power n with binary exponentiation: each 1-bit of |n| folds the current square into the answer.',
      init: 'Normalize the sign once: a negative n flips x to 1/x and works with e=|n|, so the loop only sees e>=0.',
      loop: 'Loop guard: each pass consumes one binary digit of e, so the loop runs exactly bitlen(e) times.',
      compare: 'Read the lowest remaining bit of e: 1 means the current square is part of the answer, 0 means skip it.',
      update: 'Fold the current square into result. Runs only on 1-bits; result is the product of the squares seen so far.',
      square: 'Advance the place value: x becomes x^2 for the next bit, and e shifts right to expose it.',
      done: 'e reached 0, every bit consumed; result holds x^n (already reciprocalized when n was negative).',
    },
    explainLines: {
      java: [
        'Structural wrapper: the Solution class scope. No operation runs here.',
        'Signature: myPow takes double x and int n, returns double. Execution starts in the body.',
        'Widen n into 64-bit e first: negating INT_MIN overflows a 32-bit int, a long holds it.',
        'Sign branch: for negative n work with the reciprocal base and the positive exponent e.',
        'Seed the accumulator at 1, the multiplicative identity, before any bit is read.',
        'Loop scope: one pass per binary digit of e; the guard e>0 ends the halving.',
        'Bit test: the lowest remaining bit of e decides whether this square is folded in.',
        'Fold step: multiply result by the current square; runs only when the tested bit is 1.',
        'End of the bit test: a 0-bit skips the fold above and falls through to the square step.',
        'Square step: x becomes x^2, the place value of the next binary digit.',
        'Shift step: drop the consumed bit; the next lowest bit is now testable.',
        'Loop footer: next pass reads the new lowest bit with the new square.',
        'Return result: e is 0, so every bit was consumed exactly once.',
        'Structural wrapper: close the method scope. No operation runs here.',
        'Structural wrapper: close the class scope. No operation runs here.',
      ],
      cpp: [
        'Structural wrapper: the Solution class scope. No operation runs here.',
        'Structural wrapper: public section opener. No operation runs here.',
        'Signature: myPow takes double x and int n, returns double. Execution starts in the body.',
        'Widen n into 64-bit e first: negating INT_MIN overflows a 32-bit int, a long long holds it.',
        'Sign branch: for negative n work with the reciprocal base and the positive exponent e.',
        'Seed the accumulator at 1, the multiplicative identity, before any bit is read.',
        'Loop scope: one pass per binary digit of e; the guard e>0 ends the halving.',
        'Bit test: the lowest remaining bit of e decides whether this square is folded in.',
        'Fold step: multiply result by the current square; runs only when the tested bit is 1.',
        'End of the bit test: a 0-bit skips the fold above and falls through to the square step.',
        'Square step: x becomes x^2, the place value of the next binary digit.',
        'Shift step: drop the consumed bit; the next lowest bit is now testable.',
        'Loop footer: next pass reads the new lowest bit with the new square.',
        'Return result: e is 0, so every bit was consumed exactly once.',
        'Structural wrapper: close the method scope. No operation runs here.',
        'Structural wrapper: class terminator. No operation runs here.',
      ],
      pseudo: [
        'Setup: widen n to 64 bits, flip sign once (reciprocal base, positive e), seed result at 1.',
        'Order: one pass per binary digit while e stays positive; each pass halves e.',
        'Test: the odd/even check reads the current lowest bit to decide the fold.',
        'Fold: on a 1-bit only, multiply the running result by the current square.',
        'Advance: square the base for the next digit and shift e to expose that digit.',
        'Return result, which now equals x^n including the reciprocal case.',
      ],
    },
    code: { java: powJava, cpp: powCpp, pseudo: powPseudo },
    build: buildPowXn,
  },
}
