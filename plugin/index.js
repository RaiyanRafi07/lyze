/**
 * LeetCode Lab — host entry.
 *
 * Kept deliberately tiny: it only claims the `/leetcode-lab` route and forwards every
 * request to `host/app.js`, which is imported dynamically with a cache-busting query so
 * a code change is picked up on the next request instead of needing an app restart.
 */
import { stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const APP_MODULE = join(HERE, 'host', 'app.js')
const APP_URL = pathToFileURL(APP_MODULE).href
const WATCHED = ['app.js', 'data.js', 'judge.js', 'ai.js'].map((name) => join(HERE, 'host', name))

function getWebService(ctx) {
  try {
    const direct = ctx.get('webServer')
    if (direct) return direct
  } catch {
    /* fall through */
  }
  return ctx.webServer
}

let loadedVersion = 0
let loadedApi = null
let inflight = null

async function loadApp() {
  let version = 0
  for (const file of WATCHED) {
    const info = await stat(file).catch(() => null)
    if (info !== null && info.mtimeMs > version) version = info.mtimeMs
  }
  if (loadedApi !== null && version === loadedVersion) return loadedApi
  if (inflight !== null && inflight.version === version) return inflight.promise
  const promise = import(APP_URL + '?v=' + Math.round(version)).then((module) => {
    loadedApi = module.createApi(version)
    loadedVersion = version
    return loadedApi
  })
  inflight = { version, promise }
  try {
    return await promise
  } finally {
    if (inflight !== null && inflight.promise === promise) inflight = null
  }
}

export function apply(ctx) {
  const web = getWebService(ctx)
  if (!web || typeof web.register !== 'function') {
    console.error('[leetcode-lab] webServer service unavailable — the lab cannot be served')
    return
  }

  const handler = async (req, res) => {
    try {
      const api = await loadApp()
      await api.handle(req, res, ctx)
    } catch (error) {
      console.error('[leetcode-lab] request failed:', error)
      if (!res.headersSent) {
        const body = JSON.stringify({ ok: false, error: String((error && error.message) || error) })
        res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
        res.end(body)
      } else {
        res.end()
      }
    }
  }

  ctx.effect(() => web.register({ kind: 'prefix', path: '/leetcode-lab', handler }), 'leetcode-lab: routes')
  loadApp()
    .then((api) => api.warm())
    .catch((error) => console.error('[leetcode-lab] startup probe failed:', error))
}
