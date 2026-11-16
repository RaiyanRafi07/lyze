/**
 * alien-dictionary — live walkthrough adapter (Advanced Graphs, blind75).
 *
 * NeetCode "Foreign Dictionary" (LeetCode 269 "Alien Dictionary" equivalent):
 * words are sorted under an unknown alphabet; adjacent words vote once at
 * their first differing characters (u < v); Kahn's algorithm over those votes
 * (alphabetical tie-break) yields one valid ordering, or "" when the list is
 * unorderable (longer-before-prefix, or a vote cycle).
 *
 * Honest TEST PROFILE: the live shard set carries no alien-dictionary record
 * (LeetCode 269 is premium-only, judge:null by absence), so there is no
 * official single-call signature to match. This adapter documents and uses:
 *   foreignDictionary(words:string[]) -> string
 * where words is a JSON array literal of lowercase words and the return is one
 * valid alphabet string ("" iff unorderable). Comparison is property-based
 * ("any"): any ordering respecting every adjacent-pair vote passes; "" passes
 * iff the list is unorderable. Never compare to one fixed string.
 * Precedents: mergeKLists(int[][])->int[], runTrieOps(string[],string[])->string.
 *
 * Walkthrough bound (honest disclosure): 1..6 words, each length 1..6,
 * 1..8 distinct lowercase letters (source allows 1..100 / 1..100). Over-bound
 * or malformed inputs are rejected with a clear error, never truncated.
 * Pure, synchronous, dependency-free ES module. No DOM, no network, no randomness.
 *
 * Staged source (frames, solver, validator, code listings, explain map):
 * .workers/jobs/neetcode150-completion/alien-dictionary/adapter.alien-dictionary.js
 * plus the words-carrying scene field from
 * .workers/jobs/question-owners-150/alien-dictionary (adapter-words.patch.js),
 * ported onto the semantic-core helpers. No official statement copied.
 */
import { code, frame, boundedFrames } from './semantic-core.js';

export const SLUG = 'alien-dictionary';

// Honest test profile (see header): one JSON word-array in, one alphabet out.
export const SIGNATURE = Object.freeze({
  name: 'foreignDictionary',
  params: Object.freeze([{ name: 'words', type: 'string[]' }]),
  return: 'string',
});

const MAX_WORDS = 6;
const MAX_LEN = 6;
const MAX_LETTERS = 8;

const javaLines = code(`
[def] import java.util.*;
[def] class Solution {
[def]     public String foreignDictionary(String[] words) {
[init]         Set<Character> letters = new HashSet<>();
[init]         for (String w : words) for (char c : w.toCharArray()) letters.add(c);
[init]         Map<Character, Set<Character>> adj = new HashMap<>();
[init]         Map<Character, Integer> indegree = new HashMap<>();
[init]         for (char c : letters) { adj.put(c, new HashSet<>()); indegree.put(c, 0); }
[compare]         for (int i = 0; i + 1 < words.length; i++) {
[compare]             String a = words[i], b = words[i + 1];
[compare]             int j = 0, m = Math.min(a.length(), b.length());
[compare]             while (j < m && a.charAt(j) == b.charAt(j)) j++;
[invalid]             if (j == m) { if (a.length() > b.length()) return ""; else continue; }
[edge]             char u = a.charAt(j), v = b.charAt(j);
[skip]             if (adj.get(u).contains(v)) continue;
[edge]             adj.get(u).add(v);
[edge]             indegree.put(v, indegree.get(v) + 1);
[compare]         }
[topo]         Queue<Character> q = new PriorityQueue<>();
[topo]         for (char c : letters) if (indegree.get(c) == 0) q.offer(c);
[topo]         StringBuilder order = new StringBuilder();
[topo]         while (!q.isEmpty()) {
[topo]             char u = q.poll();
[topo]             order.append(u);
[topo]             for (char v : new TreeSet<>(adj.get(u))) {
[topo]                 indegree.put(v, indegree.get(v) - 1);
[topo]                 if (indegree.get(v) == 0) q.offer(v);
[topo]             }
[topo]         }
[done]         // placed order.length() of letters.size() distinct letters
[invalid]         if (order.length() != letters.size()) return "";
[return]         return order.toString();
[def]     }
[def] }
`);

const cppLines = code(`
[def] #include <string>
[def] #include <vector>
[def] #include <map>
[def] #include <set>
[def] #include <queue>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     string foreignDictionary(vector<string>& words) {
[init]         set<char> letters;
[init]         for (auto& w : words) for (char c : w) letters.insert(c);
[init]         map<char, set<char>> adj;
[init]         map<char, int> indegree;
[init]         for (char c : letters) { adj[c] = {}; indegree[c] = 0; }
[compare]         for (size_t i = 0; i + 1 < words.size(); i++) {
[compare]             const string& a = words[i];
[compare]             const string& b = words[i + 1];
[compare]             size_t j = 0, m = min(a.size(), b.size());
[compare]             while (j < m && a[j] == b[j]) j++;
[invalid]             if (j == m) { if (a.size() > b.size()) return ""; else continue; }
[edge]             char u = a[j], v = b[j];
[skip]             if (adj[u].count(v)) continue;
[edge]             adj[u].insert(v);
[edge]             indegree[v]++;
[compare]         }
[topo]         priority_queue<char, vector<char>, greater<char>> q;
[topo]         for (char c : letters) if (indegree[c] == 0) q.push(c);
[topo]         string order;
[topo]         while (!q.empty()) {
[topo]             char u = q.top(); q.pop();
[topo]             order.push_back(u);
[topo]             for (char v : adj[u]) {
[topo]                 if (--indegree[v] == 0) q.push(v);
[topo]             }
[topo]         }
[done]         // placed order.size() of letters.size() distinct letters
[invalid]         if (order.size() != letters.size()) return "";
[return]         return order;
[def]     }
[def] };
`);

const pseudoLines = code(`
[def] foreignDictionary(words):
[init]   letters = distinct chars of all words; adj = {}; indegree[c] = 0
[compare]   for i in 0..len(words)-2:
[compare]     j = first index where words[i][j] != words[i+1][j] (scan the shared prefix)
[invalid]     if no such j: longer-then-prefix is invalid -> return ""; shorter first adds nothing
[edge]     u, v = the two differing chars; add edge u -> v
[skip]     if edge u -> v already present: skip (duplicate constraint)
[edge]     indegree[v] += 1
[topo]   queue = all letters with indegree 0, alphabetical
[topo]   while queue not empty: pop u; append to order
[topo]     for v in adj[u] (alphabetical): indegree[v] -= 1; push when it hits 0
[done]   placed order.length of letters.size letters
[invalid]   if placed < total: a cycle hides the rest -> return ""
[return]   return order joined
`);

const EXPLAIN = {
  init: 'Collects every distinct letter; each starts with indegree 0 and an empty voter set.',
  compare: 'Only adjacent pairs vote, at their first differing character; shared prefixes are scanned.',
  edge: 'A fresh u->v vote raises indegree(v) by exactly one; duplicates are recognized and ignored.',
  skip: 'Repeat votes change nothing; recording them again would inflate indegrees and stall Kahn.',
  invalid: 'Longer-before-prefix or a voter cycle makes the list unexplainable, so the answer is "".',
  topo: 'Kahn pops indegree-0 letters alphabetically, appends to the order, and releases their voters.',
  done: 'Full coverage means a valid alphabet; short coverage proves a cycle among the leftovers.',
  return: 'Returns the built order, or "" when the constraints contradict each other.',
  def: 'Declares solution scope so the vote scan and the Kahn release stay inside foreignDictionary.',
};

// Per-line notes derived from the shared step notes so every rendered line is
// covered and can never drift out of alignment with the code arrays above.
const explainLinesFor = (lines) =>
  lines.map((entry) =>
    entry.step === 'def'
      ? EXPLAIN.def
      : typeof EXPLAIN[entry.step] === 'string'
        ? EXPLAIN[entry.step]
        : null
  );
const EXPLAIN_LINES = {
  java: explainLinesFor(javaLines),
  cpp: explainLinesFor(cppLines),
  pseudo: explainLinesFor(pseudoLines),
};

function fail(message) {
  throw new Error(message);
}

function decodeWords(raw) {
  let words = raw;
  if (typeof words === 'string') {
    try {
      words = JSON.parse(words);
    } catch {
      fail('Provide words as a JSON array literal, e.g. ["wrt","wrf","er","ett","rftt"]');
    }
  }
  if (!Array.isArray(words)) fail('Provide words as a string[] array (got ' + typeof raw + ')');
  if (words.length < 1 || words.length > MAX_WORDS) {
    fail('Alien visual limited to 1..' + MAX_WORDS + ' words (got ' + words.length + ')');
  }
  const letters = new Set();
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (typeof w !== 'string') fail('words[' + i + '] must be a string (got ' + typeof w + ')');
    if (w.length < 1 || w.length > MAX_LEN) {
      fail('Alien visual limited to word length 1..' + MAX_LEN + ' (words[' + i + '] has ' + w.length + ')');
    }
    if (!/^[a-z]+$/.test(w)) fail('words[' + i + '] must be lowercase a-z only (got ' + JSON.stringify(w) + ')');
    for (const c of w) letters.add(c);
  }
  if (letters.size < 1 || letters.size > MAX_LETTERS) {
    fail('Alien visual limited to 1..' + MAX_LETTERS + ' distinct letters (got ' + letters.size + ')');
  }
  return words.slice();
}

/** Run the REAL Kahn walkthrough on the actual input; every frame is computed. */
function build(args) {
  if (!Array.isArray(args) || args.length !== 1) {
    fail('Alien walkthrough needs [words] (got ' + (Array.isArray(args) ? args.length + ' entries' : typeof args) + ')');
  }
  const words = decodeWords(args[0]);
  const letters = [...new Set(words.join('').split(''))].sort();
  const adj = new Map(letters.map((c) => [c, new Set()]));
  const indegree = new Map(letters.map((c) => [c, 0]));
  const edgeList = [];
  const frames = [];
  const anchors = [];
  let result = null;

  const snap = (current, extra = {}) => ({
    current,
    visited: extra.order ? extra.order.split('') : [],
    frontier: extra.queue ? extra.queue.slice() : [],
    path: [],
    cycle: [],
    pair: extra.pair !== undefined ? extra.pair : null,
    edge: extra.edge !== undefined ? extra.edge : null,
    queue: extra.queue ? extra.queue.slice() : [],
    order: extra.order !== undefined ? extra.order : '',
    indegree: Object.fromEntries([...indegree.entries()].sort()),
    adj: Object.fromEntries([...adj.entries()].map(([k, s]) => [k, [...s].sort()])),
    vars: { ...(extra.vars || {}) },
  });
  const push = (step, label, note, state) => {
    frames.push(frame(step, label, note, state));
  };

  push('init', 'Collect letters', 'words=' + words.length + '; distinct={' + letters.join('') + '} (' + letters.length + '); indegree 0 each',
    snap(null, { queue: [], order: '', vars: {} }));
  anchors.push(0);

  let invalid = false;
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i];
    const b = words[i + 1];
    let j = 0;
    const m = Math.min(a.length, b.length);
    while (j < m && a[j] === b[j]) j++;
    if (j === m) {
      if (a.length > b.length) {
        push('compare', 'Compare pair ' + i, '"' + a + '" vs "' + b + '": all ' + m + ' shared chars equal, longer first',
          snap(null, { pair: i, queue: [], order: '', vars: { pair: i, shared: m } }));
        push('invalid', 'Prefix violation', '"' + a + '" precedes its own prefix "' + b + '"; no alphabet explains it',
          snap(null, { pair: i, queue: [], order: '', vars: { pair: i } }));
        invalid = true;
        result = '';
        break;
      }
      push('compare', 'Compare pair ' + i, '"' + a + '" vs "' + b + '": prefix of next; adds no constraint',
        snap(null, { pair: i, queue: [], order: '', vars: { pair: i } }));
      continue;
    }
    const u = a[j];
    const v = b[j];
    push('compare', 'Compare pair ' + i, '"' + a + '" vs "' + b + '": first diff pos ' + j + " ('" + u + "'<'" + v + "')",
      snap(u, { pair: i, edge: [u, v], queue: [], order: '', vars: { pair: i, at: j } }));
    if (adj.get(u).has(v)) {
      push('skip', 'Duplicate edge', "'" + u + "'->'" + v + "' already known from an earlier pair; indegree unchanged",
        snap(u, { pair: i, edge: [u, v], queue: [], order: '', vars: { pair: i } }));
      continue;
    }
    adj.get(u).add(v);
    indegree.set(v, indegree.get(v) + 1);
    edgeList.push([u, v]);
    push('edge', "Add '" + u + "'->'" + v + "'", "pair " + i + " constrains '" + u + "'<'" + v + "'; indegree('" + v + "')=" + indegree.get(v),
      snap(v, { pair: i, edge: [u, v], queue: [], order: '', vars: { pair: i } }));
  }

  if (!invalid) {
    let queue = letters.filter((c) => indegree.get(c) === 0);
    let order = '';
    push('topo', 'Seed queue', 'indegree-0 letters: [' + queue.join(',') + ']; Kahn pops alphabetical',
      snap(queue[0] !== undefined ? queue[0] : null, { queue, order, vars: { queued: queue.length } }));
    while (queue.length) {
      const u = queue.shift();
      order += u;
      const drops = [...adj.get(u)].sort();
      for (const v of drops) {
        indegree.set(v, indegree.get(v) - 1);
        if (indegree.get(v) === 0) queue.push(v);
      }
      queue.sort();
      push('topo', "Place '" + u + "'", "order=\"" + order + '"; freed [' + drops.join(',') + ']; queue=[' + queue.join(',') + ']',
        snap(queue[0] !== undefined ? queue[0] : null, { queue, order, vars: { placed: order.length } }));
    }
    if (order.length !== letters.length) {
      push('invalid', 'Cycle found', 'placed ' + order.length + '/' + letters.length + '; rest wait on each other forever',
        snap(null, { queue: [], order, vars: { placed: order.length } }));
      result = '';
    } else {
      result = order;
    }
  }

  if (result === '') {
    push('done', 'Done: impossible', 'constraints contradict; every ordering breaks a pair', snap(null, { queue: [], order: '', vars: {} }));
    push('return', 'Return', 'return ""', snap(null, { queue: [], order: '', vars: {} }));
  } else {
    push('done', 'Done: order built', 'order="' + result + '" covers all ' + letters.length + ' letters', snap(null, { queue: [], order: result, vars: {} }));
    push('return', 'Return', 'return "' + result + '"', snap(null, { queue: [], order: result, vars: {} }));
  }
  anchors.push(frames.length - 1);

  return {
    kind: 'graph',
    words: words.slice(),
    layout: {
      nodes: letters.map((c) => ({ id: c, label: c })),
      edges: edgeList.map((p) => p.slice()),
      directed: true,
      words: words.slice(),
    },
    frames,
    result,
    anchors,
  };
}

export const adapters = {
  'alien-dictionary': {
    signature: { name: SIGNATURE.name, params: ['string[]'], return: SIGNATURE.return },
    lesson: {
      idea: 'Adjacent words vote once at their first differing chars (u<v); Kahn over those votes, alphabetical ties, yields an alphabet.',
      trap: 'Longer-before-prefix is instant ""; duplicate votes add nothing; any valid order passes, never one fixed string.',
      time: 'O(total chars + letters^2)',
      space: 'O(letters^2)',
    },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    code: { java: javaLines, cpp: cppLines, pseudo: pseudoLines },
    build,
  },
};

export default adapters['alien-dictionary'];

// Re-export the compaction helper so walkthrough hosts share one sampling pass.
export { boundedFrames };
