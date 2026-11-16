/**
 * time-based-key-value-store — live walkthrough adapter (Binary Search / Design, LeetCode 981).
 *
 * Live record: plugin/data/shard-8.json, id 981, judge NULL (design/class problem —
 * TimeMap has no single-call function signature, and the host judge supports
 * single-call signatures only). This adapter therefore uses an HONEST TEST PROFILE
 * signature (precedent: runTrieOps / mergeKLists test profiles):
 *   runTimeMap(ops: string[], calls: string[][]) -> string[]
 * args[0] = JSON array of op names ("set"/"get", ctor row excluded);
 * args[1] = JSON array of call rows (set row = [key, value, timestamp],
 *           get row = [key, timestamp], every element stringified);
 * result   = JSON array of get results in call order (missing floor yields "").
 * Official example 1 maps to ops ["set","get","get","set","get","get"] with the
 * foo/bar calls below, yielding ["bar","bar","bar2","bar2"] (ctor/null rows stripped).
 * judgeCase stays null: no live judge can run a class harness.
 *
 * Ported from .workers/jobs/question-owners-150/time-based-key-value-store/timemap-adapter.js
 * (frames, verdicts, code listings and explain map unchanged) onto the semantic-core
 * helpers. Walkthrough bounds (honest disclosure): at most 12 ops, 16 stamps/key,
 * strictly increasing set stamps; violations throw instead of truncating.
 * Pure, synchronous, dependency-free ES module. No DOM, no network, no randomness.
 * Primary source: https://leetcode.com/problems/time-based-key-value-store/
 */
import { code, frame } from './semantic-core.js';

export const SLUG = 'time-based-key-value-store';

// Honest TEST PROFILE signature (judge is null; documented above, never presented
// as an official LeetCode method profile).
export const SIGNATURE = {
  name: 'runTimeMap',
  params: [{ name: 'ops', type: 'string[]' }, { name: 'calls', type: 'string[][]' }],
  return: 'string[]',
};

export const MAX_OPS = 12;
export const MAX_ENTRIES_PER_KEY = 16;

export function parseStagedArgs(args) {
  if (!Array.isArray(args) || args.length !== 2) {
    throw new Error('Provide [ops, calls] literal strings for this walkthrough');
  }
  let ops;
  let calls;
  try {
    ops = JSON.parse(String(args[0]));
    calls = JSON.parse(String(args[1]));
  } catch {
    throw new Error('ops/calls literals must be JSON arrays of strings');
  }
  if (!Array.isArray(ops) || ops.length === 0) throw new Error('ops must be a non-empty array');
  if (ops.length > MAX_OPS) {
    throw new Error('Visual walkthrough limited to ' + MAX_OPS + ' ops (got ' + ops.length + ')');
  }
  if (!Array.isArray(calls) || calls.length !== ops.length) {
    throw new Error('calls must align 1:1 with ops');
  }
  const normCalls = calls.map((row, i) => {
    if (!Array.isArray(row)) throw new Error('calls[' + i + '] must be an array');
    return row.map(String);
  });
  let lastSet = -Infinity;
  ops.forEach((op, i) => {
    if (op !== 'set' && op !== 'get') throw new Error('ops[' + i + '] must be "set" or "get"');
    const row = normCalls[i];
    if (op === 'set') {
      if (row.length !== 3) throw new Error('set row ' + i + ' needs [key, value, timestamp]');
      const t = Number(row[2]);
      if (!Number.isSafeInteger(t) || t < 1) throw new Error('calls[' + i + '][2] must be an integer >= 1');
      if (!(t > lastSet)) throw new Error('set timestamps must be strictly increasing (row ' + i + ')');
      lastSet = t;
    } else if (row.length !== 2) {
      throw new Error('get row ' + i + ' needs [key, timestamp]');
    } else {
      const t = Number(row[1]);
      if (!Number.isSafeInteger(t) || t < 1) throw new Error('calls[' + i + '][1] must be an integer >= 1');
    }
  });
  return { ops: ops.slice(), calls: normCalls };
}

/** Independent oracle: per-key append + linear floor scan (no binary search). */
export function floorLinear(ops, calls) {
  const store = new Map();
  const out = [];
  for (let i = 0; i < ops.length; i += 1) {
    const row = calls[i];
    if (ops[i] === 'set') {
      const key = row[0];
      if (!store.has(key)) store.set(key, { ts: [], vs: [] });
      store.get(key).ts.push(Number(row[2]));
      store.get(key).vs.push(row[1]);
    } else {
      const entry = store.get(row[0]);
      const q = Number(row[1]);
      let best = '';
      if (entry) {
        for (let k = 0; k < entry.ts.length; k += 1) {
          if (entry.ts[k] <= q) best = entry.vs[k];
          else break;
        }
      }
      out.push(best);
    }
  }
  return out;
}

/** Reference implementation: per-key append + binary-search floor (mirrors Java/C++). */
export function floorBinary(ops, calls) {
  const store = new Map();
  const out = [];
  for (let i = 0; i < ops.length; i += 1) {
    const row = calls[i];
    if (ops[i] === 'set') {
      const key = row[0];
      if (!store.has(key)) store.set(key, { ts: [], vs: [] });
      const entry = store.get(key);
      if (entry.ts.length >= MAX_ENTRIES_PER_KEY) {
        throw new Error('key "' + key + '" exceeds ' + MAX_ENTRIES_PER_KEY + ' stored stamps');
      }
      entry.ts.push(Number(row[2]));
      entry.vs.push(row[1]);
    } else {
      const entry = store.get(row[0]);
      const q = Number(row[1]);
      if (!entry || entry.ts.length === 0 || q < entry.ts[0]) {
        out.push('');
        continue;
      }
      let lo = 0;
      let hi = entry.ts.length - 1;
      let ans = -1;
      while (lo <= hi) {
        const mid = lo + ((hi - lo) >> 1);
        if (entry.ts[mid] <= q) {
          ans = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      out.push(ans === -1 ? '' : entry.vs[ans]);
    }
  }
  return out;
}

const javaLines = code(`
[def] class TimeMap {
[def]     private final java.util.Map<String, java.util.List<String>> vals = new java.util.HashMap<>();
[def]     private final java.util.Map<String, java.util.List<Integer>> times = new java.util.HashMap<>();
[def]     public TimeMap() {
[init]         // maps start empty; per-key lists grow in timestamp order
[def]     }
[def]     public void set(String key, String value, int timestamp) {
[store]         vals.computeIfAbsent(key, k -> new java.util.ArrayList<>()).add(value);
[store]         times.computeIfAbsent(key, k -> new java.util.ArrayList<>()).add(timestamp);
[def]     }
[def]     public String get(String key, int timestamp) {
[init]         java.util.List<Integer> ts = times.get(key);
[init]         java.util.List<String> vs = vals.get(key);
[miss]         if (ts == null || ts.isEmpty() || timestamp < ts.get(0)) return "";
[probe]         int lo = 0;
[probe]         int hi = ts.size() - 1;
[probe]         int ans = -1;
[probe]         while (lo <= hi) {
[probe]             int mid = lo + (hi - lo) / 2;
[keep]             if (ts.get(mid) <= timestamp) { ans = mid; lo = mid + 1; }
[drop]             else { hi = mid - 1; }
[def]         }
[return]         return ans == -1 ? "" : vs.get(ans);
[def]     }
[def] }
`);

const cppLines = code(`
[def] class TimeMap {
[def] public:
[def]     TimeMap() {}
[def]     void set(string key, string value, int timestamp) {
[store]         vals[key].push_back(value);
[store]         times[key].push_back(timestamp);
[def]     }
[def]     string get(string key, int timestamp) {
[init]         auto it = times.find(key);
[miss]         if (it == times.end() || it->second.empty() || timestamp < it->second[0]) return "";
[init]         const vector<int>& ts = it->second;
[init]         const vector<string>& vs = vals[key];
[probe]         int lo = 0;
[probe]         int hi = (int)ts.size() - 1;
[probe]         int ans = -1;
[probe]         while (lo <= hi) {
[probe]             int mid = lo + (hi - lo) / 2;
[keep]             if (ts[mid] <= timestamp) { ans = mid; lo = mid + 1; }
[drop]             else { hi = mid - 1; }
[def]         }
[return]         return ans == -1 ? "" : vs[ans];
[def]     }
[def] private:
[def]     unordered_map<string, vector<string>> vals;
[def]     unordered_map<string, vector<int>> times;
[def] };
`);

const pseudoLines = code(`
[def] TimeMap():
[init]   vals = {}; times = {}
[def] set(key, value, timestamp):
[store]   vals[key].append(value); times[key].append(timestamp)
[def] get(key, timestamp):
[init]   ts = times.get(key, []); vs = vals.get(key, [])
[miss]   if ts is empty or timestamp < ts[0]: return ""
[probe]   lo = 0; hi = len(ts) - 1; ans = -1
[probe]   while lo <= hi:
[probe]     mid = lo + (hi - lo) // 2
[keep]     if ts[mid] <= timestamp: ans = mid; lo = mid + 1
[drop]     else: hi = mid - 1
[return]   return "" if ans == -1 else vs[ans]
`);

const EXPLAIN = {
  def: 'Structural wrapper: opens or closes a scope and performs no algorithm operation.',
  init: 'Locate the key history lists; the floor search runs on that key ordered stamps.',
  store: 'Append value and stamp to the key lists; rising stamps keep each list sorted.',
  probe: 'Probe the midpoint of live [lo..hi]; each probe reads one stored stamp.',
  keep: 'Stamp is not after the query, so it is a valid floor; bank it, search right.',
  drop: 'Stamp is after the query, so it and everything right of it are too new.',
  return: 'Emit the value at the rightmost stamp not after the query, else empty.',
  miss: 'Fast reject: unknown key, empty history, or query older than first stamp.',
};

const EXPLAIN_LINES = {
  java: {
    0: 'Class wrapper holding the TimeMap; creates no storage by itself.',
    1: 'Values map: key to its value list in stamp order; empty at start.',
    2: 'Stamps map: key to its stamp list; parallel to the value list.',
    3: 'Constructor header: builds an empty TimeMap; no entries yet.',
    4: 'Both maps start empty; every per-key list is created lazily on set.',
    5: 'Closes the constructor scope; no algorithm operation runs here.',
    6: 'Set header: takes key, value, stamp; appends to both key lists.',
    7: 'Appends the value to this key value list; index matches the stamp.',
    8: 'Appends the stamp to this key stamp list; rising stamps keep order.',
    9: 'Closes the set scope; the write is fully recorded above.',
    10: 'Get header: takes key and query stamp; returns the floor value or empty.',
    11: 'Fetches the key stamp list; null when the key was never stored.',
    12: 'Fetches the parallel value list; shares every index with stamps.',
    13: 'Rejects unknown keys, empty history, and queries older than first stamp.',
    14: 'Low edge of the live window starts at the first stored stamp.',
    15: 'High edge starts at the last stored stamp of this key.',
    16: 'Best floor index so far; -1 means no valid stamp banked yet.',
    17: 'Loop while the live window is non-empty; each pass shrinks it.',
    18: 'Midpoint of [lo..hi] with overflow-safe arithmetic; the probe index.',
    19: 'Stamp not after query: bank mid as floor and search right for later one.',
    20: 'Stamp after query: discard mid and everything right of it.',
    21: 'Closes the loop scope; lo and hi bracket the remaining candidates.',
    22: 'Returns the banked floor value, or empty when none was banked.',
    23: 'Closes the get scope; the answer was emitted above.',
    24: 'Closes the class scope; no algorithm operation runs here.',
  },
  cpp: {
    0: 'Class wrapper holding the TimeMap; creates no storage by itself.',
    1: 'Access label: the LeetCode harness calls set and get publicly.',
    2: 'Default constructor: both maps start empty; no entries yet.',
    3: 'Set header: takes key, value, stamp; appends to both key lists.',
    4: 'Appends the value to this key value list; index matches the stamp.',
    5: 'Appends the stamp to this key stamp list; rising stamps keep order.',
    6: 'Closes the set scope; the write is fully recorded above.',
    7: 'Get header: takes key and query stamp; returns floor value or empty.',
    8: 'Finds the key stamp entry; end means the key was never stored.',
    9: 'Rejects unknown keys, empty history, and queries older than first stamp.',
    10: 'Binds the key stamp list; binary search runs on these stamps.',
    11: 'Binds the parallel value list; shares every index with stamps.',
    12: 'Low edge of the live window starts at the first stored stamp.',
    13: 'High edge starts at the last stored stamp; cast keeps math signed.',
    14: 'Best floor index so far; -1 means no valid stamp banked yet.',
    15: 'Loop while the live window is non-empty; each pass shrinks it.',
    16: 'Midpoint of [lo..hi] with overflow-safe arithmetic; the probe index.',
    17: 'Stamp not after query: bank mid as floor and search right for later one.',
    18: 'Stamp after query: discard mid and everything right of it.',
    19: 'Closes the loop scope; lo and hi bracket the remaining candidates.',
    20: 'Returns the banked floor value, or empty when nothing was banked.',
    21: 'Closes the get scope; the answer was emitted above.',
    22: 'Private label: the two maps are implementation detail below.',
    23: 'Values map: key to its value list in stamp order; empty at start.',
    24: 'Stamps map: key to its stamp list; parallel to the value list.',
    25: 'Closes the class scope; no algorithm operation runs here.',
  },
  pseudo: {
    0: 'Constructor header: creates an empty two-map TimeMap.',
    1: 'Both maps start empty; per-key lists are created lazily on set.',
    2: 'Set header: appends one value and one stamp to the key lists.',
    3: 'Append keeps both lists parallel; rising stamps keep them sorted.',
    4: 'Get header: returns the floor value for key and query stamp.',
    5: 'Fetch the key history lists; empty lists mean the key is unknown.',
    6: 'Reject unknown keys and queries older than the first stored stamp.',
    7: 'Search window covers the whole history; ans banks the best floor.',
    8: 'Loop while candidates remain; each pass discards at least mid.',
    9: 'Midpoint of the live window; the only stamp read this pass.',
    10: 'Valid floor: bank mid and continue right for a possibly later floor.',
    11: 'Too new: discard mid and everything right of it.',
    12: 'Emit the banked floor value, or empty when nothing was banked.',
  },
};

function build(args) {
  // Tolerate both raw judge-style literal strings and already-parsed arrays.
  const lit = (v) => (typeof v === 'string' ? v : JSON.stringify(v));
  if (!Array.isArray(args) || args.length !== 2) {
    throw new Error('time-based-key-value-store walkthrough needs args [ops, calls]');
  }
  const { ops, calls } = parseStagedArgs([lit(args[0]), lit(args[1])]);
  const store = new Map();
  const frames = [];
  const anchors = [];
  const results = [];
  const hist = (key) => {
    const e = store.get(key);
    return e ? { ts: e.ts.slice(), vs: e.vs.slice() } : { ts: [], vs: [] };
  };
  const push = (step, label, note, state) => frames.push(frame(step, label, note, state));

  push('init', 'Create empty store', 'TimeMap(); no keys stored; ' + ops.length + ' ops replayed', {
    store: {},
    opIndex: -1,
  });

  for (let i = 0; i < ops.length; i += 1) {
    const row = calls[i];
    if (ops[i] === 'set') {
      const [key, value, tRaw] = row;
      const t = Number(tRaw);
      if (!store.has(key)) store.set(key, { ts: [], vs: [] });
      store.get(key).ts.push(t);
      store.get(key).vs.push(value);
      const h = hist(key);
      anchors.push(frames.length);
      push('store', 'Store ' + key + ' @' + t, 'set ' + key + '=' + value + ' @' + t + '; ' + key + ' stamps [' + h.ts.join(',') + ']', {
        store: Object.fromEntries([...store.entries()].map(([k, e]) => [k, { ts: e.ts.slice(), vs: e.vs.slice() }])),
        opIndex: i,
        op: 'set',
        key,
        value,
        t,
        stamps: h.ts,
        n: h.ts.length,
      });
    } else {
      const [key, qRaw] = row;
      const q = Number(qRaw);
      const h = hist(key);
      push('init', 'Query ' + key + ' @' + q, 'get ' + key + ' @' + q + '; history [' + (h.ts.join(',') || 'empty') + ']', {
        opIndex: i,
        op: 'get',
        key,
        q,
        stamps: h.ts,
        values: h.vs,
        n: h.ts.length,
        pointers: h.ts.length ? { lo: 0, hi: h.ts.length - 1 } : {},
      });
      if (!h.ts.length || q < h.ts[0]) {
        anchors.push(frames.length);
        results.push('');
        push('miss', 'No floor stamp', 'no stamp <= ' + q + ' for ' + key + '; return ""', {
          opIndex: i,
          op: 'get',
          key,
          q,
          stamps: h.ts,
          result: '',
        });
        continue;
      }
      let lo = 0;
      let hi = h.ts.length - 1;
      let ans = -1;
      while (lo <= hi) {
        const curLo = lo;
        const curHi = hi;
        const mid = lo + ((hi - lo) >> 1);
        const midVal = h.ts[mid];
        push('probe', 'Probe stamp ' + mid, 'mid=' + mid + ' stamp=' + midVal + ' in [' + curLo + ',' + curHi + '] vs query ' + q, {
          opIndex: i,
          op: 'get',
          key,
          q,
          stamps: h.ts,
          values: h.vs,
          lo,
          hi,
          mid,
          midVal,
          n: h.ts.length,
          vars: { lo, hi, mid, q },
          pointers: { lo, hi, mid },
          highlights: { [mid]: 'accent' },
        });
        if (midVal <= q) {
          ans = mid;
          lo = mid + 1;
          anchors.push(frames.length);
          push('keep', 'Bank floor @' + mid, 'stamp ' + midVal + '<=' + q + '; ans=' + ans + ' keep [' + lo + ',' + curHi + ']', {
            opIndex: i,
            op: 'get',
            key,
            q,
            stamps: h.ts,
            values: h.vs,
            lo,
            hi,
            mid,
            ans,
            n: h.ts.length,
            vars: { lo, hi, mid, ans, q },
            pointers: { lo, hi },
            highlights: { [ans]: 'ok' },
          });
        } else {
          hi = mid - 1;
          anchors.push(frames.length);
          push('drop', 'Discard too-new @' + mid, 'stamp ' + midVal + '>' + q + '; keep [' + curLo + ',' + hi + ']', {
            opIndex: i,
            op: 'get',
            key,
            q,
            stamps: h.ts,
            values: h.vs,
            lo,
            hi,
            mid,
            ans,
            n: h.ts.length,
            vars: { lo, hi, mid, ans, q },
            pointers: { lo, hi },
          });
        }
      }
      const value = h.vs[ans];
      anchors.push(frames.length);
      results.push(value);
      push('return', 'Return floor value', 'floor stamp ' + h.ts[ans] + ' -> "' + value + '"; return "' + value + '"', {
        opIndex: i,
        op: 'get',
        key,
        q,
        stamps: h.ts,
        values: h.vs,
        ans,
        result: value,
        n: h.ts.length,
        pointers: { ans },
        highlights: { [ans]: 'ok' },
      });
    }
  }

  // Verify the recorded walkthrough against the reference implementation.
  const check = floorBinary(ops, calls);
  if (JSON.stringify(check) !== JSON.stringify(results)) {
    throw new Error('walkthrough diverged from reference implementation');
  }

  const primaryKey = [...store.keys()].pop() || 'key';
  const layoutValues = (store.get(primaryKey)?.ts || []).slice();
  return {
    kind: 'array',
    layout: { values: layoutValues },
    frames,
    result: results,
    anchors,
  };
}

/** Official example 1 as staged literals (ctor row removed; documented mapping). */
export function datasetExampleArgs() {
  return [
    JSON.stringify(['set', 'get', 'get', 'set', 'get', 'get']),
    JSON.stringify([
      ['foo', 'bar', '1'],
      ['foo', '1'],
      ['foo', '3'],
      ['foo', 'bar2', '4'],
      ['foo', '4'],
      ['foo', '5'],
    ]),
  ];
}

export const DATASET_EXPECTED = ['bar', 'bar', 'bar2', 'bar2'];

export const adapters = {
  'time-based-key-value-store': {
    signature: { name: 'runTimeMap', params: ['string[]', 'string[][]'], return: 'string[]' },
    lesson: {
      idea: 'Hash each key to its stamp-ordered history; get binary-searches the floor stamp.',
      trap: 'Taking the first stamp <= query instead of the rightmost; linear scan per get.',
      time: 'set O(1), get O(log m)',
      space: 'O(n)',
    },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    code: { java: javaLines, cpp: cppLines, pseudo: pseudoLines },
    build,
  },
};

export default adapters['time-based-key-value-store'];
