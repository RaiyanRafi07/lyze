/**
 * largest-rectangle-in-histogram — standalone walkthrough adapter (batch13).
 *
 * Monotonic-stack sweep: visit each bar left to right plus a sentinel step
 * (cur=0 at i==n); the stack holds rising-bar indices so each pop closes the
 * widest span of the popped height (left = empty ? 0 : top+1, area = h*(i-left)).
 * Pop only on strictly lower cur so equal bars extend into one wide rectangle.
 *
 * Staged source: .workers/jobs/neetcode150-completion/largest-rectangle-in-histogram/adapter.largest-rectangle-in-histogram.mjs
 * (buildHistogram frames/steps/notes, histJava/histCpp/histPseudo, lesson,
 * explain/explainLines) — reshaped into the live adapter contract
 * (signature/lesson/explain/explainLines/code/build). Code blocks, lesson,
 * explain and explainLines are byte-faithful to staged; only the return shape
 * changes: the FULL event list plus anchors is returned and the host performs
 * the single honest compaction pass (staged compacted internally to 40).
 * Official example 1 emits 46 events, compacted by the host to 40 frames.
 *
 * Signature equals the live judge signature exactly:
 * largestRectangleArea(heights: int[]) -> int (plugin/data/shard-14.json id 84).
 */

import { code, frame, boundedFrames, arrayInput } from './semantic-core.js'

void boundedFrames

// Visual bound for the walkthrough scene (judge allows n up to 10^5).
const MAX_N = 12

const histJava = code(`
[def] class Solution {
[def]     public int largestRectangleArea(int[] heights) {
[init]         int n = heights.length;
[init]         java.util.ArrayDeque<Integer> stack = new java.util.ArrayDeque<>();
[init]         int best = 0;
[scan]         for (int i = 0; i <= n; i++) {
[check]             int cur = (i == n) ? 0 : heights[i];
[check]             while (!stack.isEmpty() && cur < heights[stack.peek()]) {
[pop]                 int h = heights[stack.pop()];
[measure]                 int left = stack.isEmpty() ? 0 : stack.peek() + 1;
[measure]                 int width = i - left;
[measure]                 int area = h * width;
[update]                 if (area > best) best = area;
[check]             }
[push]             if (i < n) stack.push(i);
[scan]         }
[return]         return best;
[def]     }
[def] }
`)

const histCpp = code(`
[def] class Solution {
[def] public:
[def]     int largestRectangleArea(vector<int>& heights) {
[init]         int n = (int)heights.size();
[init]         vector<int> stack;
[init]         int best = 0;
[scan]         for (int i = 0; i <= n; i++) {
[check]             int cur = (i == n) ? 0 : heights[i];
[check]             while (!stack.empty() && cur < heights[stack.back()]) {
[pop]                 int h = heights[stack.back()]; stack.pop_back();
[measure]                 int left = stack.empty() ? 0 : stack.back() + 1;
[measure]                 int width = i - left;
[measure]                 int area = h * width;
[update]                 if (area > best) best = area;
[check]             }
[push]             if (i < n) stack.push_back(i);
[scan]         }
[return]         return best;
[def]     }
[def] };
`)

const histPseudo = code(`
[def] largestRectangleArea(heights):
[init]   n = len(heights); stack = []; best = 0
[scan]   for i = 0 to n inclusive:
[check]     cur = 0 if i == n else heights[i]
[check]     while stack not empty and cur < heights[stack.top]:
[pop]       h = heights[pop stack]
[measure]       left = 0 if stack empty else stack.top + 1
[measure]       width = i - left
[measure]       area = h * width
[update]       best = max(best, area)
[push]     if i < n: push i onto stack
[return]   return best
`)

function buildHistogram(args) {
  const source = arrayInput(Array.isArray(args[0]) ? args[0] : JSON.parse(args[0]), MAX_N)
  const n = source.length
  const stack = []
  let best = 0
  const frames = []
  const anchors = []
  const state = (current, vars = {}) => ({
    current,
    values: source.slice(),
    stack: stack.slice(),
    best,
    vars: { n, i: current, best, ...vars },
  })
  const push = (step, label, note, current, vars = {}) =>
    frames.push(frame(step, label, note, state(current, vars)))

  push('init', 'Initialize', `n=${n}, best=0, stack=[] over heights=[${source.join(',')}]`, null, {})
  for (let i = 0; i <= n; i++) {
    const cur = i === n ? 0 : source[i]
    push('scan', i === n ? 'Sentinel i = n' : `Scan bar ${i}`, i === n
      ? `right sentinel cur=0 flushes every rising bar; stack=[${stack.join(',')}]`
      : `heights[${i}]=${source[i]}, cur=${cur}, stack=[${stack.join(',')}]`, i, { cur })
    if (stack.length === 0) {
      push('check', 'Check stack', `stack empty; nothing pops at i=${i} (cur=${cur})`, i, { cur, empty: 1 })
    } else {
      let popped = false
      while (stack.length > 0 && cur < source[stack[stack.length - 1]]) {
        const top = stack[stack.length - 1]
        push('check', 'Lower bar found', `cur=${cur} < heights[${top}]=${source[top]}; pop index ${top}`, i, { top, cur, topH: source[top] })
        const t = stack.pop()
        const h = source[t]
        push('pop', `Pop index ${t}`, `pop ${t} (h=${h}); stack=[${stack.join(',')}]`, i, { popped: t, h })
        const left = stack.length === 0 ? 0 : stack[stack.length - 1] + 1
        const width = i - left
        const area = h * width
        push('measure', `Measure h=${h}`, `left=${left}, width=${i}-${left}=${width}, area=${h}*${width}=${area}`, i, { h, left, width, area })
        if (area > best) {
          best = area
          anchors.push(frames.length)
          push('update', 'New best', `area ${area} > best; best=${best}`, i, { area, best })
        } else {
          push('update', 'Keep best', `area ${area} <= best ${best}; best unchanged`, i, { area, best })
        }
        popped = true
      }
      if (!popped) {
        const top = stack[stack.length - 1]
        push('check', 'Keep rising bar', `cur=${cur} >= heights[${top}]=${source[top]}; no pop at i=${i}`, i, { top, cur, topH: source[top] })
      } else if (stack.length === 0) {
        push('check', 'Stack drained', `stack empty after pops at i=${i}; loop exits`, i, { cur, empty: 1 })
      } else {
        const top = stack[stack.length - 1]
        push('check', 'Rise restored', `cur=${cur} >= heights[${top}]=${source[top]}; loop exits at i=${i}`, i, { top, cur, topH: source[top] })
      }
    }
    if (i < n) {
      stack.push(i)
      push('push', `Push index ${i}`, `push ${i} (h=${source[i]}); stack=[${stack.join(',')}]`, i, { pushed: i })
    }
  }
  anchors.push(frames.length)
  push('return', 'Return best', `return ${best} for heights=[${source.join(',')}]`, null, { best })
  // Full event list + anchors: the host performs the single honest compaction pass.
  return {
    kind: 'array',
    layout: { values: source.slice() },
    frames,
    result: best,
    anchors,
  }
}

export const adapters = {
  'largest-rectangle-in-histogram': {
    signature: { name: 'largestRectangleArea', params: ['int[]'], return: 'int' },
    lesson: {
      idea: 'Sweep bars left to right with a sentinel 0; the stack holds rising-bar indices so each pop closes the widest span of the popped height.',
      trap: 'Pop only on strictly lower cur so equal bars extend; left edge is empty ? 0 : new-top + 1 and width is i - left.',
      time: 'O(n)',
      space: 'O(n)',
    },
    // Per-step explanations (presentation metadata, never compiled).
    // Staged source: adapter.largest-rectangle-in-histogram.mjs (explain/explainLines).
    explain: {
      def: 'Task: widest span times its minimum bar; the sentinel pass below settles every rising bar exactly once.',
      init: 'Read n, open an empty index stack for rising bars, and set best to 0 before any span is measured.',
      scan: 'Visit each bar left to right plus one sentinel step; the sentinel cur of 0 flushes all leftover bars.',
      check: 'Compare cur against the stack top height; a strictly lower cur opens one pop per taller bar, else nothing pops.',
      pop: 'Remove the top index and read its height h; its right edge is fixed at the current i by the failed rise.',
      measure: 'Recompute the popped bar span from live stack state: left is empty ? 0 : top + 1, width i - left, area h * width.',
      update: 'Keep the maximum area seen so far; equal areas never replace best so the first maximum survives ties.',
      push: 'Record the current index for future spans; the sentinel step pushes nothing so the stack ends empty.',
      return: 'Return best, the maximum h * width measured over every popped bar including the sentinel flush.',
    },
    explainLines: {
      java: {
        13: 'End of one pop test: a rise exits the loop and control reaches the push below.',
        15: 'End of one sweep step: the pushed index is now visible to every later bar.',
      },
      cpp: {
        14: 'End of one pop test: a rise exits the loop and control reaches the push below.',
        16: 'End of one sweep step: the pushed index is now visible to every later bar.',
      },
      pseudo: {
        9: 'End of the pop loop: the rise is restored and the sweep continues at the push.',
      },
    },
    code: { java: histJava, cpp: histCpp, pseudo: histPseudo },
    build: buildHistogram,
  },
}

export const visualBounds = { minN: 1, maxN: MAX_N }
