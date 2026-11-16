/**
 * balanced-binary-tree — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `balanced-binary-tree`
 * (Balanced Binary Tree, Easy, isBalanced(TreeNode)->boolean, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Seeded RNG (mulberry32 over FNV-1a of the slug); every expected value is
 * computed at build time by oracleBalanced below (naive per-node height
 * recomputation, O(n^2)), an INDEPENDENT implementation of the same operation
 * (not the walkthrough's single-pass -1 sentinel recursion).
 *
 * Staged source: .workers/jobs/question-owners-150/balanced-binary-tree/practice.js
 * (fresh/edge/adversarial drills, oracle, seeded generator); reshaped into the
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

export const SLUG = 'balanced-binary-tree'
export const SIGNATURE = Object.freeze({
  name: 'isBalanced',
  params: Object.freeze([{ name: 'root', type: 'TreeNode' }]),
  return: 'boolean',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Easy'

export const INTENT_SAME = 'Same task, different trees so you reproduce the post-order height reasoning.'
export const INTENT_EDGE = 'Same task with the edge cases the worked example hides.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial shapes: deep-narrow versus wide-shallow trees that punish height-guessing.'

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

/**
 * INDEPENDENT oracle: naive per-node height recomputation (no sentinel).
 * Different method from the walkthrough (single-pass -1 short-circuit).
 */
export function oracleBalanced(level) {
  const { root } = buildTree(level)
  const height = (n) => (n === null ? 0 : 1 + Math.max(height(n.left), height(n.right)))
  const ok = (n) => {
    if (n === null) return true
    return Math.abs(height(n.left) - height(n.right)) <= 1 && ok(n.left) && ok(n.right)
  }
  return ok(root)
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
  const t = { args: [lit(level)], expected: String(oracleBalanced(level)) }
  if (example) t.example = example
  return t
}

function seededFreshLevels(rng, count) {
  const out = []
  let guard = 0
  while (out.length < count && guard++ < 600) {
    const n = randInt(rng, 2, 9)
    const lv = []
    for (let k = 0; k < n; k++) lv.push(k === 0 ? randInt(rng, 1, 9) : (rng() < 0.25 ? null : randInt(rng, -9, 9)))
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

export function buildBalancedVariants() {
  const rng = rng32(hashText(SLUG))
  const fresh = seededFreshLevels(rng, 4)

  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh trees',
      intent: INTENT_SAME,
      title: 'Balanced Binary Tree — fresh trees (same task)',
      statement:
        'Given the root of a binary tree as a level-order array, return whether it is height-balanced: every node must satisfy |left height - right height| <= 1, and the empty tree counts as balanced. The first input below is the official example; the rest are fresh seeded trees with 2 to 9 entries. Signature isBalanced(root: TreeNode) -> boolean, exact boolean comparison.',
      levels: [
        { args: ['[3,9,20,null,null,15,7]'], expected: 'true', example: 1 },
        ...fresh,
      ],
      hints: [
        'Prove both child heights before judging a node; a missing height is unknown, never 0.',
        'An empty tree is balanced (true): handle the null root before any recursion.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Balanced Binary Tree — edge cases (same task)',
      statement:
        'Same balance task on the boundary inputs the worked example hides. Boundaries: empty tree, single node, two nodes, and a left chain of 3 that already fails at the root. A null child returns height 0 but is never a node. Signature isBalanced(root: TreeNode) -> boolean, exact boolean comparison.',
      levels: [
        { args: ['[3,9,20,null,null,15,7]'], expected: 'true', example: 1 },
        [], [5], [1, 2], [1, 2, null, 3],
      ],
      hints: [
        'A null child returns height 0 but is never a node: leaves add no phantom depth below them.',
        'A 3-node chain [1,2,null,3] already fails at the root (|2-0| = 2).',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial shapes',
      intent: INTENT_ADVERSARIAL,
      title: 'Balanced Binary Tree — adversarial shapes (same task)',
      statement:
        'SAME TASK, harder shapes: deep-narrow versus wide-shallow trees plus one deep failure hidden under a balanced-looking root, which punishes height-guessing. No rule change: the official example 2 leads, and every tree is judged by the same |left-right| <= 1 rule. Signature isBalanced(root: TreeNode) -> boolean, exact boolean comparison.',
      levels: [
        { args: ['[1,2,2,3,3,null,null,4,4]'], expected: 'false', example: 2 },
        [1, 2, null, 3, null, 4], [1, 2, 3, 4, 5, 6, 7], [1, 2, 2, 3, null, null, 3],
      ],
      hints: [
        'Official example 2 fails deep inside the left subtree, not at the root.',
        'Trace the -1: once a descendant fails, no sibling work happens above it.',
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
  oracle: 'oracleBalanced (naive per-node height recomputation; walkthrough uses single-pass -1 sentinel)',
})
