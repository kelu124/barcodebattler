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

## 2026-10-10 — More decisions (user)
- Modes: all three — C0 versus, C1 story, C2 scanned enemies.
- License: MIT (LICENSE added).
- High-HP bonus: adopt maeyomi's hardware-faithful rule (partner + battle sets, shown vs battle stats).
- GitHub Pages deploys from `main` `/docs` → site lives in `docs/`; tests stay at root.
- Push to origin/main approved.

## 2026-10-10 — More decisions (user)
- Built-in official card list, imported from maeyomi's `cards.json` (MIT) via a script.
- Phone first (on-screen handheld buttons).
- Saving: saved cards only (barcodes, no pictures) in localStorage; progress uses the original passcodes.
- Retro sounds kept (WebAudio).

## 2026-10-10 — Barcode parser
- `docs/src/engine/barcode.js`: EAN-13/EAN-8 checksum, rejects UPC-A, Epoch box remaps; 7 tests.
- Added `package.json` (no deps): `npm test` runs `tests/**/*.test.mjs` only (bare `node --test` would pick up projects/).

## 2026-10-10 — Official card list import
- `tools/import-maeyomi.mjs` (`npm run import-cards`) → `docs/data/cards.json`: 934 cards, 24 sets read by the BB2 device per maeyomi; BB1-only, Double and non-BB games excluded; maeyomi repairs applied; 0 invalid checksums.
- Card names stay Japanese (no English source); set titles use maeyomi English translations.
- NOTICE.md carries the maeyomi and finalfighter MIT notices.

## 2026-10-10 — Card reader
- `docs/src/engine/card.js`: `readCard(code)` → {readMode, kind, race, job, hp, st, df, battleSt, battleDf, speed, pp, mp, special, oneUse, volatileSign}, device units.
- Golden tests: all 185 published wiki cards match (HP/ST/DF/race/special/job/speed), all 158 simulator-corpus codes decode, all 934 built-in cards decode. Mutation check (speed d11) makes the golden test fail, so it discriminates.
- Volatile-sign items (specials 30/31/32) are only flagged; the coin toss happens at fusion time with the seeded RNG, keeping readCard pure.
