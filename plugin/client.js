/**
 * LeetCode Lab — client half.
 *
 * Registers a full-screen page in the main column (`main` keyed slot) and its sidebar
 * button (`sidebar.panellist`, same id, so the sidebar owns the button and the shell
 * dispatches the matching main panel). The page mounts the same web app the host serves
 * at /leetcode-lab/, so the in-app page and the standalone browser URL never diverge.
 */
window.__ModuleLoader__.load({
  id: '@local/leetcode-lab',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useRef, useState } = React

    const PANEL_ID = 'leetcode-lab'
    const APP_ENTRY = '/leetcode-lab/app.js'

    const EN = {
      panel: 'LeetCode Lab',
      title: 'LeetCode Lab',
      loading: 'Starting the lab…',
      failed: 'The lab could not start.',
      retry: 'Retry',
      open: 'Open in browser',
      openHint: 'Same app in a normal browser tab',
    }

    const STYLE = `
.lc-host{display:flex;width:100%;height:100%;min-height:0;position:relative;background:#0b1020;color:#e8eefc;font-size:14px}
.lc-mount{flex:1;min-width:0;min-height:0;position:relative;overflow:hidden}
.lc-fallback{display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center;width:100%;height:100%;padding:32px;text-align:center;background:radial-gradient(900px 600px at 50% 0%,#16264a 0%,#0b1020 60%)}
.lc-fallback h2{margin:0;font-size:18px;font-weight:600}
.lc-fallback p{margin:0;max-width:560px;color:#93a4c4;font-size:13px;line-height:1.6}
.lc-fallback pre{max-width:min(720px,100%);margin:0;padding:12px 14px;border:1px solid #22314f;border-radius:10px;background:#070c18;color:#8affc1;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;text-align:left;overflow:auto;max-height:180px}
.lc-retry{height:32px;padding:0 18px;border:0;border-radius:16px;background:#1f8cff;color:#fff;font:inherit;font-size:13px;cursor:pointer}
.lc-retry:hover{filter:brightness(1.08)}
.lc-open{position:absolute;top:10px;right:12px;z-index:5;display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:13px;border:1px solid rgba(94,231,255,.35);background:rgba(10,20,38,.72);color:#bfe9ff;font:inherit;font-size:11.5px;text-decoration:none;backdrop-filter:blur(6px)}
.lc-open:hover{border-color:rgba(94,231,255,.7);color:#fff}
@media (prefers-reduced-motion:no-preference){.lc-boot-dot{animation:lcPulse 1.4s ease-in-out infinite}}
@keyframes lcPulse{0%,100%{opacity:.35}50%{opacity:1}}
`

    function insertStyle() {
      if (typeof document === 'undefined') return () => {}
      const selector = 'style[data-plugin-css="@local/leetcode-lab/panel.css"]'
      if (document.querySelector(selector) !== null) return () => {}
      const element = document.createElement('style')
      element.dataset.plugin = '@local/leetcode-lab'
      element.dataset.pluginCss = '@local/leetcode-lab/panel.css'
      element.textContent = STYLE
      document.head.appendChild(element)
      return () => element.remove()
    }

    function LabPage() {
      const mountRef = useRef(null)
      const [failure, setFailure] = useState(null)
      const [attempt, setAttempt] = useState(0)

      useEffect(() => {
        const element = mountRef.current
        if (element === null) return undefined
        let disposed = false
        let disposeApp = null

        element.dataset.state = 'loading'
        element.innerHTML = ''
        // A fresh token per mount: the browser's ES-module map is keyed by URL, so a
        // stable query would pin the first version of the app forever.
        const token = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

        import(/* @vite-ignore */ APP_ENTRY + '?b=' + token + '&r=' + attempt)
          .then((module) => {
            if (disposed) return
            if (typeof module.mount !== 'function') throw new Error('app.js has no mount() export')
            disposeApp = module.mount(element)
            setFailure(null)
          })
          .catch((error) => {
            if (disposed) return
            setFailure(String((error && error.message) || error))
          })

        return () => {
          disposed = true
          try {
            if (typeof disposeApp === 'function') disposeApp()
          } catch {
            /* ignore */
          }
          element.innerHTML = ''
        }
      }, [attempt])

      if (failure !== null) {
        return h(
          'div',
          { className: 'lc-host' },
          h(
            'div',
            { className: 'lc-fallback' },
            h('h2', null, EN.failed),
            h('p', null, 'The page shell loaded but the lab app module did not. The host route /leetcode-lab/ is usually the cause.'),
            h('pre', null, failure),
            h('button', { type: 'button', className: 'lc-retry', onClick: () => setAttempt((value) => value + 1) }, EN.retry),
            h('a', { className: 'lc-open', href: '/leetcode-lab/', target: '_blank', rel: 'noreferrer' }, EN.open),
          ),
        )
      }

      return h(
        'div',
        { className: 'lc-host' },
        h('div', { className: 'lc-mount', ref: mountRef }),
      )
    }

    /** Sidebar glyph: stacked 3D bars rising out of a grid — "grind + see it". */
    function LabIcon(props) {
      const size = typeof props.size === 'number' ? props.size : 18
      const active = props.active === true
      const accent = active ? 'currentColor' : '#5ee7ff'
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, style: { display: 'block' } },
        h('path', { d: 'M3 20.5h18', stroke: 'currentColor', strokeWidth: 1.2, strokeOpacity: 0.45, strokeLinecap: 'round' }),
        h('path', { d: 'M4.5 17.5 L8 16 L8 19.5 L4.5 21 Z', fill: '#1f8cff' }),
        h('path', { d: 'M8 16 L11.5 17.5 L11.5 21 L8 19.5 Z', fill: '#0e5fbf' }),
        h('path', { d: 'M4.5 17.5 L8 16 L11.5 17.5 L8 19 Z', fill: '#a8f0ff' }),
        h('path', { d: 'M9.5 10.5 L13 9 L13 13.5 L9.5 15 Z', fill: '#12b981' }),
        h('path', { d: 'M13 9 L16.5 10.5 L16.5 15 L13 13.5 Z', fill: '#0b8a63' }),
        h('path', { d: 'M9.5 10.5 L13 9 L16.5 10.5 L13 12 Z', fill: '#c9ffe8' }),
        h('path', { d: 'M14.5 4.5 L17.5 3 L17.5 6 L14.5 7.5 Z', fill: accent }),
        h('path', { d: 'M17.5 3 L20.5 4.5 L20.5 7.5 L17.5 6 Z', fill: '#f97316' }),
        h('path', { d: 'M14.5 4.5 L17.5 3 L20.5 4.5 L17.5 6 Z', fill: '#ffe9b3' }),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        let locale
        try {
          locale = ctx.get('locale')
        } catch {
          locale = undefined
        }

        if (locale && typeof locale.register === 'function') {
          try {
            ctx.effect(() => locale.register('leetcodeLab', 'en', EN), 'leetcode-lab: locale')
          } catch {
            /* bundled strings below still work */
          }
        }

        const translate = (key) => {
          if (locale && typeof locale.bind === 'function') {
            try {
              const bound = locale.bind('leetcodeLab')
              if (typeof bound === 'function') {
                const text = bound(key)
                if (typeof text === 'string' && text !== key) return text
              }
            } catch {
              /* ignore */
            }
          }
          return typeof EN[key] === 'string' ? EN[key] : key
        }

        ctx.effect(() => insertStyle(), 'leetcode-lab: styles')

        ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key: PANEL_ID, locale: 'leetcodeLab' }, LabPage),
        )

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 30,
              label: () => translate('panel'),
              locale: 'leetcodeLab',
            },
            LabIcon,
          ),
        )
      },
    }
  },
})
