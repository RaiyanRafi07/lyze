/** 3Sum Closest — portable per-slug adapter (two-pointers).
 * Sort, fix each anchor, converge lo/hi toward the complement of the anchor,
 * and keep the closest sum seen. Pure + synchronous; never throws on import.
 * Out-of-range or non-integer inputs throw instead of rendering.
 * Register under slug `3sum-closest` (see integration.json).
 * Family precedent: the `3sum` key in twopointer-adapters.js (sort +
 * anchor-and-converge + shared semantic-core.js helpers).
 * Live shape: separate per-slug file following adapter-swap-nodes-in-pairs.js
 * (keeps the twopointer family file untouched; semantic.js spreads `adapters`).
 */
import { code, frame, boundedFrames } from './semantic-core.js';

export const MAX_N = 7;
export const MAX_FRAMES = 40;
export const INT_VAL_MIN = -1000;
export const INT_VAL_MAX = 1000;
export const TARGET_MIN = -10000;
export const TARGET_MAX = 10000;

export const SIGNATURE = Object.freeze({
  name: 'threeSumClosest',
  params: Object.freeze(['int[]', 'int']),
  return: 'int',
});

const closestCode = {
  java: code(`
[def] import java.util.Arrays;
[def] class Solution {
[def]     public int threeSumClosest(int[] nums, int target) {
[sort]         Arrays.sort(nums);
[init]         int n = nums.length;
[init]         int best = nums[0] + nums[1] + nums[2];
[anchor]         for (int i = 0; i < n - 2; i++) {
[measure]             int lo = i + 1;
[measure]             int hi = n - 1;
[measure]             while (lo < hi) {
[measure]                 int sum = nums[i] + nums[lo] + nums[hi];
[update]                 if (Math.abs(sum - target) < Math.abs(best - target)) best = sum;
[move]                 if (sum == target) return sum;
[move]                 else if (sum < target) lo++;
[move]                 else hi--;
[def]             }
[def]         }
[done]         return best;
[def]     }
[def] }
`),
  cpp: code(`
[def] #include <algorithm>
[def] #include <cstdlib>
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     int threeSumClosest(vector<int>& nums, int target) {
[sort]         sort(nums.begin(), nums.end());
[init]         int n = (int)nums.size();
[init]         int best = nums[0] + nums[1] + nums[2];
[anchor]         for (int i = 0; i < n - 2; i++) {
[measure]             int lo = i + 1;
[measure]             int hi = n - 1;
[measure]             while (lo < hi) {
[measure]                 int sum = nums[i] + nums[lo] + nums[hi];
[update]                 if (abs(sum - target) < abs(best - target)) best = sum;
[move]                 if (sum == target) return sum;
[move]                 else if (sum < target) ++lo;
[move]                 else --hi;
[def]             }
[def]         }
[done]         return best;
[def]     }
[def] };
`),
  pseudo: code(`
[def] threeSumClosest(nums, target):
[sort]   sort nums ascending
[init]   n = len(nums); best = nums[0] + nums[1] + nums[2]
[anchor]   for i in 0..n-3 as anchor:
[measure]     lo = i + 1; hi = n - 1; while lo < hi: sum = nums[i] + nums[lo] + nums[hi]
[update]     if |sum - target| < |best - target|: best = sum
[move]     if sum == target: return sum; else if sum < target: lo += 1 else hi -= 1
[done]   return best
`),
};

export const LESSON = Object.freeze({
  idea: 'Sort, fix each anchor, converge lo/hi toward target-nums[anchor]; keep the closest sum seen so far.',
  trap: 'Track distance with absolute values and seed best from real input (first three sorted); returning the triple or an index instead of the sum is wrong.',
  time: 'O(n^2)',
  space: 'O(1) extra (sort is in place)',
});

export const EXPLAIN = Object.freeze({
  def: 'Closest-triple-sum task returning one integer: the sum of three entries nearest the target (exactly one closest sum is promised).',
  sort: 'Sort ascending so equal values sit together and the two ends can converge toward each needed complement.',
  init: 'Seed best from the first three sorted values and record n; best is always a real triple sum, never a sentinel.',
  anchor: 'Fix one position as anchor and reduce the rest to a converging pair search around target minus the anchor.',
  measure: 'Read the current triple and its sum against the target; the sign alone decides which end moves next.',
  update: 'Adopt the sum only when its distance to target is strictly smaller; ties keep the earlier best (inputs promise uniqueness).',
  move: 'Move the ends by comparison: equal returns immediately, smaller needs a larger sum (lo++), larger needs a smaller sum (hi--).',
  done: 'Return best after every anchor ran exactly one converging pair search (or the exact hit above).',
});

export const EXPLAIN_LINES = Object.freeze({
  java: [
    'Import: Arrays.sort for the in-place ascending sort used below.',
    'Structural wrapper: opens the Solution class; no algorithm operation runs here.',
    'Function signature: names inputs nums/target and the int result; execution starts in the body.',
    'Sort ascending so the two ends can converge toward each needed complement.',
    'Init: n records the sorted length for the anchor bound.',
    'Init: best seeds from the first three sorted values — always a real triple sum.',
    'Anchor loop: fix position i; the rest becomes one converging pair search.',
    'Measure: lo starts just right of the anchor, the smallest partner available.',
    'Measure: hi starts at the last index, the largest partner available.',
    'Measure: one pair per pass while lo < hi; ends still unmeasured.',
    'Measure: sum of the current triple vs the target; its sign decides the move.',
    'Update: adopt sum only when strictly closer to target; ties keep the earlier best.',
    'Move-hit: sum == target is optimal (distance 0); return it immediately.',
    'Move: sum < target needs a larger sum, so lo advances (sorted order proves it).',
    'Move: otherwise sum > target needs a smaller sum, so hi retreats.',
    'Structural wrapper: closes the converging pair search; no operation runs here.',
    'Structural wrapper: closes one anchor iteration; its whole pair search is recorded.',
    'Done: every anchor converged; return the closest sum seen.',
    'Structural wrapper: closes the method scope; no operation runs here.',
    'Structural wrapper: closes the class scope; no operation runs here.',
  ],
  cpp: [
    'Include: <algorithm> provides sort for the ascending pass below.',
    'Include: <cstdlib> provides abs for the integer distance comparison.',
    'Include: <vector> provides vector<int> for the nums argument.',
    'Structural wrapper: using-directive for std; no algorithm operation runs here.',
    'Structural wrapper: opens the Solution class; no algorithm operation runs here.',
    'Structural wrapper: public access label; no algorithm operation runs here.',
    'Function signature: names inputs nums/target and the int result; execution starts in the body.',
    'Sort ascending so the two ends can converge toward each needed complement.',
    'Init: n records the sorted length for the anchor bound.',
    'Init: best seeds from the first three sorted values — always a real triple sum.',
    'Anchor loop: fix position i; the rest becomes one converging pair search.',
    'Measure: lo starts just right of the anchor, the smallest partner available.',
    'Measure: hi starts at the last index, the largest partner available.',
    'Measure: one pair per pass while lo < hi; ends still unmeasured.',
    'Measure: sum of the current triple vs the target; its sign decides the move.',
    'Update: adopt sum only when strictly closer to target; ties keep the earlier best.',
    'Move-hit: sum == target is optimal (distance 0); return it immediately.',
    'Move: sum < target needs a larger sum, so lo advances (sorted order proves it).',
    'Move: otherwise sum > target needs a smaller sum, so hi retreats.',
    'Structural wrapper: closes the converging pair search; no operation runs here.',
    'Structural wrapper: closes one anchor iteration; its whole pair search is recorded.',
    'Done: every anchor converged; return the closest sum seen.',
    'Structural wrapper: closes the method scope; no operation runs here.',
    'Structural wrapper: closes the class and its semicolon; no operation runs here.',
  ],
  pseudo: [
    'Signature: one function taking nums plus target and returning the closest triple sum.',
    'Sort nums ascending so the ends can converge toward each needed complement.',
    'Seed n and best from the real sorted input: best is the first triple, never a sentinel.',
    'Anchor: fix each position i in turn; the rest is one converging pair search.',
    'Measure: lo/hi converge while apart; sum of the triple vs the target decides the move.',
    'Update: keep the strictly closest sum; ties keep the earlier best.',
    'Move: exact hit returns at once; otherwise the sign moves the proven half.',
    'Done: no anchor left; return the closest sum recorded.',
  ],
});

/** Independent oracle: brute force over index triples, NOT sort+converge. */
export function closestOracle(nums, target) {
  let best = nums[0] + nums[1] + nums[2];
  for (let i = 0; i < nums.length; i += 1) {
    for (let j = i + 1; j < nums.length; j += 1) {
      for (let k = j + 1; k < nums.length; k += 1) {
        const s = nums[i] + nums[j] + nums[k];
        if (Math.abs(s - target) < Math.abs(best - target)) best = s;
      }
    }
  }
  return best;
}

function decodeNums(value) {
  const raw = Array.isArray(value) ? value : JSON.parse(value);
  if (!Array.isArray(raw)) throw new Error('Walkthrough needs an integer array like [-1,2,1,-4]');
  if (raw.length < 3 || raw.length > MAX_N) throw new Error('Walkthrough visual bound: array length 3..' + MAX_N + ' (judge allows 3..500); got ' + raw.length);
  const source = raw.slice();
  for (const v of source) {
    if (!Number.isSafeInteger(v)) throw new Error('nums must hold integers for this walkthrough');
    if (v < INT_VAL_MIN || v > INT_VAL_MAX) throw new Error('nums[i] must satisfy -1000 <= nums[i] <= 1000 for this walkthrough');
  }
  return source;
}

function decodeTarget(value) {
  const raw = typeof value === 'number' ? value : JSON.parse(value);
  if (!Number.isSafeInteger(raw)) throw new Error('Walkthrough needs an integer target like 1');
  if (raw < TARGET_MIN || raw > TARGET_MAX) throw new Error('target must satisfy -10^4 <= target <= 10^4 for this walkthrough');
  return raw;
}

export function build(args) {
  if (!Array.isArray(args) || args.length !== 2) {
    throw new Error('3sum-closest expects [nums, target]');
  }
  const source = decodeNums(args[0]);
  const target = decodeTarget(args[1]);
  const sorted = source.slice().sort((a, b) => a - b);
  const n = sorted.length;
  let best = sorted[0] + sorted[1] + sorted[2];
  const frames = [];
  const anchors = [];
  let tcCmp = 0;
  const tcWritesHolder = { writes: 0 };
  const opsNow = () => ({ cmp: tcCmp, writes: tcWritesHolder.writes });

  const state = (current, i, lo, hi, extra = {}, withOps = true) => ({
    current,
    values: sorted.slice(),
    pointers: { anchor: i, lo, hi },
    vars: { n, anchor: i, lo, hi, target, ...extra },
    ...(withOps ? { ops: opsNow() } : {}),
  });
  const push = (step, label, note, current, i, lo, hi, extra = {}, withOps = true) =>
    frames.push(frame(step, label, note, state(current, i, lo, hi, extra, withOps)));

  push('sort', 'Sort', 'sort ascending -> [' + sorted.join(',') + ']', null, -1, -1, -1, {}, false);
  push('init', 'Seed best', 'n=' + n + ', best=' + sorted.slice(0, 3).join('+') + '=' + best + ', target=' + target, null, -1, -1, -1, { best }, false);

  for (let i = 0; i < n - 2; i += 1) {
    const av = sorted[i];
    push('anchor', 'Anchor i=' + i, 'anchor i=' + i + ' (' + av + '); converge lo/hi toward ' + (target - av), i, i, -1, -1, { best, av, need: target - av });
    let lo = i + 1;
    let hi = n - 1;
    while (lo < hi) {
      const b = sorted[lo];
      const c = sorted[hi];
      const sum = av + b + c;
      tcCmp += 1;
      push('measure', 'Check (' + i + ',' + lo + ',' + hi + ')', 'nums[i]+nums[lo]+nums[hi]=' + av + '+' + b + '+' + c + '=' + sum + ' vs ' + target, lo, i, lo, hi, { best, av, b, c, sum });
      if (Math.abs(sum - target) < Math.abs(best - target)) {
        best = sum;
        tcWritesHolder.writes += 1;
        anchors.push(frames.length);
        push('update', 'New best ' + best, '|' + sum + '-' + target + '|=' + Math.abs(sum - target) + ' < prior; best=' + best, lo, i, lo, hi, { best, av, b, c, sum });
      } else {
        push('update', 'Keep best ' + best, '|' + sum + '-' + target + '|=' + Math.abs(sum - target) + '; best stays ' + best, lo, i, lo, hi, { best, av, b, c, sum });
      }
      if (sum === target) {
        anchors.push(frames.length);
        push('done', 'Exact hit', 'sum=' + sum + '==target: return ' + sum, null, i, lo, hi, { best: sum, av, b, c, sum });
        return {
          kind: 'array',
          layout: { values: sorted.slice() },
          frames,
          result: sum,
          anchors,
        };
      }
      if (sum < target) {
        const from = lo;
        lo += 1;
        push('move', 'Move lo right', 'sum=' + sum + '<' + target + ': lo ' + from + '->' + lo + '; need larger', lo, i, lo, hi, { best, sum, moved: 'lo' });
      } else {
        const from = hi;
        hi -= 1;
        push('move', 'Move hi left', 'sum=' + sum + '>' + target + ': hi ' + from + '->' + hi + '; need smaller', hi, i, lo, hi, { best, sum, moved: 'hi' });
      }
    }
  }

  anchors.push(frames.length);
  push('done', 'Return best', 'return ' + best + '; every anchor converged, closest to ' + target, null, -1, -1, -1, { best });
  return {
    kind: 'array',
    layout: { values: sorted.slice() },
    frames,
    result: best,
  };
}

export const adapters = {
  '3sum-closest': {
    signature: SIGNATURE,
    lesson: LESSON,
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    code: closestCode,
    build,
  },
};
