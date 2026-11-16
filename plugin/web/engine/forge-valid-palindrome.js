/**
 * valid-palindrome — standalone live-forge-compatible variant builder.
 *
 * Produces exactly 3 deterministic practice drills for the dataset record
 * (id 125, `isPalindrome(string) -> boolean`, judge mode `exact`):
 *
 *   v1  fresh phrases      — same task, new seeded inputs (palindromes + non-palindromes)
 *   v2  edge cases         — fixed boundary inputs (empty-after-filter, single char,
 *                            punctuation-only, classic digit/letter trap "0P")
 *   v3  adversarial shapes — SAME task, no rule change: inputs that punish
 *                            filter-shortcut and case-folding mistakes.
 *
 * No rule-change twist is offered: any changed-condition drill (e.g. one-removal)
 * would be unsound under the exact boolean judge for this slug, so v3 is the
 * explicitly adversarial same-task drill the contract allows instead.
 *
 * Every `expected` ("true"/"false") is computed by the independent oracle below
 * (normalize-then-reverse), which is a deliberately different algorithm from the
 * walkthrough adapter's in-place two-pointer skip. Generation is seeded from the
 * slug, so the same record always yields the same three drills.
 *
 * Pure ES module: no DOM, no network, no dependencies. Returns [] when the
 * record is not a valid-palindrome-shaped problem; never throws.
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
 * Independent reference: lowercase, strip every non-[a-z0-9], compare against
 * the reversed string. Deliberately NOT the adapter's left/right pointer walk,
 * so adapter-vs-oracle agreement is a real cross-check.
 */
export function oracleIsPalindrome(s) {
  const t = String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  return t === t.split('').reverse().join('');
}

/* ----------------------------------------------------------------- literals -- */

/** Argument literal: JSON-quoted, exactly the shape judge `args` use. */
function argLiteral(value) {
  return JSON.stringify(String(value));
}

/** Expected literal: bare "true"/"false", exactly what the judge compares. */
function outLiteral(value) {
  return value ? 'true' : 'false';
}

function inputLine(signature, args) {
  const name = (signature.params[0] && signature.params[0].name) || 's';
  return `${name} = ${args[0]}`;
}

/* ---------------------------------------------------------------- signature -- */

function signatureOf(problem) {
  const judge = problem && problem.judge;
  const signature = judge && judge.signature;
  if (!signature || typeof signature.name !== 'string' || signature.name.trim() === '') return null;
  if (!Array.isArray(signature.params) || signature.params.length !== 1) return null;
  const param = signature.params[0];
  if (!param || param.type !== 'string') return null;
  if (signature.return !== 'boolean') return null;
  return { name: signature.name.trim(), params: [{ name: String(param.name || 's'), type: 'string' }], return: 'boolean' };
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

const PHRASE_ALPHA = 'abcdefghij0123456789';
const PHRASE_PUNCT = ' ,.,;:!?-\'"()';

function randomPhrase(rng, length) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    const roll = rng();
    if (roll < 0.62) {
      const ch = PHRASE_ALPHA[randInt(rng, 0, PHRASE_ALPHA.length - 1)];
      out += rng() < 0.35 ? ch.toUpperCase() : ch;
    } else if (roll < 0.82) out += ' ';
    else out += pick(rng, PHRASE_PUNCT.split(''));
  }
  return out;
}

/** Seeded palindrome construction: mirror a random core, optionally padded. */
function seededPalindrome(rng) {
  const coreLen = randInt(rng, 2, 6);
  let core = '';
  for (let i = 0; i < coreLen; i += 1) {
    const ch = PHRASE_ALPHA[randInt(rng, 0, 9)];
    core += rng() < 0.4 ? ch.toUpperCase() : ch;
  }
  const mid = rng() < 0.5 ? pick(rng, ['x', '5', 'Q', ' ']) : '';
  let s = core + mid + core.split('').reverse().join('');
  if (rng() < 0.7) {
    const pad = pick(rng, [', ', ': ', ' - ', '... ', '?! ']);
    s = (rng() < 0.5 ? pad : '') + s.split('').join(pick(rng, ['', ' ', ''])) + (rng() < 0.5 ? pad.trim() : '');
  }
  return s.slice(0, 40);
}

/** Seeded near-miss: take a palindrome core and flip one alphanumeric char. */
function seededNearMiss(rng) {
  const base = seededPalindrome(rng).split('');
  const alnum = [];
  for (let i = 0; i < base.length; i += 1) if (/[A-Za-z0-9]/.test(base[i])) alnum.push(i);
  if (alnum.length === 0) return 'ab';
  const at = pick(rng, alnum);
  const cur = base[at].toLowerCase();
  base[at] = cur === 'a' ? 'b' : 'a';
  return base.join('').slice(0, 40);
}

const INTENT_SAME = 'Same pattern, different inputs so you reproduce the reasoning.';
const INTENT_EDGE = 'Same pattern with the edge cases the original hides.';
const INTENT_ADVERSARIAL = 'Same question with adversarial shapes that punish shortcut solutions.';

/**
 * Build the three drills. Same call signature shape as the live forge
 * (`buildVariants(problem)`), scoped to this slug.
 */
export function buildValidPalindromeVariants(problem) {
  try {
    if (!problem || typeof problem !== 'object') return [];
    if (problem.slug !== 'valid-palindrome') return [];
    const signature = signatureOf(problem);
    if (!signature) return [];
    const difficulty = difficultyOf(problem);
    const base = String(problem.title || 'Valid Palindrome').trim();
    const rng = mulberry32(hashText('valid-palindrome'));

    // v1: fresh — 2 seeded random phrases + 1 seeded palindrome + 1 seeded near-miss.
    const v1Strings = [
      randomPhrase(rng, randInt(rng, 8, 24)).slice(0, 40),
      randomPhrase(rng, randInt(rng, 8, 24)).slice(0, 40),
      seededPalindrome(rng),
      seededNearMiss(rng),
    ];
    const v1 = v1Strings.map((s) => ({ args: [argLiteral(s)], expected: outLiteral(oracleIsPalindrome(s)) }));

    // v2: fixed boundary edges (all honest same-task inputs).
    const v2Strings = [' ', 'a', '.,', 'race a car', '0P'];
    const v2 = v2Strings.map((s) => ({ args: [argLiteral(s)], expected: outLiteral(oracleIsPalindrome(s)) }));

    // v3: adversarial same-task shapes (no rule change).
    const v3Strings = [
      'AbBa',
      'A1b2B1a',
      'ab@c!ca',
      '....a....',
    ].map((s) => s.slice(0, 40));
    const v3 = v3Strings.map((s) => ({ args: [argLiteral(s)], expected: outLiteral(oracleIsPalindrome(s)) }));

    const make = (id, seedLabel, intent, suffix, statement, tests, hints) =>
      buildVariant({ id, seedLabel, intent, difficulty, title: `${base} — ${suffix} (palindrome drill)`, statement, signature, tests, hints });

    return [
      make(
        'v1', 'fresh phrases', INTENT_SAME, 'fresh phrases',
        'Given a string s, return true if s is a palindrome after converting all uppercase letters to lowercase and removing all non-alphanumeric characters, otherwise return false. These fresh inputs mix letters, digits, spaces and punctuation; work each one with the converging-pointers walkthrough.',
        v1,
        ['Skip anything that is not a letter or digit before comparing a pair.', 'Compare the surviving characters case-insensitively from both ends.'],
      ),
      make(
        'v2', 'edge cases', INTENT_EDGE, 'edge cases',
        'Same palindrome task with the boundary inputs. A string with no alphanumeric characters is empty after filtering and therefore reads the same forward and backward. Single characters, punctuation-only strings and digit-versus-letter pairs like "0P" decide the edges.',
        v2,
        ['Filter first on paper: cross out every character that is not a letter or digit.', '"0P" filters to "0p", and "0" is not equal to "p".'],
      ),
      make(
        'v3', 'adversarial shapes', INTENT_ADVERSARIAL, 'adversarial shapes',
        'Same palindrome question, no rule change. Mixed-case mirrors, digit-bearing mirrors, punctuation-hidden near-misses and long non-alphanumeric runs punish solutions that skip filtering, forget case-folding, or stop at the first matching pair. Return the exact boolean for each input.',
        v3,
        ['A near-miss can hide behind punctuation: filter the whole string, not just the ends.', 'Digits are alphanumeric and case has no effect on them, but letters must be folded.'],
      ),
    ];
  } catch {
    return [];
  }
}
