/**
 * partition-labels — portable standalone practice builder (batch13).
 *
 * Produces exactly 3 deterministic variants for slug `partition-labels`
 * (Partition Labels, Medium, partitionLabels(string)->int[], mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * oraclePartition below (merge intervals per letter, no single-pass greedy),
 * an INDEPENDENT implementation of the same operation (not the walkthrough's
 * last[] + scan/cut frame emitter), so adapter/oracle bugs cannot silently agree.
 *
 * Staged source: .workers/jobs/question-owners-150/partition-labels/practice-partition-labels.js
 * (statements, hints, rows, oracle); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (exact integer-array match for this slug).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (integer-array answers; exact match).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'partition-labels'
export const SIGNATURE = Object.freeze({
  name: 'partitionLabels',
  params: Object.freeze([{ name: 's', type: 'string' }]),
  return: 'int[]',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different letters so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the boundary inputs the original examples hide.'
export const INTENT_ADVERSARIAL = 'Same task, harder shapes so the greedy edge rule is stressed.'

/**
 * INDEPENDENT reference oracle: merge-intervals over per-letter [first,last].
 * One interval per letter, sorted by start, merged on overlap; each merged block
 * is one partition. Never uses the walkthrough's single-pass last[] scan, so
 * agreement with the walkthrough adapter is genuine cross-check evidence.
 */
export function oraclePartition(s) {
  if (typeof s !== 'string' || s.length === 0) return []
  const first = new Map()
  const last = new Map()
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (!first.has(ch)) first.set(ch, i)
    last.set(ch, i)
  }
  const intervals = [...first.keys()].map((ch) => [first.get(ch), last.get(ch)])
  intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const sizes = []
  let curS = intervals[0][0]
  let curE = intervals[0][1]
  for (let k = 1; k < intervals.length; k++) {
    const [a, b] = intervals[k]
    if (a > curE) {
      sizes.push(curE - curS + 1)
      curS = a
      curE = b
    } else if (b > curE) {
      curE = b
    }
  }
  sizes.push(curE - curS + 1)
  return sizes
}

const litS = (s) => JSON.stringify(s)

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

function makeVariant({ id, seedLabel, intent, title, statement, rows, hints }) {
  const tests = rows
    .map(([s]) => ({ args: [litS(s)], expected: JSON.stringify(oraclePartition(s)) }))
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

export function buildPartitionLabelsPractice() {
  return [
    makeVariant({
      id: 'v1',
      seedLabel: 'fresh strings',
      intent: INTENT_SAME,
      title: 'Partition Labels — fresh strings (same-task drill)',
      statement:
        'You are given a string s. Split it into as many parts as possible so each letter appears in at most one part, and return the part sizes. These fresh inputs use new letter mixes with 4 to 12 characters; the signature and exact-match judge mode are unchanged.',
      rows: [
        ['abaccbdeffed'],
        ['qiejxqfnq'],
        ['abcd'],
        ['aaaa'],
      ],
      hints: [
        'Track the last occurrence of each letter; stretch the current part to cover it.',
        'Close the part the moment the scan index reaches the stretched edge.',
      ],
    }),
    makeVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Partition Labels — edge cases (same-task drill)',
      statement:
        'Same partition task with the boundary inputs. A single character is one part; all-distinct letters split into singletons; one repeated letter forces a single part. The signature and exact-match judge mode are unchanged.',
      rows: [
        ['a'],
        ['ab'],
        ['aa'],
        ['eccbbbbdec'],
        ['abcdefg'],
      ],
      hints: [
        'With no repeats every character is its own part: sizes are all 1.',
        'A letter seen twice forces everything between its copies into one part.',
      ],
    }),
    makeVariant({
      id: 'v3',
      seedLabel: 'adversarial shapes',
      intent: INTENT_ADVERSARIAL,
      title: 'Partition Labels — adversarial shapes (same task, no rule change)',
      statement:
        'SAME TASK, no rule change: split s into the most parts with each letter in at most one part. These shapes punish shortcuts — chained overlaps that merge into one part, a bridge letter that fuses two halves, and a late repeat that reopens a part. The signature and exact-match judge mode are unchanged.',
      rows: [
        ['abacbc'],
        ['abccab'],
        ['abcadef'],
        ['zzxyzz'],
      ],
      hints: [
        'Cutting at the first repeat is the classic bug: always cover the LAST occurrence.',
        'One bridge letter shared by two halves fuses them into a single part.',
      ],
    }),
  ]
}

// Staged-compat alias: same builder, family-style name.
export const buildPracticeVariants = buildPartitionLabelsPractice

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oraclePartition (merge per-letter [first,last] intervals; walkthrough uses single-pass last[] scan)',
})

export default buildPartitionLabelsPractice
