/** Additive LRU Cache walkthrough adapter (146 / lru-cache).
 *
 * The shard record carries judge:null (design/class problem), so there is no
 * official signature to match. This adapter uses an honest TEST PROFILE that
 * flattens the statement transcript into plain args:
 *
 *   runLRUCache(capacity:int, ops:string[], params:int[][]) -> string
 *
 * where capacity is the constructor bound, ops is the get/put transcript
 * (the leading "LRUCache" constructor op is accepted and skipped), params[i]
 * is [key] for get or [key, value] for put, and the expected value is the
 * per-op output-sequence literal (e.g. "[null,null,1,null,-1,null,-1,3,4]",
 * null for the constructor/puts, int for gets), compared with mode "exact".
 *
 * Pure run of the REAL canonical algorithm (HashMap + doubly-linked list with
 * dummy head/tail) over the transcript shape; emits kind: 'linked-list' scenes
 * with stable key identities, per-op `lookup` then `hit`/`miss`/`update`/
 * `evict`+`insert` frames, and runnable Java / C++ / pseudocode references.
 * Visual bound: at most 12 ops (the official 9-op transcript stays at 22
 * frames, budget 6..40); longer runs rely on the shared boundedFrames pass.
 */
import { code, frame, boundedFrames } from './semantic-core.js';

export const SLUG = 'lru-cache';

// TEST PROFILE signature (object form). Documented above; the shard record has
// judge:null so no official signature exists. The adapters entry below carries
// the same profile in the string-array params form.
export const SIGNATURE = Object.freeze({
  name: 'runLRUCache',
  params: Object.freeze([
    { name: 'capacity', type: 'int' },
    { name: 'ops', type: 'string[]' },
    { name: 'params', type: 'int[][]' },
  ]),
  return: 'string',
});

const SIGNATURE_TYPES = ['int', 'string[]', 'int[][]'];

const MAX_OPS = 12;
export const MAX_KEY = 10000;
export const MAX_VALUE = 100000;

export const lruJava = code(`
[def] class LRUCache {
[def]     private static class Node {
[def]         int key, value;
[def]         Node prev, next;
[def]         Node(int key, int value) { this.key = key; this.value = value; }
[def]     }
[def]     private final int capacity;
[def]     private final java.util.HashMap<Integer, Node> map;
[def]     private final Node head, tail;
[init]     public LRUCache(int capacity) {
[init]         this.capacity = capacity;
[init]         this.map = new java.util.HashMap<>();
[init]         this.head = new Node(-1, -1);
[init]         this.tail = new Node(-1, -1);
[init]         head.next = tail;
[init]         tail.prev = head;
[init]     }
[lookup]     public int get(int key) {
[lookup]         Node node = map.get(key);
[miss]         if (node == null) return -1;
[hit]         moveToFront(node);
[hit]         return node.value;
[hit]     }
[lookup]     public void put(int key, int value) {
[lookup]         Node node = map.get(key);
[update]         if (node != null) {
[update]             node.value = value;
[update]             moveToFront(node);
[update]             return;
[update]         }
[evict]         if (map.size() == capacity) {
[evict]             Node lru = tail.prev;
[evict]             remove(lru);
[evict]             map.remove(lru.key);
[evict]         }
[insert]         Node fresh = new Node(key, value);
[insert]         map.put(key, fresh);
[insert]         addFront(fresh);
[insert]     }
[def]     private void remove(Node node) {
[def]         node.prev.next = node.next;
[def]         node.next.prev = node.prev;
[def]     }
[def]     private void addFront(Node node) {
[def]         node.next = head.next;
[def]         node.prev = head;
[def]         head.next.prev = node;
[def]         head.next = node;
[def]     }
[def]     private void moveToFront(Node node) {
[def]         remove(node);
[def]         addFront(node);
[def]     }
[done]     // transcript closed: per-op outputs recorded in order
[def] }
`);

export const lruCpp = code(`
[def] class LRUCache {
[def] public:
[def]     struct Node {
[def]         int key, value;
[def]         Node *prev, *next;
[def]         Node(int k, int v): key(k), value(v), prev(nullptr), next(nullptr) {}
[def]     };
[def]     int capacity;
[def]     std::unordered_map<int, Node*> map;
[def]     Node *head, *tail;
[init]     LRUCache(int capacity_) {
[init]         capacity = capacity_;
[init]         head = new Node(-1, -1);
[init]         tail = new Node(-1, -1);
[init]         head->next = tail;
[init]         tail->prev = head;
[init]     }
[lookup]     int get(int key) {
[lookup]         auto it = map.find(key);
[miss]         if (it == map.end()) return -1;
[hit]         moveToFront(it->second);
[hit]         return it->second->value;
[hit]     }
[lookup]     void put(int key, int value) {
[lookup]         auto it = map.find(key);
[update]         if (it != map.end()) {
[update]             it->second->value = value;
[update]             moveToFront(it->second);
[update]             return;
[update]         }
[evict]         if ((int)map.size() == capacity) {
[evict]             Node* lru = tail->prev;
[evict]             remove(lru);
[evict]             map.erase(lru->key);
[evict]             delete lru;
[evict]         }
[insert]         Node* fresh = new Node(key, value);
[insert]         map[key] = fresh;
[insert]         addFront(fresh);
[insert]     }
[def]     void remove(Node* node) {
[def]         node->prev->next = node->next;
[def]         node->next->prev = node->prev;
[def]     }
[def]     void addFront(Node* node) {
[def]         node->next = head->next;
[def]         node->prev = head;
[def]         head->next->prev = node;
[def]         head->next = node;
[def]     }
[def]     void moveToFront(Node* node) {
[def]         remove(node);
[def]         addFront(node);
[def]     }
[done]     // transcript closed: per-op outputs recorded in order
[def] };
`);

export const lruPseudo = code(`
[def] LRUCache(capacity):
[init]   map = {}; head = sentinel; tail = sentinel; head.next = tail; tail.prev = head
[lookup] get(key):
[lookup]   node = map.get(key)
[miss]   if node is null: return -1
[hit]   moveToFront(node); return node.value
[lookup] put(key, value):
[lookup]   node = map.get(key)
[update]   if node exists: node.value = value; moveToFront(node); return
[evict]   if size(map) == capacity: lru = tail.prev; unlink(lru); delete map[lru.key]
[insert]   fresh = Node(key, value); map[key] = fresh; linkAfter(head, fresh)
[def] unlink(node): node.prev.next = node.next; node.next.prev = node.prev
[def] linkAfter(head, node): splice node between head and head.next
[def] moveToFront(node): unlink(node); linkAfter(head, node)
[done] transcript closed: per-op outputs recorded in order
`);

function parseLiteral(value) {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (text === '') throw new Error('Empty walkthrough input');
  return JSON.parse(text);
}

function decodeCapacity(value) {
  const raw = parseLiteral(value);
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isSafeInteger(n) || n < 1 || n > 3000) {
    throw new Error('capacity must be an integer in [1, 3000] (got ' + String(value) + ')');
  }
  return n;
}

function decodeOps(value) {
  const raw = parseLiteral(value);
  if (!Array.isArray(raw)) throw new Error('ops must be an array of "get"/"put" strings');
  const ops = raw.filter((op) => op !== 'LRUCache').map((op) => String(op));
  for (const op of ops) {
    if (op !== 'get' && op !== 'put') throw new Error('Unknown op "' + op + '" (expected get/put)');
  }
  if (ops.length === 0) throw new Error('At least one get/put op is required');
  if (ops.length > MAX_OPS) {
    throw new Error('Visual walkthrough limited to ' + MAX_OPS + ' ops; got ' + ops.length);
  }
  return ops;
}

function decodeParams(value, ops) {
  const raw = parseLiteral(value);
  if (!Array.isArray(raw)) throw new Error('params must be an array aligned with ops');
  const rows = raw[0] === undefined && ops.length === 0 ? [] : raw;
  if (rows.length !== ops.length + (raw.length === ops.length + 1 ? 0 : 0) && rows.length !== ops.length) {
    // Accept the transcript shape where params[0] belongs to the constructor.
    if (!(rows.length === ops.length + 1)) {
      throw new Error('params length ' + rows.length + ' does not match ops length ' + ops.length);
    }
    rows.shift();
  }
  return ops.map((op, i) => {
    const row = Array.isArray(rows[i]) ? rows[i] : [rows[i]];
    if (op === 'get') {
      const key = Number(row[0]);
      if (!Number.isSafeInteger(key) || key < 0 || key > MAX_KEY) {
        throw new Error('get key[' + i + '] out of range [0, ' + MAX_KEY + ']');
      }
      return { op, key };
    }
    const key = Number(row[0]);
    const val = Number(row[1]);
    if (!Number.isSafeInteger(key) || key < 0 || key > MAX_KEY) {
      throw new Error('put key[' + i + '] out of range [0, ' + MAX_KEY + ']');
    }
    if (!Number.isSafeInteger(val) || val < 0 || val > MAX_VALUE) {
      throw new Error('put value[' + i + '] out of range [0, ' + MAX_VALUE + ']');
    }
    return { op, key, value: val };
  });
}

/** Canonical LRU run. Returns { scene, outputs } where outputs aligns with ops
 *  (get -> int, put -> null). Scene frames record only computed state. */
export function buildLruCache(args) {
  if (!Array.isArray(args) || args.length !== 3) {
    throw new Error('lru-cache walkthrough needs [capacity, ops, params]');
  }
  const capacity = decodeCapacity(args[0]);
  const opNames = decodeOps(args[1]);
  const calls = decodeParams(args[2], opNames);
  const hasCtor = String(args[1]).includes('LRUCache');

  // Stable key identities: first-seen order over the whole transcript.
  const seen = [];
  for (const call of calls) {
    if (!seen.includes(call.key)) seen.push(call.key);
  }
  const layoutIndex = (key) => seen.indexOf(key);

  const order = []; // MRU first, real doubly-linked-list contents (keys)
  const map = new Map(); // key -> value, real hash-map contents
  // LeetCode transcript convention: the constructor call produces a null slot.
  // decodeOps skips it, so restore it here to keep outputs aligned 1:1 with ops.
  const outputs = hasCtor ? [null] : [];
  const frames = [];
  const anchors = [];

  const snapMap = () => {
    const out = {};
    for (const [k, v] of map) out[String(k)] = v;
    return out;
  };
  const state = (extra = {}) => ({
    order: order.slice(),
    map: snapMap(),
    capacity,
    size: order.length,
    vars: { capacity, size: order.length },
    pointers: {},
    removed: [],
    ...extra,
  });
  const push = (step, label, note, extra) => frames.push(frame(step, label, note, state(extra)));

  anchors.push(0);
  push('init', 'Create cache', 'capacity=' + capacity + '; map empty; list empty', {
    op: { type: 'init', capacity },
    result: null,
    hit: null,
    touched: null,
    evicted: null,
    vars: { capacity, size: 0 },
  });

  calls.forEach((call, n) => {
    const tag = 'op ' + (n + 1) + '/' + calls.length;
    if (call.op === 'get') {
      const known = map.has(call.key);
      push('lookup', 'get(' + call.key + ') lookup', tag + ': read map[' + call.key + ']' + (known ? ' (present)' : ' (absent)'), {
        op: { type: 'get', key: call.key },
        result: null,
        hit: null,
        touched: null,
        evicted: null,
        pointers: known ? { touch: layoutIndex(call.key) } : {},
        vars: { capacity, size: order.length, key: call.key },
      });
      if (!known) {
        outputs.push(-1);
        push('miss', 'get(' + call.key + ') miss', tag + ': key absent; return -1; order kept', {
          op: { type: 'get', key: call.key },
          result: -1,
          hit: false,
          touched: null,
          evicted: null,
          vars: { capacity, size: order.length, key: call.key, result: -1 },
        });
      } else {
        const value = map.get(call.key);
        order.splice(order.indexOf(call.key), 1);
        order.unshift(call.key);
        outputs.push(value);
        anchors.push(frames.length);
        push('hit', 'get(' + call.key + ') hit', tag + ': return ' + value + '; move key to front', {
          op: { type: 'get', key: call.key },
          result: value,
          hit: true,
          touched: call.key,
          evicted: null,
          pointers: { touch: layoutIndex(call.key) },
          vars: { capacity, size: order.length, key: call.key, result: value },
        });
      }
      return;
    }
    // put(key, value)
    const known = map.has(call.key);
    push('lookup', 'put(' + call.key + ', ' + call.value + ') lookup', tag + ': read map[' + call.key + ']' + (known ? ' (present)' : ' (absent)'), {
      op: { type: 'put', key: call.key, value: call.value },
      result: null,
      hit: null,
      touched: null,
      evicted: null,
      pointers: known ? { touch: layoutIndex(call.key) } : {},
      vars: { capacity, size: order.length, key: call.key, value: call.value },
    });
    if (known) {
      map.set(call.key, call.value);
      order.splice(order.indexOf(call.key), 1);
      order.unshift(call.key);
      outputs.push(null);
      anchors.push(frames.length);
      push('update', 'put updates key ' + call.key, tag + ': value=' + call.value + '; move key to front', {
        op: { type: 'put', key: call.key, value: call.value },
        result: null,
        hit: true,
        touched: call.key,
        evicted: null,
        pointers: { touch: layoutIndex(call.key) },
        vars: { capacity, size: order.length, key: call.key, value: call.value },
      });
      return;
    }
    outputs.push(null);
    if (order.length === capacity) {
      const lru = order[order.length - 1];
      anchors.push(frames.length);
      push('evict', 'Cache full: evict ' + lru, tag + ': size ' + order.length + '/' + capacity + '; drop LRU key ' + lru, {
        op: { type: 'put', key: call.key, value: call.value },
        result: null,
        hit: false,
        touched: null,
        evicted: lru,
        removed: [layoutIndex(lru)],
        pointers: { touch: layoutIndex(call.key) },
        vars: { capacity, size: order.length, key: call.key, value: call.value },
      });
      order.pop();
      map.delete(lru);
      map.set(call.key, call.value);
      order.unshift(call.key);
      push('insert', 'Insert key ' + call.key, tag + ': store ' + call.key + '=' + call.value + ' at front', {
        op: { type: 'put', key: call.key, value: call.value },
        result: null,
        hit: false,
        touched: call.key,
        evicted: lru,
        pointers: { touch: layoutIndex(call.key) },
        vars: { capacity, size: order.length, key: call.key, value: call.value },
      });
      return;
    }
    map.set(call.key, call.value);
    order.unshift(call.key);
    push('insert', 'Insert key ' + call.key, tag + ': store ' + call.key + '=' + call.value + ' at front', {
      op: { type: 'put', key: call.key, value: call.value },
      result: null,
      hit: false,
      touched: call.key,
      evicted: null,
      pointers: { touch: layoutIndex(call.key) },
      vars: { capacity, size: order.length, key: call.key, value: call.value },
    });
  });

  const gets = outputs.filter((v) => v !== null);
  anchors.push(frames.length);
  push('done', 'Walkthrough done', 'final MRU order [' + order.join(', ') + ']; gets [' + gets.join(', ') + ']', {
    op: { type: 'done' },
    result: null,
    hit: null,
    touched: null,
    evicted: null,
    vars: { capacity, size: order.length },
  });
  anchors.push(frames.length - 1);

  return {
    scene: {
      kind: 'linked-list',
      title: 'LRU Cache — hash map + doubly-linked list',
      subtitle: 'Look up first; the tail is always the next eviction',
      pattern: 'design',
      layout: {
        values: seen.slice(),
        nodes: seen.map((key) => ({ id: key, value: key })),
        edges: [],
      },
      frames,
      result: outputs.slice(),
      anchors: [...new Set(anchors.filter((i) => Number.isInteger(i) && i >= 0 && i < frames.length))].sort((a, b) => a - b),
    },
    outputs,
  };
}

// Official statement transcript (integration.json examples[0]): the default
// walkthrough input when buildScene is given no explicit args. Real data.
const OFFICIAL = {
  capacity: 2,
  ops: ['put', 'put', 'get', 'put', 'get', 'put', 'get', 'get', 'get'],
  params: [[1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]],
};

// Live-forge-compatible entry: buildScene(problem, options) -> CONTRACTS scene
// (v 1, kind linked-list, 6..40 frames) or null. Pure, synchronous, never throws.
// Accepts explicit { capacity, ops, params } or options.args=[capacity,ops,params];
// with no input it runs the official statement transcript above (never invents).
export function buildScene(problem, options = {}) {
  try {
    let cap = (options && options.capacity !== undefined) ? options.capacity
      : (problem && problem.capacity !== undefined) ? problem.capacity : undefined;
    let ops = (options && options.ops !== undefined) ? options.ops
      : (problem && problem.ops !== undefined) ? problem.ops : undefined;
    let params = (options && options.params !== undefined) ? options.params
      : (problem && problem.params !== undefined) ? problem.params : undefined;
    if (cap === undefined && options && Array.isArray(options.args) && options.args.length === 3) {
      [cap, ops, params] = options.args;
    }
    if (cap === undefined) {
      cap = OFFICIAL.capacity;
      ops = OFFICIAL.ops;
      params = OFFICIAL.params;
    }
    const built = buildLruCache([cap, ops, params]);
    // Single compaction pass (mirrors semantic.js): full honest events in,
    // at most 40 frames out; anchors (hits/updates/evicts) survive when budgeted.
    let { frames } = boundedFrames(built.scene.frames, 40, built.scene.anchors || []);
    if (frames.length < 6) {
      // Same short-run rule as semantic.js: honest context cards repeating real
      // snapshots, explicitly not extra operations.
      const first = frames[0];
      const last = frames[frames.length - 1];
      const context = [
        { ...first, label: 'Context: input', note: ('capacity=' + cap + '; ' + (Array.isArray(ops) ? ops.length : 0) + ' ops').slice(0, 140) },
        { ...first, label: 'Context: task', note: 'get returns the value or -1; put inserts or updates at the front.' },
        { ...first, label: 'Context: invariant', note: 'Map owns membership; the list owns recency; tail evicts next.' },
        { ...last, label: 'Context: returned value', note: 'Actual outputs: ' + JSON.stringify(built.outputs).slice(0, 120) },
      ];
      const needed = 6 - frames.length;
      frames = [...context.slice(0, Math.min(needed, 3)), ...frames, ...context.slice(3, needed > 3 ? 4 : 3)];
    }
    return {
      v: 1,
      kind: 'linked-list',
      title: 'LRU Cache — hash map + doubly-linked list',
      subtitle: 'Look up first; the tail is always the next eviction',
      pattern: (problem && problem.pattern) || 'design',
      camera: { yaw: 0.46, pitch: 0.64, dist: 12 },
      layout: built.scene.layout,
      frames: frames.map((f) => ({ ...f, note: String(f.note).slice(0, 140) })),
    };
  } catch {
    return null;
  }
}

const EXPLAIN = {
  def: 'Declares the node shape and cache scope so pointer logic stays isolated from caller setup.',
  init: 'Seeds an empty map with dummy head/tail linked together so every later splice has valid neighbours.',
  lookup: 'Reads the map for the key without changing anything; the branch outcome is decided next.',
  miss: 'Reports -1 for an absent key while leaving recency order untouched.',
  hit: 'Moves the found node to the front and returns its stored value.',
  update: 'Overwrites the stored value of an existing key and refreshes its recency.',
  evict: 'Drops the tail (least-recently-used) node and deletes its map entry to free one slot.',
  insert: 'Stores a new key at the front of both the map and the recency list.',
  move: 'Unlinks a node then re-links it after the dummy head (used by hit and update paths).',
  done: 'Closes the transcript; the recorded order and get results are final.',
};

export const EXPLAIN_LINES = {
  java: {
    0: 'Class wrapper required by the judge harness; the cache state lives inside.',
    1: 'Node carrier: key for map identity, value for the answer, prev/next for recency links.',
    2: 'Key and stored value travel together so eviction can delete the map entry by key.',
    3: 'Two links only (not a tree): each node has exactly one predecessor and one successor.',
    4: 'Node constructor binds key/value; links are wired later by the splice helpers.',
    5: 'End of the node carrier scope.',
    6: 'Fixed bound: eviction triggers exactly when size reaches this number.',
    7: 'O(1) index from key to its live node; the single source of truth for membership.',
    8: 'Dummy anchors: head guards the MRU end, tail guards the LRU end; never hold data.',
    9: 'Constructor header: capacity is the only input; the cache starts empty.',
    10: 'Init write: remember the bound before any op can consult it.',
    11: 'Init write: empty map means every first lookup misses honestly.',
    12: 'Init write: MRU-side sentinel; real nodes always sit after it.',
    13: 'Init write: LRU-side sentinel; the eviction victim is always before it.',
    14: 'Init link: empty list is head <-> tail, so addFront needs no null checks.',
    15: 'Init link: closes the empty ring; tail.prev is the future eviction slot.',
    16: 'End of constructor scope.',
    17: 'Get header: read-only op that still refreshes recency on a hit.',
    18: 'Lookup read: the only map access in get; order and links are untouched here.',
    19: 'Miss guard: null means absent; return -1 without moving anything.',
    20: 'Hit write: unlink then re-link the node at the front (recency refreshed).',
    21: 'Hit return: the stored value, not the key or a position.',
    22: 'End of get scope.',
    23: 'Put header: write op; never returns a value.',
    24: 'Lookup read: membership test decides update vs insert path below.',
    25: 'Update guard: non-null means the key is already cached.',
    26: 'Update write: overwrite the stored value; stale values must not survive.',
    27: 'Update write: refreshed recency, same as a get hit.',
    28: 'Update exit: an existing key can never trigger eviction.',
    29: 'End of the update branch.',
    30: 'Evict guard: only a NEW key at full size frees a slot.',
    31: 'Evict read: tail.prev is the least-recently-used live node by invariant.',
    32: 'Evict write: bypass the victim in the list (two pointer writes).',
    33: 'Evict write: delete the map entry too, or a later get would find a ghost.',
    34: 'End of the evict branch: at most one key leaves per put.',
    35: 'Insert write: fresh node carries the new key/value pair.',
    36: 'Insert write: map owns membership; the list owns order — both are updated.',
    37: 'Insert write: splice after the dummy head so the key becomes MRU.',
    38: 'End of put scope.',
    39: 'Helper header: bypasses a node; caller decides whether it is a move or a drop.',
    40: 'Unlink write: the predecessor skips over the node.',
    41: 'Unlink write: the successor links back, closing the gap both ways.',
    42: 'End of remove scope.',
    43: 'Helper header: splices a detached node right after the dummy head.',
    44: 'Link write: the node points at the previous front.',
    45: 'Link write: the node anchors to the dummy head.',
    46: 'Link write: the previous front now follows the node.',
    47: 'Link write: the head adopts the node as the new front.',
    48: 'End of addFront scope.',
    49: 'Helper header: the shared refresh used by get-hit and put-update.',
    50: 'Move step one: detach without losing either neighbour.',
    51: 'Move step two: re-attach at the MRU end.',
    52: 'End of moveToFront scope.',
    53: 'Transcript closed: the per-op outputs above are the recorded answer.',
    54: 'End of class scope.',
  },
  cpp: {
    0: 'Class wrapper required by the judge harness; the cache state lives inside.',
    1: 'Public section: the judge constructs and calls get/put directly.',
    2: 'Node carrier: key for map identity, value for the answer, links for recency.',
    3: 'Key and stored value travel together so eviction can erase the map entry by key.',
    4: 'Raw neighbour pointers; the list owns the nodes, the map borrows them.',
    5: 'Node constructor binds key/value and nulls the links until spliced in.',
    6: 'End of the node carrier scope.',
    7: 'Fixed bound: eviction triggers exactly when size reaches this number.',
    8: 'O(1) index from key to its live node; the single source of truth for membership.',
    9: 'Dummy anchors: head guards MRU, tail guards LRU; never hold data.',
    10: 'Constructor header: capacity is the only input; the cache starts empty.',
    11: 'Init write: remember the bound before any op can consult it.',
    12: 'Init write: MRU-side sentinel; real nodes always sit after it.',
    13: 'Init write: LRU-side sentinel; the eviction victim is always before it.',
    14: 'Init link: empty list is head <-> tail, so addFront needs no null checks.',
    15: 'Init link: closes the empty ring; tail->prev is the future eviction slot.',
    16: 'End of constructor scope.',
    17: 'Get header: read-only op that still refreshes recency on a hit.',
    18: 'Lookup read: iterator, not a copy; order and links are untouched here.',
    19: 'Miss guard: end() means absent; return -1 without moving anything.',
    20: 'Hit write: unlink then re-link the found node at the front.',
    21: 'Hit return: the stored value, not the key or a position.',
    22: 'End of get scope.',
    23: 'Put header: write op; never returns a value.',
    24: 'Lookup read: membership test decides update vs insert path below.',
    25: 'Update guard: a live iterator means the key is already cached.',
    26: 'Update write: overwrite the stored value; stale values must not survive.',
    27: 'Update write: refreshed recency, same as a get hit.',
    28: 'Update exit: an existing key can never trigger eviction.',
    29: 'End of the update branch.',
    30: 'Evict guard: only a NEW key at full size frees a slot; size is cast for the compare.',
    31: 'Evict read: tail->prev is the least-recently-used live node by invariant.',
    32: 'Evict write: bypass the victim in the list.',
    33: 'Evict write: erase the map entry too, or a later get would find a ghost.',
    34: 'Evict write: free the node; the map no longer references it.',
    35: 'End of the evict branch: at most one key leaves per put.',
    36: 'Insert write: fresh node carries the new key/value pair.',
    37: 'Insert write: map owns membership; the list owns order — both are updated.',
    38: 'Insert write: splice after the dummy head so the key becomes MRU.',
    39: 'End of put scope.',
    40: 'Helper header: bypasses a node; caller decides move vs drop.',
    41: 'Unlink write: the predecessor skips over the node.',
    42: 'Unlink write: the successor links back, closing the gap both ways.',
    43: 'End of remove scope.',
    44: 'Helper header: splices a detached node right after the dummy head.',
    45: 'Link write: the node points at the previous front.',
    46: 'Link write: the node anchors to the dummy head.',
    47: 'Link write: the previous front now follows the node.',
    48: 'Link write: the head adopts the node as the new front.',
    49: 'End of addFront scope.',
    50: 'Helper header: the shared refresh used by get-hit and put-update.',
    51: 'Move step one: detach without losing either neighbour.',
    52: 'Move step two: re-attach at the MRU end.',
    53: 'End of moveToFront scope.',
    54: 'Transcript closed: the per-op outputs above are the recorded answer.',
    55: 'End of class scope.',
  },
  pseudo: {
    0: 'Function header: names the bound; the map and sentinels are set up below.',
    1: 'Init: empty map plus head/tail sentinels linked together; no special cases later.',
    2: 'Get header: read-only op that still refreshes recency on a hit.',
    3: 'Lookup: single map read; nothing moves until the branch below.',
    4: 'Miss: absent key returns -1 with the order untouched.',
    5: 'Hit: refresh recency and return the stored value in one line.',
    6: 'Put header: write op with key and new value; no return.',
    7: 'Lookup: membership test steering update vs insert/evict.',
    8: 'Update: overwrite value, refresh recency, exit — never evicts.',
    9: 'Evict: at full size, unlink the tail node and delete its map entry.',
    10: 'Insert: fresh node goes in the map and at the front of the list.',
    11: 'Helper: bypass a node by rewiring both neighbours around it.',
    12: 'Helper: splice a detached node directly after the head sentinel.',
    13: 'Helper: refresh means unlink then re-link at the front.',
    14: 'Transcript closed: the per-op outputs above are the recorded answer.',
  },
};

export const adapters = {
  'lru-cache': {
    // TEST PROFILE (shard judge is null): runLRUCache(capacity:int,
    // ops:string[], params:int[][]) -> string (per-op output-sequence literal).
    signature: { name: 'runLRUCache', params: SIGNATURE_TYPES, return: 'string' },
    lesson: {
      idea: 'Hash map finds the node in O(1); a doubly-linked list with dummy head/tail keeps recency so get/put move the node to the front and eviction drops the tail.',
      trap: 'On a get/put hit you must unlink AND re-link the node (updating four pointers); on a full put you must delete the map entry for the evicted key, not just unlink it. Dummy head/tail remove all empty/single-node special cases.',
      time: 'O(1) average per get/put',
      space: 'O(capacity)',
      alt: 'A LinkedHashMap (Java) or list+splice + unordered_map (C++) gives the same O(1) bounds with less pointer code, and a plain array scanned on every op is correct but O(capacity) per call — too slow for 2*10^5 calls. The explicit doubly-linked list is the portable interview answer because it shows the recency mechanics the question is really about.',
    },
    code: { java: lruJava, cpp: lruCpp, pseudo: lruPseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build: (args) => buildLruCache(args).scene,
  },
};
