/**
 * diameter-of-binary-tree — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `diameter-of-binary-tree`
 * (Diameter of Binary Tree, Easy, diameterOfBinaryTree(TreeNode)->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Seeded RNG (mulberry32 over FNV-1a of the slug) for v1 fresh trees; every
 * expected value is computed at build time by oracleDiameterLevel below
 * (all-pairs BFS longest path on the level-order adjacency), an INDEPENDENT
 * implementation of the same operation (not the walkthrough's single-pass
 * post-order DFS height recursion with a global best).
 *
 * Staged source: .workers/jobs/neetcode150-completion/diameter-of-binary-tree/diameter-variants.mjs
 * (fresh/edge/adversarial drills, BFS oracle, seeded generator); reshaped into the
 * forge variant contract (id/seedLabel/intent/difficulty/title/statement/
 * signature/examples/tests/mode/hints). v1/v2 tests[0] = official example 1,
 * v3 tests[0] = official example 2; all three sets are the SAME task
 * (no rule change).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style level-order literal strings; `expected` is
 *   the literal the judge compares against (mode 'exact').
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'diameter-of-binary-tree'
export const SIGNATURE = Object.freeze({
  name: 'diameterOfBinaryTree',
  params: Object.freeze([{ name: 'root', type: 'TreeNode' }]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Easy'

export const INTENT_SAME = 'Same diameter task, different trees so you reproduce the post-order height reasoning.'
export const INTENT_EDGE = 'Same task with the edge cases the worked example hides.'
export const INTENT_ADVERSARIAL = 'Same task, hostile shapes: the optimum hides below the root and punishes root-only splits.'

export function buildTree(level) {
  if (!Array.isArray(level) || !level.length || level[0] == null) return { root: null, nodes: [] }
  let id = 0
  const root = { id: id++, value: level[0], left: null, right: null }
  const q = [root]
  const nodes = [root]
  let c = 1
  for (let h = 0; h < q.length && c < level.length; h++) {
    for (const side of ['left', 'right']) {
      if (c >= level.length) break
      const v = level[c++]
      if (v == null) continue
      const k = { id: id++, value: v, left: null, right: null }
      q[h][side] = k
      q.push(k)
      nodes.push(k)
    }
  }
  return { root, nodes }
}

/** INDEPENDENT oracle adjacency: level-order links viewed as undirected edges. */
export function buildAdj(level) {
  const { root, nodes } = buildTree(level)
  if (!root) return []
  const adj = nodes.map(() => [])
  const indexOf = new Map(nodes.map((n, i) => [n.id, i]))
  for (const n of nodes) {
    for (const side of ['left', 'right']) {
      const ch = n[side]
      if (ch != null) {
        const a = indexOf.get(n.id), b = indexOf.get(ch.id)
        adj[a].push(b)
        adj[b].push(a)
      }
    }
  }
  return adj
}

/**
 * INDEPENDENT oracle: all-pairs BFS longest path on the undirected adjacency.
 * Different method from the walkthrough (single-pass post-order DFS that
 * returns heights while a global best tracks max left+right).
 */
export function oracleDiameterLevel(level) {
  const adj = buildAdj(level)
  const n = adj.length
  if (n <= 1) return 0
  let best = 0
  for (let s = 0; s < n; s++) {
    const dist = new Array(n).fill(-1)
    dist[s] = 0
    const q = [s]
    for (let h = 0; h < q.length; h++)
      for (const nb of adj[q[h]])
        if (dist[nb] === -1) { dist[nb] = dist[q[h]] + 1; q.push(nb) }
    for (const d of dist) if (d > best) best = d
  }
  return best
}

function hashText(s) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0
  return h
}
function rng32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const randInt = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1))

const lit = (level) => '[' + level.map((v) => (v == null ? 'null' : String(v))).join(',') + ']'
const toTest = (level, example) => {
  const t = { args: [lit(level)], expected: String(oracleDiameterLevel(level)) }
  if (example) t.example = example
  return t
}

function seededFreshLevels(rng, count) {
  const out = []
  let guard = 0
  while (out.length < count && guard++ < 600) {
    const n = randInt(rng, 2, 8)
    const lv = []
    for (let k = 0; k < n; k++) lv.push(k === 0 ? randInt(rng, 1, 9) : (rng() < 0.2 ? null : randInt(rng, -9, 9)))
    if (buildTree(lv).nodes.length < 2) continue
    if (out.some((o) => lit(o) === lit(lv))) continue
    out.push(lv)
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

function buildVariant({ id, seedLabel, intent, title, statement, levels, hints }) {
  const tests = levels
    .map((entry) => Array.isArray(entry) ? toTest(entry) : entry)
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

export function buildDiameterVariants() {
  const rng = rng32(hashText(SLUG))
  const fresh = seededFreshLevels(rng, 3)

  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh trees',
      intent: INTENT_SAME,
      title: 'Diameter of Binary Tree — fresh trees (same task)',
      statement:
        'Given the root of a binary tree as a level-order array, return its diameter: the number of edges on the longest path between any two nodes. The path may skip the root, so track the best through-path at every node. The first input below is the official example; the rest are fresh seeded trees with 2 to 8 entries and values between -9 and 9. Signature diameterOfBinaryTree(root: TreeNode) -> int, exact integer comparison.',
      levels: [
        { args: ['[1,2,3,4,5]'], expected: '3', example: 1 },
        ...fresh,
      ],
      hints: [
        'At each node the through-path is leftHeight + rightHeight; keep the maximum over every node.',
        'Return 1 + max(left, right) upward; a null child has height 0.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Diameter of Binary Tree — edge cases (same task)',
      statement:
        'Same diameter task on the boundary inputs the worked example hides. Boundaries: a single node with diameter 0, a two-node tree, and skewed chains where every node has one child. Count edges, not nodes: a chain of k nodes has diameter k-1, and an empty tree has diameter 0. Signature diameterOfBinaryTree(root: TreeNode) -> int, exact integer comparison.',
      levels: [
        { args: ['[1,2,3,4,5]'], expected: '3', example: 1 },
        [1], [1, 2], [1, null, 2, null, 3], [1, 2, null, 3, null, 4, null, 5],
      ],
      hints: [
        'A single node has diameter 0: there are no edges between two distinct nodes.',
        'A chain of k nodes has diameter k-1; count edges, not nodes.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'same task, hostile shapes',
      intent: INTENT_ADVERSARIAL,
      title: 'Diameter of Binary Tree — hostile shapes (same task)',
      statement:
        'SAME TASK, harder shapes with no rule change: a full tree, one-sided chains, and a deep balanced left subtree whose internal diameter beats every path through the root. These punish solutions that only measure the root split instead of the maximum over all nodes. The official example 2 leads; every tree is judged by the same longest-edge-path rule. Signature diameterOfBinaryTree(root: TreeNode) -> int, exact integer comparison.',
      levels: [
        { args: ['[1,2]'], expected: '1', example: 2 },
        [1, 2, 3, 4, 5, 6, 7],
        [1, 2, 3, 4, 5, null, null, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
        [1, null, 2, null, 3],
      ],
      hints: [
        'The optimum may sit entirely inside one subtree; the root split is just one candidate.',
        'Height is in edges from the node down: a leaf returns 1, a null child returns 0.',
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
  oracle: 'oracleDiameterLevel (all-pairs BFS longest path; walkthrough uses single-pass DFS height recursion)',
})
