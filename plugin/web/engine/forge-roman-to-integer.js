/**
 * roman-to-integer — live portable practice builder (catalog-expansion).
 *
 * Produces exactly 3 deterministic drills for the live record
 * (id 13, `romanToInt(string) -> int`, judge mode `exact`):
 *
 *   v1  fresh values       — same task, new seeded-valid numerals
 *   v2  edge cases         — fixed boundaries (1, subtractive minima,
 *                            additive maxima, full-range maximum 3999)
 *   v3  adversarial pairs  — SAME task, no rule change: numerals that punish
 *                            the add-everything shortcut (IV vs VI, IX vs XI,
 *                            XC vs LX, MCMXCIV vs naive sum).
 *
 * Every `expected` is computed at build time by `romanOraclePair` below
 * (left-to-right pair-table consumption), an INDEPENDENT implementation
 * from the walkthrough's right-to-left prev-compare scan. Generation is
 * fixed-input deterministic: the same record always yields the same three
 * drills — no Math.random, no Date.
 *
 * Pure ES module: no DOM, no network, no dependencies. Returns [] when the
 * record is not a roman-to-integer-shaped problem; never throws.
 *
 * Staged source: .workers/jobs/deck-release/catalog-expansion/lessons/roman-to-integer/forge-roman-to-integer.js
 * (copied verbatim to the live shape).
 */

export const SLUG = 'roman-to-integer'
export const SIGNATURE = Object.freeze({
  name: 'romanToInt',
  params: Object.freeze([{ name: 's', type: 'string' }]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Easy'

export const INTENT_SAME = 'Same pattern, different inputs so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge cases the original hides.'
export const INTENT_ADVERSARIAL = 'Same question with adversarial shapes that punish shortcut solutions.'

const VAL = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }
const PAIR = { IV: 4, IX: 9, XL: 40, XC: 90, CD: 400, CM: 900 }
const ROMAN_RE = /^[IVXLCDM]{1,15}$/

/**
 * INDEPENDENT oracle: left-to-right pair-table consumption. When s[i:i+2]
 * is a subtractive pair, consume both and add the pair value; otherwise add
 * the single value. Deliberately NOT the walkthrough's right-to-left scan
 * with a running prev, so adapter-vs-oracle agreement is a real cross-check.
 */
export function romanOraclePair(s) {
  if (typeof s !== 'string' || !ROMAN_RE.test(s)) throw new Error('oracle needs a valid roman string 1..15 of IVXLCDM')
  let total = 0
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2)
    if (two.length === 2 && PAIR[two] !== undefined) {
      total += PAIR[two]
      i++
    } else {
      total += VAL[s[i]]
    }
  }
  return total
}

/** Canonical int -> roman (range 1..3999) used only to document provenance of fixed inputs. */
export function intToRoman(n) {
  const table = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let out = ''
  for (const [v, r] of table) while (n >= v) { out += r; n -= v }
  return out
}

function argLiteral(value) {
  return JSON.stringify(String(value))
}

function inputLine(signature, args) {
  const name = (signature.params[0] && signature.params[0].name) || 's'
  return name + ' = ' + args[0]
}

function signatureOf(problem) {
  const sig = problem && problem.judge && problem.judge.signature
  if (!sig || sig.name !== 'romanToInt' || sig.return !== 'int') return null
  if (!Array.isArray(sig.params) || sig.params.length !== 1) return null
  if (sig.params[0].type !== 'string') return null
  return { name: sig.name, params: [{ name: String(sig.params[0].name || 's'), type: 'string' }], return: 'int' }
}

function difficultyOf(problem) {
  const v = problem && problem.difficulty
  return v === 'Easy' || v === 'Medium' || v === 'Hard' ? v : DIFFICULTY
}

function buildVariant({ id, seedLabel, intent, difficulty, title, statement, signature, cases, hints }) {
  const tests = cases.map((s) => ({ args: [argLiteral(s)], expected: String(romanOraclePair(s)) }))
  const first = tests[0]
  return {
    id,
    seedLabel,
    intent,
    difficulty,
    title,
    statement,
    signature: { name: signature.name, params: signature.params.map((p) => ({ ...p })), return: signature.return },
    examples: [{ input: inputLine(signature, first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: hints.slice(0, 2),
  }
}

const V1_CASES = ['XXVII', 'CDXLIV', 'CMXCIX', 'MMXXVI']
const V2_CASES = ['I', 'IV', 'MMMCMXCIX', 'VIII', 'XL']
const V3_CASES = ['IV', 'IX', 'XC', 'MCMXCIV']

export function buildRomanToIntegerVariants(problem) {
  try {
    if (!problem || typeof problem !== 'object') return []
    if (problem.slug !== SLUG) return []
    const signature = signatureOf(problem)
    if (!signature) return []
    const difficulty = difficultyOf(problem)
    const base = String(problem.title || 'Roman to Integer').trim()
    const make = (id, seedLabel, intent, suffix, statement, cases, hints) =>
      buildVariant({ id, seedLabel, intent, difficulty, title: base + ' — ' + suffix + ' (numeral drill)', statement, signature, cases, hints })
    return [
      make(
        'v1', 'fresh values', INTENT_SAME, 'fresh values',
        'Given a valid roman numeral s (IVXLCDM, length 1..15, range 1..3999), return its integer value. Fresh inputs below: a plain additive numeral, two mid-range subtractive mixes, and a modern year. Work each one right-to-left with the prev walkthrough.',
        V1_CASES,
        ['Scan from the rightmost numeral keeping prev: subtract when the current value is smaller, else add.', 'MCMXCIV-style runs mix both: CM and XC and IV each subtract exactly once.'],
      ),
      make(
        'v2', 'edge cases', INTENT_EDGE, 'edge cases',
        'Same roman-to-integer task with the boundaries: the single numeral I, the smallest subtractive pair IV, the full-range maximum MMMCMXCIX (3999), a repeat-run VIII, and the tens subtractive XL. Same signature and exact comparison.',
        V2_CASES,
        ['A lone numeral has no neighbour to compare against, so it always adds.', 'MMMCMXCIX exercises every subtractive pair class at once (CM, XC, IX).'],
      ),
      make(
        'v3', 'adversarial pairs', INTENT_ADVERSARIAL, 'adversarial pairs',
        'Same roman-to-integer question, no rule change. Each input punishes the add-everything shortcut: IV is 4 (not 6), IX is 9 (not 11), XC is 90 (not 110), and MCMXCIV is 1994 (not the naive 2210). Return the exact integer for each input.',
        V3_CASES,
        ['If you sum single values only, every one of these overshoots: check the right neighbour first.', 'IV/IX/XL/XC/CD/CM are the only six cases where a smaller numeral prefixes a larger one.'],
      ),
    ]
  } catch {
    return []
  }
}

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'romanOraclePair (left-to-right pair-table consumption; walkthrough uses right-to-left prev comparison)',
})
