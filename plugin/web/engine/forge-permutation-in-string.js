/**
 * permutation-in-string — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `permutation-in-string`
 * (Permutation in String, Medium, checkInclusion(string,string)->boolean, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed + seeded inputs (FNV-1a + mulberry32 from the slug); every expected value
 * is computed at build time by oracleInclusion below (SORTED-window comparison),
 * an INDEPENDENT implementation of the same operation (not the walkthrough's
 * matches-counter frame emitter), so adapter/oracle bugs cannot silently agree.
 *
 * Staged source: .workers/jobs/question-owners-150/permutation-in-string/permutation-in-string.variants.js
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

export const SLUG = 'permutation-in-string';

export const SIGNATURE = Object.freeze({
  name: 'checkInclusion',
  params: Object.freeze([{ name: 's1', type: 'string' }, { name: 's2', type: 'string' }]),
  return: 'boolean',
});

export const MODE = 'exact';
export const DIFFICULTY = 'Medium';

export const INTENT_SAME = 'Same pattern, different strings so you reproduce the reasoning.';
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.';
export const INTENT_ADVERSARIAL = 'Same task, adversarial placements: the rule and output type are unchanged.';

/** INDEPENDENT reference oracle: sort s1 once, sort each s2 window, compare. O((n-m)*m log m). */
export function oracleInclusion(s1, s2) {
  const key = [...s1].sort().join('');
  const m = s1.length;
  if (m > s2.length) return false;
  for (let i = 0; i + m <= s2.length; i++) {
    if ([...s2.slice(i, i + m)].sort().join('') === key) return true;
  }
  return false;
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

const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

function randomString(rng, len, alphabet) {
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(rng() * alphabet.length)];
  return out;
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

const toTest = (s1, s2) => ({ args: [argLiteral(s1), argLiteral(s2)], expected: outLiteral(oracleInclusion(s1, s2)) });

/* ---------------- entry point ---------------- */

export function buildPermutationPractice() {
  const rng = mulberry32(hashText(SLUG));
  // v1: fresh strings (seeded). Half are planted hits: shuffle s1 into s2 at a random spot.
  const v1pairs = [];
  for (let k = 0; k < 4; k++) {
    const m = randInt(rng, 2, 5);
    const s1 = randomString(rng, m, 'abcde');
    if (k % 2 === 0) {
      const extra = randInt(rng, 1, 5);
      const pad = randomString(rng, extra, 'abcde');
      const pos = randInt(rng, 0, pad.length);
      const shuffled = [...s1].sort(() => rng() - 0.5).join('');
      const s2 = pad.slice(0, pos) + shuffled + pad.slice(pos);
      v1pairs.push([s1, s2]);
    } else {
      v1pairs.push([s1, randomString(rng, randInt(rng, m, m + 6), 'abcde')]);
    }
  }
  // v2: hidden edges (fixed): single-char hit/miss, s1 longer, exact anagram, duplicate-heavy.
  const v2pairs = [['a', 'a'], ['a', 'b'], ['ab', 'a'], ['abc', 'cba'], ['aab', 'aaab']];
  // v3: SAME-TASK adversarial placements (honest label — no rule change, still boolean):
  // decoy runs, near-miss, hit hidden at the end, duplicate-heavy long input.
  const v3pairs = [
    ['adc', 'dcda'],
    ['ab', 'eidboaoo'],
    ['abc', 'cccccbca'],
    ['hello', 'ooolleoooleh'],
  ];
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh strings',
      intent: INTENT_SAME,
      title: 'Permutation in String — fresh strings (permutation drill)',
      statement:
        'Given strings s1 and s2 (lowercase a-z), return true if some contiguous substring of s2 of length s1.length is a permutation of s1, else false. These fresh inputs use 2-5 letter patterns over a small alphabet.',
      tests: v1pairs.map(([a, b]) => toTest(a, b)),
      hints: [
        'Count letters: a window matches when all 26 frequencies agree.',
        'Slide a fixed window of s1.length and update only the two touched letters.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Permutation in String — edge cases (permutation drill)',
      statement:
        'Same task: return true if a permutation of s1 appears as a substring of s2, else false. Boundary inputs include single characters, s1 longer than s2 (always false), an exact anagram, and duplicate letters.',
      tests: v2pairs.map(([a, b]) => toTest(a, b)),
      hints: [
        'If s1 is longer than s2 no window fits, so the answer is false.',
        'Duplicate letters need exact counts: "aab" needs two a and one b.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'same-task adversarial',
      intent: INTENT_ADVERSARIAL,
      title: 'Permutation in String — adversarial placements (same task, no twist)',
      statement:
        'Same task, harder placements: return true iff a permutation of s1 occurs as a substring of s2. Windows hide behind decoy runs, near-misses, and duplicate-heavy text; the signature and boolean answer are unchanged.',
      tests: v3pairs.map(([a, b]) => toTest(a, b)),
      hints: [
        'Near-misses like "eidboaoo" fail every window by exactly one letter — check all 26 slots.',
        'A hit can sit at the very end, so the loop must run through the last window.',
      ],
    }),
  ];
}

// Staged-compat alias: same builder, family-style name.
export const buildPracticeVariants = buildPermutationPractice;

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oracleInclusion (sorted-window comparison; frame emitter uses the matches counter)',
});

export default buildPermutationPractice;
