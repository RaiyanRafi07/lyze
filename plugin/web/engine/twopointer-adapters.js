import { code, frame, arrayInput } from './semantic-core.js'

// Visual bound for the walkthrough scene (judge allows n up to 10^5).
// Full trace uses 4 events per pair: 1 init + 4*(n-1) + 1 return.
// MAX_N=10 keeps every native trace within 6..38 frames, so no compaction.
const MAX_N = 10

const containerJava = code(`
[def] class Solution {
[def]     public int maxArea(int[] height) {
[init]         int left = 0;
[init]         int right = height.length - 1;
[init]         int best = 0;
[loop]         while (left < right) {
[measure]             int width = right - left;
[measure]             int h = Math.min(height[left], height[right]);
[measure]             int area = h * width;
[update]             if (area > best) best = area;
[move]             if (height[left] < height[right]) left++;
[move]             else right--;
[def]         }
[return]         return best;
[def]     }
[def] }
`)

const containerCpp = code(`
[def] class Solution {
[def] public:
[def]     int maxArea(vector<int>& height) {
[init]         int left = 0;
[init]         int right = (int)height.size() - 1;
[init]         int best = 0;
[loop]         while (left < right) {
[measure]             int width = right - left;
[measure]             int h = height[left] < height[right] ? height[left] : height[right];
[measure]             int area = h * width;
[update]             if (area > best) best = area;
[move]             if (height[left] < height[right]) ++left;
[move]             else --right;
[def]         }
[return]         return best;
[def]     }
[def] };
`)

const containerPseudo = code(`
[def] maxArea(height):
[init]   left = 0; right = len(height) - 1; best = 0
[loop]   while left < right:
[measure]     width = right - left; h = min(height[left], height[right]); area = h * width
[update]     best = max(best, area)
[move]     move the shorter wall inward (if equal move right); shorter wall caps its pairs
[return]   return best
`)

const MAX_PAIR_N = 12

const twoSumIIJava = code(`
[def] class Solution {
[def]     public int[] twoSum(int[] numbers, int target) {
[init]         int lo = 0;
[init]         int hi = numbers.length - 1;
[loop]         while (lo < hi) {
[measure]             int sum = numbers[lo] + numbers[hi];
[measure]             if (sum == target) return new int[]{lo + 1, hi + 1};
[move]             if (sum < target) lo++;
[move]             else hi--;
[def]         }
[return]         throw new IllegalArgumentException("No solution");
[def]     }
[def] }
`)

const twoSumIICpp = code(`
[def] #include <stdexcept>
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     vector<int> twoSum(vector<int>& numbers, int target) {
[init]         int lo = 0;
[init]         int hi = (int)numbers.size() - 1;
[loop]         while (lo < hi) {
[measure]             int sum = numbers[lo] + numbers[hi];
[measure]             if (sum == target) return {lo + 1, hi + 1};
[move]             if (sum < target) ++lo;
[move]             else --hi;
[def]         }
[return]         throw invalid_argument("No solution");
[def]     }
[def] };
`)

const twoSumIIPseudo = code(`
[def] twoSum(numbers, target):
[init]   lo = 0; hi = len(numbers) - 1
[loop]   while lo < hi:
[measure]     sum = numbers[lo] + numbers[hi]; if sum == target return [lo + 1, hi + 1]
[move]     if sum < target: lo += 1 else hi -= 1; drop the half proven impossible by sorted order
[return]   return [lo + 1, hi + 1] (exactly one solution exists per constraints)
`)

function decodeNumbers(value) {
  const raw = Array.isArray(value) ? value : JSON.parse(value)
  if (!Array.isArray(raw)) throw new Error('Walkthrough needs an integer array like [2,7,11,15]')
  if (raw.length > MAX_PAIR_N) throw new Error('Walkthrough visual bound: at most ' + MAX_PAIR_N + ' numbers (judge allows up to 3*10^4); got ' + raw.length)
  const source = arrayInput(raw, MAX_PAIR_N)
  if (source.length < 2) throw new Error('Need at least two numbers for a pair; got ' + source.length)
  for (const v of source) {
    if (v < -1000 || v > 1000) throw new Error('numbers[i] must satisfy -1000 <= numbers[i] <= 1000 for this walkthrough')
  }
  for (let i = 1; i < source.length; i++) {
    if (source[i] < source[i - 1]) throw new Error('numbers must be sorted in non-decreasing order for this walkthrough')
  }
  return source
}

function decodeTarget(value) {
  const raw = typeof value === 'number' ? value : JSON.parse(value)
  if (!Number.isSafeInteger(raw)) throw new Error('Walkthrough needs an integer target like 9')
  return raw
}

function buildTwoSumII(args) {
  const source = decodeNumbers(args[0])
  const target = decodeTarget(args[1])
  const n = source.length
  let lo = 0
  let hi = n - 1
  const frames = []
  const anchors = []

  const state = (current, l, h, extra = {}) => ({
    current,
    values: source.slice(),
    pointers: { lo: l, hi: h },
    vars: { n, lo: l, hi: h, target, ...extra }
  })
  const push = (step, label, note, current, l, h, extra = {}) =>
    frames.push(frame(step, label, note, state(current, l, h, extra)))

  push('init', 'Initialize', 'n=' + n + ', lo=0(' + source[0] + '), hi=' + (n - 1) + '(' + source[n - 1] + '), target=' + target, null, lo, hi, {})

  while (lo < hi) {
    const vlo = source[lo]
    const vhi = source[hi]
    push('loop', 'Check pair (' + lo + ',' + hi + ')', 'lo=' + lo + '(' + vlo + '), hi=' + hi + '(' + vhi + '); ' + lo + '<' + hi + ' so compare vs ' + target, lo, lo, hi, { vlo, vhi })
    const sum = vlo + vhi
    push('measure', 'Measure sum (' + lo + ',' + hi + ')', 'sum=numbers[' + lo + ']+numbers[' + hi + ']=' + vlo + '+' + vhi + '=' + sum + ' vs ' + target, lo, lo, hi, { vlo, vhi, sum })
    if (sum === target) {
      anchors.push(frames.length)
      push('return', 'Return answer', 'sum=' + sum + '==' + target + ': return [' + (lo + 1) + ',' + (hi + 1) + '] 1-indexed', null, lo, hi, { vlo, vhi, sum })
      return {
        kind: 'array',
        layout: { values: source.slice() },
        frames,
        result: [lo + 1, hi + 1],
        anchors
      }
    }
    if (sum < target) {
      const from = lo
      lo += 1
      push('move', 'Move lo right', 'sum=' + sum + '<' + target + ': pairs with hi fixed sum<=' + sum + '; lo ' + from + '->' + lo, lo, lo, hi, { vlo, vhi, sum, moved: 'lo' })
    } else {
      const from = hi
      hi -= 1
      push('move', 'Move hi left', 'sum=' + sum + '>' + target + ': pairs with lo fixed sum>=' + sum + '; hi ' + from + '->' + hi, hi, lo, hi, { vlo, vhi, sum, moved: 'hi' })
    }
  }

  throw new Error('No pair sums to ' + target + ' (constraints promise exactly one solution)')
}

function decodeHeight(value) {
  const raw = Array.isArray(value) ? value : JSON.parse(value)
  if (!Array.isArray(raw)) throw new Error('Walkthrough needs an integer array like [1,8,6,2,5,4,8,3,7]')
  if (raw.length > MAX_N) throw new Error('Walkthrough visual bound: at most ' + MAX_N + ' bars (judge allows up to 10^5); got ' + raw.length)
  const source = arrayInput(raw, MAX_N)
  if (source.length < 2) throw new Error('Need at least two bars for a container; got ' + source.length)
  for (const h of source) {
    if (h < 0 || h > 10000) throw new Error('Heights must satisfy 0 <= height[i] <= 10^4 for this walkthrough')
  }
  return source
}

function buildMaxArea(args) {
  const source = decodeHeight(args[0])
  const n = source.length
  let left = 0
  let right = n - 1
  let best = 0
  const frames = []
  const anchors = []

  const state = (current, l, r, b, extra = {}) => ({
    current,
    values: source.slice(),
    pointers: { left: l, right: r },
    vars: { n, left: l, right: r, best: b, ...extra }
  })
  const push = (step, label, note, current, l, r, b, extra = {}) =>
    frames.push(frame(step, label, note, state(current, l, r, b, extra)))

  push('init', 'Initialize', 'n=' + n + ', left=0 (h=' + source[0] + '), right=' + (n - 1) + ' (h=' + source[n - 1] + '), best=0', null, left, right, best, {})

  while (left < right) {
    const hl = source[left]
    const hr = source[right]
    push('loop', 'Check pair (' + left + ',' + right + ')', 'left=' + left + '(' + hl + '), right=' + right + '(' + hr + '); ' + left + '<' + right + ' so measure', left, left, right, best, { hl, hr })
    const width = right - left
    const h = hl < hr ? hl : hr
    const area = h * width
    push('measure', 'Measure (' + left + ',' + right + ')', 'width=' + right + '-' + left + '=' + width + ', h=min(' + hl + ',' + hr + ')=' + h + ', area=' + h + '*' + width + '=' + area, left, left, right, best, { hl, hr, width, h, area })
    if (area > best) {
      best = area
      anchors.push(frames.length)
      push('update', 'New best ' + best, 'area=' + area + ' > best; best=' + best, left, left, right, best, { hl, hr, width, h, area })
    } else {
      push('update', 'Keep best ' + best, 'area=' + area + ' <= best ' + best + '; best stays ' + best, left, left, right, best, { hl, hr, width, h, area })
    }
    if (hl < hr) {
      const from = left
      left += 1
      push('move', 'Move left wall', 'h[' + from + ']=' + hl + ' < h[' + right + ']=' + hr + '; move left ' + from + '->' + left + '. Shorter caps every pair with right.', left, left, right, best, { hl, hr, width, h, area, moved: 'left' })
    } else if (hr < hl) {
      const from = right
      right -= 1
      push('move', 'Move right wall', 'h[' + left + ']=' + hl + ' >= h[' + from + ']=' + hr + '; move right ' + from + '->' + right + '. Shorter caps every pair with left.', right, left, right, best, { hl, hr, width, h, area, moved: 'right' })
    } else {
      const from = right
      right -= 1
      push('move', 'Move right wall', 'h[' + left + ']=' + hl + ' == h[' + from + ']=' + hr + '; move right ' + from + '->' + right + ' by rule. Either caps pairs.', right, left, right, best, { hl, hr, width, h, area, moved: 'right' })
    }
  }

  anchors.push(frames.length)
  push('return', 'Return best', 'return ' + best + '; left=' + left + ', right=' + right + ' met, every pair measured', null, left, right, best, {})
  // Full event list: semantic.js performs the single honest compaction pass.
  return {
    kind: 'array',
    layout: { values: source.slice() },
    frames,
    result: best,
    anchors
  }
}

const threeSumJava = code(`
[def] import java.util.ArrayList;
[def] import java.util.Arrays;
[def] import java.util.List;
[def] class Solution {
[def]     public List<List<Integer>> threeSum(int[] nums) {
[sort]         Arrays.sort(nums);
[anchor]         List<List<Integer>> out = new ArrayList<>();
[anchor]         int n = nums.length;
[anchor]         for (int i = 0; i < n - 2; i++) {
[skip-duplicates]             if (i > 0 && nums[i] == nums[i - 1]) continue;
[measure]             int lo = i + 1;
[measure]             int hi = n - 1;
[measure]             while (lo < hi) {
[measure]                 int sum = nums[i] + nums[lo] + nums[hi];
[record]                 if (sum == 0) out.add(Arrays.asList(nums[i], nums[lo], nums[hi]));
[contract]                 if (sum == 0) { lo++; hi--; }
[contract]                 while (sum == 0 && lo < hi && nums[lo] == nums[lo - 1]) lo++;
[contract]                 while (sum == 0 && lo < hi && nums[hi] == nums[hi + 1]) hi--;
[contract]                 if (sum < 0) lo++;
[contract]                 else if (sum > 0) hi--;
[def]             }
[def]         }
[done]         return out;
[def]     }
[def] }
`);

const threeSumCpp = code(`
[def] #include <algorithm>
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     vector<vector<int>> threeSum(vector<int>& nums) {
[sort]         sort(nums.begin(), nums.end());
[anchor]         vector<vector<int>> out;
[anchor]         int n = (int)nums.size();
[anchor]         for (int i = 0; i < n - 2; i++) {
[skip-duplicates]             if (i > 0 && nums[i] == nums[i - 1]) continue;
[measure]             int lo = i + 1;
[measure]             int hi = n - 1;
[measure]             while (lo < hi) {
[measure]                 int sum = nums[i] + nums[lo] + nums[hi];
[record]                 if (sum == 0) out.push_back({nums[i], nums[lo], nums[hi]});
[contract]                 if (sum == 0) { ++lo; --hi; }
[contract]                 while (sum == 0 && lo < hi && nums[lo] == nums[lo - 1]) ++lo;
[contract]                 while (sum == 0 && lo < hi && nums[hi] == nums[hi + 1]) --hi;
[contract]                 if (sum < 0) ++lo;
[contract]                 else if (sum > 0) --hi;
[def]             }
[def]         }
[done]         return out;
[def]     }
[def] };
`);

const threeSumPseudo = code(`
[def] threeSum(nums):
[sort]   sort nums ascending
[anchor]   out = []; n = len(nums); for i in 0..n-3 as anchor:
[skip-duplicates]     if i > 0 and nums[i] == nums[i-1]: skip duplicate anchor
[measure]     lo = i + 1; hi = n - 1; while lo < hi: sum = nums[i] + nums[lo] + nums[hi]
[record]       if sum == 0: record [nums[i], nums[lo], nums[hi]] into out
[contract]       if sum == 0: lo += 1; hi -= 1; move lo/hi past duplicates
[contract]       else if sum < 0: lo += 1 else hi -= 1; converge toward zero
[done]   return out
`);

function decodeThreeSumNums(value) {
  const raw = Array.isArray(value) ? value : JSON.parse(value);
  if (!Array.isArray(raw)) throw new Error('Walkthrough needs an integer array like [-1,0,1,2,-1,-4]');
  if (raw.length < 2 || raw.length > 7) throw new Error('Walkthrough visual bound: array length 2..7 (judge allows 3..3000); got ' + raw.length);
  const source = arrayInput(raw, 7);
  for (const v of source) {
    if (v < -100000 || v > 100000) throw new Error('nums[i] must satisfy -10^5 <= nums[i] <= 10^5 for this walkthrough');
  }
  return source;
}

function buildThreeSum(args) {
  const source = decodeThreeSumNums(args[0]);
  const sorted = source.slice().sort((a, b) => a - b);
  const n = sorted.length;
  const frames = [];
  const out = [];

  const state = (current, i, lo, hi, extra = {}) => ({
    current,
    values: sorted.slice(),
    pointers: { anchor: i, lo, hi },
    vars: { n, anchor: i, lo, hi, ...extra }
  });
  const push = (step, label, note, current, i, lo, hi, extra = {}) =>
    frames.push(frame(step, label, note, state(current, i, lo, hi, extra)));

  push('sort', 'Sort', 'sort ascending -> [' + sorted.join(',') + ']', null, -1, -1, -1, {});

  for (let i = 0; i < n - 2; i++) {
    const av = sorted[i];
    push('anchor', 'Anchor i=' + i, 'anchor i=' + i + ' (' + av + '); need lo/hi sum=' + (-av), i, i, -1, -1, { av, need: -av });
    if (i > 0 && sorted[i] === sorted[i - 1]) {
      push('skip-duplicates', 'Skip duplicate anchor', 'nums[' + i + ']==nums[' + (i - 1) + '] (' + av + '); skip dup anchor', i, i, -1, -1, { av });
      continue;
    }
    let lo = i + 1;
    let hi = n - 1;
    while (lo < hi) {
      const b = sorted[lo];
      const c = sorted[hi];
      const sum = av + b + c;
      push('measure', 'Check (' + i + ',' + lo + ',' + hi + ')', 'nums[i]+nums[lo]+nums[hi]=' + av + '+' + b + '+' + c + '=' + sum + ' vs 0', lo, i, lo, hi, { av, b, c, sum });
      if (sum === 0) {
        out.push([av, b, c]);
        push('record', 'Record triplet', 'sum=0: record [' + av + ',' + b + ',' + c + '] (#' + out.length + ')', lo, i, lo, hi, { av, b, c, sum, k: out.length });
        const fromLo = lo;
        const fromHi = hi;
        lo += 1;
        hi -= 1;
        while (lo < hi && sorted[lo] === sorted[lo - 1]) lo += 1;
        while (lo < hi && sorted[hi] === sorted[hi + 1]) hi -= 1;
        push('contract', 'Contract past dups', 'recorded; lo ' + fromLo + '->' + lo + ', hi ' + fromHi + '->' + hi + ' past dups', lo, i, lo, hi, { fromLo, fromHi });
      } else if (sum < 0) {
        const from = lo;
        lo += 1;
        push('contract', 'Move lo right', 'sum=' + sum + '<0: lo ' + from + '->' + lo + '; need larger', lo, i, lo, hi, { sum, moved: 'lo' });
      } else {
        const from = hi;
        hi -= 1;
        push('contract', 'Move hi left', 'sum=' + sum + '>0: hi ' + from + '->' + hi + '; need smaller', hi, i, lo, hi, { sum, moved: 'hi' });
      }
    }
  }

  push('done', 'Done', 'return out with ' + out.length + ' triplet(s); anchor+converge done', null, -1, -1, -1, { k: out.length });

  return {
    kind: 'array',
    layout: { values: sorted.slice() },
    frames,
    result: out.map(t => t.slice())
  };
}

export const adapters = {
  'container-with-most-water': {
    signature: { name: 'maxArea', params: ['int[]'], return: 'int' },
    lesson: {
      idea: 'Start with the widest pair; area is width times min height. The shorter wall caps every pair with the other wall, so move it.',
      trap: 'Not sorted Two Sum: never move the taller wall or sort. Width only shrinks, so only the shorter wall can find a taller bound.',
      time: 'O(n)',
      space: 'O(1)'
    },
    explain: {
      def: 'Method scope: declares maxArea over the height array; the measured walk runs in the body below.',
      init: 'Widest pair first: left=0, right=n-1, best=0. Width is maximal; 0 is a safe floor.',
      loop: 'One pair per pass while left<right. Width only shrinks from here on.',
      measure: 'This pair holds min(h[left],h[right])*(right-left): shorter wall caps it.',
      update: 'best=max(best,area): monotonic running maximum over pairs seen so far.',
      move: 'Move only the shorter wall (ties: right). It caps every pair with the other side fixed.',
      return: 'Pointers met, no pairs left. best is the maximum container area.'
    },
    explainLines: {
      java: {
        2: 'left starts at index 0: the leftmost wall of the widest pair.',
        3: 'right starts at the last bar: width right-left is maximal here.',
        4: 'best=0: heights are non-negative, so 0 is a safe running floor.',
        5: 'Loop while left<right: exactly the pairs still unmeasured.',
        6: 'width=right-left: horizontal distance between the two walls.',
        7: 'h=min of the two walls: the shorter wall caps the water level.',
        8: 'area=h*width: this pair’s container volume.',
        9: 'Keep the max: adopt area only when it beats best.',
        10: 'Left wall shorter: it caps every pair with right fixed, so advance left.',
        11: 'Otherwise move right (includes ties): right caps every pair with left fixed.',
        13: 'Pointers met: every pair measured, return the recorded best.'
      },
      cpp: {
        3: 'left starts at index 0: the leftmost wall of the widest pair.',
        4: 'right starts at the last bar: width right-left is maximal here.',
        5: 'best=0: heights are non-negative, so 0 is a safe running floor.',
        6: 'Loop while left<right: exactly the pairs still unmeasured.',
        7: 'width=right-left: horizontal distance between the two walls.',
        8: 'h=shorter of the two walls: it caps the water level (ternary min).',
        9: 'area=h*width: this pair’s container volume.',
        10: 'Keep the max: adopt area only when it beats best.',
        11: 'Left wall shorter: it caps every pair with right fixed, so advance left.',
        12: 'Otherwise move right (includes ties): right caps every pair with left fixed.',
        14: 'Pointers met: every pair measured, return the recorded best.'
      },
      pseudo: {
        0: 'Function header: names maxArea over height; execution starts in the body.',
        1: 'Widest pair + best=0: maximal width first, non-negative floor.',
        2: 'One pair per pass while left<right; width only shrinks.',
        3: 'Measure this pair: width times the shorter wall.',
        4: 'best=max(best,area): running maximum.',
        5: 'Shorter wall moves inward (ties: right); it caps its pairs with the far side fixed.',
        6: 'No pairs left: return best.'
      }
    },
    code: { java: containerJava, cpp: containerCpp, pseudo: containerPseudo },
    build: buildMaxArea
  },
  'two-sum-ii-input-array-is-sorted': {
    signature: { name: 'twoSum', params: ['int[]', 'int'], return: 'int[]' },
    lesson: {
      idea: 'Sorted order converges: sum<target drops lo, sum>target drops hi; each move discards only pairs proven impossible.',
      trap: 'Answer is 1-indexed [lo+1,hi+1]. No hash map: constant space forces the converging ends, not a complement lookup.',
      time: 'O(n)',
      space: 'O(1)'
    },
    // Per-line explanations (presentation metadata, never compiled).
    // Staged source: .workers/jobs/neetcode150-completion/two-sum-ii-input-array-is-sorted/two-sum-ii.lesson.js
    // (explain + index-aligned explainLines arrays); live code blocks verified
    // byte-identical to staged, so index-keyed notes apply cleanly.
    explain: {
      init: 'Place lo at the smallest element and hi at the largest: the whole sorted range is still possible.',
      loop: 'While lo < hi there is at least one untested pair left between the two ends.',
      measure: 'Add the two ends. Sorted order makes this sum the pivot that decides which end can move.',
      move: 'sum < target discards every pair with this lo (all smaller); sum > target discards every pair with this hi.',
      return: 'The first equality is the answer, converted to 1-indexed positions. Exactly one solution is promised.'
    },
    explainLines: {
      java: [
        'Structural wrapper: opens the Solution class; no algorithm operation runs here.',
        'Function signature: names inputs numbers/target and the int[] result; execution starts in the body.',
        'Init: lo starts at index 0, the smallest value, so no pair left of lo is missed.',
        'Init: hi starts at the last index, the largest value, so the full sorted range is covered.',
        'Loop guard: while lo < hi at least one untested pair remains between the ends.',
        'Measure: sum of the two current ends; sorted order makes it the decision pivot.',
        'Measure-hit: on equality return 1-indexed [lo+1, hi+1]; LeetCode positions start at 1.',
        'Move right: sum < target proves numbers[lo]+numbers[hi] is the largest sum this lo can reach, so drop lo.',
        'Move left: otherwise sum > target proves this hi is too large for every lo position, so drop hi.',
        'Structural wrapper: closes the while loop scope; no operation runs on this brace.',
        'Unreachable guard: throws only to satisfy the compiler; constraints promise exactly one solution.',
        'Structural wrapper: closes the method scope; no operation runs here.',
        'Structural wrapper: closes the class scope; no operation runs here.'
      ],
      cpp: [
        'Include: <stdexcept> provides invalid_argument for the unreachable no-solution guard.',
        'Include: <vector> provides vector<int> for the numbers argument and the returned pair.',
        'Structural wrapper: using-directive for std; no algorithm operation runs here.',
        'Structural wrapper: opens the Solution class; no algorithm operation runs here.',
        'Structural wrapper: public access label; no algorithm operation runs here.',
        'Function signature: names inputs numbers/target and the vector<int> result; execution starts in the body.',
        'Init: lo starts at index 0, the smallest value, so no pair left of lo is missed.',
        'Init: hi starts at the last index, the largest value, so the full sorted range is covered.',
        'Loop guard: while lo < hi at least one untested pair remains between the ends.',
        'Measure: sum of the two current ends; sorted order makes it the decision pivot.',
        'Measure-hit: on equality return 1-indexed {lo+1, hi+1}; LeetCode positions start at 1.',
        'Move right: sum < target proves this lo is too small for every hi position, so advance lo.',
        'Move left: otherwise sum > target proves this hi is too large for every lo position, so retreat hi.',
        'Structural wrapper: closes the while loop scope; no operation runs on this brace.',
        'Unreachable guard: throws only to satisfy the compiler; constraints promise exactly one solution.',
        'Structural wrapper: closes the method scope; no operation runs here.',
        'Structural wrapper: closes the class and its semicolon; no operation runs here.'
      ],
      pseudo: [
        'Signature: one function taking sorted numbers and target, returning 1-indexed [index1, index2].',
        'Init: lo at the first position and hi at the last; the whole sorted range is still possible.',
        'Loop guard: repeat while lo < hi; crossing would mean every pair was eliminated.',
        'Measure-hit: test the ends sum; on equality return [lo+1, hi+1] immediately.',
        'Move: too-small sum advances lo, too-large sum retreats hi; sorted order proves the dropped end impossible.',
        'Return: exactly one solution exists per constraints, so the loop always returns through the hit above.'
      ]
    },
    code: { java: twoSumIIJava, cpp: twoSumIICpp, pseudo: twoSumIIPseudo },
    build: buildTwoSumII
  },
  '3sum': {
    signature: { name: 'threeSum', params: ['int[]'], return: 'int[][]' },
    lesson: {
      idea: 'Sort, fix each anchor, converge lo/hi toward -nums[anchor]; record zeros and skip duplicates.',
      trap: 'Skipping duplicate anchors and post-record lo/hi values is required; else duplicate triplets return.',
      time: 'O(n^2)',
      space: 'O(1) extra plus O(k) output (sort is in place)'
    },
    // Per-line explanations (presentation metadata, never compiled).
    // Staged source: .workers/jobs/neetcode150-completion/3sum/adapter-3sum.mjs
    // (threeSumExplain/threeSumExplainLines); live code blocks verified
    // byte-identical to staged, so index-keyed notes apply cleanly.
    explain: {
      def: 'Scope of the zero-triplet task returning distinct value triples; execution starts in the body.',
      sort: 'Sort ascending so equal values sit together and the two ends can converge toward each complement.',
      anchor: 'Fix one position as anchor and reduce the rest to a complementary pair summing to its negation.',
      'skip-duplicates': 'Skip an anchor equal to its left neighbor since its pair search would repeat recorded triplets.',
      measure: 'Read the current triple and its sum against zero; the sign alone decides which end moves next.',
      record: 'Record the zero-sum triple once; sorted order plus the dedup moves keep repeats out of the output.',
      contract: 'Move the ends inward past the proven half and skip duplicate values so no triple can repeat.',
      done: 'Return every distinct zero-sum triple after each anchor ran exactly one converging pair search.'
    },
    explainLines: {
      java: {
        20: 'End of the converging pair search: the ends met, so control returns to the anchor loop.',
        21: 'End of one anchor iteration: its whole pair search is finished and recorded.',
        23: 'End of the method scope; the returned list above exits with every distinct triple.',
        24: 'End of the class scope; it performs no algorithm operation.'
      },
      cpp: {
        21: 'End of the converging pair search: the ends met, so control returns to the anchor loop.',
        22: 'End of one anchor iteration: its whole pair search is finished and recorded.',
        24: 'End of the method scope; the returned table above exits with every distinct triple.',
        25: 'End of the class scope; it performs no algorithm operation.'
      },
      pseudo: {}
    },
    code: { java: threeSumJava, cpp: threeSumCpp, pseudo: threeSumPseudo },
    build: buildThreeSum
  }
}
