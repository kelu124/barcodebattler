// The two-hero party of the story (C1) and enemy-card (C2) modes.
// From the simulator's barcode_data_c1/c2 handling in src/barcode2.as (MIT);
// see .claude/skills/bb-game-rules/modes.md.

import { canPair, fuse } from './fuse.js';
import { unionDigit, encodePasscode, levelStats } from './passcode.js';

const CAP = { hp: 999, st: 199, df: 199, pp: 99, mp: 99 };
const cap = (k, v) => Math.max(0, Math.min(CAP[k], v));
const mul = (x, r) => Math.floor((x * r) / 10);

/** Passcode levels awarded by enemy specials 80-99 (C2PassCode.as:54-60). */
export const C2_AWARDS = [5, 10, 15, 20, 25, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49];

/** A hero from a read card; role 'warrior' | 'wizard'. Back-read cards are rescaled. */
export function makeHero(card, role) {
  const opts = { hero: true, job: role === 'warrior' ? 'warrior' : 'magician' };
  const reason = canPair(card, null, opts);
  if (reason) return { ok: false, reason };
  const f = fuse(card, null, opts).fighter; // applies the back-read rescale
  const raw = { ...card, hp: f.hp, st: f.st, df: f.df, battleSt: f.st, battleDf: f.df, pp: f.pp, mp: f.mp };
  const hero = { role, code: card.code, raw, cur: null, maxHp: 0, live: true };
  resetTo(hero, raw);
  return { ok: true, hero };
}

function resetTo(hero, stats) {
  hero.cur = { hp: stats.hp, st: stats.st, df: stats.df, pp: hero.raw.pp, mp: hero.raw.mp };
  hero.maxHp = stats.hp;
  hero.live = stats.hp > 0;
}

export function createParty(warrior, wizard) {
  return { heroes: [warrior, wizard], ucd: unionDigit(warrior.code, wizard.code) };
}

/** Why `card` can't be the hero's item before a fight, or null. */
export function checkItem(hero, card, { mode }) {
  return canPair(hero.raw, card, { mode, union: true, trusted: true });
}

/** The fighter for a battle: current stats (+ item card). */
export function heroFighter(hero, item = null, rng) {
  const c = hero.cur;
  const card = { ...hero.raw, hp: c.hp, st: c.st, df: c.df, battleSt: c.st, battleDf: c.df, pp: c.pp, mp: c.mp };
  const res = fuse(card, item, { trusted: true, union: true, mode: 'C1', rng });
  if (!res.ok) throw new Error(res.reason);
  return res.fighter;
}

/** After a fight (or escape) only HP, PP and MP carry over (barcode2.as:2200-2264). */
export function afterFight(hero, fighter) {
  hero.cur.hp = cap('hp', fighter.hp);
  hero.cur.pp = cap('pp', fighter.pp);
  hero.cur.mp = cap('mp', fighter.mp);
  hero.maxHp = Math.max(hero.maxHp, Math.min(fighter.maxHp, CAP.hp));
  hero.live = hero.cur.hp > 0;
}

/** Rebuild both heroes from raw stats at passcode level n; revives both. */
export function applyLevel(party, n) {
  for (const h of party.heroes) resetTo(h, levelStats(h.raw, n));
}

/** Revive a dead hero to its raw card stats (C1 "rebirth"). */
export function revive(hero) {
  resetTo(hero, hero.raw);
}

/** One heal after a won fight: {type:'herbs', n} or {type:'magic', spell: 3|4} (wizard). */
export function postFightHeal(hero, action) {
  const c = hero.cur;
  let heal;
  if (action.type === 'herbs') {
    if (!(action.n >= 1 && action.n <= 3) || action.n > c.pp) return { error: 'no-herbs' };
    heal = mul(hero.maxHp, 2 * action.n);
    c.pp -= action.n;
  } else if (action.type === 'magic' && (action.spell === 3 || action.spell === 4)) {
    if (hero.raw.job <= 6) return { error: 'not-wizard' };
    const cost = action.spell === 3 ? 2 : 4;
    if (c.mp < cost) return { error: 'not-enough-mp' };
    heal = mul(hero.maxHp, action.spell === 3 ? 3 : 5);
    c.mp -= cost;
  } else {
    return { error: 'unknown-action' };
  }
  heal = Math.max(0, Math.min(heal, hero.maxHp - c.hp));
  c.hp += heal;
  return { heal };
}

function add(hero, stat, v) {
  hero.cur[stat] = cap(stat, hero.cur[stat] + v);
  if (stat === 'hp') hero.maxHp = Math.max(hero.maxHp, hero.cur.hp);
}

/**
 * C2 reward for beating an enemy with `special`, to both heroes (barcode2.as:6497-6709).
 * Specials 80-99 also award a passcode level, applied at once (rebuilds from raw).
 * Returns { passcodeLevel, passcode } (null when none).
 */
export function applyC2Reward(party, special) {
  let passcodeLevel = null, passcode = null;
  if (special >= 80 && special <= 99) {
    passcodeLevel = C2_AWARDS[special - 80];
    passcode = encodePasscode(passcodeLevel, party.ucd);
    applyLevel(party, passcodeLevel);
  }
  for (const h of party.heroes) {
    const wizard = h.role === 'wizard';
    if (special >= 65 && special <= 69) {
      add(h, 'hp', [10, 30, 40, 50, 100][special - 65]);
      add(h, 'pp', 5);
      if (wizard) add(h, 'mp', 5);
    } else if (special >= 70 && special <= 74) {
      add(h, 'st', (special - 69) * 2);
      add(h, 'pp', 5);
    } else if (special >= 75 && special <= 79) {
      add(h, 'df', (special - 74) * 2);
      if (wizard) add(h, 'mp', 5);
    } else {
      add(h, 'pp', 5);
      if (wizard) add(h, 'mp', 5);
    }
  }
  return { passcodeLevel, passcode };
}

/** An enemy from a scanned card (C2): any fighter, not rescaled. */
export function makeEnemy(card) {
  const reason = canPair(card);
  if (reason) return { ok: false, reason };
  return { ok: true, fighter: fuse(card).fighter, card };
}
