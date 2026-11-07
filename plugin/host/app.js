/**
 * LeetCode Lab — hot-reloadable host application.
 *
 * `createApi(version)` wires the dataset, the judge and the AI bridge into one request
 * handler. Sub-modules are imported with the same cache-busting version so editing any
 * of them takes effect on the next request (no app restart during development).
 */
import { createReadStream } from 'node:fs'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB_DIR = join(HERE, '..', 'web')

/**
 * ES modules are cached by URL in the page, so a live edit would otherwise never reach the
 * app. Every served module gets its relative import specifiers stamped with the newest
 * mtime in web/, which changes exactly when a file is written.
 */
let stampCache = { at: 0, value: 0 }

async function webStamp() {
  if (Date.now() - stampCache.at < 700) return stampCache.value
  let newest = 0
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      const target = join(dir, entry.name)
      if (entry.isDirectory()) await walk(target)
      else {
        const info = await stat(target).catch(() => null)
        if (info !== null && info.mtimeMs > newest) newest = info.mtimeMs
      }
    }
  }
  await walk(WEB_DIR)
  stampCache = { at: Date.now(), value: Math.round(newest) }
  return stampCache.value
}

function stampSpecifier(specifier, stamp) {
  if (!specifier.startsWith('.')) return specifier
  return specifier + (specifier.includes('?') ? '&' : '?') + 'b=' + stamp
}

function stampImports(source, stamp) {
  return source
    .replace(/(\bfrom\s*)(['"])(\.\.?\/[^'"]+)\2/g, (_match, prefix, quote, specifier) => prefix + quote + stampSpecifier(specifier, stamp) + quote)
    .replace(/(\bimport\s*\(\s*)(['"])(\.\.?\/[^'"]+)\2/g, (_match, prefix, quote, specifier) => prefix + quote + stampSpecifier(specifier, stamp) + quote)
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

function sendJson(res, value, status = 200) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

function sendText(res, text, status = 200, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' })
  res.end(text)
}

async function readBody(req, limit = 512 * 1024) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new Error('request body too large')
    chunks.push(chunk)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text.trim() === '') return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('request body must be JSON')
  }
}

function safeJoin(root, rest) {
  const target = normalize(join(root, rest))
  const prefix = normalize(root.endsWith(sep) ? root : root + sep)
  return target.startsWith(prefix) ? target : null
}

/* ---------------------------------------------------------------- progress */

const PROGRESS_FILE = process.env.LCLAB_PROGRESS || join(HERE, '..', 'data', 'progress.json')
let progressWriteChain = Promise.resolve()

async function readProgress() {
  try {
    const parsed = JSON.parse(await readFile(PROGRESS_FILE, 'utf8'))
    return {
      items: parsed && typeof parsed.items === 'object' && parsed.items !== null ? parsed.items : {},
      settings: parsed && typeof parsed.settings === 'object' && parsed.settings !== null ? parsed.settings : {},
      updatedAt: parsed && typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    }
  } catch {
    return { items: {}, settings: {}, updatedAt: 0 }
  }
}

function writeProgress(value) {
  const record = { ...value, updatedAt: Date.now() }
  progressWriteChain = progressWriteChain
    .then(() => writeFile(PROGRESS_FILE, JSON.stringify(record, null, 0), 'utf8'))
    .catch(() => {})
  return progressWriteChain.then(() => record)
}

/** Union by slug, newest `updatedAt` wins per problem; settings merge shallowly. */
function mergeProgress(current, incoming) {
  if (incoming && incoming.reset === true) {
    return { items: {}, settings: (incoming && incoming.settings) || {}, updatedAt: Date.now() }
  }
  const items = { ...(current.items || {}) }
  const nextItems = incoming && typeof incoming.items === 'object' && incoming.items !== null ? incoming.items : {}
  for (const [slug, entry] of Object.entries(nextItems)) {
    if (!entry || typeof entry !== 'object') continue
    const existing = items[slug]
    if (!existing) {
      items[slug] = entry
      continue
    }
    const existingAt = Number(existing.updatedAt) || 0
    const incomingAt = Number(entry.updatedAt) || 0
    const code = { ...(existing.code || {}), ...(entry.code || {}) }
    items[slug] = incomingAt >= existingAt ? { ...existing, ...entry, code } : { ...entry, ...existing, code }
  }
  return { items, settings: { ...(current.settings || {}), ...(incoming && incoming.settings ? incoming.settings : {}) }, updatedAt: Date.now() }
}

async function serveFrom(root, res, rest, fallbackType) {
  const target = safeJoin(root, rest)
  if (target === null) return sendText(res, 'forbidden', 403)
  const info = await stat(target).catch(() => null)
  if (info === null || !info.isFile()) return sendText(res, 'not found', 404)
  const extension = extname(target).toLowerCase()
  if (extension === '.js' || extension === '.mjs') {
    const stamp = await webStamp()
    const source = await readFile(target, 'utf8')
    const body = stampImports(source, stamp)
    res.writeHead(200, {
      'content-type': 'text/javascript; charset=utf-8',
      'cache-control': 'no-cache',
      'content-length': Buffer.byteLength(body),
    })
    return res.end(body)
  }
  res.writeHead(200, {
    'content-type': MIME[extension] || fallbackType,
    'cache-control': 'no-cache',
    'content-length': info.size,
  })
  createReadStream(target).pipe(res)
}

export async function createApi(version) {
  const suffix = '?v=' + Math.round(version || Date.now())
  const data = await import('./data.js' + suffix)
  const judge = await import('./judge.js' + suffix)
  const ai = await import('./ai.js' + suffix)
  const trace = await import('./trace.js' + suffix)

  let probeCache = null
  async function judgeProbe() {
    if (probeCache !== null) return probeCache
    const [java, cpp] = await Promise.all([
      judge.runProcess('javac', ['-version'], { timeoutMs: 6000 }),
      judge.runProcess('g++', ['--version'], { timeoutMs: 6000 }),
    ])
    probeCache = {
      java: !java.spawnFailed && java.code === 0,
      cpp: !cpp.spawnFailed && cpp.code === 0,
      javaVersion: (java.stdout + java.stderr).split(/\r?\n/)[0] || '',
      cppVersion: (cpp.stdout + cpp.stderr).split(/\r?\n/)[0] || '',
    }
    return probeCache
  }

  let activeJudges = 0
  const judgeQueue = []
  function withJudgeSlot(task) {
    return new Promise((resolve, reject) => {
      const run = () => {
        activeJudges += 1
        task()
          .then(resolve, reject)
          .finally(() => {
            activeJudges -= 1
            const next = judgeQueue.shift()
            if (next) next()
          })
      }
      if (activeJudges < 2) run()
      else judgeQueue.push(run)
    })
  }

  async function handleApi(ctxProvider, req, res, route) {
    const method = (req.method || 'GET').toUpperCase()

    // Progress lives on the host so the in-app panel and the browser tab (different
    // origins, therefore different localStorage) share one record.
    if (route === '/progress') {
      if (method === 'POST') {
        const body = await readBody(req)
        const merged = mergeProgress(await readProgress(), body)
        await writeProgress(merged)
        return sendJson(res, { ok: true, progress: merged })
      }
      return sendJson(res, { ok: true, progress: await readProgress() })
    }

    if (route === '/health') {
      const [stats, probe] = await Promise.all([data.getStats(), judgeProbe()])
      return sendJson(res, {
        ok: true,
        version: '0.1.0',
        problems: stats.total,
        generatedAt: stats.generatedAt,
        counts: stats.counts,
        patterns: stats.patterns,
        shards: stats.shards,
        judge: { java: probe.java, cpp: probe.cpp, javaVersion: probe.javaVersion, cppVersion: probe.cppVersion },
      })
    }

    if (route === '/index') return sendJson(res, await data.getIndex())
    if (route === '/patterns') return sendJson(res, { patterns: await data.getPatterns() })

    const shardMatch = /^\/shard\/(\d+)$/.exec(route)
    if (shardMatch) {
      const shard = await data.getShard(Number(shardMatch[1]))
      if (shard === null) return sendJson(res, { ok: false, error: 'no such shard' }, 404)
      return sendJson(res, shard)
    }

    const problemMatch = /^\/problem\/([^/]+)$/.exec(route)
    if (problemMatch) {
      const problem = await data.getProblem(decodeURIComponent(problemMatch[1]))
      if (!problem) return sendJson(res, { ok: false, error: 'unknown problem' }, 404)
      return sendJson(res, { ok: true, problem })
    }

    if (route === '/judge' && method === 'POST') {
      const body = await readBody(req)
      const lang = String(body.lang || 'java').toLowerCase() === 'cpp' ? 'cpp' : 'java'
      const code = String(body.code || '')
      if (code.trim() === '') return sendJson(res, { ok: false, error: 'empty solution' }, 400)
      const enabled = await judgeProbe()
      if (!enabled[lang]) {
        return sendJson(res, { ok: false, error: (lang === 'cpp' ? 'g++' : 'javac') + ' is not available on this machine' }, 503)
      }
      let problem = body.problem && typeof body.problem === 'object' ? body.problem : null
      if (!problem && body.slug) problem = await data.getProblem(body.slug)
      if (!problem) return sendJson(res, { ok: false, error: 'unknown problem' }, 404)
      if (!problem.judge) {
        return sendJson(res, { ok: false, error: 'this problem has no deterministic judge', mode: 'any', fallback: true }, 200)
      }
      const result = await withJudgeSlot(() => judge.judgeProblem(problem, lang, code))
      result.lang = lang
      result.slug = problem.slug
      return sendJson(res, result)
    }

    if (route === '/trace' && method === 'POST') {
      const body = await readBody(req)
      const lang = String(body.lang || 'java').toLowerCase() === 'cpp' ? 'cpp' : 'java'
      const code = String(body.code || '')
      if (code.trim() === '') return sendJson(res, { ok: false, error: 'empty solution' }, 400)
      const enabled = await judgeProbe()
      if (!enabled[lang]) {
        return sendJson(res, { ok: false, unavailable: true, error: (lang === 'cpp' ? 'g++' : 'javac') + ' is not available on this machine' }, 503)
      }
      let problem = body.problem && typeof body.problem === 'object' ? body.problem : null
      if (!problem && body.slug) problem = await data.getProblem(body.slug)
      if (!problem) return sendJson(res, { ok: false, error: 'unknown problem' }, 404)
      if (!problem.judge) {
        return sendJson(res, { ok: false, unavailable: true, error: 'this problem has no deterministic judge to trace against' }, 200)
      }
      const result = await withJudgeSlot(() => trace.traceProblem(problem, lang, code))
      result.lang = lang
      result.slug = problem.slug
      return sendJson(res, result)
    }

    if (route === '/ai' && method === 'POST') {
      const body = await readBody(req)
      const kind = String(body.kind || 'explain')
      let problem = body.problem && typeof body.problem === 'object' ? body.problem : null
      if (!problem && body.slug) problem = await data.getProblem(body.slug)
      if (!problem && ['explain', 'scene', 'variants', 'review'].includes(kind)) {
        return sendJson(res, { ok: false, error: 'unknown problem' }, 404)
      }
      const result = await ai.aiRequest(ctxProvider, { ...body, kind, problem })
      return sendJson(res, result)
    }

    if (route === '/ai/status') return sendJson(res, await ai.aiStatus(ctxProvider))

    if (route === '/models') {
      const llm = ctxProvider.get ? ctxProvider.get('llm') : null
      if (!llm) return sendJson(res, { providers: [], models: [], error: 'llm unavailable' })
      try {
        const providers = await llm.listProviders()
        const models = []
        for (const provider of providers) {
          const list = await llm.listModels(provider.id).catch(() => [])
          for (const entry of list) models.push({ provider: provider.id, id: entry.id, name: entry.name })
        }
        return sendJson(res, { providers: providers.map((entry) => entry.id), models })
      } catch (error) {
        return sendJson(res, { providers: [], models: [], error: String((error && error.message) || error) })
      }
    }

    return sendJson(res, { ok: false, error: 'unknown api route', route }, 404)
  }

  return {
    async warm() {
      const [stats, probe] = await Promise.all([data.getStats(), judgeProbe()])
      console.log('[leetcode-lab] ready —', stats.total, 'problems; javac:', probe.java, 'g++:', probe.cpp)
    },
    async handle(req, res, ctxProvider) {
      const url = new URL(req.url || '/', 'http://localhost')
      const pathname = decodeURIComponent(url.pathname)
      if (pathname === '/leetcode-lab') {
        res.writeHead(302, { location: '/leetcode-lab/' })
        return res.end()
      }
      const rest = pathname.slice('/leetcode-lab'.length) || '/'
      if (rest.startsWith('/api/')) return await handleApi(ctxProvider, req, res, rest.slice('/api'.length))
      if (rest === '/' || rest === '') return await serveFrom(WEB_DIR, res, 'index.html', 'text/html; charset=utf-8')
      return await serveFrom(WEB_DIR, res, rest.slice(1), 'application/octet-stream')
    },
  }
}
