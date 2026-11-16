/**
 * clone-graph — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `clone-graph`
 * (Clone Graph, Medium, graph-dfs, shard judge:null).
 * Pure ES module: no DOM, no network, no Math.random, no Date (seeded
 * mulberry32 only; edge literals fixed).
 *
 * TEST PROFILE (documented; no official signature exists): the graph is
 * encoded as an adjacency list of 1-based neighbor vals —
 *   cloneGraph(adjList:int[][]) -> int[][]
 * where adjList[i] lists the neighbors of node i+1, and the expected value
 * is the same adjacency structure with neighbor order ignored
 * (mode 'exact': node set + adjacency sets must match, neighbor
 * ORDER may differ). Multiple valid outputs are accepted: never compare
 * against one exact neighbor ordering.
 *
 * Every expected value is produced at build time by canonicalAdj below
 * (per-node sorted adjacency), an INDEPENDENT normalization of the same
 * operation (not the walkthrough's DFS+map clone run), and every test is
 * cross-checked with isCloneOf (structural equivalence, order-insensitive).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the documented TEST PROFILE.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (neighbor-order-insensitive for this slug).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (adjacency sets must match).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'clone-graph';
export const SIGNATURE = Object.freeze({
  name: 'cloneGraph',
  params: Object.freeze([{ name: 'adjList', type: 'int[][]' }]),
  return: 'int[][]',
});
export const MODE = 'exact';
export const DIFFICULTY = 'Medium';

export const INTENT_SAME = 'Same pattern, different graphs so you reproduce the reasoning.';
export const INTENT_EDGE = 'Same pattern with the edge cases the official example hides.';
export const INTENT_ADVERSARIAL = 'Same task, wide fan-out that punishes recurse-first instincts; no rule change.';

function normAdj(adj) {
  return adj.map((row) => row.slice().sort((a, b) => a - b));
}

/** Canonical form of an adjList (per-node sorted neighbors). */
export function canonicalAdj(adj) {
  if (!Array.isArray(adj)) throw new Error('canonicalAdj: adjList must be an array');
  return normAdj(adj.map((row) => row.slice()));
}

// Independent oracle: is `got` a deep structural clone of `want`?
// Both are adjLists. Returns { ok, reason }.
export function isCloneOf(got, want) {
  if (!Array.isArray(got) || !Array.isArray(want)) {
    return { ok: false, reason: 'both graphs must be adjLists' };
  }
  if (got.length !== want.length) {
    return { ok: false, reason: 'node count ' + got.length + ' != ' + want.length };
  }
  const g = normAdj(got);
  const w = normAdj(want);
  for (let i = 0; i < w.length; i++) {
    if (g[i].length !== w[i].length) {
      return { ok: false, reason: 'node ' + (i + 1) + ' degree ' + g[i].length + ' != ' + w[i].length };
    }
    for (let k = 0; k < w[i].length; k++) {
      if (g[i][k] !== w[i][k]) {
        return { ok: false, reason: 'node ' + (i + 1) + ' adjacency [' + g[i] + '] != [' + w[i] + ']' };
      }
    }
  }
  return { ok: true, reason: 'structurally equal (' + want.length + ' nodes)' };
}

// Seeded PRNG (mulberry32) — deterministic per seed, no Math.random in output choice.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  };
}

function inputLine(signature, args) {
  return signature.params
    .map((param, index) => `${(param && param.name) || 'arg' + index} = ${args[index]}`)
    .join(', ');
}

// One judge test from an adjList. The expected value is the canonical
// (neighbor-sorted) form, and the structural oracle must accept it —
// disagreement throws so a bad literal can never ship as "verified".
function toTest(adj) {
  const expected = JSON.stringify(canonicalAdj(adj));
  const check = isCloneOf(JSON.parse(expected), adj);
  if (!check.ok) throw new Error('clone-graph practice oracle disagreement: ' + check.reason);
  return { args: [JSON.stringify(adj)], expected };
}

function buildVariant({ id, seedLabel, intent, title, statement, adjs, hints }) {
  const tests = adjs.map((a) => toTest(a));
  const first = tests[0];
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title,
    statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(SIGNATURE, first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: hints.slice(0, 2),
  };
}

function buildAll(seed) {
  const rand = rng(seed);

  // V1 — fresh input: 5-node cycle with a chord (seeded neighbor rotation keeps
  // it fresh) plus the official 4-node square and the unrotated base as anchors.
  const base1 = [[2, 5], [1, 3], [2, 4], [3, 5], [4, 1]];
  const v1seeded = base1.map((row) => shuffled(row, rand));
  const v1adjs = [v1seeded, [[2, 4], [1, 3], [2, 4], [1, 3]], base1];

  // V2 — meaningful edges: line graph 1-2-3-4 (deepest recursion, stack depth
  // 4), the single lonely node, and the empty graph.
  const v2adjs = [[[2], [1, 3], [2, 4], [3]], [[]], []];

  // V3 — transfer/adversarial: star centered at 1 (BFS-wide, many map hits on
  // return) with seeded leaf order, a smaller star, and a triangle cycle.
  const leaves = shuffled([2, 3, 4, 5, 6], rand);
  const star6 = [leaves.slice()];
  for (let v = 2; v <= 6; v++) star6.push([1]);
  const v3adjs = [star6, [[2, 3, 4], [1], [1], [1]], [[2, 3], [1, 3], [1, 2]]];

  const mk = (id, seedLabel, intent, suffix, statement, adjs, hints) =>
    buildVariant({
      id,
      seedLabel,
      intent,
      title: 'Clone Graph — ' + suffix + ' (generated, same task)',
      statement,
      adjs,
      hints,
    });

  return [
    mk(
      'v1',
      'cycle plus chord',
      INTENT_SAME,
      'five nodes, cycle plus chord',
      'Clone the connected graph adjList = ' + JSON.stringify(v1seeded) + '. Return the clone of node 1; neighbor order in the output does not matter.',
      v1adjs,
      ['Create the clone before linking its neighbors.', 'A map hit means: reuse, do not recurse.'],
    ),
    mk(
      'v2',
      'edge cases',
      INTENT_EDGE,
      'line graph and lonely nodes',
      'Clone the line graph adjList = ' + JSON.stringify(v2adjs[0]) + '. Recursion runs 4 deep here — the map is what stops any back-edge loop. Single node [[]] returns one lonely clone; empty [] returns null.',
      v2adjs,
      ['Deepest stack in this set: dfs(1)->dfs(2)->dfs(3)->dfs(4).', 'Also check single node [[]] returns one lonely clone.'],
    ),
    mk(
      'v3',
      'star at 1',
      INTENT_ADVERSARIAL,
      'star centered at 1',
      'Clone the star adjList = ' + JSON.stringify(star6) + '. Node 1 links 5 leaves; every leaf links back to an already-cloned center (map hits). Same task, no rule change.',
      v3adjs,
      ['The center is cloned once; all 5 back-edges are map hits.', 'Compare with BFS order: same map, different visit sequence.'],
    ),
  ];
}

// Registry-style entry: slug-gated and shape-gated on the documented TEST
// PROFILE, returns exactly three variants or null. Never throws.
export function buildCloneGraphDrills(problem, signature) {
  try {
    if (!problem || problem.slug !== 'clone-graph') return null;
    const sig = signature || SIGNATURE;
    if (!sig || sig.name !== 'cloneGraph' || sig.return !== 'int[][]') return null;
    if (!Array.isArray(sig.params) || sig.params.length !== 1 || sig.params[0].type !== 'int[][]') return null;
    return buildAll(133);
  } catch {
    return null;
  }
}

export function buildCloneGraphVariants(seed = 133) {
  return buildAll(seed);
}

export const VARIANTS = buildCloneGraphVariants();

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'isCloneOf (neighbor-order-insensitive structural equivalence; frame emitter runs DFS+map preserving input order)',
});
