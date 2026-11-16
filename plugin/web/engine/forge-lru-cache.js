/**
 * lru-cache — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `lru-cache`
 * (LRU Cache, Medium, design/class problem, shard judge:null).
 * Pure ES module: no DOM, no network, no Math.random, no Date (seeded
 * mulberry32 only; fixed edge/adversarial literals).
 *
 * TEST PROFILE (documented; no official signature exists): the statement
 * transcript is flattened to plain args —
 *   runLRUCache(capacity:int, ops:string[], params:int[][]) -> string
 * where capacity is the constructor bound, ops[i] is "get"/"put", params[i]
 * is [key] or [key, value], and the expected value is the per-op
 * output-sequence literal (null for the constructor/puts, int for gets),
 * e.g. capacity=2 with the official transcript -> "[null,null,1,null,-1,null,-1,3,4]".
 * Judge mode is "exact" on that literal string.
 *
 * Every expected value is produced at build time by oracleLRU below (a
 * recency list kept MRU-first plus a key->value store, written from the
 * statement), an INDEPENDENT implementation of the same operation (not the
 * walkthrough's HashMap + doubly-linked-list run).
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the documented TEST PROFILE, so the same editor code
 *   compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (output-sequence literal; exact literal comparison).
 * - `hints` holds exactly 2 hints per variant.
 */

/** @returns {(number|null)[]} outputs aligned with ops (put -> null). */
export function oracleLRU(capacity, ops) {
  if (!Number.isSafeInteger(capacity) || capacity < 1) throw new Error('capacity must be >= 1');
  const order = []; // MRU first (keys)
  const store = new Map(); // key -> value
  const out = [];
  for (const call of ops) {
    if (call.op === 'get') {
      if (!store.has(call.key)) { out.push(-1); continue; }
      order.splice(order.indexOf(call.key), 1);
      order.unshift(call.key);
      out.push(store.get(call.key));
    } else if (call.op === 'put') {
      if (store.has(call.key)) {
        store.set(call.key, call.value);
        order.splice(order.indexOf(call.key), 1);
        order.unshift(call.key);
      } else {
        if (order.length === capacity) store.delete(order.pop());
        store.set(call.key, call.value);
        order.unshift(call.key);
      }
      out.push(null);
    } else {
      throw new Error('Unknown op ' + JSON.stringify(call));
    }
  }
  return out;
}

export const SLUG = 'lru-cache';
export const SIGNATURE = Object.freeze({
  name: 'runLRUCache',
  params: Object.freeze([
    { name: 'capacity', type: 'int' },
    { name: 'ops', type: 'string[]' },
    { name: 'params', type: 'int[][]' },
  ]),
  return: 'string',
});
export const MODE = 'exact';
export const DIFFICULTY = 'Medium';

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.';
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.';
export const INTENT_ADVERSARIAL = 'Same task, hostile placements: the rule is unchanged, recency traps hide.';

const opsLiteral = (ops) => JSON.stringify(ops.map((c) => c.op));
const paramsLiteral = (ops) => JSON.stringify(ops.map((c) => (c.op === 'get' ? [c.key] : [c.key, c.value])));
const outputsLiteral = (out) => JSON.stringify(out);

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

function toTest(capacity, ops) {
  return {
    args: [String(capacity), opsLiteral(ops), paramsLiteral(ops)],
    expected: outputsLiteral(oracleLRU(capacity, ops)),
  };
}

function buildVariant({ id, seedLabel, intent, difficulty, title, statement, signature, tests, mode, hints }) {
  const capped = tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
  const first = capped[0];
  return {
    id,
    seedLabel,
    intent,
    difficulty,
    title,
    statement,
    signature: cloneSignature(signature),
    examples: [{ input: inputLine(signature, first.args), output: first.expected, explain: '' }],
    tests: capped,
    mode: mode || 'exact',
    hints: hints.slice(0, 2),
  };
}

function buildAll({ slug, difficulty, base, sig, seed }) {
  const rng = mulberry32(seed);
  const fresh = [];
  while (fresh.length < 3) {
    const capacity = 2 + Math.floor(rng() * 2); // 2..3
    const n = 6 + Math.floor(rng() * 3); // 6..8 ops
    const ops = [];
    const keyPool = capacity + 2;
    for (let i = 0; i < n; i += 1) {
      if (rng() < 0.45) ops.push({ op: 'get', key: Math.floor(rng() * keyPool) });
      else ops.push({ op: 'put', key: Math.floor(rng() * keyPool), value: Math.floor(rng() * 50) });
    }
    // Keep transcripts inside the visual bound and non-trivial (need a get).
    if (!ops.some((c) => c.op === 'get')) continue;
    if (fresh.some((t) => JSON.stringify(t.ops) === JSON.stringify(ops) && t.capacity === capacity)) continue;
    fresh.push({ capacity, ops });
  }

  const mk = (id, seedLabel, intent, suffix, statement, cases, hints) =>
    buildVariant({
      id,
      seedLabel,
      intent,
      difficulty,
      title: base + ' — ' + suffix + ' (generated, same task)',
      statement,
      signature: sig,
      tests: cases.map(({ capacity, ops }) => toTest(capacity, ops)),
      mode: 'exact',
      hints,
    });

  return [
    mk(
      'v1',
      'fresh transcripts',
      INTENT_SAME,
      'fresh transcripts',
      'Generated exercise, same rule: construct LRUCache(capacity), then run the get/put transcript. get returns the stored value (refreshing recency) or -1 when absent; put inserts or updates at the front, evicting the tail when full.',
      fresh,
      [
        'A get hit moves that key to the front; a miss leaves the order alone.',
        'When the cache is full, the key at the tail (least recently used) is the victim.',
      ]
    ),
    mk(
      'v2',
      'edge cases',
      INTENT_EDGE,
      'edge cases',
      'Generated exercise, same rule on boundary transcripts: capacity 1 (every new key evicts), repeated gets of an absent key, repeated puts updating one key, and a full sweep of gets that rotates recency without evicting. No rule change: get still returns the value or -1, and put still evicts only the tail.',
      [
        { capacity: 1, ops: [{ op: 'put', key: 0, value: 10 }, { op: 'get', key: 0 }, { op: 'put', key: 1, value: 20 }, { op: 'get', key: 0 }, { op: 'get', key: 1 }] },
        { capacity: 2, ops: [{ op: 'get', key: 5 }, { op: 'get', key: 5 }, { op: 'put', key: 5, value: 7 }, { op: 'get', key: 5 }] },
        { capacity: 2, ops: [{ op: 'put', key: 1, value: 1 }, { op: 'put', key: 1, value: 2 }, { op: 'put', key: 1, value: 3 }, { op: 'get', key: 1 }] },
        { capacity: 3, ops: [{ op: 'put', key: 1, value: 1 }, { op: 'put', key: 2, value: 2 }, { op: 'put', key: 3, value: 3 }, { op: 'get', key: 1 }, { op: 'get', key: 2 }, { op: 'get', key: 3 }] },
      ],
      [
        'With capacity 1, put(k2) always evicts k1: trace which get returns -1.',
        'Updating an existing key never evicts, even at full capacity.',
      ]
    ),
    mk(
      'v3',
      'recency traps',
      INTENT_ADVERSARIAL,
      'recency traps',
      'Generated transfer-style exercise, same rule: a get just before a full put flips WHO gets evicted; an update refreshes recency without freeing space, so the following insert evicts a different key than insertion order alone suggests. Trace recency, not insertion order.',
      [
        { capacity: 2, ops: [{ op: 'put', key: 1, value: 1 }, { op: 'put', key: 2, value: 2 }, { op: 'get', key: 1 }, { op: 'put', key: 3, value: 3 }, { op: 'get', key: 2 }, { op: 'get', key: 1 }, { op: 'get', key: 3 }] },
        { capacity: 3, ops: [{ op: 'put', key: 1, value: 1 }, { op: 'put', key: 2, value: 2 }, { op: 'put', key: 3, value: 3 }, { op: 'put', key: 4, value: 4 }, { op: 'get', key: 1 }, { op: 'get', key: 4 }, { op: 'put', key: 2, value: 20 }, { op: 'put', key: 5, value: 5 }, { op: 'get', key: 3 }] },
        { capacity: 2, ops: [{ op: 'put', key: 2, value: 1 }, { op: 'put', key: 1, value: 1 }, { op: 'put', key: 2, value: 3 }, { op: 'put', key: 4, value: 1 }, { op: 'get', key: 1 }, { op: 'get', key: 2 }] },
      ],
      [
        'get(1) before put(3,3) saves key 1 and condemns key 2 — recency, not age.',
        'put(2,20) as an update moves 2 to the front; the next insert evicts the tail, not key 2.',
      ]
    ),
  ];
}

// Registry-style entry mirroring variants.js BUILDERS conventions:
// slug-gated and shape-gated on the documented TEST PROFILE, returns exactly
// three variants or null. Never throws.
export function buildLruCacheDrills(problem, signature) {
  try {
    if (!problem || problem.slug !== 'lru-cache') return null;
    const sig = signature || SIGNATURE;
    if (!sig || sig.name !== 'runLRUCache') return null;
    if (!Array.isArray(sig.params) || sig.params.length !== 3) return null;
    const types = sig.params.map((p) => p.type);
    if (types[0] !== 'int' || types[1] !== 'string[]' || types[2] !== 'int[][]') return null;
    return buildAll({ slug: problem.slug, difficulty: 'Medium', base: 'LRU Cache', sig, seed: 146 });
  } catch {
    return null;
  }
}

export function buildLruCacheVariants(seed = 146) {
  return buildAll({ slug: SLUG, difficulty: DIFFICULTY, base: 'LRU Cache', sig: SIGNATURE, seed });
}

export const VARIANTS = buildLruCacheVariants();

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'oracleLRU (recency list + key-value store sim written from the statement; frame emitter runs HashMap + doubly-linked list)',
});
