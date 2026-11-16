/**
 * target-sum — live walkthrough adapter (2-D DP, LeetCode 494).
 *
 * Counts sign assignments with an offset table: dp[i][j] is the number of ways
 * the first i numbers reach sum (j - total). Base row seeds the empty prefix at
 * column total (sum 0); each fill adds the add-branch predecessor (s - v) and
 * the subtract-branch predecessor (s + v), 0 when out of bounds. Zeros double
 * correctly (both predecessors coincide); |target| > total returns 0 early.
 *
 * Staged source: .workers/jobs/neetcode150-completion/target-sum/target-sum.adapter.mjs
 * (buildTargetSumWays frames/steps/notes + lesson + code listings reshaped into the
 * live adapter contract). Live walkthrough bound n 1..6, sum(nums) 0..10 so the
 * official example ([1,1,1,1,1], 3) renders natively; larger shard-legal inputs
 * are rejected, never truncated. Additive layout patch included: layout.values
 * carries the real nums slice so the visual renders the input strip from
 * recorded data (renderer falls back to row-label parse when absent).
 *
 * Signature equals the live judge signature exactly:
 * findTargetSumWays(nums: int[], target: int) -> int (plugin/data/shard-6.json id 494).
 */

import { code, frame, boundedFrames } from './semantic-core.js'

void boundedFrames

export const SLUG = 'target-sum'

export const TS_MAX_N = 6
export const TS_MAX_TOTAL = 10

function emptyGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(null))
}

function decodeTargetSum(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('findTargetSumWays expects [nums, target]')
  const nums = args[0]
  const target = args[1]
  if (!Array.isArray(nums) || nums.length < 1 || nums.length > TS_MAX_N)
    throw new Error(`target-sum visual needs 1..${TS_MAX_N} numbers (got ${Array.isArray(nums) ? nums.length : typeof nums}); larger inputs are rejected, never truncated`)
  for (let k = 0; k < nums.length; k++) {
    if (!Number.isSafeInteger(nums[k]) || nums[k] < 0 || nums[k] > 1000)
      throw new Error(`nums[${k}] must be an integer 0..1000 (got ${JSON.stringify(nums[k])})`)
  }
  if (!Number.isSafeInteger(target) || target < -1000 || target > 1000)
    throw new Error(`target must be an integer -1000..1000 (got ${JSON.stringify(target)})`)
  const total = nums.reduce((a, b) => a + b, 0)
  if (total > TS_MAX_TOTAL)
    throw new Error(`target-sum visual needs sum(nums) <= ${TS_MAX_TOTAL} (got ${total}); larger inputs are rejected, never truncated`)
  return { nums: nums.slice(), target, total }
}

export function build(args) {
  const { nums, target, total } = decodeTargetSum(args)
  const n = nums.length
  const W = 2 * total + 1
  const rows = n + 1
  const cols = W
  const cells = emptyGrid(rows, cols)
  const filled = []
  const frames = []
  const vars0 = { n, total, target, W }
  const rowLabels = ['\u2205', ...nums.map((v, i) => `+${v}/-${v} (#${i})`)]
  const colLabels = Array.from({ length: cols }, (_, j) => String(j - total))
  const layout = { rows, cols, cells: emptyGrid(rows, cols), rowLabels, colLabels, values: nums.slice() }

  frames.push(frame('init', 'Allocate DP table',
    `Made a ${rows} x ${cols} table for sums -${total}..${total}; dp[i][j] counts ways.`,
    { current: null, cells, filled, reads: [], answer: null, vars: { ...vars0 } }))

  if (Math.abs(target) > total) {
    frames.push(frame('edge', `|${target}| > total ${total}`,
      `Target ${target} is outside reachable -${total}..${total}; answer is 0.`,
      { current: null, cells, filled, reads: [], answer: null, vars: { ...vars0, answer: 0 } }))
    frames.push(frame('return', 'Return 0',
      `No sign assignment can reach ${target} with total ${total}.`,
      { current: null, cells, filled, reads: [], answer: null, vars: { ...vars0, answer: 0 } }))
    return { kind: 'grid', layout, frames, result: 0 }
  }

  // Base row: empty prefix makes only sum 0 (column `total`) one way.
  for (let j = 0; j < W; j++) {
    const s = j - total
    cells[0][j] = (j === total) ? 1 : 0
    filled.push([0, j])
    frames.push(frame('base', `Base dp[0][${s}] = ${cells[0][j]}`,
      j === total ? `Empty prefix reaches sum 0 exactly once.` : `Empty prefix cannot reach sum ${s}; dp = 0.`,
      { current: [0, j], cells, filled, reads: [], answer: null, vars: { ...vars0, s } }))
  }

  for (let i = 1; i <= n; i++) {
    const v = nums[i - 1]
    for (let j = 0; j < W; j++) {
      const s = j - total
      const ja = j - v
      const js = j + v
      const fromAdd = ja >= 0 ? cells[i - 1][ja] : 0
      const fromSub = js < W ? cells[i - 1][js] : 0
      const value = fromAdd + fromSub
      cells[i][j] = value
      filled.push([i, j])
      const reads = []
      if (ja >= 0) reads.push([i - 1, ja])
      if (js < W) reads.push([i - 1, js])
      frames.push(frame('fill', `dp[${i}][${s}] = ${value}`,
        v === 0 ? `nums[${i - 1}]=0: 2*prev ${fromAdd} = ${value}; +/-0 coincide.` : `Last ${v}: prev ${s - v}=${fromAdd} + prev ${s + v}=${fromSub} = ${value}.`,
        { current: [i, j], cells, filled, reads, answer: null, vars: { ...vars0, i, s, v, fromAdd, fromSub, value } }))
    }
  }

  const answer = cells[n][target + total]
  frames.push(frame('return', `Return dp[${n}][${target}] = ${answer}`,
    `First ${n} numbers reach ${target} in ${answer} way${answer === 1 ? '' : 's'}.`,
    { current: [n, target + total], cells, filled, reads: [], answer: [n, target + total], vars: { ...vars0, answer } }))
  return { kind: 'grid', layout, frames, result: answer }
}

const targetSumJava = code(`
[ctx]class Solution {
[signature]    public int findTargetSumWays(int[] nums, int target) {
[init]        int total = 0;
[init]        for (int v : nums) total += v;
[edge]        if (Math.abs(target) > total) return 0;
[init]        int W = 2 * total + 1;
[init]        int n = nums.length;
[init]        int[][] dp = new int[n + 1][W];
[base]        for (int j = 0; j < W; j++) dp[0][j] = (j == total ? 1 : 0);
[ctx]        for (int i = 1; i <= n; i++) {
[ctx]            for (int s = -total; s <= total; s++) {
[fill]                int fromAdd = (s - nums[i - 1] + total >= 0 && s - nums[i - 1] + total < W) ? dp[i - 1][s - nums[i - 1] + total] : 0;
[fill]                int fromSub = (s + nums[i - 1] + total >= 0 && s + nums[i - 1] + total < W) ? dp[i - 1][s + nums[i - 1] + total] : 0;
[fill]                dp[i][s + total] = fromAdd + fromSub;
[ctx]            }
[ctx]        }
[return]        return dp[n][target + total];
[ctx]    }
[ctx]}
`)

const targetSumCpp = code(`
[ctx]#include <vector>
[ctx]#include <cstdlib>
[ctx]using namespace std;
[ctx]class Solution {
[signature]public:
[signature]    int findTargetSumWays(vector<int>& nums, int target) {
[init]        int total = 0;
[init]        for (int v : nums) total += v;
[edge]        if (abs(target) > total) return 0;
[init]        int W = 2 * total + 1;
[init]        int n = (int)nums.size();
[init]        vector<vector<int>> dp(n + 1, vector<int>(W, 0));
[base]        for (int j = 0; j < W; j++) dp[0][j] = (j == total ? 1 : 0);
[ctx]        for (int i = 1; i <= n; i++) {
[ctx]            for (int s = -total; s <= total; s++) {
[fill]                int fromAdd = (s - nums[i - 1] + total >= 0 && s - nums[i - 1] + total < W) ? dp[i - 1][s - nums[i - 1] + total] : 0;
[fill]                int fromSub = (s + nums[i - 1] + total >= 0 && s + nums[i - 1] + total < W) ? dp[i - 1][s + nums[i - 1] + total] : 0;
[fill]                dp[i][s + total] = fromAdd + fromSub;
[ctx]            }
[ctx]        }
[return]        return dp[n][target + total];
[ctx]    }
[ctx]};
`)

const targetSumPseudo = code(`
[signature]function findTargetSumWays(nums, target)
[init]  total = sum(nums); W = 2 * total + 1; n = length(nums)
[edge]  if abs(target) > total: return 0
[init]  dp = (n + 1) x W table filled with 0
[base]  for j = 0..W-1: dp[0][j] = (j == total ? 1 : 0)
[ctx]  for i = 1..n:
[ctx]    for s = -total..total:
[fill]      fromAdd = dp[i-1][s - nums[i-1] + total] if in bounds else 0
[fill]      fromSub = dp[i-1][s + nums[i-1] + total] if in bounds else 0
[fill]      dp[i][s + total] = fromAdd + fromSub
[return]  return dp[n][target + total]
`)

export const adapters = {
  'target-sum': {
    signature: { name: 'findTargetSumWays', params: ['int[]', 'int'], return: 'int' },
    lesson: {
      idea: 'dp[i][s] counts sign assignments of the first i numbers reaching sum s; the last number either added (prev s-v) or subtracted (prev s+v), so dp[i][s] = dp[i-1][s-v] + dp[i-1][s+v].',
      trap: 'Zeros double the count (both +0 and -0 stay): dp uses 2*prev, not 1*prev; also shift sums by +total so negative columns are legal, and return 0 early when |target| > total.',
      time: 'O(n * total)',
      space: 'O(n * total) table (this view); rolling two rows reach O(total)'
    },
    explain: {
      signature: 'Entry point receiving nums and target; total and table size below derive from them.',
      init: 'Allocate the (n+1) x (2*total+1) table so every prefix and every reachable sum has a cell.',
      base: 'Seed the empty prefix: only sum 0 (column total) has one way; all other sums start at 0.',
      edge: 'Target outside [-total, total] is unreachable with any signs, so return 0 without filling.',
      fill: 'Extend by one number: ways to reach s equal ways the prefix reached s-v (add) plus s+v (subtract).',
      return: 'Report the last row at column target+total: assignments of all n numbers reaching target.',
      ctx: 'Loop, branch, or scope scaffolding that organizes the table fill without itself writing a cell.'
    },
    explainLines: {
      java: {
        1: 'Method header: receives nums and target; total below derives from nums.',
        2: 'Declaration: total accumulates sum(nums); W and n below derive from it.',
        3: 'Loop: adds each nums value into total once.',
        4: 'Guard: |target| beyond [-total,total] is unreachable; return 0 early.',
        5: 'Declaration: W is the shifted width covering sums -total..total.',
        6: 'Declaration: n caches the prefix count used for row bounds.',
        7: 'Allocation: (n+1) x W table of zeros; base row below seeds the empty prefix.',
        8: 'Base: row 0 holds 1 at column total (sum 0) and 0 elsewhere.',
        11: 'Read: fromAdd fetches prefix ways for sum s-v (add branch), 0 when shifted index is out of bounds.',
        12: 'Read: fromSub fetches prefix ways for sum s+v (subtract branch), 0 when shifted index is out of bounds.',
        13: 'Write: dp cell for sum s stores fromAdd + fromSub for the extended prefix.',
        16: 'Return: last row at shifted target column holds all-n assignments reaching target.'
      },
      cpp: {
        6: 'Method header: receives nums by reference and target; total below derives from nums.',
        7: 'Declaration: total accumulates sum(nums); W and n below derive from it.',
        8: 'Loop: adds each nums value into total once.',
        9: 'Guard: |target| beyond [-total,total] is unreachable; return 0 early.',
        10: 'Declaration: W is the shifted width covering sums -total..total.',
        11: 'Declaration: n caches the prefix count used for row bounds.',
        12: 'Allocation: (n+1) x W table of zeros; base row below seeds the empty prefix.',
        13: 'Base: row 0 holds 1 at column total (sum 0) and 0 elsewhere.',
        16: 'Read: fromAdd fetches prefix ways for sum s-v (add branch), 0 when shifted index is out of bounds.',
        17: 'Read: fromSub fetches prefix ways for sum s+v (subtract branch), 0 when shifted index is out of bounds.',
        18: 'Write: dp cell for sum s stores fromAdd + fromSub for the extended prefix.',
        21: 'Return: last row at shifted target column holds all-n assignments reaching target.'
      },
      pseudo: {
        0: 'Function header: names nums and target; total below derives from nums.',
        1: 'Init: total sums nums; W covers -total..total; n counts prefixes.',
        2: 'Edge branch: unreachable target returns 0 without filling.',
        3: 'Init: (n+1) x W table of zeros holds every prefix-sum count.',
        4: 'Base: row 0 seeds sum 0 with one way, all other sums with zero.',
        7: 'Read: fromAdd is the add-branch predecessor s-v (0 when out of bounds).',
        8: 'Read: fromSub is the subtract-branch predecessor s+v (0 when out of bounds).',
        9: 'Write: dp cell for sum s stores fromAdd + fromSub.',
        10: 'Return: last row at shifted target column is the full answer.'
      }
    },
    code: { java: targetSumJava, cpp: targetSumCpp, pseudo: targetSumPseudo },
    build
  }
}

export default adapters['target-sum']
