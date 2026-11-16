// Evaluate Reverse Polish Notation — per-slug semantic adapter (Stack, NeetCode 150).
// Walkthrough + notes gap: live judge record is plugin/data/shard-*.json id 150
// (evalRPN(String[] tokens) -> int, exact mode, 3 official examples).
// Preserves the verified reference walkthrough: left-to-right scan with an explicit
// stack, trunc-toward-zero division, pop order b-then-a. layout.tokens carries the
// recorded input so the question visual can render the indexed token strip.
//
// Convention follows plugin/web/engine/rotate-image-adapter.js:
// import semantic-core helpers, export `adapters` keyed by slug, build() returns the
// full honest event list (the single compaction pass is boundedFrames in semantic.js).
import { code, frame, boundedFrames } from './semantic-core.js';

export const SLUG = 'evaluate-reverse-polish-notation';

// Live judge signature (plugin/data shard record id 150): evalRPN(string[]) -> int.
// Adapter signature MUST equal it exactly (name/return/param types) or the
// walkthrough throws in semantic.js.
export const SIGNATURE = {
  name: 'evalRPN',
  params: ['string[]'],
  return: 'int',
};

// Visual bound (honest disclosure): walkthrough inputs are limited to 20 tokens.
// The judge allows up to 10^4; longer inputs are rejected, never truncated.
const MAX_TOKENS = 20;
const OPS = new Set(['+', '-', '*', '/']);

function truncDiv(a, b) {
  if (b === 0) throw new Error('Division by zero is outside the visual walkthrough.');
  return Math.trunc(a / b);
}

function applyOp(a, b, op) {
  if (op === '+') return a + b;
  if (op === '-') return a - b;
  if (op === '*') return a * b;
  return truncDiv(a, b);
}

function decodeTokens(args) {
  if (!Array.isArray(args) || args.length !== 1) throw new Error('Walkthrough needs [tokens].');
  const raw = args[0];
  if (!Array.isArray(raw)) throw new Error('tokens must be a string array, e.g. ["2","1","+","3","*"].');
  if (raw.length < 1) throw new Error('Visual walkthrough needs at least 1 token (judge allows 1..10000).');
  if (raw.length > MAX_TOKENS) throw new Error('Visual walkthrough bound: tokens.length=' + raw.length + ' exceeds MAX_TOKENS=' + MAX_TOKENS + ' (judge allows up to 10000; narrow the input).');
  return raw.map((t, i) => {
    const s = String(t);
    if (OPS.has(s)) return s;
    if (!/^-?\d+$/.test(s)) throw new Error('tokens[' + i + '] must be "+-*/" or an integer string (got ' + JSON.stringify(s) + ').');
    const n = Number(s);
    if (!Number.isSafeInteger(n) || n < -200 || n > 200) throw new Error('Visual walkthrough needs integers in [-200,200] (tokens[' + i + ']=' + s + ' given).');
    return s;
  });
}

const rpnJava = code(`
[init] class Solution {
[init]     public int evalRPN(String[] tokens) {
[init]         Deque<Integer> stack = new ArrayDeque<>();
[read]         for (String t : tokens) {
[read]             boolean isOp = t.equals("+") || t.equals("-") || t.equals("*") || t.equals("/");
[apply]             if (isOp) {
[apply]                 int b = stack.pop();
[apply]                 int a = stack.pop();
[apply]                 int r = t.equals("+") ? a + b : t.equals("-") ? a - b : t.equals("*") ? a * b : a / b;
[apply]                 stack.push(r);
[push]             } else {
[push]                 stack.push(Integer.parseInt(t));
[read]             }
[read]         }
[done]         return stack.pop();
[init]     }
[init] }
`);

const rpnCpp = code(`
[init] class Solution {
[init] public:
[init]     int evalRPN(vector<string>& tokens) {
[init]         vector<int> stack;
[read]         for (string t : tokens) {
[read]             bool isOp = (t == "+" || t == "-" || t == "*" || t == "/");
[apply]             if (isOp) {
[apply]                 int b = stack.back(); stack.pop_back();
[apply]                 int a = stack.back(); stack.pop_back();
[apply]                 int r = (t == "+") ? a + b : (t == "-") ? a - b : (t == "*") ? a * b : a / b;
[apply]                 stack.push_back(r);
[push]             } else {
[push]                 stack.push_back(stoi(t));
[read]             }
[read]         }
[done]         return stack.back();
[init]     }
[init] };
`);

const rpnPseudo = code(`
[init] evalRPN(tokens):
[init]   stack = empty list
[read]   for t in tokens:
[read]     if t is one of "+ - * /":
[apply]       b = pop stack; a = pop stack
[apply]       r = a + b if t == "+" else a - b if t == "-" else a * b if t == "*" else trunc(a / b)
[apply]       push r onto stack
[push]     else:
[push]       push int(t) onto stack
[done]   return pop stack
`);

const EXPLAIN = {
  init: 'Create an empty stack for waiting operands before scanning tokens left to right.',
  read: 'Look at the current token to decide push (operand) versus pop-two-and-apply (operator).',
  push: 'Push the operand value so a later operator can consume it in order.',
  apply: 'Pop b then a, compute a op b with trunc division, and push the result back.',
  done: 'Return the single remaining stack value as the expression value.',
};

export const EXPLAIN_LINES = {
  java: {
    7: 'Branch on operator versus operand: only four single-character operators apply.',
    11: 'Java int division already truncates toward zero, matching the required rule.',
  },
  cpp: {
    8: 'Branch on operator versus operand: only four single-character operators apply.',
    12: 'C++ int division truncates toward zero, matching the required rule.',
  },
  pseudo: {
    5: 'Trunc division rounds toward zero, so -7/3 becomes -2 rather than -3.',
  },
};

// Every frame below is a REAL execution event: init, one read per token, one push
// per operand, one apply per operator, plus done. Each apply frame snapshots the
// stack AFTER that operator collapsed, so later tokens are never revealed early.
function build(args) {
  const tokens = decodeTokens(args);
  const stack = [];
  const frames = [];
  const anchors = [];
  const clip = (s) => String(s).slice(0, 8);

  const state = (extra = {}) => ({
    items: stack.slice(),
    op: extra.op || undefined,
    pointers: extra.pointers || {},
    vars: { n: tokens.length, depth: stack.length, ...(extra.vars || {}) },
  });

  frames.push(frame('init', 'Start with an empty stack',
    'Postfix needs no parens: operands wait on a stack until an operator arrives.',
    { items: [], pointers: {}, vars: { n: tokens.length, depth: 0 } }));

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!OPS.has(t)) {
      const n = Number(t);
      frames.push(frame('read', 'Read token ' + i + ' = ' + clip(t),
        'Token ' + i + ' is an operand, so it will be pushed.',
        { items: stack.slice(), pointers: { i }, vars: { n: tokens.length, depth: stack.length, token: t } }));
      stack.push(n);
      frames.push(frame('push', 'Push ' + clip(t),
        'Stack = [' + stack.join(', ') + '].',
        { items: stack.slice(), op: 'push', pointers: { i }, vars: { n: tokens.length, depth: stack.length, pushed: n } }));
    } else {
      frames.push(frame('read', 'Read token ' + i + ' = ' + t,
        'Token ' + i + ' is an operator; pop two operands and apply it.',
        { items: stack.slice(), pointers: { i }, vars: { n: tokens.length, depth: stack.length, token: t } }));
      if (stack.length < 2) throw new Error('Token ' + i + ' ("' + t + '") needs two operands but stack holds ' + stack.length + '.');
      const b = stack.pop();
      const a = stack.pop();
      const r = applyOp(a, b, t);
      stack.push(r);
      anchors.push(frames.length);
      const expr = a + ' ' + t + ' ' + b + ' = ' + r;
      const detail = expr + (t === '/' ? ' (trunc toward zero)' : '');
      frames.push(frame('apply', 'Apply ' + t + ': ' + expr,
        detail + '; stack = [' + stack.join(', ') + '].',
        { items: stack.slice(), op: 'peek', pointers: { i }, vars: { n: tokens.length, depth: stack.length, a, b, r } }));
    }
  }

  if (stack.length !== 1) throw new Error('Walkthrough ended with stack [' + stack.join(', ') + ']; valid RPN ends with one value.');
  frames.push(frame('done', 'Return ' + stack[0],
    'One value remains, so it is the value of the expression.',
    { items: stack.slice(), pointers: {}, vars: { n: tokens.length, depth: 1, answer: stack[0] } }));

  return {
    kind: 'stack',
    // Additive visual input: layout.tokens carries the recorded input so the
    // question visual can render the indexed token strip. Decoded from the same
    // validated decodeTokens output; no new data is introduced.
    layout: { capacity: Math.max(8, tokens.length), tokens: tokens.slice() },
    frames,
    anchors,
    result: stack[0],
  };
}

export { boundedFrames };

export const adapters = {
  'evaluate-reverse-polish-notation': {
    signature: { name: SIGNATURE.name, params: SIGNATURE.params.slice(), return: SIGNATURE.return },
    lesson: {
      idea: 'Postfix puts operators after operands, so a LIFO stack holds waiting values until an operator arrives.',
      trap: 'Division truncates toward zero (13/5=2, -7/3=-2); popping in b-then-a order matters for - and /.',
      time: 'O(n)',
      space: 'O(n)',
    },
    code: { java: rpnJava, cpp: rpnCpp, pseudo: rpnPseudo },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    build,
  },
};
