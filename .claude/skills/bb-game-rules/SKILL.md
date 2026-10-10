---
name: bb-game-rules
description: Barcode Battler II rules for this repo — how a barcode becomes a card (front/back read, HP/ST/DF, race, job, specials) and how battles resolve (turn order, hit, damage, herbs, magic). Use when implementing or changing src/engine, writing engine tests, or answering "how does the original do X".
---

# bb-game-rules

Target: **Barcode Battler II** (user decision 2026-10-10), all three modes:
C0 versus (hot-seat or vs CPU), C1 story (ROM enemies), C2 scanned enemy cards + passcodes. Full spec with
citations: [mechanics.md](mechanics.md). Sources: `.claude/projects.md`.

## Source of truth, in order
1. `projects/finalfighter_BarcodeBattler2-Simulator` (MIT) — port its logic.
2. Where it is buggy or disputed, follow `projects/gufranco_maeyomi`
   (MIT, hardware-checked) — check `src/maeyomi/decoder/uncertainties.py`.
3. Never copy code from GPL/unlicensed repos (VITIMan, barbated, pyrsmk, antxiko).

## Rulings already taken (change only with the user's OK)
| Topic | Ruling |
|-------|--------|
| Speed digit (front read) | **d9** (maeyomi, hardware-tested), not the sim's d11 |
| High-HP bonus | maeyomi hardware-faithful: partner + battle sets, shown vs battle stats, wrap 256 (user, 2026-10-10) |
| MP for wizards | `job >= 7` → MP 10 (job 7–9 = wizard; sim's `>=6` is inconsistent) |
| 12-digit UPC-A | reject (like the hardware); EAN-8 and EAN-13 only |
| Stats internal unit | ×100 hidden: store `hp=150`, display `15000` |
| Battle randomness | seeded RNG injected into the engine |
| barbated "Method 2" | not used |
| Wizard + weapon/armour | refused based on card 1's job (sim checks card 2's job, always 0 → dead rule) |
| 6502 byte maths | not emulated, no toggle (user, 2026-10-10): plain integer maths; the two quirks that differ are documented in `notes/8-bit-overflow.md` |
| Hit speed bonus | `max(0, speed - floor(hp/83))` — sim wraps a negative to a sure hit |
| Specials 43/44 | applied (halve opp heal / double own) — sim computes then discards |
| Shields 20-22 | each of the defender's two specials applied once (sim can apply special1's twice) |
| Magic | wizards only (job ≥ 7); Gantsu/Degantsu = attack with −15/−20 hit and ×1.5/×2 |
| P1 vs fused opponent | kept as sim: only player 1's hits on a fused fighter get the /4 /3 /2 race split |
| Fighter battle stats | fusion uses `battleSt/battleDf` (hidden high-HP bonus), display uses `st/df` |
| Story modes and card sets | a story tied to an official set uses **only that set's cards** (user, 2026-10-10) |

Add a row whenever you settle a new disputed point, and log it in `done.md`.

## Engine shape (target)
- `parseBarcode(str) → {digits, kind: 'ean13'|'ean8'} | error` (checksum).
- `readCard(digits) → Card` — pure, deterministic; `Card` =
  `{kind:'fighter'|'weapon'|'armour'|'powerup', hp, st, df, battleSt, battleDf, race, job, speed, pp, mp, special, readMode}`.
- `fuse(card1, card2) → Fighter` — two-card combination and validation.
- `createBattle(f1, f2, {rng, first, allowEscape}) → battle` with `act(action) → event`; `cpuAction(battle, idx, rng)`. Pure helpers (`firstSpeed`, `hitThreshold`, `baseDamage`, `applyMultipliers`, `herbHeal`) take their random rolls as arguments for exact tests. No DOM, no timers.

## Testing
Golden tests from `projects/gufranco_maeyomi/tests/fixtures/wiki_cards.json`
(201 BB2 cards): copy the *data* (barcode → expected stats) into
`tests/fixtures/` with a source note — it's MIT. A failing golden case is
either our bug or a disputed rule: check `uncertainties.py` before "fixing" the test.
