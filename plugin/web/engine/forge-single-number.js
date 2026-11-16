/**
 * single-number — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `single-number`
 * (Single Number, Easy, singleNumber(int[])->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed literal inputs; every expected value is computed at build time by
 * countSingle below (frequency-map counting — no bitwise operations), an
 * INDEPENDENT implementation of the same operation (not the walkthrough's
 * XOR-accumulator frame emitter), so adapter/oracle bugs cannot silently agree.
 *
 * Staged source: .workers/jobs/question-owners-150/single-number/practice.js
 * (statements, hints, counting oracle, curated sets anchored on all three
 * official examples); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'single-number';

export const SIGNATURE = Object.freeze({
  name: 'singleNumber',
  params: Object.freeze([{ name: 'nums', type: 'int[]' }]),
  return: 'int',
});

export const MODE = 'exact';
export const DIFFICULTY = 'Easy';

export const INTENT_SAME = 'Same XOR task on fresh pair values so you reproduce the fold reasoning.';
export const INTENT_EDGE = 'Same task with the boundary inputs the worked example hides.';
export const INTENT_ADVERSARIAL = 'Same task with pairs split far apart so adjacency tricks fail; no rule change.';

/** INDEPENDENT reference oracle: frequency-map counting. No bitwise operations. */
export function countSingle(nums) {
  if (!Array.isArray(nums) || nums.length === 0) return null;
  const counts = new Map();
  for (const v of nums) counts.set(v, (counts.get(v) || 0) + 1);
  for (const [k, c] of counts) if (c === 1) return k;
  return null;
}

const argLiteral = (nums) => '[' + nums.join(',') + ']';
const outLiteral = (v) => String(v);

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

function toTest(nums) {
  const single = countSingle(nums);
  if (single === null) throw new Error('practice generator produced input with no single ' + JSON.stringify(nums));
  return { args: [argLiteral(nums)], expected: outLiteral(single) };
}

function buildVariant({ id, seedLabel, intent, title, statement, rows, hints }) {
  const tests = rows.map(toTest).slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
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

export function buildSingleNumberPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh pairs same xor',
      intent: INTENT_SAME,
      title: 'Single Number — Fresh Pairs (same-task drill)',
      statement:
        'Given a non-empty integer array where every element appears twice except one, return the single one. This set uses fresh pair values and orders anchored on the official example nums = [2,2,1]. Fold xor ^= nums[i] over every element with linear time and constant space.',
      rows: [
        [2, 2, 1],
        [5, 3, 5],
        [9, 9, 4, 7, 4],
        [10, 20, 10],
      ],
      hints: [
        'XOR every element: paired values cancel since a paired with itself gives 0.',
        'Seed the accumulator at 0 and fold each element exactly once; order does not matter.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edges zeros negatives',
      intent: INTENT_EDGE,
      title: 'Single Number — Edges: Zeros and Negatives (same-task drill)',
      statement:
        'Same single-number task on boundary inputs: the lone element alone, zero pairs, negative values, and the constraint bounds -30000 and 30000. XOR is bitwise so negatives and zeros need no special case. Anchored on the official example nums = [1].',
      rows: [
        [1],
        [0, 1, 0],
        [-1, -1, -2],
        [-30000, -30000, 30000],
      ],
      hints: [
        'Zero pairs cancel too; a lone 0 still returns 0.',
        'Negatives work the same way bitwise; do not branch on sign.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial split pairs',
      intent: INTENT_ADVERSARIAL,
      title: 'Single Number — Adversarial Split Pairs (same-task drill)',
      statement:
        'Same single-number task with no rule change: pairs sit far apart and the single moves to the front, middle, and end, so comparing only neighbours fails. Anchored on the official example nums = [4,1,2,1,2]. One linear XOR pass over every element still isolates the single.',
      rows: [
        [4, 1, 2, 1, 2],
        [1, 1, 2, 2, 3],
        [7, 3, 7],
        [-5, 3, -5],
      ],
      hints: [
        'Do not compare neighbours; the partner of nums[i] can sit anywhere.',
        'One linear pass folding xor accumulates every ordering.',
      ],
    }),
  ];
}

// Staged-compat alias: same builder, family-style name.
export const buildPracticeVariants = buildSingleNumberPractice;

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'countSingle (frequency-map counting; frame emitter uses the XOR fold)',
});

export default buildSingleNumberPractice;
