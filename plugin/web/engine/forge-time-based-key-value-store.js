/**
 * time-based-key-value-store — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `time-based-key-value-store`
 * (Time Based Key-Value Store, Medium, test-profile runTimeMap(string[],string[][])->string[],
 * mode exact). The live judge record (plugin/data/shard-8.json, id 981) is judge null —
 * a design/class problem with no single-call signature — so practice runs through this
 * HONEST TEST PROFILE (precedent: runTrieOps), documented in the adapter. Not official.
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by floorLinear below
 * (per-key append + LINEAR floor scan), an INDEPENDENT implementation of the same
 * operation (not the walkthrough's binary-search floor), so oracle/reference bugs
 * cannot silently agree.
 *
 * Staged source: .workers/jobs/question-owners-150/time-based-key-value-store/timemap-variants.js
 * (statements, hints, oracle); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the staged test-profile signature, so the same editor code compiles unchanged.
 * - `args` are raw literal strings; `expected` is the JSON literal of the get-results array.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'time-based-key-value-store';

export const SIGNATURE = Object.freeze({
  name: 'runTimeMap',
  params: Object.freeze([{ name: 'ops', type: 'string[]' }, { name: 'calls', type: 'string[][]' }]),
  return: 'string[]',
});

export const MODE = 'exact';
export const DIFFICULTY = 'Medium';

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.';
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.';
export const INTENT_ADVERSARIAL = 'Same task with adversarial placements that punish linear scans.';

/** INDEPENDENT oracle: per-key append + linear floor scan (no binary search). */
export function floorLinear(ops, calls) {
  const store = new Map();
  const out = [];
  for (let i = 0; i < ops.length; i += 1) {
    const row = calls[i];
    if (ops[i] === 'set') {
      const key = row[0];
      if (!store.has(key)) store.set(key, { ts: [], vs: [] });
      store.get(key).ts.push(Number(row[2]));
      store.get(key).vs.push(row[1]);
    } else {
      const entry = store.get(row[0]);
      const q = Number(row[1]);
      let best = '';
      if (entry) {
        for (let k = 0; k < entry.ts.length; k += 1) {
          if (entry.ts[k] <= q) best = entry.vs[k];
          else break;
        }
      }
      out.push(best);
    }
  }
  return out;
}

const literalOf = (value) => JSON.stringify(value);

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

function buildVariant({ id, seedLabel, intent, title, statement, tests, hints }) {
  const capped = tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
  const first = capped[0];
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title: 'Time Based Key-Value Store — ' + title,
    statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(SIGNATURE, first.args), output: first.expected, explain: '' }],
    tests: capped,
    mode: MODE,
    hints: hints.slice(0, 2),
  };
}

const T = (ops, calls) => ({ args: [literalOf(ops), literalOf(calls)], expected: literalOf(floorLinear(ops, calls)) });

/* ---------------- entry point ---------------- */

export function buildTimeMapPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh data',
      intent: INTENT_SAME,
      title: 'fresh histories (same task)',
      statement:
        'Replay the ops: set appends value+stamp per key (stamps strictly increase); get returns the value at the largest stamp not after the query, or "" when none exists. Fresh keys and stamps; the floor rule is unchanged.',
      tests: [
        T(
          ['set', 'set', 'get', 'get', 'get'],
          [['k1', 'v1', '2'], ['k1', 'v2', '5'], ['k1', '2'], ['k1', '4'], ['k1', '5']],
        ),
        T(
          ['set', 'set', 'get', 'get'],
          [['a', 'x', '1'], ['b', 'y', '3'], ['a', '2'], ['b', '3']],
        ),
        T(
          ['set', 'get', 'set', 'get'],
          [['k', 'a', '10'], ['k', '9'], ['k', 'b', '20'], ['k', '15']],
        ),
        T(
          ['set', 'set', 'set', 'get', 'get'],
          [['m', 'p', '1'], ['m', 'q', '2'], ['m', 'r', '3'], ['m', '3'], ['m', '2']],
        ),
      ],
      hints: [
        'Append on set; on get binary-search the rightmost stamp <= query.',
        'A get between two stamps returns the earlier stamp value, not the later one.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'edges: empty, exact, unknown (same task)',
      statement:
        'Same floor rule on boundary inputs: a get on an unknown key, a query older than the first stamp, a query exactly on a stamp, and a far-future query. Empty means "".',
      tests: [
        T(['get'], [['ghost', '7']]),
        T(['set', 'get'], [['k', 'v', '5'], ['k', '1']]),
        T(['set', 'get'], [['k', 'v', '5'], ['k', '5']]),
        T(['set', 'get'], [['k', 'v', '1'], ['k', '10000000']]),
        T(['set', 'get'], [['a', 'x', '4'], ['b', '4']]),
      ],
      hints: [
        'Check the guard first: unknown key or query below the first stamp is "".',
        'An exact-stamp query returns that stamp value — no off-by-one.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'same-task adversarial',
      intent: INTENT_ADVERSARIAL,
      title: 'dense histories + repeat gets (same task)',
      statement:
        'Same floor rule with dense per-key histories, repeated gets after the last set, and interleaved keys. A backwards linear scan passes small cases but the binary-search floor is required at scale; outputs are unchanged in kind.',
      tests: [
        T(
          ['set', 'set', 'set', 'set', 'set', 'set', 'get', 'get', 'get', 'get'],
          [
            ['d', 'a', '2'], ['d', 'b', '3'], ['d', 'c', '4'],
            ['d', 'e', '5'], ['d', 'f', '6'], ['d', 'g', '7'],
            ['d', '1'], ['d', '4'], ['d', '7'], ['d', '9'],
          ],
        ),
        T(
          ['set', 'set', 'get', 'get', 'get'],
          [['r', 'p', '2'], ['r', 'q', '8'], ['r', '8'], ['r', '8'], ['r', '7']],
        ),
        T(
          ['set', 'set', 'set', 'get', 'get', 'get'],
          [['a', 'x', '1'], ['b', 'y', '2'], ['a', 'z', '5'], ['a', '4'], ['b', '9'], ['c', '3']],
        ),
        T(
          ['set', 'set', 'set', 'set', 'set', 'set', 'set', 'set', 'set', 'set', 'get', 'get'],
          [
            ['w', 'v1', '1'], ['w', 'v2', '2'], ['w', 'v3', '3'], ['w', 'v4', '4'],
            ['w', 'v5', '5'], ['w', 'v6', '6'], ['w', 'v7', '7'], ['w', 'v8', '8'],
            ['w', 'v9', '9'], ['w', 'v10', '10'], ['w', '5'], ['w', '10'],
          ],
        ),
      ],
      hints: [
        'Dense stamps need the rightmost stamp <= query — an early stop returns stale data.',
        'Repeated gets must each re-search; never cache one answer across queries.',
      ],
    }),
  ];
}

// Staged-compat alias: same builder, family-style name.
export const buildPracticeVariants = buildTimeMapPractice;

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'floorLinear (per-key append + linear floor scan; walkthrough uses the binary-search floor)',
});

export default buildTimeMapPractice;
