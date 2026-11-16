/** First Missing Positive — portable per-slug walkthrough adapter (cyclic placement).
 *
 * Problem: given an unsorted integer array nums, return the smallest positive
 * integer not present in nums, in O(n) time and O(1) auxiliary space.
 *
 * Model: value v belongs at index v-1. The placement pass walks i left to
 * right; while nums[i] is in [1,n] and its home slot holds a different value,
 * swap nums[i] into its home. Duplicates and out-of-range values stay where
 * they are (the guard proves no progress is possible). The scan pass returns
 * the first i with nums[i] != i+1, else n+1.
 *
 * Live record: shard with id 41 (Hard, topics Array/Hash Table, pattern
 * arrays-hashing), judge mode exact with three official tests; the signature
 * below equals the live judge signature exactly (name/return/param types).
 *
 * Pure + synchronous; throws honest bounds errors instead of inventing state.
 * kind: 'array'. MAX_VIS_LEN 8 keeps every native trace <= ~35 frames.
 */
import { code, frame } from './semantic-core.js';

export const SLUG = 'first-missing-positive';

// Live judge signature (object form). The adapters entry below carries the same
// profile in the string-array params form semantic.js compares against.
export const SIGNATURE = {
  name: 'firstMissingPositive',
  params: [{ name: 'nums', type: 'int[]' }],
  return: 'int',
};

const SIGNATURE_TYPES = ['int[]'];

// Visual bound: judge allows n up to 1e5. Placement emits ~1 frame per index
// per pass plus one frame per swap (swaps <= ~2n), so MAX_VIS_LEN 8 keeps every
// native trace under ~35 frames (no compaction).
export const MAX_VIS_LEN = 8;

function decodeNums(value) {
  let raw = value;
  if (typeof raw === 'string') {
    raw = raw.trim() === '' ? [] : JSON.parse(raw);
  }
  if (!Array.isArray(raw)) throw new Error('nums must be an array like [3,4,-1,1]');
  if (raw.length < 1) throw new Error('nums needs at least 1 entry (got 0)');
  if (raw.length > MAX_VIS_LEN) {
    throw new Error(
      'Visual walkthrough limited to ' + MAX_VIS_LEN + ' entries (judge allows up to 100000); got ' + raw.length
    );
  }
  raw.forEach((v, i) => {
    if (!Number.isSafeInteger(v)) throw new Error('nums[' + i + '] must be an integer (got ' + String(v) + ')');
  });
  return raw.slice();
}

export const firstMissingPositiveJava = code(`
[def] class Solution {
[def]     public int firstMissingPositive(int[] nums) {
[init]         int n = nums.length;
[place]         for (int i = 0; i < n; i++) {
[place]             while (nums[i] >= 1 && nums[i] <= n && nums[nums[i] - 1] != nums[i]) {
[swap]                 int correct = nums[i] - 1;
[swap]                 int tmp = nums[i];
[swap]                 nums[i] = nums[correct];
[swap]                 nums[correct] = tmp;
[place]             }
[place]         }
[scan]         for (int i = 0; i < n; i++) {
[check]             if (nums[i] != i + 1) {
[done]                 return i + 1;
[check]             }
[scan]         }
[done]         return n + 1;
[def]     }
[def] }
`);

export const firstMissingPositiveCpp = code(`
[def] class Solution {
[def] public:
[def]     int firstMissingPositive(vector<int>& nums) {
[init]         int n = (int)nums.size();
[place]         for (int i = 0; i < n; i++) {
[place]             while (nums[i] >= 1 && nums[i] <= n && nums[nums[i] - 1] != nums[i]) {
[swap]                 int correct = nums[i] - 1;
[swap]                 int tmp = nums[i];
[swap]                 nums[i] = nums[correct];
[swap]                 nums[correct] = tmp;
[place]             }
[place]         }
[scan]         for (int i = 0; i < n; i++) {
[check]             if (nums[i] != i + 1) {
[done]                 return i + 1;
[check]             }
[scan]         }
[done]         return n + 1;
[def]     }
[def] };
`);

export const firstMissingPositivePseudo = code(`
[def] function firstMissingPositive(nums)
[init]   n = length(nums)
[place]   for i from 0 to n - 1
[place]     while nums[i] in 1..n and nums[nums[i]-1] != nums[i]
[swap]       correct = nums[i] - 1; tmp = nums[i]
[swap]       nums[i] = nums[correct]; nums[correct] = tmp
[place]     end while
[scan]   for i from 0 to n - 1
[check]     if nums[i] != i + 1
[done]       return i + 1
[check]     end if
[scan]   end for
[done]   return n + 1
[def] end function
`);

export const LESSON = Object.freeze({
  idea: 'Value v belongs at index v-1: swap each in-range value into its home slot, then the first index holding the wrong value names the answer.',
  trap: 'Swapping without the home-slot guard loops forever on duplicates — nums[nums[i]-1] != nums[i] must fail before any swap, and out-of-range values are never placed.',
  time: 'O(n)',
  space: 'O(1)',
  alternative:
    'Mark presence in a boolean array seen[1..n], then scan for the first false entry ' +
    '(the staged practice oracle uses exactly this presence scan, independently of the ' +
    'in-place swaps). Same answer, O(n) time, O(n) space; simpler to verify, but it ' +
    'breaks the O(1) auxiliary-space requirement.',
});

const EXPLAIN = {
  def: 'Declares the solver scope and signature so the placement logic stays isolated from caller setup.',
  init: 'Seeds n from the array length so the valid home range [1,n] is fixed before any index is touched.',
  place: 'Focuses one index and certifies its value is placeable: in [1,n] with a different value at home; a miss proves this index needs no swap.',
  swap: 'Moves the current value into its home slot and parks the displaced value at i for re-certification; each swap fixes one home slot.',
  scan: 'Focuses the next index in the verification pass after placement finished; homes either hold their owner or expose the gap.',
  check: 'Tests whether the home slot holds its owner value i+1; a mismatch proves i+1 is missing because every placeable value already moved home.',
  done: 'Exposes the first gap as the answer, or n+1 when every home 1..n is occupied — the only value the range [1,n] cannot supply.',
};

export const EXPLAIN_LINES = {
  java: {
    4: 'Loop guard: every placeable value must reach its home before the scan; the inner while re-certifies i after each swap.',
    5: 'End of one swap: home slot correct now holds its owner; i holds the displaced value for the next guard test.',
    10: 'End of the placement pass: each index either owns its value or provably cannot (duplicate or out of range).',
    13: 'Early exit: index i is the first home holding the wrong value, so i+1 is missing.',
    16: 'Exhaustion exit: homes 1..n are all occupied, so the missing positive must be n+1.',
    18: 'End of the class scope; it performs no algorithm operation.',
  },
  cpp: {
    5: 'Loop guard: every placeable value must reach its home before the scan; the inner while re-certifies i after each swap.',
    6: 'End of one swap: home slot correct now holds its owner; i holds the displaced value for the next guard test.',
    11: 'End of the placement pass: each index either owns its value or provably cannot (duplicate or out of range).',
    14: 'Early exit: index i is the first home holding the wrong value, so i+1 is missing.',
    17: 'Exhaustion exit: homes 1..n are all occupied, so the missing positive must be n+1.',
    19: 'End of the class scope; it performs no algorithm operation.',
  },
  pseudo: {
    3: 'One placement round: keep swapping while the guard certifies progress; a miss leaves i untouched.',
    6: 'One verification step per home; the first mismatch returns at once.',
  },
};

// Independent oracle (NOT placement): presence scan over 1..n+1. Used by
// selfcheck + forge to cross-check the placement walkthrough.
export function oracleFirstMissing(nums) {
  const present = new Set(nums);
  for (let k = 1; ; k += 1) {
    if (!present.has(k)) return k;
  }
}

export function buildFirstMissingPositive(args) {
  if (!Array.isArray(args) || args.length !== 1) throw new Error('firstMissingPositive walkthrough needs [nums] as its single input');
  const nums = decodeNums(args?.[0]);
  const n = nums.length;
  const frames = [];
  const anchors = [];

  const stateOf = (i, extra = {}) => {
    const highlights = {};
    if (Number.isInteger(i) && i >= 0 && i < nums.length) highlights[i] = 'accent';
    return {
      values: nums.slice(),
      pointers: Number.isInteger(i) && i >= 0 && i < nums.length ? { i } : {},
      highlights,
      vars: { n, ...extra },
    };
  };

  frames.push(
    frame('init', 'Fix the range', 'n=' + n + '; value v belongs at index v-1.', stateOf(null, {}))
  );
  anchors.push(0);

  let swaps = 0;
  let fmpCmp = 0;
  let fmpWrites = 0;
  const fmpOps = () => ({ cmp: fmpCmp, writes: fmpWrites });
  for (let i = 0; i < n; i++) {
    const v0 = nums[i];
    fmpCmp += 1;
    const placeable =
      Number.isSafeInteger(v0) && v0 >= 1 && v0 <= n && nums[v0 - 1] !== v0;
    if (!placeable) {
      const reason =
        !(v0 >= 1 && v0 <= n)
          ? v0 + ' is outside [1,' + n + ']; never placed'
          : 'home slot ' + (v0 - 1) + ' already holds ' + v0 + ' (duplicate); no swap';
      frames.push(frame('place', 'Certify index ' + i, 'nums[' + i + ']=' + v0 + ': ' + reason + '.', { ...stateOf(i, { i, v: v0 }), ops: fmpOps() }));
      continue;
    }
    frames.push(frame('place', 'Place index ' + i, 'nums[' + i + ']=' + v0 + ' belongs at ' + (v0 - 1) + '; swap it home.', { ...stateOf(i, { i, v: v0, correct: v0 - 1 }), ops: fmpOps() }));
    while (nums[i] >= 1 && nums[i] <= n && nums[nums[i] - 1] !== nums[i]) {
      if (swaps++ > 4 * n + 4) throw new Error('internal frame overflow');
      const v = nums[i];
      const correct = v - 1;
      const displaced = nums[correct];
      nums[i] = displaced;
      nums[correct] = v;
      fmpWrites += 2;
      const st = stateOf(i, { i, v, correct, displaced });
      st.highlights = { [i]: 'accent', [correct]: 'ok' };
      frames.push(frame('swap', 'Swap home', 'Put ' + v + ' at ' + correct + '; park ' + displaced + ' at ' + i + '.', { ...st, ops: fmpOps() }));
    }
  }
  anchors.push(frames.length - 1);

  let answer = n + 1;
  let found = false;
  for (let i = 0; i < n; i++) {
    frames.push(frame('scan', 'Verify home ' + i, 'Home ' + (i + 1) + ' holds ' + nums[i] + '.', { ...stateOf(i, { i, want: i + 1, got: nums[i] }), ops: fmpOps() }));
    fmpCmp += 1;
    if (nums[i] !== i + 1) {
      const st = stateOf(i, { i, want: i + 1, got: nums[i] });
      st.highlights = { [i]: 'warn' };
      frames.push(frame('check', 'Gap found', 'nums[' + i + ']=' + nums[i] + ' != ' + (i + 1) + '; ' + (i + 1) + ' is missing.', { ...st, ops: fmpOps() }));
      answer = i + 1;
      found = true;
      break;
    }
    frames.push(frame('check', 'Home holds', 'nums[' + i + ']=' + nums[i] + ' owns home ' + (i + 1) + '; continue.', { ...stateOf(i, { i, want: i + 1, got: nums[i] }), ops: fmpOps() }));
  }
  anchors.push(frames.length - 1);

  // Cross-check against the independent oracle; never ship a lying walkthrough.
  const oracle = oracleFirstMissing(nums);
  const expected = found ? answer : n + 1;
  if (oracle !== expected) throw new Error('Placement result ' + expected + ' disagrees with presence oracle ' + oracle);

  const lastState = stateOf(found ? answer - 1 : null, { result: expected });
  if (found) lastState.highlights = { [answer - 1]: 'warn' };
  frames.push(frame('done', 'Return answer', 'return ' + expected + '; smallest positive missing from the input.', { ...lastState, ops: fmpOps() }));
  anchors.push(frames.length - 1);

  return {
    kind: 'array',
    layout: { values: decodeNums(args[0]).slice() },
    frames,
    result: expected,
    anchors: [...new Set(anchors.filter((x) => Number.isInteger(x) && x >= 0 && x < frames.length))].sort((a, b) => a - b),
  };
}

// Registry-shaped export for precise wiring.
export const adapter = {
  signature: { name: SIGNATURE.name, params: SIGNATURE_TYPES, return: SIGNATURE.return },
  lesson: LESSON,
  code: { java: firstMissingPositiveJava, cpp: firstMissingPositiveCpp, pseudo: firstMissingPositivePseudo },
  explain: EXPLAIN,
  explainLines: EXPLAIN_LINES,
  build: buildFirstMissingPositive,
};

export const adapters = {
  'first-missing-positive': adapter,
};
