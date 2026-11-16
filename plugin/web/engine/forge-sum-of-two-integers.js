/**
 * sum-of-two-integers — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `sum-of-two-integers`
 * (Sum of Two Integers, Medium, getSum(int,int)->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is plain a + b (independent of the
 * carried-XOR loop in the walkthrough) and cross-checked against the staged
 * selfcheck (332/0).
 *
 * Staged source: .workers/jobs/question-owners-150/sum-of-two-integers/practice.js
 * (rows, statements, oracle); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * All sets are the SAME task (no rule change); v3 stresses the constraint walls.
 * Contract delta vs staged (documented, oracle-verified): staged v1/v3 carry 2
 * tests each; the forge contract requires 3-5, so one generated case was added
 * to each ([23,9] carry chain, [1000,1000] max-positive wall) with expected
 * values from the same a+b oracle and inputs inside the staged -1000..1000
 * constraints. First tests (displayed examples) are unchanged.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (same-task practice only).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'sum-of-two-integers'
export const SIGNATURE = Object.freeze({
  name: 'getSum',
  params: Object.freeze([{ name: 'a', type: 'int' }, { name: 'b', type: 'int' }]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the carry-fold reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same task with adversarial constraint-wall pairs that punish dropped carries.'

/** INDEPENDENT oracle: plain addition (the loop under test is the carried-XOR walk). */
export function sumOracle(a, b) {
  return a + b
}

export const outLiteral = (v) => String(v)
const argLiteral = (a, b) => [String(a), String(b)]

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
    .map(([a, b]) => ({ args: argLiteral(a, b), expected: outLiteral(sumOracle(a, b)) }))
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

export function buildSumVariants() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'carry chain',
      intent: INTENT_SAME,
      title: 'Sum of Two Integers — Multi-Bit Carry Chain (same task)',
      statement:
        'Given integers a and b, return their sum without using + or -. Fresh generated input: a = 7, b = 5. The low three columns all carry, so the loop must propagate more than one round. The signature and exact comparison are unchanged.',
      rows: [[7, 5], [15, 1], [23, 9]],
      hints: [
        'Track b: it must reach exactly 0; a at that moment is the answer.',
        'Read both operands at the same columns: AND finds the 1&1 positions that must carry, then shift left.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'cancellation and zero',
      intent: INTENT_EDGE,
      title: 'Sum of Two Integers — Cancellation and Zero Edge (same task)',
      statement:
        'Same task: add without + or -. Generated edge inputs where bits cancel out: a = -1 with b = 1 sums to 0, and a = 0 with b = -14 must return -14 with the loop doing one quiet round. The signature and exact comparison are unchanged.',
      rows: [[-1, 1], [0, -14], [0, 0]],
      hints: [
        'Zero needs no special case: b == 0 on entry (or after one round) returns a directly.',
        'Negatives ride the same loop; two\u2019s-complement carry propagation handles the sign bits automatically.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'constraint walls',
      intent: INTENT_ADVERSARIAL,
      title: 'Sum of Two Integers — Opposite Extremes Transfer (same task)',
      statement:
        'Same task with adversarial transfer pairs at the constraint walls: a = 1000 with b = -1000 (full cancellation to 0) and a = -1000 with b = -1000 (double negative, long borrow-carry chain to -2000). No rule change: the signature and exact comparison are unchanged.',
      rows: [[1000, -1000], [-1000, -1000], [1000, 1000]],
      hints: [
        'Negatives ride the same loop: two\u2019s-complement carry propagation handles the sign bits automatically.',
        'Equal magnitudes with opposite signs must settle at exactly 0; any nonzero residue means a dropped carry.',
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
  oracle: 'sumOracle (plain a + b; carried-XOR loop used only in walkthrough)',
})
