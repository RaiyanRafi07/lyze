/** Remove Duplicates from Sorted Array — portable per-slug adapter (Two Pointers).
 * Slow/fast in-place compaction: slow marks the last kept unique value, fast
 * scans ahead; a value different from nums[slow] extends the unique prefix via
 * nums[++slow] = nums[fast]. Pure + synchronous; never throws on import.
 * Non-arrays, non-integer entries, walks longer than MAX_WALK_N, or unsorted
 * input throw instead of rendering (honest decline, never a guessed visual).
 * Register under slug `remove-duplicates-from-sorted-array` (see
 * integration.json). Family precedent: patterns.js removeDuplicatesFrames
 * (generic slow/fast compaction) and twopointer-adapters.js (twoSumII/maxArea
 * adapter shape, shared semantic-core.js helpers).
 * Target: a new exact-slug module
 * plugin/web/engine/adapter-remove-duplicates-from-sorted-array.js, or the
 * family file the integrator chooses, as long as the key, signature, steps,
 * kind and visual bound below are kept verbatim.
 */
import { code, frame, boundedFrames } from './semantic-core.js'

export const SLUG = 'remove-duplicates-from-sorted-array';
export const MAX_WALK_N = 12;
export const MAX_FRAMES = 40;

export const SIGNATURE = Object.freeze({
  name: 'removeDuplicates',
  params: Object.freeze(['int[]']),
  return: 'int',
});

const dedupCode = {
  java: code(`
[structure] class Solution {
[signature]     public int removeDuplicates(int[] nums) {
[guard]         if (nums.length == 0) return 0;
[init]         int slow = 0;
[loop]         for (int fast = 1; fast < nums.length; fast++) {
[compare]             if (nums[fast] != nums[slow]) {
[write]                 slow++;
[write]                 nums[slow] = nums[fast];
[skip]             } // duplicate — no write, fast moves on
[loop]         }
[done]         return slow + 1;
[structure]     }
[structure] }
`),
  cpp: code(`
[structure] class Solution {
[structure] public:
[signature]     int removeDuplicates(vector<int>& nums) {
[guard]         if (nums.empty()) return 0;
[init]         int slow = 0;
[loop]         for (int fast = 1; fast < (int)nums.size(); fast++) {
[compare]             if (nums[fast] != nums[slow]) {
[write]                 slow++;
[write]                 nums[slow] = nums[fast];
[skip]             } // duplicate — no write, fast moves on
[loop]         }
[done]         return slow + 1;
[structure]     }
[structure] };
`),
  pseudo: code(`
[guard] removeDuplicates(nums): if nums is empty return 0
[init]   slow = 0  // index of the last kept unique value
[loop]   for fast from 1 to length(nums) - 1:
[compare]     if nums[fast] != nums[slow]:  // a new unique value
[write]       slow += 1; nums[slow] = nums[fast]  // extend the unique prefix
[skip]     else: duplicate — leave it beyond the prefix (no write)
[done]   return slow + 1  // cells [0..slow] hold the k unique values
`),
};

export const LESSON = Object.freeze({
  idea: 'Keep a slow marker on the last unique value and scan fast ahead: only a value different from nums[slow] extends the unique prefix, so each distinct value is written exactly once.',
  trap: 'Sorted order is the whole proof: equal values sit together, so one comparison against nums[slow] decides keep vs skip. Comparing against nums[fast-1] instead breaks the write position, and returning fast (or nums.length) counts duplicates.',
  time: 'O(n) — one visit per position',
  space: 'O(1) extra — the prefix is rewritten inside nums itself',
  alternative:
    'Collect the distinct values into a new list (or a set, which preserves ' +
    'first-seen order on sorted input) and copy them back over nums, then ' +
    'return its length. Same O(n) time but O(n) extra space for the buffer ' +
    'versus O(1); clearer about what "unique" means, at the cost of the ' +
    'in-place requirement. The practice oracle in ' +
    'forge-remove-duplicates-from-sorted-array.js uses exactly this ' +
    'Set-based method, independently of the slow/fast reference.',
});

export const EXPLAIN = Object.freeze({
  def: 'Return k, the number of unique values, with the first k cells of nums holding those values in order; cells beyond k are irrelevant.',
  guard: 'Empty input has no unique values: return 0 before slow exists, so slow + 1 is never computed on an empty array.',
  init: 'Seed slow = 0: nums[0] is trivially the first unique value, so the prefix [0..0] starts valid.',
  loop: 'Visit each later position once with fast; reaching the end means every value was compared against the prefix exactly once.',
  compare: 'Compare nums[fast] against nums[slow] (the last kept unique): different means a new distinct value, equal means a duplicate of it.',
  write: 'New unique value: advance slow past the old prefix end, then copy nums[fast] there — the prefix [0..slow] stays duplicate-free.',
  skip: 'Duplicate path: no write runs, so the value stays beyond the prefix; fast simply moves on to the next candidate.',
  done: 'Return slow + 1: slow is an index, so the prefix length (the unique count k) is one more.',
});

export const EXPLAIN_LINES = Object.freeze({
  java: [
    'Structural wrapper: the Solution class scope. No operation runs here.',
    'Signature: removeDuplicates takes int[] nums and returns int. Execution starts in the body.',
    'Guard: an empty array holds zero unique values — return 0 before slow is created.',
    'Init: slow = 0 — nums[0] is the first kept unique, so the prefix [0..0] starts valid.',
    'Loop header: fast visits every later position exactly once; the end of the array ends the scan.',
    'Compare: nums[fast] != nums[slow] asks whether fast found a value the prefix lacks.',
    'Extend the prefix end: slow++ moves past the last kept unique so the copy lands on a fresh cell.',
    'Copy the new unique into the prefix: nums[slow] = nums[fast] keeps [0..slow] duplicate-free.',
    'Decision end: a duplicate reaches this brace with no write executed — it stays beyond the prefix.',
    'Loop footer: end of this pass; the next pass compares the next fast against the (maybe grown) prefix.',
    'Done: slow is an index, so return slow + 1 — the unique count k.',
    'Structural wrapper: close the method scope; no operation runs here.',
    'Structural wrapper: close the class scope; no operation runs here.',
  ],
  cpp: [
    'Structural wrapper: the Solution class scope. No operation runs here.',
    'Structural wrapper: public section opener. No operation runs here.',
    'Signature: removeDuplicates takes vector<int>& nums and returns int. Execution starts in the body.',
    'Guard: an empty vector holds zero unique values — return 0 before slow is created.',
    'Init: slow = 0 — nums[0] is the first kept unique, so the prefix [0..0] starts valid.',
    'Loop header: fast visits every later position exactly once; the end of the vector ends the scan.',
    'Compare: nums[fast] != nums[slow] asks whether fast found a value the prefix lacks.',
    'Extend the prefix end: ++slow moves past the last kept unique so the copy lands on a fresh cell.',
    'Copy the new unique into the prefix: nums[slow] = nums[fast] keeps [0..slow] duplicate-free.',
    'Decision end: a duplicate reaches this brace with no write executed — it stays beyond the prefix.',
    'Loop footer: end of this pass; the next pass compares the next fast against the (maybe grown) prefix.',
    'Done: slow is an index, so return slow + 1 — the unique count k.',
    'Structural wrapper: close the method scope; no operation runs here.',
    'Structural wrapper: class terminator. No operation runs here.',
  ],
  pseudo: [
    'Name the task and carve out the empty input: zero cells means zero unique values.',
    'Seed slow = 0 before any candidate is examined; nums[0] anchors the prefix.',
    'Repeat once per later position until fast runs past the last index.',
    'Decide keep vs skip with one comparison against the last kept unique.',
    'Extend the prefix and copy the new unique into it.',
    'Name the duplicate path explicitly: no write, the value stays out of the prefix.',
    'Convert the last-kept index into the count k the judge compares.',
  ],
});

/** Independent oracle: Set distinct-count. No slow/fast pointers, no writes. */
export function dedupOracle(nums) {
  if (!Array.isArray(nums) || !nums.every(Number.isSafeInteger)) {
    throw new Error('oracle needs an integer array');
  }
  const prefix = [...new Set(nums)];
  return { k: prefix.length, prefix };
}

function decodeNums(value) {
  const raw = Array.isArray(value) ? value : JSON.parse(value);
  if (!Array.isArray(raw)) throw new Error('Walkthrough needs an integer array like [1,1,2]');
  if (raw.length > MAX_WALK_N) {
    throw new Error('Walkthrough visual bound: at most ' + MAX_WALK_N + ' numbers (judge allows up to 3*10^4); got ' + raw.length);
  }
  if (!raw.every(Number.isSafeInteger)) throw new Error('Walkthrough needs safe integers for this walkthrough');
  for (let i = 1; i < raw.length; i++) {
    if (raw[i] < raw[i - 1]) throw new Error('nums must be sorted in non-decreasing order for this walkthrough');
  }
  return raw.slice();
}

export function build(args) {
  if (!Array.isArray(args) || args.length !== 1) {
    throw new Error('remove-duplicates-from-sorted-array expects [nums]');
  }
  const input = decodeNums(args[0]);
  const n = input.length;
  const working = input.slice();
  const frames = [];
  let rdCmp = 0, rdWrites = 0;
  const rdOps = () => ({ cmp: rdCmp, writes: rdWrites });

  if (n === 0) {
    frames.push(frame(
      'guard',
      'Empty input',
      'nums is empty; there are no unique values, return 0.',
      { pointers: {}, vars: { n }, highlights: {} },
    ));
    frames.push(frame(
      'done',
      'Return 0',
      'removeDuplicates([]) = 0; nothing was scanned.',
      { pointers: {}, vars: { n, answer: 0 }, highlights: {}, ops: rdOps() },
    ));
    return {
      kind: 'array',
      layout: { values: input.slice() },
      frames: boundedFrames(frames, MAX_FRAMES).frames,
      result: 0,
    };
  }

  let slow = 0;
  frames.push(frame(
    'init',
    'Seed slow = 0',
    `n=${n}; nums[0]=${input[0]} is the first unique; prefix [0..0].`,
    { pointers: { slow, fast: 0 }, values: working.slice(), vars: { n, slow, fast: 0 } },
  ));

  for (let fast = 1; fast < n; fast++) {
    const isNew = working[fast] !== working[slow];
    rdCmp += 1;
    frames.push(frame(
      'compare',
      `Compare fast = ${fast}`,
      `nums[${slow}]=${working[slow]} vs nums[${fast}]=${working[fast]} → ${isNew ? 'new unique value.' : 'duplicate.'}`,
      {
        pointers: { slow, fast },
        values: working.slice(),
        highlights: { [String(slow)]: 'accent', [String(fast)]: isNew ? 'ok' : 'bad' },
        vars: { n, slow, fast },
        ops: rdOps(),
      },
    ));
    if (isNew) {
      const placed = working[fast];
      slow += 1;
      working[slow] = placed;
      rdWrites += 1;
      frames.push(frame(
        'write',
        `Write ${placed} at ${slow}`,
        `slow=${slow}; nums[${slow}]=${placed}; prefix [0..${slow}] unique.`,
        {
          pointers: { slow, fast },
          values: working.slice(),
          highlights: { [String(slow)]: 'ok', [String(fast)]: 'dim' },
          vars: { n, slow, fast },
          ops: rdOps(),
        },
      ));
    } else {
      frames.push(frame(
        'skip',
        `Skip ${fast}`,
        `nums[${fast}]=${working[fast]} duplicates the prefix; no write.`,
        {
          pointers: { slow, fast },
          values: working.slice(),
          highlights: { [String(fast)]: 'dim' },
          vars: { n, slow, fast },
          ops: rdOps(),
        },
      ));
    }
  }

  const k = slow + 1;
  const doneHighlights = {};
  for (let i = 0; i < n; i++) doneHighlights[String(i)] = i <= slow ? 'ok' : 'dim';
  frames.push(frame(
    'done',
    `Return ${k}`,
    `slow=${slow}; k=${k} of ${n} cells are unique; prefix [${working.slice(0, k).join(',')}] holds them.`,
    {
      pointers: { slow, fast: n - 1 },
      values: working.slice(),
      highlights: doneHighlights,
      vars: { n, slow, fast: n - 1, answer: k },
      ops: rdOps(),
    },
  ));
  return {
    kind: 'array',
    layout: { values: input.slice() },
    frames: boundedFrames(frames, MAX_FRAMES).frames,
    result: k,
  };
}

export const adapter = {
  signature: SIGNATURE,
  lesson: LESSON,
  explain: EXPLAIN,
  explainLines: EXPLAIN_LINES,
  code: dedupCode,
  build,
};

export const adapters = {
  'remove-duplicates-from-sorted-array': adapter,
};
