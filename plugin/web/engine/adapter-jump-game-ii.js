/**
 * jump-game-ii — live semantic adapter (Greedy window expansion).
 *
 * Walkthrough algorithm (mirrors the reference Java/C++/pseudo below):
 * greedy level expansion — jumps counts committed jumps, end marks the current
 * window edge, far tracks the farthest index reachable from the whole window.
 * Each index i (except the last) extends far = max(far, i + nums[i]); when the
 * scan reaches end, one jump is committed and end jumps to far. O(n) time,
 * O(1) space. Length 1 needs 0 jumps.
 *
 * Live record: plugin/data/shard-5.json id 45 (Medium, pattern greedy), judge
 * mode exact, signature jump(int[] nums) -> int, official tests
 * `[2,3,1,1,4] -> 2` and `[2,3,0,1,4] -> 2`,
 * constraints 1 <= nums.length <= 10^4, 0 <= nums[i] <= 1000 (reachable).
 *
 * Staged source: .workers/jobs/neetcode150-completion/jump-game-ii/jump-game-ii.adapter.mjs
 * (signature, lesson, Java/C++/pseudo, greedy build) — ported to the live shape:
 * shared `code`/`frame` helpers imported from semantic-core.js (the staged file
 * carried local stand-ins), no local helper redefinitions. Signature equals the
 * live judge signature exactly, so the same editor code compiles unchanged.
 *
 * Visual bound: 1..8 elements, values 0..20 per walkthrough (judge allows far
 * larger inputs). Longer inputs reject with a clear error instead of
 * truncating. The code runner keeps the full official constraints.
 */
import { code, frame, boundedFrames } from './semantic-core.js'

// boundedFrames is applied by semantic.js (single compaction pass); the import
// keeps this adapter on the shared helper contract. Adapters return FULL lists.
void boundedFrames

export const VISUAL_MAX_N = 8
export const VISUAL_MAX_VAL = 20

function fail(message) {
  throw new Error(message)
}

function decodeNums(value) {
  const input = typeof value === 'string' ? JSON.parse(value) : value
  if (!Array.isArray(input)) fail('jump-game-ii visual needs one integer array [nums]')
  if (input.length < 1 || input.length > VISUAL_MAX_N) {
    fail(`jump-game-ii visual needs 1..${VISUAL_MAX_N} elements (got ${input.length}); larger inputs are rejected, never truncated`)
  }
  for (let k = 0; k < input.length; k += 1) {
    if (!Number.isInteger(input[k])) fail(`nums[${k}] must be an integer (got ${String(input[k])})`)
    if (input[k] < 0 || input[k] > VISUAL_MAX_VAL) {
      fail(`jump-game-ii visual needs values 0..${VISUAL_MAX_VAL} (nums[${k}]=${input[k]} given)`)
    }
  }
  return input.slice()
}

const jumpGameIIJava = code(`
[def] class Solution {
[def]     public int jump(int[] nums) {
[init]         if (nums.length <= 1) {
[init]             return 0;
[init]         }
[init]         int jumps = 0;
[init]         int end = 0;
[init]         int far = 0;
[scan]         for (int i = 0; i < nums.length - 1; i++) {
[extend]             far = Math.max(far, i + nums[i]);
[jump]             if (i == end) {
[jump]                 jumps++;
[jump]                 end = far;
[jump]             }
[scan]         }
[done]         return jumps;
[def]     }
[def] }
`)

const jumpGameIICpp = code(`
[def] class Solution {
[def] public:
[def]     int jump(vector<int>& nums) {
[init]         if ((int)nums.size() <= 1) return 0;
[init]         int jumps = 0;
[init]         int end = 0;
[init]         int far = 0;
[scan]         for (int i = 0; i + 1 < (int)nums.size(); i++) {
[extend]             far = max(far, i + nums[i]);
[jump]             if (i == end) {
[jump]                 jumps++;
[jump]                 end = far;
[jump]             }
[scan]         }
[done]         return jumps;
[def]     }
[def] };
`)

const jumpGameIIPseudo = code(`
[def] function jump(nums)
[init]   if length(nums) <= 1
[init]     return 0
[init]   jumps = 0
[init]   end = 0
[init]   far = 0
[scan]   for i from 0 to length(nums) - 2
[extend]     far = max(far, i + nums[i])
[jump]     if i == end
[jump]       jumps = jumps + 1
[jump]       end = far
[jump]     end if
[scan]   end for
[done]   return jumps
[def] end function
`)

const jumpGameIIExplain = {
  def: 'The task: minimum jumps from index 0 to the last index; every test case is guaranteed reachable.',
  init: 'No jump taken yet: length 1 needs 0 jumps, otherwise start with jumps 0 and both window end and farthest reach at 0.',
  scan: 'Walk each index except the last: it is a candidate takeoff inside the current jump window.',
  extend: 'Fold this index into far: far is the best coverage any takeoff in the window offers so far.',
  jump: 'At the window edge, one more jump is unavoidable — commit it and extend the window to far.',
  done: 'The window covers the last index, so the counted jumps are the minimum; return them.',
}

const jumpGameIIExplainLines = {
  java: {
    0: 'Class scope: owns the Solution type; no state yet.',
    1: 'Signature: public int jump(int[] nums) binds the jump array; execution starts below.',
    2: 'Early exit: a single element is already the destination, so 0 jumps.',
    3: 'Early exit: return 0 with no scan for length 1.',
    4: 'Init: jumps counts committed jumps; nothing committed yet.',
    5: 'Init: end marks the current window edge; the first window is [0..0].',
    6: 'Init: far is the farthest reach offered by the current window; starts at 0.',
    7: 'Scan scope: i is the takeoff being folded; the last index is never scanned.',
    8: 'Extend: fold takeoff i into far; max never shrinks the coverage.',
    9: 'Window edge: every takeoff in this jump has been folded into far.',
    10: 'Commit: one more jump is unavoidable, so count it.',
    11: 'Extend window: the next jump covers everything up to far.',
    12: 'End of the window-edge branch; the scan continues inside the new window.',
    13: 'End of the scan: every takeoff except the last has been folded.',
    14: 'Done: the window covers the last index, so jumps is minimal; return it.',
    15: 'Method scope close: no state effect.',
    16: 'Class scope close: no state effect.',
  },
  cpp: {
    0: 'Class scope: owns the Solution type; no state yet.',
    1: 'Access scope (public:): visibility only, no state effect.',
    2: 'Signature: int jump(vector<int>& nums) binds the jump array by reference.',
    3: 'Early exit: a single element is already the destination, so 0 jumps.',
    4: 'Init: jumps counts committed jumps; nothing committed yet.',
    5: 'Init: end marks the current window edge; the first window is [0..0].',
    6: 'Init: far is the farthest reach offered by the current window; starts at 0.',
    7: 'Scan scope: i is the takeoff being folded; the last index is never scanned.',
    8: 'Extend: fold takeoff i into far; max never shrinks the coverage.',
    9: 'Window edge: every takeoff in this jump has been folded into far.',
    10: 'Commit: one more jump is unavoidable, so count it.',
    11: 'Extend window: the next jump covers everything up to far.',
    12: 'End of the window-edge branch; the scan continues inside the new window.',
    13: 'End of the scan: every takeoff except the last has been folded.',
    14: 'Done: the window covers the last index, so jumps is minimal; return it.',
    15: 'Method scope close: no state effect.',
    16: 'Class terminator: closes the Solution scope; no state effect.',
  },
  pseudo: {
    0: 'Entry: jump receives the nums array; the minimum count is the result.',
    1: 'Early exit: a single element is already the destination, so 0 jumps.',
    2: 'Early exit: return 0 with no scan for length 1.',
    3: 'Init: committed jumps start at 0.',
    4: 'Init: current window edge starts at 0.',
    5: 'Init: farthest window coverage starts at 0.',
    6: 'Order: scan takeoffs left to right, stopping before the last index.',
    7: 'Core: fold each takeoff into the window farthest reach.',
    8: 'Edge rule: only the window edge commits a jump.',
    9: 'Commit: count the unavoidable jump.',
    10: 'Grow: the next window ends at the farthest reach.',
    11: 'End of the edge branch; scanning continues.',
    12: 'End of the scan; every takeoff has been considered.',
    13: 'Verdict: the committed count is minimal; return it.',
    14: 'Scope close: no state effect.',
  },
}

export function buildJumpGameII(args) {
  if (!Array.isArray(args) || args.length !== 1) {
    fail('jump-game-ii expects [nums]')
  }
  const nums = decodeNums(args[0])
  const n = nums.length
  const frames = []

  if (n === 1) {
    frames.push(
      frame('init', 'Initialize', 'Single element: already at the last index, 0 jumps needed.',
        { values: nums.slice(), pointers: { i: 0 }, highlights: { 0: 'ok' }, vars: { jumps: 0, end: 0, far: 0, n } }),
      frame('done', 'Return', 'Return 0: no jump is needed for length 1.',
        { values: nums.slice(), pointers: { i: 0 }, highlights: { 0: 'ok' }, vars: { jumps: 0, result: 0 } }),
    )
    return { kind: 'array', layout: { values: nums.slice() }, frames, result: 0 }
  }

  let jumps = 0
  let end = 0
  let far = 0

  frames.push(
    frame('init', 'Initialize', 'jumps 0, current window ends at 0, farthest reach 0.',
      { values: nums.slice(), pointers: { i: 0 }, highlights: { 0: 'accent' }, vars: { jumps, end, far, n } }),
  )

  for (let i = 0; i < n - 1; i++) {
    frames.push(
      frame('scan', 'Scan ' + i, 'Index ' + i + ' jumps ' + nums[i] + '; window ends at ' + end + ', far is ' + far + '.',
        { values: nums.slice(), pointers: { i }, highlights: { [i]: 'accent' }, vars: { jumps, end, far, i, reach: i + nums[i] }, window: [0, end] }),
    )
    const before = far
    far = Math.max(far, i + nums[i])
    frames.push(
      frame('extend', 'Extend', 'far = max(' + before + ', ' + i + '+' + nums[i] + ') = ' + far + '.',
        { values: nums.slice(), pointers: { i }, highlights: { [i]: 'ok' }, vars: { jumps, end, far, i }, window: [0, end] }),
    )
    if (i === end) {
      jumps++
      end = far
      frames.push(
        frame('jump', 'Jump ' + jumps, 'Reached window end ' + i + '; take jump ' + jumps + ', new window ends at ' + end + '.',
          { values: nums.slice(), pointers: { i }, highlights: { [i]: 'warn', [Math.min(end, n - 1)]: 'ok' }, vars: { jumps, end, far, i }, window: [0, Math.min(end, n - 1)] }),
      )
      if (end >= n - 1) {
        frames.push(
          frame('done', 'Return', 'Window end ' + end + ' covers index ' + (n - 1) + '; return ' + jumps + '.',
            { values: nums.slice(), pointers: { i }, highlights: { [n - 1]: 'ok' }, vars: { jumps, end, far, result: jumps } }),
        )
        return { kind: 'array', layout: { values: nums.slice() }, frames, result: jumps }
      }
    }
  }

  frames.push(
    frame('done', 'Return', 'Scanned to index ' + (n - 2) + ' with ' + jumps + ' jumps; return ' + jumps + '.',
      { values: nums.slice(), vars: { jumps, end, far, result: jumps } }),
  )
  return { kind: 'array', layout: { values: nums.slice() }, frames, result: jumps }
}

export const build = buildJumpGameII

export const adapters = {
  'jump-game-ii': {
    signature: { name: 'jump', params: ['int[]'], return: 'int' },
    lesson: {
      idea: 'Expand jump by jump: far tracks the farthest index reachable from the window; at each window end spend one jump to reach far.',
      trap: 'Farthest single landing can strand you; the jump buys window coverage (far), not one index. Loop only to n-2, return 0 for n=1.',
      time: 'O(n)',
      space: 'O(1)',
    },
    explain: jumpGameIIExplain,
    explainLines: jumpGameIIExplainLines,
    code: { java: jumpGameIIJava, cpp: jumpGameIICpp, pseudo: jumpGameIIPseudo },
    build: buildJumpGameII,
  },
}
