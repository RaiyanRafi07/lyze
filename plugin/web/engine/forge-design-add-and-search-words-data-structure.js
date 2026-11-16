/**
 * design-add-and-search-words-data-structure — portable standalone practice builder.
 *
 * Produces exactly 3 deterministic variants for slug
 * `design-add-and-search-words-data-structure` (Medium). The live record is
 * judge:null (operations-profile design problem: WordDictionary/addWord/search
 * transcript with '.' wildcards). The forge therefore documents an honest TEST
 * PROFILE — runWordDictOps(ops:string[], words:string[]) -> string — where ops
 * is the parallel op-name array, words carries each call's first argument (""
 * for the constructor slot), and the return is the output literal (e.g.
 * "[null,null,null,null,false,true,true,true]").
 * Every expected value is computed at build time by oracleSequence below
 * (plain word-list scan with character-by-character '.' matching — a
 * deliberately different algorithm from the trie's DFS fan-out).
 *
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 *
 * Staged source: .workers/jobs/question-owners-150/design-add-and-search-words-data-structure/practice.mjs
 * (list-scan oracle, constraint notes); inputs fixed here for stability, all
 * within the official constraints (1..25 lowercase, <=2 dots per query).
 */

export const SLUG = 'design-add-and-search-words-data-structure'
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'
export const SIGNATURE = Object.freeze({
  name: 'runWordDictOps',
  params: Object.freeze([{ name: 'ops', type: 'string[]' }, { name: 'words', type: 'string[]' }]),
  return: 'string',
})

export const INTENT_SAME = 'Same ops profile: fresh words, mixed literal and wildcard queries.'
export const INTENT_EDGE = 'Same profile with the single-char and dot-only boundary inputs.'
export const INTENT_TWIST = 'Shared-stem branching trap: dots fan out over near-identical branches.'

/** Independent oracle: list scan, no trie. */
export function oracleSearch(addedWords, pattern) {
  for (const w of addedWords) {
    if (w.length !== pattern.length) continue
    let ok = true
    for (let i = 0; i < w.length; i++) {
      if (pattern[i] !== '.' && pattern[i] !== w[i]) { ok = false; break }
    }
    if (ok) return true
  }
  return false
}

export function oracleSequence(addWords, patterns) {
  return patterns.map((p) => oracleSearch(addWords, p))
}

const literalOf = (values) =>
  '[' + values.map((v) => (v === null || v === undefined ? 'null' : v === true ? 'true' : v === false ? 'false' : String(v))).join(',') + ']'
const qstr = (s) => JSON.stringify(s)

function transcript(addWords, patterns) {
  const ops = ['WordDictionary']
  const words = ['']
  for (const w of addWords) { ops.push('addWord'); words.push(w) }
  for (const p of patterns) { ops.push('search'); words.push(p) }
  const out = [null]
  for (const _w of addWords) out.push(null)
  for (const p of patterns) out.push(oracleSearch(addWords, p))
  return { ops, words, expected: literalOf(out) }
}

function toTest(addWords, patterns) {
  const t = transcript(addWords, patterns)
  return { args: [qstr(t.ops), qstr(t.words)], expected: qstr(t.expected) }
}

function cloneSignature() {
  return { name: SIGNATURE.name, params: SIGNATURE.params.map((p) => ({ ...p })), return: SIGNATURE.return }
}
function inputLine(sig, args) {
  return sig.params.map((p, i) => `${p.name} = ${args[i]}`).join(', ')
}
function buildVariant({ id, seedLabel, intent, suffix, statement, tests, hints }) {
  const capped = tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
  const first = capped[0]
  return {
    id, seedLabel, intent, difficulty: DIFFICULTY,
    title: `WordDictionary — ${suffix} (generated)`,
    statement, signature: cloneSignature(),
    examples: [{ input: inputLine(cloneSignature(), first.args), output: first.expected, explain: '' }],
    tests: capped, mode: MODE,
    hints: hints.slice(0, 2),
    note: 'Generated drill (fixed inputs); test profile runWordDictOps replays ops/words. Real LeetCode profile is the WordDictionary transcript.',
  }
}

export function buildWordDictPractice() {
  return [
    buildVariant({
      id: 'v1', seedLabel: 'fresh words', intent: INTENT_SAME,
      suffix: 'fresh words, mixed queries',
      statement:
        'Generated drill under the real ops profile: add 4 fresh lowercase words, then 4 searches (one exact hit, two wildcard queries with 1-2 dots, one clean miss); plus a dense shared-prefix set and a no-match set. A literal search must land on a node whose isWord flag is set; a dot fans out over the real children only.',
      tests: [
        toTest(['dove', 'dog', 'door', 'dorm'], ['dove', 'do.', 'd..r', 'zzzz']),
        toTest(['bad', 'dad', 'mad'], ['pad', 'bad', '.ad', 'b..']),
        toTest(['a', 'ab', 'abc'], ['a', 'a.', '.b.', 'abcd']),
      ],
      hints: [
        'A literal search must land on a node whose isWord flag is set: a mere prefix is false.',
        'A dot fans out over the real children only; try each branch in order.',
      ],
    }),
    buildVariant({
      id: 'v2', seedLabel: 'edge cases', intent: INTENT_EDGE,
      suffix: 'single-char words and dot queries',
      statement:
        'Generated boundary run: 1-letter words, a 1-dot query (matches any single added letter) and a 2-dot query (matches only a 2-letter word); plus single-word and empty-pattern-adjacent sets. Length must agree before any character comparison. No rule change.',
      tests: [
        toTest(['a', 'b', 'ab'], ['a', '.', '..', 'a.']),
        toTest(['x'], ['x', '.', 'y', 'x.']),
        toTest(['ab', 'cd'], ['..', 'a.', '.d', 'abc']),
      ],
      hints: [
        '"." matches exactly one character: it never matches the empty suffix or a longer word.',
        'A 1-letter word does not make its node a prefix-hit for a 2-long pattern.',
      ],
    }),
    buildVariant({
      id: 'v3', seedLabel: 'adversarial branching', intent: INTENT_TWIST,
      suffix: 'shared-stem branching trap',
      statement:
        'Generated transfer case: three added words share a stem and differ only in the last letter. Wildcards fan out over near-identical branches; one query is a near-miss that shares the stem but matches no terminal. A second set varies the stem length. No rule change.',
      tests: [
        toTest(['card', 'care', 'cart'], ['car.', 'ca.e', 'cars', 'ca..']),
        toTest(['test', 'tent', 'tenth'], ['te.t', 'ten.', 'tex.', '....']),
        toTest(['go', 'gone', 'goal'], ['go', 'go.', 'g..', 'gone']),
      ],
      hints: [
        'A shared stem means the dot fan-out visits several live branches: every one must be resolved.',
        'The near-miss dies only at the final character: the prefix being present proves nothing.',
      ],
    }),
  ]
}

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oracleSequence (word-list scan; DFS fan-out used only in walkthrough)',
})
