/**
 * target-sum — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `target-sum`
 * (Target Sum, Medium, findTargetSumWays(int[],int)->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Seeded RNG (mulberry32 over FNV-1a of the slug); every expected value is
 * computed at build time by oracleBrute below (enumerate all 2^n sign
 * assignments), an INDEPENDENT implementation of the same operation (not the
 * walkthrough's offset 2-D dp table emitter). The walkthrough fills dp[i][s]
 * over shifted sums; the oracle never builds that table and instead sums each
 * mask directly, cross-checked by oracleSubset (subset-sum reduction count).
 *
 * Staged source: .workers/jobs/neetcode150-completion/target-sum/target-sum.variants.mjs
 * (statements, hints, dual oracles) — reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time (and cross-checked
 * vs the subset reduction; builder throws on disagreement). All three sets are the
 * SAME task (no twist): identical signature, identical question — v3 is adversarial
 * same-task numbers only.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (mode 'exact').
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'target-sum'
export const SIGNATURE = Object.freeze({
  name: 'findTargetSumWays',
  params: Object.freeze([{ name: 'nums', type: 'int[]' }, { name: 'target', type: 'int' }]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'

/**
 * INDEPENDENT oracle: brute-force sign enumeration over all 2^n masks.
 * Shares no code with the offset DP table, so a table bug cannot hide.
 * Different method from the walkthrough (2-D shifted dp fill).
 */
export function oracleBrute(nums, target) {
  const n = nums.length
  let ways = 0
  const total = 1 << n
  for (let mask = 0; mask < total; mask++) {
    let s = 0
    for (let i = 0; i < n; i++) s += (mask & (1 << i)) ? nums[i] : -nums[i]
    if (s === target) ways++
  }
  return ways
}

/** Cross-check oracle: subset-sum reduction. Count subsets summing to P=(S+target)/2. */
export function oracleSubset(nums, target) {
  const S = nums.reduce((a, b) => a + b, 0)
  if (Math.abs(target) > S) return 0
  if ((S + target) % 2 !== 0) return 0
  const P = (S + target) / 2
  const dp = new Array(P + 1).fill(0)
  dp[0] = 1
  for (const v of nums) {
    if (v === 0) { for (let s = 0; s <= P; s++) dp[s] *= 2; continue }
    for (let s = P; s >= v; s--) dp[s] += dp[s - v]
  }
  return dp[P]
}

function hashText(text) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0
  return h
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1))

function argLiteral(v) {
  return Array.isArray(v) ? '[' + v.join(',') + ']' : String(v)
}

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  }
}

function inputLine(signature, args) {
  return signature.params.map((p, i) => `${(p && p.name) || 'arg' + i} = ${args[i]}`).join(', ')
}

function checkedTest(nums, target) {
  const a = oracleBrute(nums, target)
  const b = oracleSubset(nums, target)
  if (a !== b) throw new Error(`oracle disagreement on [${nums}] target ${target}: brute=${a} subset=${b}`)
  return { args: [argLiteral(nums), String(target)], expected: String(a) }
}

function buildVariant({ id, seedLabel, intent, title, statement, tests, hints }) {
  const capped = tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
  const first = capped[0]
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title,
    statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(SIGNATURE, first.args), output: first.expected, explain: '' }],
    tests: capped,
    mode: MODE,
    hints: hints.slice(0, 2),
  }
}

/* ---------------- entry point ---------------- */

export function buildTargetSumPractice() {
  const rng = mulberry32(hashText(SLUG))

  // v1: fresh small inputs, seeded. Targets are real signed sums (nonzero ways
  // guaranteed) except the last row, which samples a random target (may be 0).
  const v1rows = []
  let guard = 0
  while (v1rows.length < 4 && guard++ < 200) {
    const n = randInt(rng, 3, 5)
    const nums = Array.from({ length: n }, () => randInt(rng, 1, 3))
    const S = nums.reduce((a, b) => a + b, 0)
    let target
    if (v1rows.length < 3) {
      target = 0
      for (let i = 0; i < n; i++) target += (rng() < 0.5 ? -nums[i] : nums[i])
    } else {
      target = randInt(rng, -Math.min(3, S), Math.min(3, S))
    }
    const key = nums.join(',') + '|' + target
    if (v1rows.some((r) => r.key === key)) continue
    v1rows.push({ key, test: checkedTest(nums, target) })
  }
  if (v1rows.length < 4) throw new Error('seeded v1 generation failed')
  const v1 = v1rows.map((r) => r.test)

  // v2: hidden edges — zeros doubling, single element, unreachable target, negative target.
  const v2 = [
    checkedTest([0], 0),
    checkedTest([0, 0], 0),
    checkedTest([1], 2),
    checkedTest([1, 2, 1], -4),
  ]

  // v3: SAME-TASK adversarial shapes (no rule change): zero-heavy, parity trap,
  // all-ones target 0, decoy large value. Honest same-task label.
  const v3 = [
    checkedTest([0, 1, 0], 1),
    checkedTest([1, 1, 1, 1], 0),
    checkedTest([2, 2, 2], 2),
    checkedTest([1, 2, 3], 7),
  ]

  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh numbers',
      intent: INTENT_SAME,
      title: 'Target Sum — fresh numbers (sign-assignment drill)',
      statement:
        'You are given an integer array nums and an integer target. Build an expression by putting + or - before each element of nums and concatenating them. Return how many expressions evaluate to target. These fresh inputs hold 3 to 5 values 1..3 with small targets.',
      tests: v1,
      hints: [
        'Track ways per reachable sum after each prefix: dp adds the s-v and s+v predecessor counts.',
        'Shift sums by +total so negative columns stay legal; read out the target column at the end.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Target Sum — edge cases (sign-assignment drill)',
      statement:
        'Same sign-assignment task with the boundary inputs. Nums may hold zeros (each zero doubles every way), a single element, or a target outside [-total,total] whose answer is 0. The signature and exact-match judge mode are unchanged.',
      tests: v2,
      hints: [
        'A zero never changes the sum, so both signs survive: multiply the ways by 2.',
        'Check |target| > sum(nums) first: no assignment can reach it.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial shapes',
      intent: INTENT_SAME,
      title: 'Target Sum — adversarial shapes (sign-assignment drill)',
      statement:
        'Same sign-assignment question with adversarial shapes and no rule change. Zero-heavy rows punish forgetting the doubling rule, all-ones with target 0 punishes parity guessing, and above-total targets punish enumerating instead of bounding. The signature and exact comparison are unchanged.',
      tests: v3,
      hints: [
        'Count, do not guess parity: fill both predecessors even when one side looks empty.',
        'Zeros compose multiplicatively: two zeros quadruple the base count.',
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
  oracle: 'oracleBrute (2^n sign enumeration; walkthrough uses offset 2-D dp table)',
})
