import { code, frame } from './semantic-core.js'

// Visual bound: keep node/edge diagrams readable. Over-bound inputs are
// rejected with a clear error (never truncated silently).
const MAX_NODES = 12
const MAX_EDGES = 12

const redundantJava = code(`
[def] import java.util.*;
[def] class Solution {
[def]     int[] parent;
[def]     int[] size;
[def]     public int[] findRedundantConnection(int[][] edges) {
[init]         int n = 0;
[init]         for (int[] e : edges) n = Math.max(n, Math.max(e[0], e[1]));
[init]         parent = new int[n + 1];
[init]         size = new int[n + 1];
[init]         for (int i = 1; i <= n; i++) { parent[i] = i; size[i] = 1; }
[init]         int[] answer = null;
[find]         for (int[] e : edges) {
[find]             int a = e[0]; int b = e[1];
[find]             int ra = find(a);
[find]             int rb = find(b);
[redundant]             if (ra == rb) { answer = e; break; }
[union]             if (size[ra] < size[rb]) { int t = ra; ra = rb; rb = t; }
[union]             parent[rb] = ra;
[union]             size[ra] += size[rb];
[find]         }
[return]         return answer;
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

const redundantCpp = code(`
[def] #include <vector>
[def] #include <algorithm>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     vector<int> findRedundantConnection(vector<vector<int>>& edges) {
[init]         int n = 0;
[init]         for (auto& e : edges) n = max(n, max(e[0], e[1]));
[init]         vector<int> parent(n + 1), sz(n + 1, 1);
[init]         for (int i = 1; i <= n; i++) parent[i] = i;
[init]         vector<int> answer;
[find]         for (auto& e : edges) {
[find]             int a = e[0], b = e[1];
[find]             int ra = findRoot(parent, a);
[find]             int rb = findRoot(parent, b);
[redundant]             if (ra == rb) { answer = e; break; }
[union]             if (sz[ra] < sz[rb]) swap(ra, rb);
[union]             parent[rb] = ra;
[union]             sz[ra] += sz[rb];
[find]         }
[return]         return answer;
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

const redundantPseudo = code(`
[def] findRedundantConnection(edges):
[init]   n = max(max(e) for e in edges); parent[i] = i; size[i] = 1
[init]   for i in 1..n: parent[i] = i; size[i] = 1
[init]   answer = None
[find]   for [a, b] in edges:
[find]     ra = find(a); rb = find(b)
[redundant]     if ra == rb: answer = [a, b]; break
[union]     if size[ra] < size[rb]: swap(ra, rb)
[union]     parent[rb] = ra; size[ra] += size[rb]
[return]   return answer
[def] find(x):
[find]   while parent[x] != x: parent[x] = parent[parent[x]]; x = parent[x]
[find]   return x
`)

function fail(message) {
  throw new Error(message)
}

function checkBound(edges) {
  if (!Array.isArray(edges)) fail('edges must be an array of [a,b] pairs')
  if (edges.length < 1 || edges.length > MAX_EDGES) {
    fail('Redundant visual limited to 1..' + MAX_EDGES + ' edges (got ' + edges.length + ')')
  }
  let peak = 0
  const seen = new Set()
  for (let i = 0; i < edges.length; i++) {
    const p = edges[i]
    if (!Array.isArray(p) || p.length !== 2) fail('edges[' + i + '] must be a pair [a,b]')
    const a = p[0]
    const b = p[1]
    if (!Number.isInteger(a) || !Number.isInteger(b)) {
      fail('edges[' + i + '] must hold integers (got ' + JSON.stringify(p) + ')')
    }
    if (a === b) fail('edges[' + i + '] needs two different vertices (got [' + a + ',' + b + '])')
    if (a < 1 || b < 1) fail('edges[' + i + '] labels start at 1 (got [' + a + ',' + b + '])')
    peak = Math.max(peak, a, b)
    const key = Math.min(a, b) + ':' + Math.max(a, b)
    if (seen.has(key)) fail('edges[' + i + '] repeats undirected edge [' + a + ',' + b + ']')
    seen.add(key)
  }
  if (peak < 1 || peak > MAX_NODES) {
    fail('Redundant visual limited to 1..' + MAX_NODES + ' nodes (peak label ' + peak + ')')
  }
  for (let i = 0; i < edges.length; i++) {
    const a = edges[i][0]
    const b = edges[i][1]
    if (a > peak || b > peak) fail('edges[' + i + '] out of range for peak ' + peak)
  }
}

function build(args) {
  if (!Array.isArray(args) || args.length !== 1) fail('Redundant walkthrough needs [edges]')
  const inputEdges = args[0]
  checkBound(inputEdges)
  // Preserve actual input values: deep copy for layout, never reorder input.
  const edges = inputEdges.map(p => [p[0], p[1]])
  let n = 0
  for (const [a, b] of edges) n = Math.max(n, a, b)
  const parent = new Array(n + 1)
  const size = new Array(n + 1)
  for (let i = 1; i <= n; i++) { parent[i] = i; size[i] = 1 }
  parent[0] = 0
  size[0] = 0
  const frames = []
  const anchors = []
  let answer = null

  // current is ALWAYS a node id (or null): edge indices would highlight the wrong
  // node in the graph renderer. The edge under study travels in edge/vars instead.
  const snap = (current, edgeIndex, extra = {}) => ({
    current,
    edge: edgeIndex === null || edgeIndex === undefined ? null : edges[edgeIndex].slice(),
    ra: extra.ra !== undefined ? extra.ra : null,
    rb: extra.rb !== undefined ? extra.rb : null,
    parent: parent.slice(),
    size: size.slice(),
    answer: answer ? answer.slice() : null,
    vars: { n, ...(edgeIndex === null || edgeIndex === undefined ? {} : { edge: edgeIndex }), ...extra.vars },
  })
  const push = (step, label, note, state) => {
    frames.push(frame(step, label, note, state))
  }

  push('init', 'Initialize', 'n=' + n + ', edges=' + edges.length + '; parent[i]=i', snap(null, null, { vars: {} }))

  // Honest path-halving find: each parent[x]=parent[parent[x]] hop is a real
  // assignment and gets its own frame; union attaches ROOTS, never raw nodes.
  const findRoot = (start, edgeIndex) => {
    let x = start
    if (parent[x] === x) {
      push('find', 'Find ' + start, 'root(' + start + ')=' + x + '; edge ' + edgeIndex + ' [' + edges[edgeIndex] + ']', snap(x, edgeIndex, { ra: null, rb: null, vars: { find: start, root: x } }))
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
      answer = [a, b]
      push('redundant', 'Redundant [' + a + ',' + b + ']', 'edge ' + i + ' [' + a + ',' + b + '] shares root ' + ra + '; forest, not graph', snap(ra, i, { ra, rb, vars: { edge: i, root: ra } }))
      anchors.push(frames.length - 1)
      break
    }
    let r1 = ra
    let r2 = rb
    const swapped = size[r1] < size[r2]
    if (swapped) { const t = r1; r1 = r2; r2 = t }
    parent[r2] = r1
    size[r1] += size[r2]
    push('union', 'Union [' + a + ',' + b + ']', 'roots ' + ra + ',' + rb + (swapped ? ' swap' : '') + '; parent[' + r2 + ']=' + r1, snap(r2, i, { ra: r1, rb: r2, vars: { edge: i, from: r2, to: r1 } }))
    if (firstUnion) { anchors.push(frames.length - 1); firstUnion = false; }
  }

  if (answer) {
    push('return', 'Return', 'return [' + answer[0] + ',' + answer[1] + ']', snap(null, edges.length - 1, { ra: null, rb: null, vars: { found: true } }))
  } else {
    push('return', 'Return', 'no shared root; return null (input has no cycle)', snap(null, edges.length - 1, { vars: { found: false } }))
  }
  anchors.push(frames.length - 1)

  return {
    kind: 'graph',
    layout: {
      // Contract-shaped graph nodes/edges: labeled 1..n nodes, input pairs.
      nodes: Array.from({ length: n }, (_, k) => ({ id: k + 1, label: String(k + 1) })),
      edges: edges.map(p => [p[0], p[1]]),
    },
    frames,
    result: answer,
    anchors,
  }
}

// Visual bound: keep the node/edge diagram readable. Over-bound inputs are
// rejected with a clear error (never truncated silently).
const MAX_PROVINCES = 6

const provincesJava = code(`
[def] class Solution {
[def]     public int findCircleNum(int[][] isConnected) {
[init]         int n = isConnected.length;
[init]         int[] parent = new int[n];
[init]         for (int i = 0; i < n; i++) parent[i] = i;
[init]         int count = n;
[find]         for (int i = 0; i < n; i++)
[find]             for (int j = i + 1; j < n; j++) {
[skip]                 if (isConnected[i][j] == 0) continue;
[find]                 int ra = find(parent, i);
[find]                 int rb = find(parent, j);
[skip]                 if (ra == rb) continue;
[union]                 parent[rb] = ra;
[union]                 count--;
[def]             }
[done]         return count;
[def]     }
[def]     int find(int[] parent, int x) {
[find]         while (parent[x] != x) {
[find]             parent[x] = parent[parent[x]];
[find]             x = parent[x];
[def]         }
[find]         return x;
[def]     }
[def] }
`)

const provincesCpp = code(`
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     int findCircleNum(vector<vector<int>>& isConnected) {
[init]         int n = (int)isConnected.size();
[init]         vector<int> parent(n);
[init]         for (int i = 0; i < n; i++) parent[i] = i;
[init]         int count = n;
[find]         for (int i = 0; i < n; i++)
[find]             for (int j = i + 1; j < n; j++) {
[skip]                 if (isConnected[i][j] == 0) continue;
[find]                 int ra = findRoot(parent, i);
[find]                 int rb = findRoot(parent, j);
[skip]                 if (ra == rb) continue;
[union]                 parent[rb] = ra;
[union]                 count--;
[def]             }
[done]         return count;
[def]     }
[def]     int findRoot(vector<int>& parent, int x) {
[find]         while (parent[x] != x) {
[find]             parent[x] = parent[parent[x]];
[find]             x = parent[x];
[def]         }
[find]         return x;
[def]     }
[def] };
`)

const provincesPseudo = code(`
[def] findCircleNum(isConnected):
[init]   n = len(isConnected); parent[i] = i for all i; count = n
[init]   for i in 0..n-1: parent[i] = i
[find]   for i in 0..n-1:
[find]     for j in i+1..n-1:
[skip]       if isConnected[i][j] == 0: continue
[find]       ra = find(i); rb = find(j)
[skip]       if ra == rb: continue
[union]     parent[rb] = ra; count -= 1
[done]   return count
[def] find(x):
[find]   while parent[x] != x: parent[x] = parent[parent[x]]; x = parent[x]
[find]   return x
`)

function checkProvinceMatrix(value) {
  if (!Array.isArray(value)) fail('Provinces visual needs a square 0/1 matrix isConnected (got non-array)')
  const n = value.length
  if (!Number.isInteger(n) || n < 1 || n > MAX_PROVINCES) {
    fail('Provinces visual limited to 1..' + MAX_PROVINCES + ' cities (got ' + (Array.isArray(value) ? value.length : typeof value) + ')')
  }
  for (let i = 0; i < n; i++) {
    const row = value[i]
    if (!Array.isArray(row) || row.length !== n) {
      fail('isConnected must be square: row ' + i + ' has length ' + (Array.isArray(row) ? row.length : typeof row) + ', want ' + n)
    }
    for (let j = 0; j < n; j++) {
      const cell = row[j]
      if (cell !== 0 && cell !== 1) {
        fail('isConnected[' + i + '][' + j + '] must be 0 or 1 (got ' + JSON.stringify(cell) + ')')
      }
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (value[i][j] !== value[j][i]) {
        fail('isConnected must be symmetric: [' + i + '][' + j + ']=' + value[i][j] + ' vs [' + j + '][' + i + ']=' + value[j][i])
      }
    }
  }
}

function buildProvinces(args) {
  if (!Array.isArray(args) || args.length !== 1) fail('Provinces walkthrough needs [isConnected]')
  checkProvinceMatrix(args[0])
  const source = args[0]
  const n = source.length
  // Preserve actual input values: deep copy, never reorder input.
  const mat = source.map(row => row.slice())
  const parent = Array.from({ length: n }, (_, i) => i)
  let count = n
  const frames = []
  const anchors = []
  const edges = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (mat[i][j] === 1) edges.push([i, j])
    }
  }

  // current is ALWAYS a node id (or null): the pair under study travels in
  // pair/vars instead, so the graph renderer highlights the right node.
  const snap = (current, extra = {}) => ({
    current,
    pair: extra.pair !== undefined ? extra.pair : null,
    ra: extra.ra !== undefined ? extra.ra : null,
    rb: extra.rb !== undefined ? extra.rb : null,
    parent: parent.slice(),
    count,
    vars: { n, count, ...(extra.vars || {}) },
  })
  const push = (step, label, note, state) => {
    frames.push(frame(step, label, note, state))
  }

  push('init', 'Initialize', 'n=' + n + '; parent[i]=i; count=' + n, snap(null, { vars: {} }))

  // Honest path-halving find: each parent[x]=parent[parent[x]] hop is a real
  // assignment and gets its own frame; union attaches ROOTS, never raw cities.
  const findRoot = (start, pi, pj) => {
    let x = start
    if (parent[x] === x) {
      push('find', 'Find ' + start, 'root(' + start + ')=' + x + '; pair (' + pi + ',' + pj + ')', snap(x, { pair: [pi, pj], vars: { find: start, root: x } }))
      return x
    }
    while (parent[x] !== x) {
      const before = parent[x]
      const grand = parent[before]
      parent[x] = grand
      const moved = parent[x]
      push('find', 'Halve ' + x, 'parent[' + x + ']: ' + before + '->' + moved + '; x->' + moved, snap(x, { pair: [pi, pj], vars: { find: start, at: x } }))
      x = moved
    }
    push('find', 'Root of ' + start, 'root(' + start + ')=' + x + '; pair (' + pi + ',' + pj + ')', snap(x, { pair: [pi, pj], vars: { find: start, root: x } }))
    return x
  }

  let firstUnion = true
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (mat[i][j] === 0) {
        push('skip', 'Skip [' + i + ',' + j + ']', 'isConnected[' + i + '][' + j + ']=0; no edge; count=' + count, snap(i, { pair: [i, j], vars: { pair: [i, j] } }))
        continue
      }
      const ra = findRoot(i, i, j)
      const rb = findRoot(j, i, j)
      if (ra === rb) {
        push('skip', 'Share root ' + ra, 'pair (' + i + ',' + j + ') in one province; count=' + count, snap(ra, { pair: [i, j], ra, rb, vars: { pair: [i, j], root: ra } }))
        continue
      }
      parent[rb] = ra
      count--
      push('union', 'Union [' + i + ',' + j + ']', 'parent[' + rb + ']=' + ra + '; count=' + count, snap(rb, { pair: [i, j], ra, rb, vars: { pair: [i, j], from: rb, to: ra } }))
      if (firstUnion) { anchors.push(frames.length - 1); firstUnion = false }
    }
  }

  push('done', 'Done', 'all pairs scanned; provinces=' + count, snap(null, { vars: { provinces: count } }))
  anchors.push(frames.length - 1)

  return {
    kind: 'graph',
    layout: {
      // Contract-shaped graph nodes/edges: cities 0..n-1, one edge per 1 above the diagonal.
      nodes: Array.from({ length: n }, (_, k) => ({ id: k, label: String(k) })),
      edges: edges.map(p => p.slice()),
    },
    frames,
    result: count,
    anchors,
  }
}

export const adapters = {
  'redundant-connection': {
    signature: { name: 'findRedundantConnection', params: ['int[][]'], return: 'int[]' },
    lesson: {
      idea: 'Scan edges in order; find each endpoint root with path halving; first edge joining one set is the cycle edge.',
      trap: 'Union ROOTS not nodes; parent[] is a DSU forest, not graph edges — bare parent[a]==parent[b] lies.',
      time: 'O(n·α(n))',
      space: 'O(n)',
    },
    code: { java: redundantJava, cpp: redundantCpp, pseudo: redundantPseudo },
    explain: {
      def: 'Scope wrapper: DSU fields plus method shells; no find, union, or cycle test runs on these lines.',
      init: 'Size the forest from the real peak label; every node starts as its own set of size 1.',
      find: 'Walk each endpoint to its set root with path halving; roots, never raw parents, decide the outcome.',
      redundant: 'Both ends share one root, so this edge closes a cycle: the only frame that can report an answer.',
      union: 'Attach the smaller root under the larger one and grow it; the forest stays shallow for later finds.',
      return: 'Hand back the stored redundant edge once the scan proves one; null means the input had no cycle.',
    },
    explainLines: {
      java: {
        4: 'Entry point: receives edges in input order; the scan below must preserve that order.',
        15: 'Same-root test: this edge would close a cycle, so store it and stop scanning.',
        19: 'End of the edge scan: no shared root seen, so control falls through to the return.',
        20: 'Return the stored edge; valid inputs always store one before reaching here.',
      },
      cpp: {
        5: 'Entry point: edges arrive by reference; the scan below must preserve input order.',
        15: 'Same-root test: this edge would close a cycle, so store it and stop scanning.',
        19: 'End of the edge scan: no shared root seen, so control falls through to the return.',
        20: 'Return the stored edge; valid inputs always store one before reaching here.',
      },
      pseudo: {
        6: 'Same-root test: the single decision; a hit records the answer and stops the scan.',
      },
    },
    build
  },
  'number-of-provinces': {
    signature: { name: 'findCircleNum', params: ['int[][]'], return: 'int' },
    lesson: {
      idea: 'Union-find provinces: scan upper-triangle 1s, union endpoint roots, survivors are provinces.',
      trap: 'Union ROOTS not cities; scan i<j once — full scans double-union and diagonal 1s are not edges.',
      time: 'O(n^2·α(n))',
      space: 'O(n)'
    },
    code: { java: provincesJava, cpp: provincesCpp, pseudo: provincesPseudo },
    build: buildProvinces
  }
}
