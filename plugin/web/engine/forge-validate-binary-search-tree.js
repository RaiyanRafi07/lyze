/**
 * Portable standalone practice builder for validate-binary-search-tree.
 * Generated drills — not official LeetCode examples. No imports, no DOM,
 * no network, no Math.random, no Date. Deterministic per slug.
 *
 * Signature mirrors the settled record (CONTRACTS.md section 2):
 *   isValidBST(root: TreeNode) -> boolean, mode exact.
 * Args are literal strings the judge parses (e.g. "[2,1,3]").
 * Expected values are literal strings (e.g. "true").
 */
export const SLUG = 'validate-binary-search-tree';

export const SIGNATURE = Object.freeze({
  name: 'isValidBST',
  params: Object.freeze([{ name: 'root', type: 'TreeNode' }]),
  return: 'boolean',
});

export const MODE = 'exact';

/* ---------------- deterministic seeding (FNV-1a + mulberry32) ---------------- */
function hashText(text) {
  const s = String(text);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
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
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

function sampleRange(rng, count, lo, hi) {
  const pool = [];
  for (let v = lo; v <= hi; v += 1) pool.push(v);
  return shuffled(rng, pool).slice(0, Math.min(count, pool.length));
}

/* ------------------------------- literals ------------------------------- */
function outLiteral(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return '[' + value.map(outLiteral).join(',') + ']';
  return String(value);
}

function argLiteral(value) {
  if (Array.isArray(value)) return '[' + value.map(outLiteral).join(',') + ']';
  return outLiteral(value);
}

function cloneSignature() {
  return { name: SIGNATURE.name, params: SIGNATURE.params.map((p) => ({ ...p })), return: SIGNATURE.return };
}

function inputLine(args) {
  return 'root = ' + args[0];
}

/* --------------------------- tree + oracles --------------------------- */
/** Build pointer tree from LeetCode level-order array (BFS, null = absent). */
function buildTree(level) {
  if (!Array.isArray(level) || level.length === 0 || level[0] === null) return null;
  let id = 0;
  const root = { id: id++, value: level[0], left: null, right: null };
  const queue = [root];
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
    }
  }
  return root;
}

/** Primary oracle: open-interval bounds recursion (same rule as the adapter). */
export function oracleBounds(level) {
  const root = buildTree(level);
  function check(node, lo, hi) {
    if (node === null) return true;
    if ((lo !== null && node.value <= lo) || (hi !== null && node.value >= hi)) return false;
    return check(node.left, lo, node.value) && check(node.right, node.value, hi);
  }
  return check(root, null, null);
}

/** Independent oracle: inorder traversal must be strictly increasing. */
export function oracleInorder(level) {
  const root = buildTree(level);
  const seq = [];
  (function inorder(node) {
    if (node === null) return;
    inorder(node.left);
    seq.push(node.value);
    inorder(node.right);
  })(root);
  for (let i = 1; i < seq.length; i += 1) if (!(seq[i] > seq[i - 1])) return false;
  return true;
}

/* --------------------------- level generators --------------------------- */
function balancedFromSorted(sorted) {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return {
    value: sorted[mid],
    left: balancedFromSorted(sorted.slice(0, mid)),
    right: balancedFromSorted(sorted.slice(mid + 1)),
  };
}

function levelOf(node) {
  if (node === null) return [];
  const out = [];
  const queue = [node];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === null) {
      out.push(null);
      continue;
    }
    out.push(cur.value);
    queue.push(cur.left, cur.right);
  }
  while (out.length > 0 && out[out.length - 1] === null) out.pop();
  return out;
}

/** Fresh seeded valid BST level array (balanced over distinct values). */
function freshValidLevel(rng) {
  const size = randInt(rng, 5, 7);
  const values = sampleRange(rng, size, 1, 30).sort((a, b) => a - b);
  return levelOf(balancedFromSorted(values));
}

/** Corrupt a valid level into an invalid one by duplicating the root deep. */
function corruptByRootDup(level) {
  const out = level.slice();
  let idx = -1;
  for (let i = out.length - 1; i >= 1; i -= 1) {
    if (out[i] !== null) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return out;
  out[idx] = out[0];
  return out;
}

function toTest(level) {
  const expected = outLiteral(oracleBounds(level));
  return { args: [argLiteral(level.slice())], expected, _level: level.slice() };
}

/* -------------------------------- variants -------------------------------- */
const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.';
const INTENT_EDGE = 'Same pattern with the edge case the original hides.';
const INTENT_ADV = 'Same question with adversarial placements that punish shortcuts.';

function buildVariant({ id, seedLabel, intent, suffix, statement, tests, hints }) {
  const clipped = tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
  const first = clipped[0];
  return {
    id,
    seedLabel,
    intent,
    difficulty: 'Medium',
    title: 'Validate Binary Search Tree — ' + suffix + ' (bounds drill)',
    statement,
    signature: cloneSignature(),
    examples: [{ input: inputLine(first.args), output: first.expected, explain: '' }],
    tests: clipped,
    mode: MODE,
    hints: hints.slice(0, 2),
  };
}

export function buildVariants() {
  const rng = mulberry32(hashText(SLUG));

  // v1: fresh seeded mix (2 valid, 2 corrupted-invalid by construction).
  const v1Levels = [];
  for (let n = 0; n < 4; n += 1) {
    const valid = freshValidLevel(rng);
    v1Levels.push(n % 2 === 0 ? valid : corruptByRootDup(valid));
  }
  const v1 = v1Levels.map(toTest);

  // v2: fixed boundary edges (generated selections, not official examples).
  const v2Levels = [
    [1],
    [2, 2, 2],
    [-2147483648, null, 2147483647],
    [3, 1, 5, 0, 2, 4, 6],
    [10, 5, 15, null, 12],
  ];
  const v2 = v2Levels.map(toTest);

  // v3: adversarial same-task shapes (NO rule change).
  const v3Levels = [
    [5, 3, 8, 2, 4, 7, 9],
    [5, 3, 8, 2, 6, 7, 9],
    [1, null, 2, null, 3, null, 4],
    [4, 2, 6, 1, 3, 5, 6],
  ];
  const v3 = v3Levels.map(toTest);

  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh trees',
      intent: INTENT_SAME,
      suffix: 'fresh trees',
      statement:
        'Generated drill (not an official example). Given the root of a binary tree as a level-order array, return true if it is a valid BST: every node must lie strictly inside its inherited open interval (lo,hi), with the left subtree bounded above by the node value and the right subtree bounded below by it. These fresh inputs hold 5 to 7 distinct values between 1 and 30 arranged as balanced trees; half are corrupted by duplicating the root value deep inside. Empty trees are valid. The signature and exact-match judge mode are unchanged.',
      tests: v1,
      hints: [
        'Carry (lo,hi) down: reject when node.val <= lo or node.val >= hi, then split at node.val.',
        'Duplicates always fail because both bounds are strict; a root value repeated anywhere in either subtree is invalid.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      suffix: 'edge cases',
      statement:
        'Generated drill (not an official example). Same BST check with the boundary inputs. Given the root as a level-order array, return true exactly when every node is strictly inside its (lo,hi) window. Inputs include a single node, equal children, 32-bit extremes, a full 7-node valid tree, and a deep violation where 12 sits in the left subtree of 10. The signature and exact comparison are unchanged.',
      tests: v2,
      hints: [
        'A single node is always valid; equal children fail immediately on the strict bound.',
        'Trace the deep case on paper: 12 inherits hi=10 from the root, so 12 >= 10 rejects even though 12 > 5.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial shapes',
      intent: INTENT_ADV,
      suffix: 'adversarial shapes',
      statement:
        'Generated drill (not an official example). Same BST question, no rule change: return true only when every node passes its inherited (lo,hi) window. A balanced-valid control, a grandchild violation (6 under 3 but above root 5), a right-skewed valid chain, and a deep duplicate (6 under bound 6) stress full-window tracking and punish parent-only checks. The signature and exact comparison are unchanged.',
      tests: v3,
      hints: [
        'Compare against ancestors, not just the parent: the grandchild 6 passes its parent 3 yet breaks the root bound 5.',
        'A right chain stays valid only while values keep rising; any dip or repeat breaks strict increase.',
      ],
    }),
  ];
}

export default { SLUG, SIGNATURE, MODE, buildVariants, oracleBounds, oracleInorder };
