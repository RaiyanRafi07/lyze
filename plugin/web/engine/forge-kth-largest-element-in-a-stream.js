/**
 * kth-largest-element-in-a-stream — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `kth-largest-element-in-a-stream`
 * (Kth Largest Element in a Stream, Easy, test-profile kthLargestAdd(int,int[],int[])->int[],
 * mode exact). The live judge record (plugin/data/shard-1.json, id 703) is judge null —
 * a design/class problem with no single-call signature — so practice runs through this
 * HONEST TEST PROFILE (precedent: runTrieOps), documented in the adapter. Not official.
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed + seeded inputs (FNV-1a + mulberry32 from the slug); every expected value is
 * computed at build time by bruteOracle below (FULL SORT per add, editorial Approach 1),
 * an INDEPENDENT implementation of the same operation (not the walkthrough's min-heap),
 * cross-checked against a file-local heap re-implementation; disagreement throws.
 *
 * Staged source: .workers/jobs/neetcode150-completion/kth-largest-element-in-a-stream/kth-stream.practice.mjs
 * (statements, hints, oracles); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the staged test-profile signature, so the same editor code compiles unchanged.
 * - `args` are raw literal strings; `expected` is the JSON literal of the add() results.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (ordered JSON arrays).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'kth-largest-element-in-a-stream';

export const SIGNATURE = Object.freeze({
  name: 'kthLargestAdd',
  params: Object.freeze([
    { name: 'k', type: 'int' },
    { name: 'nums', type: 'int[]' },
    { name: 'adds', type: 'int[]' },
  ]),
  return: 'int[]',
});

export const MODE = 'exact';
export const DIFFICULTY = 'Easy';

export const INTENT_SAME = 'Same class-sequence task, different numbers so you reproduce the reasoning.';
export const INTENT_EDGE = 'Same class-sequence task with the edge cases the examples hide.';
export const INTENT_ADVERSARIAL = 'Same class-sequence task with adversarial placements that punish shortcuts.';

function siftUp(h, i) {
  while (i > 0) { const p = (i - 1) >> 1; if (h[p] <= h[i]) break; const t = h[p]; h[p] = h[i]; h[i] = t; i = p; }
}

function siftDown(h, i) {
  for (;;) {
    const l = 2 * i + 1; const r = 2 * i + 2; let s = i;
    if (l < h.length && h[l] < h[s]) s = l;
    if (r < h.length && h[r] < h[s]) s = r;
    if (s === i) break;
    const t = h[s]; h[s] = h[i]; h[i] = t; i = s;
  }
}

// Cross-check oracle: size-k min-heap (the taught algorithm, re-implemented file-local).
export function heapOracle(k, nums, adds) {
  const heap = [];
  const offer = (x) => { heap.push(x); siftUp(heap, heap.length - 1); };
  const poll = () => {
    const top = heap[0]; const last = heap.pop();
    if (heap.length > 0) { heap[0] = last; siftDown(heap, 0); }
    return top;
  };
  for (const x of nums) { offer(x); if (heap.length > k) poll(); }
  const out = [];
  for (const v of adds) { offer(v); if (heap.length > k) poll(); out.push(heap[0]); }
  return out;
}

/** INDEPENDENT reference oracle: full descending sort per add (editorial Approach 1). */
export function bruteOracle(k, nums, adds) {
  const stream = nums.slice();
  const out = [];
  for (const v of adds) {
    stream.push(v);
    const sorted = stream.slice().sort((a, b) => b - a);
    out.push(sorted[k - 1]);
  }
  return out;
}

function hashText(text) {
  const s = String(text);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  };
}

function inputLine(signature, args) {
  return signature.params
    .map((param, index) => `${(param && param.name) || 'arg' + index} = ${args[index]}`)
    .join(', ');
}

function buildVariant({ id, seedLabel, intent, titleSuffix, statement, tests, hints }) {
  const capped = tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
  const first = capped[0];
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title: 'Kth Largest Element in a Stream — ' + titleSuffix,
    statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(SIGNATURE, first.args), output: first.expected, explain: '' }],
    tests: capped,
    mode: MODE,
    hints: hints.slice(0, 2),
  };
}

function checkedTest(k, nums, adds) {
  const a = heapOracle(k, nums, adds);
  const b = bruteOracle(k, nums, adds);
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error('oracle disagreement for k=' + k + ' nums=[' + nums + '] adds=[' + adds + ']');
  }
  return { args: [String(k), JSON.stringify(nums), JSON.stringify(adds)], expected: JSON.stringify(b) };
}

function buildV1(rng) {
  const rows = [];
  let guard = 0;
  while (rows.length < 4 && guard++ < 200) {
    const nInit = randInt(rng, 2, 6);
    const nAdds = randInt(rng, 3, 5);
    const k = randInt(rng, 1, Math.min(4, nInit + 1));
    const nums = Array.from({ length: nInit }, () => randInt(rng, -10, 20));
    const adds = Array.from({ length: nAdds }, () => randInt(rng, -10, 20));
    rows.push(checkedTest(k, nums, adds));
  }
  return buildVariant({
    id: 'v1',
    seedLabel: 'fresh values',
    intent: INTENT_SAME,
    titleSuffix: 'fresh values (same task)',
    statement:
      'A KthLargest instance is built with integer k and initial array nums, then add(val) is called once per entry of adds in order. Return the list of add() results (the kth largest after each call). These fresh inputs use 2 to 6 initial scores and 3 to 5 calls with values between -10 and 20. Same method signature and exact comparison as the worked example.',
    tests: rows,
    hints: [
      'Keep only the k largest scores in a min-heap; its top is each answer.',
      'Push each new score, then pop while the heap holds more than k entries.',
    ],
  });
}

function buildV2() {
  return buildVariant({
    id: 'v2',
    seedLabel: 'edge cases',
    intent: INTENT_EDGE,
    titleSuffix: 'edge cases (same task)',
    statement:
      'Same KthLargest task with the boundary inputs: an empty initial stream with k=1, k=1 tracking only the maximum, all-duplicate pools, -10^4/10^4 extremes with negatives, and k == nums.length + 1 where the first add() fills the heap before any eviction. Return the list of add() results in call order.',
    tests: [
      checkedTest(1, [], [5]),
      checkedTest(1, [3], [-4, 0, 10]),
      checkedTest(3, [7, 7, 7, 7, 8, 3], [2, 10, 9, 9]),
      checkedTest(2, [-10000, 10000, 0], [-10000, 10000, -5]),
      checkedTest(4, [4, 5, 8], [2, 6, 1]),
    ],
    hints: [
      'An empty initial stream is legal; the first add() calls only fill the heap up to k.',
      'Duplicates are separate entries: never deduplicate the heap contents.',
    ],
  });
}

function buildV3() {
  const rows = [
    checkedTest(3, [20, 15, 10, 5], [6, 11, 16, 21]),
    checkedTest(2, [5, 5, 5, 5], [5, 9, 1, 9]),
    checkedTest(3, [8, 1], [6, 2, 7]),
    checkedTest(1, [-3, 4, -1], [2, -5, 6, -6]),
  ];
  for (const t of rows) {
    const k = Number(t.args[0]);
    const nums = JSON.parse(t.args[1]);
    const adds = JSON.parse(t.args[2]);
    if (JSON.stringify(bruteOracle(k, nums, adds)) !== t.expected) throw new Error('v3 oracle recheck failed');
  }
  return buildVariant({
    id: 'v3',
    seedLabel: 'adversarial shapes',
    intent: INTENT_ADVERSARIAL,
    titleSuffix: 'adversarial shapes (same task)',
    statement:
      'Same KthLargest question with adversarial placements and no rule change: a descending start met by ascending calls (every call evicts), a duplicate pool hiding a late spike, k equal to the running stream size (the answer is the running minimum), and k=1 sign flips around zero. Return the list of add() results in call order with the same method signature and exact comparison.',
    tests: rows,
    hints: [
      'Trace the heap top, not the sorted stream: only index 0 is meaningful after each call.',
      'With k equal to the stream size nothing is ever evicted, so the minimum of all scores seen is the answer.',
    ],
  });
}

/* ---------------- entry point ---------------- */

export function buildKthStreamPractice() {
  const rng = mulberry32(hashText(SLUG));
  return [buildV1(rng), buildV2(), buildV3()];
}

// Staged-compat alias: same builder, family-style name.
export const buildPracticeVariants = buildKthStreamPractice;

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'bruteOracle (full descending sort per add; walkthrough uses the size-k min-heap)',
});

export default buildKthStreamPractice;
