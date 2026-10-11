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

## 2026-10-11 — C1/C2 spec + set-story decision
- `bb-game-rules/modes.md`: C1 (worlds, enemy tables, keys, rewards, passcodes) and C2 (enemy cards, rewards, aabbc passcodes, level tables) from the simulator, with 14 bug rulings.
- User: set stories use the set's heroes when it has a warrior and a wizard hero, else any hero card; enemies and items only from the set.

## 2026-10-11 — C1 story engine
- `docs/src/engine/story.js`: stages/worlds, enemy tables, keys (+ L-H unlock), rewards, stage clear with levels, C1 passcodes (815/031/009/099/077, 31c/38c), bonus events, info cards, escape. 11 tests; 68 total.
- `fuse` options: `trusted` (validated hero, skip card-1 checks) and `union` (fighter item must share race+job).
- Balance sim (300 runs, official heroes, attack-only autopilot, no items): all die in E-1. Per-fight E-1 win rate 31% without items, 55% with a random official weapon/armour (01: 83%, HH: 24%). The original is built around item cards each fight → keep faithful; UI must push "use an item card".

## 2026-10-11 — C1, C2 and set stories playable
- UI split: `kit.js` (shared), `app.js` (menu + versus), `party-ui.js` (two-hero flows), `story-ui.js` (C1), `cards-ui.js` (C2 + set stories). Menu: VS CPU, 2 PLAYERS, STORY, ENEMY CARDS, SET STORIES.
- C1: world select, enemy draw, hero choice + one-try escape, item card (info cards give hints), battle with escape, keys, rewards, heal/bonus after a win, partner fights on, stage clear with C2 passcode, FIN with secret jump code, game over.
- C2: enemy cards (typed/scanned/book), rewards by special, passcode awards + 5-digit passcode entry. Set stories: quick-pick buttons for the set's heroes, "Next enemy" random from the set, items/enemies restricted to the set, cleared when all enemies are beaten.
- `?fast` = 20× faster animations for automated testing (with `?debug`).
- Verified in Chrome: versus regression, full C1 run (815 code, rewards, bonus revive, game over), set story (BB2 set heroes Jam Bam + Razor Fist vs Zanbee), C2 win path (HP reward +3000, passcode 33556 → level 35 applied). No console errors.

## 2026-10-11 — Session wrap-up
- Added `bb-ui` skill (UI architecture, adding modes, Chrome test drivers); CLAUDE.md layout now lists every module; bb-workflow lists all skills; "Start here" summary at the top of todo.md.
- Memory updated: project status, decision style, browser-testing quirks.

## 2026-10-11 — README + CONTRIBUTING (user request)
- README rewritten: play link, modes table, features, local run, layout, credits.
- New `CONTRIBUTING.md`: ways to help (phone playtest, rules fidelity, card names), hard rules (static, no build, frozen barcode→card, pure engine, seeded RNG, generated cards.json), style, PR checklist, license reuse.
