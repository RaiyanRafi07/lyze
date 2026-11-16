/**
 * pacific-atlantic-water-flow — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `pacific-atlantic-water-flow`
 * (Pacific Atlantic Water Flow, Medium, pacificAtlantic(int[][])->int[][], mode unordered).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * pacificAtlanticOracle below (reverse-BFS from both oceans), an INDEPENDENT
 * implementation of the same operation (not the walkthrough's frame emitter).
 *
 * Staged source: .workers/jobs/question-owners-150/pacific-atlantic-water-flow/practice.js
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
 * - `mode` is 'unordered' (coordinate-set answers; any order accepted).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'pacific-atlantic-water-flow'
export const SIGNATURE = Object.freeze({
  name: 'pacificAtlantic',
  params: Object.freeze([{ name: 'heights', type: 'int[][]' }]),
  return: 'int[][]',
})
export const MODE = 'unordered'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same two-ocean rule on fresh islands so you reproduce the reverse-flow reasoning.'
export const INTENT_EDGE = 'Same task with the boundary shape the worked example hides.'
export const INTENT_ADVERSARIAL = 'Same task with a transfer shape that punishes downhill-only mental models.'

/** INDEPENDENT reference oracle: reverse BFS (uphill) from each ocean. */
export function pacificAtlanticOracle(heights) {
  if (!Array.isArray(heights) || !heights.length || !Array.isArray(heights[0])) return null
  const rows = heights.length, cols = heights[0].length
  for (const row of heights) if (!Array.isArray(row) || row.length !== cols) return null
  const flow = (seeds) => {
    const seen = Array.from({ length: rows }, () => Array(cols).fill(false))
    const q = []
    for (const [r, c] of seeds) if (!seen[r][c]) { seen[r][c] = true; q.push([r, c]) }
    let h = 0
    while (h < q.length) {
      const [r, c] = q[h++]
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr, nc = c + dc
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || seen[nr][nc]) continue
        if (heights[nr][nc] >= heights[r][c]) { seen[nr][nc] = true; q.push([nr, nc]) }
      }
    }
    return seen
  }
  const pSeeds = [], aSeeds = []
  for (let c = 0; c < cols; c++) { pSeeds.push([0, c]); aSeeds.push([rows - 1, c]) }
  for (let r = 1; r < rows; r++) pSeeds.push([r, 0])
  for (let r = 0; r < rows - 1; r++) aSeeds.push([r, cols - 1])
  const p = flow(pSeeds), a = flow(aSeeds)
  const out = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (p[r][c] && a[r][c]) out.push([r, c])
  out.sort((x, y) => (x[0] - y[0]) || (x[1] - y[1]))
  return out
}

export function compareUnordered(got, expected) {
  const norm = (v) => {
    if (!Array.isArray(v)) return null
    const s = new Set()
    for (const p of v) {
      if (!Array.isArray(p) || p.length !== 2 || !Number.isInteger(p[0]) || !Number.isInteger(p[1])) return null
      s.add(p[0] + ':' + p[1])
    }
    return s
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

function buildVariant({ id, seedLabel, intent, title, statement, heightsList, hints }) {
  const tests = heightsList
    .map((heights) => ({ args: [lit(heights)], expected: lit(pacificAtlanticOracle(heights)) }))
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

export function buildPacificPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh islands',
      intent: INTENT_SAME,
      title: 'Pacific Atlantic — Fresh Islands (same task)',
      statement:
        'Run the same two-ocean rule on fresh generated islands. Water flows downhill to an ocean; equivalently, reverse-search uphill from each shore and intersect. Inputs use small hand-checkable heights. The signature and unordered comparison are unchanged.',
      heightsList: [
        [[1, 2, 2, 3, 5], [3, 2, 3, 4, 4], [2, 4, 5, 3, 1], [6, 7, 1, 4, 5], [5, 1, 1, 2, 4]],
        [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        [[9, 8, 7], [6, 5, 4], [3, 2, 1]],
        [[3, 3, 3], [3, 1, 3], [3, 3, 3]],
      ],
      hints: [
        'Start BFS from the borders, not from every cell: top+left for Pacific, bottom+right for Atlantic.',
        'Reverse move is uphill: accept a neighbor iff heights[nb] >= heights[cur].',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Pacific Atlantic — Edge Shapes (same task)',
      statement:
        'Same two-ocean task on edge inputs: a single cell that touches both oceans, a single column where every cell is a border seed, and a flat island where all heights tie. Corner seeds must not be double-counted. No rule change.',
      heightsList: [
        [[1]],
        [[5], [4], [4], [6], [1]],
        [[2, 2], [2, 2]],
        [[7]],
      ],
      hints: [
        'A single cell always reaches both oceans: it is seeded from every shore at once.',
        'Equal heights always connect uphill (nh >= h), so a flat island drains everywhere.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial bowls',
      intent: INTENT_ADVERSARIAL,
      title: 'Pacific Atlantic — Rim Bowl (transfer)',
      statement:
        'SAME TASK, harder shape: a high rim surrounds a low interior bowl, and a ridge splits the island. Reverse BFS can never climb down into the bowl, so the center is honestly excluded. No rule change: the signature and unordered comparison are unchanged.',
      heightsList: [
        [[9, 9, 9], [9, 1, 9], [9, 9, 9]],
        [[1, 2, 2, 3, 5], [3, 2, 3, 4, 4], [2, 4, 5, 3, 1], [6, 7, 1, 4, 5], [5, 1, 1, 2, 4]],
        [[10, 10, 10, 10], [10, 1, 2, 10], [10, 3, 4, 10], [10, 10, 10, 10]],
        [[5, 4, 3, 2, 1], [6, 7, 8, 9, 10]],
      ],
      hints: [
        'Downhill-only flow means the bowl interior can drain nowhere: uphill search from the rim stops at the cliff.',
        'The official 5x4 example is included here as an anchor; your walk must reproduce its 7-cell answer.',
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
  oracle: 'pacificAtlanticOracle (reverse BFS uphill from each ocean; frame emitter uses the same rule)',
})
