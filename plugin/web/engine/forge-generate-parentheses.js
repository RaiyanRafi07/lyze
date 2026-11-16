// Practice forge for `generate-parentheses` (LeetCode 22). Generated exercises,
// clearly labelled as generated in each title/statement.
// Same judge signature (generateParenthesis, int -> string[]), comparison mode
// `unordered`: the answer is a SET of well-formed strings, so a valid answer
// must never be rejected merely because its order differs from one oracle's
// order. All `expected` literals below are produced at build time by
// generateParenthesisBruteIndependent (exhaustive bit-enumeration plus a
// balance-counter filter: a DIFFERENT algorithm from the walkthrough's
// open/close backtracking) and cross-checked against
// generateParenthesisReference (the walkthrough's own DFS); any disagreement
// throws so a bad literal can never ship as "verified".
// Deterministic: fixed inputs (n = 2 / 1 / 4 plus small extras), no RNG.

export const SLUG = 'generate-parentheses'

export const SIGNATURE = {
  name: 'generateParenthesis',
  params: [{ name: 'n', type: 'int' }],
  return: 'string[]',
}

export const MODE = 'unordered'
export const DIFFICULTY = 'Medium'

// Canonical reference: open/close backtracking (the walkthrough algorithm).
// '(' while open<n, ')' while close<open; record at length 2n. Discovery order
// is open-first DFS, matching the shard examples verbatim.
export function generateParenthesisReference(n) {
  const out = []
  const dfs = (open, close, cur) => {
    if (cur.length === 2 * n) { out.push(cur); return }
    if (open < n) dfs(open + 1, close, cur + '(')
    if (close < open) dfs(open, close + 1, cur + ')')
  }
  dfs(0, 0, '')
  return out
}

// INDEPENDENT oracle: enumerate all 2^(2n) bracket strings (bit = '('), keep
// the ones whose running balance never drops below zero and ends at zero.
// Iterative bit scan; no recursion, no open/close counters, no shared code path
// with the reference above.
export function generateParenthesisBruteIndependent(n) {
  const out = []
  const total = 1 << (2 * n)
  for (let mask = 0; mask < total; mask++) {
    let s = ''
    let bal = 0
    let valid = true
    for (let i = 2 * n - 1; i >= 0; i--) {
      const bit = (mask >> i) & 1
      s += bit ? '(' : ')'
      bal += bit ? 1 : -1
      if (bal < 0) { valid = false; break }
    }
    if (valid && bal === 0) out.push(s)
  }
  return out
}

// Canonical set compare for string sets: sort, then stringify.
export function unorderedEqual(a, b) {
  const key = (lists) => JSON.stringify([...lists].sort())
  return key(a) === key(b)
}

function outLiteral(strings) {
  return JSON.stringify(strings)
}

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

const CASES = {
  v1: {
    suffix: 'small n (generated)',
    seedLabel: 'small n=2',
    intent: 'Same pattern with small numbers so you reproduce the open-first reasoning by hand.',
    statement:
      'Generated exercise, same task: given n pairs of parentheses, generate all combinations of well-formed parentheses. ' +
      'This variant stays small (n = 2, two strings) so you can trace every branch by hand. ' +
      'The signature and unordered set comparison are unchanged.',
    inputs: [2, 1, 3],
    hints: [
      "Track two counters: how many '(' used and how many ')' used.",
      "Add ')' only when it would not outnumber '(' (close < open).",
    ],
  },
  v2: {
    suffix: 'edge n (generated)',
    seedLabel: 'edge n=1',
    intent: 'Same pattern at the edges the statement examples hide.',
    statement:
      'Generated exercise, same task at the edges: given n pairs of parentheses, generate all well-formed combinations. ' +
      'The smallest legal input (n = 1) has exactly one answer; check that your base case emits it. ' +
      'Recursion must stop at length 2*n, not when open brackets run out.',
    inputs: [1, 3, 2],
    hints: [
      'With one pair there is exactly one answer; check your base case emits it.',
      'Recursion must stop at length 2*n, not when open brackets run out.',
    ],
  },
  v3: {
    suffix: 'scale n (generated)',
    seedLabel: 'scale n=4',
    intent: 'Same pattern at scale, where pruning and ordering actually matter.',
    statement:
      'Generated exercise, same task and output type (no rule change): given n pairs of parentheses, generate all well-formed combinations. ' +
      'At n = 4 there are 14 strings, so over-pruning (too few) or a leaking close guard (too many) both show immediately. ' +
      'Brute force would scan 2^8 = 256 candidates here (65k at n = 8); backtracking builds only valid prefixes.',
    inputs: [4, 2, 3],
    hints: [
      'Catalan(4) = 14: if you emit fewer, a branch is over-pruned; if more, the close<open guard is leaking.',
      'Trying ( first fixes open-first discovery order; any order of the same set still passes.',
    ],
  },
}

function buildOne(id, spec, signature, difficulty, baseTitle) {
  const tests = spec.inputs.map((n) => {
    const fromBrute = generateParenthesisBruteIndependent(n)
    const fromRef = generateParenthesisReference(n)
    if (!unorderedEqual(fromBrute, fromRef)) {
      throw new Error('generate-parentheses practice oracle disagreement on n=' + n)
    }
    return { args: [String(n)], expected: outLiteral(fromBrute) }
  })
  const first = tests[0]
  return {
    id,
    seedLabel: spec.seedLabel,
    intent: spec.intent,
    difficulty,
    title: baseTitle + ' — ' + spec.suffix + ' (same task)',
    statement: spec.statement,
    signature: cloneSignature(signature),
    examples: [{ input: inputLine(signature, first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: spec.hints.slice(0, 2),
  }
}

// Live-forge-compatible builder: (problem, signature, rng) => 3 variants.
// Returns [] on an incompatible signature (never builds against it).
export function buildGenerateParenthesisVariants(problem, signature, rng) {
  void rng
  const sig = signature || (problem && problem.signature) || SIGNATURE
  if (!sig || sig.name !== 'generateParenthesis' || sig.return !== 'string[]') return []
  const params = Array.isArray(sig.params) ? sig.params : []
  if (params.length !== 1 || params[0].type !== 'int') return []
  const base = String((problem && (problem.title || problem.slug)) || 'Generate Parentheses')
  const difficulty =
    problem && (problem.difficulty === 'Easy' || problem.difficulty === 'Hard')
      ? problem.difficulty
      : DIFFICULTY
  try {
    return [
      buildOne('v1', CASES.v1, sig, difficulty, base),
      buildOne('v2', CASES.v2, sig, difficulty, base),
      buildOne('v3', CASES.v3, sig, difficulty, base),
    ]
  } catch {
    return []
  }
}

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'generateParenthesisBruteIndependent (exhaustive bit-enumeration plus balance-counter filter; different algorithm from the walkthrough DFS)',
})
