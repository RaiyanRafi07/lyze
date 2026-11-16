import { code, frame, arrayInput, stringInput, boundedFrames } from './semantic-core.js'

const ASCII_PRINTABLE = /^[\x20-\x7E]*$/
const OPENERS = new Set(['(', '[', '{'])
const PAIRS = { ')': '(', ']': '[', '}': '{' }
const isAlnum = ch => /^[A-Za-z0-9]$/.test(ch)

function assertSorted(nums, label) {
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] < nums[i - 1]) {
      throw new Error(label + ' requires nums in ascending order; the input is never sorted for you')
    }
  }
}

function assertTarget(target, label) {
  if (!Number.isSafeInteger(target)) {
    throw new Error(label + ' needs an integer target')
  }
}

// Longest-repeating-character-replacement visual bounds (walkthrough-only;
// the Solve/judge path accepts the full judge range). Names are prefixed so
// this per-slug adapter never collides with another family entry.
const MAX_REPEAT_FRAMES = 40
const MAX_REPEAT_WALK_CHARS = 40

function repeatFinish(chars, frames, result) {
  return {
    kind: 'string',
    layout: { chars: chars.slice() },
    frames: boundedFrames(frames, MAX_REPEAT_FRAMES).frames,
    result,
  }
}

function repeatNormalizeArgs(rawS, rawK) {
  let s = rawS
  // Tolerate a raw judge literal such as '"ABAB"' (semantic.js parses before
  // calling build, but direct callers may pass literals through).
  if (typeof s === 'string' && s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
    try { s = JSON.parse(s) } catch { /* fall through to stringInput error */ }
  }
  let k = rawK
  if (typeof k === 'string' && k.trim() !== '' && Number.isInteger(Number(k))) k = Number(k)
  return [s, k]
}

export const adapters = {
  'valid-parentheses': {
    signature: { name: 'isValid', params: ['string'], return: 'boolean' },
    lesson: {
      idea: 'A closing bracket must match the most recent unmatched opener, so a LIFO stack holds exactly the unresolved opening indices.',
      trap: 'Checking only that some opener exists, or skipping the empty-stack guard, accepts mismatches such as "(]" and "([)]".',
      time: 'O(n)',
      space: 'O(n)',
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      close: 'Scope for closing brackets that must match the most recent unresolved opener.',
      done: 'Accept only when no unmatched openers remain, confirming every bracket closed properly.',
      fail: 'Reject input when closer lacks opener or pairs incorrectly, since order or type is broken.',
      init: 'Establish empty stack for unmatched openers before scanning left to right in order.',
      open: 'Scope for opening brackets that create a new unmatched expectation on the stack.',
      peek: 'Inspect most recent unresolved opener without removing it to test pairing correctness.',
      pop: 'Resolve matched opener because corresponding closer arrived in correct nesting order.',
      push: 'Remember current opener as most recent unresolved expectation for future closers.',
      read: 'Observe current bracket and decide whether it opens new expectation or must close one.'
    },
    code: {
      java: code(`
[init] class Solution {
[init]     public boolean isValid(String s) {
[init]         Deque<Character> stack = new ArrayDeque<>();
[read]         for (int i = 0; i < s.length(); i++) {
[read]             char c = s.charAt(i);
[open]             if (c == '(' || c == '[' || c == '{') {
[push]                 stack.push(c);
[close]             } else {
[fail]                 if (stack.isEmpty()) return false;
[peek]                 char top = stack.peek();
[fail]                 if ((c == ')' && top != '(') || (c == ']' && top != '[') || (c == '}' && top != '{')) return false;
[pop]                 stack.pop();
[close]             }
[read]         }
[done]         return stack.isEmpty();
[init]     }
[init] }
`),
      cpp: code(`
[init] class Solution {
[init] public:
[init]     bool isValid(std::string s) {
[init]         std::vector<char> stack;
[read]         for (int i = 0; i < (int)s.size(); i++) {
[read]             char c = s[i];
[open]             if (c == '(' || c == '[' || c == '{') {
[push]                 stack.push_back(c);
[close]             } else {
[fail]                 if (stack.empty()) return false;
[peek]                 char top = stack.back();
[fail]                 if ((c == ')' && top != '(') || (c == ']' && top != '[') || (c == '}' && top != '{')) return false;
[pop]                 stack.pop_back();
[close]             }
[read]         }
[done]         return stack.empty();
[init]     }
[init] };
`),
      pseudo: code(`
[init] function isValid(s):
[init]   stack = empty list of indices
[read]   for i from 0 to length(s)-1:
[read]     c = s[i]
[open]     if c is one of "(", "[", "{":
[push]       push i onto stack
[close]    else:
[fail]       if stack is empty: return false
[peek]       top = last element of stack
[fail]       if s[top] does not pair with c: return false
[pop]        pop the last element of stack
[done]   return stack is empty
`),
    },
    build(args) {
      const [raw] = args
      const s = stringInput(raw)
      if (!/^[()[\]{}]*$/.test(s)) {
        throw new Error('Valid Parentheses input may only contain the characters ()[]{}')
      }
      const chars = Array.from(s)
      const stack = []
      const frames = []
      let vpCmp = 0
      let vpWrites = 0
      const stateOf = (i, extra = {}) => {
        const highlights = {}
        for (const index of stack) highlights[index] = 'ok'
        if (i !== null) highlights[i] = 'accent'
        Object.assign(highlights, extra.highlights || {})
        return {
          pointers: i === null ? {} : { i },
          highlights,
          stack: stack.slice(),
          items: stack.map(index => chars[index]),
          vars: { n: chars.length, depth: stack.length, ...(extra.vars || {}) },
        }
      }
      frames.push(frame('init', 'Start with an empty stack',
        'Scan left to right; every closing bracket must match the most recent unmatched opener.',
        { pointers: {}, highlights: {}, stack: [], items: [], vars: { n: chars.length, depth: 0 } }))
      for (let i = 0; i < chars.length; i++) {
        const c = chars[i]
        vpCmp += 1
        frames.push(frame('read', `Read '${c}' at index ${i}`,
          OPENERS.has(c) ? 'An opening bracket becomes the new stack top.' : 'A closing bracket must match the stack top.',
          { ...stateOf(i), ops: { cmp: vpCmp, writes: vpWrites } }))
        if (OPENERS.has(c)) {
          stack.push(i)
          vpWrites += 1
          frames.push(frame('push', `Push '${c}' at index ${i}`,
            `Post-update: index ${i} is now the most recent unmatched opener.`,
            { ...stateOf(i), ops: { cmp: vpCmp, writes: vpWrites } }))
        } else {
          if (stack.length === 0) {
            frames.push(frame('fail', `Fail: '${c}' at index ${i} has no opener`,
              'The stack is empty, so this closing bracket cannot be matched.',
              { ...stateOf(i, { highlights: { [i]: 'warn' }, vars: { reason: 'empty-stack' } }), ops: { cmp: vpCmp, writes: vpWrites } }))
            return { kind: 'string', layout: { chars }, frames, result: false }
          }
          const top = stack[stack.length - 1]
          if (chars[top] !== PAIRS[c]) {
            frames.push(frame('fail', `Fail: '${c}' at index ${i} does not match '${chars[top]}'`,
              `Expected '${PAIRS[c]}' but the stack top is '${chars[top]}' at index ${top}.`,
              { ...stateOf(i, { highlights: { [top]: 'warn', [i]: 'warn' }, vars: { reason: 'mismatch' } }), ops: { cmp: vpCmp, writes: vpWrites } }))
            return { kind: 'string', layout: { chars }, frames, result: false }
          }
          stack.pop()
          vpWrites += 1
          frames.push(frame('pop', `Pop opener '${chars[top]}' at index ${top}`,
            `Post-update: '${c}' at index ${i} matched, so the opener is resolved.`,
            { ...stateOf(i), ops: { cmp: vpCmp, writes: vpWrites } }))
        }
      }
      const valid = stack.length === 0
      frames.push(frame('done', valid ? 'Stack is empty, so the string is valid' : 'Fail: unmatched openers remain on the stack',
        valid
          ? (chars.length === 0 ? 'An empty string has no unmatched brackets.' : 'Every opening bracket was closed in the correct order.')
          : `${stack.length} unmatched opener(s) remain, so the string is invalid.`,
        { ...stateOf(null), ops: { cmp: vpCmp, writes: vpWrites } }))
      return { kind: 'string', layout: { chars }, frames, result: valid }
    },
  },

  'valid-palindrome': {
    signature: { name: 'isPalindrome', params: ['string'], return: 'boolean' },
    lesson: {
      idea: 'Two pointers walk the original string inward, skip non-alphanumeric characters, and compare letters case-insensitively.',
      trap: 'Building a filtered copy loses the original indices, and skipping without the left < right guard can cross the pointers.',
      time: 'O(n)',
      space: 'O(1)',
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      check: 'Guard ensuring pointers still define a pair before comparing, handling meeting or crossing.',
      compare: 'Test outer pair case-insensitively so letter casing never affects palindrome judgment.',
      done: 'Accept when all comparable pairs agreed, including inputs with no comparable characters.',
      init: 'Place pointers at opposite ends to compare inward while preserving original positions.',
      loop: 'Scope repeating inward comparison until pointers meet, covering all relevant pairs.',
      mismatch: 'Reject phrase on first disagreeing pair since one asymmetry disproves palindrome property.',
      move: 'Step both pointers inward after agreement because that outer pair is fully resolved.',
      skipL: 'Advance left past ignored characters while keeping pointers ordered to avoid crossing.',
      skipR: 'Retreat right past ignored characters while keeping pointers ordered to avoid crossing.'
    },
    code: {
      java: code(`
[init] class Solution {
[init]     public boolean isPalindrome(String s) {
[init]         int left = 0, right = s.length() - 1;
[loop]         while (left < right) {
[skipL]             while (left < right && !Character.isLetterOrDigit(s.charAt(left))) left++;
[skipR]             while (left < right && !Character.isLetterOrDigit(s.charAt(right))) right--;
[check]             if (left < right) {
[compare]                 char a = Character.toLowerCase(s.charAt(left));
[compare]                 char b = Character.toLowerCase(s.charAt(right));
[mismatch]                 if (a != b) return false;
[move]                     left++;
[move]                     right--;
[check]             }
[loop]         }
[done]         return true;
[init]     }
[init] }
`),
      cpp: code(`
[init] class Solution {
[init] public:
[init]     bool isPalindrome(std::string s) {
[init]         int left = 0, right = (int)s.size() - 1;
[loop]         while (left < right) {
[skipL]             while (left < right && !std::isalnum((unsigned char)s[left])) left++;
[skipR]             while (left < right && !std::isalnum((unsigned char)s[right])) right--;
[check]             if (left < right) {
[compare]                 char a = (char)std::tolower((unsigned char)s[left]);
[compare]                 char b = (char)std::tolower((unsigned char)s[right]);
[mismatch]                 if (a != b) return false;
[move]                     left++;
[move]                     right--;
[check]             }
[loop]         }
[done]         return true;
[init]     }
[init] };
`),
      pseudo: code(`
[init] function isPalindrome(s):
[init]   left = 0; right = length(s)-1
[loop]   while left < right:
[skipL]     while left < right and s[left] is not alphanumeric: left += 1
[skipR]     while left < right and s[right] is not alphanumeric: right -= 1
[check]     if left < right:
[compare]       a = lowercase(s[left]); b = lowercase(s[right])
[mismatch]      if a != b: return false
[move]          left += 1; right -= 1
[done]   return true
`),
    },
    build(args) {
      const [raw] = args
      const s = stringInput(raw)
      if (!ASCII_PRINTABLE.test(s)) {
        throw new Error('Valid Palindrome walkthrough supports printable ASCII only')
      }
      const chars = Array.from(s)
      const skipped = new Set()
      const frames = []
      let left = 0
      let right = chars.length - 1
      let vpalCmp = 0
      const vpalWrites = 0
      const stateOf = (extra = {}) => {
        const highlights = {}
        for (const index of skipped) highlights[index] = 'dim'
        Object.assign(highlights, extra.highlights || {})
        return {
          pointers: { left, right },
          highlights,
          vars: { n: chars.length, ...(extra.vars || {}) },
        }
      }
      frames.push(frame('init', 'Place pointers at both ends',
        'Compare characters inward, ignoring anything that is not a letter or digit.',
        stateOf()))
      while (left < right) {
        while (left < right && !isAlnum(chars[left])) {
          const skippedIndex = left
          left += 1
          skipped.add(skippedIndex)
          vpalCmp += 1
          frames.push(frame('skipL', `Skip non-alphanumeric '${chars[skippedIndex]}' at ${skippedIndex}`,
            `Post-update: left moves to ${left}; skipped characters keep their original indices.`,
            { ...stateOf({ highlights: { [right]: 'ok', [left]: 'accent' } }), ops: { cmp: vpalCmp, writes: vpalWrites } }))
        }
        while (left < right && !isAlnum(chars[right])) {
          const skippedIndex = right
          right -= 1
          skipped.add(skippedIndex)
          vpalCmp += 1
          frames.push(frame('skipR', `Skip non-alphanumeric '${chars[skippedIndex]}' at ${skippedIndex}`,
            `Post-update: right moves to ${right}; only alphanumeric characters are compared.`,
            { ...stateOf({ highlights: { [left]: 'ok', [right]: 'accent' } }), ops: { cmp: vpalCmp, writes: vpalWrites } }))
        }
        if (left < right) {
          const a = chars[left].toLowerCase()
          const b = chars[right].toLowerCase()
          vpalCmp += 1
          frames.push(frame('compare', `Compare '${chars[left]}' at ${left} with '${chars[right]}' at ${right}`,
            `Case-insensitive comparison: '${a}' versus '${b}'.`,
            { ...stateOf({
              highlights: { [left]: 'accent', [right]: 'ok' },
              vars: { leftChar: chars[left], rightChar: chars[right] },
            }), ops: { cmp: vpalCmp, writes: vpalWrites } }))
          if (a !== b) {
            frames.push(frame('mismatch', `Mismatch at ${left} and ${right}`,
              `'${a}' is not equal to '${b}', so the phrase is not a palindrome.`,
              { ...stateOf({
                highlights: { [left]: 'warn', [right]: 'warn' },
                vars: { leftChar: chars[left], rightChar: chars[right] },
              }), ops: { cmp: vpalCmp, writes: vpalWrites } }))
            return { kind: 'string', layout: { chars }, frames, result: false }
          }
          left += 1
          right -= 1
          frames.push(frame('move', 'Move both pointers inward',
            `Post-update: left=${left}, right=${right}; the matched pair is resolved.`,
            { ...stateOf({ highlights: left <= right ? { [left]: 'accent', [right]: 'ok' } : {} }), ops: { cmp: vpalCmp, writes: vpalWrites } }))
        }
      }
      frames.push(frame('done', 'All compared characters matched',
        'Every alphanumeric pair agreed case-insensitively, so the phrase is a palindrome.',
        { ...stateOf(), ops: { cmp: vpalCmp, writes: vpalWrites } }))
      return { kind: 'string', layout: { chars }, frames, result: true }
    },
  },

  'longest-substring-without-repeating-characters': {
    signature: { name: 'lengthOfLongestSubstring', params: ['string'], return: 'int' },
    lesson: {
      idea: 'The window [start, end] is always duplicate-free; when a repeat falls inside it, jump start past that previous occurrence.',
      trap: 'Jumping start to lastSeen+1 when lastSeen < start shrinks the window wrongly, and "pwke" is a subsequence rather than a substring.',
      time: 'O(n)',
      space: 'O(n)',
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      check: 'Test whether current character last appeared inside present window, filtering stale history.',
      done: 'Return longest duplicate-free length observed across the whole scan.',
      extend: 'Bring next character into view as right edge while prior window stays duplicate-free.',
      init: 'Start with empty history and collapsed window so first character begins clean tracking.',
      mark: 'Record current position as latest occurrence and describe present window as duplicate-free.',
      record: 'Adopt current window length as new optimum when it exceeds every length seen before.',
      repeat: 'Shift left edge just past prior occurrence to restore duplicate-free property minimally.'
    },
    code: {
      java: code(`
[init] class Solution {
[init]     public int lengthOfLongestSubstring(String s) {
[init]         Map<Character, Integer> last = new HashMap<>();
[init]         int start = 0, best = 0;
[extend]         for (int end = 0; end < s.length(); end++) {
[extend]             char c = s.charAt(end);
[check]             if (last.containsKey(c) && last.get(c) >= start) {
[repeat]                 start = last.get(c) + 1;
[check]             }
[mark]             last.put(c, end);
[mark]             int len = end - start + 1;
[record]             if (len > best) best = len;
[extend]         }
[done]         return best;
[init]     }
[init] }
`),
      cpp: code(`
[init] class Solution {
[init] public:
[init]     int lengthOfLongestSubstring(std::string s) {
[init]         std::unordered_map<char, int> last;
[init]         int start = 0, best = 0;
[extend]         for (int end = 0; end < (int)s.size(); end++) {
[extend]             char c = s[end];
[check]             if (last.count(c) && last[c] >= start) {
[repeat]                 start = last[c] + 1;
[check]             }
[mark]             last[c] = end;
[mark]             int len = end - start + 1;
[record]             if (len > best) best = len;
[extend]         }
[done]         return best;
[init]     }
[init] };
`),
      pseudo: code(`
[init] function lengthOfLongestSubstring(s):
[init]   last = empty map from character to last index
[init]   start = 0; best = 0
[extend]   for end from 0 to length(s)-1:
[extend]     c = s[end]
[check]     if c is in last and last[c] >= start:
[repeat]       start = last[c] + 1
[mark]     last[c] = end
[mark]     len = end - start + 1
[record]     if len > best: best = len
[done]   return best
`),
    },
    build(args) {
      const [raw] = args
      const s = stringInput(raw)
      if (!ASCII_PRINTABLE.test(s)) {
        throw new Error('Longest Substring walkthrough supports printable ASCII only')
      }
      const chars = Array.from(s)
      const last = new Map()
      const frames = []
      let start = 0
      let best = 0
      let bestStart = 0
      let lsCmp = 0
      let lsWrites = 0
      const seen = () => Object.fromEntries(last)
      const stateOf = (end, extra = {}) => {
        const highlights = {}
        if (end !== null) {
          for (let k = start; k <= end; k++) highlights[k] = 'ok'
          highlights[end] = 'accent'
          Object.assign(highlights, extra.highlights || {})
        }
        return {
          pointers: end === null ? {} : { start, end },
          window: end === null ? [0, -1] : [start, end],
          seen: seen(),
          highlights,
          vars: { best, start, ...(extra.vars || {}) },
        }
      }
      frames.push(frame('init', 'Start with an empty window',
        'Expand the right edge; if a character repeats inside the window, move the left edge past it.',
        { pointers: {}, window: [0, -1], seen: {}, highlights: {}, vars: { best: 0, start: 0 } }))
      for (let end = 0; end < chars.length; end++) {
        const c = chars[end]
        lsCmp += 1
        frames.push(frame('extend', `Extend window to index ${end} ('${c}')`,
          end === 0
            ? 'The window is empty before this character is added.'
            : `The window [${start}, ${end - 1}] is duplicate-free before adding '${c}'.`,
          { ...stateOf(end), ops: { cmp: lsCmp, writes: lsWrites } }))
        if (last.has(c) && last.get(c) >= start) {
          const previous = last.get(c)
          start = previous + 1
          frames.push(frame('repeat', `Repeat '${c}' at ${end}; jump start to ${start}`,
            `Post-update: previous '${c}' is at ${previous}, so start moves past it to ${start}.`,
            { ...stateOf(end, { highlights: { [previous]: 'warn' } }), ops: { cmp: lsCmp, writes: lsWrites } }))
        }
        last.set(c, end)
        lsWrites += 1
        const len = end - start + 1
        frames.push(frame('mark', `Window [${start}, ${end}] has length ${len}`,
          `Post-update: seen['${c}']=${end}; every character in the window is now distinct.`,
          { ...stateOf(end, { vars: { len } }), ops: { cmp: lsCmp, writes: lsWrites } }))
        if (len > best) {
          best = len
          bestStart = start
          frames.push(frame('record', `New best length ${best} at [${bestStart}, ${end}]`,
            `Post-update: best is now ${best}, the longest duplicate-free substring seen so far.`,
            { ...stateOf(end, { highlights: { [end]: 'ok' }, vars: { len } }), ops: { cmp: lsCmp, writes: lsWrites } }))
        }
      }
      frames.push(frame('done', `Longest duplicate-free substring has length ${best}`,
        best === 0 ? 'The input is empty, so the answer is 0.' : `The best window is [${bestStart}, ${bestStart + best - 1}].`,
        {
          pointers: best === 0 ? {} : { start: bestStart, end: bestStart + best - 1 },
          window: best === 0 ? [0, -1] : [bestStart, bestStart + best - 1],
          seen: seen(),
          highlights: {},
          vars: { best, start: bestStart },
          ops: { cmp: lsCmp, writes: lsWrites },
        }))
      return { kind: 'string', layout: { chars }, frames, result: best }
    },
  },

  'binary-search': {
    signature: { name: 'search', params: ['int[]', 'int'], return: 'int' },
    lesson: {
      idea: 'Maintain the inclusive candidate range [lo, hi] and discard the half that cannot contain target based on nums[mid].',
      trap: 'Sorting the input hides a broken precondition, while hi=mid or lo<hi bounds can skip the answer or loop forever.',
      time: 'O(log n)',
      space: 'O(1)',
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      compare: 'Inspect middle index value against desired value to decide which half can contain it.',
      found: 'Return middle index immediately because sorted order guarantees correct position.',
      init: 'Bound inclusive candidate index range over sorted collection before any comparison.',
      left: 'Discard middle and higher indices after middle value proves too large for desired value.',
      loop: 'Scope repeating midpoint test while candidate index range remains nonempty.',
      missing: 'Report absence when index range empties, proving desired value occurs nowhere inside.',
      right: 'Discard middle and lower indices after middle value proves too small for desired value.'
    },
    code: {
      java: code(`
[init] class Solution {
[init]     public int search(int[] nums, int target) {
[init]         int lo = 0, hi = nums.length - 1;
[loop]         while (lo <= hi) {
[compare]             int mid = lo + (hi - lo) / 2;
[compare]             if (nums[mid] == target) {
[found]                 return mid;
[left]              } else if (nums[mid] > target) {
[left]                  hi = mid - 1;
[right]             } else {
[right]                 lo = mid + 1;
[right]             }
[loop]         }
[missing]         return -1;
[init]     }
[init] }
`),
      cpp: code(`
[init] class Solution {
[init] public:
[init]     int search(std::vector<int>& nums, int target) {
[init]         int lo = 0, hi = (int)nums.size() - 1;
[loop]         while (lo <= hi) {
[compare]             int mid = lo + (hi - lo) / 2;
[compare]             if (nums[mid] == target) {
[found]                 return mid;
[left]              } else if (nums[mid] > target) {
[left]                  hi = mid - 1;
[right]             } else {
[right]                 lo = mid + 1;
[right]             }
[loop]         }
[missing]         return -1;
[init]     }
[init] };
`),
      pseudo: code(`
[init] function search(nums, target):
[init]   lo = 0; hi = length(nums)-1
[loop]   while lo <= hi:
[compare]     mid = lo + floor((hi-lo)/2)
[compare]     if nums[mid] == target:
[found]       return mid
[left]       else if nums[mid] > target:
[left]        hi = mid - 1
[right]      else:
[right]       lo = mid + 1
[missing]   return -1
`),
    },
    build(args) {
      const [rawNums, rawTarget] = args
      const nums = arrayInput(rawNums)
      assertTarget(rawTarget, 'Binary Search')
      assertSorted(nums, 'Binary Search')
      const target = rawTarget
      const frames = []
      let lo = 0
      let hi = nums.length - 1
      let cmp = 0
      const stateOf = (mid, extra = {}) => ({
        pointers: mid === null ? { lo, hi } : { lo, hi, mid },
        highlights: mid === null ? {} : { [mid]: 'accent', ...(extra.highlights || {}) },
        values: nums.slice(),
        vars: { target, ...(extra.vars || {}) },
      })
      frames.push(frame('init', 'Set the inclusive search range',
        nums.length === 0
          ? 'The array is empty, so hi starts at -1.'
          : `Start with lo=0 and hi=${hi}; target=${target}.`,
        stateOf(null)))
      while (lo <= hi) {
        const mid = lo + Math.floor((hi - lo) / 2)
        cmp += 1
        frames.push(frame('compare', `Check midpoint ${mid} (value ${nums[mid]})`,
          `Compare nums[${mid}]=${nums[mid]} with target ${target}.`,
          { ...stateOf(mid, { vars: { midValue: nums[mid] } }), ops: { cmp, writes: 0 } }))
        if (nums[mid] === target) {
          frames.push(frame('found', `Target found at index ${mid}`,
            'Return mid immediately; the remaining range cannot improve the answer.',
            { ...stateOf(mid, { highlights: { [mid]: 'ok' } }), ops: { cmp, writes: 0 } }))
          return { kind: 'array', layout: { values: nums }, frames, result: mid }
        }
        if (nums[mid] > target) {
          const oldHi = hi
          hi = mid - 1
          frames.push(frame('left', `Discard indices ${mid}..${oldHi}`,
            `Post-update: nums[${mid}] > target, so set hi=${hi}.`,
            { ...stateOf(mid, { highlights: { [mid]: 'dim' }, vars: { midValue: nums[mid] } }), ops: { cmp, writes: 0 } }))
        } else {
          const oldLo = lo
          lo = mid + 1
          frames.push(frame('right', `Discard indices ${oldLo}..${mid}`,
            `Post-update: nums[${mid}] < target, so set lo=${lo}.`,
            { ...stateOf(mid, { highlights: { [mid]: 'dim' }, vars: { midValue: nums[mid] } }), ops: { cmp, writes: 0 } }))
        }
      }
      frames.push(frame('missing', `Target ${target} is not in the array`,
        `The range is empty (lo=${lo}, hi=${hi}), so return -1.`,
        { ...stateOf(null), ops: { cmp, writes: 0 } }))
      return { kind: 'array', layout: { values: nums }, frames, result: -1 }
    },
  },

  'search-insert-position': {
    signature: { name: 'searchInsert', params: ['int[]', 'int'], return: 'int' },
    lesson: {
      idea: 'Maintain [lo, hi]; after the loop ends, lo is the first index whose value is at least target, which is the insertion point.',
      trap: 'Returning mid after the loop, or shrinking with hi=mid instead of mid-1, can produce a wrong bound or an infinite loop.',
      time: 'O(log n)',
      space: 'O(1)',
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      compare: 'Inspect middle index value against desired value to locate exact match or insertion zone.',
      found: 'Return middle index immediately because desired value already exists at that position.',
      init: 'Bound inclusive candidate index range over sorted distinct collection before any comparison.',
      insert: 'Return lower bound as insertion index, the first position whose value reaches desired ordering.',
      left: 'Discard middle and higher indices after middle value proves too large, moving insertion leftward.',
      loop: 'Scope repeating midpoint test while candidate index range remains nonempty.',
      right: 'Discard middle and lower indices after middle value proves too small, moving insertion rightward.'
    },
    code: {
      java: code(`
[init] class Solution {
[init]     public int searchInsert(int[] nums, int target) {
[init]         int lo = 0, hi = nums.length - 1;
[loop]         while (lo <= hi) {
[compare]             int mid = lo + (hi - lo) / 2;
[compare]             if (nums[mid] == target) {
[found]                 return mid;
[right]             } else if (nums[mid] < target) {
[right]                 lo = mid + 1;
[left]              } else {
[left]                  hi = mid - 1;
[left]              }
[loop]         }
[insert]         return lo;
[init]     }
[init] }
`),
      cpp: code(`
[init] class Solution {
[init] public:
[init]     int searchInsert(std::vector<int>& nums, int target) {
[init]         int lo = 0, hi = (int)nums.size() - 1;
[loop]         while (lo <= hi) {
[compare]             int mid = lo + (hi - lo) / 2;
[compare]             if (nums[mid] == target) {
[found]                 return mid;
[right]             } else if (nums[mid] < target) {
[right]                 lo = mid + 1;
[left]              } else {
[left]                  hi = mid - 1;
[left]              }
[loop]         }
[insert]         return lo;
[init]     }
[init] };
`),
      pseudo: code(`
[init] function searchInsert(nums, target):
[init]   lo = 0; hi = length(nums)-1
[loop]   while lo <= hi:
[compare]     mid = lo + floor((hi-lo)/2)
[compare]     if nums[mid] == target:
[found]       return mid
[right]       else if nums[mid] < target:
[right]        lo = mid + 1
[left]       else:
[left]        hi = mid - 1
[insert]   return lo
`),
    },
    build(args) {
      const [rawNums, rawTarget] = args
      const nums = arrayInput(rawNums)
      assertTarget(rawTarget, 'Search Insert Position')
      assertSorted(nums, 'Search Insert Position')
      const target = rawTarget
      const frames = []
      let lo = 0
      let hi = nums.length - 1
      let cmp = 0
      const stateOf = (mid, extra = {}) => ({
        pointers: mid === null ? { lo, hi } : { lo, hi, mid },
        highlights: mid === null ? {} : { [mid]: 'accent', ...(extra.highlights || {}) },
        values: nums.slice(),
        vars: { target, ...(extra.vars || {}) },
      })
      frames.push(frame('init', 'Set the inclusive search range',
        nums.length === 0
          ? 'The array is empty, so hi starts at -1 and lo is the answer.'
          : `Start with lo=0 and hi=${hi}; target=${target}.`,
        stateOf(null)))
      while (lo <= hi) {
        const mid = lo + Math.floor((hi - lo) / 2)
        cmp += 1
        frames.push(frame('compare', `Check midpoint ${mid} (value ${nums[mid]})`,
          `Compare nums[${mid}]=${nums[mid]} with target ${target}.`,
          { ...stateOf(mid, { vars: { midValue: nums[mid] } }), ops: { cmp, writes: 0 } }))
        if (nums[mid] === target) {
          frames.push(frame('found', `Target found at index ${mid}`,
            'Return mid immediately because the target already exists.',
            { ...stateOf(mid, { highlights: { [mid]: 'ok' } }), ops: { cmp, writes: 0 } }))
          return { kind: 'array', layout: { values: nums }, frames, result: mid }
        }
        if (nums[mid] < target) {
          const oldLo = lo
          lo = mid + 1
          frames.push(frame('right', `Discard indices ${oldLo}..${mid}`,
            `Post-update: nums[${mid}] < target, so set lo=${lo}.`,
            { ...stateOf(mid, { highlights: { [mid]: 'dim' }, vars: { midValue: nums[mid] } }), ops: { cmp, writes: 0 } }))
        } else {
          const oldHi = hi
          hi = mid - 1
          frames.push(frame('left', `Discard indices ${mid}..${oldHi}`,
            `Post-update: nums[${mid}] > target, so set hi=${hi}.`,
            { ...stateOf(mid, { highlights: { [mid]: 'dim' }, vars: { midValue: nums[mid] } }), ops: { cmp, writes: 0 } }))
        }
      }
      frames.push(frame('insert', `Insert target ${target} at index ${lo}`,
        `The range is empty (lo=${lo}, hi=${hi}); lo is the first position whose value is at least ${target}.`,
        { pointers: { lo, hi }, highlights: {}, values: nums.slice(), vars: { target, insertAt: lo }, ops: { cmp, writes: 0 } }))
      return { kind: 'array', layout: { values: nums }, frames, result: lo }
    },
  },
  'group-anagrams': {
    signature: { name: 'groupAnagrams', params: ['string[]'], return: 'string[][]' },
    lesson: {
      idea: 'Sort each word letters to form a canonical key; words sharing a key are anagrams, so one ordered-map pass groups them.',
      trap: 'Comparing only neighbours misses split pairs like eat/bat/tea; the empty string is a valid word whose key is empty.',
      time: 'O(n·k log k)',
      space: 'O(n·k)',
    },
    explain: {
      signature: 'Entry point: take the word array and return grouped lists in first-seen-key order.',
      init: 'Open the ordered map from canonical key to member list; nothing is grouped yet.',
      key: 'Sort a copy of the word letters into the canonical key; the input word itself is never reordered.',
      new: 'Open a fresh member list for a never-seen key and record the key order.',
      append: 'File the word into its existing key row, preserving input order within the group.',
      done: 'Return the grouped rows in first-seen-key order; any order judges equal.',
    },
    code: {
      java: code(`
[init] import java.util.*;
[init] class Solution {
[init]     public List<List<String>> groupAnagrams(String[] strs) {
[init]         Map<String, List<String>> groups = new LinkedHashMap<>();
[key]         for (int i = 0; i < strs.length; i++) {
[key]             String word = strs[i];
[key]             char[] chars = word.toCharArray();
[key]             Arrays.sort(chars);
[key]             String key = new String(chars);
[new]             if (!groups.containsKey(key)) groups.put(key, new ArrayList<>());
[append]             groups.get(key).add(word);
[key]         }
[done]         return new ArrayList<>(groups.values());
[init]     }
[init] }
`),
      cpp: code(`
[init] #include <algorithm>
[init] #include <string>
[init] #include <unordered_map>
[init] #include <vector>
[init] using namespace std;
[init] class Solution {
[init] public:
[init]     vector<vector<string>> groupAnagrams(vector<string>& strs) {
[init]         unordered_map<string, vector<string>> groups;
[init]         vector<string> order;
[key]         for (int i = 0; i < (int)strs.size(); i++) {
[key]             string word = strs[i];
[key]             string key = word;
[key]             sort(key.begin(), key.end());
[new]             if (!groups.count(key)) { groups[key] = vector<string>(); order.push_back(key); }
[append]             groups[key].push_back(word);
[key]         }
[done]         vector<vector<string>> result;
[done]         for (int i = 0; i < (int)order.size(); i++) result.push_back(groups[order[i]]);
[done]         return result;
[init]     }
[init] };
`),
      pseudo: code(`
[init] function groupAnagrams(strs):
[init]   groups = empty ordered map from key to list of words
[key]   for i from 0 to length(strs) - 1:
[key]     word = strs[i]
[key]     key = sort-characters(word)
[new]     if key not in groups: groups[key] = empty list
[append]     append word to groups[key]
[key]   end for
[done]   return group lists in first-seen-key order
`),
    },
    build(args) {
      const [raw] = args
      if (!Array.isArray(raw) || raw.length < 1 || raw.length > 7) {
        throw new Error('group-anagrams needs an array of 1..7 words with no truncation')
      }
      for (let i = 0; i < raw.length; i++) {
        const w = raw[i]
        if (typeof w !== 'string' || w.length > 8 || !/^[a-z]*$/.test(w)) {
          throw new Error('word ' + i + ' must be 0..8 lowercase a-z letters (no truncation)')
        }
      }
      const words = raw.slice()
      const sortedKey = (word) => word.split('').sort().join('')
      const keys = new Array(words.length).fill(null)
      const groups = new Map()
      const frames = []
      let gaCmp = 0
      let gaWrites = 0
      // The array renderer falls back to layout.values / state.values, so the
      // word list rides along as values while keys/groups stay inspectable.
      const stateOf = (i, extra = {}) => ({
        pointers: i === null ? {} : { i },
        highlights: i === null ? {} : { [i]: 'accent' },
        values: words.slice(),
        words: words.slice(),
        keys: keys.slice(),
        groups: Array.from(groups.entries()).map(([key, members]) => ({ key, members: members.slice() })),
        vars: { n: words.length, groupCount: groups.size, ...(extra.vars || {}) },
        ...(extra.ops ? { ops: extra.ops } : {}),
      })
      frames.push(frame('init', 'Start with an empty ordered map',
        'One pass: sort each word into a key, then file it into its key group.',
        stateOf(null)))
      for (let i = 0; i < words.length; i++) {
        const word = words[i]
        const key = sortedKey(word)
        keys[i] = key
        gaCmp += 1
        const gaOps = { cmp: gaCmp, writes: gaWrites }
        frames.push(frame('key', `Key of "${word}" is "${key}"`,
          `Sorted letters of word ${i} form group key "${key}".`,
          stateOf(i, { vars: { n: words.length, groupCount: groups.size, word, key }, ops: gaOps })))
        if (!groups.has(key)) {
          groups.set(key, [word])
          gaWrites += 1
          frames.push(frame('new', `New group for key "${key}"`,
            `No group has this key yet, so open one for "${word}".`,
            stateOf(i, { vars: { n: words.length, groupCount: groups.size, word, key }, ops: { cmp: gaCmp, writes: gaWrites } })))
        } else {
          groups.get(key).push(word)
          gaWrites += 1
          frames.push(frame('append', `Append "${word}" to key "${key}"`,
            `Key "${key}" already has a group, so add "${word}" to it.`,
            stateOf(i, { vars: { n: words.length, groupCount: groups.size, word, key }, ops: { cmp: gaCmp, writes: gaWrites } })))
        }
      }
      const result = Array.from(groups.values()).map(members => members.slice())
      frames.push(frame('done', `Done: ${result.length} group(s) from ${words.length} word(s)`,
        'Return groups in first-seen-key order, members in input order.',
        { ...stateOf(null), ops: { cmp: gaCmp, writes: gaWrites } }))
      return { kind: 'array', layout: { values: words.slice(), words: words.slice(), keys: keys.slice() }, frames, result }
    },
  },
  'palindromic-substrings': {
    signature: { name: 'countSubstrings', params: ['string'], return: 'int' },
    lesson: {
      idea: 'Expand around each of the 2n-1 centers (n odd middles plus n-1 even gaps); every matching window s[l..r] is one more palindrome.',
      trap: 'Counting only odd centers drops even palindromes such as "aa", and comparing with <= instead of == can double-count.',
      time: 'O(n^2)',
      space: 'O(1)',
    },
    // Per-line explanations (presentation metadata, never compiled).
    // Coordinator-authored from the live walkthrough (no staged notes exist
    // for this slug); each note verified against the displayed code below.
    explain: {
      init: 'Seed count at 0 with n fixed; no center has been expanded yet, so nothing is counted.',
      center: 'Pick the next middle: odd (left == right == center), then the even gap (left == center, right == center + 1).',
      mismatch: 'Outer pair differs or an edge is out of bounds: stop this ray, since no wider window from this middle can match.',
      match: 'Outer pair mirrors, so the window is one confirmed palindrome; count it before moving outward.',
      count: 'Step both pointers outward to test the next wider window around the same middle.',
      done: 'Return the total: every center contributed exactly its matching windows, odd and even.'
    },
    code: {
      java: code(`
[init] class Solution {
[init]     public int countSubstrings(String s) {
[init]         int n = s.length();
[init]         int count = 0;
[center]         for (int center = 0; center < n; center++) {
[center]             int left = center;
[center]             int right = center;
[center]             while (left >= 0 && right < n) {
[mismatch]                 if (s.charAt(left) != s.charAt(right)) break;
[match]                 count++;
[count]                 left--;
[count]                 right++;
[init]             }
[center]             left = center;
[center]             right = center + 1;
[center]             while (left >= 0 && right < n) {
[mismatch]                 if (s.charAt(left) != s.charAt(right)) break;
[match]                 count++;
[count]                 left--;
[count]                 right++;
[init]             }
[init]         }
[done]         return count;
[init]     }
[init] }
`),
      cpp: code(`
[init] #include <string>
[init] class Solution {
[init] public:
[init]     int countSubstrings(std::string s) {
[init]         int n = (int)s.size();
[init]         int count = 0;
[center]         for (int center = 0; center < n; center++) {
[center]             int left = center;
[center]             int right = center;
[center]             while (left >= 0 && right < n) {
[mismatch]                 if (s[left] != s[right]) break;
[match]                 count++;
[count]                 left--;
[count]                 right++;
[init]             }
[center]             left = center;
[center]             right = center + 1;
[center]             while (left >= 0 && right < n) {
[mismatch]                 if (s[left] != s[right]) break;
[match]                 count++;
[count]                 left--;
[count]                 right++;
[init]             }
[init]         }
[done]         return count;
[init]     }
[init] };
`),
      pseudo: code(`
[init] function countSubstrings(s):
[init]   n = length(s); count = 0
[center]   for center from 0 to n-1:
[center]     left = center; right = center
[center]     while left >= 0 and right < n:
[mismatch]       if s[left] != s[right]: break
[match]       count += 1
[count]       left -= 1; right += 1
[center]     left = center; right = center + 1
[center]     while left >= 0 and right < n:
[mismatch]       if s[left] != s[right]: break
[match]       count += 1
[count]       left -= 1; right += 1
[done]   return count
`),
    },
    build(args) {
      const [raw] = args
      if (typeof raw !== 'string') {
        throw new Error('Palindromic Substrings walkthrough needs a string input like "aaa"')
      }
      if (raw.length > 10) {
        throw new Error('Palindromic Substrings walkthrough supports strings of length 0..10 (judge allows up to 1000); got length ' + raw.length)
      }
      const chars = Array.from(raw)
      const n = chars.length
      const frames = []
      let count = 0
      let psCmp = 0
      let psWrites = 0
      const stateOf = (pointers, highlights, vars) => ({
        chars: chars.slice(),
        pointers,
        highlights,
        vars: { n, count, ...vars },
      })
      frames.push(frame('init', 'Start with count 0',
        'Expand around all 2n-1 centers; each matching window s[l..r] adds one palindrome.',
        stateOf({}, {}, {})))
      for (let center = 0; center < n; center++) {
        for (const parity of ['odd', 'even']) {
          const startLeft = center
          const startRight = parity === 'odd' ? center : center + 1
          frames.push(frame('center',
            parity === 'odd' ? `Odd center ${center}: expand from [${center}, ${center}]` : `Even center ${center}: expand from [${center}, ${startRight}]`,
            parity === 'odd' ? 'Single-character middle; odd-length palindromes start here.' : 'Between-character middle; even-length palindromes start here.',
            { ...stateOf({ center, left: startLeft, right: startRight },
              { [center]: 'accent' },
              { center, left: startLeft, right: startRight, parity }), ops: { cmp: psCmp, writes: psWrites } }))
          let left = startLeft
          let right = startRight
          while (left >= 0 && right < n) {
            psCmp += 1
            if (chars[left] !== chars[right]) {
              frames.push(frame('mismatch', `Stop: s[${left}]='${chars[left]}' vs s[${right}]='${chars[right]}'`,
                `Outer pair differs, so no wider palindrome exists from this ${parity} middle.`,
                { ...stateOf({ center, left, right },
                  { [left]: 'warn', [right]: 'warn' },
                  { center, left, right, parity }), ops: { cmp: psCmp, writes: psWrites } }))
              break
            }
            const found = chars.slice(left, right + 1).join('')
            const highlights = {}
            for (let k = left; k <= right; k++) highlights[k] = 'ok'
            highlights[left] = 'accent'
            highlights[right] = 'accent'
            frames.push(frame('match', `Match: s[${left}..${right}] "${found}"`,
              `Reads the same both ways, so substring ${left}..${right} is a palindrome.`,
              { ...stateOf({ center, left, right }, highlights,
                { center, left, right, parity }), ops: { cmp: psCmp, writes: psWrites } }))
            count += 1
            psWrites += 1
            left -= 1
            right += 1
            const counted = {}
            for (let k = left + 1; k <= right - 1; k++) counted[k] = 'ok'
            frames.push(frame('count', `Count is now ${count}`,
              `Post-update: counted s[${left + 1}..${right - 1}]; move outward to l=${left}, r=${right}.`,
              { ...stateOf({ center, left, right }, counted,
                { center, left, right, parity }), ops: { cmp: psCmp, writes: psWrites } }))
          }
        }
      }
      frames.push(frame('done', `Done: ${count} palindromic substring${count === 1 ? '' : 's'}`,
        n === 0 ? 'The input is empty, so there are no substrings and the answer is 0.' : `Every center is exhausted; ${count} palindromic substrings were counted.`,
        { ...stateOf({}, {}, {}), ops: { cmp: psCmp, writes: psWrites } }))
      return { kind: 'string', layout: { chars: chars.slice() }, frames, result: count }
    },
  },
  'longest-palindromic-substring': {
    signature: { name: 'longestPalindrome', params: ['string'], return: 'string' },
    lesson: {
      idea: 'A palindrome mirrors around its middle, so expand outward from each of the 2n-1 centers (n single-character middles plus n-1 between-character gaps) and keep the widest matching window s[start..start+maxLen).',
      trap: 'Testing only odd centers misses even palindromes such as "bb" in "cbbd"; also, returning the first longest window found is fine, but claiming "bab" is the ONLY answer for "babad" is wrong ("aba" is equally valid).',
      time: 'O(n^2)',
      space: 'O(1)',
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      init: 'Read n and seed the best window to the first character before any expansion runs.',
      center: 'Pick the next middle to expand from: odd (left == right == center) then even (left == center, right == center + 1).',
      compare: 'Probe the outer pair s[left] vs s[right]; a mismatch or an out-of-bounds edge stops this center, since no wider window from it can mirror.',
      match: 'Outer pair is equal, so the window s[left..right] mirrors; record it as a confirmed palindrome before moving outward.',
      best: 'Write a new best window only when this palindrome is strictly longer; equal-length ties keep the earlier window.',
      done: 'Return s.substring(start, start + maxLen): the widest mirrored window seen from any center.',
    },
    explainLines: {
      java: {
        14: 'End of the best-write branch: maxLen and start now describe the widest window so far.',
        17: 'End of the odd-center expansion: control falls through to the even gap at the same center.',
        29: 'End of one center iteration: the best window so far survives to the next middle.',
      },
      cpp: {
        17: 'End of the best-write branch: maxLen and start now describe the widest window so far.',
        20: 'End of the odd-center expansion: control falls through to the even gap at the same center.',
        32: 'End of one center iteration: the best window so far survives to the next middle.',
      },
      pseudo: {
        9: 'Joint write: both halves of the best window update together, never one without the other.',
      },
    },
    code: {
      java: code(`
[init] class Solution {
[init]     public String longestPalindrome(String s) {
[init]         int n = s.length();
[init]         if (n == 0) return "";
[init]         int start = 0;
[init]         int maxLen = 1;
[center]         for (int center = 0; center < n; center++) {
[center]             int left = center;
[center]             int right = center;
[compare]             while (left >= 0 && right < n && s.charAt(left) == s.charAt(right)) {
[match]                 int len = right - left + 1;
[best]                 if (len > maxLen) {
[best]                     maxLen = len;
[best]                     start = left;
[best]                 }
[match]                 left--;
[match]                 right++;
[center]             }
[center]             left = center;
[center]             right = center + 1;
[compare]             while (left >= 0 && right < n && s.charAt(left) == s.charAt(right)) {
[match]                 int len = right - left + 1;
[best]                 if (len > maxLen) {
[best]                     maxLen = len;
[best]                     start = left;
[best]                 }
[match]                 left--;
[match]                 right++;
[center]             }
[center]         }
[done]         return s.substring(start, start + maxLen);
[init]     }
[init] }
`),
      cpp: code(`
[init] #include <string>
[init] using namespace std;
[init] class Solution {
[init] public:
[init]     string longestPalindrome(string s) {
[init]         int n = (int)s.size();
[init]         if (n == 0) return "";
[init]         int start = 0;
[init]         int maxLen = 1;
[center]         for (int center = 0; center < n; center++) {
[center]             int left = center;
[center]             int right = center;
[compare]             while (left >= 0 && right < n && s[left] == s[right]) {
[match]                 int len = right - left + 1;
[best]                 if (len > maxLen) {
[best]                     maxLen = len;
[best]                     start = left;
[best]                 }
[match]                 left--;
[match]                 right++;
[center]             }
[center]             left = center;
[center]             right = center + 1;
[compare]             while (left >= 0 && right < n && s[left] == s[right]) {
[match]                 int len = right - left + 1;
[best]                 if (len > maxLen) {
[best]                     maxLen = len;
[best]                     start = left;
[best]                 }
[match]                 left--;
[match]                 right++;
[center]             }
[center]         }
[done]         return s.substr(start, maxLen);
[init]     }
[init] };
`),
      pseudo: code(`
[init] function longestPalindrome(s):
[init]   n = length(s)
[init]   if n == 0: return ""
[init]   start = 0; maxLen = 1
[center]   for center from 0 to n-1:
[center]     left = center; right = center
[compare]     while left >= 0 and right < n and s[left] == s[right]:
[match]       len = right - left + 1
[best]       if len > maxLen:
[best]         maxLen = len; start = left
[match]       left -= 1; right += 1
[center]     left = center; right = center + 1
[compare]     while left >= 0 and right < n and s[left] == s[right]:
[match]       len = right - left + 1
[best]       if len > maxLen:
[best]         maxLen = len; start = left
[match]       left -= 1; right += 1
[done]   return s.substring(start, start + maxLen)
`),
    },
    build(args) {
      if (!Array.isArray(args) || args.length !== 1 || typeof args[0] !== 'string') {
        throw new Error('longest-palindromic-substring walkthrough needs args [s] with s a string')
      }
      const raw = args[0]
      if (raw.length < 1) {
        throw new Error('longest-palindromic-substring needs s.length >= 1 (judge constraint)')
      }
      if (raw.length > 10) {
        throw new Error(
          'longest-palindromic-substring walkthrough supports length 1..10 (judge allows up to 1000); got length ' + raw.length,
        )
      }
      const chars = Array.from(raw)
      const n = chars.length
      const frames = []
      const anchors = []
      let start = 0
      let maxLen = 1
      let lpCmp = 0
      let lpWrites = 0

      const bestWindow = () => [start, start + maxLen - 1]

      const stateOf = (pointers, highlights, extraVars) => ({
        chars: chars.slice(),
        pointers,
        highlights,
        window: bestWindow(),
        vars: { n, start, maxLen, ...extraVars },
      })

      const paintBest = (highlights, l, r) => {
        for (let k = start; k < start + maxLen; k++) {
          if (k < l || k > r) highlights[k] = 'ok'
        }
        return highlights
      }

      frames.push(
        frame(
          'init',
          `Start: s = "${raw}" (n = ${n})`,
          `Seed best to s[0..0] "${chars[0]}"; every single character is a length-1 palindrome.`,
          stateOf({}, { 0: 'ok' }, {}),
        ),
      )

      for (let center = 0; center < n; center++) {
        for (const parity of ['odd', 'even']) {
          const initLeft = center
          const initRight = parity === 'odd' ? center : center + 1
          frames.push(
            frame(
              'center',
              parity === 'odd'
                ? `Odd center ${center}: expand from [${center}, ${center}]`
                : `Even center ${center}: expand from [${center}, ${initRight}]`,
              parity === 'odd'
                ? `Single-character middle "${chars[center]}"; odd-length palindromes start here.`
                : initRight < n
                  ? `Gap between "${chars[center]}" and "${chars[initRight]}"; even palindromes start here.`
                  : `Gap at the end of s has no right partner, so no even palindrome starts here.`,
              { ...stateOf(
                { center, left: initLeft, right: initRight },
                { [center]: 'accent' },
                { center, parity, left: initLeft, right: initRight },
              ), ops: { cmp: lpCmp, writes: lpWrites } },
            ),
          )
          let left = initLeft
          let right = initRight
          while (true) {
            if (left < 0 || right >= n) {
              frames.push(
                frame(
                  'compare',
                  `Stop: [${left}, ${right}] out of bounds`,
                  `Edge of s reached, so no wider palindrome exists from this ${parity} middle.`,
                  { ...stateOf(
                    { center, left, right },
                    paintBest({ [Math.max(0, left)]: 'warn' }, left, right),
                    { center, parity, left, right },
                  ), ops: { cmp: lpCmp, writes: lpWrites } },
                ),
              )
              break
            }
            lpCmp += 1
            if (chars[left] !== chars[right]) {
              frames.push(
                frame(
                  'compare',
                  `Stop: s[${left}]='${chars[left]}' vs s[${right}]='${chars[right]}'`,
                  `Outer pair differs, so no wider palindrome exists from this ${parity} middle.`,
                  { ...stateOf(
                    { center, left, right },
                    paintBest({ [left]: 'warn', [right]: 'warn' }, left, right),
                    { center, parity, left, right },
                  ), ops: { cmp: lpCmp, writes: lpWrites } },
                ),
              )
              break
            }
            const len = right - left + 1
            const found = chars.slice(left, right + 1).join('')
            const highlights = {}
            for (let k = left; k <= right; k++) highlights[k] = 'accent'
            frames.push(
              frame(
                'match',
                `Mirror: s[${left}..${right}] "${found}"`,
                `Reads the same both ways, so substring ${left}..${right} is a palindrome.`,
                { ...stateOf({ center, left, right }, paintBest(highlights, left, right), {
                  center,
                  parity,
                  left,
                  right,
                  len,
                }), ops: { cmp: lpCmp, writes: lpWrites } },
              ),
            )
            if (len > maxLen) {
              const before = `[${start}..${start + maxLen - 1}]`
              start = left
              maxLen = len
              lpWrites += 1
              const edge = {}
              for (let k = left; k <= right; k++) edge[k] = 'ok'
              edge[left] = 'accent'
              edge[right] = 'accent'
              const f = frame(
                'best',
                `New best: s[${left}..${right}] "${found}" (len ${len})`,
                `Post-write: best moved ${before} to [${left}..${right}]; ties keep the earlier window.`,
                { ...stateOf({ center, left, right }, edge, { center, parity, left, right, len }), ops: { cmp: lpCmp, writes: lpWrites } },
              )
              anchors.push(frames.length)
              frames.push(f)
            }
            left -= 1
            right += 1
          }
        }
      }

      const answer = chars.slice(start, start + maxLen).join('')
      const tail = {}
      for (let k = start; k < start + maxLen; k++) tail[k] = 'ok'
      frames.push(
        frame(
          'done',
          `Done: "${answer}" (s[${start}..${start + maxLen - 1}])`,
          `Every center is exhausted; "${answer}" of length ${maxLen} is the longest palindrome.`,
          { ...stateOf({}, tail, { answer }), ops: { cmp: lpCmp, writes: lpWrites } },
        ),
      )
      anchors.push(frames.length - 1)

      return {
        kind: 'string',
        layout: { chars: chars.slice() },
        frames,
        anchors: [...new Set(anchors.filter((i) => Number.isInteger(i) && i >= 0 && i < frames.length))].sort((a, b) => a - b),
        result: answer,
      }
    },
  },
  'word-break': {
    signature: { name: 'wordBreak', params: ['string', 'string[]'], return: 'boolean' },
    lesson: {
      idea: 'dp[i] means prefix s[0..i) splits into dict words; dp[0] is true and dp[i] is true when some j<i has dp[j] and s[j..i) in dict.',
      trap: 'Trying only the longest word or one split per i misses mixes like "apple pen apple"; every j<i must be tested with reuse allowed.',
      time: 'O(n^2)',
      space: 'O(n)',
    },
    // Per-line explanations (presentation metadata, never compiled). Ported from
    // the reviewed delivery-sprint packet; step notes trimmed to the 140-char
    // render contract, line notes verbatim (indices verified against live code).
    explain: {
      init: 'Build the dict set and allocate dp[0..n] with the empty-prefix baseline dp[0]=true.',
      try: 'Read dp[j] and test s[j..i) for dict membership; names the split before any write. Testing one j per i misses mixes like apple+pen+apple.',
      mark: 'Write dp[i]=true on the first hitting split, then break; dp[i] needs only one witness.',
      done: 'Return dp[n]: true means some dict chain covers the full string; false means no chain does.'
    },
    explainLines: {
      java: {
        0: 'Import scope: java.util.* for Set/HashSet/Arrays (scaffolding; no state).',
        1: 'Class scope: owns the Solution type; no state yet.',
        2: 'Method header binding s and wordDict (String[] per the live file); computation starts below.',
        3: 'Init: copy wordDict into a HashSet for O(1) membership tests; no dp effect.',
        4: 'Init: n = s.length() fixes the dp size; still no prefix decided.',
        5: 'Init: allocate dp[0..n] default false; every prefix starts unreachable except the baseline.',
        6: 'Init: dp[0]=true baseline (empty prefix needs no words); later splits build only on finished true entries.',
        7: 'Loop scope (outer): i is the 1-based prefix length under test; reads dp[0..i-1], may write only dp[i].',
        8: 'Loop scope (inner): j is the candidate split point, substring s[j..i); each j is one read-only try before any mark.',
        9: 'Try (branch): gate on dp[j] AND dict.contains(s.substring(j,i)); bounds j inclusive / i exclusive. Read-only.',
        10: 'Mark (write): set dp[i]=true; write-once per prefix, never true->false.',
        11: 'Mark (control): break keeps the first witness only; later j values cannot change dp[i] once true.',
        12: 'Branch close: a miss falls through to the next j; dp[i] stays false until a hit.',
        13: 'Loop close: inner split loop ends for this i.',
        14: 'Loop close: outer prefix i finished (true or still false); scope resets for i+1.',
        15: 'Done: return dp[n]; for n==0 this is the baseline true (visual only; judge n>=1).',
        16: 'Method scope close: no state effect.',
        17: 'Class scope close: no state effect.'
      },
      cpp: {
        0: 'Include scope: <string> for s/substr (scaffolding; no state).',
        1: 'Include scope: <unordered_set> for dict (scaffolding; no state).',
        2: 'Include scope: <vector> for dp storage (scaffolding; no state).',
        3: 'Using-directive scope: std namespace convenience; no state effect.',
        4: 'Class scope: owns the Solution type; no state yet.',
        5: 'Access scope (public:): visibility only, no state effect.',
        6: 'Signature: bool wordBreak(string s, vector<string>& wordDict) binds s plus the dict vector by reference.',
        7: 'Init: copy wordDict into unordered_set for O(1) membership; dp uses char 0/1 as booleans.',
        8: 'Init: n = (int)s.size() fixes the dp size; still no prefix decided.',
        9: 'Blank separator line inside the init block; no state effect.',
        10: 'Init: allocate dp[0..n] zeroed (false); every prefix starts unreachable except the baseline.',
        11: 'Init: dp[0]=1 baseline (empty prefix reachable).',
        12: 'Loop scope (outer): i is the 1-based prefix length; may write only dp[i].',
        13: 'Loop scope (inner): j is the candidate split; each j is one read-only try before any mark.',
        14: 'Try (branch): gate on dp[j] AND dict.count(s.substr(j, i-j)); length arg is i-j. Read-only.',
        15: 'Mark (write): set dp[i]=1; write-once per prefix, never 1->0.',
        16: 'Mark (control): break keeps the first witness only.',
        17: 'Branch close: a miss falls through to the next j; dp[i] stays 0 until a hit.',
        18: 'Loop close: inner split loop ends for this i.',
        19: 'Loop close: outer prefix i finished; scope resets for i+1.',
        20: 'Done: return dp[n] != 0; for n==0 this is the baseline true (visual only; judge n>=1).',
        21: 'Method scope close: no state effect.',
        22: 'Class scope close: no state effect.'
      },
      pseudo: {
        0: 'Signature: function wordBreak(s, wordDict) binds the string and dict; no computation.',
        1: 'Init: dict = set(wordDict) for membership tests.',
        2: 'Init: n + dp[0..n] all false, then dp[0]=true baseline.',
        3: 'Loop scope (outer): for i in 1..n, prefix i under test.',
        4: 'Loop scope (inner): for j in 0..i-1, candidate split.',
        5: 'Try (branch): if dp[j] and s[j..i) in dict; the left part must itself be segmentable.',
        6: 'Mark: dp[i]=true; break keeps the first witness.',
        7: 'Done: return dp[n].'
      }
    },
    code: {
      java: code(`
[init] import java.util.*;
[init] class Solution {
[init]     public boolean wordBreak(String s, String[] wordDict) {
[init]         Set<String> dict = new HashSet<>(Arrays.asList(wordDict));
[init]         int n = s.length();
[init]         boolean[] dp = new boolean[n + 1];
[init]         dp[0] = true;
[try]         for (int i = 1; i <= n; i++) {
[try]             for (int j = 0; j < i; j++) {
[try]                 if (dp[j] && dict.contains(s.substring(j, i))) {
[mark]                     dp[i] = true;
[mark]                     break;
[try]                 }
[try]             }
[try]         }
[done]         return dp[n];
[init]     }
[init] }
`),
      cpp: code(`
[init] #include <string>
[init] #include <unordered_set>
[init] #include <vector>
[init] using namespace std;
[init] class Solution {
[init] public:
[init]     bool wordBreak(string s, vector<string>& wordDict) {
[init]         unordered_set<string> dict(wordDict.begin(), wordDict.end());
[init]         int n = (int)s.size();
[init]         vector<char> dp(n + 1, 0);
[init]         dp[0] = 1;
[try]         for (int i = 1; i <= n; i++) {
[try]             for (int j = 0; j < i; j++) {
[try]                 if (dp[j] && dict.count(s.substr(j, i - j))) {
[mark]                     dp[i] = 1;
[mark]                     break;
[try]                 }
[try]             }
[try]         }
[done]         return dp[n] != 0;
[init]     }
[init] };
`),
      pseudo: code(`
[init] function wordBreak(s, wordDict):
[init]   dict = set(wordDict)
[init]   n = length(s); dp = array(n+1, false); dp[0] = true
[try]   for i from 1 to n:
[try]     for j from 0 to i-1:
[try]       if dp[j] and s[j..i) in dict:
[mark]         dp[i] = true; break
[done]   return dp[n]
`),
    },
    build(args) {
      if (!Array.isArray(args) || args.length !== 2) {
        throw new Error('word-break expects args [s, wordDict]')
      }
      const [rawS, rawDict] = args
      if (typeof rawS !== 'string') {
        throw new Error('word-break needs a string s of length 0..16')
      }
      // Bound covers the dataset (applepenapple is 13): 16x16/2 try-frames
      // still compact well under 40 via the single host pass.
      if (rawS.length > 16) {
        throw new Error('word-break walkthrough supports string length 0..16 (judge allows up to 300); got length ' + rawS.length)
      }
      if (!Array.isArray(rawDict) || rawDict.length < 1 || rawDict.length > 6) {
        throw new Error('word-break needs dict size 1..6 with words 1..8 lowercase a-z (no truncation)')
      }
      for (let k = 0; k < rawDict.length; k++) {
        const w = rawDict[k]
        if (typeof w !== 'string' || w.length < 1 || w.length > 8 || !/^[a-z]+$/.test(w)) {
          throw new Error('word-break dict word ' + k + ' must be 1..8 lowercase a-z letters (no truncation)')
        }
      }
      const chars = Array.from(rawS)
      const dictWords = rawDict.slice()
      const dictSet = new Set(dictWords)
      const n = chars.length
      const dp = new Array(n + 1).fill(false)
      dp[0] = true
      const frames = []
      const stateOf = (i, j, extra = {}) => {
        const highlights = {}
        if (Number.isInteger(i) && Number.isInteger(j) && j < i) {
          for (let k = j; k < i; k++) highlights[k] = 'accent'
          Object.assign(highlights, extra.highlights || {})
        } else {
          Object.assign(highlights, extra.highlights || {})
        }
        return {
          chars: chars.slice(),
          dict: dictWords.slice(),
          dp: dp.slice(),
          pointers: (Number.isInteger(i) && Number.isInteger(j)) ? { i, j } : (Number.isInteger(i) ? { i } : {}),
          highlights,
          vars: { n, dictSize: dictWords.length, ...(extra.vars || {}) },
        }
      }
      frames.push(frame('init', 'Start with dp[0]=true',
        'Empty prefix is reachable; test each prefix i by trying every split j<i.',
        stateOf(null, null, { vars: { n, dictSize: dictWords.length } })))
      for (let i = 1; i <= n; i++) {
        for (let j = 0; j < i; j++) {
          const sub = rawS.slice(j, i)
          const canReach = dp[j]
          const inDict = dictSet.has(sub)
          const hit = canReach && inDict
          frames.push(frame('try', hit ? `Try i=${i} j=${j} "${sub}" hits` : `Try i=${i} j=${j} "${sub}" misses`,
            hit
              ? `dp[${j}] is true and "${sub}" is in dict, so prefix ${i} is reachable.`
              : `Need dp[${j}] true plus "${sub}" in dict; got dp=${canReach}, inDict=${inDict}.`,
            stateOf(i, j, {
              highlights: hit ? Object.fromEntries(Array.from({ length: i - j }, (_, k) => [j + k, 'ok'])) : Object.fromEntries(Array.from({ length: i - j }, (_, k) => [j + k, 'warn'])),
              vars: { n, dictSize: dictWords.length, i, j, sub, canReach, inDict },
            })))
          if (hit) {
            dp[i] = true
            frames.push(frame('mark', `Mark dp[${i}]=true via j=${j}`,
              `Post-update: dp[${i}] is now true; later prefixes may split after ${i}.`,
              stateOf(i, j, {
                highlights: Object.fromEntries(Array.from({ length: i - j }, (_, k) => [j + k, 'ok'])),
                vars: { n, dictSize: dictWords.length, i, j, sub },
              })))
            break
          }
        }
      }
      const verdict = dp[n]
      frames.push(frame('done', verdict ? `Done: prefix ${n} is reachable` : `Done: prefix ${n} is unreachable`,
        verdict
          ? `dp[${n}] is true, so dict words cover the full string.`
          : (n === 0 ? 'Empty string needs no words, so dp[0]=true accepts.' : `dp[${n}] is false, so no dict chain covers the string.`),
        {
          chars: chars.slice(),
          dict: dictWords.slice(),
          dp: dp.slice(),
          pointers: { n },
          highlights: verdict && n > 0 ? Object.fromEntries(chars.map((_, k) => [k, 'ok'])) : {},
          vars: { n, dictSize: dictWords.length, answer: verdict },
        }))
      return { kind: 'string', layout: { chars: chars.slice(), dict: dictWords.slice() }, frames, result: verdict }
    },
  },
  'decode-ways': {
    signature: { name: 'numDecodings', params: ['string'], return: 'int' },
    lesson: {
      idea: 'dp[i] counts decodings of the first i chars: add dp[i-1] when s[i-1] is nonzero, and dp[i-2] when s[i-2..i-1] is 10..26.',
      trap: "'0' never stands alone, so '0', '06' and '30' strand prefixes at 0; seed dp[0] = 1 or pairs have nothing to extend.",
      time: 'O(n)',
      space: 'O(n)',
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      done: 'Read dp[n] as the answer once every prefix has counted its decodings.',
      init: 'Seed dp[0] = 1 so pairs ending at index 1 have a base count to extend.',
      loop: 'Advance the prefix length; dp[i] counts decodings of the first i chars.',
      pair: 'A pair in 10..26 forms one letter, extending every decoding counted by dp[i-2].',
      single: 'A nonzero digit stands alone, extending every decoding counted by dp[i-1].',
      zero: 'A lone 0 with no valid pair extends nothing, so dp[i] stays 0.'
    },
    code: {
      java: code(`
[init] class Solution {
[init]     public int numDecodings(String s) {
[init]         int n = s.length();
[init]         int[] dp = new int[n + 1];
[init]         dp[0] = 1;
[loop]         for (int i = 1; i <= n; i++) {
[zero]             dp[i] = 0;
[single]             if (s.charAt(i - 1) != '0') dp[i] += dp[i - 1];
[pair]             if (i >= 2 && s.charAt(i - 2) != '0' && Integer.parseInt(s.substring(i - 2, i)) <= 26) dp[i] += dp[i - 2];
[loop]         }
[done]         return dp[n];
[init]     }
[init] }
`),
      cpp: code(`
[init] class Solution {
[init] public:
[init]     int numDecodings(std::string s) {
[init]         int n = (int)s.size();
[init]         std::vector<int> dp(n + 1, 0);
[init]         dp[0] = 1;
[loop]         for (int i = 1; i <= n; i++) {
[zero]             dp[i] = 0;
[single]             if (s[i - 1] != '0') dp[i] += dp[i - 1];
[pair]             if (i >= 2 && s[i - 2] != '0' && ((s[i - 2] - '0') * 10 + (s[i - 1] - '0')) <= 26) dp[i] += dp[i - 2];
[loop]         }
[done]         return dp[n];
[init]     }
[init] };
`),
      pseudo: code(`
[init] function numDecodings(s):
[init]   n = length(s); dp = array(n + 1, 0); dp[0] = 1
[loop]   for i from 1 to n:
[zero]     dp[i] = 0
[single]     if s[i - 1] != '0': dp[i] += dp[i - 1]
[pair]     if i >= 2 and s[i - 2] != '0' and number(s[i - 2 .. i - 1]) <= 26: dp[i] += dp[i - 2]
[done]   return dp[n]
`),
    },
    build(args) {
      const [raw] = args
      if (typeof raw !== 'string') {
        throw new Error('decode-ways needs a digit string input like "226"')
      }
      if (raw.length > 10) {
        throw new Error('decode-ways walkthrough supports digit strings of length 0..10 only (got length ' + raw.length + ')')
      }
      if (!/^[0-9]*$/.test(raw)) {
        throw new Error('decode-ways input must be a digit string using characters 0-9 only')
      }
      const s = raw
      const n = s.length
      const dp = new Array(n + 1).fill(0)
      dp[0] = 1
      const frames = []
      const stateOf = (i, extra = {}) => ({
        pointers: i === null ? {} : { i },
        highlights: { ...(extra.highlights || {}) },
        dp: dp.slice(),
        vars: { n, ...(extra.vars || {}) },
      })
      frames.push(frame('init', 'Seed dp[0] = 1 for the empty prefix',
        'The empty prefix has exactly one decoding. dp[i] will count ways for the first i chars.',
        stateOf(null, { vars: { n, i: 0, ways: 1 } })))
      for (let i = 1; i <= n; i++) {
        const one = s[i - 1]
        const singleOk = one !== '0'
        const pair = i >= 2 ? s.slice(i - 2, i) : ''
        const pairOk = i >= 2 && s[i - 2] !== '0' && Number(pair) <= 26
        dp[i] = 0
        if (singleOk) {
          dp[i] += dp[i - 1]
          frames.push(frame('single', `Prefix ${i}: '${one}' stands alone, add dp[${i - 1}]`,
            `'${one}' is nonzero, so every decoding of the first ${i - 1} chars extends. dp[${i}] = ${dp[i]}.`,
            stateOf(i, { highlights: { [i - 1]: 'accent' }, vars: { n, i, ways: dp[i] } })))
        }
        if (pairOk) {
          dp[i] += dp[i - 2]
          frames.push(frame('pair', `Prefix ${i}: '${pair}' is 10..26, add dp[${i - 2}]`,
            `'${pair}' lies in 10..26, so every decoding of the first ${i - 2} chars extends. dp[${i}] = ${dp[i]}.`,
            stateOf(i, { highlights: { [i - 2]: 'accent', [i - 1]: 'accent' }, vars: { n, i, ways: dp[i] } })))
        }
        if (!singleOk && !pairOk) {
          frames.push(frame('zero', `Prefix ${i}: nothing extends, dp[${i}] stays 0`,
            i < 2
              ? `'0' decodes to nothing alone and no pair ends here. dp[${i}] = 0.`
              : `'0' decodes to nothing alone and '${pair}' is outside 10..26. dp[${i}] = 0.`,
            stateOf(i, { highlights: { [i - 1]: 'warn' }, vars: { n, i, ways: 0 } })))
        }
      }
      frames.push(frame('done', `Done: dp[${n}] = ${dp[n]}`,
        n === 0
          ? 'The empty string has one decoding: the empty prefix itself.'
          : `dp[${n}] = ${dp[n]} counts every decoding of '${s}'.`,
        stateOf(null, { vars: { n, i: n, ways: dp[n] } })))
      return { kind: 'string', layout: { chars: Array.from(s) }, frames, result: dp[n] }
    },
  },
  'valid-anagram': {
    signature: { name: 'isAnagram', params: ['string', 'string'], return: 'boolean' },
    lesson: {
      idea: 'Count letters once: +1 for s, -1 for t; all zero means anagram.',
      trap: 'Skipping the length check wastes scans; sorting works but adds a log factor.',
      time: 'O(n)',
      space: 'O(1)',
    },
    explain: {
      init: 'Scope of the anagram task plus a zeroed 26-slot table shared by both strings; one table keeps the add/cancel pairing visible.',
      length: 'Guard rejecting unequal lengths before any counting, since different lengths can never share a letter multiset.',
      count: 'Add one to the slot of each s letter, building the exact multiset of the first string.',
      sweep: 'Subtract one for each t letter, cancelling it against the matching s surplus; a negative slot already proves failure.',
      compare: 'Scan all 26 slots for a nonzero remainder; any survivor means the multisets differ.',
      done: 'Accept only when every slot cancelled to zero, which proves identical multisets for equal-length inputs.',
    },
    explainLines: {
      java: {
        0: 'Solution container required by the judge harness; the method inside is the graded unit.',
        8: 'End of the isAnagram method scope; both return paths exit above.',
        9: 'End of the Solution class scope.',
      },
      cpp: {
        0: 'Standard string header for the std::string parameters.',
        1: 'Vector header for the frequency table storage.',
        2: 'Solution container required by the judge harness; the method inside is the graded unit.',
        12: 'End of the Solution class scope.',
      },
      pseudo: {
        0: 'Entry point of the anagram task: two strings in, one boolean out.',
      },
    },
    code: {
      java: code(`
[init] class Solution {
[init]     public boolean isAnagram(String s, String t) {
[init]         int[] freq = new int[26];
[length]         if (s.length() != t.length()) return false;
[count]         for (int i = 0; i < s.length(); i++) freq[s.charAt(i) - 'a']++;
[sweep]         for (int i = 0; i < t.length(); i++) freq[t.charAt(i) - 'a']--;
[compare]         for (int i = 0; i < 26; i++) if (freq[i] != 0) return false;
[done]         return true;
[init]     }
[init] }
`),
      cpp: code(`
[init] #include <string>
[init] #include <vector>
[init] class Solution {
[init] public:
[init]     bool isAnagram(string s, string t) {
[init]         vector<int> freq(26, 0);
[length]         if (s.size() != t.size()) return false;
[count]         for (int i = 0; i < (int)s.size(); i++) freq[s[i] - 'a']++;
[sweep]         for (int i = 0; i < (int)t.size(); i++) freq[t[i] - 'a']--;
[compare]         for (int i = 0; i < 26; i++) if (freq[i] != 0) return false;
[done]         return true;
[init]     }
[init] };
`),
      pseudo: code(`
[init] function isAnagram(s, t):
[init]   freq = array(26, 0)
[length]   if length(s) != length(t): return false
[count]   for i from 0 to length(s)-1: freq[s[i] - 'a'] += 1
[sweep]   for i from 0 to length(t)-1: freq[t[i] - 'a'] -= 1
[compare]   for k from 0 to 25: if freq[k] != 0: return false
[done]   return true
`),
    },
    build(args) {
      if (!Array.isArray(args) || args.length !== 2) {
        throw new Error('valid-anagram expects args [s, t]')
      }
      const [rawS, rawT] = args
      if (typeof rawS !== 'string' || typeof rawT !== 'string') {
        throw new Error('valid-anagram needs two strings s and t')
      }
      if (rawS.length > 10 || rawT.length > 10) {
        throw new Error('valid-anagram walkthrough supports strings of length 0..10 (got s=' + rawS.length + ', t=' + rawT.length + '; no truncation)')
      }
      if (!/^[a-z]*$/.test(rawS) || !/^[a-z]*$/.test(rawT)) {
        throw new Error('valid-anagram walkthrough supports lowercase a-z only (judge constraint)')
      }
      const sChars = Array.from(rawS)
      const tChars = Array.from(rawT)
      const n = sChars.length
      const m = tChars.length
      const freq = new Array(26).fill(0)
      const frames = []
      let vaCmp = 0
      let vaWrites = 0
      const stateOf = (extra = {}) => ({
        s: sChars.slice(),
        t: tChars.slice(),
        chars: sChars.slice(),
        freq: freq.slice(),
        pointers: { ...(extra.pointers || {}) },
        highlights: { ...(extra.highlights || {}) },
        vars: { n, m, ...(extra.vars || {}) },
      })
      frames.push(frame('init', 'Start with zeroed counts',
        'Init 26 counts to zero; s and t share one table.',
        stateOf({ pointers: {}, vars: { n, m } })))
      if (n !== m) {
        frames.push(frame('length', 'Reject: lengths differ s=' + n + ' t=' + m,
          'Different lengths cannot be anagrams; return false early.',
          { ...stateOf({ pointers: { n, m }, vars: { n, m } }), ops: { cmp: vaCmp, writes: vaWrites } }))
        frames.push(frame('done', 'Done: not anagrams',
          'Lengths differ, so s and t cannot be anagrams.',
          { ...stateOf({ pointers: {}, vars: { n, m, answer: false } }), ops: { cmp: vaCmp, writes: vaWrites } }))
        return { kind: 'string', layout: { chars: sChars.slice(), s: sChars.slice(), t: tChars.slice() }, frames, result: false }
      }
      frames.push(frame('length', 'Lengths match: n=' + n,
        'Same length, so counting can decide; else reject early.',
        { ...stateOf({ pointers: { n }, vars: { n, m } }), ops: { cmp: vaCmp, writes: vaWrites } }))
      for (let i = 0; i < n; i++) {
        const ch = sChars[i]
        vaCmp += 1
        freq[ch.charCodeAt(0) - 97]++
        vaWrites += 1
        frames.push(frame('count', "Count s[" + i + "]='" + ch + "'",
          "Post-update: freq['" + ch + "'] is now " + freq[ch.charCodeAt(0) - 97] + '.',
          { ...stateOf({ pointers: { i }, highlights: { [i]: 'accent' }, vars: { n, m, i, ch } }), ops: { cmp: vaCmp, writes: vaWrites } }))
      }
      for (let i = 0; i < m; i++) {
        const ch = tChars[i]
        vaCmp += 1
        freq[ch.charCodeAt(0) - 97]--
        vaWrites += 1
        frames.push(frame('sweep', "Sweep t[" + i + "]='" + ch + "'",
          "Post-update: freq['" + ch + "'] is now " + freq[ch.charCodeAt(0) - 97] + '.',
          { ...stateOf({ pointers: { i }, highlights: { [i]: 'accent' }, vars: { n, m, i, ch } }), ops: { cmp: vaCmp, writes: vaWrites } }))
      }
      for (let k = 0; k < 26; k++) {
        const letter = String.fromCharCode(97 + k)
        vaCmp += 1
        if (freq[k] !== 0) {
          frames.push(frame('compare', "Mismatch: '" + letter + "' count " + freq[k],
            'Non-zero count proves different multisets; return false.',
            { ...stateOf({ pointers: { k }, vars: { n, m, k, letter, count: freq[k] } }), ops: { cmp: vaCmp, writes: vaWrites } }))
          frames.push(frame('done', 'Done: not anagrams',
            'A non-zero count remains, so s and t differ.',
            { ...stateOf({ pointers: {}, vars: { n, m, answer: false } }), ops: { cmp: vaCmp, writes: vaWrites } }))
          return { kind: 'string', layout: { chars: sChars.slice(), s: sChars.slice(), t: tChars.slice() }, frames, result: false }
        }
        frames.push(frame('compare', "Match: '" + letter + "' count 0",
          "Letter '" + letter + "' is balanced; continue checking.",
          { ...stateOf({ pointers: { k }, vars: { n, m, k, letter, count: 0 } }), ops: { cmp: vaCmp, writes: vaWrites } }))
      }
      frames.push(frame('done', 'Done: anagrams',
        'All 26 counts are zero, so s and t are anagrams.',
        { ...stateOf({ pointers: {}, vars: { n, m, answer: true } }), ops: { cmp: vaCmp, writes: vaWrites } }))
      return { kind: 'string', layout: { chars: sChars.slice(), s: sChars.slice(), t: tChars.slice() }, frames, result: true }
    },
  },
  'minimum-window-substring': {
    signature: { name: 'minWindow', params: ['string', 'string'], return: 'string' },
    lesson: {
      idea: 'The window [left, right] always starts at left and grows right; a satisfied counter tracks how many distinct needed characters are currently covered, and left shrinks only while the window stays valid, recording each new minimum.',
      trap: 'Shrinking left on every step (instead of only while valid) or counting total matched characters instead of satisfied distinct characters breaks duplicate handling such as t="AA".',
      time: 'O(m + n)',
      space: 'O(1)',
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      need: 'Count how many of each character t requires, so coverage can be tested per character with duplicates respected.',
      init: 'Start with an empty window, zero satisfied characters, and no best answer recorded yet.',
      extend: 'Bring s[right] into the window as the new right edge and update its window count.',
      satisfied: 'Test whether this character just reached exactly its required count, which earns one satisfied unit.',
      shrinkcheck: 'Scope that repeats only while every distinct needed character is covered; leaving it means the window is invalid.',
      shrink: 'Move left past s[left] to try a shorter valid window, dropping its count first.',
      unsatisfied: 'Test whether removing s[left] just broke coverage, which loses one satisfied unit.',
      record: 'Adopt the current valid window as the new best when it is shorter than every valid window seen before.',
      done: 'Return the shortest valid window seen, or empty string when no window ever satisfied t.',
    },
    code: {
      java: code(`
[need] class Solution {
[need]     public String minWindow(String s, String t) {
[need]         int[] need = new int[128];
[need]         for (int i = 0; i < t.length(); i++) need[t.charAt(i)]++;
[need]         int required = 0;
[need]         for (int c = 0; c < 128; c++) if (need[c] > 0) required++;
[init]         int[] window = new int[128];
[init]         int formed = 0, left = 0;
[init]         int bestLen = Integer.MAX_VALUE, bestStart = 0;
[extend]         for (int right = 0; right < s.length(); right++) {
[extend]             char c = s.charAt(right);
[extend]             window[c]++;
[satisfied]             if (need[c] > 0 && window[c] == need[c]) formed++;
[shrinkcheck]             while (formed == required) {
[record]                 if (right - left + 1 < bestLen) {
[record]                     bestLen = right - left + 1;
[record]                     bestStart = left;
[record]                 }
[shrink]                 char d = s.charAt(left);
[shrink]                 window[d]--;
[unsatisfied]                 if (need[d] > 0 && window[d] < need[d]) formed--;
[shrink]                 left++;
[shrinkcheck]             }
[extend]         }
[done]         return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestStart, bestStart + bestLen);
[need]     }
[need] }
`),
      cpp: code(`
[need] class Solution {
[need] public:
[need]     string minWindow(string s, string t) {
[need]         vector<int> need(128, 0);
[need]         for (char c : t) need[(unsigned char)c]++;
[need]         int required = 0;
[need]         for (int c = 0; c < 128; c++) if (need[c] > 0) required++;
[init]         vector<int> window(128, 0);
[init]         int formed = 0, left = 0;
[init]         int bestLen = INT_MAX, bestStart = 0;
[extend]         for (int right = 0; right < (int)s.size(); right++) {
[extend]             char c = s[right];
[extend]             window[(unsigned char)c]++;
[satisfied]             if (need[(unsigned char)c] > 0 && window[(unsigned char)c] == need[(unsigned char)c]) formed++;
[shrinkcheck]             while (formed == required) {
[record]                 if (right - left + 1 < bestLen) {
[record]                     bestLen = right - left + 1;
[record]                     bestStart = left;
[record]                 }
[shrink]                 char d = s[left];
[shrink]                 window[(unsigned char)d]--;
[unsatisfied]                 if (need[(unsigned char)d] > 0 && window[(unsigned char)d] < need[(unsigned char)d]) formed--;
[shrink]                 left++;
[shrinkcheck]             }
[extend]         }
[done]         return bestLen == INT_MAX ? "" : s.substr(bestStart, bestLen);
[need]     }
[need] };
`),
      pseudo: code(`
[need] function minWindow(s, t):
[need]   need = counts of each character in t
[need]   required = number of distinct characters with need > 0
[init]   window = zero counts; formed = 0; left = 0
[init]   bestLen = +infinity; bestStart = 0
[extend]   for right from 0 to length(s)-1:
[extend]     c = s[right]; window[c] = window[c] + 1
[satisfied]     if need[c] > 0 and window[c] == need[c]: formed = formed + 1
[shrinkcheck]     while formed == required:
[record]       if (right - left + 1) < bestLen:
[record]         bestLen = right - left + 1; bestStart = left
[shrink]       d = s[left]; window[d] = window[d] - 1
[unsatisfied]       if need[d] > 0 and window[d] < need[d]: formed = formed - 1
[shrink]       left = left + 1
[done]   if bestLen is +infinity: return ""
[done]   else: return s.substring(bestStart, bestStart + bestLen)
`),
    },
    build(args) {
      const MAX_WALK_CHARS = 40
      if (!Array.isArray(args) || args.length !== 2) {
        throw new Error('minimum-window-substring walkthrough needs args [s, t] with two strings')
      }
      const [rawS, rawT] = args
      const s = stringInput(rawS, MAX_WALK_CHARS)
      const t = stringInput(rawT, MAX_WALK_CHARS)
      if (t.length === 0) throw new Error('Minimum Window walkthrough needs t with at least 1 character')
      if (!/^[\x20-\x7E]*$/.test(s) || !/^[\x20-\x7E]*$/.test(t)) {
        throw new Error('Minimum Window walkthrough supports printable ASCII only')
      }
      const chars = Array.from(s)
      const need = new Array(128).fill(0)
      for (const ch of t) need[ch.charCodeAt(0)]++
      let required = 0
      for (let c = 0; c < 128; c++) if (need[c] > 0) required++
      const window = new Array(128).fill(0)
      const needOf = () => {
        const o = {}
        for (let c = 0; c < 128; c++) if (need[c] > 0) o[String.fromCharCode(c)] = need[c]
        return o
      }
      const seenOf = () => {
        const o = {}
        for (let c = 0; c < 128; c++) if (window[c] !== 0 || need[c] > 0) o[String.fromCharCode(c)] = window[c]
        return o
      }
      const frames = []
      let formed = 0
      let left = 0
      let bestLen = Infinity
      let bestStart = 0
      const stateOf = (right, extra = {}) => {
        const highlights = {}
        if (right !== null && right >= left) {
          for (let k = left; k <= right; k++) highlights[k] = 'ok'
          highlights[right] = 'accent'
        }
        Object.assign(highlights, extra.highlights || {})
        return {
          pointers: right === null ? { left } : { left, right },
          window: right === null ? [0, -1] : [left, right],
          seen: seenOf(),
          highlights,
          vars: { formed, required, bestLen: bestLen === Infinity ? -1 : bestLen, ...(extra.vars || {}) },
        }
      }
      frames.push(frame('need',
        `Need ${required} distinct character(s) from t="${t}"`,
        `Expand right; shrink left only while all ${required} distinct needs are covered.`,
        { pointers: {}, window: [0, -1], seen: needOf(), highlights: {}, vars: { formed: 0, required, bestLen: -1 } }))
      for (let right = 0; right < chars.length; right++) {
        const c = chars[right]
        window[c.charCodeAt(0)]++
        frames.push(frame('extend', `Extend to ${right} ('${c}')`,
          `Window [${left}, ${right}] now holds ${window[c.charCodeAt(0)]} '${c}' (needs ${need[c.charCodeAt(0)]}).`,
          stateOf(right)))
        if (need[c.charCodeAt(0)] > 0 && window[c.charCodeAt(0)] === need[c.charCodeAt(0)]) {
          formed++
          frames.push(frame('satisfied', `'${c}' satisfied (${formed}/${required})`,
            `Post-update: formed is now ${formed}; coverage gained for '${c}'.`,
            stateOf(right)))
        }
        while (formed === required) {
          const len = right - left + 1
          if (len < bestLen) {
            bestLen = len
            bestStart = left
            frames.push(frame('record', `New best [${left}, ${right}] length ${len}`,
              `Post-update: best is now "${chars.slice(bestStart, bestStart + bestLen).join('')}" (length ${bestLen}).`,
              stateOf(right, { highlights: { [left]: 'ok', [right]: 'ok' } })))
          }
          const d = chars[left]
          window[d.charCodeAt(0)]--
          const broke = need[d.charCodeAt(0)] > 0 && window[d.charCodeAt(0)] < need[d.charCodeAt(0)]
          if (broke) formed--
          frames.push(frame('shrink', `Shrink past ${left} ('${d}')`,
            broke
              ? `Post-update: '${d}' falls below need, formed is now ${formed}; window invalid.`
              : `Post-update: '${d}' still covered, formed stays ${formed}; window stays valid.`,
            (() => { const nl = left + 1; const h = {}; if (nl <= right) { for (let k = nl; k <= right; k++) h[k] = 'ok'; h[right] = 'accent'; } h[left] = 'dim'; return { pointers: { left: nl, right }, window: [nl, right], seen: seenOf(), highlights: h, vars: { formed, required, bestLen: bestLen === Infinity ? -1 : bestLen } } })()))
          left++
        }
      }
      const result = bestLen === Infinity ? '' : chars.slice(bestStart, bestStart + bestLen).join('')
      frames.push(frame('done',
        bestLen === Infinity ? 'No window covers t' : `Shortest window "${result}" length ${bestLen}`,
        bestLen === Infinity
          ? 'Right reached the end with coverage never completed, so return empty string.'
          : `The best valid window is [${bestStart}, ${bestStart + bestLen - 1}]; return it.`,
        bestLen === Infinity
          ? { pointers: {}, window: [0, -1], seen: seenOf(), highlights: {}, vars: { formed, required, bestLen: -1 } }
          : { pointers: { left: bestStart, right: bestStart + bestLen - 1 }, window: [bestStart, bestStart + bestLen - 1], seen: seenOf(), highlights: {}, vars: { formed, required, bestLen } }))
      return { kind: 'string', layout: { chars: chars.slice(), mapKind: 'counts' }, frames, result }
    },
  },
  'longest-repeating-character-replacement': {
    signature: { name: 'characterReplacement', params: ['string', 'int'], return: 'int' },
    lesson: {
      idea: 'The window [left, right] may keep at most k non-majority letters; replacements needed = window length minus the most frequent letter count, and left shrinks only while that need exceeds k, recording each new maximum.',
      trap: 'Recomputing or resetting the majority count downward on every shrink, or shrinking left on every step instead of only while (len - maxFreq > k), breaks the linear scan on inputs such as "AABABBA" with k=1.',
      invariant: 'After each right step and its shrink loop, (right - left + 1) - maxFreq <= k holds, and best is the longest window length seen so far.',
      time: 'O(n)',
      space: 'O(1)',
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      init: 'Start with zero letter counts, an empty window, and no best length recorded yet.',
      extend: 'Bring s[right] into the window as the new right edge and bump its letter count.',
      maxfreq: 'Refresh the majority count when the new letter beats it; it never decreases, which keeps the scan linear.',
      shrinkcheck: 'Scope that repeats only while replacements needed exceed k; leaving it means the window is feasible.',
      shrink: 'Move left past s[left] to try a shorter feasible window, dropping its count first.',
      record: 'Adopt the current window length as the new best when it exceeds every length seen before.',
      done: 'Return the longest feasible window length observed over the whole scan.',
    },
    code: {
      java: code(`
[init] class Solution {
[init]     public int characterReplacement(String s, int k) {
[init]         int[] count = new int[26];
[init]         int left = 0, maxFreq = 0, best = 0;
[extend]         for (int right = 0; right < s.length(); right++) {
[extend]             count[s.charAt(right) - 'A']++;
[maxfreq]             maxFreq = Math.max(maxFreq, count[s.charAt(right) - 'A']);
[shrinkcheck]             while (right - left + 1 - maxFreq > k) {
[shrink]                 count[s.charAt(left) - 'A']--;
[shrink]                 left++;
[shrinkcheck]             }
[record]             if (right - left + 1 > best) best = right - left + 1;
[extend]         }
[done]         return best;
[init]     }
[init] }
`),
      cpp: code(`
[init] class Solution {
[init] public:
[init]     int characterReplacement(string s, int k) {
[init]         vector<int> count(26, 0);
[init]         int left = 0, maxFreq = 0, best = 0;
[extend]         for (int right = 0; right < (int)s.size(); right++) {
[extend]             count[s[right] - 'A']++;
[maxfreq]             maxFreq = max(maxFreq, count[s[right] - 'A']);
[shrinkcheck]             while (right - left + 1 - maxFreq > k) {
[shrink]                 count[s[left] - 'A']--;
[shrink]                 left++;
[shrinkcheck]             }
[record]             if (right - left + 1 > best) best = right - left + 1;
[extend]         }
[done]         return best;
[init]     }
[init] };
`),
      pseudo: code(`
[init] function characterReplacement(s, k):
[init]   count = zero tallies for 'A'..'Z'; left = 0; maxFreq = 0; best = 0
[extend]   for right from 0 to length(s)-1:
[extend]     c = s[right]; count[c] = count[c] + 1
[maxfreq]     if count[c] > maxFreq: maxFreq = count[c]
[shrinkcheck]     while (right - left + 1) - maxFreq > k:
[shrink]       d = s[left]; count[d] = count[d] - 1; left = left + 1
[record]     if (right - left + 1) > best: best = right - left + 1
[done]   return best
`),
    },
    build(args) {
      const [parsedS, parsedK] = repeatNormalizeArgs(args[0], args[1]);
      const s = stringInput(parsedS, MAX_REPEAT_WALK_CHARS);
      if (!/^[A-Z]*$/.test(s)) {
        throw new Error('Character Replacement walkthrough needs uppercase A-Z only');
      }
      if (!Number.isInteger(parsedK) || parsedK < 0 || parsedK > s.length) {
        throw new Error('Character Replacement walkthrough needs integer k with 0 <= k <= s.length');
      }
      const k = parsedK;
      const chars = Array.from(s);
      const count = new Array(26).fill(0);
      const countsOf = () => {
        const o = {};
        for (let c = 0; c < 26; c++) {
          if (count[c] > 0) o[String.fromCharCode(65 + c)] = count[c];
        }
        return o;
      };
      const frames = [];
      let left = 0;
      let maxFreq = 0;
      let best = 0;
      let bestStart = 0;
      let bestEnd = -1;
      const repeatStateOf = (right, extra = {}) => {
        const highlights = {};
        if (right !== null && right >= left && chars.length > 0) {
          for (let q = left; q <= right; q++) highlights[q] = 'ok';
          highlights[right] = 'accent';
        }
        Object.assign(highlights, extra.highlights || {});
        const need = right === null ? 0 : right - left + 1 - maxFreq;
        return {
          pointers: right === null ? { left } : { left, right },
          window: right === null ? [0, -1] : [left, right],
          counts: countsOf(),
          highlights,
          vars: { k, maxFreq, need, best, ...(extra.vars || {}) },
        };
      };
      frames.push(frame('init', 'Start with an empty window',
        `Grow right over "${s}"; keep at most ${k} replacement(s) past the majority letter.`,
        { pointers: {}, window: [0, -1], counts: {}, highlights: {}, vars: { k, maxFreq: 0, need: 0, best: 0 } }));
      for (let right = 0; right < chars.length; right++) {
        const c = chars[right];
        count[c.charCodeAt(0) - 65]++;
        if (count[c.charCodeAt(0) - 65] > maxFreq) {
          maxFreq = count[c.charCodeAt(0) - 65];
        }
        frames.push(frame('extend', `Extend to ${right} ('${c}')`,
          `counts['${c}']=${count[c.charCodeAt(0) - 65]}; majority=${maxFreq}; need=${right - left + 1 - maxFreq}.`,
          repeatStateOf(right)));
        while (right - left + 1 - maxFreq > k) {
          const d = chars[left];
          count[d.charCodeAt(0) - 65]--;
          left++;
          frames.push(frame('shrink', `Shrink past ${left - 1} ('${d}')`,
            `Post-update: need=${right - left + 1 - maxFreq}; window [${left}, ${right}] feasible=${right - left + 1 - maxFreq <= k}.`,
            (() => {
              const h = {};
              if (left <= right) {
                for (let q = left; q <= right; q++) h[q] = 'ok';
                h[right] = 'accent';
              }
              h[left - 1] = 'dim';
              return { pointers: { left, right }, window: [left, right], counts: countsOf(), highlights: h, vars: { k, maxFreq, need: right - left + 1 - maxFreq, best } };
            })()));
        }
        const len = right - left + 1;
        if (len > best) {
          best = len;
          bestStart = left;
          bestEnd = right;
          frames.push(frame('record', `New best length ${len} at [${left}, ${right}]`,
            'Post-update: best is now ' + best + ', the longest feasible window seen so far.',
            repeatStateOf(right, { highlights: { [left]: 'ok', [right]: 'ok' } })));
        }
      }
      frames.push(frame('done', best === 0 ? 'Empty input, so the answer is 0' : `Longest feasible window has length ${best}`,
        best === 0
          ? 'The input is empty, so return 0.'
          : `The best window is [${bestStart}, ${bestEnd}]; return ${best}.`,
        best === 0
          ? { pointers: {}, window: [0, -1], counts: countsOf(), highlights: {}, vars: { k, maxFreq, need: 0, best } }
          : { pointers: { left: bestStart, right: bestEnd }, window: [bestStart, bestEnd], counts: countsOf(), highlights: {}, vars: { k, maxFreq, need: bestEnd - bestStart + 1 - maxFreq, best } }));
      return repeatFinish(chars, frames, best);
    },
  },
}
