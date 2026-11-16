/**
 * binary-tree-right-side-view — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `binary-tree-right-side-view`
 * (Binary Tree Right Side View, Medium, rightSideView(root: TreeNode) -> int[], exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * oracleDFSRightFirst below (right-first depth-first descent), an INDEPENDENT
 * implementation of the same operation (not the walkthrough's frozen-width BFS
 * emitter). A frozen-width BFS oracle cross-checks every expected value.
 *
 * Staged source rows: .workers/jobs/neetcode150-completion/binary-tree-right-side-view/practice.right-side-view.js
 * (seeded v1 levels, fixed edge/adversarial rows, statements, hints); reshaped into
 * the forge variant contract (id/seedLabel/intent/difficulty/title/statement/
 * signature/examples/tests/mode/hints). Expected literals re-verified at build time.
 *
 * Shape follows plugin/web/engine/forge-pacific-atlantic-water-flow.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style level-order literals; `expected` is the literal
 *   the judge compares against (exact order: top to bottom).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'binary-tree-right-side-view'
export const SIGNATURE = Object.freeze({
  name: 'rightSideView',
  params: Object.freeze([{ name: 'root', type: 'TreeNode' }]),
  return: 'int[]',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same question with adversarial shapes that punish one-sided shortcuts.'

function levelBuild(level) {
  if (!Array.isArray(level) || level.length === 0 || level[0] === null || level[0] === undefined) {
    return { root: null, nodes: [] }
  }
  let id = 0
  const root = { id: id++, value: level[0], left: null, right: null }
  const queue = [root]
  const nodes = [root]
  let cursor = 1
  for (let head = 0; head < queue.length && cursor < level.length; head += 1) {
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

/**
 * INDEPENDENT reference oracle: right-first DFS — recurse into the right child
 * before the left and record the first node reached at each depth. No queue, no
 * frozen width, no level rounds. Different algorithm from the walkthrough's BFS.
 */
export function oracleDFSRightFirst(level) {
  const { root } = levelBuild(level)
  const out = []
  const walk = (node, depth) => {
    if (node === null || node === undefined) return
    if (depth === out.length) out.push(node.value)
    walk(node.right, depth + 1)
    walk(node.left, depth + 1)
  }
  walk(root, 0)
  return out
}

/** Cross-check oracle: BFS with frozen per-level width, last polled wins. */
export function oracleBFS(level) {
  const { root } = levelBuild(level)
  if (root === null) return []
  const out = []
  const queue = [root]
  while (queue.length > 0) {
    const size = queue.length
    for (let i = 0; i < size; i++) {
      const node = queue.shift()
      if (i === size - 1) out.push(node.value)
      if (node.left !== null && node.left !== undefined) queue.push(node.left)
      if (node.right !== null && node.right !== undefined) queue.push(node.right)
    }
  }
  return out
}

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

const levelLiteral = (level) => '[' + level.map((v) => (v === null || v === undefined ? 'null' : String(v))).join(',') + ']'
const outLiteral = (value) => '[' + value.join(',') + ']'

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

function toTest(level) {
  const expected = outLiteral(oracleDFSRightFirst(level))
  const cross = outLiteral(oracleBFS(level))
  if (expected !== cross) throw new Error('Oracles disagree on ' + levelLiteral(level))
  return { args: [levelLiteral(level)], expected }
}

function freshLevels() {
  const rng = mulberry32(hashText(SLUG + ':v1'))
  const levels = []
  for (let n = 0; n < 4; n += 1) {
    const size = randInt(rng, 4, 8)
    const level = []
    for (let k = 0; k < size; k += 1) {
      if (k > 0 && rng() < 0.18) level.push(null)
      else level.push(randInt(rng, -9, 30))
    }
    if (level[0] === null || level[0] === undefined) level[0] = randInt(rng, 1, 20)
    levels.push(level)
  }
  return levels
}

function buildVariant({ id, seedLabel, intent, title, statement, levels, hints }) {
  const tests = levels.map(toTest).slice(0, 5)
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

export function buildBinaryTreeRightSideViewPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh trees',
      intent: INTENT_SAME,
      title: 'Binary Tree Right Side View — fresh trees (right-side drill)',
      statement:
        'Given the root of a binary tree as a level-order array, return the values visible from the right side, ordered top to bottom. These fresh inputs use small seeded trees of 4 to 8 slots with values between -9 and 30. The signature and exact-match judge mode are unchanged.',
      levels: freshLevels(),
      hints: [
        'Freeze the queue width before each round; the last node drained in the round is the visible one.',
        'A missing right child does not hide the level: the rightmost present node still counts.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Binary Tree Right Side View — edge cases (right-side drill)',
      statement:
        'Same right-side task with the boundary inputs. Given the root as a level-order array, return the right-side values top to bottom. Inputs include the empty tree, a single node, two nodes, a left-only chain, and a right-only chain.',
      levels: [
        [],
        [7],
        [1, 2],
        [1, 2, null, 3, null, 4, null],
        [1, null, 2, null, 3, null, 4],
      ],
      hints: [
        'An empty tree has no levels, so the answer is the empty list.',
        'In a single-child chain every level holds one node, so the view equals the chain itself.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial shapes',
      intent: INTENT_ADVERSARIAL,
      title: 'Binary Tree Right Side View — adversarial shapes (right-side drill)',
      statement:
        'Same right-side question with adversarial shapes that punish one-sided shortcuts. Given the root as a level-order array, return the right-side values top to bottom. A full tree, a deep left spine with a right peek at the bottom, a zigzag chain, and negative values stress the full level-width discipline. No rule change: the signature and exact comparison are unchanged.',
      levels: [
        [1, 2, 3, 4, 5, 6, 7],
        [1, 2, null, 3, null, 4, null, 5, null, 6, 7],
        [1, 2, null, null, 3, null, 4],
        [-10, 9, 20, null, null, 15, 7],
      ],
      hints: [
        'A deep left spine still exposes a right child at the bottom level; track width, not side.',
        'Do not stop at the first level: every depth contributes exactly one value.',
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
  oracle: 'oracleDFSRightFirst (right-first DFS, first node per depth; frame emitter is frozen-width BFS)',
})
