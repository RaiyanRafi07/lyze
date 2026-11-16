/** Problem-specific walkthroughs. A pattern tag is never proof of algorithm compatibility. */
import { buildSemanticWalkthrough, semanticAdapter } from './semantic.js'
export function buildWalkthrough(problem, options={}) {
  if (!problem) return null
  return buildSemanticWalkthrough(problem, options)
}
export function lineForStep(walkthrough, language, step) {
  const lines=walkthrough?.code?.[language] || walkthrough?.code?.java || []
  const index=lines.findIndex(line=>line.step===step)
  return index<0?0:index+1
}
/** Accept an exact slug or a problem record; broad patterns are not supported claims. */
export function supportsWalkthrough(problem) {
  return Boolean(semanticAdapter(typeof problem==='string'?problem:problem?.slug))
}
