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

## 2026-10-10 — RNG and fusion
- `rng.js` (mulberry32, `int/pick/coin`), `fuse.js` (`canPair`, `fuse`) with 11 tests; 27 tests total pass.
- Ruling: wizard equipment ban applied on card 1 (sim bug made it dead). Fusion uses battle stats.

## 2026-10-10 — Battle engine
- `docs/src/engine/battle.js`: guardian star, pre-battle specials (45, 23-29), initiative, hit, damage (+ specials 1-22, attack magic), herbs (POWER + 1-3 herbs), 10 spells, one-use item breakage, escape, CPU AI. 15 tests; 42 total pass.
- Fighters now carry `special1/special2` (was a `specials` array).
- Rulings recorded in bb-game-rules (no 6502 byte emulation; 4 sim bugs resolved toward intent). Open question to user on 6502 quirks.

## 2026-10-10 — Playable page (milestone 2)
- `docs/index.html` + `style.css` + `src/ui/` (app, lcd, sound, store, cardbook, labels): phone-first LCD handheld, seven-segment SVG digits, BATTLE/POWER/SELECT pad (keys B/P/S), card slot, card book + My cards dialogs, WebAudio beeps with mute.
- Modes: C0 vs CPU and 2-player hot-seat; one or two cards per side; spell/herb SELECT menu.
- "Random enemy" picks an official fighter within ±25% of the player's power (hp + 2·(st+df)); unmatched picks ended fights in 1-2 turns. Matched sim: median 7 actions.
- Engine fix: a fighter starting its turn at 0 HP loses (some official cards have HP 0).
- `?debug` logs battle events to the console. Local server: port 8000 is taken on this machine → use 8737.
- Verified in Chrome: card read, fusion, battle to the end, herbs, spells, card book search/pick, save/remove. No console errors.

## 2026-10-10 — Card book set selector (user request)
- Card book: dropdown "All 24 sets" or one set; combines with kind filter and search. "Random enemy" draws from the selected set (falls back to all if the set has no usable fighter).

## 2026-10-10 — Renamed to BarClode Battler (user request)
- Product name "BarClode Battler" (nod to Claude): page title, logo (CL in accent orange), README, CLAUDE.md, package name. Repo/URL stay `barcodebattler`. Engine comments still name the original device.

## 2026-10-10 — Rule: story modes use their own set (user)
- Story modes built on an official card set only offer that set's cards. Recorded in todo (milestone 3) and bb-game-rules.

## 2026-10-10 — English card names (user request)
- `tools/data/name-translations.json`: 579 Japanese names → {en, source, basis}; 59 official (Tomy UK same barcode; SMW NA, Doraemon, Dragon Slayer TG-CD names), 520 interpreted (puns kept where they read in English). Done by 4 parallel translator agents, one per group of sets.
- Consistency pass: 12 story-set cards building on a Tomy-named character now reuse the official name (e.g. 超剣士ラーメン活武 → "Super Blade Jaw Breaker", not "Kappu"). ピーパックン "Volcano Lotus" downgraded to interpreted (unconfirmed). Item-card versions of fighters get " (Item)".
- DE/ES/FR Tomy sets: English name = Tomy UK name of the same barcode (source o).
- cards.json rows now `[barcode, printed, set, en, src]`, src p printed / o official / i interpreted. Test: every card has an ASCII English name.
- UI: English name first, original name beside it ("translated" tag for interpreted); search matches both.
- Judgement calls to flag: 帝王ゴッドヒットラー rendered "Emperor God Hitter" (softened from the literal); shakiest readings include ボウン "Bown", ヤプラバラージャ "Yaprabaraja", 活武正龍 "Katsubu Seiryu".

## 2026-10-10 — Decisions (user)
- 8-bit overflow quirks: not implemented, no toggle; documented in `notes/8-bit-overflow.md`.
- 帝王ゴッドヒットラー stays "Emperor God Hitter".

## 2026-10-10 — Site live
- GitHub Pages enabled by the user; https://kelu124.github.io/barcodebattler/ verified (card read, card book, no console errors). Pushing to main publishes.

## 2026-10-10 — Camera scanning
- `docs/src/ui/scanner.js` + SCAN button + camera sheet. Native `BarcodeDetector` (EAN-13/8) when available; else ZXing `@zxing/library@0.21.3` from unpkg, loaded on first scan, pinned + SRI sha384. A code must read twice in a row.
- ZXing's `BrowserMultiFormatReader.decode(element)` can hang (waits for load/playing events already fired) → we draw frames to a canvas and use `MultiFormatReader` directly.
- Verified in Chrome (Linux, no native detector): SRI load OK; full scan loop via a fake camera (canvas.captureStream with a drawn EAN-13) read Link and loaded it. Not yet tested on a physical phone camera.
