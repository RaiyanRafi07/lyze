/**
 * happy-number — live semantic walkthrough adapter (Math).
 *
 * Walkthrough algorithm: HashSet cycle detection. Repeatedly replace n by
 * the sum of the squares of its decimal digits. Reach 1 -> happy; repeat
 * a value -> cycle -> not happy.
 *
 * Staged source: .workers/jobs/question-owners-150/happy-number/happy-number.adapter.js
 * (traceHappy, digitSquareSum, code text, events) — ported verbatim to the
 * live shape: shared helpers imported from semantic-core.js, no local
 * code/frame redefinitions. Code text, lesson, and build events unchanged.
 *
 * Signature equals the live judge signature exactly:
 * isHappy(n: int) -> boolean (plugin/data/shard-0.json id 202, mode exact).
 */

import { code, frame, boundedFrames } from './semantic-core.js'

export const SLUG = 'happy-number'
export const MAX_N = 2147483647
export const MAX_LINKS = 60
export const MAX_FRAMES = 40

export function digitSquareSum(n) {
  let sum = 0
  let rest = n
  const terms = []
  while (rest > 0) {
    const digit = rest % 10
    terms.push({ digit, square: digit * digit })
    sum += digit * digit
    rest = Math.floor(rest / 10)
  }
  return { sum, terms: terms.reverse() }
}

/** Run the canonical HashSet algorithm for real. Returns the value chain. */
export function traceHappy(n) {
  if (!Number.isInteger(n) || n < 1 || n > MAX_N) {
    throw new Error('happy-number expects one integer n with 1 <= n <= ' + MAX_N)
  }
  const chain = [n]
  const seen = new Set()
  let current = n
  let links = 0
  while (current !== 1 && !seen.has(current)) {
    seen.add(current)
    const { sum } = digitSquareSum(current)
    current = sum
    chain.push(current)
    links += 1
    if (links > MAX_LINKS) {
      throw new Error('happy-number visual bound: chain exceeded ' + MAX_LINKS + ' links (no truncation applied)')
    }
  }
  return { chain, happy: current === 1, repeat: current === 1 ? null : current }
}

function linkNote(from) {
  const { sum, terms } = digitSquareSum(from)
  const squares = terms.map((t) => t.digit + '\u00B2').join(' + ')
  const values = terms.map((t) => t.square).join(' + ')
  return { sum, text: from + ' \u2192 ' + sum + ': ' + squares + ' = ' + values + ' = ' + sum + '.' }
}

const happyJava = code(`
[def] class Solution {
[def]     public boolean isHappy(int n) {
[init]         Set<Integer> seen = new HashSet<>();
[loop]         while (n != 1 && !seen.contains(n)) {
[update]             seen.add(n);
[update]             n = digitSquareSum(n);
[loop]         }
[done]         return n == 1;
[def]     }
[def]     private int digitSquareSum(int n) {
[update]         int sum = 0;
[update]         while (n > 0) {
[update]             int digit = n % 10;
[update]             sum += digit * digit;
[update]             n /= 10;
[def]         }
[update]         return sum;
[def]     }
[def] }
`)

const happyCpp = code(`
[def] class Solution {
[def] public:
[def]     bool isHappy(int n) {
[init]         unordered_set<int> seen;
[loop]         while (n != 1 && !seen.count(n)) {
[update]             seen.insert(n);
[update]             n = digitSquareSum(n);
[loop]         }
[done]         return n == 1;
[def]     }
[def]     int digitSquareSum(int n) {
[update]         int sum = 0;
[update]         while (n > 0) {
[update]             int digit = n % 10;
[update]             sum += digit * digit;
[update]             n /= 10;
[def]         }
[update]         return sum;
[def]     }
[def] };
`)

const happyPseudo = code(`
[def] function isHappy(n)
[init]   seen = empty hash set
[loop]   while n != 1 and n not in seen
[update]     add n to seen
[update]     n = sum of squares of decimal digits of n
[loop]   end while
[done]   return n == 1
`)

function decodeN(value) {
  if (!Number.isInteger(value)) throw new Error('happy-number expects one integer n')
  if (value < 1 || value > MAX_N) throw new Error('happy-number expects 1 <= n <= ' + MAX_N)
  return value
}

export function buildHappyNumber(args) {
  if (!Array.isArray(args) || args.length !== 1) throw new Error('happy-number expects [n]')
  const n = decodeN(args[0])
  const { chain, happy, repeat } = traceHappy(n)
  const frames = []
  frames.push(frame(
    'init',
    'Remember values',
    'Start with n = ' + n + '; seen is empty so the loop is entered.',
    { values: chain.slice(), vars: { current: n, seen: [] } },
  ))
  const seen = []
  for (let i = 0; i < chain.length - 1; i += 1) {
    seen.push(chain[i])
    const { text, sum } = linkNote(chain[i])
    const isRepeatLink = !happy && i === chain.length - 2
    frames.push(frame(
      'update',
      'Digit squares ' + (i + 1),
      isRepeatLink
        ? text + ' ' + sum + ' was seen: the chain cycles.'
        : text,
      {
        pointers: { i: i + 1, from: i },
        highlights: { [i]: 'dim', [i + 1]: isRepeatLink ? 'bad' : 'accent' },
        values: chain.slice(),
        vars: { current: chain[i], next: sum, seen: seen.slice() },
      },
    ))
  }
  frames.push(frame(
    'done',
    happy ? 'Reached 1' : 'Cycle proven',
    happy
      ? 'Chain reached 1, so return true: ' + n + ' is happy.'
      : 'Value ' + repeat + ' repeated, so return false: cycle.',
    {
      pointers: { i: chain.length - 1 },
      highlights: { [chain.length - 1]: happy ? 'ok' : 'bad' },
      values: chain.slice(),
      vars: { answer: happy, seen: seen.slice() },
    },
  ))
  // Single compaction point (shared helper, no invented state).
  const compacted = boundedFrames(frames, MAX_FRAMES)
  return {
    kind: 'array',
    layout: { values: chain.slice(), label: 'digit-square chain for n = ' + n },
    frames: compacted.frames,
    result: happy,
  }
}

export const adapter = {
  signature: { name: 'isHappy', params: ['int'], return: 'boolean' },
  lesson: {
    idea: 'Replace n by digit-square sums, remembering each value; 1 means happy, a repeat proves a cycle.',
    trap: 'An unfinished chain is not proof of unhappiness; only a repeated value proves the cycle.',
    time: 'O(log n) per link; value drops below 1000 fast, chain under 25 links.',
    space: 'O(k) seen entries, a handful of small ints; k is chain length.',
  },
  explain: {
    def: 'Happy check plus its digit-square helper; the loop body does the real work.',
    init: 'Create the seen set before the loop so the first value is checked against empty history.',
    loop: 'Keep going while n is neither 1 (happy) nor a value already in seen (a proven cycle).',
    update: 'Record the current value, then replace n by the sum of the squares of its digits.',
    done: 'Return whether the loop stopped because n reached 1.',
  },
  explainLines: {
    java: [
      'Structural wrapper: the Solution class scope. No operation runs here.',
      'Signature: isHappy takes int n and returns boolean. Execution starts in the body.',
      'Init: seen = empty hash set; no value has been remembered yet.',
      'Loop header: keep going while n is neither 1 nor an already-seen value.',
      'Update: seen.add(n) records the current value before it is replaced.',
      'Update: n = digitSquareSum(n) replaces n by its digit-square sum.',
      'Loop footer: end of this pass; the next pass re-checks both exits.',
      'Done: return n == 1; only reaching 1 counts as happy.',
      'Structural wrapper: close the isHappy method scope; no operation runs here.',
      'Structural wrapper: the digitSquareSum helper header; execution enters its body.',
      'Update: sum = 0 accumulates the digit squares for this link.',
      'Update: while n > 0 visits each decimal digit once.',
      'Update: digit = n % 10 reads the lowest remaining digit.',
      'Update: sum += digit * digit adds this digit square to the link total.',
      'Update: n /= 10 drops the digit just consumed.',
      'Structural wrapper: close the digit loop scope; no operation runs here.',
      'Update: return sum hands the next chain value back to the loop.',
      'Structural wrapper: close the helper scope; no operation runs here.',
      'Structural wrapper: close the class scope; no operation runs here.',
    ],
    cpp: [
      'Structural wrapper: the Solution class scope. No operation runs here.',
      'Structural wrapper: public section opener. No operation runs here.',
      'Signature: isHappy takes int n and returns bool. Execution starts in the body.',
      'Init: seen = empty hash set; no value has been remembered yet.',
      'Loop header: keep going while n is neither 1 nor an already-seen value.',
      'Update: seen.insert(n) records the current value before it is replaced.',
      'Update: n = digitSquareSum(n) replaces n by its digit-square sum.',
      'Loop footer: end of this pass; the next pass re-checks both exits.',
      'Done: return n == 1; only reaching 1 counts as happy.',
      'Structural wrapper: close the isHappy scope; no operation runs here.',
      'Structural wrapper: the digitSquareSum helper header; execution enters its body.',
      'Update: sum = 0 accumulates the digit squares for this link.',
      'Update: while n > 0 visits each decimal digit once.',
      'Update: digit = n % 10 reads the lowest remaining digit.',
      'Update: sum += digit * digit adds this digit square to the link total.',
      'Update: n /= 10 drops the digit just consumed.',
      'Structural wrapper: close the digit loop scope; no operation runs here.',
      'Update: return sum hands the next chain value back to the loop.',
      'Structural wrapper: close the helper scope; no operation runs here.',
      'Structural wrapper: class terminator. No operation runs here.',
    ],
    pseudo: [
      'Structural wrapper: name the happy check; execution starts in the body.',
      'Init: seen = empty hash set before any digit step runs.',
      'Loop header: repeat while n is neither 1 nor already remembered.',
      'Update: add n to seen so a later revisit proves the cycle.',
      'Update: the only arithmetic: square each decimal digit and add them up.',
      'Loop footer: end of this pass; the guard runs again.',
      'Done: return n == 1; a cycle exit returns false.',
    ],
  },
  code: { java: happyJava, cpp: happyCpp, pseudo: happyPseudo },
  build: buildHappyNumber,
}

export const adapters = { 'happy-number': adapter }
