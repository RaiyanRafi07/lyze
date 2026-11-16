/**
 * word-ladder — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `word-ladder`
 * (Word Ladder, Hard, ladderLength(string,string,string[])->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Seeded (mulberry32, default seed 133): the seed picks the fresh-data chain
 * and shuffles wordList order. Shuffling is answer-invariant: BFS discovers
 * neighbours by mutation, never by list position. Every expected value is
 * computed at build time by oracleLadderLength below (explicit differ-by-one
 * graph + FIFO BFS, no alphabet-mutation loop), an INDEPENDENT implementation
 * of the same operation (not the walkthrough's mutation-BFS frame emitter).
 *
 * Staged source: .workers/jobs/question-owners-150/word-ladder/practice.js
 * (fresh/edge/adversarial drills, oracle, seeded shuffle); reshaped into the
 * forge variant contract (id/seedLabel/intent/difficulty/title/statement/
 * signature/examples/tests/mode/hints). All three sets are the SAME task
 * (no rule change, no output-type twist).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (mode 'exact').
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'word-ladder'
export const SIGNATURE = Object.freeze({
  name: 'ladderLength',
  params: Object.freeze([
    { name: 'beginWord', type: 'string' },
    { name: 'endWord', type: 'string' },
    { name: 'wordList', type: 'string[]' },
  ]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Hard'

export const INTENT_SAME = 'Same task, different ladder so you reproduce the layer-count BFS reasoning.'
export const INTENT_EDGE = 'Same task with the edge cases the worked example hides.'
export const INTENT_ADVERSARIAL = 'Same task, adversarial shape: endWord present yet unreachable, so BFS must drain honestly.'

/**
 * INDEPENDENT oracle: explicit differ-by-one graph + FIFO BFS (no alphabet
 * mutation loop). Different code path from the walkthrough's mutation BFS.
 */
export function oracleLadderLength(beginWord, endWord, wordList) {
  const list = Array.isArray(wordList) ? wordList : []
  const words = [beginWord, ...list]
  if (!words.includes(endWord)) return 0
  if (beginWord === endWord) return 1
  const differByOne = (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
    let d = 0
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++d > 1) return false
    return d === 1
  }
  const dist = new Map([[beginWord, 1]])
  const q = [beginWord]
  while (q.length) {
    const cur = q.shift()
    for (const w of words) {
      if (dist.has(w)) continue
      if (differByOne(cur, w)) {
        dist.set(w, dist.get(cur) + 1)
        if (w === endWord) return dist.get(w)
        q.push(w)
      }
    }
  }
  return 0
}

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled(arr, rand) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const lit = (s) => JSON.stringify(s)
const listLit = (arr) => JSON.stringify(arr)

const FRESH_OPTIONS = [
  {
    beginWord: 'cold', endWord: 'warm',
    chain: ['cold', 'cord', 'card', 'ward', 'warm'],
    extra: ['sold'],
    tests: [
      { b: 'cold', e: 'sold', want: '2' },
      { b: 'card', e: 'warm', want: '3' },
    ],
  },
  {
    beginWord: 'cat', endWord: 'red',
    chain: ['cat', 'bat', 'bet', 'bed', 'red'],
    extra: ['cab'],
    tests: [
      { b: 'cat', e: 'bat', want: '2' },
      { b: 'bat', e: 'red', want: '4' },
    ],
  },
  {
    beginWord: 'lead', endWord: 'gold',
    chain: ['lead', 'load', 'goad', 'gold'],
    extra: ['leaf'],
    tests: [
      { b: 'lead', e: 'load', want: '2' },
      { b: 'leaf', e: 'gold', want: '5' },
    ],
  },
]

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  }
}

function inputLine(signature, args) {
  return signature.params
    .map((param, index) => `${(param && param.name) || 'arg' + index} = ${args[index]}`)
    .join(', ')
}

function checkOracle(beginWord, endWord, order, want) {
  const got = String(oracleLadderLength(beginWord, endWord, order))
  if (got !== String(want)) throw new Error('word-ladder oracle disagreement: ' + beginWord + '->' + endWord)
  return got
}

function buildVariant({ id, seedLabel, intent, title, statement, tests, hints }) {
  const slim = tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
  const first = slim[0]
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title,
    statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(SIGNATURE, first.args), output: first.expected, explain: '' }],
    tests: slim,
    mode: MODE,
    hints: hints.slice(0, 2),
  }
}

/* ---------------- entry point ---------------- */

export function buildWordLadderVariants(seed = 133) {
  const s = Number.isInteger(seed) ? seed : 133
  const rand = rng(s)
  const opt = FRESH_OPTIONS[s % FRESH_OPTIONS.length]

  const freshOrder = shuffled([...new Set([...opt.chain, ...opt.extra])], rand)
  const freshTests = [
    { args: [lit(opt.beginWord), lit(opt.endWord), listLit(freshOrder)], expected: checkOracle(opt.beginWord, opt.endWord, freshOrder, String(opt.chain.length)) },
    ...opt.tests.map((t) => ({ args: [lit(t.b), lit(t.e), listLit(freshOrder)], expected: checkOracle(t.b, t.e, freshOrder, t.want) })),
  ]

  const withEnd = shuffled(['hot', 'dot', 'dog'], rand)
  const withoutEnd = shuffled(['dot', 'dog', 'lot', 'log'], rand)
  const hotPath = shuffled(['hot', 'dot'], rand)
  const edgeTests = [
    { args: [lit('hit'), lit('cog'), listLit(withoutEnd)], expected: checkOracle('hit', 'cog', withoutEnd, '0') },
    { args: [lit('hit'), lit('hot'), listLit(withEnd)], expected: checkOracle('hit', 'hot', withEnd, '2') },
    { args: [lit('hit'), lit('dot'), listLit(hotPath)], expected: checkOracle('hit', 'dot', hotPath, '3') },
  ]

  const iso = shuffled(['hot', 'cog'], rand)
  const tail = shuffled(['tall', 'tail'], rand)
  const cost = shuffled(['lost', 'cost', 'most'], rand)
  const advTests = [
    { args: [lit('hit'), lit('cog'), listLit(iso)], expected: checkOracle('hit', 'cog', iso, '0') },
    { args: [lit('talk'), lit('tail'), listLit(tail)], expected: checkOracle('talk', 'tail', tail, '3') },
    { args: [lit('lost'), lit('cost'), listLit(cost)], expected: checkOracle('lost', 'cost', cost, '2') },
  ]

  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh chain',
      intent: INTENT_SAME,
      title: 'Word Ladder — fresh chain (same task)',
      statement:
        'Generated practice. Return the number of words in the shortest transformation sequence from beginWord to endWord using wordList (one letter per step, every intermediate word must be in wordList), or 0 if none exists. Fresh seeded chain below with the wordList order shuffled; shuffling never changes the answer. Layers count words, so the first visit is the shortest.',
      tests: freshTests,
      hints: [
        'BFS from beginWord; the layer number is the answer because the first visit is the shortest.',
        'Return 0 immediately when endWord is not in wordList; it can never be reached.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Word Ladder — edge cases (same task)',
      statement:
        'Generated practice. Same ladderLength contract on the cases the worked example hides: a missing endWord (answer 0), a one-step ladder, and a two-step chain. A beginWord one letter from endWord is answer 2 (both words counted), not 1. Guard endWord membership before running BFS.',
      tests: edgeTests,
      hints: [
        'Guard endWord membership before BFS: an absent endWord short-circuits to 0.',
        'A beginWord one letter from endWord is answer 2 (both words counted), not 1.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'isolated endWord',
      intent: INTENT_ADVERSARIAL,
      title: 'Word Ladder — isolated endWord (same task)',
      statement:
        'Generated practice. Same task, adversarial shape: endWord sits in wordList, yet no one-letter chain connects it, so BFS must drain and return 0. Presence in wordList is necessary but not sufficient — connectivity decides. No rule change: identical signature, only the words fight back.',
      tests: advTests,
      hints: [
        'Presence in wordList is necessary but not sufficient: connectivity decides.',
        'Trace the queue: after hot there are no fresh neighbours, so the answer stays 0.',
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
  oracle: 'oracleLadderLength (explicit differ-by-one graph BFS; walkthrough uses alphabet-mutation BFS)',
})
