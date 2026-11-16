/**
 * min-stack — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `min-stack`
 * (Min Stack, Medium, LC 155). The live LeetCode record keeps judge:null
 * (a four-method class has no single-call signature), so the forge documents
 * the same honest staged TEST PROFILE the walkthrough adapter uses
 * (precedents: mergeKLists(int[][])->int[], runTrieOps(string[],string[])->string):
 *
 *   MinStack(ops: string[], rows: string[]) -> string
 *
 * args[0] is the op tape literal, args[1] is the per-call argument-rows
 * literal (array of row literals, the judge literal-string format); the
 * expected value is the full JSON result literal compared exactly.
 * Every expected value is computed at build time by oracleStaged below
 * (plain array + full scan per getMin, no mirror stack), an algorithm
 * DISTINCT from the walkthrough's mirrored-stack replay, so
 * producer/validator never share code.
 *
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed tapes; every tape keeps pop/top/getMin on non-empty stacks only
 * (per the problem constraints).
 *
 * Staged source: .workers/jobs/question-owners-150/min-stack/practice.js
 * (tapes, statements, hints, brute oracle); reshaped into the forge variant
 * contract (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the documented test profile (judge-null record: no official
 *   single-call signature exists to preserve).
 * - `args` are raw literal strings; `expected` is the literal compared exactly.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from tests[0].
 * - `mode` is 'exact'. `hints` holds exactly 2 hints per variant.
 */

import { toLiteral as lit } from './execution-profiles.mjs';

export const SLUG = 'min-stack'
export const SIGNATURE = Object.freeze({
  name: 'MinStack',
  params: Object.freeze([{ name: 'ops', type: 'string[]' }, { name: 'rows', type: 'string[]' }]),
  return: 'string',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same op pattern with fresh values so you reproduce the mirror-stack reasoning.'
export const INTENT_EDGE = 'Same task with the duplicate-minima edge the worked example hides.'
export const INTENT_ADVERSARIAL = 'Same task on a longer tape where the minimum drops and climbs back as values pop.'

/**
 * INDEPENDENT oracle: plain data array plus a full scan per getMin.
 * O(n) per getMin — obviously correct, and deliberately NOT the
 * walkthrough's O(1) mirrored-stack replay, so agreement between the two
 * validates the walkthrough rather than repeating it.
 */
export function oracleStaged(ops, rows) {
  const data = []
  const out = []
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]
    const row = rows[i]
    if (op === 'MinStack') out.push(null)
    else if (op === 'push') {
      data.push(row[0])
      out.push(null)
    } else if (op === 'pop') {
      data.pop()
      out.push(null)
    } else if (op === 'top') out.push(data[data.length - 1])
    else if (op === 'getMin') {
      let m = data[0]
      for (let k = 1; k < data.length; k++) if (data[k] < m) m = data[k]
      out.push(m)
    } else throw new Error('unknown op ' + op)
  }
  return out
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

/** A staged test: two literal strings in, one JSON literal out. */
function stagedTest(ops, rows) {
  const expected = lit(oracleStaged(ops, rows))
  return { args: [lit(ops), lit(rows.map((row) => lit(row)))], expected }
}

function buildVariant({ id, seedLabel, intent, title, statement, tapes, hints }) {
  const tests = tapes
    .map(([ops, rows]) => stagedTest(ops, rows))
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

export function buildMinStackPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh values',
      intent: INTENT_SAME,
      title: 'Min Stack — Fresh Values (same task)',
      statement:
        'Replay the same MinStack op pattern as the live example (push x3, getMin, pop, top, getMin) with fresh values including a negative minimum. Every pop, top, and getMin runs on a non-empty stack. The expected result is the full JSON return list compared exactly.',
      tapes: [
        [['MinStack', 'push', 'push', 'push', 'getMin', 'pop', 'top', 'getMin'], [[], [5], [1], [4], [], [], [], []]],
        [['MinStack', 'push', 'push', 'push', 'getMin', 'pop', 'getMin', 'top', 'getMin'], [[], [1], [2], [3], [], [], [], [], []]],
        [['MinStack', 'push', 'getMin', 'top', 'pop', 'push', 'getMin'], [[], [7], [], [], [], [2], []]],
      ],
      hints: [
        'Mirror every push on the mins stack: push the new value when it is <= the current min, else repeat the current min.',
        'Trace the mins stack by hand on [5, 1, 4]: the min answers stay 1 even after 4 is popped.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'duplicate minima',
      intent: INTENT_EDGE,
      title: 'Min Stack — Duplicate Minima (same task)',
      statement:
        'Replay MinStack tapes where equal minima are pushed twice and popped one at a time. GetMin must stay at the duplicate until both copies leave. Every pop, top, and getMin runs on a non-empty stack. The expected result is the full JSON return list compared exactly.',
      tapes: [
        [['MinStack', 'push', 'push', 'getMin', 'pop', 'getMin', 'top'], [[], [2], [2], [], [], [], []]],
        [['MinStack', 'push', 'push', 'push', 'getMin', 'pop', 'getMin', 'pop', 'getMin'], [[], [0], [0], [0], [], [], [], [], []]],
        [['MinStack', 'push', 'pop', 'push', 'push', 'getMin', 'pop', 'getMin'], [[], [5], [], [3], [4], [], [], []]],
        [['MinStack', 'push', 'push', 'push', 'getMin', 'pop', 'top', 'getMin'], [[], [-1], [-2], [-3], [], [], [], []]],
      ],
      hints: [
        'Duplicates are the trap: with pushes [2, 2], one pop must leave getMin at 2 — strict < on push loses the spare minimum.',
        'Pop and push interleave freely, but every top/getMin/pop call in these tests runs on a non-empty stack, per the constraints.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'climbing minima run',
      intent: INTENT_ADVERSARIAL,
      title: 'Min Stack — Longer Run (same task)',
      statement:
        'Replay a longer MinStack tape where the minimum drops and climbs back as values are popped. Simulate both stacks call by call: each pop resurrects the exact previous minimum. Every pop, top, and getMin runs on a non-empty stack, and the expected result is the full JSON return list compared exactly.',
      tapes: [
        [['MinStack', 'push', 'push', 'push', 'getMin', 'top', 'pop', 'getMin', 'push', 'getMin', 'pop', 'pop', 'getMin'], [[], [10], [20], [5], [], [], [], [], [7], [], [], [], []]],
        [['MinStack', 'push', 'push', 'push', 'push', 'push', 'getMin', 'pop', 'getMin', 'pop', 'getMin'], [[], [5], [4], [3], [2], [1], [], [], [], [], []]],
        [['MinStack', 'push', 'getMin', 'push', 'getMin', 'push', 'getMin', 'top'], [[], [8], [], [6], [], [9], [], []]],
      ],
      hints: [
        'Same task, longer tape: simulate both stacks call by call; each pop resurrects the exact previous minimum.',
        'Watch the minimum climb back up as the record lows are popped.',
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
  oracle: 'oracleStaged (plain array + full scan per getMin; walkthrough replays the mirrored-stack reference)',
})
