/**
 * network-delay-time — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `network-delay-time`
 * (Network Delay Time, Medium, networkDelayTime(int[][],int,int)->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * bellmanFordNetworkDelayTime below (Bellman-Ford relaxation), an INDEPENDENT
 * implementation of the same operation (not the walkthrough's Dijkstra), and
 * cross-checked against the Dijkstra reference; disagreement throws.
 *
 * Staged source: .workers/jobs/neetcode150-completion/network-delay-time/network-delay-time.practice.mjs
 * (statements, hints, oracles); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (single integer answers; -1 means unreachable).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'network-delay-time';

export const SIGNATURE = Object.freeze({
  name: 'networkDelayTime',
  params: Object.freeze([
    { name: 'times', type: 'int[][]' },
    { name: 'n', type: 'int' },
    { name: 'k', type: 'int' },
  ]),
  return: 'int',
});

export const MODE = 'exact';
export const DIFFICULTY = 'Medium';

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.';
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.';
export const INTENT_ADVERSARIAL = 'Same task with adversarial weights that punish hop-count thinking.';

/** Canonical oracle: Dijkstra with smallest-id tie-break (matches the walkthrough). */
export function referenceNetworkDelayTime(times, n, k) {
  const adj = Array.from({ length: n + 1 }, () => []);
  for (const t of times) adj[t[0]].push([t[1], t[2]]);
  const INF = Number.MAX_SAFE_INTEGER;
  const dist = new Array(n + 1).fill(INF);
  dist[k] = 0;
  const done = new Array(n + 1).fill(false);
  for (let s = 0; s < n; s += 1) {
    let u = -1;
    for (let v = 1; v <= n; v += 1) {
      if (!done[v] && (u === -1 || dist[v] < dist[u])) u = v;
    }
    if (u === -1 || dist[u] === INF) break;
    done[u] = true;
    for (const [v, w] of adj[u]) {
      if (dist[v] > dist[u] + w) dist[v] = dist[u] + w;
    }
  }
  let ans = 0;
  for (let v = 1; v <= n; v += 1) {
    if (dist[v] === INF) return -1;
    if (dist[v] > ans) ans = dist[v];
  }
  return ans;
}

/** INDEPENDENT oracle: Bellman-Ford relaxation (different algorithm, same answer). */
export function bellmanFordNetworkDelayTime(times, n, k) {
  const INF = Number.MAX_SAFE_INTEGER;
  const dist = new Array(n + 1).fill(INF);
  dist[k] = 0;
  for (let i = 0; i < n - 1; i += 1) {
    let changed = false;
    for (const t of times) {
      const u = t[0];
      const v = t[1];
      const w = t[2];
      if (dist[u] !== INF && dist[v] > dist[u] + w) {
        dist[v] = dist[u] + w;
        changed = true;
      }
    }
    if (!changed) break;
  }
  let ans = 0;
  for (let v = 1; v <= n; v += 1) {
    if (dist[v] === INF) return -1;
    if (dist[v] > ans) ans = dist[v];
  }
  return ans;
}

const argLiteral = (value) => JSON.stringify(value);
const outLiteral = (value) => String(value);

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

function makeTests(rows) {
  return rows.map(([times, n, k]) => {
    const expected = outLiteral(bellmanFordNetworkDelayTime(times, n, k));
    const check = referenceNetworkDelayTime(times, n, k);
    if (String(check) !== expected) throw new Error('oracle disagreement on ' + JSON.stringify([times, n, k]));
    return { args: [argLiteral(times), String(n), String(k)], expected };
  });
}

function buildVariant({ id, seedLabel, intent, suffix, taskLabel, statement, rows, hints }) {
  const tests = makeTests(rows).slice(0, 5);
  const first = tests[0];
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title: 'Network Delay Time — ' + suffix + ' (' + taskLabel + ')',
    statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(SIGNATURE, first.args), output: first.expected, explain: '' }],
    tests: tests.map((t) => ({ args: t.args.map(String), expected: String(t.expected) })),
    mode: MODE,
    hints: hints.slice(0, 2),
  };
}

/* ---------------- entry point ---------------- */

export function buildNetworkDelayPractice() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh reachable graphs',
      intent: INTENT_SAME,
      suffix: 'fresh reachable graphs',
      taskLabel: 'dijkstra drill',
      statement:
        'You are given a network of n nodes labeled 1..n and directed travel times times[i] = [ui, vi, wi]. ' +
        'A signal starts from node k. Return the minimum time for all n nodes to receive the signal, or -1 if any node is unreachable. ' +
        'All four inputs below are reachable: run Dijkstra from k and take the maximum distance.',
      rows: [
        [[[1, 2, 1], [1, 4, 9], [2, 3, 2], [3, 4, 1]], 4, 1],
        [[[1, 2, 3], [2, 3, 3], [3, 4, 3], [4, 5, 3], [1, 5, 20]], 5, 1],
        [[[1, 2, 4], [2, 3, 4], [1, 3, 10]], 3, 1],
        [[[2, 1, 1], [2, 3, 4], [1, 3, 1], [3, 4, 1]], 4, 2],
      ],
      hints: [
        'Always settle the unsettled node with the smallest known time, not the next queue neighbour.',
        'The answer is the largest settled distance; every edge relaxes at most once per settle.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      suffix: 'edge cases',
      taskLabel: 'boundary drill',
      statement:
        'Same signal-broadcast task with the boundary inputs: a single node with no edges answers 0, ' +
        'zero-weight edges still take part in relaxation, and any node no directed path reaches forces -1. ' +
        'Keep the same networkDelayTime(times, n, k) signature and exact-int comparison.',
      rows: [
        [[], 1, 1],
        [[[1, 2, 1], [2, 1, 1]], 3, 1],
        [[[1, 2, 0], [2, 3, 0]], 3, 1],
        [[[2, 1, 100]], 2, 2],
      ],
      hints: [
        'n = 1 with no edges is already fully reached: the maximum over one zero distance is 0.',
        'Zero-weight edges can chain: dist propagates through them exactly like positive weights.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial weights',
      intent: INTENT_ADVERSARIAL,
      suffix: 'adversarial weights',
      taskLabel: 'same task, weight traps',
      statement:
        'Same signal-broadcast task, no rule change: adversarial weights punish hop-count or queue-order ' +
        'thinking. A one-hop direct edge can be slower than a two-hop path, and tied paths must both relax ' +
        'before the answer is read. Only smallest-distance-first settling gives the true broadcast time.',
      rows: [
        [[[1, 3, 10], [1, 2, 1], [2, 3, 1]], 3, 1],
        [[[1, 2, 2], [1, 3, 2], [2, 4, 2], [3, 4, 2]], 4, 1],
        [[[1, 2, 1], [2, 4, 1], [1, 3, 1], [3, 4, 5]], 4, 1],
        [[[1, 2, 5], [1, 3, 2], [3, 2, 1], [2, 4, 1], [3, 4, 6]], 4, 1],
      ],
      hints: [
        'Compare arrival times, not hop counts: the direct 1->3 edge of weight 10 loses to 1->2->3 at cost 2.',
        'When two settled nodes both reach a target, the smaller arrival time wins; relax every outgoing edge.',
      ],
    }),
  ];
}

// Staged-compat alias: same builder, family-style name.
export const buildPracticeVariants = buildNetworkDelayPractice;

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'bellmanFordNetworkDelayTime (edge relaxation rounds; walkthrough uses Dijkstra settling)',
});

export default buildNetworkDelayPractice;
