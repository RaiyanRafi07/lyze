// Judge smoke matrix: proves the generated harness works on the real type surface.
// Run: node tools/judge_smoke.mjs [--base http://127.0.0.1:64289]
const BASE = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://127.0.0.1:64289'

const CASES = []

function add(slug, lang, code) {
  CASES.push({ slug, lang, code })
}

/* ---------------------------------------------------------------- Java cases */

add('add-two-numbers', 'java', `class Solution {
    public ListNode addTwoNumbers(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(0), cur = dummy;
        int carry = 0;
        while (l1 != null || l2 != null || carry != 0) {
            int a = l1 == null ? 0 : l1.val;
            int b = l2 == null ? 0 : l2.val;
            int sum = a + b + carry;
            carry = sum / 10;
            cur.next = new ListNode(sum % 10);
            cur = cur.next;
            if (l1 != null) l1 = l1.next;
            if (l2 != null) l2 = l2.next;
        }
        return dummy.next;
    }
}`)

add('binary-tree-level-order-traversal', 'java', `class Solution {
    public List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> out = new ArrayList<>();
        if (root == null) return out;
        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);
        while (!queue.isEmpty()) {
            int size = queue.size();
            List<Integer> level = new ArrayList<>();
            for (int i = 0; i < size; i++) {
                TreeNode node = queue.poll();
                level.add(node.val);
                if (node.left != null) queue.add(node.left);
                if (node.right != null) queue.add(node.right);
            }
            out.add(level);
        }
        return out;
    }
}`)

add('subsets', 'java', `class Solution {
    public List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> out = new ArrayList<>();
        int n = nums.length;
        for (int mask = 0; mask < (1 << n); mask++) {
            List<Integer> current = new ArrayList<>();
            for (int i = 0; i < n; i++) if ((mask & (1 << i)) != 0) current.add(nums[i]);
            out.add(current);
        }
        return out;
    }
}`)

add('group-anagrams', 'java', `class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> map = new HashMap<>();
        for (String s : strs) {
            char[] chars = s.toCharArray();
            Arrays.sort(chars);
            map.computeIfAbsent(new String(chars), key -> new ArrayList<>()).add(s);
        }
        return new ArrayList<>(map.values());
    }
}`)

add('generate-parentheses', 'java', `class Solution {
    public List<String> generateParenthesis(int n) {
        List<String> out = new ArrayList<>();
        walk(out, new StringBuilder(), 0, 0, n);
        return out;
    }
    private void walk(List<String> out, StringBuilder current, int open, int close, int n) {
        if (current.length() == 2 * n) { out.add(current.toString()); return; }
        if (open < n) { current.append('('); walk(out, current, open + 1, close, n); current.deleteCharAt(current.length() - 1); }
        if (close < open) { current.append(')'); walk(out, current, open, close + 1, n); current.deleteCharAt(current.length() - 1); }
    }
}`)

add('permutations', 'java', `class Solution {
    public List<List<Integer>> permute(int[] nums) {
        List<List<Integer>> out = new ArrayList<>();
        List<Integer> current = new ArrayList<>();
        boolean[] used = new boolean[nums.length];
        walk(nums, used, current, out);
        return out;
    }
    private void walk(int[] nums, boolean[] used, List<Integer> current, List<List<Integer>> out) {
        if (current.size() == nums.length) { out.add(new ArrayList<>(current)); return; }
        for (int i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true;
            current.add(nums[i]);
            walk(nums, used, current, out);
            current.remove(current.size() - 1);
            used[i] = false;
        }
    }
}`)

add('valid-parentheses', 'java', `class Solution {
    public boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '[' || c == '{') stack.push(c);
            else {
                if (stack.isEmpty()) return false;
                char open = stack.pop();
                if (c == ')' && open != '(') return false;
                if (c == ']' && open != '[') return false;
                if (c == '}' && open != '{') return false;
            }
        }
        return stack.isEmpty();
    }
}`)

add('median-of-two-sorted-arrays', 'java', `class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        int[] all = new int[nums1.length + nums2.length];
        System.arraycopy(nums1, 0, all, 0, nums1.length);
        System.arraycopy(nums2, 0, all, nums1.length, nums2.length);
        Arrays.sort(all);
        int n = all.length;
        if (n % 2 == 1) return all[n / 2];
        return (all[n / 2 - 1] + all[n / 2]) / 2.0;
    }
}`)

add('number-of-islands', 'java', `class Solution {
    public int numIslands(char[][] grid) {
        if (grid.length == 0) return 0;
        int count = 0;
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[0].length; c++) {
                if (grid[r][c] == '1') { count++; flood(grid, r, c); }
            }
        }
        return count;
    }
    private void flood(char[][] grid, int r, int c) {
        if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length || grid[r][c] != '1') return;
        grid[r][c] = '0';
        flood(grid, r + 1, c); flood(grid, r - 1, c); flood(grid, r, c + 1); flood(grid, r, c - 1);
    }
}`)

add('merge-intervals', 'java', `class Solution {
    public int[][] merge(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> out = new ArrayList<>();
        for (int[] interval : intervals) {
            if (!out.isEmpty() && interval[0] <= out.get(out.size() - 1)[1]) {
                out.get(out.size() - 1)[1] = Math.max(out.get(out.size() - 1)[1], interval[1]);
            } else out.add(new int[]{interval[0], interval[1]});
        }
        return out.toArray(new int[out.size()][]);
    }
}`)

add('trapping-rain-water', 'java', `class Solution {
    public int trap(int[] height) {
        int left = 0, right = height.length - 1, leftMax = 0, rightMax = 0, total = 0;
        while (left < right) {
            if (height[left] < height[right]) {
                if (height[left] >= leftMax) leftMax = height[left]; else total += leftMax - height[left];
                left++;
            } else {
                if (height[right] >= rightMax) rightMax = height[right]; else total += rightMax - height[right];
                right--;
            }
        }
        return total;
    }
}`)

add('climbing-stairs', 'java', `class Solution {
    public int climbStairs(int n) {
        int a = 1, b = 1;
        for (int i = 2; i <= n; i++) { int c = a + b; a = b; b = c; }
        return b;
    }
}`)

add('two-sum', 'java', `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];
            if (seen.containsKey(need)) return new int[]{seen.get(need), i};
            seen.put(nums[i], i);
        }
        return new int[]{};
    }
}`)

/* ----------------------------------------------------------------- C++ cases */

add('merge-intervals', 'cpp', `class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>>& intervals) {
        sort(intervals.begin(), intervals.end());
        vector<vector<int>> out;
        for (auto& interval : intervals) {
            if (!out.empty() && interval[0] <= out.back()[1]) out.back()[1] = max(out.back()[1], interval[1]);
            else out.push_back(interval);
        }
        return out;
    }
};`)

add('valid-parentheses', 'cpp', `class Solution {
public:
    bool isValid(string s) {
        vector<char> stack;
        for (char c : s) {
            if (c == '(' || c == '[' || c == '{') stack.push_back(c);
            else {
                if (stack.empty()) return false;
                char open = stack.back(); stack.pop_back();
                if (c == ')' && open != '(') return false;
                if (c == ']' && open != '[') return false;
                if (c == '}' && open != '{') return false;
            }
        }
        return stack.empty();
    }
};`)

add('number-of-islands', 'cpp', `class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        int count = 0;
        for (int r = 0; r < (int)grid.size(); r++)
            for (int c = 0; c < (int)grid[0].size(); c++)
                if (grid[r][c] == '1') { count++; flood(grid, r, c); }
        return count;
    }
    void flood(vector<vector<char>>& grid, int r, int c) {
        if (r < 0 || c < 0 || r >= (int)grid.size() || c >= (int)grid[0].size() || grid[r][c] != '1') return;
        grid[r][c] = '0';
        flood(grid, r + 1, c); flood(grid, r - 1, c); flood(grid, r, c + 1); flood(grid, r, c - 1);
    }
};`)

add('add-two-numbers', 'cpp', `class Solution {
public:
    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
        ListNode dummy(0); ListNode* cur = &dummy; int carry = 0;
        while (l1 || l2 || carry) {
            int a = l1 ? l1->val : 0;
            int b = l2 ? l2->val : 0;
            int sum = a + b + carry;
            carry = sum / 10;
            cur->next = new ListNode(sum % 10);
            cur = cur->next;
            if (l1) l1 = l1->next;
            if (l2) l2 = l2->next;
        }
        return dummy.next;
    }
};`)

add('trapping-rain-water', 'cpp', `class Solution {
public:
    int trap(vector<int>& height) {
        int left = 0, right = (int)height.size() - 1, leftMax = 0, rightMax = 0, total = 0;
        while (left < right) {
            if (height[left] < height[right]) {
                if (height[left] >= leftMax) leftMax = height[left]; else total += leftMax - height[left];
                left++;
            } else {
                if (height[right] >= rightMax) rightMax = height[right]; else total += rightMax - height[right];
                right--;
            }
        }
        return total;
    }
};`)

/* --------------------------------------------------------- expected failures */

const NEGATIVE = [
  { slug: 'two-sum', lang: 'java', code: 'class Solution { public int[] twoSum(int[] nums, int target) { return new int[]{9, 9}; } }', expect: 'wrong answer' },
  { slug: 'valid-parentheses', lang: 'java', code: 'class Solution { public boolean isValid(String s) { return true; } }', expect: 'wrong answer' },
  { slug: 'merge-intervals', lang: 'java', code: 'class Solution { public int[][] merge(int[][] intervals) { return intervals; } }', expect: 'wrong answer' },
  { slug: 'number-of-islands', lang: 'cpp', code: 'class Solution { public: int numIslands(vector<vector<char>>& grid) { return 0; } };', expect: 'wrong answer' },
  { slug: 'two-sum', lang: 'java', code: 'class Solution { public int[] twoSum(int[] nums, int target) { return undefinedSymbol; } }', expect: 'compile error' },
]

async function post(path, body) {
  const response = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return await response.json()
}

let pass = 0
let fail = 0
const failures = []

for (const testCase of CASES) {
  try {
    const result = await post('/leetcode-lab/api/judge', { slug: testCase.slug, lang: testCase.lang, code: testCase.code })
    const ok = result.ok === true
    if (ok) pass += 1
    else fail += 1
    const detail = ok
      ? `${result.passed}/${result.total} cases · compile ${result.compile && result.compile.ms}ms · run ${result.ms}ms`
      : `${result.error || 'failed'}${result.compile && result.compile.stderr ? ' :: ' + String(result.compile.stderr).split('\n')[0].slice(0, 120) : ''}${result.cases && result.cases.length ? ' :: got ' + JSON.stringify(result.cases.filter((c) => !c.ok).slice(0, 1)) : ''}`
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${testCase.lang.padEnd(4)}  ${testCase.slug.padEnd(36)}  ${detail}`)
    if (!ok) failures.push({ slug: testCase.slug, lang: testCase.lang, result })
  } catch (error) {
    fail += 1
    console.log(`FAIL  ${testCase.lang.padEnd(4)}  ${testCase.slug.padEnd(36)}  transport: ${error.message}`)
    failures.push({ slug: testCase.slug, error: error.message })
  }
}

console.log('\n-- negative controls (must NOT pass) --')
for (const control of NEGATIVE) {
  const result = await post('/leetcode-lab/api/judge', { slug: control.slug, lang: control.lang, code: control.code })
  const caught = control.expect === 'compile error' ? result.compile && result.compile.ok === false : result.ok === false
  if (caught) pass += 1
  else fail += 1
  console.log(`${caught ? 'PASS' : 'FAIL'}  ${control.lang.padEnd(4)}  ${control.slug.padEnd(36)}  expected ${control.expect}, got ok=${result.ok} compile.ok=${result.compile && result.compile.ok}`)
}

console.log(`\nTOTAL ${pass} passed, ${fail} failed`)
if (failures.length > 0) {
  console.log('\nFAILURE DETAIL')
  for (const failure of failures) console.log(JSON.stringify(failure).slice(0, 900))
}
process.exit(fail === 0 ? 0 : 1)
