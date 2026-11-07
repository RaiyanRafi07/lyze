/**
 * Code editor: a transparent textarea over a highlighted <pre>, with a line-number
 * gutter, auto-indent, tab insertion and Ctrl/Cmd+Enter to run. No dependencies.
 */
import { h, clear } from './dom.js'
import { store } from './store.js'

const KEYWORDS = {
  java: 'abstract|assert|boolean|break|byte|case|catch|char|class|continue|default|do|double|else|enum|extends|final|finally|float|for|if|implements|import|instanceof|int|interface|long|new|package|private|protected|public|return|short|static|super|switch|synchronized|this|throw|throws|try|void|volatile|while|record|var|yield|String|Integer|Long|Double|Boolean|Character|List|ArrayList|Map|HashMap|Set|HashSet|Queue|Deque|ArrayDeque|PriorityQueue|TreeMap|TreeSet|Arrays|Collections|Math|StringBuilder|ListNode|TreeNode|Objects',
  cpp: 'alignas|auto|bool|break|case|catch|char|class|const|constexpr|continue|decltype|default|delete|do|double|else|enum|explicit|extern|false|float|for|friend|if|inline|int|long|mutable|namespace|new|noexcept|nullptr|operator|private|protected|public|return|short|signed|sizeof|static|struct|switch|template|this|throw|true|try|typedef|typename|union|unsigned|using|virtual|void|volatile|while|vector|string|unordered_map|unordered_set|map|set|queue|deque|priority_queue|stack|pair|make_pair|sort|reverse|min|max|abs|INT_MAX|INT_MIN|LONG_MAX|size_t|std',
}

function escapeCode(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function highlight(code, lang) {
  const keywords = KEYWORDS[lang] || KEYWORDS.java
  const source = escapeCode(code)
  const pattern = new RegExp(
    '(' +
      [
        '"(?:\\\\.|[^"\\\\])*"',
        "'(?:\\\\.|[^'\\\\])*'",
        '//[^\\n]*',
        '/\\*[\\s\\S]*?\\*/',
        '\\b(?:' + keywords + ')\\b',
        '\\b\\d+(?:\\.\\d+)?[fFlLdD]?\\b',
      ].join('|') +
      ')',
    'g',
  )
  return source.replace(pattern, (match) => {
    if (match.startsWith('"') || match.startsWith("'")) return '<span class="tk-str">' + match + '</span>'
    if (match.startsWith('//') || match.startsWith('/*')) return '<span class="tk-com">' + match + '</span>'
    if (/^\d/.test(match)) return '<span class="tk-num">' + match + '</span>'
    return '<span class="tk-kw">' + match + '</span>'
  })
}

const STARTERS = {
  java: 'class Solution {\n    public int solve() {\n        return 0;\n    }\n}\n',
  cpp: 'class Solution {\npublic:\n    int solve() {\n        return 0;\n    }\n};\n',
}

export function createEditor(host, options = {}) {
  let lang = options.lang || 'java'
  let slug = options.slug || ''
  let onChange = options.onChange || (() => {})
  let onRun = options.onRun || (() => {})

  const gutter = h('div', { class: 'lced-gutter', 'aria-hidden': 'true' })
  const code = h('code')
  const pre = h('pre', { class: 'lced-pre', 'aria-hidden': 'true' }, code)
  const textarea = h('textarea', {
    class: 'lced-input',
    spellcheck: 'false',
    autocapitalize: 'off',
    autocomplete: 'off',
    wrap: 'off',
    'aria-label': 'Solution editor',
  })
  const scroll = h('div', { class: 'lced-scroll' }, pre, textarea)
  const root = h('div', { class: 'lced' }, gutter, scroll)

  const renderGutter = (value) => {
    const lineCount = String(value).split('\n').length
    clear(gutter)
    for (let i = 1; i <= lineCount; i += 1) {
      gutter.appendChild(h('div', { class: 'lced-ln' }, String(i)))
    }
  }

  const syncScroll = () => {
    pre.scrollTop = textarea.scrollTop
    pre.scrollLeft = textarea.scrollLeft
    gutter.scrollTop = textarea.scrollTop
  }

  const paint = () => {
    code.innerHTML = highlight(textarea.value, lang) + '\n'
    renderGutter(textarea.value)
    syncScroll()
  }

  const emit = () => {
    onChange(textarea.value)
    paint()
  }

  const insert = (text) => {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end)
    textarea.selectionStart = textarea.selectionEnd = start + text.length
    emit()
  }

  textarea.addEventListener('input', emit)
  textarea.addEventListener('scroll', syncScroll)
  textarea.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      onRun()
      return
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      insert('    ')
      return
    }
    if (event.key === 'Enter') {
      const start = textarea.selectionStart
      const lineStart = textarea.value.lastIndexOf('\n', start - 1) + 1
      const line = textarea.value.slice(lineStart, start)
      const indent = /^[\t ]*/.exec(line)[0]
      const opens = /[{([:]$/.test(line.trim())
      const closesNext = /^[}\])]/.test(textarea.value.slice(textarea.selectionEnd))
      event.preventDefault()
      if (opens && closesNext) {
        const extra = '    '
        textarea.value = textarea.value.slice(0, start) + '\n' + indent + extra + '\n' + indent + textarea.value.slice(start)
        textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length + extra.length
      } else {
        const extra = opens ? '    ' : ''
        textarea.value = textarea.value.slice(0, start) + '\n' + indent + extra + textarea.value.slice(start)
        textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length + extra.length
      }
      emit()
    }
  })

  function setValue(value, silent = false) {
    textarea.value = value == null ? '' : String(value)
    paint()
    if (!silent) onChange(textarea.value)
  }

  function setLang(next, problem) {
    lang = next === 'cpp' ? 'cpp' : 'java'
    const saved = slug ? store.savedCode(slug, lang) : ''
    const snippet = problem && problem.snippets ? problem.snippets[lang] || '' : ''
    setValue(saved || snippet || STARTERS[lang], true)
    paint()
  }

  function setProblem(problem) {
    slug = problem ? problem.slug : ''
    const saved = slug ? store.savedCode(slug, lang) : ''
    const snippet = problem && problem.snippets ? problem.snippets[lang] || problem.snippets.java || '' : ''
    textarea.value = saved || snippet || STARTERS[lang]
    paint()
  }

  paint()

  return {
    el: root,
    textarea,
    getValue: () => textarea.value,
    setValue,
    setLang,
    setProblem,
    getLang: () => lang,
    focus: () => textarea.focus(),
    destroy() {
      textarea.removeEventListener('input', emit)
      root.remove()
    },
  }
}
