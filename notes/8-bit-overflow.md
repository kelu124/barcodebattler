# 8-bit overflow quirks in the battle maths

**Status:** documented, *not* implemented. BarClode Battler uses the
corrected maths. Decided with the project owner on 2026-10-10; no toggle is planned.

## Background

The battle code we port (`finalfighter/BarcodeBattler2-Simulator`,
`src/FightingCalc.as`) reproduces 6502 routines from the Famicom game
*Barcode World* (`src/BarcodeWorld.as`, `src/NES.as`). The 6502 does its
arithmetic in bytes (0–255), so a result outside that range wraps around:
256 → 0, −1 → 255.

Our engine (`docs/src/engine/battle.js`) uses plain integer maths with floor
division instead. Almost everywhere the results are the same. They differ in
two places, both in the hit check (`calc_hit`, `FightingCalc.as:335-410`):

## Quirk 1 — heavy, fast fighters always hit

When the attacker is at least as fast as the defender, it gets a speed bonus:

```
add = speed - floor(HP / 83)        // 8-bit subtract (nes.sbc)
```

A high-HP fighter makes this negative, and the byte wraps:

| Attacker | Bonus (maths) | Bonus (8-bit) |
|---|---|---|
| HP 99900 (999 units), speed 9 | 9 − 12 = −3 | 253 |
| HP 50000 (500 units), speed 5 | 5 − 6 = −1 | 255 |

`base + add` then exceeds 255, which sets the carry flag and counts as a **sure hit**.

- **8-bit result:** a heavy, fast fighter never misses.
- **Our result:** `add = max(0, speed - floor(HP/83))`, so the hit chance stays at about 80%.

Note that the simulator's own NES emulation wraps by 255 instead of 256
(`NES.as` `sbc`/`adc`), so even it is off by one from real hardware.

## Quirk 2 — "accuracy up" under a lucky star almost always misses

The base hit value is `0xCC` (204), raised to `0xE6` (230) by the attacker's
special 38 (accuracy up) or the defender's special 40 (enemy accuracy up). It
is then multiplied by the guardian-star affinity for the attacker's race (×0.8,
×1.0 or ×1.2):

```
base = floor(base * star / 10)      // 16-bit product, but only the low byte is kept
```

| Base | Star | Maths | 8-bit (low byte) |
|---|---|---|---|
| 204 | ×1.2 | 244 | 244 (fits) |
| 230 | ×1.2 | 276 | **20** |

So under the favourable star, special 38/40 drops the hit chance to roughly
**8–12%** (`20 + add` against a 0–255 roll) instead of near-certain.

- **8-bit result:** "accuracy up" becomes a curse one time in three or so,
  whenever the guardian star favours the attacker's race.
- **Our result:** 276 is used as is; the hit is certain (> 255).

## Why we don't reproduce them

1. **Unverified on the handheld.** These quirks come from the Famicom
   *Barcode World* routines as the simulator ports them, not from tests on a
   Barcode Battler II. The high-HP stat bonus we *did* adopt (see
   `.claude/skills/bb-game-rules/mechanics.md`) was checked on real hardware;
   these were not.
2. **They read as bugs.** One makes big fighters unmissable, the other turns a
   bonus into a penalty. Players would report them as defects in our game.
3. **The emulation itself is inexact** (wrap by 255, see Quirk 1).

## If this is ever revisited

- Both quirks live in `hitThreshold()` in `docs/src/engine/battle.js`; the
  pure function takes its inputs explicitly, so either branch is easy to test.
- Hardware evidence (a recorded fight with a known heavy/fast card, or a
  special-38 card under each star) should come first.
