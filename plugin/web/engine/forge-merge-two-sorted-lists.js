/**
 * Merge Two Sorted Lists — practice drills (generated exercises, clearly labeled).
 *
 * Ported from the staged delivery-sprint module
 * (`.workers/jobs/delivery-sprint-20261107/merge-two-sorted-lists/merge-two-sorted-lists.module.mjs`
 * `:: buildMergeTwoSortedListsVariants`), renamed to the canonical documented
 * portable builder `buildPracticeVariants`. Same deterministic seeds, same
 * variant shape, same independent oracles (concat + insertion sort — never the
 * adapter's node-splice walk).
 *
 * Independent oracles: oracleMerge / oracleMergeUnique below.
 */

export const SLUG = 'merge-two-sorted-lists';

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.';
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.';
export const INTENT_TWIST = 'Same signature, different question: the twist tests whether the idea transfers.';

/**
 * Independent oracle: merge by concatenation + insertion sort on plain value
 * arrays. Deliberately NOT the adapter's linear node-splice walk, so agreement
 * between the two validates the walkthrough rather than repeating it.
 */
export function oracleMerge(a, b) {
  const out = [...a, ...b];
  for (let i = 1; i < out.length; i += 1) {
    const key = out[i];
    let j = i - 1;
    while (j >= 0 && out[j] > key) {
      out[j + 1] = out[j];
      j -= 1;
    }
    out[j + 1] = key;
  }
  return out;
}

/** Twist oracle: same merge, then drop duplicate values (inputs stay sorted). */
export function oracleMergeUnique(a, b) {
  return oracleMerge(a, b).filter((v, i, arr) => i === 0 || v !== arr[i - 1]);
}

export function assertSorted(a, b) {
  for (const [list, name] of [[a, 'list1'], [b, 'list2']]) {
    for (let i = 1; i < list.length; i += 1) {
      if (list[i - 1] > list[i]) throw new Error(name + ' must be sorted non-decreasing: ' + JSON.stringify(list));
    }
  }
}

function hashText(text) {
  const source = String(text);
  let hash = 2166132621 >>> 0;
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

function randInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** Sorted list of `length` values in [lo, hi] (non-decreasing, duplicates kept). */
function sortedList(rng, length, lo, hi) {
  const out = [];
  for (let i = 0; i < length; i += 1) out.push(randInt(rng, lo, hi));
  out.sort((x, y) => x - y);
  return out;
}

function outLiteral(value) {
  if (Array.isArray(value)) return '[' + value.map(outLiteral).join(',') + ']';
  return String(value);
}

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  };
}

function inputLine(signature, args) {
  return signature.params.map((p, i) => `${p.name} = ${args[i]}`).join(', ');
}

function titleOf(problem) {
  const raw = String((problem && (problem.title || problem.slug)) || 'Problem').trim();
  return raw.length > 46 ? raw.slice(0, 46).trim() + '…' : raw;
}

function difficultyOf(problem) {
  const v = problem && problem.difficulty;
  return v === 'Easy' || v === 'Medium' || v === 'Hard' ? v : 'Medium';
}

function buildVariant({ id, seedLabel, intent, difficulty, title, statement, signature, tests, mode, hints }) {
  const slim = tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
  const first = slim[0];
  return {
    id,
    seedLabel,
    intent,
    difficulty,
    title,
    statement,
    signature: cloneSignature(signature),
    examples: [{ input: inputLine(signature, first.args), output: first.expected, explain: '' }],
    tests: slim,
    mode: mode || 'exact',
    hints: hints.slice(0, 2),
  };
}

function signatureOf(problem) {
  const sig = problem && problem.judge && problem.judge.signature;
  if (!sig || typeof sig.name !== 'string' || sig.name.trim() === '') return null;
  if (!Array.isArray(sig.params) || sig.params.length === 0) return null;
  const params = [];
  for (const p of sig.params) {
    if (!p || typeof p.type !== 'string' || p.type.trim() === '') return null;
    params.push({ name: String(p.name || 'arg' + params.length), type: p.type.trim() });
  }
  if (typeof sig.return !== 'string' || sig.return.trim() === '') return null;
  return { name: sig.name.trim(), params, return: sig.return.trim() };
}

function isShape(signature, paramTypes, returnType) {
  if (!signature || !Array.isArray(signature.params)) return false;
  if (signature.params.length !== paramTypes.length) return false;
  for (let i = 0; i < paramTypes.length; i += 1) {
    if (!signature.params[i] || signature.params[i].type !== paramTypes[i]) return false;
  }
  return signature.return === returnType;
}

/**
 * Documented portable builder: exactly three deterministic seeded variants
 * for a merge-two-sorted-lists shard record, or [] when the record is
 * absent/malformed or the signature shape differs. Never throws.
 *
 *   v1 fresh — new seeded sorted pairs, same merge rule.
 *   v2 edge  — empty/empty, empty/single, heavy ties, judge-range extremes.
 *   v3 twist — same signature and types, changed rule (merge then dedup to a
 *              sorted unique union), disclosed in the statement; labeled generated.
 */
export function buildPracticeVariants(problem) {
  try {
    if (!problem || typeof problem !== 'object') return [];
    if (problem.slug !== SLUG) return [];
    const signature = signatureOf(problem);
    if (!signature || !isShape(signature, ['ListNode', 'ListNode'], 'ListNode')) return [];
    const rng = mulberry32(hashText(SLUG + ':merge-drill'));
    const base = titleOf(problem);
    const difficulty = difficultyOf(problem);
    const make = (id, suffix, seedLabel, intent, statement, tests, hints) =>
      buildVariant({ id, seedLabel, intent, difficulty, title: base + ' — ' + suffix + ' (merge drill)', statement, signature, tests, mode: 'exact', hints });

    const fresh = [];
    for (let n = 0; n < 4; n += 1) {
      const a = sortedList(rng, randInt(rng, 1, 6), -100, 100);
      const b = sortedList(rng, randInt(rng, 1, 6), -100, 100);
      assertSorted(a, b);
      fresh.push({ args: [outLiteral(a), outLiteral(b)], expected: outLiteral(oracleMerge(a, b)) });
    }

    const edgeRows = [[[], []], [[], [0]], [[1], [1]], [[2, 2, 2], [2, 2]], [[-100, -50, 0], [-100, 100]]];
    const edge = edgeRows.map(([a, b]) => {
      assertSorted(a, b);
      return { args: [outLiteral(a), outLiteral(b)], expected: outLiteral(oracleMerge(a, b)) };
    });

    const twistRows = [[[1, 2, 4], [1, 3, 4]], [[2, 2, 2], [2, 2]], [[], [0, 0, 5]], [[-3, -3, 1], [-3, 2, 2]]];
    const twist = twistRows.map(([a, b]) => {
      assertSorted(a, b);
      return { args: [outLiteral(a), outLiteral(b)], expected: outLiteral(oracleMergeUnique(a, b)) };
    });

    return [
      make('v1', 'fresh lists', 'fresh lists', INTENT_SAME,
        'You are given the heads of two sorted linked lists list1 and list2. Merge them into one sorted list by splicing together the nodes of the first two lists, and return the head of the merged list. Fresh seeded pairs below; values stay in [-100, 100] and each list is sorted non-decreasing.',
        fresh,
        ['Compare the two heads and link the smaller one first; on a tie either order merges correctly.', 'When one list runs out, attach the whole remainder at once instead of looping node by node.']),
      make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
        'Same merge task with the boundary inputs. Either list may be empty (an empty merge returns an empty list), a list may hold a single node, values may repeat heavily across both lists, and values may sit at the [-100, 100] extremes. Return the head of the merged sorted list.',
        edge,
        ['An empty list contributes nothing — merging [] with [0] returns [0].', 'Repeated values merge in order; ties never need a special case.']),
      make('v3', 'twist: merge and dedup', 'twist, same signature', INTENT_TWIST,
        'Twist with a changed rule, signature and node types unchanged: merge the two sorted lists, then drop duplicate values so the result is the sorted UNIQUE union. For example list1 = [1,2,4], list2 = [1,3,4] gives [1,2,3,4]. Return the head of the deduped merged list.',
        twist,
        ['Merge exactly as before, then skip a value you have already emitted.', 'Because both inputs are sorted, equal values always arrive adjacently in the merge.']),
    ];
  } catch {
    return [];
  }
}

// Back-compat alias for the staged delivery-sprint export name.
export const buildMergeTwoSortedListsVariants = buildPracticeVariants;
