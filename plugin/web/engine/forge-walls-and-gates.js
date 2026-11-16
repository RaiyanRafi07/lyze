/**
 * walls-and-gates — portable standalone practice builder (question-owners-150).
 *
 * Honest TEST PROFILE slug (judgeable: false). There is NO live judge record
 * for this slug: LeetCode 286 (premium), absent from raw/merged_problems.json
 * and from every plugin/data shard. The real LeetCode profile is the void
 * in-place method `wallsAndGates(rooms: int[][])` (mutate rooms, return
 * nothing). The honest TEST PROFILE used here is the same method shape:
 *   wallsAndGates(rooms: int[][]) -> void
 * Every `args[0]` below is the PRE-call rooms literal; every `expected` is
 * the POST-call mutated rooms literal (void return ignored; mode exact on
 * the mutated grid). Precedents: rotate(matrix: int[][])->void,
 * mergeKLists(int[][])->int[], runTrieOps(string[],string[])->string.
 *
 * Produces exactly 3 deterministic GENERATED variants (Medium,
 * wallsAndGates(int[][])->void, mode exact). Pure ES module: no DOM, no
 * network, no dependencies, no Math.random, no Date. Fixed grids; every
 * expected value is computed at build time by oraclePerCell below (per-cell
 * BFS from each INF room to its nearest gate — brute force), an INDEPENDENT
 * implementation of the same rule (not the walkthrough's multi-source
 * queue-BFS wavefront; the reference is wallsAndGatesInPlace). Every case is
 * cross-checked: oracleMultiSource (the shipped in-place method on a clone)
 * must agree with oraclePerCell, and the void-mutation runner must reproduce
 * the expected literal; any disagreement throws so a bad literal can never
 * ship as "verified".
 *
 * Staged source: .workers/jobs/neetcode150-completion/walls-and-gates/
 * walls-and-gates.forge.js (grids, dual oracles, statements, hints);
 * reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/
 * mode/hints). All three sets are the SAME in-place task (no rule change).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the TEST PROFILE signature, so the same test driver runs unchanged.
 * - `args` are raw rooms literal strings; `expected` is the POST-call rooms literal.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */
import { INF, WALL, GATE, wallsAndGatesInPlace } from './adapter-walls-and-gates.js'

export const SLUG = 'walls-and-gates'

export const SIGNATURE = Object.freeze({
  name: 'wallsAndGates',
  params: Object.freeze([{ name: 'rooms', type: 'int[][]' }]),
  return: 'void',
})

export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same task with adversarial layouts that punish single-source or depth-first thinking.'

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]]

function cloneGrid(grid) {
  return grid.map((row) => row.slice())
}

/** Reference oracle: multi-source BFS in place on a clone (mirrors the shipped method). */
export function oracleMultiSource(grid) {
  const work = cloneGrid(grid)
  wallsAndGatesInPlace(work)
  return work
}

/**
 * INDEPENDENT oracle: per-cell BFS from each INF room to the nearest gate
 * (brute force). No shared queue, no wavefront — structurally different from
 * the walkthrough's multi-source BFS, so agreement is a real cross-check.
 */
export function oraclePerCell(grid) {
  const rows = grid.length
  const cols = grid[0].length
  const out = cloneGrid(grid)
  const gates = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c] === GATE) gates.push([r, c])
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== INF) continue
      if (gates.length === 0) continue
      const seen = Array.from({ length: rows }, () => Array(cols).fill(false))
      const q = [[r, c, 0]]
      seen[r][c] = true
      let found = null
      for (let h = 0; h < q.length && found === null; h++) {
        const [cr, cc, d] = q[h]
        if (grid[cr][cc] === GATE) { found = d; break }
        for (const [dr, dc] of DIRS) {
          const nr = cr + dr
          const nc = cc + dc
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || seen[nr][nc]) continue
          if (grid[nr][nc] === WALL) continue
          seen[nr][nc] = true
          q.push([nr, nc, d + 1])
        }
      }
      if (found !== null) out[r][c] = found
    }
  }
  return out
}

export function oracleAgree(grid) {
  const a = oracleMultiSource(grid)
  const b = oraclePerCell(grid)
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error('oracle disagreement on ' + JSON.stringify(grid))
  return a
}

const outLiteral = (value) => JSON.stringify(value)

/** Execute the shipped JS reference in place; returns the mutated grid (compare target). */
export function runVoidMutation(roomsLiteral) {
  const rooms = JSON.parse(String(roomsLiteral)).map((row) => row.slice())
  const ret = wallsAndGatesInPlace(rooms)
  if (ret !== undefined) throw new Error('void-mutation reference must return undefined (got ' + JSON.stringify(ret) + ')')
  return rooms
}

function matchVoidMutation(mutated, expectedLiteral) {
  return JSON.stringify(mutated) === JSON.stringify(JSON.parse(String(expectedLiteral)))
}

function toTests(grids) {
  return grids.map((grid) => {
    const expected = outLiteral(oracleAgree(grid))
    if (!matchVoidMutation(runVoidMutation(outLiteral(grid)), expected)) {
      throw new Error('void-mutation runner mismatch on ' + outLiteral(grid))
    }
    return { args: [outLiteral(grid)], expected }
  })
}

function isShape(signature, paramTypes, returnType) {
  if (!signature || !Array.isArray(signature.params)) return false
  if (signature.params.length !== paramTypes.length) return false
  for (let i = 0; i < paramTypes.length; i++) {
    if (!signature.params[i] || signature.params[i].type !== paramTypes[i]) return false
  }
  return signature.return === returnType
}

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  }
}

function inputLine(signature, args) {
  return signature.params.map((p, i) => (p.name || 'arg' + i) + ' = ' + args[i]).join(', ')
}

function buildVariant(spec) {
  const tests = spec.tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
  const first = tests[0]
  return {
    id: spec.id,
    seedLabel: spec.seedLabel,
    intent: spec.intent,
    difficulty: DIFFICULTY,
    title: spec.title,
    statement: spec.statement,
    signature: cloneSignature(spec.signature),
    examples: [{ input: inputLine(spec.signature, first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: spec.hints.slice(0, 2),
  }
}

// Live-forge-compatible builder: (problem, signature, rng) => 3 variants.
// Returns [] on an incompatible signature (never builds against it).
// Deterministic: fixed grids, no RNG and no Date (rng is accepted and ignored).
export function buildWallsAndGatesVariants(problem, signature, rng) {
  void rng
  try {
    const sig = signature || (problem && problem.signature) || SIGNATURE
    if (!isShape(sig, ['int[][]'], 'void')) return []
    const base = String((problem && (problem.title || problem.slug)) || 'Walls and Gates')
    const difficulty =
      problem && (problem.difficulty === 'Easy' || problem.difficulty === 'Hard')
        ? problem.difficulty
        : DIFFICULTY
    const sourced = [[GATE, WALL], [INF, INF]]
    return [
      buildVariant({
        id: 'v1', seedLabel: 'fresh rooms', intent: INTENT_SAME, difficulty,
        title: base + ' — fresh rooms (generated, same in-place task)',
        statement:
          'Mutate rooms in place with wallsAndGates(rooms): 0 cells are gates, -1 cells are walls, 2147483647 cells are unfilled rooms. ' +
          'Write the shortest 4-direction distance to any gate into each reachable room; unreachable rooms keep 2147483647. ' +
          'The first test is the sourced 2x2 example; the rest are fresh generated rooms of 2 to 3 rows and columns.',
        signature: sig,
        tests: toTests([
          sourced,
          [[GATE, INF, INF], [INF, WALL, INF], [INF, INF, GATE]],
          [[INF, INF, GATE], [INF, WALL, INF], [GATE, INF, INF]],
          [[GATE, INF], [INF, INF]],
        ]),
        hints: [
          'Seed the queue with every 0 cell before the loop, not just the first one.',
          'Only 2147483647 cells are written; walls and settled cells are skipped.',
        ],
      }),
      buildVariant({
        id: 'v2', seedLabel: 'edge cases', intent: INTENT_EDGE, difficulty,
        title: base + ' — edge cases (generated, same in-place task)',
        statement:
          'Same in-place fill task with generated boundary rooms: a lone gate, a lone room with no gate, a wall-split row, a 2x2 with one wall, and a gateless 2x2 that must stay all 2147483647. ' +
          'A grid with no gate leaves every 2147483647 cell unchanged.',
        signature: sig,
        tests: toTests([
          [[GATE]],
          [[INF]],
          [[GATE, WALL, INF]],
          [[GATE, INF], [WALL, INF]],
          [[INF, INF], [INF, INF]],
        ]),
        hints: [
          'A grid with no gate leaves every 2147483647 cell unchanged.',
          'A single room with no gate is unreachable by definition.',
        ],
      }),
      buildVariant({
        id: 'v3', seedLabel: 'adversarial corridors', intent: INTENT_ADVERSARIAL, difficulty,
        title: base + ' — adversarial corridors (generated, same in-place task)',
        statement:
          'Same in-place fill task, same signature, no rule change (generated): a long 1x4 corridor forces distance 3, wall columns force the long way around, two gates race from both ends, and a walled 5x5 ring traps the fill inside. ' +
          'Depth-first depth is not distance here.',
        signature: sig,
        tests: toTests([
          [[GATE, INF, INF, INF]],
          [[GATE, WALL, INF], [INF, WALL, INF], [INF, INF, INF]],
          [[GATE, WALL, INF, INF], [INF, WALL, WALL, INF], [INF, INF, INF, GATE]],
          [[WALL, WALL, WALL, WALL, WALL], [WALL, INF, INF, INF, WALL], [WALL, INF, GATE, INF, WALL], [WALL, INF, INF, INF, WALL], [WALL, WALL, WALL, WALL, WALL]],
        ]),
        hints: [
          'Distances must arrive in wave order; the first write to a room is the shortest.',
          'A nearer second gate must win the race; seeding all gates together guarantees it.',
        ],
      }),
    ]
  } catch {
    return []
  }
}

export const WALLS_FORGE = Object.freeze({
  slug: SLUG,
  builder: 'buildWallsAndGatesVariants',
  pattern: 'graph-bfs',
  profile: 'void-mutation(int[][])',
})

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oraclePerCell (per-room BFS to nearest gate; frame emitter uses multi-source queue BFS)',
})
