# Reference projects

Shallow clones live in `projects/<owner>_<repo>/` (git-ignored, read-only).
Re-clone with the `bb-reference-repos` skill. Surveyed 2026-10-10.

**Licensing rule:** MIT code may be ported with attribution. GPL-3.0 / unlicensed
repos are for *reading only* — reimplement ideas, never copy code.

| Repo | Stack | License | Use for us |
|------|-------|---------|------------|
| [finalfighter/BarcodeBattler2-Simulator](https://github.com/finalfighter/BarcodeBattler2-Simulator) | Flash AS3 | MIT (README only) | **High** — the only full BB2 battle engine; source of every decoder |
| [gufranco/maeyomi](https://github.com/gufranco/maeyomi) | Python | MIT | **High** — most careful decoder, BB1/BB2/Double, big card datasets, documented uncertainties |
| [pyrsmk/battler](https://github.com/pyrsmk/battler) | Crystal + Vue | none ("Don't Be A Dick") | **High** for spec prose (`TECHNICAL_SPECS.md`); read-only |
| [VITIMan/barcode-battler-engine](https://github.com/VITIMan/barcode-battler-engine) | Python | GPL-3.0 | **High** for test vectors; has bugs; read-only |
| [alpgarcia/barbated](https://github.com/alpgarcia/barbated) | React/TS | GPL-3.0 | Medium — flag table 0–99, card print layout; divergent "Method 2"; read-only |
| [edjefferson/bookbattler](https://github.com/edjefferson/bookbattler) | Vanilla JS, ZXing CDN | none | Medium — architecture & camera scanner pattern for a static site; read-only |
| [antxiko/barcodeBattlerREADER](https://github.com/antxiko/barcodeBattlerREADER) | Arduino | GPL-3.0 | Low — expansion-port UART protocol |
| [diceky/barcodebattler2023](https://github.com/diceky/barcodebattler2023) | React, Quagga, Firebase | MIT | Low — invented mechanics |
| [VITIMan/barcode-battler-engine-api](https://github.com/VITIMan/barcode-battler-engine-api) | — | GPL-3.0 | None — placeholder |

## Key files

### finalfighter_BarcodeBattler2-Simulator (port this)
- `src/BarcodeRead.as` — barcode → card (validation 33-123, checksum 135-173,
  front/back choice 176-203, front read 206-307, back read 310-501).
- `src/FightingCalc.as` — race/star tables, turn order, hit, damage, herbs, item breakage.
- `src/CreateFightingData.as` — fusing two cards into one fighter.
- `src/BarcodeWorld.as` — 6502 math helpers (replace with integer floor arithmetic).
- `src/barcode2.as` — 9.7k-line game state machine (magic effects 3689-4685, battle loop ~1960-2840).
- `src/C1WorldData.as` — story-mode worlds/enemies; `src/C2PassCode.as` — passcodes.
- `src/xml/*.xml` — ~700 named official barcodes in 21 sets (card scans in `src/barcode/` are copyrighted art: don't ship).

### gufranco_maeyomi
- `src/maeyomi/decoder/{read_type,front_read,back_read}.py` — clean decoder.
- `src/maeyomi/decoder/uncertainties.py` — **list of disputed rules**; consult before choosing a branch.
- `src/maeyomi/bb1/`, `src/maeyomi/double/` — BB1 and BB2 Double variants.
- `src/maeyomi/official/cards.json` — 3046 official cards (barcode, name, set).
- `tests/fixtures/wiki_cards.json` — 201 BB2 cards with expected stats → our golden tests.
- `tests/fixtures/simulator_corpus.json`, `bb1_cards.json`.

### pyrsmk_battler
- `TECHNICAL_SPECS.md` — readable spec, BB1/BB2 comparison, "optimal" barcodes.
- `src/battler/barcode.cr` — decoder with the DF-255 bug fixed.

### VITIMan_barcode-battler-engine
- `tests/test_builder.py` — 31 Conveni Wars Gaiden cards with expected stats.
- Known bugs: back-read special banding (string vs int), `_chack_similar_barcode` typo, DF `st-255`.

### alpgarcia_barbated
- `src/docs/card-system.md` — special flags 0–99 descriptions, physical card size (86×59 mm).

### edjefferson_bookbattler
- `js/scanner.js` — getUserMedia + ZXing, handles the video 'playing' race. Template for milestone 3.

### antxiko_barcodeBattlerREADER
- Expansion port: ~1190 baud UART, 8N1, LSB first; frame = 13 digits + `EPOCH\r\n`.
