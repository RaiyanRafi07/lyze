/**
 * minimum-interval-to-include-each-query — standalone walkthrough adapter (batch13).
 *
 * Sweep over queries in ascending order: sort intervals by left, sort queries
 * keeping original indices, offer every interval with left <= q into a min-heap
 * keyed by (size, right), evict heap tops with right < q, answer top size or -1.
 *
 * Staged source: .workers/jobs/question-owners-150/minimum-interval-to-include-each-query/
 * minimum-interval.adapter.js (buildMinInterval frames/steps/notes) + lesson metadata —
 * reshaped into the live adapter contract (signature/lesson/explain/explainLines/code/build).
 * Live walkthrough bound is 1..8 intervals and 1..8 queries so the official
 * 4x4 examples render natively (18-19 frames, no compaction); judge ranges
 * (n,m <= 1e5, coords 1..1e7) rest on the identical O((n+m) log(n+m)) algorithm.
 *
 * Signature equals the live judge signature exactly:
 * minInterval(intervals: int[][], queries: int[]) -> int[] (plugin/data/shard-16.json id 1851).
 */

import { code, frame, boundedFrames } from './semantic-core.js'

void boundedFrames

// Walkthrough scene bound (judge allows n,m up to 1e5, coords 1..1e7).
// Full trace emits 2 + 2*m + offers + evicts events; 1..8 inputs keep every
// native trace within 6..40 frames, so no compaction.
const MAX_N = 8
const MAX_M = 8
const MIN_COORD = 1
const MAX_COORD = 10000000

const minIntervalJava = code(`
[def] import java.util.*;
[def] class Solution {
[def]     public int[] minInterval(int[][] intervals, int[] queries) {
[sort]         Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
[sort]         int n = intervals.length, m = queries.length;
[sort]         int[][] qs = new int[m][2];
[sort]         for (int j = 0; j < m; j++) { qs[j][0] = queries[j]; qs[j][1] = j; }
[sort]         Arrays.sort(qs, (a, b) -> Integer.compare(a[0], b[0]));
[def]         PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> a[0] != b[0] ? Integer.compare(a[0], b[0]) : Integer.compare(a[1], b[1]));
[answer]         int[] ans = new int[m];
[scan]         int pi = 0;
[scan]         for (int k = 0; k < m; k++) {
[scan]             int q = qs[k][0];
[offer]             while (pi < n && intervals[pi][0] <= q) {
[offer]                 int sz = intervals[pi][1] - intervals[pi][0] + 1;
[offer]                 heap.offer(new int[]{sz, intervals[pi][1]});
[offer]                 pi++;
[def]             }
[evict]             while (!heap.isEmpty() && heap.peek()[1] < q) heap.poll();
[answer]             ans[qs[k][1]] = heap.isEmpty() ? -1 : heap.peek()[0];
[def]         }
[return]         return ans;
[def]     }
[def] }
`)

const minIntervalCpp = code(`
[def] #include <vector>
[def] #include <algorithm>
[def] #include <queue>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     vector<int> minInterval(vector<vector<int>>& intervals, vector<int>& queries) {
[sort]         sort(intervals.begin(), intervals.end());
[sort]         int n = intervals.size(), m = queries.size();
[sort]         vector<int> order(m);
[sort]         for (int j = 0; j < m; j++) order[j] = j;
[sort]         sort(order.begin(), order.end(), [&](int a, int b){ return queries[a] < queries[b]; });
[def]         using P = pair<int,int>;
[def]         priority_queue<P, vector<P>, greater<P>> heap;
[answer]         vector<int> ans(m, -1);
[scan]         int pi = 0;
[scan]         for (int k = 0; k < m; k++) {
[scan]             int q = queries[order[k]];
[offer]             while (pi < n && intervals[pi][0] <= q) {
[offer]                 int sz = intervals[pi][1] - intervals[pi][0] + 1;
[offer]                 heap.push({sz, intervals[pi][1]});
[offer]                 pi++;
[def]             }
[evict]             while (!heap.empty() && heap.top().second < q) heap.pop();
[answer]             if (!heap.empty()) ans[order[k]] = heap.top().first;
[def]         }
[return]         return ans;
[def]     }
[def] };
`)

const minIntervalPseudo = code(`
[def] minInterval(intervals, queries):
[sort]   sort intervals by left ascending
[sort]   order = query indices sorted by queries[j] ascending
[def]   heap = empty min-heap keyed by (size, right)
[answer]   ans[j] = -1 for every query j
[scan]   pi = 0
[scan]   for k in 0..m-1:
[scan]     q = queries[order[k]]
[offer]     while pi < n and intervals[pi].left <= q:
[offer]       push (size, right) of intervals[pi]; pi += 1
[evict]     while heap not empty and heap.top.right < q:
[evict]       pop heap top (expired: ends before q)
[answer]     if heap not empty: ans[order[k]] = heap.top.size
[return]   return ans
`)

function asArray(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return JSON.parse(value)
  throw new Error('minInterval expects [intervals, queries]')
}

function decodeIntervals(value) {
  const raw = asArray(value)
  if (!Array.isArray(raw)) throw new Error('intervals must be [[left,right],...]')
  if (raw.length < 1 || raw.length > MAX_N) {
    throw new Error('Visual walkthrough shows 1..8 intervals (got ' + raw.length + '; judge allows up to 100000)')
  }
  return raw.map((iv, i) => {
    if (!Array.isArray(iv) || iv.length !== 2) throw new Error('intervals[' + i + '] must be [left,right]')
    const l = iv[0]
    const r = iv[1]
    if (!Number.isSafeInteger(l) || !Number.isSafeInteger(r)) throw new Error('intervals[' + i + '] must hold integers')
    if (l < MIN_COORD || r > MAX_COORD || l > r) throw new Error('intervals[' + i + '] must satisfy 1 <= left <= right <= 10^7')
    return [l, r]
  })
}

function decodeQueries(value) {
  const raw = asArray(value)
  if (!Array.isArray(raw)) throw new Error('queries must be an integer array')
  if (raw.length < 1 || raw.length > MAX_M) {
    throw new Error('Visual walkthrough shows 1..8 queries (got ' + raw.length + '; judge allows up to 100000)')
  }
  if (!raw.every((q) => Number.isSafeInteger(q) && q >= MIN_COORD && q <= MAX_COORD)) {
    throw new Error('queries must hold integers in 1..10^7')
  }
  return raw.slice()
}

function cmpEntry(a, b) {
  if (a.size !== b.size) return a.size - b.size
  return a.right - b.right
}

function siftUp(heap, i) {
  while (i > 0) {
    const p = (i - 1) >> 1
    if (cmpEntry(heap[p], heap[i]) <= 0) break
    const t = heap[p]; heap[p] = heap[i]; heap[i] = t
    i = p
  }
}

function siftDown(heap, i) {
  for (;;) {
    const l = 2 * i + 1
    const r = 2 * i + 2
    let s = i
    if (l < heap.length && cmpEntry(heap[l], heap[s]) < 0) s = l
    if (r < heap.length && cmpEntry(heap[r], heap[s]) < 0) s = r
    if (s === i) break
    const t = heap[s]; heap[s] = heap[i]; heap[i] = t
    i = s
  }
}

function heapOffer(heap, e) {
  heap.push(e)
  siftUp(heap, heap.length - 1)
}

function heapPoll(heap) {
  const top = heap[0]
  const last = heap.pop()
  if (heap.length > 0) {
    heap[0] = last
    siftDown(heap, 0)
  }
  return top
}

function buildMinInterval(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('minInterval expects [intervals, queries]')
  const source = decodeIntervals(args[0])
  const queries = decodeQueries(args[1])
  const sorted = source.map((iv) => iv.slice()).sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
  const sizes = sorted.map((iv) => iv[1] - iv[0] + 1)
  const m = queries.length
  const order = queries.map((_, j) => j).sort((a, b) => queries[a] - queries[b])
  const frames = []
  const anchors = []
  const layout = {
    intervals: source.map((iv) => iv.slice()),
    queries: queries.slice(),
  }
  const heap = []
  const answers = new Array(m).fill(null)
  let pi = 0

  const snapHeap = () => heap.map((e) => ({ id: e.id, l: e.left, r: e.right, size: e.size, sortPos: e.sortPos }))
  const state = (current, qi, extra = {}) => ({
    sorted: sorted.map((iv) => iv.slice()),
    sizes: sizes.slice(),
    queries: queries.slice(),
    order: order.slice(),
    heap: snapHeap(),
    heapKind: 'min-heap by (size, right); index 0 is the smallest candidate',
    answers: answers.slice(),
    current: current === null || current === undefined ? null : current,
    qi,
    vars: { n: sorted.length, m, pi, qi, q: current, heapSize: heap.length, ...extra },
  })
  const push = (step, label, note, current, qi, extra) => {
    frames.push(frame(step, label, note, state(current, qi, extra)))
  }

  push('sort', 'Sort inputs', 'Sorted ' + sorted.length + ' intervals by left; ' + m + ' queries ascending; pi=0, heap=[]', null, -1, { pi: 0 })
  for (let k = 0; k < order.length; k++) {
    const j = order[k]
    const q = queries[j]
    push('scan', 'Query ' + (k + 1) + '/' + m, 'q=' + q + ' (orig j=' + j + '); offer intervals with left<=' + q, q, k, { orig: j })
    let offered = 0
    while (pi < sorted.length && sorted[pi][0] <= q) {
      const e = { id: pi, left: sorted[pi][0], right: sorted[pi][1], size: sizes[pi], sortPos: pi }
      heapOffer(heap, e)
      offered++
      push('offer', 'Offer [' + e.left + ',' + e.right + ']', 'left ' + e.left + '<=' + q + '; push size=' + e.size + ' right=' + e.right + '; heapSize=' + heap.length, q, k, { orig: j, offered: e.sortPos, size: e.size, right: e.right })
      pi++
    }
    if (offered === 0) {
      push('offer', 'No new offers', 'No unoffered interval has left<=' + q + '; heapSize=' + heap.length, q, k, { orig: j, offeredNone: 1 })
    }
    let evicted = 0
    while (heap.length > 0 && heap[0].right < q) {
      const top = heapPoll(heap)
      evicted++
      anchors.push(frames.length)
      push('evict', 'Evict [' + top.left + ',' + top.right + ']', 'top right ' + top.right + '<' + q + ' (ended); pop; heapSize=' + heap.length, q, k, { orig: j, evicted: top.sortPos, size: top.size, right: top.right })
    }
    const ans = heap.length > 0 ? heap[0].size : -1
    answers[j] = ans
    anchors.push(frames.length)
    if (heap.length > 0) {
      const best = heap[0]
      push('answer', 'Answer q=' + q, 'live top [' + best.left + ',' + best.right + '] size=' + best.size + ' covers q; ans[j=' + j + ']=' + ans, q, k, { orig: j, ans, best: best.sortPos, evictedCount: evicted })
    } else {
      push('answer', 'Answer q=' + q, 'heap empty after eviction: nothing covers q; ans[j=' + j + ']=-1', q, k, { orig: j, ans, evictedCount: evicted })
    }
  }
  push('return', 'Return answers', 'Done; answers=[' + answers.join(',') + '] in original query order', null, order.length - 1, { result: answers.slice() })
  // Full event list: the host performs the single honest compaction pass.
  return { kind: 'intervals', layout, frames, result: answers.slice(), anchors }
}

export const adapters = {
  'minimum-interval-to-include-each-query': {
    signature: { name: 'minInterval', params: ['int[][]', 'int[]'], return: 'int[]' },
    lesson: {
      idea: 'Sweep queries ascending; offer left<=q into a size-ordered min-heap, evict right<q, so the top is the smallest live cover.',
      trap: 'Evict before answering: a heap top with right<q is expired and must pop first, or a stale small interval wins. Empty heap means -1.',
      time: 'O((n + m) log (n + m))',
      space: 'O(n + m)',
    },
    // Per-step explanations (presentation metadata, never compiled).
    // Staged source: .workers/jobs/question-owners-150/minimum-interval-to-include-each-query/
    // minimum-interval.adapter.js (minIntervalExplain) — condensed to one note per step.
    explain: {
      def: 'Scope of the min-interval task: for each query report the smallest covering interval size, or -1.',
      sort: 'Order intervals by left and queries ascending so one left-to-right sweep sees each start exactly once.',
      scan: 'Focus the next query in ascending order; its value q drives the offer and evict steps below.',
      offer: 'Push every interval with left <= q that the sweep has not offered yet, keyed by (size, right).',
      evict: 'Pop heap tops with right < q: they ended before q and can never cover this or any later query.',
      answer: 'Record the heap top size, or -1 when no live interval covers q; later queries never change it.',
      return: 'Report answers in the original query order; each entry is the smallest covering size or -1.',
    },
    explainLines: {
      java: {
        0: 'Import: Arrays.sort plus the PriorityQueue used as the size-ordered min-heap.',
        2: 'Signature: takes intervals and queries, returns one answer per query in input order.',
        3: 'Order: sort intervals by left so the sweep meets starts monotonically.',
        5: 'Pair: qs[k] holds (query value, original index) so answers land back in input order.',
        7: 'Order: sort the query pairs by value; equal queries are interchangeable.',
        8: 'Declare: min-heap of [size,right]; smallest size (then earliest end) sits on top.',
        9: 'Declare: ans holds one entry per query; only a live heap top overwrites it.',
        10: 'Cursor: pi is the next not-yet-offered interval in left order; it only moves forward.',
        12: 'Read: q is the current query value; everything below is decided against q.',
        13: 'Gate: an interval becomes eligible exactly when its left reaches q; later intervals wait.',
        14: 'Size: inclusive size right-left+1, never a bare index or a count of intervals.',
        15: 'Offer: push (size,right); this interval is now live for q and later queries.',
        18: 'Evict: right<q means ended before q; such tops (and only tops) leave now.',
        19: 'Write: empty heap after eviction means uncovered, so -1; else the top size is minimal.',
        21: 'Return: answers are in the caller query order, one entry per query.',
      },
      cpp: {
        0: 'Include: vector backs intervals, order, and the answer array.',
        1: 'Include: sort orders intervals by left and the query index order by value.',
        2: 'Include: queue provides priority_queue used as the min-heap.',
        7: 'Order: default lexicographic sort orders interval rows by left, then right.',
        10: 'Pair: order[k] is the original query index of the k-th smallest query value.',
        13: 'Declare: min-heap of (size,right) with greater<> so the smallest sits on top.',
        14: 'Init: every answer starts -1; only a live heap top overwrites it.',
        16: 'Cursor: pi tracks the next unoffered interval; it never moves backwards.',
        17: 'Read: q is the current query value in ascending sweep order.',
        18: 'Gate: offer intervals while their left is at or before q, each exactly once.',
        20: 'Offer: push (size,right); inclusive size right-left+1, not an index.',
        23: 'Evict: tops ending before q leave; later queries are >= q so they stay gone.',
        24: 'Write: a surviving top is the smallest live cover for q; empty keeps -1.',
        26: 'Return: answers are in the caller query order.',
      },
      pseudo: {
        0: 'Signature: names the intervals input, the queries input, and the answer array result.',
        1: 'Order: left ordering makes each interval eligible exactly once during the sweep.',
        2: 'Order: ascending query order lets the offer cursor and evictions move forward only.',
        3: 'Declare: heap key (size,right) keeps the smallest live cover on top.',
        4: 'Init: -1 marks uncovered; null/uncomputed is never shown as 0.',
        5: 'Cursor: pi tracks the next unoffered interval; it never moves backwards.',
        7: 'Read: q is the decision value for the offer, evict, and answer steps.',
        8: 'Gate: left<=q is the eligibility test; right is checked only at eviction time.',
        9: 'Offer: each interval is pushed once with its true inclusive size.',
        10: 'Gate: only heap tops are tested; a buried expired entry cannot be on top yet be live.',
        11: 'Evict: right<q ends coverage; touching right==q still covers q (inclusive).',
        12: 'Write: the surviving top is minimal among live covers; empty means -1.',
        13: 'Return: one entry per query in the original order.',
      },
    },
    code: { java: minIntervalJava, cpp: minIntervalCpp, pseudo: minIntervalPseudo },
    build: buildMinInterval,
  },
}

export const visualBounds = { minN: 1, maxN: MAX_N, minM: 1, maxM: MAX_M, minCoord: MIN_COORD, maxCoord: MAX_COORD }
