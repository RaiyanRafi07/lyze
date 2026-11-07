/**
 * Local judge for LeetCode Lab — compiles a solution with a generated harness and diffs
 * the printed output against the dataset's expected output.
 *
 * Supported: Java (javac/java) and C++ (g++). One isolated temp directory per run, hard
 * time limits, no network. Generated harnesses print "@@CASE n" markers so stray user
 * output cannot desynchronise the results.
 */
import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const MAX_OUTPUT = 200000
const COMPILE_TIMEOUT_MS = 25000
const RUN_TIMEOUT_MS = 8000

export function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const started = Date.now()
    let stdout = ''
    let stderr = ''
    let settled = false
    let child
    try {
      child = spawn(command, args, { windowsHide: true, ...(options.spawn || {}) })
    } catch (error) {
      resolve({ code: -1, stdout, stderr: 'spawn failed: ' + String((error && error.message) || error), ms: 0, spawnFailed: true })
      return
    }
    const finish = (value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }
    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL')
      } catch {
        /* ignore */
      }
      finish({ code: -1, stdout, stderr: stderr + '\n[judge: timed out]', ms: Date.now() - started, timedOut: true })
    }, options.timeoutMs || RUN_TIMEOUT_MS)

    child.stdout.on('data', (chunk) => {
      if (stdout.length < MAX_OUTPUT) stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      if (stderr.length < MAX_OUTPUT) stderr += chunk.toString()
    })
    child.on('error', (error) => finish({ code: -1, stdout, stderr: String((error && error.message) || error), ms: Date.now() - started, spawnFailed: true }))
    child.on('close', (code) => finish({ code, stdout, stderr, ms: Date.now() - started }))
  })
}

/* ---------------------------------------------------------------- literals */

function splitTopLevel(text) {
  const parts = []
  let depth = 0
  let quote = null
  let current = ''
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quote) {
      current += ch
      if (ch === '\\') {
        current += text[i + 1] || ''
        i += 1
      } else if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      current += ch
      continue
    }
    if (ch === '[' || ch === '{' || ch === '(') depth += 1
    if (ch === ']' || ch === '}' || ch === ')') depth -= 1
    if (ch === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  if (current.trim() !== '') parts.push(current.trim())
  return parts
}

export function parseLiteral(raw) {
  if (raw === null || raw === undefined) return null
  const text = String(raw).trim()
  if (text === '' || text === 'null' || text === 'None') return null
  if (text === 'true') return true
  if (text === 'false') return false
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).replace(/\\(.)/g, (_, ch) => (ch === 'n' ? '\n' : ch === 't' ? '\t' : ch))
  }
  if (text.startsWith('[') && text.endsWith(']')) {
    const inner = text.slice(1, -1).trim()
    if (inner === '') return []
    return splitTopLevel(inner).map((part) => parseLiteral(part))
  }
  const number = Number(text)
  return Number.isFinite(number) ? number : text
}

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function q(value) {
  return JSON.stringify(String(value ?? ''))
}

/* -------------------------------------------------------------------- Java */

const JAVA_LIST_NODE = `
class ListNode {
  int val;
  ListNode next;
  ListNode() {}
  ListNode(int val) { this.val = val; }
  ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}
`

const JAVA_TREE_NODE = `
class TreeNode {
  int val;
  TreeNode left;
  TreeNode right;
  TreeNode() {}
  TreeNode(int val) { this.val = val; }
  TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}
`

const JAVA_HELPERS = `
class __H {
  static ListNode __mkList(int[] values) {
    ListNode dummy = new ListNode(0);
    ListNode node = dummy;
    for (int value : values) { node.next = new ListNode(value); node = node.next; }
    return dummy.next;
  }
  static TreeNode __mkTree(String[] values) {
    if (values.length == 0 || values[0] == null || values[0].equals("null")) return null;
    TreeNode root = new TreeNode(Integer.parseInt(values[0]));
    java.util.ArrayDeque<TreeNode> queue = new java.util.ArrayDeque<>();
    queue.add(root);
    int index = 1;
    while (!queue.isEmpty() && index < values.length) {
      TreeNode node = queue.poll();
      if (index < values.length && values[index] != null && !values[index].equals("null")) { node.left = new TreeNode(Integer.parseInt(values[index])); queue.add(node.left); }
      index++;
      if (index < values.length && values[index] != null && !values[index].equals("null")) { node.right = new TreeNode(Integer.parseInt(values[index])); queue.add(node.right); }
      index++;
    }
    return root;
  }
  static String __listOut(Object candidate) {
    ListNode head = (ListNode) candidate;
    StringBuilder out = new StringBuilder("[");
    ListNode node = head;
    int guard = 0;
    while (node != null && guard++ < 200000) {
      if (out.length() > 1) out.append(',');
      out.append(node.val);
      node = node.next;
    }
    return out.append(']').toString();
  }
  static String __treeOut(Object candidate) {
    TreeNode root = (TreeNode) candidate;
    java.util.List<String> out = new java.util.ArrayList<>();
    java.util.ArrayDeque<TreeNode> queue = new java.util.ArrayDeque<>();
    if (root != null) queue.add(root);
    while (!queue.isEmpty()) {
      TreeNode node = queue.poll();
      if (node == null) { out.add("null"); continue; }
      out.add(String.valueOf(node.val));
      queue.add(node.left);
      queue.add(node.right);
    }
    while (out.size() > 0 && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
    return "[" + String.join(",", out) + "]";
  }

  /* Reflective serializer: a LeetCode signature may declare int[][], but the solution can
     legitimately return List<List<Integer>>; recursive descent handles arrays, collections
     and nested mixes of both, which Arrays.deepToString cannot. */
  static String __out(Object value) {
    return __str(value);
  }

  static String __str(Object value) {
    if (value == null) return "null";
    if (value instanceof ListNode) return __listOut(value);
    if (value instanceof TreeNode) return __treeOut(value);
    if (value instanceof String) return (String) value;
    if (value instanceof Character || value instanceof Boolean || value instanceof Number) return String.valueOf(value);
    try {
      if (value.getClass().isArray()) {
        int length = java.lang.reflect.Array.getLength(value);
        StringBuilder out = new StringBuilder("[");
        for (int i = 0; i < length; i++) {
          if (i > 0) out.append(',');
          out.append(__str(java.lang.reflect.Array.get(value, i)));
        }
        return out.append(']').toString();
      }
    } catch (Throwable ignored) { /* fall through */ }
    if (value instanceof java.util.Collection) {
      StringBuilder out = new StringBuilder("[");
      boolean first = true;
      for (Object item : (java.util.Collection<?>) value) {
        if (!first) out.append(',');
        first = false;
        out.append(__str(item));
      }
      return out.append(']').toString();
    }
    if (value instanceof java.util.Map) {
      StringBuilder out = new StringBuilder("{");
      boolean first = true;
      for (Object entryObject : ((java.util.Map<?, ?>) value).entrySet()) {
        java.util.Map.Entry<?, ?> entry = (java.util.Map.Entry<?, ?>) entryObject;
        if (!first) out.append(',');
        first = false;
        out.append(__str(entry.getKey())).append(':').append(__str(entry.getValue()));
      }
      return out.append('}').toString();
    }
    return String.valueOf(value);
  }
}
`

function javaLiteral(raw, type) {
  const value = parseLiteral(raw)
  switch (type) {
    case 'int':
      return String(Math.trunc(num(value)))
    case 'long':
      return String(Math.trunc(num(value))) + 'L'
    case 'double':
      return num(value) + 'd'
    case 'boolean':
      return value === true ? 'true' : 'false'
    case 'string':
      return q(value === null ? '' : value)
    case 'char':
      return "'" + String(value ?? ' ').replace(/\\/g, '\\\\').replace(/'/g, "\\'").slice(0, 1) + "'"
    case 'int[]':
    case 'long[]':
    case 'double[]':
      return 'new ' + type + '{' + (Array.isArray(value) ? value : []).map((item) => (type === 'long[]' ? String(Math.trunc(num(item))) + 'L' : String(num(item)))).join(', ') + '}'
    case 'boolean[]':
      return 'new boolean[]{' + (Array.isArray(value) ? value : []).map((item) => (item === true ? 'true' : 'false')).join(', ') + '}'
    case 'string[]':
      return 'new String[]{' + (Array.isArray(value) ? value : []).map((item) => q(item)).join(', ') + '}'
    case 'char[]':
      return 'new char[]{' + (Array.isArray(value) ? value : []).map((item) => "'" + String(item ?? ' ').slice(0, 1) + "'").join(', ') + '}'
    case 'int[][]':
      return 'new int[][]{' + (Array.isArray(value) ? value : []).map((row) => '{' + (Array.isArray(row) ? row : []).map((item) => String(Math.trunc(num(item)))).join(', ') + '}').join(', ') + '}'
    case 'char[][]':
      return 'new char[][]{' + (Array.isArray(value) ? value : []).map((row) => '{' + (Array.isArray(row) ? row : []).map((item) => "'" + String(item ?? ' ').slice(0, 1) + "'").join(', ') + '}').join(', ') + '}'
    case 'string[][]':
      return 'new String[][]{' + (Array.isArray(value) ? value : []).map((row) => '{' + (Array.isArray(row) ? row : []).map((item) => q(item)).join(', ') + '}').join(', ') + '}'
    case 'ListNode':
      return '__H.__mkList(new int[]{' + (Array.isArray(value) ? value : []).map((item) => String(Math.trunc(num(item)))).join(', ') + '})'
    case 'TreeNode':
      return '__H.__mkTree(new String[]{' + (Array.isArray(value) ? value : []).map((item) => (item === null || item === undefined ? 'null' : q(item))).join(', ') + '})'
    default:
      return 'null'
  }
}

function javaSerializeExpr(type, call) {
  if (type === 'void') return '"null"'
  // One reflective serializer handles arrays, collections, nested mixes, lists and trees.
  return '__H.__out(' + call + ')'
}

function stripComments(source) {
  return String(source || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

export function buildJavaSource(problem, code) {
  const signature = problem.judge.signature
  const tests = problem.judge.tests
  const userCode = String(code || '')
  const bare = stripComments(userCode)
  const hasOwnList = /\bclass\s+ListNode\b/.test(bare)
  const hasOwnTree = /\bclass\s+TreeNode\b/.test(bare)

  const cases = tests.map((test, index) => {
    const args = (test.args || []).map((raw, position) => javaLiteral(raw, (signature.params[position] || {}).type || 'int'))
    const call = '__s.' + signature.name + '(' + args.join(', ') + ')'
    if (signature.return === 'void') {
      return (
        '    System.out.println("@@CASE ' + index + '");\n' +
        '    try { ' + call + '; System.out.println("@@VOID"); }\n' +
        '    catch (Throwable __t) { System.out.println("@@ERR " + __t.getClass().getSimpleName() + ": " + String.valueOf(__t.getMessage())); }'
      )
    }
    return (
      '    System.out.println("@@CASE ' + index + '");\n' +
      '    try { System.out.println(' + javaSerializeExpr(signature.return, call) + '); }\n' +
      '    catch (Throwable __t) { System.out.println("@@ERR " + __t.getClass().getSimpleName() + ": " + String.valueOf(__t.getMessage())); }'
    )
  })

  const helpers = (hasOwnList ? '' : JAVA_LIST_NODE) + (hasOwnTree ? '' : JAVA_TREE_NODE) + (hasOwnList && hasOwnTree ? JAVA_HELPERS : JAVA_HELPERS)

  return (
    'import java.util.*;\nimport java.io.*;\n\n' +
    userCode +
    '\n\npublic class Main {\n  public static void main(String[] __args) throws Exception {\n' +
    '    Solution __s = new Solution();\n' +
    cases.join('\n') +
    '\n  }\n}\n' +
    helpers
  )
}

/* --------------------------------------------------------------------- C++ */

const CPP_NODES = `
struct ListNode { int val; ListNode *next; ListNode(): val(0), next(nullptr) {} ListNode(int x): val(x), next(nullptr) {} ListNode(int x, ListNode *n): val(x), next(n) {} };
struct TreeNode { int val; TreeNode *left; TreeNode *right; TreeNode(): val(0), left(nullptr), right(nullptr) {} TreeNode(int x): val(x), left(nullptr), right(nullptr) {} TreeNode(int x, TreeNode *l, TreeNode *r): val(x), left(l), right(r) {} };
`

const CPP_HELPERS = `
static ListNode* __mkList(std::vector<int> v) {
  ListNode dummy(0); ListNode* node = &dummy;
  for (int x : v) { node->next = new ListNode(x); node = node->next; }
  return dummy.next;
}
static TreeNode* __mkTree(std::vector<std::string> v) {
  if (v.empty() || v[0] == "null") return nullptr;
  TreeNode* root = new TreeNode(std::stoi(v[0]));
  std::deque<TreeNode*> q; q.push_back(root);
  size_t i = 1;
  while (!q.empty() && i < v.size()) {
    TreeNode* node = q.front(); q.pop_front();
    if (i < v.size() && v[i] != "null") { node->left = new TreeNode(std::stoi(v[i])); q.push_back(node->left); }
    i++;
    if (i < v.size() && v[i] != "null") { node->right = new TreeNode(std::stoi(v[i])); q.push_back(node->right); }
    i++;
  }
  return root;
}
static std::string __listOut(ListNode* head) {
  std::string out = "["; int guard = 0;
  while (head && guard++ < 200000) { if (out.size() > 1) out += ","; out += std::to_string(head->val); head = head->next; }
  return out + "]";
}
static std::string __treeOut(TreeNode* root) {
  std::vector<std::string> out; std::deque<TreeNode*> q;
  if (root) q.push_back(root);
  while (!q.empty()) {
    TreeNode* node = q.front(); q.pop_front();
    if (!node) { out.push_back("null"); continue; }
    out.push_back(std::to_string(node->val));
    q.push_back(node->left); q.push_back(node->right);
  }
  while (!out.empty() && out.back() == "null") out.pop_back();
  std::string joined;
  for (size_t i = 0; i < out.size(); i++) { if (i) joined += ","; joined += out[i]; }
  return "[" + joined + "]";
}
template <class T> static std::string __js(const T& v) { std::ostringstream o; o << v; return o.str(); }
static std::string __js(bool v) { return v ? "true" : "false"; }
static std::string __js(const std::string& v) { return v; }
static std::string __js(char v) { return std::string(1, v); }
static std::string __js(const char* v) { return v ? std::string(v) : "null"; }
template <class T> static std::string __js(const std::vector<T>& v) {
  std::string out = "[";
  for (size_t i = 0; i < v.size(); i++) { if (i) out += ","; out += __js(v[i]); }
  return out + "]";
}
static std::string __js(ListNode* node) { return __listOut(node); }
static std::string __js(TreeNode* node) { return __treeOut(node); }
`

function cppLiteral(raw, type) {
  const value = parseLiteral(raw)
  const vector = (items) => 'std::vector<' + (type === 'long[]' ? 'long long' : type === 'double[]' ? 'double' : type === 'boolean[]' ? 'bool' : type === 'char[]' ? 'char' : type === 'string[]' ? 'std::string' : 'int') + '>{' + items.join(', ') + '}'
  switch (type) {
    case 'int':
      return String(Math.trunc(num(value)))
    case 'long':
      return String(Math.trunc(num(value))) + 'LL'
    case 'double':
      return num(value)
    case 'boolean':
      return value === true ? 'true' : 'false'
    case 'string':
      return q(value === null ? '' : value)
    case 'char':
      return "'" + String(value ?? ' ').slice(0, 1) + "'"
    case 'int[]':
    case 'long[]':
    case 'double[]':
    case 'boolean[]':
    case 'char[]':
      return vector((Array.isArray(value) ? value : []).map((item) => (type === 'char[]' ? "'" + String(item ?? ' ').slice(0, 1) + "'" : type === 'boolean[]' ? (item === true ? 'true' : 'false') : String(num(item)))))
    case 'string[]':
      return 'std::vector<std::string>{' + (Array.isArray(value) ? value : []).map((item) => q(item)).join(', ') + '}'
    case 'int[][]':
      return 'std::vector<std::vector<int>>{' + (Array.isArray(value) ? value : []).map((row) => '{' + (Array.isArray(row) ? row : []).map((item) => String(Math.trunc(num(item)))).join(', ') + '}').join(', ') + '}'
    case 'char[][]':
      return 'std::vector<std::vector<char>>{' + (Array.isArray(value) ? value : []).map((row) => '{' + (Array.isArray(row) ? row : []).map((item) => "'" + String(item ?? ' ').slice(0, 1) + "'").join(', ') + '}').join(', ') + '}'
    case 'string[][]':
      return 'std::vector<std::vector<std::string>>{' + (Array.isArray(value) ? value : []).map((row) => '{' + (Array.isArray(row) ? row : []).map((item) => q(item)).join(', ') + '}').join(', ') + '}'
    case 'ListNode':
      return '__mkList(std::vector<int>{' + (Array.isArray(value) ? value : []).map((item) => String(Math.trunc(num(item)))).join(', ') + '})'
    case 'TreeNode':
      return '__mkTree(std::vector<std::string>{' + (Array.isArray(value) ? value : []).map((item) => (item === null || item === undefined ? '"null"' : q(item))).join(', ') + '})'
    default:
      return '0'
  }
}

export function buildCppSource(problem, code) {
  const signature = problem.judge.signature
  const tests = problem.judge.tests
  const userCode = String(code || '')
  const bare = stripComments(userCode)
  const hasOwnNodes = /\bstruct\s+(ListNode|TreeNode)\b/.test(bare)

  const cases = tests.map((test, index) => {
    const args = (test.args || []).map((raw, position) => cppLiteral(raw, (signature.params[position] || {}).type || 'int'))
    // Bind each argument to a named lvalue: solution signatures take `vector<int>&`, and a
    // temporary cannot bind to a non-const reference.
    const declarations = args.map((expression, position) => '    auto __a' + index + '_' + position + ' = ' + expression + ';')
    const call = '__s.' + signature.name + '(' + args.map((_, position) => '__a' + index + '_' + position).join(', ') + ')'
    if (signature.return === 'void') {
      return '  {\n' + declarations.join('\n') + '\n    std::cout << "@@CASE ' + index + '" << std::endl;\n    try { ' + call + '; std::cout << "@@VOID" << std::endl; } catch (const std::exception& e) { std::cout << "@@ERR " << e.what() << std::endl; }\n  }'
    }
    return '  {\n' + declarations.join('\n') + '\n    std::cout << "@@CASE ' + index + '" << std::endl;\n    try { std::cout << __js(' + call + ') << std::endl; } catch (const std::exception& e) { std::cout << "@@ERR " << e.what() << std::endl; }\n  }'
  })

  return (
    '#include <bits/stdc++.h>\nusing namespace std;\n\n' +
    (hasOwnNodes ? '' : CPP_NODES) +
    '\n' +
    userCode +
    '\n\n' +
    CPP_HELPERS +
    '\nint main() {\n  ios::sync_with_stdio(false);\n  Solution __s;\n' +
    cases.join('\n') +
    '\n  return 0;\n}\n'
  )
}

/* --------------------------------------------------------------- comparing */

function normalise(text) {
  return String(text ?? '').replace(/\s+/g, '')
}

function unquote(text) {
  return normalise(text).replace(/["']/g, '')
}

function topLevelTokens(text) {
  const value = String(text ?? '').trim()
  if (value.startsWith('[') && value.endsWith(']')) return splitTopLevel(value.slice(1, -1))
  return [value]
}

function sortedTokens(text) {
  return topLevelTokens(text).map((token) => normalise(token)).sort().join('|')
}

/**
 * Group-style answers ("return the groups in any order") also allow any order of members
 * inside a group, e.g. Group Anagrams. Only applied when every row is a list of strings,
 * so numeric answers such as permutations keep their inner order significant.
 */
function sortedGroups(text) {
  const tokens = topLevelTokens(text)
  if (tokens.length === 0) return ''
  const rows = tokens.map((token) => {
    const trimmed = String(token).trim()
    if (!(trimmed.startsWith('[') && trimmed.endsWith(']'))) return null
    const members = splitTopLevel(trimmed.slice(1, -1))
    return members.map((member) => normalise(member).replace(/["']/g, '')).sort().join(',')
  })
  if (rows.some((row) => row === null)) return ''
  return rows.sort().join('|')
}

function isStringGroupAnswer(text) {
  return /\["/.test(String(text ?? ''))
}

function numbersOf(text) {
  return (String(text ?? '').match(/-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/g) || []).map(Number)
}

/** True when `got` may be considered equal to `expected` under the problem's mode. */
export function outputsMatch(expected, got, mode) {
  const expectedText = String(expected ?? 'null')
  const gotText = String(got ?? 'null')
  const expectedNorm = normalise(expectedText)
  const gotNorm = normalise(gotText)
  if (expectedNorm === gotNorm) return true
  if (unquote(expectedText) === unquote(gotText)) return true

  const softMode = mode || 'exact'
  if (softMode === 'unordered') {
    if (sortedTokens(expectedText) === sortedTokens(gotText)) return true
    if (isStringGroupAnswer(expectedText)) {
      const expectedGroups = sortedGroups(expectedText)
      const gotGroups = sortedGroups(gotText)
      if (expectedGroups !== '' && expectedGroups === gotGroups) return true
    }
    const expectedNumbers = numbersOf(expectedText).sort((a, b) => a - b)
    const gotNumbers = numbersOf(gotText).sort((a, b) => a - b)
    if (expectedNumbers.length > 0 && expectedNumbers.length === gotNumbers.length) {
      return expectedNumbers.every((value, index) => Math.abs(value - gotNumbers[index]) < 1e-9)
    }
  }
  if (softMode === 'float') {
    const expectedNumbers = numbersOf(expectedText)
    const gotNumbers = numbersOf(gotText)
    if (expectedNumbers.length === gotNumbers.length && expectedNumbers.length > 0) {
      return expectedNumbers.every((value, index) => Math.abs(value - gotNumbers[index]) <= 1e-5 * Math.max(1, Math.abs(value)))
    }
  }
  return false
}

/* ------------------------------------------------------------------- judge */

function parseRunOutput(stdout, total) {
  const lines = String(stdout || '').split(/\r?\n/)
  const cases = new Array(total).fill(null)
  for (let i = 0; i < lines.length; i += 1) {
    const match = /^@@CASE (\d+)$/.exec(lines[i].trim())
    if (!match) continue
    const index = Number(match[1])
    let value = ''
    for (let j = i + 1; j < lines.length; j += 1) {
      if (/^@@CASE \d+$/.test(lines[j].trim())) break
      if (lines[j].trim() !== '') {
        value = lines[j].trim()
        break
      }
    }
    cases[index] = value
  }
  return cases
}

export async function judgeProblem(problem, lang, code) {
  if (!problem || !problem.judge || !problem.judge.signature) {
    return { ok: false, error: 'no judge spec for this problem', mode: 'any' }
  }
  const judge = problem.judge
  const total = (judge.tests || []).length
  if (total === 0) return { ok: false, error: 'no test cases', mode: judge.mode || 'exact' }

  const dir = await mkdtemp(join(tmpdir(), 'lclab-'))
  try {
    let compile
    let run
    if (lang === 'cpp') {
      await writeFile(join(dir, 'main.cpp'), buildCppSource(problem, code), 'utf8')
      compile = await runProcess('g++', ['-std=gnu++20', '-O2', '-o', 'main.exe', 'main.cpp'], { timeoutMs: COMPILE_TIMEOUT_MS, spawn: { cwd: dir } })
      if (compile.code !== 0) {
        return { ok: false, mode: judge.mode || 'exact', compile: { ok: false, ms: compile.ms, stderr: compile.stderr || compile.stdout }, cases: [], passed: 0, total }
      }
      run = await runProcess(join(dir, 'main.exe'), [], { timeoutMs: RUN_TIMEOUT_MS, spawn: { cwd: dir } })
    } else {
      await writeFile(join(dir, 'Main.java'), buildJavaSource(problem, code), 'utf8')
      compile = await runProcess('javac', ['-encoding', 'UTF-8', 'Main.java'], { timeoutMs: COMPILE_TIMEOUT_MS, spawn: { cwd: dir } })
      if (compile.code !== 0) {
        return { ok: false, mode: judge.mode || 'exact', compile: { ok: false, ms: compile.ms, stderr: compile.stderr || compile.stdout }, cases: [], passed: 0, total }
      }
      run = await runProcess('java', ['-cp', dir, 'Main'], { timeoutMs: RUN_TIMEOUT_MS, spawn: { cwd: dir } })
    }

    const outputs = parseRunOutput(run.stdout, total)
    const cases = (judge.tests || []).map((test, index) => {
      const got = outputs[index]
      const errorLine = got !== null && String(got).startsWith('@@ERR') ? String(got).slice(6).trim() : null
      const ok = errorLine === null && got !== null && outputsMatch(test.expected, got, judge.mode)
      return {
        n: test.example || index + 1,
        expected: String(test.expected ?? ''),
        got: errorLine !== null ? '' : got === null ? '<no output>' : String(got),
        ok,
        error: errorLine || (got === null ? 'solution printed nothing for this case' : null),
        args: test.args || [],
      }
    })
    if (run.timedOut) {
      return { ok: false, mode: judge.mode || 'exact', compile: { ok: true, ms: compile.ms, stderr: '' }, cases, passed: 0, total, error: 'time limit exceeded' }
    }
    const passed = cases.filter((entry) => entry.ok).length
    return {
      ok: passed === total,
      mode: judge.mode || 'exact',
      compile: { ok: true, ms: compile.ms, stderr: compile.stderr && compile.stderr.trim() ? compile.stderr : '' },
      cases,
      passed,
      total,
      ms: run.ms,
      stderr: run.stderr && run.stderr.trim() ? run.stderr.slice(0, 4000) : '',
    }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
