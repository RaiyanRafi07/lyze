/**
 * min-cost-climbing-stairs — live semantic adapter (1-D DP).
 *
 * Walkthrough algorithm (mirrors the reference Java/C++/pseudo below):
 * forward prefix DP — dp[i] is the cheapest price to REACH stair i (dp[n]
 * is the top past the last stair). Starts are free (dp[0]=dp[1]=0: begin on
 * stair 0 or 1 without paying); each stair reads only already-final
 * dp[i-1], dp[i-2]: dp[i] = min(dp[i-1]+cost[i-1], dp[i-2]+cost[i-2]).
 * You pay cost[i] when you LEAVE stair i, hence the answer is dp[n].
 * O(n) time, O(n) space for the displayed table (foldable to O(1)).
 *
 * Live record: plugin/data/shard-1.json id 746 (Easy, pattern dp-1d), judge
 * mode exact, signature minCostClimbingStairs(int[] cost) -> int, official
 * tests `[10,15,20] -> 15` and `[1,100,1,1,1,100,1,1,100,1] -> 6`,
 * constraints 2 <= cost.length <= 1000, 0 <= cost[i] <= 999.
 *
 * Staged source: .workers/jobs/question-owners-150/min-cost-climbing-stairs/adapter.js
 * (signature, lesson, Java/C++/pseudo, per-line notes, forward-DP builder,
 * suffix oracle) — ported to the live shape: shared `code`/`frame` helpers
 * imported from semantic-core.js (the staged file carried local stand-ins),
 * no local helper redefinitions. Per-line notes converted from the staged
 * index arrays to the live index-keyed objects. Signature equals the live
 * judge signature exactly, so the same editor code compiles unchanged.
 *
 * Visual bound: 2..12 stairs per walkthrough (judge allows 2..1000). Larger
 * inputs reject with a clear error instead of truncating. The code runner
 * keeps the full official constraints.
 */
import { code, frame } from './semantic-core.js'

// Visual bound only: the walkthrough renders dp[0..n] plus two events per
// stair, so it stays tiny and rejects larger inputs with a clear error
// instead of truncating. The code runner keeps the full 2..1000 constraints.
export const VISUAL_MAX_N = 12
export const MIN_COST = 0
export const MAX_COST = 999

function fail(message) {
  throw new Error(message)
}

function decodeCost(value) {
  const input = typeof value === 'string' ? JSON.parse(value) : value
  if (!Array.isArray(input)) fail('min-cost-climbing-stairs visual expects one integer array [cost]')
  if (input.length < 2 || input.length > VISUAL_MAX_N) {
    fail(`min-cost-climbing-stairs visual needs 2..${VISUAL_MAX_N} stairs (got ${input.length}); larger inputs are rejected, never truncated`)
  }
  for (let k = 0; k < input.length; k += 1) {
    if (!Number.isSafeInteger(input[k])) fail(`cost[${k}] must be a safe integer`)
    if (input[k] < MIN_COST || input[k] > MAX_COST) {
      fail(`min-cost-climbing-stairs visual needs values 0..999 (cost[${k}]=${input[k]} given)`)
    }
  }
  return input.slice()
}

const minCostJava = code(`
[structure] class Solution {
[signature]     public int minCostClimbingStairs(int[] cost) {
[init]         int n = cost.length;
[init]         int[] dp = new int[n + 1];
[base]         dp[0] = 0;
[base]         dp[1] = 0;
[loop]         for (int i = 2; i <= n; i++) {
[compare]             int fromPrev = dp[i - 1] + cost[i - 1];
[compare]             int fromPrev2 = dp[i - 2] + cost[i - 2];
[update]             dp[i] = Math.min(fromPrev, fromPrev2);
[loop]         }
[done]         return dp[n];
[structure]     }
[structure] }
`)

const minCostCpp = code(`
[structure] class Solution {
[structure] public:
[signature]     int minCostClimbingStairs(vector<int>& cost) {
[init]         int n = cost.size();
[init]         vector<int> dp(n + 1, 0);
[base]         dp[0] = 0;
[base]         dp[1] = 0;
[loop]         for (int i = 2; i <= n; i++) {
[compare]             int fromPrev = dp[i - 1] + cost[i - 1];
[compare]             int fromPrev2 = dp[i - 2] + cost[i - 2];
[update]             dp[i] = min(fromPrev, fromPrev2);
[loop]         }
[done]         return dp[n];
[structure]     }
[structure] };
`)

const minCostPseudo = code(`
[init] minCostClimbingStairs(cost): n = length(cost); allocate dp[0..n]
[base]   dp[0] = 0; dp[1] = 0 (starting on stair 0 or 1 is free)
[loop]   for i from 2 to n:
[compare]     fromPrev = dp[i-1] + cost[i-1]; fromPrev2 = dp[i-2] + cost[i-2]
[update]     dp[i] = min(fromPrev, fromPrev2)
[done]   return dp[n]
`)

const minCostExplain = {
  signature: 'Entry point: receives the per-stair price list; every table entry below derives from this array.',
  init: 'Table scope: dp[0..n] will hold the cheapest price to REACH each stair; dp[n] is the top past the last stair.',
  base: 'Free starts: reaching stair 0 or stair 1 costs nothing because you may begin on either without paying.',
  loop: 'Single left-to-right pass; each i reads only already-final dp[i-1] and dp[i-2], never future cells.',
  compare: 'Two disjoint arrivals: pay cost[i-1] on top of the best way to i-1, or pay cost[i-2] on top of the best way to i-2.',
  update: 'Keep the cheaper arrival; this single write fixes dp[i] forever and later stairs may now read it.',
  done: 'dp[n] covers every stair, so it is the cheapest price of reaching the top; return it.',
}

const minCostExplainLines = {
  java: {
    0: 'Class scope: owns the Solution type; no state yet.',
    1: 'Signature: public int minCostClimbingStairs(int[] cost) binds the price array; computation starts below.',
    2: 'Init: n caches the stair count; dp needs n+1 slots because the top (index n) is a real entry.',
    3: 'Init: dp[0..n] allocated; every entry starts unset until its own event writes it.',
    4: 'Base write: dp[0]=0 — beginning on stair 0 is free.',
    5: 'Base write: dp[1]=0 — beginning on stair 1 is free.',
    6: 'Loop scope: i is the stair being priced (i==n means the top); preserves dp[0..i-1] while computing dp[i].',
    7: 'Compare (1-step arrival): read dp[i-1] and cost[i-1]; stepping from i-1 pays cost[i-1]. Read-only.',
    8: 'Compare (2-step arrival): read dp[i-2] and cost[i-2]; jumping from i-2 pays cost[i-2]. Read-only.',
    9: 'Update: write dp[i] = min of the two arrivals; the min keeps the invariant that dp[i] is optimal.',
    10: 'Loop scope close: stair i is now final; the next i builds only on finished entries.',
    11: 'Done: return dp[n], the cheapest price of reaching the top.',
    12: 'Method scope close: no state effect.',
    13: 'Class scope close: no state effect.',
  },
  cpp: {
    0: 'Class scope: owns the Solution type; no state yet.',
    1: 'Access scope (public:): visibility only, no state effect.',
    2: 'Signature: int minCostClimbingStairs(vector<int>& cost) binds the price array by reference (read-only use here).',
    3: 'Init: n caches the stair count used for the table size and the loop bound.',
    4: 'Init: dp sized n+1 and zeroed; entries are still unset until their own base/update events.',
    5: 'Base write: dp[0]=0 — beginning on stair 0 is free.',
    6: 'Base write: dp[1]=0 — beginning on stair 1 is free.',
    7: 'Loop scope: i is the stair being priced (i==n means the top).',
    8: 'Compare (1-step arrival): read dp[i-1] and cost[i-1]. Read-only.',
    9: 'Compare (2-step arrival): read dp[i-2] and cost[i-2]. Read-only.',
    10: 'Update: write dp[i] = min of the two arrivals.',
    11: 'Loop scope close: stair i is now final.',
    12: 'Done: return dp[n], the cheapest price of reaching the top.',
    13: 'Method/class scope close: no state effect.',
    14: 'Class terminator: closes the Solution scope; no state effect.',
  },
  pseudo: {
    0: 'Setup: name the stair count and the table range before any stair is priced.',
    1: 'Base: the two free starts; every other entry is unset, never zero-by-default.',
    2: 'Order: price stairs ascending so each dependency dp[i-1], dp[i-2] is already final.',
    3: 'Core: price both arrivals from solved states, keep the cheaper, write dp[i].',
    4: 'Verdict: dp[n] is the cheapest price of reaching the top.',
  },
}

/** Suffix DP cross-check oracle: priced from the top down (not rendered). */
export function oracleMinCost(cost) {
  const n = cost.length
  const dp = new Array(n + 2).fill(0) // dp[n] = dp[n+1] = 0: past the top is free
  for (let i = n - 1; i >= 0; i -= 1) {
    dp[i] = cost[i] + Math.min(dp[i + 1], dp[i + 2])
  }
  return Math.min(dp[0], dp[1])
}

export function buildMinCostClimbingStairs(args) {
  if (!Array.isArray(args) || args.length !== 1) {
    fail('min-cost-climbing-stairs visual needs one integer array [cost]')
  }
  const cost = decodeCost(args[0])
  const n = cost.length
  // Uncomputed cells stay null (rendered unset), never 0: a 0 placeholder
  // would masquerade as a computed price before its write event. Only dp[0]
  // and dp[1] are genuinely 0 (free starts).
  const dp = new Array(n + 1).fill(null)
  const frames = []
  const state = (extra = {}) => ({ values: dp.slice(), cost: cost.slice(), ...extra })

  frames.push(frame(
    'init',
    'Allocate the price table',
    `cost has ${n} stairs; dp[0..${n}] starts unset and dp[${n}] will mean the top.`,
    state(),
  ))
  dp[0] = 0
  dp[1] = 0
  frames.push(frame(
    'base',
    'Seed the two free starts',
    'dp[0]=0 and dp[1]=0: you may begin on stair 0 or stair 1 without paying.',
    state({ highlights: { 0: 'ok', 1: 'ok' }, vars: { n } }),
  ))

  for (let i = 2; i <= n; i += 1) {
    const fromPrev = dp[i - 1] + cost[i - 1]
    const fromPrev2 = dp[i - 2] + cost[i - 2]
    frames.push(frame(
      'compare',
      `Compare the two ways onto ${i === n ? 'the top' : `stair ${i}`}`,
      `From stair ${i - 1}: ${dp[i - 1]} + cost[${i - 1}]=${cost[i - 1]} = ${fromPrev}. ` +
      `From stair ${i - 2}: ${dp[i - 2]} + cost[${i - 2}]=${cost[i - 2]} = ${fromPrev2}. ` +
      `dp[${i}] is still unset; nothing is written yet.`,
      state({ pointers: { i, via1: i - 1, via2: i - 2 }, vars: { i, n, fromPrev, fromPrev2 } }),
    ))
    dp[i] = Math.min(fromPrev, fromPrev2)
    frames.push(frame(
      'update',
      `Write dp[${i}] = ${dp[i]}`,
      `min(${fromPrev}, ${fromPrev2}) = ${dp[i]}: the cheapest price to reach ${i === n ? 'the top' : `stair ${i}`}.`,
      state({
        pointers: { i, via1: i - 1, via2: i - 2 },
        highlights: { [i]: 'accent', [i - 1]: 'ok', [i - 2]: 'ok' },
        vars: { i, n, fromPrev, fromPrev2, best: dp[i] },
      }),
    ))
  }

  frames.push(frame(
    'done',
    `Return dp[${n}] = ${dp[n]}`,
    `The cheapest price to reach the top is ${dp[n]}.`,
    state({ highlights: { [n]: 'ok' }, vars: { n, answer: dp[n] } }),
  ))
  return {
    kind: 'array',
    layout: { values: new Array(n + 1).fill(null), label: 'dp[i] — cheapest price to reach stair i; dp[n] is the top' },
    frames,
    result: dp[n],
  }
}

export const adapters = {
  'min-cost-climbing-stairs': {
    signature: { name: 'minCostClimbingStairs', params: ['int[]'], return: 'int' },
    lesson: {
      idea: 'dp[i] is the cheapest price to REACH stair i (dp[n] is the top). Start free on stair 0 or 1, then each stair costs min(dp[i-1]+cost[i-1], dp[i-2]+cost[i-2]).',
      trap: 'You pay cost[i] when you LEAVE stair i, not when you land; that is why dp reads cost[i-1]/cost[i-2] and why the answer is dp[n], not min over cost.',
      time: 'O(n)',
      space: 'O(n) for the displayed table (foldable to O(1) with two rolling bests)',
    },
    code: { java: minCostJava, cpp: minCostCpp, pseudo: minCostPseudo },
    build: buildMinCostClimbingStairs,
    explain: minCostExplain,
    explainLines: minCostExplainLines,
  },
}
