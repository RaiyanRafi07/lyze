/**
 * merge-triplets-to-form-target-triplet — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `merge-triplets-to-form-target-triplet`
 * (Merge Triplets to Form Target Triplet, Medium, mergeTriplets(int[][],int[])->boolean, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs (curated fresh/edge/adversarial sets resolved to literals); the first
 * test of each set is a verbatim same-task case. Every expected value is computed
 * at build time by mergeTripletsOracleExhaustive below (subset-max enumeration:
 * some non-empty subset's elementwise max equals target — a direct model of the
 * merge operation and a DIFFERENT algorithm from the walkthrough's O(n)
 * greedy cover scan), and cross-checked against mergeTripletsOracleGreedy,
 * so a bad literal can never ship as "verified".
 *
 * Staged source: .workers/jobs/question-owners-150/merge-triplets-to-form-target-triplet/practice.mjs
 * (signature, oracles, curated sets); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw literal strings; `expected` is the literal the judge compares
 *   against (mode 'exact': the strings "true"/"false").
 * - `examples` is exactly [{ input, output, explain: '' }] derived from tests[0].
 * - `mode` is 'exact'. `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'merge-triplets-to-form-target-triplet'
export const SIGNATURE = Object.freeze({
  name: 'mergeTriplets',
  params: Object.freeze([
    { name: 'triplets', type: 'int[][]' },
    { name: 'target', type: 'int[]' },
  ]),
  return: 'boolean',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same task with the boundary inputs the original hides.'
export const INTENT_ADVERSARIAL = 'Same task with adversarial placements that punish skipping the overshoot filter.'

/**
 * INDEPENDENT oracle: subset-max exhaustive search. Enumerates every non-empty
 * subset, takes the elementwise max, and returns true iff some subset max
 * equals target. Direct model of the merge operation; exponential, so
 * practice-size inputs only. Different method from the walkthrough's greedy
 * single-pass cover scan with early exit.
 */
export function mergeTripletsOracleExhaustive(triplets, target) {
  const n = triplets.length
  for (let mask = 1; mask < (1 << n); mask++) {
    const m = [0, 0, 0]
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        for (let k = 0; k < 3; k++) {
          if (triplets[i][k] > m[k]) m[k] = triplets[i][k]
        }
      }
    }
    if (m[0] === target[0] && m[1] === target[1] && m[2] === target[2]) return true
  }
  return false
}

/** Cross-check reference: the O(n) greedy cover rule used by the walkthrough. */
export function mergeTripletsOracleGreedy(triplets, target) {
  const found = [false, false, false]
  for (const t of triplets) {
    if (t[0] > target[0] || t[1] > target[1] || t[2] > target[2]) continue
    for (let k = 0; k < 3; k++) if (t[k] === target[k]) found[k] = true
  }
  return found[0] && found[1] && found[2]
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

function buildVariant({ id, seedLabel, intent, title, statement, pairs, hints }) {
  const tests = pairs
    .map(([triplets, target]) => {
      const greedy = mergeTripletsOracleGreedy(triplets, target)
      const exhaustive = mergeTripletsOracleExhaustive(triplets, target)
      if (greedy !== exhaustive) {
        throw new Error('merge-triplets practice oracle disagreement on ' + lit(triplets) + ' vs ' + lit(target))
      }
      return { args: [lit(triplets), lit(target)], expected: String(exhaustive) }
    })
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

export function buildMergeTripletsVariants() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh values',
      intent: INTENT_SAME,
      title: 'Merge Triplets to Form Target Triplet — fresh values (same task)',
      statement:
        'A triplet is an array of three integers. You may repeatedly replace a triplet by the elementwise max of any two triplets. Given triplets and target [x,y,z], return true if target can appear as an element of triplets, otherwise false. Rows with any value above target can never be used.',
      pairs: [
        [[[4, 1, 5], [2, 4, 5], [4, 4, 4]], [4, 4, 5]],
        [[[1, 1, 1], [2, 2, 2], [3, 3, 3]], [3, 3, 3]],
        [[[5, 1, 1], [1, 5, 1], [1, 1, 5]], [5, 5, 5]],
        [[[5, 1, 1], [1, 5, 1], [1, 1, 4]], [5, 5, 5]],
      ],
      hints: [
        'Discard any triplet with a value above target before looking for matches.',
        'Each target slot needs its own usable row that equals target at that slot.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Merge Triplets to Form Target Triplet — edge cases (same task)',
      statement:
        'Same merge rule and signature. Boundary inputs: a single triplet, an overshooting row that must be ignored while a good row still covers, and a target slot that no row ever matches.',
      pairs: [
        [[[7, 7, 7]], [7, 7, 7]],
        [[[7, 7, 7]], [7, 7, 6]],
        [[[3, 2, 5], [3, 2, 9]], [3, 2, 5]],
        [[[1, 2, 3]], [3, 2, 3]],
      ],
      hints: [
        'A single overshooting value disqualifies its whole row, even if other slots match.',
        'An overshooting row never poisons the other rows; it is simply skipped.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial shapes, same task',
      intent: INTENT_ADVERSARIAL,
      title: 'Merge Triplets to Form Target Triplet — adversarial shapes (same task, no rule change)',
      statement:
        'Same merge rule, same signature, same boolean output — no rule change. These placements punish checking each slot independently while forgetting the overshoot filter, plus max-boundary rows at 1000.',
      pairs: [
        [[[2, 8, 5], [3, 7, 5]], [2, 7, 5]],
        [[[5, 5, 1], [5, 1, 5], [1, 5, 5]], [5, 5, 5]],
        [[[1000, 1, 1], [1, 1000, 1], [1, 1, 1000]], [1000, 1000, 1000]],
        [[[1000, 1000, 1000], [1, 1, 1]], [999, 999, 999]],
      ],
      hints: [
        'A row that matches one slot but exceeds another contributes nothing — recheck the filter first.',
        'Boundary 1000 still follows the same rule: equal is usable, strictly greater is discarded.',
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
  oracle: 'mergeTripletsOracleExhaustive (subset-max enumeration; walkthrough uses greedy O(n) cover scan)',
})
