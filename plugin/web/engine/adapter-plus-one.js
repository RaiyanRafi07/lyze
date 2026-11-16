/**
 * plus-one — live semantic adapter (Math).
 *
 * Walkthrough algorithm: right-to-left carry scan over the actual input.
 * Start at the least-significant digit; a digit below 9 absorbs the +1
 * (increment and return), a 9 becomes 0 and the carry moves one place left.
 * If every digit was 9 the answer grows by one place: 1 followed by zeros.
 * One pass right to left: O(n) time, O(1) extra space (n+1 array only for
 * the all-9s overflow).
 *
 * Staged source: .workers/jobs/neetcode150-completion/plus-one/plus-one.lesson.js
 * (SLUG, adapters['plus-one'] code/explain/explainLines/lesson/notes, buildPlusOne)
 * — ported verbatim to the live shape: shared helpers imported from
 * semantic-core.js, no local code/frame redefinitions. Code text, explain
 * notes, and build events are unchanged (see also the verbatim reference in
 * .workers/jobs/question-owners-150/plus-one/reference.js).
 *
 * Signature equals the live judge signature exactly:
 * plusOne(digits: int[]) -> int[] (plugin/data/shard-0.json id 66, mode exact).
 */

import { code, frame, boundedFrames } from './semantic-core.js'

void boundedFrames

export const MAX_N = 12

const plusOneJava = code(`
[def] class Solution {
[def]     public int[] plusOne(int[] digits) {
[init]         int n = digits.length;
[init]         int i = n - 1;
[loop]         while (i >= 0) {
[measure]             if (digits[i] < 9) {
[return]                 digits[i]++;
[return]                 return digits;
[measure]             }
[carry]             digits[i] = 0;
[carry]             i--;
[loop]         }
[return]         int[] ans = new int[n + 1];
[return]         ans[0] = 1;
[return]         return ans;
[def]     }
[def] }
`)

const plusOneCpp = code(`
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     vector<int> plusOne(vector<int>& digits) {
[init]         int n = (int)digits.size();
[init]         int i = n - 1;
[loop]         while (i >= 0) {
[measure]             if (digits[i] < 9) {
[return]                 digits[i]++;
[return]                 return digits;
[measure]             }
[carry]             digits[i] = 0;
[carry]             --i;
[loop]         }
[return]         digits.insert(digits.begin(), 1);
[return]         return digits;
[def]     }
[def] };
`)

const plusOnePseudo = code(`
[def] plusOne(digits):
[init]   i = len(digits) - 1; every position right of i is already 0 (was 9)
[loop]   while i >= 0:
[measure]     if digits[i] < 9: digits[i] += 1; return digits
[carry]     digits[i] = 0; i -= 1; carry moves one place left
[return]   return [1] + digits (input was all 9s; length grows by one)
`)

function decodeDigits(value) {
  const raw = Array.isArray(value) ? value : JSON.parse(value)
  if (!Array.isArray(raw)) throw new Error('Walkthrough needs an integer array like [1,2,3]')
  if (raw.length > MAX_N) throw new Error('Walkthrough visual bound: at most ' + MAX_N + ' digits (judge allows up to 100); got ' + raw.length)
  if (raw.length < 1) throw new Error('Need at least one digit; got an empty array')
  for (const v of raw) {
    if (!Number.isInteger(v) || v < 0 || v > 9) throw new Error('digits[i] must satisfy 0 <= digits[i] <= 9 for this walkthrough; got ' + v)
  }
  if (raw.length > 1 && raw[0] === 0) throw new Error('digits must not contain a leading 0 for this walkthrough')
  return raw.slice()
}

export function buildPlusOne(args) {
  const source = decodeDigits(args[0])
  const n = source.length
  const working = source.slice()
  const frames = []
  const anchors = []

  const push = (step, label, note, i, extra = {}) => {
    const pointers = i === null || i === undefined ? {} : { i }
    const vars = { n, ...(i === null || i === undefined ? {} : { i }), ...extra }
    frames.push(frame(step, label, note, { values: working.slice(), pointers, vars }))
  }

  push('init', 'Initialize', 'n=' + n + '; digits=[' + source.join(',') + ']; +1 lands at index ' + (n - 1), null, {})
  let i = n - 1
  push('init', 'Start at LSD', 'i=' + i + ' (digits[' + i + ']=' + working[i] + '); suffix right of i is empty', i, { d: working[i] })

  while (i >= 0) {
    const d = working[i]
    push('loop', 'Visit i=' + i, 'i=' + i + ' in range; digits[' + i + ']=' + d + ' vs 9', i, { d })
    push('measure', 'Test digits[' + i + ']', 'digits[' + i + ']=' + d + (d < 9 ? ' < 9: carry stops here' : ' == 9: carry continues'), i, { d })
    if (d < 9) {
      working[i] = d + 1
      push('return', 'Absorb carry', 'digits[' + i + ']=' + d + '->' + (d + 1) + '; now [' + working.join(',') + ']', i, { d, nd: d + 1 })
      anchors.push(frames.length - 1)
      push('return', 'Return answer', 'Carry absorbed at i=' + i + ': return [' + working.join(',') + ']', null, { i, d, nd: d + 1 })
      return { kind: 'array', layout: { values: source.slice() }, frames, result: working.slice(), anchors }
    }
    working[i] = 0
    push('carry', 'Zero the 9', 'digits[' + i + ']=9->0; now [' + working.join(',') + ']; carry moves left', i, { d, nd: 0 })
    i -= 1
  }

  const ans = [1, ...working]
  anchors.push(frames.length)
  push('return', 'Overflow output', 'All ' + n + ' digits were 9: answer [' + ans.join(',') + '] (length ' + ans.length + ')', null, { overflow: true })
  return { kind: 'array', layout: { values: source.slice() }, frames, result: ans, anchors }
}

export const adapters = {
  'plus-one': {
    signature: { name: 'plusOne', params: ['int[]'], return: 'int[]' },
    lesson: {
      idea: 'Carry scans right to left: a digit below 9 absorbs the +1 and returns; a 9 becomes 0 and the carry moves left.',
      trap: 'Never convert to a number (length up to 100 overflows). Return early below 9; all-9s input needs a new [1,0,...,0] array.',
      time: 'O(n)',
      space: 'O(1)',
    },
    explain: {
      init: 'Start at the least-significant digit (rightmost): only it and the carry decide the first step.',
      loop: 'While i >= 0 there is still a digit that can absorb the +1 carry.',
      measure: 'If digits[i] < 9 the carry stops here: increment and return, higher digits untouched.',
      carry: 'If digits[i] is 9 it becomes 0 and the carry moves one place left.',
      return: 'Either the carry stopped inside the array, or every digit was 9 and the answer is 1 followed by zeros.',
    },
    explainLines: {
      java: [
        'Structural wrapper: opens the Solution class; no algorithm operation runs here.',
        'Function signature: names input digits and the int[] result; execution starts in the body.',
        'Init: n is the digit count; it sizes the possible overflow answer (n + 1).',
        'Init: i starts at n - 1, the least-significant (rightmost) digit where +1 lands first.',
        'Loop guard: while i >= 0 a digit remains that can absorb the carry.',
        'Measure: test digits[i] < 9; true means the carry stops at this position.',
        'Return-apply: digits[i]++ absorbs the carry; higher digits are already final.',
        'Return-exit: return the same array object with the carry absorbed; no new allocation.',
        'Structural branch: closes the if block; the fall-through below runs only when digits[i] was 9.',
        'Carry-apply: digits[i] = 0 records that this 9 plus the carry makes 0 with a carry out.',
        'Carry-move: i-- shifts the carry one place left toward the more-significant digit.',
        'Structural wrapper: closes the while loop scope; no operation runs on this brace.',
        'Return-overflow: every digit was 9, so allocate ans of length n + 1 (all zeros by default).',
        'Return-overflow: ans[0] = 1 places the carried 1; the remaining zeros are already correct.',
        'Return-overflow: return the grown array [1,0,...,0]; the input had no room for the extra digit.',
        'Structural wrapper: closes the method scope; no operation runs here.',
        'Structural wrapper: closes the class scope; no operation runs here.',
      ],
      cpp: [
        'Include: <vector> provides vector<int> for the digits argument and the returned array.',
        'Structural wrapper: using-directive for std; no algorithm operation runs here.',
        'Structural wrapper: opens the Solution class; no algorithm operation runs here.',
        'Structural wrapper: public access label; no algorithm operation runs here.',
        'Function signature: names input digits (by reference) and the vector<int> result.',
        'Init: n is the digit count; it tells the loop where the rightmost digit sits.',
        'Init: i starts at n - 1, the least-significant (rightmost) digit where +1 lands first.',
        'Loop guard: while i >= 0 a digit remains that can absorb the carry.',
        'Measure: test digits[i] < 9; true means the carry stops at this position.',
        'Return-apply: digits[i]++ absorbs the carry; higher digits are already final.',
        'Return-exit: return digits with the carry absorbed; no new allocation on this path.',
        'Structural branch: closes the if block; the fall-through below runs only when digits[i] was 9.',
        'Carry-apply: digits[i] = 0 records that this 9 plus the carry makes 0 with a carry out.',
        'Carry-move: --i shifts the carry one place left toward the more-significant digit.',
        'Structural wrapper: closes the while loop scope; no operation runs on this brace.',
        'Return-overflow: every digit was 9, so insert 1 at the front; the zeros are already in place.',
        'Return-overflow: return the grown array [1,0,...,0].',
        'Structural wrapper: closes the method scope; no operation runs here.',
        'Structural wrapper: closes the class and its semicolon; no operation runs here.',
      ],
      pseudo: [
        'Signature: one function taking the most-significant-first digit array, returning the incremented array.',
        'Init: i points at the last digit; the invariant is that every position right of i is already 0 (was 9).',
        'Loop guard: repeat while i >= 0; falling past 0 means every digit was 9.',
        'Measure-hit: a digit below 9 absorbs the carry: increment it and return the array immediately.',
        'Carry: a 9 becomes 0 and i steps left, propagating the carry to the next digit.',
        'Return: all-9s input overflows one place, so the answer is 1 followed by the (now zero) digits.',
      ],
    },
    code: { java: plusOneJava, cpp: plusOneCpp, pseudo: plusOnePseudo },
    build: buildPlusOne,
  },
}
