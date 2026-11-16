/**
 * two-sum-ii-input-array-is-sorted — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `two-sum-ii-input-array-is-sorted`
 * (Two Sum II - Input Array Is Sorted, Medium, twoSum(int[],int)->int[], mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Seeded inputs (FNV-1a + mulberry32 from the slug) plus fixed edge inputs; every
 * expected value is computed at build time by bruteTwoSumII below (O(n^2) double
 * loop over all pairs), an INDEPENDENT implementation of the same operation (not
 * the walkthrough's converging lo/hi frame emitter), so adapter/oracle bugs cannot
 * silently agree.
 *
 * Staged source: .workers/jobs/neetcode150-completion/two-sum-ii-input-array-is-sorted/two-sum-ii.practice.js
 * (statements, hints, oracles); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (1-indexed [index1, index2]).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (index-pair answers compared literally).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'two-sum-ii-input-array-is-sorted';

export const SIGNATURE = Object.freeze({
  name: 'twoSum',
  params: Object.freeze([{ name: 'numbers', type: 'int[]' }, { name: 'target', type: 'int' }]),
  return: 'int[]',
});

export const MODE = 'exact';
export const DIFFICULTY = 'Medium';

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.';
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.';
export const INTENT_ADVERSARIAL = 'Same task, adversarial placements: the rule and output type are unchanged.';

/** INDEPENDENT reference oracle: brute-force O(n^2) scan of every i<j pair. */
export function bruteTwoSumII(numbers, target) {
  if (!Array.isArray(numbers)) return null;
  for (let i = 0; i < numbers.length; i++) {
    for (let j = i + 1; j < numbers.length; j++) {
      if (numbers[i] + numbers[j] === target) return [i + 1, j + 1];
    }
  }
  return null;
}

function hashText(text) {
  const s = String(text);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
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

const argLiteral = (v) => (Array.isArray(v) ? '[' + v.join(',') + ']' : String(v));
const outLiteral = (pair) => '[' + pair[0] + ',' + pair[1] + ']';

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

function countPairs(numbers, target) {
  let c = 0;
  for (let i = 0; i < numbers.length; i++) {
    for (let j = i + 1; j < numbers.length; j++) {
      if (numbers[i] + numbers[j] === target) c++;
    }
  }
  return c;
}

// Build a sorted array with a guaranteed-unique pair sum.
// Rejects candidates with != 1 pair so every generated test honors the
// "exactly one solution" constraint from the shard.
function uniqueSortedPair(rng, n, lo, hi) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const pool = [];
    for (let v = lo; v <= hi; v++) pool.push(v);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    const nums = pool.slice(0, n).sort((a, b) => a - b);
    if (nums.length < 2) continue;
    const i = Math.floor(rng() * nums.length);
    let j = Math.floor(rng() * nums.length);
    if (j === i) j = (j + 1) % nums.length;
    const a = Math.min(i, j);
    const b = Math.max(i, j);
    const target = nums[a] + nums[b];
    if (target < -1000 || target > 1000) continue;
    if (countPairs(nums, target) === 1) return { numbers: nums, target };
  }
  // Deterministic fallback (verified unique): sorted, in value range.
  return { numbers: [1, 2, 4, 8], target: 10 };
}

function toTest(numbers, target) {
  const brute = bruteTwoSumII(numbers, target);
  if (!brute) throw new Error('practice generator produced unsolvable input ' + JSON.stringify(numbers));
  if (countPairs(numbers, target) !== 1) {
    throw new Error('ambiguous generated pair ' + JSON.stringify(numbers) + ' t=' + target);
  }
  return { args: [argLiteral(numbers), String(target)], expected: outLiteral(brute) };
}

function buildVariant({ id, seedLabel, intent, title, statement, tests, hints }) {
  const capped = tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
  const first = capped[0];
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title,
    statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(SIGNATURE, first.args), output: first.expected, explain: '' }],
    tests: capped,
    mode: MODE,
    hints: hints.slice(0, 2),
  };
}

/* ---------------- entry point ---------------- */

export function buildTwoSumIIPractice() {
  const rng = mulberry32(hashText(SLUG));

  // v1 — same pattern, fresh numbers (deterministic generated, none equals a shard example).
  const v1rows = [];
  const seen = new Set(['[2,7,11,15]|9', '[2,3,4]|6', '[-1,0]|-1']);
  while (v1rows.length < 4) {
    const n = 4 + Math.floor(rng() * 5); // 4..8
    const data = uniqueSortedPair(rng, n, -12, 20);
    const key = argLiteral(data.numbers) + '|' + data.target;
    if (seen.has(key)) continue;
    seen.add(key);
    v1rows.push(toTest(data.numbers, data.target));
  }

  // v2 — same pattern, hidden edge cases (fixed literals, each verified by the oracle).
  const v2data = [
    { numbers: [1, 2], target: 3 },
    { numbers: [-1, 0], target: -1 },
    { numbers: [-5, -1, 2, 4], target: 3 },
    { numbers: [1, 2, 3, 4, 9], target: 13 },
  ];
  const v2rows = v2data.map((d) => toTest(d.numbers, d.target));

  // v3 — SAME TASK adversarial shapes (honest label: output type unchanged, still 1-indexed indices).
  // Ends-hugging answers plus duplicate-tolerant unique-solution arrays that punish one-sided scans.
  const v3data = [
    { numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], target: 19 },
    { numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], target: 3 },
    { numbers: [-10, -4, -1, 3, 8], target: 7 },
    { numbers: [1, 3, 3, 4, 9], target: 13 },
  ];
  const v3rows = v3data.map((d) => toTest(d.numbers, d.target));

  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh numbers',
      intent: INTENT_SAME,
      title: 'Two Sum II - Input Array Is Sorted — fresh numbers (same-task drill)',
      statement:
        'Given a 1-indexed sorted array numbers in non-decreasing order and an integer target, return the 1-indexed indices [index1, index2] of the two numbers that add up to target. Exactly one solution exists and the same element may not be used twice. Use only constant extra space with the converging lo/hi ends.',
      tests: v1rows,
      hints: [
        'Compare numbers[lo]+numbers[hi] with target: too small moves lo right, too large moves hi left.',
        'Return [lo+1, hi+1]: the answer is 1-indexed even though the pointers are 0-indexed.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Two Sum II - Input Array Is Sorted — edge cases (same-task drill)',
      statement:
        'Same 1-indexed sorted two-sum task with the boundary inputs: a two-element array, a negative/zero pair, mixed negatives, and a pair hiding at the far right end. Exactly one solution exists in every test. Return [index1, index2] 1-indexed with constant extra space.',
      tests: v2rows,
      hints: [
        'With two elements there is exactly one pair to measure; still return it 1-indexed.',
        'Negatives work the same way: only the sum comparison decides which end moves.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial shapes',
      intent: INTENT_ADVERSARIAL,
      title: 'Two Sum II - Input Array Is Sorted — adversarial shapes (same-task drill)',
      statement:
        'Same 1-indexed sorted two-sum question, no rule change: answers hug the extreme ends, hide in long runs, or sit inside duplicate-tolerant arrays that still admit exactly one pair. Return [index1, index2] 1-indexed with constant extra space. Duplicates never create a second valid pair here.',
      tests: v3rows,
      hints: [
        'An answer at [1,2] or [n-1,n] still needs the full convergence: one end barely moves.',
        'Duplicates are allowed in the input; only the sum comparison proves which end is impossible.',
      ],
    }),
  ];
}

// Staged-compat alias: same builder, family-style name.
export const buildPracticeVariants = buildTwoSumIIPractice;

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'bruteTwoSumII (O(n^2) all-pairs scan; frame emitter uses converging lo/hi ends)',
});

export default buildTwoSumIIPractice;
