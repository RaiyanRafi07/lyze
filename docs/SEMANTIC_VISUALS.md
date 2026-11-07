# Semantic walkthrough pass — 2026-11-06

The owner has reopened visual design and approved implementation. This supersedes
THEME.md section 10's freeze for this work. Data, API and renderer contracts remain.

Observed in the live side browser: the 3D array uses value-height bars although Two
Sum needs identity, index, a complement lookup and remembered values. Code gets
squeezed by explanatory panels at narrow widths. Hash rows extend beyond the SVG
viewBox. A store frame describes insertion while still showing the pre-insert map.

Candidates: (1) keep cinema and add captions; (2) use semantic data structures and
progressively disclose secondary information. Choose (2): a labelled array, a map
with value/index columns, explicit misses and hits, and a separate insertion step.
Flat arrays and strings use the semantic view; existing spatial views remain for
other structures. No new dependency, AI call, or invented problem data is needed.

Measure: code and diagram readable at the actual side-browser width and at desktop
width; map rows inside bounds; lookup and insertion agree with the executing line;
keyboard steps, custom inputs, traces and both themes remain usable. Run all four
verification suites. This first pass improves the shared workspace and Two Sum's
explanation; it does not claim bespoke coverage of every problem.
