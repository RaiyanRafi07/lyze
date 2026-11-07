/**
 * Tiny markdown renderer — headings, bold/italic, inline code, fenced code, lists,
 * blockquotes and paragraphs. Everything is escaped before markup is applied, so model
 * output can never inject HTML.
 */

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

function inline(text) {
  let out = escapeHtml(text)
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,])/g, '$1<em>$2</em>')
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
  return out
}

export function renderMarkdown(source) {
  const lines = String(source || '').replace(/\r\n/g, '\n').split('\n')
  const html = []
  let paragraph = []
  let list = null
  let code = null
  let codeLang = ''

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      html.push('<p>' + inline(paragraph.join(' ')) + '</p>')
      paragraph = []
    }
  }
  const flushList = () => {
    if (list !== null) {
      html.push('<' + list.tag + '>' + list.items.map((item) => '<li>' + inline(item) + '</li>').join('') + '</' + list.tag + '>')
      list = null
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '')
    if (code !== null) {
      if (/^```/.test(line.trim())) {
        html.push('<pre><code class="lang-' + escapeHtml(codeLang) + '">' + escapeHtml(code.join('\n')) + '</code></pre>')
        code = null
        codeLang = ''
      } else {
        code.push(line)
      }
      continue
    }
    const fence = /^```(\w*)/.exec(line.trim())
    if (fence) {
      flushParagraph()
      flushList()
      code = []
      codeLang = fence[1] || ''
      continue
    }
    if (line.trim() === '') {
      flushParagraph()
      flushList()
      continue
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      const level = Math.min(4, heading[1].length + 1)
      html.push('<h' + level + '>' + inline(heading[2]) + '</h' + level + '>')
      continue
    }
    const quote = /^>\s?(.*)$/.exec(line)
    if (quote) {
      flushParagraph()
      flushList()
      html.push('<blockquote>' + inline(quote[1]) + '</blockquote>')
      continue
    }
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line)
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    if (bullet || ordered) {
      flushParagraph()
      const tag = bullet ? 'ul' : 'ol'
      if (list === null || list.tag !== tag) {
        flushList()
        list = { tag, items: [] }
      }
      list.items.push((bullet || ordered)[1])
      continue
    }
    if (list !== null) flushList()
    paragraph.push(line.trim())
  }
  flushParagraph()
  flushList()
  if (code !== null) {
    html.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>')
  }
  return html.join('\n')
}
