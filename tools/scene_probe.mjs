// Inspect a built scene for one problem: node tools/scene_probe.mjs <slug>
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const slug = process.argv[2] || 'binary-tree-inorder-traversal'
const root = 'D:/Work/leedcode grind/plugin'
const index = JSON.parse(await readFile(join(root, 'data/index.json'), 'utf8'))
const entry = index.problems.find((p) => p.slug === slug)
if (!entry) throw new Error('no such slug: ' + slug)
const shard = JSON.parse(await readFile(join(root, `data/shard-${entry.shard}.json`), 'utf8'))
const problem = shard.problems.find((p) => p.slug === slug)

const patterns = await import(pathToFileURL(join(root, 'web/engine/patterns.js')).href)
const scene = patterns.buildScene(problem, {})
if (!scene) {
  console.log('buildScene returned null for', slug, '(pattern', problem.pattern + ')')
  process.exit(0)
}
console.log('kind:', scene.kind, '| frames:', scene.frames.length, '| pattern:', scene.pattern)
console.log('layout:', JSON.stringify(scene.layout).slice(0, 800))
console.log('frame0:', JSON.stringify(scene.frames[0]).slice(0, 600))
console.log('frame1:', JSON.stringify(scene.frames[1]).slice(0, 600))
console.log('frameLast:', JSON.stringify(scene.frames[scene.frames.length - 1]).slice(0, 500))
