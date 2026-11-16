/**
 * serialize-and-deserialize-binary-tree — portable standalone practice builder.
 *
 * Produces exactly 3 deterministic variants for slug
 * `serialize-and-deserialize-binary-tree` (Hard). Profile: Codec roundtrip —
 * serialize a tree to a string, deserialize it back, and compare canonical
 * level-order structure (any valid encoding accepted; tests use the
 * roundtripped level-order literal with trailing nulls trimmed, so `expected`
 * is deterministic). Every expected value is computed at build time by
 * oracleRoundtripLevel below (iterative BFS-queue codec), an algorithm
 * DISTINCT from the walkthrough's preorder-with-markers Codec.
 *
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 *
 * Staged source: .workers/jobs/question-owners-150/serialize-and-deserialize-binary-tree/practice.js
 * (inputs, BFS oracle, hints); reshaped into the forge variant contract
 * (id v1/v2/v3, seedLabel, intent, difficulty, title, statement, signature,
 * examples == tests[0], mode, 2 hints).
 */

export const SLUG = 'serialize-and-deserialize-binary-tree'
export const MODE = 'exact'
export const DIFFICULTY = 'Hard'
export const SIGNATURE = Object.freeze({
  name: 'codecRoundtrip',
  params: Object.freeze([{ name: 'root', type: 'TreeNode' }]),
  return: 'TreeNode',
})

export const INTENT_SAME = 'Same Codec roundtrip on fresh seeded trees.'
export const INTENT_EDGE = 'Boundary shapes the original examples hide.'
export const INTENT_ADVERSARIAL = 'Placements that punish marker/order shortcuts.'

function outLiteral(v) {
  if (v === null || v === undefined) return 'null'
  if (Array.isArray(v)) return '[' + v.map(outLiteral).join(',') + ']'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}
function trimLevel(level) {
  const a = level.slice()
  while (a.length && (a[a.length - 1] === null || a[a.length - 1] === undefined)) a.pop()
  return a
}

function bfsBuild(level) {
  // Queue-order build (matches the live judge __mkTree and LeetCode level-order
  // semantics): nodes attach to the FIFO queue of real parents, NOT to heap
  // indices — heap indexing orphans nodes whose heap parent slot is null.
  if (!Array.isArray(level) || !level.length || level[0] === null || level[0] === undefined) return null
  const root = { val: level[0], left: null, right: null }
  const q = [root]
  let i = 1
  while (q.length && i < level.length) {
    const p = q.shift()
    const l = level[i++], r = i < level.length ? level[i++] : null
    if (l !== null && l !== undefined) { p.left = { val: l, left: null, right: null }; q.push(p.left) }
    if (r !== null && r !== undefined) { p.right = { val: r, left: null, right: null }; q.push(p.right) }
  }
  return root
}
function bfsSerialize(root) {
  if (!root) return ''
  const vals = []
  const q = [root]
  while (q.length) {
    const n = q.shift()
    if (!n) { vals.push(null); continue }
    vals.push(n.val)
    q.push(n.left, n.right)
  }
  while (vals.length && vals[vals.length - 1] === null) vals.pop()
  return vals.map((v) => (v === null ? 'null' : String(v))).join(',')
}
function bfsDeserialize(data) {
  if (!data) return null
  const toks = String(data).split(',').map((t) => (t === 'null' ? null : Number(t)))
  if (!toks.length || toks[0] === null) return null
  const root = { val: toks[0], left: null, right: null }
  const q = [root]
  let i = 1
  while (q.length && i < toks.length) {
    const p = q.shift()
    const l = toks[i++], r = i < toks.length ? toks[i++] : null
    if (l !== null && l !== undefined) { p.left = { val: l, left: null, right: null }; q.push(p.left) }
    if (r !== null && r !== undefined) { p.right = { val: r, left: null, right: null }; q.push(p.right) }
  }
  return root
}
function bfsLevelOut(root) {
  if (!root) return []
  const out = []
  const q = [root]
  while (q.length) {
    const n = q.shift()
    if (!n) { out.push(null); continue }
    out.push(n.val)
    q.push(n.left, n.right)
  }
  while (out.length && out[out.length - 1] === null) out.pop()
  return out
}

/** Independent oracle: BFS-codec roundtrip -> canonical level array. */
export function oracleRoundtripLevel(level) {
  const root = bfsBuild(trimLevel(level).slice())
  return bfsLevelOut(bfsDeserialize(bfsSerialize(root)))
}

function toTest(level) {
  const lvl = trimLevel(level)
  return { args: [outLiteral(lvl)], expected: outLiteral(oracleRoundtripLevel(lvl)) }
}

function cloneSignature() {
  return { name: SIGNATURE.name, params: SIGNATURE.params.map((p) => ({ ...p })), return: SIGNATURE.return }
}
function inputLine(sig, args) {
  return sig.params.map((p, i) => `${p.name} = ${args[i]}`).join(', ')
}
function buildVariant({ id, seedLabel, intent, suffix, statement, tests, hints }) {
  const capped = tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
  const first = capped[0]
  return {
    id, seedLabel, intent, difficulty: DIFFICULTY,
    title: `Serialize and Deserialize Binary Tree — ${suffix} (generated drill)`,
    statement, signature: cloneSignature(),
    examples: [{ input: inputLine(cloneSignature(), first.args), output: first.expected, explain: 'Roundtrip of the tree must reproduce this level-order shape.' }],
    tests: capped, mode: MODE,
    hints: hints.slice(0, 2),
    note: 'Generated inputs (seeded); not official examples. Any encoding is accepted if it roundtrips to the same structure.',
  }
}

const OFFICIAL = new Set(['[1,2,3,null,null,4,5]', '[]'])

export function buildSerdePractice() {
  const v1 = [
    [4, 2, 6, 1], [7, 3, 9, 2, 5], [-4, -8, 0, 6], [1, null, 2, null, 3],
  ].map(toTest)
  const v2 = [
    [], [5], [3, 2, null, 1], [1, null, 2, null, 3], [8, -3, 10, null, 0, 9, null],
  ].map(toTest)
  const v3 = [
    [2, 2, 2, 2, 2],
    [7, 7, -7, null, 7, -7, null],
    [1, null, -5, 3, null, null, 9],
    [10, 5, 15, 3, 7, null, 18, 1, null, 6],
  ].map(toTest)
  const make = (id, seedLabel, intent, suffix, statement, tests, hints) =>
    buildVariant({ id, seedLabel, intent, suffix, statement, tests, hints })
  void OFFICIAL
  return [
    make('v1', 'fresh trees', INTENT_SAME,
      'fresh trees',
      'Generated drill: implement Codec.serialize + deserialize so the tree roundtrips. Input is a level-order array (generated, seeded, values -9..9, 3..7 slots); output is the roundtripped level-order array with trailing nulls trimmed. Any intermediate string is valid if the structure survives. Signature and roundtrip comparison unchanged.',
      v1,
      ['Emit one token per real node plus one marker per null child, in a fixed order.', 'Decode with a single shared cursor that consumes tokens in the same order.']),
    make('v2', 'edge cases', INTENT_EDGE,
      'edge cases',
      'Generated drill: same Codec roundtrip on boundary inputs — empty tree, single node, left-only chain, right-only chain, and a sparse tree with holes/negatives. Output is the roundtripped level-order array. No rule change; signature and roundtrip comparison unchanged.',
      v2,
      ['Empty tree: serialize to "" and deserialize back to null.', 'Chains still need a marker for every missing child, or the decoder misaligns.']),
    make('v3', 'adversarial shapes', INTENT_ADVERSARIAL,
      'adversarial shapes',
      'Generated drill: same Codec roundtrip with adversarial placements — duplicate-heavy values, sign flips with holes, a deep right-leaning chain, and a wider 10-node tree. Duplicates must still rebuild by position, not by value. No rule change; signature and roundtrip comparison unchanged.',
      v3,
      ['Duplicate values rebuild by token position; never search by value.', 'A fixed left-then-right order on both sides is what keeps the cursor aligned.']),
  ]
}

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oracleRoundtripLevel (BFS-queue codec; preorder-with-markers used only in walkthrough)',
})
