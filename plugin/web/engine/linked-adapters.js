import { code, frame } from './semantic-core.js'

// Visual bound for the walkthrough scene (judge allows up to 5000 nodes).
// Raw event count is 4n+3, so n=9 stays <=40 without compaction; longer
// visual runs rely on anchors + the single boundedFrames pass in semantic.js.
const MAX_NODES = 12
const MIN_VAL = -5000
const MAX_VAL = 5000

function decodeList(value) {
  if (value === null) return []
  if (!Array.isArray(value)) throw new Error('Provide head as an array of at most ' + MAX_NODES + ' integers')
  if (value.length > MAX_NODES) throw new Error('Visual walkthrough limited to ' + MAX_NODES + ' nodes; got ' + value.length)
  value.forEach((v, i) => {
    if (!Number.isSafeInteger(v)) throw new Error('head[' + i + '] must be an integer')
    if (v < MIN_VAL || v > MAX_VAL) throw new Error('head[' + i + '] out of range [' + MIN_VAL + ', ' + MAX_VAL + ']')
  })
  return value.slice()
}

const labelOf = (id, values) => (id === null ? 'null' : 'node' + id + '(' + values[id] + ')')

const reverseJava = code(`
[def] // Definition for singly-linked list (provided by the judge).
[def] // public class ListNode { int val; ListNode next; }
[def] class Solution {
[def]     public ListNode reverseList(ListNode head) {
[init]         ListNode prev = null;
[init]         ListNode curr = head;
[check]         while (curr != null) {
[save]             ListNode nxt = curr.next;
[link]             curr.next = prev;
[advance]             prev = curr;
[advance]             curr = nxt;
[def]         }
[return]         return prev;
[def]     }
[def] }
`)

const reverseCpp = code(`
[def] // Definition for singly-linked list (provided by the judge).
[def] // struct ListNode { int val; ListNode *next; };
[def] class Solution {
[def] public:
[def]     ListNode* reverseList(ListNode* head) {
[init]         ListNode* prev = nullptr;
[init]         ListNode* curr = head;
[check]         while (curr != nullptr) {
[save]             ListNode* nxt = curr->next;
[link]             curr->next = prev;
[advance]             prev = curr;
[advance]             curr = nxt;
[def]         }
[return]         return prev;
[def]     }
[def] };
`)

const reversePseudo = code(`
[def] reverseList(head):
[init]   prev = null; curr = head
[check]   while curr != null:
[save]     nxt = curr.next
[link]     curr.next = prev
[advance]     prev = curr; curr = nxt
[return]   return prev
`)

function buildReverse(args) {
  const source = decodeList(args[0])
  const n = source.length
  // Stable node identities 0..n-1; next holds a node id or null.
  const next = source.map((_, i) => (i + 1 < n ? i + 1 : null))
  let prev = null
  let curr = n > 0 ? 0 : null
  let nxt = null
  const frames = []
  const anchors = []

  const snapNodes = () => source.map((value, id) => ({ id, value, next: next[id] }))
  const chainValues = () => {
    const out = []
    let id = prev
    const guard = new Set()
    while (id !== null && !guard.has(id)) {
      guard.add(id)
      out.push(source[id])
      id = next[id]
    }
    return out
  }
  const state = () => ({
    current: curr,
    nodes: snapNodes(),
    pointers: { prev, curr, nxt },
    answer: chainValues(),
    vars: { prev: labelOf(prev, source), curr: labelOf(curr, source), nxt: labelOf(nxt, source), n }
  })
  const push = (step, label, note) => frames.push(frame(step, label, note, state()))

  anchors.push(0)
  push('init', 'Initialize', 'n=' + n + '; prev=null; curr=' + labelOf(curr, source))

  while (curr !== null) {
    const c = curr
    push('check', 'Check curr', 'curr=' + labelOf(c, source) + ' != null; enter body')
    nxt = next[c]
    push('save', 'Save next', 'nxt=' + labelOf(nxt, source) + '; keep node' + c + ' successor')
    next[c] = prev
    anchors.push(frames.length)
    push('link', 'Reverse link', 'node' + c + '.next=' + labelOf(prev, source) + '; link flipped')
    prev = c
    curr = nxt
    push('advance', 'Advance pointers', 'prev=' + labelOf(prev, source) + '; curr=' + labelOf(curr, source))
  }

  push('check', 'Check curr', 'curr=null; exit loop')
  anchors.push(frames.length)
  push('return', 'Return prev', 'prev=' + labelOf(prev, source) + '; reversed head')
  anchors.push(frames.length - 1)

  const initialEdges = source.map((_, i) => (i + 1 < n ? [i, i + 1] : null)).filter(Boolean)
  return {
    kind: 'linked-list',
    layout: {
      values: source.slice(),
      nodes: source.map((value, id) => ({ id, value })),
      edges: initialEdges
    },
    frames,
    result: chainValues(),
    anchors: [...new Set(anchors.filter(i => Number.isInteger(i) && i >= 0 && i < frames.length))].sort((a, b) => a - b)
  }
}

// Visual bounds for the merge walkthrough scene (judge allows up to 50 nodes
// per list). Names are merge-specific: the file already declares MAX_NODES
// and decodeList for the single-list reverse walkthrough.
const MAX_MERGE_NODES = 7

function decodeMergeLists(value, name) {
  let raw = value
  if (typeof raw === 'string') raw = raw.trim() === '' ? [] : JSON.parse(raw)
  if (raw === null || raw === undefined) return []
  if (!Array.isArray(raw)) throw new Error(name + ' must be an array of at most ' + MAX_MERGE_NODES + ' integers')
  if (raw.length > MAX_MERGE_NODES) throw new Error('Visual walkthrough limited to ' + MAX_MERGE_NODES + ' nodes per list; ' + name + ' has ' + raw.length)
  raw.forEach((v, idx) => {
    if (!Number.isSafeInteger(v)) throw new Error(name + '[' + idx + '] must be an integer (got ' + String(v) + ')')
  })
  return raw.slice()
}

const mergeJava = code(`
[def] // Definition for singly-linked list (provided by the judge).
[def] // public class ListNode { int val; ListNode next; }
[def] class Solution {
[def]     public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
[init]         ListNode dummy = new ListNode(0);
[init]         ListNode tail = dummy;
[compare]         while (list1 != null && list2 != null) {
[compare]             if (list1.val <= list2.val) {
[take]                 tail.next = list1;
[take]                 list1 = list1.next;
[take]             } else {
[take]                 tail.next = list2;
[take]                 list2 = list2.next;
[take]             }
[take]             tail = tail.next;
[compare]         }
[drain]         tail.next = (list1 != null) ? list1 : list2;
[return]         return dummy.next;
[def]     }
[def] }
`)

const mergeCpp = code(`
[def] // Definition for singly-linked list (provided by the judge).
[def] // struct ListNode { int val; ListNode *next; };
[def] class Solution {
[def] public:
[def]     ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
[init]         ListNode dummy(0);
[init]         ListNode* tail = &dummy;
[compare]         while (list1 != nullptr && list2 != nullptr) {
[compare]             if (list1->val <= list2->val) {
[take]                 tail->next = list1;
[take]                 list1 = list1->next;
[take]             } else {
[take]                 tail->next = list2;
[take]                 list2 = list2->next;
[take]             }
[take]             tail = tail->next;
[compare]         }
[drain]         tail->next = (list1 != nullptr) ? list1 : list2;
[return]         return dummy.next;
[def]     }
[def] };
`)

const mergePseudo = code(`
[def] mergeTwoLists(list1, list2):
[init]   dummy = ListNode(0); tail = dummy
[compare]   while list1 != null and list2 != null:
[compare]     smaller = list1 if list1.val <= list2.val else list2
[take]     tail.next = smaller; advance that list; tail = tail.next
[drain]   tail.next = list1 if list1 != null else list2
[return]   return dummy.next
`)

function buildMerge(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('mergeTwoLists needs [list1, list2] as its two walkthrough inputs');
  const first = decodeMergeLists(args[0], 'list1')
  const second = decodeMergeLists(args[1], 'list2')
  const n1 = first.length
  const n2 = second.length
  // Stable node identities: 0..n1-1 back list1, n1..n1+n2-1 back list2.
  // Merging splices these same nodes (never copies values).
  const values = first.concat(second)
  const initialNext = values.map((_, id) => {
    if (id < n1) return id + 1 < n1 ? id + 1 : null
    const k = id - n1
    return k + 1 < n2 ? id + 1 : null
  })
  const next = initialNext.slice()
  let head1 = n1 > 0 ? 0 : null
  let head2 = n2 > 0 ? n1 : null
  const order = []
  const frames = []
  const labelOf = (id) => (id === null ? 'null' : 'node' + id + '(' + values[id] + ')')
  const snapNodes = () => values.map((value, id) => ({ id, value, next: next[id] }))
  const answerOf = () => order.map((id) => values[id])
  const state = (current) => ({
    current,
    nodes: snapNodes(),
    pointers: { tail: order.length === 0 ? 0 : order.length - 1 },
    answer: answerOf(),
    values: answerOf(),
    vars: { i: labelOf(head1), j: labelOf(head2), n1, n2, k: order.length }
  })
  const push = (step, label, note, current) => frames.push(frame(step, label, note, state(current === undefined ? null : current)))

  push('init', 'Initialize', 'n1=' + n1 + '; n2=' + n2 + '; dummy(0); tail=dummy; i=' + labelOf(head1) + '; j=' + labelOf(head2), null)

  while (head1 !== null && head2 !== null) {
    const a = values[head1]
    const b = values[head2]
    push('compare', 'Compare heads', 'compare ' + a + ' vs ' + b + '; take smaller (ties: list1)', null)
    let taken
    let side
    if (a <= b) {
      taken = head1
      side = '1'
      head1 = next[head1]
    } else {
      taken = head2
      side = '2'
      head2 = next[head2]
    }
    if (order.length > 0) next[order[order.length - 1]] = taken
    next[taken] = null
    order.push(taken)
    push('take', 'Take smaller', 'take ' + values[taken] + ' from list' + side + '; k=' + order.length, taken)
  }

  let drainSide = null
  let drainCount = 0
  let rest = head1 !== null ? head1 : head2
  if (rest !== null) drainSide = head1 !== null ? '1' : '2'
  while (rest !== null) {
    const id = rest
    rest = next[rest]
    if (order.length > 0) next[order[order.length - 1]] = id
    next[id] = null
    order.push(id)
    drainCount += 1
  }
  head1 = null
  head2 = null
  if (drainSide === null) push('drain', 'Drain remainder', 'both lists exhausted; nothing to drain', null)
  else push('drain', 'Drain remainder', 'drain ' + drainCount + ' from list' + drainSide + '; k=' + order.length, order[order.length - 1])

  push('return', 'Done: return merged head', 'return dummy.next; k=' + order.length + ' nodes merged', order.length > 0 ? order[order.length - 1] : null)

  return {
    kind: 'linked-list',
    layout: {
      values: answerOf(),
      nodes: values.map((value, id) => ({ id, value })),
      edges: initialNext.map((target, id) => (target === null ? null : [id, target])).filter(Boolean)
    },
    frames,
    result: answerOf()
  }
}

// Visual bound for the remove-nth walkthrough scene (judge allows sz <= 30).
// Names are remove-nth-specific: the file already declares MAX_NODES,
// decodeList and labelOf for the single-list reverse walkthrough.
const REMOVE_NTH_MAX_NODES = 8
const REMOVE_NTH_MIN_VAL = 0
const REMOVE_NTH_MAX_VAL = 100

function decodeRemoveNthList(value) {
  let raw = value
  if (typeof raw === 'string') raw = raw.trim() === '' ? [] : JSON.parse(raw)
  if (raw === null || raw === undefined) return []
  if (!Array.isArray(raw)) throw new Error('head must be an array of at most ' + REMOVE_NTH_MAX_NODES + ' integers')
  if (raw.length > REMOVE_NTH_MAX_NODES) throw new Error('Visual walkthrough limited to ' + REMOVE_NTH_MAX_NODES + ' nodes; head has ' + raw.length)
  raw.forEach((v, idx) => {
    if (!Number.isSafeInteger(v)) throw new Error('head[' + idx + '] must be an integer (got ' + String(v) + ')')
    if (v < REMOVE_NTH_MIN_VAL || v > REMOVE_NTH_MAX_VAL) throw new Error('head[' + idx + '] out of range [' + REMOVE_NTH_MIN_VAL + ', ' + REMOVE_NTH_MAX_VAL + '] (got ' + v + ')')
  })
  return raw.slice()
}

function decodeRemoveNthN(value, sz) {
  let n = value
  if (typeof n === 'string') {
    if (n.trim() === '') throw new Error('n must be an integer in [1, ' + sz + ']')
    n = JSON.parse(n.trim())
  }
  if (!Number.isSafeInteger(n)) throw new Error('n must be an integer in [1, ' + sz + '] (got ' + String(value) + ')')
  if (n < 1 || n > sz) throw new Error('n out of range [1, ' + sz + '] (got ' + n + ')')
  return n
}

const labelRemoveNth = (id, values) => {
  if (id === null || id === undefined) return 'null'
  if (id === 'dummy') return 'dummy'
  return 'node' + id + '(' + values[id] + ')'
}

const removeNthJava = code(`
[def] // Definition for singly-linked list (provided by the judge).
[def] // public class ListNode { int val; ListNode next; }
[def] class Solution {
[def]     public ListNode removeNthFromEnd(ListNode head, int n) {
[init]         ListNode dummy = new ListNode(0, head);
[init]         ListNode fast = dummy;
[gap]         for (int i = 0; i <= n; i++) {
[gap]             fast = fast.next;
[gap]         }
[init]         ListNode slow = dummy;
[walk]         while (fast != null) {
[walk]             fast = fast.next;
[walk]             slow = slow.next;
[walk]         }
[bypass]         slow.next = slow.next.next;
[return]         return dummy.next;
[def]     }
[def] }
`)

const removeNthCpp = code(`
[def] // Definition for singly-linked list (provided by the judge).
[def] // struct ListNode { int val; ListNode *next; };
[def] class Solution {
[def] public:
[def]     ListNode* removeNthFromEnd(ListNode* head, int n) {
[init]         ListNode dummy(0, head);
[init]         ListNode* fast = &dummy;
[gap]         for (int i = 0; i <= n; ++i) {
[gap]             fast = fast->next;
[gap]         }
[init]         ListNode* slow = &dummy;
[walk]         while (fast != nullptr) {
[walk]             fast = fast->next;
[walk]             slow = slow->next;
[walk]         }
[bypass]         ListNode* victim = slow->next;
[bypass]         slow->next = victim->next;
[return]         return dummy.next;
[def]     }
[def] };
`)

const removeNthPseudo = code(`
[def] removeNthFromEnd(head, n):
[init]   dummy = ListNode(0, head); fast = dummy; slow = dummy
[gap]   repeat n + 1 times: fast = fast.next      // gap of n between slow and fast
[walk]   while fast != null: fast = fast.next; slow = slow.next
[bypass]   slow.next = slow.next.next            // unlink the nth-from-end node
[return]   return dummy.next
`)

// Visual bound for the reorder walkthrough scene (judge allows up to 5*10^4 nodes).
// Names are reorder-specific: the file already declares MAX_NODES,
// decodeList and labelOf for the single-list reverse walkthrough.
// Staged source: .workers/jobs/interview-wave-50/17-reorder-list/adapter-reorder-list.js
// (selfcheck 136/0; Java/C++ references compile against the standard ListNode harness).
const REORDER_MAX_NODES = 10
const REORDER_MIN_VAL = 1
const REORDER_MAX_VAL = 1000

function decodeReorderList(value) {
  if (value === null || value === undefined) return []
  if (!Array.isArray(value)) throw new Error('Provide head as an array of at most ' + REORDER_MAX_NODES + ' integers')
  if (value.length > REORDER_MAX_NODES) throw new Error('Visual walkthrough limited to ' + REORDER_MAX_NODES + ' nodes; got ' + value.length)
  value.forEach((v, i) => {
    if (!Number.isSafeInteger(v)) throw new Error('head[' + i + '] must be an integer')
    if (v < REORDER_MIN_VAL || v > REORDER_MAX_VAL) throw new Error('head[' + i + '] out of range [' + REORDER_MIN_VAL + ', ' + REORDER_MAX_VAL + ']')
  })
  return value.slice()
}

const labelReorder = (id, values) => (id === null || id === undefined ? 'null' : 'node' + id + '(' + values[id] + ')')

const reorderJava = code(`
[def] // Definition for singly-linked list (provided by the judge).
[def] // public class ListNode { int val; ListNode next; }
[def] class Solution {
[def]     public void reorderList(ListNode head) {
[guard]         if (head == null || head.next == null) return;
[init]         ListNode slow = head;
[init]         ListNode fast = head;
[find]         while (fast.next != null && fast.next.next != null) {
[find]             slow = slow.next;
[find]             fast = fast.next.next;
[split]         }
[split]         ListNode second = slow.next;
[split]         slow.next = null;
[init]         ListNode prev = null;
[reverse]         while (second != null) {
[reverse]             ListNode nxt = second.next;
[reverse]             second.next = prev;
[reverse]             prev = second;
[reverse]             second = nxt;
[reverse]         }
[init]         ListNode first = head;
[init]         second = prev;
[merge]         while (second != null) {
[merge]             ListNode tmp1 = first.next;
[merge]             ListNode tmp2 = second.next;
[merge]             first.next = second;
[merge]             second.next = tmp1;
[merge]             first = tmp1;
[merge]             second = tmp2;
[merge]         }
[def]     }
[def] }
`)

const reorderCpp = code(`
[def] // Definition for singly-linked list (provided by the judge).
[def] // struct ListNode { int val; ListNode *next; };
[def] class Solution {
[def] public:
[def]     void reorderList(ListNode* head) {
[guard]         if (head == nullptr || head->next == nullptr) return;
[init]         ListNode* slow = head;
[init]         ListNode* fast = head;
[find]         while (fast->next != nullptr && fast->next->next != nullptr) {
[find]             slow = slow->next;
[find]             fast = fast->next->next;
[split]         }
[split]         ListNode* second = slow->next;
[split]         slow->next = nullptr;
[init]         ListNode* prev = nullptr;
[reverse]         while (second != nullptr) {
[reverse]             ListNode* nxt = second->next;
[reverse]             second->next = prev;
[reverse]             prev = second;
[reverse]             second = nxt;
[reverse]         }
[init]         ListNode* first = head;
[init]         second = prev;
[merge]         while (second != nullptr) {
[merge]             ListNode* tmp1 = first->next;
[merge]             ListNode* tmp2 = second->next;
[merge]             first->next = second;
[merge]             second->next = tmp1;
[merge]             first = tmp1;
[merge]             second = tmp2;
[merge]         }
[def]     }
[def] };
`)

const reorderPseudo = code(`
[def] reorderList(head):
[guard]   if head == null or head.next == null: return
[init]   slow = head; fast = head
[find]   while fast.next != null and fast.next.next != null:
[find]     slow = slow.next; fast = fast.next.next
[split]   second = slow.next; slow.next = null
[init]   prev = null
[reverse]   while second != null:
[reverse]     nxt = second.next; second.next = prev; prev = second; second = nxt
[init]   first = head; second = prev
[merge]   while second != null:
[merge]     tmp1 = first.next; tmp2 = second.next
[merge]     first.next = second; second.next = tmp1
[merge]     first = tmp1; second = tmp2
`)

function buildRemoveNth(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('removeNthFromEnd needs [head, n] as its two walkthrough inputs')
  const source = decodeRemoveNthList(args[0])
  const sz = source.length
  if (sz === 0) throw new Error('head must hold at least 1 node (got empty list)')
  const n = decodeRemoveNthN(args[1], sz)
  // Stable node identities 0..sz-1 in input order; `next` holds a node id or
  // null. The dummy head is NOT a list node: it is tracked as the string id
  // 'dummy' in vars labels only, never as a pointer index, so emitted
  // pointers/removed stay valid indices into layout.values.
  const target = sz - n
  const next = source.map((_, i) => (i + 1 < sz ? i + 1 : null))
  // Logical positions: fast starts at dummy (position -1), i.e. one step
  // before node 0; slow starts at dummy too. Represent dummy as null in
  // pointer fields (the renderer drops out-of-range pointers) and name it in
  // vars/notes via labelRemoveNth.
  let fastPos = -1 // -1 = dummy, 0..sz-1 = node id, sz = null (past tail)
  let slowPos = -1
  const idOf = (pos) => (pos < 0 ? null : pos >= sz ? null : pos)
  const frames = []
  const anchors = []

  const snapNodes = () => source.map((value, id) => ({ id, value, next: next[id] }))
  const chainValues = () => {
    const out = []
    let id = 0
    // Follow links from the original head, skipping the unlinked target only
    // after the bypass event rewires next[].
    const guard = new Set()
    while (id !== null && !guard.has(id)) {
      guard.add(id)
      out.push(source[id])
      id = next[id]
    }
    return out
  }
  const state = () => ({
    current: idOf(fastPos),
    nodes: snapNodes(),
    pointers: { fast: idOf(fastPos), slow: idOf(slowPos) },
    answer: chainValues(),
    vars: {
      fast: fastPos < 0 ? 'dummy' : fastPos >= sz ? 'null' : labelRemoveNth(fastPos, source),
      slow: slowPos < 0 ? 'dummy' : labelRemoveNth(slowPos, source),
      target: labelRemoveNth(target, source),
      n, sz
    }
  })
  const stateWithRemoved = () => ({ ...state(), removed: [target] })
  const push = (step, label, note, removed = false) =>
    frames.push(frame(step, label, note, removed ? stateWithRemoved() : state()))

  anchors.push(0)
  push('init', 'Initialize', 'sz=' + sz + '; n=' + n + '; dummy->head; fast=dummy; slow=dummy; target=node' + target)

  // Gap: advance fast n+1 steps so slow..fast spans exactly n nodes.
  for (let i = 0; i <= n; i++) {
    fastPos = fastPos + 1 // from dummy(-1): first step lands on node 0
    const atEnd = i === n
    push('gap', atEnd ? 'Gap ready' : 'Advance fast',
      'fast step ' + (i + 1) + '/' + (n + 1) + ' -> ' + (fastPos >= sz ? 'null' : labelRemoveNth(fastPos, source)) +
      (atEnd ? '; gap of ' + n + ' set; slow still dummy' : ''))
  }
  anchors.push(frames.length - 1)

  // Walk: advance both until fast runs off the tail. slow then sits on the
  // predecessor of the target (or dummy when the head itself is removed).
  while (fastPos < sz) {
    fastPos += 1
    if (fastPos > sz) fastPos = sz
    slowPos += 1
    const done = fastPos >= sz
    push('walk', done ? 'Pointers placed' : 'Advance both',
      'fast -> ' + (done ? 'null' : labelRemoveNth(fastPos, source)) +
      '; slow -> ' + (slowPos < 0 ? 'dummy' : labelRemoveNth(slowPos, source)) +
      (done ? '; slow is before ' + labelRemoveNth(target, source) : ''))
    if (frames.length > 200) throw new Error('internal frame overflow')
  }
  anchors.push(frames.length - 1)

  // Bypass: unlink the target node. When slow is a real node, redirect its
  // next around the target; when slow is dummy (head removal), the new head
  // is simply the node after the old head.
  const afterTarget = next[target]
  if (slowPos >= 0) next[slowPos] = afterTarget
  // Recompute with an explicit head id so head-removal renders honestly.
  const headId = target === 0 ? (sz > 1 ? 1 : null) : 0
  const chainValues2 = () => {
    const out = []
    let id = headId
    const guard = new Set()
    while (id !== null && !guard.has(id)) {
      guard.add(id)
      out.push(source[id])
      id = next[id]
    }
    return out
  }
  const state2 = () => ({
    current: idOf(fastPos),
    nodes: snapNodes(),
    pointers: { fast: idOf(fastPos), slow: idOf(slowPos) },
    answer: chainValues2(),
    vars: {
      fast: 'null',
      slow: slowPos < 0 ? 'dummy' : labelRemoveNth(slowPos, source),
      target: labelRemoveNth(target, source),
      n, sz
    }
  })
  frames.push(frame('bypass', 'Unlink target',
    (slowPos < 0 ? 'dummy' : 'node' + slowPos) + '.next skips ' + labelRemoveNth(target, source) +
    ' -> ' + (afterTarget === null ? 'null' : labelRemoveNth(afterTarget, source)),
    { ...state2(), removed: [target] }))
  anchors.push(frames.length - 1)

  frames.push(frame('return', 'Return head',
    'return dummy.next; result [' + chainValues2().join(', ') + ']',
    { ...state2(), removed: [target] }))
  anchors.push(frames.length - 1)

  const initialEdges = source.map((_, i) => (i + 1 < sz ? [i, i + 1] : null)).filter(Boolean)
  return {
    kind: 'linked-list',
    layout: {
      values: source.slice(),
      nodes: source.map((value, id) => ({ id, value })),
      edges: initialEdges
    },
    frames,
    result: chainValues2(),
    anchors: [...new Set(anchors.filter(i => Number.isInteger(i) && i >= 0 && i < frames.length))].sort((a, b) => a - b)
  }
}

// Staged source: .workers/jobs/interview-wave-50/17-reorder-list/adapter-reorder-list.js
// (buildReorder; only renames are decodeList->decodeReorderList, labelOf->labelReorder).
function buildReorder(args) {
  const source = decodeReorderList(args[0])
  const n = source.length
  // Stable node identities 0..n-1; next holds a node id or null.
  const next = source.map((_, i) => (i + 1 < n ? i + 1 : null))
  const frames = []
  const anchors = []

  const snapNodes = () => source.map((value, id) => ({ id, value, next: next[id] }))
  const chainValues = (head) => {
    const out = []
    let id = head
    const guard = new Set()
    while (id !== null && !guard.has(id)) {
      guard.add(id)
      out.push(source[id])
      id = next[id]
    }
    return out
  }
  const orderOf = (head) => {
    const out = []
    let id = head
    const guard = new Set()
    while (id !== null && !guard.has(id)) {
      guard.add(id)
      out.push(id)
      id = next[id]
    }
    return out
  }
  const head = n > 0 ? 0 : null
  const state = (current, extra) => ({
    current,
    nodes: snapNodes(),
    pointers: { ...(extra || {}) },
    answer: chainValues(head),
    vars: { n, ...(extra ? Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, labelReorder(v, source)])) : {}) }
  })
  const push = (step, label, note, current, extra) => frames.push(frame(step, label, note, state(current === undefined ? null : current, extra)))

  anchors.push(0)
  if (n <= 1) {
    push('guard', 'Guard: trivial list', 'n=' + n + '; head=' + labelReorder(head, source) + '; nothing to rewire', head, head === null ? {} : { first: head })
    push('merge', 'Done: single chain', 'order=[' + chainValues(head).join(',') + ']; nodes unchanged', head, head === null ? {} : { first: head })
    anchors.push(frames.length - 1)
    return {
      kind: 'linked-list',
      layout: { values: source.slice(), nodes: source.map((value, id) => ({ id, value })), edges: source.map((_, i) => (i + 1 < n ? [i, i + 1] : null)).filter(Boolean) },
      frames,
      result: chainValues(head),
      order: orderOf(head),
      anchors: [...new Set(anchors)].sort((a, b) => a - b)
    }
  }

  push('guard', 'Guard: non-trivial', 'n=' + n + '; head=' + labelReorder(head, source) + '; proceed to split', head, { slow: 0, fast: 0 })

  // Phase 1: slow/fast middle finding.
  let slow = 0
  let fast = 0
  const at = (id) => (id === null ? 'null' : 'node' + id + '(' + source[id] + ')')
  while (next[fast] !== null && next[next[fast]] !== null) {
    push('find', 'Advance slow/fast', 'slow=' + at(slow) + '; fast=' + at(fast) + '; step slow+1 fast+2', slow, { slow, fast })
    slow = next[slow]
    fast = next[next[fast]]
  }
  anchors.push(frames.length)
  push('find', 'Middle found', 'slow=' + at(slow) + ' ends first half; fast=' + at(fast) + ' at tail region', slow, { slow, fast })

  // Phase 2: split.
  let second = next[slow]
  next[slow] = null
  push('split', 'Split halves', 'second=' + at(second) + '; cut node' + slow + '.next=null', slow, { slow, first: head, second })

  // Phase 3: reverse second half iteratively.
  let prev = null
  let cur = second
  anchors.push(frames.length)
  push('reverse', 'Reverse setup', 'prev=null; cur=' + at(cur) + '; reverse tail half in place', cur, { first: head, second: cur, prev })
  while (cur !== null) {
    const nxt = next[cur]
    push('reverse', 'Save successor', 'nxt=' + at(nxt) + '; keep rest of tail before flip', cur, { first: head, second: cur, prev })
    next[cur] = prev
    push('reverse', 'Flip link', 'node' + cur + '.next=' + at(prev) + '; tail direction reverses', cur, { first: head, second: cur, prev })
    prev = cur
    cur = nxt
    push('reverse', 'Advance reverse', 'prev=' + at(prev) + '; cur=' + at(cur), cur, { first: head, second: cur, prev })
  }
  second = prev
  anchors.push(frames.length)
  push('reverse', 'Tail reversed', 'second=' + at(second) + '; head of reversed tail ready to weave', second, { first: head, second })

  // Phase 4: alternate merge.
  let first = head
  push('merge', 'Merge setup', 'first=' + at(first) + '; second=' + at(second) + '; weave ends inward', first, { first, second })
  while (second !== null) {
    const tmp1 = next[first]
    const tmp2 = next[second]
    push('merge', 'Save next pair', 'tmp1=' + at(tmp1) + '; tmp2=' + at(tmp2) + '; no link lost', first, { first, second })
    next[first] = second
    anchors.push(frames.length)
    push('merge', 'Link front to back', 'node' + first + '.next=' + at(second) + '; take from tail', first, { first, second })
    next[second] = tmp1
    push('merge', 'Link back to front', 'node' + second + '.next=' + at(tmp1) + '; close the pair', second, { first: tmp1, second: tmp2 })
    first = tmp1
    second = tmp2
    if (second !== null) push('merge', 'Advance weave', 'first=' + at(first) + '; second=' + at(second), first, { first, second })
  }

  anchors.push(frames.length)
  push('merge', 'Done: reordered', 'order=[' + chainValues(head).join(',') + ']; L0,Ln,L1,Ln-1 weave', head, { first })
  anchors.push(frames.length - 1)

  return {
    kind: 'linked-list',
    layout: {
      values: source.slice(),
      nodes: source.map((value, id) => ({ id, value })),
      edges: source.map((_, i) => (i + 1 < n ? [i, i + 1] : null)).filter(Boolean)
    },
    frames,
    result: chainValues(head),
    order: orderOf(head),
    anchors: [...new Set(anchors.filter(i => Number.isInteger(i) && i >= 0 && i < frames.length))].sort((a, b) => a - b)
  }
}

// Visual bound for the has-cycle walkthrough scene (judge allows up to 10^4 nodes).
// Names are cycle-specific: the file already declares MAX_NODES, MIN_VAL, MAX_VAL,
// decodeList and labelOf for the single-list reverse walkthrough.
// Staged source: .workers/jobs/question-owners-150/linked-list-cycle/linked-list-cycle.lesson.js
// (QO150 owner package per triage batch8-prep.md: reviewed owner package, SELFCHECK OK;
// IW50 meet/exit vocabulary supplanted by the QO150 compare vocabulary used here).
const CYCLE_MAX_NODES = 12
const CYCLE_MIN_VAL = -100000
const CYCLE_MAX_VAL = 100000

function decodeCycleList(value) {
  let raw = value
  if (typeof raw === 'string') raw = raw.trim() === '' ? [] : JSON.parse(raw)
  if (raw === null || raw === undefined) return []
  if (!Array.isArray(raw)) throw new Error('head must be an array of at most ' + CYCLE_MAX_NODES + ' integers')
  if (raw.length > CYCLE_MAX_NODES) throw new Error('Visual walkthrough limited to ' + CYCLE_MAX_NODES + ' nodes; head has ' + raw.length)
  raw.forEach((v, i) => {
    if (!Number.isSafeInteger(v)) throw new Error('head[' + i + '] must be an integer (got ' + String(v) + ')')
    if (v < CYCLE_MIN_VAL || v > CYCLE_MAX_VAL) throw new Error('head[' + i + '] out of range [' + CYCLE_MIN_VAL + ', ' + CYCLE_MAX_VAL + ']')
  })
  return raw.slice()
}

function decodeCyclePos(value, n) {
  let p = value
  if (typeof p === 'string') {
    if (p.trim() === '') return -1
    p = JSON.parse(p.trim())
  }
  if (p === null || p === undefined) return -1
  if (!Number.isSafeInteger(p)) throw new Error('pos must be -1 or an index in [0, ' + (n - 1) + '] (got ' + String(value) + ')')
  if (n === 0) {
    if (p !== -1) throw new Error('pos must be -1 for an empty list (got ' + p + ')')
    return -1
  }
  if (p !== -1 && (p < 0 || p >= n)) throw new Error('pos out of range [-1, ' + (n - 1) + '] (got ' + p + ')')
  return p
}

const labelCycle = (id, values) => (id === null || id === undefined ? 'null' : 'node' + id + '(' + values[id] + ')')

const cycleJava = code(`
[def] // Definition for singly-linked list (provided by the judge).
[def] // public class ListNode { int val; ListNode next; }
[def] public class Solution {
[def]     public boolean hasCycle(ListNode head) {
[init]         ListNode slow = head;
[init]         ListNode fast = head;
[check]         while (fast != null && fast.next != null) {
[advance]             slow = slow.next;
[advance]             fast = fast.next.next;
[compare]             if (slow == fast) {
[return]                 return true;
[compare]             }
[def]         }
[return]         return false;
[def]     }
[def] }
`)

const cycleCpp = code(`
[def] // Definition for singly-linked list (provided by the judge).
[def] // struct ListNode { int val; ListNode *next; };
[def] class Solution {
[def] public:
[def]     bool hasCycle(ListNode *head) {
[init]         ListNode *slow = head;
[init]         ListNode *fast = head;
[check]         while (fast != nullptr && fast->next != nullptr) {
[advance]             slow = slow->next;
[advance]             fast = fast->next->next;
[compare]             if (slow == fast) {
[return]                 return true;
[compare]             }
[def]         }
[return]         return false;
[def]     }
[def] };
`)

const cyclePseudo = code(`
[def] hasCycle(head):
[init]   slow = head; fast = head
[check]   while fast != null and fast.next != null:
[advance]     slow = slow.next; fast = fast.next.next
[compare]     if slow == fast: return true
[return]   return false
`)

// Real Floyd walk on the actual (values, pos) input. next[] is the true
// successor table: chain links plus the tail->pos back edge when pos >= 0.
function buildLinkedListCycle(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('hasCycle walkthrough needs [head, pos] as its two inputs')
  const source = decodeCycleList(args[0])
  const n = source.length
  const pos = decodeCyclePos(args[1], n)
  const next = source.map((_, i) => (i + 1 < n ? i + 1 : (pos >= 0 ? pos : null)))
  const frames = []
  const anchors = []
  const snapNodes = () => source.map((value, id) => ({ id, value, next: next[id] }))
  const varsBase = () => ({ pos, n })
  const state = (slow, fast, extra) => ({
    nodes: snapNodes(),
    pointers: { slow, fast },
    cycleEntry: pos >= 0 ? pos : null,
    vars: { slow: labelCycle(slow, source), fast: labelCycle(fast, source), ...varsBase(), ...(extra || {}) },
    ...(extra && extra.meet !== undefined && extra.meet !== null ? { meet: extra.meet } : {})
  })
  const push = (step, label, note, slow, fast, extra) =>
    frames.push(frame(step, label, note, state(slow, fast, extra)))

  anchors.push(0)
  if (n === 0) {
    push('init', 'Initialize', 'n=0; head=null; slow=null; fast=null', null, null)
    push('return', 'Return false', 'head is null; no nodes, no cycle; return false', null, null, { result: false })
    anchors.push(frames.length - 1)
  } else {
    let slow = 0
    let fast = 0
    push('init', 'Initialize', 'n=' + n + '; pos=' + pos + '; slow=' + labelCycle(0, source) + '; fast=' + labelCycle(0, source), slow, fast)
    let met = null
    const cap = 4 * n + 5
    for (let iter = 0; iter < cap; iter++) {
      const fastNext = fast === null ? null : next[fast]
      if (fast === null || fastNext === null) {
        push('check', 'Exit loop', 'fast=' + labelCycle(fast, source) + '; guard fails; a tail exists', slow, fast)
        break
      }
      push('check', 'Guard passes', 'fast=' + labelCycle(fast, source) + '; fast.next=' + labelCycle(fastNext, source) + '; stride', slow, fast)
      slow = next[slow]
      fast = next[next[fast]]
      push('advance', 'Stride', 'slow->' + labelCycle(slow, source) + '; fast->' + labelCycle(fast, source), slow, fast)
      if (slow !== null && fast !== null && slow === fast) {
        met = slow
        anchors.push(frames.length)
        push('compare', 'Runners meet', 'slow==fast at ' + labelCycle(met, source) + '; cycle proven', slow, fast, { meet: met })
        break
      } else if (slow !== null && fast !== null) {
        push('compare', 'No meeting', labelCycle(slow, source) + ' vs ' + labelCycle(fast, source) + '; keep walking', slow, fast)
      }
      // fast === null after a stride: loop re-tests the guard and exits honestly.
    }
    anchors.push(frames.length)
    if (met !== null) {
      push('return', 'Return true', 'meet at ' + labelCycle(met, source) + '; return true', slow, fast, { meet: met, result: true })
    } else {
      push('return', 'Return false', 'fast reached null; tail exists; return false', slow, fast, { result: false })
    }
    anchors.push(frames.length - 1)
  }

  const initialEdges = source.map((_, i) => (i + 1 < n ? [i, i + 1] : null)).filter(Boolean)
  if (pos >= 0 && n > 0) initialEdges.push([n - 1, pos])
  return {
    kind: 'linked-list',
    problemSlug: 'linked-list-cycle',
    title: 'Linked List Cycle — tortoise and hare',
    subtitle: 'slow +1, fast +2; meeting proves a cycle',
    pattern: 'linked-list',
    layout: {
      values: source.slice(),
      nodes: source.map((value, id) => ({ id, value })),
      edges: initialEdges,
      pos
    },
    frames,
    result: frames.length ? frames[frames.length - 1].state.vars.result === true : false,
    anchors: [...new Set(anchors.filter(i => Number.isInteger(i) && i >= 0 && i < frames.length))].sort((a, b) => a - b)
  }
}

export const adapters = {
  'reverse-linked-list': {
    signature: { name: 'reverseList', params: ['ListNode'], return: 'ListNode' },
    lesson: {
      idea: 'Walk once with prev/curr: save next, flip curr.next to prev, then advance both.',
      trap: 'Rewiring before saving curr.next loses the rest; return prev, not curr.',
      time: 'O(n)',
      space: 'O(1)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      advance: 'Shifts both pointers forward along saved successor so next iteration handles following original node.',
      check: 'Tests whether lead pointer remains before each pass so loop ends exactly when original tail is consumed.',
      def: 'Declares node shape with reversal function scope so pointer logic stays isolated from caller setup.',
      init: 'Sets trailing pointer to empty with lead at head so empty input exits cleanly and work starts aligned.',
      link: 'Redirects current link toward predecessor so direction reverses incrementally without losing prior progress.',
      return: 'Exposes predecessor as new head closing reversal scope so empty yields empty and order is fully flipped.',
      save: 'Preserves successor before rewiring so remaining chain stays reachable after current link is flipped.'
    },
    code: { java: reverseJava, cpp: reverseCpp, pseudo: reversePseudo },
    build: buildReverse
  },
  'merge-two-sorted-lists': {
    signature: { name: 'mergeTwoLists', params: ['ListNode', 'ListNode'], return: 'ListNode' },
    lesson: {
      idea: 'Splice with a dummy head: repeatedly link the smaller head, then attach the remainder.',
      trap: 'Advance the taken list and the tail together; without a dummy, empty inputs need cases.',
      time: 'O(n + m)',
      space: 'O(1)'
    },
    // Per-line explanations (presentation metadata, never compiled).
    // Verbatim from the reviewed Q150 explain.json; keys match the exact
    // [tag] markers in all three code blocks, verified against live code.
    explain: {
      def: 'Declares the node shape and merge scope so splicing stays inside the two input chains.',
      init: 'Seeds a dummy head with tail parked on it so empty inputs need no special case.',
      compare: 'Reads both heads and picks the smaller value, keeping ties on list1 for stability.',
      take: 'Links the winning node after tail, then advances that list and tail together.',
      drain: 'Attaches the whole non-empty remainder at once; the other list is exhausted.',
      return: 'Skips the dummy and returns its next as the merged head, null when both were empty.'
    },
    code: { java: mergeJava, cpp: mergeCpp, pseudo: mergePseudo },
    build: buildMerge
  },
  'remove-nth-node-from-end-of-list': {
    signature: { name: 'removeNthFromEnd', params: ['ListNode', 'int'], return: 'ListNode' },
    lesson: {
      idea: 'Keep a gap of n between two pointers: run fast n+1 steps from a dummy, then walk both to the end so slow lands just before the node to drop.',
      trap: 'Without a dummy head, deleting the first node needs a special case; moving fast only n steps (not n+1) lands slow ON the target instead of before it.',
      time: 'O(sz)',
      space: 'O(1)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      bypass: 'Redirects slow next around the target in one write so the list stays linked.',
      def: 'Declares node shape and removal scope so pointer logic stays isolated from caller setup.',
      gap: 'Advances fast one step at a time until the slow to fast distance equals the offset.',
      init: 'Seeds dummy with fast and slow parked there so head removal needs no special case.',
      return: 'Returns dummy next as the new head whether the head was removed or not.',
      walk: 'Steps both pointers until fast leaves the tail so slow certifies the target spot.'
    },
    code: { java: removeNthJava, cpp: removeNthCpp, pseudo: removeNthPseudo },
    build: buildRemoveNth
  },
  'reorder-list': {
    signature: { name: 'reorderList', params: ['ListNode'], return: 'void' },
    lesson: {
      idea: 'Split at the middle, reverse the tail half, then weave front and reversed tail alternately.',
      trap: 'Cut slow.next before reversing; weave with saved successors or links are lost. Values never move, only next pointers.',
      time: 'O(n)',
      space: 'O(1)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    explain: {
      advance: 'See merge.',
      check: 'See find.',
      def: 'Declares node shape with in-place reorder scope so pointer logic stays isolated from caller setup.',
      done: 'See merge.',
      find: 'Advances slow by one and fast by two so slow lands at the end of the first half for even and odd lengths.',
      guard: 'Returns early for empty or single-node input where no rewiring can change the order.',
      init: 'Binds the named edge pointers for the current phase so each frame shows which nodes move next.',
      link: 'See merge and reverse.',
      merge: 'Splices one tail node after each front node using saved successors, preserving the remaining chains.',
      return: 'Void return: the head identity is unchanged and the caller reads the rewired chain.',
      reverse: 'Flips one tail link toward its predecessor after saving its successor so no node is lost.',
      save: 'See merge and reverse.',
      split: 'Severs the middle link so the two halves are independent before the tail is reversed.'
    },
    code: { java: reorderJava, cpp: reorderCpp, pseudo: reorderPseudo },
    build: buildReorder
  },
  'linked-list-cycle': {
    signature: { name: 'hasCycle', params: ['ListNode', 'int'], return: 'boolean' },
    lesson: {
      idea: 'Run a slow pointer (+1) and a fast pointer (+2) from head: a meeting proves a cycle; fast hitting null proves none.',
      trap: 'Compare identities after each stride, never values; guard fast AND fast.next before the double step.',
      time: 'O(n)',
      space: 'O(1)'
    },
    // Optional per-line explanations (presentation metadata, never compiled).
    // Step notes verbatim from the reviewed QO150 lesson.js explain; def follows
    // the file's existing def-note convention so every displayed line resolves
    // (staged explain carries no def key; all notes <=140 chars, no fences).
    explain: {
      def: 'Declares the node shape and cycle-test scope so the pointer walk stays isolated from caller setup.',
      init: 'Parks both runners at the head so an empty list exits cleanly and the first comparison is aligned.',
      check: 'Tests the two-step lookahead before every stride so fast never dereferences a null link.',
      advance: 'Moves slow one link and fast two links, which is the only state change; a cycle forces them to share a node.',
      compare: 'Compares node identities (not values): equal references prove the runners met on one object.',
      return: 'Reports the proven outcome: a meeting is a cycle, while fast reaching null certifies acyclicity.'
    },
    code: { java: cycleJava, cpp: cycleCpp, pseudo: cyclePseudo },
    build: buildLinkedListCycle
  }
}
