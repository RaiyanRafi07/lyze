// Minimal golden baseline for the native port: two-sum + number-of-islands in
// java/cpp/pseudo, written to `native-baseline.json` with provenance.
// Contract: asserts 6-40 walkthrough frames, per-language step coverage, and 3
// deterministic variants (2 hints each); `--check` fails on drift.
// Gotcha: compares exact serialized JSON; regenerate only after reviewing drift.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { buildWalkthrough } from '../../plugin/web/engine/walkthrough.js'
import { buildVariants } from '../../plugin/web/engine/variants.js'

const data = new URL('../../plugin/data/', import.meta.url)
const baseline = new URL('./native-baseline.json', import.meta.url)
const readJson = async (name) => JSON.parse(await readFile(new URL(name, data), 'utf8'))
const slugs = ['two-sum', 'number-of-islands']
const languages = ['java', 'cpp', 'pseudo']
const { problems } = await readJson('index.json')

async function buildFixture(slug) {
  const entry = problems.find((problem) => problem.slug === slug)
  assert.ok(entry, `No index record for ${slug}`)
  const shard = `shard-${entry.shard}.json`
  const { problems: records } = await readJson(shard)
  const problem = records.find((record) => record.slug === slug)
  const inputCase = problem?.judge?.tests?.[0]
  assert.ok(inputCase, `No first judge case for ${slug}`)

  const walkthrough = buildWalkthrough(problem)
  assert.ok(walkthrough, `No walkthrough for ${slug}`)
  assert.ok(walkthrough.frames.length >= 6 && walkthrough.frames.length <= 40, slug)
  const steps = new Set(walkthrough.frames.map((frame) => frame.step))
  for (const language of languages) {
    for (const step of steps) {
      assert.ok(walkthrough.code[language].some((line) => line.step === step),
        `${slug}: unmapped ${language} step ${step}`)
    }
  }

  const practice = buildVariants(problem)
  assert.deepEqual(practice, buildVariants(problem), `${slug}: nondeterministic practice`)
  assert.equal(practice.length, 3, slug)
  for (const [index, variant] of practice.entries()) {
    assert.match(variant.id, new RegExp(`^v${index + 1}(?:-|$)`), slug)
    assert.equal(variant.hints.length, 2, slug)
    assert.ok(variant.tests.length > 0, `${slug}: no tests for ${variant.id}`)
  }

  return {
    slug,
    provenance: {
      record: `plugin/data/${shard}`,
      judgeCase: 0,
      walkthrough: 'plugin/web/engine/walkthrough.js',
      practice: 'plugin/web/engine/variants.js',
    },
    inputs: inputCase.args,
    expected: inputCase.expected,
    walkthrough,
    practice,
  }
}

const args = process.argv.slice(2)
assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--check'),
  'Usage: node desktop/fixtures/export-baseline.mjs [--check]')

const lessons = await Promise.all(slugs.map(buildFixture))
const generated = JSON.stringify({ version: 1, lessons }, null, 2) + '\n'
if (args[0] === '--check') {
  const saved = await readFile(baseline, 'utf8')
  assert.ok(saved.replaceAll('\r\n', '\n') === generated,
    'Native baseline has drifted. Review the source changes before regenerating.')
} else {
  await writeFile(baseline, generated)
}

for (const { slug, walkthrough, practice } of lessons) {
  console.log(`${slug}: ${walkthrough.kind}, ${walkthrough.frames.length} frames, ${practice.length} drills`)
}
