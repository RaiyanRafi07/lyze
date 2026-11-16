import { code, frame, arrayInput } from './semantic-core.js'

// Visual bound for the walkthrough scene (judge allows far larger inputs).
// Longer visual runs rely on anchors + the single boundedFrames pass in semantic.js.
const MAX_N = 8

const slidingJava = code(`
[def] class Solution {
[def]     public int[] maxSlidingWindow(int[] nums, int k) {
[init]         int n = nums.length;
[init]         int[] ans = new int[n - k + 1];
[init]         java.util.ArrayDeque<Integer> dq = new java.util.ArrayDeque<>();
[scan]         for (int i = 0; i < n; i++) {
[expire]             while (!dq.isEmpty() && dq.peekFirst() <= i - k) dq.pollFirst();
[prune]             while (!dq.isEmpty() && nums[dq.peekLast()] < nums[i]) dq.pollLast();
[push]             dq.offerLast(i);
[write]             if (i >= k - 1) ans[i - k + 1] = nums[dq.peekFirst()];
[def]         }
[return]         return ans;
[def]     }
[def] }
`)

const slidingCpp = code(`
[def] class Solution {
[def] public:
[def]     vector<int> maxSlidingWindow(vector<int>& nums, int k) {
[init]         int n = (int)nums.size();
[init]         vector<int> ans;
[init]         ans.reserve(n - k + 1);
[init]         deque<int> dq;
[scan]         for (int i = 0; i < n; i++) {
[expire]             while (!dq.empty() && dq.front() <= i - k) dq.pop_front();
[prune]             while (!dq.empty() && nums[dq.back()] < nums[i]) dq.pop_back();
[push]             dq.push_back(i);
[write]             if (i >= k - 1) ans.push_back(nums[dq.front()]);
[def]         }
[return]         return ans;
[def]     }
[def] };
`)

const slidingPseudo = code(`
[def] maxSlidingWindow(nums, k):
[init]   n = len(nums); ans = []; dq = []  # dq holds indices, head is front
[scan]   for i = 0 to n - 1:
[expire]     if dq not empty and dq.head <= i - k: pop head
[prune]     while dq not empty and nums[dq.tail] < nums[i]: pop tail
[push]     push i to tail of dq
[write]     if i >= k - 1: ans.append(nums[dq.head])
[return]   return ans
`)

function decodeArgs(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('Walkthrough needs [nums, k].')
  const rawNums = args[0]
  const parsedNums = Array.isArray(rawNums) ? rawNums : JSON.parse(rawNums)
  if (!Array.isArray(parsedNums)) throw new Error('nums must be an integer array.')
  if (parsedNums.length === 0) throw new Error('nums must be non-empty with 1 <= k <= n.')
  if (parsedNums.length > MAX_N) throw new Error('Visual walkthrough bound: nums.length=' + parsedNums.length + ' exceeds MAX_N=' + MAX_N + ' (judge allows up to 100000).')
  const nums = arrayInput(parsedNums, MAX_N)
  let k = args[1]
  if (typeof k === 'string') k = JSON.parse(k)
  if (!Number.isSafeInteger(k)) throw new Error('k must be an integer with 1 <= k <= n=' + nums.length + ' (got ' + String(args[1]) + ').')
  if (k < 1 || k > nums.length) throw new Error('k out of range: need 1 <= k <= n=' + nums.length + ' (got ' + k + ').')
  return [nums, k]
}

function buildSlidingWindow(args) {
  const [nums, k] = decodeArgs(args)
  const source = nums.slice()
  const n = source.length
  const ans = []
  const dq = []
  const frames = []
  const anchors = []

  const state = (current, vars) => ({
    current,
    values: source.slice(),
    deque: dq.slice(),
    answer: ans.slice(),
    pointers: current === null || current === undefined ? {} : { i: current },
    vars: { n, k, i: current, ...vars }
  })
  const push = (step, label, note, current, vars = {}) =>
    frames.push(frame(step, label, note, state(current, vars)))

  push('init', 'Initialize', 'n=' + n + ', k=' + k + ', ans=[], dq=[]', null, {})

  for (let i = 0; i < n; i++) {
    push('scan', 'Scan i=' + i, 'nums[' + i + ']=' + source[i] + ', dq=[' + dq.join(',') + ']', i, { x: source[i] })
    if (dq.length > 0 && dq[0] <= i - k) {
      const out = dq.shift()
      push('expire', 'Expire head ' + out, 'dq.head=' + out + ' <= ' + (i - k) + '; pop head', i, { expired: out })
    } else {
      const head = dq.length ? dq[0] : -1
      push('expire', 'Keep head', dq.length ? 'head=' + head + ' inside [' + (i - k + 1) + ',' + i + ']' : 'dq empty; nothing expires', i, { head })
    }
    let pruned = false
    while (dq.length > 0 && source[dq[dq.length - 1]] < source[i]) {
      const t = dq.pop()
      pruned = true
      push('prune', 'Prune tail ' + t, 'nums[' + t + ']=' + source[t] + ' < ' + source[i] + '; pop tail', i, { pruned: t })
    }
    if (!pruned) {
      if (dq.length === 0) push('prune', 'No prune', 'dq empty; keep order', i, {})
      else push('prune', 'No prune', 'nums[' + dq[dq.length - 1] + ']=' + source[dq[dq.length - 1]] + ' >= ' + source[i] + '; keep', i, { tail: dq[dq.length - 1] })
    }
    dq.push(i)
    push('push', 'Push i=' + i, 'push ' + i + '; dq=[' + dq.join(',') + ']', i, { pushed: i })
    if (i >= k - 1) {
      ans.push(source[dq[0]])
      anchors.push(frames.length)
      push('write', 'Emit window ' + (i - k + 1), 'window [' + (i - k + 1) + ',' + i + '] max=nums[' + dq[0] + ']=' + source[dq[0]], i, { start: i - k + 1, max: source[dq[0]] })
    }
  }

  anchors.push(frames.length)
  push('return', 'Return answer', 'return [' + ans.join(',') + ']', null, {})
  // Full event list: semantic.js performs the single honest compaction pass.
  return {
    kind: 'array',
    layout: { values: source.slice() },
    frames,
    result: ans.slice(),
    anchors
  }
}

export const adapters = {
  'sliding-window-maximum': {
    signature: { name: 'maxSlidingWindow', params: ['int[]', 'int'], return: 'int[]' },
    lesson: {
      idea: 'Deque holds indices with decreasing values; its head is the window maximum.',
      trap: 'Store indices not values; expire head out of window, prune smaller tails only.',
      time: 'O(n)',
      space: 'O(k)'
    },
    code: { java: slidingJava, cpp: slidingCpp, pseudo: slidingPseudo },
    explain: {
      init: 'Set up n, the sized answer array, and the empty index deque.',
      scan: 'Advance the right edge i over every position exactly once.',
      expire: 'Drop the head while it slid out of the current window.',
      prune: 'Pop smaller tails; they can never become a window maximum.',
      push: 'Append i; the deque stays decreasing by value.',
      write: 'Once the window is full, its maximum is the deque head value.',
      return: 'All windows emitted; hand back the answer array.'
    },
    explainLines: {
      java: [
        'Structural wrapper: the Solution class the judge instantiates.',
        'Signature: inputs nums and k, returns the int[] of window maxima.',
        'n caches the array length so the loop bound is read once.',
        'ans is pre-sized to exactly n - k + 1 windows, one slot each.',
        'dq stores indices (never values) with decreasing nums values.',
        'Single left-to-right pass; each index enters and leaves dq once.',
        'Head index <= i - k is left of the window, so pop it from the front.',
        'Strict < keeps equal values: the earlier index stays ahead fairly.',
        'i becomes the newest candidate at the tail of the deque.',
        'From i = k - 1 on, record nums[head] as this window’s maximum.',
        'Structural close of the scan loop; no operation runs here.',
        'Return the filled answer array to the caller.',
        'Structural close of the method; no operation runs here.',
        'Structural close of the class; no operation runs here.'
      ],
      cpp: [
        'Structural wrapper: the Solution class the judge instantiates.',
        'Public section marker; organizational only, runs nothing.',
        'Signature: inputs nums by reference and k, returns vector<int>.',
        'n caches the array size so the loop bound is read once.',
        'ans starts empty and grows by one push per full window.',
        'reserve avoids reallocations; capacity is exactly n - k + 1.',
        'dq stores indices (never values) with decreasing nums values.',
        'Single left-to-right pass; each index enters and leaves dq once.',
        'Head index <= i - k is left of the window, so pop it from the front.',
        'Strict < keeps equal values: the earlier index stays ahead fairly.',
        'i becomes the newest candidate at the back of the deque.',
        'From i = k - 1 on, push nums[front] as this window’s maximum.',
        'Structural close of the scan loop; no operation runs here.',
        'Return the filled answer vector to the caller.',
        'Structural close of the method; no operation runs here.',
        'Structural close of the class; no operation runs here.'
      ],
      pseudo: [
        'Entry point: same inputs and output contract as the typed code.',
        'n, empty answer list, and empty index deque; head means front.',
        'Single left-to-right pass over positions 0 to n - 1.',
        'At most one head can expire per step since the window slides by one.',
        'Pop every tail smaller than nums[i]; equal tails are kept.',
        'Append i; the deque stays decreasing by value after the prune.',
        'Emit once the first full window closes; head holds its maximum.',
        'Return the list of all n - k + 1 window maxima.'
      ]
    },
    build: buildSlidingWindow
  }
}
