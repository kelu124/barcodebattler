import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../docs/src/engine/rng.js';
import { readCard } from '../docs/src/engine/card.js';
import { fuse } from '../docs/src/engine/fuse.js';
import {
  RACE_TABLE, STAR_TABLE, MAGIC, starFromRoll, firstSpeed, hitThreshold, baseDamage,
  applyMultipliers, herbHeal, applySpecialDowns, createBattle, cpuAction,
} from '../docs/src/engine/battle.js';

const withCheck = (s) => { let t = 0; for (let i = 0; i < 12; i++) t += (i % 2 ? 3 : 1) * +s[i]; return s + ((10 - (t % 10)) % 10); };
const card = (hp, st, df, race, job, speed = 5, special = '00') => readCard(withCheck(`${hp}${st}${df}${race}${job}${speed}${special}`));
const fighter = (...a) => fuse(card(...a)).fighter;

test('tables match the simulator', () => {
  assert.deepEqual(RACE_TABLE[0], [10, 8, 12, 12, 8]);
  assert.deepEqual(STAR_TABLE[4], [8, 12, 10]);
  assert.equal(MAGIC.length, 10);
  assert.deepEqual(MAGIC.map((m) => m.mp), [0, 2, 5, 2, 4, 3, 5, 4, 6, 3]);
});

test('guardian star from a 0-499 roll', () => {
  assert.deepEqual([0, 109, 110, 255, 256, 499].map(starFromRoll), [0, 0, 1, 1, 2, 2]);
});

test('first-move value: (speed*5 + roll) * star/10 * (race+1)/10, special 37 +50', () => {
  const a = fighter('050', '10', '10', 4, 2, 9), b = fighter('050', '10', '10', 0, 2, 9);
  // human vs mech: star[4][0]=8, race[4][0]=12 → floor(floor(53*8/10)*13/10) = floor(42*13/10) = 54
  assert.equal(firstSpeed(a, b, 0, 8), 54);
  const fast = fighter('050', '10', '10', 4, 2, 9, '37');
  assert.equal(firstSpeed(fast, b, 0, 8), 104);
});

test('hit threshold: base 0xCC, specials 38-41, magic penalty, star', () => {
  const a = fighter('050', '10', '10', 4, 2, 5), b = fighter('050', '10', '10', 4, 2, 6);
  // slower than opponent → no speed bonus; star[4][1]=12 → floor(204*12/10)=244
  assert.equal(hitThreshold(a, b, 1), 244);
  assert.equal(hitThreshold(a, b, 1, 15), Math.floor((204 - 15) * 12 / 10));
  const sure = fighter('050', '10', '10', 4, 2, 5, '38');
  assert.equal(hitThreshold(sure, b, 0), Math.floor(0xe6 * 8 / 10));
  // faster: bonus = speed - floor(hp/83), never negative
  const quick = fighter('190', '10', '10', 4, 2, 9);
  assert.equal(hitThreshold(quick, b, 2), Math.floor(204 * 10 / 10) + 9 - 2);
  const heavy = fighter('199', '10', '10', 4, 2, 1);
  assert.equal(hitThreshold(heavy, fighter('050', '10', '10', 4, 2, 0), 2), 204);
});

test('base damage: (2.0-2.8×ST - DF)/2 × star × race + 1, ×timing', () => {
  const a = fighter('050', '40', '10', 4, 2), d = fighter('050', '10', '20', 0, 2);
  // atk = 80 + floor(40*4/10)=96; (96-20)/2=38; ×star[4][1]=12 → 45; ×race[4][0]=12 → 54 +1 = 55; ×2
  assert.equal(baseDamage(a, d, { star: 1, attackerIsP1: true, roll: 2, timing: 2 }), 110);
  // ST too low → 1
  assert.equal(baseDamage(fighter('050', '05', '10', 4, 2), fighter('050', '10', '50', 4, 2), { star: 1, attackerIsP1: true, roll: 0, timing: 1 }), 1);
});

test('player 1 hitting a fused opponent divides by 4/3/2 by race', () => {
  const att = fighter('050', '40', '10', 0, 2);
  const fused = fuse(card('050', '10', '10', 4, 2), card('050', '10', '10', 3, 1)).fighter;
  fused.df = 0;
  // atk 80, /4 = 20, star[0][1]=10 → 20, race[0][4]=8 → 16 +1 = 17
  assert.equal(baseDamage(att, fused, { star: 1, attackerIsP1: true, roll: 0, timing: 1 }), 17);
  // as player 2: /2 → 40 → 32 + 1
  assert.equal(baseDamage(att, fused, { star: 1, attackerIsP1: false, roll: 0, timing: 1 }), 33);
});

test('multipliers: job/race ×3, 16-18, magic, shields, cap 999', () => {
  const vsJob = fighter('050', '10', '10', 4, 2, 5, '02');
  const def = fighter('050', '10', '10', 0, 2);
  assert.equal(applyMultipliers(100, vsJob, def), 300);
  assert.equal(applyMultipliers(100, fighter('050', '10', '10', 4, 2, 5, '15'), def), 300); // 15 = race 0
  assert.equal(applyMultipliers(100, fighter('050', '10', '10', 4, 2, 5, '16'), def), 50);
  assert.equal(applyMultipliers(100, fighter('050', '10', '10', 4, 2, 5, '17'), def), 150);
  assert.equal(applyMultipliers(100, def, def, 20), 200);
  assert.equal(applyMultipliers(100, def, fighter('050', '10', '10', 0, 2, 5, '21')), 70);
  assert.equal(applyMultipliers(500, vsJob, def), 999);
});

test('herb heal and its specials', () => {
  const f = fighter('100', '10', '10', 4, 2);
  f.hp = 10;
  const opp = fighter('050', '10', '10', 4, 2);
  assert.equal(herbHeal(f, opp, { factor: 3, timing: 14 }), Math.floor(10 * 42 / 10));
  assert.equal(herbHeal(f, fighter('050', '10', '10', 4, 2, 5, '43'), { factor: 3, timing: 14 }), 21);
  f.hp = 95;
  assert.equal(herbHeal(f, opp, { factor: 7, timing: 14 }), 5); // capped at missing HP
});

test('pre-battle specials 23-29 and 45', () => {
  const a = fighter('050', '10', '10', 4, 2, 5, '24');
  const b = fighter('080', '40', '30', 4, 2);
  applySpecialDowns(a, b);
  assert.deepEqual([b.st, b.st1], [20, 20]);
  const c = fighter('050', '10', '10', 4, 2, 5, '29'), d = fighter('080', '40', '30', 4, 2, 5, '45');
  applySpecialDowns(c, d);
  assert.equal(d.hp, 80); // 45 cancels the opponent's specials
});

test('a seeded battle is reproducible and always ends', () => {
  const run = (seed) => {
    const b = createBattle(fighter('120', '30', '20', 4, 2, 6), fighter('110', '28', '22', 1, 3, 5), { rng: createRng(seed) });
    let n = 0;
    while (!b.over && n++ < 500) b.act({ type: 'attack' });
    return { winner: b.winner, turns: n, hp: b.fighters.map((f) => f.hp) };
  };
  assert.deepEqual(run(1), run(1));
  for (let s = 0; s < 30; s++) {
    const r = run(s);
    assert.ok(r.winner === 0 || r.winner === 1);
    assert.ok(r.turns < 500);
  }
});

test('turns alternate and events describe the action', () => {
  const b = createBattle(fighter('120', '30', '20', 4, 2), fighter('110', '28', '22', 1, 3), { rng: createRng(3) });
  const first = b.turn;
  const ev = b.act({ type: 'attack' });
  assert.equal(ev.type, 'attack');
  assert.equal(ev.by, first);
  assert.equal(typeof ev.hit, 'boolean');
  assert.equal(b.turn, 1 - first);
});

test('herbs use PP; Mamiroja blocks them', () => {
  const wiz = fighter('120', '20', '20', 4, 8);
  const war = fighter('120', '20', '20', 4, 2);
  const b = createBattle(wiz, war, { rng: createRng(5), first: 0 });
  b.fighters[1].hp = 50;
  const ev = b.act({ type: 'magic', spell: 9 });
  assert.equal(ev.type, 'magic');
  assert.equal(b.fighters[0].mp, 7);
  assert.equal(b.act({ type: 'herb' }).error, 'herbs-blocked');
  assert.equal(b.turn, 1); // invalid action doesn't pass the turn
  b.act({ type: 'attack' });
  b.fighters[0].hp = 50;
  const h = b.act({ type: 'herb' });
  assert.equal(h.type, 'herb');
  assert.equal(b.fighters[0].pp, 4);
  assert.ok(h.heal > 0);
});

test('warriors cannot cast; wizards need MP', () => {
  const b = createBattle(fighter('120', '20', '20', 4, 2), fighter('120', '20', '20', 4, 8), { rng: createRng(1), first: 0 });
  assert.equal(b.act({ type: 'magic', spell: 1 }).error, 'not-wizard');
  b.act({ type: 'attack' });
  b.fighters[1].mp = 5;
  assert.equal(b.act({ type: 'magic', spell: 8 }).error, 'not-enough-mp');
});

test('one-use weapon breaks after a damaging non-lethal hit', () => {
  const armed = fuse(card('150', '20', '10', 4, 2), card('000', '15', '00', 5, 0)).fighter;
  const b = createBattle(armed, fighter('199', '10', '10', 4, 2), { rng: createRng(2), first: 0 });
  let ev;
  for (let i = 0; i < 20 && !(ev && ev.hit); i++) {
    b.turn = 0;
    ev = b.act({ type: 'attack' });
  }
  assert.ok(ev.hit);
  assert.equal(ev.broke.weapon, true);
  assert.equal(b.fighters[0].st, 20);
});

test('cpuAction returns a legal action', () => {
  const b = createBattle(fighter('120', '20', '20', 4, 8), fighter('120', '20', '20', 4, 8), { rng: createRng(9) });
  for (let i = 0; i < 50 && !b.over; i++) {
    const ev = b.act(cpuAction(b, b.turn));
    assert.equal(ev.error, undefined);
  }
});
