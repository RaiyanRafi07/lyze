/**
 * AI bridge for LeetCode Lab.
 *
 * Talks to the harness `llm` service (the profile's own providers) and turns a request
 * into a teaching artifact: a plain-language explanation, a JSON scene script the 3D
 * renderer can play, a set of similar practice problems, or a code review.
 *
 * The user's profile wires `opencode-go`; we prefer it, pick the strongest model it
 * advertises, and fall back to whatever provider the harness has configured.
 */
const SYSTEM_PROMPT = [
  'You are the tutor inside "LeetCode Lab", an interactive visual learning app.',
  'You explain the underlying concept, not just the code. You are precise, concrete and brief.',
  'You always use the real numbers from the problem example in your reasoning.',
  'When asked for JSON you return a single valid JSON object with no markdown fences, no comments and no prose outside it.',
  'Never invent problem constraints that contradict the statement. If something is ambiguous, say so in one sentence.',
].join(' ')

const SCENE_SCHEMA = `{
  "v": 1,
  "kind": "array" | "string" | "tree" | "graph" | "grid" | "linked-list" | "stack",
  "title": "short title",
  "subtitle": "one line",
  "pattern": "pattern id",
  "camera": { "yaw": 0.55, "pitch": 0.30, "dist": 9 },
  "layout": kind-specific: array|string|linked-list -> {"values": number[]} or {"chars": string[]};
            tree -> {"nodes":[{"id":string,"value":number}],"edges":[[parentId,childId]]};
            graph -> {"nodes":[{"id":string,"label":string,"x":number,"y":number}],"edges":[[a,b]],"directed":false};
            grid -> {"rows":number,"cols":number,"cells":[[number|string]]};
            stack -> {"capacity":number},
  "frames": [ { "label": "step label", "note": "narration, max 140 chars",
                "state": { ... } } ]
}
State fields by kind: array/string/linked-list -> pointers {name: index}, highlights {index: "accent"|"ok"|"warn"|"bad"|"dim"}, window [lo,hi], seen {value:index}, removed [index];
tree -> current, visited[], frontier[], path[]; graph -> current, visited[], frontier[], path[], cycle[];
grid -> current [r,c], filled [[r,c]], path [[r,c]], blocked [[r,c]]; stack -> items[], op.`

const PATTERN_HINT = `Pattern ids: arrays-hashing, two-pointers, sliding-window, prefix-sum, binary-search, sorting, stack, monotonic-stack, queue-deque, linked-list, tree-dfs, tree-bfs, bst, trie, graph-dfs, graph-bfs, topological-sort, union-find, backtracking, greedy, intervals, heap-topk, matrix, bit-manipulation, dp-1d, dp-2d, dp-trees, strings, math, design, recursion.`

const JSON_ONLY = 'Return ONLY the JSON object.'

const modelCache = { key: '', value: null, promise: null }

function clip(text, limit) {
  const value = String(text ?? '')
  return value.length > limit ? value.slice(0, limit - 1) + '…' : value
}

function problemBrief(problem, limit = 3500) {
  if (!problem) return ''
  const examples = (problem.examples || [])
    .slice(0, 3)
    .map((example) => 'Example ' + example.n + ': ' + (example.raw || example.input + ' → ' + example.output))
    .join('\n')
  const signature = problem.judge && problem.judge.signature ? JSON.stringify(problem.judge.signature) : 'unknown'
  return clip(
    [
      'Title: ' + problem.title + ' [' + problem.difficulty + ']',
      'Topics: ' + (problem.topics || []).join(', '),
      'Pattern: ' + problem.pattern,
      'Statement:\n' + (problem.description || ''),
      'Examples:\n' + examples,
      'Constraints:\n' + (problem.constraints || []).join('\n'),
      'Function signature: ' + signature,
    ].join('\n\n'),
    limit,
  )
}

/** Score a model id for "best tutor model" — higher is better. */
function scoreModel(id, name) {
  const text = (String(id) + ' ' + String(name || '')).toLowerCase()
  if (/embed|whisper|tts|rerank|moderation|guard|image|dall|flux|sdxl/.test(text)) return -100
  let score = 0
  if (/claude.*(opus|sonnet)/.test(text)) score += 90
  else if (/claude/.test(text)) score += 60
  if (/gpt-5/.test(text)) score += 85
  else if (/gpt-4\.1|gpt-4o/.test(text)) score += 70
  else if (/o3|o4/.test(text)) score += 65
  if (/gemini.*(2\.5|3).*pro/.test(text)) score += 80
  if (/deepseek.*(v3|r1|chat)/.test(text)) score += 55
  if (/kimi|glm|qwen.*(max|plus)/.test(text)) score += 50
  if (/flash|mini|lite|small|fast/.test(text)) score -= 18
  if (/free/.test(text)) score -= 6
  if (text.trim() === '') score -= 20
  return score
}

async function resolveTarget(llm, preferred) {
  const providers = await llm.listProviders()
  const ids = providers.map((provider) => provider.id)
  if (ids.length === 0) throw new Error('no LLM providers are registered')
  const provider = preferred && ids.includes(preferred) ? preferred : ids.includes('opencode-go') ? 'opencode-go' : ids[0]
  const models = await llm.listModels(provider).catch(() => [])
  const ranked = models
    .map((entry) => ({ id: entry.id, name: entry.name, score: scoreModel(entry.id, entry.name) }))
    .filter((entry) => entry.score > -50)
    .sort((a, b) => b.score - a.score)
  const model = ranked.length > 0 ? ranked[0].id : models.length > 0 ? models[0].id : undefined
  return { provider, model, candidates: ranked.slice(0, 8), providers: ids }
}

async function target(llm, override) {
  const key = JSON.stringify(override || null)
  if (modelCache.value && modelCache.key === key) return modelCache.value
  if (modelCache.promise && modelCache.key === key) return modelCache.promise
  modelCache.key = key
  modelCache.promise = resolveTarget(llm, override && override.provider)
    .then((value) => {
      modelCache.value = value
      modelCache.promise = null
      return value
    })
    .catch((error) => {
      modelCache.promise = null
      throw error
    })
  return modelCache.promise
}

async function collect(llm, options) {
  let text = ''
  let failure = null
  const stream = llm.stream(options)
  for await (const chunk of stream) {
    if (chunk.type === 'text-delta') text += chunk.text
    else if (chunk.type === 'finish') {
      if (chunk.reason && chunk.reason.kind === 'error') failure = chunk.reason.failure
      else if (chunk.reason && chunk.reason.kind === 'aborted') failure = chunk.reason.failure || { message: 'aborted' }
    }
  }
  if (failure && !text.trim()) {
    const error = new Error(failure.message || 'model call failed')
    error.code = failure.code
    error.status = failure.status
    throw error
  }
  return { text, failure }
}

async function ask(llm, config, prompt, maxTokens) {
  const messages = [{ role: 'user', content: [{ type: 'text', text: prompt }] }]
  // OpenCode Go routes requests per session (`x-opencode-session`); pass a stable lab
  // session id so the adapter can stamp it on the request.
  const sessionId = 'leetcode-lab-ai'
  const shapes = [
    { provider: config.provider, model: config.model, sessionId, system: SYSTEM_PROMPT, maxTokens, temperature: 0.4, messages },
    { provider: config.provider, model: config.model, sessionId, system: SYSTEM_PROMPT, messages },
    { provider: config.provider, model: config.model, sessionId, maxTokens, messages },
    { provider: config.provider, model: config.model, sessionId, messages },
  ]
  const failures = []
  for (const shape of shapes) {
    try {
      return await collect(llm, shape)
    } catch (error) {
      failures.push(String((error && error.message) || error))
    }
  }
  const error = new Error('model call failed: ' + failures.join(' | '))
  throw error
}

function extractJson(text) {
  let body = String(text || '').trim()
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(body)
  if (fenced) body = fenced[1].trim()
  if (body.startsWith('{') && body.endsWith('}')) {
    try {
      return JSON.parse(body)
    } catch {
      /* fall through to brace extraction */
    }
  }
  const start = body.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < body.length; i += 1) {
    const ch = body[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        try {
          return JSON.parse(body.slice(start, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

const KINDS = new Set(['array', 'string', 'tree', 'graph', 'grid', 'linked-list', 'stack'])

function validateScene(scene) {
  if (!scene || typeof scene !== 'object') return 'scene is not an object'
  if (!KINDS.has(scene.kind)) return 'unknown kind: ' + String(scene.kind)
  if (!scene.layout || typeof scene.layout !== 'object') return 'missing layout'
  if (!Array.isArray(scene.frames) || scene.frames.length === 0) return 'missing frames'
  const frames = scene.frames.filter((frame) => frame && typeof frame === 'object')
  if (frames.length === 0) return 'frames are not objects'
  return null
}

export async function aiStatus(ctx) {
  const llm = ctx.get ? ctx.get('llm') : null
  if (!llm) return { ok: false, error: 'llm service unavailable' }
  try {
    const config = await target(llm, null)
    return { ok: true, provider: config.provider, model: config.model || null, candidates: config.candidates, providers: config.providers }
  } catch (error) {
    return { ok: false, error: String((error && error.message) || error) }
  }
}

export async function aiRequest(ctx, body) {
  const llm = ctx.get ? ctx.get('llm') : null
  if (!llm) return { ok: false, error: 'the harness llm service is unavailable' }
  const kind = String((body && body.kind) || 'explain')
  const problem = body && body.problem ? body.problem : null
  let config
  try {
    config = await target(llm, body && body.model ? { provider: body.provider || null } : null)
  } catch (error) {
    return { ok: false, kind, error: String((error && error.message) || error) }
  }
  if (body && body.model) config.model = body.model
  const brief = problemBrief(problem)
  const code = body && body.code ? clip(body.code, 6000) : ''
  const stuck = body && body.stuck ? clip(body.stuck, 1200) : ''

  try {
    if (kind === 'explain') {
      const prompt = [
        brief,
        '',
        stuck ? 'The learner is stuck on: ' + stuck : '',
        '',
        'Explain this problem so the idea clicks. Use this structure:',
        '1. **The one idea** — the pattern in one sentence, with the real numbers from example 1.',
        '2. **Walk it through** — 4-8 numbered micro-steps on example 1, showing the state changing.',
        '3. **Why it is correct** — the invariant, in plain words.',
        '4. **Where people break it** — 2-3 concrete traps.',
        '5. **Complexity** — time/space and the reason.',
        'Keep it under 350 words. Markdown is fine.',
      ]
        .filter((line) => line !== null)
        .join('\n')
      const { text } = await ask(llm, config, prompt, 1600)
      return { ok: true, kind, text: text.trim(), provider: config.provider, model: config.model }
    }

    if (kind === 'scene') {
      const prompt = [
        brief,
        '',
        stuck ? 'The learner is stuck on: ' + stuck : '',
        'Build an animated 3D scene script that makes this concept visible. Use the real numbers from example 1.',
        'Rules: 8-24 frames, every index you reference must exist, the first frame shows the initial state, the last frame states the answer.',
        'Pick the kind that best fits: array, string, tree, graph, grid, linked-list, or stack.',
        PATTERN_HINT,
        'Scene schema:',
        SCENE_SCHEMA,
        JSON_ONLY,
      ].join('\n')
      const { text } = await ask(llm, config, prompt, 2600)
      const scene = extractJson(text)
      const problem2 = scene ? validateScene(scene) : 'could not parse JSON'
      if (problem2) return { ok: false, kind, error: problem2, raw: clip(text, 2000), provider: config.provider, model: config.model }
      return { ok: true, kind, scene, provider: config.provider, model: config.model }
    }

    if (kind === 'variants') {
      const prompt = [
        brief,
        '',
        'Create 3 practice problems that drill the SAME pattern, a little harder each time, each solvable in about 20 minutes.',
        'Each must be self-contained (a learner never needs the original problem) and must include real example inputs and outputs.',
        'Every problem needs machine-checkable tests: 3-5 cases with the exact argument literals and the exact expected output, in LeetCode literal form.',
        'Return JSON: {"problems":[{"title","difficulty":"Easy|Medium|Hard","statement","examples":[{"input","output","explain"}],"tests":[{"args":["..."],"expected":"..."}],"mode":"exact|unordered","constraints":[],"hints":[],"solutionOutline","signature":{"name","params":[{"name","type"}],"return"}}]}',
        'Types allowed: int, long, double, boolean, string, char, int[], long[], double[], boolean[], string[], char[], int[][], char[][], string[][].',
        'The signature must be the SAME single-method shape as the original so one editor works; args must line up with the params in order.',
        JSON_ONLY,
      ].join('\n')
      const { text } = await ask(llm, config, prompt, 3000)
      const payload = extractJson(text)
      if (!payload || !Array.isArray(payload.problems)) {
        return { ok: false, kind, error: 'could not parse variants JSON', raw: clip(text, 2000), provider: config.provider, model: config.model }
      }
      return { ok: true, kind, problems: payload.problems.slice(0, 4), provider: config.provider, model: config.model }
    }

    if (kind === 'review') {
      const prompt = [
        brief,
        '',
        'Learner code (' + (body.lang || 'java') + '):',
        '```',
        code,
        '```',
        '',
        'Review it as an interviewer would: 1) Is it correct? Name the exact input class where it breaks if not. 2) Complexity vs the expected complexity. 3) The single highest-leverage fix. 4) The one thing to visualize to understand the failure. Under 250 words, markdown.',
      ].join('\n')
      const { text } = await ask(llm, config, prompt, 1400)
      return { ok: true, kind, text: text.trim(), provider: config.provider, model: config.model }
    }

    return { ok: false, error: 'unknown ai kind: ' + kind }
  } catch (error) {
    return {
      ok: false,
      kind,
      error: String((error && error.message) || error),
      code: error && error.code,
      status: error && error.status,
      provider: config.provider,
      model: config.model,
    }
  }
}
