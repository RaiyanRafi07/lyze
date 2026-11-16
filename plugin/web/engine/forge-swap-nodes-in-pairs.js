/**
 * swap-nodes-in-pairs — portable standalone practice builder.
 *
 * Produces exactly 3 deterministic variants for slug `swap-nodes-in-pairs`
 * (Swap Nodes in Pairs, Medium, swapPairs(ListNode)->ListNode, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * swapPairsPracticeOracle below (pure adjacent-pair value swap, no pointers),
 * an INDEPENDENT implementation of the same operation (not the walkthrough's
 * dummy + prev-seam + in-place link-flip frame emitter).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (result list deep-equals expected list).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'swap-nodes-in-pairs';
export const SIGNATURE = Object.freeze({
  name: 'swapPairs',
  params: Object.freeze([{ name: 'head', type: 'ListNode' }]),
  return: 'ListNode',
});
export const MODE = 'exact';
export const DIFFICULTY = 'Medium';

export const INTENT_SAME = 'Same task, different numbers so you reproduce the certify-then-swap reasoning.';
export const INTENT_EDGE = 'Same task with the edge cases the worked examples hide.';
export const INTENT_ADVERSARIAL = 'Same task, adversarial shapes: longer lists and duplicate values that punish value-based thinking.';

/**
 * INDEPENDENT oracle: pure adjacent-pair swap on a value array (no pointers).
 * Swaps values[0]<->values[1], values[2]<->values[3], ...; a leftover stays.
 * Different method from the walkthrough (dummy + prev seam + in-place link flips).
 */
export function swapPairsPracticeOracle(values) {
  const out = values.slice();
  for (let i = 0; i + 1 < out.length; i += 2) {
    const t = out[i];
    out[i] = out[i + 1];
    out[i + 1] = t;
  }
  return out;
}

const lit = (arr) => JSON.stringify(arr);

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

function makeCase(values) {
  return { args: [lit(values)], expected: lit(swapPairsPracticeOracle(values)) };
}

function buildVariant({ id, seedLabel, intent, title, statement, cases, hints }) {
  const tests = cases
    .map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
    .slice(0, 5);
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

/* ---------------- entry point ---------------- */

export function buildSwapNodesInPairsVariants() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'sourced + fresh',
      intent: INTENT_SAME,
      title: 'Swap Nodes in Pairs — sourced + fresh (same task)',
      statement:
        'Given the head of a linked list, swap every two adjacent nodes and return the head of the modified list. Only nodes themselves may change, not their values. The first two inputs below are the official examples; the next two are fresh same-task numbers.',
      cases: [
        // Sourced shard examples, verbatim and in order.
        { args: ['[1,2,3,4]'], expected: '[2,1,4,3]' },
        { args: ['[1,2,3]'], expected: '[2,1,3]' },
        // Generated same-task additions (expected by the oracle at build time).
        makeCase([5, 4, 3, 2, 1, 0]),
        makeCase([9, 7]),
      ],
      hints: [
        'Certify the pair BEFORE rewiring: both prev.next and prev.next.next must exist, or the leftover stays as it is.',
        'Rewire in order: first.next skips second, second.next takes first, then prev.next takes second.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Swap Nodes in Pairs — edge cases (same task)',
      statement:
        'Same pair-swap task on the boundary inputs the examples hide. An empty list and a single node never move, a two-node list is one clean swap, an odd list keeps its tail, and the 0/100 constraint extremes swap like any other pair. The signature and exact comparison are unchanged.',
      cases: [
        makeCase([]),
        makeCase([1]),
        makeCase([1, 2]),
        makeCase([1, 2, 3, 4, 5]),
        makeCase([0, 100]),
      ],
      hints: [
        'Empty and single-node inputs must return the identical list: your loop guard should exit before touching any link.',
        'The 5-node case exercises the leftover path: the tail node keeps its original successor (null).',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial pairs',
      intent: INTENT_ADVERSARIAL,
      title: 'Swap Nodes in Pairs — adversarial pairs (same task)',
      statement:
        'SAME TASK, harder shapes: four full pairs plus a descending 9-node list with a leftover, and duplicate boundary values that expose value-vs-identity bugs. Track node identity, never values: only next pointers move. Identical signature and question — only the numbers fight back.',
      cases: [
        makeCase([1, 2, 3, 4, 5, 6, 7, 8]),
        makeCase([9, 8, 7, 6, 5, 4, 3, 2, 1]),
        makeCase([0, 0, 100, 100, 0, 0]),
        makeCase([100, 0, 100, 0]),
      ],
      hints: [
        'Track node identity, not values: the duplicates case passes only if links (not values) move.',
        'The 9-node tail case fails if your probe counts the seam node as part of the pair.',
      ],
    }),
  ];
}

/** Live-forge entry shape: `buildVariants(problem)` scoped to this slug. */
export function buildVariants(problem) {
  try {
    if (!problem || typeof problem !== 'object') return [];
    if (problem.slug !== SLUG) return [];
    const signature = problem?.judge?.signature;
    if (!signature || signature.name !== SIGNATURE.name) return [];
    if (signature.return !== SIGNATURE.return) return [];
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return [];
    if (signature.params[0]?.type !== 'ListNode') return [];
    const variants = buildSwapNodesInPairsVariants();
    if (!Array.isArray(variants) || variants.length !== 3) return [];
    return variants;
  } catch {
    return [];
  }
}

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'swapPairsPracticeOracle (pure adjacent-pair value swap; walkthrough uses dummy + prev seam + in-place link flips)',
});
