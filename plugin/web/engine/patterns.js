/**
 * LeetCode Lab — pattern scene generators.
 *
 * `buildScene(problem, options)` runs the canonical algorithm for the problem's primary
 * pattern on the *actual first example input* and records the real intermediate state
 * (pointers, map contents, stack, visited sets, dp values) as scene frames.
 *
 * Pure + synchronous. Every failure path returns null — this module must never throw.
 * Unsupported patterns return null so the app can fall back to the AI scene bridge.
 */

import {
  clipText,
  arrayScene,
  stringScene,
  linkedListScene,
  treeScene,
  graphScene,
  gridScene,
  stackScene,
} from './scenes.js'
import * as P from './parse.js'

/* ------------------------------------------------------------------------- utilities -- */

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const isNumericArray = (v) => Array.isArray(v) && v.length > 0 && v.every(isNum)
const isStringArray = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string')
const isMatrix = (v) => Array.isArray(v) && v.length > 0 && v.every((row) => Array.isArray(row))

const PATTERN_IDS = Object.freeze([
  'two-pointers',
  'sliding-window',
  'binary-search',
  'arrays-hashing',
  'stack',
  'monotonic-stack',
  'graph-bfs',
  'graph-dfs',
  'dp-2d',
  'dp-1d',
  'linked-list',
  'tree-dfs',
  'tree-bfs',
  'heap-topk',
  'intervals',
  'union-find',
  'trie',
  'backtracking',
])

const GENERATORS = Object.create(null)

class Bag {
  constructor() {
    this.frames = []
  }
  add(label, note, state) {
    if (this.frames.length >= 39) return
    this.frames.push({ label: clipText(label, 40), note: clipText(note, 140), state: state || {} })
  }
  done(label, note, state) {
    this.frames.push({ label: clipText(label, 40), note: clipText(note, 140), state: state || {} })
    let frames = this.frames
    if (frames.length > 40) {
      const first = frames[0]
      const last = frames[frames.length - 1]
      const middle = frames.slice(1, -1)
      const cap = 38
      const kept = []
      if (middle.length <= cap) kept.push(...middle)
      else {
        for (let i = 0; i < cap; i++) kept.push(middle[Math.round((i * (middle.length - 1)) / (cap - 1))])
      }
      frames = [first, ...kept, last]
    }
    return frames.length >= 6 ? frames : null
  }
}

function primaryPattern(problem) {
  const direct = problem && typeof problem.pattern === 'string' ? problem.pattern : ''
  if (direct) return direct
  const list = problem && Array.isArray(problem.patterns) ? problem.patterns : []
  return typeof list[0] === 'string' ? list[0] : ''
}

function coercePatternParam(param, pattern) {
  const name = String(param.name || '').toLowerCase()
  if (pattern.startsWith('tree')) {
    if (param.value && typeof param.value === 'object' && param.value.tree) return param
    const treeishName = /root|tree|node|^p$|^q$|^t1$|^t2$/.test(name)
    if (Array.isArray(param.value) && !param.value.some(Array.isArray) && (param.type === 'TreeNode' || treeishName || param.type === 'unknown')) {
      const tree = P.treeFromLevel(param.value)
      if (tree) return { ...param, type: 'TreeNode', value: { tree, values: param.value.slice() } }
    }
  }
  if (pattern === 'linked-list') {
    if (param.value && typeof param.value === 'object' && Array.isArray(param.value.values) && !Array.isArray(param.value)) return param
    const listishName = /head|list|l1|l2|node/.test(name)
    if (Array.isArray(param.value) && !param.value.some(Array.isArray) && (param.type === 'ListNode' || listishName)) {
      const values = P.listFromValues(param.value)
      if (values.length) return { ...param, type: 'ListNode', value: { values } }
    }
  }
  return param
}

function extractParamSets(problem, pattern) {
  const sets = []
  try {
    const judge = isObj(problem.judge) ? problem.judge : null
    const sig = judge && isObj(judge.signature) ? judge.signature : null
    const tests = judge && Array.isArray(judge.tests) ? judge.tests : []
    const rawArgs = tests[0] && Array.isArray(tests[0].args) ? tests[0].args : null
    if (rawArgs && rawArgs.length > 0) {
      const declared = sig && Array.isArray(sig.params) ? sig.params : []
      const parsed = declared.length === rawArgs.length ? P.parseArgs(rawArgs, sig) : { ok: false, params: [] }
      if (parsed.ok && parsed.params.length > 0) {
        sets.push(parsed.params.map((p) => coercePatternParam(p, pattern)))
      }
    }
  } catch {
    /* judge path is best effort */
  }
  try {
    const sig = isObj(problem.judge) && isObj(problem.judge.signature) ? problem.judge.signature : null
    const examples = Array.isArray(problem.examples) ? problem.examples : []
    for (const example of examples) {
      if (!isObj(example)) continue
      const raw =
        typeof example.input === 'string' && example.input.trim()
          ? example.input
          : typeof example.example_text === 'string'
            ? example.example_text
            : ''
      if (!raw) continue
      const parsed = P.parseExampleArgs(raw, sig)
      if (parsed.ok && parsed.params.length > 0) {
        sets.push(parsed.params.map((p) => coercePatternParam(p, pattern)))
        break
      }
    }
  } catch {
    /* example path is best effort */
  }
  return sets
}

/* -------------------------------------------------------------- parameter accessors -- */

function findParam(params, predicate) {
  for (const param of params) {
    try {
      if (predicate(param)) return param
    } catch {
      /* skip */
    }
  }
  return null
}

function numbersParam(params, minLength = 1) {
  return findParam(params, (p) => isNumericArray(p.value) && p.value.length >= minLength && p.value.length <= 64)
}

function numberParam(params, minValue = -Infinity, maxValue = Infinity) {
  return findParam(params, (p) => isNum(p.value) && p.value >= minValue && p.value <= maxValue)
}

function stringParam(params, minLength = 1) {
  return findParam(params, (p) => typeof p.value === 'string' && p.value.length >= minLength)
}

function stringsParam(params, minItems = 1) {
  return findParam(params, (p) => isStringArray(p.value) && p.value.length >= minItems)
}

function matrixParam(params) {
  return findParam(params, (p) => isMatrix(p.value) && p.value.length >= 1)
}

function treeParam(params) {
  return findParam(params, (p) => {
    const tree = P.treeOf(p.value)
    return Boolean(tree && tree.nodes.length >= 2)
  })
}

function listParams(params) {
  const out = []
  for (const param of params) {
    const value = param.value
    if (value && typeof value === 'object' && Array.isArray(value.values) && !Array.isArray(value)) out.push(value.values.slice())
    else if (Array.isArray(value) && value.length > 0 && value.every((v) => isNum(v) || v === null) && /head|list|node|l1|l2/i.test(String(param.name || ''))) {
      out.push(P.listFromValues(value))
    }
  }
  return out
}

function matrixToIntervals(matrix) {
  if (!isMatrix(matrix)) return null
  if (!matrix.every((row) => row.length === 2 && row.every(isNum))) return null
  return matrix.map((row) => [row[0], row[1]])
}

function matrixToEdges(matrix) {
  if (!isMatrix(matrix)) return null
  if (!matrix.every((row) => (row.length === 2 || row.length === 3) && row.every(isNum))) return null
  return matrix.map((row) => [row[0], row[1]])
}

function matrixToAdjacency(matrix) {
  if (!isMatrix(matrix)) return null
  if (!matrix.every((row) => row.every((v) => isNum(v) && v >= 0 && Number.isInteger(v)))) return null
  const n = matrix.length
  if (matrix.some((row) => row.some((v) => v >= n))) return null
  return matrix.map((row) => row.slice())
}

/* ------------------------------------------------------------------ graph extraction -- */

function gridFromMatrix(matrix) {
  if (!isMatrix(matrix)) return null
  const rows = matrix.length
  const cols = matrix[0].length
  if (cols === 0) return null
  if (!matrix.every((row) => row.length === cols)) return null
  const cells = matrix.map((row) => row.map((v) => (typeof v === 'string' ? v : isNum(v) ? v : String(v))))
  const flat = cells.flat()
  const isBinary = flat.every((v) => v === '0' || v === '1' || v === 0 || v === 1)
  return { rows, cols, cells, isBinary }
}

function graphShape(problem, params) {
  const matrixP = matrixParam(params)
  const numP = numberParam(params, 0, 5000)
  const text = `${problem && problem.title ? problem.title : ''} ${problem && problem.description ? problem.description : ''}`.toLowerCase()
  const gridP = matrixP && matrixP.value.length <= 14 ? gridFromMatrix(matrixP.value) : null
  const gridish = /grid|island|maze|matrix|board/.test(text) || /grid|board|matrix/.test(String(matrixP ? matrixP.name : '').toLowerCase())
  if (gridP && gridP.isBinary && gridish && gridP.rows * gridP.cols <= 144) {
    return { type: 'grid', grid: gridP }
  }
  if (!matrixP) return null
  const matrix = matrixP.value
  const name = String(matrixP.name || '').toLowerCase()
  const adjacencyName = /graph|adj/.test(name)
  const edgeName = /edge/.test(name)
  const edgeText = /\bedges?\b/.test(text)
  const adjText = /adjacen|neighbors|connected to|graph\[i\]/.test(text)
  const allPairs = matrix.every((row) => row.length === 2 || row.length === 3)
  let nodeCount = 0
  if (numP && !/k$|target|start/i.test(String(numP.name || ''))) {
    nodeCount = Math.max(0, Math.round(numP.value))
  }
  if (adjacencyName || (adjText && !edgeName && !edgeText)) {
    const adjacency = matrixToAdjacency(matrix)
    if (adjacency) return { type: 'adjacency', adjacency, nodeCount: adjacency.length }
  }
  if (allPairs) {
    const edges = matrixToEdges(matrix)
    if (edges) {
      let n = nodeCount
      if (n <= 0) {
        n = edges.reduce((max, [a, b]) => Math.max(max, a + 1, b + 1), 0)
        if (n <= 0) n = matrix.length + 1
      }
      return { type: 'edges', edges, nodeCount: n }
    }
  }
  const adjacency = matrixToAdjacency(matrix)
  if (adjacency) return { type: 'adjacency', adjacency, nodeCount: adjacency.length }
  return null
}

function buildGraphFromShape(shape) {
  if (shape.type === 'edges') {
    const nodes = Array.from({ length: shape.nodeCount }, (_, id) => ({ id, label: String(id) }))
    return { nodes, edges: shape.edges.slice(0, 320), adjacency: adjacencyOf(nodes.length, shape.edges) }
  }
  const nodes = Array.from({ length: shape.nodeCount }, (_, id) => ({ id, label: String(id) }))
  const edges = []
  shape.adjacency.forEach((neighbors, a) => {
    for (const b of neighbors) if (b > a && b < nodes.length) edges.push([a, b])
  })
  return { nodes, edges, adjacency: shape.adjacency.map((row) => row.filter((b) => b < nodes.length)) }
}

function adjacencyOf(n, edges) {
  const adjacency = Array.from({ length: n }, () => [])
  for (const [a, b] of edges) {
    if (a < 0 || b < 0 || a >= n || b >= n) continue
    adjacency[a].push(b)
    adjacency[b].push(a)
  }
  return adjacency
}

/** Keep graph scenes legible: cap rendered nodes, mapping to a dense id space. */
function compactGraph(graph, maxNodes = 26) {
  const ids = graph.nodes.map((n) => n.id)
  const keep = ids.slice(0, maxNodes)
  const keepSet = new Set(keep.map(String))
  const nodes = keep.map((id, index) => ({ id: index, label: String(id) }))
  const remap = new Map(keep.map((id, index) => [String(id), index]))
  const edges = []
  for (const [a, b] of graph.edges) {
    const ra = remap.get(String(a))
    const rb = remap.get(String(b))
    if (ra === undefined || rb === undefined || ra === rb) continue
    edges.push([ra, rb])
  }
  return { nodes, edges, originalIds: keep, truncated: graph.nodes.length > maxNodes }
}

/* -------------------------------------------------------------- array / string helpers -- */

function highlightIndices(indices, color) {
  const out = {}
  for (const index of indices) out[String(index)] = color
  return out
}

function stackHighlights(stack) {
  const out = {}
  for (const index of stack) out[String(index)] = 'accent'
  return out
}

function seenOfMap(map) {
  const out = {}
  let count = 0
  for (const [value, index] of map.entries()) {
    if (count >= 64) break
    out[String(value)] = index
    count++
  }
  return out
}

/* ================================================================ pattern generators == */

/* ---------------------------------------------------------------- arrays-hashing -- */

function genArraysHashing(params, problem) {
  const hints = `${(problem && problem.slug) || ''} ${(problem && problem.title) || ''}`.toLowerCase()
  const numbers = numbersParam(params, 2)
  const targetP = numberParam(params, -1e9, 1e9)
  const strings = params.filter((p) => typeof p.value === 'string' && p.value.length > 0)
  if (numbers) {
    const values = numbers.value.slice(0, 32)
    if (/majority/.test(hints)) return majoritySweep(values)
    if (/consecutive/.test(hints)) return consecutiveSweep(values)
    if (targetP) return twoSumSweep(values, targetP.value, problem)
    return containsDuplicateSweep(values, problem)
  }
  if (strings.length >= 2) {
    const a = strings[0].value
    const b = strings[1].value
    if (a.length + b.length + 1 <= 40) return anagramSweep(a, b)
  }
  return null
}

function majoritySweep(values) {
  const bag = new Bag()
  bag.add('input', `${values.length} values; one value appears more than half the time.`, {})
  let candidate = null
  let count = 0
  bag.add('start', 'Boyer-Moore: keep a candidate and a balance count.', {})
  for (let i = 0; i < values.length; i++) {
    if (count === 0) {
      candidate = values[i]
      count = 1
      bag.add(`new candidate`, `Balance hit 0 → candidate = ${candidate}.`, {
        pointers: { i },
        highlights: { [String(i)]: 'accent' },
      })
    } else if (values[i] === candidate) {
      count++
      bag.add(`support ${values[i]}`, `Matches candidate ${candidate}; count = ${count}.`, {
        pointers: { i },
        highlights: { [String(i)]: 'ok' },
      })
    } else {
      count--
      bag.add(`cancel ${values[i]}`, `${values[i]} differs from ${candidate}; count = ${count}.`, {
        pointers: { i },
        highlights: { [String(i)]: 'bad' },
      })
    }
  }
  const frames = bag.done('candidate', `${candidate} survives the canceling scan.`, {
    pointers: { i: values.length - 1 },
    highlights: highlightIndices(values.map((v, i) => (v === candidate ? i : -1)).filter((i) => i >= 0), 'ok'),
  })
  return frames
    ? arrayScene({
        title: 'Majority Element — Boyer-Moore',
        subtitle: 'Cancel pairs of different values',
        pattern: 'arrays-hashing',
        values,
        frames,
      })
    : null
}

function consecutiveSweep(values) {
  const bag = new Bag()
  let run = 0
  let best = 0
  bag.add('input', `${values.length} values; count the longest run of 1s.`, {})
  bag.add('start', 'run = 0, best = 0.', {})
  for (let i = 0; i < values.length; i++) {
    if (values[i] === 1) {
      run++
      best = Math.max(best, run)
      bag.add(`extend ${i}`, `nums[${i}] = 1 → run = ${run}, best = ${best}.`, {
        pointers: { i },
        highlights: { [String(i)]: 'ok' },
        window: [i - run + 1, i],
      })
    } else {
      run = 0
      bag.add(`reset ${i}`, `nums[${i}] = ${values[i]} → run = 0.`, {
        pointers: { i },
        highlights: { [String(i)]: 'bad' },
      })
    }
  }
  const frames = bag.done('answer', `Longest run of 1s is ${best}.`, { window: undefined })
  return frames
    ? arrayScene({
        title: 'Max Consecutive Ones — one pass',
        subtitle: 'Running counter',
        pattern: 'arrays-hashing',
        values,
        frames,
      })
    : null
}

function twoSumSweep(values, target, problem) {
  const bag = new Bag()
  const seen = new Map()
  bag.add('input', `Scan ${values.length} values left to right; target = ${target}.`, { vars: { target } })
  bag.add('map empty', 'Nothing stored yet — every value is checked against earlier ones.', { vars: { target } })
  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    const need = target - value
    const hit = seen.has(need) ? seen.get(need) : -1
    bag.add(
      `i = ${i}`,
      `nums[${i}] = ${value}. Need ${need}. Map has ${seen.size} entr${seen.size === 1 ? 'y' : 'ies'}${hit >= 0 ? ` — found at index ${hit}.` : '.'}`,
      { pointers: { i }, highlights: { [String(i)]: 'accent' }, seen: seenOfMap(seen), vars: { target, need }, lookup: { from: i, key: String(need), hit: hit >= 0 ? hit : null }, ops: { cmp: i + 1, writes: seen.size } },
    )
    if (hit >= 0) {
      bag.add('match', `Return [${hit}, ${i}]: ${values[hit]} + ${value} = ${target}.`, {
        pointers: { i, j: hit },
        highlights: { [String(hit)]: 'ok', [String(i)]: 'ok' },
        seen: seenOfMap(seen),
        vars: { target, need },
        lookup: { from: i, key: String(need), hit },
        ops: { cmp: i + 1, writes: seen.size },
      })
      const frames = bag.done('found', `Indices ${hit} and ${i} add to ${target}.`, {
        pointers: { i, j: hit },
        highlights: { [String(hit)]: 'ok', [String(i)]: 'ok' },
        seen: seenOfMap(seen),
        vars: { target },
      })
      return frames ? arrayScene({ title: 'Two Sum — hash map sweep', subtitle: `${problem && problem.title ? problem.title : 'Two Sum'} · first example`, pattern: 'arrays-hashing', values, frames }) : null
    }
    seen.set(value, i)
    bag.add(`store ${value}`, `Map ${value} → ${i}. ${seen.size} of ${values.length} values stored.`, {
      pointers: { i },
      highlights: { [String(i)]: 'warn' },
      seen: seenOfMap(seen),
      vars: { target, need },
    })
  }
  const frames = bag.done('no pair', `Scanned all ${values.length} values; no two add to ${target}.`, { seen: seenOfMap(seen), vars: { target } })
  return frames ? arrayScene({ title: 'Two Sum — hash map sweep', subtitle: 'No pair for this target', pattern: 'arrays-hashing', values, frames }) : null
}

function containsDuplicateSweep(values, problem) {
  const bag = new Bag()
  const seen = new Map()
  bag.add('input', `${values.length} values; keep a hash set of already-seen values.`, {})
  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    const duplicate = seen.has(value)
    bag.add(
      `i = ${i}`,
      `Read ${value}. ${duplicate ? `Already seen at index ${seen.get(value)} — duplicate.` : 'New value — add it.'}`,
      { pointers: { i }, highlights: { [String(i)]: duplicate ? 'bad' : 'accent' }, seen: seenOfMap(seen) },
    )
    if (duplicate) {
      const frames = bag.done('duplicate', `Value ${value} appears twice → duplicate found.`, {
        pointers: { i },
        highlights: { [String(i)]: 'bad' },
        seen: seenOfMap(seen),
      })
      return frames
        ? arrayScene({
            title: 'Hash Set Sweep — seen values',
            subtitle: `${problem && problem.title ? problem.title : 'First example'} · duplicate check`,
            pattern: 'arrays-hashing',
            values,
            frames,
          })
        : null
    }
    seen.set(value, i)
  }
  const frames = bag.done('unique', `All ${values.length} values are distinct — the set never repeats.`, { seen: seenOfMap(seen) })
  return frames
    ? arrayScene({
        title: 'Hash Set Sweep — seen values',
        subtitle: `${problem && problem.title ? problem.title : 'First example'} · duplicate check`,
        pattern: 'arrays-hashing',
        values,
        frames,
      })
    : null
}

function anagramSweep(a, b) {
  const bag = new Bag()
  const chars = [...a, '|', ...b]
  const leftWindow = [0, Math.max(0, a.length - 1)]
  const rightWindow = [a.length + 1, chars.length - 1]
  const counts = new Map()
  bag.add('input', `Count letters of "${a}", then cancel them with "${b}".`, { window: leftWindow })
  for (let i = 0; i < a.length; i++) {
    const ch = a[i]
    counts.set(ch, (counts.get(ch) || 0) + 1)
    bag.add(`count ${ch}`, `s[${i}] = ${ch} → count ${counts.get(ch)}.`, {
      pointers: { i },
      highlights: { [String(i)]: 'accent' },
      window: leftWindow,
    })
  }
  let mismatch = -1
  for (let i = 0; i < b.length; i++) {
    const ch = b[i]
    const at = a.length + 1 + i
    const count = counts.get(ch) || 0
    counts.set(ch, count - 1)
    bag.add(`cancel ${ch}`, `t[${i}] = ${ch} → ${count > 0 ? `count ${ch} ${count} → ${count - 1}.` : `not available in s — mismatch.`}`, {
      pointers: { i: at },
      highlights: { [String(at)]: count > 0 ? 'ok' : 'bad' },
      window: rightWindow,
    })
    if (count <= 0) {
      mismatch = i
      break
    }
  }
  const complete = mismatch < 0 && [...counts.values()].every((v) => v === 0)
  const frames = bag.done(
    complete ? 'anagram' : 'not anagram',
    complete
      ? `Every letter of "${b}" cancels against "${a}" — anagram.`
      : mismatch >= 0
        ? `t[${mismatch}] = ${b[mismatch]} has no matching letter left → not an anagram.`
        : `Some letters remain uncancelled → not an anagram.`,
    { window: rightWindow, highlights: {} },
  )
  return frames
    ? stringScene({
        title: 'Valid Anagram — letter counts',
        subtitle: 'First example',
        pattern: 'arrays-hashing',
        chars,
        frames,
      })
    : null
}

/* ------------------------------------------------------------------- two-pointers -- */

function genTwoPointers(params, problem) {
  const hints = `${(problem && problem.slug) || ''} ${(problem && problem.title) || ''}`.toLowerCase()
  const strings = params.filter((p) => typeof p.value === 'string')
  const charParam = findParam(params, (p) => Array.isArray(p.value) && p.value.length >= 2 && p.value.every((v) => typeof v === 'string' && v.length <= 1))
  const numbers = numbersParam(params, 2)
  const targetP = numberParam(params, -1e9, 1e9)
  if (/occurrence|strstr|index-of|indexof/.test(hints) && strings.length >= 2) {
    return stringSearchFrames(strings[0].value, strings[1].value)
  }
  if (/vowel/.test(hints) && charParam) return reverseVowelsFrames(charParam.value.slice(0, 40))
  if (/reverse/.test(hints) && charParam) return reverseStringFrames(charParam.value.slice(0, 40))
  if (/subsequence/.test(hints) && strings.length >= 2) return subsequenceFrames(strings[0].value, strings[1].value)
  if (/palindrome/.test(hints) && strings.length >= 1) return palindromeFrames(strings[0].value)
  if (/remove-duplicates/.test(hints) && numbers) return removeDuplicatesFrames(numbers.value.slice(0, 24))
  if (/remove-element/.test(hints) && numbers) return removeElementFrames(numbers.value.slice(0, 24), targetP ? targetP.value : numbers.value[0])
  if (/container|water/.test(hints) && numbers) return mostWaterFrames(numbers.value.slice(0, 24), 'Container With Most Water')
  if (strings.length >= 2) return subsequenceFrames(strings[0].value, strings[1].value)
  const stringP = stringParam(params, 2)
  if (stringP) return palindromeFrames(stringP.value)
  if (!numbers) return null
  if (targetP) return twoSumSortedFrames(numbers.value.slice(0, 32), targetP.value)
  return mostWaterFrames(numbers.value.slice(0, 24), 'Two Pointers — converging sweep')
}

function reverseStringFrames(chars) {
  if (chars.length < 2) return null
  const bag = new Bag()
  const working = chars.slice()
  bag.add('input', `${chars.length} characters; reverse them in place with two pointers.`, { chars: working.slice() })
  let left = 0
  let right = working.length - 1
  bag.add('pointers', `left = 0, right = ${right}.`, {
    pointers: { left, right },
    highlights: { '0': 'accent', [String(right)]: 'warn' },
    window: [left, right],
    chars: working.slice(),
  })
  while (left < right) {
    const a = working[left]
    const b = working[right]
    bag.add(`swap '${a}' ↔ '${b}'`, `Exchange positions ${left} and ${right}.`, {
      pointers: { left, right },
      highlights: { [String(left)]: 'accent', [String(right)]: 'warn' },
      chars: working.slice(),
    })
    working[left] = b
    working[right] = a
    bag.add('swapped', `Now "${working.join('')}".`, {
      pointers: { left, right },
      highlights: { [String(left)]: 'ok', [String(right)]: 'ok' },
      chars: working.slice(),
    })
    left++
    right--
  }
  const frames = bag.done('reversed', `Reversed string: "${working.join('')}".`, { chars: working.slice() })
  return frames
    ? stringScene({
        title: 'Reverse String — two pointers',
        subtitle: 'Swap from both ends',
        pattern: 'two-pointers',
        chars,
        frames,
      })
    : null
}

function reverseVowelsFrames(chars) {
  const vowels = new Set(['a', 'e', 'i', 'o', 'u', 'A', 'E', 'I', 'O', 'U'])
  const working = chars.slice()
  const bag = new Bag()
  bag.add('input', `Reverse only the vowels in "${working.join('')}".`, { chars: working.slice() })
  let left = 0
  let right = working.length - 1
  bag.add('pointers', 'left scans forward, right scans backward; swap when both sit on vowels.', {
    pointers: { left, right },
    chars: working.slice(),
  })
  let guard = 0
  while (left < right && guard++ < 80) {
    while (left < right && !vowels.has(working[left])) left++
    while (left < right && !vowels.has(working[right])) right--
    if (left >= right) break
    bag.add(`vowels '${working[left]}' / '${working[right]}'`, `Swap ${left} ↔ ${right}.`, {
      pointers: { left, right },
      highlights: { [String(left)]: 'accent', [String(right)]: 'warn' },
      chars: working.slice(),
    })
    const a = working[left]
    working[left] = working[right]
    working[right] = a
    bag.add('swapped', `Now "${working.join('')}".`, { pointers: { left, right }, chars: working.slice() })
    left++
    right--
  }
  const frames = bag.done('done', `Vowels reversed: "${working.join('')}".`, { chars: working.slice() })
  return frames
    ? stringScene({
        title: 'Reverse Vowels — two pointers',
        subtitle: 'Swap vowel pairs only',
        pattern: 'two-pointers',
        chars,
        frames,
      })
    : null
}

function subsequenceFrames(s, t) {
  const chars = [...t].slice(0, 40)
  const short = [...s]
  if (short.length === 0) return null
  const bag = new Bag()
  bag.add('input', `Is "${clipText(s, 16)}" a subsequence of "${clipText(t, 24)}"? Scan t with two pointers.`, {})
  bag.add('pointers', `i = 0 for the short string, j = 0 for the long one.`, {
    pointers: { i: 0, j: 0 },
    highlights: { '0': 'warn' },
  })
  let i = 0
  let matched = []
  for (let j = 0; j < chars.length && i < short.length; j++) {
    const match = chars[j] === short[i]
    bag.add(`compare '${chars[j]}'`, `t[${j}] = '${chars[j]}' vs s[${i}] = '${short[i]}' → ${match ? 'match.' : 'skip.'}`, {
      pointers: { i: Math.min(matched.length, chars.length - 1), j },
      highlights: { [String(j)]: match ? 'ok' : 'dim' },
    })
    if (match) {
      matched.push(j)
      i++
      bag.add(`matched ${i}/${short.length}`, `Found '${short[i - 1]}' at t[${j}].`, {
        pointers: { i: Math.min(i, chars.length - 1), j },
        highlights: highlightIndices(matched, 'ok'),
      })
    }
  }
  const ok = i === short.length
  const frames = bag.done(ok ? 'is subsequence' : 'not subsequence', ok ? `All ${short.length} characters matched in order.` : `Only ${i}/${short.length} characters matched.`, {
    highlights: highlightIndices(matched, ok ? 'ok' : 'warn'),
  })
  return frames
    ? stringScene({
        title: 'Is Subsequence — two pointers',
        subtitle: 'Walk the long string once',
        pattern: 'two-pointers',
        chars,
        frames,
      })
    : null
}

function stringSearchFrames(haystack, needle) {
  const chars = [...haystack].slice(0, 40)
  const needleChars = [...needle]
  if (needleChars.length === 0) return null
  const bag = new Bag()
  bag.add('input', `Find "${clipText(needle, 16)}" inside "${clipText(haystack, 24)}" with two pointers.`, {})
  bag.add('pointers', `i = 0 marks the candidate start; j compares needle characters.`, {
    pointers: { i: 0, j: 0 },
    highlights: { '0': 'warn' },
    window: [0, Math.min(chars.length - 1, needleChars.length - 1)],
  })
  let found = -1
  for (let i = 0; i + needleChars.length <= chars.length; i++) {
    let j = 0
    bag.add(`try i = ${i}`, `Compare haystack[${i}…] with needle "${clipText(needle, 12)}".`, {
      pointers: { i, j },
      highlights: { [String(i)]: 'warn' },
      window: [i, i + needleChars.length - 1],
    })
    while (j < needleChars.length && chars[i + j] === needleChars[j]) {
      j++
      bag.add(`char ${j}/${needleChars.length}`, `haystack[${i + j - 1}] = '${chars[i + j - 1]}' matches needle[${j - 1}].`, {
        pointers: { i, j },
        highlights: { [String(i + j - 1)]: 'ok' },
        window: [i, i + needleChars.length - 1],
      })
    }
    const matched = j === needleChars.length
    bag.add(
      `matched ${j}/${needleChars.length}`,
      matched ? `Whole needle matched at index ${i}.` : `Mismatch at needle[${j}]; shift the start.`,
      {
        pointers: { i, j: Math.min(j, needleChars.length - 1) },
        highlights: { [String(i)]: matched ? 'ok' : 'bad', ...highlightIndices(Array.from({ length: Math.min(j, 3) }, (_, k) => i + k), 'ok') },
        window: [i, Math.min(chars.length - 1, i + needleChars.length - 1)],
      },
    )
    if (matched) {
      found = i
      break
    }
  }
  const frames = bag.done(
    found >= 0 ? 'found' : 'absent',
    found >= 0 ? `Needle starts at index ${found}.` : `Needle does not occur in the haystack.`,
    found >= 0 ? { pointers: { i: found }, highlights: highlightIndices(Array.from({ length: needleChars.length }, (_, k) => found + k), 'ok') } : {},
  )
  return frames
    ? stringScene({
        title: 'String Search — two pointers',
        subtitle: 'Compare, then shift the start',
        pattern: 'two-pointers',
        chars,
        frames,
      })
    : null
}

function removeDuplicatesFrames(values) {
  const input = values.slice()
  const bag = new Bag()
  const working = input.slice()
  bag.add('input', `Sorted array; keep unique values in place with slow / fast pointers.`, {})
  bag.add('start', 'slow = 0 keeps the last unique value; fast scans ahead.', {
    pointers: { slow: 0, fast: 0 },
    values: working.slice(),
  })
  let slow = 0
  for (let fast = 1; fast < input.length; fast++) {
    const isNew = input[fast] !== input[slow]
    bag.add(
      `compare fast = ${fast}`,
      `nums[${slow}] = ${input[slow]} vs nums[${fast}] = ${input[fast]} → ${isNew ? 'new value.' : 'duplicate.'}`,
      {
        pointers: { slow, fast },
        highlights: { [String(slow)]: 'accent', [String(fast)]: isNew ? 'ok' : 'bad' },
        values: working.slice(),
      },
    )
    if (isNew) {
      slow++
      working[slow] = input[fast]
    }
    bag.add(
      isNew ? `write ${slow}` : 'skip ' + fast,
      isNew ? `Write ${input[fast]} at index ${slow}.` : `Keep ${input[fast]} out of the unique prefix.`,
      {
        pointers: { slow, fast },
        highlights: { [String(slow)]: 'accent', [String(fast)]: isNew ? 'ok' : 'dim' },
        values: working.slice(),
      },
    )
  }
  const frames = bag.done('length', `${slow + 1} unique value(s): [${working.slice(0, slow + 1).join(', ')}].`, {
    pointers: { slow },
    values: working.slice(),
  })
  return frames
    ? arrayScene({
        title: 'Remove Duplicates — slow / fast pointers',
        subtitle: 'In-place compaction of a sorted array',
        pattern: 'two-pointers',
        values: input,
        frames,
      })
    : null
}

function removeElementFrames(values, val) {
  const input = values.slice()
  const working = input.slice()
  const bag = new Bag()
  bag.add('input', `Remove every ${val} in place; slow marks where the next kept value goes.`, {})
  bag.add('start', 'slow = 0 — nothing kept yet.', { pointers: { slow: 0, fast: 0 }, values: working.slice() })
  let slow = 0
  for (let fast = 0; fast < input.length; fast++) {
    const keep = input[fast] !== val
    if (keep) {
      working[slow] = input[fast]
      slow++
    }
    bag.add(
      `fast = ${fast}`,
      keep ? `nums[${fast}] = ${input[fast]} is kept → write at index ${slow - 1}.` : `nums[${fast}] = ${val} is removed → skip.`,
      {
        pointers: { slow: Math.min(slow, input.length - 1), fast },
        highlights: { [String(fast)]: keep ? 'ok' : 'bad', ...(keep ? { [String(slow - 1)]: 'accent' } : {}) },
        values: working.slice(),
      },
    )
  }
  const frames = bag.done('length', `Kept ${slow} value(s): [${working.slice(0, slow).join(', ')}].`, {
    pointers: { slow: Math.max(0, slow - 1) },
    values: working.slice(),
  })
  return frames
    ? arrayScene({
        title: 'Remove Element — in-place partition',
        subtitle: `Remove all ${val}s`,
        pattern: 'two-pointers',
        values: input,
        frames,
      })
    : null
}

function palindromeFrames(source) {
  const chars = [...source].slice(0, 40)
  const bag = new Bag()
  const isAlnum = (ch) => /[a-z0-9]/i.test(ch)
  let i = 0
  let j = chars.length - 1
  bag.add('input', `Two pointers at both ends of "${clipText(source, 32)}"; skip non-letters.`, {})
  bag.add('pointers', `left = 0 ('${chars[0]}'), right = ${j} ('${chars[j]}').`, {
    pointers: { left: 0, right: j },
    highlights: { '0': 'accent', [String(j)]: 'warn' },
    window: [0, j],
  })
  let ok = true
  while (i < j) {
    while (i < j && !isAlnum(chars[i])) i++
    while (i < j && !isAlnum(chars[j])) j--
    if (i > j) break
    const left = chars[i].toLowerCase()
    const right = chars[j].toLowerCase()
    const match = left === right
    bag.add(`compare ${chars[i]}/${chars[j]}`, `'${chars[i]}' vs '${chars[j]}' → ${match ? 'match, move both pointers.' : 'mismatch → stop.'}`, {
      pointers: { left: i, right: j },
      highlights: { [String(i)]: match ? 'ok' : 'bad', [String(j)]: match ? 'ok' : 'bad' },
      window: [i, j],
    })
    if (!match) {
      ok = false
      break
    }
    const ni = i + 1
    const nj = j - 1
    bag.add('move', `left ${i} → ${ni}, right ${j} → ${nj}.`, {
      pointers: { left: ni, right: nj },
      highlights: { [String(i)]: 'ok', [String(j)]: 'ok' },
      window: [Math.min(ni, nj), Math.max(ni, nj)],
    })
    i = ni
    j = nj
  }
  const frames = bag.done(ok ? 'palindrome' : 'not palindrome', ok ? `All mirrored letters match — palindrome.` : `Mismatched letters — not a palindrome.`, {
    window: i <= j ? [i, j] : undefined,
  })
  return frames
    ? stringScene({
        title: 'Valid Palindrome — converging pointers',
        subtitle: 'First example',
        pattern: 'two-pointers',
        chars,
        frames,
      })
    : null
}

function twoSumSortedFrames(inputValues, target) {
  const original = inputValues.slice(0, 32)
  const sorted = original.slice().sort((a, b) => a - b)
  const bag = new Bag()
  const sortedNote = sorted.every((v, i) => v === original[i]) ? 'Array is sorted.' : 'Sort a copy first.'
  bag.add('input', `${original.length} numbers, target = ${target}. ${sortedNote}`, {})
  let lo = 0
  let hi = sorted.length - 1
  bag.add('pointers', `left = 0, right = ${hi}: compare the smallest and largest values.`, {
    pointers: { left: lo, right: hi },
    highlights: { '0': 'accent', [String(hi)]: 'warn' },
    window: [lo, hi],
  })
  while (lo < hi) {
    const sum = sorted[lo] + sorted[hi]
    const match = sum === target
    bag.add(
      `sum ${sorted[lo]}+${sorted[hi]}=${sum}`,
      match ? `Sum equals ${target} — found the pair.` : sum < target ? `Sum < ${target} → move left pointer right.` : `Sum > ${target} → move right pointer left.`,
      { pointers: { left: lo, right: hi }, highlights: { [String(lo)]: match ? 'ok' : 'accent', [String(hi)]: match ? 'ok' : 'warn' }, window: [lo, hi] },
    )
    if (match) {
      const frames = bag.done('found', `Values ${sorted[lo]} + ${sorted[hi]} add to ${target}.`, {
        pointers: { left: lo, right: hi },
        highlights: { [String(lo)]: 'ok', [String(hi)]: 'ok' },
      })
      return frames
        ? arrayScene({
            title: 'Two Sum II — sorted two pointers',
            subtitle: 'First example (sorted copy shown)',
            pattern: 'two-pointers',
            values: sorted,
            frames,
          })
        : null
    }
    if (sum < target) lo++
    else hi--
    bag.add('move', `Now left = ${lo}, right = ${hi}.`, {
      pointers: { left: lo, right: hi },
      highlights: { [String(lo)]: 'accent', [String(hi)]: 'warn' },
      window: [lo, hi],
    })
  }
  const frames = bag.done('no pair', `Pointers met with no pair summing to ${target}.`, {})
  return frames
    ? arrayScene({
        title: 'Two Sum II — sorted two pointers',
        subtitle: 'First example (sorted copy shown)',
        pattern: 'two-pointers',
        values: sorted,
        frames,
      })
    : null
}

function mostWaterFrames(values, title = 'Container With Most Water — two pointers') {
  const bag = new Bag()
  let left = 0
  let right = values.length - 1
  let best = 0
  let bestPair = [0, values.length - 1]
  bag.add('input', `${values.length} walls; area = width × min(height[left], height[right]).`, {})
  bag.add('pointers', `left = 0, right = ${right}.`, {
    pointers: { left, right },
    highlights: { '0': 'accent', [String(right)]: 'warn' },
    window: [0, right],
  })
  let guard = 0
  while (left < right && guard++ < 60) {
    const width = right - left
    const height = Math.min(values[left], values[right])
    const area = width * height
    const improved = area > best
    if (improved) {
      best = area
      bestPair = [left, right]
    }
    bag.add(
      `area ${area}`,
      `min(${values[left]}, ${values[right]}) × ${width} = ${area}${improved ? ` — new best (${best}).` : ` — best stays ${best}.`}`,
      {
        pointers: { left, right },
        highlights: { [String(left)]: 'accent', [String(right)]: 'warn' },
        window: [left, right],
        seen: bestPair ? { [String(Math.min(values[bestPair[0]], values[bestPair[1]]))]: bestPair[0] } : {},
      },
    )
    if (values[left] <= values[right]) left++
    else right--
    bag.add('move', `Move the shorter wall → left = ${left}, right = ${right}.`, {
      pointers: { left, right },
      highlights: { [String(left)]: 'accent', [String(right)]: 'warn' },
      window: [left, right],
    })
  }
  const frames = bag.done('best', `Widest container found: area ${best} at indices ${bestPair[0]} and ${bestPair[1]}.`, {
    pointers: { bestLeft: bestPair[0], bestRight: bestPair[1] },
    highlights: { [String(bestPair[0])]: 'ok', [String(bestPair[1])]: 'ok' },
  })
  return frames
    ? arrayScene({
        title,
        subtitle: 'First example',
        pattern: 'two-pointers',
        values,
        frames,
      })
    : null
}

/* ------------------------------------------------------------------ sliding-window -- */

function genSlidingWindow(params, problem) {
  const stringP = stringParam(params, 1)
  const kP = numberParam(params, 1, 64)
  if (stringP) {
    if (kP) return distinctWindowFrames(stringP.value, Math.round(kP.value))
    return longestUniqueFrames(stringP.value)
  }
  const numbers = numbersParam(params, 2)
  if (numbers && kP) return fixedWindowFrames(numbers.value.slice(0, 40), Math.round(kP.value))
  if (numbers) return growingWindowFrames(numbers.value.slice(0, 32))
  return null
}

function longestUniqueFrames(source) {
  const chars = [...source].slice(0, 40)
  const bag = new Bag()
  const seen = new Map()
  let left = 0
  let best = 0
  let bestRange = [0, 0]
  bag.add('input', `Grow a window over "${clipText(source, 32)}"; store each letter's last index.`, {})
  bag.add('window', `window = [0, 0], seen = {} — start with just the first letter.`, {
    pointers: { left: 0, right: 0 },
    window: [0, 0],
    seen: {},
  })
  const windowCounts = () => {
    const out = {}
    for (let k = left; k <= Math.min(right, chars.length - 1); k++) out[chars[k]] = (out[chars[k]] || 0) + 1
    return out
  }
  let right = -1
  for (right = 0; right < chars.length; right++) {
    const ch = chars[right]
    const previous = seen.has(ch) ? seen.get(ch) : -1
    const jumped = previous >= left
    const showLeft = jumped ? previous + 1 : left
    const preview = {}
    for (let k = showLeft; k <= right; k++) preview[chars[k]] = (preview[chars[k]] || 0) + 1
    bag.add(
      `right = ${right}`,
      `'${ch}' was last at ${previous === -1 ? 'nowhere' : previous}. ${jumped ? `Repeat inside the window → left jumps to ${previous + 1}.` : 'No repeat inside the window.'}`,
      {
        pointers: { left: showLeft, right },
        highlights: { [String(right)]: jumped ? 'warn' : 'accent', ...(jumped && previous >= 0 ? { [String(previous)]: 'bad' } : {}) },
        window: [showLeft, right],
        seen: {},
        counts: preview,
        ops: { cmp: right + 1, writes: right + 1 },
      },
    )
    if (jumped) left = previous + 1
    seen.set(ch, right)
    const length = right - left + 1
    if (length > best) {
      best = length
      bestRange = [left, right]
    }
    bag.add(`window ${length}`, `Window [${left}, ${right}] has ${length} unique char${length === 1 ? '' : 's'}${length === best ? ` — best so far.` : `.`}`, {
      pointers: { left, right },
      window: [left, right],
      highlights: { [String(right)]: 'ok' },
      seen: {},
      counts: windowCounts(),
      ops: { cmp: right + 1, writes: right + 1 },
    })
  }
  const frames = bag.done('longest', `Longest substring without repeats has length ${best}: "${chars.slice(bestRange[0], bestRange[1] + 1).join('')}".`, {
    window: bestRange,
    pointers: { left: bestRange[0], right: bestRange[1] },
    highlights: highlightIndices(bestRange, 'ok'),
  })
  return frames
    ? stringScene({
        title: 'Longest Substring Without Repeats — window',
        subtitle: 'First example',
        pattern: 'sliding-window',
        chars,
        frames,
      })
    : null
}

function distinctWindowFrames(source, k) {
  const chars = [...source].slice(0, 40)
  const bag = new Bag()
  const counts = new Map()
  let left = 0
  let best = 0
  let bestRange = [0, 0]
  bag.add('input', `Window may hold at most ${k} distinct character${k === 1 ? '' : 's'}; track counts.`, {})
  bag.add('window', `window = [0, ${Math.min(k - 1, chars.length - 1)}], counts = {}.`, { window: [0, Math.min(k - 1, chars.length - 1)] })
  for (let right = 0; right < chars.length; right++) {
    const ch = chars[right]
    counts.set(ch, (counts.get(ch) || 0) + 1)
    bag.add(`right = ${right}`, `Add '${ch}' → ${counts.size} distinct (counts: ${[...counts.entries()].map(([c, n]) => `${c}×${n}`).join(', ')}).`, {
      pointers: { left, right },
      window: [left, right],
      highlights: { [String(right)]: 'accent' },
      counts: Object.fromEntries(counts),
    })
    while (counts.size > k && left <= right) {
      const out = chars[left]
      const next = (counts.get(out) || 0) - 1
      if (next <= 0) counts.delete(out)
      else counts.set(out, next)
      left++
      bag.add('shrink', `Too many distinct — remove '${out}', left → ${left}.`, {
        pointers: { left, right },
        window: [left, right],
        highlights: { [String(left - 1)]: 'warn' },
        counts: Object.fromEntries(counts),
      })
    }
    const length = right - left + 1
    if (length > best) {
      best = length
      bestRange = [left, right]
    }
    bag.add(`window ${length}`, `Window [${left}, ${right}] has ${counts.size} distinct; best = ${best}.`, {
      pointers: { left, right },
      window: [left, right],
      counts: Object.fromEntries(counts),
    })
  }
  const frames = bag.done('longest', `Longest window with ≤ ${k} distinct is ${best} chars long.`, {
    window: bestRange,
    highlights: highlightIndices(bestRange, 'ok'),
  })
  return frames
    ? stringScene({
        title: `At Most ${k} Distinct — sliding window`,
        subtitle: 'First example',
        pattern: 'sliding-window',
        chars,
        frames,
      })
    : null
}

function fixedWindowFrames(values, k) {
  const size = Math.max(1, Math.min(k, values.length))
  const bag = new Bag()
  let sum = 0
  let best = -Infinity
  let bestStart = 0
  bag.add('input', `Fixed window of ${size}; slide right and keep a running sum.`, {})
  bag.add('window', `Start with an empty window before index 0.`, { window: [0, Math.min(size - 1, values.length - 1)] })
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= size) sum -= values[i - size]
    const start = Math.max(0, i - size + 1)
    const full = i >= size - 1
    if (full && sum > best) {
      best = sum
      bestStart = start
    }
    bag.add(
      `i = ${i}`,
      full ? `Window [${start}, ${i}] sum = ${sum}${sum === best ? ` — best.` : `; best is ${best}.`}` : `Window still filling (${i + 1}/${size}), sum = ${sum}.`,
      {
        pointers: { i },
        highlights: { [String(i)]: full ? 'accent' : 'dim' },
        window: [start, i],
      },
    )
    if (full) {
      bag.add(`check ${sum}`, `Compare ${sum} with best ${best}.`, {
        pointers: { i },
        highlights: highlightIndices([start, i], 'ok'),
        window: [start, i],
      })
    }
  }
  const frames = bag.done('best window', `Best ${size}-element window starts at ${bestStart} with sum ${best}.`, {
    window: [bestStart, Math.min(bestStart + size - 1, values.length - 1)],
    highlights: highlightIndices([bestStart, Math.min(bestStart + size - 1, values.length - 1)], 'ok'),
  })
  return frames
    ? arrayScene({
        title: 'Sliding Window — running sum',
        subtitle: `Window size ${size}`,
        pattern: 'sliding-window',
        values,
        frames,
      })
    : null
}

function growingWindowFrames(values) {
  const bag = new Bag()
  let left = 0
  let sum = 0
  let best = 0
  let bestRange = [0, 0]
  bag.add('input', 'Grow the window while its sum stays non-negative; track the longest window.', {})
  for (let right = 0; right < values.length; right++) {
    sum += values[right]
    bag.add(`right = ${right}`, `Add ${values[right]} → window sum ${sum}.`, {
      pointers: { left, right },
      window: [left, right],
      highlights: { [String(right)]: 'accent' },
    })
    while (sum < 0 && left <= right) {
      sum -= values[left]
      bag.add('shrink', `Sum < 0 → drop ${values[left]}, left → ${left + 1}.`, {
        pointers: { left: left + 1, right },
        window: [Math.min(left + 1, values.length - 1), right],
      })
      left++
    }
    if (sum >= 0 && right - left + 1 > best) {
      best = right - left + 1
      bestRange = [left, right]
    }
  }
  const frames = bag.done('longest', `Longest non-negative window is ${best} element${best === 1 ? '' : 's'} long.`, {
    window: bestRange,
    highlights: highlightIndices(bestRange, 'ok'),
  })
  return frames
    ? arrayScene({
        title: 'Sliding Window — variable size',
        subtitle: 'Grow and shrink by running sum',
        pattern: 'sliding-window',
        values,
        frames,
      })
    : null
}

/* ------------------------------------------------------------------ binary-search -- */

function genBinarySearch(params, problem) {
  const numbers = numbersParam(params, 2)
  if (!numbers) return null
  const targetP = numberParam(params, -1e9, 1e9)
  if (!targetP) return null
  const original = numbers.value.slice(0, 32)
  const sorted = original.slice().sort((a, b) => a - b)
  const target = targetP.value
  const bag = new Bag()
  bag.add('input', `${sorted.length} values, target = ${target}. ${sorted.every((v, i) => v === original[i]) ? 'Array is sorted.' : 'Sort a copy first.'}`, {})
  bag.add('window', `Search space = [0, ${sorted.length - 1}].`, { window: [0, sorted.length - 1] })
  let lo = 0
  let hi = sorted.length - 1
  bag.add('halving', `Compare target with the midpoint, then discard half the search space.`, { window: [lo, hi], pointers: { lo, hi } })
  let found = -1
  let bsCmp = 0
  for (let guard = 0; guard < 40 && lo <= hi; guard++) {
    const mid = Math.floor((lo + hi) / 2)
    const value = sorted[mid]
    bsCmp++
    bag.add(`mid = ${mid}`, `nums[${mid}] = ${value} vs target ${target} (comparison ${bsCmp}).`, {
      pointers: { lo, hi, mid },
      highlights: { [String(mid)]: 'warn' },
      window: [lo, hi],
      ops: { cmp: bsCmp, writes: 0 },
    })
    if (value === target) {
      found = mid
      bag.add('match', `nums[${mid}] equals ${target}.`, {
        pointers: { lo, hi, mid },
        highlights: { [String(mid)]: 'ok' },
        window: [lo, hi],
        ops: { cmp: bsCmp, writes: 0 },
      })
      break
    }
    if (value < target) lo = mid + 1
    else hi = mid - 1
    bag.add('discard', value < target ? `Value too small → lo = ${lo}.` : `Value too large → hi = ${hi}.`, {
      pointers: { lo: Math.max(0, lo), hi: Math.max(0, hi) },
      window: lo <= hi ? [lo, hi] : undefined,
      ops: { cmp: bsCmp, writes: 0 },
    })
  }
  const frames = bag.done(
    found >= 0 ? 'found' : 'absent',
    found >= 0 ? `Target ${target} is at index ${found} (${Math.ceil(Math.log2(Math.max(2, sorted.length)))} comparisons).` : `Target ${target} is not present; search space is empty.`,
    found >= 0
      ? { pointers: { mid: found }, highlights: { [String(found)]: 'ok' } }
      : { window: undefined },
  )
  return frames
    ? arrayScene({
        title: 'Binary Search — halve the space',
        subtitle: 'First example (sorted copy shown)',
        pattern: 'binary-search',
        values: sorted,
        frames,
      })
    : null
}

/* -------------------------------------------------------------------------- stack -- */

const isBracketString = (s) => typeof s === 'string' && s.length >= 1 && /^[()[\]{}]+$/.test(s)

function genStack(params, problem) {
  const hints = `${(problem && problem.slug) || ''} ${(problem && problem.title) || ''}`.toLowerCase()
  const stringP = stringParam(params, 1)
  if (stringP) {
    if (isBracketString(stringP.value)) return bracketFrames(stringP.value)
    if (/adjacent|duplicate|remove|star|backspace|collision|parenthes/.test(hints)) return charStackFrames(stringP.value, hints)
    return null
  }
  const tokens = stringsParam(params, 2)
  if (tokens) return rpnFrames(tokens.value)
  const numbers = numbersParam(params, 2)
  if (numbers) return simpleStackFrames(numbers.value.slice(0, 16))
  return null
}

function charStackFrames(source, hints) {
  const chars = [...source].slice(0, 40)
  const bag = new Bag()
  const stack = [] // indices into chars
  const starMode = /star|collision/.test(hints)
  const backspaceMode = /backspace/.test(hints)
  bag.add('input', `${chars.length} characters; a stack decides what survives.`, {})
  bag.add('empty', 'Stack = [] — nothing kept yet.', {})
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    let action = 'push'
    if (starMode && ch === '*') action = 'pop'
    else if (backspaceMode && ch === '#') action = 'pop'
    else if (!starMode && !backspaceMode && stack.length && chars[stack[stack.length - 1]] === ch) action = 'pop'
    bag.add(`read '${ch}'`, `Index ${i}: ${action === 'pop' ? 'remove the previous kept character.' : 'keep this character.'}`, {
      pointers: { i },
      highlights: { [String(i)]: 'warn', ...stackHighlights(stack) },
    })
    if (action === 'pop' && stack.length) {
      const removed = stack.pop()
      bag.add('pop', `Drop index ${removed} ('${chars[removed]}'); stack = ${stack.map((k) => chars[k]).join('') || '[]'}.`, {
        pointers: { i },
        highlights: { [String(removed)]: 'bad', ...stackHighlights(stack) },
      })
    } else if (action === 'push') {
      stack.push(i)
      bag.add('push', `Keep '${ch}'; stack = ${stack.map((k) => chars[k]).join('') || '[]'}.`, {
        pointers: { i },
        highlights: { [String(i)]: 'ok', ...stackHighlights(stack) },
      })
    }
  }
  const result = stack.map((index) => chars[index]).join('')
  const frames = bag.done('result', `Final stack (kept characters): "${result}".`, {
    highlights: highlightIndices(stack, 'ok'),
  })
  return frames
    ? stringScene({
        title: 'Stack — character elimination',
        subtitle: 'Push to keep, pop to cancel',
        pattern: 'stack',
        chars,
        frames,
      })
    : null
}

function bracketFrames(source) {
  const chars = [...source].slice(0, 40)
  const bag = new Bag()
  const stack = []
  const pair = { ')': '(', ']': '[', '}': '{' }
  const granular = chars.length <= 19
  bag.add('input', `${chars.length} brackets; a stack remembers the opening ones.`, {})
  bag.add('empty stack', 'Stack = [] — no unmatched opening bracket yet.', { items: [] })
  let valid = true
  let failureAt = -1
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const opening = ch === '(' || ch === '[' || ch === '{'
    if (granular) {
      bag.add(`read '${ch}'`, opening ? `'${ch}' opens → it will be pushed.` : `'${ch}' closes → top must be '${pair[ch]}'.`, {
        pointers: { i },
        highlights: { [String(i)]: 'accent', ...stackHighlights(stack) },
      })
    }
    if (opening) {
      stack.push(i)
      if (granular) {
        bag.add(`push ${i}`, `Stack indices = [${stack.join(', ')}].`, {
          pointers: { i },
          highlights: { [String(i)]: 'accent', ...stackHighlights(stack) },
        })
      }
    } else {
      const top = stack.length ? chars[stack[stack.length - 1]] : null
      if (top !== pair[ch]) {
        valid = false
        failureAt = i
        if (granular) {
          bag.add(`fail at ${i}`, `'${ch}' needs '${pair[ch]}' but the top is ${top === null ? 'empty' : `'${top}'`}.`, {
            pointers: { i },
            highlights: { [String(i)]: 'bad', ...stackHighlights(stack) },
          })
        }
        break
      }
      stack.pop()
      if (granular) {
        bag.add(`pop ${i}`, `'${ch}' matches — stack indices = [${stack.join(', ')}].`, {
          pointers: { i },
          highlights: { [String(i)]: 'ok', ...stackHighlights(stack) },
        })
      }
    }
  }
  const frames = bag.done(
    valid && stack.length === 0 ? 'valid' : 'invalid',
    !valid
      ? `Bracket at index ${failureAt} does not match its counterpart → invalid.`
      : stack.length === 0
        ? 'Every opening bracket was closed in the right order → valid.'
        : `${stack.length} opening bracket(s) left unmatched → invalid.`,
    { items: stack.map((index) => chars[index]) },
  )
  return frames
    ? stringScene({
        title: 'Valid Parentheses — stack',
        subtitle: 'First example',
        pattern: 'stack',
        chars,
        frames,
      })
    : null
}

function rpnFrames(tokens) {
  const bag = new Bag()
  const stack = []
  const isOperator = (t) => t === '+' || t === '-' || t === '*' || t === '/'
  bag.add('input', `${tokens.length} tokens in reverse Polish notation.`, { items: [] })
  for (let i = 0; i < tokens.length; i++) {
    const token = clipText(tokens[i], 8)
    const asNumber = Number(token)
    if (!isOperator(token) && Number.isFinite(asNumber)) {
      stack.push(asNumber)
      bag.add(`push ${token}`, `Stack = [${stack.join(', ')}].`, { items: stack.slice(), op: 'push' })
    } else if (isOperator(token) && stack.length >= 2) {
      const b = stack.pop()
      const a = stack.pop()
      const result = token === '+' ? a + b : token === '-' ? a - b : token === '*' ? a * b : b === 0 ? 0 : a / b
      stack.push(result)
      bag.add(`apply ${token}`, `${a} ${token} ${b} = ${result}; stack = [${stack.join(', ')}].`, { items: stack.slice(), op: 'peek' })
    } else {
      bag.add('skip', `Token '${token}' cannot be applied here.`, { items: stack.slice() })
    }
  }
  const frames = bag.done('result', stack.length === 1 ? `Stack holds one value: ${stack[0]}.` : `Stack ends with [${stack.join(', ')}].`, {
    items: stack.slice(),
  })
  return frames
    ? stackScene({
        title: 'Evaluate RPN — stack machine',
        subtitle: 'First example',
        pattern: 'stack',
        capacity: Math.max(8, tokens.length),
        frames,
      })
    : null
}

function simpleStackFrames(values) {
  const bag = new Bag()
  const stack = []
  bag.add('input', `Push ${values.length} values onto a stack, then pop them all.`, { items: [] })
  for (let i = 0; i < values.length; i++) {
    stack.push(values[i])
    bag.add(`push ${values[i]}`, `Stack = [${stack.join(', ')}].`, { items: stack.slice(), op: 'push' })
  }
  bag.add('peek top', `Top of stack = ${stack[stack.length - 1]}.`, { items: stack.slice(), op: 'peek' })
  while (stack.length) {
    const value = stack.pop()
    bag.add(`pop ${value}`, `Popped ${value}; stack = [${stack.join(', ')}].`, { items: stack.slice(), op: 'pop' })
  }
  const frames = bag.done('empty', `All ${values.length} values popped — LIFO reverses the push order.`, { items: [], op: 'pop' })
  return frames ? stackScene({ title: 'Stack — push then pop (LIFO)', subtitle: 'First example', pattern: 'stack', capacity: values.length + 2, frames }) : null
}

/* ------------------------------------------------------------- monotonic-stack -- */

function genMonotonicStack(params, problem) {
  const numbers = numbersParam(params, 2)
  if (!numbers) return null
  const values = numbers.value.slice(0, 28)
  const bag = new Bag()
  const stack = [] // indices with decreasing values
  const result = new Array(values.length).fill(-1)
  bag.add('input', `${values.length} values; find the next greater value for each index.`, {})
  bag.add('empty', 'Monotonic stack = [] — indices whose next greater is still unknown.', {})
  const resolved = {}
  let msCmp = 0
  for (let i = 0; i < values.length; i++) {
    bag.add(`i = ${i}`, `Read ${values[i]}; pop smaller tops, then push index ${i}.`, {
      pointers: { i },
      highlights: { ...stackHighlights(stack), [String(i)]: 'warn' },
      stack: stack.slice(),
      resolved: { ...resolved },
      ops: { cmp: msCmp, writes: i },
    })
    while (stack.length && values[stack[stack.length - 1]] < values[i]) {
      msCmp++
      const popped = stack.pop()
      result[popped] = values[i]
      resolved[popped] = values[i]
      bag.add(`pop ${popped}`, `nums[${popped}] = ${values[popped]} < ${values[i]} → resolved by index ${i} (dist ${i - popped}).`, {
        pointers: { i },
        highlights: { ...stackHighlights(stack), [String(popped)]: 'ok', [String(i)]: 'accent' },
        stack: stack.slice(),
        resolved: { ...resolved },
        ops: { cmp: msCmp, writes: i + 1 },
      })
    }
    if (stack.length) msCmp++
    stack.push(i)
    bag.add(`push ${i}`, `Stack indices = [${stack.join(', ')}] (values strictly decreasing).`, {
      pointers: { i },
      highlights: stackHighlights(stack),
      stack: stack.slice(),
      resolved: { ...resolved },
      ops: { cmp: msCmp, writes: i + 1 },
    })
  }
  const remaining = stack.map((index) => `nums[${index}] has no greater element to the right`).join('; ')
  const frames = bag.done(
    'answer',
    `Next greater array: [${result.map((v) => (v === -1 ? 'none' : v)).join(', ')}].${remaining ? ` ${clipText(remaining, 60)}` : ''}`,
    { highlights: highlightIndices(stack, 'dim') },
  )
  return frames
    ? arrayScene({
        title: 'Monotonic Stack — next greater sweep',
        subtitle: `${problem && problem.title ? problem.title : 'First example'} · stack of unresolved indices`,
        pattern: 'monotonic-stack',
        values,
        frames,
      })
    : null
}

/* ---------------------------------------------------------------------- graph-bfs -- */

function gridBfsFrames(grid, start = [0, 0]) {
  const { rows, cols, cells } = grid
  const passable = (r, c) => {
    if (r < 0 || c < 0 || r >= rows || c >= cols) return false
    const v = cells[r][c]
    return !(v === '0' || v === 0)
  }
  if (!passable(start[0], start[1])) return null
  const bag = new Bag()
  const seen = new Set()
  const filled = []
  const queue = [start]
  seen.add(`${start[0]},${start[1]}`)
  const gridDist = new Map([[`${start[0]},${start[1]}`, 0]])
  bag.add('input', `${rows} × ${cols} grid; BFS spreads in four directions from (${start[0]}, ${start[1]}).`, {})
  bag.add('seed', `Queue = [(0, 0)] — one layer at a time; numbers are distances.`, { current: start, filled: [] })
  let order = 0
  const distCells = () => cells.map((row, rr) => row.map((v, cc) => (gridDist.has(`${rr},${cc}`) ? gridDist.get(`${rr},${cc}`) : v)))
  while (queue.length && order < 120) {
    const cell = queue.shift()
    const [r, c] = cell
    filled.push(cell)
    order++
    bag.add(`visit (${r},${c})`, `Dist ${gridDist.get(`${r},${c}`)} at (${r},${c}); queue holds ${queue.length} cell(s).`, {
      current: cell,
      filled: filled.slice(),
      frontier: queue.slice(),
      cells: distCells(),
    })
    for (const [dr, dc] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) {
      const nr = r + dr
      const nc = c + dc
      const key = `${nr},${nc}`
      if (!passable(nr, nc) || seen.has(key)) continue
      seen.add(key)
      gridDist.set(key, gridDist.get(`${r},${c}`) + 1)
      queue.push([nr, nc])
    }
  }
  const blocked = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!passable(r, c)) blocked.push([r, c])
  const frames = bag.done('done', `BFS reached ${seen.size} cell(s) in ${order} visits; queue is empty.`, {
    current: filled[filled.length - 1],
    filled,
    blocked,
  })
  return frames
    ? gridScene({
        title: 'Grid BFS — expanding queue',
        subtitle: 'Four-directional wavefront',
        pattern: 'graph-bfs',
        rows,
        cols,
        cells,
        frames,
      })
    : null
}

function gridDfsFrames(grid, start = [0, 0]) {
  const { rows, cols, cells } = grid
  const passable = (r, c) => {
    if (r < 0 || c < 0 || r >= rows || c >= cols) return false
    const v = cells[r][c]
    return !(v === '0' || v === 0)
  }
  if (!passable(start[0], start[1])) return null
  const bag = new Bag()
  const seen = new Set()
  const path = []
  bag.add('input', `${rows} × ${cols} grid; depth-first search marks a cell, then goes deeper.`, {})
  bag.add('start', `Call dfs(0, 0) — mark it and push it on the path.`, { current: start })
  const visit = (r, c) => {
    const key = `${r},${c}`
    seen.add(key)
    path.push([r, c])
    const boundary = []
    for (const [dr, dc] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) {
      const nr = r + dr
      const nc = c + dc
      if (!passable(nr, nc) || seen.has(`${nr},${nc}`)) continue
      boundary.push([nr, nc])
    }
    bag.add(`enter (${r},${c})`, `Path depth ${path.length}; visited ${seen.size} cell(s)${boundary.length > 0 ? `; ${boundary.length} open neighbour${boundary.length === 1 ? '' : 's'}.` : '; dead end.'}`, {
      current: [r, c],
      path: path.slice(),
      filled: [...seen].map((k) => k.split(',').map(Number)),
      frontier: boundary,
    })
    for (const [dr, dc] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) {
      const nr = r + dr
      const nc = c + dc
      if (!passable(nr, nc) || seen.has(`${nr},${nc}`)) continue
      bag.add(`descend (${nr},${nc})`, `Neighbour is open — recurse.`, {
        current: [r, c],
        path: path.slice(),
        frontier: [[nr, nc]],
      })
      visit(nr, nc)
    }
    path.pop()
    bag.add(`backtrack`, `All neighbours of (${r},${c}) explored — back up.`, {
      current: path.length ? path[path.length - 1] : [r, c],
      path: path.slice(),
      filled: [...seen].map((k) => k.split(',').map(Number)),
    })
  }
  visit(start[0], start[1])
  const blocked = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!passable(r, c)) blocked.push([r, c])
  const frames = bag.done('done', `DFS visited ${seen.size} of ${rows * cols} cells; every path backtracked.`, {
    current: start,
    filled: [...seen].map((k) => k.split(',').map(Number)),
    blocked,
  })
  return frames
    ? gridScene({
        title: 'Grid DFS — path + backtracking',
        subtitle: 'Four-directional depth-first search',
        pattern: 'graph-dfs',
        rows,
        cols,
        cells,
        frames,
      })
    : null
}

function genGraphBfs(params, problem) {
  const shape = graphShape(problem, params)
  if (!shape) return null
  if (shape.type === 'grid') return gridBfsFrames(shape.grid)
  const graph = compactGraph(buildGraphFromShape(shape))
  if (graph.nodes.length < 2) return null
  const bag = new Bag()
  const start = 0
  const visited = new Set()
  const queue = [start]
  const queued = new Set([start])
  const dist = { [start]: 0 }
  const orderSeen = []
  let bfsCmp = 0
  bag.add('input', `Graph with ${graph.nodes.length} nodes, ${graph.edges.length} edges.${graph.truncated ? ' Showing the first 26 nodes.' : ''}`, {})
  bag.add('seed', `BFS from node ${start}; queue = [${start}], dist ${start} = 0.`, { frontier: [start], queue: [start], distances: { ...dist } })
  while (queue.length) {
    const node = queue.shift()
    visited.add(node)
    orderSeen.push(node)
    bag.add(`visit ${graph.nodes[node].label}`, `Dequeue ${graph.nodes[node].label} (dist ${dist[node]}); visited ${visited.size}/${graph.nodes.length}.`, {
      current: node,
      visited: [...visited],
      frontier: queue.slice(),
      queue: queue.slice(),
      distances: { ...dist },
      path: orderSeen.slice(),
      ops: { cmp: bfsCmp, writes: visited.size },
    })
    const discovered = []
    for (const next of graph.edges.map((e) => e).filter((e) => e[0] === node || e[1] === node).map((e) => (e[0] === node ? e[1] : e[0]))) {
      bfsCmp++
      if (visited.has(next) || queued.has(next)) continue
      queued.add(next)
      dist[next] = dist[node] + 1
      queue.push(next)
      discovered.push(next)
    }
    if (discovered.length) {
      bag.add(`expand ${graph.nodes[node].label}`, `New neighbours ${discovered.map((d) => graph.nodes[d].label).join(', ')} join the queue at dist ${dist[node] + 1}.`, {
        current: node,
        visited: [...visited],
        frontier: queue.slice(),
        queue: queue.slice(),
        distances: { ...dist },
        ops: { cmp: bfsCmp, writes: visited.size },
      })
    }
  }
  const frames = bag.done('done', `BFS order: ${orderSeen.map((n) => graph.nodes[n].label).join(' → ')}.`, {
    visited: [...visited],
    path: orderSeen.slice(),
  })
  return frames
    ? graphScene({
        title: 'BFS — queue wavefront',
        subtitle: `${problem && problem.title ? problem.title : 'Graph'} · first example`,
        pattern: 'graph-bfs',
        nodes: graph.nodes,
        edges: graph.edges,
        frames,
      })
    : null
}

function genGraphDfs(params, problem) {
  const shape = graphShape(problem, params)
  if (!shape) return null
  if (shape.type === 'grid') return gridDfsFrames(shape.grid)
  const graph = compactGraph(buildGraphFromShape(shape))
  if (graph.nodes.length < 2) return null
  const adjacency = Array.from({ length: graph.nodes.length }, () => [])
  for (const [a, b] of graph.edges) {
    if (a === b) continue
    if (!adjacency[a].includes(b)) adjacency[a].push(b)
    if (!adjacency[b].includes(a)) adjacency[b].push(a)
  }
  for (const row of adjacency) row.sort((a, b) => a - b)
  const bag = new Bag()
  const visited = new Set()
  const path = []
  bag.add('input', `Graph with ${graph.nodes.length} nodes, ${graph.edges.length} edges.${graph.truncated ? ' Showing the first 26 nodes.' : ''}`, {})
  bag.add('seed', `DFS from node 0; stack = [0].`, { frontier: [0], queue: [0], distances: { 0: 0 } })
  const dfsDist = { 0: 0 }
  const visit = (node) => {
    visited.add(node)
    path.push(node)
    bag.add(`enter ${graph.nodes[node].label}`, `Path = ${path.map((n) => graph.nodes[n].label).join(' → ')} (depth ${path.length - 1}); visited ${visited.size}/${graph.nodes.length}.`, {
      current: node,
      visited: [...visited],
      path: path.slice(),
      queue: path.slice(),
      distances: { ...dfsDist },
    })
    for (const next of adjacency[node]) {
      if (visited.has(next)) {
        bag.add(`edge ${node}-${next}`, `${graph.nodes[next].label} already visited — skip.`, {
          current: node,
          visited: [...visited],
          path: path.slice(),
          queue: path.slice(),
          distances: { ...dfsDist },
        })
        continue
      }
      dfsDist[next] = path.length
      bag.add(`descend ${graph.nodes[next].label}`, `Follow edge ${graph.nodes[node].label} → ${graph.nodes[next].label} (push, depth ${path.length}).`, {
        current: node,
        visited: [...visited],
        path: path.slice(),
        queue: [...path, next],
        frontier: [next],
        distances: { ...dfsDist },
      })
      visit(next)
      delete dfsDist[next]
    }
    path.pop()
    bag.add('backtrack', `Back up from ${graph.nodes[node].label}; path = ${path.map((n) => graph.nodes[n].label).join(' → ') || '[]'}.`, {
      current: path.length ? path[path.length - 1] : node,
      visited: [...visited],
      path: path.slice(),
    })
  }
  visit(0)
  for (const node of graph.nodes.map((n) => n.id)) {
    if (visited.has(node)) continue
    bag.add('component', `Node ${graph.nodes[node].label} is disconnected — start a new DFS.`, {
      current: node,
      visited: [...visited],
      path: [node],
    })
    visit(node)
  }
  const frames = bag.done('done', `DFS visited ${visited.size} nodes; final path was ${path.length ? path.map((n) => graph.nodes[n].label).join(' → ') : 'empty'}.`, {
    visited: [...visited],
    path: path.slice(),
  })
  return frames
    ? graphScene({
        title: 'DFS — path + backtracking',
        subtitle: `${problem && problem.title ? problem.title : 'Graph'} · first example`,
        pattern: 'graph-dfs',
        nodes: graph.nodes,
        edges: graph.edges,
        frames,
      })
    : null
}

/* ------------------------------------------------------------------------ dp-2d -- */

function genDp2d(params, problem) {
  const strings = params.filter((p) => typeof p.value === 'string')
  const numbers = numbersParam(params, 1)
  const matrix = matrixParam(params)
  if (strings.length >= 2 && strings[0].value.length <= 12 && strings[1].value.length <= 12) {
    return editDistanceFrames(strings[0].value, strings[1].value)
  }
  if (matrix && !matrix.value.some((row) => row.some((v) => !isNum(v))) && matrix.value.length <= 12 && matrix.value[0].length <= 12) {
    return minPathSumFrames(matrix.value)
  }
  if (numbers && numbers.value.length >= 2 && numbers.value.every((v) => Number.isInteger(v) && v >= 1 && v <= 18)) {
    return uniquePathsFrames(numbers.value[0], numbers.value[1])
  }
  return null
}

function buildGridFrames({ rows, cols, compute, describe, title, subtitle, pattern, cells }) {
  const cellCount = rows * cols
  if (cellCount < 4) return null
  const totalFrames = 40
  const stepFrames = Math.min(38, Math.max(4, totalFrames - 2))
  const targets = new Set()
  if (cellCount <= stepFrames) {
    for (let i = 0; i < cellCount; i++) targets.add(i)
  } else {
    for (let k = 0; k < stepFrames; k++) targets.add(Math.round((k * (cellCount - 1)) / (stepFrames - 1)))
  }
  const ordered = [...targets].sort((a, b) => a - b)
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(0))
  const filledSet = new Set()
  const pieces = []
  let seq = 0
  let cmp = 0
  let writes = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const detail = compute(r, c, dp)
      dp[r][c] = detail.value
      writes++
      const reads = Array.isArray(detail.reads) ? detail.reads : []
      cmp += Number.isFinite(detail.cmp) ? detail.cmp : reads.length
      if (ordered.includes(seq)) {
        filledSet.add(r * cols + c)
        const cellsSnapshot = Array.from({ length: rows }, (_, rr) =>
          Array.from({ length: cols }, (_, cc) => (filledSet.has(rr * cols + cc) ? dp[rr][cc] : 0)),
        )
        pieces.push({
          label: detail.label,
          note: detail.note,
          state: {
            current: [r, c],
            filled: [...filledSet].map((k) => [Math.floor(k / cols), k % cols]),
            cells: cellsSnapshot,
            reads,
            ops: { cmp, writes },
          },
        })
      }
      seq++
    }
  }
  const bag = new Bag()
  const emptyCells = Array.from({ length: rows }, () => new Array(cols).fill(0))
  bag.add('table', `${rows} × ${cols} table; fill it cell by cell.`, { cells: emptyCells })
  bag.add('base', describe.base, { cells: emptyCells })
  for (const piece of pieces) {
    bag.add(piece.label, piece.note, piece.state)
  }
  const finalCells = dp.map((row) => row.slice())
  const frames = bag.done('done', describe.conclusion, {
    filled: Array.from({ length: rows * cols }, (_, k) => [Math.floor(k / cols), k % cols]),
    cells: finalCells,
    current: [rows - 1, cols - 1],
    answer: [rows - 1, cols - 1],
    ops: { cmp, writes },
  })
  return frames
    ? gridScene({
        title,
        subtitle,
        pattern,
        rows,
        cols,
        cells: cells || dp.map((row) => row.slice()),
        frames,
      })
    : null
}

function editDistanceFrames(a, b) {
  if (!a.length || !b.length) return null
  const rows = a.length + 1
  const cols = b.length + 1
  const frames = buildGridFrames({
    rows,
    cols,
    pattern: 'dp-2d',
    title: 'Edit Distance — 2D DP table',
    subtitle: `"${clipText(a, 12)}" → "${clipText(b, 12)}"`,
    cells: Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => (r === 0 ? c : c === 0 ? r : 0))),
    compute: (r, c, dp) => {
      let value
      let reads
      let cmp
      if (r === 0) {
        value = c
        reads = []
        cmp = 0
      } else if (c === 0) {
        value = r
        reads = []
        cmp = 0
      } else if (a[r - 1] === b[c - 1]) {
        value = dp[r - 1][c - 1]
        reads = [[r - 1, c - 1]]
        cmp = 1
      } else {
        value = 1 + Math.min(dp[r - 1][c - 1], dp[r - 1][c], dp[r][c - 1])
        reads = [[r - 1, c - 1], [r - 1, c], [r, c - 1]]
        cmp = 3
      }
      return {
        value,
        reads,
        cmp,
        label: `dp[${r}][${c}] = ${value}`,
        note:
          r === 0
            ? `First row: turning "" into "${b.slice(0, c)}" needs ${c} insert(s).`
            : c === 0
              ? `First column: deleting ${r} char(s) from "${a.slice(0, r)}".`
              : a[r - 1] === b[c - 1]
                ? `'${a[r - 1]}' = '${b[c - 1]}' → carry dp[${r - 1}][${c - 1}] = ${value}.`
                : `'${a[r - 1]}' ≠ '${b[c - 1]}' → 1 + min(${dp[r - 1][c - 1]}, ${dp[r - 1][c]}, ${dp[r][c - 1]}) = ${value}.`,
      }
    },
    describe: {
      base: 'Base cases: first row and first column are edit counts from an empty prefix.',
      conclusion: `Edit distance is ${editableDistance(a, b)} (bottom-right cell).`,
    },
  })
  return frames
}

function editableDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, r) => Array.from({ length: b.length + 1 }, (_, c) => (r === 0 ? c : c === 0 ? r : 0)))
  for (let r = 1; r <= a.length; r++) {
    for (let c = 1; c <= b.length; c++) {
      dp[r][c] = a[r - 1] === b[c - 1] ? dp[r - 1][c - 1] : 1 + Math.min(dp[r - 1][c - 1], dp[r - 1][c], dp[r][c - 1])
    }
  }
  return dp[a.length][b.length]
}

function minPathSumFrames(matrix) {
  const rows = matrix.length
  const cols = matrix[0].length
  if (rows * cols < 4) return null
  return buildGridFrames({
    rows,
    cols,
    pattern: 'dp-2d',
    title: 'Minimum Path Sum — 2D DP',
    subtitle: `${rows} × ${cols} grid, moves only right/down`,
    cells: matrix.map((row) => row.slice()),
    compute: (r, c, dp) => {
      const cost = matrix[r][c]
      let value
      let reads
      let cmp
      if (r === 0 && c === 0) {
        value = cost
        reads = []
        cmp = 0
      } else if (r === 0) {
        value = dp[r][c - 1] + cost
        reads = [[r, c - 1]]
        cmp = 0
      } else if (c === 0) {
        value = dp[r - 1][c] + cost
        reads = [[r - 1, c]]
        cmp = 0
      } else {
        value = Math.min(dp[r - 1][c], dp[r][c - 1]) + cost
        reads = [[r - 1, c], [r, c - 1]]
        cmp = 1
      }
      return {
        value,
        reads,
        cmp,
        label: `dp[${r}][${c}] = ${value}`,
        note:
          r === 0 && c === 0
            ? `Start cell costs ${cost}.`
            : r === 0
              ? `Only from the left: ${dp[r][c - 1]} + ${cost} = ${value}.`
              : c === 0
                ? `Only from above: ${dp[r - 1][c]} + ${cost} = ${value}.`
                : `min(${dp[r - 1][c]}, ${dp[r][c - 1]}) + ${cost} = ${value}.`,
      }
    },
    describe: {
      base: 'Each cell adds its grid cost to the cheaper of the cell above / to the left.',
      conclusion: `Cheapest path to the bottom-right costs ${matrix.reduce((acc, row) => acc + row[0], 0) >= 0 ? minPathSumValue(matrix) : 0}.`,
    },
  })
}

function minPathSumValue(matrix) {
  const rows = matrix.length
  const cols = matrix[0].length
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(0))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dp[r][c] = r === 0 && c === 0 ? matrix[r][c] : r === 0 ? dp[r][c - 1] + matrix[r][c] : c === 0 ? dp[r - 1][c] + matrix[r][c] : Math.min(dp[r - 1][c], dp[r][c - 1]) + matrix[r][c]
    }
  }
  return dp[rows - 1][cols - 1]
}

function uniquePathsFrames(m, n) {
  const rows = Math.max(1, Math.round(m))
  const cols = Math.max(1, Math.round(n))
  if (rows * cols < 4) return null
  return buildGridFrames({
    rows,
    cols,
    pattern: 'dp-2d',
    title: 'Unique Paths — 2D DP',
    subtitle: `A ${rows} × ${cols} board; moves right/down only`,
    cells: Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => (r === 0 || c === 0 ? 1 : 0))),
    compute: (r, c, dp) => {
      const edge = r === 0 || c === 0
      const value = edge ? 1 : dp[r - 1][c] + dp[r][c - 1]
      return {
        value,
        reads: edge ? [] : [[r - 1, c], [r, c - 1]],
        cmp: 0,
        label: `dp[${r}][${c}] = ${value}`,
        note:
          r === 0 || c === 0
            ? `Edge cell: exactly one path (straight line).`
            : `Paths from above (${dp[r - 1][c]}) + from left (${dp[r][c - 1]}) = ${value}.`,
      }
    },
    describe: {
      base: 'Top row and left column each have exactly one path.',
      conclusion: `There are ${uniquePathCount(rows, cols)} unique paths across the ${rows} × ${cols} board.`,
    },
  })
}

function uniquePathCount(m, n) {
  const dp = Array.from({ length: m }, () => new Array(n).fill(1))
  for (let r = 1; r < m; r++) for (let c = 1; c < n; c++) dp[r][c] = dp[r - 1][c] + dp[r][c - 1]
  return dp[m - 1][n - 1]
}

/* ------------------------------------------------------------------------ dp-1d -- */

function genDp1d(params, problem) {
  const hints = `${(problem && problem.slug) || ''} ${(problem && problem.title) || ''}`.toLowerCase()
  const numbers = numbersParam(params, 2)
  const amountP = numberParam(params, 1, 200)
  const singleP = numberParam(params, 1, 60)
  if (numbers && numbers.value.length >= 2) {
    const values = numbers.value.slice(0, 20)
    if (/stock|buy-and-sell/.test(hints)) return stockProfitFrames(values)
    if (/robber|house/.test(hints)) return houseRobberFrames(values)
    if (/subsequence|\blis\b/.test(hints)) return lisFrames(values)
    if (/coin/.test(hints) && amountP) return coinChangeFrames(values.slice(0, 8), Math.round(amountP.value))
    if (!/coin/.test(hints) && amountP && !values.includes(amountP.value)) return coinChangeFrames(values.slice(0, 8), Math.round(amountP.value))
    return lisFrames(values)
  }
  if (singleP) {
    const n = Math.round(singleP.value)
    if (/pascal/.test(hints)) return pascalRowFrames(n)
    return climbStairsFrames(n)
  }
  return null
}

function climbStairsFrames(n) {
  if (n < 2 || n > 30) return null
  const bag = new Bag()
  const finalDp = [1, 1]
  for (let i = 2; i <= n; i++) finalDp.push(finalDp[i - 1] + finalDp[i - 2])
  const snapshot = (upTo) => finalDp.slice(0, Math.max(1, upTo + 1))
  bag.add('input', `${n} stairs; each step climbs 1 or 2.`, {})
  bag.add('base 0', 'dp[0] = 1 — one way to stand at the bottom.', { values: snapshot(0) })
  bag.add('base 1', 'dp[1] = 1 — one way to reach the first stair.', { values: snapshot(1) })
  if (n === 2) bag.add('plan', 'dp[2] = dp[1] + dp[0] = 2 ways.', { values: snapshot(1) })
  for (let i = 2; i <= n; i++) {
    bag.add(`dp[${i}]`, `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${finalDp[i - 1]} + ${finalDp[i - 2]} = ${finalDp[i]}.`, {
      pointers: { i, prev: i - 1, prev2: i - 2 },
      highlights: { [String(i)]: 'accent', [String(i - 1)]: 'ok', [String(i - 2)]: 'ok' },
      values: snapshot(i),
      ops: { cmp: 0, writes: i + 1 },
    })
    bag.add(`verify ${i}`, `Ways to reach stair ${i}: ${finalDp[i]}.`, {
      pointers: { i },
      highlights: { [String(i)]: 'ok' },
      values: snapshot(i),
      ops: { cmp: 0, writes: i + 1 },
    })
  }
  const frames = bag.done('answer', `There are ${finalDp[n]} distinct ways to climb ${n} stairs.`, {
    pointers: { i: n },
    highlights: { [String(n)]: 'ok' },
    values: finalDp,
  })
  return frames
    ? arrayScene({
        title: 'Climbing Stairs — 1D DP',
        subtitle: `n = ${n}`,
        pattern: 'dp-1d',
        values: finalDp,
        frames,
      })
    : null
}

function stockProfitFrames(prices) {
  const n = prices.length
  if (n < 2) return null
  const bag = new Bag()
  let minPrice = prices[0]
  let best = 0
  const profits = new Array(n).fill(0)
  bag.add('input', `${n} daily prices; buy before you sell, maximise one profit.`, {})
  bag.add('base', `Cheapest price so far = ${minPrice} (day 0). Profit = 0.`, {
    pointers: { day: 0 },
    values: profits.slice(),
  })
  bag.add('plan', 'For each day: update the cheapest buy, then check today\'s profit.', {
    pointers: { day: 0 },
    values: profits.slice(),
  })
  for (let day = 1; day < n; day++) {
    const cheaper = prices[day] < minPrice
    if (cheaper) minPrice = prices[day]
    bag.add(
      `day ${day}`,
      cheaper ? `Price ${prices[day]} is a new cheapest buy (min = ${minPrice}).` : `Price ${prices[day]} is not cheaper than ${minPrice}.`,
      {
        pointers: { day },
        highlights: { [String(day)]: cheaper ? 'accent' : 'dim' },
        values: profits.slice(),
      },
    )
    const profit = prices[day] - minPrice
    if (profit > best) best = profit
    profits[day] = best
    bag.add(`profit ${profit}`, `Sell at ${prices[day]} − buy at ${minPrice} = ${profit}; best = ${best}.`, {
      pointers: { day },
      highlights: { [String(day)]: profit === best && profit > 0 ? 'ok' : 'warn' },
      values: profits.slice(),
    })
  }
  const frames = bag.done('answer', `Best single trade profit is ${best}.`, {
    highlights: highlightIndices(profits.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0).slice(-1), 'ok'),
    values: profits.slice(),
  })
  return frames
    ? arrayScene({
        title: 'Best Time to Buy and Sell — 1D DP',
        subtitle: 'Track the cheapest buy so far',
        pattern: 'dp-1d',
        values: prices,
        frames,
      })
    : null
}

function houseRobberFrames(values) {
  const n = values.length
  if (n < 2) return null
  const bag = new Bag()
  const dp = new Array(n).fill(0)
  bag.add('input', `${n} houses; robbing two adjacent houses is illegal.`, {})
  dp[0] = values[0]
  dp[1] = Math.max(values[0], values[1])
  bag.add('base', `dp[0] = ${dp[0]} (rob house 0); dp[1] = ${dp[1]} (best of house 0 / 1).`, {
    pointers: { i: 1 },
    values: dp.slice(0, 2),
  })
  bag.add('plan', 'dp[i] = max(dp[i - 1], dp[i - 2] + nums[i]).', { pointers: { i: 1 }, values: dp.slice(0, 2) })
  for (let i = 2; i < n; i++) {
    const skip = dp[i - 1]
    const take = dp[i - 2] + values[i]
    dp[i] = Math.max(skip, take)
    bag.add(`i = ${i}`, `Rob house ${i} (${values[i]}) + dp[${i - 2}] = ${take}; skip → ${skip}; dp[${i}] = ${dp[i]}.`, {
      pointers: { i, prev: i - 1, prev2: i - 2 },
      highlights: { [String(i)]: 'accent', [String(i - 2)]: 'ok', [String(i - 1)]: 'warn' },
      values: dp.slice(0, i + 1),
      ops: { cmp: i - 1, writes: i + 1 },
    })
    bag.add(`check ${i}`, `Best loot through house ${i}: ${dp[i]}.`, {
      pointers: { i },
      highlights: { [String(i)]: 'ok' },
      values: dp.slice(0, i + 1),
      ops: { cmp: i - 1, writes: i + 1 },
    })
  }
  const frames = bag.done('answer', `Maximum loot is ${dp[n - 1]} without robbing adjacent houses.`, {
    pointers: { i: n - 1 },
    highlights: { [String(n - 1)]: 'ok' },
    values: dp.slice(),
  })
  return frames
    ? arrayScene({
        title: 'House Robber — 1D DP',
        subtitle: 'Take or skip each house',
        pattern: 'dp-1d',
        values,
        frames,
      })
    : null
}

function pascalRowFrames(numRows) {
  if (numRows < 2 || numRows > 12) return null
  const bag = new Bag()
  let row = [1]
  bag.add('input', `Build Pascal's triangle one row at a time (${numRows} rows).`, {})
  bag.add('row 1', 'Row 1 = [1].', { values: row.slice() })
  bag.add('plan', 'Each new row: 1, then the sum of adjacent values, then 1.', { values: row.slice() })
  for (let r = 2; r <= numRows; r++) {
    const next = [1]
    for (let i = 1; i < row.length; i++) next.push(row[i - 1] + row[i])
    next.push(1)
    bag.add(`row ${r}`, `Row ${r} has ${next.length} values; inner sums come from row ${r - 1}.`, {
      values: next.slice(),
    })
    bag.add(`check row ${r}`, `Row ${r} = [${next.join(', ')}].`, { values: next.slice() })
    row = next
  }
  const frames = bag.done('answer', `Row ${numRows} = [${row.join(', ')}].`, { values: row.slice() })
  return frames
    ? arrayScene({
        title: "Pascal's Triangle — rolling row",
        subtitle: `numRows = ${numRows}`,
        pattern: 'dp-1d',
        values: row.slice(),
        frames,
      })
    : null
}

function lisFrames(values) {
  const bag = new Bag()
  const n = values.length
  const dp = new Array(n).fill(1)
  const snapshot = () => dp.slice()
  bag.add('input', `${n} values; dp[i] = length of the longest increasing subsequence ending at i.`, {})
  bag.add('base', 'Every single value is an increasing subsequence of length 1.', { values: snapshot() })
  let best = 1
  let lisCmp = 0
  for (let i = 0; i < n; i++) {
    let predecessor = -1
    for (let j = 0; j < i; j++) {
      lisCmp++
      if (values[j] < values[i] && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1
        predecessor = j
      }
    }
    best = Math.max(best, dp[i])
    bag.add(`i = ${i}`, `nums[${i}] = ${values[i]}: best predecessor ${predecessor >= 0 ? `index ${predecessor} (dp ${dp[predecessor]})` : 'none'} → dp[${i}] = ${dp[i]}.`, {
      pointers: { i, ...(predecessor >= 0 ? { prev: predecessor } : {}) },
      highlights: { [String(i)]: 'accent', ...(predecessor >= 0 ? { [String(predecessor)]: 'ok' } : {}) },
      values: snapshot(),
      ops: { cmp: lisCmp, writes: i + 1 },
    })
    bag.add(`check dp`, `Current LIS length = ${best}.`, {
      pointers: { i },
      highlights: highlightIndices(
        dp.map((v, k) => (v === best ? k : -1)).filter((k) => k >= 0),
        'ok',
      ),
      values: snapshot(),
      ops: { cmp: lisCmp, writes: i + 1 },
    })
  }
  const frames = bag.done('answer', `Longest increasing subsequence has length ${best}.`, {
    highlights: highlightIndices(
      dp.map((v, k) => (v === best ? k : -1)).filter((k) => k >= 0),
      'ok',
    ),
    values: dp.slice(),
  })
  return frames
    ? arrayScene({
        title: 'LIS — 1D DP',
        subtitle: 'dp[i] = best length ending at i',
        pattern: 'dp-1d',
        values,
        frames,
      })
    : null
}

function coinChangeFrames(coins, amount) {
  const bag = new Bag()
  const dp = new Array(amount + 1).fill(amount + 1)
  dp[0] = 0
  const snapshot = () => dp.slice()
  bag.add('input', `Coins [${coins.join(', ')}], amount ${amount}; dp[a] = fewest coins for a.`, { values: snapshot() })
  bag.add('base', 'dp[0] = 0; everything else starts at amount + 1 (unreachable).', { values: snapshot() })
  let updates = 0
  for (const coin of coins) {
    for (let a = coin; a <= amount; a++) {
      const candidate = dp[a - coin] + 1
      if (candidate < dp[a]) {
        dp[a] = candidate
        bag.add(`coin ${coin}, a = ${a}`, `dp[${a}] = dp[${a - coin}] + 1 = ${candidate}.`, {
          pointers: { a },
          highlights: { [String(a)]: 'accent' },
          values: snapshot(),
        })
        updates++
      }
    }
    bag.add(`after coin ${coin}`, `Coin ${coin} processed (${updates} updates so far).`, {
      values: snapshot(),
    })
  }
  const answer = dp[amount] > amount ? -1 : dp[amount]
  const frames = bag.done('answer', answer >= 0 ? `Fewest coins to make ${amount} is ${answer}.` : `Amount ${amount} cannot be made from [${coins.join(', ')}].`, {
    pointers: { a: amount },
    highlights: { [String(amount)]: answer >= 0 ? 'ok' : 'bad' },
    values: snapshot(),
  })
  return frames
    ? arrayScene({
        title: 'Coin Change — 1D DP',
        subtitle: `amount = ${amount}`,
        pattern: 'dp-1d',
        values: snapshot(),
        frames,
      })
    : null
}

/* --------------------------------------------------------------------- linked-list -- */

function genLinkedList(params, problem) {
  const hints = `${(problem && problem.slug) || ''} ${(problem && problem.title) || ''}`.toLowerCase()
  const lists = listParams(params)
  if (lists.length === 1) {
    const values = lists[0].slice(0, 20)
    if (values.length < 2) return null
    return reverseListFrames(values)
  }
  if (lists.length === 2) {
    const a = lists[0].slice(0, 12)
    const b = lists[1].slice(0, 12)
    if (a.length < 2 || b.length < 2) return null
    if (/merge|add-two|sorted/.test(hints) || a.length + b.length <= 20) return mergeTwoListsFrames(a, b)
  }
  return null
}

function mergeTwoListsFrames(a, b) {
  const merged = []
  let i = 0
  let j = 0
  const plan = []
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) {
      merged.push(a[i++])
      plan.push({ value: a[i - 1], from: 'a', i, j })
    } else {
      merged.push(b[j++])
      plan.push({ value: b[j - 1], from: 'b', i, j })
    }
  }
  while (i < a.length) {
    merged.push(a[i++])
    plan.push({ value: a[i - 1], from: 'a', i, j })
  }
  while (j < b.length) {
    merged.push(b[j++])
    plan.push({ value: b[j - 1], from: 'b', i, j })
  }
  const bag = new Bag()
  bag.add('input', `Merge two sorted lists: [${a.join(', ')}] and [${b.join(', ')}].`, { values: [] })
  bag.add('heads', `Compare heads ${a[0]} and ${b[0]}; append the smaller one.`, { values: [] })
  for (let k = 0; k < plan.length; k++) {
    const step = plan[k]
    const partial = merged.slice(0, k + 1)
    bag.add(`append ${step.value}`, `List ${step.from === 'a' ? '1' : '2'}: ${step.value} was the smaller head → merged = [${partial.join(', ')}].`, {
      pointers: { merged: k },
      highlights: { [String(k)]: 'accent' },
      values: partial,
    })
    if (k + 1 < plan.length) {
      bag.add('advance', `Heads now: ${step.i < a.length ? a[step.i] : '∅'} (list 1) and ${step.j < b.length ? b[step.j] : '∅'} (list 2).`, {
        pointers: { merged: k },
        highlights: { [String(k)]: 'ok' },
        values: partial,
      })
    }
  }
  const frames = bag.done('merged', `Merged list: [${merged.join(', ')}].`, {
    pointers: { merged: merged.length - 1 },
    highlights: { [String(merged.length - 1)]: 'ok' },
    values: merged.slice(),
  })
  return frames
    ? linkedListScene({
        title: 'Merge Two Sorted Lists',
        subtitle: 'Compare heads, append the smaller',
        pattern: 'linked-list',
        values: merged.slice(),
        frames,
      })
    : null
}

function reverseListFrames(values) {
  const bag = new Bag()
  const n = values.length
  bag.add('input', `Linked list of ${n} nodes: ${values.join(' → ')} → null.`, {})
  bag.add('setup', 'prev = null, curr = head; rewire each next pointer as we walk.', {})
  let prev = -1
  let curr = 0
  for (let step = 0; step < n; step++) {
    const next = curr + 1 < n ? curr + 1 : -1
    bag.add(`curr = ${curr}`, `Node ${values[curr]}: next would be ${next >= 0 ? values[next] : 'null'}; prev is ${prev >= 0 ? values[prev] : 'null'}.`, {
      pointers: { curr, ...(prev >= 0 ? { prev } : {}), ...(next >= 0 ? { next } : {}) },
      highlights: { [String(curr)]: 'accent', ...(prev >= 0 ? { [String(prev)]: 'ok' } : {}) },
    })
    bag.add(`rewire ${values[curr]}`, `Point node ${values[curr]} backwards at ${prev >= 0 ? values[prev] : 'null'}.`, {
      pointers: { curr, ...(prev >= 0 ? { prev } : {}) },
      highlights: { [String(curr)]: 'ok', ...(prev >= 0 ? { [String(prev)]: 'accent' } : {}) },
      removed: next >= 0 ? [next] : [],
    })
    prev = curr
    curr = next
    if (curr < 0) break
  }
  const reversed = values.slice().reverse()
  const frames = bag.done('reversed', `New head is ${reversed[0]}; list reads ${[...reversed, 'null'].join(' → ')}.`, {
    pointers: { head: n - 1 },
    highlights: { [String(n - 1)]: 'ok' },
  })
  return frames
    ? linkedListScene({
        title: 'Reverse Linked List — pointer shuffle',
        subtitle: 'prev / curr / next rewiring',
        pattern: 'linked-list',
        values,
        frames,
      })
    : null
}

/* ------------------------------------------------------------------------- tree-dfs -- */

function genTreeDfs(params, problem) {
  const treeP = treeParam(params)
  if (!treeP) return null
  const tree = P.treeOf(treeP.value)
  if (!tree || tree.nodes.length < 3) return null
  const nodes = tree.nodes.slice(0, 31)
  const nodeIds = new Set(nodes.map((n) => n.id))
  const edges = tree.edges.filter(([a, b]) => nodeIds.has(a) && nodeIds.has(b))
  const children = new Map()
  nodes.forEach((node) => children.set(node.id, []))
  for (const [parent, child] of edges) children.get(parent).push(child)
  const bag = new Bag()
  const visited = new Set()
  const path = []
  bag.add('input', `Tree with ${nodes.length} nodes; DFS visits a node, then its children.`, {})
  bag.add('seed', 'Call preorder(root); path starts empty.', { frontier: [tree.rootId] })
  const visit = (id) => {
    visited.add(id)
    path.push(id)
    const node = nodes.find((n) => n.id === id)
    const kids = children.get(id) || []
    bag.add(`enter ${node.value}`, `Visit node ${node.value}; path = ${path.map((p) => nodes.find((n) => n.id === p).value).join(' → ')}.`, {
      current: id,
      visited: [...visited],
      path: path.slice(),
      frontier: kids.slice(),
    })
    for (const child of kids) {
      const childNode = nodes.find((n) => n.id === child)
      bag.add(`inspect child ${childNode.value}`, `Child ${childNode.value} exists — descend.`, {
        current: id,
        visited: [...visited],
        path: path.slice(),
        frontier: [child],
      })
      visit(child)
      bag.add(`return ${node.value}`, `Back at node ${node.value}; remaining children: ${kids.slice(kids.indexOf(child) + 1).length}.`, {
        current: id,
        visited: [...visited],
        path: path.slice(),
      })
    }
    path.pop()
    bag.add(`exit ${node.value}`, `All children explored — leave node ${node.value}.`, {
      current: path.length ? path[path.length - 1] : id,
      visited: [...visited],
      path: path.slice(),
    })
  }
  visit(tree.rootId)
  const preorder = nodes.map((n) => n.value)
  const frames = bag.done('done', `Visited ${visited.size} nodes in preorder: ${preorder.slice(0, 10).join(', ')}${preorder.length > 10 ? ', …' : ''}.`, {
    visited: [...visited],
    path: [],
  })
  return frames
    ? treeScene({
        title: 'Tree DFS — path + backtracking',
        subtitle: 'Preorder walk',
        pattern: 'tree-dfs',
        nodes: nodes.map((n) => ({ id: n.id, value: n.value })),
        edges,
        rootId: tree.rootId,
        frames,
      })
    : null
}

/* ------------------------------------------------------------------------- tree-bfs -- */

function genTreeBfs(params, problem) {
  const treeP = treeParam(params)
  if (!treeP) return null
  const tree = P.treeOf(treeP.value)
  if (!tree || tree.nodes.length < 3) return null
  const nodes = tree.nodes.slice(0, 31)
  const nodeIds = new Set(nodes.map((n) => n.id))
  const edges = tree.edges.filter(([a, b]) => nodeIds.has(a) && nodeIds.has(b))
  const children = new Map()
  nodes.forEach((node) => children.set(node.id, []))
  for (const [parent, child] of edges) children.get(parent).push(child)
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const bag = new Bag()
  const visited = new Set()
  const queue = [tree.rootId]
  bag.add('input', `Tree with ${nodes.length} nodes; BFS processes one level at a time.`, {})
  bag.add('seed', `Queue = [${byId.get(tree.rootId).value}] — start at the root.`, { frontier: [tree.rootId] })
  let guard = 0
  while (queue.length && guard++ < 80) {
    const levelSize = queue.length
    const level = queue.slice()
    for (let k = 0; k < levelSize; k++) {
      const id = queue.shift()
      visited.add(id)
      const node = byId.get(id)
      bag.add(`visit ${node.value}`, `Dequeue ${node.value}; visited ${visited.size}/${nodes.length}.`, {
        current: id,
        visited: [...visited],
        frontier: queue.slice(),
        path: level.slice(),
      })
      const kids = (children.get(id) || []).filter((child) => !visited.has(child))
      if (kids.length) {
        queue.push(...kids)
        bag.add(`enqueue children`, `${kids.map((c) => byId.get(c).value).join(', ')} join the queue (size ${queue.length}).`, {
          current: id,
          visited: [...visited],
          frontier: queue.slice(),
        })
      }
    }
  }
  const frames = bag.done('done', `All ${visited.size} nodes visited level by level.`, {
    visited: [...visited],
    path: [],
  })
  return frames
    ? treeScene({
        title: 'Tree BFS — level order',
        subtitle: 'Queue grows by level',
        pattern: 'tree-bfs',
        nodes: nodes.map((n) => ({ id: n.id, value: n.value })),
        edges,
        rootId: tree.rootId,
        frames,
      })
    : null
}

/* ----------------------------------------------------------------------- heap-topk -- */

function genHeapTopk(params, problem) {
  const numbers = numbersParam(params, 2)
  const kP = numberParam(params, 1, 32)
  if (!numbers || !kP) return null
  const values = numbers.value.slice(0, 20)
  const k = Math.min(Math.round(kP.value), values.length)
  return topKFrames(values, k)
}

function topKFrames(values, k) {
  const bag = new Bag()
  const heap = []
  let heapCmp = 0
  const push = (value) => {
    heap.push(value)
    let i = heap.length - 1
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2)
      heapCmp++
      if (heap[parent] <= heap[i]) break
      ;[heap[parent], heap[i]] = [heap[i], heap[parent]]
      i = parent
    }
  }
  const popMin = () => {
    const top = heap[0]
    const last = heap.pop()
    if (heap.length && last !== undefined) {
      heap[0] = last
      let i = 0
      for (;;) {
        const left = i * 2 + 1
        const right = left + 1
        let smallest = i
        if (left < heap.length) {
          heapCmp++
          if (heap[left] < heap[smallest]) smallest = left
        }
        if (right < heap.length) {
          heapCmp++
          if (heap[right] < heap[smallest]) smallest = right
        }
        if (smallest === i) break
        ;[heap[i], heap[smallest]] = [heap[smallest], heap[i]]
        i = smallest
      }
    }
    return top
  }
  bag.add('input', `Find the ${k} largest of [${values.join(', ')}] with a min-heap of size ${k}.`, { values: [] })
  bag.add('empty heap', 'Heap starts empty.', { values: [] })
  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    push(value)
    bag.add(`push ${value}`, `Heap (min on top) = [${heap.join(', ')}]; parent ≤ children holds.`, {
      highlights: { [String(heap.indexOf(value))]: 'accent' },
      values: heap.slice(),
      ops: { cmp: heapCmp, writes: i + 1 },
    })
    if (heap.length > k) {
      const removed = popMin()
      bag.add(`evict ${removed}`, `Heap exceeded ${k} → remove smallest (${removed}); heap = [${heap.join(', ')}].`, {
        highlights: { '0': 'bad' },
        values: heap.slice(),
        ops: { cmp: heapCmp, writes: i + 1 },
      })
    }
    bag.add(`i = ${i}`, `Processed ${i + 1} of ${values.length} values.`, { values: heap.slice(), ops: { cmp: heapCmp, writes: i + 1 } })
  }
  const sortedStill = heap.slice().sort((a, b) => a - b)
  const frames = bag.done('answer', `The ${k} largest values are [${sortedStill.join(', ')}]; the kth largest is ${sortedStill[0]}.`, {
    values: heap.slice(),
    highlights: { '0': 'ok' },
  })
  return frames
    ? arrayScene({
        title: 'Top K — min-heap of size k',
        subtitle: `k = ${k}`,
        pattern: 'heap-topk',
        values: heap.slice(),
        frames,
      })
    : null
}

/* ------------------------------------------------------------------------ intervals -- */

function genIntervals(params, problem) {
  const matrix = matrixParam(params)
  if (!matrix) return null
  const intervals = matrixToIntervals(matrix.value) ? matrix.value.slice(0, 16).map((row) => [row[0], row[1]]) : null
  if (!intervals) return null
  return mergeIntervalsFrames(intervals)
}

function mergeIntervalsFrames(intervals) {
  const n = intervals.length
  const order = intervals.map((iv, i) => ({ iv, i })).sort((a, b) => a.iv[0] - b.iv[0] || a.iv[1] - b.iv[1])
  const sorted = order.map((entry) => entry.iv.slice())
  const rows = n
  const cols = 2
  const cells = sorted.map((iv) => [iv[0], iv[1]])
  const bag = new Bag()
  const merged = []
  const filledRows = []
  bag.add('input', `${n} intervals; sort by start so overlaps sit next to each other.`, {})
  bag.add('sorted', `Order by start: ${sorted.map((iv) => `[${iv[0]},${iv[1]}]`).join(' ')}.`, {})
  for (let i = 0; i < sorted.length; i++) {
    const [start, end] = sorted[i]
    bag.add(`interval ${i}`, `Consider [${start}, ${end}].`, {
      current: [i, 0],
      filled: filledRows.slice(),
    })
    if (merged.length && start <= merged[merged.length - 1][1]) {
      const previous = merged[merged.length - 1]
      const prevEnd = previous[1]
      const extended = Math.max(prevEnd, end)
      previous[1] = extended
      bag.add(`merge ${i}`, `[${start}, ${end}] overlaps [${previous[0]}, ${prevEnd}] (${start} ≤ ${prevEnd}) → extend to [${previous[0]}, ${extended}].`, {
        current: [i, 1],
        filled: filledRows.slice(),
        ops: { cmp: i + 1, writes: merged.length },
      })
    } else {
      merged.push([start, end])
      filledRows.push(i)
      bag.add(`keep ${i}`, `No overlap → start a new block [${start}, ${end}].`, {
        current: [i, 0],
        filled: filledRows.slice(),
      })
    }
  }
  const frames = bag.done('merged', `Merged intervals: ${merged.map((iv) => `[${iv[0]},${iv[1]}]`).join(' ')}.`, {
    filled: Array.from({ length: n }, (_, i) => [i, 0]),
  })
  // Show the merged result's first column values in the final frame's cells snapshot.
  const finalCells = cells.map((row, i) => row.slice())
  const finalState = { filled: Array.from({ length: n }, (_, i) => [i, 0]), cells: finalCells }
  frames[frames.length - 1].state = { ...frames[frames.length - 1].state, ...finalState }
  return frames
    ? gridScene({
        title: 'Merge Intervals — sort + sweep',
        subtitle: 'Each row is [start, end]',
        pattern: 'intervals',
        rows,
        cols,
        cells,
        frames,
      })
    : null
}

/* ----------------------------------------------------------------------- union-find -- */

function genUnionFind(params, problem) {
  const matrix = matrixParam(params)
  const numP = numberParam(params, 1, 60)
  if (!matrix) return null
  let edges = matrixToEdges(matrix.value)
  if (!edges) return null
  let n = numP ? Math.round(numP.value) : edges.reduce((max, [a, b]) => Math.max(max, a + 1, b + 1), 0)
  if (n <= 0 || n > 30) return null
  edges = edges.filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n).slice(0, 60)
  if (edges.length < 2) return null
  return unionFindScene(n, edges)
}

function unionFindScene(n, edges) {
  const parent = Array.from({ length: n }, (_, i) => i)
  const rank = new Array(n).fill(0)
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }
  const nodes = Array.from({ length: n }, (_, id) => ({ id, label: String(id) }))
  const bag = new Bag()
  const componentNodes = new Map()
  for (let i = 0; i < n; i++) componentNodes.set(i, [i])
  const parentSnap = () => Object.fromEntries(parent.map((p, i) => [i, p]))
  bag.add('input', `${n} nodes, ${edges.length} edges; each node starts in its own set.`, {})
  bag.add('parent', `parent = [${parent.join(', ')}] — no unions yet.`, { visited: nodes.map((node) => node.id), parent: parentSnap() })
  let components = n
  for (const [a, b] of edges) {
    const ra = find(a)
    const rb = find(b)
    if (ra === rb) {
      bag.add(`cycle ${a}-${b}`, `find(${a}) = find(${b}) = ${ra} → edge closes a cycle; path compression already flattened both.`, {
        current: a,
        visited: componentNodes.get(ra) ? componentNodes.get(ra).slice() : [ra],
        cycle: [a, b],
        path: [a, b],
        parent: parentSnap(),
      })
      continue
    }
    if (rank[ra] < rank[rb]) {
      parent[ra] = rb
      const moved = componentNodes.get(ra) || []
      componentNodes.set(rb, [...(componentNodes.get(rb) || []), ...moved])
      componentNodes.delete(ra)
    } else if (rank[ra] > rank[rb]) {
      parent[rb] = ra
      const moved = componentNodes.get(rb) || []
      componentNodes.set(ra, [...(componentNodes.get(ra) || []), ...moved])
      componentNodes.delete(rb)
    } else {
      parent[rb] = ra
      rank[ra]++
      const moved = componentNodes.get(rb) || []
      componentNodes.set(ra, [...(componentNodes.get(ra) || []), ...moved])
      componentNodes.delete(rb)
    }
    components--
    bag.add(`union ${a}-${b}`, `Roots ${ra} and ${rb} merge (union by rank); parent = [${parent.join(', ')}], components = ${components}.`, {
      current: a,
      visited: (componentNodes.get(find(a)) || []).slice(),
      path: [a, b],
      parent: parentSnap(),
    })
  }
  const frames = bag.done('result', `${components} connected component${components === 1 ? '' : 's'} remain after ${edges.length} unions.`, {
    visited: nodes.map((node) => node.id),
  })
  return frames
    ? graphScene({
        title: 'Union-Find — merge components',
        subtitle: 'Ranks + path compression',
        pattern: 'union-find',
        nodes,
        edges,
        frames,
      })
    : null
}

/* ---------------------------------------------------------------------------- trie -- */

function genTrie(params, problem) {
  const wordsP = stringsParam(params, 2)
  if (!wordsP) return null
  const words = wordsP.value.map((w) => String(w)).filter((w) => w.length > 0).slice(0, 6)
  if (words.length < 2 || words.some((w) => w.length > 6)) return null
  const nodes = [{ id: 0, value: 0, label: '•' }]
  const edges = []
  const lookup = new Map([['', 0]])
  const bag = new Bag()
  bag.add('input', `Insert ${words.length} words into a prefix tree: ${words.join(', ')}.`, {})
  bag.add('empty', 'Trie starts with only a root node.', { current: 0, path: [0] })
  for (let w = 0; w < words.length; w++) {
    const word = words[w]
    let nodeId = 0
    const path = [0]
    for (let i = 0; i < word.length; i++) {
      const prefix = word.slice(0, i + 1)
      let nextId = lookup.get(prefix)
      if (nextId === undefined) {
        nextId = nodes.length
        nodes.push({ id: nextId, value: 0, label: word[i] })
        edges.push([nodeId, nextId])
        lookup.set(prefix, nextId)
      }
      nodeId = nextId
      path.push(nodeId)
      bag.add(`word ${w + 1} char ${word[i]}`, `Prefix "${prefix}" ${lookup.has(prefix) ? 'exists' : 'created'}; visit '${word[i]}'.`, {
        current: nodeId,
        visited: path.slice(),
        path: path.slice(),
      })
    }
    bag.add(`insert ${word}`, `"${word}" ends at node ${nodeId}.`, {
      current: nodeId,
      visited: path.slice(),
      path: path.slice(),
    })
  }
  const frames = bag.done('done', `Trie holds ${nodes.length} nodes covering ${words.length} words; shared prefixes merged.`, {
    current: 0,
    visited: nodes.map((node) => node.id),
    path: [],
  })
  return frames
    ? treeScene({
        title: 'Trie — shared prefixes',
        subtitle: 'Each edge appends one character',
        pattern: 'trie',
        nodes,
        edges,
        rootId: 0,
        frames,
      })
    : null
}

/* ------------------------------------------------------------------ backtracking -- */

function genBacktracking(params, problem) {
  const hints = `${(problem && problem.slug) || ''} ${(problem && problem.title) || ''}`.toLowerCase()
  const numbers = numbersParam(params, 1)
  const stringP = stringParam(params, 1)
  const isPerm = /permut/.test(hints)
  if (numbers && numbers.value.length >= 2) {
    const values = numbers.value.slice(0, isPerm ? 4 : 5)
    if (values.length < 2) return null
    if (isPerm && numbers.value.length <= 4) return permuteFrames(numbers.value.slice(0, 4))
    if (!isPerm && numbers.value.length <= 5) return subsetFrames(values)
    // Input too large to draw honestly: demonstrate on the leading slice and say so.
    if (isPerm) return permuteFrames(values, numbers.value.length)
    return subsetFrames(values, numbers.value.length)
  }
  if (stringP && stringP.value.length >= 2 && stringP.value.length <= 5) {
    return subsetFrames([...stringP.value], 0, `chars "${stringP.value}"`)
  }
  return null
}

function subsetFrames(values, fullLength = 0, name = '') {
  const n = values.length
  const bag = new Bag()
  const nodes = [{ id: 0, value: 0, label: '[]' }]
  const edges = []
  const recorded = []
  const label = (subset) => `[${subset.join(', ')}]`
  bag.add('input', `Decide for each of ${fullLength || n} item${(fullLength || n) === 1 ? '' : 's'}${fullLength > n ? ` (drawing the first ${n})` : ''}: take it or skip it.`, {})
  bag.add('root', 'Start with the empty subset; one level per item.', { current: 0, path: [0] })
  let nextId = 1
  const visit = (index, subset, nodeId, stack) => {
    if (index >= n) {
      recorded.push({ subset: subset.slice(), nodeId })
      bag.add(`record ${label(subset)}`, `No items left → record subset ${label(subset)} (${recorded.length} so far).`, {
        current: nodeId,
        visited: recorded.map((entry) => entry.nodeId),
        path: stack.slice(),
      })
      return
    }
    // Take values[index].
    const takeId = nextId++
    const takeSubset = [...subset, values[index]]
    nodes.push({ id: takeId, value: 0, label: label(takeSubset) })
    edges.push([nodeId, takeId])
    bag.add(`choose ${values[index]}`, `Take ${name ? '' : ''}${values[index]} → ${label(takeSubset)}.`, {
      current: takeId,
      path: [...stack, takeId],
      frontier: [],
    })
    visit(index + 1, takeSubset, takeId, [...stack, takeId])
    bag.add(`un-choose ${values[index]}`, `Back up: remove ${values[index]}, try skipping it.`, {
      current: nodeId,
      path: stack.slice(),
      frontier: [],
    })
    // Skip values[index].
    const skipId = nextId++
    nodes.push({ id: skipId, value: 0, label: label(subset) })
    edges.push([nodeId, skipId])
    bag.add(`skip ${values[index]}`, `Skip ${values[index]} → still ${label(subset)}.`, {
      current: skipId,
      path: [...stack, skipId],
      frontier: [],
    })
    visit(index + 1, subset, skipId, [...stack, skipId])
    bag.add('backtrack', `Both choices for ${values[index]} explored — back up.`, {
      current: nodeId,
      path: stack.slice(),
    })
  }
  visit(0, [], 0, [0])
  const frames = bag.done('done', `${recorded.length} subset${recorded.length === 1 ? '' : 's'}: ${recorded.slice(0, 6).map((entry) => label(entry.subset)).join(' ')}${recorded.length > 6 ? ' …' : ''}.`, {
    current: 0,
    visited: nodes.map((node) => node.id),
    path: [],
  })
  return frames
    ? treeScene({
        title: 'Subsets — choose / skip tree',
        subtitle: 'Left = take, right = skip; the path is the recursion stack',
        pattern: 'backtracking',
        nodes,
        edges,
        rootId: 0,
        frames,
      })
    : null
}

function permuteFrames(values, fullLength = 0) {
  const n = values.length
  const bag = new Bag()
  const nodes = [{ id: 0, value: 0, label: '[]' }]
  const edges = []
  const recorded = []
  const used = new Array(n).fill(false)
  bag.add('input', `Order ${fullLength || n} item${(fullLength || n) === 1 ? '' : 's'}${fullLength > n ? ` (drawing the first ${n})` : ''}: pick an unused one per level.`, {})
  bag.add('root', 'Empty prefix; each level fixes one more position.', { current: 0, path: [0] })
  let nextId = 1
  const visit = (prefix, nodeId, stack) => {
    if (prefix.length === n) {
      recorded.push(prefix.slice())
      bag.add(`record [${prefix.join(', ')}]`, `All positions fixed → record [${prefix.join(', ')}] (${recorded.length} so far).`, {
        current: nodeId,
        path: stack.slice(),
      })
      return
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue
      used[i] = true
      const childId = nextId++
      const child = [...prefix, values[i]]
      nodes.push({ id: childId, value: 0, label: `[${child.join(', ')}]` })
      edges.push([nodeId, childId])
      bag.add(`choose ${values[i]}`, `Position ${prefix.length}: pick ${values[i]} → [${child.join(', ')}].`, {
        current: childId,
        path: [...stack, childId],
      })
      visit(child, childId, [...stack, childId])
      used[i] = false
      bag.add(`un-choose ${values[i]}`, `Back up: free ${values[i]} for other branches.`, {
        current: nodeId,
        path: stack.slice(),
      })
    }
  }
  visit([], 0, [0])
  const frames = bag.done('done', `${recorded.length} permutation${recorded.length === 1 ? '' : 's'}: ${recorded.slice(0, 4).map((p) => `[${p.join(', ')}]`).join(' ')}${recorded.length > 4 ? ' …' : ''}.`, {
    current: 0,
    visited: nodes.map((node) => node.id),
    path: [],
  })
  return frames
    ? treeScene({
        title: 'Permutations — choice tree',
        subtitle: 'The highlighted path is choose → explore → un-choose',
        pattern: 'backtracking',
        nodes,
        edges,
        rootId: 0,
        frames,
      })
    : null
}

/* ------------------------------------------------------------------ dispatch table -- */

GENERATORS['arrays-hashing'] = genArraysHashing
GENERATORS['two-pointers'] = genTwoPointers
GENERATORS['sliding-window'] = genSlidingWindow
GENERATORS['binary-search'] = genBinarySearch
GENERATORS['stack'] = genStack
GENERATORS['monotonic-stack'] = genMonotonicStack
GENERATORS['graph-bfs'] = genGraphBfs
GENERATORS['graph-dfs'] = genGraphDfs
GENERATORS['dp-2d'] = genDp2d
GENERATORS['dp-1d'] = genDp1d
GENERATORS['linked-list'] = genLinkedList
GENERATORS['tree-dfs'] = genTreeDfs
GENERATORS['tree-bfs'] = genTreeBfs
GENERATORS['heap-topk'] = genHeapTopk
GENERATORS['intervals'] = genIntervals
GENERATORS['union-find'] = genUnionFind
GENERATORS['trie'] = genTrie
GENERATORS['backtracking'] = genBacktracking

/**
 * Build a scene for a problem record. Returns null for unsupported patterns or unusable
 * input — never throws.
 */
export function buildScene(problem, options) {
  try {
    if (!isObj(problem)) return null
    const pattern = primaryPattern(problem)
    const generator = GENERATORS[pattern]
    if (!generator) return null
    const paramSets = extractParamSets(problem, pattern)
    for (const params of paramSets) {
      if (!Array.isArray(params) || params.length === 0) continue
      try {
        const scene = generator(params, problem, options || {})
        if (scene) return scene
      } catch {
        /* try the next param set */
      }
    }
    return null
  } catch {
    return null
  }
}

export { PATTERN_IDS as PATTERNS }
