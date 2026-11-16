/**
 * count-good-nodes-in-binary-tree — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `count-good-nodes-in-binary-tree`
 * (Count Good Nodes in Binary Tree, Medium, goodNodes(root: TreeNode) -> int, exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * oracleAncestorChain below (per-node root-path comparison), an INDEPENDENT
 * implementation of the same operation (not the walkthrough's recursive
 * carried-maximum DFS). A carried-maximum DFS oracle cross-checks every value.
 *
 * Staged source rows: .workers/jobs/question-owners-150/count-good-nodes-in-binary-tree/practice-good-nodes.js
 * (level rows, statements, hints); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified at build time.
 *
 * Shape follows plugin/web/engine/forge-pacific-atlantic-water-flow.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style level-order literals; `expected` is the literal
 *   the judge compares against (exact integer equality).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'count-good-nodes-in-binary-tree'
export const SIGNATURE = Object.freeze({
  name: 'goodNodes',
  params: Object.freeze([{ name: 'root', type: 'TreeNode' }]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial shapes: ties, bound values and sparse levels.'

function levelBuildParent(level) {
  if (!Array.isArray(level) || level.length === 0 || level[0] === null || level[0] === undefined) {
    return { root: null, nodes: [] }
  }
  let id = 0
  const root = { id: id++, value: level[0], left: null, right: null, parent: null }
  const queue = [root]
  const nodes = [root]
  let cursor = 1
  for (let head = 0; head < queue.length && cursor < level.length; head += 1) {
    const parent = queue[head]
    for (const side of ['left', 'right']) {
      if (cursor >= level.length) break
      const v = level[cursor++]
      if (v === null || v === undefined) continue
      const child = { id: id++, value: v, left: null, right: null, parent }
      parent[side] = child
      queue.push(child)
      nodes.push(child)
    }
  }
  return { root, nodes }
}

/**
 * INDEPENDENT reference oracle: ancestor-chain comparison. For every node, walk
 * parent pointers back to the root and count the node good iff its value ties or
 * beats every ancestor. No carried maximum, no single DFS pass: O(n*h) instead
 * of the walkthrough's O(n) carried-max DFS. Different algorithm, same answers.
 */
export function oracleAncestorChain(level) {
  const { nodes } = levelBuildParent(level)
  let count = 0
  for (const node of nodes) {
    let ok = true
    let anc = node.parent
    while (anc !== null && anc !== undefined) {
      if (anc.value > node.value) { ok = false; break }
      anc = anc.parent
    }
    if (ok) count += 1
  }
  return count
}

/** Cross-check oracle: recursive carried-maximum DFS (the walkthrough's approach). */
export function oracleCarriedMax(level) {
  const { root } = levelBuildParent(level)
  if (root === null) return 0
  let count = 0
  const dfs = (node, mx) => {
    if (node === null || node === undefined) return
    if (node.value >= mx) count += 1
    const nmx = Math.max(mx, node.value)
    dfs(node.left, nmx)
    dfs(node.right, nmx)
  }
  dfs(root, Number.NEGATIVE_INFINITY)
  return count
}

const levelLiteral = (level) => JSON.stringify(level)

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
  const expected = String(oracleAncestorChain(level))
  const cross = String(oracleCarriedMax(level))
  if (expected !== cross) throw new Error('Oracles disagree on ' + levelLiteral(level))
  return { args: [levelLiteral(level)], expected }
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

export function buildCountGoodNodesPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh values',
      intent: INTENT_SAME,
      title: 'Count Good Nodes in Binary Tree — fresh values (good-nodes drill)',
      statement:
        'Given a binary tree root, a node X is good when no node on the path from root to X holds a value greater than X. Return the number of good nodes. Fresh level-order inputs below; every test is a complete binary-tree array.',
      levels: [
        [5, 2, 8, 1, 4, 7, 9],
        [4, 4, 4, 4, null, null, 4],
        [10, 5, 15, 2, 7, null, 20],
        [0, -1, 1, null, null, -2, 2],
      ],
      hints: [
        'Carry the largest value seen on the current root-to-node path as you descend.',
        'A node counts exactly when its value ties or beats that carried maximum.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Count Good Nodes in Binary Tree — edge cases (good-nodes drill)',
      statement:
        'Same good-nodes counting task: a node is good when its value is at least the maximum on the path from the root. Inputs are edge-shaped: a single node, all-negative values, a strictly decreasing tree, and a right-leaning chain with null placeholders.',
      levels: [[1], [-10, -20, -5], [5, 4, 3, 2, 1], [1, null, 2, null, 3]],
      hints: [
        'The root is always good, even when its value is negative.',
        'In a strictly decreasing tree only the root can be a path maximum.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'same task, adversarial shapes',
      intent: INTENT_ADVERSARIAL,
      title: 'Count Good Nodes in Binary Tree — same task, adversarial shapes (good-nodes drill)',
      statement:
        'Same good-nodes counting task with no rule change: count nodes whose value ties or beats every value on the path from the root. These inputs stress ties, the -10^4/10^4 bounds, and sparse levels with null placeholders.',
      levels: [
        [3, 3, 3, 3, 3],
        [0, 0, null, 0, null, 0],
        [-1, -2, -3, -4, null, -5],
        [10000, -10000, 10000, null, null, -10000, 10000],
      ],
      hints: [
        'Equal values still count: the test is greater-than on the path, so ties pass.',
        'Null placeholders only shape the tree; they never count as nodes.',
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
  oracle: 'oracleAncestorChain (per-node ancestor walk, O(n*h); frame emitter is carried-max DFS, O(n))',
})
