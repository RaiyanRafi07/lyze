/**
 * letter-combinations-of-a-phone-number — portable per-slug staged adapter (Backtracking).
 *
 * Walkthrough scene for slug `letter-combinations-of-a-phone-number` (Letter
 * Combinations of a Phone Number, Medium, LeetCode 17). Live record:
 * plugin/data/shard-5.json carries judge tests with signature
 *   letterCombinations(digits: string) -> string[], mode unordered.
 * The adapter `signature` below equals that live judge signature exactly
 * (name/return/param types), so the walkthrough never throws.
 *
 * Real operation: DFS over digit positions with the telephone keypad table;
 * append each letter of keys[digit], recurse at index+1, then un-choose.
 * Every frame is emitted from genuine execution state (live index/path,
 * recorded combos so far). The empty input is guarded: no digits means no
 * combinations ([]), never one empty string.
 *
 * Pure ES module: no DOM, no network, no dependencies besides semantic-core.js.
 * Visual bound digits.length <= 4, digits 2..9 only; violations throw before
 * any frame renders. Longer raw event lists are compacted by the single
 * boundedFrames pass (mirrors semantic.js), so skip counts are honest.
 */

import { code, frame, boundedFrames } from './semantic-core.js'

export const SLUG = 'letter-combinations-of-a-phone-number'

// Live judge signature, exactly (judgeable slug): name/return/param types match
// plugin/data/shard-5.json :: letter-combinations-of-a-phone-number judge.signature.
export const SIGNATURE = {
  name: 'letterCombinations',
  params: ['string'],
  return: 'string[]',
}

export const MODE = 'unordered'

const KEYS = ['', '', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz']

function decodeDigits(value) {
  if (typeof value !== 'string') throw new Error('Provide a digit string digits for this walkthrough')
  if (value.length > 4) throw new Error('Visual walkthrough limited to digits.length <= 4 (' + value.length + ' given)')
  for (let k = 0; k < value.length; k++) {
    if (value[k] < '2' || value[k] > '9') throw new Error('digits[' + k + ']=' + JSON.stringify(value[k]) + ' is outside 2..9')
  }
  return value
}

const clip = (text) => {
  const s = String(text)
  return s.length <= 140 ? s : s.slice(0, 137) + '...'
}

const letterJava = code(`
[def] import java.util.ArrayList;
[def] import java.util.List;
[def] class Solution {
[def]     public List<String> letterCombinations(String digits) {
[init]         List<String> result = new ArrayList<>();
[prune]         if (digits == null || digits.length() == 0) {
[prune]             return result;
[def]         }
[init]         String[] keys = {"", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"};
[init]         StringBuilder path = new StringBuilder();
[explore]         backtrack(digits, 0, keys, path, result);
[return]         return result;
[def]     }
[def]     private void backtrack(String digits, int index, String[] keys, StringBuilder path, List<String> result) {
[explore]         if (index == digits.length()) {
[record]             result.add(path.toString());
[record]             return;
[def]         }
[def]         for (char c : keys[digits.charAt(index) - '0'].toCharArray()) {
[choose]             path.append(c);
[explore]             backtrack(digits, index + 1, keys, path, result);
[unchoose]             path.deleteCharAt(path.length() - 1);
[def]         }
[def]     }
[def] }
`)

const letterCpp = code(`
[def] #include <string>
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     vector<string> letterCombinations(string digits) {
[init]         vector<string> result;
[prune]         if (digits.empty()) {
[prune]             return result;
[def]         }
[init]         vector<string> keys = {"", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"};
[init]         string path;
[explore]         backtrack(digits, 0, keys, path, result);
[return]         return result;
[def]     }
[def] private:
[def]     void backtrack(const string& digits, int index, vector<string>& keys, string& path, vector<string>& result) {
[explore]         if (index == (int)digits.size()) {
[record]             result.push_back(path);
[record]             return;
[def]         }
[def]         for (char c : keys[digits[index] - '0']) {
[choose]             path.push_back(c);
[explore]             backtrack(digits, index + 1, keys, path, result);
[unchoose]             path.pop_back();
[def]         }
[def]     }
[def] };
`)

const letterPseudo = code(`
[def] letterCombinations(digits):
[init]   result = []
[prune]   if digits is empty: return result
[init]   keys = ["", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"]
[init]   path = []
[explore]   backtrack(digits, 0, keys, path, result)
[return]   return result
[def] backtrack(digits, index, keys, path, result):
[explore]   if index == digits.length:
[record]     result.add(join(path)); return
[def]   for c in keys[digits[index]]:
[choose]     path.add(c)
[explore]     backtrack(digits, index + 1, keys, path, result)
[unchoose]     path.removeLast()
`)

const EXPLAIN = {
  def: 'Scaffolding that declares structure or opens a loop scope; the branching work happens on the operation lines.',
  init: 'Set up the answer list, keypad table, and empty path before branching on digits.',
  prune: 'Guard the empty input: no digits means no combinations, so return the empty list.',
  explore: 'Recurse to the next digit position with the path extended by one letter.',
  choose: 'Append one letter of the current digit to the path being built.',
  record: 'Record a copy of the finished path when every digit position is filled.',
  unchoose: 'Remove the last letter to restore the path for the next sibling letter.',
  return: 'Hand back the full list of combinations collected so far.',
}

export const EXPLAIN_LINES = {
  java: {
    7: 'End of the empty-input guard: a miss falls through to build the keypad table.',
    22: 'End of one letter iteration: the restored path is now visible to the next sibling.',
  },
  cpp: {
    9: 'End of the empty-input guard: a miss falls through to build the keypad table.',
    25: 'End of one letter iteration: the restored path is now visible to the next sibling.',
  },
  pseudo: {},
}

// Every frame below is a REAL DFS execution event: init, empty-guard prune,
// one explore per visited position, choose/recurse/unchoose around each taken
// letter, record per finished combination (own full path), plus return.
function build(args) {
  let raw = Array.isArray(args) && args.length > 0 ? args[0] : args
  if (typeof raw === 'string' && raw.length >= 2 && raw[0] === '"' && raw[raw.length - 1] === '"') {
    try { raw = JSON.parse(raw) } catch { /* fall through to decodeDigits error */ }
  }
  const digits = decodeDigits(raw)
  const result = []
  const path = []
  const frames = []
  const anchors = []

  const snap = (index) => ({
    digits,
    keys: KEYS.slice(2),
    path: path.slice(),
    result: result.map((s) => s),
    index,
    depth: index === null || index === undefined ? 0 : index,
    answer: result.length,
    vars: { index, depth: index === null || index === undefined ? 0 : index },
  })
  const push = (step, label, note, index) => {
    frames.push(frame(step, clip(label).slice(0, 60), clip(note), snap(index)))
  }

  anchors.push(0)
  push('init', 'Initialize', 'digits="' + digits + '", result=[], path=[]', null)
  if (digits.length === 0) {
    push('prune', 'Empty input', 'digits is empty, return [] with no branching', null)
    push('return', 'Return result', 'Done; 0 combinations returned', null)
    anchors.push(frames.length - 1)
    return { kind: 'string', layout: { chars: [] }, frames, result: [], anchors }
  }
  push('explore', 'Start search', 'Branch on digit 0 (' + JSON.stringify(KEYS[digits.charCodeAt(0) - 48]) + '), path=[]', 0)

  let firstRecordAnchored = false
  let firstUnchooseAnchored = false

  function dfs(index) {
    push('explore', 'Enter position', 'index=' + index + ' digit=' + digits[index] + ' letters=' + KEYS[digits.charCodeAt(index) - 48] + ' path=' + path.join(''), index)
    if (index === digits.length) {
      result.push(path.join(''))
      push('record', 'Record combo', 'Full path "' + path.join('') + '" saved #' + (result.length - 1), index)
      if (!firstRecordAnchored) { anchors.push(frames.length - 1); firstRecordAnchored = true }
      return
    }
    const letters = KEYS[digits.charCodeAt(index) - 48]
    for (let k = 0; k < letters.length; k++) {
      const c = letters[k]
      path.push(c)
      push('choose', 'Choose letter', 'Append "' + c + '" for digit ' + digits[index] + '; path=' + path.join(''), index)
      push('explore', 'Recurse', 'Recurse index ' + index + '->' + (index + 1) + ' path=' + path.join(''), index + 1)
      dfs(index + 1)
      path.pop()
      push('unchoose', 'Un-choose', 'Remove "' + c + '"; path=' + (path.join('') || '(empty)'), index)
      if (!firstUnchooseAnchored) { anchors.push(frames.length - 1); firstUnchooseAnchored = true }
    }
  }

  dfs(0)
  push('return', 'Return result', 'Done; ' + result.length + ' combinations returned', null)
  anchors.push(frames.length - 1)

  // Single compaction pass (mirrors semantic.js): longer raw event lists sample
  // here, once, with honest skip counts and surviving anchors.
  const cleanAnchors = [...new Set(anchors.filter((i) => Number.isInteger(i) && i >= 0 && i < frames.length))].sort((a, b) => a - b)
  const { frames: compact } = boundedFrames(frames, 40, cleanAnchors)
  return {
    kind: 'string',
    layout: { chars: digits.split('') },
    frames: compact,
    result: result.slice(),
    anchors: cleanAnchors,
  }
}

export const adapters = {
  'letter-combinations-of-a-phone-number': {
    // Live judge signature, exactly (judgeable slug, mode unordered).
    signature: SIGNATURE,
    lesson: {
      idea: 'DFS over digit positions: append each letter of keys[digit], recurse at index+1, then remove it so siblings start clean. The empty path at index==n is one finished combination.',
      trap: 'Empty digits must return [] (not [""]): guard before recursing. Forgetting the un-choose leaks a letter into the next sibling branch. Keys index is digit-\'0\', and 7/9 have 4 letters, not 3.',
      time: 'O(4^n) worst case for n digits (7/9 branch 4 ways; output itself dominates).',
      space: 'O(n) recursion depth plus the output list.',
      alternate: 'Iterative BFS queue: start with [""], and for each digit replace every prefix with prefix+letter for that digit keypad letters. Same output, no recursion stack.',
    },
    alternate: 'Iterative BFS queue: start with [""], and for each digit replace every prefix with prefix+letter for that digit keypad letters. Same output, no recursion stack.',
    code: { java: letterJava, cpp: letterCpp, pseudo: letterPseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
}
