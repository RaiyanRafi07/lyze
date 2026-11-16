/**
 * burst-balloons — live semantic walkthrough adapter (interval DP, kind: grid).
 *
 * Walkthrough algorithm (mirrors the reference Java/C++/pseudo below):
 * canonical O(n^3) bottom-up interval DP over padded val = [1, ...nums, 1].
 * dp[l][r] = max coins from open interval (l, r); the last balloon burst
 * inside (l, r) is k, earning val[l]*val[k]*val[r] plus the optimal left
 * dp[l][k] and right dp[k][r]. Intervals fill by growing length so both
 * subcells are solved before dp[l][r] is decided; answer dp[0][m-1].
 * The walkthrough emits ONE honest frame per (l, r) cell: every k in (l, r)
 * is evaluated for real, the note names the evaluated k-range and the
 * winning k/gain/total, and reads point at the two winning subcells.
 * Per-k trials are summarized in the note/vars so the scene stays within
 * the 40-frame contract for the visual bound below.
 *
 * Live record: plugin/data/shard-15.json id 312 (Hard, pattern intervals),
 * judge mode exact, signature maxCoins(int[] nums) -> int, official tests
 * `[3,1,5,8] -> 167` and `[1,5] -> 10`, constraints 1 <= n <= 300,
 * 0 <= nums[i] <= 100. Signature equals the live judge signature exactly,
 * so the same editor code compiles unchanged.
 *
 * Staged source: .workers/jobs/neetcode150-completion/burst-balloons/burst-balloons.adapter.js
 * (signature, lesson, Java/C++/pseudo, per-line notes, bottom-up builder) —
 * ported to the live shape: shared `code`/`frame` helpers imported from
 * semantic-core.js (the staged file carried local stand-ins), no local helper
 * redefinitions. Signature converted to the live string-array param shape.
 *
 * Visual bound: 1..6 balloons per walkthrough (padded table 3x3..8x8, at most
 * 13 frames + return for the headline example, so no compaction). Larger
 * inputs reject with a clear error instead of truncating. The code runner
 * keeps the full 1..300 constraints.
 */
import { code, frame, boundedFrames } from './semantic-core.js'

void boundedFrames

// Visual bound only: the walkthrough renders one frame per (l, r) cell plus
// init/base/return, so n<=6 keeps every native trace within 6..27 frames and
// no compaction. The code runner keeps the full 1..300 constraints.
export const VISUAL_MAX_N = 6
export const CONSTR_MIN_V = 0
export const CONSTR_MAX_V = 100

function fail(message) {
  throw new Error(message)
}

function decodeNums(value) {
  const input = typeof value === 'string' ? JSON.parse(value) : value
  if (!Array.isArray(input)) fail('burst-balloons visual expects one integer array [nums]')
  if (input.length < 1 || input.length > VISUAL_MAX_N) {
    fail(`burst-balloons visual limited to 1..${VISUAL_MAX_N} balloons (got ${input.length}); larger inputs are rejected, never truncated`)
  }
  for (let i = 0; i < input.length; i++) {
    if (!Number.isSafeInteger(input[i])) fail(`nums[${i}] must be a safe integer (got ${JSON.stringify(input[i])})`)
    if (input[i] < CONSTR_MIN_V || input[i] > CONSTR_MAX_V) {
      fail(`burst-balloons visual needs values 0..100 (nums[${i}]=${input[i]} given)`)
    }
  }
  return input.slice()
}

function emptyGrid(n) {
  return Array.from({ length: n }, () => new Array(n).fill(null))
}

function buildBurstBalloons(args) {
  if (!Array.isArray(args) || args.length !== 1) fail('burst-balloons visual expects [nums]')
  const nums = decodeNums(args[0])
  const n = nums.length
  const val = [1, ...nums, 1]
  const m = n + 2
  const dp = Array.from({ length: m }, () => new Array(m).fill(0))
  const cells = emptyGrid(m)
  const filled = []
  const frames = []
  const anchors = []
  const labels = val.map(String)

  const layout = () => ({
    rows: m,
    cols: m,
    cells: emptyGrid(m),
    rowLabels: labels.slice(),
    colLabels: labels.slice(),
  })

  frames.push(frame('init', 'Pad with ones', `val=[${val.join(',')}]; alloc ${m}x${m} dp table.`, {
    current: null, cells: JSON.parse(JSON.stringify(cells)), filled: JSON.parse(JSON.stringify(filled)), reads: [], answer: null,
    vars: { n, m },
  }))

  frames.push(frame('base', 'Empty intervals are 0', 'dp[l][r]=0 when r-l<2: no balloon strictly inside.', {
    current: null, cells: JSON.parse(JSON.stringify(cells)), filled: JSON.parse(JSON.stringify(filled)), reads: [], answer: null,
    vars: { n, m },
  }))
  anchors.push(1)

  let writes = 0
  let trials = 0
  for (let len = 2; len < m; len++) {
    let firstOfLen = true
    for (let l = 0; l + len < m; l++) {
      const r = l + len
      let best = 0
      let bestK = l + 1
      let bestGain = val[l] * val[bestK] * val[r]
      // Evaluate every k for real.
      for (let k = l + 1; k < r; k++) {
        trials++
        const cand = dp[l][k] + dp[k][r] + val[l] * val[k] * val[r]
        if (cand > best) {
          best = cand
          bestK = k
          bestGain = val[l] * val[k] * val[r]
        }
      }
      dp[l][r] = best
      cells[l][r] = best
      filled.push([l, r])
      writes++
      const span = r - l - 1
      const note = span === 1
        ? `Only k=${bestK}: ${dp[l][bestK]}+${dp[bestK][r]}+${val[l]}*${val[bestK]}*${val[r]}=${best}.`
        : `Try k=${l + 1}..${r - 1}; best k=${bestK} gain ${bestGain} total ${best}.`
      frames.push(frame('fill', `dp[${l}][${r}]=${best}`, note, {
        current: [l, r], cells: JSON.parse(JSON.stringify(cells)), filled: JSON.parse(JSON.stringify(filled)),
        reads: [[l, bestK], [bestK, r]], answer: null,
        vars: { l, r, len, k: bestK, gain: bestGain, best, n, m },
        ops: { cmp: trials, writes },
      }))
      if (firstOfLen) {
        anchors.push(frames.length - 1)
        firstOfLen = false
      }
    }
  }

  const answer = dp[0][m - 1]
  frames.push(frame('return', `Return ${answer}`, `dp[0][${m - 1}]=${answer}.`, {
    current: [0, m - 1], cells: JSON.parse(JSON.stringify(cells)), filled: JSON.parse(JSON.stringify(filled)), reads: [], answer: [0, m - 1],
    vars: { n, m, answer },
    ops: { cmp: trials, writes },
  }))

  // Full event list: the host performs the single honest compaction pass.
  return { kind: 'grid', layout: layout(), frames, result: answer, anchors }
}

const burstJava = code(`
[ctx]class Solution {
[signature]    public int maxCoins(int[] nums) {
[init]        int n = nums.length;
[init]        int[] val = new int[n + 2];
[init]        val[0] = 1;
[init]        val[n + 1] = 1;
[init]        for (int i = 0; i < n; i++) val[i + 1] = nums[i];
[init]        int m = n + 2;
[init]        int[][] dp = new int[m][m];
[base]        // dp[l][r] = 0 when r - l < 2: empty or single-gap intervals hold no balloon.
[ctx]        for (int len = 2; len < m; len++) {
[ctx]            for (int l = 0; l + len < m; l++) {
[ctx]                int r = l + len;
[ctx]                for (int k = l + 1; k < r; k++) {
[fill]                    int gain = val[l] * val[k] * val[r];
[fill]                    int cand = dp[l][k] + dp[k][r] + gain;
[fill]                    if (cand > dp[l][r]) dp[l][r] = cand;
[ctx]                }
[ctx]            }
[ctx]        }
[return]        return dp[0][m - 1];
[ctx]    }
[ctx]}
`)

const burstCpp = code(`
[ctx]class Solution {
[ctx]public:
[ctx]    int maxCoins(vector<int>& nums) {
[init]        int n = (int)nums.size();
[init]        vector<int> val(n + 2, 1);
[init]        for (int i = 0; i < n; i++) val[i + 1] = nums[i];
[init]        int m = n + 2;
[init]        vector<vector<int>> dp(m, vector<int>(m, 0));
[base]        // dp[l][r] = 0 when r - l < 2: empty intervals hold no balloon.
[ctx]        for (int len = 2; len < m; len++) {
[ctx]            for (int l = 0; l + len < m; l++) {
[ctx]                int r = l + len;
[ctx]                for (int k = l + 1; k < r; k++) {
[fill]                    int gain = val[l] * val[k] * val[r];
[fill]                    int cand = dp[l][k] + dp[k][r] + gain;
[fill]                    if (cand > dp[l][r]) dp[l][r] = cand;
[ctx]                }
[ctx]            }
[ctx]        }
[return]        return dp[0][m - 1];
[ctx]    }
[ctx]};
`)

const burstPseudo = code(`
[signature]maxCoins(nums): pad and interval-DP over last burst
[init]  n = length(nums); val = [1] + nums + [1]; m = n + 2
[init]  dp = m x m table filled with 0
[base]  dp[l][r] = 0 when r - l < 2 (no balloon strictly inside)
[ctx]  for len = 2..m-1:
[ctx]    for l = 0..m-len-1:
[ctx]      r = l + len
[ctx]      for k = l+1..r-1:
[fill]        gain = val[l] * val[k] * val[r]; cand = dp[l][k] + dp[k][r] + gain; dp[l][r] = max(dp[l][r], cand)
[return]  return dp[0][m-1]
`)

const burstExplain = {
  signature: 'Entry point receiving the balloon values; all padding and table work below derives from this array.',
  init: 'Pad sentinels and allocate the table so every open interval (l,r) has a cell to store its optimum.',
  base: 'Seed the vacuous truth: intervals holding no balloon strictly inside contribute zero coins.',
  fill: 'For this interval try every balloon as the last burst: gain plus best of both sides; keep the maximum.',
  return: 'Report the corner cell covering the whole padded span: the optimum over all burst orders.',
  ctx: 'Loop, branch, or scope scaffolding that organizes the fill without itself writing a table cell.',
}

const burstExplainLines = {
  java: {
    1: 'Method header: receives nums; n and padding below derive from this array.',
    2: 'Declaration: n caches the street length used for padding and loop bounds.',
    3: 'Declaration: val holds the padded [1..1] axis; dp indexes into it.',
    4: 'Write: left sentinel balloon 1 so edge bursts score against a wall of 1.',
    5: 'Write: right sentinel balloon 1 for the same reason on the far edge.',
    6: 'Copy: shift original nums into val[1..n] between the sentinels.',
    7: 'Declaration: m=n+2 is the padded axis length and the dp table side.',
    8: 'Declaration: dp starts all zero which already encodes every empty interval.',
    10: 'Loop scope: growing interval length guarantees dp[l][k],dp[k][r] are ready.',
    11: 'Loop scope: slide the left edge l across every interval of this length.',
    12: 'Declaration: r is fixed by l+len; the cell dp[l][r] is decided below.',
    13: 'Loop scope: try each balloon k strictly inside as the last burst.',
    14: 'Declaration: gain bursts k last against the live walls val[l],val[r].',
    15: 'Declaration: cand adds the optimal left and right subintervals to gain.',
    16: 'Write: keep the larger of the running best and this candidate.',
  },
  cpp: {
    1: 'Method header: receives nums by reference; n and padding below derive from it.',
    2: 'Declaration: n caches the length used for padding and loop bounds.',
    3: 'Declaration: val holds the padded [1..1] axis; dp indexes into it.',
    4: 'Write: left sentinel 1 so edge bursts score against a wall of 1.',
    5: 'Write: right sentinel 1 for the same reason on the far edge.',
    6: 'Copy: shift original nums into val[1..n] between the sentinels.',
    7: 'Declaration: m=n+2 is the padded axis length and the table side.',
    8: 'Declaration: dp starts all zero which already encodes every empty interval.',
    10: 'Loop scope: growing length guarantees both subcells are already solved.',
    11: 'Loop scope: slide the left edge l across every interval of this length.',
    12: 'Declaration: r is fixed by l+len; the cell dp[l][r] is decided below.',
    13: 'Loop scope: try each balloon k strictly inside as the last burst.',
    14: 'Declaration: gain bursts k last against the live walls val[l],val[r].',
    15: 'Declaration: cand adds the optimal left and right subintervals to gain.',
    16: 'Write: keep the larger of the running best and this candidate.',
  },
  pseudo: {
    0: 'Function header: names nums; padding and table below derive from it.',
    1: 'Declaration: n caches the input length for the padded axis.',
    2: 'Declaration: val pads sentinels so every edge burst has two walls.',
    3: 'Declaration: m=n+2 is the padded axis length and table side.',
    4: 'Declaration: dp starts all zero which already encodes empty intervals.',
    5: 'Loop scope: growing length guarantees subintervals dp[l][k],dp[k][r] are ready.',
    6: 'Loop scope: slide l across every interval of this length; r follows.',
    7: 'Loop scope: try each inside balloon k as the last burst of (l,r).',
    8: 'Compute: gain plus solved sides; keep the max in dp[l][r].',
    9: 'Return: dp[0][m-1] covers the whole padded span: the global optimum.',
  },
}

export const adapters = {
  'burst-balloons': {
    signature: { name: 'maxCoins', params: ['int[]'], return: 'int' },
    lesson: {
      idea: 'Think LAST burst, not first: bursting k last in open interval (l,r) earns val[l]*val[k]*val[r] plus optimal dp[l][k] and dp[k][r]; take the best k.',
      trap: 'Bursting first uses live neighbors that later bursts destroy; forgetting the two sentinel 1s, or returning a side length instead of dp[0][m-1].',
      time: 'O(n^3): O(n^2) intervals times up to O(n) last-burst choices.',
      space: 'O(n^2) for the dp table over the padded m=n+2 axis.',
    },
    code: { java: burstJava, cpp: burstCpp, pseudo: burstPseudo },
    build: buildBurstBalloons,
    explain: burstExplain,
    explainLines: burstExplainLines,
  },
}

export const visualBounds = { minN: 1, maxN: VISUAL_MAX_N, minV: CONSTR_MIN_V, maxV: CONSTR_MAX_V }
