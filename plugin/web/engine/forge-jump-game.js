/**
 * jump-game — portable standalone practice builder (delivery-extension-20261107).
 *
 * Produces exactly 3 deterministic variants for slug `jump-game`
 * (Jump Game, Medium, canJump(int[]) -> boolean, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Generation is seeded from the slug, so every run yields the same variants.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 *   { id, seedLabel, intent, difficulty, title, statement,
 *     signature, examples, tests, mode, hints }
 * - `signature` is the ACTUAL judge signature (same method name, same param
 *   types, same return), so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against ('true'/'false').
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (boolean string diff).
 * - `hints` holds exactly 2 hints per variant.
 * - No RULE CHANGE label: all three variants keep the official reachability
 *   rule (same question, new numbers/edges/adversarial shapes). The twist is
 *   adversarial input shape, not a changed win condition, and the statements
 *   say so explicitly.
 * - All drill inputs are GENERATED (seeded); none reuse the official LeetCode
 *   examples [2,3,1,1,4] / [3,2,1,0,4]. Official examples are referenced only
 *   by exclusion in the selfcheck.
 *
 * Oracles (independent of each other):
 *   - bfsCanJump(): BFS reachability over the jump graph (reference for
 *     `expected`; deliberately NOT the greedy farthest-reach scan).
 *   - greedyCanJump(): farthest-reach scan (cross-check oracle in selfcheck).
 */

export const SLUG = 'jump-game';
export const SIGNATURE = Object.freeze({
  name: 'canJump',
  params: Object.freeze([{ name: 'nums', type: 'int[]' }]),
  return: 'boolean'
});
export const MODE = 'exact';
export const DIFFICULTY = 'Medium';

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.';
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.';
export const INTENT_TWIST = 'Same signature, different question: the twist tests whether the idea transfers.';

/* ---------------- seeding (same math as variants.js) ---------------- */

function hashText(text) {
  const source = String(text);
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < source.length; i += 1) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619) >>> 0;
  return hash;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng, lo, hi) {
  return lo + Math.floor(rng()() * (hi - lo + 1));
}

/* ---------------- literals (same conventions as variants.js) ---------------- */

function outLiteral(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
  if (Array.isArray(value)) return '[' + value.map(outLiteral).join(',') + ']';
  if (value === null || value === undefined) return 'null';
  return String(value);
}

function argLiteral(value) {
  if (typeof value === 'string') return JSON.stringify(value);
  return outLiteral(value);
}

function inputLine(signature, args) {
  return signature.params
    .map((param, index) => `${(param && param.name) || 'arg' + index} = ${args[index]}`)
    .join(', ');
}

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return
  };
}

/* ---------------- oracles ---------------- */

/** INDEPENDENT reference oracle: BFS over the jump graph (no greedy scan). */
export function bfsCanJump(nums) {
  const n = nums.length;
  if (n <= 1) return true;
  const seen = new Array(n).fill(false);
  const queue = [0];
  seen[0] = true;
  while (queue.length > 0) {
    const i = queue.shift();
    const far = Math.min(n - 1, i + nums[i]);
    for (let j = i + 1; j <= far; j++) {
      if (j === n - 1) return true;
      if (!seen[j]) {
        seen[j] = true;
        queue.push(j);
      }
    }
  }
  return seen[n - 1];
}

/** Cross-check oracle: greedy farthest-reach scan (mirrors the adapter). */
export function greedyCanJump(nums) {
  let reach = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > reach) return false;
    if (i + nums[i] > reach) reach = i + nums[i];
    if (reach >= nums.length - 1) return true;
  }
  return reach >= nums.length - 1;
}

function testsFromRows(rows) {
  return rows.map((nums) => ({ args: [argLiteral(nums)], expected: outLiteral(bfsCanJump(nums)) }));
}

function buildVariant({ id, seedLabel, intent, title, statement, rows, hints }) {
  const tests = testsFromRows(rows).slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
  const first = tests[0];
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
    hints: hints.slice(0, 2)
  };
}

/* ---------------- deterministic drill rows ---------------- */

function freshRows() {
  // Seeded fresh data: 4 arrays, lengths 4..7, values 0..6.
  // Drawn from hashText('jump-game') so the set is stable across runs.
  // Post-condition enforced below: at least one true and one false (mixed).
  const rng = mulberry32(hashText(SLUG + ':v1'));
  const rows = [];
  while (rows.length < 4) {
    const len = 4 + Math.floor(rng() * 4);
    const nums = [];
    for (let i = 0; i < len; i++) nums.push(Math.floor(rng() * 7));
    // Avoid reusing either official example verbatim.
    const key = JSON.stringify(nums);
    if (key === '[2,3,1,1,4]' || key === '[3,2,1,0,4]') continue;
    rows.push(nums);
  }
  const verdicts = rows.map(bfsCanJump);
  if (verdicts.every(Boolean)) rows[rows.length - 1] = [0, 2, 3].concat(rows[rows.length - 1].slice(3));
  if (verdicts.every((v) => !v)) rows[0] = [3, 2, 1, 1, 0].slice(0, rows[0].length);
  return rows;
}

const EDGE_ROWS = [
  [0],        // single element: already at the last index -> true
  [1, 0],     // single step exactly reaches the end -> true
  [0, 1],     // stuck at index 0 with n > 1 -> false
  [2, 0, 0],  // first jump exactly covers the end -> true
  [1, 1, 0, 1] // zero valley with no skip-over jump -> false
];

const TWIST_ROWS = [
  [3, 0, 0, 2, 0, 0, 1], // deep early zero valley; only the i=0 leap skips it -> true
  [2, 0, 2, 0, 1],       // alternating zeros; short hops must chain exactly -> true
  [1, 1, 1, 0, 1],       // unit crawl into a late zero wall -> false
  [4, 0, 0, 0, 0]        // one giant opening jump covers everything -> true
];

/* ---------------- entry point ---------------- */

export function buildJumpGamePractice() {
  const v1rows = freshRows();
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh values',
      intent: INTENT_SAME,
      title: 'Jump Game — fresh values (reachability drill)',
      statement: 'You are given an integer array nums where nums[i] is your maximum jump length from index i. Return true if you can reach the last index starting from index 0, otherwise false. These inputs are generated drills (lengths 4..7, values 0..6); reproduce the farthest-reach reasoning on new numbers. Same rule as the original, new data only.',
      rows: v1rows,
      hints: [
        'Track the farthest index you can reach; bail out the moment an index lies beyond it.',
        'Update reach with max(reach, i + nums[i]) and stop early once it covers the last index.'
      ]
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Jump Game — edge cases (reachability drill)',
      statement: 'Same reachability question with the boundary inputs the original hides: a single-element array is already at the last index (true), [0,1] is stuck at the start (false), and an exactly-covering jump such as [2,0,0] still counts as true. Return true only when index n-1 is reachable. No rule change.',
      rows: EDGE_ROWS,
      hints: [
        'A length-1 array needs no jump at all, so the answer is true regardless of nums[0].',
        'A zero is fatal only when no earlier jump skips over it; check i > reach, not nums[i] == 0.'
      ]
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'twist, same signature',
      intent: INTENT_TWIST,
      title: 'Jump Game — zero-valley gauntlet (reachability drill)',
      statement: 'Same reachability rule and same canJump signature, but the inputs are adversarial: deep zero valleys that only a long early leap can skip, alternating zeros that force exact short-hop chains, and unit crawls that die at a late wall. No rule change — the twist is input shape, testing whether the i > reach discipline transfers.',
      rows: TWIST_ROWS,
      hints: [
        'Walk the valley inputs by hand: a zero at index k matters only if reach < k when you arrive.',
        'For [3,0,0,2,0,0,1] the opening 3 skips the first valley, yet reach stalls at 5 so index 6 stays unreachable.'
      ]
    })
  ];
}

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'bfsCanJump (BFS reachability; greedy scan used only as cross-check)'
});
