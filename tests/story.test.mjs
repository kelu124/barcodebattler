import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readCard } from '../docs/src/engine/card.js';
import { createRng } from '../docs/src/engine/rng.js';
import { makeHero, createParty } from '../docs/src/engine/party.js';
import {
  generateEnemy, keyLayout, createStory, openWorlds, drawEnemy, winFight, loseHero, storyPasscode,
  bonusEvent, escapeBeforeFight, STAGES,
} from '../docs/src/engine/story.js';

const withCheck = (s) => { let t = 0; for (let i = 0; i < 12; i++) t += (i % 2 ? 3 : 1) * +s[i]; return s + ((10 - (t % 10)) % 10); };
const card = (hp, st, df, race, job, speed = 5, special = '00') => readCard(withCheck(`${hp}${st}${df}${race}${job}${speed}${special}`));
function party() {
  const w = makeHero(card('050', '12', '10', 4, 2, 5, '50'), 'warrior').hero;
  const z = makeHero(card('040', '08', '12', 3, 8, 6, '18'), 'wizard').hero;
  return createParty(w, z);
}

test('enemy generation from the stage tables', () => {
  const e = generateEnemy(0, 0, 0, 0); // E-1, L-1, enemy 01, ucd 0
  assert.deepEqual([e.hp, e.st, e.df, e.speed, e.race1, e.job, e.mp], [21, 7, 9, 5, 0, 7, 10]);
  const boss = generateEnemy(0, 0, 4, 0);
  assert.deepEqual([boss.hp, boss.st, boss.df, boss.speed, boss.job, boss.mp], [48, 12, 15, 6, 5, 0]);
  assert.equal(generateEnemy(0, 5, 4, 0).hp, 91); // L-H boss: last column, ucd ignored
  assert.equal(generateEnemy(0, 1, 0, 0).hp, 27); // pointer (0+1)%5 = 1
  assert.equal(STAGES.length, 6);
});

test('key layout by stage and ucd pair', () => {
  assert.deepEqual(keyLayout(0, 0), ['L1-1', 'L3-2', 'L5-3']);
  assert.deepEqual(keyLayout(0, 9), ['L2-2', 'L4-3', 'L5-1']);
  assert.deepEqual(keyLayout(1, 0), ['L1-4', 'L2-2', 'L4-3']);
});

test('a story: worlds, enemies, keys unlock L-H, boss clears the world', () => {
  const s = createStory(party());
  assert.deepEqual(openWorlds(s).map((w) => w.name), ['L-1', 'L-2', 'L-3', 'L-4', 'L-5']);
  s.keys = ['L1-1', 'L1-2', 'L2-1'];
  const enc = { world: 0, enemy: 0, fighter: generateEnemy(0, 0, 0, s.party.ucd) };
  const r = winFight(s, enc, 0);
  assert.equal(r.keyGained, 1);
  assert.equal(r.reward.df > 0, true); // 01 is a wizard: DF reward
  assert.equal(openWorlds(s)[0].enemies.includes('01'), false);
  const boss = winFight(s, { world: 0, enemy: 4, fighter: generateEnemy(0, 0, 4, s.party.ucd) }, 0);
  assert.equal(boss.keyGained, 1); // boss holds the remaining L1 key
  assert.equal(openWorlds(s).some((w) => w.name === 'L-1'), false);
  winFight(s, { world: 1, enemy: 0, fighter: generateEnemy(0, 1, 0, s.party.ucd) }, 1);
  assert.equal(openWorlds(s).at(-1).name, 'L-H');
});

test('rewards: warrior enemy → ST + herbs; wizard enemy → DF (+MP for the wizard)', () => {
  const s = createStory(party());
  s.keys = [];
  const [w, z] = s.party.heroes;
  const st0 = w.cur.st, pp0 = w.cur.pp;
  winFight(s, { world: 0, enemy: 1, fighter: generateEnemy(0, 0, 1, s.party.ucd) }, 0);
  assert.deepEqual([w.cur.st - st0, w.cur.pp - pp0], [1, 5]);
  const df0 = z.cur.df, mp0 = z.cur.mp;
  winFight(s, { world: 0, enemy: 0, fighter: generateEnemy(0, 0, 0, s.party.ucd) }, 1);
  assert.deepEqual([z.cur.df - df0, z.cur.mp - mp0], [1, 5]);
});

test('beating the L-H boss clears the stage and levels the heroes', () => {
  const s = createStory(party());
  s.lhUnlocked = true;
  const r = winFight(s, { world: 5, enemy: 4, fighter: generateEnemy(0, 5, 4, s.party.ucd) }, 0);
  assert.equal(r.stageClear.next, true);
  assert.equal(s.stage, 1);
  assert.equal(r.stageClear.passcode.length, 5);
  assert.equal(s.party.heroes[0].cur.hp, 115); // level 10 from raw 50
});

test('E-4 clear ends the story with the C1 jump code to E-5', () => {
  const s = createStory(party(), { stage: 3 });
  s.lhUnlocked = true;
  const r = winFight(s, { world: 5, enemy: 4, fighter: generateEnemy(3, 5, 4, s.party.ucd) }, 0);
  assert.equal(r.stageClear.fin, true);
  assert.equal(r.stageClear.code, `31${(1 + s.party.ucd) % 10}`);
  assert.equal(s.over, true);
});

test('losing a hero to a non-key-holder hands back a key; both dead = game over', () => {
  const s = createStory(party());
  s.keys = ['L3-2', 'L5-3'];
  const r = loseHero(s, { world: 0, enemy: 1, fighter: generateEnemy(0, 0, 1, s.party.ucd) }, 0);
  assert.equal(r.keyLost, true);
  assert.deepEqual(s.keys, ['L1-2', 'L3-2', 'L5-3']);
  assert.equal(r.gameOver, false);
  assert.equal(loseHero(s, { world: 0, enemy: 1 }, 1).gameOver, true);
  assert.equal(s.over, true);
});

test('C1 passcodes: power-ups and jumps at E-1 only', () => {
  const s = createStory(party());
  const w = s.party.heroes[0];
  assert.equal(storyPasscode(s, '815').ok, true);
  assert.deepEqual([w.cur.hp, w.cur.st, w.cur.df], [74, 17, 13]);
  assert.equal(storyPasscode(s, '123').ok, false);
  const jump = `31${(1 + s.party.ucd) % 10}`;
  assert.equal(storyPasscode(s, jump).ok, true);
  assert.equal(s.stage, 4);
  assert.equal(storyPasscode(s, '815').ok, false); // not at E-1 any more
});

test('bonus events: one 50% roll, rebirth revives only a dead partner', () => {
  const s = createStory(party());
  const [w, z] = s.party.heroes;
  z.live = false; z.cur.hp = 0;
  let revived = false;
  for (let seed = 0; seed < 20 && !revived; seed++) {
    const r = bonusEvent(s, { world: 0, enemy: 0 }, 0, createRng(seed));
    if (r.type === 'rebirth') revived = true;
  }
  assert.equal(revived, true);
  assert.equal(z.live, true);
  assert.equal(w.live, true);
  const hint = bonusEvent(s, { world: 0, enemy: 3 }, 0, { int: () => 1 });
  assert.equal(hint.type, 'hint');
});

test('escape before a fight succeeds 2 times in 3', () => {
  let ok = 0;
  const rng = createRng(4);
  for (let i = 0; i < 3000; i++) if (escapeBeforeFight(rng)) ok++;
  assert.ok(ok > 1900 && ok < 2100);
});

test('drawEnemy picks a remaining enemy of the world', () => {
  const s = createStory(party());
  const e = drawEnemy(s, 2, createRng(1));
  assert.equal(e.world, 2);
  assert.ok(e.enemy >= 0 && e.enemy <= 4);
  assert.equal(e.fighter.hp > 0, true);
});
