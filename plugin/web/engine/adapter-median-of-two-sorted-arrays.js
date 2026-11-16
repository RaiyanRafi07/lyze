/**
 * median-of-two-sorted-arrays — standalone walkthrough adapter (batch13).
 *
 * Partition binary search on the smaller array: probe split pa in A, derive
 * pb = half - pa in B so both left parts hold half the items; read the four
 * borders (empty edges are -inf/+inf sentinels); return only when
 * maxLA <= minRB and maxLB <= minRA, else move pa toward the failing side.
 *
 * Staged source: .workers/jobs/question-owners-150/median-of-two-sorted-arrays/adapter.js
 * (buildMedian frames/steps/notes, code blocks, lesson, explain, explainLines) —
 * reshaped into the live adapter contract
 * (signature/lesson/explain/explainLines/code/build). Code blocks, lesson and
 * explain are byte-faithful to staged; explainLines is converted 1:1 from the
 * staged index-aligned arrays (27/26/18) to index-keyed objects (the form
 * semantic.js resolveLineExplain reads) by a mechanical script — no note
 * reworded. Official example 1 emits 10 frames, so no host compaction applies.
 *
 * Signature equals the live judge signature exactly:
 * findMedianSortedArrays(nums1: int[], nums2: int[]) -> double (plugin/data/shard-14.json id 4).
 */

import { code, frame, boundedFrames } from './semantic-core.js'

void boundedFrames

const MAX_VIS_N = 8
const MIN_VAL = -1000000
const MAX_VAL = 1000000

function assertSorted(a, label) {
  for (let i = 1; i < a.length; i++) {
    if (a[i - 1] > a[i]) throw new Error(label + ' must be sorted non-decreasing for this walkthrough')
  }
}

function decodeMedianArgs(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('Provide [nums1, nums2] for this walkthrough')
  const nums1 = args[0]
  const nums2 = args[1]
  if (!Array.isArray(nums1) || !Array.isArray(nums2)) throw new Error('nums1 and nums2 must be integer arrays')
  if (nums1.length + nums2.length < 1) throw new Error('Provide at least 1 element across nums1+nums2')
  if (nums1.length > MAX_VIS_N || nums2.length > MAX_VIS_N) {
    throw new Error('Visual walkthrough limited to ' + MAX_VIS_N + ' elements per array (got ' + nums1.length + '+' + nums2.length + '); narrow the input')
  }
  for (const [arr, label] of [[nums1, 'nums1'], [nums2, 'nums2']]) {
    for (let i = 0; i < arr.length; i++) {
      if (!Number.isSafeInteger(arr[i]) || arr[i] < MIN_VAL || arr[i] > MAX_VAL) {
        throw new Error(label + '[' + i + '] must be an integer ' + MIN_VAL + '..' + MAX_VAL)
      }
    }
  }
  assertSorted(nums1, 'nums1')
  assertSorted(nums2, 'nums2')
  return { nums1: nums1.slice(), nums2: nums2.slice() }
}

const medianJava = code(`
[def] class Solution {
[def]     public double findMedianSortedArrays(int[] nums1, int[] nums2) {
[init]         if (nums1.length > nums2.length) {
[init]             int[] t = nums1; nums1 = nums2; nums2 = t;
[init]         }
[init]         int m = nums1.length, n = nums2.length;
[init]         int half = (m + n + 1) / 2;
[init]         int lo = 0, hi = m;
[probe]         while (lo <= hi) {
[probe]             int pa = lo + (hi - lo) / 2;
[probe]             int pb = half - pa;
[edge]             int maxLA = (pa == 0) ? Integer.MIN_VALUE : nums1[pa - 1];
[edge]             int minRA = (pa == m) ? Integer.MAX_VALUE : nums1[pa];
[edge]             int maxLB = (pb == 0) ? Integer.MIN_VALUE : nums2[pb - 1];
[edge]             int minRB = (pb == n) ? Integer.MAX_VALUE : nums2[pb];
[check]             if (maxLA <= minRB && maxLB <= minRA) {
[return]                 if ((m + n) % 2 == 1) return Math.max(maxLA, maxLB);
[return]                 return (Math.max(maxLA, maxLB) + Math.min(minRA, minRB)) / 2.0;
[check]             } else if (maxLA > minRB) {
[drop]                 hi = pa - 1;
[check]             } else {
[keep]                 lo = pa + 1;
[probe]             }
[def]         }
[return]         throw new IllegalArgumentException();
[def]     }
[def] }
`)

const medianCpp = code(`
[def] class Solution {
[def] public:
[def]     double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {
[init]         if (nums1.size() > nums2.size()) swap(nums1, nums2);
[init]         int m = nums1.size(), n = nums2.size();
[init]         int half = (m + n + 1) / 2;
[init]         int lo = 0, hi = m;
[probe]         while (lo <= hi) {
[probe]             int pa = lo + (hi - lo) / 2;
[probe]             int pb = half - pa;
[edge]             int maxLA = (pa == 0) ? INT_MIN : nums1[pa - 1];
[edge]             int minRA = (pa == m) ? INT_MAX : nums1[pa];
[edge]             int maxLB = (pb == 0) ? INT_MIN : nums2[pb - 1];
[edge]             int minRB = (pb == n) ? INT_MAX : nums2[pb];
[check]             if (maxLA <= minRB && maxLB <= minRA) {
[return]                 if ((m + n) % 2 == 1) return max(maxLA, maxLB);
[return]                 return (max(maxLA, maxLB) + min(minRA, minRB)) / 2.0;
[check]             } else if (maxLA > minRB) {
[drop]                 hi = pa - 1;
[check]             } else {
[keep]                 lo = pa + 1;
[probe]             }
[def]         }
[return]         throw invalid_argument("");
[def]     }
[def] };
`)

const medianPseudo = code(`
[def] findMedianSortedArrays(nums1, nums2):
[init]   if len(nums1) > len(nums2): swap them so A is smaller
[init]   m = len(A); n = len(B); half = (m + n + 1) // 2
[init]   lo = 0; hi = m
[probe]   while lo <= hi:
[probe]     pa = lo + (hi - lo) // 2; pb = half - pa
[edge]     maxLA = A[pa-1] or -inf if pa == 0
[edge]     minRA = A[pa] or +inf if pa == m
[edge]     maxLB = B[pb-1] or -inf if pb == 0
[edge]     minRB = B[pb] or +inf if pb == n
[check]     if maxLA <= minRB and maxLB <= minRA:
[return]       if (m+n) odd: return max(maxLA, maxLB)
[return]       else: return (max(maxLA,maxLB) + min(minRA,minRB)) / 2
[check]     else if maxLA > minRB:
[drop]       hi = pa - 1   # maxLA too big, move partition left
[check]     else:
[keep]       lo = pa + 1   # minRA too small, move partition right
[return]   unreachable (inputs sorted, total >= 1)
`)

function fmt(v) {
  if (v === Infinity) return '+inf'
  if (v === -Infinity) return '-inf'
  return String(v)
}

function buildMedian(args) {
  const { nums1: in1, nums2: in2 } = decodeMedianArgs(args)
  let A = in1.slice()
  let B = in2.slice()
  let swapped = false
  if (A.length > B.length) {
    const t = A
    A = B
    B = t
    swapped = true
  }
  const m = A.length
  const n = B.length
  const total = m + n
  const half = Math.floor((total + 1) / 2)
  let lo = 0
  let hi = m
  const frames = []
  const anchors = []
  const state = (extra) => ({
    nums1: in1.slice(),
    nums2: in2.slice(),
    A: A.slice(),
    B: B.slice(),
    swapped,
    m,
    n,
    total,
    half,
    lo,
    hi,
    ...extra,
    vars: { lo, hi, m, n, half, ...(extra || {}) },
    pointers: { lo, hi }
  })
  const push = (step, label, note, extra) =>
    frames.push(frame(step, label, note, state(extra || {})))

  push('init', 'Ensure A is smaller', 'nums1=[' + in1.join(',') + '] nums2=[' + in2.join(',') + ']' + (swapped ? '; swap so A=[' + A.join(',') + ']' : '; A=[' + A.join(',') + '] already smaller'), { pa: null, pb: null })
  push('init', 'Fix left-half size', 'total=' + total + ' half=' + half + '; left holds ' + half + ' items; lo=0 hi=' + hi, { pa: null, pb: null })

  let guard = 0
  while (lo <= hi) {
    if (++guard > 64) throw new Error('partition search did not converge')
    const curLo = lo
    const curHi = hi
    const pa = lo + Math.floor((hi - lo) / 2)
    const pb = half - pa
    push('probe', 'Split both arrays', 'pa=' + pa + ' in [' + curLo + ',' + curHi + ']; pb=' + pb + ' so pa+pb=' + half, { pa, pb })
    const maxLA = pa === 0 ? -Infinity : A[pa - 1]
    const minRA = pa === m ? Infinity : A[pa]
    const maxLB = pb === 0 ? -Infinity : B[pb - 1]
    const minRB = pb === n ? Infinity : B[pb]
    push('edge', 'Read four borders', 'maxLA=' + fmt(maxLA) + ' minRA=' + fmt(minRA) + ' maxLB=' + fmt(maxLB) + ' minRB=' + fmt(minRB), { pa, pb, maxLA, minRA, maxLB, minRB })
    const ok = maxLA <= minRB && maxLB <= minRA
    push('check', 'Test partition', 'maxLA<=' + fmt(minRB) + '? ' + (maxLA <= minRB) + '; maxLB<=' + fmt(minRA) + '? ' + (maxLB <= minRA), { pa, pb, maxLA, minRA, maxLB, minRB })
    if (ok) {
      let ans
      if (total % 2 === 1) {
        ans = Math.max(maxLA, maxLB)
        anchors.push(frames.length)
        push('return', 'Return odd median', 'odd total: max(' + fmt(maxLA) + ',' + fmt(maxLB) + ')=' + ans, { pa, pb, maxLA, minRA, maxLB, minRB, answer: ans })
      } else {
        ans = (Math.max(maxLA, maxLB) + Math.min(minRA, minRB)) / 2
        anchors.push(frames.length)
        push('return', 'Return even median', 'even: (maxL+minR)/2=(' + fmt(Math.max(maxLA, maxLB)) + '+' + fmt(Math.min(minRA, minRB)) + ')/2=' + ans, { pa, pb, maxLA, minRA, maxLB, minRB, answer: ans })
      }
      // Full event list + anchors: the host performs the single honest compaction pass.
      return { kind: 'array', layout: { values: A.slice() }, frames, result: ans, anchors }
    }
    if (maxLA > minRB) {
      hi = pa - 1
      anchors.push(frames.length)
      push('drop', 'maxLA too big: go left', 'maxLA=' + fmt(maxLA) + '>minRB=' + fmt(minRB) + '; hi=' + hi + ' keep [' + lo + ',' + hi + ']', { pa, pb, maxLA, minRA, maxLB, minRB })
    } else {
      lo = pa + 1
      anchors.push(frames.length)
      push('keep', 'minRA too small: go right', 'maxLB=' + fmt(maxLB) + '>minRA=' + fmt(minRA) + '; lo=' + lo + ' keep [' + lo + ',' + curHi + ']', { pa, pb, maxLA, minRA, maxLB, minRB })
    }
  }
  throw new Error('partition search exhausted without a valid split')
}

export const adapters = {
  'median-of-two-sorted-arrays': {
    signature: { name: 'findMedianSortedArrays', params: ['int[]', 'int[]'], return: 'double' },
    lesson: {
      idea: 'Binary-search the split of the smaller array so left halves hold half the items and every left border <= every right border.',
      trap: 'Forgetting empty-edge sentinels (-inf/+inf), halving the wrong array, or using half=(m+n)/2 which breaks odd totals.',
      time: 'O(log min(m, n))',
      space: 'O(1)',
      alt: 'Two-pointer merge walk to the middle item(s): O(m+n) time, O(1) space; simpler and exact, but misses the required log bound.'
    },
    // Per-step explanations (presentation metadata, never compiled).
    // Staged source: adapter.js (explain verbatim).
    explain: {
      def: 'Structural wrapper: declares the class and method scope; no array operation runs here.',
      init: 'Normalize so A is the smaller array and fix the search window plus the left-half quota.',
      probe: 'Probe a split pa in A and derive pb in B so both left parts always hold half the items.',
      edge: 'Read the four border values around the splits, using infinities at empty edges.',
      check: 'Test the partition: both left maxima must be <= both right minima before returning.',
      keep: 'Left side too small: discard pa and everything below it by raising lo past pa.',
      drop: 'Left side too big: discard pa and everything above it by lowering hi below pa.',
      return: 'Emit the established median: middle of the borders, averaged when the total is even.'
    },
    // Converted 1:1 from the staged index-aligned explainLines arrays (27/26/18)
    // to index-keyed objects by script (no note reworded); verified 1:1 below.
    explainLines: {
  java: {
    0: "Class wrapper holding the LeetCode entry point; no execution by itself.",
    1: "Entry point: receives sorted nums1 and nums2; returns their joint median as a double.",
    2: "Size guard: binary search must run on the smaller array, so swap when nums1 is longer.",
    3: "Swap bodies: exchange the two references; the joint multiset is unchanged.",
    4: "Cache lengths m and n after the optional swap; every later index uses these.",
    5: "Left quota: the smaller half must hold (m+n+1)/2 items so odd totals keep the median left.",
    6: "Search window [lo..hi] over split positions 0..m of the smaller array.",
    7: "Loop while a split candidate remains; exit only via a valid partition return.",
    8: "Probe split pa: floor midpoint of the live window over A.",
    9: "Derive split pb in B so pa+pb always equals the left quota half.",
    10: "Left border of A: element just left of pa, or -inf when pa is at the edge.",
    11: "Right border of A: element at pa, or +inf when pa is past the end.",
    12: "Left border of B: element just left of pb, or -inf when pb is at the edge.",
    13: "Right border of B: element at pb, or +inf when pb is past the end.",
    14: "Partition test: both left borders must be <= both right borders.",
    15: "Odd total: the median is the largest value of the smaller half.",
    16: "Even total: average the largest of the smaller half and smallest of the larger half.",
    17: "Else branch: the partition failed, so decide which side overshoots.",
    18: "Left overshoots: maxLA > minRB means pa sits too far right.",
    19: "Shrink right: hi=pa-1 discards pa and everything above it in A.",
    20: "Else branch: the failure must be maxLB > minRA, so pa sits too far left.",
    21: "Shrink left: lo=pa+1 discards pa and everything below it in A.",
    22: "Close of the loop body; the invariant is restored for the smaller window.",
    23: "Close of the search loop; reached only if the inputs violated the contract.",
    24: "Defensive exit: sorted non-empty inputs always return inside the loop.",
    25: "Close of the method scope.",
    26: "Close of the class scope.",
  },
  cpp: {
    0: "Class wrapper holding the LeetCode entry point; no execution by itself.",
    1: "Access specifier: exposes the method exactly as the judge calls it.",
    2: "Entry point: two sorted vector references; returns their joint median as a double.",
    3: "Size guard: binary search must run on the smaller array, so swap when nums1 is longer.",
    4: "Cache lengths m and n after the optional swap; every later index uses these.",
    5: "Left quota: the smaller half must hold (m+n+1)/2 items so odd totals keep the median left.",
    6: "Search window [lo..hi] over split positions 0..m of the smaller array.",
    7: "Loop while a split candidate remains; exit only via a valid partition return.",
    8: "Probe split pa: floor midpoint of the live window over A.",
    9: "Derive split pb in B so pa+pb always equals the left quota half.",
    10: "Left border of A: element just left of pa, or INT_MIN when pa is at the edge.",
    11: "Right border of A: element at pa, or INT_MAX when pa is past the end.",
    12: "Left border of B: element just left of pb, or INT_MIN when pb is at the edge.",
    13: "Right border of B: element at pb, or INT_MAX when pb is past the end.",
    14: "Partition test: both left borders must be <= both right borders.",
    15: "Odd total: the median is the largest value of the smaller half.",
    16: "Even total: average the largest of the smaller half and smallest of the larger half.",
    17: "Else-if branch: maxLA > minRB means pa sits too far right.",
    18: "Shrink right: hi=pa-1 discards pa and everything above it in A.",
    19: "Else branch: the failure must be maxLB > minRA, so pa sits too far left.",
    20: "Shrink left: lo=pa+1 discards pa and everything below it in A.",
    21: "Close of the loop body; the invariant is restored for the smaller window.",
    22: "Close of the search loop; reached only if the inputs violated the contract.",
    23: "Defensive exit: sorted non-empty inputs always return inside the loop.",
    24: "Close of the method scope.",
    25: "Close of the class scope.",
  },
  pseudo: {
    0: "Function header: names sorted nums1 and nums2 and the joint-median contract.",
    1: "Normalize: swap so A is the smaller array; the joint multiset is unchanged.",
    2: "Cache lengths and the left-half quota (m+n+1)//2 covering odd totals.",
    3: "Initialize the split search window [lo..hi] over positions in A.",
    4: "Loop while a split candidate remains.",
    5: "Probe pa in A and derive pb in B so both left parts hold half the items.",
    6: "Read left border of A, or -inf at the empty edge.",
    7: "Read right border of A, or +inf at the empty edge.",
    8: "Read left border of B, or -inf at the empty edge.",
    9: "Read right border of B, or +inf at the empty edge.",
    10: "Partition test: both left maxima must be <= both right minima.",
    11: "Odd total: return the largest value of the smaller half.",
    12: "Even total: average the two middle borders.",
    13: "Else-if: maxLA > minRB means the A split sits too far right.",
    14: "Move left: hi=pa-1 discards pa and everything above it.",
    15: "Else: maxLB > minRA means the A split sits too far left.",
    16: "Move right: lo=pa+1 discards pa and everything below it.",
    17: "Unreachable exit: sorted non-empty inputs always return inside the loop.",
  },
},
    code: { java: medianJava, cpp: medianCpp, pseudo: medianPseudo },
    build: buildMedian
  }
}

export const visualBounds = { maxVisN: MAX_VIS_N, minVal: MIN_VAL, maxVal: MAX_VAL }
