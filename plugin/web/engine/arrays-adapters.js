import { arrayInput, boundedFrames, code, frame } from './semantic-core.js';
import { adapter as longestConsecutiveSequence } from './longest-consecutive-sequence.js';

const MAX_FRAMES = 40;

function finish(nums, frames, result) {
  return {
    kind: 'array',
    layout: { values: nums.slice() },
    frames: boundedFrames(frames, MAX_FRAMES).frames,
    result
  };
}

function checkedArray(value, min, label) {
  const nums = arrayInput(value);
  if (nums.length < min) throw new Error(label + ' needs at least ' + min + ' integer' + (min === 1 ? '' : 's'));
  return nums;
}

function safeSubtract(a, b) {
  const value = a - b;
  if (!Number.isSafeInteger(value)) throw new Error('An intermediate value exceeds the safe integer range for this walkthrough');
  return value;
}

function safeAdd(a, b) {
  const value = a + b;
  if (!Number.isSafeInteger(value)) throw new Error('A subarray sum exceeds the safe integer range for this walkthrough');
  return value;
}

function safeMultiply(a, b) {
  const value = a * b;
  if (!Number.isSafeInteger(value)) throw new Error('An intermediate product exceeds the safe integer range for this walkthrough');
  return value;
}

const twoSumCode = {
  java: code(`
[def] class Solution {
[def]     public int[] twoSum(int[] nums, int target) {
[init]         Map<Integer, Integer> seen = new HashMap<>();
[scan]         for (int i = 0; i < nums.length; i++) {
[probe]             int need = target - nums[i];
[check]             if (seen.containsKey(need)) {
[found]                 return new int[]{seen.get(need), i};
[check]             }
[store]             seen.put(nums[i], i);
[scan]         }
[none]         return new int[]{};
[def]     }
[def] }
`),
  cpp: code(`
[def] class Solution {
[def] public:
[def]     vector<int> twoSum(vector<int>& nums, int target) {
[init]         unordered_map<int, int> seen;
[scan]         for (int i = 0; i < (int)nums.size(); i++) {
[probe]             int need = target - nums[i];
[check]             if (seen.count(need)) {
[found]                 return {seen[need], i};
[check]             }
[store]             seen[nums[i]] = i;
[scan]         }
[none]         return {};
[def]     }
[def] };
`),
  pseudo: code(`
[def] function twoSum(nums, target)
[init]   seen = empty hash map
[scan]   for i from 0 to length(nums) - 1
[probe]     need = target - nums[i]
[check]     if seen contains key need
[found]       return [seen[need], i]
[check]     end if
[store]     seen[nums[i]] = i
[scan]   end for
[none]   return []
[def] end function
`)
};

const containsDuplicateCode = {
  java: code(`
[def] class Solution {
[def]     public boolean containsDuplicate(int[] nums) {
[init]         Set<Integer> seen = new HashSet<>();
[scan]         for (int i = 0; i < nums.length; i++) {
[read]             int value = nums[i];
[check]             if (seen.contains(value)) {
[hit]                 return true;
[check]             }
[track]             seen.add(value);
[scan]         }
[none]         return false;
[def]     }
[def] }
`),
  cpp: code(`
[def] class Solution {
[def] public:
[def]     bool containsDuplicate(vector<int>& nums) {
[init]         unordered_set<int> seen;
[scan]         for (int i = 0; i < (int)nums.size(); i++) {
[read]             int value = nums[i];
[check]             if (seen.count(value)) {
[hit]                 return true;
[check]             }
[track]             seen.insert(value);
[scan]         }
[none]         return false;
[def]     }
[def] };
`),
  pseudo: code(`
[def] function containsDuplicate(nums)
[init]   seen = empty hash set
[scan]   for i from 0 to length(nums) - 1
[read]     value = nums[i]
[check]     if seen contains value
[hit]       return true
[check]     end if
[track]     add value to seen
[scan]   end for
[none]   return false
[def] end function
`)
};

const maxProfitCode = {
  java: code(`
[def] class Solution {
[def]     public int maxProfit(int[] prices) {
[init]         int minPrice = prices[0];
[initbest]         int best = 0;
[scan]         for (int i = 1; i < prices.length; i++) {
[profit]             int profit = prices[i] - minPrice;
[sellcheck]             if (profit > best) {
[sell]                 best = profit;
[sellcheck]             }
[buycheck]             if (prices[i] < minPrice) {
[buy]                 minPrice = prices[i];
[buycheck]             }
[scan]         }
[done]         return best;
[def]     }
[def] }
`),
  cpp: code(`
[def] class Solution {
[def] public:
[def]     int maxProfit(vector<int>& prices) {
[init]         int minPrice = prices[0];
[initbest]         int best = 0;
[scan]         for (int i = 1; i < (int)prices.size(); i++) {
[profit]             int profit = prices[i] - minPrice;
[sellcheck]             if (profit > best) {
[sell]                 best = profit;
[sellcheck]             }
[buycheck]             if (prices[i] < minPrice) {
[buy]                 minPrice = prices[i];
[buycheck]             }
[scan]         }
[done]         return best;
[def]     }
[def] };
`),
  pseudo: code(`
[def] function maxProfit(prices)
[init]   minPrice = prices[0]
[initbest]   best = 0
[scan]   for i from 1 to length(prices) - 1
[profit]     profit = prices[i] - minPrice
[sellcheck]     if profit > best
[sell]       best = profit
[sellcheck]     end if
[buycheck]     if prices[i] < minPrice
[buy]       minPrice = prices[i]
[buycheck]     end if
[scan]   end for
[done]   return best
[def] end function
`)
};

const maxSubArrayCode = {
  java: code(`
[def] class Solution {
[def]     public int maxSubArray(int[] nums) {
[init]         int current = nums[0];
[init]         int best = nums[0];
[init]         int start = 0;
[init]         int bestStart = 0;
[init]         int bestEnd = 0;
[scan]         for (int i = 1; i < nums.length; i++) {
[restartcheck]             if (current + nums[i] < nums[i]) {
[restart]                 current = nums[i];
[restart]                 start = i;
[restartcheck]             } else {
[extend]                 current = current + nums[i];
[restartcheck]             }
[bestcheck]             if (current > best) {
[best]                 best = current;
[best]                 bestStart = start;
[best]                 bestEnd = i;
[bestcheck]             }
[scan]         }
[done]         return best;
[def]     }
[def] }
`),
  cpp: code(`
[def] class Solution {
[def] public:
[def]     int maxSubArray(vector<int>& nums) {
[init]         int current = nums[0];
[init]         int best = nums[0];
[init]         int start = 0;
[init]         int bestStart = 0;
[init]         int bestEnd = 0;
[scan]         for (int i = 1; i < (int)nums.size(); i++) {
[restartcheck]             if (current + nums[i] < nums[i]) {
[restart]                 current = nums[i];
[restart]                 start = i;
[restartcheck]             } else {
[extend]                 current = current + nums[i];
[restartcheck]             }
[bestcheck]             if (current > best) {
[best]                 best = current;
[best]                 bestStart = start;
[best]                 bestEnd = i;
[bestcheck]             }
[scan]         }
[done]         return best;
[def]     }
[def] };
`),
  pseudo: code(`
[def] function maxSubArray(nums)
[init]   current = nums[0]
[init]   best = nums[0]
[init]   start = 0
[init]   bestStart = 0
[init]   bestEnd = 0
[scan]   for i from 1 to length(nums) - 1
[restartcheck]     if current + nums[i] < nums[i]
[restart]       current = nums[i]
[restart]       start = i
[restartcheck]     else
[extend]       current = current + nums[i]
[restartcheck]     end if
[bestcheck]     if current > best
[best]       best = current
[best]       bestStart = start
[best]       bestEnd = i
[bestcheck]     end if
[scan]   end for
[done]   return best
[def] end function
`)
};

const productExceptSelfCode = {
  java: code(`
[def] class Solution {
[def]     public int[] productExceptSelf(int[] nums) {
[init]         int n = nums.length;
[init2]         int[] answer = new int[n];
[init2]         int prefix = 1;
[prefixscan]         for (int i = 0; i < n; i++) {
[prefix]             answer[i] = prefix;
[prefixmul]             prefix *= nums[i];
[prefixscan]         }
[init2]         int suffix = 1;
[suffixscan]         for (int i = n - 1; i >= 0; i--) {
[suffix]             answer[i] *= suffix;
[suffixmul]             suffix *= nums[i];
[suffixscan]         }
[done]         return answer;
[def]     }
[def] }
`),
  cpp: code(`
[def] class Solution {
[def] public:
[def]     vector<int> productExceptSelf(vector<int>& nums) {
[init]         int n = (int)nums.size();
[init2]         vector<int> answer(n, 0);
[init2]         int prefix = 1;
[prefixscan]         for (int i = 0; i < n; i++) {
[prefix]             answer[i] = prefix;
[prefixmul]             prefix *= nums[i];
[prefixscan]         }
[init2]         int suffix = 1;
[suffixscan]         for (int i = n - 1; i >= 0; i--) {
[suffix]             answer[i] *= suffix;
[suffixmul]             suffix *= nums[i];
[suffixscan]         }
[done]         return answer;
[def]     }
[def] };
`),
  pseudo: code(`
[def] function productExceptSelf(nums)
[init]   n = length(nums)
[init2]   answer = new array of n zeros
[init2]   prefix = 1
[prefixscan]   for i from 0 to n - 1
[prefix]     answer[i] = prefix
[prefixmul]     prefix = prefix * nums[i]
[prefixscan]   end for
[init2]   suffix = 1
[suffixscan]   for i from n - 1 down to 0
[suffix]     answer[i] = answer[i] * suffix
[suffixmul]     suffix = suffix * nums[i]
[suffixscan]   end for
[done]   return answer
[def] end function
`)
};

const singleNumberCode = {
  java: code(`
[def] class Solution {
[def]     public int singleNumber(int[] nums) {
[init]         int xor = 0;
[scan]         for (int i = 0; i < nums.length; i++) {
[xors]             xor ^= nums[i];
[scan]         }
[found]         int single = xor;
[done]         return xor;
[def]     }
[def] }
`),
  cpp: code(`
[def] class Solution {
[def] public:
[def]     int singleNumber(vector<int>& nums) {
[init]         int acc = 0;
[scan]         for (int i = 0; i < (int)nums.size(); i++) {
[xors]             acc ^= nums[i];
[scan]         }
[found]         int single = acc;
[done]         return acc;
[def]     }
[def] };
`),
  pseudo: code(`
[def] function singleNumber(nums)
[init]   xor = 0
[scan]   for i from 0 to length(nums)-1
[xors]     xor = xor xor nums[i]
[scan]   end for
[found]   single = xor
[done]   return xor
[def] end function
`)
};

const missingNumberCode = {
  java: code(`
[def] class Solution {
[def]     public int missingNumber(int[] nums) {
[init]         int missing = nums.length;
[loop]         for (int i = 0; i < nums.length; i++) {
[update]             missing ^= i ^ nums[i];
[loop]         }
[done]         return missing;
[def]     }
[def] }
`),
  cpp: code(`
[def] class Solution {
[def] public:
[def]     int missingNumber(vector<int>& nums) {
[init]         int missing = (int)nums.size();
[loop]         for (int i = 0; i < (int)nums.size(); i++) {
[update]             missing ^= i ^ nums[i];
[loop]         }
[done]         return missing;
[def]     }
[def] };
`),
  pseudo: code(`
[def] function missingNumber(nums)
[init]   missing = length(nums)
[loop]   for i from 0 to length(nums)-1
[update]     missing = missing XOR i XOR nums[i]
[loop]   end for
[done]   return missing
[def] end function
`)
};

const sortArrayCode = {
  java: code(`
[def] class Solution {
[def]     public int[] sortArray(int[] nums) {
[init]         mergeSort(nums, 0, nums.length - 1);
[done]         return nums;
[def]     }
[def]     private void mergeSort(int[] nums, int lo, int hi) {
[split]         if (lo >= hi) return;
[split]         int mid = lo + (hi - lo) / 2;
[divide]         mergeSort(nums, lo, mid);
[divide]         mergeSort(nums, mid + 1, hi);
[merge]         merge(nums, lo, mid, hi);
[def]     }
[def]     private void merge(int[] nums, int lo, int mid, int hi) {
[merge]         int[] left = java.util.Arrays.copyOfRange(nums, lo, mid + 1);
[merge]         int[] right = java.util.Arrays.copyOfRange(nums, mid + 1, hi + 1);
[compare]         int i = 0, j = 0, k = lo;
[compare]         while (i < left.length && j < right.length) {
[compare]             if (left[i] <= right[j]) nums[k++] = left[i++];
[compare]             else nums[k++] = right[j++];
[compare]         }
[write]         while (i < left.length) nums[k++] = left[i++];
[write]         while (j < right.length) nums[k++] = right[j++];
[done]         // segment lo..hi is now sorted
[def]     }
[def] }
`),
  cpp: code(`
[def] class Solution {
[def] public:
[def]     vector<int> sortArray(vector<int>& nums) {
[init]         mergeSort(nums, 0, (int)nums.size() - 1);
[done]         return nums;
[def]     }
[def] private:
[def]     void mergeSort(vector<int>& nums, int lo, int hi) {
[split]         if (lo >= hi) return;
[split]         int mid = lo + (hi - lo) / 2;
[divide]         mergeSort(nums, lo, mid);
[divide]         mergeSort(nums, mid + 1, hi);
[merge]         merge(nums, lo, mid, hi);
[def]     }
[def]     void merge(vector<int>& nums, int lo, int mid, int hi) {
[merge]         vector<int> left(nums.begin() + lo, nums.begin() + mid + 1);
[merge]         vector<int> right(nums.begin() + mid + 1, nums.begin() + hi + 1);
[compare]         size_t i = 0, j = 0;
[compare]         int k = lo;
[compare]         while (i < left.size() && j < right.size()) {
[compare]             if (left[i] <= right[j]) nums[k++] = left[i++];
[compare]             else nums[k++] = right[j++];
[compare]         }
[write]         while (i < left.size()) nums[k++] = left[i++];
[write]         while (j < right.size()) nums[k++] = right[j++];
[done]         // segment lo..hi is now sorted
[def]     }
[def] };
`),
  pseudo: code(`
[def] function sortArray(nums)
[init]   mergeSort(nums, 0, length(nums) - 1)
[done]   return nums
[def] function mergeSort(nums, lo, hi)
[split]   if lo >= hi return
[split]   mid = lo + (hi - lo) / 2
[divide]   mergeSort(nums, lo, mid)
[divide]   mergeSort(nums, mid + 1, hi)
[merge]   merge(nums, lo, mid, hi)
[def] function merge(nums, lo, mid, hi)
[merge]   left = copy(nums, lo, mid); right = copy(nums, mid + 1, hi)
[compare]   while left and right remain compare fronts
[write]   write smaller front back to nums[k]
[write]   copy any remainder back to nums
[done]   segment lo..hi is sorted
`)
};

const lisCode = {
  java: code(`
[def] class Solution {
[def]     public int lengthOfLIS(int[] nums) {
[init]         int n = nums.length;
[init]         int[] dp = new int[n];
[init]         for (int k = 0; k < n; k++) dp[k] = 1;
[init]         int best = 1;
[scan]         for (int i = 1; i < n; i++) {
[scan]             for (int j = 0; j < i; j++) {
[scan]                 if (nums[j] < nums[i]) {
[extend]                     if (dp[j] + 1 > dp[i]) dp[i] = dp[j] + 1;
[scan]                 }
[scan]             }
[best]             if (dp[i] > best) best = dp[i];
[scan]         }
[done]         return best;
[def]     }
[def] }
`),
  cpp: code(`
[def] class Solution {
[def] public:
[def]     int lengthOfLIS(vector<int>& nums) {
[init]         int n = (int)nums.size();
[init]         vector<int> dp(n, 1);
[init]         int best = 1;
[scan]         for (int i = 1; i < n; i++) {
[scan]             for (int j = 0; j < i; j++) {
[scan]                 if (nums[j] < nums[i]) {
[extend]                     if (dp[j] + 1 > dp[i]) dp[i] = dp[j] + 1;
[scan]                 }
[scan]             }
[best]             if (dp[i] > best) best = dp[i];
[scan]         }
[done]         return best;
[def]     }
[def] };
`),
  pseudo: code(`
[def] function lengthOfLIS(nums)
[init]   n = length(nums); dp = array(n, 1); best = 1
[scan]   for i from 1 to n - 1
[scan]     for j from 0 to i - 1
[scan]       if nums[j] < nums[i]
[extend]         if dp[j] + 1 > dp[i] then dp[i] = dp[j] + 1
[best]     if dp[i] > best then best = dp[i]
[done]   return best
[def] end function
`)
};

const maxProductCode = {
  java: code(`
[def] class Solution {
[def]     public int maxProduct(int[] nums) {
[init]         int curMax = nums[0];
[init]         int curMin = nums[0];
[init]         int best = nums[0];
[scan]         for (int i = 1; i < nums.length; i++) {
[cand]             int x = nums[i];
[cand]             int candA = x;
[cand]             int candB = curMax * x;
[cand]             int candC = curMin * x;
[cand]             int newMax = candA > candB ? (candA > candC ? candA : candC) : (candB > candC ? candB : candC);
[cand]             int newMin = candA < candB ? (candA < candC ? candA : candC) : (candB < candC ? candB : candC);
[update]             curMax = newMax;
[update]             curMin = newMin;
[best]             if (curMax > best) {
[best]                 best = curMax;
[def]             }
[def]         }
[done]         return best;
[def]     }
[def] }
`),
  cpp: code(`
[def] class Solution {
[def] public:
[def]     int maxProduct(vector<int>& nums) {
[init]         int curMax = nums[0];
[init]         int curMin = nums[0];
[init]         int best = nums[0];
[scan]         for (int i = 1; i < (int)nums.size(); i++) {
[cand]             int x = nums[i];
[cand]             int candA = x;
[cand]             int candB = curMax * x;
[cand]             int candC = curMin * x;
[cand]             int newMax = candA > candB ? (candA > candC ? candA : candC) : (candB > candC ? candB : candC);
[cand]             int newMin = candA < candB ? (candA < candC ? candA : candC) : (candB < candC ? candB : candC);
[update]             curMax = newMax;
[update]             curMin = newMin;
[best]             if (curMax > best) {
[best]                 best = curMax;
[def]             }
[def]         }
[done]         return best;
[def]     }
[def] };
`),
  pseudo: code(`
[def] function maxProduct(nums)
[init]   curMax = nums[0]
[init]   curMin = nums[0]
[init]   best = nums[0]
[scan]   for i from 1 to length(nums) - 1
[cand]     x = nums[i]
[cand]     candA = x
[cand]     candB = curMax * x
[cand]     candC = curMin * x
[cand]     newMax = max(candA, candB, candC)
[cand]     newMin = min(candA, candB, candC)
[update]     curMax = newMax
[update]     curMin = newMin
[best]     if curMax > best
[best]       best = curMax
[best]     end if
[scan]   end for
[done]   return best
[def] end function
`)
};

const canJumpCode = {
  java: code(`
[def] class Solution {
[def]     public boolean canJump(int[] nums) {
[init]         int reach = 0;
[scan]         for (int i = 0; i < nums.length; i++) {
[stuck]             if (i > reach) {
[done]                 return false;
[stuck]             }
[extend]             reach = Math.max(reach, i + nums[i]);
[early]             if (reach >= nums.length - 1) {
[done]                 return true;
[early]             }
[scan]         }
[done]         return reach >= nums.length - 1;
[def]     }
[def] }
`),
  cpp: code(`
[def] class Solution {
[def] public:
[def]     bool canJump(vector<int>& nums) {
[init]         int reach = 0;
[scan]         for (int i = 0; i < (int)nums.size(); i++) {
[stuck]             if (i > reach) {
[done]                 return false;
[stuck]             }
[extend]             reach = max(reach, i + nums[i]);
[early]             if (reach >= (int)nums.size() - 1) {
[done]                 return true;
[early]             }
[scan]         }
[done]         return reach >= (int)nums.size() - 1;
[def]     }
[def] };
`),
  pseudo: code(`
[def] function canJump(nums)
[init]   reach = 0
[scan]   for i from 0 to length(nums) - 1
[stuck]     if i > reach
[done]       return false
[stuck]     end if
[extend]     reach = max(reach, i + nums[i])
[early]     if reach >= length(nums) - 1
[done]       return true
[early]     end if
[scan]   end for
[done]   return reach >= length(nums) - 1
[def] end function
`)
};

const gasStationCode = {
  java: code(`
[def] class Solution {
[def]     public int canCompleteCircuit(int[] gas, int[] cost) {
[init]         int total = 0;
[init]         int tank = 0;
[init]         int start = 0;
[scan]         for (int i = 0; i < gas.length; i++) {
[accum]             int net = gas[i] - cost[i];
[accum]             total += net;
[accum]             tank += net;
[reset]             if (tank < 0) {
[reset]                 start = i + 1;
[reset]                 tank = 0;
[reset]             }
[scan]         }
[verdict]         if (total < 0) {
[verdict]             return -1;
[verdict]         }
[done]         return start;
[def]     }
[def] }
`),
  cpp: code(`
[def] class Solution {
[def] public:
[def]     int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {
[init]         int total = 0;
[init]         int tank = 0;
[init]         int start = 0;
[scan]         for (int i = 0; i < (int)gas.size(); i++) {
[accum]             int net = gas[i] - cost[i];
[accum]             total += net;
[accum]             tank += net;
[reset]             if (tank < 0) {
[reset]                 start = i + 1;
[reset]                 tank = 0;
[reset]             }
[scan]         }
[verdict]         if (total < 0) {
[verdict]             return -1;
[verdict]         }
[done]         return start;
[def]     }
[def] };
`),
  pseudo: code(`
[def] function canCompleteCircuit(gas, cost)
[init]   total = 0
[init]   tank = 0
[init]   start = 0
[scan]   for i from 0 to length(gas) - 1
[accum]     net = gas[i] - cost[i]
[accum]     total = total + net
[accum]     tank = tank + net
[reset]     if tank < 0
[reset]       start = i + 1
[reset]       tank = 0
[reset]     end if
[scan]   end for
[verdict]   if total < 0
[verdict]     return -1
[verdict]   end if
[done]   return start
[def] end function
`)
};

function buildJumpGame(args) {
  if (!Array.isArray(args) || args.length !== 1) throw new Error('jump-game expects [nums]');
  const raw = args[0];
  if (!Array.isArray(raw)) throw new Error('jump-game needs an integer array nums with length 1..8 and values in 0..20');
  if (raw.length < 1 || raw.length > 8) throw new Error('jump-game needs an array of length 1..8 (got ' + raw.length + ')');
  for (let k = 0; k < raw.length; k++) {
    const v = raw[k];
    if (!Number.isInteger(v) || v < 0 || v > 20) throw new Error('jump-game needs values in 0..20 (got ' + String(v) + ' at index ' + k + ')');
  }
  const nums = raw.slice();
  const n = nums.length;
  const frames = [];
  let reach = 0;

  frames.push(frame('init', 'Initialize', 'reach starts at 0; index 0 is reachable.',
    { values: nums.slice(), pointers: { i: 0 }, highlights: { 0: 'accent' }, vars: { reach } }));

  for (let i = 0; i < n; i++) {
    frames.push(frame('scan', 'Scan', 'Index ' + i + ' jumps ' + nums[i] + '; reach is ' + reach + '.',
      { values: nums.slice(), pointers: { i }, highlights: { [i]: 'accent' }, vars: { reach, i, jump: nums[i] } }));
    if (i > reach) {
      frames.push(frame('stuck', 'No reach', 'Index ' + i + ' lies beyond reach ' + reach + '; nothing lands here.',
        { values: nums.slice(), pointers: { i }, highlights: { [i]: 'warn' }, vars: { reach, i } }));
      frames.push(frame('done', 'Return', 'An index is unreachable; return false.',
        { values: nums.slice(), pointers: { i }, highlights: { [i]: 'warn' }, vars: { reach, i } }));
      return { kind: 'array', layout: { values: nums.slice() }, frames, result: false };
    }
    const before = reach;
    const cand = i + nums[i];
    reach = Math.max(reach, cand);
    frames.push(frame('extend', 'Extend reach', 'reach = max(' + before + ', ' + i + '+' + nums[i] + ') = ' + reach + '.',
      { values: nums.slice(), pointers: { i }, highlights: { [i]: 'ok' }, vars: { reach, i, jump: nums[i] } }));
    if (reach >= n - 1) {
      frames.push(frame('early', 'Last covered', 'reach ' + reach + ' covers index ' + (n - 1) + '; success.',
        { values: nums.slice(), pointers: { i }, highlights: { [i]: 'ok', [n - 1]: 'ok' }, vars: { reach, i } }));
      frames.push(frame('done', 'Return', 'Last index is covered; return true.',
        { values: nums.slice(), pointers: { i }, highlights: { [n - 1]: 'ok' }, vars: { reach, i } }));
      return { kind: 'array', layout: { values: nums.slice() }, frames, result: true };
    }
  }

  const result = reach >= n - 1;
  frames.push(frame('done', 'Return', 'Scan done with reach ' + reach + '; return ' + result + '.',
    { values: nums.slice(), vars: { reach } }));
  return { kind: 'array', layout: { values: nums.slice() }, frames, result };
}

function buildGasStation(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('gas-station expects [gas, cost]');
  const checkArr = (value, label) => {
    if (!Array.isArray(value)) throw new Error('gas-station expects [gas, cost] with integer arrays (got non-array for ' + label + ')');
    if (value.length < 1 || value.length > 7) throw new Error('gas-station visual bound: ' + label + ' length ' + value.length + ' outside 1..7; use 1..7 items (no truncation)');
    for (let k = 0; k < value.length; k++) {
      const v = value[k];
      if (!Number.isInteger(v) || v < 0 || v > 20) throw new Error('gas-station visual bound: ' + label + '[' + k + ']=' + String(v) + ' needs integer 0..20 (no truncation)');
    }
    return value.slice();
  };
  const gas = checkArr(args[0], 'gas');
  const cost = checkArr(args[1], 'cost');
  if (gas.length !== cost.length) throw new Error('gas-station needs equal-length gas and cost (got ' + gas.length + ' vs ' + cost.length + ')');
  const n = gas.length;

  const frames = [];
  let total = 0;
  let tank = 0;
  let start = 0;

  frames.push(frame('init', 'Initialize', 'Total 0, tank 0, start 0 before scan.',
    { values: gas.slice(), cost: cost.slice(), pointers: {}, highlights: {}, vars: { n, total, tank, start } }));

  for (let i = 0; i < n; i++) {
    frames.push(frame('scan', 'Scan', 'Station ' + i + ': gas ' + gas[i] + ', cost ' + cost[i] + '.',
      { values: gas.slice(), cost: cost.slice(), pointers: { i }, highlights: { [i]: 'accent' }, vars: { n, i, total, tank, start, gasVal: gas[i], costVal: cost[i] } }));
    const net = gas[i] - cost[i];
    total += net;
    tank += net;
    frames.push(frame('accum', 'Accumulate', 'Net ' + net + '; total ' + total + ', tank ' + tank + '.',
      { values: gas.slice(), cost: cost.slice(), pointers: { i }, highlights: { [i]: 'accent' }, vars: { n, i, net, total, tank, start } }));
    if (tank < 0) {
      start = i + 1;
      tank = 0;
      frames.push(frame('reset', 'Restart', 'Tank below 0; restart at ' + start + ' with tank 0.',
        { values: gas.slice(), cost: cost.slice(), pointers: { i }, highlights: { [i]: 'warn' }, vars: { n, i, net, total, tank, start } }));
    }
  }

  let result;
  if (total < 0) {
    frames.push(frame('verdict', 'Verdict', 'Total ' + total + ' < 0; no start can complete.',
      { values: gas.slice(), cost: cost.slice(), pointers: {}, highlights: {}, vars: { n, total, tank, start } }));
    result = -1;
  } else {
    // start == n with total >= 0 is unreachable (a reset at the last index
    // implies total < 0), so the clamp below is defensive dead code.
    const clamped = start >= n ? -1 : start;
    frames.push(frame('verdict', 'Verdict', 'Total ' + total + ' >= 0; start ' + start + ' completes.',
      { values: gas.slice(), cost: cost.slice(), pointers: start < n ? { i: start } : {}, highlights: start < n ? { [start]: 'ok' } : {}, vars: { n, total, tank, start } }));
    result = clamped;
  }

  frames.push(frame('done', 'Return', 'Return ' + result + '.',
    { values: gas.slice(), cost: cost.slice(), pointers: result >= 0 ? { i: result } : {}, highlights: result >= 0 ? { [result]: 'ok' } : {}, vars: { n, total, tank, start, result } }));

  return {
    kind: 'array',
    layout: { values: gas.slice(), cost: cost.slice() },
    frames,
    result
  };
}

export const adapters = {
  'two-sum': {
    signature: { name: 'twoSum', params: ['int[]', 'int'], return: 'int[]' },
    lesson: {
      idea: 'Scan once and keep a map of earlier values to indices; each value needs target - value to already be present.',
      trap: 'Storing nums[i] before checking it can reuse the same index, so [3,3] with target 6 could return [0,0].',
      time: 'O(n)',
      space: 'O(n)'
    },
    // Optional per-line explanations (presentation metadata, never compiled):
    // step-keyed plain-English notes shown by the Learn Explain toggle.
    explain: {
      def: 'The task: find two distinct positions whose values add to the target; exactly one pair exists.',
      init: 'Start with an empty map of earlier values so only already seen indices can complete a pair and reuse is impossible.',
      scan: 'Move left to right focusing on one position at a time so every value gets a fair chance as the later partner.',
      probe: 'Compute the partner needed (target minus current) and look only in the earlier map, since storing first would reuse the same index.',
      check: 'Test if the needed partner is already mapped, missing means no earlier pair exists and checking before storing protects distinctness.',
      found: 'Return the earlier mapped index with the current one; safe only because the check ran before the store, so positions differ.',
      store: 'Save the current value with its index for future partners, adding only after the check so the same position cannot match itself.',
      none: 'Report no pair when the full pass finds nothing, which confirms no pair of distinct positions completes the target.'
    },
    // Line-specific notes (0-based line index per language) for lines whose step
    // note would misdescribe them — chiefly closing braces. Step notes stay fallback.
    explainLines: {
      java: {
        7: 'End of the partner test: a miss falls through to store the current value for later positions.',
        9: 'End of one pass iteration: the stored value is now visible to every later position.'
      },
      cpp: {
        8: 'End of the partner test: a miss falls through to store the current value for later positions.',
        10: 'End of one pass iteration: the stored value is now visible to every later position.'
      },
      pseudo: {
        6: 'End of the partner test: a miss falls through to store the current value for later positions.',
        8: 'End of one pass iteration: the stored value is now visible to every later position.',
        10: 'End of the function scope; every return above exits with the pair or the empty result.'
      }
    },
    code: twoSumCode,
    build(args) {
      if (!Array.isArray(args) || args.length !== 2) throw new Error('two-sum expects [nums, target]');
      const nums = checkedArray(args[0], 2, 'two-sum');
      const target = args[1];
      if (!Number.isSafeInteger(target)) throw new Error('two-sum needs an integer target');

      const frames = [];
      const seen = {};
      let result = [];

      frames.push(frame('init', 'Initialize', 'Start with an empty map of earlier values.',
        { values: nums.slice(), vars: { target }, seen: {} }));

      for (let i = 0; i < nums.length; i++) {
        const need = safeSubtract(target, nums[i]);
        const writes = Object.keys(seen).length;
        frames.push(frame('scan', 'Scan', 'Take the next value and its index.',
          { pointers: { i }, highlights: { [i]: 'accent' }, values: nums.slice(), vars: { target }, seen: { ...seen }, ops: { cmp: i, writes } }));
        frames.push(frame('probe', 'Probe', 'Look for target - nums[i] among earlier values.',
          { pointers: { i }, highlights: { [i]: 'accent' }, values: nums.slice(), vars: { target, need }, seen: { ...seen }, ops: { cmp: i + 1, writes } }));
        if (Object.prototype.hasOwnProperty.call(seen, String(need))) {
          const j = seen[String(need)];
          frames.push(frame('found', 'Match found', 'Return the earlier index and the current index.',
            { pointers: { i }, highlights: { [i]: 'ok', [j]: 'ok' }, values: nums.slice(), vars: { target, need }, seen: { ...seen }, lookup: { from: i, key: String(need), hit: j }, ops: { cmp: i + 1, writes } }));
          result = [j, i];
          break;
        }
        frames.push(frame('check', 'Lookup missed', 'The complement is not among earlier values; store the current value next.',
          { pointers: { i }, highlights: { [i]: 'accent' }, values: nums.slice(), vars: { target, need }, seen: { ...seen }, lookup: { from: i, key: String(need), hit: null }, ops: { cmp: i + 1, writes } }));
        seen[String(nums[i])] = i;
        frames.push(frame('store', 'After store', 'Remember nums[i] for later complements.',
          { pointers: { i }, highlights: { [i]: 'dim' }, values: nums.slice(), vars: { target, need }, seen: { ...seen }, ops: { cmp: i + 1, writes: writes + 1 } }));
      }

      if (!result.length) {
        frames.push(frame('none', 'No pair', 'No two values add to the target; return an empty array.',
          { values: nums.slice(), vars: { target }, seen: { ...seen }, ops: { cmp: nums.length, writes: Object.keys(seen).length } }));
      }
      return finish(nums, frames, result);
    }
  },

  'contains-duplicate': {
    signature: { name: 'containsDuplicate', params: ['int[]'], return: 'boolean' },
    lesson: {
      idea: 'A hash set answers "have I seen this value?" in constant time, so one pass detects any repeat.',
      trap: 'Comparing only adjacent values misses duplicates when the input is not sorted.',
      time: 'O(n)',
      space: 'O(n)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      check: 'Test whether current value was recorded before, which proves a repeat spanning distinct positions.',
      def: 'Scope of duplicate-detection task returning whether any value repeats elsewhere in the collection.',
      hit: 'Report repeat found and stop early since one duplicate already decides the answer.',
      init: 'Start with empty record of values already encountered so only earlier positions can explain a repeat.',
      none: 'Report all values distinct after full pass with no repeat ever observed.',
      read: 'Observe current value as candidate that may already have appeared at an earlier position.',
      scan: 'Focus on next position in order so each element is tested once as possible later occurrence.',
      track: 'Remember current value for later positions, preserving evidence without affecting current decision.'
    },
    code: containsDuplicateCode,
    build(args) {
      if (!Array.isArray(args) || args.length !== 1) throw new Error('contains-duplicate expects [nums]');
      const nums = checkedArray(args[0], 1, 'contains-duplicate');

      const frames = [];
      const seen = {};
      let result = false;

      frames.push(frame('init', 'Initialize', 'Begin with an empty set of values seen so far.',
        { values: nums.slice(), seen: {} }));

      for (let i = 0; i < nums.length; i++) {
        const value = nums[i];
        const prev = Object.prototype.hasOwnProperty.call(seen, String(value)) ? seen[String(value)] : null;
        frames.push(frame('scan', 'Scan', 'Read the next value in the array.',
          { pointers: { i }, highlights: { [i]: 'accent' }, values: nums.slice(), vars: { value }, seen: { ...seen } }));
        const vars = { value };
        frames.push(frame('check', 'Check', prev === null ? value + ' is new so far.' : value + ' was already seen at index ' + prev + '.',
          { pointers: { i }, highlights: { [i]: 'accent' }, values: nums.slice(), vars, seen: { ...seen }, lookup: { from: i, key: String(value), hit: prev } }));
        if (prev !== null) {
          frames.push(frame('hit', 'After match', 'Return true at the first repeated value.',
            { pointers: { i }, highlights: { [i]: 'warn', [prev]: 'ok' }, values: nums.slice(), vars, seen: { ...seen }, lookup: { from: i, key: String(value), hit: prev } }));
          result = true;
          break;
        }
        seen[String(value)] = i;
        frames.push(frame('track', 'After store', 'Record the new value and its index.',
          { pointers: { i }, highlights: { [i]: 'ok' }, values: nums.slice(), vars, seen: { ...seen } }));
      }

      if (!result) {
        frames.push(frame('none', 'All distinct', 'Every value was distinct; return false.',
          { values: nums.slice(), seen: { ...seen } }));
      }
      const built = finish(nums, frames, result); built.layout.mapKind = 'set'; return built;
    }
  },

  'longest-consecutive-sequence': longestConsecutiveSequence,

  'best-time-to-buy-and-sell-stock': {
    signature: { name: 'maxProfit', params: ['int[]'], return: 'int' },
    lesson: {
      idea: 'Track the cheapest buy seen so far; the best sale today is prices[i] - minPrice.',
      trap: 'Using the global max minus global min ignores order; the buy must come before the sell.',
      time: 'O(n)',
      space: 'O(1)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      buy: 'Adopt current price as new cheapest buy since later sales benefit from lower cost basis.',
      buycheck: 'Guard updating cheapest buy so only strictly lower price resets future reference.',
      def: 'Scope of single buy-then-sell task seeking largest achievable later-minus-earlier price difference.',
      done: 'Return best gain found, which reflects optimal ordered buy-before-sell pair or no trade.',
      init: 'Anchor cheapest price seen so far at opening day so future sales compare against valid earlier buy.',
      initbest: 'Start best achievable gain at no-profit baseline so falling prices correctly yield no trade.',
      profit: 'Measure gain if sold today against cheapest earlier buy, which is only legal sale outcome now.',
      scan: 'Advance to next day as potential selling day while keeping earlier cheapest buy available.',
      sell: 'Adopt current gain as new optimum because it exceeds every sale opportunity seen before.',
      sellcheck: 'Guard updating best gain so only genuine improvement replaces prior optimum.'
    },
    code: maxProfitCode,
    build(args) {
      if (!Array.isArray(args) || args.length !== 1) throw new Error('best-time-to-buy-and-sell-stock expects [prices]');
      const prices = checkedArray(args[0], 1, 'best-time-to-buy-and-sell-stock');

      const frames = [];
      let minPrice = prices[0];
      let minDay = 0;
      let best = 0;

      frames.push(frame('init', 'Initialize', 'Day 0 is the cheapest buy so far; no profit yet.',
        { pointers: { i: 0 }, highlights: { 0: 'accent' }, window: [0, 0], values: prices.slice(), vars: { minPrice, best } }));

      for (let i = 1; i < prices.length; i++) {
        const profit = prices[i] - minPrice;
        frames.push(frame('scan', 'Scan', 'Compare selling today with the cheapest buy so far.',
          { pointers: { i }, highlights: { [i]: 'accent', [minDay]: 'ok' }, window: [minDay, i], values: prices.slice(), vars: { minPrice, best } }));
        frames.push(frame('profit', 'Candidate', 'Candidate profit for selling today.',
          { pointers: { i }, highlights: { [i]: 'accent', [minDay]: 'ok' }, window: [minDay, i], values: prices.slice(), vars: { minPrice, best, profit } }));
        if (profit > best) {
          const previousBest = best;
          best = profit;
          frames.push(frame('sell', 'After sell', 'Profit ' + profit + ' beats the previous best of ' + previousBest + '.',
            { pointers: { i }, highlights: { [i]: 'ok', [minDay]: 'ok' }, window: [minDay, i], values: prices.slice(), vars: { minPrice, best, profit } }));
        }
        if (prices[i] < minPrice) {
          minPrice = prices[i];
          minDay = i;
          frames.push(frame('buy', 'After buy', 'This price is a new cheapest buy for later days.',
            { pointers: { i }, highlights: { [i]: 'accent' }, window: [i, i], values: prices.slice(), vars: { minPrice, best, profit } }));
        }
      }

      frames.push(frame('done', 'Return', 'Maximum profit is ' + best + '.',
        { window: [minDay, prices.length - 1], values: prices.slice(), vars: { minPrice, best } }));
      return finish(prices, frames, best);
    }
  },

  'maximum-subarray': {
    signature: { name: 'maxSubArray', params: ['int[]'], return: 'int' },
    lesson: {
      idea: 'Kadane: extend the running subarray while it helps, otherwise restart the sum at the current value.',
      trap: 'Initializing the best sum to 0 fails on all-negative arrays; start it at nums[0].',
      time: 'O(n)',
      space: 'O(1)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      best: 'Record running window as new global optimum because it exceeds every segment seen before.',
      bestcheck: 'Guard testing whether running total sets new global optimum before recording it.',
      def: 'Scope of contiguous segment task seeking largest possible sum over all nonempty windows.',
      done: 'Return best sum observed, which corresponds to optimal contiguous segment found during scan.',
      extend: 'Grow running window through current element since carrying prior total still helps overall.',
      init: 'Seed running and best sums plus window anchors at opening element for negative-only correctness.',
      restart: 'Discard prior running total and start new window here because extension would drag sum down.',
      restartcheck: 'Guard testing whether starting fresh beats extending, keeping decision logic explicit.',
      scan: 'Advance to next element and reconsider whether running window should continue or restart.'
    },
    code: maxSubArrayCode,
    build(args) {
      if (!Array.isArray(args) || args.length !== 1) throw new Error('maximum-subarray expects [nums]');
      const nums = checkedArray(args[0], 1, 'maximum-subarray');

      const frames = [];
      let current = nums[0];
      let best = nums[0];
      let start = 0;
      let bestStart = 0;
      let bestEnd = 0;

      frames.push(frame('init', 'Initialize', 'Start with the first element as both current and best sum.',
        { pointers: { i: 0 }, highlights: { 0: 'accent' }, window: [0, 0], values: nums.slice(), vars: { current, best } }));

      for (let i = 1; i < nums.length; i++) {
        frames.push(frame('scan', 'Scan', 'Decide whether to extend the running window or restart here.',
          { pointers: { i }, highlights: { [i]: 'accent' }, window: [start, i - 1], values: nums.slice(), vars: { current, best } }));
        const extended = safeAdd(current, nums[i]);
        if (extended < nums[i]) {
          current = nums[i];
          start = i;
          frames.push(frame('restart', 'After restart', 'Restart the window at this index.',
            { pointers: { i }, highlights: { [i]: 'warn' }, window: [start, i], values: nums.slice(), vars: { current, best } }));
        } else {
          current = extended;
          frames.push(frame('extend', 'After extend', 'Extend the running window through this index.',
            { pointers: { i }, highlights: { [i]: 'ok' }, window: [start, i], values: nums.slice(), vars: { current, best } }));
        }
        if (current > best) {
          best = current;
          bestStart = start;
          bestEnd = i;
          frames.push(frame('best', 'After best', 'Best sum improves on the window [' + bestStart + ', ' + bestEnd + '].',
            { pointers: { i }, highlights: { [i]: 'ok' }, window: [bestStart, bestEnd], values: nums.slice(), vars: { current, best } }));
        }
      }

      frames.push(frame('done', 'Return', 'Largest subarray sum is ' + best + '.',
        { window: [bestStart, bestEnd], values: nums.slice(), vars: { current, best } }));
      return finish(nums, frames, best);
    }
  },

  'product-of-array-except-self': {
    signature: { name: 'productExceptSelf', params: ['int[]'], return: 'int[]' },
    lesson: {
      idea: 'Fill answer with prefix products left to right, then multiply in a running suffix product from the right.',
      trap: 'Dividing the total product breaks on zeros and is forbidden by the problem.',
      time: 'O(n)',
      space: 'O(1)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      def: 'Scope of per-position product task excluding self without division, handling zeros naturally.',
      done: 'Return completed collection where each slot holds product of all other values.',
      init: 'Capture collection length to bound both directional passes over identical index range.',
      init2: 'Prepare output storage and neutral running product before each directional accumulation pass.',
      prefix: 'Store product of all earlier values here, leaving later values for subsequent pass.',
      prefixmul: 'Fold current value into running prefix so next position includes it as left history.',
      prefixscan: 'Visit positions left to right so each slot sees product of everything before it.',
      suffix: 'Combine stored left product with running right product to complete exclusion of self.',
      suffixmul: 'Fold current value into running suffix so earlier position includes it as right history.',
      suffixscan: 'Visit positions right to left so each slot can include product of everything after it.'
    },
    code: productExceptSelfCode,
    build(args) {
      if (!Array.isArray(args) || args.length !== 1) throw new Error('product-of-array-except-self expects [nums]');
      const nums = checkedArray(args[0], 2, 'product-of-array-except-self');

      const n = nums.length;
      const answer = new Array(n).fill(0);
      const frames = [];
      let prefix = 1;

      frames.push(frame('init', 'Initialize', 'Store the array length.',
        { pointers: { i: 0 }, values: nums.slice(), vars: { n } }));
      // suffix is declared between the passes in the source (init2 line); these
      // prefix-phase frames must not publish it before its declaration.
      frames.push(frame('init2', 'Allocate', 'Allocate answer and start the prefix product at 1.',
        { pointers: { i: 0 }, values: nums.slice(), vars: { n, prefix, answer: answer.slice() } }));

      for (let i = 0; i < n; i++) {
        frames.push(frame('prefixscan', 'Pass 1', 'Visit each index left to right.',
          { pointers: { i }, highlights: { [i]: 'accent' }, values: nums.slice(), vars: { prefix, answer: answer.slice() } }));
        answer[i] = prefix;
        frames.push(frame('prefix', 'After write', 'answer[i] holds the product of values left of it.',
          { pointers: { i }, highlights: { [i]: 'ok' }, values: nums.slice(), vars: { prefix, answer: answer.slice() } }));
        prefix = safeMultiply(prefix, nums[i]);
        frames.push(frame('prefixmul', 'After prefix update', 'Multiply the running prefix by nums[i].',
          { pointers: { i }, highlights: { [i]: 'dim' }, values: nums.slice(), vars: { prefix, answer: answer.slice() } }));
      }

      let suffix = 1;
      for (let i = n - 1; i >= 0; i--) {
        frames.push(frame('suffixscan', 'Pass 2', 'Visit each index right to left.',
          { pointers: { i }, highlights: { [i]: 'accent' }, values: nums.slice(), vars: { prefix, suffix, answer: answer.slice() } }));
        answer[i] = safeMultiply(answer[i], suffix);
        frames.push(frame('suffix', 'After suffix update', 'Multiply answer[i] by the product of values right of it.',
          { pointers: { i }, highlights: { [i]: 'ok' }, values: nums.slice(), vars: { prefix, suffix, answer: answer.slice() } }));
        suffix = safeMultiply(suffix, nums[i]);
        frames.push(frame('suffixmul', 'After suffix update', 'Multiply the running suffix by nums[i].',
          { pointers: { i }, highlights: { [i]: 'dim' }, values: nums.slice(), vars: { prefix, suffix, answer: answer.slice() } }));
      }

      frames.push(frame('done', 'Return', 'Return the completed answer array.',
        { values: nums.slice(), vars: { prefix, suffix, answer: answer.slice() } }));
      return finish(nums, frames, answer);
    }
  },
  'single-number': {
    signature: { name: 'singleNumber', params: ['int[]'], return: 'int' },
    lesson: {
      idea: 'XOR cancels paired values (a ^ a = 0 and 0 ^ a = a), so XORing every element leaves exactly the single one.',
      trap: 'Comparing only adjacent values misses pairs that are not next to each other; the XOR accumulator must touch every element once.',
      time: 'O(n)',
      space: 'O(1)'
    },
    code: singleNumberCode,
    explain: {
      "def": "Scope of the single-number task returning the one unpaired element.",
      "init": "Start the accumulator at the XOR identity so the first element seeds it cleanly.",
      "scan": "Focus on the next index in order so every element folds in exactly once.",
      "xors": "Fold the current element into the accumulator; paired values cancel (a ^ a = 0).",
      "found": "After the full pass only the unpaired value can remain; name it.",
      "done": "Return the accumulator: the single number."
    },
    explainLines: {
      "java": {
        "5": "End of one pass iteration; the updated accumulator is visible to every later position.",
        "8": "Closes the method scope.",
        "9": "Closes the class scope."
      },
      "cpp": {
        "6": "End of one pass iteration; the updated accumulator is visible to every later position.",
        "9": "Closes the method scope.",
        "10": "Closes the class scope."
      },
      "pseudo": {
        "4": "Loop boundary; repeats the fold for the next index.",
        "7": "End of function scope."
      }
    },
    build(args) {
      if (!Array.isArray(args) || args.length !== 1) throw new Error('single-number expects [nums]');
      const nums = checkedArray(args[0], 1, 'single-number');
      if (nums.length > 12) throw new Error('single-number visual bound: array length ' + nums.length + ' exceeds 12; split or shorten the input (no truncation applied)');

      const frames = [];
      let xor = 0;

      frames.push(frame('init', 'Initialize', 'Start the XOR accumulator at 0; 0 ^ a = a so the first element seeds it cleanly.',
        { values: nums.slice(), vars: { xor } }));

      for (let i = 0; i < nums.length; i++) {
        const prev = xor;
        frames.push(frame('scan', 'Scan', 'Focus on index ' + i + ' with value ' + nums[i] + ' while the accumulator holds ' + prev + '.',
          { pointers: { i }, highlights: { [i]: 'accent' }, values: nums.slice(), vars: { xor: prev, value: nums[i] } }));
        xor = xor ^ nums[i];
        frames.push(frame('xors', 'XOR accumulate', 'Fold nums[' + i + '] into the accumulator: ' + prev + ' ^ ' + nums[i] + ' = ' + xor + '. Paired values cancel toward 0.',
          { pointers: { i }, highlights: { [i]: 'ok' }, values: nums.slice(), vars: { xor, value: nums[i], prev } }));
      }

      // Visual aid only: locate the value with count 1 for highlighting. The
      // result itself comes from the XOR accumulator above, not from this map.
      const counts = new Map();
      for (const v of nums) counts.set(v, (counts.get(v) ?? 0) + 1);
      let singleIndex = 0;
      for (let i = 0; i < nums.length; i++) {
        if (counts.get(nums[i]) === 1) { singleIndex = i; break; }
      }

      frames.push(frame('found', 'Single isolated', 'Full pass done: the accumulator holds ' + xor + ', the value that never paired up (index ' + singleIndex + ').',
        { pointers: { i: singleIndex }, highlights: { [singleIndex]: 'ok' }, values: nums.slice(), vars: { xor, single: xor } }));
      frames.push(frame('done', 'Return', 'Return ' + xor + ' as the single number.',
        { pointers: { i: singleIndex }, highlights: { [singleIndex]: 'ok' }, values: nums.slice(), vars: { xor, single: xor } }));

      return finish(nums, frames, xor);
    }
  },
  'missing-number': {
    signature: { name: 'missingNumber', params: ['int[]'], return: 'int' },
    lesson: {
      idea: 'XOR cancels paired values, so seeding the accumulator with n and folding each index i with nums[i] leaves exactly the missing range value.',
      trap: 'The range is 0..n inclusive (n + 1 values for n entries). Seeding with 0 instead of n silently returns the wrong survivor; sorting first costs O(n log n).',
      time: 'O(n)',
      space: 'O(1) extra; the input row is never mutated'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      def: 'Scope of the missing-value task: fold the full range against the input so only the absent value survives.',
      done: 'Return the accumulator, which now holds the only range value that was never cancelled.',
      init: 'Seed the accumulator with n, the one range value that owns no index to pair with later.',
      loop: 'Visit each position exactly once so every present value is folded in once alongside its index.',
      update: 'Cancel the current index/value pair out of the accumulator; paired bits vanish, the survivor stays.'
    },
    code: missingNumberCode,
    build(args) {
      if (!Array.isArray(args) || args.length !== 1) throw new Error('missing-number expects [nums]');
      const raw = checkedArray(args[0], 1, 'missing-number');
      if (raw.length > 12) throw new Error('missing-number visual bound: array length ' + raw.length + ' exceeds 12; split or shorten the input (no truncation applied)');
      // The XOR fold is only meaningful on a true 0..n permutation: reject
      // out-of-range or repeated values instead of showing a wrong survivor.
      const n = raw.length;
      const seen = new Set();
      for (let k = 0; k < raw.length; k++) {
        const v = raw[k];
        if (v < 0 || v > n) throw new Error('missing-number needs values in the range [0, ' + n + '] for n=' + n + ' (nums[' + k + ']=' + v + ')');
        if (seen.has(v)) throw new Error('missing-number needs all numbers unique (nums[' + k + ']=' + v + ' repeats an earlier value)');
        seen.add(v);
      }
      const nums = raw.slice();

      const frames = [];
      let missing = n;
      frames.push(frame('init', 'Initialize', 'Range is 0..' + n + '; start missing at ' + n + '.',
        { values: nums.slice(), vars: { n, missing } }));
      for (let i = 0; i < n; i++) {
        const prev = missing;
        missing = missing ^ i ^ nums[i];
        frames.push(frame('update', 'Fold index ' + i, prev + ' XOR ' + i + ' XOR ' + nums[i] + ' = ' + missing + '.',
          { pointers: { i }, highlights: { [i]: 'accent' }, values: nums.slice(), vars: { n, i, current: nums[i], missing } }));
      }
      frames.push(frame('done', 'Return the survivor', 'Only ' + missing + ' never cancelled; return it.',
        { highlights: Object.fromEntries(nums.map((_, k) => [k, 'ok'])), values: nums.slice(), vars: { n, missing, answer: missing } }));
      return finish(nums, frames, missing);
    }
  },
  'sort-an-array': {
    signature: { name: 'sortArray', params: ['int[]'], return: 'int[]' },
    lesson: {
      idea: 'Split the range in half, recursively sort each half, then merge the two sorted halves by compares and write-backs.',
      trap: 'Skipping the mid split or merging without draining both remainders leaves halves unsorted or drops values.',
      time: 'O(n log n)',
      space: 'O(n)'
    },
    code: sortArrayCode,
    build(args) {
      if (!Array.isArray(args) || args.length !== 1) throw new Error('sort-an-array expects [nums]');
      const raw = args[0];
      if (!Array.isArray(raw)) throw new Error('sort-an-array expects [nums] with an integer array (got non-array)');
      if (raw.length < 1 || raw.length > 8) throw new Error('sort-an-array visual bound: array length ' + raw.length + ' outside 1..8; shorten input (no truncation)');
      for (let k = 0; k < raw.length; k++) {
        if (!Number.isSafeInteger(raw[k])) throw new Error('sort-an-array needs safe integers (nums[' + k + '] invalid)');
      }
      const nums = raw.slice();
      const a = nums.slice();
      const frames = [];

      const push = (step, label, note, pointers, highlights, vars) => {
        frames.push(frame(step, label, note, { values: a.slice(), pointers, highlights, vars }));
      };

      push('init', 'Initialize', 'Start top-down merge sort on n=' + a.length + '.', {}, {}, { n: a.length });

      function sort(lo, hi) {
        if (lo >= hi) {
          const h = {};
          h[lo] = 'dim';
          push('split', 'Base case', 'Segment [' + lo + '..' + hi + '] has 1 item; sorted.', { lo, hi }, h, { lo, hi });
          return;
        }
        const mid = Math.floor((lo + hi) / 2);
        const hs = {};
        hs[mid] = 'accent';
        push('split', 'Split', 'Split [' + lo + '..' + hi + '] at mid=' + mid + '.', { lo, mid, hi }, hs, { lo, mid, hi });
        const hl = {};
        hl[lo] = 'accent';
        hl[mid] = 'accent';
        push('divide', 'Sort left', 'Sort left [' + lo + '..' + mid + '].', { lo, mid, hi }, hl, { lo, mid, hi });
        sort(lo, mid);
        const hr = {};
        hr[mid + 1] = 'accent';
        hr[hi] = 'accent';
        push('divide', 'Sort right', 'Sort right [' + (mid + 1) + '..' + hi + '].', { lo, mid, hi }, hr, { lo, mid, hi });
        sort(mid + 1, hi);
        const hm = {};
        hm[lo] = 'accent';
        hm[hi] = 'accent';
        push('merge', 'Merge', 'Merge [' + lo + '..' + mid + '] and [' + (mid + 1) + '..' + hi + '].', { lo, mid, hi }, hm, { lo, mid, hi });
        const left = a.slice(lo, mid + 1);
        const right = a.slice(mid + 1, hi + 1);
        let i = 0;
        let j = 0;
        let k = lo;
        while (i < left.length && j < right.length) {
          const hc = {};
          hc[lo + i] = 'accent';
          hc[mid + 1 + j] = 'accent';
          push('compare', 'Compare', 'Compare L=' + left[i] + ' vs R=' + right[j] + ' for k=' + k + '.', { leftPos: lo + i, rightPos: mid + 1 + j, k }, hc, { lo, mid, hi, k, leftVal: left[i], rightVal: right[j] });
          let picked;
          if (left[i] <= right[j]) {
            picked = left[i];
            i++;
          } else {
            picked = right[j];
            j++;
          }
          a[k] = picked;
          const hw = {};
          hw[k] = 'ok';
          push('write', 'Write back', 'Write ' + picked + ' to index ' + k + '.', { k }, hw, { lo, mid, hi, k, picked });
          k++;
        }
        while (i < left.length) {
          a[k] = left[i];
          const hw = {};
          hw[k] = 'ok';
          push('write', 'Write back', 'Write ' + left[i] + ' to index ' + k + ' (drain left).', { k }, hw, { lo, mid, hi, k, picked: left[i] });
          i++;
          k++;
        }
        while (j < right.length) {
          a[k] = right[j];
          const hw = {};
          hw[k] = 'ok';
          push('write', 'Write back', 'Write ' + right[j] + ' to index ' + k + ' (drain right).', { k }, hw, { lo, mid, hi, k, picked: right[j] });
          j++;
          k++;
        }
        const hd = {};
        for (let t = lo; t <= hi; t++) hd[t] = 'ok';
        push('merge', 'Segment sorted', 'Segment [' + lo + '..' + hi + '] sorted.', { lo, hi }, hd, { lo, mid, hi });
      }

      sort(0, a.length - 1);
      push('done', 'Done', 'Sorted [' + a.join(',') + '].', {}, {}, { n: a.length });

      return finish(nums, frames, a.slice());
    }
  },
  'longest-increasing-subsequence': {
    signature: { name: 'lengthOfLIS', params: ['int[]'], return: 'int' },
    lesson: {
      idea: 'dp[i] is the LIS length ending at i (starts 1); extend dp[i] from any earlier smaller nums[j], keep the best over all ends.',
      trap: 'Strictly increasing needs nums[j] < nums[i]; using <= counts equal values and overstates the answer on duplicates.',
      time: 'O(n^2)',
      space: 'O(n)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    // Delivery-sprint P34: step notes + 0-based brace overrides verified against
    // lisCode above (java/cpp closers only; pseudo needs none). R07 line-map
    // errors repaired (1-based wave50 keys rejected; 0-based pseudo convention used).
    explain: {
      def: 'Task scope: return the length of the longest strictly increasing subsequence; equal values never extend.',
      init: 'Base state: every singleton subsequence has length 1, so dp starts all ones and the running optimum starts at 1.',
      scan: 'Read one predecessor pair (nums[j], nums[i]) and decide NOT to write: either nums[j] >= nums[i], or dp[j]+1 does not beat dp[i].',
      extend: 'Write step: nums[j] < nums[i] and dp[j]+1 > dp[i], so the best subsequence ending at j extends through nums[i].',
      best: 'End-of-i bookkeeping: dp[i] is final, so best becomes max(best, dp[i]).',
      done: 'Return the optimum over all ending positions, which equals the LIS length of the whole array.'
    },
    explainLines: {
      java: {
        10: 'End of the strict-less branch: a miss leaves dp[i] unchanged for this predecessor.',
        11: 'End of the inner loop: predecessor j has covered every earlier position for this i.',
        13: 'End of the outer loop: every dp[i] is final and best is the optimum so far.'
      },
      cpp: {
        10: 'End of the strict-less branch: a miss leaves dp[i] unchanged for this predecessor.',
        11: 'End of the inner loop: predecessor j has covered every earlier position for this i.',
        13: 'End of the outer loop: every dp[i] is final and best is the optimum so far.'
      },
      pseudo: {}
    },
    code: lisCode,
    build(args) {
      if (!Array.isArray(args) || args.length !== 1) throw new Error('longest-increasing-subsequence expects [nums]');
      const raw = args[0];
      if (!Array.isArray(raw)) throw new Error('longest-increasing-subsequence expects [nums] with an integer array (got non-array)');
      if (raw.length < 1 || raw.length > 8) throw new Error('longest-increasing-subsequence visual bound: array length ' + raw.length + ' outside 1..8; shorten input (no truncation)');
      for (let k = 0; k < raw.length; k++) {
        if (!Number.isSafeInteger(raw[k])) throw new Error('longest-increasing-subsequence needs safe integers (nums[' + k + '] invalid)');
      }
      const nums = raw.slice();
      const n = nums.length;
      const dp = new Array(n).fill(1);
      let best = 1;
      const frames = [];
      const anchors = [];

      const push = (step, label, note, pointers, highlights, vars) => {
        frames.push(frame(step, label, note, { values: nums.slice(), pointers, highlights, vars }));
      };

      push('init', 'Initialize dp', 'dp all ones for n=' + n + '; best=1.', {}, {}, { dp: dp.slice(), best, n });
      anchors.push(0);

      for (let i = 1; i < n; i++) {
        for (let j = 0; j < i; j++) {
          const point = { i, j };
          if (nums[j] < nums[i]) {
            if (dp[j] + 1 > dp[i]) {
              dp[i] = dp[j] + 1;
              const highlights = {};
              highlights[i] = 'ok';
              highlights[j] = 'dim';
              push('extend', 'Extend', 'nums[' + j + ']=' + nums[j] + ' < nums[' + i + ']=' + nums[i] + '; dp[' + i + ']=' + dp[i] + '.', point, highlights, { dp: dp.slice(), best, i, j });
            } else {
              const highlights = {};
              highlights[i] = 'accent';
              highlights[j] = 'accent';
              push('scan', 'Compare', 'nums[' + j + ']=' + nums[j] + ' < nums[' + i + ']=' + nums[i] + '; dp[' + i + ']=' + dp[i] + ' stays.', point, highlights, { dp: dp.slice(), best, i, j });
            }
          } else {
            const highlights = {};
            highlights[i] = 'accent';
            highlights[j] = 'accent';
            push('scan', 'Compare', 'nums[' + j + ']=' + nums[j] + ' >= nums[' + i + ']=' + nums[i] + '; no extend.', point, highlights, { dp: dp.slice(), best, i, j });
          }
        }
        if (dp[i] > best) best = dp[i];
        const done = {};
        done[i] = 'ok';
        push('best', 'Track best', 'End i=' + i + ': dp[' + i + ']=' + dp[i] + '; best=' + best + '.', { i }, done, { dp: dp.slice(), best, i });
        anchors.push(frames.length - 1);
      }

      push('done', 'Done', 'LIS length ' + best + ' for [' + nums.join(',') + '].', {}, {}, { dp: dp.slice(), best, n });
      anchors.push(frames.length - 1);

      // Single compaction pass with anchors (identity under the 40 budget;
      // anchors feed the host drilldown pager via built.anchors).
      const packed = boundedFrames(frames, MAX_FRAMES, anchors);
      return {
        kind: 'array',
        layout: { values: nums.slice() },
        frames: packed.frames,
        result: best,
        anchors,
        selected: packed.selected,
        omitted: packed.omitted
      };
    }
  },
  'maximum-product-subarray': {
    signature: { name: 'maxProduct', params: ['int[]'], return: 'int' },
    lesson: {
      idea: 'Track best and worst products ending here; a negative flips them, so each step takes best of x, curMax*x, curMin*x.',
      trap: 'Tracking only the max fails on negatives: a small negative times a negative becomes the new maximum.',
      time: 'O(n)',
      space: 'O(1)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    // Delivery-sprint P35: staged EXPLAIN used a languages-array shape that is
    // incompatible with the live step-map contract (P50 precedent), so the
    // prose below is coordinator-written in live shape: step notes incl. the
    // new update step, plus 0-based brace overrides for java/cpp (pseudo none).
    // Coordinator fix vs staged draft: the two commit lines are retagged
    // [cand]->[update] so every emitted update frame maps to a code line
    // (Unmapped gate); candidate reads keep [cand], so both steps stay mapped.
    explain: {
      def: 'Task scope: return the largest product of any contiguous subarray; a single element counts as a subarray.',
      init: 'Base state: index 0 is the only subarray ending at 0, so curMax, curMin and best all start at nums[0].',
      scan: 'Read the next candidate x = nums[i]; every subarray ending at i either restarts here or extends an optimal one.',
      cand: 'Form three candidates from pre-update state: restart at x, extend the best (curMax*x) or the worst (curMin*x).',
      update: 'Commit both trackers together: curMax and curMin now describe subarrays ending at i; best is unchanged.',
      best: 'Promote the ending-here optimum: curMax beats every subarray seen so far, so best adopts it.',
      done: 'Return best, the maximum product over all subarrays of the whole array.'
    },
    explainLines: {
      java: {
        16: 'End of the improvement branch: a miss keeps the new curMax/curMin and falls through to the next i.',
        17: 'End of one position: curMax/curMin now describe subarrays ending at i and best covers nums[0..i].'
      },
      cpp: {
        17: 'End of the improvement branch: a miss keeps the new curMax/curMin and falls through to the next i.',
        18: 'End of one position: curMax/curMin now describe subarrays ending at i and best covers nums[0..i].'
      },
      pseudo: {}
    },
    code: maxProductCode,
    build(args) {
      if (!Array.isArray(args) || args.length !== 1) throw new Error('maximum-product-subarray expects [nums]');
      const raw = args[0];
      if (!Array.isArray(raw)) throw new Error('maximum-product-subarray needs an integer array nums with length 1..8 and values in -9..9');
      if (raw.length < 1 || raw.length > 8) throw new Error('maximum-product-subarray needs an array of length 1..8 (got ' + raw.length + ')');
      for (let k = 0; k < raw.length; k++) {
        const v = raw[k];
        if (!Number.isInteger(v) || v < -9 || v > 9) throw new Error('maximum-product-subarray needs values in -9..9 (got ' + String(v) + ' at index ' + k + ')');
      }
      const nums = raw.slice();
      const frames = [];
      const anchors = [];
      let curMax = nums[0];
      let curMin = nums[0];
      let best = nums[0];

      frames.push(frame('init', 'Initialize', 'Start curMax, curMin and best at nums[0].',
        { values: nums.slice(), pointers: { i: 0 }, highlights: { 0: 'accent' }, vars: { curMax, curMin, best } }));
      anchors.push(0);

      for (let i = 1; i < nums.length; i++) {
        frames.push(frame('scan', 'Scan', 'Look at nums[' + i + '] as the next candidate.',
          { values: nums.slice(), pointers: { i }, highlights: { [i]: 'accent' }, vars: { curMax, curMin, best } }));
        const x = nums[i];
        const candA = x;
        const candB = curMax * x;
        const candC = curMin * x;
        const newMax = Math.max(candA, candB, candC);
        const newMin = Math.min(candA, candB, candC);
        frames.push(frame('cand', 'Candidates', 'Pick best and worst of x, curMax*x, curMin*x.',
          { values: nums.slice(), pointers: { i }, highlights: { [i]: 'accent' }, vars: { curMax, curMin, best, x, candA, candB, candC, newMax, newMin } }));
        curMax = newMax;
        curMin = newMin;
        if (curMax > best) {
          best = curMax;
          anchors.push(frames.length);
          frames.push(frame('best', 'Update best', 'Ending-here max ' + curMax + ' beats prior best.',
            { values: nums.slice(), pointers: { i }, highlights: { [i]: 'ok' }, vars: { curMax, curMin, best, x } }));
        } else {
          // Additive P35 fix: every curMax/curMin commit is inspectable, even
          // when best does not improve (previously silent in detailed mode).
          frames.push(frame('update', 'Carry forward', 'Commit curMax=' + curMax + ', curMin=' + curMin + '; best stays ' + best + '.',
            { values: nums.slice(), pointers: { i }, highlights: { [i]: 'dim' }, vars: { curMax, curMin, best, x } }));
        }
      }

      frames.push(frame('done', 'Return', 'Largest product over all subarrays is ' + best + '.',
        { values: nums.slice(), vars: { curMax, curMin, best } }));
      anchors.push(frames.length - 1);

      // Single compaction pass with anchors (identity under the 40 budget;
      // anchors feed the host drilldown pager via built.anchors).
      const packed = boundedFrames(frames, MAX_FRAMES, anchors);
      return {
        kind: 'array',
        layout: { values: nums.slice() },
        frames: packed.frames,
        result: best,
        anchors,
        selected: packed.selected,
        omitted: packed.omitted
      };
    }
  },
  'jump-game': {
    signature: { name: 'canJump', params: ['int[]'], return: 'boolean' },
    lesson: {
      idea: 'Track the farthest reachable index; every i must satisfy i <= reach, then reach grows to max(reach, i + nums[i]).',
      trap: 'A zero is fatal only when no earlier jump skips over it; only the i > reach check decides failure, not the zero itself.',
      time: 'O(n)',
      space: 'O(1)'
    },
    // Per-line explanations (presentation metadata, never compiled).
    // Distilled from the reviewed Q150 lesson (jump-game.explain.mjs step whys);
    // over-length staged prose shortened to the 140-char contract, no example values.
    explain: {
      def: 'Declares the exact judge entry point: an int array in, a boolean out. No extra state is needed, so the method stays O(1) space.',
      init: 'reach tracks the farthest provably landable index; only index 0 is known at the start, so 0 is the honest seed.',
      scan: 'Walks indices in order: index i is landable exactly when i <= reach, i.e. some earlier jump covers it.',
      stuck: 'The only failure test: an index beyond every jump seen so far can never be landed on — return false at once.',
      extend: 'Index i is landable, so fold its jump in: reach = max(reach, i + nums[i]); coverage never shrinks.',
      early: 'Once coverage includes the last index the answer is settled; exit early with the same O(n) result.',
      done: 'Defensive final return: the early exit fires first on success, so this documents the invariant.'
    },
    code: canJumpCode,
    build: buildJumpGame
  },
  'gas-station': {
    signature: { name: 'canCompleteCircuit', params: ['int[]', 'int[]'], return: 'int' },
    lesson: {
      idea: 'Track total net plus running tank; restart after any station where the tank goes negative.',
      trap: 'A locally reachable start can still fail globally; total gas minus total cost decides.',
      time: 'O(n)',
      space: 'O(1)'
    },
    code: gasStationCode,
    explain: {
      "def": "Scope of the circular tour task returning the unique feasible start or minus one; execution starts in the body.",
      "init": "Set both running sums and the candidate start to zero before reading any station net.",
      "scan": "Focus on one station at a time so its gas minus cost net can join both running sums in order.",
      "accum": "Add the station net to the global total and the current tank so each leg is counted exactly once.",
      "reset": "Abandon every start up to the failing station since each would carry no more fuel at this point, then retry ahead.",
      "verdict": "Read the global total: a deficit proves no start can succeed while a surplus proves the candidate succeeds.",
      "done": "Return the surviving candidate start, or minus one when the global total showed the tour impossible."
    },
    explainLines: {
      "java": {
        "12": "End of the restart branch; the tank is zeroed and the scan continues from the next station.",
        "13": "End of the station scan; control passes to the global total verdict.",
        "16": "End of the impossibility branch; falling through returns the surviving start."
      },
      "cpp": {
        "13": "End of the restart branch; the tank is zeroed and the scan continues from the next station.",
        "14": "End of the station scan; control passes to the global total verdict.",
        "17": "End of the impossibility branch; falling through returns the surviving start."
      },
      "pseudo": {
        "11": "End of the restart branch; the tank is zeroed and the scan continues from the next station.",
        "12": "End of the station scan; control passes to the global total verdict.",
        "15": "End of the impossibility branch; falling through returns the surviving start."
      }
    },
    build: buildGasStation
  }
};
