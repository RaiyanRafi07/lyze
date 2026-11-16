import { code, frame, treeInput, boundedFrames } from './semantic-core.js'

const MAX_ENTRIES = 63

function setup(args) {
  const raw = Array.isArray(args) ? args[0] : args
  let level = raw
  if (typeof raw === 'string') {
    try { level = JSON.parse(raw) } catch { throw new Error('Tree input must be level-order JSON') }
  }
  if (!Array.isArray(level)) throw new Error('Expected a level-order array for the tree')
  return treeInput(level, MAX_ENTRIES)
}

function ids(list) { return list.map(node => node.id) }

function state({ cur = null, visited = [], path = [], frontier = [], queue = [], vars = {}, stack = null, op = 'push', distances = null, dropped = null } = {}) {
  const out = {
    current: cur ? cur.id : null,
    visited: ids(visited),
    path: ids(path),
    frontier: ids(frontier),
    queue: ids(queue),
    vars: JSON.parse(JSON.stringify(vars))
  }
  if (distances) out.distances = { ...distances }
  if (dropped) out.dropped = dropped.slice()
  if (stack !== null) { out.stack = ids(stack); out.path = []; out.frontier = ids(stack) }
  return out
}

function finish(layout, frames, result) {
  const reduced = { frames }
  return {
    kind: 'tree',
    layout: { nodes: layout.nodes, edges: layout.edges },
    frames: reduced.frames,
    result
  }
}

const inorderCode = {
  java: code(`
[init] class Solution {
[init]     public List<Integer> inorderTraversal(TreeNode root) {
[init]         List<Integer> res = new ArrayList<>();
[init]         Deque<TreeNode> stack = new ArrayDeque<>();
[init]         TreeNode cur = root;
[loop]         while (cur != null || !stack.isEmpty()) {
[descend]             while (cur != null) {
[descend]                 stack.push(cur);
[descend]                 cur = cur.left;
[descend]             }
[pop]             cur = stack.pop();
[visit]             res.add(cur.val);
[visit]             cur = cur.right;
[loop]         }
[done]         return res;
[done]     }
[done] }
`),
  cpp: code(`
[init] class Solution {
[init] public:
[init]     vector<int> inorderTraversal(TreeNode* root) {
[init]         vector<int> res;
[init]         stack<TreeNode*> st;
[init]         TreeNode* cur = root;
[loop]         while (cur != nullptr || !st.empty()) {
[descend]             while (cur != nullptr) {
[descend]                 st.push(cur);
[descend]                 cur = cur->left;
[descend]             }
[pop]             cur = st.top(); st.pop();
[visit]             res.push_back(cur->val);
[visit]             cur = cur->right;
[loop]         }
[done]         return res;
[done]     }
[done] };
`),
  pseudo: code(`
[init] res = []; stack = []; cur = root
[loop] while cur != null or stack is not empty
[descend] while cur != null
[descend] push cur onto stack
[descend] cur = cur.left
[pop] cur = pop stack
[visit] append cur.val to res
[visit] cur = cur.right
[done] return res
`)
}

const preorderCode = {
  java: code(`
[init] class Solution {
[init]     public List<Integer> preorderTraversal(TreeNode root) {
[init]         List<Integer> res = new ArrayList<>();
[guard]         if (root == null) return res;
[init]         Deque<TreeNode> stack = new ArrayDeque<>();
[init]         stack.push(root);
[loop]         while (!stack.isEmpty()) {
[pop]             TreeNode cur = stack.pop();
[visit]             res.add(cur.val);
[pushright]             if (cur.right != null) stack.push(cur.right);
[pushleft]             if (cur.left != null) stack.push(cur.left);
[loop]         }
[done]         return res;
[done]     }
[done] }
`),
  cpp: code(`
[init] class Solution {
[init] public:
[init]     vector<int> preorderTraversal(TreeNode* root) {
[init]         vector<int> res;
[guard]         if (root == nullptr) return res;
[init]         stack<TreeNode*> st;
[init]         st.push(root);
[loop]         while (!st.empty()) {
[pop]             TreeNode* cur = st.top(); st.pop();
[visit]             res.push_back(cur->val);
[pushright]             if (cur->right) st.push(cur->right);
[pushleft]             if (cur->left) st.push(cur->left);
[loop]         }
[done]         return res;
[done]     }
[done] };
`),
  pseudo: code(`
[init] res = []; stack = []
[guard] if root == null return res
[init] push root onto stack
[loop] while stack is not empty
[pop] cur = pop stack
[visit] append cur.val to res
[pushright] if cur.right != null push cur.right
[pushleft] if cur.left != null push cur.left
[done] return res
`)
}

const postorderCode = {
  java: code(`
[init] class Solution {
[init]     public List<Integer> postorderTraversal(TreeNode root) {
[init]         List<Integer> res = new ArrayList<>();
[guard]         if (root == null) return res;
[init]         Deque<TreeNode> stack = new ArrayDeque<>();
[init]         stack.push(root);
[loop]         while (!stack.isEmpty()) {
[pop]             TreeNode cur = stack.pop();
[visit]             res.add(cur.val);
[pushleft]             if (cur.left != null) stack.push(cur.left);
[pushright]             if (cur.right != null) stack.push(cur.right);
[loop]         }
[done]         Collections.reverse(res);
[done]         return res;
[done]     }
[done] }
`),
  cpp: code(`
[init] class Solution {
[init] public:
[init]     vector<int> postorderTraversal(TreeNode* root) {
[init]         vector<int> res;
[guard]         if (root == nullptr) return res;
[init]         stack<TreeNode*> st;
[init]         st.push(root);
[loop]         while (!st.empty()) {
[pop]             TreeNode* cur = st.top(); st.pop();
[visit]             res.push_back(cur->val);
[pushleft]             if (cur->left) st.push(cur->left);
[pushright]             if (cur->right) st.push(cur->right);
[loop]         }
[done]         reverse(res.begin(), res.end());
[done]         return res;
[done]     }
[done] };
`),
  pseudo: code(`
[init] res = []; stack = []
[guard] if root == null return res
[init] push root onto stack
[loop] while stack is not empty
[pop] cur = pop stack
[visit] append cur.val to res
[pushleft] if cur.left != null push cur.left
[pushright] if cur.right != null push cur.right
[done] reverse res
[done] return res
`)
}

const depthCode = {
  java: code(`
[init] class Solution {
[init]     public int maxDepth(TreeNode root) {
[guard]         if (root == null) return 0;
[init]         Queue<TreeNode> queue = new LinkedList<>();
[init]         queue.offer(root);
[init]         int depth = 0;
[loop]         while (!queue.isEmpty()) {
[level]             int size = queue.size();
[level]             depth++;
[visit]             for (int i = 0; i < size; i++) {
[visit]                 TreeNode node = queue.poll();
[childleft]                 if (node.left != null) queue.offer(node.left);
[childright]                 if (node.right != null) queue.offer(node.right);
[visit]             }
[loop]         }
[done]         return depth;
[done]     }
[done] }
`),
  cpp: code(`
[init] class Solution {
[init] public:
[init]     int maxDepth(TreeNode* root) {
[guard]         if (root == nullptr) return 0;
[init]         queue<TreeNode*> q;
[init]         q.push(root);
[init]         int depth = 0;
[loop]         while (!q.empty()) {
[level]             int size = q.size();
[level]             depth++;
[visit]             for (int i = 0; i < size; ++i) {
[visit]                 TreeNode* node = q.front(); q.pop();
[childleft]                 if (node->left) q.push(node->left);
[childright]                 if (node->right) q.push(node->right);
[visit]             }
[loop]         }
[done]         return depth;
[done]     }
[done] };
`),
  pseudo: code(`
[init] queue = []; depth = 0
[guard] if root == null return 0
[init] push root into queue
[loop] while queue is not empty
[level] size = queue.length; depth = depth + 1
[visit] for i from 0 to size - 1
[visit] node = queue.poll()
[childleft] if node.left push node.left
[childright] if node.right push node.right
[done] return depth
`)
}

const levelCode = {
  java: code(`
[init] class Solution {
[init]     public List<List<Integer>> levelOrder(TreeNode root) {
[init]         List<List<Integer>> res = new ArrayList<>();
[guard]         if (root == null) return res;
[init]         Queue<TreeNode> queue = new LinkedList<>();
[init]         queue.offer(root);
[loop]         while (!queue.isEmpty()) {
[level]             int size = queue.size();
[level]             List<Integer> level = new ArrayList<>();
[visit]             for (int i = 0; i < size; i++) {
[visit]                 TreeNode node = queue.poll();
[visit]                 level.add(node.val);
[childleft]                 if (node.left != null) queue.offer(node.left);
[childright]                 if (node.right != null) queue.offer(node.right);
[visit]             }
[push]             res.add(level);
[loop]         }
[done]         return res;
[done]     }
[done] }
`),
  cpp: code(`
[init] class Solution {
[init] public:
[init]     vector<vector<int>> levelOrder(TreeNode* root) {
[init]         vector<vector<int>> res;
[guard]         if (root == nullptr) return res;
[init]         queue<TreeNode*> q;
[init]         q.push(root);
[loop]         while (!q.empty()) {
[level]             int size = q.size();
[level]             vector<int> level;
[visit]             for (int i = 0; i < size; ++i) {
[visit]                 TreeNode* node = q.front(); q.pop();
[visit]                 level.push_back(node->val);
[childleft]                 if (node->left) q.push(node->left);
[childright]                 if (node->right) q.push(node->right);
[visit]             }
[push]             res.push_back(level);
[loop]         }
[done]         return res;
[done]     }
[done] };
`),
  pseudo: code(`
[init] res = []; queue = []
[guard] if root == null return res
[init] push root into queue
[loop] while queue is not empty
[level] size = queue.length; level = []
[visit] for i from 0 to size - 1
[visit] node = queue.poll(); append node.val to level
[childleft] if node.left push node.left
[childright] if node.right push node.right
[push] append level to res
[done] return res
`)
}

const bstSearchCode = {
  java: code(`
[init] class Solution {
[init]     public TreeNode searchBST(TreeNode root, int val) {
[init]         TreeNode cur = root;
[compare]         while (cur != null) {
[compare]             if (cur.val == val) {
[found]                 return cur;
[compare]             }
[compare]             if (val < cur.val) {
[go-left]                 cur = cur.left;
[go-left]             } else {
[go-right]                 cur = cur.right;
[go-right]             }
[compare]         }
[missing]         return null;
[done]         // answer: the found subtree, or null when absent
[done]     }
[done] }
`),
  cpp: code(`
[init] class Solution {
[init] public:
[init]     TreeNode* searchBST(TreeNode* root, int val) {
[init]         TreeNode* cur = root;
[compare]         while (cur != nullptr) {
[compare]             if (cur->val == val) {
[found]                 return cur;
[compare]             }
[compare]             if (val < cur->val) {
[go-left]                 cur = cur->left;
[go-left]             } else {
[go-right]                 cur = cur->right;
[go-right]             }
[compare]         }
[missing]         return nullptr;
[done]         // answer: the found subtree, or nullptr when absent
[done]     }
[done] };
`),
  pseudo: code(`
[init] cur = root
[compare] while cur != null
[compare] if cur.val == val
[found] return cur
[compare] if val < cur.val
[go-left] cur = cur.left
[go-left] else
[go-right] cur = cur.right
[missing] return null
[done] return subtree rooted at found node (or null)
`)
};

const validateCode = {
  java: code(`
[init] class Solution {
[init]     public boolean isValidBST(TreeNode root) {
[init]         return check(root, null, null);
[init]     }
[visit]     private boolean check(TreeNode node, Long lo, Long hi) {
[visit]         if (node == null) return true;
[violation]         if (lo != null && node.val <= lo) return false;
[violation]         if (hi != null && node.val >= hi) return false;
[check]         boolean left = check(node.left, lo, (long) node.val);
[check]         boolean right = check(node.right, (long) node.val, hi);
[done]         return left && right;
[done]     }
[done] }
`),
  cpp: code(`
[init] class Solution {
[init] public:
[init]     bool isValidBST(TreeNode* root) {
[init]         return check(root, nullptr, nullptr);
[init]     }
[visit] private:
[visit]     bool check(TreeNode* node, long* lo, long* hi) {
[visit]         if (node == nullptr) return true;
[violation]         if (lo != nullptr && node->val <= *lo) return false;
[violation]         if (hi != nullptr && node->val >= *hi) return false;
[check]         long v = node->val;
[check]         bool left = check(node->left, lo, &v);
[check]         bool right = check(node->right, &v, hi);
[done]         return left && right;
[done]     }
[done] };
`),
  pseudo: code(`
[init] isValidBST(root): return check(root, null, null)
[visit] check(node, lo, hi):
[visit] if node == null return true
[violation] if lo != null and node.val <= lo return false
[violation] if hi != null and node.val >= hi return false
[check] left = check(node.left, lo, node.val)
[check] right = check(node.right, node.val, hi)
[done] return left and right
[done] verdict is true only if every node passed its bounds
`)
};

function buildValidateBST(args) {
  if (!Array.isArray(args) || args.length < 1) throw new Error('validate-binary-search-tree expects [level]');
  const rawLevel = args[0];
  let levelLen = -1;
  if (Array.isArray(rawLevel)) levelLen = rawLevel.length;
  else if (typeof rawLevel === 'string') {
    try { levelLen = JSON.parse(rawLevel).length; } catch { throw new Error('Tree input must be level-order JSON'); }
  }
  if (levelLen > 31) throw new Error('Visual bound exceeded: level array length ' + levelLen + ' > 31 (no truncation applied)');
  const { root, nodes, edges } = setup(args);
  const frames = [];
  const visited = [];
  const path = [];
  const show = (v, d) => (v === null || v === undefined ? d : String(v));
  const bounds = (lo, hi) => `(${show(lo, '-inf')},${show(hi, '+inf')})`;

  frames.push(frame('init', 'Initialize',
    root === null
      ? 'Empty tree is a valid BST'
      : `Start at root ${root.value} with open bounds (-inf,+inf)`,
    state({ cur: root, visited, path, vars: { lo: null, hi: null } })));

  if (root === null) {
    frames.push(frame('done', 'Return verdict', 'Verdict valid: empty tree holds',
      state({ visited, path, vars: { verdict: true } })));
    return finish({ nodes, edges }, frames, true);
  }

  function dfs(node, lo, hi) {
    visited.push(node);
    path.push(node);
    frames.push(frame('visit', 'Visit node', `Visit node ${node.value} in ${bounds(lo, hi)}`,
      state({ cur: node, visited, path, vars: { lo, hi, val: node.value } })));
    if ((lo !== null && node.value <= lo) || (hi !== null && node.value >= hi)) {
      frames.push(frame('violation', 'Bound violation', `Violation: ${node.value} breaks ${bounds(lo, hi)}`,
        state({ cur: node, visited, path, vars: { lo, hi, val: node.value, verdict: false } })));
      path.pop();
      return false;
    }
    frames.push(frame('check', 'Bounds pass', `Pass: ${node.value} inside ${bounds(lo, hi)}; check children`,
      state({ cur: node, visited, path, vars: { lo, hi, val: node.value } })));
    let leftOk = true;
    let rightOk = true;
    if (node.left !== null) leftOk = dfs(node.left, lo, node.value);
    if (node.right !== null) rightOk = dfs(node.right, node.value, hi);
    path.pop();
    return leftOk && rightOk;
  }

  const verdict = dfs(root, null, null);
  frames.push(frame('done', 'Return verdict',
    verdict ? 'Verdict valid: every node passed its bounds' : 'Verdict invalid: bound violation found',
    state({ visited, path, vars: { verdict } })));
  return finish({ nodes, edges }, frames, verdict);
}

function subtreeLevelOrder(found) {
  if (!found) return [];
  const out = [];
  const queue = [found];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node === null || node === undefined) {
      out.push(null);
      continue;
    }
    out.push(node.value);
    queue.push(node.left ?? null);
    queue.push(node.right ?? null);
  }
  while (out.length > 0 && out[out.length - 1] === null) out.pop();
  return out;
}

function buildBSTSearch(args) {
  if (!Array.isArray(args) || args.length < 2) throw new Error('search-in-a-binary-search-tree expects [level, val]');
  const rawLevel = args[0];
  let levelLen = -1;
  if (Array.isArray(rawLevel)) levelLen = rawLevel.length;
  else if (typeof rawLevel === 'string') {
    try { levelLen = JSON.parse(rawLevel).length; } catch { throw new Error('Tree input must be level-order JSON'); }
  }
  if (levelLen > 31) throw new Error('Visual bound exceeded: level array length ' + levelLen + ' > 31 (no truncation applied)');
  const { root, nodes, edges } = setup(args);
  const val = args[1];
  if (!Number.isSafeInteger(val)) throw new Error('search-in-a-binary-search-tree expects an integer target val');
  const frames = [];
  const visited = [];
  const path = [];

  frames.push(frame('init', 'Initialize',
    root === null
      ? `Empty tree: search for ${val} ends immediately`
      : `Start at root ${root.value}; search for ${val}`,
    state({ cur: root, visited, path, vars: { val, result: [] } })));

  if (root === null) {
    frames.push(frame('missing', 'Missing', `Tree is empty, so ${val} is not present`, state({ visited, path, vars: { val, result: [] } })));
    frames.push(frame('done', 'Return result', 'Return [] for a missing value', state({ visited, path, vars: { val, result: [] } })));
    return finish({ nodes, edges }, frames, []);
  }

  let cur = root;
  while (cur !== null) {
    visited.push(cur);
    path.push(cur);
    frames.push(frame('compare', 'Compare', `Compare node ${cur.value} with target ${val}`, state({ cur, visited, path, vars: { val } })));
    if (cur.value === val) {
      const result = subtreeLevelOrder(cur);
      frames.push(frame('found', 'Found', `Node ${val} found; subtree holds ${result.length} value(s)`, state({ cur, visited, path, vars: { val, result: result.slice() } })));
      frames.push(frame('done', 'Return result', `Return subtree rooted at ${val}`, state({ cur, visited, path, vars: { val, result: result.slice() } })));
      return finish({ nodes, edges }, frames, result);
    }
    if (val < cur.value) {
      const next = cur.left;
      frames.push(frame('go-left', 'Go left', `${val} < ${cur.value}, so descend to the left child`, state({ cur: next, visited, path, vars: { val } })));
      cur = next;
    } else {
      const next = cur.right;
      frames.push(frame('go-right', 'Go right', `${val} > ${cur.value}, so descend to the right child`, state({ cur: next, visited, path, vars: { val } })));
      cur = next;
    }
  }

  frames.push(frame('missing', 'Missing', `Reached null: ${val} is not in this BST`, state({ visited, path, vars: { val, result: [] } })));
  frames.push(frame('done', 'Return result', 'Return [] for a missing value', state({ visited, path, vars: { val, result: [] } })));
  return finish({ nodes, edges }, frames, []);
}

const invertCode = {
  java: code(`
[init] class Solution {
[init]     public TreeNode invertTree(TreeNode root) {
[init]         // mirror every node starting here; the walk below swaps children
[guard]         if (root == null) return null;
[visit]         TreeNode left = root.left;
[swap]         root.left = root.right;
[swap]         root.right = left;
[recleft]         invertTree(root.left);
[recright]         invertTree(root.right);
[done]         return root;
[done]     }
[done] }
`),
  cpp: code(`
[init] class Solution {
[init] public:
[init]     TreeNode* invertTree(TreeNode* root) {
[init]         // mirror every node starting here; the walk below swaps children
[guard]         if (root == nullptr) return nullptr;
[visit]         TreeNode* left = root->left;
[swap]         root->left = root->right;
[swap]         root->right = left;
[recleft]         invertTree(root->left);
[recright]         invertTree(root->right);
[done]         return root;
[done]     }
[done] };
`),
  pseudo: code(`
[init] invertTree(root):
[guard] if root == null return null
[visit] left = root.left
[swap] root.left = root.right
[swap] root.right = left
[recleft] invertTree(root.left)
[recright] invertTree(root.right)
[done] return root
`)
};

function buildInvert(args) {
  if (!Array.isArray(args) || args.length < 1) throw new Error('invert-binary-tree expects [level]');
  const rawLevel = args[0];
  let levelLen = -1;
  if (Array.isArray(rawLevel)) levelLen = rawLevel.length;
  else if (typeof rawLevel === 'string') {
    try { levelLen = JSON.parse(rawLevel).length; } catch { throw new Error('Tree input must be level-order JSON'); }
  }
  if (levelLen > 31) throw new Error('Visual bound exceeded: level array length ' + levelLen + ' > 31 (no truncation applied)');
  const { root, nodes, edges } = setup(args);
  const frames = [];
  const visited = [];
  const path = [];
  let swapped = 0;

  frames.push(frame('init', 'Initialize',
    root === null
      ? 'Empty tree: nothing to mirror'
      : `Start at root ${root.value}; mirror every node`,
    state({ cur: root, visited, path, vars: { swapped } })));

  if (root === null) {
    frames.push(frame('guard', 'Null root', 'Root is null, so the mirror is empty',
      state({ visited, path, vars: { swapped } })));
    frames.push(frame('done', 'Return result', 'Empty tree mirrors to []',
      state({ visited, path, vars: { swapped, result: [] } })));
    return finish({ nodes, edges }, frames, []);
  }

  function mirror(node) {
    if (node === null) {
      frames.push(frame('guard', 'Null child', 'Null child needs no swap; return',
        state({ visited, path, vars: { swapped } })));
      return;
    }
    visited.push(node);
    path.push(node);
    frames.push(frame('visit', 'Visit node', `Visit node ${node.value}; swap its children`,
      state({ cur: node, visited, path, vars: { swapped } })));
    const tmp = node.left;
    node.left = node.right;
    node.right = tmp;
    swapped += 1;
    const l = node.left === null ? 'null' : String(node.left.value);
    const r = node.right === null ? 'null' : String(node.right.value);
    frames.push(frame('swap', 'Swap children', `Swapped children of ${node.value}: left=${l} right=${r}`,
      state({ cur: node, visited, path, vars: { swapped } })));
    frames.push(frame('recleft', 'Recurse left', `Mirror the left subtree of ${node.value}`,
      state({ cur: node.left, visited, path, vars: { swapped } })));
    mirror(node.left);
    frames.push(frame('recright', 'Recurse right', `Mirror the right subtree of ${node.value}`,
      state({ cur: node.right, visited, path, vars: { swapped } })));
    mirror(node.right);
    path.pop();
  }

  mirror(root);
  const result = subtreeLevelOrder(root);
  frames.push(frame('done', 'Return root', `Mirror done: ${swapped} swap(s) made`,
    state({ visited, path, vars: { swapped, result: result.slice() } })));
  return finish({ nodes, edges }, frames, result);
}

const symCode = {
  java: code(`
[init] import java.util.ArrayDeque;
[init] import java.util.Deque;
[init] class Solution {
[init]     public boolean isSymmetric(TreeNode root) {
[init]         if (root == null) return true;
[init]         Deque<TreeNode[]> queue = new ArrayDeque<>();
[init]         queue.offer(new TreeNode[]{root.left, root.right});
[check]         while (!queue.isEmpty()) {
[check]             TreeNode[] pair = queue.poll();
[check]             TreeNode left = pair[0];
[check]             TreeNode right = pair[1];
[skip]             if (left == null && right == null) continue;
[mismatch]             if (left == null || right == null) return false;
[mismatch]             if (left.val != right.val) return false;
[enqueue]             queue.offer(new TreeNode[]{left.left, right.right});
[enqueue]             queue.offer(new TreeNode[]{left.right, right.left});
[check]         }
[done]         return true;
[done]     }
[done] }
`),
  cpp: code(`
[init] #include <queue>
[init] #include <utility>
[init] class Solution {
[init] public:
[init]     bool isSymmetric(TreeNode* root) {
[init]         if (root == nullptr) return true;
[init]         std::queue<std::pair<TreeNode*, TreeNode*>> q;
[init]         q.emplace(root->left, root->right);
[check]         while (!q.empty()) {
[check]             auto pr = q.front(); q.pop();
[check]             TreeNode* left = pr.first;
[check]             TreeNode* right = pr.second;
[skip]             if (left == nullptr && right == nullptr) continue;
[mismatch]             if (left == nullptr || right == nullptr) return false;
[mismatch]             if (left->val != right->val) return false;
[enqueue]             q.emplace(left->left, right->right);
[enqueue]             q.emplace(left->right, right->left);
[check]         }
[done]         return true;
[done]     }
[done] };
`),
  pseudo: code(`
[init] if root == null return true
[init] queue = [(root.left, root.right)]
[check] while queue is not empty
[check] (a, b) = dequeue queue
[skip] if a == null and b == null continue
[mismatch] if a == null or b == null return false
[mismatch] if a.val != b.val return false
[enqueue] enqueue (a.left, b.right)
[enqueue] enqueue (a.right, b.left)
[done] return true
`)
};

function fmtTreeNode(node) {
  return node === null || node === undefined ? 'null' : String(node.value);
}

function buildSymmetric(args) {
  if (!Array.isArray(args) || args.length < 1) throw new Error('symmetric-tree expects [level]');
  const rawLevel = args[0];
  let levelLen = -1;
  if (Array.isArray(rawLevel)) levelLen = rawLevel.length;
  else if (typeof rawLevel === 'string') {
    try { levelLen = JSON.parse(rawLevel).length; } catch { throw new Error('Tree input must be level-order JSON'); }
  }
  if (levelLen > 31) throw new Error('Visual bound exceeded: level array length ' + levelLen + ' > 31 (no truncation applied)');
  const { root, nodes, edges } = setup(args);
  const frames = [];
  const visited = [];
  const path = [];

  if (root === null) {
    frames.push(frame('init', 'Initialize', 'Empty tree: no pairs to check', state({ visited, path, vars: { qsize: 0 } })));
    frames.push(frame('done', 'Return verdict', 'Verdict symmetric: empty tree is mirror', state({ visited, path, vars: { verdict: true } })));
    return finish({ nodes, edges }, frames, true);
  }

  visited.push(root);
  path.push(root);
  const queuePairs = [[root.left, root.right]];
  const flat = () => queuePairs.flat().filter(Boolean);
  frames.push(frame('init', 'Initialize', `Start at root ${root.value}; queue holds pair (${fmtTreeNode(root.left)},${fmtTreeNode(root.right)})`, state({ cur: root, visited, path, queue: flat(), vars: { qsize: 1 } })));

  while (queuePairs.length > 0) {
    const pair = queuePairs.shift();
    const a = pair[0];
    const b = pair[1];
    const cur = a !== null ? a : b;
    frames.push(frame('check', 'Check pair', `Check pair (${fmtTreeNode(a)},${fmtTreeNode(b)})`, state({ cur, visited, path, queue: flat(), vars: { a: fmtTreeNode(a), b: fmtTreeNode(b), qsize: queuePairs.length } })));
    if (a === null && b === null) {
      frames.push(frame('skip', 'Both null', 'Both null: mirror holds, keep checking', state({ cur, visited, path, queue: flat(), vars: { a: 'null', b: 'null', qsize: queuePairs.length } })));
      continue;
    }
    if (a === null || b === null) {
      const bad = a === null ? fmtTreeNode(b) : fmtTreeNode(a);
      frames.push(frame('mismatch', 'One side null', `Mismatch: one null vs ${bad}; not mirror`, state({ cur, visited, path, queue: flat(), vars: { a: fmtTreeNode(a), b: fmtTreeNode(b), verdict: false } })));
      frames.push(frame('done', 'Return verdict', 'Verdict not symmetric: null mismatch found', state({ cur, visited, path, queue: flat(), vars: { verdict: false } })));
      return finish({ nodes, edges }, frames, false);
    }
    if (a.value !== b.value) {
      frames.push(frame('mismatch', 'Values differ', `Mismatch: ${a.value} vs ${b.value}; mirror breaks`, state({ cur: a, visited, path, queue: flat(), vars: { a: a.value, b: b.value, verdict: false } })));
      frames.push(frame('done', 'Return verdict', 'Verdict not symmetric: values differ here', state({ cur: a, visited, path, queue: flat(), vars: { verdict: false } })));
      return finish({ nodes, edges }, frames, false);
    }
    visited.push(a);
    if (b !== a) visited.push(b);
    frames.push(frame('enqueue', 'Enqueue mirrors', `Match ${a.value}==${b.value}: queue (${fmtTreeNode(a.left)},${fmtTreeNode(b.right)}) plus (${fmtTreeNode(a.right)},${fmtTreeNode(b.left)})`, state({ cur: a, visited, path, queue: flat(), vars: { a: a.value, b: b.value, qsize: queuePairs.length } })));
    queuePairs.push([a.left, b.right]);
    queuePairs.push([a.right, b.left]);
  }

  frames.push(frame('done', 'Return verdict', 'Verdict symmetric: every mirror pair matched', state({ visited, path, queue: [], vars: { verdict: true } })));
  return finish({ nodes, edges }, frames, true);
}

const minDepthCode = {
  java: code(`
[init] class Solution {
[init]     public int minDepth(TreeNode root) {
[guard]         if (root == null) return 0;
[init]         Queue<TreeNode> queue = new LinkedList<>();
[init]         queue.offer(root);
[init]         int depth = 0;
[loop]         while (!queue.isEmpty()) {
[level]             int size = queue.size();
[level]             depth++;
[visit]             for (int i = 0; i < size; i++) {
[visit]                 TreeNode node = queue.poll();
[leaf]                 if (node.left == null && node.right == null) return depth;
[childleft]                 if (node.left != null) queue.offer(node.left);
[childright]                 if (node.right != null) queue.offer(node.right);
[visit]             }
[loop]         }
[done]         return depth;
[done]     }
[done] }
`),
  cpp: code(`
[init] class Solution {
[init] public:
[init]     int minDepth(TreeNode* root) {
[guard]         if (root == nullptr) return 0;
[init]         queue<TreeNode*> q;
[init]         q.push(root);
[init]         int depth = 0;
[loop]         while (!q.empty()) {
[level]             int size = (int)q.size();
[level]             depth++;
[visit]             for (int i = 0; i < size; ++i) {
[visit]                 TreeNode* node = q.front(); q.pop();
[leaf]                 if (node->left == nullptr && node->right == nullptr) return depth;
[childleft]                 if (node->left != nullptr) q.push(node->left);
[childright]                 if (node->right != nullptr) q.push(node->right);
[visit]             }
[loop]         }
[done]         return depth;
[done]     }
[done] };
`),
  pseudo: code(`
[init] queue = [root]; depth = 0
[guard] if root == null return 0
[init] push root into queue
[loop] while queue is not empty
[level] size = queue.length; depth = depth + 1
[visit] for each of the size nodes in order
[visit] node = dequeue queue front
[leaf] if node has no left and no right return depth
[childleft] if node.left exists enqueue node.left
[childright] if node.right exists enqueue node.right
[done] return depth
`)
};

function buildMinDepth(args) {
  if (!Array.isArray(args) || args.length < 1) throw new Error('minimum-depth-of-binary-tree expects [level]');
  const rawLevel = args[0];
  let levelLen = -1;
  if (Array.isArray(rawLevel)) levelLen = rawLevel.length;
  else if (typeof rawLevel === 'string') {
    try { levelLen = JSON.parse(rawLevel).length; } catch { throw new Error('Tree input must be level-order JSON'); }
  }
  if (levelLen > 31) throw new Error('Visual bound exceeded: level array length ' + levelLen + ' > 31 (no truncation applied)');
  const { root, nodes, edges } = setup(args);
  const frames = [];
  const visited = [];
  const queue = [];
  let depth = 0;
  frames.push(frame('init', 'Initialize', 'Queue starts empty with depth zero',
    state({ cur: root, visited, queue, vars: { depth: 0 } })));
  if (root === null) {
    frames.push(frame('guard', 'Empty tree', 'Null root means min depth is zero',
      state({ visited, queue, vars: { depth: 0 } })));
  } else {
    queue.push(root);
    frames.push(frame('init', 'Enqueue root', 'Root opens level one',
      state({ cur: root, visited, queue, vars: { depth: 0 } })));
    let found = 0;
    while (queue.length > 0 && found === 0) {
      const size = queue.length;
      depth += 1;
      frames.push(frame('level', 'Next level', 'Drain ' + size + ' node(s) at depth ' + depth,
        state({ visited, queue, vars: { depth, size } })));
      for (let i = 0; i < size; i++) {
        const node = queue.shift();
        visited.push(node);
        frames.push(frame('visit', 'Visit node', 'Poll node ' + node.value + ' at depth ' + depth,
          state({ cur: node, visited, queue, vars: { depth, size } })));
        if (node.left === null && node.right === null) {
          frames.push(frame('leaf', 'First leaf', 'Leaf ' + node.value + ' ends search at depth ' + depth,
            state({ cur: node, visited, queue, vars: { depth } })));
          found = depth;
          break;
        }
        if (node.left !== null) {
          queue.push(node.left);
          frames.push(frame('childleft', 'Enqueue left', 'Left child ' + node.left.value + ' waits next level',
            state({ cur: node, visited, queue, vars: { depth, size } })));
        }
        if (node.right !== null) {
          queue.push(node.right);
          frames.push(frame('childright', 'Enqueue right', 'Right child ' + node.right.value + ' waits next level',
            state({ cur: node, visited, queue, vars: { depth, size } })));
        }
      }
    }
    depth = found || depth;
  }
  frames.push(frame('done', 'Return depth', 'Shortest root to leaf path is ' + depth,
    state({ visited, queue, vars: { depth } })));
  return finish({ nodes, edges }, frames, depth);
}

const pathSumCode = {
  java: code(`
[init] class Solution {
[init]     public boolean hasPathSum(TreeNode root, int targetSum) {
[init]         if (root == null) return false;
[init]         return dfs(root, targetSum);
[init]     }
[visit]     private boolean dfs(TreeNode node, int remaining) {
[visit]         remaining = remaining - node.val;
[visit]         if (node.left == null && node.right == null) {
[hit]             if (remaining == 0) return true;
[miss]             if (remaining != 0) return false;
[visit]         }
[recurse]         if (node.left != null && dfs(node.left, remaining)) return true;
[recurse]         if (node.right != null && dfs(node.right, remaining)) return true;
[miss]         return false;
[done]         // verdict: true only when a root-to-leaf path consumes exactly targetSum
[done]     }
[done] }
`),
  cpp: code(`
[init] class Solution {
[init] public:
[init]     bool hasPathSum(TreeNode* root, int targetSum) {
[init]         if (root == nullptr) return false;
[init]         return dfs(root, targetSum);
[init]     }
[visit] private:
[visit]     bool dfs(TreeNode* node, int remaining) {
[visit]         remaining = remaining - node->val;
[visit]         if (node->left == nullptr && node->right == nullptr) {
[hit]             if (remaining == 0) return true;
[miss]             if (remaining != 0) return false;
[visit]         }
[recurse]         if (node->left != nullptr && dfs(node->left, remaining)) return true;
[recurse]         if (node->right != nullptr && dfs(node->right, remaining)) return true;
[miss]         return false;
[done]         // verdict: true only when a root-to-leaf path consumes exactly targetSum
[done]     }
[done] };
`),
  pseudo: code(`
[init] hasPathSum(root, target):
[init] if root == null return false
[init] return dfs(root, target)
[visit] dfs(node, remaining):
[visit] remaining = remaining - node.val
[visit] if node is a leaf:
[hit] if remaining == 0 return true
[miss] if remaining != 0 return false
[recurse] if left exists and dfs(left, remaining) return true
[recurse] if right exists and dfs(right, remaining) return true
[miss] return false
[done] verdict is true iff some root-to-leaf path sums to target
`)
};

function buildPathSum(args) {
  if (!Array.isArray(args) || args.length < 2) throw new Error('path-sum expects [level, targetSum]');
  const rawLevel = args[0];
  let levelLen = -1;
  if (Array.isArray(rawLevel)) levelLen = rawLevel.length;
  else if (typeof rawLevel === 'string') {
    try { levelLen = JSON.parse(rawLevel).length; } catch { throw new Error('Tree input must be level-order JSON'); }
  }
  if (levelLen > 31) throw new Error('Visual bound exceeded: level array length ' + levelLen + ' > 31 (no truncation applied)');
  const { root, nodes, edges } = setup(args);
  let target = args[1];
  if (typeof target === 'string') {
    if (target.trim() === '') throw new Error('path-sum expects an integer targetSum');
    const n = Number(target);
    if (!Number.isSafeInteger(n)) throw new Error('path-sum expects an integer targetSum');
    target = n;
  }
  if (!Number.isSafeInteger(target)) throw new Error('path-sum expects an integer targetSum');
  const frames = [];
  const visited = [];
  const path = [];

  frames.push(frame('init', 'Initialize',
    root === null
      ? 'Empty tree: no root-to-leaf path exists'
      : `Start at root ${root.value}; need target ${target}`,
    state({ cur: root, visited, path, vars: { target, remaining: target } })));

  if (root === null) {
    frames.push(frame('done', 'Return verdict', 'Verdict false: empty tree has no leaf path',
      state({ visited, path, vars: { target, verdict: false } })));
    return finish({ nodes, edges }, frames, false);
  }

  function dfs(node, remBefore) {
    visited.push(node);
    path.push(node);
    const remAfter = remBefore - node.value;
    frames.push(frame('visit', 'Visit node', `Visit ${node.value}; ${remBefore}-${node.value}=${remAfter} left`,
      state({ cur: node, visited, path, vars: { target, remaining: remAfter, val: node.value } })));
    const isLeaf = node.left === null && node.right === null;
    if (isLeaf) {
      if (remAfter === 0) {
        frames.push(frame('hit', 'Leaf hit', `Leaf ${node.value} hits: remainder 0 matches target`,
          state({ cur: node, visited, path, vars: { target, remaining: remAfter, verdict: true } })));
        path.pop();
        return true;
      }
      frames.push(frame('miss', 'Leaf miss', `Leaf ${node.value} misses: remainder ${remAfter} left`,
        state({ cur: node, visited, path, vars: { target, remaining: remAfter, verdict: false } })));
      path.pop();
      return false;
    }
    if (node.left !== null) {
      frames.push(frame('recurse', 'Recurse left', `Recurse left into ${node.left.value} with ${remAfter}`,
        state({ cur: node.left, visited, path, vars: { target, remaining: remAfter } })));
      if (dfs(node.left, remAfter)) {
        path.pop();
        return true;
      }
    }
    if (node.right !== null) {
      frames.push(frame('recurse', 'Recurse right', `Recurse right into ${node.right.value} with ${remAfter}`,
        state({ cur: node.right, visited, path, vars: { target, remaining: remAfter } })));
      if (dfs(node.right, remAfter)) {
        path.pop();
        return true;
      }
    }
    frames.push(frame('miss', 'Dead end', `No path via ${node.value} with remainder ${remAfter}`,
      state({ cur: node, visited, path, vars: { target, remaining: remAfter } })));
    path.pop();
    return false;
  }

  const verdict = dfs(root, target);
  frames.push(frame('done', 'Return verdict',
    verdict ? `Verdict true: a leaf path sums to ${target}` : `Verdict false: no leaf path sums to ${target}`,
    state({ visited, path, vars: { target, verdict } })));
  return finish({ nodes, edges }, frames, verdict);
}

const diameterCode = {
  java: code(`
[init] class Solution {
[init]     private int best;
[init]     public int diameterOfBinaryTree(TreeNode root) {
[init]         best = 0;
[recurse]         depth(root);
[done]         return best;
[done]     }
[guard]     private int depth(TreeNode node) {
[guard]         if (node == null) return 0;
[visit]         int left = depth(node.left);
[visit]         int right = depth(node.right);
[update]         best = Math.max(best, left + right);
[return]         return 1 + Math.max(left, right);
[return]     }
[done] }
`),
  cpp: code(`
[init] class Solution {
[init] public:
[init]     int diameterOfBinaryTree(TreeNode* root) {
[init]         best = 0;
[recurse]         depth(root);
[done]         return best;
[done]     }
[init] private:
[init]     int best;
[guard]     int depth(TreeNode* node) {
[guard]         if (node == nullptr) return 0;
[visit]         int left = depth(node->left);
[visit]         int right = depth(node->right);
[update]         if (left + right > best) best = left + right;
[return]         return 1 + (left > right ? left : right);
[return]     }
[done] };
`),
  pseudo: code(`
[init] diameterOfBinaryTree(root):
[init] best = 0
[recurse] depth(root)
[guard] depth(node):
[guard] if node == null return 0
[visit] left = depth(node.left); right = depth(node.right)
[update] best = max(best, left + right)
[return] return 1 + max(left, right)
[done] return best
`)
};

function buildDiameter(args) {
  if (!Array.isArray(args) || args.length < 1) throw new Error('diameter-of-binary-tree expects [level]');
  const rawLevel = args[0];
  let levelLen = -1;
  if (Array.isArray(rawLevel)) levelLen = rawLevel.length;
  else if (typeof rawLevel === 'string') {
    try { levelLen = JSON.parse(rawLevel).length; } catch { throw new Error('Tree input must be level-order JSON'); }
  }
  if (levelLen > 31) throw new Error('Visual bound exceeded: level array length ' + levelLen + ' > 31 (no truncation applied)');
  const { root, nodes, edges } = setup(args);
  const frames = [];
  const visited = [];
  const path = [];
  let best = 0;

  frames.push(frame('init', 'Initialize',
    root === null
      ? 'Empty tree: diameter is zero'
      : `Start at root ${root.value}; best starts at 0`,
    state({ cur: root, visited, path, vars: { best: 0 } })));

  if (root === null) {
    frames.push(frame('done', 'Return diameter', 'Diameter of an empty tree is 0',
      state({ visited, path, vars: { best: 0, diameter: 0 } })));
    return finish({ nodes, edges }, frames, 0);
  }

  function dfs(node) {
    if (node === null) {
      frames.push(frame('guard', 'Null child', 'Null child returns height 0',
        state({ visited, path, vars: { best } })));
      return 0;
    }
    visited.push(node);
    path.push(node);
    frames.push(frame('visit', 'Visit node', `Visit node ${node.value}; solve both subtrees`,
      state({ cur: node, visited, path, vars: { best } })));
    const leftTarget = node.left;
    frames.push(frame('recurse', 'Solve left',
      leftTarget === null ? `Node ${node.value} has no left child` : `Solve left subtree below ${node.value}`,
      state({ cur: leftTarget, visited, path, vars: { best } })));
    const left = dfs(node.left);
    const rightTarget = node.right;
    frames.push(frame('recurse', 'Solve right',
      rightTarget === null ? `Node ${node.value} has no right child` : `Solve right subtree below ${node.value}`,
      state({ cur: rightTarget, visited, path, vars: { best, left } })));
    const right = dfs(node.right);
    const through = left + right;
    if (through > best) {
      best = through;
      frames.push(frame('update', 'Update best', `Path via ${node.value}: ${left}+${right}=${through} is new best`,
        state({ cur: node, visited, path, vars: { best, left, right } })));
    } else {
      frames.push(frame('update', 'Check path', `Path via ${node.value}: ${left}+${right}=${through}; best stays ${best}`,
        state({ cur: node, visited, path, vars: { best, left, right } })));
    }
    const height = 1 + Math.max(left, right);
    frames.push(frame('return', 'Return height', `Return height ${height} from node ${node.value}`,
      state({ cur: node, visited, path, vars: { best, left, right, height } })));
    path.pop();
    return height;
  }

  dfs(root);
  frames.push(frame('done', 'Return diameter', `Diameter is ${best} edge(s)`,
    state({ visited, path, vars: { best, diameter: best } })));
  return finish({ nodes, edges }, frames, best);
}

// P22 binary-tree-maximum-path-sum (Blind75, Hard): post-order downward gains
// with clamped sides and a two-sided split candidate. Returns the FULL event
// list; semantic.js performs the single boundedFrames compaction pass.
// Visual bound 31 matches diameter/same-tree/subtree.
const MAXPATH_VISUAL_MAX = 31;

const maxPathCode = {
  java: code(`
[init] class Solution {
[init]     private int best;
[init]     public int maxPathSum(TreeNode root) {
[init]         best = Integer.MIN_VALUE;
[init]         maxGain(root);
[done]         return best;
[done]     }
[guard]     private int maxGain(TreeNode node) {
[guard]         if (node == null) return 0;
[visit]         int left = maxGain(node.left);
[visit]         int right = maxGain(node.right);
[clamp]         left = Math.max(left, 0);
[clamp]         right = Math.max(right, 0);
[split]         int split = node.val + left + right;
[split]         if (split > best) best = split;
[return]         return node.val + Math.max(left, right);
[return]     }
[done] }
`),
  cpp: code(`
[init] #include <algorithm>
[init] #include <climits>
[init] class Solution {
[init] public:
[init]     int maxPathSum(TreeNode* root) {
[init]         best_ = INT_MIN;
[init]         maxGain(root);
[done]         return best_;
[done]     }
[init] private:
[init]     int best_;
[guard]     int maxGain(TreeNode* node) {
[guard]         if (node == nullptr) return 0;
[visit]         int left = maxGain(node->left);
[visit]         int right = maxGain(node->right);
[clamp]         left = std::max(left, 0);
[clamp]         right = std::max(right, 0);
[split]         int split = node->val + left + right;
[split]         if (split > best_) best_ = split;
[return]         return node->val + std::max(left, right);
[return]     }
[done] };
`),
  pseudo: code(`
[init] maxPathSum(root):
[init] best starts below any real path sum
[init] maxGain(root); the root gain itself is discarded
[done] return best
[guard] maxGain(node):
[guard] if node == null return 0
[visit] left = maxGain(node.left); right = maxGain(node.right)
[clamp] left = max(left, 0); right = max(right, 0)
[split] split = node.val + left + right; best = max(best, split)
[return] return node.val + max(left, right)
[done] answer is the best through-path seen anywhere
`)
};

function buildMaxPath(args) {
  if (!Array.isArray(args) || args.length < 1) throw new Error('binary-tree-maximum-path-sum expects [level]');
  const rawLevel = args[0];
  let levelLen = -1;
  if (Array.isArray(rawLevel)) levelLen = rawLevel.length;
  else if (typeof rawLevel === 'string') {
    try { levelLen = JSON.parse(rawLevel).length; } catch { throw new Error('Tree input must be level-order JSON'); }
  }
  if (levelLen > MAXPATH_VISUAL_MAX) throw new Error('Visual bound exceeded: level array length ' + levelLen + ' > ' + MAXPATH_VISUAL_MAX + ' (no truncation applied)');
  const { root, nodes, edges } = setup(args);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const valOf = (id) => { const n = byId.get(id); return n ? n.value : '?'; };
  const frames = [];
  const visited = [];
  const path = [];
  const gains = {};
  const downNext = new Map();
  let best = -Infinity;
  let bestPath = [];

  const showBest = () => (best === -Infinity ? 'none yet' : String(best));
  const chainDown = (id) => {
    const out = [id];
    let cur = downNext.get(id);
    let guard = 0;
    while (cur !== null && cur !== undefined && guard++ < 64) {
      out.push(cur);
      cur = downNext.get(cur);
    }
    return out;
  };
  const viaText = () => {
    if (bestPath.length > 8) return bestPath.slice(0, 8).map(valOf).join(' -> ') + ' ... (' + bestPath.length + ' nodes)';
    return bestPath.map(valOf).join(' -> ');
  };
  const bestNodes = () => bestPath.map((id) => byId.get(id)).filter(Boolean);

  frames.push(frame('init', 'Initialize',
    root === null
      ? 'Empty tree: there is no non-empty path'
      : `Start at root ${root.value}; best starts below any real path sum`,
    state({ cur: root, visited, path, vars: { best: showBest() } })));

  if (root === null) {
    frames.push(frame('done', 'Return best',
      'Empty tree reports no path sum',
      state({ visited, path, vars: { best: showBest(), answer: null } })));
    return finish({ nodes, edges }, frames, null);
  }

  function dfs(node) {
    if (node === null) {
      frames.push(frame('guard', 'Null child', 'Null child contributes zero upward',
        state({ visited, path, vars: { best: showBest() } })));
      return 0;
    }
    visited.push(node);
    path.push(node);
    frames.push(frame('visit', 'Visit node', `Solve both subtrees below ${node.value} first`,
      state({ cur: node, visited, path, frontier: [node.left, node.right].filter(Boolean), vars: { best: showBest() } })));
    const rawL = dfs(node.left);
    const rawR = dfs(node.right);
    const L = Math.max(rawL, 0);
    const R = Math.max(rawR, 0);
    const dropped = [];
    if (node.left && rawL < 0) dropped.push(node.left.id);
    if (node.right && rawR < 0) dropped.push(node.right.id);
    frames.push(frame('clamp', 'Clamp gains',
      `Below ${node.value}: left raw ${rawL} keeps ${L}, right raw ${rawR} keeps ${R}`,
      state({ cur: node, visited, path, vars: { best: showBest(), rawL, rawR, keptL: L, keptR: R }, dropped: dropped.length ? dropped : null })));
    const split = node.value + L + R;
    if (split > best) {
      best = split;
      const leftPart = node.left && L > 0 ? chainDown(node.left.id).reverse() : [];
      const rightPart = node.right && R > 0 ? chainDown(node.right.id) : [];
      bestPath = [...leftPart, node.id, ...rightPart];
      frames.push(frame('split', `Split ${node.value}`,
        `Through ${node.value}: ${node.value}+${L}+${R}=${split} is the new best`,
        state({ cur: node, visited, path: bestNodes(), vars: { best, split }, distances: { ...gains } })));
    }
    const gain = node.value + Math.max(L, R);
    gains[node.id] = gain;
    if (L >= R && L > 0) downNext.set(node.id, node.left ? node.left.id : null);
    else if (R > 0) downNext.set(node.id, node.right ? node.right.id : null);
    else downNext.set(node.id, null);
    frames.push(frame('return', `Gain ${node.value}=${gain}`,
      `Upward gain from ${node.value} is ${gain}; best stays ${showBest()}`,
      state({ cur: node, visited, path: bestNodes(), vars: { best: showBest(), gain }, distances: { ...gains } })));
    path.pop();
    return gain;
  }

  dfs(root);
  frames.push(frame('done', 'Return best',
    `Max path sum ${best} via ${viaText()}`,
    state({ visited, path: bestNodes(), vars: { best, answer: best }, distances: { ...gains } })));
  return finish({ nodes, edges }, frames, best);
}

// P23 construct-binary-tree-from-preorder-and-inorder-traversal (Blind75):
// preorder names each root in order; an inorder position map splits each slice
// into left/right subranges. Returns the FULL event list with anchors; the
// single boundedFrames compaction pass in semantic.js owns sampling.
// Visual bound 31 matches diameter/same-tree/subtree/max-path.
const CONSTRUCT_VISUAL_MAX = 31;

function constructToArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Expected a JSON array literal');
    return parsed;
  }
  throw new Error('Expected an int array argument');
}

function constructParse(args) {
  if (!Array.isArray(args) || args.length < 2) throw new Error('construct-binary-tree-from-preorder-and-inorder-traversal expects [preorder, inorder]');
  const preorder = constructToArray(args[0]);
  const inorder = constructToArray(args[1]);
  if (preorder.length !== inorder.length) throw new Error('preorder and inorder must have equal length');
  if (preorder.length === 0) throw new Error('Constraints guarantee at least 1 node; empty input is an error demo only');
  if (preorder.length > CONSTRUCT_VISUAL_MAX) {
    throw new Error('Visual bound exceeded: n=' + preorder.length + ' > ' + CONSTRUCT_VISUAL_MAX + ' (no truncation applied)');
  }
  if (!preorder.every(Number.isSafeInteger) || !inorder.every(Number.isSafeInteger)) {
    throw new Error('Use integer arrays for this walkthrough');
  }
  const uniq = new Set(preorder);
  if (uniq.size !== preorder.length) throw new Error('Values must be unique per constraints');
  const inSet = new Set(inorder);
  if (inSet.size !== inorder.length || ![...uniq].every((v) => inSet.has(v))) {
    throw new Error('inorder must be a permutation of preorder values');
  }
  return { preorder: preorder.slice(), inorder: inorder.slice() };
}

/** Compact level-order encode with interior nulls, trailing nulls trimmed (LeetCode convention). */
function constructLevel(rootNode) {
  if (rootNode === null || rootNode === undefined) return [];
  const out = [];
  const queue = [rootNode];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node === null || node === undefined) { out.push(null); continue; }
    out.push(node.value);
    queue.push(node.left ?? null, node.right ?? null);
  }
  while (out.length > 0 && out[out.length - 1] === null) out.pop();
  return out;
}

const constructCode = {
  java: code(`
[init] class Solution {
[init]     private int pre;
[init]     private java.util.Map<Integer, Integer> pos;
[init]     public TreeNode buildTree(int[] preorder, int[] inorder) {
[map]         pos = new java.util.HashMap<>();
[map]         for (int i = 0; i < inorder.length; i++) pos.put(inorder[i], i);
[init]         pre = 0;
[call]         return build(preorder, 0, inorder.length - 1);
[call]     }
[call]     private TreeNode build(int[] preorder, int lo, int hi) {
[guard]         if (lo > hi) return null;
[root]         int rootVal = preorder[pre++];
[root]         TreeNode root = new TreeNode(rootVal);
[lookup]         int mid = pos.get(rootVal);
[recleft]         root.left = build(preorder, lo, mid - 1);
[recright]         root.right = build(preorder, mid + 1, hi);
[done]         return root;
[done]     }
[done] }
`),
  cpp: code(`
[init] class Solution {
[init] public:
[init]     int pre;
[init]     std::unordered_map<int, int> pos;
[init]     TreeNode* buildTree(vector<int>& preorder, vector<int>& inorder) {
[map]         pos.clear();
[map]         for (int i = 0; i < (int)inorder.size(); i++) pos[inorder[i]] = i;
[init]         pre = 0;
[call]         return build(preorder, 0, (int)inorder.size() - 1);
[call]     }
[call]     TreeNode* build(vector<int>& preorder, int lo, int hi) {
[guard]         if (lo > hi) return nullptr;
[root]         int rootVal = preorder[pre++];
[root]         TreeNode* root = new TreeNode(rootVal);
[lookup]         int mid = pos[rootVal];
[recleft]         root->left = build(preorder, lo, mid - 1);
[recright]         root->right = build(preorder, mid + 1, hi);
[done]         return root;
[done]     }
[done] };
`),
  pseudo: code(`
[init] buildTree(preorder, inorder):
[map] pos = empty map from value to inorder index
[map] for i over inorder: pos[inorder[i]] = i
[init] pre = 0
[call] return build(0, inorder.length - 1)
[call] build(lo, hi):
[guard] if lo > hi return null
[root] rootVal = preorder[pre]; pre += 1
[root] root = new node(rootVal)
[lookup] mid = pos[rootVal]
[recleft] root.left = build(lo, mid - 1)
[recright] root.right = build(mid + 1, hi)
[done] return root
`),
};

const constructExplain = {
  init: 'Sets up the walkthrough scope and the preorder cursor so the first root read starts at the first element.',
  map: 'Records each value once with its inorder position so the split point is found by lookup instead of search.',
  call: 'Opens one bounded subrange call so left and right parts are solved independently and attached to their root.',
  guard: 'Stops an empty subrange with null so missing children end without creating nodes or reading input.',
  root: 'Reads the next preorder value in order and creates exactly one node for it, consuming one cursor step.',
  lookup: 'Looks up the created value in the inorder map to split the range into left part and right part.',
  recleft: 'Solves the left subrange next and attaches it as the left child so inorder left order is preserved.',
  recright: 'Solves the right subrange next and attaches it as the right child so inorder right order is preserved.',
  done: 'Returns the built subtree to its caller so the parent can attach it; the top call returns the whole tree.'
};

function buildConstruct(args) {
  const { preorder, inorder } = constructParse(args);
  const pos = new Map();
  inorder.forEach((v, i) => pos.set(v, i));
  let pre = 0;
  let nextId = 0;
  const created = [];
  const nodes = [];
  const edges = [];
  const frames = [];
  const stack = [];
  const anchors = [];

  const snap = (extra = {}) => ({ pre, ...extra });

  frames.push(frame(
    'init', 'Initialize',
    `n=${preorder.length}: cursor at first preorder value`,
    state({ visited: created, stack, vars: snap({ n: preorder.length }) })
  ));
  frames.push(frame(
    'map', 'Index inorder',
    `Map holds ${pos.size} value to position entries`,
    state({ visited: created, stack, vars: snap({ mapped: pos.size }) })
  ));
  anchors.push(0);

  function build(lo, hi) {
    frames.push(frame(
      'call', 'Open subrange',
      `Solve inorder slice lo=${lo} hi=${hi}`,
      state({ cur: stack.length ? stack[stack.length - 1] : null, visited: created, stack, vars: snap({ lo, hi }) })
    ));
    if (lo > hi) {
      frames.push(frame(
        'guard', 'Empty subrange',
        `lo=${lo} past hi=${hi}: attach null`,
        state({ cur: stack.length ? stack[stack.length - 1] : null, visited: created, stack, vars: snap({ lo, hi }) })
      ));
      return null;
    }
    const rootVal = preorder[pre];
    pre += 1;
    const node = { id: nextId++, value: rootVal, left: null, right: null };
    created.push(node);
    nodes.push({ id: node.id, value: node.value });
    stack.push(node);
    frames.push(frame(
      'root', 'Create root',
      `Take next preorder value ${rootVal} as node`,
      state({ cur: node, visited: created, stack, vars: snap({ rootVal, lo, hi }) })
    ));
    if (anchors.length === 1) anchors.push(frames.length - 1);
    const mid = pos.get(rootVal);
    frames.push(frame(
      'lookup', 'Split inorder',
      `Value ${rootVal} splits slice at mid=${mid}`,
      state({ cur: node, visited: created, stack, vars: snap({ rootVal, mid, lo, hi }) })
    ));
    frames.push(frame(
      'recleft', 'Solve left',
      `Build left slice lo=${lo} hi=${mid - 1}`,
      state({ cur: node, visited: created, stack, vars: snap({ rootVal, mid, lo, hi }) })
    ));
    node.left = build(lo, mid - 1);
    if (node.left !== null) edges.push([node.id, node.left.id]);
    frames.push(frame(
      'recright', 'Solve right',
      `Build right slice lo=${mid + 1} hi=${hi}`,
      state({ cur: node, visited: created, stack, vars: snap({ rootVal, mid, lo, hi }) })
    ));
    node.right = build(mid + 1, hi);
    if (node.right !== null) edges.push([node.id, node.right.id]);
    stack.pop();
    frames.push(frame(
      'done', 'Return subtree',
      `Subtree rooted at ${rootVal} is attached`,
      state({ cur: node, visited: created, stack, vars: snap({ rootVal }) })
    ));
    return node;
  }

  const root = build(0, inorder.length - 1);
  const result = constructLevel(root);
  anchors.push(frames.length);
  frames.push(frame(
    'done', 'Return tree',
    `Built ${created.length} node(s); level order holds ${result.length} slot(s)`,
    state({ cur: root, visited: created, stack, vars: snap({ result: result.slice() }) })
  ));
  return {
    kind: 'tree',
    layout: { nodes, edges },
    frames,
    result,
    anchors
  };
}

const kthCode = {
  java: code(`
[init] import java.util.ArrayDeque;
[init] import java.util.Deque;
[init] class Solution {
[init]     public int kthSmallest(TreeNode root, int k) {
[init]         Deque<TreeNode> stack = new ArrayDeque<>();
[init]         TreeNode cur = root;
[init]         int count = 0;
[descend]         while (cur != null || !stack.isEmpty()) {
[descend]             while (cur != null) {
[descend]                 stack.push(cur);
[descend]                 cur = cur.left;
[descend]             }
[pop]             TreeNode node = stack.pop();
[visit]             count = count + 1;
[visit]             int value = node.val;
[found]             if (count == k) {
[found]                 int answer = value;
[stop]                 stack.clear();
[stop]                 cur = null;
[found]                 return answer;
[done]             }
[visit]             cur = node.right;
[descend]         }
[done]         throw new IllegalArgumentException("k out of range");
[done]     }
[done] }
`),
  cpp: code(`
[init] #include <stack>
[init] #include <stdexcept>
[init] class Solution {
[init] public:
[init]     int kthSmallest(TreeNode* root, int k) {
[init]         std::stack<TreeNode*> st;
[init]         TreeNode* cur = root;
[init]         int count = 0;
[descend]         while (cur != nullptr || !st.empty()) {
[descend]             while (cur != nullptr) {
[descend]                 st.push(cur);
[descend]                 cur = cur->left;
[descend]             }
[pop]             TreeNode* node = st.top(); st.pop();
[visit]             count = count + 1;
[visit]             int value = node->val;
[found]             if (count == k) {
[found]                 int answer = value;
[stop]                 cur = nullptr;
[stop]                 while (!st.empty()) st.pop();
[found]                 return answer;
[done]             }
[visit]             cur = node->right;
[descend]         }
[done]         throw std::out_of_range("k out of range");
[done]     }
[done] };
`),
  pseudo: code(`
[init] stack = []; cur = root; count = 0
[descend] while cur != null or stack is not empty:
[descend]   while cur != null:
[descend]     push cur onto stack; cur = cur.left
[pop] node = pop stack
[visit] count = count + 1; value = node.val
[found] if count == k
[found] answer = value
[stop] clear stack; cur = null to halt early
[found] return answer
[visit] cur = node.right
[done] return answer as the kth smallest
[done] error when k exceeds the node count
`)
};

function buildKthSmallest(args) {
  if (!Array.isArray(args) || args.length < 2) throw new Error('kth-smallest-element-in-a-bst expects [level, k]');
  const rawLevel = args[0];
  let levelLen = -1;
  if (Array.isArray(rawLevel)) levelLen = rawLevel.length;
  else if (typeof rawLevel === 'string') {
    try { levelLen = JSON.parse(rawLevel).length; } catch { throw new Error('Tree input must be level-order JSON'); }
  }
  if (levelLen > 31) throw new Error('Visual bound exceeded: level array length ' + levelLen + ' > 31 (no truncation applied)');
  const { root, nodes, edges } = setup(args);
  let k = args[1];
  if (typeof k === 'string') {
    if (k.trim() === '') throw new Error('kth-smallest-element-in-a-bst expects an integer k');
    const n = Number(k);
    if (!Number.isSafeInteger(n)) throw new Error('kth-smallest-element-in-a-bst expects an integer k');
    k = n;
  }
  if (!Number.isSafeInteger(k)) throw new Error('kth-smallest-element-in-a-bst expects an integer k');
  const total = nodes.length;
  if (k < 1 || k > total) throw new Error('k out of range: need 1 <= k <= ' + total + ' nodes, got k=' + k);
  const frames = [];
  const visited = [];
  const stack = [];
  let cur = root;
  let count = 0;
  frames.push(frame('init', 'Initialize', 'Start at root; find kth=' + k + ' of ' + total,
    state({ cur, visited, stack, vars: { k, count, total } })));
  while (cur !== null || stack.length > 0) {
    while (cur !== null) {
      stack.push(cur);
      frames.push(frame('descend', 'Descend left', 'Push ' + cur.value + '; go to left child',
        state({ cur: cur.left, visited, stack, vars: { k, count, total } })));
      cur = cur.left;
    }
    const node = stack.pop();
    frames.push(frame('pop', 'Pop ancestor', 'Pop ' + node.value + '; its left is done',
      state({ cur: node, visited, stack, vars: { k, count, total } })));
    visited.push(node);
    count += 1;
    frames.push(frame('visit', 'Visit in order', 'Visit ' + node.value + ' as #' + count + ' of k=' + k,
      state({ cur: node, visited, stack, vars: { k, count, total, value: node.value } })));
    if (count === k) {
      frames.push(frame('found', 'Found kth', 'Found kth=' + k + ': value ' + node.value,
        state({ cur: node, visited, stack, vars: { k, count, total, answer: node.value } })));
      stack.length = 0;
      cur = null;
      frames.push(frame('stop', 'Stop early', 'Stop: kth found; skip the rest',
        state({ cur, visited, stack, vars: { k, count, total, answer: node.value } })));
      frames.push(frame('done', 'Return result', 'Return ' + node.value + ' as kth smallest',
        state({ visited, stack, vars: { k, count, total, answer: node.value } })));
      return finish({ nodes, edges }, frames, node.value);
    }
    cur = node.right;
    frames.push(frame('visit', 'Move right', 'Go right from ' + node.value,
      state({ cur, visited, stack, vars: { k, count, total } })));
  }
  throw new Error('k out of range: need 1 <= k <= ' + total + ' nodes, got k=' + k);
}

const sameCode = {
  java: code(`
[init] import java.util.ArrayDeque;
[init] import java.util.Deque;
[init] class Solution {
[init]     public boolean isSameTree(TreeNode p, TreeNode q) {
[init]         Deque<TreeNode[]> queue = new ArrayDeque<>();
[init]         queue.offer(new TreeNode[]{p, q});
[check]         while (!queue.isEmpty()) {
[check]             TreeNode[] pair = queue.poll();
[check]             TreeNode a = pair[0];
[check]             TreeNode b = pair[1];
[skip]             if (a == null && b == null) continue;
[mismatch]             if (a == null || b == null) return false;
[mismatch]             if (a.val != b.val) return false;
[enqueue]             queue.offer(new TreeNode[]{a.left, b.left});
[enqueue]             queue.offer(new TreeNode[]{a.right, b.right});
[check]         }
[done]         return true;
[done]     }
[done] }
`),
  cpp: code(`
[init] #include <queue>
[init] #include <utility>
[init] class Solution {
[init] public:
[init]     bool isSameTree(TreeNode* p, TreeNode* q) {
[init]         std::queue<std::pair<TreeNode*, TreeNode*>> work;
[init]         work.emplace(p, q);
[check]         while (!work.empty()) {
[check]             auto pr = work.front(); work.pop();
[check]             TreeNode* a = pr.first;
[check]             TreeNode* b = pr.second;
[skip]             if (a == nullptr && b == nullptr) continue;
[mismatch]             if (a == nullptr || b == nullptr) return false;
[mismatch]             if (a->val != b->val) return false;
[enqueue]             work.emplace(a->left, b->left);
[enqueue]             work.emplace(a->right, b->right);
[check]         }
[done]         return true;
[done]     }
[done] };
`),
  pseudo: code(`
[init] queue = [(p, q)]
[check] while queue is not empty
[check] (a, b) = dequeue queue
[skip] if a == null and b == null continue
[mismatch] if a == null or b == null return false
[mismatch] if a.val != b.val return false
[enqueue] enqueue (a.left, b.left)
[enqueue] enqueue (a.right, b.right)
[done] return true
`)
};

// B-tree ids are offset so mixed A/B queues stay unambiguous. The tree scene
// paints layout.nodes/edges (tree A); B-side ids resolve through nodesB/edgesB
// and degrade to raw-id sidebar labels when a view only knows tree A.
const DUAL_OFF = 1000;

function buildSameTree(args) {
  if (!Array.isArray(args) || args.length < 2) throw new Error('same-tree expects [levelA, levelB]');
  const parseLevel = (raw, name) => {
    let level = raw;
    if (typeof raw === 'string') {
      try { level = JSON.parse(raw); } catch { throw new Error('Tree input must be level-order JSON'); }
    }
    if (!Array.isArray(level)) throw new Error('Expected level-order arrays for both trees');
    if (level.length > 31) throw new Error('Visual bound exceeded: level array ' + name + ' length ' + level.length + ' > 31 (no truncation applied)');
    return level;
  };
  const A = treeInput(parseLevel(args[0], 'A'), 31);
  const B = treeInput(parseLevel(args[1], 'B'), 31);
  const nodesB = B.nodes.map((n) => ({ id: n.id + DUAL_OFF, value: n.value }));
  const edgesB = B.edges.map(([u, v]) => [u + DUAL_OFF, v + DUAL_OFF]);
  const layout = { nodes: A.nodes, edges: A.edges, nodesB, edgesB };
  const wrapB = (n) => (n === null || n === undefined ? null : { id: n.id + DUAL_OFF, value: n.value });
  const frames = [];
  const visited = [];
  const path = [];
  const queuePairs = [[A.root, B.root]];
  const flat = () => {
    const out = [];
    for (const [a, b] of queuePairs) {
      if (a !== null && a !== undefined) out.push(a);
      const w = wrapB(b);
      if (w !== null) out.push(w);
    }
    return out;
  };
  const startCur = A.root !== null ? A.root : wrapB(B.root);
  frames.push(frame('init', 'Initialize',
    A.root === null && B.root === null
      ? 'Both empty: queue holds (null,null)'
      : `Start A=${fmtTreeNode(A.root)} B=${fmtTreeNode(B.root)}; 1 pair queued`,
    state({ cur: startCur, visited, path, queue: flat(), vars: { a: fmtTreeNode(A.root), b: fmtTreeNode(B.root), qsize: 1 } })));
  while (queuePairs.length > 0) {
    const [a, b] = queuePairs.shift();
    const cur = a !== null ? a : wrapB(b);
    frames.push(frame('check', 'Check pair', `Check pair (${fmtTreeNode(a)},${fmtTreeNode(b)})`,
      state({ cur, visited, path, queue: flat(), vars: { a: fmtTreeNode(a), b: fmtTreeNode(b), qsize: queuePairs.length } })));
    if (a === null && b === null) {
      frames.push(frame('skip', 'Both null', 'Both null: pair holds, keep checking',
        state({ cur, visited, path, queue: flat(), vars: { a: 'null', b: 'null', qsize: queuePairs.length } })));
      continue;
    }
    if (a === null || b === null) {
      const bad = a === null ? fmtTreeNode(b) : fmtTreeNode(a);
      frames.push(frame('mismatch', 'One side null', `Mismatch: one null vs ${bad}; not same`,
        state({ cur, visited, path, queue: flat(), vars: { a: fmtTreeNode(a), b: fmtTreeNode(b), verdict: false } })));
      frames.push(frame('done', 'Return verdict', 'Verdict differ: null mismatch found',
        state({ cur, visited, path, queue: flat(), vars: { verdict: false } })));
      return { kind: 'tree', layout, frames, result: false };
    }
    if (a.value !== b.value) {
      frames.push(frame('mismatch', 'Values differ', `Mismatch: ${a.value} vs ${b.value}; not same`,
        state({ cur: a, visited, path, queue: flat(), vars: { a: a.value, b: b.value, verdict: false } })));
      frames.push(frame('done', 'Return verdict', 'Verdict differ: values differ here',
        state({ cur: a, visited, path, queue: flat(), vars: { verdict: false } })));
      return { kind: 'tree', layout, frames, result: false };
    }
    visited.push(a);
    visited.push(wrapB(b));
    frames.push(frame('enqueue', 'Enqueue children', `Match ${a.value}: queue (${fmtTreeNode(a.left)},${fmtTreeNode(b.left)}) plus (${fmtTreeNode(a.right)},${fmtTreeNode(b.right)})`,
      state({ cur: a, visited, path, queue: flat(), vars: { a: a.value, b: b.value, qsize: queuePairs.length } })));
    queuePairs.push([a.left, b.left]);
    queuePairs.push([a.right, b.right]);
  }
  frames.push(frame('done', 'Return verdict', 'Verdict same: every pair matched',
    state({ visited, path, queue: [], vars: { verdict: true } })));
  return { kind: 'tree', layout, frames, result: true };
}

// P26 subtree-of-another-tree (Blind75): preorder anchor scan + pairwise
// structural compare on the shared dual-tree contract (nodes/edges + nodesB/
// edgesB with DUAL_OFF). Returns the FULL event list; semantic.js performs the
// single boundedFrames compaction pass. Visual bound 31 matches same-tree.
const SUBTREE_VISUAL_MAX = 31;

const subtreeCode = {
  java: code(`
[init] class Solution {
[init]     public boolean isSubtree(TreeNode root, TreeNode subRoot) {
[init]         // anchor scan starts at root
[enter]         if (root == null) return false;
[compare]         if (isSameTree(root, subRoot)) return true;
[scan-left]         if (isSubtree(root.left, subRoot)) return true;
[scan-right]         return isSubtree(root.right, subRoot);
[done]         // answer: true iff some anchor roots an exact copy of subRoot
[done]     }
[check]     private boolean isSameTree(TreeNode a, TreeNode b) {
[skip]         if (a == null && b == null) return true;
[mismatch]         if (a == null || b == null) return false;
[mismatch]         if (a.val != b.val) return false;
[match]         return isSameTree(a.left, b.left) && isSameTree(a.right, b.right);
[done]     }
[done] }
`),
  cpp: code(`
[init] class Solution {
[init] public:
[init]     bool isSubtree(TreeNode* root, TreeNode* subRoot) {
[init]         // anchor scan starts at root
[enter]         if (root == nullptr) return false;
[compare]         if (isSameTree(root, subRoot)) return true;
[scan-left]         if (isSubtree(root->left, subRoot)) return true;
[scan-right]         return isSubtree(root->right, subRoot);
[done]         // answer: true iff some anchor roots an exact copy of subRoot
[done]     }
[check] private:
[check]     bool isSameTree(TreeNode* a, TreeNode* b) {
[skip]         if (a == nullptr && b == nullptr) return true;
[mismatch]         if (a == nullptr || b == nullptr) return false;
[mismatch]         if (a->val != b->val) return false;
[match]         return isSameTree(a->left, b->left) && isSameTree(a->right, b->right);
[done]     }
[done] };
`),
  pseudo: code(`
[init] isSubtree(root, subRoot):
[enter] if root == null return false
[compare] if isSameTree(root, subRoot) return true
[scan-left] if isSubtree(root.left, subRoot) return true
[scan-right] return isSubtree(root.right, subRoot)
[check] isSameTree(a, b):
[skip] if a == null and b == null return true
[mismatch] if a == null or b == null return false
[mismatch] if a.val != b.val return false
[match] return isSameTree(a.left, b.left) and isSameTree(a.right, b.right)
[done] verdict is true iff some node of root anchors an identical copy of subRoot
`)
};

function parseSubtreeLevel(raw, name) {
  let level = raw;
  if (typeof raw === 'string') {
    try { level = JSON.parse(raw); } catch { throw new Error('Tree input must be level-order JSON (' + name + ')'); }
  }
  if (!Array.isArray(level)) throw new Error('Expected level-order arrays for root and subRoot');
  if (level.length > SUBTREE_VISUAL_MAX) {
    throw new Error('Visual bound exceeded: level array ' + name + ' length ' + level.length +
      ' > ' + SUBTREE_VISUAL_MAX + ' (no truncation applied)');
  }
  if (!level.every((v) => v === null || Number.isSafeInteger(v))) {
    throw new Error('Tree entries must be integers or null (' + name + ')');
  }
  return level;
}

function buildSubtree(args) {
  if (!Array.isArray(args) || args.length < 2) throw new Error('subtree-of-another-tree expects [rootLevel, subRootLevel]');
  const levelA = parseSubtreeLevel(args[0], 'root');
  const levelB = parseSubtreeLevel(args[1], 'subRoot');
  const A = treeInput(levelA, SUBTREE_VISUAL_MAX);
  const B = treeInput(levelB, SUBTREE_VISUAL_MAX);
  const nodesB = B.nodes.map((n) => ({ id: n.id + DUAL_OFF, value: n.value }));
  const edgesB = B.edges.map(([u, v]) => [u + DUAL_OFF, v + DUAL_OFF]);
  const layout = { nodes: A.nodes, edges: A.edges, nodesB, edgesB };
  const wrapB = (n) => (n === null || n === undefined ? null : { id: n.id + DUAL_OFF, value: n.value });

  const frames = [];
  const visited = [];
  const path = [];

  if (B.root === null) {
    frames.push(frame('init', 'Empty subRoot',
      'subRoot is empty: every tree contains the empty tree',
      state({ visited, path, vars: { anchor: 'none', verdict: true } })));
    frames.push(frame('done', 'Return verdict',
      'Verdict true: empty subRoot is a subtree of anything',
      state({ visited, path, vars: { verdict: true } })));
    return { kind: 'tree', layout, frames, result: true };
  }
  if (A.root === null) {
    frames.push(frame('init', 'Empty root',
      'root is empty but subRoot is not: no anchor exists',
      state({ visited, path, vars: { anchor: 'none', verdict: false } })));
    frames.push(frame('done', 'Return verdict',
      'Verdict false: nonempty subRoot cannot sit inside an empty root',
      state({ visited, path, vars: { verdict: false } })));
    return { kind: 'tree', layout, frames, result: false };
  }

  const anchors = [];
  const walk = (n) => { if (n === null) return; anchors.push(n); walk(n.left); walk(n.right); };
  walk(A.root);

  frames.push(frame('init', 'Initialize',
    `Scan ${anchors.length} anchor(s) in root for a copy of subRoot rooted at ${B.root.value}`,
    state({ cur: A.root, visited, path, vars: { anchors: anchors.length, subVal: B.root.value } })));

  let checked = 0;
  for (const anchor of anchors) {
    checked += 1;
    path.push(anchor);
    const anchorLabel = `${anchor.value}#${anchor.id}`;
    frames.push(frame('enter', 'Try anchor',
      `Anchor ${checked}/${anchors.length}: node ${anchor.value} may root a copy of subRoot`,
      state({ cur: anchor, visited, path, vars: { anchor: anchorLabel, checked, anchors: anchors.length } })));
    const stack = [[anchor, B.root]];
    let ok = true;
    let matched = 0;
    while (stack.length > 0) {
      const [a, b] = stack.pop();
      const cur = a !== null ? a : wrapB(b);
      frames.push(frame('compare', 'Compare pair',
        `Compare (${fmtTreeNode(a)},${fmtTreeNode(b)}) at anchor ${anchor.value}`,
        state({ cur, visited, path, vars: { anchor: anchorLabel, a: fmtTreeNode(a), b: fmtTreeNode(b), checked } })));
      if (a === null && b === null) {
        frames.push(frame('skip', 'Both null',
          `Both null: pair holds at anchor ${anchor.value}`,
          state({ cur, visited, path, vars: { anchor: anchorLabel, a: 'null', b: 'null', checked } })));
        continue;
      }
      if (a === null || b === null) {
        frames.push(frame('mismatch', 'One side null',
          `Mismatch: (${fmtTreeNode(a)},${fmtTreeNode(b)}) — anchor ${anchor.value} rejected`,
          state({ cur, visited, path, vars: { anchor: anchorLabel, a: fmtTreeNode(a), b: fmtTreeNode(b), checked } })));
        ok = false;
        break;
      }
      if (a.value !== b.value) {
        frames.push(frame('mismatch', 'Values differ',
          `Mismatch ${a.value} vs ${b.value} — anchor ${anchor.value} rejected`,
          state({ cur: a, visited, path, vars: { anchor: anchorLabel, a: a.value, b: b.value, checked } })));
        ok = false;
        break;
      }
      matched += 1;
      visited.push(a);
      visited.push(wrapB(b));
      frames.push(frame('match', 'Pair matches',
        `Match ${a.value} (${matched} pair(s) hold at anchor ${anchor.value})`,
        state({ cur: a, visited, path, vars: { anchor: anchorLabel, a: a.value, b: b.value, matched, checked } })));
      stack.push([a.right, b.right]);
      stack.push([a.left, b.left]);
    }
    if (ok) {
      frames.push(frame('done', 'Anchor accepts',
        `Anchor ${anchor.value} accepts: whole subRoot matched (${matched} pair(s))`,
        state({ cur: anchor, visited, path, vars: { anchor: anchorLabel, matched, verdict: true } })));
      path.pop();
      return { kind: 'tree', layout, frames, result: true };
    }
    frames.push(frame('scan-left', 'Anchor rejected',
      `Anchor ${anchor.value} rejected after ${matched} match(es); keep scanning`,
      state({ cur: anchor, visited, path, vars: { anchor: anchorLabel, matched, checked, verdict: 'pending' } })));
    path.pop();
  }

  frames.push(frame('done', 'Return verdict',
    `Verdict false: checked ${checked} anchor(s), none rooted subRoot`,
    state({ visited, path, vars: { checked, verdict: false } })));
  return { kind: 'tree', layout, frames, result: false };
}

const pathsCode = {
  java: code(`
[init] import java.util.ArrayList;
[init] import java.util.List;
[init] class Solution {
[init]     public List<String> binaryTreePaths(TreeNode root) {
[init]         List<String> ans = new ArrayList<>();
[init]         if (root == null) return ans;
[init]         List<String> path = new ArrayList<>();
[init]         dfs(root, path, ans);
[done]         return ans;
[done]     }
[descend]     private void dfs(TreeNode node, List<String> path, List<String> ans) {
[descend]         path.add(String.valueOf(node.val));
[leaf]         if (node.left == null && node.right == null) {
[leaf]             ans.add(String.join("->", path));
[backtrack]             path.remove(path.size() - 1);
[leaf]             return;
[descend]         }
[descend]         if (node.left != null) dfs(node.left, path, ans);
[descend]         if (node.right != null) dfs(node.right, path, ans);
[backtrack]         path.remove(path.size() - 1);
[done]     }
[done] }
`),
  cpp: code(`
[init] #include <string>
[init] #include <vector>
[init] class Solution {
[init] public:
[init]     vector<string> binaryTreePaths(TreeNode* root) {
[init]         vector<string> ans;
[init]         if (root == nullptr) return ans;
[init]         vector<string> path;
[init]         dfs(root, path, ans);
[done]         return ans;
[done]     }
[descend] private:
[descend]     void dfs(TreeNode* node, vector<string>& path, vector<string>& ans) {
[descend]         path.push_back(to_string(node->val));
[leaf]         if (node->left == nullptr && node->right == nullptr) {
[leaf]             string s = path[0];
[leaf]             for (size_t i = 1; i < path.size(); ++i) s = s + "->" + path[i];
[leaf]             ans.push_back(s);
[backtrack]             path.pop_back();
[leaf]             return;
[descend]         }
[descend]         if (node->left != nullptr) dfs(node->left, path, ans);
[descend]         if (node->right != nullptr) dfs(node->right, path, ans);
[backtrack]         path.pop_back();
[done]     }
[done] };
`),
  pseudo: code(`
[init] binaryTreePaths(root):
[init] ans = []; path = []
[init] if root == null return ans
[init] dfs(root, path, ans)
[done] return ans
[descend] dfs(node, path, ans):
[descend] push str(node.val) onto path
[leaf] if node is a leaf:
[leaf] append join(path, "->") to ans
[backtrack] pop path for the leaf case
[leaf] return from leaf case
[descend] if node.left exists dfs(node.left, path, ans)
[descend] if node.right exists dfs(node.right, path, ans)
[backtrack] pop path after both subtrees
[done] collection holds every root-to-leaf path string
`)
};

// Long leaf notes truncate the display string; state/result always stay full.
const shortPathStr = s => (s.length <= 100 ? s : s.slice(0, 97) + '...');

function buildTreePaths(args) {
  if (!Array.isArray(args) || args.length < 1) throw new Error('binary-tree-paths expects [level]');
  const rawLevel = args[0];
  let levelLen = -1;
  if (Array.isArray(rawLevel)) levelLen = rawLevel.length;
  else if (typeof rawLevel === 'string') {
    try { levelLen = JSON.parse(rawLevel).length; } catch { throw new Error('Tree input must be level-order JSON'); }
  }
  if (levelLen > 31) throw new Error('Visual bound exceeded: level array length ' + levelLen + ' > 31 (no truncation applied)');
  const { root, nodes, edges } = setup(args);
  const frames = [];
  const visited = [];
  const path = [];
  const pathVals = [];
  const ans = [];

  if (root === null) {
    frames.push(frame('init', 'Initialize', 'Empty tree: no root-to-leaf paths exist',
      state({ visited, path, vars: { path: [], result: [] } })));
    frames.push(frame('done', 'Return paths', 'Done: no paths; empty tree yields []',
      state({ visited, path, vars: { path: [], result: [] } })));
    return finish({ nodes, edges }, frames, []);
  }

  frames.push(frame('init', 'Initialize', `Start at root ${root.value}; collect root-to-leaf paths`,
    state({ cur: root, visited, path, vars: { path: [], result: [] } })));

  function dfs(node) {
    visited.push(node);
    path.push(node);
    pathVals.push(String(node.value));
    frames.push(frame('descend', 'Descend', `Descend to ${node.value}; push it (path holds ${pathVals.length})`,
      state({ cur: node, visited, path, vars: { path: pathVals.slice(), result: ans.slice() } })));
    const isLeaf = node.left === null && node.right === null;
    if (isLeaf) {
      const s = pathVals.join('->');
      ans.push(s);
      frames.push(frame('leaf', 'Record leaf path', `Leaf ${node.value} records path "${shortPathStr(s)}"`,
        state({ cur: node, visited, path, vars: { path: pathVals.slice(), result: ans.slice() } })));
      path.pop();
      pathVals.pop();
      frames.push(frame('backtrack', 'Backtrack', `Backtrack from ${node.value}; pop it`,
        state({ cur: node, visited, path, vars: { path: pathVals.slice(), result: ans.slice() } })));
      return;
    }
    if (node.left !== null) dfs(node.left);
    if (node.right !== null) dfs(node.right);
    path.pop();
    pathVals.pop();
    frames.push(frame('backtrack', 'Backtrack', `Backtrack from ${node.value}; pop it`,
      state({ cur: node, visited, path, vars: { path: pathVals.slice(), result: ans.slice() } })));
  }

  dfs(root);
  frames.push(frame('done', 'Return paths', `Done: ${ans.length} path(s) collected`,
    state({ visited, path, vars: { path: [], result: ans.slice() } })));
  return finish({ nodes, edges }, frames, ans.slice());
}

// Lowest-common-ancestor-of-a-binary-search-tree (Blind75): iterative BST descent
// with a named cur cursor (the entry root is preserved for path display).
// Staged source: .workers/jobs/question-owners-150/lowest-common-ancestor-of-a-binary-search-tree/adapter-lca-bst.mjs
// (QO150 owner package per triage batch8-prep.md: readyForReview, 13-case oracle
// agreement; cur-cursor style preferred over the IW50 root-reassigning code because
// the staged references and lesson notes both use a named cur).
const lcaBstCode = {
  java: code(`
[init] class Solution {
[init]     public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
[init]         TreeNode cur = root;
[compare]         while (cur != null) {
[compare]             if (p.val < cur.val && q.val < cur.val) {
[go-left]                 cur = cur.left;
[compare]             } else if (p.val > cur.val && q.val > cur.val) {
[go-right]                 cur = cur.right;
[compare]             } else {
[found]                 return cur;
[found]             }
[compare]         }
[done]         return null;
[done]     }
[done] }
`),
  cpp: code(`
[init] class Solution {
[init] public:
[init]     TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
[init]         TreeNode* cur = root;
[compare]         while (cur != nullptr) {
[compare]             if (p->val < cur->val && q->val < cur->val) {
[go-left]                 cur = cur->left;
[compare]             } else if (p->val > cur->val && q->val > cur->val) {
[go-right]                 cur = cur->right;
[compare]             } else {
[found]                 return cur;
[found]             }
[compare]         }
[done]         return nullptr;
[done]     }
[done] };
`),
  pseudo: code(`
[init] cur = root
[compare] while cur != null
[compare] if p < cur.val and q < cur.val
[go-left] cur = cur.left
[compare] elif p > cur.val and q > cur.val
[go-right] cur = cur.right
[compare] else
[found] return cur (split point, possibly equal to p or q)
[done] return null (unreachable when p,q present in a BST)
`),
};

function buildLcaBst(args) {
  if (!Array.isArray(args) || args.length < 3) throw new Error('lowest-common-ancestor-of-a-binary-search-tree expects [level, p, q]');
  const rawLevel = args[0];
  let levelLen = -1;
  if (Array.isArray(rawLevel)) levelLen = rawLevel.length;
  else if (typeof rawLevel === 'string') {
    try { levelLen = JSON.parse(rawLevel).length; } catch { throw new Error('Tree input must be level-order JSON'); }
  }
  if (levelLen > 31) throw new Error('Visual bound exceeded: level array length ' + levelLen + ' > 31 (no truncation applied)');
  const { root, nodes, edges } = setup(args);
  let p = args[1];
  let q = args[2];
  if (typeof p === 'string') {
    if (p.trim() === '') throw new Error('lowest-common-ancestor-of-a-binary-search-tree expects integer node values p and q');
    const n = Number(p);
    if (!Number.isSafeInteger(n)) throw new Error('lowest-common-ancestor-of-a-binary-search-tree expects integer node values p and q');
    p = n;
  }
  if (typeof q === 'string') {
    if (q.trim() === '') throw new Error('lowest-common-ancestor-of-a-binary-search-tree expects integer node values p and q');
    const n = Number(q);
    if (!Number.isSafeInteger(n)) throw new Error('lowest-common-ancestor-of-a-binary-search-tree expects integer node values p and q');
    q = n;
  }
  if (!Number.isSafeInteger(p) || !Number.isSafeInteger(q)) throw new Error('lowest-common-ancestor-of-a-binary-search-tree expects integer node values p and q');
  if (p === q) throw new Error('p != q is guaranteed by the constraints; test input violates it');

  const frames = [];
  const visited = [];
  const path = [];
  const view = (cur, extra = {}) => state({ cur, visited, path, vars: { p, q, cur: cur ? cur.value : null, ...extra } });

  if (root === null) {
    frames.push(frame('init', 'Initialize', 'Empty tree: no LCA exists (outside constraints; honest empty render)',
      view(null, { decision: 'empty', result: null })));
    frames.push(frame('done', 'Return result', 'Empty input: no ancestor to return',
      view(null, { decision: 'empty', result: null })));
    return finish({ nodes, edges }, frames, null);
  }

  if (!nodes.some((n) => n.value === p) || !nodes.some((n) => n.value === q)) {
    throw new Error('p=' + p + ' q=' + q + ' must both exist in the BST (constraints guarantee presence)');
  }

  frames.push(frame('init', 'Initialize', 'Start at root ' + root.value + '; targets p=' + p + ' q=' + q,
    view(root, { decision: 'start', result: null })));

  let cur = root;
  let answer = null;
  for (;;) {
    visited.push(cur);
    path.push(cur);
    const bothLeft = p < cur.value && q < cur.value;
    const bothRight = p > cur.value && q > cur.value;
    if (bothLeft || bothRight) {
      frames.push(frame('compare', 'Compare',
        'At ' + cur.value + ': p=' + p + ' and q=' + q + ' are both ' + (bothLeft ? 'smaller' : 'larger'),
        view(cur, { decision: bothLeft ? 'both-left' : 'both-right', result: null })));
      const next = bothLeft ? cur.left : cur.right;
      const nextTxt = next ? 'descend to ' + next.value : 'descend to null (unreachable on valid input)';
      frames.push(frame(bothLeft ? 'go-left' : 'go-right', bothLeft ? 'Go left' : 'Go right',
        p + ',' + q + ' both ' + (bothLeft ? '<' : '>') + ' ' + cur.value + ', so ' + nextTxt,
        view(next, { decision: bothLeft ? 'go-left' : 'go-right', result: null })));
      if (next === null || next === undefined) {
        // Cannot happen for valid BST input with p,q present; honest decline.
        frames.push(frame('done', 'Return result', 'Reached null: input violates BST presence guarantee',
          view(null, { decision: 'unreachable', result: null })));
        return finish({ nodes, edges }, frames, null);
      }
      // Moving down narrows the candidate window; keep full path for the trail.
      cur = next;
    } else {
      const why = cur.value === p || cur.value === q
        ? 'node ' + cur.value + ' is itself a target (ancestor of itself)'
        : 'p=' + p + ' and q=' + q + ' split around ' + cur.value;
      frames.push(frame('compare', 'Compare', 'At ' + cur.value + ': ' + why,
        view(cur, { decision: 'split', result: null })));
      answer = cur.value;
      frames.push(frame('found', 'Found split',
        'LCA is ' + answer + ': first node separating p=' + p + ' and q=' + q,
        view(cur, { decision: 'split', result: answer })));
      frames.push(frame('done', 'Return result', 'Return ' + answer + ' (final)',
        view(cur, { decision: 'done', result: answer })));
      return finish({ nodes, edges }, frames, answer);
    }
  }
}

const serdeJava = code(`
[def] public class Codec {
[def]     public String serialize(TreeNode root) {
[init]         StringBuilder sb = new StringBuilder();
[visit]         buildString(root, sb);
[done]         return sb.toString();
[def]     }
[def]     private void buildString(TreeNode node, StringBuilder sb) {
[visit]         if (node == null) { sb.append("N,"); return; }
[visit]         sb.append(node.val).append(",");
[visit]         buildString(node.left, sb);
[visit]         buildString(node.right, sb);
[def]     }
[def]     public TreeNode deserialize(String data) {
[init]         if (data == null || data.isEmpty()) return null;
[init]         Queue<String> q = new LinkedList<>(Arrays.asList(data.split(",")));
[visit]         return buildTree(q);
[def]     }
[def]     private TreeNode buildTree(Queue<String> q) {
[visit]         String t = q.poll();
[visit]         if (t.equals("N")) return null;
[visit]         TreeNode node = new TreeNode(Integer.parseInt(t));
[visit]         node.left = buildTree(q);
[visit]         node.right = buildTree(q);
[done]         return node;
[def]     }
[def] }
`)

const serdeCpp = code(`
[def] class Codec {
[def] public:
[def]     string serialize(TreeNode* root) {
[init]         string out;
[visit]         buildString(root, out);
[done]         return out;
[def]     }
[def]     void buildString(TreeNode* node, string& out) {
[visit]         if (!node) { out += "N,"; return; }
[visit]         out += to_string(node->val) + ",";
[visit]         buildString(node->left, out);
[visit]         buildString(node->right, out);
[def]     }
[def]     TreeNode* deserialize(string data) {
[init]         if (data.empty()) return nullptr;
[init]         queue<string> q = split(data);
[visit]         return buildTree(q);
[def]     }
[def]     TreeNode* buildTree(queue<string>& q) {
[visit]         string t = q.front(); q.pop();
[visit]         if (t == "N") return nullptr;
[visit]         TreeNode* node = new TreeNode(stoi(t));
[visit]         node->left = buildTree(q);
[visit]         node->right = buildTree(q);
[done]         return node;
[def]     }
[def] };
`)

const serdePseudo = code(`
[def] serialize(root):
[init]   out = []
[visit]   preorder(node): emit val or N; recurse left, right
[done]   return join(out)
[def] deserialize(data):
[init]   tokens = split(data); cursor = 0
[visit]   build(): t = tokens[cursor++]; if t=N return null
[visit]   node = new(t); node.left = build(); node.right = build()
[done]   return node
`)

// Serialize and Deserialize Binary Tree — preorder-with-N Codec walkthrough.
// Staged source: .workers/jobs/question-owners-150/serialize-and-deserialize-binary-tree/adapter.patch.js
function buildSerde(args) {
  const raw = Array.isArray(args) ? args[0] : args
  let level = raw
  if (typeof raw === 'string') {
    try { level = JSON.parse(raw) } catch { throw new Error('Tree input must be level-order JSON') }
  }
  if (!Array.isArray(level)) throw new Error('Expected a level-order array for the tree')
  if (level.length > 63) throw new Error('Tree too large for walkthrough (max 63 entries)')
  if (!level.every((v) => v === null || v === undefined || Number.isSafeInteger(v)))
    throw new Error('Level entries must be integers or null')
  const arr = level.map((v) => (v === undefined ? null : v))
  const reachable = (lv, i) => {
    let p = i
    while (p > 0) {
      p = Math.floor((p - 1) / 2)
      if (p >= lv.length) return false
      if (lv[p] === null || lv[p] === undefined) return false
    }
    return true
  }
  const present = new Map()
  const h = (i) => 'n' + i
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    if (v === null) continue
    let ok = true, p = i
    while (p > 0) { p = Math.floor((p - 1) / 2); if (arr[p] === null || arr[p] === undefined) { ok = false; break } }
    if (!ok) continue
    present.set(i, { id: h(i), heap: i, value: v, depth: Math.floor(Math.log2(i + 1)) })
  }
  const edges = []
  for (const n of present.values()) {
    const l = 2 * n.heap + 1, r = 2 * n.heap + 2
    if (present.has(l)) edges.push([n.id, h(l)])
    if (present.has(r)) edges.push([n.id, h(r)])
  }
  const byId = new Map([...present.values()].map((n) => [n.id, n]))
  const kids = new Map()
  for (const n of present.values()) {
    const l = 2 * n.heap + 1, r = 2 * n.heap + 2
    kids.set(n.id, { left: present.has(l) ? h(l) : null, right: present.has(r) ? h(r) : null })
  }
  const order = []
  const inorder = (id) => {
    if (!id || !byId.has(id)) return
    const k = kids.get(id) || { left: null, right: null }
    if (k.left) inorder(k.left)
    order.push(id)
    if (k.right) inorder(k.right)
  }
  const roots = [...present.values()].filter((n) => n.depth === 0)
  if (roots.length) inorder(roots[0].id)
  else for (const n of present.values()) order.push(n.id)
  const rank = new Map(order.map((id, i) => [id, i]))
  const X = 96, Y = 92
  const nodes = [...present.values()].map((n) => ({ id: n.id, value: n.value, heap: n.heap, x: (rank.get(n.id) ?? 0) * X + 70, y: n.depth * Y + 46 }))
  const layout = { nodes, edges: edges.map((e) => [e[0], e[1]]) }
  const nodeVal = (id) => { const n = nodes.find((x) => x.id === id); return n ? n.value : '?' }
  const toks = []
  const dfsToks = (i) => {
    const v = i < arr.length ? arr[i] : null
    const ok = i < arr.length && v !== null && reachable(arr, i)
    if (!ok) { toks.push('N'); return }
    toks.push(String(v))
    dfsToks(2 * i + 1)
    dfsToks(2 * i + 2)
  }
  dfsToks(0)
  const fullData = toks.join(',')
  const frames = []
  const pushF = (step, label, note, st) => frames.push(frame(step, label, String(note).slice(0, 140), JSON.parse(JSON.stringify(st))))
  if (!nodes.length) {
    const base = { current: null, visited: [], path: [], frontier: [], phase: 'serialize', stack: [], built: [], tokens: [], cursor: -1, tokRole: 'done', vars: { phase: 'serialize', emitted: 0 } }
    pushF('init', 'empty tree', 'root is null: nothing to walk, nothing to emit.', base)
    pushF('done', 'serialize = ""', 'Empty tree serializes to the empty string.', { ...base, tokens: [] })
    pushF('done', 'deserialize = null', 'Empty string deserializes back to null. Roundtrip holds.', { ...base, phase: 'deserialize', vars: { phase: 'deserialize', cursor: 0 } })
    return { kind: 'tree', layout, frames, result: [] }
  }
  const emitted = [], visited = [], stack = []
  const pushS = (phase, current, tokRole, label, note) => {
    pushF(tokRole === 'done' ? 'done' : 'visit', label, note, {
      phase, current, visited: visited.slice(), path: stack.slice(), frontier: current ? [current] : [],
      stack: stack.slice(), built: visited.slice(), tokens: emitted.slice(),
      cursor: emitted.length - 1, tokRole, vars: { phase, emitted: emitted.length, cursor: emitted.length - 1 },
    })
  }
  pushF('init', 'preorder with N markers', 'Walk ' + nodes.length + ' nodes; null child emits N.', {
    phase: 'serialize', current: null, visited: [], path: [], frontier: nodes.length ? [nodes[0].id] : [],
    stack: [], built: [], tokens: [], cursor: -1, tokRole: 'emit',
    vars: { phase: 'serialize', emitted: 0 },
  })
  const serDfs = (i) => {
    const v = i < arr.length ? arr[i] : null
    const ok = i < arr.length && v !== null && reachable(arr, i)
    if (!ok) {
      emitted.push('N')
      pushS('serialize', null, 'emit', 'emit N (#' + emitted.length + ')', 'Null child reached: append N. Tape is now [' + emitted.join(',') + ']')
      return
    }
    const id = h(i)
    stack.push(id)
    emitted.push(String(v))
    visited.push(id)
    pushS('serialize', id, 'emit', 'emit ' + v + ' (#' + emitted.length + ')', 'Visit node ' + v + ': append "' + v + '". Stack [' + stack.map((s) => nodeVal(s)).join('>') + ']')
    serDfs(2 * i + 1)
    serDfs(2 * i + 2)
    stack.pop()
  }
  serDfs(0)
  pushS('serialize', null, 'done', 'serialized: ' + fullData, 'Preorder done: ' + emitted.length + ' tokens. data="' + fullData + '"')
  const built = [], dstack = []
  let cursor = 0
  const pushD = (current, tokRole, label, note) => {
    pushF(tokRole === 'done' ? 'done' : 'visit', label, note, {
      phase: 'deserialize', current, visited: built.slice(), path: dstack.slice(),
      frontier: current ? [current] : [], stack: dstack.slice(), built: built.slice(),
      tokens: toks.slice(), cursor: Math.min(cursor, toks.length - 1), tokRole,
      vars: { phase: 'deserialize', cursor },
    })
  }
  pushD(null, 'emit', 'deserialize starts', 'Split "' + fullData + '" into ' + toks.length + ' tokens. cursor=0.')
  const ids = []
  const dfsA = (i) => {
    const v = i < arr.length ? arr[i] : null
    const ok = i < arr.length && v !== null && reachable(arr, i)
    if (!ok) return 1
    ids.push({ tokIndex: -1, id: 'n' + i })
    const l = dfsA(2 * i + 1), r = dfsA(2 * i + 2)
    return 1 + l + r
  }
  let tt = 0
  const dfsB = (i) => {
    const v = i < arr.length ? arr[i] : null
    const ok = i < arr.length && v !== null && reachable(arr, i)
    if (!ok) { tt += 1; return }
    const rec = ids.find((x) => x.id === 'n' + i && x.tokIndex === -1)
    if (rec) rec.tokIndex = tt
    tt += 1
    dfsB(2 * i + 1)
    dfsB(2 * i + 2)
  }
  dfsA(0); dfsB(0)
  const idAt = (at) => { const hit = ids.find((x) => x.tokIndex === at); return hit ? hit.id : null }
  const deDfs = () => {
    const tok = toks[cursor], at = cursor
    if (tok === 'N') {
      cursor += 1
      pushD(null, 'emit', 'token[' + at + ']=N -> null', 'Consume N at ' + at + ': return null. cursor=' + cursor + '.')
      return null
    }
    cursor += 1
    const id = idAt(at)
    dstack.push(id)
    built.push(id)
    pushD(id, 'emit', 'token[' + at + ']=' + tok + ' -> node', 'Create node ' + tok + ' from token ' + at + '. cursor=' + cursor + '.')
    deDfs(); deDfs()
    dstack.pop()
    return id
  }
  deDfs()
  pushD(null, 'done', 'tree rebuilt', 'All ' + toks.length + ' tokens consumed. Structure matches original.')
  const out = boundedFrames(frames, 40).frames
  // Result convention (matches practice + official examples): canonical level-order
  // array of the REBUILT tree (trailing nulls trimmed), derived from replayed positions.
  const maxHeap = Math.max(-1, ...[...present.keys()])
  const rebuilt = []
  for (let i = 0; i <= maxHeap; i++) rebuilt.push(present.has(i) ? present.get(i).value : null)
  while (rebuilt.length && rebuilt[rebuilt.length - 1] === null) rebuilt.pop()
  return { kind: 'tree', layout, frames: out, result: rebuilt }
}

export const adapters = {
  'binary-tree-inorder-traversal': {
    signature: { name: 'inorderTraversal', params: ['TreeNode'], return: 'int[]' },
    lesson: {
      idea: 'Keep an explicit stack of ancestors; push while descending left, then pop and visit before turning right.',
      trap: 'Visiting a node when it is pushed instead of when it is popped breaks inorder ordering.',
      time: 'O(n)',
      space: 'O(h)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      def: 'The task: list tree values left subtree, then node, then right subtree.',
      init: 'Prepares an empty result and stack with a pointer starting at the root so ancestors can be saved while moving left.',
      loop: 'Continues while the pointer exists or saved ancestors remain so every node is covered and empty input ends immediately.',
      descend: 'Saves each ancestor and moves left repeatedly so the leftmost pending node is reached before any parent is handled.',
      pop: 'Takes the most recent saved ancestor as current because its left subtree is finished so it is next inorder.',
      visit: 'Records the popped node value then moves to its right child because left is done so node comes before right.',
      done: 'Returns the collected result which holds left node right order for all visited nodes and stays empty when none exist.'
    },
    code: inorderCode,
    build(args) {
      const { root, nodes, edges } = setup(args)
      const frames = []
      const res = []
      const visited = []
      let cur = root
      const stack = []
      frames.push(frame('init', 'Initialize', 'Start at the root with an empty stack and result',
        state({ cur, visited, stack, vars: { result: [] } })))
      while (cur !== null || stack.length > 0) {
        while (cur !== null) {
          stack.push(cur)
          frames.push(frame('descend', 'Descend left', 'Push the node, then move to its left child',
            state({ cur: cur.left, visited, stack, path: stack, op: 'push', vars: { result: res.slice() } })))
          cur = cur.left
        }
        const node = stack.pop()
        frames.push(frame('pop', 'Pop ancestor', 'Left subtree is done; this node is next inorder',
          state({ cur: node, visited, stack, path: stack, op: 'pop', vars: { result: res.slice() } })))
        visited.push(node)
        res.push(node.value)
        frames.push(frame('visit', 'Visit node', 'Append the node value to the inorder result',
          state({ cur: node, visited, stack, path: stack, vars: { result: res.slice() } })))
        cur = node.right
        frames.push(frame('visit', 'Move right', 'Continue with the right subtree',
          state({ cur, visited, stack, path: stack, vars: { result: res.slice() } })))
      }
      frames.push(frame('done', 'Return result', `Inorder holds ${res.length} value(s)`,
        state({ visited, stack, vars: { result: res.slice() } })))
      return finish({ nodes, edges }, frames, res)
    }
  },

  'binary-tree-preorder-traversal': {
    signature: { name: 'preorderTraversal', params: ['TreeNode'], return: 'int[]' },
    lesson: {
      idea: 'Push the right child before the left so the stack pops left first, matching preorder.',
      trap: 'Pushing left before right visits the right subtree first and corrupts the order.',
      time: 'O(n)',
      space: 'O(h)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      done: 'Closes collection scope and exposes ordered result so caller receives complete traversal including empty case.',
      guard: 'Handles missing root early so empty tree returns without work and avoids later null handling.',
      init: 'Prepares empty result and work structure so empty input stays empty and traversal starts clean.',
      loop: 'Bounds repetition scope while pending nodes remain so every reachable node is eventually processed.',
      pop: 'Selects most recently staged pending node so traversal proceeds depth first without revisiting.',
      pushleft: 'Stages left subtree on top so it processes next, preserving left before right order.',
      pushright: 'Stages right subtree for later so left subtree completes first while nothing is lost.',
      visit: 'Records current node before its subtrees so parent precedes descendants as preorder requires.'
    },
    code: preorderCode,
    build(args) {
      const { root, nodes, edges } = setup(args)
      const frames = []
      const res = []
      const visited = []
      const stack = []
      frames.push(frame('init', 'Initialize', 'Start with an empty result and stack',
        state({ cur: root, visited, stack, vars: { result: [] } })))
      if (root === null) {
        frames.push(frame('guard', 'Empty tree', 'Root is null, so preorder is empty',
          state({ visited, stack, vars: { result: [] } })))
      } else {
        stack.push(root)
        frames.push(frame('init', 'Push root', 'The root is the first node to process',
          state({ cur: root, visited, stack, op: 'push', path: stack, vars: { result: [] } })))
        while (stack.length > 0) {
          const node = stack.pop()
          frames.push(frame('pop', 'Pop node', 'Remove the next node from the stack',
            state({ cur: node, visited, stack, op: 'pop', path: stack, vars: { result: res.slice() } })))
          visited.push(node)
          res.push(node.value)
          frames.push(frame('visit', 'Visit node', 'Append the node value before its subtrees',
            state({ cur: node, visited, stack, path: stack, vars: { result: res.slice() } })))
          if (node.right !== null) {
            stack.push(node.right)
            frames.push(frame('pushright', 'Push right child', 'Right child must be processed after the left',
              state({ cur: node, visited, stack, op: 'push', path: stack, vars: { result: res.slice() } })))
          }
          if (node.left !== null) {
            stack.push(node.left)
            frames.push(frame('pushleft', 'Push left child', 'Left child sits on top, so it is processed next',
              state({ cur: node, visited, stack, op: 'push', path: stack, vars: { result: res.slice() } })))
          }
        }
      }
      frames.push(frame('done', 'Return result', `Preorder holds ${res.length} value(s)`,
        state({ visited, stack, vars: { result: res.slice() } })))
      return finish({ nodes, edges }, frames, res)
    }
  },

  'binary-tree-postorder-traversal': {
    signature: { name: 'postorderTraversal', params: ['TreeNode'], return: 'int[]' },
    lesson: {
      idea: 'Collect root-right-left by swapping the child pushes, then reverse the list to get left-right-root.',
      trap: 'Forgetting the final reversal returns root-right-left instead of postorder.',
      time: 'O(n)',
      space: 'O(h)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      done: 'Reverses temporary collection into true postorder so leaves precede ancestors as required.',
      guard: 'Exits early on missing root so empty tree yields empty collection without stack work.',
      init: 'Prepares empty collection for reversed buildup so empty input stays empty and growth has a place.',
      loop: 'Bounds repeated collection scope while pending nodes remain so every reachable node is gathered.',
      pop: 'Takes next pending node for collection so depth first progress continues in modified root first order.',
      pushleft: 'Stages left subtree lower in stack so right side collects earlier, enabling the reversal trick.',
      pushright: 'Stages right subtree on top so it collects next, building the reverse of desired final order.',
      visit: 'Appends current value to temporary order so ancestors precede descendants before final reversal fixes sequence.'
    },
    code: postorderCode,
    build(args) {
      const { root, nodes, edges } = setup(args)
      const frames = []
      const collected = []
      const visited = []
      const stack = []
      frames.push(frame('init', 'Initialize', 'Start a collection that will be reversed at the end',
        state({ cur: root, visited, stack, vars: { collected: [] } })))
      if (root === null) {
        frames.push(frame('guard', 'Empty tree', 'Root is null, so postorder is empty',
          state({ visited, stack, vars: { collected: [] } })))
      } else {
        stack.push(root)
        frames.push(frame('init', 'Push root', 'Begin the root-right-left collection',
          state({ cur: root, visited, stack, op: 'push', path: stack, vars: { collected: [] } })))
        while (stack.length > 0) {
          const node = stack.pop()
          frames.push(frame('pop', 'Pop node', 'Remove the next node from the stack',
            state({ cur: node, visited, stack, op: 'pop', path: stack, vars: { collected: collected.slice() } })))
          visited.push(node)
          collected.push(node.value)
          frames.push(frame('visit', 'Collect node', 'Append the value in root-right-left order',
            state({ cur: node, visited, stack, path: stack, vars: { collected: collected.slice() } })))
          if (node.left !== null) {
            stack.push(node.left)
            frames.push(frame('pushleft', 'Push left child', 'Left goes on the stack before the right',
              state({ cur: node, visited, stack, op: 'push', path: stack, vars: { collected: collected.slice() } })))
          }
          if (node.right !== null) {
            stack.push(node.right)
            frames.push(frame('pushright', 'Push right child', 'Right sits on top and is collected first',
              state({ cur: node, visited, stack, op: 'push', path: stack, vars: { collected: collected.slice() } })))
          }
        }
      }
      const res = collected.slice().reverse()
      const finalVisited = visited.slice().reverse()
      frames.push(frame('done', 'Reverse collection', 'Reverse root-right-left into left-right-root',
        state({ visited: finalVisited, stack, vars: { collected: collected.slice(), result: res.slice() } })))
      return finish({ nodes, edges }, frames, res)
    }
  },

  'maximum-depth-of-binary-tree': {
    signature: { name: 'maxDepth', params: ['TreeNode'], return: 'int' },
    lesson: {
      idea: 'Breadth-first levels: count how many rounds of queue draining are needed to reach the last level.',
      trap: 'Counting nodes instead of levels overcounts depth on wide trees.',
      time: 'O(n)',
      space: 'O(w)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      childleft: 'Queues present left child for following layer so deeper structure extends depth without affecting current count.',
      childright: 'Queues present right child for following layer so breadth is preserved and depth grows only per layer.',
      done: 'Closes counting scope and reports accumulated layers so result equals longest root to leaf path length.',
      guard: 'Returns immediately for missing root so empty tree needs no level processing.',
      init: 'Establishes zero depth with empty queue so empty input correctly stays at zero depth.',
      level: 'Freezes current frontier width and credits one depth so exactly one layer counts per round.',
      loop: 'Defines level draining repetition scope that persists while unprocessed frontier nodes remain.',
      visit: 'Removes front node of current layer for inspection so each node contributes children exactly once.'
    },
    code: depthCode,
    build(args) {
      const { root, nodes, edges } = setup(args)
      const frames = []
      const visited = []
      const queue = []
      let depth = 0
      frames.push(frame('init', 'Initialize', 'A depth-zero tree and an empty queue',
        state({ cur: root, visited, queue, vars: { depth: 0 } })))
      if (root === null) {
        frames.push(frame('guard', 'Empty tree', 'Root is null, so maximum depth is 0',
          state({ visited, queue, vars: { depth: 0 } })))
      } else {
        queue.push(root)
        frames.push(frame('init', 'Enqueue root', 'The root starts level one',
          state({ cur: root, visited, queue, vars: { depth: 0 } })))
        while (queue.length > 0) {
          const size = queue.length
          depth += 1
          frames.push(frame('level', 'Next level', `Process ${size} node(s) at depth ${depth}`,
            state({ visited, queue, vars: { depth, size } })))
          for (let i = 0; i < size; i++) {
            const node = queue.shift()
            visited.push(node)
            frames.push(frame('visit', 'Visit node', 'Poll this node from the current level',
              state({ cur: node, visited, queue, vars: { depth, size } })))
            if (node.left !== null) {
              queue.push(node.left)
              frames.push(frame('childleft', 'Enqueue left', 'Left child belongs to the next level',
                state({ cur: node, visited, queue, vars: { depth, size } })))
            }
            if (node.right !== null) {
              queue.push(node.right)
              frames.push(frame('childright', 'Enqueue right', 'Right child belongs to the next level',
                state({ cur: node, visited, queue, vars: { depth, size } })))
            }
          }
        }
      }
      frames.push(frame('done', 'Return depth', `The deepest level is ${depth}`,
        state({ visited, queue, vars: { depth } })))
      return finish({ nodes, edges }, frames, depth)
    }
  },

  'binary-tree-level-order-traversal': {
    signature: { name: 'levelOrder', params: ['TreeNode'], return: 'int[][]' },
    lesson: {
      idea: 'Snapshot the queue size before each round so every dequeued node belongs to the same level.',
      trap: 'Letting the queue grow during the loop mixes levels and flattens the output.',
      time: 'O(n)',
      space: 'O(w)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      childleft: 'Queues present left child for next round so grouping stays by depth and relatives stay together.',
      childright: 'Queues present right child for next round so grouping stays by depth and relatives stay together.',
      done: 'Closes grouping scope and exposes grouped result so empty input yields no groups and all layers appear otherwise.',
      guard: 'Handles missing root early so empty tree yields no levels without queue work.',
      init: 'Prepares empty result and queue so empty input yields no levels and traversal starts clean.',
      level: 'Captures fixed width with fresh level container so growth during round cannot leak into current group.',
      loop: 'Bounds level grouping repetition scope while queued frontier remains so all depths are emitted.',
      push: 'Appends finished group to overall result so levels accumulate in top to bottom order.',
      visit: 'Removes front node and adds its value to current group so level preserves left to right encounter order.'
    },
    code: levelCode,
    build(args) {
      const { root, nodes, edges } = setup(args)
      const frames = []
      const res = []
      const visited = []
      const queue = []
      frames.push(frame('init', 'Initialize', 'An empty result and an empty queue',
        state({ cur: root, visited, queue, vars: { result: [] } })))
      if (root === null) {
        frames.push(frame('guard', 'Empty tree', 'Root is null, so there are no levels',
          state({ visited, queue, vars: { result: [] } })))
      } else {
        queue.push(root)
        frames.push(frame('init', 'Enqueue root', 'The root is the only node at level one',
          state({ cur: root, visited, queue, vars: { result: [] } })))
        while (queue.length > 0) {
          const size = queue.length
          const level = []
          frames.push(frame('level', 'Start level', `Take the current queue width of ${size}`,
            state({ visited, queue, vars: { level: [], result: res.slice() } })))
          for (let i = 0; i < size; i++) {
            const node = queue.shift()
            visited.push(node)
            level.push(node.value)
            frames.push(frame('visit', 'Visit node', 'Poll the node and append its value to this level',
              state({ cur: node, visited, queue, vars: { level: level.slice(), result: res.slice() } })))
            if (node.left !== null) {
              queue.push(node.left)
              frames.push(frame('childleft', 'Enqueue left', 'Left child will be visited on the next level',
                state({ cur: node, visited, queue, vars: { level: level.slice(), result: res.slice() } })))
            }
            if (node.right !== null) {
              queue.push(node.right)
              frames.push(frame('childright', 'Enqueue right', 'Right child will be visited on the next level',
                state({ cur: node, visited, queue, vars: { level: level.slice(), result: res.slice() } })))
            }
          }
          res.push(level)
          frames.push(frame('push', 'Finish level', `Append this level, now ${res.length} level(s) total`,
            state({ visited, queue, vars: { level: level.slice(), result: res.slice() } })))
        }
      }
      frames.push(frame('done', 'Return levels', `Level order holds ${res.length} level(s)`,
        state({ visited, queue, vars: { result: res.slice() } })))
      return finish({ nodes, edges }, frames, res)
    }
  },
  'search-in-a-binary-search-tree': {
    signature: { name: 'searchBST', params: ['TreeNode', 'int'], return: 'TreeNode' },
    lesson: {
      idea: 'Use BST ordering at each node: equal returns the subtree, smaller goes left, larger goes right.',
      trap: 'Scanning the whole tree or recursing into both sides ignores BST order and misses the O(h) descend.',
      time: 'O(h)',
      space: 'O(1)'
    },
    code: bstSearchCode,
    build: buildBSTSearch
  },
  'validate-binary-search-tree': {
    signature: { name: 'isValidBST', params: ['TreeNode'], return: 'boolean' },
    lesson: {
      idea: 'Carry an open interval (lo,hi) down; each node must lie strictly inside it.',
      trap: 'Checking only parent or children misses deep violations like 3 under 5 inside 4.',
      time: 'O(n)',
      space: 'O(h)'
    },
    // Per-line explanations (presentation metadata, never compiled).
    // Step notes distilled from the reviewed Q150 lesson.md (approach/invariant/
    // traps/alternate + every-line notes); no example values, all <=140 chars.
    explain: {
      init: 'Opens the check with a fully open window: null bounds mean no ancestor constraint yet, which keeps 32-bit extremes safe.',
      visit: 'Null subtree is vacuously valid; otherwise this node must be strictly inside its inherited (lo, hi) window.',
      violation: 'Strict comparison rejects out-of-window values and duplicates: <= lo or >= hi fails at once.',
      check: 'Recurse left keeping lo and tightening hi to node.val; mirror on the right. Both sides must hold.',
      done: 'Combines both verdicts: one bad subtree poisons the whole tree.'
    },
    code: validateCode,
    build: buildValidateBST
  },
  'invert-binary-tree': {
    signature: { name: 'invertTree', params: ['TreeNode'], return: 'TreeNode' },
    lesson: {
      idea: 'Mirror every node: save the left child, point left at right, restore saved right, then recurse both sides.',
      trap: 'Overwriting a child before saving it loses the subtree; recursing before swapping mirrors the wrong children.',
      time: 'O(n)',
      space: 'O(h)'
    },
    // Per-line explanations (presentation metadata, never compiled).
    // Verbatim from the reviewed delivery-extension explain patch; keys match
    // the exact step tags in invertCode, verified against live code.
    explain: {
      init: 'Opens the mirror walk at the given root; every node below will have its children exchanged.',
      guard: 'Null needs no work, so an empty tree or empty child returns immediately without swapping.',
      visit: 'Saves the current left child first so the later overwrite does not lose that subtree.',
      swap: 'Points left at the old right and right at the saved left, completing the mirror at this node.',
      recleft: 'Mirrors the now-swapped left subtree so the exchange propagates downward on that side.',
      recright: 'Mirrors the now-swapped right subtree so both sides end up exchanged, not just the top.',
      done: 'Returns the same root reference, now the top of the fully mirrored tree.'
    },
    code: invertCode,
    build: buildInvert
  },
  'symmetric-tree': {
    signature: { name: 'isSymmetric', params: ['TreeNode'], return: 'boolean' },
    lesson: {
      idea: 'Queue mirror pairs (left vs right); each pair must match then enqueue outer and inner children.',
      trap: 'Nulls are pairs too: both null continues, one null fails; values must match before enqueue.',
      time: 'O(n)',
      space: 'O(w)'
    },
    code: symCode,
    build: buildSymmetric
  },
  'minimum-depth-of-binary-tree': {
    signature: { name: 'minDepth', params: ['TreeNode'], return: 'int' },
    lesson: {
      idea: 'BFS level by level; the first leaf dequeued ends the search at min depth.',
      trap: 'A null child is not a leaf; only a node with no children can stop search.',
      time: 'O(n)',
      space: 'O(w)'
    },
    code: minDepthCode,
    build: buildMinDepth
  },
  'path-sum': {
    signature: { name: 'hasPathSum', params: ['TreeNode', 'int'], return: 'boolean' },
    lesson: {
      idea: 'Carry the remaining sum down; each visit subtracts node value and checks leaves.',
      trap: 'Any node match is not enough; only a leaf with zero remainder counts.',
      time: 'O(n)',
      space: 'O(h)'
    },
    code: pathSumCode,
    build: buildPathSum
  },
  'diameter-of-binary-tree': {
    signature: { name: 'diameterOfBinaryTree', params: ['TreeNode'], return: 'int' },
    lesson: {
      idea: 'Post-order heights: each node returns 1+max(child heights) while best tracks max left+right.',
      trap: 'Diameter counts edges and may skip the root, so keep the max over every node, not just root.',
      time: 'O(n)',
      space: 'O(h)'
    },
    explain: {
      init: 'Sets up the run: best starts at 0 so the first through-path becomes the baseline.',
      guard: 'Stops the recursion: a null child contributes height 0 and no path.',
      visit: 'Solves a node after both subtrees: post-order order is what makes heights valid.',
      recurse: 'Descends into one child subtree so its height is known before the parent combines.',
      update: 'Tests the through-path left+right here against the global best; edges, not nodes.',
      return: 'Bubbles one height up: 1 plus the taller child, the only value the parent may reuse.',
      done: 'Reports the largest through-path seen at any node, which may skip the root.'
    },
    explainLines: {
      java: {
        3: 'Zeroes the global best before the depth walk; every through-path competes against it.',
        4: 'Launches the post-order walk that fills best as a side effect.',
        9: 'Solves the left subtree first so left height is ready for the combine step.',
        10: 'Solves the right subtree next; both heights must be known before updating best.',
        11: 'Through-path candidate at this node: left edges plus right edges.'
      },
      cpp: {
        3: 'Zeroes the member best before the depth walk; every through-path competes against it.',
        4: 'Launches the post-order walk that fills best as a side effect.',
        11: 'Solves the left subtree first so left height is ready for the combine step.',
        12: 'Solves the right subtree next; both heights must be known before updating best.',
        13: 'Through-path candidate at this node: left edges plus right edges.'
      },
      pseudo: {
        1: 'Zeroes the global best before the depth walk; every through-path competes against it.',
        2: 'Launches the post-order walk that fills best as a side effect.',
        5: 'Solves both subtrees first; heights must be known before the combine step.',
        6: 'Through-path candidate at this node: left edges plus right edges.'
      }
    },
    code: diameterCode,
    build: buildDiameter
  },
  'binary-tree-maximum-path-sum': {
    signature: { name: 'maxPathSum', params: ['TreeNode'], return: 'int' },
    lesson: {
      idea: 'Post-order gains: each node returns its value plus the richer clamped side while best tracks the max two-sided split.',
      trap: 'Returning the two-sided split upward reuses the node twice; only one side may extend to the parent.',
      time: 'O(n)',
      space: 'O(h)'
    },
    // Per-line explanations (presentation metadata, never compiled).
    // Fresh concise step notes grounded in the staged invariant (gain vs
    // through-path) and its documented common mistake; staged prose exceeded
    // the length cap so nothing was copied verbatim (P16 precedent).
    explain: {
      init: 'Opens the post-order walk; best starts below any real sum so all-negative trees still record their least-bad node.',
      guard: 'A missing child contributes zero upward; zero is the baseline each clamp compares against.',
      visit: 'Enters a node before its gain is known; both subtrees must be solved first, so this walk is post-order.',
      clamp: 'Keeps a child gain that grows the parent path and drops a negative one to zero; losses never extend upward.',
      split: 'Builds the best path through this node from both clamped sides and records it when it beats every path seen so far.',
      return: 'Returns this node plus at most one side upward; the two-sided split is reported, never extended.',
      done: 'Closes the walk; the answer is the best through-path observed at any node, which may skip the root.'
    },
    code: maxPathCode,
    build: buildMaxPath
  },
  'kth-smallest-element-in-a-bst': {
    signature: { name: 'kthSmallest', params: ['TreeNode', 'int'], return: 'int' },
    lesson: {
      idea: 'Inorder of a BST visits values sorted; count visits and stop at the kth one.',
      trap: 'Traversing the whole tree wastes work; return as soon as count hits k.',
      time: 'O(h+k)',
      space: 'O(h)'
    },
    // Per-line explanations (presentation metadata, never compiled).
    // Distilled from the reviewed Q150 explain.json; over-length staged prose
    // shortened to the 140-char contract, no example values.
    explain: {
      descend: 'Push ancestors while moving left so the stack top is always the smallest unvisited node.',
      done: 'Closes the call with the frozen kth value, or throws out-of-range when k exceeds the node count; single-tree walk only.',
      found: 'Tests count against k and freezes the current value as the answer exactly when the kth inorder visit arrives.',
      init: 'Start with an empty ancestor stack, cur at root, count at 0; the first left descent begins at the root.',
      pop: 'Pops the nearest saved ancestor (java stack.pop / cpp top+pop) because its whole left subtree is finished, so it is next inorder.',
      stop: 'Clears the stack and nulls cur to halt early after the kth visit; no further left moves or right turns run.',
      visit: 'Counts one more inorder visit (count+1) and reads its value, then later steps right; in a BST this visit order is sorted ascending.'
    },
    code: kthCode,
    build: buildKthSmallest
  },
  'same-tree': {
    signature: { name: 'isSameTree', params: ['TreeNode', 'TreeNode'], return: 'boolean' },
    lesson: {
      idea: 'Queue lockstep pairs; both null skips, one null or value gap fails, else queue left-left plus right-right.',
      trap: 'Nulls are pairs too; check both-null first, then one-null, then values before enqueueing children.',
      time: 'O(n)',
      space: 'O(w)'
    },
    // Per-line explanations (presentation metadata, never compiled).
    // Verbatim from the reviewed delivery-extension explain patch; keys match
    // the exact step tags in sameCode, verified against live code.
    explain: {
      check: 'Dequeues the next queued pair and names it (a, b); exactly one paired position is decided per loop pass.',
      done: 'Closes the walk: an exhausted queue means every pair matched (true); any mismatch already returned false.',
      enqueue: 'Values matched at this pair, so stage its left-left and right-right child pairs for later checks.',
      init: 'Seeds the queue with the single pair (p, q); both empty starts as (null, null) so the first check decides.',
      mismatch: 'One side null or a value gap at this pair rejects the whole comparison and returns false.',
      skip: 'Both sides null at the same position: this pair holds, so continue with the next queued pair.'
    },
    code: sameCode,
    build: buildSameTree
  },
  'subtree-of-another-tree': {
    signature: { name: 'isSubtree', params: ['TreeNode', 'TreeNode'], return: 'boolean' },
    lesson: {
      idea: 'Try every node of root as a possible anchor in preorder; at each anchor run an exact structural equality check against subRoot.',
      trap: 'Comparing only values at one node (or only the root values) misses shape: both values AND null/non-null structure must agree at every paired position.',
      time: 'O(m * n) worst case (m root nodes, n subRoot nodes)',
      space: 'O(h_root + h_sub) recursion depth'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    // Coordinator note: staged enter prose described only the null base case,
    // but the same tag drives anchor-try frames, so enter covers both; the two
    // staged mismatch lines share one shape-or-value note (single map entry).
    explain: {
      init: 'Opens the anchor scan: every node of root will be tried as a possible top of subRoot.',
      enter: 'Tries the current node as an anchor; an exhausted branch here reports false for this path.',
      compare: 'Tests the current anchor with a full structural comparison before moving on.',
      'scan-left': 'Anchor rejected here, so recurse into the left subtree and propagate a hit upward.',
      'scan-right': 'Left held nothing, so the answer is whatever the right subtree reports.',
      check: 'Opens the pairwise structural check used at each anchor.',
      skip: 'Both sides absent at the same position: this pair holds, keep checking siblings.',
      mismatch: 'A null-versus-present split or a value conflict at this pair rejects the anchor.',
      match: 'This pair holds, so the verdict is the conjunction of both child pairs.',
      done: 'Closes each frame; the top call returns true iff some anchor accepted.'
    },
    code: subtreeCode,
    build: buildSubtree
  },
  'binary-tree-paths': {
    signature: { name: 'binaryTreePaths', params: ['TreeNode'], return: 'string[]' },
    lesson: {
      idea: 'DFS with a shared path: push each value, record the joined path at leaves, pop on return.',
      trap: 'Forgetting to pop after a leaf or subtree leaks values into sibling paths.',
      time: 'O(n*h)',
      space: 'O(h)'
    },
    code: pathsCode,
    build: buildTreePaths
  },
  'construct-binary-tree-from-preorder-and-inorder-traversal': {
    signature: { name: 'buildTree', params: ['int[]', 'int[]'], return: 'TreeNode' },
    lesson: {
      idea: 'Preorder names the next root; the inorder map splits its slice into left part and right part to recurse.',
      trap: 'Scanning inorder for each root is quadratic; index each value once, and consume preorder strictly in order.',
      time: 'O(n)',
      space: 'O(n)'
    },
    explain: constructExplain,
    code: constructCode,
    build: buildConstruct
  },
  'lowest-common-ancestor-of-a-binary-search-tree': {
    signature: { name: 'lowestCommonAncestor', params: ['TreeNode', 'TreeNode', 'TreeNode'], return: 'TreeNode' },
    lesson: {
      idea: 'Walk down with BST order: both targets left -> go left; both right -> go right; else this node splits them and is the LCA.',
      trap: 'Recursing into both sides like generic LCA ignores BST order and costs O(n); also forgetting a node can be its own descendant breaks the p-ancestor case.',
      time: 'O(h)',
      space: 'O(1)'
    },
    // Per-line explanations (presentation metadata, never compiled).
    // Distilled from the reviewed QO150 lesson.md every-line notes (staged prose
    // carries example values, so nothing copied verbatim); keys match the exact
    // step tags in lcaBstCode, all <=140 chars, no fences.
    explain: {
      init: 'Parks the cursor at the root with both targets named so the descent starts at the ancestor of every node.',
      compare: 'Tests both targets against the current node: both smaller goes left, both larger goes right, else split.',
      'go-left': 'Steps to the left child, pruning the right side because both targets precede this node in BST order.',
      'go-right': 'Steps to the right child, pruning the left side because both targets exceed this node in BST order.',
      found: 'Returns the current node as the LCA: the first node from the top where the targets split or one matches.',
      done: 'Closes the walk with the recorded ancestor; the null fallback is unreachable when both targets are present.'
    },
    code: lcaBstCode,
    build: buildLcaBst
  },
  'serialize-and-deserialize-binary-tree': {
    signature: { name: 'codecRoundtrip', params: ['TreeNode'], return: 'TreeNode' },
    lesson: {
      idea: 'Preorder with one N marker per null child makes the token stream self-delimiting; a single shared cursor rebuilds the same structure.',
      trap: 'Skipping null markers misaligns the decoder: a chain needs a marker for every missing child or left/right swap silently.',
      time: 'O(n)',
      space: 'O(n) tokens plus O(h) recursion',
      alt: 'Level-order BFS codec writes one slot per heap position and rebuilds by index arithmetic; preorder is canonical for interviews because the cursor logic is shorter and works without heap math.'
    },
    explain: {
      def: 'Scope of the Codec roundtrip; any encoding is accepted when the structure survives.',
      init: 'Set up the walk: empty trees serialize to "" and deserialize back to null.',
      visit: 'Emit one token per real node plus N per null child, or consume one token and rebuild one node.',
      done: 'Preorder done with the full tape, or all tokens consumed with the original structure rebuilt.'
    },
    explainLines: {
      java: {
        22: 'End of the Codec class scope; it performs no algorithm operation.'
      },
      cpp: {
        23: 'End of the Codec class scope; it performs no algorithm operation.'
      },
      pseudo: {}
    },
    code: { java: serdeJava, cpp: serdeCpp, pseudo: serdePseudo },
    build: buildSerde
  }
}

export default adapters
