# DONE

Newest at the bottom. Format: `## YYYY-MM-DD — title`, then bullets (what, why, decisions).

## 2026-10-10 — Project scaffolding
- Created CLAUDE.md (project instructions + working agreement).
- Created `.claude/` with todo/done/commits/projects logs and repo skills:
  bb-workflow, bb-commit, bb-game-rules, bb-pages-site, bb-reference-repos.
- Cloned 9 reference repos into `projects/` (git-ignored; re-clone via bb-reference-repos).
- Decision: static vanilla-JS site, no build step, pure engine tested with `node --test`.

## 2026-10-10 — Design decisions (user)
- Rules: **Barcode Battler II** fidelity (as far as reference repos document it).
- Input: manual barcode entry first; camera scanning in milestone 3.
- UI language: **English**.
- Visual style: **retro LCD handheld** (greenish LCD, segment digits, chunky buttons).

## 2026-10-10 — Reference survey, projects.md, bb-game-rules
- Surveyed 9 cloned repos; catalogue + licenses in `.claude/projects.md`.
- Wrote `bb-game-rules` skill + `mechanics.md` (BB2 decoder + battle spec with citations).
- Rulings: speed = d9, race-1 DF overflow fixed, wizard = job>=7, reject UPC-A, ×100 display unit.
- Port source: finalfighter simulator (MIT); disputes resolved via maeyomi (MIT). GPL repos read-only.
