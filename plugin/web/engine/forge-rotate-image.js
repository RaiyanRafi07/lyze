// Practice variations for rotate-image. Same real method profile as the raw
// problem snippets: rotate(matrix: int[][]) -> void (in place).
// The shard record (plugin/data/shard-5.json, id 48) keeps judge: null, so the
// tests below use a PROPOSED mutation profile: run rotate on the input literal,
// compare the POST-CALL matrix to the expected literal with mode "exact".
// Labeled as generated exercises; no official data is invented or changed.
// Deterministic: every matrix is a fixed literal below, and every expected
// value is produced by two independent oracles that must agree (reference
// 4-way layer rotation vs transpose+reverse copy); the module throws at import
// on any mismatch.
//
// Shape follows plugin/web/engine/variants.js conventions so the integrator can
// register buildRotateImageDrills in BUILDERS['matrix'] (slug-gated + shape-gated):
//   buildRotateImageDrills(problem, signature, rng) -> [v1, v2, v3] | null
// v1 fresh data, v2 hidden edges, v3 transfer/adversarial (honestly labeled:
// the rule never changes, output stays the mutated matrix).
import { rotateImage, oracleRotate } from './rotate-image-adapter.js';

export const SIGNATURE = {
  name: 'rotate',
  params: [{ name: 'matrix', type: 'int[][]' }],
  return: 'void',
};

// All literals below respect the real constraints: square, 1 <= n <= 20,
// -1000 <= cell <= 1000. (Walkthrough rendering additionally caps at 6x6;
// practice matrices stay within 1..5 so every test is also renderable.)
const MATRICES = {
  // v1 fresh: new data at the same sizes as the two official examples.
  fresh3: [[9, 4, 7], [2, 0, 8], [6, 1, 3]],
  fresh4: [[16, 2, 9, 4], [7, 5, 11, 1], [13, 8, 6, 12], [3, 15, 10, 14]],
  rect2: [[-4, 11], [7, -9]],
  // v2 edges: smallest legal sizes plus a 5x5 with two rings.
  one: [[42]],
  seq2: [[1, 2], [3, 4]],
  seq5: [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15],
    [16, 17, 18, 19, 20],
    [21, 22, 23, 24, 25],
  ],
  // v3 adversarial/transfer: uniform values hide index bugs; sign extremes and a
  // full-range 5x5 stress the mirror arithmetic; a near-rotation trap.
  uniform3: [[7, 7, 7], [7, 7, 7], [7, 7, 7]],
  extremes4: [[-1000, 1000, -1000, 1000], [1000, -1000, 1000, -1000], [-500, 500, -999, 999], [0, -1, 1, -1000]],
  distinct5: [
    [31, -12, 407, 0, 88],
    [-1000, 55, 19, -73, 1000],
    [4, 512, -256, 77, 9],
    [63, -8, 200, -400, 11],
    [17, 23, -91, 64, 5],
  ],
  center3: [[1, 2, 3], [4, 999, 6], [7, 8, 9]],
  neg3: [[-1, -2, -3], [-4, -5, -6], [-7, -8, -9]],
};

const matrixLiteral = (m) => JSON.stringify(m);
const clone = (m) => m.map((row) => row.slice());

// One mutation-profile test from a matrix. Both oracles must agree;
// disagreement throws so a bad literal can never ship as "verified".
// args[0] is the PRE-call matrix; expected is the POST-call matrix literal.
function toTest(matrix) {
  const viaRef = clone(matrix);
  rotateImage(viaRef);
  const viaOracle = oracleRotate(matrix);
  if (JSON.stringify(viaRef) !== JSON.stringify(viaOracle)) {
    throw new Error('rotate-image practice oracle disagreement on ' + matrixLiteral(matrix));
  }
  // The oracle must not have mutated its input (it documents a copy algorithm).
  if (JSON.stringify(matrix) !== JSON.stringify(clone(matrix))) {
    throw new Error('oracleRotate mutated its input');
  }
  return { args: [matrixLiteral(matrix)], expected: matrixLiteral(viaRef) };
}

function cloneSignature() {
  return {
    name: SIGNATURE.name,
    params: SIGNATURE.params.map((p) => ({ name: p.name, type: p.type })),
    return: SIGNATURE.return,
  };
}

// Proposed mutation execution profile (additive; shard judge is null).
const PROFILE = {
  id: 'in-place-mutation',
  mode: 'exact',
  compare: 'post-call matrix deep-equal',
  note: 'Proposed additive profile: call rotate(matrix), then compare the mutated matrix to expected with exact literal equality. Shard judge is null; integrator paces.',
};

function makeVariant(id, seedLabel, intent, titleSuffix, statement, matrices, hints) {
  const tests = matrices.map((m) => toTest(m));
  const first = tests[0];
  return {
    id,
    seedLabel,
    intent,
    difficulty: 'Medium',
    title: 'Rotate Image — ' + titleSuffix + ' (generated, same in-place task)',
    statement,
    signature: cloneSignature(),
    profile: { ...PROFILE },
    examples: [{ input: 'matrix = ' + first.args[0], output: first.expected, explain: '' }],
    tests,
    mode: 'exact',
    hints: hints.slice(0, 2),
  };
}

const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.';
const INTENT_EDGE = 'Same pattern with the edge case the original hides.';
const INTENT_ADVERSARIAL = 'Same task, hostile values: the rule is unchanged, index bugs hide.';

function v1Fresh() {
  return makeVariant(
    'v1', 'fresh matrices', INTENT_SAME, 'fresh matrices',
    'Given a square n x n matrix, rotate it 90 degrees clockwise in place (mutate the input, return nothing). GENERATED exercises: these fresh 3x3, 4x4, and 2x2 matrices use the same signature and the same proposed post-call exact comparison as the packet.',
    [MATRICES.fresh3, MATRICES.fresh4, MATRICES.rect2, MATRICES.fresh3.map((r) => r.slice().reverse())],
    ['Rotate ring by ring with one saved tmp per 4-cycle: left to top, bottom to left, right to bottom, saved top to right.', 'Mirror indices always use n-1: left is (n-1-i, l) and bottom is (last, n-1-i).'],
  );
}

function v2Edge() {
  return makeVariant(
    'v2', 'edge cases', INTENT_EDGE, 'edge cases',
    'Same in-place clockwise rotation with the boundary sizes. GENERATED: a 1x1 matrix needs zero groups (already rotated), 2x2 is a single ring with one group, and 5x5 exercises two rings plus a center cell that must never move. Same signature and proposed post-call exact comparison.',
    [MATRICES.one, MATRICES.seq2, MATRICES.seq5, MATRICES.center3],
    ['n = 1 means floor(1/2) = 0 layers: the code must simply do nothing, not index out of bounds.', 'The center cell of an odd-n matrix belongs to no ring: loops with i < last and l < n/2 leave it untouched.'],
  );
}

function v3Adversarial() {
  return makeVariant(
    'v3', 'adversarial values', INTENT_ADVERSARIAL, 'adversarial values',
    'Same in-place clockwise rotation with hostile values. GENERATED: a uniform matrix passes even with wrong indices (so it only checks you do not crash or allocate wrongly), sign extremes at +-1000 probe copy fidelity, and a full-range 5x5 catches any single mirrored-index slip. The rule and output shape are unchanged.',
    [MATRICES.uniform3, MATRICES.extremes4, MATRICES.distinct5, MATRICES.neg3],
    ['Uniform values cannot catch swapped mirrors: verify index math on distinct-valued matrices.', 'Transpose-then-reverse-each-row is a valid cross-check oracle, but the required solution stays the single-pass 4-way cycle.'],
  );
}

// Registry-style entry mirroring variants.js BUILDERS conventions:
// slug-gated and shape-gated, returns exactly three variants or null. Never throws.
export function buildRotateImageDrills(problem, signature) {
  try {
    if (!problem || problem.slug !== 'rotate-image') return null;
    const sig = signature || (problem.judge && problem.judge.signature) || SIGNATURE;
    if (!sig || sig.name !== 'rotate' || sig.return !== 'void') return null;
    if (!Array.isArray(sig.params) || sig.params.length !== 1 || sig.params[0].type !== 'int[][]') return null;
    return [v1Fresh(), v2Edge(), v3Adversarial()];
  } catch {
    return null;
  }
}

export function buildRotateImageVariants() {
  return [v1Fresh(), v2Edge(), v3Adversarial()];
}

export const VARIANTS = buildRotateImageVariants();
export { MATRICES };
