/**
 * find-median-from-data-stream — portable standalone practice builder (batch13).
 *
 * Produces exactly 3 deterministic variants for slug `find-median-from-data-stream`
 * (Find Median from Data Stream, Hard, MedianFinder design/class problem).
 * The live shard record keeps judge:null (a design sequence of addNum/findMedian
 * calls has no single-call signature), so this forge documents the same honest
 * TEST PROFILE the live walkthrough adapter uses
 * (precedents: mergeKLists(int[][])->int[], runTrieOps(string[],string[])->string):
 *
 *   MedianFinder(ops: string) -> float
 *
 * args[0] is the op-tape literal, a JSON array of {op:"add",num} / {op:"find"}
 * steps (at most 12 ops per walkthrough bound; judge allows 50000 calls); the
 * expected value is the LAST findMedian result as a float literal, compared
 * with float tolerance. Every expected value is computed at build time by
 * oracleMedianOps below (sort-a-copy median per find), an algorithm DISTINCT
 * from the walkthrough's two-heap (max-heap lo + min-heap hi with
 * stage/relay/rebalance) frame emitter, so agreement validates the walkthrough
 * rather than repeating it.
 *
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed tapes; every tape respects -1e5 <= num <= 1e5 and holds at least one
 * findMedian (the last op is always a find, so the expected value is defined).
 *
 * Staged source: .workers/jobs/question-owners-150/find-median-from-data-stream/
 * (adapter.js buildMedianScene/oracleMedian, practice.js seeded tapes and float
 * compare); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the documented TEST PROFILE (judge-null record: no official
 *   single-call signature exists to preserve), identical to the live adapter entry.
 * - `args` are raw literal strings; `expected` is the literal the judge compares
 *   with float tolerance.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from tests[0].
 * - `mode` is 'float'. `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'find-median-from-data-stream'
export const SIGNATURE = Object.freeze({
  name: 'MedianFinder',
  params: Object.freeze([{ name: 'ops', type: 'string' }]),
  return: 'float',
})
export const MODE = 'float'
export const DIFFICULTY = 'Hard'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same task on hostile magnitudes that punish skipping the relay or rebalance.'

/**
 * INDEPENDENT oracle: sort-a-copy median per find, never the two-heap run.
 * Takes an op tape [{op:'add',num}|{op:'find'}] and returns the findMedian
 * outputs in order. Each find sorts a copy of the values seen so far and
 * takes the middle (mean of the two middle values when even). The walkthrough
 * instead maintains a max-heap lower half plus a min-heap upper half with a
 * stage-through-lo / relay-max / rebalance protocol, so matching outputs
 * cross-validate rather than re-run one implementation.
 */
export function oracleMedianOps(ops) {
  const seen = []
  const out = []
  for (const o of ops) {
    if (!o || (o.op !== 'add' && o.op !== 'find')) throw new Error('oracle: each op is {op:"add",num} or {op:"find"}')
    if (o.op === 'add') {
      if (!Number.isSafeInteger(o.num) || o.num < -100000 || o.num > 100000) {
        throw new Error('oracle: addNum values respect -10^5 <= num <= 10^5')
      }
      seen.push(o.num)
    } else {
      if (seen.length === 0) throw new Error('oracle: findMedian needs at least one added element')
      const s = seen.slice().sort((a, b) => a - b)
      const n = s.length
      out.push(n % 2 === 1 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2)
    }
  }
  return out
}

export function floatEqual(a, b, tol = 1e-9) {
  return Math.abs(Number(a) - Number(b)) <= tol
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

function lastMedianOf(ops) {
  const finds = oracleMedianOps(ops)
  return finds[finds.length - 1]
}

function buildVariant({ id, seedLabel, intent, title, statement, tapes, hints }) {
  const tests = tapes
    .map((ops) => ({ args: [lit(ops)], expected: String(lastMedianOf(ops)) }))
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

export function buildMedianStreamVariants() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'official plus small',
      intent: INTENT_SAME,
      title: 'Median Stream — Official Plus Small (same task)',
      statement:
        'Run the MedianFinder op tape below: each addNum stages one value, each findMedian reads the median of all values so far. The expected value is the last findMedian result as a float. Tape one is the official example ending at 2.0; the rest are tiny streams that check the odd-count top path and the even-count mean path.',
      tapes: [
        [{ op: 'add', num: 1 }, { op: 'add', num: 2 }, { op: 'find' }, { op: 'add', num: 3 }, { op: 'find' }],
        [{ op: 'add', num: 5 }, { op: 'find' }],
        [{ op: 'add', num: 1 }, { op: 'add', num: 2 }, { op: 'find' }],
        [{ op: 'add', num: 3 }, { op: 'add', num: 1 }, { op: 'add', num: 2 }, { op: 'find' }],
      ],
      hints: [
        'Stage every addNum through the lo max-heap first, then move the lower maximum to hi.',
        'findMedian reads only the two tops: odd count returns the lo top, even count averages both.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'negatives and duplicates',
      intent: INTENT_EDGE,
      title: 'Median Stream — Negatives and Duplicates (same task)',
      statement:
        'Same MedianFinder tape rule with the edge the worked example hides: negatives, duplicates, and descending inputs. The relay move must still enforce that every lo value stays at or below every hi value. Each tape ends with a findMedian whose float result is the expected value.',
      tapes: [
        [{ op: 'add', num: 0 }, { op: 'add', num: -1 }, { op: 'find' }, { op: 'add', num: -1 }, { op: 'add', num: -5 }, { op: 'find' }, { op: 'add', num: -10 }, { op: 'add', num: 3 }, { op: 'find' }],
        [{ op: 'add', num: 7 }, { op: 'add', num: 7 }, { op: 'add', num: 7 }, { op: 'add', num: 7 }, { op: 'find' }],
        [{ op: 'add', num: 5 }, { op: 'add', num: 4 }, { op: 'add', num: 3 }, { op: 'add', num: 2 }, { op: 'add', num: 1 }, { op: 'find' }],
        [{ op: 'add', num: -100000 }, { op: 'add', num: 100000 }, { op: 'find' }],
      ],
      hints: [
        'Duplicates never break the split: equal values may land on either side without violating ordering.',
        'Descending inputs stress the relay on every add; trace max(lo) against min(hi) after each move.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'extreme alternating',
      intent: INTENT_ADVERSARIAL,
      title: 'Median Stream — Extreme Alternating (same task)',
      statement:
        'SAME TASK, harder shapes: constraint-scale magnitudes that alternate sides force a rebalance on nearly every add. A solution that skips the stage-through-lo step or the hi-too-big rebalance drifts off the true median. No rule change: the expected value is still the last findMedian float.',
      tapes: [
        [{ op: 'add', num: 100000 }, { op: 'add', num: -100000 }, { op: 'add', num: 100000 }, { op: 'add', num: -100000 }, { op: 'find' }],
        [{ op: 'add', num: 1 }, { op: 'add', num: 100000 }, { op: 'add', num: 2 }, { op: 'add', num: 99999 }, { op: 'add', num: 3 }, { op: 'find' }],
        [{ op: 'add', num: 0 }, { op: 'add', num: 0 }, { op: 'add', num: 0 }, { op: 'add', num: 1 }, { op: 'find' }],
        [{ op: 'add', num: -5 }, { op: 'add', num: 100000 }, { op: 'add', num: -99999 }, { op: 'add', num: 50000 }, { op: 'add', num: -50000 }, { op: 'find' }],
      ],
      hints: [
        'After each relay, rebalance exactly when hi outgrew lo so lo keeps any extra element.',
        'findMedian must not push, pop, or reorder: any mutation there corrupts the next add.',
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
  oracle: 'oracleMedianOps (sort-a-copy median per find; walkthrough runs the two-heap stage/relay/rebalance replay)',
})
