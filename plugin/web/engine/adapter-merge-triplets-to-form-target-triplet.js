/**
 * merge-triplets-to-form-target-triplet — live semantic adapter (Greedy).
 *
 * Walkthrough algorithm (LeetCode 1899, Medium): keep only triplets whose
 * every value is <= target (an overshooting row would poison the merged max
 * at that slot); the target is reachable iff each slot x,y,z is matched by
 * at least one kept row. O(n) time, O(1) space.
 *
 * Staged source: .workers/jobs/neetcode150-completion/merge-triplets-to-form-target-triplet/merge-triplets-adapter.js
 * (signature, lesson, Java/C++/pseudo, buildMergeTriplets event emitter) — ported to
 * the live shape: shared helpers imported from semantic-core.js, no local
 * code/frame redefinitions. Signature equals the live judge signature exactly
 * (plugin/data/shard-10.json :: merge-triplets-to-form-target-triplet judge.signature):
 *   mergeTriplets(int[][], int[]) -> boolean, mode exact.
 *
 * Visual bound (walkthrough only): triplets rows 1..6, each row length exactly 3,
 * every value integer 0..1000; target length exactly 3, values 0..1000.
 * Larger inputs are rejected with a clear error (never truncated).
 * The judge runner keeps the full constraints (n up to 1e5, values 1..1000).
 *
 * Pure ES module: no DOM, no network, no dependencies besides semantic-core.js.
 */

import { code, frame, boundedFrames } from './semantic-core.js'

// boundedFrames is applied by semantic.js (single compaction pass); the import
// keeps this adapter on the shared helper contract. Adapters return FULL lists.

export const SLUG = 'merge-triplets-to-form-target-triplet'

// Live judge signature, exactly (judgeable slug).
export const SIGNATURE = {
  name: 'mergeTriplets',
  params: ['int[][]', 'int[]'],
  return: 'boolean',
}

export const MODE = 'exact'

function decodeTriplets(value) {
  if (!Array.isArray(value)) throw new Error('merge-triplets needs triplets as int[][] (got non-array)')
  if (value.length < 1 || value.length > 6)
    throw new Error('Visual walkthrough needs triplets rows 1..6 (got ' + value.length + '); use 1..6 rows (no truncation)')
  return value.map((row, r) => {
    if (!Array.isArray(row) || row.length !== 3)
      throw new Error('merge-triplets needs each triplet to have exactly 3 ints (row ' + r + ' has ' + (Array.isArray(row) ? row.length : 'non-array') + ')')
    return row.map((cell, c) => {
      if (!Number.isSafeInteger(cell) || cell < 0 || cell > 1000)
        throw new Error('triplets[' + r + '][' + c + ']=' + String(cell) + ' needs integer 0..1000 for this walkthrough')
      return cell
    })
  })
}

function decodeTarget(value) {
  if (!Array.isArray(value) || value.length !== 3)
    throw new Error('merge-triplets needs target as int[3] (got ' + JSON.stringify(value) + ')')
  return value.map((v, k) => {
    if (!Number.isSafeInteger(v) || v < 0 || v > 1000)
      throw new Error('target[' + k + ']=' + String(v) + ' needs integer 0..1000 for this walkthrough')
    return v
  })
}

const mergeTripletsJava = code(`
[def] class Solution {
[def]     public boolean mergeTriplets(int[][] triplets, int[] target) {
[init]         boolean[] found = new boolean[3];
[scan]         for (int i = 0; i < triplets.length; i++) {
[skip]             if (triplets[i][0] > target[0] || triplets[i][1] > target[1] || triplets[i][2] > target[2]) {
[skip]                 continue;
[skip]             }
[match]             for (int k = 0; k < 3; k++) {
[match]                 if (triplets[i][k] == target[k]) {
[match]                     found[k] = true;
[match]                 }
[match]             }
[early]             if (found[0] && found[1] && found[2]) {
[early]                 return true;
[early]             }
[scan]         }
[done]         return found[0] && found[1] && found[2];
[def]     }
[def] }
`)

const mergeTripletsCpp = code(`
[def] class Solution {
[def] public:
[def]     bool mergeTriplets(vector<vector<int>>& triplets, vector<int>& target) {
[init]         bool found[3] = {false, false, false};
[scan]         for (size_t i = 0; i < triplets.size(); i++) {
[skip]             if (triplets[i][0] > target[0] || triplets[i][1] > target[1] || triplets[i][2] > target[2]) {
[skip]                 continue;
[skip]             }
[match]             for (int k = 0; k < 3; k++) {
[match]                 if (triplets[i][k] == target[k]) {
[match]                     found[k] = true;
[match]                 }
[match]             }
[early]             if (found[0] && found[1] && found[2]) {
[early]                 return true;
[early]             }
[scan]         }
[done]         return found[0] && found[1] && found[2];
[def]     }
[def] };
`)

const mergeTripletsPseudo = code(`
[def] function mergeTriplets(triplets, target)
[init]   found = [false, false, false]
[scan]   for i from 0 to length(triplets) - 1
[skip]     if triplets[i][0] > target[0] or triplets[i][1] > target[1] or triplets[i][2] > target[2]
[skip]       continue to next triplet
[match]     for k from 0 to 2
[match]       if triplets[i][k] == target[k] then found[k] = true
[early]     if found[0] and found[1] and found[2] then return true
[scan]   end for
[done]   return found[0] and found[1] and found[2]
[def] end function
`)

export function buildMergeTriplets(args) {
  if (!Array.isArray(args) || args.length !== 2) throw new Error('merge-triplets expects [triplets, target]')
  const triplets = decodeTriplets(args[0])
  const target = decodeTarget(args[1])
  const rows = triplets.length
  const frames = []
  const blocked = []
  const filled = []
  const path = []
  const found = [false, false, false]

  const state = (current, extra = {}) => ({
    current,
    cells: triplets.map((r) => r.slice()),
    filled: filled.map((p) => p.slice()),
    blocked: blocked.map((p) => p.slice()),
    path: path.map((p) => p.slice()),
    vars: { target: target.slice(), found: found.slice(), ...extra.vars },
    ...(extra.pointers ? { pointers: extra.pointers } : {}),
  })

  frames.push(
    frame(
      'init',
      'Track each target slot',
      'Need one usable triplet matching target ['
        + target.join(',') + '] at each position 0,1,2.',
      state(null, { vars: { target: target.slice(), found: found.slice(), n: rows } })
    )
  )

  for (let i = 0; i < rows; i++) {
    const t = triplets[i]
    frames.push(
      frame(
        'scan',
        'Inspect triplet ' + i,
        'Row ' + i + ' is [' + t.join(',') + '] vs target [' + target.join(',') + '].',
        state([i, 1], { vars: { i, row: t.slice(), target: target.slice(), found: found.slice() }, pointers: { i } })
      )
    )
    const overshoot = t[0] > target[0] || t[1] > target[1] || t[2] > target[2]
    if (overshoot) {
      const bad = []
      for (let k = 0; k < 3; k++) if (t[k] > target[k]) bad.push(k)
      for (let k = 0; k < 3; k++) blocked.push([i, k])
      frames.push(
        frame(
          'skip',
          'Discard row ' + i,
          'Value ' + t[bad[0]] + ' at slot ' + bad[0] + ' exceeds ' + target[bad[0]] + '; whole row unusable.',
          state([i, 1], { vars: { i, row: t.slice(), bad, target: target.slice(), found: found.slice() }, pointers: { i } })
        )
      )
      continue
    }
    for (let k = 0; k < 3; k++) filled.push([i, k])
    const hits = []
    for (let k = 0; k < 3; k++) {
      if (t[k] === target[k] && !found[k]) {
        found[k] = true
        hits.push(k)
        path.push([i, k])
      } else if (t[k] === target[k]) {
        hits.push(k)
      }
    }
    frames.push(
      frame(
        'match',
        hits.length ? 'Cover slots ' + hits.join(',') : 'No new slot',
        hits.length
          ? 'Row ' + i + ' matches slot(s) ' + hits.join(',') + '; found=[' + found.map((v) => (v ? 'T' : 'F')).join(',') + '].'
          : 'Row ' + i + ' is usable but adds no new slot; found stays [' + found.map((v) => (v ? 'T' : 'F')).join(',') + '].',
        state([i, 1], { vars: { i, row: t.slice(), hits: hits.slice(), target: target.slice(), found: found.slice() }, pointers: { i } })
      )
    )
    if (found[0] && found[1] && found[2]) {
      frames.push(
        frame(
          'early',
          'All slots covered',
          'Slots 0,1,2 each matched by a usable row; return true.',
          state([i, 1], { vars: { i, target: target.slice(), found: found.slice(), answer: true }, pointers: { i } })
        )
      )
      return {
        kind: 'grid',
        layout: { rows, cols: 3, cells: triplets.map((r) => r.slice()) },
        frames,
        result: true,
      }
    }
  }

  const ok = found[0] && found[1] && found[2]
  frames.push(
    frame(
      'done',
      ok ? 'Covered' : 'Missing slot',
      ok
        ? 'Every slot matched; return true.'
        : 'Slot(s) ' + [0, 1, 2].filter((k) => !found[k]).join(',') + ' never matched; return false.',
      state(null, { vars: { target: target.slice(), found: found.slice(), answer: ok } })
    )
  )
  return {
    kind: 'grid',
    layout: { rows, cols: 3, cells: triplets.map((r) => r.slice()) },
    frames,
    result: ok,
  }
}

export const adapters = {
  'merge-triplets-to-form-target-triplet': {
    signature: SIGNATURE,
    lesson: {
      idea: 'Keep only triplets with every value <= target; target is reachable iff each slot x,y,z is matched by at least one kept row.',
      trap: 'A row with even one value above target is fully unusable — it would poison the merged max at that slot.',
      time: 'O(n)',
      space: 'O(1)',
    },
    explain: {
      def: 'Scope of the merge check: decide whether usable rows cover all three target slots.',
      init: 'Start with no slot covered; only a kept row can set a slot, so overshoot rows never count.',
      scan: 'Focus on one triplet row at a time against the fixed target triple.',
      skip: 'Discard the whole row when any value exceeds target, since merging it would overshoot that slot.',
      match: 'Record every slot where this kept row equals target; a repeat match keeps the slot covered.',
      early: 'Stop as soon as all three slots are covered, since no later row can uncover them.',
      done: 'Return whether slots 0, 1 and 2 were all covered by kept rows.',
    },
    explainLines: {
      java: [
        'Class wrapper: holds the method; performs no algorithm operation.',
        'Method header: receives triplets and target; the cover check starts in the body.',
        'Allocate found[3] all false: no target slot is covered yet.',
        'Row loop: visit each triplet once in order; only kept rows can cover slots.',
        'Overshoot guard: any value above target disqualifies the whole row.',
        'Discard: skip this row entirely; it can never join a merge reaching target.',
        'Guard close: a row passing the test falls through to slot matching.',
        'Slot loop: compare the kept row against target at positions 0,1,2.',
        'Equality test: this slot matches only when values are exactly equal.',
        'Cover: mark slot k as matched by a usable row.',
        'Branch close: non-matching slots leave found unchanged.',
        'Slot loop close: advance to the next row after all three slots were tested.',
        'Full-cover test: all three slots matched by kept rows so far.',
        'Early success: merging the covering rows yields target; return true now.',
        'Branch close: otherwise keep scanning later rows.',
        'Row loop close: advance to the next triplet after the cover test.',
        'Verdict: true only when slots 0,1,2 were each matched by some kept row.',
        'Method scope close: the returned boolean is final.',
        'Class scope close: no operation.',
      ],
      cpp: [
        'Class wrapper: holds the method; performs no algorithm operation.',
        'Access label: visibility only; performs no operation.',
        'Method header: triplets by reference, target by reference; cover check starts below.',
        'Allocate found[3] all false: no target slot is covered yet.',
        'Row loop: visit each triplet once in order; only kept rows can cover slots.',
        'Overshoot guard: any value above target disqualifies the whole row.',
        'Discard: skip this row entirely; it can never join a merge reaching target.',
        'Guard close: a row passing the test falls through to slot matching.',
        'Slot loop: compare the kept row against target at positions 0,1,2.',
        'Equality test: this slot matches only when values are exactly equal.',
        'Cover: mark slot k as matched by a usable row.',
        'Branch close: non-matching slots leave found unchanged.',
        'Slot loop close: advance to the next row after all three slots were tested.',
        'Full-cover test: all three slots matched by kept rows so far.',
        'Early success: merging the covering rows yields target; return true now.',
        'Branch close: otherwise keep scanning later rows.',
        'Row loop close: advance to the next triplet after the cover test.',
        'Verdict: true only when slots 0,1,2 were each matched by some kept row.',
        'Method scope close: the returned boolean is final.',
        'Class scope close: no operation.',
      ],
      pseudo: [
        'Function scope: mergeTriplets receives the triplet list and the target triple.',
        'Allocate found flags: three uncovered slots before the scan.',
        'Row loop: consider each triplet once in input order.',
        'Overshoot guard: the whole row is unusable when any value exceeds target.',
        'Discard: skip to the next triplet without recording any slot.',
        'Slot loop: test positions 0..2 of a kept row against target.',
        'Cover on equality: mark slot k matched; repeats keep it matched.',
        'Full-cover shortcut: all three slots seen, so merging covers target.',
        'Row loop close: move to the next triplet when not yet covered.',
        'Verdict: conjunction of the three flags is the reachability answer.',
        'Function scope close: the returned flag is final.',
      ],
    },
    code: { java: mergeTripletsJava, cpp: mergeTripletsCpp, pseudo: mergeTripletsPseudo },
    build: buildMergeTriplets,
  },
}
