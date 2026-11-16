/**
 * reverse-nodes-in-k-group — live semantic adapter (linked-list).
 *
 * Walkthrough algorithm: dummy anchor + seam pointer; per group, probe k links
 * ahead (short tail breaks untouched), flip the certified segment in place
 * seeding prev with groupNext, reconnect seam to kth, advance the seam.
 * O(n) time, O(1) extra space.
 *
 * Staged sources: `.workers/jobs/neetcode150-completion/reverse-nodes-in-k-group/`
 * (reference.java/cpp, notes.md step map) + `builder.js` (real pointer-surgery
 * frame emitter, ported below to the shared `frame` helper). Signature equals
 * the live judge signature exactly.
 *
 * Visual bound: at most 12 nodes per walkthrough (judge allows up to 5000).
 * Longer runs must supply their own slice; this module throws an honest error
 * instead of silently truncating.
 */
import { code, frame, boundedFrames } from './semantic-core.js'

// boundedFrames is applied by semantic.js (single compaction pass); the import
// keeps this adapter on the shared helper contract. Adapters return FULL lists.

const MAX_NODES = 12

const kGroupJava = code(`
[def] // Definition for singly-linked list (provided by the judge).
[def] // public class ListNode { int val; ListNode next; }
[def] class Solution {
[def]     public ListNode reverseKGroup(ListNode head, int k) {
[init]         ListNode dummy = new ListNode(0, head);
[init]         ListNode groupPrev = dummy;
[probe]         while (true) {
[probe]             ListNode kth = groupPrev;
[probe]             for (int i = 0; i < k; i++) kth = kth.next;
[tail]             if (kth == null) break;
[link]             ListNode groupNext = kth.next;
[link]             ListNode prev = groupNext;
[link]             ListNode curr = groupPrev.next;
[link]             while (curr != groupNext) {
[link]                 ListNode nxt = curr.next;
[link]                 curr.next = prev;
[link]                 prev = curr;
[link]                 curr = nxt;
[def]             }
[connect]             ListNode tail = groupPrev.next;
[connect]             groupPrev.next = kth;
[connect]             groupPrev = tail;
[def]         }
[verify]         // every certified group flipped; a short tail stays linked as-is.
[return]         return dummy.next;
[def]     }
[def] }
`)

const kGroupCpp = code(`
[def] // Definition for singly-linked list (provided by the judge).
[def] // struct ListNode { int val; ListNode *next; };
[def] class Solution {
[def] public:
[def]     ListNode* reverseKGroup(ListNode* head, int k) {
[init]         ListNode dummy(0, head);
[init]         ListNode* groupPrev = &dummy;
[probe]         while (true) {
[probe]             ListNode* kth = groupPrev;
[probe]             for (int i = 0; i < k; i++) kth = kth->next;
[tail]             if (kth == nullptr) break;
[link]             ListNode* groupNext = kth->next;
[link]             ListNode* prev = groupNext;
[link]             ListNode* curr = groupPrev->next;
[link]             while (curr != groupNext) {
[link]                 ListNode* nxt = curr->next;
[link]                 curr->next = prev;
[link]                 prev = curr;
[link]                 curr = nxt;
[def]             }
[connect]             ListNode* tail = groupPrev->next;
[connect]             groupPrev->next = kth;
[connect]             groupPrev = tail;
[def]         }
[verify]         // every certified group flipped; a short tail stays linked as-is.
[return]         return dummy.next;
[def]     }
[def] };
`)

const kGroupPseudo = code(`
[def] reverseKGroup(head, k):
[init]   dummy = ListNode(0, head); groupPrev = dummy
[probe]   loop forever:
[probe]     kth = groupPrev; step k links forward
[tail]     if kth is null: break (short tail stays as-is)
[link]     groupNext = kth.next; prev = groupNext; curr = groupPrev.next
[link]     while curr != groupNext: nxt = curr.next; curr.next = prev; prev = curr; curr = nxt
[connect]   tail = groupPrev.next; groupPrev.next = kth; groupPrev = tail
[verify]   every certified group flipped exactly once
[return]   return dummy.next
`)

function decodeList(value) {
  if (value === null || value === undefined) return []
  if (!Array.isArray(value)) throw new Error('k-group walkthrough needs head as an array of 1..12 node values')
  if (value.length < 1 || value.length > MAX_NODES) {
    throw new Error(`k-group walkthrough needs 1..${MAX_NODES} nodes; got ${value.length}`)
  }
  value.forEach((v, i) => {
    if (!Number.isSafeInteger(v) || v < 0 || v > 1000) throw new Error(`head[${i}] must be an integer in [0,1000]`)
  })
  return value.slice()
}

function decodeK(value, n) {
  const k = typeof value === 'number' ? value : Number(value)
  if (!Number.isSafeInteger(k) || k < 1 || k > n) throw new Error(`k-group walkthrough needs 1 <= k <= n (n=${n}); got ${value}`)
  return k
}

function checkedArgs(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('reverse-nodes-in-k-group expects [head, k]')
  const values = decodeList(args[0])
  const k = decodeK(args[1], values.length)
  return { values, k }
}

function label(id, values) {
  if (id === null || id === undefined) return 'null'
  if (id === -1) return 'dummy'
  return `node${id}(${values[id]})`
}

const ptr = (id) => (id === -1 ? null : id)

export function buildReverseKGroup(args) {
  const { values: source, k } = checkedArgs(args)
  const n = source.length
  const values = source.slice()
  // Stable node identities 0..n-1; next[] holds a node id or null.
  // groupPrev uses -1 for the dummy head (rendered as null pointer + label).
  const next = values.map((_, i) => (i + 1 < n ? i + 1 : null))
  let headId = 0
  let groupPrev = -1
  const frames = []
  const anchors = []

  const snapNodes = () => values.map((value, id) => ({ id, value, next: next[id] }))
  const chainValues = () => {
    const out = []
    let id = headId
    const guard = new Set()
    while (id !== null && !guard.has(id)) {
      guard.add(id)
      out.push(values[id])
      id = next[id]
    }
    return out
  }
  const stateOf = (current, extra) => ({
    current,
    nodes: snapNodes(),
    pointers: { groupPrev: ptr(groupPrev), ...(extra && extra.pointers ? extra.pointers : {}) },
    removed: [],
    answer: chainValues(),
    vars: { groupPrev: label(groupPrev, values), k, n, ...(extra && extra.vars ? extra.vars : {}) },
  })
  const push = (step, lbl, note, st) => {
    frames.push(frame(step, lbl, note, st))
  }

  anchors.push(0)
  push(
    'init',
    'Initialize',
    `n=${n}, k=${k}; dummy->${label(headId, values)}; groupPrev=dummy`,
    stateOf(ptr(groupPrev), { pointers: { curr: headId }, vars: { curr: label(headId, values) } })
  )

  let groupNo = 0
  for (;;) {
    // Probe k nodes ahead of groupPrev using the REAL next[] links.
    const first = groupPrev === -1 ? headId : next[groupPrev]
    let kth = first
    for (let i = 1; i < k && kth !== null; i++) kth = next[kth]
    if (kth === null) {
      // Short tail: count what is left from the real chain.
      let r = 0
      let id = first
      const guard = new Set()
      while (id !== null && !guard.has(id)) {
        guard.add(id)
        r++
        id = next[id]
      }
      push(
        'tail',
        'Short tail kept',
        `${r} node(s) left, fewer than k=${k}; keep order`,
        stateOf(ptr(groupPrev), { pointers: { curr: first }, vars: { curr: label(first, values), remainder: r } })
      )
      break
    }
    groupNo++
    anchors.push(frames.length)
    push(
      'probe',
      `Group ${groupNo} found`,
      `nodes ${label(first, values)}..${label(kth, values)}; kth=${label(kth, values)}`,
      stateOf(ptr(groupPrev), {
        pointers: { curr: first, kth },
        vars: { curr: label(first, values), kth: label(kth, values) },
      })
    )
    // Reverse exactly this segment toward groupNext (real rewiring).
    const groupNext = next[kth]
    let prev = groupNext
    let curr = first
    while (curr !== groupNext) {
      const oldPrev = prev
      const nxt = next[curr]
      next[curr] = prev
      prev = curr
      const doneId = curr
      curr = nxt
      push(
        'link',
        'Flip link',
        `${label(doneId, values)}.next->${label(oldPrev, values)}; prev=${label(doneId, values)}`,
        stateOf(ptr(curr), {
          pointers: { curr: ptr(curr), prev: doneId, kth },
          vars: { curr: label(curr, values), prev: label(doneId, values), kth: label(kth, values) },
        })
      )
    }
    // Reconnect the reversed segment (real rewiring).
    if (groupPrev === -1) headId = kth
    else next[groupPrev] = kth
    groupPrev = first
    anchors.push(frames.length)
    push(
      'connect',
      `Reconnect group ${groupNo}`,
      `head of group=${label(kth, values)}; groupPrev=${label(groupPrev, values)}`,
      stateOf(ptr(groupPrev), {
        pointers: { groupPrev: ptr(groupPrev), kth },
        vars: { kth: label(kth, values) },
      })
    )
  }

  const result = chainValues()
  push(
    'verify',
    'Chain check',
    `head=${label(headId, values)}; ${result.length} node(s) linked`,
    stateOf(headId, { pointers: { head: headId }, vars: { head: label(headId, values) } })
  )
  anchors.push(frames.length)
  push(
    'return',
    'Return head',
    `return dummy.next; result [${result.join(',')}]`,
    stateOf(headId, { pointers: { head: headId }, vars: { head: label(headId, values) } })
  )
  anchors.push(frames.length - 1)

  const initialEdges = values.map((_, i) => (i + 1 < n ? [i, i + 1] : null)).filter(Boolean)
  return {
    kind: 'linked-list',
    layout: {
      values: values.slice(),
      nodes: values.map((value, id) => ({ id, value })),
      edges: initialEdges,
    },
    frames,
    result,
    anchors: [...new Set(anchors.filter((i) => Number.isInteger(i) && i >= 0 && i < frames.length))].sort((a, b) => a - b),
  }
}

export const adapters = {
  'reverse-nodes-in-k-group': {
    signature: { name: 'reverseKGroup', params: ['ListNode', 'int'], return: 'ListNode' },
    lesson: {
      idea: 'Probe k nodes first; flip only certified groups in place, and leave a short tail linked as-is.',
      trap: 'Flip before counting and a short tail ends half-reversed; seed prev with groupNext, not null.',
      time: 'O(n)',
      space: 'O(1)',
    },
    explain: {
      def: 'Scope wrapper around the k-group reversal; no pointer work happens on these lines.',
      init: 'Anchor a dummy before the head so group 1 needs no special case; dummy.next always tracks the answer.',
      probe: 'Walk k links from the seam; landing on kth certifies a full group, a missing link proves a tail.',
      tail: 'Fewer than k nodes remain: break with the tail already linked, leaving its order untouched.',
      link: 'Flip one group link toward prev after saving nxt; skipping the save loses the rest of the list.',
      connect: 'Stitch the seam to the group new head kth and move the seam to the group tail for the next probe.',
      verify: 'Read the chain from dummy.next once all groups are done; every node appears exactly once.',
      return: 'Return dummy.next, the only pointer that tracks the new head after group 1 moves it.',
    },
    explainLines: {
      java: {
        9: 'Short-tail exit: kth is missing, so break with the tail already linked in order.',
        18: 'End of the flip loop: all k group links now point backward.',
        22: 'End of one group pass: the seam moved to the group tail for the next probe.',
        24: 'Report dummy.next, which tracked the new head since group 1 moved it.',
      },
      cpp: {
        10: 'Short-tail exit: kth is missing, so break with the tail already linked in order.',
        19: 'End of the flip loop: all k group links now point backward.',
        23: 'End of one group pass: the seam moved to the group tail for the next probe.',
        25: 'Report dummy.next, which tracked the new head since group 1 moved it.',
      },
      pseudo: {
        6: 'One flip pass over the certified group: save, redirect, advance until groupNext.',
      },
    },
    code: { java: kGroupJava, cpp: kGroupCpp, pseudo: kGroupPseudo },
    build: buildReverseKGroup,
  },
}
