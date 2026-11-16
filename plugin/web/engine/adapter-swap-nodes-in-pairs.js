/** Swap Nodes in Pairs — portable per-slug walkthrough adapter (linked-list).
 * Iterative dummy + prev seam; per pair, certify two nodes exist, then rewire
 * first/second in place (first.next skips second, second.next takes first,
 * prev.next takes second) and advance the seam to first. A leftover node stays
 * linked as-is. O(n) time, O(1) extra space. Pure + synchronous; never throws
 * on import. Out-of-range or non-integer inputs throw instead of rendering.
 * Register under slug `swap-nodes-in-pairs` (see integration.json).
 * Family precedent: adapter-reverse-nodes-in-k-group.js (dummy + seam +
 * in-place link flips, real next[] rewiring, stable node identities).
 */
import { code, frame } from './semantic-core.js'

// boundedFrames is applied by semantic.js (single compaction pass); the import
// keeps this adapter on the shared helper contract. Adapters return FULL lists.

export const MAX_NODES = 10;
export const MIN_VAL = 0;
export const MAX_VAL = 100;

export const SIGNATURE = Object.freeze({
  name: 'swapPairs',
  params: Object.freeze(['ListNode']),
  return: 'ListNode',
});

const swapJava = code(`
[def] // Definition for singly-linked list (provided by the judge).
[def] // public class ListNode { int val; ListNode next; }
[def] class Solution {
[def]     public ListNode swapPairs(ListNode head) {
[init]         ListNode dummy = new ListNode(0, head);
[init]         ListNode prev = dummy;
[probe]         while (prev.next != null && prev.next.next != null) {
[probe]             ListNode first = prev.next;
[probe]             ListNode second = first.next;
[link]             first.next = second.next;
[link]             second.next = first;
[connect]             prev.next = second;
[advance]             prev = first;
[def]         }
[verify]         // every certified pair swapped; a leftover node stays linked as-is.
[return]         return dummy.next;
[def]     }
[def] }
`);

const swapCpp = code(`
[def] // Definition for singly-linked list (provided by the judge).
[def] // struct ListNode { int val; ListNode *next; };
[def] class Solution {
[def] public:
[def]     ListNode* swapPairs(ListNode* head) {
[init]         ListNode dummy(0, head);
[init]         ListNode* prev = &dummy;
[probe]         while (prev->next != nullptr && prev->next->next != nullptr) {
[probe]             ListNode* first = prev->next;
[probe]             ListNode* second = first->next;
[link]             first->next = second->next;
[link]             second->next = first;
[connect]             prev->next = second;
[advance]             prev = first;
[def]         }
[verify]         // every certified pair swapped; a leftover node stays linked as-is.
[return]         return dummy.next;
[def]     }
[def] };
`);

const swapPseudo = code(`
[def] swapPairs(head):
[init]   dummy = ListNode(0, head); prev = dummy
[probe]   while prev.next != null and prev.next.next != null:
[probe]     first = prev.next; second = first.next
[link]     first.next = second.next; second.next = first
[connect]   prev.next = second
[advance]   prev = first
[verify]   every certified pair swapped once; leftover stays as-is
[return]   return dummy.next
`);

export const LESSON = Object.freeze({
  idea: 'Park a prev seam before each pair, certify two nodes exist, then swap only next pointers; a leftover node never moves.',
  trap: 'Rewire in the certified order (first skips second, second takes first, seam takes second) — skipping the save of second.next loses the rest of the list.',
  time: 'O(n)',
  space: 'O(1)',
});

export const EXPLAIN = Object.freeze({
  def: 'Scope wrapper around the pair-swap; no pointer work happens on these lines.',
  init: 'Anchor a dummy before the head so pair 1 needs no special case; dummy.next always tracks the answer while prev marks the seam.',
  probe: 'Certify a full pair from the seam: prev.next is first and first.next is second; a missing link proves only a leftover remains.',
  link: 'Flip one pair link after its successor is known; second.next is still intact until the second write lands.',
  connect: 'Stitch the seam to the pair new head (second), closing the swapped pair into the answer chain.',
  advance: 'Move the seam to first (now the pair tail) so the next probe starts exactly after the finished pair.',
  verify: 'Read the chain from dummy.next once no full pair remains; every certified pair appears swapped exactly once.',
  return: 'Return dummy.next, the only pointer that tracks the new head after pair 1 moves it.',
});

export const EXPLAIN_LINES = Object.freeze({
  java: {
    9: 'Loop guard: both prev.next and prev.next.next must exist — one leftover node exits here with its link untouched.',
    12: 'End of the pair flip: both pair links now point at their swapped targets.',
    14: 'End of one pair pass: the seam moved to first (the pair tail) for the next probe.',
    16: 'Report dummy.next, which tracked the new head since pair 1 moved it.',
  },
  cpp: {
    9: 'Loop guard: both prev->next and prev->next->next must exist — one leftover node exits here with its link untouched.',
    12: 'End of the pair flip: both pair links now point at their swapped targets.',
    14: 'End of one pair pass: the seam moved to first (the pair tail) for the next probe.',
    16: 'Report dummy.next, which tracked the new head since pair 1 moved it.',
  },
  pseudo: {
    5: 'One pair pass: redirect first around second, point second back at first, stitch the seam, advance it.',
  },
});

function decodeList(value) {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('swap-pairs walkthrough needs head as an array of at most ' + MAX_NODES + ' node values');
  if (value.length > MAX_NODES) {
    throw new Error('Visual walkthrough limited to ' + MAX_NODES + ' nodes; got ' + value.length);
  }
  value.forEach((v, i) => {
    if (!Number.isSafeInteger(v)) throw new Error('head[' + i + '] must be an integer');
    if (v < MIN_VAL || v > MAX_VAL) throw new Error('head[' + i + '] out of range [' + MIN_VAL + ', ' + MAX_VAL + ']');
  });
  return value.slice();
}

function checkedArgs(args) {
  if (!Array.isArray(args) || args.length !== 1) throw new Error('swapPairs walkthrough needs [head] as its single input');
  return decodeList(args[0]);
}

function label(id, values) {
  if (id === null || id === undefined) return 'null';
  if (id === -1) return 'dummy';
  return `node${id}(${values[id]})`;
}

const ptr = (id) => (id === -1 ? null : id);

/** Independent oracle: pairwise swap on a value array (no pointers, no seam). */
export function swapPairsOracle(values) {
  const out = values.slice();
  for (let i = 0; i + 1 < out.length; i += 2) {
    const t = out[i];
    out[i] = out[i + 1];
    out[i + 1] = t;
  }
  return out;
}

export function buildSwapPairs(args) {
  const source = checkedArgs(args);
  const n = source.length;
  const values = source.slice();
  // Stable node identities 0..n-1; next[] holds a node id or null.
  // prev uses -1 for the dummy head (rendered as null pointer + label).
  const next = values.map((_, i) => (i + 1 < n ? i + 1 : null));
  let headId = n > 0 ? 0 : null;
  let prev = -1;
  const frames = [];
  const anchors = [];
  let swCmp = 0;
  let swWrites = 0;
  const swOps = () => ({ cmp: swCmp, writes: swWrites });

  const snapNodes = () => values.map((value, id) => ({ id, value, next: next[id] }));
  const chainValues = () => {
    const out = [];
    let id = headId;
    const guard = new Set();
    while (id !== null && !guard.has(id)) {
      guard.add(id);
      out.push(values[id]);
      id = next[id];
    }
    return out;
  };
  const stateOf = (current, extra) => ({
    current,
    nodes: snapNodes(),
    pointers: { prev: ptr(prev), ...(extra && extra.pointers ? extra.pointers : {}) },
    removed: [],
    answer: chainValues(),
    vars: { prev: label(prev, values), n, ...(extra && extra.vars ? extra.vars : {}) },
  });
  const push = (step, lbl, note, st) => {
    frames.push(frame(step, lbl, note, st));
  };

  anchors.push(0);
  push(
    'init',
    'Initialize',
    n === 0
      ? 'n=0; dummy->null; prev=dummy; empty list'
      : `n=${n}; dummy->${label(headId, values)}; prev=dummy`,
    stateOf(ptr(prev), { pointers: { first: headId }, vars: { first: label(headId, values) } }),
  );

  let pairNo = 0;
  for (;;) {
    const first = prev === -1 ? headId : next[prev];
    const second = first === null ? null : next[first];
    if (first === null || second === null) {
      const rest = first === null ? 0 : 1;
      swCmp += 1;
      push(
        'probe',
        rest === 0 ? 'No nodes left' : 'Leftover kept',
        rest === 0
          ? 'prev.next is null; no pair to certify'
          : `${label(first, values)} has no partner; stays linked as-is`,
        { ...stateOf(ptr(prev), { pointers: { first }, vars: { first: label(first, values), remainder: rest } }), ops: swOps() },
      );
      break;
    }
    pairNo++;
    swCmp += 1;
    anchors.push(frames.length);
    push(
      'probe',
      `Pair ${pairNo} certified`,
      `${label(first, values)} + ${label(second, values)}; both links present`,
      { ...stateOf(ptr(prev), {
        pointers: { first, second },
        vars: { first: label(first, values), second: label(second, values) },
      }), ops: swOps() },
    );
    // Real rewiring, recorded link by link (same order as the reference code).
    const after = next[second];
    next[first] = after;
    swWrites += 1;
    push(
      'link',
      'Bypass second',
      `${label(first, values)}.next->${label(after, values)}; rest of list saved`,
      { ...stateOf(ptr(first), {
        pointers: { first, second },
        vars: { first: label(first, values), second: label(second, values) },
      }), ops: swOps() },
    );
    next[second] = first;
    swWrites += 1;
    push(
      'link',
      'Point second at first',
      `${label(second, values)}.next->${label(first, values)}; pair order flipped`,
      { ...stateOf(ptr(second), {
        pointers: { first, second },
        vars: { first: label(first, values), second: label(second, values) },
      }), ops: swOps() },
    );
    if (prev === -1) headId = second;
    else next[prev] = second;
    swWrites += 1;
    anchors.push(frames.length);
    push(
      'connect',
      `Stitch pair ${pairNo}`,
      `prev->${label(second, values)}; pair closes into the answer chain`,
      { ...stateOf(ptr(prev), {
        pointers: { prev: ptr(prev), second },
        vars: { second: label(second, values) },
      }), ops: swOps() },
    );
    prev = first;
    push(
      'advance',
      'Advance seam',
      `prev=${label(prev, values)} (pair tail); next probe starts after it`,
      { ...stateOf(ptr(prev), {
        pointers: { prev: ptr(prev) },
        vars: { first: label(first, values), second: label(second, values) },
      }), ops: swOps() },
    );
  }

  const result = chainValues();
  push(
    'verify',
    'Chain check',
    headId === null
      ? 'empty list; 0 node(s) linked'
      : `head=${label(headId, values)}; ${result.length} node(s) linked`,
    { ...stateOf(headId, { pointers: { head: headId }, vars: { head: label(headId, values) } }), ops: swOps() },
  );
  anchors.push(frames.length);
  push(
    'return',
    'Return head',
    `return dummy.next; result [${result.join(',')}]`,
    { ...stateOf(headId, { pointers: { head: headId }, vars: { head: label(headId, values) } }), ops: swOps() },
  );
  anchors.push(frames.length - 1);

  const initialEdges = values.map((_, i) => (i + 1 < n ? [i, i + 1] : null)).filter(Boolean);
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
  };
}

export const build = buildSwapPairs;

export const adapters = {
  'swap-nodes-in-pairs': {
    signature: SIGNATURE,
    lesson: LESSON,
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    code: { java: swapJava, cpp: swapCpp, pseudo: swapPseudo },
    build: buildSwapPairs,
  },
};
