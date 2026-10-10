import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readCard } from '../docs/src/engine/card.js';
import { createRng } from '../docs/src/engine/rng.js';
import { makeHero, createParty, checkItem, heroFighter, afterFight, applyLevel, postFightHeal, applyC2Reward, makeEnemy, C2_AWARDS } from '../docs/src/engine/party.js';

const withCheck = (s) => { let t = 0; for (let i = 0; i < 12; i++) t += (i % 2 ? 3 : 1) * +s[i]; return s + ((10 - (t % 10)) % 10); };
const card = (hp, st, df, race, job, speed = 5, special = '00') => readCard(withCheck(`${hp}${st}${df}${race}${job}${speed}${special}`));
const WARRIOR = card('050', '10', '10', 4, 2, 5, '50');
const WIZARD = card('040', '08', '12', 3, 8, 6, '18');

test('heroes: role checks, hero flag, back-read rescale', () => {
  assert.equal(makeHero(WIZARD, 'warrior').reason, 'need-warrior');
  assert.equal(makeHero(WARRIOR, 'wizard').reason, 'need-magician');
  assert.equal(makeHero(card('050', '10', '10', 4, 2), 'warrior').reason, 'not-hero');
  const back = makeHero(readCard('2000070000281'), 'wizard').hero; // back read 420/95/77, job 7
  assert.deepEqual([back.raw.hp, back.raw.st, back.raw.df], [42, 10, 10]);
  assert.deepEqual(back.cur, { hp: 42, st: 10, df: 10, pp: 5, mp: 10 });
  assert.equal(back.live, true);
});

test('party: union digit from both heroes', () => {
  const p = createParty(makeHero(WARRIOR, 'warrior').hero, makeHero(WIZARD, 'wizard').hero);
  assert.equal(p.ucd, (Number(WARRIOR.code.at(-1)) + Number(WIZARD.code.at(-1))) % 10);
});

test('item rules: union needs same race and job', () => {
  const h = makeHero(WARRIOR, 'warrior').hero;
  assert.equal(checkItem(h, card('020', '05', '05', 3, 2), { mode: 'C2' }), 'not-union');
  assert.equal(checkItem(h, card('020', '05', '05', 4, 2), { mode: 'C2' }), null);
  assert.equal(checkItem(h, card('000', '15', '00', 5, 0), { mode: 'C2' }), null);
  assert.equal(checkItem(h, card('000', '00', '00', 9, 5), { mode: 'C2' }), 'info-card');
  assert.equal(checkItem(h, card('000', '00', '00', 9, 5), { mode: 'C1' }), null);
});

test('fight uses current stats; only hp/pp/mp come back', () => {
  const h = makeHero(WARRIOR, 'warrior').hero;
  h.cur.hp = 30;
  const f = heroFighter(h, card('000', '15', '00', 5, 0), createRng(1));
  assert.deepEqual([f.hp, f.st], [30, 25]);
  f.hp = 12; f.pp = 3; f.st = 99;
  afterFight(h, f);
  assert.deepEqual(h.cur, { hp: 12, st: 10, df: 10, pp: 3, mp: 0 });
  f.hp = 0;
  afterFight(h, f);
  assert.equal(h.live, false);
});

test('levels rebuild from raw and revive', () => {
  const p = createParty(makeHero(WARRIOR, 'warrior').hero, makeHero(WIZARD, 'wizard').hero);
  p.heroes[0].live = false;
  applyLevel(p, 10);
  assert.equal(p.heroes[0].live, true);
  assert.deepEqual([p.heroes[0].cur.hp, p.heroes[0].cur.pp, p.heroes[1].cur.mp], [115, 5, 10]);
});

test('post-fight heal: herbs or wizard cure magic', () => {
  const p = createParty(makeHero(WARRIOR, 'warrior').hero, makeHero(WIZARD, 'wizard').hero);
  const [w, z] = p.heroes;
  w.cur.hp = 10;
  assert.equal(postFightHeal(w, { type: 'herbs', n: 2 }).heal, 20); // 40% of 50
  assert.equal(w.cur.pp, 3);
  assert.equal(postFightHeal(w, { type: 'magic', spell: 3 }).error, 'not-wizard');
  z.cur.hp = 1;
  assert.equal(postFightHeal(z, { type: 'magic', spell: 4 }).heal, 20);
  assert.equal(z.cur.mp, 6);
});

test('C2 rewards by enemy special, both heroes, with caps', () => {
  const p = createParty(makeHero(WARRIOR, 'warrior').hero, makeHero(WIZARD, 'wizard').hero);
  const [w, z] = p.heroes;
  applyC2Reward(p, 66);
  assert.deepEqual([w.cur.hp, w.cur.pp, z.cur.hp, z.cur.mp], [80, 10, 70, 15]);
  applyC2Reward(p, 74);
  assert.deepEqual([w.cur.st, z.cur.st], [20, 18]);
  applyC2Reward(p, 79);
  assert.deepEqual([w.cur.df, z.cur.df], [20, 22]);
  const r = applyC2Reward(p, 85);
  assert.equal(r.passcodeLevel, C2_AWARDS[5]);
  assert.equal(r.passcode.length, 5);
});

test('enemies: no rescale, items refused', () => {
  assert.equal(makeEnemy(card('000', '15', '00', 5, 0)).reason, 'item-first');
  const e = makeEnemy(readCard('2000070000281'));
  assert.equal(e.fighter.hp, 420);
});
