import { code, frame, arrayInput } from './semantic-core.js'

// Visual bound for the walkthrough scene (judge allows far larger inputs).
// Longer visual runs rely on anchors + the single boundedFrames pass in semantic.js.
const MAX_N = 12

const dailyJava = code(`
[def] class Solution {
[def]     public int[] dailyTemperatures(int[] temperatures) {
[init]         int n = temperatures.length;
[init]         int[] answer = new int[n];
[init]         java.util.ArrayDeque<Integer> stack = new java.util.ArrayDeque<>();
[scan]         for (int i = 0; i < n; i++) {
[check]             while (!stack.isEmpty() && temperatures[i] > temperatures[stack.peek()]) {
[pop]                 int j = stack.pop();
[write]                 answer[j] = i - j;
[def]             }
[push]             stack.push(i);
[def]         }
[return]         return answer;
[def]     }
[def] }
`)

const dailyCpp = code(`
[def] class Solution {
[def] public:
[def]     vector<int> dailyTemperatures(vector<int>& temperatures) {
[init]         int n = (int)temperatures.size();
[init]         vector<int> answer(n, 0);
[init]         vector<int> stack;
[init]         stack.reserve(n);
[scan]         for (int i = 0; i < n; i++) {
[check]             while (!stack.empty() && temperatures[i] > temperatures[stack.back()]) {
[pop]                 int j = stack.back(); stack.pop_back();
[write]                 answer[j] = i - j;
[def]             }
[push]             stack.push_back(i);
[def]         }
[return]         return answer;
[def]     }
[def] };
`)

const dailyPseudo = code(`
[def] dailyTemperatures(temperatures):
[init]   n = len(temperatures); answer = [0] * n; stack = []
[scan]   for i = 0 to n - 1:
[check]     while stack not empty and temperatures[i] > temperatures[stack.top]:
[pop]       j = pop stack
[write]       answer[j] = i - j
[push]     push i onto stack
[return]   return answer
`)

function decodeTemps(value) {
  return arrayInput(Array.isArray(value) ? value : JSON.parse(value), MAX_N)
}

function buildDaily(args) {
  const source = decodeTemps(args[0])
  const n = source.length
  const answer = new Array(n).fill(0)
  const stack = []
  const frames = []
  const anchors = []

  const state = (current, vars) => ({
    current,
    values: source.slice(),
    stack: stack.slice(),
    answer: answer.slice(),
    vars: { n, i: current, ...vars }
  })
  const push = (step, label, note, current, vars = {}) =>
    frames.push(frame(step, label, note, state(current, vars)))

  push('init', 'Initialize', 'n=' + n + ', answer=zeros, stack=[]', null, {})

  for (let i = 0; i < n; i++) {
    push('scan', 'Scan day ' + i, 'temperatures[' + i + ']=' + source[i] + ', stack=[' + stack.join(',') + ']', i, { temp: source[i] })
    if (stack.length === 0) {
      push('check', 'Check stack', 'stack empty; nothing to resolve at i=' + i, i, { empty: 1 })
    } else {
      while (stack.length > 0 && source[i] > source[stack[stack.length - 1]]) {
        const top = stack[stack.length - 1]
        push('check', 'Warmer found', 'temperatures[' + i + ']=' + source[i] + ' > temperatures[' + top + ']=' + source[top] + '; resolve j=' + top, i, { top, temp: source[i], topTemp: source[top] })
        const j = stack.pop()
        push('pop', 'Pop index ' + j, 'pop j=' + j + ' (temp ' + source[j] + '); stack=[' + stack.join(',') + ']', i, { j, poppedTemp: source[j] })
        answer[j] = i - j
        anchors.push(frames.length)
        push('write', 'Write answer[' + j + ']', 'answer[' + j + ']=' + i + '-' + j + '=' + answer[j], i, { j, dist: answer[j] })
      }
      const top = stack.length ? stack[stack.length - 1] : null
      if (top === null) {
        push('check', 'Check stack', 'stack empty after pops; exit loop at i=' + i, i, { empty: 1 })
      } else {
        push('check', 'No warmer day', 'temperatures[' + i + ']=' + source[i] + ' <= temperatures[' + top + ']=' + source[top] + '; keep j=' + top, i, { top, temp: source[i], topTemp: source[top] })
      }
    }
    stack.push(i)
    push('push', 'Push index ' + i, 'push i=' + i + ' (temp ' + source[i] + '); stack=[' + stack.join(',') + ']', i, { pushed: i })
  }

  anchors.push(frames.length)
  push('return', 'Return answer', 'return [' + answer.join(',') + ']', null, {})
  // Full event list: semantic.js performs the single honest compaction pass.
  return {
    kind: 'array',
    layout: { values: source.slice() },
    frames,
    result: answer.slice(),
    anchors
  }
}

export const adapters = {
  'daily-temperatures': {
    signature: { name: 'dailyTemperatures', params: ['int[]'], return: 'int[]' },
    lesson: {
      idea: 'Sweep days left to right; stack holds indices of unsolved days in decreasing temperature order.',
      trap: 'Stack stores indices, not temps; pop only while strictly warmer, equal days stay stacked.',
      time: 'O(n)',
      space: 'O(n)'
    },
    explain: {
      def: 'Scope wrapper around the sweep; no algorithm work happens on these lines.',
      init: 'Allocate the zero-filled answer and the empty index stack.',
      scan: 'Visit day i left to right; i is the candidate warmer day for everyone stacked.',
      check: 'Compare strictly: only days colder than today are resolved; equals stay stacked.',
      pop: 'Remove the resolved day index from the stack top.',
      write: 'Distance waited is today minus the resolved day (i - j).',
      push: 'Today is unsolved until a warmer day arrives, so stack it.',
      return: 'Days left in the stack never saw a warmer day; their zeros are final.'
    },
    explainLines: {
      java: {
        9: 'End of the while body: re-check the new top against the same day i.',
        11: 'End of the for body: advance to the next day.'
      },
      cpp: {
        11: 'End of the while body: re-check the new top against the same day i.',
        13: 'End of the for body: advance to the next day.'
      },
      pseudo: {}
    },
    code: { java: dailyJava, cpp: dailyCpp, pseudo: dailyPseudo },
    build: buildDaily
  }
}
