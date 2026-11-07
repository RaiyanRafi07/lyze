/**
 * LeetCode Lab — engine literal parser.
 *
 * Dependency-free, pure, synchronous. Understands the literal dialect LeetCode uses for
 * example inputs / judge args:
 *   arrays, nested arrays, objects, quoted strings, single-char literals, true/false/null,
 *   integers, dotted floats, signed numbers and exponents.
 *
 * This module must never be the reason a pattern generator throws: every unsafe API has a
 * `tryParse*` sibling that reports `{ ok, value, error }` instead of throwing.
 */

const NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/

class ParseError extends Error {
  constructor(message, position) {
    super(position === undefined ? message : `${message} (at ${position})`)
    this.name = 'ParseError'
    this.position = position
  }
}

/* ------------------------------------------------------------------ low level parser -- */

function makeReader(source) {
  const s = String(source === undefined || source === null ? '' : source)
  let i = 0

  const fail = (message, at = i) => {
    throw new ParseError(message, at)
  }

  const skip = () => {
    while (i < s.length) {
      const c = s[i]
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v') i++
      else break
    }
  }

  const parseStringBody = (quote) => {
    i++ // opening quote
    let out = ''
    while (i < s.length) {
      const c = s[i]
      if (c === '\\') {
        const n = s[i + 1]
        i += 2
        if (n === 'n') out += '\n'
        else if (n === 't') out += '\t'
        else if (n === 'r') out += '\r'
        else if (n === 'b') out += '\b'
        else if (n === 'f') out += '\f'
        else if (n === 'u') {
          const hex = s.slice(i, i + 4)
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail('bad unicode escape')
          out += String.fromCharCode(parseInt(hex, 16))
          i += 4
        } else if (n === undefined) {
          fail('unterminated escape')
        } else {
          out += n
        }
      } else if (c === quote) {
        i++
        return out
      } else {
        out += c
        i++
      }
    }
    return fail('unterminated string', i - out.length)
  }

  const parseArray = () => {
    i++ // [
    const out = []
    skip()
    if (s[i] === ']') {
      i++
      return out
    }
    for (;;) {
      out.push(parseValue())
      skip()
      if (s[i] === ',') {
        i++
        continue
      }
      if (s[i] === ']') {
        i++
        return out
      }
      fail("expected ',' or ']'")
    }
  }

  const parseObject = () => {
    i++ // {
    const out = {}
    skip()
    if (s[i] === '}') {
      i++
      return out
    }
    for (;;) {
      skip()
      let key
      if (s[i] === '"' || s[i] === "'") key = parseStringBody(s[i])
      else {
        const start = i
        while (i < s.length && !/[\s:,{}[\]]/.test(s[i])) i++
        key = s.slice(start, i)
        if (!key) fail('expected object key')
      }
      skip()
      if (s[i] !== ':') fail("expected ':'")
      i++
      out[key] = parseValue()
      skip()
      if (s[i] === ',') {
        i++
        continue
      }
      if (s[i] === '}') {
        i++
        return out
      }
      fail("expected ',' or '}'")
    }
  }

  const parseAtom = () => {
    const start = i
    while (i < s.length && !/[\s,\]}]/.test(s[i])) i++
    const raw = s.slice(start, i)
    if (!raw) fail('expected a value')
    const lower = raw.toLowerCase()
    if (lower === 'null') return null
    if (lower === 'undefined') return null
    if (lower === 'true') return true
    if (lower === 'false') return false
    if (lower === 'infinity' || lower === '+infinity') return Infinity
    if (lower === '-infinity') return -Infinity
    if (lower === 'nan') return NaN
    if (NUMBER_RE.test(raw)) return Number(raw)
    // Bare words are tolerated as strings ("abc", "true-ish"); quoted strings are canonical.
    return raw
  }

  const parseValue = () => {
    skip()
    if (i >= s.length) fail('unexpected end of input')
    const c = s[i]
    if (c === '[') return parseArray()
    if (c === '{') return parseObject()
    if (c === '"' || c === "'") return parseStringBody(c)
    return parseAtom()
  }

  const end = () => {
    skip()
    return i
  }

  return { s, parseValue, end, get position() { return i }, fail }
}

/** Parse one literal. Throws `ParseError` on malformed input. */
export function parseLiteral(source) {
  const reader = makeReader(source)
  const value = reader.parseValue()
  const rest = reader.end()
  if (rest < reader.s.length) reader.fail('trailing characters')
  return value
}

/** Parse one literal without throwing. */
export function tryParseLiteral(source) {
  try {
    return { ok: true, value: parseLiteral(source) }
  } catch (error) {
    return { ok: false, value: undefined, error: String((error && error.message) || error) }
  }
}

/** Split a whole input string such as `nums = [2,7,11,15], target = 9`. */
export function parseSequence(source) {
  const text = String(source === undefined || source === null ? '' : source)
  const reader = makeReader(text)
  const values = []
  reader.parseValue()
  // `parseValue` above only validates the first; re-walk with a proper list parse.
  const out = []
  let pos = 0
  const cast = makeReader(text)
  // Walk top-level values separated by commas, reusing the reader internals.
  cast.end()
  // Simpler and predictable: wrap the source in brackets and parse it as one array.
  const wrapped = tryParseLiteral(`[${text}]`)
  if (wrapped.ok && Array.isArray(wrapped.value)) return wrapped.value
  // A single literal without commas.
  const single = tryParseLiteral(text)
  if (single.ok) return [single.value]
  throw new ParseError(single.error || 'could not parse sequence')
}

/* ------------------------------------------------------------ example input parsing -- */

/** Split on a separator that is not inside brackets/braces/quotes. */
export function splitTopLevel(text, separator = ',') {
  const s = String(text === undefined || text === null ? '' : text)
  const parts = []
  let depth = 0
  let quote = ''
  let start = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (quote) {
      if (c === '\\') i++
      else if (c === quote) quote = ''
      continue
    }
    if (c === '"' || c === "'") {
      quote = c
      continue
    }
    if (c === '[' || c === '{' || c === '(') depth++
    else if (c === ']' || c === '}' || c === ')') depth = Math.max(0, depth - 1)
    else if (depth === 0 && c === separator) {
      parts.push(s.slice(start, i))
      start = i + 1
    }
  }
  parts.push(s.slice(start))
  return parts
}

/** Find the first top-level `=` in a segment; returns -1 when absent. */
function topLevelEquals(segment) {
  let depth = 0
  let quote = ''
  for (let i = 0; i < segment.length; i++) {
    const c = segment[i]
    if (quote) {
      if (c === '\\') i++
      else if (c === quote) quote = ''
      continue
    }
    if (c === '"' || c === "'") {
      quote = c
      continue
    }
    if (c === '[' || c === '{') depth++
    else if (c === ']' || c === '}') depth = Math.max(0, depth - 1)
    else if (depth === 0 && c === '=') return i
  }
  return -1
}

/** Strip the `Input:` prefix and any `Output:`/`Explanation:` tail from raw example text. */
export function cleanExampleInput(source) {
  let text = String(source === undefined || source === null ? '' : source).trim()
  if (!text) return ''
  const inputMatch = text.match(/input\s*:\s*([\s\S]*?)(?:\n\s*(?:output|explanation|note)\s*:|$)/i)
  if (inputMatch && inputMatch[1]) return inputMatch[1].trim()
  // Also tolerate a bare "Input:" prefix without a newline before it.
  text = text.replace(/^\s*input\s*:\s*/i, '')
  return text.trim()
}

/**
 * Parse a LeetCode example input string into named args.
 * Supports `nums = [2,7], target = 9` and bare literals.
 * Returns `{ ok, args: [{ name, value }], error }` — never throws.
 */
export function parseExampleInput(source) {
  try {
    const text = cleanExampleInput(source)
    if (!text) return { ok: false, error: 'empty example input', args: [] }
    const parts = splitTopLevel(text, ',').map((p) => p.trim()).filter(Boolean)
    if (parts.length === 0) return { ok: false, error: 'empty example input', args: [] }
    const args = []
    for (const part of parts) {
      const eq = topLevelEquals(part)
      if (eq >= 0) {
        const name = part.slice(0, eq).trim()
        const raw = part.slice(eq + 1).trim()
        const parsed = tryParseLiteral(raw)
        if (!parsed.ok) return { ok: false, error: parsed.error, args: [] }
        args.push({ name, value: parsed.value, raw })
      } else {
        const parsed = tryParseLiteral(part)
        if (!parsed.ok) return { ok: false, error: parsed.error, args: [] }
        args.push({ name: '', value: parsed.value, raw: part })
      }
    }
    return { ok: true, args }
  } catch (error) {
    return { ok: false, error: String((error && error.message) || error), args: [] }
  }
}

/* ------------------------------------------------------------------ type dispatch -- */

const NUMBER_TYPES = new Set(['int', 'long', 'double', 'float', 'short', 'byte'])
const NUMBER_ARRAY_TYPES = new Set(['int[]', 'long[]', 'double[]', 'float[]'])
const STRING_ARRAY_TYPES = new Set(['string[]', 'char[]'])

/** Best-effort type inference from a parsed JS value (used when no signature exists). */
export function inferType(value) {
  if (value === null || value === undefined) return 'unknown'
  if (typeof value === 'number') return 'int'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'string') return 'string'
  if (Array.isArray(value)) {
    if (value.length === 0) return 'int[]'
    const allNumbers = value.every((v) => typeof v === 'number')
    if (allNumbers) return 'int[]'
    const allStrings = value.every((v) => typeof v === 'string')
    if (allStrings) return value.every((v) => v.length <= 1) ? 'char[]' : 'string[]'
    const allArrays = value.every((v) => Array.isArray(v))
    if (allArrays) {
      const flat = value.flat()
      if (flat.every((v) => typeof v === 'number')) return 'int[][]'
      if (flat.every((v) => typeof v === 'string')) return flat.every((v) => v.length <= 1) ? 'char[][]' : 'string[][]'
      return 'int[][]'
    }
    return 'int[]'
  }
  return 'unknown'
}

/** Convert arbitrary parsed data to a flat number array (returns [] when impossible). */
export function toNumberArray(value) {
  if (!Array.isArray(value)) return []
  return value.map((v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN))
}

/** Convert arbitrary parsed data to a 2D array when possible. */
export function toMatrix(value) {
  if (!Array.isArray(value) || value.length === 0) return null
  if (!value.every((row) => Array.isArray(row))) return null
  return value
}

/** Convert parsed data to an array of strings (chars allowed). */
export function toStringArray(value) {
  if (!Array.isArray(value)) return []
  return value.map((v) => (typeof v === 'string' ? v : String(v)))
}

/* --------------------------------------------------------------- tree / list build -- */

/**
 * Build a tree from LeetCode's level-order array (nulls are missing children).
 * Returns `{ rootId, nodes: [{ id, value }], edges: [[parent, child]] }` or null.
 */
export function treeFromLevel(values) {
  if (!Array.isArray(values) || values.length === 0) return null
  if (values[0] === null || values[0] === undefined) return null
  const nodes = [{ id: 0, value: values[0] }]
  const edges = []
  const queue = [0]
  let pos = 1
  while (queue.length > 0 && pos < values.length) {
    const parent = queue.shift()
    for (let side = 0; side < 2 && pos < values.length; side++) {
      const raw = values[pos++]
      if (raw === null || raw === undefined) continue
      const id = nodes.length
      nodes.push({ id, value: raw })
      edges.push([parent, id])
      queue.push(id)
    }
  }
  return { rootId: 0, nodes, edges }
}

/** Build a plain array of values a linked list literal represents. */
export function listFromValues(value) {
  if (value === null || value === undefined) return []
  if (Array.isArray(value)) {
    return value.map((v) => (v === null || v === undefined ? 0 : v))
  }
  if (typeof value === 'object' && Array.isArray(value.values)) return value.values.slice()
  return []
}

/**
 * Type-directed parsing of one raw argument literal.
 * Returns `{ ok, value }` where value depends on the declared type:
 *   ListNode → `{ values: number[] }`, TreeNode → `{ tree, values }`, otherwise plain JS data.
 */
export function tryParseParamLiteral(raw, type) {
  try {
    const t = String(type === undefined || type === null ? '' : type).trim()
    if (raw === undefined || raw === null) return { ok: false, error: 'missing argument' }
    const text = String(raw).trim()
    if (text === '' || text.toLowerCase() === 'undefined') return { ok: false, error: 'empty argument' }
    const parsed = tryParseLiteral(text)
    if (!parsed.ok) return { ok: false, error: parsed.error }
    let value = parsed.value
    if (t === 'ListNode') return { ok: true, value: { values: listFromValues(value) } }
    if (t === 'TreeNode') {
      const tree = treeFromLevel(Array.isArray(value) ? value : [])
      if (!tree) return { ok: false, error: 'empty tree' }
      return { ok: true, value: { tree, values: value.slice() } }
    }
    if (t === 'void') return { ok: true, value: null }
    if (NUMBER_TYPES.has(t)) {
      const n = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(n)) return { ok: false, error: `not a ${t}: ${text}` }
      return { ok: true, value: n }
    }
    if (t === 'boolean') {
      if (typeof value === 'boolean') return { ok: true, value }
      if (value === 'true') return { ok: true, value: true }
      if (value === 'false') return { ok: true, value: false }
      return { ok: false, error: 'not a boolean' }
    }
    if (t === 'string') return { ok: true, value: value === null ? '' : String(value) }
    if (t === 'char') return { ok: true, value: Array.isArray(value) ? String(value[0] ?? '') : String(value) }
    if (NUMBER_ARRAY_TYPES.has(t)) {
      if (!Array.isArray(value)) return { ok: false, error: `not ${t}` }
      const nums = value.map((v) => (typeof v === 'number' ? v : v === null ? NaN : Number(v)))
      if (nums.some((n) => !Number.isFinite(n))) return { ok: false, error: `array has a non-number (${t})` }
      return { ok: true, value: nums }
    }
    if (STRING_ARRAY_TYPES.has(t)) {
      if (!Array.isArray(value)) return { ok: false, error: `not ${t}` }
      return { ok: true, value: value.map((v) => String(v)) }
    }
    if (t === 'int[][]' || t === 'long[][]' || t === 'double[][]') {
      const m = toMatrix(value)
      if (!m) return { ok: false, error: `not ${t}` }
      return { ok: true, value: m }
    }
    if (t === 'char[][]' || t === 'string[][]') {
      const m = toMatrix(value)
      if (!m) return { ok: false, error: `not ${t}` }
      return { ok: true, value: m.map((row) => row.map((v) => String(v))) }
    }
    if (t === 'boolean[]') {
      if (!Array.isArray(value)) return { ok: false, error: 'not boolean[]' }
      return { ok: true, value: value.map((v) => Boolean(v)) }
    }
    return { ok: true, value }
  } catch (error) {
    return { ok: false, error: String((error && error.message) || error) }
  }
}

/**
 * Parse all judge args for a signature. `signature = { params: [{ name, type }] }`.
 * Returns `{ ok, params: [{ name, type, value }], error }`.
 */
export function parseArgs(rawArgs, signature) {
  try {
    if (!Array.isArray(rawArgs)) return { ok: false, params: [], error: 'args not an array' }
    const declared = Array.isArray(signature && signature.params) ? signature.params : []
    const params = []
    for (let i = 0; i < rawArgs.length; i++) {
      const spec = declared[i] || {}
      const type = spec.type || inferType((tryParseLiteral(rawArgs[i]) || {}).value)
      const parsed = tryParseParamLiteral(rawArgs[i], type)
      if (!parsed.ok) return { ok: false, params: [], error: `arg ${i} (${spec.name || type}): ${parsed.error}` }
      params.push({ name: spec.name || `arg${i}`, type, value: parsed.value })
    }
    return { ok: true, params, error: '' }
  } catch (error) {
    return { ok: false, params: [], error: String((error && error.message) || error) }
  }
}

/**
 * Parse a raw example input string into typed params, using the signature for names/types
 * when it lines up by name (or by position), otherwise inferring types.
 * Returns `{ ok, params, error }`.
 */
export function parseExampleArgs(source, signature) {
  const parsed = parseExampleInput(source)
  if (!parsed.ok) return { ok: false, params: [], error: parsed.error }
  const declared = Array.isArray(signature && signature.params) ? signature.params : []
  const byName = new Map(declared.map((p) => [String(p.name || '').toLowerCase(), p]))
  const params = []
  for (let i = 0; i < parsed.args.length; i++) {
    const arg = parsed.args[i]
    const spec = (arg.name && byName.get(arg.name.toLowerCase())) || declared[i] || null
    const type = spec && spec.type ? spec.type : inferType(arg.value)
    // Trees / lists are only inferable from the pattern + name, so the caller can override
    // by passing a signature; otherwise keep the plain parsed value.
    if (type === 'TreeNode' || type === 'ListNode') {
      const coerced = tryParseParamLiteral(arg.raw, type)
      params.push({ name: arg.name || (spec && spec.name) || `arg${i}`, type, value: coerced.ok ? coerced.value : arg.value })
    } else {
      params.push({ name: arg.name || (spec && spec.name) || `arg${i}`, type, value: arg.value })
    }
  }
  return { ok: true, params, error: '' }
}

/* ------------------------------------------------------------------------ utilities -- */

/** Coerce one param value to a number array (handles `{ values }` wrappers). */
export function numbersOf(value) {
  if (Array.isArray(value)) return toNumberArray(value)
  if (value && typeof value === 'object' && Array.isArray(value.values)) return toNumberArray(value.values)
  return []
}

/** Coerce one param value to a matrix. */
export function matrixOf(value) {
  if (Array.isArray(value)) return toMatrix(value)
  return null
}

/** Coerce a param to its tree record (if it is one). */
export function treeOf(value) {
  if (value && typeof value === 'object' && value.tree) return value.tree
  if (Array.isArray(value)) return treeFromLevel(value)
  return null
}

/** Coerce a param to a flat list of values (linked-list literal). */
export function listOf(value) {
  if (value && typeof value === 'object' && Array.isArray(value.values) && !Array.isArray(value)) return value.values.slice()
  if (Array.isArray(value)) return listFromValues(value)
  return []
}

export { ParseError }
