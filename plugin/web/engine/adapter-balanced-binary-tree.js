/**
 * balanced-binary-tree — live semantic adapter (tree-dfs).
 *
 * Walkthrough algorithm: single post-order pass with a -1 sentinel.
 * check(null) returns 0; otherwise solve left, short-circuit on -1, solve
 * right, short-circuit on -1, return -1 when |left-right|>1, else
 * 1+max(left,right). isBalanced returns check(root) != -1. Every frame is
 * produced by running this exact recursion on the actual level-order input —
 * no invented heights, no future values. O(n) time, O(h) space.
 *
 * Staged source: `.workers/jobs/question-owners-150/balanced-binary-tree/adapter-patch.js`
 * (signature, lesson, explain, code texts, sentinel build) — ported to the live
 * shape: shared `code`/`frame`/`treeInput` helpers imported from
 * semantic-core.js, no local helper redefinitions. Signature equals the live
 * judge signature exactly.
 *
 * Visual bound: level-order arrays of at most 31 entries (judge allows up to
 * 5000 nodes). Longer inputs throw an honest error instead of truncating.
 */
import { code, frame, treeInput, boundedFrames } from './semantic-core.js'

// boundedFrames is applied by semantic.js (single compaction pass); the import
// keeps this adapter on the shared helper contract. Adapters return FULL lists.

const VISUAL_MAX = 31

const balancedJava = code(`
[init] class Solution {
[init]     public boolean isBalanced(TreeNode root) {
[init]         return check(root) != -1;
[init]     }
[guard]     private int check(TreeNode node) {
[guard]         if (node == null) return 0;
[visit]         int left = check(node.left);
[unbalanced]         if (left == -1) return -1;
[visit]         int right = check(node.right);
[unbalanced]         if (right == -1) return -1;
[check]         int diff = Math.abs(left - right);
[unbalanced]         if (diff > 1) return -1;
[return]         return 1 + Math.max(left, right);
[done]         // Balanced overall: every subtree returned a real height (never -1).
[done]     }
[def] }
`)

const balancedCpp = code(`
[init] class Solution {
[init] public:
[init]     bool isBalanced(TreeNode* root) {
[init]         return check(root) != -1;
[init]     }
[guard]     int check(TreeNode* node) {
[guard]         if (node == nullptr) return 0;
[visit]         int left = check(node->left);
[unbalanced]         if (left == -1) return -1;
[visit]         int right = check(node->right);
[unbalanced]         if (right == -1) return -1;
[check]         int diff = abs(left - right);
[unbalanced]         if (diff > 1) return -1;
[return]         return 1 + (left > right ? left : right);
[done]         // Balanced overall: every subtree returned a real height (never -1).
[done]     }
[def] };
`)

const balancedPseudo = code(`
[init] isBalanced(root): return check(root) != -1
[guard] check(node):
[guard]   if node == null return 0
[visit]   left = check(node.left)
[unbalanced]   if left == -1 return -1
[visit]   right = check(node.right)
[unbalanced]   if right == -1 return -1
[check]   diff = abs(left - right)
[unbalanced]   if diff > 1 return -1
[return]   return 1 + max(left, right)
[done] balanced iff check(root) != -1
`)

export function buildBalanced(args) {
  if (!Array.isArray(args) || args.length < 1) throw new Error('balanced-binary-tree expects [level]')
  let level = args[0]
  if (typeof level === 'string') {
    try { level = JSON.parse(level) } catch { throw new Error('Tree input must be level-order JSON') }
  }
  if (!Array.isArray(level)) throw new Error('Expected a level-order array for the tree')
  const { root, nodes, edges } = treeInput(level, VISUAL_MAX)
  const frames = []
  const visited = []
  const path = []
  const heights = {}
  const snapshot = (obj) => JSON.parse(JSON.stringify(obj))
  const push = (step, label, note, cur, vars) => {
    frames.push(frame(step, label, note, snapshot({
      current: cur ? cur.id : null,
      visited: visited.map((n) => n.id),
      path: path.map((n) => n.id),
      distances: { ...heights },
      vars,
    })))
  }

  push('init', 'Initialize',
    root === null
      ? 'Empty tree: no nodes, so nothing can violate balance'
      : `Start at root ${root.value}; no heights known yet`,
    root, {})

  if (root === null) {
    push('done', 'Return verdict', 'Verdict true: an empty tree is balanced', null, { verdict: true, answer: true })
    return { kind: 'tree', layout: { nodes, edges }, frames, result: true }
  }

  let firstBad = null

  function dfs(node) {
    if (node === null) {
      push('guard', 'Null child', 'Null child returns height 0; nulls are never nodes', null, {})
      return 0
    }
    visited.push(node)
    path.push(node)
    push('visit', 'Enter node', `Enter node ${node.value}; solve its left subtree first`, node, {})
    const left = dfs(node.left)
    if (left === -1) {
      push('unbalanced', 'Short-circuit',
        `Left subtree below ${node.value} failed; skip right, return -1`,
        node, { left: -1, right: null, diff: null, height: null, unbalanced: true, side: 'left' })
      path.pop()
      return -1
    }
    push('visit', 'Left solved', `Left height of ${node.value} is ${left}; solve right now`, node,
      { left, right: null, diff: null, height: null })
    const right = dfs(node.right)
    if (right === -1) {
      push('unbalanced', 'Short-circuit',
        `Right subtree below ${node.value} failed; return -1 with no height`,
        node, { left, right: -1, diff: null, height: null, unbalanced: true, side: 'right' })
      path.pop()
      return -1
    }
    const diff = Math.abs(left - right)
    if (diff > 1) {
      if (firstBad === null) firstBad = { id: node.id, value: node.value, left, right, diff }
      push('unbalanced', 'Imbalance',
        `Node ${node.value}: |${left}-${right}|=${diff} exceeds 1; return -1`,
        node, { left, right, diff, height: null, unbalanced: true, side: 'here' })
      path.pop()
      return -1
    }
    const height = 1 + Math.max(left, right)
    push('check', 'Balanced node',
      `Node ${node.value}: |${left}-${right}|=${diff} fits 1; height is ${height}`,
      node, { left, right, diff, height, unbalanced: false })
    heights[node.id] = height
    push('return', 'Return height', `Return height ${height} from node ${node.value}`, node,
      { left, right, diff, height, unbalanced: false })
    path.pop()
    return height
  }

  const top = dfs(root)
  const verdict = top !== -1
  push('done', 'Return verdict',
    verdict
      ? 'Every node kept |left-right| within 1; the tree is balanced'
      : `First imbalance at node ${firstBad.value} (|${firstBad.left}-${firstBad.right}|=${firstBad.diff}); not balanced`,
    null, { verdict, answer: verdict, imbalancedAt: verdict ? null : { ...firstBad } })
  return { kind: 'tree', layout: { nodes, edges }, frames, result: verdict }
}

export const adapters = {
  'balanced-binary-tree': {
    signature: { name: 'isBalanced', params: ['TreeNode'], return: 'boolean' },
    lesson: {
      idea: 'One post-order pass returns each subtree height, or -1 the moment imbalance is proven; -1 skips the rest.',
      trap: 'Recomputing height at every node is O(n^2) on a chain; the sentinel fuses both tests into one pass.',
      time: 'O(n)',
      space: 'O(h)',
    },
    explain: {
      init: 'Starts the single check at the root; a non -1 return means every subtree below agreed it is balanced.',
      guard: 'A null child contributes height 0 and needs no further work; nulls are absent positions, never nodes.',
      visit: 'Solves one child subtree before judging the parent, because the parent diff needs both heights first.',
      check: 'Both child heights are known, so the absolute difference decides this node before returning upward.',
      unbalanced: 'Reports -1 upward: either this node violates the bound, or a descendant did and the sibling is skipped.',
      return: 'Returns 1 + max(left, right) upward; the height is now proven and recorded for this node.',
      done: 'Converts the root height into the verdict: -1 anywhere means false, any other value means true.',
      def: 'Scope wrapper around the balance check; no height work happens on these lines.',
    },
    explainLines: {
      java: {
        0: 'Structural wrapper: opens the solution scope and performs no algorithm operation.',
        3: 'End of isBalanced: the boolean verdict is already decided by the check call above.',
        13: 'End of the check helper scope; every return above exits with a height or the -1 failure signal.',
        14: 'Structural wrapper: closes the solution scope and performs no algorithm operation.',
      },
      cpp: {
        0: 'Structural wrapper: opens the solution scope and performs no algorithm operation.',
        1: 'Access label: everything below is public and performs no algorithm operation.',
        4: 'End of isBalanced: the boolean verdict is already decided by the check call above.',
        14: 'End of the check helper scope; every return above exits with a height or the -1 failure signal.',
        15: 'Structural wrapper: closes the solution scope and performs no algorithm operation.',
      },
      pseudo: {
        0: 'Function header: names the root input; the real work starts in check below.',
        10: 'Answer rule: the tree is balanced exactly when no frame reported the -1 failure signal.',
      },
    },
    code: { java: balancedJava, cpp: balancedCpp, pseudo: balancedPseudo },
    build: buildBalanced,
  },
}
