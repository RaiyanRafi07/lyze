/**
 * longest-valid-parentheses — portable standalone practice builder.
 *
 * Produces exactly 3 deterministic variants for slug `longest-valid-parentheses`
 * (Longest Valid Parentheses, Hard, longestValidParentheses(string)->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * longestValidParenthesesPracticeOracle below (DP over the actual string: longest
 * valid substring ending at each position), an INDEPENDENT implementation of the
 * same operation (not the walkthrough's sentinel-base index-stack scan), and
 * cross-checked against the walkthrough's real stack execution at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL live judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (mode 'exact': integer strings).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

import { build as walkthroughBuild } from './adapter-longest-valid-parentheses.js';

export const SLUG = 'longest-valid-parentheses';

export const SIGNATURE = Object.freeze({
  name: 'longestValidParentheses',
  params: Object.freeze([{ name: 's', type: 'string' }]),
  return: 'int',
});

export const MODE = 'exact';
export const DIFFICULTY = 'Hard';

export const INTENT_SAME = 'Same longest-span rule on fresh strings so you reproduce the sentinel-base reasoning.';
export const INTENT_EDGE = 'Same longest-span rule on the edge cases the examples hide.';
export const INTENT_ADVERSARIAL = 'Same longest-span rule on base-resetting, order-tricky strings.';

/** INDEPENDENT reference oracle: DP — longest valid substring ending at each
 * position. No index stack, no sentinel base, no i - top measurement. */
export function longestValidParenthesesPracticeOracle(s) {
  if (typeof s !== 'string') return 0;
  const n = s.length;
  const dp = new Array(n).fill(0);
  let best = 0;
  for (let i = 1; i < n; i++) {
    if (s[i] !== ')') continue;
    if (s[i - 1] === '(') {
      dp[i] = 2 + (i >= 2 ? dp[i - 2] : 0);
    } else {
      const prev = i - dp[i - 1] - 1;
      if (prev >= 0 && s[prev] === '(') {
        dp[i] = dp[i - 1] + 2 + (prev >= 1 ? dp[prev - 1] : 0);
      }
    }
    if (dp[i] > best) best = dp[i];
  }
  return best;
}

const lit = (v) => JSON.stringify(v);

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

// One judge test from a literal input. The independent DP oracle and the
// walkthrough sentinel-stack reference must agree; disagreement throws so a
// bad literal can never ship as a "verified" expectation.
function toTest(s) {
  if (typeof s !== 'string' || s.length > 30000 || !/^[()]*$/.test(s)) {
    throw new Error('longest-valid-parentheses practice literal violates the 0..30000 ( and ) constraint');
  }
  const want = longestValidParenthesesPracticeOracle(s);
  const ref = walkthroughBuild([s]).result;
  if (ref !== want) throw new Error('longest-valid-parentheses practice oracle disagreement on "' + s + '"');
  return { args: [lit(s)], expected: String(want) };
}

function buildVariant({ id, seedLabel, intent, title, statement, inputs, hints }) {
  const tests = inputs
    .map((s) => toTest(s))
    .slice(0, 5)
    .map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
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

export function buildLongestValidParenthesesVariants() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh strings',
      intent: INTENT_SAME,
      title: 'Longest Valid Parentheses — fresh strings (same task)',
      statement:
        "Given a string of '(' and ')' only, return the length of the longest contiguous well-formed substring. These four inputs are fresh mixed strings between 4 and 8 characters long; work each one with the sentinel-base scan: push -1, remember openers, and on each closer pop then re-base or measure.",
      inputs: ['())()', '(()())', '()(()', ')()())(()'],
      hints: [
        'After every pop, an empty stack means the closer itself becomes the new base.',
        'A live stack means s[top+1..i] is valid — measure i minus the new top, not the popped index.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Longest Valid Parentheses — edge cases (same task)',
      statement:
        'Same longest-span rule with the boundary inputs the examples compress: the empty string answers 0, lone brackets answer 0, a single pair answers 2, and a wall of closers followed by openers has no valid span at all. All inputs satisfy the 0..30000 length constraint.',
      inputs: ['', '(', ')', '()', '))))(((('],
      hints: [
        'The empty string never enters the loop: best stays 0 and the done frame decides.',
        'A closer with nothing to match plants a base the answer may never cross.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'same-task stress',
      intent: INTENT_ADVERSARIAL,
      title: 'Longest Valid Parentheses — base-resetting stress (same task)',
      statement:
        "Same longest-span rule with no change to the signature. These strings bury the longest span after unmatched closers, nest deeply before breaking, or glue two valid runs around one bad bracket. The base, not any single pair, carries the decision.",
      inputs: ['(()(((()', ')))()((()))', '((((()))))', ')()())()()('],
      hints: [
        'Walk the whole string once: an unmatched closer moves the base forward and erases everything left of it.',
        'Adjacent valid runs separated by one bad bracket do not join — the base sits between them.',
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
    if (signature.params[0]?.type !== 'string') return [];
    const variants = buildLongestValidParenthesesVariants();
    if (!Array.isArray(variants) || variants.length !== 3) return [];
    return variants;
  } catch {
    return [];
  }
}

// Staged-compat alias: same builder, family-style name.
export const buildPracticeVariants = buildLongestValidParenthesesVariants;

export const VARIANTS = buildLongestValidParenthesesVariants();

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: "longestValidParenthesesPracticeOracle (DP over longest valid substring ending at each position; walkthrough uses the sentinel-base index-stack scan)",
});

export default buildLongestValidParenthesesVariants;
