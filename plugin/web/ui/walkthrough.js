/**
 * Walkthrough pane v3 — a diagram-first, explorable view.
 *
 * Three views of one state, linked (brushing & linking): the reference code (executing line
 * highlighted), the variables, and the diagram. The reader can change the input and watch
 * the algorithm re-run on their own data (explorable example), rather than watching one
 * canned animation.
 */
import { h, clear, icon, icons } from './dom.js'
import { api } from './api.js'

const STAMP = (() => {
  try {
    return new URL(import.meta.url).searchParams.get('b') || ''
  } catch {
    return ''
  }
})()
const q = STAMP ? '?b=' + STAMP : ''

const DIAGRAM_URL = '/leetcode-lab/engine/diagram.js' + q
const PATTERNS_URL = '/leetcode-lab/engine/patterns.js' + q
const WALKTHROUGH_URL = '/leetcode-lab/engine/walkthrough.js' + q
const TRACE_URL = '/leetcode-lab/engine/trace.js' + q
const CINEMA_URL = '/leetcode-lab/engine/index.js' + q

const LANGS = [
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'pseudo', label: 'Pseudo' },
]

/** Why the pattern works, and the trap that usually breaks it. */
const PATTERN_NOTES = {
  'arrays-hashing': {
    idea: 'Trade memory for time. The map remembers every value already walked past, so "have I seen the partner of this number?" is one lookup instead of another loop.',
    trap: 'Storing the current value before checking its complement — then the element can pair with itself.',
  },
  'two-pointers': {
    idea: 'Each comparison permanently rules out one side, which is why one pass is enough.',
    trap: 'Moving both pointers each iteration, or assuming sorted input when the problem never said so.',
  },
  'sliding-window': {
    idea: 'The window is the current candidate. Grow on the right; shrink from the left only until the invariant is restored.',
    trap: 'Shrinking with a while-loop when one step is enough, or forgetting the left pointer can jump past a repeat.',
  },
  'binary-search': {
    idea: 'Every probe discards half the remaining range: n → 1 in log n steps.',
    trap: 'Off-by-one between `lo <= hi` and `lo < hi`, and midpoint overflow.',
  },
  stack: {
    idea: 'The most recent opener must be the next closer, so last-in-first-out is exactly the right memory.',
    trap: 'Popping before checking for empty — the classic crash on input starting with a closer.',
  },
  'monotonic-stack': {
    idea: 'Keep the stack sorted so the next smaller/larger element is always on top; each element is pushed and popped once.',
    trap: 'Storing values when you need indexes — a distance cannot be computed from a value alone.',
  },
  'linked-list': {
    idea: 'Rewiring is three pointers moving in lock-step. Save `next` before overwriting `curr.next`, or the rest of the list is lost.',
    trap: 'Losing the `next` pointer, and forgetting that the final `prev` is the new head.',
  },
  'tree-dfs': {
    idea: 'Recursion carries the position: the call stack remembers the ancestors, so the path is implicit.',
    trap: 'Visiting the node before its left subtree — that is pre-order, not in-order.',
  },
  'tree-bfs': {
    idea: 'A queue visits level by level: everything at distance d leaves the queue before anything at distance d+1.',
    trap: 'Using a stack instead of a queue — that silently turns it into DFS.',
  },
  'dp-1d': {
    idea: 'dp[i] answers a prefix of the problem using only one or two earlier answers — the future never leaks backwards.',
    trap: 'Reading dp[i-1] before it is written, or sizing the table one short.',
  },
  'dp-2d': {
    idea: 'Each cell combines already-filled neighbours (up / left / diagonal), so row-by-row order is safe; the answer lives in a known corner.',
    trap: 'Filling in an order that reads cells not computed yet.',
  },
  'graph-bfs': {
    idea: 'The queue is a wavefront: the first time a cell leaves it, its distance is final.',
    trap: 'Marking visited on dequeue instead of enqueue — the same cell joins the queue many times.',
  },
  'graph-dfs': {
    idea: 'The recursion stack is the current path; popping it is backtracking, not failure.',
    trap: 'Forgetting the visited set on graphs with cycles — infinite recursion.',
  },
  intervals: {
    idea: 'Sorting by start lines overlaps up side by side; one sweep then extends or starts a block.',
    trap: 'Comparing with the original next interval instead of the growing merged block.',
  },
  'heap-topk': {
    idea: 'A min-heap of size k keeps exactly the k largest seen: the smallest of them sits on top, ready to evict.',
    trap: 'Keeping all n values in the heap — the point is the heap never exceeds k.',
  },
  'union-find': {
    idea: 'Each set is a tree pointing at its root; union attaches root to root, and finds flatten the path.',
    trap: 'Unioning nodes instead of roots — the trees stop representing sets.',
  },
  'monotonic-stack': {
    idea: 'The stack stays sorted, so the top is always the nearest unresolved candidate; each index is pushed and popped once.',
    trap: 'Storing values instead of indices — you cannot compute a distance from a value.',
  },
  backtracking: {
    idea: 'Choose → explore → un-choose: the recursion path is the partial answer, and undoing the choice is what explores the next branch.',
    trap: 'Forgetting to un-choose — branches inherit choices that belong to siblings.',
  },
  trie: {
    idea: 'Shared prefixes share nodes, so lookup costs one step per character regardless of how many words are stored.',
    trap: 'Creating a node when one already exists — the sharing is the whole point.',
  },
  'topological-sort': {
    idea: 'Always take an indegree-0 node: it has no remaining prerequisites, so it is safe anywhere next.',
    trap: 'If no indegree-0 node exists but courses remain, that is a cycle — not a bug in the queue.',
  },
}

let enginePromise = null
async function loadEngine() {
  if (enginePromise === null) {
    enginePromise = Promise.all([import(DIAGRAM_URL), import(PATTERNS_URL), import(WALKTHROUGH_URL), import(TRACE_URL)])
      .then(([diagram, patterns, walkthrough, trace]) => ({
        createDiagram: diagram.createDiagram,
        buildScene: patterns.buildScene,
        buildWalkthrough: walkthrough.buildWalkthrough,
        eventsToScene: trace.eventsToScene,
      }))
      .catch((error) => {
        enginePromise = null
        throw error
      })
  }
  return enginePromise
}

function parseArgLabel(raw) {
  const value = String(raw ?? '').trim()
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1)
  return value
}

function toArgLiteral(text, type) {
  const value = String(text ?? '').trim()
  if (type === 'string' || type === 'char') {
    if (/^".*"$/.test(value)) return value
    return JSON.stringify(value)
  }
  return value
}

export function createWalkthroughPane(options = {}) {
  let diagram = null
  let frames = []
  let frame = 0
  let playing = false
  let timer = null
  let speed = 1
  let lang = options.lang === 'cpp' ? 'cpp' : 'java'
  let walkthrough = null
  let problem = null
  let argsOverride = null
  let disposed = false
  let lineElements = []
  let lastHover = null

  const codeList = h('div', { class: 'lc-codelist' })
  const stateBox = h('div', { class: 'lc-state' })
  const liveChip = h('span', { class: 'lc-live' }, h('i', null), 'live')
  const inputButton = h('button', { class: 'lc-chipbtn', type: 'button', title: 'Change the input and re-run the algorithm' }, icon(icons.wand, 12), h('span', null, 'Input'))
  const langGroup = h('div', { class: 'lc-seg', role: 'group', 'aria-label': 'Walkthrough language' })
  for (const entry of LANGS) {
    const button = h('button', {
      type: 'button',
      class: 'lc-seg-btn' + (entry.id === lang ? ' on' : ''),
      dataset: { lang: entry.id },
      onClick: () => setLanguage(entry.id),
    }, entry.label)
    langGroup.appendChild(button)
  }

  /* input editor (reactive document) --------------------------------------- */
  const inputFields = h('div', { class: 'lc-input-fields' })
  const presetRow = h('div', { class: 'lc-presets', role: 'group', 'aria-label': 'Input presets' })
  for (const preset of ['Sorted', 'All equal', 'Single', 'Duplicates', 'Random']) {
    presetRow.appendChild(h('button', { class: 'lc-chipbtn', type: 'button', title: 'Fill the first input with: ' + preset.toLowerCase(), onClick: () => applyPreset(preset) }, preset))
  }
  const inputPop = h('div', { class: 'lc-input-pop', dataset: { open: 'false' } },
    h('div', { class: 'lc-input-head' },
      h('span', null, 'Run it on your own input'),
      h('button', { class: 'lc-input-close', type: 'button', 'aria-label': 'Close input editor' }, '✕'),
    ),
    inputFields,
    presetRow,
    h('div', { class: 'lc-input-actions' },
      h('button', { class: 'lc-btn', type: 'button', onClick: () => resetInput() }, 'Reset'),
      h('button', { class: 'lc-btn lc-btn-primary', type: 'button', onClick: () => applyInput() }, 'Run this input'),
    ),
  )
  inputPop.querySelector('.lc-input-close').addEventListener('click', () => setInputOpen(false))

  const noteText = h('p', { class: 'lc-note', 'aria-live': 'polite', role: 'status' })
  const stepBadge = h('span', { class: 'lc-now-badge' }, 'STEP')
  const nowCard = h('div', { class: 'lc-now' },
    h('div', { class: 'lc-now-head' }, stepBadge, h('span', { class: 'lc-now-label' }, '')),
    noteText,
  )
  const insightBox = h('div', { class: 'lc-insight' })
  const ctaRow = h('div', { class: 'lc-wt-cta' })
  const codePane = h('section', { class: 'lc-wt-code' },
    h('header', { class: 'lc-pane-head' },
      h('span', { class: 'lc-pane-title' }, 'Reference solution'),
      langGroup,
      inputButton,
      liveChip,
    ),
    h('div', { class: 'lc-code-scroll' }, codeList),
    h('details', { class: 'lc-wt-mid lc-learning-notes' }, h('summary', null, 'Why it works & common mistakes'), insightBox),
    ctaRow,
    inputPop,
  )

  const stage = h('div', { class: 'lc-wt-canvas' })
  const stageEmpty = h('div', { class: 'lc-wt-empty' },
    h('div', { class: 'lc-wt-empty-art' }, icon(icons.layers, 34)),
    h('p', null, 'No diagram for this pattern yet.'),
    h('p', { class: 'lc-dim' }, 'Ask the tutor to animate it — it plays right here.'),
  )
  const hoverLine = h('div', { class: 'lc-hoverline' })
  const legend = h('div', { class: 'lc-legend' },
    h('span', null, h('i', { class: 'dot accent' }), 'current'),
    h('span', null, h('i', { class: 'dot mint' }), 'seen'),
    h('span', null, h('i', { class: 'dot ok' }), 'match / path'),
  )
  const frameLabel = h('span', { class: 'lc-transport-count' }, '0 / 0')
  const scrub = h('input', { class: 'lc-scrub', type: 'range', min: '0', max: '0', value: '0', 'aria-label': 'Step' })
  const playButton = h('button', { class: 'lc-tbtn lc-tbtn-play', type: 'button', 'aria-label': 'Play' }, icon(icons.play, 15))
  const restartButton = h('button', { class: 'lc-tbtn', type: 'button', 'aria-label': 'Restart from the first step', title: 'Restart' }, icon(icons.step, 14, { style: 'transform:scaleX(-1)' }))
  const prevButton = h('button', { class: 'lc-tbtn', type: 'button', 'aria-label': 'Previous step (←)' }, icon(icons.reset, 14, { style: 'transform:scaleX(-1)' }))
  const nextButton = h('button', { class: 'lc-tbtn', type: 'button', 'aria-label': 'Next step (→)' }, icon(icons.step, 14))
  const speedSelect = h('select', { class: 'lc-speed', 'aria-label': 'Speed' },
    h('option', { value: '0.5' }, '0.5×'),
    h('option', { value: '1', selected: true }, '1×'),
    h('option', { value: '2' }, '2×'),
    h('option', { value: '3' }, '3×'),
  )
  const aiButton = h('button', { class: 'lc-tbtn lc-tbtn-ai', type: 'button' }, icon(icons.sparkle, 14), h('span', null, 'Animate with AI'))
  // Optional cinema mode: the same scene through the 3D viewer. Explicit opt-in only —
  // the 2D diagram stays the default because it encodes state without decoration.
  const cinemaButton = h('button', { class: 'lc-tbtn', type: 'button', title: 'Optional 3D cinema view of the same scene', 'aria-pressed': 'false' }, h('span', null, '3D'))

  const transport = h('div', { class: 'lc-transport' },
    h('div', { class: 'lc-transport-left' }, restartButton, prevButton, playButton, nextButton),
    h('div', { class: 'lc-transport-mid' }, scrub, frameLabel),
    h('div', { class: 'lc-transport-right' }, speedSelect, cinemaButton, aiButton),
  )

  const traceBanner = h('div', { class: 'lc-trace-banner', dataset: { open: 'false' } })
  const traceBack = h('button', { class: 'lc-chipbtn', type: 'button' }, h('span', null, 'Back to reference'))
  traceBack.addEventListener('click', () => {
    if (problem) showProblem(problem)
  })
  // Learning-experience composition: the step explanation and the state readout live
  // WITH the picture (reparented below), so the stage reads top-to-bottom as
  // step → canvas → state → controls. The code column keeps code + insight + CTA.
  const stagePane = h('section', { class: 'lc-wt-stage' },
    traceBanner,
    nowCard,
    h('div', { class: 'lc-wt-viewport' }, stage, stageEmpty),
    h('details', { class: 'lc-variable-details' }, h('summary', null, 'Variables & execution details'), stateBox),
    hoverLine,
    legend,
    transport,
  )

  const steps = h('div', { class: 'lc-steps' })
  const root = h('div', { class: 'lc-wt' }, codePane, stagePane, h('details', { class: 'lc-step-details' }, h('summary', null, 'Browse all steps'), steps))

  /* -------------------------------------------------------------- playback */

  function total() {
    return frames.length
  }

  function stop() {
    playing = false
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
    clear(playButton)
    playButton.appendChild(icon(icons.play, 15))
    playButton.classList.remove('on')
    liveChip.classList.remove('running')
  }

  function start() {
    if (total() === 0) return
    if (timer !== null) clearInterval(timer)
    playing = true
    clear(playButton)
    playButton.appendChild(icon(icons.pause, 15))
    playButton.classList.add('on')
    liveChip.classList.add('running')
    if (frame >= total() - 1) goTo(0)
    timer = setInterval(() => goTo(frame + 1, true), Math.max(240, 1500 / speed))
  }

  let cinema = null
  let cinemaOn = false
  let currentScene = null

  function activeView() {
    return cinemaOn && cinema ? cinema : diagram
  }

  function goTo(index, fromTimer = false) {
    if (total() === 0) return
    frame = Math.max(0, Math.min(total() - 1, index))
    const view = activeView()
    if (view) {
      try {
        view.goTo(frame)
      } catch {
        /* the code pane still syncs */
      }
    }
    paint()
    if (!fromTimer && playing) stop()
    if (fromTimer && frame >= total() - 1) stop()
  }

  async function setCinema(on) {
    if (on && currentScene && ['array', 'string'].includes(currentScene.kind)) return
    cinemaOn = on
    cinemaButton.setAttribute('aria-pressed', String(on))
    cinemaButton.classList.toggle('on', on)
    if (!on) {
      if (cinema) {
        try {
          cinema.destroy()
        } catch {
          /* ignore */
        }
        cinema = null
      }
      await ensureDiagram()
      if (diagram && currentScene) {
        try {
          diagram.setScene(currentScene)
          diagram.goTo(frame)
        } catch {
          /* ignore */
        }
      }
      return
    }
    stop()
    // The 2D SVG leaves the stage while cinema owns it (rebuilt on the way back).
    if (diagram) {
      try {
        diagram.destroy()
      } catch {
        /* ignore */
      }
      diagram = null
    }
    try {
      const module = await import(CINEMA_URL)
      if (cinema) {
        try {
          cinema.destroy()
        } catch {
          /* ignore */
        }
        cinema = null
      }
      const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
      cinema = module.createViewer(stage, { reducedMotion: reduced })
      if (currentScene) cinema.setScene(currentScene)
      cinema.goTo(frame)
    } catch (error) {
      console.warn('[lab] cinema unavailable', error)
      cinemaOn = false
      cinemaButton.setAttribute('aria-pressed', 'false')
      cinemaButton.classList.remove('on')
      await ensureDiagram()
    }
  }

  /* ------------------------------------------------------------ state chips */

  function describeState(state) {
    const rows = []
    if (!state || typeof state !== 'object') return rows
    if (state.pointers && typeof state.pointers === 'object') {
      for (const [name, value] of Object.entries(state.pointers)) {
        if (typeof value === 'number') rows.push({ key: name, value: String(value), tone: 'accent', index: value })
      }
    }
    if (Array.isArray(state.window) && state.window.length === 2) {
      rows.push({ key: 'window', value: '[' + state.window[0] + ' … ' + state.window[1] + ']', tone: 'muted' })
    }
    if (state.seen && typeof state.seen === 'object') {
      const entries = Object.entries(state.seen)
      rows.push({
        key: 'seen',
        value: entries.length === 0 ? '{}' : '{' + entries.slice(0, 6).map(([key, value]) => key + '→' + value).join(', ') + (entries.length > 6 ? ', …' : '') + '}',
        tone: 'sky',
      })
    }
    if (state.vars && typeof state.vars === 'object') {
      for (const [key, value] of Object.entries(state.vars).slice(0, 6)) {
        rows.push({ key, value: String(value), tone: 'sky' })
      }
    }
    if (Array.isArray(state.items)) rows.push({ key: 'stack', value: state.items.length === 0 ? '[]' : '[' + state.items.join(' ') + ']', tone: 'mint' })
    if (Array.isArray(state.visited)) {
      rows.push({
        key: 'visited',
        value: state.visited.length === 0 ? '[]' : '[' + state.visited.slice(0, 14).join(', ') + (state.visited.length > 14 ? ', …' : '') + ']',
        tone: 'ok',
      })
    }
    if (Array.isArray(state.path) && state.path.length > 0) rows.push({ key: 'path', value: '[' + state.path.slice(0, 12).join(' → ') + ']', tone: 'muted' })
    if (Array.isArray(state.filled)) rows.push({ key: 'filled', value: state.filled.length + ' cells', tone: 'muted' })
    if (state.counts && typeof state.counts === 'object') {
      const entries = Object.entries(state.counts)
      rows.push({ key: 'counts', value: entries.length === 0 ? '{}' : '{' + entries.slice(0, 6).map(([key, value]) => key + '×' + value).join(', ') + (entries.length > 6 ? ', …' : '') + '}', tone: 'sky' })
    }
    if (Array.isArray(state.stack) && state.stack.length > 0) rows.push({ key: 'stack', value: '[' + state.stack.slice(-8).join(', ') + ']', tone: 'sky' })
    if (state.resolved && typeof state.resolved === 'object' && Object.keys(state.resolved).length > 0) {
      rows.push({ key: 'resolved', value: Object.keys(state.resolved).length + ' popped', tone: 'ok' })
    }
    if (state.distances && typeof state.distances === 'object') {
      rows.push({ key: 'dist', value: Object.keys(state.distances).length + ' labelled', tone: 'sky' })
    }
    if (Array.isArray(state.queue) && state.queue.length > 0) rows.push({ key: 'queue', value: '[' + state.queue.slice(0, 8).join(', ') + (state.queue.length > 8 ? ', …' : '') + ']', tone: 'sky' })
    if (state.reads && Array.isArray(state.reads) && state.reads.length > 0) rows.push({ key: 'reads', value: state.reads.map(([r, c]) => '(' + r + ',' + c + ')').join(' '), tone: 'warn' })
    if (state.ops && typeof state.ops === 'object') {
      const parts = []
      if (typeof state.ops.cmp === 'number') parts.push('cmp ' + state.ops.cmp)
      if (typeof state.ops.writes === 'number') parts.push('writes ' + state.ops.writes)
      if (parts.length > 0) rows.push({ key: 'ops', value: parts.join(' · '), tone: 'muted' })
    }
    return rows
  }

  function renderState() {
    clear(stateBox)
    const current = frames[frame] || null
    const rows = describeState(current ? current.state : null)
    if (rows.length === 0) {
      stateBox.style.display = 'none'
      return
    }
    stateBox.style.display = ''
    stateBox.appendChild(h('span', { class: 'lc-state-title' }, 'State'))
    stateBox.appendChild(h('span', { class: 'lc-state-hint' }, 'hover a value → highlight it in the diagram'))
    const list = h('div', { class: 'lc-state-rows' })
    for (const row of rows) {
      const chip = h('div', { class: 'lc-state-row', dataset: { tone: row.tone } },
        h('span', { class: 'lc-state-key' }, row.key),
        h('code', { class: 'lc-state-val tone-' + row.tone }, row.value),
      )
      if (typeof row.index === 'number') {
        chip.addEventListener('mouseenter', () => {
          if (diagram && typeof diagram.highlightCell === 'function') diagram.highlightCell(row.index)
        })
        chip.addEventListener('mouseleave', () => {
          if (diagram && typeof diagram.highlightCell === 'function') diagram.highlightCell(null)
        })
      }
      list.appendChild(chip)
    }
    stateBox.appendChild(list)
    // Complexity probe: cumulative comparisons across the run, with a you-are-here mark.
    const series = frames.map((entry) => (entry && entry.state && entry.state.ops && typeof entry.state.ops.cmp === 'number' ? entry.state.ops.cmp : null))
    if (series.some((v) => v !== null)) {
      const max = Math.max(1, ...series.filter((v) => v !== null))
      const width = 220
      const height = 30
      const svgNS = 'http://www.w3.org/2000/svg'
      const svg = document.createElementNS(svgNS, 'svg')
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
      svg.setAttribute('class', 'lc-ops-plot')
      svg.setAttribute('role', 'img')
      svg.setAttribute('aria-label', `Cumulative comparisons per step, now ${series[frame] === null || series[frame] === undefined ? 'unmeasured' : series[frame]} at step ${frame + 1} of ${frames.length}`)
      let previous = null
      const points = []
      series.forEach((value, index) => {
        if (value === null) return
        const x = frames.length <= 1 ? 0 : (index / (frames.length - 1)) * (width - 4) + 2
        const y = height - 3 - (value / max) * (height - 8)
        points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
        previous = value
      })
      if (points.length > 1) {
        const line = document.createElementNS(svgNS, 'polyline')
        line.setAttribute('points', points.join(' '))
        line.setAttribute('class', 'lc-ops-line')
        svg.appendChild(line)
      }
      if (frames.length > 0) {
        const x = frames.length <= 1 ? 2 : (frame / (frames.length - 1)) * (width - 4) + 2
        const mark = document.createElementNS(svgNS, 'line')
        mark.setAttribute('x1', x.toFixed(1))
        mark.setAttribute('x2', x.toFixed(1))
        mark.setAttribute('y1', '2')
        mark.setAttribute('y2', String(height - 2))
        mark.setAttribute('class', 'lc-ops-now')
        svg.appendChild(mark)
      }
      const wrap = h('div', { class: 'lc-ops' },
        h('span', { class: 'lc-state-title' }, 'Comparisons'),
        h('span', { class: 'lc-state-hint' }, previous === null ? 'not instrumented here' : 'cumulative · shape is the evidence'),
      )
      wrap.appendChild(svg)
      stateBox.appendChild(wrap)
    }
  }

  /* ----------------------------------------------------------------- paint */

  function paint() {
    const current = frames[frame] || null
    const count = total()
    cinemaButton.hidden = Boolean(currentScene && ['array', 'string'].includes(currentScene.kind))
    frameLabel.textContent = count === 0 ? '0 / 0' : frame + 1 + ' / ' + count
    scrub.max = String(Math.max(0, count - 1))
    scrub.value = String(frame)
    noteText.textContent = current ? String(current.note || current.label || '') : ''
    stepBadge.textContent = count === 0 ? 'STEP' : 'STEP ' + (frame + 1) + '/' + count
    const labelEl = nowCard.querySelector('.lc-now-label')
    if (labelEl) labelEl.textContent = current ? String(current.label || '') : ''

    const activeStep = current ? current.step : null
    let activeIndex = -1
    for (let index = 0; index < lineElements.length; index += 1) {
      const entry = lineElements[index]
      const isActive = activeStep !== null && entry.dataset.step === activeStep && activeIndex === -1
      if (isActive) activeIndex = index
      entry.classList.toggle('on', isActive)
    }
    if (activeIndex >= 0) {
      const entry = lineElements[activeIndex]
      const scroller = codeList.parentElement
      if (scroller) {
        const top = entry.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
        const height = entry.offsetHeight
        if (top < scroller.scrollTop + 8 || top + height > scroller.scrollTop + scroller.clientHeight - 8) {
          scroller.scrollTop = Math.max(0, top - scroller.clientHeight / 2)
        }
      }
    }

    const items = steps.children
    for (let index = 0; index < items.length; index += 1) {
      const isActive = index === frame
      items[index].classList.toggle('on', isActive)
      if (isActive && playing) items[index].scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
    renderState()
  }

  /* ------------------------------------------------------------------ code */

  function renderCode() {
    clear(codeList)
    lineElements = []
    if (!walkthrough || !walkthrough.code) {
      codeList.appendChild(
        h('div', { class: 'lc-codelist-empty' },
          h('p', null, 'This pattern has no line-linked reference yet — you still get a diagram.'),
          h('p', { class: 'lc-dim' }, 'The tutor can explain this one line by line on request.'),
        ),
      )
      return
    }
    const lines = walkthrough.code[lang] || walkthrough.code.java || []
    lines.forEach((entry, index) => {
      const element = h('div', { class: 'lc-line', dataset: { step: entry.step, line: String(index + 1) } },
        h('span', { class: 'lc-line-no' }, String(index + 1)),
        h('code', null, entry.text || ''),
      )
      // Brushing → diagram: hovering a line highlights everything that step touches.
      element.addEventListener('mouseenter', () => highlightStep(entry.step))
      element.addEventListener('mouseleave', () => highlightStep(null))
      lineElements.push(element)
      codeList.appendChild(element)
    })
  }

  /** All diagram elements touched by frames carrying `step` (null clears). */
  function highlightStep(step) {
    if (!diagram || !step) {
      if (diagram && typeof diagram.highlightCell === 'function') diagram.highlightCell(null)
      if (diagram && typeof diagram.highlightNode === 'function') diagram.highlightNode(null)
      if (diagram && typeof diagram.highlightGrid === 'function') diagram.highlightGrid(null)
      return
    }
    const kind = walkthrough ? walkthrough.kind : ''
    const cells = new Set()
    const nodes = new Set()
    let gridCoord = null
    for (const entry of frames) {
      if (!entry || entry.step !== step || !entry.state) continue
      const state = entry.state
      for (const key of Object.keys(state.highlights || {})) {
        const index = Number(key)
        if (Number.isFinite(index)) cells.add(index)
      }
      for (const value of Object.values(state.pointers || {})) {
        if (typeof value === 'number' && Number.isFinite(value)) cells.add(value)
      }
      if (state.current !== undefined && state.current !== null) {
        if (Array.isArray(state.current)) {
          if (!gridCoord) gridCoord = state.current
        } else nodes.add(String(state.current))
      }
      for (const id of [...(state.path || []), ...(state.frontier || []), ...(state.visited || [])].slice(0, 24)) nodes.add(String(id))
    }
    if (!diagram) return
    if ((kind === 'array' || kind === 'string' || kind === 'linked-list') && cells.size > 0 && typeof diagram.highlightCell === 'function') {
      diagram.highlightCell([...cells])
    } else if ((kind === 'tree' || kind === 'graph') && nodes.size > 0 && typeof diagram.highlightNode === 'function') {
      diagram.highlightNode([...nodes])
    } else if (kind === 'grid' && gridCoord && typeof diagram.highlightGrid === 'function') {
      diagram.highlightGrid(gridCoord)
    }
    // Diagram → code is handled on hover: flash this step's line.
    for (const element of lineElements) element.classList.toggle('is-hover', element.dataset.step === step)
  }

  /** Flash the current frame's code line while the pointer is over the diagram. */
  function flashCurrentLine(on) {
    const current = frames[frame] || null
    const step = current ? current.step : null
    for (const element of lineElements) element.classList.toggle('is-hover', on && step !== null && element.dataset.step === step)
  }

  function renderSteps() {
    clear(steps)
    frames.forEach((entry, index) => {
      steps.appendChild(
        h('button', {
          type: 'button',
          class: 'lc-wt-step' + (index === frame ? ' on' : ''),
          onClick: () => goTo(index),
          title: entry.note || '',
        },
          h('span', { class: 'lc-wt-step-dot' }),
          h('span', { class: 'lc-wt-step-label' }, String(entry.label || 'step ' + (index + 1))),
        ),
      )
    })
  }

  function renderInsight() {
    clear(insightBox)
    clear(ctaRow)
    if (!problem) return
    const note = PATTERN_NOTES[problem.pattern]
    if (note) {
      insightBox.appendChild(h('div', { class: 'lc-insight-block' }, h('span', { class: 'lc-insight-title' }, 'Why this works'), h('p', null, note.idea)))
      insightBox.appendChild(h('div', { class: 'lc-insight-block trap' }, h('span', { class: 'lc-insight-title' }, 'Where people break it'), h('p', null, note.trap)))
      insightBox.style.display = ''
    } else {
      insightBox.style.display = 'none'
    }
    if (typeof options.onGoSolve === 'function') {
      ctaRow.appendChild(h('button', { type: 'button', class: 'lc-btn lc-btn-primary lc-cta', onClick: () => options.onGoSolve() }, icon(icons.code, 14), h('span', null, 'Now write it yourself')))
      ctaRow.appendChild(h('span', { class: 'lc-cta-hint' }, 'Run it against the real tests'))
      ctaRow.style.display = ''
    } else {
      ctaRow.style.display = 'none'
    }
  }

  function setLanguage(next) {
    lang = next === 'cpp' ? 'cpp' : next === 'pseudo' ? 'pseudo' : 'java'
    for (const button of langGroup.children) button.classList.toggle('on', button.dataset.lang === lang)
    renderCode()
    paint()
  }

  /* --------------------------------------------------------- input (react) */

  function currentArgs() {
    if (argsOverride) return argsOverride.slice()
    const judge = problem && problem.judge
    if (judge && Array.isArray(judge.tests) && judge.tests.length > 0) return (judge.tests[0].args || []).slice()
    return []
  }

  function renderInputFields() {
    clear(inputFields)
    const signature = problem && problem.judge ? problem.judge.signature : null
    const params = signature && Array.isArray(signature.params) ? signature.params : []
    const args = currentArgs()
    if (params.length === 0) {
      inputFields.appendChild(h('p', { class: 'lc-dim' }, 'This problem has no parsed signature, so the input cannot be edited.'))
      return
    }
    params.forEach((param, index) => {
      const type = param.type || 'int'
      const isString = type === 'string' || type === 'char'
      const field = h('input', {
        class: 'lc-input-field',
        type: 'text',
        value: isString ? parseArgLabel(args[index]) : String(args[index] ?? ''),
        spellcheck: 'false',
        'aria-label': param.name || 'arg' + index,
      })
      field.dataset.index = String(index)
      field.dataset.type = type
      inputFields.appendChild(
        h('label', { class: 'lc-input-row' },
          h('span', { class: 'lc-input-name' }, (param.name || 'arg' + index) + ' : ' + type),
          field,
        ),
      )
    })
  }

  function setInputOpen(open) {
    inputPop.dataset.open = String(open)
    inputButton.classList.toggle('on', open)
    if (open) renderInputFields()
  }

  function resetInput() {
    argsOverride = null
    setInputOpen(false)
    if (typeof options.onInput === 'function') options.onInput(null)
    showProblem(problem)
  }

  function readInputFields() {
    const fields = [...inputFields.querySelectorAll('.lc-input-field')]
    return fields.map((field) => toArgLiteral(field.value, field.dataset.type))
  }

  function applyInput() {
    argsOverride = readInputFields()
    setInputOpen(false)
    if (typeof options.onInput === 'function') options.onInput(argsOverride)
    showProblem(problem)
  }

  /** One-click edge cases for the first input: sorted / all equal / single / duplicates / random. */
  function applyPreset(preset) {
    const fields = [...inputFields.querySelectorAll('.lc-input-field')]
    if (fields.length === 0) return
    const field = fields[0]
    const type = field.dataset.type || ''
    const raw = String(field.value ?? '').trim()
    const apply = (text) => {
      field.value = text
      argsOverride = readInputFields()
      setInputOpen(false)
      if (typeof options.onInput === 'function') options.onInput(argsOverride)
      showProblem(problem)
    }
    // Array literal [a, b, ...].
    if (raw.startsWith('[')) {
      const inner = raw.replace(/^\[/, '').replace(/\]$/, '')
      const parts = inner.split(',').map((p) => p.trim()).filter((p) => p !== '')
      if (parts.length === 0) return
      const nums = parts.map(Number)
      const numeric = nums.every(Number.isFinite)
      if (preset === 'Sorted' && numeric) return apply('[' + nums.slice().sort((a, b) => a - b).join(', ') + ']')
      if (preset === 'All equal') return apply('[' + parts.map(() => parts[0]).join(', ') + ']')
      if (preset === 'Single') return apply('[' + parts[0] + ']')
      if (preset === 'Duplicates') {
        const pair = parts.slice(0, 2)
        while (pair.length < 2) pair.push(parts[0])
        return apply('[' + Array.from({ length: Math.max(3, parts.length) }, (_, i) => pair[i % 2]).join(', ') + ']')
      }
      if (preset === 'Random') {
        if (numeric) {
          const next = parts.map(() => Math.floor(Math.random() * 20) - 5)
          return apply('[' + next.join(', ') + ']')
        }
        const shuffled = parts.slice()
        for (let i = shuffled.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return apply('[' + shuffled.join(', ') + ']')
      }
      return
    }
    // Quoted string.
    if ((raw.startsWith('"') && raw.endsWith('"')) || type === 'string') {
      const word = raw.replace(/^"/, '').replace(/"$/, '')
      if (word.length === 0) return
      if (preset === 'Sorted') return apply(JSON.stringify([...word].sort().join('')))
      if (preset === 'All equal') return apply(JSON.stringify(word[0].repeat(word.length)))
      if (preset === 'Single') return apply(JSON.stringify(word[0]))
      if (preset === 'Duplicates') return apply(JSON.stringify((word[0] + (word[1] || word[0])).repeat(Math.ceil(word.length / 2)).slice(0, Math.max(2, word.length))))
      if (preset === 'Random') {
        const letters = 'abcdefghijklmnopqrstuvwxyz'
        return apply(JSON.stringify(Array.from({ length: word.length }, () => letters[Math.floor(Math.random() * letters.length)]).join('')))
      }
      return
    }
    // Scalar (k, target, n): randomize in a sane range.
    if (preset === 'Random') {
      const n = Number(raw)
      if (Number.isFinite(n)) apply(String(1 + Math.floor(Math.random() * Math.max(2, Math.min(12, Math.abs(n) + 3)))))
    }
    if (preset === 'Single' && type === 'int') apply('1')
  }

  inputButton.addEventListener('click', () => setInputOpen(inputPop.dataset.open !== 'true'))

  /* --------------------------------------------------------------- diagram */

  async function ensureDiagram() {
    if (diagram !== null || disposed) return diagram
    try {
      const engine = await loadEngine()
      diagram = engine.createDiagram(stage, { theme: {} })
      if (typeof diagram.on === 'function') {
        diagram.on('hover', (payload) => {
          lastHover = payload
          if (!payload) {
            hoverLine.textContent = ''
            flashCurrentLine(false)
            return
          }
          // Diagram → code: flash the executing line while hovering the picture.
          flashCurrentLine(true)
          const current = frames[frame] || null
          const stepNote = current && current.step ? ' · line: ' + current.step : ''
          if (payload.kind === 'cell') hoverLine.textContent = 'index ' + payload.index + stepNote
          else if (payload.kind === 'node') hoverLine.textContent = 'node ' + payload.id + stepNote
          else if (payload.kind === 'grid') hoverLine.textContent = 'cell (' + payload.row + ', ' + payload.col + ')' + stepNote
        })
      }
      return diagram
    } catch (error) {
      console.warn('[lab] diagram engine unavailable', error)
      return null
    }
  }

  /* ------------------------------------------------------------- lifecycle */

  function hideTraceBanner() {
    traceBanner.dataset.open = 'false'
    clear(traceBanner)
  }

  async function showProblem(nextProblem, opts = {}) {
    problem = nextProblem
    if (cinemaOn) await setCinema(false)
    if (opts && Array.isArray(opts.args)) argsOverride = opts.args.slice()
    const startFrame = opts && Number.isFinite(opts.frame) ? Math.max(0, opts.frame) : 0
    hideTraceBanner()
    liveChip.textContent = ''
    liveChip.appendChild(h('i', null))
    liveChip.appendChild(document.createTextNode('live'))
    stop()
    if (!(cinemaOn && cinema)) await ensureDiagram()
    stageEmpty.style.display = 'none'
    stage.style.display = ''
    walkthrough = null
    frames = []
    frame = 0
    let built = null
    try {
      const engine = await loadEngine()
      built = engine.buildWalkthrough(problem, argsOverride ? { args: argsOverride } : {})
    } catch (error) {
      console.warn('[lab] walkthrough build failed', error)
    }
    if (built && Array.isArray(built.frames) && built.frames.length > 0) {
      walkthrough = built
      frames = built.frames
      currentScene = { v: 1, kind: built.kind, layout: built.layout, frames, title: problem && problem.title, pattern: built.pattern || (problem && problem.pattern) }
      if (cinemaOn && cinema) {
        try {
          cinema.setScene(currentScene)
          cinema.goTo(0)
        } catch {
          /* ignore */
        }
      } else if (diagram) {
        try {
          diagram.setScene(currentScene)
          diagram.goTo(0)
        } catch (error) {
          console.warn('[lab] diagram rejected walkthrough', error)
        }
      }
    } else if (diagram || (cinemaOn && cinema)) {
      // Pattern-only problem: still show a diagram built from the generated scene.
      let scene = null
      try {
        const engine = await loadEngine()
        scene = engine.buildScene(problem, { theme: {} })
      } catch {
        scene = null
      }
      if (scene && Array.isArray(scene.frames)) {
        frames = scene.frames
        currentScene = scene
        try {
          activeView().setScene(scene)
          activeView().goTo(0)
        } catch {
          /* ignore */
        }
      } else {
        frames = []
        currentScene = null
        stage.style.display = 'none'
        stageEmpty.style.display = ''
      }
    }
    renderCode()
    renderSteps()
    renderInsight()
    paint()
    // Deep-link support (?step=N): land on the requested frame after first paint.
    if (startFrame > 0 && startFrame < total()) goTo(startFrame)
  }

  playButton.addEventListener('click', async () => {
    if (playing) return stop()
    if (!cinemaOn) await ensureDiagram()
    start()
  })
  restartButton.addEventListener('click', () => goTo(0))
  cinemaButton.addEventListener('click', () => setCinema(!cinemaOn))
  prevButton.addEventListener('click', () => goTo(frame - 1))
  nextButton.addEventListener('click', () => goTo(frame + 1))
  scrub.addEventListener('input', () => goTo(Number(scrub.value) || 0))
  speedSelect.addEventListener('change', () => {
    speed = Number(speedSelect.value) || 1
    if (playing) start()
  })
  if (typeof options.onRequestAiScene === 'function') {
    aiButton.addEventListener('click', () => options.onRequestAiScene())
  } else {
    aiButton.style.display = 'none'
  }

  const onKey = (event) => {
    const tag = (event.target && event.target.tagName) || ''
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      goTo(frame + 1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goTo(frame - 1)
    } else if (event.key === ' ') {
      event.preventDefault()
      if (playing) stop()
      else start()
    }
  }
  document.addEventListener('keydown', onKey)

  return {
    el: root,
    showProblem,
    showAiScene(scene) {
      if (!scene || !Array.isArray(scene.frames)) return
      hideTraceBanner()
      frames = scene.frames.map((entry) => ({ ...entry, step: null }))
      frame = 0
      currentScene = scene
      liveChip.textContent = 'ai scene'
      ;(cinemaOn && cinema ? Promise.resolve() : ensureDiagram()).then(() => {
        const view = activeView()
        if (!view) return
        try {
          view.setScene(scene)
          view.goTo(0)
        } catch {
          /* ignore */
        }
        renderSteps()
        paint()
      })
      stageEmpty.style.display = 'none'
      stage.style.display = ''
    },
    async showTrace(events, info = {}) {
      stop()
      if (!(cinemaOn && cinema)) await ensureDiagram()
      let scene = null
      try {
        const engine = await loadEngine()
        scene = engine.eventsToScene(events, problem)
      } catch (error) {
        console.warn('[lab] trace scene failed', error)
      }
      if (!scene || !Array.isArray(scene.frames)) return false
      hideTraceBanner()
      walkthrough = null
      frames = scene.frames.map((entry) => ({ ...entry, step: null }))
      frame = 0
      clear(liveChip)
      liveChip.appendChild(h('i', null))
      liveChip.appendChild(document.createTextNode('your run'))
      clear(traceBanner)
      traceBanner.appendChild(h('span', { class: 'lc-trace-text' },
        `Your code's execution · ${events.length} iteration${events.length === 1 ? '' : 's'}${info.capped ? ' (capped)' : ''}${info.result ? (String(info.result).startsWith('(') ? ` · ${info.result}` : ` · returned ${info.result}`) : ''} — step through where it diverges.`))
      traceBanner.appendChild(traceBack)
      traceBanner.dataset.open = 'true'
      currentScene = scene
      {
        const view = activeView()
        if (view) {
          try {
            view.setScene(scene)
            view.goTo(0)
          } catch {
            /* ignore */
          }
        }
      }
      renderCode()
      renderSteps()
      renderInsight()
      paint()
      stageEmpty.style.display = 'none'
      stage.style.display = ''
      return true
    },
    setLanguage,
    jumpTo: goTo,
    pause() {
      stop()
    },
    destroy() {
      disposed = true
      stop()
      document.removeEventListener('keydown', onKey)
      if (diagram && typeof diagram.destroy === 'function') diagram.destroy()
      diagram = null
      if (cinema) {
        try {
          cinema.destroy()
        } catch {
          /* ignore */
        }
        cinema = null
      }
      root.remove()
    },
  }
}
