// Reconstruct Itinerary — per-slug semantic adapter (Advanced Graphs, LeetCode 332).
// Walkthrough + notes gap: live judge record is plugin/data/shard-15.json id 332
// (findItinerary(string[][] tickets) -> string[], exact mode, 2 official examples).
// Hierholzer post-order from JFK with lexical-smallest discipline: adjacency lists
// sorted ascending, always consume the smallest unused edge first, prepend the
// airport to the route only after all its departures are exhausted (addFirst).
// layout carries the recorded ticket multigraph (nodes/edges/directed) for the visual.
//
// Convention follows plugin/web/engine/rotate-image-adapter.js:
// import semantic-core helpers, export `adapters` keyed by slug, build() returns the
// full honest event list (the single compaction pass is boundedFrames in semantic.js).
import { code, frame, boundedFrames } from './semantic-core.js';

export const SLUG = 'reconstruct-itinerary';

// Live judge signature (plugin/data shard record id 332): findItinerary(string[][]) -> string[].
// Adapter signature MUST equal it exactly (name/return/param types) or the
// walkthrough throws in semantic.js.
export const SIGNATURE = {
  name: 'findItinerary',
  params: ['string[][]'],
  return: 'string[]',
};

// Visual bounds (honest disclosure): 1..8 tickets, at most 8 distinct airports.
// The judge allows up to 300 tickets; larger inputs are rejected, never truncated.
export const MAX_TICKETS = 8;
export const MAX_AIRPORTS = 8;

const itineraryJava = code(`
[def] import java.util.*;
[def] class Solution {
[def]     public String[] findItinerary(String[][] tickets) {
[init]         Map<String, PriorityQueue<String>> adj = new HashMap<>();
[init]         for (String[] t : tickets) adj.computeIfAbsent(t[0], k -> new PriorityQueue<>()).offer(t[1]);
[sort]         // PriorityQueue polls smallest first: lexical order is enforced at each departure.
[sort]         LinkedList<String> route = new LinkedList<>();
[visit]         dfs("JFK", adj, route);
[return]         return route.toArray(new String[0]);
[def]     }
[visit]     private void dfs(String u, Map<String, PriorityQueue<String>> adj, LinkedList<String> route) {
[fly]         PriorityQueue<String> pq = adj.get(u);
[fly]         while (pq != null && !pq.isEmpty()) dfs(pq.poll(), adj, route);
[backtrack]         route.addFirst(u);
[def]     }
[def] }
`);

const itineraryCpp = code(`
[def] #include <vector>
[def] #include <string>
[def] #include <map>
[def] #include <queue>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     vector<string> findItinerary(vector<vector<string>>& tickets) {
[init]         map<string, priority_queue<string, vector<string>, greater<string>>> adj;
[init]         for (auto& t : tickets) adj[t[0]].push(t[1]);
[sort]         // min-heap per airport: top() is always the smallest unused arrival.
[sort]         vector<string> route;
[visit]         dfs("JFK", adj, route);
[return]         return vector<string>(route.rbegin(), route.rend());
[def]     }
[visit]     void dfs(string u, map<string, priority_queue<string, vector<string>, greater<string>>>& adj, vector<string>& route) {
[fly]         auto it = adj.find(u);
[fly]         while (it != adj.end() && !it->second.empty()) { string v = it->second.top(); it->second.pop(); dfs(v, adj, route); }
[backtrack]         route.push_back(u);
[def]     }
[def] };
`);

const itineraryPseudo = code(`
[def] findItinerary(tickets):
[init]   adj = empty map; for [a, b] in tickets: adj[a].append(b)
[sort]   for each key in adj: sort(adj[key]) ascending; idx[key] = 0
[visit]   route = []; stack dfs from "JFK":
[visit]   dfs(u):
[fly]     while idx[u] < len(adj[u]): v = adj[u][idx[u]++]; dfs(v)
[backtrack]     route.prepend(u)
[return]   return route
`);

const EXPLAIN = {
  init: 'Build the departure map: one min-heap of arrivals per airport, one insert per ticket.',
  sort: 'Lexical order lives in the heaps: each poll takes the smallest unused departure.',
  visit: 'Enter an airport on the DFS stack; its departures will be exhausted before it is placed.',
  fly: 'Consume the smallest unused ticket out of the current airport and recurse into its arrival.',
  backtrack: 'No departures left: prepend this airport; the stuck airport is the end, not the next stop.',
  return: 'Every ticket flown exactly once; the prepended route is the lexical-minimum itinerary.',
};

export const EXPLAIN_LINES = {
  java: {
    4: 'One heap insert per ticket; missing departure keys are created on demand.',
    6: 'Output built by addFirst for O(1) prepend on every backtrack.',
    12: 'While, not if: every departure is flown before this airport is prepended.',
    13: 'Post-order prepend puts the finished airport before everything after it.',
  },
  cpp: {
    9: 'One heap push per ticket; operator[] creates empty heaps on demand.',
    11: 'Collected back-to-front, then reversed once at return.',
    17: 'Take top(), pop it, recurse: smallest unused ticket first, every time.',
    18: 'Post-order append; the single reverse at return turns it into a prepend.',
  },
  pseudo: {
    2: 'Ascending sorts plus an advancing index mirror the heap-poll order.',
    5: 'Exhaust the current airport completely before placing it in the route.',
  },
};

function fail(message) {
  throw new Error(message);
}

const CODE3 = /^[A-Z]{3}$/;

function checkBound(tickets) {
  if (!Array.isArray(tickets)) fail('findItinerary walkthrough needs [tickets] (got ' + typeof tickets + ')');
  if (tickets.length < 1 || tickets.length > MAX_TICKETS) {
    fail('findItinerary visual limited to 1..' + MAX_TICKETS + ' tickets (got ' + tickets.length + ')');
  }
  const ports = new Set();
  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];
    if (!Array.isArray(t) || t.length !== 2) fail('tickets[' + i + '] must be a [from,to] pair');
    for (const x of t) {
      if (typeof x !== 'string' || !CODE3.test(x)) fail('tickets[' + i + '] airports must be 3 uppercase letters (got ' + JSON.stringify(t) + ')');
      ports.add(x);
    }
    if (t[0] === t[1]) fail('tickets[' + i + '] must satisfy from != to');
  }
  ports.add('JFK');
  if (ports.size > MAX_AIRPORTS) fail('findItinerary visual limited to ' + MAX_AIRPORTS + ' airports (got ' + ports.size + ')');
  if (!ports.has('JFK')) fail('itinerary must begin with JFK');
}

// Every frame below is a REAL execution event: init, one sort event per airport
// with departures, one visit per stack entry, one fly per ticket consumed in
// smallest-first order, one backtrack prepend per airport, plus return. The
// route only grows on backtrack events, never ahead of the walk.
function build(args) {
  if (!Array.isArray(args) || args.length !== 1) fail('findItinerary walkthrough needs [tickets]');
  const input = args[0];
  checkBound(input);
  const tickets = input.map((t) => [t[0], t[1]]);

  // Sorted adjacency (ascending) + consume pointer = PriorityQueue.poll order.
  const adj = new Map();
  for (const [a, b] of tickets) {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a).push(b);
  }
  for (const v of adj.values()) v.sort();
  const idx = new Map([...adj.keys()].map((k) => [k, 0]));

  const ports = [...new Set(['JFK', ...tickets.flat()])].sort();
  const nodes = ports.map((p) => ({ id: p, label: p }));
  const edges = tickets.map(([a, b]) => [a, b]);

  const frames = [];
  const anchors = [];
  const route = []; // built via unshift (addFirst); exposed as answer snapshot
  const stack = []; // dfs call stack for path/frontier
  const visited = []; // airports already prepended, in route order

  const snap = (current) => ({
    current,
    visited: visited.slice(),
    frontier: stack.slice(),
    path: stack.slice(),
    answer: route.slice(),
    vars: { used: visited.length, tickets: tickets.length, stackLen: stack.length },
  });
  const push = (step, label, note, current) => {
    frames.push(frame(step, label, note, snap(current)));
  };

  push('init', 'Initialize', 'tickets=' + tickets.length + ', airports=' + ports.length + '; start JFK', 'JFK');
  for (const p of ports) {
    const outs = adj.get(p) || [];
    if (outs.length > 0) push('sort', 'Sort ' + p, p + ' -> [' + outs.join(',') + '] smallest first', p);
  }

  // Iterative Hierholzer mirroring the recursive reference exactly.
  const callStack = ['JFK'];
  stack.push('JFK');
  push('visit', 'Visit JFK', 'enter JFK; stack=[JFK]', 'JFK');
  const hasOut = (u) => idx.has(u) && idx.get(u) < (adj.get(u) || []).length;

  while (callStack.length > 0) {
    const u = callStack[callStack.length - 1];
    if (hasOut(u)) {
      const v = adj.get(u)[idx.get(u)];
      idx.set(u, idx.get(u) + 1);
      anchors.push(frames.length);
      push('fly', 'Fly ' + u + '->' + v, 'use ' + u + '->' + v + '; next ' + v, v);
      callStack.push(v);
      stack.push(v);
      push('visit', 'Visit ' + v, 'enter ' + v + '; stack=[' + stack.join(',') + ']', v);
    } else {
      callStack.pop();
      stack.pop();
      route.unshift(u);
      visited.unshift(u);
      for (let i = 0; i < route.length; i++) visited[i] = route[i];
      const suffix = route.join(',');
      push('backtrack', 'Backtrack ' + u, u + ' has no tickets left; route=[' + suffix + ']', stack.length ? stack[stack.length - 1] : null);
    }
  }

  push('return', 'Return', 'route=[' + route.join(',') + '] uses all tickets', null);
  return {
    kind: 'graph',
    layout: { tickets: tickets.map((t) => t.slice()), nodes, edges, directed: true },
    frames,
    anchors,
    result: route.slice(),
  };
}

export { boundedFrames };

export const adapters = {
  'reconstruct-itinerary': {
    signature: { name: SIGNATURE.name, params: SIGNATURE.params.slice(), return: SIGNATURE.return },
    lesson: {
      idea: 'Hierholzer from JFK: always fly the smallest unused ticket first, prepend each airport only after its departures run out.',
      trap: 'Taking the smallest ticket greedily without backtracking strands you (JFK->KUL before JFK->NRT); post-order prepend fixes the dead end.',
      time: 'O(E log E)',
      space: 'O(V + E)',
    },
    code: { java: itineraryJava, cpp: itineraryCpp, pseudo: itineraryPseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
};
