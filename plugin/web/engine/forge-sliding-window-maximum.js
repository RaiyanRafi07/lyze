/**
 * sliding-window-maximum — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `sliding-window-maximum`
 * (Sliding Window Maximum, Hard, maxSlidingWindow(int[],int)->int[], mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * slidingWindowMaximumOracle below (brute-force window scan, O(n*k)), an
 * INDEPENDENT implementation of the same operation (not the walkthrough's
 * O(n) monotonic-deque frame emitter), so adapter/oracle bugs cannot
 * silently agree.
 *
 * Staged source: .workers/jobs/neetcode150-completion/sliding-window-maximum/sliding-window-maximum.practice.js
 * (statements, hints, oracle) and .workers/jobs/question-owners-150/sliding-window-maximum/
 * (verified edge/adversarial sets); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against ('[3,3,5,5,6,7]').
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (ordered integer-array answers).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'sliding-window-maximum'

export const SIGNATURE = Object.freeze({
  name: 'maxSlidingWindow',
  params: Object.freeze([{ name: 'nums', type: 'int[]' }, { name: 'k', type: 'int' }]),
  return: 'int[]',
})

export const MODE = 'exact'
export const DIFFICULTY = 'Hard'

export const INTENT_SAME = 'Same window rule on fresh numbers so you reproduce the deque reasoning.'
export const INTENT_EDGE = 'Same task with the boundary shapes the worked example hides.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial shapes: the rule and output type are unchanged.'

/** INDEPENDENT reference oracle: brute-force scan of every window. O(n*k). */
export function slidingWindowMaximumOracle(nums, k) {
  const out = []
  for (let s = 0; s + k <= nums.length; s++) {
    let m = nums[s]
    for (let j = s + 1; j < s + k; j++) if (nums[j] > m) m = nums[j]
    out.push(m)
  }
  return out
}

const numsLiteral = (nums) => '[' + nums.join(',') + ']'
const intLiteral = (k) => String(k)

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

function toTest(nums, k) {
  return { args: [numsLiteral(nums), intLiteral(k)], expected: numsLiteral(slidingWindowMaximumOracle(nums, k)) }
}

function buildVariant({ id, seedLabel, intent, title, statement, pairs, hints }) {
  const tests = pairs
    .map(([nums, k]) => toTest(nums, k))
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

export function buildSlidingWindowPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh windows',
      intent: INTENT_SAME,
      title: 'Sliding Window Maximum — Fresh Windows (same task)',
      statement:
        'You are given an integer array nums and a window size k. The window slides from the very left to the very right, one step at a time. Return the maximum inside each window as an integer array of length nums.length - k + 1. These fresh inputs use small hand-checkable numbers with mixed signs.',
      pairs: [
        [[1, 3, -1, -3, 5, 3, 6, 7], 3],
        [[4, 1, 7, 2, 9, -3, 6, 0], 3],
        [[-5, 2, 8, -1, 4, 4, 0, -2], 4],
        [[9, 3, 5, 1, 7, 2, 8, 6], 2],
      ],
      hints: [
        'Keep candidate indices in a deque with decreasing values; the head is the current maximum.',
        'Expire the head when it leaves the window, and pop tails smaller than the new value.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Sliding Window Maximum — Edge Cases (same task)',
      statement:
        'Same sliding-maximum task on the boundary inputs: a single element, k = 1 (answer equals nums), k = n (one window), all-equal values, and all-negative values. No rule change; the signature and exact comparison are unchanged.',
      pairs: [
        [[1], 1],
        [[9, 8, 7, 6], 1],
        [[5, 4, 3], 3],
        [[2, 2, 2, 2], 2],
        [[-4, -1, -3], 3],
      ],
      hints: [
        'With k = 1 every element is its own window maximum; with k = n there is exactly one window.',
        'Equal values must keep the earlier index (strict < prune) so expiry order stays correct.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial shapes',
      intent: INTENT_ADVERSARIAL,
      title: 'Sliding Window Maximum — Adversarial Shapes (same task)',
      statement:
        'Same sliding-maximum task, no rule change: alternating peaks, plateaus broken by one spike, ties sitting exactly on window borders, and signs that flip. Return the maximum of each window as an integer array.',
      pairs: [
        [[1, 5, 1, 5, 1, 5], 2],
        [[3, 3, 3, 9, 3, 3], 3],
        [[7, 2, 7, 2, 7], 3],
        [[-2, 8, -8, 8, -1], 2],
      ],
      hints: [
        'A tie across the border is decided by expiry, not by value: the head leaves exactly when its index falls out.',
        'Trace the deque (not just the answer) on the sawtooth case to see prune and expire alternate.',
      ],
    }),
  ]
}

// Staged-compat alias: same builder, family-style name.
export const buildPracticeVariants = buildSlidingWindowPractice

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'slidingWindowMaximumOracle (brute-force window scan O(n*k); frame emitter uses the monotonic deque)',
})

export default buildSlidingWindowPractice
