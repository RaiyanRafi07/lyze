/**
 * LeetCode Lab — dependency-free 3D scene viewer.
 *
 * Canvas 2D with a real perspective camera (orbit / zoom / eased transitions), depth-sorted
 * drawing, depth fog, radial-gradient glows, screen-space crisp labels, DPR-aware sizing,
 * ResizeObserver, and a strictly idle loop when paused.
 *
 * Contract (CONTRACTS.md §5):
 *   createViewer(container, options) -> viewer
 *   viewer.setScene(scene) · goTo(i) · play() · pause() · on('frame', cb) · destroy() ·
 *   setAiOverlay(text)
 *
 * Renders: array · string · linked-list · tree · graph · grid · stack.
 * Unknown / malformed scenes fall back to a readable narration panel — never throws.
 */

import {
  normalizeScene,
  narrationLines,
  layoutSphere,
  layoutTree,
  gridMetrics,
  isKnownKind,
} from './scenes.js'

const FOV = (46 * Math.PI) / 180
const FRAME_MS = 1400
const TRANSITION_MS = 280
const DPR_MAX = 2.5
const FLOOR_Y = {
  array: -1.4,
  string: -1.4,
  'linked-list': -1.35,
  tree: -1.9,
  graph: -1.65,
  grid: -1.15,
  stack: -1.5,
}
const POINTER_PALETTE = ['accent', 'warn', 'ok', 'purple', 'pink', 'cyan']
const LIGHT = normalize3([0.42, 0.86, 0.32])
const TAU = Math.PI * 2

const DEFAULT_THEME = {
  bg: '#04060f',
  panel: '#0b1327',
  text: '#eaf2ff',
  dim: '#7f92b3',
  accent: '#5ee7ff',
  ok: '#4ade80',
  warn: '#fbbf24',
  bad: '#fb7185',
}

/* ------------------------------------------------------------------------- utilities -- */

function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value
}
function lerp(a, b, t) {
  return a + (b - a) * t
}
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v)
}
function normalize3(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / length, v[1] / length, v[2] / length]
}
function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}
function cross3(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}
function formatValue(value) {
  if (typeof value === 'string') return clip(value, 5)
  if (!isNum(value)) return '·'
  if (!Number.isFinite(value)) return '·'
  if (Number.isInteger(value)) {
    if (Math.abs(value) < 100000) return String(value)
    return value.toExponential(1).replace('+', '')
  }
  return String(Math.round(value * 100) / 100)
}
function clip(text, max) {
  const s = String(text === undefined || text === null ? '' : text)
  return s.length <= max ? s : s.slice(0, max - 1) + '…'
}

/* ---------------------------------------------------------------------------- colors -- */

const COLOR_CACHE = new Map()

function parseColor(input) {
  if (Array.isArray(input)) return [input[0] | 0, input[1] | 0, input[2] | 0, input[3] === undefined ? 1 : input[3]]
  const key = String(input === undefined || input === null ? '' : input)
  const cached = COLOR_CACHE.get(key)
  if (cached) return cached
  let out = [255, 255, 255, 1]
  const hex = key.trim()
  if (/^#[0-9a-fA-F]{3,8}$/.test(hex)) {
    const body = hex.slice(1)
    if (body.length === 3 || body.length === 4) {
      out = [
        parseInt(body[0] + body[0], 16),
        parseInt(body[1] + body[1], 16),
        parseInt(body[2] + body[2], 16),
        body.length === 4 ? parseInt(body[3] + body[3], 16) / 255 : 1,
      ]
    } else if (body.length === 6 || body.length === 8) {
      out = [
        parseInt(body.slice(0, 2), 16),
        parseInt(body.slice(2, 4), 16),
        parseInt(body.slice(4, 6), 16),
        body.length === 8 ? parseInt(body.slice(6, 8), 16) / 255 : 1,
      ]
    }
  } else {
    const match = hex.match(/rgba?\(([^)]+)\)/i)
    if (match) {
      const parts = match[1].split(',').map((v) => parseFloat(v))
      out = [parts[0] || 0, parts[1] || 0, parts[2] || 0, parts.length > 3 ? parts[3] : 1]
    }
  }
  COLOR_CACHE.set(key, out)
  return out
}

function rgba(color, alpha = color[3]) {
  return `rgba(${color[0] | 0},${color[1] | 0},${color[2] | 0},${clamp(alpha, 0, 1).toFixed(3)})`
}
function mixColor(a, b, t) {
  const ca = parseColor(a)
  const cb = parseColor(b)
  return rgba([lerp(ca[0], cb[0], t), lerp(ca[1], cb[1], t), lerp(ca[2], cb[2], t), lerp(ca[3], cb[3], t)])
}
function shadeColor(color, factor) {
  const c = parseColor(color)
  return rgba([c[0] * factor, c[1] * factor, c[2] * factor, c[3]])
}
function withAlpha(color, alpha) {
  const c = parseColor(color)
  return rgba([c[0], c[1], c[2], c[3] * alpha])
}
function isColorLike(value) {
  if (Array.isArray(value)) return value.length >= 3 && value.every(isNum)
  if (typeof value !== 'string') return false
  return /^#|^rgba?\(/i.test(value.trim())
}

/* --------------------------------------------------------------- params + blending -- */

function defaultValueOf(value) {
  if (isNum(value)) return 0
  if (isColorLike(value)) return 'rgba(0,0,0,0)'
  if (Array.isArray(value)) return value.map(() => 0)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [key, inner] of Object.entries(value)) out[key] = defaultValueOf(inner)
    return out
  }
  return value
}

/** Recursively blend two param trees (numbers, colors, coordinate arrays, objects). */
function blendAny(a, b, t) {
  if (a === undefined && b === undefined) return undefined
  if (a === undefined) a = defaultValueOf(b)
  if (b === undefined) b = defaultValueOf(a)
  if (isNum(a) && isNum(b)) return lerp(a, b, t)
  if (isColorLike(a) && isColorLike(b)) return mixColor(a, b, t)
  if (Array.isArray(a) && Array.isArray(b)) {
    const length = Math.max(a.length, b.length)
    const out = []
    for (let i = 0; i < length; i++) out.push(blendAny(a[i], b[i], t))
    return out
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const out = {}
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const key of keys) out[key] = blendAny(a[key], b[key], t)
    return out
  }
  return t < 0.5 ? a : b
}

/* ---------------------------------------------------------------- scene param builders -- */

function stateOf(scene, frame) {
  return frame && frame.state && typeof frame.state === 'object' ? frame.state : {}
}

function seenHasIndex(seen, index) {
  if (!seen || typeof seen !== 'object') return false
  for (const value of Object.values(seen)) if (value === index) return true
  return false
}

function arrayLikeParams(scene, frame, theme) {
  const layout = scene.layout || {}
  const state = stateOf(scene, frame)
  const isString = scene.kind === 'string'
  const base = isString ? layout.chars || [] : layout.values || []
  const values = Array.isArray(state.values) ? state.values : Array.isArray(state.chars) ? state.chars : base
  const n = Math.max(values.length, 1)
  let maxAbs = 1
  for (const value of values) if (isNum(value)) maxAbs = Math.max(maxAbs, Math.abs(value))
  const items = {}
  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    const highlight = state.highlights && state.highlights[String(i)]
    const rim = seenHasIndex(state.seen, i)
    let color
    if (isString) {
      const code = typeof value === 'string' ? value.charCodeAt(0) || 65 : 65
      color = mixColor(theme.accent, theme.purple || '#c084fc', ((code * 37) % 100) / 100)
    } else {
      color = valueColor(value, maxAbs, theme)
    }
    if (highlight) color = mixColor(color, themeColor(theme, highlight), 0.72)
    if (state.sorted) color = mixColor(color, theme.ok, 0.18)
    const isList = scene.kind === 'linked-list'
    const height = isList ? 0.74 : isString ? 0.82 : 0.42 + (Math.abs(isNum(value) ? value : 0) / maxAbs) * 2.45
    items[i] = {
      value: typeof value === 'string' ? value : isNum(value) ? value : 0,
      height,
      alpha: 1,
      glow: highlight ? 0.9 : rim ? 0.45 : 0,
      rim: rim ? 1 : 0,
      color,
      tint: highlight ? themeColor(theme, highlight) : 'rgba(0,0,0,0)',
    }
  }
  const pointers = {}
  const pointerEntries = Object.entries(state.pointers || {})
  pointerEntries.forEach(([name, index], order) => {
    pointers[name] = {
      index: clamp(isNum(index) ? index : 0, 0, Math.max(0, values.length - 1)),
      color: themeColor(theme, POINTER_PALETTE[order % POINTER_PALETTE.length]),
    }
  })
  const window = Array.isArray(state.window) && state.window.length >= 2 ? [state.window[0], state.window[1]] : null
  return { items, pointers, window, isString }
}

function valueColor(value, maxAbs, theme) {
  const magnitude = clamp(Math.abs(value) / maxAbs, 0, 1)
  if (value < 0) return mixColor(theme.bad, theme.warn, 0.3 + magnitude * 0.3)
  const stops = ['#3b4fd8', '#2f7fe6', '#22b8e6', '#5ee7ff', '#a9f5d4']
  const scaled = magnitude * (stops.length - 1)
  const index = Math.min(stops.length - 2, Math.floor(scaled))
  return mixColor(stops[index], stops[index + 1], scaled - index)
}

function stringColor(value) {
  return value
}

function themeColor(theme, name) {
  const map = {
    accent: theme.accent,
    ok: theme.ok,
    warn: theme.warn,
    bad: theme.bad,
    dim: theme.dim,
    text: theme.text,
    muted: theme.dim,
    path: '#8b9dff',
    cyan: '#67e8f9',
    purple: '#c084fc',
    pink: '#f472b6',
  }
  return map[String(name || '').toLowerCase()] || theme.accent
}

function treeParams(scene, frame, theme) {
  const layout = scene.layout || {}
  const state = stateOf(scene, frame)
  const visited = new Set((state.visited || []).map(String))
  const frontier = new Set((state.frontier || []).map(String))
  const path = (state.path || []).map(String)
  const pathSet = new Set(path)
  const dropped = new Set((state.dropped || []).map(String))
  const current = state.current === undefined ? null : String(state.current)
  const nodes = {}
  for (const node of layout.nodes || []) {
    const key = String(node.id)
    let tint = theme.dim
    let glow = 0.12
    if (dropped.has(key)) tint = shadeColor(theme.dim, 0.55)
    if (visited.has(key)) {
      tint = theme.accent
      glow = 0.3
    }
    if (frontier.has(key)) {
      tint = theme.warn
      glow = 0.55
    }
    if (pathSet.has(key)) {
      tint = theme.ok
      glow = 0.6
    }
    if (current === key) {
      tint = theme.text
      glow = 1
    }
    nodes[key] = {
      tint,
      alpha: dropped.has(key) ? 0.28 : 1,
      glow,
      ring: current === key ? 1 : 0,
      frontier: frontier.has(key) ? 1 : 0,
      path: pathSet.has(key) ? 1 : 0,
      visited: visited.has(key) ? 1 : 0,
      dropped: dropped.has(key) ? 1 : 0,
    }
  }
  const edges = {}
  for (const [a, b] of layout.edges || []) {
    const keyA = String(a)
    const keyB = String(b)
    const bothPath = pathSet.has(keyA) && pathSet.has(keyB)
    const orderGap = Math.abs(path.indexOf(keyA) - path.indexOf(keyB))
    const onPath = bothPath && orderGap === 1
    edges[`${keyA}|${keyB}`] = {
      tint: onPath ? theme.accent : theme.dim,
      alpha: onPath ? 0.95 : 0.3,
      width: onPath ? 1 : 0.55,
    }
  }
  return { nodes, edges }
}

function graphParams(scene, frame, theme) {
  const layout = scene.layout || {}
  const state = stateOf(scene, frame)
  const visited = new Set((state.visited || []).map(String))
  const frontier = new Set((state.frontier || []).map(String))
  const pathList = (state.path || []).map(String)
  const pathSet = new Set(pathList)
  const cycle = new Set((state.cycle || []).map(String))
  const current = state.current === undefined ? null : String(state.current)
  const nodes = {}
  for (const node of layout.nodes || []) {
    const key = String(node.id)
    let tint = theme.dim
    let glow = 0.1
    if (visited.has(key)) {
      tint = theme.accent
      glow = 0.28
    }
    if (frontier.has(key)) {
      tint = theme.warn
      glow = 0.55
    }
    if (pathSet.has(key)) {
      tint = theme.ok
      glow = 0.6
    }
    if (cycle.has(key)) {
      tint = theme.bad
      glow = 0.7
    }
    if (current === key) {
      tint = theme.text
      glow = 1
    }
    nodes[key] = {
      tint,
      alpha: 1,
      glow,
      ring: current === key ? 1 : 0,
      frontier: frontier.has(key) ? 1 : 0,
      path: pathSet.has(key) ? 1 : 0,
      visited: visited.has(key) ? 1 : 0,
      cycle: cycle.has(key) ? 1 : 0,
    }
  }
  const edges = {}
  const pairs = layout.edges || []
  for (const edge of pairs) {
    const keyA = String(edge[0])
    const keyB = String(edge[1])
    const bothVisited = visited.has(keyA) && visited.has(keyB)
    const bothPath = pathSet.has(keyA) && pathSet.has(keyB)
    const orderGap = Math.abs(pathList.indexOf(keyA) - pathList.indexOf(keyB))
    const onPath = bothPath && orderGap === 1
    const cycleEdge = cycle.has(keyA) && cycle.has(keyB)
    let tint = theme.dim
    let alpha = 0.2
    let width = 0.5
    if (bothVisited) {
      tint = mixColor(theme.accent, theme.dim, 0.45)
      alpha = 0.34
      width = 0.7
    }
    if (onPath) {
      tint = theme.ok
      alpha = 0.95
      width = 1.5
    }
    if (cycleEdge) {
      tint = theme.bad
      alpha = 0.95
      width = 1.6
    }
    edges[`${keyA}|${keyB}`] = { tint, alpha, width, cycle: cycleEdge ? 1 : 0, path: onPath ? 1 : 0 }
  }
  return { nodes, edges }
}

function gridParams(scene, frame, theme) {
  const layout = scene.layout || {}
  const state = stateOf(scene, frame)
  const rows = layout.rows || 0
  const cols = layout.cols || 0
  const cellsBase = Array.isArray(state.cells) ? state.cells : layout.cells || []
  const filled = new Set((state.filled || []).map((cell) => `${cell[0]},${cell[1]}`))
  const path = new Set((state.path || []).map((cell) => `${cell[0]},${cell[1]}`))
  const blocked = new Set((state.blocked || []).map((cell) => `${cell[0]},${cell[1]}`))
  const current = state.current ? `${state.current[0]},${state.current[1]}` : null
  let maxAbs = 1
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const value = cellsBase[r] && cellsBase[r][c]
      if (isNum(value)) maxAbs = Math.max(maxAbs, Math.abs(value))
    }
  }
  const cells = {}
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r},${c}`
      const raw = cellsBase[r] ? cellsBase[r][c] : 0
      const value = isNum(raw) ? raw : 0
      const isBlocked = blocked.has(key)
      const isFilled = filled.size === 0 ? !isBlocked : filled.has(key)
      const isPath = path.has(key)
      const isCurrent = current === key
      let tint = mixColor(shadeColor(theme.accent, 0.3), theme.accent, 0.22 + (Math.abs(value) / maxAbs) * 0.6)
      if (isBlocked) tint = shadeColor(theme.bad, 0.35)
      if (isFilled && !isBlocked) tint = mixColor(tint, theme.accent, 0.35)
      if (isPath) tint = mixColor(tint, theme.ok, 0.7)
      if (isCurrent) tint = theme.text
      const height = isBlocked ? 0.16 : 0.2 + (isFilled ? 0.34 : 0) + (Math.abs(value) / maxAbs) * 0.5
      cells[key] = {
        value: typeof raw === 'string' ? raw : value,
        height,
        alpha: isBlocked ? 0.65 : filled.size > 0 && !isFilled && !isCurrent ? 0.55 : 1,
        glow: isCurrent ? 1 : isPath ? 0.55 : isFilled ? 0.3 : 0.05,
        color: tint,
        current: isCurrent ? 1 : 0,
        path: isPath ? 1 : 0,
        blocked: isBlocked ? 1 : 0,
        filled: isFilled ? 1 : 0,
      }
    }
  }
  const labelAlpha = { filled: filled.size > 0 ? 1 : 1 }
  return { cells, rows, cols, empty: filled.size === 0, hasFill: filled.size > 0 }
}

function stackParams(scene, frame, theme) {
  const state = stateOf(scene, frame)
  const items = Array.isArray(state.items) ? state.items : []
  const op = state.op || 'push'
  const output = {}
  const top = items.length - 1
  for (let i = 0; i < items.length; i++) {
    const isTop = i === top
    output[i] = {
      value: items[i],
      alpha: 1,
      glow: isTop ? (op === 'pop' ? 0.6 : op === 'peek' ? 0.8 : 0.9) : 0.18,
      tint: isTop ? (op === 'pop' ? theme.bad : op === 'peek' ? theme.warn : theme.accent) : mixColor(theme.accent, theme.dim, 0.55),
    }
  }
  return { items: output, op, count: items.length }
}

function buildParams(scene, frame, theme) {
  if (!scene || !isKnownKind(scene.kind)) return null
  try {
    switch (scene.kind) {
      case 'array':
        return arrayLikeParams(scene, frame, theme)
      case 'string':
        return arrayLikeParams(scene, frame, theme)
      case 'linked-list':
        return arrayLikeParams(scene, frame, theme)
      case 'tree':
        return treeParams(scene, frame, theme)
      case 'graph':
        return graphParams(scene, frame, theme)
      case 'grid':
        return gridParams(scene, frame, theme)
      case 'stack':
        return stackParams(scene, frame, theme)
      default:
        return null
    }
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------------ projection -- */

function makeCamera(scene, cssW, cssH, camera) {
  const yaw = camera.yaw
  const pitch = camera.pitch
  const dist = camera.dist
  const cosPitch = Math.cos(pitch)
  const target = [0, -0.15, 0]
  const pos = [
    target[0] + dist * cosPitch * Math.sin(yaw),
    target[1] + dist * Math.sin(pitch),
    target[2] + dist * cosPitch * Math.cos(yaw),
  ]
  const forward = normalize3(sub3(target, pos))
  const right = normalize3(cross3(forward, [0, 1, 0]))
  const up = cross3(right, forward)
  const focal = cssH / 2 / Math.tan(FOV / 2)
  const project = (point) => {
    const dx = point[0] - pos[0]
    const dy = point[1] - pos[1]
    const dz = point[2] - pos[2]
    const zc = dx * forward[0] + dy * forward[1] + dz * forward[2]
    if (zc <= 0.08) return null
    const xc = dx * right[0] + dy * right[1] + dz * right[2]
    const yc = dx * up[0] + dy * up[1] + dz * up[2]
    const scale = focal / zc
    return {
      x: cssW / 2 + xc * scale,
      y: cssH / 2 - yc * scale,
      z: zc,
      scale,
    }
  }
  return { project, pos, forward, right, up, focal, dist, cssW, cssH }
}

function fogAmount(z, cam, scene) {
  const far = Math.max(3, cam.dist * 0.55)
  return clamp((z - far) / (cam.dist * 1.6), 0, 0.5)
}

/* ---------------------------------------------------------------------- draw helpers -- */

function roundedRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawPill(ctx, x, y, text, color, theme, opts = {}) {
  const font = opts.font || '600 11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.save()
  ctx.font = font
  const padX = opts.padX === undefined ? 7 : opts.padX
  const padY = opts.padY === undefined ? 4 : opts.padY
  const width = ctx.measureText(text).width + padX * 2
  const height = (opts.height || 20) + padY * 0
  const bx = opts.align === 'right' ? x - width : opts.align === 'center' ? x - width / 2 : x
  ctx.fillStyle = opts.bg || 'rgba(6,12,24,0.78)'
  roundedRect(ctx, bx, y, width, height, 6)
  ctx.fill()
  ctx.strokeStyle = withAlpha(color, 0.45)
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = color
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.7)'
  ctx.shadowBlur = 3
  ctx.fillText(text, bx + padX, y + height / 2 + 0.5)
  ctx.restore()
  return { x: bx, y, width, height }
}

function addBox(ops, cam, center, size, color, opts = {}) {
  const hx = size[0] / 2
  const hy = size[1] / 2
  const hz = size[2] / 2
  const [cx, cy, cz] = center
  const corners = [
    [cx - hx, cy - hy, cz - hz],
    [cx + hx, cy - hy, cz - hz],
    [cx + hx, cy + hy, cz - hz],
    [cx - hx, cy + hy, cz - hz],
    [cx - hx, cy - hy, cz + hz],
    [cx + hx, cy - hy, cz + hz],
    [cx + hx, cy + hy, cz + hz],
    [cx - hx, cy + hy, cz + hz],
  ]
  const faces = [
    { idx: [4, 5, 6, 7], normal: [0, 0, 1] },
    { idx: [1, 0, 3, 2], normal: [0, 0, -1] },
    { idx: [3, 7, 6, 2], normal: [0, 1, 0] },
    { idx: [0, 1, 5, 4], normal: [0, -1, 0] },
    { idx: [5, 1, 2, 6], normal: [1, 0, 0] },
    { idx: [0, 4, 7, 3], normal: [-1, 0, 0] },
  ]
  const alpha = opts.alpha === undefined ? 1 : opts.alpha
  const faceGlow = opts.glow || 0
  for (const face of faces) {
    const view = sub3(cam.pos, [cx, cy, cz])
    if (dot3(face.normal, view) <= 0.01) continue
    const projected = []
    let zSum = 0
    let visible = true
    for (const index of face.idx) {
      const p = cam.project(corners[index])
      if (!p) {
        visible = false
        break
      }
      projected.push(p)
      zSum += p.z
    }
    if (!visible) continue
    const z = zSum / face.idx.length + (opts.depthOffset || 0)
    const brightness = opts.emissive ? 1 : 0.52 + 0.52 * Math.max(0, dot3(face.normal, LIGHT))
    const fog = opts.fog === false ? 0 : fogAmount(z, cam, opts.scene)
    let fill = shadeColor(color, brightness)
    if (fog > 0) fill = mixColor(fill, opts.bg || '#04060f', fog)
    const finalAlpha = alpha * (opts.faceAlpha ? opts.faceAlpha(face) : 1)
    const stroke = opts.stroke ? withAlpha(opts.stroke, finalAlpha * 0.5) : null
    ops.push({
      z,
      draw: (ctx) => {
        ctx.beginPath()
        ctx.moveTo(projected[0].x, projected[0].y)
        for (let i = 1; i < projected.length; i++) ctx.lineTo(projected[i].x, projected[i].y)
        ctx.closePath()
        if (faceGlow > 0) {
          ctx.save()
          ctx.shadowColor = withAlpha(color, 0.8)
          ctx.shadowBlur = 8 + 22 * faceGlow * Math.min(1.5, projected[0].scale / 40)
          ctx.fillStyle = finalAlpha >= 0.999 ? fill : withAlpha(fill, finalAlpha)
          ctx.fill()
          ctx.restore()
        } else {
          ctx.fillStyle = finalAlpha >= 0.999 ? fill : withAlpha(fill, finalAlpha)
          ctx.fill()
        }
        if (stroke) {
          ctx.strokeStyle = stroke
          ctx.lineWidth = 1
          ctx.stroke()
        }
      },
    })
  }
}

function addOrb(ops, cam, point, radiusWorld, color, opts = {}) {
  const p = cam.project(point)
  if (!p) return null
  const radius = Math.max(1.4, radiusWorld * p.scale)
  const z = p.z + (opts.depthOffset || 0)
  const alpha = opts.alpha === undefined ? 1 : opts.alpha
  const glow = opts.glow || 0
  ops.push({
    z,
    draw: (ctx) => {
      ctx.save()
      ctx.globalAlpha = alpha
      if (glow > 0.02) {
        ctx.shadowColor = withAlpha(color, 0.85)
        ctx.shadowBlur = radius * (1.4 + glow * 2.6)
      }
      const gradient = ctx.createRadialGradient(p.x - radius * 0.34, p.y - radius * 0.38, radius * 0.12, p.x, p.y, radius)
      gradient.addColorStop(0, mixColor(color, '#ffffff', 0.72))
      gradient.addColorStop(0.45, color)
      gradient.addColorStop(1, shadeColor(color, 0.42))
      ctx.beginPath()
      ctx.arc(p.x, p.y, radius, 0, TAU)
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = withAlpha('#ffffff', 0.18)
      ctx.lineWidth = Math.max(0.6, radius * 0.045)
      ctx.stroke()
      ctx.restore()
    },
  })
  return { p, radius }
}

function addRing(ops, cam, point, radiusWorld, color, opts = {}) {
  const p = cam.project(point)
  if (!p) return
  const radius = Math.max(2, radiusWorld * p.scale)
  const z = p.z - 0.02
  const alpha = opts.alpha === undefined ? 1 : opts.alpha
  ops.push({
    z,
    draw: (ctx) => {
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = rgba(parseColor(color), opts.strokeAlpha === undefined ? 0.8 : opts.strokeAlpha)
      ctx.lineWidth = opts.width || 1.6
      ctx.shadowColor = withAlpha(color, 0.85)
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.arc(p.x, p.y, radius, 0, TAU)
      ctx.stroke()
      ctx.restore()
    },
  })
}

function addScreenRing(ops, x, y, radius, color, opts = {}) {
  const alpha = opts.alpha === undefined ? 1 : opts.alpha
  ops.push({
    z: opts.z || 0,
    draw: (ctx) => {
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = rgba(parseColor(color), opts.strokeAlpha === undefined ? 0.75 : opts.strokeAlpha)
      ctx.lineWidth = opts.width || 1.4
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, TAU)
      ctx.stroke()
      ctx.restore()
    },
  })
}

function addBeam(ops, cam, from, to, color, widthWorld, opts = {}) {
  const a = cam.project(from)
  const b = cam.project(to)
  if (!a || !b) return
  const width = Math.max(1, widthWorld * ((a.scale + b.scale) / 2))
  const alpha = opts.alpha === undefined ? 0.9 : opts.alpha
  const z = (a.z + b.z) / 2
  ops.push({
    z,
    draw: (ctx) => {
      ctx.save()
      ctx.lineCap = 'round'
      const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
      gradient.addColorStop(0, withAlpha(color, alpha * 0.9))
      gradient.addColorStop(1, withAlpha(color, alpha * 0.25))
      ctx.strokeStyle = gradient
      ctx.lineWidth = width
      ctx.strokeStyle = gradient
      ctx.shadowColor = withAlpha(color, 0.7)
      ctx.shadowBlur = opts.glow === undefined ? 8 : opts.glow
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      ctx.restore()
    },
  })
}

function addDiamond(ops, cam, point, color, opts = {}) {
  const p = cam.project(point)
  if (!p) return
  const size = (opts.size || 0.3) * p.scale
  const z = p.z - 0.2
  const alpha = opts.alpha === undefined ? 1 : opts.alpha
  ops.push({
    z,
    draw: (ctx) => {
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(p.x, p.y)
      ctx.rotate(Math.PI / 4)
      ctx.shadowColor = withAlpha(color, 0.9)
      ctx.shadowBlur = size * 0.9
      const gradient = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2)
      gradient.addColorStop(0, mixColor(color, '#ffffff', 0.65))
      gradient.addColorStop(1, color)
      ctx.fillStyle = gradient
      ctx.fillRect(-size / 2, -size / 2, size, size)
      ctx.strokeStyle = withAlpha('#ffffff', 0.55)
      ctx.lineWidth = 1
      ctx.strokeRect(-size / 2, -size / 2, size, size)
      ctx.restore()
    },
  })
}

function addLabel(labels, cam, point, text, style = {}) {
  const p = cam.project(point)
  if (!p) return
  const z = p.z + (style.depthOffset || 0)
  const x = p.x + (style.dx || 0)
  const y = p.y + (style.dy || 0)
  labels.push({
    z,
    draw: (ctx) => {
      ctx.save()
      if (style.font) ctx.font = style.font
      else ctx.font = `${style.weight || 500} ${style.size || 11}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`
      ctx.textAlign = style.align || 'center'
      ctx.textBaseline = style.baseline || 'middle'
      ctx.globalAlpha = style.alpha === undefined ? 1 : style.alpha
      if (style.bg) {
        const width = ctx.measureText(String(text)).width + 10
        const bx = ctx.textAlign === 'center' ? x - width / 2 : ctx.textAlign === 'right' ? x - width : x
        ctx.fillStyle = style.bg
        roundedRect(ctx, bx, y - 9, width, 18, 5)
        ctx.fill()
      }
      ctx.shadowColor = style.shadow === false ? 'transparent' : 'rgba(2,5,12,0.9)'
      ctx.shadowBlur = style.shadowBlur === undefined ? 3 : style.shadowBlur
      ctx.fillStyle = style.color || '#eaf2ff'
      ctx.fillText(String(text), x, y)
      ctx.restore()
    },
  })
}

function addLine3D(ops, cam, points, color, options = {}) {
  const projected = []
  for (const point of points) {
    const p = cam.project(point)
    if (!p) return
    projected.push(p)
  }
  if (projected.length < 2) return
  let z = 0
  for (const p of projected) z += p.z
  z /= projected.length
  const alpha = options.alpha === undefined ? 0.5 : options.alpha
  const width = options.width === undefined ? 1 : options.width
  ops.push({
    z,
    draw: (ctx) => {
      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const gradient = ctx.createLinearGradient(projected[0].x, projected[0].y, projected[projected.length - 1].x, projected[projected.length - 1].y)
      gradient.addColorStop(0, withAlpha(color, alpha))
      gradient.addColorStop(1, withAlpha(color, alpha * 0.35))
      ctx.strokeStyle = gradient
      ctx.lineWidth = width
      ctx.shadowColor = withAlpha(color, options.glowAlpha === undefined ? 0.5 : options.glowAlpha)
      ctx.shadowBlur = options.glowBlur === undefined ? 6 : options.glowBlur
      ctx.beginPath()
      ctx.moveTo(projected[0].x, projected[0].y)
      for (let i = 1; i < projected.length; i++) ctx.lineTo(projected[i].x, projected[i].y)
      ctx.stroke()
      ctx.restore()
    },
  })
}

function addArrow(ops, cam, from, to, color, opts = {}) {
  const a = cam.project(from)
  const b = cam.project(to)
  if (!a || !b) return
  const z = (a.z + b.z) / 2
  const alpha = opts.alpha === undefined ? 0.85 : opts.alpha
  const width = Math.max(1, (opts.width || 1.1) * ((a.scale + b.scale) / 2))
  ops.push({
    z,
    draw: (ctx) => {
      ctx.save()
      ctx.strokeStyle = withAlpha(color, alpha)
      ctx.fillStyle = withAlpha(color, alpha)
      ctx.shadowColor = withAlpha(color, 0.6)
      ctx.shadowBlur = 6
      ctx.lineWidth = width
      const angle = Math.atan2(b.y - a.y, b.x - a.x)
      const shorten = 6
      const endX = b.x - Math.cos(angle) * shorten
      const endY = b.y - Math.sin(angle) * shorten
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(endX, endY)
      ctx.stroke()
      const size = 5 + width * 1.6
      ctx.beginPath()
      ctx.moveTo(endX + Math.cos(angle) * size, endY + Math.sin(angle) * size)
      ctx.lineTo(endX + Math.cos(angle + 2.5) * size, endY + Math.sin(angle + 2.5) * size)
      ctx.lineTo(endX + Math.cos(angle - 2.5) * size, endY + Math.sin(angle - 2.5) * size)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    },
  })
}

/* ------------------------------------------------------------------- stage backdrop -- */

function drawBackground(ctx, W, H, theme) {
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, W, H)
  const gradient = ctx.createRadialGradient(W * 0.5, H * 0.34, Math.min(W, H) * 0.05, W * 0.5, H * 0.52, Math.max(W, H) * 0.78)
  gradient.addColorStop(0, mixColor(theme.bg, theme.accent, 0.14))
  gradient.addColorStop(0.45, mixColor(theme.bg, theme.panel || '#0b1327', 0.55))
  gradient.addColorStop(1, theme.bg)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, W, H)
  // Faint deterministic stars for depth.
  ctx.save()
  for (let i = 0; i < 46; i++) {
    const x = ((i * 733 + 97) % 1000) / 1000 * W
    const y = ((i * 389 + 41) % 1000) / 1000 * H * 0.85
    const radius = i % 7 === 0 ? 1.3 : 0.8
    ctx.globalAlpha = 0.05 + (i % 5) * 0.012
    ctx.fillStyle = i % 3 === 0 ? theme.accent : theme.text
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, TAU)
    ctx.fill()
  }
  ctx.restore()
  // Vignette.
  const vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, W, H)
}

function drawStage(ctx, cam, scene, theme, W, H, now, playing) {
  const floor = FLOOR_Y[scene.kind] || -1.4
  const focus = cam.project([0, floor, 0])
  if (!focus) return
  const radiusWorld = scene.kind === 'grid' ? 5.6 : 4.6
  const radius = radiusWorld * focus.scale
  const glow = ctx.createRadialGradient(focus.x, focus.y, 0, focus.x, focus.y, Math.max(20, radius))
  glow.addColorStop(0, withAlpha(theme.accent, 0.22))
  glow.addColorStop(0.4, withAlpha(theme.accent, 0.07))
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.ellipse(focus.x, focus.y, radius, radius * 0.4, 0, 0, TAU)
  ctx.fill()
  ctx.restore()
  // Concentric perspective rings.
  const rings = scene.kind === 'grid' ? [3.2, 4.4, 5.6] : [2.6, 3.5, 4.4]
  ctx.save()
  for (const ring of rings) {
    let started = false
    ctx.beginPath()
    for (let step = 0; step <= 48; step++) {
      const angle = (step / 48) * TAU
      const p = cam.project([Math.cos(angle) * ring, floor - 0.01, Math.sin(angle) * ring])
      if (!p) {
        started = false
        continue
      }
      if (!started) {
        ctx.moveTo(p.x, p.y)
        started = true
      } else ctx.lineTo(p.x, p.y)
    }
    ctx.strokeStyle = withAlpha(theme.accent, 0.07)
    ctx.lineWidth = 1
    ctx.stroke()
  }
  ctx.restore()
  if (playing) {
    const phase = (now % 2600) / 2600
    ctx.save()
    ctx.strokeStyle = withAlpha(theme.accent, 0.05 * (1 - phase))
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.ellipse(focus.x, focus.y, radius * (0.4 + phase * 1.6), radius * 0.36 * (0.4 + phase * 1.6), 0, 0, TAU)
    ctx.stroke()
    ctx.restore()
  }
}

/* ---------------------------------------------------------------- kind: array family -- */

function columnMetrics(scene, count) {
  const layout = scene.layout || {}
  const layoutCount = scene.kind === 'string' ? (layout.chars || []).length : (layout.values || []).length
  const n = Math.max(count, layoutCount, 1)
  const spacing = n <= 1 ? 1.3 : n <= 5 ? 1.5 : Math.min(1.12, 8.6 / (n - 1))
  const width = Math.max(0.26, Math.min(0.8, spacing * 0.58))
  return { n, spacing, width }
}

function drawColumns(ctx, ops, labels, scene, params, cam, theme, now, playing, opts = {}) {
  const items = params.items || {}
  const keys = Object.keys(items)
    .map(Number)
    .filter((k) => Number.isFinite(k))
    .sort((a, b) => a - b)
  if (keys.length === 0) return
  const floor = FLOOR_Y[scene.kind] || -1.4
  const metrics = columnMetrics(scene, keys.length + 1)
  const xAt = (indexFloat) => (indexFloat - (metrics.n - 1) / 2) * metrics.spacing
  const isString = scene.kind === 'string'
  const isList = scene.kind === 'linked-list'
  const zAt = (index) => (isList ? Math.sin(index * 0.62) * 0.62 : 0)
  const yAt = (index) => (isList ? floor + Math.sin(index * 0.9) * 0.14 : floor)
  const maxTop = keys.reduce((max, key) => Math.max(max, yAt(key) + (items[key].height || 0)), floor)

  // window band
  const window = params.window
  if (window && keys.length > 0) {
    const lo = clamp(window[0], 0, metrics.n - 1)
    const hi = clamp(window[1], 0, metrics.n - 1)
    const cx = (xAt(lo) + xAt(hi)) / 2
    const width = Math.max(metrics.width, (hi - lo + 1) * metrics.spacing * 0.94)
    addBox(
      ops,
      cam,
      [cx, yAt(lo) + (maxTop - floor) / 2 + 0.25, zAt(lo)],
      [width, maxTop - floor + 0.75, 1.05],
      theme.accent,
      { alpha: 0.09, glow: 0.22, emissive: false, stroke: theme.accent, scene, bg: theme.bg },
    )
  }

  // pillars
  for (const key of keys) {
    const item = items[key]
    const height = Math.max(0.02, item.height || 0)
    const x = xAt(key)
    const y = yAt(key)
    const z = zAt(key)
    addBox(ops, cam, [x, y + height / 2, z], [metrics.width, height, isList ? 0.5 : 0.78], item.color || theme.accent, {
      alpha: item.alpha === undefined ? 1 : item.alpha,
      glow: item.glow || 0,
      stroke: item.rim > 0.5 ? mixColor(theme.text, theme.accent, 0.3) : undefined,
      scene,
      bg: theme.bg,
      depthOffset: -0.001,
    })
    const topY = y + height
    if (item.rim > 0.35) {
      const ringPoint = cam.project([x, topY, z])
      if (ringPoint) {
        addScreenRing(ops, ringPoint.x, ringPoint.y, Math.max(3, metrics.width * ringPoint.scale * 0.8), theme.accent, {
          alpha: 0.18 * item.rim,
          z: 0.1,
          strokeAlpha: 0.5,
        })
      }
    }
    const labelAlpha = item.alpha === undefined ? 1 : item.alpha
    const color = isString ? theme.text : mixColor(theme.text, item.color || theme.accent, 0.25)
    addLabel(labels, cam, [x, topY + 0.3, z], isString ? String(item.value || '') : formatValue(item.value), {
      size: isString ? 14 : 12,
      weight: 600,
      color,
      alpha: labelAlpha,
      shadowBlur: 4,
    })
  }

  // floor index labels
  const firstProj = cam.project([xAt(0), floor, zAt(0)])
  const lastProj = cam.project([xAt(keys.length - 1), floor, zAt(keys.length - 1)])
  const spacingPx = firstProj && lastProj ? Math.abs(lastProj.x - firstProj.x) / Math.max(1, keys.length - 1) : 20
  if (spacingPx > 15) {
    for (const key of keys) {
      addLabel(labels, cam, [xAt(key), floor - 0.02, zAt(key)], String(key), {
        size: Math.min(10, Math.max(8, spacingPx * 0.42)),
        color: theme.dim,
        alpha: 0.75,
        dy: 12,
      })
    }
  }

  // pointers: beams + diamonds + names
  const pointerEntries = Object.entries(params.pointers || {})
  pointerEntries.forEach(([name, pointer]) => {
    const index = clamp(pointer.index === undefined ? 0 : pointer.index, 0, Math.max(0, metrics.n - 1))
    const x = xAt(index)
    const floorIndex = Math.round(index)
    const baseItem = items[clamp(floorIndex, 0, keys.length - 1)] || { height: 0.5 }
    const baseHeight = isNum(baseItem.height) ? baseItem.height : 0.5
    const y = (isList ? floor : floor) + baseHeight
    const z = zAt(index)
    const color = pointer.color || theme.accent
    const beamTop = y + 1.15
    addBeam(ops, cam, [x, y + 0.04, z], [x, beamTop, z], color, 0.035, { alpha: 0.5, glow: 12 })
    addDiamond(ops, cam, [x, beamTop + 0.14, z], color, { size: 0.26, alpha: 1 })
    addLabel(labels, cam, [x, beamTop + 0.14, z], name, {
      size: 10,
      weight: 700,
      color,
      dy: -20,
      bg: 'rgba(5,10,20,0.78)',
      shadowBlur: 3,
    })
  })

  // pulse the active pillar top (playing only)
  if (playing) {
    const phase = 0.5 + 0.5 * Math.sin(now / 260)
    for (const [name, pointer] of pointerEntries) {
      const index = Math.round(pointer.index || 0)
      if (!items[index]) continue
      const p = cam.project([xAt(index), floor + items[index].height, zAt(index)])
      if (!p) continue
      ctx.save()
      ctx.globalAlpha = 0.2 * phase
      ctx.fillStyle = withAlpha(pointer.color, 0.8)
      ctx.beginPath()
      ctx.arc(p.x, p.y, Math.max(3, 9 * (0.7 + phase * 0.5)), 0, TAU)
      ctx.fill()
      ctx.restore()
    }
  }
  return { metrics, floor, maxTop }
}

/* -------------------------------------------------------------------- kind: tree -- */

function drawTree(ctx, ops, labels, scene, params, cam, theme, now, playing) {
  const nodes = scene.layout.nodes || []
  const byId = new Map(nodes.map((node) => [String(node.id), node]))

  for (const edge of scene.layout.edges || []) {
    const key = `${edge[0]}|${edge[1]}`
    const style = (params.edges || {})[key] || { tint: theme.dim, alpha: 0.25, width: 0.5 }
    const a = byId.get(String(edge[0]))
    const b = byId.get(String(edge[1]))
    if (!a || !b) continue
    const pa = cam.project([a.x, a.y, a.z || 0])
    const pb = cam.project([b.x, b.y, b.z || 0])
    if (!pa || !pb) continue
    const width = Math.max(1, style.width * ((pa.scale + pb.scale) / 2) * 0.055)
    ops.push({
      z: (pa.z + pb.z) / 2,
      draw: (ctx) => {
        ctx.save()
        ctx.lineCap = 'round'
        ctx.strokeStyle = withAlpha(style.tint, style.alpha * 0.28)
        ctx.lineWidth = width * 4
        ctx.shadowColor = withAlpha(style.tint, 0.45)
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.moveTo(pa.x, pa.y)
        ctx.lineTo(pb.x, pb.y)
        ctx.stroke()
        ctx.strokeStyle = withAlpha(style.tint, style.alpha)
        ctx.lineWidth = width
        ctx.beginPath()
        ctx.moveTo(pa.x, pa.y)
        ctx.lineTo(pb.x, pb.y)
        ctx.stroke()
        ctx.restore()
      },
    })
  }

  for (const node of nodes) {
    const key = String(node.id)
    const style = (params.nodes || {})[key] || { tint: theme.dim, alpha: 1, glow: 0.1 }
    const point = [node.x, node.y, node.z || 0]
    const p = cam.project(point)
    if (!p) continue
    const radius = clamp(0.34 * p.scale, 5, 90)
    const glow = style.glow || 0
    const alpha = style.alpha === undefined ? 1 : style.alpha
    const pulse = style.frontier > 0.5 && playing ? 0.5 + 0.5 * Math.sin(now / 210 + node.x) : 0
    ops.push({
      z: p.z - 0.05,
      draw: (ctx) => {
        ctx.save()
        ctx.globalAlpha = alpha
        if (pulse > 0) {
          ctx.globalAlpha = alpha * (0.9 + 0.1 * pulse)
          ctx.strokeStyle = withAlpha(theme.warn, 0.55 * pulse)
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(p.x, p.y, radius * (1.45 + 0.35 * pulse), 0, TAU)
          ctx.stroke()
        }
        ctx.shadowColor = withAlpha(style.tint, 0.9)
        ctx.shadowBlur = radius * (1.2 + glow * 2.4)
        const gradient = ctx.createRadialGradient(p.x - radius * 0.35, p.y - radius * 0.4, radius * 0.08, p.x, p.y, radius)
        gradient.addColorStop(0, mixColor(style.tint, '#ffffff', 0.72))
        gradient.addColorStop(0.5, style.tint)
        gradient.addColorStop(1, shadeColor(style.tint, 0.38))
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, TAU)
        ctx.fillStyle = gradient
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.strokeStyle = withAlpha('#ffffff', 0.22)
        ctx.lineWidth = Math.max(0.7, radius * 0.05)
        ctx.stroke()
        if (style.ring > 0.5) {
          ctx.strokeStyle = withAlpha('#ffffff', 0.8)
          ctx.lineWidth = 1.8
          ctx.beginPath()
          ctx.arc(p.x, p.y, radius * 1.25, 0, TAU)
          ctx.stroke()
        }
        ctx.restore()
      },
    })
    addLabel(labels, cam, point, clip(node.label === undefined ? String(node.value) : String(node.label), 4), {
      size: clamp(radius * 0.62, 9, 15),
      weight: 700,
      color: mixColor(theme.text, style.tint, 0.25),
      alpha,
      shadowBlur: 3,
      depthOffset: -0.05,
    })
  }

}


function pointAlongPath(points, t, cam) {
  if (points.length < 2) return null
  const lengths = []
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const a = cam.project(points[i - 1])
    const b = cam.project(points[i])
    if (!a || !b) return null
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    lengths.push(length)
    total += length
  }
  let target = clamp(t, 0, 0.999) * total
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i]) {
      const local = lengths[i] === 0 ? 0 : target / lengths[i]
      return [
        lerp(points[i][0], points[i + 1][0], local),
        lerp(points[i][1], points[i + 1][1], local),
        lerp(points[i][2], points[i + 1][2], local),
      ]
    }
    target -= lengths[i]
  }
  return points[points.length - 1]
}

/* -------------------------------------------------------------------- kind: graph -- */

function derivePathIds(scene, frame) {
  const state = stateOf(scene, frame)
  return (state.path || []).map(String)
}

function graphNodePositions(scene) {
  const nodes = scene.layout.nodes || []
  const positions = new Map()
  for (const node of nodes) positions.set(String(node.id), [node.x || 0, node.y || 0, node.z || 0])
  return positions
}

function drawGraph(ctx, ops, labels, scene, params, frame, cam, theme, now, playing) {
  const layout = scene.layout || {}
  const positions = graphNodePositions(scene)
  const sphere = layout.sphere === true
  const path = derivePathIds(scene, frame).filter((id) => positions.has(id))
  const cycle = new Set((stateOf(scene, frame).cycle || []).map(String))

  for (const edge of layout.edges || []) {
    const keyA = String(edge[0])
    const keyB = String(edge[1])
    const style = (params.edges || {})[`${keyA}|${keyB}`] || { tint: theme.dim, alpha: 0.2, width: 0.5 }
    const a = positions.get(keyA)
    const b = positions.get(keyB)
    if (!a || !b) continue
    const points = sphere ? greatCircle(a, b, 16) : [a, b]
    const projected = points.map((point) => cam.project(point))
    if (projected.some((p) => p === null)) continue
    const z = projected.reduce((sum, p) => sum + p.z, 0) / projected.length
    const width = Math.max(1, style.width * ((projected[0].scale + projected[projected.length - 1].scale) / 2) * 0.045)
    const isCycle = style.cycle > 0.5 || (cycle.has(keyA) && cycle.has(keyB))
    ops.push({
      z,
      draw: (ctx) => {
        ctx.save()
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = withAlpha(style.tint, (style.alpha || 0.2) * 0.3)
        ctx.lineWidth = width * 3.4
        ctx.shadowColor = withAlpha(style.tint, isCycle ? 0.7 : 0.25)
        ctx.shadowBlur = isCycle ? 12 : 5
        ctx.beginPath()
        ctx.moveTo(projected[0].x, projected[0].y)
        for (let i = 1; i < projected.length; i++) ctx.lineTo(projected[i].x, projected[i].y)
        ctx.stroke()
        ctx.strokeStyle = withAlpha(style.tint, style.alpha === undefined ? 0.2 : style.alpha)
        ctx.lineWidth = width
        ctx.beginPath()
        ctx.moveTo(projected[0].x, projected[0].y)
        for (let i = 1; i < projected.length; i++) ctx.lineTo(projected[i].x, projected[i].y)
        ctx.stroke()
        ctx.restore()
      },
    })
    if (layout.directed) addArrow(ops, cam, points[points.length - 2] || a, b, style.tint, { alpha: style.alpha, width: style.width * 0.9 })
  }

  // DFS trail ribbon
  const pathPoints = path.map((id) => positions.get(id)).filter(Boolean)
  if (pathPoints.length > 1) {
    addLine3D(ops, cam, pathPoints, theme.ok, { alpha: 0.65, width: 2, glowAlpha: 0.7, glowBlur: 14 })
    if (playing) {
      const point = pointAlongPath(pathPoints, (now % 1600) / 1600, cam)
      if (point) {
        const p = cam.project(point)
        if (p) {
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 16)
          gradient.addColorStop(0, withAlpha(theme.ok, 0.9))
          gradient.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(p.x, p.y, 16, 0, TAU)
          ctx.fill()
          ctx.restore()
        }
      }
    }
  }

  for (const node of layout.nodes || []) {
    const key = String(node.id)
    const style = (params.nodes || {})[key] || { tint: theme.dim, alpha: 1, glow: 0.1 }
    const point = positions.get(key)
    const p = cam.project(point)
    if (!p) continue
    const radius = clamp(0.3 * p.scale, 4.5, 70)
    const alpha = style.alpha === undefined ? 1 : style.alpha
    const isFrontier = style.frontier > 0.5
    const pulse = isFrontier && playing ? 0.5 + 0.5 * Math.sin(now / 230 + node.x) : 0
    ops.push({
      z: p.z + 0.02,
      draw: (ctx) => {
        ctx.save()
        ctx.globalAlpha = alpha
        if (style.frontier > 0.3) {
          ctx.strokeStyle = withAlpha(theme.warn, 0.4 + pulse * 0.4)
          ctx.lineWidth = 1.4
          ctx.beginPath()
          ctx.arc(p.x, p.y, radius * (1.5 + 0.4 * pulse), 0, TAU)
          ctx.stroke()
        }
        if (style.cycle > 0.5) {
          ctx.strokeStyle = withAlpha(theme.bad, 0.9)
          ctx.lineWidth = 1.8
          ctx.beginPath()
          ctx.arc(p.x, p.y, radius * 1.35, 0, TAU)
          ctx.stroke()
        }
        ctx.shadowColor = withAlpha(style.tint, 0.85)
        ctx.shadowBlur = radius * (1.1 + (style.glow || 0) * 2.2)
        const gradient = ctx.createRadialGradient(p.x - radius * 0.35, p.y - radius * 0.4, radius * 0.08, p.x, p.y, radius)
        gradient.addColorStop(0, mixColor(style.tint, '#ffffff', 0.7))
        gradient.addColorStop(0.5, style.tint)
        gradient.addColorStop(1, shadeColor(style.tint, 0.4))
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, TAU)
        ctx.fillStyle = gradient
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.strokeStyle = withAlpha('#ffffff', 0.2)
        ctx.lineWidth = Math.max(0.6, radius * 0.05)
        ctx.stroke()
        if (style.ring > 0.5) {
          ctx.strokeStyle = withAlpha('#ffffff', 0.85)
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.arc(p.x, p.y, radius * 1.28, 0, TAU)
          ctx.stroke()
        }
        ctx.restore()
      },
    })
    addLabel(labels, cam, point, clip(node.label === undefined ? String(node.id) : String(node.label), 4), {
      size: clamp(radius * 0.66, 8, 14),
      weight: 700,
      color: theme.text,
      alpha,
      shadowBlur: 3,
    })
  }

  // BFS wavefront shells
  if (playing) {
    const currentId = stateOf(scene, frame).current
    const position = currentId === undefined ? null : positions.get(String(currentId))
    if (position) {
      const p = cam.project(position)
      if (p) {
        for (let k = 0; k < 2; k++) {
          const phase = ((now / 1250 + k * 0.5) % 1)
          addScreenRing(ops, p.x, p.y, 10 + phase * 90, theme.accent, {
            alpha: (1 - phase) * 0.3,
            z: -0.2,
            strokeAlpha: 0.6,
            width: 1.4,
          })
        }
      }
    }
    for (const node of scene.layout.nodes || []) {
      const style = (params.nodes || {})[String(node.id)] || {}
      if (style.frontier > 0.5) {
        const p = cam.project(positions.get(String(node.id)))
        if (!p) continue
        const pulse = 0.5 + 0.5 * Math.sin(now / 240 + node.x)
        addScreenRing(ops, p.x, p.y, 14 + pulse * 10, theme.warn, { alpha: 0.25, z: -0.2, width: 1.2 })
      }
    }
  }
}

function greatCircle(a, b, segments) {
  const va = normalize3(a)
  const vb = normalize3(b)
  const radius = (Math.hypot(a[0], a[1], a[2]) + Math.hypot(b[0], b[1], b[2])) / 2
  const omega = Math.acos(clamp(dot3(va, vb), -1, 1))
  if (omega < 0.0001) return [a, b]
  const points = []
  const sinOmega = Math.sin(omega)
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const s1 = Math.sin((1 - t) * omega) / sinOmega
    const s2 = Math.sin(t * omega) / sinOmega
    points.push([(va[0] * s1 + vb[0] * s2) * radius, (va[1] * s1 + vb[1] * s2) * radius, (va[2] * s1 + vb[2] * s2) * radius])
  }
  return points
}

/* --------------------------------------------------------------------- kind: grid -- */

function drawGrid(ctx, ops, labels, scene, params, cam, theme, now, playing) {
  const layout = scene.layout || {}
  const rows = layout.rows || 0
  const cols = layout.cols || 0
  const metrics = gridMetrics(rows, cols)
  const floor = FLOOR_Y.grid || -1.15
  const cells = params.cells || {}
  const step = metrics.step
  const tile = Math.max(0.24, step * 0.82)
  const cellPos = (r, c) => [(c - (cols - 1) / 2) * step, floor, (r - (rows - 1) / 2) * step]

  const labelSize = clamp(tile * 42, 8, 13)
  const pathCells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r},${c}`
      const cell = cells[key]
      if (!cell) continue
      const [x, z] = [cellPos(r, c)[0], cellPos(r, c)[2]]
      const height = Math.max(0.03, cell.height || 0.2)
      addBox(ops, cam, [x, floor + height / 2, z], [tile, height, tile], cell.color || theme.accent, {
        alpha: cell.alpha === undefined ? 1 : cell.alpha,
        glow: cell.glow || 0,
        stroke: cell.blocked > 0.5 ? theme.bad : cell.current > 0.5 ? theme.text : undefined,
        scene,
        bg: theme.bg,
      })
      if (cell.path > 0.5) pathCells.push([x, floor + height + 0.04, z])
      const showLabel = String(cell.value).length > 0
      if (showLabel) {
        addLabel(labels, cam, [x, floor + height + 0.16, z], clip(String(cell.value), 4), {
          size: labelSize,
          weight: 600,
          color: cell.blocked > 0.5 ? theme.dim : mixColor(theme.text, cell.color || theme.accent, 0.3),
          alpha: (cell.alpha === undefined ? 1 : cell.alpha) * (cell.filled === 0 && params.hasFill ? 0.4 : 1),
          shadowBlur: 3,
        })
      }
    }
  }
  if (pathCells.length > 1) addLine3D(ops, cam, pathCells, theme.ok, { alpha: 0.6, width: 2, glowAlpha: 0.75, glowBlur: 12 })

  if (playing) {
    const cell = Object.entries(cells).find(([, value]) => value.current > 0.5)
    if (cell) {
      const [r, c] = cell[0].split(',').map(Number)
      const [x, z] = [cellPos(r, c)[0], cellPos(r, c)[2]]
      const p = cam.project([x, floor + (cell[1].height || 0.2), z])
      if (p) {
        const phase = (now % 1100) / 1100
        addScreenRing(ops, p.x, p.y, 8 + phase * 34, theme.warn, { alpha: (1 - phase) * 0.5, z: -0.2, width: 1.5 })
        addBeam(ops, cam, [x, floor + (cell[1].height || 0.2), z], [x, floor + 2.2, z], theme.warn, 0.028, { alpha: 0.4, glow: 10 })
      }
    }
  }
}

/* -------------------------------------------------------------------- kind: stack -- */

function drawStack(ctx, ops, labels, scene, params, cam, theme, now, playing) {
  const floor = FLOOR_Y.stack || -1.5
  const items = params.items || {}
  const keys = Object.keys(items)
    .map(Number)
    .filter((k) => Number.isFinite(k))
    .sort((a, b) => a - b)
  const capacity = (scene.layout && scene.layout.capacity) || Math.max(6, keys.length + 2)
  const slabHeight = 0.46
  const slabWidth = 1.55
  const slabDepth = 1.0
  // capacity guides
  for (let i = 0; i < capacity; i++) {
    const y = floor + i * slabHeight + 0.02
    const left = cam.project([-slabWidth / 2 - 0.1, y, slabDepth / 2 + 0.02])
    const right = cam.project([slabWidth / 2 + 0.1, y, slabDepth / 2 + 0.02])
    if (!left || !right) continue
    ops.push({
      z: (left.z + right.z) / 2 + 0.6,
      draw: (ctx) => {
        ctx.save()
        ctx.strokeStyle = withAlpha(theme.dim, 0.12)
        ctx.lineWidth = 1
        ctx.setLineDash([3, 5])
        ctx.beginPath()
        ctx.moveTo(left.x, left.y)
        ctx.lineTo(right.x, right.y)
        ctx.stroke()
        ctx.restore()
      },
    })
  }
  const sortedKeys = keys.slice().sort((a, b) => a - b)
  for (const key of sortedKeys) {
    const item = items[key]
    const y = floor + key * slabHeight + slabHeight / 2
    const isTop = key === Math.max(...sortedKeys)
    addBox(ops, cam, [0, y, 0], [slabWidth, slabHeight * 0.86, slabDepth], item.tint || theme.accent, {
      alpha: item.alpha === undefined ? 1 : item.alpha,
      glow: item.glow || 0,
      stroke: isTop ? theme.text : undefined,
      scene,
      bg: theme.bg,
    })
    addLabel(labels, cam, [0, y, slabDepth / 2 + 0.02], clip(String(item.value), 6), {
      size: 12,
      weight: 700,
      color: mixColor(theme.text, item.tint || theme.accent, 0.25),
      alpha: item.alpha === undefined ? 1 : item.alpha,
      shadowBlur: 3,
    })
  }
  if (keys.length > 0) {
    const topKey = Math.max(...keys)
    const topY = floor + (topKey + 1) * slabHeight
    const topItem = items[topKey]
    addBeam(ops, cam, [0, topY - 0.1, 0], [0, topY + 0.9, 0], topItem.tint || theme.accent, 0.03, { alpha: 0.4, glow: 10 })
    addDiamond(ops, cam, [0, topY + 1.02, 0], topItem.tint || theme.accent, { size: 0.22 })
    addLabel(labels, cam, [0, topY + 1.02, 0], params.op ? `top · ${params.op}` : 'top', {
      size: 10,
      weight: 700,
      color: topItem.tint || theme.accent,
      dy: -18,
      bg: 'rgba(5,10,20,0.78)',
    })
    if (playing) {
      const p = cam.project([0, topY, 0])
      if (p) {
        const phase = 0.5 + 0.5 * Math.sin(now / 240)
        addScreenRing(ops, p.x, p.y, 16 + phase * 8, topItem.tint || theme.accent, { alpha: 0.25, z: -0.2, width: 1.2 })
      }
    }
  }
}

/* -------------------------------------------------------------------- kind: list -- */

function drawList(ctx, ops, labels, scene, params, cam, theme, now, playing) {
  drawColumns(ctx, ops, labels, scene, params, cam, theme, now, playing, { list: true })
  // connector arrows between consecutive slabs
  const items = params.items || {}
  const keys = Object.keys(items)
    .map(Number)
    .filter((k) => Number.isFinite(k))
    .sort((a, b) => a - b)
  const metrics = columnMetrics(scene, keys.length + 1)
  const floor = FLOOR_Y['linked-list'] || -1.35
  const xAt = (i) => (i - (metrics.n - 1) / 2) * metrics.spacing
  const zAt = (i) => Math.sin(i * 0.62) * 0.62
  for (let i = 0; i < keys.length - 1; i++) {
    const a = [xAt(i) + metrics.width / 2 + 0.03, floor + 0.45, zAt(i)]
    const b = [xAt(i + 1) - metrics.width / 2 - 0.03, floor + 0.45, zAt(i + 1)]
    addArrow(ops, cam, a, b, theme.dim, { alpha: 0.55, width: 0.9 })
  }
  if (keys.length > 0) {
    addLabel(labels, cam, [xAt(keys.length - 1) + metrics.width / 2 + 0.35, floor + 0.45, zAt(keys.length - 1)], 'null', {
      size: 10,
      color: theme.dim,
      alpha: 0.8,
    })
  }
  if (playing) {
    const phase = (now % 1800) / 1800
    const points = keys.map((i) => [xAt(i), floor + 0.45, zAt(i)])
    if (points.length > 1) {
      const point = pointAlongPath(points, phase, cam)
      if (point) {
        const p = cam.project(point)
        if (p) {
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12)
          gradient.addColorStop(0, withAlpha(theme.accent, 0.7))
          gradient.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(p.x, p.y, 12, 0, TAU)
          ctx.fill()
          ctx.restore()
        }
      }
    }
  }
}

/* ---------------------------------------------------------------------- HUD + draw -- */

function drawHud(ctx, viewer, W, H, theme, scene, frameIndex, frame, fallbackMode) {
  const pad = 14
  if (frame && typeof frame.label === 'string') {
    drawPill(ctx, pad, pad, clip(frame.label, 34), theme.accent, theme, { font: '600 11.5px ui-sans-serif, system-ui, sans-serif' })
  }
  const total = scene && Array.isArray(scene.frames) ? scene.frames.length : 0
  const counter = total > 0 ? `${Math.min(frameIndex + 1, total)} / ${total}` : '—'
  drawPill(ctx, W - pad, pad, counter, theme.dim, theme, {
    font: '600 11px ui-sans-serif, system-ui, sans-serif',
    align: 'right',
  })
  if (fallbackMode) {
    drawPill(ctx, W - pad, H - pad, 'narration fallback', theme.warn, theme, {
      font: '600 10.5px ui-sans-serif, system-ui, sans-serif',
      align: 'right',
    })
  }
}

function drawFallback(ctx, W, H, raw, theme) {
  const lines = narrationLines(raw)
  const title = lines[0] || 'Scene unavailable'
  const body = lines.slice(1, 8)
  ctx.save()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.font = '700 18px ui-sans-serif, system-ui, sans-serif'
  ctx.fillStyle = theme.text
  ctx.fillText(clip(title, 64), 26, 56)
  ctx.font = '500 12.5px ui-sans-serif, system-ui, sans-serif'
  ctx.fillStyle = theme.dim
  let y = 92
  for (const line of body) {
    const wrapped = wrapText(ctx, line, Math.min(W - 52, 720))
    for (const piece of wrapped) {
      ctx.fillText(piece, 26, y)
      y += 19
      if (y > H - 26) break
    }
    y += 4
    if (y > H - 26) break
  }
  ctx.restore()
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else line = candidate
  }
  if (line) lines.push(line)
  return lines
}

/* ---------------------------------------------------------------------- createViewer -- */

export function createViewer(container, options = {}) {
  if (!container || typeof container !== 'object') throw new Error('createViewer requires a container element')

  const theme = { ...DEFAULT_THEME, ...(options && options.theme ? options.theme : {}) }
  let reducedMotion =
    typeof (options && options.reducedMotion) === 'boolean'
      ? options.reducedMotion
      : typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false

  const previousPosition = container.style.position
  const previousOverflow = container.style.overflow
  if (typeof getComputedStyle === 'function' && getComputedStyle(container).position === 'static') {
    container.style.position = 'relative'
  }
  container.style.overflow = 'hidden'

  const canvas = document.createElement('canvas')
  canvas.style.position = 'absolute'
  canvas.style.inset = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.display = 'block'
  canvas.style.touchAction = 'none'
  canvas.style.cursor = 'grab'
  canvas.style.outline = 'none'
  container.appendChild(canvas)

  const caption = document.createElement('div')
  caption.style.position = 'absolute'
  caption.style.left = '12px'
  caption.style.right = '12px'
  caption.style.bottom = '12px'
  caption.style.padding = '9px 13px'
  caption.style.background = 'rgba(6,11,22,0.76)'
  caption.style.border = `1px solid ${withAlpha(theme.accent, 0.2)}`
  caption.style.borderRadius = '10px'
  caption.style.color = theme.text
  caption.style.font = '500 12.5px/1.4 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
  caption.style.letterSpacing = '0.1px'
  caption.style.backdropFilter = 'blur(8px)'
  caption.style.pointerEvents = 'none'
  caption.style.opacity = '0'
  caption.style.transition = reducedMotion ? 'none' : 'opacity 180ms ease'
  caption.style.display = 'none'
  container.appendChild(caption)

  const ctx = canvas.getContext('2d', { alpha: false })

  let cssW = 0
  let cssH = 0
  let dpr = 1
  let resizeObserver = null
  let destroyed = false
  let rafId = 0
  let lastDrawTime = 0
  let playing = false
  let nextFrameAt = 0
  let fallbackRaw = null

  let scene = null
  let paramsA = null
  let paramsB = null
  let animFromParams = null
  let transitionStart = 0
  let transitionDur = TRANSITION_MS
  let frameIndex = 0
  let lastBlended = null

  const camera = {
    yaw: 0.6,
    pitch: 0.34,
    yawT: 0.6,
    pitchT: 0.34,
    zoom: 1.12,
    zoomT: 1,
    fitDist: 9.5,
    dist: 9.5 * 1.12,
  }
  let sceneStartedAt = 0
  let lastPointer = null
  let dragging = false
  let hover = false

  const listeners = new Set()

  const abort = typeof AbortController === 'function' ? new AbortController() : null
  const on = (target, type, handler, opts) => {
    if (!target || !target.addEventListener) return
    const optionsWithSignal = abort ? { ...(opts || {}), signal: abort.signal } : opts
    target.addEventListener(type, handler, optionsWithSignal)
  }
  const mediaQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
  if (mediaQuery && typeof mediaQuery.addEventListener === 'function' && !(options && typeof options.reducedMotion === 'boolean')) {
    on(mediaQuery, 'change', (event) => {
      reducedMotion = Boolean(event.matches)
    })
  }

  /* -------------------------------------------------------------------- sizing -- */

  function measure() {
    const rect = container.getBoundingClientRect ? container.getBoundingClientRect() : { width: 0, height: 0 }
    const width = Math.max(0, Math.round(rect.width || 0))
    const height = Math.max(0, Math.round(rect.height || 0))
    if (width === 0 || height === 0) {
      cssW = 0
      cssH = 0
      return false
    }
    const nextDpr = Math.min(DPR_MAX, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1))
    if (width !== cssW || height !== cssH || nextDpr !== dpr) {
      cssW = width
      cssH = height
      dpr = nextDpr
      canvas.width = Math.max(1, Math.round(cssW * dpr))
      canvas.height = Math.max(1, Math.round(cssH * dpr))
      if (scene) {
        camera.fitDist = computeFitDistance(scene, cssW, cssH)
        camera.dist = camera.fitDist * camera.zoom
      }
      requestDraw()
      return true
    }
    return false
  }

  function computeFitDistance(scene, width, height) {
    const aspect = Math.max(0.35, width / Math.max(1, height))
    const tan = Math.tan(FOV / 2)
    let halfWidth = 4.8
    let halfHeight = 3.2
    let depth = 2.4
    const kind = scene.kind
    const layout = scene.layout || {}
    if (kind === 'array' || kind === 'string') {
      const count = kind === 'string' ? (layout.chars || []).length : (layout.values || []).length
      const spacing = count <= 1 ? 1.3 : Math.min(1.12, 8.6 / (count - 1))
      halfWidth = ((count - 1) * spacing) / 2 + 0.7
      halfHeight = 2.9
      depth = 2
    } else if (kind === 'linked-list') {
      const count = (layout.values || []).length
      const spacing = count <= 1 ? 1.3 : Math.min(1.12, 8.6 / (count - 1))
      halfWidth = ((count - 1) * spacing) / 2 + 1
      halfHeight = 2.2
      depth = 2.6
    } else if (kind === 'tree') {
      const nodes = layout.nodes || []
      halfWidth = nodes.reduce((max, node) => Math.max(max, Math.abs(node.x || 0)), 0) + 0.9
      halfHeight = nodes.reduce((max, node) => Math.max(max, Math.abs(node.y || 0)), 0) + 1.2
      depth = nodes.reduce((max, node) => Math.max(max, Math.abs((node.z || 0) + 2)), 0) + 1
    } else if (kind === 'graph') {
      const nodes = layout.nodes || []
      halfWidth = nodes.reduce((max, node) => Math.max(max, Math.abs(node.x || 0)), 0) + 1
      halfHeight = nodes.reduce((max, node) => Math.max(max, Math.abs(node.y || 0)), 0) + 1.2
      depth = nodes.reduce((max, node) => Math.max(max, Math.abs((node.z || 0) + 2)), 0) + 1.2
    } else if (kind === 'grid') {
      const metrics = gridMetrics(layout.rows || 1, layout.cols || 1)
      halfWidth = metrics.width / 2 + 1.2
      halfHeight = 2.6
      depth = metrics.depth / 2 + 2.6
    } else if (kind === 'stack') {
      const capacity = (layout.capacity || 6) + 1
      halfWidth = 1.8
      halfHeight = capacity * 0.46 + 0.5
      depth = 2.4
    }
    const verticalDistance = (halfHeight * 0.88) / tan
    const horizontalDistance = (halfWidth * 0.95) / (tan * aspect)
    const depthDistance = depth * 0.32
    let distance = clamp(Math.max(verticalDistance, horizontalDistance) + depthDistance, 4.2, 40)

    // Perspective magnifies near geometry, so a world-space estimate alone can clip the
    // closest bar. Walk the camera back until every bounding corner projects inside the
    // stage with a margin.
    const cameraGuess = scene.camera || {}
    const yaw = isNum(cameraGuess.yaw) ? cameraGuess.yaw : 0.6
    const pitch = isNum(cameraGuess.pitch) ? cameraGuess.pitch : 0.32
    const corners = []
    for (const signX of [-1, 1]) {
      for (const signY of [-1, 1]) {
        for (const signZ of [-1, 1]) corners.push([signX * halfWidth, signY * halfHeight, signZ * depth])
      }
    }
    for (let step = 0; step < 16; step += 1) {
      const probe = makeCamera(scene, width, height, { yaw, pitch, dist: distance })
      let fits = true
      for (const corner of corners) {
        const projected = probe.project(corner)
        if (!projected) {
          fits = false
          break
        }
        if (Math.abs(projected.x - width / 2) > width * 0.46 || Math.abs(projected.y - height / 2) > height * 0.46) {
          fits = false
          break
        }
      }
      if (fits) break
      distance *= 1.08
    }
    return clamp(distance, 4.2, 40)
  }

  /* ----------------------------------------------------------------- rendering -- */

  function currentBlend(now) {
    if (!scene) return null
    const target = scene.frames[clamp(frameIndex, 0, scene.frames.length - 1)]
    paramsB = paramsB || buildParams(scene, target, theme)
    if (!animFromParams) return paramsB
    const t = transitionDur <= 0 ? 1 : clamp((now - transitionStart) / transitionDur, 0, 1)
    if (t >= 1) {
      animFromParams = null
      return paramsB
    }
    return blendAny(animFromParams, paramsB, easeOutCubic(t))
  }

  function render(now) {
    if (!ctx || destroyed) return
    if (cssW <= 0 || cssH <= 0) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawBackground(ctx, cssW, cssH, theme)
    const blended = currentBlend(now)
    lastBlended = blended
    if (!scene || !blended) {
      drawFallback(ctx, cssW, cssH, fallbackRaw || scene, theme)
      drawHud(ctx, null, cssW, cssH, theme, null, 0, null, true)
      return
    }
    const cam = makeCamera(scene, cssW, cssH, camera)
    drawStage(ctx, cam, scene, theme, cssW, cssH, now, playing)
    const ops = []
    const labels = []
    const frame = scene.frames[clamp(frameIndex, 0, scene.frames.length - 1)]
    try {
      switch (scene.kind) {
        case 'array':
        case 'string':
          drawColumns(ctx, ops, labels, scene, blended, cam, theme, now, playing)
          break
        case 'linked-list':
          drawList(ctx, ops, labels, scene, blended, cam, theme, now, playing)
          break
        case 'tree':
          drawTreeWithPath(ctx, ops, labels, scene, blended, frame, cam, theme, now, playing)
          break
        case 'graph':
          drawGraph(ctx, ops, labels, scene, blended, frame, cam, theme, now, playing)
          break
        case 'grid':
          drawGrid(ctx, ops, labels, scene, blended, cam, theme, now, playing)
          break
        case 'stack':
          drawStack(ctx, ops, labels, scene, blended, cam, theme, now, playing)
          break
        default:
          drawFallback(ctx, cssW, cssH, fallbackRaw || scene, theme)
      }
    } catch (error) {
      // Never crash the app on a malformed scene: draw the narration instead.
      drawFallback(ctx, cssW, cssH, fallbackRaw || scene || { title: 'Scene unavailable', frames: [] }, theme)
      ops.length = 0
      labels.length = 0
    }
    ops.sort((a, b) => b.z - a.z)
    for (const op of ops) {
      try {
        op.draw(ctx)
      } catch {
        /* skip one bad draw op */
      }
    }
    labels.sort((a, b) => b.z - a.z)
    for (const label of labels) {
      try {
        label.draw(ctx)
      } catch {
        /* skip one bad label */
      }
    }
    drawHud(ctx, null, cssW, cssH, theme, scene, frameIndex, frame, false)
    lastDrawTime = now
  }

  function drawTreeWithPath(ctx, ops, labels, scene, blended, frame, cam, theme, now, playing) {
    const path = derivePathIds(scene, frame)
    const byId = new Map((scene.layout.nodes || []).map((node) => [String(node.id), node]))
    const pathNodes = path.map((id) => byId.get(String(id))).filter(Boolean)
    if (pathNodes.length > 1) {
      addLine3D(
        ops,
        cam,
        pathNodes.map((node) => [node.x, node.y, node.z || 0]),
        theme.ok,
        { alpha: 0.45, width: 1.3, glowAlpha: 0.6, glowBlur: 12 },
      )
    }
    drawTree(ctx, ops, labels, scene, blended, cam, theme, now, playing)
    if (playing && pathNodes.length > 1) {
      const point = pointAlongPath(pathNodes.map((node) => [node.x, node.y, node.z || 0]), (now % 1700) / 1700, cam)
      if (point) {
        const p = cam.project(point)
        if (p) {
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 16)
          gradient.addColorStop(0, withAlpha(theme.ok, 0.9))
          gradient.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(p.x, p.y, 16, 0, TAU)
          ctx.fill()
          ctx.restore()
        }
      }
    }
  }

  /* ------------------------------------------------------------- animation loop -- */

  function requestDraw() {
    if (destroyed) return
    if (rafId) return
    rafId = requestAnimationFrame(tick)
  }

  function tick(now) {
    rafId = 0
    if (destroyed) return
    let busy = false
    // camera easing
    const cameraDelta = Math.abs(camera.yawT - camera.yaw) + Math.abs(camera.pitchT - camera.pitch) + Math.abs(camera.zoomT - camera.zoom)
    if (cameraDelta > 0.0004) {
      const ease = reducedMotion ? 1 : 0.18
      camera.yaw = lerp(camera.yaw, camera.yawT, ease)
      camera.pitch = lerp(camera.pitch, camera.pitchT, ease)
      camera.zoom = lerp(camera.zoom, camera.zoomT, ease)
      busy = true
    } else {
      camera.yaw = camera.yawT
      camera.pitch = camera.pitchT
      camera.zoom = camera.zoomT
    }
    camera.dist = camera.fitDist * camera.zoom
    if (animFromParams) {
      const t = transitionDur <= 0 ? 1 : (now - transitionStart) / transitionDur
      if (t >= 1) {
        animFromParams = null
      } else busy = true
    }
    if (playing) {
      busy = true
      if (now >= nextFrameAt) {
        nextFrameAt = now + FRAME_MS
        const total = scene ? scene.frames.length : 0
        if (total > 0) goToInternal((frameIndex + 1) % total, false)
      }
    }
    if (reducedMotion && playing) {
      // step frames without tweening or pulses
    }
    render(now)
    if (busy) requestDraw()
  }

  /* ------------------------------------------------------------------- public api -- */

  function emitFrame() {
    if (!scene) return
    const frame = scene.frames[clamp(frameIndex, 0, scene.frames.length - 1)]
    for (const listener of listeners) {
      try {
        listener(frameIndex, frame)
      } catch {
        /* a bad listener must not break rendering */
      }
    }
  }

  function setScene(raw) {
    if (destroyed) return
    let next = null
    try {
      next = normalizeScene(raw)
    } catch {
      next = null
    }
    fallbackRaw = next ? null : raw
    scene = next
    frameIndex = 0
    paramsA = null
    paramsB = null
    animFromParams = null
    transitionStart = 0
    transitionDur = 0
    lastBlended = null
    sceneStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (scene) {
      camera.fitDist = computeFitDistance(scene, cssW || 900, cssH || 600)
      const cam = scene.camera || {}
      camera.yaw = camera.yawT = isNum(cam.yaw) ? cam.yaw : 0.6
      camera.pitch = camera.pitchT = isNum(cam.pitch) ? cam.pitch : 0.34
      camera.zoom = 1.12
      camera.zoomT = 1
      camera.dist = camera.fitDist * camera.zoom
      paramsB = buildParams(scene, scene.frames[0], theme)
      emitFrame()
      requestDraw()
    } else {
      requestDraw()
      if (typeof raw === 'object' && raw) emitFrame()
    }
  }

  function goToInternal(index, emit = true) {
    if (!scene) return
    const total = scene.frames.length
    if (total === 0) return
    const next = clamp(Math.round(isNum(index) ? index : 0), 0, total - 1)
    if (next === frameIndex) {
      render(typeof performance !== 'undefined' ? performance.now() : Date.now())
      return
    }
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (lastBlended && !reducedMotion) animFromParams = lastBlended
    else animFromParams = null
    frameIndex = next
    paramsB = buildParams(scene, scene.frames[frameIndex], theme)
    transitionStart = now
    transitionDur = reducedMotion ? 0 : TRANSITION_MS
    if (playing) nextFrameAt = now + FRAME_MS
    if (emit) emitFrame()
    requestDraw()
  }

  function goTo(index) {
    goToInternal(index, true)
  }

  function play() {
    if (destroyed) return
    playing = true
    nextFrameAt = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + FRAME_MS
    requestDraw()
  }

  function pause() {
    playing = false
    requestDraw()
  }

  function setAiOverlay(text) {
    if (destroyed) return
    const value = text === undefined || text === null ? '' : String(text).trim()
    if (!value) {
      caption.style.opacity = '0'
      caption.style.display = 'none'
      return
    }
    caption.textContent = value
    caption.style.display = 'block'
    requestAnimationFrame(() => {
      caption.style.opacity = '1'
    })
  }

  function onEvent(type, callback) {
    if (type !== 'frame' || typeof callback !== 'function') return () => {}
    listeners.add(callback)
    return () => listeners.delete(callback)
  }

  function destroy() {
    if (destroyed) return
    destroyed = true
    playing = false
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
    if (abort) abort.abort()
    if (resizeObserver) resizeObserver.disconnect()
    listeners.clear()
    try {
      if (caption.parentNode) caption.parentNode.removeChild(caption)
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
    } catch {
      /* nodes may already be gone */
    }
    container.style.position = previousPosition
    container.style.overflow = previousOverflow
  }

  /* -------------------------------------------------------------------- events -- */

  function pointerPos(event) {
    return { x: event.clientX, y: event.clientY }
  }

  on(canvas, 'pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return
    if (event.preventDefault) event.preventDefault()
    dragging = true
    lastPointer = pointerPos(event)
    canvas.style.cursor = 'grabbing'
    try {
      canvas.setPointerCapture(event.pointerId)
    } catch {
      /* not fatal */
    }
  })
  on(canvas, 'pointermove', (event) => {
    if (!dragging || !lastPointer) return
    if (event.preventDefault) event.preventDefault()
    const point = pointerPos(event)
    const dx = point.x - lastPointer.x
    const dy = point.y - lastPointer.y
    lastPointer = point
    camera.yawT = clamp(camera.yawT - dx * 0.0072, -2.4, 2.4)
    camera.pitchT = clamp(camera.pitchT + dy * 0.0055, -0.18, 1.1)
    requestDraw()
  })
  const endDrag = () => {
    dragging = false
    lastPointer = null
    canvas.style.cursor = 'grab'
  }
  on(canvas, 'pointerup', endDrag)
  on(canvas, 'pointercancel', endDrag)
  on(canvas, 'pointerleave', () => {
    if (!dragging) hover = false
  })
  on(canvas, 'pointerenter', () => {
    hover = true
  })
  on(canvas, 'wheel', (event) => {
    if (event.preventDefault) event.preventDefault()
    const delta = event.deltaY || 0
    camera.zoomT = clamp(camera.zoomT * Math.exp(delta * 0.0011), 0.6, 1.9)
    requestDraw()
  }, { passive: false })
  on(canvas, 'dblclick', (event) => {
    if (event.preventDefault) event.preventDefault()
    if (scene) {
      const cam = scene.camera || {}
      camera.yawT = isNum(cam.yaw) ? cam.yaw : 0.6
      camera.pitchT = isNum(cam.pitch) ? cam.pitch : 0.34
    }
    camera.zoomT = 1
    requestDraw()
  })
  on(canvas, 'contextmenu', (event) => {
    if (event.preventDefault) event.preventDefault()
  })

  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(() => {
      measure()
    })
    resizeObserver.observe(container)
  } else {
    if (typeof window !== 'undefined') on(window, 'resize', () => measure())
  }

  // First paint (container may be 0×0 while hidden — ResizeObserver kicks in later).
  measure()
  requestDraw()

  return {
    setScene,
    goTo,
    play,
    pause,
    on: onEvent,
    destroy,
    setAiOverlay,
  }
}

export default { createViewer }
