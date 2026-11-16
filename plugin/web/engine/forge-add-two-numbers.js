/**
 * add-two-numbers — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `add-two-numbers`
 * (Add Two Numbers, Medium). Judgeable YES: the live record
 * (plugin/data/shard-5.json, problem 2) carries judge tests with signature
 *   addTwoNumbers(l1: ListNode, l2: ListNode) -> ListNode, mode exact,
 * and the forge `SIGNATURE` below equals that live judge signature exactly.
 * Every expected value is computed at build time by oracleAdd below (BigInt
 * place-value arithmetic — no carry loop, no shared code with the
 * walkthrough's digit-wise trace), so producer/validator never share code.
 *
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs (curated + the staged seed-200807 generated case per set,
 * resolved to literals for stability); the first test of each set is a verbatim
 * official shard example. All values respect the statement guarantees
 * (digits 0..9, non-empty, no leading zeros except the number 0 itself).
 *
 * Staged source: .workers/jobs/question-owners-150/add-two-numbers/practice.js
 * (signature, oracle, curated sets); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw literal strings; `expected` is the literal the judge compares.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from tests[0].
 * - `mode` is 'exact'. `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'add-two-numbers'
export const SIGNATURE = Object.freeze({
  name: 'addTwoNumbers',
  params: Object.freeze([{ name: 'l1', type: 'ListNode' }, { name: 'l2', type: 'ListNode' }]),
  return: 'ListNode',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same task, fresh digit combinations so you reproduce the carry-loop reasoning.'
export const INTENT_EDGE = 'Same task with the zeros, singles, and uneven short lengths the statement allows.'
export const INTENT_ADVERSARIAL = 'Same task with long carry ripples and uneven lengths that punish dropped-carry models.'

/** INDEPENDENT oracle: BigInt place-value sum. No carry loop, no shared code. */
export function oracleAdd(a, b) {
  const num = (ds) => ds.reduce((acc, d, i) => acc + BigInt(d) * 10n ** BigInt(i), 0n)
  let s = num(a) + num(b)
  if (s === 0n) return [0]
  const out = []
  while (s > 0n) {
    out.push(Number(s % 10n))
    s /= 10n
  }
  return out
}

export const fmt = (ds) => '[' + ds.join(',') + ']'

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

function buildVariant({ id, seedLabel, intent, title, statement, pairs, hints }) {
  const tests = pairs
    .map(([a, b]) => ({ args: [fmt(a), fmt(b)], expected: fmt(oracleAdd(a, b)) }))
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

export function buildAddTwoNumbersPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh carry chains',
      intent: INTENT_SAME,
      title: 'Add Two Numbers — Fresh Carry Chains (same task)',
      statement:
        'Add reversed-digit lists position by position with a running carry, exactly like paper addition. Fresh digit combinations exercise carry creation and propagation, including a multi-digit ripple. The signature and exact comparison are unchanged.',
      pairs: [
        [[2, 4, 3], [5, 6, 4]],
        [[9, 9, 9], [1]],
        [[1, 8], [0]],
        [[5], [5]],
        [[0, 8, 4], [1, 5, 5]],
      ],
      hints: [
        'Walk both lists together; an exhausted list contributes 0 at that position.',
        'Keep looping while carry is nonzero even after both lists end.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge zeros singles',
      intent: INTENT_EDGE,
      title: 'Add Two Numbers — Edge Zeros and Singles (same task)',
      statement:
        'Same addition task on boundary inputs: zeros, single nodes, and uneven short lengths. [0] + [0] must return the single node [0], never an empty list. The signature and exact comparison are unchanged.',
      pairs: [
        [[0], [0]],
        [[9], [9]],
        [[9, 9], [1]],
        [[1, 0, 1], [9, 9]],
        [[2], [9, 2]],
      ],
      hints: [
        '[0] + [0] must return a single node [0], never an empty list.',
        'A digit 9 plus anything >= 1 always flips that position to (sum % 10) with carry 1.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial long carry',
      intent: INTENT_ADVERSARIAL,
      title: 'Add Two Numbers — Adversarial Long Carry (transfer)',
      statement:
        'SAME TASK, harder shape: a carry can ripple through every remaining 9, and unequal lengths hide implicit leading zeros on the shorter number. Only the loop condition (l1 || l2 || carry) catches the final carry. No rule change: the signature and exact comparison are unchanged.',
      pairs: [
        [[9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9]],
        [[9, 9, 9, 9, 9], [9, 9, 9, 9, 9]],
        [[9, 9, 9, 9, 9, 9, 9, 9, 9, 9], [1]],
        [[9, 8, 7], [6, 5, 4]],
        [[4, 0, 9, 4, 3, 5], [0, 5, 1, 8, 7, 4, 8, 7]],
      ],
      hints: [
        'A carry can ripple through every remaining 9; only the loop condition (l1 || l2 || carry) catches the final one.',
        'Unequal lengths are just implicit leading zeros on the shorter number.',
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
  oracle: 'oracleAdd (BigInt place-value; frame emitter uses the digit-wise carry loop)',
})
