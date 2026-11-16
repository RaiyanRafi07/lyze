// Per-slug completion module — top-k-frequent-elements (delivery-sprint-20261107).
// Ready-to-import staging module: integration needs only registry wiring (see integration.json).
// Live adapter already ships in plugin/web/engine/heap-adapters.js (buildTopKFrequent +
// topkJava/topkCpp/topkPseudo + lesson); this file does NOT duplicate it. It delivers only
// the missing working parts:
//   (a) explanation patch keyed to the LIVE reference line indices (java 24 / cpp 37 / pseudo 13),
//   (b) standalone live-forge-compatible variant builder (3 deterministic variants),
//   (c) semantic view helper consuming ONLY actual rendered scene fields.
// Pure ES module: no DOM, no network, no dependencies. Node- and browser-importable.
//
// Provenance: plugin/data/shard-6.json id=347 slug=top-k-frequent-elements,
//   title "Top K Frequent Elements", Medium, pattern heap-topk,
//   judge mode unordered, signature topKFrequent(int[] nums, int k) -> int[],
//   tests ["[1,1,1,2,2,3]","2"]->"[1,2]" and ["[1]","1"]->"[1]".

export const slug = 'top-k-frequent-elements';

export const SIGNATURE = Object.freeze({
  name: 'topKFrequent',
  params: Object.freeze([
    Object.freeze({ name: 'nums', type: 'int[]' }),
    Object.freeze({ name: 'k', type: 'int' }),
  ]),
  return: 'int[]',
});

export const JUDGE_MODE = 'unordered';

// Live reference line counts (plugin/web/engine/heap-adapters.js templates
// topkJava / topkCpp / topkPseudo as parsed by semantic-core code()).
export const LIVE_LINE_COUNTS = Object.freeze({ java: 24, cpp: 37, pseudo: 13 });

// ---- (a) explanation patch: per-step notes + per-line notes on LIVE indices ----
// Step notes double as the semantic.js `explain` fallback; line notes fill
// `explainLines[lang][index]`. No sample values are stated as current state.
export const explain = Object.freeze({
  def: 'Scope: return the k most frequent distinct values in any order; exactly the k strongest frequency ranks.',
  init: 'Create the empty value->count map and the empty min-heap ordered by (count asc, value desc) so the heap top is always the eviction candidate.',
  count: 'Read one element and bump its map count; every input position contributes exactly one increment.',
  keep: 'Push one distinct key into the heap; the heap now holds one extra candidate beyond the invariant.',
  evict: 'Heap holds k+1 keys, so pop the top (weakest rank) and restore the best-k invariant.',
  extract: 'Move the heap top into ans; repeated pops drain weakest-first, which is fine because any order is accepted.',
  return: 'Return ans with exactly k entries: the k strongest ranks among all distinct keys.',
});

export const INVARIANT = 'After each distinct key is processed, the heap holds at most k keys with the largest (count, smaller-value) ranks seen so far; eviction always removes the current weakest rank.';
export const COMMON_MISTAKE = 'Sorting the heap array or reading heap index order as the answer rank. A binary heap is partial order only: index 0 is the weakest kept key, the rest are unordered. A second mistake is pushing raw nums values (with duplicates) instead of distinct keys, which over-counts heap size.';
export const BRANCH_REASON = 'heap.size() > k true => the just-pushed key made the kept set too large, so pop the heap top (weakest rank) to restore the best-k invariant. False => the kept set still fits, keep everything and continue.';

export const explainLines = Object.freeze({
  java: Object.freeze({
    0: 'Class scope holding topKFrequent; no state lives here.',
    1: 'Method declaration: inputs nums and k, returns int[]. Names/types match the judge signature exactly.',
    2: 'Declare the empty value->count map; no index is counted yet.',
    3: 'Loop header: visit each element once; x is the current value (enhanced-for, no index needed).',
    4: 'Bump freq[x] by one; getOrDefault keeps the first sighting at 1.',
    5: 'End of the counting loop scope: all n positions are now tallied.',
    6: 'Declare the empty min-heap with a comparator on live freq: weaker count first, larger value first on ties.',
    7: 'Comparator body: compare counts ascending; captures freq, reads only.',
    8: 'Branch: unequal counts decide by count; equal counts fall through to the value tie-break.',
    9: 'Tie-break: larger value sorts first (weaker), so ties keep the smaller value.',
    10: 'End of comparator/heap-declaration scope.',
    11: 'Loop header: visit each distinct key once in first-seen order; key is the candidate.',
    12: 'Push key; heap now holds one candidate beyond the best-k invariant.',
    13: 'Branch: size > k means the invariant is violated and the top must be evicted.',
    14: 'Pop the heap top (weakest rank) to restore at most k kept keys.',
    15: 'End of the eviction branch: a miss falls through keeping all pushed keys.',
    16: 'End of the selection loop: heap holds the k strongest ranks seen so far.',
    17: 'Declare ans with exactly k slots; empty until drained.',
    18: 'Loop header: drain the heap once per kept key; i is the write index.',
    19: 'Pop the current weakest into ans[i]; order is weakest-first, accepted as any order.',
    20: 'End of the drain loop scope.',
    21: 'Return ans with k entries; caller may permute it.',
    22: 'End of method scope.',
    23: 'End of class scope.',
  }),
  cpp: Object.freeze({
    0: 'Include scope: vector for nums/ans.',
    1: 'Include scope: unordered_map for the frequency table.',
    2: 'Include scope: queue for priority_queue.',
    3: 'Using scope: brings std names into scope.',
    4: 'Struct scope: a heap entry carries count plus value.',
    5: 'Entry field: frequency rank key.',
    6: 'Entry field: original value payload.',
    7: 'End of entry struct scope.',
    8: 'Struct scope: comparator making priority_queue a min-heap by rank.',
    9: 'Comparator body: larger count sorts as weaker (popped first); reads only.',
    10: 'Equal counts fall through to the value tie-break.',
    11: 'Tie-break: smaller value sorts as stronger, so ties evict the larger value.',
    12: 'End of comparator body scope.',
    13: 'End of comparator struct scope.',
    14: 'Class scope holding topKFrequent; no state lives here.',
    15: 'Access scope for the public method.',
    16: 'Method declaration: vector<int>& nums plus int k, returns vector<int>. Signature matches the judge.',
    17: 'Declare the empty value->count map.',
    18: 'Loop header: visit each element once by value.',
    19: 'Bump freq[x] by one; first sighting creates count 1.',
    20: 'End of the counting loop scope.',
    21: 'Declare the empty min-heap of count/value entries.',
    22: 'Loop header: visit each map pair once; p holds (value, count).',
    23: 'Push {count, value}; heap holds one extra candidate.',
    24: 'Branch: size > k violates the best-k invariant; the cast keeps signed/unsigned comparison safe.',
    25: 'Pop the heap top (weakest rank) to restore at most k kept keys.',
    26: 'End of the eviction branch.',
    27: 'End of the selection loop scope.',
    28: 'Declare ans; reserve avoids regrowth but adds no elements.',
    29: 'Reserve capacity k; size is still 0.',
    30: 'Loop header: drain while the heap is nonempty.',
    31: 'Append the current top value to ans (weakest-first order, accepted).',
    32: 'Pop the top just read; one fewer candidate remains.',
    33: 'End of the drain loop scope.',
    34: 'Return ans with k entries; caller may permute it.',
    35: 'End of method scope.',
    36: 'End of class scope.',
  }),
  pseudo: Object.freeze({
    0: 'Function scope: inputs nums and k.',
    1: 'freq starts empty; only counted values are ever visible.',
    2: 'Iterate x over every position in order.',
    3: 'Bump the running count of x by one.',
    4: 'heap starts empty with (count asc, value desc) order; top is the eviction candidate.',
    5: 'Iterate distinct keys in first-seen order.',
    6: 'Push the candidate key; heap overshoots the invariant by one.',
    7: 'Branch on whether the heap now holds more than k keys.',
    8: 'Pop the weakest rank to restore best-k.',
    9: 'ans starts empty.',
    10: 'Drain loop: one pop per kept key.',
    11: 'Append the popped weakest to ans.',
    12: 'Return the k kept keys in drain (any) order.',
  }),
});

// ---- shared tiny helpers (local; seeding mirrors the live forge scheme) ----
function hashText(text) {
  const source = String(text);
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < source.length; i += 1) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619) >>> 0;
  return hash;
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
function outLiteral(value) {
  if (Array.isArray(value)) return '[' + value.map(outLiteral).join(',') + ']';
  if (typeof value === 'number') return String(value);
  return String(value);
}
function argLiteral(value) {
  return outLiteral(value);
}
// Independent oracle: sort-based counting, NOT a heap. Rank is
// (count desc, value asc); ties keep the smaller value.
export function topKFrequentOracle(nums, k) {
  const freq = new Map();
  for (const x of nums) freq.set(x, (freq.get(x) || 0) + 1);
  return [...freq.keys()].sort((a, b) => (freq.get(b) - freq.get(a)) || (a - b)).slice(0, k);
}
// Source uniqueness guarantee: the kth rank must be strictly stronger than the
// (k+1)th, so the answer SET is unique and unordered comparison is sound.
export function hasUniqueAnswer(nums, k) {
  const freq = new Map();
  for (const x of nums) freq.set(x, (freq.get(x) || 0) + 1);
  const counts = [...freq.values()].sort((a, b) => b - a);
  if (k >= counts.length) return true;
  return counts[k - 1] > counts[k];
}
function cloneSignature(sig) {
  return { name: sig.name, params: sig.params.map((p) => ({ name: p.name, type: p.type })), return: sig.return };
}
function inputLine(signature, args) {
  return signature.params.map((param, i) => `${param.name} = ${args[i]}`).join(', ');
}
function buildVariant({ id, seedLabel, intent, difficulty, title, statement, signature, tests, mode, hints }) {
  const fixed = tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
  const first = fixed[0];
  return {
    id, seedLabel, intent, difficulty, title, statement,
    signature: cloneSignature(signature),
    examples: [{ input: inputLine(signature, first.args), output: first.expected, explain: '' }],
    tests: fixed, mode: mode || 'exact', hints: hints.slice(0, 2),
  };
}

// ---- (b) live-forge-compatible variant builder ----
// Input: full shard record (CONTRACTS.md section 2). Output: exactly 3 variants
// in the live forge shape, or [] when the record is unsupported. Never throws.
// v1 fresh same-task | v2 edge cases | v3 adversarial same-task drill
// (no rule-change twist: the source guarantees a unique answer and all three
// drills preserve it, so `unordered` stays sound).
export function buildVariantsTopKFrequent(problem) {
  try {
    if (!problem || typeof problem !== 'object') return [];
    if (problem.slug !== 'top-k-frequent-elements') return [];
    const js = problem.judge;
    const jsig = js && js.signature;
    if (!jsig || jsig.name !== SIGNATURE.name || jsig.return !== SIGNATURE.return) return [];
    if (!Array.isArray(jsig.params) || jsig.params.length !== 2) return [];
    if (jsig.params[0].type !== 'int[]' || jsig.params[1].type !== 'int') return [];
    const signature = cloneSignature({ name: jsig.name, params: [{ name: jsig.params[0].name || 'nums', type: 'int[]' }, { name: jsig.params[1].name || 'k', type: 'int' }], return: jsig.return });
    const difficulty = typeof problem.difficulty === 'string' ? problem.difficulty : 'Medium';
    const base = typeof problem.title === 'string' ? problem.title : 'Top K Frequent Elements';
    const rng = mulberry32(hashText('top-k-frequent-elements'));

    const randInt = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
    // Fresh same-task row: small value domain forces frequency collisions and
    // evictions; uniqueness at the k boundary is enforced, never assumed.
    function freshRow() {
      for (let attempt = 0; attempt < 300; attempt += 1) {
        const n = randInt(5, 9);
        const lo = randInt(-5, 0);
        const nums = Array.from({ length: n }, () => randInt(lo, lo + randInt(3, 6)));
        const distinct = new Set(nums).size;
        if (distinct < 2) continue;
        const k = 1 + Math.floor(rng() * Math.min(distinct, 3));
        if (!hasUniqueAnswer(nums, k)) continue;
        return { nums, k };
      }
      return { nums: [4, 1, 4, 4, 2, 1], k: 2 };
    }
    const v1rows = [freshRow(), freshRow(), freshRow(), freshRow()];
    const v1 = v1rows.map(({ nums, k }) => ({
      args: [argLiteral(nums), String(k)],
      expected: outLiteral(topKFrequentOracle(nums, k)),
    }));

    const v2rows = [
      { nums: [5, 5, 5, 5], k: 1 },
      { nums: [8, 6, 8, 6, 9], k: 3 },
      { nums: [-3, -3, -1, 7, 7, 7], k: 2 },
      { nums: [4, 4, 1, 1, 1, 9, 9, 9, 9], k: 2 },
    ];
    const v2 = v2rows.map(({ nums, k }) => ({
      args: [argLiteral(nums), String(k)],
      expected: outLiteral(topKFrequentOracle(nums, k)),
    }));

    const v3rows = [
      { nums: [6, 1, 7, 2, 7, 6, 1, 7, 7], k: 1 },
      { nums: [3, 1, 2, 3, 1, 2, 3, 4, 4], k: 1 },
      { nums: [5, 5, 2, 8, 2, 8, 9], k: 3 },
      { nums: [0, 0, -1, -1, -1, 2], k: 2 },
    ];
    const v3 = v3rows.map(({ nums, k }) => ({
      args: [argLiteral(nums), String(k)],
      expected: outLiteral(topKFrequentOracle(nums, k)),
    }));

    const mk = (id, suffix, seedLabel, intent, statement, tests, hints) => buildVariant({
      id, seedLabel, intent, difficulty,
      title: `${base} — ${suffix} (frequency ranking drill)`,
      statement, signature, tests, mode: JUDGE_MODE, hints,
    });
    return [
      mk('v1', 'fresh numbers', 'fresh numbers',
        'Same pattern, different numbers so you reproduce the reasoning.',
        'Given an integer array nums and an integer k, return the k most frequent elements in any order. The answer set is unique in every test. Fresh inputs hold 5 to 9 numbers; count first, then keep only the k strongest keys.',
        v1,
        ['Count every value once before ranking anything.', 'Keep a size-k min-heap: whenever it holds k+1 keys, evict its top (the weakest rank).']),
      mk('v2', 'edge cases', 'edge cases',
        'Same pattern with the edge case the original hides.',
        'Same task: return the k most frequent elements in any order with a unique answer set. Edge inputs include a single distinct value, k equal to the distinct count (no eviction happens), negative keys, and one dominant value with k=1.',
        v2,
        ['k equal to the distinct count is valid: every key is kept, none evicted.', 'Negative keys are ordinary map keys; rank by count, never by sign.']),
      mk('v3', 'adversarial drill', 'adversarial drill',
        'Same task, hostile inputs: the drill tests whether the idea transfers.',
        'Same task and same unique-answer guarantee: return the k most frequent elements in any order. Adversarial inputs bury the winner among many distinct keys, cluster ties just below the k boundary to stress the tie-break eviction, and mix zero with negatives.',
        v3,
        ['Ties below the boundary must evict the larger value first so the smaller survives.', 'With k=1 the heap holds one slot: every weaker key must evict correctly.']),
    ];
  } catch {
    return [];
  }
}

// ---- (c) semantic view over ACTUAL rendered scene fields ----
// Consumed live today: diagram heapOverlayValues reads state.heap (heap-topk),
// array tiles read state.values / layout.values, pointer reads state.current,
// walkthrough live-vars read state.vars. state.freq is additive context carried
// by the adapter (map panel / tooltip source). Bounds mirror the live overlay:
// heap shown up to 15 entries, values up to 9. No bar chart, no invented fields.
export function topKFrequentView(state = {}, layout = {}) {
  const values = Array.isArray(state.values)
    ? state.values.slice(0, 9)
    : (Array.isArray(layout.values) ? layout.values.slice(0, 9) : null);
  const current = Number.isInteger(state.current) ? state.current : null;
  const heap = Array.isArray(state.heap) ? state.heap.slice(0, 15) : null;
  const freq = state.freq && typeof state.freq === 'object' && !Array.isArray(state.freq)
    ? Object.fromEntries(Object.entries(state.freq).slice(0, 15).map(([k, v]) => [k, v]))
    : null;
  const vars = state.vars && typeof state.vars === 'object' ? { ...state.vars } : {};
  const heapCaption = typeof state.heapKind === 'string' ? state.heapKind : null;
  const answer = Array.isArray(vars.answer) ? vars.answer.slice() : null;
  const lines = [];
  if (values) lines.push(`tiles [${values.join(',')}]${current !== null ? ` @${current}=${values[current]}` : ''}`);
  if (heap) lines.push(`heap [${heap.join(',')}]${heapCaption ? ` (${heapCaption})` : ''}`);
  if (freq) lines.push(`freq {${Object.entries(freq).map(([k, v]) => `${k}:${v}`).join(', ')}}`);
  if (answer) lines.push(`answer [${answer.join(',')}] (any order)`);
  return { values, current, heap, heapCaption, freq, vars, answer, accessible: lines };
}
