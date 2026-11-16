/**
 * reverse-nodes-in-k-group — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `reverse-nodes-in-k-group`
 * (Reverse Nodes in k-Group, Hard, reverseKGroup(ListNode,int)->ListNode, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * oracleReverseKGroup below (pure array chunk reversal, no pointers), an
 * INDEPENDENT implementation of the same operation (not the walkthrough's
 * dummy + seam + in-place link-flip frame emitter).
 *
 * Staged source: .workers/jobs/question-owners-150/reverse-nodes-in-k-group/practice.js
 * (drills A/B/C, oracle) + .workers/jobs/neetcode150-completion/reverse-nodes-in-k-group/;
 * reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * v1 replays the two sourced shard examples first, then two generated same-task
 * cases (3–5 tests each is required, so the pair alone is not enough).
 * All three sets are the SAME task (no output-type twist).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (result list deep-equals expected list).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'reverse-nodes-in-k-group'
export const SIGNATURE = Object.freeze({
  name: 'reverseKGroup',
  params: Object.freeze([
    { name: 'head', type: 'ListNode' },
    { name: 'k', type: 'int' },
  ]),
  return: 'ListNode',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Hard'

export const INTENT_SAME = 'Same task, different numbers so you reproduce the probe-then-flip reasoning.'
export const INTENT_EDGE = 'Same task with the edge cases the worked examples hide.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial shapes: longer lists and duplicate values that punish value-based thinking.'

/**
 * INDEPENDENT oracle: pure chunk reversal on a value array (no pointers).
 * Splits values into blocks of k, reverses full blocks, keeps a short tail.
 * Different method from the walkthrough (dummy + seam + in-place link flips).
 */
export function oracleReverseKGroup(values, k) {
  const out = values.slice()
  for (let s = 0; s + k <= out.length; s += k) {
    for (let a = s, b = s + k - 1; a < b; a++, b--) {
      const t = out[a]
      out[a] = out[b]
      out[b] = t
    }
  }
  return out
}

const lit = (arr) => JSON.stringify(arr)

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

function makeCase(values, k) {
  return { args: [lit(values), String(k)], expected: lit(oracleReverseKGroup(values, k)) }
}

function buildVariant({ id, seedLabel, intent, title, statement, cases, hints }) {
  const tests = cases
    .map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
    .slice(0, 5)
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

export function buildReverseKGroupVariants() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'sourced + fresh',
      intent: INTENT_SAME,
      title: 'Reverse Nodes in k-Group — sourced + fresh (same task)',
      statement:
        'Given the head of a linked list, reverse the nodes of the list k at a time, and return the head of the modified list. If the number of nodes is not a multiple of k, the leftover nodes stay as they are and must not be reversed. The first two inputs below are the official examples; the next two are fresh same-task numbers.',
      cases: [
        // Sourced shard examples, verbatim and in order.
        { args: ['[1,2,3,4,5]', '2'], expected: '[2,1,4,3,5]' },
        { args: ['[1,2,3,4,5]', '3'], expected: '[3,2,1,4,5]' },
        // Generated same-task additions (expected by the oracle at build time).
        makeCase([1, 2, 3, 4, 5, 6], 2),
        makeCase([5, 4, 3, 2, 1], 2),
      ],
      hints: [
        'Probe k nodes BEFORE flipping anything: if the kth link is missing, leave the tail exactly as it is.',
        'Seed each group flip with prev = groupNext (not null), then link groupPrev.next to kth.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Reverse Nodes in k-Group — edge cases (same task)',
      statement:
        'Same k-group reversal task on the boundary inputs the examples hide. k = 1 is always a no-op, a single node never moves, an exact multiple leaves no tail, and k = n flips the whole list with groupNext null. The signature and exact comparison are unchanged.',
      cases: [
        makeCase([1, 2, 3], 1),
        makeCase([7], 1),
        makeCase([1, 2, 3, 4], 2),
        makeCase([1, 2, 3], 3),
      ],
      hints: [
        'k = 1 must return the identical list: check your probe lands kth on the first node without disturbing links.',
        'k = n exercises groupNext = null: the seeded prev = null path must still reconnect dummy.next to kth.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial groups',
      intent: INTENT_ADVERSARIAL,
      title: 'Reverse Nodes in k-Group — adversarial groups (same task)',
      statement:
        'SAME TASK, harder shapes: two full groups plus a short tail, a descending list with a 1-node tail, and duplicate boundary values that expose value-vs-identity bugs. Track node identity, never values: only next pointers move. Identical signature and question — only the numbers fight back.',
      cases: [
        makeCase([1, 2, 3, 4, 5, 6, 7, 8], 3),
        makeCase([9, 8, 7, 6, 5, 4, 3, 2, 1], 4),
        makeCase([0, 0, 1000, 1000, 0, 0], 2),
        makeCase([5, 4, 3, 2, 1], 5),
      ],
      hints: [
        'Track node identity, not values: the duplicates case passes only if links (not values) move.',
        'The 1-node tail case fails if your probe counts the seam node as part of the group.',
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
  oracle: 'oracleReverseKGroup (pure array chunk reversal; walkthrough uses dummy + seam + in-place link flips)',
})
