/**
 * product-of-array-except-self — live-forge-compatible practice variant builder.
 *
 * Standalone staged module (no shared-source edit). Produces exactly 3 deterministic
 * variants reusing the real judge signature, in the same shape as
 * `plugin/web/engine/variants.js` `buildVariant` output:
 *   v1  fresh same-task inputs (seeded from the slug, reproducible)
 *   v2  edge cases (zeros, extremes — the inputs a division shortcut fails)
 *   v3  adversarial same-task drill (all-negative / multi-zero; NO rule change)
 *
 * No twist is forced: any same-signature rule change here (e.g. "divide the total")
 * would contradict the problem's no-division contract, so v3 stays same-task and
 * adversarial instead. Every `expected` literal is computed by the independent O(n^2)
 * oracle below — never by the prefix/suffix walkthrough.
 */

const SLUG = 'product-of-array-except-self';

/* ------------------------------------------------------------- seeding (tiny, local) -- */

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

function randInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/* ------------------------------------------------------------- literals (judge shape) -- */

function argLiteral(nums) {
  return '[' + nums.map((v) => String(v)).join(',') + ']';
}

function outLiteral(nums) {
  return '[' + nums.map((v) => String(v)).join(',') + ']';
}

/* ------------------------------------------- independent oracle (O(n^2), no reuse) -- */

/** Per-index product over all j != i. Deliberately O(n^2): shares no logic with the
 *  prefix/suffix walkthrough, so agreement is genuine cross-validation. */
export function oracleProductExceptSelf(nums) {
  const n = nums.length;
  const out = new Array(n);
  for (let i = 0; i < n; i += 1) {
    let p = 1;
    for (let j = 0; j < n; j += 1) {
      if (j !== i) p *= nums[j];
    }
    out[i] = p;
  }
  return out;
}

/* ------------------------------------------------------------------ variant shape -- */

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  };
}

function inputLine(signature, args) {
  return signature.params
    .map((param, index) => String((param && param.name) || 'arg' + index) + ' = ' + args[index])
    .join(', ');
}

function signatureOf(problem) {
  const judge = problem && problem.judge;
  const signature = judge && judge.signature;
  if (!signature || typeof signature.name !== 'string' || signature.name.trim() === '') return null;
  if (!Array.isArray(signature.params) || signature.params.length !== 1) return null;
  const param = signature.params[0];
  if (!param || param.type !== 'int[]') return null;
  if (signature.return !== 'int[]') return null;
  return { name: signature.name.trim(), params: [{ name: String(param.name || 'nums'), type: 'int[]' }], return: 'int[]' };
}

function difficultyOf(problem) {
  const value = problem && problem.difficulty;
  return value === 'Easy' || value === 'Medium' || value === 'Hard' ? value : 'Medium';
}

function titleOf(problem) {
  const raw = String((problem && (problem.title || problem.slug)) || 'Problem').trim();
  return raw.length > 46 ? raw.slice(0, 46).trim() + '…' : raw;
}

function buildVariant(spec) {
  const tests = spec.tests.slice(0, 5).map((test) => ({ args: test.args.map(String), expected: String(test.expected) }));
  const first = tests[0];
  return {
    id: spec.id,
    seedLabel: spec.seedLabel,
    intent: spec.intent,
    difficulty: spec.difficulty,
    title: spec.title,
    statement: spec.statement,
    signature: cloneSignature(spec.signature),
    // examples[0] is derived from tests[0], so example == tests[0] by construction.
    examples: [{ input: inputLine(spec.signature, first.args), output: first.expected, explain: '' }],
    tests,
    mode: spec.mode || 'exact',
    hints: spec.hints.slice(0, 2),
  };
}

/**
 * Build three judge-ready practice variations for the full shard record.
 * Pure + synchronous. Returns [] for any other slug or unusable signature
 * (live-forge convention: unsupported yields [], never throws).
 */
export function buildVariants(problem, options = {}) {
  void options;
  try {
    if (!problem || typeof problem !== 'object' || problem.slug !== SLUG) return [];
    const signature = signatureOf(problem);
    if (!signature) return [];
    const base = titleOf(problem);
    const difficulty = difficultyOf(problem);
    const rng = mulberry32(hashText(SLUG));
    const toTest = (nums) => ({ args: [argLiteral(nums)], expected: outLiteral(oracleProductExceptSelf(nums)) });

    // v1: fresh same-task inputs, seeded from the slug (lengths 3..6, values -5..5).
    const v1rows = [];
    for (let k = 0; k < 4; k += 1) {
      const len = randInt(rng, 3, 6);
      const nums = [];
      for (let i = 0; i < len; i += 1) nums.push(randInt(rng, -5, 5));
      v1rows.push(nums);
    }

    // v2: fixed edge cases — zeros and constraint extremes a division shortcut fails.
    const v2rows = [[0, 0], [1, 0], [-30, 30], [0, 0, 0, 0]];

    // v3: adversarial same-task drill — all-negative parity, double zero, interior zero.
    const v3rows = [[-2, -3, -4, -5], [0, 4, 0, 5], [2, 3, 0, 4, 5], [5, 5, 5, 5]];

    const make = (id, seedLabel, intent, suffix, statement, rows, hints) => buildVariant({
      id, seedLabel, intent, difficulty,
      title: base + ' — ' + suffix + ' (except-self drill)',
      statement, signature, tests: rows.map(toTest), mode: 'exact', hints,
    });

    return [
      make('v1', 'fresh values',
        'Same pattern, different numbers so you reproduce the reasoning.',
        'fresh values',
        'Given an integer array nums, return array answer such that answer[i] equals the product of all elements of nums except nums[i]. Run in O(n) time without using division. These fresh inputs hold 3 to 6 values between -5 and 5.',
        v1rows,
        ['Store the product of everything left of each slot, then multiply in the product from the right.',
         'Seed both running products at 1 so edge slots keep the one-sided product.']),
      make('v2', 'edge cases',
        'Same pattern with the edge case the original hides.',
        'edge cases',
        'Same except-self task with the boundary inputs. nums may hold two zeros, a single zero, or the constraint extremes -30 and 30. A division-based shortcut fails on any zero; the two-pass prefix/suffix form needs no division. Return the full answer array for each input.',
        v2rows,
        ['With two zeros every answer slot sees a zero elsewhere, so every answer is 0.',
         'With exactly one zero only the zero slot survives with the product of the rest.']),
      make('v3', 'adversarial zeros and signs',
        'Same question with adversarial placements that punish division shortcuts.',
        'adversarial zeros and signs',
        'Same except-self question, no rule change. All-negative inputs flip signs per slot, double zeros force all-zero answers, and an interior zero isolates one surviving slot. Predict the surviving slot before tracing, then verify with the two passes. O(n) time, no division.',
        v3rows,
        ['For [-2,-3,-4,-5] every except-self product is negative: an even count minus one leaves odd parity.',
         'For [0,4,0,5] the prefix pass zeroes rightward and the suffix pass zeroes leftward.']),
    ];
  } catch {
    return [];
  }
}
