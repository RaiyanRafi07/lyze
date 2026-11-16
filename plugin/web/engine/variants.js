/**
 * LeetCode Lab — variant forge.
 *
 * `buildVariants(problem)` turns one settled problem record into three practice variations
 * that reuse the original judge signature, so the same editor, the same method name and the
 * same parameter types compile unchanged:
 *
 *   v1  same pattern, fresh data      — reproduce the reasoning on new numbers
 *   v2  same pattern, hidden edge     — empty input, duplicates, negatives, ties, ...
 *   v3  same signature, a real twist  — values instead of indices, count instead of area,
 *                                       1-indexed answers, strict boundaries, circular input
 *
 * Every `expected` string is produced by a reference implementation in this file run on the
 * generated input, in exactly the literal shape the judge compares against (`[1,2]`, `true`,
 * `[[1,6]]`). Generation is seeded from the problem slug, so a slug always yields the same
 * three variants — no Math.random, no Date.
 *
 * Pure ES module: no DOM, no network, no dependencies. Any unsupported pattern, unsupported
 * signature shape or malformed record yields `[]`; nothing in here throws.
 */
import { parseExampleInput } from './parse.js'
import { buildValidPalindromeVariants } from './forge-valid-palindrome.js'
import { buildVariants as buildProductExceptSelfVariants } from './forge-product-except-self.js'
import { buildVariantsForRecord as buildLongestCommonSubsequenceVariants } from './forge-longest-common-subsequence.js'
import { buildVariants as buildFindMinimumVariants } from './forge-find-minimum-in-rotated-sorted-array.js'
import {
  buildVariantsTopKFrequent,
  explain as topKExplain,
  explainLines as topKExplainLines,
} from './forge-top-k-frequent-elements.js'
import { buildInvertVariants } from './forge-invert-binary-tree.js'
import { buildSameTreeVariants } from './forge-same-tree.js'
import { buildPractice as buildMaximumDepthPractice } from './forge-maximum-depth-of-binary-tree.js'
import { buildJumpGamePractice } from './forge-jump-game.js'
import { buildVariants as buildValidateBstVariants } from './forge-validate-binary-search-tree.js'
import { buildKthSmallestVariants } from './forge-kth-smallest-element-in-a-bst.js'
import { buildLevelOrderVariants } from './forge-binary-tree-level-order-traversal.js'
import { buildPalindromicPractice } from './forge-palindromic-substrings.js'
import { buildVariants as buildWordSearchVariants } from './forge-word-search.js'
import { buildForgeVariants as buildLongestReplacementVariants } from './forge-longest-repeating-character-replacement.js'
import { buildLongestConsecutiveDrills } from './forge-longest-consecutive-sequence.js'
import { buildSpiralPractice } from './forge-spiral-matrix.js'
import { buildSumVariants } from './forge-sum-of-two-integers.js'
import { buildMaximumSubarrayVariants } from './forge-maximum-subarray.js'
import { buildThreesumPractice } from './forge-3sum.js'
import { buildPracticeVariants as buildMergeVariants } from './forge-merge-two-sorted-lists.js'
import { buildCombinationSumVariants } from './forge-combination-sum.js'
import { buildUniquePathsVariants } from './forge-unique-paths.js'
import { buildPracticeVariants as buildCycleVariants } from './forge-linked-list-cycle.js'
import { buildPracticeVariants as buildLcaVariants } from './forge-lowest-common-ancestor-of-a-binary-search-tree.js'
import { buildReverseBitsPractice } from './forge-reverse-bits.js'
import { buildRotateImageDrills } from './forge-rotate-image.js'
import { buildPracticeVariants as buildWordSearchIIVariants } from './forge-word-search-ii.js'
import { buildPacificPractice } from './forge-pacific-atlantic-water-flow.js'
import { buildMergeKPractice } from './forge-merge-k-sorted-lists.js'
import { buildSerdePractice } from './forge-serialize-and-deserialize-binary-tree.js'
import { buildTriePractice } from './forge-implement-trie-prefix-tree.js'
import { buildWordDictPractice } from './forge-design-add-and-search-words-data-structure.js'
import { buildPermutationPractice as buildPermutationPractice__permutations } from './forge-permutations.js'
import { buildMedianStreamVariants } from './forge-find-median-from-data-stream.js'
import { buildWallsAndGatesVariants } from './forge-walls-and-gates.js'
import { buildValidParenthesisStringVariants } from './forge-valid-parenthesis-string.js'
import { buildTargetSumPractice } from './forge-target-sum.js'
import { buildSingleNumberPractice } from './forge-single-number.js'
import { buildSetMatrixZeroesVariants } from './forge-set-matrix-zeroes.js'
import { buildRegularExpressionMatchingPractice } from './forge-regular-expression-matching.js'
import { buildPowXnVariants } from './forge-powx-n.js'
import { buildPlusOneVariants } from './forge-plus-one.js'
import { buildPartitionLabelsPractice } from './forge-partition-labels.js'
import { buildConnectedComponentsVariants } from './forge-number-of-connected-components-in-an-undirected-graph.js'
import { buildNQueensDrills } from './forge-n-queens.js'
import { buildMultiplyStringsPractice } from './forge-multiply-strings.js'
import { buildMinIntervalPractice } from './forge-minimum-interval-to-include-each-query.js'
import { buildMergeTripletsVariants } from './forge-merge-triplets-to-form-target-triplet.js'
import { buildMeetingRoomsIiVariants } from './forge-meeting-rooms-ii.js'
import { buildMeetingRoomsVariants } from './forge-meeting-rooms.js'
import { buildEncodeAndDecodeStringsPractice } from './forge-encode-and-decode-strings.js'
import { buildLongestIncreasingPathPractice } from './forge-longest-increasing-path-in-a-matrix.js'
import { buildJumpGameIIVariants } from './forge-jump-game-ii.js'
import { buildInterleavingStringVariants } from './forge-interleaving-string.js'
import { buildHappyNumberVariants } from './forge-happy-number.js'
import { buildHandOfStraightsVariants } from './forge-hand-of-straights.js'
import { buildGraphValidTreeVariants } from './forge-graph-valid-tree.js'
import { buildEditDistanceVariants } from './forge-edit-distance.js'
import { buildDistinctSubsequencesVariants } from './forge-distinct-subsequences.js'
import { buildCloneGraphDrills } from './forge-clone-graph.js'
import { buildBurstBalloonsPractice } from './forge-burst-balloons.js'
import { buildAlienDictionaryPractice } from './forge-alien-dictionary.js'
import { buildWordLadderVariants } from './forge-word-ladder.js'
import { buildTwoSumIIPractice } from './forge-two-sum-ii-input-array-is-sorted.js'
import { buildSwimPractice } from './forge-swim-in-rising-water.js'
import { buildSurroundedVariants } from './forge-surrounded-regions.js'
import { buildSubsetsPractice } from './forge-subsets-ii.js'
import { buildSubsetsVariants } from './forge-subsets.js'
import { buildSlidingWindowPractice } from './forge-sliding-window-maximum.js'
import { buildRottingOrangesPractice } from './forge-rotting-oranges.js'
import { buildReverseIntegerVariants } from './forge-reverse-integer.js'
import { buildVariants as buildPalindromeNumberForge } from './forge-palindrome-number.js'
import { buildRomanToIntegerVariants } from './forge-roman-to-integer.js'
import { buildLongestCommonPrefixVariants } from './forge-longest-common-prefix.js'
import { buildVariants as buildLongestValidParenthesesForge } from './forge-longest-valid-parentheses.js'
import { buildVariants as buildSwapNodesInPairsForge } from './forge-swap-nodes-in-pairs.js'
import { buildVariants as build3sumClosestForge } from './forge-3sum-closest.js'
import { buildVariants as buildRange34Forge } from './forge-find-first-and-last-position-of-element-in-sorted-array.js'
import { buildVariants as buildStrStrForge } from './forge-find-the-index-of-the-first-occurrence-in-a-string.js'
import { buildVariants as buildFirstMissingPositiveForge } from './forge-first-missing-positive.js'
import { buildVariants as buildRemoveDuplicatesForge } from './forge-remove-duplicates-from-sorted-array.js'
import { buildVariants as buildSubstringConcatForge } from './forge-substring-with-concatenation-of-all-words.js'
import { buildReorderPractice } from './forge-reorder-list.js'
import { buildRedundantConnectionVariants } from './forge-redundant-connection.js'
import { buildReconstructItineraryPractice } from './forge-reconstruct-itinerary.js'
import { buildPermutationPractice as buildPermutationsPractice } from './forge-permutations.js'
import { buildPartitionPractice } from './forge-partition-equal-subset-sum.js'
import { buildPalindromePartitioningPractice } from './forge-palindrome-partitioning.js'
import { buildNetworkDelayPractice } from './forge-network-delay-time.js'
import { buildNQueensVariants } from './forge-n-queens.js'
import { buildMinCostPractice } from './forge-min-cost-to-connect-all-points.js'
import { buildMinCostClimbingStairsPractice } from './forge-min-cost-climbing-stairs.js'
import { buildLruCacheDrills } from './forge-lru-cache.js'
import { buildLetterCombinationsPractice } from './forge-letter-combinations-of-a-phone-number.js'
import { buildKthLargestPractice } from './forge-kth-largest-element-in-an-array.js'
import { buildKokoPractice } from './forge-koko-eating-bananas.js'
import { buildGasStationVariants } from './forge-gas-station.js'
import { buildFindDuplicateDrills } from './forge-find-the-duplicate-number.js'
import { buildDiameterVariants } from './forge-diameter-of-binary-tree.js'
import { buildDetectSquaresVariants } from './forge-detect-squares.js'
import { buildDesignTwitterVariants } from './forge-design-twitter.js'
import { buildDailyTemperaturesVariants } from './forge-daily-temperatures.js'
import { buildCourseScheduleIIVariants } from './forge-course-schedule-ii.js'
import { buildCombinationSumIIPractice } from './forge-combination-sum-ii.js'
import { buildCoinChangeIIVariants } from './forge-coin-change-ii.js'
import { buildCloneGraphVariants } from './forge-clone-graph.js'
import { buildCheapestFlightsPractice } from './forge-cheapest-flights-within-k-stops.js'
import { buildCooldownVariants } from './forge-best-time-to-buy-and-sell-stock-with-cooldown.js'
import { buildBalancedVariants } from './forge-balanced-binary-tree.js'
import { buildValidSudokuDrills } from './forge-valid-sudoku.js'
import { buildTimeMapPractice } from './forge-time-based-key-value-store.js'
import { buildTaskSchedulerVariants } from './forge-task-scheduler.js'
import { buildSearchMatrixPractice } from './forge-search-a-2d-matrix.js'
import { buildReverseKGroupVariants } from './forge-reverse-nodes-in-k-group.js'
import { buildMedianSortedArraysPractice } from './forge-median-of-two-sorted-arrays.js'
import { buildLruCacheVariants } from './forge-lru-cache.js'
import { buildLastStoneWeightPractice } from './forge-last-stone-weight.js'
import { buildKthStreamPractice } from './forge-kth-largest-element-in-a-stream.js'
import { buildKClosestPractice } from './forge-k-closest-points-to-origin.js'
import { buildFindDuplicateVariants } from './forge-find-the-duplicate-number.js'
import { buildCountGoodNodesPractice } from './forge-count-good-nodes-in-binary-tree.js'
import { buildCopyRandomVariants } from './forge-copy-list-with-random-pointer.js'
import { buildBinaryTreeRightSideViewPractice } from './forge-binary-tree-right-side-view.js'
import { buildAddTwoNumbersPractice } from './forge-add-two-numbers.js'
import { buildValidSudokuVariants } from './forge-valid-sudoku.js'
import { buildTrappingRainWaterPractice } from './forge-trapping-rain-water.js'
import { buildPermutationPractice } from './forge-permutation-in-string.js'
import { buildMinStackPractice } from './forge-min-stack.js'
import { buildLargestRectanglePractice } from './forge-largest-rectangle-in-histogram.js'
import { buildGenerateParenthesisVariants } from './forge-generate-parentheses.js'
import { buildEvaluateReversePolishNotationPractice } from './forge-evaluate-reverse-polish-notation.js'
import { buildCarFleetVariants } from './forge-car-fleet.js'
import { traversalBuilders } from './forge-tree-traversal.js'
import { registrationFor } from './problem-registration.js'

// Each family registers exact slugs in one place. The family builder validates
// the live judge shape before returning its three drills.
const FAMILY_BUILDERS = Object.freeze({ ...traversalBuilders })

/* --------------------------------------- explicit per-slug builders (ready5) -- */

/**
 * Standalone staged forge modules live in per-slug files (not the giant
 * pattern registry) so one slug's builder never disturbs another pattern.
 * Checked before the BUILDERS[patternOf(problem)] lookup: an explicit hit
 * returning exactly 3 variants wins; anything else falls through.
 */
const SLUG_BUILDERS = {
  'valid-palindrome': (problem) => buildValidPalindromeVariants(problem),
  'product-of-array-except-self': (problem, options) => buildProductExceptSelfVariants(problem, options),
  'longest-common-subsequence': (problem) => buildLongestCommonSubsequenceVariants(problem),
  'find-minimum-in-rotated-sorted-array': (problem) => buildFindMinimumVariants(problem),
  'top-k-frequent-elements': (problem) => buildVariantsTopKFrequent(problem),
  'invert-binary-tree': (problem) => buildInvertVariantsFor(problem),
  'same-tree': (problem) => buildSameTreeVariantsFor(problem),
  'maximum-depth-of-binary-tree': (problem) => buildMaximumDepthVariants(problem),
  'jump-game': (problem) => buildJumpGameVariantsFor(problem),
  'validate-binary-search-tree': (problem) => buildValidateBstVariantsFor(problem),
  'kth-smallest-element-in-a-bst': (problem) => buildKthSmallestVariantsFor(problem),
  'binary-tree-level-order-traversal': (problem) => buildLevelOrderVariants(problem),
  'palindromic-substrings': (problem) => buildPalindromicVariantsFor(problem),
  'word-search': (problem) => buildWordSearchVariants(problem),
  'longest-repeating-character-replacement': (problem) => buildLongestReplacementVariants(problem),
  'longest-consecutive-sequence': (problem) => buildLongestConsecutiveVariantsFor(problem),
  'spiral-matrix': (problem) => buildSpiralVariantsFor(problem),
  'sum-of-two-integers': (problem) => buildSumVariantsFor(problem),
  'maximum-subarray': (problem, options) => buildMaximumSubarrayVariants(problem, options),
  '3sum': (problem) => buildThreesumVariantsFor(problem),
  'merge-two-sorted-lists': (problem) => buildMergeVariants(problem),
  'combination-sum': (problem) => buildCombinationVariantsFor(problem),
  'unique-paths': (problem) => buildUniquePathsVariantsFor(problem),
  'linked-list-cycle': (problem) => buildCycleVariantsFor(problem),
  'lowest-common-ancestor-of-a-binary-search-tree': (problem) => buildLcaVariantsFor(problem),
  'reverse-bits': (problem) => buildReverseBitsVariantsFor(problem),
  'rotate-image': (problem) => buildRotateImageVariantsFor(problem),
  'word-search-ii': (problem) => buildWordSearchIIVariantsFor(problem),
  'pacific-atlantic-water-flow': (problem) => buildPacificVariantsFor(problem),
  'merge-k-sorted-lists': (problem) => buildMergeKVariantsFor(problem),
  'serialize-and-deserialize-binary-tree': (problem) => buildSerdeVariantsFor(problem),
  'implement-trie-prefix-tree': (problem) => buildTrieVariantsFor(problem),
  'design-add-and-search-words-data-structure': (problem) => buildWordDictVariantsFor(problem),
  'find-median-from-data-stream': (problem) => buildFindMedianFromDataStreamVariantsFor(problem),
  'walls-and-gates': (problem) => buildWallsAndGatesVariantsFor(problem),
  'valid-parenthesis-string': (problem) => buildValidParenthesisStringVariantsFor(problem),
  'target-sum': (problem) => buildTargetSumVariantsFor(problem),
  'single-number': (problem) => buildSingleNumberVariantsFor(problem),
  'set-matrix-zeroes': (problem) => buildSetMatrixZeroesVariantsFor(problem),
  'regular-expression-matching': (problem) => buildRegularExpressionMatchingVariantsFor(problem),
  'powx-n': (problem) => buildPowxNVariantsFor(problem),
  'plus-one': (problem) => buildPlusOneVariantsFor(problem),
  'partition-labels': (problem) => buildPartitionLabelsVariantsFor(problem),
  'number-of-connected-components-in-an-undirected-graph': (problem) => buildNumberOfConnectedComponentsInAnUndirectedGraphVariantsFor(problem),
  'multiply-strings': (problem) => buildMultiplyStringsVariantsFor(problem),
  'minimum-interval-to-include-each-query': (problem) => buildMinimumIntervalToIncludeEachQueryVariantsFor(problem),
  'merge-triplets-to-form-target-triplet': (problem) => buildMergeTripletsToFormTargetTripletVariantsFor(problem),
  'meeting-rooms-ii': (problem) => buildMeetingRoomsIiVariantsFor(problem),
  'encode-and-decode-strings': (problem) => buildEncodeAndDecodeStringsVariantsFor(problem),
  'meeting-rooms': (problem) => buildMeetingRoomsVariantsFor(problem),
  'longest-increasing-path-in-a-matrix': (problem) => buildLongestIncreasingPathInAMatrixVariantsFor(problem),
  'jump-game-ii': (problem) => buildJumpGameIiVariantsFor(problem),
  'interleaving-string': (problem) => buildInterleavingStringVariantsFor(problem),
  'happy-number': (problem) => buildHappyNumberVariantsFor(problem),
  'hand-of-straights': (problem) => buildHandOfStraightsVariantsFor(problem),
  'graph-valid-tree': (problem) => buildGraphValidTreeVariantsFor(problem),
  'edit-distance': (problem) => buildEditDistanceVariantsFor(problem),
  'distinct-subsequences': (problem) => buildDistinctSubsequencesVariantsFor(problem),
  'burst-balloons': (problem) => buildBurstBalloonsVariantsFor(problem),
  'alien-dictionary': (problem) => buildAlienDictionaryVariantsFor(problem),
  'word-ladder': (problem) => buildWordLadderVariantsFor(problem),
  'two-sum-ii-input-array-is-sorted': (problem) => buildTwoSumIiInputArrayIsSortedVariantsFor(problem),
  'swim-in-rising-water': (problem) => buildSwimInRisingWaterVariantsFor(problem),
  'surrounded-regions': (problem) => buildSurroundedRegionsVariantsFor(problem),
  'subsets-ii': (problem) => buildSubsetsIiVariantsFor(problem),
  'subsets': (problem) => buildSubsetsVariantsFor(problem),
  'sliding-window-maximum': (problem) => buildSlidingWindowMaximumVariantsFor(problem),
  'rotting-oranges': (problem) => buildRottingOrangesVariantsFor(problem),
  'reverse-integer': (problem) => buildReverseIntegerVariantsFor(problem),
  'palindrome-number': (problem) => buildPalindromeNumberForge(problem),
  'roman-to-integer': (problem) => buildRomanToIntegerVariantsFor(problem),
  'longest-common-prefix': (problem) => buildLongestCommonPrefixVariants(problem),
  'longest-valid-parentheses': (problem) => buildLongestValidParenthesesForge(problem),
  'swap-nodes-in-pairs': (problem) => buildSwapNodesInPairsForge(problem),
  '3sum-closest': (problem) => build3sumClosestForge(problem),
  'find-first-and-last-position-of-element-in-sorted-array': (problem) => buildRange34Forge(problem),
  'find-the-index-of-the-first-occurrence-in-a-string': (problem) => buildStrStrForge(problem),
  'first-missing-positive': (problem) => buildFirstMissingPositiveForge(problem),
  'remove-duplicates-from-sorted-array': (problem) => buildRemoveDuplicatesForge(problem),
  'substring-with-concatenation-of-all-words': (problem) => buildSubstringConcatForge(problem),
  'reorder-list': (problem) => buildReorderListVariantsFor(problem),
  'redundant-connection': (problem) => buildRedundantConnectionVariantsFor(problem),
  'reconstruct-itinerary': (problem) => buildReconstructItineraryVariantsFor(problem),
  'permutations': (problem) => buildPermutationsVariantsFor(problem),
  'partition-equal-subset-sum': (problem) => buildPartitionEqualSubsetSumVariantsFor(problem),
  'palindrome-partitioning': (problem) => buildPalindromePartitioningVariantsFor(problem),
  'network-delay-time': (problem) => buildNetworkDelayTimeVariantsFor(problem),
  'n-queens': (problem) => buildNQueensVariantsFor(problem),
  'min-cost-to-connect-all-points': (problem) => buildMinCostToConnectAllPointsVariantsFor(problem),
  'min-cost-climbing-stairs': (problem) => buildMinCostClimbingStairsVariantsFor(problem),
  'letter-combinations-of-a-phone-number': (problem) => buildLetterCombinationsOfAPhoneNumberVariantsFor(problem),
  'kth-largest-element-in-an-array': (problem) => buildKthLargestElementInAnArrayVariantsFor(problem),
  'koko-eating-bananas': (problem) => buildKokoEatingBananasVariantsFor(problem),
  'gas-station': (problem) => buildGasStationVariantsFor(problem),
  'diameter-of-binary-tree': (problem) => buildDiameterOfBinaryTreeVariantsFor(problem),
  'detect-squares': (problem) => buildDetectSquaresVariantsFor(problem),
  'design-twitter': (problem) => buildDesignTwitterVariantsFor(problem),
  'daily-temperatures': (problem) => buildDailyTemperaturesVariantsFor(problem),
  'course-schedule-ii': (problem) => buildCourseScheduleIiVariantsFor(problem),
  'combination-sum-ii': (problem) => buildCombinationSumIiVariantsFor(problem),
  'coin-change-ii': (problem) => buildCoinChangeIiVariantsFor(problem),
  'clone-graph': (problem) => buildCloneGraphVariantsFor(problem),
  'cheapest-flights-within-k-stops': (problem) => buildCheapestFlightsWithinKStopsVariantsFor(problem),
  'best-time-to-buy-and-sell-stock-with-cooldown': (problem) => buildBestTimeToBuyAndSellStockWithCooldownVariantsFor(problem),
  'balanced-binary-tree': (problem) => buildBalancedBinaryTreeVariantsFor(problem),
  'time-based-key-value-store': (problem) => buildTimeBasedKeyValueStoreVariantsFor(problem),
  'task-scheduler': (problem) => buildTaskSchedulerVariantsFor(problem),
  'search-a-2d-matrix': (problem) => buildSearchA2dMatrixVariantsFor(problem),
  'reverse-nodes-in-k-group': (problem) => buildReverseNodesInKGroupVariantsFor(problem),
  'median-of-two-sorted-arrays': (problem) => buildMedianOfTwoSortedArraysVariantsFor(problem),
  'lru-cache': (problem) => buildLruCacheVariantsFor(problem),
  'last-stone-weight': (problem) => buildLastStoneWeightVariantsFor(problem),
  'kth-largest-element-in-a-stream': (problem) => buildKthLargestElementInAStreamVariantsFor(problem),
  'k-closest-points-to-origin': (problem) => buildKClosestPointsToOriginVariantsFor(problem),
  'find-the-duplicate-number': (problem) => buildFindTheDuplicateNumberVariantsFor(problem),
  'count-good-nodes-in-binary-tree': (problem) => buildCountGoodNodesInBinaryTreeVariantsFor(problem),
  'copy-list-with-random-pointer': (problem) => buildCopyListWithRandomPointerVariantsFor(problem),
  'binary-tree-right-side-view': (problem) => buildBinaryTreeRightSideViewVariantsFor(problem),
  'add-two-numbers': (problem) => buildAddTwoNumbersVariantsFor(problem),
  'valid-sudoku': (problem) => buildValidSudokuVariantsFor(problem),
  'trapping-rain-water': (problem) => buildTrappingRainWaterVariantsFor(problem),
  'permutation-in-string': (problem) => buildPermutationInStringVariantsFor(problem),
  'min-stack': (problem) => buildMinStackVariantsFor(problem),
  'largest-rectangle-in-histogram': (problem) => buildLargestRectangleInHistogramVariantsFor(problem),
  'generate-parentheses': (problem) => buildGenerateParenthesesVariantsFor(problem),
  'evaluate-reverse-polish-notation': (problem) => buildEvaluateReversePolishNotationVariantsFor(problem),
  'car-fleet': (problem) => buildCarFleetVariantsFor(problem),
  'search-insert-position': (problem) => buildSearchInsertPositionVariantsFor(problem),
}

/* ------------------------- staged-standalone shape adapters (practice5) -------- */
/*
 * Three staged tree practice modules expose record-agnostic builders
 * (no `problem` parameter, forge-adjacent variant shapes). These thin
 * coordinator-owned adapters validate the live record, then reshape the
 * staged output into the exact forge variant contract (v1/v2/v3 ids,
 * seedLabel, difficulty, examples, live-cloned signature). No oracle, test,
 * or prose logic lives here; all of that stays byte-identical in the staged
 * forge files.
 */
function buildInvertVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'invert-binary-tree') return []
    if (!signatureOf(problem)) return []
    const variants = buildInvertVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}

function buildSameTreeVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'same-tree') return []
    if (!signatureOf(problem)) return []
    const variants = buildSameTreeVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}

function buildMaximumDepthVariants(problem) {
  try {
    if (!problem || problem.slug !== 'maximum-depth-of-binary-tree') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'maxDepth' || signature.return !== 'int') return []
    const staged = buildMaximumDepthPractice()
    if (!Array.isArray(staged) || staged.length !== 3) return []
    const difficulty = problem.difficulty === 'Easy' || problem.difficulty === 'Medium' || problem.difficulty === 'Hard'
      ? problem.difficulty
      : 'Easy'
    const intents = [
      'Same pattern, different numbers so you reproduce the reasoning.',
      'Same pattern with the edge case the original hides.',
      'Same task with adversarial placements that punish one-side shortcuts.',
    ]
    const seedLabels = ['fresh trees', 'edge cases', 'adversarial shapes']
    return staged.map((entry, index) => {
      const tests = (entry.tests || []).slice(0, 5).map((t) => ({
        args: (t.args || []).map(String),
        expected: String(t.expected),
      }))
      if (tests.length < 3) return null
      const first = tests[0]
      return {
        id: ['v1', 'v2', 'v3'][index],
        seedLabel: seedLabels[index],
        intent: intents[index],
        difficulty,
        title: `Maximum Depth of Binary Tree — ${entry.title || 'drill'} (depth drill)`,
        statement: String(entry.statement || ''),
        signature: {
          name: signature.name,
          params: signature.params.map((p) => ({ name: p.name, type: p.type })),
          return: signature.return,
        },
        examples: [{
          input: signature.params.map((p, i) => `${p.name} = ${first.args[i]}`).join(', '),
          output: first.expected,
          explain: '',
        }],
        tests,
        mode: 'exact',
        hints: (entry.hints || []).slice(0, 2),
      }
    }).filter(Boolean)
  } catch {
    return []
  }
}

/* ----------------- staged-standalone validators (practice4 Blind75) --------- */
/*
 * jump-game, validate-binary-search-tree and kth-smallest-element-in-a-bst
 * expose record-agnostic builders (no `problem` parameter) whose staged
 * output already matches the exact forge variant contract (audited:
 * v1/v2/v3 ids, seedLabel, intent, difficulty, live-matching signature,
 * examples == tests[0], exact mode, 2 hints). These thin coordinator-owned
 * validators check the live record + signature, then return the staged
 * output directly. No oracle, test, or prose logic lives here.
 * binary-tree-level-order-traversal takes the record itself and is already
 * record-validating, so it is wired directly in SLUG_BUILDERS.
 */
function buildJumpGameVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'jump-game') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'canJump' || signature.return !== 'boolean') return []
    const variants = buildJumpGamePractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}

function buildValidateBstVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'validate-binary-search-tree') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'isValidBST' || signature.return !== 'boolean') return []
    const variants = buildValidateBstVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}

function buildKthSmallestVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'kth-smallest-element-in-a-bst') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'kthSmallest' || signature.return !== 'int') return []
    const variants = buildKthSmallestVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}

function buildPalindromicVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'palindromic-substrings') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'countSubstrings' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    if (signature.params[0].type !== 'string') return []
    const variants = buildPalindromicPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}

/* ----------------- staged-standalone validator (Blind75 longest-consecutive) -- */
/*
 * forge-longest-consecutive-sequence.js exposes a (problem, signature, rng)
 * builder whose output already matches the exact forge variant contract
 * (audited: v1/v2/v3 ids, seedLabel, intent, difficulty, live-cloned
 * signature, examples == tests[0], exact mode, 2 hints; v3 is an explicit
 * same-signature twist that counts maximal groups). This thin
 * coordinator-owned wrapper validates the live record + signature, then
 * returns the staged output directly. No oracle, test, or prose logic here.
 */
function buildLongestConsecutiveVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'longest-consecutive-sequence') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'longestConsecutive' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    if (signature.params[0].type !== 'int[]') return []
    const rng = mulberry32(hashText('longest-consecutive-sequence'))
    const variants = buildLongestConsecutiveDrills(problem, signature, rng)
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}

/* ----------------- staged-standalone validator (spiral-matrix) ---------------- */
/*
 * forge-spiral-matrix.js exposes a record-agnostic builder whose output
 * already matches the exact forge variant contract (audited: v1/v2/v3 ids,
 * seedLabel, intent, difficulty, signature, examples == tests[0], exact
 * mode, 2 hints; all rows/statements/hints verified identical to the staged
 * practice module, oracle cross-checked). This thin coordinator-owned wrapper
 * validates the live record + signature, then returns the staged output
 * directly. No oracle, test, or prose logic here.
 */
function buildSpiralVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'spiral-matrix') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'spiralOrder' || signature.return !== 'int[]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    if (signature.params[0].type !== 'int[][]') return []
    const variants = buildSpiralPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}

/* ----------------- staged-standalone validator (sum-of-two-integers) -------- */
/*
 * forge-sum-of-two-integers.js exposes a record-agnostic builder whose output
 * already matches the exact forge variant contract (audited: v1/v2/v3 ids,
 * seedLabel, intent, difficulty, signature, examples == tests[0], exact
 * mode, 2 hints; rows/expected verified identical to the staged practice
 * module, oracle cross-checked). This thin coordinator-owned wrapper validates
 * the live record + signature, then returns the staged output directly.
 * No oracle, test, or prose logic here.
 */
function buildSumVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'sum-of-two-integers') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'getSum' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
    if (signature.params[0].type !== 'int' || signature.params[1].type !== 'int') return []
    const variants = buildSumVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}

/* ----------------- staged-standalone validator (3sum) ----------------------- */
/*
 * forge-3sum.js exposes a record-agnostic builder whose output already matches
 * the exact forge variant contract (audited: v1/v2/v3 ids, seedLabel, intent,
 * difficulty, signature, examples == tests[0], unordered mode, 2 hints; all
 * rows/statements/hints verified identical to the staged practice module,
 * oracle cross-checked). This thin coordinator-owned wrapper validates the
 * live record + signature, then returns the staged output directly.
 * No oracle, test, or prose logic here.
 */
function buildThreesumVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== '3sum') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'threeSum' || signature.return !== 'int[][]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    if (signature.params[0].type !== 'int[]') return []
    const variants = buildThreesumPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}

/* ------------- staged-standalone validators (batch 7: merge/combo/unique) -- */
/*
 * forge-merge-two-sorted-lists.js exposes a record-validating builder
 * (slug + signature shape checked inside; seeded deterministic); it is wired
 * directly. forge-combination-sum.js and forge-unique-paths.js expose
 * (problem, signature, rng) builders; these thin wrappers validate the live
 * record + signature, then return the staged output directly. No oracle,
 * test, or prose logic lives here.
 */
function buildCombinationVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'combination-sum') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'combinationSum' || signature.return !== 'int[][]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
    if (signature.params[0].type !== 'int[]' || signature.params[1].type !== 'int') return []
    const rng = mulberry32(hashText('combination-sum'))
    const variants = buildCombinationSumVariants(problem, signature, rng)
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}
function buildUniquePathsVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'unique-paths') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'uniquePaths' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
    if (signature.params[0].type !== 'int' || signature.params[1].type !== 'int') return []
    const rng = mulberry32(hashText('unique-paths'))
    const variants = buildUniquePathsVariants(problem, signature, rng)
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}

/* ------------- staged-standalone validators (batch 8: cycle + LCA practice) --- */
/*
 * forge-linked-list-cycle.js and forge-lowest-...-tree.js expose record-agnostic
 * builders whose output already matches the exact forge variant contract
 * (audited: v1/v2/v3 ids, seedLabel, intent, difficulty, signature, examples,
 * exact mode, 2 hints; cycle uses an explicitly labeled int[]+pos test profile
 * since ListNode wiring cannot be spelled as judge literals; LCA uses an
 * honest value projection). These thin validators check the slug and return
 * the staged output directly. No oracle, test, or prose logic here.
 */
function buildCycleVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'linked-list-cycle') return []
    const variants = buildCycleVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}
function buildLcaVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'lowest-common-ancestor-of-a-binary-search-tree') return []
    const variants = buildLcaVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}

/* ------------- staged-standalone validators (batch 10: reverse/rotate) ---- */
/*
 * forge-reverse-bits.js exposes a record-agnostic builder whose output matches
 * the exact forge variant contract (audited: v1/v2/v3 ids, seedLabel, intent,
 * difficulty, signature, examples, exact mode, 2 hints; oracle cross-checked).
 * forge-rotate-image.js exposes a record-validating builder (slug + signature
 * shape checked inside; void in-place profile honestly labeled). These thin
 * wrappers check the slug and return the staged output directly.
 */
function buildReverseBitsVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'reverse-bits') return []
    const variants = buildReverseBitsPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}
function buildRotateImageVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'rotate-image') return []
    const variants = buildRotateImageDrills(problem)
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}
function buildWordSearchIIVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'word-search-ii') return []
    const variants = buildWordSearchIIVariants(problem)
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}

/* ------------- staged-standalone validator (batch 12 pacific) ------------- */
/*
 * forge-pacific-atlantic-water-flow.js exposes a record-agnostic builder whose
 * output already matches the exact forge variant contract (audited: v1/v2/v3
 * ids, seedLabel, intent, difficulty, signature pacificAtlantic(int[][])->int[][],
 * examples == tests[0], unordered mode, 2 hints; oracle cross-checked against
 * the staged adapter oracle). This thin coordinator-owned wrapper validates
 * the live record + signature, then returns the staged output directly.
 */
function buildPacificVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'pacific-atlantic-water-flow') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'pacificAtlantic' || signature.return !== 'int[][]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    if (signature.params[0].type !== 'int[][]') return []
    const variants = buildPacificPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}

/* ------------- staged-standalone validator (batch 12 merge-k) -------------- */
/*
 * forge-merge-k-sorted-lists.js exposes a record-agnostic builder whose output
 * already matches the exact forge variant contract (audited: v1/v2/v3 ids,
 * seedLabel, intent, difficulty, test-profile signature mergeKLists(int[][])->int[],
 * examples == tests[0], exact mode, 2 hints; oracle is flatten+sort, distinct
 * from the walkthrough heap). The live record is judge:null (no ListNode[]
 * host type); this wrapper validates the slug only and returns staged output.
 */
function buildMergeKVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'merge-k-sorted-lists') return []
    const variants = buildMergeKPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}

/* ------------- staged-standalone validator (batch 12 serde) ---------------- */
/*
 * forge-serialize-and-deserialize-binary-tree.js exposes a record-agnostic
 * builder whose output already matches the exact forge variant contract
 * (audited: v1/v2/v3 ids, seedLabel, intent, difficulty, test-profile
 * signature Codec.roundtrip(TreeNode)->TreeNode, examples == tests[0], exact
 * mode, 2 hints; BFS-codec oracle, distinct from the preorder walkthrough).
 * The live record is judge:null (design/class problem); this wrapper validates
 * the slug only and returns staged output.
 */
function buildSerdeVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'serialize-and-deserialize-binary-tree') return []
    const variants = buildSerdePractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}

/* ------------- staged-standalone validator (batch 12 trie) ----------------- */
/*
 * forge-implement-trie-prefix-tree.js exposes a record-agnostic builder whose
 * output already matches the exact forge variant contract (audited: v1/v2/v3
 * ids, seedLabel, intent, difficulty, test-profile signature
 * runTrieOps(string[],string[])->string, examples == tests[0], exact mode,
 * 2 hints; set/scan oracle, distinct from any trie structure). The live
 * record is judge:null (operations design problem); this wrapper validates
 * the slug only and returns staged output.
 */
function buildTrieVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'implement-trie-prefix-tree') return []
    const variants = buildTriePractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildCarFleetVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'car-fleet') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'carFleet' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 3) return []
    const variants = buildCarFleetVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildEvaluateReversePolishNotationVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'evaluate-reverse-polish-notation') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'evalRPN' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildEvaluateReversePolishNotationPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildGenerateParenthesesVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'generate-parentheses') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'generateParenthesis' || signature.return !== 'string[]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildGenerateParenthesisVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildLargestRectangleInHistogramVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'largest-rectangle-in-histogram') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'largestRectangleArea' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildLargestRectanglePractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildMinStackVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'min-stack') return []
    void signatureOf
    const variants = buildMinStackPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildPermutationInStringVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'permutation-in-string') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'checkInclusion' || signature.return !== 'boolean') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
    const variants = buildPermutationPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildTrappingRainWaterVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'trapping-rain-water') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'trap' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildTrappingRainWaterPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildValidSudokuVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'valid-sudoku') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'isValidSudoku' || signature.return !== 'boolean') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildValidSudokuVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildAddTwoNumbersVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'add-two-numbers') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'addTwoNumbers' || signature.return !== 'ListNode') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
    const variants = buildAddTwoNumbersPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildBinaryTreeRightSideViewVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'binary-tree-right-side-view') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'rightSideView' || signature.return !== 'int[]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildBinaryTreeRightSideViewPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildCopyListWithRandomPointerVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'copy-list-with-random-pointer') return []
    void signatureOf
    const variants = buildCopyRandomVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildCountGoodNodesInBinaryTreeVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'count-good-nodes-in-binary-tree') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'goodNodes' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildCountGoodNodesPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildFindTheDuplicateNumberVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'find-the-duplicate-number') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'findDuplicate' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildFindDuplicateVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildKClosestPointsToOriginVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'k-closest-points-to-origin') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'kClosest' || signature.return !== 'int[][]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
    const variants = buildKClosestPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildKthLargestElementInAStreamVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'kth-largest-element-in-a-stream') return []
    void signatureOf
    const variants = buildKthStreamPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildLastStoneWeightVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'last-stone-weight') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'lastStoneWeight' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildLastStoneWeightPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildLruCacheVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'lru-cache') return []
    void signatureOf
    const variants = buildLruCacheVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildMedianOfTwoSortedArraysVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'median-of-two-sorted-arrays') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'findMedianSortedArrays' || signature.return !== 'double') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
    const variants = buildMedianSortedArraysPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildReverseNodesInKGroupVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'reverse-nodes-in-k-group') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'reverseKGroup' || signature.return !== 'ListNode') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
    const variants = buildReverseKGroupVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildSearchA2dMatrixVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'search-a-2d-matrix') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'searchMatrix' || signature.return !== 'boolean') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
    const variants = buildSearchMatrixPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildTaskSchedulerVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'task-scheduler') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'leastInterval' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
    const variants = buildTaskSchedulerVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildTimeBasedKeyValueStoreVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'time-based-key-value-store') return []
    void signatureOf
    const variants = buildTimeMapPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildBalancedBinaryTreeVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'balanced-binary-tree') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'isBalanced' || signature.return !== 'boolean') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildBalancedVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildBestTimeToBuyAndSellStockWithCooldownVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'best-time-to-buy-and-sell-stock-with-cooldown') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'maxProfit' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildCooldownVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildCheapestFlightsWithinKStopsVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'cheapest-flights-within-k-stops') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'findCheapestPrice' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 5) return []
    const variants = buildCheapestFlightsPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildCloneGraphVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'clone-graph') return []
    void signatureOf
    const variants = buildCloneGraphVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildCoinChangeIiVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'coin-change-ii') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'change' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
    const variants = buildCoinChangeIIVariants(problem, signature)
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildCombinationSumIiVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'combination-sum-ii') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'combinationSum2' || signature.return !== 'int[][]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
    const variants = buildCombinationSumIIPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildCourseScheduleIiVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'course-schedule-ii') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'findOrder' || signature.return !== 'int[]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
    const variants = buildCourseScheduleIIVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildDailyTemperaturesVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'daily-temperatures') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'dailyTemperatures' || signature.return !== 'int[]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildDailyTemperaturesVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildDesignTwitterVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'design-twitter') return []
    void signatureOf
    const variants = buildDesignTwitterVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildDetectSquaresVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'detect-squares') return []
    void signatureOf
    const variants = buildDetectSquaresVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildDiameterOfBinaryTreeVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'diameter-of-binary-tree') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'diameterOfBinaryTree' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildDiameterVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildGasStationVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'gas-station') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'canCompleteCircuit' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
    const variants = buildGasStationVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildKokoEatingBananasVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'koko-eating-bananas') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'minEatingSpeed' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
    const variants = buildKokoPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildKthLargestElementInAnArrayVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'kth-largest-element-in-an-array') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'findKthLargest' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
    const variants = buildKthLargestPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildLetterCombinationsOfAPhoneNumberVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'letter-combinations-of-a-phone-number') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'letterCombinations' || signature.return !== 'string[]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildLetterCombinationsPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildMinCostClimbingStairsVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'min-cost-climbing-stairs') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'minCostClimbingStairs' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildMinCostClimbingStairsPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildMinCostToConnectAllPointsVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'min-cost-to-connect-all-points') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'minCostConnectPoints' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildMinCostPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildNQueensVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'n-queens') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'solveNQueens' || signature.return !== 'string[][]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildNQueensVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildNetworkDelayTimeVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'network-delay-time') return []
    void signatureOf
    const variants = buildNetworkDelayPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildPalindromePartitioningVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'palindrome-partitioning') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'partition' || signature.return !== 'string[][]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildPalindromePartitioningPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildPartitionEqualSubsetSumVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'partition-equal-subset-sum') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'canPartition' || signature.return !== 'boolean') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildPartitionPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildPermutationsVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'permutations') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'permute' || signature.return !== 'int[][]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildPermutationsPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildReconstructItineraryVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'reconstruct-itinerary') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'findItinerary' || signature.return !== 'string[]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildReconstructItineraryPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildRedundantConnectionVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'redundant-connection') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'findRedundantConnection' || signature.return !== 'int[]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildRedundantConnectionVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildReorderListVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'reorder-list') return []
    void signatureOf
    const variants = buildReorderPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildReverseIntegerVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'reverse-integer') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'reverse' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildReverseIntegerVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildRomanToIntegerVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'roman-to-integer') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'romanToInt' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    if (signature.params[0].type !== 'string') return []
    const variants = buildRomanToIntegerVariants(problem)
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildRottingOrangesVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'rotting-oranges') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'orangesRotting' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildRottingOrangesPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildSlidingWindowMaximumVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'sliding-window-maximum') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'maxSlidingWindow' || signature.return !== 'int[]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
    const variants = buildSlidingWindowPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildSubsetsVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'subsets') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'subsets' || signature.return !== 'int[][]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildSubsetsVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildSubsetsIiVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'subsets-ii') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'subsetsWithDup' || signature.return !== 'int[][]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildSubsetsPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildSurroundedRegionsVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'surrounded-regions') return []
    void signatureOf
    const variants = buildSurroundedVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildSwimInRisingWaterVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'swim-in-rising-water') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'swimInWater' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []
    const variants = buildSwimPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildTwoSumIiInputArrayIsSortedVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'two-sum-ii-input-array-is-sorted') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'twoSum' || signature.return !== 'int[]') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
    const variants = buildTwoSumIIPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildWordLadderVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'word-ladder') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'ladderLength' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 3) return []
    const variants = buildWordLadderVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildAlienDictionaryVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'alien-dictionary') return []
    void signatureOf

    const variants = buildAlienDictionaryPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildBurstBalloonsVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'burst-balloons') return []
    const signature = signatureOf(problem)

    if (!signature || signature.name !== 'maxCoins' || signature.return !== 'int') return []

    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []

    const variants = buildBurstBalloonsPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildDistinctSubsequencesVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'distinct-subsequences') return []
    const signature = signatureOf(problem)

    if (!signature || signature.name !== 'numDistinct' || signature.return !== 'int') return []

    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []

    const variants = buildDistinctSubsequencesVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildEditDistanceVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'edit-distance') return []
    const signature = signatureOf(problem)

    if (!signature || signature.name !== 'minDistance' || signature.return !== 'int') return []

    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []

    const variants = buildEditDistanceVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildGraphValidTreeVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'graph-valid-tree') return []
    void signatureOf

    const variants = buildGraphValidTreeVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildHandOfStraightsVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'hand-of-straights') return []
    const signature = signatureOf(problem)

    if (!signature || signature.name !== 'isNStraightHand' || signature.return !== 'boolean') return []

    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []

    const variants = buildHandOfStraightsVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildHappyNumberVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'happy-number') return []
    const signature = signatureOf(problem)

    if (!signature || signature.name !== 'isHappy' || signature.return !== 'boolean') return []

    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []

    const variants = buildHappyNumberVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildInterleavingStringVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'interleaving-string') return []
    const signature = signatureOf(problem)

    if (!signature || signature.name !== 'isInterleave' || signature.return !== 'boolean') return []

    if (!Array.isArray(signature.params) || signature.params.length !== 3) return []

    const variants = buildInterleavingStringVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildJumpGameIiVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'jump-game-ii') return []
    const signature = signatureOf(problem)

    if (!signature || signature.name !== 'jump' || signature.return !== 'int') return []

    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []

    const variants = buildJumpGameIIVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildLongestIncreasingPathInAMatrixVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'longest-increasing-path-in-a-matrix') return []
    const signature = signatureOf(problem)

    if (!signature || signature.name !== 'longestIncreasingPath' || signature.return !== 'int') return []

    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []

    const variants = buildLongestIncreasingPathPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildMeetingRoomsVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'meeting-rooms') return []
    void signatureOf

    const variants = buildMeetingRoomsVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildEncodeAndDecodeStringsVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'encode-and-decode-strings') return []
    const variants = buildEncodeAndDecodeStringsPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildMeetingRoomsIiVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'meeting-rooms-ii') return []
    void signatureOf

    const variants = buildMeetingRoomsIiVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildMergeTripletsToFormTargetTripletVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'merge-triplets-to-form-target-triplet') return []
    const signature = signatureOf(problem)

    if (!signature || signature.name !== 'mergeTriplets' || signature.return !== 'boolean') return []

    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []

    const variants = buildMergeTripletsVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildMinimumIntervalToIncludeEachQueryVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'minimum-interval-to-include-each-query') return []
    const signature = signatureOf(problem)

    if (!signature || signature.name !== 'minInterval' || signature.return !== 'int[]') return []

    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []

    const variants = buildMinIntervalPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildMultiplyStringsVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'multiply-strings') return []
    const signature = signatureOf(problem)

    if (!signature || signature.name !== 'multiply' || signature.return !== 'string') return []

    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []

    const variants = buildMultiplyStringsPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildNumberOfConnectedComponentsInAnUndirectedGraphVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'number-of-connected-components-in-an-undirected-graph') return []
    void signatureOf

    const variants = buildConnectedComponentsVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildPartitionLabelsVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'partition-labels') return []
    const signature = signatureOf(problem)

    if (!signature || signature.name !== 'partitionLabels' || signature.return !== 'int[]') return []

    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []

    const variants = buildPartitionLabelsPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildPlusOneVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'plus-one') return []
    const signature = signatureOf(problem)

    if (!signature || signature.name !== 'plusOne' || signature.return !== 'int[]') return []

    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []

    const variants = buildPlusOneVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildPowxNVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'powx-n') return []
    const signature = signatureOf(problem)

    if (!signature || signature.name !== 'myPow' || signature.return !== 'double') return []

    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []

    const variants = buildPowXnVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildRegularExpressionMatchingVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'regular-expression-matching') return []
    const signature = signatureOf(problem)

    if (!signature || signature.name !== 'isMatch' || signature.return !== 'boolean') return []

    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []

    const variants = buildRegularExpressionMatchingPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildSetMatrixZeroesVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'set-matrix-zeroes') return []
    void signatureOf

    const variants = buildSetMatrixZeroesVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildSingleNumberVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'single-number') return []
    const signature = signatureOf(problem)

    if (!signature || signature.name !== 'singleNumber' || signature.return !== 'int') return []

    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []

    const variants = buildSingleNumberPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildTargetSumVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'target-sum') return []
    const signature = signatureOf(problem)

    if (!signature || signature.name !== 'findTargetSumWays' || signature.return !== 'int') return []

    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []

    const variants = buildTargetSumPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildValidParenthesisStringVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'valid-parenthesis-string') return []
    const signature = signatureOf(problem)

    if (!signature || signature.name !== 'checkValidString' || signature.return !== 'boolean') return []

    if (!Array.isArray(signature.params) || signature.params.length !== 1) return []

    const variants = buildValidParenthesisStringVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildWallsAndGatesVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'walls-and-gates') return []
    void signatureOf

    const variants = buildWallsAndGatesVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}


function buildFindMedianFromDataStreamVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'find-median-from-data-stream') return []
    void signatureOf

    const variants = buildMedianStreamVariants()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}

/* ----------- staged-standalone validator (batch 12 word-dict) --------------- */
/*
 * forge-design-add-and-search-words-data-structure.js exposes a record-agnostic
 * builder whose output already matches the exact forge variant contract
 * (audited: v1/v2/v3 ids, seedLabel, intent, difficulty, test-profile signature
 * runWordDictOps(string[],string[])->string, examples == tests[0], exact mode,
 * 2 hints; word-list scan oracle, distinct from the trie DFS). The live record
 * is judge:null (operations design problem); this wrapper validates the slug
 * only and returns staged output.
 */
function buildWordDictVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'design-add-and-search-words-data-structure') return []
    const variants = buildWordDictPractice()
    if (!Array.isArray(variants) || variants.length !== 3) return []
    return variants
  } catch {
    return []
  }
}

/* -------------------------------------------------------------------- seeding -- */

/** FNV-1a over the slug — stable, tiny, no crypto dependency. */
function hashText(text) {
  const source = String(text)
  let hash = 2166136261 >>> 0
  for (let i = 0; i < source.length; i += 1) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619) >>> 0
  return hash
}

/** mulberry32: 32-bit seeded PRNG, identical output for identical seeds. */
function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1))
}

function shuffled(rng, list) {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const swap = out[i]
    out[i] = out[j]
    out[j] = swap
  }
  return out
}

/** `count` distinct integers from [lo, hi], in random order. */
function sampleRange(rng, count, lo, hi) {
  const pool = []
  for (let value = lo; value <= hi; value += 1) pool.push(value)
  return shuffled(rng, pool).slice(0, Math.min(count, pool.length))
}

function clampInt(value, lo, hi, fallback) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.min(hi, Math.max(lo, Math.trunc(n))) : fallback
}

/* -------------------------------------------------------------------- literals -- */

function numLiteral(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(6)))
}

/** Literal for an *argument*: strings are quoted, everything else is a literal. */
function argLiteral(value) {
  if (typeof value === 'string') return JSON.stringify(value)
  return outLiteral(value)
}

/** Literal for an *expected output*: strings stay bare, exactly like the judge compares. */
function outLiteral(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return numLiteral(value)
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return '[' + value.map(outLiteral).join(',') + ']'
  return String(value)
}

function inputLine(signature, args) {
  return signature.params
    .map((param, index) => `${(param && param.name) || 'arg' + index} = ${args[index]}`)
    .join(', ')
}

/* ------------------------------------------------------------------- signature -- */

function isShape(signature, paramTypes, returnType) {
  if (!signature || !Array.isArray(signature.params)) return false
  if (signature.params.length !== paramTypes.length) return false
  for (let i = 0; i < paramTypes.length; i += 1) {
    const param = signature.params[i]
    if (!param || param.type !== paramTypes[i]) return false
  }
  return signature.return === returnType
}

function cloneSignature(signature) {
  const params = signature.params.map((param) => ({ name: param.name, type: param.type }))
  return { name: signature.name, params, return: signature.return }
}

/** Read the judge signature from a full shard record; null when it cannot be judged. */
function signatureOf(problem) {
  const judge = problem && problem.judge
  const signature = judge && judge.signature
  if (!signature || typeof signature.name !== 'string' || signature.name.trim() === '') return null
  if (!Array.isArray(signature.params) || signature.params.length === 0) return null
  const params = []
  for (const param of signature.params) {
    if (!param || typeof param.type !== 'string' || param.type.trim() === '') return null
    params.push({ name: String(param.name || 'arg' + params.length), type: param.type.trim() })
  }
  if (typeof signature.return !== 'string' || signature.return.trim() === '') return null
  return { name: signature.name.trim(), params, return: signature.return.trim() }
}

/* -------------------------------------------------------------- problem context -- */

/** First example’s parsed arguments — the original problem’s only real influence here. */
function exampleArgs(problem) {
  const examples = problem && Array.isArray(problem.examples) ? problem.examples : []
  for (let i = 0; i < examples.length && i < 3; i += 1) {
    const text = examples[i] && (examples[i].input || examples[i].raw)
    if (!text) continue
    const parsed = parseExampleInput(String(text))
    if (parsed && parsed.ok && parsed.args.length > 0) return parsed.args
  }
  return []
}

function exampleNumbers(problem) {
  for (const arg of exampleArgs(problem)) {
    if (Array.isArray(arg.value) && arg.value.length > 0 && arg.value.every((v) => typeof v === 'number')) return arg.value
  }
  return []
}

function titleOf(problem) {
  const raw = String((problem && (problem.title || problem.slug)) || 'Problem').trim()
  return raw.length > 46 ? raw.slice(0, 46).trim() + '…' : raw
}

function difficultyOf(problem) {
  const value = problem && problem.difficulty
  return value === 'Easy' || value === 'Medium' || value === 'Hard' ? value : 'Medium'
}

/* ------------------------------------------------------------------ variant shape -- */

function buildVariant(spec) {
  const tests = spec.tests.slice(0, 5).map((test) => ({ args: test.args.map(String), expected: String(test.expected) }))
  const first = tests[0]
  return {
    id: spec.id, seedLabel: spec.seedLabel, intent: spec.intent, difficulty: spec.difficulty,
    title: spec.title, statement: spec.statement, signature: cloneSignature(spec.signature),
    examples: [{ input: inputLine(spec.signature, first.args), output: first.expected, explain: '' }],
    tests, mode: spec.mode || 'exact', hints: spec.hints.slice(0, 2),
  }
}

/** Curried factory: `make(id, suffix, label, intent, statement, tests, mode, hints)`. */
function variantFactory(problem, signature, taskLabel) {
  const base = titleOf(problem)
  const difficulty = difficultyOf(problem)
  return function make(id, suffix, seedLabel, intent, statement, tests, mode, hints) {
    return buildVariant({
      id, seedLabel, intent, difficulty, title: base + ' — ' + suffix + ' (' + taskLabel + ')',
      statement, signature, tests, mode, hints,
    })
  }
}

/* One-sentence intents, shared by all patterns so the UI chips read consistently. */
const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.'
const INTENT_EDGE = 'Same pattern with the edge case the original hides.'
const INTENT_TWIST = 'Same signature, different question: the twist tests whether the idea transfers.'

/* ==================================================================== patterns == */

/* ------------------------------------------------------------- arrays-hashing (A) */

/** Explicit Contains Duplicate drills; the twist changes the rule, not the signature. */
function buildDuplicateDrills(problem, signature, rng) {
  if (problem.slug !== 'contains-duplicate' || !isShape(signature, ['int[]'], 'boolean')) return null
  const make = variantFactory(problem, signature, 'duplicate detection drill')
  const duplicate = nums => nums.some((value,index) => nums.slice(0,index).includes(value))
  const adjacent = nums => nums.some((value,index) => index > 0 && nums[index-1] === value)
  const tests = (rows, oracle) => rows.map(nums => ({args:[argLiteral(nums)],expected:outLiteral(oracle(nums))}))
  const fresh = Array.from({length:4}, (_,index) => {
    const nums = sampleRange(rng,randInt(rng,4,9),-30,40)
    if(index%2===0)nums[nums.length-1]=nums[0]
    return nums
  })
  return [
    make('v1','fresh values','fresh values',INTENT_SAME,
      'Given an integer array nums, return true if any value occurs at least twice; otherwise return false. These fresh inputs contain 4 to 9 values between -30 and 40. Repeated values need not be next to one another.',
      tests(fresh,duplicate),'exact',
      ['Check whether the current value appeared earlier before recording it.','A repeated value can be far from its first occurrence.']),
    make('v2','edge cases','edge cases',INTENT_EDGE,
      'Same duplicate-detection task: return true if any value appears at least twice, otherwise false. Inputs are nonempty and include a single value, repeated zero, extreme integers, and a repeat at the end.',
      tests([[5],[0,0],[1000000000,-1000000000,1000000000],[-3,-1,0,2],[-4,7,3,9,-4]],duplicate),'exact',
      ['One element cannot contain a repeated value.','Zero and negative values belong in the set exactly like positive values.']),
    make('v3','twist: adjacent repeats','twist, same signature',INTENT_TWIST,
      'RULE CHANGE: return true only if two equal values occupy neighboring positions in nums. A repeat separated by other values does not count. Keep the same containsDuplicate method signature and return type; the changed condition is intentional.',
      tests([[4,8,4],[4,4,8],[5],[0,-1,-1,0],[-2,3,7]],adjacent),'exact',
      ['Compare each value with the one immediately before it.','A set alone detects distant repeats too, so it cannot enforce this changed condition.']),
  ]
}

function pairIndices(nums, target) {
  const seen = new Map()
  for (let i = 0; i < nums.length; i += 1) {
    const needed = target - nums[i]
    if (seen.has(needed)) return [seen.get(needed), i]
    seen.set(nums[i], i)
  }
  return []
}

function pairValues(nums, target) {
  const pair = pairIndices(nums, target)
  if (pair.length !== 2) return []
  const a = nums[pair[0]]
  const b = nums[pair[1]]
  return a <= b ? [a, b] : [b, a]
}

/** Distinct values with exactly one pair summing to `target`, so the answer is unique. */
function uniquePairData(rng, count, lo, hi) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const nums = sampleRange(rng, count, lo, hi)
    if (nums.length < 2) break
    const i = randInt(rng, 0, nums.length - 2)
    const j = randInt(rng, i + 1, nums.length - 1)
    const target = nums[i] + nums[j]
    let pairs = 0
    for (let a = 0; a < nums.length; a += 1) {
      for (let b = a + 1; b < nums.length; b += 1) if (nums[a] + nums[b] === target) pairs += 1
    }
    if (pairs === 1) return { nums, target }
  }
  return { nums: [1, 2, 3, 5], target: 8 }
}

function buildHashingPair(problem, signature, rng) {
  if (!isShape(signature, ['int[]', 'int'], 'int[]')) return null
  const make = variantFactory(problem, signature, 'pair-sum drill')
  const size = clampInt(exampleNumbers(problem).length, 5, 9, 6)

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const data = uniquePairData(rng, n === 0 ? size : randInt(rng, 5, 9), 1, 60)
    v1.push({ args: [argLiteral(data.nums), String(data.target)], expected: outLiteral(pairIndices(data.nums, data.target)) })
  }
  const v2 = [
    { nums: [0, -3, 7, 2], target: 7 },
    { nums: [-5, -2, -1, -8], target: -10 },
    uniquePairData(rng, randInt(rng, 4, 6), -20, 0),
    uniquePairData(rng, randInt(rng, 5, 7), -15, 25),
  ].map((data) => ({ args: [argLiteral(data.nums), String(data.target)], expected: outLiteral(pairIndices(data.nums, data.target)) }))
  const v3 = []
  for (let n = 0; n < 4; n += 1) {
    const data = uniquePairData(rng, n === 0 ? 4 : randInt(rng, 4, 8), -20, 50)
    v3.push({ args: [argLiteral(data.nums), String(data.target)], expected: outLiteral(pairValues(data.nums, data.target)) })
  }

  return [
    make('v1', 'fresh numbers', 'fresh numbers', INTENT_SAME,
      'Same pattern, new numbers. You are given an array nums of distinct integers and an integer target; return the indices [i, j], with i < j, of the two values that add up to target. Exactly one such pair exists in every test.',
      v1, 'unordered',
      ['The partner each value needs is target minus that value.', 'Record the index of every value you have already walked past, then look each partner up directly.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'This time the numbers can be negative or zero and the matching pair may sit anywhere in the array. Given nums of 3 to 7 distinct integers and a target, return the indices [i, j], i < j, of the unique two values whose sum equals target. Exactly one pair exists in every test.',
      v2, 'unordered',
      ['Nothing in the lookup idea assumes positive values.', 'Negative targets work the same way — the complement you look up may itself be negative.']),
    make('v3', 'twist: values', 'twist, same signature', INTENT_TWIST,
      'Given nums of distinct integers and a target, return the two values themselves that add up to target, ordered smaller first as [a, b]. Do not return indices. Exactly one such pair exists in every test.',
      v3, 'exact',
      ['Find the pair exactly as before, then swap the indices for the values behind them.', 'The two returned values must be ordered, so compare them once before returning.']),
  ]
}

/* ---------------------------------------------------------------- two-pointers -- */

function maxArea(height) {
  let best = 0
  for (let i = 0; i < height.length; i += 1) {
    for (let j = i + 1; j < height.length; j += 1) {
      const area = Math.min(height[i], height[j]) * (j - i)
      if (area > best) best = area
    }
  }
  return best
}

function countMaxArea(height) {
  let best = 0
  let count = 0
  for (let i = 0; i < height.length; i += 1) {
    for (let j = i + 1; j < height.length; j += 1) {
      const area = Math.min(height[i], height[j]) * (j - i)
      if (area > best) {
        best = area
        count = 1
      } else if (area === best) count += 1
    }
  }
  return count
}

/** Small heights with at least two pairs tied for the best area, so counting matters. */
function tiedAreaData(rng) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const length = randInt(rng, 4, 6)
    const height = []
    for (let i = 0; i < length; i += 1) height.push(randInt(rng, 1, 6))
    if (countMaxArea(height) >= 2) return height
  }
  return [1, 2, 2, 1]
}

function buildTwoPointersArea(problem, signature, rng) {
  if (!isShape(signature, ['int[]'], 'int')) return null
  const make = variantFactory(problem, signature, 'max-area drill')

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const length = randInt(rng, 5, 9)
    const height = []
    for (let i = 0; i < length; i += 1) height.push(randInt(rng, 1, 15))
    v1.push({ args: [argLiteral(height)], expected: outLiteral(maxArea(height)) })
  }
  const v2 = [[1, 1], [5, 5, 5, 5], [0, 0, 0, 0], [2, 9, 4, 7, 3]].map((height) => ({
    args: [argLiteral(height)],
    expected: outLiteral(maxArea(height)),
  }))
  const v3 = [[4, 4, 2, 1, 1], [2, 4, 4, 1, 1], tiedAreaData(rng), tiedAreaData(rng)].map((height) => ({
    args: [argLiteral(height)],
    expected: outLiteral(countMaxArea(height)),
  }))

  return [
    make('v1', 'fresh heights', 'fresh heights', INTENT_SAME,
      'You are given an array height where height[i] is the height of a vertical line at position i. Choosing two lines i < j forms a container holding min(height[i], height[j]) * (j - i) units of water. Return the largest amount of water any pair of lines can hold.',
      v1, 'exact',
      ['Widest pair first: the distance matters as much as the heights.', 'Moving the shorter line inward is the only move that can improve the area.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same container task with the boundary inputs. height may contain just two lines, all lines may be equal, and a line may have height 0. Return the largest area min(height[i], height[j]) * (j - i) over pairs i < j.',
      v2, 'exact',
      ['With only two lines there is exactly one pair to measure.', 'If every line has height 0 the best area is 0, which is a valid answer.']),
    make('v3', 'twist: count pairs', 'twist, same signature', INTENT_TWIST,
      'Twist: return how many pairs of lines (i < j) achieve the maximum area, not the area itself. If there are fewer than two heights, return 0. All heights are non-negative integers.',
      v3, 'exact',
      ['Find the best area first, then walk the pairs again counting matches.', 'For [4,4,2,1,1] three different pairs reach the same best area of 4.']),
  ]
}

/* ------------------------------------------ two-pointers-palindrome (LPS) -- */

/**
 * DP-table longest-palindrome length: O(n^2) time and space, independent of the
 * expand-around-center walkthrough adapter (O(n^2) time, O(1) space).
 */
function longestPalLen(s) {
  const n = s.length
  if (n === 0) return 0
  const dp = Array.from({ length: n }, () => new Array(n).fill(false))
  let best = 1
  for (let i = 0; i < n; i += 1) dp[i][i] = true
  for (let len = 2; len <= n; len += 1) {
    for (let i = 0; i + len - 1 < n; i += 1) {
      const j = i + len - 1
      dp[i][j] = s[i] === s[j] && (len === 2 || dp[i + 1][j - 1])
      if (dp[i][j] && len > best) best = len
    }
  }
  return best
}

/** True when exactly one substring attains the maximal palindrome length. */
function uniqueLongestPalindrome(s) {
  const target = longestPalLen(s)
  let count = 0
  for (let i = 0; i < s.length; i += 1) {
    for (let j = i; j < s.length; j += 1) {
      if (j - i + 1 !== target) continue
      const sub = s.slice(i, j + 1)
      if (sub === sub.split('').reverse().join('')) count += 1
      if (count > 1) return false
    }
  }
  return count === 1
}

/**
 * Expand-around-center canonical answer with earliest-window tie-break (matches the
 * walkthrough adapter). The forge only emits inputs with a unique longest palindrome
 * (see uniqueLongestPalindrome), so this canonical answer equals the DP oracle length
 * and exact judge comparison stays sound. Classroom tie discussion (babad -> bab or
 * aba) lives in the lesson trap, not in these generated tests.
 */
function longestPalCanonical(s) {
  let start = 0
  let maxLen = s.length > 0 ? 1 : 0
  const expand = (left, right) => {
    while (left >= 0 && right < s.length && s[left] === s[right]) {
      if (right - left + 1 > maxLen) {
        start = left
        maxLen = right - left + 1
      }
      left -= 1
      right += 1
    }
  }
  for (let center = 0; center < s.length; center += 1) {
    expand(center, center)
    expand(center, center + 1)
  }
  return s.slice(start, start + maxLen)
}

function buildTwoPointersLPS(problem, signature, rng) {
  if (!problem || problem.slug !== 'longest-palindromic-substring') return null
  if (!isShape(signature, ['string'], 'string')) return null
  const make = variantFactory(problem, signature, 'palindrome-center drill')
  const alphabet = 'aAbB12'
  // String answers are JSON-quoted so the judge's exact comparison sees the
  // same literal the Java/C++ serializers produce (the '"bab"' dataset
  // convention); a bare outLiteral would parse as a number on inputs like '22'.
  const strExpected = (s) => JSON.stringify(longestPalCanonical(s))

  const freshUnique = (fallback) => {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const s = randomString(rng, randInt(rng, 1, 10), alphabet)
      if (uniqueLongestPalindrome(s)) return s
    }
    return fallback
  }

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const s = freshUnique('cbbd')
    v1.push({ args: [argLiteral(s)], expected: strExpected(s) })
  }
  const v2 = ['a', 'aaaa', 'cbbd', 'racecar', 'abccbx'].map((s) => ({
    args: [argLiteral(s)],
    expected: strExpected(s),
  }))
  const adversarialPools = [
    (r) => 'abba'.slice(0, randInt(r, 4, 4)),
    () => 'a'.repeat(randInt(rng, 6, 10)),
    (r) => {
      const core = ['bccb', 'abba', '1221'][randInt(r, 0, 2)]
      const pad = randomString(r, randInt(r, 0, 2), 'xyz')
      return (pad + core + randomString(r, randInt(r, 0, 2), 'xyz')).slice(0, 10)
    },
    () => freshUnique('abba'),
  ]
  const v3 = []
  for (let n = 0; n < 4; n += 1) {
    const pool = adversarialPools[n % adversarialPools.length]
    let s = pool(rng)
    if (!uniqueLongestPalindrome(s)) s = 'abba'
    v3.push({ args: [argLiteral(s)], expected: strExpected(s) })
  }

  return [
    make('v1', 'fresh strings', 'fresh strings', INTENT_SAME,
      'Given a string of digits and English letters, return its longest palindromic substring. Every generated test has exactly one longest palindrome, so the expected answer is unique. Inputs are short (length 1..10) to match the walkthrough bound.',
      v1, 'exact',
      ['Try every center, both the character itself and the gap after it.', 'Only a strictly longer mirror replaces the best window; ties keep the earlier one.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same longest-palindrome task with the boundary inputs. The string may be a single character, fully uniform, or hold its palindrome off-center. Every case has a unique longest palindrome. Return that substring exactly.',
      v2, 'exact',
      ['A single character is already the longest palindrome.', 'A uniform string is one palindrome end to end.']),
    make('v3', 'adversarial shapes', 'adversarial shapes', 'Same question with adversarial shapes that punish center-skipping shortcuts.',
      'Same longest-palindrome question, no rule change. Even-heavy strings, embedded blocks, and uniform runs stress the gap centers and the strictly-longer update. Every case keeps a unique longest palindrome; return it exactly.',
      v3, 'exact',
      ['Even-length answers only appear from gap centers, never from single characters.', 'A uniform run is the worst case: every center matches, but the answer is the whole string.']),
  ]
}

/* --------------------------------------------------------------- sliding-window -- */

function longestUnique(s) {
  const last = new Map()
  let best = 0
  let start = 0
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i]
    if (last.has(ch) && last.get(ch) >= start) start = last.get(ch) + 1
    last.set(ch, i)
    if (i - start + 1 > best) best = i - start + 1
  }
  return best
}

function longestTwoDistinct(s) {
  const counts = new Map()
  let best = 0
  let start = 0
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i]
    counts.set(ch, (counts.get(ch) || 0) + 1)
    while (counts.size > 2) {
      const out = s[start]
      const next = counts.get(out) - 1
      if (next === 0) counts.delete(out)
      else counts.set(out, next)
      start += 1
    }
    if (i - start + 1 > best) best = i - start + 1
  }
  return best
}

function randomString(rng, length, alphabet) {
  let out = ''
  for (let i = 0; i < length; i += 1) out += alphabet[randInt(rng, 0, alphabet.length - 1)]
  return out
}

function buildSlidingWindowString(problem, signature, rng) {
  if (!isShape(signature, ['string'], 'int')) return null
  const make = variantFactory(problem, signature, 'unique-window drill')

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const s = randomString(rng, randInt(rng, 4, 12), 'abcde')
    v1.push({ args: [argLiteral(s)], expected: outLiteral(longestUnique(s)) })
  }
  const v2 = ['aaaa', '', 'a', 'ab', 'abcabcbb'].map((s) => ({ args: [argLiteral(s)], expected: outLiteral(longestUnique(s)) }))
  const v3 = []
  for (let n = 0; n < 4; n += 1) {
    const s = randomString(rng, randInt(rng, 4, 12), 'abc')
    v3.push({ args: [argLiteral(s)], expected: outLiteral(longestTwoDistinct(s)) })
  }

  return [
    make('v1', 'fresh strings', 'fresh strings', INTENT_SAME,
      'Given a string s of lowercase letters, return the length of the longest substring that contains no repeated character. A substring is a contiguous piece of s. The strings here are four to twelve characters long.',
      v1, 'exact',
      ['Grow a window on the right and shrink it from the left when a repeat appears.', 'Remember where each character was last seen instead of rescanning the window.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same task with the boundary strings. Given s of lowercase letters, return the length of the longest substring without a repeated character. The answer for an empty string is 0, and a string of one repeated letter has answer 1.',
      v2, 'exact',
      ['An empty string has no characters, so its longest unique substring is empty.', 'For "aaaa" any single "a" is the best you can do.']),
    make('v3', 'twist: two letters', 'twist, same signature', INTENT_TWIST,
      'Twist: return the length of the longest substring of s that contains at most two distinct characters. s uses only lowercase letters and may be empty. A substring with three different letters is too wide.',
      v3, 'exact',
      ['Track how many of each character are inside the window.', 'Shrink from the left until the window holds at most two distinct letters again.']),
  ]
}

/* ------------------------------------------------------- minimum-window (P21) -- */

/**
 * Distinct oracle for minimum-window-substring (NOT the sliding-window adapter):
 * brute-force O(m^2) coverage scan over every window, keeping the shortest covering
 * window (earliest start wins ties). Staged in P21 (practice-generators.mjs).
 */
function oracleMinWindow(s, t) {
  if (t.length === 0) return ''
  const need = new Map()
  for (const ch of t) need.set(ch, (need.get(ch) || 0) + 1)
  const covers = (sub) => {
    const have = new Map()
    for (const ch of sub) have.set(ch, (have.get(ch) || 0) + 1)
    for (const [ch, n] of need) if ((have.get(ch) || 0) < n) return false
    return true
  }
  let best = null
  for (let i = 0; i < s.length; i += 1) {
    for (let j = i + 1; j <= s.length; j += 1) {
      if (best !== null && j - i >= best.length) break
      const sub = s.slice(i, j)
      if (covers(sub) && (best === null || sub.length < best.length)) best = sub
    }
  }
  return best === null ? '' : best
}

function buildMinWindow(problem, signature, rng) {
  if (!problem || problem.slug !== 'minimum-window-substring') return null
  if (!isShape(signature, ['string', 'string'], 'string')) return null
  const make = variantFactory(problem, signature, 'minimum-window drill')
  // String answers are JSON-quoted so the judge's exact comparison sees the
  // same literal the Java/C++ serializers produce (the '"BANC"' dataset
  // convention); a bare outLiteral would parse as a number on some inputs.
  const strExpected = (s, t) => JSON.stringify(oracleMinWindow(s, t))
  const toTest = (s, t) => ({ args: [argLiteral(s), argLiteral(t)], expected: strExpected(s, t) })

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const s = randomString(rng, randInt(rng, 3, 10), 'ABCD')
    const t = randomString(rng, randInt(rng, 1, 3), 'ABCD')
    v1.push(toTest(s, t))
  }
  // Fixed edges: duplicate need exceeding have, single exact, t longer than s,
  // disjoint alphabets, case-sensitivity (subset of the staged P21 edge list).
  const v2 = [['a', 'aa'], ['a', 'a'], ['abc', 'abcd'], ['a', 'b'], ['ABC', 'abc']].map(([s, t]) => toTest(s, t))
  // Adversarial same-task placements (no rule change): duplicate-heavy
  // input, minimal window hidden behind a decoy run, case-sensitive scattering,
  // decoy surplus copies (subset of the staged P21 challenge list).
  const v3 = [['AAABBC', 'AABC'], ['abbbbbba', 'aa'], ['CaSeSeNsItIvE', 'see'], ['ADOBECODEBANCX', 'ABCC']].map(([s, t]) => toTest(s, t))

  return [
    make('v1', 'fresh strings', 'fresh strings', INTENT_SAME,
      'Given strings s and t, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If no such window exists, return the empty string. These fresh inputs use a tiny alphabet ABCD with s length 3 to 10 and t length 1 to 3. The signature and exact-match judge mode are unchanged.',
      v1, 'exact',
      ['Expand right until every character of t is covered, then shrink left while coverage holds.', 'Count satisfied DISTINCT characters (formed vs required), not total matched characters.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same minimum-window task with the boundary inputs. Given strings s and t, return the minimum window of s covering every character of t with duplicates counted. The empty string means no window covers t. Inputs include single characters, t longer than s, disjoint alphabets, and case-sensitive pairs.',
      v2, 'exact',
      ['Check the boundary first: can this input possibly cover t at all?', 'Trace formed vs required on paper for a 1-2 character input.']),
    make('v3', 'adversarial shapes', 'adversarial shapes', 'Same question with adversarial placements that punish greedy shortcuts.',
      'Same minimum-window question with adversarial placements that punish greedy or first-match shortcuts. Given strings s and t, return the minimum covering window of s or the empty string when none exists. Duplicate-heavy targets, decoy surplus copies, case-sensitive scattering, and end-hidden minima stress the shrink-while-valid step. No rule change: the signature and exact comparison are unchanged.',
      v3, 'exact',
      ['Duplicates in t raise the required count of one character — equality (==), not >=, earns formed.', 'Uppercase and lowercase are different characters.']),
  ]
}

/* ------------------------------------------------------------------ binary-search -- */

function binarySearchIndex(nums, target) {
  let lo = 0
  let hi = nums.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    if (nums[mid] === target) return mid
    if (nums[mid] < target) lo = mid + 1
    else hi = mid - 1
  }
  return -1
}

function lowerBound(nums, target) {
  let lo = 0
  let hi = nums.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (nums[mid] < target) lo = mid + 1
    else hi = mid
  }
  return lo
}

function sortedSearchData(rng, length, lo, hi) {
  const nums = sampleRange(rng, length, lo, hi).sort((a, b) => a - b)
  const present = rng() < 0.65
  if (present && nums.length > 0) return { nums, target: nums[randInt(rng, 0, nums.length - 1)] }
  return { nums, target: randInt(rng, lo - 5, hi + 5) }
}

function buildBinarySearchIndex(problem, signature, rng) {
  if (!isShape(signature, ['int[]', 'int'], 'int')) return null
  const make = variantFactory(problem, signature, 'sorted-search drill')

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const data = sortedSearchData(rng, randInt(rng, 5, 9), 0, 50)
    v1.push({ args: [argLiteral(data.nums), String(data.target)], expected: outLiteral(binarySearchIndex(data.nums, data.target)) })
  }
  const v2 = [
    { nums: [1, 2, 3, 4, 5], target: 6 },
    { nums: [], target: 3 },
    { nums: [5], target: 5 },
    { nums: [1, 3], target: 4 },
  ].map((data) => ({
    args: [argLiteral(data.nums), String(data.target)],
    expected: outLiteral(binarySearchIndex(data.nums, data.target)),
  }))
  const v3 = []
  for (let n = 0; n < 4; n += 1) {
    const data = sortedSearchData(rng, randInt(rng, 4, 8), 0, 40)
    v3.push({ args: [argLiteral(data.nums), String(data.target)], expected: String(lowerBound(data.nums, data.target) + 1) })
  }

  return [
    make('v1', 'fresh arrays', 'fresh arrays', INTENT_SAME,
      'Given a sorted array of distinct integers nums and a target, return the index where target appears, or -1 when it is missing. nums is sorted in ascending order. Search in logarithmic time rather than scanning.',
      v1, 'exact',
      ['Keep a low and a high boundary and halve the remaining range each step.', 'Stop when the boundaries cross — that is the -1 case.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same search with the boundary inputs. nums may be empty, hold a single value, or have the target below every element or above every element. Return the index of target, or -1 when it is not present.',
      v2, 'exact',
      ['An empty array can never contain the target.', 'A target below the first or above the last element must return -1, not 0 or length.']),
    make('v3', 'twist: insertion', 'twist, same signature', INTENT_TWIST,
      'Twist: return the 1-indexed position where target belongs in the sorted array — its own position when present, otherwise the position of the first larger value. If target is larger than every element, return nums.length + 1. nums is sorted ascending.',
      v3, 'exact',
      ['Find the first index whose value is not less than target, then add one.', 'For an empty array the answer is 1: target belongs at the front of an empty list.']),
  ]
}

/* --------------------------------------------- search-insert-position -- */

function buildSearchInsertPositionVariantsFor(problem) {
  try {
    if (!problem || problem.slug !== 'search-insert-position') return []
    const signature = signatureOf(problem)
    if (!signature || signature.name !== 'searchInsert' || signature.return !== 'int') return []
    if (!Array.isArray(signature.params) || signature.params.length !== 2) return []
    if (signature.params[0].type !== 'int[]' || signature.params[1].type !== 'int') return []
    const rng = mulberry32(hashText('search-insert-position'))
    const make = variantFactory(problem, signature, 'insertion-index drill')

    const v1 = []
    for (let n = 0; n < 4; n += 1) {
      const data = sortedSearchData(rng, randInt(rng, 5, 9), 0, 50)
      v1.push({ args: [argLiteral(data.nums), String(data.target)], expected: outLiteral(lowerBound(data.nums, data.target)) })
    }
    const v2 = [
      { nums: [], target: 3 },
      { nums: [1], target: 0 },
      { nums: [1, 3, 5, 6], target: 5 },
      { nums: [1, 3, 5, 6], target: 7 },
    ].map((data) => ({
      args: [argLiteral(data.nums), String(data.target)],
      expected: outLiteral(lowerBound(data.nums, data.target)),
    }))
    const v3 = []
    for (let n = 0; n < 4; n += 1) {
      const data = sortedSearchData(rng, randInt(rng, 4, 8), 0, 40)
      v3.push({ args: [argLiteral(data.nums), String(data.target)], expected: String(lowerBound(data.nums, data.target) + 1) })
    }

    return [
      make('v1', 'fresh arrays', 'fresh arrays', INTENT_SAME,
        'Given a sorted array of distinct integers nums and a target, return the index of target when it appears, otherwise the index where it would be inserted to keep the order. nums is sorted in ascending order. Search in logarithmic time rather than scanning.',
        v1, 'exact',
        ['Keep a low and a high boundary and halve the remaining range each step.', 'When the range empties, lo is the first index whose value reaches target.']),
      make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
        'Same insertion-index task with the boundary inputs. nums may be empty or hold a single value, and the target may sit below every element, match inside, or sit above every element. Return the 0-based insertion index.',
        v2, 'exact',
        ['An empty array inserts at 0: nothing precedes the target.', 'A target above every element inserts at nums.length.']),
      make('v3', 'twist: 1-indexed', 'twist, same signature', INTENT_TWIST,
        'RULE CHANGE (not the LeetCode task): return the 1-indexed position where target belongs — its own 1-based position when present, otherwise the position of the first larger value. If target is larger than every element, return nums.length + 1. Same signature, different numbering.',
        v3, 'exact',
        ['Find the 0-based insertion index first, then add one.', 'For an empty array the answer is 1: target belongs at the front of an empty list.']),
    ]
  } catch {
    return []
  }
}

function rotatedLinearSearch(nums, target) {
  for (let i = 0; i < nums.length; i += 1) if (nums[i] === target) return i
  return -1
}

function rotatedFirstGreater(nums, target) {
  for (let i = 0; i < nums.length; i += 1) if (nums[i] > target) return i
  return -1
}

function randomRotatedArray(rng, n, lo, hi) {
  const pool = []
  for (let v = lo; v <= hi; v += 1) pool.push(v)
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = pool[i]
    pool[i] = pool[j]
    pool[j] = tmp
  }
  const base = pool.slice(0, n).sort((a, b) => a - b)
  const pivot = n === 1 ? 0 : Math.floor(rng() * n)
  return base.slice(pivot).concat(base.slice(0, pivot))
}

function buildRotatedSearch(problem, signature, rng) {
  if (!problem || problem.slug !== 'search-in-rotated-sorted-array') return null
  if (!isShape(signature, ['int[]', 'int'], 'int')) return null
  const make = variantFactory(problem, signature, 'rotated-search drill')
  const v1rows = []
  for (let k = 0; k < 4; k += 1) {
    const n = randInt(rng, 2, 12)
    const nums = randomRotatedArray(rng, n, -20, 20)
    const present = rng() < 0.7
    const target = present ? nums[Math.floor(rng() * n)] : randInt(rng, -25, 25)
    v1rows.push({ args: [argLiteral(nums), String(target)], expected: outLiteral(rotatedLinearSearch(nums, target)) })
  }
  const v2rows = [
    { nums: [1], target: 1 },
    { nums: [2, 1], target: 2 },
    { nums: [5, 1, 2, 3, 4], target: 5 },
    { nums: [10000, -10000, -9999], target: -10000 },
  ].map((row) => ({ args: [argLiteral(row.nums), String(row.target)], expected: outLiteral(rotatedLinearSearch(row.nums, row.target)) }))
  const v3rows = []
  for (let k = 0; k < 4; k += 1) {
    const n = randInt(rng, 3, 12)
    const nums = randomRotatedArray(rng, n, -15, 15)
    const target = randInt(rng, -15, 15)
    v3rows.push({ args: [argLiteral(nums), String(target)], expected: outLiteral(rotatedFirstGreater(nums, target)) })
  }
  return [
    make('v1', 'fresh numbers', 'fresh numbers', INTENT_SAME,
      'Given the rotated sorted distinct array nums and an integer target, return the index of target in nums, or -1 if it is not in nums. O(log n) required.',
      v1rows, 'exact',
      ['Probe mid; one of the two halves [lo..mid] / [mid..hi] must be sorted — prove which one from the endpoints.', "Test target against the sorted half's range before discarding anything."]),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same search contract on boundary inputs (single element, two-element rotation, pivot head, extreme values): return the index of target in nums, or -1.',
      v2rows, 'exact',
      ['Single-element windows are sorted by the <= endpoint test — trace [lo..mid] = [i..i].', 'Absence is proven only by an empty window, never by one missed range test.']),
    make('v3', 'twist: first greater', 'twist, same signature', INTENT_TWIST,
      'RULE CHANGE (not the LeetCode task): given rotated sorted distinct nums and target, return the FIRST index i with nums[i] > target, or -1 if no such index exists. Same signature, different question.',
      v3rows, 'exact',
      ['Position in the rotated layout matters, not sorted order — the answer need not sit in any sorted half.', 'A linear scan from index 0 settles it; binary search on values does not apply to "first position" here.']),
  ]
}

/* ----------------------------------------------------------- bit-manipulation -- */

/** Gauss-sum oracle for the 0..n range: independent of the adapter's XOR fold. */
function missingGauss(nums) {
  const n = nums.length
  let sum = 0
  for (const value of nums) sum += value
  return (n * (n + 1)) / 2 - sum
}

/** 1-based twist oracle: values are a permutation of 1..n+1 with one missing. */
function missingOneBased(nums) {
  const n = nums.length
  let sum = 0
  for (const value of nums) sum += value
  return ((n + 1) * (n + 2)) / 2 - sum
}

/** n-element permutation of lo..n+lo with `missing` removed, in seeded order. */
function shuffledMissing(rng, n, missing, lo) {
  const arr = []
  for (let value = lo; value <= n + lo; value += 1) if (value !== missing) arr.push(value)
  return shuffled(rng, arr)
}

function buildBitMissing(problem, signature, rng) {
  if (!problem || problem.slug !== 'missing-number') return null
  if (!isShape(signature, ['int[]'], 'int')) return null
  const make = variantFactory(problem, signature, 'missing-value drill')

  // n <= 12 keeps every generated input inside the live walkthrough visual bound.
  const v1 = []
  for (let k = 0; k < 4; k += 1) {
    const n = randInt(rng, 4, 12)
    const missing = randInt(rng, 0, n)
    const nums = shuffledMissing(rng, n, missing, 0)
    v1.push({ args: [argLiteral(nums)], expected: outLiteral(missingGauss(nums)) })
  }
  const v2 = [[1], [0], [3, 1, 2], [0, 1, 2], [0, 2]].map((nums) => ({
    args: [argLiteral(nums)],
    expected: outLiteral(missingGauss(nums)),
  }))
  const v3 = []
  for (let k = 0; k < 4; k += 1) {
    const n = randInt(rng, 3, 9)
    const missing = randInt(rng, 1, n + 1)
    const nums = shuffledMissing(rng, n, missing, 1)
    v3.push({ args: [argLiteral(nums)], expected: outLiteral(missingOneBased(nums)) })
  }

  return [
    make('v1', 'fresh arrays', 'fresh arrays', INTENT_SAME,
      'You are given an array nums containing n distinct numbers in the range [0, n]. Return the only number in the range that is missing from the array. Every test uses fresh numbers with n between 4 and 12.',
      v1, 'exact',
      ['Pair each index with the value sitting on it; the value with no partner is the answer.', 'Fold index and value together with XOR starting from n, or subtract the actual sum from n*(n+1)/2.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same missing-number task with the boundary inputs. nums may hold a single element, and the missing value may sit at the bottom, the top, or strictly inside the range. Order never matters: a sorted prefix can still hide the hole at its end.',
      v2, 'exact',
      ['With n = 1 the range is just {0, 1}; one of them must be absent.', 'Seeding the fold with n is what lets a trailing missing value survive.']),
    make('v3', 'twist: 1-based range', 'twist, same signature', INTENT_TWIST,
      'Twist with a changed rule: the values now come from the range [1, n+1] instead of [0, n]. You are given an array nums of n distinct numbers in that shifted range. Return the only value missing from it. The method name and parameter types are unchanged.',
      v3, 'exact',
      ['Shift the closed-form sum to (n+1)*(n+2)/2 before subtracting.', 'A zero seed no longer helps here; the top of the shifted range plays that role.']),
  ]
}

/** String-popcount oracle: independent of the adapter's shift-and-count loop. */
function popcountString(n) {
  return (n >>> 0).toString(2).split('').filter((c) => c === '1').length
}

/** Zero-bit twist oracle over the full 32-bit view. */
function zeroBits32(n) {
  return 32 - popcountString(n >>> 0)
}

function buildBitCount(problem, signature, rng) {
  if (!problem || problem.slug !== 'number-of-1-bits') return null
  if (!isShape(signature, ['int'], 'int')) return null
  const make = variantFactory(problem, signature, 'bit-count drill')

  const v1 = []
  const seen = new Set()
  while (v1.length < 4) {
    const n = 1 + Math.floor(rng() * 2147483647)
    if (seen.has(n)) continue
    seen.add(n)
    v1.push({ args: [String(n)], expected: outLiteral(popcountString(n)) })
  }
  const v2 = [1, 2147483647, 1024, 1431655765, 715827882].map((n) => ({
    args: [String(n)],
    expected: outLiteral(popcountString(n)),
  }))
  const v3 = [11, 128, 0, 2147483647].map((n) => ({
    args: [String(n)],
    expected: outLiteral(zeroBits32(n)),
  }))

  return [
    make('v1', 'fresh values', 'fresh values', INTENT_SAME,
      'Given a positive integer n, return the number of set bits in its binary representation (the Hamming weight). Every test uses a fresh value between 1 and 2^31 - 1.',
      v1, 'exact',
      ['Probe each bit: mask with 1, count it, then shift right with zero fill.', 'Keep the running invariant count equal to the set bits seen so far.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same bit-count task with the boundary values. n may be 1, the maximum 2^31 - 1 with all 31 low bits set, a lone power of two, or an alternating-bit pattern. Each probe of a set bit must count exactly once.',
      v2, 'exact',
      ['A single set bit far from bit 0 still needs the full-width walk.', 'Alternating patterns stress whether taken and skipped probes strictly alternate.']),
    make('v3', 'twist: zero bits', 'twist, same signature', INTENT_TWIST,
      'Twist: return the number of zero bits in the 32-bit representation of n instead of the number of set bits. Leading zeros count, so the two answers always add up to 32. n stays within the same constraint range.',
      v3, 'exact',
      ['Count exactly as before, then subtract from 32.', 'For n = 0 the answer is 32: no special case is needed.']),
  ]
}

function popcountTable(n) {
  const ans = []
  for (let i = 0; i <= n; i += 1) ans.push(popcountString(i))
  return ans
}

function buildCountingBitsTable(problem, signature, rng) {
  if (!problem || problem.slug !== 'counting-bits') return null
  if (!isShape(signature, ['int'], 'int[]')) return null
  const make = variantFactory(problem, signature, 'popcount-table drill')
  const tableTests = (ns) => ns.map((n) => ({ args: [String(n)], expected: outLiteral(popcountTable(n)) }))
  const v1 = tableTests([9, 6, 12, 10])
  const v2 = tableTests([0, 1, 8, 16])
  const v3 = tableTests([7, 8, 15, 16])
  return [
    make('v1', 'fresh values', 'fresh values', INTENT_SAME,
      'Given an integer n, return an array ans of length n + 1 such that for each i (0 <= i <= n), ans[i] is the number of 1s in the binary representation of i. These fresh inputs use n = 9, 6, 12, 10 (none is an official example). Seed ans[0]=0, sweep i=1..n ascending, and write ans[i]=ans[i>>1]+(i&1).',
      v1, 'exact',
      ['You should make use of what you have produced already: ans[i] needs only ans[i>>1].', 'Odd i grows by exactly one (i&1 = 1); even i copies its half (i&1 = 0).']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same popcount-table task with the boundary inputs. n=0 returns a single entry, n=1 takes one step, n=8 crosses into 4-bit numbers, and n=16 is the largest walkthrough input.',
      v2, 'exact',
      ['Length is n+1, so n=0 still returns one entry: [0].', '16 is 10000 in binary, so its popcount resets to 1.']),
    make('v3', 'adversarial shapes', 'adversarial shapes', INTENT_TWIST,
      'ADVERSARIAL SAME-TASK DRILL (no rule change): inputs sit on bit-width boundaries — 7->8 and 15->16 — where recounting bits from scratch and off-by-one allocation (length n instead of n+1) both fail visibly.',
      v3, 'exact',
      ['7 is 111 (popcount 3) while 8 is 1000 (popcount 1): growing i can shrink the answer.', 'Divide the numbers into ranges [2-3], [4-7], [8-15] and generate each range from the previous one.']),
  ]
}

/* ------------------------------------------------------------------------- stack -- */

const CLOSER = { ')': '(', ']': '[', '}': '{' }

function isValidBrackets(s) {
  const stack = []
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') stack.push(ch)
    else if (CLOSER[ch]) {
      if (stack.pop() !== CLOSER[ch]) return false
    } else return false
  }
  return stack.length === 0
}

function validWithOneRemoval(s) {
  if (isValidBrackets(s)) return true
  for (let i = 0; i < s.length; i += 1) {
    if (isValidBrackets(s.slice(0, i) + s.slice(i + 1))) return true
  }
  return false
}

function balancedBrackets(rng, pairs) {
  const openers = ['(', '[', '{']
  const closerOf = { '(': ')', '[': ']', '{': '}' }
  const stack = []
  let out = ''
  let remaining = pairs
  while (remaining > 0 || stack.length > 0) {
    const canOpen = remaining > 0
    const canClose = stack.length > 0
    const openNow = canOpen && (!canClose || rng() < 0.55)
    if (openNow) {
      const opener = openers[randInt(rng, 0, openers.length - 1)]
      stack.push(opener)
      out += opener
      remaining -= 1
    } else {
      out += closerOf[stack.pop()]
    }
  }
  return out
}

function bracketData(rng, pairs, balanced) {
  if (balanced) return balancedBrackets(rng, pairs)
  const chars = '()[]{}'
  let out = ''
  for (let i = 0; i < pairs * 2; i += 1) out += chars[randInt(rng, 0, chars.length - 1)]
  return out
}

function buildStackBrackets(problem, signature, rng) {
  if (!isShape(signature, ['string'], 'boolean')) return null
  const make = variantFactory(problem, signature, 'bracket-stack drill')

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const s = bracketData(rng, randInt(rng, 2, 4), n % 2 === 0)
    v1.push({ args: [argLiteral(s)], expected: outLiteral(isValidBrackets(s)) })
  }
  const v2 = ['([)]', '', '(', '()[]{}'].map((s) => ({ args: [argLiteral(s)], expected: outLiteral(isValidBrackets(s)) }))
  const v3 = []
  for (let n = 0; n < 4; n += 1) {
    let s
    if (n < 2) {
      const balanced = balancedBrackets(rng, randInt(rng, 2, 3))
      const cut = randInt(rng, 0, balanced.length - 1)
      s = balanced.slice(0, cut) + balanced.slice(cut + 1)
    } else if (n === 2) s = '((('
    else s = '())('
    v3.push({ args: [argLiteral(s)], expected: outLiteral(validWithOneRemoval(s)) })
  }

  return [
    make('v1', 'fresh brackets', 'fresh brackets', INTENT_SAME,
      'Given a string s containing only the characters ( ) [ ] { }, return true when every opening bracket is closed by the matching type in the correct order. An empty string is valid. Every closing bracket must match the most recent unclosed opening bracket.',
      v1, 'exact',
      ['A stack is the natural memory here: push openers, pop on closers.', 'The string is valid only when every pop matched and the stack ends empty.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same bracket check with the boundary strings. Given s, return true when it is a valid bracket sequence. The empty string is valid; a string with one unclosed opener or with crossed pairs such as ([)] is not.',
      v2, 'exact',
      ['Popping an empty stack already means a closer arrived with nothing to match.', 'Crossed pairs still fail even though both types are present.']),
    make('v3', 'twist: one removal', 'twist, same signature', INTENT_TWIST,
      'Twist: return true if removing at most one character can turn s into a valid bracket sequence. Removing nothing is allowed, so an already valid string counts. The empty string is valid. s contains only the characters ( ) [ ] { }.',
      v3, 'exact',
      ['First ask whether the string is already valid.', 'Otherwise try deleting each position once and re-run the stack check.']),
  ]
}

/* ------------------------------------------------------------------------ dp-1d -- */

function robLinear(nums) {
  let prev = 0
  let current = 0
  for (const value of nums) {
    const next = Math.max(current, prev + value)
    prev = current
    current = next
  }
  return current
}

function robCircular(nums) {
  if (nums.length === 0) return 0
  if (nums.length === 1) return nums[0]
  return Math.max(robLinear(nums.slice(0, -1)), robLinear(nums.slice(1)))
}

function climbWays(n) {
  let a = 1
  let b = 1
  for (let step = 2; step <= n; step += 1) {
    const next = a + b
    a = b
    b = next
  }
  return b
}

function tripleStepWays(n) {
  if (n <= 1) return 1
  const ways = [1, 1, 2]
  for (let step = 3; step <= n; step += 1) ways[step] = ways[step - 1] + ways[step - 2] + ways[step - 3]
  return ways[n]
}

function isStockLike(problem) {
  const text = String((problem && (problem.slug || '')) + ' ' + ((problem && problem.title) || ''))
  return /stock|profit|buy|sell|trad/i.test(text)
}

function maxProfitOne(prices) {
  let best = 0
  let floor = Infinity
  for (const price of prices) {
    if (price < floor) floor = price
    else if (price - floor > best) best = price - floor
  }
  return best
}

function maxProfitMany(prices) {
  let total = 0
  for (let i = 1; i < prices.length; i += 1) if (prices[i] > prices[i - 1]) total += prices[i] - prices[i - 1]
  return total
}

function buildDpArray(problem, signature, rng) {
  if (!isShape(signature, ['int[]'], 'int')) return null
  return isStockLike(problem) ? buildDpStock(problem, signature, rng) : buildDpRob(problem, signature, rng)
}

function buildDpStock(problem, signature, rng) {
  const make = variantFactory(problem, signature, 'stock-profit drill')

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const length = randInt(rng, 4, 9)
    const prices = []
    for (let i = 0; i < length; i += 1) prices.push(randInt(rng, 1, 30))
    v1.push({ args: [argLiteral(prices)], expected: outLiteral(maxProfitOne(prices)) })
  }
  const v2 = [[3, 5], [], [5, 3], [2, 2, 2]].map((prices) => ({ args: [argLiteral(prices)], expected: outLiteral(maxProfitOne(prices)) }))
  const v3 = [[], [7, 1, 5, 3, 6, 4], [1, 2, 3, 4, 5], [7, 6, 4, 3, 1]].map((prices) => ({
    args: [argLiteral(prices)],
    expected: outLiteral(maxProfitMany(prices)),
  }))

  return [
    make('v1', 'fresh prices', 'fresh prices', INTENT_SAME,
      'You are given an array prices where prices[i] is the price of a share on day i. Buy on one day and sell on a later day, at most once, and return the largest profit possible. Return 0 when no profitable trade exists.',
      v1, 'exact',
      ['Track the cheapest price seen so far, then compare today against it.', 'A falling series has no valid trade, so the answer there is 0.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same single-trade task with the boundary inputs. prices may be empty or hold a single day, in which case no trade is possible and the answer is 0. A strictly decreasing series also gives 0, and equal prices never produce profit.',
      v2, 'exact',
      ['Buying and selling must happen on different days.', 'For [3,5] the only trade gains 2; for [5,3] no later day beats day 0.']),
    make('v3', 'twist: many trades', 'twist, same signature', INTENT_TWIST,
      'Twist: you may complete as many trades as you like, buying and selling repeatedly, but you must sell before you buy again. Return the largest total profit. Return 0 when prices never rise.',
      v3, 'exact',
      ['Every increase between consecutive days can be collected independently.', 'With [7,1,5,3,6,4] the best total is 4 + 3 = 7.']),
  ]
}

function buildDpRob(problem, signature, rng) {
  const make = variantFactory(problem, signature, 'non-adjacent-sum drill')
  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const length = randInt(rng, 3, 8)
    const nums = []
    for (let i = 0; i < length; i += 1) nums.push(randInt(rng, 1, 30))
    v1.push({ args: [argLiteral(nums)], expected: outLiteral(robLinear(nums)) })
  }
  const v2 = [[3, 5], [7], [], [0, 0, 0, 0], [5, 5, 5]].map((nums) => ({ args: [argLiteral(nums)], expected: outLiteral(robLinear(nums)) }))
  const v3 = [[4, 9], [2, 7, 9, 3, 1], [1, 2, 3, 1], [6]].map((nums) => ({ args: [argLiteral(nums)], expected: outLiteral(robCircular(nums)) }))

  return [
    make('v1', 'fresh values', 'fresh values', INTENT_SAME,
      'You are given an array nums of non-negative integers representing amounts. Choose any subset of positions with no two chosen positions adjacent, and return the largest total you can collect. Positions are 0-based and adjacent means differing by exactly 1.',
      v1, 'exact',
      ['At each position decide between skipping it and taking it plus the best total from two positions back.', 'Carry the two previous best totals instead of a whole table.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same collection task with the boundary inputs. Given nums of non-negative integers, return the largest total with no two chosen positions adjacent. nums may be empty, in which case the answer is 0, or hold a single value, which is simply taken.',
      v2, 'exact',
      ['An empty array allows no collection at all.', 'With [3,5] you must choose one of the two values, not both.']),
    make('v3', 'twist: circle', 'twist, same signature', INTENT_TWIST,
      'Twist: the positions are arranged in a circle, so the first and last elements count as adjacent and cannot both be chosen. Return the largest total with no two chosen neighbours adjacent. A single-element array is its own answer.',
      v3, 'exact',
      ['Split into two ordinary line problems: one without the last element, one without the first.', 'Take the better of the two splits; a one-element array needs no split at all.']),
  ]
}

function buildDpInt(problem, signature, rng) {
  if (!isShape(signature, ['int'], 'int')) return null
  const make = variantFactory(problem, signature, 'step-count drill')

  const v1 = [randInt(rng, 2, 10), randInt(rng, 2, 10), randInt(rng, 2, 10), randInt(rng, 2, 10)].map((n) => ({
    args: [String(n)],
    expected: outLiteral(climbWays(n)),
  }))
  const v2 = [1, 2, 20, 30].map((n) => ({ args: [String(n)], expected: outLiteral(climbWays(n)) }))
  const v3 = [1, 2, 3, 12].map((n) => ({ args: [String(n)], expected: outLiteral(tripleStepWays(n)) }))

  return [
    make('v1', 'fresh sizes', 'fresh sizes', INTENT_SAME,
      'You are climbing a staircase with n steps, and each move climbs either 1 or 2 steps. Return the number of distinct sequences of moves that reach the top. n is between 2 and 10 in this run.',
      v1, 'exact',
      ['The last move either came from one step below or two steps below.', 'Two rolling variables are enough; you never need the whole table.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same staircase task with the boundary sizes. With moves of 1 or 2 steps, return the number of ways to climb n steps for n from 1 up to 30. For n = 1 there is exactly one way.',
      v2, 'exact',
      ['For n = 1 there is a single one-step move.', 'For n = 2 there are two ways: 1+1 and 2.']),
    make('v3', 'twist: three steps', 'twist, same signature', INTENT_TWIST,
      'Twist: each move climbs 1, 2 or 3 steps instead of 1 or 2. Return the number of distinct move sequences that reach the top of an n-step staircase. n is between 1 and 12 in this run.',
      v3, 'exact',
      ['Each total is the sum of the three totals below it.', 'For n = 4 the answer is 7: 1+1+1+1, 1+1+2, 1+2+1, 2+1+1, 2+2, 1+3, 3+1.']),
  ]
}

/* ------------------------------------------------------------------- linked-list -- */

function reverseValues(values) {
  return values.slice().reverse()
}

function swapPairValues(values) {
  const out = values.slice()
  for (let i = 0; i + 1 < out.length; i += 2) {
    const swap = out[i]
    out[i] = out[i + 1]
    out[i + 1] = swap
  }
  return out
}

function listData(rng, length, lo, hi) {
  return sampleRange(rng, length, lo, hi)
}

function buildLinkedListReverse(problem, signature, rng) {
  if (!isShape(signature, ['ListNode'], 'ListNode')) return null
  const make = variantFactory(problem, signature, 'list-rewire drill')

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const values = listData(rng, randInt(rng, 3, 7), 1, 99)
    v1.push({ args: [argLiteral(values)], expected: outLiteral(reverseValues(values)) })
  }
  const v2 = [[1, 2, 3, 4, 5, 6], [], [7], [3, 9]].map((values) => ({ args: [argLiteral(values)], expected: outLiteral(reverseValues(values)) }))
  const v3 = [[1, 2, 3, 4, 5], [1, 2], [1], []].map((values) => ({ args: [argLiteral(values)], expected: outLiteral(swapPairValues(values)) }))

  return [
    make('v1', 'fresh lists', 'fresh lists', INTENT_SAME,
      'You are given the head of a singly linked list of integers. Return the list with its nodes reversed, so the last value becomes the first. The original method name and node type are unchanged.',
      v1, 'exact',
      ['Walk the list once, flipping each next pointer as you go.', 'Save the next node before you overwrite the pointer, or you lose the rest of the list.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same reversal with the boundary lists. head may be empty (return an empty list), a single node (return it unchanged), or two nodes (they simply swap). Reversing a list of even length changes every position.',
      v2, 'exact',
      ['An empty list has no pointer to flip.', 'A single node is already its own reverse.']),
    make('v3', 'twist: swap pairs', 'twist, same signature', INTENT_TWIST,
      'Twist: swap every adjacent pair of values and return the resulting list. For example [1,2,3,4,5] becomes [2,1,4,3,5], and a final unpaired node stays where it is. An empty list stays empty.',
      v3, 'exact',
      ['Handle two nodes at a time and keep the node that follows the pair.', 'For an odd length the last node has no partner and keeps its place.']),
  ]
}

/**
 * Remove-nth-node-from-end-of-list drills. Independent oracle: two-pass
 * length-count splice (never the adapter's one-pass dummy + fast/slow gap walk).
 * Walkthrough bound respected: every list has sz <= 8 (linked-adapters
 * REMOVE_NTH_MAX_NODES); judge allows sz <= 30, values 0..100.
 */
function oracleRemoveNth(values, n) {
  const idx = values.length - n
  return values.slice(0, idx).concat(values.slice(idx + 1))
}

/** Twist oracle: remove the nth node from the START (1-indexed), same types. */
function oracleRemoveNthFromStart(values, n) {
  return values.slice(0, n - 1).concat(values.slice(n))
}

function buildLinkedListRemoveNth(problem, signature, rng) {
  if (!problem || problem.slug !== 'remove-nth-node-from-end-of-list') return null
  if (!isShape(signature, ['ListNode', 'int'], 'ListNode')) return null
  const make = variantFactory(problem, signature, 'gap-walk drill')

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const len = randInt(rng, 3, 8)
    const values = listData(rng, len, 0, 100)
    const at = randInt(rng, 1, len)
    v1.push({ args: [argLiteral(values), String(at)], expected: outLiteral(oracleRemoveNth(values, at)) })
  }
  const v2 = [[[8], 1], [[1, 2], 2], [[1, 2, 3], 1], [[4, 4, 4, 4], 2], [[10, 20, 30, 40, 50], 5]].map(([values, at]) => ({
    args: [argLiteral(values), String(at)],
    expected: outLiteral(oracleRemoveNth(values, at)),
  }))
  const v3 = [[[1, 2, 3, 4, 5], 2], [[1, 2, 3, 4, 5], 1], [[7], 1], [[9, 9, 9], 3]].map(([values, at]) => ({
    args: [argLiteral(values), String(at)],
    expected: outLiteral(oracleRemoveNthFromStart(values, at)),
  }))

  return [
    make('v1', 'fresh lists', 'fresh lists', INTENT_SAME,
      'Given the head of a linked list, remove the nth node from the end of the list and return its head. Fresh seeded lists below; the rule is unchanged. Values are between 0 and 100; n is always valid for the list.',
      v1, 'exact',
      ['Advance fast n+1 steps from the dummy (not n) so slow stops BEFORE the target.', 'A dummy head removes the delete-the-head special case entirely.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same end-relative removal with the boundary inputs. The list may hold a single node, the target may be the head or the tail, and values may repeat. Return the list head after removal; a single node with n = 1 returns an empty list.',
      v2, 'exact',
      ['A single node with n = 1 must return an empty list, not crash.', 'When n equals the length, slow never leaves the dummy — return dummy.next.']),
    make('v3', 'twist: nth from start', 'twist, same signature', INTENT_TWIST,
      'Twist with a changed rule, signature preserved: given the head of a linked list, remove the nth node from the START (1-indexed) and return its head. For example head = [1,2,3,4,5], n = 2 gives [1,3,4,5].',
      v3, 'exact',
      ['Count from the front this time: stop one node BEFORE position n.', 'The dummy head still avoids a delete-the-head special case.']),
  ]
}

/* -------------------------------------------------------------------- intervals -- */

function mergeIntervals(intervals, strict) {
  const rows = intervals.map((row) => [Number(row[0]), Number(row[1])]).sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const out = []
  for (const row of rows) {
    const last = out[out.length - 1]
    const overlaps = last !== undefined && (strict ? row[0] < last[1] : row[0] <= last[1])
    if (overlaps) last[1] = Math.max(last[1], row[1])
    else out.push([row[0], row[1]])
  }
  return out
}

function intervalData(rng, count, startLo, startHi, lengthHi) {
  const out = []
  for (let i = 0; i < count; i += 1) {
    const start = randInt(rng, startLo, startHi)
    out.push([start, start + randInt(rng, 1, lengthHi)])
  }
  return shuffled(rng, out)
}

function buildIntervalsMerge(problem, signature, rng) {
  if (!isShape(signature, ['int[][]'], 'int[][]')) return null
  const make = variantFactory(problem, signature, 'interval-merge drill')

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const intervals = intervalData(rng, randInt(rng, 2, 5), 0, 12, 4)
    v1.push({ args: [argLiteral(intervals)], expected: outLiteral(mergeIntervals(intervals, false)) })
  }
  const v2 = [[[1, 10], [2, 3]], [], [[1, 4]], [[5, 7], [1, 3], [2, 4]]].map((intervals) => ({
    args: [argLiteral(intervals)],
    expected: outLiteral(mergeIntervals(intervals, false)),
  }))
  const v3 = [[[1, 3], [3, 5]], [[1, 4], [2, 3], [4, 6]], [[1, 2], [3, 4], [2, 3]]].map((intervals) => ({
    args: [argLiteral(intervals)],
    expected: outLiteral(mergeIntervals(intervals, true)),
  }))

  return [
    make('v1', 'fresh intervals', 'fresh intervals', INTENT_SAME,
      'Given a list of intervals [start, end], merge every pair that overlaps or touches. An interval ending at 3 counts as touching one that starts at 3, and single points are not part of the input. Return the merged intervals ordered by start.',
      v1, 'unordered',
      ['Sort by start before merging anything.', 'While the next start is within the current end, extend the current end instead of emitting a new interval.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same merge task with the boundary inputs. The list may be empty, hold a single interval, arrive unsorted, or contain one interval completely inside another. Return the merged intervals ordered by start; an empty list stays empty.',
      v2, 'unordered',
      ['An empty input produces an empty output, not a crash.', 'A nested interval only extends nothing — keep the outer end.']),
    make('v3', 'twist: strict overlap', 'twist, same signature', INTENT_TWIST,
      'Twist: merge only intervals that overlap by at least one unit. Intervals that merely share an endpoint, such as [1,3] and [3,5], must stay separate. Return the result ordered by start.',
      v3, 'unordered',
      ['Change the merge test from <= to <.', 'After merging, a later interval can still overlap the extended end, so keep comparing.']),
  ]
}

/* ------------------------------------------------------------ intervals-insert -- */

/**
 * Distinct oracle for insert-interval (not the adapter's 3-phase sweep): append the
 * new interval to the rows, sort everything by start, then run one merge sweep.
 * Same result, wholly different control flow. strict=true is the v3 twist.
 */
function oracleInsertAll(intervals, newInterval, strict) {
  const rows = intervals.map((row) => [Number(row[0]), Number(row[1])])
  rows.push([Number(newInterval[0]), Number(newInterval[1])])
  rows.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))
  const out = []
  for (const row of rows) {
    const last = out[out.length - 1]
    const overlaps = last !== undefined && (strict ? row[0] < last[1] : row[0] <= last[1])
    if (overlaps) last[1] = Math.max(last[1], row[1])
    else out.push([row[0], row[1]])
  }
  return out
}

/** Sorted, strictly-disjoint rows (gaps >= 1, so no touching pairs). */
function disjointRowsInsert(rng, count, lo, hi, maxLen) {
  const rows = []
  let cursor = randInt(rng, lo, Math.min(lo + 3, hi))
  for (let k = 0; k < count; k += 1) {
    const start = cursor + (k === 0 ? 0 : randInt(rng, 1, 3))
    if (start > hi) break
    const end = Math.min(hi, start + randInt(rng, 0, maxLen))
    rows.push([start, end])
    cursor = end + 1
    if (cursor > hi) break
  }
  return rows
}

function buildIntervalsInsert(problem, signature, rng) {
  if (!problem || problem.slug !== 'insert-interval') return null
  if (!isShape(signature, ['int[][]', 'int[]'], 'int[][]')) return null
  const make = variantFactory(problem, signature, 'interval-insert drill')

  const v1 = []
  for (let k = 0; k < 4; k += 1) {
    const rows = disjointRowsInsert(rng, randInt(rng, 2, 5), 0, 18, 4)
    const hi = rows.length > 0 ? rows[rows.length - 1][1] + 3 : 10
    const a = randInt(rng, 0, hi)
    const b = randInt(rng, 0, hi)
    const nw = [Math.min(a, b), Math.max(a, b)]
    v1.push({ args: [argLiteral(rows), argLiteral(nw)], expected: outLiteral(oracleInsertAll(rows, nw, false)) })
  }
  const v2 = [
    [[], [5, 7]],
    [[[5, 7]], [1, 2]],
    [[[1, 2]], [5, 7]],
    [[[2, 3], [6, 8]], [0, 10]],
    [[[1, 3], [6, 9]], [3, 6]],
  ].map(([rows, nw]) => ({
    args: [argLiteral(rows), argLiteral(nw)],
    expected: outLiteral(oracleInsertAll(rows, nw, false)),
  }))
  const v3 = [
    [[[1, 3], [6, 9]], [3, 6]],
    [[[1, 2], [5, 6]], [2, 5]],
    [[[1, 3], [4, 6]], [3, 4]],
  ].map(([rows, nw]) => ({
    args: [argLiteral(rows), argLiteral(nw)],
    expected: outLiteral(oracleInsertAll(rows, nw, true)),
  }))
  const extra = disjointRowsInsert(rng, 3, 0, 12, 3)
  const ea = randInt(rng, 0, 14)
  const extraNw = [ea, ea + randInt(rng, 0, 2)]
  v3.push({
    args: [argLiteral(extra), argLiteral(extraNw)],
    expected: outLiteral(oracleInsertAll(extra, extraNw, true)),
  })

  return [
    make('v1', 'fresh intervals', 'fresh intervals', INTENT_SAME,
      'Insert newInterval into the sorted disjoint list intervals, merging every overlap. Touching endpoints merge: an interval ending at 3 overlaps one starting at 3. Return the still-sorted disjoint list. Rows arrive sorted with gaps of at least one; the new interval may sit anywhere.',
      v1, 'unordered',
      ['Compare the row end against the new start for the before-phase, and the row start against the new end for the overlap phase.', 'Emit the live merged range exactly once, between the two pass-through runs.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same insert-and-merge task on boundary inputs. The row list may be empty, the new interval may land fully before or after all rows, cover every row, or touch rows exactly at shared endpoints, which still merge. Return the sorted disjoint result.',
      v2, 'unordered',
      ['An empty row list returns just the new interval; no special crash path is needed.', 'A new interval strictly inside a row still counts as overlap even though nothing widens.']),
    make('v3', 'twist: strict overlap', 'twist, same signature', INTENT_TWIST,
      'Twist with a changed rule: merge only on strict overlap. Intervals that merely touch at a shared endpoint, such as [1,3] and [3,5], must stay separate. Insert newInterval into the sorted disjoint list under this rule and return the sorted result. The method name and parameter types are unchanged.',
      v3, 'unordered',
      ['Flip the overlap test from start <= end to start < end, and move the before-phase boundary with it.', 'After flipping, a new interval exactly filling a gap touches both neighbours yet merges with neither.']),
  ]
}

/* ------------------------------------------------------------ intervals-erase -- */

/**
 * Distinct oracle for erase-overlap (not the adapter's end-sort greedy sweep):
 * exhaustive maximum non-overlapping subset for n <= 20 (touching counts as
 * non-overlapping), answer = n - best. O(n^2) longest-chain DP fallback above.
 * Same formulation as the staged P13 oracle, ported as file-local helpers
 * (no verbatim helper copies — shared randInt/shuffled reused).
 */
function oracleEraseRemovals(intervals) {
  const rows = intervals.map((row) => [Number(row[0]), Number(row[1])])
  const n = rows.length
  if (n === 0) return 0
  const disjoint = (a, b) => a[1] <= b[0] || b[1] <= a[0]
  if (n <= 20) {
    let best = 0
    for (let mask = 0; mask < (1 << n); mask += 1) {
      let ok = true
      let size = 0
      for (let i = 0; i < n && ok; i += 1) {
        if (!(mask & (1 << i))) continue
        size += 1
        for (let j = i + 1; j < n; j += 1) {
          if ((mask & (1 << j)) && !disjoint(rows[i], rows[j])) { ok = false; break }
        }
      }
      if (ok && size > best) best = size
    }
    return n - best
  }
  const byEnd = rows.slice().sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]))
  const dp = new Array(n).fill(1)
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < i; j += 1) {
      if (byEnd[j][1] <= byEnd[i][0]) dp[i] = Math.max(dp[i], dp[j] + 1)
    }
  }
  return n - Math.max(...dp)
}

/** Fresh same-task input: `count` intervals with endpoints in [-span, span], start < end. */
function eraseFresh(rng, count, span) {
  const out = []
  for (let k = 0; k < count; k += 1) {
    let a = randInt(rng, -span, span)
    let b = randInt(rng, -span, span)
    if (a === b) b = a < span ? a + 1 : a - 1
    if (a > b) { const t = a; a = b; b = t }
    out.push([a, b])
  }
  return out
}

function buildEraseOverlap(problem, signature, rng) {
  if (!problem || problem.slug !== 'non-overlapping-intervals') return null
  if (!isShape(signature, ['int[][]'], 'int')) return null
  const make = variantFactory(problem, signature, 'interval-erase drill')

  // n <= 12 keeps every generated input inside the live walkthrough visual bound.
  const v1 = []
  for (let k = 0; k < 4; k += 1) {
    const intervals = eraseFresh(rng, randInt(rng, 2, 8), 12)
    v1.push({ args: [argLiteral(intervals)], expected: outLiteral(oracleEraseRemovals(intervals)) })
  }
  // 5 staged edges (live 5-test cap; nested/negative/unsorted omitted as redundant
  // under the exact judge — same overlap facts as the kept cases).
  const v2 = [
    [[1, 2], [2, 3], [3, 4], [1, 3]],
    [[1, 2], [1, 2], [1, 2]],
    [[1, 2], [2, 3]],
    [[1, 2], [2, 3], [3, 4], [4, 5]],
    [[1, 100], [2, 3], [4, 5], [6, 7]],
  ].map((intervals) => ({
    args: [argLiteral(intervals)],
    expected: outLiteral(oracleEraseRemovals(intervals)),
  }))
  // Same-task adversarial shapes only: no rule change (touching must stay
  // non-overlapping under the exact judge, so no strict-overlap twist).
  const v3 = [
    [[1, 4], [2, 5], [3, 6], [4, 7], [5, 8]],
    [[1, 3], [3, 5], [2, 4], [4, 6], [5, 7]],
  ].map((intervals) => ({
    args: [argLiteral(intervals)],
    expected: outLiteral(oracleEraseRemovals(intervals)),
  }))
  for (let k = 0; k < 2; k += 1) {
    const intervals = eraseFresh(rng, randInt(rng, 8, 12), 20)
    v3.push({ args: [argLiteral(intervals)], expected: outLiteral(oracleEraseRemovals(intervals)) })
  }

  return [
    make('v1', 'fresh intervals', 'fresh intervals', INTENT_SAME,
      'Given intervals[i] = [starti, endi], return the minimum number of intervals to remove so the rest are non-overlapping. Intervals touching at a point, such as [1,2] and [2,3], are non-overlapping. Every test uses fresh intervals; the method name and parameter types are unchanged.',
      v1, 'exact',
      ['Sort by end time, then keep an interval only when its start reaches the running end.', 'The overlap test is strict: start < prevEnd overlaps, start == prevEnd is kept.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same erase-overlap task with the boundary inputs. The list may hold a single interval, identical intervals, a touching chain, the three official examples, or one long interval hiding short ones that all fit. A single interval needs zero removals; touching endpoints never count as overlap.',
      v2, 'exact',
      ['Sorting by start instead of end keeps the long interval and removes three — the classic trap.', 'Identical intervals pairwise overlap, so only one survives.']),
    make('v3', 'adversarial shapes', 'adversarial shapes', 'Same question with adversarial shapes that punish start-sort greedy.',
      'Same erase-overlap question with adversarial shapes that punish start-sort greedy. Dense sliding windows and a shuffled touching chain hide the optimal kept set; end-sort recovers it. No rule change: touching intervals stay non-overlapping, and the signature and exact comparison are unchanged.',
      v3, 'exact',
      ['A dense chain keeps every other interval, not every third.', 'Shuffled input must be end-sorted before the sweep; the given order is a trap.']),
  ]
}

/* ------------------------------------------------------------------ graph-dfs -- */

/** Areas of every 4-connected group of 1s, in scan order. Cells may be 0/1 numbers. */
function islandAreas(grid) {
  const values = grid.map((row) => row.map((cell) => Number(cell)))
  const rows = values.length
  const cols = values[0].length
  const seen = values.map((row) => row.map(() => false))
  const areas = []
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (values[r][c] !== 1 || seen[r][c]) continue
      let area = 0
      const stack = [[r, c]]
      seen[r][c] = true
      while (stack.length > 0) {
        const cell = stack.pop()
        area += 1
        for (const dir of dirs) {
          const nr = cell[0] + dir[0]
          const nc = cell[1] + dir[1]
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
          if (values[nr][nc] !== 1 || seen[nr][nc]) continue
          seen[nr][nc] = true
          stack.push([nr, nc])
        }
      }
      areas.push(area)
    }
  }
  return areas
}

function countIslands(grid) {
  return islandAreas(grid).length
}

function maxIslandArea(grid) {
  const areas = islandAreas(grid)
  return areas.length === 0 ? 0 : Math.max(...areas)
}

function minIslandArea(grid) {
  const areas = islandAreas(grid)
  return areas.length === 0 ? 0 : Math.min(...areas)
}

/** 4-connected groups of 0s; the ocean around the edges counts like any region. */
function countWater(grid) {
  const values = grid.map((row) => row.map((cell) => Number(cell)))
  const rows = values.length
  const cols = values[0].length
  const seen = values.map((row) => row.map(() => false))
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  let count = 0
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (values[r][c] !== 0 || seen[r][c]) continue
      count += 1
      const stack = [[r, c]]
      seen[r][c] = true
      while (stack.length > 0) {
        const cell = stack.pop()
        for (const dir of dirs) {
          const nr = cell[0] + dir[0]
          const nc = cell[1] + dir[1]
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
          if (values[nr][nc] !== 0 || seen[nr][nc]) continue
          seen[nr][nc] = true
          stack.push([nr, nc])
        }
      }
    }
  }
  return count
}

function gridData(rng, rows, cols, landChance) {
  const grid = []
  for (let r = 0; r < rows; r += 1) {
    const row = []
    for (let c = 0; c < cols; c += 1) row.push(rng() < landChance ? 1 : 0)
    grid.push(row)
  }
  return grid
}

function buildGraphGrid(problem, signature, rng) {
  const slug = problem && problem.slug
  const island = slug === 'number-of-islands' && isShape(signature, ['char[][]'], 'int')
  const area = slug === 'max-area-of-island' && isShape(signature, ['int[][]'], 'int')
  if (!island && !area) return null
  const make = variantFactory(problem, signature, island ? 'island-count drill' : 'island-area drill')
  const solve = island ? countIslands : maxIslandArea
  const twist = island ? countWater : minIslandArea

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const grid = gridData(rng, randInt(rng, 3, 5), randInt(rng, 3, 6), 0.45)
    v1.push({ args: [argLiteral(grid)], expected: outLiteral(solve(grid)) })
  }
  const edges = island
    ? [[[1]], [[0]], [[1, 1], [1, 1]], [[0, 0], [0, 0]]]
    : [[[0]], [[1]], [[0, 0, 0], [0, 0, 0], [0, 0, 0]], [[1, 1], [1, 1]]]
  const v2 = edges.map((grid) => ({ args: [argLiteral(grid)], expected: outLiteral(solve(grid)) }))
  const v3 = []
  for (let n = 0; n < 4; n += 1) {
    const grid = gridData(rng, randInt(rng, 2, 5), randInt(rng, 2, 5), 0.5)
    v3.push({ args: [argLiteral(grid)], expected: outLiteral(twist(grid)) })
  }

  const sameStatement = island
    ? 'You are given a rectangular binary grid where 1 marks land and 0 marks water. An island is a group of 1s connected horizontally or vertically, and the grid edges are surrounded by water. Count how many islands the grid holds. Test grids are small, at most 5 rows by 6 columns.'
    : 'You are given a rectangular binary matrix where an island is a group of 1s connected horizontally or vertically. The area of an island is its cell count, and a matrix with no land has answer 0. Return the largest island area. Test grids are small, at most 5 rows by 6 columns.'
  const edgeStatement = island
    ? 'Same island count with the boundary grids. The grid may be a single cell, all land, or all water. A 1x1 grid holding 1 is one island, a 1x1 grid holding 0 is none, and a solid 2x2 block of land is a single island.'
    : 'Same largest-area task with the boundary grids. The grid may be a single cell or solid water or solid land. A 3x3 grid of only 0s has answer 0, and a solid 2x2 block of land has area 4.'
  const twistStatement = island
    ? 'Twist: count regions of water instead of land. A water region is a group of 0s connected horizontally or vertically, and the ocean touching the grid edges counts like any other region. Return how many such regions the grid holds.'
    : 'Twist: return the area of the smallest island instead of the largest. An island is a group of 1s connected horizontally or vertically, and its area is its cell count. When the grid holds no island, return 0.'
  const sameHints = island
    ? ['Walk every cell once and flood-fill each unvisited land cell you meet.', 'Mark visited land as you flood so each island is counted exactly once.']
    : ['Flood-fill each island to measure it, then keep the largest measurement.', 'A grid with no 1s at all must return 0, not crash.']
  const twistHints = island
    ? ['Run the same flood-fill idea with the roles swapped: spread through 0s.', 'Corner-touching water still connects only through shared edges, not diagonals.']
    : ['Measure every island exactly as before, then keep the minimum instead.', 'Skip the empty case carefully: no islands means the answer is 0.']

  return [
    make('v1', 'fresh grids', 'fresh grids', INTENT_SAME, sameStatement, v1, 'exact', sameHints),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE, edgeStatement, v2, 'exact',
      ['A single cell is the smallest grid the task allows.', 'All-land and all-water grids test whether both extremes behave.']),
    make('v3', island ? 'twist: water regions' : 'twist: smallest island', 'twist, same signature', INTENT_TWIST, twistStatement, v3, 'exact', twistHints),
  ]
}

/* ------------------------------------------------------------ subtree (P26) -- */

/**
 * Level-order tree build + serialization-membership oracle for
 * subtree-of-another-tree (NOT the recursive pairwise adapter): every subtree
 * of root is serialized with explicit '#' null markers and ',' separators,
 * then membership against the serialized subRoot is tested. Staged in P26.
 */
function subtreeLevelBuild(level) {
  if (!Array.isArray(level) || level.length === 0 || level[0] === null || level[0] === undefined) {
    return { root: null, nodes: [] }
  }
  let id = 0
  const root = { id: id++, value: level[0], left: null, right: null }
  const queue = [root]
  const nodes = [root]
  let cursor = 1
  for (let head = 0; head < queue.length && cursor < level.length; head += 1) {
    const parent = queue[head]
    for (const side of ['left', 'right']) {
      if (cursor >= level.length) break
      const v = level[cursor++]
      if (v === null || v === undefined) continue
      const child = { id: id++, value: v, left: null, right: null }
      parent[side] = child
      queue.push(child)
      nodes.push(child)
    }
  }
  return { root, nodes }
}

function subtreeLevelSerialize(node) {
  if (node === null) return '#'
  return node.value + ',' + subtreeLevelSerialize(node.left) + ',' + subtreeLevelSerialize(node.right)
}

function oracleSubtreeLevel(levelA, levelB) {
  const built = subtreeLevelBuild(levelA)
  const sub = subtreeLevelBuild(levelB)
  if (sub.root === null) return true
  if (built.root === null) return false
  const target = subtreeLevelSerialize(sub.root)
  const stack = [built.root]
  while (stack.length > 0) {
    const node = stack.pop()
    if (subtreeLevelSerialize(node) === target) return true
    if (node.left !== null) stack.push(node.left)
    if (node.right !== null) stack.push(node.right)
  }
  return false
}

function subtreeLevelOf(node) {
  if (node === null) return []
  const out = []
  const queue = [node]
  while (queue.length > 0) {
    const next = queue.shift()
    if (next === null) {
      out.push(null)
      continue
    }
    out.push(next.value)
    queue.push(next.left)
    queue.push(next.right)
  }
  while (out.length > 0 && out[out.length - 1] === null) out.pop()
  return out
}

function buildSubtree(problem, signature, rng) {
  if (!problem || problem.slug !== 'subtree-of-another-tree') return null
  if (!isShape(signature, ['TreeNode', 'TreeNode'], 'boolean')) return null
  const make = variantFactory(problem, signature, 'subtree drill')
  const toTest = (levelA, levelB) => ({
    args: [argLiteral(levelA), argLiteral(levelB)],
    expected: outLiteral(oracleSubtreeLevel(levelA, levelB)),
  })

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const rootLevel = []
    const rootSize = randInt(rng, 1, 9)
    for (let k = 0; k < rootSize; k += 1) rootLevel.push(randInt(rng, -3, 5))
    let subLevel
    if (rng() < 0.4) {
      const built = subtreeLevelBuild(rootLevel)
      const pick = built.nodes[randInt(rng, 0, built.nodes.length - 1)]
      subLevel = subtreeLevelOf(pick)
      if (subLevel.length === 0) subLevel = [built.root.value]
    } else {
      subLevel = []
      const subSize = randInt(rng, 1, 4)
      for (let k = 0; k < subSize; k += 1) subLevel.push(randInt(rng, -3, 5))
    }
    v1.push(toTest(rootLevel, subLevel))
  }
  // Fixed edges (5 of the 8 staged P26 edges; live variants cap at 5 tests).
  // Omitted as redundant here: identical single-node true, larger-pattern
  // false, negative-values true (all covered by the same pairwise logic).
  const v2 = [
    [['7'], ['8']],
    [[4, 1, 2, null, null, 0], [4, 1, 2]],
    [[1, 2, 3, null, null, 4, 5], [3, 4, 5]],
    [[1, 1, 1], [1, null, 1]],
    [[3, 4, 5, 1, 2], [3, 4, 5, 1, 2]],
  ].map(([a, b]) => toTest(a, b))
  // Adversarial same-task placements (no rule change): duplicate-heavy runs,
  // right-leaning chains, near-miss shapes. The staged count/mirror
  // rule-change challenges are excluded: count returns int (shape violation)
  // and mirror changes acceptance (unsound under exact).
  const v3 = [
    [[2, 2, 2, 2, 2], [2, 2, 2]],
    [[1, null, 2, null, 3], [2, null, 3]],
    [[1, 2, 3], [2, null, 3]],
    [[5, 4, 6, 3, null, null, 7], [4, 3]],
  ].map(([a, b]) => toTest(a, b))

  return [
    make('v1', 'fresh trees', 'fresh trees', INTENT_SAME,
      'Given the roots of two binary trees root and subRoot as level-order arrays, return true if some subtree of root has the same structure and node values as subRoot, and false otherwise. A subtree is a node plus all of its descendants, and a tree counts as a subtree of itself. These fresh inputs use small seeded trees with values between -3 and 5.',
      v1, 'exact',
      ['Try each root node as an anchor in preorder; at each anchor compare the full shape, not just the top value.', 'Both null-vs-node structure and values must agree at every paired position.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same subtree task with the boundary inputs. Given root and subRoot as level-order arrays, return true exactly when a subtree of root matches subRoot in both structure and values. Inputs include single nodes, a value-matching prefix with one extra descendant, a deep-right anchor, duplicate values with distinct shapes, and a tree compared with itself.',
      v2, 'exact',
      ['The whole tree always counts — check the top anchor first.', 'Left-null versus left-node splits reject before any value can save the anchor.']),
    make('v3', 'adversarial shapes', 'adversarial shapes', 'Same question with adversarial placements that punish anchor-skipping shortcuts.',
      'Same subtree question with adversarial placements that punish anchor-skipping shortcuts. Given root and subRoot as level-order arrays, return true exactly when some anchored subtree matches in structure and values. Duplicate-heavy runs, right-leaning chains, and near-miss shapes stress the full pairwise check at every anchor. No rule change: the signature and exact comparison are unchanged.',
      v3, 'exact',
      ['Do not stop after the root anchor rejects — keep scanning both sides.', 'A leaf anchor can never accept a pattern that still has children.']),
  ]
}

/* ----------------------------------------------------- construct-tree (P23) -- */

/**
 * Preorder/inorder reconstruction drills for
 * construct-binary-tree-from-preorder-and-inorder-traversal (NOT the
 * map+cursor recursion adapter): iterative explicit-stack reconstruction
 * returning the LeetCode level-order array (trailing nulls trimmed).
 * Staged in P23 (practice.mjs oracleLevel). Every input carries distinct
 * values with inorder a permutation of preorder, per the constraints.
 */
function constructPreorderOf(node, out) {
  if (node === null) return out
  out.push(node.value)
  constructPreorderOf(node.left, out)
  constructPreorderOf(node.right, out)
  return out
}

function constructInorderOf(node, out) {
  if (node === null) return out
  constructInorderOf(node.left, out)
  out.push(node.value)
  constructInorderOf(node.right, out)
  return out
}

function constructLevelOf(node) {
  if (node === null) return []
  const out = []
  const queue = [node]
  while (queue.length > 0) {
    const cur = queue.shift()
    if (cur === null) { out.push(null); continue }
    out.push(cur.value)
    queue.push(cur.left, cur.right)
  }
  while (out.length > 0 && out[out.length - 1] === null) out.pop()
  return out
}

/** Distinct oracle: iterative stack build (no index map, no recursion). */
function oracleConstructLevel(preorder, inorder) {
  if (preorder.length === 0) return []
  const root = { value: preorder[0], left: null, right: null }
  const stack = [root]
  let inIdx = 0
  for (let i = 1; i < preorder.length; i += 1) {
    const node = { value: preorder[i], left: null, right: null }
    let parent = null
    while (stack.length > 0 && stack[stack.length - 1].value === inorder[inIdx]) {
      parent = stack.pop()
      inIdx += 1
    }
    if (parent === null) stack[stack.length - 1].left = node
    else parent.right = node
    stack.push(node)
  }
  return constructLevelOf(root)
}

/** Random binary-tree shape over distinct values (staged P23 randomTree). */
function constructRandomTree(rng, values) {
  if (values.length === 0) return null
  const cut = Math.floor(rng() * values.length)
  return {
    value: values[0],
    left: constructRandomTree(rng, values.slice(1, cut + 1)),
    right: constructRandomTree(rng, values.slice(cut + 1)),
  }
}

function constructChain(values, side) {
  let root = null
  for (let i = values.length - 1; i >= 0; i -= 1) {
    root = side === 'left'
      ? { value: values[i], left: root, right: null }
      : { value: values[i], left: null, right: root }
  }
  return root
}

function constructBalanced(values) {
  if (values.length === 0) return null
  const mid = Math.floor(values.length / 2)
  return {
    value: values[mid],
    left: constructBalanced(values.slice(0, mid)),
    right: constructBalanced(values.slice(mid + 1)),
  }
}

function buildConstructTree(problem, signature, rng) {
  if (!problem || problem.slug !== 'construct-binary-tree-from-preorder-and-inorder-traversal') return null
  if (!isShape(signature, ['int[]', 'int[]'], 'TreeNode')) return null
  const make = variantFactory(problem, signature, 'tree-build drill')
  const toTest = (tree) => {
    const preorder = constructPreorderOf(tree, [])
    const inorder = constructInorderOf(tree, [])
    return {
      args: [argLiteral(preorder), argLiteral(inorder)],
      expected: outLiteral(oracleConstructLevel(preorder, inorder)),
    }
  }

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    v1.push(toTest(constructRandomTree(rng, sampleRange(rng, randInt(rng, 2, 8), -9, 9))))
  }
  // Fixed edges (subset of the staged P23 edge list; live variants cap at 5).
  const v2 = [
    { value: -7, left: null, right: null },
    constructChain([10, 20, 30, 40, 50], 'left'),
    constructChain([5, 4, 3, 2, 1], 'right'),
    constructBalanced([1, 2, 3, 4, 5, 6, 7]),
    { value: 0, left: { value: -3000, left: null, right: { value: -1, left: null, right: null } }, right: { value: 3000, left: null, right: null } },
  ].map(toTest)
  // Adversarial same-task shapes (no rule change): deep skewed chains plus a
  // wide-range tree. The signature and exact comparison are unchanged.
  const v3 = [
    constructChain(sampleRange(rng, 10, -50, 50), 'left'),
    constructChain(sampleRange(rng, 10, -50, 50), 'right'),
    constructRandomTree(rng, sampleRange(rng, 12, -3000, 3000)),
    constructBalanced(sampleRange(rng, 15, -50, 50)),
  ].map(toTest)

  return [
    make('v1', 'fresh trees', 'fresh trees', INTENT_SAME,
      'Given preorder and inorder traversals of a binary tree with distinct integer values, reconstruct the tree and report its level-order array with trailing empty positions omitted. These fresh inputs use small seeded trees of 2 to 8 nodes with values between -9 and 9. The signature and exact-match judge mode are unchanged.',
      v1, 'exact',
      ['The first preorder value is the root; split inorder at that value and recurse.', 'Consume preorder strictly in order — each subtree takes a contiguous slice.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same reconstruction task with the boundary shapes. Inputs include a single node, a left-only chain, a right-only chain, a balanced 7-node tree, and mixed negative values with zero. Every inorder array is a permutation of its preorder array.',
      v2, 'exact',
      ['A one-node tree has identical preorder and inorder arrays.', 'In a left-only chain every inorder split leaves an empty right slice.']),
    make('v3', 'adversarial shapes', 'adversarial shapes', 'Same question with adversarial shapes that punish preorder-order shortcuts.',
      'Same reconstruction question with adversarial shapes that punish preorder-order shortcuts. Given preorder and inorder arrays, rebuild the tree and report its level-order array. Deep skewed chains, a wide value range, and a 15-node balanced tree stress the split discipline. No rule change: the signature and exact comparison are unchanged.',
      v3, 'exact',
      ['Depth is O(n) worst case on skewed input; watch the recursion path grow.', 'The value lookup works for any integer — do not special-case zero or negatives.']),
  ]
}

/* ------------------------------------------------------- max-path-sum (P22) -- */

/**
 * Maximum-path-sum drills for binary-tree-maximum-path-sum (NOT the post-order
 * gain-DP adapter): brute-force enumeration of all simple paths over the
 * undirected tree (O(n^2) BFS-per-start), returning the max sum. Staged in P22
 * (practice.js bruteForceMaxPath). All inputs are same-task level-order arrays.
 */
function maxPathLevelBuild(level) {
  if (!Array.isArray(level) || level.length === 0 || level[0] === null || level[0] === undefined) {
    return { root: null, nodes: [] }
  }
  let id = 0
  const root = { id: id++, value: level[0], left: null, right: null }
  const queue = [root]
  const nodes = [root]
  let cursor = 1
  for (let head = 0; head < queue.length && cursor < level.length; head += 1) {
    const parent = queue[head]
    for (const side of ['left', 'right']) {
      if (cursor >= level.length) break
      const v = level[cursor++]
      if (v === null || v === undefined) continue
      const child = { id: id++, value: v, left: null, right: null }
      parent[side] = child
      queue.push(child)
      nodes.push(child)
    }
  }
  return { root, nodes }
}

/** Distinct oracle: max over all simple paths (undirected), DFS-per-start. */
function oracleMaxPathLevel(level) {
  const built = maxPathLevelBuild(level)
  if (built.root === null) return null
  const adj = new Map(built.nodes.map((n) => [n.id, []]))
  for (const n of built.nodes) {
    for (const c of [n.left, n.right]) {
      if (c === null || c === undefined) continue
      adj.get(n.id).push(c.id)
      adj.get(c.id).push(n.id)
    }
  }
  const val = new Map(built.nodes.map((n) => [n.id, n.value]))
  let best = -Infinity
  for (const s of built.nodes) {
    const stack = [{ id: s.id, sum: val.get(s.id), seen: new Set([s.id]) }]
    while (stack.length > 0) {
      const cur = stack.pop()
      if (cur.sum > best) best = cur.sum
      for (const nb of adj.get(cur.id)) {
        if (cur.seen.has(nb)) continue
        const seen = new Set(cur.seen)
        seen.add(nb)
        stack.push({ id: nb, sum: cur.sum + val.get(nb), seen })
      }
    }
  }
  return best
}

function buildMaxPathSum(problem, signature, rng) {
  if (!problem || problem.slug !== 'binary-tree-maximum-path-sum') return null
  if (!isShape(signature, ['TreeNode'], 'int')) return null
  const make = variantFactory(problem, signature, 'path-sum drill')
  const toTest = (level) => ({
    args: [argLiteral(level.slice())],
    expected: outLiteral(oracleMaxPathLevel(level)),
  })

  const v1 = []
  for (let n = 0; n < 4; n += 1) {
    const size = randInt(rng, 2, 8)
    const level = []
    for (let k = 0; k < size; k += 1) {
      if (k > 0 && rng() < 0.15) level.push(null)
      else level.push(randInt(rng, -9, 9))
    }
    if (level[0] === null || level[0] === undefined) level[0] = randInt(rng, -9, 9)
    v1.push(toTest(level))
  }
  // Fixed edges (5 of the staged P22 edges; live variants cap at 5 tests).
  // Omitted as redundant here: single-positive [5] and all-zero [0,0,0]
  // (covered by the same clamp/max-single logic).
  const v2 = [
    [-3],
    [-2, -1, -3],
    [-10, 9, 20],
    [2, 3, null, 4, null, null, null, 5],
    [1, -2, -3],
  ].map((level) => toTest(level))
  // Adversarial same-task shapes (no rule change): deep cross-subtree path,
  // official negative-root sample, all-negative shape, negative-leaf drop.
  // The staged no-clamp / one-deletion rule-change challenges are excluded:
  // they change acceptance and are unsound under exact.
  const v3 = [
    [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1],
    [-10, 9, 20, null, null, 15, 7],
    [-5, -1, -2, -3, -4],
    [2, -1],
  ].map((level) => toTest(level))

  return [
    make('v1', 'fresh trees', 'fresh trees', INTENT_SAME,
      'Given the root of a binary tree as a level-order array, return the maximum path sum of any non-empty path. A path may start and end at any nodes and must not reuse a node. These fresh inputs use small seeded trees of 2 to 8 nodes with values between -9 and 9. The signature and exact-match judge mode are unchanged.',
      v1, 'exact',
      ['For each node compute the best downward gain; a path through the node can use both sides but only one side goes up.', 'Clamp negative child gains to 0, update the global best with val+L+R, and return val+max(L,R).']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same path-sum task with the boundary inputs. Given the root as a level-order array, return the maximum path sum of any non-empty path. Inputs include a single negative node, an all-negative chain, a negative root with the best below, a skewed left chain, and a both-sides-clamped root.',
      v2, 'exact',
      ['With all-negative values the answer is the single largest node; the clamp turns every child into 0.', 'Trace which sides survive the max(.,0) clamp.']),
    make('v3', 'adversarial shapes', 'adversarial shapes', 'Same question with adversarial shapes that punish single-side greedy.',
      'Same path-sum question with adversarial shapes that punish single-side greedy. Given the root as a level-order array, return the maximum path sum of any non-empty path. Deep cross-subtree paths, a negative root with a both-side split, an all-negative shape, and a negative-leaf drop stress the full gain discipline. No rule change: the signature and exact comparison are unchanged.',
      v3, 'exact',
      ['A through-path needs both clamped sides, not just the better one.', 'Do not stop at the root value when the best path sits entirely below it.']),
  ]
}

function courseScheduleOracle(numCourses, prereqs) {
  const adj = Array.from({ length: numCourses }, () => [])
  for (const pair of prereqs) adj[pair[1]].push(pair[0])
  const color = new Array(numCourses).fill(0)
  const stack = []
  for (let s = 0; s < numCourses; s += 1) {
    if (color[s] !== 0) continue
    stack.push([s, 0])
    while (stack.length > 0) {
      const top = stack[stack.length - 1]
      const v = top[0]
      const i = top[1]
      if (color[v] === 0) color[v] = 1
      if (i < adj[v].length) {
        top[1] = i + 1
        const w = adj[v][i]
        if (color[w] === 1) return false
        if (color[w] === 0) stack.push([w, 0])
      } else {
        color[v] = 2
        stack.pop()
      }
    }
  }
  return true
}

function coursePairsLiteral(prereqs) {
  return '[' + prereqs.map((p) => '[' + p[0] + ',' + p[1] + ']').join(',') + ']'
}

function courseSeededGraph(rng, loN, hiN, maxM) {
  const n = loN + Math.floor(rng() * (hiN - loN + 1))
  const cap = Math.min(n * (n - 1), maxM)
  const m = Math.floor(rng() * (cap + 1))
  const seen = new Set()
  const prereqs = []
  let guard = 0
  while (prereqs.length < m && guard++ < 500) {
    const a = Math.floor(rng() * n)
    const b = Math.floor(rng() * n)
    if (a === b) continue
    const key = a + ',' + b
    if (seen.has(key)) continue
    seen.add(key)
    prereqs.push([a, b])
  }
  return { n, prereqs }
}

function buildCourseSchedule(problem, signature, rng) {
  if (!problem || problem.slug !== 'course-schedule') return null
  if (!isShape(signature, ['int', 'int[][]'], 'boolean')) return null
  const make = variantFactory(problem, signature, 'finish-all drill')
  const toTest = (n, prereqs) => ({ args: [String(n), coursePairsLiteral(prereqs)], expected: outLiteral(courseScheduleOracle(n, prereqs)) })
  const v1rows = [toTest(2, [[1, 0]])]
  for (let k = 0; k < 3; k += 1) {
    const g = courseSeededGraph(rng, 4, 6, 6)
    v1rows.push(toTest(g.n, g.prereqs))
  }
  const v2rows = [
    toTest(2, [[1, 0], [0, 1]]),
    toTest(1, []),
    toTest(1, [[0, 0]]),
    toTest(2, []),
    toTest(4, [[1, 0], [2, 1], [3, 2]]),
  ]
  const v3rows = [
    toTest(6, [[1, 0], [2, 0], [3, 1], [3, 2], [4, 3], [5, 3], [1, 4]]),
    toTest(6, [[1, 0], [2, 1], [3, 2], [4, 3], [5, 4]]),
    toTest(5, [[1, 0], [2, 0], [3, 1], [3, 2], [4, 4]]),
    toTest(5, [[4, 0], [4, 1], [4, 2], [4, 3]]),
  ]
  return [
    make('v1', 'fresh graphs', 'fresh graphs', INTENT_SAME,
      'There are numCourses courses labeled 0 to numCourses-1. prerequisites[i] = [ai, bi] means you must take course bi before course ai. Return true if all courses can be finished, otherwise false. Fresh inputs use 4 to 6 courses; some contain a hidden cycle.',
      v1rows, 'exact',
      ['Edge [a,b] means b comes first: count one unmet prerequisite on a, not on b.', 'Seed every course with zero unmet prerequisites, then erase edges as courses are taken.']),
    make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
      'Same finish-all task with the boundary inputs. A single course with no prerequisites finishes trivially; a self-loop [x,x] can never be erased; a mutual pair strands both courses; a linear chain takes in order.',
      v2rows, 'exact',
      ['An empty prerequisite list means every course is immediately takable.', 'A self-loop keeps its own unmet count above zero forever, so nothing ever seeds from it.']),
    make('v3', 'adversarial shapes', 'adversarial shapes', INTENT_TWIST,
      'Same finish-all question, no rule change. A dense graph hides a 2-step cycle inside an otherwise ordered DAG; a long chain must be taken strictly in order; a diamond DAG carries one detached self-loop; a fan-in parks four prerequisites on a single course. Return true only when every course can be taken.',
      v3rows, 'exact',
      ['Draw each pair as an arrow from the second value to the first before counting.', 'One stranded course is enough to strand everything downstream of it.']),
  ]
}

/* ------------------------------------- delivery-sprint: practice-trio forge -- */
/* Coin-change / group-anagrams / valid-anagram were code-integrated with live
 * walkthroughs but had no forge builders. The oracles below are ported
 * file-local from the reviewed staged packets (no verbatim helper copies —
 * shared hashText/mulberry32/randInt/argLiteral/outLiteral/buildVariant/
 * variantFactory/INTENT_* are reused). Each builder is slug-gated and
 * shape-gated, returning null on miss so sibling builders are unaffected. */

function ccShape(signature) {
  if (!signature || typeof signature.name !== 'string' || signature.name.trim() === '') return false
  if (!Array.isArray(signature.params) || signature.params.length !== 2) return false
  if (!signature.params[0] || signature.params[0].type !== 'int[]') return false
  if (!signature.params[1] || signature.params[1].type !== 'int') return false
  return signature.return === 'int'
}

/** Reference (min coins): amount-outer DP, mirrors the live walkthrough adapter. */
function ccMinCoins(coins, amount) {
  const INF = amount + 1
  const dp = new Array(amount + 1).fill(INF)
  dp[0] = 0
  for (let i = 1; i <= amount; i += 1) {
    let best = INF
    for (const c of coins) {
      if (c <= i && dp[i - c] !== INF && dp[i - c] + 1 < best) best = dp[i - c] + 1
    }
    dp[i] = best
  }
  return dp[amount] === INF ? -1 : dp[amount]
}

/** Independent oracle (min coins): BFS layers over remainder states. */
function ccBfsMinCoins(coins, amount) {
  if (amount === 0) return 0
  const dist = new Array(amount + 1).fill(-1)
  dist[0] = 0
  const queue = [0]
  for (let head = 0; head < queue.length; head += 1) {
    const u = queue[head]
    for (const c of coins) {
      const v = u + c
      if (v <= amount && dist[v] === -1) {
        dist[v] = dist[u] + 1
        queue.push(v)
      }
    }
  }
  return dist[amount]
}

/** Reference (v3 twist): coin-outer counting DP — order of coins never matters. */
function ccCountCombos(coins, amount) {
  const dp = new Array(amount + 1).fill(0)
  dp[0] = 1
  for (const c of coins) {
    for (let a = c; a <= amount; a += 1) dp[a] += dp[a - c]
  }
  return dp[amount]
}

/** Independent oracle (v3 twist): memoized recursion over (coinIndex, remainder). */
function ccEnumCombos(coins, amount) {
  const sorted = coins.slice().sort((a, b) => a - b)
  const memo = new Map()
  function count(i, rest) {
    if (rest === 0) return 1
    if (i >= sorted.length) return 0
    const key = i + ':' + rest
    if (memo.has(key)) return memo.get(key)
    let total = 0
    for (let k = i; k < sorted.length && sorted[k] <= rest; k += 1) {
      total += count(k, rest - sorted[k])
    }
    memo.set(key, total)
    return total
  }
  return count(0, amount)
}

function buildCoinChangeVariants(problem, signature, rng) {
  try {
    if (!problem || problem.slug !== 'coin-change') return null
    if (!ccShape(signature)) return null
    if (typeof rng !== 'function') return null
    const make = variantFactory(problem, signature, 'coin-count drill')
    const toTests = (rows) => rows.map(({ coins, amount, expected }) => ({
      args: [argLiteral(coins), String(amount)],
      expected: outLiteral(expected),
    }))
    const v1rows = []
    const seen = new Set()
    let guard = 0
    while (v1rows.length < 4 && guard < 200) {
      guard += 1
      const len = 1 + Math.floor(rng() * 4)
      const set = new Set()
      while (set.size < len) set.add(1 + Math.floor(rng() * 12))
      const coins = [...set]
      const amount = Math.floor(rng() * 13)
      const key = coins.slice().sort((a, b) => a - b).join(',') + '/' + amount
      if (seen.has(key)) continue
      seen.add(key)
      const expected = ccBfsMinCoins(coins, amount)
      if (ccMinCoins(coins, amount) !== expected) return null
      v1rows.push({ coins, amount, expected })
    }
    if (v1rows.length < 4) return null
    const v2rows = [
      { coins: [1, 2, 5], amount: 0 },
      { coins: [7], amount: 7 },
      { coins: [3], amount: 10 },
      { coins: [2], amount: 3 },
      { coins: [1, 3, 4], amount: 6 },
    ].map(({ coins, amount }) => {
      const expected = ccBfsMinCoins(coins, amount)
      if (ccMinCoins(coins, amount) !== expected) throw new Error('oracle mismatch')
      return { coins, amount, expected }
    })
    const v3rows = [
      { coins: [1, 2, 5], amount: 5 },
      { coins: [2], amount: 3 },
      { coins: [1], amount: 0 },
      { coins: [1, 2], amount: 4 },
    ].map(({ coins, amount }) => {
      const expected = ccEnumCombos(coins, amount)
      if (ccCountCombos(coins, amount) !== expected) throw new Error('twist oracle mismatch')
      return { coins, amount, expected }
    })
    return [
      make('v1', 'fresh amounts', 'fresh amounts', INTENT_SAME,
        'You are given an integer array coins of different denominations and an integer amount. Return the fewest number of coins needed to make up amount with an unlimited supply of each coin, or -1 if amount cannot be made up. These fresh inputs use 1 to 4 denominations between 1 and 12 with amounts between 0 and 12.',
        toTests(v1rows), 'exact',
        ['dp[0]=0 and every other entry starts unreachable; fill amounts from 1 upward in order.', 'Greedy largest-first is not optimal; take the minimum over every reachable dp[amount-c]+1.']),
      make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
        'Same fewest-coins task with the boundary inputs: an empty amount, a single coin that fits exactly or never fits, an unreachable amount, and a set where greedy fails.',
        toTests(v2rows), 'exact',
        ['An empty amount needs 0 coins by definition; seed dp[0]=0 before the loop.', 'For coins=[1,3,4] and amount=6, greedy 4+1+1=3 loses to 3+3=2 — check every coin.']),
      make('v3', 'twist: count ways', 'twist, same signature', INTENT_TWIST,
        'RULE CHANGE: given the same coins array and amount with the same coinChange method signature and return type, return the NUMBER of distinct combinations that make up amount, where order of coins does not matter (buying [1,2] and [2,1] is one combination). Return 0 when no combination exists and 1 when amount is 0 (the empty selection). The changed counting rule is intentional.',
        toTests(v3rows), 'exact',
        ['Count combinations, not coins: iterate coins outside and amounts inside so order never matters.', 'Seed the empty selection once — dp[0]=1 — then accumulate dp[a]+=dp[a-c] per coin.']),
    ]
  } catch {
    return null
  }
}

function gaSortKey(word) {
  return word.split('').sort().join('')
}

function gaCountKey(word) {
  const c = new Array(26).fill(0)
  for (const ch of word) c[ch.charCodeAt(0) - 97]++
  return c.join('#')
}

/** Independent oracle: 26-count frequency grouping; first-seen-key order. */
function gaOracleGroups(words) {
  const order = []
  const groups = new Map()
  for (const w of words) {
    const k = gaCountKey(w)
    if (!groups.has(k)) { groups.set(k, []); order.push(k) }
    groups.get(k).push(w)
  }
  return order.map((k) => groups.get(k).slice())
}

const GA_FRESH_BASES = ['eat', 'tea', 'tan', 'nat', 'bat', 'ate', 'tab',
  'arc', 'car', 'listen', 'silent', 'abc', 'cab', 'abcd', 'dcba', 'stop', 'pots']

function gaFreshWords(rng, count) {
  const words = []
  for (let i = 0; i < count; i += 1) {
    const b = GA_FRESH_BASES[Math.floor(rng() * GA_FRESH_BASES.length)]
    const arr = b.split('')
    for (let j = arr.length - 1; j > 0; j -= 1) {
      const k = Math.floor(rng() * (j + 1))
      const swap = arr[j]
      arr[j] = arr[k]
      arr[k] = swap
    }
    words.push(arr.join('').slice(0, 8))
  }
  return words
}

function buildGroupAnagrams(problem, signature, rng) {
  try {
    if (!problem || problem.slug !== 'group-anagrams') return null
    if (!isShape(signature, ['string[]'], 'string[][]')) return null
    if (typeof rng !== 'function') return null
    const make = variantFactory(problem, signature, 'anagram grouping drill')
    const toTests = (rows, oracle) => rows.map((words) => ({
      args: [JSON.stringify(words)],
      expected: JSON.stringify(oracle(words)),
    }))
    const v1rows = []
    for (let t = 0; t < 4; t += 1) {
      const n = 3 + Math.floor(rng() * 4)
      v1rows.push(gaFreshWords(rng, n))
    }
    const v2rows = [
      ['eat', 'bat', 'tea'],
      ['abc', 'bca', 'cab'],
      ['abc', 'def', 'ghi'],
      ['eat', 'eat', 'tea'],
      ['', '', 'a'],
    ]
    const gaMultiOnly = (words) => gaOracleGroups(words).filter((g) => g.length >= 2)
    const v3rows = [
      ['eat', 'bat', 'tea'],
      ['abc', 'bca', 'cab', 'def'],
      ['abc', 'def', 'ghi'],
      ['listen', 'silent', 'enlist', 'abc', 'cba'],
    ]
    return [
      make('v1', 'fresh words', 'fresh words', INTENT_SAME,
        'Given an array of strings strs, group the anagrams together. You can return the answer in any order. These fresh inputs use 3 to 6 lowercase words; anagrams may be separated by unrelated words.',
        toTests(v1rows, gaOracleGroups), 'unordered',
        ['Sort each word letters to form its group key, then file the word under that key.', 'Anagram mates need not sit next to each other; every word is looked up independently.']),
      make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
        'Same anagram-grouping task: group words that share the same sorted letters, in any order. Inputs include a split pair around an outsider, an all-anagram triple, all-singleton words, exact duplicates, and repeated empty strings.',
        toTests(v2rows, gaOracleGroups), 'unordered',
        ['The empty string is a valid word whose sorted key is also empty.', 'Identical words are trivially anagrams; duplicates stay together in one group.']),
      make('v3', 'twist: multi-member groups only', 'twist, same signature', INTENT_TWIST,
        'RULE CHANGE: given strs, return only the anagram groups that contain at least 2 members; drop every singleton word. Keep the same groupAnagrams method signature and return type; the changed rule is intentional. An empty result is written [].',
        toTests(v3rows, gaMultiOnly), 'unordered',
        ['Group exactly as before, then keep only rows whose member list has length 2 or more.', 'An input with no repeated key returns no groups at all; do not invent a placeholder group.']),
    ]
  } catch {
    return null
  }
}

function vaOracleSorted(s, t) {
  if (s.length !== t.length) return false
  return Array.from(s).sort().join('') === Array.from(t).sort().join('')
}

const VA_LETTERS = 'abcdefghijklmnopqrstuvwxyz'

function vaRandWord(rng, len) {
  let w = ''
  for (let i = 0; i < len; i += 1) w += VA_LETTERS[Math.floor(rng() * 26)]
  return w
}

function vaMutateOne(rng, word) {
  const arr = Array.from(word)
  const i = Math.floor(rng() * arr.length)
  let rep = VA_LETTERS[Math.floor(rng() * 26)]
  if (rep === arr[i]) rep = rep === 'a' ? 'b' : 'a'
  arr[i] = rep
  return arr.join('')
}

function buildValidAnagramDrills(problem, signature, rng) {
  try {
    if (!problem || problem.slug !== 'valid-anagram') return null
    if (!isShape(signature, ['string', 'string'], 'boolean')) return null
    if (typeof rng !== 'function') return null
    const make = variantFactory(problem, signature, 'anagram-count drill')
    const toTest = (s, t) => ({ args: [argLiteral(s), argLiteral(t)], expected: outLiteral(vaOracleSorted(s, t)) })
    const v1 = []
    for (let n = 0; n < 4; n += 1) {
      const len = randInt(rng, 1, 8)
      const s = vaRandWord(rng, len)
      const roll = rng()
      let t
      if (roll < 0.5) {
        t = shuffled(rng, Array.from(s)).join('')
      } else if (roll < 0.8) {
        t = vaMutateOne(rng, s)
      } else {
        t = len > 1 && rng() < 0.5 ? s.slice(0, len - 1) : s + VA_LETTERS[Math.floor(rng() * 26)]
      }
      v1.push(toTest(s, t))
    }
    const v2 = [
      ['a', 'a'],
      ['a', 'b'],
      ['abcba', 'abcba'],
      ['abcd', 'abc'],
      ['aab', 'abb'],
    ].map(([s, t]) => toTest(s, t))
    const alphabet = VA_LETTERS
    const revAlphabet = Array.from(VA_LETTERS).reverse().join('')
    const v3 = [
      [alphabet, revAlphabet],
      ['aabbbccccd', 'dccccbbbaa'],
      ['abcdefghij', 'abcdefghik'],
      ['qqqqqqqqqq', 'qqqqqqqqqr'],
    ].map(([s, t]) => toTest(s, t))
    return [
      make('v1', 'fresh strings', 'fresh strings', INTENT_SAME,
        'Given two strings s and t, return true if t is an anagram of s, and false otherwise. These fresh inputs use lowercase letters with lengths 1 to 8. Equal lengths do not imply an anagram; count every letter. The signature and exact-match judge mode are unchanged.',
        v1, 'exact',
        ['Reject different lengths before counting anything.', 'Add one per letter of s, subtract one per letter of t, then require every slot to be zero.']),
      make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
        'Same anagram task with the boundary inputs. Given strings s and t, return true only when t is an anagram of s. Inputs include single letters, identical words, a length mismatch, and same-alphabet pairs with different multiplicities.',
        v2, 'exact',
        ['One different count anywhere is enough to reject.', 'Identical strings are trivially anagrams, but a single changed letter is not.']),
      make('v3', 'adversarial shapes', 'adversarial shapes', INTENT_TWIST,
        'Same anagram question with adversarial placements that punish presence-only sets and early exits. Given strings s and t, return true only when the multisets match exactly. Full-alphabet, duplicate-heavy, and last-character near-miss pairs all have equal lengths, so counting must decide. No rule change: the signature and exact comparison are unchanged.',
        v3, 'exact',
        ['A set of distinct letters cannot tell aab from abb — counts must be exact.', 'Near-misses agree almost everywhere, so the verdict must wait for the final compare.']),
    ]
  } catch {
    return null
  }
}

/* ----------------- delivery-sprint: DP-pair forge (P34/P35) ------------------ */
/* longest-increasing-subsequence + maximum-product-subarray (lessons already
 * live, forge-only here). Oracles ported file-local with lis-/mp- prefixes
 * from the reviewed staged packets (no verbatim helper copies — shared
 * randInt/argLiteral/outLiteral/variantFactory/INTENT_* are reused; each
 * builder cross-checks two independent oracles and throws on disagreement,
 * wbCheck precedent). Each builder is slug-gated and shape-gated, returning
 * null on miss so sibling builders and existing dispatch are unaffected. Both
 * are PREPENDED in dp-1d before buildHouseRobberII because the generic
 * buildDpArray also matches (int[])->int with rob/stock semantics, which
 * would be wrong for these slugs (HII precedent). */

/** Independent oracle (LIS): patience piles. Distinct from the O(n^2) DP. */
function lisPatience(nums) {
  const piles = []
  for (const x of nums) {
    let lo = 0, hi = piles.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (piles[mid] < x) lo = mid + 1
      else hi = mid
    }
    if (lo === piles.length) piles.push(x)
    else piles[lo] = x
  }
  return piles.length
}

/** Cross-check oracle (LIS): O(n^2) DP over ending positions. */
function lisDp(nums) {
  if (nums.length === 0) return 0
  const dp = new Array(nums.length).fill(1)
  let best = 1
  for (let i = 1; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) dp[i] = dp[j] + 1
    }
    if (dp[i] > best) best = dp[i]
  }
  return best
}

function lisTests(rows) {
  return rows.map((nums) => {
    const expected = lisPatience(nums)
    if (lisDp(nums) !== expected) throw new Error('lis oracle disagreement on [' + nums + ']')
    return { args: [argLiteral(nums)], expected: outLiteral(expected) }
  })
}

function buildLISVariants(problem, signature, rng) {
  try {
    if (!problem || problem.slug !== 'longest-increasing-subsequence') return null
    if (!isShape(signature, ['int[]'], 'int')) return null
    if (typeof rng !== 'function') return null
    const make = variantFactory(problem, signature, 'lis-length drill')
    const fresh = []
    for (let k = 0; k < 4; k++) {
      const len = randInt(rng, 4, 8)
      fresh.push(Array.from({ length: len }, () => randInt(rng, -10, 20)))
    }
    const edges = [[5], [7, 7, 7, 7], [5, 4, 3, 2, 1], [-5, -1, -3, -2, -4]]
    const adversarial = [[9, 8, 7, 1, 2, 6, 4, 5], [4, 4, 4, 1, 2, 2, 3], [1, 3, 2, 4, 3, 5], [6, 5, 4, 1, 2, 3]]
    return [
      make('v1', 'fresh values', 'fresh values', INTENT_SAME,
        'Given an integer array nums, return the length of the longest strictly increasing subsequence (a subsequence keeps the original order; equal values do not extend it). These fresh inputs hold 4 to 8 seeded values between -10 and 20.',
        lisTests(fresh), 'exact',
        ['dp[i] = 1 + max dp[j] over j<i with nums[j]<nums[i], else 1; try the pair table for i=1,2 by hand first.',
         'Keep best = max over finished dp[i]; only a strictly smaller nums[j] may extend.']),
      make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
        'Same strictly-increasing task with the boundary inputs: a single value, all-equal values, a strictly decreasing array, and negatives.',
        lisTests(edges), 'exact',
        ['A single element is itself a subsequence of length 1.',
         'Strictly increasing forbids equal neighbours: an all-equal array has answer 1.']),
      make('v3', 'adversarial shapes', 'adversarial shapes', 'Same question with adversarial shapes that punish greedy shortcuts.',
        'Same strictly-increasing task with adversarial placements and no rule change: a late valley after a high start, duplicate pools before a spike, alternating dips, and a dead prefix. Same signature, same exact comparison.',
        lisTests(adversarial), 'exact',
        ['The long chain can hide after the valley: track every predecessor pair, not just the early highs.',
         'Duplicates never extend each other; only strict increases move dp[i].']),
    ]
  } catch {
    return null
  }
}

/** Independent oracle (max-product): brute force over all O(n^2) subarrays. */
function mpBrute(nums) {
  let best = -Infinity
  for (let s = 0; s < nums.length; s++) {
    let p = 1
    for (let e = s; e < nums.length; e++) {
      p *= nums[e]
      if (p > best) best = p
    }
  }
  return best
}

/** Cross-check oracle (max-product): curMax/curMin single pass. */
function mpDp(nums) {
  let curMax = nums[0], curMin = nums[0], best = nums[0]
  for (let i = 1; i < nums.length; i++) {
    const x = nums[i]
    const candA = x, candB = curMax * x, candC = curMin * x
    curMax = Math.max(candA, candB, candC)
    curMin = Math.min(candA, candB, candC)
    if (curMax > best) best = curMax
  }
  return best
}

function mpTests(rows) {
  return rows.map((nums) => {
    const expected = mpBrute(nums)
    if (mpDp(nums) !== expected) throw new Error('max-product oracle disagreement on [' + nums + ']')
    return { args: [argLiteral(nums)], expected: outLiteral(expected) }
  })
}

function buildMaxProductVariants(problem, signature, rng) {
  try {
    if (!problem || problem.slug !== 'maximum-product-subarray') return null
    if (!isShape(signature, ['int[]'], 'int')) return null
    if (typeof rng !== 'function') return null
    const make = variantFactory(problem, signature, 'max-product drill')
    const fresh = []
    const seen = new Set(['[2,3,-2,4]'])
    let guard = 0
    while (fresh.length < 3 && guard++ < 200) {
      const len = randInt(rng, 3, 6)
      const nums = Array.from({ length: len }, () => randInt(rng, -9, 9))
      const key = JSON.stringify(nums)
      if (seen.has(key)) continue
      seen.add(key)
      fresh.push(nums)
    }
    if (fresh.length < 3) return null
    const v1rows = [[2, 3, -2, 4], ...fresh]
    const v2rows = [[-7], [0, 0, 0], [-2, -3], [-2, 0, -1]]
    const v3rows = [[-1, 2, -1, 2, -1], [3, -1, 4, -1, -2], [-2, 3, -4], [-2, -3, -4]]
    return [
      make('v1', 'fresh values', 'fresh values', INTENT_SAME,
        'Given an integer array nums, find a subarray that has the largest product, and return the product. These fresh inputs have 3 to 6 values between -9 and 9; reproduce the max/min-ending-here reasoning on the new numbers.',
        mpTests(v1rows), 'exact',
        ['Keep both extremes ending at each index: a negative flips which one wins.',
         'Restarting at x is one of the three candidates at every step.']),
      make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
        'Same task: given nums, return the largest product of any contiguous subarray. Inputs are nonempty and include a single negative, all zeros, a negative pair, and a zero that forbids joining its sides.',
        mpTests(v2rows), 'exact',
        ['Length 1 has exactly one subarray: the element itself.',
         'A zero splits the array: no subarray may cross it, so the restart candidate does the work.']),
      make('v3', 'adversarial signs', 'adversarial signs', 'Same task, hostile inputs: the trap the max-only idea walks into.',
        'Same max-product task with hostile sign flips and no rule change: each input alternates signs or hides the optimum behind a minimum that a later negative redeems; tracking only the maximum fails here.',
        mpTests(v3rows), 'exact',
        ['Watch curMin, not just curMax: the winning product often starts as the worst.',
         'At each x compare all three of x, curMax*x and curMin*x before committing.']),
    ]
  } catch {
    return null
  }
}

/* ----------------------- delivery-sprint: DP-trio forge (P01/P32/P37) -------- */
/* house-robber-ii (new circular adapter) + word-break / decode-ways (lessons
 * already live, forge-only here). Oracles ported file-local with hrii-/dw-/
 * wb- prefixes from the reviewed staged packets (no verbatim helper copies —
 * shared hashText/mulberry32/randInt/argLiteral/outLiteral/buildVariant/
 * variantFactory/robLinear/robCircular/INTENT_* are reused). Each builder is
 * slug-gated and shape-gated, returning null on miss so sibling builders and
 * existing dispatch are unaffected. house-robber-ii is PREPENDED in dp-1d
 * because the generic buildDpArray also matches (int[])->int with linear
 * semantics; word-break appends (no existing dp-1d builder takes its shape);
 * decode-ways owns the new BUILDERS['dp-2d'] key (none existed). */

/** Independent oracle: exponential subset check with circular-adjacency reject. */
function hriiBrute(nums) {
  const n = nums.length
  if (n === 0) return 0
  if (n === 1) return nums[0]
  let best = 0
  for (let mask = 0; mask < (1 << n); mask++) {
    let ok = true
    let total = 0
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        total += nums[i]
        if ((mask & (1 << ((i + 1) % n))) && n > 1) { ok = false; break }
      }
    }
    if (ok && total > best) best = total
  }
  return best
}

function hriiTests(rows) {
  return rows.map((nums) => {
    const expected = hriiBrute(nums)
    if (robCircular(nums) !== expected) throw new Error('hrii oracle disagreement on [' + nums + ']')
    return { args: [argLiteral(nums)], expected: outLiteral(expected) }
  })
}

function buildHouseRobberII(problem, signature, rng) {
  try {
    if (!problem || problem.slug !== 'house-robber-ii') return null
    if (!isShape(signature, ['int[]'], 'int')) return null
    if (typeof rng !== 'function') return null
    const make = variantFactory(problem, signature, 'circular non-adjacent-sum drill')
    const fresh = []
    for (let k = 0; k < 4; k++) {
      const n = randInt(rng, 3, 8)
      fresh.push(Array.from({ length: n }, () => randInt(rng, 0, 20)))
    }
    const edges = [[7], [1, 2], [0, 0, 0, 0], [0, 1000], [4, 4, 4, 4, 4]]
    const adversarial = [[200, 1, 1, 200], [5, 1, 1, 5, 1], [10, 1, 1, 10, 1], [3, 2, 1, 3, 2]]
    return [
      make('v1', 'fresh circles', 'fresh values', INTENT_SAME,
        'You are given houses arranged in a circle where nums[i] is the money in house i. Houses 0 and n-1 are adjacent, so no two robbed houses may be adjacent around the circle. Return the largest total you can rob. These fresh inputs hold 3 to 8 houses with values 0 to 20.',
        hriiTests(fresh), 'exact',
        ['Split the circle: solve houses [0..n-2] and houses [1..n-1] as ordinary lines, then take the better half.',
         'On one line, each house is take (prev2 + nums[i]) versus skip (prev1); keep the larger.']),
      make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
        'Same circular task with the boundary inputs. A single house has no conflict and is simply taken; two houses are mutually adjacent through the wrap, so take the larger. All-zero streets stay at 0.',
        hriiTests(edges), 'exact',
        ['With n == 1 there is no pair to conflict, so the answer is nums[0] itself.',
         'With n == 2 both houses touch through the wrap: the answer is max(nums).']),
      make('v3', 'adversarial ends', 'twist, same task', INTENT_TWIST,
        'Same circular task, adversarial inputs: both ends hold huge values, so any linear sweep that grabs both ends is illegal. A single-element view is unchanged; the circle rule is identical — only the numbers try to trick a linear-only solution.',
        hriiTests(adversarial), 'exact',
        ['Taking house 0 forbids both house 1 AND house n-1; price that wrap cost explicitly.',
         'Run both linear sweeps and compare: with [200,1,1,200] each side keeps one 200 plus at most a 1.']),
    ]
  } catch {
    return null
  }
}

/** Independent oracle (decode-ways): top-down memoised recursion. */
function dwOracle(s) {
  if (typeof s !== 'string' || s.length === 0 || !/^[0-9]+$/.test(s)) {
    throw new Error('dwOracle needs a nonempty digit string')
  }
  const n = s.length
  const memo = new Array(n).fill(undefined)
  function ways(i) {
    if (i === n) return 1
    if (s[i] === '0') return 0
    if (memo[i] !== undefined) return memo[i]
    let total = ways(i + 1)
    if (i + 1 < n) {
      const two = (s.charCodeAt(i) - 48) * 10 + (s.charCodeAt(i + 1) - 48)
      if (two >= 10 && two <= 26) total += ways(i + 2)
    }
    memo[i] = total
    return total
  }
  return ways(0)
}

const DW_STATEMENT = 'A message uses the mapping 1->A ... 26->Z. Given a digit string s, return the number of ways to decode it; return 0 when no valid split exists.'

function dwToTest(s) {
  return { args: [argLiteral(s)], expected: outLiteral(dwOracle(s)) }
}

function buildDecodeWaysVariants(problem, signature, rng) {
  try {
    if (!problem || problem.slug !== 'decode-ways') return null
    if (!isShape(signature, ['string'], 'int')) return null
    if (typeof rng !== 'function') return null
    const make = variantFactory(problem, signature, 'decoding-count drill')
    const seen = new Set()
    const v1strings = []
    let guard = 0
    while (v1strings.length < 4 && guard++ < 200) {
      let out = ''
      const len = randInt(rng, 3, 8)
      for (let i = 0; i < len; i++) out += String(randInt(rng, 0, 9))
      if (seen.has(out)) continue
      seen.add(out)
      v1strings.push(out)
    }
    if (v1strings.length < 4) return null
    const v1 = v1strings.map(dwToTest)
    const v2 = ['0', '10', '27', '00', '101'].map(dwToTest)
    const v3 = ['1001', '301', '1010', '11106'].map(dwToTest)
    return [
      make('v1', 'fresh strings', 'fresh strings', INTENT_SAME,
        DW_STATEMENT + ' These fresh inputs are digit strings of length 3 to 8; a 0 anywhere can only survive inside 10 or 20. The signature and exact-match judge mode are unchanged.',
        v1, 'exact',
        ["'0' never decodes alone — which positions can a zero survive in?",
         'Let dp[i] be the ways for the first i characters; which earlier entries can reach i?']),
      make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
        DW_STATEMENT + ' The boundary inputs: a lone zero, a valid 10 pair, an invalid 27 pair, a double zero, and a zero bridged by valid pairs on both sides.',
        v2, 'exact',
        ['A single "0" is already undecodable: the answer is 0, not 1.',
         '"27" is outside 10..26, so the pair contributes nothing even though both digits are nonzero.']),
      make('v3', 'adversarial zeros', 'adversarial zeros', 'Same question with adversarial zero placements that punish greedy shortcuts.',
        DW_STATEMENT + ' No rule change: adversarial zero placements punish counting a lone 0 or accepting 01..09 as a pair. "1001" and "301" are undecodable; "1010" has exactly one decoding; "11106" hides its zero inside valid pairs.',
        v3, 'exact',
        ['"301" fails because 30 is not a letter and a lone 0 never decodes.',
         'For "11106" check the pair 06 explicitly: leading zeros are rejected even though 6 is a letter.']),
    ]
  } catch {
    return null
  }
}

// Independent oracles (word-break): top-down memoized DFS + bottom-up DP.
function wbTopDown(s, dictArr) {
  const dict = new Set(dictArr)
  const n = s.length
  const memo = new Map()
  function dfs(i) {
    if (i === n) return true
    if (memo.has(i)) return memo.get(i)
    for (let len = 1; len <= n - i; len++) {
      if (dict.has(s.slice(i, i + len)) && dfs(i + len)) {
        memo.set(i, true)
        return true
      }
    }
    memo.set(i, false)
    return false
  }
  return dfs(0)
}

function wbBottomUp(s, dictArr) {
  const dict = new Set(dictArr)
  const n = s.length
  const dp = new Array(n + 1).fill(false)
  dp[0] = true
  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && dict.has(s.slice(j, i))) {
        dp[i] = true
        break
      }
    }
  }
  return dp[n]
}

function wbCheck(s, dictArr) {
  const a = wbTopDown(s, dictArr)
  const b = wbBottomUp(s, dictArr)
  if (a !== b) throw new Error('wb oracle disagreement on s="' + s + '"')
  return a
}

function wbTests(pairs) {
  return pairs.map(([s, dictArr]) => ({
    args: [JSON.stringify(s), JSON.stringify(dictArr)],
    expected: outLiteral(wbCheck(s, dictArr)),
  }))
}

function buildWordBreakVariants(problem, signature, rng) {
  try {
    if (!problem || problem.slug !== 'word-break') return null
    if (!isShape(signature, ['string', 'string[]'], 'boolean')) return null
    if (typeof rng !== 'function') return null
    const make = variantFactory(problem, signature, 'word-segmentation drill')
    void rng
    return [
      make('v1', 'fresh splits', 'fresh splits', INTENT_SAME,
        'Given a string s and a list of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words. The same word may be reused multiple times.',
        wbTests([
          ['penpenapple', ['pen', 'apple']],
          ['codesignal', ['code', 'signal', 'sig', 'nal']],
          ['helloworld', ['hello', 'hell', 'world', 'ow']],
        ]), 'exact',
        ['Try every split j<i; dp[j] must be true AND s[j..i) in dict.',
         'Reuse is allowed, so one short dict word may tile the whole string.']),
      make('v2', 'edge cases', 'edge cases', INTENT_EDGE,
        'Same segmentation task with the boundary inputs. A single character is covered only when the dict holds exactly it; reuse lets one short word tile the whole string; an uncovered tail poisons the verdict even when the head splits cleanly.',
        wbTests([
          ['a', ['a']],
          ['a', ['b']],
          ['aaaaaa', ['aa', 'aaa']],
          ['abcd', ['ab', 'bc']],
        ]), 'exact',
        ['A miss on every split leaves dp[i] false; the loop simply moves on.',
         'For "aaaaaa" reuse is required: "aa"+"aa"+"aa" certifies dp[6]=true.']),
      make('v3', 'adversarial near-miss', 'adversarial near-miss', 'Same task with an adversarial input that punishes greedy single-split reasoning.',
        'Same segmentation task, adversarial input: every letter is covered except one late gap. A greedy scan that stops at the first reachable prefix reports the wrong verdict; only the tail split decides.',
        wbTests([
          ['abcdexyz', ['abcde', 'x', 'y', 'q', 'w']],
          ['catsand', ['cat', 'cats', 'and', 'sand']],
        ]), 'exact',
        ['dp[5] via "abcde" plus "x" and "y" still dies: "z" is missing from the dict.',
         'In "catsand" only the dp[3] witness via "cat" lets "sand" certify dp[7].']),
    ]
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------- registry -- */

const BUILDERS = {
  'arrays-hashing': [buildHashingPair, buildDuplicateDrills, buildGroupAnagrams, buildValidAnagramDrills],
  'two-pointers': [buildTwoPointersArea, buildTwoPointersLPS],
  'sliding-window': [buildSlidingWindowString, buildMinWindow],
  'binary-search': [buildRotatedSearch, buildBinarySearchIndex],
  stack: [buildStackBrackets],
  'dp-1d': [buildLISVariants, buildMaxProductVariants, buildHouseRobberII, buildDpArray, buildDpInt, buildCoinChangeVariants, buildWordBreakVariants],
  'dp-2d': [buildDecodeWaysVariants],
  'linked-list': [buildLinkedListReverse, buildLinkedListRemoveNth],
  intervals: [buildIntervalsMerge, buildIntervalsInsert, buildEraseOverlap],
  'graph-dfs': [buildGraphGrid],
  'bit-manipulation': [buildBitMissing, buildBitCount, buildCountingBitsTable],
  'tree-dfs': [buildSubtree, buildConstructTree, buildMaxPathSum],
  'topological-sort': [buildCourseSchedule],
}

function patternOf(problem) {
  const primary = problem && problem.pattern
  if (typeof primary === 'string' && primary !== '') return primary
  const list = problem && Array.isArray(problem.patterns) ? problem.patterns : []
  for (const candidate of list) if (typeof candidate === 'string' && candidate !== '') return candidate
  return ''
}

/**
 * Build three judge-ready practice variations for one problem record.
 *
 * @param {object} problem full shard record (see CONTRACTS.md §2)
 * @param {object} [options] reserved; accepted for forward compatibility
 * @returns {Array} exactly three variants, or [] when the pattern/shape is unsupported
 */
const ELIGIBLE_PROBLEMS = new Set(['3sum','add-two-numbers','alien-dictionary','encode-and-decode-strings','balanced-binary-tree','best-time-to-buy-and-sell-stock','best-time-to-buy-and-sell-stock-with-cooldown','binary-search','binary-tree-level-order-traversal','binary-tree-maximum-path-sum','binary-tree-right-side-view','burst-balloons','car-fleet','cheapest-flights-within-k-stops','climbing-stairs','clone-graph','coin-change','coin-change-ii','combination-sum','combination-sum-ii','construct-binary-tree-from-preorder-and-inorder-traversal','container-with-most-water','contains-duplicate','copy-list-with-random-pointer','count-good-nodes-in-binary-tree','counting-bits','course-schedule','course-schedule-ii','daily-temperatures','decode-ways','design-add-and-search-words-data-structure','design-twitter','detect-squares','diameter-of-binary-tree','distinct-subsequences','edit-distance','evaluate-reverse-polish-notation','find-median-from-data-stream','find-minimum-in-rotated-sorted-array','find-the-duplicate-number','gas-station','generate-parentheses','graph-valid-tree','group-anagrams','hand-of-straights','happy-number','house-robber','house-robber-ii','implement-trie-prefix-tree','insert-interval','interleaving-string','invert-binary-tree','jump-game','jump-game-ii','k-closest-points-to-origin','koko-eating-bananas','kth-largest-element-in-a-stream','kth-largest-element-in-an-array','kth-smallest-element-in-a-bst','largest-rectangle-in-histogram','last-stone-weight','letter-combinations-of-a-phone-number','linked-list-cycle','longest-common-subsequence','longest-consecutive-sequence','longest-increasing-path-in-a-matrix','longest-increasing-subsequence','longest-palindromic-substring','longest-repeating-character-replacement','longest-substring-without-repeating-characters','lowest-common-ancestor-of-a-binary-search-tree','lru-cache','max-area-of-island','maximum-depth-of-binary-tree','maximum-product-subarray','maximum-subarray','median-of-two-sorted-arrays','meeting-rooms','meeting-rooms-ii','merge-intervals','merge-k-sorted-lists','merge-triplets-to-form-target-triplet','merge-two-sorted-lists','min-cost-climbing-stairs','min-cost-to-connect-all-points','min-stack','minimum-interval-to-include-each-query','minimum-window-substring','missing-number','multiply-strings','n-queens','network-delay-time','non-overlapping-intervals','number-of-1-bits','number-of-connected-components-in-an-undirected-graph','number-of-islands','pacific-atlantic-water-flow','palindrome-partitioning','palindromic-substrings','partition-equal-subset-sum','partition-labels','permutation-in-string','permutations','plus-one','powx-n','product-of-array-except-self','reconstruct-itinerary','redundant-connection','regular-expression-matching','remove-nth-node-from-end-of-list','reorder-list','reverse-bits','reverse-integer','palindrome-number','reverse-linked-list','roman-to-integer','reverse-nodes-in-k-group','rotate-image','rotting-oranges','same-tree','search-a-2d-matrix','search-insert-position','search-in-rotated-sorted-array','serialize-and-deserialize-binary-tree','set-matrix-zeroes','single-number','sliding-window-maximum','spiral-matrix','subsets','subsets-ii','subtree-of-another-tree','sum-of-two-integers','surrounded-regions','swim-in-rising-water','target-sum','task-scheduler','time-based-key-value-store','top-k-frequent-elements','trapping-rain-water','two-sum','two-sum-ii-input-array-is-sorted','unique-paths','valid-anagram','valid-palindrome','valid-parentheses','valid-parenthesis-string','valid-sudoku','validate-binary-search-tree','walls-and-gates','word-break','word-ladder','word-search','word-search-ii'])

export function buildVariants(problem, options = {}) {
  void options
  try {
    if (!problem || typeof problem !== 'object') return []
    if (Object.hasOwn(FAMILY_BUILDERS, problem.slug)) {
      return FAMILY_BUILDERS[problem.slug](problem, options)
    }
    // Single-registry dispatch (shared-problem-registration/v1): registry-first
    // with legacy ELIGIBLE fallback until every SLUG_BUILDERS row has a registry
    // row. New slugs MUST add one PROBLEM_REGISTRY row, never an ELIGIBLE edit.
    const registration = registrationFor(problem.slug)
    if (!registration && !ELIGIBLE_PROBLEMS.has(problem.slug)) return []
    const explicit = SLUG_BUILDERS[String(problem.slug)]
    if (typeof explicit === 'function') {
      let direct = null
      try {
        direct = explicit(problem, options)
      } catch {
        direct = null
      }
      if (Array.isArray(direct) && direct.length === 3) return direct
    }
    const signature = signatureOf(problem)
    if (!signature) return []
    const builders = BUILDERS[patternOf(problem)]
    if (!Array.isArray(builders) || builders.length === 0) return []
    const slug = String(problem.slug || problem.title || problem.id || 'problem')
    const rng = mulberry32(hashText(slug))
    for (const build of builders) {
      let variants = null
      try {
        variants = build(problem, signature, rng)
      } catch {
        variants = null
      }
      if (Array.isArray(variants) && variants.length === 3) return variants
    }
    return []
  } catch {
    return []
  }
}

/** Pattern ids this module can currently generate for (useful to the UI). */
export const SUPPORTED_PATTERNS = Object.freeze(Object.keys(BUILDERS))
