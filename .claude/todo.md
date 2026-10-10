# TODO

Top = next. Move items to `done.md` when finished (same commit).

## Open questions for the user
- [ ] Rules fidelity: Barcode Battler I, II, or own simplified ruleset?
- [ ] Input: camera scanning (BarcodeDetector / ZXing fallback) + manual entry, or manual only first?
- [ ] UI language: English, French, or both?
- [ ] Visual style: LCD-handheld look (segment digits, green screen) vs. modern cards?
- [ ] Modes: vs. CPU enemy only, or local 2-player hot-seat too?

## Milestone 0 — scaffolding
- [x] CLAUDE.md, .claude/ skills, logs, reference repos
- [ ] Finalise `bb-game-rules` skill from reference repo survey

## Milestone 1 — engine (pure JS, tested)
- [ ] `src/engine/barcode.js`: parse + validate EAN-13 / EAN-8 / UPC-A, checksum
- [ ] `src/engine/card.js`: barcode → card (type, HP, ST, DF, …) per chosen rules
- [ ] `src/engine/rng.js`: seeded RNG
- [ ] `src/engine/battle.js`: turn resolution, win condition
- [ ] `tests/`: golden tests against known official barcodes

## Milestone 2 — playable page
- [ ] `index.html` + manual barcode entry → show card
- [ ] Battle screen vs. a generated enemy
- [ ] Enable GitHub Pages (Actions workflow or branch deploy)

## Milestone 3 — polish
- [ ] Camera scanning
- [ ] Saved roster (localStorage)
- [ ] Sounds / animations
- [ ] PWA / offline manifest
