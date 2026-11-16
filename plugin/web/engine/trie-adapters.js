/** Trie-family adapters: operations-profile design problems (judge null).
 * Staged sources:
 * - implement-trie-prefix-tree: .workers/jobs/question-owners-150/implement-trie-prefix-tree/{trie-scene.mjs,reference.md}
 *   (traceTrie replay, op/done events, 26-slot array reference, Map-oracle agreement).
 * - design-add-and-search-words-data-structure: .workers/jobs/question-owners-150/design-add-and-search-words-data-structure/{adapter.js,reference.js}
 *   (WordDictionary DFS fan-out builder, list-scan oracle).
 * Walkthrough input convention (both): args[0] = ops array literal, args[1] = call-args
 * array literal, e.g. ops ["Trie","insert","search",...], callArgs [[],["apple"],["apple"],...].
 * Pure, synchronous, dependency-free.
 */
import { code, frame, boundedFrames } from './semantic-core.js'

function parseOpsInput(rawOps, rawArgs) {
  const asArray = (v) => {
    if (Array.isArray(v)) return v
    if (typeof v === 'string') {
      try {
        const p = JSON.parse(v)
        if (Array.isArray(p)) return p
      } catch { /* fall through */ }
    }
    return null
  }
  const ops = asArray(rawOps)
  const argSets = asArray(rawArgs)
  if (!ops || !argSets || ops.length !== argSets.length || ops.length === 0) return null
  return { ops, argSets }
}

/* ---------------- implement-trie-prefix-tree ---------------- */

const trieJava = code(`
[def] class TrieNode {
[def]     TrieNode[] next = new TrieNode[26];
[def]     boolean isEnd = false;
[def] }
[def] class Trie {
[init]     private TrieNode root;
[init]     public Trie() { root = new TrieNode(); }
[insert]     public void insert(String word) {
[insert]         TrieNode node = root;
[insert]         for (int i = 0; i < word.length(); i++) {
[insert]             int c = word.charAt(i) - 'a';
[insert]             if (node.next[c] == null) node.next[c] = new TrieNode();
[insert]             node = node.next[c];
[insert]         }
[insert]         node.isEnd = true;
[insert]     }
[query]     public boolean search(String word) {
[query]         TrieNode node = walk(word);
[query]         return node != null && node.isEnd;
[query]     }
[query]     public boolean startsWith(String prefix) {
[query]         return walk(prefix) != null;
[query]     }
[query]     private TrieNode walk(String s) {
[query]         TrieNode node = root;
[query]         for (int i = 0; i < s.length(); i++) {
[query]             int c = s.charAt(i) - 'a';
[query]             if (node.next[c] == null) return null;
[query]             node = node.next[c];
[query]         }
[query]         return node;
[query]     }
[def] }
`)

const trieCpp = code(`
[def] struct TrieNode {
[def]     TrieNode* next[26] = {};
[def]     bool isEnd = false;
[def] };
[def] class Trie {
[init]     TrieNode* root;
[init]     TrieNode* walk(const string& s) {
[query]         TrieNode* node = root;
[query]         for (char ch : s) {
[query]             int c = ch - 'a';
[query]             if (node->next[c] == nullptr) return nullptr;
[query]             node = node->next[c];
[query]         }
[query]         return node;
[init]     }
[init] public:
[init]     Trie() : root(new TrieNode()) {}
[insert]     void insert(string word) {
[insert]         TrieNode* node = root;
[insert]         for (char ch : word) {
[insert]             int c = ch - 'a';
[insert]             if (node->next[c] == nullptr) node->next[c] = new TrieNode();
[insert]             node = node->next[c];
[insert]         }
[insert]         node->isEnd = true;
[insert]     }
[query]     bool search(string word) {
[query]         TrieNode* node = walk(word);
[query]         return node != nullptr && node->isEnd;
[query]     }
[query]     bool startsWith(string prefix) {
[query]         return walk(prefix) != nullptr;
[query]     }
[def] };
`)

const triePseudo = code(`
[def] TrieNode { children: map char -> TrieNode, isEnd: bool = false }
[init] Trie { root = new TrieNode() }
[insert] insert(word):
[insert]   node = root
[insert]   for ch in word:
[insert]     if ch not in node.children: node.children[ch] = new TrieNode()
[insert]     node = node.children[ch]
[insert]   node.isEnd = true
[query] walk(s):
[query]   node = root
[query]   for ch in s:
[query]     if ch not in node.children: return NONE
[query]     node = node.children[ch]
[query]   return node
[query] search(word): return walk(word) != NONE and walk(word).isEnd
[query] startsWith(prefix): return walk(prefix) != NONE
`)

// Real transcript replay on a reference trie (ported from staged trie-scene.mjs).
function traceTrieReplay(ops, argSets) {
  const isWord = (v) => typeof v === 'string' && v.length > 0
  const children = [new Map()]
  const chars = [null]
  const isEnd = [false]
  const edges = []
  const events = []
  const validOp = (op) => op === 'Trie' || op === 'insert' || op === 'search' || op === 'startsWith'
  const snapshotEnds = () => { const o = []; for (let i = 0; i < isEnd.length; i++) if (isEnd[i]) o.push(i); return o }
  const lastScanned = () => { for (let i = events.length - 1; i >= 0; i--) if (events[i].kind === 'char') return events[i].charIndex; return -1 }
  try {
    for (let opIndex = 0; opIndex < ops.length; opIndex++) {
      const op = ops[opIndex]
      if (!validOp(op)) return null
      const callArgs = Array.isArray(argSets[opIndex]) ? argSets[opIndex] : []
      if (op === 'Trie') {
        events.push({ kind: 'init', op, opIndex, word: '', charIndex: -1, nodeId: 0, created: false, hit: true, opResult: null, chain: [0], endNodes: snapshotEnds() })
        continue
      }
      const word = callArgs.length > 0 ? callArgs[0] : undefined
      if (!isWord(word)) return null
      const isInsert = op === 'insert'
      let nodeId = 0
      const path = [0]
      let missed = false
      for (let i = 0; i < word.length; i++) {
        const ch = word[i]
        const kids = children[nodeId]
        const parentId = nodeId
        const next = kids.get(ch)
        if (next === undefined) {
          if (isInsert) {
            const id = children.length
            children.push(new Map())
            chars.push(ch)
            isEnd.push(false)
            kids.set(ch, id)
            edges.push([parentId, id])
            nodeId = id
            path.push(nodeId)
            events.push({ kind: 'char', op, opIndex, word, charIndex: i, nodeId, parentId, char: ch, created: true, hit: true, opResult: null, chain: path.slice(), endNodes: snapshotEnds() })
          } else {
            events.push({ kind: 'char', op, opIndex, word, charIndex: i, nodeId: parentId, parentId, char: ch, created: false, hit: false, opResult: null, chain: path.slice(), endNodes: snapshotEnds() })
            missed = true
            break
          }
        } else {
          nodeId = next
          path.push(nodeId)
          events.push({ kind: 'char', op, opIndex, word, charIndex: i, nodeId, parentId, char: ch, created: false, hit: true, opResult: null, chain: path.slice(), endNodes: snapshotEnds() })
        }
      }
      let opResult = null
      if (isInsert) {
        if (!missed) {
          isEnd[nodeId] = true
          events.push({ kind: 'op-done', op, opIndex, word, charIndex: word.length - 1, nodeId, created: false, hit: true, opResult, markedEnd: nodeId, chain: path.slice(), endNodes: snapshotEnds() })
        }
      } else if (op === 'search') {
        opResult = !missed && isEnd[nodeId] === true
        events.push({ kind: 'op-done', op, opIndex, word, charIndex: missed ? lastScanned() : word.length - 1, nodeId, created: false, hit: !missed, opResult, chain: path.slice(), endNodes: snapshotEnds() })
      } else {
        opResult = !missed
        events.push({ kind: 'op-done', op, opIndex, word, charIndex: missed ? lastScanned() : word.length - 1, nodeId, created: false, hit: !missed, opResult, chain: path.slice(), endNodes: snapshotEnds() })
      }
    }
    const depthOf = (id) => {
      const parent = new Map()
      for (const [a, b] of edges) if (!parent.has(b)) parent.set(b, a)
      let d = 0, cur = id
      while (parent.has(cur)) { cur = parent.get(cur); d++ }
      return d
    }
    const nodes = chars.map((ch, id) => ({ id, value: depthOf(id), label: id === 0 ? 'root' : ch }))
    return { events, nodes, edges }
  } catch { return null }
}

function buildTrieScene(args) {
  const parsed = parseOpsInput(args[0], args[1])
  if (!parsed) throw new Error('Provide ops and call-args arrays, e.g. ["Trie","insert","search"] and [[],["apple"],["apple"]], for this walkthrough')
  const replay = traceTrieReplay(parsed.ops, parsed.argSets)
  if (!replay) throw new Error('This transcript is malformed; check op names and word arguments')
  const { events, nodes, edges } = replay
  const frames = []
  const layoutEdges = edges.map(([a, b, ch]) => [a, b])
  const edgeChars = new Map(edges.map(([a, b, ch]) => [a + '>' + b, ch]))
  void edgeChars
  for (let i = 0; i < events.length; i++) {
    const e = events[i]
    const step = e.kind === 'init' ? 'init' : e.op === 'insert' ? 'insert' : 'query'
    let label = 'Empty trie'
    let note = 'Only the root exists. op 1 of ' + parsed.ops.length + '.'
    if (e.kind === 'char') {
      const at = e.charIndex
      if (e.op === 'insert' && e.created) {
        label = 'insert "' + e.word + '" · ' + e.char
        note = 'No ' + e.char + ' edge from node ' + e.parentId + ': create node ' + e.nodeId + ' (' + (i + 1) + '/' + events.length + ').'
      } else if (e.op === 'insert') {
        label = 'insert "' + e.word + '" · ' + e.char
        note = 'Edge ' + e.char + ' exists: reuse node ' + e.nodeId + ' (' + (i + 1) + '/' + events.length + ').'
      } else if (!e.hit) {
        label = e.op + ' "' + e.word + '" · miss'
        note = 'No ' + e.char + ' edge from node ' + e.nodeId + ' at char ' + at + ': stop, return false.'
      } else {
        label = e.op + ' "' + e.word + '" · ' + e.char
        note = 'Edge ' + e.char + ' exists: move to node ' + e.nodeId + ' (' + (i + 1) + '/' + events.length + ').'
      }
    } else if (e.kind === 'op-done') {
      if (e.op === 'insert') {
        label = 'insert "' + e.word + '" done'
        note = 'Mark node ' + e.nodeId + ' as word-end. Returns null (void).'
      } else {
        label = e.op + ' "' + e.word + '" = ' + String(e.opResult)
        note = e.op + ' "' + e.word + '": ' + (e.op === 'search' ? (e.opResult ? 'reached a word-end: true.' : 'missed or not a word-end: false.') : (e.opResult ? 'prefix reachable: true.' : 'prefix missing: false.'))
      }
    }
    frames.push(frame(step, label.slice(0, 40), note.slice(0, 140), {
      current: typeof e.nodeId === 'number' ? e.nodeId : null,
      visited: (e.endNodes || []).slice(),
      path: (e.chain || []).slice(),
      frontier: [],
      op: e.op,
      opIndex: e.opIndex,
      word: e.word || null,
      charIndex: e.charIndex,
      created: !!e.created,
      hit: e.hit !== false,
      opResult: e.opResult === undefined ? null : e.opResult,
      endNodes: (e.endNodes || []).slice(),
      vars: { op: e.op, opIndex: e.opIndex, node: e.nodeId },
    }))
  }
  const last = events[events.length - 1]
  const finalStep = last.op === 'insert' ? 'insert' : last.op === 'Trie' ? 'init' : 'query'
  frames.push(frame(finalStep, 'Transcript done', 'Replayed ' + parsed.ops.length + ' ops on ' + nodes.length + ' nodes.', {
    current: null, visited: (last.endNodes || []).slice(), path: [], frontier: [],
    op: 'done', opIndex: parsed.ops.length - 1, word: null, charIndex: -1,
    created: false, hit: true, opResult: null, endNodes: (last.endNodes || []).slice(),
    vars: { ops: parsed.ops.length, nodes: nodes.length },
  }))
  const out = boundedFrames(frames, 40).frames
  // Result convention (matches practice + official examples): the full per-op output
  // array in transcript order (constructor/void slots are null).
  const slots = new Array(parsed.ops.length).fill(null)
  for (const e of events) if (e.kind === 'op-done' && Number.isInteger(e.opIndex)) slots[e.opIndex] = e.opResult === undefined ? null : e.opResult
  return { kind: 'tree', layout: { nodes, edges: layoutEdges }, frames: out, result: slots }
}

/* ---------------- design-add-and-search-words-data-structure ---------------- */

const wdJava = code(`
[def] class WordDictionary {
[def]     private static class TrieNode {
[def]         TrieNode[] children = new TrieNode[26];
[def]         boolean isWord = false;
[def]     }
[init]     private final TrieNode root;
[init]     public WordDictionary() { root = new TrieNode(); }
[add]     public void addWord(String word) {
[add]         TrieNode node = root;
[add]         for (int i = 0; i < word.length(); i++) {
[add]             int c = word.charAt(i) - 'a';
[add]             if (node.children[c] == null) node.children[c] = new TrieNode();
[add]             node = node.children[c];
[add]         }
[add]         node.isWord = true;
[add]     }
[query]     public boolean search(String word) { return searchFrom(root, word, 0); }
[query]     private boolean searchFrom(TrieNode node, String word, int pos) {
[query]         if (node == null) return false;
[query]         if (pos == word.length()) return node.isWord;
[query]         char ch = word.charAt(pos);
[query]         if (ch == '.') {
[query]             for (int c = 0; c < 26; c++) if (searchFrom(node.children[c], word, pos + 1)) return true;
[query]             return false;
[query]         }
[query]         return searchFrom(node.children[ch - 'a'], word, pos + 1);
[query]     }
[def] }
`)

const wdCpp = code(`
[def] class WordDictionary {
[def]     struct Node { Node* next[26] = {}; bool isWord = false; };
[init]     Node* root;
[init]     WordDictionary() : root(new Node()) {}
[init]     bool dfs(Node* node, const string& word, int pos) {
[query]         if (!node) return false;
[query]         if (pos == (int)word.size()) return node->isWord;
[query]         char ch = word[pos];
[query]         if (ch == '.') {
[query]             for (int c = 0; c < 26; c++) if (dfs(node->next[c], word, pos + 1)) return true;
[query]             return false;
[query]         }
[query]         return dfs(node->next[ch - 'a'], word, pos + 1);
[add]     void addWord(string word) {
[add]         Node* node = root;
[add]         for (char ch : word) {
[add]             int c = ch - 'a';
[add]             if (!node->next[c]) node->next[c] = new Node();
[add]             node = node->next[c];
[add]         }
[add]         node->isWord = true;
[add]     }
[query]     bool search(string word) { return dfs(root, word, 0); }
[def] };
`)

const wdPseudo = code(`
[def] WordDictionary { root = new TrieNode() }
[init] init: root = new empty node; no words stored
[add] addWord(word):
[add]   node = root
[add]   for ch in word:
[add]     if ch not in node.children: node.children[ch] = new TrieNode()
[add]     node = node.children[ch]
[add]   node.isWord = true
[query] search(pattern): return dfs(root, pattern, 0)
[query] dfs(node, pattern, pos):
[query]   if node is NONE: return false
[query]   if pos == len(pattern): return node.isWord
[query]   if pattern[pos] == '.': return any dfs(child) over real children
[query]   return dfs(edge(pattern[pos]), pos+1)
`)

// WordDictionary scene: shared-prefix inserts + wildcard DFS fan-out.
// Ported from staged adapter.js (buildWordDictionaryScene) with frame() wrap.
function buildWordDictScene(args) {
  const parsed = parseOpsInput(args[0], args[1])
  if (!parsed) throw new Error('Provide ops and call-args arrays, e.g. ["WordDictionary","addWord","search"] and [[],["bad"],["b.."]], for this walkthrough')
  const { ops, argSets } = parsed
  if (ops[0] !== 'WordDictionary') throw new Error('First op must be WordDictionary (constructor)')
  const addWords = [], searches = []
  for (let i = 1; i < ops.length; i++) {
    const w = Array.isArray(argSets[i]) && typeof argSets[i][0] === 'string' ? argSets[i][0] : null
    if (ops[i] === 'addWord') { if (w === null) throw new Error('addWord needs a word argument'); addWords.push(w) }
    else if (ops[i] === 'search') { if (w === null) throw new Error('search needs a pattern argument'); searches.push(w) }
    else throw new Error('Unknown op ' + ops[i] + '; expected addWord or search')
  }
  const isLowerWord = (w) => typeof w === 'string' && w.length >= 1 && w.length <= 25 && /^[a-z]+$/.test(w)
  const isPattern = (p) => typeof p === 'string' && p.length >= 1 && p.length <= 25 && /^[a-z.]+$/.test(p)
  const words = addWords.filter(isLowerWord).slice(0, 6)
  const queries = searches.filter(isPattern).slice(0, 4)
  if (!words.length || !queries.length) throw new Error('Need at least one lowercase word and one search pattern (a-z and dots, length 1..25)')
  if (words.some((w) => w.length > 6) || queries.some((q) => q.length > 6)) throw new Error('Walkthrough words/patterns are limited to 6 characters; larger inputs are rejected, never truncated')
  const trieNodes = [{ id: 0, label: 'root', value: 0, isWord: false }]
  const children = [new Map()]
  const edges = []
  const childOf = (nid, ch) => { const m = children[nid]; const v = m ? m.get(ch) : undefined; return v === undefined ? undefined : v }
  const realChildren = (nid) => { const m = children[nid]; if (!m) return []; return [...m.entries()].map(([ch, id]) => ({ ch, id })) }
  const FRAME_CAP = 39
  const frames = []
  const visited = [0]
  const touch = (id) => { if (!visited.includes(id)) visited.push(id) }
  const stepOf = (op) => (op === 'init' ? 'init' : op === 'add-step' || op === 'add-done' ? 'add' : 'query')
  const pushS = (op, label, note, st) => {
    frames.push(frame(stepOf(op), String(label).slice(0, 40), String(note).slice(0, 140), {
      current: st.node === undefined ? null : st.node,
      visited: (st.visited || []).slice(),
      path: (st.path || []).slice(),
      frontier: (st.frontier || []).slice(),
      op, word: st.word || null, pattern: st.pattern || null, pos: st.pos === undefined ? null : st.pos,
      node: st.node === undefined ? null : st.node, edgeChar: st.edgeChar || null,
      created: st.created === undefined ? null : !!st.created, dead: !!st.dead,
      verdict: st.verdict === undefined ? null : st.verdict, done: !!st.done,
      answer: st.answer === undefined ? null : st.answer, verdicts: st.verdicts || null,
      endNodes: trieNodes.filter((n) => n.isWord).map((n) => n.id),
      vars: { op, node: st.node === undefined ? null : st.node, pos: st.pos === undefined ? null : st.pos },
    }))
  }
  pushS('init', 'empty trie', 'One root node, no edges. isWord flags are all false.', { node: 0, path: [0], visited: visited.slice(), frontier: [] })
  for (const word of words) {
    const finalPath = [0]
    const flags = []
    let cursor = 0
    for (const ch of word) {
      let next = children[cursor].get(ch)
      let created = false
      if (next === undefined) {
        next = trieNodes.length
        trieNodes.push({ id: next, label: ch, value: finalPath.length, isWord: false })
        children.push(new Map())
        children[cursor].set(ch, next)
        edges.push([cursor, next])
        created = true
      }
      cursor = next
      finalPath.push(cursor)
      flags.push(created)
    }
    trieNodes[cursor].isWord = true
    for (let i = 0; i < word.length; i++) {
      if (frames.length >= FRAME_CAP) break
      const nid = finalPath[i + 1]
      touch(nid)
      pushS('add-step', 'add "' + word + '" ch ' + word[i], 'Edge ' + word[i] + ' ' + (flags[i] ? 'created' : 'reused (shared prefix)') + '; cursor at node ' + nid + '.', { node: nid, word, pos: i + 1, path: finalPath.slice(0, i + 2), visited: visited.slice(), frontier: [], edgeChar: word[i], created: flags[i] })
    }
    if (frames.length >= FRAME_CAP) break
    const term = finalPath[finalPath.length - 1]
    pushS('add-done', 'stored "' + word + '"', '"' + word + '" ends at node ' + term + '; isWord set. Prefix nodes unchanged.', { node: term, word, pos: word.length, path: finalPath.slice(), visited: visited.slice(), frontier: [] })
  }
  const verdicts = []
  const runVerdict = (pattern) => {
    const dfs = (nid, pos) => {
      if (pos === pattern.length) return trieNodes[nid].isWord === true
      const ch = pattern[pos]
      if (ch === '.') { for (const k of realChildren(nid)) if (dfs(k.id, pos + 1)) return true; return false }
      const next = childOf(nid, ch)
      if (next === undefined) return false
      return dfs(next, pos + 1)
    }
    return dfs(0, 0)
  }
  const pushSearchStep = (pattern, pos, nid, pathIds, frontierIds, edgeCh, dead, note) => {
    touch(nid)
    pushS('search-step', 'search "' + pattern + '" @' + pos, note, { node: nid, pattern, pos, path: pathIds.slice(), visited: visited.slice(), frontier: frontierIds.slice(), edgeChar: edgeCh, dead: !!dead })
  }
  const dfsFrames = (pattern, pos, nid, pathIds) => {
    if (frames.length >= FRAME_CAP) return null
    if (pos === pattern.length) {
      const hit = trieNodes[nid].isWord === true
      pushSearchStep(pattern, pos, nid, pathIds, [], null, !hit, hit ? 'Pattern consumed at node ' + nid + ' which IS a word: branch succeeds.' : 'Pattern consumed at node ' + nid + ' but isWord is false: prefix only, branch dies.')
      return hit
    }
    const ch = pattern[pos]
    if (ch === '.') {
      const kids = realChildren(nid)
      if (!kids.length) {
        pushSearchStep(pattern, pos, nid, pathIds, [], '.', true, "'.' at pos " + pos + ': node ' + nid + ' has no children, branch dies.')
        return false
      }
      pushSearchStep(pattern, pos, nid, pathIds, kids.map((k) => k.id), '.', false, "'.' at pos " + pos + ': fan out over ' + kids.length + ' real child edge(s).')
      for (const k of kids) {
        const r = dfsFrames(pattern, pos + 1, k.id, pathIds.concat([k.id]))
        if (r === null) return null
        if (r === true) return true
      }
      return false
    }
    const next = childOf(nid, ch)
    if (next === undefined) {
      pushSearchStep(pattern, pos, nid, pathIds, [], ch, true, "Literal '" + ch + "' at pos " + pos + ': no such edge from node ' + nid + ', branch dies.')
      return false
    }
    pushSearchStep(pattern, pos + 1, next, pathIds.concat([next]), [], ch, false, "Literal '" + ch + "' follows the edge to node " + next + '.')
    return dfsFrames(pattern, pos + 1, next, pathIds.concat([next]))
  }
  for (const pattern of queries) {
    const result = dfsFrames(pattern, 0, 0, [0])
    const verdict = result === true ? true : result === false ? false : runVerdict(pattern)
    verdicts.push({ pattern, verdict })
    if (frames.length >= FRAME_CAP + 1) continue
    pushS('search-done', 'search "' + pattern + '" -> ' + verdict, verdict ? '"' + pattern + '" matches an added word.' : '"' + pattern + '" matches nothing added.', { node: null, pattern, pos: pattern.length, path: [], visited: visited.slice(), frontier: [], dead: !verdict, verdict })
  }
  const lastVerdicts = verdicts.map((v) => v.verdict)
  const finalStep = lastVerdicts.length ? 'query' : 'add'
  pushS(finalStep === 'query' ? 'search-done' : 'add-done', 'ops sequence done', words.length + ' words stored; ' + verdicts.length + ' searches decided.', { node: 0, path: [], visited: visited.slice(), frontier: [], verdicts: lastVerdicts, answer: lastVerdicts.length ? lastVerdicts[lastVerdicts.length - 1] : null })
  const out = boundedFrames(frames, 40).frames
  // Result convention (matches practice + official examples): full per-op output array
  // in transcript order — constructor slot null, addWord slots null, search slots boolean.
  const fullOut = [null]
  for (const _w of words) fullOut.push(null)
  for (const v of lastVerdicts) fullOut.push(v)
  return {
    kind: 'tree',
    layout: { nodes: trieNodes.map((n) => ({ id: n.id, label: n.label, value: n.value, isWord: !!n.isWord })), edges: edges.map((e) => [e[0], e[1]]), rootId: 0 },
    frames: out,
    result: fullOut,
  }
}

export const adapters = {
  'implement-trie-prefix-tree': {
    signature: { name: 'Trie', params: ['string', 'string'], return: 'string' },
    lesson: {
      idea: 'Share one node per prefix: insert walks and creates one edge per character, search additionally requires the word-end flag.',
      trap: 'Returning true from search on reachability alone confuses it with startsWith; the end flag is the whole distinction.',
      time: 'O(L) per call',
      space: 'O(total characters)',
      alt: 'Map-per-node children (used by the staged oracle) keep identical walks with no alphabet assumption; a hash set plus prefix scan skips the trie entirely at O(N·L) per startsWith.'
    },
    explain: {
      def: 'Scope of the Trie holding one node per stored prefix; the root is the empty prefix.',
      init: 'Construct one empty root; no words stored and no edges read yet.',
      insert: 'Walk one edge per character, creating missing edges, then mark the landing node as a word-end.',
      query: 'Walk the same edges without creating anything; search needs the end flag, startsWith needs only reachability.',
      done: 'Transcript replayed: every edge read, node write, miss and return came from the recorded run.'
    },
    explainLines: {
      java: {
        22: 'End of the Trie class scope; it performs no algorithm operation.'
      },
      cpp: {
        25: 'End of the Trie class scope; it performs no algorithm operation.'
      },
      pseudo: {}
    },
    code: { java: trieJava, cpp: trieCpp, pseudo: triePseudo },
    build: buildTrieScene,
  },
  'design-add-and-search-words-data-structure': {
    signature: { name: 'WordDictionary', params: ['string', 'string'], return: 'string' },
    lesson: {
      idea: 'Share prefixes in a trie, then answer dot-queries by DFS fan-out: a dot tries every real child edge and succeeds on the first full-length word hit.',
      trap: 'A literal miss kills only its branch; a dot with no children kills the whole query. Length must agree before any character comparison.',
      time: 'O(L) add, O(26^dots) worst-case search',
      space: 'O(total characters)',
      alt: 'A plain word list with character-by-character scan (the staged oracle) decides the same verdicts with no trie at all, at O(N·L) per query — the honest independent check.'
    },
    explain: {
      def: 'Scope of the WordDictionary holding one trie node per stored prefix.',
      init: 'Construct one empty root; no words stored and no edges read yet.',
      add: 'Walk one edge per character, creating missing edges, then mark the landing node as a word.',
      query: 'DFS each pattern: literals follow one edge, dots fan out over real children; success needs a full-length word landing.',
      done: 'Sequence decided: every search verdict came from the recorded DFS, never from a future answer.'
    },
    explainLines: {
      java: {
        25: 'End of the WordDictionary class scope; it performs no algorithm operation.'
      },
      cpp: {
        23: 'End of the WordDictionary class scope; it performs no algorithm operation.'
      },
      pseudo: {}
    },
    code: { java: wdJava, cpp: wdCpp, pseudo: wdPseudo },
    build: buildWordDictScene,
  },
}
