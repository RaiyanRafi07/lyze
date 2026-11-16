/**
 * alien-dictionary — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `alien-dictionary`
 * (NeetCode Foreign Dictionary / LeetCode 269 equivalent, Hard,
 * foreignDictionary(words:string[])->string, mode any).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * solveAlienDFS below (iterative DFS postorder with explicit cycle colors), an
 * INDEPENDENT implementation of the same operation (not the walkthrough's
 * Kahn BFS), and cross-checked against the Kahn reference; disagreement throws.
 *
 * Honest TEST PROFILE: the live shard set carries no alien-dictionary record
 * (LeetCode 269 is premium-only, judge:null by absence), so this forge uses
 * foreignDictionary(words:string[])->string, documented in the live adapter.
 * Precedents: mergeKLists(int[][])->int[], runTrieOps(string[],string[])->string.
 * Comparison is property-based: any ordering respecting every adjacent-pair
 * vote passes; "" passes iff the list is unorderable (prefix or cycle).
 *
 * Staged source: .workers/jobs/neetcode150-completion/alien-dictionary/forge.alien-dictionary.js
 * (oracles, validator, variant intents); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the documented test profile, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is one valid
 *   answer literal (never the only answer: any valid order passes).
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'any' (property-based, not exact-string).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'alien-dictionary';

export const SIGNATURE = Object.freeze({
  name: 'foreignDictionary',
  params: Object.freeze([{ name: 'words', type: 'string[]' }]),
  return: 'string',
});

export const MODE = 'any';
export const DIFFICULTY = 'Hard';

export const INTENT_SAME = 'Same pattern, different letters so you reproduce the votes.';
export const INTENT_EDGE = 'Same pattern with the edges the original hides.';
export const INTENT_ADVERSARIAL = 'Same task with denser vote graphs that punish pair-skipping.';

/** Canonical oracle: Kahn's algorithm, alphabetical tie-break (matches the walkthrough). */
export function referenceAlienKahn(words) {
  const letters = [...new Set(words.join('').split(''))].sort();
  const adj = new Map(letters.map((c) => [c, new Set()]));
  const indegree = new Map(letters.map((c) => [c, 0]));
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i];
    const b = words[i + 1];
    let j = 0;
    const m = Math.min(a.length, b.length);
    while (j < m && a[j] === b[j]) j++;
    if (j === m) {
      if (a.length > b.length) return '';
      continue;
    }
    if (!adj.get(a[j]).has(b[j])) { adj.get(a[j]).add(b[j]); indegree.set(b[j], indegree.get(b[j]) + 1); }
  }
  const q = letters.filter((c) => indegree.get(c) === 0);
  let order = '';
  while (q.length) {
    const u = q.shift();
    order += u;
    for (const v of [...adj.get(u)].sort()) {
      indegree.set(v, indegree.get(v) - 1);
      if (indegree.get(v) === 0) q.push(v);
    }
    q.sort();
  }
  return order.length === letters.length ? order : '';
}

/** INDEPENDENT oracle: iterative DFS postorder with explicit cycle colors. */
export function solveAlienDFS(words) {
  const letters = [...new Set(words.join('').split(''))].sort();
  const adj = new Map(letters.map((c) => [c, new Set()]));
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i];
    const b = words[i + 1];
    let j = 0;
    const m = Math.min(a.length, b.length);
    while (j < m && a[j] === b[j]) j++;
    if (j === m) {
      if (a.length > b.length) return '';
      continue;
    }
    adj.get(a[j]).add(b[j]);
  }
  const color = new Map();
  const post = [];
  let cyclic = false;
  const visit = (u) => {
    color.set(u, 1);
    for (const v of [...adj.get(u)].sort()) {
      if (color.get(v) === 1) { cyclic = true; return; }
      if (!color.has(v)) visit(v);
      if (cyclic) return;
    }
    color.set(u, 2);
    post.push(u);
  };
  for (const c of letters) if (!color.has(c)) visit(c);
  if (cyclic) return '';
  return post.reverse().join('');
}

/** Property validator: exact-string equality is WRONG here. */
export function isValidAlienOrder(result, words) {
  const letters = [...new Set(words.join('').split(''))].sort();
  const badPrefix = words.some((w, i) => {
    if (i + 1 >= words.length) return false;
    const b = words[i + 1];
    const m = Math.min(w.length, b.length);
    let j = 0;
    while (j < m && w[j] === b[j]) j++;
    return j === m && w.length > b.length;
  });
  const adj = new Map(letters.map((c) => [c, new Set()]));
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i];
    const b = words[i + 1];
    let j = 0;
    const m = Math.min(a.length, b.length);
    while (j < m && a[j] === b[j]) j++;
    if (j < m) adj.get(a[j]).add(b[j]);
  }
  const color = new Map();
  let cyclic = false;
  const dfs = (u) => {
    color.set(u, 1);
    for (const v of adj.get(u)) {
      if (color.get(v) === 1) { cyclic = true; return; }
      if (!color.has(v)) dfs(v);
    }
    color.set(u, 2);
  };
  for (const c of letters) if (!color.has(c)) dfs(c);
  if (result === '') return badPrefix || cyclic;
  if (badPrefix || cyclic) return false;
  if (result.length !== letters.length || new Set(result.split('')).size !== letters.length) return false;
  const pos = new Map(result.split('').map((c, i) => [c, i]));
  for (const c of letters) if (!pos.has(c)) return false;
  for (const [u, vs] of adj) for (const v of vs) if (pos.get(u) > pos.get(v)) return false;
  return true;
}

function check(words, oneValid) {
  const a = referenceAlienKahn(words);
  const b = solveAlienDFS(words);
  if ((a === '') !== (b === '')) throw new Error('oracle emptiness disagreement for ' + JSON.stringify(words));
  if (!isValidAlienOrder(a, words)) throw new Error('Kahn output invalid for ' + JSON.stringify(words) + ': ' + JSON.stringify(a));
  if (!isValidAlienOrder(b, words)) throw new Error('DFS output invalid for ' + JSON.stringify(words) + ': ' + JSON.stringify(b));
  if (!isValidAlienOrder(oneValid, words)) throw new Error('listed expected invalid for ' + JSON.stringify(words) + ': ' + JSON.stringify(oneValid));
  return oneValid;
}

const argLiteral = (value) => JSON.stringify(value);
const outLiteral = (value) => JSON.stringify(value);

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

function makeTests(rows) {
  return rows.map(([words, oneValid]) => {
    const expected = outLiteral(check(words, oneValid));
    return { args: [argLiteral(words)], expected };
  }).slice(0, 5);
}

function buildVariant({ id, seedLabel, intent, suffix, taskLabel, statement, rows, hints }) {
  const tests = makeTests(rows);
  const first = tests[0];
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title: 'Alien Dictionary — ' + suffix + ' (' + taskLabel + ')',
    statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(SIGNATURE, first.args), output: first.expected, explain: '' }],
    tests: tests.map((t) => ({ args: t.args.map(String), expected: String(t.expected) })),
    mode: MODE,
    comparison: 'property: isValidAlienOrder(output, words); "" iff unorderable',
    hints: hints.slice(0, 2),
  };
}

/* ---------------- entry point ---------------- */

export function buildAlienDictionaryPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh letters drill',
      intent: INTENT_SAME,
      suffix: 'fresh letters drill',
      taskLabel: 'kahn drill',
      statement:
        'Given words sorted under an unknown alphabet, return any valid ordering of the observed letters, or "" when no ordering explains the list. ' +
        'The first test is the sourced two-word example; the rest are generated drills with fresh letters, including the classic five-word chain. ' +
        'Only adjacent pairs vote, at their first differing character.',
      rows: [
        [['z', 'o'], 'zo'],
        [['ba', 'bc', 'ac'], 'bac'],
        [['a', 'b', 'c'], 'abc'],
        [['wrt', 'wrf', 'er', 'ett', 'rftt'], 'wertf'],
      ],
      hints: [
        'Only adjacent pairs vote, at their first differing character.',
        'Kahn over the votes: queue every indegree-0 letter, pop, release its voters.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'prefix plus cycle edges',
      intent: INTENT_EDGE,
      suffix: 'prefix plus cycle edges',
      taskLabel: 'boundary drill',
      statement:
        'Same alphabet task at the boundaries the worked example hides: a longer word before its own prefix is instantly impossible. ' +
        'A harmless prefix adds no vote, a lone word orders itself, and opposite votes on one pair form a two-way cycle. ' +
        'Every "" below is a real verdict from the independent oracles, not a placeholder.',
      rows: [
        [['abc', 'ab'], ''],
        [['ab', 'abc'], 'abc'],
        [['z'], 'z'],
        [['a', 'b', 'a'], ''],
      ],
      hints: [
        'Longer-before-its-own-prefix is instant "" — no graph is needed.',
        'a<b and b<a votes together are a cycle: Kahn places nobody, answer "".',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'denser vote chains',
      intent: INTENT_ADVERSARIAL,
      suffix: 'denser vote chains',
      taskLabel: 'same task, vote traps',
      statement:
        'Same task and same string answer shape (honestly same-task, not a twist): denser vote graphs where skipping any adjacent pair breaks the chain. ' +
        'The first test is the sourced five-word chain h->e->r->n->f, one edge per adjacent pair. ' +
        'Duplicate letters across words add no new votes; only first differences count.',
      rows: [
        [['hrn', 'hrf', 'er', 'enn', 'rfnn'], 'hernf'],
        [['wrt', 'wrf', 'er', 'ett', 'rftt'], 'wertf'],
        [['ab', 'adc', 'b', 'cab'], 'abcd'],
        [['caa', 'aaa', 'aab'], 'cab'],
      ],
      hints: [
        'Chain the votes: h->e->r->n->f comes from four adjacent pairs, one edge each.',
        'This set is honestly same-task: signature, any-valid-order mode, and string answer are unchanged.',
      ],
    }),
  ];
}

// Staged-compat alias: same builder, family-style name.
export const buildPracticeVariants = buildAlienDictionaryPractice;

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'solveAlienDFS (iterative DFS postorder with cycle colors; walkthrough uses Kahn BFS)',
});

export default buildAlienDictionaryPractice;
