/** Typed-ish access to the lab's own JSON API. */
const BASE = '/leetcode-lab/api'

async function request(path, options = {}) {
  const response = await fetch(BASE + path, {
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    method: options.method || (options.body ? 'POST' : 'GET'),
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const text = await response.text()
  let payload
  try {
    payload = text ? JSON.parse(text) : {}
  } catch {
    payload = { ok: false, error: 'bad json: ' + text.slice(0, 200) }
  }
  if (!response.ok && payload.ok !== false) {
    payload = { ok: false, error: payload.error || 'HTTP ' + response.status }
  }
  return payload
}

export const api = {
  health: () => request('/health'),
  index: () => request('/index'),
  patterns: () => request('/patterns'),
  shard: (n) => request('/shard/' + n),
  problem: (slug) => request('/problem/' + encodeURIComponent(slug)),
  judge: (payload) => request('/judge', { body: payload }),
  trace: (payload) => request('/trace', { body: payload }),
  ai: (payload) => request('/ai', { body: payload }),
  aiStatus: () => request('/ai/status'),
  models: () => request('/models'),
}
