/**
 * Problem workspace (v2): a Walkthrough tab that plays the reference code against the 3D
 * visual, a Solve tab with a real judge, and a Variations tab for independent practice.
 * The statement lives in a slide-over drawer so it never fights the workspace for width.
 */
import { h, clear, icon, icons } from './dom.js'
import { api } from './api.js'
import { store } from './store.js'
import { createEditor } from './editor.js'
import { createWalkthroughPane } from './walkthrough.js'
import { createVariationsPanel } from './variations.js'
import { createAiPanel } from './ai.js'
import { renderMarkdown } from './markdown.js'

const TABS = [
  { id: 'walkthrough', label: 'Walkthrough', hint: 'code ↔ visual' },
  { id: 'solve', label: 'Solve', hint: 'run your code' },
  { id: 'variations', label: 'Variations', hint: 'practise it differently' },
]
const TAB_IDS = TABS.map((tab) => tab.id)

export function createProblemView(options = {}) {
  let problem = null
  let lang = store.settings.lang === 'cpp' ? 'cpp' : 'java'
  const storedPanel = store.settings.panel
  let activeTab = TAB_IDS.includes(storedPanel) ? storedPanel : 'walkthrough'
  let editor = null
  let walkthrough = null
  let variations = null
  let ai = null
  let running = false
  let saveTimer = null
  let drawerOpen = false

  const crumb = h('span', { class: 'lc-crumb' }, 'Problem')
  const titleEl = h('h1', { class: 'lc-problem-title' }, '')
  const chips = h('div', { class: 'lc-chips' })
  const prevButton = h('button', { class: 'lc-icon-btn', type: 'button', title: 'Previous (k)', 'aria-label': 'Previous problem' }, '←')
  const nextButton = h('button', { class: 'lc-icon-btn', type: 'button', title: 'Next (j)', 'aria-label': 'Next problem' }, '→')
  const statementButton = h('button', { class: 'lc-btn lc-btn-ghost', type: 'button' }, icon(icons.code, 14), h('span', null, 'Statement'))
  const shareButton = h('button', { class: 'lc-btn lc-btn-ghost', type: 'button', title: 'Copy a shareable link (includes your walkthrough input)' }, icon(icons.external, 13), h('span', null, 'Share'))

  const header = h('header', { class: 'lc-problem-head' },
    h('div', { class: 'lc-problem-headmain' },
      h('div', { class: 'lc-problem-title-row' }, crumb, h('span', { class: 'lc-dot-sep' }, '·'), titleEl),
      chips,
    ),
    h('div', { class: 'lc-problem-headactions' }, statementButton, shareButton, h('div', { class: 'lc-stepnav' }, prevButton, nextButton)),
  )

  const tabBar = h('nav', { class: 'lc-tabs', role: 'tablist' })
  const tabButtons = new Map()
  for (const tab of TABS) {
    const button = h('button', {
      type: 'button',
      class: 'lc-tab lc-tab-' + tab.id + (tab.id === activeTab ? ' on' : ''),
      role: 'tab',
      dataset: { tab: tab.id },
      onClick: () => setTab(tab.id),
    },
      h('span', null, tab.label),
      h('span', { class: 'lc-tab-hint' }, tab.hint),
    )
    tabButtons.set(tab.id, button)
    tabBar.appendChild(button)
  }

  const walkthroughHost = h('div', { class: 'lc-tabpanel', dataset: { panel: 'walkthrough' } })
  const solveHost = h('div', { class: 'lc-tabpanel', dataset: { panel: 'solve' } })
  const variationsHost = h('div', { class: 'lc-tabpanel', dataset: { panel: 'variations' } })

  /* ------------------------------------------------------------------- solve */

  const resultBox = h('div', { class: 'lc-results' })
  const statusChip = h('span', { class: 'lc-status' }, 'ready')
  const langSelect = h('select', { class: 'lc-select', 'aria-label': 'Language' },
    h('option', { value: 'java' }, 'Java'),
    h('option', { value: 'cpp' }, 'C++'),
  )
  langSelect.value = lang
  const runButton = h('button', { class: 'lc-btn', type: 'button' }, icon(icons.play, 14), h('span', null, 'Run'))
  const traceButton = h('button', { class: 'lc-btn', type: 'button', title: 'Step through YOUR code’s execution, one loop iteration at a time' }, icon(icons.layers, 14), h('span', null, 'Trace my run'))
  const submitButton = h('button', { class: 'lc-btn lc-btn-primary', type: 'button' }, icon(icons.check, 14), h('span', null, 'Submit'))
  const editorHost = h('div', { class: 'lc-editor' })
  const solveStatement = h('div', { class: 'lc-solve-statement' })

  const solveBar = h('div', { class: 'lc-solve-bar' },
    h('div', { class: 'lc-solve-barleft' }, langSelect, statusChip),
    h('div', { class: 'lc-solve-barright' }, runButton, traceButton, submitButton),
  )
  solveHost.appendChild(
    h('div', { class: 'lc-solve' },
      h('div', { class: 'lc-solve-left' }, solveStatement),
      h('div', { class: 'lc-solve-right' }, solveBar, editorHost, resultBox),
    ),
  )

  /* ------------------------------------------------------------------ drawer */

  const drawerBody = h('div', { class: 'lc-drawer-body' })
  const drawerClose = h('button', { class: 'lc-icon-btn', type: 'button', 'aria-label': 'Close statement' }, '✕')
  const drawer = h('aside', { class: 'lc-drawer', dataset: { open: 'false' } },
    h('div', { class: 'lc-drawer-head' },
      h('span', { class: 'lc-drawer-title' }, 'Statement'),
      drawerClose,
    ),
    drawerBody,
  )
  const scrim = h('div', { class: 'lc-scrim', onClick: () => setDrawer(false) })

  const root = h('div', { class: 'lc-problem' },
    header,
    tabBar,
    h('div', { class: 'lc-tabpanels' }, walkthroughHost, solveHost, variationsHost),
    scrim,
    drawer,
  )

  /* ----------------------------------------------------------------- helpers */

  function setDrawer(open) {
    drawerOpen = open
    drawer.dataset.open = String(open)
    scrim.dataset.open = String(open)
    statementButton.classList.toggle('on', open)
  }

  drawerClose.addEventListener('click', () => setDrawer(false))
  statementButton.addEventListener('click', () => setDrawer(!drawerOpen))
  shareButton.addEventListener('click', async () => {
    const url = location.href
    try {
      await navigator.clipboard.writeText(url)
      shareButton.classList.add('on')
      setTimeout(() => shareButton.classList.remove('on'), 1200)
    } catch {
      window.prompt('Copy this link:', url)
    }
  })
  prevButton.addEventListener('click', () => options.onPrev && options.onPrev())
  nextButton.addEventListener('click', () => options.onNext && options.onNext())

  function setTab(id) {
    if (!id) return
    activeTab = id
    root.dataset.mode = id
    // No animation while writing code: leaving Walkthrough pauses playback.
    if (id !== 'walkthrough' && walkthrough && typeof walkthrough.pause === 'function') {
      try {
        walkthrough.pause()
      } catch {
        /* playback state is best effort */
      }
    }
    store.setSetting('panel', id)
    for (const [key, button] of tabButtons) button.classList.toggle('on', key === id)
    for (const panel of root.querySelectorAll('.lc-tabpanel')) panel.dataset.active = String(panel.dataset.panel === id)
    if (id === 'walkthrough') ensureWalkthrough()
    if (id === 'solve') ensureEditor()
    if (id === 'variations') ensureVariations()
  }

  let walkArgs = null
  let walkFrame = null
  function ensureWalkthrough() {
    if (walkthrough !== null) return walkthrough
    walkthrough = createWalkthroughPane({
      lang,
      onGoSolve: () => setTab('solve'),
      onRequestAiScene: () => {
        ensureAi()
        if (ai) ai.runAction('scene')
      },
      onInput: (args) => writeInputHash(args),
    })
    walkthroughHost.appendChild(walkthrough.el)
    if (problem) walkthrough.showProblem(problem, { args: walkArgs, frame: walkFrame })
    return walkthrough
  }

  /** Keep the walkthrough input shareable: mirror it into the URL hash (replace, not push). */
  function writeInputHash(args) {
    if (!problem) return
    try {
      let hash = '#/p/' + problem.slug
      if (Array.isArray(args) && args.length > 0) {
        const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(args)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        hash += '?in=' + b64
      }
      if (location.hash !== hash) history.replaceState(null, '', hash)
    } catch {
      /* URL sharing is best effort */
    }
  }

  function ensureEditor() {
    if (editor !== null || problem === null) return editor
    editor = createEditor(editorHost, {
      lang,
      slug: problem.slug,
      onChange: (value) => {
        clearTimeout(saveTimer)
        saveTimer = setTimeout(() => store.saveCode(problem.slug, lang, value), 400)
      },
      onRun: () => run('run'),
    })
    editorHost.appendChild(editor.el)
    editor.setProblem(problem)
    return editor
  }

  function ensureVariations() {
    if (variations !== null) return variations
    variations = createVariationsPanel({
      getLang: () => lang,
      onLang: (next) => {
        lang = next
        store.setSetting('lang', lang)
      },
    })
    variationsHost.appendChild(variations.el)
    if (problem) variations.showProblem(problem)
    return variations
  }

  function ensureAi() {
    if (ai !== null) return ai
    ai = createAiPanel({
      getCode: () => (editor ? editor.getValue() : ''),
      getLang: () => lang,
      onScene: (scene) => {
        setTab('walkthrough')
        ensureWalkthrough()
        if (walkthrough) walkthrough.showAiScene(scene)
      },
    })
    ai.el.classList.add('lc-ai-drawer')
    const close = h('button', {
      class: 'lc-ai-close',
      type: 'button',
      'aria-label': 'Close tutor',
      onClick: () => closeAi(),
    }, '✕')
    ai.el.appendChild(close)
    root.appendChild(ai.el)
    root.dataset.ai = 'open'
    if (problem) ai.showProblem(problem)
    return ai
  }

  function closeAi() {
    if (ai === null) return
    const node = ai.el
    ai.destroy()
    ai = null
    node.remove()
    delete root.dataset.ai
  }

  /* --------------------------------------------------------------- statement */

  function renderStatement(target) {
    clear(target)
    if (!problem) return
    const paras = String(problem.description || '').split(/\n{2,}/).filter((text) => text.trim() !== '')
    for (const paragraph of paras) {
      if (/^\s*<[a-z]/i.test(paragraph)) target.appendChild(h('div', { class: 'lc-para', html: paragraph }))
      else for (const sentence of paragraph.split('\n')) if (sentence.trim() !== '') target.appendChild(h('p', { class: 'lc-para' }, sentence))
    }

    if ((problem.examples || []).length > 0) {
      target.appendChild(h('h3', { class: 'lc-h3' }, 'Examples'))
      for (const example of problem.examples) {
        target.appendChild(
          h('div', { class: 'lc-example' },
            h('div', { class: 'lc-example-head' }, 'Example ' + example.n),
            example.input ? ioRow('Input', example.input) : null,
            example.output ? ioRow('Output', example.output) : null,
            example.explain ? h('p', { class: 'lc-example-explain' }, example.explain) : null,
          ),
        )
      }
    }

    if ((problem.constraints || []).length > 0) {
      target.appendChild(h('h3', { class: 'lc-h3' }, 'Constraints'))
      target.appendChild(h('ul', { class: 'lc-constraints' }, problem.constraints.map((item) => h('li', null, h('code', null, String(item))))))
    }

    if ((problem.hints || []).length > 0) {
      target.appendChild(
        h('details', { class: 'lc-details' },
          h('summary', null, 'Hints (' + problem.hints.length + ')'),
          h('ol', { class: 'lc-hints' }, problem.hints.map((hintText) => h('li', null, String(hintText)))),
        ),
      )
    }

    if (problem.solution && String(problem.solution).trim() !== '') {
      target.appendChild(
        h('details', { class: 'lc-details' },
          h('summary', null, 'Editorial'),
          h('div', { class: 'lc-prose', html: renderMarkdown(problem.solution) }),
        ),
      )
    }

    // Per-problem notes: saved to the shared progress record (both surfaces).
    const saved = store.get(problem.slug)
    const noteArea = h('textarea', {
      class: 'lc-note-area',
      rows: '3',
      placeholder: 'Your notes for this problem — trap you hit, the one line to remember…',
      'aria-label': 'Notes for ' + problem.title,
    }, saved && saved.note ? String(saved.note) : '')
    let noteTimer = null
    noteArea.addEventListener('input', () => {
      clearTimeout(noteTimer)
      noteTimer = setTimeout(() => store.touch(problem.slug, { note: noteArea.value }), 500)
    })
    target.appendChild(
      h('details', { class: 'lc-details', open: saved && saved.note ? true : false },
        h('summary', null, 'My notes'),
        noteArea,
      ),
    )

    target.appendChild(
      h('div', { class: 'lc-links' },
        h('a', { class: 'lc-link', href: 'https://leetcode.com/problems/' + problem.slug + '/', target: '_blank', rel: 'noreferrer' }, icon(icons.external, 13), 'Open on LeetCode'),
      ),
    )
  }

  function ioRow(label, value) {
    return h('div', { class: 'lc-io' }, h('span', null, label), h('code', null, String(value)))
  }

  function renderHeader() {
    if (!problem) return
    titleEl.textContent = problem.title
    crumb.textContent = '#' + problem.id
    clear(chips)
    chips.appendChild(h('span', { class: 'lc-chip ' + problem.difficulty.toLowerCase() }, problem.difficulty))
    chips.appendChild(h('span', { class: 'lc-chip pattern' }, problem.pattern))
    const status = store.status(problem.slug)
    chips.appendChild(h('span', { class: 'lc-chip status-' + status }, status === 'solved' ? 'solved' : status === 'attempted' ? 'attempted' : 'new'))
    if (problem.premium) chips.appendChild(h('span', { class: 'lc-chip pro' }, 'Premium'))
    if ((problem.topics || []).length > 0) chips.appendChild(h('span', { class: 'lc-chip muted' }, problem.topics.slice(0, 4).join(' · ')))
  }

  /* ------------------------------------------------------------------ judge */

  function renderResult(payload) {
    clear(resultBox)
    resultBox.dataset.state = payload.ok ? 'ok' : 'bad'
    if (payload.error && !payload.cases) {
      resultBox.appendChild(h('div', { class: 'lc-verdict-row' }, h('span', { class: 'lc-verdict bad' }, payload.error)))
      if (payload.compile && payload.compile.stderr) resultBox.appendChild(h('pre', { class: 'lc-pre' }, payload.compile.stderr))
      return
    }
    const verdict = payload.ok ? 'Accepted' : payload.passed > 0 ? 'Wrong answer' : 'Not passing'
    resultBox.appendChild(
      h('div', { class: 'lc-verdict-row' },
        h('span', { class: 'lc-verdict ' + (payload.ok ? 'ok' : 'bad') }, verdict),
        h('span', { class: 'lc-meta' }, (payload.passed || 0) + '/' + (payload.total || 0) + ' tests'),
        payload.compile && payload.compile.ok ? h('span', { class: 'lc-meta' }, 'compile ' + payload.compile.ms + 'ms') : null,
        typeof payload.ms === 'number' ? h('span', { class: 'lc-meta' }, 'run ' + payload.ms + 'ms') : null,
      ),
    )
    if (payload.compile && payload.compile.stderr) resultBox.appendChild(h('pre', { class: 'lc-pre' }, payload.compile.stderr))
    for (const testCase of payload.cases || []) {
      resultBox.appendChild(
        h('div', { class: 'lc-case ' + (testCase.ok ? 'ok' : 'bad') },
          h('div', { class: 'lc-case-head' },
            h('span', { class: 'lc-case-n' }, 'Test ' + testCase.n),
            h('span', { class: 'lc-case-state' }, testCase.ok ? 'passed' : testCase.error ? 'error' : 'failed'),
          ),
          h('div', { class: 'lc-case-io' }, h('span', null, 'in'), h('code', null, (testCase.args || []).join(', '))),
          h('div', { class: 'lc-case-io' }, h('span', null, 'exp'), h('code', null, testCase.expected)),
          testCase.ok ? null : h('div', { class: 'lc-case-io' }, h('span', null, 'got'), h('code', null, testCase.error ? testCase.error : testCase.got)),
        ),
      )
    }
  }

  async function run(mode) {
    if (!problem || running) return
    if (!problem.judge) {
      clear(resultBox)
      resultBox.dataset.state = 'bad'
      resultBox.appendChild(
        h('div', { class: 'lc-verdict-row' },
          h('span', { class: 'lc-verdict bad' }, 'No deterministic judge'),
          h('button', {
            type: 'button',
            class: 'lc-btn',
            onClick: () => {
              ensureAi()
              if (ai) ai.runAction('review')
            },
          }, 'Ask the tutor to review'),
        ),
      )
      resultBox.appendChild(h('p', { class: 'lc-hint' }, 'Design, SQL and interactive problems are graded by the tutor instead. Check them against the examples first.'))
      return
    }
    ensureEditor()
    running = true
    statusChip.textContent = 'running…'
    statusChip.dataset.state = 'busy'
    runButton.disabled = true
    submitButton.disabled = true
    clear(resultBox)
    resultBox.appendChild(h('div', { class: 'lc-running' }, h('span', { class: 'lc-spin' }), h('span', null, 'Compiling and running locally…')))
    const code = editor.getValue()
    store.saveCode(problem.slug, lang, code)
    try {
      const payload = await api.judge({ lang, slug: problem.slug, code })
      renderResult(payload)
      if (payload.ok) {
        statusChip.textContent = 'accepted'
        statusChip.dataset.state = 'ok'
        store.recordSolved(problem.slug, { ms: payload.ms, lang })
        if (typeof options.onProgress === 'function') options.onProgress()
      } else {
        statusChip.textContent = payload.error ? 'error' : 'wrong answer'
        statusChip.dataset.state = 'bad'
        store.recordAttempt(problem.slug)
        if (typeof options.onProgress === 'function') options.onProgress()
      }
      renderHeader()
    } catch (error) {
      renderResult({ ok: false, error: String((error && error.message) || error) })
      statusChip.textContent = 'network error'
      statusChip.dataset.state = 'bad'
    } finally {
      running = false
      runButton.disabled = false
      submitButton.disabled = false
    }
  }

  runButton.addEventListener('click', () => run('run'))
  submitButton.addEventListener('click', () => run('submit'))
  traceButton.addEventListener('click', () => traceRun())

  async function traceRun() {
    if (!problem || running) return
    if (!problem.judge) {
      clear(resultBox)
      resultBox.dataset.state = 'bad'
      resultBox.appendChild(h('div', { class: 'lc-verdict-row' }, h('span', { class: 'lc-verdict bad' }, 'Nothing to trace — this problem has no deterministic judge')))
      return
    }
    ensureEditor()
    running = true
    statusChip.textContent = 'tracing…'
    statusChip.dataset.state = 'busy'
    runButton.disabled = true
    traceButton.disabled = true
    submitButton.disabled = true
    try {
      const code = editor.getValue()
      store.saveCode(problem.slug, lang, code)
      const payload = await api.trace({ lang, slug: problem.slug, code })
      if (payload.ok && Array.isArray(payload.events) && payload.events.length > 0) {
        statusChip.textContent = 'traced ' + payload.events.length + ' iters'
        statusChip.dataset.state = 'ok'
        clear(resultBox)
        resultBox.dataset.state = 'ok'
        resultBox.appendChild(
          h('div', { class: 'lc-verdict-row' },
            h('span', { class: 'lc-verdict ok' }, 'Traced ' + payload.events.length + ' iteration' + (payload.events.length === 1 ? '' : 's') + (payload.capped ? ' (capped)' : '')),
            h('button', {
              type: 'button',
              class: 'lc-btn lc-btn-primary',
              onClick: async () => {
                setTab('walkthrough')
                ensureWalkthrough()
                if (walkthrough) await walkthrough.showTrace(payload.events, { capped: payload.capped, result: payload.result })
              },
            }, 'Watch my run'),
          ),
        )
        if (payload.result) resultBox.appendChild(h('p', { class: 'lc-hint' }, 'First test returned: ' + payload.result))
        // Jump straight there — the point is watching your own execution diverge.
        setTab('walkthrough')
        ensureWalkthrough()
        if (walkthrough) await walkthrough.showTrace(payload.events, { capped: payload.capped, result: payload.result })
      } else {
        statusChip.textContent = 'trace unavailable'
        statusChip.dataset.state = 'bad'
        clear(resultBox)
        resultBox.dataset.state = 'bad'
        resultBox.appendChild(h('div', { class: 'lc-verdict-row' }, h('span', { class: 'lc-verdict bad' }, 'Trace unavailable')))
        resultBox.appendChild(h('p', { class: 'lc-hint' }, String((payload && payload.error) || 'unknown reason') + ' The reference walkthrough still plays in the Walkthrough tab.'))
      }
    } catch (error) {
      statusChip.textContent = 'trace error'
      statusChip.dataset.state = 'bad'
      clear(resultBox)
      resultBox.appendChild(h('div', { class: 'lc-verdict-row' }, h('span', { class: 'lc-verdict bad' }, String((error && error.message) || error))))
    } finally {
      running = false
      runButton.disabled = false
      traceButton.disabled = false
      submitButton.disabled = false
    }
  }
  langSelect.addEventListener('change', () => {
    lang = langSelect.value === 'cpp' ? 'cpp' : 'java'
    store.setSetting('lang', lang)
    if (editor) editor.setLang(lang, problem)
    if (walkthrough) walkthrough.setLanguage(lang)
    if (variations) variations.setLanguage(lang)
  })

  for (const panel of root.querySelectorAll('.lc-tabpanel')) panel.dataset.active = String(panel.dataset.panel === activeTab)
  setDrawer(false)

  return {
    el: root,
    showProblem(nextProblem, opts = {}) {
      problem = nextProblem
      walkArgs = Array.isArray(opts.args) ? opts.args : null
      walkFrame = Number.isFinite(opts.frame) ? opts.frame : null
      renderHeader()
      renderStatement(drawerBody)
      renderStatement(solveStatement)
      langSelect.value = lang
      statusChip.textContent = 'ready'
      statusChip.dataset.state = ''
      clear(resultBox)
      setTab(activeTab)
      if (walkthrough) walkthrough.showProblem(problem, { args: walkArgs, frame: walkFrame })
      if (editor) editor.setProblem(problem)
      if (variations) variations.showProblem(problem)
      if (ai) ai.showProblem(problem)
    },
    setTab,
    toggleStatement: () => setDrawer(!drawerOpen),
    statementOpen: () => drawerOpen,
    focusEditor() {
      setTab('solve')
      if (editor) editor.focus()
    },
    run,
    destroy() {
      clearTimeout(saveTimer)
      if (editor) editor.destroy()
      if (walkthrough) walkthrough.destroy()
      if (variations) variations.destroy()
      if (ai) ai.destroy()
      root.remove()
    },
  }
}
