// Live-forge-compatible variant builder — longest-repeating-character-replacement.
// Returns EXACTLY 3 deterministic variants in the plugin/web/engine/variants.js shape:
// { id, seedLabel, intent, difficulty, title, statement, signature, examples, tests, mode, hints }.
// Same real judge signature (characterReplacement(s: string, k: int) -> int), mode 'exact',
// 2 hints each, examples[0] derived from tests[0]. v1 = fresh same-task, v2 = edge,
// v3 = clearly adversarial SAME-task drill (decoy runs / hidden majority). No rule twist:
// a same-type twist (e.g. "at most 2 distinct letters") would change the judged question
// and is deliberately NOT forced. Every expected value comes from the independent
// brute-force oracle below, never from the sliding-window reference.
// Pure, synchronous, dependency-free. Unsupported/malformed input yields [] (never throws).

export const SLUG = 'longest-repeating-character-replacement';

export const STATEMENT = 'Given an uppercase string s and an integer k, you may change at most k characters to any other uppercase letter. Return the length of the longest substring of equal letters you can obtain.';

// Independent DISTINCT oracle: brute force over every window with an exact per-window
// majority tally — O(n^2 * sigma). Deliberately different from the O(n) sliding-window
// reference with its stale non-decreasing maxFreq.
export function oracleReplacement(s, k) {
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    const tally = new Array(26).fill(0);
    let majority = 0;
    for (let j = i; j < s.length; j++) {
      tally[s.charCodeAt(j) - 65]++;
      if (tally[s.charCodeAt(j) - 65] > majority) majority = tally[s.charCodeAt(j) - 65];
      if (j - i + 1 - majority <= k && j - i + 1 > best) best = j - i + 1;
    }
  }
  return best;
}

function hashText(text) {
  const source = String(text);
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619) >>> 0;
  return hash;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const argLiteral = (s) => JSON.stringify(s);
const outLiteral = (n) => String(n);

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  };
}

function inputLine(signature, args) {
  return signature.params.map((p, i) => `${(p && p.name) || 'arg' + i} = ${args[i]}`).join(', ');
}

function signatureOf(problem) {
  const sig = problem && problem.judge && problem.judge.signature;
  if (!sig || typeof sig.name !== 'string' || sig.name.trim() === '') return null;
  if (!Array.isArray(sig.params) || typeof sig.return !== 'string') return null;
  return sig;
}

function isShape(signature) {
  if (!signature || !Array.isArray(signature.params) || signature.params.length !== 2) return false;
  return signature.params[0].type === 'string' && signature.params[1].type === 'int' && signature.return === 'int';
}

function buildVariant({ id, seedLabel, intent, difficulty, title, statement, signature, tests, mode, hints }) {
  const capped = tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
  const first = capped[0];
  return {
    id, seedLabel, intent, difficulty, title, statement,
    signature: cloneSignature(signature),
    examples: [{ input: inputLine(signature, first.args), output: first.expected, explain: '' }],
    tests: capped, mode: mode || 'exact', hints: hints.slice(0, 2),
  };
}

// Official judge pairs — never emitted as generated tests (they live in the dataset).
const OFFICIAL = new Set(['"ABAB"|2', '"AABABBA"|1']);

function toTest(s, k) {
  return { args: [argLiteral(s), String(k)], expected: outLiteral(oracleReplacement(s, k)) };
}

export function buildForgeVariants(problem) {
  try {
    if (!problem || typeof problem !== 'object') return [];
    if (problem.slug !== SLUG) return [];
    const signature = signatureOf(problem);
    if (!signature || !isShape(signature)) return [];
    const difficulty = typeof problem.title === 'string' && problem.difficulty ? problem.difficulty : 'Medium';
    const base = typeof problem.title === 'string' && problem.title ? problem.title : 'Longest Repeating Character Replacement';
    const rng = mulberry32(hashText(SLUG));

    // v1: fresh same-task inputs over a tiny alphabet (frequent replacement battles).
    const v1rows = [];
    let guard = 0;
    while (v1rows.length < 4 && guard++ < 200) {
      const n = 4 + Math.floor(rng() * 7); // length 4..10
      let s = '';
      for (let i = 0; i < n; i++) s += 'ABC'[Math.floor(rng() * 3)];
      const k = Math.floor(rng() * (s.length + 1));
      if (OFFICIAL.has(`"${s}"|${k}`)) continue;
      v1rows.push([s, k]);
    }
    const v1 = v1rows.map(([s, k]) => toTest(s, k));

    // v2: meaningful edge cases (fixed, deterministic; none is an official pair).
    const v2 = [
      ['A', 0], ['AAAA', 0], ['ABCD', 1], ['AAABBB', 3],
    ].map(([s, k]) => toTest(s, k));

    // v3: adversarial SAME-task placements (signature + rules unchanged):
    // decoy runs and a hidden majority punish greedy / first-run shortcuts.
    const v3 = [
      ['BBAAABBBAAABBB', 2], ['CCCCDCCCCDCCCC', 1],
      ['ZYXWVUTSRQPONM', 3], ['AABABBAABABBA', 2],
    ].map(([s, k]) => toTest(s, k));

    const mk = (id, suffix, seedLabel, intent, statement, tests, hints) => buildVariant({
      id, seedLabel, intent, difficulty,
      title: `${base} — ${suffix} (replacement-window drill)`,
      statement, signature, tests, mode: 'exact', hints,
    });

    return [
      mk('v1', 'fresh strings', 'fresh strings',
        'Same pattern, different strings so you reproduce the window reasoning.',
        `${STATEMENT} These fresh inputs use only A/B/C and are 4 to 10 characters long, so replacement battles are frequent. k is between 0 and the string length.`,
        v1,
        ['Expand right and count letters; replacements needed = window length minus the most frequent letter.',
         'Shrink left only while that need exceeds k, then record the window length.']),
      mk('v2', 'edge cases', 'edge cases',
        'Same task with the edge cases the examples hide.',
        `${STATEMENT} Boundary inputs: a single character, a uniform run with k = 0, all-distinct letters with one change, and a balanced half-half string where k flips the whole answer.`,
        v2,
        ['With k = 0 the answer is the longest existing run — no change is allowed.',
         'A single character always yields 1; k equal to the length always yields the full length.']),
      mk('v3', 'adversarial placements', 'adversarial placements',
        'Same task, adversarial placement that punishes greedy shortcuts.',
        `${STATEMENT} Same rules, hostile layouts: decoy runs at the start compete for the majority, the true majority hides at the end, and an all-distinct string forces the window to stay small. No rule change — the same sliding window solves all of them.`,
        v3,
        ['The majority letter is not always the first run — the window must slide past decoys.',
         'Recount after each placement; a stale guess from the opening run misleads a greedy choice.']),
    ];
  } catch {
    return [];
  }
}
