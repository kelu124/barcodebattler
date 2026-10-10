# C1 / C2 modes (reference + our rulings)

Extracted 2026-10-10 from `projects/finalfighter_BarcodeBattler2-Simulator/src`
(`b2` = barcode2.as, `W` = C1WorldData.as, `P` = C2PassCode.as, `R` = BarcodeRead.as).
Stats in device units (×100 on display).

## Heroes (C1 and C2)
- Two heroes, entered in order: **warrior** (job ≤ 6) then **wizard** (job ≥ 7) (b2:6999, 7054).
- Hero check (R:33-66): no items; front-read cards need special 18 or 50; special 50 with
  hp ≥ 60 / st ≥ 20 / df ≥ 20 refused; back-read cards always OK and **rescaled**:
  `hp/10, st/10+1, df/10+3` (R:127-132). EAN-8 back reads have job 4 → warrior only.
- Each hero keeps `raw` (card after rescale, never changes) and `cur` {hp, st, df, pp, mp, live}.
- One hero fights at a time (+ optional item card); the player picks a *living* hero before each fight.
- After any fight, only **hp, pp, mp** are copied back from the fight into `cur` (b2:2200-2264);
  ST/DF from items last one fight. HP/PP/MP from an item card therefore become permanent.
- After a win, one heal use (herbs, or wizard F3/F4) is allowed before continuing (b2:6433-6494).

## Item card before a fight (C1 + C2) (b2:8016-8101, 6013-6062; R:70-123)
- A fighter card is accepted only if it has the **same race and job** as the hero (union).
- Same 7-digit body as the hero → refused. Warrior can't take MP-up; wizard can't take weapon/armour.
- Info cards (race 9, job 5/6): C1 only, each type **once per game**, refused if you hold 3 keys;
  job 5 reveals the world of the next key, job 6 also the enemy number.

## C1 — built-in story
- 6 stages E-1..E-6 × worlds L-1..L-5 (+ L-H once 3 keys are held); each world has enemies
  01, 02, 03, 04 and boss HH (W:16-58).
- `ucd = (last digit of warrior barcode + last digit of wizard barcode) % 10` (W:250-255).
- Pick a world (with enemies left), then the enemy is drawn uniformly among that world's remaining enemies (W:567-576).

### Enemy generation (W:578-633)
```
stage 0..5; world L1..L5 → 0..4, LH → 5; enemy 01..04 → 0..3, HH → 4
pointer = (T[stage][4][ucd] + world) mod 5
idx     = world == LH ? 5 + enemy : enemy + pointer
hp = T[stage][0][idx]; st = T[stage][1][idx]; df = T[stage][2][idx]
speed = HH ? 6 : 5; race = [0,1,2,3,4,4][world]; job = [7,2,8,4,5][enemy]
pp = 5; mp = job > 6 ? 10 : 0; special = 0
```
```js
// T[stage] = [HP[10], ST[10], DF[10], rewardSTDF[6], pointer[10 by ucd], bossHP[5]]   (W:75-244)
const T = [
 [[21,27,33,40,48,56,64,72,81,91],[7,8,9,11,12,15,16,18,21,23],[9,10,12,14,15,18,20,21,24,27],[1,1,1,1,1,2],[0,0,4,4,3,3,2,2,1,1],[15,18,21,24,27]],
 [[72,81,91,101,111,121,132,144,156,168],[18,21,23,26,28,30,33,35,39,41],[21,24,27,30,31,34,37,39,43,46],[2,2,2,2,2,2],[4,4,3,3,2,2,1,1,0,0],[36,39,42,45,48]],
 [[144,156,168,180,193,207,221,235,249,264],[35,39,41,44,48,51,55,58,61,65],[39,43,46,48,51,55,59,61,65,69],[3,2,3,3,3,2],[4,4,3,3,2,2,1,1,0,0],[57,60,63,66,69]],
 [[235,249,264,280,296,312,328,345,363,381],[58,61,65,68,73,76,80,85,89,94],[61,65,69,72,76,80,83,87,91,96],[3,4,3,3,3,4],[3,3,4,4,0,0,1,1,2,2],[78,81,84,87,90]],
 [[345,363,381,399,417,436,456,476,496,516],[85,89,94,98,102,107,111,117,121,126],[87,91,96,99,103,108,112,117,121,125],[4,4,4,4,4,4],[3,3,4,4,0,0,1,1,2,2],[99,102,105,108,110]],
 [[476,496,516,537,559,581,603,625,648,672],[117,121,126,132,137,143,148,153,159,164],[117,121,125,130,135,141,145,150,155,160],[4,4,4,4,4,4],[2,2,3,3,4,4,0,0,1,1],[120,123,126,129,132]],
];
const STAGE_PASSCODE = [10, 16, 24, 31, 38, 45];   // W:25-27
```
- Reward STDF = `T[stage][3][pointer]` (pointer = 5 in L-H); boss HP bonus = `T[stage][5][pointer]` (W:636-680).

### Keys (W:62-70, 276-501)
- `key` = keys still held by enemies ("Lw-n"); player holds `3 - key.length`. Holding 3 unlocks L-H.
- Layouts: `[["L1-1","L3-2","L5-3"],["L2-2","L4-3","L5-1"],["L1-1","L3-2","L5-3"],["L2-1","L3-3","L5-4"],["L1-4","L2-2","L4-3"]]`
- Layout choice by case × ucd pair (ucd 0/1, 8/9, 6/7, 4/5, 2/3):
  case 0 → [0,1,2,3,4]; cases 1-2 → [4,0,1,2,3]; cases 3-4 → [3,4,0,1,2]; case 5 → [2,3,4,0,1].
- Beating a key holder gives its key; a boss HH holds any remaining key of its world.
- Losing a hero to a non-key-holder (not the L-H boss) while holding keys gives that enemy one key back.

### After a win (b2:8536-8621, 9522-9605)
| Enemy | Reward to the active hero |
|---|---|
| boss HH | hp += bossHP, st += STDF, df += STDF |
| warrior enemy (job ≤ 6) | st += STDF, pp += 5 |
| wizard enemy (job ≥ 7) | df += STDF; if the hero is the wizard, mp += 5 |
Caps: hp 999, st/df 199, pp/mp 99. HH clears the whole world; others only themselves.
- Bonus event (L-power): vs 01/03 a 50% "rebirth"; vs 02/04 a 50% key hint.

### Escape (C1 only)
- Before a fight: 2/3 chance, one try; enemy stays. In battle (player's turn): 2/3 → a new random enemy of the same world; failure passes the turn.

### Passcodes in C1 (stage E-1 only) (W:686-758)
```
815: hp*1.4+4,  st*13/9,    df*16/12        (floors; from raw stats; revive both)
031: hp*1.6+9,  st*15/9+1,  df*18/12+1
009: hp*1.7+12, st*16/9+1,  df*19/12+2
099: hp*1.8+16, st*17/9+2,  df*20/12+3
077: hp*1.9+20, st*18/9+3,  df*21/12+4
31c (c = (1+ucd)%10): jump to E-5, heroes = level(raw, 31)
38c (c = ucd%10):     jump to E-6, heroes = level(raw, 38)
```

### Stage clear = beating the L-H boss (b2:8703-8847)
- E-1..E-3: "good", then the next stage: heroes rebuilt as `level(raw, STAGE_PASSCODE[stage])`,
  world and keys reset, both revived. A C2 passcode for that level is shown.
- E-4: "fin" — the normal story ends. E-5/E-6 only via the jump codes; they end with "fin" too.
- Both heroes dead → game over.

## C2 — enemy cards
- Heroes as above; then fight any number of **enemy cards** (no hero rescale for enemies;
  items refused as enemies; special-50 limit applies).
- Hero dies, partner alive: switch hero and continue vs the same enemy (its HP kept), or pick a new enemy.
- After a win, reward by the enemy's special (b2:6497-6709):

| Special | Warrior | Wizard |
|---|---|---|
| 65/66/67/68/69 | hp +10/30/40/50/100 (ruling), pp+5 | same, + mp+5 |
| 70-74 | st +2/4/6/8/10, pp+5 | same |
| 75-79 | df +2/4/6/8/10 | same, + mp+5 |
| other | pp+5 | pp+5, mp+5 |
| 80-99 | + passcode award `[5,10,15,20,25,35..49][special-80]`, applied at once | |

### Passcode `aabbc` (P:19-98)
```
ucd = (last digit hero1 + last digit hero2) % 10
encode(n): a = n/10, b = n%10, c = (ucd + [0,0,1,1,2,2,3,3,4,4][(a+b)%10]) % 10 → "aabbc"
decode: p0==p1, p2==p3, c matches → n = 10*p0 + p2
level(raw, n): k = n-1; hp = calchp, st = min(199, st + st*k/9 + ST[k]), df = min(199, df + df*k/12 + DF[k])
calchp(hp,k): fh = hp*k/10 (−655 while >655, cnt=1); fc = floor(k/2)*ceil(k/2) (same);
              r = hp+fh+fc; r = r>999 ? 999 : r-cnt; if k>=90 && k even: r -= 1
```
```js
const ST=[0,0,0,0,0,1,1,1,2,3,4,4,5,6,7,9,10,11,12,14,16,17,19,21,23,25,27,29,31,33,36,38,40,43,46,49,51,54,57,60,64,67,70,73,77,81,84,88,92,96,100,104,108,112,116,121,125,129,134,139,144,148,153,158,163,169,174,179,184,190,196];
const DF=[0,0,0,0,0,1,1,2,3,4,5,6,7,8,9,11,12,14,16,18,20,22,24,26,28,31,33,36,39,42,45,48,51,54,57,61,64,68,72,76,80,84,88,92,96,101,105,110,115,120,125,130,135,140,145,151,156,162,168,174,180,186,192,198];
```

## Set stories (ours — user rules 2026-10-10)
- A story per official set = C2 against **that set's enemy cards**; items only from the set.
- Heroes: from the set when it has a warrior and a wizard hero; otherwise any hero card
  (user choice: "set's heroes, else any").
- The set's enemies are listed; the player picks the next one; beating them all clears the story.

## Rulings on simulator bugs
| # | Simulator | Ours |
|---|---|---|
| 1 | ucd uses `charAt(8)`/`charAt(12)` on EAN-8 → 0 | last digit of each code |
| 2 | key layout keyed on the world digit; never set on the first game | keyed on the stage, set at every stage start |
| 3 | `delete_key` splices while iterating | removes all matches |
| 6 | C1 game over is a dead end | game over → menu |
| 7 | bonus events retryable forever / softlocks | one 50% roll per win |
| 8 | rebirth also resets a living partner | revives only a dead partner, to raw stats |
| 9 | escape keeps pre-fight HP | HP/PP/MP after escape are kept as they are |
| 10 | C1 passcode digits don't wrap | wrap 0-9 |
| 11 | E-4/E-5 clear shows a C2 code the C1 jump doesn't accept | show the C1 jump code (31c / 38c) |
| 13 | C2 HP rewards applied at 1/10 of the shown value; special 79 gives the wizard df+1 | +10/30/40/50/100 units; 79 → df+10 |
| 14 | level() past the ST/DF tables gives 0 | clamp to the last table value |
| 18 | MP at job ≥ 6 | wizard = job ≥ 7 everywhere |
| 20 | L-H pushed twice; crash when only L-H remains locked | guarded |
Kept as in the simulator: item HP/PP/MP permanent; stage clear rebuilds from raw (rewards
lost); front-read heroes not rescaled; CPU spell conditions.
