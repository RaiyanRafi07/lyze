/**
 * Local judge for LeetCode Lab — compiles a solution with a generated harness and diffs
 * the printed output against the dataset's expected output.
 *
 * Supported: Java (javac/java) and C++ (g++). One isolated temp directory per run, hard
 * time limits. This local runner is not an OS/network sandbox. Generated harnesses print "@@CASE n" markers so stray user
 * output cannot desynchronise the results.
 */
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
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

const JAVA_GRAPH_NODE = `
class Node {
  public int val;
  public java.util.List<Node> neighbors;
  public Node() {
    val = 0;
    neighbors = new java.util.ArrayList<Node>();
  }
  public Node(int _val) {
    val = _val;
    neighbors = new java.util.ArrayList<Node>();
  }
  public Node(int _val, java.util.ArrayList<Node> _neighbors) {
    val = _val;
    neighbors = _neighbors;
  }
}
`

// Copy-list-with-random-pointer scoped Node (additive, no graph touch):
// live graph Node is {val,neighbors}; random-pointer Node is {val,next,random}.
// Same simple name `Node` cannot serve both shapes in one compilation, so this
// random shape is emitted ONLY for the copy slug branch below (which never
// includes JAVA_GRAPH_NODE or the graph helpers inside JAVA_HELPERS).
const JAVA_RANDOM_NODE = `
class Node {
  int val;
  Node next;
  Node random;
  Node() {}
  Node(int val) { this.val = val; }
  Node(int val, Node next, Node random) { this.val = val; this.next = next; this.random = random; }
}
`

// Self-contained random helpers (additive, separate class __HR so the shared
// __H graph helpers are never compiled against the random Node shape).
const JAVA_RANDOM_HELPERS = `
class __HR {
  static Node __mkRandom(int[] values, String[] rnds) {
    if (values.length == 0) return null;
    Node[] nodes = new Node[values.length];
    for (int i = 0; i < values.length; i++) nodes[i] = new Node(values[i]);
    for (int i = 0; i + 1 < values.length; i++) nodes[i].next = nodes[i + 1];
    for (int i = 0; i < values.length; i++) {
      String r = rnds[i];
      if (r != null && !r.equals("null")) {
        try { int idx = Integer.parseInt(r); if (idx >= 0 && idx < values.length) nodes[i].random = nodes[idx]; } catch (NumberFormatException ignored) {}
      }
    }
    return nodes[0];
  }
  static String __randomOut(Object candidate) {
    Node head = (Node) candidate;
    java.util.List<Node> order = new java.util.ArrayList<>();
    java.util.Map<Node, Integer> index = new java.util.IdentityHashMap<>();
    Node node = head;
    int guard = 0;
    while (node != null && guard++ < 200000) {
      if (index.containsKey(node)) break;
      index.put(node, order.size());
      order.add(node);
      node = node.next;
    }
    StringBuilder out = new StringBuilder("[");
    for (int i = 0; i < order.size(); i++) {
      if (i > 0) out.append(',');
      Node nd = order.get(i);
      out.append('[').append(nd.val).append(',');
      if (nd.random == null) out.append("null");
      else { Integer idx = index.get(nd.random); out.append(idx == null ? "null" : String.valueOf(idx)); }
      out.append(']');
    }
    return out.append(']').toString();
  }
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
  // A null ListNode IS the empty list (LeetCode list equality); datasets expect [].
  static String __outList(Object value) {
    if (value == null) return "[]";
    return __out(value);
  }
  static String __treeOut(Object candidate) {
    TreeNode root = (TreeNode) candidate;
    java.util.List<String> out = new java.util.ArrayList<>();
    java.util.LinkedList<TreeNode> queue = new java.util.LinkedList<>();
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
  // Graph helpers (Clone Graph): build from adjList literal, serialize via BFS,
  // and verify deep-copy identity (no shared references, all clones distinct).
  static Node __mkGraph(int[][] adj) {
    if (adj == null) return null;
    if (adj.length == 0) return null;
    java.util.Map<Integer, Node> nodes = new java.util.HashMap<>();
    for (int i = 0; i < adj.length; i++) nodes.put(i + 1, new Node(i + 1));
    for (int i = 0; i < adj.length; i++) {
      Node node = nodes.get(i + 1);
      if (adj[i] != null) {
        for (int v : adj[i]) {
          Node nb = nodes.get(v);
          if (nb != null) node.neighbors.add(nb);
        }
      }
    }
    return nodes.get(1);
  }
  static String __graphOut(Node entry, int count) {
    if (entry == null) return "[]";
    java.util.Map<Node, Integer> index = new java.util.IdentityHashMap<>();
    java.util.ArrayDeque<Node> queue = new java.util.ArrayDeque<>();
    queue.add(entry);
    index.put(entry, 1);
    int next = 2;
    java.util.List<java.util.List<Integer>> adj = new java.util.ArrayList<>();
    adj.add(null);
    while (!queue.isEmpty()) {
      Node node = queue.poll();
      int id = index.get(node);
      while (adj.size() <= id) adj.add(new java.util.ArrayList<Integer>());
      if (node.neighbors != null) {
        for (Node nb : node.neighbors) {
          if (nb == null) continue;
          Integer known = index.get(nb);
          if (known == null) { known = next++; index.put(nb, known); queue.add(nb); }
          adj.get(id).add(known);
        }
      }
    }
    // Canonical val-based rows: clones preserve val, so row i lists neighbor
    // VALS of the clone with val == i. Stable across BFS discovery orders.
    java.util.Map<Integer, Node> byVal = new java.util.HashMap<>();
    java.util.ArrayDeque<Node> qv = new java.util.ArrayDeque<>(queue);
    byVal.put(entry.val, entry);
    java.util.Set<Node> seenV = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<Node, Boolean>());
    seenV.add(entry);
    java.util.ArrayDeque<Node> qb = new java.util.ArrayDeque<>();
    qb.add(entry);
    while (!qb.isEmpty()) {
      Node cur = qb.poll();
      byVal.put(cur.val, cur);
      if (cur.neighbors != null) for (Node nb : cur.neighbors) if (nb != null && seenV.add(nb)) qb.add(nb);
    }
    StringBuilder out = new StringBuilder("[");
    for (int id = 1; id <= count; id++) {
      if (id > 1) out.append(',');
      out.append('[');
      Node node = byVal.get(id);
      if (node != null && node.neighbors != null) {
        boolean first = true;
        for (Node nb : node.neighbors) {
          if (nb == null) continue;
          if (!first) out.append(',');
          first = false;
          out.append(nb.val);
        }
      }
      out.append(']');
    }
    return out.append(']').toString();
  }
  static String __graphIdentityError(Node input, Node output, int count) {
    if (count == 0) return output == null ? null : "non-null result for empty graph";
    if (output == null) return "null result for non-empty graph";
    java.util.Set<Node> inSet = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<Node, Boolean>());
    java.util.ArrayDeque<Node> q = new java.util.ArrayDeque<>();
    if (input != null) { q.add(input); inSet.add(input); }
    while (!q.isEmpty()) {
      Node node = q.poll();
      if (node.neighbors != null) for (Node nb : node.neighbors) {
        if (nb != null && inSet.add(nb)) q.add(nb);
      }
    }
    java.util.Set<Node> outSet = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<Node, Boolean>());
    java.util.ArrayDeque<Node> q2 = new java.util.ArrayDeque<>();
    q2.add(output); outSet.add(output);
    while (!q2.isEmpty()) {
      Node node = q2.poll();
      if (inSet.contains(node)) return "shallow copy: result shares a node with the input";
      if (node.neighbors != null) for (Node nb : node.neighbors) {
        if (nb != null && outSet.add(nb)) q2.add(nb);
      }
    }
    if (outSet.size() != count) return "node count " + outSet.size() + " != input " + count + " (duplicated or dropped clones)";
    return null;
  }
  // Linked-list cycle fixture builder (additive, no Node involved): pos is
  // harness-only, tail.next -> node[pos], -1 = acyclic.
  static ListNode __mkCycle(int[] values, int pos) {
    ListNode head = __mkList(values);
    if (pos < 0 || head == null) return head;
    ListNode tail = head;
    ListNode target = null;
    int i = 0;
    while (tail != null) {
      if (i == pos) target = tail;
      if (tail.next == null) break;
      tail = tail.next;
      i++;
    }
    if (target != null) tail.next = target;
    return head;
  }
  // LCA-BST value bridge (additive, no Node involved): fixtures pass p,q as
  // int VALUES, solution keeps official (TreeNode,TreeNode)->TreeNode shape.
  static TreeNode __findTree(TreeNode root, int value) {
    if (root == null) return null;
    java.util.ArrayDeque<TreeNode> queue = new java.util.ArrayDeque<>();
    queue.add(root);
    while (!queue.isEmpty()) {
      TreeNode n = queue.poll();
      if (n.val == value) return n;
      if (n.left != null) queue.add(n.left);
      if (n.right != null) queue.add(n.right);
    }
    return null;
  }
  static String __valStr(TreeNode node) {
    return node == null ? "null" : String.valueOf(node.val);
  }

  /* Reflective serializer: a LeetCode signature may declare int[][], but the solution can
     legitimately return List<List<Integer>>; recursive descent handles arrays, collections
     and nested mixes of both, which Arrays.deepToString cannot. */
  static String __out(Object value) {
    return __str(value);
  }

  static String __quote(String value) {
    StringBuilder out = new StringBuilder(); out.append((char)34);
    for (int i = 0; i < value.length(); i++) {
      char ch = value.charAt(i);
      if (ch == 34 || ch == 92) out.append((char)92).append(ch);
      else if (ch < 32) out.append((char)92).append('u').append(String.format("%04x", (int)ch));
      else out.append(ch);
    }
    return out.append((char)34).toString();
  }

  static String __str(Object value) {
    if (value == null) return "null";
    if (value instanceof ListNode) return __listOut(value);
    if (value instanceof TreeNode) return __treeOut(value);
    if (value instanceof String || value instanceof Character) return __quote(String.valueOf(value));
    if (value instanceof Boolean || value instanceof Number) return String.valueOf(value);
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
    case 'ListNode[]': {
      const lists = Array.isArray(value) ? value : []
      const parts = lists.map((row) => {
        const items = Array.isArray(row) ? row : []
        return '__H.__mkList(new int[]{' + items.map((item) => String(Math.trunc(num(item)))).join(', ') + '})'
      })
      return 'new ListNode[]{' + parts.join(', ') + '}'
    }
    case 'TreeNode':
      return '__H.__mkTree(new String[]{' + (Array.isArray(value) ? value : []).map((item) => (item === null || item === undefined ? 'null' : q(item))).join(', ') + '})'
    case 'Node':
      return '__H.__mkGraph(new int[][]{' + (Array.isArray(value) ? value : []).map((row) => '{' + (Array.isArray(row) ? row : []).map((item) => String(Math.trunc(num(item)))).join(', ') + '}').join(', ') + '})'
    default:
      return 'null'
  }
}

function javaSerializeExpr(type, call) {
  if (type === 'void') return '"null"'
  // A null ListNode IS the empty list; route ListNode returns through the
  // null-aware serializer so empty results compare as [] like the C++ side.
  if (type === 'ListNode') return '__H.__outList(' + call + ')'
  // A null TreeNode IS the empty tree; same null-aware routing so missing
  // subtrees compare as [] on both sides (C++ __treeOut already yields []).
  if (type === 'TreeNode') return '__H.__outList(' + call + ')'
  if (type === 'Node') return '__H.__graphOut(' + call + ', -1)'
  // One reflective serializer handles arrays, collections, nested mixes, lists and trees.
  return '__H.__out(' + call + ')'
}

function javaMutatedSerializeExpr(type, variable) {
  if (type === 'Node') return '__H.__graphOut(' + variable + ', -1)'
  if (type === 'ListNode' || type === 'TreeNode') return '__H.__outList(' + variable + ')'
  return '__H.__out(' + variable + ')'
}

function stripComments(source) {
  return String(source || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

function javaType(type) {
  switch (type) {
    case 'int': return 'int'
    case 'long': return 'long'
    case 'double': return 'double'
    case 'boolean': return 'boolean'
    case 'string': return 'String'
    case 'char': return 'char'
    case 'int[]': return 'int[]'
    case 'long[]': return 'long[]'
    case 'double[]': return 'double[]'
    case 'boolean[]': return 'boolean[]'
    case 'string[]': return 'String[]'
    case 'char[]': return 'char[]'
    case 'int[][]': return 'int[][]'
    case 'char[][]': return 'char[][]'
    case 'string[][]': return 'String[][]'
    case 'ListNode': return 'ListNode'
    case 'ListNode[]': return 'ListNode[]'
    case 'TreeNode': return 'TreeNode'
    case 'Node': return 'Node'
    default: return 'Object'
  }
}

function graphCount(rawAdj) {
  try {
    const value = parseLiteral(rawAdj)
    return Array.isArray(value) ? value.length : 0
  } catch { return 0 }
}

function javaSerializeExprInline(type, call) {
  return javaSerializeExpr(type, call)
}

export function buildJavaSource(problem, code, resultMarker = '@@LC_RESULT') {
  const signature = problem.judge.signature
  const tests = problem.judge.tests
  const userCode = String(code || '')
  const bare = stripComments(userCode)
  const hasOwnList = /\bclass\s+ListNode\b/.test(bare)
  const hasOwnTree = /\bclass\s+TreeNode\b/.test(bare)
  // Word Ladder's original Java starter takes a List while the stored test
  // arguments use the same string-array representation as the C++ judge.
  const wordLadderList = problem.slug === 'word-ladder' &&
    /\bint\s+ladderLength\s*\([^,]+,[^,]+,\s*(?:final\s+)?(?:java\.util\.)?List\s*<\s*(?:java\.lang\.)?String\s*>\s+\w+\s*\)/.test(bare)
  const hasOwnNode = /\bclass\s+Node\b/.test(bare)
  const mutates = Array.isArray(problem.judge.mutates) ? problem.judge.mutates : []
  // Encode-and-decode-strings: generic round-trip branch (additive). Only this
  // slug carries judge.decode + codecClass; every other problem keeps the
  // existing generic void/Node/exact path byte-for-byte.
  const decode = problem.judge.decode && problem.judge.decode.name ? problem.judge.decode : null
  const codecClass = problem.judge.codecClass || 'Codec'
  // Linked-list-cycle: fixture carries harness-only pos (tail wiring), the
  // solution takes only head. Staged spec shape: hasCycle(ListNode,int)->boolean.
  if (problem.slug === 'linked-list-cycle') {
    const cases = tests.map((test, index) => {
      const vals = parseLiteral(test.args[0])
      const pos = Math.trunc(num(parseLiteral(test.args[1])))
      const litVals = 'new int[]{' + (Array.isArray(vals) ? vals : []).map((v) => String(Math.trunc(num(v)))).join(', ') + '}'
      const inst = '__s' + index
      return (
        '    System.out.println("@@CASE ' + index + '");\n' +
        '    try { ListNode __h' + index + ' = __H.__mkCycle(' + litVals + ', ' + pos + '); Solution ' + inst + ' = new Solution(); boolean __b = ' + inst + '.' + signature.name + '(__h' + index + '); System.out.println("\\n' + resultMarker + ' ' + index + ' " + (__b ? "true" : "false")); }\n' +
        '    catch (Throwable __t) { System.out.println("\\n' + resultMarker + ' ' + index + ' @@ERR " + __t.getClass().getSimpleName() + ": " + String.valueOf(__t.getMessage())); }'
      )
    })
    const helpers = (hasOwnList ? '' : JAVA_LIST_NODE) + (hasOwnTree ? '' : JAVA_TREE_NODE) + (hasOwnNode ? '' : JAVA_GRAPH_NODE) + JAVA_HELPERS
    return (
      'import java.util.*;\nimport java.io.*;\n\n' +
      userCode +
      '\n\npublic class Main {\n  public static void main(String[] __args) throws Exception {\n' +
      cases.join('\n') +
      '\n  }\n}\n' +
      helpers
    )
  }
  // Copy-list-with-random-pointer: scoped random Node shape, deep-copy +
  // input-unanimity checks. Emits ONLY list/tree + random Node/helpers;
  // never JAVA_GRAPH_NODE nor JAVA_HELPERS (graph helpers reference
  // neighbors and would not compile against {val,next,random}).
  if (problem.slug === 'copy-list-with-random-pointer') {
    const cases = tests.map((test, index) => {
      const pairs = parseLiteral(test.args[0] || '[]')
      const rows = Array.isArray(pairs) ? pairs : []
      const vals = rows.map((p) => (Array.isArray(p) ? String(Math.trunc(num(p[0]))) : '0'))
      const rnds = rows.map((p) => {
        if (!Array.isArray(p) || p[1] === null || p[1] === undefined) return 'null'
        if (typeof p[1] === 'number') return String(Math.trunc(p[1]))
        const t = String(p[1]).trim()
        return t === '' || t.toLowerCase() === 'null' ? 'null' : t
      })
      const lit = '__HR.__mkRandom(new int[]{' + vals.join(', ') + '}, new String[]{' + rnds.map((r) => q(r)).join(', ') + '})'
      const inst = '__s' + index
      return (
        '    System.out.println("@@CASE ' + index + '");\n' +
        '    try { Node __h' + index + ' = ' + lit + '; String __before' + index + ' = __HR.__randomOut(__h' + index + '); Solution ' + inst + ' = new Solution(); Node __r' + index + ' = ' + inst + '.' + signature.name + '(__h' + index + ');\n' +
        '    if (__r' + index + ' == __h' + index + ' && __h' + index + ' != null) { System.out.println("\\n' + resultMarker + ' ' + index + ' @@ERR not a deep copy: returned the input list"); }\n' +
        '    else if (!__HR.__randomOut(__h' + index + ').equals(__before' + index + ')) { System.out.println("\\n' + resultMarker + ' ' + index + ' @@ERR mutated input list"); }\n' +
        '    else { String __value = __HR.__randomOut(__r' + index + '); System.out.println("\\n' + resultMarker + ' ' + index + ' " + __value); } }\n' +
        '    catch (Throwable __t) { System.out.println("\\n' + resultMarker + ' ' + index + ' @@ERR " + __t.getClass().getSimpleName() + ": " + String.valueOf(__t.getMessage())); }'
      )
    })
    const helpers = (hasOwnList ? '' : JAVA_LIST_NODE) + (hasOwnTree ? '' : JAVA_TREE_NODE) + (hasOwnNode ? '' : JAVA_RANDOM_NODE) + JAVA_RANDOM_HELPERS
    return (
      'import java.util.*;\nimport java.io.*;\n\n' +
      userCode +
      '\n\npublic class Main {\n  public static void main(String[] __args) throws Exception {\n' +
      cases.join('\n') +
      '\n  }\n}\n' +
      helpers
    )
  }
  // LCA-BST: fixtures pass p,q as int VALUES, solution keeps official
  // (TreeNode,TreeNode)->TreeNode shape. Harness looks up refs via __findTree
  // and compares the returned node VALUE via __valStr (expected "6" etc).
  if (problem.slug === 'lowest-common-ancestor-of-a-binary-search-tree') {
    const cases = tests.map((test, index) => {
      const rootLit = javaLiteral(test.args[0] || '[]', 'TreeNode')
      const pVal = String(Math.trunc(num(parseLiteral(test.args[1]))))
      const qVal = String(Math.trunc(num(parseLiteral(test.args[2]))))
      const inst = '__s' + index
      return (
        '    System.out.println("@@CASE ' + index + '");\n' +
        '    try { TreeNode __root' + index + ' = ' + rootLit + '; TreeNode __p' + index + ' = __H.__findTree(__root' + index + ', ' + pVal + '); TreeNode __q' + index + ' = __H.__findTree(__root' + index + ', ' + qVal + '); Solution ' + inst + ' = new Solution(); TreeNode __r' + index + ' = ' + inst + '.' + signature.name + '(__root' + index + ', __p' + index + ', __q' + index + '); String __value = __H.__valStr(__r' + index + '); System.out.println("\\n' + resultMarker + ' ' + index + ' " + __value); }\n' +
        '    catch (Throwable __t) { System.out.println("\\n' + resultMarker + ' ' + index + ' @@ERR " + __t.getClass().getSimpleName() + ": " + String.valueOf(__t.getMessage())); }'
      )
    })
    const helpers = (hasOwnList ? '' : JAVA_LIST_NODE) + (hasOwnTree ? '' : JAVA_TREE_NODE) + (hasOwnNode ? '' : JAVA_GRAPH_NODE) + JAVA_HELPERS
    return (
      'import java.util.*;\nimport java.io.*;\n\n' +
      userCode +
      '\n\npublic class Main {\n  public static void main(String[] __args) throws Exception {\n' +
      cases.join('\n') +
      '\n  }\n}\n' +
      helpers
    )
  }

  // Serialize Codec round-trip (additive, no Node touched): s=serialize(root),
  // t=deserialize(s), compare canonical __treeOut(t). Accepts any encoding.
  if (problem.slug === 'serialize-and-deserialize-binary-tree') {
    const cases = tests.map((test, index) => {
      const rootLit = javaLiteral(test.args[0] || '[]', 'TreeNode')
      return (
        '    System.out.println("@@CASE ' + index + '");\n' +
        '    try { TreeNode __root' + index + ' = ' + rootLit + '; Codec __c' + index + ' = new Codec(); String __s' + index + ' = __c' + index + '.serialize(__root' + index + '); TreeNode __t' + index + ' = __c' + index + '.deserialize(__s' + index + '); String __value = __H.__treeOut(__t' + index + '); System.out.println("\\n' + resultMarker + ' ' + index + ' " + __value); }\n' +
        '    catch (Throwable __t) { System.out.println("\\n' + resultMarker + ' ' + index + ' @@ERR " + __t.getClass().getSimpleName() + ": " + String.valueOf(__t.getMessage())); }'
      )
    })
    const helpers = (hasOwnList ? '' : JAVA_LIST_NODE) + (hasOwnTree ? '' : JAVA_TREE_NODE) + (hasOwnNode ? '' : JAVA_GRAPH_NODE) + JAVA_HELPERS
    return (
      'import java.util.*;\nimport java.io.*;\n\n' +
      userCode +
      '\n\npublic class Main {\n  public static void main(String[] __args) throws Exception {\n' +
      cases.join('\n') +
      '\n  }\n}\n' +
      helpers
    )
  }

  const cases = tests.map((test, index) => {
    const bound = (test.args || []).map((raw, position) => {
      const type = signature.params[position]?.type || 'int'
      const literal = javaLiteral(raw, type)
      const name = '__a' + index + '_' + position
      if (wordLadderList && position === 2 && type === 'string[]') {
        return '    java.util.List<String> ' + name + ' = new java.util.ArrayList<>(java.util.Arrays.asList(' + literal + '));'
      }
      return '    ' + javaType(type) + ' ' + name + ' = ' + literal + ';'
    }).join('\n')
    const argNames = (test.args || []).map((_, position) => '__a' + index + '_' + position)
    // Fresh Solution per case: instance fields (cursors, caches) must not leak
    // across cases, or idiomatic stateful solutions fail case 2+ spuriously.
    const inst = '__s' + index
    const call = inst + '.' + signature.name + '(' + argNames.join(', ') + ')'
    const fresh = '    Solution ' + inst + ' = new Solution();\n'
    // Codec round-trip (Encode and Decode Strings): encode the input list with
    // the user Codec, decode the produced payload with the SAME user Codec,
    // serialize the decoded list. Encoded spelling is never compared.
    if (decode) {
      const cinst = '__c' + index
      const encLit = javaLiteral((test.args || [])[0] || '[]', ((signature.params || [])[0] || {}).type || 'string[]')
      const encCall = cinst + '.' + signature.name + '(new java.util.ArrayList<>(java.util.Arrays.asList(' + encLit + ')))'
      return (
        '    System.out.println("@@CASE ' + index + '");\n' + '    ' + codecClass + ' ' + cinst + ' = new ' + codecClass + '();\n' +
        '    try { String __enc' + index + ' = ' + encCall + '; java.util.List<String> __dec' + index + ' = ' + cinst + '.' + decode.name + '(__enc' + index + '); String __value = __H.__out(__dec' + index + '); System.out.println("\\n' + resultMarker + ' ' + index + ' " + __value); }\n' +
        '    catch (Throwable __t) { System.out.println("\\n' + resultMarker + ' ' + index + ' @@ERR " + __t.getClass().getSimpleName() + ": " + String.valueOf(__t.getMessage())); }'
      )
    }
    if (signature.return === 'void') {
      if (mutates.length > 0) {
        const mIdx = mutates[0]
        const mType = ((signature.params[mIdx] || {}).type || 'int')
        const mVar = '__a' + index + '_' + mIdx
        return (
          '    System.out.println("@@CASE ' + index + '");\n' + fresh + bound + '\n' +
          '    try { ' + call + '; String __value = ' + javaMutatedSerializeExpr(mType, mVar) + '; System.out.println("\\n' + resultMarker + ' ' + index + ' " + __value); }\n' +
          '    catch (Throwable __t) { System.out.println("\\n' + resultMarker + ' ' + index + ' @@ERR " + __t.getClass().getSimpleName() + ": " + String.valueOf(__t.getMessage())); }'
        )
      }
      return (
        '    System.out.println("@@CASE ' + index + '");\n' + fresh + bound + '\n' +
        '    try { ' + call + '; System.out.println("\\n' + resultMarker + ' ' + index + ' @@VOID"); }\n' +
        '    catch (Throwable __t) { System.out.println("\\n' + resultMarker + ' ' + index + ' @@ERR " + __t.getClass().getSimpleName() + ": " + String.valueOf(__t.getMessage())); }'
      )
    }
    if (signature.return === 'Node') {
      const inVar = argNames[0] || '__a' + index + '_0'
      return (
        '    System.out.println("@@CASE ' + index + '");\n' + fresh + bound + '\n' +
        '    try { Node __in' + index + ' = ' + inVar + '; Node __value' + index + ' = ' + call + ';' +
        ' String __idErr' + index + ' = __H.__graphIdentityError(__in' + index + ', __value' + index + ', ' + graphCount(test.args ? test.args[0] : '[]') + ');' +
        ' if (__idErr' + index + ' != null) { System.out.println("\\n' + resultMarker + ' ' + index + ' @@ERR " + __idErr' + index + '); }' +
        ' else { String __value = __H.__graphOut(__value' + index + ', ' + graphCount(test.args ? test.args[0] : '[]') + '); System.out.println("\\n' + resultMarker + ' ' + index + ' " + __value); } }\n' +
        '    catch (Throwable __t) { System.out.println("\\n' + resultMarker + ' ' + index + ' @@ERR " + __t.getClass().getSimpleName() + ": " + String.valueOf(__t.getMessage())); }'
      )
    }
    return (
      '    System.out.println("@@CASE ' + index + '");\n' + fresh + bound + '\n' +
      '    try { String __value = ' + javaSerializeExprInline(signature.return, call) + '; System.out.println("\\n' + resultMarker + ' ' + index + ' " + __value); }\n' +
      '    catch (Throwable __t) { System.out.println("\\n' + resultMarker + ' ' + index + ' @@ERR " + __t.getClass().getSimpleName() + ": " + String.valueOf(__t.getMessage())); }'
    )
  })

  const helpers = (hasOwnList ? '' : JAVA_LIST_NODE) + (hasOwnTree ? '' : JAVA_TREE_NODE) + (hasOwnNode ? '' : JAVA_GRAPH_NODE) + JAVA_HELPERS

  return (
    'import java.util.*;\nimport java.io.*;\n\n' +
    userCode +
    '\n\npublic class Main {\n  public static void main(String[] __args) throws Exception {\n' +
    cases.join('\n') +
    '\n  }\n}\n' +
    helpers
  )
}

/* --------------------------------------------------------------------- C++ */

const CPP_NODES = `
struct ListNode { int val; ListNode *next; ListNode(): val(0), next(nullptr) {} ListNode(int x): val(x), next(nullptr) {} ListNode(int x, ListNode *n): val(x), next(n) {} };
struct TreeNode { int val; TreeNode *left; TreeNode *right; TreeNode(): val(0), left(nullptr), right(nullptr) {} TreeNode(int x): val(x), left(nullptr), right(nullptr) {} TreeNode(int x, TreeNode *l, TreeNode *r): val(x), left(l), right(r) {} };
struct Node { int val; std::vector<Node*> neighbors; Node(): val(0), neighbors(std::vector<Node*>()) {} Node(int _val): val(_val), neighbors(std::vector<Node*>()) {} Node(int _val, std::vector<Node*> _neighbors): val(_val), neighbors(_neighbors) {} };
`

const CPP_LIST_TREE_NODES = `
struct ListNode { int val; ListNode *next; ListNode(): val(0), next(nullptr) {} ListNode(int x): val(x), next(nullptr) {} ListNode(int x, ListNode *n): val(x), next(n) {} };
struct TreeNode { int val; TreeNode *left; TreeNode *right; TreeNode(): val(0), left(nullptr), right(nullptr) {} TreeNode(int x): val(x), left(nullptr), right(nullptr) {} TreeNode(int x, TreeNode *l, TreeNode *r): val(x), left(l), right(r) {} };
`

// Copy-list-with-random-pointer scoped Node (additive, no graph touch).
const CPP_RANDOM_NODE = `
struct Node { int val; Node *next; Node *random; Node(): val(0), next(nullptr), random(nullptr) {} Node(int x): val(x), next(nullptr), random(nullptr) {} Node(int x, Node *n, Node *r): val(x), next(n), random(r) {} };
`

const CPP_RANDOM_HELPERS = `
static Node* __mkRandom(std::vector<int> values, std::vector<std::string> rnds) {
  if (values.empty()) return nullptr;
  std::vector<Node*> nodes;
  for (int v : values) nodes.push_back(new Node(v));
  for (size_t i = 0; i + 1 < nodes.size(); i++) nodes[i]->next = nodes[i + 1];
  for (size_t i = 0; i < nodes.size(); i++) {
    if (rnds[i] != "null") {
      try { int idx = std::stoi(rnds[i]); if (idx >= 0 && idx < (int)nodes.size()) nodes[i]->random = nodes[idx]; } catch (...) {}
    }
  }
  return nodes[0];
}
static std::string __randomOut(Node* head) {
  std::vector<Node*> order; std::map<Node*,int> index;
  Node* node = head; int guard = 0;
  while (node && guard++ < 200000) {
    if (index.count(node)) break;
    index[node] = (int)order.size(); order.push_back(node); node = node->next;
  }
  std::string out = "[";
  for (size_t i = 0; i < order.size(); i++) {
    if (i) out += ",";
    out += "[" + std::to_string(order[i]->val) + ",";
    if (!order[i]->random) out += "null";
    else { auto it = index.find(order[i]->random); out += (it == index.end() ? "null" : std::to_string(it->second)); }
    out += "]";
  }
  return out + "]";
}
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
static std::string __quote(const std::string& value) {
  std::string out(1, char(34));
  const char* hex = "0123456789abcdef";
  for (unsigned char ch : value) {
    if (ch == 34 || ch == 92) { out.push_back(92); out.push_back(ch); }
    else if (ch < 32) { out.push_back(92); out += "u00"; out.push_back(hex[ch >> 4]); out.push_back(hex[ch & 15]); }
    else out.push_back(ch);
  }
  out.push_back(34); return out;
}
template <class T> static std::string __js(const T& v) { std::ostringstream o; o << std::setprecision(17) << v; return o.str(); }
static std::string __js(bool v) { return v ? "true" : "false"; }
static std::string __js(const std::string& v) { return __quote(v); }
static std::string __js(char v) { return __quote(std::string(1, v)); }
static std::string __js(const char* v) { return v ? __quote(std::string(v)) : "null"; }
template <class T> static std::string __js(const std::vector<T>& v);
static std::string __js(ListNode* node);
static std::string __js(TreeNode* node);
static std::string __js(Node* node);
template <class T> static std::string __js(const std::vector<T>& v) {
  std::string out = "[";
  for (size_t i = 0; i < v.size(); i++) { if (i) out += ","; out += __js(static_cast<T>(v[i])); }
  return out + "]";
}
static std::string __js(ListNode* node) { return __listOut(node); }
static std::string __js(TreeNode* node) { return __treeOut(node); }
static Node* __mkGraph(std::vector<std::vector<int>> adj) {
  if (adj.empty()) return nullptr;
  std::unordered_map<int, Node*> nodes;
  for (size_t i = 0; i < adj.size(); i++) nodes[(int)i + 1] = new Node((int)i + 1);
  for (size_t i = 0; i < adj.size(); i++) {
    Node* node = nodes[(int)i + 1];
    for (int v : adj[i]) { auto it = nodes.find(v); if (it != nodes.end()) node->neighbors.push_back(it->second); }
  }
  return nodes[1];
}
static std::string __graphOut(Node* entry, int count) {
  if (!entry) return "[]";
  // Canonical val-based rows: clones preserve val, so row i lists neighbor
  // VALS of the clone with val == i. Stable across BFS discovery orders.
  std::unordered_map<int, Node*> byVal;
  std::set<Node*> seen; std::deque<Node*> qb; qb.push_back(entry); seen.insert(entry);
  while (!qb.empty()) {
    Node* cur = qb.front(); qb.pop_front();
    byVal[cur->val] = cur;
    for (Node* nb : cur->neighbors) if (nb && seen.insert(nb).second) qb.push_back(nb);
  }
  std::string out = "[";
  for (int id = 1; id <= count; id++) {
    if (id > 1) out += ",";
    out += "[";
    auto it = byVal.find(id);
    if (it != byVal.end() && it->second) {
      bool first = true;
      for (Node* nb : it->second->neighbors) {
        if (!nb) continue;
        if (!first) out += ",";
        first = false;
        out += std::to_string(nb->val);
      }
    }
    out += "]";
  }
  return out + "]";
}
static std::string __graphIdentityError(Node* input, Node* output, int count) {
  if (count == 0) return output == nullptr ? "" : "non-null result for empty graph";
  if (!output) return "null result for non-empty graph";
  std::set<Node*> inSet; std::deque<Node*> q;
  if (input) { q.push_back(input); inSet.insert(input); }
  while (!q.empty()) { Node* n = q.front(); q.pop_front(); for (Node* nb : n->neighbors) if (nb && inSet.insert(nb).second) q.push_back(nb); }
  std::set<Node*> outSet; std::deque<Node*> q2; q2.push_back(output); outSet.insert(output);
  while (!q2.empty()) {
    Node* n = q2.front(); q2.pop_front();
    if (inSet.count(n)) return "shallow copy: result shares a node with the input";
    for (Node* nb : n->neighbors) if (nb && outSet.insert(nb).second) q2.push_back(nb);
  }
  if ((int)outSet.size() != count) return "node count " + std::to_string(outSet.size()) + " != input " + std::to_string(count) + " (duplicated or dropped clones)";
  return "";
}
// Linked-list cycle fixture builder (additive, no Node involved).
static ListNode* __mkCycle(std::vector<int> values, int pos) {
  ListNode* head = __mkList(values);
  if (pos < 0 || !head) return head;
  ListNode* tail = head; ListNode* target = nullptr; int i = 0;
  while (tail) { if (i == pos) target = tail; if (!tail->next) break; tail = tail->next; i++; }
  if (target) tail->next = target;
  return head;
}
// LCA-BST value bridge (additive, no Node involved): fixtures pass p,q as int
// VALUES, solution keeps official (TreeNode*,TreeNode*)->TreeNode* shape.
static TreeNode* __findTree(TreeNode* root, int value) {
  if (!root) return nullptr;
  std::deque<TreeNode*> q; q.push_back(root);
  while (!q.empty()) { TreeNode* n = q.front(); q.pop_front(); if (n->val == value) return n; if (n->left) q.push_back(n->left); if (n->right) q.push_back(n->right); }
  return nullptr;
}
static std::string __valStr(TreeNode* node) { return node ? std::to_string(node->val) : "null"; }
static std::string __js(Node* node) { return __graphOut(node, -1); }
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
    case 'ListNode[]': {
      const lists = Array.isArray(value) ? value : []
      const parts = lists.map((row) => {
        const items = Array.isArray(row) ? row : []
        return '__mkList(std::vector<int>{' + items.map((item) => String(Math.trunc(num(item)))).join(', ') + '})'
      })
      return 'std::vector<ListNode*>{' + parts.join(', ') + '}'
    }
    case 'Node':
      return '__mkGraph(std::vector<std::vector<int>>{' + (Array.isArray(value) ? value : []).map((row) => '{' + (Array.isArray(row) ? row : []).map((item) => String(Math.trunc(num(item)))).join(', ') + '}').join(', ') + '})'
    case 'TreeNode':
      return '__mkTree(std::vector<std::string>{' + (Array.isArray(value) ? value : []).map((item) => (item === null || item === undefined ? '"null"' : q(item))).join(', ') + '})'
    default:
      return '0'
  }
}

export function buildCppSource(problem, code, resultMarker = '@@LC_RESULT') {
  const signature = problem.judge.signature
  const tests = problem.judge.tests
  const userCode = String(code || '')
  const bare = stripComments(userCode)
  const hasOwnNodes = /\bstruct\s+(ListNode|TreeNode|Node)\b/.test(bare)
  const mutates = Array.isArray(problem.judge.mutates) ? problem.judge.mutates : []
  // Encode-and-decode-strings: generic round-trip branch (additive). Only this
  // slug carries judge.decode + codecClass; every other problem keeps the
  // existing generic void/Node/exact path byte-for-byte.
  const decode = problem.judge.decode && problem.judge.decode.name ? problem.judge.decode : null
  const codecClass = problem.judge.codecClass || 'Codec'
  // Linked-list-cycle: harness-only pos builds the cycle, solution takes head only.
  if (problem.slug === 'linked-list-cycle') {
    const cases = tests.map((test, index) => {
      const vals = parseLiteral(test.args[0])
      const pos = Math.trunc(num(parseLiteral(test.args[1])))
      const litVals = 'std::vector<int>{' + (Array.isArray(vals) ? vals : []).map((v) => String(Math.trunc(num(v)))).join(', ') + '}'
      const inst = '__s' + index
      return '  {\n    auto __h' + index + ' = __mkCycle(' + litVals + ', ' + pos + ');\n    Solution ' + inst + ';\n    std::cout << "@@CASE ' + index + '" << std::endl;\n    try { bool __b = ' + inst + '.' + signature.name + '(__h' + index + '); std::cout << "\\n' + resultMarker + ' ' + index + ' " << (__b ? "true" : "false") << std::endl; } catch (const std::exception& e) { std::cout << "\\n' + resultMarker + ' ' + index + ' @@ERR " << e.what() << std::endl; }\n  }'
    })
    return (
      '#include <bits/stdc++.h>\nusing namespace std;\n\n' +
      (hasOwnNodes ? '' : CPP_NODES) +
      '\n' +
      userCode +
      '\n\n' +
      CPP_HELPERS +
      '\nint main() {\n  ios::sync_with_stdio(false);\n' +
      cases.join('\n') +
      '\n  return 0;\n}\n'
    )
  }
  // Copy-list-with-random-pointer: scoped random Node shape. Emits ONLY
  // list/tree + random Node/helpers; never CPP_NODES graph Node nor
  // CPP_HELPERS graph helpers.
  if (problem.slug === 'copy-list-with-random-pointer') {
    const hasOwnListTree = /\bstruct\s+(ListNode|TreeNode)\b/.test(bare)
    const hasOwnNode = /\b(struct|class)\s+Node\b/.test(bare)
    const cases = tests.map((test, index) => {
      const pairs = parseLiteral(test.args[0] || '[]')
      const rows = Array.isArray(pairs) ? pairs : []
      const vals = rows.map((p) => (Array.isArray(p) ? String(Math.trunc(num(p[0]))) : '0'))
      const rnds = rows.map((p) => {
        if (!Array.isArray(p) || p[1] === null || p[1] === undefined) return 'null'
        if (typeof p[1] === 'number') return String(Math.trunc(p[1]))
        const t = String(p[1]).trim()
        return t === '' || t.toLowerCase() === 'null' ? 'null' : t
      })
      const lit = '__mkRandom(std::vector<int>{' + vals.join(', ') + '}, std::vector<std::string>{' + rnds.map((r) => q(r)).join(', ') + '})'
      const inst = '__s' + index
      return '  {\n    auto __h' + index + ' = ' + lit + ';\n    std::string __before' + index + ' = __randomOut(__h' + index + ');\n    Solution ' + inst + ';\n    std::cout << "@@CASE ' + index + '" << std::endl;\n    try { Node* __r' + index + ' = ' + inst + '.' + signature.name + '(__h' + index + '); if (__r' + index + ' == __h' + index + ' && __h' + index + ' != nullptr) { std::cout << "\\n' + resultMarker + ' ' + index + ' @@ERR not a deep copy" << std::endl; } else if (__randomOut(__h' + index + ') != __before' + index + ') { std::cout << "\\n' + resultMarker + ' ' + index + ' @@ERR mutated input" << std::endl; } else { std::string __value = __randomOut(__r' + index + '); std::cout << "\\n' + resultMarker + ' ' + index + ' " << __value << std::endl; } } catch (const std::exception& e) { std::cout << "\\n' + resultMarker + ' ' + index + ' @@ERR " << e.what() << std::endl; }\n  }'
    })
    return (
      '#include <bits/stdc++.h>\nusing namespace std;\n\n' +
      (hasOwnListTree ? '' : CPP_LIST_TREE_NODES) +
      '\n' +
      (hasOwnNode ? '' : CPP_RANDOM_NODE) +
      '\n' +
      userCode +
      '\n\n' +
      CPP_RANDOM_HELPERS +
      '\nint main() {\n  ios::sync_with_stdio(false);\n' +
      cases.join('\n') +
      '\n  return 0;\n}\n'
    )
  }
  // LCA-BST: fixtures pass p,q as int VALUES, solution keeps official
  // (TreeNode*,TreeNode*)->TreeNode* shape. Bridge via __findTree, compare value.
  if (problem.slug === 'lowest-common-ancestor-of-a-binary-search-tree') {
    const cases = tests.map((test, index) => {
      const rootLit = cppLiteral(test.args[0] || '[]', 'TreeNode')
      const pVal = String(Math.trunc(num(parseLiteral(test.args[1]))))
      const qVal = String(Math.trunc(num(parseLiteral(test.args[2]))))
      const inst = '__s' + index
      return '  {\n    auto __root' + index + ' = ' + rootLit + ';\n    auto __p' + index + ' = __findTree(__root' + index + ', ' + pVal + ');\n    auto __q' + index + ' = __findTree(__root' + index + ', ' + qVal + ');\n    Solution ' + inst + ';\n    std::cout << "@@CASE ' + index + '" << std::endl;\n    try { TreeNode* __r' + index + ' = ' + inst + '.' + signature.name + '(__root' + index + ', __p' + index + ', __q' + index + '); std::cout << "\\n' + resultMarker + ' ' + index + ' " << __valStr(__r' + index + ') << std::endl; } catch (const std::exception& e) { std::cout << "\\n' + resultMarker + ' ' + index + ' @@ERR " << e.what() << std::endl; }\n  }'
    })
    return (
      '#include <bits/stdc++.h>\nusing namespace std;\n\n' +
      (hasOwnNodes ? '' : CPP_NODES) +
      '\n' +
      userCode +
      '\n\n' +
      CPP_HELPERS +
      '\nint main() {\n  ios::sync_with_stdio(false);\n' +
      cases.join('\n') +
      '\n  return 0;\n}\n'
    )
  }

  // Serialize Codec round-trip (additive, no Node touched): s=serialize(root),
  // t=deserialize(s), compare canonical __treeOut(t). Fresh Codec per case.
  if (problem.slug === 'serialize-and-deserialize-binary-tree') {
    const cases = tests.map((test, index) => {
      const rootLit = cppLiteral(test.args[0] || '[]', 'TreeNode')
      return '  {\n    auto __root' + index + ' = ' + rootLit + ';\n    Codec __c' + index + ';\n    std::cout << "@@CASE ' + index + '" << std::endl;\n    try { std::string __s' + index + ' = __c' + index + '.serialize(__root' + index + '); TreeNode* __t' + index + ' = __c' + index + '.deserialize(__s' + index + '); std::cout << "\\n' + resultMarker + ' ' + index + ' " << __treeOut(__t' + index + ') << std::endl; } catch (const std::exception& e) { std::cout << "\\n' + resultMarker + ' ' + index + ' @@ERR " << e.what() << std::endl; }\n  }'
    })
    return (
      '#include <bits/stdc++.h>\nusing namespace std;\n\n' +
      (hasOwnNodes ? '' : CPP_NODES) +
      '\n' +
      userCode +
      '\n\n' +
      CPP_HELPERS +
      '\nint main() {\n  ios::sync_with_stdio(false);\n' +
      cases.join('\n') +
      '\n  return 0;\n}\n'
    )
  }

  const cases = tests.map((test, index) => {
    const args = (test.args || []).map((raw, position) => cppLiteral(raw, (signature.params[position] || {}).type || 'int'))
    // Bind each argument to a named lvalue: solution signatures take `vector<int>&`, and a
    // temporary cannot bind to a non-const reference.
    const declarations = args.map((expression, position) => '    auto __a' + index + '_' + position + ' = ' + expression + ';')
    // Fresh Solution per case: instance fields must not leak across cases.
    const inst = '__s' + index
    const call = inst + '.' + signature.name + '(' + args.map((_, position) => '__a' + index + '_' + position).join(', ') + ')'
    const fresh = '    Solution ' + inst + ';'
    // Codec round-trip (Encode and Decode Strings): encode with the user Codec,
    // decode the produced payload with the SAME user Codec, serialize decoded.
    // Encoded spelling is never compared.
    if (decode) {
      const cinst = '__c' + index
      const argNames = args.map((_, position) => '__a' + index + '_' + position)
      return '  {\n' + declarations.join('\n') + '\n' + '    ' + codecClass + ' ' + cinst + ';' + '\n    std::cout << "@@CASE ' + index + '" << std::endl;\n    try { std::string __enc' + index + ' = ' + cinst + '.' + signature.name + '(' + argNames.join(', ') + '); std::vector<std::string> __dec' + index + ' = ' + cinst + '.' + decode.name + '(__enc' + index + '); std::string __value = __js(__dec' + index + '); std::cout << "\\n' + resultMarker + ' ' + index + ' " << __value << std::endl; } catch (const std::exception& e) { std::cout << "\\n' + resultMarker + ' ' + index + ' @@ERR " << e.what() << std::endl; }\n  }'
    }
    if (signature.return === 'void') {
      if (mutates.length > 0) {
        const mVar = '__a' + index + '_' + mutates[0]
        return '  {\n' + declarations.join('\n') + '\n' + fresh + '\n    std::cout << "@@CASE ' + index + '" << std::endl;\n    try { ' + call + '; std::string __value = __js(' + mVar + '); std::cout << "\\n' + resultMarker + ' ' + index + ' " << __value << std::endl; } catch (const std::exception& e) { std::cout << "\\n' + resultMarker + ' ' + index + ' @@ERR " << e.what() << std::endl; }\n  }'
      }
      return '  {\n' + declarations.join('\n') + '\n' + fresh + '\n    std::cout << "@@CASE ' + index + '" << std::endl;\n    try { ' + call + '; std::cout << "\\n' + resultMarker + ' ' + index + ' @@VOID" << std::endl; } catch (const std::exception& e) { std::cout << "@@ERR " << e.what() << std::endl; }\n  }'
    }
    if (signature.return === 'Node') {
      const inVar = '__a' + index + '_0'
      const count = graphCount(test.args ? test.args[0] : '[]')
      return '  {\n' + declarations.join('\n') + '\n' + fresh + '\n    std::cout << "@@CASE ' + index + '" << std::endl;\n    try { Node* __in' + index + ' = ' + inVar + '; Node* __res' + index + ' = ' + call + '; std::string __idErr' + index + ' = __graphIdentityError(__in' + index + ', __res' + index + ', ' + count + '); if (!__idErr' + index + '.empty()) { std::cout << "\\n' + resultMarker + ' ' + index + ' @@ERR " << __idErr' + index + ' << std::endl; } else { std::string __value = __graphOut(__res' + index + ', ' + count + '); std::cout << "\\n' + resultMarker + ' ' + index + ' " << __value << std::endl; } } catch (const std::exception& e) { std::cout << "\\n' + resultMarker + ' ' + index + ' @@ERR " << e.what() << std::endl; }\n  }'
    }
    return '  {\n' + declarations.join('\n') + '\n' + fresh + '\n    std::cout << "@@CASE ' + index + '" << std::endl;\n    try { std::string __value = __js(' + call + '); std::cout << "\\n' + resultMarker + ' ' + index + ' " << __value << std::endl; } catch (const std::exception& e) { std::cout << "\\n' + resultMarker + ' ' + index + ' @@ERR " << e.what() << std::endl; }\n  }'
  })

  return (
    '#include <bits/stdc++.h>\nusing namespace std;\n\n' +
    (hasOwnNodes ? '' : CPP_NODES) +
    '\n' +
    userCode +
    '\n\n' +
    CPP_HELPERS +
    '\nint main() {\n  ios::sync_with_stdio(false);\n' +
    cases.join('\n') +
    '\n  return 0;\n}\n'
  )
}

/* --------------------------------------------------------------- comparing */

/** Compare parsed values without flattening nested structures or deleting string spaces. */
export function outputsMatch(expected, got, mode = 'exact') {
  const decode = raw => {
    const value = String(raw ?? 'null').trim()
    try { return JSON.parse(value) } catch { return parseLiteral(value) }
  }
  const equal = (a, b, tolerant = false) => {
    if (typeof a !== typeof b) return false
    if (Array.isArray(a) || Array.isArray(b)) {
      return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, i) => equal(value, b[i], tolerant))
    }
    if (typeof a === 'number' && tolerant) return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-5 * Math.max(1, Math.abs(a))
    return a === b
  }
  const a = decode(expected), b = decode(got)
  if (equal(a, b, mode === 'float')) return true
  // Round-trip (Encode and Decode Strings): the harness already replays
  // decode(encode(input)) and prints the decoded list, so comparison is plain
  // ordered list equality — identical semantics to exact, named explicitly so
  // future exact-mode changes cannot silently alter round-trip meaning.
  // Encoded spelling is never compared.
  if (mode === 'round-trip') return false
  // Graph identity mode (Clone Graph): same node count and same neighbor SETS
  // per node; neighbor ORDER is irrelevant. Deep-copy identity (no shared
  // references) is enforced in the harness, which emits @@ERR on violation.
  if (mode === 'graph') {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((row, i) => {
      if (!Array.isArray(row) || !Array.isArray(b[i])) return false
      const x = row.slice().map(Number).sort((p, q) => p - q)
      const y = b[i].slice().map(Number).sort((p, q) => p - q)
      return x.length === y.length && x.every((v, k) => v === y[k])
    })
  }
  if (mode !== 'unordered' || !Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
  // Group Anagrams permits arbitrary order of groups and of strings inside each group.
  // Numeric inner lists retain their order: permutations and coordinate pairs depend on it.
  const stringGroups = values => values.every(row => Array.isArray(row) && row.every(value => typeof value === 'string'))
  const groups = stringGroups(a) && stringGroups(b)
  const keys = values => values.map(value => JSON.stringify(groups ? value.slice().sort() : value)).sort()
  return equal(keys(a), keys(b))
}


/* ---------------------------------- alien-dictionary property scoring -----
 * Staged for the curated alien-dictionary overlay
 * (NeetCode "Foreign Dictionary"; signature foreignDictionary(string[]) ->
 * string, mode "any"). Exact-string equality is WRONG here: any ordering that
 * respects every adjacent-pair vote passes, and "" passes IFF the list is
 * unorderable (a longer word precedes its own prefix, or the votes contain a
 * cycle). Additive: only consulted when judge.mode === 'any' AND the
 * signature is foreignDictionary(string[]) -> string; every other problem
 * keeps the existing outputsMatch path byte-for-byte.
 * Provenance: paraphrased brief from
 * .workers/jobs/owner-reviews/missing150-source-briefs.json (verified
 * 2026-11-07); logic ported from the staged overlay adapters
 * (neetcode150-completion/alien-dictionary/adapter + forge).
 */

export function alienOrderValid(args, got) {
  let words
  try {
    words = JSON.parse(String((args || [])[0]))
  } catch {
    return false
  }
  if (!Array.isArray(words)) return false
  // Local-harness string outputs arrive JSON-quoted (got == '"zo"');
  // decode exactly like outputsMatch before validating.
  let out = got
  if (typeof out === 'string') {
    const trimmed = out.trim()
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || trimmed === 'null') {
      try { out = JSON.parse(trimmed) } catch { /* keep raw */ }
    }
  }
  if (typeof out !== 'string') return false
  const letters = [...new Set(words.join('').split(''))].sort()
  const adj = new Map(letters.map((c) => [c, new Set()]))
  let badPrefix = false
  for (let i = 0; i + 1 < words.length; i++) {
    const a = String(words[i])
    const b = String(words[i + 1])
    let j = 0
    const m = Math.min(a.length, b.length)
    while (j < m && a[j] === b[j]) j++
    if (j === m) {
      if (a.length > b.length) badPrefix = true
      continue
    }
    adj.get(a[j]).add(b[j])
  }
  const color = new Map()
  let cyclic = false
  const visit = (u) => {
    color.set(u, 1)
    for (const v of adj.get(u)) {
      if (color.get(v) === 1) { cyclic = true; return }
      if (!color.has(v)) visit(v)
      if (cyclic) return
    }
    color.set(u, 2)
  }
  for (const c of letters) if (!color.has(c)) visit(c)
  if (out === '') return badPrefix || cyclic
  if (badPrefix || cyclic) return false
  if (out.length !== letters.length) return false
  if (new Set(out.split('')).size !== letters.length) return false
  const pos = new Map(out.split('').map((c, i) => [c, i]))
  for (const c of letters) if (!pos.has(c)) return false
  for (const [u, vs] of adj) for (const v of vs) if (pos.get(u) > pos.get(v)) return false
  return true
}

function isAlienAnyJudge(judge) {
  const sig = (judge && judge.signature) || {}
  const params = Array.isArray(sig.params) ? sig.params : []
  const types = params.map((p) => (typeof p === 'string' ? p : p && p.type))
  return judge && judge.mode === 'any' && sig.name === 'foreignDictionary' &&
    types.length === 1 && types[0] === 'string[]' && sig.return === 'string'
}
/* ------------------------------------------------------------------- judge */

function parseRunOutput(stdout, total, marker) {
  const cases = new Array(total).fill(null)
  const prefix = marker + ' '
  for (const line of String(stdout || '').split(/\r?\n/)) {
    if (!line.startsWith(prefix)) continue
    const match = /^(\d+) (.*)$/.exec(line.slice(prefix.length))
    if (!match) continue
    const index = Number(match[1])
    if (index >= 0 && index < total) cases[index] = match[2]
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

  const resultMarker = '@@LC_' + randomUUID().replaceAll('-', '')
  const dir = await mkdtemp(join(tmpdir(), 'lclab-'))
  try {
    let compile
    let run
    if (lang === 'cpp') {
      await writeFile(join(dir, 'main.cpp'), buildCppSource(problem, code, resultMarker), 'utf8')
      compile = await runProcess('g++', ['-std=gnu++20', '-O2', '-o', 'main.exe', 'main.cpp'], { timeoutMs: COMPILE_TIMEOUT_MS, spawn: { cwd: dir } })
      if (compile.code !== 0) {
        return { ok: false, mode: judge.mode || 'exact', compile: { ok: false, ms: compile.ms, stderr: compile.stderr || compile.stdout }, cases: [], passed: 0, total }
      }
      run = await runProcess(join(dir, 'main.exe'), [], { timeoutMs: RUN_TIMEOUT_MS, spawn: { cwd: dir } })
    } else {
      await writeFile(join(dir, 'Main.java'), buildJavaSource(problem, code, resultMarker), 'utf8')
      compile = await runProcess('javac', ['-encoding', 'UTF-8', 'Main.java'], { timeoutMs: COMPILE_TIMEOUT_MS, spawn: { cwd: dir } })
      if (compile.code !== 0) {
        return { ok: false, mode: judge.mode || 'exact', compile: { ok: false, ms: compile.ms, stderr: compile.stderr || compile.stdout }, cases: [], passed: 0, total }
      }
      run = await runProcess('java', ['-cp', dir, 'Main'], { timeoutMs: RUN_TIMEOUT_MS, spawn: { cwd: dir } })
    }

    const outputs = parseRunOutput(run.stdout, total, resultMarker)
    const cases = (judge.tests || []).map((test, index) => {
      const got = outputs[index]
      const errorLine = got !== null && String(got).startsWith('@@ERR') ? String(got).slice(6).trim() : null
      // Property scoring for alien-dictionary ("any" mode): any valid order
      // passes; exact-string equality would reject correct alternative orders.
      const alien = isAlienAnyJudge(judge)
      const ok = errorLine === null && got !== null && (alien ? alienOrderValid(test.args, String(got)) : outputsMatch(test.expected, got, judge.mode))
      return {
        n: test.example ?? index + 1,
        expected: String(test.expected ?? ''),
        got: errorLine !== null ? '' : got === null ? '<no output>' : String(got),
        ok,
        error: errorLine || (got === null ? 'solution printed nothing for this case' : null),
        args: test.args || [],
      }
    })
    if (run.timedOut) {
      return { ok: false, mode: judge.mode || 'exact', compile: { ok: true, ms: compile.ms, stderr: '' }, cases, passed: cases.filter(entry => entry.ok).length, total, timedOut: true, error: 'time limit exceeded' }
    }
    const passed = cases.filter((entry) => entry.ok).length
    return {
      ok: passed === total && run.code === 0,
      ...(run.code !== 0 ? { error: 'solution exited abnormally' } : {}),
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
