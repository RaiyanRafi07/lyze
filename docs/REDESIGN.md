# LeetCode Lab — structural redesign (shipped 2026-11-05)

Status: **implemented and verified** — see §10 for the outcome and what was left out.
Direction = user's neo-brutalist mockups (see THEME.md §8). This doc was the *structural*
blueprint: composition, scale, density, workflow.

## 1. Diagnosis (from the screenshots, honestly)

- **Scale**: body 13.5px, hints 9.5–10.5px, transport buttons 27px, steps pills 25px, code 12px.
  Everything is one notch too small; the workspace feels dense but not readable.
- **Visualizer dead space**: `reset()` pads the viewBox by `max(w,h)*0.2+14`, cells are 46px
  with 1.5px hairlines, tree nodes r=20. A 4-cell array floats in a large void.
- **Workflow blur**: Walkthrough/Solve/Variations tabs differ only by an underline; nothing
  says "read here, type here, watch here".
- **Hierarchy**: everything is same-weight dark cards; accent color appears as decoration,
  rarely as structure.

## 2. Type + spacing scale (single source)

| Token | Value | Use |
|---|---|---|
| base | 14.5px / 1.6 | body, notes, explanations |
| micro / small | 11px / 12.5px | hints, meta, kickers |
| h-tab / h-card | 14px semibold | tab labels, card titles |
| h-section | 17px serif 800 | pane headers, drawer titles |
| h-problem | 24px serif 900 | problem title |
| code | 13.5px / 1.65 | editor + reference code |
| space | 4pt grid, card pad 16–18px | consistent gutters |

Touch targets: transport 27px → 33px; step pills 25px → 30px; seg buttons 23px → 27px.

## 3. Mode system (Walkthrough vs Solve vs Variations, unmistakable)

- Tabs become a **mode rail**: taller (padding 12px), 14px labels, active tab gets a 3px
  solid top bar in the *mode color* + tinted background.
- Mode colors: Walkthrough = accent (sky/periwinkle), Solve = brand Cherry, Variations = Olive.
- `problem.js` sets `root.dataset.mode` on tab switch; the workspace shows a 3px top rule
  in the mode color (`#mode-rule`), so the whole panel declares its mode.
- Steps strip and transport keep working; labels grow to 12px.

## 4. Walkthrough composition (code | stage | steps)

- Code pane: header 44px, `REFERENCE SOLUTION` kicker 12px; code 13.5px.
- Step card (`lc-now`): label 14px semibold + `STEP x/y` badge solid; note 14px.
- Stage: viewport unchanged structurally; transport 52px tall, 33px buttons, visible
  `x/y` counter 13px; legend 11.5px.
- State chips 12.5px; ops plot kept.

## 5. Visualizer density (diagram.js constants — the dead-space fix)

- `CELL 46→56`, `GAP 9→10`, `CHAR_CELL 34→40`; viewBox pad `0.2*max+14` → `0.08*max+10`.
- Grid cells `max(26,…)` → `max(34,…)`; tree/graph node r `20/21` → `24`; tree spacing
  `56→64` / `92→100`; SVG label fonts +1–2px; pointer chips +2px.
- Same geometry, same frames, same classes — pure legibility, no logic change.

## 6. Solve composition (statement | editor+results)

- Statement prose 14.5px/1.65; examples as bordered cards (already) with 2px borders.
- Editor font 13.5px/1.65; solve-bar 48px; Run/Trace/Solve buttons 34px; Submit = Cherry
  primary (already) with hard shadow.
- Result cases become status-headed cards (colored top strip via border-top), verdict row 14px.

## 7. Explorer + home

- Catalog rows 52px → 60px, titles 14px semibold; difficulty labels 11.5px.
- Home: hero serif bigger; ladder cards get *limited* difficulty color blocks
  (Easy=Olive, Medium=Lemon, Hard=Cherry tints with 2px borders) — colorful but controlled.
- Dark theme character: lifted Thunder surfaces + cream ink + cherry primaries + olive/lemon
  accents, so dark is a designed theme, not "light turned down".

## 8. What is NOT changing (layout traps, still binding)

- `mount()` block container; `.lc-shell/.lc-main` height chain; `:where(button)` reset;
  absolute `.lc-tabpanels`; virtualised catalog sizer; `?b=` stamping; judge/trace/AI APIs.
- New DOM only where unavoidable (mode rule is CSS on existing root; no new wrappers
  except none planned). JS edits: tab classes, `dataset.mode`, diagram constants.

## 9. Verification (visual, per the brief)

- Suites green after every step.
- Screenshots: Two Sum workspace 1700 + 1200, both themes; subsets + edit-distance spot
  checks; read each for readability/balance/waste/alignment; iterate ≥2 rounds.
- In-app (sidebar) zero-error check; park on Two Sum when done.

## 10. Outcome (shipped)

- **Scale**: base 13.5→14.5px, code 13.2→13.5/25px lines, editor 12.4→13.5/22px, transport
  27→34px buttons, steps 25→30px pills at 12px, state chips 12.5px, catalog rows 52→62px
  (JS `ROW_HEIGHT` 56→64 kept in sync) with 14px titles.
- **Mode system**: tabs are a mode rail (taller, 14px labels, 3px mode-color top bar:
  Walkthrough=accent, Solve=Cherry, Variations=mint); `root.dataset.mode` paints a 3px
  mode rule across the workspace.
- **Density**: cells 46→56px, pad 20%→7%, grid min 26→34px, nodes r20/21→24, tree spacing
  up, SVG captions 10.5→12px. Same frames, same classes.
- **Solve**: statement 14.5px, 34px action buttons, status-headed result cards, 15px verdict.
- **Home**: serif section heads, difficulty color-block cards (5px top strips), bigger letters.
- Verified: judge 23/23, variants ALL GREEN, engine 22/22, data OK; in-app Solve run +
  Variations render with zero errors; screenshots `shots/r1/` (both themes × 1700/1200,
  subsets, home) read and iterated (2 rounds: lifted dark cells, AI-button layout, narrow
  chrome compression at ≤1350/1240px).
- **Left out**: resizable/collapsible panels (height-chain trap still binding); dedicated
  phone layout (980px breakpoint stacks, verified non-broken); virtualized catalog keeps
  fixed row height by design; hero illustrations (none exist — not added, decoration
  without function would violate the brief's own rules).
