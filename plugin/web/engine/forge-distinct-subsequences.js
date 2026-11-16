/**
 * distinct-subsequences — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `distinct-subsequences`
 * (Distinct Subsequences, Hard, numDistinct(string,string)->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed + seeded inputs (FNV-1a + mulberry32 from the slug); every expected
 * value is computed at build time by BOTH oracles below (bottom-up DP and
 * top-down skip-vs-take memo recursion — an INDEPENDENT algorithm that never
 * builds the walkthrough's fill-order table); any disagreement throws so a
 * bad literal can never ship as "verified".
 *
 * Staged source: .workers/jobs/question-owners-150/distinct-subsequences/practice.mjs
 * (statements, hints, dual oracles numDistinctDP / numDistinctBrute); reshaped
 * into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracles at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against ('3' / '5' / ...).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (single int count answers).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'distinct-subsequences'

export const SIGNATURE = Object.freeze({
  name: 'numDistinct',
  params: Object.freeze([{ name: 's', type: 'string' }, { name: 't', type: 'string' }]),
  return: 'int'
})

export const MODE = 'exact'
export const DIFFICULTY = 'Hard'

export const INTENT_SAME = 'Same pattern, different strings so you reproduce the counting reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial placements: the rule and output type are unchanged.'

/** Reference oracle: bottom-up DP over prefix pairs (the walkthrough direction). */
export function oracleDistinctDP(s, t) {
  const m = s.length
  const n = t.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = 1
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s[i - 1] === t[j - 1]) dp[i][j] = dp[i - 1][j] + dp[i - 1][j - 1]
      else dp[i][j] = dp[i - 1][j]
    }
  }
  return dp[m][n]
}

/**
 * INDEPENDENT oracle: top-down skip-vs-take recursion with memoization.
 * Tries every s position (skip s[i], or take it when it matches t[j]).
 * Deliberately different control flow from the bottom-up table fill, so
 * agreement is genuine independence, not shared code.
 */
export function oracleDistinctMemo(s, t) {
  const memo = new Map()
  function rec(i, j) {
    if (j === t.length) return 1
    if (i === s.length) return 0
    const k = i + ',' + j
    if (memo.has(k)) return memo.get(k)
    let ways = rec(i + 1, j)
    if (s[i] === t[j]) ways += rec(i + 1, j + 1)
    memo.set(k, ways)
    return ways
  }
  return rec(0, 0)
}

function hashText(text) {
  const s = String(text)
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0
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

function randomString(rng, len, alphabet) {
  let out = ''
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(rng() * alphabet.length)]
  return out
}

const argLiteral = (v) => JSON.stringify(v)
const outLiteral = (v) => (Number.isInteger(v) ? String(v) : String(v))

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return
  }
}

function inputLine(signature, args) {
  return signature.params
    .map((param, index) => `${(param && param.name) || 'arg' + index} = ${args[index]}`)
    .join(', ')
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
    hints: hints.slice(0, 2)
  }
}

function toTest(s, t) {
  const ref = oracleDistinctDP(s, t)
  const ind = oracleDistinctMemo(s, t)
  if (ref !== ind) throw new Error('distinct-subsequences practice oracle disagreement on s="' + s + '" t="' + t + '": dp=' + ref + ' memo=' + ind)
  return { args: [argLiteral(s), argLiteral(t)], expected: outLiteral(ref) }
}

/* ---------------- entry point ---------------- */

export function buildDistinctSubsequencesVariants() {
  const rng = mulberry32(hashText(SLUG))
  // v1: fresh strings over a tiny alphabet so matches actually occur (seeded).
  const seen = new Set()
  const v1pairs = []
  let guard = 0
  while (v1pairs.length < 4 && guard++ < 300) {
    const slen = randInt(rng, 3, 6)
    const tlen = randInt(rng, 1, 3)
    const s = randomString(rng, slen, 'abc')
    const t = randomString(rng, tlen, 'abc')
    const k = s + '|' + t
    if (seen.has(k)) continue
    seen.add(k)
    v1pairs.push([s, t])
  }
  // v2: hidden edges (fixed): single-char hit/miss, repeat combinatorics, t longer than s.
  const v2pairs = [['a', 'a'], ['a', 'b'], ['aaa', 'aa'], ['abc', 'abcd']]
  // v3: SAME-TASK adversarial repeat placements (honest label — no rule change):
  // uniform runs are binomial coefficients; interleavings punish greedy counting.
  const v3pairs = [['aaaa', 'aa'], ['aaaa', 'aaa'], ['ababa', 'aba'], ['aabbaa', 'aba']]
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh strings',
      intent: INTENT_SAME,
      title: 'Distinct Subsequences — fresh strings (counting drill)',
      statement:
        'Given strings s and t, return the number of distinct subsequences of s that equal t. A subsequence deletes characters without reordering them. These fresh inputs use strings of length 3 to 6 over the letters a, b, and c with t of length 1 to 3. The signature and exact-match judge mode are unchanged.',
      tests: v1pairs.map(([a, b]) => toTest(a, b)),
      hints: [
        'Let dp[i][j] count ways the first i chars of s form the first j chars of t.',
        'On a match add skipping s[i-1] to using it with the diagonal; on mismatch carry the skip.'
      ]
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Distinct Subsequences — edge cases (counting drill)',
      statement:
        'Same counting task with the boundary inputs. Given strings s and t, return the number of distinct subsequences of s equal to t. A single equal pair counts once, a mismatch counts zero, repeated letters multiply combinatorially, and a longer t than s always yields zero. The signature and exact comparison are unchanged.',
      tests: v2pairs.map(([a, b]) => toTest(a, b)),
      hints: [
        'Empty t has exactly one subsequence: delete everything in s.',
        'For "aaa" forming "aa" list index pairs: C(3,2) = 3, not 1.'
      ]
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial repeats',
      intent: INTENT_ADVERSARIAL,
      title: 'Distinct Subsequences — adversarial repeats (same task, no twist)',
      statement:
        'Same counting question with adversarial repeat placements that punish greedy or single-path reasoning. Given strings s and t, return the number of distinct subsequences of s equal to t. Duplicate-heavy inputs force every diagonal contribution to be counted; skipping one match or double-counting a position fails visibly. No rule change: the signature and exact comparison are unchanged.',
      tests: v3pairs.map(([a, b]) => toTest(a, b)),
      hints: [
        'Uniform runs are binomial coefficients: "aaaa" forming "aa" is C(4,2) = 6.',
        'For "ababa" forming "aba" trace which s positions supply the middle b before summing.'
      ]
    })
  ]
}

// Live-forge-compatible alias: (problem, signature, rng) => 3 variants, or [] when unsupported.
export function buildVariantsForRecord(problem) {
  try {
    if (!problem || typeof problem !== 'object' || problem.slug !== SLUG) return []
    return buildDistinctSubsequencesVariants()
  } catch {
    return []
  }
}

// Staged-compat alias: same builder, owner-package name.
export const buildPracticeVariants = buildDistinctSubsequencesVariants

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oracleDistinctMemo (top-down skip-vs-take memo recursion; frame emitter uses the bottom-up table)'
})

export default buildDistinctSubsequencesVariants
