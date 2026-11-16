/**
 * palindrome-partitioning — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `palindrome-partitioning`
 * (Palindrome Partitioning, Medium). Judgeable YES: the live record
 * (plugin/data/shard-5.json) carries judge tests with signature
 *   partition(s: string) -> string[][], mode exact,
 * and the forge `SIGNATURE` below equals that live judge signature exactly.
 * Every expected value is computed at build time by indepPartition below
 * (center-expansion palindrome table + iterative explicit stack — a different
 * mechanism from the walkthrough's recursive DFS with on-the-fly checks),
 * cross-checked against refPartition (the taught recursion); both must agree.
 *
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs (resolved from the staged seeded run for stability); the rule
 * and the string[][] output type are unchanged everywhere. Official examples
 * "aab"/"a" are never reused as drill inputs.
 *
 * Staged source: .workers/jobs/question-owners-150/palindrome-partitioning/practice.js
 * (oracles, seeded rows, statements); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw literal strings ('"bba"'); `expected` is the literal the judge compares.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from tests[0].
 * - `mode` is 'exact'. `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'palindrome-partitioning'
export const SIGNATURE = Object.freeze({
  name: 'partition',
  params: Object.freeze([{ name: 's', type: 'string' }]),
  return: 'string[][]',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different strings so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same task on adversarial inputs that stress the search; the rule is unchanged.'

function isPalRange(s, left, right) {
  while (left < right) {
    if (s[left] !== s[right]) return false
    left += 1
    right -= 1
  }
  return true
}

/** Taught reference: recursive DFS with on-the-fly palindrome checks. */
export function refPartition(s) {
  const out = []
  const path = []
  const dfs = (start) => {
    if (start === s.length) {
      out.push(path.slice())
      return
    }
    for (let end = start; end < s.length; end += 1) {
      if (!isPalRange(s, start, end)) continue
      path.push(s.slice(start, end + 1))
      dfs(end + 1)
      path.pop()
    }
  }
  dfs(0)
  return out
}

/** INDEPENDENT oracle: center-expansion table + iterative explicit stack. */
export function indepPartition(s) {
  const n = s.length
  const table = Array.from({ length: n }, () => Array(n).fill(false))
  for (let center = 0; center < n; center += 1) {
    for (const [dl, dr] of [[0, 0], [0, 1]]) {
      let l = center + dl
      let r = center + dr
      while (l >= 0 && r < n && s[l] === s[r]) {
        table[l][r] = true
        l -= 1
        r += 1
      }
    }
  }
  const out = []
  const stack = [{ start: 0, end: 0, path: [] }]
  while (stack.length > 0) {
    const top = stack[stack.length - 1]
    if (top.start === n) {
      out.push(top.path)
      stack.pop()
      continue
    }
    if (top.end >= n) {
      stack.pop()
      continue
    }
    const e = top.end
    top.end += 1
    if (table[top.start][e]) {
      stack.push({ start: e + 1, end: e + 1, path: top.path.concat([s.slice(top.start, e + 1)]) })
    }
  }
  return out
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

function toTests(rows) {
  return rows.map((s) => {
    const expected = indepPartition(s)
    const ref = refPartition(s)
    if (JSON.stringify(ref) !== JSON.stringify(expected)) {
      throw new Error('oracle disagreement on ' + JSON.stringify(s))
    }
    return { args: [JSON.stringify(s)], expected: JSON.stringify(expected) }
  })
}

function buildVariant({ id, seedLabel, intent, title, statement, rows, hints }) {
  const tests = toTests(rows)
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

export function buildPalindromePartitioningPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh strings',
      intent: INTENT_SAME,
      title: 'Palindrome Partitioning — Fresh Strings (same task)',
      statement:
        'Generated drill: given a string s, partition s so every piece is a palindrome, and return all possible partitions. These generated fresh inputs have 2 to 5 lowercase letters; some admit several partitions and some admit only one.',
      rows: ['bba', 'ababa', 'caa', 'abca'],
      hints: [
        'From each start, extend the end only while s[start..end] is a palindrome, then recurse after it.',
        'Record a copy of the current pieces when the start reaches the end of the string.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Palindrome Partitioning — Edge Cases (same task)',
      statement:
        'Generated drill: same palindrome-partitioning task on boundary inputs — a two-letter repeat, a two-letter non-palindrome, a whole-string palindrome, a four-letter repeat with 8 partitions, and a nested palindrome. Return every valid partition for each.',
      rows: ['aa', 'ab', 'aba', 'aaaa', 'abcba'],
      hints: [
        'A string with no multi-letter palindrome still has exactly one partition: all single letters.',
        'Repeated letters multiply the answer count; "aaaa" already yields 8 partitions.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'dense inputs, same task',
      intent: INTENT_ADVERSARIAL,
      title: 'Palindrome Partitioning — Dense Inputs (transfer)',
      statement:
        'Generated drill, SAME TASK, harder inputs: partition s into palindromes and return all partitions — the rule and the string[][] output type are unchanged. These generated adversarial strings are palindrome-dense ("aaaaa" has 16 partitions, "aaaaaa" has 32), so the search must enumerate every answer without duplicates or leaks between branches.',
      rows: ['aaaaa', 'aaaaaa', 'aabaa', 'ababa'],
      hints: [
        'Enumerate ends in increasing order and copy the path at every complete cover to keep the official order.',
        'The shared path must be popped after each recursive call, or pieces leak into sibling partitions.',
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
  oracle: 'indepPartition (center-expansion table + explicit stack; walkthrough uses recursive DFS)',
})
