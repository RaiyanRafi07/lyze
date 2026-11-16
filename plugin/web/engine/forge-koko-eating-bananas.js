/**
 * koko-eating-bananas — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `koko-eating-bananas`
 * (Koko Eating Bananas, Medium, minEatingSpeed(int[],int)->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * oracleKoko below (linear scan k = 1..max, first feasible wins), an INDEPENDENT
 * implementation of the same operation (not the walkthrough's binary search).
 *
 * Staged source: .workers/jobs/neetcode150-completion/koko-eating-bananas/practice.js
 * (statements, hints, oracle); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (exact integer match for this slug).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'koko-eating-bananas'
export const SIGNATURE = Object.freeze({
  name: 'minEatingSpeed',
  params: Object.freeze([{ name: 'piles', type: 'int[]' }, { name: 'h', type: 'int' }]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same question with adversarial placements that punish greedy shortcuts.'

/** INDEPENDENT reference oracle: brute-force increasing k with early break (no lo/hi/mid). */
export function oracleKoko(piles, h) {
  let hi = 0
  for (const p of piles) hi = Math.max(hi, p)
  for (let k = 1; k <= hi; k++) {
    let t = 0
    for (const p of piles) {
      t += Math.ceil(p / k)
      if (t > h) break
    }
    if (t <= h) return k
  }
  return hi
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

function buildVariant({ id, seedLabel, intent, title, statement, rows, hints }) {
  const tests = rows
    .map(([piles, h]) => ({ args: [lit(piles), String(h)], expected: String(oracleKoko(piles, h)) }))
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

export function buildKokoPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh numbers',
      intent: INTENT_SAME,
      title: 'Koko Eating Bananas — fresh numbers (same task)',
      statement:
        'Koko must finish n piles within h hours eating k bananas per hour from one pile per hour (a pile with fewer than k takes the whole hour). Return the minimum integer k. Fresh small inputs: reproduce the probe-and-sum reasoning on new numbers.',
      rows: [
        [[5, 9, 13], 10],
        [[8, 4, 6, 2], 7],
        [[10, 10, 10, 10], 16],
        [[7, 7, 7], 9],
      ],
      hints: [
        'Probe a speed k, then score it exactly: hours = sum of ceil(pile / k) over every pile.',
        'hours(k) never grows when k grows — keep the feasible half, discard the other.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Koko Eating Bananas — edge cases (same task)',
      statement:
        'Same minimum-speed task on the boundary inputs: a single pile, h equal to the pile count (answer forced to max), k = 1 already feasible, and the 1e9 constraint extreme. Return the minimum integer k.',
      rows: [
        [[1], 1],
        [[1000000000], 1000000000],
        [[30, 11, 23, 4, 20], 5],
        [[2, 2, 2, 2], 8],
        [[9], 10],
      ],
      hints: [
        'When h equals the pile count, every pile must finish in exactly 1 hour, so k must be max(piles).',
        'A lone small pile with generous h finishes at k = 1 — check the bottom of the domain, not just the top.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial shapes',
      intent: INTENT_ADVERSARIAL,
      title: 'Koko Eating Bananas — adversarial shapes (same task, no rule change)',
      statement:
        'SAME QUESTION, no rule change: return the minimum integer k finishing all piles within h hours. Adversarial shapes: the answer sits exactly on a pile value (off-by-one trap), one giant pile hides among unit piles (overflow trap for 32-bit p+mid-1 and hours), and h == n forces max despite tiny companions.',
      rows: [
        [[30, 11, 23, 4, 20], 6],
        [[1, 1, 1, 999999999], 10],
        [[4, 4, 4, 4, 4], 5],
        [[100, 1, 1, 1, 1, 1], 6],
      ],
      hints: [
        'At h = 6 the answer 23 equals a pile value: trace whether the feasible branch keeps mid itself (hi = mid - 1 with ans = mid).',
        'With piles up to 1e9, accumulate hours in 64-bit and compute ceil as (p + mid - 1) / mid in 64-bit.',
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
  oracle: 'oracleKoko (linear scan k = 1..max with early break; walkthrough uses binary search on the monotone predicate)',
})
