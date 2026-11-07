/**
 * Diagram renderer — a legible, interactive 2D view of algorithm state.
 *
 * Design basis:
 *  - "Brushing and linking" (Becker & Cleveland): the code line, the variables and the
 *    diagram are three views of one state, so hovering any of them highlights the others.
 *  - "Explorable examples" (Bret Victor): the reader can change the input and immediately
 *    see the algorithm re-run, instead of watching one canned animation.
 *
 * Renders SVG with a viewBox, so it scales crisply at any panel size. Elements are built
 * once per scene and only re-classed per frame, which lets CSS transitions animate the
 * movement instead of redrawing frames.
 */
const NS = 'http://www.w3.org/2000/svg'

function svgEl(tag, attrs, children) {
  const node = document.createElementNS(NS, tag)
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue
      node.setAttribute(key, String(value))
    }
  }
  for (const child of children || []) {
    if (child === null || child === undefined) continue
    node.appendChild(child)
  }
  return node
}

function text(content, attrs) {
  const node = svgEl('text', attrs)
  node.textContent = String(content)
  return node
}

const PALETTE = {
  cell: '#242B47',
  cellStroke: '#5A6694',
  text: '#dbe4f5',
  muted: '#8A93A8',
  accent: '#8b9bff',
  accentSoft: '#232A4D',
  mint: '#55d6c2',
  mintSoft: '#134E44',
  chip: '#8B96B5',
  chipInk: '#1B2138',
  ok: '#3ddc97',
  okSoft: '#1C4A3A',
  sky: '#8B96B5',
  skySoft: '#252C48',
  warn: '#ffc857',
  warnSoft: '#4A3D16',
  bad: '#ff6b81',
  window: '#232A4D',
  windowStroke: '#8b9bff',
}

const CELL = 56
const GAP = 10
const CHAR_CELL = 40

export function createDiagram(container, options = {}) {
  const palette = Object.assign({}, PALETTE, options.theme || {})
  let svg = null
  let scene = null
  let frameIndex = 0
  let model = null
  let tip = null
  let hoverHandlers = []
  let disposed = false

  if (container.classList) container.classList.add('lc-diagram')

  function ensureTip() {
    if (tip !== null) return tip
    tip = document.createElement('div')
    tip.className = 'lc-diagram-tip'
    tip.style.display = 'none'
    container.appendChild(tip)
    return tip
  }

  function showTip(event, lines) {
    const element = ensureTip()
    element.textContent = ''
    for (const line of lines) {
      const row = document.createElement('div')
      row.textContent = line
      element.appendChild(row)
    }
    const rect = container.getBoundingClientRect()
    element.style.display = 'block'
    element.style.left = Math.max(8, event.clientX - rect.left + 12) + 'px'
    element.style.top = Math.max(8, event.clientY - rect.top + 12) + 'px'
  }

  function hideTip() {
    if (tip === null) return
    tip.style.display = 'none'
  }

  function emitHover(payload) {
    for (const handler of hoverHandlers) {
      try {
        handler(payload)
      } catch {
        /* a broken listener must not break the diagram */
      }
    }
  }

  function reset(width, height) {
    if (svg !== null) svg.remove()
    // Tight pad: the diagram should fill its panel, not float in a void. Content is
    // already centered by preserveAspectRatio; a small margin suffices.
    const pad = Math.max(width, height) * 0.07 + 10
    svg = svgEl('svg', {
      viewBox: `${-pad} ${-pad} ${Math.max(1, width) + pad * 2} ${Math.max(1, height) + pad * 2}`,
      preserveAspectRatio: 'xMidYMid meet',
      class: 'lc-diagram-svg',
    })
    container.appendChild(svg)
    return svg
  }

  /* ---------------------------------------------------------------- array-ish */

  function buildCells(values, opts = {}) {
    const isChar = Boolean(opts.chars)
    const cell = isChar ? CHAR_CELL : CELL
    const values2 = values || []
    const count = Math.max(1, values2.length)
    const width = Math.max(opts.minWidth || 240, count * (cell + GAP) + 40)
    const pointerStack = Math.max(1, opts.pointerNames || 1)
    const top = 34 + pointerStack * 22
    const height = top + cell + 44 + (opts.extraHeight || 0)
    const root = reset(width, height)
    const cells = []
    const x0 = (width - (count * (cell + GAP) - GAP)) / 2

    const band = svgEl('rect', {
      class: 'lc-band',
      x: x0 - 6,
      y: top - 8,
      width: cell + 12,
      height: cell + 16,
      rx: 12,
    })
    root.appendChild(band)

    for (let index = 0; index < count; index += 1) {
      const x = x0 + index * (cell + GAP)
      const group = svgEl('g', { class: 'lc-cell', transform: `translate(${x},${top})` })
      const rect = svgEl('rect', {
        class: 'lc-cell-rect',
        width: cell,
        height: cell,
        rx: 10,
        fill: palette.cell,
        stroke: palette.cellStroke,
        'stroke-width': 1.5,
      })
      const label = text(values2[index] === undefined ? '·' : values2[index], {
        x: cell / 2,
        y: cell / 2 + 6,
        'text-anchor': 'middle',
        class: 'lc-cell-value',
        fill: palette.text,
        'font-size': isChar ? 15 : 16,
        'font-weight': 600,
      })
      const idx = text(index, {
        x: cell / 2,
        y: cell + 20,
        'text-anchor': 'middle',
        class: 'lc-cell-index',
        fill: palette.muted,
        'font-size': 11,
      })
      group.appendChild(rect)
      group.appendChild(label)
      group.appendChild(idx)
      group.addEventListener('mouseenter', (event) => {
        showTip(event, [`index ${index}`, `value ${values2[index]}`])
        emitHover({ kind: 'cell', index })
      })
      group.addEventListener('mousemove', (event) => showTip(event, [`index ${index}`, `value ${values2[index]}`]))
      group.addEventListener('mouseleave', () => {
        hideTip()
        emitHover(null)
      })
      cells.push({ group, rect, label, index })
      root.appendChild(group)
    }

    const pointerLayer = svgEl('g', { class: 'lc-pointers' })
    root.appendChild(pointerLayer)

    return { kind: 'cells', root, cells, x0, cell, top, width, height, pointerLayer, pointerStack, cellGap: GAP }
  }

  function pointerChip(name, x, y, color) {
    const group = svgEl('g', { class: 'lc-pointer' })
    const pill = svgEl('rect', { x: -16, y: -12, width: Math.max(32, name.length * 8 + 20), height: 24, rx: 6, fill: color, stroke: color, 'stroke-width': 2 })
    const label = text(name, { x: 0, y: 4.5, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800, fill: palette.chipInk })
    const stem = svgEl('line', { x1: 0, y1: 12, x2: 0, y2: 24, stroke: color, 'stroke-width': 2.5 })
    group.appendChild(pill)
    group.appendChild(label)
    group.appendChild(stem)
    // Position via CSS transform (not the attribute) so chips glide between frames.
    group.style.transform = `translate(${x}px,${y}px)`
    return group
  }

  /** Muted one-line caption for frames whose state is genuinely still empty. */
  function emptyCaption(layer, x, y, message) {
    const group = svgEl('g', { class: 'lc-emptycap' })
    group.appendChild(text(message || 'nothing computed yet — step forward (→)', { x, y, 'text-anchor': 'middle', 'font-size': 13, fill: palette.muted }))
    layer.appendChild(group)
  }

  function isEmptyCellState(state) {
    return (
      Object.keys(state.pointers || {}).length === 0 &&
      Object.keys(state.highlights || {}).length === 0 &&
      Object.keys(state.seen || {}).length === 0 &&
      !state.window &&
      !Array.isArray(state.stack) &&
      !state.counts &&
      !state.resolved &&
      !state.lookup
    )
  }

  /* ------------------------------------------------------------------ builders */

  function buildArrayScene(nextScene) {
    const values = (nextScene.layout && nextScene.layout.values) || []
    const chars = nextScene.layout && nextScene.layout.chars
    const pattern = (nextScene && nextScene.pattern) || ''
    // Family overlays need vertical room: counts table (sliding-window), stack strip
    // (monotonic-stack), heap tree (heap-topk). One overlay row is ~150px.
    const needsOverlay = pattern === 'sliding-window' || pattern === 'monotonic-stack' || pattern === 'heap-topk'
    const hasMap = (nextScene.frames || []).some(frame => frame.state && frame.state.seen)
    const mapRows = Math.min(6, Math.max(0, ...(nextScene.frames || []).map(frame => Object.keys(frame.state?.seen || {}).length)))
    const model2 = buildCells(chars || values, { chars: Boolean(chars), minWidth: hasMap ? 460 : 240, extraHeight: hasMap ? 95 + Math.max(1, mapRows) * 28 : needsOverlay ? 190 : 0 })
    model2.hasMap = hasMap
    if (hasMap) model2.root.appendChild(text('nums · array values, indexed from 0', { class: 'lc-semantic-muted', x: 16, y: 2, fill: palette.muted, 'font-size': 13 }))
    model2.pattern = pattern
    model2.hashLayer = svgEl('g', { class: 'lc-hash' })
    model2.root.appendChild(model2.hashLayer)
    model2.overlayLayer = svgEl('g', { class: 'lc-overlay' })
    model2.root.appendChild(model2.overlayLayer)
    model = model2
  }

  function buildTreeScene(nextScene) {
    const nodes = (nextScene.layout && nextScene.layout.nodes) || []
    const edges = (nextScene.layout && nextScene.layout.edges) || []
    const byId = new Map(nodes.map((node) => [String(node.id), node]))
    const children = new Map()
    for (const [parent, child] of edges) {
      const key = String(parent)
      if (!children.has(key)) children.set(key, [])
      children.get(key).push(String(child))
    }
    const roots = nodes.filter((node) => !edges.some(([, child]) => String(child) === String(node.id)))
    const rootId = roots.length > 0 ? String(roots[0].id) : nodes.length > 0 ? String(nodes[0].id) : null

    // Layered layout: x by in-order leaf slot, y by depth.
    const positions = new Map()
    let leaf = 0
    const place = (id, depth, seen) => {
      if (seen.has(id)) return positions.get(id) ? positions.get(id).x : 0
      seen.add(id)
      const kids = (children.get(id) || []).filter((child) => !seen.has(child))
      const xs = kids.map((child) => place(child, depth + 1, seen))
      const x = xs.length === 0 ? leaf++ : xs.reduce((sum, value) => sum + value, 0) / xs.length
      positions.set(id, { x, depth })
      return x
    }
    if (rootId !== null) place(rootId, 0, new Set())
    for (const node of nodes) if (!positions.has(String(node.id))) place(String(node.id), 0, new Set())

    // A single-child chain has no siblings to spread against, so nudge each only child
    // sideways, alternating per depth. Without this a skewed tree reads as a vertical line.
    const drifted = new Set()
    const driftQueue = rootId === null ? [] : [[rootId, (positions.get(rootId) || { x: 0 }).x]]
    while (driftQueue.length > 0) {
      const [id, parentX] = driftQueue.shift()
      const kids = (children.get(String(id)) || []).filter((child) => !drifted.has(child))
      for (const child of kids) drifted.add(child)
      if (kids.length === 1) {
        const childId = kids[0]
        const position = positions.get(childId)
        if (position) position.x = parentX + (position.depth % 2 === 0 ? 0.62 : -0.62)
        driftQueue.push([childId, (positions.get(childId) || { x: 0 }).x])
      } else {
        for (const child of kids) driftQueue.push([child, (positions.get(child) || { x: 0 }).x])
      }
    }
    const leafCount = Math.max(1, leaf)
    const spacingX = Math.min(104, Math.max(64, 700 / Math.max(1, leafCount - 1)))
    const spacingY = 100
    const maxDepth = nodes.reduce((max, node) => Math.max(max, (positions.get(String(node.id)) || {}).depth || 0), 0)
    // Sidebar room for backtracking / BFS trees (recursion stack / queue).
    const treePatternEarly = (nextScene && nextScene.pattern) || ''
    const treeSideWEarly = treePatternEarly === 'backtracking' || treePatternEarly === 'tree-bfs' || treePatternEarly === 'trie' ? 176 : 0
    const width = Math.max(280, leafCount * spacingX + 80) + treeSideWEarly
    const height = 80 + (maxDepth + 1) * spacingY
    const root = reset(width, height)
    // Re-center the tree in the area left of the sidebar.
    var treeShiftX = treeSideWEarly ? -treeSideWEarly / 2 : 0

    const centreX = (positions.get(rootId) || { x: 0 }).x
    const point = (id) => {
      const position = positions.get(String(id)) || { x: 0, depth: 0 }
      return {
        x: width / 2 + (typeof treeShiftX === 'number' ? treeShiftX : 0) + (position.x - centreX) * spacingX,
        y: 52 + position.depth * spacingY,
      }
    }

    const edgeLayer = svgEl('g', { class: 'lc-edges' })
    const edgeEls = new Map()
    for (const [parent, child] of edges) {
      const a = point(parent)
      const b = point(child)
      const line = svgEl('line', {
        class: 'lc-edge',
        x1: a.x,
        y1: a.y + 24,
        x2: b.x,
        y2: b.y - 24,
        stroke: '#3A4358',
        'stroke-width': 2.5,
      })
      edgeLayer.appendChild(line)
      edgeEls.set(String(parent) + '|' + String(child), line)
    }
    root.appendChild(edgeLayer)

    const nodeLayer = svgEl('g', { class: 'lc-nodes' })
    root.appendChild(nodeLayer)
    const nodeEls = new Map()
    const distEls = new Map()
    const pos = new Map()
    for (const node of nodes) {
      const position = point(node.id)
      pos.set(String(node.id), position)
      const group = svgEl('g', { class: 'lc-node', transform: `translate(${position.x},${position.y})` })
      const circle = svgEl('circle', { r: 24, fill: palette.cell, stroke: palette.cellStroke, 'stroke-width': 1.6 })
      // Prefer the human label (subset contents, trie char) over the numeric value.
      const caption = node.label !== undefined && node.label !== null && String(node.label) !== '' ? node.label : (node.value === undefined ? '' : node.value)
      const label = text(caption, { x: 0, y: 5, 'text-anchor': 'middle', 'font-size': String(caption).length > 4 ? 10 : 15, 'font-weight': 600, fill: palette.text, class: 'lc-node-label' })
      group.appendChild(circle)
      group.appendChild(label)
      const dist = text('', { x: 0, y: 36, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: palette.sky, class: 'lc-dist' })
      group.appendChild(dist)
      distEls.set(String(node.id), dist)
      group.addEventListener('mouseenter', (event) => {
        showTip(event, [`node ${node.id}`, `value ${node.value}`])
        emitHover({ kind: 'node', id: String(node.id) })
      })
      group.addEventListener('mousemove', (event) => showTip(event, [`node ${node.id}`, `value ${node.value}`]))
      group.addEventListener('mouseleave', () => {
        hideTip()
        emitHover(null)
      })
      nodeEls.set(String(node.id), { group, circle, label })
      nodeLayer.appendChild(group)
    }
    const queueLayer = svgEl('g', { class: 'lc-queue' })
    root.appendChild(queueLayer)
    // Recursion-stack sidebar for backtracking / tree traversals: the path is the stack.
    const treePattern = (nextScene && nextScene.pattern) || ''
    const treeSideW = treePattern === 'backtracking' || treePattern === 'tree-bfs' || treePattern === 'trie' ? 176 : 0
    const treeCaption = svgEl('g', { class: 'lc-caption' })
    root.appendChild(treeCaption)

    model = { kind: 'tree', root, nodeEls, distEls, edgeEls, edges, width, height, pos, pattern: treePattern, queueLayer, parentLayer: null, sideX: width - treeSideW + 12, sideW: treeSideW, captionLayer: treeCaption }
  }

  function buildGraphScene(nextScene) {
    const nodes = (nextScene.layout && nextScene.layout.nodes) || []
    const edges = (nextScene.layout && nextScene.layout.edges) || []
    const pattern = (nextScene && nextScene.pattern) || ''
    // Queue/stack sidebar for traversal families + union-find: the frontier is the invariant.
    const sideW = pattern === 'graph-bfs' || pattern === 'graph-dfs' || pattern === 'union-find' ? 176 : 0
    const count = Math.max(1, nodes.length)
    const radius = Math.min(190, 40 + count * 16)
    const width = radius * 2 + 140 + sideW
    const height = radius * 2 + 120
    const root = reset(width, height)
    const cx = (width - sideW) / 2
    const cy = height / 2
    const angleOf = new Map()
    nodes.forEach((node, index) => angleOf.set(String(node.id), (index / count) * Math.PI * 2 - Math.PI / 2))
    const point = (id) => {
      const angle = angleOf.get(String(id)) || 0
      return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }
    }
    const pos = new Map(nodes.map((node) => [String(node.id), point(node.id)]))
    const defs = svgEl('defs', {})
    const marker = svgEl('marker', { id: 'lc-arrowhead', markerWidth: 8, markerHeight: 8, refX: 6, refY: 3, orient: 'auto' })
    marker.appendChild(svgEl('path', { d: 'M0,0 L6,3 L0,6 Z', fill: '#8A93A8' }))
    defs.appendChild(marker)
    root.appendChild(defs)
    const edgeLayer = svgEl('g', { class: 'lc-edges' })
    const edgeEls = new Map()
    for (const edge of edges) {
      const a = point(edge[0])
      const b = point(edge[1])
      const line = svgEl('line', { class: 'lc-edge', x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#3A4358', 'stroke-width': 2.5 })
      edgeLayer.appendChild(line)
      edgeEls.set(String(edge[0]) + '|' + String(edge[1]), line)
    }
    root.appendChild(edgeLayer)
    const nodeLayer = svgEl('g', { class: 'lc-nodes' })
    root.appendChild(nodeLayer)
    const nodeEls = new Map()
    const distEls = new Map()
    for (const node of nodes) {
      const position = point(node.id)
      const group = svgEl('g', { class: 'lc-node', transform: `translate(${position.x},${position.y})` })
      const circle = svgEl('circle', { r: 24, fill: palette.cell, stroke: palette.cellStroke, 'stroke-width': 1.6 })
      const label = text(node.label === undefined ? node.value : node.label, { x: 0, y: 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 600, fill: palette.text, class: 'lc-node-label' })
      group.appendChild(circle)
      group.appendChild(label)
      const dist = text('', { x: 0, y: 34, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: palette.sky, class: 'lc-dist' })
      group.appendChild(dist)
      distEls.set(String(node.id), dist)
      nodeEls.set(String(node.id), { group, circle, label })
      nodeLayer.appendChild(group)
    }
    const queueLayer = svgEl('g', { class: 'lc-queue' })
    root.appendChild(queueLayer)
    const parentLayer = svgEl('g', { class: 'lc-parents' })
    root.appendChild(parentLayer)
    const graphCaption = svgEl('g', { class: 'lc-caption' })
    root.appendChild(graphCaption)
    model = { kind: 'graph', root, nodeEls, distEls, edgeEls, edges, width, height, pos, pattern, queueLayer, parentLayer, sideX: width - sideW + 12, sideW, captionLayer: graphCaption }
  }

  /** Ordered frontier sidebar: queue (BFS), stack (DFS path), or union-find roots. */
  function renderQueueSidebar(model2, title, items, labelOf) {
    const layer = model2.queueLayer
    if (!layer) return
    layer.textContent = ''
    if (!model2.sideW || !Array.isArray(items)) return
    const x = model2.sideX
    let y = 40
    layer.appendChild(text(title, { x, y, 'font-size': 12, 'letter-spacing': 1.6, fill: palette.muted }))
    y += 18
    const shown = items.slice(0, 8)
    shown.forEach((id, row) => {
      const rowY = y + row * 24
      const group = svgEl('g', { class: 'lc-queue-row' })
      group.appendChild(svgEl('rect', { x, y: rowY - 13, width: Math.max(120, model2.sideW - 24), height: 21, rx: 6, fill: row === 0 ? palette.skySoft : '#242B47', stroke: row === 0 ? palette.sky : palette.cellStroke, 'stroke-width': 2 }))
      group.appendChild(text(labelOf(id), { x: x + 10, y: rowY + 3, 'font-size': 12, fill: row === 0 ? palette.sky : palette.text, 'font-weight': row === 0 ? 700 : 400 }))
      const target = model2.nodeEls.get(String(id))
      if (target) {
        group.addEventListener('mouseenter', () => target.group.classList.add('is-hover'))
        group.addEventListener('mouseleave', () => target.group.classList.remove('is-hover'))
      }
      layer.appendChild(group)
    })
    if (items.length > shown.length) {
      layer.appendChild(text(`… ${items.length - shown.length} more`, { x, y: y + shown.length * 24 + 2, 'font-size': 11, fill: palette.muted }))
    }
  }

  function buildGridScene(nextScene) {
    const rows = Math.max(1, (nextScene.layout && nextScene.layout.rows) || 0)
    const cols = Math.max(1, (nextScene.layout && nextScene.layout.cols) || 0)
    const cellsIn = (nextScene.layout && nextScene.layout.cells) || []
    const pattern = (nextScene && nextScene.pattern) || ''
    const cell = Math.max(36, Math.min(60, Math.floor(620 / Math.max(rows, cols))))
    const width = cols * (cell + 3) + 70
    // Intervals get a 1-D merge timeline below the table; dp-2d gets room for arrowheads.
    const extra = pattern === 'intervals' ? 150 : 0
    const height = rows * (cell + 3) + 60 + extra
    const root = reset(width, height)
    const defs = svgEl('defs', {})
    const marker = svgEl('marker', { id: 'lc-dep-arrow', markerWidth: 9, markerHeight: 9, refX: 7, refY: 4.5, orient: 'auto' })
    marker.appendChild(svgEl('path', { d: 'M0,0 L8,4.5 L0,9 Z', fill: palette.warn }))
    defs.appendChild(marker)
    root.appendChild(defs)
    const gridLayer = svgEl('g', { class: 'lc-grid' })
    root.appendChild(gridLayer)
    const cellEls = new Map()
    const originX = 52
    const originY = 34
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const value = (cellsIn[r] || [])[c]
        const x = originX + c * (cell + 3)
        const y = originY + r * (cell + 3)
        const group = svgEl('g', { class: 'lc-grid-cell', transform: `translate(${x},${y})` })
        const rect = svgEl('rect', { width: cell, height: cell, rx: 6, fill: palette.cell, stroke: palette.cellStroke, 'stroke-width': 1 })
        const label = text(value === undefined || value === null ? '' : value, { x: cell / 2, y: cell / 2 + 5, 'text-anchor': 'middle', 'font-size': Math.max(10, cell * 0.34), fill: palette.text, class: 'lc-grid-value' })
        group.appendChild(rect)
        group.appendChild(label)
        group.addEventListener('mouseenter', (event) => {
          showTip(event, [`row ${r}, col ${c}`, `value ${value}`])
          emitHover({ kind: 'grid', row: r, col: c })
        })
        group.addEventListener('mousemove', (event) => showTip(event, [`row ${r}, col ${c}`, `value ${value}`]))
        group.addEventListener('mouseleave', () => {
          hideTip()
          emitHover(null)
        })
        cellEls.set(r + ',' + c, { group, rect, label })
        gridLayer.appendChild(group)
      }
    }
    const depLayer = svgEl('g', { class: 'lc-dep' })
    root.appendChild(depLayer)
    const timeLayer = svgEl('g', { class: 'lc-timeline' })
    root.appendChild(timeLayer)
    const gridCaption = svgEl('g', { class: 'lc-caption' })
    root.appendChild(gridCaption)
    const centerOf = (r, c) => ({ x: originX + c * (cell + 3) + cell / 2, y: originY + r * (cell + 3) + cell / 2 })
    model = { kind: 'grid', root, cellEls, rows, cols, cell, originX, originY, width, height, pattern, depLayer, timeLayer, centerOf, cellsIn, captionLayer: gridCaption }
  }

  function buildStackScene(nextScene) {
    const capacity = Math.max(4, Math.min(12, ((nextScene.layout && nextScene.layout.capacity) || 6)))
    const cell = 46
    const width = 220
    const height = capacity * (cell + 6) + 40
    const root = reset(width, height)
    const baseY = height - 24
    const layer = svgEl('g', { class: 'lc-stack-cells' })
    root.appendChild(layer)
    const slots = []
    for (let index = 0; index < capacity; index += 1) {
      const y = baseY - (index + 1) * (cell + 6)
      const rect = svgEl('rect', { class: 'lc-slot', x: 60, y, width: cell * 2, height: cell, rx: 8, fill: '#10141D', stroke: '#3A4358', 'stroke-width': 2 })
      const value = text('', { x: 60 + cell, y: y + cell / 2 + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 600, fill: palette.text, class: 'lc-slot-value' })
      layer.appendChild(rect)
      layer.appendChild(value)
      slots.push({ rect, value })
    }
    const topLabel = text('top', { x: 60 + cell * 2 + 12, y: baseY - cell / 2, 'font-size': 11, fill: palette.muted, class: 'lc-stack-top' })
    root.appendChild(topLabel)
    const base = svgEl('line', { x1: 50, y1: baseY + 2, x2: 60 + cell * 2 + 10, y2: baseY + 2, stroke: '#4A5570', 'stroke-width': 3 })
    root.appendChild(base)
    const stackCaption = svgEl('g', { class: 'lc-caption' })
    root.appendChild(stackCaption)
    model = { kind: 'stack', root, slots, topLabel, capacity, width, height, captionLayer: stackCaption }
  }

  function buildLinkedScene(nextScene) {
    const values = (nextScene.layout && nextScene.layout.values) || []
    const count = Math.max(1, values.length)
    const cell = 52
    const width = Math.max(280, count * (cell + 34) + 40)
    const height = 150
    const root = reset(width, height)
    const x0 = 30
    const y = 52
    const nodes = []
    const arrows = []
    for (let index = 0; index < count; index += 1) {
      const x = x0 + index * (cell + 34)
      const group = svgEl('g', { class: 'lc-node', transform: `translate(${x},${y})` })
      const rect = svgEl('rect', { width: cell, height: cell, rx: 9, fill: palette.cell, stroke: palette.cellStroke, 'stroke-width': 1.5 })
      const value = text(values[index], { x: cell / 2, y: cell / 2 + 6, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 600, fill: palette.text })
      group.appendChild(rect)
      group.appendChild(value)
      root.appendChild(group)
      nodes.push({ group, rect, value })
      if (index < count - 1) {
        const arrow = svgEl('path', {
          class: 'lc-arrow',
          d: `M ${x + cell + 3} ${y + cell / 2} L ${x + cell + 26} ${y + cell / 2}`,
          stroke: '#4A5570',
          'stroke-width': 2.5,
          'marker-end': 'url(#lc-arrowhead)',
        })
        arrows.push(arrow)
        root.appendChild(arrow)
      }
    }
    const defs = svgEl('defs', {})
    const marker = svgEl('marker', { id: 'lc-arrowhead', markerWidth: 8, markerHeight: 8, refX: 6, refY: 3, orient: 'auto' })
    marker.appendChild(svgEl('path', { d: 'M0,0 L6,3 L0,6 Z', fill: '#8A93A8' }))
    defs.appendChild(marker)
    root.insertBefore(defs, root.firstChild)
    const pointerLayer = svgEl('g', { class: 'lc-pointers' })
    root.appendChild(pointerLayer)
    model = { kind: 'linked', root, nodes, arrows, pointerLayer, x0, y, cell, width, height }
  }

  /* ------------------------------------------------------------------- frames */

  function roleClass(role) {
    if (role === 'accent') return 'is-current'
    if (role === 'ok') return 'is-ok'
    if (role === 'warn') return 'is-warn'
    if (role === 'bad') return 'is-bad'
    if (role === 'dim') return 'is-dim'
    if (role === 'mint') return 'is-seen'
    return ''
  }

  /* ------------------------------------------- family overlays (P0 invariants) */

  /** Sliding-window char-count table: the invariant "every count in the window" as data. */
  function renderCountsTable(layer, x, y, counts) {
    const entries = Object.entries(counts || {})
    if (entries.length === 0) return 0
    layer.appendChild(text('counts', { x, y, 'font-size': 12, 'letter-spacing': 1.6, fill: palette.muted }))
    entries.slice(0, 8).forEach(([key, value], row) => {
      const rowY = y + 18 + row * 22
      const group = svgEl('g', { class: 'lc-count-row' })
      group.appendChild(svgEl('rect', { x, y: rowY - 13, width: 104, height: 20, rx: 5, fill: palette.skySoft, stroke: palette.sky, 'stroke-width': 2 }))
      group.appendChild(text(key === '' ? '␣' : key, { x: x + 10, y: rowY + 2, 'font-size': 12, fill: palette.sky, 'font-weight': 700 }))
      group.appendChild(text('×' + value, { x: x + 56, y: rowY + 2, 'font-size': 12, fill: palette.text }))
      layer.appendChild(group)
    })
    return 18 + Math.min(8, entries.length) * 22
  }

  /** Monotonic-stack strip: candidate indices bottom-up (= stack order) + resolved pops. */
  function renderStackStrip(layer, x, y, values, stack, resolved, cells) {
    let height = 0
    if (Array.isArray(stack) && stack.length > 0) {
      layer.appendChild(text('stack (indices)', { x, y, 'font-size': 12, 'letter-spacing': 1.6, fill: palette.muted }))
      const items = stack.slice(-6)
      items.forEach((index, row) => {
        const rowY = y + 18 + row * 22
        const group = svgEl('g', { class: 'lc-stack-row' })
        group.appendChild(svgEl('rect', { x, y: rowY - 13, width: 118, height: 20, rx: 5, fill: palette.skySoft, stroke: palette.sky, 'stroke-width': 2 }))
        group.appendChild(text('i=' + index, { x: x + 10, y: rowY + 2, 'font-size': 12, fill: palette.sky, 'font-weight': 700 }))
        group.appendChild(text('v=' + (values[index] === undefined ? '·' : values[index]), { x: x + 62, y: rowY + 2, 'font-size': 12, fill: palette.text }))
        const target = cells && cells[index]
        if (target) {
          group.addEventListener('mouseenter', () => target.group.classList.add('is-hover'))
          group.addEventListener('mouseleave', () => target.group.classList.remove('is-hover'))
        }
        layer.appendChild(group)
      })
      height = Math.max(height, 18 + items.length * 22)
    }
    const solved = Object.entries(resolved || {})
    if (solved.length > 0) {
      const y2 = y + height + (height > 0 ? 10 : 0)
      layer.appendChild(text('resolved by pop', { x, y: y2, 'font-size': 12, 'letter-spacing': 1.6, fill: palette.muted }))
      solved.slice(-4).forEach(([index, answer], row) => {
        const rowY = y2 + 18 + row * 22
        const group = svgEl('g', { class: 'lc-resolved-row' })
        group.appendChild(svgEl('rect', { x, y: rowY - 13, width: 118, height: 20, rx: 5, fill: palette.okSoft, stroke: palette.ok, 'stroke-width': 1 }))
        group.appendChild(text('i=' + index, { x: x + 10, y: rowY + 2, 'font-size': 12, fill: palette.ok, 'font-weight': 600 }))
        group.appendChild(text('→ ' + answer, { x: x + 62, y: rowY + 2, 'font-size': 12, fill: palette.text }))
        const target = cells && cells[Number(index)]
        if (target) {
          group.addEventListener('mouseenter', () => target.group.classList.add('is-hover'))
          group.addEventListener('mouseleave', () => target.group.classList.remove('is-hover'))
        }
        layer.appendChild(group)
      })
      height += (height > 0 ? 10 : 0) + 18 + Math.min(4, solved.length) * 22
    }
    return height
  }

  /** Heap overlay: the same array drawn as a tree (parent i, children 2i+1 / 2i+2). */
  function renderHeapOverlay(layer, x, y, width, heap) {
    const items = (heap || []).slice(0, 15)
    if (items.length === 0) return 0
    layer.appendChild(text('heap as tree', { x, y, 'font-size': 12, 'letter-spacing': 1.6, fill: palette.muted }))
    const top = y + 14
    const nodeR = 15
    const pos = (i) => {
      // Level-order placement: depth d has 2^d slots across the available width.
      const depth = Math.floor(Math.log2(i + 1))
      const first = 2 ** depth - 1
      const slot = i - first
      const slots = 2 ** depth
      return { x: x + ((slot + 0.5) / slots) * width, y: top + depth * (nodeR * 2 + 14) }
    }
    for (let i = 1; i < items.length; i++) {
      const a = pos(Math.floor((i - 1) / 2))
      const b = pos(i)
      layer.appendChild(svgEl('line', { class: 'lc-edge', x1: a.x, y1: a.y + nodeR, x2: b.x, y2: b.y - nodeR, stroke: '#3A4358', 'stroke-width': 2.5 }))
    }
    items.forEach((value, i) => {
      const p = pos(i)
      const group = svgEl('g', { class: 'lc-heap-node', transform: `translate(${p.x},${p.y})` })
      group.appendChild(svgEl('circle', { r: nodeR, fill: i === 0 ? palette.okSoft : palette.cell, stroke: i === 0 ? palette.ok : palette.cellStroke, 'stroke-width': 1.6 }))
      const label = text(value, { x: 0, y: 5, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: palette.text })
      group.appendChild(label)
      group.appendChild(text('a[' + i + ']', { x: 0, y: nodeR + 13, 'text-anchor': 'middle', 'font-size': 9.5, fill: palette.muted }))
      layer.appendChild(group)
    })
    const depth = Math.floor(Math.log2(items.length)) + 1
    return 14 + depth * (nodeR * 2 + 14) + 18
  }

  function applyCellFrame(state) {
    const highlights = state.highlights || {}
    const window2 = state.window
    for (const cellEntry of model.cells) {
      const role = highlights[cellEntry.index] || null
      cellEntry.group.classList.remove('is-current', 'is-ok', 'is-warn', 'is-bad', 'is-dim', 'is-seen')
      const cls = roleClass(role)
      if (cls) cellEntry.group.classList.add(cls)
      let inWindow = false
      if (Array.isArray(window2) && window2.length === 2) {
        inWindow = cellEntry.index >= window2[0] && cellEntry.index <= window2[1]
      }
      cellEntry.group.classList.toggle('in-window', inWindow)
    }
    if (model.root) {
      const band = model.root.querySelector('.lc-band')
      if (band) {
        if (Array.isArray(window2) && window2.length === 2 && model.cells.length > 0) {
          const first = model.cells[Math.max(0, window2[0])]
          const last = model.cells[Math.min(model.cells.length - 1, window2[1])]
          if (first && last) {
            const x = model.x0 + first.index * (model.cell + model.cellGap) - 6
            const width = (last.index - first.index) * (model.cell + model.cellGap) + model.cell + 12
            band.setAttribute('x', String(x))
            band.setAttribute('width', String(width))
            band.classList.add('on')
          }
        } else {
          band.classList.remove('on')
        }
      }
    }

    // Pointers: chips are pooled by name and glide via CSS transform (no popping).
    const pointerLayer = model.pointerLayer
    if (pointerLayer) {
      if (!model.chipPool) model.chipPool = new Map()
      const pointers = state.pointers || {}
      const names = Object.keys(pointers)
      const live = new Set()
      names.forEach((name, row) => {
        const index = pointers[name]
        if (typeof index !== 'number' || index < 0) return
        const cellEntry = model.cells[Math.min(model.cells.length - 1, index)]
        if (!cellEntry) return
        const x = model.x0 + cellEntry.index * (model.cell + model.cellGap) + model.cell / 2
        const y = model.top - 30 - (names.length - 1 - row) * 26
        let chip = model.chipPool.get(name)
        if (!chip) {
          chip = pointerChip(name, x, y, palette.chip)
          chip.addEventListener('mouseenter', () => {
            const target = model.cells[chip._index]
            if (target) target.group.classList.add('is-hover')
          })
          chip.addEventListener('mouseleave', () => {
            const target = model.cells[chip._index]
            if (target) target.group.classList.remove('is-hover')
          })
          model.chipPool.set(name, chip)
          pointerLayer.appendChild(chip)
        }
        chip._index = cellEntry.index
        chip.style.transform = `translate(${x}px,${y}px)`
        live.add(name)
      })
      for (const [name, chip] of model.chipPool) {
        if (!live.has(name)) {
          chip.remove()
          model.chipPool.delete(name)
        }
      }
    }

    // Hash-map table (brushing: rows link back to the array cell they came from).
    if (model.hashLayer) {
      model.hashLayer.textContent = ''
      const seen = state.seen || {}
      const entries = Object.entries(seen)
      if (model.hasMap) {
        const x = 16
        const y = model.top + model.cell + 46
        model.hashLayer.appendChild(text('seen · value → index', { class: 'lc-semantic-muted', x, y, 'font-size': 13, fill: palette.muted }))
        if (!entries.length) model.hashLayer.appendChild(text('Empty — no earlier values', { class: 'lc-semantic-muted', x, y: y + 28, 'font-size': 12, fill: palette.muted }))
        entries.slice(0, 6).forEach(([key, value], row) => {
          const rowY = y + 28 + row * 28
          const group = svgEl('g', { class: 'lc-hash-row' + (state.lookup && String(state.lookup.key) === key && state.lookup.hit != null ? ' is-match' : '') })
          group.appendChild(svgEl('rect', { x, y: rowY - 13, width: 132, height: 20, rx: 5, fill: palette.skySoft, stroke: palette.sky, 'stroke-width': 2 }))
          group.appendChild(text(key, { x: x + 10, y: rowY + 2, 'font-size': 12, fill: palette.sky, 'font-weight': 700 }))
          group.appendChild(text('→', { x: x + 66, y: rowY + 2, 'font-size': 11, fill: palette.muted }))
          group.appendChild(text(value, { x: x + 84, y: rowY + 2, 'font-size': 12, fill: palette.text }))
          group.addEventListener('mouseenter', () => {
            const target = model.cells[value]
            if (target) target.group.classList.add('is-hover')
          })
          group.addEventListener('mouseleave', () => {
            const target = model.cells[value]
            if (target) target.group.classList.remove('is-hover')
          })
          model.hashLayer.appendChild(group)
        })
      }
    }

    // Family overlays: counts table, monotonic stack strip, heap tree. Driven by state
    // fields, so any scene (pattern-generated or AI-authored) that carries them renders.
    if (model.overlayLayer) {
      const layer = model.overlayLayer
      layer.textContent = ''
      const overlayY = model.top + model.cell + 46
      const col2 = model.hasMap ? 210 : model.x0 + 148
      const col3 = model.x0 + 268
      if (state.counts && Object.keys(state.counts).length > 0) {
        renderCountsTable(layer, state.seen && Object.keys(state.seen).length > 0 ? col2 : model.x0, overlayY, state.counts)
      }
      if ((Array.isArray(state.stack) && state.stack.length > 0) || (state.resolved && Object.keys(state.resolved).length > 0)) {
        const values = (scene && scene.layout && (scene.layout.values || scene.layout.chars)) || []
        renderStackStrip(layer, col3, overlayY, values, state.stack, state.resolved, model.cells)
      }
      if (model.pattern === 'heap-topk' && Array.isArray(state.values) && state.values.length > 0) {
        renderHeapOverlay(layer, model.x0, overlayY, Math.max(240, model.width - 40), state.values)
      } else if (model.pattern === 'heap-topk' && scene && scene.layout && Array.isArray(scene.layout.values)) {
        renderHeapOverlay(layer, model.x0, overlayY, Math.max(240, model.width - 40), scene.layout.values)
      }
      if (model.hasMap && state.vars && state.vars.need !== undefined) {
        const i = state.pointers && state.pointers.i
        const value = scene.layout.values && scene.layout.values[i]
        if (value !== undefined) layer.appendChild(text(`${state.vars.target} − ${value} = ${state.vars.need} needed`, { class: 'lc-semantic-label', x: 210, y: overlayY + 34, 'font-size': 13, fill: palette.text }))
      }
      // Lookup probe: one map query as a badge + stem (hit: resolved row, miss: ∅).
      const lookup = state.lookup
      if (lookup && model.cells[lookup.from]) {
        const fromCell = model.cells[lookup.from]
        const cx = model.x0 + fromCell.index * (model.cell + model.cellGap) + model.cell / 2
        const hit = lookup.hit === null || lookup.hit === undefined ? null : lookup.hit
        const caption = hit === null ? `${lookup.key} → ∅ not stored` : `seen[${lookup.key}] = ${hit}`
        const bw = Math.max(96, caption.length * 7.5 + 26)
        const bx = model.hasMap ? 210 : model.x0 + 150
        const by = overlayY + 2
        const group = svgEl('g', { class: 'lc-lookup' + (hit === null ? ' is-miss' : ' is-hit') })
        group.appendChild(svgEl('line', { x1: cx, y1: model.top + model.cell + 4, x2: bx - 4, y2: by + 10, stroke: hit === null ? palette.muted : palette.ok, 'stroke-width': 2 }))
        group.appendChild(svgEl('rect', { class: 'lc-lookup-badge', x: bx, y: by - 11, width: bw, height: 24, rx: 3, fill: hit === null ? palette.cell : palette.okSoft, stroke: hit === null ? palette.muted : palette.ok, 'stroke-width': 2 }))
        group.appendChild(text(caption, { x: bx + 12, y: by + 5, 'font-size': 12.5, 'font-weight': 700, fill: hit === null ? palette.muted : palette.ok, class: 'lc-lookup-text' }))
        layer.appendChild(group)
      }
      // Honest empty state: this frame genuinely computed nothing yet.
      if (!model.hasMap && isEmptyCellState(state)) {
        emptyCaption(layer, model.x0 + (model.width - 40) / 2, overlayY + 24)
      }
    }
  }

  function applyTreeFrame(state) {
    const visited = new Set((state.visited || []).map(String))
    const path = new Set((state.path || []).map(String))
    const frontier = new Set((state.frontier || []).map(String))
    const current = state.current === undefined || state.current === null ? null : String(state.current)
    const pathOrder = (state.path || []).map(String)
    for (const [id, element] of model.nodeEls) {
      element.group.classList.remove('is-current', 'is-ok', 'is-warn', 'is-dim')
      if (current === id) element.group.classList.add('is-current')
      else if (path.has(id)) element.group.classList.add('is-ok')
      else if (visited.has(id)) element.group.classList.add('is-ok', 'is-visited')
      if (frontier.has(id)) element.group.classList.add('is-warn')
    }
    for (const [key, line] of model.edgeEls) {
      const [a, b] = key.split('|')
      const onPath = path.has(a) && path.has(b) && Math.abs(pathOrder.indexOf(a) - pathOrder.indexOf(b)) === 1
      line.classList.toggle('is-path', onPath)
    }
    if (model.distEls) {
      const distances = state.distances || {}
      for (const [id, element] of model.distEls) {
        const d = distances[id] ?? distances[Number(id)]
        element.textContent = d === undefined || d === null ? '' : 'd=' + d
      }
    }
    if (model.captionLayer) {
      model.captionLayer.textContent = ''
      const empty =
        (state.current === undefined || state.current === null) &&
        (state.visited || []).length === 0 &&
        (state.path || []).length === 0 &&
        (state.frontier || []).length === 0
      if (empty) emptyCaption(model.captionLayer, model.width / 2, model.height - 20)
    }
    // Recursion-stack sidebar: the current path, top of stack last.
    if (model.queueLayer && model.sideW) {
      const labelOf = (id) => {
        const entry = model.nodeEls.get(String(id))
        return entry ? String(entry.label.textContent) : String(id)
      }
      const stackItems = pathOrder.slice().reverse()
      if (state.frontier && state.frontier.length > 0 && model.pattern === 'tree-bfs') {
        renderQueueSidebar(model, 'queue', state.frontier, labelOf)
      } else {
        renderQueueSidebar(model, model.pattern === 'backtracking' ? 'recursion stack' : 'path', stackItems, labelOf)
      }
    }
  }

  function applyGraphFrame(state) {
    const visited = new Set((state.visited || []).map(String))
    const path = (state.path || []).map(String)
    const pathSet = new Set(path)
    const frontier = new Set((state.frontier || []).map(String))
    const current = state.current === undefined || state.current === null ? null : String(state.current)
    for (const [id, element] of model.nodeEls) {
      element.group.classList.remove('is-current', 'is-ok', 'is-warn')
      if (current === id) element.group.classList.add('is-current')
      else if (pathSet.has(id)) element.group.classList.add('is-ok')
      else if (visited.has(id)) element.group.classList.add('is-visited')
      if (frontier.has(id)) element.group.classList.add('is-warn')
    }
    for (const [key, line] of model.edgeEls) {
      const [a, b] = key.split('|')
      line.classList.toggle('is-path', pathSet.has(a) && pathSet.has(b) && Math.abs(path.indexOf(a) - path.indexOf(b)) === 1)
    }
    // Distance labels under each node (BFS levels).
    if (model.distEls) {
      const distances = state.distances || {}
      for (const [id, element] of model.distEls) {
        const d = distances[id] ?? distances[Number(id)]
        element.textContent = d === undefined || d === null ? '' : 'd=' + d
      }
    }
    // Queue / stack sidebar: ordered contents, head on top.
    if (model.queueLayer) {
      const labelOf = (id) => {
        const entry = model.nodeEls.get(String(id))
        const base = entry ? entry.label.textContent : String(id)
        const d = state.distances ? (state.distances[id] ?? state.distances[Number(id)]) : undefined
        return d === undefined ? base : base + '  (d=' + d + ')'
      }
      if (model.pattern === 'graph-dfs') {
        renderQueueSidebar(model, 'stack = path', Array.isArray(state.queue) && state.queue.length > 0 ? state.queue.slice().reverse() : path.slice().reverse(), labelOf)
      } else if (Array.isArray(state.queue) && state.queue.length > 0) {
        renderQueueSidebar(model, 'queue', state.queue, labelOf)
      } else if (state.frontier && state.frontier.length > 0) {
        renderQueueSidebar(model, 'frontier', state.frontier, labelOf)
      } else {
        renderQueueSidebar(model, model.pattern === 'union-find' ? 'components' : 'queue', [], labelOf)
      }
    }
    if (model.captionLayer) {
      model.captionLayer.textContent = ''
      const empty =
        (state.current === undefined || state.current === null) &&
        (state.visited || []).length === 0 &&
        (state.path || []).length === 0 &&
        (state.frontier || []).length === 0 &&
        (state.queue || []).length === 0 &&
        !state.distances &&
        !state.parent
      if (empty) emptyCaption(model.captionLayer, model.width / 2, model.height - 20)
    }
    // Union-find parent pointers: dashed forest edges over the union edges.
    if (model.parentLayer) {
      model.parentLayer.textContent = ''
      if (state.parent && model.pos) {
        for (const [id, parentId] of Object.entries(state.parent)) {
          if (parentId === null || parentId === undefined || String(parentId) === String(id)) continue
          const a = model.pos.get(String(id))
          const b = model.pos.get(String(parentId))
          if (!a || !b) continue
          const dx = b.x - a.x
          const dy = b.y - a.y
          const len = Math.max(1, Math.hypot(dx, dy))
          const trim = 22
          model.parentLayer.appendChild(svgEl('line', {
            class: 'lc-parent-edge',
            x1: (a.x + (dx / len) * trim).toFixed(1),
            y1: (a.y + (dy / len) * trim).toFixed(1),
            x2: (b.x - (dx / len) * (trim + 4)).toFixed(1),
            y2: (b.y - (dy / len) * (trim + 4)).toFixed(1),
            stroke: palette.mint,
            'stroke-width': 1.8,
            'stroke-dasharray': '5 4',
            opacity: 0.85,
            'marker-end': 'url(#lc-arrowhead)',
          }))
        }
      }
    }
  }

  function applyGridFrame(state) {
    const filled = new Set((state.filled || []).map((entry) => entry[0] + ',' + entry[1]))
    const path = new Set((state.path || []).map((entry) => entry[0] + ',' + entry[1]))
    const blocked = new Set((state.blocked || []).map((entry) => entry[0] + ',' + entry[1]))
    const frontier = new Set((state.frontier || []).map((entry) => entry[0] + ',' + entry[1]))
    const current = Array.isArray(state.current) ? state.current[0] + ',' + state.current[1] : null
    const reads = new Set((state.reads || []).map((entry) => entry[0] + ',' + entry[1]))
    const answer = Array.isArray(state.answer) ? state.answer[0] + ',' + state.answer[1] : null
    for (const [key, element] of model.cellEls) {
      element.group.classList.remove('is-current', 'is-ok', 'is-warn', 'is-dim', 'is-read', 'is-answer', 'is-frontier')
      if (current === key) element.group.classList.add('is-current')
      else if (answer === key) element.group.classList.add('is-answer')
      else if (reads.has(key)) element.group.classList.add('is-read')
      else if (path.has(key)) element.group.classList.add('is-ok')
      else if (frontier.has(key)) element.group.classList.add('is-frontier')
      else if (filled.has(key)) element.group.classList.add('is-warn')
      if (blocked.has(key)) element.group.classList.add('is-dim')
    }

    // dp-2d dependency arrows: from each read cell into the cell being computed.
    if (model.depLayer) {
      model.depLayer.textContent = ''
      if (Array.isArray(state.current) && Array.isArray(state.reads) && state.reads.length > 0) {
        const target = model.centerOf(state.current[0], state.current[1])
        for (const coord of state.reads) {
          const from = model.centerOf(coord[0], coord[1])
          const dx = target.x - from.x
          const dy = target.y - from.y
          const len = Math.max(1, Math.hypot(dx, dy))
          const trim = model.cell / 2 + 3
          const x1 = from.x + (dx / len) * trim
          const y1 = from.y + (dy / len) * trim
          const x2 = target.x - (dx / len) * (trim + 3)
          const y2 = target.y - (dy / len) * (trim + 3)
          model.depLayer.appendChild(svgEl('line', {
            class: 'lc-dep-arrow',
            x1: x1.toFixed(1),
            y1: y1.toFixed(1),
            x2: x2.toFixed(1),
            y2: y2.toFixed(1),
            stroke: palette.warn,
            'stroke-width': 2,
            opacity: 0.9,
            'marker-end': 'url(#lc-dep-arrow)',
          }))
        }
      }
    }

    if (model.captionLayer) {
      model.captionLayer.textContent = ''
      const empty =
        !Array.isArray(state.current) &&
        (state.filled || []).length === 0 &&
        (state.path || []).length === 0 &&
        (state.blocked || []).length === 0 &&
        (state.frontier || []).length === 0 &&
        (state.reads || []).length === 0
      if (empty) emptyCaption(model.captionLayer, model.width / 2, model.height - 14)
    }

    // Intervals 1-D merge timeline: each row [start, end] is a bar; merged blocks grow.
    if (model.timeLayer) {
      model.timeLayer.textContent = ''
      if (model.pattern === 'intervals' && Array.isArray(model.cellsIn) && model.cellsIn.length > 0) {
        const rows = model.cellsIn.map((row) => [Number(row[0]), Number(row[1])]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
        if (rows.length > 0) {
          const lo = Math.min(...rows.map(([a]) => a))
          const hi = Math.max(...rows.map(([, b]) => b))
          const span = Math.max(1, hi - lo)
          const tx = model.originX
          const tw = Math.max(120, model.width - model.originX - 20)
          const ty = model.originY + model.rows * (model.cell + 3) + 26
          model.timeLayer.appendChild(text('timeline (sorted by start)', { x: tx, y: ty - 12, 'font-size': 12, 'letter-spacing': 1.6, fill: palette.muted }))
          const filledRows = new Set((state.filled || []).map((entry) => entry[0]))
          const curRow = Array.isArray(state.current) ? state.current[0] : -1
          rows.forEach(([a, b], i) => {
            const bx = tx + ((a - lo) / span) * tw
            const bw = Math.max(8, ((b - a) / span) * tw)
            const by = ty + i * 20
            const isCur = i === curRow
            const isDone = filledRows.has(i)
            const rect = svgEl('rect', {
              class: 'lc-time-bar' + (isCur ? ' is-current' : isDone ? ' is-ok' : ''),
              x: bx.toFixed(1),
              y: by,
              width: bw.toFixed(1),
              height: 13,
              rx: 6.5,
              fill: isCur ? palette.accentSoft : isDone ? palette.okSoft : '#242B47',
              stroke: isCur ? palette.accent : isDone ? palette.ok : palette.cellStroke,
              'stroke-width': 1.4,
            })
            model.timeLayer.appendChild(rect)
            model.timeLayer.appendChild(text(`[${a},${b}]`, { x: bx + bw + 7, y: by + 11, 'font-size': 12, fill: palette.muted }))
          })
        }
      }
    }
  }

  function applyStackFrame(state) {
    const items = state.items || []
    model.slots.forEach((slot, index) => {
      const value = items[index]
      slot.value.textContent = value === undefined || value === null ? '' : String(value)
      slot.rect.classList.toggle('is-filled', value !== undefined && value !== null)
      const current = index === items.length - 1 && items.length > 0
      slot.rect.classList.toggle('is-current', current)
      slot.value.classList.toggle('is-current', current)
    })
    if (model.topLabel) {
      const topIndex = Math.max(0, items.length - 1)
      model.topLabel.setAttribute('y', String(model.height - 24 - (topIndex + 1) * (46 + 6) + 46 / 2 + 4))
    }
    if (model.captionLayer) {
      model.captionLayer.textContent = ''
      if (items.length === 0) emptyCaption(model.captionLayer, model.width / 2, 26)
    }
  }

  function applyLinkedFrame(state) {
    const pointers = state.pointers || {}
    for (const node of model.nodes) node.group.classList.remove('is-current', 'is-ok')
    if (!model.chipPool) model.chipPool = new Map()
    const names = Object.keys(pointers)
    const live = new Set()
    names.forEach((name, row) => {
      const index = pointers[name]
      const node = model.nodes[index]
      if (!node) return
      node.group.classList.add(name === 'curr' ? 'is-current' : 'is-ok')
      const x = model.x0 + index * (model.cell + 34) + model.cell / 2
      const y = model.y - 32 - (names.length - 1 - row) * 26
      let chip = model.chipPool.get(name)
      if (!chip) {
        chip = pointerChip(name, x, y, palette.chip)
        model.chipPool.set(name, chip)
        model.pointerLayer.appendChild(chip)
      }
      chip.style.transform = `translate(${x}px,${y}px)`
      live.add(name)
    })
    for (const [name, chip] of model.chipPool) {
      if (!live.has(name)) {
        chip.remove()
        model.chipPool.delete(name)
      }
    }
    const removed = new Set(state.removed || [])
    model.nodes.forEach((node, index) => node.group.classList.toggle('is-dim', removed.has(index)))
    model.pointerLayer.querySelectorAll('.lc-emptycap').forEach((node) => node.remove())
    if (names.length === 0 && removed.size === 0) {
      emptyCaption(model.pointerLayer, model.x0 + (model.width - 60) / 2, model.y + model.cell + 34)
    }
  }

  function applyFrame() {
    if (!scene || !model) return
    const frames = scene.frames || []
    const current = frames[frameIndex] || {}
    const state = current.state || {}
    if (model.kind === 'cells') applyCellFrame(state)
    else if (model.kind === 'tree') applyTreeFrame(state)
    else if (model.kind === 'graph') applyGraphFrame(state)
    else if (model.kind === 'grid') applyGridFrame(state)
    else if (model.kind === 'stack') applyStackFrame(state)
    else if (model.kind === 'linked') applyLinkedFrame(state)
    // Screen-reader narration: the focused SVG announces the current step.
    if (svg) {
      if (!svg.hasAttribute('tabindex')) {
        svg.setAttribute('tabindex', '0')
        svg.setAttribute('role', 'img')
      }
      const title = (scene && scene.title) || 'Algorithm diagram'
      const label = current && current.label ? current.label : ''
      const note = current && current.note ? current.note : ''
      svg.setAttribute('aria-label', `${title} — step ${frames.length === 0 ? 0 : frameIndex + 1} of ${frames.length}${label ? ': ' + label : ''}${note ? '. ' + note : ''}`)
    }
  }

  function build() {
    if (!scene) return
    const kind = scene.kind
    if (kind === 'array' || kind === 'string') buildArrayScene(scene)
    else if (kind === 'tree') buildTreeScene(scene)
    else if (kind === 'graph') buildGraphScene(scene)
    else if (kind === 'grid') buildGridScene(scene)
    else if (kind === 'stack') buildStackScene(scene)
    else if (kind === 'linked-list') buildLinkedScene(scene)
    else model = null
  }

  return {
    setScene(next) {
      if (disposed) return
      scene = next || null
      frameIndex = 0
      build()
      applyFrame()
    },
    goTo(index) {
      frameIndex = Math.max(0, Number(index) || 0)
      applyFrame()
    },
    /** Brushing from outside: highlight array cells (one index, an array, or null clears). */
    highlightCell(index) {
      if (!model || !model.cells) return
      const set = index === null || index === undefined ? null : new Set((Array.isArray(index) ? index : [index]).map(Number))
      for (const cellEntry of model.cells) cellEntry.group.classList.toggle('is-hover', set !== null && set.has(cellEntry.index))
    },
    /** Brushing from outside: highlight tree/graph nodes by id (one id, an array, or null clears). */
    highlightNode(id) {
      if (!model || !model.nodeEls) return
      const set = id === null || id === undefined ? null : new Set((Array.isArray(id) ? id : [id]).map(String))
      for (const [key, element] of model.nodeEls) element.group.classList.toggle('is-hover', set !== null && set.has(key))
    },
    /** Brushing from outside: highlight one grid cell ([r, c], or null clears). */
    highlightGrid(coord) {
      if (!model || !model.cellEls) return
      const key = Array.isArray(coord) ? coord[0] + ',' + coord[1] : null
      for (const [cellKey, element] of model.cellEls) element.group.classList.toggle('is-hover', key !== null && cellKey === key)
    },
    on(event, handler) {
      if (event === 'hover' && typeof handler === 'function') hoverHandlers.push(handler)
    },
    destroy() {
      disposed = true
      if (svg !== null) svg.remove()
      if (tip !== null) tip.remove()
      container.classList.remove('lc-diagram')
    },
  }
}

