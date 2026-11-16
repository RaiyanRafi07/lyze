/**
 * combination-sum-ii — portable standalone practice builder (batch13).
 *
 * Produces exactly 3 deterministic variants for slug `combination-sum-ii`
 * (Combination Sum II, Medium, combinationSum2(int[],int)->int[][], mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * combinationSum2Brute below (bitmask enumeration over index subsets with
 * sorted-key dedup) and cross-checked against combinationSum2Reference (sorted
 * DFS with same-level skip) — a mismatch throws instead of shipping a literal.
 * The shipped oracle is the brute force, an INDEPENDENT implementation of the
 * same operation (not the walkthrough's instrumented frame emitter, though it
 * shares the reference's search order so exact-mode literals are canonical).
 *
 * Staged source: .workers/jobs/question-owners-150/combination-sum-ii/combination-sum-ii.variants.js
 * (cases v1/v2/v3, hints, intents, statements) — reshaped into the forge variant
 * contract (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Rows, hints, intents and statements are verbatim; the builder takes no
 * arguments and always returns exactly the 3 variants (the staged
 * problem-guarded shape is a registry-compat detail owned by the integrator).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (exact nested-list match for this slug).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (canonical sorted order; exact match).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'combination-sum-ii'
export const SIGNATURE = Object.freeze({
  name: 'combinationSum2',
  params: Object.freeze([{ name: 'candidates', type: 'int[]' }, { name: 'target', type: 'int' }]),
  return: 'int[][]',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_SAME_TASK = 'Same task, new numbers (no rule change): the output type and rules are identical.'

// Canonical reference: sorted DFS, same-level duplicate skip, sorted-cutoff
// prune. Output order is deterministic: combos built left to right.
export function combinationSum2Reference (candidates, target) {
  const sorted = candidates.slice().sort((a, b) => a - b)
  const result = []
  const path = []
  const dfs = (remain, start) => {
    if (remain === 0) { result.push(path.slice()); return }
    for (let i = start; i < sorted.length; i++) {
      if (sorted[i] > remain) break
      if (i > start && sorted[i] === sorted[i - 1]) continue
      path.push(sorted[i])
      dfs(remain - sorted[i], i + 1)
      path.pop()
    }
  }
  dfs(target, 0)
  return result
}

// INDEPENDENT oracle: enumerate every subset bitmask, keep sums == target,
// dedup by sorted key, sort rows canonically. Algorithmically distinct from
// the DFS reference (no sorting/pruning/skip logic shared).
export function combinationSum2Brute (candidates, target) {
  const n = candidates.length
  const seen = new Set()
  const out = []
  for (let mask = 0; mask < (1 << n); mask++) {
    const combo = []
    let sum = 0
    for (let i = 0; i < n; i++) {
      if ((mask >> i) & 1) { combo.push(candidates[i]); sum += candidates[i] }
    }
    if (sum === target) {
      combo.sort((a, b) => a - b)
      const key = JSON.stringify(combo)
      if (!seen.has(key)) { seen.add(key); out.push(combo) }
    }
  }
  out.sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0))
  return out
}

function numLiteral (value) {
  return String(value)
}

function outLiteral (value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return numLiteral(value)
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return '[' + value.map(outLiteral).join(',') + ']'
  return String(value)
}

function cloneSignature (signature) {
  return { name: signature.name, params: signature.params.map(p => ({ name: p.name, type: p.type })), return: signature.return }
}

function inputLine (signature, args) {
  return signature.params.map((param, i) => (param && param.name ? param.name : 'arg' + i) + ' = ' + args[i]).join(', ')
}

function toTest (cands, tgt) {
  const ref = outLiteral(combinationSum2Reference(cands, tgt))
  const brute = outLiteral(combinationSum2Brute(cands, tgt))
  if (ref !== brute) throw new Error('reference/brute disagree on ' + JSON.stringify(cands) + ' target ' + tgt)
  return { args: [outLiteral(cands), String(tgt)], expected: ref }
}

function buildVariant ({ id, seedLabel, intent, title, statement, rows, hints }) {
  const tests = rows
    .map(([cands, tgt]) => toTest(cands, tgt))
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

export function buildCombinationSumIIPractice () {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fixed-v1',
      intent: INTENT_SAME,
      title: 'Combination Sum II — fresh numbers (same task)',
      statement:
        'Same task with new numbers: each candidate may be used at most once and duplicate combinations are forbidden. Sort, then DFS with a same-level duplicate skip.',
      rows: [
        [[3, 1, 2, 2, 1, 4], 5],
        [[1, 1, 1, 1, 1], 3],
        [[3, 3, 3, 3], 6],
        [[10, 1, 2, 7, 6, 1, 5], 8],
      ],
      hints: [
        'Sort the candidates first; the duplicate skip only works on grouped equals.',
        'At each level skip candidates[i] == candidates[i-1] when i > start, and stop the level when candidates[i] > remain.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'fixed-v2',
      intent: INTENT_EDGE,
      title: 'Combination Sum II — hidden edge (same task)',
      statement:
        'Same task at the edges: answers can be empty, and a single repeated value can dominate. Your code must return [] (not null) when nothing sums to target.',
      rows: [
        [[2, 4, 6], 5],
        [[2, 2, 2, 2], 4],
        [[5], 3],
        [[1, 2, 2, 2, 5], 5],
      ],
      hints: [
        'Check the empty-answer path: no pair may exist, and [] must still compare equal.',
        'All-equal inputs stress the skip rule: [2,2,2,2] target 4 has exactly one unique answer.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'fixed-v3',
      intent: INTENT_SAME_TASK,
      title: 'Combination Sum II — same task, tighter target (same task)',
      statement:
        'Same task, same rules, denser answer set: small values against a larger target produce several combinations. Output type is unchanged (list of combinations).',
      rows: [
        [[1, 2, 3, 4, 5], 10],
        [[2, 5, 2, 1, 2], 5],
        [[4, 4, 4, 4], 8],
        [[1, 1, 2, 5, 6, 7, 10], 8],
      ],
      hints: [
        'Enumerate from the sorted array and recurse at i+1 so each element is used at most once.',
        'Record a copy of the path when remain hits 0; never record the live path object itself.',
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
  oracle: 'combinationSum2Brute (bitmask enumeration with sorted-key dedup; DFS used only in walkthrough)',
})
