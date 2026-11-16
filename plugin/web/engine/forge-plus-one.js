/**
 * plus-one — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `plus-one`
 * (Plus One, Easy, plusOne(int[]) -> int[], mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed literals only; every expected value is computed at build time by
 * bigIntPlusOne below (decimal string + BigInt add, split back into digits),
 * an INDEPENDENT implementation of the same operation (not the walkthrough's
 * right-to-left carry-scan frame emitter), cross-checked against the carry
 * scan so the two oracles must agree before any test ships.
 *
 * Staged source: .workers/jobs/neetcode150-completion/plus-one/plus-one.practice.js
 * (statements, hints, carry/bigInt oracles); reshaped into the forge variant
 * contract (id/seedLabel/intent/difficulty/title/statement/signature/examples/
 * tests/mode/hints). All three sets are the SAME task (no twist): identical
 * signature, identical question — v3 is adversarial same-task shapes only.
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

export const SLUG = 'plus-one'

export const SIGNATURE = Object.freeze({
  name: 'plusOne',
  params: Object.freeze([{ name: 'digits', type: 'int[]' }]),
  return: 'int[]',
})

export const MODE = 'exact'
export const DIFFICULTY = 'Easy'

export const INTENT_SAME = 'Same task, different digit strings so you reproduce the carry.'
export const INTENT_EDGE = 'Same task with the boundary inputs the examples hide.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial carry placements: the rule and output type are unchanged.'

/**
 * INDEPENDENT oracle: decimal string + BigInt add, split back into digits.
 * No right-to-left scan, no per-digit carry loop, no in-place writes — a
 * different method from the walkthrough (which carries 9 -> 0 leftwards and
 * returns early below 9).
 */
export function bigIntPlusOne(digits) {
  const s = digits.map(String).join('')
  const added = (BigInt(s) + 1n).toString()
  return [...added].map((ch) => Number(ch))
}

/** Walkthrough-side cross-check oracle: the taught right-to-left carry scan. */
export function carryPlusOne(digits) {
  const a = digits.slice()
  for (let i = a.length - 1; i >= 0; i--) {
    if (a[i] < 9) {
      a[i] += 1
      return a
    }
    a[i] = 0
  }
  return [1, ...a]
}

function argLiteral(digits) {
  return '[' + digits.join(',') + ']'
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

function toTest(digits) {
  if (digits.length > 1 && digits[0] === 0) throw new Error('leading zero not allowed: ' + JSON.stringify(digits))
  const a = carryPlusOne(digits)
  const b = bigIntPlusOne(digits)
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error('oracle disagreement on ' + JSON.stringify(digits))
  return { args: [argLiteral(digits)], expected: argLiteral(a) }
}

function buildVariant({ id, seedLabel, intent, title, statement, tests, hints }) {
  const rows = tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
  const first = rows[0]
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title,
    statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(first.args), output: first.expected, explain: '' }],
    tests: rows,
    mode: MODE,
    hints: hints.slice(0, 2),
  }
}

/* ---------------- entry point ---------------- */

export function buildPlusOneVariants() {
  // v1 — same pattern, fresh numbers (fixed literals, none equals a shard example).
  const v1rows = [
    [2, 4, 9],
    [5, 6, 7, 8],
    [1, 0, 0],
    [3, 9, 9],
  ].map(toTest)

  // v2 — same pattern, hidden edge cases (fixed literals, each verified by both oracles).
  const v2rows = [
    [0],
    [1, 9, 9],
    [9, 9],
    [7],
  ].map(toTest)

  // v3 — SAME TASK adversarial shapes (honest label: output type unchanged, still int[]).
  // Long 9-suffix carries plus single-9 overflow chains that grow the array.
  const v3rows = [
    [9, 9, 9, 9],
    [1, 9, 9, 9],
    [9],
    [8, 9, 9, 9, 9, 9, 9, 9],
  ].map(toTest)

  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh numbers',
      intent: INTENT_SAME,
      title: 'Plus One — fresh numbers (same-task drill)',
      statement:
        'You are given a large integer as an array digits, most-significant digit first with no leading zeros. ' +
        'Increment it by one and return the resulting digit array. ' +
        'Fresh inputs below: a carry buried behind a non-9, a no-carry increment, a zero suffix, and a 9-suffix that zeroes out.',
      tests: v1rows,
      hints: [
        'Scan from the rightmost digit: a digit below 9 absorbs the +1, a 9 becomes 0 and moves left.',
        'If every digit is 9 the answer grows by one place: 1 followed by zeros.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Plus One — edge cases (same-task drill)',
      statement:
        'Same plus-one task with boundary inputs: zero itself, a short 9-suffix, an all-9s pair, and a single non-9 digit. ' +
        'No input has a leading zero. ' +
        'The signature and exact comparison are unchanged.',
      tests: v2rows,
      hints: [
        '[0] plus one is [1]: the single digit below 9 absorbs the carry immediately.',
        'A 9-suffix of any length zeroes out and the carry lands on the first non-9 to its left.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial shapes',
      intent: INTENT_ADVERSARIAL,
      title: 'Plus One — adversarial shapes (same-task drill)',
      statement:
        'Same plus-one question, no rule change: long 9-suffixes force the carry across many places and the all-9s inputs grow the array by one. ' +
        'Return the int[] digit array in every test. ' +
        'Count the trailing 9s first, then decide whether the answer keeps its length or grows.',
      tests: v3rows,
      hints: [
        'Count the 9-suffix first: k trailing 9s become k zeros and the digit (or new 1) left of them increments.',
        'The single [9] and the long all-9s runs both take the overflow branch: [1] plus zeros.',
      ],
    }),
  ]
}

// Staged-compat alias: same builder, family-style name.
export const buildPracticeVariants = buildPlusOneVariants

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'bigIntPlusOne (decimal string + BigInt add; walkthrough uses right-to-left carry scan)',
})

export default buildPlusOneVariants
