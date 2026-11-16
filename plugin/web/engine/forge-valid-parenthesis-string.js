/**
 * valid-parenthesis-string — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `valid-parenthesis-string`
 * (Valid Parenthesis String, Medium, checkValidString(string)->boolean, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed literal inputs; every expected value ("true"/"false") is computed at
 * build time by oracleCheckValidString below (brute-force search over all '*'
 * assignments: empty / '(' / ')'), an INDEPENDENT implementation of the same
 * operation (not the walkthrough's greedy [lo,hi] range emitter), and
 * cross-checked against the walkthrough reference at build time.
 *
 * Staged source: .workers/jobs/question-owners-150/valid-parenthesis-string/practice.js
 * (statements, hints, oracle); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL live judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against ('true' / 'false').
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (boolean answers; exact literal comparison).
 * - `hints` holds exactly 2 hints per variant.
 */

import { checkValidString as walkthroughReference } from './adapter-valid-parenthesis-string.js';

export const SLUG = 'valid-parenthesis-string';

export const SIGNATURE = Object.freeze({
  name: 'checkValidString',
  params: Object.freeze([{ name: 's', type: 'string' }]),
  return: 'boolean',
});

export const MODE = 'exact';
export const DIFFICULTY = 'Medium';

export const INTENT_SAME = 'Same validity rule on fresh strings so you reproduce the range reasoning.';
export const INTENT_EDGE = 'Same validity rule on the edge cases the examples hide.';
export const INTENT_ADVERSARIAL = 'Same validity rule on star-heavy, order-tricky strings.';

/** INDEPENDENT reference oracle: brute-force search over every '*' assignment (empty / '(' / ')'). */
export function oracleCheckValidString(s) {
  const n = s.length;
  const dfs = (i, depth) => {
    if (depth < 0) return false;
    if (i === n) return depth === 0;
    const c = s[i];
    if (c === '(') return dfs(i + 1, depth + 1);
    if (c === ')') return depth > 0 && dfs(i + 1, depth - 1);
    return dfs(i + 1, depth) || dfs(i + 1, depth + 1) || (depth > 0 && dfs(i + 1, depth - 1));
  };
  return dfs(0, 0);
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

// One judge test from a literal input. The independent brute-force oracle and
// the walkthrough greedy reference must agree; disagreement throws so a bad
// literal can never ship as a "verified" expectation.
function toTest(s) {
  if (typeof s !== 'string' || s.length < 1 || s.length > 100 || !/^[()*]+$/.test(s)) {
    throw new Error('valid-parenthesis-string practice literal violates the 1..100 / ( ) * constraint');
  }
  const want = oracleCheckValidString(s);
  const ref = walkthroughReference(s);
  if (ref !== want) throw new Error('valid-parenthesis-string practice oracle disagreement on "' + s + '"');
  return { args: [lit(s)], expected: want ? 'true' : 'false' };
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

export function buildValidParenthesisStringVariants() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh strings',
      intent: INTENT_SAME,
      title: 'Valid Parenthesis String — fresh strings (same task)',
      statement:
        "Given a string s of '(', ')' and '*', return true when some replacement of each '*' with '(', ')' or empty yields a valid parenthesis string. A valid string closes every '(' with a later ')' in correct nesting order. These four inputs are fresh mixed strings between 5 and 8 characters long.",
      inputs: ['()*(())', '(*(**))', '((**))', '()*()'],
      hints: [
        'Update lo and hi for every character, then clamp lo at 0 before moving on.',
        'A star widens the range: it can lower the low end or raise the high end.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Valid Parenthesis String — edge cases (same task)',
      statement:
        "Same validity rule: each '*' may act as '(', ')' or empty, and the string is valid when some choice balances it. Single characters and near-empty ranges decide these cases, not long runs. All four inputs satisfy the 1..100 length constraint.",
      inputs: ['(', ')', '*', '(((**'],
      hints: [
        'A lone closer with hi at 0 rejects immediately, while a lone star is valid as empty.',
        'Walk even a one-character string through both range ends before deciding.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'same-task stress',
      intent: INTENT_ADVERSARIAL,
      title: 'Valid Parenthesis String — star-heavy stress (same task)',
      statement:
        "Same validity rule with no change to the signature or the meaning of '*'. These strings pack many stars together or place closers before their candidate openers. The range clamp, not any single star guess, carries the decision.",
      inputs: ['((((*****))))', '*(()*())*', '())(*(()*))', '((*)))((*'],
      hints: [
        'Walk the whole string once: an early hi < 0 rejects, a final lo > 0 rejects.',
        'Never fix a star early; keep lo clamped and let hi record the best case.',
      ],
    }),
  ];
}

// Staged-compat alias: same builder, family-style name.
export const buildPracticeVariants = buildValidParenthesisStringVariants;

export const VARIANTS = buildValidParenthesisStringVariants();

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: "oracleCheckValidString (brute-force over all '*' assignments; walkthrough emitter tracks the greedy [lo,hi] range)",
});

export default buildValidParenthesisStringVariants;
