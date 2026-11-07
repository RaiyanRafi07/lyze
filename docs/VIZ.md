# Visualization system — reusable panel + primitives (Two Sum first — SHIPPED 2026-11-05)

Status: **implemented and verified** (see §7). What follows is the blueprint as built.

## 1. Panel sections (walkthrough stage, top to bottom)

1. **Step band**: `STEP x/y` badge + step label + one-line explanation (aria-live).
   The explanation lives *with the picture* so a newcomer never needs the source first.
2. **Primary canvas**: the diagram (unchanged renderer contract).
3. **Secondary state strip**: variable cards + collection snapshots, same data as the
   canvas, as text (crisper than SVG text, themeable, hoverable).
4. **Controls + timeline**: restart/prev/play/next, scrub, `x/y` counter, speed, step pills.

The code column keeps: reference code, why-it-works / traps, CTA. Reading and watching
are separate columns with one shared state (frames), linked both directions (already built).

Recomposition = reparenting existing nodes (`nowCard`, `stateBox`) into the stage pane.
No new data flow; `renderState`/`paint` keep working by closure.

## 2. Reusable primitives (data-driven, every scene kind can use them)

| Primitive | Frame state | Renders | Honesty rule |
|---|---|---|---|
| `vars` cards | `state.vars = {name: number\|string}` (≤12) | HTML cards in the state strip | Only values the algorithm actually holds *now* |
| `lookup` arrow | `state.lookup = {from: idx, key: str, hit: idx\|null}` | SVG badge + stem on array/string scenes | Only on frames that perform a lookup; miss shows "not stored" |
| empty caption | (derived: state carries nothing yet) | Small muted SVG caption "nothing computed yet — step forward (→)" | Shows *only* when the state is truly empty; never on computed frames |
| gliding chips | existing `state.pointers` | Pointer chips pooled by name, moved via CSS transform | Same state as before; only the motion changes |

`vars`/`lookup` join the additive contract in `scenes.js` (old scenes unaffected).
First emitter: arrays-hashing (walkthrough builder + `twoSumSweep`). Other families keep
working unchanged and can adopt the keys later — the renderer already handles absence.

## 3. Animation language (one timing system)

- Unit: 240ms ease-out for moves/highlights/appearances; scrub/timeline immediate.
- Pointer chips glide (pooled nodes + CSS `transform`, was re-created per frame = pop).
- Highlights cross-fade via class changes (existing). Lookup badge fades in
  (`lc-fadein` keyframe; the global reduced-motion rule already zeroes it).
- Backward/restart: `goTo` re-applies frame state deterministically — no hidden
  tweens, so stepping back always shows the true earlier state. Verified in-app.

## 4. Interaction

- Restart button (⏮ → frame 0) joins prev/play/next + speed + scrub + pills.
- Leaving Walkthrough pauses playback (no animation while writing code).
- Hover/selected states unchanged; focus/keyboard behavior unchanged.

## 5. Not doing

- No per-problem custom layouts (Two Sum is the *first instance*, not a special case).
- No `compare` primitive this pass (notes already explain comparisons; avoids a third
  state key with marginal value).
- No canvas text for variables (HTML strip is crisper + accessible).
- No layout-trap violations: grid/absolute/tabpanel structure untouched.

## 6. Acceptance (the brief's success criterion)

A newcomer watches Two Sum and can say: what it does (find two indices summing to target),
what changes per step (pointer advances, need computed, map lookup hits/misses, map grows),
why the answer is right (the two highlighted cells + the map row that matched) — verified by
reading screenshots, not by asserting it.

## 7. Outcome (shipped)

- Panel recomposed: step band + state strip live in the stage column; code column keeps
  code + insight + CTA. Restart (⏮) added; leaving Walkthrough pauses playback.
- Primitives live for every scene: `vars` cards (HTML strip), `lookup` badge+stem
  ("2 → @0" hit / "7 → ∅ not stored" miss), honest empty captions, gliding pointer chips
  (pooled nodes + CSS transform; linked lists too).
- Emitters: walkthrough arrays-hashing + `twoSumSweep` emit `vars`/`lookup`.
- Deep-link bonus (needed for screenshots, useful for sharing): `?step=N` in the URL hash
  lands on a frame (`shots/viz/dark-match.png` was captured this way).
- Verified: forward/backward/restart determinism checked live in-app (identical state
  signatures both directions, zero console errors); reduced-motion zeroes the badge fade
  via the existing global rule; suites green (judge 23/23, variants ALL GREEN, engine
  22/22, data OK). Screenshots: `shots/viz/` dark+light frame 0 and match frames.
- Left out: `compare` primitive (notes cover it); canvas text for variables (HTML is
  crisper); per-problem custom layouts (Two Sum is the first instance, not a special case).
