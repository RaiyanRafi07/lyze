/**
 * partition-labels — live walkthrough adapter (Greedy, LeetCode 763).
 *
 * Greedy scan over last occurrences: record last[i] for each letter, then sweep
 * once stretching the open edge `end` to max(end, last[s[i]]) and cutting the
 * partition the moment the scan index reaches that edge.
 *
 * Live signature matches the judge record in plugin/data/shard-7.json exactly:
 * partitionLabels(string s) -> int[] (mode exact).
 *
 * Staged source: .workers/jobs/question-owners-150/partition-labels/adapter-partition-labels.js
 * (frames/notes/signature/code listings unchanged in behavior) reshaped into the
 * live adapter contract (signature/lesson/explain/explainLines/code/build).
 * Frames, code tags and notes are unchanged so the staged selfcheck still passes
 * against the live build logic.
 *
 * Walkthrough bound: strings of 1..26 lowercase letters (judge allows up to 500;
 * over-bound inputs throw a clear message instead of truncating).
 */

import { code, frame, boundedFrames } from './semantic-core.js'

void boundedFrames

export const SLUG = 'partition-labels'

export const SIGNATURE = { name: 'partitionLabels', params: ['string'], return: 'int[]' }

// Visual bound for the walkthrough scene (judge allows s.length up to 500).
const MAX_LEN = 26

const partJava = code(`
[def] class Solution {
[def]     public List<Integer> partitionLabels(String s) {
[init]         int[] last = new int[26];
[init]         for (int i = 0; i < s.length(); i++) {
[init]             last[s.charAt(i) - 'a'] = i;
[init]         }
[init]         List<Integer> sizes = new ArrayList<>();
[init]         int start = 0, end = 0;
[scan]         for (int i = 0; i < s.length(); i++) {
[scan]             end = Math.max(end, last[s.charAt(i) - 'a']);
[cut]             if (i == end) {
[cut]                 sizes.add(i - start + 1);
[cut]                 start = i + 1;
[cut]             }
[scan]         }
[return]         return sizes;
[def]     }
[def] }
`)

const partCpp = code(`
[def] class Solution {
[def] public:
[def]     vector<int> partitionLabels(string s) {
[init]         int last[26] = {};
[init]         for (int i = 0; i < (int)s.size(); i++) {
[init]             last[s[i] - 'a'] = i;
[init]         }
[init]         vector<int> sizes;
[init]         int start = 0, end = 0;
[scan]         for (int i = 0; i < (int)s.size(); i++) {
[scan]             end = max(end, last[s[i] - 'a']);
[cut]             if (i == end) {
[cut]                 sizes.push_back(i - start + 1);
[cut]                 start = i + 1;
[cut]             }
[scan]         }
[return]         return sizes;
[def]     }
[def] };
`)

const partPseudo = code(`
[def] partitionLabels(s):
[init]   last = 26 zeros; start = 0; end = 0; sizes = []
[init]   for i, ch in s: last[ch] = i
[scan]   for i, ch in s:
[scan]     end = max(end, last[ch])
[cut]     if i == end:
[cut]       sizes.push(i - start + 1); start = i + 1
[return]   return sizes
`)

// Per-step notes (presentation metadata, never compiled). Each frame step
// resolves its note via the step fallback in semantic.js; structural/signature
// lines keep the generic scope notes there.
const EXPLAIN = {
  def: 'Scope: partitionLabels(s) over the input string; the measured walk runs in the body below.',
  init: 'last[c] holds the final index of each letter; start/end open the first partition.',
  scan: 'Stretch end to the last occurrence of s[i]: the cut cannot come before it.',
  cut: 'i reached end, so every letter inside ends here too: close the partition.',
  return: 'sizes holds one length per greedy cut: the maximum partition count.',
}

// Per-line notes derived from the real parsed lines: each line explains its own
// recorded operation step (structural wrappers fall back to generic scope notes).
const explainLinesFor = (lines) => lines.map((l) => EXPLAIN[l.step] || null)
const EXPLAIN_LINES = {
  java: explainLinesFor(partJava),
  cpp: explainLinesFor(partCpp),
  pseudo: explainLinesFor(partPseudo),
}

function decodeS(raw) {
  let value = raw
  if (typeof value === 'string') {
    const t = value.trim()
    // Accept both parsed strings (semantic.js tryParseLiteral output) and raw
    // LeetCode-style literal strings like '"ababcc"'.
    if (t.startsWith('"')) {
      value = JSON.parse(t)
    } else {
      value = t
    }
  }
  if (typeof value !== 'string') throw new Error('s must be a string like "ababcc"')
  if (value.length < 1) throw new Error('s must hold at least 1 character for this walkthrough')
  if (value.length > MAX_LEN) {
    throw new Error(
      'Visual walkthrough shows strings up to ' + MAX_LEN + ' chars (judge allows up to 500)'
    )
  }
  if (!/^[a-z]+$/.test(value)) {
    throw new Error('s holds only lowercase a-z letters (got ' + JSON.stringify(value).slice(0, 40) + ')')
  }
  return value
}

function build(args) {
  const s = decodeS(args[0])
  const n = s.length
  const chars = s.split('')
  const last = new Array(26).fill(-1)
  for (let i = 0; i < n; i++) last[s.charCodeAt(i) - 97] = i

  const frames = []
  const anchors = []
  const sizes = []
  let start = 0
  let end = 0

  const present = []
  for (let c = 0; c < 26; c++) {
    if (last[c] >= 0) present.push(String.fromCharCode(97 + c) + '=' + last[c])
  }
  const state = (vars = {}) => ({
    current: null,
    window: [start, end],
    sizes: sizes.slice(),
    vars: { n, start, end, ...vars },
  })
  const push = (step, label, note, vars) =>
    frames.push(frame(step, label, note, state(vars)))

  push('init', 'Record last positions', 'last ' + present.join(' ') + '; start=0 end=0', {})
  for (let i = 0; i < n; i++) {
    const ch = s[i]
    const li = last[s.charCodeAt(i) - 97]
    const before = end
    end = Math.max(end, li)
    push(
      'scan',
      'Scan i=' + i,
      'i=' + i + " c='" + ch + "' last=" + li + ' end ' + before + '->' + end,
      { i, ch, last: li }
    )
    if (i === end) {
      const size = i - start + 1
      sizes.push(size)
      frames.push(frame('cut', 'Cut partition', 'close [' + start + '..' + i + '] size ' + size, {
        current: null,
        window: [start, i],
        sizes: sizes.slice(),
        vars: { n, start, end, i, size },
      }))
      anchors.push(frames.length - 1)
      start = i + 1
    }
  }
  anchors.push(frames.length)
  push('return', 'Return answer', 'return [' + sizes.join(',') + '] in ' + sizes.length + ' parts', { answer: sizes.slice() })
  // Full event list: the host performs the single honest compaction pass.
  return {
    kind: 'string',
    layout: { chars },
    frames,
    result: sizes.slice(),
    anchors,
  }
}

export const adapters = {
  'partition-labels': {
    signature: { ...SIGNATURE, params: [...SIGNATURE.params] },
    lesson: {
      idea: 'Cut as soon as you can: stretch the partition to each letter\u2019s last occurrence and close it when the scan reaches that edge.',
      trap: 'Cutting at a first repeat splits a letter across parts; the edge must cover the LAST occurrence of every letter seen so far.',
      time: 'O(n)',
      space: 'O(26) = O(1)',
    },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    code: { java: partJava, cpp: partCpp, pseudo: partPseudo },
    build,
  },
}

export { MAX_LEN }
export default adapters['partition-labels']
export { boundedFrames }
