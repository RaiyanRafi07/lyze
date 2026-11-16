/**
 * gas-station — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `gas-station`
 * (Gas Station, Medium, canCompleteCircuit(int[],int[])->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed inputs; every expected value is computed at build time by
 * gasStationOracle below (O(n^2) brute force trying every start), an
 * INDEPENDENT implementation of the same operation (not the walkthrough's
 * single-pass greedy restart frame emitter: the walkthrough keeps one running
 * tank plus a global total and jumps the candidate to i + 1 on failure, while
 * the oracle simulates each start separately and never restarts).
 *
 * Staged source: .workers/jobs/neetcode150-completion/gas-station/practice-gas-station.mjs
 * (statements, hints, oracle); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time. All three
 * sets are the SAME task (no twist): identical signature, identical question —
 * v3 is adversarial same-task restart chains only.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against (mode 'exact').
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact'.
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'gas-station'
export const SIGNATURE = Object.freeze({
  name: 'canCompleteCircuit',
  params: Object.freeze([
    { name: 'gas', type: 'int[]' },
    { name: 'cost', type: 'int[]' },
  ]),
  return: 'int',
})
export const MODE = 'exact'
export const DIFFICULTY = 'Medium'

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
export const INTENT_ADVERSARIAL = 'Same task, reset-chain shapes that punish skipping the restart or the verdict.'

/**
 * INDEPENDENT oracle: brute force over every start, NOT greedy restart.
 * Simulates each candidate start separately around the circle and fails it on
 * the first negative tank. Returns the first surviving start, or -1.
 * Different method from the walkthrough (single pass: one running tank plus a
 * global total with restart jumps to i + 1).
 */
export function gasStationOracle(gas, cost) {
  const n = gas.length
  for (let s = 0; s < n; s++) {
    let tank = 0
    let ok = true
    for (let k = 0; k < n; k++) {
      const idx = (s + k) % n
      tank += gas[idx] - cost[idx]
      if (tank < 0) {
        ok = false
        break
      }
    }
    if (ok) return s
  }
  return -1
}

const lit = (v) => JSON.stringify(v)

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  }
}

function inputLine(signature, args) {
  return signature.params
    .map((param, index) => `${(param && param.name) || 'arg' + index} = ${args[index]}`)
    .join(', ')
}

function buildVariant({ id, seedLabel, intent, title, statement, rows, hints }) {
  const tests = rows
    .map(([gas, cost]) => ({ args: [lit(gas), lit(cost)], expected: String(gasStationOracle(gas, cost)) }))
    .slice(0, 5)
    .map((t) => ({ args: t.args.map(String), expected: String(t.expected) }))
  const first = tests[0]
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title,
    statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(SIGNATURE, first.args), output: first.expected, explain: '' }],
    tests,
    mode: MODE,
    hints: hints.slice(0, 2),
  }
}

/* ---------------- entry point ---------------- */

export function buildGasStationVariants() {
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh mixed inputs',
      intent: INTENT_SAME,
      title: 'Gas Station — Fresh Numbers (same task)',
      statement:
        'There are n gas stations on a circle; gas[i] is fuel gained and cost[i] is fuel spent leaving station i. Return the unique starting index that completes the circuit, or -1 when the total fuel is short. These fresh mixed inputs need both the running-tank restart and the global-total verdict. The signature and exact comparison are unchanged.',
      rows: [
        [[3, 1, 4, 2], [2, 3, 1, 3]],
        [[2, 7, 3, 1, 4], [5, 1, 6, 2, 3]],
        [[5, 3, 1, 8], [2, 6, 4, 3]],
        [[11, 4, 2, 6, 1], [5, 5, 5, 5, 3]],
      ],
      hints: [
        'Track the running tank and restart right after any station that drives it negative.',
        'A non-negative tank is not enough: only a non-negative global total proves the candidate works.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Gas Station — Edge Cases (same task)',
      statement:
        'Same circular-tour task: return the starting index or -1. Inputs include single stations that succeed or fail, a uniform-deficit line, and an all-zero circle where every start is valid and the first index wins. The signature and exact comparison are unchanged.',
      rows: [
        [[5], [4]],
        [[3], [5]],
        [[0, 0, 0], [0, 0, 0]],
        [[1, 1, 1], [2, 2, 2]],
      ],
      hints: [
        'A single station works exactly when its gas covers its own cost.',
        'When every net is zero the tour never fails, so the earliest start is the answer.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'adversarial restarts',
      intent: INTENT_ADVERSARIAL,
      title: 'Gas Station — Adversarial Restarts (same task)',
      statement:
        'SAME TASK, harder shapes: late surpluses after long deficit chains, exact-zero finishes, and early surpluses that still fail globally punish solutions that restart in the wrong place or skip the total check. No rule change: the signature and exact comparison are unchanged.',
      rows: [
        [[1, 1, 1, 10], [2, 2, 2, 1]],
        [[10, 2, 3], [4, 5, 6]],
        [[6, 1, 1, 1, 1], [5, 2, 2, 2, 2]],
        [[2, 2, 5, 1], [3, 1, 2, 4]],
      ],
      hints: [
        'Each failed station discards a whole prefix of starts, not just the current one.',
        'An early surplus can still lose: finish the scan and let the global total cast the final vote.',
      ],
    }),
  ]
}

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'gasStationOracle (O(n^2) brute force trying every start; walkthrough uses single-pass greedy restart with running tank + global total)',
})
