/**
 * jump-game-ii — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `jump-game-ii`
 * (Jump Game II, Medium, jump(int[])->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Seeded RNG (mulberry32 over FNV-1a of the slug); every expected value is
 * computed at build time by jumpGameIIOracle below (BFS over jump levels),
 * an INDEPENDENT implementation of the same operation (not the walkthrough's
 * greedy window expansion: the walkthrough keeps jumps/end/far and commits one
 * jump per window edge, while the oracle expands whole BFS levels and never
 * tracks a window). A bottom-up DP cross-checks every expected value.
 *
 * Staged source: .workers/jobs/question-owners-150/jump-game-ii/jump-game-ii.variants.mjs
 * (statements, hints, oracles) — reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time. All three
 * sets are the SAME task (no twist): identical signature, identical question —
 * v3 is adversarial same-task shapes only.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (mode 'exact').
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'jump-game-ii'
export const SIGNATURE = Object.freeze({
  name: 'jump',
  params: Object.freeze([{ name: 'nums', type: 'int[]' }]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the window reasoning.'
export const INTENT_EDGE = 'Same task with the boundary inputs the statement hides.'
export const INTENT_ADVERSARIAL = 'Same question with adversarial shapes that punish single-landing greed.'

/**
 * INDEPENDENT oracle: BFS over jump levels (nothing shared with greedy).
 * Level k holds every index reachable in k jumps; the first level touching
 * the last index uses the fewest jumps. Different method from the walkthrough
 * (greedy single pass: jumps/end/far window expansion counting only at edges).
 */
export function jumpGameIIOracle(nums) {
  if (nums.length <= 1) return 0
  let level = new Set([0])
  const seen = new Set([0])
  let jumps = 0
  while (level.size > 0) {
    jumps += 1
    const next = new Set()
    for (const i of level) {
      for (let j = i + 1; j <= Math.min(i + nums[i], nums.length - 1); j += 1) {
        if (j === nums.length - 1) return jumps
        if (!seen.has(j)) {
          seen.add(j)
          next.add(j)
        }
      }
    }
    level = next
  }
  throw new Error('unreachable input: ' + JSON.stringify(nums))
}

/** Cross-check oracle: bottom-up DP from the right, O(n^2). */
export function jumpGameIIDPOracle(nums) {
  const n = nums.length
  if (n <= 1) return 0
  const dp = new Array(n).fill(Infinity)
  dp[n - 1] = 0
  for (let i = n - 2; i >= 0; i -= 1) {
    const reach = Math.min(i + nums[i], n - 1)
    for (let j = i + 1; j <= reach; j += 1) dp[i] = Math.min(dp[i], 1 + dp[j])
  }
  return dp[0]
}

function hashText(text) {
  const source = String(text)
  let hash = 2166136261 >>> 0
  for (let i = 0; i < source.length; i += 1) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619) >>> 0
  return hash
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1))
}

function argLiteral(value) {
  return '[' + value.join(',') + ']'
}

function outLiteral(value) {
  return String(value)
}

function inputLine(signature, args) {
  return signature.params.map((param, index) => `${param.name} = ${args[index]}`).join(', ')
}

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  }
}

/** Random reachable array: rejection-sample with the BFS oracle. */
function reachableArray(rng, length, maxStep) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const nums = []
    for (let i = 0; i < length; i += 1) nums.push(randInt(rng, 1, maxStep))
    nums[length - 1] = randInt(rng, 0, maxStep)
    try {
      jumpGameIIOracle(nums)
      return nums
    } catch {
      /* unreachable draw — retry */
    }
  }
  const nums = new Array(length).fill(1)
  nums[0] = length - 1
  return nums
}

function buildVariant({ id, seedLabel, intent, title, statement, rows, hints }) {
  const tests = rows
    .map((nums) => {
      const expected = outLiteral(jumpGameIIOracle(nums))
      const check = jumpGameIIDPOracle(nums)
      if (String(check) !== String(expected)) throw new Error('oracle disagreement on ' + JSON.stringify(nums))
      return { args: [argLiteral(nums)], expected }
    })
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

export function buildJumpGameIIVariants() {
  const rng = mulberry32(hashText(SLUG))

  const fresh = []
  for (let k = 0; k < 4; k += 1) {
    fresh.push(reachableArray(rng, randInt(rng, 5, 8), 4))
  }

  const edge = [[0], [1, 1], [2, 0, 0], [1, 2, 0, 1]]

  const adversarial = [
    [1, 1, 1, 1, 1, 1],
    [5, 1, 1, 1, 1, 1],
    [3, 0, 0, 1, 4],
    [2, 3, 1, 1, 4],
  ]

  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh arrays',
      intent: INTENT_SAME,
      title: 'Jump Game II — fresh arrays (generated)',
      statement:
        'You are given a 0-indexed array nums where nums[i] is the maximum forward jump length from i. Return the minimum number of jumps to reach the last index. Every generated case is reachable and uses 5 to 8 elements with steps between 1 and 4.',
      rows: fresh,
      hints: [
        'Track the farthest index reachable from the whole current window, not from one landing.',
        'Spend a jump only when the scan reaches the window edge, then extend the window to that farthest reach.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Jump Game II — edge cases (generated)',
      statement:
        'Same minimum-jumps task with the boundary inputs. A single element needs 0 jumps, a two-element array needs 1, and short arrays may contain zeros in the middle. Every case is reachable; return the minimum jump count exactly.',
      rows: edge,
      hints: [
        'Length 1 is already the destination, so the answer is 0 with no scan.',
        'The scan stops at index n - 2 because landing on the last index ends the walk.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial shapes',
      intent: INTENT_ADVERSARIAL,
      title: 'Jump Game II — adversarial shapes (generated)',
      statement:
        'Same minimum-jumps question, no rule change. Flat corridors of 1s need one jump per step, a big opener tempts a one-jump answer that still needs a second landing, and zeros punish picking the farthest single landing instead of the farthest window coverage. Return the minimum jump count exactly.',
      rows: adversarial,
      hints: [
        'Jumping to the index with the biggest nums[i] can strand you behind a zero.',
        'The window edge rule survives every shape here: count a jump only when the scan reaches the current window end.',
      ],
    }),
  ]
}

export const buildVariants = buildJumpGameIIVariants

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'jumpGameIIOracle (BFS levels; walkthrough uses greedy window expansion with jumps/end/far)',
})
