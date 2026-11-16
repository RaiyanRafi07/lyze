/**
 * meeting-rooms — portable per-slug semantic adapter (question-owners-150).
 *
 * Walkthrough for https://leetcode.com/problems/meeting-rooms/ built from a
 * REAL sort+sweep run: sort a copy by start, seed prevEnd from the first
 * meeting, then scan once comparing each start against prevEnd.
 * Every frame is recorded during the actual run; no invented values.
 *
 * There is NO live judge record for this slug (overlay judge:null; not in
 * plugin/data shards or index). This adapter uses an honest TEST PROFILE
 * that flattens the NeetCode Interval-object interface to plain args:
 *
 *   canAttendMeetings(intervals:int[][]) -> boolean
 *
 * where intervals is [[start,end],...] and the answer is true iff one person
 * can attend every meeting (touching endpoints allowed). The JS reference
 * constructs Interval-style {start,end} objects from each row before running
 * the identical sweep, so the Interval construction requirement is met in
 * code. Never presented as official; loader never executes it.
 *
 * Visual bounds (honest disclosure): at most 12 intervals per walkthrough
 * (source allows 0..500); over-bound inputs reject with a clear error, never
 * truncate. The single compaction pass stays in semantic.js (boundedFrames);
 * this adapter returns the FULL honest event list plus anchor indices so
 * pedagogical frames survive sampling.
 *
 * Staged source (code blocks byte-identical, tags kept):
 * .workers/jobs/neetcode150-completion/meeting-rooms/meeting-rooms.mjs
 * Per-line notes: full EXPLAIN_LINES kept verbatim (shared step notes cover
 * the rest via semantic.js resolveLineExplain).
 */
import { code, frame, boundedFrames } from './semantic-core.js'

export const SLUG = 'meeting-rooms'

// TEST PROFILE signature (string-array param form for semantic.js).
// Documented above; no live judge record exists (judge:null).
export const SIGNATURE = {
  name: 'canAttendMeetings',
  params: ['int[][]'],
  return: 'boolean',
}

// Object-form profile for forge/spec parity.
export const PROFILE = Object.freeze({
  name: 'canAttendMeetings',
  params: Object.freeze([{ name: 'intervals', type: 'int[][]' }]),
  return: 'boolean',
})

const SOURCE_MAX_ROWS = 500
const SOURCE_MAX_COORD = 1000000
const MAX_N = 12

const meetingJava = code(`
[def] class Interval {
[def]     int start, end;
[def]     Interval(int start, int end) { this.start = start; this.end = end; }
[def] }
[def] class Solution {
[def]     public boolean canAttendMeetings(Interval[] intervals) {
[init]         if (intervals == null || intervals.length <= 1) return true;
[sort]         Arrays.sort(intervals, (a, b) -> Integer.compare(a.start, b.start));
[init]         int prevEnd = intervals[0].end;
[scan]         for (int i = 1; i < intervals.length; i++) {
[check]             if (intervals[i].start < prevEnd) {
[conflict]                 return false;
[def]             }
[keep]             prevEnd = Math.max(prevEnd, intervals[i].end);
[def]         }
[return]         return true;
[def]     }
[def] }
`)

const meetingCpp = code(`
[def] struct Interval {
[def]     int start, end;
[def]     Interval(int s, int e): start(s), end(e) {}
[def] };
[def] class Solution {
[def] public:
[def]     bool canAttendMeetings(vector<Interval>& intervals) {
[init]         if (intervals.empty() || intervals.size() == 1) return true;
[sort]         sort(intervals.begin(), intervals.end(), [](const Interval& a, const Interval& b) { return a.start < b.start; });
[init]         int prevEnd = intervals[0].end;
[scan]         for (size_t i = 1; i < intervals.size(); i++) {
[check]             if (intervals[i].start < prevEnd) {
[conflict]                 return false;
[def]             }
[keep]             prevEnd = max(prevEnd, intervals[i].end);
[def]         }
[return]         return true;
[def]     }
[def] };
`)

const meetingPseudo = code(`
[def] canAttendMeetings(intervals):
[init]   if intervals is empty or has one meeting: return true
[sort]   sort intervals by start
[init]   prevEnd = intervals[0].end
[scan]   for i = 1 to intervals.length - 1:
[check]     if intervals[i].start < prevEnd:
[conflict]       return false
[keep]     prevEnd = max(prevEnd, intervals[i].end)
[return]   return true
`)

const EXPLAIN = {
  def: 'Scope of the task: Interval objects carry start/end and the method reports whether one person can attend all of them.',
  init: 'Guard the trivial inputs and seed the running prevEnd bound with the first meeting after sorting.',
  sort: 'Order by start so any conflict must appear between neighbors; the sweep then only compares adjacent rows in this order.',
  scan: 'Focus on the next meeting in sorted order; every earlier meeting is summarized by prevEnd.',
  check: 'Compare the current start against prevEnd: strictly less means overlap because touching endpoints are allowed to stay.',
  conflict: 'Drop out with false: this pair overlaps, so one person cannot attend every meeting.',
  keep: 'Admit the disjoint meeting and advance prevEnd to the farther end, preserving the non-overlap invariant.',
  return: 'Report true: every adjacent pair in sorted order was disjoint, so the whole set fits one schedule.',
}

const EXPLAIN_LINES = {
  java: {
    0: 'Declaration: Interval models one meeting with integer start/end bounds.',
    1: 'Declaration: the two fields the sweep reads; no behavior lives here.',
    2: 'Declaration: constructor stores the pair; source-equivalent to the NeetCode Interval.',
    3: 'Scope: closes the Interval type; no algorithm operation.',
    4: 'Scope: opens the Solution type; no algorithm state lives here.',
    5: 'Signature: names the Interval array input and the boolean attendance result.',
    6: 'Branch: zero or one meeting can never conflict, so answer true immediately.',
    7: 'Ordering: sort by start so conflicts become adjacent; the sweep below relies on this order.',
    8: 'Declaration: prevEnd tracks the end of the kept chain; only disjoint meetings may move it.',
    9: 'Loop: visit each later meeting once in sorted order; prevEnd summarizes earlier ones.',
    10: 'Branch: strict less-than keeps touching endpoints; <= here would wrongly reject back-to-back meetings.',
    11: 'Exit: an overlap proves the schedule is impossible, so return false at once.',
    12: 'Scope: closes the overlap branch; the kept end is untouched on this path.',
    13: 'Update: disjoint, so extend the running end; max keeps nesting (e.g. [1,10],[2,3]) safe.',
    14: 'Scope: closes one sweep iteration; kept prefix plus prevEnd summarize all meetings seen so far.',
    15: 'Declaration: returns true; no adjacent sorted pair overlapped.',
    16: 'Scope: closes the method; the returned boolean is the full answer.',
    17: 'Scope: closes the class; no algorithm operation.',
  },
  cpp: {
    0: 'Declaration: Interval models one meeting with integer start/end bounds.',
    1: 'Declaration: the two fields the sweep reads; no behavior lives here.',
    2: 'Declaration: constructor stores the pair; mirrors the NeetCode Interval shape.',
    3: 'Scope: closes the struct; no algorithm operation.',
    4: 'Scope: opens the Solution type; no algorithm state lives here.',
    5: 'Scope: public section; the method below is the entry point.',
    6: 'Signature: takes the intervals by reference and returns the boolean answer.',
    7: 'Branch: zero or one meeting can never conflict, so answer true immediately.',
    8: 'Ordering: sort by start so conflicts become adjacent; the sweep below relies on this order.',
    9: 'Declaration: prevEnd tracks the end of the kept chain; only disjoint meetings may move it.',
    10: 'Loop: visit each later meeting once in sorted order; prevEnd summarizes earlier ones.',
    11: 'Branch: strict less-than keeps touching endpoints; <= here would wrongly reject back-to-back meetings.',
    12: 'Exit: an overlap proves the schedule is impossible, so return false at once.',
    13: 'Scope: closes the overlap branch; the kept end is untouched on this path.',
    14: 'Update: disjoint, so extend the running end; max keeps nesting (e.g. [1,10],[2,3]) safe.',
    15: 'Scope: closes one sweep iteration; kept prefix plus prevEnd summarize all meetings seen so far.',
    16: 'Declaration: returns true; no adjacent sorted pair overlapped.',
    17: 'Scope: closes the method; the returned boolean is the full answer.',
    18: 'Scope: closes the class; no algorithm operation.',
  },
  pseudo: {
    0: 'Signature: names the intervals input and the boolean attendance result.',
    1: 'Branch: zero or one meeting can never conflict; guards the prevEnd seed below.',
    2: 'Declaration: end-time-free ordering by start makes conflicts adjacent.',
    3: 'Declaration: prevEnd tracks the end of the kept chain so far.',
    4: 'Loop: visit each later meeting once in sorted order.',
    5: 'Branch: strict less-than is the overlap test because touching endpoints may stay.',
    6: 'Exit: an overlap proves impossibility, so return false immediately.',
    7: 'Update: disjoint, so extend prevEnd; no earlier meeting can still conflict.',
    8: 'Declaration: returns true; the whole sorted chain was pairwise disjoint.',
  },
}

function fmt(iv) {
  return '[' + iv[0] + ',' + iv[1] + ']'
}

function decodeMatrix(value) {
  if (!Array.isArray(value)) throw new Error('Provide intervals as [[start,end],...]')
  if (value.length > SOURCE_MAX_ROWS) {
    throw new Error('Source allows at most ' + SOURCE_MAX_ROWS + ' intervals; got ' + value.length)
  }
  return value.map((iv, i) => {
    if (!Array.isArray(iv) || iv.length !== 2) throw new Error('intervals[' + i + '] must be [start,end]')
    const s = iv[0]
    const e = iv[1]
    if (!Number.isSafeInteger(s) || !Number.isSafeInteger(e)) throw new Error('intervals[' + i + '] must hold integers')
    if (s < 0 || e > SOURCE_MAX_COORD || s >= e) throw new Error('intervals[' + i + '] must satisfy 0 <= start < end <= ' + SOURCE_MAX_COORD)
    return [s, e]
  })
}

function checkedArgs(args) {
  if (!Array.isArray(args) || args.length !== 1) throw new Error('meeting-rooms expects [intervals]')
  const source = decodeMatrix(args[0])
  if (source.length > MAX_N) {
    throw new Error('Visual walkthrough limited to ' + MAX_N + ' intervals; got ' + source.length + ' (evaluation supports 0..500)')
  }
  return source
}

// Every frame below is a REAL sorted-sweep event: sort snapshot, seed prevEnd,
// one scan+check per later meeting, one keep per disjoint meeting, one
// conflict+return on the first overlap, and a final return. Each frame
// snapshots the sorted order, the kept chain, the current interval, and the
// running prevEnd. No future values are revealed early.
export function build(args) {
  const source = checkedArgs(args)
  const live = source.map(([s, e]) => ({ start: s, end: e }))
  const order = live.map((_, i) => i).sort((a, b) => live[a].start - live[b].start || live[a].end - live[b].end)
  const sortedObjs = order.map((i) => live[i])
  const sorted = sortedObjs.map((o) => [o.start, o.end])
  const layout = { intervals: source.map((iv) => iv.slice()) }
  const frames = []
  const anchors = []

  const snap = (v) => JSON.parse(JSON.stringify(v))
  const state = (kept, current, index, extra = {}) => ({
    sorted: sorted.map((iv) => iv.slice()),
    merged: kept.map((iv) => iv.slice()),
    current: current ? current.slice() : null,
    index,
    vars: { n: sorted.length, ...extra },
  })
  const push = (step, label, note, kept, current, index, extra) => {
    frames.push(frame(step, label, note, snap(state(kept, current, index, extra))))
  }

  if (sorted.length === 0) {
    push('init', 'Initialize', 'Empty schedule; one person trivially attends zero meetings', [], null, -1, { prevEnd: -1, answer: 1 })
    push('return', 'Return true', 'Done; 0 meetings need no room conflict check', [], null, -1, { prevEnd: -1, answer: 1 })
    return { kind: 'intervals', layout, frames, result: true, anchors }
  }
  if (sorted.length === 1) {
    push('sort', 'Sort by start', 'Sorted 1 interval; order is ' + fmt(sorted[0]), [], null, -1, { n: 1 })
    push('init', 'Seed prevEnd', 'prevEnd=' + sorted[0][1] + ' from ' + fmt(sorted[0]), [sorted[0].slice()], sorted[0].slice(), 0, { prevEnd: sorted[0][1] })
    push('return', 'Return true', 'Done; single meeting ' + fmt(sorted[0]) + ' always fits', [sorted[0].slice()], null, 0, { prevEnd: sorted[0][1], answer: 1 })
    return { kind: 'intervals', layout, frames, result: true, anchors }
  }

  push('sort', 'Sort by start', 'Sorted ' + sorted.length + ' intervals; first=' + fmt(sorted[0]), [], null, -1, { n: sorted.length })
  const kept = [sorted[0].slice()]
  let prevEnd = sorted[0][1]
  push('init', 'Seed prevEnd', 'prevEnd=' + prevEnd + ' from ' + fmt(sorted[0]), kept, sorted[0].slice(), 0, { prevEnd })

  for (let i = 1; i < sorted.length; i += 1) {
    const cur = sorted[i].slice()
    push('scan', 'Consider interval ' + i, 'i=' + i + ' cur=' + fmt(cur) + ' prevEnd=' + prevEnd, kept, cur, i, { prevEnd, i })
    const overlaps = cur[0] < prevEnd
    push(
      'check',
      'Overlap test',
      fmt(cur) + ' start ' + cur[0] + (overlaps ? ' < ' : ' >= ') + 'prevEnd ' + prevEnd + (overlaps ? '; overlaps' : '; disjoint'),
      kept,
      cur,
      i,
      { prevEnd, i, overlap: overlaps ? 1 : 0 }
    )
    if (overlaps) {
      anchors.push(frames.length)
      push('conflict', 'Conflict found', fmt(cur) + ' overlaps; one person cannot attend all', kept, cur, i, { prevEnd, i, answer: 0 })
      push('return', 'Return false', 'Done; conflict at i=' + i + ' proves impossibility', kept, null, i, { prevEnd, i, answer: 0 })
      return { kind: 'intervals', layout, frames, result: false, anchors }
    }
    kept.push(cur.slice())
    if (cur[1] > prevEnd) prevEnd = cur[1]
    anchors.push(frames.length)
    push('keep', 'Keep disjoint', 'Disjoint; keep ' + fmt(cur) + ' prevEnd=' + prevEnd, kept, cur, i, { prevEnd, i })
  }

  push('return', 'Return true', 'Done; all ' + sorted.length + ' meetings fit one schedule', kept, null, sorted.length - 1, { prevEnd, answer: 1 })
  return { kind: 'intervals', layout, frames, result: true, anchors }
}

export const adapters = {
  'meeting-rooms': {
    signature: SIGNATURE,
    lesson: {
      idea: 'Sort by start so conflicts become adjacent, then sweep once tracking prevEnd; the first start < prevEnd proves impossibility.',
      trap: 'Touching endpoints fit ([1,4],[4,5] ok): use start < prevEnd, never <=. Sort by start first; unsorted input hides conflicts.',
      time: 'O(n log n)',
      space: 'O(1) extra besides the sort',
    },
    code: { java: meetingJava, cpp: meetingCpp, pseudo: meetingPseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
}

// Alias kept for staged-import parity; the live contract uses `build`.
export { build as buildMeetingRooms }
// Re-exported so tree-shakers keep the single compaction helper in the bundle.
export { boundedFrames }
