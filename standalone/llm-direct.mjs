/**
 * Standalone LLM adapter for LeetCode Lab — speaks OpenAI-compatible
 * `/chat/completions` so the hosted app needs no Harness.
 *
 * Env: LLMAI_BASE_URL (default https://api.openai.com/v1),
 *      LLMAI_API_KEY (required for AI features),
 *      LLMAI_MODEL (default gpt-4o-mini).
 *
 * Exposes the same shape `plugin/host/ai.js` expects from the harness `llm`
 * service: listProviders(), listModels(provider), stream(options) as an async
 * generator of {type:'text-delta'} / {type:'finish'} chunks.
 */
const BASE_URL = (process.env.LLMAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
const API_KEY = process.env.LLMAI_API_KEY || ''
const MODEL = process.env.LLMAI_MODEL || 'gpt-4o-mini'

export function isConfigured() {
  return API_KEY !== ''
}

function toMessages(options) {
  const out = []
  if (options && typeof options.system === 'string' && options.system) {
    out.push({ role: 'system', content: options.system })
  }
  const messages = Array.isArray(options && options.messages) ? options.messages : []
  for (const message of messages) {
    const role = message.role === 'assistant' ? 'assistant' : 'user'
    const parts = Array.isArray(message.content) ? message.content : [{ type: 'text', text: String(message.content ?? '') }]
    out.push({ role, content: parts.map((part) => String(part.text ?? '')).join('\n') })
  }
  return out
}

export function directLlm() {
  return {
    async listProviders() {
      return isConfigured() ? [{ id: 'direct' }] : []
    },
    async listModels(provider) {
      if (!isConfigured() || (provider && provider !== 'direct')) return []
      return [{ id: MODEL, name: MODEL }]
    },
    async *stream(options) {
      if (!isConfigured()) {
        yield { type: 'finish', reason: { kind: 'error', failure: { message: 'AI is not configured: set LLMAI_API_KEY on the server' } } }
        return
      }
      const model = (options && options.model) || MODEL
      let response
      try {
        response = await fetch(BASE_URL + '/chat/completions', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: 'Bearer ' + API_KEY },
          body: JSON.stringify({
            model,
            messages: toMessages(options),
            temperature: typeof (options && options.temperature) === 'number' ? options.temperature : 0.4,
            max_tokens: (options && options.maxTokens) || 2000,
          }),
        })
      } catch (error) {
        yield { type: 'finish', reason: { kind: 'error', failure: { message: 'AI request failed: ' + String((error && error.message) || error) } } }
        return
      }
      if (!response.ok) {
        const body = await response.text().catch(() => '')
        yield { type: 'finish', reason: { kind: 'error', failure: { message: 'AI HTTP ' + response.status + ': ' + body.slice(0, 300), status: response.status } } }
        return
      }
      let json = null
      try {
        json = await response.json()
      } catch {
        yield { type: 'finish', reason: { kind: 'error', failure: { message: 'AI returned non-JSON' } } }
        return
      }
      const text = (json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) || ''
      if (String(text).trim() !== '') yield { type: 'text-delta', text: String(text) }
      yield { type: 'finish', reason: { kind: 'done' } }
    },
  }
}

/** Minimal ctxProvider stand-in for plugin/host/app.js createApi(). */
export function directCtx() {
  const llm = directLlm()
  return { get: (key) => (key === 'llm' ? llm : null) }
}
