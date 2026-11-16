/**
 * best-time-to-buy-and-sell-stock-with-cooldown — portable per-slug semantic adapter.
 *
 * Walkthrough for https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/
 * built from a REAL state-machine run on the actual input: hold[i] / sold[i] /
 * rest[i] are recorded day by day (sold[0] stays null = uncomputed, never 0).
 * No invented values; every frame reads only finished yesterday states.
 *
 * Signature equals the live judge signature exactly
 * (plugin/data/shard-6.json record id 309):
 *   maxProfit(int[]) -> int
 *
 * Visual bounds (honest disclosure): 1..12 prices, values 0..1000 (judge keeps
 * 1..5000). Over-bound or malformed inputs reject with a clear error, never
 * truncate. Single-day inputs yield 3 raw frames; semantic.js pads those to
 * its 6-frame scene minimum with labeled context cards. The single compaction
 * pass stays in semantic.js (boundedFrames); this adapter returns the FULL
 * honest event list plus anchor indices.
 *
 * Staged source (code blocks byte-identical, tags kept):
 * .workers/jobs/question-owners-150/best-time-to-buy-and-sell-stock-with-cooldown/adapter.js
 * Per-line notes: reused verbatim from that staged packet (indices align).
 */
import { code, frame, boundedFrames } from './semantic-core.js'

export const SLUG = 'best-time-to-buy-and-sell-stock-with-cooldown'

// Live judge signature (shard-6.json id 309): params are type strings here to
// match the semantic.js adapter contract (it compares signature.params types).
export const SIGNATURE = {
  name: 'maxProfit',
  params: ['int[]'],
  return: 'int',
}

// Visual bound (judge keeps 1..5000 prices).
export const VISUAL_MAX_N = 12

const cooldownJava = code(`
[ctx] class Solution {
[ctx]     public int maxProfit(int[] prices) {
[init]         int hold = Integer.MIN_VALUE;
[init]         int sold = Integer.MIN_VALUE;
[init]         int rest = 0;
[base]         hold = -prices[0];
[ctx]         for (int i = 1; i < prices.length; i++) {
[decide]             int prevHold = hold, prevSold = sold, prevRest = rest;
[decide]             hold = Math.max(prevHold, prevRest - prices[i]);
[decide]             sold = prevHold + prices[i];
[decide]             rest = Math.max(prevRest, prevSold);
[ctx]         }
[return]         return Math.max(sold, rest);
[ctx]     }
[ctx] }
`)

const cooldownCpp = code(`
[ctx] class Solution {
[ctx] public:
[ctx]     int maxProfit(vector<int>& prices) {
[init]         int hold = INT_MIN;
[init]         int sold = INT_MIN;
[init]         int rest = 0;
[base]         hold = -prices[0];
[ctx]         for (int i = 1; i < (int)prices.size(); i++) {
[decide]             int prevHold = hold, prevSold = sold, prevRest = rest;
[decide]             hold = max(prevHold, prevRest - prices[i]);
[decide]             sold = prevHold + prices[i];
[decide]             rest = max(prevRest, prevSold);
[ctx]         }
[return]         return max(sold, rest);
[ctx]     }
[ctx] };
`)

const cooldownPseudo = code(`
[ctx] function maxProfit(prices)
[init]   hold = -inf; sold = -inf; rest = 0
[base]   hold = -prices[0]
[ctx]   for i = 1..n-1:
[decide]     prevHold, prevSold, prevRest = hold, sold, rest
[decide]     hold = max(prevHold, prevRest - prices[i])
[decide]     sold = prevHold + prices[i]
[decide]     rest = max(prevRest, prevSold)
[return]   return max(sold, rest)
`)

const EXPLAIN = {
  init: 'Rolling triple starts impossible/empty: nothing held, no sale seen, resting profit 0.',
  base: 'Day 0 seed: buying today costs prices[0] (hold=-p0); rest stays 0; no sale exists yet.',
  decide: 'One real day: snapshot the triple, then write all three states from finished yesterday values only.',
  return: 'After the last day holding is never better than cash, so the answer is max(sold, rest).',
  ctx: 'Loop or scope scaffolding that visits each later day once without itself writing a state.',
}

// Per-line explanations, indexed by 0-based display line (presentation metadata,
// never compiled). Verbatim from the reviewed staged packet; the code blocks
// above are byte-identical to the staged listings, so indices apply.
const EXPLAIN_LINES = {
  java: {
    0: 'Class wrapper: holds the method; performs no algorithm operation.',
    1: 'Method header: receives prices; the state work starts in the body below.',
    2: 'Declaration: hold starts impossible (no share bought yet).',
    3: 'Declaration: sold starts impossible (no sale could exist yet); rest=max(rest,sold) is unaffected.',
    4: 'Declaration: rest starts at 0 (doing nothing earns nothing).',
    5: 'Seed: buying on day 0 costs prices[0]; hold becomes -prices[0].',
    6: 'Loop scope: visit days 1..n-1 left to right; each day reads only finished yesterday states.',
    7: 'Snapshot: freeze yesterday triple so the three writes below cannot read each other.',
    8: 'Write hold: keep holding, or buy today from rest (never from just-sold: the cooldown).',
    9: 'Write sold: sell today from yesterday hold plus today price.',
    10: 'Write rest: stay out, or settle yesterday sale into cash.',
    11: 'Loop scope end: today triple is final; advance to the next day.',
    12: 'Return: max of cash states; holding at the end is never optimal.',
    13: 'Scope end: closes the method; no operation.',
    14: 'Scope end: closes the class; no operation.',
  },
  cpp: {
    0: 'Class wrapper: holds the method; performs no algorithm operation.',
    1: 'Access label: visibility only; performs no operation.',
    2: 'Method header: receives prices by reference; the state work starts below.',
    3: 'Declaration: hold starts impossible (no share bought yet).',
    4: 'Declaration: sold starts impossible (no sale could exist yet); rest=max(rest,sold) is unaffected.',
    5: 'Declaration: rest starts at 0 (doing nothing earns nothing).',
    6: 'Seed: buying on day 0 costs prices[0]; hold becomes -prices[0].',
    7: 'Loop scope: visit days 1..n-1 left to right; each day reads only finished yesterday states.',
    8: 'Snapshot: freeze yesterday triple so the three writes below cannot read each other.',
    9: 'Write hold: keep holding, or buy today from rest (never from just-sold: the cooldown).',
    10: 'Write sold: sell today from yesterday hold plus today price.',
    11: 'Write rest: stay out, or settle yesterday sale into cash.',
    12: 'Loop scope end: today triple is final; advance to the next day.',
    13: 'Return: max of cash states; holding at the end is never optimal.',
    14: 'Scope end: closes the method; no operation.',
    15: 'Scope end: closes the class; no operation.',
  },
  pseudo: {
    0: 'Function header: names prices; the state work starts below.',
    1: 'Init: triple starts impossible/impossible/0; -inf marks states with no history yet.',
    2: 'Seed: hold=-prices[0]; rest stays 0; sold stays impossible.',
    3: 'Loop scope: each later day reads only finished yesterday states.',
    4: 'Snapshot: freeze yesterday triple before writing.',
    5: 'Write hold: max(keep, rest-buy); the cooldown is the missing sold-buy edge.',
    6: 'Write sold: yesterday hold plus today price.',
    7: 'Write rest: max(stay-out, settle-yesterday-sale).',
    8: 'Return: max of the two cash states.',
  },
}

function decodePrices(value) {
  if (!Array.isArray(value)) throw new Error('maxProfit visual expects one integer array [prices]')
  if (value.length < 1 || value.length > VISUAL_MAX_N) {
    throw new Error('maxProfit visual needs 1..' + VISUAL_MAX_N + ' prices (got ' + value.length + '); larger inputs are rejected, never truncated')
  }
  for (let k = 0; k < value.length; k++) {
    if (!Number.isSafeInteger(value[k])) throw new Error('prices[' + k + '] must be a safe integer (got ' + JSON.stringify(value[k]) + ')')
    if (value[k] < 0 || value[k] > 1000) {
      throw new Error('maxProfit visual needs values 0..1000 (prices[' + k + ']=' + value[k] + ' given)')
    }
  }
  return value.slice()
}

// Every frame below is a REAL state-machine event: init, the day-0 seed, one
// decide per later day (snapshot + three writes), plus return. Histories use
// null for not-yet-computed cells (never 0). No future days are revealed early.
function build(args) {
  if (!Array.isArray(args) || args.length !== 1) {
    throw new Error('maxProfit visual expects one argument [prices]')
  }
  const prices = decodePrices(args[0])
  const n = prices.length
  const frames = []
  const anchors = [0]

  // Recorded histories: null = not yet computed (rendered unset, never zero).
  const holds = new Array(n).fill(null)
  const solds = new Array(n).fill(null)
  const rests = new Array(n).fill(null)
  const snap = () => ({ holds: holds.slice(), solds: solds.slice(), rests: rests.slice() })

  frames.push(frame('init', 'Three states per day',
    'Track hold/sold/rest for ' + n + ' day' + (n === 1 ? '' : 's') + '; every cell starts unset.',
    { ...snap(), vars: { n } }))

  holds[0] = -prices[0]
  rests[0] = 0
  frames.push(frame('base', 'Seed day 0',
    'Buy day 0: hold=' + holds[0] + '. Rest=0. No sale exists yet.',
    {
      ...snap(),
      pointers: { i: 0 },
      highlights: { 0: 'accent' },
      vars: { i: 0, price: prices[0], hold: holds[0], sold: null, rest: 0, action: 'seed' },
    }))

  for (let i = 1; i < n; i++) {
    const prevHold = holds[i - 1]
    const prevSold = solds[i - 1]
    const prevRest = rests[i - 1]
    const buy = prevRest - prices[i]
    const hold = prevHold > buy ? prevHold : buy
    const sold = prevHold + prices[i]
    const rest = prevSold === null || prevRest > prevSold ? prevRest : prevSold
    holds[i] = hold
    solds[i] = sold
    rests[i] = rest
    const holdChoice = hold === prevHold ? 'keep' : 'buy'
    const restChoice = prevSold === null || prevRest > prevSold ? 'rest' : 'settle'
    const action = 'hold:' + holdChoice + ' rest:' + restChoice + ' sold:' + sold
    frames.push(frame('decide', 'Day ' + i + ': price ' + prices[i],
      'hold max(' + prevHold + ',' + prevRest + '-' + prices[i] + ')=' + hold + '; sold ' + prevHold + '+' + prices[i] + '=' + sold + '; rest=' + rest + '.',
      {
        ...snap(),
        pointers: { i },
        highlights: { [String(i)]: 'accent', [String(i - 1)]: 'ok' },
        vars: {
          i, price: prices[i],
          prevHold, prevSold, prevRest,
          hold, sold, rest, holdChoice, restChoice, action,
        },
      }))
    anchors.push(frames.length - 1)
  }

  const last = n - 1
  const answer = solds[last] === null || rests[last] > solds[last] ? rests[last] : solds[last]
  frames.push(frame('return', 'Return ' + answer,
    n === 1
      ? 'One day: no sale possible, profit 0.'
      : 'max(sold ' + solds[last] + ', rest ' + rests[last] + ') = ' + answer + '.',
    {
      ...snap(),
      pointers: { i: last },
      highlights: { [String(last)]: 'ok' },
      vars: { i: last, hold: holds[last], sold: solds[last], rest: rests[last], answer },
    }))
  anchors.push(frames.length - 1)

  // Full event list: semantic.js performs the single honest compaction pass.
  return {
    kind: 'array',
    layout: { values: prices.slice(), label: 'prices[i] · indexed days; state table below is per-day hold/sold/rest' },
    frames,
    result: answer,
    anchors: [...new Set(anchors)].sort((a, b) => a - b),
  }
}

export const adapters = {
  'best-time-to-buy-and-sell-stock-with-cooldown': {
    signature: SIGNATURE,
    lesson: {
      idea: 'Hold, just-sold, or resting: hold[i] = max(hold[i-1], rest[i-1]-p[i]); sold[i] = hold[i-1]+p[i]; rest[i] = max(rest[i-1], sold[i-1]). Buying reads rest only, which enforces the 1-day cooldown.',
      trap: 'Buying from sold[i-1] (skipping the cooldown) overstates profit; and sold[0] does not exist, so day 0 can only seed hold/rest.',
      time: 'O(n)',
      space: 'O(1) rolling triple (walkthrough shows the full per-day table for teaching)',
      alt: 'Memoised DFS over (day, holding, cooling) returns the same answer in O(n) time and O(n) space, arguably clearer but heavier; the exhaustive unmemoised form is the independent practice oracle. Greedy sell-every-rise is WRONG under cooldown and is documented as a trap, not an alternative.',
    },
    code: { java: cooldownJava, cpp: cooldownCpp, pseudo: cooldownPseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
}
