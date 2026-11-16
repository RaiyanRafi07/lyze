/**
 * Invert Binary Tree — portable standalone practice builder (generated drills).
 *
 * Generates 3 deterministic variants with the ACTUAL judge signature:
 *   invertTree(root: TreeNode) -> TreeNode, mode "exact".
 * All inputs/outputs are generated level-order literals (never official examples).
 * Official examples: root=[4,2,7,1,3,6,9]->[4,7,2,9,6,3,1], [2,1,3]->[2,3,1], []->[].
 * None of the generated arrays below copy those inputs.
 *
 * Independent oracle: iterative BFS child-swap + level-order serialization.
 * The integrated adapter uses recursive DFS pre-order swap; this builder
 * deliberately uses a different traversal (queue) so expected values are
 * independently derived. A second recursive oracle cross-checks in selfcheck.
 *
 * Pure, dependency-free, deterministic (FNV-1a + mulberry32 seeded by slug).
 * No Math.random, no Date, no network, no DOM. Node or browser compatible.
 */

// ---------------------------------------------------------------- signature --
export const SIGNATURE = {
  name: 'invertTree',
  params: [{ name: 'root', type: 'TreeNode' }],
  return: 'TreeNode',
};
export const MODE = 'exact';
export const SLUG = 'invert-binary-tree';

function cloneSignature() {
  return {
    name: SIGNATURE.name,
    params: SIGNATURE.params.map((p) => ({ name: p.name, type: p.type })),
    return: SIGNATURE.return,
  };
}

// ------------------------------------------------------------------ seeding --
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

// ----------------------------------------------------------------- literals --
function outLiteral(value) {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return '[' + value.map(outLiteral).join(',') + ']';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(value);
  return String(value);
}
function argLiteral(level) {
  return outLiteral(level.slice());
}
function inputLine(signature, args) {
  return signature.params.map((p, i) => `${(p && p.name) || 'arg' + i} = ${args[i]}`).join(', ');
}

// ------------------------------------------------------------ oracle (BFS) --
function levelBuild(level) {
  if (!Array.isArray(level) || level.length === 0) return { root: null, nodes: [] };
  if (level[0] === null || level[0] === undefined) return { root: null, nodes: [] };
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

function levelSerialize(root) {
  if (root === null) return [];
  const out = [];
  const queue = [root];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === null) { out.push(null); continue; }
    out.push(cur.value);
    queue.push(cur.left, cur.right);
  }
  while (out.length > 0 && out[out.length - 1] === null) out.pop();
  return out;
}

/** Independent oracle: iterative queue swap (NOT the adapter's recursion). */
export function oracleInvertLevel(level) {
  const { root } = levelBuild(level.slice());
  if (root === null) return [];
  const queue = [root];
  while (queue.length > 0) {
    const n = queue.shift();
    const tmp = n.left;
    n.left = n.right;
    n.right = tmp;
    if (n.left !== null) queue.push(n.left);
    if (n.right !== null) queue.push(n.right);
  }
  return levelSerialize(root);
}

/** Second oracle for cross-check: recursive swap on a fresh build. */
export function oracleInvertLevelRecursive(level) {
  const { root } = levelBuild(level.slice());
  (function rec(n) {
    if (n === null) return;
    const t = n.left; n.left = n.right; n.right = t;
    rec(n.left); rec(n.right);
  })(root);
  return levelSerialize(root);
}

function toTest(level) {
  const lvl = level.slice();
  return { args: [argLiteral(lvl)], expected: outLiteral(oracleInvertLevel(lvl)) };
}

function buildVariant({ id, seedLabel, intent, title, statement, tests, hints }) {
  const capped = tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
  const first = capped[0];
  return {
    id, seedLabel, intent, difficulty: 'Easy',
    title, statement,
    signature: cloneSignature(),
    examples: [{ input: inputLine(cloneSignature(), first.args), output: first.expected, explain: '' }],
    tests: capped, mode: MODE, hints: hints.slice(0, 2),
  };
}

// ----------------------------------------------------------------- builders --
const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.';
const INTENT_EDGE = 'Same pattern with the edge case the original hides.';
const INTENT_ADV = 'Same question with adversarial placements that punish one-side shortcuts.';

function freshLevels(rng) {
  const out = [];
  while (out.length < 4) {
    const size = randInt(rng, 3, 7);
    const level = [];
    for (let k = 0; k < size; k += 1) {
      if (k > 0 && rng() < 0.18) level.push(null);
      else level.push(randInt(rng, -9, 9));
    }
    if (level[0] === null || level[0] === undefined) level[0] = randInt(rng, 1, 9);
    // Avoid exact official inputs.
    const key = JSON.stringify(level);
    if (key === '[4,2,7,1,3,6,9]' || key === '[2,1,3]' || key === '[]') continue;
    out.push(level);
  }
  return out;
}

export function buildInvertVariants() {
  const rng = mulberry32(hashText(SLUG));
  const v1levels = freshLevels(rng);
  const v1 = v1levels.map(toTest);

  // Fixed edges: empty, single, left-skewed chain, right-skewed chain, sparse with holes.
  const v2levels = [
    [],
    [5],
    [3, 2, null, 1],
    [1, null, 2, null, 3],
    [6, -4, 8, null, 0, 7, null],
  ];
  const v2 = v2levels.map(toTest);

  // Adversarial same-task placements (no rule change): duplicate-heavy,
  // near-mirror input, deep right chain, mixed negatives with holes.
  // Signature and exact comparison unchanged.
  const v3levels = [
    [2, 2, 2, 2, 2],
    [4, 7, 2, 9, 6, 3, 1],
    [1, null, -5, 3, null, null, 9],
    [10, 5, 15, 3, 7, null, 18, 1, null, 6],
  ];
  const v3 = v3levels.map(toTest);

  const make = (id, seedLabel, intent, suffix, statement, tests, hints) =>
    buildVariant({ id, seedLabel, intent, title: `Invert Binary Tree — ${suffix} (mirror drill)`, statement, tests, hints });

  return [
    make('v1', 'fresh trees', INTENT_SAME, 'fresh trees',
      'Given the root of a binary tree as a level-order array, invert the tree and return its root as a level-order array with trailing empty positions omitted. These fresh inputs are generated seeded trees of 3 to 7 slots with values between -9 and 9 (generated drills, not official examples). The signature and exact-match judge mode are unchanged.',
      v1,
      ['Save the left child before overwriting it, then point left at right and right at the saved node.', 'Recurse into both swapped children; mirroring only the top node leaves the lower levels unchanged.']),
    make('v2', 'edge cases', INTENT_EDGE, 'edge cases',
      'Same inversion task with the boundary inputs. Given the root as a level-order array, return the mirrored level-order array. Inputs are generated drills (not official examples) and include the empty tree, a single node, a left-only chain, a right-only chain, and a sparse tree with holes and negative values. The signature and exact comparison are unchanged.',
      v2,
      ['An empty tree mirrors to an empty array with no swaps.', 'A chain flips sides: every left-only link becomes right-only after the walk.']),
    make('v3', 'adversarial shapes', INTENT_ADV, 'adversarial shapes',
      'Same inversion question with adversarial placements that punish one-side shortcuts. Given the root as a level-order array, return the mirrored level-order array. Duplicate-heavy runs, an already near-mirrored input, a deep right chain with mixed signs, and a wider 10-node tree stress the full both-sides walk. No rule change: the signature and exact comparison are unchanged.',
      v3,
      ['Duplicates still swap positions even when values look identical; check structure, not values.', 'Do not stop after the root swap — each descendant must exchange its own children.']),
  ];
}

export default { buildInvertVariants, oracleInvertLevel, oracleInvertLevelRecursive, SIGNATURE, MODE };
