/** Min Stack (LC 155, Medium) — semantic walkthrough adapter (design problem, judge null).
 *
 * TEST PROFILE (honest, documented): the live shard record
 * (plugin/data/shard-5.json :: problems[slug==min-stack]) keeps judge:null —
 * a class with four methods has no single-call signature. The walkthrough and
 * the forge therefore share one documented staged profile instead of the
 * official signature (precedents: mergeKLists(int[][])->int[],
 * runTrieOps(string[],string[])->string):
 *
 *   MinStack(ops: string[], rows: string[]) -> string
 *
 * args[0] is the op tape, e.g. ["MinStack","push","push","push","getMin","pop","top","getMin"];
 * args[1] is the per-call argument rows, e.g. [[],[-2],[0],[-3],[],[],[],[]]
 * (each row may also arrive as a JSON literal string, the judge literal-string
 * format the forge variants use). The walkthrough replays the tape through the
 * mirrored-stack reference (data stack + mins mirror, same algorithm as the
 * staged ./adapter.js traceStaged and reference.js MinStack) and returns the
 * full JSON result literal, e.g. "[null,null,null,null,-3,null,0,-2]".
 * Nothing here flips the shard judge flag; judgeCase stays null in the spec.
 *
 * Staged sources: .workers/jobs/question-owners-150/min-stack/{adapter.js,reference.js}
 * (traceStaged replay, runStaged reference, every-line notes).
 * Pure, synchronous, dependency-free.
 */
import { code, frame } from './semantic-core.js'

export const SLUG = 'min-stack'

/** Documented TEST PROFILE signature (see header). Params arrive as JSON literals. */
export const SIGNATURE = Object.freeze({
  name: 'MinStack',
  params: Object.freeze([
    { name: 'ops', type: 'string[]' },
    { name: 'rows', type: 'string[]' },
  ]),
  return: 'string',
})

const minStackJava = code(`
[structure] class MinStack {
[init]     private java.util.ArrayDeque<Integer> stack = new java.util.ArrayDeque<>();
[init]     private java.util.ArrayDeque<Integer> mins = new java.util.ArrayDeque<>();
[init]     public MinStack() { }
[push]     public void push(int val) {
[push]         stack.push(val);
[push]         if (mins.isEmpty() || val <= mins.peek()) mins.push(val);
[push]         else mins.push(mins.peek());
[push]     }
[pop]     public void pop() {
[pop]         stack.pop();
[pop]         mins.pop();
[pop]     }
[peek]     public int top() {
[peek]         return stack.peek();
[peek]     }
[peek]     public int getMin() {
[peek]         return mins.peek();
[peek]     }
[structure] }
`)

const minStackCpp = code(`
[structure] class MinStack {
[structure] public:
[init]     MinStack() { }
[init]     std::vector<int> stack_;
[init]     std::vector<int> mins_;
[push]     void push(int val) {
[push]         stack_.push_back(val);
[push]         if (mins_.empty() || val <= mins_.back()) mins_.push_back(val);
[push]         else mins_.push_back(mins_.back());
[push]     }
[pop]     void pop() {
[pop]         stack_.pop_back();
[pop]         mins_.pop_back();
[pop]     }
[peek]     int top() {
[peek]         return stack_.back();
[peek]     }
[peek]     int getMin() {
[peek]         return mins_.back();
[peek]     }
[structure] };
`)

const minStackPseudo = code(`
[init] MinStack(): stack = []; mins = []
[push] push(val):
[push]   stack.push(val)
[push]   if mins empty or val <= mins.top: mins.push(val)
[push]   else: mins.push(mins.top)
[pop] pop():
[pop]   stack.pop(); mins.pop()
[peek] top(): return stack.top
[peek] getMin(): return mins.top
`)

function asJsonArray(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    } catch { /* fall through to null */ }
  }
  return null
}

function decodeCallArgs(rawRows) {
  const rows = asJsonArray(rawRows)
  if (!rows) return null
  return rows.map((row) => {
    if (Array.isArray(row)) return row
    if (typeof row === 'string') {
      try {
        const parsed = JSON.parse(row)
        if (Array.isArray(parsed)) return parsed
      } catch { /* not a row literal */ }
    }
    return null
  })
}

const KNOWN_OPS = new Set(['MinStack', 'push', 'pop', 'top', 'getMin'])

function isInt(value) {
  return typeof value === 'number' && Number.isSafeInteger(value)
}

function callLabel(op, row) {
  if (op === 'MinStack') return 'MinStack()'
  if (op === 'push') return 'push(' + row[0] + ')'
  if (op === 'pop') return 'pop()'
  if (op === 'top') return 'top()'
  return 'getMin()'
}

/**
 * Replay the op tape through the mirrored-stack reference and emit one frame
 * per call. Throws a clear error on malformed tapes instead of fabricating
 * state. Visual bound: at most 40 calls per walkthrough.
 */
function buildMinStackScene(ops, rows) {
  if (!Array.isArray(ops) || !Array.isArray(rows) || ops.length === 0 || ops.length !== rows.length) {
    throw new Error('Provide the op tape and one argument row per call, e.g. ["MinStack","push","getMin"] and [[],[-2],[]], for this walkthrough')
  }
  if (ops.length > 40) throw new Error('Visual walkthrough replays at most 40 calls (' + ops.length + ' given); shorten the tape')
  if (ops[0] !== 'MinStack') throw new Error('First op must be MinStack (constructor)')
  for (let i = 0; i < ops.length; i++) {
    if (!KNOWN_OPS.has(ops[i])) throw new Error('Unknown op ' + JSON.stringify(ops[i]) + ' at call ' + i)
    if (!Array.isArray(rows[i])) throw new Error('Row ' + i + ' must be an argument array')
  }
  const stack = []
  const mins = []
  const results = []
  const frames = []
  const seenPushes = []
  const depthOf = () => stack.length
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]
    const row = rows[i]
    if (op === 'MinStack') {
      if (row.length !== 0) throw new Error('MinStack() takes no arguments')
      results.push(null)
      frames.push(frame('init', 'Create MinStack', 'New MinStack: stack=[] and mins=[]. O(1) per op needs the mirror.', {
        items: [], minima: [], op: 'init', ret: null, callIndex: i, vars: { call: i, depth: 0 },
      }))
    } else if (op === 'push') {
      if (row.length !== 1 || !isInt(row[0])) throw new Error('push needs one integer at call ' + i)
      const val = row[0]
      const prev = mins.length === 0 ? null : mins[mins.length - 1]
      stack.push(val)
      mins.push(prev === null || val <= prev ? val : prev)
      seenPushes.push(val)
      results.push(null)
      const note = prev === null
        ? 'Push ' + val + '; mins was empty so ' + val + ' is the min.'
        : val <= prev
          ? 'Push ' + val + '; ' + val + ' <= ' + prev + ' so the min drops to ' + val + '.'
          : 'Push ' + val + '; ' + val + ' > ' + prev + ' so mins repeats ' + prev + '.'
      frames.push(frame('push', ('push(' + val + ')').slice(0, 40), note.slice(0, 140), {
        items: stack.slice(), minima: mins.slice(), op: 'push', ret: null, callIndex: i,
        vars: { call: i, val, depth: depthOf() },
      }))
    } else if (op === 'pop') {
      if (row.length !== 0) throw new Error('pop takes no arguments at call ' + i)
      if (stack.length === 0) throw new Error('pop on an empty stack at call ' + i)
      const popped = stack.pop()
      mins.pop()
      results.push(null)
      const back = mins.length === 0 ? 'empty' : String(mins[mins.length - 1])
      frames.push(frame('pop', 'pop()', ('Remove ' + popped + '; mins pops back to ' + back + '.').slice(0, 140), {
        items: stack.slice(), minima: mins.slice(), op: 'pop', ret: null, callIndex: i,
        vars: { call: i, popped, depth: depthOf() },
      }))
    } else {
      if (row.length !== 0) throw new Error(op + ' takes no arguments at call ' + i)
      if (stack.length === 0) throw new Error(op + ' on an empty stack at call ' + i)
      const ret = op === 'top' ? stack[stack.length - 1] : mins[mins.length - 1]
      results.push(ret)
      const note = op === 'top'
        ? 'Stack top is ' + ret + '; return it, nothing removed.'
        : 'mins top is ' + ret + '; return it with no scan.'
      frames.push(frame('peek', (op + '() -> ' + ret).slice(0, 40), note.slice(0, 140), {
        items: stack.slice(), minima: mins.slice(), op: 'peek', ret, callIndex: i,
        vars: { call: i, returned: ret, depth: depthOf() },
      }))
    }
  }
  const last = frames[frames.length - 1]
  const finalMin = mins.length === 0 ? 'empty' : String(mins[mins.length - 1])
  frames.push(frame(last.step, 'Transcript done', ('Replayed ' + ops.length + ' calls; stack=[' + stack.join(',') + '] min=' + finalMin + '.').slice(0, 140), {
    items: stack.slice(), minima: mins.slice(), op: last.state.op, ret: last.state.ret, callIndex: ops.length - 1,
    vars: { calls: ops.length, depth: depthOf() },
  }))
  const calls = ops.map((op, i) => callLabel(op, rows[i]))
  const capacity = Math.max(8, stack.length + 2)
  void seenPushes
  return {
    kind: 'stack',
    layout: { capacity, calls },
    frames,
    result: results.slice(),
  }
}

function build(args) {
  if (!Array.isArray(args) || args.length !== 2) {
    throw new Error('Provide the op tape and one argument row per call, e.g. ["MinStack","push","getMin"] and [[],[-2],[]], for this walkthrough')
  }
  const ops = asJsonArray(args[0])
  const rows = decodeCallArgs(args[1])
  if (!ops || !rows) {
    throw new Error('Provide the op tape and one argument row per call, e.g. ["MinStack","push","getMin"] and [[],[-2],[]], for this walkthrough')
  }
  return buildMinStackScene(ops, rows)
}

export const adapters = {
  'min-stack': {
    signature: { name: SIGNATURE.name, params: [{ name: 'ops', type: 'string[]' }, { name: 'rows', type: 'string[]' }], return: SIGNATURE.return },
    lesson: {
      idea: 'Mirror every push on a mins stack; getMin peeks at the mirror instead of scanning.',
      trap: 'Use <= when pushing the mirror, or one pop of a duplicate minimum corrupts getMin.',
      time: 'O(1) per op',
      space: 'O(n) for the mirrored minima',
      alt: 'One stack of (value, minSoFar) pairs keeps identical O(1)/O(n) behavior with one allocation per push; a single min variable plus a count is brittle on duplicate minima, so the mirrored stack is the safer default.',
    },
    explain: {
      init: 'Construct both stacks empty; the mins[i] = min(stack[0..i]) invariant holds vacuously.',
      push: 'Append val to the data stack and carry the running minimum forward so both stacks stay aligned.',
      pop: 'Pop both stacks together; the previous minimum resurfaces automatically.',
      peek: 'Peek without removing: top reads the data stack, getMin reads the mins mirror in O(1).',
    },
    explainLines: {
      java: {
        19: 'End of the MinStack class scope; it performs no algorithm operation.',
      },
      cpp: {
        20: 'End of the MinStack class scope; it performs no algorithm operation.',
      },
      pseudo: {},
    },
    code: { java: minStackJava, cpp: minStackCpp, pseudo: minStackPseudo },
    build,
  },
}
