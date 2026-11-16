/**
 * multiply-strings — live semantic adapter (Math / strings).
 *
 * Walkthrough algorithm: single n+m zeroed digit array; each pair
 * num1[i]*num2[j] lands at res[i+j+1] with carry sum/10 added into
 * res[i+j]; leading zeros are stripped only when rendering. O(n*m)
 * time, O(n+m) space. No BigInteger, no int conversion.
 *
 * Staged source: .workers/jobs/question-owners-150/multiply-strings/
 * multiply-strings.adapter.js (walkthrough events, reference code, lesson)
 * — ported verbatim to the live shape: shared helpers imported from
 * semantic-core.js, no local code/frame redefinitions. Code text, explain
 * notes, and build events are unchanged; only the compaction call and the
 * live SIGNATURE export shape were adapted.
 *
 * Signature equals the live judge signature exactly:
 * multiply(num1: string, num2: string) -> string
 * (plugin/data/shard-5.json id 43, mode exact).
 */

import { code, frame, boundedFrames } from './semantic-core.js'

export const SLUG = 'multiply-strings'

// Live judge signature, exactly (judgeable slug).
export const SIGNATURE = {
  name: 'multiply',
  params: ['string', 'string'],
  return: 'string',
}

export const MODE = 'exact'
export const MAX_VIS_DIGITS = 12
export const MAX_VIS_PAIRS = 48

function assertOperands(rawA, rawB) {
  if (typeof rawA !== 'string' || typeof rawB !== 'string') {
    throw new Error('multiply-strings needs two strings num1 and num2')
  }
  if (!/^[0-9]+$/.test(rawA) || !/^[0-9]+$/.test(rawB)) {
    throw new Error('multiply-strings inputs must consist of digits only (judge constraint)')
  }
  if (rawA.length < 1 || rawB.length < 1 || rawA.length > MAX_VIS_DIGITS || rawB.length > MAX_VIS_DIGITS) {
    throw new Error(
      'multiply-strings walkthrough supports 1..12 digits per operand for the diagram ' +
        '(got num1=' + rawA.length + ', num2=' + rawB.length + '; no truncation — use Solve for 200-digit judge inputs)'
    )
  }
  if (rawA.length * rawB.length > MAX_VIS_PAIRS) {
    throw new Error(
      'multiply-strings walkthrough supports n*m <= 48 digit-pairs for the diagram ' +
        '(got ' + rawA.length + '*' + rawB.length + '=' + (rawA.length * rawB.length) + '; use shorter inputs for the diagram)'
    )
  }
  if ((rawA.length > 1 && rawA[0] === '0') || (rawB.length > 1 && rawB[0] === '0')) {
    throw new Error('multiply-strings inputs must not contain leading zeros, except the number 0 itself')
  }
}

function digitsOf(s) {
  return Array.from(s, (ch) => ch.charCodeAt(0) - 48)
}

const clipText = (value, max) => {
  const s = String(value)
  return s.length <= max ? s : s.slice(0, max - 1) + '…'
}

const multiplyJava = code(`
[init] class Solution {
[init]     public String multiply(String num1, String num2) {
[zero]         if (num1.equals("0") || num2.equals("0")) return "0";
[init]         int n = num1.length(), m = num2.length();
[init]         int[] res = new int[n + m];
[mul]         for (int i = n - 1; i >= 0; i--) for (int j = m - 1; j >= 0; j--) {
[mul]             int mul = (num1.charAt(i) - '0') * (num2.charAt(j) - '0');
[mul]             int p1 = i + j, p2 = i + j + 1;
[mul]             int sum = mul + res[p2];
[mul]             res[p2] = sum % 10;
[mul]             res[p1] += sum / 10;
[mul]         }
[skip]         StringBuilder sb = new StringBuilder();
[skip]         for (int d : res) { if (sb.length() == 0 && d == 0) continue; sb.append(d); }
[done]         return sb.length() == 0 ? "0" : sb.toString();
[init]     }
[init] }
`)

const multiplyCpp = code(`
[init] class Solution {
[init] public:
[init]     string multiply(string num1, string num2) {
[zero]         if (num1 == "0" || num2 == "0") return "0";
[init]         int n = num1.size(), m = num2.size();
[init]         vector<int> res(n + m, 0);
[mul]         for (int i = n - 1; i >= 0; i--) for (int j = m - 1; j >= 0; j--) {
[mul]             int mul = (num1[i] - '0') * (num2[j] - '0');
[mul]             int p1 = i + j, p2 = i + j + 1;
[mul]             int sum = mul + res[p2];
[mul]             res[p2] = sum % 10;
[mul]             res[p1] += sum / 10;
[mul]         }
[skip]         string sb;
[skip]         for (int d : res) { if (sb.empty() && d == 0) continue; sb.push_back(char('0' + d)); }
[done]         return sb.empty() ? "0" : sb;
[init]     }
[init] };
`)

const multiplyPseudo = code(`
[init] function multiply(num1, num2):
[zero]   if num1 == "0" or num2 == "0": return "0"
[init]   n = length(num1); m = length(num2)
[init]   res = array(n + m, 0)
[mul]   for i from n-1 down to 0: for j from m-1 down to 0:
[mul]     mul = digit(num1[i]) * digit(num2[j])
[mul]     p1 = i + j; p2 = i + j + 1
[mul]     sum = mul + res[p2]
[mul]     res[p2] = sum % 10
[mul]     res[p1] = res[p1] + sum / 10 (integer division)
[skip]   sb = ""
[skip]   for d in res: if sb is empty and d == 0: continue; append d to sb
[done]   return sb == "" ? "0" : sb
`)

const EXPLAIN = {
  init: 'Scope of the multiply task plus the zeroed n+m result array that every digit-pair shares.',
  zero: 'Fast path: any zero operand means the product is "0" before any digit work.',
  mul: 'Multiply one digit pair, add the existing res[p2], write sum%10 at p2, carry sum/10 into res[p1].',
  skip: 'Skip leading zeros of the digit array when rendering the answer string.',
  done: 'Return the rendered digits, or "0" when every slot stayed zero.',
}

const EXPLAIN_LINES = {
  java: {
    2: 'Zero fast path: a zero factor forces the product to "0" before any digit work.',
    10: 'Ones place: res[p2] keeps sum%10 for this pair.',
    11: 'Tens place: the carry joins res[p1] with += because pairs share the slot.',
    13: 'Render: leading zeros are padding; the first nonzero digit starts the answer.',
    14: 'Done: empty render means every slot stayed zero, so return "0".',
  },
  cpp: {
    3: 'Zero fast path: a zero factor forces the product to "0" before any digit work.',
    9: 'Ones place: res[p2] keeps sum%10 for this pair.',
    10: 'Tens place: the carry joins res[p1] with += because pairs share the slot.',
    12: 'Render: leading zeros are padding; the first nonzero digit starts the answer.',
    13: 'Done: empty render means every slot stayed zero, so return "0".',
  },
  pseudo: {},
}

function build(args) {
  if (!Array.isArray(args) || args.length !== 2) {
    throw new Error('multiply-strings expects args [num1, num2]')
  }
  const [rawA, rawB] = args
  assertOperands(rawA, rawB)
  const a = digitsOf(rawA)
  const b = digitsOf(rawB)
  const n = a.length
  const m = b.length
  const frames = []
  const anchors = [0]
  const push = (step, label, note, state) => {
    frames.push(frame(step, clipText(label, 40), clipText(note, 140), state))
  }

  // Zero fast path: honest 3-frame walkthrough of the early return.
  if (rawA === '0' || rawB === '0') {
    const res = new Array(n + m).fill(0)
    push(
      'init',
      'Start: num1="' + rawA + '" num2="' + rawB + '"',
      'Read both digit strings; result array has n+m=' + res.length + ' slots.',
      { pointers: {}, highlights: {}, vars: { n, m, num1: rawA, num2: rawB, res: res.slice() } }
    )
    push(
      'zero',
      'Zero operand: product is "0"',
      'A zero factor forces the product to zero; return early.',
      { pointers: {}, highlights: {}, vars: { n, m, num1: rawA, num2: rawB, res: res.slice(), answer: '0' } }
    )
    anchors.push(frames.length - 1)
    push(
      'done',
      'Done: return "0"',
      'Actual return value: "0".',
      { pointers: {}, highlights: {}, vars: { n, m, num1: rawA, num2: rawB, res: res.slice(), answer: '0' } }
    )
    anchors.push(frames.length - 1)
    const { frames: compact } = boundedFrames(frames, 40, anchors)
    return { kind: 'array', layout: { values: [0] }, frames: compact, result: '0' }
  }

  const res = new Array(n + m).fill(0)
  const stateOf = (extra = {}) => ({
    pointers: { ...(extra.pointers || {}) },
    highlights: { ...(extra.highlights || {}) },
    vars: { n, m, num1: rawA, num2: rawB, res: res.slice(), ...(extra.vars || {}) },
  })

  push(
    'init',
    'Start: num1="' + rawA + '" num2="' + rawB + '"',
    'Zeroed res of length n+m=' + res.length + ' will collect every pair.',
    stateOf({ vars: { res: res.slice() } })
  )

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const d1 = a[i]
      const d2 = b[j]
      const mul = d1 * d2
      const p1 = i + j
      const p2 = i + j + 1
      const sum = mul + res[p2]
      const write = sum % 10
      const carry = Math.floor(sum / 10)
      res[p2] = write
      res[p1] += carry
      const highlights = { [p2]: 'accent' }
      if (carry > 0) highlights[p1] = 'ok'
      push(
        'mul',
        'i=' + i + ' j=' + j + ': ' + d1 + '*' + d2 + '=' + mul + ' +res[' + p2 + '] -> sum ' + sum,
        'Post-update: res[' + p2 + ']=' + write + ', carry ' + carry + ' added to res[' + p1 + '].',
        stateOf({
          pointers: { i, j },
          highlights,
          vars: { i, j, d1, d2, mul, p1, p2, sum, write, carry, res: res.slice(), resStr: res.join('') },
        })
      )
    }
  }

  anchors.push(frames.length - 1)
  const rendered = res.join('').replace(/^0+/, '') || '0'
  push(
    'skip',
    'Strip leading zeros: "' + res.join('') + '" -> "' + rendered + '"',
    'Leading zeros are padding; the first nonzero digit starts the answer.',
    stateOf({ pointers: {}, vars: { res: res.slice(), resStr: res.join(''), answer: rendered } })
  )
  push(
    'done',
    'Done: return "' + rendered + '"',
    'Actual return value: "' + rendered + '".',
    stateOf({ pointers: {}, vars: { res: res.slice(), resStr: res.join(''), answer: rendered } })
  )
  anchors.push(frames.length - 1)

  const values = Array.from(rendered, (ch) => ch.charCodeAt(0) - 48)
  // Single compaction pass (mirrors semantic.js): no-op under the 40-frame budget.
  const { frames: compact } = boundedFrames(frames, 40, anchors)
  return { kind: 'array', layout: { values }, frames: compact, result: rendered }
}

export const adapters = {
  'multiply-strings': {
    // Live judge signature, exactly (judgeable slug).
    signature: SIGNATURE,
    lesson: {
      idea: 'Each pair num1[i]*num2[j] lands at res[i+j+1] with the carry added to res[i+j]; one n+m array accumulates everything, then leading zeros are stripped.',
      trap: 'Never convert to int/BigInteger (banned); add the carry with += not =; strip leading zeros but keep one zero for the all-zero result.',
      time: 'O(n*m)',
      space: 'O(n+m)',
    },
    alternate: 'Row-by-row partial products: multiply num1 by each digit of num2, collect m rows, then add them with a string adder. Same result but O(m*(n+m)) extra time and row storage.',
    code: { java: multiplyJava, cpp: multiplyCpp, pseudo: multiplyPseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
}
