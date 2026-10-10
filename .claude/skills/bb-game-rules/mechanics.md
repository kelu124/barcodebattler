# Barcode Battler II mechanics (reference)

Compiled 2026-10-10 from the repos in `projects/`. `sim` = finalfighter
simulator `src/`, `mae` = gufranco_maeyomi `src/maeyomi/`. Digit indices
`d0..d12` are left→right, `d12` is the EAN-13 check digit. Stats are in units
of 100 (displayed value = stored × 100). All divisions floor.

## 1. Validation
- Accept 13 (EAN-13) or 8 (EAN-8) digits. EAN-8 is left-padded to 13 for the checksum. Reject UPC-A (12).
- Check digit = `(10 - (sumEvenIdx + 3*sumOddIdx) % 10) % 10` (sim BarcodeRead.as:135-173).
- Epoch box exceptions: `4905040352507` → read as `0521501106508`; `4905040352521` → `0521501187507` (mae decoder/decode.py:27-31).

## 2. Front read vs back read (sim BarcodeRead.as:176-203)
```
EAN-8                       → back
d0 ∈ {0,1}: d7 <= 4         → front
            else front iff hp(d0d1d2)<=50 && st(d3d4)<=19 && df(d5d6)<=19, else back
d0 ∈ 2..9:  front iff d2==9 && d9==5   (official enemy-card marker)
```

## 3. Front read (sim BarcodeRead.as:206-307)
`HP=d0d1d2  ST=d3d4  DF=d5d6  RACE=d7  JOB=d8  SPEED=d9  SPECIAL=d10d11`

- Race d7: 0 Mechanical, 1 Animal, 2 Aquatic, 3 Bird, 4 Human,
  5 one-use weapon (ST), 6 durable weapon, 7 one-use armour (DF), 8 durable armour, 9 power-up.
- Job d8: 0–6 warrior, 7–9 wizard. PP = 5. MP = 10 for wizards (ruling: `job >= 7`).
- High-HP bonus when raw HP ≥ 200 (sim :227-255; ruling fixes the race-1 bug):
  ```
  SET = {13,29,45,61,77,93}
  race0: if st ∈ SET: st+=100, df+=100 ; st+=100 ; if st>256: st-=255
  race1: if df ∈ SET: st+=100, df+=100 ; df+=100 ; if df>256: df-=255
  race2: st+=100 ; df+=100
  ```
  mae front_read.py:96-134 also uses a second set {14,30,46,62,78,94} with a hidden +100 — **open question**.
- Items: weapon ST = d3d4; armour DF = d5d6. Power-up sub-type d8: 0–4 HP = d0d1d2;
  5/6 info card (story mode only); 7 PP = d3d4; 8/9 MP = d5d6.
- Specials 30/31/32 on an item: 50% coin toss at read time flips the sign (sim :276,282,293).
  Needs the RNG → apply at *fusion* time, not in the pure `readCard`.

## 4. Back read (sim BarcodeRead.as:310-501)
Race = **d12** (check digit). For EAN-8 use the same layout with every index −5
(race = d7, job fixed 4, MP 0).
```
fighter: HP = int(str(floor(d11/2)) + str(d10) + str(d9))   // digit concatenation
         ST tens = d10+7, minus 10 if >11 ; ST units = (d9+5)%10
         DF = ((d9+7)%10)·((d8+7)%10)                        // concatenated, not multiplied
         SPEED = d10 ; JOB = d5 ; PP 5 ; MP 10 if wizard
weapon:  ST = prefix·((d9+5)%10), prefix = 1 if d10∈5..8, 3 if d10∈3..4, else 2
armour:  DF = (d8+7)%10 if d9∈3..6 ; "2"+that if d9∈1..2 ; else "1"+that
HP item: HP = floor(d11/8)·d10·d9
special: d8∈0..3 → d10 ; d8∈8..9 → 20+d10 ; else 10+d10
```
`·` = digit concatenation. Verify exact semantics against sim before coding and
pin with golden tests.

## 5. Fusion of two cards (sim CreateFightingData.as:6-104; validation BarcodeRead.as:33-123)
- Card 1 cannot be an item. Two cards with identical d6..d12 cannot fuse.
- Warriors can't take MP items; wizards can't take weapons/armour. Info cards story-mode only.
- HP = sum (cap 999); ST, DF = sum clamped 0..199, keeping st1/st2, df1/df2 separate.
- Speed, job from card 1. Both specials active. Two fighters → `union` flag.
- Item card 2: PP/MP summed, cap 99.

## 6. Battle (sim FightingCalc.as)
**Tables**
- Race multiplier `RACE[att][def]/10`: `[[10,8,12,12,8],[12,10,8,12,8],[8,12,10,12,8],[8,8,8,10,12],[12,12,12,8,10]]`.
- Guardian star: `r=rand(500)`; r<110 → 0, r<256 → 1, else 2. `STAR[race][s]` ∈ {12,10,8} (/10). Table at :20-26.

**Pre-battle specials** (:158-332): 45 cancels opponent's specials; 23/24 opp st1 ×0.7/×0.5;
25/26/27 opp df1 ×0.7/×0.5/×0.2; 28/29 opp HP & maxHP ×0.7/×0.5. Same family on both → stronger only.

**Turn order** (:91-156): `v = (speed*5 + rand(0..8)) * STAR/10 * (RACE+1)/10`; special 37 → +50.
Higher first, tie = coin flip, then strictly alternate. Actions: BATTLE, POWER (herb), SELECT (magic / multi-herb).

**Hit** (:335-410)
```
add  = mySpeed >= oppSpeed ? (mySpeed - floor(myHP/83)) & 0xFF : 0
base = 0xCC ; own 38 → 0xE6 ; own 39 → 0x80 ; opp 40 → 0xE6 ; opp 41 → 0x80
base -= magicRate (Gantsu 15, Degantsu 20) ; base = base*STAR/10
hit iff base+add > 255 or rand(0..255) <= base+add
```
(39/40 labels disagree between repos — follow the sim code.)

**Damage** (:413-682)
```
atk = 2*ST + floor(ST * pick{0,2,4,6,8} / 10)
if atk < DF: dmg = 1
else: d = (atk-DF)/2   // P1 vs fused opp: /4 race 0-1, /3 race 2, /2 else
      d = d*STAR/10 ; d = d*RACE/10 + 1
dmg *= pick{1,2}                                   // timing hit
×3 if special 1-8,10 matches defender job (10 = job 0) or 11-15 matches race (15 = race 0)
16 ×0.5 ; 17 ×1.5 ; 18 ×2 (each of the 2 specials applies)
magic Gantsu ×1.5, Degantsu ×2 ; defender 20 ×0.9, 21 ×0.7, 22 ×0.5 ; cap 999
```
Critical = cosmetic when `dmg > ST + ST/2`. After a non-lethal hit, attacker's one-use
weapon and defender's one-use armour break (st2/df2 removed).

**Herbs (POWER, 1 PP)** (:718-894): `heal = floor(maxHP/10) * pick{1,2,3,5,7} * {10|14} / 10`, cap maxHP−HP;
opp 43 halves, own 44 doubles. SELECT with n=1..3 PP: `maxHP*2n/10`.

**Magic** (MP costs :45-56, effects barcode2.as:3689-4685)
| Spell | MP | Effect |
|---|---|---|
| Toruma | 0 | steal 1–6 MP |
| Gantsu | 2 | attack ×1.5, −15 hit |
| Degantsu | 5 | attack ×2, −20 hit |
| Riimo | 2 | heal 30% maxHP |
| Deriimo | 4 | heal 50% maxHP |
| Nyahe | 3 | opp df1 −30% |
| Kachikomu | 5 | own df1 +30% |
| Hehenda | 4 | opp st1 −30% |
| Tafuni | 6 | own st1 +30% |
| Mamiroja | 3 | opp can't use herbs |

Stats cap 199, MP cap 99. **Win:** a player whose turn starts with HP ≤ 0 loses.

## 7. Modes (sim)
- C0 versus (2 players), C1 story (5 worlds × 6 stages, ROM enemies, `C1WorldData.as`),
  C2 scanned enemy cards + passcodes (`C2PassCode.as`, 5-digit `aabbc`).
- Expansion port (antxiko): ~1190 baud 8N1 LSB-first, sends 13 digits + `EPOCH\r\n`.

## 8. Special flag descriptions
Fullest 0–99 table: barbated `src/docs/card-system.md:165-247` (GPL: paraphrase, don't copy).
MIT alternative: mae `models/special_ability.py`.
