/**
 * merge-k-sorted-lists — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `merge-k-sorted-lists`
 * (Merge k Sorted Lists, Hard). The live LeetCode signature uses ListNode[]
 * which the repo judge cannot execute; the forge therefore documents an honest
 * integer-array TEST PROFILE (mergeKLists(int[][])->int[]) where each inner
 * array is one sorted list and the output is the fully merged sorted array.
 * Every expected value is computed at build time by solveOracle below
 * (flatten + numeric sort), an algorithm DISTINCT from the walkthrough's
 * min-heap k-way merge, so producer/validator never share code.
 *
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 *
 * Staged source: .workers/jobs/question-owners-150/merge-k-sorted-lists/practice.js
 * (inputs, oracle, hints); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the documented test profile (judge-null record: no preserved
 *   official signature exists; the forge asserts a well-formed test signature).
 * - `args` are raw literal strings; `expected` is the literal the judge compares.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from tests[0].
 * - `mode` is 'exact'. `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'merge-k-sorted-lists'
export const SIGNATURE = Object.freeze({
  name: 'mergeKLists',
  params: Object.freeze([{ name: 'lists', type: 'int[][]' }]),
  return: 'int[]',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Hard'

export const INTENT_SAME = 'Same k-way merge on fresh sorted lists so you reproduce the heap-frontier reasoning.'
export const INTENT_EDGE = 'Same task with the empties-and-duplicates edges the worked example hides.'
export const INTENT_ADVERSARIAL = 'Same task with uneven, negative-heavy lists that punish push-everything models.'

/** INDEPENDENT oracle: flatten + numeric sort. O(N log N), obviously correct. */
export function solveOracle(lists) {
  const flat = []
  for (const row of lists) for (const v of row) flat.push(v)
  flat.sort((a, b) => a - b)
  return flat
}

const fmtLists = (lists) => '[' + lists.map((r) => '[' + r.join(',') + ']').join(',') + ']'
const fmtFlat = (flat) => '[' + flat.join(',') + ']'

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

function buildVariant({ id, seedLabel, intent, title, statement, listsList, hints }) {
  const tests = listsList
    .map((lists) => ({ args: [fmtLists(lists)], expected: fmtFlat(solveOracle(lists)) }))
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

export function buildMergeKPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh lists',
      intent: INTENT_SAME,
      title: 'Merge k Sorted Lists — Fresh Lists (same task)',
      statement:
        'Run the same min-heap k-way merge on new sorted inputs. The first test is the official example (kept as an anchor so the walkthrough and practice agree); the rest are fresh generated rows of small integers. Push only the head of each non-empty list, then repeatedly pop the heap minimum, append it, and advance that list. The signature and exact comparison are unchanged.',
      listsList: [
        [[1, 4, 5], [1, 3, 4], [2, 6]],
        [[-9, -4, 0, 7], [-5, -5, 3], [1, 2, 8, 9]],
        [[0], [0, 0], [-1, 1]],
        [[3, 5, 7, 9], [2, 4], [6, 8, 10]],
      ],
      hints: [
        'Push only the head of each non-empty list: the heap holds at most k entries.',
        'Pop the heap min N times; each pop appends one output and pushes at most one successor.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Merge k Sorted Lists — Empties and Duplicates (same task)',
      statement:
        'Same k-way merge on boundary inputs: empty lists contribute no heap entry, singletons merge trivially, and heavy duplicates tie safely. The official example is never reused. No rule change.',
      listsList: [
        [[], [1], [], [1, 1, 2], [0]],
        [[], [], []],
        [[5]],
        [[], [2, 2, 2]],
      ],
      hints: [
        'Skip null heads when seeding the heap: empty lists never enter the frontier.',
        'Duplicates need no special order: identical values are interchangeable in the output.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial uneven',
      intent: INTENT_ADVERSARIAL,
      title: 'Merge k Sorted Lists — Negatives and Uneven Lengths (transfer)',
      statement:
        'SAME TASK, harder shape: lists have very uneven lengths and negative values, plus one empty list. The heap still holds at most k entries no matter how uneven the lists are. No rule change: the signature and exact comparison are unchanged.',
      listsList: [
        [[-100, -20, 5, 60, 99], [], [-50, -50, 0]],
        [[-8, -8, -8, -8, -8, -8, -8, -8], [100], []],
        [[-3, 7], [-2], [-1], [0], [1, 2, 3, 4, 5]],
        [[10, 20], [], [15]],
      ],
      hints: [
        'Negatives compare normally: the heap orders by value with no offset needed.',
        'Pushing all N nodes at once is O(N log N); pushing only heads keeps O(N log k).',
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
  oracle: 'solveOracle (flatten + numeric sort; min-heap k-way merge used only in walkthrough)',
})
