/** Find First and Last Position of Element in Sorted Array — portable per-slug adapter (binary-search).
 * Two biased binary searches on the actual input: the left pass keeps going left
 * on a hit (hi = mid - 1) to find the first occurrence, the right pass keeps
 * going right on a hit (lo = mid + 1) to find the last occurrence. Pure +
 * synchronous; never throws on import. Out-of-range or unsorted inputs throw
 * instead of rendering. Duplicates are legal here (non-decreasing order), so
 * the sorted gate allows repeats — unlike the distinct-only binary-search entry.
 * Register under slug `find-first-and-last-position-of-element-in-sorted-array`.
 * Live shape: separate per-slug file following adapter-3sum-closest.js
 * (keeps the search family file untouched; semantic.js spreads `adapters`).
 * Staged source: .workers/jobs/deck-release/catalog-expansion/lessons/find-first-and-last-position-of-element-in-sorted-array/find-first-and-last-position-of-element-in-sorted-array-adapter.js (verbatim below except import + adapters map).
 */
import { code, frame, boundedFrames } from './semantic-core.js';

export const MAX_N = 12;
export const MIN_VAL = -1000000000;
export const MAX_VAL = 1000000000;
export const MAX_FRAMES = 40;

export const SIGNATURE = Object.freeze({
  name: 'searchRange',
  params: Object.freeze(['int[]', 'int']),
  return: 'int[]',
});

const rangeCode = {
  java: code(`
[structure] class Solution {
[signature]     public int[] searchRange(int[] nums, int target) {
[init]         int left = findBound(nums, target, true);
[init]         int right = findBound(nums, target, false);
[return]         return new int[]{left, right};
[signature]     }
[signature]     private int findBound(int[] nums, int target, boolean first) {
[init]         int lo = 0, hi = nums.length - 1, ans = -1;
[probe]         while (lo <= hi) {
[probe]             int mid = lo + (hi - lo) / 2;
[hit]             if (nums[mid] == target) { ans = mid; if (first) hi = mid - 1; else lo = mid + 1; }
[right]             else if (nums[mid] < target) lo = mid + 1;
[left]             else hi = mid - 1;
[probe]         }
[done]         return ans;
[structure]     }
[structure] }
`),
  cpp: code(`
[structure] class Solution {
[structure] public:
[signature]     vector<int> searchRange(vector<int>& nums, int target) {
[init]         int left = findBound(nums, target, true);
[init]         int right = findBound(nums, target, false);
[return]         return {left, right};
[signature]     }
[signature]     int findBound(vector<int>& nums, int target, bool first) {
[init]         int lo = 0, hi = (int)nums.size() - 1, ans = -1;
[probe]         while (lo <= hi) {
[probe]             int mid = lo + (hi - lo) / 2;
[hit]             if (nums[mid] == target) { ans = mid; if (first) hi = mid - 1; else lo = mid + 1; }
[right]             else if (nums[mid] < target) lo = mid + 1;
[left]             else hi = mid - 1;
[probe]         }
[done]         return ans;
[structure]     }
[structure] };
`),
  pseudo: code(`
[signature] searchRange(nums, target): left = findBound(nums, target, first=true); right = findBound(nums, target, first=false)
[return]   return [left, right]
[signature] findBound(nums, target, first):
[init]   lo = 0; hi = len(nums) - 1; ans = -1
[probe]   while lo <= hi:
[probe]     mid = lo + (hi - lo) // 2
[hit]     if nums[mid] == target: ans = mid; if first: hi = mid - 1 else: lo = mid + 1
[right]     else if nums[mid] < target: lo = mid + 1
[left]     else: hi = mid - 1
[done]   return ans
`),
};

export const LESSON = Object.freeze({
  idea: 'Run two biased binary searches: on a hit record mid and keep going left for the first occurrence, right for the last; a bound that never records a hit stays -1.',
  trap: 'Returning the first hit mid stops too early inside a duplicate run; a single linear scan or one unbiased search cannot name both ends in O(log n).',
  time: 'O(log n) — two halving passes over the live window',
  space: 'O(1)',
});

export const EXPLAIN = Object.freeze({
  def: 'Structural wrapper: declares the class and method scope; no array operation runs here.',
  signature: 'Entry point: searchRange takes the sorted array and target; the helper findBound runs one biased binary search per end.',
  init: 'Open one biased pass: lo/hi bracket the live window and ans starts at -1 (no hit recorded yet).',
  probe: 'Probe the midpoint of the live [lo..hi] window; each probe reads exactly one element and the window strictly shrinks.',
  hit: 'Record mid as the best bound so far, then keep searching the biased side (left for first, right for last) — a hit never returns immediately.',
  left: 'Probe value is too large, so discard mid and everything right of it by moving hi to mid - 1.',
  right: 'Probe value is too small, so discard mid and everything left of it by moving lo to mid + 1.',
  return: 'Combine the two recorded bounds into [left, right]; both stay -1 only when the target never appeared.',
  done: 'Emit the recorded bound for this pass: the leftmost (or rightmost) hit index, or -1 when the pass never hit.',
});

export const EXPLAIN_LINES = Object.freeze({
  java: [
    'Structural wrapper: the Solution class scope. No operation runs here.',
    'Signature: searchRange takes int[] nums plus int target and returns int[]; execution starts in the body.',
    'Left pass: run the biased helper with first=true so hits keep searching left.',
    'Right pass: run the same helper with first=false so hits keep searching right.',
    'Return: package the two recorded bounds as [left, right].',
    'Structural wrapper: close of the searchRange method scope.',
    'Signature: helper findBound runs one biased binary search; first selects which side a hit keeps.',
    'Init: lo=0 and hi=n-1 bracket the whole array; ans=-1 means no hit recorded yet.',
    'Loop header: repeat while the live window [lo..hi] is non-empty.',
    'Probe: mid is the floor midpoint; lo+(hi-lo)/2 never overflows.',
    'Hit: record ans=mid, then shrink the biased side (hi=mid-1 first, lo=mid+1 last); never returns here.',
    'Too small: nums[mid] < target discards mid and everything left via lo=mid+1.',
    'Too large: nums[mid] > target discards mid and everything right via hi=mid-1.',
    'Loop footer: the smaller window restores the invariant for the next probe.',
    'Done: return the recorded bound for this pass (leftmost or rightmost hit, else -1).',
    'Structural wrapper: close of the helper scope.',
    'Structural wrapper: close of the class scope.',
  ],
  cpp: [
    'Structural wrapper: the Solution class scope. No operation runs here.',
    'Access specifier: exposes the methods exactly as the judge calls them.',
    'Signature: searchRange takes vector<int>& nums plus int target and returns vector<int>.',
    'Left pass: run the biased helper with first=true so hits keep searching left.',
    'Right pass: run the same helper with first=false so hits keep searching right.',
    'Return: package the two recorded bounds as {left, right}.',
    'Structural wrapper: close of the searchRange method scope.',
    'Signature: helper findBound runs one biased binary search; first selects which side a hit keeps.',
    'Init: lo=0 and hi=size-1 bracket the whole array; ans=-1 means no hit recorded yet.',
    'Loop header: repeat while the live window [lo..hi] is non-empty.',
    'Probe: mid is the floor midpoint; lo+(hi-lo)/2 never overflows.',
    'Hit: record ans=mid, then shrink the biased side (hi=mid-1 first, lo=mid+1 last); never returns here.',
    'Too small: nums[mid] < target discards mid and everything left via lo=mid+1.',
    'Too large: nums[mid] > target discards mid and everything right via hi=mid-1.',
    'Loop footer: the smaller window restores the invariant for the next probe.',
    'Done: return the recorded bound for this pass (leftmost or rightmost hit, else -1).',
    'Structural wrapper: close of the helper scope.',
    'Class terminator: closes the Solution scope.',
  ],
  pseudo: [
    'Name the task and the two biased passes: left seeks the first hit, right seeks the last.',
    'Combine the two recorded bounds into the [left, right] answer.',
    'Name the helper and its bias flag first (true seeks first, false seeks last).',
    'Seed the pass: full window plus ans=-1 before any probe.',
    'Loop while candidates remain; an empty window ends the pass.',
    'Pick the floor midpoint of the live window for this probe.',
    'Hit: record mid, then keep only the biased side — never return mid directly.',
    'Too small: discard mid and everything left of it.',
    'Too large: discard mid and everything right of it.',
    'Emit this pass bound: leftmost or rightmost hit, else -1.',
  ],
});

/** Independent oracle: linear scan for first/last (no halving, no lo/hi). */
export function rangeOracle(nums, target) {
  let first = -1;
  let last = -1;
  for (let i = 0; i < nums.length; i += 1) {
    if (nums[i] === target) {
      if (first === -1) first = i;
      last = i;
    }
  }
  return [first, last];
}

function decodeArgs(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('searchRange expects [nums, target]');
  const nums = args[0];
  const target = args[1];
  if (!Array.isArray(nums)) throw new Error('nums must be an array for this walkthrough');
  if (nums.length > MAX_N) throw new Error(`Visual walkthrough limited to ${MAX_N} elements (got ${nums.length}); narrow the input`);
  for (let i = 0; i < nums.length; i += 1) {
    const v = nums[i];
    if (!Number.isSafeInteger(v) || v < MIN_VAL || v > MAX_VAL) throw new Error(`nums[${i}] must be an integer ${MIN_VAL}..${MAX_VAL}`);
  }
  for (let i = 1; i < nums.length; i += 1) {
    if (nums[i] < nums[i - 1]) throw new Error('nums must be sorted non-decreasing for this walkthrough; the input is never sorted for you');
  }
  if (!Number.isSafeInteger(target) || target < MIN_VAL || target > MAX_VAL) throw new Error(`target must be an integer ${MIN_VAL}..${MAX_VAL}`);
  return { nums: nums.slice(), target };
}

function runBound(source, target, first, frames, phaseLabel, counters) {
  let lo = 0;
  let hi = source.length - 1;
  let ans = -1;
  const stateOf = (mid, extra = {}) => ({
    pointers: mid === null ? { lo, hi } : { lo, hi, mid },
    highlights: mid === null ? {} : { [mid]: 'accent', ...(extra.highlights || {}) },
    values: source.slice(),
    vars: { target, first, phase: phaseLabel, ...(extra.vars || {}) },
  });
  frames.push(frame(
    'init',
    `${phaseLabel}: open window`,
    source.length === 0
      ? `${phaseLabel}: nums is empty; lo=0, hi=-1, ans=-1.`
      : `${phaseLabel}: lo=0, hi=${hi}, ans=-1; target=${target}.`,
    stateOf(null),
  ));
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    const midVal = source[mid];
    counters.cmp += 1;
    frames.push(frame(
      'probe',
      `${phaseLabel}: probe ${mid}`,
      `nums[${mid}]=${midVal} vs target ${target} in [${lo},${hi}].`,
      { ...stateOf(mid, { vars: { midValue: midVal } }), ops: { cmp: counters.cmp, writes: 0 } },
    ));
    if (midVal === target) {
      ans = mid;
      if (first) hi = mid - 1;
      else lo = mid + 1;
      frames.push(frame(
        'hit',
        `${phaseLabel}: record ${mid}`,
        `Hit at ${mid}; ans=${ans}; keep ${first ? `[${lo},${hi}] left` : `[${lo},${hi}] right`}.`,
        { ...stateOf(mid, { highlights: { [mid]: 'ok' }, vars: { midValue: midVal, ans } }), ops: { cmp: counters.cmp, writes: 0 } },
      ));
    } else if (midVal < target) {
      lo = mid + 1;
      frames.push(frame(
        'right',
        `${phaseLabel}: go right`,
        `nums[${mid}]=${midVal}<${target}; lo=${lo} keeps [${lo},${hi}].`,
        { ...stateOf(mid, { highlights: { [mid]: 'dim' }, vars: { midValue: midVal, ans } }), ops: { cmp: counters.cmp, writes: 0 } },
      ));
    } else {
      hi = mid - 1;
      frames.push(frame(
        'left',
        `${phaseLabel}: go left`,
        `nums[${mid}]=${midVal}>${target}; hi=${hi} keeps [${lo},${hi}].`,
        { ...stateOf(mid, { highlights: { [mid]: 'dim' }, vars: { midValue: midVal, ans } }), ops: { cmp: counters.cmp, writes: 0 } },
      ));
    }
  }
  frames.push(frame(
    'done',
    `${phaseLabel}: bound = ${ans}`,
    ans === -1
      ? `${phaseLabel} never hit; bound stays -1.`
      : `${phaseLabel} recorded bound ${ans}; window empty so no better end remains.`,
    { ...stateOf(null, { vars: { ans } }), ops: { cmp: counters.cmp, writes: 0 } },
  ));
  return ans;
}

export function build(args) {
  const { nums: source, target } = decodeArgs(args);
  const frames = [];
  const counters = { cmp: 0 };
  const left = runBound(source, target, true, frames, 'Left pass', counters);
  const right = runBound(source, target, false, frames, 'Right pass', counters);
  const result = [left, right];
  const highlights = {};
  if (left !== -1 && right !== -1) {
    for (let i = left; i <= right; i += 1) highlights[i] = 'ok';
  }
  frames.push(frame(
    'done',
    `Return [${left},${right}]`,
    left === -1
      ? `Target ${target} never hit in either pass; return [-1,-1].`
      : `First hit ${left}, last hit ${right}; return [${left},${right}].`,
    { pointers: left === -1 ? {} : { first: left, last: right }, highlights, values: source.slice(), vars: { target, left, right, answer: result.slice() }, ops: { cmp: counters.cmp, writes: 0 } },
  ));
  const bounded = boundedFrames(frames, MAX_FRAMES).frames;
  return { kind: 'array', layout: { values: source.slice() }, frames: bounded, result };
}

export const adapters = {
  'find-first-and-last-position-of-element-in-sorted-array': {
    signature: SIGNATURE,
    lesson: LESSON,
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    code: rangeCode,
    build,
  },
};
