// Practice forge for `design-twitter` (LeetCode 355). Generated exercises,
// clearly labelled as generated in each title/statement.
// The live record (shard-6.json id 355) carries judge:null — a design/class
// problem with no single-call judge — so this forge documents an honest TEST
// PROFILE: runTwitterOps(ops, callArgs) -> string, where ops is the op-name
// array, callArgs the parallel int-arg arrays, and the return is the per-slot
// output literal (null for constructor/void ops, newest-first id arrays for
// feeds), e.g. the official example returns `[null,null,[5],null,null,[6,5],null,[5]]`.
// Precedents: mergeKLists(int[][])->int[], runTrieOps(string[],string[])->string.
// Comparison is ops-sequence exact: void slots must be null and every feed
// slot must match in order (newest first, cap 10); [6,5] != [5,6].
// Every `expected` below is produced at build time by oracleSequence (a global
// append-only log scanned newest-first with a follow-set filter — an
// INDEPENDENT algorithm from the walkthrough's k-way heap merge) and
// cross-checked against referenceRunOps (the heap merge); any disagreement
// throws so a bad literal can never ship as "verified".
// Deterministic: fixed transcripts, no RNG.

export const SLUG = 'design-twitter'

export const SIGNATURE = {
  name: 'runTwitterOps',
  params: [
    { name: 'ops', type: 'string[]' },
    { name: 'callArgs', type: 'int[][]' },
  ],
  return: 'string',
}

export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

// INDEPENDENT oracle: global append-only log scanned newest-first with a
// follow-set filter. No lanes, no heap, no cursors — deliberately different
// from the walkthrough/reference k-way merge.
export function oracleFeed(log, follows, userId) {
  const visible = new Set([userId])
  const set = follows.get(userId)
  if (set) for (const u of set) visible.add(u)
  const out = []
  for (let i = log.length - 1; i >= 0 && out.length < 10; i--) {
    if (visible.has(log[i].user)) out.push(log[i].tweet)
  }
  return out
}

// Replay a full ops-sequence through the oracle; returns per-slot outputs
// (null for void ops, number[] for feeds).
export function oracleSequence(ops, callArgs) {
  const log = []
  const follows = new Map()
  const who = (u) => {
    let s = follows.get(u)
    if (!s) { s = new Set([u]); follows.set(u, s) }
    return s
  }
  const out = []
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]
    const a = callArgs[i] || []
    if (op === 'Twitter') out.push(null)
    else if (op === 'postTweet') { log.push({ user: a[0], tweet: a[1] }); who(a[0]); out.push(null) }
    else if (op === 'getNewsFeed') { who(a[0]); out.push(oracleFeed(log, follows, a[0])) }
    else if (op === 'follow') { if (a[0] !== a[1]) who(a[0]).add(a[1]); who(a[1]); out.push(null) }
    else if (op === 'unfollow') { if (a[0] !== a[1]) who(a[0]).delete(a[1]); out.push(null) }
    else throw new Error('unknown op: ' + op)
  }
  return out
}

// Cross-check reference: k-way max-merge over stamped lanes (the walkthrough
// algorithm class). Lanes hold {time, tweet} oldest-first; cursors walk
// newest-to-oldest; 10-cap.
export function referenceRunOps(ops, callArgs) {
  const lanes = new Map()
  const follows = new Map()
  const who = (u) => {
    let s = follows.get(u)
    if (!s) { s = new Set([u]); follows.set(u, s) }
    return s
  }
  let time = 0
  const higher = (a, b) => a.time > b.time
  const out = []
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]
    const a = callArgs[i] || []
    if (op === 'Twitter') { out.push(null); continue }
    if (op === 'postTweet') {
      if (!lanes.get(a[0])) lanes.set(a[0], [])
      lanes.get(a[0]).push({ time: time++, tweet: a[1] })
      who(a[0])
      out.push(null)
      continue
    }
    if (op === 'follow') {
      if (a[0] !== a[1]) { who(a[0]).add(a[1]); who(a[1]) }
      out.push(null)
      continue
    }
    if (op === 'unfollow') {
      if (a[0] !== a[1]) who(a[0]).delete(a[1])
      out.push(null)
      continue
    }
    if (op === 'getNewsFeed') {
      const set = who(a[0])
      const heap = []
      const cursor = new Map()
      const down = (k) => {
        for (;;) {
          const l = 2 * k + 1, r = l + 1
          let b = k
          if (l < heap.length && higher(heap[l], heap[b])) b = l
          if (r < heap.length && higher(heap[r], heap[b])) b = r
          if (b === k) break
          ;[heap[b], heap[k]] = [heap[k], heap[b]]
          k = b
        }
      }
      const up = (k) => {
        while (k > 0) {
          const p = (k - 1) >> 1
          if (higher(heap[p], heap[k])) break
          ;[heap[p], heap[k]] = [heap[k], heap[p]]
          k = p
        }
      }
      for (const u of set) {
        const lane = lanes.get(u)
        if (!lane || lane.length === 0) continue
        const idx = lane.length - 1
        cursor.set(u, idx)
        heap.push({ time: lane[idx].time, tweet: lane[idx].tweet, user: u })
        up(heap.length - 1)
      }
      const feed = []
      while (heap.length > 0 && feed.length < 10) {
        const top = heap[0]
        const last = heap.pop()
        if (heap.length > 0) { heap[0] = last; down(0) }
        feed.push(top.tweet)
        const idx = cursor.get(top.user) - 1
        cursor.set(top.user, idx)
        const lane = lanes.get(top.user)
        if (idx >= 0) { heap.push({ time: lane[idx].time, tweet: lane[idx].tweet, user: top.user }); up(heap.length - 1) }
      }
      out.push(feed)
      continue
    }
    throw new Error('unknown op: ' + op)
  }
  return out
}

const toSlot = (v) => (v === null || v === undefined ? 'null' : JSON.stringify(v))
const outputLiteral = (slots) => '[' + slots.map(toSlot).join(',') + ']'
const qstr = (v) => JSON.stringify(v)

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

function toTest(ops, callArgs) {
  const fromOracle = oracleSequence(ops, callArgs)
  const fromRef = referenceRunOps(ops, callArgs)
  if (JSON.stringify(fromOracle) !== JSON.stringify(fromRef)) {
    throw new Error('design-twitter practice oracle disagreement on ' + JSON.stringify(ops))
  }
  return { args: [qstr(ops), qstr(callArgs)], expected: qstr(outputLiteral(fromOracle)) }
}

const CASES = {
  v1: {
    seedLabel: 'fresh two-user net',
    intent: 'Same ops profile on fresh ids so you reproduce the merge walk, not the memory.',
    statement:
      'Generated drill under the honest ops-sequence test profile: two fresh users post, one follows the other, and both read their feeds. ' +
      'The first test replays the official 8-op example verbatim so the profile output matches the problem statement. ' +
      'Void slots read null; every feed slot is newest-first with the 10-cap.',
    seqs: [
      {
        ops: ['Twitter', 'postTweet', 'getNewsFeed', 'follow', 'postTweet', 'getNewsFeed', 'unfollow', 'getNewsFeed'],
        args: [[], [1, 5], [1], [1, 2], [2, 6], [1], [1, 2], [1]],
      },
      {
        ops: ['Twitter', 'postTweet', 'postTweet', 'follow', 'postTweet', 'getNewsFeed', 'getNewsFeed'],
        args: [[], [3, 11], [7, 12], [3, 7], [3, 13], [3], [7]],
      },
      {
        ops: ['Twitter', 'postTweet', 'getNewsFeed'],
        args: [[], [5, 21], [5]],
      },
    ],
    hints: [
      'A user sees his own posts with no follows; the follow only adds the followee lane.',
      'The newest post across ALL visible lanes comes first, not the newest follow.',
    ],
  },
  v2: {
    seedLabel: 'cap and empty feed',
    intent: 'Same profile at the boundaries the worked example hides.',
    statement:
      'Generated boundary run under the same ops-sequence profile: one user posts 12 tweets then reads a feed (only the 10 newest, newest first), and a lonely user with no posts reads an empty feed. ' +
      'A feed with nothing visible is [], not null. ' +
      'Self-follows are no-ops per the constraints.',
    seqs: [
      {
        ops: ['Twitter', 'postTweet', 'postTweet', 'postTweet', 'postTweet', 'postTweet', 'postTweet', 'postTweet', 'postTweet', 'postTweet', 'postTweet', 'postTweet', 'postTweet', 'getNewsFeed', 'getNewsFeed'],
        args: [[], [9, 101], [9, 102], [9, 103], [9, 104], [9, 105], [9, 106], [9, 107], [9, 108], [9, 109], [9, 110], [9, 111], [9, 112], [9], [400]],
      },
      {
        ops: ['Twitter', 'getNewsFeed'],
        args: [[], [8]],
      },
      {
        ops: ['Twitter', 'postTweet', 'follow', 'getNewsFeed'],
        args: [[], [2, 31], [2, 2], [2]],
      },
    ],
    hints: [
      'The cap keeps the 10 NEWEST: the two oldest posts drop out entirely.',
      'A user with no visible posts gets [], not null.',
    ],
  },
  v3: {
    seedLabel: 'unfollow staleness',
    intent: 'Same profile with a transfer trap: visibility is per-call, not historical.',
    statement:
      'Generated transfer case under the same profile: follow, read, unfollow (the lane must vanish), read again, then the followee posts and is refollowed. ' +
      'Recency is by post stamp, not by follow order; already-returned feeds never change. ' +
      'The rule and output shape are unchanged.',
    seqs: [
      {
        ops: ['Twitter', 'postTweet', 'postTweet', 'follow', 'getNewsFeed', 'unfollow', 'getNewsFeed', 'postTweet', 'follow', 'getNewsFeed'],
        args: [[], [61, 501], [55, 502], [55, 61], [55], [55, 61], [55], [61, 503], [55, 61], [55]],
      },
      {
        ops: ['Twitter', 'postTweet', 'postTweet', 'follow', 'getNewsFeed'],
        args: [[], [71, 601], [72, 602], [71, 72], [71]],
      },
      {
        ops: ['Twitter', 'postTweet', 'unfollow', 'getNewsFeed'],
        args: [[], [81, 701], [81, 82], [81]],
      },
    ],
    hints: [
      'Unfollow removes the lane from LATER feeds; already-returned feeds never change.',
      'A post made while unfollowed becomes visible again on refollow — visibility is per-call.',
    ],
  },
}

function buildOne(id, spec, signature, difficulty, baseTitle) {
  const tests = spec.seqs.map(({ ops, args }) => toTest(ops, args))
  const first = tests[0]
  return {
    id,
    seedLabel: spec.seedLabel,
    intent: spec.intent,
    difficulty,
    title: baseTitle + ' — ' + spec.seedLabel + ' (generated, same task)',
    statement: spec.statement,
    signature: cloneSignature(signature),
    examples: [{ input: inputLine(signature, first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: spec.hints.slice(0, 2),
    note: 'Generated transcript (fixed); test profile runTwitterOps replays ops/callArgs and returns the output literal. Real LeetCode profile is the Twitter class transcript.',
  }
}

// Live-forge-compatible builder: (problem, signature, rng) => 3 variants.
// Returns [] on an incompatible signature (never builds against it).
export function buildDesignTwitterVariants(problem, signature, rng) {
  void rng
  const sig = signature || (problem && problem.signature) || SIGNATURE
  if (!sig || sig.name !== 'runTwitterOps' || sig.return !== 'string') return []
  const params = Array.isArray(sig.params) ? sig.params : []
  if (params.length !== 2) return []
  const base = String((problem && (problem.title || problem.slug)) || 'Design Twitter')
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
  oracle: 'oracleSequence (global append-only log scanned newest-first with follow-set filter; no lanes, no heap)',
})
