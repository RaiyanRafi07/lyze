import { code, frame } from './semantic-core.js'

const MAX_INTERVALS = 12
const MAX_COORD = 10000

function fmt(iv) {
  return '[' + iv[0] + ',' + iv[1] + ']'
}

function decodeIntervals(value) {
  if (!Array.isArray(value)) throw new Error('Provide intervals as [[start,end],...] (at most ' + MAX_INTERVALS + ' for this walkthrough)')
  if (value.length > MAX_INTERVALS) throw new Error('Visual walkthrough limited to ' + MAX_INTERVALS + ' intervals; got ' + value.length)
  return value.map((iv, i) => {
    if (!Array.isArray(iv) || iv.length !== 2) throw new Error('intervals[' + i + '] must be [start,end]')
    const s = iv[0]
    const e = iv[1]
    if (!Number.isSafeInteger(s) || !Number.isSafeInteger(e)) throw new Error('intervals[' + i + '] must hold integers')
    if (s < 0 || e > MAX_COORD || s > e) throw new Error('intervals[' + i + '] must satisfy 0 <= start <= end <= ' + MAX_COORD)
    return [s, e]
  })
}

const mergeJava = code(`
[def] import java.util.*;
[def] class Solution {
[def]     public int[][] merge(int[][] intervals) {
[init]         if (intervals == null || intervals.length == 0) return new int[0][];
[sort]         Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
[init]         List<int[]> merged = new ArrayList<>();
[init]         merged.add(new int[]{intervals[0][0], intervals[0][1]});
[scan]         for (int i = 1; i < intervals.length; i++) {
[scan]             int curStart = intervals[i][0];
[scan]             int curEnd = intervals[i][1];
[check]             int[] last = merged.get(merged.size() - 1);
[check]             if (curStart <= last[1]) {
[merge]                 if (curEnd > last[1]) last[1] = curEnd;
[def]             } else {
[push]                 merged.add(new int[]{curStart, curEnd});
[def]             }
[def]         }
[return]         return merged.toArray(new int[merged.size()][]);
[def]     }
[def] }
`)

const mergeCpp = code(`
[def] #include <vector>
[def] #include <algorithm>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     vector<vector<int>> merge(vector<vector<int>>& intervals) {
[init]         if (intervals.empty()) return {};
[sort]         sort(intervals.begin(), intervals.end());
[init]         vector<vector<int>> merged;
[init]         merged.push_back(intervals[0]);
[scan]         for (size_t i = 1; i < intervals.size(); i++) {
[scan]             int curStart = intervals[i][0];
[scan]             int curEnd = intervals[i][1];
[check]             vector<int>& last = merged.back();
[check]             if (curStart <= last[1]) {
[merge]                 if (curEnd > last[1]) last[1] = curEnd;
[def]             } else {
[push]                 merged.push_back(intervals[i]);
[def]             }
[def]         }
[return]         return merged;
[def]     }
[def] };
`)

const mergePseudo = code(`
[def] merge(intervals):
[init]   if intervals is empty: return []
[sort]   sort intervals by start, then by end
[init]   merged = [copy of intervals[0]]
[scan]   for i = 1 to intervals.length - 1:
[scan]     curStart, curEnd = intervals[i]
[check]     last = merged[last index]
[check]     if curStart <= last.end:
[merge]       last.end = max(last.end, curEnd)
[push]     else:
[push]       merged.append([curStart, curEnd])
[return]   return merged
`)

function buildMerge(args) {
  const source = decodeIntervals(args[0])
  const sorted = source.map((iv) => iv.slice()).sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
  const frames = []
  const anchors = []
  const layout = { intervals: source.map((iv) => iv.slice()) }

  const state = (merged, current, index, extra = {}) => ({
    sorted: sorted.map((iv) => iv.slice()),
    merged: merged.map((iv) => iv.slice()),
    current: current ? current.slice() : null,
    index,
    vars: { n: sorted.length, m: merged.length, index, ...extra }
  })
  const push = (step, label, note, merged, current, index, extra) => {
    frames.push(frame(step, label, note, state(merged, current, index, extra)))
  }

  if (sorted.length === 0) {
    push('init', 'Initialize', 'Empty input; nothing to merge', [], null, -1)
    push('return', 'Return merged', 'Merged 0 intervals; answer []', [], null, -1)
    return { kind: 'intervals', layout, frames, result: [], anchors }
  }

  push('sort', 'Sort by start', 'Sorted ' + sorted.length + ' intervals by start; first=' + fmt(sorted[0]), [], null, -1, { first: sorted[0].slice() })
  const merged = [sorted[0].slice()]
  push('init', 'Seed merged', 'Seed merged with ' + fmt(sorted[0]), merged, sorted[0].slice(), 0)

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i].slice()
    const last = merged[merged.length - 1]
    push('scan', 'Consider interval ' + i, 'i=' + i + ' cur=' + fmt(cur) + ' last=' + fmt(last), merged, cur, i)
    const overlap = cur[0] <= last[1]
    push('check', 'Overlap test', fmt(cur) + ' start ' + cur[0] + (overlap ? ' <= ' : ' > ') + 'last end ' + last[1] + (overlap ? '; overlap' : '; disjoint'), merged, cur, i, { overlap: overlap ? 1 : 0 })
    if (overlap) {
      const before = last[1]
      if (cur[1] > last[1]) last[1] = cur[1]
      anchors.push(frames.length)
      push('merge', 'Merge overlap', 'Extend end ' + before + ' -> ' + last[1] + '; merged m=' + merged.length, merged, cur, i, { extended: cur[1] > before ? 1 : 0 })
    } else {
      merged.push(cur.slice())
      anchors.push(frames.length)
      push('push', 'Append disjoint', 'Disjoint; append ' + fmt(cur) + '; m=' + merged.length, merged, cur, i)
    }
  }

  const result = merged.map((iv) => iv.slice())
  push('return', 'Return merged', 'Done; ' + sorted.length + ' -> ' + result.length + ' intervals', merged, null, sorted.length - 1)
  return { kind: 'intervals', layout, frames, result, anchors }
}

const INSERT_MAX_INTERVALS = 12
const INSERT_MAX_COORD = 100000

function decodeInsertIntervals (value) {
  if (!Array.isArray(value)) throw new Error('Provide intervals as [[start,end],...] (at most ' + INSERT_MAX_INTERVALS + ' for this walkthrough)')
  if (value.length > INSERT_MAX_INTERVALS) throw new Error('Visual walkthrough limited to ' + INSERT_MAX_INTERVALS + ' intervals; got ' + value.length)
  const out = value.map((iv, i) => {
    if (!Array.isArray(iv) || iv.length !== 2) throw new Error('intervals[' + i + '] must be [start,end]')
    const s = iv[0]
    const e = iv[1]
    if (!Number.isSafeInteger(s) || !Number.isSafeInteger(e)) throw new Error('intervals[' + i + '] must hold integers')
    if (s < 0 || e > INSERT_MAX_COORD || s > e) throw new Error('intervals[' + i + '] must satisfy 0 <= start <= end <= ' + INSERT_MAX_COORD)
    return [s, e]
  })
  for (let k = 1; k < out.length; k++) {
    if (out[k][0] < out[k - 1][0]) throw new Error('intervals must be sorted by start; row ' + k + ' starts before row ' + (k - 1))
    if (out[k][0] <= out[k - 1][1]) throw new Error('intervals must be non-overlapping; rows ' + (k - 1) + ' and ' + k + ' overlap or touch')
  }
  return out
}

function decodeInsertNewInterval (value) {
  if (!Array.isArray(value) || value.length !== 2) throw new Error('Provide newInterval as [start,end]')
  const s = value[0]
  const e = value[1]
  if (!Number.isSafeInteger(s) || !Number.isSafeInteger(e)) throw new Error('newInterval must hold integers')
  if (s < 0 || e > INSERT_MAX_COORD || s > e) throw new Error('newInterval must satisfy 0 <= start <= end <= ' + INSERT_MAX_COORD)
  return [s, e]
}

const insertJava = code(`
[def] import java.util.*;
[def] class Solution {
[def]     public int[][] insert(int[][] intervals, int[] newInterval) {
[init]         int n = intervals.length;
[init]         int ns = newInterval[0];
[init]         int ne = newInterval[1];
[init]         List<int[]> res = new ArrayList<>();
[init]         int i = 0;
[before]         while (i < n && intervals[i][1] < ns) {
[before]             res.add(intervals[i]);
[before]             i++;
[before]         }
[merge]         while (i < n && intervals[i][0] <= ne) {
[merge]             if (intervals[i][0] < ns) ns = intervals[i][0];
[merge]             if (intervals[i][1] > ne) ne = intervals[i][1];
[merge]             i++;
[merge]         }
[emit]         res.add(new int[]{ns, ne});
[after]         while (i < n) {
[after]             res.add(intervals[i]);
[after]             i++;
[after]         }
[return]         return res.toArray(new int[res.size()][]);
[def]     }
[def] }
`)

const insertCpp = code(`
[def] #include <vector>
[def] #include <algorithm>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     vector<vector<int>> insert(vector<vector<int>>& intervals, vector<int>& newInterval) {
[init]         size_t i = 0;
[init]         int ns = newInterval[0];
[init]         int ne = newInterval[1];
[init]         vector<vector<int>> res;
[before]         while (i < intervals.size() && intervals[i][1] < ns) {
[before]             res.push_back(intervals[i]);
[before]             i++;
[before]         }
[merge]         while (i < intervals.size() && intervals[i][0] <= ne) {
[merge]             if (intervals[i][0] < ns) ns = intervals[i][0];
[merge]             if (intervals[i][1] > ne) ne = intervals[i][1];
[merge]             i++;
[merge]         }
[emit]         res.push_back({ns, ne});
[after]         while (i < intervals.size()) {
[after]             res.push_back(intervals[i]);
[after]             i++;
[after]         }
[return]         return res;
[def]     }
[def] };
`)

const insertPseudo = code(`
[def] insert(intervals, newInterval):
[init]   ns, ne = newInterval
[init]   res = []; i = 0
[before]   while i < n and intervals[i].end < ns:
[before]     res.append(intervals[i]); i += 1
[merge]   while i < n and intervals[i].start <= ne:
[merge]     ns = min(ns, intervals[i].start); ne = max(ne, intervals[i].end); i += 1
[emit]   res.append([ns, ne])
[after]   while i < n:
[after]     res.append(intervals[i]); i += 1
[return]   return res
`)

function buildInsert (args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('insert expects [intervals, newInterval]')
  const source = decodeInsertIntervals(args[0])
  const seed = decodeInsertNewInterval(args[1])
  const sorted = source.map((iv) => iv.slice())
  const n = sorted.length
  let ns = seed[0]
  let ne = seed[1]
  let i = 0
  const merged = []
  const frames = []
  const anchors = []
  const layout = { intervals: sorted.map((iv) => iv.slice()) }

  const state = (current, index, extra = {}) => ({
    sorted: sorted.map((iv) => iv.slice()),
    merged: merged.map((iv) => iv.slice()),
    current: current ? current.slice() : null,
    index,
    vars: { n, i, ns, ne, m: merged.length, ...extra }
  })
  const push = (step, label, note, current, index, extra) => {
    frames.push(frame(step, label, note, state(current, index, extra)))
  }

  push('init', 'Set up the sweep', 'n=' + n + ' sorted rows; new=' + fmt([ns, ne]) + '; i=0', [ns, ne], -1)

  while (i < n && sorted[i][1] < ns) {
    const cur = sorted[i].slice()
    merged.push(cur.slice())
    push('before', 'Emit row ' + i, fmt(cur) + ' ends ' + cur[1] + ' < ' + ns + '; emit as-is', cur, i)
    i++
  }

  while (i < n && sorted[i][0] <= ne) {
    const cur = sorted[i].slice()
    if (cur[0] < ns) ns = cur[0]
    if (cur[1] > ne) ne = cur[1]
    anchors.push(frames.length)
    push('merge', 'Absorb row ' + i, fmt(cur) + ' starts <=' + ne + '; live=[' + ns + ',' + ne + ']', cur, i)
    i++
  }

  merged.push([ns, ne])
  anchors.push(frames.length)
  push('emit', 'Insert merged', 'Insert [' + ns + ',' + ne + ']; m=' + merged.length, [ns, ne], i)

  while (i < n) {
    const cur = sorted[i].slice()
    merged.push(cur.slice())
    push('after', 'Emit row ' + i, fmt(cur) + ' starts >' + ne + '; emit as-is', cur, i)
    i++
  }

  const result = merged.map((iv) => iv.slice())
  push('return', 'Return result', 'Done; ' + n + ' rows + new -> ' + result.length + ' rows', null, n - 1)
  return { kind: 'intervals', layout, frames, result, anchors }
}

const ERASE_MAX_INTERVALS = 12
const ERASE_MIN_COORD = -50000
const ERASE_MAX_COORD = 50000

function decodeEraseIntervals(value) {
  if (!Array.isArray(value)) throw new Error('Provide intervals as [[start,end],...] (at most ' + ERASE_MAX_INTERVALS + ' for this walkthrough)')
  if (value.length > ERASE_MAX_INTERVALS) throw new Error('Visual walkthrough limited to ' + ERASE_MAX_INTERVALS + ' intervals; got ' + value.length)
  return value.map((iv, i) => {
    if (!Array.isArray(iv) || iv.length !== 2) throw new Error('intervals[' + i + '] must be [start,end]')
    const s = iv[0]
    const e = iv[1]
    if (!Number.isSafeInteger(s) || !Number.isSafeInteger(e)) throw new Error('intervals[' + i + '] must hold integers')
    if (s < ERASE_MIN_COORD || e > ERASE_MAX_COORD || s >= e) {
      throw new Error('intervals[' + i + '] must satisfy ' + ERASE_MIN_COORD + ' <= start < end <= ' + ERASE_MAX_COORD)
    }
    return [s, e]
  })
}

const eraseJava = code(`
[def] import java.util.*;
[def] class Solution {
[def]     public int eraseOverlapIntervals(int[][] intervals) {
[init]         if (intervals == null || intervals.length == 0) return 0;
[sort]         Arrays.sort(intervals, (a, b) -> a[1] != b[1] ? Integer.compare(a[1], b[1]) : Integer.compare(a[0], b[0]));
[init]         int removals = 0;
[init]         int prevEnd = intervals[0][1];
[scan]         for (int i = 1; i < intervals.length; i++) {
[check]             if (intervals[i][0] < prevEnd) {
[remove]                 removals++;
[def]             } else {
[keep]                 prevEnd = intervals[i][1];
[def]             }
[def]         }
[return]         return removals;
[def]     }
[def] }
`)

const eraseCpp = code(`
[def] #include <vector>
[def] #include <algorithm>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     int eraseOverlapIntervals(vector<vector<int>>& intervals) {
[init]         if (intervals.empty()) return 0;
[sort]         sort(intervals.begin(), intervals.end(), [](const vector<int>& a, const vector<int>& b) {
[sort]             if (a[1] != b[1]) return a[1] < b[1];
[sort]             return a[0] < b[0];
[sort]         });
[init]         int removals = 0;
[init]         int prevEnd = intervals[0][1];
[scan]         for (size_t i = 1; i < intervals.size(); i++) {
[check]             if (intervals[i][0] < prevEnd) {
[remove]                 removals++;
[def]             } else {
[keep]                 prevEnd = intervals[i][1];
[def]             }
[def]         }
[return]         return removals;
[def]     }
[def] };
`)

const erasePseudo = code(`
[def] eraseOverlapIntervals(intervals):
[init]   if intervals is empty: return 0
[sort]   sort intervals by end, then by start
[init]   removals = 0; prevEnd = intervals[0].end
[scan]   for i = 1 to intervals.length - 1:
[check]     if intervals[i].start < prevEnd:
[remove]       removals = removals + 1
[def]     else:
[keep]       prevEnd = intervals[i].end
[return]   return removals
`)

function buildErase(args) {
  if (!Array.isArray(args) || args.length !== 1) throw new Error('non-overlapping-intervals expects [intervals]')
  const source = decodeEraseIntervals(args[0])
  const sorted = source.map((iv) => iv.slice()).sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]))
  const frames = []
  const anchors = []
  const layout = { intervals: source.map((iv) => iv.slice()) }

  const eraseState = (kept, current, index, extra = {}) => ({
    sorted: sorted.map((iv) => iv.slice()),
    merged: kept.map((iv) => iv.slice()),
    current: current ? current.slice() : null,
    index,
    vars: { n: sorted.length, kept: kept.length, ...extra }
  })
  const erasePush = (step, label, note, kept, current, index, extra) => {
    frames.push(frame(step, label, note, eraseState(kept, current, index, extra)))
  }

  if (sorted.length === 0) {
    erasePush('init', 'Initialize', 'Empty input; nothing overlaps, answer 0', [], null, -1, { removals: 0 })
    erasePush('return', 'Return removals', 'Done; 0 intervals kept, 0 removed', [], null, -1, { removals: 0 })
    return { kind: 'intervals', layout, frames, result: 0, anchors }
  }

  erasePush('sort', 'Sort by end', 'Sorted ' + sorted.length + ' intervals by end; first=' + fmt(sorted[0]), [], null, -1, { removals: 0 })
  const kept = [sorted[0].slice()]
  let prevEnd = sorted[0][1]
  let removals = 0
  erasePush('init', 'Seed kept chain', 'Keep ' + fmt(sorted[0]) + '; prevEnd=' + prevEnd, kept, sorted[0].slice(), 0, { prevEnd, removals })

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i].slice()
    erasePush('scan', 'Consider interval ' + i, 'i=' + i + ' cur=' + fmt(cur) + ' prevEnd=' + prevEnd, kept, cur, i, { prevEnd, removals })
    const overlaps = cur[0] < prevEnd
    erasePush('check', 'Overlap test', fmt(cur) + ' start ' + cur[0] + (overlaps ? ' < ' : ' >= ') + 'prevEnd ' + prevEnd + (overlaps ? '; overlaps' : '; disjoint'), kept, cur, i, { prevEnd, removals, overlap: overlaps ? 1 : 0 })
    if (overlaps) {
      removals++
      anchors.push(frames.length)
      erasePush('remove', 'Remove overlap', 'Overlaps kept chain; removals=' + removals, kept, cur, i, { prevEnd, removals })
    } else {
      kept.push(cur.slice())
      prevEnd = cur[1]
      anchors.push(frames.length)
      erasePush('keep', 'Keep disjoint', 'Disjoint; keep ' + fmt(cur) + ' prevEnd=' + prevEnd, kept, cur, i, { prevEnd, removals })
    }
  }

  const result = removals
  erasePush('return', 'Return removals', 'Done; kept ' + kept.length + ' of ' + sorted.length + '; removed ' + result, kept, null, sorted.length - 1, { prevEnd, removals })
  return { kind: 'intervals', layout, frames, result, anchors }
}

export const adapters = {
  'merge-intervals': {
    signature: { name: 'merge', params: ['int[][]'], return: 'int[][]' },
    lesson: {
      idea: 'Sort by start so mergable runs are contiguous; sweep once, merging when next start <= last end.',
      trap: 'Treating touching [1,4],[4,5] as disjoint; spec merges them to [1,5], so use <= not <.',
      time: 'O(n log n)',
      space: 'O(n)'
    },
    explain: {
      def: 'Structural scope or branch wiring around the sweep; performs no interval operation itself.',
      init: 'Guard the empty input and seed the merged list with a copy of the first sorted interval.',
      sort: 'Order intervals by start (then end) so every mergable group becomes one contiguous run.',
      scan: 'Focus the next sorted interval and read its start/end; the merged tail holds the running answer.',
      check: 'Compare the current start against the merged tail end: <= means overlap-or-touch, > means disjoint.',
      merge: 'Overlapping case: extend the tail end to the farther end; the interval count does not grow.',
      push: 'Disjoint case: the current interval starts a new run, so append it as a fresh merged row.',
      return: 'Report the merged list; its rows are sorted, disjoint, and cover exactly the input ranges.'
    },
    explainLines: {
      java: {
        0: 'Import: brings in Arrays.sort and the ArrayList backing the merged output.',
        3: 'Guard: null or empty input merges to an empty 2D array; no seed is possible.',
        4: 'Order: sort rows by start so each mergable group is contiguous for the sweep.',
        5: 'Declare: the merged output list starts empty before the seed row is added.',
        6: 'Seed: copy the first sorted interval as the running merged tail.',
        7: 'Loop: visit each later sorted interval once, in start order.',
        8: 'Read: current interval start drives the overlap test below.',
        9: 'Read: current interval end is the candidate extension for the merged tail.',
        10: 'Fetch: the merged tail row whose end the current start is tested against.',
        11: 'Test: <= merges touching intervals like [1,4],[4,5]; < here would wrongly split them.',
        12: 'Extend: grow the tail end only when the current end reaches farther.',
        14: 'Append: disjoint current interval starts a new merged row.',
        17: 'Return: convert the merged list to int[][]; rows are sorted and disjoint.'
      },
      cpp: {
        0: 'Include: vector backs the interval rows and the merged output.',
        1: 'Include: algorithm provides the lexicographic sort used below.',
        6: 'Guard: empty input merges to an empty vector; no seed is possible.',
        7: 'Order: default lexicographic sort orders rows by start, then by end.',
        8: 'Declare: the merged output starts empty before the seed row is added.',
        9: 'Seed: copy the first sorted interval as the running merged tail.',
        10: 'Loop: visit each later sorted interval once, in start order.',
        11: 'Read: current interval start drives the overlap test below.',
        12: 'Read: current interval end is the candidate extension for the merged tail.',
        13: 'Fetch: reference to the merged tail row tested and possibly extended.',
        14: 'Test: <= merges touching intervals like [1,4],[4,5]; < here would wrongly split them.',
        15: 'Extend: grow the tail end only when the current end reaches farther.',
        17: 'Append: disjoint current interval starts a new merged row.',
        20: 'Return: the merged vector; rows are sorted and disjoint.'
      },
      pseudo: {
        0: 'Signature: names the intervals input and the merged-list result.',
        1: 'Guard: empty input merges to []; no seed row exists.',
        2: 'Order: sort by start, then by end, so mergable runs are contiguous.',
        3: 'Seed: merged starts as a copy of the first sorted interval.',
        4: 'Loop: visit each later sorted interval once, in start order.',
        5: 'Read: current interval bounds for the overlap test and possible extension.',
        6: 'Fetch: the merged tail row tested and possibly extended below.',
        7: 'Test: <= merges touching endpoints; < would wrongly keep [1,4],[4,5] apart.',
        8: 'Extend: tail end becomes the farther of the two ends on overlap.',
        10: 'Append: disjoint current interval starts a new merged row.',
        11: 'Return: the merged list; rows are sorted and disjoint.'
      }
    },
    code: { java: mergeJava, cpp: mergeCpp, pseudo: mergePseudo },
    build: buildMerge
  },
  'insert-interval': {
    signature: { name: 'insert', params: ['int[][]', 'int[]'], return: 'int[][]' },
    lesson: {
      idea: 'Input rows are already sorted and disjoint: emit rows ending before ns, widen [ns,ne] across rows starting at or before ne, then emit the rest.',
      trap: 'Touching endpoints merge: rows fully before need end < ns, but overlap needs start <= ne. Using < on both sides drops [1,3]+[3,5] style merges.',
      time: 'O(n)',
      space: 'O(n)'
    },
    explain: {
      def: 'The task: insert one interval into sorted disjoint rows, merging every overlap, and return the still-sorted disjoint result.',
      init: 'Copy the new interval bounds into live ns/ne and start the scan at row 0; nothing is emitted yet.',
      before: 'This row ends before ns, so it cannot overlap the live range; emit it unchanged and advance.',
      merge: 'This row starts at or before ne, so it overlaps or touches; widen the live range and advance without emitting.',
      emit: 'No more rows can overlap: the live range is final, so emit it exactly once before the tail rows.',
      after: 'This row starts after the finalized range, so no later row can overlap either; emit the tail unchanged.',
      return: 'Return the emitted rows: every input row is accounted for and the result is sorted and disjoint.'
    },
    explainLines: {
      java: {
        0: 'Import: ArrayList backs the res output list used below.',
        12: 'End of the before-phase loop: the next row is no longer fully before ns.',
        17: 'End of the merge loop: the next row starts after ne, so the live range is final.',
        21: 'End of the tail loop: every remaining row was emitted unchanged.',
        23: 'End of the method scope; the returned array is the new sorted disjoint list.',
        24: 'End of the class scope; no algorithm operation.'
      },
      cpp: {
        0: 'Include: vector backs the res output list used below.',
        1: 'Include: kept for parity with the merge reference; min/max are written out here.',
        13: 'End of the before-phase loop: the next row is no longer fully before ns.',
        18: 'End of the merge loop: the next row starts after ne, so the live range is final.',
        22: 'End of the tail loop: every remaining row was emitted unchanged.',
        24: 'End of the method scope; the returned vector is the new sorted disjoint list.',
        25: 'End of the class scope; no algorithm operation.'
      },
      pseudo: {
        5: 'End of the before phase: the next row is no longer fully before ns.',
        7: 'End of the merge phase: the next row starts after ne, so [ns,ne] is final.',
        9: 'End of the tail phase: every remaining row was emitted unchanged.',
        10: 'End of the function scope; the return above exits with the new list.'
      }
    },
    code: { java: insertJava, cpp: insertCpp, pseudo: insertPseudo },
    build: buildInsert
  },
  'non-overlapping-intervals': {
    signature: { name: 'eraseOverlapIntervals', params: ['int[][]'], return: 'int' },
    lesson: {
      idea: 'Sort by end time so the earliest-finishing interval is safest; sweep once, keeping an interval only when its start reaches the kept end.',
      trap: 'Sorting by start fails: a long early interval blocks many short ones; and touching endpoints are non-overlapping, so the test is start < prevEnd, not <=.',
      time: 'O(n log n)',
      space: 'O(1) extra besides the sort'
    },
    explain: {
      def: 'Scope of the erase-overlaps task: count the fewest intervals to remove so the rest are pairwise non-overlapping.',
      init: 'Guard the empty input and seed the kept chain with the earliest-finishing interval, whose end becomes the running prevEnd bound.',
      sort: 'Order by end time (then start) so greedy choice is safe: no later interval can finish earlier than the current one.',
      scan: 'Focus on the next finishing interval in sorted order; the kept chain and prevEnd summarize every earlier decision.',
      check: 'Compare the current start against prevEnd: strictly less means overlap because touching endpoints are allowed to stay.',
      remove: 'Drop the overlapping interval and count one removal; prevEnd is unchanged since the kept chain did not grow.',
      keep: 'Admit the disjoint interval and advance prevEnd to its end, preserving the invariant that kept intervals never overlap.',
      return: 'Report removals, which equals total minus kept; the kept chain is a maximum-size non-overlapping subset.'
    },
    explainLines: {
      java: {
        0: 'Declaration: imports the Arrays.sort utility used for the end-time ordering.',
        1: 'Scope: opens the Solution class; no algorithm state lives here.',
        2: 'Signature: names the intervals input and the integer removal count result.',
        4: 'Branch: the comparator sorts by end first and breaks ties by start so equal ends keep a deterministic order.',
        8: 'Branch: strict less-than keeps merely touching intervals; <= here would wrongly remove adjoining intervals.',
        10: 'Branch: else scope for the disjoint case; only this path may advance the kept end.',
        12: 'Scope: closes the else branch; prevEnd now reflects the grown kept chain.',
        13: 'Scope: closes one sweep iteration; kept plus prevEnd summarize all intervals seen so far.',
        14: 'Declaration: returns the removal count; kept size equals total minus this value.'
      },
      cpp: {
        0: 'Declaration: brings in vector for the interval rows.',
        1: 'Declaration: brings in sort for the end-time ordering.',
        5: 'Scope: opens the class body; no algorithm state lives here.',
        6: 'Signature: takes the intervals by reference and returns the removal count.',
        8: 'Branch: the lambda orders by end first so the greedy choice is safe.',
        9: 'Branch: ties on end fall back to start for a deterministic sweep order.',
        14: 'Branch: strict less-than keeps touching endpoints; <= would wrongly remove adjoining intervals.',
        16: 'Branch: else scope for the disjoint case; only this path may advance the kept end.',
        18: 'Scope: closes the else branch; prevEnd now reflects the grown kept chain.',
        19: 'Scope: closes one sweep iteration; kept plus prevEnd summarize all intervals seen so far.',
        20: 'Declaration: returns the removal count; kept size equals total minus this value.'
      },
      pseudo: {
        0: 'Signature: names the intervals input and the removal-count result.',
        1: 'Branch: empty input needs no removals; guards the seed of the kept chain.',
        2: 'Declaration: end-time ordering makes each greedy keep safe against all later intervals.',
        3: 'Declaration: prevEnd tracks the end of the kept chain; removals counts only dropped intervals.',
        5: 'Branch: strict less-than is the overlap test because touching endpoints may stay.',
        7: 'Scope: else scope for the disjoint case; the only path that moves prevEnd.',
        9: 'Declaration: returns the removal count; total minus kept is the same number.'
      }
    },
    code: { java: eraseJava, cpp: eraseCpp, pseudo: erasePseudo },
    build: buildErase
  }
}
