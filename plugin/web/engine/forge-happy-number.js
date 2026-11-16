/**
 * happy-number — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `happy-number`
 * (Happy Number, Easy, isHappy(int)->boolean, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * happyNumberOracle below (Floyd slow/fast pointers, O(1) space), an
 * INDEPENDENT implementation of the same operation (not the walkthrough's
 * HashSet history emitter). Staged cross-check oracle oracleSetIsHappy
 * (HashSet history, same as the walkthrough) verifies agreement at build
 * time but never decides the literal.
 *
 * Staged source: .workers/jobs/question-owners-150/happy-number/happy-number.variants.js
 * (statements, hints, set-vs-floyd oracles) — reshaped into the forge variant
 * contract (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * All three sets are the SAME task (no rule change): identical signature,
 * identical question — v3 is adversarial same-task chains only.
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

export const SLUG = 'happy-number'
export const SIGNATURE = Object.freeze({
  name: 'isHappy',
  params: Object.freeze([{ name: 'n', type: 'int' }]),
  return: 'boolean',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Easy'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial chains that punish step-count shortcuts.'

/**
 * INDEPENDENT oracle: Floyd slow/fast pointers (O(1) space).
 * No seen set, no history array — a different method from the walkthrough
 * (which records every value in a HashSet and stops on a repeat).
 */
export function happyNumberOracle(n) {
  if (!Number.isInteger(n) || n < 1) return false
  const step = (v) => {
    let s = 0
    let r = v
    while (r > 0) {
      const d = r % 10
      s += d * d
      r = Math.floor(r / 10)
    }
    return s
  }
  let slow = n
  let fast = step(n)
  let guard = 0
  while (fast !== 1 && slow !== fast) {
    slow = step(slow)
    fast = step(step(fast))
    guard += 1
    if (guard > 1000) return false
  }
  return fast === 1 || slow === 1
}

/** Staged cross-check oracle (HashSet history, same method as walkthrough). */
export function oracleSetIsHappy(n) {
  if (!Number.isInteger(n) || n < 1) return false
  const seen = new Set()
  let cur = n
  let guard = 0
  while (cur !== 1 && !seen.has(cur)) {
    seen.add(cur)
    let sum = 0
    let rest = cur
    while (rest > 0) {
      const d = rest % 10
      sum += d * d
      rest = Math.floor(rest / 10)
    }
    cur = sum
    guard += 1
    if (guard > 1000) return false
  }
  return cur === 1
}

function makeCase(n) {
  const a = happyNumberOracle(n)
  const b = oracleSetIsHappy(n)
  if (a !== b) throw new Error('Oracles disagree on n = ' + n)
  return { args: [String(n)], expected: a ? 'true' : 'false' }
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

function buildVariant({ id, seedLabel, intent, title, statement, inputs, hints }) {
  const tests = inputs.map(makeCase).slice(0, 5)
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

export function buildHappyNumberVariants() {
  const v1 = buildVariant({
    id: 'v1',
    seedLabel: 'fresh values',
    intent: INTENT_SAME,
    title: 'Happy Number — fresh values (chain drill)',
    statement:
      'Same task as the original: given an integer n, return true if n is happy and false otherwise. ' +
      'A happy number replaces n by the sum of the squares of its digits until it reaches 1; a repeat means a cycle. ' +
      'These fresh inputs mix happy and unhappy numbers with multi-link chains.',
    inputs: [7, 11, 28, 44],
    hints: [
      'Work one link at a time: square each decimal digit of the current value and add them up.',
      'Stop as soon as a value repeats: the repeat proves a cycle, so the answer is false.',
    ],
  })

  const v2 = buildVariant({
    id: 'v2',
    seedLabel: 'edge cases',
    intent: INTENT_EDGE,
    title: 'Happy Number — edge cases (chain drill)',
    statement:
      'Same happy-number task with boundary inputs: the minimum n = 1 is already happy, and n = 4 is the entry point of the unhappy cycle. ' +
      'The round number n = 100 and the 32-bit maximum n = 2147483647 exercise short and long first links. ' +
      'Return true only when the digit-square chain reaches 1.',
    inputs: [1, 4, 100, 2147483647],
    hints: [
      'n = 1 needs no digit step at all: the loop guard already reports happy.',
      'The large input drops below 1000 after the first link, so just run the short chain to the end.',
    ],
  })

  // Same-task adversarial set: members and neighbours of the classic unhappy
  // cycle plus long happy chains through 100 and 130. Same signature and
  // question — only the stopping rule (1 vs repeat) gives the right answer.
  const v3 = buildVariant({
    id: 'v3',
    seedLabel: 'same-task adversarial chains',
    intent: INTENT_ADVERSARIAL,
    title: 'Happy Number — same-task adversarial chains (chain drill)',
    statement:
      'SAME TASK, no rule change: return true exactly when the digit-square chain of n reaches 1. ' +
      'These inputs sit on or beside the classic unhappy cycle (89, 145, 42, 20, 4) and on long happy chains through 130 and 100. ' +
      'Guessing from chain length alone fails; only the 1-vs-repeat stopping rule gives the right answer.',
    inputs: [89, 68, 82, 97],
    hints: [
      '89 is a member of the unhappy cycle: run it and watch 89, 145, 42, 20, 4 close the loop.',
      '68, 82 and 97 all pass through 100 on their way to 1; a solver that stops early calls them wrongly.',
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
  oracle: 'happyNumberOracle (Floyd slow/fast pointers, O(1) space; walkthrough uses HashSet history)',
})
