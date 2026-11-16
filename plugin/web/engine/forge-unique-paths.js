// Staged live-forge-compatible variant builder for `unique-paths` (delivery 20261107).
// Forge status today: `unique-paths` is NOT in ELIGIBLE_PROBLEMS and `dp-2d` has no
// BUILDERS entry, so buildVariants() returns [] for this slug. This module stages the
// missing builder in the exact forge calling convention so integration is registry-only:
//   1. add 'unique-paths' to ELIGIBLE_PROBLEMS,
//   2. add 'dp-2d': [buildUniquePathsVariants] to BUILDERS (new pattern entry).
// Standalone: no imports, no DOM, no network. Deterministic per slug (FNV-1a + mulberry32).
// Same real signature {uniquePaths(int,int)->int}, mode 'exact', 2 hints per variant,
// examples[0] derived from tests[0] (input line + expected), literal-string args/expected.
// No rule twist is staged: a same-signature "twist" would be unsound here (obstacles or
// modulo counting change the task), so v3 is a clearly labeled adversarial SAME-TASK drill
// with rules unchanged. Every expected comes from the multiplicative binomial oracle
// (no DP table) and is cross-checked by an independent rolling 1-D DP oracle.

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

// Independent oracle 1: multiplicative C(m+n-2, m-1). No table fill.
export function binomOracle(m, n) {
  if (!Number.isInteger(m) || !Number.isInteger(n) || m < 1 || n < 1) {
    throw new Error('binomOracle needs positive integers m, n')
  }
  if (m === 1 || n === 1) return 1
  const N = m + n - 2
  const K = Math.min(m - 1, n - 1)
  let r = 1
  for (let i = 1; i <= K; i++) r = (r * (N - K + i)) / i
  return Math.round(r)
}

// Independent oracle 2: rolling 1-D DP. Distinct memory layout from the 2-D walk.
export function dpOracle(m, n) {
  if (!Number.isInteger(m) || !Number.isInteger(n) || m < 1 || n < 1) {
    throw new Error('dpOracle needs positive integers m, n')
  }
  const row = new Array(n).fill(1)
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) row[j] = row[j] + row[j - 1]
  }
  return row[n - 1]
}

function isShape(signature, paramTypes, returnType) {
  if (!signature || !Array.isArray(signature.params)) return false
  if (signature.params.length !== paramTypes.length) return false
  for (let i = 0; i < paramTypes.length; i += 1) {
    if (!signature.params[i] || signature.params[i].type !== paramTypes[i]) return false
  }
  return signature.return === returnType
}

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return
  }
}

function inputLine(signature, args) {
  return signature.params.map((p, i) => (p && p.name ? p.name : 'arg' + i) + ' = ' + args[i]).join(', ')
}

function difficultyOf(problem) {
  const v = problem && problem.difficulty
  return v === 'Easy' || v === 'Medium' || v === 'Hard' ? v : 'Medium'
}

function titleOf(problem) {
  const raw = String((problem && (problem.title || problem.slug)) || 'Problem').trim()
  return raw.length > 46 ? raw.slice(0, 46).trim() + '…' : raw
}

function makeCase(m, n) {
  const expected = binomOracle(m, n)
  if (dpOracle(m, n) !== expected) {
    throw new Error('oracle disagreement on ' + m + 'x' + n)
  }
  if (expected > 2000000000) {
    throw new Error('case ' + m + 'x' + n + ' exceeds judge int range (got ' + expected + ')')
  }
  return { args: [String(m), String(n)], expected: String(expected) }
}

function buildVariant(problem, signature, spec) {
  const tests = spec.tests.map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
  const first = tests[0]
  return {
    id: spec.id,
    seedLabel: spec.seedLabel,
    intent: spec.intent,
    difficulty: difficultyOf(problem),
    title: titleOf(problem) + ' — ' + spec.suffix,
    statement: spec.statement,
    signature: cloneSignature(signature),
    examples: [{ input: inputLine(signature, first.args), output: first.expected, explain: '' }],
    tests,
    mode: 'exact',
    hints: spec.hints.slice(0, 2)
  }
}

// Forge calling convention: (problem, signature, rng) -> 3 variants or null.
// When called with only (problem), signature and seeded rng are derived (standalone use).
export function buildUniquePathsVariants(problem, signature, rng) {
  if (!problem || problem.slug !== 'unique-paths') return null
  const sig = signature || (problem.judge && problem.judge.signature) || null
  if (!isShape(sig, ['int', 'int'], 'int')) return null
  if (sig.name !== 'uniquePaths') return null
  const rand = rng || mulberry32(hashText('unique-paths'))

  // v1: fresh same-task numbers inside the 1..7 visual bound, seeded (deterministic).
  const seen = new Set(['3,7', '3,2', '1,1', '1,7', '7,1', '2,2'])
  const v1pairs = []
  let guard = 0
  while (v1pairs.length < 4 && guard++ < 200) {
    const m = randInt(rand, 2, 7)
    const n = randInt(rand, 2, 7)
    const key = m + ',' + n
    if (seen.has(key)) continue
    seen.add(key)
    v1pairs.push([m, n])
  }
  while (v1pairs.length < 4) v1pairs.push([4, 4])

  // v2: explicit edge cases the original hides (border-only + smallest interior).
  const v2pairs = [[1, 1], [1, 7], [7, 1], [2, 2]]

  // v3: adversarial SAME-TASK drill, rules unchanged (no unsound twist staged):
  // thin strips punish naive exponential recursion; large squares (10x10, 15x7,
  // 7x15, 3x12) stay inside the judge int range and expose overflow assumptions.
  // These judge tests are NOT subject to the 1..7 visual-walkthrough bound.
  const v3pairs = [[10, 10], [15, 7], [7, 15], [3, 12]]

  const base = 'A robot starts at the top-left of an m x n grid and must reach the ' +
    'bottom-right moving only right or down. Return the number of unique paths.'

  return [
    buildVariant(problem, sig, {
      id: 'v1',
      seedLabel: 'seed:unique-paths',
      intent: 'Same pattern, different numbers so you reproduce the reasoning.',
      suffix: 'fresh grids (same task)',
      statement: base + ' These fresh inputs use grid sizes between 2x2 and 7x7.',
      tests: v1pairs.map(([m, n]) => makeCase(m, n)),
      hints: [
        'Each interior cell is the sum of the cell above and the cell to the left.',
        'The first row and first column are all 1s: a straight run is the only way there.'
      ]
    }),
    buildVariant(problem, sig, {
      id: 'v2',
      seedLabel: 'seed:unique-paths',
      intent: 'Same pattern with the edge case the original hides.',
      suffix: 'edge cases (same task)',
      statement: base + ' Boundary inputs: a 1x1 grid, single-row and single-column strips, and the smallest grid with an interior cell.',
      tests: v2pairs.map(([m, n]) => makeCase(m, n)),
      hints: [
        'With one row or one column there are no choices, so the answer is 1.',
        'For 2x2, enumerate by hand: right-down and down-right are the only routes.'
      ]
    }),
    buildVariant(problem, sig, {
      id: 'v3',
      seedLabel: 'seed:unique-paths',
      intent: 'Same question with adversarial shapes that punish naive recursion.',
      suffix: 'adversarial shapes (same task, no rule change)',
      statement: base + ' Adversarial shapes with the SAME rules: thin strips and large grids up to 15x7. A naive exponential recursion times out here; tabulated DP or the multiplicative combination both fit easily, and every answer fits the int range.',
      tests: v3pairs.map(([m, n]) => makeCase(m, n)),
      hints: [
        'Count combinations: choose which of the m+n-2 moves are downs (or rights).',
        'Fill row by row reusing one row: each entry is the running left value plus the saved above value.'
      ]
    })
  ]
}
