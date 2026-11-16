/**
 * find-the-index-of-the-first-occurrence-in-a-string — portable standalone
 * practice builder.
 *
 * Produces exactly 3 deterministic variants for slug
 * `find-the-index-of-the-first-occurrence-in-a-string`
 * (Find the Index of the First Occurrence in a String, Easy,
 * strStr(haystack: string, needle: string) -> int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * strStrPracticeOracle below (the platform substring search), an INDEPENDENT
 * implementation of the same operation (not the walkthrough's nested
 * align/compare probe loop with its i/j counters and n-m bound).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (mode 'exact': the decimal start index or '-1').
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'find-the-index-of-the-first-occurrence-in-a-string';
export const SIGNATURE = Object.freeze({
  name: 'strStr',
  params: Object.freeze([
    { name: 'haystack', type: 'string' },
    { name: 'needle', type: 'string' },
  ]),
  return: 'int',
});
export const MODE = 'exact';
export const DIFFICULTY = 'Easy';

export const INTENT_SAME = 'Same pattern, different strings so you reproduce the reasoning.';
export const INTENT_EDGE = 'Same pattern with the edge cases the original examples hide.';
export const INTENT_ADVERSARIAL = 'Same question with adversarial shapes that punish skip-ahead solutions.';

/**
 * INDEPENDENT oracle: platform substring search. No align loop over starts,
 * no per-character probe loop, no j counter, no n-m bound arithmetic — a
 * different method from the walkthrough (which emits one frame per
 * align/compare event from nested loops).
 */
export function strStrPracticeOracle(haystack, needle) {
  return String(haystack).indexOf(String(needle));
}

function makeCase(haystack, needle) {
  return {
    args: [JSON.stringify(haystack), JSON.stringify(needle)],
    expected: String(strStrPracticeOracle(haystack, needle)),
  };
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
    examples: [{ input: inputLine(first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: hints.slice(0, 2),
  };
}

/* ---------------- entry point ---------------- */

export function buildStrStrVariants() {
  const v1 = buildVariant({
    id: 'v1',
    seedLabel: 'fresh values',
    intent: INTENT_SAME,
    title: 'First Occurrence — fresh values (scan drill)',
    statement:
      'Given strings haystack and needle, return the index of the first occurrence of needle in haystack, or -1 if needle never occurs. ' +
      'Fresh inputs below: an early hit, a middle hit, a miss, and a longer haystack with a late hit. ' +
      'Work each one with the walkthrough scan: try starts in order, probe left to right, return the first full match.',
    cases: [
      makeCase('abcab', 'ab'),
      makeCase('hello', 'll'),
      makeCase('aaaaa', 'bba'),
      makeCase('ababcde', 'abc'),
    ],
    hints: [
      'Try starts 0, 1, 2, ... in order and stop at the first start whose whole needle matches.',
      'Compare haystack[i+j] against needle[j]; one mismatch abandons start i for i+1.',
    ],
  });

  const v2 = buildVariant({
    id: 'v2',
    seedLabel: 'edge cases',
    intent: INTENT_EDGE,
    title: 'First Occurrence — edge cases (scan drill)',
    statement:
      'Same strStr rule with the boundary inputs: single characters, the end-aligned hit that an i < n-m loop would drop, ' +
      'a needle equal to the whole haystack, a needle longer than the haystack, and a full-length near-miss. ' +
      'The signature and exact integer comparison are unchanged.',
    cases: [
      makeCase('a', 'a'),
      makeCase('ba', 'a'),
      makeCase('abc', 'abc'),
      makeCase('ab', 'abc'),
      makeCase('abc', 'abd'),
    ],
    hints: [
      'The last legal start is n-m inclusive: "a" in "ba" sits at index 1, the final start.',
      'When the needle is longer than the haystack no start fits, so the answer is -1.',
    ],
  });

  // Same-task adversarial set: overlapping prefixes and near-misses that
  // punish skipping ahead after a partial match or stopping at the first
  // partial agreement. Identical signature and question — no twist.
  const v3 = buildVariant({
    id: 'v3',
    seedLabel: 'adversarial overlap',
    intent: INTENT_ADVERSARIAL,
    title: 'First Occurrence — adversarial overlap (same task) (scan drill)',
    statement:
      'Same strStr question, no rule change: repeated-letter runs where the match starts inside a failed window ("aaaaab"/"aaab"), ' +
      'a prefix that almost matches before the real hit ("abcabcd"/"abcd"), a full-length near-miss that differs only at the last character ' +
      '("abcabd"/"abcabe"), and an overlap trap ("aaab"/"aab"). ' +
      'Identical signature and question — only the resume-at-i+1 discipline fights back.',
    cases: [
      makeCase('aaaaab', 'aaab'),
      makeCase('abcabcd', 'abcd'),
      makeCase('abcabd', 'abcabe'),
      makeCase('aaab', 'aab'),
    ],
    hints: [
      'After a mismatch at start i, resume at i+1: the answer can hide inside the failed window.',
      '"abcabe" is not in "abcabd" — verify all six characters before accepting the only full-length start.',
    ],
  });

  return [v1, v2, v3];
}

/** Live-forge entry shape: `buildVariants(problem)` scoped to this slug. */
export function buildVariants(problem) {
  try {
    if (!problem || typeof problem !== 'object') return [];
    if (problem.slug !== SLUG) return [];
    const signature = problem?.judge?.signature;
    if (!signature || signature.name !== SIGNATURE.name) return [];
    if (signature.return !== SIGNATURE.return) return [];
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return [];
    if (signature.params[0]?.type !== 'string' || signature.params[1]?.type !== 'string') return [];
    const variants = buildStrStrVariants();
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
  oracle: 'strStrPracticeOracle (platform indexOf; walkthrough uses nested align/compare probe loops)',
});
