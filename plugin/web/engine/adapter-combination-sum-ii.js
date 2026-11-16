/**
 * combination-sum-ii — standalone walkthrough adapter (batch13).
 *
 * Sort + DFS(i+1) with same-level duplicate skip (LeetCode 40): sort first so
 * duplicates group; DFS from start uses each element at most once (recurse at
 * i+1); skip candidates[i]==candidates[i-1] at the same level; break the level
 * when the sorted value exceeds remain. Found paths are recorded on remain==0.
 *
 * Staged source: .workers/jobs/question-owners-150/combination-sum-ii/combination-sum-ii.adapter.js
 * (buildCombinationSum2 frames/steps/notes, code blocks, lesson, explain,
 * explainLines, combinationSum2Reference) — byte-faithful, except the import
 * now targets the live engine module (the staged file imported a local
 * re-export shim of identical shape). Full frame lists + anchors are returned;
 * the host applies the single boundedFrames sampling pass. Official example 1
 * emits 86 raw events, compacted by the host to 40 frames.
 *
 * Signature equals the live judge signature exactly:
 * combinationSum2(candidates: int[], target: int) -> int[][] (plugin/data/shard-5.json).
 */

import { code, frame, boundedFrames } from './semantic-core.js'

void boundedFrames

// Visual bound: combination trees grow as 2^n, so the walkthrough accepts
// n <= 7 (both judge examples fit: 7 and 5) and rejects larger inputs with
// a clear error instead of truncating them. Values/target follow the real
// constraints (candidates[i] 1..50, target 1..30).

const MAX_N = 7
const MIN_VALUE = 1
const MAX_VALUE = 50
const MIN_TARGET = 1
const MAX_TARGET = 30

function decodeCandidates (value) {
  if (!Array.isArray(value)) throw new Error('Provide an integer array candidates for this walkthrough')
  if (value.length < 1) throw new Error('Visual walkthrough needs at least 1 candidate (0 given)')
  if (value.length > MAX_N) throw new Error('Visual walkthrough limited to candidates length <= ' + MAX_N + ' (' + value.length + ' given); combination trees explode')
  for (let k = 0; k < value.length; k++) {
    if (!Number.isSafeInteger(value[k])) throw new Error('candidates[' + k + '] must be a safe integer')
    if (value[k] < MIN_VALUE || value[k] > MAX_VALUE) throw new Error('candidates[' + k + ']=' + value[k] + ' is outside 1..50')
  }
  return value.slice()
}

function decodeTarget (value) {
  if (!Number.isSafeInteger(value)) throw new Error('Provide an integer target for this walkthrough')
  if (value < MIN_TARGET || value > MAX_TARGET) throw new Error('Visual walkthrough limited to target 1..30 (' + value + ' given)')
  return value
}

export const combinationSum2Java = code(`
[def] import java.util.ArrayList;
[def] import java.util.Arrays;
[def] import java.util.List;
[def] class Solution {
[def]     public List<List<Integer>> combinationSum2(int[] candidates, int target) {
[init]         List<List<Integer>> result = new ArrayList<>();
[init]         List<Integer> path = new ArrayList<>();
[sort]         Arrays.sort(candidates);
[explore]         backtrack(candidates, target, 0, path, result);
[return]         return result;
[def]     }
[def]     private void backtrack(int[] candidates, int remain, int start, List<Integer> path, List<List<Integer>> result) {
[explore]         if (remain == 0) {
[found]             result.add(new ArrayList<>(path));
[found]             return;
[explore]         }
[def]         for (int i = start; i < candidates.length; i++) {
[prune]             if (candidates[i] > remain) {
[prune]                 break;
[prune]             }
[skip]             if (i > start && candidates[i] == candidates[i - 1]) {
[skip]                 continue;
[skip]             }
[choose]             path.add(candidates[i]);
[explore]             backtrack(candidates, remain - candidates[i], i + 1, path, result);
[unchoose]             path.remove(path.size() - 1);
[def]         }
[def]     }
[def] }
`)

export const combinationSum2Cpp = code(`
[def] #include <algorithm>
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     vector<vector<int>> combinationSum2(vector<int>& candidates, int target) {
[init]         vector<vector<int>> result;
[init]         vector<int> path;
[sort]         sort(candidates.begin(), candidates.end());
[explore]         backtrack(candidates, target, 0, path, result);
[return]         return result;
[def]     }
[def] private:
[def]     void backtrack(vector<int>& candidates, int remain, int start, vector<int>& path, vector<vector<int>>& result) {
[explore]         if (remain == 0) {
[found]             result.push_back(path);
[found]             return;
[explore]         }
[def]         for (int i = start; i < (int)candidates.size(); i++) {
[prune]             if (candidates[i] > remain) {
[prune]                 break;
[prune]             }
[skip]             if (i > start && candidates[i] == candidates[i - 1]) {
[skip]                 continue;
[skip]             }
[choose]             path.push_back(candidates[i]);
[explore]             backtrack(candidates, remain - candidates[i], i + 1, path, result);
[unchoose]             path.pop_back();
[def]         }
[def]     }
[def] };
`)

export const combinationSum2Pseudo = code(`
[def] combinationSum2(candidates, target):
[init]   result = []; path = []
[sort]   sort(candidates)
[explore]   backtrack(candidates, target, 0, path, result)
[return]   return result
[def] backtrack(candidates, remain, start, path, result):
[explore]   if remain == 0:
[found]     result.add(copy(path)); return
[explore]   end if
[def]   for i = start to candidates.length - 1:
[prune]     if candidates[i] > remain: break
[skip]     if i > start and candidates[i] == candidates[i - 1]: continue
[choose]     path.add(candidates[i])
[explore]     backtrack(candidates, remain - candidates[i], i + 1, path, result)
[unchoose]     path.removeLast()
`)

// Canonical reference used by the walkthrough AND the practice forge.
// Sorted DFS, same-level duplicate skip, sorted-cutoff prune. Output order is
// deterministic: combos are built from the sorted array left to right.
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

export function buildCombinationSum2 (args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('combination-sum-ii expects [candidates, target]')
  const raw = decodeCandidates(args[0])
  const target = decodeTarget(args[1])
  const sorted = raw.slice().sort((a, b) => a - b)
  const result = []
  const path = []
  const frames = []
  const anchors = []

  const snap = (start, index, remain) => ({
    candidates: sorted.slice(),
    values: sorted.slice(),
    target,
    path: path.slice(),
    result: result.map(s => s.slice()),
    start,
    index,
    remain,
    depth: path.length,
    answer: result.length,
    vars: { start, index, remain, depth: path.length }
  })

  const push = (step, label, note, start, index, remain) => {
    frames.push(frame(step, label, note, snap(start, index, remain)))
  }

  push('init', 'Initialize', 'candidates=[' + raw.join(',') + '], target=' + target + ', path=[]', 0, null, target)
  push('sort', 'Sort candidates', 'Sorted [' + sorted.join(',') + ']; equal values group for dedup', 0, null, target)

  function dfs (remain, start) {
    push('explore', 'Explore', 'Enter start=' + start + ' remain=' + remain + ' path=[' + path.join(',') + ']', start, null, remain)
    if (remain === 0) {
      result.push(path.slice())
      push('found', 'Found combination', 'remain=0, save #' + (result.length - 1) + ' [' + path.join(',') + ']', start, null, remain)
      anchors.push(frames.length - 1)
      return
    }
    for (let i = start; i < sorted.length; i++) {
      const v = sorted[i]
      if (v > remain) {
        push('prune', 'Prune sorted tail', 'candidates[' + i + ']=' + v + ' > remain=' + remain + ', break', start, i, remain)
        break
      }
      if (i > start && v === sorted[i - 1]) {
        push('skip', 'Skip duplicate', 'Skip candidates[' + i + ']=' + v + ' (same as [' + (i - 1) + '] at start=' + start + ')', start, i, remain)
        continue
      }
      const next = remain - v
      path.push(v)
      push('choose', 'Choose', 'Choose candidates[' + i + ']=' + v + '; path=[' + path.join(',') + '] remain=' + remain, start, i, remain)
      push('explore', 'Recurse', 'Recurse start=' + (i + 1) + ' remain ' + remain + '->' + next, i + 1, i, next)
      dfs(next, i + 1)
      path.pop()
      push('unchoose', 'Un-choose', 'Un-choose candidates[' + i + ']=' + v + '; path=[' + path.join(',') + ']', start, i, remain)
    }
  }

  dfs(target, 0)

  push('return', 'Return result', 'Done; ' + result.length + ' unique combinations returned', null, null, 0)

  return {
    kind: 'array',
    layout: { values: sorted.slice() },
    frames,
    result: result.map(s => s.slice()),
    anchors
  }
}

export const combinationSum2Adapter = {
  signature: { name: 'combinationSum2', params: ['int[]', 'int'], return: 'int[][]' },
  lesson: {
    idea: 'Sort first so duplicates group; DFS from start with each element used once (recurse i+1), skip candidates[i]==candidates[i-1] at the same level, break when the value exceeds remain.',
    trap: 'Forgetting the sort lets duplicates scatter and the skip test never fires; recursing at i instead of i+1 reuses one element twice and invents combos like [2,2] from a single 2.',
    time: 'O(2^n) worst case over subsets, plus O(n log n) sort; the sorted cutoff prunes tails early',
    space: 'O(n) path plus recursion depth, not counting the output',
    alternative: 'Count frequencies of each distinct value, then DFS over distinct values trying 0..freq copies. Same unique output with fewer skip events; the per-index skip version above is simpler and matches the editorial.'
  },
  explain: {
    def: 'Scope of the solver: grouping braces that hold the methods but execute no algorithm step.',
    init: 'Start empty result and path so the search builds its first combination from nothing.',
    sort: 'Sort ascending so equal values sit together and larger values form a prunable tail.',
    explore: 'Enter the search at start with remain left; every call owns one suffix of the array.',
    choose: 'Append candidates[i] to the path; the element is now committed to this branch.',
    skip: 'Skip a repeated value at the same start so the identical combination is never built twice.',
    found: 'Remain hit zero so the current path is a complete unique answer worth copying.',
    prune: 'Sorted order proves this and every later value overshoots, so stop this level here.',
    unchoose: 'Remove the last choice to restore the path before the next sibling branch runs.',
    return: 'Hand back every recorded combination; the path itself stays empty at the top level.'
  },
  explainLines: {
    java: {
      0: 'Import the resizable list used for the result and each recorded combination.',
      1: 'Import the sorter that groups equal candidates before the search starts.',
      2: 'Import the list interface shared by the result rows and the working path.',
      4: 'Entry point: receives the raw candidates and the target sum to hit exactly.',
      11: 'Helper header: remain tracks the sum still needed, start forbids reusing earlier slots.',
      16: 'Loop over the owned suffix: each index is tried once as the next pick.',
      19: 'End of the overshoot guard: the break above exits the whole level, not one branch.',
      22: 'End of the duplicate guard: the continue above skips only this repeated value.',
      26: 'End of the loop body: the path is restored here, so siblings start clean.'
    },
    cpp: {
      0: 'Include the sorter that groups equal candidates before the search starts.',
      1: 'Include the growable array used for the result rows and the working path.',
      5: 'Entry point: receives the candidates by reference and the target sum.',
      13: 'Helper header: remain tracks the sum still needed, start forbids reusing earlier slots.',
      18: 'Loop over the owned suffix: each index is tried once as the next pick.',
      21: 'End of the overshoot guard: the break above exits the whole level, not one branch.',
      24: 'End of the duplicate guard: the continue above skips only this repeated value.',
      28: 'End of the loop body: the path is restored here, so siblings start clean.'
    },
    pseudo: {
      8: 'End of the hit test: a miss falls through to the loop over this level.'
    }
  },
  code: { java: combinationSum2Java, cpp: combinationSum2Cpp, pseudo: combinationSum2Pseudo },
  build: buildCombinationSum2
}

// Registry-ready export: spread into the backtracking family without editing it.
export const adapters = {
  'combination-sum-ii': combinationSum2Adapter
}
