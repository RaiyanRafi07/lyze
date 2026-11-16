/**
 * subsets-ii — standalone walkthrough adapter (batch13).
 *
 * Sort-once + same-level skip DFS: sort nums so equal values sit side by side;
 * DFS over a level start index records a copy of the live path at entry; at one
 * level only the FIRST occurrence of each value is taken
 * (i > start && nums[i] == nums[i-1] skips the repeat family the first
 * occurrence already recorded); choose nums[i], recurse at i+1, un-choose.
 *
 * Staged source: .workers/jobs/question-owners-150/subsets-ii/adapter-subsets-ii.js
 * (buildSubsetsII frames/steps/notes, code blocks, lesson, explain) +
 * explanations.json (per-line reference notes) — reshaped into the live adapter
 * contract (signature/lesson/explain/explainLines/code/build). Code blocks,
 * lesson and explain are byte-faithful to staged; explainLines maps each code
 * line by index to its staged per-line note (mechanical script, explicit
 * index->reference-line table; the condensed skip one-liners reuse the staged
 * guard+prune notes verbatim in composed form). Full frame lists + anchors are
 * returned; the host applies the single boundedFrames sampling pass.
 * Official example 1 emits 25 frames, so no host compaction applies.
 *
 * Signature equals the live judge signature exactly:
 * subsetsWithDup(nums: int[]) -> int[][] (plugin/data/shard-5.json).
 */

import { code, frame, boundedFrames } from './semantic-core.js'

void boundedFrames

// Visual bound: 2^n subsets explode, so the walkthrough stays tiny and rejects
// larger inputs with a clear error instead of truncating them.
const MAX_N = 4

function decodeNums(value) {
  if (!Array.isArray(value)) throw new Error('Provide an integer array nums for this walkthrough')
  if (value.length < 1) throw new Error('Visual walkthrough needs at least 1 element (0 given)')
  if (value.length > MAX_N) throw new Error('Visual walkthrough limited to n <= ' + MAX_N + ' (' + value.length + ' given); 2^n subsets explode')
  for (let k = 0; k < value.length; k++) {
    if (!Number.isSafeInteger(value[k])) throw new Error('nums[' + k + '] must be a safe integer')
  }
  return value.slice()
}

const subsetsIIJava = code(`
[def] import java.util.ArrayList;
[def] import java.util.Arrays;
[def] import java.util.List;
[def] class Solution {
[def]     public List<List<Integer>> subsetsWithDup(int[] nums) {
[init]         Arrays.sort(nums);
[init]         List<List<Integer>> result = new ArrayList<>();
[init]         backtrack(nums, 0, new ArrayList<>(), result);
[return]         return result;
[def]     }
[def]     private void backtrack(int[] nums, int start, List<Integer> path, List<List<Integer>> result) {
[record]         result.add(new ArrayList<>(path));
[def]         for (int i = start; i < nums.length; i++) {
[skip]             if (i > start && nums[i] == nums[i - 1]) continue;
[choose]             path.add(nums[i]);
[explore]             backtrack(nums, i + 1, path, result);
[unchoose]             path.remove(path.size() - 1);
[def]         }
[def]     }
[def] }
`)

const subsetsIICpp = code(`
[def] #include <algorithm>
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     vector<vector<int>> subsetsWithDup(vector<int>& nums) {
[init]         sort(nums.begin(), nums.end());
[init]         vector<vector<int>> result;
[init]         vector<int> path;
[init]         backtrack(nums, 0, path, result);
[return]         return result;
[def]     }
[def] private:
[def]     void backtrack(vector<int>& nums, int start, vector<int>& path, vector<vector<int>>& result) {
[record]         result.push_back(path);
[def]         for (int i = start; i < (int)nums.size(); i++) {
[skip]             if (i > start && nums[i] == nums[i - 1]) continue;
[choose]             path.push_back(nums[i]);
[explore]             backtrack(nums, i + 1, path, result);
[unchoose]             path.pop_back();
[def]         }
[def]     }
[def] };
`)

const subsetsIIPseudo = code(`
[def] subsetsWithDup(nums):
[init]   sort(nums)
[init]   result = []; path = []
[init]   backtrack(nums, 0, path, result)
[return]   return result
[def] backtrack(nums, start, path, result):
[record]   result.add(copy(path))
[def]   for i = start to nums.length - 1:
[skip]     if i > start and nums[i] == nums[i-1]: continue
[choose]     path.add(nums[i])
[explore]     backtrack(nums, i + 1, path, result)
[unchoose]     path.removeLast()
`)

export function buildSubsetsII(args) {
  const raw = decodeNums(args && args[0])
  const nums = raw.slice().sort((a, b) => a - b)
  const n = nums.length
  const result = []
  const path = []
  const frames = []
  const anchors = []
  let firstUnchooseAnchored = false
  let firstSkipAnchored = false

  const snap = () => ({
    nums: nums.slice(),
    path: path.slice(),
    result: result.map((s) => s.slice()),
    start: null,
    index: null,
    depth: path.length,
    answer: result.length,
    vars: { depth: path.length },
  })

  const push = (step, label, note, start, index) => {
    const s = snap()
    s.start = start
    s.index = index
    s.vars = { start, index, depth: path.length }
    frames.push(frame(step, label, note, s))
  }

  push('init', 'Initialize', 'sorted [' + raw.join(',') + '] -> [' + nums.join(',') + ']; result=[], path=[]', null, null)

  function backtrack(start) {
    result.push(path.slice())
    push('record', 'Record subset', 'start=' + start + ', path=[' + path.join(',') + '] saved #' + (result.length - 1), start, null)
    anchors.push(frames.length - 1)
    for (let i = start; i < n; i++) {
      if (i > start && nums[i] === nums[i - 1]) {
        push('skip', 'Skip duplicate', 'skip nums[' + i + ']=' + nums[i] + ' (== nums[' + (i - 1) + ']); family already recorded', start, i)
        if (!firstSkipAnchored) {
          anchors.push(frames.length - 1)
          firstSkipAnchored = true
        }
        continue
      }
      const v = nums[i]
      path.push(v)
      push('choose', 'Choose', 'choose nums[' + i + ']=' + v + '; path=[' + path.join(',') + ']', start, i)
      push('explore', 'Explore', 'explore start=' + (i + 1) + ' with path=[' + path.join(',') + ']', i + 1, i)
      backtrack(i + 1)
      path.pop()
      push('unchoose', 'Un-choose', 'un-choose nums[' + i + ']=' + v + '; path=[' + path.join(',') + ']', start, i)
      if (!firstUnchooseAnchored) {
        anchors.push(frames.length - 1)
        firstUnchooseAnchored = true
      }
    }
  }

  backtrack(0)

  push('return', 'Return result', 'done; ' + result.length + ' unique subsets returned', null, null)

  return {
    kind: 'array',
    layout: { values: nums.slice() },
    frames,
    result: result.map((s) => s.slice()),
    anchors,
  }
}

export const adapters = {
  'subsets-ii': {
    signature: { name: 'subsetsWithDup', params: ['int[]'], return: 'int[][]' },
    lesson: {
      idea: 'Sort once, then DFS over a level start: record the path at entry, take only the first occurrence of each value per level (i > start && nums[i] == nums[i-1] skips the repeat family), recurse at i+1, un-choose.',
      trap: 'Skipping without i > start prunes the first occurrence too and loses subsets; forgetting path.removeLast() leaks the choice into the next branch; skipping the sort lets equal values hide apart and duplicates return.',
      time: 'O(n * 2^n)',
      space: 'O(n * 2^n)',
    },
    // Per-step explanations (presentation metadata, never compiled).
    // Staged source: adapter-subsets-ii.js (explain verbatim).
    explain: {
      check: 'Admits only safe-integer arrays of length 1..4 into the walkthrough; larger inputs are rejected, never truncated.',
      def: 'Declares the solution and helper scope; sorting, recording, choosing and restoring each map to one place.',
      explore: 'Descends one level deeper (start = i+1) with the choice kept; the deeper call records its own longer subset.',
      init: 'Sorts once so duplicates sit side by side, then opens the DFS with an empty path and an empty result.',
      record: 'Saves a copy of the live path (empty path included); later mutations of path cannot rewrite this entry.',
      return: 'Closes the walkthrough with the live unique-subset count; nothing after this frame changes the answer.',
      choose: 'Appends nums[i] to the live path; this level now builds every subset that extends the longer prefix.',
      skip: 'Prunes nums[i] because it equals nums[i-1] at the same level (i > start): the first occurrence already recorded this whole family.',
      unchoose: 'Pops the choice so the next loop index starts from the same path; skipping this corrupts every later branch.',
    },
    // Built 1:1 from staged explanations.json by script (explicit index ->
    // reference-line table; condensed skip one-liners reuse staged guard+prune
    // notes); verified complete below.
    explainLines: {
  java: {
    0: "Supplies the resizable list used for result and path.",
    1: "Supplies sort; the dedup rule only works on sorted input.",
    2: "Supplies the List interface in the judged signature.",
    3: "LeetCode entry class; the judge instantiates it.",
    4: "Judged signature: int[] in, nested list out; matches the live int[][] profile.",
    5: "Sorts in place once so equal values become neighbors; every later skip test reads this order.",
    6: "Owns every recorded subset; empty until the DFS records the empty path.",
    7: "Opens level 0 with an empty path; all subsets grow from this call.",
    8: "Returns the collected unique subsets in recording order; judge compares order-insensitively.",
    9: "Ends the judged method.",
    10: "Level contract: subsets extending path may only use indices >= start, keeping combinations index-ordered.",
    11: "Records a snapshot copy of the live path now (empty path included); later removals cannot rewrite it.",
    12: "Tries each index from start onward exactly once per level; start (not 0) prevents index reuse and reorder duplicates.",
    13: "Duplicate guard: past the first occurrence at this level, an equal value is pruned without touching path or result.",
    14: "Chooses nums[i]; the deeper level now extends this longer prefix.",
    15: "Recurses strictly rightward (i + 1), so each index is used at most once per subset.",
    16: "Un-chooses: restores the path so the next loop index branches from the same prefix; omitting this corrupts siblings.",
    17: "Ends the per-level choice loop.",
    18: "Ends the helper.",
    19: "Ends the Solution class.",
  },
  cpp: {
    0: "Brings in sort; the dedup rule only works on sorted input.",
    1: "Declares vector for the subset containers.",
    2: "Avoids std:: prefixes in this standalone reference.",
    3: "LeetCode entry class; the judge instantiates it.",
    4: "Exposes the judged method.",
    5: "Judged signature: reference parameter, nested-vector return; matches the live int[][] profile.",
    6: "Sorts in place once so equal values become neighbors; every later skip test reads this order.",
    7: "Owns every recorded subset; empty until the DFS records the empty path.",
    8: "Live choice stack; always holds exactly the current recursion prefix.",
    9: "Opens level 0 with an empty path; all subsets grow from this call.",
    10: "Returns the collected unique subsets in recording order; judge compares order-insensitively.",
    11: "Ends the judged method.",
    12: "Helper is an implementation detail, not part of the judged interface.",
    13: "Level contract: subsets extending path may only use indices >= start, keeping combinations index-ordered.",
    14: "Records a copy of the live path now (empty path included); later pops cannot rewrite it.",
    15: "Tries each index from start onward exactly once per level; start (not 0) prevents index reuse and reorder duplicates.",
    16: "Duplicate guard: past the first occurrence at this level, an equal value is pruned without touching path or result.",
    17: "Chooses nums[i]; the deeper level now extends this longer prefix.",
    18: "Recurses strictly rightward (i + 1), so each index is used at most once per subset.",
    19: "Un-chooses: restores the path so the next loop index branches from the same prefix; omitting this corrupts siblings.",
    20: "Ends the per-level choice loop.",
    21: "Ends the helper.",
    22: "Ends the Solution class.",
  },
  pseudo: {
    0: "Entry: same input/output contract as the judged method.",
    1: "Sort once so duplicates sit side by side for the level skip test.",
    2: "result collects snapshots; path is the live choice stack.",
    3: "Opens level 0 with an empty path.",
    4: "All unique subsets, recording order; compared order-insensitively.",
    5: "Level contract: only indices >= start may extend path.",
    6: "Snapshot the path now; later edits must not rewrite it.",
    7: "One branch per index from start onward.",
    8: "Same-level repeat test: the first occurrence stays; repeats skip the branch, path and result untouched.",
    9: "Choose nums[i] onto the live path.",
    10: "Recurse rightward so no index is reused within one subset.",
    11: "Un-choose to restore the prefix for the next sibling branch.",
  },
},
    code: { java: subsetsIIJava, cpp: subsetsIICpp, pseudo: subsetsIIPseudo },
    build: buildSubsetsII,
  }
}

export const visualBounds = { minN: 1, maxN: MAX_N }
