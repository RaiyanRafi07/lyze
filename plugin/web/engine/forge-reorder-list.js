/**
 * reorder-list — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `reorder-list`
 * (Reorder List, Medium, LC 143). The live LeetCode record keeps judge:null
 * (plugin/data/shard-5.json problem 143): the real method is
 * `reorderList(ListNode head) -> void`, an in-place rewiring with no return
 * value, so there is no judge-comparable literal. The forge therefore
 * documents the same honest staged TEST PROFILE the staged practice module
 * uses (precedents: mergeKLists(int[][])->int[], runTrieOps(string[],string[])->string):
 *
 *   reorderList(head: int[]) -> int[]
 *
 * args[0] is the head transported as an int[] literal; the expected value is
 * the chain of values read from head after the in-place reorder, compared
 * exactly (mode 'exact'). Every expected value is computed at build time by
 * reorderChainOracle below (split / reverse / zip on plain value arrays), an
 * algorithm DISTINCT from the walkthrough's pointer rewiring (slow/fast
 * middle search, in-place tail reversal, saved-successor weave), so
 * producer/validator share no code path and agreement validates the
 * walkthrough rather than repeating it.
 *
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; all respect the judge constraints (n >= 1, 1 <= val <= 1000).
 *
 * Staged source: .workers/jobs/question-owners-150/reorder-list/practice.js
 * (statements, hints, index-permutation oracle); reshaped into the forge variant
 * contract (id/seedLabel/intent/difficulty/title/statement/signature/examples/
 * tests/mode/hints). Expected literals re-verified against the oracle at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the documented test profile (judge-null record: no official
 *   single-call literal signature exists to preserve).
 * - `args` are raw literal strings; `expected` is the literal compared exactly.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from tests[0].
 * - `mode` is 'exact'. `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'reorder-list'
export const SIGNATURE = Object.freeze({
  name: 'reorderList',
  params: Object.freeze([{ name: 'head', type: 'int[]' }]),
  return: 'int[]',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same in-place weave on fresh lists so you reproduce the split-reverse-weave reasoning.'
export const INTENT_EDGE = 'Same task on the smallest judge-valid lists the worked examples hide.'
export const INTENT_ADVERSARIAL = 'Same task on duplicate-heavy lists where only node identity proves the weave.'

/**
 * INDEPENDENT oracle: split / reverse / zip on plain value arrays.
 * first = values[0..ceil(n/2)), tail = values[ceil(n/2)..] reversed, then
 * zip first[i], tail[i]. No ListNode simulation, no slow/fast pointers, no
 * link rewiring — a different method from the walkthrough's in-place pointer
 * weave, so agreement between the two validates the walkthrough.
 */
export function reorderChainOracle(values) {
  if (!Array.isArray(values)) throw new Error('head must be an array')
  const n = values.length
  const mid = Math.ceil(n / 2)
  const first = values.slice(0, mid)
  const tail = values.slice(mid).reverse()
  const out = []
  for (let i = 0; i < first.length; i++) {
    out.push(first[i])
    if (i < tail.length) out.push(tail[i])
  }
  return out
}

const lit = (value) => JSON.stringify(value)

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

function buildVariant({ id, seedLabel, intent, title, statement, heads, hints }) {
  const tests = heads
    .map((head) => ({ args: [lit(head)], expected: lit(reorderChainOracle(head)) }))
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

export function buildReorderPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh even weave',
      intent: INTENT_SAME,
      title: 'Reorder List — Fresh Weave (same task)',
      statement:
        'Reorder the given head in place to L0,Ln,L1,Ln-1,… by splitting at the middle, reversing the tail half, then weaving front and tail nodes alternately. Values never move; only next pointers change, and the head identity stays put. The first drill replays the official [1,2,3,4] example, followed by fresh even-length lists. All inputs respect the judge range n>=1 with values in [1,1000].',
      heads: [
        [1, 2, 3, 4],
        [10, 20, 30, 40, 50, 60],
        [5, 1, 4, 2, 8, 7],
        [3, 9, 2, 6, 1, 5],
      ],
      hints: [
        'Split at the middle with slow/fast, reverse the tail half, then weave one tail node after each front node.',
        'Cut slow.next before reversing; save both successors before each weave link or links are lost.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'two-node edge',
      intent: INTENT_EDGE,
      title: 'Reorder List — Minimal Edge (same task)',
      statement:
        'Same in-place weave on the smallest judge-valid lists: a single node and two-node heads where the weave is the identity. The guard and split/reverse path must still run cleanly even though no link visibly changes. Every input satisfies n>=1 with values in [1,1000].',
      heads: [
        [7],
        [4, 9],
        [1000, 1],
      ],
      hints: [
        'slow never advances on n=2; the tail half has length 1 so reversal is a no-op.',
        'Trace the single weave link and confirm the chain is unchanged.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'duplicate stress',
      intent: INTENT_ADVERSARIAL,
      title: 'Reorder List — Duplicates Stress (same task)',
      statement:
        'Same weave on adversarial duplicates where equal values repeat, so only node identity proves the work. Odd lengths leave a true middle node that must end the final chain. All inputs respect the judge range n>=1 with values in [1,1000].',
      heads: [
        [5, 5, 5, 5, 5],
        [2, 2, 2, 2, 2, 2, 2],
        [1, 1, 2, 1, 1],
        [9, 9, 9],
      ],
      hints: [
        'With all values equal, only the link structure proves the weave; check slow/fast landing on odd n.',
        'The middle node must end the final chain; confirm every position is reachable from head.',
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
  oracle: 'reorderChainOracle (split/reverse/zip on plain arrays; walkthrough rewinds pointers via slow-fast + in-place reverse + weave)',
})
