// Build-time fixture export: replays the web walkthrough/variant builders over
// the real lessons (plus desktop overlay lessons) into `catalog-extra.json`.
// Contract: run `node export-all.mjs`; `--check` exits 1 on drift instead of
// writing. Per-lesson builder failures are recorded inline, never thrown.
// Gotcha: `generatedAt` is blanked for `--check` comparison; version is 2.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { CURRICULUM } from '../../plugin/data/curriculum-data.js'
import { buildWalkthrough } from '../../plugin/web/engine/walkthrough.js'
import { buildVariants } from '../../plugin/web/engine/variants.js'

const root = new URL('../../', import.meta.url)
const readJson = async (p) => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'))
const { problems } = await readJson('../../plugin/data/index.json')
const shards = new Map()
async function record(slug) {
  const entry = problems.find((p) => p.slug === slug)
  if (!entry) return null
  if (!shards.has(entry.shard)) {
    const data = await readJson(`../../plugin/data/shard-${entry.shard}.json`)
    shards.set(entry.shard, new Map(data.problems.map((p) => [p.slug, p])))
  }
  return shards.get(entry.shard).get(slug) || null
}

// overlay lessons: full records or judge patches
import { readdir } from 'node:fs/promises'
const overlays = new Map()
try {
  for (const f of await readdir(new URL('../../desktop/lessons/v1/', import.meta.url))) {
    if (!f.endsWith('.json')) continue
    const o = JSON.parse(await readFile(new URL('../../desktop/lessons/v1/' + f, import.meta.url), 'utf8'))
    overlays.set(o.slug, o)
  }
} catch {}

const lessons = []
for (const lesson of CURRICULUM) {
  let problem = lesson.localRecord ? await record(lesson.slug) : null
  const over = overlays.get(lesson.slug)
  if (over) {
    if (over.judge && !over.description) {
      if (!problem) { lessons.push({ slug: lesson.slug, error: 'patch without shard record' }); continue }
      problem = { ...problem, judge: over.judge, provenance: over.provenance || null }
    } else {
      problem = { ...over }
      delete problem.refs
    }
  }
  if (!problem || !problem.judge || !(problem.judge.tests || []).length) {
    // No runnable judge input: fall back to an explicit walkthrough override
    // (adapter-format input) when the overlay provides one.
    const override = over && over.walkthrough
    if (override && Array.isArray(override.tests) && override.tests.length) {
      try {
        const wtProblem = {
          slug: lesson.slug,
          title: (problem && problem.title) || lesson.slug,
          description: (problem && problem.description) || '',
          judge: override.signature
            ? { mode: 'exact', signature: override.signature, tests: override.tests }
            : { tests: override.tests },
        }
        const walkthrough = buildWalkthrough(wtProblem) || null
        let variants = []
        try { variants = problem ? buildVariants(problem) || [] : [] } catch (e) { variants = [] }
        lessons.push({ slug: lesson.slug, walkthrough, variants })
      } catch (e) {
        lessons.push({
          slug: lesson.slug,
          walkthrough: { error: String((e && e.message) || e).slice(0, 120) },
          variants: [],
        })
      }
    } else {
      lessons.push({ slug: lesson.slug, walkthrough: null, variants: [] })
    }
    continue
  }
  // Prefer an explicit adapter-format walkthrough when the overlay pins one;
  // the Rust judge keeps using the spec above.
  let wtProblem = problem
  if (over && over.walkthrough && Array.isArray(over.walkthrough.tests) && over.walkthrough.tests.length) {
    wtProblem = {
      slug: lesson.slug,
      title: problem.title,
      description: problem.description,
      judge: over.walkthrough.signature
        ? { mode: 'exact', signature: over.walkthrough.signature, tests: over.walkthrough.tests }
        : { tests: over.walkthrough.tests },
    }
  }
  let walkthrough = null
  try { walkthrough = buildWalkthrough(wtProblem) || null } catch (e) { walkthrough = { error: String((e && e.message) || e).slice(0, 120) } }
  let variants = []
  try { variants = buildVariants(problem) || [] } catch (e) { variants = [] }
  lessons.push({ slug: lesson.slug, walkthrough, variants })
}

const withWalk = lessons.filter((l) => l.walkthrough && !l.walkthrough.error)
const withErr = lessons.filter((l) => l.walkthrough && l.walkthrough.error)
const withVars = lessons.filter((l) => (l.variants || []).length >= 3)
console.log(`walkthrough ok: ${withWalk.length}/150, errored: ${withErr.length}, variants>=3: ${withVars.length}/150`)
for (const l of lessons) {
  if (!l.walkthrough && !(l.variants || []).length) console.log('EMPTY', l.slug)
}
for (const l of withErr.slice(0, 10)) console.log('WTERR', l.slug, l.walkthrough.error)
const kinds = {}
for (const l of withWalk) kinds[l.walkthrough.kind] = (kinds[l.walkthrough.kind] || 0) + 1
console.log('kinds:', JSON.stringify(kinds))
await mkdir(new URL('../../desktop/target/', import.meta.url), { recursive: true })
const generated = JSON.stringify({ version: 2, generatedAt: '', lessons }, null, 1) + '\n'
const savedPath = new URL('./catalog-extra.json', import.meta.url)
if (process.argv[2] === '--check') {
  const saved = JSON.parse(await readFile(savedPath, 'utf8'))
  saved.generatedAt = ''
  const savedText = JSON.stringify(saved, null, 1) + '\n'
  if (savedText.replaceAll('\r\n', '\n') !== generated.replaceAll('\r\n', '\n')) {
    console.error('catalog-extra.json has drifted. Review engine/data changes, then regenerate.')
    process.exit(1)
  }
  console.log('catalog-extra.json matches the export.')
} else {
  await writeFile(savedPath, JSON.stringify({ version: 2, generatedAt: new Date().toISOString(), lessons }, null, 1) + '\n')
  console.log('wrote desktop/fixtures/catalog-extra.json')
}
