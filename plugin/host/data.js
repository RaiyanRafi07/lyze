/**
 * Dataset access for LeetCode Lab: the index, the statement shards, and slug/id lookup.
 * Cached by file mtime so regenerating the pipeline is picked up without a restart.
 */
import { readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data')
const cache = new Map()

async function readCached(file, fallback) {
  const info = await stat(file).catch(() => null)
  if (info === null) return fallback
  const hit = cache.get(file)
  if (hit && hit.mtimeMs === info.mtimeMs) return hit.value
  const text = await readFile(file, 'utf8')
  const value = JSON.parse(text)
  cache.set(file, { mtimeMs: info.mtimeMs, value })
  return value
}

export async function getIndex() {
  return await readCached(join(DATA_DIR, 'index.json'), { generatedAt: null, patterns: [], problems: [], counts: {} })
}

export async function getShard(n) {
  return await readCached(join(DATA_DIR, 'shard-' + n + '.json'), null)
}

const slugMemo = new Map()

export async function findIndexEntry(slugOrId) {
  const index = await getIndex()
  const problems = Array.isArray(index.problems) ? index.problems : []
  const key = String(slugOrId)
  const memoKey = 'find:' + key
  if (slugMemo.has(memoKey)) return slugMemo.get(memoKey)
  const found =
    problems.find((entry) => entry.slug === key) ||
    problems.find((entry) => String(entry.id) === key) ||
    null
  if (found) slugMemo.set(memoKey, found)
  return found
}

export async function getProblem(slugOrId) {
  const entry = await findIndexEntry(slugOrId)
  if (!entry) return null
  const shard = await getShard(entry.shard)
  if (!shard || !Array.isArray(shard.problems)) return null
  return shard.problems.find((problem) => problem.slug === entry.slug) || null
}

export async function getPatterns() {
  const index = await getIndex()
  return Array.isArray(index.patterns) ? index.patterns : []
}

export async function getStats() {
  const index = await getIndex()
  return {
    total: Array.isArray(index.problems) ? index.problems.length : 0,
    generatedAt: index.generatedAt || null,
    counts: index.counts || {},
    patterns: (index.patterns || []).length,
    shards: (index.problems || []).reduce((max, entry) => Math.max(max, Number(entry.shard) || 0), 0) + 1,
  }
}
