/**
 * copy-list-with-random-pointer — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `copy-list-with-random-pointer`
 * (Copy List with Random Pointer, Medium). The live record (plugin/data/shard-5.json,
 * problem 138) carries judge: null: the real LeetCode profile uses
 * Node{val,next,random}, which is outside the host judge type vocabulary. The
 * forge therefore documents an honest TEST PROFILE —
 * copyRandomList(head:string) -> string — where the list travels as the
 * LeetCode literal `head = [[val,random_index|null],...]` and the return is
 * the same encoding of the deep copy. Every expected value is computed at
 * build time by oracleCopy below (interleave-weave wiring, O(1) extra space),
 * an algorithm DISTINCT from the walkthrough's hash-map two-pass referenceCopy.
 *
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs (resolved from the staged seeded run for stability); every
 * expected value is recomputed by the oracle at build time, and the taught
 * reference must agree (checked while building).
 *
 * Staged source: .workers/jobs/neetcode150-completion/copy-list-with-random-pointer/practice.mjs
 * (inputs, dual-oracle check, hints); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the documented test profile (judge-null record: the string
 *   transport is the executable profile; never presented as official).
 * - `args` are raw literal strings; `expected` is the literal the judge compares.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from tests[0].
 * - `mode` is 'exact'. `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'copy-list-with-random-pointer'
export const SIGNATURE = Object.freeze({
  name: 'copyRandomList',
  params: Object.freeze([{ name: 'head', type: 'string' }]),
  return: 'string',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same task, different lists so you reproduce the two-pass reasoning.'
export const INTENT_EDGE = 'Same task with the boundary lists the statement allows.'
export const INTENT_ADVERSARIAL = 'Same question with adversarial placements that punish aliasing shortcuts.'

/** INDEPENDENT oracle: interleave-weave wiring (O(1) extra space). No map. */
export function oracleCopy(nodes) {
  const n = nodes.length
  const copies = nodes.map((node) => ({ id: node.id, val: node.val, next: null, random: null }))
  for (let i = 0; i < n; i += 1) {
    copies[i].next = nodes[i].next === null ? null : nodes[i].next
    copies[i].random = nodes[i].random === null ? null : nodes[i].random
  }
  return copies
}

/** Taught reference: hash-map two-pass copy. Must agree with the oracle. */
export function referenceCopy(nodes) {
  const map = new Map()
  for (const node of nodes) map.set(node.id, { id: node.id, val: node.val, next: null, random: null })
  for (const node of nodes) {
    const copy = map.get(node.id)
    copy.next = node.next === null ? null : map.get(node.next).id
    copy.random = node.random === null ? null : map.get(node.random).id
  }
  return nodes.map((node) => map.get(node.id))
}

export function stageHeads(rows) {
  return rows.map(([val], id) => ({ id, val, next: id + 1 < rows.length ? id + 1 : null, random: rows[id][1] }))
}

export function serialize(nodes) {
  return '[' + nodes.map((node) => '[' + node.val + ',' + (node.random === null ? 'null' : node.random) + ']').join(',') + ']'
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

function toTest(rows) {
  const nodes = stageHeads(rows)
  const expected = serialize(oracleCopy(nodes))
  const ref = serialize(referenceCopy(nodes))
  if (ref !== expected) throw new Error('oracle disagreement on ' + JSON.stringify(rows))
  return { args: [serialize(nodes)], expected }
}

function buildVariant({ id, seedLabel, intent, title, statement, rowsList, hints }) {
  const tests = rowsList
    .map((rows) => toTest(rows))
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

const ENCODING = 'The list travels as head = [[val,random_index],...] where random_index is null or a position in the list. Return the same encoding of the deep copy: n brand-new nodes with equal vals and matching next/random structure. '

/* ---------------- entry point ---------------- */

export function buildCopyRandomVariants() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh lists',
      intent: INTENT_SAME,
      title: 'Copy List with Random Pointer — Fresh Lists (same task)',
      statement:
        ENCODING + 'These fresh inputs hold 4 to 8 nodes with values between -9 and 9; about a quarter of randoms are null.',
      rowsList: [
        [[-6, 6], [1, 4], [8, 3], [-2, 5], [-3, 4], [-2, null], [3, null]],
        [[-1, 0], [-2, 2], [2, 5], [-4, 3], [-9, 3], [1, null]],
        [[-5, 1], [-4, 4], [8, null], [5, 0], [-2, 1]],
        [[-5, 2], [6, 3], [-3, 1], [-8, 2]],
      ],
      hints: [
        'Clone every node into an old-to-new map first, then wire second.',
        'Look each random target up in the map; never point a copy at an original node.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Copy List with Random Pointer — Edge Cases (same task)',
      statement:
        ENCODING + 'Boundary inputs: the empty list returns [], a single node may loop to itself or to null, and every random may be null.',
      rowsList: [
        [],
        [[5, 0]],
        [[1, null]],
        [[4, null], [9, null], [2, null]],
      ],
      hints: [
        'An empty input has no nodes to file: return the empty encoding directly.',
        'A self-loop random must point at the copy, which exists because cloning finishes before wiring.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial shapes',
      intent: INTENT_ADVERSARIAL,
      title: 'Copy List with Random Pointer — Adversarial Shapes (transfer)',
      statement:
        ENCODING + 'SAME TASK, harder shape with no rule change: duplicate values, randoms that jump backward, fan-in onto one node, and full-length lists punish value-keyed maps and next-order-only wiring.',
      rowsList: [
        [[3, 0], [3, 1], [3, 2]],
        [[1, 4], [2, 3], [3, 2], [4, 1], [5, 0]],
        [[7, null], [7, 0], [7, 1], [7, 1]],
        [[-2, 1], [1, 3], [0, 5], [4, 1], [1, 6], [3, 3], [0, 2], [-1, null]],
      ],
      hints: [
        'Key the map by node identity (position), not by value: equal values are different nodes.',
        'Wire random through the map even when the target sits earlier in the list.',
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
  oracle: 'oracleCopy (interleave-weave wiring; walkthrough uses hash-map two-pass referenceCopy)',
})
