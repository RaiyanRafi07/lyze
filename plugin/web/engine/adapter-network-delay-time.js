/**
 * network-delay-time — live walkthrough adapter (Advanced Graphs, LeetCode 743).
 *
 * Live signature matches the judge record in plugin/data/shard-7.json exactly:
 * networkDelayTime(int[][] times, int n, int k) -> int, mode exact.
 * Dijkstra from k on the directed weighted graph (O(n^2) scan form so each
 * settle choice is visible; n <= 100 on the judge). Official examples:
 * [[[2,1,1],[2,3,1],[3,4,1]],4,2] -> 2, [[[1,2,1]],2,1] -> 1,
 * [[[1,2,1]],2,2] -> -1.
 *
 * Ported from .workers/jobs/neetcode150-completion/network-delay-time/network-delay-time.adapter.mjs
 * (frames, verdicts, signature, code listings and explain map unchanged) onto the
 * semantic-core helpers. Walkthrough bound (honest disclosure): 1 <= n <= 8,
 * 0 <= times.length <= 14 (judge allows n <= 100); over-bound or invalid inputs
 * are rejected with a clear error, never silently truncated.
 * Pure, synchronous, dependency-free ES module. No DOM, no network, no randomness.
 * Primary source: https://leetcode.com/problems/network-delay-time/
 */
import { code, frame } from './semantic-core.js';

export const SLUG = 'network-delay-time';

export const SIGNATURE = {
  name: 'networkDelayTime',
  params: [
    { name: 'times', type: 'int[][]' },
    { name: 'n', type: 'int' },
    { name: 'k', type: 'int' },
  ],
  return: 'int',
};

const MAX_N = 8;
const MAX_EDGES = 14;

const javaLines = code(`
[def] class Solution {
[def]     public int networkDelayTime(int[][] times, int n, int k) {
[init]         java.util.List<int[]>[] adj = new java.util.ArrayList[n + 1];
[init]         for (int i = 1; i <= n; i++) adj[i] = new java.util.ArrayList<>();
[init]         for (int[] t : times) adj[t[0]].add(new int[]{t[1], t[2]});
[init]         final int INF = Integer.MAX_VALUE / 2;
[init]         int[] dist = new int[n + 1];
[init]         java.util.Arrays.fill(dist, INF);
[seed]         dist[k] = 0;
[settle]         boolean[] done = new boolean[n + 1];
[settle]         for (int step = 0; step < n; step++) {
[settle]             int u = -1;
[settle]             for (int v = 1; v <= n; v++)
[settle]                 if (!done[v] && (u == -1 || dist[v] < dist[u])) u = v;
[skip]             if (u == -1 || dist[u] == INF) break;
[settle]             done[u] = true;
[relax]             for (int[] e : adj[u]) {
[relax]                 int v = e[0], w = e[1];
[relax]                 if (dist[v] > dist[u] + w) dist[v] = dist[u] + w;
[relax]             }
[settle]         }
[done]         int ans = 0;
[done]         for (int v = 1; v <= n; v++) {
[done]             if (dist[v] == INF) return -1;
[done]             ans = Math.max(ans, dist[v]);
[done]         }
[return]         return ans;
[def]     }
[def] }
`);

const cppLines = code(`
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     int networkDelayTime(vector<vector<int>>& times, int n, int k) {
[init]         vector<vector<pair<int,int>>> adj(n + 1);
[init]         for (auto& t : times) adj[t[0]].push_back({t[1], t[2]});
[init]         const int INF = 0x3f3f3f3f;
[init]         vector<int> dist(n + 1, INF);
[seed]         dist[k] = 0;
[settle]         vector<char> done(n + 1, 0);
[settle]         for (int step = 0; step < n; step++) {
[settle]             int u = -1;
[settle]             for (int v = 1; v <= n; v++)
[settle]                 if (!done[v] && (u == -1 || dist[v] < dist[u])) u = v;
[skip]             if (u == -1 || dist[u] == INF) break;
[settle]             done[u] = 1;
[relax]             for (auto& e : adj[u]) {
[relax]                 int v = e.first, w = e.second;
[relax]                 if (dist[v] > dist[u] + w) dist[v] = dist[u] + w;
[relax]             }
[settle]         }
[done]         int ans = 0;
[done]         for (int v = 1; v <= n; v++) {
[done]             if (dist[v] == INF) return -1;
[done]             ans = max(ans, dist[v]);
[done]         }
[return]         return ans;
[def]     }
[def] };
`);

const pseudoLines = code(`
[def] networkDelayTime(times, n, k):
[init]   adj = [[] for _ in 1..n]; for [u, v, w] in times: adj[u].append((v, w))
[init]   dist = [INF] * (n + 1)
[seed]   dist[k] = 0; done = [False] * (n + 1)
[settle]   repeat n times:
[settle]     u = unsettled v with smallest dist[v] (tie: smallest id)
[skip]     if u is none or dist[u] == INF: break
[settle]     done[u] = True
[relax]     for (v, w) in adj[u]:
[relax]       if dist[v] > dist[u] + w: dist[v] = dist[u] + w
[done]   ans = 0
[done]   for v in 1..n:
[done]     if dist[v] == INF: return -1
[done]     ans = max(ans, dist[v])
[return]   return ans
`);

const EXPLAIN = {
  init: 'Builds the directed adjacency lists and fills every distance with INF so k is the only known node.',
  seed: 'Seeds dist[k] = 0 so the source is picked first by the smallest-distance choice.',
  settle: 'Picks the unsettled node with the smallest known time (ties to the smallest id) and marks it settled.',
  relax: 'Offers each outgoing edge a shorter arrival time and keeps the better of the old and new values.',
  skip: 'Stops early when the smallest unsettled distance is still INF: the rest can never be reached.',
  done: 'Scans all distances: any INF left means some node is unreachable, otherwise the max is the answer.',
  return: 'Closes the Dijkstra scope and exposes the broadcast time, or -1 when a node stayed unreachable.',
  def: 'Declares solution scope so the Dijkstra loop and the answer scan stay inside networkDelayTime.',
};

// Per-line notes derived from the shared step notes so every rendered line is
// covered and can never drift out of alignment with the code arrays above.
const explainLinesFor = (lines) =>
  lines.map((entry) =>
    entry.step === 'def'
      ? EXPLAIN.def
      : typeof EXPLAIN[entry.step] === 'string'
        ? EXPLAIN[entry.step]
        : null
  );
const EXPLAIN_LINES = {
  java: explainLinesFor(javaLines),
  cpp: explainLinesFor(cppLines),
  pseudo: explainLinesFor(pseudoLines),
};

function fail(message) {
  throw new Error(message);
}

function decodeTimes(value) {
  let grid = value;
  if (typeof grid === 'string') {
    try {
      grid = JSON.parse(grid);
    } catch {
      fail('Provide times as int[][] (got unparseable string)');
    }
  }
  if (!Array.isArray(grid)) fail('Provide times as int[][] (got ' + typeof value + ')');
  if (grid.length > MAX_EDGES) {
    fail('Delay visual limited to 0..' + MAX_EDGES + ' edges (got ' + grid.length + ')');
  }
  return grid.map((row, i) => {
    if (!Array.isArray(row) || row.length !== 3) {
      fail('times[' + i + '] must be a triple [u,v,w] (got ' + JSON.stringify(row) + ')');
    }
    const [u, v, w] = row;
    if (!Number.isInteger(u) || !Number.isInteger(v) || !Number.isInteger(w)) {
      fail('times[' + i + '] must hold integers (got ' + JSON.stringify(row) + ')');
    }
    return [u, v, w];
  });
}

function decodeInt(value, name) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isInteger(n)) {
    fail('Provide ' + name + ' as an integer (got ' + JSON.stringify(value) + ')');
  }
  return n;
}

function layoutCircle(n) {
  const nodes = [];
  for (let id = 1; id <= n; id += 1) {
    const angle = -Math.PI / 2 + ((id - 1) * 2 * Math.PI) / n;
    nodes.push({
      id,
      label: String(id),
      x: Math.round(3.2 * Math.cos(angle) * 100) / 100,
      y: Math.round(3.2 * Math.sin(angle) * 100) / 100,
    });
  }
  return nodes;
}

/** Run Dijkstra on the actual input and record every settle/relax event. */
function build(args) {
  if (!Array.isArray(args) || args.length !== 3) {
    fail('Delay walkthrough needs [times, n, k] (got ' + (Array.isArray(args) ? args.length + ' entries' : typeof args) + ')');
  }
  const times = decodeTimes(args[0]);
  const n = decodeInt(args[1], 'n');
  const k = decodeInt(args[2], 'k');
  if (n < 1 || n > MAX_N) fail('Delay visual limited to 1..' + MAX_N + ' nodes (got ' + n + ')');
  if (k < 1 || k > n) fail('Use k with 1 <= k <= n (got k=' + k + ', n=' + n + ')');
  const seen = new Set();
  for (let i = 0; i < times.length; i += 1) {
    const [u, v, w] = times[i];
    if (u < 1 || u > n || v < 1 || v > n) {
      fail('times[' + i + '] out of range for n=' + n + ' (got [' + u + ',' + v + ',' + w + '])');
    }
    if (u === v) fail('times[' + i + '] must have u != v (got [' + u + ',' + v + ',' + w + '])');
    if (w < 0 || w > 100) fail('times[' + i + '] weight must satisfy 0 <= w <= 100 (got ' + w + ')');
    const key = u + '->' + v;
    if (seen.has(key)) fail('times[' + i + '] repeats edge ' + key + '; pairs must be unique');
    seen.add(key);
  }

  const adj = Array.from({ length: n + 1 }, () => []);
  for (const [u, v, w] of times) adj[u].push([v, w]);

  const INF = Number.MAX_SAFE_INTEGER;
  const dist = new Array(n + 1).fill(INF);
  const done = new Array(n + 1).fill(false);
  const order = [];
  const frames = [];
  const anchors = [];

  const distObj = () => {
    const o = {};
    for (let v = 1; v <= n; v += 1) o[v] = dist[v] === INF ? 'INF' : dist[v];
    return o;
  };
  const frontierOf = () => {
    const out = [];
    for (let v = 1; v <= n; v += 1) if (!done[v] && dist[v] !== INF) out.push(v);
    return out;
  };
  const base = (current, extraVars) => ({
    current,
    visited: order.slice(),
    frontier: frontierOf(),
    path: [],
    dist: distObj(),
    vars: { n, k, settled: order.length, ...extraVars },
  });
  const push = (step, label, note, state) => {
    frames.push(frame(step, label, note, state));
  };

  push(
    'init',
    'Build graph',
    'n=' + n + ', edges=' + times.length + ', source k=' + k + '; dist all INF',
    base(null, {})
  );
  dist[k] = 0;
  push('seed', 'Seed source', 'dist[' + k + ']=0; all others INF; ' + n + ' nodes to settle', base(k, { source: k }));

  let firstSettle = true;
  for (let step = 0; step < n; step += 1) {
    let u = -1;
    for (let v = 1; v <= n; v += 1) {
      if (!done[v] && (u === -1 || dist[v] < dist[u])) u = v;
    }
    if (u === -1 || dist[u] === INF) {
      const left = n - order.length;
      push('skip', 'Stop: rest unreachable', 'smallest unsettled dist is INF; ' + left + ' node(s) left -> answer -1', base(null, { unreachable: left }));
      break;
    }
    done[u] = true;
    order.push(u);
    push(
      'settle',
      'Settle ' + u,
      'u=' + u + ' dist=' + dist[u] + ' is minimal; settled ' + order.length + '/' + n,
      base(u, { u, d: dist[u] })
    );
    if (firstSettle) {
      anchors.push(frames.length - 1);
      firstSettle = false;
    }
    for (const [v, w] of adj[u]) {
      const before = dist[v];
      if (before > dist[u] + w) {
        dist[v] = dist[u] + w;
        push(
          'relax',
          'Relax ' + u + '->' + v,
          'dist[' + v + ']: ' + (before === INF ? 'INF' : before) + '->' + dist[v] + ' via ' + u + ' (w=' + w + ')',
          { ...base(u, { from: u, to: v, w }), path: [u, v] }
        );
        anchors.push(frames.length - 1);
      }
    }
  }

  let answer = 0;
  let bad = -1;
  for (let v = 1; v <= n; v += 1) {
    if (dist[v] === INF) {
      bad = v;
      break;
    }
    if (dist[v] > answer) answer = dist[v];
  }
  if (bad !== -1) {
    push('done', 'Verify unreachable', 'node ' + bad + ' stayed INF; settled ' + order.length + '/' + n + ' -> -1', base(null, { unreachableNode: bad }));
  } else {
    push('done', 'Verify all reached', 'settled ' + order.length + '/' + n + '; max dist=' + answer, {
      ...base(null, {}),
      answer,
    });
  }
  anchors.push(frames.length - 1);
  const result = bad !== -1 ? -1 : answer;
  push('return', 'Return ' + result, bad !== -1 ? 'return -1; node ' + bad + ' never received the signal' : 'return ' + answer + '; every node received the signal', {
    ...base(null, {}),
    answer: result,
  });
  anchors.push(frames.length - 1);

  return {
    kind: 'graph',
    layout: {
      nodes: layoutCircle(n),
      edges: times.map(([u, v, w]) => [u, v, w]),
      directed: true,
    },
    frames,
    result,
    anchors,
  };
}

export const adapters = {
  'network-delay-time': {
    signature: { name: 'networkDelayTime', params: ['int[][]', 'int', 'int'], return: 'int' },
    lesson: {
      idea: 'Dijkstra from k: repeatedly settle the unsettled node with the smallest known time, then relax its outgoing edges; the max settled time is the answer.',
      trap: 'BFS hop order is not time order on weighted edges; settling nodes in queue order instead of smallest-dist order overestimates. Also: 1-indexed nodes, unreachable means -1, w can be 0.',
      time: 'O(n^2 + m)',
      space: 'O(n + m)',
    },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    code: { java: javaLines, cpp: cppLines, pseudo: pseudoLines },
    build,
  },
};

export default adapters['network-delay-time'];
