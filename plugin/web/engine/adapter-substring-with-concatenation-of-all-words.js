/** Substring with Concatenation of All Words — portable per-slug adapter (Sliding Window).
 * Word-length sliding window over wlen offsets: count words once, then scan
 * s in wlen-sized steps per offset with a seen map plus a matched-word count.
 * Pure + synchronous; never throws on import. Out-of-bound or malformed inputs
 * throw instead of rendering. Register under slug
 * `substring-with-concatenation-of-all-words` (see integration.json).
 * Target: plugin/web/engine/strings-adapters.js (additive key; no existing
 * export is renamed) — or the sliding-window family file the integrator
 * chooses, as long as the key, signature, steps, kind and visual bound below
 * are kept verbatim. Family precedent: adapter-permutation-in-string.js
 * (fixed-window counts + seen have/need + kind 'string').
 */
import { code, frame, boundedFrames } from './semantic-core.js';

export const MAX_FRAMES = 40;
export const MAX_S_LEN = 30;
export const MAX_WORDS = 6;
export const MAX_WORD_LEN = 6;

export const SIGNATURE = Object.freeze({
  name: 'findSubstring',
  params: Object.freeze(['string', 'string[]']),
  return: 'int[]',
});

const substringCode = {
  java: code(`
[structure] class Solution {
[signature]     public List<Integer> findSubstring(String s, String[] words) {
[need]         Map<String, Integer> need = new HashMap<>();
[need]         for (String w : words) need.put(w, need.getOrDefault(w, 0) + 1);
[init]         List<Integer> ans = new ArrayList<>();
[init]         int wlen = words[0].length(), m = words.length, total = wlen * m;
[init]         if (s.length() < total) return ans;
[scan]         for (int off = 0; off < wlen; off++) {
[scan]             Map<String, Integer> seen = new HashMap<>();
[scan]             int left = off, count = 0;
[hit]             for (int j = off; j + wlen <= s.length(); j += wlen) {
[hit]                 String w = s.substring(j, j + wlen);
[hit]                 if (need.containsKey(w)) {
[hit]                     seen.put(w, seen.getOrDefault(w, 0) + 1);
[hit]                     count++;
[shrink]                     while (seen.get(w) > need.get(w)) {
[shrink]                         String drop = s.substring(left, left + wlen);
[shrink]                         seen.put(drop, seen.get(drop) - 1);
[shrink]                         left += wlen;
[shrink]                         count--;
[shrink]                     }
[record]                     if (count == m) {
[record]                         ans.add(left);
[record]                         String drop = s.substring(left, left + wlen);
[record]                         seen.put(drop, seen.get(drop) - 1);
[record]                         left += wlen;
[record]                         count--;
[record]                     }
[miss]                 } else {
[miss]                     seen.clear();
[miss]                     count = 0;
[miss]                     left = j + wlen;
[miss]                 }
[hit]             }
[scan]         }
[done]         return ans;
[done]     }
[done] }
`),
  cpp: code(`
[structure] class Solution {
[structure] public:
[signature]     vector<int> findSubstring(string s, vector<string>& words) {
[need]         unordered_map<string, int> need;
[need]         for (auto &w : words) need[w]++;
[init]         vector<int> ans;
[init]         int wlen = (int)words[0].size(), m = (int)words.size(), total = wlen * m;
[init]         if ((int)s.size() < total) return ans;
[scan]         for (int off = 0; off < wlen; off++) {
[scan]             unordered_map<string, int> seen;
[scan]             int left = off, count = 0;
[hit]             for (int j = off; j + wlen <= (int)s.size(); j += wlen) {
[hit]                 string w = s.substr(j, wlen);
[hit]                 if (need.count(w)) {
[hit]                     seen[w]++;
[hit]                     count++;
[shrink]                     while (seen[w] > need[w]) {
[shrink]                         string drop = s.substr(left, wlen);
[shrink]                         seen[drop]--;
[shrink]                         left += wlen;
[shrink]                         count--;
[shrink]                     }
[record]                     if (count == m) {
[record]                         ans.push_back(left);
[record]                         string drop = s.substr(left, wlen);
[record]                         seen[drop]--;
[record]                         left += wlen;
[record]                         count--;
[record]                     }
[miss]                 } else {
[miss]                     seen.clear();
[miss]                     count = 0;
[miss]                     left = j + wlen;
[miss]                 }
[hit]             }
[scan]         }
[done]         return ans;
[done]     }
[done] };
`),
  pseudo: code(`
[need] need = counts of each word in words (target multiset)
[init] ans = []; wlen = len(words[0]); m = len(words); total = wlen * m
[init] if len(s) < total: return ans
[scan] for off in 0..wlen-1:
[scan]   seen = empty counts; left = off; count = 0
[hit]   for j in off, off+wlen, ... while j + wlen <= len(s):
[hit]     w = s[j : j+wlen]
[hit]     if w in need:
[hit]       seen[w] += 1; count += 1
[shrink]       while seen[w] > need[w]: drop s[left:left+wlen]; left += wlen; count -= 1
[record]       if count == m: append left to ans; drop s[left:left+wlen]; left += wlen; count -= 1
[miss]     else: seen = empty; count = 0; left = j + wlen
[done] return ans
`),
};

export const LESSON = Object.freeze({
  idea: 'All words share one length, so every hit must start on a word grid: run one fixed-step window per offset 0..wlen-1 and match word counts against need.',
  trap: 'A single left-to-right pass misses grids that start mid-word; and after recording a hit, slide left forward by one word or overlapping answers are lost.',
  time: 'O(n) — each offset scans s once in word steps; every word enters and leaves seen once',
  space: 'O(words) for the need and seen count maps',
});

export const EXPLAIN = Object.freeze({
  def: 'Return every start i where s[i : i+total] splits into exactly the words multiset, any order; order-insensitive so any order compares equal.',
  need: 'Count each word once; equal multisets define a concatenation, so this is the target.',
  init: 'Seed the answer list and the word geometry; a string shorter than all words joined has no window.',
  scan: 'One pass per offset: words can only start at off, off+wlen, ... so wlen passes cover every grid.',
  hit: 'Read the word at j and, when it is wanted, file it in seen and grow the matched count.',
  shrink: 'An overfull word means the left edge is stale: drop whole words until this word fits need again.',
  record: 'count == m means the window holds exactly the multiset: file left, then slide one word so overlaps still match.',
  miss: 'An unwanted word breaks the run: forget the window and restart just past it.',
  done: 'All grids scanned; the recorded starts are every concatenation.',
});

export const EXPLAIN_LINES = Object.freeze({
  java: [
    'Structural wrapper: the Solution class scope. No operation runs here.',
    'Signature: findSubstring takes String s plus String[] words and returns List<Integer>. Execution starts in the body.',
    'Need map: target counts, one entry per distinct word; an overfull seen entry is judged against this.',
    'Fill need: every occurrence counts, so duplicate words demand duplicates in the window.',
    'Answer list: starts are recorded here in discovery order; the judge compares order-insensitively.',
    'Geometry: wlen is the shared word length, m the word count, total the one window size every hit must fill.',
    'Guard: s shorter than total cannot hold one window, so return the empty list early.',
    'Offset loop: wlen passes; pass off only reads words starting at off, off+wlen, ... .',
    'Fresh window state per pass: seen counts plus left edge and matched count, all reset for this grid.',
    'Window cursor: left is the candidate start, count the in-window matched words so far.',
    'Step loop: visit each wlen-sized slot of this grid exactly once, left to right.',
    'Read: w is the literal word at j; only whole words are ever compared, never characters.',
    'Membership test: a word outside need can never belong to a hit, so it resets the run instead.',
    'File the hit: seen[w] grows and count grows; the window now claims one more word.',
    'Count: one more in-window word is claimed; overfull words are fixed by the shrink loop next.',
    'Shrink header: while this word exceeds its need quota, the left edge is too far left.',
    'Name the drop: the whole word at left leaves, never a partial word.',
    'Unfile the drop: its seen count falls; the window no longer claims it.',
    'Advance the edge: left jumps one full word so the window stays word-aligned.',
    'Unclaim: count falls with the dropped word; the loop rechecks the quota.',
    'Loop footer: end of one shrink pass; the quota test runs again.',
    'Full-window test: count == m means every claimed word fits need, so the window is a hit.',
    'Record: file left as a verified start; discovery order is fine because the judge ignores order.',
    'Name the slide word: the leftmost word leaves so the next window can overlap this one.',
    'Unfile it: its count is released before the edge moves.',
    'Slide: left advances one word and count falls; without this, overlapping hits like [0,1] in "aaa" are lost.',
    'Unclaim: the slid word no longer counts toward the next window.',
    'End of the full-window branch.',
    'Miss branch: w is unwanted, so no count or map entry may survive it.',
    'Forget the window: seen is cleared because every claimed word is left of a word that cannot belong.',
    'Reset the count: zero words are claimed after a break.',
    'Restart past the break: the next candidate starts after the unwanted word.',
    'End of the membership branch.',
    'End of this grid pass; the next j reads the following word slot.',
    'End of all offsets; every start position belonged to exactly one pass.',
    'Done: return every recorded start; an empty list honestly means no concatenation exists.',
    'Structural wrapper: close the method scope; no operation runs here.',
    'Structural wrapper: close the class scope; no operation runs here.',
  ],
  cpp: [
    'Structural wrapper: the Solution class scope. No operation runs here.',
    'Structural wrapper: public section opener. No operation runs here.',
    'Signature: findSubstring takes string s plus vector<string>& words and returns vector<int>. Execution starts in the body.',
    'Need map: target counts, one entry per distinct word; an overfull seen entry is judged against this.',
    'Fill need: every occurrence counts, so duplicate words demand duplicates in the window.',
    'Answer list: starts are recorded here in discovery order; the judge compares order-insensitively.',
    'Geometry: wlen is the shared word length, m the word count, total the one window size every hit must fill.',
    'Guard: s shorter than total cannot hold one window, so return the empty list early.',
    'Offset loop: wlen passes; pass off only reads words starting at off, off+wlen, ... .',
    'Fresh window state per pass: seen counts plus left edge and matched count, all reset for this grid.',
    'Window cursor: left is the candidate start, count the in-window matched words so far.',
    'Step loop: visit each wlen-sized slot of this grid exactly once, left to right.',
    'Read: w is the literal word at j; only whole words are ever compared, never characters.',
    'Membership test: a word outside need can never belong to a hit, so it resets the run instead.',
    'File the hit: seen[w] grows and count grows; the window now claims one more word.',
    'Count: one more in-window word is claimed; overfull words are fixed by the shrink loop next.',
    'Shrink header: while this word exceeds its need quota, the left edge is too far left.',
    'Name the drop: the whole word at left leaves, never a partial word.',
    'Unfile the drop: its seen count falls; the window no longer claims it.',
    'Advance the edge: left jumps one full word so the window stays word-aligned.',
    'Unclaim: count falls with the dropped word; the loop rechecks the quota.',
    'Loop footer: end of one shrink pass; the quota test runs again.',
    'Full-window test: count == m means every claimed word fits need, so the window is a hit.',
    'Record: file left as a verified start; discovery order is fine because the judge ignores order.',
    'Name the slide word: the leftmost word leaves so the next window can overlap this one.',
    'Unfile it: its count is released before the edge moves.',
    'Slide: left advances one word and count falls; without this, overlapping hits like [0,1] in "aaa" are lost.',
    'Unclaim: the slid word no longer counts toward the next window.',
    'End of the full-window branch.',
    'Miss branch: w is unwanted, so no count or map entry may survive it.',
    'Forget the window: seen is cleared because every claimed word is left of a word that cannot belong.',
    'Reset the count: zero words are claimed after a break.',
    'Restart past the break: the next candidate starts after the unwanted word.',
    'End of the membership branch.',
    'End of this grid pass; the next j reads the following word slot.',
    'End of all offsets; every start position belonged to exactly one pass.',
    'Done: return every recorded start; an empty list honestly means no concatenation exists.',
    'Structural wrapper: close the method scope; no operation runs here.',
    'Structural wrapper: class terminator. No operation runs here.',
  ],
  pseudo: [
    'Need: name the target multiset; equality against it is the whole verdict.',
    'Geometry: ans plus wlen, word count and the single window size every hit must fill.',
    'Guard: a string shorter than the joined words cannot hold one window.',
    'Offset loop: one pass per word grid so mid-word starts are covered.',
    'Fresh pass state: empty seen, left edge and zero claimed words.',
    'Step loop: visit each word slot of this grid left to right.',
    'Read the whole word at j; characters are never compared directly.',
    'Membership branch: only wanted words are filed, unwanted words reset.',
    'File and claim: seen[w] and count grow together.',
    'Shrink: drop whole words from the left until the overfull word fits need.',
    'Record then slide: file left and advance one word so overlaps still match.',
    'Miss: clear the window and restart just past the unwanted word.',
    'Done: every grid scanned; ans holds exactly the concatenation starts.',
  ],
});

/** INDEPENDENT oracle: brute-force multiset compare per start. No offsets, no
 * seen map, no count register — a different method from the walkthrough. */
export function substringOracle(s, words) {
  const wlen = words[0].length;
  const total = wlen * words.length;
  const want = [...words].sort().join('\u0000');
  const out = [];
  for (let i = 0; i + total <= s.length; i++) {
    const parts = [];
    for (let k = 0; k < words.length; k++) parts.push(s.substr(i + k * wlen, wlen));
    if (parts.sort().join('\u0000') === want) out.push(i);
  }
  return out;
}

function decodeArgs(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('substring-with-concatenation-of-all-words expects [s, words]');
  const [s, words] = args;
  if (typeof s !== 'string' || s.length > MAX_S_LEN) {
    throw new Error(`Provide s as a string of at most ${MAX_S_LEN} characters for this walkthrough`);
  }
  if (!Array.isArray(words) || words.length < 1 || words.length > MAX_WORDS) {
    throw new Error(`Provide 1..${MAX_WORDS} words for this walkthrough`);
  }
  if (!words.every((w) => typeof w === 'string')) throw new Error('Every word must be a string for this walkthrough');
  const wlen = words[0].length;
  if (wlen < 1 || wlen > MAX_WORD_LEN) throw new Error(`Words must have length 1..${MAX_WORD_LEN} for this walkthrough`);
  if (!words.every((w) => w.length === wlen)) {
    throw new Error('All words must share one length: mixed lengths cannot form one window size');
  }
  if (!/^[a-z]*$/.test(s) || !words.every((w) => /^[a-z]+$/.test(w))) {
    throw new Error('Walkthrough supports lowercase a-z only (judge constraint)');
  }
  return [s, words.slice()];
}

function finish(s, frames, result, anchors) {
  return {
    kind: 'string',
    layout: { chars: Array.from(s), mapKind: 'words' },
    frames: boundedFrames(frames, MAX_FRAMES).frames,
    result,
    anchors,
  };
}

export function build(args) {
  const [s, words] = decodeArgs(args);
  const wlen = words[0].length;
  const m = words.length;
  const total = wlen * m;
  const need = new Map();
  for (const w of words) need.set(w, (need.get(w) || 0) + 1);
  const needObj = {};
  for (const [w, c] of need) needObj[w] = c;
  const frames = [];
  const anchors = [];

  const seenOf = (seen) => {
    const o = {};
    for (const [w, c] of need) o[w] = `${seen.get(w) || 0}/${c}`;
    return o;
  };
  const stateOf = (j, left, seen, count, found, extra = {}) => {
    const highlights = {};
    if (Number.isInteger(j) && j + wlen <= s.length) {
      for (let k = j; k < j + wlen; k++) highlights[k] = 'accent';
    }
    if (Number.isInteger(left) && count === m) {
      for (let k = left; k < left + total && k < s.length; k++) {
        if (!(k in highlights)) highlights[k] = 'ok';
      }
    }
    Object.assign(highlights, extra.highlights || {});
    return {
      pointers: Number.isInteger(j) ? { j, left } : { left },
      window: Number.isInteger(j) ? [j, j + wlen - 1] : [left, left + total - 1],
      highlights,
      seen: seenOf(seen),
      vars: { off: extra.off ?? null, wlen, m, total, left, count, found: found.slice(), ...(extra.vars || {}) },
    };
  };

  frames.push(frame(
    'need',
    `Count ${m} word${m === 1 ? '' : 's'}`,
    `Need ${words.map((w) => `"${w}"`).join(', ')}; a hit must hold exactly this multiset.`.slice(0, 140),
    { pointers: {}, window: [0, -1], highlights: {}, seen: seenOf(new Map()), vars: { wlen, m, total, found: [] } },
  ));
  anchors.push(frames.length - 1);

  const ans = [];
  let scCmp = 0, scWrites = 0;
  const scOps = () => ({ cmp: scCmp, writes: scWrites });
  if (s.length < total) {
    frames.push(frame(
      'init',
      'Too short for one window',
      `s has ${s.length} chars but one window needs ${total}; return [].`.slice(0, 140),
      { pointers: {}, window: [0, -1], highlights: {}, seen: seenOf(new Map()), vars: { wlen, m, total, found: [] } },
    ));
    frames.push(frame(
      'done',
      'Return []',
      'No window fits, so no concatenation exists.',
      { pointers: {}, window: [0, -1], highlights: {}, seen: seenOf(new Map()), vars: { wlen, m, total, found: [] }, ops: scOps() },
    ));
    return finish(s, frames, ans, anchors);
  }

  frames.push(frame(
    'init',
    `Window holds ${m} words`,
    `wlen=${wlen}, ${m} words, one window spans ${total} chars.`.slice(0, 140),
    { pointers: {}, window: [0, total - 1], highlights: {}, seen: seenOf(new Map()), vars: { wlen, m, total, left: 0, count: 0, found: [] } },
  ));

  for (let off = 0; off < wlen; off++) {
    const seen = new Map();
    let left = off;
    let count = 0;
    frames.push(frame(
      'scan',
      `Offset ${off}`,
      `Pass ${off + 1} of ${wlen}: read words at ${off}, ${off + wlen}, ... .`.slice(0, 140),
      { ...stateOf(null, left, seen, count, ans, { off }), ops: scOps() },
    ));
    for (let j = off; j + wlen <= s.length; j += wlen) {
      const w = s.substr(j, wlen);
      const req = need.get(w);
      scCmp += 1;
      if (req !== undefined) {
        seen.set(w, (seen.get(w) || 0) + 1);
        count++;
        scWrites += 1;
        frames.push(frame(
          'hit',
          `"${w}" wanted at ${j}`,
          `"${w}" is ${(seen.get(w))}/${req}; ${count} of ${m} words claimed.`.slice(0, 140),
          { ...stateOf(j, left, seen, count, ans, { off, vars: { w } }), ops: scOps() },
        ));
        while ((seen.get(w) || 0) > req) {
          scCmp += 1;
          const drop = s.substr(left, wlen);
          seen.set(drop, (seen.get(drop) || 0) - 1);
          left += wlen;
          count--;
          scWrites += 1;
          frames.push(frame(
            'shrink',
            `Drop "${drop}"`,
            `"${drop}" leaves; left=${left}, ${count} of ${m} claimed.`.slice(0, 140),
            { ...stateOf(j, left, seen, count, ans, { off, vars: { w, drop } }), ops: scOps() },
          ));
        }
        scCmp += 1;
        if (count === m) {
          ans.push(left);
          frames.push(frame(
            'record',
            `Hit at ${left}`,
            `Window [${left}, ${left + total}) holds all ${m} words; file ${left}.`.slice(0, 140),
            { ...stateOf(j, left, seen, count, ans, { off, vars: { w } }), ops: scOps() },
          ));
          anchors.push(frames.length - 1);
          const drop = s.substr(left, wlen);
          seen.set(drop, (seen.get(drop) || 0) - 1);
          left += wlen;
          count--;
          scWrites += 1;
        }
      } else {
        seen.clear();
        count = 0;
        left = j + wlen;
        frames.push(frame(
          'miss',
          `"${w}" unwanted`,
          `"${w}" at ${j} is not needed; restart past it at ${left}.`.slice(0, 140),
          { ...stateOf(j, left, seen, count, ans, { off, vars: { w } }), ops: scOps() },
        ));
      }
    }
  }

  const sorted = ans.slice().sort((a, b) => a - b);
  frames.push(frame(
    'done',
    ans.length ? `Found ${ans.length} start${ans.length === 1 ? '' : 's'}` : 'No concatenation found',
    ans.length
      ? `Starts [${sorted.join(', ')}]; every grid scanned.`
      : 'Every grid scanned and no window held the full multiset.',
    {
      pointers: { left: null },
      window: [0, -1],
      highlights: Object.fromEntries(sorted.flatMap((st) => Array.from({ length: total }, (_, k) => [st + k, 'ok']))),
      seen: seenOf(new Map()),
      vars: { wlen, m, total, found: sorted },
      ops: scOps(),
    },
  ));
  return finish(s, frames, sorted, anchors);
}

export const adapters = {
  'substring-with-concatenation-of-all-words': {
    signature: SIGNATURE,
    lesson: LESSON,
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    code: substringCode,
    build,
  },
};
