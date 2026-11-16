// Practice forge for `detect-squares` (LeetCode 2013). Generated exercises,
// clearly labelled as generated in each title/statement.
// The live record (shard-10.json id 2013) carries judge:null — a design/class
// problem with no single-call signature — so this forge documents an honest
// TEST PROFILE: runDetectSquaresOps(ops, points) -> string, where ops is the
// op-name array (ops[0] "DetectSquares", then "add"/"count"), points is the
// parallel per-op point array (points[0] [] for the ctor, every other row
// [x, y]), and the return is the JSON literal of the count() outputs in
// order, e.g. the official transcript returns "[1,0,2]" (add returns
// ignored). Precedents: mergeKLists(int[][])->int[],
// runTrieOps(string[],string[])->string. Comparison is exact on that literal.
// Every `expected` below is produced at build time by oracleCounts (an index-
// triple brute force over stored copies — an INDEPENDENT algorithm from the
// walkthrough's frequency-product diagonal scan) and cross-checked against
// referenceCounts (the freq-map product); any disagreement throws so a bad
// literal can never ship as "verified".
// Deterministic: fixed transcripts, no RNG, no Date.

export const SLUG = 'detect-squares'

export const SIGNATURE = Object.freeze({
  name: 'runDetectSquaresOps',
  params: Object.freeze([
    { name: 'ops', type: 'string[]' },
    { name: 'points', type: 'int[][]' },
  ]),
  return: 'string',
})

export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same diagonal-product rule on fresh squares so you reproduce the scan, not the memory.'
export const INTENT_EDGE = 'Same rule at the boundaries the worked example hides: empty, duplicates, non-squares.'
export const INTENT_ADVERSARIAL = 'Same rule with transfer traps: shared queries, forced-corner misses, copy products.'

// INDEPENDENT oracle: keep every added copy in a plain list and test index
// triples {i<j<k} against the query for the four corners of an axis-aligned
// square. O(n^3) per count — structurally different from the walkthrough's
// O(D) frequency-product loop, so agreement is a real cross-check. Only used
// on small staged transcripts (all drills are <= 9 points per count).
export function oracleCounts(ops, points) {
  const isAxisSquare = (a, b, c, d) => {
    const keys = new Set([a[0] + ',' + a[1], b[0] + ',' + b[1], c[0] + ',' + c[1], d[0] + ',' + d[1]])
    if (keys.size !== 4) return false
    const xs = new Set([a[0], b[0], c[0], d[0]])
    const ys = new Set([a[1], b[1], c[1], d[1]])
    if (xs.size !== 2 || ys.size !== 2) return false
    const xa = [...xs]
    const ya = [...ys]
    return Math.abs(xa[0] - xa[1]) === Math.abs(ya[0] - ya[1])
  }
  if (!Array.isArray(ops) || !Array.isArray(points) || ops.length !== points.length) {
    throw new Error('ops and points must be parallel arrays')
  }
  if (ops.length === 0 || ops[0] !== 'DetectSquares') throw new Error('transcript must start with DetectSquares')
  const stored = []
  const counts = []
  for (let k = 1; k < ops.length; k++) {
    const op = ops[k]
    const p = points[k]
    if (!Array.isArray(p) || p.length !== 2 || !Number.isInteger(p[0]) || !Number.isInteger(p[1])) {
      throw new Error('points[' + k + '] must be [x, y]')
    }
    if (op === 'add') stored.push([p[0], p[1]])
    else if (op === 'count') {
      const q = [p[0], p[1]]
      let ans = 0
      const n = stored.length
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          for (let l = j + 1; l < n; l++) {
            if (isAxisSquare(q, stored[i], stored[j], stored[l])) ans++
          }
        }
      }
      counts.push(ans)
    } else throw new Error('unknown op: ' + op)
  }
  return counts
}

// Cross-check reference: frequency map + diagonal-opposite product (the
// walkthrough algorithm class). Agreement with oracleCounts below is what
// makes every shipped `expected` trustworthy.
export function referenceCounts(ops, points) {
  const freq = new Map()
  const key = (x, y) => x + ',' + y
  const get = (x, y) => freq.get(key(x, y)) || 0
  const counts = []
  for (let k = 1; k < ops.length; k++) {
    const op = ops[k]
    const p = points[k]
    if (op === 'add') freq.set(key(p[0], p[1]), get(p[0], p[1]) + 1)
    else if (op === 'count') {
      const x = p[0]
      const y = p[1]
      let ans = 0
      for (const [k2, c] of freq) {
        const sep = k2.indexOf(',')
        const px = Number(k2.slice(0, sep))
        const py = Number(k2.slice(sep + 1))
        const dx = Math.abs(px - x)
        const dy = Math.abs(py - y)
        if (dx === 0 || dx !== dy) continue
        ans += c * get(x, py) * get(px, y)
      }
      counts.push(ans)
    } else throw new Error('unknown op: ' + op)
  }
  return counts
}

const opsLiteral = (ops) => JSON.stringify(ops)
const pointsLiteral = (points) => JSON.stringify(points)
const countsLiteral = (counts) => JSON.stringify(counts)

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  }
}

function inputLine(signature, args) {
  return signature.params.map((p, i) => (p && p.name ? p.name : 'arg' + i) + ' = ' + args[i]).join(', ')
}

function toTest(ops, points) {
  const fromOracle = oracleCounts(ops, points)
  const fromRef = referenceCounts(ops, points)
  if (JSON.stringify(fromOracle) !== JSON.stringify(fromRef)) {
    throw new Error('detect-squares practice oracle disagreement on ' + JSON.stringify(ops))
  }
  return { args: [opsLiteral(ops), pointsLiteral(points)], expected: countsLiteral(fromOracle) }
}

const CASES = {
  v1: {
    seedLabel: 'sourced plus fresh',
    intent: INTENT_SAME,
    statement:
      'Generated drill under the honest ops-sequence test profile: the first test replays the official 8-op transcript verbatim so the profile output matches the problem statement. ' +
      'The other tests rerun the same diagonal-product rule on fresh small squares, including one doubled corner that multiplies the count. ' +
      'Void add slots are ignored; only the count outputs in order are compared.',
    seqs: [
      {
        ops: ['DetectSquares', 'add', 'add', 'add', 'count', 'count', 'add', 'count'],
        points: [[], [3, 10], [11, 2], [3, 2], [11, 10], [14, 8], [11, 2], [11, 10]],
      },
      {
        ops: ['DetectSquares', 'add', 'add', 'add', 'count'],
        points: [[], [0, 0], [0, 1], [1, 0], [1, 1]],
      },
      {
        ops: ['DetectSquares', 'add', 'add', 'add', 'add', 'count'],
        points: [[], [0, 0], [0, 0], [0, 1], [1, 0], [1, 1]],
      },
    ],
    hints: [
      'For count([11,10]) only (3,2) is diagonal (gaps 8 and 8); (3,10) shares the row and (11,2) shares the column.',
      'Duplicates multiply: with c1 copies of the diagonal and c2/c3 of the forced corners the family gives c1*c2*c3.',
    ],
  },
  v2: {
    seedLabel: 'empty and duplicates',
    intent: INTENT_EDGE,
    statement:
      'Generated boundary run under the same ops-sequence profile: a count with no adds, three copies of the query itself, a 3x2 rectangle that looks square-like but has unequal gaps, and three collinear points whose forced side corners are both missing. ' +
      'Every one of these honestly returns 0, each for a different reason. ' +
      'No rule change: the signature and exact literal comparison are unchanged.',
    seqs: [
      {
        ops: ['DetectSquares', 'count'],
        points: [[], [0, 0]],
      },
      {
        ops: ['DetectSquares', 'add', 'add', 'add', 'count'],
        points: [[], [1, 1], [1, 1], [1, 1], [1, 1]],
      },
      {
        ops: ['DetectSquares', 'add', 'add', 'add', 'count'],
        points: [[], [0, 0], [0, 2], [3, 0], [3, 2]],
      },
      {
        ops: ['DetectSquares', 'add', 'add', 'add', 'count'],
        points: [[], [0, 0], [1, 1], [2, 2], [0, 2]],
      },
    ],
    hints: [
      'Same-row and same-column points are never diagonals: one gap is 0, so both directions of the guard matter.',
      'A true diagonal can still contribute 0 when a forced corner is missing (freq 0 zeroes the product).',
    ],
  },
  v3: {
    seedLabel: 'shared query, big product',
    intent: INTENT_ADVERSARIAL,
    statement:
      'Generated transfer case under the same profile: two squares (side 1 and side 2) share one query corner while row and column neighbors must be skipped, a tripled corner times doubled side corners gives 3*2*2 = 12, and a same-row neighbor is bait that the gap test must reject. ' +
      'Recount every diagonal from scratch per query; already-returned counts never change. ' +
      'The rule and output shape are unchanged.',
    seqs: [
      {
        ops: ['DetectSquares', 'add', 'add', 'add', 'add', 'add', 'add', 'count'],
        points: [[], [4, 5], [5, 4], [4, 4], [3, 5], [5, 3], [3, 3], [5, 5]],
      },
      {
        ops: ['DetectSquares', 'add', 'add', 'add', 'add', 'add', 'add', 'add', 'count'],
        points: [[], [0, 0], [0, 0], [0, 0], [0, 2], [0, 2], [2, 0], [2, 0], [2, 2]],
      },
      {
        ops: ['DetectSquares', 'add', 'add', 'add', 'add', 'add', 'count'],
        points: [[], [1, 1], [1, 1], [1, 3], [3, 1], [3, 1], [3, 3]],
      },
      {
        ops: ['DetectSquares', 'add', 'add', 'add', 'add', 'count'],
        points: [[], [0, 0], [2, 0], [0, 2], [1, 2], [2, 2]],
      },
    ],
    hints: [
      'List every stored point with its (dx,dy) against the query before multiplying; only equal nonzero gaps qualify.',
      'The row neighbor (1,2) vs query (2,2) has dy = 0: skipped even though it looks adjacent to the square.',
    ],
  },
}

function buildOne(id, spec, signature, difficulty, baseTitle) {
  const tests = spec.seqs.map(({ ops, points }) => toTest(ops, points)).slice(0, 5)
  const first = tests[0]
  return {
    id,
    seedLabel: spec.seedLabel,
    intent: spec.intent,
    difficulty,
    title: baseTitle + ' — ' + spec.seedLabel + ' (generated, same task)',
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
export function buildDetectSquaresVariants(problem, signature, rng) {
  void rng
  const sig = signature || (problem && problem.signature) || SIGNATURE
  if (!sig || sig.name !== 'runDetectSquaresOps' || sig.return !== 'string') return []
  const params = Array.isArray(sig.params) ? sig.params : []
  if (params.length !== 2) return []
  const types = params.map((p) => p.type)
  if (types[0] !== 'string[]' || types[1] !== 'int[][]') return []
  const base = String((problem && (problem.title || problem.slug)) || 'Detect Squares')
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
  oracle: 'oracleCounts (index-triple brute force over stored copies; no frequency map, no diagonal loop)',
})
