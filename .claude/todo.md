# TODO

Top = next. Move items to `done.md` when finished (same commit).

## Open questions for the user
- [ ] Emulate the 6502 8-bit overflow quirks in battle maths (e.g. heavy fast fighters always hitting)? Currently: intended maths, see bb-game-rules rulings.

## Milestone 0 — scaffolding
- [x] CLAUDE.md, .claude/ skills, logs, reference repos
- [x] Finalise `bb-game-rules` skill from reference repo survey

## Milestone 1 — engine (pure JS, tested)
- [x] `tools/import-maeyomi.mjs` → `docs/data/cards.json` (934 cards, 24 BB2-device sets) + NOTICE.md
- [x] `docs/src/engine/barcode.js`: parse + validate EAN-13 / EAN-8 (UPC-A rejected), checksum, box remaps
- [x] `docs/src/engine/card.js`: barcode → card (front/back read, high-HP bonus, items, power-ups)
- [x] `docs/src/engine/rng.js`: seeded RNG (mulberry32)
- [x] `docs/src/engine/battle.js`: star, specials 23-29/45, initiative, hit, damage, herbs, 10 spells, item breakage, escape, CPU AI
- [x] `tests/fixtures/`: maeyomi `wiki_cards.json` (185 usable BB2 cards) + simulator corpus (158) as golden tests
- [x] `docs/src/engine/fuse.js`: two-card validation + fusion; volatile-sign coin toss

## Milestone 2 — playable page
- [x] `docs/index.html` + manual barcode entry → show card (LCD, seven-segment, card info)
- [x] Battle screen: C0 vs CPU (strength-matched random official enemy) and 2-player hot-seat
- [ ] User enables GitHub Pages from `main` `/docs`; verify https://kelu124.github.io/barcodebattler/

## Next — English card names (user request 2026-10-10)
- [ ] `tools/data/name-translations.json`: every Japanese card name → {en, source: official|interpreted, basis}
      official = same barcode in an English release (Tomy/Irwin, 27 cards) or the franchise's known English name (Mario, Doraemon, Dragon Slayer); else interpreted
- [ ] Import adds `nameEn` + source to `docs/data/cards.json`; keep the Japanese name
- [ ] UI: English name first, Japanese under it; search both. Test: no Japanese name left untranslated

## Milestone 3 — modes
- [ ] C1 story: 5 worlds × 6 stages, ROM enemy tables (sim `C1WorldData.as`), passcodes
- [ ] C2: scanned enemy cards + 5-digit passcodes (sim `C2PassCode.as`)

## Milestone 4 — polish
- [ ] Camera scanning (BarcodeDetector + ZXing fallback)
- [x] Saved cards (localStorage: barcode + name only). Story/C2 progress = passcodes only
- [x] Retro sounds (WebAudio beeps, mute toggle)
- [ ] Animations polish (damage count-down, star roulette timing)
- [x] Card book: browse/search the built-in official card list
- [ ] PWA / offline manifest
