/**
 * LeetCode Lab — engine scene builders + normalizer.
 *
 * One place that owns CONTRACTS.md §4: every kind's layout, its per-frame state, and the
 * defensive normalization the renderer relies on (clamp bad indices, drop unknown colors,
 * skip unknown kinds). Pure, dependency-free, DOM-free — importable from Node and browser.
 *
 * The renderer also understands optional *additive* frame-state fields used by the
 * pattern generators to show progressive computation honestly:
 *   - array / string : `state.values` / `state.chars` — snapshot of what the columns hold now
 *   - grid           : `state.cells` — snapshot of the DP/matrix table at this frame
 *   - array / string : `state.counts` — {char: count} frequency table (sliding-window invariant)
 *   - array / string : `state.stack` — indices currently held in an auxiliary stack
 *                      (monotonic-stack candidates); `state.resolved` — {index: answerValue}
 *                      for popped elements whose answer is now known
 *   - tree / graph   : `state.distances` — {id: distance} BFS levels / Dijkstra costs
 *   - tree / graph   : `state.queue` — ordered frontier contents for the queue/stack sidebar
 *   - tree / graph   : `state.parent` — {id: parentId} union-find forest edges
 *   - grid           : `state.reads` — cells the recurrence read to compute `current` (dp-2d)
 *   - grid           : `state.answer` — the cell holding the final answer (dp-2d)
 *   - array / string / grid / stack : `state.ops` — {cmp, writes} cumulative operation counts
 *   - array / string : `state.vars` — {name: number|string} live variable cards
 *   - array / string : `state.lookup` — {from, key, hit} one map query (badge + stem)
 * Scenes without them (e.g. AI-authored) behave exactly per contract.
 */

export const SCENE_VERSION = 1

export const KINDS = Object.freeze(['array', 'string', 'linked-list', 'tree', 'graph', 'grid', 'stack'])
const KIND_SET = new Set(KINDS)

export const COLOR_NAMES = Object.freeze(['accent', 'ok', 'warn', 'bad', 'dim', 'path', 'cyan', 'purple', 'pink', 'muted'])
const COLOR_SET = new Set(COLOR_NAMES)

export const DEFAULT_CAMERA = Object.freeze({ yaw: 0.62, pitch: 0.34, dist: 9.5 })
const HALF_PI = Math.PI / 2

/* ------------------------------------------------------------------------ utilities -- */

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const arr = (v) => (Array.isArray(v) ? v : [])
const str = (v, fallback = '') => (typeof v === 'string' ? v : v === undefined || v === null ? fallback : String(v))

export function clipText(value, max) {
  const s = String(value === undefined || value === null ? '' : value)
    .replace(/\s+/g, ' ')
    .trim()
  if (s.length <= max) return s
  return s.slice(0, Math.max(0, max - 1)) + '…'
}

function num(value, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value
}

function clampInt(value, lo, hi, fallback = lo) {
  const n = Math.round(num(value, NaN))
  if (!Number.isFinite(n)) return fallback
  return clamp(n, lo, hi)
}

/** Return an in-range integer index for `value`, or null. */
export function indexInRange(value, length) {
  const n = Math.round(num(value, NaN))
  if (!Number.isFinite(n) || length <= 0) return null
  if (n < 0 || n >= length) return null
  return n
}

/** Clamp a coordinate pair `[r, c]` into a rows×cols grid, or null. */
export function cellInGrid(value, rows, cols) {
  if (!Array.isArray(value) || value.length < 2) return null
  const r = Math.round(num(value[0], NaN))
  const c = Math.round(num(value[1], NaN))
  if (!Number.isFinite(r) || !Number.isFinite(c)) return null
  if (rows <= 0 || cols <= 0) return null
  if (r < 0 || r >= rows || c < 0 || c >= cols) return null
  return [r, c]
}

export function normalizeColorName(value, fallback = 'accent') {
  const s = String(value === undefined || value === null ? '' : value).toLowerCase()
  return COLOR_SET.has(s) ? s : fallback
}

function safeName(value, fallback) {
  const s = clipText(value, 14)
  return s || fallback
}

function cameraOf(camera, fallback = DEFAULT_CAMERA) {
  const c = isObj(camera) ? camera : {}
  return {
    yaw: clamp(num(c.yaw, fallback.yaw), -2.7, 2.7),
    pitch: clamp(num(c.pitch, fallback.pitch), -0.32, 1.25),
    dist: clamp(num(c.dist, fallback.dist), 4.5, 24),
  }
}

/* ------------------------------------------------------------------- layout helpers -- */

/**
 * Layered-plane tree layout: y by depth, x by in-order slot, z receding with depth so the
 * perspective camera reads the hierarchy as stacked planes. Mutates nothing.
 * Returns new node objects with x/y/z set.
 */
export function layoutTree(nodes, edges, rootId) {
  const list = arr(nodes)
    .filter((n) => isObj(n))
    .map((n) => ({ ...n }))
  if (list.length === 0) return { nodes: [], edges: [] }
  const ids = list.map((n) => n.id)
  const keyOf = (id) => String(id)
  const has = new Map(list.map((n) => [keyOf(n.id), n]))
  const children = new Map(list.map((n) => [keyOf(n.id), []]))
  const parents = new Map()
  const cleanEdges = []
  for (const edge of arr(edges)) {
    if (!Array.isArray(edge) || edge.length < 2) continue
    const a = edge[0]
    const b = edge[1]
    if (!has.has(keyOf(a)) || !has.has(keyOf(b)) || keyOf(a) === keyOf(b)) continue
    if (parents.has(keyOf(b))) continue // first parent wins (malformed tree safety)
    children.get(keyOf(a)).push(b)
    parents.set(keyOf(b), a)
    cleanEdges.push([a, b])
  }
  let root = rootId !== undefined && rootId !== null && has.has(keyOf(rootId)) ? rootId : null
  if (root === null) root = ids.find((id) => !parents.has(keyOf(id)))
  if (root === undefined || root === null) root = ids[0]

  // Depth via BFS from the root, then any unreachable nodes join as a second layer.
  const depth = new Map()
  const queue = [root]
  depth.set(keyOf(root), 0)
  while (queue.length) {
    const id = queue.shift()
    for (const child of children.get(keyOf(id)) || []) {
      const k = keyOf(child)
      if (!depth.has(k)) {
        depth.set(k, depth.get(keyOf(id)) + 1)
        queue.push(child)
      }
    }
  }
  let extraDepth = 0
  for (const id of ids) {
    const k = keyOf(id)
    if (!depth.has(k)) {
      extraDepth = Math.max(extraDepth, 1)
      depth.set(k, Math.max(1, ...Array.from(depth.values())) + extraDepth * 0.6)
    }
  }

  // Tidy-tree x placement: leaves take sequential slots, every parent sits on the midline
  // of its children. Reads much better in perspective than a naive pre-order spread.
  const xByKey = new Map()
  const visited = new Set()
  let leafSlot = 0
  const place = (id) => {
    const k = keyOf(id)
    if (visited.has(k)) return xByKey.get(k) || 0
    visited.add(k)
    const kids = (children.get(k) || []).filter((c) => !visited.has(keyOf(c)))
    const childXs = []
    for (const child of kids) childXs.push(place(child))
    let x
    if (childXs.length === 0) x = leafSlot++
    else x = childXs.reduce((a, b) => a + b, 0) / childXs.length
    xByKey.set(k, x)
    return x
  }
  // Place the root's component first, then any detached components side by side.
  place(root)
  for (const id of ids) if (!visited.has(keyOf(id))) place(id)

  // A single-child chain has no siblings to spread against, so the tidy layout stacks it
  // into one vertical line. Drift each only child sideways — alternating per depth — so a
  // skewed tree reads diagonally in perspective instead of as a column of dots.
  const drifted = new Map(xByKey)
  const driftedSeen = new Set([keyOf(root)])
  const driftQueue = [[root, xByKey.get(keyOf(root)) || 0]]
  while (driftQueue.length > 0) {
    const [id, parentX] = driftQueue.shift()
    const kids = (children.get(keyOf(id)) || []).filter((child) => !driftedSeen.has(keyOf(child)))
    for (const child of kids) driftedSeen.add(keyOf(child))
    if (kids.length === 1) {
      const childKey = keyOf(kids[0])
      const depthOf = depth.get(childKey) || 1
      const nextX = parentX + (depthOf % 2 === 0 ? 0.62 : -0.62)
      drifted.set(childKey, nextX)
      driftQueue.push([kids[0], nextX])
    } else {
      for (const child of kids) driftQueue.push([child, drifted.get(keyOf(child)) || 0])
    }
  }
  for (const [key, value] of drifted) xByKey.set(key, value)

  const leafCount = Math.max(1, leafSlot)
  const spacing = leafCount <= 1 ? 1.36 : Math.min(1.36, 9.2 / (leafCount - 1))
  let minX = Infinity
  let maxX = -Infinity
  for (const id of ids) {
    const x = (xByKey.get(keyOf(id)) || 0) * spacing
    xByKey.set(keyOf(id), x)
    if (x < minX) minX = x
    if (x > maxX) maxX = x
  }
  const center = Number.isFinite(minX) ? (minX + maxX) / 2 : 0

  return {
    nodes: list.map((n) => {
      const k = keyOf(n.id)
      const d = depth.get(k) || 0
      return {
        ...n,
        x: (xByKey.get(k) || 0) - center,
        y: 1.15 - d * 1.28,
        z: -d * 0.72 + (Math.round(xByKey.get(k) / Math.max(0.01, spacing)) % 2 === 0 ? 0.16 : -0.16),
      }
    }),
    edges: cleanEdges,
  }
}

/** Fibonacci-sphere positions for n graph nodes — an even, orb-like 3D shell. */
export function layoutSphere(count, radius) {
  const n = Math.max(0, Math.round(num(count, 0)))
  const r = radius === undefined ? (n <= 6 ? 1.85 : n <= 12 ? 2.2 : 2.6) : num(radius, 2.2)
  const out = []
  if (n === 0) return out
  if (n === 1) return [{ x: 0, y: 0, z: 0 }]
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i
    out.push({ x: Math.cos(theta) * ring * r, y: y * r, z: Math.sin(theta) * ring * r })
  }
  return out
}

/** Layout objects for a grid (renderer uses these constants too). */
export function gridMetrics(rows, cols) {
  const r = Math.max(1, Math.round(num(rows, 1)))
  const c = Math.max(1, Math.round(num(cols, 1)))
  const step = Math.min(1.25, 10.5 / Math.max(r, c, 1))
  return { rows: r, cols: c, step, width: (c - 1) * step, depth: (r - 1) * step }
}

/* -------------------------------------------------------------- state normalizers -- */

function normalizePointers(raw, length, maxPointers = 8) {
  const out = {}
  if (!isObj(raw) || length <= 0) return out
  let count = 0
  for (const [key, value] of Object.entries(raw)) {
    if (count >= maxPointers) break
    const idx = indexInRange(value, length)
    if (idx === null) continue
    out[safeName(key, `p${count}`)] = idx
    count++
  }
  return out
}

function normalizeHighlightMap(raw, length) {
  const out = {}
  if (!isObj(raw) || length <= 0) return out
  let count = 0
  for (const [key, value] of Object.entries(raw)) {
    if (count >= 64) break
    const idx = indexInRange(key, length)
    if (idx === null) continue
    out[String(idx)] = normalizeColorName(value, 'accent')
    count++
  }
  return out
}

function normalizeWindow(raw, length) {
  if (!Array.isArray(raw) || raw.length < 2 || length <= 0) return undefined
  let a = indexInRange(raw[0], length)
  let b = indexInRange(raw[1], length)
  if (a === null || b === null) return undefined
  if (a > b) [a, b] = [b, a]
  return [a, b]
}

function normalizeSeenMap(raw, length) {
  const out = {}
  if (!isObj(raw) || length <= 0) return out
  let count = 0
  for (const [key, value] of Object.entries(raw)) {
    if (count >= 64) break
    const idx = indexInRange(value, length)
    if (idx === null) continue
    out[clipText(key, 12)] = idx
    count++
  }
  return out
}

function normalizeValuesArray(raw, maxLength = 64, fallbackValues) {
  const list = arr(raw)
    .slice(0, maxLength)
    .map((v) => num(v, 0))
  if (list.length === 0) return undefined
  return list
}

function normalizeColumnState(kind, rawState, length, layoutValues) {
  const state = isObj(rawState) ? rawState : {}
  const out = {
    pointers: normalizePointers(state.pointers, length),
    highlights: normalizeHighlightMap(state.highlights, length),
    seen: normalizeSeenMap(state.seen, length),
  }
  const window = normalizeWindow(state.window, length)
  if (window) out.window = window
  if (typeof state.sorted === 'boolean') out.sorted = state.sorted
  const values = normalizeValuesArray(state.values)
  if (values) out.values = values
  const chars = Array.isArray(state.chars) ? state.chars.slice(0, 64).map((c) => str(c, '')) : undefined
  if (chars) out.chars = chars
  // Sliding-window frequency table: {char: count}, honest snapshot of the invariant.
  if (isObj(state.counts)) {
    const counts = {}
    let n = 0
    for (const [key, value] of Object.entries(state.counts)) {
      if (n >= 32) break
      const count = Math.round(num(value, NaN))
      if (!Number.isFinite(count) || count < 0) continue
      counts[clipText(key, 12)] = count
      n++
    }
    if (n > 0) out.counts = counts
  }
  // Auxiliary stack contents (monotonic-stack candidates): indices into the columns.
  if (Array.isArray(state.stack)) {
    const stack = []
    for (const value of state.stack) {
      const idx = indexInRange(value, length)
      if (idx !== null && !stack.includes(idx)) stack.push(idx)
      if (stack.length >= 64) break
    }
    out.stack = stack
  }
  // Popped-element resolutions: {index: answerValue}.
  if (isObj(state.resolved)) {
    const resolved = {}
    let n = 0
    for (const [key, value] of Object.entries(state.resolved)) {
      if (n >= 64) break
      const idx = indexInRange(key, length)
      if (idx === null) continue
      resolved[String(idx)] = num(value, 0)
      n++
    }
    if (n > 0) out.resolved = resolved
  }
  // Cumulative operation counts for the complexity probe.
  if (isObj(state.ops)) {
    const cmp = Math.round(num(state.ops.cmp, NaN))
    const writes = Math.round(num(state.ops.writes, NaN))
    const ops = {}
    if (Number.isFinite(cmp) && cmp >= 0) ops.cmp = Math.min(cmp, 1e9)
    if (Number.isFinite(writes) && writes >= 0) ops.writes = Math.min(writes, 1e9)
    if (Object.keys(ops).length > 0) out.ops = ops
  }
  // Variable cards: {name: number|string} values the algorithm holds *now*.
  if (isObj(state.vars)) {
    const vars = {}
    let n = 0
    for (const [key, value] of Object.entries(state.vars)) {
      if (n >= 12) break
      const name = clipText(key, 14)
      if (!name) continue
      if (typeof value === 'string') vars[name] = clipText(value, 24)
      else {
        const v = num(value, NaN)
        if (!Number.isFinite(v)) continue
        vars[name] = v
      }
      n++
    }
    if (n > 0) out.vars = vars
  }
  // Lookup probe: {from: index, key: string, hit: index|null} — one map query.
  if (isObj(state.lookup)) {
    const from = indexInRange(state.lookup.from, length)
    const key = clipText(state.lookup.key, 24)
    let hit = null
    if (state.lookup.hit !== null && state.lookup.hit !== undefined) {
      hit = indexInRange(state.lookup.hit, length)
    }
    if (from !== null && key) out.lookup = { from, key, hit }
  }
  if (kind === 'linked-list') {
    const removed = []
    for (const value of arr(state.removed)) {
      const idx = indexInRange(value, length)
      if (idx !== null && !removed.includes(idx)) removed.push(idx)
      if (removed.length >= 64) break
    }
    out.removed = removed
  }
  return out
}

function normalizeIdSets(rawState, ids) {
  const state = isObj(rawState) ? rawState : {}
  const byKey = new Map(ids.map((id) => [String(id), id]))
  const pickId = (value) => (byKey.has(String(value)) ? byKey.get(String(value)) : undefined)
  const pickList = (value) => {
    const seen = new Set()
    const out = []
    for (const item of arr(value)) {
      const id = pickId(item)
      if (id === undefined) continue
      const key = String(id)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(id)
      if (out.length >= 256) break
    }
    return out
  }
  const out = {
    current: pickId(state.current),
    visited: pickList(state.visited),
    frontier: pickList(state.frontier),
    path: pickList(state.path),
  }
  if ('cycle' in state) out.cycle = pickList(state.cycle)
  if ('dropped' in state) out.dropped = pickList(state.dropped)
  // BFS distances {id: number} — the level/cost invariant.
  if (isObj(state.distances)) {
    const distances = {}
    let n = 0
    for (const [key, value] of Object.entries(state.distances)) {
      if (n >= 256) break
      const id = pickId(key)
      if (id === undefined) continue
      const d = num(value, NaN)
      if (!Number.isFinite(d)) continue
      distances[String(id)] = d
      n++
    }
    if (n > 0) out.distances = distances
  }
  // Ordered frontier contents for the queue/stack sidebar (frontier is the set; queue is the order).
  if (Array.isArray(state.queue)) {
    const queue = []
    const seenQ = new Set()
    for (const item of state.queue) {
      const id = pickId(item)
      if (id === undefined || seenQ.has(String(id))) continue
      seenQ.add(String(id))
      queue.push(id)
      if (queue.length >= 256) break
    }
    if (queue.length > 0) out.queue = queue
  }
  // Union-find parent pointers {id: parentId} — the forest the renderer draws.
  if (isObj(state.parent)) {
    const parent = {}
    let n = 0
    for (const [key, value] of Object.entries(state.parent)) {
      if (n >= 256) break
      const id = pickId(key)
      if (id === undefined) continue
      if (value === null || value === undefined) {
        parent[String(id)] = null
        n++
        continue
      }
      const p = pickId(value)
      if (p === undefined) continue
      parent[String(id)] = p
      n++
    }
    if (n > 0) out.parent = parent
  }
  return out
}

function normalizeGridState(rawState, rows, cols) {
  const state = isObj(rawState) ? rawState : {}
  const coordSet = (value) => {
    const out = []
    const seen = new Set()
    for (const coord of arr(value)) {
      const cell = cellInGrid(coord, rows, cols)
      if (!cell) continue
      const k = `${cell[0]},${cell[1]}`
      if (seen.has(k)) continue
      seen.add(k)
      out.push(cell)
      if (out.length >= 1024) break
    }
    return out
  }
  const out = {
    filled: coordSet(state.filled),
    path: coordSet(state.path),
    blocked: coordSet(state.blocked),
    frontier: coordSet(state.frontier),
  }
  const current = cellInGrid(state.current, rows, cols)
  if (current) out.current = current
  // dp-2d dependency arrows: cells the recurrence read to compute `current`.
  const reads = coordSet(state.reads)
  if (reads.length > 0) out.reads = reads.slice(0, 8)
  // dp-2d answer cell: where the final answer lives.
  const answer = cellInGrid(state.answer, rows, cols)
  if (answer) out.answer = answer
  // Cumulative operation counts for the complexity probe.
  if (isObj(state.ops)) {
    const cmp = Math.round(num(state.ops.cmp, NaN))
    const writes = Math.round(num(state.ops.writes, NaN))
    const ops = {}
    if (Number.isFinite(cmp) && cmp >= 0) ops.cmp = Math.min(cmp, 1e9)
    if (Number.isFinite(writes) && writes >= 0) ops.writes = Math.min(writes, 1e9)
    if (Object.keys(ops).length > 0) out.ops = ops
  }
  if (Array.isArray(state.cells)) {
    const cells = []
    for (let r = 0; r < rows; r++) {
      const row = arr(state.cells[r])
      const next = []
      for (let c = 0; c < cols; c++) next.push(typeof row[c] === 'string' ? row[c] : num(row[c], 0))
      cells.push(next)
    }
    out.cells = cells
  }
  return out
}

function normalizeStackState(rawState) {
  const state = isObj(rawState) ? rawState : {}
  const items = arr(state.items)
    .slice(0, 64)
    .map((v) => (typeof v === 'string' ? clipText(v, 24) : num(v, 0)))
  const op = state.op === 'pop' || state.op === 'peek' ? state.op : 'push'
  const out = { items, op }
  if (isObj(state.ops)) {
    const cmp = Math.round(num(state.ops.cmp, NaN))
    const writes = Math.round(num(state.ops.writes, NaN))
    const ops = {}
    if (Number.isFinite(cmp) && cmp >= 0) ops.cmp = Math.min(cmp, 1e9)
    if (Number.isFinite(writes) && writes >= 0) ops.writes = Math.min(writes, 1e9)
    if (Object.keys(ops).length > 0) out.ops = ops
  }
  return out
}

function normalizeState(kind, layout, rawState) {
  if (kind === 'array' || kind === 'string' || kind === 'linked-list') {
    const length = kind === 'string' ? arr(layout.chars).length : arr(layout.values).length
    return normalizeColumnState(kind, rawState, length, layout.values)
  }
  if (kind === 'tree' || kind === 'graph') {
    return normalizeIdSets(rawState, arr(layout.nodes).map((n) => n.id))
  }
  if (kind === 'grid') return normalizeGridState(rawState, layout.rows, layout.cols)
  if (kind === 'stack') return normalizeStackState(rawState)
  return {}
}

/* ---------------------------------------------------------------- layout normalizers -- */

function normalizeColumnLayout(kind, rawLayout) {
  const layout = isObj(rawLayout) ? rawLayout : {}
  if (kind === 'string') {
    const chars = arr(layout.chars).slice(0, 64).map((c) => clipText(c, 8))
    if (chars.length === 0) return null
    return { chars }
  }
  const values = arr(layout.values)
    .slice(0, 64)
    .map((v) => num(v, 0))
  if (values.length === 0) return null
  return { values }
}

function normalizeTreeLayout(rawLayout) {
  const layout = isObj(rawLayout) ? rawLayout : {}
  const rawNodes = arr(layout.nodes)
  if (rawNodes.length === 0) return null
  const nodes = []
  const seen = new Set()
  let autoId = 0
  for (const raw of rawNodes) {
    if (!isObj(raw)) continue
    let id = raw.id
    if (id === undefined || id === null) {
      id = `n${autoId++}`
    }
    const key = String(id)
    if (seen.has(key)) continue
    seen.add(key)
    if (nodes.length >= 63) break
    nodes.push({
      id,
      value: typeof raw.value === 'string' ? clipText(raw.value, 12) : num(raw.value, 0),
      label: raw.label === undefined || raw.label === null ? undefined : clipText(raw.label, 12),
      x: num(raw.x, NaN),
      y: num(raw.y, NaN),
      z: num(raw.z, NaN),
    })
  }
  if (nodes.length === 0) return null
  const edges = []
  for (const edge of arr(layout.edges)) {
    if (!Array.isArray(edge) || edge.length < 2) continue
    if (!seen.has(String(edge[0])) || !seen.has(String(edge[1]))) continue
    if (String(edge[0]) === String(edge[1])) continue
    edges.push([edge[0], edge[1]])
    if (edges.length >= 256) break
  }
  const needsLayout = nodes.some((n) => !Number.isFinite(n.x) || !Number.isFinite(n.y))
  if (needsLayout) {
    const laid = layoutTree(nodes, edges, layout.rootId)
    const byId = new Map(laid.nodes.map((n) => [String(n.id), n]))
    for (const node of nodes) {
      const pos = byId.get(String(node.id))
      if (!pos) continue
      if (!Number.isFinite(node.x)) node.x = pos.x
      if (!Number.isFinite(node.y)) node.y = pos.y
      if (!Number.isFinite(node.z)) node.z = pos.z
    }
  }
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      value: n.value,
      ...(n.label ? { label: n.label } : {}),
      x: Number.isFinite(n.x) ? n.x : 0,
      y: Number.isFinite(n.y) ? n.y : 0,
      z: Number.isFinite(n.z) ? n.z : 0,
    })),
    edges,
    ...(layout.rootId !== undefined ? { rootId: layout.rootId } : {}),
  }
}

function normalizeGraphLayout(rawLayout) {
  const layout = isObj(rawLayout) ? rawLayout : {}
  const rawNodes = arr(layout.nodes)
  if (rawNodes.length === 0) return null
  const nodes = []
  const seen = new Set()
  for (const raw of rawNodes) {
    if (!isObj(raw) && typeof raw !== 'number' && typeof raw !== 'string') continue
    const record = isObj(raw) ? raw : { id: raw }
    const id = record.id === undefined || record.id === null ? `g${nodes.length}` : record.id
    const key = String(id)
    if (seen.has(key)) continue
    seen.add(key)
    if (nodes.length >= 63) break
    nodes.push({
      id,
      label: clipText(record.label === undefined ? String(id) : record.label, 10),
      x: num(record.x, NaN),
      y: num(record.y, NaN),
      z: num(record.z, NaN),
    })
  }
  if (nodes.length === 0) return null
  const edges = []
  for (const edge of arr(layout.edges)) {
    if (!Array.isArray(edge) || edge.length < 2) continue
    const a = edge[0]
    const b = edge[1]
    if (String(a) === String(b)) continue
    if (!seen.has(String(a)) || !seen.has(String(b))) continue
    const weight = edge.length >= 3 ? num(edge[2], 0) : undefined
    edges.push(weight === undefined ? [a, b] : [a, b, weight])
    if (edges.length >= 320) break
  }
  if (nodes.some((n) => !Number.isFinite(n.x) || !Number.isFinite(n.y))) {
    const positions = layoutSphere(nodes.length)
    nodes.forEach((node, i) => {
      const p = positions[i] || { x: 0, y: 0, z: 0 }
      node.x = Number.isFinite(node.x) ? node.x : p.x
      node.y = Number.isFinite(node.y) ? node.y : p.y
      node.z = Number.isFinite(node.z) ? node.z : p.z
    })
  }
  const sphere = layout.sphere === true || nodes.some((n) => Number.isFinite(n.z) && Math.abs(n.z) > 0.01)
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.label,
      x: Number.isFinite(n.x) ? n.x : 0,
      y: Number.isFinite(n.y) ? n.y : 0,
      z: Number.isFinite(n.z) ? n.z : 0,
    })),
    edges,
    directed: layout.directed === true,
    sphere,
  }
}

function normalizeGridLayout(rawLayout) {
  const layout = isObj(rawLayout) ? rawLayout : {}
  const rawCells = arr(layout.cells)
  if (rawCells.length === 0) return null
  const rows = clampInt(layout.rows === undefined ? rawCells.length : layout.rows, 1, 40, rawCells.length)
  const cols = clampInt(
    layout.cols === undefined ? Math.max(1, ...rawCells.map((row) => arr(row).length)) : layout.cols,
    1,
    40,
    1,
  )
  const cells = []
  for (let r = 0; r < rows; r++) {
    const rawRow = arr(rawCells[r])
    const row = []
    for (let c = 0; c < cols; c++) {
      const v = rawRow[c]
      row.push(typeof v === 'string' ? clipText(v, 8) : num(v, 0))
    }
    cells.push(row)
  }
  return { rows, cols, cells }
}

function normalizeStackLayout(rawLayout) {
  const layout = isObj(rawLayout) ? rawLayout : {}
  const out = {}
  if (Number.isFinite(num(layout.capacity, NaN))) out.capacity = clampInt(layout.capacity, 1, 64, 8)
  return out
}

function normalizeLayout(kind, rawLayout) {
  if (kind === 'array' || kind === 'string' || kind === 'linked-list') return normalizeColumnLayout(kind, rawLayout)
  if (kind === 'tree') return normalizeTreeLayout(rawLayout)
  if (kind === 'graph') return normalizeGraphLayout(rawLayout)
  if (kind === 'grid') return normalizeGridLayout(rawLayout)
  if (kind === 'stack') return normalizeStackLayout(rawLayout)
  return null
}

/* ------------------------------------------------------------------- scene assembly -- */

/**
 * Normalize an arbitrary scene object (from a generator, the AI, or a fixture) into the
 * contract shape. Returns null when the scene is unusable, never throws.
 */
export function normalizeScene(raw) {
  try {
    if (!isObj(raw)) return null
    const kind = str(raw.kind, '')
    if (!KIND_SET.has(kind)) return null
    const layout = normalizeLayout(kind, raw.layout)
    if (!layout) return null
    const frames = []
    for (const frame of arr(raw.frames)) {
      if (!isObj(frame)) continue
      const state = normalizeState(kind, layout, frame.state)
      frames.push({
        label: clipText(frame.label, 40) || `Frame ${frames.length + 1}`,
        note: clipText(frame.note, 140),
        state,
      })
      if (frames.length >= 40) break
    }
    if (frames.length === 0) return null
    const scene = {
      v: SCENE_VERSION,
      kind,
      title: clipText(raw.title, 72) || 'Untitled scene',
      subtitle: clipText(raw.subtitle, 90),
      pattern: clipText(raw.pattern, 40),
      camera: cameraOf(raw.camera),
      layout,
      frames,
    }
    return scene
  } catch {
    return null
  }
}

/* --------------------------------------------------------------- kind scene builders -- */

function metaFrom(options) {
  const o = isObj(options) ? options : {}
  return {
    title: str(o.title, 'Untitled scene'),
    subtitle: str(o.subtitle, ''),
    pattern: str(o.pattern, ''),
    camera: o.camera,
  }
}

export function arrayScene(options) {
  const o = isObj(options) ? options : {}
  const values = arr(o.values).slice(0, 64).map((v) => num(v, 0))
  if (values.length === 0) return null
  const camera = o.camera || { yaw: 0.5, pitch: 0.3, dist: values.length <= 8 ? 7.2 : values.length <= 14 ? 8.2 : 9.2 }
  return normalizeScene({
    ...metaFrom(o),
    kind: 'array',
    camera,
    layout: { values },
    frames: o.frames,
  })
}

export function stringScene(options) {
  const o = isObj(options) ? options : {}
  const chars = arr(o.chars).slice(0, 64).map((c) => clipText(c, 8))
  if (chars.length === 0) return null
  const camera = o.camera || { yaw: 0.46, pitch: 0.3, dist: chars.length <= 10 ? 7.2 : chars.length <= 20 ? 8.2 : 9.2 }
  return normalizeScene({
    ...metaFrom(o),
    kind: 'string',
    camera,
    layout: { chars },
    frames: o.frames,
  })
}

export function linkedListScene(options) {
  const o = isObj(options) ? options : {}
  const values = arr(o.values).slice(0, 64).map((v) => num(v, 0))
  if (values.length === 0) return null
  const camera = o.camera || { yaw: 0.54, pitch: 0.24, dist: values.length <= 6 ? 7 : 8.6 }
  return normalizeScene({
    ...metaFrom(o),
    kind: 'linked-list',
    camera,
    layout: { values },
    frames: o.frames,
  })
}

export function treeScene(options) {
  const o = isObj(options) ? options : {}
  const layout = normalizeTreeLayout({ nodes: o.nodes, edges: o.edges, rootId: o.rootId })
  if (!layout) return null
  const xs = layout.nodes.map((n) => n.x)
  const ys = layout.nodes.map((n) => n.y)
  const width = Math.max(...xs) - Math.min(...xs)
  const height = Math.max(...ys) - Math.min(...ys)
  const camera = o.camera || {
    yaw: 0.58,
    pitch: 0.24,
    dist: clamp(6.8 + width * 0.3 + height * 0.26, 7.2, 16),
  }
  return normalizeScene({
    ...metaFrom(o),
    kind: 'tree',
    camera,
    layout,
    frames: o.frames,
  })
}

export function graphScene(options) {
  const o = isObj(options) ? options : {}
  const layout = normalizeGraphLayout({
    nodes: o.nodes,
    edges: o.edges,
    directed: o.directed,
    sphere: o.sphere,
  })
  if (!layout) return null
  const camera = o.camera || { yaw: 0.68, pitch: 0.3, dist: layout.nodes.length <= 8 ? 7.6 : 8.4 }
  return normalizeScene({
    ...metaFrom(o),
    kind: 'graph',
    camera,
    layout,
    frames: o.frames,
  })
}

export function gridScene(options) {
  const o = isObj(options) ? options : {}
  const layout = normalizeGridLayout({ rows: o.rows, cols: o.cols, cells: o.cells })
  if (!layout) return null
  const metrics = gridMetrics(layout.rows, layout.cols)
  const camera = o.camera || { yaw: 0.46, pitch: 0.64, dist: clamp(6.6 + Math.max(metrics.width, metrics.depth) * 0.6, 7, 14) }
  return normalizeScene({
    ...metaFrom(o),
    kind: 'grid',
    camera,
    layout,
    frames: o.frames,
  })
}

export function stackScene(options) {
  const o = isObj(options) ? options : {}
  const camera = o.camera || { yaw: 0.5, pitch: 0.24, dist: 7.2 }
  return normalizeScene({
    ...metaFrom(o),
    kind: 'stack',
    camera,
    layout: { ...(Number.isFinite(num(o.capacity, NaN)) ? { capacity: o.capacity } : {}) },
    frames: o.frames,
  })
}

/* ------------------------------------------------------------------------ validation -- */

const isColor = (v) => COLOR_SET.has(String(v))
const inRange = (value, length) => indexInRange(value, length) !== null

/**
 * Strict-ish contract validation used by tools/engine-check.mjs.
 * Returns `{ ok, errors: string[] }`; never throws.
 */
export function validateScene(raw) {
  const errors = []
  try {
    if (!isObj(raw)) return { ok: false, errors: ['scene is not an object'] }
    if (raw.v !== SCENE_VERSION) errors.push(`v must be ${SCENE_VERSION}`)
    if (typeof raw.kind !== 'string' || !KIND_SET.has(raw.kind)) errors.push(`unknown kind: ${String(raw.kind)}`)
    if (typeof raw.title !== 'string' || raw.title.length === 0) errors.push('title missing')
    if (!isObj(raw.camera)) errors.push('camera missing')
    else {
      for (const key of ['yaw', 'pitch', 'dist']) {
        if (!Number.isFinite(raw.camera[key])) errors.push(`camera.${key} not finite`)
      }
    }
    if (!isObj(raw.layout)) errors.push('layout missing')
    if (!Array.isArray(raw.frames) || raw.frames.length === 0) errors.push('frames empty')
    else {
      if (raw.frames.length < 6) errors.push(`frames ${raw.frames.length} < 6`)
      if (raw.frames.length > 40) errors.push(`frames ${raw.frames.length} > 40`)
      raw.frames.forEach((frame, i) => {
        if (!isObj(frame)) {
          errors.push(`frame ${i} not an object`)
          return
        }
        if (typeof frame.label !== 'string' || frame.label.length === 0) errors.push(`frame ${i} label missing`)
        if (typeof frame.note !== 'string' || frame.note.length === 0) errors.push(`frame ${i} note missing`)
        if (typeof frame.note === 'string' && frame.note.length > 140) errors.push(`frame ${i} note > 140 chars`)
        if (typeof frame.note === 'string' && /<[a-z/][^>]*>/i.test(frame.note)) errors.push(`frame ${i} note has markup`)
      })
    }
    const kind = raw.kind
    const layout = isObj(raw.layout) ? raw.layout : {}
    const stateLength = kind === 'string' ? arr(layout.chars).length : arr(layout.values).length
    if (kind === 'array' || kind === 'string' || kind === 'linked-list') {
      if (stateLength === 0) errors.push(`${kind} layout empty`)
      raw.frames && arr(raw.frames).forEach((frame, i) => {
        const state = isObj(frame && frame.state) ? frame.state : {}
        for (const [name, idx] of Object.entries(isObj(state.pointers) ? state.pointers : {})) {
          if (!inRange(idx, stateLength)) errors.push(`frame ${i} pointer ${name}=${idx} out of range`)
        }
        for (const [idx, color] of Object.entries(isObj(state.highlights) ? state.highlights : {})) {
          if (!inRange(idx, stateLength)) errors.push(`frame ${i} highlight ${idx} out of range`)
          if (!isColor(color)) errors.push(`frame ${i} highlight color ${String(color)} unknown`)
        }
        if (state.window !== undefined) {
          if (!Array.isArray(state.window) || state.window.length < 2) errors.push(`frame ${i} window malformed`)
          else if (!inRange(state.window[0], stateLength) || !inRange(state.window[1], stateLength))
            errors.push(`frame ${i} window ${JSON.stringify(state.window)} out of range`)
        }
        for (const [value, idx] of Object.entries(isObj(state.seen) ? state.seen : {})) {
          if (!inRange(idx, stateLength)) errors.push(`frame ${i} seen[${value}]=${idx} out of range`)
        }
        for (const idx of arr(state.removed)) if (!inRange(idx, stateLength)) errors.push(`frame ${i} removed ${idx} out of range`)
        if (state.values !== undefined && (!Array.isArray(state.values) || state.values.length === 0))
          errors.push(`frame ${i} state.values malformed`)
      })
    }
    if (kind === 'tree' || kind === 'graph') {
      const ids = new Set(arr(layout.nodes).map((n) => String(n.id)))
      if (ids.size === 0) errors.push(`${kind} has no nodes`)
      if (kind === 'graph' && !Array.isArray(layout.edges)) errors.push('graph edges missing')
      raw.frames && arr(raw.frames).forEach((frame, i) => {
        const state = isObj(frame && frame.state) ? frame.state : {}
        if (state.current !== undefined && !ids.has(String(state.current))) errors.push(`frame ${i} current id missing`)
        for (const key of ['visited', 'frontier', 'path', 'cycle', 'dropped']) {
          for (const id of arr(state[key])) if (!ids.has(String(id))) errors.push(`frame ${i} ${key} id ${String(id)} missing`)
        }
      })
    }
    if (kind === 'grid') {
      const rows = Math.round(num(layout.rows, 0))
      const cols = Math.round(num(layout.cols, 0))
      if (rows <= 0 || cols <= 0) errors.push('grid dims invalid')
      if (!Array.isArray(layout.cells) || layout.cells.length !== rows) errors.push('grid cells rows mismatch')
      else layout.cells.forEach((row, r) => {
        if (!Array.isArray(row) || row.length !== cols) errors.push(`grid row ${r} cols mismatch`)
      })
      raw.frames && arr(raw.frames).forEach((frame, i) => {
        const state = isObj(frame && frame.state) ? frame.state : {}
        const check = (value, name) => {
          if (!Array.isArray(value) || value.length < 2) errors.push(`frame ${i} ${name} malformed`)
          else if (!cellInGrid(value, rows, cols)) errors.push(`frame ${i} ${name} out of range`)
        }
        if (state.current !== undefined) check(state.current, 'current')
        for (const key of ['filled', 'path', 'blocked']) for (const cell of arr(state[key])) check(cell, key)
        if (state.cells !== undefined && !Array.isArray(state.cells)) errors.push(`frame ${i} state.cells malformed`)
      })
    }
    if (kind === 'stack') {
      raw.frames && arr(raw.frames).forEach((frame, i) => {
        const state = isObj(frame && frame.state) ? frame.state : {}
        if (!Array.isArray(state.items)) errors.push(`frame ${i} stack items missing`)
        else if (layout.capacity && state.items.length > layout.capacity) errors.push(`frame ${i} stack over capacity`)
      })
    }
  } catch (error) {
    errors.push(`validator crashed: ${String((error && error.message) || error)}`)
  }
  return { ok: errors.length === 0, errors }
}

export function isKnownKind(kind) {
  return KIND_SET.has(String(kind || ''))
}

/** Narration fallback used by the renderer for unknown/malformed scenes. */
export function narrationLines(raw) {
  const lines = []
  try {
    if (isObj(raw) && typeof raw.title === 'string') lines.push(raw.title)
    if (isObj(raw) && typeof raw.subtitle === 'string' && raw.subtitle) lines.push(raw.subtitle)
    for (const frame of arr(isObj(raw) ? raw.frames : undefined)) {
      if (!isObj(frame)) continue
      const note = clipText(frame.note, 200)
      if (note) lines.push(note)
      if (lines.length >= 12) break
    }
  } catch {
    /* narration is best effort */
  }
  return lines
}
