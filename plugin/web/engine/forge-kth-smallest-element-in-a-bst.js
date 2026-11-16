/**
 * kth-smallest-element-in-a-bst — portable standalone practice builder.
 *
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Deterministic: FNV-1a slug seed + mulberry32, so the same slug always yields
 * the same three variants.
 *
 * Source grounding:
 * - Signature/mode/examples shape follow CONTRACTS.md section 2 and the shard
 *   record for slug kth-smallest-element-in-a-bst (id 230):
 *   signature { name: kthSmallest, params: [TreeNode root, int k], return: int },
 *   mode "exact". args are raw LeetCode-style literal strings parsed per type.
 * - Official examples (root=[3,1,4,null,2],k=1 -> 1 and
 *   root=[5,3,6,2,4,null,null,1],k=3 -> 3) are NOT reused below; every drill
 *   input here is GENERATED (seeded BST builds + fixed fresh edges).
 * - Walkthrough bound respected: every level array has length <= 31 and every
 *   k satisfies 1 <= k <= nodeCount (adapter throws otherwise; no truncation).
 * - Same-tree note: single-tree problem; nothing here claims a tree B is drawn.
 *
 * Oracle (independent of the walkthrough adapter):
 * - Adapter (trees-adapters.js buildKthSmallest) = iterative explicit-stack
 *   inorder with early stop at count==k.
 * - This forge's oracle = decode level array to a tree, BFS-collect ALL node
 *   values (order-independent), numeric sort, pick sorted[k-1]. No inorder
 *   walk, no stack discipline, no early stop — agreement on valid BST inputs
 *   cross-validates both implementations.
 */

const SLUG = 'kth-smallest-element-in-a-bst';

export const SIGNATURE = {
  name: 'kthSmallest',
  params: [
    { name: 'root', type: 'TreeNode' },
    { name: 'k', type: 'int' },
  ],
  return: 'int',
};
export const MODE = 'exact';
export const VISUAL_MAX = 31;

function hashText(text) {
  const source = String(text);
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < source.length; i += 1) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619) >>> 0;
  return hash;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function shuffled(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function sampleRange(rng, count, lo, hi) {
  const pool = [];
  for (let v = lo; v <= hi; v += 1) pool.push(v);
  return shuffled(rng, pool).slice(0, Math.min(count, pool.length));
}

function outLiteral(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return '[' + value.map(outLiteral).join(',') + ']';
  return String(value);
}

function argLiteral(value) {
  if (typeof value === 'string') return JSON.stringify(value);
  return outLiteral(value);
}

function inputLine(signature, args) {
  return signature.params.map((p, i) => `${(p && p.name) || 'arg' + i} = ${args[i]}`).join(', ');
}

function cloneSignature(sig) {
  return { name: sig.name, params: sig.params.map((p) => ({ name: p.name, type: p.type })), return: sig.return };
}

/* ---------------- BST build / level encode (generated inputs) ---------------- */

function bstInsert(root, value) {
  if (root === null) return { value, left: null, right: null };
  let cur = root;
  for (;;) {
    if (value < cur.value) {
      if (cur.left === null) { cur.left = { value, left: null, right: null }; return root; }
      cur = cur.left;
    } else if (value > cur.value) {
      if (cur.right === null) { cur.right = { value, left: null, right: null }; return root; }
      cur = cur.right;
    } else {
      return root; // distinct values only; duplicates dropped (never generated)
    }
  }
}

function bstBuild(values) {
  let root = null;
  for (const v of values) root = bstInsert(root, v);
  return root;
}

function bstNodeCount(root) {
  if (root === null) return 0;
  return 1 + bstNodeCount(root.left) + bstNodeCount(root.right);
}

/** Compact LeetCode level-order encode with interior nulls, trailing nulls trimmed. */
function bstLevelEncode(root) {
  if (root === null) return [];
  const out = [];
  const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node === null || node === undefined) { out.push(null); continue; }
    out.push(node.value);
    queue.push(node.left ?? null, node.right ?? null);
  }
  while (out.length > 0 && out[out.length - 1] === null) out.pop();
  return out;
}

/** Decode a level array to node objects (same BFS wiring as treeInput). */
function levelBuild(level) {
  if (!Array.isArray(level) || level.length === 0 || level[0] === null || level[0] === undefined) {
    return { root: null, nodes: [] };
  }
  let id = 0;
  const root = { id: id++, value: level[0], left: null, right: null };
  const queue = [root];
  const nodes = [root];
  let cursor = 1;
  for (let head = 0; head < queue.length && cursor < level.length; head += 1) {
    const parent = queue[head];
    for (const side of ['left', 'right']) {
      if (cursor >= level.length) break;
      const v = level[cursor++];
      if (v === null || v === undefined) continue;
      const child = { id: id++, value: v, left: null, right: null };
      parent[side] = child;
      queue.push(child);
      nodes.push(child);
    }
  }
  return { root, nodes };
}

/**
 * INDEPENDENT oracle: BFS-collect every node value (queue order, no inorder),
 * numeric sort, return sorted[k-1] as a number. Throws on bad k/empty.
 * Distinct from the adapter's iterative inorder + early-stop walk.
 */
export function oracleKthSmallest(level, k) {
  const built = levelBuild(level);
  if (built.root === null) throw new Error('oracle: empty tree');
  if (!Number.isSafeInteger(k)) throw new Error('oracle: k must be an integer');
  const values = [];
  const queue = [built.root];
  while (queue.length > 0) {
    const node = queue.shift();
    values.push(node.value);
    if (node.left !== null && node.left !== undefined) queue.push(node.left);
    if (node.right !== null && node.right !== undefined) queue.push(node.right);
  }
  if (k < 1 || k > values.length) throw new Error('oracle: k out of range');
  values.sort((a, b) => a - b);
  return values[k - 1];
}

/** Second cross-check oracle: full recursive inorder (no early stop), index k-1. */
export function oracleRecursiveInorder(level, k) {
  const built = levelBuild(level);
  const out = [];
  (function inorder(node) {
    if (node === null || node === undefined) return;
    inorder(node.left);
    out.push(node.value);
    inorder(node.right);
  }(built.root));
  if (k < 1 || k > out.length) throw new Error('oracle2: k out of range');
  return out[k - 1];
}

function toTest(level, k) {
  const expected = oracleKthSmallest(level, k);
  const cross = oracleRecursiveInorder(level, k);
  if (cross !== expected) throw new Error('oracle disagreement on generated input');
  if (level.length > VISUAL_MAX) throw new Error('visual bound exceeded');
  return { args: [outLiteral(level.slice()), String(k)], expected: outLiteral(expected) };
}

function buildVariant(spec) {
  const tests = spec.tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
  const first = tests[0];
  return {
    id: spec.id,
    seedLabel: spec.seedLabel,
    intent: spec.intent,
    difficulty: 'Medium',
    title: 'Kth Smallest Element in a BST — ' + spec.suffix + ' (' + spec.taskLabel + ')',
    statement: spec.statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(SIGNATURE, first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: spec.hints.slice(0, 2),
  };
}

const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.';
const INTENT_EDGE = 'Same pattern with the edge case the original hides.';
const INTENT_TWIST = 'Same signature, different question: the twist tests whether the idea transfers.';

function freshTests(rng) {
  const out = [];
  for (let n = 0; n < 4; n += 1) {
    const size = n === 0 ? 5 : randInt(rng, 5, 9);
    const values = sampleRange(rng, size, 0, 40);
    const root = bstBuild(values);
    const level = bstLevelEncode(root);
    const k = randInt(rng, 1, values.length);
    out.push(toTest(level, k));
  }
  return out;
}

function edgeTests() {
  return [
    toTest([7], 1), // single node
    toTest([3, 1], 2), // two-node left chain, k = n (largest)
    toTest([2, null, 3], 1), // two-node right chain, k = 1 (smallest)
    toTest([4, 2, 6, 1, 3, 5, 7], 4), // balanced 7-node, median
    toTest([4, 2, 6, 1, 3, 5, 7], 7), // balanced 7-node, maximum
  ];
}

function adversarialTests(rng) {
  // Right-leaning chain of 10 (ascending insert): level length 19 <= 31.
  const asc = [];
  for (let v = 1; v <= 10; v += 1) asc.push(v);
  const rightLevel = bstLevelEncode(bstBuild(asc));
  // Left-leaning chain of 10 (descending insert): level length 19 <= 31.
  const desc = [];
  for (let v = 10; v >= 1; v -= 1) desc.push(v);
  const leftLevel = bstLevelEncode(bstBuild(desc));
  // Balanced 15-node tree (median-first insert order over 1..15).
  const balancedOrder = [8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15];
  const balancedLevel = bstLevelEncode(bstBuild(balancedOrder));
  // Seeded wide-range 12-node BST (values -50..50).
  const wideValues = sampleRange(rng, 12, -50, 50);
  const wideLevel = bstLevelEncode(bstBuild(wideValues));
  const wideK = randInt(rng, 2, 11);
  return [
    toTest(rightLevel, 1), // smallest on a right spine forces the full left-descent loop
    toTest(leftLevel, 10), // largest on a left spine forces full pop/visit drainage
    toTest(balancedLevel, 8), // median of a full balanced tree
    toTest(wideLevel, wideK), // seeded wide-range shape
  ];
}

/**
 * Build exactly three judge-ready practice variations.
 * @returns {Array} [v1 fresh, v2 edge, v3 adversarial] — [] never (inputs fixed/seeded).
 */
export function buildKthSmallestVariants() {
  const rng = mulberry32(hashText(SLUG));
  const v1tests = freshTests(rng);
  const v2tests = edgeTests();
  const v3tests = adversarialTests(rng);
  const taskLabel = 'kth-inorder drill';
  return [
    buildVariant({
      id: 'v1', seedLabel: 'fresh trees', suffix: 'fresh trees', intent: INTENT_SAME, taskLabel,
      statement: 'Given the root of a binary search tree as a level-order array and an integer k, return the kth smallest value (1-indexed). These GENERATED fresh inputs use small seeded BSTs of 5 to 9 nodes with values between 0 and 40; every k satisfies 1 <= k <= n and every level array has length at most 31. Same signature and exact-match judge mode are unchanged.',
      tests: v1tests,
      hints: [
        'Inorder of a BST visits values in sorted order, so count visits and stop when the count reaches k.',
        'Push left descendants onto a stack first; the next pop is always the next smallest unvisited node.',
      ],
    }),
    buildVariant({
      id: 'v2', seedLabel: 'edge cases', suffix: 'edge cases', intent: INTENT_EDGE, taskLabel,
      statement: 'Same kth-smallest task with the boundary inputs. GENERATED edges: a single node, a two-node left chain asking for the largest, a two-node right chain asking for the smallest, and a balanced 7-node tree asking for the median and for the maximum. Every level array has length at most 31 and every k satisfies 1 <= k <= n.',
      tests: v2tests,
      hints: [
        'With one node the first inorder visit is already the answer, so k = 1 returns the root value.',
        'k = n asks for the maximum: the walk must drain the whole stack instead of stopping early.',
      ],
    }),
    buildVariant({
      id: 'v3', seedLabel: 'adversarial shapes', suffix: 'adversarial shapes', intent: 'Same question with adversarial shapes that punish early-stop shortcuts.', taskLabel,
      statement: 'Same kth-smallest question with GENERATED adversarial shapes that punish shortcuts. A 10-node right-leaning chain, a 10-node left-leaning chain, a full balanced 15-node tree, and a seeded 12-node wide-range BST stress the full descend/pop/visit discipline. No rule change: the signature and exact comparison are unchanged.',
      tests: v3tests,
      hints: [
        'On a right spine the outer loop still descends first; do not skip the push-left phase when the left child is null.',
        'Early stop only triggers at count == k — for k = n the walk visits every node before returning.',
      ],
    }),
  ];
}

export default { buildKthSmallestVariants, oracleKthSmallest, oracleRecursiveInorder, SIGNATURE, MODE, SLUG };
