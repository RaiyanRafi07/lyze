/**
 * Shared problem registration — live browser-safe subset (registry + pure predicates).
 *
 * Staged source: .workers/jobs/deck-release/catalog-expansion/platform/shared-problem-registration/shared-problem-registration.mjs
 * Live deviation (documented): the staged module imports host/data.js (node:fs),
 * semantic.js, variants.js, walkthrough.js and ui/starter.js for its Node-only
 * resolveProblemRegistration(). Those imports would pull node:fs into the browser
 * bundle (variants.js runs in Chromium) and create a variants <-> registration
 * cycle. The live file therefore ships ONLY the pure registry table + predicates
 * that the variants.js gate needs. Full resolve (record + starters + walkthrough +
 * practice) stays staged for Node selfchecks; see INTEGRATION.md §1-2.
 *
 * Adding a slug is one row in PROBLEM_REGISTRY (+ its two new files).
 * New slugs MUST NOT be added to ELIGIBLE_PROBLEMS; they add one row here.
 */

import { traversalBuilders } from './forge-tree-traversal.js'

export const REGISTRY_VERSION = 'shared-problem-registration/v1'

const TYPES = new Set([
  'int', 'long', 'double', 'boolean', 'string', 'char',
  'int[]', 'long[]', 'double[]', 'boolean[]', 'string[]', 'char[]',
  'int[][]', 'string[][]', 'char[][]', 'ListNode', 'ListNode[]', 'TreeNode', 'Node',
])

/**
 * ONE table. Adding a slug is one row here (+ its two new files).
 * No ELIGIBLE_PROBLEMS edit, no second list.
 *
 * kind: 'family'   -> builder lives in forge-tree-traversal.js (traversal order differs per row)
 * kind: 'explicit' -> per-slug forge (live engine) or staged override (new slugs pre-integration)
 */
export const PROBLEM_REGISTRY = Object.freeze({
  'binary-tree-inorder-traversal': Object.freeze({
    kind: 'family', mode: 'exact',
    signature: Object.freeze({ name: 'inorderTraversal', params: Object.freeze(['TreeNode']), return: 'int[]' }),
    walkthroughArgs: null, visual: null, isNew: false,
    note: 'Traversal family precedent: exact slugs share fixture builder, signature checks, generator; algorithm order differs per registration.',
  }),
  'binary-tree-preorder-traversal': Object.freeze({
    kind: 'family', mode: 'exact',
    signature: Object.freeze({ name: 'preorderTraversal', params: Object.freeze(['TreeNode']), return: 'int[]' }),
    walkthroughArgs: null, visual: null, isNew: false,
    note: 'Traversal family precedent: same shared builder, order [node,left,right].',
  }),
  'binary-tree-postorder-traversal': Object.freeze({
    kind: 'family', mode: 'exact',
    signature: Object.freeze({ name: 'postorderTraversal', params: Object.freeze(['TreeNode']), return: 'int[]' }),
    walkthroughArgs: null, visual: null, isNew: false,
    note: 'Traversal family precedent: same shared builder, order [left,right,node].',
  }),
  'search-insert-position': Object.freeze({
    kind: 'explicit', mode: 'exact',
    signature: Object.freeze({ name: 'searchInsert', params: Object.freeze(['int[]', 'int']), return: 'int' }),
    walkthroughArgs: null, visual: null, isNew: false,
    note: 'Representative legacy slug: live adapter (strings-adapters.js) + live forge (variants.js buildSearchInsertPositionVariantsFor).',
  }),
  'palindrome-number': Object.freeze({
    kind: 'explicit', mode: 'exact',
    signature: Object.freeze({ name: 'isPalindrome', params: Object.freeze(['int']), return: 'boolean' }),
    walkthroughArgs: null, visual: 'palindrome-number', isNew: false,
    note: 'Second legacy proof: first catalog report, now integrated live (adapter + forge-palindrome-number.js) + question-specific visual.',
  }),
  'roman-to-integer': Object.freeze({
    kind: 'explicit', mode: 'exact',
    signature: Object.freeze({ name: 'romanToInt', params: Object.freeze(['string']), return: 'int' }),
    walkthroughArgs: Object.freeze(['"MCMXCIV"']),
    visual: 'roman-to-integer', isNew: true,
    note: 'Real new slug: live adapter + live forge (integrated 2026-11-15); registry row is the single registration.',
  }),
  'longest-common-prefix': Object.freeze({
    kind: 'explicit', mode: 'exact',
    signature: Object.freeze({ name: 'longestCommonPrefix', params: Object.freeze(['string[]']), return: 'string' }),
    walkthroughArgs: null, visual: 'longest-common-prefix', isNew: true,
    note: 'Real new slug: live adapter + live forge + question-specific visual (integrated 2026-11-16); registry row is the single registration, no ELIGIBLE edit.',
  }),
  'longest-valid-parentheses': Object.freeze({
    kind: 'explicit', mode: 'exact',
    signature: Object.freeze({ name: 'longestValidParentheses', params: Object.freeze(['string']), return: 'int' }),
    walkthroughArgs: null, visual: 'longest-valid-parentheses', isNew: true,
    note: 'Real new slug: live adapter + live forge (integrated 2026-11-16); registry row is the single registration, no ELIGIBLE edit.',
  }),
  'swap-nodes-in-pairs': Object.freeze({
    kind: 'explicit', mode: 'exact',
    signature: Object.freeze({ name: 'swapPairs', params: Object.freeze(['ListNode']), return: 'ListNode' }),
    walkthroughArgs: null, visual: 'swap-nodes-in-pairs', isNew: true,
    note: 'Real new slug: live adapter + live forge (integrated 2026-11-16); registry row is the single registration, no ELIGIBLE edit.',
  }),
  '3sum-closest': Object.freeze({
    kind: 'explicit', mode: 'exact',
    signature: Object.freeze({ name: 'threeSumClosest', params: Object.freeze(['int[]', 'int']), return: 'int' }),
    walkthroughArgs: null, visual: '3sum-closest', isNew: true,
    note: 'Real new slug: live adapter + live forge + question-specific visual (integrated 2026-11-16); registry row is the single registration, no ELIGIBLE edit.',
  }),
  'find-first-and-last-position-of-element-in-sorted-array': Object.freeze({
    kind: 'explicit', mode: 'exact',
    signature: Object.freeze({ name: 'searchRange', params: Object.freeze(['int[]', 'int']), return: 'int[]' }),
    walkthroughArgs: null, visual: 'find-first-and-last-position-of-element-in-sorted-array', isNew: true,
    note: 'Real new slug: live adapter + live forge + question-specific visual (integrated 2026-11-16); registry row is the single registration, no ELIGIBLE edit.',
  }),
  'find-the-index-of-the-first-occurrence-in-a-string': Object.freeze({
    kind: 'explicit', mode: 'exact',
    signature: Object.freeze({ name: 'strStr', params: Object.freeze(['string', 'string']), return: 'int' }),
    walkthroughArgs: null, visual: 'find-the-index-of-the-first-occurrence-in-a-string', isNew: true,
    note: 'Real new slug: live adapter + live forge (integrated 2026-11-16); registry row is the single registration, no ELIGIBLE edit + question-specific visual.',
  }),
  'first-missing-positive': Object.freeze({
    kind: 'explicit', mode: 'exact',
    signature: Object.freeze({ name: 'firstMissingPositive', params: Object.freeze(['int[]']), return: 'int' }),
    walkthroughArgs: null, visual: 'first-missing-positive', isNew: true,
    note: 'Real new slug: live adapter + live forge + question-specific visual (integrated 2026-11-16); registry row is the single registration, no ELIGIBLE edit.',
  }),
  'remove-duplicates-from-sorted-array': Object.freeze({
    kind: 'explicit', mode: 'exact',
    signature: Object.freeze({ name: 'removeDuplicates', params: Object.freeze(['int[]']), return: 'int' }),
    walkthroughArgs: null, visual: 'remove-duplicates-from-sorted-array', isNew: true,
    note: 'Real new slug: live adapter + live forge + question-specific visual (integrated 2026-11-16); registry row is the single registration, no ELIGIBLE edit.',
  }),
  'substring-with-concatenation-of-all-words': Object.freeze({
    kind: 'explicit', mode: 'unordered',
    signature: Object.freeze({ name: 'findSubstring', params: Object.freeze(['string', 'string[]']), return: 'int[]' }),
    walkthroughArgs: null, visual: 'substring-with-concatenation-of-all-words', isNew: true,
    note: 'Real new slug: live adapter + live forge + question-specific visual (integrated 2026-11-16); registry row is the single registration, no ELIGIBLE edit.',
  }),
})

export function registrationFor(slug) {
  return PROBLEM_REGISTRY[String(slug)] || null
}

/** Single eligibility predicate. Replaces ELIGIBLE_PROBLEMS.has(slug) once migrated. */
export function isSupported(slug) {
  return registrationFor(slug) !== null
}

/** The ONE list. Live variants.js derives eligibility from this + legacy fallback. */
export function eligibleSlugs() {
  return Object.freeze(Object.keys(PROBLEM_REGISTRY))
}

export function judgeKind(judge) {
  if (judge?.ops === true && judge.transcripts > 0) return 'operations'
  const signature = judge?.signature
  if (!signature || !Array.isArray(signature.params) || !judge?.tests?.length) return null
  if (!signature.params.every((p) => TYPES.has(p.type))) return null
  if (signature.return === 'void') return judge.mutates?.length ? 'mutation' : null
  return TYPES.has(signature.return) ? 'return-value' : null
}

/** Traversal-family proof: all three slugs share ONE builder function. */
export function traversalFamilySharesBuilder() {
  const fns = Object.keys(traversalBuilders).map((slug) => traversalBuilders[slug])
  return fns.length === 3 && fns[0] === fns[1] && fns[1] === fns[2]
}
