/**
 * number-of-connected-components-in-an-undirected-graph — standalone walkthrough adapter (batch13).
 *
 * Union-find with path halving + union by size: every vertex starts alone
 * (count = n), each edge is scanned once, endpoint roots are found with
 * path halving, disjoint roots merge (count--), same-root edges skip.
 *
 * Staged source: .workers/jobs/question-owners-150/number-of-connected-components-in-an-undirected-graph/adapter.js
 * (build/frames/notes, marked Java/C++/pseudo, lesson) — reshaped into the
 * live adapter contract (signature/lesson/explain/explainLines/code/build).
 * Full frame lists + anchors are returned; the host applies the single
 * boundedFrames sampling pass.
 *
 * TEST PROFILE signature: LeetCode 323 is premium and has NO shard record in
 * plugin/data (verified: no match for this slug), so there is no live judge
 * to equal. The signature below is an honest test profile mirroring the
 * NeetCode method shape countComponents(n: int, edges: int[][]) -> int
 * (judgeable:false, judgeCase:null). Walkthrough + forge both use it.
 */

import { code, frame, boundedFrames } from './semantic-core.js'

void boundedFrames

// Visual bound: keep the node/edge diagram readable. Over-bound inputs are
// rejected with a clear error (never truncated silently).
// Source allows n <= 2000 / edges <= 5000; the walkthrough shows at most 10/12.
const MAX_NODES = 10
const MAX_EDGES = 12

const componentsJava = code(`
[def] class Solution {
[def]     int[] parent;
[def]     int[] size;
[def]     public int countComponents(int n, int[][] edges) {
[init]         parent = new int[n];
[init]         size = new int[n];
[init]         for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }
[init]         int count = n;
[find]         for (int[] e : edges) {
[find]             int ra = find(e[0]);
[find]             int rb = find(e[1]);
[skip]             if (ra == rb) continue;
[union]             if (size[ra] < size[rb]) { int t = ra; ra = rb; rb = t; }
[union]             parent[rb] = ra;
[union]             size[ra] += size[rb];
[union]             count--;
[find]         }
[return]         return count;
[def]     }
[def]     int find(int x) {
[find]         while (parent[x] != x) {
[find]             parent[x] = parent[parent[x]];
[find]             x = parent[x];
[find]         }
[find]         return x;
[def]     }
[def] }
`)

const componentsCpp = code(`
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     int countComponents(int n, vector<vector<int>>& edges) {
[init]         vector<int> parent(n), sz(n, 1);
[init]         for (int i = 0; i < n; i++) parent[i] = i;
[init]         int count = n;
[find]         for (auto& e : edges) {
[find]             int ra = findRoot(parent, e[0]);
[find]             int rb = findRoot(parent, e[1]);
[skip]             if (ra == rb) continue;
[union]             if (sz[ra] < sz[rb]) swap(ra, rb);
[union]             parent[rb] = ra;
[union]             sz[ra] += sz[rb];
[union]             count--;
[find]         }
[return]         return count;
[def]     }
[def]     int findRoot(vector<int>& parent, int x) {
[find]         while (parent[x] != x) {
[find]             parent[x] = parent[parent[x]];
[find]             x = parent[x];
[find]         }
[find]         return x;
[def]     }
[def] };
`)

const componentsPseudo = code(`
[def] countComponents(n, edges):
[init]   parent[i] = i; size[i] = 1 for all i; count = n
[find]   for [a, b] in edges:
[find]     ra = find(a); rb = find(b)
[skip]     if ra == rb: continue
[union]     if size[ra] < size[rb]: swap(ra, rb)
[union]     parent[rb] = ra; size[ra] += size[rb]; count -= 1
[return]   return count
[def] find(x):
[find]   while parent[x] != x: parent[x] = parent[parent[x]]; x = parent[x]
[find]   return x
`)

function fail(message) {
  throw new Error(message)
}

function decodeN(value) {
  let v = value
  if (typeof v === 'string' && v.trim() !== '' && /^-?\d+$/.test(v.trim())) v = parseInt(v.trim(), 10)
  if (!Number.isInteger(v)) fail('Components walkthrough needs integer n (got ' + JSON.stringify(value) + ')')
  if (v < 1 || v > MAX_NODES) fail('Components visual limited to 1..' + MAX_NODES + ' vertices (got n=' + v + ')')
  return v
}

function decodeEdges(value, n) {
  let list = value
  if (typeof list === 'string') {
    try { list = JSON.parse(list) } catch { fail('edges must be an int[][] array (got ' + typeof value + ')') }
  }
  if (!Array.isArray(list)) fail('edges must be an int[][] array (got ' + typeof value + ')')
  if (list.length > MAX_EDGES) fail('Components visual limited to 0..' + MAX_EDGES + ' edges (got ' + list.length + ')')
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

function buildComponents(args) {
  if (!Array.isArray(args) || args.length !== 2) fail('Components walkthrough needs [n, edges]')
  const n = decodeN(args[0])
  const edges = decodeEdges(args[1], n)
  const parent = Array.from({ length: n }, (_, i) => i)
  const size = new Array(n).fill(1)
  let count = n
  const frames = []
  const anchors = []

  // current is ALWAYS a node id (or null): the edge under study travels in
  // edge/vars so the graph renderer highlights the right node.
  const snap = (current, edgeIndex, extra = {}) => ({
    current,
    edge: edgeIndex === null || edgeIndex === undefined ? null : edges[edgeIndex].slice(),
    ra: extra.ra !== undefined ? extra.ra : null,
    rb: extra.rb !== undefined ? extra.rb : null,
    parent: parent.slice(),
    size: size.slice(),
    count,
    merged: extra.merged !== undefined ? extra.merged : null,
    vars: { n, count, ...(edgeIndex === null || edgeIndex === undefined ? {} : { edge: edgeIndex }), ...extra.vars },
  })
  const push = (step, label, note, state) => {
    frames.push(frame(step, label, note, state))
  }

  push('init', 'Initialize', 'n=' + n + ', edges=' + edges.length + '; parent[i]=i; count=' + n, snap(null, null, { vars: {} }))
  anchors.push(0)

  // Honest path-halving find: each parent[x]=parent[parent[x]] hop is a real
  // assignment and gets its own frame; union attaches ROOTS, never raw nodes.
  const findRoot = (start, edgeIndex) => {
    let x = start
    if (parent[x] === x) {
      push('find', 'Find ' + start, 'root(' + start + ')=' + x + '; edge ' + edgeIndex + ' [' + edges[edgeIndex] + ']', snap(x, edgeIndex, { vars: { find: start, root: x } }))
      return x
    }
    while (parent[x] !== x) {
      const before = parent[x]
      const grand = parent[before]
      parent[x] = grand
      const moved = parent[x]
      push('find', 'Halve ' + x, 'parent[' + x + ']: ' + before + '->' + moved + '; x->' + moved, snap(x, edgeIndex, { vars: { find: start, at: x } }))
      x = moved
    }
    push('find', 'Root of ' + start, 'root(' + start + ')=' + x + '; edge ' + edgeIndex, snap(x, edgeIndex, { vars: { find: start, root: x } }))
    return x
  }

  let firstUnion = true
  for (let i = 0; i < edges.length; i++) {
    const a = edges[i][0]
    const b = edges[i][1]
    const ra = findRoot(a, i)
    const rb = findRoot(b, i)
    if (ra === rb) {
      push('skip', 'Share root ' + ra, 'edge ' + i + ' [' + a + ',' + b + '] inside one set; count=' + count, snap(ra, i, { ra, rb, merged: false, vars: { edge: i, root: ra } }))
      continue
    }
    let r1 = ra
    let r2 = rb
    const swapped = size[r1] < size[r2]
    if (swapped) { const t = r1; r1 = r2; r2 = t }
    parent[r2] = r1
    size[r1] += size[r2]
    count--
    push('union', 'Union [' + a + ',' + b + ']', 'roots ' + ra + ',' + rb + (swapped ? ' swap' : '') + '; parent[' + r2 + ']=' + r1 + '; count=' + count, snap(r2, i, { ra: r1, rb: r2, merged: true, vars: { edge: i, from: r2, to: r1 } }))
    if (firstUnion) { anchors.push(frames.length - 1); firstUnion = false }
  }

  push('return', 'Return', 'all ' + edges.length + ' edges scanned; components=' + count, snap(null, edges.length ? edges.length - 1 : null, { vars: { components: count } }))
  anchors.push(frames.length - 1)

  return {
    kind: 'graph',
    layout: {
      // Contract-shaped graph nodes/edges: vertices 0..n-1, actual input pairs.
      nodes: Array.from({ length: n }, (_, k) => ({ id: k, label: String(k) })),
      edges: edges.map((p) => p.slice()),
    },
    frames,
    result: count,
    anchors,
  }
}

export const adapters = {
  'number-of-connected-components-in-an-undirected-graph': {
    signature: { name: 'countComponents', params: ['int', 'int[][]'], return: 'int' },
    lesson: {
      idea: 'Each vertex starts alone (count=n); scan edges once, find both endpoint roots with path halving, and merge disjoint roots — every merge drops the count by one.',
      trap: 'Union ROOTS not endpoints, and skip same-root edges: parent[] is a DSU forest, not the input graph — counting edges instead of merges over-counts cycles.',
      time: 'O((n + e)·α(n))',
      space: 'O(n)',
    },
    // Per-step explanations (presentation metadata, never compiled).
    // Staged source: .workers/jobs/question-owners-150/number-of-connected-components-in-an-undirected-graph/reference.md
    // (every-line notes + invariant) — condensed to one note per walkthrough step.
    explain: {
      def: 'Scope wrapper around the DSU fields and helpers; no component counting happens on these lines.',
      init: 'Seed one singleton set per vertex: parent[i]=i, size[i]=1, and the live answer count=n.',
      find: 'Chase parent links with path halving toward the set root; each hop rewrites one parent entry.',
      skip: 'Both endpoints already share a root: this edge is internal to one set, so the count is untouched.',
      union: 'Attach the smaller root under the larger root, refresh the size, and drop the count by exactly one.',
      return: 'Every input edge scanned once: the surviving count is the number of connected components.',
    },
    explainLines: {
      java: {
        3: 'Judged entry: n vertices 0..n-1 plus the edge list; returns the component count.',
        6: 'Each vertex starts alone: root of itself, set size 1.',
        7: 'n singletons means n components before any edge is read.',
        9: 'Root of the first endpoint — the set representative, not the endpoint itself.',
        10: 'Root of the second endpoint; both finds compress paths as a side effect.',
        11: 'Same set: this edge is internal (a cycle edge); merging would corrupt the count.',
        13: 'The single structural write: attach the smaller ROOT under the larger ROOT.',
        17: 'End of the scan; every merge dropped the count once, so count is the answer.',
      },
      cpp: {
        4: 'Judged entry: n vertices 0..n-1 plus the edge list; returns the component count.',
        7: 'n singletons means n components before any edge is read.',
        10: 'Root of the second endpoint; both finds compress paths as a side effect.',
        11: 'Same set: this edge is internal (a cycle edge); merging would corrupt the count.',
        14: 'The single structural write: attach the smaller ROOT under the larger ROOT.',
        18: 'End of the scan; every merge dropped the count once, so count is the answer.',
      },
      pseudo: {
        0: 'Entry: n plus the undirected edge list; returns the component count.',
        1: 'One singleton set per vertex; the live answer starts at n.',
        3: 'Both endpoint roots, with path compression as a side effect.',
        4: 'Internal edge: skip without touching the count.',
        6: 'One real merge: rehang the root, refresh the size, count drops by one.',
        7: 'All edges scanned once; the count is the answer.',
      },
    },
    code: { java: componentsJava, cpp: componentsCpp, pseudo: componentsPseudo },
    build: buildComponents,
  },
}

export const visualBounds = { minN: 1, maxN: MAX_NODES, minEdges: 0, maxEdges: MAX_EDGES }
