/**
 * LeetCode Lab — app entry.
 *
 * The same module is used by the standalone page (`/leetcode-lab/`) and by the in-app
 * Harness panel, so the two surfaces can never drift apart. Styles are loaded here rather
 * than in index.html for that reason; every selector is scoped under `.lc-app`.
 */
import { createShell } from './ui/shell.js'
import { store } from './ui/store.js'

const STYLESHEET = '/leetcode-lab/styles.css'

/** Derive a build token from this module's own URL so a remount refetches its stylesheet. */
function buildToken() {
  try {
    return new URL(import.meta.url).searchParams.get('b') || String(Date.now())
  } catch {
    return String(Date.now())
  }
}

function ensureStyles() {
  const existing = document.querySelector('link[data-leetcode-lab="styles"]')
  if (existing !== null) existing.remove()
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = STYLESHEET + '?b=' + buildToken()
  link.dataset.leetcodeLab = 'styles'
  document.head.appendChild(link)
  return () => link.remove()
}

export function mount(el) {
  if (!el) throw new Error('mount() needs a container element')
  const removeStyles = ensureStyles()
  // Block, never flex: as a flex item the app would shrink to its content width and leave
  // a dead strip beside it inside the panel.
  el.style.display = 'block'
  el.style.height = '100%'
  el.style.width = '100%'
  el.style.minHeight = '0'
  el.style.overflow = 'hidden'

  const root = document.createElement('div')
  root.className = 'lc-app'
  // Theme before first paint: explicit ?theme= override wins (session only, so shared
  // links can force a look without rewriting the stored preference), then the no-flash
  // value, then the store.
  try {
    const forced = new URLSearchParams(window.location.search).get('theme')
    if (forced === 'light' || forced === 'dark') {
      root.dataset.theme = forced
      if (document.body) document.body.dataset.lcTheme = forced
    } else {
      const pre = document.body ? document.body.dataset.lcTheme : ''
      root.dataset.theme = pre === 'light' || pre === 'dark' ? pre : store.theme()
    }
  } catch {
    root.dataset.theme = 'dark'
  }
  el.appendChild(root)
  try {
    store.watchOsTheme()
  } catch {
    /* non-browser contexts */
  }

  const shell = createShell(root)
  return () => {
    shell.destroy()
    root.remove()
    removeStyles()
  }
}
