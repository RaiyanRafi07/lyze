/**
 * walls-and-gates — live semantic adapter (Graphs, graph-bfs, grid kind).
 *
 * Walkthrough for Walls and Gates (NeetCode title: Islands and Treasure):
 * multi-source BFS in place. Every gate (0) seeds one shared queue, the
 * wavefront pops cells in nondecreasing distance order, and the FIRST write
 * to an INF cell (2147483647) is its shortest 4-direction distance. Walls
 * (-1) are never queued or written; unreachable INF cells keep the sentinel.
 * Every frame is produced by running this exact algorithm on the actual
 * input rooms — no invented cells, no future values.
 * O(m*n) time, O(m*n) space.
 *
 * Honest TEST PROFILE (judgeable: false). There is NO live judge record for
 * this slug: it is LeetCode 286 (premium), absent from raw/merged_problems.json
 * and from every plugin/data shard (no local record to match). The real
 * LeetCode profile is the void in-place method `wallsAndGates(rooms: int[][])`
 * which mutates rooms and returns nothing, so there is no return literal to
 * compare. The honest TEST PROFILE used here is the same real method shape:
 *   wallsAndGates(rooms: int[][]) -> void
 * Walkthrough frames, practice tests, and expected values use PRE-call rooms
 * as args and the POST-call mutated rooms as expected (void return ignored;
 * mode exact on the mutated grid). Precedents: rotate(matrix: int[][])->void,
 * mergeKLists(int[][])->int[], runTrieOps(string[],string[])->string.
 * Adapter and forge signatures equal this documented test profile. Never
 * presented as official.
 *
 * Staged sources (logic byte-identical, helpers re-pointed at semantic-core):
 * .workers/jobs/neetcode150-completion/walls-and-gates/walls-and-gates.adapter.js
 * (reference Java/C++/pseudocode with [step] markers, lesson, explain, real
 * frame-emitting buildWalls) — ported to the live shape: shared `code`/`frame`
 * helpers imported from semantic-core.js, no local helper redefinitions.
 *
 * Visual bound (honest disclosure): 1..6 rows x 1..6 cols, values restricted
 * to -1/0/2147483647 (sourced constraints allow up to 100x100). Over-bound or
 * malformed inputs reject with a clear error, never truncate.
 */
import { code, frame, boundedFrames } from './semantic-core.js'

// boundedFrames is applied by semantic.js (single compaction pass); the import
// keeps this adapter on the shared helper contract. Adapters return FULL lists.

export const SLUG = 'walls-and-gates'

// Honest TEST PROFILE signature (see header). Host-supported types only.
export const SIGNATURE = Object.freeze({
  name: 'wallsAndGates',
  params: Object.freeze([{ name: 'rooms', type: 'int[][]' }]),
  return: 'void',
})

export const SIGNATURE_TYPES = ['int[][]']

export const INF = 2147483647
export const WALL = -1
export const GATE = 0
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const MAX_SIDE = 6

export function decodeRooms(value) {
  if (!Array.isArray(value)) throw new Error('Provide rooms as int[][] (got ' + typeof value + ')')
  if (value.length < 1 || value.length > MAX_SIDE) throw new Error('Rooms visual limited to 1..' + MAX_SIDE + ' rows x 1..' + MAX_SIDE + ' cols (got ' + value.length + ' rows)')
  if (!Array.isArray(value[0])) throw new Error('Every rooms row must be an array')
  const cols = value[0].length
  if (cols < 1 || cols > MAX_SIDE) throw new Error('Rooms visual limited to 1..' + MAX_SIDE + ' rows x 1..' + MAX_SIDE + ' cols (got ' + cols + ' cols)')
  return value.map((row, r) => {
    if (!Array.isArray(row) || row.length !== cols) throw new Error('Rooms must be rectangular (row ' + r + ' has length ' + (Array.isArray(row) ? row.length : typeof row) + ', expected ' + cols + ')')
    return row.map((cell, c) => {
      if (cell === WALL || cell === GATE || cell === INF) return cell
      throw new Error('rooms[' + r + '][' + c + '] must be -1, 0, or 2147483647 (got ' + JSON.stringify(cell) + ')')
    })
  })
}

/** Real in-place reference: fills work grid, returns undefined (void). Same array mutated. */
export function wallsAndGatesInPlace(rooms) {
  const rows = rooms.length
  const cols = rooms[0].length
  const qq = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (rooms[r][c] === GATE) qq.push([r, c])
  for (let head = 0; head < qq.length; head++) {
    const [r, c] = qq[head]
    for (const [dr, dc] of DIRS) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (rooms[nr][nc] !== INF) continue
      rooms[nr][nc] = rooms[r][c] + 1
      qq.push([nr, nc])
    }
  }
}

export const wallsJava = code(`
[def] class Solution {
[def]     public void wallsAndGates(int[][] rooms) {
[init]         int rows = rooms.length;
[init]         int cols = rooms[0].length;
[init]         int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
[init]         java.util.ArrayDeque<int[]> qq = new java.util.ArrayDeque<>();
[seed]         for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) if (rooms[r][c] == 0) qq.offer(new int[]{r, c});
[expand]         while (!qq.isEmpty()) {
[expand]             int[] cell = qq.poll();
[expand]             int r = cell[0];
[expand]             int c = cell[1];
[visit]             for (int k = 0; k < 4; k++) {
[visit]                 int nr = r + dirs[k][0];
[visit]                 int nc = c + dirs[k][1];
[visit]                 if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
[visit]                 if (rooms[nr][nc] != 2147483647) continue;
[update]                 rooms[nr][nc] = rooms[r][c] + 1;
[update]                 qq.offer(new int[]{nr, nc});
[visit]             }
[expand]         }
[done]         return;
[def]     }
[def] }
`)

export const wallsCpp = code(`
[def] class Solution {
[def] public:
[def]     void wallsAndGates(vector<vector<int>>& rooms) {
[init]         int rows = (int)rooms.size();
[init]         int cols = (int)rooms[0].size();
[init]         const int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
[init]         deque<pair<int, int>> qq;
[seed]         for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) if (rooms[r][c] == 0) qq.emplace_back(r, c);
[expand]         while (!qq.empty()) {
[expand]             auto cell = qq.front();
[expand]             qq.pop_front();
[expand]             int r = cell.first;
[expand]             int c = cell.second;
[visit]             for (int k = 0; k < 4; k++) {
[visit]                 int nr = r + dirs[k][0];
[visit]                 int nc = c + dirs[k][1];
[visit]                 if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
[visit]                 if (rooms[nr][nc] != 2147483647) continue;
[update]                 rooms[nr][nc] = rooms[r][c] + 1;
[update]                 qq.emplace_back(nr, nc);
[visit]             }
[expand]         }
[done]         return;
[def]     }
[def] };
`)

export const wallsPseudo = code(`
[def] wallsAndGates(rooms):
[init]   rows = len(rooms); cols = len(rooms[0]); qq = []
[seed]   for each cell (r, c): if rooms[r][c] == 0: qq.push((r, c))
[expand]   while qq not empty:
[expand]     (r, c) = qq.shift()
[visit]     for (dr, dc) in [(1,0), (-1,0), (0,1), (0,-1)]:
[visit]       nr = r + dr; nc = c + dc
[visit]       if nr, nc outside grid: continue
[visit]       if rooms[nr][nc] != INF: continue
[update]       rooms[nr][nc] = rooms[r][c] + 1
[update]       qq.push((nr, nc))
[done]   return (rooms mutated in place)
`)

export const wallsExplain = {
  def: 'Declares the solution scope so the in-place fill stays inside wallsAndGates with shared bounds.',
  init: 'Captures rows, cols, directions, and an empty queue so seeding starts from a clean state.',
  seed: 'Queues every gate cell at distance 0 so the wavefront starts from all destinations at once.',
  expand: 'Pops the next wavefront cell so distances spread in nondecreasing order from the gates.',
  visit: 'Checks one orthogonal neighbor for bounds and INF state before any distance write.',
  update: 'Writes neighbor distance as current plus one and queues it so it spreads the next wave.',
  done: 'Returns with rooms mutated in place once the queue drains; nothing is returned.',
}

export const wallsExplainLines = {
  java: [
    'Structural wrapper: opens the Solution class; no algorithm operation.',
    'Function signature: takes rooms int[][] and returns void; mutation starts in the body.',
    'Reads row count from rooms so later loops stay inside the grid.',
    'Reads column count from row 0 so every row uses one shared width.',
    'Defines the four orthogonal direction offsets used for every neighbor check.',
    'Creates an empty deque queue that will hold gate and frontier cells.',
    'Row-major seed scan: queues each cell holding 0 so all gates start at distance 0.',
    'Wavefront loop guard: runs while queued cells remain unexpanded.',
    'Removes the head cell from the queue for expansion this iteration.',
    'Reads the popped row index into r for neighbor math below.',
    'Reads the popped column index into c for neighbor math below.',
    'Starts the four-neighbor loop around the popped cell.',
    'Computes neighbor row nr from r plus the direction offset.',
    'Computes neighbor column nc from c plus the direction offset.',
    'Skips neighbors outside the grid so edges never write out of bounds.',
    'Skips neighbors that are not INF so walls, gates, and settled cells keep values.',
    'Writes neighbor distance as current plus one, the first and shortest arrival.',
    'Queues the freshly written cell so its own neighbors are reached next wave.',
    'Closes the neighbor loop and continues with the next direction.',
    'Closes the wavefront loop; queue empty means every reachable cell is final.',
    'Void return: ends the call with rooms mutated in place and no value.',
    'Structural close of the method scope; no operation.',
    'Structural close of the class scope; no operation.',
  ],
  cpp: [
    'Structural wrapper: opens the Solution class; no algorithm operation.',
    'Structural access marker; no operation.',
    'Function signature: takes rooms by reference and returns void for in-place fill.',
    'Reads row count from rooms so later loops stay inside the grid.',
    'Reads column count from row 0 so every row uses one shared width.',
    'Defines the four orthogonal direction offsets used for every neighbor check.',
    'Creates an empty deque queue that will hold gate and frontier cells.',
    'Row-major seed scan: queues each cell holding 0 so all gates start at distance 0.',
    'Wavefront loop guard: runs while queued cells remain unexpanded.',
    'Copies the front cell for expansion this iteration.',
    'Removes the front cell from the queue after copying it.',
    'Reads the popped row index into r for neighbor math below.',
    'Reads the popped column index into c for neighbor math below.',
    'Starts the four-neighbor loop around the popped cell.',
    'Computes neighbor row nr from r plus the direction offset.',
    'Computes neighbor column nc from c plus the direction offset.',
    'Skips neighbors outside the grid so edges never write out of bounds.',
    'Skips neighbors that are not INF so walls, gates, and settled cells keep values.',
    'Writes neighbor distance as current plus one, the first and shortest arrival.',
    'Queues the freshly written cell so its own neighbors are reached next wave.',
    'Closes the neighbor loop and continues with the next direction.',
    'Closes the wavefront loop; queue empty means every reachable cell is final.',
    'Void return: ends the call with rooms mutated in place and no value.',
    'Structural close of the method scope; no operation.',
    'Structural close of the class scope; no operation.',
  ],
  pseudo: [
    'Function signature: names rooms input; result is in-place mutation, not a return.',
    'Captures rows, cols, and an empty queue for the multi-source wavefront.',
    'Row-major seed: queues each 0 cell so every gate starts at distance 0.',
    'Wavefront loop guard: expands queued cells until none remain.',
    'Dequeues the head cell (r, c) for expansion this iteration.',
    'Starts the four-neighbor loop around the popped cell.',
    'Computes neighbor coordinates nr and nc from direction offsets.',
    'Skips out-of-bounds neighbors so edges never write outside the grid.',
    'Skips non-INF neighbors so walls, gates, and settled cells keep values.',
    'Writes neighbor distance as current plus one, the shortest arrival.',
    'Queues the written cell so the wave continues outward next iteration.',
    'Void return: rooms now holds shortest distances; unreachable cells keep INF.',
  ],
}

export const wallsLesson = {
  idea: 'Seed every gate at distance 0, then BFS outward in place so the first write to an INF cell is its nearest-gate distance.',
  trap: 'BFS per INF cell is O((mn)^2) and DFS depth is not distance; walls (-1) are never queued or written.',
  time: 'O(m*n)',
  space: 'O(m*n)',
  alternative: 'Per-cell BFS from each INF cell to the nearest gate gives the same distances but repeats the search per cell, so it costs O((mn)^2) and serves only as a check oracle, not the shipped method.',
}

export function buildWalls(args) {
  if (!Array.isArray(args) || args.length !== 1) throw new Error('Provide [rooms] (got ' + (Array.isArray(args) ? args.length + ' entries' : typeof args) + ')')
  const source = decodeRooms(args[0])
  const rows = source.length
  const cols = source[0].length
  const work = source.map((row) => row.slice())
  const blocked = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (work[r][c] === WALL) blocked.push([r, c])
  const qq = []
  const filled = []
  const reads = []
  const frames = []
  const anchors = []
  const state = (current, vars) => ({
    current,
    cells: work.map((row) => row.slice()),
    filled: filled.map((p) => p.slice()),
    reads: reads.map((p) => p.slice()),
    frontier: qq.map((p) => p.slice()),
    path: [],
    blocked: blocked.map((p) => p.slice()),
    answer: work.map((row) => row.slice()),
    vars: { rows, cols, ...vars },
  })
  const push = (step, label, note, current, vars = {}) => {
    frames.push(frame(step, label, note, state(current, vars)))
  }
  let gates = 0
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (work[r][c] === GATE) gates++
  push('init', 'Initialize', 'rows=' + rows + ', cols=' + cols + ', gates=' + gates + ', queue empty', null, { gates, queued: 0 })
  anchors.push(0)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      reads.push([r, c])
      if (work[r][c] === GATE) {
        qq.push([r, c])
        if (anchors.length === 1) anchors.push(frames.length)
        push('seed', 'Seed gate (' + r + ',' + c + ')', 'rooms=0 so gate; queued (' + r + ',' + c + ')', [r, c], { gates, queued: qq.length })
      } else if (work[r][c] === WALL) {
        push('seed', 'Skip wall (' + r + ',' + c + ')', 'rooms=-1 wall; never queued or written', [r, c], { gates, queued: qq.length })
      } else {
        push('seed', 'Mark room (' + r + ',' + c + ')', 'rooms=INF unfilled; waits for wave', [r, c], { gates, queued: qq.length })
      }
    }
  }
  let firstUpdateAnchored = false
  while (qq.length > 0) {
    const [r, c] = qq.shift()
    filled.push([r, c])
    push('expand', 'Pop (' + r + ',' + c + ')', 'dequeue (' + r + ',' + c + ') d=' + work[r][c] + '; queue=' + qq.length, [r, c], { d: work[r][c], queued: qq.length })
    for (const [dr, dc] of DIRS) {
      const nr = r + dr
      const nc = c + dc
      const inside = nr >= 0 && nr < rows && nc >= 0 && nc < cols
      if (!inside) {
        push('visit', 'Check outside', 'neighbor (' + (r + dr) + ',' + (c + dc) + ') outside; skip', [r, c], { d: work[r][c] })
        continue
      }
      if (work[nr][nc] !== INF) {
        push('visit', 'Check settled (' + nr + ',' + nc + ')', 'rooms[' + nr + '][' + nc + ']=' + work[nr][nc] + ' not INF; skip', [r, c], { d: work[r][c] })
        continue
      }
      push('visit', 'Check fresh (' + nr + ',' + nc + ')', 'rooms[' + nr + '][' + nc + '] INF; will write d+1', [r, c], { d: work[r][c] })
      work[nr][nc] = work[r][c] + 1
      qq.push([nr, nc])
      if (!firstUpdateAnchored) {
        anchors.push(frames.length)
        firstUpdateAnchored = true
      }
      push('update', 'Write (' + nr + ',' + nc + ')', 'rooms[' + nr + '][' + nc + ']=' + work[nr][nc] + '; queued', [nr, nc], { d: work[nr][nc], queued: qq.length })
    }
  }
  anchors.push(frames.length)
  push('done', 'Done in place', 'queue empty; rooms mutated; INF kept where unreachable', null, { gates, queued: 0 })
  return { kind: 'grid', layout: { rows, cols, cells: source.map((row) => row.slice()) }, frames, result: work.map((row) => row.slice()), anchors }
}

export const adapters = {
  'walls-and-gates': {
    // Honest TEST PROFILE (live judge is null; see header). The real LeetCode
    // profile is void wallsAndGates(rooms) mutated in place.
    signature: SIGNATURE,
    lesson: wallsLesson,
    explain: wallsExplain,
    explainLines: wallsExplainLines,
    code: { java: wallsJava, cpp: wallsCpp, pseudo: wallsPseudo },
    build: buildWalls,
  },
}
