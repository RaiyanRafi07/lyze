/**
 * interleaving-string — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `interleaving-string`
 * (Interleaving String, Medium, isInterleave(string,string,string)->boolean, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Seeded (FNV-1a + mulberry32 from the slug, default seed 97); every expected value
 * is computed at build time by oracleInterleaveDFS below (top-down memoized
 * recursion over (i, j)), an INDEPENDENT implementation of the same operation
 * (not the walkthrough's bottom-up iterative table frame emitter), so
 * adapter/oracle bugs cannot silently agree.
 *
 * Staged source: .workers/jobs/question-owners-150/interleaving-string/practice.mjs
 * (fresh/edge/adversarial-ambiguity drills, DFS oracle, seeded sampler); reshaped
 * into the forge variant contract (id/seedLabel/intent/difficulty/title/statement/
 * signature/examples/tests/mode/hints). All three sets are the SAME task
 * (no rule change, no output-type twist). Sets v2/v3 reuse the official shard
 * examples as worked pairs (judge-derived facts, honestly noted).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against ('true' / 'false').
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (boolean answers).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'interleaving-string'

export const SIGNATURE = Object.freeze({
  name: 'isInterleave',
  params: Object.freeze([
    { name: 's1', type: 'string' },
    { name: 's2', type: 'string' },
    { name: 's3', type: 'string' },
  ]),
  return: 'boolean',
})

export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same task, fresh strings so you reproduce the prefix-table reasoning.'
export const INTENT_EDGE = 'Same task with the edge cases the worked example hides.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial ambiguity: repeated chars punish greedy commits.'

/**
 * INDEPENDENT oracle: top-down memoized DFS over (i, j) consuming s3[i+j]
 * from s1[i] and/or s2[j]. Different control flow from the walkthrough's
 * bottom-up nested fill loops, so agreement is genuine independence.
 */
export function oracleInterleaveDFS(s1, s2, s3) {
  if (typeof s1 !== 'string' || typeof s2 !== 'string' || typeof s3 !== 'string') return false
  if (s1.length + s2.length !== s3.length) return false
  const memo = new Map()
  function dfs(i, j) {
    const key = i + ',' + j
    if (memo.has(key)) return memo.get(key)
    const k = i + j
    let res
    if (k === s3.length) {
      res = i === s1.length && j === s2.length
    } else {
      res = false
      if (i < s1.length && s1[i] === s3[k] && dfs(i + 1, j)) res = true
      if (!res && j < s2.length && s2[j] === s3[k] && dfs(i, j + 1)) res = true
    }
    memo.set(key, res)
    return res
  }
  return dfs(0, 0)
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

// Deterministic interleave sampler: merge a/b preserving order; corrupt flips
// one char so the result is a genuine false (verified by the oracle below).
function sampleInterleave(rng, alphabet, len1, len2, corrupt) {
  const pick = () => alphabet[Math.floor(rng() * alphabet.length)]
  let a = ''
  let b = ''
  for (let k = 0; k < len1; k++) a += pick()
  for (let k = 0; k < len2; k++) b += pick()
  let i = 0
  let j = 0
  let c = ''
  while (i < a.length || j < b.length) {
    if (i < a.length && (j >= b.length || rng() < 0.5)) c += a[i++]
    else c += b[j++]
  }
  if (corrupt && c.length > 0) {
    // Flip the last char to a different letter until the oracle says false.
    let guard = 0
    while (guard++ < 26) {
      let alt = 'z'
      for (const ch of String(alphabet)) {
        if (ch !== c[c.length - 1]) { alt = ch; break }
      }
      c = c.slice(0, -1) + alt
      if (!oracleInterleaveDFS(a, b, c)) break
    }
  }
  return [a, b, c]
}

const argLiteral = (v) => JSON.stringify(v)
const outLiteral = (v) => (typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v))

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

const toTest = (a, b, c) => ({ args: [argLiteral(a), argLiteral(b), argLiteral(c)], expected: outLiteral(oracleInterleaveDFS(a, b, c)) })

function checkOfficial(a, b, c, want) {
  const got = outLiteral(oracleInterleaveDFS(a, b, c))
  if (got !== want) throw new Error('interleaving-string oracle disagrees with official example: ' + JSON.stringify([a, b, c]))
  return { args: [argLiteral(a), argLiteral(b), argLiteral(c)], expected: got }
}

/* ---------------- entry point ---------------- */

export function buildInterleavingStringVariants(seed = 97) {
  const s = Number.isInteger(seed) ? seed : 97
  const rng = mulberry32(hashText(SLUG + ':' + s))

  // v1: fresh seeded strings over a tiny alphabet; alternate true/false.
  const v1triples = []
  for (let k = 0; k < 4; k++) {
    const [a, b, c] = sampleInterleave(rng, 'abc', randInt(rng, 2, 4), randInt(rng, 2, 4), k % 2 === 1)
    v1triples.push([a, b, c])
  }

  // v2: hidden edges (fixed): empties incl. official ("","") -> true,
  // single chars, and total-length mismatches (instant false).
  const v2triples = [
    ['', '', ''],
    ['a', '', 'a'],
    ['', 'abc', 'abc'],
    ['a', 'a', 'a'],
  ]

  // v3: SAME-TASK adversarial ambiguity (honest label — no rule change):
  // repeated chars where greedy side-commit fails. First two reuse the
  // official shard examples as the worked pair; rest are fixed fresh.
  const v3tests = [
    checkOfficial('aabcc', 'dbbca', 'aadbbcbcac', 'true'),
    checkOfficial('aabcc', 'dbbca', 'aadbbbaccc', 'false'),
    toTest('ab', 'ab', 'baba'),
    toTest('aa', 'aa', 'aaaa'),
  ]

  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh strings',
      intent: INTENT_SAME,
      title: 'Interleaving String — fresh strings (prefix-table drill)',
      statement:
        'Given strings s1, s2 and s3 of lowercase English letters, return true if s3 is formed by interleaving s1 and s2 (order inside each source preserved), else false. These fresh inputs use 2 to 4 letter strings over the tiny alphabet abc, alternating interleaves and near-misses. The method name, parameter types and exact-match judge mode are unchanged.',
      tests: v1triples.map(([a, b, c]) => toTest(a, b, c)),
      hints: [
        'Fix the length gate first: |s1|+|s2| must equal |s3| before any DP cell is read.',
        'Fill dp[i][j] over all prefix pairs with k = i+j-1, or recurse with memoization on (i, j).',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Interleaving String — edge cases (prefix-table drill)',
      statement:
        'Same interleaving task with the boundary inputs the worked example hides. Empty strings are valid: dp[0][0] is true and the base row and column decide the rest. A total-length mismatch is an instant false without reading any DP cell. The signature and exact comparison are unchanged.',
      tests: v2triples.map(([a, b, c]) => toTest(a, b, c)),
      hints: [
        'Empty strings are valid inputs: dp[0][0]=true and the base row and column decide the rest.',
        'A total-length mismatch is an instant false; trace which test below hits that gate.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'ambiguous repeats',
      intent: INTENT_ADVERSARIAL,
      title: 'Interleaving String — ambiguous repeats (same task, no twist)',
      statement:
        'Same task, harder placements: repeated characters make both branches match s3[k], so a greedy commit to one side fails while the OR over both predecessors succeeds. The first two tests are the official worked pair; the rest are fixed fresh ambiguities. The signature and boolean answer are unchanged.',
      tests: v3tests,
      hints: [
        'When s1[i-1] and s2[j-1] both equal s3[k], keep BOTH branches (OR); greedy commit to one side fails here.',
        'The official false case differs from the true case only near the tail; diff the two s3 strings char by char.',
      ],
    }),
  ]
}

// Staged-compat alias: same builder, family-style name.
export const buildPracticeVariants = buildInterleavingStringVariants

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oracleInterleaveDFS (top-down memoized DFS; frame emitter uses the bottom-up table)',
})

export default buildInterleavingStringVariants
