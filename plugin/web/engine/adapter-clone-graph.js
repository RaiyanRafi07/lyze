// Clone Graph — portable per-slug walkthrough adapter (DFS + hash map, staged).
//
// The shard record (plugin/data/shard-5.json, id 133, Medium, pattern
// graph-dfs) carries judge:null: the Node-graph signature lives outside the
// scalar type vocabulary, so there is no official signature to match. This
// adapter uses an honest TEST PROFILE that encodes the graph as an adjacency
// list of 1-based neighbor vals:
//
//   cloneGraph(adjList:int[][]) -> int[][]
//
// where adjList[i] lists the neighbors of node i+1 (e.g. the official example
// [[2,4],[1,3],[2,4],[1,3]]), and the expected value is the same adjacency
// structure with neighbor order ignored (mode 'unordered-neighbors': node set
// + adjacency sets must match, neighbor ORDER may differ).
//
// Runs the REAL DFS+map algorithm (create-before-link cycle safety) over the
// real adjList input; every frame's ids/edges/counts come from the input.
// Scene kind stays 'graph' (host contract) with additive state fields:
// cloned[], map{}, stack[], edge, copiedEdges[]. Empty [] -> one honest empty
// scene. Over-bound/out-of-range inputs are rejected, never truncated.
import { code, frame, boundedFrames } from './semantic-core.js';

export const SLUG = 'clone-graph';

// TEST PROFILE signature (object form). Documented above; the shard record has
// judge:null so no official signature exists. The adapters entry below carries
// the same profile in the string-array params form.
export const SIGNATURE = Object.freeze({
  name: 'cloneGraph',
  params: Object.freeze([{ name: 'adjList', type: 'int[][]' }]),
  return: 'int[][]',
});

const SIGNATURE_TYPES = ['int[][]'];

const VISUAL_MAX_NODES = 100;

const cloneJava = code(`
[def] class Solution {
[def]     private Map<Integer, Node> clones = new HashMap<>();
[def]     public Node cloneGraph(Node node) {
[init]         if (node == null) {
[init]             return null;
[init]         }
[lookup]         return dfs(node);
[def]     }
[def]     private Node dfs(Node cur) {
[lookup]         if (clones.containsKey(cur.val)) {
[lookup]             return clones.get(cur.val);
[lookup]         }
[clone]         Node copy = new Node(cur.val);
[clone]         clones.put(cur.val, copy);
[read]         for (Node nb : cur.neighbors) {
[link]             copy.neighbors.add(dfs(nb));
[read]         }
[leaf]         // zero iterations above: lonely clone keeps an empty neighbor list
[return]         return copy;
[def]     }
[done]     // clone complete: map holds every clone; entry returns clone 1
[def] }
`);

const cloneCpp = code(`
[def] class Solution {
[def] public:
[def]     unordered_map<int, Node*> clones;
[def]     Node* cloneGraph(Node* node) {
[init]         if (node == nullptr) {
[init]             return nullptr;
[init]         }
[lookup]         return dfs(node);
[def]     }
[def] private:
[def]     Node* dfs(Node* cur) {
[lookup]         auto it = clones.find(cur->val);
[lookup]         if (it != clones.end()) {
[lookup]             return it->second;
[lookup]         }
[clone]         Node* copy = new Node(cur->val);
[clone]         clones[cur->val] = copy;
[read]         for (Node* nb : cur->neighbors) {
[link]             copy->neighbors.push_back(dfs(nb));
[read]         }
[leaf]         // zero iterations above: lonely clone keeps an empty neighbor list
[return]         return copy;
[def]     }
[done]     // clone complete: map holds every clone; entry returns clone 1
[def] };
`);

const clonePseudo = code(`
[def] cloneGraph(node):
[init]   if node is null: return null
[lookup]   return dfs(node)
[def] dfs(cur):
[lookup]   if cur.val in clones: return clones[cur.val]
[clone]   copy = Node(cur.val); clones[cur.val] = copy
[read]   for nb in cur.neighbors:
[link]     copy.neighbors.add(dfs(nb))
[leaf]   // zero iterations above: lonely clone keeps an empty neighbor list
[return]   return copy
[done]   clone complete: map holds every clone; entry returns clone 1
`);

const EXPLAIN = {
  def: 'Declares the solver scope and the clone map; execution starts in the body of cloneGraph.',
  init: 'Null guard: an empty graph has no start node, so return null with no map and no stack.',
  lookup: 'Map hit: this value already has a clone, so reuse it — no new node, no recursion.',
  clone: 'Map miss: create the clone now and publish it before touching neighbors, so cycles terminate.',
  read: 'Read one original edge in input order and look up the neighbor in the map.',
  link: 'Append clone-of(neighbor) to this clone, recursing first only on a map miss.',
  leaf: 'No neighbors at all: the clone keeps an empty neighbor list and returns to its caller.',
  return: 'All neighbors of this node are linked; pop this DFS frame back to its caller.',
  done: 'Closes the transcript; the map holds every clone and the entry clone is returned.',
};

export const EXPLAIN_LINES = {
  java: {
    2: 'Entry header: takes the start node; null means the empty graph.',
    6: 'Entry return: clone 1 is map[1] once the DFS unwinds.',
    7: 'End of the entry scope; the DFS below does the real work.',
    8: 'Recursion header: one live chip per call in the stack strip.',
    11: 'End of the map-hit guard: back and cross edges reuse, never duplicate.',
    16: 'End of the neighbor loop: every original edge was read exactly once.',
    17: 'Empty-neighbor note: a lonely clone skips the loop and stays link-free.',
    19: 'End of the DFS scope; the copy is complete when this returns.',
    20: 'Transcript closed: the recorded clones and links are the answer.',
    21: 'End of the class scope; it performs no algorithm operation.',
  },
  cpp: {
    3: 'Entry header: takes the start node; nullptr means the empty graph.',
    7: 'Entry return: clone 1 is map[1] once the DFS unwinds.',
    8: 'End of the entry scope; the DFS below does the real work.',
    10: 'Recursion header: one live chip per call in the stack strip.',
    14: 'End of the map-hit guard: back and cross edges reuse, never duplicate.',
    19: 'End of the neighbor loop: every original edge was read exactly once.',
    20: 'Empty-neighbor note: a lonely clone skips the loop and stays link-free.',
    22: 'End of the DFS scope; the copy is complete when this returns.',
    23: 'Transcript closed: the recorded clones and links are the answer.',
    24: 'End of the class scope; it performs no algorithm operation.',
  },
  pseudo: {
    0: 'Entry header: takes the start node; null means the empty graph.',
    2: 'Entry return: clone 1 once the DFS unwinds.',
    3: 'Recursion header: one live frame per call in the stack strip.',
    8: 'Empty-neighbor note: a lonely clone skips the loop and stays link-free.',
    10: 'Transcript closed: the recorded clones and links are the answer.',
  },
};

export function parseAdjList(input) {
  if (input === undefined || input === null) throw new Error('clone-graph: adjList is required');
  let list = input;
  if (typeof list === 'string') {
    const t = list.trim();
    if (t === '') throw new Error('clone-graph: adjList string is empty');
    list = JSON.parse(t);
  }
  if (!Array.isArray(list)) throw new Error('clone-graph: adjList must be an array of neighbor arrays');
  if (list.length > VISUAL_MAX_NODES) throw new Error('clone-graph: visual limited to 0..100 nodes (got ' + list.length + ')');
  list.forEach((row, i) => {
    if (!Array.isArray(row)) throw new Error('clone-graph: adjList[' + i + '] must be an array');
    row.forEach((v) => {
      if (!Number.isInteger(v) || v < 1 || v > list.length) {
        throw new Error('clone-graph: adjList[' + i + '] holds out-of-range neighbor ' + JSON.stringify(v));
      }
    });
  });
  return list.map((row) => row.slice());
}

function runDfs(adj) {
  const n = adj.length;
  const nodes = adj.map((_, i) => ({ id: i + 1, label: String(i + 1) }));
  const seenEdge = new Set();
  const edges = [];
  adj.forEach((row, i) => {
    row.forEach((v) => {
      const a = i + 1; const b = v;
      const k = a < b ? a + '|' + b : b + '|' + a;
      if (a !== b && !seenEdge.has(k)) { seenEdge.add(k); edges.push([a, b]); }
    });
  });

  const frames = [];
  const cloned = [];
  const clonedSet = new Set();
  const map = {};
  const copiedEdges = [];
  const copiedSet = new Set();
  const visited = [];
  const visitedSet = new Set();
  const stack = [];
  const push = (step, label, note, current, edge) => {
    frames.push(frame(step, label, note, {
      current,
      visited: visited.slice(),
      frontier: [],
      path: stack.slice(),
      stack: stack.slice(),
      cloned: cloned.slice(),
      map: { ...map },
      edge: edge ? edge.slice() : null,
      copiedEdges: copiedEdges.map((e) => e.slice()),
    }));
  };

  if (n === 0) {
    push('init', 'Empty graph', 'adjList = []; there are no nodes, so return null (no map, no stack).', null, null);
    return { frames, layout: { nodes: [], edges: [] }, result: [] };
  }

  push('init', 'Start at node 1', 'adjList has ' + n + ' node(s); map is empty; call dfs(1).', 1, null);

  const dfs = (u) => {
    stack.push(u);
    if (!visitedSet.has(u)) { visitedSet.add(u); visited.push(u); }
    if (!clonedSet.has(u)) {
      clonedSet.add(u); cloned.push(u); map[u] = u;
      push('clone', 'Create clone ' + u, 'map has no ' + u + ': new Node(' + u + '); map[' + u + '] = clone ' + u + '.', u, null);
    } else {
      push('lookup', 'Map hit ' + u, 'map already holds ' + u + ' -> clone ' + u + '; reuse it, no new node.', u, null);
    }
    const neighbors = adj[u - 1];
    if (neighbors.length === 0) {
      push('leaf', 'Node ' + u + ' has no neighbors', 'clone ' + u + ' keeps an empty neighbor list; return to caller.', u, null);
    }
    for (const v of neighbors) {
      push('read', 'Read edge ' + u + '-' + v, 'original edge ' + u + ' -> ' + v + '; look up map[' + v + '].', u, [u, v]);
      if (!clonedSet.has(v)) {
        dfs(v);
      } else {
        push('lookup', 'Map hit ' + v, 'map[' + v + '] = clone ' + v + ' already exists; link without recursing.', u, [u, v]);
      }
      const k = u < v ? u + '|' + v : v + '|' + u;
      if (u !== v && !copiedSet.has(k)) { copiedSet.add(k); copiedEdges.push([Math.min(u, v), Math.max(u, v)]); }
      push('link', 'Link clone edge ' + u + '-' + v, 'clone ' + u + '.neighbors appends clone ' + v + ' (' + copiedEdges.length + '/' + edges.length + ' unique links).', u, [u, v]);
    }
    stack.pop();
    push('return', 'Return from dfs(' + u + ')', 'neighbors of ' + u + ' all linked; pop dfs(' + u + ').', stack.length ? stack[stack.length - 1] : u, null);
  };

  dfs(1);
  push('done', 'Clone complete', n + ' clone(s), ' + copiedEdges.length + ' link(s); return map[1] (clone 1).', 1, null);

  return {
    frames,
    layout: { nodes, edges },
    result: adj.map((row) => row.slice()),
  };
}

/**
 * Run the reference DFS+map clone on the real adjList input. Pure +
 * synchronous. Returns the walkthrough {kind,layout,frames,result,anchors}.
 * Every frame's ids/edges/counts come from the input; nothing is invented.
 */
export function build(args) {
  const adj = parseAdjList(args?.[0]);
  const { frames, layout, result } = runDfs(adj);
  // Anchor the pedagogical frames (creations + conclusion) so they survive
  // the single compaction pass when the budget is tight.
  const anchors = frames
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => f.step === 'clone' || f.step === 'done')
    .map(({ i }) => i);
  return { kind: 'graph', layout, frames, result, anchors };
}

// Official 4-node example (integration.json): the default walkthrough input
// when buildScene is given no explicit args. Real data, never invented.
const OFFICIAL = [[2, 4], [1, 3], [2, 4], [1, 3]];

// Live-forge-compatible entry: buildScene(problem, options) -> CONTRACTS scene
// (v 1, kind graph, 6..40 frames) or null. Pure, synchronous, never throws.
// Accepts an explicit { adjList } or options.args=[adjList]; with no input it
// runs the official example above.
export function buildScene(problem, options = {}) {
  try {
    let adjValue =
      (options && options.adjList !== undefined) ? options.adjList
        : (problem && problem.adjList !== undefined) ? problem.adjList
          : undefined;
    if (adjValue === undefined && options && Array.isArray(options.args) && options.args.length >= 1) {
      adjValue = options.args[0];
    }
    if (adjValue === undefined) adjValue = OFFICIAL;
    const built = build([adjValue]);
    // Single compaction pass (mirrors semantic.js): full honest events in,
    // at most 40 frames out; anchors (creations + conclusion) survive budgeted.
    let { frames } = boundedFrames(built.frames, 40, built.anchors || []);
    if (frames.length < 6) {
      // Same short-run rule as semantic.js: honest context cards repeating real
      // snapshots, explicitly not extra operations.
      const first = frames[0];
      const last = frames[frames.length - 1];
      const context = [
        { ...first, label: 'Context: input', note: ('adjList = ' + JSON.stringify(parseAdjList(adjValue))).slice(0, 140) },
        { ...first, label: 'Context: task', note: 'Clone every node and link clone-to-clone, never original-to-clone.' },
        { ...first, label: 'Context: invariant', note: 'Map hit means reuse: create each clone once, then only link.' },
        { ...last, label: 'Context: returned value', note: 'Clone of node 1 with all links; map holds every clone.' },
      ];
      const needed = 6 - frames.length;
      frames = [...context.slice(0, Math.min(needed, 3)), ...frames, ...context.slice(3, needed > 3 ? 4 : 3)];
    }
    return {
      v: 1,
      kind: 'graph',
      problemSlug: 'clone-graph',
      title: 'Clone Graph — DFS copy with a hash map',
      subtitle: 'Create before linking; map hits reuse instead of recursing',
      pattern: (problem && problem.pattern) || 'graph-dfs',
      camera: { yaw: 0.46, pitch: 0.64, dist: 12 },
      layout: built.layout,
      frames: frames.map((f) => ({ ...f, note: String(f.note).slice(0, 140) })),
    };
  } catch {
    return null;
  }
}

export const adapters = {
  'clone-graph': {
    // TEST PROFILE (shard judge is null): cloneGraph(adjList:int[][]) ->
    // int[][] with unordered-neighbors comparison (adjacency sets must match).
    signature: { name: 'cloneGraph', params: SIGNATURE_TYPES, return: 'int[][]' },
    lesson: {
      idea: 'DFS from node 1 with a hash map from original value to clone node. The map is both the visited set and the wiring table: create the clone before recursing so cycles terminate, then fill each clone neighbor list with looked-up clones.',
      trap: 'Filling clone neighbors with ORIGINAL neighbors makes a shallow copy; checking visited without reusing the stored clone duplicates nodes on cycles; putting the node in the map AFTER the neighbor loop recurses forever on cycles.',
      time: 'O(V + E): each node is created once and each adjacency entry is read once.',
      space: 'O(V) for the map plus the recursion stack (O(V) deep on a line graph).',
      alt: 'Iterative BFS with a queue: seed clones[1], pop originals, and for each neighbor create-or-reuse its clone then link. Same O(V+E) with no recursion-depth risk; only the visit order changes.',
    },
    code: { java: cloneJava, cpp: cloneCpp, pseudo: clonePseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
};
