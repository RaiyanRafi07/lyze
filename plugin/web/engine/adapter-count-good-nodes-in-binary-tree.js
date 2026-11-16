// Count Good Nodes in Binary Tree — per-slug semantic adapter (Trees, LeetCode 1448).
// Walkthrough + notes gap: live judge record is plugin/data/shard-9.json id 1448
// (goodNodes(TreeNode root) -> int, exact mode, 3 official examples).
// Real DFS that carries the path maximum: a node is good iff it ties or beats
// every value on its root path. layout carries the recorded tree (nodes + sided
// edges) for the question visual. Sided edges are additive: the true
// 'left'/'right' side is re-derived by replaying the level-order queue rule
// (edgeSideMap); legacy 2-tuple edges still render.
//
// Convention follows plugin/web/engine/rotate-image-adapter.js:
// import semantic-core helpers, export `adapters` keyed by slug, build() returns the
// full honest event list (the single compaction pass is boundedFrames in semantic.js).
import { code, frame, treeInput, boundedFrames } from './semantic-core.js';

export const SLUG = 'count-good-nodes-in-binary-tree';

// Live judge signature (plugin/data shard record id 1448): goodNodes(TreeNode) -> int.
// Adapter signature MUST equal it exactly (name/return/param types) or the
// walkthrough throws in semantic.js.
export const SIGNATURE = {
  name: 'goodNodes',
  params: ['TreeNode'],
  return: 'int',
};

// Visual bound (honest disclosure): level arrays longer than 31 entries throw.
// The judge allows up to 100 nodes; longer inputs are rejected, never truncated.
export const MAX_LEVEL = 31;

function decodeArgs(args) {
  if (!Array.isArray(args) || args.length < 1) throw new Error('Walkthrough needs [root].');
  const raw = args[0];
  if (!Array.isArray(raw)) throw new Error('Root must be a level-order array, e.g. [3,1,4,3,null,1,5] ([] = empty tree).');
  if (raw.length > MAX_LEVEL) {
    throw new Error('Visual bound exceeded: level array length ' + raw.length + ' > ' + MAX_LEVEL + ' (no truncation applied)');
  }
  return raw;
}

const goodJava = code(`
[init] class Solution {
[init]     public int goodNodes(TreeNode root) {
[init]         return dfs(root, Integer.MIN_VALUE);
[done]     }
[guard]     private int dfs(TreeNode node, int maxSoFar) {
[guard]         if (node == null) return 0;
[visit]         int good = (node.val >= maxSoFar) ? 1 : 0;
[update]         int newMax = Math.max(maxSoFar, node.val);
[recurse]         int left = dfs(node.left, newMax);
[recurse]         int right = dfs(node.right, newMax);
[return]         return good + left + right;
[done]         // total good nodes counted
[done]     }
[done] }
`);

const goodCpp = code(`
[init] class Solution {
[init] public:
[init]     int goodNodes(TreeNode* root) {
[init]         return dfs(root, INT_MIN);
[done]     }
[guard] private:
[guard]     int dfs(TreeNode* node, int maxSoFar) {
[guard]         if (node == nullptr) return 0;
[visit]         int good = (node->val >= maxSoFar) ? 1 : 0;
[update]         int newMax = std::max(maxSoFar, node->val);
[recurse]         int left = dfs(node->left, newMax);
[recurse]         int right = dfs(node->right, newMax);
[return]         return good + left + right;
[done]         // total good nodes counted
[done]     }
[done] };
`);

const goodPseudo = code(`
[init] goodNodes(root):
[init]   return dfs(root, -infinity)
[guard]   dfs(node, maxSoFar):
[guard]     if node == null return 0
[visit]     good = 1 if node.val >= maxSoFar else 0
[update]     newMax = max(maxSoFar, node.val)
[recurse]     left = dfs(node.left, newMax)
[recurse]     right = dfs(node.right, newMax)
[return]     return good + left + right
[done]   answer is the total count of good nodes
`);

const EXPLAIN = {
  init: 'Start the depth-first walk at the root with the path maximum below any value.',
  guard: 'Stop at a missing child and contribute zero; there is no node to judge there.',
  visit: 'Test the current node against the carried path maximum; ties count as good.',
  update: 'Refresh the path maximum with the current value before descending to children.',
  recurse: 'Solve the left and right subtrees with the refreshed maximum and add the counts.',
  return: 'Bubble the subtree total upward so each ancestor adds its own point plus below.',
  done: 'Return the accumulated total: the number of root-path maxima in the tree.',
};

export const EXPLAIN_LINES = {
  java: {
    2: 'Entry delegates to dfs with MIN_VALUE so the root always counts as good.',
    5: 'Null guard: a missing child contributes 0 and ends that branch.',
    6: 'Good test uses >= so ties with the path maximum still count.',
    11: 'Completion marker: every visited node has added its point exactly once.',
  },
  cpp: {
    3: 'Entry delegates to dfs with INT_MIN so the root always counts as good.',
    7: 'Null guard: a missing child contributes 0 and ends that branch.',
    8: 'Good test uses >= so ties with the path maximum still count.',
    13: 'Completion marker: every visited node has added its point exactly once.',
  },
  pseudo: {
    1: 'Minus infinity seeds the path maximum so the root is always good.',
    4: 'Ties count: good is 1 whenever the node reaches the carried maximum.',
  },
};

/** Replays the exact queue rule of treeInput() to recover each created child's
 * true side ('left'/'right'). Needed because the shared layout drops null
 * placeholders, so a lone edge [parent, child] no longer tells which side the
 * child hangs on. Id assignment order matches treeInput() one-to-one. */
export function edgeSideMap(level) {
  const sides = new Map();
  if (!Array.isArray(level) || level.length === 0 || level[0] === null) return sides;
  let next = 1;
  const queue = [0];
  let cursor = 1;
  for (let head = 0; head < queue.length && cursor < level.length; head += 1) {
    const parent = queue[head];
    for (const side of ['left', 'right']) {
      if (cursor >= level.length) break;
      const v = level[cursor];
      cursor += 1;
      if (v === null || v === undefined) continue;
      sides.set(parent + '>' + next, side);
      queue.push(next);
      next += 1;
    }
  }
  return sides;
}

const ids = (list) => list.map((n) => n.id);

function stateOf({ cur = null, visited = [], path = [], frontier = [], vars = {} } = {}) {
  const cleanVars = {};
  for (const [k, v] of Object.entries(vars)) cleanVars[k] = typeof v === 'number' && !Number.isFinite(v) ? '-inf' : v;
  return {
    current: cur ? cur.id : null,
    visited: ids(visited),
    path: ids(path),
    frontier: ids(frontier),
    vars: JSON.parse(JSON.stringify(cleanVars)),
  };
}

// Every frame below is a REAL execution event: init, an empty-tree done, one
// guard per missing child, one visit + update per node, one recurse event per
// child direction, one return per node with its subtree subtotal, plus the final
// done. The running count only grows on visit events, never ahead of them.
function build(args) {
  const levelArray = decodeArgs(args);
  const { root, nodes, edges } = treeInput(levelArray);
  const sides = edgeSideMap(levelArray);
  const sidedEdges = edges.map(([p, c]) =>
    sides.has(p + '>' + c) ? [p, c, sides.get(p + '>' + c)] : [p, c]);
  const frames = [];
  const anchors = [];
  const visited = [];
  const path = [];
  let count = 0;

  const push = (step, label, note, s) =>
    frames.push(frame(step, label, note, stateOf(s)));

  push('init', 'Initialize',
    root === null
      ? 'Empty tree: there are no nodes to count.'
      : 'Start at root ' + root.value + '; path maximum starts below any value.',
    { cur: root, frontier: root ? [root] : [], vars: { maxSoFar: 'none yet', count: 0 } });
  if (root === null) {
    push('done', 'Return count', 'Empty tree holds 0 good node(s).',
      { visited, path, vars: { count: 0, answer: 0 } });
    return { kind: 'tree', layout: { nodes, edges: sidedEdges }, frames, anchors, result: 0 };
  }

  function dfs(node, maxSoFar) {
    if (node === null) {
      push('guard', 'Null child', 'Missing child contributes 0 good nodes.',
        { visited, path, vars: { maxSoFar, count } });
      return 0;
    }
    visited.push(node);
    path.push(node);
    const good = node.value >= maxSoFar ? 1 : 0;
    push('visit', 'Evaluate node',
      'Node ' + node.value + ' vs path max ' + maxSoFar + ': ' + (good ? 'good (+1)' : 'not good (+0)') + '.',
      { cur: node, visited, path, vars: { node: node.value, maxSoFar, good, count } });
    const newMax = Math.max(maxSoFar, node.value);
    if (good === 1) count += 1;
    anchors.push(frames.length);
    push('update', 'Refresh maximum',
      'Path maximum becomes ' + newMax + '; running count is ' + count + '.',
      { cur: node, visited, path, vars: { node: node.value, maxSoFar: newMax, count } });
    const leftTarget = node.left;
    const rightTarget = node.right;
    push('recurse', 'Solve left',
      leftTarget === null
        ? 'Node ' + node.value + ' has no left child.'
        : 'Count good nodes below left child ' + leftTarget.value + ' with max ' + newMax + '.',
      { cur: leftTarget, visited, path, frontier: leftTarget ? [leftTarget] : [], vars: { maxSoFar: newMax, count } });
    const left = dfs(node.left, newMax);
    push('recurse', 'Solve right',
      rightTarget === null
        ? 'Node ' + node.value + ' has no right child.'
        : 'Count good nodes below right child ' + rightTarget.value + ' with max ' + newMax + '.',
      { cur: rightTarget, visited, path, frontier: rightTarget ? [rightTarget] : [], vars: { maxSoFar: newMax, count, left } });
    const right = dfs(node.right, newMax);
    const sub = good + left + right;
    push('return', 'Return subtotal',
      'Subtree at ' + node.value + ' contributes ' + sub + ' good node(s).',
      { cur: node, visited, path, vars: { node: node.value, maxSoFar: newMax, count, subtotal: sub } });
    path.pop();
    return sub;
  }

  const total = dfs(root, Number.NEGATIVE_INFINITY);
  push('done', 'Return count', 'Tree holds ' + total + ' good node(s).',
    { visited, path, vars: { count: total, answer: total } });
  return { kind: 'tree', layout: { nodes, edges: sidedEdges }, frames, anchors, result: total };
}

export { boundedFrames };

export const adapters = {
  'count-good-nodes-in-binary-tree': {
    signature: { name: SIGNATURE.name, params: SIGNATURE.params.slice(), return: SIGNATURE.return },
    lesson: {
      idea: 'Carry the largest value seen on the root-to-node path; a node is good exactly when it reaches a new maximum.',
      trap: 'Comparing against the parent value instead of the whole path maximum misses higher ancestors above the parent.',
      time: 'O(n)',
      space: 'O(h)',
    },
    code: { java: goodJava, cpp: goodCpp, pseudo: goodPseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
};
