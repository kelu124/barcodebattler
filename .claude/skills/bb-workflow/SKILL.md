---
name: bb-workflow
description: Session start/end ritual for the barcodebattler repo — read todo/done, pick the next task, keep logs in sync, commit at each significant step. Use at the start of any work session in this repo and before ending one.
---

# bb-workflow

## Start of session
1. `cat .claude/todo.md` — the top unchecked item is the default next task.
   Items under "Open questions" block work that depends on them: ask the user.
2. `tail -40 .claude/done.md` — recent context and decisions.
3. `git status && git log --oneline -5` — confirm a clean tree; if dirty,
   find out why before touching anything (could be the user's work).

## Repo skills
- `bb-commit` — commit + log in commits.md, restoring old versions
- `bb-game-rules` — BB2 rules + rulings; `mechanics.md` (cards, battle), `modes.md` (C1/C2, set stories)
- `bb-ui` — UI architecture, adding modes, Chrome test drivers
- `bb-pages-site` — local server (port 8737), tests, GitHub Pages deploy
- `bb-reference-repos` — the cloned reference projects in `projects/`

## During work
- One significant step = one commit (see `bb-commit`). Significant means: a
  module works with its tests, a screen is playable, docs/skills change
  meaningfully, a dependency is added. Don't batch unrelated changes.
- Engine changes: add/adjust tests in `tests/` first, then code (TDD).
- New decisions (rules, style, tech) → record in `done.md` with the reason.
- Discovered work → add to `todo.md` in the right milestone, don't do it now.

## Before finishing
1. `npm test` passes (once tests exist).
2. Page loads without console errors (`bb-pages-site`).
3. `todo.md` ticked / moved, `done.md` entry written, `commits.md` updated.
4. Tree clean. Pushing to `main` publishes the live site — push tested work only.
5. Update the session summary at the top of `.claude/todo.md` ("Start here").
