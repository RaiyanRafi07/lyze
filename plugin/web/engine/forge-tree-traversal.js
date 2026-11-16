import { treeInput } from './semantic-core.js'

const traversals = {
  'binary-tree-inorder-traversal': ['inorderTraversal', 'Inorder', ['left', 'node', 'right']],
  'binary-tree-preorder-traversal': ['preorderTraversal', 'Preorder', ['node', 'left', 'right']],
  'binary-tree-postorder-traversal': ['postorderTraversal', 'Postorder', ['left', 'right', 'node']],
}

const drills = [
  { label: 'fresh trees', intent: 'Apply the traversal to new balanced and uneven trees.',
    levels: [[13, -4, 19, 2, 8, 15, 27], [4, 17, -6, null, 9, 3], [6, 12, -3, -8, null, 21, 10]] },
  { label: 'edge cases', intent: 'Handle the empty tree, a single value and one-sided chains.',
    levels: [[], [-7], [11, 5, null, 2, null, -1], [-4, null, 6, null, -3, null, 8]] },
  { label: 'sparse and repeated values', intent: 'Follow node positions even when values repeat or children are missing.',
    levels: [[4, 4, -2, null, 4, 3, null, -5, null, 3], [9, 6, 9, null, 7, null, 6, 9, null],
      [12, null, -1, 5, 12, null, 5, 2]] },
]

// Expand pending visits in reverse order so the stack runs the selected
// traversal order. A separate emit entry distinguishes a visit from a value.
function traversalOutput(level, order) {
  const { root } = treeInput(level)
  const values = []
  const pending = root ? [{ node: root, emit: false }] : []
  while (pending.length) {
    const { node, emit } = pending.pop()
    if (emit) {
      values.push(node.value)
      continue
    }
    for (const action of order.slice().reverse()) {
      if (action === 'node') pending.push({ node, emit: true })
      else if (node[action]) pending.push({ node: node[action], emit: false })
    }
  }
  return values
}

function buildTraversalVariants(problem) {
  const [name, title, order] = traversals[problem.slug]
  const live = problem.judge?.signature
  if (live?.name !== name || live.return !== 'int[]' ||
      live.params?.length !== 1 || live.params[0].type !== 'TreeNode' ||
      (problem.judge.mode && problem.judge.mode !== 'exact')) return []

  return drills.map(({ label, intent, levels }, index) => {
    const tests = levels.map((level) => ({
      args: [JSON.stringify(level)],
      expected: JSON.stringify(traversalOutput(level, order)),
    }))
    return {
      id: 'v' + (index + 1),
      seedLabel: label,
      intent,
      title: title + ' traversal — ' + label,
      difficulty: problem.difficulty,
      statement: 'Return the values of the binary tree in ' + title.toLowerCase() +
        ' order (' + order.join(', ') + '). Inputs are level-order trees. ' + intent,
      signature: { name: live.name, params: [{ ...live.params[0] }], return: live.return },
      examples: [{ input: 'root = ' + tests[0].args[0], output: tests[0].expected, explain: '' }],
      tests,
      mode: 'exact',
      hints: ['At each nonempty node, process ' + order.join(', ') + ' in that order.',
        'Skip missing children and keep duplicate values whenever their nodes are visited.'],
    }
  })
}

export const traversalBuilders = Object.fromEntries(
  Object.keys(traversals).map((slug) => [slug, buildTraversalVariants]),
)
