/**
 * multiply-strings — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `multiply-strings`
 * (Multiply Strings, Medium). Judgeable YES: the live record
 * (plugin/data/shard-5.json, problem 43) carries judge tests with signature
 *   multiply(num1: string, num2: string) -> string, mode exact,
 * and the forge `SIGNATURE` below equals that live judge signature exactly.
 * Every expected value is computed at build time by oracleMultiplyStrings
 * below (native BigInt multiplication — no digit array, no per-pair loop,
 * no shared code with the walkthrough's res-array place-and-carry emitter),
 * so producer/validator never share code.
 *
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed literals only; the first test of v1 is the official shard example 1
 * ("2"*"3"->"6") and the first test of v2 is the official shard example 2
 * ("123"*"456"->"56088"). All values respect the statement guarantees
 * (digits only, no leading zeros except "0" itself).
 *
 * Staged source: .workers/jobs/question-owners-150/multiply-strings/
 * multiply-strings.variants.js (curated sets, dual grade-school/BigInt
 * oracles); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw literal strings; `expected` is the literal the judge compares.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from tests[0].
 * - `mode` is 'exact'. `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'multiply-strings'
export const SIGNATURE = Object.freeze({
  name: 'multiply',
  params: Object.freeze([{ name: 'num1', type: 'string' }, { name: 'num2', type: 'string' }]),
  return: 'string',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same task, fresh digit combinations so you reproduce the place-and-carry reasoning.'
export const INTENT_EDGE = 'Same task with the zeros, ones, and powers of ten the examples hide.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial shapes: heavy carry chains that punish a dropped +=.'

/**
 * INDEPENDENT oracle: native BigInt multiplication.
 * No res array, no i/j/p1/p2 placement loop, no per-pair sum%10 loop — a
 * different method from the walkthrough (which accumulates every digit pair
 * into res[i+j+1] and carries into res[i+j] with +=).
 */
export function oracleMultiplyStrings(a, b) {
  return (BigInt(a) * BigInt(b)).toString()
}

/** Walkthrough-side cross-check: the taught single-array accumulation. Never exported as the oracle. */
function gradeSchoolMultiply(a, b) {
  if (a === '0' || b === '0') return '0'
  const n = a.length
  const m = b.length
  const res = new Array(n + m).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    const d1 = a.charCodeAt(i) - 48
    for (let j = m - 1; j >= 0; j--) {
      const d2 = b.charCodeAt(j) - 48
      const sum = d1 * d2 + res[i + j + 1]
      res[i + j + 1] = sum % 10
      res[i + j] += Math.floor(sum / 10)
    }
  }
  return res.join('').replace(/^0+/, '') || '0'
}

function argLiteral(s) {
  return JSON.stringify(s)
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

function toTest(pair) {
  const [a, b] = pair
  const viaBig = oracleMultiplyStrings(a, b)
  const viaArray = gradeSchoolMultiply(a, b)
  if (viaBig !== viaArray) throw new Error('oracle disagreement on "' + a + '"*"' + b + '": ' + viaArray + ' vs ' + viaBig)
  return { args: [argLiteral(a), argLiteral(b)], expected: JSON.stringify(viaBig) }
}

function buildVariant({ id, seedLabel, intent, title, statement, pairs, hints }) {
  const tests = pairs
    .map(toTest)
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
    examples: [{ input: inputLine(first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: hints.slice(0, 2),
  }
}

/* ---------------- entry point ---------------- */

export function buildMultiplyStringsPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh numbers',
      intent: INTENT_SAME,
      title: 'Multiply Strings — fresh numbers (same-task drill)',
      statement:
        'Given two non-negative integers num1 and num2 as decimal strings, return their product as a decimal string without using BigInteger or direct integer conversion. ' +
        'Fresh 1-3 digit inputs below exercise the same per-pair place-and-carry reasoning as the official examples. ' +
        'Strip leading zeros when rendering but keep "0" for the all-zero result. ' +
        'The signature and exact comparison are unchanged.',
      pairs: [
        ['2', '3'],
        ['14', '25'],
        ['98', '76'],
        ['123', '45'],
      ],
      hints: [
        'Accumulate each pair num1[i]*num2[j] into res[i+j+1], carrying sum/10 into res[i+j].',
        'Strip leading zeros only when rendering; keep "0" when every slot is zero.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Multiply Strings — edge cases (same-task drill)',
      statement:
        'Same string-product task on the boundary inputs the examples hide: a multi-digit official example, zero factors, the identity factor "1", and powers of ten. ' +
        'Return the exact product string with no leading zeros. ' +
        'A zero operand short-circuits to "0" before any digit work. ' +
        'The signature and exact comparison are unchanged.',
      pairs: [
        ['123', '456'],
        ['0', '0'],
        ['0', '12345'],
        ['1', '99999'],
        ['1000', '1000'],
      ],
      hints: [
        'Fast-path any "0" operand to "0" before allocating the digit array.',
        '"1" must return the other operand unchanged; powers of ten only shift zeros.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial shapes',
      intent: INTENT_ADVERSARIAL,
      title: 'Multiply Strings — adversarial shapes (same-task drill)',
      statement:
        'Same string-product question with inputs that punish dropped carries: all-9 factors with maximal carry chains and asymmetric long pairs. ' +
        'The task, signature, output type, and exact-match mode are identical — only the digit shapes are harder. ' +
        'Use += for the carry into res[p1] because repeated pairs hit the same slot many times. ' +
        'Labelled honestly as same-task: no twist changing the output type.',
      pairs: [
        ['999', '999'],
        ['9999', '9999'],
        ['123456789', '987654321'],
        ['99999', '99999'],
      ],
      hints: [
        'Use += for the carry into res[p1]: repeated pairs hit the same slot many times.',
        'Cross-check 999*999=998001 by hand: the middle digits come only from accumulated carries.',
      ],
    }),
  ]
}

// Staged-compat alias: same builder, family-style name.
export const buildPracticeVariants = buildMultiplyStringsPractice
export const buildMultiplyStringsVariants = buildMultiplyStringsPractice

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oracleMultiplyStrings (native BigInt multiply; walkthrough uses single-array place-and-carry loop)',
})

export default buildMultiplyStringsPractice
