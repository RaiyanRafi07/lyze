import { readFile } from "node:fs/promises"
import { pathToFileURL } from "node:url"
const root = "D:/Work/leedcode grind/plugin"
const index = JSON.parse(await readFile(root + "/data/index.json", "utf8"))
const shard = JSON.parse(await readFile(root + "/data/shard-0.json", "utf8"))
for (const slug of ["two-sum", "valid-parentheses", "binary-search", "merge-intervals", "reverse-linked-list", "binary-tree-inorder-traversal"]) {
  const entry = index.problems.find(p => p.slug === slug)
  if (!entry) { console.log(slug, "-> not in index"); continue }
  const s = entry.shard === 0 ? shard : JSON.parse(await readFile(root + "/data/shard-" + entry.shard + ".json", "utf8"))
  const problem = s.problems.find(p => p.slug === slug)
  try {
    const mod = await import(pathToFileURL(root + "/web/engine/walkthrough.js").href)
    const built = mod.buildWalkthrough(problem)
    console.log(slug, "| pattern", problem.pattern, "| ->", built ? ("kind=" + built.kind + " frames=" + built.frames.length + " javaLines=" + built.code.java.length) : "null")
  } catch (error) {
    console.log(slug, "| THROW:", error.message)
  }
}
