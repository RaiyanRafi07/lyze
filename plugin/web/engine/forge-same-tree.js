/**
 * Same Tree — portable standalone practice builder (staged, additive).
 *
 * Produces exactly 3 deterministic variants for slug `same-tree` reusing the
 * official judge signature `isSameTree(TreeNode p, TreeNode q) -> boolean`.
 * No imports, no DOM, no network. Deterministic: FNV-1a(slug) + mulberry32.
 *
 * - args are LeetCode-style literal strings: level-order arrays like "[1,2,3]".
 * - expected values are literal strings "true"/"false" (judge mode `exact`).
 * - examples[0] equals tests[0] (input line + expected output).
 * - Every variant carries exactly 2 hints.
 * - No official examples are reused as generated tests (fresh values/shapes).
 * - Notes never claim tree B is drawn: B-side pairs are queue entries named by
 *   value/position, rendered by the host as labels; a separate worker owns drawing.
 *
 * Oracle discipline (independent of the adapter's iterative pair QUEUE):
 * own heap-index level decoder + recursive structural compare. The adapter
 * walks an explicit queue of pairs; this oracle recurses on decoded nodes and
 * cross-checks via trimmed BFS re-serialization equality. No treeInput reuse,
 * no queue reuse.
 */

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

function cloneSignature() {
  return {
    name: 'isSameTree',
    params: [
      { name: 'p', type: 'TreeNode' },
      { name: 'q', type: 'TreeNode' },
    ],
    return: 'boolean',
  };
}

/* ---------------- level-tree helpers (own decoder, no adapter reuse) -------- */

function decodeLevel(level) {
  if (!Array.isArray(level) || level.length === 0) return null;
  if (level[0] === null || level[0] === undefined) return null;
  const nodes = level.map((v) => (v === null || v === undefined ? null : { val: v, left: null, right: null }));
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (node === null) continue;
    const li = 2 * i + 1;
    const ri = 2 * i + 2;
    if (li < nodes.length && nodes[li] !== null) node.left = nodes[li];
    if (ri < nodes.length && nodes[ri] !== null) node.right = nodes[ri];
  }
  return nodes[0];
}

function sameRecursive(a, b) {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (a.val !== b.val) return false;
  return sameRecursive(a.left, b.left) && sameRecursive(a.right, b.right);
}

function mirrorRecursive(a, b) {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (a.val !== b.val) return false;
  return mirrorRecursive(a.left, b.right) && mirrorRecursive(a.right, b.left);
}

/** Trimmed BFS re-serialization (trailing nulls removed); independent cross-check. */
function serializeLevel(root) {
  if (root === null) return [];
  const out = [];
  const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node === null) {
      out.push(null);
      continue;
    }
    out.push(node.val);
    queue.push(node.left);
    queue.push(node.right);
  }
  while (out.length > 0 && out[out.length - 1] === null) out.pop();
  return out;
}

function oracleSame(levelA, levelB) {
  const a = decodeLevel(levelA);
  const b = decodeLevel(levelB);
  const rec = sameRecursive(a, b);
  const ser = JSON.stringify(serializeLevel(a)) === JSON.stringify(serializeLevel(b));
  if (rec !== ser) throw new Error('oracle disagreement: recursive vs serialization');
  return rec;
}

function oracleMirror(levelA, levelB) {
  return mirrorRecursive(decodeLevel(levelA), decodeLevel(levelB));
}

/* ---------------- literals -------------------------------------------------- */

function levelLiteral(level) {
  return JSON.stringify(level);
}

function boolLiteral(value) {
  return value ? 'true' : 'false';
}

function inputLine(signature, args) {
  return signature.params.map((param, index) => `${param.name} = ${args[index]}`).join(', ');
}

/* ---------------- variant shape --------------------------------------------- */

const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.';
const INTENT_EDGE = 'Same pattern with the edge case the original hides.';
const INTENT_TWIST = 'Same signature, different question: the twist tests whether the idea transfers.';

function buildVariant(spec) {
  const tests = spec.tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
  const first = tests[0];
  return {
    id: spec.id,
    seedLabel: spec.seedLabel,
    intent: spec.intent,
    difficulty: 'Easy',
    title: `Same Tree — ${spec.suffix} (pair-queue drill)`,
    statement: spec.statement,
    signature: cloneSignature(),
    examples: [{ input: inputLine(cloneSignature(), first.args), output: first.expected, explain: '' }],
    tests,
    mode: 'exact',
    hints: spec.hints.slice(0, 2),
  };
}

/* ---------------- generators ------------------------------------------------- */

function randLevel(rng, len, lo, hi, nullProb) {
  const level = [];
  for (let i = 0; i < len; i += 1) {
    if (i === 0) {
      level.push(randInt(rng, lo, hi));
      continue;
    }
    if (rng() < nullProb) level.push(null);
    else level.push(randInt(rng, lo, hi));
  }
  return level;
}

function mutateLevel(rng, base, lo, hi) {
  const out = base.slice();
  if (out.length === 0) return [randInt(rng, lo, hi)];
  const idx = randInt(rng, 0, out.length - 1);
  if (idx === 0 && out[idx] === null) {
    out[idx] = randInt(rng, lo, hi);
    return out;
  }
  if (out[idx] === null) {
    out[idx] = randInt(rng, lo, hi);
  } else if (rng() < 0.5) {
    let v = randInt(rng, lo, hi);
    if (v === out[idx]) v = out[idx] + 1;
    out[idx] = v;
  } else if (idx !== 0) {
    out[idx] = null;
  } else {
    out[idx] = out[idx] + 1;
  }
  return out;
}

export function buildSameTreeVariants() {
  const rng = mulberry32(hashText('same-tree'));

  /* v1 — fresh seeded pairs (same question, new numbers/shapes). */
  const v1rows = [];
  for (let n = 0; n < 4; n += 1) {
    const base = randLevel(rng, randInt(rng, 3, 7), 1, 9, 0.25);
    let other;
    if (n % 2 === 0) {
      other = base.slice();
    } else {
      other = null;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const cand = mutateLevel(rng, base, 1, 9);
        // Only accept mutations that change the decoded tree (phantom edits
        // under a null parent look different as literals but compare equal).
        if (JSON.stringify(cand) !== JSON.stringify(base) && !oracleSame(base, cand)) {
          other = cand;
          break;
        }
      }
      if (other === null) {
        other = base.slice();
        other[0] = base[0] + 100; // root is always attached: guaranteed visible change
      }
    }
    v1rows.push([base, other]);
  }
  // Guarantee at least one true and one false in v1 (regenerate deterministically if skewed).
  const v1flags = v1rows.map(([a, b]) => oracleSame(a, b));
  if (v1flags.every(Boolean) || v1flags.every((v) => !v)) {
    v1rows[1] = [v1rows[1][0].slice(), mutateLevel(rng, v1rows[1][0], 20, 29)];
  }
  const v1tests = v1rows.map(([a, b]) => ({
    args: [levelLiteral(a), levelLiteral(b)],
    expected: boolLiteral(oracleSame(a, b)),
  }));

  /* v2 — fixed boundary edges (no official triples reused; fresh values). */
  const v2rows = [
    [[], []],
    [[], [4]],
    [[6], [9]],
    [[5, 3], [5, null, 3]],
  ];
  const v2tests = v2rows.map(([a, b]) => ({
    args: [levelLiteral(a), levelLiteral(b)],
    expected: boolLiteral(oracleSame(a, b)),
  }));

  /* v3 — RULE CHANGE twist: mirror check under the same signature. */
  const v3rows = [
    [[4, 2, 7], [4, 7, 2]],
    [[6, 1], [6, null, 1]],
    [[5, 2, 6], [5, 2, 6]],
    [[8, 3, 9, 1], [8, 9, 3, null, null, null, 1]],
  ];
  const v3tests = v3rows.map(([a, b]) => ({
    args: [levelLiteral(a), levelLiteral(b)],
    expected: boolLiteral(oracleMirror(a, b)),
  }));

  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh pairs',
      intent: INTENT_SAME,
      suffix: 'fresh pairs',
      statement:
        'Given two binary trees as level-order arrays p and q (null marks a missing child), return true when they are structurally identical with equal values at every paired position. Walk queued pairs in order: both null holds, one null or a value gap fails, otherwise queue left-left and right-right. These fresh inputs use 3 to 7 entries with values 1 to 9. The signature and exact-match judge mode are unchanged.',
      tests: v1tests,
      hints: [
        'Check both-null first, then one-null, then values — in that order — before touching children.',
        'Only after a value match do the left-left and right-right pairs join the queue.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      suffix: 'edge cases',
      statement:
        'Same same-tree question with the boundary inputs. Given level-order arrays p and q, return true only for structurally identical trees with equal values. Inputs include two empty trees, one empty tree against a single node, two differing single nodes, and a left-child versus right-child shape split. The signature and exact comparison are unchanged.',
      tests: v2tests,
      hints: [
        'Two empty trees are the same: the queue starts as one (null, null) pair that holds.',
        'A left child on one side against a right child on the other is a shape mismatch even when the values match.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'twist, same signature',
      intent: INTENT_TWIST,
      suffix: 'twist: mirror check',
      statement:
        'RULE CHANGE: return true when q is the left-right mirror of p (same values, children swapped at every node), not when the trees are identical. For example p = [4,2,7] mirrors to q = [4,7,2] (true), while p = [5,2,6] against itself is false because its children are not symmetric. Keep the same isSameTree method name, parameter types, and boolean return; only the acceptance rule changes. Judge mode stays exact.',
      tests: v3tests,
      hints: [
        'Compare outer pairs against inner pairs: p.left with q.right and p.right with q.left.',
        'An identical asymmetric tree usually fails the mirror test — do not reuse the same-tree pairing.',
      ],
    }),
  ];
}

export default buildSameTreeVariants;
