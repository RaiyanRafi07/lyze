import { code, frame, boundedFrames } from './semantic-core.js'

const MAX_SIDE = 6

function decodeMatrix(value) {
  if (!Array.isArray(value) || value.length === 0) throw new Error('Provide a non-empty matrix with 1..6 rows for this walkthrough')
  if (value.length > MAX_SIDE) throw new Error('Visual grids are limited to ' + MAX_SIDE + ' rows (got ' + value.length + '); larger grids are rejected, never truncated')
  if (!Array.isArray(value[0])) throw new Error('Every matrix row must be an array')
  const cols = value[0].length
  if (cols === 0) throw new Error('Provide a non-empty matrix: rows must contain at least 1 column')
  if (cols > MAX_SIDE) throw new Error('Visual grids are limited to ' + MAX_SIDE + ' columns (got ' + cols + '); larger grids are rejected, never truncated')
  return value.map((row, r) => {
    if (!Array.isArray(row) || row.length !== cols) throw new Error('Matrix must be rectangular: row 0 has ' + cols + ' columns but row ' + r + ' has ' + (Array.isArray(row) ? row.length : 'non-array'))
    return row.map((cell, c) => {
      if (typeof cell !== 'number' || !Number.isSafeInteger(cell)) throw new Error('matrix[' + r + '][' + c + '] must be an integer')
      return cell
    })
  })
}

const spiralJava = code(`
[def] class Solution {
[def]     public List<Integer> spiralOrder(int[][] matrix) {
[init]         List<Integer> ans = new ArrayList<>();
[init]         if (matrix == null || matrix.length == 0 || matrix[0].length == 0) return ans;
[init]         int rows = matrix.length, cols = matrix[0].length;
[init]         int top = 0, bottom = rows - 1, left = 0, right = cols - 1;
[layer]         while (top <= bottom && left <= right) {
[top]             for (int c = left; c <= right; c++) {
[visit]                 ans.add(matrix[top][c]);
[top]             }
[top]             top++;
[right]             if (top <= bottom) {
[right]                 for (int r = top; r <= bottom; r++) {
[visit]                     ans.add(matrix[r][right]);
[right]                 }
[right]                 right--;
[right]             }
[bottom]             if (top <= bottom && left <= right) {
[bottom]                 for (int c = right; c >= left; c--) {
[visit]                     ans.add(matrix[bottom][c]);
[bottom]                 }
[bottom]                 bottom--;
[bottom]             }
[left]             if (left <= right && top <= bottom) {
[left]                 for (int r = bottom; r >= top; r--) {
[visit]                     ans.add(matrix[r][left]);
[left]                 }
[left]                 left++;
[left]             }
[layer]         }
[done]         return ans;
[def]     }
[def] }
`)

const spiralCpp = code(`
[def] class Solution {
[def] public:
[def]     vector<int> spiralOrder(vector<vector<int>>& matrix) {
[init]         vector<int> ans;
[init]         if (matrix.empty() || matrix[0].empty()) return ans;
[init]         int rows = (int)matrix.size(), cols = (int)matrix[0].size();
[init]         int top = 0, bottom = rows - 1, left = 0, right = cols - 1;
[layer]         while (top <= bottom && left <= right) {
[top]             for (int c = left; c <= right; ++c) {
[visit]                 ans.push_back(matrix[top][c]);
[top]             }
[top]             ++top;
[right]             if (top <= bottom) {
[right]                 for (int r = top; r <= bottom; ++r) {
[visit]                     ans.push_back(matrix[r][right]);
[right]                 }
[right]                 --right;
[right]             }
[bottom]             if (top <= bottom && left <= right) {
[bottom]                 for (int c = right; c >= left; --c) {
[visit]                     ans.push_back(matrix[bottom][c]);
[bottom]                 }
[bottom]                 --bottom;
[bottom]             }
[left]             if (left <= right && top <= bottom) {
[left]                 for (int r = bottom; r >= top; --r) {
[visit]                     ans.push_back(matrix[r][left]);
[left]                 }
[left]                 ++left;
[left]             }
[layer]         }
[done]         return ans;
[def]     }
[def] };
`)

const spiralPseudo = code(`
[def] spiralOrder(matrix):
[init]   ans = []; rows = matrix.length; cols = matrix[0].length
[init]   top = 0; bottom = rows - 1; left = 0; right = cols - 1
[layer]   while top <= bottom and left <= right:
[top]     for c = left to right:
[visit]       ans.append(matrix[top][c])
[top]     top += 1
[right]     if top <= bottom:
[right]       for r = top to bottom:
[visit]         ans.append(matrix[r][right])
[right]       right -= 1
[bottom]     if top <= bottom and left <= right:
[bottom]       for c = right down to left:
[visit]         ans.append(matrix[bottom][c])
[bottom]       bottom -= 1
[left]     if left <= right and top <= bottom:
[left]       for r = bottom down to top:
[visit]         ans.append(matrix[r][left])
[left]       left += 1
[done]   return ans
`)

function build(args) {
  const source = decodeMatrix(args[0])
  const rows = source.length
  const cols = source[0].length
  const emitted = []
  const filled = []
  const reads = []
  const path = []
  const frames = []
  let top = 0
  let bottom = rows - 1
  let left = 0
  let right = cols - 1
  let layer = 0
  const state = (current, vars) => ({
    current,
    cells: source.map(row => row.slice()),
    filled: filled.map(p => p.slice()),
    reads: reads.map(p => p.slice()),
    frontier: [],
    path: path.map(p => p.slice()),
    answer: emitted.slice(),
    vars: { rows, cols, top, bottom, left, right, layer, ...vars }
  })
  const push = (step, label, note, current, vars = {}) =>
    frames.push(frame(step, label, note, state(current, vars)))
  const emit = (r, c) => {
    emitted.push(source[r][c])
    filled.push([r, c])
    reads.push([r, c])
    path.push([r, c])
    push('visit', 'Emit (' + r + ',' + c + ')', 'matrix[' + r + '][' + c + '] = ' + source[r][c] + ' becomes output #' + emitted.length, [r, c], { value: source[r][c], emitted: emitted.length })
  }
  push('init', 'Initialize', 'rows=' + rows + ', cols=' + cols + ', top=0, bottom=' + bottom + ', left=0, right=' + right, null, { rows, cols })
  while (top <= bottom && left <= right) {
    layer++
    push('layer', 'Start layer ' + layer, 'bounds top=' + top + ', bottom=' + bottom + ', left=' + left + ', right=' + right, null, {})
    push('top', 'Walk top row', 'row=' + top + ', cols ' + left + '..' + right, [top, left], {})
    for (let c = left; c <= right; c++) emit(top, c)
    top++
    if (top <= bottom) {
      push('right', 'Walk right column', 'col=' + right + ', rows ' + top + '..' + bottom, [top, right], {})
      for (let r = top; r <= bottom; r++) emit(r, right)
      right--
    }
    if (top <= bottom && left <= right) {
      push('bottom', 'Walk bottom row', 'row=' + bottom + ', cols ' + right + '..' + left, [bottom, right], {})
      for (let c = right; c >= left; c--) emit(bottom, c)
      bottom--
    }
    if (left <= right && top <= bottom) {
      push('left', 'Walk left column', 'col=' + left + ', rows ' + bottom + '..' + top, [bottom, left], {})
      for (let r = bottom; r >= top; r--) emit(r, left)
      left++
    }
  }
  push('done', 'Return spiral order', 'Emitted ' + emitted.length + ' of ' + (rows * cols) + ' cells; answer=[' + emitted.join(',') + ']', null, {})
  return {
    kind: 'grid',
    layout: { rows, cols, cells: source.map(row => row.slice()) },
    frames,
    result: emitted.slice()
  }
}

const pacificJava = code(`
[def] class Solution {
[def]     public List<List<Integer>> pacificAtlantic(int[][] heights) {
[init]         int rows = heights.length, cols = heights[0].length;
[init]         boolean[][] pac = new boolean[rows][cols];
[init]         boolean[][] atl = new boolean[rows][cols];
[init]         Deque<int[]> q = new ArrayDeque<>();
[seed]         for (int c = 0; c < cols; c++) { pac[0][c] = true; q.add(new int[]{0, c}); }
[seed]         for (int r = 1; r < rows; r++) { pac[r][0] = true; q.add(new int[]{r, 0}); }
[passdone]         bfs(heights, pac, q);
[init]         q.clear();
[seed]         for (int c = 0; c < cols; c++) { atl[rows - 1][c] = true; q.add(new int[]{rows - 1, c}); }
[seed]         for (int r = 0; r < rows - 1; r++) { atl[r][cols - 1] = true; q.add(new int[]{r, cols - 1}); }
[passdone]         bfs(heights, atl, q);
[collect]         List<List<Integer>> ans = new ArrayList<>();
[collect]         for (int r = 0; r < rows; r++)
[collect]             for (int c = 0; c < cols; c++)
[collect]                 if (pac[r][c] && atl[r][c]) ans.add(List.of(r, c));
[done]         return ans;
[def]     }
[def]     private void bfs(int[][] h, boolean[][] seen, Deque<int[]> q) {
[accept]         int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
[accept]         while (!q.isEmpty()) {
[accept]             int[] cur = q.poll();
[accept]             for (int[] d : dirs) {
[accept]                 int nr = cur[0] + d[0], nc = cur[1] + d[1];
[reject]                 if (nr < 0 || nr >= h.length || nc < 0 || nc >= h[0].length) continue;
[reject]                 if (seen[nr][nc]) continue;
[reject]                 if (h[nr][nc] < h[cur[0]][cur[1]]) continue;
[accept]                 seen[nr][nc] = true;
[accept]                 q.add(new int[]{nr, nc});
[accept]             }
[accept]         }
[def]     }
[def] }
`)

const pacificCpp = code(`
[def] class Solution {
[def] public:
[def]     vector<vector<int>> pacificAtlantic(vector<vector<int>>& heights) {
[init]         int rows = (int)heights.size(), cols = (int)heights[0].size();
[init]         vector<vector<char>> pac(rows, vector<char>(cols, 0));
[init]         vector<vector<char>> atl(rows, vector<char>(cols, 0));
[init]         queue<pair<int,int>> q;
[seed]         for (int c = 0; c < cols; ++c) { pac[0][c] = 1; q.emplace(0, c); }
[seed]         for (int r = 1; r < rows; ++r) { pac[r][0] = 1; q.emplace(r, 0); }
[passdone]         bfs(heights, pac, q);
[init]         queue<pair<int,int>>().swap(q);
[seed]         for (int c = 0; c < cols; ++c) { atl[rows-1][c] = 1; q.emplace(rows-1, c); }
[seed]         for (int r = 0; r < rows-1; ++r) { atl[r][cols-1] = 1; q.emplace(r, cols-1); }
[passdone]         bfs(heights, atl, q);
[collect]         vector<vector<int>> ans;
[collect]         for (int r = 0; r < rows; ++r)
[collect]             for (int c = 0; c < cols; ++c)
[collect]                 if (pac[r][c] && atl[r][c]) ans.push_back({r, c});
[done]         return ans;
[def]     }
[def] private:
[def]     void bfs(vector<vector<int>>& h, vector<vector<char>>& seen, queue<pair<int,int>>& q) {
[accept]         const int dirs[4][2] = {{1,0},{-1,0},{0,1},{0,-1}};
[accept]         while (!q.empty()) {
[accept]             auto [r, c] = q.front(); q.pop();
[accept]             for (auto& d : dirs) {
[accept]                 int nr = r + d[0], nc = c + d[1];
[reject]                 if (nr < 0 || nr >= (int)h.size() || nc < 0 || nc >= (int)h[0].size()) continue;
[reject]                 if (seen[nr][nc]) continue;
[reject]                 if (h[nr][nc] < h[r][c]) continue;
[accept]                 seen[nr][nc] = 1;
[accept]                 q.emplace(nr, nc);
[accept]             }
[accept]         }
[def]     }
[def] };
`)

const pacificPseudo = code(`
[def] pacificAtlantic(heights):
[init]   rows, cols = size(heights)
[init]   pac = falses(rows, cols); atl = falses(rows, cols)
[seed]   pacSeeds = top row + left column; atlSeeds = bottom row + right column
[accept]   bfs(seen, seeds): queue = seeds marked seen
[accept]     while queue not empty: pop (r, c)
[accept]       for each 4-neighbor (nr, nc):
[reject]         if outside grid or seen: continue
[reject]         if heights[nr][nc] < heights[r][c]: continue
[accept]         mark seen; push (nr, nc)
[passdone]   bfs(pac, pacSeeds); bfs(atl, atlSeeds)
[collect]   ans = [(r, c) for all cells where pac and atl]
[done]   return ans
`)

function buildPacific(args) {
  const source = decodeMatrix(args[0])
  const rows = source.length, cols = source[0].length
  const pac = Array.from({ length: rows }, () => Array(cols).fill(false))
  const atl = Array.from({ length: rows }, () => Array(cols).fill(false))
  const frames = []
  const pairs = (mat) => {
    const out = []
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (mat[r][c]) out.push([r, c])
    return out
  }
  const stateOf = (current, phase, extra = {}) => ({
    current,
    cells: source.map((row) => row.slice()),
    pacific: pairs(pac),
    atlantic: pairs(atl),
    frontier: (extra.frontier || []).map((p) => p.slice()),
    blocked: (extra.blocked || []).map((p) => p.slice()),
    candidate: extra.candidate || null,
    phase,
    vars: { rows, cols, ...(extra.vars || {}) },
  })
  const push = (step, label, note, current, phase, extra) =>
    frames.push(frame(step, label, String(note).slice(0, 140), stateOf(current, phase, extra)))
  const DIRS = [[1, 0, 'down'], [-1, 0, 'up'], [0, 1, 'right'], [0, -1, 'left']]
  push('init', 'Set up island', 'rows=' + rows + ', cols=' + cols + '; Pacific=top+left, Atlantic=bottom+right', null, 'pacific', { vars: {} })
  const anchors = [0]
  function reverseBfs(seeds, mat, phase, oceanName) {
    const q = []
    for (const [r, c] of seeds) {
      if (!mat[r][c]) {
        mat[r][c] = true
        q.push([r, c])
        push('seed', 'Seed ' + oceanName, 'Border cell (' + r + ',' + c + ') h=' + source[r][c] + ' touches ' + oceanName, [r, c], phase, { frontier: q, vars: { h: source[r][c] } })
      }
    }
    anchors.push(frames.length - 1)
    while (q.length) {
      const [r, c] = q.shift()
      const h = source[r][c]
      for (const [dr, dc, dir] of DIRS) {
        const nr = r + dr, nc = c + dc
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
        if (mat[nr][nc]) continue
        const nh = source[nr][nc]
        if (nh >= h) {
          mat[nr][nc] = true
          q.push([nr, nc])
          push('accept', 'Reach (' + nr + ',' + nc + ')', '(' + nr + ',' + nc + ') h=' + nh + ' >= (' + r + ',' + c + ') h=' + h + ' ' + dir + '; queue=' + q.length, [nr, nc], phase, { frontier: q, candidate: [nr, nc], vars: { h, nh, dir, ok: true, queue: q.length } })
        } else {
          push('reject', 'Cannot reach (' + nr + ',' + nc + ')', '(' + nr + ',' + nc + ') h=' + nh + ' < (' + r + ',' + c + ') h=' + h + ' ' + dir + '; water cannot climb', [r, c], phase, { frontier: q, blocked: [[nr, nc]], candidate: [nr, nc], vars: { h, nh, dir, ok: false, queue: q.length } })
        }
      }
    }
    anchors.push(frames.length - 1)
    push('passdone', oceanName + ' pass done', oceanName + ' reaches ' + pairs(mat).length + ' cell(s)', null, phase, { frontier: [], vars: {} })
  }
  const pacSeeds = []
  for (let c = 0; c < cols; c++) pacSeeds.push([0, c])
  for (let r = 1; r < rows; r++) pacSeeds.push([r, 0])
  const atlSeeds = []
  for (let c = 0; c < cols; c++) atlSeeds.push([rows - 1, c])
  for (let r = 0; r < rows - 1; r++) atlSeeds.push([r, cols - 1])
  reverseBfs(pacSeeds, pac, 'pacific', 'Pacific')
  reverseBfs(atlSeeds, atl, 'atlantic', 'Atlantic')
  const both = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (pac[r][c] && atl[r][c]) both.push([r, c])
  both.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
  push('collect', 'Intersect', both.length + ' cell(s) reach both oceans; answer listed', null, 'collect', { vars: {} })
  frames[frames.length - 1].state.both = both.map((p) => p.slice())
  frames[frames.length - 1].state.answer = both.map((p) => p.slice())
  frames[frames.length - 1].state.result = both.map((p) => p.slice())
  const { frames: out } = boundedFrames(frames, 40, anchors)
  return { kind: 'grid', layout: { rows, cols, cells: source.map((r) => r.slice()) }, frames: out, result: both.map((p) => p.slice()) }
}

export const adapters = {
  'spiral-matrix': {
    signature: { name: 'spiralOrder', params: ['int[][]'], return: 'int[]' },
    lesson: {
      idea: 'Walk the boundary layer by layer: top row, right column, bottom row, left column, then shrink all four bounds inward and repeat.',
      trap: 'Re-entering the bottom row or left column without re-checking both bounds duplicates the middle row/column on single-row, single-column, or odd-sized layers.',
      time: 'O(m*n)',
      space: 'O(1) extra besides the O(m*n) output list'
    },
    // Per-line explanations (presentation metadata, never compiled).
    // Staged source: .workers/jobs/neetcode150-completion/spiral-matrix/adapter-spiral-matrix.mjs
    // (spiralMatrixExplain/spiralMatrixExplainLines); live code blocks verified
    // byte-identical to staged, so index-keyed notes apply cleanly.
    explain: {
      def: 'Scope of the spiral task returning visited values in boundary order; execution starts in the body.',
      init: 'Capture grid size and set four bounds to the outermost unvisited ring before any walk.',
      layer: 'Announce the current ring from its four bounds; each pass peels exactly one outer layer.',
      top: 'Walk the top edge left to right, then shrink the top bound so those cells cannot repeat.',
      right: 'Walk the right edge top to bottom when rows remain, then shrink the right bound inward.',
      bottom: 'Walk the bottom edge right to left when a fresh span remains, then shrink the bound upward.',
      left: 'Walk the left edge bottom to top when spans remain, then shrink the left bound inward.',
      visit: 'Emit one cell value into output order; each cell is emitted exactly once.',
      done: 'Return the accumulated output after every cell has been emitted exactly once.'
    },
    explainLines: {
      java: {
        30: 'End of the layer loop: no fresh ring remains, so control falls through to the return.',
        31: 'End of the method scope; the returned list above exits with every cell in spiral order.',
        32: 'End of the class scope; it performs no algorithm operation.'
      },
      cpp: {
        31: 'End of the layer loop: no fresh ring remains, so control falls through to the return.',
        32: 'End of the method scope; the returned list above exits with every cell in spiral order.',
        33: 'End of the class scope; it performs no algorithm operation.'
      },
      pseudo: {}
    },
    code: { java: spiralJava, cpp: spiralCpp, pseudo: spiralPseudo },
    build
  },
  'pacific-atlantic-water-flow': {
    signature: { name: 'pacificAtlantic', params: ['int[][]'], return: 'int[][]' },
    lesson: {
      idea: 'Reverse the flow: start BFS from each ocean’s border cells and only climb uphill (neighbor height >= current), then intersect the two reachable sets.',
      trap: 'Forward DFS from every cell re-tests the same slopes and risks deep recursion; seeding from the shores visits each cell at most once per ocean.',
      time: 'O(m*n)',
      space: 'O(m*n)'
    },
    // Staged source: .workers/jobs/question-owners-150/pacific-atlantic-water-flow/{adapter.js,reference.js}
    // (reverse-BFS operation, oracle, line notes, genuine downhill-DFS alternate).
    explain: {
      def: 'Scope of the two-ocean task returning cells that drain to both shores; execution starts in the body.',
      init: 'Cache dimensions and allocate two visited tables, one per ocean, before any seeding.',
      seed: 'Seed the queue with border cells touching the ocean: top row plus left column for Pacific, bottom row plus right column for Atlantic.',
      accept: 'Accept an uphill neighbor (neighbor height >= current height) and enqueue it: the ocean can climb to it, so water can drain down from it.',
      reject: 'Reject a downhill neighbor (neighbor height < current height): reverse search cannot climb down, so this edge carries no flow.',
      passdone: 'Drain the queue: every reachable cell for this ocean is now marked exactly once.',
      collect: 'Intersect the two reachable sets in row-major order: a cell drains to both oceans iff both tables mark it.',
      done: 'Return the intersection after both passes agree on every cell.'
    },
    explainLines: {
      java: {
        34: 'End of the BFS loop: the queue is empty, so every uphill-reachable cell is marked.',
        35: 'End of the helper scope; control returns to the pass that drained the queue.',
        36: 'End of the class scope; it performs no algorithm operation.'
      },
      cpp: {
        35: 'End of the BFS loop: the queue is empty, so every uphill-reachable cell is marked.',
        36: 'End of the helper scope; control returns to the pass that drained the queue.',
        37: 'End of the class scope; it performs no algorithm operation.'
      },
      pseudo: {}
    },
    code: { java: pacificJava, cpp: pacificCpp, pseudo: pacificPseudo },
    build: buildPacific
  }
}
