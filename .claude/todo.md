# TODO

Top = next. Move items to `done.md` when finished (same commit).

## Open questions for the user
(none)

## Milestone 0 — scaffolding
- [x] CLAUDE.md, .claude/ skills, logs, reference repos
- [x] Finalise `bb-game-rules` skill from reference repo survey

## Milestone 1 — engine (pure JS, tested)
- [ ] `tools/import-maeyomi.mjs` → `docs/data/cards.json` (BB2-device official sets) + NOTICE.md
- [ ] `docs/src/engine/barcode.js`: parse + validate EAN-13 / EAN-8 / UPC-A, checksum
- [ ] `docs/src/engine/card.js`: barcode → card (type, HP, ST, DF, …) per chosen rules
- [ ] `docs/src/engine/rng.js`: seeded RNG
- [ ] `docs/src/engine/battle.js`: turn resolution, win condition
- [ ] `tests/fixtures/`: import maeyomi `wiki_cards.json` (201 BB2 cards, MIT) as golden tests

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
