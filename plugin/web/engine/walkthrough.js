/**
 * Walkthrough engine: canonical solutions whose lines are tagged with step ids, so the UI
 * can highlight the exact line that is "executing" while the 3D scene animates.
 *
 * Every builder returns the same shape:
 *   { kind, layout, code: { java, cpp, pseudo }, frames: [{ label, note, step, state }] }
 * `code.*` entries are `{ step, text }`; the UI resolves step -> line number per language,
 * which is why the three languages may have different line counts.
 */
import { parseArgs } from './parse.js'
import { arrayScene, stringScene, linkedListScene, treeScene, stackScene, gridScene, graphScene } from './scenes.js'

const line = (step, text) => ({ step, text })

function firstArgs(problem, options) {
  const judge = problem && problem.judge
  if (judge && Array.isArray(judge.tests) && judge.tests.length > 0) return judge.tests[0].args || []
  return []
}

function signatureOf(problem) {
  const judge = problem && problem.judge
  return judge && judge.signature ? judge.signature : null
}

function numbersInput(problem, options) {
  const args = options && Array.isArray(options.args) ? options.args : firstArgs(problem, options)
  const signature = signatureOf(problem)
  const params = signature ? signature.params || [] : []
  const result = {}
  args.forEach((raw, index) => {
    const param = params[index] || { name: 'arg' + index, type: 'int[]' }
    result[param.name] = raw
  })
  return result
}

function asIntArray(raw) {
  if (raw === null || raw === undefined) return []
  const text = String(raw).trim().replace(/^\[/, '').replace(/\]$/, '')
  if (text.trim() === '') return []
  return text
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value))
}

function asChars(raw) {
  const text = String(raw ?? '').trim()
  if (text.startsWith('"') && text.endsWith('"')) return text.slice(1, -1).split('')
  if (text.startsWith("'") && text.endsWith("'")) return text.slice(1, -1).split('')
  return text.split('')
}

/* --------------------------------------------------------------- two-sum family */

function buildArraysHashing(problem, options) {
  const input = numbersInput(problem, options)
  const nums = asIntArray(input.nums || input.numbers || input.arr || Object.values(input)[0])
  const target = Number(input.target ?? Object.values(input)[1] ?? 0)
  if (nums.length === 0) return null

  const frames = [
    { label: 'input', note: `Scan ${nums.length} values left to right; target = ${target}. The map starts empty — nothing stored yet.`, step: 'sig', state: { pointers: {}, highlights: {}, seen: {}, vars: { target } } },
  ]

  const seen = new Map()
  const storedMarks = () => Object.fromEntries([...seen.values()].map((index) => [index, 'mint']))
  let found = null
  for (let i = 0; i < nums.length; i += 1) {
    const need = target - nums[i]
    frames.push({
      label: `i = ${i}`,
      note: `nums[${i}] = ${nums[i]} → need ${target} − ${nums[i]} = ${need}.`,
      step: 'need',
      state: { pointers: { i }, highlights: { ...storedMarks(), [i]: 'accent' }, seen: Object.fromEntries(seen), vars: { target, need } },
    })
    if (seen.has(need)) {
      found = [seen.get(need), i]
      frames.push({
        label: 'match',
        note: `Look up ${need} in the map → found at index ${seen.get(need)} — return [${seen.get(need)}, ${i}].`,
        step: 'check',
        state: { pointers: { i }, highlights: { ...storedMarks(), [seen.get(need)]: 'ok', [i]: 'ok' }, seen: Object.fromEntries(seen), vars: { target, need }, lookup: { from: i, key: String(need), hit: seen.get(need) } },
      })
      break
    }
    frames.push({
      label: 'not found',
      note: `Look up ${need} → not in the map. No earlier value can pair with nums[${i}] yet.`,
      step: 'check',
      state: { pointers: { i }, highlights: { ...storedMarks(), [i]: 'accent' }, seen: Object.fromEntries(seen), vars: { target, need }, lookup: { from: i, key: String(need), hit: null } },
    })
    seen.set(nums[i], i)
    frames.push({
      label: 'store',
      note: `Store value ${nums[i]} at index ${i}. Later iterations can now find it in seen.`,
      step: 'store',
      state: { pointers: { i }, highlights: { ...storedMarks(), [i]: 'accent' }, seen: Object.fromEntries(seen), vars: { target, need } },
    })
  }
  frames.push({
    label: found ? 'answer' : 'done',
    note: found ? `Indices ${found[0]} and ${found[1]} add up to ${target}.` : 'No pair adds up to the target.',
    step: 'ret',
    state: { pointers: {}, highlights: found ? { [found[0]]: 'ok', [found[1]]: 'ok' } : {}, seen: Object.fromEntries(seen), vars: { target } },
  })

  const scene = arrayScene({ values: nums, frames, title: 'Hash map sweep', pattern: 'arrays-hashing' })
  if (!scene) return null
  return {
    kind: scene.kind,
    layout: scene.layout,
    code: {
      java: [
        line('sig', 'public int[] twoSum(int[] nums, int target) {'),
        line('init', '    Map<Integer,Integer> seen = new HashMap<>();'),
        line('loop', '    for (int i = 0; i < nums.length; i++) {'),
        line('need', '        int need = target - nums[i];'),
        line('check', '        if (seen.containsKey(need)) return new int[]{seen.get(need), i};'),
        line('store', '        seen.put(nums[i], i);'),
        line('close', '    }'),
        line('ret', '    return new int[]{};'),
      ],
      cpp: [
        line('sig', 'vector<int> twoSum(vector<int>& nums, int target) {'),
        line('init', '    unordered_map<int,int> seen;'),
        line('loop', '    for (int i = 0; i < (int)nums.size(); i++) {'),
        line('need', '        int need = target - nums[i];'),
        line('check', '        auto it = seen.find(need);'),
        line('store', '        seen[nums[i]] = i;'),
        line('close', '    }'),
        line('ret', '    return {};'),
      ],
      pseudo: [
        line('sig', 'twoSum(nums, target):'),
        line('init', '  seen = {}'),
        line('loop', '  for i, x in nums:'),
        line('need', '    need = target - x'),
        line('check', '    if need in seen: return [seen[need], i]'),
        line('store', '    seen[x] = i'),
        line('ret', '  return []'),
      ],
    },
    frames,
  }
}

/* ---------------------------------------------------------------- two pointers */

function buildTwoPointers(problem, options) {
  const input = numbersInput(problem, options)
  const signature = signatureOf(problem)
  const params = signature ? signature.params || [] : []
  const firstType = params[0] ? params[0].type : 'int[]'

  if (firstType === 'string') {
    const chars = asChars(input[params[0].name] ?? Object.values(input)[0])
    if (chars.length === 0) return null
    const frames = []
    let lo = 0
    let hi = chars.length - 1
    let ok = true
    frames.push({ label: 'input', note: `Compare characters from both ends (n = ${chars.length}).`, step: 'sig', state: { pointers: { lo, hi }, highlights: {}, window: [lo, hi] } })
    while (lo < hi) {
      const same = chars[lo] === chars[hi]
      frames.push({
        label: `left ${lo} · right ${hi}`,
        note: `'${chars[lo]}' vs '${chars[hi]}' → ${same ? 'match, move both inward' : 'mismatch, not a palindrome'}.`,
        step: same ? 'match' : 'miss',
        state: { pointers: { lo, hi }, highlights: same ? { [lo]: 'ok', [hi]: 'ok' } : { [lo]: 'bad', [hi]: 'bad' }, window: [lo, hi] },
      })
      if (!same) {
        ok = false
        break
      }
      lo += 1
      hi -= 1
    }
    frames.push({ label: ok ? 'palindrome' : 'not palindrome', note: ok ? 'Every mirrored pair matched.' : 'A mirrored pair differed.', step: 'ret', state: { pointers: { lo, hi }, highlights: {}, window: [lo, hi] } })
    const scene = stringScene({ chars, frames, title: 'Two pointers close in', pattern: 'two-pointers' })
    if (!scene) return null
    return {
      kind: scene.kind,
      layout: scene.layout,
      code: {
        java: [
          line('sig', 'public boolean isPalindrome(String s) {'),
          line('init', '    int lo = 0, hi = s.length() - 1;'),
          line('loop', '    while (lo < hi) {'),
          line('match', '        if (s.charAt(lo) != s.charAt(hi)) return false;'),
          line('miss', '        lo++; hi--;'),
          line('ret', '    }'),
          line('ret2', '    return true;'),
        ],
        cpp: [
          line('sig', 'bool isPalindrome(string s) {'),
          line('init', '    int lo = 0, hi = (int)s.size() - 1;'),
          line('loop', '    while (lo < hi) {'),
          line('match', '        if (s[lo] != s[hi]) return false;'),
          line('miss', '        lo++; hi--;'),
          line('ret', '    }'),
          line('ret2', '    return true;'),
        ],
        pseudo: [
          line('sig', 'isPalindrome(s):'),
          line('init', '  lo, hi = 0, n - 1'),
          line('loop', '  while lo < hi:'),
          line('match', '    if s[lo] != s[hi]: return false'),
          line('miss', '    lo++, hi--'),
          line('ret', '  return true'),
        ],
      },
      frames,
    }
  }

  const numbers = asIntArray(input[params[0] ? params[0].name : 'numbers'] ?? Object.values(input)[0])
  const target = Number(Object.values(input)[1] ?? 0)
  if (numbers.length < 2) return null
  const sorted = numbers.slice().sort((a, b) => a - b)
  const frames = [{ label: 'input', note: `Sorted values, target = ${target}. Start at both ends.`, step: 'sig', state: { pointers: { lo: 0, hi: sorted.length - 1 }, highlights: {}, window: [0, sorted.length - 1] } }]
  let lo = 0
  let hi = sorted.length - 1
  let answer = null
  while (lo < hi) {
    const sum = sorted[lo] + sorted[hi]
    frames.push({
      label: `sum ${sum}`,
      note: `${sorted[lo]} + ${sorted[hi]} = ${sum} ${sum === target ? '→ match' : sum < target ? '→ too small, move left pointer up' : '→ too big, move right pointer down'}.`,
      step: sum === target ? 'match' : 'step',
      state: { pointers: { lo, hi }, highlights: sum === target ? { [lo]: 'ok', [hi]: 'ok' } : { [lo]: 'accent', [hi]: 'warn' }, window: [lo + 1, hi - 1] },
    })
    if (sum === target) {
      answer = [lo, hi]
      break
    }
    if (sum < target) lo += 1
    else hi -= 1
  }
  frames.push({ label: answer ? 'found' : 'none', note: answer ? `Positions ${answer[0]} and ${answer[1]} sum to ${target}.` : 'Pointers met without a match.', step: 'ret', state: { pointers: { lo, hi }, highlights: answer ? { [answer[0]]: 'ok', [answer[1]]: 'ok' } : {}, window: [lo, hi] } })
  const scene = arrayScene({ values: sorted, frames, title: 'Two pointers close in', pattern: 'two-pointers' })
  if (!scene) return null
  return {
    kind: scene.kind,
    layout: scene.layout,
    code: {
      java: [
        line('sig', 'public int[] twoSum(int[] numbers, int target) {'),
        line('init', '    int lo = 0, hi = numbers.length - 1;'),
        line('loop', '    while (lo < hi) {'),
        line('step', '        int sum = numbers[lo] + numbers[hi];'),
        line('match', '        if (sum == target) return new int[]{lo + 1, hi + 1};'),
        line('step2', '        if (sum < target) lo++; else hi--;'),
        line('ret', '    }'),
        line('ret2', '    return new int[]{-1, -1};'),
      ],
      cpp: [
        line('sig', 'vector<int> twoSum(vector<int>& numbers, int target) {'),
        line('init', '    int lo = 0, hi = (int)numbers.size() - 1;'),
        line('loop', '    while (lo < hi) {'),
        line('step', '        int sum = numbers[lo] + numbers[hi];'),
        line('match', '        if (sum == target) return {lo + 1, hi + 1};'),
        line('step2', '        if (sum < target) lo++; else hi--;'),
        line('ret', '    }'),
        line('ret2', '    return {-1, -1};'),
      ],
      pseudo: [
        line('sig', 'twoSum(numbers, target):'),
        line('init', '  lo, hi = 0, n - 1'),
        line('loop', '  while lo < hi:'),
        line('step', '    sum = numbers[lo] + numbers[hi]'),
        line('match', '    if sum == target: return [lo+1, hi+1]'),
        line('step2', '    if sum < target: lo++ else: hi--'),
        line('ret', '  return [-1, -1]'),
      ],
    },
    frames,
  }
}

/* -------------------------------------------------------------- sliding window */

function buildSlidingWindow(problem, options) {
  const input = numbersInput(problem, options)
  const params = signatureOf(problem) ? signatureOf(problem).params || [] : []
  const raw = input[params[0] ? params[0].name : Object.keys(input)[0]]
  const chars = asChars(raw)
  if (chars.length === 0) return null

  const frames = [{ label: 'input', note: 'Grow a window to the right; shrink from the left on a repeat.', step: 'sig', state: { pointers: { right: 0 }, window: [0, 0], highlights: {} } }]
  const last = new Map()
  let left = 0
  let best = 0
  let bestRange = [0, 0]
  for (let right = 0; right < chars.length; right += 1) {
    const c = chars[right]
    const repeated = last.has(c) && last.get(c) >= left
    if (repeated) left = last.get(c) + 1
    last.set(c, right)
    const width = right - left + 1
    if (width > best) {
      best = width
      bestRange = [left, right]
    }
    frames.push({
      label: `[${left}..${right}]`,
      note: `${repeated ? `'${c}' repeated → left jumps to ${left}. ` : ''}Window "${chars.slice(left, right + 1).join('')}" is ${width} wide (best ${best}).`,
      step: repeated ? 'shrink' : 'grow',
      state: { pointers: { left, right }, window: [left, right], highlights: { [right]: repeated ? 'warn' : 'accent' } },
    })
  }
  frames.push({ label: 'best', note: `Longest window without repeats: "${chars.slice(bestRange[0], bestRange[1] + 1).join('')}" (${best}).`, step: 'ret', state: { pointers: { left: bestRange[0], right: bestRange[1] }, window: bestRange, highlights: Object.fromEntries(Array.from({ length: best }, (_, k) => [bestRange[0] + k, 'ok'])) } })
  const scene = stringScene({ chars, frames, title: 'Sliding window', pattern: 'sliding-window' })
  if (!scene) return null
  return {
    kind: scene.kind,
    layout: scene.layout,
    code: {
      java: [
        line('sig', 'public int lengthOfLongestSubstring(String s) {'),
        line('init', '    Map<Character,Integer> last = new HashMap<>();'),
        line('init2', '    int left = 0, best = 0;'),
        line('loop', '    for (int right = 0; right < s.length(); right++) {'),
        line('shrink', '        if (last.containsKey(c) && last.get(c) >= left) left = last.get(c) + 1;'),
        line('grow', '        best = Math.max(best, right - left + 1);'),
        line('close', '    }'),
        line('ret', '    return best;'),
      ],
      cpp: [
        line('sig', 'int lengthOfLongestSubstring(string s) {'),
        line('init', '    unordered_map<char,int> last;'),
        line('init2', '    int left = 0, best = 0;'),
        line('loop', '    for (int right = 0; right < (int)s.size(); right++) {'),
        line('shrink', '        if (last.count(s[right]) && last[s[right]] >= left) left = last[s[right]] + 1;'),
        line('grow', '        best = max(best, right - left + 1);'),
        line('close', '    }'),
        line('ret', '    return best;'),
      ],
      pseudo: [
        line('sig', 'lengthOfLongestSubstring(s):'),
        line('init', '  last = {}, left = 0, best = 0'),
        line('loop', '  for right, c in s:'),
        line('shrink', '    if c in last and last[c] >= left: left = last[c] + 1'),
        line('grow', '    last[c] = right; best = max(best, right - left + 1)'),
        line('ret', '  return best'),
      ],
    },
    frames,
  }
}

/* --------------------------------------------------------------- binary search */

function buildBinarySearch(problem, options) {
  const input = numbersInput(problem, options)
  const params = signatureOf(problem) ? signatureOf(problem).params || [] : []
  const nums = asIntArray(input[params[0] ? params[0].name : 'nums'] ?? Object.values(input)[0])
  const target = Number(Object.values(input)[1] ?? 0)
  if (nums.length === 0) return null
  const sorted = nums.slice().sort((a, b) => a - b)
  const frames = [{ label: 'input', note: `Sorted array, looking for ${target}.`, step: 'sig', state: { pointers: {}, highlights: {}, window: [0, sorted.length - 1] } }]
  let lo = 0
  let hi = sorted.length - 1
  let answer = -1
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2)
    frames.push({
      label: `lo ${lo} · mid ${mid} · hi ${hi}`,
      note: `Probe the middle: nums[${mid}] = ${sorted[mid]} ${sorted[mid] === target ? '= target → found' : sorted[mid] < target ? '< target → search the right half' : '> target → search the left half'}.`,
      step: 'probe',
      state: { pointers: { lo, mid, hi }, highlights: { [mid]: sorted[mid] === target ? 'ok' : 'accent' }, window: [lo, hi] },
    })
    if (sorted[mid] === target) {
      answer = mid
      break
    }
    if (sorted[mid] < target) lo = mid + 1
    else hi = mid - 1
  }
  frames.push({ label: answer >= 0 ? 'found' : 'missing', note: answer >= 0 ? `${target} sits at index ${answer}.` : `${target} is not present — lo passed hi, so stop.`, step: 'ret', state: { pointers: { lo, hi }, highlights: answer >= 0 ? { [answer]: 'ok' } : {}, window: [lo, hi] } })
  const scene = arrayScene({ values: sorted, frames, title: 'Halving the search space', pattern: 'binary-search' })
  if (!scene) return null
  return {
    kind: scene.kind,
    layout: scene.layout,
    code: {
      java: [
        line('sig', 'public int search(int[] nums, int target) {'),
        line('init', '    int lo = 0, hi = nums.length - 1;'),
        line('loop', '    while (lo <= hi) {'),
        line('probe', '        int mid = lo + (hi - lo) / 2;'),
        line('probe2', '        if (nums[mid] == target) return mid;'),
        line('step', '        if (nums[mid] < target) lo = mid + 1; else hi = mid - 1;'),
        line('ret', '    }'),
        line('ret2', '    return -1;'),
      ],
      cpp: [
        line('sig', 'int search(vector<int>& nums, int target) {'),
        line('init', '    int lo = 0, hi = (int)nums.size() - 1;'),
        line('loop', '    while (lo <= hi) {'),
        line('probe', '        int mid = lo + (hi - lo) / 2;'),
        line('probe2', '        if (nums[mid] == target) return mid;'),
        line('step', '        if (nums[mid] < target) lo = mid + 1; else hi = mid - 1;'),
        line('ret', '    }'),
        line('ret2', '    return -1;'),
      ],
      pseudo: [
        line('sig', 'search(nums, target):'),
        line('init', '  lo, hi = 0, n - 1'),
        line('loop', '  while lo <= hi:'),
        line('probe', '    mid = lo + (hi - lo) // 2'),
        line('probe2', '    if nums[mid] == target: return mid'),
        line('step', '    if nums[mid] < target: lo = mid + 1 else: hi = mid - 1'),
        line('ret', '  return -1'),
      ],
    },
    frames,
  }
}

/* --------------------------------------------------------------------- stack */

function buildStack(problem, options) {
  const input = numbersInput(problem, options)
  const params = signatureOf(problem) ? signatureOf(problem).params || [] : []
  const chars = asChars(input[params[0] ? params[0].name : Object.keys(input)[0]])
  if (chars.length === 0) return null
  const pairs = { ')': '(', ']': '[', '}': '{' }
  const stack = []
  const frames = [{ label: 'input', note: 'Push openers, pop on a closer.', step: 'sig', state: { items: [], op: 'push' } }]
  let ok = true
  for (let i = 0; i < chars.length; i += 1) {
    const c = chars[i]
    if ('([{'.includes(c)) {
      stack.push(c)
      frames.push({ label: `push ${c}`, note: `'${c}' opens a scope → push. Stack: ${stack.join(' ') || '(empty)'}.`, step: 'push', state: { items: stack.slice(), op: 'push' } })
      continue
    }
    const top = stack.pop()
    const match = top === pairs[c]
    frames.push({
      label: `close ${c}`,
      note: match ? `'${c}' closes '${top}' ✓. Stack: ${stack.join(' ') || '(empty)'}.` : `'${c}' does not close '${top ?? 'nothing'}' ✗ → invalid.`,
      step: 'pop',
      state: { items: stack.slice(), op: 'pop' },
    })
    if (!match) {
      ok = false
      break
    }
  }
  frames.push({ label: ok ? 'valid' : 'invalid', note: ok ? (stack.length === 0 ? 'Stack empty at the end → balanced.' : 'Unclosed openers remain → invalid.') : 'Stopped at the first mismatch.', step: 'ret', state: { items: stack.slice(), op: 'peek' } })
  const scene = stackScene({ frames, title: 'Stack discipline', pattern: 'stack', capacity: 8 })
  if (!scene) return null
  return {
    kind: scene.kind,
    layout: scene.layout,
    code: {
      java: [
        line('sig', 'public boolean isValid(String s) {'),
        line('init', '    Deque<Character> stack = new ArrayDeque<>();'),
        line('loop', '    for (char c : s.toCharArray()) {'),
        line('push', '        if (c == \'(\' || c == \'[\' || c == \'{\') stack.push(c);'),
        line('pop', '        else { if (stack.isEmpty()) return false; char open = stack.pop();'),
        line('pop2', '               if (c == \')\' && open != \'(\') return false; }'),
        line('ret', '    }'),
        line('ret2', '    return stack.isEmpty();'),
      ],
      cpp: [
        line('sig', 'bool isValid(string s) {'),
        line('init', '    vector<char> stack;'),
        line('loop', '    for (char c : s) {'),
        line('push', '        if (c == \'(\' || c == \'[\' || c == \'{\') stack.push_back(c);'),
        line('pop', '        else { if (stack.empty()) return false; char open = stack.back(); stack.pop_back();'),
        line('pop2', '               if (c == \')\' && open != \'(\') return false; }'),
        line('ret', '    }'),
        line('ret2', '    return stack.empty();'),
      ],
      pseudo: [
        line('sig', 'isValid(s):'),
        line('init', '  stack = []'),
        line('loop', '  for c in s:'),
        line('push', '    if c in "([{": stack.push(c)'),
        line('pop', '    else: if stack.empty(): return false; open = stack.pop()'),
        line('pop2', '          if not matches(open, c): return false'),
        line('ret', '  return stack.empty()'),
      ],
    },
    frames,
  }
}

/* ---------------------------------------------------------------- linked list */

function buildLinkedList(problem, options) {
  const input = numbersInput(problem, options)
  const params = signatureOf(problem) ? signatureOf(problem).params || [] : []
  const values = asIntArray(input[params[0] ? params[0].name : 'head'] ?? Object.values(input)[0])
  if (values.length === 0) return null
  const frames = [{ label: 'input', note: 'prev = null, curr = head.', step: 'sig', state: { pointers: { curr: 0 } } }]
  for (let i = 0; i < values.length; i += 1) {
    frames.push({
      label: `reverse ${i}`,
      note: i === 0 ? `Point node ${i} (value ${values[i]}) back to null — it becomes the new tail.` : `Point node ${i} (value ${values[i]}) back to node ${i - 1}.`,
      step: i === 0 ? 'flip' : 'link',
      state: { pointers: { prev: Math.max(0, i - 1), curr: i, next: Math.min(values.length - 1, i + 1) } },
    })
  }
  frames.push({ label: 'new head', note: `prev now points at the old tail (value ${values[values.length - 1]}) — the reversed list.`, step: 'ret', state: { pointers: { prev: values.length - 1, curr: values.length - 1 } } })
  const scene = linkedListScene({ values, frames, title: 'Reverse the pointers', pattern: 'linked-list' })
  if (!scene) return null
  return {
    kind: scene.kind,
    layout: scene.layout,
    code: {
      java: [
        line('sig', 'public ListNode reverseList(ListNode head) {'),
        line('init', '    ListNode prev = null, curr = head;'),
        line('loop', '    while (curr != null) {'),
        line('flip', '        ListNode next = curr.next;'),
        line('link', '        curr.next = prev;'),
        line('link2', '        prev = curr; curr = next;'),
        line('ret', '    }'),
        line('ret2', '    return prev;'),
      ],
      cpp: [
        line('sig', 'ListNode* reverseList(ListNode* head) {'),
        line('init', '    ListNode* prev = nullptr; ListNode* curr = head;'),
        line('loop', '    while (curr) {'),
        line('flip', '        ListNode* next = curr->next;'),
        line('link', '        curr->next = prev;'),
        line('link2', '        prev = curr; curr = next;'),
        line('ret', '    }'),
        line('ret2', '    return prev;'),
      ],
      pseudo: [
        line('sig', 'reverseList(head):'),
        line('init', '  prev, curr = null, head'),
        line('loop', '  while curr != null:'),
        line('flip', '    next = curr.next'),
        line('link', '    curr.next = prev'),
        line('link2', '    prev, curr = curr, next'),
        line('ret', '  return prev'),
      ],
    },
    frames,
  }
}

/* ----------------------------------------------------------------- tree DFS */

function buildTreeDfs(problem, options) {
  const input = numbersInput(problem, options)
  const signature = signatureOf(problem)
  const params = signature ? signature.params || [] : []
  const raw = input[params[0] ? params[0].name : Object.keys(input)[0]]
  const level = asLevelOrder(raw)
  if (!level || level.length === 0) return null

  // Build the tree (value + children), then walk it in-order recording frames.
  let nextId = 0
  const root = { id: nextId++, value: level[0], left: null, right: null }
  const queue = [root]
  let cursor = 1
  while (queue.length > 0 && cursor < level.length) {
    const node = queue.shift()
    const leftValue = level[cursor++]
    if (leftValue !== null && leftValue !== undefined) {
      node.left = { id: nextId++, value: leftValue, left: null, right: null }
      queue.push(node.left)
    }
    if (cursor < level.length) {
      const rightValue = level[cursor++]
      if (rightValue !== null && rightValue !== undefined) {
        node.right = { id: nextId++, value: rightValue, left: null, right: null }
        queue.push(node.right)
      }
    }
  }

  const nodes = []
  const edges = []
  const collect = (node, parent) => {
    if (!node) return
    nodes.push({ id: node.id, value: node.value })
    if (parent !== null) edges.push([parent, node.id])
    collect(node.left, node.id)
    collect(node.right, node.id)
  }
  collect(root, null)
  if (nodes.length < 2) return null

  const frames = [{ label: 'input', note: 'In-order means: left subtree, node, right subtree.', step: 'sig', state: { visited: [], path: [], frontier: [root.id] } }]
  const output = []
  const path = []
  const walk = (node) => {
    if (!node) return
    path.push(node.id)
    frames.push({ label: `enter ${node.value}`, note: `Descend into ${node.value}; go left first.`, step: 'recurse', state: { current: node.id, visited: output.slice(), path: path.slice(), frontier: node.left ? [node.left.id] : [] } })
    walk(node.left)
    output.push(node.value)
    frames.push({ label: `visit ${node.value}`, note: `Left side done → record ${node.value}. Output: [${output.join(', ')}].`, step: 'visit', state: { current: node.id, visited: output.slice(), path: path.slice() } })
    walk(node.right)
    path.pop()
    frames.push({ label: `leave ${node.value}`, note: `Both children handled → backtrack.`, step: 'back', state: { current: path.length > 0 ? path[path.length - 1] : node.id, visited: output.slice(), path: path.slice() } })
  }
  walk(root)
  frames.push({ label: 'done', note: `In-order result: [${output.join(', ')}].`, step: 'ret', state: { visited: output.slice(), path: [] } })

  const scene = treeScene({ nodes, edges, rootId: root.id, frames, title: 'Recursion walks the tree', pattern: 'tree-dfs' })
  if (!scene) return null
  return {
    kind: scene.kind,
    layout: scene.layout,
    code: {
      java: [
        line('sig', 'public List<Integer> inorderTraversal(TreeNode root) {'),
        line('init', '    List<Integer> out = new ArrayList<>();'),
        line('loop', '    walk(root, out); return out;'),
        line('recurse', '    void walk(TreeNode node, List<Integer> out) {'),
        line('recurse2', '        if (node == null) return;'),
        line('visit', '        walk(node.left, out); out.add(node.val);'),
        line('back', '        walk(node.right, out);'),
        line('ret', '    }'),
      ],
      cpp: [
        line('sig', 'vector<int> inorderTraversal(TreeNode* root) {'),
        line('init', '    vector<int> out;'),
        line('loop', '    walk(root, out); return out;'),
        line('recurse', '    void walk(TreeNode* node, vector<int>& out) {'),
        line('recurse2', '        if (!node) return;'),
        line('visit', '        walk(node->left, out); out.push_back(node->val);'),
        line('back', '        walk(node->right, out);'),
        line('ret', '    }'),
      ],
      pseudo: [
        line('sig', 'inorderTraversal(root):'),
        line('init', '  out = []'),
        line('loop', '  walk(root)'),
        line('recurse', 'walk(node):'),
        line('recurse2', '  if node == null: return'),
        line('visit', '  walk(node.left); out.push(node.val)'),
        line('back', '  walk(node.right)'),
        line('ret', '  return out'),
      ],
    },
    frames,
  }
}

function asLevelOrder(raw) {
  if (raw === null || raw === undefined) return null
  const text = String(raw).trim().replace(/^\[/, '').replace(/\]$/, '')
  if (text.trim() === '') return []
  return text.split(',').map((part) => {
    const value = part.trim()
    if (value === 'null' || value === '') return null
    const number = Number(value)
    return Number.isFinite(number) ? number : null
  })
}

/* --------------------------------------------------------------- entry point */

/* ------------------------------------------------------- monotonic stack (real) */

function buildMonotonicStack(problem, options) {
  const input = numbersInput(problem, options)
  const params = signatureOf(problem) ? signatureOf(problem).params || [] : []
  const nums = asIntArray(input[params[0] ? params[0].name : 'nums'] ?? Object.values(input)[0])
  if (nums.length < 2) return null
  const values = nums.slice(0, 12)
  const frames = [{ label: 'input', note: `Stack holds indices with decreasing values; each pop resolves one answer.`, step: 'sig', state: { pointers: {}, stack: [], resolved: {}, ops: { cmp: 0, writes: 0 } } }]
  const stack = []
  const resolved = {}
  const answer = new Array(values.length).fill(0)
  let cmp = 0
  for (let i = 0; i < values.length; i += 1) {
    frames.push({
      label: `i = ${i} (${values[i]})`,
      note: `nums[${i}] = ${values[i]}; pop every smaller top first.`,
      step: 'read',
      state: { pointers: { i }, highlights: { [i]: 'warn' }, stack: stack.slice(), resolved: { ...resolved }, ops: { cmp, writes: i } },
    })
    while (stack.length > 0 && values[stack[stack.length - 1]] < values[i]) {
      cmp += 1
      const popped = stack.pop()
      answer[popped] = i - popped
      resolved[popped] = i - popped
      frames.push({
        label: `pop ${popped}`,
        note: `nums[${popped}] = ${values[popped]} < ${values[i]} → answer[${popped}] = ${i} − ${popped} = ${answer[popped]}.`,
        step: 'pop',
        state: { pointers: { i }, highlights: { [popped]: 'ok', [i]: 'accent' }, stack: stack.slice(), resolved: { ...resolved }, ops: { cmp, writes: i + 1 } },
      })
    }
    if (stack.length > 0) cmp += 1
    stack.push(i)
    frames.push({
      label: `push ${i}`,
      note: `Stack is now [${stack.join(', ')}] — values strictly decreasing.`,
      step: 'push',
      state: { pointers: { i }, highlights: Object.fromEntries(stack.map((s) => [s, 'mint'])), stack: stack.slice(), resolved: { ...resolved }, ops: { cmp, writes: i + 1 } },
    })
  }
  frames.push({ label: 'answer', note: `Days until a warmer value: [${answer.join(', ')}].`, step: 'ret', state: { pointers: {}, highlights: {}, stack: [], resolved: { ...resolved }, ops: { cmp, writes: values.length } } })
  const scene = arrayScene({ values, frames, title: 'Monotonic stack — resolve by pop', pattern: 'monotonic-stack' })
  if (!scene) return null
  return {
    kind: scene.kind,
    layout: scene.layout,
    code: {
      java: [
        line('sig', 'public int[] dailyTemperatures(int[] nums) {'),
        line('init', '    int n = nums.length; int[] ans = new int[n];'),
        line('init2', '    Deque<Integer> stack = new ArrayDeque<>();'),
        line('loop', '    for (int i = 0; i < n; i++) {'),
        line('read', '        while (!stack.isEmpty() && nums[stack.peek()] < nums[i]) {'),
        line('pop', '            int j = stack.pop(); ans[j] = i - j;'),
        line('close', '        }'),
        line('push', '        stack.push(i);'),
        line('close2', '    }'),
        line('ret', '    return ans;'),
      ],
      cpp: [
        line('sig', 'vector<int> dailyTemperatures(vector<int>& nums) {'),
        line('init', '    int n = nums.size(); vector<int> ans(n, 0);'),
        line('init2', '    vector<int> stack;'),
        line('loop', '    for (int i = 0; i < n; i++) {'),
        line('read', '        while (!stack.empty() && nums[stack.back()] < nums[i]) {'),
        line('pop', '            int j = stack.back(); stack.pop_back(); ans[j] = i - j;'),
        line('close', '        }'),
        line('push', '        stack.push_back(i);'),
        line('close2', '    }'),
        line('ret', '    return ans;'),
      ],
      pseudo: [
        line('sig', 'dailyTemperatures(nums):'),
        line('init', '  ans = [0] * n; stack = []'),
        line('loop', '  for i, x in nums:'),
        line('read', '    while stack and nums[stack.top] < x:'),
        line('pop', '      j = stack.pop(); ans[j] = i - j'),
        line('push', '    stack.push(i)'),
        line('ret', '  return ans'),
      ],
    },
    frames,
  }
}

/* ------------------------------------------------------------------ dp-1d */

function buildDp1d(problem, options) {
  const input = numbersInput(problem, options)
  const params = signatureOf(problem) ? signatureOf(problem).params || [] : []
  const hints = `${problem && problem.slug ? problem.slug : ''} ${problem && problem.title ? problem.title : ''}`.toLowerCase()
  // Climbing-stairs shape: a single small n.
  const singleRaw = Object.values(input)[0]
  const single = Number(singleRaw)
  if ((params.length === 1 && params[0].type === 'int' && Number.isFinite(single) && single >= 1 && single <= 12) || /climb/.test(hints)) {
    const n = Math.max(1, Math.min(12, Math.round(Number.isFinite(single) ? single : 5)))
    const dp = [1, 1]
    for (let i = 2; i <= n; i += 1) dp.push(dp[i - 1] + dp[i - 2])
    const frames = [
      { label: 'input', note: `${n} stairs; each step climbs 1 or 2. dp[i] reads the two previous cells.`, step: 'sig', state: { pointers: {}, values: [1], ops: { cmp: 0, writes: 1 } } },
      { label: 'base', note: 'dp[0] = 1, dp[1] = 1 — one way to stand, one way to take one step.', step: 'init', state: { pointers: { prev2: 0, prev: 1 }, values: [1, 1], ops: { cmp: 0, writes: 2 } } },
    ]
    for (let i = 2; i <= n; i += 1) {
      frames.push({
        label: `dp[${i}] = ${dp[i]}`,
        note: `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${dp[i - 1]} + ${dp[i - 2]} = ${dp[i]}.`,
        step: 'step',
        state: { pointers: { i, prev: i - 1, prev2: i - 2 }, highlights: { [i]: 'accent', [i - 1]: 'ok', [i - 2]: 'ok' }, values: dp.slice(0, i + 1), ops: { cmp: 0, writes: i + 1 } },
      })
    }
    frames.push({ label: 'answer', note: `${dp[n]} distinct ways to climb ${n} stairs (dp[${n}]).`, step: 'ret', state: { pointers: { i: n }, highlights: { [n]: 'ok' }, values: dp.slice(), ops: { cmp: 0, writes: n + 1 } } })
    const scene = arrayScene({ values: dp.slice(), frames, title: 'Climbing stairs — 1D DP', pattern: 'dp-1d' })
    if (!scene) return null
    return {
      kind: scene.kind,
      layout: scene.layout,
      code: {
        java: [
          line('sig', 'public int climbStairs(int n) {'),
          line('init', '    if (n <= 1) return 1;'),
          line('init2', '    int prev2 = 1, prev = 1;'),
          line('loop', '    for (int i = 2; i <= n; i++) {'),
          line('step', '        int cur = prev + prev2;'),
          line('step2', '        prev2 = prev; prev = cur;'),
          line('close', '    }'),
          line('ret', '    return prev;'),
        ],
        cpp: [
          line('sig', 'int climbStairs(int n) {'),
          line('init', '    if (n <= 1) return 1;'),
          line('init2', '    int prev2 = 1, prev = 1;'),
          line('loop', '    for (int i = 2; i <= n; i++) {'),
          line('step', '        int cur = prev + prev2;'),
          line('step2', '        prev2 = prev; prev = cur;'),
          line('close', '    }'),
          line('ret', '    return prev;'),
        ],
        pseudo: [
          line('sig', 'climbStairs(n):'),
          line('init', '  prev2, prev = 1, 1'),
          line('loop', '  for i in 2..n:'),
          line('step', '    cur = prev + prev2; prev2, prev = prev, cur'),
          line('ret', '  return prev'),
        ],
      },
      frames,
    }
  }
  // House-robber shape: an array of values.
  const nums = asIntArray(input[params[0] ? params[0].name : 'nums'] ?? Object.values(input)[0])
  if (nums.length >= 2) {
    const values = nums.slice(0, 10)
    const dp = [values[0], Math.max(values[0], values[1])]
    for (let i = 2; i < values.length; i += 1) dp.push(Math.max(dp[i - 1], dp[i - 2] + values[i]))
    const frames = [
      { label: 'input', note: `${values.length} houses; adjacent houses cannot both be robbed.`, step: 'sig', state: { pointers: {}, values: values.slice(), ops: { cmp: 0, writes: 0 } } },
      { label: 'base', note: `dp[0] = ${dp[0]}; dp[1] = max(${values[0]}, ${values[1]}) = ${dp[1]}.`, step: 'init', state: { pointers: { prev2: 0, prev: 1 }, values: values.slice(), ops: { cmp: 1, writes: 2 } } },
    ]
    for (let i = 2; i < values.length; i += 1) {
      const take = dp[i - 2] + values[i]
      frames.push({
        label: `dp[${i}] = ${dp[i]}`,
        note: `Take: ${values[i]} + dp[${i - 2}] = ${take}; skip: dp[${i - 1}] = ${dp[i - 1]} → dp[${i}] = ${dp[i]}.`,
        step: 'step',
        state: { pointers: { i, prev: i - 1, prev2: i - 2 }, highlights: { [i]: 'accent', [i - 1]: 'warn', [i - 2]: 'ok' }, values: values.slice(), ops: { cmp: i, writes: i + 1 } },
      })
    }
    frames.push({ label: 'answer', note: `Maximum loot is ${dp[dp.length - 1]} (dp[${dp.length - 1}]).`, step: 'ret', state: { pointers: { i: dp.length - 1 }, highlights: { [dp.length - 1]: 'ok' }, values: values.slice(), ops: { cmp: values.length - 1, writes: values.length } } })
    const scene = arrayScene({ values: values.slice(), frames, title: 'House robber — 1D DP', pattern: 'dp-1d' })
    if (!scene) return null
    return {
      kind: scene.kind,
      layout: scene.layout,
      code: {
        java: [
          line('sig', 'public int rob(int[] nums) {'),
          line('init', '    int prev2 = 0, prev = 0;'),
          line('loop', '    for (int x : nums) {'),
          line('step', '        int cur = Math.max(prev, prev2 + x);'),
          line('step2', '        prev2 = prev; prev = cur;'),
          line('close', '    }'),
          line('ret', '    return prev;'),
        ],
        cpp: [
          line('sig', 'int rob(vector<int>& nums) {'),
          line('init', '    int prev2 = 0, prev = 0;'),
          line('loop', '    for (int x : nums) {'),
          line('step', '        int cur = max(prev, prev2 + x);'),
          line('step2', '        prev2 = prev; prev = cur;'),
          line('close', '    }'),
          line('ret', '    return prev;'),
        ],
        pseudo: [
          line('sig', 'rob(nums):'),
          line('init', '  prev2, prev = 0, 0'),
          line('loop', '  for x in nums:'),
          line('step', '    cur = max(prev, prev2 + x); prev2, prev = prev, cur'),
          line('ret', '  return prev'),
        ],
      },
      frames,
    }
  }
  return null
}

/* ------------------------------------------------------------------ dp-2d */

function buildDp2d(problem, options) {
  const input = numbersInput(problem, options)
  const params = signatureOf(problem) ? signatureOf(problem).params || [] : []
  const raws = params.length > 0 ? params.map((p) => input[p.name]) : Object.values(input)
  const strings = raws.map((r) => String(r ?? '')).map((s) => (s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s))
  const a = strings[0] || ''
  const b = strings[1] || ''
  if (a.length === 0 || b.length === 0 || a.length > 8 || b.length > 8) return null
  const rows = a.length + 1
  const cols = b.length + 1
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(0))
  const frames = [{ label: 'table', note: `Edit distance "${a}" → "${b}": dp[r][c] reads up to three neighbours.`, step: 'sig', state: {} }]
  let cmp = 0
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      let reads = []
      if (r === 0) dp[r][c] = c
      else if (c === 0) dp[r][c] = r
      else if (a[r - 1] === b[c - 1]) {
        dp[r][c] = dp[r - 1][c - 1]
        reads = [[r - 1, c - 1]]
        cmp += 1
      } else {
        dp[r][c] = 1 + Math.min(dp[r - 1][c - 1], dp[r - 1][c], dp[r][c - 1])
        reads = [[r - 1, c - 1], [r - 1, c], [r, c - 1]]
        cmp += 3
      }
      const filled = []
      for (let rr = 0; rr <= r; rr += 1) for (let cc = 0; cc < (rr === r ? c + 1 : cols); cc += 1) filled.push([rr, cc])
      frames.push({
        label: `dp[${r}][${c}] = ${dp[r][c]}`,
        note: r === 0 || c === 0 ? `Base case: ${dp[r][c]} edits from an empty prefix.` : a[r - 1] === b[c - 1] ? `'${a[r - 1]}' matches → carry dp[${r - 1}][${c - 1}] = ${dp[r][c]}.` : `1 + min(${dp[r - 1][c - 1]}, ${dp[r - 1][c]}, ${dp[r][c - 1]}) = ${dp[r][c]}.`,
        step: r === 0 || c === 0 ? 'base' : 'step',
        state: {
          current: [r, c],
          filled,
          reads,
          cells: dp.map((row, rr) => row.map((v, cc) => (rr < r || (rr === r && cc <= c) ? v : 0))),
          ops: { cmp, writes: filled.length },
        },
      })
    }
  }
  frames.push({ label: 'answer', note: `Edit distance is ${dp[rows - 1][cols - 1]} — the bottom-right cell.`, step: 'ret', state: { current: [rows - 1, cols - 1], answer: [rows - 1, cols - 1], filled: dp.flatMap((row, r) => row.map((_, c) => [r, c])), cells: dp.map((row) => row.slice()), ops: { cmp, writes: rows * cols } } })
  const scene = gridScene({ rows, cols, cells: dp.map((row) => row.slice()), frames, title: 'Edit distance — 2D DP', pattern: 'dp-2d' })
  if (!scene) return null
  return {
    kind: scene.kind,
    layout: scene.layout,
    code: {
      java: [
        line('sig', 'public int minDistance(String a, String b) {'),
        line('init', '    int[][] dp = new int[a.length()+1][b.length()+1];'),
        line('base', '    for (int r = 0; r <= m; r++) dp[r][0] = r;'),
        line('base2', '    for (int c = 0; c <= n; c++) dp[0][c] = c;'),
        line('loop', '    for (int r = 1; r <= m; r++) for (int c = 1; c <= n; c++)'),
        line('step', '        dp[r][c] = match ? dp[r-1][c-1] : 1 + min(three neighbours);'),
        line('ret', '    return dp[m][n];'),
      ],
      cpp: [
        line('sig', 'int minDistance(string a, string b) {'),
        line('init', '    vector<vector<int>> dp(m+1, vector<int>(n+1));'),
        line('base', '    for (int r = 0; r <= m; r++) dp[r][0] = r;'),
        line('base2', '    for (int c = 0; c <= n; c++) dp[0][c] = c;'),
        line('loop', '    for (int r = 1; r <= m; r++) for (int c = 1; c <= n; c++)'),
        line('step', '        dp[r][c] = match ? dp[r-1][c-1] : 1 + min(three neighbours);'),
        line('ret', '    return dp[m][n];'),
      ],
      pseudo: [
        line('sig', 'editDistance(a, b):'),
        line('init', '  dp = table of (m+1) x (n+1)'),
        line('base', '  fill first row and column with 0..n, 0..m'),
        line('loop', '  for r, c in table:'),
        line('step', '    dp[r][c] = match ? dp[r-1][c-1] : 1 + min(neighbours)'),
        line('ret', '  return dp[m][n]'),
      ],
    },
    frames,
  }
}

/* --------------------------------------------------------------- intervals */

function parseIntervals(raw) {
  try {
    const text = String(raw ?? '').trim()
    if (!text.startsWith('[')) return null
    const outer = JSON.parse(text.replace(/'/g, '"'))
    if (!Array.isArray(outer)) return null
    const out = []
    for (const row of outer) {
      if (!Array.isArray(row) || row.length < 2) continue
      const s = Number(row[0])
      const e = Number(row[1])
      if (!Number.isFinite(s) || !Number.isFinite(e)) continue
      out.push([s, e])
    }
    return out.length >= 1 ? out.slice(0, 8) : null
  } catch {
    return null
  }
}

function buildIntervals(problem, options) {
  const input = numbersInput(problem, options)
  const params = signatureOf(problem) ? signatureOf(problem).params || [] : []
  const raw = params.length > 0 ? input[params[0].name] : Object.values(input)[0]
  const list = parseIntervals(raw)
  if (!list) return null
  const sorted = list.map((iv) => iv.slice()).sort((x, y) => x[0] - y[0] || x[1] - y[1])
  const rows = sorted.length
  const frames = [
    { label: 'input', note: `${rows} intervals; sort by start so overlaps sit side by side.`, step: 'sig', state: {} },
    { label: 'sorted', note: `Order: ${sorted.map((iv) => `[${iv[0]},${iv[1]}]`).join(' ')}.`, step: 'sort', state: {} },
  ]
  const merged = []
  let cmp = 0
  for (let i = 0; i < sorted.length; i += 1) {
    const [start, end] = sorted[i]
    cmp += 1
    frames.push({ label: `[${start},${end}]`, note: `Consider [${start}, ${end}] against the current block.`, step: 'read', state: { current: [i, 0], filled: merged.map((_, k) => [k, 0]), ops: { cmp, writes: merged.length } } })
    if (merged.length > 0 && start <= merged[merged.length - 1][1]) {
      const prev = merged[merged.length - 1]
      const extended = Math.max(prev[1], end)
      frames.push({ label: `merge → [${prev[0]},${extended}]`, note: `${start} ≤ ${prev[1]} → extend [${prev[0]}, ${prev[1]}] to ${extended}.`, step: 'merge', state: { current: [i, 1], filled: merged.map((_, k) => [k, 0]), ops: { cmp, writes: merged.length } } })
      prev[1] = extended
    } else {
      merged.push([start, end])
      frames.push({ label: `keep [${start},${end}]`, note: 'No overlap → start a new merged block.', step: 'keep', state: { current: [i, 0], filled: merged.map((_, k) => [k, 0]), ops: { cmp, writes: merged.length } } })
    }
  }
  frames.push({ label: 'merged', note: `Result: ${merged.map((iv) => `[${iv[0]},${iv[1]}]`).join(' ')}.`, step: 'ret', state: { filled: sorted.map((_, i) => [i, 0]), ops: { cmp, writes: merged.length } } })
  const scene = gridScene({ rows, cols: 2, cells: sorted.map((iv) => iv.slice()), frames, title: 'Merge intervals — sort + sweep', pattern: 'intervals' })
  if (!scene) return null
  return {
    kind: scene.kind,
    layout: scene.layout,
    code: {
      java: [
        line('sig', 'public int[][] merge(int[][] iv) {'),
        line('sort', '    Arrays.sort(iv, (a, b) -> a[0] - b[0]);'),
        line('init', '    List<int[]> out = new ArrayList<>();'),
        line('loop', '    for (int[] cur : iv) {'),
        line('read', '        if (out.isEmpty() || cur[0] > out.get(last)[1])'),
        line('keep', '            out.add(cur);'),
        line('merge', '        else out.get(last)[1] = max(end, cur[1]);'),
        line('ret', '    } return out.toArray(new int[0][]);'),
      ],
      cpp: [
        line('sig', 'vector<vector<int>> merge(vector<vector<int>>& iv) {'),
        line('sort', '    sort(iv.begin(), iv.end());'),
        line('init', '    vector<vector<int>> out;'),
        line('loop', '    for (auto& cur : iv) {'),
        line('read', '        if (out.empty() || cur[0] > out.back()[1])'),
        line('keep', '            out.push_back(cur);'),
        line('merge', '        else out.back()[1] = max(out.back()[1], cur[1]);'),
        line('ret', '    } return out;'),
      ],
      pseudo: [
        line('sig', 'merge(intervals):'),
        line('sort', '  sort by start'),
        line('loop', '  for [s, e] in sorted:'),
        line('read', '    if no overlap with last block:'),
        line('keep', '      start a new block'),
        line('merge', '    else extend the last block'),
        line('ret', '  return blocks'),
      ],
    },
    frames,
  }
}

/* ---------------------------------------------------------------- heap */

function buildHeap(problem, options) {
  const input = numbersInput(problem, options)
  const params = signatureOf(problem) ? signatureOf(problem).params || [] : []
  const nums = asIntArray(input[params[0] ? params[0].name : 'nums'] ?? Object.values(input)[0])
  const kval = Number(Object.values(input)[1] ?? 2)
  if (nums.length < 2 || !Number.isFinite(kval)) return null
  const values = nums.slice(0, 10)
  const k = Math.max(1, Math.min(Math.round(kval) || 2, values.length))
  const heap = []
  let cmp = 0
  const push = (v) => {
    heap.push(v)
    let i = heap.length - 1
    while (i > 0) {
      const p = Math.floor((i - 1) / 2)
      cmp += 1
      if (heap[p] <= heap[i]) break
      const t = heap[p]
      heap[p] = heap[i]
      heap[i] = t
      i = p
    }
  }
  const pop = () => {
    const top = heap[0]
    const last = heap.pop()
    if (heap.length > 0 && last !== undefined) {
      heap[0] = last
      let i = 0
      for (;;) {
        const l = i * 2 + 1
        const r = l + 1
        let s = i
        if (l < heap.length) {
          cmp += 1
          if (heap[l] < heap[s]) s = l
        }
        if (r < heap.length) {
          cmp += 1
          if (heap[r] < heap[s]) s = r
        }
        if (s === i) break
        const t = heap[i]
        heap[i] = heap[s]
        heap[s] = t
        i = s
      }
    }
    return top
  }
  const frames = [{ label: 'input', note: `Keep the ${k} largest of ${values.length} values in a min-heap of size ${k}.`, step: 'sig', state: { values: [], ops: { cmp: 0, writes: 0 } } }]
  for (let i = 0; i < values.length; i += 1) {
    push(values[i])
    frames.push({ label: `push ${values[i]}`, note: `Heap = [${heap.join(', ')}]; the smallest of the kept sits on top.`, step: 'push', state: { values: heap.slice(), highlights: { 0: 'accent' }, ops: { cmp, writes: i + 1 } } })
    if (heap.length > k) {
      const out = pop()
      frames.push({ label: `evict ${out}`, note: `${out} is smaller than everything kept → drop it.`, step: 'pop', state: { values: heap.slice(), highlights: { 0: 'bad' }, ops: { cmp, writes: i + 1 } } })
    }
  }
  frames.push({ label: 'answer', note: `Top ${k}: [${heap.slice().sort((x, y) => x - y).join(', ')}]; kth largest = ${heap.slice().sort((x, y) => x - y)[0]}.`, step: 'ret', state: { values: heap.slice(), highlights: { 0: 'ok' }, ops: { cmp, writes: values.length } } })
  const scene = arrayScene({ values: heap.slice(), frames, title: 'Top K — min-heap of size k', pattern: 'heap-topk' })
  if (!scene) return null
  return {
    kind: scene.kind,
    layout: scene.layout,
    code: {
      java: [
        line('sig', 'public int findKthLargest(int[] nums, int k) {'),
        line('init', '    PriorityQueue<Integer> heap = new PriorityQueue<>();'),
        line('loop', '    for (int x : nums) {'),
        line('push', '        heap.offer(x);'),
        line('pop', '        if (heap.size() > k) heap.poll();'),
        line('close', '    }'),
        line('ret', '    return heap.peek();'),
      ],
      cpp: [
        line('sig', 'int findKthLargest(vector<int>& nums, int k) {'),
        line('init', '    priority_queue<int, vector<int>, greater<int>> heap;'),
        line('loop', '    for (int x : nums) {'),
        line('push', '        heap.push(x);'),
        line('pop', '        if ((int)heap.size() > k) heap.pop();'),
        line('close', '    }'),
        line('ret', '    return heap.top();'),
      ],
      pseudo: [
        line('sig', 'findKthLargest(nums, k):'),
        line('init', '  heap = min-heap'),
        line('loop', '  for x in nums:'),
        line('push', '    push x'),
        line('pop', '    if size > k: pop smallest'),
        line('ret', '  return heap.top'),
      ],
    },
    frames,
  }
}

/* ------------------------------------------------- grid graphs (bfs / dfs) */

function asMatrix(raw) {
  try {
    const text = String(raw ?? '').trim()
    if (!text.startsWith('[')) return null
    const grid = JSON.parse(text.replace(/'/g, '"'))
    if (!Array.isArray(grid) || grid.length === 0 || grid.length > 8) return null
    const rows = grid.map((row) => (Array.isArray(row) ? row.map((v) => String(v)) : null))
    if (rows.some((row) => !row || row.length === 0 || row.length > 8)) return null
    const width = rows[0].length
    if (rows.some((row) => row.length !== width)) return null
    return rows
  } catch {
    return null
  }
}

function gridBfsWalkthrough(cells) {
  const rows = cells.length
  const cols = cells[0].length
  const open = (r, c) => cells[r][c] !== '0' && cells[r][c] !== 0 && cells[r][c] !== 'false'
  if (!open(0, 0)) return null
  const seen = new Set(['0,0'])
  const dist = new Map([['0,0', 0]])
  const queue = [[0, 0]]
  const filled = []
  const frames = [
    { label: 'input', note: `${rows} × ${cols} grid; BFS visits one distance layer at a time.`, step: 'sig', state: {} },
    { label: 'seed', note: 'Queue = [(0,0)], dist = 0. The frontier is the boundary.', step: 'init', state: { current: [0, 0], frontier: [[0, 0]], cells: cells.map((row) => row.slice()) } },
  ]
  while (queue.length > 0 && filled.length < 60) {
    const [r, c] = queue.shift()
    filled.push([r, c])
    frames.push({
      label: `visit (${r},${c})`,
      note: `Dequeue (${r},${c}) at dist ${dist.get(`${r},${c}`)}; ${queue.length} cell(s) wait in the queue.`,
      step: 'visit',
      state: {
        current: [r, c],
        filled: filled.slice(),
        frontier: queue.slice(),
        cells: cells.map((row, rr) => row.map((v, cc) => (dist.has(`${rr},${cc}`) ? dist.get(`${rr},${cc}`) : v))),
      },
    })
    for (const [dr, dc] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || !open(nr, nc) || seen.has(`${nr},${nc}`)) continue
      seen.add(`${nr},${nc}`)
      dist.set(`${nr},${nc}`, dist.get(`${r},${c}`) + 1)
      queue.push([nr, nc])
      frames.push({
        label: `enqueue (${nr},${nc})`,
        note: `(${nr},${nc}) is open and unseen → dist ${dist.get(`${nr},${nc}`)}, join the queue.`,
        step: 'push',
        state: { current: [r, c], filled: filled.slice(), frontier: queue.slice() },
      })
    }
  }
  frames.push({ label: 'done', note: `Reached ${seen.size} cell(s); the queue is empty, so every distance is final.`, step: 'ret', state: { filled: filled.slice(), cells: cells.map((row, rr) => row.map((v, cc) => (dist.has(`${rr},${cc}`) ? dist.get(`${rr},${cc}`) : v))) } })
  return { rows, cols, cells, frames }
}

function gridDfsWalkthrough(cells) {
  const rows = cells.length
  const cols = cells[0].length
  const open = (r, c) => cells[r][c] !== '0' && cells[r][c] !== 0 && cells[r][c] !== 'false'
  if (!open(0, 0)) return null
  const seen = new Set()
  const path = []
  const frames = [
    { label: 'input', note: `${rows} × ${cols} grid; DFS goes deep — the stack is the current path.`, step: 'sig', state: {} },
    { label: 'seed', note: 'Call dfs(0, 0); the stack holds [(0,0)].', step: 'init', state: { current: [0, 0] } },
  ]
  const openUnvisited = (r, c) => {
    const out = []
    for (const [dr, dc] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || !open(nr, nc) || seen.has(`${nr},${nc}`)) continue
      out.push([nr, nc])
    }
    return out
  }
  const visit = (r, c) => {
    seen.add(`${r},${c}`)
    path.push([r, c])
    const boundary = openUnvisited(r, c)
    frames.push({ label: `enter (${r},${c})`, note: `Mark (${r},${c}); path depth ${path.length}${boundary.length > 0 ? `; ${boundary.length} open neighbour${boundary.length === 1 ? '' : 's'} on the boundary.` : '; dead end — will backtrack.'}.`, step: 'enter', state: { current: [r, c], path: path.slice(), filled: [...seen].map((k) => k.split(',').map(Number)), frontier: boundary } })
    for (const [dr, dc] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || !open(nr, nc) || seen.has(`${nr},${nc}`)) continue
      visit(nr, nc)
      if (frames.length > 38) return
    }
    path.pop()
    frames.push({ label: `backtrack`, note: `(${r},${c}) has no open neighbours left → pop, back to depth ${path.length}.`, step: 'back', state: { current: path.length > 0 ? path[path.length - 1] : [r, c], path: path.slice(), filled: [...seen].map((k) => k.split(',').map(Number)) } })
  }
  visit(0, 0)
  frames.push({ label: 'done', note: `Visited ${seen.size} cell(s); every path backtracked to the start.`, step: 'ret', state: { filled: [...seen].map((k) => k.split(',').map(Number)) } })
  return { rows, cols, cells, frames }
}

function buildGraphWalkthrough(problem, options, dfs) {
  const input = numbersInput(problem, options)
  const params = signatureOf(problem) ? signatureOf(problem).params || [] : []
  const raw = params.length > 0 ? input[params[0].name] : Object.values(input)[0]
  const cells = asMatrix(raw)
  if (!cells) return null
  const built = dfs ? gridDfsWalkthrough(cells) : gridBfsWalkthrough(cells)
  if (!built) return null
  const scene = gridScene({ rows: built.rows, cols: built.cols, cells: built.cells.map((row) => row.slice()), frames: built.frames, title: dfs ? 'Grid DFS — stack is the path' : 'Grid BFS — queue wavefront', pattern: dfs ? 'graph-dfs' : 'graph-bfs' })
  if (!scene) return null
  const java = dfs
    ? [
      line('sig', 'public void dfs(char[][] grid, int r, int c) {'),
      line('init', '    if (out of bounds || grid[r][c] != \'1\') return;'),
      line('enter', '    grid[r][c] = \'2\'; // mark visited'),
      line('enter2', '    dfs(grid, r+1, c); dfs(grid, r-1, c);'),
      line('back', '    dfs(grid, r, c+1); dfs(grid, r, c-1); // backtrack'),
      line('ret', '    // returns to the caller when done'),
    ]
    : [
      line('sig', 'public void bfs(char[][] grid) {'),
      line('init', '    Queue<int[]> queue = new ArrayDeque<>(); queue.add(new int[]{0,0});'),
      line('visit', '    int[] cur = queue.poll(); // head of the queue'),
      line('push', '        if (open && unseen) queue.add(neighbour);'),
      line('close', '    // repeat until the queue is empty'),
      line('ret', '    // every distance is final when dequeued'),
    ]
  const cpp = dfs
    ? [
      line('sig', 'void dfs(vector<vector<char>>& grid, int r, int c) {'),
      line('init', '    if (out of bounds || grid[r][c] != \'1\') return;'),
      line('enter', '    grid[r][c] = \'2\'; // mark visited'),
      line('enter2', '    dfs(grid, r+1, c); dfs(grid, r-1, c);'),
      line('back', '    dfs(grid, r, c+1); dfs(grid, r, c-1); // backtrack'),
      line('ret', '    // returns to the caller when done'),
    ]
    : [
      line('sig', 'void bfs(vector<vector<char>>& grid) {'),
      line('init', '    queue<pair<int,int>> queue; queue.push({0,0});'),
      line('visit', '    auto cur = queue.front(); queue.pop();'),
      line('push', '        if (open && unseen) queue.push(neighbour);'),
      line('close', '    // repeat until the queue is empty'),
      line('ret', '    // every distance is final when dequeued'),
    ]
  const pseudo = dfs
    ? [
      line('sig', 'dfs(grid, r, c):'),
      line('init', '  if out of bounds or closed: return'),
      line('enter', '  mark visited; push on path'),
      line('back', '  visit neighbours, then pop (backtrack)'),
      line('ret', '  return to caller'),
    ]
    : [
      line('sig', 'bfs(grid):'),
      line('init', '  queue = [(0,0)]'),
      line('visit', '  cur = queue.pop_front()'),
      line('push', '  push open unseen neighbours'),
      line('ret', '  stop when the queue is empty'),
    ]
  return { kind: scene.kind, layout: scene.layout, code: { java, cpp, pseudo }, frames: built.frames }
}

/* -------------------------------------------------------------- union-find */

function buildUnionFind(problem, options) {
  const input = numbersInput(problem, options)
  const params = signatureOf(problem) ? signatureOf(problem).params || [] : []
  const parseEdgeList = (raw) => {
    try {
      const parsed = JSON.parse(String(raw ?? '').replace(/'/g, '"'))
      if (!Array.isArray(parsed)) return []
      return parsed.filter((e) => Array.isArray(e) && e.length >= 2).map((e) => [Number(e[0]), Number(e[1])]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
    } catch {
      return []
    }
  }
  let n = 0
  let edges = []
  if (params.length > 1) {
    // (n, edges) shape, e.g. number-of-provinces / connected-components.
    n = Math.round(Number(Object.values(input)[0]) || 0)
    edges = parseEdgeList(input[params[1].name]).filter(([x, y]) => x >= 0 && y >= 0 && x < n && y < n).slice(0, 8)
  } else {
    // Edge-list-only shape, e.g. redundant-connection: derive n from the largest node.
    edges = parseEdgeList(Object.values(input)[0]).filter(([x, y]) => x >= 0 && y >= 0).slice(0, 10)
    // Node labels may be 1-based (LeetCode convention) — normalize to 0-based ids.
    const lo = edges.length > 0 ? Math.min(...edges.flat()) : 0
    if (lo === 1) edges = edges.map(([x, y]) => [x - 1, y - 1])
    n = edges.length > 0 ? Math.max(...edges.flat()) + 1 : 0
  }
  if (!Number.isFinite(n) || n < 2 || n > 12 || edges.length < 1) return null
  const parent = Array.from({ length: n }, (_, i) => i)
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }
  const nodes = Array.from({ length: n }, (_, id) => ({ id, label: String(id) }))
  const frames = [{ label: 'input', note: `${n} nodes, each its own set: parent[i] = i.`, step: 'sig', state: { parent: Object.fromEntries(parent.map((p, i) => [i, p])) } }]
  let components = n
  for (const [x, y] of edges) {
    const rx = find(x)
    const ry = find(y)
    if (rx === ry) {
      frames.push({ label: `cycle ${x}-${y}`, note: `find(${x}) = find(${y}) = ${rx} → already connected; skip.`, step: 'find', state: { current: x, visited: [rx], cycle: [x, y], path: [x, y], parent: Object.fromEntries(parent.map((p, i) => [i, p])) } })
      continue
    }
    parent[ry] = rx
    components -= 1
    frames.push({ label: `union ${x}-${y}`, note: `Roots ${rx} and ${ry} merge → parent[${ry}] = ${rx}; ${components} component(s) left.`, step: 'union', state: { current: x, path: [x, y], parent: Object.fromEntries(parent.map((p, i) => [i, p])) } })
  }
  frames.push({ label: 'done', note: `${components} connected component(s) remain.`, step: 'ret', state: { visited: nodes.map((nd) => nd.id), parent: Object.fromEntries(parent.map((p, i) => [i, p])) } })
  const scene = graphScene({ nodes, edges, frames, title: 'Union-find — merge sets', pattern: 'union-find' })
  if (!scene) return null
  return {
    kind: scene.kind,
    layout: scene.layout,
    code: {
      java: [
        line('sig', 'int find(int[] parent, int x) {'),
        line('find', '    while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }'),
        line('find2', '    return x;'),
        line('union', 'void union(int[] parent, int a, int b) { parent[find(parent, a)] = find(parent, b); }'),
        line('ret', '// components = sets left after all unions'),
      ],
      cpp: [
        line('sig', 'int find(vector<int>& parent, int x) {'),
        line('find', '    while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }'),
        line('find2', '    return x;'),
        line('union', 'void unite(vector<int>& p, int a, int b) { p[find(p, a)] = find(p, b); }'),
        line('ret', '// components = sets left after all unions'),
      ],
      pseudo: [
        line('sig', 'find(x): follow parent pointers, compress on the way'),
        line('find', '  while parent[x] != x: parent[x] = parent[parent[x]]; x = parent[x]'),
        line('union', 'union(a, b): parent[find(a)] = find(b)'),
        line('ret', 'components = sets left'),
      ],
    },
    frames,
  }
}

/* ---------------------------------------------------------------- tree-bfs */

function buildTreeBfs(problem, options) {
  const input = numbersInput(problem, options)
  const params = signatureOf(problem) ? signatureOf(problem).params || [] : []
  const level = asLevelOrder(input[params[0] ? params[0].name : Object.keys(input)[0]])
  if (!level || level.length < 2) return null
  let nextId = 0
  const root = { id: nextId++, value: level[0], left: null, right: null }
  const q = [root]
  let cursor = 1
  while (q.length > 0 && cursor < level.length) {
    const node = q.shift()
    const lv = level[cursor++]
    if (lv !== null && lv !== undefined) {
      node.left = { id: nextId++, value: lv, left: null, right: null }
      q.push(node.left)
    }
    if (cursor < level.length) {
      const rv = level[cursor++]
      if (rv !== null && rv !== undefined) {
        node.right = { id: nextId++, value: rv, left: null, right: null }
        q.push(node.right)
      }
    }
  }
  const nodes = []
  const edges = []
  const collect = (node, par) => {
    if (!node) return
    nodes.push({ id: node.id, value: node.value })
    if (par !== null) edges.push([par, node.id])
    collect(node.left, node.id)
    collect(node.right, node.id)
  }
  collect(root, null)
  if (nodes.length < 2) return null
  const frames = [{ label: 'input', note: 'Level order = visit top to bottom, left to right, using a queue.', step: 'sig', state: { frontier: [root.id], queue: [root.id] } }]
  const queue = [root]
  const order = []
  while (queue.length > 0 && order.length < 24) {
    const node = queue.shift()
    order.push(node.value)
    const kids = [node.left, node.right].filter(Boolean)
    for (const kid of kids) queue.push(kid)
    frames.push({
      label: `visit ${node.value}`,
      note: `Dequeue ${node.value} (${order.length} visited); enqueue ${kids.length > 0 ? kids.map((k) => k.value).join(', ') : 'nothing'}. Output: [${order.join(', ')}].`,
      step: 'visit',
      state: { current: node.id, visited: order.slice(), path: order.slice(), frontier: queue.map((k) => k.id), queue: queue.map((k) => k.id) },
    })
  }
  frames.push({ label: 'done', note: `Level order: [${order.join(', ')}].`, step: 'ret', state: { visited: order.slice(), path: [] } })
  const scene = treeScene({ nodes, edges, rootId: root.id, frames, title: 'Level-order walk', pattern: 'tree-bfs' })
  if (!scene) return null
  return {
    kind: scene.kind,
    layout: scene.layout,
    code: {
      java: [
        line('sig', 'public List<Integer> levelOrder(TreeNode root) {'),
        line('init', '    List<Integer> out = new ArrayList<>(); Queue<TreeNode> q = new ArrayDeque<>();'),
        line('init2', '    if (root != null) q.add(root);'),
        line('loop', '    while (!q.isEmpty()) {'),
        line('visit', '        TreeNode node = q.poll(); out.add(node.val);'),
        line('visit2', '        if (node.left != null) q.add(node.left);'),
        line('visit3', '        if (node.right != null) q.add(node.right);'),
        line('ret', '    } return out;'),
      ],
      cpp: [
        line('sig', 'vector<int> levelOrder(TreeNode* root) {'),
        line('init', '    vector<int> out; queue<TreeNode*> q;'),
        line('init2', '    if (root) q.push(root);'),
        line('loop', '    while (!q.empty()) {'),
        line('visit', '        TreeNode* node = q.front(); q.pop(); out.push_back(node->val);'),
        line('visit2', '        if (node->left) q.push(node->left);'),
        line('visit3', '        if (node->right) q.push(node->right);'),
        line('ret', '    } return out;'),
      ],
      pseudo: [
        line('sig', 'levelOrder(root):'),
        line('init', '  out = []; q = [root]'),
        line('loop', '  while q not empty:'),
        line('visit', '    node = q.pop_front(); out.push(node.val)'),
        line('visit2', '    push non-null children'),
        line('ret', '  return out'),
      ],
    },
    frames,
  }
}

/* ------------------------------------------------------------- backtracking */

function buildBacktracking(problem, options) {
  const input = numbersInput(problem, options)
  const params = signatureOf(problem) ? signatureOf(problem).params || [] : []
  const nums = asIntArray(input[params[0] ? params[0].name : 'nums'] ?? Object.values(input)[0])
  if (nums.length < 2 || nums.length > 5) return null
  const values = nums.slice()
  const n = values.length
  const nodes = [{ id: 0, value: 0, label: '[]' }]
  const edges = []
  const frames = [
    { label: 'input', note: `Choose or skip each of ${n} items; the highlighted path is the recursion stack.`, step: 'sig', state: { current: 0, path: [0] } },
  ]
  let nextId = 1
  let recorded = 0
  const visit = (index, subset, nodeId, stack) => {
    if (frames.length > 36) return
    if (index >= n) {
      recorded += 1
      frames.push({ label: `record [${subset.join(', ')}]`, note: `Leaf → record subset #${recorded}: [${subset.join(', ')}].`, step: 'record', state: { current: nodeId, path: stack.slice() } })
      return
    }
    const takeId = nextId++
    nodes.push({ id: takeId, value: 0, label: `[${[...subset, values[index]].join(', ')}]` })
    edges.push([nodeId, takeId])
    frames.push({ label: `choose ${values[index]}`, note: `Take ${values[index]} and explore deeper.`, step: 'choose', state: { current: takeId, path: [...stack, takeId] } })
    visit(index + 1, [...subset, values[index]], takeId, [...stack, takeId])
    frames.push({ label: `un-choose ${values[index]}`, note: `Back up — remove ${values[index]}, then try skipping it.`, step: 'unchoose', state: { current: nodeId, path: stack.slice() } })
    const skipId = nextId++
    nodes.push({ id: skipId, value: 0, label: `[${subset.join(', ')}]` })
    edges.push([nodeId, skipId])
    frames.push({ label: `skip ${values[index]}`, note: `Skip ${values[index]} and explore deeper.`, step: 'choose', state: { current: skipId, path: [...stack, skipId] } })
    visit(index + 1, subset, skipId, [...stack, skipId])
  }
  visit(0, [], 0, [0])
  frames.push({ label: 'done', note: `${recorded} subsets recorded — every take/skip path explored.`, step: 'ret', state: { visited: nodes.map((nd) => nd.id), path: [] } })
  const scene = treeScene({ nodes, edges, rootId: 0, frames, title: 'Subsets — choose / un-choose', pattern: 'backtracking' })
  if (!scene) return null
  return {
    kind: scene.kind,
    layout: scene.layout,
    code: {
      java: [
        line('sig', 'void backtrack(int[] nums, int i, List<Integer> path) {'),
        line('record', '    if (i == nums.length) { out.add(new ArrayList<>(path)); return; }'),
        line('choose', '    path.add(nums[i]); backtrack(nums, i + 1, path);'),
        line('unchoose', '    path.remove(path.size() - 1); // un-choose'),
        line('choose2', '    backtrack(nums, i + 1, path); // skip branch'),
        line('ret', '}'),
      ],
      cpp: [
        line('sig', 'void backtrack(vector<int>& nums, int i, vector<int>& path) {'),
        line('record', '    if (i == (int)nums.size()) { out.push_back(path); return; }'),
        line('choose', '    path.push_back(nums[i]); backtrack(nums, i + 1, path);'),
        line('unchoose', '    path.pop_back(); // un-choose'),
        line('choose2', '    backtrack(nums, i + 1, path); // skip branch'),
        line('ret', '}'),
      ],
      pseudo: [
        line('sig', 'backtrack(i, path):'),
        line('record', '  if i == n: record path; return'),
        line('choose', '  choose nums[i]; recurse'),
        line('unchoose', '  un-choose nums[i]'),
        line('choose2', '  skip nums[i]; recurse'),
        line('ret', '  (both branches explored)'),
      ],
    },
    frames,
  }
}

/* ------------------------------------------------------------------- trie */

function buildTrie(problem, options) {
  const input = numbersInput(problem, options)
  const params = signatureOf(problem) ? signatureOf(problem).params || [] : []
  const raw = input[params[0] ? params[0].name : Object.keys(input)[0]]
  let words = []
  try {
    const parsed = JSON.parse(String(raw ?? '').replace(/'/g, '"'))
    if (Array.isArray(parsed)) words = parsed.map((w) => String(w)).filter((w) => w.length > 0 && w.length <= 6).slice(0, 4)
  } catch {
    return null
  }
  if (words.length < 2) return null
  const nodes = [{ id: 0, value: 0, label: '•' }]
  const edges = []
  const lookup = new Map([['', 0]])
  let nextId = 1
  const frames = [{ label: 'input', note: `Insert ${words.length} words; shared prefixes share nodes.`, step: 'sig', state: { current: 0, path: [0] } }]
  for (const word of words) {
    let nodeId = 0
    const path = [0]
    for (let i = 0; i < word.length; i += 1) {
      const prefix = word.slice(0, i + 1)
      let child = lookup.get(prefix)
      if (child === undefined) {
        child = nextId++
        nodes.push({ id: child, value: 0, label: word[i] })
        edges.push([nodeId, child])
        lookup.set(prefix, child)
        frames.push({ label: `new '${word[i]}'`, note: `Prefix "${prefix}" is new → create node for '${word[i]}'.`, step: 'create', state: { current: child, path: [...path, child] } })
      } else {
        frames.push({ label: `reuse '${word[i]}'`, note: `Prefix "${prefix}" exists → follow it, no new node.`, step: 'follow', state: { current: child, path: [...path, child] } })
      }
      nodeId = child
      path.push(child)
    }
    frames.push({ label: `word "${word}"`, note: `"${word}" ends at node ${nodeId}.`, step: 'word', state: { current: nodeId, path: path.slice() } })
  }
  frames.push({ label: 'done', note: `${nodes.length} nodes hold ${words.length} words; shared prefixes merged.`, step: 'ret', state: { current: 0, visited: nodes.map((nd) => nd.id), path: [] } })
  const scene = treeScene({ nodes, edges, rootId: 0, frames, title: 'Trie — shared prefixes', pattern: 'trie' })
  if (!scene) return null
  return {
    kind: scene.kind,
    layout: scene.layout,
    code: {
      java: [
        line('sig', 'void insert(String word) {'),
        line('init', '    TrieNode node = root;'),
        line('loop', '    for (char c : word.toCharArray()) {'),
        line('follow', '        if (node.next[c] == null)'),
        line('create', '            node.next[c] = new TrieNode();'),
        line('follow2', '        node = node.next[c];'),
        line('word', '    } node.word = true;'),
      ],
      cpp: [
        line('sig', 'void insert(string word) {'),
        line('init', '    TrieNode* node = root;'),
        line('loop', '    for (char c : word) {'),
        line('follow', '        if (!node->next[c])'),
        line('create', '            node->next[c] = new TrieNode();'),
        line('follow2', '        node = node->next[c];'),
        line('word', '    } node->word = true;'),
      ],
      pseudo: [
        line('sig', 'insert(word):'),
        line('init', '  node = root'),
        line('loop', '  for c in word:'),
        line('follow', '    if child c missing:'),
        line('create', '      create it'),
        line('word', '  mark end of word'),
      ],
    },
    frames,
  }
}

/* ---------------------------------------------------------- topological-sort */

function buildTopoSort(problem, options) {
  const input = numbersInput(problem, options)
  const params = signatureOf(problem) ? signatureOf(problem).params || [] : []
  const n = Math.max(2, Math.min(10, Math.round(Number(Object.values(input)[0]) || 0)))
  if (!Number.isFinite(n) || n < 2) return null
  const edgesRaw = params.length > 1 ? input[params[1].name] : Object.values(input)[1]
  let prereqs = []
  try {
    const parsed = JSON.parse(String(edgesRaw ?? '').replace(/'/g, '"'))
    if (Array.isArray(parsed)) prereqs = parsed.filter((e) => Array.isArray(e) && e.length >= 2).map((e) => [Number(e[0]), Number(e[1])]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x < n && y < n).slice(0, 10)
  } catch {
    return null
  }
  if (prereqs.length < 1) return null
  // Edge [a, b] means b → a (b is a prerequisite of a).
  const adj = Array.from({ length: n }, () => [])
  const indeg = new Array(n).fill(0)
  for (const [a, b] of prereqs) {
    adj[b].push(a)
    indeg[a] += 1
  }
  const nodes = Array.from({ length: n }, (_, id) => ({ id, label: String(id) }))
  const edges = prereqs.map(([a, b]) => [b, a])
  const queue = []
  for (let i = 0; i < n; i += 1) if (indeg[i] === 0) queue.push(i)
  const distances = Object.fromEntries(queue.map((id) => [id, 0]))
  const frames = [{ label: 'input', note: `${n} courses, ${prereqs.length} prerequisite(s); indegree 0 goes first.`, step: 'sig', state: { frontier: queue.slice(), queue: queue.slice(), distances: { ...distances } } }]
  const order = []
  let level = 0
  while (queue.length > 0) {
    const node = queue.shift()
    order.push(node)
    frames.push({
      label: `take ${node}`,
      note: `Course ${node} has indegree 0 → take it (semester ${level + 1}); order so far [${order.join(', ')}].`,
      step: 'take',
      state: { current: node, visited: order.slice(), path: order.slice(), frontier: queue.slice(), queue: queue.slice(), distances: { ...distances } },
    })
    for (const next of adj[node]) {
      indeg[next] -= 1
      if (indeg[next] === 0) {
        queue.push(next)
        distances[next] = level + 1
        frames.push({ label: `free ${next}`, note: `Course ${next} lost its last prerequisite → joins the queue.`, step: 'free', state: { current: node, visited: order.slice(), frontier: queue.slice(), queue: queue.slice(), distances: { ...distances } } })
      }
    }
    if (queue.length === 0 && order.length < n) level += 1
    else if (queue.length > 0 && !queue.some((id) => distances[id] === level + 1)) level += 1
  }
  const ok = order.length === n
  frames.push({ label: ok ? 'done' : 'cycle', note: ok ? `Order [${order.join(', ')}] takes every course.` : `Only ${order.length}/${n} taken — a cycle remains, so it is impossible.`, step: 'ret', state: { visited: order.slice(), path: ok ? order.slice() : [] } })
  const scene = graphScene({ nodes, edges, directed: true, frames, title: 'Course schedule — Kahn’s order', pattern: 'topological-sort' })
  if (!scene) return null
  return {
    kind: scene.kind,
    layout: scene.layout,
    code: {
      java: [
        line('sig', 'public boolean canFinish(int n, int[][] pre) {'),
        line('init', '    Build adjacency + indegree; queue all indegree-0 courses.'),
        line('loop', '    while (!queue.isEmpty()) {'),
        line('take', '        int c = queue.poll(); order.add(c);'),
        line('free', '        if (--indeg[next] == 0) queue.add(next);'),
        line('ret', '    } return order.size() == n;'),
      ],
      cpp: [
        line('sig', 'bool canFinish(int n, vector<vector<int>>& pre) {'),
        line('init', '    Build adjacency + indegree; queue all indegree-0 courses.'),
        line('loop', '    while (!q.empty()) {'),
        line('take', '        int c = q.front(); q.pop(); order.push_back(c);'),
        line('free', '        if (--indeg[next] == 0) q.push(next);'),
        line('ret', '    } return order.size() == n;'),
      ],
      pseudo: [
        line('sig', 'canFinish(n, prereqs):'),
        line('init', '  indegree; queue = indegree-0 nodes'),
        line('loop', '  while queue:'),
        line('take', '    take head; append to order'),
        line('free', '    free neighbours with indegree now 0'),
        line('ret', '  possible iff order has n courses'),
      ],
    },
    frames,
  }
}

const BUILDERS = {
  'arrays-hashing': buildArraysHashing,
  'two-pointers': buildTwoPointers,
  'sliding-window': buildSlidingWindow,
  'binary-search': buildBinarySearch,
  stack: buildStack,
  'monotonic-stack': buildMonotonicStack,
  'linked-list': buildLinkedList,
  'tree-dfs': buildTreeDfs,
  'dp-1d': buildDp1d,
  'dp-2d': buildDp2d,
  intervals: buildIntervals,
  'heap-topk': buildHeap,
  'graph-bfs': (problem, options) => buildGraphWalkthrough(problem, options, false),
  'graph-dfs': (problem, options) => buildGraphWalkthrough(problem, options, true),
  'union-find': buildUnionFind,
  'tree-bfs': buildTreeBfs,
  backtracking: buildBacktracking,
  trie: buildTrie,
  'topological-sort': buildTopoSort,
}

const CODE_ORDER = { java: 0, cpp: 1, pseudo: 2 }

/** Resolve a step id to a 1-based line number for one language. */
export function lineForStep(walkthrough, language, step) {
  if (!walkthrough || !walkthrough.code) return 0
  const lines = walkthrough.code[language] || walkthrough.code.java || []
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].step === step) return index + 1
  }
  // Fall back to the previous known step so the highlight never disappears mid-run.
  return 0
}

export function buildWalkthrough(problem, options = {}) {
  if (!problem) return null
  const builder = BUILDERS[problem.pattern]
  if (!builder) return null
  try {
    const built = builder(problem, options)
    if (!built) return null
    return {
      ...built,
      title: problem.title,
      pattern: problem.pattern,
      languages: ['java', 'cpp', 'pseudo'].sort((a, b) => CODE_ORDER[a] - CODE_ORDER[b]),
    }
  } catch {
    return null
  }
}

export function supportsWalkthrough(pattern) {
  return Object.prototype.hasOwnProperty.call(BUILDERS, pattern)
}



