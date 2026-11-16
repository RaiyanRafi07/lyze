/** Ready-to-import per-slug adapter: longest-consecutive-sequence.
 *
 * Staged path: `.workers/jobs/delivery-sprint-20261107/longest-consecutive-sequence/adapter.longest-consecutive-sequence.mjs`
 * Live target: `plugin/web/engine/longest-consecutive-sequence.js` (new file),
 *   rewiring the import below from './bridge.semantic-core.mjs' to './semantic-core.js',
 *   then registering the key in `plugin/web/engine/arrays-adapters.js`
 *   (see integration.json for the exact two-line patch).
 *
 * Source: plugin/data/shard-5.json id=128, slug `longest-consecutive-sequence`,
 * Medium, pattern arrays-hashing. Judge mode `exact`, signature
 * longestConsecutive(int[]) -> int, 3 judge tests matching the 3 examples.
 * `solution`/`follow_ups` are empty in source; nothing editorial is invented.
 *
 * Iteration order is deterministic ascending distinct values for pedagogy;
 * start/extend/best decisions are identical to hash-order execution.
 */
import { code, frame, boundedFrames } from './semantic-core.js';

export const VISUAL_BOUND = 12;
const MAX_FRAMES = 40;

const longestConsecutiveCode = {
  java: code(`
[def] class Solution {
[def]     public int longestConsecutive(int[] nums) {
[empty]         if (nums.length == 0) {
[empty]             return 0;
[empty]         }
[init]         Set<Integer> set = new HashSet<>();
[build]         for (int x : nums) {
[build]             set.add(x);
[build]         }
[initbest]         int best = 1;
[scan]         for (int x : set) {
[check]             if (!set.contains(x - 1)) {
[start]                 int cur = x;
[start]                 int len = 1;
[extend]                 while (set.contains(cur + 1)) {
[extend]                     cur++;
[extend]                     len++;
[extend]                 }
[bestcheck]                 if (len > best) {
[best]                     best = len;
[bestcheck]                 }
[check]             }
[scan]         }
[done]         return best;
[def]     }
[def] }
`),
  cpp: code(`
[def] class Solution {
[def] public:
[def]     int longestConsecutive(vector<int>& nums) {
[empty]         if (nums.empty()) {
[empty]             return 0;
[empty]         }
[init]         unordered_set<int> set(nums.begin(), nums.end());
[initbest]         int best = 1;
[scan]         for (int x : set) {
[check]             if (!set.count(x - 1)) {
[start]                 int cur = x;
[start]                 int len = 1;
[extend]                 while (set.count(cur + 1)) {
[extend]                     ++cur;
[extend]                     ++len;
[extend]                 }
[bestcheck]                 if (len > best) {
[best]                     best = len;
[bestcheck]                 }
[check]             }
[scan]         }
[done]         return best;
[def]     }
[def] };
`),
  pseudo: code(`
[def] function longestConsecutive(nums)
[empty]   if length(nums) == 0
[empty]     return 0
[empty]   end if
[init]   set = hash set of all values in nums
[initbest]   best = 1
[scan]   for each distinct x in set
[check]     if set does not contain x - 1
[start]       cur = x; len = 1
[extend]       while set contains cur + 1
[extend]         cur = cur + 1; len = len + 1
[extend]       end while
[bestcheck]       if len > best
[best]         best = len
[bestcheck]       end if
[check]     end if
[scan]   end for
[done]   return best
[def] end function
`),
};

/** Complete Java reference (staged text; compiled validation owned by integration lead). */
export const javaReference = [
  'class Solution {',
  '    public int longestConsecutive(int[] nums) {',
  '        if (nums.length == 0) {',
  '            return 0;',
  '        }',
  '        java.util.Set<Integer> set = new java.util.HashSet<>();',
  '        for (int x : nums) {',
  '            set.add(x);',
  '        }',
  '        int best = 1;',
  '        for (int x : set) {',
  '            if (!set.contains(x - 1)) {',
  '                int cur = x;',
  '                int len = 1;',
  '                while (set.contains(cur + 1)) {',
  '                    cur++;',
  '                    len++;',
  '                }',
  '                if (len > best) {',
  '                    best = len;',
  '                }',
  '            }',
  '        }',
  '        return best;',
  '    }',
  '}',
].join('\n') + '\n';

/** Complete C++ reference (staged text; compiled validation owned by integration lead). */
export const cppReference = [
  'class Solution {',
  'public:',
  '    int longestConsecutive(vector<int>& nums) {',
  '        if (nums.empty()) {',
  '            return 0;',
  '        }',
  '        unordered_set<int> set(nums.begin(), nums.end());',
  '        int best = 1;',
  '        for (int x : set) {',
  '            if (!set.count(x - 1)) {',
  '                int cur = x;',
  '                int len = 1;',
  '                while (set.count(cur + 1)) {',
  '                    ++cur;',
  '                    ++len;',
  '                }',
  '                if (len > best) {',
  '                    best = len;',
  '                }',
  '            }',
  '        }',
  '        return best;',
  '    }',
  '};',
].join('\n') + '\n';

const explainSteps = {
  def: 'The task: length of the longest set of consecutive integers present, order-free.',
  empty: 'Guard the empty collection before any set/loop state exists; 0 is definitional, not computed.',
  init: 'Materialize membership evidence so predecessor/successor tests are O(1); duplicates collapse here.',
  build: 'Insert each element; insertion order does not matter because only membership is queried later.',
  initbest: 'Seed the optimum at the smallest non-empty answer so singletons are correct.',
  scan: 'Visit each distinct value once as a start candidate; duplicates must not restart work.',
  check: 'Branch on predecessor absence: miss means x starts a run (reason to walk); hit means x is interior (reason to skip, preserving O(n)).',
  start: 'Anchor a new candidate run at a proven start; cur/len now describe this run only.',
  extend: 'Follow the successor edge while present; each step grows len by exactly one real member.',
  bestcheck: 'Guard the optimum write so best only moves on genuine improvement.',
  best: 'Commit the new optimum; prior best is superseded, never merged.',
  done: 'Return the established optimum; no further state changes are possible.',
};

/** 0-based line notes verified against javaReference/cppReference above. */
const explainLines = {
  java: {
    2: 'Branch: empty input has no run; return the definitional 0 before allocating.',
    3: 'Empty-path return; out of scope for all loop state below.',
    5: 'Declare the membership set; out-of-scope before this line, visible to all loops after.',
    6: 'Loop scope: visit each input element once for set construction.',
    7: 'Insert element; duplicates collapse, which later iteration over the set relies on.',
    9: 'Declare best seeded at 1; valid only on the non-empty path above.',
    10: 'Loop scope over distinct values; each iteration decides start vs skip for one x.',
    11: 'Branch reason: predecessor test selects O(n) starts vs O(n^2) re-walks.',
    12: 'Start scope: anchor cur at a proven run head.',
    13: 'Anchor len at 1 for the new candidate run.',
    14: 'Loop: successor membership test; each true iteration extends the run by one.',
    15: 'Advance the run tip to the proven successor.',
    16: 'Grow the run length in lockstep with the tip.',
    18: 'Guard: only a strictly longer run replaces the optimum.',
    19: 'Commit the improved optimum.',
    23: 'Return the optimum established by the scan.',
  },
  cpp: {
    3: 'Branch: empty input has no run; return the definitional 0 before allocating.',
    4: 'Empty-path return; out of scope for all loop state below.',
    6: 'Declare and bulk-build the membership set from the input range.',
    7: 'Declare best seeded at 1; valid only on the non-empty path above.',
    8: 'Loop scope over distinct values; each iteration decides start vs skip for one x.',
    9: 'Branch reason: predecessor test selects O(n) starts vs O(n^2) re-walks.',
    10: 'Start scope: anchor cur at a proven run head.',
    11: 'Anchor len at 1 for the new candidate run.',
    12: 'Loop: successor membership test; each true iteration extends the run by one.',
    13: 'Advance the run tip to the proven successor.',
    14: 'Grow the run length in lockstep with the tip.',
    16: 'Guard: only a strictly longer run replaces the optimum.',
    17: 'Commit the improved optimum.',
    21: 'Return the optimum established by the scan.',
  },
  pseudo: {
    1: 'Branch: empty collection guard before any state.',
    2: 'Empty-path return; no set or optimum exists here.',
    4: 'Build membership evidence used by every later test.',
    5: 'Seed the optimum at the smallest non-empty answer.',
    6: 'Loop over distinct values as start candidates.',
    7: 'Branch: predecessor absence proves a run head; presence proves interior.',
    8: 'Anchor candidate run state at the proven head.',
    9: 'Loop while the successor is present.',
    10: 'Advance tip and length together by one real member.',
    12: 'Guard: test strict improvement before touching the optimum.',
    13: 'Commit the new optimum.',
    16: 'Return the established optimum.',
  },
};

function firstIndexOf(nums, v) {
  return nums.indexOf(v);
}

export function build(args) {
  if (!Array.isArray(args) || args.length !== 1) throw new Error('longest-consecutive-sequence expects [nums]');
  const raw = args[0];
  if (!Array.isArray(raw)) throw new Error('longest-consecutive-sequence needs an integer array nums (got non-array)');
  if (raw.length > VISUAL_BOUND) {
    throw new Error(
      'longest-consecutive-sequence visual bound: length ' + raw.length + ' exceeds ' + VISUAL_BOUND + '; shorten input (no truncation applied)'
    );
  }
  for (let k = 0; k < raw.length; k++) {
    if (!Number.isSafeInteger(raw[k])) throw new Error('longest-consecutive-sequence needs safe integers (nums[' + k + '] invalid)');
  }
  const nums = raw.slice();
  const frames = [];
  const full = nums.slice();

  if (nums.length === 0) {
    frames.push(frame('empty', 'Empty input', 'No elements; longest run is 0 by definition.', { values: [], vars: { n: 0, best: 0 } }));
    frames.push(frame('done', 'Return', 'Return 0 for the empty array.', { values: [], vars: { n: 0, best: 0, result: 0 } }));
    return { kind: 'array', layout: { values: [] }, frames: boundedFrames(frames, MAX_FRAMES).frames, result: 0 };
  }

  const set = new Map();
  for (const v of nums) if (!set.has(v)) set.set(v, nums.indexOf(v));
  const seenObj = {};
  for (const [v, i] of set) seenObj[String(v)] = i;

  let best = 1;
  let bestRun = [];
  {
    const distinct0 = [...set.keys()].sort((a, b) => a - b);
    for (const x of distinct0) {
      if (!set.has(x - 1)) { bestRun = [firstIndexOf(nums, x)]; break; }
    }
  }

  frames.push(
    frame('init', 'Initialize', 'Load ' + nums.length + ' values into a set; duplicates collapse to one key.', {
      values: full.slice(),
      vars: { n: nums.length, distinct: set.size, best },
      seen: { ...seenObj },
    })
  );

  const distinct = [...set.keys()].sort((a, b) => a - b);
  let firstStartAnchor = -1;

  for (const x of distinct) {
    const xi = firstIndexOf(nums, x);
    const pred = x - 1;
    const isStart = !set.has(pred);
    const predHit = set.has(pred) ? firstIndexOf(nums, pred) : null;
    frames.push(
      frame(
        'check',
        isStart ? 'Sequence start' : 'Skip interior',
        isStart
          ? 'No ' + pred + ' in set; ' + x + ' starts a run.'
          : x + ' has predecessor ' + pred + '; not a start.',
        {
          values: full.slice(),
          pointers: { x: xi },
          highlights: { [xi]: isStart ? 'accent' : 'dim' },
          vars: { x, pred, best },
          seen: { ...seenObj },
          lookup: { from: xi, key: String(pred), hit: predHit },
        }
      )
    );
    if (!isStart) continue;
    let cur = x;
    let len = 1;
    const runIdx = [xi];
    frames.push(
      frame('start', 'Start run', 'Begin run at ' + x + ' with length 1.', {
        values: full.slice(),
        pointers: { x: xi, cur: xi },
        highlights: { [xi]: 'accent' },
        vars: { x, cur, len, best },
        seen: { ...seenObj },
      })
    );
    if (firstStartAnchor === -1) firstStartAnchor = frames.length - 1;
    while (set.has(cur + 1)) {
      const nxt = cur + 1;
      const ni = firstIndexOf(nums, nxt);
      runIdx.push(ni);
      frames.push(
        frame('extend', 'Extend run', cur + ' + 1 = ' + nxt + ' is present; length ' + len + ' -> ' + (len + 1) + '.', {
          values: full.slice(),
          pointers: { x: xi, cur: ni },
          highlights: Object.fromEntries(runIdx.map((i) => [String(i), 'accent'])),
          vars: { x, cur: nxt, len: len + 1, best },
          seen: { ...seenObj },
          lookup: { from: ni >= 0 ? ni : xi, key: String(nxt), hit: ni },
        })
      );
      cur = nxt;
      len += 1;
    }
    if (len > best) {
      const prev = best;
      best = len;
      bestRun = runIdx.slice();
      const hl = {};
      for (const i of bestRun) hl[String(i)] = 'ok';
      frames.push(
        frame('best', 'New best', 'Run ' + x + '..' + cur + ' length ' + len + ' beats ' + prev + '.', {
          values: full.slice(),
          pointers: { x: xi, cur: firstIndexOf(nums, cur) },
          highlights: hl,
          vars: { x, cur, len, best },
          seen: { ...seenObj },
        })
      );
    }
  }

  const doneHl = {};
  for (const i of bestRun) if (i >= 0) doneHl[String(i)] = 'ok';
  frames.push(
    frame('done', 'Return', 'Longest consecutive run has length ' + best + '.', {
      values: full.slice(),
      highlights: doneHl,
      vars: { n: nums.length, distinct: set.size, best, result: best },
      seen: { ...seenObj },
    })
  );

  const anchors = firstStartAnchor >= 0 ? [firstStartAnchor] : [];
  void anchors;
  return { kind: 'array', layout: { values: full.slice() }, frames: boundedFrames(frames, MAX_FRAMES).frames, result: best };
}

export const adapter = {
  slug: 'longest-consecutive-sequence',
  signature: { name: 'longestConsecutive', params: ['int[]'], return: 'int' },
  lesson: {
    idea: 'Put every value in a hash set; only values with no predecessor start a run, then count upward.',
    trap: 'Sorting or scanning neighbours without a set is O(n log n) or misses non-adjacent values; starting a run from every value re-walks runs to O(n^2).',
    time: 'O(n)',
    space: 'O(n)',
    invariant: 'best equals the longest run fully counted from starts seen so far.',
    bound: 'Staged visual bound: at most ' + VISUAL_BOUND + ' elements; longer inputs raise an explicit error (no silent truncation).',
  },
  explain: explainSteps,
  explainLines,
  code: longestConsecutiveCode,
  build,
  VISUAL_BOUND,
};
