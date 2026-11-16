/**
 * k-closest-points-to-origin — live semantic adapter (Heap, heap-topk).
 *
 * Walkthrough algorithm: max-heap of size k keyed by squared distance —
 * offer every point, evict the farthest whenever the heap grows past k.
 * Ordering by x^2+y^2 is identical to ordering by Euclidean distance (sqrt
 * is monotone), so the root is never needed; with |coord| <= 1e4 the max
 * d^2 is 2e8, exact in int arithmetic. O(n log k) time, O(k) extra space.
 *
 * Live record: plugin/data/shard-8.json id 973 (Medium, pattern heap-topk),
 * judge mode unordered, signature kClosest(points: int[][], k: int) -> int[][],
 * official tests `[[1,3],[-2,2]],1 -> [[-2,2]]` and
 * `[[3,3],[5,-1],[-2,4]],2 -> [[3,3],[-2,4]]`, constraints
 * 1 <= k <= points.length <= 1e4, |coord| <= 1e4, answer unique except order.
 *
 * Staged sources:
 * .workers/jobs/neetcode150-completion/k-closest-points-to-origin/adapter-k-closest-points-to-origin.js
 * (max-heap reference, sort-based oracle, literal judge layer, unordered
 * comparison) and builder-k-closest-points-to-origin.js (max-heap trace,
 * squared-distance layout, honest oversize fallback) — ported to the live
 * shape: shared helpers imported from semantic-core.js, no local code/frame
 * redefinitions. Signature equals the live judge signature exactly, so the
 * same editor code compiles unchanged.
 *
 * Visual bound: at most 10 points per walkthrough (judge allows 1e4). Larger
 * inputs throw an honest error instead of truncating silently.
 */
import { code, frame, arrayInput } from './semantic-core.js'

// Visual walkthrough bound (judge allows points.length up to 1e4).
const MAX_POINTS = 10

const kcpJava = code(`
[def] class Solution {
[def]     public int[][] kClosest(int[][] points, int k) {
[init]         java.util.PriorityQueue<int[]> heap = new java.util.PriorityQueue<>((a, b) -> Long.compare(dist(b), dist(a)));
[offer]         for (int[] p : points) {
[offer]             heap.offer(p);
[evict]             if (heap.size() > k) heap.poll();
[offer]         }
[keep]         // heap now holds the k closest; the farthest kept sits on top
[return]         return heap.toArray(new int[0][]);
[def]     }
[def]     private static long dist(int[] p) {
[return]         return (long) p[0] * p[0] + (long) p[1] * p[1];
[def]     }
[def] }
`)

const kcpCpp = code(`
[def] class Solution {
[def] public:
[def]     vector<vector<int>> kClosest(vector<vector<int>>& points, int k) {
[init]         auto dist = [](const vector<int>& p) -> long long { return 1LL * p[0] * p[0] + 1LL * p[1] * p[1]; };
[init]         auto cmp = [&](const vector<int>& a, const vector<int>& b) { return dist(a) < dist(b); };
[init]         std::priority_queue<vector<int>, vector<vector<int>>, decltype(cmp)> heap(cmp);
[offer]         for (auto& p : points) {
[offer]             heap.push(p);
[evict]             if ((int)heap.size() > k) heap.pop();
[offer]         }
[keep]         // heap now holds the k closest; the farthest kept sits on top
[return]         vector<vector<int>> ans;
[return]         while (!heap.empty()) { ans.push_back(heap.top()); heap.pop(); }
[return]         return ans;
[def]     }
[def] };
`)

const kcpPseudo = code(`
[init] kClosest(points, k): heap = empty max-heap ordered by dist2
[offer] for p in points:
[offer]   push p into heap
[evict]   if size(heap) > k: pop the heap top (farthest seen so far)
[keep] heap now holds the k closest; the farthest kept sits on top
[return] return the k points left in heap (any order)
`)

// Line indices below are 0-based positions in kcpJava / kcpCpp / kcpPseudo.
const kcpExplain = {
  init: 'Build an empty max-heap ordered by squared distance; its top is always the farthest kept point.',
  offer: 'Offer each point to the heap in input order; the heap keeps the farthest of the kept on top.',
  evict: 'Over capacity: the heap top is farther than every kept point, so evict it.',
  keep: 'Heap holds exactly the k closest; nothing more is evicted or added.',
  return: 'Return the k kept points; any order is accepted (unordered judge).',
}

const kcpExplainLines = {
  java: {
    0: 'Wrapper class required by the judge harness; no algorithm work.',
    1: 'Entry point: point matrix and k in, k closest points out (any order).',
    2: 'Max-heap ordered by squared distance; the head is the farthest kept point.',
    3: 'Visit each input point once in order.',
    4: 'Insert this point; the heap restores farthest-on-top order.',
    5: 'Over capacity: evict the farthest point seen so far.',
    6: 'End of the scan loop; the heap holds at most k points.',
    7: 'Invariant note: only the k closest survive; the top is the farthest kept.',
    8: 'Drain the heap into the answer array.',
    9: 'End of the judged method.',
    10: 'Squared-distance helper: x^2+y^2 orders like Euclidean distance.',
    11: 'Integer arithmetic stays exact (max d^2 is 2e8); no sqrt needed.',
    12: 'End of the wrapper class.',
  },
  cpp: {
    0: 'Wrapper class required by the judge harness; no algorithm work.',
    1: 'Access specifier for the judged method.',
    2: 'Entry point: point matrix and k in, k closest points out (any order).',
    3: 'Squared-distance lambda: x^2+y^2 orders like Euclidean distance.',
    4: 'Max-heap comparator: the largest distance sits on top for O(1) eviction.',
    5: 'Max-heap of points, at most k+1 entries at any moment.',
    6: 'Visit each input point once in order.',
    7: 'Insert this point; the heap restores farthest-on-top order.',
    8: 'Over capacity: evict the farthest point seen so far.',
    9: 'End of the scan loop; the heap holds at most k points.',
    10: 'Invariant note: only the k closest survive; the top is the farthest kept.',
    11: 'Drain container for the answer.',
    12: 'Move the heap top into the answer, then remove it.',
    13: 'Return the k kept points; any order is accepted.',
    14: 'End of the judged method.',
    15: 'End of the wrapper class.',
  },
  pseudo: {
    0: 'Entry point: point matrix and k in, k closest points out.',
    1: 'Visit each input point once in order.',
    2: 'Insert this point into the max-heap.',
    3: 'Over capacity: evict the farthest point seen so far.',
    4: 'Invariant: the heap holds exactly the k closest points.',
    5: 'Return the kept points; any order is accepted.',
  },
}

// Squared Euclidean distance. Ordering by x^2+y^2 matches Euclidean order
// (sqrt is monotone); max 2e8 with the shard bounds — int-exact, no floats.
function dist2(p) {
  return p[0] * p[0] + p[1] * p[1]
}

function fmtPoint(p) {
  return '[' + p[0] + ',' + p[1] + ']'
}

function decodeInput(args) {
  if (!Array.isArray(args) || args.length !== 2) {
    throw new Error('Provide points and k, e.g. [[1,3],[-2,2]] and 1, for this walkthrough')
  }
  const rawPoints = typeof args[0] === 'string' ? JSON.parse(args[0]) : args[0]
  const rawK = typeof args[1] === 'string' ? Number.parseInt(String(args[1]).trim(), 10) : args[1]
  if (!Array.isArray(rawPoints) || rawPoints.length === 0 || rawPoints.length > MAX_POINTS) {
    throw new Error('Visual walkthrough needs 1..' + MAX_POINTS + ' points (' + (Array.isArray(rawPoints) ? rawPoints.length : 'bad input') + ' given)')
  }
  if (!Number.isInteger(rawK) || rawK < 1 || rawK > rawPoints.length) {
    throw new Error('Visual walkthrough needs 1 <= k <= points.length for this input')
  }
  const points = rawPoints.map((p, i) => {
    if (!Array.isArray(p) || p.length !== 2 || !p.every((v) => Number.isInteger(v) && v >= -10000 && v <= 10000)) {
      throw new Error('points[' + i + '] must be [x,y] with |coord| <= 10000')
    }
    return [p[0], p[1]]
  })
  return { points, k: rawK }
}

// Real execution trace: max-heap of kept indices keyed by dist2 — the same
// reference algorithm the Java/C++ above implement (push each point, evict
// the farthest when size exceeds k). Heap order, NOT sorted order.
function traceKClosest(points, k) {
  const key = (idx) => dist2(points[idx])
  const heap = []
  const events = []
  const siftUp = (pos) => {
    while (pos > 0) {
      const parent = (pos - 1) >> 1
      if (key(heap[parent]) >= key(heap[pos])) break
      const t = heap[parent]
      heap[parent] = heap[pos]
      heap[pos] = t
      pos = parent
    }
  }
  const siftDown = (pos) => {
    for (;;) {
      const l = 2 * pos + 1
      const r = l + 1
      let big = pos
      if (l < heap.length && key(heap[l]) > key(heap[big])) big = l
      if (r < heap.length && key(heap[big]) < key(heap[r])) big = r
      if (big === pos) break
      const t = heap[big]
      heap[big] = heap[pos]
      heap[pos] = t
      pos = big
    }
  }
  for (let i = 0; i < points.length; i++) {
    heap.push(i)
    siftUp(heap.length - 1)
    events.push({ type: 'offer', i, point: points[i].slice(), d: key(i), size: heap.length, heap: heap.slice() })
    if (heap.length > k) {
      const evicted = heap[0]
      const last = heap.pop()
      if (heap.length > 0) {
        heap[0] = last
        siftDown(0)
      }
      events.push({ type: 'evict', i, evicted, evictedPoint: points[evicted].slice(), evictedD: key(evicted), size: heap.length, heap: heap.slice() })
    } else {
      events.push({ type: 'keep', i, size: heap.length, heap: heap.slice() })
    }
  }
  return { events, heap: heap.slice(), answer: heap.map((idx) => points[idx].slice()) }
}

export function buildKClosest(args) {
  const { points, k } = decodeInput(args)
  const dists = points.map((p) => dist2(p))
  const trace = traceKClosest(points, k)
  const frames = []
  const anchors = []
  const seenOf = (heapIdx) => {
    const s = {}
    for (const idx of heapIdx) s[String(dist2(points[idx]))] = idx
    return s
  }
  const clip = (text, max) => {
    const s = String(text)
    return s.length <= max ? s : s.slice(0, max - 1) + '…'
  }

  frames.push(frame('init', clip('input n=' + points.length + ', k=' + k, 40),
    clip('Rank by x^2+y^2 (same order as sqrt). Points: ' + points.map(fmtPoint).join(' ') + '.', 140),
    { pointers: {}, highlights: {}, seen: {}, values: dists.slice(), vars: { n: points.length, k } }))
  frames.push(frame('init', 'empty heap',
    clip('Max-heap keeps the ' + k + ' closest; its top is the farthest kept.', 140),
    { pointers: {}, highlights: {}, seen: {}, values: dists.slice(), vars: { n: points.length, k } }))

  for (const ev of trace.events) {
    if (ev.type === 'offer') {
      frames.push(frame('offer', clip('offer ' + fmtPoint(ev.point), 40),
        clip('points[' + ev.i + ']=' + fmtPoint(ev.point) + ' d^2=' + ev.d + '; push, heap size ' + ev.size + '.', 140),
        {
          pointers: { i: ev.i }, highlights: { [String(ev.i)]: 'accent' }, seen: seenOf(ev.heap),
          values: dists.slice(), vars: { k, point: fmtPoint(ev.point), dist: ev.d, size: ev.size },
        }))
    } else if (ev.type === 'keep') {
      frames.push(frame('keep', clip('keep ' + ev.size + '<=' + k, 40),
        clip('Size ' + ev.size + ' <= k=' + k + '; nothing evicted.', 140),
        {
          pointers: { i: ev.i }, highlights: { [String(ev.i)]: 'ok' }, seen: seenOf(ev.heap),
          values: dists.slice(), vars: { k, size: ev.size },
        }))
    } else {
      anchors.push(frames.length)
      frames.push(frame('evict', clip('evict ' + fmtPoint(ev.evictedPoint), 40),
        clip('Size ' + (ev.size + 1) + ' > k=' + k + '; drop farthest ' + fmtPoint(ev.evictedPoint) + ' d^2=' + ev.evictedD + '.', 140),
        {
          pointers: { i: ev.i }, highlights: { [String(ev.i)]: 'bad' }, seen: seenOf(ev.heap),
          values: dists.slice(), vars: { k, evicted: fmtPoint(ev.evictedPoint), evictedDist: ev.evictedD, size: ev.size },
        }))
    }
  }

  const ansStr = trace.answer.map(fmtPoint).join(' ')
  anchors.push(frames.length)
  frames.push(frame('return', 'answer',
    clip('Heap holds the ' + k + ' closest: ' + ansStr + ' (any order).', 140),
    {
      pointers: {},
      highlights: Object.fromEntries(trace.heap.map((idx) => [String(idx), 'ok'])),
      seen: seenOf(trace.heap), values: dists.slice(), vars: { k },
    }))
  // Full event list: the host performs the single honest compaction pass.
  return {
    kind: 'array',
    layout: { values: dists.slice() },
    frames,
    result: trace.answer,
    anchors,
  }
}

export const adapters = {
  'k-closest-points-to-origin': {
    signature: { name: 'kClosest', params: ['int[][]', 'int'], return: 'int[][]' },
    lesson: {
      idea: 'Keep a max-heap of size k keyed by squared distance; its top is the farthest kept point.',
      trap: 'Compare x^2+y^2, never sqrt; ties at the k boundary cannot occur in judge data.',
      time: 'O(n log k)',
      space: 'O(k)',
    },
    code: { java: kcpJava, cpp: kcpCpp, pseudo: kcpPseudo },
    build: buildKClosest,
    explain: kcpExplain,
    explainLines: kcpExplainLines,
  },
}
