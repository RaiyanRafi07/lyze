import { code, frame } from './semantic-core.js'

const MAX_SIDE = 16

function decodeGrid(value) {
  if (!Array.isArray(value) || value.length === 0) throw new Error('Provide a non-empty binary grid')
  if (value.length > MAX_SIDE) throw new Error('Visual grids are limited to ' + MAX_SIDE + ' rows')
  if (!Array.isArray(value[0])) throw new Error('Every grid row must be an array')
  const cols = value[0].length
  if (cols === 0 || cols > MAX_SIDE) throw new Error('Visual grids are limited to ' + MAX_SIDE + ' columns')
  return value.map((row, r) => {
    if (!Array.isArray(row) || row.length !== cols) throw new Error('Grid must be rectangular')
    return row.map((cell, c) => {
      if (cell === 0 || cell === '0') return 0
      if (cell === 1 || cell === '1') return 1
      throw new Error('grid[' + r + '][' + c + '] must be 0/1 or "0"/"1"')
    })
  })
}

const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]

const nIslandsJava = code(`
[def] class Solution {
[def]     private int rows;
[def]     private int cols;
[def]     public int numIslands(char[][] grid) {
[init]         if (grid == null || grid.length == 0) return 0;
[init]         rows = grid.length;
[init]         cols = grid[0].length;
[init]         int count = 0;
[scan]         for (int r = 0; r < rows; r++) {
[scan]             for (int c = 0; c < cols; c++) {
[check]                 if (grid[r][c] == '1') {
[enter]                     count++;
[dfs]                     dfs(grid, r, c);
[def]                 }
[def]             }
[def]         }
[return]         return count;
[def]     }
[def]     private void dfs(char[][] grid, int r, int c) {
[dfscheck]         if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] != '1') return;
[visit]         grid[r][c] = '0';
[recurse]         dfs(grid, r + 1, c);
[recurse]         dfs(grid, r - 1, c);
[recurse]         dfs(grid, r, c + 1);
[recurse]         dfs(grid, r, c - 1);
[dfsreturn]         return;
[def]     }
[def] }
`)

const nIslandsCpp = code(`
[def] class Solution {
[def] public:
[def]     int numIslands(vector<vector<char>>& grid) {
[init]         if (grid.empty() || grid[0].empty()) return 0;
[init]         int rows = (int)grid.size();
[init]         int cols = (int)grid[0].size();
[init]         int count = 0;
[scan]         for (int r = 0; r < rows; r++) {
[scan]             for (int c = 0; c < cols; c++) {
[check]                 if (grid[r][c] == '1') {
[enter]                     count++;
[dfs]                     dfs(grid, r, c, rows, cols);
[def]                 }
[def]             }
[def]         }
[return]         return count;
[def]     }
[def] private:
[def]     void dfs(vector<vector<char>>& grid, int r, int c, int rows, int cols) {
[dfscheck]         if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] != '1') return;
[visit]         grid[r][c] = '0';
[recurse]         dfs(grid, r + 1, c, rows, cols);
[recurse]         dfs(grid, r - 1, c, rows, cols);
[recurse]         dfs(grid, r, c + 1, rows, cols);
[recurse]         dfs(grid, r, c - 1, rows, cols);
[dfsreturn]         return;
[def]     }
[def] };
`)

const nIslandsPseudo = code(`
[def] numIslands(grid):
[init]   rows = grid.length; cols = grid[0].length; count = 0
[scan]   for r = 0 to rows - 1:
[scan]     for c = 0 to cols - 1:
[check]       if grid[r][c] == 1:
[enter]         count += 1
[dfs]         dfs(r, c)
[return]   return count
[def] dfs(r, c):
[dfscheck]   if r, c outside grid or grid[r][c] != 1: return
[visit]   grid[r][c] = 0
[recurse]   dfs(r+1, c); dfs(r-1, c); dfs(r, c+1); dfs(r, c-1)
[dfsreturn]   return
`)

const maxAreaJava = code(`
[def] class Solution {
[def]     private int rows;
[def]     private int cols;
[def]     public int maxAreaOfIsland(int[][] grid) {
[init]         if (grid == null || grid.length == 0) return 0;
[init]         rows = grid.length;
[init]         cols = grid[0].length;
[init]         int best = 0;
[scan]         for (int r = 0; r < rows; r++) {
[scan]             for (int c = 0; c < cols; c++) {
[check]                 if (grid[r][c] == 1) {
[enter]                     int area = 0;
[dfs]                     area = dfs(grid, r, c);
[update]                     if (area > best) best = area;
[def]                 }
[def]             }
[def]         }
[return]         return best;
[def]     }
[def]     private int dfs(int[][] grid, int r, int c) {
[dfscheck]         if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] != 1) return 0;
[visit]         grid[r][c] = 0;
[recurse]         int total = 1 + dfs(grid, r + 1, c) + dfs(grid, r - 1, c) + dfs(grid, r, c + 1) + dfs(grid, r, c - 1);
[dfsreturn]         return total;
[def]     }
[def] }
`)

const maxAreaCpp = code(`
[def] class Solution {
[def] public:
[def]     int maxAreaOfIsland(vector<vector<int>>& grid) {
[init]         if (grid.empty() || grid[0].empty()) return 0;
[init]         int rows = (int)grid.size();
[init]         int cols = (int)grid[0].size();
[init]         int best = 0;
[scan]         for (int r = 0; r < rows; r++) {
[scan]             for (int c = 0; c < cols; c++) {
[check]                 if (grid[r][c] == 1) {
[enter]                     int area = 0;
[dfs]                     area = dfs(grid, r, c, rows, cols);
[update]                     if (area > best) best = area;
[def]                 }
[def]             }
[def]         }
[return]         return best;
[def]     }
[def] private:
[def]     int dfs(vector<vector<int>>& grid, int r, int c, int rows, int cols) {
[dfscheck]         if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] != 1) return 0;
[visit]         grid[r][c] = 0;
[recurse]         int total = 1 + dfs(grid, r + 1, c, rows, cols) + dfs(grid, r - 1, c, rows, cols) + dfs(grid, r, c + 1, rows, cols) + dfs(grid, r, c - 1, rows, cols);
[dfsreturn]         return total;
[def]     }
[def] };
`)

const maxAreaPseudo = code(`
[def] maxAreaOfIsland(grid):
[init]   rows = grid.length; cols = grid[0].length; best = 0
[scan]   for r = 0 to rows - 1:
[scan]     for c = 0 to cols - 1:
[check]       if grid[r][c] == 1:
[enter]         area = 0
[dfs]         area = dfs(r, c)
[update]         if area > best: best = area
[return]   return best
[def] dfs(r, c):
[dfscheck]   if r, c outside grid or grid[r][c] != 1: return 0
[visit]   grid[r][c] = 0
[recurse]   total = 1 + dfs(r+1, c) + dfs(r-1, c) + dfs(r, c+1) + dfs(r, c-1)
[dfsreturn]   return total
`)

function buildNumber(args) {
  const source = decodeGrid(args[0])
  const rows = source.length
  const cols = source[0].length
  const work = source.map(row => row.slice())
  const filled = []
  const reads = []
  const frontier = []
  const path = []
  const frames = []
  let count = 0
  // Pedagogical anchors for the single compaction pass in semantic.js: island
  // starts, first sink per island, and island-root returns. Never invented events.
  const anchors = []
  let visitAnchorPending = false

  const state = (current, vars) => ({
    current,
    cells: work.map(row => row.slice()),
    filled: filled.map(p => p.slice()),
    reads: reads.map(p => p.slice()),
    frontier: frontier.map(p => p.slice()),
    path: path.map(p => p.slice()),
    answer: count,
    vars: { islands: count, ...vars }
  })
  const push = (step, label, note, current, vars = {}) =>
    frames.push(frame(step, label, note, state(current, vars)))

  push('init', 'Initialize', 'rows=' + rows + ', cols=' + cols + ', count=0', null, { rows, cols })

  function dfs(r, c) {
    // frontier is this invocation's captured land-neighbor list, never the DFS stack.
    frontier.length = 0
    const inside = r >= 0 && r < rows && c >= 0 && c < cols
    if (!inside || work[r][c] !== 1) {
      if (inside) push('dfscheck', 'DFS blocked', 'grid[' + r + '][' + c + '] is water; return', [r, c], { blocked: 1, frontierOwner: null })
      return
    }
    push('dfscheck', 'DFS enter', 'Passed bounds and land check at (' + r + ',' + c + ')', [r, c], { cell: 1, frontierOwner: null })
    work[r][c] = 0
    filled.push([r, c])
    path.push([r, c])
    push('visit', 'Sink land', 'Marked (' + r + ',' + c + ') as water', [r, c], { cell: 0, frontierOwner: null })
    if (visitAnchorPending) {
      anchors.push(frames.length - 1)
      visitAnchorPending = false
    }
    const neighbors = []
    for (const [dr, dc] of dirs) {
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && work[nr][nc] === 1) neighbors.push([nr, nc])
    }
    frontier.push(...neighbors.map(p => p.slice()))
    push('recurse', 'Explore neighbors', 'Captured ' + neighbors.length + ' adjacent land cell(s) for this DFS call', [r, c], { neighbors: neighbors.length, frontierOwner: [r, c] })
    for (const [dr, dc] of dirs) {
      dfs(r + dr, c + dc)
      frontier.length = 0
      frontier.push(...neighbors.map(p => p.slice()))
    }
    // Root return closes the island story; pushed before the final pop while path
    // still holds exactly the island root.
    if (path.length === 1) anchors.push(frames.length)
    push('dfsreturn', 'DFS return', 'Finished neighbors of (' + r + ',' + c + '); return to the caller', [r, c], { frontierOwner: [r, c] })
    path.pop()
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      reads.push([r, c])
      push('scan', 'Scan cell (' + r + ',' + c + ')', 'grid[' + r + '][' + c + '] = ' + work[r][c], [r, c], { cell: work[r][c] })
      if (work[r][c] === 1) {
        count++
        anchors.push(frames.length)
        push('enter', 'New island', 'Land found; island count is now ' + count, [r, c], { cell: 1 })
        visitAnchorPending = true
        dfs(r, c)
        frontier.length = 0
      }
    }
  }

  push('return', 'Return count', 'All cells scanned; answer = ' + count, null, {})
  // Full event list: semantic.js performs the single honest compaction pass.
  return {
    kind: 'grid',
    layout: { rows, cols, cells: source.map(row => row.slice()) },
    frames,
    result: count,
    anchors
  }
}

function buildMaxArea(args) {
  const source = decodeGrid(args[0])
  const rows = source.length
  const cols = source[0].length
  const work = source.map(row => row.slice())
  const filled = []
  const reads = []
  const frontier = []
  const path = []
  const frames = []
  let best = 0
  let area = null
  let visitedArea = 0
  // Pedagogical anchors for the single compaction pass in semantic.js: island
  // starts, first count per island, area assignments, and best updates.
  const anchors = []
  let visitAnchorPending = false

  const state = (current, vars) => ({
    current,
    cells: work.map(row => row.slice()),
    filled: filled.map(p => p.slice()),
    reads: reads.map(p => p.slice()),
    frontier: frontier.map(p => p.slice()),
    path: path.map(p => p.slice()),
    answer: best,
    vars: { best, area, visitedArea, ...vars }
  })
  const push = (step, label, note, current, vars = {}) =>
    frames.push(frame(step, label, note, state(current, vars)))

  push('init', 'Initialize', 'rows=' + rows + ', cols=' + cols + ', best=0', null, { rows, cols })

  function dfs(r, c) {
    // visitedArea is a visualization metric; source local area changes only after DFS.
    frontier.length = 0
    const inside = r >= 0 && r < rows && c >= 0 && c < cols
    if (!inside || work[r][c] !== 1) {
      if (inside) push('dfscheck', 'DFS blocked', 'grid[' + r + '][' + c + '] is water; return 0', [r, c], { blocked: 1, returned: 0, frontierOwner: null })
      return 0
    }
    push('dfscheck', 'DFS enter', 'Passed bounds and land check at (' + r + ',' + c + ')', [r, c], { cell: 1, frontierOwner: null })
    work[r][c] = 0
    filled.push([r, c])
    path.push([r, c])
    visitedArea++
    push('visit', 'Count cell', 'Marked (' + r + ',' + c + ') as water; visited cell count=' + visitedArea, [r, c], { cell: 0, frontierOwner: null })
    if (visitAnchorPending) {
      anchors.push(frames.length - 1)
      visitAnchorPending = false
    }
    const neighbors = []
    for (const [dr, dc] of dirs) {
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && work[nr][nc] === 1) neighbors.push([nr, nc])
    }
    frontier.push(...neighbors.map(p => p.slice()))
    push('recurse', 'Explore neighbors', 'Captured ' + neighbors.length + ' neighbor(s); visited cell count=' + visitedArea, [r, c], { neighbors: neighbors.length, frontierOwner: [r, c] })
    let total = 1
    for (const [dr, dc] of dirs) {
      total += dfs(r + dr, c + dc)
      frontier.length = 0
      frontier.push(...neighbors.map(p => p.slice()))
    }
    push('dfsreturn', 'DFS return', 'DFS at (' + r + ',' + c + ') returns subtotal ' + total, [r, c], { returned: total, frontierOwner: [r, c] })
    path.pop()
    return total
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      reads.push([r, c])
      push('scan', 'Scan cell (' + r + ',' + c + ')', 'grid[' + r + '][' + c + '] = ' + work[r][c], [r, c], { cell: work[r][c] })
      if (work[r][c] === 1) {
        area = 0
        visitedArea = 0
        anchors.push(frames.length)
        push('enter', 'Island start', 'Starting island at (' + r + ',' + c + ') with source area 0', [r, c], { cell: 1 })
        visitAnchorPending = true
        const found = dfs(r, c)
        area = found
        anchors.push(frames.length)
        push('dfs', 'Assign island area', 'Outer DFS returned ' + found + '; source area is now ' + area, [r, c], { found })
        if (area > best) {
          best = area
          anchors.push(frames.length)
          push('update', 'Update best', 'Area ' + area + ' exceeds old best; best=' + best, [r, c], { found: area })
        } else {
          anchors.push(frames.length)
          push('update', 'Keep best', 'Area ' + area + ' does not exceed best ' + best, [r, c], { found: area })
        }
        area = null
        visitedArea = 0
        frontier.length = 0
      }
    }
  }

  push('return', 'Return best', 'All cells scanned; answer = ' + best, null, {})
  // Full event list: semantic.js performs the single honest compaction pass.
  return {
    kind: 'grid',
    layout: { rows, cols, cells: source.map(row => row.slice()) },
    frames,
    result: best,
    anchors
  }
}

// Visual bounds: town labels 1..n, trust pairs as directed edges a->b.
// 1<=n<=8, 0..12 trust pairs with endpoints in 1..n. Over-bound or
// out-of-range inputs reject with a clear Error (never truncated).
const MAX_JUDGE_N = 8;
const MAX_JUDGE_PAIRS = 12;

function failJudge(message) {
  throw new Error(message);
}

function decodeJudgeN(value) {
  let v = value;
  if (typeof v === 'string' && v.trim() !== '') {
    if (/^-?\d+$/.test(v.trim())) v = parseInt(v.trim(), 10);
  }
  if (!Number.isInteger(v)) failJudge('n must be an integer in 1..' + MAX_JUDGE_N + ' (got ' + JSON.stringify(value) + ')');
  if (v < 1 || v > MAX_JUDGE_N) failJudge('Town visual limited to 1..' + MAX_JUDGE_N + ' people (got n=' + v + ')');
  return v;
}

function decodeJudgeTrust(value, n) {
  if (!Array.isArray(value)) failJudge('trust must be an int[][] array (got ' + typeof value + ')');
  if (value.length > MAX_JUDGE_PAIRS) failJudge('Trust visual limited to 0..' + MAX_JUDGE_PAIRS + ' pairs (got ' + value.length + ')');
  return value.map((pair, i) => {
    if (!Array.isArray(pair) || pair.length !== 2) failJudge('trust[' + i + '] must be a pair [a,b] (got ' + JSON.stringify(pair) + ')');
    const a = pair[0];
    const b = pair[1];
    if (!Number.isInteger(a) || !Number.isInteger(b)) failJudge('trust[' + i + '] must hold integers (got ' + JSON.stringify(pair) + ')');
    if (a < 1 || a > n || b < 1 || b > n) failJudge('trust[' + i + ']=[' + a + ',' + b + '] out of range 1..' + n + ' (n=' + n + ')');
    return [a, b];
  });
}

const judgeJava = code(`
[def] class Solution {
[def]     public int findJudge(int n, int[][] trust) {
[init]         int[] indeg = new int[n + 1];
[init]         int[] outdeg = new int[n + 1];
[init]         boolean[][] seen = new boolean[n + 1][n + 1];
[init]         int judge = -1;
[trust]         for (int[] t : trust) { int a = t[0]; int b = t[1]; if (!seen[a][b]) { seen[a][b] = true; outdeg[a]++; indeg[b]++; } }
[scan]         for (int i = 1; i <= n; i++) {
[scan]             if (indeg[i] == n - 1 && outdeg[i] == 0) { judge = i; break; }
[scan]         }
[verdict]         if (judge == -1) return -1;
[done]         return judge;
[def]     }
[def] }
`);

const judgeCpp = code(`
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     int findJudge(int n, vector<vector<int>>& trust) {
[init]         vector<int> indeg(n + 1, 0);
[init]         vector<int> outdeg(n + 1, 0);
[init]         vector<vector<char>> seen(n + 1, vector<char>(n + 1, 0));
[init]         int judge = -1;
[trust]         for (auto& t : trust) { int a = t[0]; int b = t[1]; if (!seen[a][b]) { seen[a][b] = 1; outdeg[a]++; indeg[b]++; } }
[scan]         for (int i = 1; i <= n; i++) {
[scan]             if (indeg[i] == n - 1 && outdeg[i] == 0) { judge = i; break; }
[scan]         }
[verdict]         if (judge == -1) return -1;
[done]         return judge;
[def]     }
[def] };
`);

const judgePseudo = code(`
[def] findJudge(n, trust):
[init]   indeg = [0] * (n + 1); outdeg = [0] * (n + 1); seen = {}; judge = -1
[trust]   for [a, b] in trust: if (a, b) not in seen: seen.add((a, b)); outdeg[a] += 1; indeg[b] += 1
[scan]   for i = 1 to n:
[scan]     if indeg[i] == n - 1 and outdeg[i] == 0: judge = i; break
[verdict]   if judge == -1: return -1
[done]   return judge
`);

function buildTownJudge(args) {
  if (!Array.isArray(args) || args.length !== 2) failJudge('Town walkthrough needs [n, trust] (got ' + (Array.isArray(args) ? args.length + ' entries' : typeof args) + ')');
  const n = decodeJudgeN(args[0]);
  const trust = decodeJudgeTrust(args[1], n);
  const indeg = new Array(n + 1).fill(0);
  const outdeg = new Array(n + 1).fill(0);
  const seen = new Set();
  let judge = -1;
  const frames = [];
  const anchors = [];

  const state = (current, extra) => ({
    current,
    indeg: indeg.slice(1),
    outdeg: outdeg.slice(1),
    answer: judge,
    vars: { n, pairs: trust.length, judge, ...extra }
  });
  const push = (step, label, note, current, extra) => {
    frames.push(frame(step, label, note, state(current, extra)));
  };

  push('init', 'Initialize', 'n=' + n + ', pairs=' + trust.length + '; counts zeroed', null, {});
  anchors.push(0);

  for (let k = 0; k < trust.length; k++) {
    const a = trust[k][0];
    const b = trust[k][1];
    const key = a + ',' + b;
    const first = (k === 0);
    if (seen.has(key)) {
      push('trust', 'Trust ' + a + '->' + b, 'duplicate ' + a + '->' + b + ' ignored; counts unchanged', b, { a, b, k, dup: 1 });
      if (first) anchors.push(frames.length - 1);
      continue;
    }
    seen.add(key);
    outdeg[a]++;
    indeg[b]++;
    push('trust', 'Trust ' + a + '->' + b, a + ' trusts ' + b + ': out[' + a + ']=' + outdeg[a] + ', in[' + b + ']=' + indeg[b], b, { a, b, k });
    if (first) anchors.push(frames.length - 1);
  }
  if (trust.length > 0) {
    const last = trust[trust.length - 1];
    push('trust', 'Counts done', 'all ' + trust.length + ' pairs counted; last ' + last[0] + '->' + last[1], last[1], { counted: trust.length });
  } else {
    push('trust', 'No trust pairs', 'empty trust; all counts stay 0', null, { counted: 0 });
  }

  for (let i = 1; i <= n; i++) {
    const ok = (indeg[i] === n - 1 && outdeg[i] === 0);
    if (ok && judge === -1) judge = i;
    const mark = ok ? 'match' : 'reject';
    push('scan', 'Check ' + i, 'person ' + i + ': in=' + indeg[i] + ' need ' + (n - 1) + ', out=' + outdeg[i] + ' need 0; ' + mark, i, { person: i, ok: ok ? 1 : 0 });
    if (ok && judge === i) anchors.push(frames.length - 1);
  }
  if (judge === -1) {
    // No candidate matched: anchor the final scan so the full sweep survives sampling.
    anchors.push(frames.length - 1);
  }

  if (judge !== -1) {
    push('verdict', 'Verdict judge', 'judge is ' + judge + ': in=' + (n - 1) + ' out=0', judge, { found: judge });
  } else {
    push('verdict', 'Verdict none', 'no candidate has in=' + (n - 1) + ' and out=0; answer -1', null, { found: -1 });
  }
  anchors.push(frames.length - 1);

  push('done', 'Done', 'Done; answer ' + judge, judge === -1 ? null : judge, {});
  anchors.push(frames.length - 1);

  return {
    kind: 'graph',
    layout: {
      n,
      trust: trust.map((p) => p.slice()),
      nodes: Array.from({ length: n }, (_, k) => ({ id: k + 1, label: String(k + 1) })),
      edges: trust.map((p) => p.slice())
    },
    frames,
    result: judge,
    anchors
  };
}

// Visual bounds: rectangular grids of 0 (empty), 1 (fresh), 2 (rotten).
// 1..6 rows x 1..6 cols. Over-bound or ragged inputs reject (never truncate).
const MAX_ROT_ROWS = 6;
const MAX_ROT_COLS = 6;

function decodeRotGrid(value) {
  if (!Array.isArray(value)) throw new Error('Provide grid as int[][] (got ' + typeof value + ')');
  if (value.length < 1 || value.length > MAX_ROT_ROWS) throw new Error('Grid visual limited to 1..' + MAX_ROT_ROWS + ' rows x 1..' + MAX_ROT_COLS + ' cols (got ' + value.length + ' rows)');
  if (!Array.isArray(value[0])) throw new Error('Every grid row must be an array');
  const cols = value[0].length;
  if (cols < 1 || cols > MAX_ROT_COLS) throw new Error('Grid visual limited to 1..' + MAX_ROT_ROWS + ' rows x 1..' + MAX_ROT_COLS + ' cols (got ' + cols + ' cols)');
  return value.map((row, r) => {
    if (!Array.isArray(row) || row.length !== cols) throw new Error('Grid must be rectangular (row ' + r + ' has length ' + (Array.isArray(row) ? row.length : typeof row) + ', expected ' + cols + ')');
    return row.map((cell, c) => {
      if (cell === 0 || cell === '0') return 0;
      if (cell === 1 || cell === '1') return 1;
      if (cell === 2 || cell === '2') return 2;
      throw new Error('grid[' + r + '][' + c + '] must be 0, 1, or 2 (got ' + JSON.stringify(cell) + ')');
    });
  });
}

const ROT_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const rottingJava = code(`
[def] import java.util.*;
[def] class Solution {
[def]     public int orangesRotting(int[][] grid) {
[init]         if (grid == null || grid.length == 0) return 0;
[init]         int rows = grid.length;
[init]         int cols = grid[0].length;
[init]         Queue<int[]> q = new ArrayDeque<>();
[init]         int fresh = 0;
[seed]         for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) if (grid[r][c] == 2) q.offer(new int[]{r, c});
[seed]         for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) if (grid[r][c] == 1) fresh++;
[seed]         if (fresh == 0) return 0;
[round]         int minutes = 0;
[round]         int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
[round]         while (!q.isEmpty() && fresh > 0) {
[round]             int size = q.size();
[spread]             for (int i = 0; i < size; i++) {
[spread]                 int[] cur = q.poll();
[spread]                 for (int[] d : dirs) {
[spread]                     int nr = cur[0] + d[0]; int nc = cur[1] + d[1];
[spread]                     if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] != 1) continue;
[spread]                     grid[nr][nc] = 2; fresh--; q.offer(new int[]{nr, nc});
[spread]                 }
[spread]             }
[round]             minutes++;
[round]         }
[verdict]         if (fresh > 0) return -1;
[done]         return minutes;
[def]     }
[def] }
`);

const rottingCpp = code(`
[def] #include <vector>
[def] #include <queue>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     int orangesRotting(vector<vector<int>>& grid) {
[init]         if (grid.empty() || grid[0].empty()) return 0;
[init]         int rows = (int)grid.size();
[init]         int cols = (int)grid[0].size();
[init]         queue<pair<int,int>> q;
[init]         int fresh = 0;
[seed]         for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) if (grid[r][c] == 2) q.push({r, c});
[seed]         for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) if (grid[r][c] == 1) fresh++;
[seed]         if (fresh == 0) return 0;
[round]         int minutes = 0;
[round]         const int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
[round]         while (!q.empty() && fresh > 0) {
[round]             int size = (int)q.size();
[spread]             for (int i = 0; i < size; i++) {
[spread]                 pair<int,int> cur = q.front(); q.pop();
[spread]                 for (int k = 0; k < 4; k++) {
[spread]                     int nr = cur.first + dirs[k][0]; int nc = cur.second + dirs[k][1];
[spread]                     if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] != 1) continue;
[spread]                     grid[nr][nc] = 2; fresh--; q.push({nr, nc});
[spread]                 }
[spread]             }
[round]             minutes++;
[round]         }
[verdict]         if (fresh > 0) return -1;
[done]         return minutes;
[def]     }
[def] };
`);

const rottingPseudo = code(`
[def] orangesRotting(grid):
[init]   rows = len(grid); cols = len(grid[0]); fresh = 0; q = deque()
[seed]   for each cell (r, c): if grid[r][c] == 2: q.push((r, c))
[seed]   for each cell (r, c): if grid[r][c] == 1: fresh += 1
[seed]   if fresh == 0: return 0
[round]   minutes = 0; dirs = [(1,0), (-1,0), (0,1), (0,-1)]
[round]   while q not empty and fresh > 0:
[round]     size = len(q)
[spread]     repeat size times:
[spread]       (r, c) = q.popleft()
[spread]       for (dr, dc) in dirs:
[spread]         nr, nc = r + dr, c + dc; if outside or grid[nr][nc] != 1: continue
[spread]         grid[nr][nc] = 2; fresh -= 1; q.push((nr, nc))
[round]     minutes += 1
[verdict]   if fresh > 0: return -1
[done]   return minutes
`);

function buildRotting(args) {
  const source = decodeRotGrid(args[0]);
  const rows = source.length;
  const cols = source[0].length;
  const work = source.map((row) => row.slice());
  const queue = [];
  let fresh = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (work[r][c] === 2) queue.push([r, c]);
      if (work[r][c] === 1) fresh++;
    }
  }
  const frames = [];
  const anchors = [];
  let minutes = 0;

  const state = (current, extra) => ({
    current,
    cells: work.map((row) => row.slice()),
    frontier: queue.map((p) => p.slice()),
    answer: minutes,
    vars: { fresh, minutes, rows, cols, ...extra },
  });
  const push = (step, label, note, current, extra) => {
    frames.push(frame(step, label, note, state(current, extra)));
  };

  push('init', 'Initialize', 'rows=' + rows + ', cols=' + cols + ', fresh=' + fresh + ', rotten=' + queue.length, null, { rotten: queue.length });
  anchors.push(0);

  const rottenList = queue.length ? queue.map((p) => '(' + p[0] + ',' + p[1] + ')').join(' ') : 'none';
  push('seed', 'Seed rotten', 'Seeded ' + queue.length + ' rotten: ' + rottenList, queue.length ? queue[0].slice() : null, { rotten: queue.length, seeds: rottenList.slice(0, 60) });
  anchors.push(frames.length - 1);

  if (fresh === 0) {
    push('verdict', 'No fresh', 'No fresh oranges; answer 0', null, { fresh: 0 });
    anchors.push(frames.length - 1);
    push('done', 'Done', 'Done; minutes 0', null, {});
    anchors.push(frames.length - 1);
    return { kind: 'grid', layout: { rows, cols, cells: source.map((row) => row.slice()) }, frames, result: 0, anchors };
  }

  if (queue.length === 0) {
    push('verdict', 'Fresh remain', 'No rotten seeds; ' + fresh + ' fresh unreachable; answer -1', null, { fresh });
    anchors.push(frames.length - 1);
    push('done', 'Done', 'Done; fresh remain; answer -1', null, {});
    anchors.push(frames.length - 1);
    return { kind: 'grid', layout: { rows, cols, cells: source.map((row) => row.slice()) }, frames, result: -1, anchors };
  }

  let head = 0;
  while (head < queue.length && fresh > 0) {
    const size = queue.length - head;
    push('round', 'Minute ' + (minutes + 1), 'Minute ' + (minutes + 1) + ': spread from ' + size + ' cell(s); fresh=' + fresh, queue[head].slice(), { level: minutes + 1, size });
    anchors.push(frames.length - 1);
    let rottedThisRound = 0;
    for (let i = 0; i < size; i++) {
      const cur = queue[head++];
      const cr = cur[0];
      const cc = cur[1];
      for (const [dr, dc] of ROT_DIRS) {
        const nr = cr + dr;
        const nc = cc + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (work[nr][nc] !== 1) continue;
        work[nr][nc] = 2;
        fresh--;
        queue.push([nr, nc]);
        rottedThisRound++;
        push('spread', 'Rot spread', 'Rotted (' + nr + ',' + nc + ') at minute ' + (minutes + 1) + '; fresh=' + fresh, [nr, nc], { rotted: [nr, nc], level: minutes + 1 });
      }
    }
    if (rottedThisRound > 0) {
      minutes++;
    } else {
      break;
    }
  }

  if (fresh > 0) {
    push('verdict', 'Fresh remain', fresh + ' fresh unreachable; answer -1', null, { fresh });
    anchors.push(frames.length - 1);
    push('done', 'Done', 'Done; fresh remain; answer -1', null, {});
    anchors.push(frames.length - 1);
    return { kind: 'grid', layout: { rows, cols, cells: source.map((row) => row.slice()) }, frames, result: -1, anchors };
  }

  push('verdict', 'All rotten', 'All fresh rotted in ' + minutes + ' minute(s)', null, { fresh: 0 });
  anchors.push(frames.length - 1);
  push('done', 'Done', 'Done; minutes ' + minutes, null, {});
  anchors.push(frames.length - 1);
  return { kind: 'grid', layout: { rows, cols, cells: source.map((row) => row.slice()) }, frames, result: minutes, anchors };
}

const MAX_BIN_SIDE = 6;

function decodeBinaryGrid(value) {
  if (!Array.isArray(value) || value.length < 1) throw new Error('Provide a binary matrix with 1..6 rows');
  if (value.length > MAX_BIN_SIDE) throw new Error('Visual grids are limited to 6 rows (got ' + value.length + ')');
  if (!Array.isArray(value[0])) throw new Error('Every grid row must be an array');
  const cols = value[0].length;
  if (cols < 1) throw new Error('Provide a binary matrix with 1..6 columns');
  if (cols > MAX_BIN_SIDE) throw new Error('Visual grids are limited to 6 columns (got ' + cols + ')');
  return value.map((row, r) => {
    if (!Array.isArray(row) || row.length !== cols) throw new Error('Grid must be rectangular: row ' + r + ' has mismatched length');
    return row.map((cell, c) => {
      if (cell === 0 || cell === '0') return 0;
      if (cell === 1 || cell === '1') return 1;
      throw new Error('grid[' + r + '][' + c + '] must be 0/1 or "0"/"1"');
    });
  });
}

const BIN_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const zeroOneJava = code(`
[def] class Solution {
[def]     public int[][] updateMatrix(int[][] mat) {
[init]         int rows = mat.length;
[init]         int cols = mat[0].length;
[init]         int[][] dist = new int[rows][cols];
[init]         java.util.Queue<int[]> qq = new java.util.ArrayDeque<>();
[seed]         for (int r = 0; r < rows; r++) {
[seed]             for (int c = 0; c < cols; c++) {
[seed]                 if (mat[r][c] == 0) { dist[r][c] = 0; qq.offer(new int[]{r, c}); }
[seed]                 else { dist[r][c] = -1; }
[def]             }
[def]         }
[expand]         while (!qq.isEmpty()) {
[expand]             int[] cell = qq.poll();
[expand]             int r = cell[0];
[expand]             int c = cell[1];
[visit]             int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
[visit]             for (int[] d : dirs) {
[visit]                 int nr = r + d[0];
[visit]                 int nc = c + d[1];
[visit]                 if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
[visit]                 if (dist[nr][nc] != -1) continue;
[update]                 dist[nr][nc] = dist[r][c] + 1;
[update]                 qq.offer(new int[]{nr, nc});
[def]             }
[def]         }
[return]         return dist;
[def]     }
[def] }
`);

const zeroOneCpp = code(`
[def] class Solution {
[def] public:
[def]     vector<vector<int>> updateMatrix(vector<vector<int>>& mat) {
[init]         int rows = (int)mat.size();
[init]         int cols = (int)mat[0].size();
[init]         vector<vector<int>> dist(rows, vector<int>(cols, -1));
[init]         queue<pair<int, int>> qq;
[seed]         for (int r = 0; r < rows; r++) {
[seed]             for (int c = 0; c < cols; c++) {
[seed]                 if (mat[r][c] == 0) { dist[r][c] = 0; qq.emplace(r, c); }
[seed]                 else { dist[r][c] = -1; }
[seed]             }
[seed]         }
[expand]         while (!qq.empty()) {
[expand]             auto cell = qq.front();
[expand]             qq.pop();
[expand]             int r = cell.first;
[expand]             int c = cell.second;
[visit]             const int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
[visit]             for (int k = 0; k < 4; k++) {
[visit]                 int nr = r + dirs[k][0];
[visit]                 int nc = c + dirs[k][1];
[visit]                 if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
[visit]                 if (dist[nr][nc] != -1) continue;
[update]                 dist[nr][nc] = dist[r][c] + 1;
[update]                 qq.emplace(nr, nc);
[update]             }
[update]         }
[return]         return dist;
[def]     }
[def] };
`)

const zeroOnePseudo = code(`
[def] updateMatrix(mat):
[init]   rows = mat.length; cols = mat[0].length; dist = matrix(rows, cols, -1); qq = []
[seed]   for r = 0 to rows - 1:
[seed]     for c = 0 to cols - 1:
[seed]       if mat[r][c] == 0: dist[r][c] = 0; qq.push((r, c))
[seed]       else: dist[r][c] = -1
[expand]   while qq not empty:
[expand]     (r, c) = qq.shift()
[visit]     for (dr, dc) in [(1,0), (-1,0), (0,1), (0,-1)]:
[visit]       nr = r + dr; nc = c + dc
[visit]       if nr, nc outside grid: continue
[visit]       if dist[nr][nc] != -1: continue
[update]       dist[nr][nc] = dist[r][c] + 1
[update]       qq.push((nr, nc))
[return]   return dist
`)

function buildZeroOne(args) {
  const source = decodeBinaryGrid(args[0])
  const rows = source.length
  const cols = source[0].length
  const dist = Array.from({ length: rows }, () => Array(cols).fill(-1))
  const qq = []
  const filled = []
  const reads = []
  const frames = []
  const anchors = []

  const state = (current, vars) => ({
    current,
    cells: dist.map(row => row.slice()),
    filled: filled.map(p => p.slice()),
    reads: reads.map(p => p.slice()),
    frontier: qq.map(p => p.slice()),
    path: [],
    answer: dist.map(row => row.slice()),
    vars: { rows, cols, ...vars }
  })
  const push = (step, label, note, current, vars = {}) =>
    frames.push(frame(step, label, note, state(current, vars)))

  push('init', 'Initialize', 'rows=' + rows + ', cols=' + cols + ', dist=-1, queue empty', null, { queued: 0 })

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      reads.push([r, c])
      if (source[r][c] === 0) {
        dist[r][c] = 0
        qq.push([r, c])
        if (anchors.length === 0) anchors.push(frames.length)
        push('seed', 'Seed zero (' + r + ',' + c + ')', 'mat=0 so dist=0; queued (' + r + ',' + c + ')', [r, c], { cell: 0, queued: qq.length })
      } else {
        dist[r][c] = -1
        push('seed', 'Mark one (' + r + ',' + c + ')', 'mat=1 so dist=-1 unvisited', [r, c], { cell: 1, queued: qq.length })
      }
    }
  }

  let firstUpdateAnchored = false
  while (qq.length > 0) {
    const [r, c] = qq.shift()
    filled.push([r, c])
    push('expand', 'Pop (' + r + ',' + c + ')', 'dequeue (' + r + ',' + c + ') d=' + dist[r][c] + '; queue=' + qq.length, [r, c], { d: dist[r][c], queued: qq.length })
    for (const [dr, dc] of BIN_DIRS) {
      const nr = r + dr
      const nc = c + dc
      const inside = nr >= 0 && nr < rows && nc >= 0 && nc < cols
      if (!inside) {
        push('visit', 'Check outside', 'neighbor (' + (r + dr) + ',' + (c + dc) + ') outside; skip', [r, c], { d: dist[r][c] })
        continue
      }
      if (dist[nr][nc] !== -1) {
        push('visit', 'Check settled (' + nr + ',' + nc + ')', 'dist[' + nr + '][' + nc + ']=' + dist[nr][nc] + ' known; skip', [r, c], { d: dist[r][c] })
        continue
      }
      push('visit', 'Check fresh (' + nr + ',' + nc + ')', 'dist[' + nr + '][' + nc + '] unvisited; will write d+1', [r, c], { d: dist[r][c] })
      dist[nr][nc] = dist[r][c] + 1
      qq.push([nr, nc])
      if (!firstUpdateAnchored) {
        anchors.push(frames.length)
        firstUpdateAnchored = true
      }
      push('update', 'Write (' + nr + ',' + nc + ')', 'dist[' + nr + '][' + nc + ']=' + dist[nr][nc] + '; queued', [nr, nc], { d: dist[nr][nc], queued: qq.length })
    }
  }

  anchors.push(frames.length)
  push('return', 'Return distances', 'queue empty; full distance matrix done', null, { queued: 0 })
  // Full event list: the host performs the single honest compaction pass.
  return {
    kind: 'grid',
    layout: { rows, cols, cells: source.map(row => row.slice()) },
    frames,
    result: dist.map(row => row.slice()),
    anchors
  }
}

// Visual bounds: rectangular integer matrix.
// 1..6 rows x 1..6 cols. sr/sc must be in range. Over-bound, ragged,
// non-integer, or out-of-range inputs reject (never truncate).
const MAX_FLOOD_ROWS = 6;
const MAX_FLOOD_COLS = 6;

function decodeFloodImage(value) {
  let grid = value;
  if (typeof grid === 'string') {
    try {
      grid = JSON.parse(grid);
    } catch {
      throw new Error('Provide image as int[][] (got unparseable string)');
    }
  }
  if (!Array.isArray(grid)) throw new Error('Provide image as int[][] (got ' + typeof grid + ')');
  if (grid.length < 1 || grid.length > MAX_FLOOD_ROWS) throw new Error('Grid visual limited to 1..' + MAX_FLOOD_ROWS + ' rows x 1..' + MAX_FLOOD_COLS + ' cols (got ' + grid.length + ' rows)');
  if (!Array.isArray(grid[0])) throw new Error('Every grid row must be an array');
  const cols = grid[0].length;
  if (cols < 1 || cols > MAX_FLOOD_COLS) throw new Error('Grid visual limited to 1..' + MAX_FLOOD_ROWS + ' rows x 1..' + MAX_FLOOD_COLS + ' cols (got ' + cols + ' cols)');
  return grid.map((row, r) => {
    if (!Array.isArray(row) || row.length !== cols) throw new Error('Grid must be rectangular (row ' + r + ' has length ' + (Array.isArray(row) ? row.length : typeof row) + ', expected ' + cols + ')');
    return row.map((cell, c) => {
      if (typeof cell === 'number' && Number.isSafeInteger(cell)) return cell;
      if (typeof cell === 'string' && /^-?\d+$/.test(cell.trim())) return parseInt(cell.trim(), 10);
      throw new Error('grid[' + r + '][' + c + '] must be an integer (got ' + JSON.stringify(cell) + ')');
    });
  });
}

function decodeFloodInt(value, name) {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return parseInt(value.trim(), 10);
  throw new Error('Provide ' + name + ' as an integer (got ' + JSON.stringify(value) + ')');
}

const FLOOD_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const floodJava = code(`
[def] class Solution {
[def]     public int[][] floodFill(int[][] image, int sr, int sc, int color) {
[init]         int rows = image.length;
[init]         int cols = image[0].length;
[init]         int orig = image[sr][sc];
[guard]         if (orig == color) return image;
[guard]         dfs(image, sr, sc, rows, cols, orig, color);
[done]         return image;
[def]     }
[def]     private void dfs(int[][] image, int r, int c, int rows, int cols, int orig, int color) {
[visit]         if (r < 0 || r >= rows || c < 0 || c >= cols || image[r][c] != orig) return;
[paint]         image[r][c] = color;
[recurse]         dfs(image, r + 1, c, rows, cols, orig, color);
[recurse]         dfs(image, r - 1, c, rows, cols, orig, color);
[recurse]         dfs(image, r, c + 1, rows, cols, orig, color);
[recurse]         dfs(image, r, c - 1, rows, cols, orig, color);
[done]         return;
[def]     }
[def] }
`);

const floodCpp = code(`
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     vector<vector<int>> floodFill(vector<vector<int>>& image, int sr, int sc, int color) {
[init]         int rows = (int)image.size();
[init]         int cols = (int)image[0].size();
[init]         int orig = image[sr][sc];
[guard]         if (orig == color) return image;
[guard]         dfs(image, sr, sc, rows, cols, orig, color);
[done]         return image;
[def]     }
[def] private:
[def]     void dfs(vector<vector<int>>& image, int r, int c, int rows, int cols, int orig, int color) {
[visit]         if (r < 0 || r >= rows || c < 0 || c >= cols || image[r][c] != orig) return;
[paint]         image[r][c] = color;
[recurse]         dfs(image, r + 1, c, rows, cols, orig, color);
[recurse]         dfs(image, r - 1, c, rows, cols, orig, color);
[recurse]         dfs(image, r, c + 1, rows, cols, orig, color);
[recurse]         dfs(image, r, c - 1, rows, cols, orig, color);
[done]         return;
[def]     }
[def] };
`);

const floodPseudo = code(`
[def] floodFill(image, sr, sc, color):
[init]   rows = len(image); cols = len(image[0]); orig = image[sr][sc]
[guard]   if orig == color: return image
[guard]   dfs(sr, sc)
[done]   return image
[def] dfs(r, c):
[visit]   if (r, c) outside grid or image[r][c] != orig: return
[paint]   image[r][c] = color
[recurse]   dfs(r+1, c); dfs(r-1, c); dfs(r, c+1); dfs(r, c-1)
[done]   return
`);

function buildFlood(args) {
  if (!Array.isArray(args) || args.length !== 4) throw new Error('Provide [image, sr, sc, color] (got ' + (Array.isArray(args) ? args.length + ' entries' : typeof args) + ')');
  const source = decodeFloodImage(args[0]);
  const rows = source.length;
  const cols = source[0].length;
  const sr = decodeFloodInt(args[1], 'sr');
  const sc = decodeFloodInt(args[2], 'sc');
  const color = decodeFloodInt(args[3], 'color');
  if (sr < 0 || sr >= rows) throw new Error('sr out of range 0..' + (rows - 1) + ' (got ' + sr + ')');
  if (sc < 0 || sc >= cols) throw new Error('sc out of range 0..' + (cols - 1) + ' (got ' + sc + ')');
  const work = source.map((row) => row.slice());
  const orig = work[sr][sc];
  const frames = [];
  const anchors = [];
  const filled = [];
  const path = [];
  let painted = 0;

  const state = (current, extra) => ({
    current,
    cells: work.map((row) => row.slice()),
    filled: filled.map((p) => p.slice()),
    path: path.map((p) => p.slice()),
    answer: work.map((row) => row.slice()),
    vars: { rows, cols, sr, sc, orig, color, painted, ...extra },
  });
  const push = (step, label, note, current, extra) => {
    frames.push(frame(step, label, note, state(current, extra)));
  };

  push('init', 'Initialize', 'rows=' + rows + ', cols=' + cols + ', start=(' + sr + ',' + sc + '), orig=' + orig + ', color=' + color, null, {});
  anchors.push(0);
  push('guard', 'Check start color', 'orig=' + orig + ' vs color=' + color + (orig === color ? '; same; return early' : '; differ; paint DFS'), [sr, sc], {});
  anchors.push(frames.length - 1);

  if (orig === color) {
    push('done', 'Done', 'Done; same color; 0 painted', null, {});
    anchors.push(frames.length - 1);
    return { kind: 'grid', layout: { rows, cols, cells: source.map((row) => row.slice()) }, frames, result: work.map((row) => row.slice()), anchors };
  }

  let firstPaintAnchored = false;

  function dfs(r, c) {
    const inside = r >= 0 && r < rows && c >= 0 && c < cols;
    if (!inside) return;
    if (work[r][c] !== orig) {
      push('visit', 'Skip cell', 'grid[' + r + '][' + c + ']=' + work[r][c] + ' != orig ' + orig + '; return', [r, c], {});
      return;
    }
    push('visit', 'Visit cell', 'Visit (' + r + ',' + c + ')=' + orig + '; matches orig', [r, c], {});
    work[r][c] = color;
    filled.push([r, c]);
    path.push([r, c]);
    painted++;
    push('paint', 'Paint cell', 'Painted (' + r + ',' + c + ') ' + orig + '->' + color, [r, c], {});
    if (!firstPaintAnchored) {
      anchors.push(frames.length - 1);
      firstPaintAnchored = true;
    }
    push('recurse', 'Recurse neighbours', 'From (' + r + ',' + c + ') to 4 neighbours', [r, c], {});
    for (const [dr, dc] of FLOOD_DIRS) {
      dfs(r + dr, c + dc);
    }
    path.pop();
  }

  dfs(sr, sc);

  push('done', 'Done', 'Done; painted ' + painted + ' cell(s)', null, {});
  anchors.push(frames.length - 1);
  return { kind: 'grid', layout: { rows, cols, cells: source.map((row) => row.slice()) }, frames, result: work.map((row) => row.slice()), anchors };
}

// Visual bound: keep room-graph diagrams readable. Over-bound inputs are
// rejected with a clear error (never truncated silently).
const MAX_ROOM_N = 7;
const MAX_ROOM_KEYS = 6;

const roomsJava = code(`
[def] class Solution {
[def]     public boolean canVisitAllRooms(int[][] rooms) {
[init]         int n = rooms.length;
[init]         boolean[] seen = new boolean[n];
[init]         java.util.ArrayDeque<Integer> st = new java.util.ArrayDeque<>();
[init]         seen[0] = true;
[init]         st.push(0);
[visit]         while (!st.isEmpty()) {
[visit]             int cur = st.pop();
[collect]             int[] keys = rooms[cur];
[collect]             for (int key : keys) {
[collect]                 if (key < 0 || key >= n) continue;
[recurse]                 if (!seen[key]) { seen[key] = true; st.push(key); }
[recurse]             }
[visit]         }
[done]         int count = 0;
[done]         for (boolean b : seen) if (b) count++;
[done]         return count == n;
[def]     }
[def] }
`);

const roomsCpp = code(`
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     bool canVisitAllRooms(vector<vector<int>>& rooms) {
[init]         int n = (int)rooms.size();
[init]         vector<char> seen(n, 0);
[init]         vector<int> st; st.reserve(n);
[init]         seen[0] = 1;
[init]         st.push_back(0);
[visit]         while (!st.empty()) {
[visit]             int cur = st.back(); st.pop_back();
[collect]             for (int key : rooms[cur]) {
[collect]                 if (key < 0 || key >= n) continue;
[recurse]                 if (!seen[key]) { seen[key] = 1; st.push_back(key); }
[recurse]             }
[visit]         }
[done]         int count = 0;
[done]         for (char b : seen) if (b) count++;
[done]         return count == n;
[def]     }
[def] };
`);

const roomsPseudo = code(`
[def] canVisitAllRooms(rooms):
[init]   n = len(rooms); seen = [False] * n; st = [0]; seen[0] = True
[visit]   while st is not empty:
[visit]     cur = st.pop()
[collect]     for key in rooms[cur]:
[collect]       if key < 0 or key >= n: continue
[recurse]       if not seen[key]: seen[key] = True; st.push(key)
[done]   count = number of True in seen
[done]   return count == n
`);

function failRooms(message) {
  throw new Error(message);
}

function checkRoomsBound(rooms) {
  if (!Array.isArray(rooms)) failRooms('rooms must be an int[][] array (got ' + typeof rooms + ')');
  const n = rooms.length;
  if (n < 1 || n > MAX_ROOM_N) {
    failRooms('Keys visual limited to 1..' + MAX_ROOM_N + ' rooms (got ' + n + ')');
  }
  for (let i = 0; i < n; i++) {
    const row = rooms[i];
    if (!Array.isArray(row)) failRooms('rooms[' + i + '] must be an array of keys (got ' + typeof row + ')');
    if (row.length > MAX_ROOM_KEYS) {
      failRooms('Room visual limited to 0..' + MAX_ROOM_KEYS + ' keys per room (room ' + i + ' has ' + row.length + ')');
    }
    for (let j = 0; j < row.length; j++) {
      const k = row[j];
      if (!Number.isInteger(k)) failRooms('rooms[' + i + '][' + j + '] must hold integers (got ' + JSON.stringify(k) + ')');
    }
  }
}

function buildRooms(args) {
  if (!Array.isArray(args) || args.length !== 1) failRooms('Keys walkthrough needs [rooms]');
  const input = args[0];
  checkRoomsBound(input);
  // Preserve actual input values: deep copy for layout, never reorder input.
  const rooms = input.map((row) => row.slice());
  const n = rooms.length;
  const edges = [];
  const skipped = [];
  for (let i = 0; i < n; i++) {
    for (const key of rooms[i]) {
      if (Number.isInteger(key) && key >= 0 && key < n) edges.push([i, key]);
      else skipped.push([i, key]);
    }
  }

  const seen = new Array(n).fill(false);
  const stack = [];
  const order = [];
  const frames = [];
  const anchors = [];

  const snap = () => ({
    current: null,
    visited: order.slice(),
    stack: stack.slice(),
    answer: order.length === n,
    vars: { n, visitedCount: order.length, stackLen: stack.length }
  });
  const at = (current, extraVars) => ({
    current,
    visited: order.slice(),
    stack: stack.slice(),
    answer: order.length === n,
    vars: { n, visitedCount: order.length, stackLen: stack.length, ...extraVars }
  });
  const push = (step, label, note, state) => {
    frames.push(frame(step, label, note, state));
  };

  seen[0] = true;
  stack.push(0);
  push('init', 'Initialize', 'n=' + n + ', start room 0; seen=[0]; stack=[0]', snap());
  if (skipped.length > 0) {
    const desc = skipped.map(([a, b]) => a + '->' + b).join(',');
    push('collect', 'Note skipped keys', 'skip ' + skipped.length + ' out-of-range key(s): ' + desc, snap());
  }

  // Explicit-stack DFS from room 0: pop a room, collect its keys in input
  // order, push each unseen valid key. Mirrors the reference loop exactly.
  let firstVisit = true;
  while (stack.length > 0) {
    const cur = stack.pop();
    order.push(cur);
    push('visit', 'Visit room ' + cur, 'enter room ' + cur + '; visited=' + order.length + '/' + n, at(cur, { room: cur }));
    if (firstVisit) {
      anchors.push(frames.length - 1);
      firstVisit = false;
    }
    const keys = rooms[cur];
    const valid = keys.filter((k) => Number.isInteger(k) && k >= 0 && k < n);
    const skippedHere = keys.filter((k) => !(Number.isInteger(k) && k >= 0 && k < n));
    let note = 'room ' + cur + ' holds ' + valid.length + ' key(s)';
    if (valid.length > 0) note += ': [' + valid.join(',') + ']';
    if (skippedHere.length > 0) note += '; skip out-of-range [' + skippedHere.join(',') + ']';
    push('collect', 'Collect keys ' + cur, note, at(cur, { room: cur, keys: valid.length }));
    for (const key of keys) {
      if (!(Number.isInteger(key) && key >= 0 && key < n)) continue;
      if (!seen[key]) {
        seen[key] = true;
        stack.push(key);
        push('recurse', 'Unlock ' + cur + '->' + key, 'key ' + key + ' new; push; stack=[' + stack.join(',') + ']', at(key, { from: cur, to: key }));
        anchors.push(frames.length - 1);
      } else {
        push('recurse', 'Seen ' + key, 'key ' + key + ' already seen; skip push', at(cur, { from: cur, to: key }));
      }
    }
  }

  const count = order.length;
  const complete = count === n;
  if (complete) {
    push('done', 'Verify all visited', 'visited ' + count + '/' + n + '; all rooms open', at(null, { visitedCount: count }));
  } else {
    push('done', 'Verify stuck', 'visited ' + count + '/' + n + '; ' + (n - count) + ' locked -> false', at(null, { visitedCount: count }));
  }
  anchors.push(frames.length - 1);

  return {
    kind: 'graph',
    layout: {
      rooms: rooms.map((row) => row.slice()),
      // Contract-shaped graph nodes/edges: room ids 0..n-1, directed i->key.
      nodes: Array.from({ length: n }, (_, i) => ({ id: i, label: String(i) })),
      edges: edges.map(([a, b]) => [a, b])
    },
    frames,
    result: complete,
    anchors
  };
}

export const adapters = {
  'number-of-islands': {
    signature: { name: 'numIslands', params: ['char[][]'], return: 'int' },
    lesson: {
      idea: 'Every unvisited land cell starts a new island; DFS sinks its whole 4-connected component before the scan continues.',
      trap: 'Counting DFS calls or only walking from (0,0) misses disconnected islands and double-counts land.',
      time: 'O(m*n)',
      space: 'O(m*n)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      check: 'Tests whether current cell holds unclaimed land so water and already sunk cells never start duplicate islands.',
      def: 'Declares solution and helper scope so scanning logic and sinking logic stay separated yet share grid bounds.',
      dfs: 'Starts sinking scope for current component so reachable land is removed before scan resumes.',
      dfscheck: 'Validates bounds and land status before acting so edges and water safely stop recursion without side effects.',
      dfsreturn: 'Returns control after neighbours finish so nested sinking unwinds cleanly without extra counting.',
      enter: 'Credits a new island upon fresh land discovery so each connected component contributes exactly once.',
      init: 'Captures grid dimensions with zeroed count so water only grids naturally yield no islands.',
      recurse: 'Expands sinking to orthogonal neighbours so whole connected shape collapses regardless of outline.',
      return: 'Closes full scan scope and exposes island total so result reflects distinct components including none found.',
      scan: 'Walks every cell in row order so disconnected land regions are all encountered regardless of position.',
      visit: 'Marks current land as water upon entry so revisits are impossible and components cannot merge or recount.'
    },
    code: { java: nIslandsJava, cpp: nIslandsCpp, pseudo: nIslandsPseudo },
    build: buildNumber
  },
  'max-area-of-island': {
    signature: { name: 'maxAreaOfIsland', params: ['int[][]'], return: 'int' },
    lesson: {
      idea: 'DFS returns the count of newly sunk cells in one island, and the scan keeps only the largest such count.',
      trap: 'Updating best with the running area before DFS finishes, or summing diagonals instead of 4-neighbours.',
      time: 'O(m*n)',
      space: 'O(m*n)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      check: 'Tests whether current cell holds unclaimed land so water and already sunk cells never start duplicate measurement.',
      def: 'Declares solution and helper scope so scanning logic and area counting stay separated yet share grid bounds.',
      dfs: 'Invokes counting sink that returns component size so caller learns full extent without partial estimates.',
      dfscheck: 'Guards bounds and land status with empty return for invalid cells so water and edges contribute nothing to totals.',
      dfsreturn: 'Bubbles subtotal upward through recursion so island root receives complete size for comparison.',
      enter: 'Opens measurement scope for fresh land from clean baseline so each island is measured independently.',
      init: 'Sets dimensions with zeroed best so water only grids correctly keep zero as maximum.',
      recurse: 'Combines current cell with all orthogonal neighbour totals so irregular shapes sum completely regardless of layout.',
      return: 'Closes scan scope and exposes largest area so absent land yields zero and otherwise peak size remains.',
      scan: 'Walks every cell in row order so each disconnected land region is measured regardless of position.',
      update: 'Compares fresh island size against retained best and keeps larger so maximum survives across all components.',
      visit: 'Sinks current land and notes one counted cell so each cell contributes exactly once across recursion.'
    },
    code: { java: maxAreaJava, cpp: maxAreaCpp, pseudo: maxAreaPseudo },
    build: buildMaxArea
  },
  'rotting-oranges': {
    signature: { name: 'orangesRotting', params: ['int[][]'], return: 'int' },
    lesson: {
      idea: 'Multi-source BFS from all rotten cells; each queue level is one minute of 4-directional spread.',
      trap: 'DFS or single-source BFS misorders minutes; not tracking fresh count misses the unreachable -1 case.',
      time: 'O(m*n)',
      space: 'O(m*n)'
    },
    explain: {
      def: 'Scope wrapper for the solution; no grid work happens on these lines.',
      init: 'Size rows/cols, open the rotten queue, and count fresh so empty grids can return early.',
      seed: 'Queue every rotten cell and count fresh; a zero fresh count returns 0 at once.',
      round: 'Open one minute: snapshot the queue size so only this level spreads now.',
      spread: 'Rot one fresh 4-neighbor, decrement fresh, and queue it for the next minute.',
      verdict: 'Fresh left means unreachable, so answer -1; else the minute count stands.',
      done: 'Return the final minute count once all fresh rotted or -1 was decided.'
    },
    explainLines: {
      java: {
        10: 'Early exit before any queue work: no fresh means zero minutes.',
        14: 'Level size freezes this minute so next-minute rots wait their turn.',
        23: 'One full level rotted: this minute is now committed.'
      },
      cpp: {
        13: 'Early exit before any queue work: no fresh means zero minutes.',
        17: 'Level size freezes this minute so next-minute rots wait their turn.',
        26: 'One full level rotted: this minute is now committed.'
      },
      pseudo: {
        4: 'Early exit before any queue work: no fresh means zero minutes.',
        7: 'Level size freezes this minute so next-minute rots wait their turn.',
        13: 'One full level rotted: this minute is now committed.'
      }
    },
    explain: {
      def: 'Scope wrapper for the solution; no grid work happens on these lines.',
      init: 'Size rows/cols, open the rotten queue, and count fresh so empty grids can return early.',
      seed: 'Queue every rotten cell and count fresh; a zero fresh count returns 0 at once.',
      round: 'Open one minute: snapshot the queue size so only this level spreads now.',
      spread: 'Rot one fresh 4-neighbor, decrement fresh, and queue it for the next minute.',
      verdict: 'Fresh left means unreachable, so answer -1; else the minute count stands.',
      done: 'Return the final minute count once all fresh rotted or -1 was decided.'
    },
    explainLines: {
      java: {
        10: 'Early exit before any queue work: no fresh means zero minutes.',
        14: 'Level size freezes this minute so next-minute rots wait their turn.',
        23: 'One full level rotted: this minute is now committed.'
      },
      cpp: {
        13: 'Early exit before any queue work: no fresh means zero minutes.',
        17: 'Level size freezes this minute so next-minute rots wait their turn.',
        26: 'One full level rotted: this minute is now committed.'
      },
      pseudo: {
        4: 'Early exit before any queue work: no fresh means zero minutes.',
        7: 'Level size freezes this minute so next-minute rots wait their turn.',
        13: 'One full level rotted: this minute is now committed.'
      }
    },
    explain: {
      def: 'Scope wrapper for the solution; no grid work happens on these lines.',
      init: 'Size rows/cols, open the rotten queue, and count fresh so empty grids can return early.',
      seed: 'Queue every rotten cell and count fresh; a zero fresh count returns 0 at once.',
      round: 'Open one minute: snapshot the queue size so only this level spreads now.',
      spread: 'Rot one fresh 4-neighbor, decrement fresh, and queue it for the next minute.',
      verdict: 'Fresh left means unreachable, so answer -1; else the minute count stands.',
      done: 'Return the final minute count once all fresh rotted or -1 was decided.'
    },
    explainLines: {
      java: {
        10: 'Early exit before any queue work: no fresh means zero minutes.',
        14: 'Level size freezes this minute so next-minute rots wait their turn.',
        23: 'One full level rotted: this minute is now committed.'
      },
      cpp: {
        13: 'Early exit before any queue work: no fresh means zero minutes.',
        17: 'Level size freezes this minute so next-minute rots wait their turn.',
        26: 'One full level rotted: this minute is now committed.'
      },
      pseudo: {
        4: 'Early exit before any queue work: no fresh means zero minutes.',
        7: 'Level size freezes this minute so next-minute rots wait their turn.',
        13: 'One full level rotted: this minute is now committed.'
      }
    },
    explain: {
      def: 'Scope wrapper for the solution; no grid work happens on these lines.',
      init: 'Size rows/cols, open the rotten queue, and count fresh so empty grids can return early.',
      seed: 'Queue every rotten cell and count fresh; a zero fresh count returns 0 at once.',
      round: 'Open one minute: snapshot the queue size so only this level spreads now.',
      spread: 'Rot one fresh 4-neighbor, decrement fresh, and queue it for the next minute.',
      verdict: 'Fresh left means unreachable, so answer -1; else the minute count stands.',
      done: 'Return the final minute count once all fresh rotted or -1 was decided.'
    },
    explainLines: {
      java: {
        10: 'Early exit before any queue work: no fresh means zero minutes.',
        14: 'Level size freezes this minute so next-minute rots wait their turn.',
        23: 'One full level rotted: this minute is now committed.'
      },
      cpp: {
        13: 'Early exit before any queue work: no fresh means zero minutes.',
        17: 'Level size freezes this minute so next-minute rots wait their turn.',
        26: 'One full level rotted: this minute is now committed.'
      },
      pseudo: {
        4: 'Early exit before any queue work: no fresh means zero minutes.',
        7: 'Level size freezes this minute so next-minute rots wait their turn.',
        13: 'One full level rotted: this minute is now committed.'
      }
    },
    code: { java: rottingJava, cpp: rottingCpp, pseudo: rottingPseudo },
    build: buildRotting
  },
  '01-matrix': {
    signature: { name: 'updateMatrix', params: ['int[][]'], return: 'int[][]' },
    lesson: {
      idea: 'Seed every zero at distance 0, then BFS outward so the first write to a cell is its nearest-zero distance.',
      trap: 'BFS per 1-cell is O((mn)^2); DFS depth is not distance. One multi-source wavefront fixes both.',
      time: 'O(m*n)',
      space: 'O(m*n)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      def: 'Declares solution scope so the grid transform stays inside updateMatrix with shared bounds.',
      expand: 'Pops the next wavefront cell so distances spread in nondecreasing order from all zeros.',
      init: 'Sizes rows, cols, distance grid, and queue so seeding starts from a clean unvisited state.',
      return: 'Closes the BFS scope and exposes the full distance matrix once the queue drains.',
      seed: 'Writes 0 for zero cells and queues them while marking ones unvisited for later waves.',
      update: 'Writes neighbor distance as current plus one and queues it so it spreads the next wave.',
      visit: 'Checks one orthogonal neighbor for bounds and visited state before any distance write.'
    },
    code: { java: zeroOneJava, cpp: zeroOneCpp, pseudo: zeroOnePseudo },
    build: buildZeroOne
  },
  'flood-fill': {
    signature: { name: 'floodFill', params: ['int[][]', 'int', 'int', 'int'], return: 'int[][]' },
    lesson: {
      idea: 'Paint the start cell, then DFS 4-neighbours that still hold the original color until the region is filled.',
      trap: 'Skipping the orig==color guard repaints forever; only 4-neighbours count, never diagonals.',
      time: 'O(m*n)',
      space: 'O(m*n)'
    },
    code: { java: floodJava, cpp: floodCpp, pseudo: floodPseudo },
    build: buildFlood
  },
  'keys-and-rooms': {
    signature: { name: 'canVisitAllRooms', params: ['int[][]'], return: 'boolean' },
    lesson: {
      idea: 'Start in room 0 and DFS: visit a room, collect its keys, push each unseen valid key and repeat.',
      trap: 'Room 0 starts open; a key inside its own locked room never helps; count visited rooms, not keys.',
      time: 'O(N+E)',
      space: 'O(N)'
    },
    code: { java: roomsJava, cpp: roomsCpp, pseudo: roomsPseudo },
    build: buildRooms
  },
  'find-the-town-judge': {
    signature: { name: 'findJudge', params: ['int', 'int[][]'], return: 'int' },
    lesson: {
      idea: 'Count trust given and taken: the judge is trusted by n-1 people and trusts nobody.',
      trap: 'Returning anyone with n-1 fans who also trusts someone; n=1 with no trust is judge 1.',
      time: 'O(n+m)',
      space: 'O(n)'
    },
    code: { java: judgeJava, cpp: judgeCpp, pseudo: judgePseudo },
    build: buildTownJudge
  }
}
