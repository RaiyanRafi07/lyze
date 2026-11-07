/**
 * Variations: three generated takes on the same idea, each with a real judge, so the learner
 * can redo the reasoning on data they have not seen instead of memorising one answer.
 */
import { h, clear, icon, icons } from './dom.js'
import { api } from './api.js'
import { createEditor } from './editor.js'
import { store } from './store.js'

const STAMP = (() => {
  try {
    return new URL(import.meta.url).searchParams.get('b') || ''
  } catch {
    return ''
  }
})()
const VARIANTS_URL = '/leetcode-lab/engine/variants.js' + (STAMP ? '?b=' + STAMP : '')

let modulePromise = null
async function loadVariants() {
  if (modulePromise === null) {
    modulePromise = import(VARIANTS_URL)
      .then((module) => module.exports || module)
      .catch(() => null)
  }
  return modulePromise
}

function starter(signature, lang) {
  if (!signature || !signature.name) return lang === 'cpp' ? 'class Solution {\npublic:\n    int solve() {\n        return 0;\n    }\n};\n' : 'class Solution {\n    public int solve() {\n        return 0;\n    }\n}\n'
  const javaType = {
    int: 'int', long: 'long', double: 'double', boolean: 'boolean', string: 'String', char: 'char',
    'int[]': 'int[]', 'long[]': 'long[]', 'double[]': 'double[]', 'boolean[]': 'boolean[]',
    'string[]': 'String[]', 'char[]': 'char[]', 'int[][]': 'int[][]', 'char[][]': 'char[][]', 'string[][]': 'String[][]',
    ListNode: 'ListNode', TreeNode: 'TreeNode', void: 'void',
  }
  const cppType = {
    int: 'int', long: 'long long', double: 'double', boolean: 'bool', string: 'string', char: 'char',
    'int[]': 'vector<int>', 'long[]': 'vector<long long>', 'double[]': 'vector<double>', 'boolean[]': 'vector<bool>',
    'string[]': 'vector<string>', 'char[]': 'vector<char>', 'int[][]': 'vector<vector<int>>',
    'char[][]': 'vector<vector<char>>', 'string[][]': 'vector<vector<string>>',
    ListNode: 'ListNode*', TreeNode: 'TreeNode*', void: 'void',
  }
  const params = signature.params || []
  if (lang === 'cpp') {
    const list = params.map((param) => {
      const type = cppType[param.type] || 'int'
      const name = param.name || 'arg'
      return /\[\]$/.test(param.type) ? type + '& ' + name : type + ' ' + name
    })
    return 'class Solution {\npublic:\n    ' + (cppType[signature.return] || 'int') + ' ' + signature.name + '(' + list.join(', ') + ') {\n        // your code\n    }\n};\n'
  }
  const list = params.map((param) => (javaType[param.type] || 'int') + ' ' + (param.name || 'arg'))
  return 'class Solution {\n    public ' + (javaType[signature.return] || 'int') + ' ' + signature.name + '(' + list.join(', ') + ') {\n        // your code\n    }\n}\n'
}

export function createVariationsPanel(options = {}) {
  let problem = null
  let lang = options.getLang ? options.getLang() : 'java'
  let variants = []
  let disposed = false
  const editors = new Map()

  const hint = h('p', { class: 'lc-var-hint' }, 'Same idea, different data. Write it yourself and run it — these are graded against generated tests.')
  const list = h('div', { class: 'lc-var-list' })
  const head = h('div', { class: 'lc-var-head' },
    h('div', null,
      h('h3', { class: 'lc-pane-title' }, 'Variations'),
      hint,
    ),
  )
  const root = h('div', { class: 'lc-variations' }, head, list)

  function setLanguage(next) {
    lang = next === 'cpp' ? 'cpp' : 'java'
    for (const [, editor] of editors) {
      if (editor && typeof editor.setLang === 'function') {
        // Keep what the learner typed, only switch the language shell if untouched.
        if (!editor.getValue().trim()) editor.setValue(starter(editor.__signature, lang), true)
      }
    }
  }

  function renderEmpty(message) {
    clear(list)
    list.appendChild(
      h('div', { class: 'lc-var-empty' },
        h('div', { class: 'lc-var-empty-art' }, icon(icons.layers, 34)),
        h('p', null, message),
      ),
    )
  }

  function variantCard(variant, index) {
    const id = 'v' + (index + 1)
    const editorSlot = h('div', { class: 'lc-var-editor-slot', dataset: { open: 'false' } })
    const resultSlot = h('div', { class: 'lc-var-result' })
    const runButton = h('button', { class: 'lc-btn lc-btn-primary', type: 'button' }, icon(icons.play, 13), h('span', null, 'Run my code'))
    const practiceButton = h('button', { class: 'lc-btn lc-btn-ghost', type: 'button' }, icon(icons.code, 13), h('span', null, 'Practice'))

    const tests = Array.isArray(variant.tests) ? variant.tests : []
    const hasTests = tests.length > 0
    const examples = Array.isArray(variant.examples) ? variant.examples : []

    let editor = null
    function ensureEditor() {
      if (editor !== null) return editor
      editor = createEditor(editorSlot, {
        lang,
        slug: 'variant:' + (problem ? problem.slug : 'x') + ':' + id,
        onChange: () => {},
        onRun: () => runVariant(),
      })
      editor.__signature = variant.signature
      editorSlot.appendChild(editor.el)
      editor.setValue(starter(variant.signature, lang), true)
      editors.set(id, editor)
      return editor
    }

    function setOpen(open) {
      editorSlot.dataset.open = String(open)
      if (open) {
        ensureEditor()
        runButton.style.display = ''
        practiceButton.style.display = 'none'
        if (editor) setTimeout(() => editor.focus(), 40)
      }
    }

    async function runVariant() {
      ensureEditor()
      clear(resultSlot)
      resultSlot.appendChild(h('div', { class: 'lc-running' }, h('span', { class: 'lc-spin' }), h('span', null, 'Running against the generated tests…')))
      const pseudoProblem = {
        slug: 'variant-' + (problem ? problem.slug : 'x') + '-' + id,
        title: variant.title || 'Variation',
        judge: {
          signature: variant.signature,
          tests: tests.map((test, i) => ({ args: test.args, expected: test.expected, example: i + 1 })),
          mode: variant.mode || 'exact',
        },
      }
      try {
        const payload = await api.judge({ lang, code: editor.getValue(), problem: pseudoProblem })
        clear(resultSlot)
        if (payload.compile && payload.compile.ok === false) {
          resultSlot.appendChild(h('div', { class: 'lc-verdict bad' }, 'Compile error'))
          resultSlot.appendChild(h('pre', { class: 'lc-pre' }, payload.compile.stderr || ''))
          return
        }
        const passed = payload.passed || 0
        const total = payload.total || tests.length
        resultSlot.appendChild(
          h('div', { class: 'lc-verdict-row' },
            h('span', { class: 'lc-verdict ' + (payload.ok ? 'ok' : 'bad') }, payload.ok ? 'All tests pass' : 'Not yet'),
            h('span', { class: 'lc-meta' }, passed + '/' + total + ' tests'),
            payload.ok ? h('span', { class: 'lc-meta' }, 'Nice — that is the pattern, not the answer.') : null,
          ),
        )
        for (const testCase of (payload.cases || []).filter((entry) => !entry.ok).slice(0, 3)) {
          resultSlot.appendChild(
            h('div', { class: 'lc-case bad' },
              h('div', { class: 'lc-case-head' }, h('span', { class: 'lc-case-n' }, 'Test ' + testCase.n), h('span', { class: 'lc-case-state' }, testCase.error ? 'error' : 'failed')),
              h('div', { class: 'lc-case-io' }, h('span', null, 'in'), h('code', null, (testCase.args || []).join(', '))),
              h('div', { class: 'lc-case-io' }, h('span', null, 'exp'), h('code', null, testCase.expected)),
              h('div', { class: 'lc-case-io' }, h('span', null, 'got'), h('code', null, testCase.error || testCase.got)),
            ),
          )
        }
        if (payload.ok && problem) {
          store.touch(problem.slug, { variantsPassed: true })
        }
      } catch (error) {
        clear(resultSlot)
        resultSlot.appendChild(h('div', { class: 'lc-verdict bad' }, 'Judge error: ' + String((error && error.message) || error)))
      }
    }

    practiceButton.addEventListener('click', () => setOpen(true))
    runButton.addEventListener('click', runVariant)
    runButton.style.display = 'none'

    const exampleRows = examples.map((example) =>
      h('div', { class: 'lc-var-example' },
        h('div', { class: 'lc-io' }, h('span', null, 'Input'), h('code', null, String(example.input || ''))),
        h('div', { class: 'lc-io' }, h('span', null, 'Output'), h('code', null, String(example.output || ''))),
      ),
    )

    return h('article', { class: 'lc-var', dataset: { index: String(index + 1) } },
      h('div', { class: 'lc-var-top' },
        h('span', { class: 'lc-var-index' }, String(index + 1)),
        h('div', { class: 'lc-var-titles' },
          h('h4', { class: 'lc-var-title' }, variant.title || 'Variation ' + (index + 1)),
          h('span', { class: 'lc-var-seed' }, variant.seedLabel || 'same idea, new data'),
        ),
        h('span', { class: 'lc-var-source ' + (variant.source === 'ai' ? 'ai' : 'local') }, variant.source === 'ai' ? 'AI drill' : 'drill'),
        h('span', { class: 'lc-chip ' + String(variant.difficulty || 'Medium').toLowerCase() }, variant.difficulty || 'Medium'),
      ),
      h('p', { class: 'lc-var-intent' }, variant.intent || ''),
      h('p', { class: 'lc-var-statement' }, variant.statement || ''),
      exampleRows.length > 0 ? h('div', { class: 'lc-var-examples' }, exampleRows) : null,
      (variant.hints || []).length > 0
        ? h('details', { class: 'lc-details lc-var-hints' },
            h('summary', null, 'Hints (' + variant.hints.length + ')'),
            h('ul', { class: 'lc-hints' }, variant.hints.map((item) => h('li', null, String(item)))),
          )
        : null,
      h('div', { class: 'lc-var-actions' },
        practiceButton,
        runButton,
        h('span', { class: 'lc-var-count' },
          hasTests ? tests.length + ' generated tests' : 'no verifiable tests — solve it, then ask the tutor to review',
        ),
      ),
      editorSlot,
      resultSlot,
    )
  }

  async function showProblem(nextProblem) {
    problem = nextProblem
    if (!problem) return renderEmpty('Pick a problem first.')
    renderEmpty('Building variations…')
    const module = await loadVariants()
    if (disposed) return
    let built = []
    if (module && typeof module.buildVariants === 'function') {
      try {
        built = module.buildVariants(problem, { lang }) || []
      } catch (error) {
        console.warn('[lab] variant generation failed', error)
        built = []
      }
    }
    if (Array.isArray(built) && built.length > 0) {
      variants = built.slice(0, 3).map((variant) => ({ ...variant, source: 'local' }))
      renderList()
      return
    }
    // No deterministic drill for this shape: ask the tutor for three, with real tests.
    renderEmpty('Writing three drills for this problem…')
    try {
      const payload = await api.ai({ kind: 'variants', slug: problem.slug, model: store.settings.model || undefined })
      if (disposed) return
      if (payload && payload.ok && Array.isArray(payload.problems) && payload.problems.length > 0) {
        variants = payload.problems.slice(0, 3).map((entry, index) => ({
          ...entry,
          id: 'ai' + (index + 1),
          seedLabel: entry.seedLabel || 'AI drill',
          intent: entry.intent || 'AI-written drill on the same pattern — the tests below are generated, so treat a mismatch as a hint, not a verdict.',
          tests: Array.isArray(entry.tests) ? entry.tests : [],
          mode: entry.mode || 'exact',
          source: 'ai',
        }))
        renderList()
        return
      }
      return renderEmpty('Could not generate variations right now. The Walkthrough and Tutor tabs still work for this problem.')
    } catch (error) {
      return renderEmpty('Could not reach the tutor for variations: ' + String((error && error.message) || error))
    }
  }

  function renderList() {
    clear(list)
    if (variants.length === 0) return renderEmpty('No variations for this problem yet.')
    variants.forEach((variant, index) => list.appendChild(variantCard(variant, index)))
  }

  return {
    el: root,
    showProblem,
    setLanguage,
    destroy() {
      disposed = true
      for (const [, editor] of editors) if (editor && editor.destroy) editor.destroy()
      editors.clear()
      root.remove()
    },
  }
}

