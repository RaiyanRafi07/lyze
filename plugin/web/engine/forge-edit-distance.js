/**
 * edit-distance — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `edit-distance`
 * (Edit Distance, Medium, minDistance(string,string)->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed literals only; every expected value is computed at build time by BOTH
 * oracles below (bottom-up DP table and top-down memoised recursion — an
 * INDEPENDENT algorithm with different control flow from the walkthrough's
 * row-by-row table fill); any disagreement throws so a bad literal can never
 * ship as a "verified" expectation.
 *
 * Staged source: .workers/jobs/neetcode150-completion/edit-distance/practice-edit-distance.mjs
 * (fresh/edge/adversarial pairs, dual oracles minDistance/oracleMinDistance); reshaped
 * into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against both oracles at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against ('3' / '5' / ...).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (single int answers).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'edit-distance'

export const SIGNATURE = Object.freeze({
  name: 'minDistance',
  params: Object.freeze([
    { name: 'word1', type: 'string' },
    { name: 'word2', type: 'string' },
  ]),
  return: 'int',
})

export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different strings so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same task, hostile pairs: the rule is unchanged, the cheap path lies.'

/** Reference oracle: bottom-up full-table DP (the walkthrough direction). */
export function oracleEditDP(word1, word2) {
  const a = String(word1)
  const b = String(word2)
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1]
      else dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[m][n]
}

/**
 * INDEPENDENT oracle: top-down memoised recursion over (i, j) prefix lengths.
 * Tries match-copy vs 1+min(replace, delete, insert) from the suffix end.
 * Deliberately different control flow from the bottom-up table fill, so
 * agreement is genuine independence, not shared code.
 */
export function oracleEditMemo(word1, word2) {
  const a = String(word1)
  const b = String(word2)
  const memo = new Map()
  function rec(i, j) {
    const k = i + ',' + j
    if (memo.has(k)) return memo.get(k)
    let v
    if (i === 0) v = j
    else if (j === 0) v = i
    else if (a[i - 1] === b[j - 1]) v = rec(i - 1, j - 1)
    else v = 1 + Math.min(rec(i - 1, j - 1), rec(i - 1, j), rec(i, j - 1))
    memo.set(k, v)
    return v
  }
  return rec(a.length, b.length)
}

const argLiteral = (v) => JSON.stringify(v)
const outLiteral = (v) => (Number.isInteger(v) ? String(v) : String(v))

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

function toTest(word1, word2) {
  const ref = oracleEditDP(word1, word2)
  const ind = oracleEditMemo(word1, word2)
  if (ref !== ind) throw new Error('edit-distance practice oracle disagreement on ' + JSON.stringify([word1, word2]) + ': dp=' + ref + ' memo=' + ind)
  return { args: [argLiteral(word1), argLiteral(word2)], expected: outLiteral(ref) }
}

/* ---------------- entry point ---------------- */

export function buildEditDistanceVariants() {
  // v1: fresh same-task data (classic textbook pairs; none is a shard example).
  const v1pairs = [['kitten', 'sitting'], ['sunday', 'saturday'], ['cat', 'cut'], ['flaw', 'lawn']]
  // v2: hidden edges the original examples never show (fixed).
  const v2pairs = [['', ''], ['', 'abc'], ['abc', ''], ['a', 'a']]
  // v3: SAME-TASK adversarial pairs (honest label — no rule change):
  // a transposed pair punishes swap-at-1 shortcuts; a long repeat run punishes
  // greedy prefix matching; a shared prefix hides a fully replaced tail.
  const v3pairs = [['ab', 'ba'], ['aaaaaaaaaa', 'aaaaa'], ['abcxxx', 'abcyyy'], ['abcdef', 'azced']]
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh pairs',
      intent: INTENT_SAME,
      title: 'Edit Distance — fresh pairs (prefix-table drill)',
      statement:
        'Given two lowercase strings word1 and word2, return the fewest single-character insertions, deletions, or replacements turning word1 into word2. These fresh pairs mix replacements, deletions, and insertions, including multi-edit conversions. The signature and exact-match judge mode are unchanged.',
      tests: v1pairs.map(([a, b]) => toTest(a, b)),
      hints: [
        'Let dp[i][j] cover the first i vs first j characters; a match copies the diagonal for free.',
        'A mismatch costs 1 plus the cheapest of diagonal (replace), up (delete), left (insert).',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Edit Distance — edge cases (prefix-table drill)',
      statement:
        'Same edit task with the boundary inputs. Two empty strings need 0 edits; an empty side forces pure insertions or pure deletions; a single equal character copies the diagonal for 0. The signature and exact comparison are unchanged.',
      tests: v2pairs.map(([a, b]) => toTest(a, b)),
      hints: [
        'Empty-vs-empty is the table origin dp[0][0] = 0, not 1.',
        'With one side empty the answer equals the other side length: no min() is even reached.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial pairs',
      intent: INTENT_ADVERSARIAL,
      title: 'Edit Distance — adversarial pairs (same task, no twist)',
      statement:
        'Same edit task with hostile pairs and the same int answer shape: no rule change. A transposed pair costs 2 because swap is not a free primitive; a long repeat run forces 5 deletions; a shared prefix hides a fully replaced tail; interleaved matches alternate free copies with paid edits. The signature and exact comparison are unchanged.',
      tests: v3pairs.map(([a, b]) => toTest(a, b)),
      hints: [
        '"ab" to "ba" is 2: two replaces, or delete+insert. Never price a swap at 1.',
        'Runs of the same letter still fill the whole table: count deletions, do not eyeball the prefix.',
      ],
    }),
  ]
}

// Live-forge-compatible entry: (problem) => 3 variants, or [] when unsupported.
export function buildVariantsForRecord(problem) {
  try {
    if (!problem || typeof problem !== 'object' || problem.slug !== SLUG) return []
    return buildEditDistanceVariants()
  } catch {
    return []
  }
}

// Staged-compat alias: same builder, owner-package name.
export const buildPracticeVariants = buildEditDistanceVariants

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oracleEditMemo (top-down memoised recursion; frame emitter uses the bottom-up table)',
})

export default buildEditDistanceVariants
