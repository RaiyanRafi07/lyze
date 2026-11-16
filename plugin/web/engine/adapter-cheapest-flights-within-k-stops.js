/**
 * cheapest-flights-within-k-stops — live semantic adapter (Advanced Graphs).
 *
 * Walkthrough algorithm (mirrors the reference Java/C++/pseudo below):
 * Bellman-Ford limited to k+1 rounds. Each round relaxes every flight
 * against a FROZEN snapshot of the previous round, so one round adds at
 * most one edge and round r holds the cheapest prices using at most r+1
 * edges (at most r stops). Plain Dijkstra is wrong here: it minimizes
 * price while ignoring the stop budget.
 *
 * Live record: plugin/data/shard-7.json (Medium, pattern graph-bfs), judge
 * mode exact, signature
 * findCheapestPrice(int n, int[][] flights, int src, int dst, int k) -> int,
 * official tests `4,[[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]],0,3,1
 * -> 700`, `3,[[0,1,100],[1,2,100],[0,2,500]],0,2,1 -> 200` and
 * `3,[[0,1,100],[1,2,100],[0,2,500]],0,2,0 -> 500`.
 *
 * Staged source: .workers/jobs/question-owners-150/cheapest-flights-within-k-stops/adapter.js
 * (Bellman-Ford builder, Java/C++/pseudo, every-line notes, visual bounds) —
 * ported to the live shape: shared helpers imported from semantic-core.js, no
 * local code/frame redefinitions. Signature equals the live judge signature
 * exactly, so the same editor code compiles unchanged.
 *
 * One deliberate deviation from the staged copy: the staged closing frame
 * uses step 'done', which has no [done] line in any reference listing and
 * would trip the semantic.js Unmapped-operation check. The live adapter tags
 * the closing frame 'verdict' (it restates the verdict outcome), so every
 * emitted frame step (init/round/relax/commit/verdict) has a matching [step]
 * line in java AND cpp AND pseudo.
 *
 * Visual bounds: n 2..8, flights 0..20, k 0..6 (judge allows n <= 100).
 * Over-bound or out-of-range inputs reject with a clear Error (never
 * truncated). The code runner keeps the full official constraints.
 */
import { code, frame } from './semantic-core.js'

export const VISUAL_BOUNDS = Object.freeze({ nMin: 2, nMax: 8, flightsMax: 20, kMax: 6 })

function fail(message) {
  throw new Error(message)
}

function decodeInt(value, name, lo, hi) {
  let v = value
  if (typeof v === 'string' && v.trim() !== '') {
    if (/^-?\d+$/.test(v.trim())) v = parseInt(v.trim(), 10)
    else fail(`Provide ${name} as an integer in ${lo}..${hi} (got ${JSON.stringify(value)})`)
  }
  if (!Number.isInteger(v) || v < lo || v > hi) {
    fail(`Provide ${name} as an integer in ${lo}..${hi} (got ${JSON.stringify(value)})`)
  }
  return v
}

function decodeFlights(value, n) {
  let list = value
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list)
    } catch {
      fail('Provide flights as int[][] (got unparseable string)')
    }
  }
  if (!Array.isArray(list)) fail(`Provide flights as int[][] (got ${typeof list})`)
  if (list.length > VISUAL_BOUNDS.flightsMax) {
    fail(`Flight visual limited to 0..${VISUAL_BOUNDS.flightsMax} flights (got ${list.length})`)
  }
  const seen = new Set()
  return list.map((f, i) => {
    if (!Array.isArray(f) || f.length !== 3) fail(`flights[${i}] must be [from,to,price] (got ${JSON.stringify(f)})`)
    let [u, v, w] = f
    for (const [nm, x] of [['from', u], ['to', v]]) {
      if (typeof x === 'string' && /^-?\d+$/.test(x.trim())) x = parseInt(x.trim(), 10)
      if (!Number.isInteger(x) || x < 0 || x >= n) fail(`flights[${i}].${nm} out of range 0..${n - 1} (got ${JSON.stringify(f[i])})`)
      if (nm === 'from') u = x
      else v = x
    }
    if (typeof w === 'string' && /^-?\d+$/.test(w.trim())) w = parseInt(w.trim(), 10)
    if (!Number.isInteger(w) || w < 1 || w > 10000) fail(`flights[${i}].price must be 1..10000 (got ${JSON.stringify(f[2])})`)
    if (u === v) fail(`flights[${i}] is a self-loop ${u}->${v}; official inputs have from != to`)
    const key = u + '->' + v
    if (seen.has(key)) fail(`duplicate flight ${key}; official inputs have no multiple flights between two cities`)
    seen.add(key)
    return [u, v, w]
  })
}

const cheapestFlightsJava = code(`
[def] class Solution {
[def]     public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
[init]         int[] dist = new int[n];
[init]         java.util.Arrays.fill(dist, Integer.MAX_VALUE);
[init]         dist[src] = 0;
[round]         for (int i = 0; i <= k; i++) {
[round]             int[] next = dist.clone();
[relax]             for (int[] f : flights) {
[relax]                 int u = f[0], v = f[1], w = f[2];
[relax]                 if (dist[u] == Integer.MAX_VALUE) continue;
[relax]                 if (dist[u] + w < next[v]) next[v] = dist[u] + w;
[def]             }
[commit]             dist = next;
[def]         }
[verdict]         return dist[dst] == Integer.MAX_VALUE ? -1 : dist[dst];
[def]     }
[def] }
`)

const cheapestFlightsCpp = code(`
[def] class Solution {
[def] public:
[def]     int findCheapestPrice(int n, vector<vector<int>>& flights, int src, int dst, int k) {
[init]         const int INF = 1e9;
[init]         vector<int> dist(n, INF);
[init]         dist[src] = 0;
[round]         for (int i = 0; i <= k; i++) {
[round]             vector<int> next = dist;
[relax]             for (auto& f : flights) {
[relax]                 int u = f[0], v = f[1], w = f[2];
[relax]                 if (dist[u] == INF) continue;
[relax]                 if (dist[u] + w < next[v]) next[v] = dist[u] + w;
[def]             }
[commit]             dist = next;
[def]         }
[verdict]         return dist[dst] == INF ? -1 : dist[dst];
[def] }
[def] };
`)

const cheapestFlightsPseudo = code(`
[def] findCheapestPrice(n, flights, src, dst, k):
[init]   dist = [INF] * n; dist[src] = 0
[round]   repeat k + 1 times:
[round]     next = copy(dist)
[relax]     for [u, v, w] in flights:
[relax]       if dist[u] == INF: continue
[relax]       if dist[u] + w < next[v]: next[v] = dist[u] + w
[commit]     dist = next
[verdict]   return -1 if dist[dst] == INF else dist[dst]
`)

const cheapestFlightsExplain = {
  def: 'Declares the solution scope; no price state lives on wrapper or signature lines.',
  init: 'Seeds every city unreachable (INF) except src at 0: zero edges bought so far, only src is reachable.',
  round: 'Opens one buying round: next starts as a copy of dist so this round can add at most one more edge per route.',
  relax: 'Tests one flight against the FROZEN round snapshot: an unreachable seller is skipped, otherwise the buyer keeps the cheaper of its old price and seller price plus fare.',
  commit: 'Adopts the round snapshot: every improvement found this round becomes visible to the next round at once.',
  verdict: 'Maps a lingering INF at dst to the defined answer -1; otherwise the cheapest price within budget is final.',
}

const cheapestFlightsExplainLines = {
  java: {
    0: 'Container scope for the solution; no price state lives here.',
    1: 'Entry point: receives city count, flight list, src, dst and the stop budget k.',
    2: 'Table scope: dist[city] will hold the cheapest known price using the edges allowed so far.',
    3: 'Base fill: every city starts unreachable (INF); only src becomes reachable below.',
    4: 'Base write: src costs 0 with zero edges; every route starts here.',
    5: 'Round scope: runs k+1 rounds so routes may use up to k+1 edges, i.e. at most k stops.',
    6: 'Snapshot: next copies dist so relaxations this round read frozen prices and add at most one edge.',
    7: 'Flight scope: examines each directed flight once per round in input order.',
    8: 'Read: names the seller u, the buyer v and the fare w for this flight.',
    9: 'Guard: a seller unreachable in the snapshot cannot sell this round; skip without touching next.',
    10: 'Write: buyer keeps min(old price, seller snapshot price + fare); only genuine improvements write.',
    11: 'Loop close: no price state changes here.',
    12: 'Commit: adopts the round snapshot; all improvements take effect together for the next round.',
    13: 'Loop close: the next round reads the committed prices.',
    14: 'Verdict: INF at dst means unreachable within budget, so answer -1 instead of the sentinel.',
    15: 'Method close: the returned price is final.',
    16: 'Class close: no executable state here.',
  },
  cpp: {
    0: 'Container scope for the solution; no price state lives here.',
    1: 'Access scope; no algorithm state here.',
    2: 'Entry point: receives city count, flight list, src, dst and the stop budget k.',
    3: 'Sentinel scope: INF = 1e9 exceeds any reachable price, so min() ignores unreachable sellers safely.',
    4: 'Table scope: dist[city] starts INF and will hold cheapest known prices.',
    5: 'Base write: src costs 0 with zero edges; every route starts here.',
    6: 'Round scope: runs k+1 rounds so routes may use up to k+1 edges, i.e. at most k stops.',
    7: 'Snapshot: next copies dist so relaxations this round read frozen prices and add at most one edge.',
    8: 'Flight scope: examines each directed flight once per round in input order.',
    9: 'Read: names the seller u, the buyer v and the fare w for this flight.',
    10: 'Guard: a seller unreachable in the snapshot cannot sell this round; skip without touching next.',
    11: 'Write: buyer keeps min(old price, seller snapshot price + fare); only genuine improvements write.',
    12: 'Loop close: no price state changes here.',
    13: 'Commit: adopts the round snapshot; all improvements take effect together for the next round.',
    14: 'Loop close: the next round reads the committed prices.',
    15: 'Verdict: INF at dst means unreachable within budget, so answer -1 instead of the sentinel.',
    16: 'Method close: the returned price is final.',
    17: 'Class close: no executable state here.',
  },
  pseudo: {
    0: 'Function header: names city count, flights, src, dst and stop budget k.',
    1: 'Base: every city unreachable (INF) except src at 0 with zero edges.',
    2: 'Round scope: k+1 rounds allow up to k+1 edges (at most k stops).',
    3: 'Snapshot: copy dist so this round adds at most one edge per route.',
    4: 'Flight scope: one directed flight examined per step in input order.',
    5: 'Guard: unreachable sellers in the snapshot are skipped.',
    6: 'Write: buyer keeps the cheaper of old price and seller price plus fare.',
    7: 'Commit: adopted snapshot becomes visible to the next round at once.',
    8: 'Verdict: lingering INF at dst maps to -1; otherwise the cheapest budgeted price.',
  },
}

/** Reference implementation in JS (mirrors the Java/C++ above exactly). */
export function findCheapestPrice(n, flights, src, dst, k) {
  const INF = Number.MAX_SAFE_INTEGER
  let dist = new Array(n).fill(INF)
  dist[src] = 0
  for (let i = 0; i <= k; i++) {
    const next = dist.slice()
    for (const f of flights) {
      const u = f[0]
      const v = f[1]
      const w = f[2]
      if (dist[u] === INF) continue
      if (dist[u] + w < next[v]) next[v] = dist[u] + w
    }
    dist = next
  }
  return dist[dst] === INF ? -1 : dist[dst]
}

const fmtDist = (dist) => '[' + dist.map((d) => (d === null ? '∞' : d)).join(',') + ']'

/**
 * buildCheapestFlights(args) — pure, synchronous.
 * args: [n, flights, src, dst, k] (parsed values or judge literal strings).
 * Returns a kind:'graph' scene with weighted directed edges, or throws a
 * clear Error for over-bound/out-of-range input (never truncates).
 */
export function buildCheapestFlights(args) {
  if (!Array.isArray(args) || args.length !== 5) {
    fail(`Cheapest-flights walkthrough needs [n, flights, src, dst, k] (got ${Array.isArray(args) ? args.length + ' entries' : typeof args})`)
  }
  const n = decodeInt(args[0], 'n', VISUAL_BOUNDS.nMin, VISUAL_BOUNDS.nMax)
  const flights = decodeFlights(args[1], n)
  const src = decodeInt(args[2], 'src', 0, n - 1)
  const dst = decodeInt(args[3], 'dst', 0, n - 1)
  if (src === dst) fail(`src (${src}) and dst (${dst}) must differ (official: src != dst)`)
  const k = decodeInt(args[4], 'k', 0, VISUAL_BOUNDS.kMax)

  const INF = null // scene dist uses null for unreachable (never 0, never a number)
  let dist = new Array(n).fill(INF)
  dist[src] = 0
  let parent = {}
  const frames = []
  const anchors = []

  const finiteIds = () => {
    const out = []
    for (let i = 0; i < n; i++) if (dist[i] !== INF) out.push(i)
    return out
  }
  const distMap = () => {
    const out = {}
    for (let i = 0; i < n; i++) if (dist[i] !== INF) out[String(i)] = dist[i]
    return out
  }
  const best = () => (dist[dst] === INF ? null : dist[dst])
  const base = (extra) => ({
    current: null,
    frontier: finiteIds(),
    distances: distMap(),
    dist: dist.slice(),
    snap: null,
    round: null,
    used: null,
    edge: null,
    snapU: null,
    beforeV: null,
    candidate: null,
    relaxed: 0,
    best: best(),
    parent: { ...parent },
    answer: best(),
    vars: { n, src, dst, k, ...extra },
  })
  const push = (step, label, note, state) => {
    frames.push(frame(step, label, note, state))
  }

  push('init', 'Initialize', `n=${n}, ${flights.length} flight(s), src=${src} dst=${dst} k=${k}. dist=${fmtDist(dist)}.`, base({}))
  anchors.push(0)

  let firstImprovementAnchored = false
  for (let r = 0; r <= k; r++) {
    const snap = dist.slice()
    const snapOf = (i) => (snap[i] === INF ? null : snap[i])
    push(
      'round',
      `Round ${r + 1} of ${k + 1}`,
      `Allow ≤${r + 1} edge(s) (≤${r} stop(s)). Snapshot=${fmtDist(snap)}.`,
      { ...base({ round: r, used: r + 1 }), snap: snap.slice(), round: r, used: r + 1 },
    )
    const next = snap.slice()
    const nextParent = { ...parent }
    for (const [u, v, w] of flights) {
      const su = snapOf(u)
      if (su === INF || su === null) {
        push(
          'relax',
          `Flight ${u}→${v} skipped`,
          `${u}→${v} $${w} skipped: dist[${u}]=∞ in snapshot.`,
          {
            ...base({ round: r, used: r + 1, u, v, w }),
            current: v,
            snap: snap.slice(),
            round: r,
            used: r + 1,
            edge: [u, v, w],
            snapU: null,
            beforeV: next[v],
            candidate: null,
            relaxed: 0,
          },
        )
        continue
      }
      const cand = su + w
      const before = next[v]
      const improved = before === INF || cand < before
      if (improved) {
        next[v] = cand
        nextParent[v] = u
      }
      const note = improved
        ? `${u}→${v} $${w}: ${su}+${w}=${cand} < ${before === INF ? '∞' : before}; tmp[${v}]=${cand}.`
        : `${u}→${v} $${w}: ${su}+${w}=${cand} ≥ tmp ${before}; keep.`
      push('relax', improved ? `Flight ${u}→${v} improves` : `Flight ${u}→${v} checked`, note, {
        ...base({ round: r, used: r + 1, u, v, w, candidate: cand }),
        current: v,
        snap: snap.slice(),
        round: r,
        used: r + 1,
        edge: [u, v, w],
        snapU: su,
        beforeV: before,
        candidate: cand,
        relaxed: improved ? 1 : 0,
      })
      if (improved && !firstImprovementAnchored) {
        anchors.push(frames.length - 1)
        firstImprovementAnchored = true
      }
    }
    dist = next
    parent = nextParent
    push('commit', `Commit round ${r + 1}`, `Round ${r + 1} done; dist=${fmtDist(dist)}.`, {
      ...base({ round: r, used: r + 1 }),
      round: r,
      used: r + 1,
    })
    anchors.push(frames.length - 1)
  }

  const ans = findCheapestPrice(n, flights, src, dst, k)
  const recorded = best() === null ? -1 : best()
  if (ans !== recorded) fail(`internal mismatch: reference=${ans} recorded=${recorded}`)
  if (ans === -1) {
    push('verdict', 'Verdict unreachable', `${dst} unreachable within ${k} stop(s); answer -1.`, base({}))
  } else {
    push('verdict', 'Verdict cheapest', `Cheapest ${src}→${dst} with ≤${k} stop(s) is ${ans}.`, base({ found: ans }))
  }
  anchors.push(frames.length - 1)
  push('verdict', 'Done', `Done; answer ${ans}.`, base({}))
  anchors.push(frames.length - 1)

  return {
    kind: 'graph',
    problemSlug: 'cheapest-flights-within-k-stops',
    layout: {
      nodes: Array.from({ length: n }, (_, id) => ({ id, label: String(id) })),
      edges: flights.map((f) => f.slice()),
      directed: true,
    },
    frames,
    result: ans,
    anchors,
  }
}

export const adapters = {
  'cheapest-flights-within-k-stops': {
    signature: { name: 'findCheapestPrice', params: ['int', 'int[][]', 'int', 'int', 'int'], return: 'int' },
    lesson: {
      idea: 'k+1 Bellman-Ford rounds: round r keeps the cheapest price per city using at most r+1 edges; relax every flight against the frozen previous round.',
      trap: 'Relaxing in place (no snapshot) lets one round chain several edges, silently exceeding the stop budget; also Dijkstra ignores stop counts.',
      time: 'O((k+1)*F)',
      space: 'O(n)',
    },
    code: { java: cheapestFlightsJava, cpp: cheapestFlightsCpp, pseudo: cheapestFlightsPseudo },
    build: buildCheapestFlights,
    explain: cheapestFlightsExplain,
    explainLines: cheapestFlightsExplainLines,
  },
}
