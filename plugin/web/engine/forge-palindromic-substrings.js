/**
 * palindromic-substrings — portable standalone practice builder (delivery-sprint-20261107).
 *
 * Produces exactly 3 deterministic variants for slug `palindromic-substrings`
 * (Palindromic Substrings, Medium, countSubstrings(string)->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs (no randomness); every expected value is computed at build time
 * by bruteOracle below (enumerate every substring + two-pointer check), a
 * DISTINCT algorithm from the lesson's expand-around-center walkthrough.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 *   { id, seedLabel, intent, difficulty, title, statement,
 *     signature, examples, tests, mode, hints }
 * - `signature` is the ACTUAL judge signature (same method name, same param
 *   types, same return), so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (same-task practice only, no rule change).
 * - `hints` holds exactly 2 hints per variant.
 * - No RULE CHANGE: all three variants keep the official counting rule
 *   (same question, new strings / edge density / adversarial nesting).
 * - No staged official example is reused verbatim: the staged packet's fresh
 *   "abc" was replaced with "abca" and its adversarial "aaa" with "abaaba"
 *   (both verified non-official; "abcd" was already non-official).
 */

export const SLUG = 'palindromic-substrings'
export const SIGNATURE = Object.freeze({
  name: 'countSubstrings',
  params: Object.freeze([{ name: 's', type: 'string' }]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different strings so you reproduce the center-expansion reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same task with adversarial nesting that punishes odd-only expansions.'

/** INDEPENDENT reference oracle: enumerate every substring, two-pointer check. */
export function bruteCountPalindromes(s) {
  const text = String(s)
  let total = 0
  for (let i = 0; i < text.length; i += 1) {
    for (let j = i; j < text.length; j += 1) {
      let lo = i
      let hi = j
      let ok = true
      while (lo < hi) {
        if (text[lo] !== text[hi]) {
          ok = false
          break
        }
        lo += 1
        hi -= 1
      }
      if (ok) total += 1
    }
  }
  return total
}

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

function argLiteral(value) {
  return JSON.stringify(String(value))
}

function testsFromInputs(inputs) {
  return inputs.map((s) => ({ args: [argLiteral(s)], expected: String(bruteCountPalindromes(s)) }))
}

function buildVariant({ id, seedLabel, intent, title, statement, inputs, hints }) {
  const tests = testsFromInputs(inputs)
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

const STATEMENT_BASE =
  'Given a string s, return the number of palindromic substrings in it. ' +
  'A string is a palindrome when it reads the same backward as forward. ' +
  'A substring is a contiguous sequence of characters within the string.'

const FRESH_INPUTS = ['abccaa', 'xyzyx', 'abca', 'aabaa']
const EDGE_INPUTS = ['aaaa', 'a', 'abcd']
const ADVERSARIAL_INPUTS = ['abccba', 'aabbaa', 'abaaba']

/* ---------------- entry point ---------------- */

export function buildPalindromicPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh strings',
      intent: INTENT_SAME,
      title: 'Palindromic Substrings — Fresh Mix (counting drill)',
      statement:
        STATEMENT_BASE +
        ' Drill: fresh mixed string with both odd and even palindromes; count every palindromic substring.',
      inputs: FRESH_INPUTS,
      hints: [
        'Every palindrome has exactly one middle: expand outward from each character (odd) and each gap (even).',
        'When the outer pair differs, stop that ray — no wider window on the same middle can match.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Palindromic Substrings — All-Same Edge (counting drill)',
      statement:
        STATEMENT_BASE +
        ' Edge drill: maximum-density input where every substring is a palindrome; verify the n(n+1)/2 behavior.',
      inputs: EDGE_INPUTS,
      hints: [
        'A single character is always a palindrome; on all-same input every window matches.',
        'Count per center instead of enumerating all O(n^2) pairs explicitly.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial nesting',
      intent: INTENT_ADVERSARIAL,
      title: 'Palindromic Substrings — Nested Even Drill (counting drill)',
      statement:
        STATEMENT_BASE +
        ' Adversarial same-task drill: nested even palindrome ("abccba") plus a double-pair trap ("aabbaa"); odd-only expansions undercount both.',
      inputs: ADVERSARIAL_INPUTS,
      hints: [
        'Run BOTH parities per center: the even gap after each character catches "cc" and "abba" shapes.',
        'Track the running total across all 2n-1 middles; each window is counted exactly once.',
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
  oracle: 'bruteCountPalindromes (enumerate every substring; expand-around-center used only in walkthrough)',
})
