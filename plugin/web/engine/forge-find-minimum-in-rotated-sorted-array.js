// Live-forge-compatible practice builder — delivery-sprint-20261107
// (find-minimum-in-rotated-sorted-array).
// Exports buildVariants(problem, options?) -> 3 variants | [].
// Shape mirrors plugin/web/engine/variants.js buildVariant: same real
// signature (clone), literal-string tests, mode exact, 2 hints per variant,
// example == tests[0]. Pure ES module: no DOM, no network, no dependencies,
// never throws (returns [] when the shape/record is unsupported).
// All expected values come from an independent linear-scan oracle
// (cross-checked against Math.min at build time); the binary-search walkthrough
// is never used as its own oracle.
// Third drill is an adversarial SAME-TASK drill (no rule change): rotations
// that punish off-by-one and endpoint assumptions. No unsound twist is forced.

function hashText (text) {
  const source = String(text)
  let hash = 2166136261 >>> 0
  for (let i = 0; i < source.length; i += 1) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619) >>> 0
  return hash
}

function mulberry32 (seed) {
  let a = seed >>> 0
  return function next () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randInt (rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)) }

// Independent oracle 1: linear scan (no binary search, no window arithmetic).
export function oracleScan (nums) {
  let best = nums[0]
  for (let i = 1; i < nums.length; i += 1) if (nums[i] < best) best = nums[i]
  return best
}

// Independent oracle 2: closed-form Math.min over a copy.
export function oracleSpread (nums) { return Math.min(...nums.slice()) }

function argLiteral (value) {
  if (Array.isArray(value)) return '[' + value.map(argLiteral).join(',') + ']'
  return String(value)
}
function outLiteral (value) { return String(value) }

function cloneSignature (signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return
  }
}

function signatureOf (problem) {
  const judge = problem && problem.judge
  const signature = judge && judge.signature
  if (!signature || typeof signature.name !== 'string' || signature.name.trim() === '') return null
  if (!Array.isArray(signature.params) || signature.params.length !== 1) return null
  const p = signature.params[0]
  if (!p || p.type !== 'int[]') return null
  if (signature.return !== 'int') return null
  return { name: signature.name.trim(), params: [{ name: String(p.name || 'nums'), type: 'int[]' }], return: 'int' }
}

function difficultyOf (problem) {
  const v = problem && problem.difficulty
  return v === 'Easy' || v === 'Medium' || v === 'Hard' ? v : 'Medium'
}

function titleOf (problem) {
  const raw = String((problem && (problem.title || problem.slug)) || 'Problem').trim()
  return raw.length > 46 ? raw.slice(0, 46).trim() + '…' : raw
}

function inputLine (signature, args) {
  return signature.params.map((param, i) => `${(param && param.name) || 'arg' + i} = ${args[i]}`).join(', ')
}

function buildVariant (spec) {
  const tests = spec.tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
  const first = tests[0]
  return {
    id: spec.id,
    seedLabel: spec.seedLabel,
    intent: spec.intent,
    difficulty: spec.difficulty,
    title: spec.title,
    statement: spec.statement,
    signature: cloneSignature(spec.signature),
    examples: [{ input: inputLine(spec.signature, first.args), output: first.expected, explain: '' }],
    tests,
    mode: spec.mode || 'exact',
    hints: spec.hints.slice(0, 2)
  }
}

// Ascending distinct base rotated by k (0..n-1; 0 = unrotated, allowed).
function rotatedBase (rng, n, lo, gapMax) {
  const base = []
  let v = lo + Math.floor(rng() * 21) - 10
  for (let i = 0; i < n; i += 1) { base.push(v); v += 1 + Math.floor(rng() * gapMax) }
  const k = Math.floor(rng() * n)
  return base.slice(k).concat(base.slice(0, k))
}

function toTest (nums) {
  const expected = oracleScan(nums)
  const cross = oracleSpread(nums)
  if (expected !== cross) throw new Error('oracle disagreement')
  return { args: [argLiteral(nums)], expected: outLiteral(expected) }
}

const STATEMENT = 'Suppose an array of length n sorted in ascending order is rotated between 1 and n times. Given the sorted rotated array nums of unique elements, return the minimum element of this array in O(log n) time.'
const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
const INTENT_ADV = 'Same question with adversarial rotations that punish off-by-one and endpoint assumptions.'

export function buildVariants (problem, options = {}) {
  void options
  try {
    if (!problem || typeof problem !== 'object') return []
    if (problem.slug !== 'find-minimum-in-rotated-sorted-array') return []
    const signature = signatureOf(problem)
    if (!signature) return []
    const rng = mulberry32(hashText(String(problem.slug)))
    const base = titleOf(problem)
    const difficulty = difficultyOf(problem)
    const make = (id, suffix, seedLabel, intent, statement, tests, mode, hints) =>
      buildVariant({ id, seedLabel, intent, difficulty, title: base + ' — ' + suffix + ' (min-of-rotation drill)', statement, signature, tests, mode, hints })

    // v1: fresh same-task inputs, visual scale n in 5..8.
    const v1 = []
    for (let n = 0; n < 4; n += 1) v1.push(toTest(rotatedBase(rng, randInt(rng, 5, 8), -60, 9)))

    // v2: fixed edge cases (single, both n=2 rotations, rotation by n-1, negatives).
    const v2 = [
      [7],
      [2, 1],
      [1, 2],
      [2, 3, 4, 5, 1],
      [-3, -2, -1, -10, -9, -8]
    ].map(toTest)

    // v3: adversarial same-task drill — same signature, same question, no rule
    // change. Min at last index, min just left of center, negatives with the
    // descent mid-array, wide gaps with extremes.
    const v3 = [
      [2, 3, 4, 5, 6, 7, 8, 9, 1],
      [4, 5, 6, 0, 1, 2, 3],
      [-8, -7, -30, -29, -28, -10, -9],
      [100, 200, 300, -5000, -4000]
    ].map(toTest)

    return [
      make('v1', 'fresh rotations', 'fresh rotations', INTENT_SAME,
        STATEMENT + ' These fresh inputs use 5 to 8 values; rotations vary, including unrotated.',
        v1, 'exact',
        ['Compare the middle value against the right edge: the larger side tells you which run the middle sits in.', 'Halve [lo,hi] with mid-vs-hi; keep the half that must hold the minimum.']),
      make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
        'Same minimum-of-rotation task with the boundary inputs. nums may hold a single value, exactly two values in either rotation, a rotation by n-1, or all-negative values. Return the minimum value.',
        v2, 'exact',
        ['One element is trivially the minimum; the loop body never runs.', 'Sign does not matter; only relative order drives the branch.']),
      make('v3', 'adversarial rotations', 'adversarial rotations', INTENT_ADV,
        'Same minimum-of-rotation question with adversarial rotations. The pivot sits at the last index, just left of center, inside negatives, or beside wide value gaps. The signature and exact comparison are unchanged: return the minimum value.',
        v3, 'exact',
        ['Almost-sorted inputs keep every probe in the left run until the window reaches the pivot.', 'A first probe in the right run does not mean the minimum is at mid — hi must stay a candidate.'])
    ]
  } catch { return [] }
}
