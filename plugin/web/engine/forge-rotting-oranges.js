/**
 * rotting-oranges — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `rotting-oranges`
 * (Rotting Oranges, Medium, orangesRotting(int[][])->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * orangesRottingOracle below (synchronous full-grid simulation: each minute
 * every fresh cell adjacent to a rotten cell rots at once), an INDEPENDENT
 * implementation of the same operation (not the walkthrough's multi-source
 * queue-BFS level emitter). Simulation scans the whole snapshot per minute;
 * the walkthrough expands one queue level per minute with head/size pointers.
 *
 * Staged source: .workers/jobs/question-owners-150/rotting-oranges/practice.js
 * (statements, hints, dist-array BFS oracle); reshaped into the forge variant
 * contract (id/seedLabel/intent/difficulty/title/statement/signature/
 * examples/tests/mode/hints). Expected literals re-verified against the oracle
 * at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (mode 'exact').
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'rotting-oranges'
export const SIGNATURE = Object.freeze({
  name: 'orangesRotting',
  params: Object.freeze([{ name: 'grid', type: 'int[][]' }]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same task on fresh open rooms so you reproduce the level-by-level reasoning.'
export const INTENT_EDGE = 'Same task with the edge shapes the worked examples hide.'
export const INTENT_ADVERSARIAL = 'Same task with wall and two-front shapes that punish single-source thinking.'

/**
 * INDEPENDENT oracle: synchronous cellular simulation, no queue.
 * Snapshot the grid each minute; every fresh cell 4-adjacent to a rotten cell
 * in the snapshot rots simultaneously. Repeat until no fresh rots in a minute.
 * Different method from the walkthrough (multi-source queue BFS with level
 * sizes); agrees on all inputs including unreachable (-1) and no-fresh (0).
 */
export function orangesRottingOracle(grid) {
  if (!Array.isArray(grid) || grid.length === 0 || !Array.isArray(grid[0])) return null
  const rows = grid.length
  const cols = grid[0].length
  for (const row of grid) {
    if (!Array.isArray(row) || row.length !== cols) return null
    for (const v of row) if (v !== 0 && v !== 1 && v !== 2) return null
  }
  const work = grid.map((row) => row.slice())
  let fresh = 0
  for (const row of work) for (const v of row) if (v === 1) fresh += 1
  if (fresh === 0) return 0
  let hasRotten = false
  for (const row of work) if (row.includes(2)) { hasRotten = true; break }
  if (!hasRotten) return -1
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  let minutes = 0
  for (;;) {
    const toRot = []
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (work[r][c] !== 1) continue
        for (const [dr, dc] of dirs) {
          const nr = r + dr
          const nc = c + dc
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && work[nr][nc] === 2) {
            toRot.push([r, c])
            break
          }
        }
      }
    }
    if (toRot.length === 0) break
    for (const [r, c] of toRot) { work[r][c] = 2; fresh -= 1 }
    minutes += 1
    if (fresh === 0) break
  }
  return fresh === 0 ? minutes : -1
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

function buildVariant({ id, seedLabel, intent, title, statement, grids, hints }) {
  const tests = grids
    .map((grid) => ({ args: [lit(grid)], expected: lit(orangesRottingOracle(grid)) }))
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

export function buildRottingOrangesPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'open spread',
      intent: INTENT_SAME,
      title: 'Rotting Oranges — Open Spread (same task)',
      statement:
        'Fresh oranges fill an open room with one rotten seed, and rot spreads 4-directionally one step per minute. Return the minutes until no fresh orange remains, or -1 when impossible. Fresh inputs below range from 2x2 rooms to the official 3x3 example. The signature and exact comparison are unchanged.',
      grids: [
        [[2, 1, 1], [1, 1, 0], [0, 1, 1]],
        [[2, 1, 1], [1, 1, 1], [1, 1, 1]],
        [[2, 1, 0], [1, 1, 1], [0, 1, 1]],
        [[2, 1], [1, 1]],
      ],
      hints: [
        'Seed every rotten orange in the queue at minute 0, then expand exactly one queue level per minute.',
        'Count fresh oranges up front: zero fresh means 0, leftover fresh after the queue drains means -1.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Rotting Oranges — Edge Cases (same task)',
      statement:
        'Same rot rule on edge inputs: a single cell with no fresh, a lone fresh orange with no rotten seed, and a one-row strip where rot walks one step per minute. Zero fresh always answers 0 even when rotten cells exist. No rule change: same signature, same exact comparison.',
      grids: [
        [[0, 2]],
        [[1]],
        [[2]],
        [[0, 1, 2]],
      ],
      hints: [
        'Check the fresh count before looping: no fresh oranges short-circuits to 0 minutes.',
        'With no rotten seed and any fresh orange left, the answer is -1 without spreading.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'walled-off fronts',
      intent: INTENT_ADVERSARIAL,
      title: 'Rotting Oranges — Walled fronts (transfer)',
      statement:
        'SAME TASK, harder shapes: empty cells wall off fresh oranges from every rotten front, and two fronts race from opposite corners. A wall of zeros blocks 4-directional spread completely, so walled-off fresh forces -1. The official unreachable example is included as an anchor; your walk must reproduce its -1 honestly.',
      grids: [
        [[2, 1, 1], [0, 1, 1], [1, 0, 1]],
        [[2, 0, 1], [0, 0, 0], [1, 0, 1]],
        [[2, 1, 0, 1], [1, 0, 1, 2], [0, 1, 1, 1]],
        [[2, 1, 1], [1, 1, 1], [1, 1, 2]],
      ],
      hints: [
        'Zeros are walls, not rot sources: never queue them and never count them as fresh.',
        'With two seeds, each fresh cell rots at the earliest minute either front reaches it; track the deepest level.',
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
  oracle: 'orangesRottingOracle (synchronous full-grid simulation; frame emitter uses multi-source queue BFS)',
})
