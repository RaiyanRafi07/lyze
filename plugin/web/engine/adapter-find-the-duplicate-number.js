/**
 * find-the-duplicate-number — portable per-slug semantic adapter (Floyd tortoise & hare).
 *
 * Problem: nums has n+1 ints in [1,n], exactly one value repeats (>=2x).
 * Return the repeated value without modifying nums, O(1) extra space.
 *
 * Model: index i links to nums[i]. Values are valid indices (1..n, len n+1),
 * so the walk from 0 must enter a cycle; the cycle entrance IS the duplicate.
 * Phase 1 meets inside the cycle (slow 1x, fast 2x); phase 2 restarts slow at
 * nums[0] and steps both 1x — they meet at the entrance (standard Floyd proof).
 *
 * Live record: plugin/data/shard-6.json (id 287, Medium, pattern two-pointers),
 * judge mode exact with three official tests; the signature below equals the
 * live judge signature exactly (name/return/param types).
 *
 * Pure + synchronous; throws honest bounds errors instead of inventing state.
 * kind: 'linked-list' (array-as-functional-graph), pointers slow/fast are
 * value-indices into layout.values.
 */
import { code, frame, boundedFrames } from './semantic-core.js';

export const SLUG = 'find-the-duplicate-number';

// Live judge signature (object form). The adapters entry below carries the same
// profile in the string-array params form semantic.js compares against.
export const SIGNATURE = {
  name: 'findDuplicate',
  params: [{ name: 'nums', type: 'int[]' }],
  return: 'int',
};

const SIGNATURE_TYPES = ['int[]'];

// Visual bound: judge allows n up to 1e5. Raw events ~= 2*phase1 + 2*phase2 + 4,
// so MAX_VIS_LEN 8 keeps every native trace <= ~24 frames (no compaction).
export const MAX_VIS_LEN = 8;

function decodeNums(value) {
  let raw = value;
  if (typeof raw === 'string') {
    raw = raw.trim() === '' ? [] : JSON.parse(raw);
  }
  if (!Array.isArray(raw)) throw new Error('nums must be an array like [1,3,4,2,2]');
  if (raw.length < 2) throw new Error('nums needs at least 2 entries (n >= 1); got ' + raw.length);
  if (raw.length > MAX_VIS_LEN)
    throw new Error(
      'Visual walkthrough limited to ' + MAX_VIS_LEN + ' entries (judge allows up to 100001); got ' + raw.length
    );
  const n = raw.length - 1;
  raw.forEach((v, i) => {
    if (!Number.isSafeInteger(v)) throw new Error('nums[' + i + '] must be an integer (got ' + String(v) + ')');
    if (v < 1 || v > n) throw new Error('nums[' + i + ']=' + v + ' out of range [1,' + n + ']');
  });
  // Honest constraint check: values in [1,n], length n+1 (so a repeat must
  // exist), and exactly one DISTINCT value repeats. Fully-uniform inputs like
  // [3,3,3,3,3] (official example 3) are judge-accepted, so absent values are
  // allowed — only a second distinct repeat is rejected.
  const counts = new Map();
  for (const v of raw) counts.set(v, (counts.get(v) || 0) + 1);
  let distinctDups = 0;
  for (const c of counts.values()) if (c > 1) distinctDups += 1;
  if (distinctDups !== 1)
    throw new Error('nums must hold n+1 values in [1,n] with exactly one repeated value');
  return raw.slice();
}

export const findDuplicateJava = code(`
[def] class Solution {
[def]     public int findDuplicate(int[] nums) {
[init]         int slow = nums[0];
[init]         int fast = nums[0];
[chase]         do {
[chase]             slow = nums[slow];
[chase]             fast = nums[nums[fast]];
[chase]         } while (slow != fast);
[meet]         // slow == fast: meeting point inside the cycle
[reset]         slow = nums[0];
[enter]         while (slow != fast) {
[enter]             slow = nums[slow];
[enter]             fast = nums[fast];
[enter]         }
[return]         return slow;
[def]     }
[def] }
`);

export const findDuplicateCpp = code(`
[def] class Solution {
[def] public:
[def]     int findDuplicate(vector<int>& nums) {
[init]         int slow = nums[0];
[init]         int fast = nums[0];
[chase]         do {
[chase]             slow = nums[slow];
[chase]             fast = nums[nums[fast]];
[chase]         } while (slow != fast);
[meet]         // slow == fast: meeting point inside the cycle
[reset]         slow = nums[0];
[enter]         while (slow != fast) {
[enter]             slow = nums[slow];
[enter]             fast = nums[fast];
[enter]         }
[return]         return slow;
[def]     }
[def] };
`);

export const findDuplicatePseudo = code(`
[def] findDuplicate(nums):
[init]   slow = nums[0]; fast = nums[0]
[chase]   repeat: slow = nums[slow]; fast = nums[nums[fast]] until slow == fast
[meet]   they met inside the value-cycle
[reset]   slow = nums[0]          // fast stays at the meeting point
[enter]   while slow != fast: slow = nums[slow]; fast = nums[fast]
[return]   return slow             // cycle entrance == duplicate value
`);

const EXPLAIN = {
  init: 'Seeds both walkers at nums[0] so the first hop stays inside [1,n] and empty/single inputs exit through validation.',
  chase: 'Moves tortoise one link and hare two links per round; the gap grows by one each round so they must coincide inside the cycle.',
  meet: 'Certifies the coincidence as a cycle point (not the answer yet) before resetting for the entrance search.',
  reset: 'Parks slow back at the start while hare holds the meeting point so both sit equidistant from the entrance.',
  enter: 'Steps both walkers one link per round; equal advance from equidistant spots keeps them meeting exactly at the entrance.',
  return: 'Exposes the entrance value as the duplicate, closing the walkthrough scope with the proven answer.',
  def: 'Declares the solver scope and signature so pointer logic stays isolated from caller setup.',
};

export const EXPLAIN_LINES = {
  java: {
    4: 'Open the chase loop: each round moves slow one link and fast two links.',
    7: 'End of one chase round; the loop repeats until the walkers coincide.',
    10: 'Open the entrance search: both walkers step once per round from here on.',
    13: 'End of the entrance loop: slow==fast is the duplicate value.',
    15: 'End of the method scope; the returned value is the duplicate.',
    16: 'End of the class scope; it performs no algorithm operation.',
  },
  cpp: {
    5: 'Open the chase loop: each round moves slow one link and fast two links.',
    8: 'End of one chase round; the loop repeats until the walkers coincide.',
    11: 'Open the entrance search: both walkers step once per round from here on.',
    14: 'End of the entrance loop: slow==fast is the duplicate value.',
    16: 'End of the method scope; the returned value is the duplicate.',
    17: 'End of the class scope; it performs no algorithm operation.',
  },
  pseudo: {
    2: 'One chase round per line: the repeat runs until the walkers coincide.',
    5: 'One joint step per pass; the loop stops exactly at the entrance.',
  },
};

// Independent oracle (NOT Floyd): frequency count. Used by selfcheck + forge.
export function oracleFindDuplicate(nums) {
  const seen = new Set();
  for (const v of nums) {
    if (seen.has(v)) return v;
    seen.add(v);
  }
  // Fallback: first value with count > 1 (handles 3x+ repeats honestly).
  const counts = new Map();
  for (const v of nums) counts.set(v, (counts.get(v) || 0) + 1);
  for (const [v, c] of counts) if (c > 1) return v;
  throw new Error('no duplicate found');
}

export function buildFindDuplicate(args) {
  const nums = decodeNums(args?.[0]);
  const n = nums.length - 1;
  const frames = [];
  const anchors = [];

  // Linked-list view: position i links to nums[i]; slow/fast hold VALUES that
  // are also valid indices, so pointers index directly into layout.values.
  const stateOf = (slow, fast, extra = {}) => ({
    current: slow,
    pointers: { slow, fast },
    highlights: {
      ...(Number.isInteger(slow) && slow >= 0 && slow < nums.length ? { [slow]: 'accent' } : {}),
      ...(Number.isInteger(fast) && fast >= 0 && fast < nums.length && fast !== slow
        ? { [fast]: 'warn' }
        : {}),
    },
    answer: null,
    vars: { slow, fast, n, ...extra },
  });
  const push = (step, label, note, slow, fast, extra) =>
    frames.push(frame(step, label, note, stateOf(slow, fast, extra)));

  let slow = nums[0];
  let fast = nums[0];
  anchors.push(0);
  push('init', 'Start together', 'n=' + n + '; slow=fast=nums[0]=' + slow + '; walk i -> nums[i]', slow, fast);

  // Phase 1: do-while, slow 1 step, fast 2 steps, until equal.
  let guard = 0;
  for (;;) {
    if (guard++ > 4 * nums.length + 4) throw new Error('internal frame overflow');
    const prevSlow = slow;
    const prevFast = fast;
    slow = nums[slow];
    fast = nums[nums[fast]];
    const met = slow === fast;
    push(
      'chase',
      met ? 'Tortoise caught' : 'Chase one round',
      'slow ' + prevSlow + '->' + slow + '; fast ' + prevFast + '->..->' + fast + (met ? '; meet' : '; keep going'),
      slow,
      fast
    );
    if (met) break;
  }
  const meetVal = slow;
  anchors.push(frames.length - 1);
  push('meet', 'Cycle confirmed', 'slow==fast=' + meetVal + '; inside the 1..n value-cycle', slow, fast);
  anchors.push(frames.length - 1);

  // Phase 2: reset slow to start, advance both 1x until equal (entrance).
  slow = nums[0];
  push('reset', 'Reset slow', 'slow=nums[0]=' + slow + '; fast stays ' + fast + '; equal steps to entry', slow, fast);
  anchors.push(frames.length - 1);

  guard = 0;
  while (slow !== fast) {
    if (guard++ > 2 * nums.length + 2) throw new Error('internal frame overflow');
    slow = nums[slow];
    fast = nums[fast];
    const met = slow === fast;
    push(
      'enter',
      met ? 'Entrance found' : 'Step together',
      'slow->' + slow + '; fast->' + fast + (met ? '; equal: duplicate' : '; not equal yet'),
      slow,
      fast
    );
  }
  const dup = slow;
  // Cross-check against the independent oracle; never ship a lying walkthrough.
  const oracle = oracleFindDuplicate(nums);
  if (oracle !== dup) throw new Error('Floyd result ' + dup + ' disagrees with count oracle ' + oracle);

  const lastState = { ...stateOf(slow, fast), answer: dup };
  frames.push(frame('return', 'Return duplicate', 'return ' + dup + '; value appears 2+ times in [1,' + n + ']', lastState));
  anchors.push(frames.length - 1);

  const edges = nums.map((v, i) => [i, v]);
  return {
    kind: 'linked-list',
    layout: {
      values: nums.slice(),
      nodes: nums.map((value, id) => ({ id, value })),
      edges,
    },
    frames,
    result: dup,
    anchors: [...new Set(anchors.filter((i) => Number.isInteger(i) && i >= 0 && i < frames.length))].sort(
      (a, b) => a - b
    ),
  };
}

// Live-forge-compatible entry: buildScene(problem, options) -> CONTRACTS scene
// (v 1, kind linked-list, 6..40 frames) or null. Pure, synchronous, never throws.
// Accepts a full shard record (judge test[0] args) or a direct { nums } / [nums].
export function buildScene(problem, options = {}) {
  try {
    const direct =
      (options && Array.isArray(options.nums)) ? options.nums
        : (problem && Array.isArray(problem.nums)) ? problem.nums
          : null;
    let numsValue = direct;
    if (!numsValue) {
      const sig = problem && problem.judge && problem.judge.signature;
      if (!sig || sig.name !== 'findDuplicate') return null;
      const rawArgs = (options && Array.isArray(options.args))
        ? options.args
        : (problem && problem.judge && Array.isArray(problem.judge.tests) && problem.judge.tests[0]
          ? problem.judge.tests[0].args : null);
      if (!Array.isArray(rawArgs) || rawArgs.length !== 1) return null;
      numsValue = rawArgs[0];
    }
    const built = buildFindDuplicate([numsValue]);
    // Single compaction pass (mirrors semantic.js): full honest events in,
    // at most 40 frames out; anchors (meet/reset/return) survive when budgeted.
    let { frames } = boundedFrames(built.frames, 40, built.anchors || []);
    if (frames.length < 6) {
      // Same short-run rule as semantic.js: honest context cards repeating real
      // snapshots, explicitly not extra operations.
      const raw = (problem && problem.judge && problem.judge.tests && problem.judge.tests[0])
        ? problem.judge.tests[0].args.join('; ') : 'nums int[]';
      const first = frames[0];
      const last = frames[frames.length - 1];
      const context = [
        { ...first, label: 'Context: input', note: String(raw).slice(0, 140) },
        { ...first, label: 'Context: task', note: 'One value repeats in [1,n]; find it with O(1) space.' },
        { ...first, label: 'Context: invariant', note: 'Positions are links i -> nums[i]; entrance is the answer.' },
        { ...last, label: 'Context: returned value', note: 'Actual return value: ' + JSON.stringify(built.result) },
      ];
      const needed = 6 - frames.length;
      frames = [...context.slice(0, Math.min(needed, 3)), ...frames, ...context.slice(3, needed > 3 ? 4 : 3)];
    }
    return {
      v: 1,
      kind: 'linked-list',
      title: 'Find the Duplicate Number — tortoise and hare on links',
      subtitle: 'Positions are links i -> nums[i]; the cycle entrance is the answer',
      pattern: (problem && problem.pattern) || 'two-pointers',
      camera: { yaw: 0.46, pitch: 0.64, dist: 12 },
      layout: built.layout,
      frames: frames.map((f) => ({ ...f, note: String(f.note).slice(0, 140) })),
    };
  } catch {
    return null;
  }
}

// Registry-shaped export for precise wiring.
export const adapters = {
  'find-the-duplicate-number': {
    signature: { name: 'findDuplicate', params: SIGNATURE_TYPES, return: 'int' },
    lesson: {
      idea: 'Read nums as links i -> nums[i]: the walk from 0 must cycle, and the cycle entrance is the repeated value. Tortoise (1x) meets hare (2x) inside, then both walk 1x from start/meet to the entrance.',
      trap: 'slow/fast hold VALUES that double as indices — nums[nums[fast]] needs two hops, and phase 2 must reset slow to nums[0] (not 0) before stepping both once per round.',
      time: 'O(n)',
      space: 'O(1)',
      alt: 'Sort a copy (O(n log n) time) or count with a hash set (O(n) space): both break the no-modify / O(1)-space constraints, which is why the two-walker link walk is required.',
    },
    code: { java: findDuplicateJava, cpp: findDuplicateCpp, pseudo: findDuplicatePseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build: buildFindDuplicate,
  },
};
