/**
 * powx-n — portable standalone practice builder (batch13).
 *
 * Produces exactly 3 deterministic variants for slug `powx-n`
 * (Pow(x, n), Medium, myPow(double,int)->double, mode float).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * oraclePowLog below (exp/log path with integer-sign handling), an
 * INDEPENDENT implementation of the same operation (no halving loop, no
 * squaring, no bit tests — none of the walkthrough's machinery).
 *
 * Staged source: .workers/jobs/question-owners-150/powx-n/practice.mjs
 * (statements, hints, exp/log + naive oracles) + reference C++/Java (genuine
 * recursive-halving alternate); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * All three sets are the SAME task (no twist): identical signature, identical
 * question — v3 only pushes the exponent range adversarially.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (mode 'float', 1e-5 relative tolerance).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'float'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'powx-n'
export const SIGNATURE = Object.freeze({
  name: 'myPow',
  params: Object.freeze([{ name: 'x', type: 'double' }, { name: 'n', type: 'int' }]),
  return: 'double',
})
export const MODE = 'float'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same task, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same task with the edge cases the examples hide.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial range: INT_MIN reciprocals and 2^31 boundaries.'

/**
 * INDEPENDENT oracle: exp/log path with integer sign handling.
 * No halving loop, no squaring, no bit tests — a different method from the
 * walkthrough (which halves e and squares x once per binary digit, folding
 * the square into result exactly on 1-bits).
 */
export function oraclePowLog(x, n) {
  if (n === 0) return 1
  if (x === 0) return n > 0 ? 0 : NaN
  if (x > 0) return Math.exp(n * Math.log(x))
  const mag = Math.exp(n * Math.log(-x))
  return (n % 2 === 0) ? mag : -mag
}

function floatEqual(a, b, tol = 1e-5) {
  const x = Number(a)
  const y = Number(b)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return Object.is(x, y)
  return Math.abs(x - y) <= tol * Math.max(1, Math.abs(y))
}

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  }
}

function inputLine(signature, args) {
  return signature.params
    .map((param, index) => `${(param && param.name) || 'arg' + index} = ${args[index]}`)
    .join(', ')
}

function buildVariant({ id, seedLabel, intent, title, statement, rows, hints }) {
  const tests = rows
    .map(([x, n]) => {
      const expected = String(oraclePowLog(Number(x), Number(n)))
      return { args: [String(x), String(n)], expected }
    })
    .slice(0, 5)
    .map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
  const first = tests[0]
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title,
    statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(SIGNATURE, first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: hints.slice(0, 2),
  }
}

/* ---------------- entry point ---------------- */

export function buildPowXnVariants() {
  const v1 = buildVariant({
    id: 'v1',
    seedLabel: 'fresh powers',
    intent: INTENT_SAME,
    title: 'Pow(x, n) — fresh powers (same task)',
    statement:
      'Implement myPow(x, n) to compute x raised to the power n. ' +
      'Fresh bases and small non-negative exponents below: multiply-and-square exactly as the reference does. ' +
      'Both doubles stay inside -100 < x < 100 and 32-bit n, compared with 1e-5 relative tolerance.',
    rows: [
      ['2.00000', '10'],
      ['1.00000', '100'],
      ['2.00000', '5'],
      ['3.00000', '4'],
      ['1.50000', '3'],
    ],
    hints: [
      'Handle the sign once up front: for n < 0 work with 1/x and |n|.',
      'Square the base each step and fold it into the answer only on 1-bits of the exponent.',
    ],
  })

  const v2 = buildVariant({
    id: 'v2',
    seedLabel: 'edge cases',
    intent: INTENT_EDGE,
    title: 'Pow(x, n) — edges (same task)',
    statement:
      'Implement myPow(x, n) with the same signature and float comparison. ' +
      'Edge-focused set: n = 0, x = 1 with the smallest int exponent, zero base, a reciprocal exponent, and a negative base with an odd power. ' +
      'x^0 is 1 for every allowed x; the widening of n to 64 bits before negation is what saves the INT_MIN row.',
    rows: [
      ['2.00000', '-2'],
      ['2.50000', '0'],
      ['1.00000', '-2147483648'],
      ['0.00000', '5'],
      ['-2.00000', '3'],
    ],
    hints: [
      'x^0 is 1 for every allowed x; the loop body simply never runs.',
      'Widen n to 64 bits before negating: -(-2147483648) overflows a 32-bit int.',
    ],
  })

  // Same-task adversarial set: INT_MIN reciprocals, 2^31 boundaries, and a
  // fractional base where rounding matters. Same signature, same question.
  const v3 = buildVariant({
    id: 'v3',
    seedLabel: 'adversarial range',
    intent: INTENT_ADVERSARIAL,
    title: 'Pow(x, n) — adversarial range (same task)',
    statement:
      'Implement myPow(x, n) with the same signature and float comparison — this set does NOT change the output type or rule. ' +
      'It only pushes the exponent range adversarially: an INT_MIN reciprocal, 2^31 boundaries in both directions, and a fractional base. ' +
      'Compare with the float tolerance (1e-5 relative), never exact equality — 2.1^10 is not exact in binary.',
    rows: [
      ['2.10000', '3'],
      ['2.00000', '-2147483648'],
      ['2.00000', '31'],
      ['2.00000', '-31'],
      ['2.10000', '10'],
    ],
    hints: [
      'The INT_MIN case only works if negation happens in 64 bits; test x = 2.0 and x = 1.0 there.',
      'Compare with the float tolerance (1e-5 relative), never exact equality — 2.1^10 is not exact in binary.',
    ],
  })

  return [v1, v2, v3]
}

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oraclePowLog (exp/log path with integer sign handling; walkthrough uses iterative halving-and-squaring with per-bit folds)',
})

export function __selfTest() {
  const variants = buildPowXnVariants()
  if (variants.length !== 3) throw new Error('expected exactly 3 variants')
  for (const v of variants) {
    if (v.tests.length < 3 || v.tests.length > 5) throw new Error(v.id + ': 3-5 tests required')
    if (v.hints.length !== 2) throw new Error(v.id + ': exactly 2 hints required')
    for (const t of v.tests) {
      if (!floatEqual(oraclePowLog(Number(t.args[0]), Number(t.args[1])), Number(t.expected))) {
        throw new Error(v.id + ': oracle disagrees with expected for ' + t.args.join(','))
      }
    }
  }
  return true
}
