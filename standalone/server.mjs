/**
 * LeetCode Lab — standalone server. Same app, no Harness.
 *
 * Reuses the plugin's host modules directly (static server, dataset access, judge,
 * trace) so behavior can never drift: the only Harness-specific piece was the LLM
 * bridge, which is swapped for an OpenAI-compatible adapter (see llm-direct.mjs).
 *
 *   node server.mjs [--port 8080]
 *   PORT=8080 LLMAI_API_KEY=... node server.mjs
 *
 * Serves the app at /leetcode-lab/ (same prefix the frontend expects, so web/ is
 * untouched) and the JSON API at /leetcode-lab/api/*.
 */
import http from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const HOST_URL = join(HERE, '..', 'plugin', 'host', 'app.js')
const { pathToFileURL } = await import('node:url')

const args = process.argv.slice(2)
let port = Number(process.env.PORT || 8080)
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--port' && args[i + 1]) port = Number(args[i + 1])
  const match = /^--port=(\d+)$/.exec(args[i] || '')
  if (match) port = Number(match[1])
}
if (!Number.isFinite(port) || port <= 0) port = 8080

const hostApp = await import(pathToFileURL(HOST_URL).href)
const { directCtx } = await import(pathToFileURL(join(HERE, 'llm-direct.mjs')).href)
const ctx = directCtx()

const api = await hostApp.createApi(Date.now())
await api.warm()

const server = http.createServer((req, res) => {
  api.handle(req, res, ctx).catch((error) => {
    try {
      res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: false, error: String((error && error.message) || error) }))
    } catch {
      /* socket already gone */
    }
  })
})

server.listen(port, '0.0.0.0', () => {
  console.log(`[leetcode-lab] standalone at http://localhost:${port}/leetcode-lab/`);
  console.log(`[leetcode-lab] AI ${process.env.LLMAI_API_KEY ? 'configured (model ' + (process.env.LLMAI_MODEL || 'gpt-4o-mini') + ')' : 'NOT configured — set LLMAI_API_KEY to enable the tutor'}`);
})
