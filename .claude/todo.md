# TODO

Top = next. Move items to `done.md` when finished (same commit).

## Open questions for the user
- [ ] Modes: vs. CPU enemy only, or local 2-player hot-seat too? (BB2 has C0 versus, C1 story, C2 scanned enemies)
- [ ] License for this repo (MIT suggested; porting the MIT simulator needs its notice kept)
- [ ] Open rule: maeyomi's second high-HP set {14,30,46,...} with hidden +100 — adopt?

## Milestone 0 — scaffolding
- [x] CLAUDE.md, .claude/ skills, logs, reference repos
- [x] Finalise `bb-game-rules` skill from reference repo survey

## Milestone 1 — engine (pure JS, tested)
- [ ] `src/engine/barcode.js`: parse + validate EAN-13 / EAN-8 / UPC-A, checksum
- [ ] `src/engine/card.js`: barcode → card (type, HP, ST, DF, …) per chosen rules
- [ ] `src/engine/rng.js`: seeded RNG
- [ ] `src/engine/battle.js`: turn resolution, win condition
- [ ] `tests/fixtures/`: import maeyomi `wiki_cards.json` (201 BB2 cards, MIT) as golden tests

## Milestone 2 — playable page
- [ ] `index.html` + manual barcode entry → show card
- [ ] Battle screen vs. a generated enemy
- [ ] Enable GitHub Pages (Actions workflow or branch deploy)

## Milestone 3 — polish
- [ ] Camera scanning (BarcodeDetector + ZXing fallback)
- [ ] Saved roster (localStorage)
- [ ] Sounds / animations
- [ ] PWA / offline manifest
