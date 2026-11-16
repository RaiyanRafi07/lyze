import { code, frame } from './semantic-core.js'

const MAX_PILES = 8
const MAX_VAL = 1000000000

function decodeKokoArgs(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('Provide [piles, h] for this walkthrough')
  const piles = args[0]
  const h = args[1]
  if (!Array.isArray(piles)) throw new Error('piles must be an integer array')
  if (piles.length < 1) throw new Error('Provide at least 1 pile for this walkthrough')
  if (piles.length > MAX_PILES) throw new Error('Visual walkthrough limited to ' + MAX_PILES + ' piles (got ' + piles.length + '); narrow the input')
  for (let i = 0; i < piles.length; i++) {
    const p = piles[i]
    if (!Number.isSafeInteger(p) || p < 1 || p > MAX_VAL) throw new Error('piles[' + i + '] must be an integer 1..' + MAX_VAL)
  }
  if (!Number.isSafeInteger(h) || h < piles.length || h > MAX_VAL) throw new Error('h must be an integer piles.length..' + MAX_VAL)
  return { piles: piles.slice(), h }
}

const kokoJava = code(`
[def] class Solution {
[def]     public int minEatingSpeed(int[] piles, int h) {
[init]         int lo = 1;
[init]         int hi = 0;
[init]         for (int p : piles) hi = Math.max(hi, p);
[init]         int ans = hi;
[probe]         while (lo <= hi) {
[probe]             int mid = lo + (hi - lo) / 2;
[eval]             long hours = 0;
[eval]             for (int p : piles) hours += (p + (long) mid - 1) / mid;
[keep]             if (hours <= h) { ans = mid; hi = mid - 1; }
[drop]             else { lo = mid + 1; }
[def]         }
[return]         return ans;
[def]     }
[def] }
`)

const kokoCpp = code(`
[def] class Solution {
[def] public:
[def]     int minEatingSpeed(vector<int>& piles, int h) {
[init]         int lo = 1;
[init]         int hi = 0;
[init]         for (int p : piles) hi = max(hi, p);
[init]         int ans = hi;
[probe]         while (lo <= hi) {
[probe]             int mid = lo + (hi - lo) / 2;
[eval]             long long hours = 0;
[eval]             for (int p : piles) hours += (p + (long long) mid - 1) / mid;
[keep]             if (hours <= h) { ans = mid; hi = mid - 1; }
[drop]             else { lo = mid + 1; }
[def]         }
[return]         return ans;
[def]     }
[def] };
`)

const kokoPseudo = code(`
[def] minEatingSpeed(piles, h):
[init]   lo = 1; hi = max(piles); ans = hi
[probe]   while lo <= hi:
[probe]     mid = lo + (hi - lo) // 2
[eval]     hours = 0
[eval]     for p in piles: hours += ceil(p / mid)
[keep]     if hours <= h: ans = mid; hi = mid - 1
[drop]     else: lo = mid + 1
[return]   return ans
`)

function ceilDiv(p, mid) {
  return Math.floor((p + mid - 1) / mid)
}

const MAX_ROTATED_N = 12
const MIN_ROTATED_VAL = -10000
const MAX_ROTATED_VAL = 10000

const rotatedJava = code(`
[def] class Solution {
[def]     public int search(int[] nums, int target) {
[init]         int lo = 0;
[init]         int hi = nums.length - 1;
[probe]         while (lo <= hi) {
[probe]             int mid = lo + (hi - lo) / 2;
[probe]             if (nums[mid] == target) return mid;
[sorted]             if (nums[lo] <= nums[mid]) {
[sorted]                 // left half [lo..mid] is sorted
[keep]                 if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
[drop]                 else lo = mid + 1;
[sorted]             } else {
[sorted]                 // right half [mid..hi] is sorted
[drop]                 if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
[keep]                 else hi = mid - 1;
[def]             }
[def]         }
[return]         return -1;
[def]     }
[def] }
`)

const rotatedCpp = code(`
[def] class Solution {
[def] public:
[def]     int search(vector<int>& nums, int target) {
[init]         int lo = 0;
[init]         int hi = (int)nums.size() - 1;
[probe]         while (lo <= hi) {
[probe]             int mid = lo + (hi - lo) / 2;
[probe]             if (nums[mid] == target) return mid;
[sorted]             if (nums[lo] <= nums[mid]) {
[sorted]                 // left half [lo..mid] is sorted
[keep]                 if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
[drop]                 else lo = mid + 1;
[sorted]             } else {
[sorted]                 // right half [mid..hi] is sorted
[drop]                 if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
[keep]                 else hi = mid - 1;
[def]             }
[def]         }
[return]         return -1;
[def]     }
[def] };
`)

const rotatedPseudo = code(`
[def] search(nums, target):
[init]   lo = 0; hi = len(nums) - 1
[probe]   while lo <= hi:
[probe]     mid = lo + (hi - lo) // 2
[probe]     if nums[mid] == target: return mid
[sorted]     if nums[lo] <= nums[mid]:
[sorted]       # left half [lo..mid] sorted
[keep]       if nums[lo] <= target < nums[mid]: hi = mid - 1
[drop]       else: lo = mid + 1
[sorted]     else:
[sorted]       # right half [mid..hi] sorted
[drop]       if nums[mid] < target <= nums[hi]: lo = mid + 1
[keep]       else: hi = mid - 1
[return]   return -1
`)

function decodeRotatedArgs(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('Provide [nums, target] for this walkthrough')
  const nums = args[0]
  const target = args[1]
  if (!Array.isArray(nums)) throw new Error('nums must be an integer array')
  if (nums.length < 1) throw new Error('Provide at least 1 element for this walkthrough')
  if (nums.length > MAX_ROTATED_N) throw new Error('Visual walkthrough limited to ' + MAX_ROTATED_N + ' elements (got ' + nums.length + '); narrow the input')
  for (let i = 0; i < nums.length; i++) {
    const v = nums[i]
    if (!Number.isSafeInteger(v) || v < MIN_ROTATED_VAL || v > MAX_ROTATED_VAL) throw new Error('nums[' + i + '] must be an integer ' + MIN_ROTATED_VAL + '..' + MAX_ROTATED_VAL)
  }
  if (new Set(nums).size !== nums.length) throw new Error('nums must hold distinct values for this walkthrough')
  let drops = 0
  for (let i = 0; i + 1 < nums.length; i++) if (nums[i] > nums[i + 1]) drops++
  if (drops > 1) throw new Error('nums must be a rotated sorted distinct array for this walkthrough')
  if (!Number.isSafeInteger(target) || target < MIN_ROTATED_VAL || target > MAX_ROTATED_VAL) throw new Error('target must be an integer ' + MIN_ROTATED_VAL + '..' + MAX_ROTATED_VAL)
  return { nums: nums.slice(), target }
}

function buildRotated(args) {
  const { nums: source, target } = decodeRotatedArgs(args)
  const n = source.length
  let lo = 0
  let hi = n - 1
  const frames = []
  const anchors = []
  const state = (mid, midVal, sortedHalf) => ({
    nums: source.slice(),
    target,
    lo,
    hi,
    mid,
    midVal,
    sortedHalf,
    n,
    vars: { lo, hi, mid, target, n },
    pointers: { lo, hi, mid }
  })
  const push = (step, label, note, mid, midVal, sortedHalf) =>
    frames.push(frame(step, label, note, state(mid, midVal, sortedHalf)))

  push('init', 'Initialize window', 'nums=[' + source.join(',') + '], target=' + target + '; lo=0, hi=' + hi, null, null, null)

  while (lo <= hi) {
    const curLo = lo
    const curHi = hi
    const mid = lo + Math.floor((hi - lo) / 2)
    const midVal = source[mid]
    push('probe', 'Probe middle', 'mid=' + mid + ' val=' + midVal + ' in [' + curLo + ',' + curHi + ']; test nums[mid]==' + target, mid, midVal, null)
    if (midVal === target) {
      anchors.push(frames.length)
      push('return', 'Return hit', 'nums[' + mid + ']=' + midVal + '==target; return ' + mid, mid, midVal, null)
      return { kind: 'array', layout: { values: source.slice() }, frames, result: mid, anchors }
    }
    const leftSorted = source[curLo] <= midVal
    if (leftSorted) {
      push('sorted', 'Sorted-half evidence', 'nums[lo]=' + source[curLo] + '<=nums[mid]=' + midVal + '; left [' + curLo + '..' + mid + '] sorted', mid, midVal, 'left')
      const inLeft = source[curLo] <= target && target < midVal
      if (inLeft) {
        hi = mid - 1
        anchors.push(frames.length)
        push('keep', 'Target in sorted left', 'target in [' + source[curLo] + ',' + midVal + '); hi=' + hi + ' keep [' + lo + ',' + hi + ']', mid, midVal, 'left')
      } else {
        lo = mid + 1
        anchors.push(frames.length)
        push('drop', 'Target outside sorted left', 'target outside [' + source[curLo] + ',' + midVal + '); lo=' + lo + ' keep [' + lo + ',' + curHi + ']', mid, midVal, 'left')
      }
    } else {
      push('sorted', 'Sorted-half evidence', 'nums[lo]=' + source[curLo] + '>nums[mid]=' + midVal + '; right [' + mid + '..' + curHi + '] sorted', mid, midVal, 'right')
      const inRight = midVal < target && target <= source[curHi]
      if (inRight) {
        lo = mid + 1
        anchors.push(frames.length)
        push('drop', 'Target in sorted right', 'target in (' + midVal + ',' + source[curHi] + ']; lo=' + lo + ' keep [' + lo + ',' + curHi + ']', mid, midVal, 'right')
      } else {
        hi = mid - 1
        anchors.push(frames.length)
        push('keep', 'Target outside sorted right', 'target outside (' + midVal + ',' + source[curHi] + ']; hi=' + hi + ' keep [' + lo + ',' + hi + ']', mid, midVal, 'right')
      }
    }
  }

  anchors.push(frames.length)
  push('return', 'Return missing', 'window empty lo=' + lo + ' hi=' + hi + '; target absent return -1', null, null, null)

  return { kind: 'array', layout: { values: source.slice() }, frames, result: -1, anchors }
}

function buildKoko(args) {
  const { piles: source, h } = decodeKokoArgs(args)
  const n = source.length
  let lo = 1
  let hi = 0
  for (const p of source) hi = Math.max(hi, p)
  let ans = hi
  const frames = []
  const anchors = []
  const state = (mid, hours, feasible) => ({
    piles: source.slice(),
    h,
    lo,
    hi,
    mid,
    hours,
    feasible,
    answer: ans,
    vars: { lo, hi, mid, hours, feasible, ans, n }
  })
  const push = (step, label, note, mid, hours, feasible) =>
    frames.push(frame(step, label, note, state(mid, hours, feasible)))

  push('init', 'Initialize domain', 'piles=[' + source.join(',') + '], h=' + h + '; lo=1, hi=' + hi + ', ans=' + ans, null, null, null)

  while (lo <= hi) {
    const curLo = lo
    const curHi = hi
    const mid = lo + Math.floor((hi - lo) / 2)
    push('probe', 'Probe speed', 'probe k=' + mid + ' in [' + curLo + ',' + curHi + ']; test hours(k)<=' + h, mid, null, null)
    let hours = 0
    push('eval', 'Reset hours', 'hours=0 before scanning ' + n + ' piles at k=' + mid, mid, 0, null)
    for (let i = 0; i < n; i++) {
      const need = ceilDiv(source[i], mid)
      hours += need
      push('eval', 'Pile evidence', 'pile ' + source[i] + ' needs ' + need + 'h at k=' + mid + '; total=' + hours + 'h', mid, hours, null)
    }
    const feasible = hours <= h
    if (feasible) {
      ans = mid
      hi = mid - 1
      anchors.push(frames.length)
      push('keep', 'Feasible: retain left', 'hours=' + hours + '<=' + h + ' true; ans=' + ans + ', keep ['
        + lo + ',' + hi + ']', mid, hours, true)
    } else {
      lo = mid + 1
      anchors.push(frames.length)
      push('drop', 'Infeasible: retain right', 'hours=' + hours + '>' + h + ' false; keep ['
        + lo + ',' + curHi + ']', mid, hours, false)
    }
  }

  anchors.push(frames.length)
  push('return', 'Return minimum', 'minimal feasible k=' + ans + ' finishes in h=' + h, null, null, null)

  return {
    kind: 'array',
    layout: { values: source.slice() },
    frames,
    result: ans,
    anchors
  }
}

const MIN_FIND_N = 1;
const MAX_FIND_N = 9;
const MIN_FIND_VAL = -5000;
const MAX_FIND_VAL = 5000;

function decodeFindMinArgs(args) {
  if (!Array.isArray(args) || args.length !== 1) throw new Error('Provide [nums] for this walkthrough');
  const nums = args[0];
  if (!Array.isArray(nums)) throw new Error('nums must be an integer array');
  if (nums.length < MIN_FIND_N || nums.length > MAX_FIND_N) {
    throw new Error('Visual walkthrough limited to ' + MIN_FIND_N + '..' + MAX_FIND_N + ' elements (got ' + nums.length + '); narrow the input');
  }
  for (let i = 0; i < nums.length; i++) {
    const v = nums[i];
    if (!Number.isSafeInteger(v) || v < MIN_FIND_VAL || v > MAX_FIND_VAL) {
      throw new Error('nums[' + i + '] must be an integer ' + MIN_FIND_VAL + '..' + MAX_FIND_VAL);
    }
  }
  if (new Set(nums).size !== nums.length) throw new Error('nums must hold distinct values for this walkthrough');
  let drops = 0;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] > nums[(i + 1) % nums.length]) drops++;
  }
  if (drops > 1) throw new Error('nums must be a rotated sorted distinct array for this walkthrough');
  return { nums: nums.slice() };
}

const findMinJava = code(`
[def] class Solution {
[def]     public int findMin(int[] nums) {
[init]         int lo = 0;
[init]         int hi = nums.length - 1;
[probe]         while (lo < hi) {
[probe]             int mid = lo + (hi - lo) / 2;
[sorted]             if (nums[mid] > nums[hi]) {
[keep]                 lo = mid + 1;
[sorted]             } else {
[drop]                 hi = mid;
[sorted]             }
[probe]         }
[return]         return nums[lo];
[def]     }
[def] }
`);

const findMinCpp = code(`
[def] class Solution {
[def] public:
[def]     int findMin(vector<int>& nums) {
[init]         int lo = 0;
[init]         int hi = (int)nums.size() - 1;
[probe]         while (lo < hi) {
[probe]             int mid = lo + (hi - lo) / 2;
[sorted]             if (nums[mid] > nums[hi]) {
[keep]                 lo = mid + 1;
[sorted]             } else {
[drop]                 hi = mid;
[sorted]             }
[probe]         }
[return]         return nums[lo];
[def]     }
[def] };
`);

const findMinPseudo = code(`
[def] findMin(nums):
[init]   lo = 0; hi = len(nums) - 1
[probe]   while lo < hi:
[probe]     mid = lo + (hi - lo) // 2
[sorted]     if nums[mid] > nums[hi]:
[keep]       lo = mid + 1
[sorted]     else:
[drop]       hi = mid
[return]   return nums[lo]
`);

function buildFindMin(args) {
  const { nums: source } = decodeFindMinArgs(args);
  const n = source.length;
  let lo = 0;
  let hi = n - 1;
  const frames = [];
  const state = (mid, midVal) => ({
    nums: source.slice(),
    lo,
    hi,
    mid,
    midVal,
    n,
    vars: { lo, hi, mid, n },
    pointers: { lo, hi, mid }
  });
  const push = (step, label, note, mid, midVal) =>
    frames.push(frame(step, label, note, state(mid, midVal)));

  push('init', 'Initialize window', 'nums=[' + source.join(',') + ']; lo=0 hi=' + hi, null, null);

  while (lo < hi) {
    const curLo = lo;
    const curHi = hi;
    const mid = lo + Math.floor((hi - lo) / 2);
    const midVal = source[mid];
    const hiVal = source[curHi];
    push('probe', 'Probe middle', 'mid=' + mid + ' val=' + midVal + ' in [' + curLo + ',' + curHi + ']', mid, midVal);
    if (midVal > hiVal) {
      push('sorted', 'Sorted-half evidence', 'nums[mid]=' + midVal + '>nums[hi]=' + hiVal + '; min is right of mid', mid, midVal);
      lo = mid + 1;
      push('keep', 'Shrink left', 'drop [..' + mid + ']; lo=' + lo + ' keep [' + lo + ',' + curHi + ']', mid, midVal);
    } else {
      push('sorted', 'Sorted-half evidence', 'nums[mid]=' + midVal + '<=nums[hi]=' + hiVal + '; min at/below mid', mid, midVal);
      hi = mid;
      push('drop', 'Shrink right', 'drop [' + (mid + 1) + '..]; hi=' + hi + ' keep [' + curLo + ',' + hi + ']', mid, midVal);
    }
  }

  const result = source[lo];
  push('return', 'Return minimum', 'lo==hi==' + lo + '; min nums[' + lo + ']=' + result, null, null);

  return { kind: 'array', layout: { values: source.slice() }, frames, result };
}

export const adapters = {
  'koko-eating-bananas': {
    signature: { name: 'minEatingSpeed', params: ['int[]', 'int'], return: 'int' },
    lesson: {
      idea: 'Binary-search the answer k: probe a speed, sum ceil(pile/k) as true/false evidence, keep the feasible half.',
      trap: 'Searching pile indices instead of speeds; flooring pile/k or updating lo/hi with mid not mid+/-1.',
      time: 'O(n log max(piles))',
      space: 'O(1)'
    },
    code: { java: kokoJava, cpp: kokoCpp, pseudo: kokoPseudo },
    build: buildKoko,
    explain: {
      def: 'Structural wrapper: declares the class and method scope; no eating-speed operation runs here.',
      init: 'Initialize the answer domain: slowest speed 1, fastest max(piles), best-known answer starts at the top.',
      probe: 'Probe the midpoint speed of the live [lo..hi] domain; the loop invariant is that the minimum feasible k stays inside it or is already recorded in ans.',
      eval: 'Evaluate hours(k) exactly: sum ceil(pile/k) over every pile with a 64-bit accumulator so p+mid-1 never overflows.',
      keep: 'Feasible probe: record k as the new best answer and keep only the strictly slower-or-equal left half.',
      drop: 'Infeasible probe: discard k and everything slower; the answer must be strictly faster, so continue right.',
      return: 'Emit the recorded minimum feasible speed; the domain is empty so no untested candidate can beat it.'
    },
    explainLines: {
      java: ['Class wrapper holding the LeetCode entry point; no execution by itself.', 'Entry point: receives piles and guard-return hours h; returns the minimal feasible integer speed.', 'lo starts at 1: the slowest meaningful speed (k=0 would divide by zero).', 'hi starts at 0 as a running maximum seed before the scan below.', 'Scan every pile once so hi becomes max(piles): at that speed each pile takes exactly 1 hour, always feasible.', 'ans starts at hi: the top speed is feasible, so a valid answer exists before the loop.', 'Loop while the live speed domain [lo..hi] is non-empty; an empty domain means every candidate was classified.', 'mid is the floor midpoint of [lo..hi]; lo+(hi-lo)/2 never overflows.', 'Reset the 64-bit hours accumulator before scoring this probe speed.', 'Score the probe: each pile costs ceil(p/mid) hours via integer (p+mid-1)/mid; the long cast keeps p+mid-1 exact.', 'Feasibility test: hours<=h records mid as the new best and discards mid and everything faster-or-equal above it.', 'Infeasibility branch: hours>h discards mid and every slower speed; continue strictly faster.', 'Close of the loop body; the invariant is restored for the smaller domain.', 'Exhaustion exit: return the smallest speed ever proven feasible.', 'Close of the method scope.', 'Close of the class scope.'],
      cpp: ['Class wrapper holding the LeetCode entry point; no execution by itself.', 'Access specifier: exposes the method exactly as the judge calls it.', 'Entry point: vector reference plus hours h; returns the minimal feasible integer speed.', 'lo starts at 1: the slowest meaningful speed (k=0 would divide by zero).', 'hi starts at 0 as a running maximum seed before the scan below.', 'Scan every pile once so hi becomes max(piles): at that speed each pile takes exactly 1 hour, always feasible.', 'ans starts at hi: the top speed is feasible, so a valid answer exists before the loop.', 'Loop while the live speed domain [lo..hi] is non-empty; an empty domain means every candidate was classified.', 'mid is the floor midpoint of [lo..hi]; lo+(hi-lo)/2 never overflows.', 'Reset the 64-bit hours accumulator before scoring this probe speed.', 'Score the probe: each pile costs ceil(p/mid) hours via integer (p+mid-1)/mid; the long long cast keeps p+mid-1 exact.', 'Feasibility test: hours<=h records mid as the new best and discards mid and everything faster-or-equal above it.', 'Infeasibility branch: hours>h discards mid and every slower speed; continue strictly faster.', 'Close of the loop body; the invariant is restored for the smaller domain.', 'Exhaustion exit: return the smallest speed ever proven feasible.', 'Close of the method scope.', 'Close of the class scope.'],
      pseudo: ['Function header: names the inputs piles and h and the minimal-speed contract.', 'Initialize the answer domain: lo=1, hi=max(piles), best-known ans=hi.', 'Loop while candidate speeds remain; exit means the domain is empty.', 'Pick the floor midpoint speed; the probe for this iteration.', 'Reset the hours accumulator before scoring this probe.', 'Score the probe: sum ceil(p/mid) over every pile.', 'Feasible probe: record mid and keep only the left (slower-or-equal) half.', 'Infeasible probe: discard mid and everything slower; continue right.', 'Exhaustion exit: return the smallest feasible speed recorded.']
    }
  },
  'search-in-rotated-sorted-array': {
    signature: { name: 'search', params: ['int[]', 'int'], return: 'int' },
    lesson: {
      idea: 'Probe mid, name the sorted half by endpoint compare, keep only the half that can hold target.',
      trap: 'Comparing target to mid only; skipping endpoint test or forgetting explicit -1 on missing target.',
      time: 'O(log n)',
      space: 'O(1)'
    },
    code: { java: rotatedJava, cpp: rotatedCpp, pseudo: rotatedPseudo },
    build: buildRotated,
    explain: {
      def: 'Structural wrapper: declares the class and method scope; no array operation runs here.',
      init: 'Initialize the live search window [lo..hi] to the whole array; the invariant holds from here on.',
      probe: 'Probe the midpoint of the live window and test it against target; exactly one window element is read per probe.',
      sorted: 'Name the sorted half by comparing the endpoints: when nums[lo] <= nums[mid] the left half is sorted, otherwise the right half must be.',
      keep: 'Retain the half that can still hold target and discard the other; the window strictly shrinks so the loop terminates.',
      drop: 'Discard the half that cannot hold target and continue in the other; the window strictly shrinks so the loop terminates.',
      return: 'Emit the established answer: the hit index, or -1 only after the window is empty and every remaining candidate was eliminated.'
    },
    explainLines: {
      java: ['Class wrapper holding the LeetCode entry point; no execution by itself.','Entry point: receives the rotated array nums and the wanted target; returns an index or -1.','lo starts at the first index: the live window initially covers the whole array.','hi starts at the last index: together with lo it brackets every candidate.','Loop while the live window is non-empty; an empty window proves absence.','mid is the floor midpoint of [lo..hi]; integer arithmetic never overflows.','Equality probe: the only read that can return; a hit ends the search immediately.','Endpoint test names the sorted half: nums[lo] <= nums[mid] means the left half is sorted.','Comment recording which half the evidence established; guides the branch below.','Left sorted and target inside [nums[lo], nums[mid]): discard the right half.','Left sorted but target outside it: discard the left half including mid.','Else branch: the endpoint test failed, so the right half [mid..hi] is the sorted one.','Comment recording that the right half is the sorted one; guides the branch below.','Right sorted and target inside (nums[mid], nums[hi]]: discard the left half.','Right sorted but target outside it: discard the right half including mid.','Close of the sorted-half branch; one half was kept and the window shrank.','Close of the loop body; the invariant is restored for the smaller window.','Exhaustion exit: the window is empty, so target is absent; report -1.','Close of the method scope.','Close of the class scope.'],
      cpp: ['Class wrapper holding the LeetCode entry point; no execution by itself.','Access specifier: exposes the method exactly as the judge calls it.','Entry point: vector reference plus target; returns an index or -1.','lo starts at the first index: the live window initially covers the whole array.','hi starts at the last index; the cast keeps signed index arithmetic safe.','Loop while the live window is non-empty; an empty window proves absence.','mid is the floor midpoint of [lo..hi]; integer arithmetic never overflows.','Equality probe: the only read that can return; a hit ends the search immediately.','Endpoint test names the sorted half: nums[lo] <= nums[mid] means the left half is sorted.','Comment recording which half the evidence established; guides the branch below.','Left sorted and target inside [nums[lo], nums[mid]): discard the right half.','Left sorted but target outside it: discard the left half including mid.','Else branch: the endpoint test failed, so the right half [mid..hi] is the sorted one.','Comment recording that the right half is the sorted one; guides the branch below.','Right sorted and target inside (nums[mid], nums[hi]]: discard the left half.','Right sorted but target outside it: discard the right half including mid.','Close of the sorted-half branch; one half was kept and the window shrank.','Close of the loop body; the invariant is restored for the smaller window.','Exhaustion exit: the window is empty, so target is absent; report -1.','Close of the method scope.','Close of the class scope.'],
      pseudo: ['Function header: names the inputs nums and target and the index-or--1 contract.','Initialize the live window [lo..hi] to the whole array.','Loop while candidates remain; exit means the window is empty.','Pick the floor midpoint; the probe index for this iteration.','Equality probe: a hit returns at once; otherwise the sorted-half test follows.','Endpoint test: nums[lo] <= nums[mid] certifies the left half as sorted.','Annotation of the established fact: the left half is sorted.','Range test on the sorted left half: keep it only when it can contain target.','Otherwise discard the left half including mid.','Else: the right half [mid..hi] is the sorted one.','Annotation of the established fact: the right half is sorted.','Range test on the sorted right half: keep it only when it can contain target.','Otherwise discard the right half including mid.','Exhaustion exit: no candidate left, so report -1.']
    }
  },
  'find-minimum-in-rotated-sorted-array': {
    signature: { name: 'findMin', params: ['int[]'], return: 'int' },
    lesson: {
      idea: 'Probe mid vs nums[hi]: larger mid means the min sits right, else it sits at/below mid.',
      trap: 'Using <= vs < loop bounds; comparing to nums[lo] only; returning mid instead of nums[lo].',
      time: 'O(log n)',
      space: 'O(1)'
    },
    // Per-line explanations (presentation metadata, never compiled).
    // Distilled from the reviewed delivery-sprint lesson module; the over-length
    // sorted note was shortened to the 140-char contract. The `def` key covers
    // the method line, which the normalizer leaves untagged (only init-tagged
    // signature shapes are remapped).
    explain: {
      def: 'Method scope: takes the rotated sorted array; the halving loop below runs inside it.',
      init: 'Open the window on the whole array; the minimum is trivially inside [lo, hi].',
      probe: 'Halve the window: mid splits [lo, hi] without overflow; the loop runs only while more than one candidate remains.',
      sorted: 'Compare nums[mid] to nums[hi]: larger mid means the minimum is right of mid, else at or below mid.',
      keep: 'Minimum is strictly right of mid, so drop [lo..mid] by moving lo to mid + 1.',
      drop: 'Minimum is at or below mid, so drop (mid..hi] by moving hi down to mid.',
      return: 'Window collapsed to one index; nums[lo] is the established minimum.'
    },
    code: { java: findMinJava, cpp: findMinCpp, pseudo: findMinPseudo },
    build: buildFindMin
  }
}
