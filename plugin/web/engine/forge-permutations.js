/**
 * permutations — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `permutations`
 * (Permutations, Medium, permute(int[])->int[][], mode unordered).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * oraclePermute below (iterative Heap's algorithm), an INDEPENDENT
 * implementation of the same operation (not the walkthrough's swap-based
 * fix-first recursion, which uses a call stack and swap-back discipline
 * instead of Heap's counter array and parity rule).
 *
 * Staged source: .workers/jobs/question-owners-150/permutations/permutations.variants.js
 * (statements, hints, oracle); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (order-insensitive for this slug).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'unordered' (permutation-set answers; any order accepted).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'permutations'
export const SIGNATURE = Object.freeze({
  name: 'permute',
  params: Object.freeze([{ name: 'nums', type: 'int[]' }]),
  return: 'int[][]',
})
export const MODE = 'unordered'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same swap-recurse-restore pattern on fresh inputs so you reproduce the fix-first reasoning.'
export const INTENT_EDGE = 'Same task with the edges the official examples hide.'
export const INTENT_ADVERSARIAL = 'Same task at larger n: factorial growth means the count itself is the check.'

/** INDEPENDENT reference oracle: iterative Heap's algorithm (counter/parity based, not swap-recursion). */
export function oraclePermute(nums) {
  const a = nums.slice()
  const n = a.length
  const out = [a.slice()]
  const c = new Array(n).fill(0)
  let i = 0
  while (i < n) {
    if (c[i] < i) {
      const j = i % 2 === 0 ? 0 : c[i]
      const t = a[i]; a[i] = a[j]; a[j] = t
      out.push(a.slice())
      c[i] += 1
      i = 0
    } else {
      c[i] = 0
      i += 1
    }
  }
  return out
}

export function compareUnordered(got, expected) {
  const norm = (v) => {
    if (!Array.isArray(v)) return null
    const rows = v.map((row) => {
      if (!Array.isArray(row) || !row.every(Number.isInteger)) return null
      return row.slice().sort((x, y) => x - y).join(',')
    })
    if (rows.includes(null)) return null
    return new Set(rows)
  }
  const g = norm(got), e = norm(expected)
  if (!g || !e || g.size !== e.size) return false
  for (const k of e) if (!g.has(k)) return false
  return true
}

const lit = (v) => JSON.stringify(v)

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

function buildVariant({ id, seedLabel, intent, title, statement, numsList, hints }) {
  const tests = numsList
    .map((nums) => ({ args: [lit(nums)], expected: lit(oraclePermute(nums)) }))
    .slice(0, 5)
    .map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
  const first = tests[0]
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title,
    statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(SIGNATURE, first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: hints.slice(0, 2),
  }
}

/* ---------------- entry point ---------------- */

export function buildPermutationPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh arrays',
      intent: INTENT_SAME,
      title: 'Permutations — Fresh Arrays (generated drill)',
      statement:
        'Given an array nums of distinct integers, return all possible permutations. These fresh inputs use 2-3 distinct integers in [-10, 10]; answers have 2 or 6 rows. (Generated drill — not an official example.)',
      numsList: [
        [4, -6],
        [8, 5],
        [-8, -3],
        [-9, -2, 6],
      ],
      hints: [
        'Fix positions left to right: swap each candidate into `first`, recurse, then swap back.',
        'Recording happens when `first` reaches the end; every leaf is one answer row.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Permutations — Edge Cases (generated drill)',
      statement:
        'Same task: return all permutations of distinct integers. Boundary inputs include a single element ([[x]] is the only row), negative values, and zero. (Generated drill — not an official example.)',
      numsList: [
        [1],
        [-1, 0, 1],
        [-10, 10],
        [0, 5],
      ],
      hints: [
        'A single element still records one permutation at the base case.',
        'Negative values and zero swap exactly like positives — the algorithm never compares values.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'larger transfer',
      intent: INTENT_ADVERSARIAL,
      title: 'Permutations — Larger Transfer (generated drill)',
      statement:
        'Same task at larger n (4-5 distinct integers): return all permutations in any order. Expect 24 rows for n=4 and 120 for n=5 — count the rows before comparing contents. (Generated drill — not an official example.)',
      numsList: [
        [-6, -2, 0, 1],
        [-6, 8, -9, -3, 0],
        [-3, -1, 2, 7],
        [4, -2, 9],
      ],
      hints: [
        'n=4 gives 24 rows and n=5 gives 120; a short answer means a branch was pruned by mistake.',
        'The swap-back after each recursive call keeps sibling branches independent.',
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
  oracle: 'oraclePermute (iterative Heap counter/parity generation; frame emitter uses swap-based fix-first recursion)',
})
