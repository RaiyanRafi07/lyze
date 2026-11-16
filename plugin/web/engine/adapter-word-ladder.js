/**
 * word-ladder — live semantic adapter (graph-bfs).
 *
 * Walkthrough algorithm: alphabet-mutation BFS from beginWord over the dict.
 * Guard: endWord absent from wordList means 0. Otherwise queue=[beginWord],
 * level=1; each layer dequeues every word (returning level on endWord) and
 * enqueues every unvisited one-letter dict mutation; level++ per layer.
 * Drain means 0. Every frame is produced by running this exact procedure on
 * the actual inputs — no invented words, no future values.
 * O(L * 26 * N) time, O(N * L) space.
 *
 * Staged source: `.workers/jobs/question-owners-150/word-ladder/adapter.patch.js`
 * (SIGNATURE, reference ladderLength, independent oracle, step-tagged
 * Java/C++/pseudocode, per-step EXPLAIN, lesson, real frame-emitting scene
 * builder) — ported to the live shape: shared `code`/`frame` helpers imported
 * from semantic-core.js, no local helper redefinitions. Signature equals the
 * live judge signature exactly.
 *
 * Visual bound: beginWord + 11 dict words on screen (12 nodes); endWord is
 * swapped in when cut off. The answer always covers the full dict. Emission
 * stops at 39 frames + terminal return (40 max); the return note carries
 * "(trace capped)" when emission stopped early.
 */
import { code, frame, boundedFrames } from './semantic-core.js'

// boundedFrames is applied by semantic.js (single compaction pass); the import
// keeps this adapter on the shared helper contract. Adapters return FULL lists.

const MAX_NODES = 12 // beginWord + up to 11 dict words on screen
const MAX_FRAMES = 40 // host contract ceiling

const ladderJava = code(`
[def] class Solution {
[def]     public int ladderLength(String beginWord, String endWord, String[] wordList) {
[init]         Set<String> dict = new HashSet<>(java.util.Arrays.asList(wordList));
[check]         if (!dict.contains(endWord)) return 0;
[init]         Queue<String> queue = new LinkedList<>();
[init]         Set<String> visited = new HashSet<>();
[seed]         queue.offer(beginWord); visited.add(beginWord);
[seed]         int level = 1;
[level]         while (!queue.isEmpty()) {
[level]             int size = queue.size();
[visit]             for (int s = 0; s < size; s++) {
[visit]                 String word = queue.poll();
[check]                 if (word.equals(endWord)) return level;
[expand]                 for (int i = 0; i < word.length(); i++) {
[expand]                     char[] chars = word.toCharArray();
[expand]                     for (char c = 'a'; c <= 'z'; c++) {
[check]                         if (chars[i] == c) continue;
[expand]                         chars[i] = c;
[visit]                         String next = new String(chars);
[update]                         if (dict.contains(next) && visited.add(next)) queue.offer(next);
[expand]                     }
[expand]                 }
[visit]             }
[level]             level++;
[level]         }
[return]         return 0;
[def]     }
[def] }
`)

const ladderCpp = code(`
[def] class Solution {
[def] public:
[def]     int ladderLength(string beginWord, string endWord, vector<string>& wordList) {
[init]         unordered_set<string> dict(wordList.begin(), wordList.end());
[check]         if (!dict.count(endWord)) return 0;
[init]         queue<string> q;
[init]         unordered_set<string> visited;
[seed]         q.push(beginWord); visited.insert(beginWord);
[seed]         int level = 1;
[level]         while (!q.empty()) {
[level]             int size = (int)q.size();
[visit]             for (int s = 0; s < size; s++) {
[visit]                 string word = q.front(); q.pop();
[check]                 if (word == endWord) return level;
[expand]                 for (size_t i = 0; i < word.size(); i++) {
[expand]                     string next = word;
[expand]                     for (char c = 'a'; c <= 'z'; c++) {
[check]                         if (next[i] == c) continue;
[expand]                         next[i] = c;
[update]                         if (dict.count(next) && !visited.count(next)) { visited.insert(next); q.push(next); }
[expand]                     }
[expand]                 }
[visit]             }
[level]             level++;
[level]         }
[return]         return 0;
[def]     }
[def] };
`)

const ladderPseudo = code(`
[def] ladderLength(beginWord, endWord, wordList):
[init]   dict = set(wordList)
[check]   if endWord not in dict: return 0
[seed]   queue = [beginWord]; visited = {beginWord}; level = 1
[level]   while queue not empty:
[level]     size = queue.length
[visit]     repeat size times:
[visit]       word = queue.shift()
[check]       if word == endWord: return level
[expand]       for i in 0..word.length-1:
[expand]         for c in 'a'..'z':
[check]           if word[i] == c: continue
[expand]           next = word with position i set to c
[update]           if next in dict and next not in visited: visited.add(next); queue.push(next)
[level]     level += 1
[return]   return 0
`)

export function differByOne(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++d > 1) return false
  return d === 1
}

function parseWordLiteral(lit) {
  if (typeof lit !== 'string') return null
  const t = lit.trim()
  if (t.length >= 2 && t[0] === '"' && t[t.length - 1] === '"') {
    try {
      const v = JSON.parse(t)
      return typeof v === 'string' ? v : null
    } catch { return null }
  }
  return null
}

function parseWordListLiteral(lit) {
  if (Array.isArray(lit)) return lit.every((w) => typeof w === 'string') ? lit.slice() : null
  if (typeof lit !== 'string') return null
  try {
    const v = JSON.parse(lit.trim())
    return Array.isArray(v) && v.every((w) => typeof w === 'string') ? v : null
  } catch { return null }
}

// Accept judge literal-string args [beginLit, endLit, listLit] or parsed values
// (semantic.js pre-parses literals before build runs).
function parseArgs(args) {
  if (!Array.isArray(args) || args.length !== 3) throw new Error('word-ladder: need [beginWord, endWord, wordList]')
  const b = parseWordLiteral(args[0]) ?? (typeof args[0] === 'string' ? args[0] : null)
  const e = parseWordLiteral(args[1]) ?? (typeof args[1] === 'string' ? args[1] : null)
  const l = parseWordListLiteral(args[2])
  if (typeof b !== 'string' || !b) throw new Error('word-ladder: beginWord must be a non-empty string')
  if (typeof e !== 'string' || !e) throw new Error('word-ladder: endWord must be a non-empty string')
  if (!Array.isArray(l)) throw new Error('word-ladder: wordList must be a string array literal')
  if (b.length !== e.length) throw new Error('word-ladder: beginWord and endWord must share one length')
  if (!l.every((w) => w.length === b.length)) throw new Error('word-ladder: every wordList entry must match beginWord length')
  if (l.length > 5000) throw new Error('word-ladder: wordList exceeds 5000 entries (got ' + l.length + ')')
  return { beginWord: b, endWord: e, wordList: l }
}

function clip(text, max) {
  const s = String(text).replace(/\s+/g, ' ').trim()
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + '?'
}

export function buildWordLadder(args) {
  const { beginWord: b, endWord: e, wordList: rawList } = parseArgs(args)

  // Shown node set: beginWord pinned at 0, then first dict words (deduped).
  const dictFull = [...new Set(rawList)]
  const dict = new Set(dictFull)
  const shown = [b, ...dictFull.filter((w) => w !== b).slice(0, MAX_NODES - 1)]
  // Keep endWord visible when it is cut off by the cap (swap the last slot).
  if (dict.has(e) && !shown.includes(e)) shown[shown.length - 1] = e
  const idOf = new Map(shown.map((w, i) => [w, i]))
  const nodes = shown.map((w, i) => ({ id: i, label: w }))
  const edges = []
  for (let x = 0; x < shown.length; x++) {
    for (let c = x + 1; c < shown.length; c++) {
      if (differByOne(shown[x], shown[c])) edges.push([x, c])
    }
  }
  const capped = dictFull.filter((w) => w !== b).length > MAX_NODES - 1
  const subtitle = b + ' -> ' + e + ' · ' + dictFull.length + ' dict word' + (dictFull.length === 1 ? '' : 's')
    + (capped ? '; showing ' + shown.length + ' (answer still over full list)' : '')

  const frames = []
  let cappedTrace = false
  const push = (step, label, note, st) => {
    if (frames.length >= MAX_FRAMES - 1) { cappedTrace = true; return }
    frames.push(frame(step, label, note, st || {}))
  }
  const visIds = (set) => [...set].map((w) => idOf.get(w)).filter((x) => x !== undefined)
  const distIds = (dist) => {
    const o = {}
    for (const [w, d] of dist) if (idOf.get(w) !== undefined) o[idOf.get(w)] = d
    return o
  }

  const finish = (answerOut) => ({
    kind: 'graph',
    problemSlug: 'word-ladder',
    title: 'Word Ladder — BFS word wavefront',
    subtitle: clip(subtitle, 90),
    pattern: 'graph-bfs',
    layout: { nodes, edges, directed: false },
    frames,
    result: answerOut,
  })

  push('init', 'input', 'Begin ' + b + ', end ' + e + ', dict holds ' + dictFull.length + ' word(s).', {})
  if (!dict.has(e)) {
    push('return', 'done: endWord absent', 'End ' + e + ' is not in wordList, so no chain exists; answer 0.', {
      visited: [],
      frontier: [],
      queue: [],
      distances: {},
    })
    return finish(0)
  }

  const visited = new Set([b])
  const parent = new Map()
  const dist = new Map([[b, 1]])
  let queue = [b]
  push('seed', 'seed BFS', 'Queue [' + b + ']; dist ' + b + '=1 (levels count words).', {
    visited: visIds(visited),
    frontier: [idOf.get(b)],
    queue: [idOf.get(b)],
    distances: distIds(dist),
  })

  let done = false
  while (queue.length && !done) {
    const layer = queue
    const next = []
    for (const cur of layer) {
      const curId = idOf.get(cur)
      const chain = []
      for (let w = cur; w !== undefined; w = parent.get(w)) {
        if (idOf.get(w) !== undefined) chain.unshift(idOf.get(w))
      }
      if (curId !== undefined && frames.length < MAX_FRAMES - 2) {
        push('visit', 'visit ' + cur, 'Dequeue ' + cur + ' at dist ' + dist.get(cur) + '; layer holds ' + layer.length + '.', {
          current: curId,
          visited: visIds(visited),
          frontier: visIds(new Set(layer)),
          queue: visIds(new Set(layer)),
          path: chain,
          distances: distIds(dist),
        })
      }
      if (cur === e) { done = true; break }
      const found = []
      for (let i = 0; i < cur.length; i++) {
        for (let c = 97; c <= 122; c++) {
          const ch = String.fromCharCode(c)
          if (ch === cur[i]) continue
          const nw = cur.slice(0, i) + ch + cur.slice(i + 1)
          if (dict.has(nw) && !visited.has(nw)) {
            visited.add(nw)
            parent.set(nw, cur)
            dist.set(nw, dist.get(cur) + 1)
            next.push(nw)
            found.push(nw)
            if (nw === e) done = true
          }
        }
      }
      if (found.length && curId !== undefined && frames.length < MAX_FRAMES - 2) {
        push('expand', 'expand ' + cur, cur + ' reaches ' + found.join(', ') + ' at dist ' + (dist.get(cur) + 1) + '.', {
          current: curId,
          visited: visIds(visited),
          frontier: visIds(new Set(next)),
          queue: visIds(new Set(next)),
          distances: distIds(dist),
        })
      }
      if (done) break
      if (frames.length >= MAX_FRAMES - 2) { cappedTrace = true; break }
    }
    queue = next
    if (!queue.length) break
  }

  const endPath = []
  if (dist.has(e)) {
    for (let w = e; w !== undefined; w = parent.get(w)) {
      if (idOf.get(w) !== undefined) endPath.unshift(idOf.get(w))
    }
  }
  const answer = dist.has(e) ? dist.get(e) : 0
  frames.push(frame(
    'return',
    answer ? 'done: answer ' + answer : 'done: no path',
    answer
      ? 'Shortest chain holds ' + answer + ' words; answer ' + answer + (cappedTrace ? ' (trace capped).' : '.')
      : 'Queue drained without reaching endWord; answer 0' + (cappedTrace ? ' (trace capped).' : '.'),
    { visited: visIds(visited), frontier: [], queue: [], path: endPath, distances: distIds(dist) },
  ))
  return finish(answer)
}

export const adapters = {
  'word-ladder': {
    signature: { name: 'ladderLength', params: ['string', 'string', 'string[]'], return: 'int' },
    lesson: {
      idea: 'BFS over words: each queue layer is one more word, so the first dequeue of endWord is the shortest.',
      trap: 'Guard endWord membership first; count words not edges; never revisit without a visited set.',
      time: 'O(L*26*N)',
      space: 'O(N*L)',
    },
    explain: {
      def: 'Declares solution scope so the BFS helper state stays inside ladderLength.',
      init: 'Builds the dict set and empty queue/visited so lookups are O(1) and repeats are impossible.',
      check: 'Guards the only early exits: endWord absent means 0, dequeued word equals endWord means level.',
      seed: 'Seeds BFS at beginWord with level 1 since the chain length counts words, not edges.',
      level: 'Freezes the current wavefront size so the level increments only after the whole layer is consumed.',
      visit: 'Dequeues one word of the current layer in FIFO order, preserving shortest-first.',
      expand: 'Generates all one-letter mutations and keeps only dict words, the true graph neighbours.',
      update: 'Inserts each fresh neighbour into visited and queue exactly once so work stays linear.',
      return: 'Closes the search scope: level on hit, else 0 when the queue drains with no path.',
    },
    explainLines: {
      java: {
        3: 'Absent-endWord guard: no chain can exist, so answer 0 without any BFS work.',
        12: 'Hit line: the dequeued word is endWord, so the current level is the shortest length.',
        16: 'Skip self-mutation: the unchanged letter is not a neighbour, saving 1 of 26 probes.',
        25: 'Drain line: the queue emptied with no path, so answer 0.',
      },
      cpp: {
        4: 'Absent-endWord guard: no chain can exist, so answer 0 without any BFS work.',
        13: 'Hit line: the dequeued word is endWord, so the current level is the shortest length.',
        17: 'Skip self-mutation: the unchanged letter is not a neighbour, saving 1 of 26 probes.',
        25: 'Drain line: the queue emptied with no path, so answer 0.',
      },
      pseudo: {
        2: 'Absent-endWord guard: no chain can exist, so answer 0 without any BFS work.',
        8: 'Hit line: the dequeued word is endWord, so the current level is the shortest length.',
        11: 'Skip self-mutation: the unchanged letter is not a neighbour.',
        15: 'Drain line: the queue emptied with no path, so answer 0.',
      },
    },
    code: { java: ladderJava, cpp: ladderCpp, pseudo: ladderPseudo },
    build: buildWordLadder,
  },
}
