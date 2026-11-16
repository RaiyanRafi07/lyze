// Practice forge for `task-scheduler` (LeetCode 621). Generated exercises,
// clearly labelled as generated in each title/statement.
// Same judge signature (leastInterval, char[] + int -> int), comparison mode
// `exact`: the answer is one interval count. All `expected` values below are
// produced at build time by oracleScheduler (the counting formula: an
// INDEPENDENT algorithm from the walkthrough's max-heap simulation) and
// cross-checked against a heap-simulation reference; any disagreement throws
// so a bad literal can never ship as "verified".
// Deterministic: fixed task mixes, no RNG.

export const SLUG = 'task-scheduler'

export const SIGNATURE = {
  name: 'leastInterval',
  params: [
    { name: 'tasks', type: 'char[]' },
    { name: 'n', type: 'int' },
  ],
  return: 'int',
}

export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

// INDEPENDENT oracle: counting formula (no heap). mx = top frequency,
// tied = letters tied at mx. Forced frame = (mx-1)*(n+1)+tied;
// answer = max(tasks.length, frame).
export function oracleScheduler(tasks, n) {
  const freq = new Map()
  for (const t of tasks) freq.set(t, (freq.get(t) || 0) + 1)
  let mx = 0
  for (const c of freq.values()) mx = Math.max(mx, c)
  let tied = 0
  for (const c of freq.values()) if (c === mx) tied += 1
  return Math.max(tasks.length, (mx - 1) * (n + 1) + tied)
}

// Cross-check reference: max-heap simulation (the walkthrough algorithm).
// Larger count first, ties by smaller letter; idle only when the heap is
// empty but cooling tasks remain.
export function referenceScheduler(tasks, n) {
  const freq = new Map()
  for (const t of tasks) freq.set(t, (freq.get(t) || 0) + 1)
  const higher = (a, b) => (a.c !== b.c ? a.c > b.c : a.t < b.t)
  const heap = [...freq.entries()].map(([t, c]) => ({ t, c }))
  const down = (i) => {
    for (;;) {
      const l = 2 * i + 1, r = 2 * i + 2
      let b = i
      if (l < heap.length && higher(heap[l], heap[b])) b = l
      if (r < heap.length && higher(heap[r], heap[b])) b = r
      if (b === i) break
      ;[heap[b], heap[i]] = [heap[i], heap[b]]
      i = b
    }
  }
  for (let i = (heap.length >> 1) - 1; i >= 0; i--) down(i)
  const up = (i) => {
    while (i > 0) {
      const p = (i - 1) >> 1
      if (higher(heap[p], heap[i])) break
      ;[heap[p], heap[i]] = [heap[i], heap[p]]
      i = p
    }
  }
  let time = 0
  while (heap.length > 0) {
    const rest = []
    for (let i = 0; i <= n; i++) {
      if (heap.length > 0) {
        const top = heap[0]
        const last = heap.pop()
        if (heap.length > 0) { heap[0] = last; down(0) }
        time += 1
        if (top.c - 1 > 0) rest.push({ t: top.t, c: top.c - 1 })
      } else if (rest.length > 0) {
        time += 1
      } else break
    }
    for (const e of rest) { heap.push(e); up(heap.length - 1) }
  }
  return time
}

const litTasks = (tasks) => '[' + tasks.map((t) => JSON.stringify(t)).join(',') + ']'

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  }
}

function inputLine(signature, args) {
  return signature.params.map((p, i) => (p && p.name ? p.name : 'arg' + i) + ' = ' + args[i]).join(', ')
}

const CASES = {
  v1: {
    suffix: 'fresh tasks (generated)',
    seedLabel: 'fresh tasks',
    intent: 'Same pattern, different letters so you reproduce the reasoning.',
    statement:
      'Generated exercise, same task: CPU tasks labeled A-Z with cooldown n need at least n intervals between identical tasks; each interval runs one task or idles. ' +
      'These fresh inputs use new letter mixes with 4 to 7 tasks and n between 1 and 3. ' +
      'The signature and exact-match comparison are unchanged.',
    rows: [
      [['A', 'A', 'B', 'B', 'C', 'C'], 2],
      [['A', 'A', 'A', 'B', 'C'], 2],
      [['A', 'B', 'C', 'D'], 3],
      [['A', 'A', 'B', 'B', 'B', 'C', 'D'], 1],
    ],
    hints: [
      'Each round runs up to n+1 tasks; the most frequent ready task goes first.',
      'Idle only when the heap is empty but cooling tasks remain — never pad the last round.',
    ],
  },
  v2: {
    suffix: 'edge cases (generated)',
    seedLabel: 'edge cases',
    intent: 'Same pattern with the boundary inputs the original hides.',
    statement:
      'Generated exercise, same cooldown scheduling task with the boundary inputs. ' +
      'A single task always takes 1 interval no matter how large n is. ' +
      'n = 0 means tasks run back-to-back with no idle possible. ' +
      'One letter repeated forces the full idle frame.',
    rows: [
      [['A'], 0],
      [['A'], 5],
      [['A', 'B', 'C'], 0],
      [['A', 'A', 'A', 'A'], 3],
      [['A', 'A', 'B', 'B'], 0],
    ],
    hints: [
      'With n = 0 the answer is always tasks.length: no gap is ever required.',
      'A lone task finishes in 1 interval; cooling only matters between two copies.',
    ],
  },
  v3: {
    suffix: 'adversarial shapes (generated)',
    seedLabel: 'adversarial shapes',
    intent: 'Same question with shapes that punish shortcut reasoning.',
    statement:
      'Generated exercise, SAME TASK with no rule change: return the minimum intervals under the n-cooldown. ' +
      'These adversarial shapes punish shortcuts — a lone filler that cannot cover the gaps, a wide tie where the frame equals tasks.length so no idle is needed, and all-distinct letters where n is irrelevant. ' +
      'The signature and exact-match comparison are unchanged; heap simulation and the counting formula agree on every test.',
    rows: [
      [['A', 'A', 'A', 'A', 'B', 'B', 'C', 'C'], 2],
      [['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D'], 3],
      [['A', 'B', 'C', 'D', 'E', 'F'], 2],
      [['A', 'A', 'A', 'B'], 2],
    ],
    hints: [
      'Always take max(tasks.length, (mx-1)*(n+1)+tied): the frame alone undercounts wide ties.',
      'One helper task covers only one gap per round; the rest of each round still idles.',
    ],
  },
}

function buildOne(id, spec, signature, difficulty, baseTitle) {
  const tests = spec.rows.map(([tasks, n]) => {
    const fromOracle = oracleScheduler(tasks, n)
    const fromRef = referenceScheduler(tasks, n)
    if (fromOracle !== fromRef) throw new Error('task-scheduler practice oracle disagreement on ' + JSON.stringify(tasks) + ' n=' + n)
    return { args: [litTasks(tasks), String(n)], expected: String(fromOracle) }
  })
  const first = tests[0]
  return {
    id,
    seedLabel: spec.seedLabel,
    intent: spec.intent,
    difficulty,
    title: baseTitle + ' — ' + spec.suffix + ' (same task)',
    statement: spec.statement,
    signature: cloneSignature(signature),
    examples: [{ input: inputLine(signature, first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: spec.hints.slice(0, 2),
  }
}

// Live-forge-compatible builder: (problem, signature, rng) => 3 variants.
// Returns [] on an incompatible signature (never builds against it).
export function buildTaskSchedulerVariants(problem, signature, rng) {
  void rng
  const sig = signature || (problem && problem.signature) || SIGNATURE
  if (!sig || sig.name !== 'leastInterval' || sig.return !== 'int') return []
  const params = Array.isArray(sig.params) ? sig.params : []
  if (params.length !== 2 || params[0].type !== 'char[]' || params[1].type !== 'int') return []
  const base = String((problem && (problem.title || problem.slug)) || 'Task Scheduler')
  const difficulty =
    problem && (problem.difficulty === 'Easy' || problem.difficulty === 'Hard')
      ? problem.difficulty
      : DIFFICULTY
  try {
    return [
      buildOne('v1', CASES.v1, sig, difficulty, base),
      buildOne('v2', CASES.v2, sig, difficulty, base),
      buildOne('v3', CASES.v3, sig, difficulty, base),
    ]
  } catch {
    return []
  }
}

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oracleScheduler (counting formula: max(len, (mx-1)*(n+1)+tied); no heap, different algorithm from the walkthrough simulation)',
})
