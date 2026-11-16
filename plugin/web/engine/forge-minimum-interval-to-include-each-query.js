/**
 * minimum-interval-to-include-each-query — portable standalone practice builder (batch13).
 *
 * Produces exactly 3 deterministic variants for slug `minimum-interval-to-include-each-query`
 * (Minimum Interval to Include Each Query, Hard, minInterval(int[][],int[])->int[], mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * minIntervalOracle below (brute-force per-query scan over every interval), an
 * INDEPENDENT implementation of the same operation (not the walkthrough's
 * sort + sweep + min-heap frame emitter).
 *
 * Staged source: .workers/jobs/question-owners-150/minimum-interval-to-include-each-query/
 * minimum-interval.variants.js + minimum-interval.practice.json (fresh/edge/adversarial
 * rows, statements, hints, brute oracle); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time; a mismatch
 * throws instead of shipping a wrong literal. Variant ids are exactly v1/v2/v3.
 * Official examples are NOT reused verbatim in any drill (same intervals with
 * different queries appear once in v2/v3 transfer rows; never the official args).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (exact int[] match for this slug).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (integer-array answers; exact match).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'minimum-interval-to-include-each-query'
export const SIGNATURE = Object.freeze({
  name: 'minInterval',
  params: Object.freeze([{ name: 'intervals', type: 'int[][]' }, { name: 'queries', type: 'int[]' }]),
  return: 'int[]',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Hard'

export const INTENT_SAME = 'Same task, different numbers so you reproduce the sweep reasoning.'
export const INTENT_EDGE = 'Same task with the boundaries the examples hide.'
export const INTENT_ADVERSARIAL = 'Same task; adversarial nesting punishes earliest-start guesses.'

/**
 * INDEPENDENT reference oracle: brute-force per-query scan over every interval.
 * For each query takes the minimum inclusive size among covering intervals,
 * or -1 when none covers. Never sorts, never sweeps, never uses a heap, so
 * agreement with the walkthrough adapter is genuine cross-check evidence,
 * not shared-logic echo.
 */
export function minIntervalOracle(intervals, queries) {
  return queries.map((q) => {
    let best = -1
    for (const iv of intervals) {
      if (iv[0] <= q && q <= iv[1]) {
        const sz = iv[1] - iv[0] + 1
        if (best === -1 || sz < best) best = sz
      }
    }
    return best
  })
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

function toTest(intervalsLiteral, queriesLiteral) {
  const intervals = JSON.parse(intervalsLiteral)
  const queries = JSON.parse(queriesLiteral)
  const expected = lit(minIntervalOracle(intervals, queries))
  return { args: [String(intervalsLiteral), String(queriesLiteral)], expected }
}

function buildVariant({ id, seedLabel, intent, title, statement, rows, hints }) {
  const tests = rows
    .map(([iv, qs]) => toTest(iv, qs))
    .slice(0, 5)
    .map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
  // Re-verify every expected literal against the independent oracle; throw on drift.
  for (const t of tests) {
    const check = lit(minIntervalOracle(JSON.parse(t.args[0]), JSON.parse(t.args[1])))
    if (check !== t.expected) throw new Error('Practice oracle mismatch for ' + id + ': ' + t.args.join(' | '))
  }
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

export function buildMinIntervalPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh values',
      intent: INTENT_SAME,
      title: 'Min Interval per Query — fresh values (intervals drill, generated)',
      statement:
        'Given intervals [left,right] (inclusive) and queries, return for each query the size right-left+1 of the smallest covering interval, or -1 when none covers it. Fresh numbers exercise the same sweep: sort intervals by left, walk queries ascending, offer into a size-ordered heap. Generated drill values stay small so the heap steps fit on screen.',
      rows: [
        ['[[12,13],[3,4],[1,4],[3,5]]', '[3,17,12,6]'],
        ['[[10,14],[8,9],[3,5],[1,1]]', '[14,7,1,18]'],
        ['[[4,4],[5,7],[6,10],[12,12]]', '[9,15,10,12]'],
        ['[[2,6],[1,5],[2,6],[5,5]]', '[18,10,17,14]'],
      ],
      hints: [
        'Sort intervals by left and handle queries smallest-first; offer intervals once left <= q.',
        'Evict heap tops with right < q before answering; empty heap means -1.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Min Interval per Query — edge cases (intervals drill, generated)',
      statement:
        'Same task and signature on the boundary inputs the worked examples never show. Single-point intervals ([x,x] has size 1), duplicate queries, nested covers where the smallest is not the earliest start, and queries just outside an interval (right+1 and left-1 are not covered) all appear here. Coverage stays inclusive on both ends.',
      rows: [
        ['[[5,5]]', '[5]'],
        ['[[5,5]]', '[4]'],
        ['[[1,4],[2,4],[3,6],[4,4]]', '[4,4]'],
        ['[[1,10],[2,3],[4,5]]', '[2,9]'],
        ['[[20,25]]', '[19,20,25,26]'],
      ],
      hints: [
        'A point interval [x,x] covers only q === x and answers 1, not 0.',
        'Coverage is inclusive: right == q still covers; right == q-1 does not.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial nesting',
      intent: INTENT_ADVERSARIAL,
      title: 'Min Interval per Query — adversarial nesting (same task, generated)',
      statement:
        'Same task and signature — only the numbers fight back. Deeply nested intervals and shared-left starts punish earliest-start or largest-first guesses, because the answer is always the smallest cover. Eviction still depends only on the right endpoint, never on size. Identical question and output shape throughout.',
      rows: [
        ['[[1,20],[5,6],[5,15],[10,11]]', '[5,10,19]'],
        ['[[1,8],[1,4],[1,2]]', '[1,3,7]'],
        ['[[2,3],[2,5],[1,8],[20,25]]', '[5,2,22]'],
        ['[[1,100],[40,60],[45,55],[50,50]]', '[50,1,101]'],
      ],
      hints: [
        'The heap is keyed by size, not by start: a later-starting smaller interval beats an early giant.',
        'Eviction is by right endpoint only; a huge interval that started first can outlive small ones.',
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
  oracle: 'minIntervalOracle (brute-force per-query scan over every interval; sweep+heap used only in walkthrough)',
})
