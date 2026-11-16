/**
 * Staged forge-compatible variant builder — longest-common-subsequence.
 *
 * Status: the live forge (plugin/web/engine/variants.js) has NO dp-2d builder
 * and this slug is absent from ELIGIBLE_PROBLEMS, so live
 * buildVariants(record) returns [] today. This file supplies the missing
 * builder in the exact forge shape (same seeding, same helpers, same
 * buildVariant envelope), so integration is registry wiring only:
 *   1. place this file's content as plugin/web/engine/forge-longest-common-subsequence.js
 *   2. register it in BUILDERS under 'dp-2d' and add the slug to ELIGIBLE_PROBLEMS
 *      (exact snippet lives in lesson.longest-common-subsequence.js FORGE_WIRING
 *      and in integration.json).
 *
 * Pure ESM: no DOM, no network, no dependencies. Never throws on bad input
 * (returns [] like every other forge builder). All expected values are
 * produced by the oracles in this file, run on the generated inputs.
 *
 * Signature preserved: longestCommonSubsequence(string, string) -> int,
 * mode 'exact'. String args are JSON-quoted literals ('"abcde"'), expected
 * outputs are bare integer literals ('3'), exactly as the judge compares.
 */
const SLUG = 'longest-common-subsequence'

/* ---------------- seeding (identical to live forge) ---------------- */
function hashText(text) {
  const source = String(text)
  let hash = 2166136261 >>> 0
  for (let i = 0; i < source.length; i += 1) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619) >>> 0
  return hash
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

function randInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1))
}

function randomString(rng, length, alphabet) {
  let out = ''
  for (let i = 0; i < length; i += 1) out += alphabet[randInt(rng, 0, alphabet.length - 1)]
  return out
}

/* ---------------- literals (identical to live forge) ---------------- */
function numLiteral(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(6)))
}

function outLiteral(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return numLiteral(value)
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return '[' + value.map(outLiteral).join(',') + ']'
  return String(value)
}

function argLiteral(value) {
  if (typeof value === 'string') return JSON.stringify(value)
  return outLiteral(value)
}

function inputLine(signature, args) {
  return signature.params
    .map((param, index) => `${(param && param.name) || 'arg' + index} = ${args[index]}`)
    .join(', ')
}

/* ---------------- signature helpers (identical to live forge) ---------------- */
function isShape(signature, paramTypes, returnType) {
  if (!signature || !Array.isArray(signature.params)) return false
  if (signature.params.length !== paramTypes.length) return false
  for (let i = 0; i < paramTypes.length; i += 1) {
    const param = signature.params[i]
    if (!param || param.type !== paramTypes[i]) return false
  }
  return signature.return === returnType
}

function cloneSignature(signature) {
  const params = signature.params.map((param) => ({ name: param.name, type: param.type }))
  return { name: signature.name, params, return: signature.return }
}

function buildVariant(spec) {
  const tests = spec.tests.slice(0, 5).map((test) => ({ args: test.args.map(String), expected: String(test.expected) }))
  const first = tests[0]
  return {
    id: spec.id, seedLabel: spec.seedLabel, intent: spec.intent, difficulty: spec.difficulty,
    title: spec.title, statement: spec.statement, signature: cloneSignature(spec.signature),
    examples: [{ input: inputLine(spec.signature, first.args), output: first.expected, explain: '' }],
    tests, mode: spec.mode || 'exact', hints: spec.hints.slice(0, 2),
  }
}

function variantFactory(problem, signature, taskLabel) {
  const raw = String((problem && (problem.title || problem.slug)) || 'Problem')
  const base = raw.length > 46 ? raw.slice(0, 46).trim() + '…' : raw.trim()
  const difficulty = problem && (problem.difficulty === 'Easy' || problem.difficulty === 'Hard') ? problem.difficulty : 'Medium'
  return function make(id, suffix, seedLabel, intent, statement, tests, mode, hints) {
    return buildVariant({
      id, seedLabel, intent, difficulty, title: base + ' — ' + suffix + ' (' + taskLabel + ')',
      statement, signature, tests, mode, hints,
    })
  }
}

const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
const INTENT_TWIST = 'Same signature, different question: the twist tests whether the idea transfers.'

/* ---------------- oracles ----------------
 * oracleLcsMemo: top-down memoized recursion over shrinking prefixes.
 * Deliberately different control flow from the walkthrough adapter's
 * bottom-up nested fill loops (and from the selfcheck's inline table),
 * so agreement is genuine independence, not shared code.
 * oracleSubstring: longest common SUBSTRING (contiguous block) via the
 * diagonal-run DP. Used ONLY for the v3 twist, whose statement discloses
 * the changed rule. Never mixed into v1/v2 expectations.
 */
export function oracleLcsMemo(text1, text2) {
  const memo = new Map()
  function rec(i, j) {
    if (i === 0 || j === 0) return 0
    const key = i + ',' + j
    if (memo.has(key)) return memo.get(key)
    let ans
    if (text1[i - 1] === text2[j - 1]) ans = rec(i - 1, j - 1) + 1
    else ans = Math.max(rec(i - 1, j), rec(i, j - 1))
    memo.set(key, ans)
    return ans
  }
  return rec(text1.length, text2.length)
}

export function oracleSubstring(text1, text2) {
  const m = text1.length
  const n = text2.length
  let best = 0
  let prev = new Array(n + 1).fill(0)
  for (let i = 1; i <= m; i += 1) {
    const cur = new Array(n + 1).fill(0)
    for (let j = 1; j <= n; j += 1) {
      if (text1[i - 1] === text2[j - 1]) {
        cur[j] = prev[j - 1] + 1
        if (cur[j] > best) best = cur[j]
      }
    }
    prev = cur
  }
  return best
}

function toTestLcs(a, b) {
  return { args: [argLiteral(a), argLiteral(b)], expected: outLiteral(oracleLcsMemo(a, b)) }
}

function toTestSubstring(a, b) {
  return { args: [argLiteral(a), argLiteral(b)], expected: outLiteral(oracleSubstring(a, b)) }
}

/* ---------------- builder ---------------- */
export function buildLcsVariants(problem, signature, rng) {
  if (!problem || problem.slug !== SLUG) return null
  if (!isShape(signature, ['string', 'string'], 'int')) return null
  const make = variantFactory(problem, signature, 'prefix-table drill')

  // v1: fresh same-task inputs, seeded; every string fits the staged/live
  // walkthrough visual bound (<= 12 chars) so drills stay visualizable.
  const v1 = []
  for (let k = 0; k < 4; k += 1) {
    const a = randomString(rng, randInt(rng, 4, 8), 'abcd')
    const b = randomString(rng, randInt(rng, 4, 8), 'abcd')
    v1.push(toTestLcs(a, b))
  }

  // v2: boundary inputs, incl. the two official disjoint/identical shapes.
  // (Official inputs are judge-derived facts, reproduced — not manufactured.)
  const v2 = [
    ['a', 'b'],
    ['a', 'a'],
    ['abc', 'abc'],
    ['abc', 'def'],
  ].map(([a, b]) => toTestLcs(a, b))

  // v3: explicit same-signature twist with a disclosed RULE CHANGE —
  // longest common SUBSTRING (contiguous block) instead of subsequence.
  // Same method name and parameter types; expectations come from the
  // substring oracle, never from the LCS oracle.
  const v3 = [
    ['abcde', 'ace'],
    ['abc', 'abc'],
    ['aaaa', 'aa'],
    ['abcxyz', 'xyzabc'],
  ].map(([a, b]) => toTestSubstring(a, b))

  return [
    make('v1', 'fresh strings', 'fresh strings', INTENT_SAME,
      'Given two strings text1 and text2 of lowercase English letters, return the length of their longest common subsequence (order kept, gaps allowed; empty subsequence allowed). These fresh inputs use a tiny alphabet abcd with lengths 4 to 8. The method name, parameter types and exact-match judge mode are unchanged.',
      v1, 'exact',
      ['Compare the last characters: equal ends extend the diagonal by 1, different ends take the better of the two shortened prefixes.', 'Fill dp[i][j] over all prefix pairs, or recurse with memoization on (i, j).']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same longest-common-subsequence task with the boundary inputs. Given text1 and text2, return the LCS length, or 0 when nothing is shared. Inputs include single characters (equal and different), identical strings, and disjoint alphabets. The signature and exact comparison are unchanged.',
      v2, 'exact',
      ['A single shared character extends the empty diagonal by exactly 1.', 'With disjoint alphabets every cell carries max(up, left) over zeros, so the corner stays 0.']),
    make('v3', 'twist: contiguous block', 'twist, same signature', INTENT_TWIST,
      'RULE CHANGE: return the length of the longest common SUBSTRING — a contiguous block appearing in both strings — instead of the longest common subsequence. Gaps are no longer allowed: "ace" is a subsequence of "abcde" but only single characters "a", "c", "e" are common substrings, so ("abcde", "ace") gives 1. The method name and parameter types are unchanged; only the contiguity rule is new.',
      v3, 'exact',
      ['A match extends only the immediately preceding diagonal run; a mismatch resets the run to 0 instead of carrying a maximum.', 'Track the best run seen anywhere — the answer need not end at the last characters.']),
  ]
}

/** Forge-compatible entry point: exactly three variants, or [] when unsupported. */
export function buildVariantsForRecord(problem) {
  try {
    if (!problem || typeof problem !== 'object' || problem.slug !== SLUG) return []
    const judge = problem.judge
    const raw = judge && judge.signature
    if (!raw || typeof raw.name !== 'string' || raw.name.trim() === '') return []
    if (!Array.isArray(raw.params) || raw.params.length !== 2) return []
    const signature = {
      name: raw.name.trim(),
      params: raw.params.map((p, i) => ({ name: String((p && p.name) || 'arg' + i), type: String((p && p.type) || '').trim() })),
      return: String(raw.return || '').trim(),
    }
    const rng = mulberry32(hashText(SLUG))
    const variants = buildLcsVariants(problem, signature, rng)
    return Array.isArray(variants) && variants.length === 3 ? variants : []
  } catch {
    return []
  }
}

export const VARIANT_SLUG = SLUG
