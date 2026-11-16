// Practice forge for `combination-sum` (LeetCode 39). Generated exercises,
// clearly labelled as generated in each title/statement.
// Same judge signature (combinationSum, int[] + int -> int[][]), comparison
// mode `unordered`: answers are sets of combinations, so a valid answer must
// never be rejected merely because its row/element order differs from one
// oracle's order. All `expected` strings are produced by
// combinationSumReference at build time; combinationSumBruteIndependent
// (iterative BFS queue, no recursion) cross-checks them in selfcheck.
// Deterministic: fixed inputs, no RNG.

export const SIGNATURE = {
  name: 'combinationSum',
  params: [
    { name: 'candidates', type: 'int[]' },
    { name: 'target', type: 'int' }
  ],
  return: 'int[][]'
}

export const MODE = 'unordered'

// Canonical reference: DFS with unlimited reuse (recurse at i, not i+1),
// prune on remain<0, record a COPY of the path on remain==0. Discovery
// order follows input order; callers compare canonically (order-insensitive).
export function combinationSumReference(candidates, target) {
  const cands = candidates.slice()
  const result = []
  const path = []
  const dfs = (start, remain) => {
    if (remain === 0) { result.push(path.slice()); return }
    if (remain < 0) return
    for (let i = start; i < cands.length; i++) {
      path.push(cands[i])
      dfs(i, remain - cands[i])
      path.pop()
    }
  }
  dfs(0, target)
  return result
}

// INDEPENDENT oracle: iterative BFS over remainder states with an explicit
// queue (start pointer + combo carried per entry). No recursion, no shared
// path-mutation logic with the reference. Same set semantics.
export function combinationSumBruteIndependent(candidates, target) {
  const out = []
  const queue = [{ start: 0, remain: target, combo: [] }]
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head]
    if (cur.remain === 0) { out.push(cur.combo.slice()); continue }
    if (cur.remain < 0) continue
    for (let i = cur.start; i < candidates.length; i++) {
      queue.push({
        start: i,
        remain: cur.remain - candidates[i],
        combo: [...cur.combo, candidates[i]]
      })
    }
  }
  return out
}

// Canonical set compare: sort each combo ascending, then sort the outer list.
export function canonKey(lists) {
  return lists
    .map((s) => s.slice().sort((a, b) => a - b))
    .map((s) => JSON.stringify(s))
    .sort()
}

export function unorderedEqual(a, b) {
  return JSON.stringify(canonKey(a)) === JSON.stringify(canonKey(b))
}

function numLiteral(value) {
  return String(value)
}

function outLiteral(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return numLiteral(value)
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return '[' + value.map(outLiteral).join(',') + ']'
  return String(value)
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

const CASES = {
  v1: {
    suffix: 'fresh numbers (generated)',
    intent: 'Same pattern with new numbers so you reproduce the reasoning.',
    statement: 'Generated exercise, same task: each candidate may be used unlimited times; return all unique combinations summing to target. DFS from a start index, recursing at i (not i+1) so reuse is allowed.',
    inputs: [
      [[3, 4, 5], 9],
      [[2, 4, 6], 8],
      [[3, 5, 7], 10],
      [[2, 5], 9]
    ],
    hints: [
      'Recurse at the same index i after picking candidates[i]; i+1 would forbid reuse and miss answers like [3,3,3].',
      'Stop a branch as soon as remain goes negative; record a copy of the path when remain hits exactly 0.'
    ]
  },
  v2: {
    suffix: 'hidden edge (generated)',
    intent: 'Same pattern at the edges the statement examples hide.',
    statement: 'Generated exercise, same task at the edges: answers can be empty, and a single value can carry the whole sum. Return [] (not null) when nothing sums to target.',
    inputs: [
      [[5, 7, 9], 3],
      [[4], 7],
      [[3], 9],
      [[2], 1]
    ],
    hints: [
      'Target smaller than every candidate yields no branch that reaches 0: return an empty list.',
      'A single repeated value is one combination ([3,3,3]), not three; record the path only at remain==0.'
    ]
  },
  v3: {
    suffix: 'reuse-heavy transfer (generated)',
    intent: 'Same rules, reuse-heavy inputs where the tree is deep and narrow.',
    statement: 'Generated exercise, same task and output type (no rule change): small values against a larger target force deep reuse of one element. Watch the path grow and shrink; the prune on remain<0 is the only thing bounding depth.',
    inputs: [
      [[2], 6],
      [[2, 4], 8],
      [[2, 3], 7],
      [[3, 4], 12]
    ],
    hints: [
      'With one small candidate the search is a single deep chain: each level picks the same index again.',
      'Mixed small values branch at every depth; the un-choose step is what restores the path between siblings.'
    ]
  }
}

function buildOne(id, spec, signature, difficulty, baseTitle) {
  const tests = spec.inputs.map(([cands, tgt]) => {
    const args = [outLiteral(cands), String(tgt)]
    const expected = outLiteral(combinationSumReference(cands, tgt))
    return { args, expected }
  })
  const first = tests[0]
  return {
    id,
    seedLabel: 'fixed-' + id,
    intent: spec.intent,
    difficulty,
    title: baseTitle + ' — ' + spec.suffix + ' (same task)',
    statement: spec.statement,
    signature: cloneSignature(signature),
    examples: [{ input: inputLine(signature, first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: spec.hints.slice(0, 2)
  }
}

// Live-forge-compatible builder: (problem, signature, rng) => 3 variants.
export function buildCombinationSumVariants(problem, signature, rng) {
  void rng
  if (!signature || signature.name !== 'combinationSum' || signature.return !== 'int[][]') return []
  if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
  if (signature.params[0].type !== 'int[]' || signature.params[1].type !== 'int') return []
  const base = String((problem && (problem.title || problem.slug)) || 'Combination Sum')
  const difficulty = problem && (problem.difficulty === 'Easy' || problem.difficulty === 'Hard')
    ? problem.difficulty
    : 'Medium'
  try {
    return [
      buildOne('v1', CASES.v1, signature, difficulty, base),
      buildOne('v2', CASES.v2, signature, difficulty, base),
      buildOne('v3', CASES.v3, signature, difficulty, base)
    ]
  } catch {
    return []
  }
}
