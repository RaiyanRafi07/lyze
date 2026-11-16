import { code, frame } from './semantic-core.js'

// Visual bound: 2^n subsets explode, so the walkthrough stays tiny and rejects
// larger inputs with a clear error instead of truncating them.
const MAX_N = 4

function decodeNums(value) {
  if (!Array.isArray(value)) throw new Error('Provide an integer array nums for this walkthrough')
  if (value.length > MAX_N) throw new Error('Visual walkthrough limited to n <= ' + MAX_N + ' (' + value.length + ' given); 2^n subsets explode')
  for (let k = 0; k < value.length; k++) {
    if (!Number.isSafeInteger(value[k])) throw new Error('nums[' + k + '] must be a safe integer')
  }
  return value.slice()
}

const subsetsJava = code(`
[def] import java.util.ArrayList;
[def] import java.util.List;
[def] class Solution {
[def]     public List<List<Integer>> subsets(int[] nums) {
[init]         List<List<Integer>> result = new ArrayList<>();
[init]         List<Integer> path = new ArrayList<>();
[explore]         backtrack(nums, 0, path, result);
[return]         return result;
[def]     }
[def]     private void backtrack(int[] nums, int start, List<Integer> path, List<List<Integer>> result) {
[record]         result.add(new ArrayList<>(path));
[def]         for (int i = start; i < nums.length; i++) {
[choose]             path.add(nums[i]);
[explore]             backtrack(nums, i + 1, path, result);
[unchoose]             path.remove(path.size() - 1);
[def]         }
[def]     }
[def] }
`)

const subsetsCpp = code(`
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     vector<vector<int>> subsets(vector<int>& nums) {
[init]         vector<vector<int>> result;
[init]         vector<int> path;
[explore]         backtrack(nums, 0, path, result);
[return]         return result;
[def]     }
[def] private:
[def]     void backtrack(vector<int>& nums, int start, vector<int>& path, vector<vector<int>>& result) {
[record]         result.push_back(path);
[def]         for (int i = start; i < (int)nums.size(); i++) {
[choose]             path.push_back(nums[i]);
[explore]             backtrack(nums, i + 1, path, result);
[unchoose]             path.pop_back();
[def]         }
[def]     }
[def] };
`)

const subsetsPseudo = code(`
[def] subsets(nums):
[init]   result = []; path = []
[explore]   backtrack(nums, 0, path, result)
[return]   return result
[def] backtrack(nums, start, path, result):
[record]   result.add(copy(path))
[def]   for i = start to nums.length - 1:
[choose]     path.add(nums[i])
[explore]     backtrack(nums, i + 1, path, result)
[unchoose]     path.removeLast()
`)

const subsetsExplain = {
  def: 'Declares the solution and helper scope; no subset is built or recorded by a declaration line.',
  init: 'Creates the two live locals before any recursion: result (recorded subsets) and path (partial subset), both empty.',
  explore: 'Enters a backtrack call at this start index. Every entry records the current path first, then loops i from start.',
  record: 'Saves a snapshot copy of the current path into result. The copy (not an alias) is what later steps must not corrupt.',
  choose: 'Appends nums[i] to path, extending the candidate by exactly this loop index. Only indices at or after start are eligible.',
  unchoose: 'Removes the last path element to restore the candidate for the next loop index. Skipping this leaks the choice.',
  return: 'Closes the lesson with the fully recorded result after every choose/recurse/un-choose branch has run.'
}

const subsetsExplainLines = {
  java: {
    0: 'Imports the resizable list used for the result rows and each recorded path copy.',
    1: 'Imports the list interface shared by the result, the path, and the entry signature.',
    2: 'Solver container required by the judge harness; the tested method lives inside.',
    3: 'Entry point: receives nums and returns every subset; called once per judge test.',
    4: 'Empty result that will collect one recorded subset per backtrack entry.',
    5: 'Empty working path holding the partial subset on the current branch only.',
    6: 'Launches the search at start 0 with both accumulators empty; the empty subset is recorded first.',
    7: 'Hands the fully recorded power set to the caller after every branch has run.',
    8: 'Closes the entry method; all subset work happens inside backtrack below.',
    9: 'Worker header: start bounds the loop, path/result are shared by reference, nums is read-only.',
    10: 'Records a snapshot copy of path; the copy (not the live path) survives later choose/un-choose.',
    11: 'Loops the owned suffix once per index: each i is tried exactly once as the next pick.',
    12: 'Chooses nums[i]: appends it to path, extending the candidate by this loop index.',
    13: 'Recurses at i + 1 so the same index is never re-chosen; the pop on the next line ends this ownership.',
    14: 'Un-chooses: pops the last value so the next sibling loop index starts from a clean path.',
    15: 'Closes the loop body; path length is restored by the pop above.',
    16: 'Closes the worker; returning unwinds one level of the live path shown in the visual.',
    17: 'Closes the class; no state escapes except the returned list.'
  },
  cpp: {
    0: 'Includes the growable array used for the result rows and the working path.',
    1: 'Brings the standard names into scope for the compact listing.',
    2: 'Solver container required by the judge harness.',
    3: 'Public entry section: the tested method below is callable by the harness.',
    4: 'Entry point: receives nums by reference and returns every subset.',
    5: 'Empty result that will collect one recorded subset per backtrack entry.',
    6: 'Empty working path holding the partial subset on the current branch only.',
    7: 'Launches the search at start 0 with both accumulators empty; the empty subset is recorded first.',
    8: 'Hands the fully recorded power set to the caller after every branch has run.',
    9: 'Closes the entry method; all subset work happens inside backtrack below.',
    10: 'Private helper section: the recursive worker below is an internal detail.',
    11: 'Worker header: start bounds the loop, path/result are shared by reference, nums is read-only.',
    12: 'Records a copy of path; push_back copies the vector, so later mutation is safe.',
    13: 'Loops the owned suffix once per index: each i is tried exactly once as the next pick.',
    14: 'Chooses nums[i]: appends it to path, extending the candidate by this loop index.',
    15: 'Recurses at i + 1 so the same index is never re-chosen; the pop on the next line ends this ownership.',
    16: 'Un-chooses: pops the last value so the next sibling loop index starts from a clean path.',
    17: 'Closes the loop body; path length is restored by the pop above.',
    18: 'Closes the worker; returning unwinds one level of the live path shown in the visual.',
    19: 'Closes the class; the trailing semicolon ends a C++ class definition.'
  },
  pseudo: {
    0: 'Entry header: takes nums and returns its full power set, nothing else.',
    1: 'Empty result plus empty working path: the two accumulators of the search.',
    2: 'Launches the search at start 0; the first entry records the empty subset.',
    3: 'Returns every recorded subset to the caller after all branches ran.',
    4: 'Worker header: start bounds the loop and owns one suffix of the input.',
    5: 'Records a copy of path; the copy (not the live path) is what survives backtracking.',
    6: 'Loops the owned suffix: each index is tried once as the next pick.',
    7: 'Chooses nums[i]: appends it to the working path.',
    8: 'Recurses at i + 1: the never-rechoose step that keeps every subset unique.',
    9: 'Un-chooses: drops the last pick to restore the path for the next sibling.'
  }
}

function buildSubsets(args) {
  const nums = decodeNums(args[0])
  const n = nums.length
  const result = []
  const path = []
  const frames = []
  const anchors = []
  let firstUnchooseAnchored = false

  const snap = (current, index) => ({
    values: nums.slice(),
    path: path.slice(),
    result: result.map((s) => s.slice()),
    current,
    index,
    answer: result.length,
    vars: { start: current, index },
  })

  const push = (step, label, note, current, index) => {
    frames.push(frame(step, label, String(note).slice(0, 140), snap(current, index)))
  }

  push('init', 'Initialize', 'nums=[' + nums.join(',') + '], result=[], path=[]', null, null)

  function backtrack(start) {
    result.push(path.slice())
    push('record', 'Record subset', 'Record #' + (result.length - 1) + ' [' + path.join(',') + '] at start=' + start, start, null)
    anchors.push(frames.length - 1)
    for (let i = start; i < n; i++) {
      const v = nums[i]
      path.push(v)
      push('choose', 'Choose', 'Choose nums[' + i + ']=' + v + '; path=[' + path.join(',') + ']', start, i)
      push('explore', 'Explore', 'Explore start=' + (i + 1) + ' with path=[' + path.join(',') + ']', i + 1, i)
      backtrack(i + 1)
      path.pop()
      push('unchoose', 'Un-choose', 'Un-choose nums[' + i + ']=' + v + '; path=[' + path.join(',') + ']', start, i)
      if (!firstUnchooseAnchored) {
        anchors.push(frames.length - 1)
        firstUnchooseAnchored = true
      }
    }
  }

  backtrack(0)

  push('return', 'Return result', 'Done; ' + result.length + ' subsets returned', null, null)

  return {
    kind: 'array',
    layout: { values: nums.slice() },
    frames,
    result: result.map(s => s.slice()),
    anchors
  }
}

const PERM_MAX_N = 3

const permutationsJava = code(`
[def] import java.util.ArrayList;
[def] import java.util.List;
[def] class Solution {
[def]     public List<List<Integer>> permute(int[] nums) {
[init]         List<List<Integer>> result = new ArrayList<>();
[explore]         backtrack(nums, 0, result);
[return]         return result;
[def]     }
[def]     private void backtrack(int[] nums, int first, List<List<Integer>> result) {
[explore]         if (first == nums.length) {
[record]             List<Integer> one = new ArrayList<>();
[record]             for (int v : nums) one.add(v);
[record]             result.add(one);
[record]             return;
[def]         }
[def]         for (int i = first; i < nums.length; i++) {
[choose]             swap(nums, first, i);
[explore]             backtrack(nums, first + 1, result);
[unchoose]             swap(nums, first, i);
[def]         }
[def]     }
[def]     private void swap(int[] nums, int a, int b) {
[def]         int t = nums[a]; nums[a] = nums[b]; nums[b] = t;
[def]     }
[def] }
`)

const permutationsCpp = code(`
[def] #include <utility>
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     vector<vector<int>> permute(vector<int>& nums) {
[init]         vector<vector<int>> result;
[explore]         backtrack(nums, 0, result);
[return]         return result;
[def]     }
[def] private:
[def]     void backtrack(vector<int>& nums, int first, vector<vector<int>>& result) {
[explore]         if (first == (int)nums.size()) {
[record]             result.push_back(nums);
[record]             return;
[def]         }
[def]         for (int i = first; i < (int)nums.size(); i++) {
[choose]             swap(nums[first], nums[i]);
[explore]             backtrack(nums, first + 1, result);
[unchoose]             swap(nums[first], nums[i]);
[def]         }
[def]     }
[def] };
`)

const permutationsPseudo = code(`
[def] permute(nums):
[init]   result = []
[explore]   backtrack(nums, 0, result)
[return]   return result
[def] backtrack(nums, first, result):
[explore]   if first == nums.length:
[record]     result.add(copy(nums)); return
[def]   for i = first to nums.length - 1:
[choose]     swap(nums, first, i)
[explore]     backtrack(nums, first + 1, result)
[unchoose]     swap(nums, first, i)
`)

function buildPermutations(args) {
  const raw = args[0]
  if (!Array.isArray(raw)) throw new Error('Provide an integer array nums for this walkthrough')
  if (raw.length > PERM_MAX_N) throw new Error('Visual walkthrough limited to n <= ' + PERM_MAX_N + ' (' + raw.length + ' given); n! permutations explode')
  for (let k = 0; k < raw.length; k++) {
    if (!Number.isSafeInteger(raw[k])) throw new Error('nums[' + k + '] must be a safe integer')
  }
  const nums = raw.slice()
  const n = nums.length
  const arr = nums.slice()
  const result = []
  const frames = []
  const anchors = []
  let firstUnchooseAnchored = false

  const snap = (first, index) => ({
    values: arr.slice(),
    nums: arr.slice(),
    result: result.map((s) => s.slice()),
    first,
    index,
    depth: first === null || first === undefined ? 0 : first,
    answer: result.length,
    vars: { first, index, depth: first === null || first === undefined ? 0 : first },
  })

  const push = (step, label, note, first, index) => {
    frames.push(frame(step, label, note, snap(first, index)))
  }

  push('init', 'Initialize', 'nums=[' + nums.join(',') + '], result=[], arr=[' + arr.join(',') + ']', null, null)

  function backtrack(first) {
    push('explore', 'Explore', 'Enter first=' + first + ' with arr=[' + arr.join(',') + ']', first, null)
    if (first === n) {
      result.push(arr.slice())
      push('record', 'Record permutation', 'Record #' + (result.length - 1) + ' [' + arr.join(',') + '] at first=' + first, first, null)
      anchors.push(frames.length - 1)
      return
    }
    for (let i = first; i < n; i++) {
      const a = arr[first]
      const b = arr[i]
      const t = arr[first]; arr[first] = arr[i]; arr[i] = t
      push('choose', 'Choose', 'Swap first=' + first + ' with i=' + i + ' (' + a + '<->' + b + '); arr=[' + arr.join(',') + ']', first, i)
      backtrack(first + 1)
      const c = arr[first]; arr[first] = arr[i]; arr[i] = c
      push('unchoose', 'Un-choose', 'Swap back first=' + first + ',i=' + i + '; arr=[' + arr.join(',') + ']', first, i)
      if (!firstUnchooseAnchored) {
        anchors.push(frames.length - 1)
        firstUnchooseAnchored = true
      }
    }
  }

  backtrack(0)

  push('return', 'Return result', 'Done; ' + result.length + ' permutations returned', null, null)

  return {
    kind: 'array',
    layout: { values: nums.slice() },
    frames,
    result: result.map((s) => s.slice()),
    anchors,
  }
}

// Visual bounds: full combination trees explode, so the walkthrough stays
// tiny and rejects larger inputs with a clear error instead of truncating.
const MAX_COMB_N = 7;
const MAX_COMB_TARGET = 30;
const MIN_COMB_VALUE = 1;
const MAX_COMB_VALUE = 20;

function decodeCandidates(value) {
  if (!Array.isArray(value)) throw new Error('Provide an integer array candidates for this walkthrough');
  if (value.length < 1) throw new Error('Visual walkthrough needs at least 1 candidate (0 given)');
  if (value.length > MAX_COMB_N) throw new Error('Visual walkthrough limited to candidates length <= ' + MAX_COMB_N + ' (' + value.length + ' given); combination trees explode');
  for (let k = 0; k < value.length; k++) {
    if (!Number.isSafeInteger(value[k])) throw new Error('candidates[' + k + '] must be a safe integer');
    if (value[k] < MIN_COMB_VALUE || value[k] > MAX_COMB_VALUE) throw new Error('Visual walkthrough limited to candidate values 1..20 (candidates[' + k + ']=' + value[k] + ' given)');
  }
  return value.slice();
}

function decodeTarget(value) {
  if (!Number.isSafeInteger(value)) throw new Error('Provide an integer target for this walkthrough');
  if (value < 1 || value > MAX_COMB_TARGET) throw new Error('Visual walkthrough limited to target 1..30 (' + value + ' given)');
  return value;
}

const combinationSumJava = code(`
[def] import java.util.ArrayList;
[def] import java.util.List;
[def] class Solution {
[def]     public List<List<Integer>> combinationSum(int[] candidates, int target) {
[init]         List<List<Integer>> result = new ArrayList<>();
[init]         List<Integer> path = new ArrayList<>();
[explore]         dfs(candidates, 0, target, path, result);
[return]         return result;
[def]     }
[def]     private void dfs(int[] candidates, int start, int remain, List<Integer> path, List<List<Integer>> result) {
[found]         if (remain == 0) {
[found]             result.add(new ArrayList<>(path));
[found]             return;
[def]         }
[prune]         if (remain < 0) {
[prune]             return;
[def]         }
[def]         for (int i = start; i < candidates.length; i++) {
[choose]             path.add(candidates[i]);
[explore]             dfs(candidates, i, remain - candidates[i], path, result);
[unchoose]             path.remove(path.size() - 1);
[def]         }
[def]     }
[def] }
`);

const combinationSumCpp = code(`
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     vector<vector<int>> combinationSum(vector<int>& candidates, int target) {
[init]         vector<vector<int>> result;
[init]         vector<int> path;
[explore]         dfs(candidates, 0, target, path, result);
[return]         return result;
[def]     }
[def] private:
[def]     void dfs(vector<int>& candidates, int start, int remain, vector<int>& path, vector<vector<int>>& result) {
[found]         if (remain == 0) {
[found]             result.push_back(path);
[found]             return;
[def]         }
[prune]         if (remain < 0) {
[prune]             return;
[def]         }
[def]         for (int i = start; i < (int)candidates.size(); i++) {
[choose]             path.push_back(candidates[i]);
[explore]             dfs(candidates, i, remain - candidates[i], path, result);
[unchoose]             path.pop_back();
[def]         }
[def]     }
[def] };
`);

const combinationSumPseudo = code(`
[def] combinationSum(candidates, target):
[init]   result = []; path = []
[explore]   dfs(candidates, 0, target, path, result)
[return]   return result
[def] dfs(candidates, start, remain, path, result):
[found]   if remain == 0: result.add(copy(path)); return
[prune]   if remain < 0: return
[def]   for i = start to candidates.length - 1:
[choose]     path.add(candidates[i])
[explore]     dfs(candidates, i, remain - candidates[i], path, result)
[unchoose]     path.removeLast()
`);

function buildCombinationSum(args) {
  const candidates = decodeCandidates(args[0]);
  const target = decodeTarget(args[1]);
  const n = candidates.length;
  const result = [];
  const path = [];
  const frames = [];
  const anchors = [];

  const snap = (start, index, remain) => ({
    candidates: candidates.slice(),
    values: candidates.slice(),
    target,
    path: path.slice(),
    result: result.map((s) => s.slice()),
    start,
    index,
    remain,
    depth: path.length,
    answer: result.length,
    vars: { start, index, remain, depth: path.length }
  });

  const push = (step, label, note, start, index, remain) => {
    frames.push(frame(step, label, note, snap(start, index, remain)));
  };

  push('init', 'Initialize', 'candidates=[' + candidates.join(',') + '], target=' + target + ', path=[]', 0, null, target);

  function dfs(start, remain) {
    if (remain === 0) {
      result.push(path.slice());
      push('found', 'Found combination', 'remain=0, save #' + (result.length - 1) + ' [' + path.join(',') + ']', start, null, remain);
      anchors.push(frames.length - 1);
      return;
    }
    if (remain < 0) {
      push('prune', 'Prune overshoot', 'remain=' + remain + ' < 0, backtrack path=[' + path.join(',') + ']', start, null, remain);
      return;
    }
    for (let i = start; i < n; i++) {
      const v = candidates[i];
      const next = remain - v;
      path.push(v);
      push('choose', 'Choose', 'Choose candidates[' + i + ']=' + v + '; path=[' + path.join(',') + '] remain=' + remain, start, i, remain);
      push('explore', 'Explore', 'Explore i=' + i + ' remain ' + remain + '->' + next + ' path=[' + path.join(',') + ']', i, i, next);
      dfs(i, next);
      path.pop();
      push('unchoose', 'Un-choose', 'Un-choose candidates[' + i + ']=' + v + '; path=[' + path.join(',') + ']', start, i, remain);
    }
  }

  dfs(0, target);

  push('return', 'Return result', 'Done; ' + result.length + ' combinations returned', null, null, 0);

  return {
    kind: 'array',
    layout: { values: candidates.slice(), target },
    frames,
    result: result.map((s) => s.slice()),
    anchors
  };
}

// Visual bound: boards are 1..6 x 1..6 per actual constraints; words longer
// than 8 letters are rejected with a clear error instead of an unreadable
// thousand-frame trace (judge/variants still use the full 1..15 range).
const MAX_WALK_WORD = 8
const MAX_SIDE = 6

function decodeBoard(value) {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error('Provide a non-empty board with 1..6 rows for this walkthrough')
  if (value.length > MAX_SIDE)
    throw new Error('Visual walkthrough limited to 6 rows (' + value.length + ' given)')
  if (!Array.isArray(value[0])) throw new Error('Every board row must be an array')
  const cols = value[0].length
  if (cols < 1 || cols > MAX_SIDE)
    throw new Error('Visual walkthrough limited to 1..6 columns (' + cols + ' given)')
  return value.map((row, r) => {
    if (!Array.isArray(row) || row.length !== cols)
      throw new Error(
        'Board must be rectangular: row 0 has ' + cols + ' columns but row ' + r + ' differs'
      )
    return row.map((cell, c) => {
      if (typeof cell !== 'string' || cell.length !== 1 || !/[A-Za-z]/.test(cell))
        throw new Error('board[' + r + '][' + c + '] must be a single A-Z/a-z letter')
      return cell
    })
  })
}

function decodeWord(value) {
  if (typeof value !== 'string' || value.length === 0)
    throw new Error('Provide a non-empty word for this walkthrough')
  if (!/^[A-Za-z]+$/.test(value)) throw new Error('word must contain only A-Z/a-z letters')
  if (value.length > MAX_WALK_WORD)
    throw new Error(
      'Visual walkthrough limited to word length <= ' + MAX_WALK_WORD + ' (' + value.length + ' given)'
    )
  return value
}

const WORD_DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

const wordSearchJava = code(`
[def] class Solution {
[def]     public boolean exist(char[][] board, String word) {
[init]         int rows = board.length, cols = board[0].length;
[prune]         if (!hasEnoughLetters(board, word)) return false;
[scan]         for (int r = 0; r < rows; r++) {
[scan]             for (int c = 0; c < cols; c++) {
[check]                 if (board[r][c] == word.charAt(0)) {
[enter]                     if (dfs(board, r, c, 0, word)) return true;
[def]                 }
[def]             }
[def]         }
[return]         return false;
[def]     }
[def]     private boolean dfs(char[][] board, int r, int c, int k, String word) {
[found]         if (k == word.length()) return true;
[mismatch]         if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) return false;
[mismatch]         if (board[r][c] != word.charAt(k)) return false;
[visit]         char saved = board[r][c];
[visit]         board[r][c] = '#';
[explore]         boolean found = dfs(board, r + 1, c, k + 1, word)
[explore]                 || dfs(board, r - 1, c, k + 1, word)
[explore]                 || dfs(board, r, c + 1, k + 1, word)
[explore]                 || dfs(board, r, c - 1, k + 1, word);
[unchoose]         board[r][c] = saved;
[return]         return found;
[def]     }
[def]     private boolean hasEnoughLetters(char[][] board, String word) {
[prune]         int[] need = new int[128];
[prune]         for (int r = 0; r < board.length; r++) for (int c = 0; c < board[0].length; c++) need[board[r][c]]++;
[prune]         for (int i = 0; i < word.length(); i++) if (--need[word.charAt(i)] < 0) return false;
[prune]         return true;
[def]     }
[def] }
`)

const wordSearchCpp = code(`
[def] class Solution {
[def] public:
[def]     bool exist(vector<vector<char>>& board, string word) {
[init]         int rows = (int)board.size(), cols = (int)board[0].size();
[prune]         if (!hasEnoughLetters(board, word)) return false;
[scan]         for (int r = 0; r < rows; r++) {
[scan]             for (int c = 0; c < cols; c++) {
[check]                 if (board[r][c] == word[0]) {
[enter]                     if (dfs(board, r, c, 0, word)) return true;
[def]                 }
[def]             }
[def]         }
[return]         return false;
[def]     }
[def] private:
[def]     bool dfs(vector<vector<char>>& board, int r, int c, int k, const string& word) {
[found]         if (k == (int)word.size()) return true;
[mismatch]         if (r < 0 || r >= (int)board.size() || c < 0 || c >= (int)board[0].size()) return false;
[mismatch]         if (board[r][c] != word[k]) return false;
[visit]         char saved = board[r][c];
[visit]         board[r][c] = '#';
[explore]         bool found = dfs(board, r + 1, c, k + 1, word)
[explore]                 || dfs(board, r - 1, c, k + 1, word)
[explore]                 || dfs(board, r, c + 1, k + 1, word)
[explore]                 || dfs(board, r, c - 1, k + 1, word);
[unchoose]         board[r][c] = saved;
[return]         return found;
[def]     }
[def]     bool hasEnoughLetters(vector<vector<char>>& board, const string& word) {
[prune]         int need[128] = {};
[prune]         for (auto& row : board) for (char ch : row) need[(int)ch]++;
[prune]         for (char ch : word) if (--need[(int)ch] < 0) return false;
[prune]         return true;
[def]     }
[def] };
`)

const wordSearchPseudo = code(`
[def] exist(board, word):
[init]   rows = board.length; cols = board[0].length
[prune]   if letter frequencies of board cannot cover word: return false
[scan]   for r = 0 to rows - 1:
[scan]     for c = 0 to cols - 1:
[check]       if board[r][c] == word[0]:
[enter]         if dfs(r, c, 0): return true
[return]   return false
[def] dfs(r, c, k):
[found]   if k == word.length: return true
[mismatch]   if (r, c) outside board: return false
[mismatch]   if board[r][c] != word[k]: return false
[visit]   saved = board[r][c]; board[r][c] = MARKED
[explore]   found = dfs(r+1, c, k+1) or dfs(r-1, c, k+1) or dfs(r, c+1, k+1) or dfs(r, c-1, k+1)
[unchoose]   board[r][c] = saved
[return]   return found
`)

// Canonical DFS with in-place mark + restore. Emits one frame per real
// operation on the actual board/word inputs. Pure except for the staged
// board copy it mutates and restores.
function buildWordSearch(args) {
  const board = decodeBoard(args[0])
  const word = decodeWord(args[1])
  const rows = board.length
  const cols = board[0].length
  const grid = board.map((row) => row.slice())
  const frames = []
  const anchors = []
  const visited = new Set()
  const key = (r, c) => r + ',' + c
  let answer = false
  let calls = 0
  let firstEnterAnchored = false

  const snap = (current, k, extra = {}) => ({
    current,
    cells: grid.map((row) => row.slice()),
    filled: [...visited].map((s) => s.split(',').map(Number)),
    reads: current ? [current.slice()] : [],
    path: [...visited].map((s) => s.split(',').map(Number)),
    visited: [...visited].map((s) => s.split(',').map(Number)),
    k,
    need: word[k] !== undefined ? word[k] : null,
    matched: k,
    word,
    answer,
    vars: { rows, cols, r: current ? current[0] : null, c: current ? current[1] : null, k, ...extra },
  })

  const push = (step, label, note, current, k, extra) => {
    frames.push(frame(step, label, note, snap(current, k, extra)))
  }

  push('init', 'Initialize', 'board ' + rows + 'x' + cols + ', word length ' + word.length, null, 0, {})

  // Frequency prune (follow-up): real pre-check on actual letters.
  const need = Object.create(null)
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) need[grid[r][c]] = (need[grid[r][c]] || 0) + 1
  let pruned = false
  for (const ch of word) {
    need[ch] = (need[ch] || 0) - 1
    if (need[ch] < 0) {
      pruned = true
      break
    }
  }
  if (pruned) {
    // Emit one real prune frame per consumed word letter so even the
    // pruned scene meets the 6-frame narration minimum with actual data.
    const counts = Object.create(null)
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) counts[grid[r][c]] = (counts[grid[r][c]] || 0) + 1
    for (let i = 0; i < word.length; i++) {
      const ch = word[i]
      counts[ch] = (counts[ch] || 0) - 1
      push('prune', 'Consume ' + ch, 'word[' + i + ']=' + ch + ' remaining=' + counts[ch], null, i, {})
      if (counts[ch] < 0) break
    }
    push('prune', 'Prune by frequency', 'board lacks a letter of the word; return false', null, 0, {})
    anchors.push(frames.length - 1)
    push('return', 'Return false', 'Pruned; the word cannot be built', null, 0, {})
    return {
      kind: 'grid',
      layout: { rows, cols, cells: board.map((row) => row.slice()) },
      frames,
      result: false,
      anchors,
      stats: { calls, answer: false, pruned: true },
    }
  }
  push('prune', 'Frequency check passes', 'board covers every word letter; start scan', null, 0, {})

  function dfs(r, c, k) {
    calls++
    if (k === word.length) {
      push('found', 'Word complete', 'matched all ' + word.length + ' letters; return true', [r, c], k, {})
      anchors.push(frames.length - 1)
      return true
    }
    if (r < 0 || r >= rows || c < 0 || c >= cols) {
      push('mismatch', 'Out of bounds', '(' + r + ',' + c + ') outside ' + rows + 'x' + cols + ' at k=' + k, null, k, {})
      return false
    }
    if (grid[r][c] !== word[k]) {
      push(
        'mismatch',
        'Letter mismatch',
        'board[' + r + '][' + c + ']=' + grid[r][c] + ' != word[' + k + ']=' + word[k],
        [r, c],
        k,
        { cell: grid[r][c], want: word[k] }
      )
      return false
    }
    const saved = grid[r][c]
    grid[r][c] = '#'
    visited.add(key(r, c))
    push(
      'visit',
      'Match and mark',
      'board[' + r + '][' + c + ']=' + saved + ' matches word[' + k + ']; mark visited depth=' + visited.size,
      [r, c],
      k,
      { cell: saved, want: word[k] }
    )
    let found = false
    for (let d = 0; d < WORD_DIRS.length; d++) {
      const nr = r + WORD_DIRS[d][0]
      const nc = c + WORD_DIRS[d][1]
      push(
        'explore',
        'Step to neighbor',
        'from (' + r + ',' + c + ') k=' + k + ' try (' + nr + ',' + nc + ') for word[' + (k + 1) + ']',
        [r, c],
        k,
        { dir: d }
      )
      if (dfs(nr, nc, k + 1)) {
        found = true
        break // short-circuit like `||` chain in reference code
      }
    }
    grid[r][c] = saved
    visited.delete(key(r, c))
    push('unchoose', 'Un-mark cell', 'restore board[' + r + '][' + c + ']=' + saved + '; depth=' + visited.size, [r, c], k, {})
    return found
  }

  outer: for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      push('scan', 'Scan cell', 'scan (' + r + ',' + c + ')=' + grid[r][c] + ' for start ' + word[0], [r, c], 0, {})
      if (grid[r][c] === word[0]) {
        push('check', 'Start candidate', '(' + r + ',' + c + ') matches word[0]=' + word[0] + '; enter DFS', [r, c], 0, {})
        if (!firstEnterAnchored) {
          anchors.push(frames.length - 1)
          firstEnterAnchored = true
        }
        push('enter', 'Enter DFS', 'dfs(' + r + ',' + c + ',0) for a word of length ' + word.length, [r, c], 0, {})
        if (dfs(r, c, 0)) {
          answer = true
          break outer
        }
      }
    }
  }

  push(
    'return',
    answer ? 'Return true' : 'Return false',
    answer ? 'word found after ' + calls + ' calls' : 'no start led to the word; ' + calls + ' calls',
    null,
    0,
    {}
  )

  return {
    kind: 'grid',
    layout: { rows, cols, cells: board.map((row) => row.slice()) },
    frames,
    result: answer,
    anchors,
    stats: { calls, answer, pruned: false },
  }
}

// Word Search II staged adapter (question-owners-150, selfcheck ALL PASS).
// Visual bounds: 6x6 board, <=8 words, word length <=8; larger inputs throw.
// Trie-guided multi-word DFS; single shared trie prunes dead prefixes once.
const WS2_MAX_SIDE = 6
const WS2_MAX_WORDS = 8
const WS2_MAX_WORD_LEN = 8
const WS2_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]]

function ws2Fail(message) {
  throw new Error(message)
}

function ws2DecodeBoard(value) {
  if (!Array.isArray(value) || value.length === 0) ws2Fail('Provide a non-empty board for this walkthrough')
  if (value.length > WS2_MAX_SIDE) ws2Fail('Visual walkthrough limited to 6 rows (' + value.length + ' given)')
  if (!Array.isArray(value[0])) ws2Fail('Every board row must be an array')
  const cols = value[0].length
  if (cols < 1 || cols > WS2_MAX_SIDE) ws2Fail('Visual walkthrough limited to 1..6 columns (' + cols + ' given)')
  return value.map((row, r) => {
    if (!Array.isArray(row) || row.length !== cols) ws2Fail('Board must be rectangular: row 0 has ' + cols + ' columns but row ' + r + ' differs')
    return row.map((cell, c) => {
      if (typeof cell !== 'string' || !/^[a-z]$/.test(cell)) ws2Fail('board[' + r + '][' + c + '] must be a single lowercase letter')
      return cell
    })
  })
}

function ws2DecodeWords(value) {
  if (!Array.isArray(value) || value.length === 0) ws2Fail('Provide 1..8 words for this walkthrough')
  if (value.length > WS2_MAX_WORDS) ws2Fail('Visual walkthrough limited to 8 words (' + value.length + ' given)')
  const seen = new Set()
  return value.map((w, i) => {
    if (typeof w !== 'string' || !/^[a-z]+$/.test(w)) ws2Fail('words[' + i + '] must be a lowercase word')
    if (w.length > WS2_MAX_WORD_LEN) ws2Fail('Visual walkthrough limited to word length <= 8 (words[' + i + '] has ' + w.length + ')')
    if (seen.has(w)) ws2Fail('words[' + i + '] duplicates "' + w + '" (official inputs are unique)')
    seen.add(w)
    return w
  })
}

function ws2NewNode() {
  return { next: new Array(26).fill(null), word: null }
}

function ws2TrieInsert(root, word) {
  let node = root
  for (let i = 0; i < word.length; i++) {
    const t = word.charCodeAt(i) - 97
    if (!node.next[t]) node.next[t] = ws2NewNode()
    node = node.next[t]
  }
  node.word = word
}

function ws2ChildOf(node, ch) {
  const t = ch.charCodeAt(0) - 97
  if (t < 0 || t >= 26) return null
  return node.next[t] || null
}

function ws2ChildLetters(node) {
  const out = []
  for (let t = 0; t < 26; t++) if (node.next[t]) out.push(String.fromCharCode(97 + t))
  return out
}

const wordSearchIIJava = code(`
[def] class Solution {
[def]     private static class Node {
[def]         Node[] next = new Node[26];
[def]         String word = null;
[def]     }
[def]     public List<String> findWords(char[][] board, String[] words) {
[trie]         Node root = new Node();
[trie]         for (String w : words) {
[trie]             Node node = root;
[trie]             for (int i = 0; i < w.length(); i++) {
[trie]                 int t = w.charAt(i) - 'a';
[trie]                 if (node.next[t] == null) node.next[t] = new Node();
[trie]                 node = node.next[t];
[trie]             }
[trie]             node.word = w;
[trie]         }
[init]         List<String> out = new ArrayList<>();
[init]         int rows = board.length, cols = board[0].length;
[scan]         for (int r = 0; r < rows; r++) {
[scan]             for (int c = 0; c < cols; c++) {
[enter]                 dfs(board, r, c, root, out);
[scan]             }
[scan]         }
[done]         Collections.sort(out);
[done]         return out;
[def]     }
[def]     private void dfs(char[][] board, int r, int c, Node node, List<String> out) {
[mismatch]         if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) return;
[visit]         char ch = board[r][c];
[revisit]         if (ch == '#') return;
[trie-prune]         if (node.next[ch - 'a'] == null) return;
[visit]         Node child = node.next[ch - 'a'];
[found-word]         if (child.word != null) {
[found-word]             out.add(child.word);
[found-word]             child.word = null;
[found-word]         }
[visit]         board[r][c] = '#';
[explore]         dfs(board, r + 1, c, child, out);
[explore]         dfs(board, r - 1, c, child, out);
[explore]         dfs(board, r, c + 1, child, out);
[explore]         dfs(board, r, c - 1, child, out);
[unchoose]         board[r][c] = ch;
[def]     }
[def] }
`)

const wordSearchIICpp = code(`
[def] #include <algorithm>
[def] #include <string>
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     struct Node {
[def]         Node* next[26] = {};
[def]         string word;
[def]         bool hasWord = false;
[def]     };
[def]     vector<string> findWords(vector<vector<char>>& board, vector<string>& words) {
[trie]         Node root;
[trie]         for (const string& w : words) {
[trie]             Node* node = &root;
[trie]             for (char ch : w) {
[trie]                 int t = ch - 'a';
[trie]                 if (node->next[t] == nullptr) node->next[t] = new Node();
[trie]                 node = node->next[t];
[trie]             }
[trie]             node->word = w;
[trie]             node->hasWord = true;
[trie]         }
[init]         vector<string> out;
[init]         int rows = (int)board.size(), cols = (int)board[0].size();
[scan]         for (int r = 0; r < rows; r++) {
[scan]             for (int c = 0; c < cols; c++) {
[enter]                 dfs(board, r, c, &root, out);
[scan]             }
[scan]         }
[done]         sort(out.begin(), out.end());
[done]         return out;
[def]     }
[def] private:
[def]     void dfs(vector<vector<char>>& board, int r, int c, Node* node, vector<string>& out) {
[mismatch]         if (r < 0 || r >= (int)board.size() || c < 0 || c >= (int)board[0].size()) return;
[visit]         char ch = board[r][c];
[revisit]         if (ch == '#') return;
[trie-prune]         if (node->next[ch - 'a'] == nullptr) return;
[visit]         Node* child = node->next[ch - 'a'];
[found-word]         if (child->hasWord) {
[found-word]             out.push_back(child->word);
[found-word]             child->hasWord = false;
[found-word]         }
[visit]         board[r][c] = '#';
[explore]         dfs(board, r + 1, c, child, out);
[explore]         dfs(board, r - 1, c, child, out);
[explore]         dfs(board, r, c + 1, child, out);
[explore]         dfs(board, r, c - 1, child, out);
[unchoose]         board[r][c] = ch;
[def]     }
[def] };
`)

const wordSearchIIPseudo = code(`
[def] findWords(board, words):
[trie]   root = empty trie node
[trie]   for w in words: insert w letter by letter; terminal carries w
[init]   out = []
[init]   rows, cols = board dimensions
[scan]   for r in rows:
[scan]     for c in cols:
[enter]       dfs(board, r, c, root, out)
[done]   sort(out)
[done]   return out
[def] dfs(board, r, c, node, out):
[mismatch]   if (r, c) outside board: return
[visit]   ch = board[r][c]
[revisit]   if ch is marked: return
[trie-prune]   if no trie edge for ch: return
[visit]   child = the live continuation
[found-word]   if child ends a word: record it, disarm the terminal
[visit]   occupy the cell
[explore]   recurse to the four orthogonal neighbors in fixed order
[unchoose]   restore the saved letter
`)

function buildWordSearchII(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('word-search-ii expects [board, words] as its two walkthrough inputs')
  const board = ws2DecodeBoard(args[0])
  const words = ws2DecodeWords(args[1])
  const rows = board.length
  const cols = board[0].length
  const grid = board.map((r) => r.slice())

  const root = ws2NewNode()
  for (const w of words) ws2TrieInsert(root, w)
  const nodeIds = new Map([[root, 'n0']])
  const nodes = [{ id: 'n0', label: '', word: root.word, depth: 0 }]
  const edges = []
  let seq = 1
  const register = (node, id, depth) => {
    for (let t = 0; t < 26; t++) {
      const child = node.next[t]
      if (!child) continue
      const cid = 'n' + seq++
      nodeIds.set(child, cid)
      nodes.push({ id: cid, label: String.fromCharCode(97 + t), word: child.word, depth: depth + 1 })
      edges.push([id, cid])
      register(child, cid, depth + 1)
    }
  }
  register(root, 'n0', 0)

  const frames = []
  const found = []
  const path = []

  const snap = (current, k, prefix, node, lookup, foundNew, answer) => ({
    current: current ? current.slice() : null,
    path: path.map((p) => p.slice()),
    k,
    prefix,
    node: node ? nodeIds.get(node) || null : null,
    children: node ? ws2ChildLetters(node) : [],
    lookup: lookup ? { ch: lookup.ch, hit: lookup.hit } : null,
    found: found.slice(),
    foundNew: foundNew === undefined ? null : foundNew,
    answer: answer === undefined || answer === null ? null : answer.slice(),
    vars: {
      r: current ? current[0] : null,
      c: current ? current[1] : null,
      k,
      prefix,
      node: node ? nodeIds.get(node) || null : null,
      nchild: node ? ws2ChildLetters(node).length : 0,
      nfound: found.length,
    },
  })

  const push = (step, label, note, current, k, prefix, node, lookup, foundNew, answer) => {
    frames.push(frame(step, label, note, snap(current, k, prefix, node, lookup, foundNew, answer)))
  }

  push('init', 'Initialize', 'board ' + rows + 'x' + cols + ', ' + words.length + ' words in trie', null, 0, '', root, null, null, null)
  const rootKids = ws2ChildLetters(root)
  push('trie', 'Trie built', 'root continues with ' + (rootKids.length ? rootKids.join(',') : '(none)') + ' from ' + words.length + ' words', null, 0, '', root, null, null, null)

  function dfs(r, c, node, prefix) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) {
      push('mismatch', 'Out of bounds', '(' + r + ',' + c + ') outside ' + rows + 'x' + cols + ' at "' + prefix + '"', null, prefix.length, prefix, node, null, null, null)
      return
    }
    const ch = grid[r][c]
    if (ch === '#') {
      push('revisit', 'Cell reused', '(' + r + ',' + c + ') is on the current path; cannot reuse', [r, c], prefix.length, prefix, node, { ch: '#', hit: false }, null, null)
      return
    }
    const child = ws2ChildOf(node, ch)
    if (!child) {
      push('trie-prune', 'Prefix dead', 'no trie edge from here on "' + ch + '"; stop "' + prefix + ch + '"', [r, c], prefix.length, prefix, node, { ch, hit: false }, null, null)
      return
    }
    const nprefix = prefix + ch
    let reported = null
    if (child.word !== null) {
      reported = child.word
      found.push(child.word)
      child.word = null
      push('found-word', 'Word "' + reported + '"', '"' + nprefix + '" completes ' + reported + '; ' + found.length + ' confirmed', [r, c], nprefix.length, nprefix, child, { ch, hit: true }, reported, null)
    }
    grid[r][c] = '#'
    path.push([r, c])
    push('visit', 'Mark and step in', '(' + r + ',' + c + ')=' + ch + ' continues "' + nprefix + '"; depth ' + path.length, [r, c], nprefix.length, nprefix, child, { ch, hit: true }, null, null)
    for (let d = 0; d < WS2_DIRS.length; d++) {
      const nr = r + WS2_DIRS[d][0]
      const nc = c + WS2_DIRS[d][1]
      push('explore', 'Step to neighbor', 'from (' + r + ',' + c + ') try (' + nr + ',' + nc + ') for "' + nprefix + '"', [r, c], nprefix.length, nprefix, child, null, null, null)
      dfs(nr, nc, child, nprefix)
    }
    grid[r][c] = ch
    path.pop()
    push('unchoose', 'Un-mark cell', 'restore (' + r + ',' + c + ')=' + ch + '; depth ' + path.length, [r, c], nprefix.length, nprefix, child, null, null, null)
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      push('scan', 'Scan cell', 'scan (' + r + ',' + c + ')=' + grid[r][c] + ' against trie root', [r, c], 0, '', root, { ch: grid[r][c], hit: ws2ChildOf(root, grid[r][c]) !== null }, null, null)
      if (ws2ChildOf(root, grid[r][c])) {
        push('enter', 'Enter DFS', '(' + r + ',' + c + ')=' + grid[r][c] + ' starts a live prefix', [r, c], 0, '', root, { ch: grid[r][c], hit: true }, null, null)
        dfs(r, c, root, '')
      }
    }
  }

  const verdict = found.slice().sort()
  push('done', found.length ? 'Return ' + found.length + ' words' : 'Return []', found.length ? 'found: ' + verdict.join(', ') : 'no word completed; return []', null, 0, '', root, null, null, verdict)

  let out = frames
  const anchors = []
  const firstEnter = out.findIndex((f) => f.step === 'enter')
  if (firstEnter >= 0) anchors.push(firstEnter)
  out.forEach((f, i) => { if (f.step === 'found-word') anchors.push(i) })
  anchors.push(out.length - 1)

  return {
    kind: 'grid',
    layout: { rows, cols, cells: board.map((r) => r.slice()), trie: { nodes, edges } },
    frames: out,
    result: verdict,
    anchors: [...new Set(anchors.filter((i) => Number.isInteger(i) && i >= 0 && i < out.length))].sort((a, b) => a - b),
  }
}

export const adapters = {
  'subsets': {
    signature: { name: 'subsets', params: ['int[]'], return: 'int[][]' },
    lesson: {
      idea: 'The recursion path is the partial subset; record it, then choose each later index, recurse, and un-choose.',
      trap: 'Forgetting path.removeLast() leaks the choice into the next branch and corrupts later subsets.',
      time: 'O(n * 2^n)',
      space: 'O(n * 2^n)'
    },
    code: { java: subsetsJava, cpp: subsetsCpp, pseudo: subsetsPseudo },
    explain: subsetsExplain,
    explainLines: subsetsExplainLines,
    build: buildSubsets
  },
  'permutations': {
    signature: { name: 'permute', params: ['int[]'], return: 'int[][]' },
    lesson: {
      idea: 'Fix positions left to right; swap each candidate into first, recurse, then swap back.',
      trap: 'Skipping the swap-back leaks the order into sibling branches; subsets dedup rules do not apply.',
      time: 'O(n * n!)',
      space: 'O(n * n!)'
    },
    // Per-step presentation notes (presentation metadata, never compiled).
    // Keys match the tagged steps in permutationsJava/Cpp/Pseudo above.
    explain: {
      def: 'Declares the solution and helper scope; swap logic and recursion share the same working array.',
      init: 'Creates the empty result list; the working array starts in input order.',
      explore: 'Opens one recursive level with the boundary `first` moved one step right; positions before it are fixed.',
      record: 'Base case first == n: the current order is complete, so a copy is appended. Copying matters — later swaps must not mutate it.',
      choose: 'Swaps nums[first] with nums[i] so position `first` tries a new value. i == first is a self-swap that keeps the order.',
      unchoose: 'Swaps back to restore the order, so the next sibling iteration starts from the same arrangement.',
      return: 'Closes the call with the full recorded list; every leaf contributed exactly one row.'
    },
    explainLines: {
      java: {
        0: 'Import the growable list used for the result rows and each recorded copy.',
        1: 'Import the list interface shared by the result rows and the recorded copies.',
        2: 'Solver container required by the judge harness.',
        3: 'Entry point: receives the distinct array and returns every permutation.',
        4: 'Empty result that will collect one row per leaf of the search.',
        5: 'Launch the search with nothing fixed: boundary first starts at 0.',
        6: 'Return every recorded permutation to the caller.',
        7: 'Close the entry method body.',
        8: 'Worker header: first bounds the fixed prefix; nums and result are shared by reference.',
        9: 'Base test: the boundary reached the end, so the current order is complete.',
        10: 'Fresh row for this leaf; a new list so later swaps cannot mutate it.',
        11: 'Copy the current working order element by element into the fresh row.',
        12: 'Append the copy to the result; the copy (not the live array) is what survives.',
        13: 'Stop this call: a recorded permutation has no children to explore.',
        14: 'Close the base-case branch: anything below runs only while positions remain.',
        15: 'Loop over the unfixed suffix: each index is tried once in position first.',
        16: 'Choose: swap the candidate into position first; i == first is a self-swap.',
        17: 'Recurse one level deeper with the prefix extended by one fixed slot.',
        18: 'Un-choose: swap back so the next sibling starts from the same order.',
        19: 'Close the loop body; the working order is restored by the swap-back above.',
        20: 'Close the worker; control returns to the caller to continue its own loop.',
        21: 'Helper header: exchanges the values at two positions in place.',
        22: 'Three-step exchange through a temporary; the multiset of values never changes.',
        23: 'Close the swap helper.',
        24: 'Close the class.'
      },
      cpp: {
        0: 'Provide std::swap for the in-place position exchange.',
        1: 'Provide the growable vector used for the result rows and working array.',
        2: 'Bring the standard names into scope for the compact listing.',
        3: 'Solver container required by the judge harness.',
        4: 'Public entry section: the tested method lives here.',
        5: 'Entry point: receives the distinct array by reference and returns every permutation.',
        6: 'Empty result that will collect one row per leaf of the search.',
        7: 'Launch the search with nothing fixed: boundary first starts at 0.',
        8: 'Return every recorded permutation to the caller.',
        9: 'Close the entry method body.',
        10: 'Private helper section: the recursive worker lives here.',
        11: 'Worker header: first bounds the fixed prefix; nums and result are shared by reference.',
        12: 'Base test: the boundary reached the end, so the current order is complete.',
        13: 'Append a copy of the current order; push_back copies, so later swaps cannot mutate it.',
        14: 'Stop this call: a recorded permutation has no children to explore.',
        15: 'Close the base-case branch: anything below runs only while positions remain.',
        16: 'Loop over the unfixed suffix: each index is tried once in position first.',
        17: 'Choose: swap the candidate into position first; i == first is a self-swap.',
        18: 'Recurse one level deeper with the prefix extended by one fixed slot.',
        19: 'Un-choose: swap back so the next sibling starts from the same order.',
        20: 'Close the loop body; the working order is restored by the swap-back above.',
        21: 'Close the worker; control returns to the caller to continue its own loop.',
        22: 'Close the class; the trailing semicolon ends a C++ class definition.'
      },
      pseudo: {
        0: 'Entry header: takes the distinct array and returns every permutation.',
        1: 'Empty result that will collect one row per leaf of the search.',
        2: 'Launch the search with nothing fixed: boundary first starts at 0.',
        3: 'Return every recorded permutation to the caller.',
        4: 'Worker header: first bounds the fixed prefix shared with the caller.',
        5: 'Base rule: the boundary reached the end, so the current order is complete.',
        6: 'Record a copy of the current order and stop; the copy outlives later swaps.',
        7: 'Loop over the unfixed suffix: each index is tried once in position first.',
        8: 'Choose: swap the candidate into position first.',
        9: 'Recurse one level deeper with the prefix extended by one fixed slot.',
        10: 'Un-choose: swap back so the next sibling starts from the same order.'
      }
    },
    code: { java: permutationsJava, cpp: permutationsCpp, pseudo: permutationsPseudo },
    build: buildPermutations
  },
  'combination-sum': {
    signature: { name: 'combinationSum', params: ['int[]', 'int'], return: 'int[][]' },
    lesson: {
      idea: 'DFS over start index with unlimited reuse: pick candidates[i], recurse at i (not i+1), then un-pick; remain==0 records, remain<0 prunes.',
      trap: 'Recursing at i+1 forbids reuse and misses answers; skipping the un-choose or the remain<0 prune leaks state or explodes the tree.',
      time: 'O(N^(target/min)) worst case, bounded by the search tree over reuse choices',
      space: 'O(target/min) recursion depth plus output',
      alt: 'Bottom-up DP over remainders: let dp[r] hold all combos summing to r, built from dp[r-c] for each candidate c. Same output with no recursion, but it materializes every intermediate remainder table instead of one live path; the recursive DFS above is the editorial form and uses O(target/min) stack.'
    },
    // Per-line explanations (presentation metadata, never compiled).
    // From the reviewed Q150 code-notes.json; code blocks verified
    // byte-identical to staged, so index-keyed notes apply cleanly.
    explain: {
      choose: 'Append candidates[i] to the path; the value is now committed to this branch and may be picked again deeper down.',
      def: 'Scope of the solver: grouping braces, headers and declarations that hold the methods but execute no algorithm step.',
      explore: 'Enter (or re-enter) the search with a start bound and a remaining sum; each call owns one suffix of the candidates.',
      found: 'Remain hit exactly 0, so the current path is a complete answer worth copying into the result.',
      init: 'Start with an empty result and an empty path so the search builds its first combination from nothing.',
      prune: 'Remain went negative, so this branch overshot the target and the whole subtree is dead.',
      return: 'Hand back every recorded combination; the working path is empty again at the top level.',
      unchoose: 'Remove the last pick to restore the path before the next sibling branch runs.'
    },
    explainLines: {
      cpp: {
        0: 'Include the growable array used for the result rows and the working path.', 1: 'Bring the standard names into scope for the compact listing.', 2: 'Solver container required by the judge harness.', 3: 'Public entry section: the tested method lives here.', 4: 'Entry point: receives the candidates by reference and the target sum.', 5: 'Empty result that will collect one row per valid combination.', 6: 'Empty working path holding the picks on the current branch only.', 7: 'Launch the search at start 0 owing the full target.', 8: 'Return the collected combinations to the caller.', 9: 'Close the public method body.', 10: 'Private helper section: the recursive worker lives here.', 11: 'Worker header: start bounds the loop, remain tracks the sum still owed, path/result are shared by reference.', 12: 'Hit test: remain 0 means the path sums exactly to target.', 13: 'Copy the path into the result; the copy (not the live path) is what survives backtracking.', 14: 'Stop this call: a recorded answer has no children to explore.', 15: 'Close the hit branch: anything below falls through to the overshoot guard.', 16: 'Overshoot guard: negative remain means the last pick went past target.', 17: 'Abandon this branch; the caller will un-pick and try its next sibling.', 18: 'Close the overshoot guard: the loop below runs only for remain > 0.', 19: 'Loop over the owned suffix: each index is tried once as the next pick.', 20: 'Choose: append candidates[i]; the same slot stays eligible below (reuse).', 21: 'Recurse at the SAME index i with remain reduced: this is the unlimited-reuse step.', 22: 'Un-choose: pop the last pick so the next sibling starts from a clean path.', 23: 'Close the loop body; path length is restored by the pop above.', 24: 'Close the worker; control returns to the caller to continue its own loop.', 25: 'Close the class; the trailing semicolon ends a C++ class definition.'
      },
      java: {
        0: 'Import the resizable list used for the result and each recorded combination.', 1: 'Import the list interface shared by the result rows and the working path.', 2: 'Solver container required by the judge harness.', 3: 'Entry point: receives the candidates array and the target sum to hit exactly.', 4: 'Empty result that will collect one row per valid combination.', 5: 'Empty working path holding the picks on the current branch only.', 6: 'Launch the search at start 0 owing the full target.', 7: 'Return the collected combinations to the caller.', 8: 'Close the entry method body.', 9: 'Worker header: start bounds the loop, remain tracks the sum still owed, path/result are shared by reference.', 10: 'Hit test: remain 0 means the path sums exactly to target.', 11: 'Copy the path into the result; the copy (not the live path) is what survives backtracking.', 12: 'Stop this call: a recorded answer has no children to explore.', 13: 'Close the hit branch: anything below falls through to the overshoot guard.', 14: 'Overshoot guard: negative remain means the last pick went past target.', 15: 'Abandon this branch; the caller will un-pick and try its next sibling.', 16: 'Close the overshoot guard: the loop below runs only for remain > 0.', 17: 'Loop over the owned suffix: each index is tried once as the next pick.', 18: 'Choose: append candidates[i]; the same slot stays eligible below (reuse).', 19: 'Recurse at the SAME index i with remain reduced: this is the unlimited-reuse step.', 20: 'Un-choose: remove the last pick so the next sibling starts from a clean path.', 21: 'Close the loop body; path length is restored by the removal above.', 22: 'Close the worker; control returns to the caller to continue its own loop.', 23: 'Close the class.'
      },
      pseudo: {
        0: 'Entry header: takes the candidates and the target sum to hit exactly.', 1: 'Empty result plus empty working path: the two accumulators of the search.', 2: 'Launch the search at start 0 owing the full target.', 3: 'Return every recorded combination to the caller.', 4: 'Worker header: start bounds the loop and remain tracks the sum still owed.', 5: 'Hit rule: remain 0 records a copy of the path and stops this call.', 6: 'Overshoot rule: negative remain abandons the branch with no children.', 7: 'Loop over the owned suffix: each index is tried once as the next pick.', 8: 'Choose: append candidates[i] to the working path.', 9: 'Recurse at the SAME index i with remain reduced: the unlimited-reuse step.', 10: 'Un-choose: drop the last pick to restore the path for the next sibling.'
      }
    },
    code: { java: combinationSumJava, cpp: combinationSumCpp, pseudo: combinationSumPseudo },
    build: buildCombinationSum
  },
  'word-search': {
    signature: { name: 'exist', params: ['char[][]', 'string'], return: 'boolean' },
    lesson: {
      idea: 'Start a DFS from every cell matching word[0]; match-mark-recurse-unmark advances k by one per 4-neighbor step and reuses no cell.',
      trap: 'Forgetting to restore board[r][c] after recursion poisons sibling starts; comparing against word[k] before the k==len done-check breaks single-letter and completion cases.',
      time: 'O(m*n*3^L) worst case over DFS branches of word length L',
      space: 'O(L) recursion depth plus in-place marks',
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      check: 'Admits only cells matching the first word letter into DFS; other cells can never begin this word.',
      def: 'Declares the solution and helper scope; scan logic and DFS logic share the board bounds but stay separated.',
      enter: 'Opens one recursive attempt from this start; a true result short-circuits the whole scan.',
      explore: 'Tries all four neighbors for the next letter; the chain stops at the first success, and only orthogonal steps count.',
      found: 'Done-check first: every letter matched, so it returns true even when the position stepped out of bounds.',
      init: 'Declares the live board dimensions once; every bounds guard reads these locals.',
      mismatch: 'Kills this path on out-of-bounds steps or letter inequality; marked cells mismatch too, so no cell is reused.',
      prune: 'Skips the exponential DFS when board letter frequencies cannot cover the word; pruning only saves work.',
      return: 'Closes the attempt with the live outcome; false backtracks one level, true unwinds the whole search.',
      scan: 'Walks every cell in row order as a possible path start; no start is skipped before returning false.',
      unchoose: 'Restores the saved letter so sibling branches see the original board; skipping this leaks marks.',
      visit: 'Saves the letter and marks the cell visited so deeper steps cannot reuse it; the copy enables restore.',
    },
    code: { java: wordSearchJava, cpp: wordSearchCpp, pseudo: wordSearchPseudo },
    build: buildWordSearch,
  },
  'word-search-ii': {
    signature: { name: 'findWords', params: ['char[][]', 'string[]'], return: 'string[]' },
    lesson: {
      idea: 'Build one trie for all words, then DFS every cell: follow trie edges, record words at terminal nodes, null each terminal after its first report so duplicates never recur.',
      trap: 'Forgetting to null child.word after recording lets a second path report the same word again; skipping the mark/restore pair leaks consumed cells into sibling branches.',
      time: 'O(m*n*3^L) worst case over DFS branches of the longest word length L',
      space: 'O(W) trie nodes for total word characters plus O(L) recursion depth'
    },
    // Per-line explanations (presentation metadata, never compiled).
    // Keys match the tagged steps in wordSearchIIJava/Cpp/Pseudo above.
    explain: {
      def: 'Declares the trie node shape and the multi-word search scope; the scan owns starts while DFS owns paths.',
      trie: 'Builds the shared prefix trie once: each word is inserted letter by letter, terminals carry their word.',
      init: 'Declares the live board dimensions plus the empty verdict list; every bounds guard reads these locals.',
      scan: 'Walks every cell in row order as a possible path start; no start is skipped before the verdict.',
      enter: 'Opens a DFS from a cell whose letter continues a live trie path; other cells cannot begin this search.',
      mismatch: 'Kills this path on out-of-bounds steps before any board read; the step counter does not advance.',
      revisit: 'Kills this path when the cell is already marked on the current path; marked cells are never reused.',
      'trie-prune': 'Kills this path when no trie edge continues the prefix; the whole subtree is dead, no word extends it.',
      visit: 'Saves the letter and marks the cell visited so deeper steps cannot reuse it; the saved copy enables restore.',
      found: 'Done-check at each visit: a terminal node means the prefix is a complete word, so record it at once.',
      'found-word': 'Records the completed word and disarms its terminal so a second path spelling it reports nothing.',
      explore: 'Tries all four orthogonal neighbors in fixed down/up/right/left order; the chain advances one letter per step.',
      unchoose: 'Restores the saved letter so sibling branches see the original board; skipping this corrupts the rest of the scan.',
      done: 'Returns the sorted verdict: deterministic order turns discovery sequence into an exact-comparable list.'
    },
    code: { java: wordSearchIIJava, cpp: wordSearchIICpp, pseudo: wordSearchIIPseudo },
    build: buildWordSearchII
  }
}
