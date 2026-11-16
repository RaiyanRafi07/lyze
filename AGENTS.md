# Agent guide (single file for the whole project)

Read [README.md](README.md) first — it is the project guide. Read
[DESIGN.html](DESIGN.html) in a browser before touching pixels. This file
is the only agent playbook; there are no other AGENTS.md files.

## How we work now

- No OpenCode waves, no lab-coordinator, no subagent fleets. One agent
  does the work directly. Use the shared team task board for multi-step
  work (list → get → claim with the current revision → complete).
- Split concurrent writes into disjoint file scopes and record them on
  the task. Never edit a file another agent holds.
- Verify every change the way README says: `cargo fmt --check`,
  `cargo check`, `cargo test` (with the `cargo-tmp` TMP/TEMP shim —
  without it, toolchain tests fail for environmental reasons, not code).
  Release gate is the per-slug acceptance matrix, not vibes.
- Verify destination `file_path` character by character before every write.
- Headless first: `desktop/packaging/test-headless.ps1`, `--check-resources`.
  Window runs go on the second display via `.workers/jobs/ui-loop/drive.ps1`
  patterns (AUTOSTART states, target-bound input only — never global
  keystrokes, mouse capture, clipboard, or focus theft on the user's screen).

## Never

- Never synthesize judge results, reference output, or walkthrough frames.
  Show the documented fallback and say so.
- Never touch user profile data, drafts, progress, `plugin/data/`, or
  `docs/*.json` (read-only inputs).
- Never delete or restage `desktop/target/pkg-win-final/` while the app
  runs (Windows locks the exe). Close the app first.
- Never recreate a web UI, HTTP server, or AI bridge inside the product.
  Fixture tooling may use the existing JS in `plugin/web/engine/`.
- Never run the Inno build, clean-room installs, or Linux packaging without
  being asked — they need a privileged/interactive machine.

## Reporting

Report changed paths, commands run and their results, OS coverage, and
exact failures. Mark unverified cases explicitly — never imply a green
check you did not run. If a check is blocked by the environment, say
exactly what blocks it.
