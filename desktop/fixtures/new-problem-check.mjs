// New-problem gate: validates a shard record can join the catalog as a real lesson.
// Usage: node desktop/fixtures/new-problem-check.mjs [slug...]
import { readFile } from 'node:fs/promises';

const PARAM_TYPES = new Set(['void','int','long','double','float','boolean','string','char','int[]','long[]','double[]','boolean[]','string[]','char[]','int[][]','char[][]','string[][]','List<String>','ListNode','ListNode[]','TreeNode','interval[]','Node','GraphNode']);
const MODES = new Set(['exact','unordered','float','any','graph']);

const idx = JSON.parse(await readFile(new URL('../../plugin/data/index.json', import.meta.url), 'utf8'));
const shards = new Map();
async function fetchRecord(slug) {
  const meta = idx.problems.find(p => p.slug === slug);
  if (!meta) return { slug, error: 'not in index.json' };
  if (!shards.has(meta.shard)) {
    const rec = JSON.parse(await readFile(new URL(`../../plugin/data/shard-${meta.shard}.json`, import.meta.url), 'utf8'));
    shards.set(meta.shard, new Map(rec.problems.map(r => [r.slug, r])));
  }
  return { slug, record: shards.get(meta.shard).get(slug) };
}

const slugs = process.argv.slice(2);
const targets = slugs.length ? slugs : idx.problems.map(p => p.slug);
let ok = 0, fixable = 0, out = 0;
const rows = [];
for (const slug of targets) {
  const { record, error } = await fetchRecord(slug);
  if (error || !record) { out++; rows.push([slug, 'OUT', error || 'no shard record']); continue; }
  const j = record.judge;
  const problems = [];
  if (!j) problems.push('no judge spec (SQL/shell? concentrically out of scope)');
  else {
    if (!MODES.has(j.mode)) problems.push(`mode ${j.mode} unsupported by Rust harness`);
    const sig = j.signature || {};
    for (const p of sig.params || []) if (!PARAM_TYPES.has(p.type)) problems.push(`param type ${p.type} unsupported`);
    if (!PARAM_TYPES.has(sig.return)) problems.push(`return type ${sig.return} unsupported`);
    if (!j.tests || j.tests.length === 0) problems.push('zero judge tests');
    if (!j.mutates && sig.return === 'void') problems.push('void return without mutates (check harness)');
  }
  if (!record.description) problems.push('no description');
  if (!record.examples || record.examples.length === 0) problems.push('no examples');
  if (problems.length === 0) { ok++; }
  else { fixable++; rows.push([slug, problems.some(p => p.includes('unsupported') || p.includes('SQL')) ? 'OUT' : 'FIXABLE', problems.join('; ')]); }
}
console.log(`targets=${targets.length} READY=${ok} NEEDS_WORK=${fixable} OUT_OF_SCOPE=${out}`);
const byReason = {};
for (const [s, st, why] of rows) {
  const k = st + ' :: ' + why.split(';')[0].slice(0, 70);
  byReason[k] = (byReason[k] || 0) + 1;
}
for (const [k, n] of Object.entries(byReason).sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`${n} ${k}`);
const fixRows = rows.filter(r => r[1] === 'FIXABLE');
console.log(`FIXABLE total=${fixRows.length}`);
for (const [s, st, why] of fixRows.slice(0, 20)) console.log(`FIXABLE ${s}: ${why}`);
