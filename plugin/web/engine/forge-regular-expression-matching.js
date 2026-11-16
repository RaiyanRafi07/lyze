/**
 * regular-expression-matching — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `regular-expression-matching`
 * (Regular Expression Matching, Hard, isMatch(string,string)->boolean, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Every expected value is computed at build time by oracleIsMatch below
 * (top-down recursion with memo on SUFFIX pairs), an INDEPENDENT implementation
 * of the same operation (not the walkthrough's bottom-up prefix table), so
 * adapter/oracle bugs cannot silently agree.
 *
 * Staged source: .workers/jobs/neetcode150-completion/regular-expression-matching/practice.mjs
 * (statements, hints, oracle); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against ('true' / 'false').
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (boolean answers).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'regular-expression-matching';

export const SIGNATURE = Object.freeze({
  name: 'isMatch',
  params: Object.freeze([{ name: 's', type: 'string' }, { name: 'p', type: 'string' }]),
  return: 'boolean',
});

export const MODE = 'exact';
export const DIFFICULTY = 'Hard';

export const INTENT_SAME = 'Same pattern, different strings so you reproduce the reasoning.';
export const INTENT_EDGE = 'Same pattern with the boundary inputs the examples never show.';
export const INTENT_ADVERSARIAL = 'Same task, harder shapes so the star rule is stressed.';

/** INDEPENDENT reference oracle: top-down recursion with memo on suffix pairs (i, j). Never builds the bottom-up prefix table, so agreement with the walkthrough adapter is genuine cross-check evidence, not shared-logic echo. */
export function oracleIsMatch(s, p) {
  const memo = new Map();
  function dp(i, j) {
    const key = i + ',' + j;
    if (memo.has(key)) return memo.get(key);
    let ans;
    if (j === p.length) {
      ans = i === s.length;
    } else {
      const first = i < s.length && (p[j] === '.' || p[j] === s[i]);
      if (j + 1 < p.length && p[j + 1] === '*') {
        ans = dp(i, j + 2) || (first && dp(i + 1, j));
      } else {
        ans = first && dp(i + 1, j + 1);
      }
    }
    memo.set(key, ans);
    return ans;
  }
  return dp(0, 0);
}

const argLiteral = (v) => JSON.stringify(v);
const outLiteral = (v) => (typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v));

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

const toTest = (s, p) => ({ args: [argLiteral(s), argLiteral(p)], expected: outLiteral(oracleIsMatch(s, p)) });

/* ---------------- entry point ---------------- */

export function buildRegularExpressionMatchingPractice() {
  // v1: fresh strings (fixed). Same full-match task on new inputs over the same alphabet.
  const v1pairs = [
    ['aab', 'c*a*b'],
    ['aaa', 'a*a'],
    ['ab', '.*c'],
    ['abcd', 'd*'],
  ];
  // v2: hidden edges (fixed): a lone dot, a total mismatch, a longer string than pattern, empty s vs "a*".
  const v2pairs = [
    ['a', '.'],
    ['b', 'a'],
    ['a', 'aa'],
    ['', 'a*'],
  ];
  // v3: SAME-TASK star-heavy shapes (honest label — no rule change, still boolean):
  // stacked "a*" pairs, double ".*", a star that cannot cross a literal, a trailing star run.
  const v3pairs = [
    ['aaa', 'a*a*'],
    ['abc', '.*.*'],
    ['aaab', 'a*a*'],
    ['aab', 'c*a*b*'],
  ];
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh strings',
      intent: INTENT_SAME,
      title: 'Regular Expression Matching — fresh strings (match drill)',
      statement:
        'Given a string s and a pattern p with \'.\' (any single char) and \'*\' (zero or more of the preceding element), decide if the ENTIRE s matches p. Fresh strings, same DP rule as the lesson.',
      tests: v1pairs.map(([a, b]) => toTest(a, b)),
      hints: [
        'Ask dp[i][j]: does s[:i] match p[:j]? A star either drops its element or eats one more char.',
        'Seed the empty row first: "a*" matches "", so dp[0][j] copies dp[0][j-2] past each star.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Regular Expression Matching — edge cases (match drill)',
      statement:
        'Same full-match task on the boundary inputs the lesson examples never show: a lone dot, a total mismatch, a longer string than pattern, and an empty string against "a*". Each input still uses the exact judge signature.',
      tests: v2pairs.map(([a, b]) => toTest(a, b)),
      hints: [
        'A dot matches exactly one char, never zero: ("a", ".") is true but ("", ".") would be false.',
        'An empty string only matches a pattern of droppable "x*" pairs, like "a*".',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'star-heavy shapes',
      intent: INTENT_ADVERSARIAL,
      title: 'Regular Expression Matching — star-heavy shapes (same task, no twist)',
      statement:
        'Same full-match task, same boolean output -- no twist. These shapes just stress the star rule: stacked "a*" pairs, double ".*", a star that cannot cross a literal, and a trailing star run.',
      tests: v3pairs.map(([a, b]) => toTest(a, b)),
      hints: [
        'Stacked stars still only offer zero-or-consume per pair; "aaab" has a b no "a*" can eat.',
        'A trailing "b*" happily takes zero: ("aab", "c*a*b*") is true via c*=0, a*=aa, b*=b.',
      ],
    }),
  ];
}

// Staged-compat alias: same builder, family-style name.
export const buildPracticeVariants = buildRegularExpressionMatchingPractice;

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oracleIsMatch (top-down suffix memo; frame emitter uses the bottom-up prefix table)',
});

export default buildRegularExpressionMatchingPractice;
