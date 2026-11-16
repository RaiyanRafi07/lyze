/**
 * meeting-rooms-ii — live semantic adapter (Intervals / two-pointer sweep).
 *
 * Walkthrough algorithm: split meetings into sorted starts[] and ends[],
 * sweep arrivals in order; strictly starts[s] < ends[e] takes a new room
 * (and maybe raises the peak), otherwise the earliest room freed at or
 * before starts[s] is reused. Peak concurrent count is the answer.
 * O(n log n) time, O(n) space.
 *
 * Honest TEST PROFILE (live shard record carries judge:null — LeetCode 253
 * is premium with no official single-call judge in this dataset):
 *   minMeetingRooms(intervals) -> int
 * where intervals is the int[][] literal (each row [start,end]) that
 * transports the NeetCode-equivalent Interval[] input, and the return is
 * the room-count int, e.g. [[0,40],[5,10],[15,20]] -> 2.
 * Precedents: mergeKLists(int[][])->int[], runTrieOps(string[],string[])->string.
 * The adapter signature below uses the semantic type-string form of it.
 *
 * Visual bound (honest disclosure): at most 12 intervals per walkthrough
 * (sourced bound is 100000); over-bound, malformed, or degenerate
 * (start >= end, out of 0..1000000) inputs reject with a clear error,
 * never truncate.
 *
 * Staged sources (logic ported, code blocks reshaped to int[][] test
 * profile with [step] tags added):
 * .workers/jobs/neetcode150-completion/meeting-rooms-ii/builder.mjs
 * .workers/jobs/question-owners-150/meeting-rooms-ii/renderer.js (visual only)
 */
import { code, frame, boundedFrames } from './semantic-core.js'

// boundedFrames is applied by semantic.js (single compaction pass); the import
// keeps this adapter on the shared helper contract. Adapters return FULL lists.

export const SLUG = 'meeting-rooms-ii'

// Honest test profile (see header): one int[][] literal in, one int out.
// Params are type strings per the semantic.js adapter contract.
export const SIGNATURE = {
  name: 'minMeetingRooms',
  params: ['int[][]'],
  return: 'int',
}

// Visual bound (sourced bound is 100000; walkthrough caps here).
const MAX_N = 12
const MAX_COORD = 1000000

const meetingRoomsIiJava = code(`
[def] import java.util.*;
[def] class Solution {
[def]     public int minMeetingRooms(int[][] intervals) {
[init]         if (intervals == null || intervals.length == 0) return 0;
[init]         int n = intervals.length;
[init]         int[] starts = new int[n];
[init]         int[] ends = new int[n];
[scan]         for (int i = 0; i < n; i++) { starts[i] = intervals[i][0]; ends[i] = intervals[i][1]; }
[sort]         Arrays.sort(starts);
[sort]         Arrays.sort(ends);
[init]         int s = 0, e = 0, used = 0, best = 0;
[scan]         while (s < n) {
[check]             if (starts[s] < ends[e]) { used++; if (used > best) best = used; s++; }
[check]             else { used--; e++; }
[scan]         }
[return]         return best;
[def]     }
[def] }
`)

const meetingRoomsIiCpp = code(`
[def] #include <vector>
[def] #include <algorithm>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     int minMeetingRooms(vector<vector<int>>& intervals) {
[init]         if (intervals.empty()) return 0;
[init]         int n = intervals.size();
[init]         vector<int> starts, ends;
[scan]         for (auto &iv : intervals) { starts.push_back(iv[0]); ends.push_back(iv[1]); }
[sort]         sort(starts.begin(), starts.end());
[sort]         sort(ends.begin(), ends.end());
[init]         int s = 0, e = 0, used = 0, best = 0;
[scan]         while (s < n) {
[check]             if (starts[s] < ends[e]) { used++; best = max(best, used); s++; }
[check]             else { used--; e++; }
[scan]         }
[return]         return best;
[def]     }
[def] };
`)

const meetingRoomsIiPseudo = code(`
[def] minMeetingRooms(intervals):
[init]   if intervals is empty: return 0
[init]   n = intervals.length
[scan]   starts = sorted starts; ends = sorted ends
[sort]   sort both ascending
[init]   s, e, used, best = 0, 0, 0, 0
[scan]   while s < n:
[check]     if starts[s] < ends[e]: used += 1; best = max(best, used); s += 1
[check]     else: used -= 1; e += 1
[return]   return best
`)

function checkedIntervals(value) {
  if (!Array.isArray(value)) throw new Error('meeting-rooms-ii needs intervals as [[start,end],...]')
  if (value.length > MAX_N) throw new Error('meeting-rooms-ii walkthrough limited to ' + MAX_N + ' intervals; got ' + value.length)
  return value.map((iv, i) => {
    if (!Array.isArray(iv) || iv.length !== 2) throw new Error('intervals[' + i + '] must be [start,end]')
    const s = iv[0]
    const e = iv[1]
    if (!Number.isSafeInteger(s) || !Number.isSafeInteger(e)) throw new Error('intervals[' + i + '] must hold integers')
    if (!(s >= 0 && s < e && e <= MAX_COORD)) throw new Error('intervals[' + i + '] must satisfy 0 <= start < end <= ' + MAX_COORD)
    return [s, e]
  })
}

export function buildMeetingRoomsIi(args) {
  if (!Array.isArray(args) || args.length !== 1) throw new Error('meeting-rooms-ii expects [intervals]')
  const source = checkedIntervals(args[0])
  const starts = source.map((iv) => iv[0]).sort((a, b) => a - b)
  const ends = source.map((iv) => iv[1]).sort((a, b) => a - b)
  const n = source.length
  const layout = { intervals: source.map((iv) => iv.slice()) }
  const frames = []
  const anchors = []

  const byStart = source.map((iv) => iv.slice()).sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
  const byEnd = source.map((iv) => iv.slice()).sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]))
  const activePairsAt = (t) => source.filter((iv) => iv[0] <= t && t < iv[1]).map((iv) => iv.slice())

  const state = (current, index, vars) => ({
    sorted: source.map((iv) => iv.slice()).sort((a, b) => (a[0] - b[0]) || (a[1] - b[1])),
    merged: activePairsAt(vars.t).slice(0, MAX_N),
    current: current ? current.slice() : null,
    index,
    vars: { n, ...vars },
  })
  const push = (step, label, note, current, index, vars) =>
    frames.push(frame(step, label, note, state(current, index, vars)))

  if (n === 0) {
    push('init', 'No meetings', 'Empty input; 0 rooms needed', null, -1, { t: 0, s: 0, e: 0, used: 0, best: 0 })
    push('return', 'Answer 0', 'Done; no intervals, answer 0', null, -1, { t: 0, s: 0, e: 0, used: 0, best: 0 })
    return { kind: 'intervals', layout, frames, result: 0, anchors }
  }

  push('sort', 'Sort starts and ends', 'Sorted ' + n + ' starts [' + starts.join(',') + '] and ends [' + ends.join(',') + ']', null, -1, { t: starts[0], s: 0, e: 0, used: 0, best: 0 })

  let s = 0
  let e = 0
  let used = 0
  let best = 0
  let k = 0
  while (s < n) {
    const takeNew = starts[s] < ends[e]
    const t = takeNew ? starts[s] : ends[e]
    push('scan', 'Compare #' + k, 'starts[' + s + ']=' + starts[s] + ' vs ends[' + e + ']=' + ends[e] + ' at t=' + t, takeNew ? byStart[s].slice() : byEnd[e].slice(), k, { t, s, e, used, best })
    if (takeNew) {
      used += 1
      if (used > best) best = used
      anchors.push(frames.length)
      push('check', 'Take a new room', starts[s] + '<' + ends[e] + ': used=' + used + ' best=' + best, byStart[s].slice(), k, { t, s: s + 1, e, used, best, take: 1 })
      s += 1
    } else {
      used -= 1
      anchors.push(frames.length)
      push('check', 'Reuse a freed room', starts[s] + '>=' + ends[e] + ': room freed, used=' + used + ' best=' + best, byEnd[e].slice(), k, { t, s, e: e + 1, used, best, take: 0 })
      e += 1
    }
    k += 1
  }

  anchors.push(frames.length)
  push('return', 'Answer ' + best, 'Done; peak overlap ' + best + ', so ' + best + ' room' + (best === 1 ? '' : 's'), null, n - 1, { t: ends[n - 1], s, e, used, best })
  return { kind: 'intervals', layout, frames, result: best, anchors }
}

export const adapters = {
  'meeting-rooms-ii': {
    signature: SIGNATURE,
    lesson: {
      idea: 'Split meetings into sorted starts and ends; sweep arrivals in order, reusing the earliest-freed room whenever it is free.',
      trap: 'Using <= instead of < treats touching meetings as overlapping and overcounts; sorting only by start misses freed rooms.',
      time: 'O(n log n)',
      space: 'O(n)',
    },
    explain: {
      def: 'Scope of the rooms task on the intervals input; no algorithm work happens on these lines.',
      init: 'Guard empty input and split every meeting into parallel starts/ends arrays plus the sweep pointers.',
      sort: 'Order both arrays ascending so ends[e] is the earliest freeing room and starts[s] the next arrival.',
      scan: 'Settle one arrival per iteration against the earliest freeing room; every arrival is judged once.',
      check: 'Strict < takes a new room; otherwise (>=) the earliest room freed at or before this start is reused.',
      return: 'Return the peak concurrent count, which equals the minimum rooms needed.',
    },
    explainLines: {
      java: {
        10: 'Sort: ascending starts so arrivals are settled earliest-first.',
        12: 'Loop: one iteration settles arrival s; only the check below advances e.',
        13: 'Branch: strict < takes a new room and maybe raises the peak, then advances s.',
        14: 'Branch: else (>=) reuses the room freed at ends[e]; frees one and advances e.',
        16: 'Report the peak built by the sweep above.',
      },
      cpp: {
        11: 'Sort: ascending starts so arrivals are settled earliest-first.',
        13: 'Loop: one iteration settles arrival s; only the check below advances e.',
        14: 'Branch: strict < takes a new room and maybe raises the peak, then advances s.',
        15: 'Branch: else (>=) reuses the room freed at ends[e]; frees one and advances e.',
        17: 'Report the peak built by the sweep above.',
      },
      pseudo: {
        7: 'Branch: strict < takes a new room (maybe a new peak); >= would wrongly add one.',
        8: 'Reuse path: frees one room and advances e; only this path moves e.',
      },
    },
    code: { java: meetingRoomsIiJava, cpp: meetingRoomsIiCpp, pseudo: meetingRoomsIiPseudo },
    build: buildMeetingRoomsIi,
  },
}
