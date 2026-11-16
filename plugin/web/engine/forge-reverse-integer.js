/**
 * reverse-integer — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `reverse-integer`
 * (Reverse Integer, Medium, reverse(int)->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * reverseIntegerOracle below (decimal string reversal with re-applied sign
 * and a 32-bit range check), an INDEPENDENT implementation of the same
 * operation (not the walkthrough's pop/push arithmetic frame emitter).
 *
 * Staged source: .workers/jobs/question-owners-150/reverse-integer/practice.js
 * (statements, hints, string-based oracle) + reference.js (genuine alternate
 * approach); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time. All three
 * sets are the SAME task (no twist): identical signature, identical question —
 * v3 is adversarial same-task numbers only.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (mode 'exact').
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'reverse-integer'
export const SIGNATURE = Object.freeze({
  name: 'reverse',
  params: Object.freeze([{ name: 'x', type: 'int' }]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same task, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same task with the edge cases the examples hide.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial numbers: one final digit decides fit vs overflow.'

export const INT_MAX = 2147483647
export const INT_MIN = -2147483648

/**
 * INDEPENDENT oracle: decimal string reversal, re-applied sign, range check.
 * No pop/push arithmetic loop, no rev accumulator, no MAX/10 guard — a
 * different method from the walkthrough (which pops x % 10 and pushes onto
 * rev with a pre-push overflow guard each pass).
 */
export function reverseIntegerOracle(x) {
  if (!Number.isSafeInteger(x)) return 0
  const neg = x < 0
  const digits = String(Math.abs(x)).split('').reverse().join('')
  const n = (neg ? -1 : 1) * Number(digits)
  if (n < INT_MIN || n > INT_MAX) return 0
  return n
}

function makeCase(x) {
  return { args: [String(x)], expected: String(reverseIntegerOracle(x)) }
}

function inputLine(args) {
  return SIGNATURE.params.map((p, i) => `${p.name} = ${args[i]}`).join(', ')
}

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  }
}

function buildVariant({ id, seedLabel, intent, title, statement, cases, hints }) {
  const tests = cases
    .map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
    .slice(0, 5)
  const first = tests[0]
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title,
    statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: hints.slice(0, 2),
  }
}

/* ---------------- entry point ---------------- */

export function buildReverseIntegerVariants() {
  const v1 = buildVariant({
    id: 'v1',
    seedLabel: 'fresh values',
    intent: INTENT_SAME,
    title: 'Reverse Integer — fresh values (digit drill)',
    statement:
      'Given a signed 32-bit integer x, return x with its digits reversed. ' +
      'If reversing x goes outside [-2147483648, 2147483647], return 0. ' +
      'Fresh inputs below: the official 123 anchor, a negative whose sign rides along, ' +
      'a value with a trailing zero that vanishes, and a nine-digit value that still fits.',
    cases: [makeCase(123), makeCase(-352), makeCase(1020), makeCase(987654321)],
    hints: [
      'Pop with x % 10 and shrink x with truncating division, one digit per pass.',
      'Trailing zeros vanish naturally: each 0 pops onto rev, then contributes nothing.',
    ],
  })

  const v2 = buildVariant({
    id: 'v2',
    seedLabel: 'edge cases',
    intent: INTENT_EDGE,
    title: 'Reverse Integer — edge cases (digit drill)',
    statement:
      'Given a signed 32-bit integer x, return x with its digits reversed. ' +
      'If reversing x goes outside [-2147483648, 2147483647], return 0. ' +
      'Boundary inputs: zero takes no loop passes, a single digit returns itself, ' +
      'a negative with a trailing zero, and INT_MAX plus INT_MIN which both reverse out of range. ' +
      'The signature and exact comparison are unchanged.',
    cases: [makeCase(0), makeCase(7), makeCase(-1020), makeCase(2147483647), makeCase(-2147483648)],
    hints: [
      'Zero and single digits need no guard drama: the loop simply never fires or pushes once.',
      'Compare rev against 214748364 before pushing; a tie breaks on the edge digits 7 and -8.',
    ],
  })

  // Same-task adversarial set: the classic overflow plus a fits/fires pair that
  // turns on the final pop. Same signature, same question — no twist.
  const v3 = buildVariant({
    id: 'v3',
    seedLabel: 'adversarial overflow',
    intent: INTENT_ADVERSARIAL,
    title: 'Reverse Integer — adversarial overflow (same task) (digit drill)',
    statement:
      'Given a signed 32-bit integer x, return x with its digits reversed. ' +
      'If reversing x goes outside [-2147483648, 2147483647], return 0. ' +
      'Adversarial inputs: the classic 1534236469 overflow, plus the pair 1463847412 ' +
      '(fits: 2147483641) versus 1563847412 (fires: 0) where one final digit decides. ' +
      'Identical signature and question — only the last guard fights back.',
    cases: [makeCase(1534236469), makeCase(1463847412), makeCase(1563847412), makeCase(-1563847412)],
    hints: [
      'The tie-break lives in the last check: rev == 214748364 with pop > 7 returns 0.',
      'Checking overflow after rev * 10 + pop is too late — the multiply itself overflows.',
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
  oracle: 'reverseIntegerOracle (decimal string reversal with re-applied sign and range check; walkthrough uses pop/push arithmetic with a pre-push guard)',
})
