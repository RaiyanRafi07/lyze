/**
 * detect-squares — portable per-slug semantic adapter (question-owners-150).
 *
 * Walkthrough for https://leetcode.com/problems/detect-squares/ built from a
 * REAL replay of the op transcript through the frequency-map reference: every
 * frame records the live "x,y" -> multiplicity map, the query corner, the
 * diagonal scan (kept diagonals with their product), and the running counts.
 * No invented values; totals recompute by the same product the reference runs.
 *
 * Honest TEST PROFILE (live shard record plugin/data/shard-10.json id 2013
 * carries judge:null — a design/class problem with no single-call signature,
 * count() answers depend on accumulated state), so this adapter documents:
 *   runDetectSquaresOps(ops, points) -> string
 * where ops is the op-name array (ops[0] "DetectSquares", then "add"/"count"),
 * points is the parallel per-op point array (points[0] [] for the ctor, every
 * other row [x, y]), and the return is the JSON literal of the count() outputs
 * in order (add() returns ignored), e.g. the official transcript returns
 * "[1,0,2]". Precedents: mergeKLists(int[][])->int[],
 * runTrieOps(string[],string[])->string. The adapter signature below uses the
 * semantic type-string form of it; the forge shares the object form.
 *
 * Visual bounds (honest disclosure): at most 12 ops, coordinates 0..40, plane
 * area at most 600 cells (judge allows 0..1000 and 3000 calls); over-bound or
 * malformed transcripts throw a clear error, never truncate.
 *
 * Staged sources (logic mirrors, tags added):
 * .workers/jobs/neetcode150-completion/detect-squares/reference.java
 * .workers/jobs/neetcode150-completion/detect-squares/reference.cpp
 * Per-line notes authored here.
 */
import { code, frame, boundedFrames } from './semantic-core.js'

export const SLUG = 'detect-squares'

// Honest test profile (see header): two JSON-array literals in, one output
// literal out. Params are type strings per the semantic.js adapter contract.
export const SIGNATURE = Object.freeze({
  name: 'runDetectSquaresOps',
  params: Object.freeze([
    { name: 'ops', type: 'string[]' },
    { name: 'points', type: 'int[][]' },
  ]),
  return: 'string',
})

const SIGNATURE_TYPES = ['string[]', 'int[][]']

// Visual bounds (judge allows far larger inputs).
const MAX_OPS = 12
const MAXC = 40
const MAXA = 600

const squaresJava = code(`
[def] import java.util.HashMap;
[def] import java.util.Map;
[def] class DetectSquares {
[init]     private final Map<String, Integer> freq;
[init]     public DetectSquares() {
[init]         freq = new HashMap<>();
[init]     }
[add]     public void add(int[] point) {
[add]         String key = point[0] + "," + point[1];
[add]         freq.put(key, freq.getOrDefault(key, 0) + 1);
[add]     }
[count]     private int get(int x, int y) {
[count]         return freq.getOrDefault(x + "," + y, 0);
[count]     }
[count]     public int count(int[] point) {
[count]         int x = point[0];
[count]         int y = point[1];
[count]         int ans = 0;
[count]         for (Map.Entry<String, Integer> e : freq.entrySet()) {
[count]             String[] parts = e.getKey().split(",");
[count]             int px = Integer.parseInt(parts[0]);
[count]             int py = Integer.parseInt(parts[1]);
[count]             int dx = Math.abs(px - x);
[count]             int dy = Math.abs(py - y);
[count]             if (dx == 0 || dx != dy) continue;
[count]             ans += e.getValue() * get(x, py) * get(px, y);
[count]         }
[done]         return ans;
[count]     }
[def] }
`)

const squaresCpp = code(`
[def] #include <string>
[def] #include <unordered_map>
[def] #include <vector>
[def] using namespace std;
[def] class DetectSquares {
[def] public:
[init]     DetectSquares() {
[init]     }
[add]     void add(vector<int> point) {
[add]         string key = to_string(point[0]) + "," + to_string(point[1]);
[add]         freq[key]++;
[add]     }
[count]     int count(vector<int> point) {
[count]         int x = point[0];
[count]         int y = point[1];
[count]         int ans = 0;
[count]         for (const auto& e : freq) {
[count]             size_t sep = e.first.find(',');
[count]             int px = stoi(e.first.substr(0, sep));
[count]             int py = stoi(e.first.substr(sep + 1));
[count]             int dx = abs(px - x);
[count]             int dy = abs(py - y);
[count]             if (dx == 0 || dx != dy) continue;
[count]             ans += e.second * get(x, py) * get(px, y);
[count]         }
[done]         return ans;
[count]     }
[def] private:
[count]     unordered_map<string, int> freq;
[count]     int get(int x, int y) {
[count]         auto it = freq.find(to_string(x) + "," + to_string(y));
[count]         return it == freq.end() ? 0 : it->second;
[count]     }
[def] };
`)

const squaresPseudo = code(`
[def] DetectSquares holds one map:
[init]     freq <- empty map "x,y" -> copies
[init]     constructor(): freq <- empty; no points stored
[add]     add(point): one O(1) hash write
[add]         key <- str(point[0]) + "," + str(point[1])
[add]         freq[key] <- freq.get(key, 0) + 1 (duplicates stack)
[count]     count(point): fix query q = (x, y); scan stored diagonals
[count]         ans <- 0
[count]         for (key, c) in freq: decode p = (px, py)
[count]             dx <- |px - x|; dy <- |py - y|
[count]             if dx == 0 or dx != dy: skip (row, column, or non-square)
[count]             ans <- ans + c * freq.get((x, py), 0) * freq.get((px, y), 0)
[done]         return ans; each square has exactly one diagonal opposite q
`)

const EXPLAIN = {
  def: 'Scope of the DetectSquares class and its imports; the replay runs in init/add/count below.',
  init: 'Empty "x,y" frequency map; the constructor stores nothing and every later op reads this map.',
  add: 'One O(1) hash write: canonical comma key, increment the copy count so duplicates multiply.',
  count: 'Diagonal scan: keep stored p with |px-x|==|py-y|>0, add c(p)*c(x,py)*c(px,y), sum over diagonals.',
  done: 'Hand back the count; every square on q has exactly one diagonal opposite q, so the sum is exact.',
}

// Per-line explanations, indexed by 0-based display line (presentation metadata,
// never compiled). The code blocks above mirror the staged references, so indices
// apply to those files as well.
const EXPLAIN_LINES = {
  java: {
    0: 'Hash map for the O(1) average point-frequency lookup.',
    1: 'Interface type for the freq field.',
    2: 'Sourced class name the judge instantiates.',
    3: 'Whole state: "x,y" multiplicity map.',
    4: 'Sourced constructor signature.',
    5: 'Empty multiset; every live point is reachable here.',
    6: 'Close the constructor body.',
    7: 'Sourced recorder signature.',
    8: 'Canonical key; the comma keeps (1,23) distinct from (12,3).',
    9: 'Multiplicity increment; duplicates stack instead of overwriting.',
    10: 'Close add.',
    11: 'Frequency read helper with zero default.',
    12: 'Missing corner reads as 0, which zeroes that diagonal product.',
    13: 'Close the read helper.',
    14: 'Sourced query signature.',
    15: 'Query corner x; every square found uses it.',
    16: 'Query corner y.',
    17: 'Running total over diagonal candidates.',
    18: 'One pass over DISTINCT stored points.',
    19: 'Decode the candidate diagonal corner back to coordinates.',
    20: 'Candidate diagonal x.',
    21: 'Candidate diagonal y.',
    22: 'Gap between query and candidate on x.',
    23: 'Gap between query and candidate on y.',
    24: 'Diagonal test: equal NONZERO gaps; rows, columns, slopes all skipped.',
    25: 'Product rule: each copy-combination of diagonal plus forced corners is one square.',
    26: 'Close the scan loop.',
    27: 'Exact sum: one diagonal representative per square.',
    28: 'Close count.',
    29: 'End of the class.',
  },
  cpp: {
    0: 'to_string/stoi/find for the "x,y" key codec.',
    1: 'Hash map for the O(1) average frequency lookup.',
    2: 'Sourced vector<int> point type.',
    3: 'Matches the shard snippet style; keeps lines short.',
    4: 'Sourced class name the judge instantiates.',
    5: 'Public methods below are callable by the harness.',
    6: 'Sourced constructor; nothing to initialize beyond the empty map.',
    7: 'Close the constructor body.',
    8: 'Sourced recorder signature.',
    9: 'Same canonical key as Java.',
    10: 'Default-insert then increment: the one place insertion-on-miss is intended.',
    11: 'Close add.',
    12: 'Sourced query signature.',
    13: 'Query corner x.',
    14: 'Query corner y.',
    15: 'Running total over diagonal candidates.',
    16: 'One pass over DISTINCT stored points.',
    17: 'Locate the comma without splitting (no split in std).',
    18: 'Decode candidate diagonal x.',
    19: 'Decode candidate diagonal y.',
    20: 'Gap between query and candidate on x.',
    21: 'Gap between query and candidate on y.',
    22: 'Identical diagonal test to Java.',
    23: 'Identical product rule; e.second is the stored multiplicity.',
    24: 'Close the scan loop.',
    25: 'Exact sum: one diagonal representative per square.',
    26: 'Close count.',
    27: 'Private section: state below is internal detail.',
    28: 'Private state; the judge uses only the public constructor/add/count.',
    29: 'Read helper header.',
    30: 'Lookup WITHOUT default-inserting, so a count never grows the map.',
    31: 'Missing corner reads as 0.',
    32: 'Close the read helper.',
    33: 'End of the class definition.',
  },
  pseudo: {
    0: 'State header: the single structure every op reads or writes.',
    1: 'Frequency map: canonical "x,y" key to copy count.',
    2: 'Constructor: empty map; no points exist yet.',
    3: 'add header: append-only hash write, O(1).',
    4: 'Build the canonical key with a comma separator.',
    5: 'Increment the multiplicity; duplicates are distinct squares later.',
    6: 'count header: fix the query corner, scan for diagonal opposites.',
    7: 'Running total over diagonal candidates.',
    8: 'Loop over DISTINCT stored points with their copy counts.',
    9: 'Gaps between the query and this candidate.',
    10: 'Diagonal test: equal nonzero gaps; everything else is skipped.',
    11: 'Product rule: copies of the diagonal times copies of both forced corners.',
    12: 'Return the exact sum; each square is counted once via its diagonal.',
  },
}

function asArray(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    } catch { /* fall through to null */ }
  }
  return null
}

function decodeOps(raw) {
  const value = asArray(raw)
  if (!value) throw new Error('Provide ops as a JSON array literal, e.g. ["DetectSquares","add","count"]')
  return value.map(String)
}

function decodePoints(raw) {
  const value = asArray(raw)
  if (!value) throw new Error('Provide points as a JSON array of rows, e.g. [[],[3,10],[11,10]]')
  return value.map((row, i) => {
    if (!Array.isArray(row)) throw new Error('points[' + i + '] must be an array')
    return row.slice()
  })
}

function isInt(v) {
  return typeof v === 'number' && Number.isSafeInteger(v)
}

// Every frame below is a REAL replay event: one init, one frame per op
// (constructor folds into init), one done. Count frames carry the genuine
// diagonal scan (kept diagonals with their product and the summed total).
// No future ops are revealed early.
function build(args) {
  const ops = decodeOps(args[0])
  const points = decodePoints(args[1])
  if (ops.length !== points.length) throw new Error('ops and points must be parallel arrays of the same length')
  if (ops.length < 2 || ops.length > MAX_OPS) {
    throw new Error('Visual walkthrough covers 2..' + MAX_OPS + ' ops (' + ops.length + ' given); longer transcripts are rejected, never truncated')
  }
  if (ops[0] !== 'DetectSquares' || points[0].length !== 0) {
    throw new Error('The transcript must start with the constructor: ops[0] "DetectSquares" with points[0] []')
  }
  let maxX = 0
  let maxY = 0
  for (let i = 1; i < ops.length; i++) {
    const op = ops[i]
    const p = points[i]
    if (op !== 'add' && op !== 'count') throw new Error('Unknown op "' + op + '" (slot ' + i + '); expected add/count')
    if (!Array.isArray(p) || p.length !== 2 || !isInt(p[0]) || !isInt(p[1])) {
      throw new Error('points[' + i + '] must be [x, y] integer pair for ' + op)
    }
    if (p[0] < 0 || p[1] < 0 || p[0] > MAXC || p[1] > MAXC) {
      throw new Error('Visual walkthrough covers coordinates 0..' + MAXC + ' (slot ' + i + ' has [' + p + '])')
    }
    if (p[0] > maxX) maxX = p[0]
    if (p[1] > maxY) maxY = p[1]
  }
  if ((maxX + 1) * (maxY + 1) > MAXA) {
    throw new Error('Visual walkthrough covers planes of at most ' + MAXA + ' cells; shrink the coordinates')
  }

  const freq = new Map()
  const keyOf = (x, y) => x + ',' + y
  const get = (x, y) => freq.get(keyOf(x, y)) || 0
  const snap = () => {
    const out = {}
    for (const [k, c] of freq) out[k] = c
    return out
  }
  const listed = () => [...freq.entries()]
    .map(([k, c]) => {
      const sep = k.indexOf(',')
      return { x: Number(k.slice(0, sep)), y: Number(k.slice(sep + 1)), count: c }
    })
    .sort((a, b) => a.x - b.x || a.y - b.y)

  const frames = []
  const counts = []

  // Renderer contract (problem-visuals/detect-squares.js): labels must start with
  // init/add/count/done, and frame state must carry filled/current/path/answer/vars.
  // Coordinates are [r, c] = [y, x]. Existing fields are kept; these are additive.
  const asFilled = () => listed().map((p) => [p.y, p.x])
  const asMult = () => JSON.stringify(snap())

  frames.push(frame('init', 'init: new DetectSquares',
    'Empty map; ' + (ops.length - 1) + ' op(s) follow (adds, then counts).',
    { points: [], freq: {}, op: 'init', distinct: 0,
      filled: [], current: null, path: [], answer: [],
      vars: { distinct: 0, mult: '{}', query: null, diagonals: [], total: 0 } }))

  for (let i = 1; i < ops.length; i++) {
    const op = ops[i]
    const [x, y] = points[i]
    if (op === 'add') {
      freq.set(keyOf(x, y), get(x, y) + 1)
      const n = get(x, y)
      frames.push(frame('add', 'add(' + x + ', ' + y + ') x' + n,
        'Stored (' + x + ', ' + y + '); now ' + n + ' ' + (n === 1 ? 'copy' : 'copies') + '; ' + freq.size + ' distinct.',
        { points: listed(), freq: snap(), op: 'add', last: [x, y], distinct: freq.size,
          filled: listed().map((p) => [p.y, p.x]), current: [y, x], path: [],
          answer: counts.slice(),
          vars: { distinct: freq.size, mult: JSON.stringify(snap()), query: null, diagonals: [], total: null } }))
    } else {
      let total = 0
      const diagonals = []
      for (const [k, c] of freq) {
        const sep = k.indexOf(',')
        const px = Number(k.slice(0, sep))
        const py = Number(k.slice(sep + 1))
        const dx = Math.abs(px - x)
        const dy = Math.abs(py - y)
        if (dx === 0 || dx !== dy) continue
        const plus = c * get(x, py) * get(px, y)
        diagonals.push({ px, py, c, plus })
        total += plus
      }
      diagonals.sort((a, b) => a.px - b.px || a.py - b.py)
      counts.push(total)
      const detail = diagonals.length === 0
        ? freq.size + ' stored, none diagonal; total ' + total + '.'
        : freq.size + ' stored, ' + diagonals.length + ' diagonal(s): ' +
          diagonals.slice(0, 2).map((d) => '(' + d.px + ',' + d.py + ')+' + d.plus).join(' ') +
          (diagonals.length > 2 ? ' +' + (diagonals.length - 2) + ' more' : '') + '; total ' + total + '.'
      frames.push(frame('count', 'count(' + x + ', ' + y + ') -> ' + total,
        ('Query (' + x + ', ' + y + '): ' + detail).slice(0, 140),
        {
          points: listed(), freq: snap(), op: 'count', query: [x, y],
          diagonals: diagonals.map((d) => ({ ...d })), kept: diagonals.length, total,
          answers: counts.slice(),
          filled: listed().map((p) => [p.y, p.x]), current: [y, x], path: [],
          answer: counts.slice(),
          vars: { distinct: freq.size, mult: JSON.stringify(snap()), query: '(' + x + ', ' + y + ')', diagonals: diagonals.map((d) => ({ ...d })), total },
        }))
    }
  }

  frames.push(frame('done', 'done: sequence done',
    ('Count outputs [' + counts.join(', ') + ']; each square counted once.').slice(0, 140),
    { points: listed(), freq: snap(), op: 'done', answers: counts.slice(),
      filled: listed().map((p) => [p.y, p.x]), current: null, path: [],
      answer: counts.slice(),
      vars: { distinct: freq.size, mult: JSON.stringify(snap()), query: null, diagonals: [], total: null } }))

  return {
    kind: 'grid',
    layout: { rows: maxY + 1, cols: maxX + 1 },
    frames,
    result: counts.slice(),
  }
}

export const adapters = {
  'detect-squares': {
    // Honest test profile (live judge is null). Documented at the top of file.
    signature: { name: SIGNATURE.name, params: SIGNATURE_TYPES, return: SIGNATURE.return },
    lesson: {
      idea: 'Fix the query as one corner; each diagonal opposite p forces side corners, so that diagonal gives c(p)*c(x,py)*c(px,y).',
      trap: 'Same-row/column points are never diagonals; count copies not presence; missing corners read as 0 and zero that diagonal.',
      time: 'add O(1) average; count O(D) over D distinct points',
      space: 'O(D) for D distinct points',
    },
    code: { java: squaresJava, cpp: squaresCpp, pseudo: squaresPseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
}
