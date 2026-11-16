/**
 * trapping-rain-water — standalone walkthrough adapter (batch13).
 *
 * Two-pointer convergence over the elevation map: track leftMax/rightMax and
 * settle the smaller end each pass (its water level is already decided by its
 * own side max). One bar settles per pass: at/above the side max raises the
 * ceiling, below it seals max-bar units of water.
 *
 * Staged source: .workers/jobs/neetcode150-completion/trapping-rain-water/adapter.mjs
 * (buildTrap frames/steps/notes) + lesson.mjs (idea/trap/complexity) — reshaped
 * into the live adapter contract (signature/lesson/explain/explainLines/code/build).
 * Live walkthrough bound accepts at most 12 bars of height 0..9 so the official
 * 12-bar example 1 renders natively (26 frames, no compaction); the staged packet
 * renders at most 9 (see its REVIEW). Judge range (n <= 2*10^4, h <= 10^5) rests
 * on the identical O(n) algorithm, not rendered proof.
 *
 * Signature equals the live judge signature exactly:
 * trap(height: int[]) -> int (plugin/data/shard-14.json id 42).
 */

import { code, frame, boundedFrames, arrayInput } from './semantic-core.js'

void boundedFrames

// Walkthrough scene bound (judge allows n up to 2*10^4, height up to 10^5).
// Full trace uses 2 events per bar: 1 init + 2*n + 1 return.
// MAX_N=12 keeps every native trace within 6..27 frames, so no compaction.
const MAX_N = 12
const MAX_H = 9

const trapJava = code(`
[def] class Solution {
[def]     public int trap(int[] height) {
[init]         int left = 0;
[init]         int right = height.length - 1;
[init]         int leftMax = 0;
[init]         int rightMax = 0;
[init]         int water = 0;
[loop]         while (left <= right) {
[loop]             if (height[left] <= height[right]) {
[raise]                 if (height[left] >= leftMax) leftMax = height[left];
[trap]                 else water += leftMax - height[left];
[loop]                 left++;
[loop]             } else {
[raise]                 if (height[right] >= rightMax) rightMax = height[right];
[trap]                 else water += rightMax - height[right];
[loop]                 right--;
[loop]             }
[loop]         }
[return]         return water;
[def]     }
[def] }
`)

const trapCpp = code(`
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     int trap(vector<int>& height) {
[init]         int left = 0;
[init]         int right = (int)height.size() - 1;
[init]         int leftMax = 0;
[init]         int rightMax = 0;
[init]         int water = 0;
[loop]         while (left <= right) {
[loop]             if (height[left] <= height[right]) {
[raise]                 if (height[left] >= leftMax) leftMax = height[left];
[trap]                 else water += leftMax - height[left];
[loop]                 ++left;
[loop]             } else {
[raise]                 if (height[right] >= rightMax) rightMax = height[right];
[trap]                 else water += rightMax - height[right];
[loop]                 --right;
[loop]             }
[loop]         }
[return]         return water;
[def]     }
[def] };
`)

const trapPseudo = code(`
[def] trap(height):
[init]   left = 0; right = n - 1; leftMax = 0; rightMax = 0; water = 0
[loop]   while left <= right:
[loop]     if height[left] <= height[right]: settle left else settle right
[raise]     if bar >= side max: raise max to bar; advance pointer
[trap]     else: trap (max - bar); water += gain; advance pointer
[return]   return water
`)

function decodeHeight(value) {
  const raw = Array.isArray(value) ? value : JSON.parse(value)
  if (!Array.isArray(raw)) throw new Error('Walkthrough needs an integer array like [4,2,0,3,2,5]')
  if (raw.length < 1 || raw.length > MAX_N) throw new Error('Walkthrough visual bound: array length 1..12 (judge allows up to 2*10^4); got ' + raw.length)
  const source = arrayInput(raw, MAX_N)
  for (const h of source) {
    if (!Number.isInteger(h) || h < 0 || h > MAX_H) throw new Error('Walkthrough visual bound: values 0..9 (judge allows 0..10^5); got ' + h)
  }
  return source
}

function buildTrap(args) {
  const source = decodeHeight(args[0])
  const n = source.length
  let left = 0
  let right = n - 1
  let leftMax = 0
  let rightMax = 0
  let water = 0
  const frames = []

  const state = (current, l, r, extra = {}) => ({
    current,
    values: source.slice(),
    pointers: { left: l, right: r },
    vars: { n, left: l, right: r, leftMax, rightMax, water, ...extra }
  })
  const push = (step, label, note, current, l, r, extra = {}) =>
    frames.push(frame(step, label, note, state(current, l, r, extra)))

  push('init', 'Initialize', 'n=' + n + ', left=0(h=' + source[0] + '), right=' + (n - 1) + '(h=' + source[n - 1] + '), water=0', null, left, right, {})

  while (left <= right) {
    const hl = source[left]
    const hr = source[right]
    const settleLeft = hl <= hr
    const side = settleLeft ? left : right
    const sideH = settleLeft ? hl : hr
    const sideMax = settleLeft ? leftMax : rightMax
    push('loop', 'Compare ends (' + left + ',' + right + ')', 'h[' + left + ']=' + hl + ', h[' + right + ']=' + hr + '; settle ' + (settleLeft ? 'left' : 'right') + ' ' + side + '(h=' + sideH + ',max=' + sideMax + ')', side, left, right, { hl, hr, side: settleLeft ? 'left' : 'right' })
    if (settleLeft) {
      const idx = left
      if (hl >= leftMax) {
        leftMax = hl
        left += 1
        push('raise', 'Raise leftMax', 'h[' + idx + ']=' + hl + ' >= Lmax; Lmax=' + leftMax + '; left ' + idx + '->' + left, idx, left, right, { hl, hr, idx, h: hl, bound: leftMax, gained: 0 })
      } else {
        const gain = leftMax - hl
        water += gain
        left += 1
        push('trap', 'Trap at ' + idx, 'h[' + idx + ']=' + hl + ' < Lmax=' + leftMax + '; +' + gain + ' water=' + water + '; left ' + idx + '->' + left, idx, left, right, { hl, hr, idx, h: hl, bound: leftMax, gained: gain })
      }
    } else {
      const idx = right
      if (hr >= rightMax) {
        rightMax = hr
        right -= 1
        push('raise', 'Raise rightMax', 'h[' + idx + ']=' + hr + ' >= Rmax; Rmax=' + rightMax + '; right ' + idx + '->' + right, idx, left, right, { hl, hr, idx, h: hr, bound: rightMax, gained: 0 })
      } else {
        const gain = rightMax - hr
        water += gain
        right -= 1
        push('trap', 'Trap at ' + idx, 'h[' + idx + ']=' + hr + ' < Rmax=' + rightMax + '; +' + gain + ' water=' + water + '; right ' + idx + '->' + right, idx, left, right, { hl, hr, idx, h: hr, bound: rightMax, gained: gain })
      }
    }
  }

  push('return', 'Return water', 'return ' + water + '; left=' + left + ', right=' + right + ' crossed, all settled', null, left, right, {})
  // Full event list: the host performs the single honest compaction pass.
  return {
    kind: 'array',
    layout: { values: source.slice() },
    frames,
    result: water
  }
}

export const adapters = {
  'trapping-rain-water': {
    signature: { name: 'trap', params: ['int[]'], return: 'int' },
    lesson: {
      idea: 'Track leftMax/rightMax; the smaller side is bounded, so settle it: trap max-bar or raise max.',
      trap: 'Not max-area: never move the taller wall; rain settles the smaller side each step.',
      time: 'O(n)',
      space: 'O(1)'
    },
    // Per-step explanations (presentation metadata, never compiled).
    // Staged source: .workers/jobs/neetcode150-completion/trapping-rain-water/lesson.mjs
    // (idea/trap/whyItWorks/traps); condensed to one note per walkthrough step.
    explain: {
      def: 'Scope: class Solution with trap(height) over the bar array; the measured walk runs in the body below.',
      init: 'Two pointers at both ends plus both side maxima and the running total, all starting at zero.',
      loop: 'Compare the two ends; the smaller side is bounded, so exactly that side settles this pass.',
      raise: 'Bar at or above its side max: a new wall that raises the ceiling and traps nothing here.',
      trap: 'Bar below its side max: the gap max-bar is sealed water; add it to the total and step inward.',
      return: 'Pointers crossed: every bar settled exactly once, so the total is the trapped volume.'
    },
    explainLines: {
      java: {
        2: 'left starts at index 0: the leftmost wall of the converging pair.',
        3: 'right starts at the last bar: the rightmost wall of the converging pair.',
        6: 'water=0: no bar settled yet, so nothing is trapped.',
        7: 'Loop while left<=right: settle exactly one bar per pass until the pointers cross.',
        8: 'Smaller end first: only its water level is already decided by its own side max.',
        9: 'Left wall test, ties included (>=): a plateau raises the max instead of leaking.',
        10: 'Sealed from the left: trap leftMax-height[left] above this bar.',
        18: 'All bars settled: return the trapped total.'
      },
      cpp: {
        5: 'left starts at index 0: the leftmost wall of the converging pair.',
        6: 'right starts at the last bar: the rightmost wall of the converging pair.',
        9: 'water=0: no bar settled yet, so nothing is trapped.',
        10: 'Loop while left<=right: settle exactly one bar per pass until the pointers cross.',
        11: 'Smaller end first: only its water level is already decided by its own side max.',
        12: 'Left wall test, ties included (>=): a plateau raises the max instead of leaking.',
        13: 'Sealed from the left: trap leftMax-height[left] above this bar.',
        21: 'All bars settled: return the trapped total.'
      },
      pseudo: {
        0: 'Function header: takes the bar array and returns trapped units.',
        1: 'Two pointers plus both maxima plus the running total.',
        2: 'Settle one bar per pass until the pointers cross.',
        3: 'Only the smaller side fate is decided yet.',
        4: 'A new wall just raises the ceiling.',
        5: 'Below the ceiling, the gap is trapped water.',
        6: 'Pointers crossed: every bar accounted for.'
      }
    },
    code: { java: trapJava, cpp: trapCpp, pseudo: trapPseudo },
    build: buildTrap
  }
}

export const visualBounds = { minN: 1, maxN: MAX_N, minH: 0, maxH: MAX_H }
