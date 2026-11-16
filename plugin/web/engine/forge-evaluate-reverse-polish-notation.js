/**
 * evaluate-reverse-polish-notation — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `evaluate-reverse-polish-notation`
 * (Evaluate Reverse Polish Notation, Medium, evalRPN(string[]) -> int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * evalRpnRecursiveOracle below (right-to-left recursive descent), an INDEPENDENT
 * implementation of the same operation (not the walkthrough's left-to-right
 * explicit-stack emitter).
 *
 * Staged source rows: .workers/jobs/neetcode150-completion/evaluate-reverse-polish-notation/variants.evaluate-reverse-polish-notation.js
 * (statements, hints, token rows); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time.
 *
 * Shape follows plugin/web/engine/forge-pacific-atlantic-water-flow.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (exact integer equality).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'evaluate-reverse-polish-notation'
export const SIGNATURE = Object.freeze({
  name: 'evalRPN',
  params: Object.freeze([{ name: 'tokens', type: 'string[]' }]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_HARDER = 'Same task, harder inputs with chained truncating divisions.'

/**
 * INDEPENDENT reference oracle: recursive descent from the RIGHT end of the token
 * list. An operator consumes its right operand first, then its left operand, so no
 * explicit left-to-right stack is ever built. Division truncates toward zero via
 * Math.trunc, matching Java/C++ int division. Different algorithm from the
 * walkthrough's iterative stack scan; cross-checked against it in verification.
 */
export function evalRpnRecursiveOracle(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) throw new Error('RPN needs at least one token')
  let pos = tokens.length - 1
  function evalOne() {
    if (pos < 0) throw new Error('RPN underflow: operator without enough operands')
    const t = String(tokens[pos--])
    if (t === '+' || t === '-' || t === '*' || t === '/') {
      const b = evalOne()
      const a = evalOne()
      if (t === '+') return a + b
      if (t === '-') return a - b
      if (t === '*') return a * b
      if (b === 0) throw new Error('Division by zero is outside the task inputs.')
      return Math.trunc(a / b)
    }
    const n = Number(t)
    if (!Number.isFinite(n)) throw new Error('Bad operand ' + t)
    return n
  }
  const result = evalOne()
  if (pos !== -1) throw new Error('RPN must leave exactly one value')
  return result
}

const lit = (v) => JSON.stringify(v)

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

function buildVariant({ id, seedLabel, intent, title, statement, tokenRows, hints }) {
  const tests = tokenRows
    .map((tokens) => ({ args: [lit(tokens.map(String))], expected: String(evalRpnRecursiveOracle(tokens)) }))
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

export function buildEvaluateReversePolishNotationPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh expressions',
      intent: INTENT_SAME,
      title: 'Evaluate Reverse Polish Notation — fresh expressions (RPN drill)',
      statement:
        'You are given an array of strings tokens in Reverse Polish Notation. Evaluate the expression and return the integer value. Operands are integers; operators are "+", "-", "*", "/". Division truncates toward zero.',
      tokenRows: [
        ['3', '4', '+', '2', '*'],
        ['5', '1', '2', '+', '4', '*', '+', '3', '-'],
        ['2', '3', '11', '+', '5', '-', '*'],
        ['7', '2', '3', '*', '-'],
      ],
      hints: [
        'Push operands; on an operator pop b then a and push a op b.',
        'Order matters for "-" and "/": the first pop is the right operand.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Evaluate Reverse Polish Notation — edge cases (RPN drill)',
      statement:
        'Same RPN evaluation task with the boundary inputs. A single token is already the answer; negative operands are allowed; division truncates toward zero (so -7/3 is -2, not -3). Zero divided by anything nonzero is 0.',
      tokenRows: [
        ['42'],
        ['-3', '-2', '*'],
        ['-7', '3', '/'],
        ['18', '-3', '/'],
        ['0', '3', '/'],
      ],
      hints: [
        'A lone operand needs no operator: ["42"] evaluates to 42.',
        'Truncation rounds toward zero, so negative quotients move toward zero.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'same-task harder set',
      intent: INTENT_HARDER,
      title: 'Evaluate Reverse Polish Notation — same-task harder set (RPN drill)',
      statement:
        'Same RPN evaluation task (same signature, same integer return): evaluate tokens with chained operators where every division truncates toward zero. No new operation is introduced; the difficulty is ordering pops correctly across longer chains.',
      tokenRows: [
        ['7', '-3', '/'],
        ['-7', '-3', '/'],
        ['3', '11', '+', '5', '-', '2', '/'],
        ['4', '-13', '5', '/', '+'],
      ],
      hints: [
        'Evaluate each "/" with Math.trunc(a/b) in JS (int division in Java/C++).',
        'Work left to right: each operator consumes exactly the two values on top.',
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
  oracle: 'evalRpnRecursiveOracle (right-to-left recursive descent; frame emitter scans left-to-right with an explicit stack)',
})
