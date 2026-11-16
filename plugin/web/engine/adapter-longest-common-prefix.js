/**
 * longest-common-prefix — live walkthrough adapter (vertical scanning).
 *
 * Live signature matches the judge record in plugin/data/shard-0.json exactly:
 * longestCommonPrefix(strs: string[]) -> string, judge mode "exact".
 * Algorithm: seed prefix = strs[0], then for each later string shrink prefix to
 * the common head (column-by-column character equality). Early exit on empty.
 * O(S) time where S is the sum of lengths, O(1) extra space besides the prefix.
 *
 * Staged source (this file): .workers/jobs/deck-release/catalog-expansion/
 * lessons/longest-common-prefix/adapter.longest-common-prefix.js
 * Deploys-To: plugin/web/engine/adapter-longest-common-prefix.js (NEW file; no
 * existing source file is modified by deploying this module) plus a two-line
 * additive wiring in plugin/web/engine/semantic.js (import + spread, see
 * integration.json). Pure, synchronous, dependency-free ES module. No DOM, no
 * network, no randomness.
 * Primary source: https://leetcode.com/problems/longest-common-prefix/
 */
import { code, frame, boundedFrames } from './semantic-core.js'

export const SLUG = 'longest-common-prefix'

// Live judge signature (object form). The adapters entry below carries the same
// profile in the string-array params form semantic.js compares against.
export const SIGNATURE = {
  name: 'longestCommonPrefix',
  params: [{ name: 'strs', type: 'string[]' }],
  return: 'string',
}

const SIGNATURE_TYPES = ['string[]']

// Canonical vertical-scanning reference (also the walkthrough's emitter basis).
// Exported so the forge practice builder and selfcheck can cross-check the
// independent sorted-first/last oracle against it at build time.
export function longestCommonPrefix(strs) {
  if (!Array.isArray(strs) || strs.length === 0) return ''
  let prefix = strs[0]
  for (let i = 1; i < strs.length; i++) {
    let j = 0
    while (j < prefix.length && j < strs[i].length && prefix[j] === strs[i][j]) j++
    prefix = prefix.slice(0, j)
    if (prefix === '') break
  }
  return prefix
}

const longestCommonPrefixJava = code(`
[def] class Solution {
[def]     public String longestCommonPrefix(String[] strs) {
[init]         if (strs == null || strs.length == 0) return "";
[init]         String prefix = strs[0];
[compare]         for (int i = 1; i < strs.length; i++) {
[compare]             int j = 0;
[compare]             while (j < prefix.length() && j < strs[i].length() && prefix.charAt(j) == strs[i].charAt(j)) {
[match]                 j++;
[compare]             }
[shrink]             prefix = prefix.substring(0, j);
[shrink]             if (prefix.isEmpty()) break;
[compare]         }
[done]         return prefix;
[def]     }
[def] }
`)

const longestCommonPrefixCpp = code(`
[def] class Solution {
[def] public:
[def]     string longestCommonPrefix(vector<string>& strs) {
[init]         if (strs.empty()) return "";
[init]         string prefix = strs[0];
[compare]         for (size_t i = 1; i < strs.size(); i++) {
[compare]             size_t j = 0;
[compare]             while (j < prefix.size() && j < strs[i].size() && prefix[j] == strs[i][j]) {
[match]                 j++;
[compare]             }
[shrink]             prefix = prefix.substr(0, j);
[shrink]             if (prefix.empty()) break;
[compare]         }
[done]         return prefix;
[def]     }
[def] };
`)

const longestCommonPrefixPseudo = code(`
[def] function longestCommonPrefix(strs):
[init]   if strs is empty: return ""
[init]   prefix = strs[0]
[compare]   for i from 1 to length(strs)-1:
[compare]     j = 0
[compare]     while j < length(prefix) and j < length(strs[i]) and prefix[j] == strs[i][j]:
[match]       j += 1
[shrink]     prefix = prefix[0..j]
[shrink]     if prefix == "": break
[done]   return prefix
`)

const EXPLAIN = {
  def: 'Scope of the solver: class and method wrappers that hold the code but execute no algorithm step.',
  init: 'Seed the candidate answer with the whole first string; every later string can only shrink it, never grow it.',
  compare: 'Test the next column: same index in both the running prefix and the current string must hold the same character.',
  match: 'Column agreed, so the common head extends one step further; keep scanning the same pair.',
  shrink: 'Cut the prefix to the agreed head. An empty cut proves no common prefix exists, so stop early.',
  done: 'Return the surviving head: every string starts with it, and one more character would break some string.',
}

const explainLinesFor = (lines) => lines.map((l) => EXPLAIN[l.step] || null)
const EXPLAIN_LINES = {
  java: explainLinesFor(longestCommonPrefixJava),
  cpp: explainLinesFor(longestCommonPrefixCpp),
  pseudo: explainLinesFor(longestCommonPrefixPseudo),
}

// Walkthrough-only visual bounds (the Solve/judge path accepts the full judge
// range: 1..200 strings of 0..200 chars). Names are prefixed so this per-slug
// adapter never collides with another family entry.
const MAX_WALK_STRS = 6
const MAX_WALK_LEN = 12

function decodeArg(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw !== 'string') return raw
  const text = raw.trim()
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed
  } catch { /* fall through */ }
  return raw
}

function strsInput(raw) {
  const strs = decodeArg(raw)
  if (!Array.isArray(strs) || strs.length < 1 || strs.length > MAX_WALK_STRS) {
    throw new Error('Use an array of 1..' + MAX_WALK_STRS + ' strings for this walkthrough')
  }
  for (let k = 0; k < strs.length; k++) {
    const w = strs[k]
    if (typeof w !== 'string' || w.length > MAX_WALK_LEN || !/^[a-z]*$/.test(w)) {
      throw new Error('Word ' + k + ' must be 0..' + MAX_WALK_LEN + ' lowercase a-z letters (no truncation)')
    }
  }
  return strs.slice()
}

// Every frame below is a REAL execution event of longestCommonPrefix above:
// one init, then per string one compare scope plus one match event per agreed
// column and one shrink event with the live truncated prefix, then one done.
// No future values revealed; every prefix shown is the live variable value.
function build(args) {
  const strs = strsInput(args[0])
  const frames = []
  let prefix = strs[0]

  const stateOf = (i, j, extra = {}) => {
    const highlights = {}
    if (Number.isInteger(i) && i >= 0 && i < strs.length) highlights[String(i)] = 'accent'
    Object.assign(highlights, extra.highlights || {})
    return {
      pointers: Number.isInteger(i) && Number.isInteger(j) ? { str: i, col: j } : Number.isInteger(i) ? { str: i } : {},
      highlights,
      values: strs.slice(),
      words: strs.slice(),
      vars: { n: strs.length, prefix, ...(extra.vars || {}) },
    }
  }

  const push = (step, label, note, state) => {
    frames.push(frame(step, label, note, state))
  }

  push(
    'init',
    'Seed prefix = strs[0] ("' + prefix + '")',
    strs.length === 1
      ? 'Only one string, so it is already the longest common prefix.'
      : 'One string fixes the ceiling; ' + (strs.length - 1) + ' more string(s) can only shrink it.',
    stateOf(null, null),
  )

  for (let i = 1; i < strs.length; i++) {
    const cur = strs[i]
    push(
      'compare',
      'Compare strs[' + i + '] ("' + cur + '") with "' + prefix + '"',
      'Scan column by column from index 0 while both strings agree.',
      { ...stateOf(i, 0), ops: { cmp: i, writes: 0 } },
    )
    let j = 0
    while (j < prefix.length && j < cur.length && prefix[j] === cur[j]) {
      const ch = prefix[j]
      j++
      push(
        'match',
        "Column " + (j - 1) + " matches ('" + ch + "')",
        "Post-update: common head reaches length " + j + " for strs[" + i + "].",
        { ...stateOf(i, j), ops: { cmp: i, writes: 0 } },
      )
    }
    const reason = j >= prefix.length
      ? 'ran past the running prefix'
      : j >= cur.length
        ? 'ran past strs[' + i + ']'
        : "'" + (prefix[j] || '') + "' vs '" + (cur[j] || '') + "' differ at column " + j
    prefix = prefix.slice(0, j)
    push(
      'shrink',
      'Shrink prefix to "' + prefix + '"',
      'Post-update: stopped because ' + reason + '.',
      { ...stateOf(i, j), ops: { cmp: i, writes: 1 } },
    )
    if (prefix === '') {
      push(
        'done',
        'Prefix is empty: answer is ""',
        'No common head survives strs[' + i + ']; return "" immediately.',
        { ...stateOf(i, j), ops: { cmp: i, writes: 1 } },
      )
      return { kind: 'array', layout: { values: strs.slice() }, frames: boundedFrames(frames, 40).frames, result: '' }
    }
  }

  push(
    'done',
    'Done: longest common prefix is "' + prefix + '"',
    strs.length === 1
      ? 'The single input string is the whole answer.'
      : 'Every string starts with "' + prefix + '"; one more character would break some string.',
    stateOf(null, null),
  )
  return { kind: 'array', layout: { values: strs.slice() }, frames: boundedFrames(frames, 40).frames, result: prefix }
}

export const adapters = {
  'longest-common-prefix': {
    signature: { name: 'longestCommonPrefix', params: SIGNATURE_TYPES, return: 'string' },
    lesson: {
      idea: 'Seed the answer with strs[0], then shrink it to the common head with each later string by scanning one column at a time; the first mismatch (or length edge) fixes the cut.',
      trap: 'Comparing only neighbours, or returning strs[0] when the first two agree, misses a later outsider such as ["flower","flow","dz"]; every string must vote, and an empty string forces "".',
      time: 'O(S) where S is the sum of all characters',
      space: 'O(1) besides the running prefix',
      alt: 'Genuine alternative: sort a copy and compare only the first and last words (any common head of all words is a head of those two, and vice versa) — same O(S log n) from the sort; or binary-search the head length L and test prefix-of-length-L on all strings.',
    },
    code: { java: longestCommonPrefixJava, cpp: longestCommonPrefixCpp, pseudo: longestCommonPrefixPseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
}

export default adapters['longest-common-prefix']
export { boundedFrames }
