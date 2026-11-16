/**
 * palindrome-number — portable standalone practice builder.
 *
 * Produces exactly 3 deterministic variants for slug `palindrome-number`
 * (Palindrome Number, Easy, isPalindrome(int)->boolean, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * palindromePracticeOracle below (decimal string mirror), an INDEPENDENT
 * implementation of the same operation (not the walkthrough's half-reversal
 * fold with its early reject + x>rev loop + rev/10 middle-digit rule).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (mode 'exact': 'true' / 'false').
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'palindrome-number'
export const SIGNATURE = Object.freeze({
  name: 'isPalindrome',
  params: Object.freeze([{ name: 'x', type: 'int' }]),
  return: 'boolean',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Easy'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge cases the original hides.'
export const INTENT_ADVERSARIAL = 'Same question with adversarial shapes that punish shortcut solutions.'

export const INT_MAX = 2147483647
export const INT_MIN = -2147483648

/**
 * INDEPENDENT oracle: decimal string mirror. No x%10 fold, no rev accumulator,
 * no x>rev loop, no rev/10 middle-digit rule — a different method from the
 * walkthrough (which folds only the lower half into rev after an early
 * negative/trailing-zero reject).
 */
export function palindromePracticeOracle(x) {
  if (!Number.isSafeInteger(x)) return false
  if (x < 0) return false
  const s = String(x)
  return s === s.split('').reverse().join('')
}

function makeCase(x) {
  return { args: [String(x)], expected: String(palindromePracticeOracle(x)) }
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

export function buildPalindromeNumberVariants() {
  const v1 = buildVariant({
    id: 'v1',
    seedLabel: 'fresh values',
    intent: INTENT_SAME,
    title: 'Palindrome Number — fresh values (half-reversal drill)',
    statement:
      'Given an integer x, return true if x reads the same forward and backward, and false otherwise. ' +
      'Fresh inputs below: two odd-length palindromes, one even-length non-palindrome, and a negative. ' +
      'Work each one with the half-reversal walkthrough: reject, fold the lower half, compare the halves.',
    cases: [makeCase(12321), makeCase(45654), makeCase(12345), makeCase(-121)],
    hints: [
      'Negatives decide immediately: a minus sign can never mirror.',
      'Stop folding when x <= rev; then allow one middle digit via rev / 10.',
    ],
  })

  const v2 = buildVariant({
    id: 'v2',
    seedLabel: 'edge cases',
    intent: INTENT_EDGE,
    title: 'Palindrome Number — edge cases (half-reversal drill)',
    statement:
      'Same palindrome rule with the boundary inputs: zero and a single digit read the same either way, ' +
      'a trailing zero (10) would need a leading zero, 1001 is the smallest even-length palindrome with zeros inside, ' +
      'and INT_MAX (2147483647) is a long non-mirror. The signature and exact comparison are unchanged.',
    cases: [makeCase(0), makeCase(7), makeCase(10), makeCase(1001), makeCase(2147483647)],
    hints: [
      'Keep the x != 0 carve-out: 0 itself is a palindrome even though it ends in 0.',
      'For odd lengths the middle digit stays in rev — compare x against trunc(rev / 10) too.',
    ],
  })

  // Same-task adversarial set: numbers that punish whole-reversal overflow and
  // near-miss mirrors. Identical signature and question — no twist.
  const v3 = buildVariant({
    id: 'v3',
    seedLabel: 'adversarial overflow',
    intent: INTENT_ADVERSARIAL,
    title: 'Palindrome Number — adversarial half shapes (same task) (half-reversal drill)',
    statement:
      'Same palindrome question, no rule change: a 10-digit palindrome at the 32-bit edge (1000000001), ' +
      'a near-limit palindrome (2147447412), a full-reversal overflow trap (1999999999 reverses past INT_MAX ' +
      'but half-reversal decides it safely), and a long even palindrome (1234554321). ' +
      'Identical signature and question — only the half-stop fights back.',
    cases: [makeCase(1000000001), makeCase(2147447412), makeCase(1999999999), makeCase(1234554321)],
    hints: [
      'Folding the whole number can overflow 32-bit int; folding only the half never does.',
      '1999999999 is not a palindrome, and a correct half-reversal proves it without ever building 9999999991.',
    ],
  })

  return [v1, v2, v3]
}

/** Live-forge entry shape: `buildVariants(problem)` scoped to this slug. */
export function buildVariants(problem) {
  try {
    if (!problem || typeof problem !== 'object') return []
    if (problem.slug !== SLUG) return []
    const signature = problem?.judge?.signature
    if (!signature || signature.name !== SIGNATURE.name) return []
    if (signature.return !== SIGNATURE.return) return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    if (signature.params[0]?.type !== 'int') return []
    const variants = buildPalindromeNumberVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'palindromePracticeOracle (decimal string mirror; walkthrough uses half-reversal fold with early reject)',
})
