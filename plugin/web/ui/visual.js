/**
 * "See it" panel — the 3D explainer.
 *
 * Tries the deterministic pattern engine first (instant, offline), and accepts an
 * AI-authored scene script from the tutor. Playback, speed and the step transcript are
 * owned here so they work regardless of what the engine exposes.
 */
import { h, clear, icon, icons } from './dom.js'

// The host stamps every served module with the newest mtime under web/; reuse that stamp
// so engine edits are picked up instead of being pinned by the ES-module cache.
const STAMP = (() => {
  try {
    return new URL(import.meta.url).searchParams.get('b') || ''
  } catch {
    return ''
  }
})()

const ENGINE_URL = '/leetcode-lab/engine/index.js' + (STAMP ? '?b=' + STAMP : '')
const PATTERNS_URL = '/leetcode-lab/engine/patterns.js' + (STAMP ? '?b=' + STAMP : '')

const THEME = {
  bg: '#070b16',
  panel: '#0d1526',
  text: '#e8eefc',
  dim: '#7f90ae',
  accent: '#5ee7ff',
  ok: '#57e39a',
  warn: '#ffc65c',
  bad: '#ff6b81',
}

const BASE_FRAME_MS = 1500

let enginePromise = null

async function loadEngine() {
  if (enginePromise === null) {
    enginePromise = Promise.all([import(ENGINE_URL), import(PATTERNS_URL)]).then(([engine, patterns]) => ({
      createViewer: engine.createViewer,
      buildScene: patterns.buildScene,
    }))
    enginePromise.catch(() => {
      enginePromise = null
    })
  }
  return enginePromise
}

export function createVisualPanel(options = {}) {
  let viewer = null
  let scene = null
  let frame = 0
  let playing = false
  let speed = 1
  let source = 'template'
  let problem = null
  let disposed = false
  let timer = null

  const stage = h('div', { class: 'lcv-stage' })
  const stageEmpty = h('div', { class: 'lcv-empty' },
    h('div', { class: 'lcv-empty-art' }, icon(icons.cube, 44)),
    h('p', null, 'No visual for this problem yet.'),
    h('p', { class: 'lcv-empty-hint' }, 'Ask the tutor to animate it — the scene plays right here.'),
  )
  const frameLabel = h('span', { class: 'lcv-frame' }, '0 / 0')
  const noteText = h('span', { class: 'lcv-note' }, '')
  const scrub = h('input', { class: 'lcv-scrub', type: 'range', min: '0', max: '0', value: '0', 'aria-label': 'Frame' })
  const playButton = h('button', { class: 'lcv-btn lcv-play', type: 'button', title: 'Play / pause (space)', 'aria-label': 'Play' }, icon(icons.play, 15))
  const prevButton = h('button', { class: 'lcv-btn', type: 'button', title: 'Previous step', 'aria-label': 'Previous step' }, icon(icons.reset, 14, { style: 'transform:scaleX(-1)' }))
  const nextButton = h('button', { class: 'lcv-btn', type: 'button', title: 'Next step', 'aria-label': 'Next step' }, icon(icons.step, 14))
  const speedSelect = h('select', { class: 'lcv-speed', 'aria-label': 'Playback speed' },
    h('option', { value: '0.5' }, '0.5×'),
    h('option', { value: '1', selected: true }, '1×'),
    h('option', { value: '2' }, '2×'),
    h('option', { value: '3' }, '3×'),
  )
  const sourceChip = h('span', { class: 'lcv-chip' }, 'pattern template')
  const aiButton = h('button', { class: 'lcv-btn lcv-btn-ai', type: 'button', title: 'Ask the tutor to animate this' }, icon(icons.sparkle, 14), h('span', null, 'Animate with AI'))
  const transcript = h('ol', { class: 'lcv-transcript' })

  const toolbar = h('div', { class: 'lcv-toolbar' },
    h('div', { class: 'lcv-group' }, prevButton, playButton, nextButton),
    h('div', { class: 'lcv-scrubwrap' }, scrub, frameLabel),
    h('div', { class: 'lcv-group' }, speedSelect, sourceChip, aiButton),
  )

  const root = h('div', { class: 'lcv' },
    h('div', { class: 'lcv-head' },
      h('div', null,
        h('h3', { class: 'lcv-title' }, 'See it'),
        h('p', { class: 'lcv-sub' }, 'Drag to orbit · scroll to zoom · step the algorithm'),
      ),
    ),
    h('div', { class: 'lcv-canvaswrap' }, stage, stageEmpty),
    h('div', { class: 'lcv-notes' }, noteText),
    toolbar,
    transcript,
  )

  function total() {
    return scene && Array.isArray(scene.frames) ? scene.frames.length : 0
  }

  function setEmpty(visible, message) {
    stageEmpty.style.display = visible ? '' : 'none'
    // Hide the canvas entirely when there is no scene: the engine would otherwise draw its
    // own "Scene unavailable" fallback underneath our message.
    stage.style.display = visible ? 'none' : ''
    if (visible && message) {
      const paragraphs = stageEmpty.querySelectorAll('p')
      if (paragraphs[1]) paragraphs[1].textContent = message
    }
  }

  function stop() {
    playing = false
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
    clear(playButton)
    playButton.appendChild(icon(icons.play, 15))
    playButton.setAttribute('aria-label', 'Play')
    playButton.classList.remove('on')
  }

  function goTo(index, { fromTimer = false } = {}) {
    const count = total()
    if (count === 0) return
    frame = Math.max(0, Math.min(count - 1, index))
    if (viewer) {
      try {
        viewer.goTo(frame)
      } catch (error) {
        console.warn('[lab] viewer.goTo failed', error)
      }
    }
    paintFrame()
    if (!fromTimer && playing) stop()
    if (fromTimer && frame >= count - 1) stop()
  }

  function start() {
    if (total() === 0) return
    if (timer !== null) clearInterval(timer)
    playing = true
    clear(playButton)
    playButton.appendChild(icon(icons.pause, 15))
    playButton.setAttribute('aria-label', 'Pause')
    playButton.classList.add('on')
    if (frame >= total() - 1) goTo(0)
    const interval = Math.max(240, BASE_FRAME_MS / speed)
    timer = setInterval(() => goTo(frame + 1, { fromTimer: true }), interval)
  }

  function paintFrame() {
    const count = total()
    frameLabel.textContent = count === 0 ? '0 / 0' : frame + 1 + ' / ' + count
    scrub.max = String(Math.max(0, count - 1))
    scrub.value = String(frame)
    const current = scene && scene.frames ? scene.frames[frame] : null
    noteText.textContent = current ? String(current.note || current.label || '') : ''
    if (transcript.childElementCount > 0) {
      const items = transcript.children
      for (let index = 0; index < items.length; index += 1) {
        const active = index === frame
        items[index].classList.toggle('on', active)
        if (active && playing && typeof items[index].scrollIntoView === 'function') {
          items[index].scrollIntoView({ block: 'nearest' })
        }
      }
    }
  }

  function buildTranscript() {
    clear(transcript)
    if (!scene || !Array.isArray(scene.frames)) return
    scene.frames.forEach((entry, index) => {
      transcript.appendChild(
        h('li', {
          class: 'lcv-step' + (index === frame ? ' on' : ''),
          dataset: { index: String(index) },
          onClick: () => goTo(index),
          title: 'Jump to this step',
        },
          h('span', { class: 'lcv-step-index' }, String(index + 1)),
          h('span', { class: 'lcv-step-body' },
            h('span', { class: 'lcv-step-label' }, String(entry.label || 'step ' + (index + 1))),
            entry.note ? h('span', { class: 'lcv-step-note' }, String(entry.note)) : null,
          ),
        ),
      )
    })
  }

  function applyScene(next, nextSource) {
    scene = next
    frame = 0
    source = nextSource || 'template'
    sourceChip.textContent = source === 'ai' ? 'AI generated' : 'pattern template'
    sourceChip.dataset.source = source
    setEmpty(!scene)
    if (!scene) {
      clear(transcript)
      paintFrame()
      return
    }
    if (viewer) {
      try {
        viewer.setScene(scene)
        viewer.goTo(0)
      } catch (error) {
        console.warn('[lab] viewer rejected scene', error)
      }
    }
    buildTranscript()
    paintFrame()
  }

  async function ensureViewer() {
    if (viewer !== null || disposed) return viewer
    try {
      const engine = await loadEngine()
      viewer = engine.createViewer(stage, { theme: THEME })
      if (typeof viewer.on === 'function') {
        viewer.on('frame', (index) => {
          frame = index
          paintFrame()
        })
      }
      if (scene) {
        viewer.setScene(scene)
        viewer.goTo(frame)
      }
      setEmpty(false)
      return viewer
    } catch (error) {
      console.warn('[lab] engine unavailable', error)
      setEmpty(false, 'The 3D engine could not load — read the steps below instead.')
      return null
    }
  }

  playButton.addEventListener('click', async () => {
    if (playing) {
      stop()
      return
    }
    await ensureViewer()
    start()
  })
  prevButton.addEventListener('click', () => goTo(frame - 1))
  nextButton.addEventListener('click', () => goTo(frame + 1))
  scrub.addEventListener('input', () => goTo(Number(scrub.value) || 0))
  speedSelect.addEventListener('change', () => {
    speed = Number(speedSelect.value) || 1
    if (playing) start()
  })

  if (typeof options.onRequestAiScene === 'function') {
    aiButton.addEventListener('click', () => {
      options.onRequestAiScene()
      aiButton.classList.add('working')
    })
  } else {
    aiButton.style.display = 'none'
  }

  const observer = new ResizeObserver(() => {
    if (viewer && typeof viewer.resize === 'function') viewer.resize()
  })
  observer.observe(root)

  return {
    el: root,
    async showProblem(nextProblem) {
      problem = nextProblem
      stop()
      await ensureViewer()
      if (!problem) {
        applyScene(null)
        return
      }
      let built = null
      try {
        const engine = await loadEngine()
        built = engine.buildScene(problem, { theme: THEME })
      } catch (error) {
        console.warn('[lab] pattern scene failed', error)
      }
      if (built) {
        applyScene(built, 'template')
      } else {
        applyScene(null)
        setEmpty(true, 'No template scene for this pattern yet — ask the tutor to animate it.')
      }
    },
    showScene(next, nextSource) {
      aiButton.classList.remove('working')
      ensureViewer().then(() => applyScene(next, nextSource || 'ai'))
    },
    clear() {
      stop()
      applyScene(null)
      setEmpty(true)
    },
    setBusy(busy, label) {
      aiButton.disabled = busy === true
      clear(aiButton)
      if (busy) {
        aiButton.appendChild(h('span', { class: 'lcv-spin' }))
        aiButton.appendChild(h('span', null, label || 'Animating…'))
      } else {
        aiButton.appendChild(icon(icons.sparkle, 14))
        aiButton.appendChild(h('span', null, 'Animate with AI'))
      }
    },
    jumpTo: goTo,
    destroy() {
      disposed = true
      stop()
      observer.disconnect()
      if (viewer && typeof viewer.destroy === 'function') viewer.destroy()
      viewer = null
      root.remove()
    },
  }
}
