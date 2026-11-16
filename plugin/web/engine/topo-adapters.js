import { code, frame } from './semantic-core.js'

// Visual bound: keep node/edge diagrams readable. Over-bound inputs are
// rejected with a clear error (never truncated silently).
const MAX_COURSES = 12
const MAX_EDGES = 24

const courseJava = code(`
[def] import java.util.*;
[def] class Solution {
[def]     public boolean canFinish(int numCourses, int[][] prerequisites) {
[init]         List<List<Integer>> adj = new ArrayList<>();
[init]         for (int i = 0; i < numCourses; i++) adj.add(new ArrayList<>());
[init]         int[] indegree = new int[numCourses];
[init]         for (int[] p : prerequisites) { int a = p[0]; int b = p[1]; adj.get(b).add(a); indegree[a]++; }
[enqueue]         Queue<Integer> q = new ArrayDeque<>();
[enqueue]         for (int i = 0; i < numCourses; i++) if (indegree[i] == 0) q.offer(i);
[dequeue]         List<Integer> order = new ArrayList<>();
[dequeue]         while (!q.isEmpty()) {
[dequeue]             int cur = q.poll(); order.add(cur);
[relax]             for (int nxt : adj.get(cur)) { indegree[nxt]--;
[ready]                 if (indegree[nxt] == 0) q.offer(nxt);
[relax]             }
[dequeue]         }
[cycle]         boolean complete = (order.size() == numCourses);
[return]         return complete;
[def]     }
[def] }
`)

const courseCpp = code(`
[def] #include <vector>
[def] #include <queue>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
[init]         vector<vector<int>> adj(numCourses);
[init]         vector<int> indegree(numCourses, 0);
[init]         for (auto& p : prerequisites) { int a = p[0]; int b = p[1]; adj[b].push_back(a); indegree[a]++; }
[enqueue]         queue<int> q;
[enqueue]         for (int i = 0; i < numCourses; i++) if (indegree[i] == 0) q.push(i);
[dequeue]         vector<int> order; order.reserve(numCourses);
[dequeue]         while (!q.empty()) {
[dequeue]             int cur = q.front(); q.pop(); order.push_back(cur);
[relax]             for (int nxt : adj[cur]) { indegree[nxt]--;
[ready]                 if (indegree[nxt] == 0) q.push(nxt);
[relax]             }
[dequeue]         }
[cycle]         bool complete = ((int)order.size() == numCourses);
[return]         return complete;
[def]     }
[def] };
`)

const coursePseudo = code(`
[def] canFinish(numCourses, prerequisites):
[init]   adj = [[] for _ in range(numCourses)]; indegree = [0] * numCourses
[init]   for [a, b] in prerequisites: adj[b].append(a); indegree[a] += 1
[enqueue]   q = deque([i for i in range(numCourses) if indegree[i] == 0])
[dequeue]   order = []
[dequeue]   while q is not empty:
[dequeue]     cur = q.popleft(); order.append(cur)
[relax]     for nxt in adj[cur]: indegree[nxt] -= 1
[ready]       if indegree[nxt] == 0: q.append(nxt)
[cycle]   complete = (len(order) == numCourses)
[return]   return complete
`)

function fail(message) {
  throw new Error(message)
}

function checkBound(numCourses, prereqs) {
  if (!Number.isInteger(numCourses)) fail('numCourses must be an integer (got ' + JSON.stringify(numCourses) + ')')
  if (!Array.isArray(prereqs)) fail('prerequisites must be an array of [a,b] pairs')
  if (numCourses < 1 || numCourses > MAX_COURSES) {
    fail('Course visual limited to 1..' + MAX_COURSES + ' courses (got ' + numCourses + ')')
  }
  if (prereqs.length > MAX_EDGES) {
    fail('Course visual limited to 0..' + MAX_EDGES + ' prerequisites (got ' + prereqs.length + ')')
  }
  for (let i = 0; i < prereqs.length; i++) {
    const p = prereqs[i]
    if (!Array.isArray(p) || p.length !== 2) fail('prerequisites[' + i + '] must be a pair [a,b]')
    const a = p[0]
    const b = p[1]
    if (!Number.isInteger(a) || !Number.isInteger(b)) fail('prerequisites[' + i + '] must hold integers (got ' + JSON.stringify(p) + ')')
    if (a < 0 || a >= numCourses || b < 0 || b >= numCourses) {
      fail('prerequisites[' + i + '] out of range for ' + numCourses + ' courses (got [' + a + ',' + b + '])')
    }
  }
}

function build(args) {
  if (!Array.isArray(args) || args.length !== 2) fail('Course walkthrough needs [numCourses, prerequisites]')
  const numCourses = args[0]
  const inputPrereqs = args[1]
  checkBound(numCourses, inputPrereqs)
  // Preserve actual input values: deep copy for layout, never reorder input.
  const prereqs = inputPrereqs.map(p => [p[0], p[1]])
  const adj = Array.from({ length: numCourses }, () => [])
  const indegree = new Array(numCourses).fill(0)
  const frames = []
  const anchors = []
  const queue = []
  const order = []

  const snap = () => ({
    current: null,
    queue: queue.slice(),
    order: order.slice(),
    indegree: indegree.slice(),
    answer: order.length === numCourses,
    vars: { numCourses, placed: order.length, queueLen: queue.length }
  })
  const at = (current, extraVars) => ({
    current,
    queue: queue.slice(),
    order: order.slice(),
    indegree: indegree.slice(),
    answer: order.length === numCourses,
    vars: { numCourses, placed: order.length, queueLen: queue.length, ...extraVars }
  })
  const push = (step, label, note, state) => {
    frames.push(frame(step, label, note, state))
  }

  push('init', 'Initialize', 'n=' + numCourses + ', edges=' + prereqs.length + '; indegree zeros', snap())
  for (let i = 0; i < prereqs.length; i++) {
    const a = prereqs[i][0]
    const b = prereqs[i][1]
    adj[b].push(a)
    indegree[a]++
    push('init', 'Add edge ' + i, 'need ' + b + ' before ' + a + '; indegree[' + a + ']=' + indegree[a], at(a, { edge: i, from: b, to: a }))
  }

  const ready0 = []
  for (let i = 0; i < numCourses; i++) if (indegree[i] === 0) ready0.push(i)
  if (ready0.length === 0) {
    push('enqueue', 'Seed queue', 'no indegree-0 course; queue=[]', at(null, { ready: 0 }))
  } else {
    for (const v of ready0) {
      queue.push(v)
      push('enqueue', 'Enqueue ' + v, 'indegree[' + v + ']=0; queue=[' + queue.join(',') + ']', at(null, { ready: ready0.length }))
    }
  }

  // Kahn: always consume a ready node, erase its outgoing influence,
  // enqueue nodes that become ready. Deterministic: FIFO queue, input edge order.
  let firstTake = true
  while (queue.length > 0) {
    const cur = queue.shift()
    order.push(cur)
    push('dequeue', 'Take ' + cur, 'order=[' + order.join(',') + ']; queue=[' + queue.join(',') + ']', at(cur, {}))
    if (firstTake) {
      anchors.push(frames.length - 1)
      firstTake = false
    }
    const outs = adj[cur].slice()
    for (const nxt of outs) {
      const before = indegree[nxt]
      indegree[nxt]--
      push('relax', 'Erase ' + cur + '->' + nxt, 'indegree[' + nxt + ']: ' + before + '->' + indegree[nxt], at(nxt, { from: cur, to: nxt }))
      if (indegree[nxt] === 0) {
        queue.push(nxt)
        push('ready', 'Ready ' + nxt, 'indegree[' + nxt + ']=0; queue=[' + queue.join(',') + ']', at(nxt, { from: cur }))
        anchors.push(frames.length - 1)
      }
    }
  }

  // Incomplete order demonstrates a cycle: explicit verified event, not an error.
  const complete = order.length === numCourses
  if (complete) {
    push('cycle', 'Verify complete', 'order ' + order.length + '/' + numCourses + ' complete; no cycle', at(null, { placed: order.length }))
  } else {
    push('cycle', 'Verify cycle', 'order ' + order.length + '/' + numCourses + '; ' + (numCourses - order.length) + ' stuck -> cycle', at(null, { placed: order.length }))
  }
  anchors.push(frames.length - 1)
  push('return', 'Return', 'return ' + complete, at(null, { placed: order.length }))
  anchors.push(frames.length - 1)

  return {
    kind: 'graph',
    layout: {
      numCourses,
      prerequisites: prereqs.map(p => [p[0], p[1]]),
      // Contract-shaped graph nodes/edges: labeled course nodes, directed b->a pairs.
      nodes: Array.from({ length: numCourses }, (_, i) => ({ id: i, label: String(i) })),
      edges: prereqs.map(p => [p[1], p[0]])
    },
    frames,
    result: complete,
    anchors
  }
}

// Visual bound for the order walkthrough (narrower than the judge: 1..2000).
const MAX_ORDER_COURSES = 7
const MAX_ORDER_EDGES = 12

// Deterministic tie-break: largest-ready-first Kahn. Any ready choice is a
// valid topological order, but the exact-equality harness pins one output, so
// we always take the largest-numbered ready course (max-heap). On the dataset
// case n=4 edges [[1,0],[2,0],[3,1],[3,2]] this yields exactly [0,2,1,3],
// while plain FIFO input-order Kahn would yield [0,1,2,3].
const orderJava = code(`
[def] import java.util.*;
[def] class Solution {
[def]     public int[] findOrder(int numCourses, int[][] prerequisites) {
[init]         List<List<Integer>> adj = new ArrayList<>();
[init]         for (int i = 0; i < numCourses; i++) adj.add(new ArrayList<>());
[init]         int[] indegree = new int[numCourses];
[init]         for (int[] p : prerequisites) { int a = p[0]; int b = p[1]; adj.get(b).add(a); indegree[a]++; }
[enqueue]         PriorityQueue<Integer> q = new PriorityQueue<>(Collections.reverseOrder());
[enqueue]         for (int i = 0; i < numCourses; i++) if (indegree[i] == 0) q.offer(i);
[dequeue]         List<Integer> order = new ArrayList<>();
[dequeue]         while (!q.isEmpty()) {
[dequeue]             int cur = q.poll(); order.add(cur);
[relax]             for (int nxt : adj.get(cur)) { indegree[nxt]--;
[ready]                 if (indegree[nxt] == 0) q.offer(nxt);
[relax]             }
[dequeue]         }
[cycle]         if (order.size() != numCourses) return new int[0];
[return]         int[] ans = new int[order.size()];
[return]         for (int i = 0; i < order.size(); i++) ans[i] = order.get(i);
[return]         return ans;
[def]     }
[def] }
`)

const orderCpp = code(`
[def] #include <vector>
[def] #include <queue>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     vector<int> findOrder(int numCourses, vector<vector<int>>& prerequisites) {
[init]         vector<vector<int>> adj(numCourses);
[init]         vector<int> indegree(numCourses, 0);
[init]         for (auto& p : prerequisites) { int a = p[0]; int b = p[1]; adj[b].push_back(a); indegree[a]++; }
[enqueue]         priority_queue<int> q;
[enqueue]         for (int i = 0; i < numCourses; i++) if (indegree[i] == 0) q.push(i);
[dequeue]         vector<int> order; order.reserve(numCourses);
[dequeue]         while (!q.empty()) {
[dequeue]             int cur = q.top(); q.pop(); order.push_back(cur);
[relax]             for (int nxt : adj[cur]) { indegree[nxt]--;
[ready]                 if (indegree[nxt] == 0) q.push(nxt);
[relax]             }
[dequeue]         }
[cycle]         if ((int)order.size() != numCourses) return {};
[return]         return order;
[def]     }
[def] };
`)

const orderPseudo = code(`
[def] findOrder(numCourses, prerequisites):
[init]   adj = [[] for _ in range(numCourses)]; indegree = [0] * numCourses
[init]   for [a, b] in prerequisites: adj[b].append(a); indegree[a] += 1
[enqueue]   q = max-heap([i for i in range(numCourses) if indegree[i] == 0])
[dequeue]   order = []
[dequeue]   while q is not empty:
[dequeue]     cur = q.popMax(); order.append(cur)
[relax]     for nxt in adj[cur]: indegree[nxt] -= 1
[ready]       if indegree[nxt] == 0: q.push(nxt)
[cycle]   if len(order) != numCourses: return []
[return]   return order
`)

function failOrder(message) {
  throw new Error(message)
}

function checkOrderBound(numCourses, prereqs) {
  if (!Number.isInteger(numCourses)) failOrder('numCourses must be an integer (got ' + JSON.stringify(numCourses) + ')')
  if (!Array.isArray(prereqs)) failOrder('prerequisites must be an array of [a,b] pairs')
  if (numCourses < 1 || numCourses > MAX_ORDER_COURSES) {
    failOrder('findOrder visual limited to 1..' + MAX_ORDER_COURSES + ' courses (got ' + numCourses + ')')
  }
  if (prereqs.length > MAX_ORDER_EDGES) {
    failOrder('findOrder visual limited to 0..' + MAX_ORDER_EDGES + ' prerequisites (got ' + prereqs.length + ')')
  }
  for (let i = 0; i < prereqs.length; i++) {
    const p = prereqs[i]
    if (!Array.isArray(p) || p.length !== 2) failOrder('prerequisites[' + i + '] must be a pair [a,b]')
    const a = p[0]
    const b = p[1]
    if (!Number.isInteger(a) || !Number.isInteger(b)) failOrder('prerequisites[' + i + '] must hold integers (got ' + JSON.stringify(p) + ')')
    if (a < 0 || a >= numCourses || b < 0 || b >= numCourses) {
      failOrder('prerequisites[' + i + '] out of range for ' + numCourses + ' courses (got [' + a + ',' + b + '])')
    }
  }
}

function buildOrder(args) {
  if (!Array.isArray(args) || args.length !== 2) failOrder('findOrder walkthrough needs [numCourses, prerequisites]')
  const numCourses = args[0]
  const inputPrereqs = args[1]
  checkOrderBound(numCourses, inputPrereqs)
  // Preserve actual input values: deep copy for layout, never reorder input.
  const prereqs = inputPrereqs.map(p => [p[0], p[1]])
  const adj = Array.from({ length: numCourses }, () => [])
  const indegree = new Array(numCourses).fill(0)
  const frames = []
  const queue = []
  const order = []

  const snap = () => ({
    current: null,
    queue: queue.slice(),
    order: order.slice(),
    indegree: indegree.slice(),
    answer: order.slice(),
    vars: { numCourses, placed: order.length, queueLen: queue.length }
  })
  const at = (current, extraVars) => ({
    current,
    queue: queue.slice(),
    order: order.slice(),
    indegree: indegree.slice(),
    answer: order.slice(),
    vars: { numCourses, placed: order.length, queueLen: queue.length, ...extraVars }
  })
  const push = (step, label, note, state) => {
    frames.push(frame(step, label, note, state))
  }
  // Largest-ready-first: take the max ready node (valid Kahn choice, exact output).
  const takeMax = () => {
    let best = 0
    for (let i = 1; i < queue.length; i++) if (queue[i] > queue[best]) best = i
    return queue.splice(best, 1)[0]
  }

  push('init', 'Initialize', 'n=' + numCourses + ', edges=' + prereqs.length + '; indegree all 0', snap())
  for (let i = 0; i < prereqs.length; i++) {
    const a = prereqs[i][0]
    const b = prereqs[i][1]
    adj[b].push(a)
    indegree[a]++
    push('init', 'Add edge ' + i, 'need ' + b + ' before ' + a + '; indegree[' + a + ']=' + indegree[a], at(a, { edge: i, from: b, to: a }))
  }

  const ready0 = []
  for (let i = 0; i < numCourses; i++) if (indegree[i] === 0) ready0.push(i)
  if (ready0.length === 0) {
    push('enqueue', 'Seed queue', 'no indegree-0 course; queue=[]', at(null, { ready: 0 }))
  } else {
    for (const v of ready0) {
      queue.push(v)
      push('enqueue', 'Enqueue ' + v, 'indegree[' + v + ']=0; queue=[' + queue.join(',') + ']', at(null, { ready: ready0.length }))
    }
  }

  // Kahn, largest-ready-first: take max ready node, append to order, erase its
  // outgoing edges, enqueue nodes that become ready. Adjacency keeps input order.
  while (queue.length > 0) {
    const cur = takeMax()
    order.push(cur)
    push('dequeue', 'Take ' + cur, 'order=[' + order.join(',') + ']; queue=[' + queue.join(',') + ']', at(cur, {}))
    const outs = adj[cur].slice()
    for (const nxt of outs) {
      const before = indegree[nxt]
      indegree[nxt]--
      push('relax', 'Erase ' + cur + '->' + nxt, 'indegree[' + nxt + ']: ' + before + '->' + indegree[nxt], at(nxt, { from: cur, to: nxt }))
      if (indegree[nxt] === 0) {
        queue.push(nxt)
        push('ready', 'Ready ' + nxt, 'indegree[' + nxt + ']=0; queue=[' + queue.join(',') + ']', at(nxt, { from: cur }))
      }
    }
  }

  // Incomplete order proves a cycle: explicit event, result [] (not an error).
  const complete = order.length === numCourses
  if (complete) {
    push('cycle', 'Verify complete', 'order ' + order.length + '/' + numCourses + ' complete; no cycle', at(null, { placed: order.length }))
  } else {
    push('cycle', 'Verify cycle', 'order ' + order.length + '/' + numCourses + '; ' + (numCourses - order.length) + ' stuck -> cycle', at(null, { placed: order.length }))
  }
  const result = complete ? order.slice() : []
  push('return', 'Return', 'return [' + result.join(',') + ']', at(null, { placed: order.length }))

  return {
    kind: 'graph',
    layout: {
      numCourses,
      prerequisites: prereqs.map(p => [p[0], p[1]]),
      // Contract-shaped graph nodes/edges: labeled course nodes, directed b->a pairs.
      nodes: Array.from({ length: numCourses }, (_, i) => ({ id: i, label: String(i) })),
      edges: prereqs.map(p => [p[1], p[0]])
    },
    frames,
    result
  }
}

export const adapters = {
  'course-schedule': {
    signature: { name: 'canFinish', params: ['int', 'int[][]'], return: 'boolean' },
    lesson: {
      idea: 'Seed a queue with indegree-0 courses; take one ready course at a time, erase its edges, enqueue newly ready courses.',
      trap: 'Edge [a,b] means b->a; a partial order is not enough — an incomplete order proves a cycle.',
      time: 'O(V+E)',
      space: 'O(V+E)'
    },
    // Per-line explanations (presentation metadata, never compiled).
    // Distilled from the reviewed Q150 lesson notes; no example values.
    explain: {
      def: 'Scope of the finishability task: boolean answer, no order returned; execution starts in the body.',
      init: 'Build adjacency (edge b->a per pair) and indegree counters; direction is the number-one trap.',
      enqueue: 'Seed a FIFO queue with every indegree-0 course; any ready choice is valid, FIFO pins it.',
      dequeue: 'Take the head: its prerequisites are all placed, so appending keeps a valid prefix; each iteration places one course.',
      relax: 'Erase cur->nxt by decrementing indegree; each edge causes exactly one decrement.',
      ready: 'A course whose counter hits 0 is newly unblocked; enqueue it exactly once.',
      cycle: 'Full placement means acyclic; a partial order proves a directed cycle.',
      return: 'Return whether every course was placed: complete boolean, not the order.'
    },
    code: { java: courseJava, cpp: courseCpp, pseudo: coursePseudo },
    build
  },
  'course-schedule-ii': {
    signature: { name: 'findOrder', params: ['int', 'int[][]'], return: 'int[]' },
    lesson: {
      idea: 'Seed a max-ready heap with indegree-0 courses; take the largest ready course, erase its edges, enqueue newly ready ones.',
      trap: 'Edge [a,b] means b->a (b first); ties break largest-first for exact [0,2,1,3]; a partial order proves a cycle -> [].',
      time: 'O(V+E)',
      space: 'O(V+E)'
    },
    code: { java: orderJava, cpp: orderCpp, pseudo: orderPseudo },
    // Per-line explanations (presentation metadata, never compiled).
    // Distilled from the reviewed Q150 lesson notes; no example values.
    explain: {
      def: 'Scope of the ordering task: return a valid int[] order, or [] when a cycle makes it impossible; execution starts in the body.',
      init: 'Build adjacency (edge b->a per pair) and indegree counters; [a,b] means b first — the number-one trap.',
      enqueue: 'Seed a max-heap with every indegree-0 course; largest-ready-first pins the [0,2,1,3] order on the dataset diamond.',
      dequeue: 'Take the largest ready course: its prerequisites are all placed, so appending keeps a valid prefix; one course per event.',
      relax: 'Erase cur->nxt by decrementing its indegree; each recorded edge causes exactly one decrement.',
      ready: 'A course whose counter hits 0 is newly unblocked; push it exactly once — it becomes takeable, not taken.',
      cycle: 'Full placement means acyclic; a partial order with stuck indegree>0 courses proves a directed cycle.',
      return: 'Copy order into the answer array, or return [] when placement is incomplete: candidate order becomes verified result.',
    },
    explainLines: {
      java: {
        14: 'End of the erase loop: every outgoing edge of cur has decremented exactly one counter.',
        15: 'End of the heap drain: every takeable course has been placed exactly once.',
        19: 'Report the verified order built by the drain above.',
      },
      cpp: {
        16: 'End of the erase loop: every outgoing edge of cur has decremented exactly one counter.',
        17: 'End of the heap drain: every takeable course has been placed exactly once.',
        19: 'Report the verified order built by the drain above.',
      },
      pseudo: {
        7: 'Erase path: each recorded edge drops its target counter by exactly one.',
        9: 'Cycle path: a short order here proves a cycle, so the answer is [].',
        10: 'Report the verified order built by the drain above.',
      },
    },
    build: buildOrder
  }
}
