// Portable standalone practice builder — maximum-depth-of-binary-tree.
// Dependency-free ES module: no DOM, no network, no Math.random, no Date.
// Seeded from the slug, so the same slug always yields the same 3 variants.
//
// Signature (actual, from plugin/data/shard-0.json id 104):
//   maxDepth(root: TreeNode) -> int, judge mode exact.
// Tests use LeetCode literal-string args (e.g. "[3,9,20,null,null,15,7]") and
// exact int-as-string expected values. Every variant's tests[0] is the official
// example 1 (examples == first test); all later tests are fresh generated
// constructions (never official examples). No rule-change challenges are
// included: every variant keeps the same signature and exact comparison mode.

export const SLUG = 'maximum-depth-of-binary-tree'
export const SIGNATURE = { name: 'maxDepth', params: ['TreeNode'], return: 'int' }
export const MODE = 'exact'

export const OFFICIAL_EXAMPLE_1 = { args: ['[3,9,20,null,null,15,7]'], expected: '3', example: 1 }
export const OFFICIAL_EXAMPLE_2 = { args: ['[1,null,2]'], expected: '2', example: 2 }

function hashText(text) {
  const source = String(text)
  let hash = 2166136261 >>> 0
  for (let i = 0; i < source.length; i += 1) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619) >>> 0
  return hash
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1))
}

// ---------- tree helpers (level-order, mirrors semantic-core treeInput) --
export function buildTree(level) {
  if (!Array.isArray(level) || level.length === 0 || level[0] === null || level[0] === undefined) {
    return { root: null, nodes: [] }
  }
  let id = 0
  const root = { id: id++, value: level[0], left: null, right: null }
  const queue = [root]
  const nodes = [root]
  let cursor = 1
  for (let head = 0; head < queue.length && cursor < level.length; head++) {
    const parent = queue[head]
    for (const side of ['left', 'right']) {
      if (cursor >= level.length) break
      const v = level[cursor++]
      if (v === null || v === undefined) continue
      const child = { id: id++, value: v, left: null, right: null }
      parent[side] = child
      queue.push(child)
      nodes.push(child)
    }
  }
  return { root, nodes }
}

export function parseLevelLiteral(literal) {
  return JSON.parse(literal)
}

// Reference implementation: BFS level counting (mirrors staged Java/C++).
export function referenceDepth(level) {
  const { root } = buildTree(level)
  if (root === null) return 0
  const queue = [root]
  let depth = 0
  while (queue.length > 0) {
    const size = queue.length
    depth += 1
    for (let i = 0; i < size; i++) {
      const node = queue.shift()
      if (node.left !== null) queue.push(node.left)
      if (node.right !== null) queue.push(node.right)
    }
  }
  return depth
}

// Independent oracle: recursive DFS height (structurally independent of the
// BFS reference — no shared queue/size code path).
export function oracleDepth(level) {
  const { root } = buildTree(level)
  function height(node) {
    if (node === null) return 0
    const left = height(node.left)
    const right = height(node.right)
    return 1 + (left > right ? left : right)
  }
  return height(root)
}

// Deliberately wrong control: node count (must diverge on wide trees).
export function wrongNodeCount(level) {
  return buildTree(level).nodes.length
}

function argLiteral(level) {
  const parts = level.map((v) => (v === null ? 'null' : String(v)))
  return '[' + parts.join(',') + ']'
}

function toTest(level, example) {
  const t = { args: [argLiteral(level)], expected: String(oracleDepth(level)) }
  if (example) t.example = example
  return t
}

function seededFreshLevels(rng, count) {
  const out = []
  let guard = 0
  while (out.length < count && guard++ < 500) {
    const size = randInt(rng, 2, 9)
    const level = []
    for (let k = 0; k < size; k++) {
      if (k === 0) level.push(randInt(rng, 1, 9))
      else if (rng() < 0.18) level.push(null)
      else level.push(randInt(rng, -9, 9))
    }
    if (level[0] === null) level[0] = randInt(rng, 1, 9)
    // Keep it nontrivial and inside the visual bound; skip degenerate empties.
    if (buildTree(level).nodes.length < 2) continue
    out.push(level)
  }
  return out
}

const HINTS_V1 = [
  'Snapshot the queue size before each round: every node dequeued before the snapshot belongs to the same level, and depth grows by exactly one per round.',
  'Do not return the node count: a wide level of 7 nodes is still one level. Credit depth++ once per drained round, not once per node.'
]

const HINTS_V2 = [
  'Handle the empty tree first: root == null returns 0 with no queue work, while a single node returns 1.',
  'A null child is not a level: only enqueue present children, so leaves add no phantom depth below them.'
]

const HINTS_V3 = [
  'Test your loop against a wide-but-shallow tree versus a narrow-but-deep chain: the chain must win even though it has fewer nodes.',
  'Trace the frozen size on a zigzag path: each round holds exactly one node, so depth equals the number of rounds, not the branching.'
]

export function buildPractice() {
  const rng = mulberry32(hashText(SLUG))
  const freshLevels = seededFreshLevels(rng, 4)

  const v1Tests = [
    { ...OFFICIAL_EXAMPLE_1 },
    ...freshLevels.map((level) => toTest(level))
  ]

  const edgeLevels = [
    [], // empty tree -> 0
    [5], // single node -> 1
    [1, 2], // two-level left -> 2
    [1, 2, 3, 4, 5, 6, 7], // full depth-3 tree -> 3
    [1, 2, null, 3, null, 4] // left chain of 4 -> 4
  ]
  const v2Tests = [
    { ...OFFICIAL_EXAMPLE_1 },
    ...edgeLevels.map((level) => toTest(level))
  ]

  const adversarialLevels = [
    [10, 9, null, 8, null, 7, null, 6], // deep left chain of 5 -> 5 (fewer nodes than the wide tree below, but deeper)
    [1, 2, 3, 4, 5, 6, 7], // wide full tree, 7 nodes but only depth 3 (punishes node-counting)
    [1, null, 2, 3, null, null, 4] // zigzag 1->2->3->4 -> 4
  ]
  const v3Tests = [
    { ...OFFICIAL_EXAMPLE_1 },
    ...adversarialLevels.map((level) => toTest(level))
  ]

  const statementBase = 'Given the root of a binary tree as a level-order array, return its maximum depth: the number of nodes along the longest root-to-leaf path (empty tree has depth 0). Single-tree task: only one root array per test, no second tree. Signature maxDepth(root: TreeNode) -> int, exact integer comparison.'
  return [
    {
      id: 'v1-fresh-trees',
      title: 'Fresh trees (same task)',
      statement: statementBase + ' These fresh inputs use small seeded trees (2 to 9 entries, values -9..9 with occasional nulls).',
      signature: { ...SIGNATURE },
      mode: MODE,
      hints: [...HINTS_V1],
      tests: v1Tests,
      intent: 'same-task-fresh',
      ruleChange: null,
      provenance: 'tests[0] is official example 1 from plugin/data/shard-0.json id 104; remaining tests are generated drills with oracle-derived expected values.'
    },
    {
      id: 'v2-edge-cases',
      title: 'Edge cases (same task)',
      statement: statementBase + ' Boundary inputs: empty tree, single node, two-level tree, a full depth-3 tree, and a skewed left chain.',
      signature: { ...SIGNATURE },
      mode: MODE,
      hints: [...HINTS_V2],
      tests: v2Tests,
      intent: 'edge',
      ruleChange: null,
      provenance: 'tests[0] is official example 1; remaining tests are fixed generated edge constructions with oracle-derived expected values.'
    },
    {
      id: 'v3-adversarial-shapes',
      title: 'Adversarial shapes (same task, no rule change)',
      statement: statementBase + ' Adversarial shapes that punish node-counting: a deep 5-chain versus a wide 7-node tree of depth 3, plus a zigzag path. No rule change: same question, same signature, exact comparison.',
      signature: { ...SIGNATURE },
      mode: MODE,
      hints: [...HINTS_V3],
      tests: v3Tests,
      intent: 'adversarial',
      ruleChange: null,
      provenance: 'tests[0] is official example 1; remaining tests are fixed generated adversarial shapes with oracle-derived expected values. No rule-change variant is included.'
    }
  ]
}
