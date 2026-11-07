/**
 * App shell: header with live progress, the problem catalogue on the left, and either the
 * ladder home screen or the selected problem's workspace on the right.
 */
import { h, clear, icon, icons } from './dom.js'
import { api } from './api.js'
import { store } from './store.js'
import { createCatalog } from './catalog.js'
import { createProblemView } from './problem.js'

const LADDER = ['Easy', 'Medium', 'Hard']

function logo() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 40 40')
  svg.setAttribute('width', '32')
  svg.setAttribute('height', '32')
  svg.setAttribute('aria-hidden', 'true')
  svg.innerHTML =
    '<defs><linearGradient id="lc-lab-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#132444"/><stop offset="1" stop-color="#0a1220"/></linearGradient></defs>' +
    '<rect x="1" y="1" width="38" height="38" rx="10" fill="url(#lc-lab-bg)" stroke="#2b4a78"/>' +
    '<g><path d="M8 28l7-3v7l-7 3z" fill="#1f8cff"/><path d="M15 25l7 3v7l-7-3z" fill="#0e5fbf"/><path d="M8 28l7-3 7 3-7 3z" fill="#a8f0ff"/></g>' +
    '<g><path d="M18 18l6-2.5v6l-6 2.5z" fill="#12b981"/><path d="M24 15.5l6 2.5v6l-6-2.5z" fill="#0b8a63"/><path d="M18 18l6-2.5 6 2.5-6 2.5z" fill="#c9ffe8"/></g>' +
    '<g><path d="M25 9l4-1.5v4l-4 1.5z" fill="#ffc65c"/><path d="M29 7.5l4 1.5v4l-4-1.5z" fill="#f97316"/><path d="M25 9l4-1.5 4 1.5-4 1.5z" fill="#ffe9b3"/></g>'
  return svg
}

export function createShell(root) {
  let problems = []
  let patterns = []
  let selected = null
  let shards = new Map()
  let problemView = null
  let homeEl = null
  let destroyed = false

  const brand = h('button', {
    class: 'lc-brand',
    type: 'button',
    title: 'Back to the ladder',
    onClick: () => showHome(true),
  },
    logo(),
    h('div', { class: 'lc-brand-text' },
      h('span', { class: 'lc-brand-name' }, 'LeetCode Lab'),
      h('span', { class: 'lc-brand-sub' }, 'grind · see · understand'),
    ),
  )

  const progressLabel = h('span', { class: 'lc-progress-label' }, 'loading…')
  const progressBarFill = h('span', { class: 'lc-progress-fill' })
  const progressPills = h('div', { class: 'lc-progress-pills' })
  const progress = h('div', { class: 'lc-progress' },
    h('div', { class: 'lc-progress-top' }, progressLabel),
    h('div', { class: 'lc-progress-track' }, progressBarFill),
    progressPills,
  )

  const THEME_ORDER = ['light', 'dark', 'system']
  const THEME_META = {
    light: { icon: icons.sun, label: 'Light', hint: 'Light theme — click for Dark' },
    dark: { icon: icons.moon, label: 'Dark', hint: 'Dark theme — click for System' },
    system: { icon: icons.monitor, label: 'Auto', hint: 'Follows the OS theme — click for Light' },
  }
  const themeButton = h('button', { class: 'lc-iconbtn lc-themebtn', type: 'button', title: 'Theme' })
  function paintThemeButton() {
    const current = (store.settings && store.settings.theme) || 'system'
    const meta = THEME_META[current] || THEME_META.system
    clear(themeButton)
    themeButton.appendChild(icon(meta.icon, 15))
    themeButton.appendChild(h('span', { class: 'lc-themebtn-label' }, meta.label))
    themeButton.title = meta.hint
    themeButton.setAttribute('aria-label', 'Theme: ' + meta.label + '. ' + meta.hint)
  }
  themeButton.addEventListener('click', () => {
    const current = (store.settings && store.settings.theme) || 'system'
    const next = THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length]
    store.setTheme(next)
    paintThemeButton()
  })
  paintThemeButton()

  const header = h('header', { class: 'lc-top' },
    brand,
    progress,
    h('div', { class: 'lc-top-right' },
      themeButton,
      h('button', { class: 'lc-iconbtn', type: 'button', title: 'Keyboard shortcuts', onClick: showShortcuts }, '?'),
      h('a', { class: 'lc-openlink', href: '/leetcode-lab/', target: '_blank', rel: 'noreferrer', title: 'Open the same app in a browser tab' }, icon(icons.external, 14), h('span', null, 'Browser')),
    ),
  )

  const catalogHost = h('aside', { class: 'lc-side' })
  const detailHost = h('main', { class: 'lc-detail' })
  const shellEl = h('div', { class: 'lc-shell' }, header, h('div', { class: 'lc-main' }, catalogHost, detailHost))
  const toastHost = h('div', { class: 'lc-toasts' })
  root.appendChild(shellEl)
  root.appendChild(toastHost)

  const catalog = createCatalog({ onSelect: (slug) => selectProblem(slug, { push: true }) })
  catalogHost.appendChild(catalog.el)

  function toast(message, kind = 'info') {
    const element = h('div', { class: 'lc-toast ' + kind }, message)
    toastHost.appendChild(element)
    setTimeout(() => element.classList.add('out'), 2600)
    setTimeout(() => element.remove(), 3200)
  }

  function showShortcuts() {
    toast('1/2/3 — Walkthrough · Solve · Variations · s — statement · j/k — next/previous · / — search · Ctrl+Enter — run', 'info')
  }

  function updateProgress() {
    const stats = store.stats(problems)
    const total = problems.length || 1
    progressLabel.textContent = stats.solved + ' solved of ' + problems.length
    progressBarFill.style.width = Math.min(100, (stats.solved / total) * 100) + '%'
    clear(progressPills)
    progressPills.appendChild(h('span', { class: 'lc-pill easy' }, 'E ' + stats.easy))
    progressPills.appendChild(h('span', { class: 'lc-pill medium' }, 'M ' + stats.medium))
    progressPills.appendChild(h('span', { class: 'lc-pill hard' }, 'H ' + stats.hard))
    const attempted = Object.values(store.stats(problems).byPattern || {})
    void attempted
  }

  function firstUnsolved(difficulty) {
    return problems.find((problem) => problem.difficulty === difficulty && store.status(problem.slug) !== 'solved') || null
  }

  function renderHome() {
    const stats = store.stats(problems)
    const due = store.due(problems, 6)
    clear(detailHost)

    const ladder = h('div', { class: 'lc-ladder' })
    for (const difficulty of LADDER) {
      const bucket = problems.filter((problem) => problem.difficulty === difficulty)
      const solved = bucket.filter((problem) => store.status(problem.slug) === 'solved').length
      const next = firstUnsolved(difficulty)
      const percent = bucket.length === 0 ? 0 : Math.round((solved / bucket.length) * 100)
      ladder.appendChild(
        h('button', {
          type: 'button',
          class: 'lc-step ' + difficulty.toLowerCase(),
          onClick: () => {
            if (next) selectProblem(next.slug, { push: true })
            else toast('Every ' + difficulty + ' problem is solved. Go up a level.', 'ok')
          },
        },
          h('span', { class: 'lc-step-letter' }, difficulty[0]),
          h('span', { class: 'lc-step-body' },
            h('span', { class: 'lc-step-title' }, difficulty),
            h('span', { class: 'lc-step-sub' }, solved + ' / ' + bucket.length + ' solved'),
            h('span', { class: 'lc-step-track' }, h('span', { class: 'lc-step-fill', style: { width: percent + '%' } })),
            h('span', { class: 'lc-step-next' }, next ? 'Continue: ' + next.title : 'All clear'),
          ),
        ),
      )
    }

    const patternGrid = h('div', { class: 'lc-patterns' })
    for (const pattern of patterns.slice(0, 24)) {
      const bucket = problems.filter((problem) => problem.pattern === pattern.id)
      if (bucket.length === 0) continue
      const solved = bucket.filter((problem) => store.status(problem.slug) === 'solved').length
      const percent = Math.round((solved / bucket.length) * 100)
      patternGrid.appendChild(
        h('button', {
          type: 'button',
          class: 'lc-pattern',
          title: 'Filter the library to this pattern',
          onClick: () => {
            catalog.setPattern(pattern.id)
            toast('Showing ' + bucket.length + ' ' + (pattern.label || pattern.id) + ' problems — click one to start', 'info')
          },
        },
          h('span', { class: 'lc-pattern-dot', style: { background: pattern.color || '#5ee7ff' } }),
          h('span', { class: 'lc-pattern-name' }, pattern.label || pattern.id),
          h('span', { class: 'lc-pattern-count' }, solved + '/' + bucket.length),
          h('span', { class: 'lc-pattern-track' }, h('span', { class: 'lc-pattern-fill', style: { width: percent + '%', background: pattern.color || '#5ee7ff' } })),
        ),
      )
    }

    detailHost.appendChild(
      h('div', { class: 'lc-home' },
        h('section', { class: 'lc-hero' },
          h('p', { class: 'lc-hero-kicker' }, 'Personal LeetCode workspace'),
          h('h1', { class: 'lc-hero-title' }, 'Pick your next problem.'),
          h('p', { class: 'lc-hero-sub' },
            problems.length.toLocaleString() + ' problems on a strict Easy → Medium → Hard ladder. Solve it, watch each line execute, or let the tutor animate exactly what you are missing.'),
          h('div', { class: 'lc-hero-actions' },
            h('button', {
              type: 'button',
              class: 'lc-primary',
              onClick: () => {
                const next = firstUnsolved('Easy') || firstUnsolved('Medium') || firstUnsolved('Hard') || problems[0]
                if (next) selectProblem(next.slug, { push: true })
              },
            }, icon(icons.flame, 16), h('span', null, stats.solved === 0 ? 'Start with Easy #1' : 'Continue grinding')),
            h('button', { type: 'button', class: 'lc-ghost', onClick: () => catalog.focusSearch() }, icon(icons.search, 15), h('span', null, 'Jump to a problem')),
          ),
        ),
        due.length > 0
          ? h('section', { class: 'lc-block' },
              h('div', { class: 'lc-block-head' }, h('h2', null, 'Due for review'), h('span', { class: 'lc-dim' }, 'spaced repetition')),
              h('div', { class: 'lc-due' }, due.map((problem) => h('button', { type: 'button', class: 'lc-due-item', onClick: () => selectProblem(problem.slug, { push: true }) },
                h('span', { class: 'lc-due-dot ' + problem.difficulty.toLowerCase() }),
                problem.title,
              ))),
            )
          : null,
        h('section', { class: 'lc-block' },
          h('div', { class: 'lc-block-head' }, h('h2', null, 'The ladder'), h('span', { class: 'lc-dim' }, 'one step at a time')),
          ladder,
        ),
        h('section', { class: 'lc-block' },
          h('div', { class: 'lc-block-head' }, h('h2', null, 'Pattern mastery'), h('span', { class: 'lc-dim' }, 'where you are strong, where you are not')),
          patternGrid,
        ),
        h('footer', { class: 'lc-home-foot' },
          h('span', null, 'Java + C++ judged locally · step-by-step 2D visuals · AI tutor on demand'),
          h('button', { type: 'button', class: 'lc-ghost lc-tiny', onClick: () => { store.reset(); updateProgress(); renderHome(); toast('Progress cleared', 'ok') } }, 'Reset progress'),
        ),
      ),
    )
  }

  async function loadProblemRecord(slug) {
    const entry = problems.find((problem) => problem.slug === slug)
    if (!entry) return null
    if (!shards.has(entry.shard)) {
      const payload = await api.shard(entry.shard)
      if (payload && Array.isArray(payload.problems)) shards.set(entry.shard, payload.problems)
    }
    const list = shards.get(entry.shard) || []
    return list.find((problem) => problem.slug === slug) || null
  }

  /** Shareable walkthrough input: `#/p/<slug>?in=<base64url(JSON args)>`. */
  function parseHash() {
    const match = /^#\/p\/([^?]+)(\?(.*))?$/.exec(location.hash)
    if (!match) return null
    let args = null
    let step = null
    const query = match[3] || ''
    const found = /(?:^|&)in=([^&]+)/.exec(query)
    if (found) {
      try {
        const b64 = found[1].replace(/-/g, '+').replace(/_/g, '/')
        args = JSON.parse(decodeURIComponent(escape(atob(b64))))
        if (!Array.isArray(args)) args = null
      } catch {
        args = null
      }
    }
    const stepMatch = /(?:^|&)step=(\d+)/.exec(query)
    if (stepMatch) {
      const n = Number(stepMatch[1])
      if (Number.isFinite(n) && n >= 0) step = Math.min(39, Math.floor(n))
    }
    return { slug: decodeURIComponent(match[1]), args, step }
  }

  function hashFor(slug, args) {
    let out = '#/p/' + slug
    if (Array.isArray(args) && args.length > 0) {
      try {
        const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(args)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        out += '?in=' + b64
      } catch {
        /* unshareable input — plain hash */
      }
    }
    return out
  }

  async function selectProblem(slug, options = {}) {
    if (problemView !== null) {
      problemView.destroy()
      problemView = null
    }
    clear(detailHost)
    detailHost.appendChild(h('div', { class: 'lc-loading' }, h('span', { class: 'lcv-spin' }), h('span', null, 'Loading problem…')))
    const problem = await loadProblemRecord(slug)
    if (destroyed) return
    if (problem === null) {
      detailHost.appendChild(h('div', { class: 'lc-loading' }, 'Could not load that problem.'))
      return
    }
    selected = problem
    clear(detailHost)
    problemView = createProblemView({
      onPrev: () => catalog.selectRelative(-1),
      onNext: () => catalog.selectRelative(1),
      onProgress: () => {
        updateProgress()
        catalog.refresh()
      },
    })
    detailHost.appendChild(problemView.el)
    problemView.showProblem(problem, { args: options.args || null, frame: options.frame ?? null })
    catalog.select(slug)
    const want = hashFor(slug, options.args || null)
    if (options.push && location.hash !== want) history.pushState(null, '', want)
  }

  function showHome(push = false) {
    if (selected !== null) {
      selected = null
      if (problemView !== null) {
        problemView.destroy()
        problemView = null
      }
      clear(detailHost)
      renderHome()
    }
    if (push && location.hash !== '#/') history.pushState(null, '', '#/')
  }

  document.addEventListener('keydown', onKey)
  function onKey(event) {
    const tag = (event.target && event.target.tagName) || ''
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      if (event.key === 'Escape' && event.target.blur) event.target.blur()
      return
    }
    if (event.key === '/') {
      event.preventDefault()
      catalog.focusSearch()
      return
    }
    if (event.key === 'j') {
      event.preventDefault()
      catalog.selectRelative(1)
      return
    }
    if (event.key === 'k') {
      event.preventDefault()
      catalog.selectRelative(-1)
      return
    }
    if (event.key === '1' && problemView) problemView.setTab('walkthrough')
    if (event.key === '2' && problemView) problemView.setTab('solve')
    if (event.key === '3' && problemView) problemView.setTab('variations')
    if (event.key === 's' && problemView) problemView.toggleStatement()
    if (event.key === 'Escape') {
      if (problemView && problemView.statementOpen()) problemView.toggleStatement()
      else showHome(true)
    }
  }

  const unsubscribe = store.onChange(() => {
    updateProgress()
    paintThemeButton()
  })

  async function boot() {
    updateProgress()
    await store.hydrate().catch(() => {})
    updateProgress()
    try {
      const [index, health] = await Promise.all([api.index(), api.health()])
      problems = Array.isArray(index.problems) ? index.problems : []
      patterns = Array.isArray(index.patterns) ? index.patterns : []
      catalog.setProblems(problems, patterns)
      updateProgress()
      renderHome()
      if (problems.length === 0) {
        toast('No problems indexed yet — the dataset is still building.', 'bad')
        return
      }
      const parsed = parseHash()
      if (parsed) await selectProblem(parsed.slug, { args: parsed.args, frame: parsed.step })
      // Session-only ?panel= override (screenshot/deep-link use; never persisted).
      try {
        const forced = new URLSearchParams(window.location.search).get('panel')
        if ((forced === 'walkthrough' || forced === 'solve' || forced === 'variations') && problemView) {
          problemView.setTab(forced)
        }
      } catch {
        /* location may be unavailable */
      }
      if (health && health.judge && health.judge.java === false && health.judge.cpp === false) {
        toast('No Java or C++ compiler found on this machine — judging is disabled.', 'bad')
      }
    } catch (error) {
      detailHost.appendChild(h('div', { class: 'lc-loading' }, 'Could not reach the lab host: ' + String((error && error.message) || error)))
    }
  }

  boot()

  window.addEventListener('popstate', () => {
    const parsed = parseHash()
    if (parsed) selectProblem(parsed.slug, { args: parsed.args, frame: parsed.step })
    else showHome()
  })

  return {
    destroy() {
      destroyed = true
      document.removeEventListener('keydown', onKey)
      unsubscribe()
      if (problemView !== null) problemView.destroy()
      root.innerHTML = ''
    },
  }
}

