/** Explicit problem-specific adapters. Pattern tags are never used as a correctness claim. */
import { adapters as arrays } from './arrays-adapters.js'
import { adapters as strings } from './strings-adapters.js'
import { adapters as trees } from './trees-adapters.js'
import { adapters as dp } from './dp-adapters.js'
import { adapters as foundations } from './foundations-adapters.js'
import { adapters as graphs } from './graphs-adapters.js'
import { adapters as linked } from './linked-adapters.js'
import { adapters as intervals } from './intervals-adapters.js'
import { adapters as search } from './search-adapters.js'
import { adapters as monotonic } from './monotonic-adapters.js'
import { adapters as backtracking } from './backtracking-adapters.js'
import { adapters as topo } from './topo-adapters.js'
import { adapters as unionfind } from './unionfind-adapters.js'
import { adapters as heap } from './heap-adapters.js'
import { adapters as twopointer } from './twopointer-adapters.js'
import { adapters as queue } from './queue-adapters.js'
import { adapters as matrix } from './matrix-adapters.js'
import { adapters as rotateImage } from './rotate-image-adapter.js'
import { adapters as trie } from './trie-adapters.js'
import { adapters as valid_parenthesis_string } from './adapter-valid-parenthesis-string.js'
import { adapters as target_sum } from './adapter-target-sum.js'
import { adapters as set_matrix_zeroes } from './adapter-set-matrix-zeroes.js'
import { adapters as regular_expression_matching } from './adapter-regular-expression-matching.js'
import { adapters as powx_n } from './adapter-powx-n.js'
import { adapters as plus_one } from './adapter-plus-one.js'
import { adapters as partition_labels } from './adapter-partition-labels.js'
import { adapters as multiply_strings } from './adapter-multiply-strings.js'
import { adapters as minimum_interval_to_include_each_query } from './adapter-minimum-interval-to-include-each-query.js'
import { adapters as merge_triplets_to_form_target_triplet } from './adapter-merge-triplets-to-form-target-triplet.js'
import { adapters as longest_increasing_path_in_a_matrix } from './adapter-longest-increasing-path-in-a-matrix.js'
import { adapters as jump_game_ii } from './adapter-jump-game-ii.js'
import { adapters as interleaving_string } from './adapter-interleaving-string.js'
import { adapters as happy_number } from './adapter-happy-number.js'
import { adapters as hand_of_straights } from './adapter-hand-of-straights.js'
import { adapters as distinct_subsequences } from './adapter-distinct-subsequences.js'
import { adapters as burst_balloons } from './adapter-burst-balloons.js'
import { adapters as word_ladder } from './adapter-word-ladder.js'
import { adapters as swim_in_rising_water } from './adapter-swim-in-rising-water.js'
import { adapters as surrounded_regions } from './adapter-surrounded-regions.js'
import { adapters as subsets_ii } from './adapter-subsets-ii.js'
import { adapters as reverse_integer } from './adapter-reverse-integer.js'
import { adapters as palindrome_number } from './adapter-palindrome-number.js'
import { adapters as roman_to_integer } from './adapter-roman-to-integer.js'
import { adapters as longest_common_prefix } from './adapter-longest-common-prefix.js'
import { adapters as longest_valid_parentheses } from './adapter-longest-valid-parentheses.js'
import { adapters as swap_nodes_in_pairs } from './adapter-swap-nodes-in-pairs.js'
import { adapters as threesum_closest } from './adapter-3sum-closest.js'
import { adapters as find_first_range } from './adapter-find-first-and-last-position-of-element-in-sorted-array.js'
import { adapters as str_str } from './adapter-find-the-index-of-the-first-occurrence-in-a-string.js'
import { adapters as first_missing_positive } from './adapter-first-missing-positive.js'
import { adapters as remove_duplicates_from_sorted_array } from './adapter-remove-duplicates-from-sorted-array.js'
import { adapters as substring_with_concatenation_of_all_words } from './adapter-substring-with-concatenation-of-all-words.js'
import { adapters as reconstruct_itinerary } from './adapter-reconstruct-itinerary.js'
import { adapters as palindrome_partitioning } from './adapter-palindrome-partitioning.js'
import { adapters as network_delay_time } from './adapter-network-delay-time.js'
import { adapters as n_queens } from './adapter-n-queens.js'
import { adapters as min_cost_to_connect_all_points } from './adapter-min-cost-to-connect-all-points.js'
import { adapters as min_cost_climbing_stairs } from './adapter-min-cost-climbing-stairs.js'
import { adapters as letter_combinations_of_a_phone_number } from './adapter-letter-combinations-of-a-phone-number.js'
import { adapters as detect_squares } from './adapter-detect-squares.js'
import { adapters as design_twitter } from './adapter-design-twitter.js'
import { adapters as combination_sum_ii } from './adapter-combination-sum-ii.js'
import { adapters as coin_change_ii } from './adapter-coin-change-ii.js'
import { adapters as clone_graph } from './adapter-clone-graph.js'
import { adapters as cheapest_flights_within_k_stops } from './adapter-cheapest-flights-within-k-stops.js'
import { adapters as best_time_to_buy_and_sell_stock_with_cooldown } from './adapter-best-time-to-buy-and-sell-stock-with-cooldown.js'
import { adapters as balanced_binary_tree } from './adapter-balanced-binary-tree.js'
import { adapters as time_based_key_value_store } from './adapter-time-based-key-value-store.js'
import { adapters as task_scheduler } from './adapter-task-scheduler.js'
import { adapters as search_a_2d_matrix } from './adapter-search-a-2d-matrix.js'
import { adapters as reverse_nodes_in_k_group } from './adapter-reverse-nodes-in-k-group.js'
import { adapters as median_of_two_sorted_arrays } from './adapter-median-of-two-sorted-arrays.js'
import { adapters as lru_cache } from './adapter-lru-cache.js'
import { adapters as last_stone_weight } from './adapter-last-stone-weight.js'
import { adapters as kth_largest_element_in_a_stream } from './adapter-kth-largest-element-in-a-stream.js'
import { adapters as k_closest_points_to_origin } from './adapter-k-closest-points-to-origin.js'
import { adapters as find_the_duplicate_number } from './adapter-find-the-duplicate-number.js'
import { adapters as count_good_nodes_in_binary_tree } from './adapter-count-good-nodes-in-binary-tree.js'
import { adapters as copy_list_with_random_pointer } from './adapter-copy-list-with-random-pointer.js'
import { adapters as binary_tree_right_side_view } from './adapter-binary-tree-right-side-view.js'
import { adapters as add_two_numbers } from './adapter-add-two-numbers.js'
import { adapters as valid_sudoku } from './adapter-valid-sudoku.js'
import { adapters as trapping_rain_water } from './adapter-trapping-rain-water.js'
import { adapters as permutation_in_string } from './adapter-permutation-in-string.js'
import { adapters as min_stack } from './adapter-min-stack.js'
import { adapters as largest_rectangle_in_histogram } from './adapter-largest-rectangle-in-histogram.js'
import { adapters as generate_parentheses } from './adapter-generate-parentheses.js'
import { adapters as evaluate_reverse_polish_notation } from './adapter-evaluate-reverse-polish-notation.js'
import { adapters as car_fleet } from './adapter-car-fleet.js'
import { adapters as meeting_rooms } from './adapter-meeting-rooms.js'
import { adapters as meeting_rooms_ii } from './adapter-meeting-rooms-ii.js'
import { adapters as graph_valid_tree } from './adapter-graph-valid-tree.js'
import { adapters as connected_components } from './adapter-number-of-connected-components-in-an-undirected-graph.js'
import { adapters as alien_dictionary } from './adapter-alien-dictionary.js'
import { adapters as walls_and_gates } from './adapter-walls-and-gates.js'
import { adapters as encode_and_decode_strings } from './adapter-encode-and-decode-strings.js'
import { tryParseLiteral } from './parse.js'
import { boundedFrames } from './semantic-core.js'
import { buildDetail } from './semantic-detail.js'

export const ADAPTERS = Object.freeze({...arrays,...strings,...trees,...foundations,...dp,...graphs,...linked,...intervals,...search,...monotonic,...backtracking,...topo,...unionfind,...heap,...twopointer,...queue,...matrix,...rotateImage,...trie,...car_fleet,...evaluate_reverse_polish_notation,...generate_parentheses,...largest_rectangle_in_histogram,...min_stack,...permutation_in_string,...trapping_rain_water,...valid_sudoku,...add_two_numbers,...binary_tree_right_side_view,...copy_list_with_random_pointer,...count_good_nodes_in_binary_tree,...find_the_duplicate_number,...k_closest_points_to_origin,...kth_largest_element_in_a_stream,...last_stone_weight,...median_of_two_sorted_arrays,...reverse_nodes_in_k_group,...search_a_2d_matrix,...task_scheduler,...time_based_key_value_store,...lru_cache,...balanced_binary_tree,...best_time_to_buy_and_sell_stock_with_cooldown,...cheapest_flights_within_k_stops,...clone_graph,...coin_change_ii,...combination_sum_ii,...design_twitter,...detect_squares,...letter_combinations_of_a_phone_number,...min_cost_climbing_stairs,...min_cost_to_connect_all_points,...n_queens,...network_delay_time,...palindrome_partitioning,...reconstruct_itinerary,...reverse_integer,...palindrome_number,...roman_to_integer,...longest_common_prefix,...longest_valid_parentheses,...swap_nodes_in_pairs,...threesum_closest,...find_first_range,...str_str,...first_missing_positive,...remove_duplicates_from_sorted_array,...substring_with_concatenation_of_all_words,...subsets_ii,...surrounded_regions,...swim_in_rising_water,...word_ladder,...burst_balloons,...distinct_subsequences,...hand_of_straights,...happy_number,...interleaving_string,...jump_game_ii,...longest_increasing_path_in_a_matrix,...merge_triplets_to_form_target_triplet,...minimum_interval_to_include_each_query,...multiply_strings,...partition_labels,...plus_one,...powx_n,...regular_expression_matching,...set_matrix_zeroes,...target_sum,...valid_parenthesis_string,...meeting_rooms,...meeting_rooms_ii,...graph_valid_tree,...connected_components,...alien_dictionary,...walls_and_gates,...encode_and_decode_strings})
export const SEMANTIC_SLUGS = Object.freeze(Object.keys(ADAPTERS))
export function semanticAdapter(slug) { return ADAPTERS[slug] || null }

function referenceLines(lines) {
  return lines.map(entry => {
    const text=entry.text.trim()
    // Structural wrappers are not the operation executed by an initialization event.
    if (/^class Solution\b/.test(text)||/^(public:|[{}];?)$/.test(text)) return {...entry,step:'structure'}
    if (entry.step==='init' && /^(public\s+)?[\w<>:*\[\], &]+\s+\w+\([^;]*\)\s*\{$/.test(text) && !/^(if|while|for|switch)\b/.test(text)) return {...entry,step:'signature'}
    return entry
  })
}

// Generic scope notes for normalized structural steps. Deliberately free of any
// problem-specific claim; adapters explain their own operations via explain/explainLines.
const STRUCTURE_NOTES = {
  structure: 'Structural wrapper: opens or closes a scope and performs no algorithm operation.',
  signature: 'Function signature: names the inputs and the result; execution starts in the body.',
}

export function resolveLineExplain(adapter, lang, index, step) {
  const specific = adapter.explainLines?.[lang]?.[index]
  if (typeof specific === 'string' && specific) return specific
  const shared = adapter.explain?.[step]
  if (typeof shared === 'string' && shared) return shared
  const structural = STRUCTURE_NOTES[step]
  if (typeof structural === 'string' && structural) return structural
  return null
}

export function buildSemanticWalkthrough(problem, options={}) {
  const adapter=semanticAdapter(problem?.slug)
  if(!adapter) return null
  const signature=problem.judge?.signature
  const adapterParamTypes=Array.isArray(adapter.signature.params)
    ? adapter.signature.params.map(p=>typeof p==='string'?p:p?.type)
    : []
  const liveParamTypes=Array.isArray(signature?.params)
    ? signature.params.map(p=>typeof p==='string'?p:p?.type)
    : []
  // Codec round-trip judges (encode/decode) intentionally diverge from the
  // single-function Learn replay adapter, so skip the exact-match gate there.
  const isRoundTripCodec=problem.judge?.mode==='round-trip' && Boolean(problem.judge?.decode)
  // Intentional Learn/judge shape splits: Learn adapters use pedagogical
  // shapes while the judge executes official shapes. Args are still validated
  // against the adapter below (length + tryParseLiteral + build), so the gate
  // bypass only skips the live-sig-vs-adapter identity check, not input checks.
  // - copy-list-with-random-pointer: adapter string vs judge Node->Node
  // - merge-k-sorted-lists: adapter int[][]->int[] vs judge ListNode[]->ListNode
  // - serialize-and-deserialize-binary-tree: adapter codecRoundtrip vs judge serialize+Codec class
  // - clone-graph: adapter int[][]->int[][] vs judge Node->Node
  // - surrounded-regions: adapter char[][] return vs judge void+mutates
  const INTENTIONAL_DIVERGENCE=new Set(['copy-list-with-random-pointer','merge-k-sorted-lists','serialize-and-deserialize-binary-tree','clone-graph','surrounded-regions'])
  const isIntentionalDivergence=INTENTIONAL_DIVERGENCE.has(problem?.slug)
  if(signature && !isRoundTripCodec && !isIntentionalDivergence && (signature.name!==adapter.signature.name || signature.return!==adapter.signature.return ||
    JSON.stringify(liveParamTypes)!==JSON.stringify(adapterParamTypes))) {
    throw new Error('This problem signature has changed; its walkthrough needs revalidation.')
  }
  const rawArgs=options.args || problem.judge?.tests?.[0]?.args
  if(!Array.isArray(rawArgs)||rawArgs.length!==adapter.signature.params.length) throw new Error('This walkthrough needs a complete input. Open Input to provide it.')
  const args=rawArgs.map(raw=>{
    const result=tryParseLiteral(raw)
    if(!result.ok) throw new Error('Could not parse walkthrough input: '+result.error)
    return result.value
  })
  const built=adapter.build(args)
  if(!built || !Array.isArray(built.frames) || !built.frames.length) throw new Error('The adapter produced no execution events.')
  // Short runs use honest context cards to satisfy the existing six-frame scene
  // contract. These repeat an actual snapshot and are explicitly not extra operations.
  if(built.frames.length<6) {
    const first=built.frames[0],last=built.frames.at(-1)
    const context=[
      {...first,label:'Context · input',note:rawArgs.join('; ')},
      {...first,label:'Context · task',note:problem.description?.split('\n')[0] || problem.title},
      {...first,label:'Context · invariant',note:adapter.lesson.idea},
      {...last,label:'Context · returned value',note:'Actual return value: '+JSON.stringify(built.result)},
    ]
    const needed=6-built.frames.length
    built.frames=[...context.slice(0,Math.min(needed,3)),...built.frames,...context.slice(3,needed>3?4:3)]
  }
  const code=Object.fromEntries(Object.entries(adapter.code).map(([lang,lines])=>{
    const normalized=referenceLines(lines)
    // Attach the resolved per-line note to the TRANSFORMED line: line-specific
    // metadata first, shared step notes as fallback, generic scope notes last.
    return [lang,normalized.map((line,index)=>({...line,explain:resolveLineExplain(adapter,lang,index,line.step)}))]
  }))
  const steps=new Set(built.frames.map(frame=>frame.step))
  for(const lang of ['java','cpp','pseudo']) for(const step of steps) {
    if(!code[lang]?.some(line=>line.step===step)) throw new Error(`Unmapped ${lang} operation: ${step}`)
  }
  if(['binary-search','search-insert-position'].includes(problem.slug)) {
    for(const frame of built.frames) {
      const {lo,hi}=frame.state.pointers || {}
      if(Number.isInteger(lo)&&Number.isInteger(hi)) {
        const eliminated={}
        built.layout.values.forEach((_,i)=>{if(i<lo||i>hi) eliminated[i]='dim'})
        frame.state.highlights={...eliminated,...frame.state.highlights}
        if(lo<=hi) frame.state.window=[lo,hi]
      }
    }
  }
  // Single compaction pass: adapters return full event lists with anchor indices,
  // so skip counts are honest and pedagogical frames survive when budget allows.
  // The full recorded array is captured for the additive drilldown holder: short
  // runs yield detail null (total<=40 or nothing omitted), so legacy scenes are
  // untouched. No change to sampling math.
  const fullFrames=built.frames
  const {frames,omitted,selected}=boundedFrames(fullFrames,40,built.anchors||[])
  const detail=buildDetail(fullFrames,{sampleSize:frames.length,omitted,anchors:built.anchors||[],selected})
  return {...built,frames:frames.map(frame=>({...frame,note:String(frame.note).slice(0,140)})),code,
    title:problem.title,pattern:problem.pattern,lesson:adapter.lesson,omitted,detail,
    // Optional per-line explanations (presentation metadata); null when the adapter
    // has neither step notes nor line notes, so the UI can hide the Explain toggle
    // instead of a dead control. Per-line truth lives on the transformed code entries.
    explain:(adapter.explain||adapter.explainLines)?(adapter.explain||{}):null,
    languages:['java','cpp','pseudo'],source:'problem-adapter'}
}
