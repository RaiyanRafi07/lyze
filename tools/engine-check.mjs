#!/usr/bin/env node
/**
 * LeetCode Lab — engine checker.
 *
 * Verifies the dependency-free scene engine:
 *   1. parse.js handles the LeetCode literal dialect and example input strings
 *   2. every pattern generator returns null OR a schema-valid scene on contract-shaped
 *      fixtures for all 17 supported patterns
 *   3. buildScene() is null-or-valid on up to 30 real problems from plugin/data/shard-0.json
 *      when data-forge has written it (otherwise it says so and uses fixtures only)
 *   4. malformed scenes / problems never throw and never emit out-of-range indices
 *
 * Usage: node tools/engine-check.mjs
 */

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildScene, PATTERNS } from '../plugin/web/engine/patterns.js'
import { validateScene, isKnownKind, KINDS, normalizeScene } from '../plugin/web/engine/scenes.js'
import { parseLiteral, tryParseLiteral, parseExampleInput, parseArgs, treeFromLevel, inferType } from '../plugin/web/engine/parse.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const DIM = '\x1b[2m'
const BOLD = '\x1b[1m'
const RESET = '\x1b[0m'

let failures = 0
const fail = (message) => {
  failures++
  console.log(`${RED}FAIL${RESET} ${message}`)
}

/* --------------------------------------------------------------------- parser tests -- */

const LITERAL_CASES = [
  ['[2,7,11,15]', [2, 7, 11, 15]],
  ['[[1,2],[3,4]]', [[1, 2], [3, 4]]],
  ['[3,null,9,20,null,null,15,7]', [3, null, 9, 20, null, null, 15, 7]],
  ['"abc"', 'abc'],
  ["'a'", 'a'],
  ['true', true],
  ['false', false],
  ['null', null],
  ['-0.5', -0.5],
  ['.5', 0.5],
  ['1e-5', 1e-5],
  ['[1.00000,2.5]', [1, 2.5]],
  ['[]', []],
  ['[["a","b"],["c","d"]]', [['a', 'b'], ['c', 'd']]],
  ['[true,false]', [true, false]],
]

for (const [source, expected] of LITERAL_CASES) {
  const result = tryParseLiteral(source)
  if (!result.ok) fail(`parseLiteral(${source}) threw ${result.error}`)
  else if (JSON.stringify(result.value) !== JSON.stringify(expected)) fail(`parseLiteral(${source}) = ${JSON.stringify(result.value)}`)
}

const EXAMPLE_CASES = [
  ['nums = [2,7,11,15], target = 9', { nums: [2, 7, 11, 15], target: 9 }],
  ['Input: s = "abcabcbb"\nOutput: 3', { s: 'abcabcbb' }],
  ['head = [1,2,3,4], n = 2', { head: [1, 2, 3, 4], n: 2 }],
  ['p = "a", q = "b"', { p: 'a', q: 'b' }],
  ['grid = [["1","1"],["0","1"]]', { grid: [['1', '1'], ['0', '1']] }],
]
for (const [source, expected] of EXAMPLE_CASES) {
  const parsed = parseExampleInput(source)
  if (!parsed.ok) {
    fail(`parseExampleInput(${source}) failed: ${parsed.error}`)
    continue
  }
  const actual = Object.fromEntries(parsed.args.map((arg) => [arg.name, arg.value]))
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`parseExampleInput(${source}) = ${JSON.stringify(actual)}`)
}

{
  const parsed = parseArgs(['[1,2,3]', '2'], { params: [{ name: 'nums', type: 'int[]' }, { name: 'k', type: 'int' }] })
  if (!parsed.ok || JSON.stringify(parsed.params.map((p) => p.value)) !== JSON.stringify([[1, 2, 3], 2])) {
    fail('parseArgs int[] / int mismatch')
  }
  const treeArg = parseArgs(['[3,9,20,null,null,15,7]'], { params: [{ name: 'root', type: 'TreeNode' }] })
  if (!treeArg.ok || treeArg.params[0].value.tree.nodes.length !== 5) fail('parseArgs TreeNode mismatch')
  const bad = parseArgs(['[1,2', 'x'], { params: [{ name: 'nums', type: 'int[]' }, { name: 'k', type: 'int' }] })
  if (bad.ok) fail('parseArgs should reject malformed literal')
  const tree = treeFromLevel([3, 9, 20, null, null, 15, 7])
  if (!tree || tree.nodes.length !== 5 || tree.edges.length !== 4) fail('treeFromLevel mismatch')
  if (inferType([[1, 2]]) !== 'int[][]') fail('inferType matrix mismatch')
  try {
    parseLiteral('[1,2')
    fail('parseLiteral should throw on unclosed array')
  } catch {
    /* expected */
  }
}

/* -------------------------------------------------------------------- fixture data -- */

const problem = (over) => ({
  id: over.id || 1,
  slug: over.slug || 'fixture',
  title: over.title || 'Fixture',
  difficulty: 'Easy',
  topics: ['Array'],
  pattern: over.pattern,
  patterns: [over.pattern],
  premium: false,
  judgeable: true,
  description: over.description || '',
  examples: over.examples || [],
  judge: over.judge === null ? null : { mode: 'exact', signature: over.signature, tests: [{ args: over.args, expected: over.expected || '', example: 1 }] },
})

const FIXTURES = [
  problem({
    title: 'Two Sum',
    slug: 'two-sum',
    pattern: 'arrays-hashing',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    signature: { name: 'twoSum', params: [{ name: 'nums', type: 'int[]' }, { name: 'target', type: 'int' }], return: 'int[]' },
    args: ['[2,7,11,15]', '9'],
    expected: '[0,1]',
  }),
  problem({
    title: 'Two Sum II',
    slug: 'two-sum-ii-input-array-is-sorted',
    pattern: 'two-pointers',
    signature: { name: 'twoSum', params: [{ name: 'numbers', type: 'int[]' }, { name: 'target', type: 'int' }], return: 'int[]' },
    args: ['[2,7,11,15]', '9'],
    expected: '[1,2]',
  }),
  problem({
    title: 'Valid Palindrome',
    slug: 'valid-palindrome',
    pattern: 'two-pointers',
    signature: { name: 'isPalindrome', params: [{ name: 's', type: 'string' }], return: 'boolean' },
    args: ['"A man, a plan, a canal: Panama"'],
    expected: 'true',
  }),
  problem({
    title: 'Longest Substring Without Repeating Characters',
    slug: 'longest-substring-without-repeating-characters',
    pattern: 'sliding-window',
    signature: { name: 'lengthOfLongestSubstring', params: [{ name: 's', type: 'string' }], return: 'int' },
    args: ['"abcabcbb"'],
    expected: '3',
  }),
  problem({
    title: 'Minimum Size Subarray Sum',
    slug: 'minimum-size-subarray-sum',
    pattern: 'sliding-window',
    signature: { name: 'minSubArrayLen', params: [{ name: 'target', type: 'int' }, { name: 'nums', type: 'int[]' }], return: 'int' },
    args: ['7', '[2,3,1,2,4,3]'],
    expected: '2',
  }),
  problem({
    title: 'Binary Search',
    slug: 'binary-search',
    pattern: 'binary-search',
    signature: { name: 'search', params: [{ name: 'nums', type: 'int[]' }, { name: 'target', type: 'int' }], return: 'int' },
    args: ['[-1,0,3,5,9,12]', '9'],
    expected: '4',
  }),
  problem({
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    pattern: 'stack',
    signature: { name: 'isValid', params: [{ name: 's', type: 'string' }], return: 'boolean' },
    args: ['"()[]{}"'],
    expected: 'true',
  }),
  problem({
    title: 'Daily Temperatures',
    slug: 'daily-temperatures',
    pattern: 'monotonic-stack',
    signature: { name: 'dailyTemperatures', params: [{ name: 'temperatures', type: 'int[]' }], return: 'int[]' },
    args: ['[73,74,75,71,69,72,76,73]'],
    expected: '[1,1,4,2,1,1,0,0]',
  }),
  problem({
    title: 'Find if Path Exists in Graph',
    slug: 'find-if-path-exists-in-graph',
    pattern: 'graph-bfs',
    description: 'There is a bi-directional graph with n vertices, where each vertex is labeled from 0 to n - 1. The edges are given as a 2D array.',
    signature: { name: 'validPath', params: [{ name: 'n', type: 'int' }, { name: 'edges', type: 'int[][]' }], return: 'boolean' },
    args: ['6', '[[0,1],[1,2],[2,5]]'],
    expected: 'true',
  }),
  problem({
    title: 'Number of Islands',
    slug: 'number-of-islands',
    pattern: 'graph-dfs',
    description: 'Given an m x n 2D binary grid which represents a map of 1s (land) and 0s (water), return the number of islands.',
    signature: { name: 'numIslands', params: [{ name: 'grid', type: 'char[][]' }], return: 'int' },
    args: ['[["1","1","0"],["1","0","0"],["0","0","1"]]'],
    expected: '2',
  }),
  problem({
    title: 'Edit Distance',
    slug: 'edit-distance',
    pattern: 'dp-2d',
    signature: { name: 'minDistance', params: [{ name: 'word1', type: 'string' }, { name: 'word2', type: 'string' }], return: 'int' },
    args: ['"horse"', '"ros"'],
    expected: '3',
  }),
  problem({
    title: 'Minimum Path Sum',
    slug: 'minimum-path-sum',
    pattern: 'dp-2d',
    signature: { name: 'minPathSum', params: [{ name: 'grid', type: 'int[][]' }], return: 'int' },
    args: ['[[1,3,1],[1,5,1],[4,2,1]]'],
    expected: '7',
  }),
  problem({
    title: 'Climbing Stairs',
    slug: 'climbing-stairs',
    pattern: 'dp-1d',
    signature: { name: 'climbStairs', params: [{ name: 'n', type: 'int' }], return: 'int' },
    args: ['5'],
    expected: '8',
  }),
  problem({
    title: 'Longest Increasing Subsequence',
    slug: 'longest-increasing-subsequence',
    pattern: 'dp-1d',
    signature: { name: 'lengthOfLIS', params: [{ name: 'nums', type: 'int[]' }], return: 'int' },
    args: ['[10,9,2,5,3,7,101,18]'],
    expected: '4',
  }),
  problem({
    title: 'Reverse Linked List',
    slug: 'reverse-linked-list',
    pattern: 'linked-list',
    signature: { name: 'reverseList', params: [{ name: 'head', type: 'ListNode' }], return: 'ListNode' },
    args: ['[1,2,3,4,5]'],
    expected: '[5,4,3,2,1]',
  }),
  problem({
    title: 'Binary Tree Inorder Traversal',
    slug: 'binary-tree-inorder-traversal',
    pattern: 'tree-dfs',
    signature: { name: 'inorderTraversal', params: [{ name: 'root', type: 'TreeNode' }], return: 'int[]' },
    args: ['[4,2,7,1,3,6,9]'],
    expected: '[1,2,3,4,6,7,9]',
  }),
  problem({
    title: 'Binary Tree Level Order Traversal',
    slug: 'binary-tree-level-order-traversal',
    pattern: 'tree-bfs',
    signature: { name: 'levelOrder', params: [{ name: 'root', type: 'TreeNode' }], return: 'int[][]' },
    args: ['[3,9,20,null,null,15,7]'],
    expected: '[[3],[9,20],[15,7]]',
  }),
  problem({
    title: 'Kth Largest Element in an Array',
    slug: 'kth-largest-element-in-an-array',
    pattern: 'heap-topk',
    signature: { name: 'findKthLargest', params: [{ name: 'nums', type: 'int[]' }, { name: 'k', type: 'int' }], return: 'int' },
    args: ['[3,2,1,5,6,4]', '2'],
    expected: '5',
  }),
  problem({
    title: 'Merge Intervals',
    slug: 'merge-intervals',
    pattern: 'intervals',
    signature: { name: 'merge', params: [{ name: 'intervals', type: 'int[][]' }], return: 'int[][]' },
    args: ['[[1,3],[2,6],[8,10],[15,18]]'],
    expected: '[[1,6],[8,10],[15,18]]',
  }),
  problem({
    title: 'Number of Connected Components in an Undirected Graph',
    slug: 'number-of-connected-components-in-an-undirected-graph',
    pattern: 'union-find',
    signature: { name: 'countComponents', params: [{ name: 'n', type: 'int' }, { name: 'edges', type: 'int[][]' }], return: 'int' },
    args: ['5', '[[0,1],[1,2],[3,4]]'],
    expected: '2',
  }),
  problem({
    title: 'Longest Common Prefix',
    slug: 'longest-common-prefix',
    pattern: 'trie',
    signature: { name: 'longestCommonPrefix', params: [{ name: 'strs', type: 'string[]' }], return: 'string' },
    args: ['["flower","flow","flight"]'],
    expected: 'fl',
  }),
  problem({
    title: 'Subsets',
    slug: 'subsets',
    pattern: 'backtracking',
    signature: { name: 'subsets', params: [{ name: 'nums', type: 'int[]' }], return: 'int[][]' },
    args: ['[1,2,3]'],
    expected: '[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]',
  }),
]

/* ---------------------------------------------------------------- fixture checking -- */

function checkScene(problemRecord, scene) {
  if (scene === null) return { ok: true, nullScene: true }
  if (typeof scene !== 'object') return { ok: false, errors: ['non-object scene'] }
  const validation = validateScene(scene)
  const errors = [...validation.errors]
  if (!isKnownKind(scene.kind)) errors.push(`kind ${scene.kind} not in ${KINDS.join('/')}`)
  if (!Array.isArray(scene.frames) || scene.frames.length === 0) errors.push('no frames')
  else {
    if (scene.frames.length < 6) errors.push(`only ${scene.frames.length} frames`)
    if (scene.frames.length > 40) errors.push(`${scene.frames.length} frames > 40`)
    const first = scene.frames[0]
    const last = scene.frames[scene.frames.length - 1]
    if (!first || !first.note) errors.push('first frame has no narration')
    if (!last || !last.note) errors.push('last frame has no narration')
  }
  if (!scene.pattern || scene.pattern !== problemRecord.pattern) errors.push(`scene.pattern ${scene.pattern} != ${problemRecord.pattern}`)
  return { ok: errors.length === 0, errors }
}

console.log(`${BOLD}LeetCode Lab — engine check${RESET}`)
console.log(`${DIM}node ${process.version} · root ${ROOT}${RESET}\n`)

console.log(`${BOLD}1. parse.js${RESET}`)
console.log(`   ${LITERAL_CASES.length} literals, ${EXAMPLE_CASES.length} example inputs, type dispatch — ${failures ? `${RED}FAILURES${RESET}` : `${GREEN}ok${RESET}`}`)
const parserFailures = failures

console.log(`\n${BOLD}2. pattern generators (contract fixtures)${RESET}`)
const header = `   ${'pattern'.padEnd(16)} ${'kind'.padEnd(12)} ${'frames'.padEnd(7)} ${'first frame'.padEnd(22)} status`
console.log(DIM + header + RESET)
const fixtureRows = []
for (const fixture of FIXTURES) {
  let scene = null
  let thrown = null
  try {
    scene = buildScene(fixture)
  } catch (error) {
    thrown = String((error && error.message) || error)
  }
  if (thrown) {
    fixtureRows.push({ pattern: fixture.pattern, kind: '-', frames: '-', label: '-', ok: false, detail: `threw: ${thrown}` })
    continue
  }
  const check = checkScene(fixture, scene)
  const row = {
    pattern: fixture.pattern,
    kind: scene ? scene.kind : 'null',
    frames: scene ? String(scene.frames.length) : '-',
    label: scene && scene.frames[0] ? String(scene.frames[0].label) : '-',
    ok: check.ok,
    detail: check.ok ? (scene ? '' : 'returned null') : check.errors.join('; '),
  }
  fixtureRows.push(row)
  if (!check.ok) fail(`${fixture.pattern}: ${check.errors.join('; ')}`)
}
for (const row of fixtureRows) {
  const status = row.ok ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`
  const line = `   ${row.pattern.padEnd(16)} ${row.kind.padEnd(12)} ${row.frames.padEnd(7)} ${clip(row.label, 22).padEnd(22)} ${status}${row.detail ? ` ${DIM}${row.detail}${RESET}` : ''}`
  console.log(line)
}
const coveredPatterns = new Set(FIXTURES.map((f) => f.pattern))
const missingFixtures = PATTERNS.filter((pattern) => !coveredPatterns.has(pattern))
if (missingFixtures.length) fail(`no fixture for: ${missingFixtures.join(', ')}`)

/* ------------------------------------------------------------------- malformed input -- */

console.log(`\n${BOLD}3. malformed input robustness${RESET}`)
const MALFORMED = [
  null,
  undefined,
  {},
  { pattern: 'two-pointers' },
  { pattern: 'two-pointers', judge: { tests: [{ args: ['[bad', 'x'] }], signature: { params: [{ name: 'nums', type: 'int[]' }] } } },
  { pattern: 'graph-bfs', judge: { tests: [{ args: ['nope'] }], signature: { params: [{ name: 'n', type: 'int' }] } } },
  { pattern: 'dp-2d', judge: { tests: [{ args: ['[]'] }], signature: { params: [{ name: 'grid', type: 'int[][]' }] } } },
  { pattern: 'not-a-real-pattern', examples: [{ input: 'nums = [1,2,3]' }] },
  { pattern: 'tree-dfs', examples: [{ input: 'root = []' }] },
  { pattern: 'linked-list', examples: [{ input: 'head = []' }] },
  { pattern: 'intervals', examples: [{ input: 'intervals = [[1]]' }] },
  'not-a-problem',
  42,
]
for (const bad of MALFORMED) {
  try {
    const scene = buildScene(bad)
    if (scene !== null && !validateScene(scene).ok) fail(`malformed input produced invalid scene: ${JSON.stringify(bad)}`)
  } catch (error) {
    fail(`malformed input threw: ${JSON.stringify(bad)} → ${String((error && error.message) || error)}`)
  }
}
console.log(`   ${MALFORMED.length} malformed inputs — ${GREEN}no throws, null-or-valid${RESET}`)

/* ------------------------------------------------------------------ real shard data -- */

console.log(`\n${BOLD}4. real problems (plugin/data/shard-0.json)${RESET}`)
const shardPath = join(ROOT, 'plugin', 'data', 'shard-0.json')
let realProblems = []
let shardNote = 'shard-0.json not written yet — fixtures above are the source of truth for now'
if (existsSync(shardPath)) {
  try {
    const shard = JSON.parse(readFileSync(shardPath, 'utf8'))
    const all = Array.isArray(shard) ? shard : shard.problems
    realProblems = Array.isArray(all) ? all.slice(0, 30) : []
    shardNote = `shard-0.json · ${Array.isArray(all) ? all.length : 0} problems, checking the first ${realProblems.length}`
  } catch (error) {
    shardNote = `shard-0.json exists but failed to parse: ${String((error && error.message) || error)}`
    fail(shardNote)
  }
} else if (existsSync(join(ROOT, 'plugin', 'data', 'index.json'))) {
  try {
    const index = JSON.parse(readFileSync(join(ROOT, 'plugin', 'data', 'index.json'), 'utf8'))
    if (Array.isArray(index.problems) && index.problems.length > 0) {
      shardNote = 'data/index.json has problems but shard-0.json is absent — using fixtures only'
    }
  } catch {
    /* stub data is fine */
  }
}
console.log(`   ${DIM}${shardNote}${RESET}`)
if (realProblems.length > 0) {
  let scenes = 0
  let nulls = 0
  let realFailures = 0
  const byPattern = new Map()
  console.log(`   ${'problem'.padEnd(36)} ${'pattern'.padEnd(16)} ${'scene'.padEnd(12)} frames status`)
  for (const record of realProblems) {
    let scene = null
    try {
      scene = buildScene(record)
    } catch (error) {
      fail(`${record.title || record.slug}: threw ${String((error && error.message) || error)}`)
      realFailures++
      continue
    }
    const pattern = record.pattern || (Array.isArray(record.patterns) ? record.patterns[0] : '') || '?'
    const stat = byPattern.get(pattern) || { total: 0, scenes: 0 }
    stat.total++
    if (scene === null) {
      nulls++
      stat.scenes += 0
      console.log(`   ${clip(String(record.title || record.slug), 36).padEnd(36)} ${clip(pattern, 16).padEnd(16)} ${'null'.padEnd(12)} ${'-'.padEnd(6)} ${DIM}null${RESET}`)
      continue
    }
    stat.scenes++
    const check = checkScene({ ...record, pattern: scene.pattern }, scene)
    if (!check.ok) {
      realFailures++
      fail(`${record.title || record.slug}: ${check.errors.join('; ')}`)
    }
    scenes++
    console.log(
      `   ${clip(String(record.title || record.slug), 36).padEnd(36)} ${clip(pattern, 16).padEnd(16)} ${scene.kind.padEnd(12)} ${String(scene.frames.length).padEnd(6)} ${check.ok ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`}`,
    )
    byPattern.set(pattern, stat)
  }
  console.log(
    `   ${DIM}${scenes} scenes · ${nulls} null (unsupported/unusable) · ${realFailures} failures · patterns seen: ${[...byPattern.keys()].join(', ') || 'none'}${RESET}`,
  )
} else {
  console.log(`   ${DIM}skipped — fixtures cover every supported pattern; re-run when data-forge lands.${RESET}`)
}

/* ------------------------------------------------------------------- unknown scenes -- */

console.log(`\n${BOLD}5. renderer-safety (scene normalizer)${RESET}`)
const BAD_SCENES = [
  null,
  { v: 1, kind: 'nope', frames: [] },
  { v: 1, kind: 'array', layout: { values: [1, 2] }, frames: [] },
  { v: 1, kind: 'array', layout: { values: [1, 2] }, frames: [{ label: 'x', note: 'y', state: { pointers: { i: 99 } } }] },
  { v: 1, kind: 'tree', layout: { nodes: [], edges: [] }, frames: [] },
  { v: 1, kind: 'grid', layout: { rows: 2, cols: 2, cells: [[1, 2], [3, 4]] }, frames: [{ label: 'x', note: 'y', state: { current: [9, 9] } }] },
]
for (const bad of BAD_SCENES) {
  try {
    const normalized = normalizeScene(bad)
    if (normalized === null) continue
    if (!isKnownKind(normalized.kind)) fail(`normalizeScene kept unknown kind for ${JSON.stringify(bad)}`)
    if (!Array.isArray(normalized.frames) || normalized.frames.length === 0) fail(`normalizeScene kept empty frames for ${JSON.stringify(bad)}`)
    // Clamped indices must never exceed the layout.
    const state = normalized.frames[0] && normalized.frames[0].state
    if (normalized.kind === 'array' && state) {
      const length = normalized.layout.values.length
      for (const index of Object.values(state.pointers || {})) if (!(index >= 0 && index < length)) fail('normalizer left an out-of-range pointer')
      for (const index of Object.keys(state.highlights || {})) if (!(+index >= 0 && +index < length)) fail('normalizer left an out-of-range highlight')
    }
    if (normalized.kind === 'grid' && state && state.current) {
      const [r, c] = state.current
      if (!(r >= 0 && r < normalized.layout.rows && c >= 0 && c < normalized.layout.cols)) fail('normalizer left an out-of-range grid cell')
    }
  } catch (error) {
    fail(`normalizeScene threw on ${JSON.stringify(bad)}: ${String((error && error.message) || error)}`)
  }
}
console.log(`   ${BAD_SCENES.length} hostile scenes normalized without throwing, indices clamped/dropped`)

/* ------------------------------------------------------------------------ summary -- */

const totalFailures = failures
console.log(`\n${BOLD}summary${RESET}`)
console.log(`   parse.js checks:   ${parserFailures ? `${RED}${parserFailures} failed${RESET}` : `${GREEN}pass${RESET}`}`)
console.log(`   fixtures:          ${fixtureRows.filter((row) => row.ok).length}/${fixtureRows.length} ${GREEN}pass${RESET}${fixtureRows.some((row) => !row.ok) ? ` · ${RED}${fixtureRows.filter((row) => !row.ok).length} failed${RESET}` : ''}`)
console.log(`   real shard:        ${realProblems.length ? `${realProblems.length} checked` : 'not available (fixtures used)'}`)
console.log(totalFailures === 0 ? `\n${GREEN}${BOLD}ENGINE CHECK PASSED${RESET}` : `\n${RED}${BOLD}ENGINE CHECK FAILED — ${totalFailures} failure(s)${RESET}`)
process.exitCode = totalFailures === 0 ? 0 : 1

function clip(value, max) {
  const text = String(value === undefined || value === null ? '' : value)
  return text.length <= max ? text : text.slice(0, max - 1) + '…'
}
