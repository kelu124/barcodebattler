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
4. Tree clean. Push only if the user asked (`git push origin main`).
