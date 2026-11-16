/**
 * last-stone-weight — live semantic adapter (Heap, heap-topk).
 *
 * Walkthrough algorithm: deterministic binary max-heap smash of the actual
 * input — heapify all stones, then each round pop the two heaviest (y heaviest,
 * x second, x <= y); equal stones both vanish, otherwise push back y - x.
 * O(n log n) time, O(n) space.
 *
 * Live record: plugin/data/shard-1.json id 1046 (Easy, pattern heap-topk),
 * judge mode exact, signature lastStoneWeight(int[] stones) -> int, official
 * tests `[2,7,4,1,8,1] -> 1` and `[1] -> 1`, constraints 1 <= n <= 30,
 * 1 <= stones[i] <= 1000.
 *
 * Staged source: .workers/jobs/question-owners-150/last-stone-weight/adapter.js
 * (signature, lesson, Java/C++/pseudocode, per-line notes, max-heap builder) —
 * ported to the live shape: shared helpers imported from semantic-core.js, no
 * local code/frame redefinitions. Signature equals the live judge signature
 * exactly, so the same editor code compiles unchanged.
 *
 * Visual bound: at most 10 stones per walkthrough (judge allows 30). Longer
 * runs throw an honest error instead of silently truncating.
 */
import { code, frame, arrayInput } from './semantic-core.js'

// Visual walkthrough bound (judge allows up to 30 stones).
const MAX_N = 10

const lswJava = code(`
[def] class Solution {
[def]     public int lastStoneWeight(int[] stones) {
[init]         java.util.PriorityQueue<Integer> heap = new java.util.PriorityQueue<>(java.util.Collections.reverseOrder());
[init]         for (int s : stones) {
[init]             heap.offer(s);
[init]         }
[pop]         while (heap.size() > 1) {
[pop]             int y = heap.poll();
[pop]             int x = heap.poll();
[smash]             if (x != y) {
[push]                 heap.offer(y - x);
[smash]             }
[pop]         }
[return]         return heap.isEmpty() ? 0 : heap.peek();
[def]     }
[def] }
`)

const lswCpp = code(`
[def] #include <vector>
[def] #include <queue>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     int lastStoneWeight(vector<int>& stones) {
[init]         priority_queue<int> heap;
[init]         for (int s : stones) {
[init]             heap.push(s);
[init]         }
[pop]         while (heap.size() > 1) {
[pop]             int y = heap.top(); heap.pop();
[pop]             int x = heap.top(); heap.pop();
[smash]             if (x != y) {
[push]                 heap.push(y - x);
[smash]             }
[pop]         }
[return]         return heap.empty() ? 0 : heap.top();
[def]     }
[def] };
`)

const lswPseudo = code(`
[def] lastStoneWeight(stones):
[init]   heap = empty max-heap
[init]   for s in stones:
[init]     push s into heap
[pop]   while size(heap) > 1:
[pop]     y = pop heaviest from heap
[pop]     x = pop heaviest from heap
[smash]     if x != y:
[push]       push (y - x) into heap
[return]   return 0 if heap empty else heaviest in heap
`)

// Line indices below are 0-based positions in lswJava / lswCpp / lswPseudo.
const lswExplain = {
  init: 'Load every stone into a max-heap so the heaviest is always on top.',
  pop: 'Take the two heaviest stones; y is heaviest, x is second (x <= y).',
  smash: 'Equal stones both vanish; otherwise their difference survives.',
  push: 'Push the difference y - x back; it may smash again later.',
  return: 'One or zero stones remain; an empty heap means return 0.',
}

const lswExplainLines = {
  java: {
    0: 'Wrapper class required by the judge harness; no algorithm work.',
    1: 'Entry point: read-only stone weights in, one weight out.',
    2: 'Max-heap (reverse order) keeps the heaviest stone extractable first.',
    3: 'Visit each input stone once to load the working heap.',
    4: 'Insert this stone; the heap restores heaviest-on-top order.',
    5: 'End of the loading loop; the heap now holds every stone.',
    6: 'Repeat while at least two stones can still collide.',
    7: 'Remove and remember the heaviest stone y.',
    8: 'Remove and remember the next heaviest stone x (x <= y).',
    9: 'Equal weights destroy each other, so push back only on difference.',
    10: 'The smash leaves y - x; push it back for future rounds.',
    11: 'End of the equal-or-push branch; the round is resolved.',
    12: 'End of the smash loop; recheck whether two stones remain.',
    13: 'No pair left: 0 when the heap is empty, else the last stone.',
    14: 'End of the method body.',
    15: 'End of the wrapper class.',
  },
  cpp: {
    0: 'Vector header for the stones parameter type.',
    1: 'Priority-queue header for the max-heap.',
    2: 'Standard-library namespace used by the reference code.',
    3: 'Wrapper class required by the judge harness; no algorithm work.',
    4: 'Access specifier for the judged method.',
    5: 'Entry point: read-only stone weights in, one weight out.',
    6: 'Max-heap (default top is largest) keeps the heaviest extractable.',
    7: 'Visit each input stone once to load the working heap.',
    8: 'Insert this stone; the heap restores heaviest-on-top order.',
    9: 'End of the loading loop; the heap now holds every stone.',
    10: 'Repeat while at least two stones remain to collide.',
    11: 'Read the heaviest stone y, then remove it from the heap.',
    12: 'Read the next heaviest stone x (x <= y), then remove it.',
    13: 'Equal weights destroy each other, so push back only on difference.',
    14: 'The smash leaves y - x; push it back for future rounds.',
    15: 'End of the equal-or-push branch; the round is resolved.',
    16: 'End of the smash loop; recheck whether two stones remain.',
    17: 'No pair left: 0 when the heap is empty, else the last stone.',
    18: 'End of the method body.',
    19: 'End of the wrapper class.',
  },
  pseudo: {
    0: 'Entry point: stone weights in, last weight out.',
    1: 'Empty max-heap will always surface the heaviest stone first.',
    2: 'Visit each input stone once to load the working heap.',
    3: 'Insert this stone into the heap.',
    4: 'Repeat while at least two stones can still collide.',
    5: 'Remove and remember the heaviest stone y.',
    6: 'Remove and remember the next heaviest stone x (x <= y).',
    7: 'Equal weights destroy each other, so push back only on difference.',
    8: 'The smash leaves y - x; push it back for future rounds.',
    9: 'No pair left: 0 when the heap is empty, else the last stone.',
  },
}

function decodeStones(raw) {
  const value = typeof raw === 'string' ? JSON.parse(raw) : raw
  const stones = arrayInput(value, MAX_N)
  if (stones.length < 1) throw new Error('stones must hold at least 1 weight for this walkthrough')
  if (!stones.every((s) => s >= 1 && s <= 1000)) {
    throw new Error('stones weights must satisfy 1 <= stones[i] <= 1000 (got out-of-range entry)')
  }
  return stones
}

// Deterministic binary max-heap (heap order, NOT sorted order).
function siftUpMax(heap, i) {
  while (i > 0) {
    const parent = (i - 1) >> 1
    if (heap[parent] >= heap[i]) break
    const tmp = heap[parent]
    heap[parent] = heap[i]
    heap[i] = tmp
    i = parent
  }
}

function siftDownMax(heap, i) {
  const n = heap.length
  for (;;) {
    const left = 2 * i + 1
    const right = 2 * i + 2
    let largest = i
    if (left < n && heap[left] > heap[largest]) largest = left
    if (right < n && heap[right] > heap[largest]) largest = right
    if (largest === i) break
    const tmp = heap[largest]
    heap[largest] = heap[i]
    heap[i] = tmp
    i = largest
  }
}

function heapPush(heap, x) {
  heap.push(x)
  siftUpMax(heap, heap.length - 1)
}

function heapPop(heap) {
  const top = heap[0]
  const last = heap.pop()
  if (heap.length > 0) {
    heap[0] = last
    siftDownMax(heap, 0)
  }
  return top
}

export function buildLastStoneWeight(args) {
  const source = decodeStones(args[0])
  const n = source.length
  const heap = []
  for (const s of source) heapPush(heap, s)
  const frames = []
  const anchors = []

  const state = (current, vars) => ({
    current,
    values: source.slice(),
    heap: heap.slice(),
    heapKind: 'max-heap (partial order; index 0 is heaviest)',
    vars: { n, size: heap.length, ...vars },
  })
  const push = (step, label, note, current, vars = {}) =>
    frames.push(frame(step, label, note, state(current, vars)))

  push('init', 'Initialize', 'n=' + n + ', heap=[' + heap.join(',') + '] (heaviest on top)', null, {})

  let round = 0
  while (heap.length > 1) {
    round += 1
    const y = heapPop(heap)
    push(
      'pop',
      'Take y=' + y,
      'round ' + round + ': pop heaviest y=' + y + '; heap=[' + heap.join(',') + '] (' + heap.length + ' left)',
      null,
      { round, y },
    )
    const x = heapPop(heap)
    push(
      'pop',
      'Take x=' + x,
      'round ' + round + ': pop next x=' + x + '; heap=[' + heap.join(',') + '] (' + heap.length + ' left)',
      null,
      { round, y, x },
    )
    const diff = y - x
    anchors.push(frames.length)
    if (diff === 0) {
      push(
        'smash',
        'Smash ' + y + ' vs ' + x,
        'round ' + round + ': y=' + y + ' vs x=' + x + ': equal, both destroyed',
        null,
        { round, y, x, diff },
      )
    } else {
      push(
        'smash',
        'Smash ' + y + ' vs ' + x,
        'round ' + round + ': y=' + y + ' vs x=' + x + ': ' + y + '-' + x + '=' + diff + ' survives',
        null,
        { round, y, x, diff },
      )
      heapPush(heap, diff)
      push(
        'push',
        'Push ' + diff,
        'round ' + round + ': push ' + diff + '; heap=[' + heap.join(',') + '] (' + heap.length + ' stones)',
        null,
        { round, y, x, diff },
      )
    }
  }

  const answer = heap.length === 0 ? 0 : heap[0]
  anchors.push(frames.length)
  push(
    'return',
    'Return answer',
    heap.length === 0
      ? 'no stones left; return 0'
      : 'last stone weighs ' + answer + '; return ' + answer,
    null,
    { answer },
  )
  // Full event list: the host performs the single honest compaction pass.
  return {
    kind: 'array',
    layout: { values: source.slice() },
    frames,
    result: answer,
    anchors,
  }
}

export const adapters = {
  'last-stone-weight': {
    signature: { name: 'lastStoneWeight', params: ['int[]'], return: 'int' },
    lesson: {
      idea: 'Always smash the two heaviest stones; a max-heap surfaces both in O(log n).',
      trap: 'Equal stones both vanish (push nothing); an empty heap returns 0, not null.',
      time: 'O(n log n)',
      space: 'O(n)',
    },
    code: { java: lswJava, cpp: lswCpp, pseudo: lswPseudo },
    build: buildLastStoneWeight,
    explain: lswExplain,
    explainLines: lswExplainLines,
  },
}
