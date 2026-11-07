/** Minimal DOM helper — no framework, no virtual DOM, no build step. */

export function h(tag, props, ...children) {
  const element = document.createElement(tag)
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue
      if (key === 'class' || key === 'className') {
        element.className = value
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value)
      } else if (key === 'dataset') {
        Object.assign(element.dataset, value)
      } else if (key === 'html') {
        element.innerHTML = value
      } else if (key === 'text') {
        element.textContent = value
      } else if (key.startsWith('on') && typeof value === 'function') {
        element.addEventListener(key.slice(2).toLowerCase(), value)
      } else if (key === 'ref' && typeof value === 'function') {
        value(element)
      } else if (value === true) {
        element.setAttribute(key, '')
      } else {
        element.setAttribute(key, String(value))
      }
    }
  }
  append(element, children)
  return element
}

function append(parent, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue
    if (Array.isArray(child)) append(parent, child)
    else if (child instanceof Node) parent.appendChild(child)
    else parent.appendChild(document.createTextNode(String(child)))
  }
}

export function frag(...children) {
  const fragment = document.createDocumentFragment()
  append(fragment, children)
  return fragment
}

export function clear(element) {
  while (element.firstChild) element.removeChild(element.firstChild)
}

export function on(element, event, handler, options) {
  element.addEventListener(event, handler, options)
  return () => element.removeEventListener(event, handler, options)
}

export function icon(paths, size = 16, extra = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.7')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  for (const [key, value] of Object.entries(extra)) svg.setAttribute(key, String(value))
  for (const d of Array.isArray(paths) ? paths : [paths]) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', d)
    svg.appendChild(path)
  }
  return svg
}

export const icons = {
  play: 'M8 5.5v13l11-6.5z',
  pause: 'M9 5v14M15 5v14',
  step: 'M7 5l9 7-9 7zM18 5v14',
  reset: 'M4 10a8 8 0 1 1 2.3 6.4M4 4v6h6',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z',
  check: 'M4.5 12.5l5 5 10-11',
  chevron: 'M9 6l6 6-6 6',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.5-4.5',
  code: 'M9 8l-4 4 4 4M15 8l4 4-4 4',
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 3v18M4 7.5l8 4.5 8-4.5',
  brain: 'M9.5 4a3 3 0 0 0-3 3v1a3 3 0 0 0-1 5.8V16a3 3 0 0 0 4 3M14.5 4a3 3 0 0 1 3 3v1a3 3 0 0 1 1 5.8V16a3 3 0 0 1-4 3M12 4v16',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  flame: 'M12 3s5 4 5 8a5 5 0 0 1-10 0c0-2 1-3 1-3s1 2 2 2c0-3 2-5 2-7z',
  clock: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  filter: 'M4 5h16l-6 7v6l-4 2v-8z',
  wand: 'M5 19L19 5M15 5l4 4M6 4v4M4 6h4M18 16v4M16 18h4',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z',
  monitor: 'M4 5h16v10H4zM9 19h6M12 15v4',
}
