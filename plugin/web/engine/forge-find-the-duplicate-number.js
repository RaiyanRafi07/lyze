/**
 * find-the-duplicate-number — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `find-the-duplicate-number`
 * (Find the Duplicate Number, Medium, findDuplicate(int[])->int, mode exact).
 * Pure ES module: no DOM, no network, no Math.random, no Date.
 * Generation is seeded from the slug (FNV-1a + mulberry32): same slug always
 * yields the same rows; v2 rows are fixed literals. Every expected value is
 * produced at build time by duplicateOracle below (frequency scan), an
 * INDEPENDENT implementation of the same operation (not the walkthrough's
 * Floyd tortoise-and-hare emitter).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL live judge signature, so the same editor code
 *   compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (integer answers; exact literal comparison).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'find-the-duplicate-number';
export const SIGNATURE = Object.freeze({
  name: 'findDuplicate',
  params: Object.freeze([{ name: 'nums', type: 'int[]' }]),
  return: 'int',
});
export const MODE = 'exact';
export const DIFFICULTY = 'Medium';

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.';
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.';
export const INTENT_ADVERSARIAL = 'Same question with adversarial placements that punish shortcuts.';

/** INDEPENDENT reference oracle: first value seen twice (frequency scan). */
export function duplicateOracle(nums) {
  const seen = new Set();
  for (const v of nums) {
    if (seen.has(v)) return v;
    seen.add(v);
  }
  throw new Error('oracle: no duplicate in ' + JSON.stringify(nums));
}

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

const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

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

// Build nums of length n+1 over [1,n] with exactly one repeated value `dup`
// (extra copies allowed when repeatCount > 2), shuffled with the seeded rng.
function makeNums(rng, n, dup, repeatCount = 2) {
  const arr = [];
  for (let v = 1; v <= n; v += 1) arr.push(v);
  for (let k = 1; k < repeatCount; k += 1) arr.push(dup);
  return shuffled(rng, arr);
}

function toTests(rows) {
  return rows.map((nums) => ({ args: [argLiteral(nums)], expected: outLiteral(duplicateOracle(nums)) }));
}

function buildVariant({ id, seedLabel, intent, difficulty, title, statement, signature, tests, mode, hints }) {
  const capped = tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
  const first = capped[0];
  return {
    id,
    seedLabel,
    intent,
    difficulty,
    title,
    statement,
    signature: cloneSignature(signature),
    examples: [{ input: inputLine(signature, first.args), output: first.expected, explain: '' }],
    tests: capped,
    mode: mode || 'exact',
    hints: hints.slice(0, 2),
  };
}

function buildAll({ slug, difficulty, base, sig }) {
  const rng = mulberry32(hashText(slug + ':duplicate-v1'));

  // v1 — fresh values, n = 4..7, duplicate + position both seeded.
  const v1rows = [];
  for (let k = 0; k < 4; k += 1) {
    const n = randInt(rng, 4, 7);
    const dup = randInt(rng, 1, n);
    v1rows.push(makeNums(rng, n, dup, 2));
  }

  // v2 — edge cases (fixed literals, no rng): minimal n, triple repeat,
  // duplicate at boundary values 1 and n, repeated value hidden at the tail.
  const v2rows = [[1, 1], [2, 1, 2], [1, 2, 3, 4, 5, 6, 7, 3], [2, 2, 2, 2]];

  // v3 — SAME-TASK adversarial shapes (no rule change): larger n inside the
  // walkthrough bound, boundary duplicates, one 4x repeat, one tail-hidden dup.
  const r3 = mulberry32(hashText(slug + ':duplicate-v3'));
  const v3rows = [
    makeNums(r3, 7, 1, 2), // dup at floor of range (len 8, walkthrough-ok)
    makeNums(r3, 7, 7, 2), // dup at ceiling of range (len 8, walkthrough-ok)
    makeNums(r3, 5, 3, 4), // 4 copies of a middle value (len 8, walkthrough-ok)
    makeNums(r3, 8, 6, 3), // 3 copies, n=8 (len 10, judge-only above-bound row)
  ];

  const mk = (id, seedLabel, intent, suffix, statement, rows, hints) =>
    buildVariant({
      id,
      seedLabel,
      intent,
      difficulty,
      title: base + ' — ' + suffix + ' (duplicate-value drill)',
      statement,
      signature: sig,
      tests: toTests(rows),
      mode: 'exact',
      hints,
    });

  return [
    mk(
      'v1',
      'fresh values',
      INTENT_SAME,
      'fresh values',
      'Given an array nums of n + 1 integers where each integer is in the range [1, n], exactly one value repeats. Return that repeated value without modifying nums and with only constant extra space. These fresh inputs use n between 4 and 7 with the duplicate and its positions drawn from the seeded generator.',
      v1rows,
      [
        'Read positions as links i -> nums[i]: the walk from index 0 must eventually repeat a value.',
        'A value that appears twice is the entrance of that walk cycle; Floyd finds it with two walkers.',
      ]
    ),
    mk(
      'v2',
      'edge cases',
      INTENT_EDGE,
      'edge cases',
      'Same duplicate-value task with the boundary inputs. nums still holds n + 1 integers in [1, n] with exactly one repeated value. Cases include the minimal n = 1, a triple repeat, a duplicate hidden at the tail, and a fully uniform array. Return the repeated value.',
      v2rows,
      [
        'With n = 1 the array is [1, 1]: both walkers start on the duplicate already.',
        'Three or more copies still form one cycle entrance — count occurrences to confirm by hand.',
      ]
    ),
    mk(
      'v3',
      'adversarial shapes',
      INTENT_ADVERSARIAL,
      'adversarial shapes',
      'Same duplicate-value question, no rule change: given nums of n + 1 integers in [1, n] with exactly one repeated value, return that value. Shapes punish sorting/modifying (forbidden), hash-set memory (forbidden), and single-meet answers: boundary duplicates, a 4x middle repeat, and one judge-only 10-entry row above the 8-entry walkthrough bound. The signature and exact comparison are unchanged.',
      v3rows,
      [
        'The meeting point is inside the cycle, not the answer: reset one walker to nums[0] and step both once.',
        'The 10-entry row is judge-only: the walkthrough must refuse it with the bounds error, never render it.',
      ]
    ),
  ];
}

// Registry-style entry mirroring variants.js BUILDERS conventions:
// slug-gated and shape-gated, returns exactly three variants or null. Never throws.
export function buildFindDuplicateDrills(problem, signature) {
  try {
    if (!problem || problem.slug !== 'find-the-duplicate-number') return null;
    const sig = signature || (problem.judge && problem.judge.signature) || SIGNATURE;
    if (!sig || sig.name !== 'findDuplicate' || sig.return !== 'int') return null;
    if (!Array.isArray(sig.params) || sig.params.length !== 1 || sig.params[0].type !== 'int[]') return null;
    const difficulty =
      problem.difficulty === 'Easy' || problem.difficulty === 'Hard' ? problem.difficulty : 'Medium';
    return buildAll({ slug: problem.slug, difficulty, base: String(problem.title || 'Find the Duplicate Number'), sig });
  } catch {
    return null;
  }
}

export function buildFindDuplicateVariants() {
  return buildAll({ slug: SLUG, difficulty: DIFFICULTY, base: 'Find the Duplicate Number', sig: SIGNATURE });
}

export const VARIANTS = buildFindDuplicateVariants();

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'duplicateOracle (frequency scan for the first repeated value; frame emitter walks Floyd links)',
});
