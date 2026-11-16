/**
 * add-two-numbers — portable per-slug staged adapter (Linked List).
 *
 * Walkthrough scene for slug `add-two-numbers` (Add Two Numbers, Medium).
 * Live record: plugin/data/shard-5.json, problem 2, judgeable YES —
 *   addTwoNumbers(l1: ListNode, l2: ListNode) -> ListNode, mode exact.
 * The adapter `signature` below equals that live judge signature exactly
 * (name/return/param types), so the walkthrough never throws.
 *
 * Real operation (mirrors the judge-proven loop in tools/judge_smoke.mjs):
 * dummy head + carry loop; exhausted lists read as 0; the loop continues while
 * l1 || l2 || carry; each position writes sum%10 and carries sum/10.
 *
 * Scene contract (host `linked-list` shape): input chains l1 (ids 0..m-1) and
 * l2 (ids 100..) never rewire; result nodes (ids 200..) appear only once their
 * `emit` frame writes them. Uncomputed arithmetic stays null (never 0, never
 * a future value).
 *
 * Pure ES module: no DOM, no network, no dependencies besides semantic-core.js.
 * Visual bound MAX_VIS_NODES=12 per list (judge allows 100); longer inputs are
 * declined with a clear message, never clipped silently.
 */

import { code, frame, boundedFrames } from './semantic-core.js'

export const SLUG = 'add-two-numbers'

// Live judge signature, exactly (judgeable slug): name/return/param types match
// plugin/data/shard-5.json :: add-two-numbers judge.signature.
export const SIGNATURE = {
  name: 'addTwoNumbers',
  params: ['ListNode', 'ListNode'],
  return: 'ListNode',
}

export const MODE = 'exact'

const L2_BASE = 100
const RES_BASE = 200
const MAX_VIS_NODES = 12

function toDigits(raw, name) {
  let arr = raw
  if (typeof arr === 'string') {
    const t = arr.trim()
    if (t === '') throw new Error(name + ' must be a JSON digit array like "[2,4,3]"')
    arr = JSON.parse(t)
  }
  if (!Array.isArray(arr)) throw new Error(name + ' must be an array of digits 0..9')
  if (arr.length < 1) throw new Error(name + ' needs at least 1 node (lists are non-empty)')
  if (arr.length > MAX_VIS_NODES) {
    throw new Error('Visual walkthrough limited to ' + MAX_VIS_NODES + ' nodes per list; ' + name + ' has ' + arr.length)
  }
  arr.forEach((v, i) => {
    if (!Number.isInteger(v) || v < 0 || v > 9) {
      throw new Error(name + '[' + i + '] must be a digit 0..9 (got ' + String(v) + ')')
    }
  })
  return arr.slice()
}

const clipText = (value, max) => {
  const s = String(value)
  return s.length <= max ? s : s.slice(0, max - 1) + '…'
}

/**
 * Real execution trace: digit-wise addition with carry.
 * Exhausted-list reads are recorded as real 0 reads; the final extra step
 * (both ended, carry 1) is a real loop iteration.
 */
export function addTwoNumbersTrace(aRaw, bRaw) {
  const a = toDigits(aRaw, 'l1')
  const b = toDigits(bRaw, 'l2')
  const steps = []
  const result = []
  let carry = 0
  const n = Math.max(a.length, b.length)
  for (let i = 0; i < n; i++) {
    const x = i < a.length ? a[i] : 0
    const y = i < b.length ? b[i] : 0
    const sum = x + y + carry
    const digit = sum % 10
    const carryOut = Math.floor(sum / 10)
    steps.push({ i, a: x, b: y, carryIn: carry, sum, digit, carryOut })
    result.push(digit)
    carry = carryOut
  }
  if (carry > 0) {
    steps.push({ i: n, a: 0, b: 0, carryIn: carry, sum: carry, digit: carry, carryOut: 0 })
    result.push(carry)
  }
  return { result, steps }
}

const addJava = code(`
[input] class Solution {
[input]     public ListNode addTwoNumbers(ListNode l1, ListNode l2) {
[setup]         ListNode dummy = new ListNode(0), cur = dummy;
[setup]         int carry = 0;
[read]         while (l1 != null || l2 != null || carry != 0) {
[read]             int a = l1 == null ? 0 : l1.val;
[read]             int b = l2 == null ? 0 : l2.val;
[read]             int sum = a + b + carry;
[emit]             carry = sum / 10;
[emit]             cur.next = new ListNode(sum % 10);
[emit]             cur = cur.next;
[read]             if (l1 != null) l1 = l1.next;
[read]             if (l2 != null) l2 = l2.next;
[read]         }
[done]         return dummy.next;
[input]     }
[input] }
`)

const addCpp = code(`
[input] class Solution {
[input] public:
[input]     ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
[setup]         ListNode dummy(0); ListNode* cur = &dummy; int carry = 0;
[read]         while (l1 || l2 || carry) {
[read]             int a = l1 ? l1->val : 0;
[read]             int b = l2 ? l2->val : 0;
[read]             int sum = a + b + carry;
[emit]             carry = sum / 10;
[emit]             cur->next = new ListNode(sum % 10);
[emit]             cur = cur->next;
[read]             if (l1) l1 = l1->next;
[read]             if (l2) l2 = l2->next;
[read]         }
[done]         return dummy.next;
[input]     }
[input] };
`)

const addPseudo = code(`
[input] addTwoNumbers(l1, l2):
[setup]   dummy ← node(0); cur ← dummy; carry ← 0
[read]   while l1 ≠ null or l2 ≠ null or carry ≠ 0:
[read]     x ← l1?.val ?? 0
[read]     y ← l2?.val ?? 0
[read]     s ← x + y + carry
[emit]     carry ← s div 10
[emit]     cur.next ← node(s mod 10); cur ← cur.next
[read]     l1 ← l1?.next; l2 ← l2?.next
[done]   return dummy.next
`)

const EXPLAIN = {
  input: 'Observe both input chains; heads hold the least-significant digits (reversed storage).',
  setup: 'Anchor a dummy head for the result and zero the carry; the tail pointer restores O(1) appends.',
  read: 'Read this position: a and b (0 when that list ended), plus carry-in, combined into sum.',
  emit: 'Write sum%10 as a new node and carry sum/10 forward; the tens place already moved into carry.',
  done: 'Both lists ended with no carry left; skip the placeholder and return dummy.next.',
}

export const EXPLAIN_LINES = {
  java: {
    4: 'Loop while EITHER list has digits OR a leftover carry needs its own node.',
    12: 'Consumed input nodes are never revisited; advance past them null-safely.',
    14: 'Skip the placeholder dummy: for [0]+[0] this is the single node 0, never null.',
  },
  cpp: {
    4: 'Loop while EITHER list has digits OR a leftover carry needs its own node.',
    12: 'Consumed input nodes are never revisited; advance past them null-safely.',
    14: 'Skip the placeholder dummy: for [0]+[0] this is the single node 0, never null.',
  },
  pseudo: {},
}

// Every frame below is a REAL execution event: input, setup, one read+emit
// pair per trace step (including the final-carry step), plus done.
const labelOf = (id, values) => (id === null || id === undefined ? 'null' : 'node' + id + '(' + values[id] + ')')

function build(args) {
  if (!Array.isArray(args) || args.length !== 2) {
    throw new Error('addTwoNumbers needs [l1, l2] as its two walkthrough inputs')
  }
  const first = toDigits(args[0], 'l1')
  const second = toDigits(args[1], 'l2')
  const m = first.length
  const n = second.length
  const { result, steps } = addTwoNumbersTrace(first, second)

  const values = first.concat(second)
  const idOfL1 = (i) => i
  const idOfL2 = (j) => L2_BASE + j
  const idOfRes = (k) => RES_BASE + k
  const valueOf = new Map()
  first.forEach((v, i) => valueOf.set(idOfL1(i), v))
  second.forEach((v, j) => valueOf.set(idOfL2(j), v))

  const inputNext = new Map()
  first.forEach((_, i) => inputNext.set(idOfL1(i), i + 1 < m ? idOfL1(i + 1) : null))
  second.forEach((_, j) => inputNext.set(idOfL2(j), j + 1 < n ? idOfL2(j + 1) : null))

  const frames = []
  const anchors = []

  const snapNodes = (resCount) => {
    const nodes = []
    first.forEach((v, i) => nodes.push({ id: idOfL1(i), value: v, next: inputNext.get(idOfL1(i)) }))
    second.forEach((v, j) => nodes.push({ id: idOfL2(j), value: v, next: inputNext.get(idOfL2(j)) }))
    for (let k = 0; k < resCount; k++) {
      nodes.push({ id: idOfRes(k), value: result[k], next: k + 1 < resCount ? idOfRes(k + 1) : null })
    }
    return nodes
  }
  const head1 = m > 0 ? idOfL1(0) : null
  const head2 = n > 0 ? idOfL2(0) : null

  const state = (emitted, extra) => {
    const answer = result.slice(0, emitted)
    const tail = emitted === 0 ? null : idOfRes(emitted - 1)
    const p1 = extra && 'p1' in extra ? extra.p1 : (emitted < m ? idOfL1(emitted) : null)
    const p2 = extra && 'p2' in extra ? extra.p2 : (emitted < n ? idOfL2(emitted) : null)
    return {
      current: tail,
      nodes: snapNodes(emitted),
      pointers: { p1: extra && extra.p1done ? null : p1, p2: extra && extra.p2done ? null : p2, tail },
      answer: answer.slice(),
      values: answer.slice(),
      vars: {
        i: extra && extra.i !== undefined ? extra.i : null,
        a: extra && extra.a !== undefined ? extra.a : null,
        b: extra && extra.b !== undefined ? extra.b : null,
        carryIn: extra && extra.carryIn !== undefined ? extra.carryIn : null,
        sum: extra && extra.sum !== undefined ? extra.sum : null,
        digit: extra && extra.digit !== undefined ? extra.digit : null,
        carryOut: extra && extra.carryOut !== undefined ? extra.carryOut : null,
        m, n, k: emitted,
      },
    }
  }
  const push = (step, label, note, st) => {
    frames.push(frame(step, clipText(label, 40), clipText(note, 140), st))
  }

  anchors.push(0)
  push('input', 'Inputs (reversed digits)',
    'l1=[' + first.join(',') + '] l2=[' + second.join(',') + ']; heads hold least-significant digits.',
    state(0, { i: null, a: null, b: null, carryIn: null, sum: null, digit: null, carryOut: null }))
  push('setup', 'Dummy head, carry=0',
    'dummy(0) anchors result; tail=dummy; p1=' + labelOf(head1, Object.fromEntries(valueOf)) + '; p2=' + labelOf(head2, Object.fromEntries(valueOf)) + '.',
    state(0, { i: null, a: null, b: null, carryIn: 0, sum: null, digit: null, carryOut: null }))
  anchors.push(1)

  steps.forEach((s, k) => {
    const partial = result.slice(0, k)
    const partialTxt = partial.length ? '[' + partial.join(',') + ']' : '[]'
    const src1 = s.i < m ? 'l1[' + s.i + ']=' + s.a : 'l1 ended→0'
    const src2 = s.i < n ? 'l2[' + s.i + ']=' + s.b : 'l2 ended→0'
    push('read', 'Read position ' + s.i,
      'read ' + src1 + ', ' + src2 + ', carry ' + s.carryIn + ' → sum=' + s.sum + '; out=' + partialTxt + ' (candidate).',
      state(k, { i: s.i, a: s.a, b: s.b, carryIn: s.carryIn, sum: s.sum, digit: null, carryOut: null }))
    anchors.push(frames.length - 1)
    const grown = result.slice(0, k + 1)
    push('emit', 'Write digit ' + s.digit,
      'node(' + s.digit + ') appended; result=[' + grown.join(',') + ']; carry ' + s.carryOut + ' to next.',
      state(k + 1, { i: s.i, a: s.a, b: s.b, carryIn: s.carryIn, sum: s.sum, digit: s.digit, carryOut: s.carryOut }))
  })

  push('done', 'Return sum list',
    'both lists ended, carry 0 → [' + result.join(',') + ']; return dummy.next.',
    state(result.length, {
      i: null, a: null, b: null, carryIn: 0, sum: null, digit: null, carryOut: 0, p1done: true, p2done: true,
    }))
  anchors.push(frames.length - 1)

  const layoutNodes = []
  first.forEach((v, i) => layoutNodes.push({ id: idOfL1(i), value: v }))
  second.forEach((v, j) => layoutNodes.push({ id: idOfL2(j), value: v }))
  const layoutEdges = []
  first.forEach((_, i) => { if (i + 1 < m) layoutEdges.push([idOfL1(i), idOfL1(i + 1)]) })
  second.forEach((_, j) => { if (j + 1 < n) layoutEdges.push([idOfL2(j), idOfL2(j + 1)]) })

  // Single compaction pass (mirrors semantic.js): no-op under the 40-frame budget.
  const { frames: compact } = boundedFrames(frames, 40, anchors)
  return {
    kind: 'linked-list',
    layout: { values: result.slice(), nodes: layoutNodes, edges: layoutEdges },
    frames: compact,
    result: result.slice(),
    anchors: [...new Set(anchors.filter((x) => Number.isInteger(x) && x >= 0 && x < frames.length))].sort((a, b) => a - b),
  }
}

export const adapters = {
  'add-two-numbers': {
    // Live judge signature, exactly (judgeable slug).
    signature: SIGNATURE,
    lesson: {
      idea: 'Reversed storage aligns both numbers least-significant-digit-first, so one simultaneous low-to-high walk processes each decimal position exactly like paper addition, with carry as the only cross-position state.',
      trap: 'Dropping the final carry ([9,9]+[1] needs [0,0,1]); treating an exhausted list as end-of-loop instead of zeros (breaks unequal lengths); summing whole numbers with + overflows at 100 digits.',
      time: 'O(max(m, n)): one pass over the longer list plus at most one extra carry node.',
      space: 'O(1) auxiliary besides the output (at most max(m,n)+1 nodes).',
      alternate: 'Recursive per-position: add heads, recurse on .next with sum/10 as carry. Same time but O(max(m,n)) call-stack space with null-handling at every level, so the iterative dummy-head version is strictly better here.',
    },
    alternate: 'Recursive per-position: add heads, recurse on .next with sum/10 as carry. Same time but O(max(m,n)) call-stack space with null-handling at every level, so the iterative dummy-head version is strictly better here.',
    code: { java: addJava, cpp: addCpp, pseudo: addPseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
}
