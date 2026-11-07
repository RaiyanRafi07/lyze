/**
 * Local progress store: per-problem status, saved solutions per language, attempts,
 * and a light spaced-repetition schedule derived from how many attempts a solve took.
 */
const KEY = 'leetcodeLab.progress.v2'
const SETTINGS_KEY = 'leetcodeLab.settings.v1'

const DEFAULT_SETTINGS = { lang: 'java', model: '', panel: 'walkthrough', autoplay: true, showEditorial: false, theme: 'system' }

/** Resolve 'light' | 'dark' from the stored preference ('system' follows the OS). */
function resolveTheme() {
  const want = settings && settings.theme ? settings.theme : 'system'
  if (want === 'light' || want === 'dark') return want
  try {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches) return 'light'
  } catch {
    /* fall through to dark */
  }
  return 'dark'
}

/** Apply the resolved theme to every mounted lab root (and the standalone body). */
function applyTheme() {
  const value = resolveTheme()
  try {
    for (const root of document.querySelectorAll('.lc-app')) root.dataset.theme = value
    if (document.body) document.body.dataset.lcTheme = value
  } catch {
    /* DOM may be unavailable in tests */
  }
  return value
}

let osListener = null
function watchOsTheme() {
  if (osListener || typeof matchMedia !== 'function') return
  try {
    osListener = matchMedia('(prefers-color-scheme: light)')
    const handler = () => {
      if ((settings && settings.theme ? settings.theme : 'system') === 'system') {
        applyTheme()
        emit()
      }
    }
    if (osListener.addEventListener) osListener.addEventListener('change', handler)
  } catch {
    /* older engines */
  }
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage can be full or blocked; the app still works in memory */
  }
}

let state = read(KEY, { items: {} })
let settings = Object.assign({}, DEFAULT_SETTINGS, read(SETTINGS_KEY, {}))
const listeners = new Set()
let pushTimer = null

const API = '/leetcode-lab/api/progress'

function emit() {
  for (const listener of listeners) {
    try {
      listener()
    } catch {
      /* a broken listener must not break the store */
    }
  }
}

/** Push the whole record to the host; debounced so typing code does not spam it. */
function schedulePush() {
  if (typeof fetch !== 'function') return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: state.items, settings }),
    }).catch(() => {})
  }, 700)
}

/** Pull the host record and union it with what this origin already has. */
async function hydrate() {
  if (typeof fetch !== 'function') return
  try {
    const response = await fetch(API)
    if (!response.ok) return
    const payload = await response.json()
    const remote = payload && payload.progress ? payload.progress : {}
    const items = { ...(state.items || {}) }
    for (const [slug, entry] of Object.entries(remote.items || {})) {
      if (!entry || typeof entry !== 'object') continue
      const existing = items[slug]
      if (!existing) {
        items[slug] = entry
        continue
      }
      const existingAt = Number(existing.updatedAt) || 0
      const incomingAt = Number(entry.updatedAt) || 0
      const code = { ...(existing.code || {}), ...(entry.code || {}) }
      items[slug] = incomingAt >= existingAt ? { ...existing, ...entry, code } : { ...entry, ...existing, code }
    }
    state = { items }
    settings = { ...DEFAULT_SETTINGS, ...(remote.settings || {}), ...settings }
    write(KEY, state)
    write(SETTINGS_KEY, settings)
    emit()
  } catch {
    /* offline is fine: the local record still works */
  }
}

export const store = {
  theme: resolveTheme,
  applyTheme,
  watchOsTheme,
  setTheme(next) {
    const value = next === 'light' || next === 'dark' ? next : 'system'
    this.setSetting('theme', value)
    applyTheme()
    return value
  },
  hydrate,
  onChange(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  get(slug) {
    return state.items[slug] || null
  },

  status(slug) {
    const entry = state.items[slug]
    return entry ? entry.status : 'todo'
  },

  touch(slug, patch) {
    const previous = state.items[slug] || { status: 'todo', attempts: 0, code: {} }
    state.items[slug] = {
      ...previous,
      ...patch,
      code: { ...(previous.code || {}), ...(patch && patch.code ? patch.code : {}) },
      updatedAt: Date.now(),
    }
    write(KEY, state)
    emit()
    schedulePush()
    return state.items[slug]
  },

  recordAttempt(slug) {
    const previous = state.items[slug] || { status: 'todo', attempts: 0, code: {} }
    const attempts = (previous.attempts || 0) + 1
    return this.touch(slug, { attempts, status: previous.status === 'solved' ? 'solved' : 'attempted', lastAttemptAt: Date.now() })
  },

  recordSolved(slug, meta = {}) {
    const previous = state.items[slug] || { attempts: 0, code: {} }
    const attempts = Math.max(previous.attempts || 0, 1)
    const intervalDays = attempts <= 1 ? 2 : attempts <= 2 ? 5 : attempts <= 4 ? 10 : 21
    return this.touch(slug, {
      status: 'solved',
      solvedAt: Date.now(),
      dueAt: Date.now() + intervalDays * 86400000,
      attempts,
      lastMs: meta.ms || null,
      lastLang: meta.lang || null,
    })
  },

  saveCode(slug, lang, code) {
    return this.touch(slug, { code: { [lang]: code } })
  },

  savedCode(slug, lang) {
    const entry = state.items[slug]
    return entry && entry.code ? entry.code[lang] || '' : ''
  },

  stats(problems) {
    const items = state.items
    const counts = { solved: 0, attempted: 0, todo: 0, easy: 0, medium: 0, hard: 0, byPattern: {} }
    const list = Array.isArray(problems) ? problems : []
    for (const problem of list) {
      const entry = items[problem.slug]
      const status = entry ? entry.status : 'todo'
      counts[status] = (counts[status] || 0) + 1
      if (status === 'solved') {
        if (problem.difficulty === 'Easy') counts.easy += 1
        if (problem.difficulty === 'Medium') counts.medium += 1
        if (problem.difficulty === 'Hard') counts.hard += 1
        const pattern = problem.pattern || 'other'
        const bucket = counts.byPattern[pattern] || { solved: 0, total: 0 }
        bucket.solved += 1
        counts.byPattern[pattern] = bucket
      }
    }
    return counts
  },

  due(problems, limit = 8) {
    const now = Date.now()
    const list = Array.isArray(problems) ? problems : []
    return list
      .filter((problem) => {
        const entry = state.items[problem.slug]
        return entry && entry.status === 'solved' && entry.dueAt && entry.dueAt <= now
      })
      .sort((a, b) => state.items[a.slug].dueAt - state.items[b.slug].dueAt)
      .slice(0, limit)
  },

  reset() {
    state = { items: {} }
    write(KEY, state)
    emit()
    if (typeof fetch === 'function') {
      fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: {}, settings, reset: true }),
      }).catch(() => {})
    }
  },

  export() {
    return JSON.stringify({ settings, items: state.items }, null, 2)
  },

  get settings() {
    return settings
  },

  setSetting(key, value) {
    settings = { ...settings, [key]: value }
    write(SETTINGS_KEY, settings)
    emit()
    schedulePush()
    return settings
  },
}

