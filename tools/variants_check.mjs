/**
 * LeetCode Lab — variant forge check.
 *
 * Run:  node tools/variants_check.mjs            (needs the plugin API on 127.0.0.1:64289)
 *       node tools/variants_check.mjs --base http://127.0.0.1:64289
 *
 * What it proves, per representative slug:
 *   1. `buildVariants` returns exactly 3 variants, stable across two calls (seeded).
 *   2. Shape invariants hold: ids v1/v2/v3, same signature as the original problem,
 *      every `tests[i].args.length === signature.params.length`, one example that is
 *      literally `tests[0]`, 3-5 tests, 2 hints, a known mode.
 *   3. Each variant is solvable: an independent reference solution, written inline below,
 *      reproduces every `expected` value exactly.
 *   4. Unsupported patterns/shapes return [] instead of throwing.
 *
 * Then it proves the tests are judgeable end-to-end: a Java reference solution is POSTed to
 * the real judge API with an inline `problem.judge` object built from the variant, and every
 * case must pass. Four required variants (two-sum, binary-search, valid-parentheses,
 * merge-intervals) plus one v3 twist variant.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildVariants, SUPPORTED_PATTERNS } from '../plugin/web/engine/variants.js'
import { tryParseLiteral } from '../plugin/web/engine/parse.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(HERE, '..', 'plugin', 'data')
const BASE = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://127.0.0.1:64289'

const SLUGS = [
  'two-sum',
  'valid-parentheses',
  'best-time-to-buy-and-sell-stock',
  'climbing-stairs',
  'binary-search',
  'merge-intervals',
  'longest-substring-without-repeating-characters',
  'reverse-linked-list',
  'container-with-most-water',
]

/* --------------------------------------------------- independent reference solutions -- */

const pairIndices = (nums, target) => {
  const seen = new Map()
  for (let i = 0; i < nums.length; i += 1) {
    const needed = target - nums[i]
    if (seen.has(needed)) return [seen.get(needed), i]
    seen.set(nums[i], i)
  }
  return []
}

const pairValues = (nums, target) => {
  const pair = pairIndices(nums, target)
  if (pair.length !== 2) return []
  const a = nums[pair[0]]
  const b = nums[pair[1]]
  return a <= b ? [a, b] : [b, a]
}

const maxArea = (height) => {
  let best = 0
  for (let i = 0; i < height.length; i += 1) {
    for (let j = i + 1; j < height.length; j += 1) best = Math.max(best, Math.min(height[i], height[j]) * (j - i))
  }
  return best
}

const countMaxArea = (height) => {
  let best = 0
  let count = 0
  for (let i = 0; i < height.length; i += 1) {
    for (let j = i + 1; j < height.length; j += 1) {
      const area = Math.min(height[i], height[j]) * (j - i)
      if (area > best) {
        best = area
        count = 1
      } else if (area === best) count += 1
    }
  }
  return count
}

const longestUnique = (s) => {
  const last = new Map()
  let best = 0
  let start = 0
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i]
    if (last.has(ch) && last.get(ch) >= start) start = last.get(ch) + 1
    last.set(ch, i)
    best = Math.max(best, i - start + 1)
  }
  return best
}

const longestTwoDistinct = (s) => {
  const counts = new Map()
  let best = 0
  let start = 0
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i]
    counts.set(ch, (counts.get(ch) || 0) + 1)
    while (counts.size > 2) {
      const leaving = s[start]
      const next = counts.get(leaving) - 1
      if (next === 0) counts.delete(leaving)
      else counts.set(leaving, next)
      start += 1
    }
    best = Math.max(best, i - start + 1)
  }
  return best
}

const searchIndex = (nums, target) => {
  let lo = 0
  let hi = nums.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (nums[mid] === target) return mid
    if (nums[mid] < target) lo = mid + 1
    else hi = mid - 1
  }
  return -1
}

const insertPosition = (nums, target) => {
  let lo = 0
  let hi = nums.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (nums[mid] < target) lo = mid + 1
    else hi = mid
  }
  return lo + 1
}

const isValidBrackets = (s) => {
  const wanted = { ')': '(', ']': '[', '}': '{' }
  const stack = []
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') stack.push(ch)
    else if (!wanted[ch] || stack.pop() !== wanted[ch]) return false
  }
  return stack.length === 0
}

const validWithOneRemoval = (s) => {
  if (isValidBrackets(s)) return true
  for (let i = 0; i < s.length; i += 1) if (isValidBrackets(s.slice(0, i) + s.slice(i + 1))) return true
  return false
}

const robLinear = (nums) => {
  let prev = 0
  let current = 0
  for (const value of nums) {
    const next = Math.max(current, prev + value)
    prev = current
    current = next
  }
  return current
}

const robCircular = (nums) => {
  if (nums.length === 0) return 0
  if (nums.length === 1) return nums[0]
  return Math.max(robLinear(nums.slice(0, -1)), robLinear(nums.slice(1)))
}

const climbWays = (n) => {
  let a = 1
  let b = 1
  for (let step = 2; step <= n; step += 1) {
    const next = a + b
    a = b
    b = next
  }
  return b
}

const tripleStepWays = (n) => {
  const ways = [1, 1, 2]
  for (let step = 3; step <= n; step += 1) ways[step] = ways[step - 1] + ways[step - 2] + ways[step - 3]
  return ways[n]
}

const maxProfitOne = (prices) => {
  let floor = Infinity
  let best = 0
  for (const price of prices) {
    if (price < floor) floor = price
    else best = Math.max(best, price - floor)
  }
  return best
}

const maxProfitMany = (prices) => {
  let total = 0
  for (let i = 1; i < prices.length; i += 1) if (prices[i] > prices[i - 1]) total += prices[i] - prices[i - 1]
  return total
}

const reverseValues = (values) => values.slice().reverse()

const swapPairs = (values) => {
  const out = values.slice()
  for (let i = 0; i + 1 < out.length; i += 2) {
    const swap = out[i]
    out[i] = out[i + 1]
    out[i + 1] = swap
  }
  return out
}

const mergeTouching = (intervals) => {
  const rows = intervals.map((row) => [row[0], row[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const out = []
  for (const row of rows) {
    const last = out[out.length - 1]
    if (last && row[0] <= last[1]) last[1] = Math.max(last[1], row[1])
    else out.push([row[0], row[1]])
  }
  return out
}

const mergeStrict = (intervals) => {
  const rows = intervals.map((row) => [row[0], row[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const out = []
  for (const row of rows) {
    const last = out[out.length - 1]
    if (last && row[0] < last[1]) last[1] = Math.max(last[1], row[1])
    else out.push([row[0], row[1]])
  }
  return out
}

/**
 * Candidate reference solutions per (pattern, variant id). v1 and v2 keep the base task; v3
 * is the documented twist. dp-1d has an array shape with two canonical families (non-adjacent
 * selection and single-trade stock profit), so both are offered as candidates.
 */
function candidateSolvers(pattern, variantId, signature) {
  const firstType = signature.params[0] && signature.params[0].type
  switch (pattern) {
    case 'arrays-hashing':
      return variantId === 'v3' ? [pairValues] : [pairIndices]
    case 'two-pointers':
      return variantId === 'v3' ? [countMaxArea] : [maxArea]
    case 'sliding-window':
      return variantId === 'v3' ? [longestTwoDistinct] : [longestUnique]
    case 'binary-search':
      return variantId === 'v3' ? [insertPosition] : [searchIndex]
    case 'stack':
      return variantId === 'v3' ? [validWithOneRemoval] : [isValidBrackets]
    case 'dp-1d':
      if (firstType === 'int') return variantId === 'v3' ? [tripleStepWays] : [climbWays]
      return variantId === 'v3' ? [robCircular, maxProfitMany] : [robLinear, maxProfitOne]
    case 'linked-list':
      return variantId === 'v3' ? [swapPairs] : [reverseValues]
    case 'intervals':
      return variantId === 'v3' ? [mergeStrict] : [mergeTouching]
    default:
      return []
  }
}

/* ------------------------------------------------------------------------- helpers -- */

const failures = []
let passes = 0

function check(ok, label, detail) {
  if (ok) {
    passes += 1
    console.log(`PASS  ${label}${detail ? '  ' + detail : ''}`)
  } else {
    failures.push(label)
    console.log(`FAIL  ${label}${detail ? '  ' + detail : ''}`)
  }
}

function parseArg(raw) {
  const parsed = tryParseLiteral(raw)
  if (!parsed.ok) throw new Error(`cannot parse argument literal: ${raw}`)
  return parsed.value
}

function expectedOf(raw) {
  const parsed = tryParseLiteral(raw)
  if (!parsed.ok) throw new Error(`cannot parse expected literal: ${raw}`)
  return parsed.value
}

function inputLine(signature, args) {
  return signature.params.map((param, index) => `${param.name} = ${args[index]}`).join(', ')
}

function sentenceCount(text) {
  return String(text).split(/\.\s|\.$/).filter((part) => part.trim() !== '').length
}

/* Problem records: the live API first, the shard files as an offline fallback. */

let shardCache = null

function loadShards() {
  if (shardCache !== null) return shardCache
  shardCache = new Map()
  if (existsSync(DATA_DIR)) {
    for (const name of readdirSync(DATA_DIR)) {
      if (!/^shard-\d+\.json$/.test(name)) continue
      try {
        const shard = JSON.parse(readFileSync(join(DATA_DIR, name), 'utf8'))
        for (const problem of shard.problems || []) shardCache.set(problem.slug, problem)
      } catch {
        /* ignore a bad shard */
      }
    }
  }
  return shardCache
}

async function loadProblem(slug) {
  try {
    const response = await fetch(`${BASE}/leetcode-lab/api/problem/${slug}`, { signal: AbortSignal.timeout(8000) })
    if (response.ok) {
      const body = await response.json()
      if (body && body.ok && body.problem) return body.problem
    }
  } catch {
    /* fall through to disk */
  }
  return loadShards().get(slug) || null
}

/* ------------------------------------------------------------- variant validation -- */

function validateVariant(problem, variant, index) {
  const label = `${problem.slug} ${variant.id || 'v?'}`
  const expectedIds = ['v1', 'v2', 'v3']
  check(variant.id === expectedIds[index], `${label} id`, `expected ${expectedIds[index]}`)
  check(['Easy', 'Medium', 'Hard'].includes(variant.difficulty), `${label} difficulty`, variant.difficulty)
  check(['exact', 'unordered', 'float'].includes(variant.mode), `${label} mode`, variant.mode)
  check(typeof variant.seedLabel === 'string' && variant.seedLabel.length > 0 && variant.seedLabel.length <= 32, `${label} seedLabel`, variant.seedLabel)
  check(typeof variant.intent === 'string' && variant.intent.length >= 20, `${label} intent`)
  check(typeof variant.title === 'string' && variant.title.length > 0, `${label} title`)

  const signature = variant.signature || {}
  const original = problem.judge.signature
  check(
    signature.name === original.name &&
      signature.return === original.return &&
      JSON.stringify(signature.params) === JSON.stringify(original.params.map((p) => ({ name: p.name, type: p.type }))),
    `${label} signature preserved`,
    `${signature.name}(${(signature.params || []).map((p) => p.type).join(',')}) -> ${signature.return}`,
  )

  const params = signature.params || []
  check(Array.isArray(variant.tests) && variant.tests.length >= 3 && variant.tests.length <= 5, `${label} test count`, `${(variant.tests || []).length}`)
  let shapeOk = true
  for (const test of variant.tests || []) {
    if (!Array.isArray(test.args) || test.args.length !== params.length) shapeOk = false
    if (typeof test.expected !== 'string' || test.expected === '') shapeOk = false
  }
  check(shapeOk, `${label} args arity === ${params.length}`)
  check(Array.isArray(variant.hints) && variant.hints.length === 2 && variant.hints.every((h) => typeof h === 'string' && h.length > 8), `${label} two hints`)
  check(Array.isArray(variant.examples) && variant.examples.length >= 1 && variant.examples.length <= 2, `${label} examples`, `${(variant.examples || []).length}`)

  const example = (variant.examples || [])[0] || {}
  const firstTest = variant.tests[0]
  check(
    example.input === inputLine(signature, firstTest.args) && example.output === firstTest.expected && typeof example.explain === 'string',
    `${label} example === tests[0]`,
    example.input,
  )
  check(sentenceCount(variant.statement) >= 2 && sentenceCount(variant.statement) <= 6, `${label} statement length`, `${sentenceCount(variant.statement)} sentences`)

  // Independent reference solution must reproduce every expected literal.
  const candidates = candidateSolvers(problem.pattern, variant.id, signature)
  let solverPasses = 0
  let solverDetail = 'no candidate solver'
  for (const solve of candidates) {
    let allMatch = true
    for (const test of variant.tests) {
      let computed
      try {
        computed = solve(...test.args.map(parseArg))
      } catch {
        allMatch = false
        break
      }
      if (JSON.stringify(computed) !== JSON.stringify(expectedOf(test.expected))) {
        allMatch = false
        break
      }
    }
    if (allMatch) {
      solverPasses += 1
      solverDetail = `${variant.tests.length} cases via inline reference`
      break
    }
  }
  check(solverPasses > 0, `${label} solvable by inline reference`, solverDetail)
}

/* --------------------------------------------------------------------------- judge -- */

function post(path, body) {
  return fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  }).then((response) => response.json())
}

function javaTwoSum(variant) {
  return `class Solution {
    public int[] ${variant.signature.name}(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            Integer j = seen.get(target - nums[i]);
            if (j != null) return new int[]{j, i};
            seen.put(nums[i], i);
        }
        return new int[]{};
    }
}`
}

function javaTwoSumValues(variant) {
  return `class Solution {
    public int[] ${variant.signature.name}(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            Integer j = seen.get(target - nums[i]);
            if (j != null) {
                int a = nums[j], b = nums[i];
                return a <= b ? new int[]{a, b} : new int[]{b, a};
            }
            seen.put(nums[i], i);
        }
        return new int[]{};
    }
}`
}

function javaBinarySearch(variant) {
  return `class Solution {
    public int ${variant.signature.name}(int[] nums, int target) {
        int lo = 0, hi = nums.length - 1;
        while (lo <= hi) {
            int mid = (lo + hi) >>> 1;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }
}`
}

function javaValidParentheses(variant) {
  return `class Solution {
    public boolean ${variant.signature.name}(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(') stack.push(')');
            else if (c == '[') stack.push(']');
            else if (c == '{') stack.push('}');
            else if (stack.isEmpty() || stack.pop() != c) return false;
        }
        return stack.isEmpty();
    }
}`
}

function javaMergeIntervals(variant) {
  return `class Solution {
    public int[][] ${variant.signature.name}(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> merged = new ArrayList<>();
        for (int[] interval : intervals) {
            if (!merged.isEmpty() && interval[0] <= merged.get(merged.size() - 1)[1]) {
                merged.get(merged.size() - 1)[1] = Math.max(merged.get(merged.size() - 1)[1], interval[1]);
            } else {
                merged.add(new int[]{interval[0], interval[1]});
            }
        }
        return merged.toArray(new int[0][]);
    }
}`
}

const JUDGE_CASES = [
  { slug: 'two-sum', variantIndex: 0, code: javaTwoSum, note: 'two sum (hash map)' },
  { slug: 'binary-search', variantIndex: 0, code: javaBinarySearch, note: 'binary search' },
  { slug: 'valid-parentheses', variantIndex: 0, code: javaValidParentheses, note: 'valid parentheses (stack)' },
  { slug: 'merge-intervals', variantIndex: 0, code: javaMergeIntervals, note: 'merge intervals' },
  { slug: 'two-sum', variantIndex: 2, code: javaTwoSumValues, note: 'two sum v3 twist (values)' },
]

/** Negative control: a confidently wrong solution must be rejected by the generated tests. */
const JUDGE_NEGATIVES = [
  {
    slug: 'two-sum',
    variantIndex: 0,
    note: 'wrong answer must fail',
    code: (variant) => `class Solution {
    public int[] ${variant.signature.name}(int[] nums, int target) { return new int[]{9, 9}; }
}`,
  },
]

/* ---------------------------------------------------------------------------- run -- */

console.log(`-- variant shape checks (base ${BASE}) --`)
console.log(`supported patterns: ${SUPPORTED_PATTERNS.join(', ')}`)

for (const expected of ['arrays-hashing', 'two-pointers', 'sliding-window', 'binary-search', 'stack', 'dp-1d', 'linked-list', 'intervals']) {
  check(SUPPORTED_PATTERNS.includes(expected), `pattern registered: ${expected}`)
}

for (const slug of SLUGS) {
  const problem = await loadProblem(slug)
  if (!problem) {
    check(false, `${slug} loaded`, 'missing problem record')
    continue
  }
  const first = buildVariants(problem)
  const second = buildVariants(problem)
  check(first.length === 3, `${slug} returns 3 variants`, `${first.length}`)
  check(JSON.stringify(first) === JSON.stringify(second), `${slug} deterministic across two calls`)
  if (first.length !== 3) continue
  for (let i = 0; i < first.length; i += 1) validateVariant(problem, first[i], i)
}

// Unsupported / malformed input must be [] rather than a throw.
const unsupported = [
  ['daily-temperatures', 'monotonic-stack'],
  ['insert-interval', 'intervals (2-arg shape)'],
]
for (const [slug, why] of unsupported) {
  const problem = await loadProblem(slug)
  if (!problem) continue
  let result
  try {
    result = buildVariants(problem)
  } catch (error) {
    result = `threw: ${error.message}`
  }
  check(Array.isArray(result) && result.length === 0, `${slug} returns [] for ${why}`, Array.isArray(result) ? `${result.length}` : String(result))
}
check(buildVariants(null).length === 0, 'null record returns []')
check(buildVariants({}).length === 0, 'empty record returns []')

console.log('\n-- judge end-to-end (Java reference vs generated tests) --')
let judgePass = 0
let judgeFail = 0
for (const entry of JUDGE_CASES) {
  const problem = await loadProblem(entry.slug)
  if (!problem) {
    judgeFail += 1
    console.log(`FAIL  ${entry.slug} v${entry.variantIndex + 1}  missing problem record`)
    continue
  }
  const variant = buildVariants(problem)[entry.variantIndex]
  if (!variant) {
    judgeFail += 1
    console.log(`FAIL  ${entry.slug} v${entry.variantIndex + 1}  no variant generated`)
    continue
  }
  const slug = `variant-${entry.slug}-${entry.variantIndex + 1}`
  try {
    const result = await post('/leetcode-lab/api/judge', {
      lang: 'java',
      code: entry.code(variant),
      problem: {
        slug,
        title: variant.title,
        judge: { signature: variant.signature, tests: variant.tests, mode: variant.mode },
      },
    })
    const ok = result.ok === true
    if (ok) judgePass += 1
    else judgeFail += 1
    const detail = ok
      ? `${result.passed}/${result.total} cases · compile ${result.compile && result.compile.ms}ms · ${entry.note}`
      : `${result.error || 'failed'}${result.compile && result.compile.stderr ? ' :: ' + String(result.compile.stderr).split('\n')[0].slice(0, 160) : ''}${
          result.cases && result.cases.length ? ' :: ' + JSON.stringify(result.cases.filter((c) => !c.ok).slice(0, 1)) : ''
        }`
    console.log(`${ok ? 'PASS' : 'FAIL'}  java  ${slug.padEnd(34)}  ${detail}`)
    if (!ok) failures.push(`judge ${slug}`)
  } catch (error) {
    judgeFail += 1
    failures.push(`judge ${slug}`)
    console.log(`FAIL  java  ${slug.padEnd(34)}  transport: ${error.message} (is the plugin host running at ${BASE}?)`)
  }
}

console.log('\n-- judge negative controls (a wrong solution must be rejected) --')
for (const control of JUDGE_NEGATIVES) {
  const problem = await loadProblem(control.slug)
  const variant = problem ? buildVariants(problem)[control.variantIndex] : null
  if (!variant) {
    failures.push(`negative ${control.slug}`)
    console.log(`FAIL  java  ${control.slug}  missing variant`)
    continue
  }
  try {
    const result = await post('/leetcode-lab/api/judge', {
      lang: 'java',
      code: control.code(variant),
      problem: {
        slug: `variant-${control.slug}-${control.variantIndex + 1}`,
        title: variant.title,
        judge: { signature: variant.signature, tests: variant.tests, mode: variant.mode },
      },
    })
    const caught = result.ok === false && result.compile && result.compile.ok === true
    if (caught) passes += 1
    else failures.push(`negative ${control.slug}`)
    console.log(`${caught ? 'PASS' : 'FAIL'}  java  ${control.slug}  ${control.note}: ok=${result.ok} passed=${result.passed}/${result.total}`)
  } catch (error) {
    failures.push(`negative ${control.slug}`)
    console.log(`FAIL  java  ${control.slug}  transport: ${error.message}`)
  }
}

console.log(`\nTOTAL ${passes} variant checks passed, ${failures.length} failed; judge ${judgePass} passed, ${judgeFail} failed`)
if (failures.length > 0) {
  console.log('FAILURES:')
  for (const failure of failures) console.log('  - ' + failure)
  process.exit(1)
}
console.log('ALL GREEN')
process.exit(0)
