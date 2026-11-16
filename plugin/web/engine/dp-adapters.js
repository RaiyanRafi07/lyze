import { code, frame, stringInput } from './semantic-core.js'

const VISUAL = 12

function emptyGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(null))
}

function buildEditDistance(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('minDistance expects two string arguments')
  const word1 = stringInput(args[0], VISUAL)
  const word2 = stringInput(args[1], VISUAL)
  const m = word1.length
  const n = word2.length
  const rows = m + 1
  const cols = n + 1
  const cells = emptyGrid(rows, cols)
  const filled = []
  const frames = []

  frames.push(frame('init', 'Allocate DP table', `Created a ${rows} x ${cols} table with every cell unset.`, { current: null, cells, filled, reads: [], answer: null }))

  for (let i = 0; i <= m; i++) {
    cells[i][0] = i
    filled.push([i, 0])
    frames.push(frame('base', `Base dp[${i}][0] = ${i}`, `First column: turning ${i} characters into the empty string needs ${i} deletes.`, { current: [i, 0], cells, filled, reads: [], answer: null }))
  }
  for (let j = 1; j <= n; j++) {
    cells[0][j] = j
    filled.push([0, j])
    frames.push(frame('base', `Base dp[0][${j}] = ${j}`, `First row: turning the empty string into ${j} characters needs ${j} inserts.`, { current: [0, j], cells, filled, reads: [], answer: null }))
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const a = word1[i - 1]
      const b = word2[j - 1]
      if (a === b) {
        cells[i][j] = cells[i - 1][j - 1]
        filled.push([i, j])
        frames.push(frame('equal', `dp[${i}][${j}] = ${cells[i][j]}`, `'${a}' equals '${b}', so copy the diagonal dp[${i - 1}][${j - 1}] = ${cells[i][j]}.`, { current: [i, j], cells, filled, reads: [[i - 1, j - 1]], answer: null }))
      } else {
        cells[i][j] = 1 + Math.min(cells[i - 1][j - 1], cells[i - 1][j], cells[i][j - 1])
        filled.push([i, j])
        frames.push(frame('replace', `dp[${i}][${j}] = ${cells[i][j]}`, `'${a}' differs from '${b}': 1 + min(diagonal, up, left) = ${cells[i][j]}.`, { current: [i, j], cells, filled, reads: [[i - 1, j - 1], [i - 1, j], [i, j - 1]], answer: null }))
      }
    }
  }

  const answer = cells[m][n]
  frames.push(frame('return', `Return dp[${m}][${n}] = ${answer}`, `The minimum edit distance is ${answer}.`, { current: [m, n], cells, filled, reads: [], answer: [m, n], vars: { answer } }))

  return { kind: 'grid', layout: { rows, cols, cells: emptyGrid(rows, cols), rowLabels: ['∅', ...word1], colLabels: ['∅', ...word2] }, frames, result: answer }
}

function buildLcs(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('longestCommonSubsequence expects two string arguments')
  const text1 = stringInput(args[0], VISUAL)
  const text2 = stringInput(args[1], VISUAL)
  const m = text1.length
  const n = text2.length
  const rows = m + 1
  const cols = n + 1
  const cells = emptyGrid(rows, cols)
  const filled = []
  const frames = []

  frames.push(frame('init', 'Allocate DP table', `Created a ${rows} x ${cols} table with every cell unset.`, { current: null, cells, filled, reads: [], answer: null }))

  for (let i = 0; i <= m; i++) {
    cells[i][0] = 0
    filled.push([i, 0])
    frames.push(frame('base', `Base dp[${i}][0] = 0`, `An empty second prefix shares a subsequence of length 0 with ${i} characters.`, { current: [i, 0], cells, filled, reads: [], answer: null }))
  }
  for (let j = 1; j <= n; j++) {
    cells[0][j] = 0
    filled.push([0, j])
    frames.push(frame('base', `Base dp[0][${j}] = 0`, `An empty first prefix shares a subsequence of length 0 with ${j} characters.`, { current: [0, j], cells, filled, reads: [], answer: null }))
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const a = text1[i - 1]
      const b = text2[j - 1]
      if (a === b) {
        cells[i][j] = cells[i - 1][j - 1] + 1
        filled.push([i, j])
        frames.push(frame('match', `dp[${i}][${j}] = ${cells[i][j]}`, `'${a}' matches '${b}', so extend the diagonal by 1: ${cells[i - 1][j - 1]} + 1 = ${cells[i][j]}.`, { current: [i, j], cells, filled, reads: [[i - 1, j - 1]], answer: null }))
      } else {
        cells[i][j] = Math.max(cells[i - 1][j], cells[i][j - 1])
        filled.push([i, j])
        frames.push(frame('skip', `dp[${i}][${j}] = ${cells[i][j]}`, `'${a}' differs from '${b}': max(up ${cells[i - 1][j]}, left ${cells[i][j - 1]}) = ${cells[i][j]}.`, { current: [i, j], cells, filled, reads: [[i - 1, j], [i, j - 1]], answer: null }))
      }
    }
  }

  const answer = cells[m][n]
  frames.push(frame('return', `Return dp[${m}][${n}] = ${answer}`, `The longest common subsequence length is ${answer}.`, { current: [m, n], cells, filled, reads: [], answer: [m, n], vars: { answer } }))

  return { kind: 'grid', layout: { rows, cols, cells: emptyGrid(rows, cols), rowLabels: ['∅', ...text1], colLabels: ['∅', ...text2] }, frames, result: answer }
}

// Visual bound covers the dataset (3,7): 7x7 fills 49 cells plus base events,
// which the host compacts to 40; larger grids are rejected, never truncated.
const UNIQUE_MAX_SIDE = 7

function buildUniquePaths(args) {
  if (!Array.isArray(args) || args.length !== 2) {
    throw new Error('uniquePaths expects two integer arguments [m, n]')
  }
  const m = args[0]
  const n = args[1]
  if (!Number.isInteger(m) || !Number.isInteger(n)) {
    throw new Error('uniquePaths expects integer m, n (got ' + JSON.stringify(m) + ', ' + JSON.stringify(n) + ')')
  }
  if (m < 1 || m > UNIQUE_MAX_SIDE || n < 1 || n > UNIQUE_MAX_SIDE) {
    throw new Error(
      'Visual grids are limited to 1..' + UNIQUE_MAX_SIDE + ' rows and columns (got m=' + m + ', n=' + n + '); larger grids are rejected, never truncated'
    )
  }
  const rows = m
  const cols = n
  const cells = Array.from({ length: rows }, () => new Array(cols).fill(null))
  const filled = []
  const frames = []
  const vars = { m, n }

  frames.push(frame('init', 'Allocate DP table', 'Made a ' + m + ' x ' + n + ' table; every cell starts unset.', {
    current: null, cells, filled, reads: [], answer: null, vars: { ...vars }
  }))

  for (let j = 0; j < n; j++) {
    cells[0][j] = 1
    filled.push([0, j])
    frames.push(frame('base', 'Base dp[0][' + j + '] = 1', 'First row: only right moves reach it, so dp[0][' + j + '] = 1.', {
      current: [0, j], cells, filled, reads: [], answer: null, vars: { ...vars }
    }))
  }
  for (let i = 1; i < m; i++) {
    cells[i][0] = 1
    filled.push([i, 0])
    frames.push(frame('base', 'Base dp[' + i + '][0] = 1', 'First column: only down moves reach it, so dp[' + i + '][0] = 1.', {
      current: [i, 0], cells, filled, reads: [], answer: null, vars: { ...vars }
    }))
  }

  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      const up = cells[i - 1][j]
      const left = cells[i][j - 1]
      const value = up + left
      cells[i][j] = value
      filled.push([i, j])
      frames.push(frame('fill', 'dp[' + i + '][' + j + '] = ' + value, 'dp[' + i + '][' + j + '] = up ' + up + ' + left ' + left + ' = ' + value + '.', {
        current: [i, j], cells, filled, reads: [[i - 1, j], [i, j - 1]], answer: null, vars: { ...vars, value }
      }))
    }
  }

  const answer = cells[m - 1][n - 1]
  frames.push(frame('return', 'Return dp[' + (m - 1) + '][' + (n - 1) + '] = ' + answer, 'Corner dp[' + (m - 1) + '][' + (n - 1) + '] = ' + answer + ' is the path count.', {
    current: [m - 1, n - 1], cells, filled, reads: [], answer: [m - 1, n - 1], vars: { ...vars, answer }
  }))

  const rowLabels = Array.from({ length: rows }, (_, i) => String(i))
  const colLabels = Array.from({ length: cols }, (_, j) => String(j))
  return {
    kind: 'grid',
    layout: {
      rows,
      cols,
      cells: Array.from({ length: rows }, () => new Array(cols).fill(null)),
      rowLabels,
      colLabels
    },
    frames,
    result: answer
  }
}

const uniquePathsJava = code(`
[ctx]class Solution {
[ctx]    public int uniquePaths(int m, int n) {
[init]        int[][] dp = new int[m][n];
[base]        for (int j = 0; j < n; j++) dp[0][j] = 1;
[base]        for (int i = 1; i < m; i++) dp[i][0] = 1;
[ctx]        for (int i = 1; i < m; i++) {
[ctx]            for (int j = 1; j < n; j++) {
[fill]                dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
[ctx]            }
[ctx]        }
[return]        return dp[m - 1][n - 1];
[ctx]    }
[ctx]}
`)

const uniquePathsCpp = code(`
[ctx]#include <vector>
[ctx]using namespace std;
[ctx]class Solution {
[ctx]public:
[ctx]    int uniquePaths(int m, int n) {
[init]        vector<vector<int>> dp(m, vector<int>(n, 0));
[base]        for (int j = 0; j < n; j++) dp[0][j] = 1;
[base]        for (int i = 1; i < m; i++) dp[i][0] = 1;
[ctx]        for (int i = 1; i < m; i++) {
[ctx]            for (int j = 1; j < n; j++) {
[fill]                dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
[ctx]            }
[ctx]        }
[return]        return dp[m - 1][n - 1];
[ctx]    }
[ctx]};
`)

const uniquePathsPseudo = code(`
[ctx]function uniquePaths(m, n)
[init]  dp = m x n table filled with 0
[base]  for j = 0..n-1: dp[0][j] = 1
[base]  for i = 1..m-1: dp[i][0] = 1
[ctx]  for i = 1..m-1:
[ctx]    for j = 1..n-1:
[fill]      dp[i][j] = dp[i-1][j] + dp[i][j-1]
[return]  return dp[m-1][n-1]
`)

const MAX_SQUARE_SIDE = 5

function normalizeSquareMatrix(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_SQUARE_SIDE) {
    throw new Error(
      'maximalSquare visual expects a rectangular binary matrix with 1..5 rows (got ' +
        (Array.isArray(input) ? input.length : typeof input) + ' rows); larger inputs are rejected, never truncated'
    )
  }
  const rows = input.length
  let cols = -1
  const grid = []
  for (let i = 0; i < rows; i++) {
    const row = input[i]
    if (!Array.isArray(row) || row.length < 1 || row.length > MAX_SQUARE_SIDE) {
      throw new Error(
        'maximalSquare visual expects 1..5 columns per row (got row ' + i + ' with ' +
          (Array.isArray(row) ? row.length : typeof row) + ' entries); larger inputs are rejected, never truncated'
      )
    }
    if (cols === -1) cols = row.length
    if (row.length !== cols) {
      throw new Error(
        'maximalSquare visual expects a rectangular matrix (row 0 has ' + cols +
          ' columns but row ' + i + ' has ' + row.length + ')'
      )
    }
    const out = []
    for (let j = 0; j < row.length; j++) {
      const v = row[j]
      if (v === '1' || v === 1) out.push('1')
      else if (v === '0' || v === 0) out.push('0')
      else {
        throw new Error(
          "maximalSquare visual expects only '0'/'1' (or 0/1) cells (got " +
            JSON.stringify(v) + ' at [' + i + '][' + j + '])'
        )
      }
    }
    grid.push(out)
  }
  return { rows, cols, grid }
}

function buildMaximalSquare(args) {
  if (!Array.isArray(args) || args.length !== 1) {
    throw new Error('maximalSquare expects one matrix argument [matrix]')
  }
  const { rows, cols, grid } = normalizeSquareMatrix(args[0])
  const cells = Array.from({ length: rows }, () => new Array(cols).fill(null))
  const filled = []
  const frames = []
  let best = 0
  let bi = -1
  let bj = -1

  frames.push(frame('init', 'Allocate DP table', 'Made a ' + rows + 'x' + cols + ' dp table; best side starts at 0.', {
    current: null, cells, filled, reads: [], answer: null, vars: { rows, cols, best }
  }))

  for (let j = 0; j < cols; j++) {
    const bit = grid[0][j] === '1' ? 1 : 0
    cells[0][j] = bit
    filled.push([0, j])
    frames.push(frame('base', 'Base dp[0][' + j + '] = ' + bit, bit === 1 ? 'First row copy: matrix cell is 1, so dp = 1.' : 'First row copy: matrix cell is 0, so dp = 0.', {
      current: [0, j], cells, filled, reads: [], answer: null, vars: { rows, cols, best }
    }))
    if (bit > best) {
      best = bit
      bi = 0
      bj = j
      frames.push(frame('best', 'Best side = ' + best, 'New largest side ' + best + ' ends at (0,' + j + ').', {
        current: [0, j], cells, filled, reads: [], answer: null, vars: { rows, cols, best }
      }))
    }
  }
  for (let i = 1; i < rows; i++) {
    const bit = grid[i][0] === '1' ? 1 : 0
    cells[i][0] = bit
    filled.push([i, 0])
    frames.push(frame('base', 'Base dp[' + i + '][0] = ' + bit, bit === 1 ? 'First column copy: matrix cell is 1, so dp = 1.' : 'First column copy: matrix cell is 0, so dp = 0.', {
      current: [i, 0], cells, filled, reads: [], answer: null, vars: { rows, cols, best }
    }))
    if (bit > best) {
      best = bit
      bi = i
      bj = 0
      frames.push(frame('best', 'Best side = ' + best, 'New largest side ' + best + ' ends at (' + i + ',0).', {
        current: [i, 0], cells, filled, reads: [], answer: null, vars: { rows, cols, best }
      }))
    }
  }

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (grid[i][j] === '1') {
        const up = cells[i - 1][j]
        const left = cells[i][j - 1]
        const diag = cells[i - 1][j - 1]
        let edge = up
        if (left < edge) edge = left
        if (diag < edge) edge = diag
        const value = edge + 1
        cells[i][j] = value
        filled.push([i, j])
        frames.push(frame('fill', 'dp[' + i + '][' + j + '] = ' + value, 'Cell is 1: 1 + min(up ' + up + ', left ' + left + ', diag ' + diag + ') = ' + value + '.', {
          current: [i, j], cells, filled, reads: [[i - 1, j], [i, j - 1], [i - 1, j - 1]], answer: null, vars: { rows, cols, best }
        }))
        if (value > best) {
          best = value
          bi = i
          bj = j
          frames.push(frame('best', 'Best side = ' + best, 'New largest side ' + best + ' ends at (' + i + ',' + j + ').', {
            current: [i, j], cells, filled, reads: [[i - 1, j], [i, j - 1], [i - 1, j - 1]], answer: null, vars: { rows, cols, best }
          }))
        }
      } else {
        cells[i][j] = 0
        filled.push([i, j])
        frames.push(frame('fill', 'dp[' + i + '][' + j + '] = 0', 'Cell is 0: no square ends here, so dp = 0.', {
          current: [i, j], cells, filled, reads: [], answer: null, vars: { rows, cols, best }
        }))
      }
    }
  }

  const answer = best * best
  frames.push(frame('return', 'Return ' + best + '*' + best + ' = ' + answer, 'Largest side ' + best + ' gives area ' + answer + '.', {
    current: best > 0 ? [bi, bj] : null, cells, filled, reads: [], answer: best > 0 ? [bi, bj] : null, vars: { rows, cols, best, answer }
  }))

  const rowLabels = Array.from({ length: rows }, (_, i) => String(i))
  const colLabels = Array.from({ length: cols }, (_, j) => String(j))
  return {
    kind: 'grid',
    layout: {
      rows,
      cols,
      cells: grid.map((r) => r.slice()),
      rowLabels,
      colLabels
    },
    frames,
    result: answer
  }
}

const maximalSquareJava = code(`
[ctx]class Solution {
[ctx]    public int maximalSquare(char[][] matrix) {
[ctx]        int rows = matrix.length;
[ctx]        int cols = matrix[0].length;
[init]        int[][] dp = new int[rows][cols];
[init]        int best = 0;
[base]        for (int j = 0; j < cols; j++) dp[0][j] = (matrix[0][j] == '1' ? 1 : 0);
[base]        for (int i = 1; i < rows; i++) dp[i][0] = (matrix[i][0] == '1' ? 1 : 0);
[best]        for (int j = 0; j < cols; j++) if (dp[0][j] > best) best = dp[0][j];
[best]        for (int i = 1; i < rows; i++) if (dp[i][0] > best) best = dp[i][0];
[ctx]        for (int i = 1; i < rows; i++) {
[ctx]            for (int j = 1; j < cols; j++) {
[ctx]                if (matrix[i][j] == '1') {
[fill]                    int up = dp[i - 1][j];
[fill]                    int left = dp[i][j - 1];
[fill]                    int diag = dp[i - 1][j - 1];
[fill]                    int edge = up < left ? (up < diag ? up : diag) : (left < diag ? left : diag);
[fill]                    dp[i][j] = edge + 1;
[ctx]                } else {
[fill]                    dp[i][j] = 0;
[ctx]                }
[best]                if (dp[i][j] > best) best = dp[i][j];
[ctx]            }
[ctx]        }
[return]        return best * best;
[ctx]    }
[ctx]}
`)

const maximalSquareCpp = code(`
[ctx]#include <vector>
[ctx]using namespace std;
[ctx]class Solution {
[ctx]public:
[ctx]    int maximalSquare(vector<vector<char>>& matrix) {
[ctx]        int rows = (int)matrix.size();
[ctx]        int cols = (int)matrix[0].size();
[init]        vector<vector<int>> dp(rows, vector<int>(cols, 0));
[init]        int best = 0;
[base]        for (int j = 0; j < cols; j++) dp[0][j] = (matrix[0][j] == '1' ? 1 : 0);
[base]        for (int i = 1; i < rows; i++) dp[i][0] = (matrix[i][0] == '1' ? 1 : 0);
[best]        for (int j = 0; j < cols; j++) if (dp[0][j] > best) best = dp[0][j];
[best]        for (int i = 1; i < rows; i++) if (dp[i][0] > best) best = dp[i][0];
[ctx]        for (int i = 1; i < rows; i++) {
[ctx]            for (int j = 1; j < cols; j++) {
[ctx]                if (matrix[i][j] == '1') {
[fill]                    int up = dp[i - 1][j];
[fill]                    int left = dp[i][j - 1];
[fill]                    int diag = dp[i - 1][j - 1];
[fill]                    int edge = up < left ? (up < diag ? up : diag) : (left < diag ? left : diag);
[fill]                    dp[i][j] = edge + 1;
[ctx]                } else {
[fill]                    dp[i][j] = 0;
[ctx]                }
[best]                if (dp[i][j] > best) best = dp[i][j];
[ctx]            }
[ctx]        }
[return]        return best * best;
[ctx]    }
[ctx]};
`)

const maximalSquarePseudo = code(`
[ctx]function maximalSquare(matrix)
[ctx]  rows = height(matrix); cols = width(matrix)
[init]  dp = rows x cols table filled with 0
[init]  best = 0
[base]  for j = 0..cols-1: dp[0][j] = (matrix[0][j] == 1 ? 1 : 0)
[base]  for i = 1..rows-1: dp[i][0] = (matrix[i][0] == 1 ? 1 : 0)
[best]  for j = 0..cols-1: best = max(best, dp[0][j])
[best]  for i = 1..rows-1: best = max(best, dp[i][0])
[ctx]  for i = 1..rows-1:
[ctx]    for j = 1..cols-1:
[ctx]      if matrix[i][j] == 1:
[fill]        dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
[ctx]      else:
[fill]        dp[i][j] = 0
[best]      best = max(best, dp[i][j])
[return]  return best * best
`)

/* ------------------------- house-robber-ii (Blind75, P01) ------------------------- */
// Circular non-adjacent sum: answer = max(linear(nums[0..n-2]), linear(nums[1..n-1])).
// Staged packet .workers/jobs/delivery-sprint-20261107/house-robber-ii (repaired from
// wave50 01-house-robber-ii); generic helper names HRII-prefixed for file-local
// collision safety. Walkthrough bound n<=12 / values 0..1000; judge keeps 1..100.

const HRII_MAX_N = 12
const HRII_MIN_V = 0
const HRII_MAX_V = 1000

function decodeHouseRobberII(value) {
  if (!Array.isArray(value)) throw new Error('house-robber-ii visual expects one integer array [nums]')
  if (value.length < 1 || value.length > HRII_MAX_N) {
    throw new Error(`house-robber-ii visual needs 1..${HRII_MAX_N} houses (got ${value.length}); larger inputs are rejected, never truncated`)
  }
  for (let k = 0; k < value.length; k++) {
    if (!Number.isSafeInteger(value[k])) throw new Error(`nums[${k}] must be a safe integer (got ${JSON.stringify(value[k])})`)
    if (value[k] < HRII_MIN_V || value[k] > HRII_MAX_V) {
      throw new Error(`house-robber-ii visual needs values 0..1000 (nums[${k}]=${value[k]} given)`)
    }
  }
  return value.slice()
}

// Canonical O(1)-space linear scan over one inclusive interval. Records the
// real locals (prev2/prev1/take/skip/cur) for every index so frames below map
// 1:1 to executed operations on actual input values.
function traceHouseRobberII(nums, lo, hi) {
  let prev2 = 0
  let prev1 = 0
  const events = []
  for (let i = lo; i <= hi; i++) {
    const take = prev2 + nums[i]
    const skip = prev1
    const cur = take > skip ? take : skip
    events.push({ i, prev2, prev1, take, skip, cur })
    prev2 = prev1
    prev1 = cur
  }
  return { best: prev1, events }
}

const houseRobberIIJava = code(`
[structure] class Solution {
[signature]     public int rob(int[] nums) {
[edge]         int n = nums.length;
[edge]         if (n == 1) return nums[0];
[branch]         int excludeLast = robLinear(nums, 0, n - 2);
[branch]         int excludeFirst = robLinear(nums, 1, n - 1);
[return]         return Math.max(excludeLast, excludeFirst);
[structure]     }
[structure]     private int robLinear(int[] nums, int lo, int hi) {
[init]         int prev2 = 0;
[init]         int prev1 = 0;
[loop]         for (int i = lo; i <= hi; i++) {
[decide]             int take = prev2 + nums[i];
[decide]             int skip = prev1;
[decide]             int cur = Math.max(skip, take);
[roll]             prev2 = prev1;
[roll]             prev1 = cur;
[structure]         }
[done]         return prev1;
[structure]     }
[structure] }
`)

const houseRobberIICpp = code(`
[structure] #include <vector>
[structure] #include <algorithm>
[structure] using namespace std;
[structure] class Solution {
[structure] public:
[signature]     int rob(vector<int>& nums) {
[edge]         int n = (int)nums.size();
[edge]         if (n == 1) return nums[0];
[branch]         int excludeLast = robLinear(nums, 0, n - 2);
[branch]         int excludeFirst = robLinear(nums, 1, n - 1);
[return]         return max(excludeLast, excludeFirst);
[structure]     }
[structure]     int robLinear(vector<int>& nums, int lo, int hi) {
[init]         int prev2 = 0;
[init]         int prev1 = 0;
[loop]         for (int i = lo; i <= hi; i++) {
[decide]             int take = prev2 + nums[i];
[decide]             int skip = prev1;
[decide]             int cur = max(skip, take);
[roll]             prev2 = prev1;
[roll]             prev1 = cur;
[structure]         }
[done]         return prev1;
[structure]     }
[structure] };
`)

const houseRobberIIPseudo = code(`
[signature] rob(nums): n = length(nums)
[edge]   if n == 1: return nums[0]
[branch]   excludeLast = robLinear(nums, 0, n - 2); excludeFirst = robLinear(nums, 1, n - 1)
[return]   return max(excludeLast, excludeFirst)
[signature] robLinear(nums, lo, hi): scan one interval with two rolling bests
[init]   prev2 = 0; prev1 = 0
[loop]   for i from lo to hi:
[decide]     take = prev2 + nums[i]; skip = prev1; cur = max(skip, take)
[roll]     prev2 = prev1; prev1 = cur
[done]   return prev1
`)

function buildHouseRobberII(args) {
  if (!Array.isArray(args) || args.length !== 1) {
    throw new Error('house-robber-ii visual expects one argument [nums]')
  }
  const nums = decodeHouseRobberII(args[0])
  const n = nums.length
  const frames = []
  const anchors = {}

  frames.push(frame('init', 'Circular street',
    n === 1
      ? 'One house in the circle; no adjacency conflict is possible.'
      : `${n} houses in a circle; house 0 neighbors house ${n - 1}.`,
    { values: new Array(n).fill(null) }))
  anchors.overview = [0]

  if (n === 1) {
    frames.push(frame('edge', 'Single house',
      `No pair exists, so the answer is nums[0] = ${nums[0]}.`,
      { pointers: { i: 0 }, highlights: { 0: 'ok' }, values: [nums[0]], vars: { answer: nums[0] } }))
    frames.push(frame('return', `Return ${nums[0]}`,
      `The lone house holds ${nums[0]}.`,
      { pointers: { i: 0 }, highlights: { 0: 'ok' }, values: [nums[0]], vars: { answer: nums[0] } }))
    anchors.detail = [0, 1, 2]
    return { kind: 'array', layout: { values: nums.slice() }, frames, result: nums[0], anchors }
  }

  frames.push(frame('branch', 'Split the circle',
    `Case A robs 0..${n - 2} (skips ${nums[n - 1]}); B robs 1..${n - 1} (skips ${nums[0]}).`,
    { vars: { skipA: nums[n - 1], skipB: nums[0] } }))
  anchors.overview.push(1)

  // Case A: linear scan over [0, n-2]. state.values is an EXPLANATORY
  // prefix-best metric (best loot through each house); the ACTUAL rolling
  // source locals travel in vars (prev2/prev1/take/skip/cur).
  const traceA = traceHouseRobberII(nums, 0, n - 2)
  const metricA = new Array(n).fill(null)
  let writes = 0
  for (const e of traceA.events) {
    metricA[e.i] = e.cur
    writes++
    // The current house keeps 'accent': neighbour keys that collide with it are
    // dropped instead of overwriting via last-write-wins.
    const hlA = { [String(e.i)]: 'accent' }
    const kA2 = String(Math.max(0, e.i - 2)), kA1 = String(Math.max(0, e.i - 1))
    if (kA2 !== String(e.i)) hlA[kA2] = e.take > e.skip ? 'ok' : 'dim'
    if (kA1 !== String(e.i)) hlA[kA1] = e.take > e.skip ? 'dim' : 'ok'
    frames.push(frame('decide', `A: i = ${e.i}`,
      `take ${e.prev2}+${nums[e.i]}=${e.take}; skip ${e.skip}; best ${e.cur}; carry ${e.prev1},${e.cur}.`,
      {
        pointers: { i: e.i },
        highlights: hlA,
        values: metricA.slice(),
        vars: { c: 'A', i: e.i, take: e.take, skip: e.skip, cur: e.cur, prev2: e.prev1, prev1: e.cur },
        ops: { cmp: e.i + 1, writes }
      }))
  }
  frames.push(frame('done', `Case A best = ${traceA.best}`,
    `Best without house ${n - 1} is ${traceA.best}.`,
    { highlights: { [String(n - 2)]: 'ok' }, values: metricA.slice(), vars: { bestA: traceA.best } }))
  anchors.overview.push(frames.length - 1)

  // Case B: linear scan over [1, n-1].
  const traceB = traceHouseRobberII(nums, 1, n - 1)
  const metricB = new Array(n).fill(null)
  for (const e of traceB.events) {
    metricB[e.i] = e.cur
    writes++
    const hlB = { [String(e.i)]: 'accent' }
    const kB2 = String(Math.max(1, e.i - 2)), kB1 = String(Math.max(1, e.i - 1))
    if (kB2 !== String(e.i)) hlB[kB2] = e.take > e.skip ? 'ok' : 'dim'
    if (kB1 !== String(e.i)) hlB[kB1] = e.take > e.skip ? 'dim' : 'ok'
    frames.push(frame('decide', `B: i = ${e.i}`,
      `take ${e.prev2}+${nums[e.i]}=${e.take}; skip ${e.skip}; best ${e.cur}; carry ${e.prev1},${e.cur}.`,
      {
        pointers: { i: e.i },
        highlights: hlB,
        values: metricB.slice(),
        vars: { c: 'B', i: e.i, take: e.take, skip: e.skip, cur: e.cur, prev2: e.prev1, prev1: e.cur },
        ops: { cmp: e.i, writes }
      }))
  }
  frames.push(frame('done', `Case B best = ${traceB.best}`,
    `Best without house 0 is ${traceB.best}.`,
    { highlights: { [String(n - 1)]: 'ok' }, values: metricB.slice(), vars: { bestB: traceB.best } }))
  anchors.overview.push(frames.length - 1)

  const answer = traceA.best > traceB.best ? traceA.best : traceB.best
  frames.push(frame('return', `Return ${answer}`,
    `max(A ${traceA.best}, B ${traceB.best}) = ${answer}; first/last never both taken.`,
    { highlights: { 0: 'dim', [String(n - 1)]: 'dim' }, values: metricA.slice(), vars: { bestA: traceA.best, bestB: traceB.best, answer } }))
  anchors.overview.push(frames.length - 1)
  anchors.detail = anchors.overview.slice()

  return { kind: 'array', layout: { values: nums.slice() }, frames, result: answer, anchors }
}

export const adapters = {
  'edit-distance': {
    signature: { name: 'minDistance', params: ['string', 'string'], return: 'int' },
    lesson: {
      idea: 'dp[i][j] is the fewest edits turning the first i characters of word1 into the first j of word2.',
      trap: 'Forgetting to add 1 on replace/insert/delete, or charging 1 when the current characters already match.',
      time: 'O(m*n)',
      space: 'O(m*n)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    // Batch13 edit-distance: explain+explainLines verified deep-equal to staged .workers/jobs/neetcode150-completion/edit-distance/adapter-edit-distance.mjs EXPLAIN/EXPLAIN_LINES; additive provenance note only, no semantic change.
    explain: {
      def: 'The task: report the fewest edits turning one string into the other.',
      init: 'Prepares an empty table covering all prefix pairs so every smaller subproblem result can be stored and reused.',
      base: 'Seeds the first row and column for empty prefixes, where only insertions or deletions can build the conversion.',
      equal: 'Copies the diagonal value when current characters match, since no new edit is required to extend the conversion.',
      replace: 'Adds one edit to the cheapest diagonal, upper, or left neighbor when characters differ, covering replace, delete, or insert.',
      return: 'Returns the final corner cell, which holds the fewest edits for the complete pair of strings.',
      ctx: 'Loop, branch, or scope scaffolding that organizes the table fill without itself writing a table cell.'
    },
    // Line-specific notes for declaration lines the generic ctx note would misdescribe.
    explainLines: {
      java: {
        1: 'Method header: receives the two input words; the table work starts below.',
        2: 'Read both input lengths once; all table dimensions derive from them.'
      },
      cpp: {
        2: 'Method header: receives the two input words; the table work starts below.',
        3: 'Read both input lengths once; all table dimensions derive from them.'
      },
      pseudo: {
        0: 'Function header: names the two input words; the table work starts below.',
        1: 'Read both input lengths once; all table dimensions derive from them.'
      }
    },
    code: {
      java: code(`
[ctx]class Solution {
[ctx]    public int minDistance(String word1, String word2) {
[ctx]        int m = word1.length(), n = word2.length();
[init]        int[][] dp = new int[m + 1][n + 1];
[base]        for (int i = 0; i <= m; i++) dp[i][0] = i;
[base]        for (int j = 0; j <= n; j++) dp[0][j] = j;
[ctx]        for (int i = 1; i <= m; i++) {
[ctx]            for (int j = 1; j <= n; j++) {
[ctx]                if (word1.charAt(i - 1) == word2.charAt(j - 1)) {
[equal]                    dp[i][j] = dp[i - 1][j - 1];
[ctx]                } else {
[replace]                    dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], Math.min(dp[i - 1][j], dp[i][j - 1]));
[ctx]                }
[ctx]            }
[ctx]        }
[return]        return dp[m][n];
[ctx]    }
[ctx]}
`),
      cpp: code(`
[ctx]class Solution {
[ctx]public:
[ctx]    int minDistance(string word1, string word2) {
[ctx]        int m = word1.size(), n = word2.size();
[init]        vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
[base]        for (int i = 0; i <= m; i++) dp[i][0] = i;
[base]        for (int j = 0; j <= n; j++) dp[0][j] = j;
[ctx]        for (int i = 1; i <= m; i++) {
[ctx]            for (int j = 1; j <= n; j++) {
[ctx]                if (word1[i - 1] == word2[j - 1]) {
[equal]                    dp[i][j] = dp[i - 1][j - 1];
[ctx]                } else {
[replace]                    dp[i][j] = 1 + min(dp[i - 1][j - 1], min(dp[i - 1][j], dp[i][j - 1]));
[ctx]                }
[ctx]            }
[ctx]        }
[return]        return dp[m][n];
[ctx]    }
[ctx]};
`),
      pseudo: code(`
[ctx]function minDistance(word1, word2)
[ctx]  m = length(word1); n = length(word2)
[init]  dp = (m + 1) x (n + 1) table filled with 0
[base]  for i = 0..m: dp[i][0] = i
[base]  for j = 0..n: dp[0][j] = j
[ctx]  for i = 1..m:
[ctx]    for j = 1..n:
[ctx]      if word1[i - 1] == word2[j - 1]:
[equal]        dp[i][j] = dp[i - 1][j - 1]
[ctx]      else:
[replace]      dp[i][j] = 1 + min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1])
[return]  return dp[m][n]
`)
    },
    build: buildEditDistance
  },
  'longest-common-subsequence': {
    signature: { name: 'longestCommonSubsequence', params: ['string', 'string'], return: 'int' },
    lesson: {
      idea: 'dp[i][j] is the LCS length of the first i characters of text1 and first j of text2.',
      trap: 'Adding 1 when characters differ, or forgetting the empty-prefix base row and column.',
      time: 'O(m*n)',
      space: 'O(m*n)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      base: 'Seed the row and column for empty prefixes where no common character can exist, grounding later cells.',
      ctx: 'Structural scaffolding for headers and nested scans that organizes the fill without itself writing a cell.',
      init: 'Allocate a table over all prefix pairs so every smaller comparison result can be stored and reused.',
      match: 'When current characters agree, extend the diagonal neighbor by one shared character to grow the best length.',
      return: 'Report the corner cell holding the best length for the full pair, including absence when nothing is shared.',
      skip: 'When characters differ, carry forward the better of dropping one side or the other, never counting a mismatch.'
    },
    // Line-specific notes for declaration lines the generic ctx note would misdescribe.
    explainLines: {
      java: {
        1: 'Method header: receives the two input texts; the table work starts below.',
        2: 'Read both input lengths once; all table dimensions derive from them.'
      },
      cpp: {
        2: 'Method header: receives the two input texts; the table work starts below.',
        3: 'Read both input lengths once; all table dimensions derive from them.'
      },
      pseudo: {
        0: 'Function header: receives the two input texts; the table work starts below.',
        1: 'Read both input lengths once; all table dimensions derive from them.'
      }
    },
    code: {
      java: code(`
[ctx]class Solution {
[ctx]    public int longestCommonSubsequence(String text1, String text2) {
[ctx]        int m = text1.length(), n = text2.length();
[init]        int[][] dp = new int[m + 1][n + 1];
[base]        for (int i = 0; i <= m; i++) dp[i][0] = 0;
[base]        for (int j = 0; j <= n; j++) dp[0][j] = 0;
[ctx]        for (int i = 1; i <= m; i++) {
[ctx]            for (int j = 1; j <= n; j++) {
[ctx]                if (text1.charAt(i - 1) == text2.charAt(j - 1)) {
[match]                    dp[i][j] = dp[i - 1][j - 1] + 1;
[ctx]                } else {
[skip]                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
[ctx]                }
[ctx]            }
[ctx]        }
[return]        return dp[m][n];
[ctx]    }
[ctx]}
`),
      cpp: code(`
[ctx]class Solution {
[ctx]public:
[ctx]    int longestCommonSubsequence(string text1, string text2) {
[ctx]        int m = text1.size(), n = text2.size();
[init]        vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
[base]        for (int i = 0; i <= m; i++) dp[i][0] = 0;
[base]        for (int j = 0; j <= n; j++) dp[0][j] = 0;
[ctx]        for (int i = 1; i <= m; i++) {
[ctx]            for (int j = 1; j <= n; j++) {
[ctx]                if (text1[i - 1] == text2[j - 1]) {
[match]                    dp[i][j] = dp[i - 1][j - 1] + 1;
[ctx]                } else {
[skip]                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
[ctx]                }
[ctx]            }
[ctx]        }
[return]        return dp[m][n];
[ctx]    }
[ctx]};
`),
      pseudo: code(`
[ctx]function longestCommonSubsequence(text1, text2)
[ctx]  m = length(text1); n = length(text2)
[init]  dp = (m + 1) x (n + 1) table filled with 0
[base]  for i = 0..m: dp[i][0] = 0
[base]  for j = 0..n: dp[0][j] = 0
[ctx]  for i = 1..m:
[ctx]    for j = 1..n:
[ctx]      if text1[i - 1] == text2[j - 1]:
[match]        dp[i][j] = dp[i - 1][j - 1] + 1
[ctx]      else:
[skip]        dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
[return]  return dp[m][n]
`)
    },
    build: buildLcs
  },
  'unique-paths': {
    signature: { name: 'uniquePaths', params: ['int', 'int'], return: 'int' },
    lesson: {
      idea: 'dp[i][j] counts paths to cell (i,j); it is reached from above or the left, so dp[i][j] = up + left.',
      trap: 'First row and column are all 1s: with only right/down moves one way reaches each border cell.',
      time: 'O(m*n)',
      space: 'O(m*n)'
    },
    // Per-line explanations (presentation metadata, never compiled).
    // Verbatim from the reviewed delivery-sprint lesson module; live code
    // blocks verified effectively identical (whitespace only), and both go
    // through the same trim-then-split parser, so index-keyed notes align.
    explain: {
      init: 'Allocate the grid table so each cell can store its own path count for reuse.',
      base: 'Seed the border with one path each: a straight run is the only way to reach it.',
      fill: 'Add the counts from above and the left: every route enters from one of them.',
      return: 'Report the corner cell, which now holds the total count for the whole grid.',
      ctx: 'Loop or scope scaffolding that orders the table fill without writing a cell.'
    },
    explainLines: {
      java: {
        1: 'Method header: receives grid height m and width n; the table work starts below.',
        8: 'End of inner column scan: the current row segment is fully computed.',
        9: 'End of outer row scan: every interior row so far is fully computed.'
      },
      cpp: {
        0: 'Header import: brings in the resizable table type used for the grid below.',
        1: 'Namespace line: shortens standard names used by the table code below.',
        4: 'Method header: receives grid height m and width n; the table work starts below.',
        11: 'End of inner column scan: the current row segment is fully computed.',
        12: 'End of outer row scan: every interior row so far is fully computed.'
      },
      pseudo: {
        0: 'Function header: names the grid height m and width n; work starts below.'
      }
    },
    code: { java: uniquePathsJava, cpp: uniquePathsCpp, pseudo: uniquePathsPseudo },
    build: buildUniquePaths
  },
  'maximal-square': {
    signature: { name: 'maximalSquare', params: ['char[][]'], return: 'int' },
    lesson: {
      idea: 'dp[i][j] is the side of the largest all-1 square ending at (i,j); on 1 take 1 + min(up, left, diag).',
      trap: 'Return side squared (area), not the side; 0 cells reset dp to 0 and never extend a square.',
      time: 'O(m*n)',
      space: 'O(m*n)'
    },
    code: { java: maximalSquareJava, cpp: maximalSquareCpp, pseudo: maximalSquarePseudo },
    build: buildMaximalSquare
  },
  'house-robber-ii': {
    signature: { name: 'rob', params: ['int[]'], return: 'int' },
    lesson: {
      idea: 'A circle forbids taking both house 0 and house n-1, so answer = max(linear(nums[0..n-2]), linear(nums[1..n-1])) with linear dp cur = max(skip prev1, take prev2 + nums[i]).',
      trap: 'Running plain House Robber once on the whole circle can take both ends (e.g. [2,3,2] gives 4 linearly, correct circular answer is 3).',
      time: 'O(n)',
      space: 'O(1) rolling bests (walkthrough shows an explanatory prefix-best metric)'
    },
    explain: {
      structure: 'Class / scope scaffolding that organizes the solution; it declares no data and writes no cell.',
      signature: 'Entry point receiving the circle of house values; all work below derives from this array.',
      edge: 'A lone house has no neighbor conflict, so it is robbed directly without any case split.',
      branch: 'Houses 0 and n-1 are adjacent, so the two cases each exclude one end and solve a linear street.',
      init: 'Rolling bests start at 0: nothing robbed yet, so both the one-back and two-back bests are empty.',
      base: 'First scanned house of a case: take equals its value, skip equals 0, best equals the house value.',
      loop: 'Single left-to-right pass over the case interval; each house is decided exactly once.',
      decide: 'At house i either skip it (keep prev1) or take it with the two-back best (prev2 + nums[i]); keep the larger.',
      roll: 'Slide the window forward: the old one-back best becomes the two-back best for the next house.',
      done: 'The rolling one-back best now covers the whole case interval: it is that case optimum.',
      return: 'Neither case takes both ends, so the larger of the two linear optima is the circular optimum.'
    },
    explainLines: {
      java: {
        1: 'Method header: receives the circle nums; n below derives from this array.',
        2: 'Declaration: n caches the street length used for the n==1 test and both interval ends.',
        3: 'Branch: a single house cannot conflict with itself; return it without splitting cases.',
        4: 'Branch/call: case A excludes the last house and solves linear street 0..n-2.',
        5: 'Branch/call: case B excludes the first house and solves linear street 1..n-1.',
        6: 'Return: max of the two case optima; each excludes one end so the wrap edge is safe.',
        8: 'Helper scope: solves one linear interval [lo, hi]; prev2/prev1 below are frame-local.',
        9: 'Declaration: prev2 holds the best loot up to two houses back (0 before the interval).',
        10: 'Declaration: prev1 holds the best loot up to one house back (0 before the interval).',
        11: 'Loop scope: visits each house in [lo, hi] once, left to right; body decides take vs skip.',
        12: 'Declaration: take robs house i together with the two-back best prev2.',
        13: 'Declaration: skip passes house i and keeps the one-back best prev1.',
        14: 'Declaration: cur is the better of take vs skip: the best loot through house i.',
        15: 'Write: slide prev2 forward to the old one-back best.',
        16: 'Write: slide prev1 forward to the just-decided best cur.',
        18: 'Return: prev1 covers the whole interval, so it is this case optimum.'
      },
      cpp: {
        5: 'Method header: receives the circle nums by reference; n below derives from it.',
        6: 'Declaration: n caches the street length used for the n==1 test and both interval ends.',
        7: 'Branch: a single house cannot conflict with itself; return it without splitting cases.',
        8: 'Branch/call: case A excludes the last house and solves linear street 0..n-2.',
        9: 'Branch/call: case B excludes the first house and solves linear street 1..n-1.',
        10: 'Return: max of the two case optima; each excludes one end so the wrap edge is safe.',
        12: 'Helper scope: solves one linear interval [lo, hi]; prev2/prev1 below are frame-local.',
        13: 'Declaration: prev2 holds the best loot up to two houses back (0 before the interval).',
        14: 'Declaration: prev1 holds the best loot up to one house back (0 before the interval).',
        15: 'Loop scope: visits each house in [lo, hi] once, left to right; body decides take vs skip.',
        16: 'Declaration: take robs house i together with the two-back best prev2.',
        17: 'Declaration: skip passes house i and keeps the one-back best prev1.',
        18: 'Declaration: cur is the better of take vs skip: the best loot through house i.',
        19: 'Write: slide prev2 forward to the old one-back best.',
        20: 'Write: slide prev1 forward to the just-decided best cur.',
        22: 'Return: prev1 covers the whole interval: the case optimum.'
      },
      pseudo: {
        0: 'Function header: names the circle nums; n below derives from it.',
        1: 'Edge branch: a single house cannot conflict with itself; return it directly.',
        2: 'Case split: each linear call excludes one of the two adjacent ends.',
        3: 'Return: max of the two case optima keeps the wrap edge safe.',
        4: 'Helper header: names the interval [lo, hi]; rolling bests below are frame-local.',
        5: 'Init: both rolling bests start at 0 (nothing robbed before the interval).',
        6: 'Loop scope: visits each house in [lo, hi] once, left to right.',
        7: 'Decide: take vs skip at house i; cur keeps the larger.',
        8: 'Roll: slide both bests one house forward.',
        9: 'Return: prev1 covers the whole interval: the case optimum.'
      }
    },
    code: { java: houseRobberIIJava, cpp: houseRobberIICpp, pseudo: houseRobberIIPseudo },
    build: buildHouseRobberII
  }
}
