/**
 * implement-trie-prefix-tree — portable standalone practice builder.
 *
 * Produces exactly 3 deterministic variants for slug `implement-trie-prefix-tree`
 * (Implement Trie, Easy). The live record is judge:null (operations-profile
 * design problem: Trie/insert/search/startsWith transcript). The forge therefore
 * documents an honest TEST PROFILE — runTrieOps(ops:string[], words:string[])
 * -> string — where ops is the parallel op-name array, words carries each
 * call's first argument ("" for the constructor slot), and the return is the
 * output literal (e.g. "[null,null,true,false,true,null,true]").
 * Every expected value is computed at build time by oracleTranscript below
 * (independent set/scan implementation — no trie structure at all).
 *
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 *
 * Staged source: .workers/jobs/question-owners-150/implement-trie-prefix-tree/practice.mjs
 * (transcripts, set/scan oracle, hints); reshaped into the forge variant contract
 * (id v1/v2/v3, seedLabel, intent, difficulty, title, statement, signature,
 * examples == tests[0], mode, 2 hints).
 */

export const SLUG = 'implement-trie-prefix-tree'
export const MODE = 'exact'
export const DIFFICULTY = 'Easy'
export const SIGNATURE = Object.freeze({
  name: 'runTrieOps',
  params: Object.freeze([{ name: 'ops', type: 'string[]' }, { name: 'words', type: 'string[]' }]),
  return: 'string',
})

export const INTENT_FRESH = 'Same question, fresh seeded input so you reproduce the walk, not the memory.'
export const INTENT_EDGE = 'Same question with the boundary inputs the worked example hides.'
export const INTENT_TWIST = 'Same signature, adversarial prefix/word traps: passing needs the end-mark distinction, not just reachability.'

/** Independent oracle: no trie structure. Set membership + linear prefix scan. */
export function oracleTranscript(ops, words) {
  if (!Array.isArray(ops) || !Array.isArray(words) || ops.length !== words.length || ops.length === 0) {
    throw new Error('oracleTranscript needs parallel non-empty ops/words')
  }
  const stored = new Set()
  const out = [null]
  for (let i = 1; i < ops.length; i += 1) {
    const op = ops[i]
    const word = String(words[i] ?? '')
    if (op === 'insert') {
      stored.add(word)
      out.push(null)
    } else if (op === 'search') {
      out.push(stored.has(word))
    } else if (op === 'startsWith') {
      let hit = false
      for (const w of stored) {
        if (w.length >= word.length && w.slice(0, word.length) === word) { hit = true; break }
      }
      out.push(hit)
    } else {
      throw new Error('oracleTranscript: unknown op ' + String(op))
    }
  }
  return out
}

const literalOf = (values) =>
  '[' + values.map((v) => (v === null || v === undefined ? 'null' : v === true ? 'true' : v === false ? 'false' : String(v))).join(',') + ']'
const qstr = (s) => JSON.stringify(s)

function toTest(ops, words) {
  return { args: [qstr(ops), qstr(words)], expected: qstr(literalOf(oracleTranscript(ops, words))) }
}

function cloneSignature() {
  return { name: SIGNATURE.name, params: SIGNATURE.params.map((p) => ({ ...p })), return: SIGNATURE.return }
}
function inputLine(sig, args) {
  return sig.params.map((p, i) => `${p.name} = ${args[i]}`).join(', ')
}
function buildVariant({ id, seedLabel, intent, suffix, statement, tests, hints, difficulty }) {
  const capped = tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
  const first = capped[0]
  return {
    id, seedLabel, intent, difficulty: difficulty || DIFFICULTY,
    title: `Implement Trie — ${suffix} (generated)`,
    statement, signature: cloneSignature(),
    examples: [{ input: inputLine(cloneSignature(), first.args), output: first.expected, explain: '' }],
    tests: capped, mode: MODE,
    hints: hints.slice(0, 2),
    note: 'Generated transcript (seeded); test profile runTrieOps replays ops/words and returns the output literal. Real LeetCode profile is the Trie class transcript.',
  }
}

export function buildTriePractice() {
  const T = (ops, words) => toTest(ops, words)
  return [
    buildVariant({
      id: 'v1', seedLabel: 'fresh seeded words', intent: INTENT_FRESH,
      suffix: 'fresh inserts and mixed queries',
      statement:
        'Run these generated transcripts on your Trie: insert "app", "dove", "dog" and "dot" (in that order), then search "do", search "dove", startsWith "do", search "app", startsWith "apx" and search "dogs"; plus the canonical apple/app walk and a short truck/try pair. Void and constructor slots read null; queries read true/false. The signature and exact comparison are unchanged.',
      tests: [
        T(['Trie', 'insert', 'insert', 'insert', 'insert', 'search', 'search', 'startsWith', 'search', 'startsWith', 'search'], ['', 'app', 'dove', 'dog', 'dot', 'do', 'dove', 'do', 'app', 'apx', 'dogs']),
        T(['Trie', 'insert', 'search', 'search', 'startsWith', 'insert', 'search'], ['', 'apple', 'apple', 'app', 'app', 'app', 'app']),
        T(['Trie', 'insert', 'insert', 'search', 'startsWith', 'search'], ['', 'truck', 'try', 'tru', 'tr', 'truck']),
      ],
      hints: [
        '"do" is a prefix of stored words but no word ends there: search is false while startsWith is true.',
        '"dogs" is longer than any stored word, so the walk runs out of edges and returns false.',
      ],
    }),
    buildVariant({
      id: 'v2', seedLabel: 'edge cases', intent: INTENT_EDGE,
      suffix: 'empty trie, duplicates, longer-than-word',
      statement:
        'Run these generated transcripts on your Trie, including the empty-trie miss, duplicate inserts, and longer-than-word queries. A duplicate insert must not corrupt the stored word; a query longer than every stored word misses. The signature and exact comparison are unchanged.',
      tests: [
        T(['Trie', 'search', 'insert', 'insert', 'insert', 'search', 'search', 'startsWith', 'insert', 'search', 'search'], ['', 'ax', 'ax', 'up', 'i', 'ax', 'a', 'a', 'ax', 'ax', 'axx']),
        T(['Trie', 'search', 'insert', 'search'], ['', 'zz', 'zz', 'zz']),
        T(['Trie', 'insert', 'insert', 'insert', 'startsWith', 'search'], ['', 'a', 'ab', 'abc', 'ab', 'abc']),
      ],
      hints: [
        'A query on the empty trie misses on its very first character: false with no nodes touched.',
        'Single-character words ("i") end at depth 1; their own prefixes are never queried.',
      ],
    }),
    buildVariant({
      id: 'v3', seedLabel: 'adversarial prefix/word traps', intent: INTENT_TWIST,
      suffix: 'word-vs-prefix distinction under shared stems',
      statement:
        'RULE FOCUS (same signature, harder discrimination): insert "car", "card", "care" and "careful", then search "car", search "ca", startsWith "car", search "carefu", startsWith "carefulx", insert "car" again, and search "card"; plus a sun/sunny shadow pair and a prefix-only miss. Reachability alone is not enough: search needs the word-end mark, startsWith needs only the path. Judge mode stays exact.',
      tests: [
        T(['Trie', 'insert', 'insert', 'insert', 'insert', 'search', 'search', 'startsWith', 'search', 'startsWith', 'insert', 'search'], ['', 'car', 'card', 'care', 'careful', 'car', 'ca', 'car', 'carefu', 'carefulx', 'car', 'card']),
        T(['Trie', 'insert', 'search', 'startsWith', 'search'], ['', 'sun', 'sun', 'sunny', 'sunny']),
        T(['Trie', 'insert', 'search', 'startsWith'], ['', 'a', 'ab', 'ab']),
      ],
      hints: [
        '"ca" is reachable but ends no word: search false, while startsWith "car" on the same walk is true.',
        '"carefu" is a strict prefix of "careful": search is false even though every edge exists.',
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
  oracle: 'oracleTranscript (Set membership + linear prefix scan; no trie structure)',
})
