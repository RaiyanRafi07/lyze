import { code, frame, arrayInput } from './semantic-core.js'
import { explain as topKExplainStaged, explainLines as topKExplainLinesStaged } from './forge-top-k-frequent-elements.js'

// Coordinator trim (practice5 batch): staged explain.init was 141 chars, one
// over the explain_check 140-char cap. Meaning preserved (weakest-rank order),
// length now 96. All other staged notes verified <=140 and keyed to the live
// topkJava/topkCpp/topkPseudo line indices (24/37/13).
const topKExplain = { ...topKExplainStaged, init: 'Create the empty value->count map and the empty min-heap ordered by weakest rank first.' }

// Visual bound for the walkthrough scene (judge allows far larger inputs).
// Longer visual runs rely on anchors + the single boundedFrames pass in semantic.js.
const MAX_N = 10

const kthJava = code(`
[def] class Solution {
[def]     public int findKthLargest(int[] nums, int k) {
[init]         java.util.PriorityQueue<Integer> heap = new java.util.PriorityQueue<>();
[offer]         for (int x : nums) {
[offer]             heap.offer(x);
[check]             if (heap.size() > k) {
[evict]                 heap.poll();
[def]             }
[def]         }
[return]         return heap.peek();
[def]     }
[def] }
`)

const kthCpp = code(`
[def] class Solution {
[def] public:
[def]     int findKthLargest(vector<int>& nums, int k) {
[init]         priority_queue<int, vector<int>, greater<int>> heap;
[offer]         for (int x : nums) {
[offer]             heap.push(x);
[check]             if ((int)heap.size() > k) {
[evict]                 heap.pop();
[def]             }
[def]         }
[return]         return heap.top();
[def]     }
[def] };
`)

const kthPseudo = code(`
[def] findKthLargest(nums, k):
[init]   heap = empty min-heap
[offer]   for x in nums:
[offer]     push x into heap
[check]     if size(heap) > k:
[evict]       pop smallest from heap
[return]   return smallest in heap
`)

function decodeNums(raw) {
  const value = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!Array.isArray(value)) throw new Error('nums must be an integer array')
  if (value.length === 0) throw new Error('nums must hold at least 1 number for this walkthrough')
  if (value.length > MAX_N) {
    throw new Error(
      'Visual walkthrough shows at most ' + MAX_N + ' numbers (judge allows up to 100000)'
    )
  }
  return arrayInput(value, MAX_N)
}

function decodeK(raw, n) {
  const value = typeof raw === 'string' && raw.trim() !== '' ? JSON.parse(raw) : raw
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error('k must be an integer with 1 <= k <= n')
  }
  if (value < 1 || value > n) {
    throw new Error('Use k with 1 <= k <= n (got k=' + value + ', n=' + n + ')')
  }
  return value
}

// Deterministic binary min-heap (heap order, NOT sorted order).
function siftUp(heap, i) {
  while (i > 0) {
    const parent = (i - 1) >> 1
    if (heap[parent] <= heap[i]) break
    const tmp = heap[parent]
    heap[parent] = heap[i]
    heap[i] = tmp
    i = parent
  }
}

function siftDown(heap, i) {
  const n = heap.length
  for (;;) {
    const left = 2 * i + 1
    const right = 2 * i + 2
    let smallest = i
    if (left < n && heap[left] < heap[smallest]) smallest = left
    if (right < n && heap[right] < heap[smallest]) smallest = right
    if (smallest === i) break
    const tmp = heap[smallest]
    heap[smallest] = heap[i]
    heap[i] = tmp
    i = smallest
  }
}

function heapOffer(heap, x) {
  heap.push(x)
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

function buildKthLargest(args) {
  const source = decodeNums(args[0])
  const k = decodeK(args[1], source.length)
  const n = source.length
  const heap = []
  const frames = []
  const anchors = []

  const state = (current, vars) => ({
    current,
    values: source.slice(),
    heap: heap.slice(),
    heapKind: 'min-heap (partial order; index 0 is smallest kept)',
    vars: { n, k, ...vars },
  })
  const push = (step, label, note, current, vars = {}) =>
    frames.push(frame(step, label, note, state(current, vars)))

  push('init', 'Initialize', 'n=' + n + ', k=' + k + ', heap=[] (keeps k largest)', null, {})

  for (let i = 0; i < n; i++) {
    const x = source[i]
    heapOffer(heap, x)
    push(
      'offer',
      'Offer nums[' + i + ']',
      'offer x=' + x + '; heap=[' + heap.join(',') + '] (partial order)',
      i,
      { x, size: heap.length }
    )
    if (heap.length > k) {
      push(
        'check',
        'Check size',
        'size=' + heap.length + ' > k=' + k + '; evict smallest next',
        i,
        { x, size: heap.length }
      )
      const evicted = heapPoll(heap)
      anchors.push(frames.length)
      push(
        'evict',
        'Evict ' + evicted,
        'evict top=' + evicted + '; heap=[' + heap.join(',') + '] keeps k largest',
        i,
        { x, evicted, size: heap.length }
      )
    } else {
      push(
        'check',
        'Check size',
        'size=' + heap.length + ' <= k=' + k + '; keep x=' + x,
        i,
        { x, size: heap.length }
      )
    }
  }

  const answer = heap[0]
  anchors.push(frames.length)
  push('return', 'Return answer', 'return heap top=' + answer + ' (kth largest)', null, { answer })
  // Full event list: semantic.js performs the single honest compaction pass.
  return {
    kind: 'array',
    layout: { values: source.slice() },
    frames,
    result: answer,
    anchors,
  }
}

// Visual bound for the walkthrough scene (judge allows up to 100000 numbers).
// Longer visual runs rely on anchors + the single boundedFrames pass in semantic.js.
const MAX_TOPK_N = 9

const topkJava = code(`
[def] class Solution {
[def]     public int[] topKFrequent(int[] nums, int k) {
[init]         java.util.Map<Integer, Integer> freq = new java.util.LinkedHashMap<>();
[count]         for (int x : nums) {
[count]             freq.put(x, freq.getOrDefault(x, 0) + 1);
[count]         }
[init]         java.util.PriorityQueue<Integer> heap = new java.util.PriorityQueue<>((a, b) -> {
[init]             int c = Integer.compare(freq.get(a), freq.get(b));
[init]             if (c != 0) return c;
[init]             return Integer.compare(b, a);
[init]         });
[keep]         for (int key : freq.keySet()) {
[keep]             heap.offer(key);
[evict]             if (heap.size() > k) {
[evict]                 heap.poll();
[evict]             }
[keep]         }
[extract]         int[] ans = new int[k];
[extract]         for (int i = 0; i < k; i++) {
[extract]             ans[i] = heap.poll();
[extract]         }
[return]         return ans;
[def]     }
[def] }
`)

const topkCpp = code(`
[def] #include <vector>
[def] #include <unordered_map>
[def] #include <queue>
[def] using namespace std;
[def] struct TopKEntry {
[def]     int count;
[def]     int value;
[def] };
[def] struct TopKLess {
[def]     bool operator()(const TopKEntry& a, const TopKEntry& b) const {
[def]         if (a.count != b.count) return a.count > b.count;
[def]         return a.value < b.value;
[def]     }
[def] };
[def] class Solution {
[def] public:
[def]     vector<int> topKFrequent(vector<int>& nums, int k) {
[init]         unordered_map<int, int> freq;
[count]         for (int x : nums) {
[count]             freq[x]++;
[count]         }
[init]         priority_queue<TopKEntry, vector<TopKEntry>, TopKLess> heap;
[keep]         for (const auto& p : freq) {
[keep]             heap.push({p.second, p.first});
[evict]             if ((int)heap.size() > k) {
[evict]                 heap.pop();
[evict]             }
[keep]         }
[extract]         vector<int> ans;
[extract]         ans.reserve(k);
[extract]         while (!heap.empty()) {
[extract]             ans.push_back(heap.top().value);
[extract]             heap.pop();
[extract]         }
[return]         return ans;
[def]     }
[def] };
`)

const topkPseudo = code(`
[def] topKFrequent(nums, k):
[init]   freq = empty map (value -> count)
[count]   for x in nums:
[count]     freq[x] = freq.get(x, 0) + 1
[init]   heap = empty min-heap ordered by (count, larger value first)
[keep]   for key in keys(freq) in first-seen order:
[keep]     push key into heap
[evict]     if size(heap) > k:
[evict]       pop smallest from heap
[extract]   ans = empty list
[extract]   while heap not empty:
[extract]     append pop-smallest(heap) to ans
[return]   return ans
`)

function decodeTopKNums(raw) {
  const value = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!Array.isArray(value)) throw new Error('nums must be an integer array with 1..9 elements')
  if (value.length < 1 || value.length > MAX_TOPK_N) {
    throw new Error('Visual walkthrough shows 1..9 numbers (got ' + value.length + '; judge allows up to 100000)')
  }
  if (!value.every(Number.isSafeInteger)) throw new Error('nums must hold only integers (got non-integer entry)')
  return value.slice()
}

function decodeTopKK(raw, distinct) {
  const value = typeof raw === 'string' && raw.trim() !== '' ? JSON.parse(raw) : raw
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error('k must be an integer with 1 <= k <= distinct count (got ' + String(raw) + ')')
  }
  if (value < 1 || value > distinct) {
    throw new Error('Use k with 1 <= k <= distinct count (got k=' + value + ', distinct=' + distinct + ')')
  }
  return value
}

// Deterministic binary min-heap over values, ordered by rank
// (freq asc, value desc): the top is the weakest candidate and is evicted first,
// so ties keep the smaller value (matches sort-by-(freq desc, value asc)).
function rankLess(freq, a, b) {
  if (freq.get(a) !== freq.get(b)) return freq.get(a) < freq.get(b)
  return a > b
}

function siftUpRank(heap, freq, i) {
  while (i > 0) {
    const parent = (i - 1) >> 1
    if (!rankLess(freq, heap[i], heap[parent])) break
    const tmp = heap[parent]
    heap[parent] = heap[i]
    heap[i] = tmp
    i = parent
  }
}

function siftDownRank(heap, freq, i) {
  const n = heap.length
  for (;;) {
    const left = 2 * i + 1
    const right = 2 * i + 2
    let smallest = i
    if (left < n && rankLess(freq, heap[left], heap[smallest])) smallest = left
    if (right < n && rankLess(freq, heap[right], heap[smallest])) smallest = right
    if (smallest === i) break
    const tmp = heap[smallest]
    heap[smallest] = heap[i]
    heap[i] = tmp
    i = smallest
  }
}

function buildTopKFrequent(args) {
  const source = decodeTopKNums(args[0])
  const freq = new Map()
  for (const x of source) freq.set(x, (freq.get(x) || 0) + 1)
  const order = [...freq.keys()]
  const distinct = order.length
  const k = decodeTopKK(args[1], distinct)
  const n = source.length
  const heap = []
  const frames = []
  const anchors = []

  const freqObj = {}
  // freqObj is the DISPLAYED table: it starts empty and accumulates one sighting
  // per count frame, so frame 0 honestly shows freq={}. The precomputed `freq`
  // map above is only the algorithm input (order/distinct/k validation).

  const state = (current, vars) => ({
    current,
    values: source.slice(),
    freq: { ...freqObj },
    heap: heap.slice(),
    heapKind: 'min-heap by (count, larger value first); top is evicted first',
    vars: { n, k, distinct, ...vars },
  })
  const push = (step, label, note, current, vars = {}) =>
    frames.push(frame(step, label, note, state(current, vars)))

  push('init', 'Initialize', 'n=' + n + ', distinct=' + distinct + ', k=' + k + ', freq={}, heap=[]', null, {})

  for (let i = 0; i < n; i++) {
    const x = source[i]
    freqObj[x] = (freqObj[x] || 0) + 1
    push('count', 'Count nums[' + i + ']', 'see x=' + x + ' -> freq(' + x + ')=' + freqObj[x], i, { x, count: freqObj[x] })
  }

  for (const key of order) {
    heap.push(key)
    siftUpRank(heap, freq, heap.length - 1)
    push('keep', 'Keep ' + key, 'push key=' + key + ' c=' + freq.get(key) + '; heap=[' + heap.join(',') + ']', null, { key, count: freq.get(key), size: heap.length })
    if (heap.length > k) {
      const top = heap[0]
      const last = heap.pop()
      if (heap.length > 0) {
        heap[0] = last
        siftDownRank(heap, freq, 0)
      }
      anchors.push(frames.length)
      push('evict', 'Evict ' + top, 'size>k; pop v=' + top + '; heap=[' + heap.join(',') + '] keeps best-k', null, { key, evicted: top, size: heap.length })
    }
  }

  const ans = []
  while (heap.length > 0) {
    const top = heap[0]
    const last = heap.pop()
    if (heap.length > 0) {
      heap[0] = last
      siftDownRank(heap, freq, 0)
    }
    ans.push(top)
    push('extract', 'Take ' + top, 'ans+=v=' + top + ' -> [' + ans.join(',') + ']', null, { taken: top, size: heap.length })
  }

  anchors.push(frames.length)
  push('return', 'Return answer', 'return [' + ans.join(',') + '] (' + k + ' most frequent, any order)', null, { answer: ans.slice() })
  // Full event list: the host performs the single honest compaction pass.
  return {
    kind: 'array',
    layout: { values: source.slice() },
    frames,
    result: ans,
    anchors,
  }
}

// Find Median from Data Stream — per-question adapter (additive, no shared helper touched).
// Visual bound: at most 12 ops per walkthrough (judge allows 50000 calls); larger
// op lists are rejected, never truncated. Staged source:
// .workers/jobs/question-owners-150/find-median-from-data-stream/adapter.js
// (selfcheck 23/0; faster carry loop cross-validated against the oracle).
function medSiftUpMax(h, i) {
  while (i > 0) {
    const p = (i - 1) >> 1
    if (h[p] >= h[i]) break
    const t = h[p]; h[p] = h[i]; h[i] = t; i = p
  }
}
function medSiftDownMax(h, i) {
  for (;;) {
    const l = 2 * i + 1, r = l + 1
    let m = i
    if (l < h.length && h[l] > h[m]) m = l
    if (r < h.length && h[r] > h[m]) m = r
    if (m === i) break
    const t = h[m]; h[m] = h[i]; h[i] = t; i = m
  }
}
function medSiftUpMin(h, i) {
  while (i > 0) {
    const p = (i - 1) >> 1
    if (h[p] <= h[i]) break
    const t = h[p]; h[p] = h[i]; h[i] = t; i = p
  }
}
function medSiftDownMin(h, i) {
  for (;;) {
    const l = 2 * i + 1, r = l + 1
    let m = i
    if (l < h.length && h[l] < h[m]) m = l
    if (r < h.length && h[r] < h[m]) m = r
    if (m === i) break
    const t = h[m]; h[m] = h[i]; h[i] = t; i = m
  }
}
function medCheckOps(ops) {
  if (!Array.isArray(ops) || ops.length === 0) throw new Error('Provide an op list, e.g. [{op:"add",num:1},{op:"find"}] (at most 12 ops for this walkthrough)')
  if (ops.length > 12) throw new Error('Visual walkthrough shows at most 12 ops (got ' + ops.length + '); the judge supports up to 50000 calls')
  for (const o of ops) {
    if (!o || (o.op !== 'add' && o.op !== 'find')) throw new Error('each op is {op:"add",num} or {op:"find"}')
    if (o.op === 'add' && (!Number.isSafeInteger(o.num) || o.num < -100000 || o.num > 100000)) throw new Error('addNum values respect -10^5 <= num <= 10^5 (got ' + JSON.stringify(o.num) + ')')
  }
  if (!ops.some((o) => o.op === 'find')) throw new Error('ops must include at least one findMedian to conclude')
}

const medianJava = code(`
[def] import java.util.Collections;
[def] import java.util.PriorityQueue;
[def] class MedianFinder {
[init]     private PriorityQueue<Integer> lo;
[init]     private PriorityQueue<Integer> hi;
[init]     public MedianFinder() {
[init]         lo = new PriorityQueue<>(Collections.reverseOrder());
[init]         hi = new PriorityQueue<>();
[init]     }
[add]     public void addNum(int num) {
[add]         lo.offer(num);
[add]         hi.offer(lo.poll());
[add]         if (lo.size() < hi.size()) {
[add]             lo.offer(hi.poll());
[add]         }
[add]     }
[find]     public double findMedian() {
[find]         if (lo.size() > hi.size()) {
[done]             return lo.peek();
[find]         }
[done]         return (lo.peek() + hi.peek()) / 2.0;
[def]     }
[def] }
`)

const medianCpp = code(`
[def] #include <queue>
[def] #include <vector>
[def] class MedianFinder {
[def]     std::priority_queue<int> lo;
[def]     std::priority_queue<int, std::vector<int>, std::greater<int>> hi;
[def] public:
[init]     MedianFinder() {}
[add]     void addNum(int num) {
[add]         lo.push(num);
[add]         hi.push(lo.top()); lo.pop();
[add]         if (lo.size() < hi.size()) {
[add]             lo.push(hi.top()); hi.pop();
[add]         }
[add]     }
[find]     double findMedian() {
[find]         if (lo.size() > hi.size()) {
[done]             return lo.top();
[find]         }
[done]         return (lo.top() + hi.top()) / 2.0;
[def]     }
[def] };
`)

const medianPseudo = code(`
[def] MedianFinder():
[init]   lo = max-heap (lower half); hi = min-heap (upper half)
[add]   addNum(num): offer num to lo
[add]   move lo top to hi (all of lo stays <= all of hi)
[add]   if lo smaller than hi: move hi top back (lo keeps the extra)
[find]   findMedian(): tops only, no mutation
[done]   odd count: lo top is the median; even: mean of both tops
`)

function buildMedianScene(args) {
  let ops = args && args[0]
  if (typeof ops === 'string') {
    try { ops = JSON.parse(ops) }
    catch { throw new Error('Provide ops as a JSON op list, e.g. [{"op":"add","num":1},{"op":"find"}]') }
  }
  ops = (ops || [{ op: 'add', num: 1 }, { op: 'add', num: 2 }, { op: 'find' }]).map((o) => (o.op === 'add' ? { op: 'add', num: o.num } : { op: 'find' }))
  medCheckOps(ops)
  const lo = []
  const hi = []
  const seen = []
  const frames = []
  let lastMedian = null
  let seq = 0
  const state = (op, extra) => ({
    op, seq, num: null, lo: lo.slice(), hi: hi.slice(),
    sorted: seen.slice().sort((a, b) => a - b),
    median: null, lastMedian, move: null, ...(extra || {}),
  })
  const push = (step, label, note, st) => {
    frames.push(frame(step, label, note, st))
  }
  push('init', 'Initialize', 'lo=[] (max-heap) hi=[] (min-heap); no median computed yet', state('init', { settled: true }))
  for (const o of ops) {
    seq += 1
    if (o.op === 'add') {
      const x = o.num
      seen.push(x)
      lo.push(x)
      medSiftUpMax(lo, lo.length - 1)
      push('add', 'addNum(' + x + ') stage', 'offer ' + x + ' into lo -> lo=[' + lo.join(',') + '] (max-heap storage)', state('add', { num: x, stage: 'offer-lo', settled: false }))
      const top = lo[0]
      const last = lo.pop()
      if (lo.length > 0) { lo[0] = last; medSiftDownMax(lo, 0) }
      hi.push(top)
      medSiftUpMin(hi, hi.length - 1)
      const needsRebalance = lo.length < hi.length
      push('add', 'addNum(' + x + ') relay', 'move max ' + top + ' lo->hi; lo=[' + lo.join(',') + '] hi=[' + hi.join(',') + ']' + (needsRebalance ? '; rebalance follows' : ''), state('add', { num: x, stage: 'relay', move: { from: 'lo', to: 'hi', value: top }, settled: !needsRebalance }))
      if (needsRebalance) {
        const rtop = hi[0]
        const rlast = hi.pop()
        if (hi.length > 0) { hi[0] = rlast; medSiftDownMin(hi, 0) }
        lo.push(rtop)
        medSiftUpMax(lo, lo.length - 1)
        push('add', 'addNum(' + x + ') rebalance', 'hi larger; move min ' + rtop + ' hi->lo; lo=[' + lo.join(',') + '] hi=[' + hi.join(',') + ']', state('add', { num: x, stage: 'rebalance', move: { from: 'hi', to: 'lo', value: rtop }, settled: true }))
      }
    } else {
      let m
      if (lo.length > hi.length) m = lo[0]
      else m = (lo[0] + hi[0]) / 2
      lastMedian = m
      const detail = lo.length > hi.length ? 'odd count: lo top ' + lo[0] + ' is the median' : 'even count: (' + lo[0] + ' + ' + hi[0] + ') / 2 = ' + m
      push('find', 'findMedian() -> ' + m, detail + '; heaps unchanged, |lo|=' + lo.length + ' |hi|=' + hi.length, state('find', { median: m, settled: true }))
    }
  }
  push('done', 'Done', 'walkthrough complete; last median ' + (lastMedian === null ? 'none (no find ran)' : lastMedian), state('done', { settled: true }))
  return {
    kind: 'median-two-heaps',
    layout: { ops: ops.map((o) => (o.op === 'add' ? 'addNum(' + o.num + ')' : 'findMedian()')), capacity: ops.length },
    frames,
    result: lastMedian,
    anchors: frames.map((f, i) => i).filter((i) => frames[i].step === 'find'),
  }
}

const mergeKJava = code(`
[def] class Solution {
[def]     public int[] mergeKLists(int[][] lists) {
[init]         java.util.PriorityQueue<int[]> heap = new java.util.PriorityQueue<>((a, b) -> a[0] - b[0]);
[init]         int k = lists.length;
[push]         for (int li = 0; li < k; li++) {
[push]             if (lists[li].length > 0) heap.offer(new int[]{lists[li][0], li, 0});
[push]         }
[init]         java.util.List<Integer> out = new java.util.ArrayList<>();
[pop]         while (!heap.isEmpty()) {
[pop]             int[] cur = heap.poll();
[pop]             out.add(cur[0]);
[push]             int li = cur[1], pos = cur[2] + 1;
[push]             if (pos < lists[li].length) heap.offer(new int[]{lists[li][pos], li, pos});
[pop]         }
[done]         return out.stream().mapToInt(Integer::intValue).toArray();
[def]     }
[def] }
`)

const mergeKCpp = code(`
[def] class Solution {
[def] public:
[def]     vector<int> mergeKLists(vector<vector<int>>& lists) {
[init]         using Node = tuple<int,int,int>;
[init]         priority_queue<Node, vector<Node>, greater<Node>> heap;
[init]         int k = (int)lists.size();
[push]         for (int li = 0; li < k; li++) {
[push]             if (!lists[li].empty()) heap.emplace(lists[li][0], li, 0);
[push]         }
[init]         vector<int> out;
[pop]         while (!heap.empty()) {
[pop]             auto [val, li, pos] = heap.top(); heap.pop();
[pop]             out.push_back(val);
[push]             int nxt = pos + 1;
[push]             if (nxt < (int)lists[li].size()) heap.emplace(lists[li][nxt], li, nxt);
[pop]         }
[done]         return out;
[def]     }
[def] };
`)

const mergeKPseudo = code(`
[def] mergeKLists(lists):
[init]   heap = empty min-heap ordered by head value; k = len(lists)
[push]   for li in 0..k-1:
[push]     if lists[li] non-empty: push (lists[li][0], li, 0)
[init]   out = []
[pop]   while heap not empty:
[pop]     (val, li, pos) = pop-min(heap); append val to out
[push]     if pos+1 < len(lists[li]): push (lists[li][pos+1], li, pos+1)
[done]   return out
`)

// Walkthrough runs the real min-heap k-way merge on array rows (same operation
// as the ListNode reference: heads-only frontier, pop-min, advance that list).
// Staged source: .workers/jobs/question-owners-150/merge-k-sorted-lists/adapter.js
function buildMergeK(args) {
  const raw = args[0]
  const lists = Array.isArray(raw) ? raw.map((row) => (Array.isArray(row) ? row.slice() : null)) : null
  if (!lists || lists.some((row) => !row || row.some((v) => typeof v !== 'number' || !Number.isFinite(v))))
    throw new Error('Provide k sorted integer arrays, e.g. [[1,4,5],[1,3,4],[2,6]], for this walkthrough')
  for (const row of lists) for (let i = 1; i < row.length; i++)
    if (row[i] < row[i - 1]) throw new Error('Each list must be sorted ascending for this walkthrough')
  const k = lists.length
  const heads = lists.map((row) => (row.length > 0 ? 0 : null))
  const heap = []
  const output = []
  const frames = []
  const anchors = []
  const heapSnapshot = () => heap.slice().sort((a, b) => a.val - b.val || a.li - b.li).map((e) => ({ ...e }))
  const state = (current, vars) => ({
    current,
    lists: lists.map((r) => r.slice()),
    heads: heads.slice(),
    heap: heapSnapshot(),
    heapKind: 'min-heap frontier (current head of each live list)',
    lastPopped: vars.lastPopped || null,
    output: output.map((e) => ({ ...e })),
    vars: { k, ...vars.vars },
  })
  const push = (step, label, note, current, vars = {}) =>
    frames.push(frame(step, label, String(note).slice(0, 140), state(current, { ...vars, vars })))
  const nonEmpty = lists.filter((r) => r.length > 0).length
  push('init', 'Set up frontier', 'k=' + k + ' (' + nonEmpty + ' non-empty); push each head once', null, {})
  for (let li = 0; li < k; li++) {
    if (heads[li] === null) continue
    heap.push({ li, pos: 0, val: lists[li][0] })
    push('push', 'Push head L' + li, 'Push ' + lists[li][0] + ' (list ' + li + ', node 0); heap holds ' + heap.length, null, {})
  }
  anchors.push(frames.length - 1)
  const total = lists.reduce((n, r) => n + r.length, 0)
  let guard = 0
  while (heap.length > 0 && guard++ < 10000) {
    let minAt = 0
    for (let i = 1; i < heap.length; i++) if (heap[i].val < heap[minAt].val) minAt = i
    const [cur] = heap.splice(minAt, 1)
    output.push({ li: cur.li, pos: cur.pos, val: cur.val })
    heads[cur.li] = cur.pos + 1 < lists[cur.li].length ? cur.pos + 1 : null
    anchors.push(frames.length)
    push('pop', 'Pop ' + cur.val + ' (L' + cur.li + ')', cur.val + ' is the heap minimum; append output #' + output.length + (heads[cur.li] === null ? '; list ' + cur.li + ' exhausted' : '; advance list ' + cur.li + ' to node ' + heads[cur.li]), null, { lastPopped: { li: cur.li, pos: cur.pos, val: cur.val } })
    if (heads[cur.li] !== null) {
      const pos = heads[cur.li]
      heap.push({ li: cur.li, pos, val: lists[cur.li][pos] })
      push('push', 'Push next L' + cur.li, 'Push ' + lists[cur.li][pos] + ' (list ' + cur.li + ', node ' + pos + '); heap holds ' + heap.length, null, { lastPopped: { li: cur.li, pos: cur.pos, val: cur.val } })
    }
  }
  push('done', 'Return merged output', 'Heap empty; output holds all ' + total + ' values in order', null, {})
  return { kind: 'linked-list', layout: { lists: lists.map((r) => r.slice()) }, frames, result: output.map((e) => e.val), anchors }
}

export const adapters = {
  'kth-largest-element-in-an-array': {
    signature: { name: 'findKthLargest', params: ['int[]', 'int'], return: 'int' },
    lesson: {
      idea: 'Keep a min-heap of the k largest seen; its top is the kth largest.',
      trap: 'Heap is partial order, not sorted; evict the top whenever size exceeds k.',
      time: 'O(n log k)',
      space: 'O(k)',
    },
    explain: {
      init: 'Create an empty min-heap; it will keep only the k largest values seen.',
      offer: 'Push x into the min-heap; the smallest kept value sits at heap top.',
      check: 'Heap holds more than k values, so its top is too small to be the answer.',
      evict: 'Pop the heap top (smallest kept); the heap again holds the k largest seen.',
      return: 'Heap top is the smallest of the k largest: the kth largest overall.'
    },
    explainLines: {
      java: {
        0: 'Class scope holding findKthLargest; no state lives here.',
        1: 'Method declaration: inputs nums and k, returns int. Names/types match the judge signature exactly.',
        7: 'End of the eviction branch: a miss falls through keeping all pushed values.',
        8: 'End of the input loop scope: every value has been offered once.',
        10: 'End of the method scope; the returned heap top above holds the answer.',
        11: 'End of the class scope; it performs no algorithm operation.'
      },
      cpp: {
        0: 'Class scope holding findKthLargest; no state lives here.',
        1: 'Access scope for the public method.',
        2: 'Method declaration: vector<int>& nums plus int k, returns int. Signature matches the judge.',
        8: 'End of the eviction branch scope.',
        9: 'End of the input loop scope: every value has been offered once.',
        11: 'End of the method scope; the returned heap top above holds the answer.',
        12: 'End of the class scope; it performs no algorithm operation.'
      },
      pseudo: {
        0: 'Function scope: inputs nums and k.'
      }
    },
    code: { java: kthJava, cpp: kthCpp, pseudo: kthPseudo },
    build: buildKthLargest,
  },
  'top-k-frequent-elements': {
    signature: { name: 'topKFrequent', params: ['int[]', 'int'], return: 'int[]' },
    lesson: {
      idea: 'Count frequencies, then keep only the k best keys in a size-k min-heap.',
      trap: 'Heap top is the weakest kept key; evict it whenever size exceeds k.',
      time: 'O(n log k)',
      space: 'O(n)',
    },
    code: { java: topkJava, cpp: topkCpp, pseudo: topkPseudo },
    build: buildTopKFrequent,
    explain: topKExplain,
    explainLines: topKExplainLinesStaged,
  },
  'find-median-from-data-stream': {
    signature: { name: 'MedianFinder', params: [{ name: 'ops', type: 'string' }], return: 'float' },
    lesson: {
      idea: 'Split the stream into a max-heap lower half and a min-heap upper half; the median is lo’s top, or the mean of both tops.',
      trap: 'Every addNum stages through lo first, then moves lo’s max to hi, then rebalances; skipping staging breaks the lo <= hi invariant.',
      time: 'O(log n) addNum, O(1) findMedian',
      space: 'O(n)',
      alt: 'Sorted-list insertion keeps one ordered array: findMedian is O(1) but each addNum shifts O(n). The two-heap design trades O(1) reads for O(log n) writes and is the standard choice when adds dominate.'
    },
    explain: {
      def: 'Declares the MedianFinder scope holding two heaps; no median exists until numbers arrive.',
      init: 'Builds both heaps empty; the first addNum will populate them.',
      add: 'Stages the new number through lo, moves lo’s max to hi, then rebalances so lo keeps any extra element.',
      find: 'Reads only the two heap tops without reordering: odd count returns lo’s top, even count returns their mean.',
      done: 'Reports the current median; later adds will move the halves again.'
    },
    code: { java: medianJava, cpp: medianCpp, pseudo: medianPseudo },
    explainLines: {
      java: {
        8: "End of the constructor scope; both heaps are empty and no median exists yet.",
        14: "End of the rebalance branch; a miss falls through with lo holding the extra element.",
        15: "End of addNum; the size and ordering invariant holds again before the next call.",
        19: "End of the odd-count branch; falling through computes the even-count mean below.",
        21: "End of findMedian; the read above never reordered either heap.",
        22: "End of the class scope; it performs no algorithm operation."
      },
      cpp: {
        12: "End of the rebalance branch; a miss keeps the relay result with lo holding the extra.",
        13: "End of addNum; the size and ordering invariant holds again before the next call.",
        17: "End of the odd-count branch; falling through computes the even-count mean below.",
        19: "End of findMedian; top() never mutates either heap.",
        20: "End of the class scope; it performs no algorithm operation."
      },
      pseudo: {
        0: "Constructor header; both halves start empty before any call.",
        4: "Guard line; the move below runs only when hi outgrew lo."
      }
    },
    build: buildMedianScene
  },
  'merge-k-sorted-lists': {
    signature: { name: 'mergeKLists', params: ['int[][]'], return: 'int[]' },
    lesson: {
      idea: 'Hold only the current head of each live list in a min-heap; the heap minimum is always the next merged value.',
      trap: 'Pushing all N nodes at once is O(N log N); pushing only heads keeps O(N log k). Skip empty lists when seeding.',
      time: 'O(N log k)',
      space: 'O(k)',
      alt: 'Divide-and-conquer pairwise merging reuses mergeTwoLists with no heap and O(1) extra space, but longer pairing code and worse constants. The heap version is the canonical answer; on LeetCode the nodes are relinked ListNodes instead of array rows.'
    },
    explain: {
      def: 'Scope of the k-way merge returning all values in order; execution starts in the body.',
      init: 'Build an empty min-heap frontier and an empty output; k is the number of input lists.',
      push: 'Push one head value per non-empty list, then re-push at most one successor after each pop.',
      pop: 'Pop the heap minimum: it is the smallest of all remaining values, so it is the correct next output.',
      done: 'Return the output after the heap drains; every input value appears exactly once in order.'
    },
    explainLines: {
      java: {
        16: 'End of the drain loop: the heap is empty, so every node has been emitted once.',
        17: 'End of the method scope; the returned array above holds all values in order.',
        18: 'End of the class scope; it performs no algorithm operation.'
      },
      cpp: {
        17: 'End of the drain loop: the heap is empty, so every node has been emitted once.',
        18: 'End of the method scope; the returned vector above holds all values in order.',
        19: 'End of the class scope; it performs no algorithm operation.'
      },
      pseudo: {}
    },
    code: { java: mergeKJava, cpp: mergeKCpp, pseudo: mergeKPseudo },
    build: buildMergeK
  },
}
