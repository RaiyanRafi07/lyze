/**
 * graph-valid-tree — standalone walkthrough adapter (batch13).
 *
 * Iterative DFS with parent tracking + the n-1 edge-count gate: seed
 * seen[0], push (node, parent) pairs, skip only the arrival edge, report a
 * non-parent revisit as a cycle, and require every vertex seen at the end.
 *
 * Staged source: .workers/jobs/question-owners-150/graph-valid-tree/
 * (adapter-graph-valid-tree.mjs primary/union-find oracle, lesson.md notes) —
 * reshaped into the live adapter contract
 * (signature/lesson/explain/explainLines/code/build). Full frame lists +
 * anchors are returned; the host applies the single boundedFrames sampling
 * pass. Frame notes are all <= 140 chars.
 *
 * TEST PROFILE signature: there is NO shard record in plugin/data for this
 * slug (verified) and the live curriculum carries judge:false, so there is no
 * live judge signature to equal. The signature below is an honest test
 * profile mirroring the observed NeetCode method shape
 * validTree(n: int, edges: int[][]) -> boolean
 * (judgeable:false, judgeCase:null). Walkthrough + forge both use it.
 * Precedents for test-profile transport: mergeKLists(int[][])->int[],
 * runTrieOps(string[],string[])->string.
 */

import { code, frame, boundedFrames } from './semantic-core.js'

void boundedFrames

// Visual bound: keep the node/edge diagram readable. Over-bound inputs are
// rejected with a clear error (never truncated silently).
// Source allows n <= 2000 / edges <= 5000; the walkthrough shows at most 10/12.
const MAX_NODES = 10
const MAX_EDGES = 12

const validTreeJava = code(`
[def] import java.util.*;
[def] class Solution {
[def]     public boolean validTree(int n, int[][] edges) {
[init]         if (n <= 1) return edges.length == 0;
[count]         if (edges.length != n - 1) return false;
[build]         List<List<Integer>> adj = new ArrayList<>();
[build]         for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
[build]         for (int[] e : edges) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }
[init]         boolean[] seen = new boolean[n];
[init]         seen[0] = true;
[visit]         Deque<int[]> stack = new ArrayDeque<>();
[visit]         stack.push(new int[]{0, -1});
[visit]         while (!stack.isEmpty()) {
[backtrack]             int[] cur = stack.pop();
[visit]             int u = cur[0], parent = cur[1];
[visit]             for (int v : adj.get(u)) {
[visit]                 if (v == parent) continue;
[cycle]                 if (seen[v]) return false;
[visit]                 seen[v] = true;
[visit]                 stack.push(new int[]{v, u});
[visit]             }
[done]         for (boolean b : seen) if (!b) return false;
[done]         return true;
[def]     }
[def] }
`)

const validTreeCpp = code(`
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     bool validTree(int n, vector<vector<int>>& edges) {
[init]         if (n <= 1) return edges.empty();
[count]         if ((int)edges.size() != n - 1) return false;
[build]         vector<vector<int>> adj(n);
[build]         for (auto& e : edges) { adj[e[0]].push_back(e[1]); adj[e[1]].push_back(e[0]); }
[init]         vector<char> seen(n, 0);
[init]         seen[0] = 1;
[visit]         vector<pair<int,int>> st;
[visit]         st.emplace_back(0, -1);
[visit]         while (!st.empty()) {
[backtrack]             auto [u, parent] = st.back(); st.pop_back();
[visit]             for (int v : adj[u]) {
[visit]                 if (v == parent) continue;
[cycle]                 if (seen[v]) return false;
[visit]                 seen[v] = 1;
[visit]                 st.emplace_back(v, u);
[visit]             }
[done]         for (char b : seen) if (!b) return false;
[done]         return true;
[def]     }
[def] };
`)

const validTreePseudo = code(`
[def] validTree(n, edges):
[init]   if n <= 1: return edges is empty
[count]   if len(edges) != n - 1: return false
[build]   adj = [[] for _ in range(n)]; add each edge both ways
[init]   seen = [False] * n; seen[0] = True; stack = [(0, -1)]
[visit]   while stack:
[backtrack]     u, parent = stack.pop()
[visit]     for v in adj[u]:
[visit]       if v == parent: continue
[cycle]       if seen[v]: return false
[visit]       seen[v] = True; stack.push((v, u))
[done]   return all(seen)
`)

function fail(message) {
  throw new Error(message)
}

function decodeN(value) {
  let v = value
  if (typeof v === 'string' && v.trim() !== '' && /^-?\d+$/.test(v.trim())) v = parseInt(v.trim(), 10)
  if (!Number.isInteger(v)) fail('Valid-tree walkthrough needs integer n (got ' + JSON.stringify(value) + ')')
  if (v < 1 || v > MAX_NODES) fail('Valid-tree visual limited to 1..' + MAX_NODES + ' vertices (got n=' + v + ')')
  return v
}

function decodeEdges(value, n) {
  let list = value
  if (typeof list === 'string') {
    try { list = JSON.parse(list) } catch { fail('edges must be an int[][] array (got ' + typeof value + ')') }
  }
  if (!Array.isArray(list)) fail('edges must be an int[][] array (got ' + typeof value + ')')
  if (list.length > MAX_EDGES) fail('Valid-tree visual limited to 0..' + MAX_EDGES + ' edges (got ' + list.length + ')')
  const seen = new Set()
  return list.map((pair, i) => {
    if (!Array.isArray(pair) || pair.length !== 2) fail('edges[' + i + '] must be a pair [a,b] (got ' + JSON.stringify(pair) + ')')
    const a = pair[0]
    const b = pair[1]
    if (!Number.isInteger(a) || !Number.isInteger(b)) fail('edges[' + i + '] must hold integers (got ' + JSON.stringify(pair) + ')')
    if (a < 0 || a >= n || b < 0 || b >= n) fail('edges[' + i + ']=[' + a + ',' + b + '] out of range 0..' + (n - 1) + ' (n=' + n + ')')
    if (a === b) fail('edges[' + i + '] joins [' + a + ',' + b + ']: self-loops are excluded by the source')
    const key = Math.min(a, b) + ':' + Math.max(a, b)
    if (seen.has(key)) fail('edges[' + i + '] repeats undirected edge [' + a + ',' + b + ']')
    seen.add(key)
    return [a, b]
  })
}

// Real execution trace: iterative DFS from 0 with a per-node neighbor cursor,
// exactly like the staged forge trace. Events are visit / backtrack / cycle.
function traceValidTree(n, edges) {
  const adj = Array.from({ length: n }, () => [])
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a) }
  const events = []
  const seen = new Array(n).fill(false)
  let cycleEdge = null
  if (n > 0) {
    seen[0] = true
    const stack = [[0, -1, 0]]
    events.push({ type: 'visit', u: 0, v: null, seenCount: 1 })
    while (stack.length && !cycleEdge) {
      const top = stack[stack.length - 1]
      const [u, p, idx] = top
      if (idx >= adj[u].length) {
        stack.pop()
        events.push({ type: 'backtrack', u, v: null, seenCount: seen.filter(Boolean).length })
        continue
      }
      top[2]++
      const v = adj[u][idx]
      if (v === p) continue
      if (seen[v]) {
        cycleEdge = [u, v]
        events.push({ type: 'cycle', u, v, seenCount: seen.filter(Boolean).length })
        break
      }
      seen[v] = true
      stack.push([v, u, 0])
      events.push({ type: 'visit', u: v, v: u, seenCount: seen.filter(Boolean).length })
    }
  }
  return { seen, cycleEdge, events }
}

function buildValidTree(args) {
  if (!Array.isArray(args) || args.length !== 2) fail('Valid-tree walkthrough needs [n, edges]')
  const n = decodeN(args[0])
  const edges = decodeEdges(args[1], n)
  const frames = []
  const anchors = []

  // current is ALWAYS a node id (or null): the edge under study travels in
  // edge/vars so the graph renderer highlights the right node.
  const snap = (current, edgePair, extra = {}) => ({
    current,
    edge: edgePair ? edgePair.slice() : null,
    visited: extra.visited !== undefined ? extra.visited.slice() : [],
    seenCount: extra.seenCount !== undefined ? extra.seenCount : 0,
    cycle: extra.cycle !== undefined ? extra.cycle.slice() : [],
    vars: { n, edgeCount: edges.length, need: n - 1, ...(extra.vars || {}) },
  })
  const push = (step, label, note, state) => {
    frames.push(frame(step, label, note, state))
  }

  push('init', 'Initialize', 'n=' + n + ', edges=' + edges.length + '; seen[0]=true; DFS roots at 0', snap(null, null, { visited: [], seenCount: 0, vars: {} }))
  anchors.push(0)

  // The single-node edge case returns before any scan, like the reference.
  if (n <= 1) {
    const ok = edges.length === 0
    push('done', ok ? 'Valid tree' : 'Not a tree', 'n<=1: ' + (ok ? 'no edges, single node is a tree' : 'edges present on <=1 node, not a tree'), snap(null, null, { visited: [], seenCount: 0, vars: { result: ok } }))
    anchors.push(frames.length - 1)
    return {
      kind: 'graph',
      layout: {
        nodes: [{ id: 0, label: '0' }],
        edges: edges.map((p) => p.slice()),
      },
      frames,
      result: ok,
      anchors,
    }
  }

  // The count gate is part of the reference: a tree needs exactly n-1 edges.
  if (edges.length !== n - 1) {
    push('count', 'Edge-count check fails', 'edges ' + edges.length + ' != n-1 ' + (n - 1) + '; not a tree', snap(null, null, { visited: [], seenCount: 0, vars: { result: false } }))
    push('done', 'Not a tree', 'count gate rejects before any DFS; return false', snap(null, null, { visited: [], seenCount: 0, vars: { result: false } }))
    anchors.push(frames.length - 1)
    return {
      kind: 'graph',
      layout: {
        nodes: Array.from({ length: n }, (_, k) => ({ id: k, label: String(k) })),
        edges: edges.map((p) => p.slice()),
      },
      frames,
      result: false,
      anchors,
    }
  }

  push('count', 'Edge-count check passes', 'edges ' + edges.length + ' == n-1 ' + (n - 1) + '; count ok, not sufficient', snap(null, null, { visited: [], seenCount: 0, vars: {} }))
  push('build', 'Build adjacency', 'adj lists for ' + n + ' nodes, both directions; DFS starts at 0', snap(0, null, { visited: [], seenCount: 0, vars: {} }))

  const trace = traceValidTree(n, edges)
  const visitedOrder = []
  for (const ev of trace.events) {
    if (ev.type === 'visit') {
      if (!visitedOrder.includes(ev.u)) visitedOrder.push(ev.u)
      if (ev.v == null) {
        push('visit', 'Visit ' + ev.u + ' (start)', 'DFS reaches ' + ev.u + '; seen ' + ev.seenCount + '/' + n, snap(ev.u, null, { visited: visitedOrder, seenCount: ev.seenCount, vars: { at: ev.u, seen: ev.seenCount } }))
      } else {
        push('visit', 'Visit ' + ev.u + ' via ' + ev.v, 'edge ' + ev.v + '-' + ev.u + ' discovers ' + ev.u + '; seen ' + ev.seenCount + '/' + n, snap(ev.u, [ev.v, ev.u], { visited: visitedOrder, seenCount: ev.seenCount, vars: { at: ev.u, from: ev.v, seen: ev.seenCount } }))
      }
      if (visitedOrder.length === 2) anchors.push(frames.length - 1)
    } else if (ev.type === 'backtrack') {
      push('backtrack', 'Backtrack ' + ev.u, 'neighbors of ' + ev.u + ' done; unwind one level', snap(ev.u, null, { visited: visitedOrder, seenCount: ev.seenCount, vars: { at: ev.u, seen: ev.seenCount } }))
    } else if (ev.type === 'cycle') {
      push('cycle', 'Cycle ' + ev.u + '-' + ev.v, 'edge ' + ev.u + '-' + ev.v + ' hits seen node; cycle, not a tree', snap(ev.u, [ev.u, ev.v], { visited: visitedOrder, seenCount: ev.seenCount, cycle: [ev.u, ev.v], vars: { edge: [ev.u, ev.v] } }))
      anchors.push(frames.length - 1)
    }
  }

  const ok = trace.cycleEdge === null && trace.seen.every(Boolean)
  const unvisited = trace.seen.filter((b) => !b).length
  if (ok) {
    push('done', 'Valid tree', 'all ' + n + ' seen, no cycle: valid tree', snap(null, null, { visited: visitedOrder, seenCount: n, vars: { result: true } }))
  } else if (trace.cycleEdge) {
    push('done', 'Not a tree', 'cycle edge found: return false', snap(null, trace.cycleEdge.slice(), { visited: visitedOrder, seenCount: trace.seen.filter(Boolean).length, cycle: trace.cycleEdge.slice(), vars: { result: false } }))
  } else {
    push('done', 'Not a tree', unvisited + ' node(s) unreached: forest, return false', snap(null, null, { visited: visitedOrder, seenCount: trace.seen.filter(Boolean).length, vars: { result: false } }))
  }
  anchors.push(frames.length - 1)

  return {
    kind: 'graph',
    layout: {
      // Contract-shaped graph nodes/edges: vertices 0..n-1, actual input pairs.
      nodes: Array.from({ length: n }, (_, k) => ({ id: k, label: String(k) })),
      edges: edges.map((p) => p.slice()),
    },
    frames,
    result: ok,
    anchors: [...new Set(anchors.filter((i) => Number.isInteger(i) && i >= 0 && i < frames.length))].sort((a, b) => a - b),
  }
}

export const adapters = {
  'graph-valid-tree': {
    // TEST PROFILE (no shard record; curriculum judge:false):
    // validTree(n:int, edges:int[][]) -> boolean (per-op exact compare).
    signature: { name: 'validTree', params: ['int', 'int[][]'], return: 'boolean' },
    lesson: {
      idea: 'A tree is a connected acyclic graph: the n-1 edge count gates first, then DFS from 0 with parent-skipping finds any cycle, and a final all-seen check proves the graph is connected.',
      trap: 'edges.length == n-1 alone never suffices (a cycle plus an isolate also totals n-1); and without the parent skip, every undirected edge looks like a cycle.',
      time: 'O(n + e)',
      space: 'O(n + e)',
    },
    // Per-step explanations (presentation metadata, never compiled).
    // Staged source: .workers/jobs/question-owners-150/graph-valid-tree/lesson.md
    // (every-line notes + invariant) — condensed to one note per walkthrough step.
    explain: {
      def: 'Scope wrapper around the method; no graph logic runs on these lines.',
      init: 'Single-node edge case plus the DFS seed: seen[0]=true roots the search at vertex 0.',
      count: 'Necessary count gate: a tree on n nodes needs exactly n-1 edges — never sufficient alone.',
      build: 'Adjacency lists, both directions per edge; bounded inputs keep every index valid.',
      visit: 'First arrival at a node: mark seen on push so each vertex is discovered exactly once.',
      backtrack: 'Neighbors exhausted: pop unwinds one DFS level toward the next frontier node.',
      cycle: 'Non-parent edge into a seen node is a back edge: the graph has a cycle, not a tree.',
      done: 'Connectivity verdict: any unvisited node means a forest; else connected and acyclic, a tree.',
    },
    explainLines: {
      java: {
        2: 'Test-profile entry: n vertices 0..n-1 plus the edge list; returns whether it is a tree.',
        3: 'Single node with no edges is a tree; anything else on <=1 node is malformed.',
        4: 'Sound early reject only because the source excludes loops and duplicate edges.',
        7: 'Each undirected edge is stored twice so DFS can leave every node both ways.',
        11: 'Root the DFS at 0; parent -1 means there is no arrival edge to skip at the start.',
        16: 'Arrival edge only: skipping it is what keeps the search from crying cycle on every edge.',
        17: 'Non-parent revisit is a genuine back edge, so the graph has a cycle.',
        18: 'Seen on push, not on pop, so the cycle test fires exactly once per back edge.',
        21: 'Unvisited survivors mean a disconnected forest, even when the count passed.',
        22: 'Connected and acyclic: both tree halves hold, return true.',
      },
      cpp: {
        4: 'Test-profile entry: n vertices 0..n-1 plus the edge list; returns whether it is a tree.',
        6: 'Sound early reject only because the source excludes loops and duplicate edges.',
        8: 'Each undirected edge is stored twice so DFS can leave every node both ways.',
        12: 'Root the DFS at 0; parent -1 means there is no arrival edge to skip at the start.',
        14: 'Pop unwinds one DFS level after the neighbors are exhausted.',
        16: 'Arrival edge only: skipping it is what keeps the search from crying cycle on every edge.',
        17: 'Non-parent revisit is a genuine back edge, so the graph has a cycle.',
        18: 'Seen on push, not on pop, so the cycle test fires exactly once per back edge.',
        21: 'Unvisited survivors mean a disconnected forest, even when the count passed.',
        22: 'Connected and acyclic: both tree halves hold, return true.',
      },
      pseudo: {
        0: 'Entry: n plus the undirected edge list; returns whether it is a tree.',
        1: 'Single node with no edges is a tree; anything else on <=1 node is malformed.',
        2: 'Necessary gate: exactly n-1 edges, never sufficient alone.',
        3: 'Adjacency both ways so the search can leave every node.',
        4: 'Root the search at 0 with no arrival edge to skip.',
        6: 'Pop unwinds one level after the neighbors are exhausted.',
        8: 'Skip only the edge the search arrived on.',
        9: 'A seen non-parent neighbor is a cycle: reject at once.',
        10: 'Mark on push so each vertex is discovered exactly once.',
        11: 'No cycle plus every node seen means a tree; else a forest.',
      },
    },
    code: { java: validTreeJava, cpp: validTreeCpp, pseudo: validTreePseudo },
    build: buildValidTree,
  },
}

export const visualBounds = { minN: 1, maxN: MAX_NODES, minEdges: 0, maxEdges: MAX_EDGES }
