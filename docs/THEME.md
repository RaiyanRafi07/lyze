# LeetCode Lab — 2D restyle (superseded by §8: editorial neo-brutalism, both themes)

History: first pass shipped direction C (playful chunky, dark only). The user then supplied
reference mockups (cream + Thunder-navy editorial neo-brutalism, light *and* dark, Cherry
primary, serif display type) and a full brief. §8 records what was built from that brief.
§1–§7 remain as the audit trail for the first pass.

## 1. Audit: why it looks "modern glassy"

`plugin/web/styles.css` (3,348 lines) contains **131 glassmorphism markers**:

- `backdrop-filter: blur(...)` on the drawer, scrim-adjacent panels, input popover (lines 141, 1726, 2546)
- radial-gradient background washes on the app root (lines 53–56) and section headers (1258)
- ~10 `linear-gradient` button/chip surfaces (323, 330, 658, 662, 1831, 2360…) with inset
  `box-shadow` top-highlights (`inset 0 1px 0 rgba(255,255,255,…)`) — the classic glossy button
- glow shadows everywhere: `0 0 12px accent`, `drop-shadow(0 0 12px …)` on current nodes,
  `text-shadow: 0 0 18px` on headings, neon focus rings
- nearly every surface is a translucent white (`rgba(255,255,255,0.02–0.09)`) layered over
  more translucency, so contrast depends on *what happens to be behind* — the exact
  readability complaint glassmorphism always earns

`plugin/web/engine/diagram.js` matches: `PALETTE` is all translucent fills
(`rgba(124,140,255,0.16)` …), 1px hairline strokes at 10% opacity, and the CSS adds
`drop-shadow` glows on highlighted nodes. The diagram is already structurally 2D (flat SVG
shapes); it is *painted* glassy.

## 2. Benchmark (short — full table lives in DESIGN.md §2)

| Source | What to steal for a 2D look |
|---|---|
| Galles visualizations (benchmark #5) | Zero decoration; state is carried by shape + label, never by glow. A current cell in Galles is a *filled solid*, not a halo. |
| explorabl.es / Nicky Case ouvre (benchmark #8, fetched 2026-11-05) | Thick outlines, solid flat fills, chunky rounded shapes, one idea per screen. The "2D game" feel the user is pointing at. |
| Distill (benchmark #7) | Paper-like restraint: near-flat surfaces, hairline rules, color used sparingly so highlights *mean* something. |
| Red Blob Games (benchmark #6) | Flat grid + two or three categorical colors (visited / frontier / path). No gradients anywhere. |
| Victor, "show the data" (benchmark #1) | Supports the change: removing decoration *increases* information density — every remaining pixel encodes state. |

What NOT to steal: Nicky Case's hand-drawn wobble and cream-everywhere palette (hurts dense
code panes and clashes with the dark Harness shell); Distill's light page (same clash —
the lab lives inside a dark sidebar app, and a light theme would flashbang next to it).

## 3. Three candidates

### A — Flat Dark "chalkboard" (RECOMMENDED)

```
+--------------------------------------------------+
| #0B0E14 solid bg, no washes                      |
| +----------------------------------------------+ |
| | CODE  solid #11151D, 1px solid #2A3040 border| |
| | > executing line: solid accent fill, no glow | |
| +----------------------------------------------+ |
| [ 2 ][ 7 ][11 ][15 ]  cells: solid #161B26      |
|  2px solid strokes; current = solid accent fill |
|  with dark text; match = solid green fill       |
+--------------------------------------------------+
```

- Tokens: solid backgrounds, 1–2px **opaque** borders, zero `blur`, zero gradients, zero
  glow shadows. Status = solid fills with high-contrast text (current = filled accent block,
  not a halo + halo-text).
- Diagram: cells/nodes get 2px opaque strokes; highlights become solid fills; arrows stay
  flat lines with solid heads. Same geometry, same layout, same class names.
- Risk: lowest. CSS + palette only, no layout or logic changes. Stays dark like its host.

### B — Paper Light "textbook"

Cream/paper surfaces (`#F7F3EA`), ink text (`#1A1C22`), one accent, hairline rules —
Distill-like. Most readable in daylight, biggest contrast win on paper.
Rejected as default: it fights the dark Harness shell (flashbang in the sidebar), needs
every token flipped including the code editor and all 19 walkthrough palettes, and the
diagram's dark-optimized categorical colors must all be re-proven. Could be a *second*
theme later behind a toggle — not the fix for "I don't like the look".

### C — Playful chunky "explorables"

Nicky Case direction, kept dark: extra-thick (3px) outlines, oversized radii, bolder
saturated solids, chunkier type. Maximum "2D game" feel.
Rejected as the base: at code-pane density it reads childish and wastes space (thicker
everything = fewer visible lines); better as a *diagram-only* accent (thick cell strokes)
inside candidate A.

## 4. What changes / what does not

Changes (CSS + palette constants only):
- `styles.css` `:root` tokens → opaque solids; delete all `backdrop-filter`, gradient,
  glow `box-shadow`/`drop-shadow`/`text-shadow` rules; borders go from
  `rgba(255,255,255,0.06)` to opaque 1–2px strokes; status fills become solid.
- `diagram.js` `PALETTE` → opaque fills/strokes; matching SVG CSS rules flattened.
- Editor syntax colors stay, re-checked against the new solids for ≥ 4.5:1 contrast.

Does NOT change: DOM structure, class names, layout values, spacing scale, behavior,
suites, or the 3D cinema toggle. This is a repaint, not a rebuild — a full layout
redesign is explicitly out of scope for this pass.

## 5. How I will measure it (concrete checks)

1. `grep -c 'backdrop-filter\|linear-gradient\|radial-gradient\|drop-shadow' styles.css` → 0
   (outside an explicit legacy comment); `rgba(` only where transparency is functional
   (scrim, disabled states).
2. Body-text contrast ≥ 4.5:1 sampled on bg, surfaces, code pane (computed, not eyeballed).
3. Fresh screenshots (1700 + 1200px) for two-sum / edit-distance / subsets, read as a
   designer: state readable in 2 s, highlights unambiguous without glow, nothing clipped.
4. Suites green: judge 23/23, variants ALL GREEN, engine-check, validate_data.
5. In-app (sidebar) + standalone URL, zero console errors.

## 6. Open question for the user

Picked **C** — implemented as specified below.

## 7. Outcome (what actually changed)

- `styles.css` tokens → opaque solids (`--bg #0B0E14`, stepped surfaces, `--border #2E3648`
  / `--border-strong #4A5570`, solid status tints); radii bumped chunky (9/12/16/22px);
  shadows converted from glows to hard offsets (`2–6px 0 black`).
- Glass grep → **0**: no `backdrop-filter`, no gradients, no `drop-shadow`/`text-shadow`,
  no glow `box-shadow` in `styles.css` or `diagram.js`.
- Buttons: glossy gradients → solid fills, 2px borders, hard-shadow press states.
- Executing line: solid band + 3px accent bar, semibold text. Current diagram cells/nodes:
  **solid accent fill with dark text** (7.70:1), 3px dark strokes; ok/warn/bad = solid
  fills with 3px strokes. Edges 2.5px, path edges 4px.
- Contrast (computed): body 17.55, dim 7.16, current-cell 7.70, ok 5.69, warn 6.93,
  bad 4.59, code 11.91 — all ≥ 4.5 except faint meta text (4.11, decorative only).
- Layout, class names, behavior untouched — repaint only. Suites green
  (judge 23/23, variants ALL GREEN, engine-check 22/22, data contract OK); in-app +
  standalone verified with zero console errors. Screenshots: `shots/flat/` (1700px ×4,
  1200px ×1), read as a designer before sign-off.

## 8. Editorial neo-brutalism, light + dark (shipped 2026-11-05, supersedes §1–§7)

Brief: user-supplied mockups — cream/Linen light theme, Thunder-navy dark theme, Cherry
primary actions, Peony/Sky/Lemon/Olive secondaries, Fraunces display serif + Inter body +
JetBrains Mono, 0–4px radii, 1–2px borders, hard offset shadows, Light/Dark/System toggle.

What was built:
- **Tokens**: dark default remapped to Thunder (`--bg #101426`, warm off-white text,
  `--brand` Cherry `#B04536` for prominent actions, difficulty Olive/Lemon/red); light block
  (`--bg #EFE9DB` cream, Thunder ink, Cherry `#8E2A21` primary). Sharp radii 2–4px.
- **Fonts**: Fraunces (display: brand, hero, problem titles) + Inter (body) + JetBrains Mono
  via Google Fonts with system fallbacks — offline still renders correctly.
- **Theme system**: `store.theme` (`light|dark|system`, persisted), OS listener, header
  toggle cycling Light→Dark→Auto, `data-theme` on `.lc-app`, no-flash inline script in
  `index.html`, plus session-only `?theme=` override (used for screenshots).
- **Diagram**: zero renderer changes — light mapping is pure CSS (SVG uses presentation
  attributes, so scoped rules win). Cream cells/white nodes, Cherry current, Olive/Gold
  ok/warn. Editor and walkthrough code slabs deliberately stay dark in light mode,
  matching the reference mockups.
- **Verification**: glass grep still 0; suites green; toggle tested live (Auto→Light→Dark→
  restored Auto, diagram intact); screenshots `shots/neo/` (light/dark two-sum + subsets
  at 1700px, light 1200px), all read as a designer.
- **Explicitly not done**: resizable/collapsible panels (layout freeze per the brief's own
  traps); multi-run n-vs-ops plot (unchanged decision); narrower-than-1200px phone layouts
  (checked 1200px, no breakage; phones get stacked scroll, not a dedicated layout).

## 9. Color-as-structure pass (shipped 2026-11-05)

Roles (both themes): Lemon = active operation / step explanation; Sky = algorithm state
and data; Peony = walkthrough identity surfaces; Olive = success/completion; Cherry =
primary CTAs + Solve mode; Thunder = ink/borders; Linen = light canvas. ~70% neutral,
~30% colored. Step band goes Lemon, state strip Sky, steps timeline Peony-tinted,
active mode tabs get filled tints, selected nav rows get filled Sky. Diagram: current =
Lemon, match = Olive solid, pointers = Sky chips, seen rows = Sky tint. Details in code;
verified by screenshots + computed contrast (§7 method).

Outcome: `shots/color/` (dark+light match frames, both homes, 1200px). New tokens
`--peony/sky/lemon/olive/cherry` (+ `-soft`/`-ink`) in both themes, mirrored into the
dark code slabs so scoped components never read the wrong theme's values. Contrast audit:
all pairs ≥ 4.5 except large-only Olive match text (3.87 → darkened to 5.41) and Sky chip
ink (5.39). Caught in review: primary-button ink lost to the `:where(button)` reset in
light mode (fixed with `.lc-app`-scoped rules), washed-out trap card in light slabs
(fixed via slab-scoped identity tokens), unreadable active step pill in light (fixed).
Suites green; in-app walkthrough (band, lookup badge, 4 var cards) verified with zero
console errors.

## 10. Final polish pass (shipped 2026-11-05 — no more aesthetic changes planned)

- **Type scale**: floor set — nothing informative below 11px (was 8.5–10.5 in ~40 places);
  secondary standard 11–12px; documented scale micro 11 / small 11.5–12 / body 14.5 /
  code 13.5 / serif heads. No functional space lost (chips/badges/pills only).
- **Dark home richness**: hero is now a plum-tinted card; ladder cards carry muted
  olive/lemon/cherry washes under their top strips; kicker stays Lemon.
- **Washed-text sweep**: ~20 fixed light-on-dark colors converted to theme tokens
  (statement prose, constraints, hints, examples explainer, AI markdown, variation
  statements, case IO code, prose code chips, error/trap panels, badges, Sky tones).
  Also fixed a real bug found by screenshots: the editor's transparent textarea lost to
  the `:where(button)`-style reset and rendered double text (now `.lc-app`-scoped +
  `-webkit-text-fill-color`).
- **Wayfinding**: session-only `?panel=` deep links (walkthrough/solve/variations) so all
  four views screenshot deterministically; `shots/final/` holds Home/Walkthrough/Solve/
  Variations × dark/light at identical 1700px viewports.
- Keyboard verified live (tab focus, Play focus, visible 2.7px ring); reduced-motion
  untouched and global. Per the brief, aesthetic work stops here absent demonstrable
  problems — next effort goes to usability and learning.
