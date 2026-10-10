# TODO

Top = next. Move items to `done.md` when finished (same commit).

## Open questions for the user
(none)

## Milestone 0 — scaffolding
- [x] CLAUDE.md, .claude/ skills, logs, reference repos
- [x] Finalise `bb-game-rules` skill from reference repo survey

## Milestone 1 — engine (pure JS, tested)
- [x] `tools/import-maeyomi.mjs` → `docs/data/cards.json` (934 cards, 24 BB2-device sets) + NOTICE.md
- [x] `docs/src/engine/barcode.js`: parse + validate EAN-13 / EAN-8 (UPC-A rejected), checksum, box remaps
- [x] `docs/src/engine/card.js`: barcode → card (front/back read, high-HP bonus, items, power-ups)
- [ ] `docs/src/engine/rng.js`: seeded RNG
- [ ] `docs/src/engine/battle.js`: turn resolution, win condition
- [x] `tests/fixtures/`: maeyomi `wiki_cards.json` (185 usable BB2 cards) + simulator corpus (158) as golden tests
- [ ] `docs/src/engine/fuse.js`: two-card validation + fusion (CreateFightingData.as); volatile-sign coin toss here

## Milestone 2 — playable page
- [ ] `docs/index.html` + manual barcode entry → show card
- [ ] Battle screen vs. a generated enemy
- [ ] User enables GitHub Pages from `main` `/docs`; verify https://kelu124.github.io/barcodebattler/

## Milestone 3 — modes
- [ ] C0 versus: hot-seat 2 players + vs CPU (`calc_action` AI)
- [ ] C1 story: 5 worlds × 6 stages, ROM enemy tables (sim `C1WorldData.as`), passcodes
- [ ] C2: scanned enemy cards + 5-digit passcodes (sim `C2PassCode.as`)
- [ ] Magic (10 spells) and herbs

## Milestone 4 — polish
- [ ] Camera scanning (BarcodeDetector + ZXing fallback)
- [ ] Saved cards (localStorage: barcode + nickname only, no pictures). Story/C2 progress = passcodes only
- [ ] Retro sounds (WebAudio beeps, mute toggle) / animations
- [ ] Card book: browse/search the built-in official card list
- [ ] PWA / offline manifest
