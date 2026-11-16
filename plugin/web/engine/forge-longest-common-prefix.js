/**
 * longest-common-prefix — portable standalone practice builder.
 *
 * Produces exactly 3 deterministic practice drills for the dataset record
 * (id 14, `longestCommonPrefix(string[]) -> string`, judge mode `exact`):
 *
 *   v1  fresh strings    — same task, new seeded lowercase inputs
 *   v2  edge cases       — fixed boundary inputs the worked examples hide
 *                          (single string, empty string, full agreement,
 *                          no common head, head equals the shortest word)
 *   v3  adversarial      — SAME task, no rule change: long shared stems with
 *                          late divergence plus early-split traps that punish
 *                          neighbour-only or first-string-only shortcuts.
 *
 * No rule-change twist is offered: any changed-condition drill (e.g. suffix,
 * or a minimum-length gate) would be unsound under the exact string judge for
 * this slug, so v3 is the explicitly adversarial same-task drill the variant
 * contract allows instead.
 *
 * Every `expected` is a JSON-quoted string computed by the independent oracle
 * below (sorted-copy first/last comparison), which is a deliberately different
 * algorithm from the walkthrough adapter's iterative vertical shrink, so
 * producer/validator agreement is a real cross-check. Generation is seeded
 * from the slug, so the same record always yields the same three drills.
 *
 * Pure ES module: no DOM, no network, no dependencies. Returns [] when the
 * record is not a longest-common-prefix-shaped problem; never throws.
 *
 * Staged source: .workers/jobs/deck-release/catalog-expansion/
 * lessons/longest-common-prefix/forge.longest-common-prefix.js
 * Deploys-To: plugin/web/engine/forge-longest-common-prefix.js (NEW file) plus
 * one additive SLUG_BUILDERS entry in plugin/web/engine/variants.js
 * (see integration.json). Shape follows the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/
 * mode/hints) with the ACTUAL judge signature, so the same editor code
 * compiles unchanged.
 */

/* ------------------------------------------------------------------ seeding -- */

function hashText(text) {
  const source = String(text);
  let hash = 2166136211 >>> 0;
  for (let i = 0; i < source.length; i += 1) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619) >>> 0;
  return hash;
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

function randInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

/* ------------------------------------------------------------------ oracle -- */

/**
 * Independent reference: sort a copy, then compare only the first and last
 * words character by character. Any head shared by every word is a head of
 * those two extremes, and any head of the extremes is shared by everything
 * between them — so this decides the same answer as the walkthrough's
 * pairwise vertical shrink via genuinely different control flow.
 */
export function oracleLongestCommonPrefix(strs) {
  if (!Array.isArray(strs) || strs.length === 0) return '';
  const sorted = strs.slice().sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  let j = 0;
  while (j < first.length && j < last.length && first[j] === last[j]) j += 1;
  return first.slice(0, j);
}

/* ----------------------------------------------------------------- literals -- */

/** Argument literal: JSON array of JSON strings, exactly the judge args shape. */
function argLiteral(strs) {
  return JSON.stringify(strs);
}

/** Expected literal: JSON-quoted string, exactly what the exact judge compares. */
function outLiteral(s) {
  return JSON.stringify(s);
}

function inputLine(signature, args) {
  const name = (signature.params[0] && signature.params[0].name) || 'strs';
  return `${name} = ${args[0]}`;
}

/* ---------------------------------------------------------------- signature -- */

function signatureOf(problem) {
  const judge = problem && problem.judge;
  const signature = judge && judge.signature;
  if (!signature || signature.name !== 'longestCommonPrefix') return null;
  if (!Array.isArray(signature.params) || signature.params.length !== 1) return null;
  const param = signature.params[0];
  if (!param || param.type !== 'string[]') return null;
  if (signature.return !== 'string') return null;
  return { name: 'longestCommonPrefix', params: [{ name: String(param.name || 'strs'), type: 'string[]' }], return: 'string' };
}

function difficultyOf(problem) {
  const value = problem && problem.difficulty;
  return value === 'Easy' || value === 'Medium' || value === 'Hard' ? value : 'Easy';
}

function buildVariant({ id, seedLabel, intent, difficulty, title, statement, signature, tests, hints }) {
  const first = tests[0];
  return {
    id,
    seedLabel,
    intent,
    difficulty,
    title,
    statement,
    signature: { name: signature.name, params: signature.params.map((p) => ({ ...p })), return: signature.return },
    examples: [{ input: inputLine(signature, first.args), output: first.expected, explain: '' }],
    tests: tests.map((t) => ({ args: t.args.map(String), expected: String(t.expected) })),
    mode: 'exact',
    hints: hints.slice(0, 2),
  };
}

/* --------------------------------------------------------------- generation -- */

const STEMS = ['flow', 'flowe', 'fl', 'inter', 'pre', 'test', 'star', 'book', 'car', 'dog'];
const TAILS = ['er', 'ing', 'ed', 'erbed', 'erpot', 'ation', 's', 'ly', 'able', 'ment'];

function randomWord(rng, minLen, maxLen) {
  const len = randInt(rng, minLen, maxLen);
  let out = '';
  for (let k = 0; k < len; k += 1) out += String.fromCharCode(97 + Math.floor(rng() * 26));
  return out;
}

function sharedStemWords(rng, count) {
  const stem = pick(rng, STEMS);
  const words = [];
  for (let k = 0; k < count; k += 1) {
    const tailLen = randInt(rng, 0, 4);
    let tail = '';
    for (let t = 0; t < tailLen; t += 1) tail += String.fromCharCode(97 + Math.floor(rng() * 26));
    // Sometimes diverge mid-stem: flip the last stem char on one word.
    if (k === count - 1 && rng() < 0.4 && stem.length > 1) {
      const chars = stem.split('');
      const at = randInt(rng, 0, chars.length - 1);
      chars[at] = chars[at] === 'a' ? 'b' : 'a';
      words.push(chars.join('') + tail);
    } else {
      words.push(stem + tail);
    }
  }
  return words;
}

const INTENT_SAME = 'Same pattern, different strings so you reproduce the shrink reasoning.';
const INTENT_EDGE = 'Same task with the edge cases the worked examples hide.';
const INTENT_ADVERSARIAL = 'Same question with adversarial shapes that punish neighbour-only shortcuts.';

/**
 * Build the three drills. Same call signature shape as the live forge
 * (`buildVariants(problem)`), scoped to this slug.
 */
export function buildLongestCommonPrefixVariants(problem) {
  try {
    if (!problem || typeof problem !== 'object') return [];
    if (problem.slug !== 'longest-common-prefix') return [];
    const signature = signatureOf(problem);
    if (!signature) return [];
    const difficulty = difficultyOf(problem);
    const base = String(problem.title || 'Longest Common Prefix').trim();
    const rng = mulberry32(hashText('longest-common-prefix'));

    // v1: fresh — seeded shared-stem batches plus one random batch.
    const v1Lists = [
      sharedStemWords(rng, randInt(rng, 3, 4)),
      sharedStemWords(rng, randInt(rng, 3, 4)),
      [randomWord(rng, 2, 6), randomWord(rng, 2, 6), randomWord(rng, 2, 6)],
      sharedStemWords(rng, 3),
    ];
    const v1 = v1Lists.map((strs) => ({ args: [argLiteral(strs)], expected: outLiteral(oracleLongestCommonPrefix(strs)) }));

    // v2: fixed boundary edges (all honest same-task inputs, lowercase only).
    const v2Lists = [
      ['alone'],
      ['flower', ''],
      ['test', 'test', 'test'],
      ['abc', 'def', 'ghi'],
      ['a', 'ab', 'abc'],
    ];
    const v2 = v2Lists.map((strs) => ({ args: [argLiteral(strs)], expected: outLiteral(oracleLongestCommonPrefix(strs)) }));

    // v3: adversarial same-task shapes (no rule change).
    const v3Lists = [
      ['flowerbed', 'flowerpot', 'flowerchild'],
      ['abca', 'abcb', 'abcc'],
      ['prefix', 'preform', 'prepare'],
      ['interspecies', 'interstellar', 'interstate'],
    ];
    const v3 = v3Lists.map((strs) => ({ args: [argLiteral(strs)], expected: outLiteral(oracleLongestCommonPrefix(strs)) }));

    const make = (id, seedLabel, intent, suffix, statement, tests, hints) =>
      buildVariant({ id, seedLabel, intent, difficulty, title: `${base} — ${suffix} (prefix drill)`, statement, signature, tests, hints });

    return [
      make(
        'v1', 'fresh strings', INTENT_SAME, 'fresh strings',
        'Given an array of strings strs, return the longest common prefix string amongst them, or "" when there is none. These fresh inputs mix shared stems with diverging tails; run the vertical scan (seed with strs[0], shrink per string) on each list.',
        v1,
        ['Seed the answer with the whole first string; later strings can only shrink it.', 'Compare column by column from index 0; the first mismatch fixes the cut.'],
      ),
      make(
        'v2', 'edge cases', INTENT_EDGE, 'edge cases',
        'Same prefix task with the boundary inputs. A single string answers itself; any empty string forces ""; full agreement keeps the whole word; disjoint heads give ""; and a shortest-word head survives only when every longer word starts with it.',
        v2,
        ['An empty member makes the answer "" no matter what the other strings hold.', 'Check every string, not just neighbours: one outsider can erase a long head.'],
      ),
      make(
        'v3', 'adversarial shapes', INTENT_ADVERSARIAL, 'adversarial shapes',
        'Same prefix question, no rule change. Long shared stems diverge at the last column, early splits hide behind a common "pre"/"inter" head, and shortest-word heads tempt first-string-only answers. Return the exact common head for each list.',
        v3,
        ['Late divergence still cuts: scan to the first differing column, not to the stem you expect.', 'A common head of the first two strings is only a candidate until the last string votes.'],
      ),
    ];
  } catch {
    return [];
  }
}
