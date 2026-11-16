// Binary Tree Right Side View — per-slug semantic adapter (Trees, LeetCode 199).
// Walkthrough + notes gap: live judge record is plugin/data/shard-5.json id 199
// (rightSideView(TreeNode root) -> int[], exact mode, 4 official examples).
// BFS level by level: freeze the queue width before each round, drain exactly that
// many nodes, and record the last polled node of the round as the visible one.
// layout carries the recorded tree (nodes/edges) for the question visual.
//
// Convention follows plugin/web/engine/rotate-image-adapter.js:
// import semantic-core helpers, export `adapters` keyed by slug, build() returns the
// full honest event list (the single compaction pass is boundedFrames in semantic.js).
import { code, frame, boundedFrames } from './semantic-core.js';

export const SLUG = 'binary-tree-right-side-view';

// Live judge signature (plugin/data shard record id 199): rightSideView(TreeNode) -> int[].
// Adapter signature MUST equal it exactly (name/return/param types) or the
// walkthrough throws in semantic.js.
export const SIGNATURE = {
  name: 'rightSideView',
  params: ['TreeNode'],
  return: 'int[]',
};

// Visual bound (honest disclosure): level arrays longer than 31 entries throw.
// The judge allows up to 100 nodes; longer inputs are rejected, never truncated.
export const MAX_LEVEL = 31;

function treeInput(level) {
  if (!Array.isArray(level) || level.length > MAX_LEVEL || !level.every((v) => v === null || Number.isSafeInteger(v))) {
    throw new Error('Use a level-order tree of at most ' + MAX_LEVEL + ' entries for this walkthrough');
  }
  if (!level.length || level[0] === null) return { root: null, nodes: [], edges: [] };
  let id = 0;
  let cursor = 1;
  const root = { id: id++, value: level[0], left: null, right: null };
  const queue = [root];
  const nodes = [root];
  const edges = [];
  for (let head = 0; head < queue.length && cursor < level.length; head++) {
    const parent = queue[head];
    for (const side of ['left', 'right']) {
      if (cursor >= level.length) break;
      const value = level[cursor++];
      if (value === null) continue;
      const child = { id: id++, value, left: null, right: null };
      parent[side] = child;
      queue.push(child);
      nodes.push(child);
      edges.push([parent.id, child.id]);
    }
  }
  return { root, nodes: nodes.map(({ id, value }) => ({ id, value })), edges };
}

function decodeArgs(args) {
  if (!Array.isArray(args) || args.length !== 1) throw new Error('Walkthrough needs [root].');
  const level = args[0];
  if (!Array.isArray(level)) throw new Error('Root must be a level-order array, e.g. [1,2,3,null,5,null,4] ([] = empty tree).');
  return treeInput(level);
}

const rsvJava = code(`
[init] class Solution {
[init]     public List<Integer> rightSideView(TreeNode root) {
[init]         List<Integer> res = new ArrayList<>();
[guard]         if (root == null) return res;
[init]         Queue<TreeNode> queue = new LinkedList<>();
[init]         queue.offer(root);
[loop]         while (!queue.isEmpty()) {
[level]             int size = queue.size();
[level]             for (int i = 0; i < size; i++) {
[visit]                 TreeNode node = queue.poll();
[push]                 if (i == size - 1) res.add(node.val);
[childleft]                 if (node.left != null) queue.offer(node.left);
[childright]                 if (node.right != null) queue.offer(node.right);
[level]             }
[loop]         }
[done]         return res;
[done]     }
[done] }
`);

const rsvCpp = code(`
[init] class Solution {
[init] public:
[init]     vector<int> rightSideView(TreeNode* root) {
[init]         vector<int> res;
[guard]         if (root == nullptr) return res;
[init]         queue<TreeNode*> q;
[init]         q.push(root);
[loop]         while (!q.empty()) {
[level]             int size = (int)q.size();
[level]             for (int i = 0; i < size; ++i) {
[visit]                 TreeNode* node = q.front(); q.pop();
[push]                 if (i == size - 1) res.push_back(node->val);
[childleft]                 if (node->left != nullptr) q.push(node->left);
[childright]                 if (node->right != nullptr) q.push(node->right);
[level]             }
[loop]         }
[done]         return res;
[done]     }
[done] };
`);

const rsvPseudo = code(`
[init] rightSideView(root):
[init]   res = []
[guard]   if root == null return res
[init]   queue = [root]
[loop]   while queue is not empty
[level]     size = queue.length
[level]     for i from 0 to size - 1
[visit]       node = dequeue queue front
[push]       if i == size - 1 append node.val to res
[childleft]       if node.left exists enqueue node.left
[childright]       if node.right exists enqueue node.right
[done]   return res
`);

const EXPLAIN = {
  init: 'Open the level sweep with an empty view; the root (when present) is the only node known.',
  guard: 'Handle the empty tree early so a null root returns an empty view with no queue work.',
  loop: 'Start one queue round per level; the round continues while unprocessed nodes remain.',
  level: 'Freeze the current queue width so mid-round enqueues cannot leak into this level.',
  visit: 'Poll the front node of the current level in left-to-right order.',
  childleft: 'Queue a present left child for the next round; a missing child adds nothing.',
  childright: 'Queue a present right child for the next round; a missing child adds nothing.',
  push: 'Append this level last-polled value: the rightmost node standing at that depth.',
  done: 'Close the sweep; the view holds exactly one value per level, top to bottom.',
};

export const EXPLAIN_LINES = {
  java: {
    2: 'Candidate view, empty before any level is decided; grows by one entry per drained level.',
    3: 'Empty-tree guard: no levels exist, so [] is already the full answer.',
    7: 'Freeze the width: only these size nodes belong to this level.',
    10: 'Last of the frozen width is rightmost, so only it joins the view.',
  },
  cpp: {
    3: 'Candidate view, empty before any level is decided; grows by one entry per drained level.',
    4: 'Empty-tree guard: no levels exist, so the empty vector is already the answer.',
    8: 'Freeze the width: only these size nodes belong to this level.',
    11: 'Last of the frozen width is rightmost, so only it joins the view.',
  },
  pseudo: {
    1: 'Candidate view starts empty; each drained level appends exactly one value.',
    5: 'Frozen width for this round: children enqueued below belong to the next level.',
    8: 'Only the last position of the frozen width is visible from the right.',
  },
};

const ids = (list) => list.map((node) => node.id);

// Every frame below is a REAL execution event: init, empty-tree guard, one loop +
// level pair per depth, one visit per node, one push per level's last node, one
// enqueue event per present child, plus done. Queue snapshots are post-operation,
// so later levels are never revealed early.
function build(args) {
  const { root, nodes, edges } = decodeArgs(args);
  const frames = [];
  const anchors = [];
  const visited = [];
  const queue = [];
  const res = [];

  const snap = (extra = {}) => ({
    current: extra.cur ? extra.cur.id : null,
    visited: ids(visited),
    path: ids(extra.path || []),
    frontier: ids(extra.frontier || []),
    queue: ids(extra.queue || queue),
    vars: JSON.parse(JSON.stringify(extra.vars || {})),
  });
  const push = (step, label, note, s) => frames.push(frame(step, label, note, snap(s)));

  push('init', 'Initialize',
    root === null ? 'Empty tree: the right-side view is empty.' : 'Empty view; queue starts with root ' + root.value + '.',
    { cur: root, queue, vars: { result: [] } });

  if (root === null) {
    push('guard', 'Empty tree', 'Root is null, so the view stays empty.', { queue, vars: { result: [] } });
    push('done', 'Return view', 'Right-side view of an empty tree is [].', { queue, vars: { result: [] } });
    return { kind: 'tree', layout: { nodes, edges }, frames, anchors, result: [] };
  }

  queue.push(root);
  let depth = 0;
  while (queue.length > 0) {
    const size = queue.length;
    depth += 1;
    const levelNodes = queue.slice();
    push('loop', 'Level ' + depth + ' begins',
      'Queue holds ' + size + ' node(s); this round drains ' + size + '.',
      { queue, vars: { depth, size, result: res.slice() } });
    push('level', 'Freeze width ' + size,
      'Drain ' + size + ' node(s); the last polled is the visible one.',
      { path: levelNodes, queue, vars: { depth, size, result: res.slice() } });
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      visited.push(node);
      const last = i === size - 1;
      push('visit', 'Visit ' + node.value,
        'Poll ' + node.value + ' (position ' + (i + 1) + ' of ' + size + ')' + (last ? '; last of the level.' : '.'),
        { cur: node, path: levelNodes, queue, vars: { depth, size, i, result: res.slice() } });
      if (last) {
        res.push(node.value);
        anchors.push(frames.length);
        push('push', 'Record ' + node.value,
          'Rightmost of level ' + depth + ' is ' + node.value + '; view is [' + res.join(', ') + '].',
          { cur: node, path: levelNodes, queue, vars: { depth, size, i, result: res.slice() } });
      }
      if (node.left !== null) {
        queue.push(node.left);
        push('childleft', 'Enqueue ' + node.left.value,
          'Left child ' + node.left.value + ' waits for level ' + (depth + 1) + '.',
          { cur: node, path: levelNodes, queue, vars: { depth, size, i, result: res.slice() } });
      }
      if (node.right !== null) {
        queue.push(node.right);
        push('childright', 'Enqueue ' + node.right.value,
          'Right child ' + node.right.value + ' waits for level ' + (depth + 1) + '.',
          { cur: node, path: levelNodes, queue, vars: { depth, size, i, result: res.slice() } });
      }
    }
  }

  push('done', 'Return view',
    'Right side is [' + res.join(', ') + '] across ' + depth + ' level(s).',
    { queue, vars: { depth, result: res.slice() } });
  return { kind: 'tree', layout: { nodes, edges }, frames, anchors, result: res.slice() };
}

export { boundedFrames };

export const adapters = {
  'binary-tree-right-side-view': {
    signature: { name: SIGNATURE.name, params: SIGNATURE.params.slice(), return: SIGNATURE.return },
    lesson: {
      idea: 'BFS level by level: snapshot the queue size before each round, drain exactly that many nodes, and record the last node polled.',
      trap: 'Letting the queue grow during the round mixes levels; the rightmost node is the last of the frozen width, not the last child enqueued.',
      time: 'O(n)',
      space: 'O(w)',
    },
    code: { java: rsvJava, cpp: rsvCpp, pseudo: rsvPseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
};
