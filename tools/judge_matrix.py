#!/usr/bin/env python3
"""Judge hardening matrix for LeetCode Lab.

Exercises the live judge (POST /leetcode-lab/api/judge) across every LeetCode
type/shape the dataset uses, with hand-written reference solutions, plus:
  * negative controls (wrong answers must fail on the right case)
  * a compile-error control
  * synthetic edge probes for harness bugs (char escaping, long precision,
    -0.0, stray stdout, unordered/whitespace comparison, C++ vector<bool>, ...)

Nothing here writes to plugin/ — results land in tools/judge_matrix_results.json
and any harness defects go to tools/JUDGE_BUGS.md.

Run:  python tools/judge_matrix.py
"""

from __future__ import annotations

import json
import pathlib
import sys
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "plugin" / "data"
RESULTS_PATH = pathlib.Path(__file__).resolve().parent / "judge_matrix_results.json"
BASE = "http://127.0.0.1:64289/leetcode-lab/api"


# ---------------------------------------------------------------------------
# Reference solutions (Java)
# ---------------------------------------------------------------------------

JAVA = {}

JAVA["invert-binary-tree"] = r"""
class Solution {
    public TreeNode invertTree(TreeNode root) {
        if (root == null) return null;
        TreeNode left = invertTree(root.left);
        TreeNode right = invertTree(root.right);
        root.left = right;
        root.right = left;
        return root;
    }
}
"""

JAVA["merge-two-binary-trees"] = r"""
class Solution {
    public TreeNode mergeTrees(TreeNode root1, TreeNode root2) {
        if (root1 == null) return root2;
        if (root2 == null) return root1;
        root1.val += root2.val;
        root1.left = mergeTrees(root1.left, root2.left);
        root1.right = mergeTrees(root1.right, root2.right);
        return root1;
    }
}
"""

JAVA["binary-tree-level-order-traversal"] = r"""
class Solution {
    public List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> out = new ArrayList<>();
        if (root == null) return out;
        ArrayDeque<TreeNode> queue = new ArrayDeque<>();
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
}
"""

JAVA["maximum-depth-of-binary-tree"] = r"""
class Solution {
    public int maxDepth(TreeNode root) {
        if (root == null) return 0;
        return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
    }
}
"""

JAVA["search-in-a-binary-search-tree"] = r"""
class Solution {
    public TreeNode searchBST(TreeNode root, int val) {
        while (root != null) {
            if (root.val == val) return root;
            root = val < root.val ? root.left : root.right;
        }
        return null;
    }
}
"""

JAVA["binary-tree-inorder-traversal"] = r"""
class Solution {
    public List<Integer> inorderTraversal(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        ArrayDeque<TreeNode> stack = new ArrayDeque<>();
        TreeNode node = root;
        while (node != null || !stack.isEmpty()) {
            while (node != null) { stack.push(node); node = node.left; }
            node = stack.pop();
            out.add(node.val);
            node = node.right;
        }
        return out;
    }
}
"""

JAVA["reverse-linked-list"] = r"""
class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode previous = null;
        while (head != null) {
            ListNode next = head.next;
            head.next = previous;
            previous = head;
            head = next;
        }
        return previous;
    }
}
"""

JAVA["merge-two-sorted-lists"] = r"""
class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        while (list1 != null && list2 != null) {
            if (list1.val <= list2.val) { tail.next = list1; list1 = list1.next; }
            else { tail.next = list2; list2 = list2.next; }
            tail = tail.next;
        }
        tail.next = list1 != null ? list1 : list2;
        return dummy.next;
    }
}
"""

JAVA["remove-duplicates-from-sorted-list"] = r"""
class Solution {
    public ListNode deleteDuplicates(ListNode head) {
        ListNode node = head;
        while (node != null && node.next != null) {
            if (node.val == node.next.val) node.next = node.next.next;
            else node = node.next;
        }
        return head;
    }
}
"""

JAVA["remove-linked-list-elements"] = r"""
class Solution {
    public ListNode removeElements(ListNode head, int val) {
        ListNode dummy = new ListNode(0);
        dummy.next = head;
        ListNode node = dummy;
        while (node.next != null) {
            if (node.next.val == val) node.next = node.next.next;
            else node = node.next;
        }
        return dummy.next;
    }
}
"""

JAVA["middle-of-the-linked-list"] = r"""
class Solution {
    public ListNode middleNode(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        return slow;
    }
}
"""

JAVA["add-two-numbers"] = r"""
class Solution {
    public ListNode addTwoNumbers(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        int carry = 0;
        while (l1 != null || l2 != null || carry != 0) {
            int sum = carry;
            if (l1 != null) { sum += l1.val; l1 = l1.next; }
            if (l2 != null) { sum += l2.val; l2 = l2.next; }
            carry = sum / 10;
            tail.next = new ListNode(sum % 10);
            tail = tail.next;
        }
        return dummy.next;
    }
}
"""

JAVA["merge-intervals"] = r"""
class Solution {
    public int[][] merge(int[][] intervals) {
        if (intervals.length == 0) return new int[0][];
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> merged = new ArrayList<>();
        for (int[] interval : intervals) {
            if (!merged.isEmpty() && interval[0] <= merged.get(merged.size() - 1)[1]) {
                int[] last = merged.get(merged.size() - 1);
                last[1] = Math.max(last[1], interval[1]);
            } else {
                merged.add(new int[]{interval[0], interval[1]});
            }
        }
        return merged.toArray(new int[merged.size()][]);
    }
}
"""

JAVA["transpose-matrix"] = r"""
class Solution {
    public int[][] transpose(int[][] matrix) {
        int rows = matrix.length;
        int cols = matrix[0].length;
        int[][] out = new int[cols][rows];
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) out[c][r] = matrix[r][c];
        }
        return out;
    }
}
"""

JAVA["flipping-an-image"] = r"""
class Solution {
    public int[][] flipAndInvertImage(int[][] image) {
        int rows = image.length;
        for (int r = 0; r < rows; r++) {
            int i = 0, j = image[r].length - 1;
            while (i <= j) {
                int left = 1 - image[r][i];
                int right = 1 - image[r][j];
                image[r][i] = right;
                image[r][j] = left;
                i++; j--;
            }
        }
        return image;
    }
}
"""

JAVA["image-smoother"] = r"""
class Solution {
    public int[][] imageSmoother(int[][] img) {
        int rows = img.length, cols = img[0].length;
        int[][] out = new int[rows][cols];
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                int sum = 0, count = 0;
                for (int dr = -1; dr <= 1; dr++) {
                    for (int dc = -1; dc <= 1; dc++) {
                        int nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) { sum += img[nr][nc]; count++; }
                    }
                }
                out[r][c] = sum / count;
            }
        }
        return out;
    }
}
"""

JAVA["matrix-cells-in-distance-order"] = r"""
class Solution {
    public int[][] allCellsDistOrder(int rows, int cols, int rCenter, int cCenter) {
        List<int[]> cells = new ArrayList<>();
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) cells.add(new int[]{r, c});
        }
        cells.sort((a, b) -> {
            int da = Math.abs(a[0] - rCenter) + Math.abs(a[1] - cCenter);
            int db = Math.abs(b[0] - rCenter) + Math.abs(b[1] - cCenter);
            if (da != db) return Integer.compare(da, db);
            if (a[0] != b[0]) return Integer.compare(a[0], b[0]);
            return Integer.compare(a[1], b[1]);
        });
        return cells.toArray(new int[cells.size()][]);
    }
}
"""

JAVA["valid-parentheses"] = r"""
class Solution {
    public boolean isValid(String s) {
        ArrayDeque<Character> stack = new ArrayDeque<>();
        for (char ch : s.toCharArray()) {
            if (ch == '(') stack.push(')');
            else if (ch == '[') stack.push(']');
            else if (ch == '{') stack.push('}');
            else if (stack.isEmpty() || stack.pop() != ch) return false;
        }
        return stack.isEmpty();
    }
}
"""

JAVA["longest-common-prefix"] = r"""
class Solution {
    public String longestCommonPrefix(String[] strs) {
        if (strs.length == 0) return "";
        String prefix = strs[0];
        for (int i = 1; i < strs.length; i++) {
            while (!strs[i].startsWith(prefix)) {
                prefix = prefix.substring(0, prefix.length() - 1);
                if (prefix.isEmpty()) return "";
            }
        }
        return prefix;
    }
}
"""

JAVA["fizz-buzz"] = r"""
class Solution {
    public List<String> fizzBuzz(int n) {
        List<String> out = new ArrayList<>();
        for (int i = 1; i <= n; i++) {
            if (i % 15 == 0) out.add("FizzBuzz");
            else if (i % 3 == 0) out.add("Fizz");
            else if (i % 5 == 0) out.add("Buzz");
            else out.add(String.valueOf(i));
        }
        return out;
    }
}
"""

JAVA["group-anagrams"] = r"""
class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> groups = new HashMap<>();
        for (String word : strs) {
            char[] chars = word.toCharArray();
            Arrays.sort(chars);
            String key = new String(chars);
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(word);
        }
        return new ArrayList<>(groups.values());
    }
}
"""

JAVA["add-strings"] = r"""
class Solution {
    public String addStrings(String num1, String num2) {
        StringBuilder out = new StringBuilder();
        int i = num1.length() - 1, j = num2.length() - 1, carry = 0;
        while (i >= 0 || j >= 0 || carry != 0) {
            int sum = carry;
            if (i >= 0) sum += num1.charAt(i--) - '0';
            if (j >= 0) sum += num2.charAt(j--) - '0';
            out.append((char) ('0' + sum % 10));
            carry = sum / 10;
        }
        return out.reverse().toString();
    }
}
"""

JAVA["valid-sudoku"] = r"""
class Solution {
    public boolean isValidSudoku(char[][] board) {
        boolean[][] rows = new boolean[9][9];
        boolean[][] cols = new boolean[9][9];
        boolean[][] boxes = new boolean[9][9];
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                char ch = board[r][c];
                if (ch == '.') continue;
                int digit = ch - '1';
                int box = (r / 3) * 3 + c / 3;
                if (rows[r][digit] || cols[c][digit] || boxes[box][digit]) return false;
                rows[r][digit] = cols[c][digit] = boxes[box][digit] = true;
            }
        }
        return true;
    }
}
"""

JAVA["number-of-islands"] = r"""
class Solution {
    public int numIslands(char[][] grid) {
        int count = 0;
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[0].length; c++) {
                if (grid[r][c] == '1') { count++; sink(grid, r, c); }
            }
        }
        return count;
    }
    private void sink(char[][] grid, int r, int c) {
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] != '1') return;
        grid[r][c] = '0';
        sink(grid, r + 1, c); sink(grid, r - 1, c); sink(grid, r, c + 1); sink(grid, r, c - 1);
    }
}
"""

JAVA["minesweeper"] = r"""
class Solution {
    private int rows, cols;
    private char[][] board;
    public char[][] updateBoard(char[][] board, int[] click) {
        this.board = board;
        rows = board.length;
        cols = board[0].length;
        int r = click[0], c = click[1];
        if (board[r][c] == 'M') { board[r][c] = 'X'; return board; }
        reveal(r, c);
        return board;
    }
    private void reveal(int r, int c) {
        if (r < 0 || r >= rows || c < 0 || c >= cols || board[r][c] != 'E') return;
        int mines = 0;
        for (int dr = -1; dr <= 1; dr++) {
            for (int dc = -1; dc <= 1; dc++) {
                int nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc] == 'M') mines++;
            }
        }
        if (mines > 0) { board[r][c] = (char) ('0' + mines); return; }
        board[r][c] = 'B';
        for (int dr = -1; dr <= 1; dr++) {
            for (int dc = -1; dc <= 1; dc++) reveal(r + dr, c + dc);
        }
    }
}
"""

JAVA["rotating-the-box"] = r"""
class Solution {
    public char[][] rotateTheBox(char[][] boxGrid) {
        int rows = boxGrid.length, cols = boxGrid[0].length;
        for (int r = 0; r < rows; r++) {
            int empty = cols - 1;
            for (int c = cols - 1; c >= 0; c--) {
                if (boxGrid[r][c] == '#') {
                    boxGrid[r][c] = '.';
                    boxGrid[r][empty] = '#';
                    empty--;
                } else if (boxGrid[r][c] == '*') {
                    empty = c - 1;
                }
            }
        }
        char[][] out = new char[cols][rows];
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) out[c][rows - 1 - r] = boxGrid[r][c];
        }
        return out;
    }
}
"""

JAVA["find-smallest-letter-greater-than-target"] = r"""
class Solution {
    public char nextGreatestLetter(char[] letters, char target) {
        int lo = 0, hi = letters.length;
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (letters[mid] <= target) lo = mid + 1;
            else hi = mid;
        }
        return letters[lo % letters.length];
    }
}
"""

JAVA["string-compression"] = r"""
class Solution {
    public int compress(char[] chars) {
        int write = 0, read = 0;
        while (read < chars.length) {
            char current = chars[read];
            int count = 0;
            while (read < chars.length && chars[read] == current) { read++; count++; }
            chars[write++] = current;
            if (count > 1) {
                for (char digit : String.valueOf(count).toCharArray()) chars[write++] = digit;
            }
        }
        return write;
    }
}
"""

JAVA["best-poker-hand"] = r"""
class Solution {
    public String bestHand(int[] ranks, char[] suits) {
        boolean flush = true;
        for (char suit : suits) if (suit != suits[0]) { flush = false; break; }
        if (flush) return "Flush";
        int[] counts = new int[14];
        int best = 0;
        for (int rank : ranks) { counts[rank]++; best = Math.max(best, counts[rank]); }
        if (best >= 3) return "Three of a Kind";
        if (best == 2) return "Pair";
        return "High Card";
    }
}
"""

JAVA["median-of-two-sorted-arrays"] = r"""
class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        int total = nums1.length + nums2.length;
        int[] merged = new int[total];
        int i = 0, j = 0, k = 0;
        while (i < nums1.length && j < nums2.length) merged[k++] = nums1[i] <= nums2[j] ? nums1[i++] : nums2[j++];
        while (i < nums1.length) merged[k++] = nums1[i++];
        while (j < nums2.length) merged[k++] = nums2[j++];
        if (total % 2 == 1) return merged[total / 2];
        return (merged[total / 2 - 1] + merged[total / 2]) / 2.0;
    }
}
"""

JAVA["convert-the-temperature"] = r"""
class Solution {
    public double[] convertTemperature(double celsius) {
        return new double[]{celsius + 273.15, celsius * 1.80 + 32.00};
    }
}
"""

JAVA["minimum-garden-perimeter-to-collect-enough-apples"] = r"""
class Solution {
    public long minimumPerimeter(long neededApples) {
        long lo = 1, hi = 100000;
        while (lo < hi) {
            long mid = (lo + hi) >>> 1;
            if (apples(mid) >= neededApples) hi = mid;
            else lo = mid + 1;
        }
        return 8 * lo;
    }
    private long apples(long n) {
        return 2 * (2 * n + 1) * n * (n + 1);
    }
}
"""

JAVA["number-of-wonderful-substrings"] = r"""
class Solution {
    public long wonderfulSubstrings(String word) {
        long[] counts = new long[1024];
        counts[0] = 1;
        int mask = 0;
        long answer = 0;
        for (char ch : word.toCharArray()) {
            mask ^= 1 << (ch - 'a');
            answer += counts[mask];
            for (int bit = 0; bit < 10; bit++) answer += counts[mask ^ (1 << bit)];
            counts[mask]++;
        }
        return answer;
    }
}
"""

JAVA["palindrome-number"] = r"""
class Solution {
    public boolean isPalindrome(int x) {
        if (x < 0 || (x % 10 == 0 && x != 0)) return false;
        int reversed = 0;
        while (x > reversed) {
            reversed = reversed * 10 + x % 10;
            x /= 10;
        }
        return x == reversed || x == reversed / 10;
    }
}
"""

JAVA["valid-anagram"] = r"""
class Solution {
    public boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;
        int[] counts = new int[26];
        for (int i = 0; i < s.length(); i++) { counts[s.charAt(i) - 'a']++; counts[t.charAt(i) - 'a']--; }
        for (int count : counts) if (count != 0) return false;
        return true;
    }
}
"""

JAVA["climbing-stairs"] = r"""
class Solution {
    public int climbStairs(int n) {
        int a = 1, b = 1;
        for (int i = 2; i <= n; i++) { int next = a + b; a = b; b = next; }
        return b;
    }
}
"""

JAVA["length-of-last-word"] = r"""
class Solution {
    public int lengthOfLastWord(String s) {
        int length = 0;
        int i = s.length() - 1;
        while (i >= 0 && s.charAt(i) == ' ') i--;
        while (i >= 0 && s.charAt(i) != ' ') { length++; i--; }
        return length;
    }
}
"""

JAVA["two-sum"] = r"""
class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            Integer other = seen.get(target - nums[i]);
            if (other != null) return new int[]{other, i};
            seen.put(nums[i], i);
        }
        return new int[]{-1, -1};
    }
}
"""

JAVA["binary-watch"] = r"""
class Solution {
    public List<String> readBinaryWatch(int turnedOn) {
        List<String> out = new ArrayList<>();
        for (int hour = 0; hour < 12; hour++) {
            for (int minute = 0; minute < 60; minute++) {
                if (Integer.bitCount(hour) + Integer.bitCount(minute) == turnedOn) {
                    out.add(hour + ":" + (minute < 10 ? "0" : "") + minute);
                }
            }
        }
        return out;
    }
}
"""

JAVA["find-common-characters"] = r"""
class Solution {
    public List<String> commonChars(String[] words) {
        int[] common = new int[26];
        Arrays.fill(common, Integer.MAX_VALUE);
        for (String word : words) {
            int[] counts = new int[26];
            for (char ch : word.toCharArray()) counts[ch - 'a']++;
            for (int i = 0; i < 26; i++) common[i] = Math.min(common[i], counts[i]);
        }
        List<String> out = new ArrayList<>();
        for (int i = 0; i < 26; i++) {
            for (int n = 0; n < common[i]; n++) out.add(String.valueOf((char) ('a' + i)));
        }
        return out;
    }
}
"""

JAVA["kids-with-the-greatest-number-of-candies"] = r"""
class Solution {
    public List<Boolean> kidsWithCandies(int[] candies, int extraCandies) {
        int max = 0;
        for (int candy : candies) max = Math.max(max, candy);
        List<Boolean> out = new ArrayList<>();
        for (int candy : candies) out.add(candy + extraCandies >= max);
        return out;
    }
}
"""

JAVA["sum-of-distances"] = r"""
class Solution {
    public long[] distance(int[] nums) {
        Map<Integer, List<Integer>> positions = new HashMap<>();
        for (int i = 0; i < nums.length; i++) positions.computeIfAbsent(nums[i], k -> new ArrayList<>()).add(i);
        long[] out = new long[nums.length];
        for (List<Integer> list : positions.values()) {
            long prefix = 0;
            for (int i = 0; i < list.size(); i++) {
                out[list.get(i)] += (long) list.get(i) * i - prefix;
                prefix += list.get(i);
            }
            long suffix = 0;
            for (int i = list.size() - 1; i >= 0; i--) {
                out[list.get(i)] += suffix - (long) list.get(i) * (list.size() - 1 - i);
                suffix += list.get(i);
            }
        }
        return out;
    }
}
"""

# ---------------------------------------------------------------------------
# Reference solutions (C++)
# ---------------------------------------------------------------------------

CPP = {}

CPP["invert-binary-tree"] = r"""
class Solution {
public:
    TreeNode* invertTree(TreeNode* root) {
        if (!root) return nullptr;
        TreeNode* left = invertTree(root->left);
        TreeNode* right = invertTree(root->right);
        root->left = right;
        root->right = left;
        return root;
    }
};
"""

CPP["binary-tree-level-order-traversal"] = r"""
class Solution {
public:
    vector<vector<int>> levelOrder(TreeNode* root) {
        vector<vector<int>> out;
        if (!root) return out;
        queue<TreeNode*> q;
        q.push(root);
        while (!q.empty()) {
            int size = (int) q.size();
            vector<int> level;
            for (int i = 0; i < size; i++) {
                TreeNode* node = q.front(); q.pop();
                level.push_back(node->val);
                if (node->left) q.push(node->left);
                if (node->right) q.push(node->right);
            }
            out.push_back(level);
        }
        return out;
    }
};
"""

CPP["reverse-linked-list"] = r"""
class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        ListNode* previous = nullptr;
        while (head) {
            ListNode* next = head->next;
            head->next = previous;
            previous = head;
            head = next;
        }
        return previous;
    }
};
"""

CPP["add-two-numbers"] = r"""
class Solution {
public:
    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
        ListNode dummy(0);
        ListNode* tail = &dummy;
        int carry = 0;
        while (l1 || l2 || carry) {
            int sum = carry;
            if (l1) { sum += l1->val; l1 = l1->next; }
            if (l2) { sum += l2->val; l2 = l2->next; }
            carry = sum / 10;
            tail->next = new ListNode(sum % 10);
            tail = tail->next;
        }
        return dummy.next;
    }
};
"""

CPP["merge-intervals"] = r"""
class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>>& intervals) {
        if (intervals.empty()) return {};
        sort(intervals.begin(), intervals.end());
        vector<vector<int>> merged;
        for (auto& interval : intervals) {
            if (!merged.empty() && interval[0] <= merged.back()[1]) {
                merged.back()[1] = max(merged.back()[1], interval[1]);
            } else {
                merged.push_back(interval);
            }
        }
        return merged;
    }
};
"""

CPP["transpose-matrix"] = r"""
class Solution {
public:
    vector<vector<int>> transpose(vector<vector<int>>& matrix) {
        int rows = (int) matrix.size(), cols = (int) matrix[0].size();
        vector<vector<int>> out(cols, vector<int>(rows, 0));
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) out[c][r] = matrix[r][c];
        return out;
    }
};
"""

CPP["valid-sudoku"] = r"""
class Solution {
public:
    bool isValidSudoku(vector<vector<char>>& board) {
        bool rows[9][9] = {}, cols[9][9] = {}, boxes[9][9] = {};
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                char ch = board[r][c];
                if (ch == '.') continue;
                int digit = ch - '1';
                int box = (r / 3) * 3 + c / 3;
                if (rows[r][digit] || cols[c][digit] || boxes[box][digit]) return false;
                rows[r][digit] = cols[c][digit] = boxes[box][digit] = true;
            }
        }
        return true;
    }
};
"""

CPP["number-of-islands"] = r"""
class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        int count = 0;
        for (int r = 0; r < (int) grid.size(); r++)
            for (int c = 0; c < (int) grid[0].size(); c++)
                if (grid[r][c] == '1') { count++; sink(grid, r, c); }
        return count;
    }
    void sink(vector<vector<char>>& grid, int r, int c) {
        if (r < 0 || r >= (int) grid.size() || c < 0 || c >= (int) grid[0].size() || grid[r][c] != '1') return;
        grid[r][c] = '0';
        sink(grid, r + 1, c); sink(grid, r - 1, c); sink(grid, r, c + 1); sink(grid, r, c - 1);
    }
};
"""

CPP["valid-parentheses"] = r"""
class Solution {
public:
    bool isValid(string s) {
        stack<char> st;
        for (char ch : s) {
            if (ch == '(') st.push(')');
            else if (ch == '[') st.push(']');
            else if (ch == '{') st.push('}');
            else if (st.empty() || st.top() != ch) return false;
            else st.pop();
        }
        return st.empty();
    }
};
"""

CPP["group-anagrams"] = r"""
class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        map<string, vector<string>> groups;
        for (auto& word : strs) {
            string key = word;
            sort(key.begin(), key.end());
            groups[key].push_back(word);
        }
        vector<vector<string>> out;
        for (auto& entry : groups) out.push_back(entry.second);
        return out;
    }
};
"""

# ---------------------------------------------------------------------------
# Matrix definition: 40 priority problems + 2 extra shapes.
# bucket -> (slug, lang).  C++ runs are the 10 hard-type rows.
# ---------------------------------------------------------------------------

MATRIX = [
    # A. TreeNode (6) — 2 C++
    ("invert-binary-tree", "java", "TreeNode"),
    ("invert-binary-tree", "cpp", "TreeNode"),
    ("merge-two-binary-trees", "java", "TreeNode"),
    ("binary-tree-level-order-traversal", "java", "TreeNode"),
    ("binary-tree-level-order-traversal", "cpp", "TreeNode"),
    ("maximum-depth-of-binary-tree", "java", "TreeNode"),
    ("search-in-a-binary-search-tree", "java", "TreeNode"),
    ("binary-tree-inorder-traversal", "java", "TreeNode"),
    # B. ListNode (6) — 2 C++
    ("reverse-linked-list", "java", "ListNode"),
    ("reverse-linked-list", "cpp", "ListNode"),
    ("merge-two-sorted-lists", "java", "ListNode"),
    ("remove-duplicates-from-sorted-list", "java", "ListNode"),
    ("remove-linked-list-elements", "java", "ListNode"),
    ("middle-of-the-linked-list", "java", "ListNode"),
    ("add-two-numbers", "java", "ListNode"),
    ("add-two-numbers", "cpp", "ListNode"),
    # C. int[][] (5) — 2 C++
    ("merge-intervals", "java", "int[][]"),
    ("merge-intervals", "cpp", "int[][]"),
    ("transpose-matrix", "java", "int[][]"),
    ("transpose-matrix", "cpp", "int[][]"),
    ("flipping-an-image", "java", "int[][]"),
    ("image-smoother", "java", "int[][]"),
    ("matrix-cells-in-distance-order", "java", "int[][]"),
    # D. string / string[] (5) — 2 C++
    ("valid-parentheses", "java", "string/string[]"),
    ("valid-parentheses", "cpp", "string/string[]"),
    ("longest-common-prefix", "java", "string/string[]"),
    ("fizz-buzz", "java", "string/string[]"),
    ("group-anagrams", "java", "string/string[]"),
    ("group-anagrams", "cpp", "string/string[]"),
    ("add-strings", "java", "string/string[]"),
    # E. char[][] (4) — 2 C++
    ("valid-sudoku", "java", "char[][]"),
    ("valid-sudoku", "cpp", "char[][]"),
    ("number-of-islands", "java", "char[][]"),
    ("number-of-islands", "cpp", "char[][]"),
    ("minesweeper", "java", "char[][]"),
    ("rotating-the-box", "java", "char[][]"),
    # F. char[] (3)
    ("find-smallest-letter-greater-than-target", "java", "char[]"),
    ("string-compression", "java", "char[]"),
    ("best-poker-hand", "java", "char[]"),
    # G. double / float (2)
    ("median-of-two-sorted-arrays", "java", "double/float"),
    ("convert-the-temperature", "java", "double/float"),
    # H. long (2)
    ("minimum-garden-perimeter-to-collect-enough-apples", "java", "long"),
    ("number-of-wonderful-substrings", "java", "long"),
    # I. boolean (2)
    ("palindrome-number", "java", "boolean"),
    ("valid-anagram", "java", "boolean"),
    # J. int (2)
    ("climbing-stairs", "java", "int"),
    ("length-of-last-word", "java", "int"),
    # K. unordered mode (3)
    ("two-sum", "java", "unordered"),
    ("binary-watch", "java", "unordered"),
    ("find-common-characters", "java", "unordered"),
    # L. extra shape coverage beyond the 40 (item 1: every type)
    ("kids-with-the-greatest-number-of-candies", "java", "boolean[]"),
    ("sum-of-distances", "java", "long[]"),
]

# Wrong answers: each must be rejected, on a case the script names.
NEGATIVE = [
    ("two-sum", "java", r"""
class Solution {
    public int[] twoSum(int[] nums, int target) { return new int[]{0, 0}; }
}
"""),
    ("invert-binary-tree", "java", r"""
class Solution {
    public TreeNode invertTree(TreeNode root) { return root; }
}
"""),
    ("valid-parentheses", "java", r"""
class Solution {
    public boolean isValid(String s) { return true; }
}
"""),
    ("add-two-numbers", "java", r"""
class Solution {
    public ListNode addTwoNumbers(ListNode l1, ListNode l2) { return l1; }
}
"""),
    ("median-of-two-sorted-arrays", "java", r"""
class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) { return 0.0; }
}
"""),
    ("valid-sudoku", "java", r"""
class Solution {
    public boolean isValidSudoku(char[][] board) { return true; }
}
"""),
]

COMPILE_ERROR = (
    "climbing-stairs",
    "java",
    r"""
class Solution {
    public int climbStairs(int n) {
        return n +;   // deliberate syntax error
    }
}
""",
)

# ---------------------------------------------------------------------------
# Synthetic edge probes (sent with a full problem object, no dataset write)
# ---------------------------------------------------------------------------


def edge_probes() -> list[dict]:
    probes: list[dict] = []

    def add(name, lang, signature, tests, code, expectation, why):
        probes.append({
            "name": name,
            "lang": lang,
            "expect": expectation,  # "pass" = judge should accept it
            "why": why,
            "problem": {
                "slug": "edge-probe-" + name,
                "judge": {
                    "mode": "exact",
                    "signature": signature,
                    "tests": tests,
                },
            },
            "code": code,
        })

    add(
        "cpp-bool-vector",
        "cpp",
        {"name": "f", "params": [], "return": "boolean[]"},
        [{"args": [], "expected": "[true,false,true]", "example": 1}],
        r"""
class Solution {
public:
    vector<bool> f() { return {true, false, true}; }
};
""",
        "pass",
        "C++ boolean[] return must serialize as [true,false,true], not [1,0,1]",
    )
    add(
        "java-char-quote-param",
        "java",
        {"name": "f", "params": [{"name": "c", "type": "char"}], "return": "char"},
        [{"args": ["\"'\""], "expected": "\"y\"", "example": 1}],
        r"""
class Solution {
    public char f(char c) { return 'y'; }
}
""",
        "pass",
        "single-quote char argument must become a valid Java char literal",
    )
    add(
        "java-char-backslash-param",
        "java",
        {"name": "f", "params": [{"name": "c", "type": "char"}], "return": "char"},
        [{"args": ["\"\\\\\""], "expected": "\"y\"", "example": 1}],
        r"""
class Solution {
    public char f(char c) { return 'y'; }
}
""",
        "pass",
        "backslash char argument must become a valid Java char literal",
    )
    add(
        "cpp-char-quote-param",
        "cpp",
        {"name": "f", "params": [{"name": "c", "type": "char"}], "return": "char"},
        [{"args": ["\"'\""], "expected": "\"y\"", "example": 1}],
        r"""
class Solution {
public:
    char f(char c) { return 'y'; }
};
""",
        "pass",
        "single-quote char argument must become a valid C++ char literal",
    )
    add(
        "java-long-precision",
        "java",
        {"name": "f", "params": [{"name": "n", "type": "long"}], "return": "long"},
        [{"args": ["9007199254740993"], "expected": "9007199254740993", "example": 1}],
        r"""
class Solution {
    public long f(long n) { return n; }
}
""",
        "pass",
        "long args above 2^53 must not lose precision in JS->Java literal generation",
    )
    add(
        "cpp-long-precision",
        "cpp",
        {"name": "f", "params": [{"name": "n", "type": "long"}], "return": "long"},
        [{"args": ["9007199254740993"], "expected": "9007199254740993", "example": 1}],
        r"""
class Solution {
public:
    long long f(long long n) { return n; }
};
""",
        "pass",
        "long args above 2^53 must not lose precision in JS->C++ literal generation",
    )
    add(
        "java-negative-zero",
        "java",
        {"name": "f", "params": [], "return": "double"},
        [{"args": [], "expected": "0.00000", "example": 1}],
        r"""
class Solution {
    public double f() { return -0.0; }
}
""",
        "pass",
        "float mode must treat -0.0 as 0.0",
    )
    add(
        "java-string-whitespace",
        "java",
        {"name": "f", "params": [], "return": "string"},
        [{"args": [], "expected": "\"a b\"", "example": 1}],
        r"""
class Solution {
    public String f() { return "ab"; }
}
""",
        "fail",
        "exact mode must not accept \"ab\" when the expected string is \"a b\"",
    )
    add(
        "java-unordered-structure",
        "java",
        {"name": "f", "params": [], "return": "int[][]"},
        [{"args": [], "expected": "[[1,2],[3,4]]", "example": 1}],
        r"""
class Solution {
    public int[][] f() { return new int[][]{{1,2,3,4}}; }
}
""",
        "fail",
        "unordered mode must not flatten [[1,2],[3,4]] into a single row",
    )
    add(
        "java-stray-stdout",
        "java",
        {"name": "f", "params": [{"name": "n", "type": "int"}], "return": "int"},
        [{"args": ["1"], "expected": "3", "example": 1}],
        r"""
class Solution {
    public int f(int n) { System.out.println(999); return 3; }
}
""",
        "pass",
        "stray user stdout inside a case must not desynchronise the @@CASE result",
    )
    add(
        "java-empty-array",
        "java",
        {"name": "f", "params": [], "return": "int[]"},
        [{"args": [], "expected": "[]", "example": 1}],
        r"""
class Solution {
    public int[] f() { return new int[]{}; }
}
""",
        "pass",
        "empty array output must compare equal to []",
    )
    add(
        "java-null-tree",
        "java",
        {"name": "f", "params": [], "return": "TreeNode"},
        [{"args": [], "expected": "[]", "example": 1}],
        r"""
class Solution {
    public TreeNode f() { return null; }
}
""",
        "pass",
        "null TreeNode output must serialize as []",
    )
    long_values = list(range(2000))
    add(
        "java-long-output",
        "java",
        {"name": "f", "params": [], "return": "int[]"},
        [{"args": [], "expected": json.dumps(long_values), "example": 1}],
        r"""
class Solution {
    public int[] f() {
        int[] out = new int[2000];
        for (int i = 0; i < 2000; i++) out[i] = i;
        return out;
    }
}
""",
        "pass",
        "2000-element output (about 10 KB) must not be truncated",
    )
    return probes


# ---------------------------------------------------------------------------
# Dataset inspection + HTTP
# ---------------------------------------------------------------------------


def load_dataset() -> dict[str, dict]:
    problems: dict[str, dict] = {}
    for path in sorted(DATA_DIR.glob("shard-*.json")):
        with path.open("r", encoding="utf-8") as fh:
            shard = json.load(fh)
        for problem in shard.get("problems", []):
            problems[problem["slug"]] = problem
    return problems


def post_judge(payload: dict, timeout: float = 180.0) -> dict:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        BASE + "/judge", data=body,
        headers={"content-type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def health() -> dict:
    with urllib.request.urlopen(BASE + "/health", timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


def describe_failure(result: dict) -> str:
    compile_info = result.get("compile") or {}
    if compile_info and compile_info.get("ok") is False:
        stderr = (compile_info.get("stderr") or "").strip().splitlines()
        first = next((line for line in stderr if line.strip()), "compile failed")
        return f"COMPILE FAIL: {first[:150]}"
    cases = result.get("cases") or []
    for case in cases:
        if not case.get("ok"):
            expected = str(case.get("expected", ""))[:70]
            got = str(case.get("got", ""))[:70]
            error = case.get("error")
            suffix = f" error={error[:80]}" if error else ""
            return (f"case {case.get('n')} expected={expected!r} got={got!r}{suffix}")
    if result.get("error"):
        return str(result["error"])[:150]
    return json.dumps(result)[:150]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    try:
        info = health()
    except Exception as exc:  # pragma: no cover
        print(f"FATAL: cannot reach {BASE}/health: {exc}")
        return 1
    print("judge server:", info.get("problems"), "problems;", info.get("judge"))

    problems = load_dataset()
    failures: list[str] = []
    rows: list[dict] = []

    # --- validate the matrix definition against the dataset before running ---
    seen = set()
    bucket_counts: dict[str, int] = {}
    for slug, lang, bucket in MATRIX:
        problem = problems.get(slug)
        if problem is None:
            failures.append(f"{slug}: not in plugin/data")
            continue
        if not problem.get("judge"):
            failures.append(f"{slug}: not judgeable in plugin/data")
        key = (slug, lang)
        if key in seen:
            failures.append(f"{slug}/{lang}: duplicate matrix row")
        seen.add(key)
        bucket_counts[bucket] = bucket_counts.get(bucket, 0) + 1

    priority_java = sum(1 for slug, lang, bucket in MATRIX
                        if lang == "java" and bucket not in ("boolean[]", "long[]"))
    cpp_rows = sum(1 for slug, lang, bucket in MATRIX if lang == "cpp")
    print(f"matrix: {len(MATRIX)} runs "
          f"({priority_java} priority Java + "
          f"{len(MATRIX) - priority_java} extra-shape Java + {cpp_rows} C++)")
    print("buckets:", dict(bucket_counts))
    if priority_java != 40:
        failures.append(f"expected 40 priority Java rows, got {priority_java}")
    if cpp_rows < 10:
        failures.append(f"expected >=10 C++ runs, got {cpp_rows}")
    if failures:
        print("MATRIX DEFINITION ERRORS:")
        for failure in failures:
            print("  -", failure)
        return 1

    # --- positive matrix ---
    print("\n=== POSITIVE MATRIX ===")
    print(f"{'bucket':<18} {'slug':<48} {'lang':<5} {'result':<6} detail")
    print("-" * 132)
    passes = 0
    for index, (slug, lang, bucket) in enumerate(MATRIX, 1):
        code = (JAVA if lang == "java" else CPP)[slug]
        started = time.time()
        try:
            result = post_judge({"lang": lang, "slug": slug, "code": code})
        except Exception as exc:  # pragma: no cover
            result = {"ok": False, "error": f"POST failed: {exc}"}
        elapsed = time.time() - started
        ok = bool(result.get("ok"))
        if ok:
            passes += 1
            compile_ms = ((result.get("compile") or {}).get("ms") or 0)
            detail = (f"{result.get('passed')}/{result.get('total')} cases, "
                      f"{result.get('mode')} mode, compile {compile_ms} ms, "
                      f"run {result.get('ms')} ms, wall {elapsed:.1f}s")
            print(f"{bucket:<18} {slug:<48} {lang:<5} {'PASS':<6} {detail}")
        else:
            detail = describe_failure(result)
            print(f"{bucket:<18} {slug:<48} {lang:<5} {'FAIL':<6} {detail}")
            failures.append(f"{slug}/{lang}: {detail}")
        rows.append({
            "kind": "positive", "slug": slug, "lang": lang, "bucket": bucket,
            "ok": ok, "passed": result.get("passed"),
            "total": result.get("total"), "mode": result.get("mode"),
            "detail": detail,
        })

    # --- negative controls ---
    print("\n=== NEGATIVE CONTROLS (must fail) ===")
    print(f"{'slug':<48} {'lang':<5} {'result':<6} detail")
    print("-" * 120)
    negative_ok = 0
    for slug, lang, code in NEGATIVE:
        result = post_judge({"lang": lang, "slug": slug, "code": code})
        compile_ok = (result.get("compile") or {}).get("ok")
        cases = result.get("cases") or []
        failing = [case for case in cases if not case.get("ok")]
        correct = (result.get("ok") is False and compile_ok is True
                   and len(failing) > 0 and (result.get("passed") or 0) < (result.get("total") or 0))
        if correct:
            negative_ok += 1
            first = failing[0]
            detail = (f"rejected on case {first.get('n')} "
                      f"(expected {str(first.get('expected'))[:60]!r}, "
                      f"got {str(first.get('got'))[:60]!r}), {result.get('passed')}/{result.get('total')} passed")
            print(f"{slug:<48} {lang:<5} {'PASS':<6} {detail}")
        else:
            detail = describe_failure(result) if compile_ok is not False else "compile unexpectedly failed"
            print(f"{slug:<48} {lang:<5} {'FAIL':<6} {detail}")
            failures.append(f"negative {slug}/{lang}: wrong answer was not rejected ({detail})")
        rows.append({"kind": "negative", "slug": slug, "lang": lang,
                     "ok": correct, "detail": detail})

    # --- compile error control ---
    print("\n=== COMPILE ERROR CONTROL (must fail to compile) ===")
    slug, lang, code = COMPILE_ERROR
    result = post_judge({"lang": lang, "slug": slug, "code": code})
    compile_info = result.get("compile") or {}
    compile_failed = (result.get("ok") is False and compile_info.get("ok") is False
                      and bool((compile_info.get("stderr") or "").strip()))
    if compile_failed:
        first_line = (compile_info.get("stderr") or "").strip().splitlines()[0]
        print(f"PASS  {slug}/{lang}: compile.ok=false, stderr={first_line[:110]!r}")
    else:
        print(f"FAIL  {slug}/{lang}: expected compile.ok=false, got {json.dumps(result)[:200]}")
        failures.append(f"compile-error control {slug}/{lang} did not fail")
    rows.append({"kind": "compile-error", "slug": slug, "lang": lang,
                 "ok": compile_failed, "detail": "compile.ok=false" if compile_failed else "unexpected"})

    # --- synthetic edge probes ---
    print("\n=== EDGE PROBES (synthetic judge specs) ===")
    edge_pass = 0
    edge_bugs: list[str] = []
    for probe in edge_probes():
        payload = {"lang": probe["lang"], "problem": probe["problem"], "code": probe["code"]}
        try:
            result = post_judge(payload)
        except Exception as exc:  # pragma: no cover
            result = {"ok": False, "error": f"POST failed: {exc}"}
        observed = bool(result.get("ok"))
        wanted = probe["expect"] == "pass"
        agrees = observed == wanted
        label = "PASS" if agrees else "BUG?"
        if agrees:
            edge_pass += 1
        else:
            edge_bugs.append(probe["name"])
        print(f"{label:<5} {probe['name']:<26} {probe['lang']:<5} "
              f"expected={probe['expect']:<5} observed={'pass' if observed else 'fail'}  "
              f"({probe['why']})")
        if not agrees:
            print(f"      detail: {describe_failure(result)}")
        rows.append({
            "kind": "edge", "name": probe["name"], "lang": probe["lang"],
            "expect": probe["expect"], "observed": "pass" if observed else "fail",
            "agrees": agrees, "detail": describe_failure(result),
            "payload": payload,
        })

    summary = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "matrixRuns": len(MATRIX),
        "matrixPassed": passes,
        "negativeRuns": len(NEGATIVE),
        "negativePassed": negative_ok,
        "edgeProbes": len(rows) - len(MATRIX) - len(NEGATIVE) - 1,
        "edgePassed": edge_pass,
        "edgeBugs": edge_bugs,
        "failures": failures,
        "rows": rows,
    }
    RESULTS_PATH.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

    print("\n" + "=" * 132)
    print(f"POSITIVE: {passes}/{len(MATRIX)} passed   "
          f"NEGATIVE: {negative_ok}/{len(NEGATIVE)} rejected   "
          f"COMPILE-ERROR: {'ok' if compile_failed else 'broken'}   "
          f"EDGE: {edge_pass}/{len(rows) - len(MATRIX) - len(NEGATIVE) - 1} as expected")
    if failures:
        print(f"FAILURES ({len(failures)}):")
        for failure in failures:
            print("  -", failure)
        return 1
    print("No matrix failures. Edge-probe disagreements (if any) are documented in tools/JUDGE_BUGS.md.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
