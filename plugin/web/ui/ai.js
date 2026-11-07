/**
 * AI tutor panel: explains the concept, animates the confusion, reviews your code, and
 * generates similar practice problems. All work happens through the host's /api/ai,
 * which talks to the harness `llm` service (opencode-go by default).
 */
import { h, clear, icon, icons } from './dom.js'
import { renderMarkdown } from './markdown.js'
import { api } from './api.js'
import { store } from './store.js'

const ACTIONS = [
  { id: 'explain', label: 'Explain the idea', hint: 'Plain words, real numbers' },
  { id: 'scene', label: 'Animate my confusion', hint: 'Builds a 3D scene' },
  { id: 'review', label: 'Review my code', hint: 'Interviewer feedback' },
  { id: 'variants', label: '3 similar problems', hint: 'Keep grinding' },
]

export function createAiPanel(options = {}) {
  let problem = null
  let getCode = options.getCode || (() => '')
  let getLang = options.getLang || (() => 'java')
  let onScene = options.onScene || (() => {})
  let busy = false
  let lastVariantQuery = ''

  const statusChip = h('span', { class: 'lca-status' }, 'Checking the model…')
  const modelSelect = h('select', { class: 'lca-model', 'aria-label': 'AI model' })
  const stuck = h('textarea', {
    class: 'lca-stuck',
    rows: '2',
    placeholder: 'Optional: what exactly is confusing you? e.g. "why does the window shrink before expanding?"',
  })
  const output = h('div', { class: 'lca-output' },
    h('div', { class: 'lca-intro' },
      h('p', null, 'The tutor sees the statement, the examples and your current code.'),
      h('p', { class: 'lca-dim' }, 'Ask for an explanation, a 3D animation built for this exact problem, or a fresh set of similar ones.'),
    ),
  )
  const actionRow = h('div', { class: 'lca-actions' })

  const buttons = new Map()
  for (const action of ACTIONS) {
    const button = h('button', { type: 'button', class: 'lca-action', dataset: { action: action.id }, title: action.hint },
      h('span', { class: 'lca-action-label' }, action.label),
      action.id === 'scene' ? h('span', { class: 'lca-action-ai' }, '3D') : null,
    )
    button.addEventListener('click', () => run(action.id))
    buttons.set(action.id, button)
    actionRow.appendChild(button)
  }

  const root = h('div', { class: 'lca' },
    h('div', { class: 'lca-head' },
      h('div', null,
        h('h3', { class: 'lca-title' }, 'Tutor'),
        h('p', { class: 'lca-sub' }, 'Grounded in this problem and your code'),
      ),
      h('div', { class: 'lca-head-right' }, statusChip, modelSelect),
    ),
    stuck,
    actionRow,
    output,
  )

  async function refreshStatus() {
    try {
      const status = await api.aiStatus()
      if (!status.ok) {
        statusChip.textContent = 'model unavailable'
        statusChip.dataset.state = 'bad'
        return
      }
      statusChip.textContent = status.provider + ' · ' + (status.model || 'auto')
      statusChip.dataset.state = 'ok'
      clear(modelSelect)
      const current = store.settings.model || ''
      modelSelect.appendChild(h('option', { value: '' }, 'Auto (best available)'))
      for (const candidate of status.candidates || []) {
        modelSelect.appendChild(h('option', { value: candidate.id, selected: candidate.id === current ? true : null }, candidate.name || candidate.id))
      }
      modelSelect.value = current
    } catch (error) {
      statusChip.textContent = 'model check failed'
      statusChip.dataset.state = 'bad'
    }
  }

  modelSelect.addEventListener('change', () => {
    store.setSetting('model', modelSelect.value)
    refreshStatus()
  })

  function setBusy(value, activeAction) {
    busy = value
    for (const [id, button] of buttons) {
      button.disabled = value
      button.classList.toggle('working', value && id === activeAction)
    }
  }

  function showError(message, raw) {
    clear(output)
    output.appendChild(
      h('div', { class: 'lca-error' },
        h('strong', null, 'The tutor could not answer.'),
        h('p', null, String(message || 'unknown error')),
        raw ? h('pre', { class: 'lca-raw' }, String(raw).slice(0, 1200)) : null,
      ),
    )
  }

  function variantCard(variant, index) {
    const examples = Array.isArray(variant.examples) ? variant.examples : []
    const details = h('details', { class: 'lca-variant-details' },
      h('summary', null, 'Examples, constraints & outline'),
      examples.map((example) =>
        h('div', { class: 'lca-example' },
          h('div', { class: 'lca-example-io' }, h('span', null, 'Input'), h('code', null, String(example.input || ''))),
          h('div', { class: 'lca-example-io' }, h('span', null, 'Output'), h('code', null, String(example.output || ''))),
          example.explain ? h('p', { class: 'lca-example-explain' }, String(example.explain)) : null,
        )),
      (variant.constraints || []).length ? h('ul', { class: 'lca-list' }, (variant.constraints || []).map((item) => h('li', null, String(item)))) : null,
      variant.solutionOutline ? h('p', { class: 'lca-outline' }, String(variant.solutionOutline)) : null,
    )
    return h('article', { class: 'lca-variant' },
      h('header', { class: 'lca-variant-head' },
        h('span', { class: 'lca-variant-index' }, String(index + 1)),
        h('strong', null, String(variant.title || 'Untitled')),
        h('span', { class: 'lca-variant-diff ' + String(variant.difficulty || '').toLowerCase() }, String(variant.difficulty || '')),
      ),
      h('p', { class: 'lca-variant-statement' }, String(variant.statement || '')),
      details,
      h('div', { class: 'lca-variant-actions' },
        h('button', {
          type: 'button',
          class: 'lca-mini',
          onClick: () => {
            const text = [variant.title, '', variant.statement || '', '', ...examples.map((example) => 'Input: ' + example.input + '\nOutput: ' + example.output)].join('\n')
            navigator.clipboard && navigator.clipboard.writeText(text).catch(() => {})
          },
        }, 'Copy'),
        h('button', {
          type: 'button',
          class: 'lca-mini',
          onClick: () => {
            if (problem && typeof options.onVariantsPractice === 'function') options.onVariantsPractice(variant)
          },
        }, 'Open in editor'),
      ),
    )
  }

  async function run(kind) {
    if (busy || !problem) return
    setBusy(true, kind)
    clear(output)
    output.appendChild(h('div', { class: 'lca-loading' },
      h('span', { class: 'lcv-spin' }),
      h('span', null, kind === 'scene' ? 'Designing a scene for this problem…' : kind === 'variants' ? 'Writing similar problems…' : 'Thinking through it…'),
    ))
    try {
      const payload = {
        kind,
        slug: problem.slug,
        code: getCode(),
        lang: getLang(),
        stuck: stuck.value.trim(),
        model: store.settings.model || undefined,
      }
      const result = await api.ai(payload)
      if (!result.ok) {
        showError(result.error, result.raw)
        return
      }
      if (kind === 'scene') {
        clear(output)
        output.appendChild(
          h('div', { class: 'lca-scene-ok' },
            h('span', { class: 'lca-scene-badge' }, '3D'),
            h('div', null,
              h('strong', null, result.scene && result.scene.title ? String(result.scene.title) : 'Scene ready'),
              h('p', { class: 'lca-dim' }, 'Playing it in the "See it" tab — ' + ((result.scene.frames || []).length) + ' frames.'),
            ),
            h('button', { type: 'button', class: 'lca-mini', onClick: () => onScene(result.scene) }, 'Replay'),
          ),
        )
        onScene(result.scene)
        return
      }
      if (kind === 'variants') {
        const problems = result.problems || []
        lastVariantQuery = problem.slug
        clear(output)
        output.appendChild(
          h('div', { class: 'lca-variants-head' },
            h('strong', null, problems.length + ' new problems, same pattern'),
            h('span', { class: 'lca-dim' }, ' ' + (problem.pattern || '')),
          ),
        )
        for (let index = 0; index < problems.length; index += 1) output.appendChild(variantCard(problems[index], index))
        return
      }
      clear(output)
      const body = h('div', { class: 'lca-markdown', html: renderMarkdown(result.text || '') })
      output.appendChild(body)
      output.appendChild(
        h('div', { class: 'lca-foot' },
          h('span', { class: 'lca-dim' }, (result.provider || '') + ' · ' + (result.model || '')),
        ),
      )
    } catch (error) {
      showError(String((error && error.message) || error))
    } finally {
      setBusy(false, null)
    }
  }

  refreshStatus()

  return {
    el: root,
    runAction: run,
    async showProblem(nextProblem) {
      problem = nextProblem
      clear(output)
      output.appendChild(
        h('div', { class: 'lca-intro' },
          h('p', null, 'Tutor is ready for ' + (problem ? '“' + problem.title + '”' : 'this problem') + '.'),
          h('p', { class: 'lca-dim' }, 'Pick an action above — each one uses the real example numbers.'),
        ),
      )
    },
    setCodeProvider(next) {
      getCode = next
    },
    focusAsk() {
      stuck.focus()
    },
    destroy() {
      root.remove()
    },
  }
}
