/**
 * reverse-bits — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `reverse-bits`
 * (Reverse Bits, Easy, reverseBits(int)->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is produced by oracleReverseBits below
 * (independent string-mirror oracle: no shift/OR arithmetic shared with the
 * reference loop), cross-checked against the staged selfcheck.
 *
 * Staged source: .workers/jobs/question-owners-150/reverse-bits/practice.mjs
 * (oracle + rows; v1/v2/v3 sets of 6 tests each). Contract delta, documented:
 * the forge contract requires 3-5 tests per variant, so each set carries the
 * first 4 tests (test0 official example preserved); the remaining staged
 * tests stay in the staged files. No rule twist anywhere: every set is the
 * same reversal task. All inputs are even and fit signed 32-bit int.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (same-task practice only, no rule change).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'reverse-bits'
export const SIGNATURE = Object.freeze({
  name: 'reverseBits',
  params: Object.freeze([{ name: 'n', type: 'int' }]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Easy'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the mirror reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same task with adversarial bit layouts that break sparse-bit assumptions.'

/** INDEPENDENT oracle: string mirror, no shift/OR arithmetic shared with the reference loop. */
export function oracleReverseBits(n) {
  const u = n >>> 0
  const s = u.toString(2).padStart(32, '0')
  const r = s.split('').reverse().join('')
  return parseInt(r, 2) >>> 0
}

const outLiteral = (v) => String(v)
const argLiteral = (n) => String(n)

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
    .map((n) => ({ args: [argLiteral(n)], expected: outLiteral(oracleReverseBits(n)) }))
    .slice(0, 4)
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

export function buildReverseBitsPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh values',
      intent: INTENT_SAME,
      title: 'Reverse Bits — Fresh Values (same task)',
      statement:
        'Same task as Reverse Bits: reverse the 32 bits of n. Fresh even inputs below use new bit patterns (the first test is the official example n = 43261596).',
      rows: [43261596, 2147483644, 100, 305419896],
      hints: [
        'Read bits LSB-first with (n & 1) then shift n right; append each bit with res = (res << 1) | bit.',
        'After 32 steps, source bit i sits at answer position 31 - i.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Reverse Bits — Edges: Zero, Powers of Two, Bounds (same task)',
      statement:
        'Same task as Reverse Bits. Edge set: n = 0, single-bit powers of two, and the largest even signed-32-bit input (the first test is the official example n = 2147483644).',
      rows: [2147483644, 0, 2, 1073741824],
      hints: [
        'n = 0 reverses to 0; a single set bit at position i lands at position 31 - i.',
        'Reversing twice restores n: reverse(reverse(n)) = n for every 32-bit input.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial patterns',
      intent: INTENT_ADVERSARIAL,
      title: 'Reverse Bits — Adversarial Bit Patterns (same task)',
      statement:
        'Same task as Reverse Bits — this set does NOT change the output type or rule. It only uses adversarial bit layouts (byte palindromes, repeated nibbles, sparse bits) that break approaches which assume sparse or one-sided bits (the first test is the official example n = 43261596).',
      rows: [43261596, 267390960, 252645150, 286331150],
      hints: [
        'Do not special-case zero bytes: every one of the 32 positions must move, including leading zeros.',
        'A byte-palindrome input still needs the full loop; verify by reversing twice.',
      ],
    }),
  ]
}

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oracleReverseBits (string mirror; shift/OR loop used only in walkthrough)',
})
