/**
 * Virtualised problem list with the grind ladder: Easy → Medium → Hard, then id.
 * Filters: text, difficulty, status (todo/attempted/solved/due), pattern.
 */
import { h, clear } from './dom.js'
import { store } from './store.js'

const ROW_HEIGHT = 64
const BUFFER = 6

const DIFFICULTIES = [
  { id: 'all', label: 'All' },
  { id: 'Easy', label: 'Easy' },
  { id: 'Medium', label: 'Medium' },
  { id: 'Hard', label: 'Hard' },
]

export function createCatalog(options = {}) {
  let problems = []
  let filtered = []
  let selectedSlug = null
  let filters = { q: '', difficulty: 'all', status: 'all', pattern: 'all' }
  const onSelect = options.onSelect || (() => {})

  const countLabel = h('span', { class: 'lcc-count' }, '0 problems')
  const search = h('input', {
    class: 'lcc-search',
    type: 'search',
    placeholder: 'Search problems…',
    'aria-label': 'Search problems',
  })
  const diffRow = h('div', { class: 'lcc-chips', role: 'group', 'aria-label': 'Difficulty' })
  const statusSelect = h('select', { class: 'lcc-select', 'aria-label': 'Status' },
    h('option', { value: 'all' }, 'All status'),
    h('option', { value: 'todo' }, 'Not started'),
    h('option', { value: 'attempted' }, 'Attempted'),
    h('option', { value: 'solved' }, 'Solved'),
    h('option', { value: 'due' }, 'Due for review'),
  )
  const patternSelect = h('select', { class: 'lcc-select', 'aria-label': 'Pattern' },
    h('option', { value: 'all' }, 'All patterns'),
  )

  const sizer = h('div', { class: 'lcc-sizer' })
  const rows = h('div', { class: 'lcc-rows' })
  const scroller = h('div', { class: 'lcc-scroll', tabindex: '0' }, sizer, rows)
  const empty = h('div', { class: 'lcc-empty' }, 'Nothing matches those filters.')

  const root = h('div', { class: 'lcc' },
    h('div', { class: 'lcc-head' },
      h('div', { class: 'lcc-head-top' }, search, countLabel),
      diffRow,
      h('div', { class: 'lcc-filters' }, statusSelect, patternSelect),
    ),
    scroller,
    empty,
  )

  DIFFICULTIES.forEach((difficulty) => {
    const chip = h('button', {
      type: 'button',
      class: 'lcc-chip' + (difficulty.id === 'all' ? ' on' : ''),
      dataset: { difficulty: difficulty.id },
      onClick: () => {
        filters.difficulty = difficulty.id
        for (const button of diffRow.children) button.classList.toggle('on', button.dataset.difficulty === difficulty.id)
        apply()
      },
    }, difficulty.label)
    diffRow.appendChild(chip)
  })

  search.addEventListener('input', () => {
    filters.q = search.value.trim().toLowerCase()
    apply()
  })
  statusSelect.addEventListener('change', () => {
    filters.status = statusSelect.value
    apply()
  })
  patternSelect.addEventListener('change', () => {
    filters.pattern = patternSelect.value
    apply()
  })
  scroller.addEventListener('scroll', () => renderWindow())

  function matches(problem) {
    if (filters.difficulty !== 'all' && problem.difficulty !== filters.difficulty) return false
    if (filters.pattern !== 'all' && problem.pattern !== filters.pattern) return false
    if (filters.status !== 'all') {
      const status = store.status(problem.slug)
      if (filters.status === 'due') {
        const entry = store.get(problem.slug)
        if (!entry || entry.status !== 'solved' || !entry.dueAt || entry.dueAt > Date.now()) return false
      } else if (filters.status === 'todo') {
        if (status !== 'todo') return false
      } else if (status !== filters.status) return false
    }
    if (filters.q) {
      const haystack = (problem.title + ' ' + (problem.topics || []).join(' ') + ' ' + problem.pattern + ' ' + problem.id).toLowerCase()
      if (!haystack.includes(filters.q)) return false
    }
    return true
  }

  function row(problem) {
    const status = store.status(problem.slug)
    const due = (() => {
      const entry = store.get(problem.slug)
      return entry && entry.status === 'solved' && entry.dueAt && entry.dueAt <= Date.now()
    })()
    const element = h('button', {
      type: 'button',
      class: 'lcc-row' + (problem.slug === selectedSlug ? ' on' : ''),
      dataset: { slug: problem.slug, status },
      onClick: () => onSelect(problem.slug),
    },
      h('span', { class: 'lcc-id' }, '#' + problem.id),
      h('span', { class: 'lcc-main' },
        h('span', { class: 'lcc-title' }, problem.title),
        h('span', { class: 'lcc-meta' },
          h('span', { class: 'lcc-diff ' + problem.difficulty.toLowerCase() }, problem.difficulty),
          h('span', { class: 'lcc-pattern' }, problem.pattern),
          problem.premium ? h('span', { class: 'lcc-premium' }, 'PRO') : null,
          due ? h('span', { class: 'lcc-due' }, 'due') : null,
        ),
      ),
      h('span', { class: 'lcc-mark ' + status }, status === 'solved' ? '✓' : status === 'attempted' ? '·' : ''),
    )
    return element
  }

  function renderWindow() {
    const total = filtered.length
    sizer.style.height = total * ROW_HEIGHT + 'px'
    const scrollTop = scroller.scrollTop
    const height = scroller.clientHeight || 600
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER)
    const end = Math.min(total, Math.ceil((scrollTop + height) / ROW_HEIGHT) + BUFFER)
    clear(rows)
    rows.style.transform = 'translateY(' + start * ROW_HEIGHT + 'px)'
    for (let index = start; index < end; index += 1) rows.appendChild(row(filtered[index]))
    empty.style.display = total === 0 ? '' : 'none'
  }

  function apply() {
    filtered = problems.filter(matches)
    countLabel.textContent = filtered.length + ' of ' + problems.length
    scroller.scrollTop = 0
    renderWindow()
  }

  function setPatterns(patterns) {
    while (patternSelect.options.length > 1) patternSelect.remove(1)
    for (const pattern of patterns || []) {
      patternSelect.appendChild(h('option', { value: pattern.id }, pattern.label || pattern.id))
    }
  }

  return {
    el: root,
    setProblems(list, patterns) {
      problems = Array.isArray(list) ? list : []
      if (patterns) setPatterns(patterns)
      apply()
    },
    select(slug) {
      selectedSlug = slug
      const index = filtered.findIndex((problem) => problem.slug === slug)
      if (index >= 0) {
        const scrollTop = scroller.scrollTop
        const height = scroller.clientHeight || 600
        const rowTop = index * ROW_HEIGHT
        if (rowTop < scrollTop || rowTop + ROW_HEIGHT > scrollTop + height) {
          scroller.scrollTop = Math.max(0, rowTop - height / 2)
        }
      }
      for (const element of rows.children) element.classList.toggle('on', element.dataset.slug === slug)
    },
    refresh() {
      apply()
    },
    getProblems: () => problems,
    getFiltered: () => filtered,
    setPattern(patternId) {
      filters.pattern = patternId || 'all'
      patternSelect.value = filters.pattern
      filters.difficulty = 'all'
      for (const button of diffRow.children) button.classList.toggle('on', button.dataset.difficulty === 'all')
      apply()
      scroller.scrollTop = 0
    },
    setStatus(status) {
      filters.status = status || 'all'
      statusSelect.value = filters.status
      apply()
    },
    selectRelative(delta) {
      const index = filtered.findIndex((problem) => problem.slug === selectedSlug)
      const next = filtered[Math.max(0, Math.min(filtered.length - 1, (index === -1 ? 0 : index) + delta))]
      if (next) onSelect(next.slug)
    },
    focusSearch() {
      search.focus()
      search.select()
    },
  }
}

