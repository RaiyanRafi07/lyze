/**
 * largest-rectangle-in-histogram — portable standalone practice builder (batch13).
 *
 * Produces exactly 3 deterministic variants for slug `largest-rectangle-in-histogram`
 * (Largest Rectangle in Histogram, Hard, largestRectangleArea(int[])->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by oracleBrute
 * below (O(n^2) over all spans) and cross-checked by oracleDivide
 * (divide-and-conquer minimum split) — both INDEPENDENT implementations of the
 * same operation (not the walkthrough's monotonic-stack frame emitter).
 *
 * Staged source: .workers/jobs/neetcode150-completion/largest-rectangle-in-histogram/practice.largest-rectangle-in-histogram.mjs
 * (statements, hints, rows, oracles); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against both oracles at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (exact integer match for this slug).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (integer answers; exact match).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'largest-rectangle-in-histogram'
export const SIGNATURE = Object.freeze({
  name: 'largestRectangleArea',
  params: Object.freeze([{ name: 'heights', type: 'int[]' }]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Hard'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same question with adversarial placements that punish greedy shortcuts.'

/** INDEPENDENT reference oracle A: brute force over all spans (O(n^2)). */
export function oracleBrute(heights) {
  let best = 0
  for (let l = 0; l < heights.length; l += 1) {
    let floor = Infinity
    for (let r = l; r < heights.length; r += 1) {
      if (heights[r] < floor) floor = heights[r]
      const area = floor * (r - l + 1)
      if (area > best) best = area
    }
  }
  return best
}

/**
 * INDEPENDENT reference oracle B: divide-and-conquer minimum split (O(n log n) avg).
 * DISTINCT code path from both the walkthrough sweep and oracle A; every forge
 * expected value must satisfy both oracles before a variant is built.
 */
export function oracleDivide(heights, lo = 0, hi = heights.length - 1) {
  if (lo > hi) return 0
  let m = lo
  for (let i = lo + 1; i <= hi; i += 1) if (heights[i] < heights[m]) m = i
  const through = heights[m] * (hi - lo + 1)
  return Math.max(through, oracleDivide(heights, lo, m - 1), oracleDivide(heights, m + 1, hi))
}

const lit = (v) => JSON.stringify(v)

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  }
}

function inputLine(signature, args) {
  return signature.params
    .map((param, index) => `${(param && param.name) || 'arg' + index} = ${args[index]}`)
    .join(', ')
}

function toTest(heights) {
  const expected = lit(oracleBrute(heights))
  if (lit(oracleDivide(heights)) !== expected) throw new Error('oracles disagree on ' + lit(heights))
  return { args: [lit(heights)], expected }
}

function buildVariant({ id, seedLabel, intent, title, statement, heightList, hints }) {
  const tests = heightList
    .map((heights) => toTest(heights))
    .slice(0, 5)
    .map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
  const first = tests[0]
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title,
    statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(SIGNATURE, first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: hints.slice(0, 2),
  }
}

/* ---------------- entry point ---------------- */

export function buildLargestRectanglePractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh values',
      intent: INTENT_SAME,
      title: 'Largest Rectangle in Histogram — Fresh Values (histogram drill)',
      statement:
        'Given an array heights where each entry is a bar of width 1, return the area of the largest rectangle in the histogram. These fresh inputs use heights between 1 and 7 with lengths 4 to 7. The widest span is not always the tallest bar.',
      heightList: [
        [6, 2, 5, 4, 5, 1, 6],
        [3, 6, 5, 7, 4, 2],
        [1, 3, 2, 1, 2],
        [4, 2, 0, 3, 2, 5],
      ],
      hints: [
        'Sweep left to right keeping rising-bar indices; a lower bar closes every taller bar before it.',
        'When bar h pops at position i, its left edge is empty ? 0 : new-top + 1 and its area is h * (i - left).',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Largest Rectangle in Histogram — Edge Cases (histogram drill)',
      statement:
        'Same histogram task with the boundary inputs. A bar may have height 0, the input may hold a single bar, all bars may be equal, and zeros may cover the whole input. Return the largest rectangle area, which is 0 when no positive bar exists.',
      heightList: [
        [0],
        [2, 2, 2, 2],
        [0, 0, 0],
        [2, 4],
      ],
      hints: [
        'A single bar answers with its own height, and a zero bar contributes no positive area.',
        'Equal bars must not pop each other, so the whole run measures as one wide rectangle.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial shapes',
      intent: INTENT_ADVERSARIAL,
      title: 'Largest Rectangle in Histogram — Adversarial Shapes (histogram drill)',
      statement:
        'Same histogram question with adversarial placements that punish greedy shortcuts. Strictly rising inputs hide the answer until the sentinel flush, strictly falling inputs pop at every step, valleys split the histogram, and zeros cut spans in two. No rule change: return the largest rectangle area.',
      heightList: [
        [1, 2, 3, 4, 5],
        [5, 4, 3, 2, 1],
        [2, 1, 2],
        [2, 0, 2],
      ],
      hints: [
        'Trace the sentinel step i == n with cur 0: rising inputs only pay out during that final flush.',
        'A zero bar ends every open span, so areas left and right of it never join into one rectangle.',
      ],
    }),
  ]
}

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oracleBrute (O(n^2) over all spans) cross-checked by oracleDivide (divide-and-conquer minimum split; stack sweep used only in walkthrough)',
})
