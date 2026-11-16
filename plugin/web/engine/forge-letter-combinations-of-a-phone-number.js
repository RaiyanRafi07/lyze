/**
 * letter-combinations-of-a-phone-number — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug
 * `letter-combinations-of-a-phone-number` (Letter Combinations of a Phone
 * Number, Medium). Judgeable YES: the live record (plugin/data/shard-5.json)
 * carries judge tests with signature
 *   letterCombinations(digits: string) -> string[], mode unordered,
 * and the forge `SIGNATURE` below equals that live judge signature exactly.
 * Every expected value is computed at build time by oracleLetterCombinations
 * below (iterative BFS expansion — NOT the walkthrough's recursive DFS), so
 * producer/validator never share code.
 *
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs (resolved from the staged seeded run for stability). All three
 * sets are SAME-TASK (no output-type twist); v3 is honestly labeled
 * adversarial shapes, not a rule change. Official examples "23"/""/"2" are
 * never reused as drill inputs (seen-set excludes them).
 *
 * Staged source: .workers/jobs/neetcode150-completion/letter-combinations-of-a-phone-number/practice.letter-combinations-of-a-phone-number.mjs
 * (signature guard, BFS oracle, seeded rows); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw literal strings ('"22"'); `expected` is the literal the judge compares.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from tests[0].
 * - `mode` is 'unordered'. `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'letter-combinations-of-a-phone-number'
export const SIGNATURE = Object.freeze({
  name: 'letterCombinations',
  params: Object.freeze([{ name: 'digits', type: 'string' }]),
  return: 'string[]',
})
export const MODE = 'unordered'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different digits so you reproduce the branching.'
export const INTENT_EDGE = 'Same task with the edge cases the statement hides.'
export const INTENT_ADVERSARIAL = 'Same question with adversarial shapes that punish shared-path bugs.'

const KEYS = { 2: 'abc', 3: 'def', 4: 'ghi', 5: 'jkl', 6: 'mno', 7: 'pqrs', 8: 'tuv', 9: 'wxyz' }

/** INDEPENDENT oracle: iterative BFS expansion (NOT the recursive DFS). */
export function oracleLetterCombinations(digits) {
  if (typeof digits !== 'string' || digits.length === 0) return []
  let out = ['']
  for (const d of digits) {
    const letters = KEYS[d]
    if (!letters) return []
    const next = []
    for (const prefix of out) for (const c of letters) next.push(prefix + c)
    out = next
  }
  return out
}

const argLiteral = (s) => JSON.stringify(s)
const outLiteral = (arr) => '[' + arr.map((s) => JSON.stringify(s)).join(',') + ']'

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

function buildVariant({ id, seedLabel, intent, title, statement, digitsList, hints }) {
  const tests = digitsList
    .map((d) => ({ args: [argLiteral(d)], expected: outLiteral(oracleLetterCombinations(d)) }))
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

export function buildLetterCombinationsPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh digits',
      intent: INTENT_SAME,
      title: 'Letter Combinations — Fresh Digits (same task)',
      statement:
        'Given a string digits of length 0 to 4 where each character is in the range 2 to 9, return all possible letter combinations in any order. Letters follow the telephone keypad; 7 and 9 map to four letters each. These fresh inputs use two to three digits and avoid the official examples.',
      digitsList: ['22', '82', '83', '473'],
      hints: [
        'Branch on position index: loop over every letter of the current digit, recurse at index + 1.',
        'Copy the finished path when index reaches the end; un-choose the last letter after recursing.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Letter Combinations — Edge Cases (same task)',
      statement:
        'Same letter-combinations task with the boundary inputs. Digits may be empty (answer []), a single digit, or a pair drawn from the four-letter digits 7 and 9. Return every combination in any order.',
      digitsList: ['', '2', '79', '7'],
      hints: [
        'An empty digits string yields zero combinations, not one empty string.',
        'Digits 7 and 9 each branch four ways, so "79" already yields 16 combinations.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial shapes',
      intent: INTENT_ADVERSARIAL,
      title: 'Letter Combinations — Adversarial Shapes (transfer)',
      statement:
        'SAME-TASK adversarial drill (no rule change): longer and mixed-branch inputs stress the path copy and the un-choose step. Given digits of length 0 to 4 over 2 to 9, return all letter combinations in any order. Uniform four-letter runs and mixed 3/4-letter runs expose leaked-path and wrong-size keypad bugs.',
      digitsList: ['777', '228', '79', '234'],
      hints: [
        'A uniform run like "777" needs 64 combinations; a shared mutable path without copying collapses them.',
        'Mixed runs like "228" need 27 combinations: 3 x 3 x 3 with no four-letter digit involved.',
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
  oracle: 'oracleLetterCombinations (iterative BFS expansion; walkthrough uses recursive DFS)',
})
