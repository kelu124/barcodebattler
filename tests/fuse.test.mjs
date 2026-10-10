import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../docs/src/engine/rng.js';
import { readCard } from '../docs/src/engine/card.js';
import { fuse, canPair } from '../docs/src/engine/fuse.js';

const withCheck = (s) => { let t = 0; for (let i = 0; i < 12; i++) t += (i % 2 ? 3 : 1) * +s[i]; return s + ((10 - (t % 10)) % 10); };
// Front-read cards built from digit slices: HP(3) ST(2) DF(2) race job speed special(2)
const make = (hp, st, df, race, job, speed = 5, special = '00') =>
  readCard(withCheck(`${hp}${st}${df}${race}${job}${speed}${special}`));

test('rng is deterministic per seed and stays in range', () => {
  const a = createRng(42), b = createRng(42);
  const xs = Array.from({ length: 50 }, () => a.int(9));
  assert.deepEqual(xs, Array.from({ length: 50 }, () => b.int(9)));
  assert.ok(xs.every((x) => x >= 0 && x < 9));
  assert.notDeepEqual(xs, Array.from({ length: 50 }, () => createRng(7).int(9)));
});

test('a single card becomes a fighter as-is', () => {
  const f = fuse(make('040', '12', '07', 3, 3, 6, '50'));
  assert.equal(f.ok, true);
  const x = f.fighter;
  assert.deepEqual([x.maxHp, x.hp, x.st, x.df, x.speed, x.job, x.pp, x.mp], [40, 40, 12, 7, 6, 3, 5, 0]);
  assert.deepEqual([x.st1, x.st2, x.df1, x.df2, x.union], [12, 0, 7, 0, false]);
  assert.deepEqual([x.special1, x.special2], [50, 0]);
});

test('an item cannot be the first card', () => {
  assert.equal(fuse(make('000', '15', '00', 5, 0)).reason, 'item-first');
});

test('fighter + weapon: ST summed, item kept apart for breakage', () => {
  const f = fuse(make('050', '20', '10', 4, 2), make('000', '15', '00', 5, 0)).fighter;
  assert.deepEqual([f.st, f.st1, f.st2, f.oneUseSt], [35, 20, 15, true]);
  assert.equal(f.union, false);
});

test('two fighters fuse: HP capped 999, stats clamped 0..199, union set', () => {
  const f = fuse(make('199', '99', '99', 0, 1), make('199', '99', '99', 1, 2)).fighter;
  assert.deepEqual([f.hp, f.st, f.df, f.union, f.speed, f.job], [398, 198, 198, true, 5, 1]);
});

test('identical trailing digits cannot fuse', () => {
  const a = make('040', '12', '07', 3, 3);
  assert.equal(fuse(a, a).reason, 'same-card');
});

test('wizards cannot hold weapons or armour; warriors cannot take MP-ups', () => {
  const wizard = make('050', '10', '10', 4, 8);
  const warrior = make('050', '10', '10', 4, 2);
  assert.equal(fuse(wizard, make('000', '15', '00', 5, 0)).reason, 'wizard-equipment');
  assert.equal(fuse(warrior, make('000', '00', '19', 9, 9)).reason, 'warrior-mp');
  assert.equal(fuse(wizard, make('000', '00', '19', 9, 9)).fighter.mp, 29);
});

test('info cards only work in story mode', () => {
  const warrior = make('050', '10', '10', 4, 2);
  const info = make('000', '00', '00', 9, 5);
  assert.equal(fuse(warrior, info).reason, 'info-card');
  assert.equal(fuse(warrior, info, { mode: 'C1' }).ok, true);
});

test('volatile-sign items flip sign on a seeded coin toss', () => {
  const warrior = make('050', '10', '10', 4, 2);
  const cursed = make('000', '15', '00', 5, 0, 5, '31');
  const sts = new Set(Array.from({ length: 20 }, (_, i) => fuse(warrior, cursed, { rng: createRng(i) }).fighter.st));
  assert.deepEqual([...sts].sort((a, b) => a - b), [0, 25]); // 10-15 clamps to 0, or 10+15
});

test('story/C2 hero mode: needs special 18/50 on front reads, rescales back reads', () => {
  const plain = make('050', '10', '10', 4, 2);
  assert.equal(fuse(plain, null, { hero: true }).reason, 'not-hero');
  assert.equal(fuse(make('050', '10', '10', 4, 2, 5, '50'), null, { hero: true }).ok, true);
  assert.equal(fuse(make('060', '10', '10', 4, 2, 5, '50')).reason, 'hero-too-strong');
  const back = readCard('2000070000281'); // back-read fighter HP 420 ST 95 DF 77
  assert.equal(back.readMode, 'back');
  const f = fuse(back, null, { hero: true }).fighter;
  assert.deepEqual([f.hp, f.st, f.df], [42, 10, 10]);
});

test('canPair reports the reason without building a fighter', () => {
  assert.equal(canPair(make('000', '15', '00', 5, 0)), 'item-first');
  assert.equal(canPair(make('050', '10', '10', 4, 2)), null);
});
