# UI loop — design reference, Rust port, watcher, diff bot

The desktop app is specified by `DESIGN.html` (open in a browser: annotated
R4 sheets + curriculum/invariant/direction appendix) and built in Rust.
No pixel is placed in Rust until it matches the reference: restyle against
the deck, verify in-app via screenshots.

**The rule: visual approval against `DESIGN.html` always precedes Rust
porting in `desktop/crates`.** Baselines in this folder are only re-seeded
from shots that were visually approved — never from an unreviewed build.

## The five stages

```
1. DESIGN    DESIGN.html (open in a browser; annotated sheets + appendix)
2. APPROVE   visual sign-off per state          <-- gate, see the rule above
3. PORT      tokens/layout -> desktop/crates (paint.rs roles, main.rs structure)
4. REBUILD   watch.ps1: FileSystemWatcher on desktop/crates -> cargo build --release,
             then drive.ps1 captures Display5 shots into shots/ + latest.json
5. VERIFY    diff.py compares shots/ vs baselines/, PASS/FAIL per state
```

## 1. Design against `DESIGN.html`

- Open `DESIGN.html` in a browser; it is the single visual reference
  (light + dark sheets, rails, tabs, rows, frames, settings, trace).
- Key sources for values: annotated sheets (type scale, 2px grid, roles),
  appendix (family invariants, curriculum chains, direction).
- Design one UI state at a time: home, solve, learn, practice, settings,
  darkplus. Screenshot each approved state from the app via drive.ps1.

## 2. Approve (gate)

- The reviewer looks at the browser rendering (live or screenshot) and
  signs off per state. No sign-off, no port.
- Only approved renderings may become `baselines/baseline_<state>.png`.
  To promote an approved shot: copy it over the matching baseline file
  (e.g. `Copy-Item shots\\home.png baselines\\baseline_home.png`) and note
  the approval (who/when) in the commit or handoff message.

## 3. Port tokens/layout to `desktop/crates`

- Colors: web CSS tokens -> `desktop/crates/app/src/paint.rs`
  `Palette` roles (`background`, `text`, `primary`, `success`, `danger`):
  presets `dracula()`, `vscode_dark_plus()`, `vscode_light_plus()`,
  `theme(dark)`, or user JSON via `theme_from_json()`
  (`{"name","bg","text","primary"[, "success","danger"]}` with `#RGB/#RRGGBB`
  parsed by `parse_hex_color()`).
- Structure: web shell/layout (`shell-r4.js`/`layout-r4.js`) ->
  `desktop/crates/app/src/main.rs` view structure; shared styling helpers
  (`surface()`, buttons/inputs) live in `paint.rs`.
- Headless check before pushing to the loop:
  `cargo test` (run from `desktop/`). No window launch needed.

## 4. Watcher rebuilds + screenshots on Display5 (teammate-owned)

- `watch.ps1` watches `desktop/crates`, runs `cargo build --release` on
  change, then invokes `drive.ps1` on success.
- `drive.ps1` launches the staged exe on Display5 (2570,330 1130x840 via
  the AUTOSTART matrix: home/solve/learn/practice/settings/darkplus),
  `CopyFromScreen` captures each state into `shots/`, writes `latest.json`.
- Owned by the task-8 teammate — do not edit those scripts here.
  Run them with: `pwsh .workers/jobs/ui-loop/watch.ps1`
  (watcher then drives rebuilds automatically).

## 5. Diff bot verifies (`diff.py`, this folder)

- Compare the latest captures against approved baselines:
  `python .workers/jobs/ui-loop/diff.py`
- One `PASS`/`FAIL` line per state with the mean-abs-diff percentage;
  failures also write a red overlay to `diffs/diff_<state>.png`.
  Exit code is 0 only when every state passes.
- Useful flags: `--threshold PCT` (default 2.0, or `UI_LOOP_THRESHOLD`
  env), `--states home,darkplus` (check a subset), `--shots DIR`
  / `--baselines DIR` / `--diffs DIR` / `--report PATH` overrides.
  `shots/latest.json` (written by `drive.ps1`) is honored when present
  as a `{state: file}` map; otherwise shots are matched by filename.
- Needs no Pillow install: without it the script falls back to a
  stdlib-only PNG codec (8-bit non-interlaced, gray/RGB/RGBA).
- Layout of this folder (only these paths belong to the diff-bot side;
  `watch.ps1` / `drive.ps1` belong to the task-8 teammate):
  - `diff.py` — the bot
  - `baselines/baseline_<state>.png` — approved references (seeded from
    `desktop/target/*.png`, see below)
  - `shots/` — `drive.ps1` captures + `latest.json` (created at runtime)
  - `diffs/` — red failure overlays (created at runtime)
  - `diff-report.json` — machine-readable summary (written every run)

## Current baselines (seeded 2026-11-16, newest `desktop/target` shots)

| state      | file                  | source                    |
|------------|-----------------------|---------------------------|
| home       | baseline_home.png     | `desktop/target/home-final.png` |
| learn      | baseline_learn.png    | `desktop/target/driveD-learn.png` |
| practice   | baseline_practice.png | `desktop/target/practice.png` |
| settings   | baseline_settings.png | `desktop/target/settings.png` |
| darkplus   | baseline_darkplus.png | `desktop/target/drive10-darkplus.png` |
| fixcheck   | baseline_fixcheck.png | `desktop/target/fixcheck2.png` |

## Failure drill

1. `diff.py` reports `FAIL` for a state + writes `diffs/diff_<state>.png`.
2. Open the overlay: red = pixels that differ beyond tolerance.
3. If the new rendering is correct: approve it (stage 2) and promote the
   shot to `baselines/`. If it is a regression: fix against `DESIGN.html`
   first (stage 1), re-approve, then port (stage 3) — never ship an
   unapproved look.
