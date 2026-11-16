/**
 * remove-duplicates-from-sorted-array — portable standalone practice builder.
 *
 * Produces exactly 3 deterministic variants for slug
 * `remove-duplicates-from-sorted-array` (Remove Duplicates from Sorted Array,
 * Easy, removeDuplicates(int[]) -> int, mode exact). Pure ES module: no DOM,
 * no network, no dependencies, no Math.random, no Date. Fixed literals only;
 * every expected value is computed at build time by dedupPracticeOracle below
 * (Set distinct-count over the sorted input), an INDEPENDENT implementation of
 * the same operation (not the walkthrough's slow/fast in-place write scan),
 * cross-checked against the slow/fast scan so the two oracles must agree
 * before any test ships.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (mode 'exact': the integer k).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 *
 * All three sets are the SAME task (no twist): identical signature, identical
 * question — v3 is adversarial same-task shapes only. Every input respects the
 * shard constraints (1 <= length, values in [-100, 100], sorted
 * non-decreasing); none equals a shard judge test.
 */

export const SLUG = 'remove-duplicates-from-sorted-array';
export const SIGNATURE = Object.freeze({
  name: 'removeDuplicates',
  params: Object.freeze([{ name: 'nums', type: 'int[]' }]),
  return: 'int',
});
export const MODE = 'exact';
export const DIFFICULTY = 'Easy';

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the compaction.';
export const INTENT_EDGE = 'Same pattern with the edge cases the original hides.';
export const INTENT_ADVERSARIAL = 'Same question with adversarial shapes that punish shortcut solutions.';

/**
 * INDEPENDENT oracle: Set distinct-count over the sorted input.
 * No slow/fast pointers, no in-place writes, no prefix bookkeeping — a
 * different method from the walkthrough (which compacts with slow/fast and
 * returns slow + 1). Agreement between the two is a real cross-check.
 * (Sorted input keeps first-seen order, so the Set order IS the unique prefix.)
 */
export function dedupPracticeOracle(nums) {
  if (!Array.isArray(nums) || !nums.every(Number.isSafeInteger)) {
    throw new Error('oracle needs an integer array');
  }
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] < nums[i - 1]) throw new Error('oracle needs sorted non-decreasing input');
  }
  return new Set(nums).size;
}

/** Walkthrough-side cross-check: the taught slow/fast in-place scan. */
export function slowFastDedup(nums) {
  const a = nums.slice();
  if (a.length === 0) return 0;
  let slow = 0;
  for (let fast = 1; fast < a.length; fast++) {
    if (a[fast] !== a[slow]) {
      slow += 1;
      a[slow] = a[fast];
    }
  }
  return slow + 1;
}

function argLiteral(nums) {
  return '[' + nums.join(',') + ']';
}

function inputLine(args) {
  return SIGNATURE.params.map((p, i) => `${p.name} = ${args[i]}`).join(', ');
}

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  };
}

function toTest(nums) {
  if (nums.length < 1) throw new Error('practice inputs keep length >= 1 per the shard constraints');
  if (!nums.every((v) => Number.isSafeInteger(v) && v >= -100 && v <= 100)) {
    throw new Error('practice inputs respect -100 <= nums[i] <= 100: ' + JSON.stringify(nums));
  }
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] < nums[i - 1]) throw new Error('practice inputs stay sorted: ' + JSON.stringify(nums));
  }
  const a = slowFastDedup(nums);
  const b = dedupPracticeOracle(nums);
  if (a !== b) throw new Error('oracle disagreement on ' + JSON.stringify(nums));
  return { args: [argLiteral(nums)], expected: String(a) };
}

function buildVariant({ id, seedLabel, intent, title, statement, tests, hints }) {
  const rows = tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
  const first = rows[0];
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title,
    statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(first.args), output: first.expected, explain: '' }],
    tests: rows,
    mode: MODE,
    hints: hints.slice(0, 2),
  };
}

/* ---------------- entry point ---------------- */

export function buildRemoveDuplicatesVariants() {
  // v1 — same pattern, fresh numbers (fixed literals, none equals a shard judge test).
  const v1rows = [
    [1, 2, 3],
    [1, 1, 2, 2, 3],
    [-5, -5, -3, 0, 0, 7],
    [0, 0, 5, 5, 5, 9],
  ].map(toTest);

  // v2 — same pattern, hidden edge cases (single cell, all-duplicate,
  // constraint boundaries, already-unique).
  const v2rows = [
    [7],
    [2, 2, 2, 2],
    [-100, -100, 100],
    [1, 2, 3, 4],
  ].map(toTest);

  // v3 — SAME TASK adversarial shapes (honest label: output type unchanged,
  // still int k). Long duplicate runs and late first-uniques punish
  // `return nums.length`, `return 1`, and fast-1-comparison shortcuts.
  const v3rows = [
    [1, 1, 1, 1, 1, 1, 1, 2],
    [-100, -100, -100, -99, -99, 0, 0, 0, 1],
    [4, 4, 4, 4, 4],
    [0, 1, 1, 1, 1, 1, 1, 1, 1],
  ].map(toTest);

  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh numbers',
      intent: INTENT_SAME,
      title: 'Remove Duplicates — fresh numbers (compaction drill)',
      statement:
        'Given nums sorted in non-decreasing order, compact it in place so each unique value appears once in order, and return k, the unique count. ' +
        'Fresh inputs below: an already-unique array, paired duplicates, negatives with zeros, and a tripled tail. ' +
        'Work each one with the slow/fast walkthrough: compare against nums[slow], write only on new uniques.',
      tests: v1rows,
      hints: [
        'slow marks the last kept unique; fast scans every later cell exactly once.',
        'Only nums[fast] != nums[slow] grows the prefix — duplicates never trigger a write.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Remove Duplicates — edge cases (compaction drill)',
      statement:
        'Same compaction task with the boundary inputs the examples hide: a single cell (k = 1 with no scan), ' +
        'an all-duplicate array (the prefix never grows), the -100/100 constraint ends, and an already-unique run. ' +
        'The signature and exact comparison are unchanged.',
      tests: v2rows,
      hints: [
        'A length-1 array returns 1: slow = 0 is already the whole prefix.',
        'All duplicates means every compare fails — slow never moves and k stays 1.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial runs',
      intent: INTENT_ADVERSARIAL,
      title: 'Remove Duplicates — adversarial runs (same task)',
      statement:
        'Same compaction question, no rule change: long duplicate runs with the first unique at the very end, ' +
        'a full-width sweep from -100 to 1, a uniform array, and a single leading unique followed by a long tail. ' +
        'Identical signature and question — only the run shapes fight back. ' +
        'Returning nums.length or 1 fails these; only the real prefix count passes.',
      tests: v3rows,
      hints: [
        'Seven 1s then a 2: the prefix stays [1] until the last cell — do not return early.',
        'The uniform [4,4,4,4,4] has k = 1 while [0,1,1,...] has k = 2: count the prefix, not the runs.',
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
    if (signature.params[0]?.type !== 'int[]') return [];
    const variants = buildRemoveDuplicatesVariants();
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
  oracle: 'dedupPracticeOracle (Set distinct-count; walkthrough uses slow/fast in-place compaction)',
});
