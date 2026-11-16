/**
 * Lowest Common Ancestor of a BST — portable standalone practice builder.
 *
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Deterministic: FNV-1a slug seed + mulberry32, so the same slug always yields
 * the same three variants.
 *
 * Source grounding:
 * - Slug/id/difficulty/topics from raw/merged_problems.json (id 235, Medium)
 *   and plugin/data/shard-5.json (pattern bst; judge null — TreeNode in/out
 *   cannot be expressed as literal args, so judgeable=false in the live app).
 * - Signature shown is the OFFICIAL one:
 *     lowestCommonAncestor(root: TreeNode, p: TreeNode, q: TreeNode) -> TreeNode
 *   Practice/tests use the honest VALUE projection (pVal/qVal ints, LCA value
 *   int) because the judge literal format cannot pass node pointers. The
 *   displayed example of each variant matches its first test.
 * - Official examples (p=2,q=8 -> 6; p=2,q=4 -> 2; [2,1] p=2,q=1 -> 2) are NOT
 *   reused below; every drill input here is GENERATED (seeded BST builds plus
 *   one fixed chain edge). All inputs respect constraints: >= 2 nodes, unique
 *   values, p != q, p and q present.
 * - Uniqueness: the LCA value is unique whenever p,q exist with distinct
 *   values, so mode "exact" with a single-int expectation is correct and no
 *   tie-breaking is needed.
 *
 * Oracle (independent of the walkthrough adapter):
 * - Adapter (adapter-lca-bst.mjs buildLcaBst) = iterative BST-ordered descend
 *   using < / > comparisons at each node, O(h).
 * - This forge's oracle = generic binary-tree DFS root-to-node paths for p and
 *   q, then last common entry. No ordering comparisons, works on any binary
 *   tree — agreement on BST inputs cross-validates both implementations.
 */

const SLUG = 'lowest-common-ancestor-of-a-binary-search-tree';

export const SIGNATURE = {
  name: 'lowestCommonAncestor',
  params: [
    { name: 'root', type: 'TreeNode' },
    { name: 'p', type: 'TreeNode' },
    { name: 'q', type: 'TreeNode' },
  ],
  return: 'TreeNode',
};

// What the literal-string tests actually carry (values, not pointers).
export const TEST_SIGNATURE = {
  name: 'lowestCommonAncestorValue',
  params: [
    { name: 'root', type: 'TreeNode' },
    { name: 'pVal', type: 'int' },
    { name: 'qVal', type: 'int' },
  ],
  return: 'int',
};
export const MODE = 'exact';

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
      return root;
    }
  }
}

function levelEncode(root) {
  if (!root) return [];
  const out = [];
  const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node === null || node === undefined) {
      out.push(null);
      continue;
    }
    out.push(node.value);
    queue.push(node.left ?? null);
    queue.push(node.right ?? null);
  }
  while (out.length > 0 && out[out.length - 1] === null) out.pop();
  return out;
}

function collectValues(root) {
  const out = [];
  (function walk(n) {
    if (!n) return;
    out.push(n.value);
    walk(n.left);
    walk(n.right);
  })(root);
  return out;
}

function subtreeValues(root, target) {
  function find(n) {
    if (!n) return null;
    if (n.value === target) return n;
    return find(n.left) ?? find(n.right);
  }
  const sub = find(root);
  return sub ? collectValues(sub) : [];
}

function outLiteral(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return '[' + value.map(outLiteral).join(',') + ']';
  return String(value);
}

function inputLine(signature, args) {
  return signature.params.map((param, index) => `${param.name} = ${args[index]}`).join(', ');
}

function cloneSignature(sig) {
  return { name: sig.name, params: sig.params.map((p) => ({ name: p.name, type: p.type })), return: sig.return };
}

/** Independent oracle: DFS paths + last common (no BST comparisons). */
export function oracleLcaValue(level, p, q) {
  if (!Array.isArray(level) || level.length === 0 || level[0] === null) return null;
  let id = 0;
  let cursor = 1;
  const root = { value: level[0], left: null, right: null };
  const queue = [root];
  for (let head = 0; head < queue.length && cursor < level.length; head++) {
    const parent = queue[head];
    for (const side of ['left', 'right']) {
      if (cursor >= level.length) break;
      const value = level[cursor++];
      void id;
      if (value === null) continue;
      const child = { value, left: null, right: null };
      parent[side] = child;
      queue.push(child);
    }
  }
  function pathTo(node, target, trail) {
    if (!node) return null;
    trail.push(node.value);
    if (node.value === target) return trail.slice();
    const l = pathTo(node.left, target, trail);
    if (l) return l;
    const r = pathTo(node.right, target, trail);
    if (r) return r;
    trail.pop();
    return null;
  }
  const pp = pathTo(root, p, []);
  const qq = pathTo(root, q, []);
  if (!pp || !qq) return null;
  let lca = null;
  for (let i = 0; i < Math.min(pp.length, qq.length); i++) {
    if (pp[i] === qq[i]) lca = pp[i];
    else break;
  }
  return lca;
}

function makeTest(level, p, q) {
  const args = [outLiteral(level), String(p), String(q)];
  const expected = String(oracleLcaValue(level.slice(), p, q));
  return { args, expected };
}

export function buildPracticeVariants() {
  const rng = mulberry32(hashText(SLUG));

  // Variant 1 (fresh generated BST, split across the root).
  const pool1 = shuffled(rng, [12, 24, 36, 48, 60, 72, 84, 5, 18, 30, 42, 54, 66, 78, 90]);
  const pick1 = [50, ...pool1.slice(0, 10)];
  let t1 = null;
  for (const v of pick1) t1 = bstInsert(t1, v);
  const lvl1 = levelEncode(t1);
  const leftVals = subtreeValues(t1, t1.left.value).filter((v) => v !== t1.value);
  const rightVals = subtreeValues(t1, t1.right.value).filter((v) => v !== t1.value);
  const p1 = leftVals[randInt(rng, 0, leftVals.length - 1)];
  const q1 = rightVals[randInt(rng, 0, rightVals.length - 1)];
  const extra1a = (() => {
    const lv = leftVals.filter((v) => v !== p1);
    const pick = lv.length ? lv[randInt(rng, 0, lv.length - 1)] : p1;
    return makeTest(lvl1, pick, q1);
  })();
  const extra1b = (() => {
    const rv = rightVals.filter((v) => v !== q1);
    const pick = rv.length ? rv[randInt(rng, 0, rv.length - 1)] : q1;
    return makeTest(lvl1, p1, pick);
  })();
  const main1 = makeTest(lvl1, p1, q1);

  // Variant 2 (ancestor edge: q sits inside p's own subtree, so LCA = p).
  const pool2 = shuffled(rng, [8, 16, 28, 44, 62, 76, 88, 3, 21, 35, 57, 69, 81, 95]);
  let t2 = null;
  for (const v of [40, ...pool2.slice(0, 9)]) t2 = bstInsert(t2, v);
  const lvl2 = levelEncode(t2);
  // Pick p2 as an internal node with a real subtree (>= 2 nodes incl. itself).
  const candidates2 = collectValues(t2).filter((v) => subtreeValues(t2, v).length >= 2);
  const p2 = candidates2[randInt(rng, 0, candidates2.length - 1)];
  const desc2 = subtreeValues(t2, p2).filter((v) => v !== p2);
  const q2 = desc2[randInt(rng, 0, desc2.length - 1)];
  const others2 = collectValues(t2).filter((v) => v !== p2 && !subtreeValues(t2, p2).includes(v));
  const main2 = makeTest(lvl2, p2, q2);
  const extra2 = others2.length
    ? makeTest(lvl2, q2, others2[randInt(rng, 0, others2.length - 1)])
    : makeTest(lvl2, p2, desc2[(desc2.indexOf(q2) + 1) % desc2.length]);
  // Order-swap robustness case: the value answer must not depend on arg order.
  const extra2b = makeTest(lvl2, q2, p2);

  // Variant 3 (transfer/adversarial: degenerate sorted-insert chain — O(n) descent).
  const base3 = randInt(rng, 100, 500);
  const chainVals = [base3, base3 + 7, base3 + 14, base3 + 21, base3 + 28, base3 + 35];
  let t3 = null;
  for (const v of chainVals) t3 = bstInsert(t3, v);
  const lvl3 = levelEncode(t3);
  const p3 = chainVals[1];
  const q3 = chainVals[chainVals.length - 1];
  const main3 = makeTest(lvl3, p3, q3);
  const extra3 = makeTest(lvl3, chainVals[2], chainVals[chainVals.length - 2]);
  // Root-vs-deepest on the same chain: LCA is the root by ancestry.
  const extra3b = makeTest(lvl3, chainVals[0], chainVals[chainVals.length - 1]);

  function variant(id, seedLabel, intent, title, focus, level, main, extras, hints) {
    const tests = [main, ...extras];
    const first = tests[0];
    return {
      id,
      seedLabel,
      intent,
      difficulty: 'Medium',
      title,
      statement:
        `GENERATED drill (${focus}). Same rule as the official problem: given a BST ` +
        `(level-order root = ${outLiteral(level)}) and two node values p and q ` +
        `(both present, p != q), return the VALUE of their lowest common ancestor. ` +
        `A node may be its own descendant. Answer with the single integer value.`,
      signature: cloneSignature(TEST_SIGNATURE),
      officialSignature: cloneSignature(SIGNATURE),
      examples: [{ input: inputLine(TEST_SIGNATURE, first.args), output: first.expected, explain: `LCA value of ${first.args[1]} and ${first.args[2]} in this BST is ${first.expected}.` }],
      tests: tests.map((t) => ({ args: t.args.map(String), expected: String(t.expected) })),
      mode: MODE,
      hints: hints.slice(0, 2),
    };
  }

  const INTENT_SAME = 'Same pattern, different trees so you reproduce the comparison walk.';
  const INTENT_EDGE = 'Same pattern with the edge case the original hides.';
  const INTENT_ADVERSARIAL = 'Same task with a degenerate chain that forces O(n) descent.';

  return [
    variant(
      'v1',
      'fresh split',
      INTENT_SAME,
      'LCA in BST — Fresh Split (generated)',
      'fresh generated input; first split is the root',
      lvl1, main1, [extra1a, extra1b],
      [
        'Compare p and q against the current node: both smaller goes left, both larger goes right.',
        'The first node where the targets disagree (or that equals a target) is the LCA.',
      ]
    ),
    variant(
      'v2',
      'ancestor edge',
      INTENT_EDGE,
      'LCA in BST — Ancestor Edge (generated)',
      'meaningful edge: the LCA equals p itself',
      lvl2, main2, [extra2, extra2b],
      [
        'A node counts as its own descendant — if the walk lands on p or q, it stops there.',
        'When q sits inside the subtree rooted at p, the answer is p, no deeper walk needed.',
      ]
    ),
    variant(
      'v3',
      'degenerate chain',
      INTENT_ADVERSARIAL,
      'LCA in BST — Degenerate Chain (generated)',
      'transfer/adversarial: sorted-insert chain forces O(n) descent',
      lvl3, main3, [extra3, extra3b],
      [
        'BST order still decides each step; a chain just never branches.',
        'The smaller of the two targets (in chain order) is an ancestor of the larger, so it is the LCA.',
      ]
    ),
  ];
}

export const PRACTICE_INFO = Object.freeze({
  slug: 'lowest-common-ancestor-of-a-binary-search-tree',
  mode: MODE,
  difficulty: 'Medium',
  variantCount: 3,
  ruleChange: false,
  oracle: 'oracleLcaValue (DFS root-to-node paths + last common; no BST comparisons)',
});

export default { SIGNATURE, TEST_SIGNATURE, MODE, buildPracticeVariants, oracleLcaValue };
