/**
 * kth-largest-element-in-a-stream — live walkthrough adapter (Heap / Design, LeetCode 703).
 *
 * Live record: plugin/data/shard-1.json, id 703, judge NULL (design/class problem —
 * KthLargest has a constructor plus add() calls, no single-call function signature,
 * and the host judge supports single-call signatures only). This adapter therefore
 * uses an HONEST TEST PROFILE signature (precedent: runTrieOps / mergeKLists test
 * profiles):
 *   kthLargestAdd(k: int, nums: int[], adds: int[]) -> int[]
 * args = [k, nums, adds] literals ("3", "[4,5,8,2]", "[3,5,10,9,4]");
 * a fresh instance is built from (k, nums), then add() runs once per entry of
 * adds in order; result = the list of add() return values (the kth largest after
 * each call). Official example 1 (k=3, nums=[4,5,8,2], adds=[3,5,10,9,4]) yields
 * [4,5,5,8,8]. judgeCase stays null: no live judge can run a class harness.
 *
 * Ported from .workers/jobs/neetcode150-completion/kth-largest-element-in-a-stream/kth-stream.adapter.mjs
 * (frames, verdicts, signature, code listings and explain map unchanged) onto the
 * semantic-core helpers. Walkthrough bounds (honest disclosure): initial nums <= 6,
 * adds <= 6 (judge allows up to 10^4 each); over-bound inputs throw instead of
 * truncating.
 * Pure, synchronous, dependency-free ES module. No DOM, no network, no randomness.
 * Primary source: https://leetcode.com/problems/kth-largest-element-in-a-stream/
 */
import { code, frame } from './semantic-core.js';

export const SLUG = 'kth-largest-element-in-a-stream';

// Honest TEST PROFILE signature (judge is null; documented above, never presented
// as an official LeetCode method profile).
export const SIGNATURE = {
  name: 'kthLargestAdd',
  params: [
    { name: 'k', type: 'int' },
    { name: 'nums', type: 'int[]' },
    { name: 'adds', type: 'int[]' },
  ],
  return: 'int[]',
};

const MAX_INIT = 6;
const MAX_ADDS = 6;

const javaLines = code(`
[def] class KthLargest {
[def]     java.util.PriorityQueue<Integer> heap;
[def]     int k;
[init]     public KthLargest(int k, int[] nums) {
[init]         this.k = k;
[init]         heap = new java.util.PriorityQueue<>();
[offer]         for (int x : nums) {
[offer]             heap.offer(x);
[check]             if (heap.size() > k) {
[evict]                 heap.poll();
[def]             }
[def]         }
[def]     }
[offer]     public int add(int val) {
[offer]         heap.offer(val);
[check]         if (heap.size() > k) {
[evict]             heap.poll();
[def]         }
[return]         return heap.peek();
[def]     }
[def] }
`);

const cppLines = code(`
[def] class KthLargest {
[def] public:
[def]     int k;
[def]     priority_queue<int, vector<int>, greater<int>> heap;
[init]     KthLargest(int k, vector<int>& nums) : k(k) {
[init]         for (int x : nums) {
[offer]             heap.push(x);
[check]             if ((int)heap.size() > k) {
[evict]                 heap.pop();
[def]             }
[init]         }
[def]     }
[offer]     int add(int val) {
[offer]         heap.push(val);
[check]         if ((int)heap.size() > k) {
[evict]             heap.pop();
[def]         }
[return]         return heap.top();
[def]     }
[def] };
`);

const pseudoLines = code(`
[def] KthLargest(k, nums):
[init]   self.k = k; heap = empty min-heap
[offer]   for x in nums:
[offer]     push x into heap
[check]     if size(heap) > k:
[evict]       pop smallest from heap
[offer] add(val):
[offer]   push val into heap
[check]   if size(heap) > k:
[evict]     pop smallest from heap
[return]   return smallest in heap
`);

const EXPLAIN = {
  init: 'Constructor: remember k and create an empty min-heap that will hold at most k scores.',
  offer: 'Offer: push the next score into the min-heap (heap order, not sorted order).',
  check: 'Check: the heap may hold at most k scores; size k+1 means the smallest must go.',
  evict: 'Evict: pop the heap top (the smallest kept score); the new top is the kth largest.',
  return: 'Return: the heap top is the smallest of the k kept scores, hence the kth largest.',
  def: 'Structural wrapper: opens or closes a scope and performs no algorithm operation.',
};

// Per-line notes derived from the real parsed lines: each line explains its own
// recorded operation step (never invented; structural wrappers get scope notes
// from semantic.js).
const explainLinesFor = (lines) => lines.map((l) => EXPLAIN[l.step] || null);
const EXPLAIN_LINES = {
  java: explainLinesFor(javaLines),
  cpp: explainLinesFor(cppLines),
  pseudo: explainLinesFor(pseudoLines),
};

function decodeK(raw) {
  const v = typeof raw === 'string' && raw.trim() !== '' ? JSON.parse(raw) : raw;
  if (typeof v !== 'number' || !Number.isSafeInteger(v)) throw new Error('k must be an integer with 1 <= k');
  if (v < 1) throw new Error('Use k >= 1 (got k=' + v + ')');
  return v;
}

function decodeArr(raw, name, max, { allowEmpty = true } = {}) {
  const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!Array.isArray(v)) throw new Error(name + ' must be an integer array');
  if (!v.every(Number.isSafeInteger)) throw new Error(name + ' must hold only integers');
  if (!allowEmpty && v.length === 0) throw new Error(name + ' must hold at least 1 number for this walkthrough');
  if (v.length > max) {
    throw new Error('Visual walkthrough shows at most ' + max + ' ' + name + ' values (judge allows up to 10000)');
  }
  for (const x of v) {
    if (x < -10000 || x > 10000) throw new Error(name + ' value ' + x + ' is outside [-10000, 10000]');
  }
  return v.slice();
}

function siftUp(heap, i) {
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heap[p] <= heap[i]) break;
    const t = heap[p]; heap[p] = heap[i]; heap[i] = t;
    i = p;
  }
}

function siftDown(heap, i) {
  const n = heap.length;
  for (;;) {
    const l = 2 * i + 1; const r = 2 * i + 2;
    let s = i;
    if (l < n && heap[l] < heap[s]) s = l;
    if (r < n && heap[r] < heap[s]) s = r;
    if (s === i) break;
    const t = heap[s]; heap[s] = heap[i]; heap[i] = t;
    i = s;
  }
}

function heapOffer(heap, x) { heap.push(x); siftUp(heap, heap.length - 1); }

function heapPoll(heap) {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length > 0) { heap[0] = last; siftDown(heap, 0); }
  return top;
}

/** Canonical staged executor: fresh instance, then each add() in order. */
export function runStaged(k, nums, adds) {
  const heap = [];
  for (const x of nums) { heapOffer(heap, x); if (heap.length > k) heapPoll(heap); }
  const out = [];
  for (const v of adds) { heapOffer(heap, v); if (heap.length > k) heapPoll(heap); out.push(heap[0]); }
  return out;
}

function build(args) {
  if (!Array.isArray(args) || args.length !== 3) {
    throw new Error('kth-largest-element-in-a-stream walkthrough needs args [k, nums, adds]');
  }
  const k = decodeK(args[0]);
  const nums = decodeArr(args[1], 'nums', MAX_INIT, { allowEmpty: true });
  const adds = decodeArr(args[2], 'adds', MAX_ADDS, { allowEmpty: false });
  if (k > nums.length + adds.length) {
    throw new Error('Use k <= nums.length + adds.length (got k=' + k + ') so every add() has a kth score');
  }
  const heap = [];
  const frames = [];
  const anchors = [];
  const outputs = [];

  const state = (current, vars) => ({
    current,
    values: nums.slice(),
    adds: adds.slice(),
    outputs: outputs.slice(),
    heap: heap.slice(),
    heapKind: 'min-heap (heap order; index 0 is smallest kept)',
    vars: { k, nInit: nums.length, nAdds: adds.length, ...vars },
  });
  const push = (step, label, note, current, vars = {}) =>
    frames.push(frame(step, label, note, state(current, vars)));

  push('init', 'Initialize', 'k=' + k + ', nums=[' + nums.join(',') + '], adds=[' + adds.join(',') + '], heap=[]', null, {});

  nums.forEach((x, i) => {
    heapOffer(heap, x);
    push('offer', 'Offer nums[' + i + ']', 'offer x=' + x + '; heap=[' + heap.join(',') + '] (heap order)', i, { phase: 'ctor', x, size: heap.length });
    if (heap.length > k) {
      push('check', 'Check size', 'size=' + heap.length + ' > k=' + k + '; evict smallest next', i, { phase: 'ctor', x, size: heap.length });
      const evicted = heapPoll(heap);
      anchors.push(frames.length);
      push('evict', 'Evict ' + evicted, 'evict top=' + evicted + '; heap=[' + heap.join(',') + '] keeps k largest', i, { phase: 'ctor', x, evicted, size: heap.length });
    } else {
      push('check', 'Check size', 'size=' + heap.length + ' <= k=' + k + '; keep x=' + x, i, { phase: 'ctor', x, size: heap.length });
    }
  });

  adds.forEach((v, j) => {
    heapOffer(heap, v);
    push('offer', 'Add ' + v, 'add(val=' + v + '); heap=[' + heap.join(',') + '] (heap order)', j, { phase: 'add', val: v, size: heap.length });
    if (heap.length > k) {
      push('check', 'Check size', 'size=' + heap.length + ' > k=' + k + '; evict smallest next', j, { phase: 'add', val: v, size: heap.length });
      const evicted = heapPoll(heap);
      anchors.push(frames.length);
      push('evict', 'Evict ' + evicted, 'evict top=' + evicted + '; heap=[' + heap.join(',') + ']', j, { phase: 'add', val: v, evicted, size: heap.length });
    } else {
      // Reachable only when k > nums.length (first adds fill the heap up to k).
      push('check', 'Check size', 'size=' + heap.length + ' <= k=' + k + '; keep val=' + v, j, { phase: 'add', val: v, size: heap.length });
    }
    outputs.push(heap[0]);
    push('return', 'Return ' + heap[0], 'add(' + v + ') -> ' + heap[0] + '; outputs=[' + outputs.join(',') + ']', j, { phase: 'add', val: v, answer: heap[0] });
  });

  anchors.push(frames.length);
  return {
    kind: 'array',
    layout: { values: nums.slice() },
    frames,
    result: outputs.slice(),
    anchors,
  };
}

/** Official example 1 as staged literals (ctor row inlined as k/nums/adds). */
export function datasetExampleArgs() {
  return ['3', '[4,5,8,2]', '[3,5,10,9,4]'];
}

export const DATASET_EXPECTED = [4, 5, 5, 8, 8];

export const adapters = {
  'kth-largest-element-in-a-stream': {
    signature: { name: 'kthLargestAdd', params: ['int', 'int[]', 'int[]'], return: 'int[]' },
    lesson: {
      idea: 'Keep only the k largest scores in a min-heap; its top is the kth largest.',
      trap: 'Heap array order is not sorted; never read heap[1] as 2nd largest. Evict whenever size exceeds k.',
      time: 'O((m+n) log k) for m initial scores and n add() calls',
      space: 'O(k)',
    },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    code: { java: javaLines, cpp: cppLines, pseudo: pseudoLines },
    build,
  },
};

export default adapters['kth-largest-element-in-a-stream'];
