// C1 — the device's built-in story: stages E-1..E-6, worlds L-1..L-5 (+ L-H), keys.
// Ported from finalfighter/BarcodeBattler2-Simulator src/C1WorldData.as and the C1
// flow in src/barcode2.as (MIT), with the bug rulings in
// .claude/skills/bb-game-rules/modes.md.

import { applyLevel, revive } from './party.js';
import { encodePasscode } from './passcode.js';

export const STAGES = ['E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6'];
export const WORLDS = ['L-1', 'L-2', 'L-3', 'L-4', 'L-5', 'L-H'];
export const ENEMY_IDS = ['01', '02', '03', '04', 'HH'];
const LH = 5;
const BOSS = 4;

// T[stage] = [HP[10], ST[10], DF[10], rewardSTDF[6], pointer[10 by ucd], bossHP[5]] (C1WorldData.as:75-244)
const T = [
  [[21,27,33,40,48,56,64,72,81,91],[7,8,9,11,12,15,16,18,21,23],[9,10,12,14,15,18,20,21,24,27],[1,1,1,1,1,2],[0,0,4,4,3,3,2,2,1,1],[15,18,21,24,27]],
  [[72,81,91,101,111,121,132,144,156,168],[18,21,23,26,28,30,33,35,39,41],[21,24,27,30,31,34,37,39,43,46],[2,2,2,2,2,2],[4,4,3,3,2,2,1,1,0,0],[36,39,42,45,48]],
  [[144,156,168,180,193,207,221,235,249,264],[35,39,41,44,48,51,55,58,61,65],[39,43,46,48,51,55,59,61,65,69],[3,2,3,3,3,2],[4,4,3,3,2,2,1,1,0,0],[57,60,63,66,69]],
  [[235,249,264,280,296,312,328,345,363,381],[58,61,65,68,73,76,80,85,89,94],[61,65,69,72,76,80,83,87,91,96],[3,4,3,3,3,4],[3,3,4,4,0,0,1,1,2,2],[78,81,84,87,90]],
  [[345,363,381,399,417,436,456,476,496,516],[85,89,94,98,102,107,111,117,121,126],[87,91,96,99,103,108,112,117,121,125],[4,4,4,4,4,4],[3,3,4,4,0,0,1,1,2,2],[99,102,105,108,110]],
  [[476,496,516,537,559,581,603,625,648,672],[117,121,126,132,137,143,148,153,159,164],[117,121,125,130,135,141,145,150,155,160],[4,4,4,4,4,4],[2,2,3,3,4,4,0,0,1,1],[120,123,126,129,132]],
];
/** Passcode level reached by clearing each stage (C1WorldData.as:25-27). */
export const STAGE_PASSCODE = [10, 16, 24, 31, 38, 45];

const KEY_LAYOUTS = [
  ['L1-1', 'L3-2', 'L5-3'], ['L2-2', 'L4-3', 'L5-1'], ['L1-1', 'L3-2', 'L5-3'], ['L2-1', 'L3-3', 'L5-4'], ['L1-4', 'L2-2', 'L4-3'],
];
const KEY_ROWS = [[0, 1, 2, 3, 4], [4, 0, 1, 2, 3], [4, 0, 1, 2, 3], [3, 4, 0, 1, 2], [3, 4, 0, 1, 2], [2, 3, 4, 0, 1]];
const UCD_PAIR = [0, 0, 4, 4, 3, 3, 2, 2, 1, 1]; // ucd 0/1, 8/9, 6/7, 4/5, 2/3 → column

const RACE_BY_WORLD = [0, 1, 2, 3, 4, 4];
const JOB_BY_ENEMY = [7, 2, 8, 4, 5];

// Power-up codes at E-1, applied to raw stats: [hp ×/10 + add, st ×/9 + add, df ×/12 + add] (C1WorldData.as:686-735)
const POWER_CODES = {
  815: [[14, 4], [13, 0], [16, 0]],
  '031': [[16, 9], [15, 1], [18, 1]],
  '009': [[17, 12], [16, 1], [19, 2]],
  '099': [[18, 16], [17, 2], [20, 3]],
  '077': [[19, 20], [18, 3], [21, 4]],
};

const pointerOf = (stage, world, ucd) => world === LH ? 5 : (T[stage][4][ucd] + world) % 5;

/** Enemy fighter for (stage, world 0-5, enemy 0-4) (C1WorldData.as:578-633). */
export function generateEnemy(stage, world, enemy, ucd) {
  const idx = world === LH ? 5 + enemy : enemy + pointerOf(stage, world, ucd);
  const [hpT, stT, dfT] = T[stage];
  const job = JOB_BY_ENEMY[enemy];
  const hp = hpT[idx], st = stT[idx], df = dfT[idx];
  return {
    maxHp: hp, hp, st, st1: st, st2: 0, df, df1: df, df2: 0,
    speed: enemy === BOSS ? 6 : 5, race1: RACE_BY_WORLD[world], race2: null, job,
    pp: 5, mp: job > 6 ? 10 : 0, union: false, oneUseSt: false, oneUseDf: false,
    special1: 0, special2: 0, cards: [],
  };
}

/** Keys held by enemies at the start of a stage (ruling: chosen by stage, not world). */
export function keyLayout(stage, ucd) {
  return [...KEY_LAYOUTS[KEY_ROWS[stage][UCD_PAIR[ucd]]]];
}

export function createStory(party, { stage = 0 } = {}) {
  const story = { party, stage, worlds: null, keys: null, lhUnlocked: false, infoUsed: { 5: false, 6: false }, over: false };
  resetStage(story);
  return story;
}

function resetStage(story) {
  story.worlds = WORLDS.map(() => [0, 1, 2, 3, 4]);
  story.keys = keyLayout(story.stage, story.party.ucd);
  story.lhUnlocked = false;
}

export const keysHeld = (story) => 3 - story.keys.length;

/** Worlds that still have enemies: [{index, name, enemies: ['01', …]}]. */
export function openWorlds(story) {
  return story.worlds
    .map((enemies, index) => ({ index, name: WORLDS[index], enemies: enemies.map((e) => ENEMY_IDS[e]) }))
    .filter((w) => w.enemies.length && (w.index !== LH || story.lhUnlocked));
}

/** A random remaining enemy of `world` (C1WorldData.as:567-576). */
export function drawEnemy(story, world, rng) {
  const enemy = rng.pick(story.worlds[world]);
  return { world, enemy, fighter: generateEnemy(story.stage, world, enemy, story.party.ucd) };
}

const keyName = (world, enemy) => `L${world + 1}-${enemy === BOSS ? 'H' : enemy + 1}`;

/** Keys the encountered enemy holds: a boss holds any key of its world. */
export function keysOf(story, { world, enemy }) {
  if (world === LH) return [];
  return enemy === BOSS
    ? story.keys.filter((k) => k.startsWith(`L${world + 1}-`))
    : story.keys.filter((k) => k === keyName(world, enemy));
}

const capAdd = (cur, stat, v, max) => { cur[stat] = Math.min(max, cur[stat] + v); };

/**
 * The active hero (index) beat the encountered enemy. Applies keys, the reward,
 * removes the enemy, and clears the stage after the L-H boss.
 */
export function winFight(story, enc, heroIndex) {
  const hero = story.party.heroes[heroIndex];
  const result = { keyGained: 0, unlockedLH: false, reward: { hp: 0, st: 0, df: 0, pp: 0, mp: 0 }, stageClear: null };

  const held = keysOf(story, enc);
  if (held.length) {
    story.keys = story.keys.filter((k) => !held.includes(k));
    result.keyGained = held.length;
    if (keysHeld(story) === 3 && !story.lhUnlocked) story.lhUnlocked = result.unlockedLH = true;
  }

  const pointer = pointerOf(story.stage, enc.world, story.party.ucd);
  const stdf = T[story.stage][3][pointer];
  const r = result.reward;
  if (enc.enemy === BOSS) {
    r.hp = T[story.stage][5][Math.min(pointer, 4)];
    r.st = r.df = stdf;
  } else if (JOB_BY_ENEMY[enc.enemy] <= 6) {
    r.st = stdf;
    r.pp = 5;
  } else {
    r.df = stdf;
    if (hero.role === 'wizard') r.mp = 5;
  }
  capAdd(hero.cur, 'hp', r.hp, 999);
  hero.maxHp = Math.max(hero.maxHp, hero.cur.hp);
  capAdd(hero.cur, 'st', r.st, 199);
  capAdd(hero.cur, 'df', r.df, 199);
  capAdd(hero.cur, 'pp', r.pp, 99);
  capAdd(hero.cur, 'mp', r.mp, 99);

  if (enc.enemy === BOSS) story.worlds[enc.world] = [];
  else story.worlds[enc.world] = story.worlds[enc.world].filter((e) => e !== enc.enemy);

  if (enc.world === LH && enc.enemy === BOSS) result.stageClear = clearStage(story);
  return result;
}

/** L-H boss beaten (barcode2.as:8703-8847). */
function clearStage(story) {
  const { stage, party } = story;
  if (stage <= 2) {
    const level = STAGE_PASSCODE[stage];
    story.stage += 1;
    applyLevel(party, level);
    resetStage(story);
    return { next: true, stage: story.stage, passcode: encodePasscode(level, party.ucd), level };
  }
  story.over = true;
  // Ruling: show the C1 jump code that unlocks the next secret stage.
  const code = stage === 3 ? `31${(1 + party.ucd) % 10}` : stage === 4 ? `38${party.ucd % 10}` : null;
  return { fin: true, code };
}

/** The active hero lost (barcode2.as:8624-8697). */
export function loseHero(story, enc, heroIndex) {
  const hero = story.party.heroes[heroIndex];
  hero.live = false;
  hero.cur.hp = 0;
  let keyLost = false;
  const bossOfLH = enc.world === LH && enc.enemy === BOSS;
  if (!bossOfLH && keysHeld(story) > 0 && !keysOf(story, enc).length && enc.world !== LH) {
    story.keys.unshift(keyName(enc.world, enc.enemy));
    keyLost = true;
  }
  const gameOver = story.party.heroes.every((h) => !h.live);
  if (gameOver) story.over = true;
  return { keyLost, gameOver };
}

/** A 3-digit passcode typed at stage select. Only at E-1. */
export function storyPasscode(story, code) {
  if (story.stage !== 0) return { ok: false, reason: 'only-at-e1' };
  const { party } = story;
  const power = POWER_CODES[code];
  if (power) {
    const [[hm, ha], [sm, sa], [dm, da]] = power;
    for (const h of party.heroes) {
      const { hp, st, df } = h.raw;
      h.cur = {
        hp: Math.min(999, Math.floor((hp * hm) / 10) + ha),
        st: Math.min(199, Math.floor((st * sm) / 9) + sa),
        df: Math.min(199, Math.floor((df * dm) / 12) + da),
        pp: h.raw.pp, mp: h.raw.mp,
      };
      h.maxHp = h.cur.hp;
      h.live = true;
    }
    return { ok: true, type: 'power' };
  }
  const jumps = { [`31${(1 + party.ucd) % 10}`]: [4, 31], [`38${party.ucd % 10}`]: [5, 38] };
  const jump = jumps[code];
  if (jump) {
    story.stage = jump[0];
    applyLevel(party, jump[1]);
    resetStage(story);
    return { ok: true, type: 'jump', stage: story.stage };
  }
  return { ok: false, reason: 'invalid' };
}

/**
 * Optional bonus after a win (L-power): vs 01/03 a 50% rebirth of a dead partner,
 * vs 02/04 a 50% hint about a key (barcode2.as:9100-9299). One roll per win (UI).
 */
export function bonusEvent(story, enc, heroIndex, rng) {
  if (enc.enemy === BOSS || enc.world === LH) return { type: 'none' };
  const success = rng.int(2) === 1;
  if (enc.enemy === 0 || enc.enemy === 2) {
    const partner = story.party.heroes[1 - heroIndex];
    if (!success || partner.live) return { type: 'nothing' };
    revive(partner);
    return { type: 'rebirth', hero: 1 - heroIndex };
  }
  if (!success || keysHeld(story) === 3) return { type: 'nothing' };
  return { type: 'hint', ...hintFor(story, enc.enemy === 3) };
}

function hintFor(story, withEnemy) {
  const k = story.keys[0];
  const world = `L-${k[1]}`;
  return withEnemy ? { world, enemy: k.slice(-1) === 'H' ? 'HH' : `0${k.slice(-1)}` } : { world };
}

/** Info card (race 9, job 5/6): once per type per game, not when holding 3 keys. */
export function useInfoCard(story, card) {
  const type = card.job;
  if (type !== 5 && type !== 6) return { ok: false, reason: 'not-info' };
  if (story.infoUsed[type]) return { ok: false, reason: 'info-used' };
  if (keysHeld(story) === 3) return { ok: false, reason: 'all-keys' };
  story.infoUsed[type] = true;
  return { ok: true, ...hintFor(story, type === 6) };
}

/** Escape before a fight: 2 chances in 3, one try (barcode2.as:7761-7789). */
export const escapeBeforeFight = (rng) => rng.int(3) >= 1;
