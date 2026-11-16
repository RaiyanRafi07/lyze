/**
 * palindrome-partitioning — portable per-slug staged adapter (Backtracking).
 *
 * Walkthrough scene for slug `palindrome-partitioning` (Palindrome
 * Partitioning, Medium, LeetCode 131). Live record: plugin/data/shard-5.json
 * carries judge tests with signature
 *   partition(s: string) -> string[][], mode exact.
 * The adapter `signature` below equals that live judge signature exactly
 * (name/return/param types), so the walkthrough never throws.
 *
 * Real operation (mirrors the executed JS reference line for line): DFS over
 * cut positions with on-the-fly two-pointer palindrome checks; copy-at-record,
 * pop-after-recurse. Every frame is emitted from genuine execution state
 * (live start/end, live path, running recorded-answer count). The full answer
 * list is kept OUT of frames — frames carry only the count — so no future
 * answer leaks into early frames.
 *
 * Pure ES module: no DOM, no network, no dependencies besides semantic-core.js.
 * Visual bound s.length 1..6 (partitions double with length); violations throw
 * instead of truncating.
 */

import { code, frame, boundedFrames } from './semantic-core.js'

export const SLUG = 'palindrome-partitioning'

// Live judge signature, exactly (judgeable slug): name/return/param types match
// plugin/data/shard-5.json :: palindrome-partitioning judge.signature.
export const SIGNATURE = {
  name: 'partition',
  params: ['string'],
  return: 'string[][]',
}

export const MODE = 'exact'

const MAX_LEN = 6

function decodeString(value) {
  if (typeof value !== 'string') throw new Error('Provide a string s for this walkthrough')
  if (value.length < 1) throw new Error('Visual walkthrough needs a non-empty string (0 given)')
  if (value.length > MAX_LEN) {
    throw new Error('Visual walkthrough limited to s.length <= ' + MAX_LEN + ' (' + value.length + ' given); partitions double with length')
  }
  if (!/^[a-z]+$/.test(value)) throw new Error('Visual walkthrough limited to lowercase a-z (this input has other characters)')
  return value
}

function isPalindromeRange(s, left, right) {
  while (left < right) {
    if (s[left] !== s[right]) return false
    left += 1
    right -= 1
  }
  return true
}

const clip = (text) => {
  const s = String(text)
  return s.length <= 140 ? s : s.slice(0, 137) + '...'
}

const partJava = code(`
[init] import java.util.ArrayList;
[init] import java.util.List;
[init] class Solution {
[init]     public List<List<String>> partition(String s) {
[init]         List<List<String>> result = new ArrayList<>();
[init]         List<String> path = new ArrayList<>();
[explore]         backtrack(s, 0, path, result);
[return]         return result;
[init]     }
[explore]     private void backtrack(String s, int start, List<String> path, List<List<String>> result) {
[explore]         if (start == s.length()) {
[record]             result.add(new ArrayList<>(path));
[record]             return;
[explore]         }
[explore]         for (int end = start; end < s.length(); end++) {
[prune]             if (!isPalindrome(s, start, end)) {
[prune]                 continue;
[prune]             }
[choose]             path.add(s.substring(start, end + 1));
[choose]             backtrack(s, end + 1, path, result);
[unchoose]             path.remove(path.size() - 1);
[explore]         }
[explore]     }
[prune]     private boolean isPalindrome(String s, int left, int right) {
[prune]         while (left < right) {
[prune]             if (s.charAt(left) != s.charAt(right)) {
[prune]                 return false;
[prune]             }
[prune]             left++;
[prune]             right--;
[prune]         }
[prune]         return true;
[init]     }
[init] }
`)

const partCpp = code(`
[init] #include <string>
[init] #include <vector>
[init] using namespace std;
[init] class Solution {
[init] public:
[init]     vector<vector<string>> partition(string s) {
[init]         vector<vector<string>> result;
[init]         vector<string> path;
[explore]         backtrack(s, 0, path, result);
[return]         return result;
[init]     }
[explore] private:
[explore]     void backtrack(const string& s, int start, vector<string>& path, vector<vector<string>>& result) {
[explore]         if (start == (int)s.size()) {
[record]             result.push_back(path);
[record]             return;
[explore]         }
[explore]         for (int end = start; end < (int)s.size(); end++) {
[prune]             if (!isPalindrome(s, start, end)) {
[prune]                 continue;
[prune]             }
[choose]             path.push_back(s.substr(start, end - start + 1));
[choose]             backtrack(s, end + 1, path, result);
[unchoose]             path.pop_back();
[explore]         }
[explore]     }
[prune]     bool isPalindrome(const string& s, int left, int right) {
[prune]         while (left < right) {
[prune]             if (s[left] != s[right]) {
[prune]                 return false;
[prune]             }
[prune]             left++;
[prune]             right--;
[prune]         }
[prune]         return true;
[init]     }
[init] };
`)

const partPseudo = code(`
[init] partition(s):
[init]   result = [] ; path = []
[explore]   backtrack(s, 0, path, result)
[return]   return result
[explore] backtrack(s, start, path, result):
[explore]   if start == length(s):
[record]     result.add(copy(path)); return
[explore]   for end = start to length(s) - 1:
[prune]     if not isPalindrome(s, start, end): continue
[choose]     path.add(s[start..end])
[choose]     backtrack(s, end + 1, path, result)
[unchoose]     path.removeLast()
[prune] isPalindrome(s, left, right):
[prune]   while left < right and s[left] == s[right]: left++; right--
[prune]   return left >= right
`)

const EXPLAIN = {
  init: 'Set up the empty answer list and the empty working path; nothing is decided yet.',
  explore: 'Consider this uncovered suffix: every cut end from start is a candidate next piece.',
  choose: 'Take a verified-palindrome piece onto the shared path and recurse on the rest.',
  prune: 'Skip a non-palindromic piece; no deeper call can repair an invalid prefix.',
  record: 'Save a COPY of the path at full cover; later pops must not mutate recorded answers.',
  unchoose: 'Pop the shared path after recursing so sibling branches start clean.',
  return: 'All branches finished; the running count becomes the final answer.',
}

export const EXPLAIN_LINES = {
  java: {
    11: 'Copy is load-bearing: without it every recorded answer would alias one mutating path.',
    15: 'Ascending end order is the canonical DFS order the exact judge compares.',
    22: 'Un-choose: undo the shared-path choice or pieces leak into sibling partitions.',
  },
  cpp: {
    15: 'push_back copies, so later pop_back cannot mutate a recorded answer.',
    19: 'Ascending end order is the canonical DFS order the exact judge compares.',
    26: 'Un-choose: undo the shared-path choice or pieces leak into sibling partitions.',
  },
  pseudo: {},
}

// Every frame below is a REAL DFS execution event: init, one explore per
// visited start, prune per rejected cut, choose/recurse/unchoose around each
// taken piece, record per complete cover (copy), plus return.
function build(args) {
  if (!Array.isArray(args) || args.length !== 1) {
    throw new Error('partition needs [s] as its single walkthrough input')
  }
  let raw = args[0]
  if (typeof raw === 'string' && raw.length >= 2 && raw[0] === '"' && raw[raw.length - 1] === '"') {
    try { raw = JSON.parse(raw) } catch { /* fall through to decodeString error */ }
  }
  const str = decodeString(raw)
  const chars = str.split('')
  const n = str.length
  const result = []
  const path = []
  const frames = []
  const anchors = []

  const hlRange = (from, to, color) => {
    const out = {}
    for (let k = from; k <= to && k < n; k += 1) out[String(k)] = color
    return out
  }
  const coveredHl = () => {
    const out = {}
    const covered = path.reduce((t, p) => t + p.length, 0)
    for (let k = 0; k < covered; k += 1) out[String(k)] = 'ok'
    return out
  }
  const push = (step, label, note, start, end, highlights) => {
    const st = {
      chars: chars.slice(),
      path: path.slice(),
      answer: result.length,
      start,
      end,
      depth: path.length,
      pointers: start === null ? {} : end === null ? { start } : { start, end },
      highlights: highlights || {},
      vars: { start, end, depth: path.length },
    }
    if (start !== null && end !== null) st.window = [start, end]
    frames.push(frame(step, clip(label).slice(0, 60), clip(note), st))
  }

  anchors.push(0)
  push('init', 'Initialize', 's="' + str + '", result=[], path=[]', 0, null, {})

  function dfs(start) {
    push(
      'explore',
      'Explore start=' + start,
      start === n
        ? 'start=' + start + ' reached the end; the whole string is covered'
        : 'Try each end from ' + start + ' as the next cut; path=[' + path.join(',') + ']',
      start,
      null,
      start === n ? coveredHl() : {}
    )
    if (start === n) {
      result.push(path.slice())
      push('record', 'Record partition', 'Save copy #' + (result.length - 1) + ' [' + path.join(',') + ']', start, null, coveredHl())
      return
    }
    for (let end = start; end < n; end += 1) {
      const piece = str.slice(start, end + 1)
      if (!isPalindromeRange(str, start, end)) {
        push('prune', 'Skip', 's[' + start + '..' + end + ']="' + piece + '" is not a palindrome; skip end=' + end, start, end, hlRange(start, end, 'bad'))
        continue
      }
      path.push(piece)
      push('choose', 'Choose', 'Take "' + piece + '" s[' + start + '..' + end + ']; path=[' + path.join(',') + ']', start, end, hlRange(start, end, 'accent'))
      push('explore', 'Recurse', 'Solve the rest from ' + (end + 1) + ' with path=[' + path.join(',') + ']', end + 1, null, coveredHl())
      dfs(end + 1)
      path.pop()
      push('unchoose', 'Un-choose', 'Remove "' + piece + '"; path=[' + path.join(',') + ']', start, end, hlRange(start, end, 'warn'))
    }
  }

  dfs(0)

  push('return', 'Return result', 'Done; ' + result.length + ' partition' + (result.length === 1 ? '' : 's') + ' returned', null, null, {})
  anchors.push(frames.length - 1)

  // Single compaction pass (mirrors semantic.js): no-op under the 40-frame budget.
  const { frames: compact } = boundedFrames(frames, 40, anchors)
  return {
    kind: 'string',
    layout: { chars: chars.slice() },
    frames: compact,
    result: result.map((row) => row.slice()),
    anchors: [...new Set(anchors.filter((i) => Number.isInteger(i) && i >= 0 && i < frames.length))].sort((a, b) => a - b),
  }
}

export const adapters = {
  'palindrome-partitioning': {
    // Live judge signature, exactly (judgeable slug).
    signature: SIGNATURE,
    lesson: {
      idea: 'At each start the suffix s[start..] is an independent subproblem: try every palindromic first piece in ascending end order, then recurse on the rest; the loop order is the canonical DFS order.',
      trap: 'Record a COPY of path (later pops must not mutate answers); always pop after recursing or pieces leak into siblings; the running count is a candidate until the return frame.',
      time: 'O(n * 2^n): up to 2^(n-1) partitions, each palindrome check and path copy O(n).',
      space: 'O(n * 2^n) output plus O(n) recursion depth and working path.',
      alternate: 'Precompute an isPal[l][r] table bottom-up or expand around each center, then run the same DFS with O(1) checks; equivalently memoize suffix partitions.',
    },
    alternate: 'Precompute an isPal[l][r] table bottom-up or expand around each center, then run the same DFS with O(1) checks; equivalently memoize suffix partitions.',
    code: { java: partJava, cpp: partCpp, pseudo: partPseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
}
