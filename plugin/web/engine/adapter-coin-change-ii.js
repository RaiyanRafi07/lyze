/**
 * coin-change-ii — portable per-slug semantic adapter (question-owners-150).
 *
 * Walkthrough for https://leetcode.com/problems/coin-change-ii/ built from a
 * REAL coin-outer counting DP run on the actual input: one frame per
 * (coin, amount) relax event recording the dependency read dp[a-c] plus the
 * dp[a] = before + add = after write. Uncomputed cells stay null (rendered
 * unset), never 0. No invented values; coin-outer order counts each
 * combination once (amount-outer would count permutations).
 *
 * Signature equals the live judge signature exactly
 * (plugin/data/shard-6.json record id 518):
 *   change(int, int[]) -> int   // change(amount, coins)
 *
 * Visual bounds (honest disclosure): coins 1..5, values 1..10, amount 0..12
 * (judge keeps amount <= 5000, coins up to 300). Over-bound or malformed
 * inputs reject with a clear error, never truncate. The single compaction
 * pass stays in semantic.js (boundedFrames); this adapter returns the FULL
 * honest event list plus anchor indices.
 *
 * Staged sources (code blocks byte-identical, tags kept):
 * .workers/jobs/neetcode150-completion/coin-change-ii/coin-change-ii.adapter.js
 * plus the staged adapter-patch.diff (coins recorded on every frame state and
 * on layout.coins; no new data, no renumbered frames, no changed results).
 * Per-line notes: reused verbatim from that staged packet.
 */
import { code, frame, boundedFrames } from './semantic-core.js'

export const SLUG = 'coin-change-ii'

// Live judge signature (shard-6.json id 518): params are type strings here to
// match the semantic.js adapter contract (it compares signature.params types).
export const SIGNATURE = {
  name: 'change',
  params: ['int', 'int[]'],
  return: 'int',
}

// Visual bounds (judge keeps the full amount <= 5000 range).
export const VISUAL_BOUNDS = { coins: '1..5', coinValues: '1..10', amount: '0..12' }
const MAX_CC2_N = 5
const MIN_CC2_VAL = 1
const MAX_CC2_VAL = 10
const MAX_CC2_AMOUNT = 12

const coinChangeIIJava = code(`
[structure] class Solution {
[signature]     public int change(int amount, int[] coins) {
[init]         int[] dp = new int[amount + 1];
[base]         dp[0] = 1;
[loop]         for (int coin : coins) {
[loop]             for (int a = coin; a <= amount; a++) {
[relax]                 dp[a] += dp[a - coin];
[structure]             }
[structure]         }
[done]         return dp[amount];
[structure]     }
[structure] }
`)

const coinChangeIICpp = code(`
[structure] #include <vector>
[structure] using namespace std;
[structure] class Solution {
[structure] public:
[signature]     int change(int amount, vector<int>& coins) {
[init]         vector<int> dp(amount + 1, 0);
[base]         dp[0] = 1;
[loop]         for (int coin : coins) {
[loop]             for (int a = coin; a <= amount; a++) {
[relax]                 dp[a] += dp[a - coin];
[structure]             }
[structure]         }
[done]         return dp[amount];
[structure]     }
[structure] };
`)

const coinChangeIIPseudo = code(`
[init] change(amount, coins): allocate dp[0..amount] = 0
[base]   dp[0] = 1 (the empty selection counts once)
[loop]   for each coin c in coins:
[loop]     for a from c to amount:
[relax]       dp[a] += dp[a-c] (extend combos ending in c)
[done]   return dp[amount]
`)

const EXPLAIN = {
  signature: 'Task scope: count combinations for amount from unlimited coins; order never matters.',
  init: 'Declare the table scope covering every sub-amount so each smaller count can be stored and reused.',
  base: 'Seed the optimum: the empty selection is the single base combo; other amounts start at zero.',
  loop: 'Open one coin row at a time; every read hits a state that already includes only earlier coins.',
  relax: 'Read plus write: extend combos ending in this coin by adding dp[a-c]; this single write fixes the cell for this row.',
  done: 'Commit the verdict: dp[amount] already holds every combination exactly once, so return it.',
}

// Per-line explanations, indexed by 0-based display line (presentation metadata,
// never compiled). Verbatim from the reviewed staged packet; the code blocks
// above are byte-identical to the staged listings, so indices apply.
const EXPLAIN_LINES = {
  java: {
    1: 'Entry point: amount first, coin set second; the table below derives from amount.',
    2: 'Table scope: dp[0..amount] will hold combo counts; every entry starts unset.',
    3: 'Base write: dp[0]=1 — the empty selection is the one base combination.',
    4: 'Coin scope: one row per denomination, so each combo is built in a fixed coin order.',
    5: 'Amount scope: scan a upward so each read sees this row already-updated prefix.',
    6: 'Extend: add combos that end in this coin via the solved predecessor dp[a-coin].',
    9: 'Verdict: dp[amount] counts every combination once; return it directly.',
  },
  cpp: {
    4: 'Entry point: coins arrive by reference, amount by value; the table derives from amount.',
    5: 'Table scope: dp[0..amount] seeded 0; visible to both loops below.',
    6: 'Base write: dp[0]=1 — the empty selection is the one base combination.',
    7: 'Coin scope: one row per denomination, so each combo is built in a fixed coin order.',
    8: 'Amount scope: scan a upward so each read sees this row already-updated prefix.',
    9: 'Extend: add combos that end in this coin via the solved predecessor dp[a-coin].',
    12: 'Verdict: dp[amount] counts every combination once; return it directly.',
  },
  pseudo: {
    0: 'Setup: name the inputs and the zeroed table range before any coin row runs.',
    1: 'Base: the empty selection is the single base combo; zeros mean no combos yet.',
    2: 'Order: coin-outer rows fix a canonical coin order so permutations collapse.',
    3: 'Order: scanning a upward lets one coin be reused unlimited times in its row.',
    4: 'Core: extend combos ending in c by adding the predecessor count, then write dp[a].',
    5: 'Verdict: the final cell already counts every combination once; return it.',
  },
}

function decodeCC2Coins(value) {
  if (!Array.isArray(value)) throw new Error('Provide coins as an integer array for this visual table')
  if (value.length < 1 || value.length > MAX_CC2_N) throw new Error('Visual walkthrough needs coins length 1..' + MAX_CC2_N + ' (' + value.length + ' given)')
  for (let k = 0; k < value.length; k++) {
    if (!Number.isSafeInteger(value[k])) throw new Error('coins[' + k + '] must be a safe integer')
    if (value[k] < MIN_CC2_VAL || value[k] > MAX_CC2_VAL) throw new Error('Visual walkthrough needs coin values 1..10 (coins[' + k + ']=' + value[k] + ' given)')
  }
  return value.slice()
}

function decodeCC2Amount(value) {
  if (!Number.isSafeInteger(value)) throw new Error('Provide amount as an integer for this visual table')
  if (value < 0 || value > MAX_CC2_AMOUNT) throw new Error('Visual walkthrough needs amount 0..' + MAX_CC2_AMOUNT + ' (' + value + ' given)')
  return value
}

// Every frame below is a REAL counting event: init, the dp[0]=1 seed, one
// loop frame per coin row, one relax per (coin, amount) pair carrying the
// recorded {a, coin, before, add, after} with before+add==after, plus done.
// Uncomputed cells stay null. No future rows are revealed early.
function build(args) {
  // Shard signature order: change(amount: int, coins: int[]).
  const amount = decodeCC2Amount(args[0])
  const coins = decodeCC2Coins(args[1])
  const dp = new Array(amount + 1).fill(null)
  const frames = []
  const anchors = []
  // Staged adapter-patch: the already-in-scope coin set rides on every state
  // (renderer reads layout.coins first, frame coins as fallback).
  const state = (extra = {}) => ({ values: dp.slice(), coins: coins.slice(), ...extra })

  frames.push(frame('init', 'Allocate the table',
    'Allocate dp[0..' + amount + ']; nothing counted yet.', state()))
  for (let a = 0; a <= amount; a++) dp[a] = 0
  dp[0] = 1
  frames.push(frame('base', 'Seed the empty selection',
    amount === 0 ? 'dp[0]=1: empty amount has one combo.' : 'dp[0]=1; dp[1..' + amount + ']=0 so far.',
    state({ highlights: { 0: 'ok' }, vars: { empty: 1 } })))

  for (let ci = 0; ci < coins.length; ci++) {
    const c = coins[ci]
    anchors.push(frames.length)
    frames.push(frame('loop', 'Take coin ' + c + ' (' + (ci + 1) + '/' + coins.length + ')',
      c > amount ? 'c=' + c + ' exceeds ' + amount + ': row adds nothing.' : 'Add combos ending in ' + c + ' for a=' + c + '..' + amount + '.',
      state({ vars: { coin: c, ci } })))
    for (let a = c; a <= amount; a++) {
      const before = dp[a]
      const add = dp[a - c]
      dp[a] = before + add
      frames.push(frame('relax', 'dp[' + a + '] += dp[' + (a - c) + ']',
        'c=' + c + ': dp[' + a + ']=' + before + '+' + add + '=' + dp[a] + ' via dp[' + (a - c) + '].',
        state({
          pointers: { a },
          highlights: add > 0 ? { [a]: 'accent', [a - c]: 'dim' } : { [a]: 'dim' },
          vars: { a, coin: c, before, add, after: dp[a] },
        })))
    }
  }

  const answer = dp[amount]
  anchors.push(frames.length)
  frames.push(frame('done', 'Return the count',
    'dp[' + amount + ']=' + answer + ': combos for ' + amount + ' with [' + coins.join(',') + '].',
    state({ highlights: { [amount]: 'ok' }, vars: { answer } })))

  // Full event list: semantic.js performs the single honest compaction pass.
  return {
    kind: 'array',
    layout: { values: new Array(amount + 1).fill(null), label: 'dp[a] · combos for amount a', coins: coins.slice() },
    frames,
    result: answer,
    anchors,
  }
}

export const adapters = {
  'coin-change-ii': {
    signature: SIGNATURE,
    lesson: {
      idea: 'dp[a] counts combos for amount a: dp[0]=1, then each coin c adds dp[a-c] into dp[a] for a>=c.',
      trap: 'Amount-outer loops count permutations (order matters) and overcount; dp[0] must be 1, not 0.',
      time: 'O(coins x amount)',
      space: 'O(amount) for the dp table',
      alt: 'Top-down memoized recursion over (coinIndex, rest) returns the same counts in the same asymptotics with more memory; it is the independent practice oracle. Amount-outer DP is WRONG (counts permutations) and is documented as a trap, not an alternative.',
    },
    code: { java: coinChangeIIJava, cpp: coinChangeIICpp, pseudo: coinChangeIIPseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
}
