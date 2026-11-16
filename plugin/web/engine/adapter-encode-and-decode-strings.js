/**
 * encode-and-decode-strings — portable per-slug staged adapter (Arrays & Hashing, blind75=true).
 *
 * Produces the walkthrough scene for slug `encode-and-decode-strings`
 * (Encode and Decode Strings, Medium). There is NO live judge record for this
 * slug: it is LeetCode 271 (premium) with no local raw/shard record
 * (docs/NEETCODE_150.json marks it { localRecord: false,
 * alternativeSource: "https://www.lintcode.com/problem/659/" }).
 *
 * Honest TEST PROFILE (judgeCase: null — design/judge-null slug): the real
 * LeetCode profile is a Codec class with encode(List<String>) -> String and
 * decode(String) -> List<String>; the single-function test profile below
 * replays the round trip, decode(encode(strs)), as one callable:
 *   roundTrip(strs: string[]) -> string[]
 * Every walkthrough frame, practice test, and expected value uses this
 * profile. Never presented as official.
 *
 * Canonical scheme: length-prefix "<len>#<word>" per word, concatenated.
 * Decoding scans digits to '#', then takes exactly len raw characters, so
 * payloads may contain '#', digits, or be empty.
 *
 * Pure ES module: no DOM, no network, no dependencies besides
 * semantic-core.js. Walkthrough bounds (0-6 words, 0-8 chars/word, printable
 * ASCII) are presentation caps only; the reference algorithm has no such caps.
 */

import { code, frame, boundedFrames } from './semantic-core.js'

export const SLUG = 'encode-and-decode-strings'

// Honest TEST PROFILE signature (see header). Host-supported types only.
export const SIGNATURE = {
  name: 'roundTrip',
  params: ['string[]'],
  return: 'string[]',
}

const PRINTABLE = /^[\x20-\x7E]*$/
const MAX_WORDS = 6
const MAX_WORD_LEN = 8

function checkStrs(raw) {
  if (!Array.isArray(raw)) {
    throw new Error('Encode and Decode Strings walkthrough needs an array of strings, e.g. ["neet","code"]')
  }
  if (raw.length > MAX_WORDS) {
    throw new Error(`Encode and Decode Strings walkthrough supports 0..${MAX_WORDS} words (got ${raw.length}); the reference algorithm itself has no such cap`)
  }
  raw.forEach((w, i) => {
    if (typeof w !== 'string') throw new Error(`strs[${i}] must be a string`)
    if (w.length > MAX_WORD_LEN) {
      throw new Error(`strs[${i}] is ${w.length} chars; walkthrough supports 0..${MAX_WORD_LEN} chars per word (no truncation)`)
    }
    if (!PRINTABLE.test(w)) throw new Error(`strs[${i}] must be printable ASCII for the walkthrough`)
  })
  return raw.slice()
}

function encodeRef(strs) {
  let out = ''
  for (const w of strs) out += String(w.length) + '#' + w
  return out
}

function decodeRef(s) {
  const out = []
  let i = 0
  while (i < s.length) {
    let j = i
    while (j < s.length && s[j] !== '#') j++
    const len = Number(s.slice(i, j))
    const start = j + 1
    out.push(s.slice(start, start + len))
    i = start + len
  }
  return out
}

const codecJava = code(`
[init] import java.util.*;
[init] public class Codec {
[init]     // Encodes a list of strings to a single string.
[read]     public String encode(List<String> strs) {
[init]         StringBuilder sb = new StringBuilder();
[read]         for (String w : strs) {
[emit]             sb.append(w.length()).append('#').append(w);
[read]         }
[encoded]         return sb.toString();
[init]     }
[init]     // Decodes a single string to a list of strings.
[parse]     public List<String> decode(String s) {
[init]         List<String> out = new ArrayList<>();
[init]         int i = 0;
[parse]         while (i < s.length()) {
[parse]             int j = i;
[parse]             while (s.charAt(j) != '#') j++;
[parse]             int len = Integer.parseInt(s.substring(i, j));
[take]             int start = j + 1;
[take]             out.add(s.substring(start, start + len));
[append]             i = start + len;
[parse]         }
[done]         return out;
[init]     }
[init] }
`)

const codecCpp = code(`
[init] #include <string>
[init] #include <vector>
[init] using namespace std;
[init] class Codec {
[init] public:
[read]     string encode(vector<string>& strs) {
[init]         string out;
[read]         for (string& w : strs) {
[emit]             out += to_string(w.size()) + "#" + w;
[read]         }
[encoded]         return out;
[init]     }
[parse]     vector<string> decode(string s) {
[init]         vector<string> out;
[init]         size_t i = 0;
[parse]         while (i < s.size()) {
[parse]             size_t j = i;
[parse]             while (s[j] != '#') j++;
[parse]             int len = stoi(s.substr(i, j - i));
[take]             size_t start = j + 1;
[take]             out.push_back(s.substr(start, len));
[append]             i = start + len;
[parse]         }
[done]         return out;
[init]     }
[init] };
`)

const codecPseudo = code(`
[init] function encode(strs):
[init]   out = ""
[read]   for w in strs:
[emit]     out += str(length(w)) + "#" + w
[encoded]   return out
[parse] function decode(s):
[init]   out = []; i = 0
[parse]   while i < length(s):
[parse]     j = i; while s[j] != "#": j += 1
[parse]     len = parseInt(s[i .. j-1])
[take]     start = j + 1; word = s[start .. start+len-1]
[append]     append word to out; i = start + len
[done]   return out
`)

const EXPLAIN = {
  init: 'Set up the empty accumulator (encode) or the empty answer list plus scan index (decode).',
  read: 'Observe the next input word and measure its length; the word itself is read, never modified.',
  emit: 'Append the self-describing chunk "<len>#<word>" so the boundary is recoverable later.',
  encoded: 'Name the full concatenated string as the encode-phase candidate (not the final answer).',
  parse: 'Scan digits from the current position to "#" and convert them to the payload length.',
  take: 'Slice exactly len raw characters after "#"; no scanning for delimiters inside the payload.',
  append: 'File the recovered word into the answer list and advance past it.',
  done: 'Return the decoded list; equality with the input list is the round-trip check.',
}

export const EXPLAIN_LINES = {
  java: {
    8: 'Method scope ends; the returned string is the encode-phase candidate, not the final answer.',
    20: 'Loop exit: scan index reached the end of the encoding, so every word was recovered.',
    22: 'End of the class scope; it performs no algorithm operation.',
  },
  cpp: {
    10: 'Method scope ends; the returned string is the encode-phase candidate, not the final answer.',
    22: 'Loop exit: scan index reached the end of the encoding, so every word was recovered.',
    24: 'End of the class scope; it performs no algorithm operation.',
  },
  pseudo: {},
}

// Every frame below is a REAL execution event over the actual encoding:
// init, one read+emit pair per word, one encoded candidate, one
// parse+take+append triple per word replaying the reference digit-scan over
// the real characters, plus done. No future characters are revealed early.
function build(args) {
  const strs = checkStrs(Array.isArray(args) && args.length > 0 ? args[0] : args)
  const words = strs.slice()
  const full = encodeRef(words)
  const fullChars = Array.from(full)
  const frames = []
  let ecCmp = 0, ecWrites = 0
  const ecOps = () => ({ cmp: ecCmp, writes: ecWrites })

  // Segment table for the REAL chunks (start/end over the final encoding).
  const segs = []
  {
    let p = 0
    for (const w of words) {
      const chunk = String(w.length) + '#' + w
      segs.push({ word: w, len: w.length, start: p, end: p + chunk.length })
      p += chunk.length
    }
  }

  const encRoles = (upto, extra = {}) => {
    const roles = {}
    for (let k = 0; k < upto; k++) roles[k] = roles[k] || 'ok'
    return Object.assign(roles, extra)
  }
  const stateOf = (kind, extra = {}) => Object.assign({
    pointers: {},
    highlights: {},
    words: words.slice(),
    enc: fullChars.slice(0, extra.encLen !== undefined ? extra.encLen : 0),
    decoded: [],
    vars: { n: words.length },
  }, kind, extra)

  let encLen = 0
  frames.push(frame('init', 'Start with an empty encoding',
    'No words read yet; the encoded string and answer list are both empty.',
    stateOf(null, { pointers: {}, encLen: 0 })))

  words.forEach((w, i) => {
    ecCmp += 1
    frames.push(frame('read', `Read strs[${i}] = ${JSON.stringify(w)} (length ${w.length})`,
      `Measure length ${w.length}; the word is read, never modified.`,
      { ...stateOf(null, {
        pointers: { i },
        highlights: { [i]: 'accent' },
        encLen,
        vars: { n: words.length, i, word: w, len: w.length },
      }), ops: ecOps() }))
    encLen = segs[i].end
    const mark = {}
    for (let k = segs[i].start; k < segs[i].end; k++) mark[k] = 'accent'
    ecWrites += 1
    frames.push(frame('emit', `Append ${JSON.stringify(String(w.length) + '#' + w)}`,
      `Post-update: encoded is now ${JSON.stringify(full.slice(0, encLen))}.`,
      { ...stateOf(null, {
        pointers: { i },
        highlights: { [i]: 'ok' },
        enc: fullChars.slice(0, encLen),
        encLen,
        encRoles: mark,
        encSegs: segs.slice(0, i + 1),
        vars: { n: words.length, i, word: w, len: w.length },
      }), ops: ecOps() }))
  })

  frames.push(frame('encoded', `Encoded candidate (${fullChars.length} chars)`,
    fullChars.length === 0
      ? 'Empty input encodes to the empty string; nothing to decode.'
      : 'Encode phase complete; this candidate still has to survive decoding.',
    { ...stateOf(null, {
      enc: fullChars.slice(),
      encLen: fullChars.length,
      encRoles: encRoles(fullChars.length),
      encSegs: segs.slice(),
      vars: { n: words.length, encodedLen: fullChars.length },
    }), ops: ecOps() }))

  // --- decode: replay the REAL reference scan over the actual encoding ---
  const decoded = []
  let j = 0
  let guard = 0
  while (j < full.length && guard++ < 1000) {
    let k = j
    while (k < full.length && full[k] !== '#') k++
    const len = Number(full.slice(j, k))
    const start = k + 1
    const word = full.slice(start, start + len)
    const headMark = {}
    for (let t = j; t <= k; t++) headMark[t] = 'accent'
    ecCmp += (k - j + 1)
    frames.push(frame('parse', `Parse length ${len} at chars [${j}..${k}]`,
      `Digits ${JSON.stringify(full.slice(j, k))} then "#" give len=${len}.`,
      { ...stateOf(null, {
        pointers: { j },
        enc: fullChars.slice(),
        encLen: fullChars.length,
        encRoles: Object.assign(encRoles(fullChars.length), headMark),
        encSegs: segs.slice(),
        decoded: decoded.slice(),
        vars: { n: words.length, j, len, head: [j, k] },
      }), ops: ecOps() }))
    const payMark = {}
    for (let t = start; t < start + len; t++) payMark[t] = 'accent'
    ecCmp += 1
    frames.push(frame('take', `Take ${len} char(s) at [${start}..${start + len - 1}]`,
      len === 0
        ? 'Length 0 takes the empty word; "#" inside payloads is never scanned.'
        : `Raw slice ${JSON.stringify(word)}; delimiters inside are data, not syntax.`,
      { ...stateOf(null, {
        pointers: { j: start },
        enc: fullChars.slice(),
        encLen: fullChars.length,
        encRoles: Object.assign(encRoles(fullChars.length), payMark),
        encSegs: segs.slice(),
        decoded: decoded.slice(),
        vars: { n: words.length, j: start, len, word },
      }), ops: ecOps() }))
    decoded.push(word)
    j = start + len
    ecWrites += 1
    frames.push(frame('append', `Decoded[${decoded.length - 1}] = ${JSON.stringify(word)}`,
      `Post-update: scan resumes at char ${j}; ${decoded.length}/${words.length} word(s) recovered.`,
      { ...stateOf(null, {
        pointers: { j },
        highlights: { [decoded.length - 1]: 'ok' },
        enc: fullChars.slice(),
        encLen: fullChars.length,
        encRoles: encRoles(j),
        encSegs: segs.slice(),
        decoded: decoded.slice(),
        vars: { n: words.length, j, decodedCount: decoded.length },
      }), ops: ecOps() }))
  }

  const roundTrip = JSON.stringify(decoded) === JSON.stringify(words)
  frames.push(frame('done', roundTrip ? `Round-trip ok: ${decoded.length} word(s) recovered` : 'Round-trip MISMATCH',
    roundTrip
      ? (words.length === 0
        ? 'Empty list encodes to "" and decodes to []; final answer [].'
        : `decode(encode(strs)) equals strs; final answer ${JSON.stringify(decoded)}.`)
      : 'Decoded list differs from input (should be unreachable for valid frames).',
    { ...stateOf(null, {
      pointers: { j },
      enc: fullChars.slice(),
      encLen: fullChars.length,
      encRoles: encRoles(fullChars.length),
      encSegs: segs.slice(),
      decoded: decoded.slice(),
      vars: { n: words.length, j, decodedCount: decoded.length, roundTrip },
    }), ops: ecOps() }))

  // Single compaction pass (mirrors semantic.js): no-op under the 40-frame
  // walkthrough budget; longer honest event lists would sample here, once.
  const { frames: compact } = boundedFrames(frames, 40)
  return {
    kind: 'array',
    layout: { values: words.slice(), chars: fullChars.slice() },
    frames: compact,
    result: decoded.slice(),
    encoded: full,
  }
}

export const adapters = {
  'encode-and-decode-strings': {
    // Honest TEST PROFILE (judge:null; see header). The real LeetCode profile
    // is Codec.encode/decode; roundTrip(strs) = decode(encode(strs)).
    signature: SIGNATURE,
    lesson: {
      idea: 'Prefix every word with its decimal length and a "#" delimiter ("<len>#<word>"), then concatenate; decoding scans the digits, skips "#", and takes exactly len raw characters, so any payload (including "#", digits, or empty) survives.',
      trap: 'Joining with a bare separator ("a#b") is ambiguous when a word itself contains the separator; escaping fixes one character but not all, while the length prefix needs no escapes at all.',
      time: 'O(total characters)',
      space: 'O(total characters)',
      alternate: 'Escape-based framing (prefix a backslash before every "#" and backslash) also round-trips, but every payload byte must be inspected and escaped/unescaped; the length prefix touches each character once and keeps random access to each word start.',
    },
    code: { java: codecJava, cpp: codecCpp, pseudo: codecPseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
}
