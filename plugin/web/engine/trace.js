/**
 * LeetCode Lab — user-trace scenes.
 *
 * `eventsToScene(events, problem)` turns the probe log from POST /api/trace (the USER's
 * own loop iterations: array snapshots, index scalars, map contents) into a normal scene
 * the diagram renderer can step through. No fabrication: every value comes from the log;
 * when the log has no usable array the function returns null and the UI falls back to
 * the canonical walkthrough.
 */
import { arrayScene, stringScene } from './scenes.js'

const POINTER_NAMES = new Set([
  'i', 'j', 'k', 'lo', 'hi', 'mid', 'left', 'right', 'low', 'high', 'l', 'r',
  'idx', 'index', 'pos', 'start', 'end', 'prev', 'next', 'curr', 'day', 'top', 'p', 'q',
])

const isInt = (v) => typeof v === 'number' && Number.isFinite(v) && Math.trunc(v) === v

function firstArrayOf(events) {
  for (const event of events) {
    if (!event || typeof event !== 'object') continue
    for (const value of Object.values(event)) {
      if (Array.isArray(value) && value.length > 0 && value.length <= 64 && value.every((v) => typeof v === 'number' && Number.isFinite(v))) {
        return { kind: 'numbers', values: value.slice(0, 64) }
      }
      if (typeof value === 'string' && value.length >= 2 && value.length <= 64) {
        return { kind: 'chars', values: [...value] }
      }
    }
  }
  return null
}

function describeScalars(event, arrayKey) {
  const parts = []
  for (const [key, value] of Object.entries(event)) {
    if (key === arrayKey) continue
    if (isInt(value) && Math.abs(value) < 1e9) parts.push(`${key}=${value}`)
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      const n = Object.keys(value).length
      parts.push(`${key}: ${n} entr${n === 1 ? 'y' : 'ies'}`)
    }
  }
  return parts.slice(0, 5).join(', ')
}

export function eventsToScene(events, problem) {
  try {
    const list = Array.isArray(events) ? events.filter((e) => e && typeof e === 'object') : []
    if (list.length === 0) return null
    const found = firstArrayOf(list)
    if (!found) return null
    const arrayKey = (() => {
      for (const event of list) {
        for (const [key, value] of Object.entries(event)) {
          if (found.kind === 'numbers' && Array.isArray(value) && value.length > 0) return key
          if (found.kind === 'chars' && typeof value === 'string' && value.length >= 2) return key
        }
      }
      return null
    })()
    const frames = list.map((event, k) => {
      const pointers = {}
      let seen = null
      let values = null
      let window = null
      for (const [key, value] of Object.entries(event)) {
        if (key === arrayKey) {
          if (found.kind === 'numbers' && Array.isArray(value)) values = value.slice(0, 64).map((v) => (Number.isFinite(v) ? v : 0))
          continue
        }
        if (POINTER_NAMES.has(key) && isInt(value) && value >= 0 && value < found.values.length) pointers[key] = value
        else if (value && typeof value === 'object' && !Array.isArray(value) && seen === null) {
          const entries = Object.entries(value).filter(([, v]) => isInt(v))
          if (entries.length > 0) seen = Object.fromEntries(entries.slice(0, 64))
        }
      }
      const left = pointers.left
      const right = pointers.right
      if (Number.isInteger(left) && Number.isInteger(right) && left <= right) window = [left, right]
      else {
        const lo = pointers.lo
        const hi = pointers.hi
        if (Number.isInteger(lo) && Number.isInteger(hi) && lo <= hi) window = [lo, hi]
      }
      const summary = describeScalars(event, arrayKey)
      const state = { pointers }
      if (values) state.values = values
      if (seen) state.seen = seen
      if (window) state.window = window
      const highlights = {}
      if (Number.isInteger(pointers.i)) highlights[pointers.i] = 'accent'
      if (Object.keys(highlights).length > 0) state.highlights = highlights
      return {
        label: `your iter ${k + 1}`,
        note: summary ? `Your loop, iteration ${k + 1}: ${summary}.` : `Your loop, iteration ${k + 1}.`,
        state,
      }
    })
    frames.push({
      label: 'your result',
      note: 'Your run ended here — compare where it stopped with the reference walkthrough.',
      state: frames.length > 0 ? { ...frames[frames.length - 1].state } : {},
    })
    const title = problem && problem.title ? `${problem.title} — your run` : 'Your run'
    const options = { title, subtitle: 'Traced from your own code, one loop iteration per step', pattern: (problem && problem.pattern) || '', frames }
    const scene = found.kind === 'chars' ? stringScene({ ...options, chars: found.values }) : arrayScene({ ...options, values: found.values })
    return scene
  } catch {
    return null
  }
}
