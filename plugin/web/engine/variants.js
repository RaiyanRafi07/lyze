/**
 * LeetCode Lab — variant forge.
 *
 * `buildVariants(problem)` turns one settled problem record into three practice variations
 * that reuse the original judge signature, so the same editor, the same method name and the
 * same parameter types compile unchanged:
 *
 *   v1  same pattern, fresh data      — reproduce the reasoning on new numbers
 *   v2  same pattern, hidden edge     — empty input, duplicates, negatives, ties, ...
 *   v3  same signature, a real twist  — values instead of indices, count instead of area,
 *                                       1-indexed answers, strict boundaries, circular input
 *
 * Every `expected` string is produced by a reference implementation in this file run on the
 * generated input, in exactly the literal shape the judge compares against (`[1,2]`, `true`,
 * `[[1,6]]`). Generation is seeded from the problem slug, so a slug always yields the same
 * three variants — no Math.random, no Date.
 *
 * Pure ES module: no DOM, no network, no dependencies. Any unsupported pattern, unsupported
 * signature shape or malformed record yields `[]`; nothing in here throws.
 */
import { parseExampleInput } from './parse.js'

/* -------------------------------------------------------------------- seeding -- */

/** FNV-1a over the slug — stable, tiny, no crypto dependency. */
function hashText(text) {
  const source = String(text)
  let hash = 2166136261 >>> 0
  for (let i = 0; i < source.length; i += 1) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619) >>> 0
  return hash
}

/** mulberry32: 32-bit seeded PRNG, identical output for identical seeds. */
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

function shuffled(rng, list) {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const swap = out[i]
    out[i] = out[j]
    out[j] = swap
  }
  return out
}

/** `count` distinct integers from [lo, hi], in random order. */
function sampleRange(rng, count, lo, hi) {
  const pool = []
  for (let value = lo; value <= hi; value += 1) pool.push(value)
  return shuffled(rng, pool).slice(0, Math.min(count, pool.length))
}

function clampInt(value, lo, hi, fallback) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.min(hi, Math.max(lo, Math.trunc(n))) : fallback
}

/* -------------------------------------------------------------------- literals -- */

function numLiteral(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(6)))
}

/** Literal for an *argument*: strings are quoted, everything else is a literal. */
function argLiteral(value) {
  if (typeof value === 'string') return JSON.stringify(value)
  return outLiteral(value)
}

/** Literal for an *expected output*: strings stay bare, exactly like the judge compares. */
function outLiteral(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return numLiteral(value)
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return '[' + value.map(outLiteral).join(',') + ']'
  return String(value)
}

function inputLine(signature, args) {
  return signature.params
    .map((param, index) => `${(param && param.name) || 'arg' + index} = ${args[index]}`)
    .join(', ')
}

/* ------------------------------------------------------------------- signature -- */

function isShape(signature, paramTypes, returnType) {
  if (!signature || !Array.isArray(signature.params)) return false
  if (signature.params.length !== paramTypes.length) return false
  for (let i = 0; i < paramTypes.length; i += 1) {
    const param = signature.params[i]
    if (!param || param.type !== paramTypes[i]) return false
  }
  return signature.return === returnType
}

function cloneSignature(signature) {
  const params = signature.params.map((param) => ({ name: param.name, type: param.type }))
  return { name: signature.name, params, return: signature.return }
}

/** Read the judge signature from a full shard record; null when it cannot be judged. */
function signatureOf(problem) {
  const judge = problem && problem.judge
  const signature = judge && judge.signature
  if (!signature || typeof signature.name !== 'string' || signature.name.trim() === '') return null
  if (!Array.isArray(signature.params) || signature.params.length === 0) return null
  const params = []
  for (const param of signature.params) {
    if (!param || typeof param.type !== 'string' || param.type.trim() === '') return null
    params.push({ name: String(param.name || 'arg' + params.length), type: param.type.trim() })
  }
  if (typeof signature.return !== 'string' || signature.return.trim() === '') return null
  return { name: signature.name.trim(), params, return: signature.return.trim() }
}

/* -------------------------------------------------------------- problem context -- */

/** First example’s parsed arguments — the original problem’s only real influence here. */
function exampleArgs(problem) {
  const examples = problem && Array.isArray(problem.examples) ? problem.examples : []
  for (let i = 0; i < examples.length && i < 3; i += 1) {
    const text = examples[i] && (examples[i].input || examples[i].raw)
    if (!text) continue
    const parsed = parseExampleInput(String(text))
    if (parsed && parsed.ok && parsed.args.length > 0) return parsed.args
  }
  return []
}

function exampleNumbers(problem) {
  for (const arg of exampleArgs(problem)) {
    if (Array.isArray(arg.value) && arg.value.length > 0 && arg.value.every((v) => typeof v === 'number')) return arg.value
  }
  return []
}

function titleOf(problem) {
  const raw = String((problem && (problem.title || problem.slug)) || 'Problem').trim()
  return raw.length > 46 ? raw.slice(0, 46).trim() + '…' : raw
}

function difficultyOf(problem) {
  const value = problem && problem.difficulty
  return value === 'Easy' || value === 'Medium' || value === 'Hard' ? value : 'Medium'
}

/* ------------------------------------------------------------------ variant shape -- */

function buildVariant(spec) {
  const tests = spec.tests.slice(0, 5).map((test) => ({ args: test.args.map(String), expected: String(test.expected) }))
  const first = tests[0]
  return {
    id: spec.id, seedLabel: spec.seedLabel, intent: spec.intent, difficulty: spec.difficulty,
    title: spec.title, statement: spec.statement, signature: cloneSignature(spec.signature),
    examples: [{ input: inputLine(spec.signature, first.args), output: first.expected, explain: '' }],
    tests, mode: spec.mode || 'exact', hints: spec.hints.slice(0, 2),
  }
}

/** Curried factory: `make(id, suffix, label, intent, statement, tests, mode, hints)`. */
function variantFactory(problem, signature, taskLabel) {
  const base = titleOf(problem)
  const difficulty = difficultyOf(problem)
  return function make(id, suffix, seedLabel, intent, statement, tests, mode, hints) {
    return buildVariant({
      id, seedLabel, intent, difficulty, title: base + ' — ' + suffix + ' (' + taskLabel + ')',
      statement, signature, tests, mode, hints,
    })
  }
}

/* One-sentence intents, shared by all patterns so the UI chips read consistently. */
const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
const INTENT_TWIST = 'Same signature, different question: the twist tests whether the idea transfers.'

/* ==================================================================== patterns == */

/* ------------------------------------------------------------- arrays-hashing (A) */

function pairIndices(nums, target) {
  const seen = new Map()
  for (let i = 0; i < nums.length; i += 1) {
    const needed = target - nums[i]
    if (seen.has(needed)) return [seen.get(needed), i]
    seen.set(nums[i], i)
  }
  return []
}

function pairValues(nums, target) {
  const pair = pairIndices(nums, target)
  if (pair.length !== 2) return []
  const a = nums[pair[0]]
  const b = nums[pair[1]]
  return a <= b ? [a, b] : [b, a]
}

/** Distinct values with exactly one pair summing to `target`, so the answer is unique. */
function uniquePairData(rng, count, lo, hi) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const nums = sampleRange(rng, count, lo, hi)
    if (nums.length < 2) break
    const i = randInt(rng, 0, nums.length - 2)
    const j = randInt(rng, i + 1, nums.length - 1)
    const target = nums[i] + nums[j]
    let pairs = 0
    for (let a = 0; a < nums.length; a += 1) {
      for (let b = a + 1; b < nums.length; b += 1) if (nums[a] + nums[b] === target) pairs += 1
    }
    if (pairs === 1) return { nums, target }
  }
  return { nums: [1, 2, 3, 5], target: 8 }
}

function buildHashingPair(problem, signature, rng) {
  if (!isShape(signature, ['int[]', 'int'], 'int[]')) return null
  const make = variantFactory(problem, signature, 'pair-sum drill')
  const size = clampInt(exampleNumbers(problem).length, 5, 9, 6)

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const data = uniquePairData(rng, n === 0 ? size : randInt(rng, 5, 9), 1, 60)
    v1.push({ args: [argLiteral(data.nums), String(data.target)], expected: outLiteral(pairIndices(data.nums, data.target)) })
  }
  const v2 = [
    { nums: [0, -3, 7, 2], target: 7 },
    { nums: [-5, -2, -1, -8], target: -10 },
    uniquePairData(rng, randInt(rng, 4, 6), -20, 0),
    uniquePairData(rng, randInt(rng, 5, 7), -15, 25),
  ].map((data) => ({ args: [argLiteral(data.nums), String(data.target)], expected: outLiteral(pairIndices(data.nums, data.target)) }))
  const v3 = []
  for (let n = 0; n < 4; n += 1) {
    const data = uniquePairData(rng, n === 0 ? 4 : randInt(rng, 4, 8), -20, 50)
    v3.push({ args: [argLiteral(data.nums), String(data.target)], expected: outLiteral(pairValues(data.nums, data.target)) })
  }

  return [
    make('v1', 'fresh numbers', 'fresh numbers', INTENT_SAME,
      'Same pattern, new numbers. You are given an array nums of distinct integers and an integer target; return the indices [i, j], with i < j, of the two values that add up to target. Exactly one such pair exists in every test.',
      v1, 'unordered',
      ['The partner each value needs is target minus that value.', 'Record the index of every value you have already walked past, then look each partner up directly.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'This time the numbers can be negative or zero and the matching pair may sit anywhere in the array. Given nums of 3 to 7 distinct integers and a target, return the indices [i, j], i < j, of the unique two values whose sum equals target. Exactly one pair exists in every test.',
      v2, 'unordered',
      ['Nothing in the lookup idea assumes positive values.', 'Negative targets work the same way — the complement you look up may itself be negative.']),
    make('v3', 'twist: values', 'twist, same signature', INTENT_TWIST,
      'Given nums of distinct integers and a target, return the two values themselves that add up to target, ordered smaller first as [a, b]. Do not return indices. Exactly one such pair exists in every test.',
      v3, 'exact',
      ['Find the pair exactly as before, then swap the indices for the values behind them.', 'The two returned values must be ordered, so compare them once before returning.']),
  ]
}

/* ---------------------------------------------------------------- two-pointers -- */

function maxArea(height) {
  let best = 0
  for (let i = 0; i < height.length; i += 1) {
    for (let j = i + 1; j < height.length; j += 1) {
      const area = Math.min(height[i], height[j]) * (j - i)
      if (area > best) best = area
    }
  }
  return best
}

function countMaxArea(height) {
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

/** Small heights with at least two pairs tied for the best area, so counting matters. */
function tiedAreaData(rng) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const length = randInt(rng, 4, 6)
    const height = []
    for (let i = 0; i < length; i += 1) height.push(randInt(rng, 1, 6))
    if (countMaxArea(height) >= 2) return height
  }
  return [1, 2, 2, 1]
}

function buildTwoPointersArea(problem, signature, rng) {
  if (!isShape(signature, ['int[]'], 'int')) return null
  const make = variantFactory(problem, signature, 'max-area drill')

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const length = randInt(rng, 5, 9)
    const height = []
    for (let i = 0; i < length; i += 1) height.push(randInt(rng, 1, 15))
    v1.push({ args: [argLiteral(height)], expected: outLiteral(maxArea(height)) })
  }
  const v2 = [[1, 1], [5, 5, 5, 5], [0, 0, 0, 0], [2, 9, 4, 7, 3]].map((height) => ({
    args: [argLiteral(height)],
    expected: outLiteral(maxArea(height)),
  }))
  const v3 = [[4, 4, 2, 1, 1], [2, 4, 4, 1, 1], tiedAreaData(rng), tiedAreaData(rng)].map((height) => ({
    args: [argLiteral(height)],
    expected: outLiteral(countMaxArea(height)),
  }))

  return [
    make('v1', 'fresh heights', 'fresh heights', INTENT_SAME,
      'You are given an array height where height[i] is the height of a vertical line at position i. Choosing two lines i < j forms a container holding min(height[i], height[j]) * (j - i) units of water. Return the largest amount of water any pair of lines can hold.',
      v1, 'exact',
      ['Widest pair first: the distance matters as much as the heights.', 'Moving the shorter line inward is the only move that can improve the area.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same container task with the boundary inputs. height may contain just two lines, all lines may be equal, and a line may have height 0. Return the largest area min(height[i], height[j]) * (j - i) over pairs i < j.',
      v2, 'exact',
      ['With only two lines there is exactly one pair to measure.', 'If every line has height 0 the best area is 0, which is a valid answer.']),
    make('v3', 'twist: count pairs', 'twist, same signature', INTENT_TWIST,
      'Twist: return how many pairs of lines (i < j) achieve the maximum area, not the area itself. If there are fewer than two heights, return 0. All heights are non-negative integers.',
      v3, 'exact',
      ['Find the best area first, then walk the pairs again counting matches.', 'For [4,4,2,1,1] three different pairs reach the same best area of 4.']),
  ]
}

/* --------------------------------------------------------------- sliding-window -- */

function longestUnique(s) {
  const last = new Map()
  let best = 0
  let start = 0
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i]
    if (last.has(ch) && last.get(ch) >= start) start = last.get(ch) + 1
    last.set(ch, i)
    if (i - start + 1 > best) best = i - start + 1
  }
  return best
}

function longestTwoDistinct(s) {
  const counts = new Map()
  let best = 0
  let start = 0
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i]
    counts.set(ch, (counts.get(ch) || 0) + 1)
    while (counts.size > 2) {
      const out = s[start]
      const next = counts.get(out) - 1
      if (next === 0) counts.delete(out)
      else counts.set(out, next)
      start += 1
    }
    if (i - start + 1 > best) best = i - start + 1
  }
  return best
}

function randomString(rng, length, alphabet) {
  let out = ''
  for (let i = 0; i < length; i += 1) out += alphabet[randInt(rng, 0, alphabet.length - 1)]
  return out
}

function buildSlidingWindowString(problem, signature, rng) {
  if (!isShape(signature, ['string'], 'int')) return null
  const make = variantFactory(problem, signature, 'unique-window drill')

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const s = randomString(rng, randInt(rng, 4, 12), 'abcde')
    v1.push({ args: [argLiteral(s)], expected: outLiteral(longestUnique(s)) })
  }
  const v2 = ['aaaa', '', 'a', 'ab', 'abcabcbb'].map((s) => ({ args: [argLiteral(s)], expected: outLiteral(longestUnique(s)) }))
  const v3 = []
  for (let n = 0; n < 4; n += 1) {
    const s = randomString(rng, randInt(rng, 4, 12), 'abc')
    v3.push({ args: [argLiteral(s)], expected: outLiteral(longestTwoDistinct(s)) })
  }

  return [
    make('v1', 'fresh strings', 'fresh strings', INTENT_SAME,
      'Given a string s of lowercase letters, return the length of the longest substring that contains no repeated character. A substring is a contiguous piece of s. The strings here are four to twelve characters long.',
      v1, 'exact',
      ['Grow a window on the right and shrink it from the left when a repeat appears.', 'Remember where each character was last seen instead of rescanning the window.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same task with the boundary strings. Given s of lowercase letters, return the length of the longest substring without a repeated character. The answer for an empty string is 0, and a string of one repeated letter has answer 1.',
      v2, 'exact',
      ['An empty string has no characters, so its longest unique substring is empty.', 'For "aaaa" any single "a" is the best you can do.']),
    make('v3', 'twist: two letters', 'twist, same signature', INTENT_TWIST,
      'Twist: return the length of the longest substring of s that contains at most two distinct characters. s uses only lowercase letters and may be empty. A substring with three different letters is too wide.',
      v3, 'exact',
      ['Track how many of each character are inside the window.', 'Shrink from the left until the window holds at most two distinct letters again.']),
  ]
}

/* ------------------------------------------------------------------ binary-search -- */

function binarySearchIndex(nums, target) {
  let lo = 0
  let hi = nums.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    if (nums[mid] === target) return mid
    if (nums[mid] < target) lo = mid + 1
    else hi = mid - 1
  }
  return -1
}

function lowerBound(nums, target) {
  let lo = 0
  let hi = nums.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (nums[mid] < target) lo = mid + 1
    else hi = mid
  }
  return lo
}

function sortedSearchData(rng, length, lo, hi) {
  const nums = sampleRange(rng, length, lo, hi).sort((a, b) => a - b)
  const present = rng() < 0.65
  if (present && nums.length > 0) return { nums, target: nums[randInt(rng, 0, nums.length - 1)] }
  return { nums, target: randInt(rng, lo - 5, hi + 5) }
}

function buildBinarySearchIndex(problem, signature, rng) {
  if (!isShape(signature, ['int[]', 'int'], 'int')) return null
  const make = variantFactory(problem, signature, 'sorted-search drill')

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const data = sortedSearchData(rng, randInt(rng, 5, 9), 0, 50)
    v1.push({ args: [argLiteral(data.nums), String(data.target)], expected: outLiteral(binarySearchIndex(data.nums, data.target)) })
  }
  const v2 = [
    { nums: [1, 2, 3, 4, 5], target: 6 },
    { nums: [], target: 3 },
    { nums: [5], target: 5 },
    { nums: [1, 3], target: 4 },
  ].map((data) => ({
    args: [argLiteral(data.nums), String(data.target)],
    expected: outLiteral(binarySearchIndex(data.nums, data.target)),
  }))
  const v3 = []
  for (let n = 0; n < 4; n += 1) {
    const data = sortedSearchData(rng, randInt(rng, 4, 8), 0, 40)
    v3.push({ args: [argLiteral(data.nums), String(data.target)], expected: String(lowerBound(data.nums, data.target) + 1) })
  }

  return [
    make('v1', 'fresh arrays', 'fresh arrays', INTENT_SAME,
      'Given a sorted array of distinct integers nums and a target, return the index where target appears, or -1 when it is missing. nums is sorted in ascending order. Search in logarithmic time rather than scanning.',
      v1, 'exact',
      ['Keep a low and a high boundary and halve the remaining range each step.', 'Stop when the boundaries cross — that is the -1 case.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same search with the boundary inputs. nums may be empty, hold a single value, or have the target below every element or above every element. Return the index of target, or -1 when it is not present.',
      v2, 'exact',
      ['An empty array can never contain the target.', 'A target below the first or above the last element must return -1, not 0 or length.']),
    make('v3', 'twist: insertion', 'twist, same signature', INTENT_TWIST,
      'Twist: return the 1-indexed position where target belongs in the sorted array — its own position when present, otherwise the position of the first larger value. If target is larger than every element, return nums.length + 1. nums is sorted ascending.',
      v3, 'exact',
      ['Find the first index whose value is not less than target, then add one.', 'For an empty array the answer is 1: target belongs at the front of an empty list.']),
  ]
}

/* ------------------------------------------------------------------------- stack -- */

const CLOSER = { ')': '(', ']': '[', '}': '{' }

function isValidBrackets(s) {
  const stack = []
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') stack.push(ch)
    else if (CLOSER[ch]) {
      if (stack.pop() !== CLOSER[ch]) return false
    } else return false
  }
  return stack.length === 0
}

function validWithOneRemoval(s) {
  if (isValidBrackets(s)) return true
  for (let i = 0; i < s.length; i += 1) {
    if (isValidBrackets(s.slice(0, i) + s.slice(i + 1))) return true
  }
  return false
}

function balancedBrackets(rng, pairs) {
  const openers = ['(', '[', '{']
  const closerOf = { '(': ')', '[': ']', '{': '}' }
  const stack = []
  let out = ''
  let remaining = pairs
  while (remaining > 0 || stack.length > 0) {
    const canOpen = remaining > 0
    const canClose = stack.length > 0
    const openNow = canOpen && (!canClose || rng() < 0.55)
    if (openNow) {
      const opener = openers[randInt(rng, 0, openers.length - 1)]
      stack.push(opener)
      out += opener
      remaining -= 1
    } else {
      out += closerOf[stack.pop()]
    }
  }
  return out
}

function bracketData(rng, pairs, balanced) {
  if (balanced) return balancedBrackets(rng, pairs)
  const chars = '()[]{}'
  let out = ''
  for (let i = 0; i < pairs * 2; i += 1) out += chars[randInt(rng, 0, chars.length - 1)]
  return out
}

function buildStackBrackets(problem, signature, rng) {
  if (!isShape(signature, ['string'], 'boolean')) return null
  const make = variantFactory(problem, signature, 'bracket-stack drill')

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const s = bracketData(rng, randInt(rng, 2, 4), n % 2 === 0)
    v1.push({ args: [argLiteral(s)], expected: outLiteral(isValidBrackets(s)) })
  }
  const v2 = ['([)]', '', '(', '()[]{}'].map((s) => ({ args: [argLiteral(s)], expected: outLiteral(isValidBrackets(s)) }))
  const v3 = []
  for (let n = 0; n < 4; n += 1) {
    let s
    if (n < 2) {
      const balanced = balancedBrackets(rng, randInt(rng, 2, 3))
      const cut = randInt(rng, 0, balanced.length - 1)
      s = balanced.slice(0, cut) + balanced.slice(cut + 1)
    } else if (n === 2) s = '((('
    else s = '())('
    v3.push({ args: [argLiteral(s)], expected: outLiteral(validWithOneRemoval(s)) })
  }

  return [
    make('v1', 'fresh brackets', 'fresh brackets', INTENT_SAME,
      'Given a string s containing only the characters ( ) [ ] { }, return true when every opening bracket is closed by the matching type in the correct order. An empty string is valid. Every closing bracket must match the most recent unclosed opening bracket.',
      v1, 'exact',
      ['A stack is the natural memory here: push openers, pop on closers.', 'The string is valid only when every pop matched and the stack ends empty.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same bracket check with the boundary strings. Given s, return true when it is a valid bracket sequence. The empty string is valid; a string with one unclosed opener or with crossed pairs such as ([)] is not.',
      v2, 'exact',
      ['Popping an empty stack already means a closer arrived with nothing to match.', 'Crossed pairs still fail even though both types are present.']),
    make('v3', 'twist: one removal', 'twist, same signature', INTENT_TWIST,
      'Twist: return true if removing at most one character can turn s into a valid bracket sequence. Removing nothing is allowed, so an already valid string counts. The empty string is valid. s contains only the characters ( ) [ ] { }.',
      v3, 'exact',
      ['First ask whether the string is already valid.', 'Otherwise try deleting each position once and re-run the stack check.']),
  ]
}

/* ------------------------------------------------------------------------ dp-1d -- */

function robLinear(nums) {
  let prev = 0
  let current = 0
  for (const value of nums) {
    const next = Math.max(current, prev + value)
    prev = current
    current = next
  }
  return current
}

function robCircular(nums) {
  if (nums.length === 0) return 0
  if (nums.length === 1) return nums[0]
  return Math.max(robLinear(nums.slice(0, -1)), robLinear(nums.slice(1)))
}

function climbWays(n) {
  let a = 1
  let b = 1
  for (let step = 2; step <= n; step += 1) {
    const next = a + b
    a = b
    b = next
  }
  return b
}

function tripleStepWays(n) {
  if (n <= 1) return 1
  const ways = [1, 1, 2]
  for (let step = 3; step <= n; step += 1) ways[step] = ways[step - 1] + ways[step - 2] + ways[step - 3]
  return ways[n]
}

function isStockLike(problem) {
  const text = String((problem && (problem.slug || '')) + ' ' + ((problem && problem.title) || ''))
  return /stock|profit|buy|sell|trad/i.test(text)
}

function maxProfitOne(prices) {
  let best = 0
  let floor = Infinity
  for (const price of prices) {
    if (price < floor) floor = price
    else if (price - floor > best) best = price - floor
  }
  return best
}

function maxProfitMany(prices) {
  let total = 0
  for (let i = 1; i < prices.length; i += 1) if (prices[i] > prices[i - 1]) total += prices[i] - prices[i - 1]
  return total
}

function buildDpArray(problem, signature, rng) {
  if (!isShape(signature, ['int[]'], 'int')) return null
  return isStockLike(problem) ? buildDpStock(problem, signature, rng) : buildDpRob(problem, signature, rng)
}

function buildDpStock(problem, signature, rng) {
  const make = variantFactory(problem, signature, 'stock-profit drill')

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const length = randInt(rng, 4, 9)
    const prices = []
    for (let i = 0; i < length; i += 1) prices.push(randInt(rng, 1, 30))
    v1.push({ args: [argLiteral(prices)], expected: outLiteral(maxProfitOne(prices)) })
  }
  const v2 = [[3, 5], [], [5, 3], [2, 2, 2]].map((prices) => ({ args: [argLiteral(prices)], expected: outLiteral(maxProfitOne(prices)) }))
  const v3 = [[], [7, 1, 5, 3, 6, 4], [1, 2, 3, 4, 5], [7, 6, 4, 3, 1]].map((prices) => ({
    args: [argLiteral(prices)],
    expected: outLiteral(maxProfitMany(prices)),
  }))

  return [
    make('v1', 'fresh prices', 'fresh prices', INTENT_SAME,
      'You are given an array prices where prices[i] is the price of a share on day i. Buy on one day and sell on a later day, at most once, and return the largest profit possible. Return 0 when no profitable trade exists.',
      v1, 'exact',
      ['Track the cheapest price seen so far, then compare today against it.', 'A falling series has no valid trade, so the answer there is 0.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same single-trade task with the boundary inputs. prices may be empty or hold a single day, in which case no trade is possible and the answer is 0. A strictly decreasing series also gives 0, and equal prices never produce profit.',
      v2, 'exact',
      ['Buying and selling must happen on different days.', 'For [3,5] the only trade gains 2; for [5,3] no later day beats day 0.']),
    make('v3', 'twist: many trades', 'twist, same signature', INTENT_TWIST,
      'Twist: you may complete as many trades as you like, buying and selling repeatedly, but you must sell before you buy again. Return the largest total profit. Return 0 when prices never rise.',
      v3, 'exact',
      ['Every increase between consecutive days can be collected independently.', 'With [7,1,5,3,6,4] the best total is 4 + 3 = 7.']),
  ]
}

function buildDpRob(problem, signature, rng) {
  const make = variantFactory(problem, signature, 'non-adjacent-sum drill')
  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const length = randInt(rng, 3, 8)
    const nums = []
    for (let i = 0; i < length; i += 1) nums.push(randInt(rng, 1, 30))
    v1.push({ args: [argLiteral(nums)], expected: outLiteral(robLinear(nums)) })
  }
  const v2 = [[3, 5], [7], [], [0, 0, 0, 0], [5, 5, 5]].map((nums) => ({ args: [argLiteral(nums)], expected: outLiteral(robLinear(nums)) }))
  const v3 = [[4, 9], [2, 7, 9, 3, 1], [1, 2, 3, 1], [6]].map((nums) => ({ args: [argLiteral(nums)], expected: outLiteral(robCircular(nums)) }))

  return [
    make('v1', 'fresh values', 'fresh values', INTENT_SAME,
      'You are given an array nums of non-negative integers representing amounts. Choose any subset of positions with no two chosen positions adjacent, and return the largest total you can collect. Positions are 0-based and adjacent means differing by exactly 1.',
      v1, 'exact',
      ['At each position decide between skipping it and taking it plus the best total from two positions back.', 'Carry the two previous best totals instead of a whole table.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same collection task with the boundary inputs. Given nums of non-negative integers, return the largest total with no two chosen positions adjacent. nums may be empty, in which case the answer is 0, or hold a single value, which is simply taken.',
      v2, 'exact',
      ['An empty array allows no collection at all.', 'With [3,5] you must choose one of the two values, not both.']),
    make('v3', 'twist: circle', 'twist, same signature', INTENT_TWIST,
      'Twist: the positions are arranged in a circle, so the first and last elements count as adjacent and cannot both be chosen. Return the largest total with no two chosen neighbours adjacent. A single-element array is its own answer.',
      v3, 'exact',
      ['Split into two ordinary line problems: one without the last element, one without the first.', 'Take the better of the two splits; a one-element array needs no split at all.']),
  ]
}

function buildDpInt(problem, signature, rng) {
  if (!isShape(signature, ['int'], 'int')) return null
  const make = variantFactory(problem, signature, 'step-count drill')

  const v1 = [randInt(rng, 2, 10), randInt(rng, 2, 10), randInt(rng, 2, 10), randInt(rng, 2, 10)].map((n) => ({
    args: [String(n)],
    expected: outLiteral(climbWays(n)),
  }))
  const v2 = [1, 2, 20, 30].map((n) => ({ args: [String(n)], expected: outLiteral(climbWays(n)) }))
  const v3 = [1, 2, 3, 12].map((n) => ({ args: [String(n)], expected: outLiteral(tripleStepWays(n)) }))

  return [
    make('v1', 'fresh sizes', 'fresh sizes', INTENT_SAME,
      'You are climbing a staircase with n steps, and each move climbs either 1 or 2 steps. Return the number of distinct sequences of moves that reach the top. n is between 2 and 10 in this run.',
      v1, 'exact',
      ['The last move either came from one step below or two steps below.', 'Two rolling variables are enough; you never need the whole table.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same staircase task with the boundary sizes. With moves of 1 or 2 steps, return the number of ways to climb n steps for n from 1 up to 30. For n = 1 there is exactly one way.',
      v2, 'exact',
      ['For n = 1 there is a single one-step move.', 'For n = 2 there are two ways: 1+1 and 2.']),
    make('v3', 'twist: three steps', 'twist, same signature', INTENT_TWIST,
      'Twist: each move climbs 1, 2 or 3 steps instead of 1 or 2. Return the number of distinct move sequences that reach the top of an n-step staircase. n is between 1 and 12 in this run.',
      v3, 'exact',
      ['Each total is the sum of the three totals below it.', 'For n = 4 the answer is 7: 1+1+1+1, 1+1+2, 1+2+1, 2+1+1, 2+2, 1+3, 3+1.']),
  ]
}

/* ------------------------------------------------------------------- linked-list -- */

function reverseValues(values) {
  return values.slice().reverse()
}

function swapPairValues(values) {
  const out = values.slice()
  for (let i = 0; i + 1 < out.length; i += 2) {
    const swap = out[i]
    out[i] = out[i + 1]
    out[i + 1] = swap
  }
  return out
}

function listData(rng, length, lo, hi) {
  return sampleRange(rng, length, lo, hi)
}

function buildLinkedListReverse(problem, signature, rng) {
  if (!isShape(signature, ['ListNode'], 'ListNode')) return null
  const make = variantFactory(problem, signature, 'list-rewire drill')

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const values = listData(rng, randInt(rng, 3, 7), 1, 99)
    v1.push({ args: [argLiteral(values)], expected: outLiteral(reverseValues(values)) })
  }
  const v2 = [[1, 2, 3, 4, 5, 6], [], [7], [3, 9]].map((values) => ({ args: [argLiteral(values)], expected: outLiteral(reverseValues(values)) }))
  const v3 = [[1, 2, 3, 4, 5], [1, 2], [1], []].map((values) => ({ args: [argLiteral(values)], expected: outLiteral(swapPairValues(values)) }))

  return [
    make('v1', 'fresh lists', 'fresh lists', INTENT_SAME,
      'You are given the head of a singly linked list of integers. Return the list with its nodes reversed, so the last value becomes the first. The original method name and node type are unchanged.',
      v1, 'exact',
      ['Walk the list once, flipping each next pointer as you go.', 'Save the next node before you overwrite the pointer, or you lose the rest of the list.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same reversal with the boundary lists. head may be empty (return an empty list), a single node (return it unchanged), or two nodes (they simply swap). Reversing a list of even length changes every position.',
      v2, 'exact',
      ['An empty list has no pointer to flip.', 'A single node is already its own reverse.']),
    make('v3', 'twist: swap pairs', 'twist, same signature', INTENT_TWIST,
      'Twist: swap every adjacent pair of values and return the resulting list. For example [1,2,3,4,5] becomes [2,1,4,3,5], and a final unpaired node stays where it is. An empty list stays empty.',
      v3, 'exact',
      ['Handle two nodes at a time and keep the node that follows the pair.', 'For an odd length the last node has no partner and keeps its place.']),
  ]
}

/* -------------------------------------------------------------------- intervals -- */

function mergeIntervals(intervals, strict) {
  const rows = intervals.map((row) => [Number(row[0]), Number(row[1])]).sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const out = []
  for (const row of rows) {
    const last = out[out.length - 1]
    const overlaps = last !== undefined && (strict ? row[0] < last[1] : row[0] <= last[1])
    if (overlaps) last[1] = Math.max(last[1], row[1])
    else out.push([row[0], row[1]])
  }
  return out
}

function intervalData(rng, count, startLo, startHi, lengthHi) {
  const out = []
  for (let i = 0; i < count; i += 1) {
    const start = randInt(rng, startLo, startHi)
    out.push([start, start + randInt(rng, 1, lengthHi)])
  }
  return shuffled(rng, out)
}

function buildIntervalsMerge(problem, signature, rng) {
  if (!isShape(signature, ['int[][]'], 'int[][]')) return null
  const make = variantFactory(problem, signature, 'interval-merge drill')

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const intervals = intervalData(rng, randInt(rng, 2, 5), 0, 12, 4)
    v1.push({ args: [argLiteral(intervals)], expected: outLiteral(mergeIntervals(intervals, false)) })
  }
  const v2 = [[[1, 10], [2, 3]], [], [[1, 4]], [[5, 7], [1, 3], [2, 4]]].map((intervals) => ({
    args: [argLiteral(intervals)],
    expected: outLiteral(mergeIntervals(intervals, false)),
  }))
  const v3 = [[[1, 3], [3, 5]], [[1, 4], [2, 3], [4, 6]], [[1, 2], [3, 4], [2, 3]]].map((intervals) => ({
    args: [argLiteral(intervals)],
    expected: outLiteral(mergeIntervals(intervals, true)),
  }))

  return [
    make('v1', 'fresh intervals', 'fresh intervals', INTENT_SAME,
      'Given a list of intervals [start, end], merge every pair that overlaps or touches. An interval ending at 3 counts as touching one that starts at 3, and single points are not part of the input. Return the merged intervals ordered by start.',
      v1, 'unordered',
      ['Sort by start before merging anything.', 'While the next start is within the current end, extend the current end instead of emitting a new interval.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same merge task with the boundary inputs. The list may be empty, hold a single interval, arrive unsorted, or contain one interval completely inside another. Return the merged intervals ordered by start; an empty list stays empty.',
      v2, 'unordered',
      ['An empty input produces an empty output, not a crash.', 'A nested interval only extends nothing — keep the outer end.']),
    make('v3', 'twist: strict overlap', 'twist, same signature', INTENT_TWIST,
      'Twist: merge only intervals that overlap by at least one unit. Intervals that merely share an endpoint, such as [1,3] and [3,5], must stay separate. Return the result ordered by start.',
      v3, 'unordered',
      ['Change the merge test from <= to <.', 'After merging, a later interval can still overlap the extended end, so keep comparing.']),
  ]
}

/* ------------------------------------------------------------------- registry -- */

const BUILDERS = {
  'arrays-hashing': [buildHashingPair],
  'two-pointers': [buildTwoPointersArea],
  'sliding-window': [buildSlidingWindowString],
  'binary-search': [buildBinarySearchIndex],
  stack: [buildStackBrackets],
  'dp-1d': [buildDpArray, buildDpInt],
  'linked-list': [buildLinkedListReverse],
  intervals: [buildIntervalsMerge],
}

function patternOf(problem) {
  const primary = problem && problem.pattern
  if (typeof primary === 'string' && primary !== '') return primary
  const list = problem && Array.isArray(problem.patterns) ? problem.patterns : []
  for (const candidate of list) if (typeof candidate === 'string' && candidate !== '') return candidate
  return ''
}

/**
 * Build three judge-ready practice variations for one problem record.
 *
 * @param {object} problem full shard record (see CONTRACTS.md §2)
 * @param {object} [options] reserved; accepted for forward compatibility
 * @returns {Array} exactly three variants, or [] when the pattern/shape is unsupported
 */
export function buildVariants(problem, options = {}) {
  void options
  try {
    if (!problem || typeof problem !== 'object') return []
    const signature = signatureOf(problem)
    if (!signature) return []
    const builders = BUILDERS[patternOf(problem)]
    if (!Array.isArray(builders) || builders.length === 0) return []
    const slug = String(problem.slug || problem.title || problem.id || 'problem')
    const rng = mulberry32(hashText(slug))
    for (const build of builders) {
      let variants = null
      try {
        variants = build(problem, signature, rng)
      } catch {
        variants = null
      }
      if (Array.isArray(variants) && variants.length === 3) return variants
    }
    return []
  } catch {
    return []
  }
}

/** Pattern ids this module can currently generate for (useful to the UI). */
export const SUPPORTED_PATTERNS = Object.freeze(Object.keys(BUILDERS))
