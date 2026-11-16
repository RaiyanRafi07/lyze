/**
 * encode-and-decode-strings — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `encode-and-decode-strings`
 * (Encode and Decode Strings, Medium, Arrays & Hashing). There is NO live
 * judge record for this slug (LeetCode 271 premium; docs/NEETCODE_150.json
 * marks it localRecord:false). The forge therefore documents an honest TEST
 * PROFILE — roundTrip(strs:string[]) -> string[] — where the single function
 * replays decode(encode(strs)) and the return is the decoded list literal.
 * The real LeetCode profile is the Codec class (encode/decode methods);
 * judgeCase stays null for this design/judge-null slug.
 * Every expected value is computed at build time by oracleRoundTrip below
 * (regex-header decode — a genuinely different algorithm from the
 * walkthrough's manual digit-scan loop), so producer/validator never share code.
 *
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; all expected values recomputed by the oracle at build time.
 *
 * Staged source: .workers/jobs/question-owners-150/encode-and-decode-strings/practice.js
 * (statements, hints, regex oracle); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the documented test profile, so the same editor code compiles unchanged.
 * - `args` are raw literal strings; `expected` is the literal the judge compares.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from tests[0].
 * - `mode` is 'exact' (ordered list equality). `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'encode-and-decode-strings'
export const SIGNATURE = Object.freeze({
  name: 'roundTrip',
  params: Object.freeze([{ name: 'strs', type: 'string[]' }]),
  return: 'string[]',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same length-prefix framing on fresh words so you reproduce the encode/decode reasoning.'
export const INTENT_EDGE = 'Same task with the empty-word, delimiter, digit-payload, and empty-list edges the worked example hides.'
export const INTENT_ADVERSARIAL = 'Same task with delimiter-heavy, multi-digit payloads that punish bare-separator mental models.'

/** INDEPENDENT oracle: trivially-auditable map/join encode; regex-header decode. */
export function oracleEncode(strs) {
  return strs.map((w) => `${w.length}#${w}`).join('')
}

export function oracleDecode(s) {
  const out = []
  const re = /(\d+)#/g
  let pos = 0
  let m
  while ((m = re.exec(s)) !== null) {
    if (m.index !== pos) throw new Error(`oracle: gap at ${pos} (malformed encoding)`)
    const len = Number(m[1])
    const start = m.index + m[0].length
    out.push(s.slice(start, start + len))
    pos = start + len
    re.lastIndex = pos
  }
  if (pos !== s.length) throw new Error(`oracle: trailing bytes at ${pos} (malformed encoding)`)
  return out
}

export function oracleRoundTrip(strs) {
  return oracleDecode(oracleEncode(strs))
}

const lit = (v) => JSON.stringify(v)

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

function buildVariant({ id, seedLabel, intent, title, statement, strsList, hints }) {
  const tests = strsList
    .map((strs) => ({ args: [lit(strs)], expected: lit(oracleRoundTrip(strs)) }))
    .slice(0, 5)
    .map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
  const first = tests[0]
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title,
    statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(SIGNATURE, first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: hints.slice(0, 2),
  }
}

/* ---------------- entry point ---------------- */

export function buildEncodeAndDecodeStringsPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh words',
      intent: INTENT_SAME,
      title: 'Codec — Fresh Words (same task)',
      statement:
        'Round-trip fresh lowercase word lists through the length-prefix Codec. Each word is framed as its decimal length, then "#", then the raw word, and decoding scans digits to "#" before taking exactly that many characters. The signature and exact ordered comparison are unchanged.',
      strsList: [
        ['z', 't', 'zawurz', 'vbuis'],
        ['e', 't', 'gbkrk', 'tkrd'],
        ['urghro', 'tx', 'xxy'],
      ],
      hints: [
        'Frame each word as its length, then "#", then the raw word.',
        'Decode by scanning digits to "#", then taking exactly that many characters.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Codec — Edge Payloads (same task)',
      statement:
        'Round-trip lists containing the empty word, "#" and digit payloads, and the empty list itself. An empty word still emits a chunk ("0#"), and an empty list encodes to the empty string. The signature and exact ordered comparison are unchanged.',
      strsList: [
        [''],
        ['#', '12#ab'],
        ['a#b#c', '007', ''],
        [],
      ],
      hints: [
        'An empty word still emits a chunk: "0#".',
        'Never scan payloads for "#": the header length is the only boundary.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'delimiter storm',
      intent: INTENT_ADVERSARIAL,
      title: 'Codec — Delimiter Storm (transfer)',
      statement:
        'SAME TASK, harder shape: payloads are almost entirely "#" and digits with multi-digit lengths, so a bare-separator join would be hopelessly ambiguous. The length prefix still recovers every word exactly. No rule change: the signature and exact ordered comparison are unchanged.',
      strsList: [
        ['##########', '123456789012'],
        ['9#9#9', '0#', '#0'],
        ['longwordishe', 'mix#3d#ch4rs!'],
      ],
      hints: [
        'Multi-digit headers (e.g. "12#") parse greedily to "#": take all digits.',
        'A word like "9#9#9" encodes to "5#9#9#9"; decode takes 5 raw chars after the first "#".',
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
  oracle: 'oracleRoundTrip (regex-header decode; frame emitter uses a manual digit-scan loop)',
})
