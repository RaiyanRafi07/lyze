// Export the curriculum reference submissions for the native judge
// parity harness. Mirrors the reference extraction in
// .workers/jobs/batch20/check-r4-judge.mjs, but runs offline (no server)
// and writes machine-local JSON for the Rust runner.
//
// Output: desktop/target/parity-refs.json
//   { version: 1, generatedAt, refs: [{slug, lang, code}],
//     skipped: [{slug, status}] }
// Run: node desktop/fixtures/export-parity-refs.mjs
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { CURRICULUM } from '../../plugin/data/curriculum-data.js'
import { buildWalkthrough } from '../../plugin/web/engine/walkthrough.js'

const data = new URL('../../plugin/data/', import.meta.url)
const readJson = async (name) => JSON.parse(await readFile(new URL(name, data), 'utf8'))
const out = new URL('../target/parity-refs.json', import.meta.url)

const { problems } = await readJson('index.json')
const shardOf = new Map(problems.map((problem) => [problem.slug, problem.shard]))
const shards = new Map()
async function record(slug) {
  const shard = shardOf.get(slug)
  assert.ok(shard !== undefined, `No index record for ${slug}`)
  if (!shards.has(shard)) {
    const { problems: records } = await readJson(`shard-${shard}.json`)
    shards.set(shard, new Map(records.map((problem) => [problem.slug, problem])))
  }
  const problem = shards.get(shard).get(slug)
  assert.ok(problem, `No shard record for ${slug}`)
  return problem
}

const refs = []
const skipped = []

// Judge-compatible reference overrides (fixture-only): the walkthrough
// teaches a DIFFERENT test profile for these slugs, so its code cannot run
// through the judge harness no matter how faithful the harness is:
// - merge-k-sorted-lists: the walkthrough is mergeKLists(int[][])->int[]
//   while the judge spec is mergeKLists(ListNode[])->ListNode.
// - serialize-and-deserialize-binary-tree: the walkthrough Codec uses a
//   preorder-with-markers encoding (plus a `split` scaffold helper that is
//   not part of the reference) while the judge compares the canonical
//   level-order round-trip.
// The overrides mirror the canonical judge-shaped references exercised by
// `overlay_lessons_verify` in desktop/crates/app/src/judge.rs. Counts stay
// 134 per language; web sources and dataset records are untouched.
const REF_OVERRIDES = new Map(Object.entries({
  'merge-k-sorted-lists': {
    java: 'class Solution { public ListNode mergeKLists(ListNode[] lists) { java.util.PriorityQueue<ListNode> pq = new java.util.PriorityQueue<>((a, b) -> a.val - b.val); for (ListNode n : lists) if (n != null) pq.add(n); ListNode dummy = new ListNode(0), cur = dummy; while (!pq.isEmpty()) { ListNode n = pq.poll(); cur.next = n; cur = cur.next; if (n.next != null) pq.add(n.next); } return dummy.next; } }',
    cpp: 'class Solution { public: ListNode* mergeKLists(vector<ListNode*>& lists) { auto cmp = [](ListNode* a, ListNode* b) { return a->val > b->val; }; std::priority_queue<ListNode*, std::vector<ListNode*>, decltype(cmp)> pq(cmp); for (auto n : lists) if (n) pq.push(n); ListNode dummy(0), *cur = &dummy; while (!pq.empty()) { ListNode* n = pq.top(); pq.pop(); cur->next = n; cur = cur->next; if (n->next) pq.push(n->next); } return dummy.next; } };',
  },
  'serialize-and-deserialize-binary-tree': {
    java: 'class Codec { public String serialize(TreeNode root) { if (root == null) return "[]"; java.util.List<String> out = new java.util.ArrayList<>(); java.util.Queue<TreeNode> q = new java.util.LinkedList<>(); q.add(root); while (!q.isEmpty()) { TreeNode n = q.poll(); if (n == null) { out.add("null"); continue; } out.add(String.valueOf(n.val)); q.add(n.left); q.add(n.right); } while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1); return "[" + String.join(",", out) + "]"; } public TreeNode deserialize(String s) { if (s.equals("[]")) return null; String[] p = s.substring(1, s.length() - 1).split(",", -1); TreeNode root = new TreeNode(Integer.parseInt(p[0])); java.util.Queue<TreeNode> q = new java.util.ArrayDeque<>(); q.add(root); int i = 1; while (!q.isEmpty() && i < p.length) { TreeNode n = q.poll(); if (!p[i].equals("null")) { n.left = new TreeNode(Integer.parseInt(p[i])); q.add(n.left); } i++; if (i < p.length && !p[i].equals("null")) { n.right = new TreeNode(Integer.parseInt(p[i])); q.add(n.right); } i++; } return root; } }',
    cpp: 'class Codec { public: string serialize(TreeNode* root) { if (!root) return "[]"; vector<string> out; std::deque<TreeNode*> q; q.push_back(root); while (!q.empty()) { TreeNode* n = q.front(); q.pop_front(); if (!n) { out.push_back("null"); continue; } out.push_back(to_string(n->val)); q.push_back(n->left); q.push_back(n->right); } while (!out.empty() && out.back() == "null") out.pop_back(); string s = "["; for (size_t i = 0; i < out.size(); i++) { if (i) s += ","; s += out[i]; } return s + "]"; } TreeNode* deserialize(string s) { if (s == "[]") return nullptr; vector<string> p; string cur; for (size_t i = 1; i + 1 < s.size(); i++) { if (s[i] == \',\') { p.push_back(cur); cur.clear(); } else cur += s[i]; } p.push_back(cur); TreeNode* root = new TreeNode(stoi(p[0])); std::deque<TreeNode*> q; q.push_back(root); size_t i = 1; while (!q.empty() && i < p.size()) { TreeNode* n = q.front(); q.pop_front(); if (p[i] != "null") { n->left = new TreeNode(stoi(p[i])); q.push_back(n->left); } i++; if (i < p.size() && p[i] != "null") { n->right = new TreeNode(stoi(p[i])); q.push_back(n->right); } i++; } return root; } };',
  },
}))
for (const lesson of CURRICULUM) {
  if (!lesson.localRecord) {
    skipped.push({ slug: lesson.slug, status: 'external' })
    continue
  }
  if (!lesson.features || !lesson.features.judge) {
    skipped.push({ slug: lesson.slug, status: 'unsupported' })
    continue
  }
  try {
    const problem = await record(lesson.slug)
    assert.ok(problem.judge, `No judge spec for ${lesson.slug}`)
    const walkthrough = buildWalkthrough(problem)
    assert.ok(walkthrough, `No walkthrough for ${lesson.slug}`)
    for (const lang of ['java', 'cpp']) {
      const override = REF_OVERRIDES.get(lesson.slug)?.[lang]
      const code = override
        ?? walkthrough.code[lang].map((line) => line.text).join('\n')
      assert.ok(code.trim().length > 0, `Empty ${lang} reference for ${lesson.slug}`)
      refs.push({ slug: lesson.slug, lang, code })
    }
  } catch (error) {
    skipped.push({ slug: lesson.slug, status: 'no reference', reason: String((error && error.message) || error).slice(0, 120) })
  }
}

refs.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : a.lang < b.lang ? -1 : 1))
const payload = {
  version: 1,
  generatedAt: new Date().toISOString(),
  refs,
  skipped,
}
// The current curriculum exports both languages for 134 lessons. Check
// each language so a missing reference cannot hide behind the total.
for (const lang of ['java', 'cpp']) {
  assert.equal(refs.filter((ref) => ref.lang === lang).length, 134,
    `Expected 134 ${lang} curriculum references`)
}
await mkdir(new URL('../target/', import.meta.url), { recursive: true })
await writeFile(out, JSON.stringify(payload, null, 1) + '\n')
const byStatus = Object.groupBy
  ? Object.groupBy(skipped, (row) => row.status)
  : skipped.reduce((map, row) => ({ ...map, [row.status]: (map[row.status] || []).concat(row) }), {})
console.log(`refs: ${refs.length} (${refs.filter((r) => r.lang === 'java').length} java, ${refs.filter((r) => r.lang === 'cpp').length} cpp)`)
console.log(`skipped: ${skipped.length} ` + Object.entries(byStatus).map(([status, rows]) => `${status}=${rows.length}`).join(' '))
