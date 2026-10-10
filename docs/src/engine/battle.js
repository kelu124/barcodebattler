// Battle resolution for the Barcode Battler II. No DOM, no timers.
// Ported from finalfighter/BarcodeBattler2-Simulator src/FightingCalc.as and the
// battle flow in src/barcode2.as (MIT). The simulator replays 6502 byte maths;
// here it is plain integer maths with floor division, following the intended
// behaviour where the simulator's emulation is buggy (see bb-game-rules).

import { HIGHEST_WARRIOR_JOB } from './card.js';
import { createRng } from './rng.js';

/** Race affinity ×/10, [attacker race][defender race] (FightingCalc.as:9-15). */
export const RACE_TABLE = [
  [10, 8, 12, 12, 8],
  [12, 10, 8, 12, 8],
  [8, 12, 10, 12, 8],
  [8, 8, 8, 10, 12],
  [12, 12, 12, 8, 10],
];
/** Guardian-star affinity ×/10, [race][star] (FightingCalc.as:20-26). */
export const STAR_TABLE = [
  [12, 10, 8],
  [8, 12, 10],
  [10, 8, 12],
  [12, 10, 8],
  [8, 12, 10],
];
/** Spells F0-F9: MP cost (FightingCalc.as:45-56). */
export const MAGIC = [
  { name: 'Toruma', mp: 0, effect: 'Steal 1-6 MP' },
  { name: 'Gantsu', mp: 2, effect: 'Attack ×1.5, less accurate' },
  { name: 'Degantsu', mp: 5, effect: 'Attack ×2, less accurate' },
  { name: 'Riimo', mp: 2, effect: 'Heal 30% HP' },
  { name: 'Deriimo', mp: 4, effect: 'Heal 50% HP' },
  { name: 'Nyahe', mp: 3, effect: 'Enemy DF -30%' },
  { name: 'Kachikomu', mp: 5, effect: 'Own DF +30%' },
  { name: 'Hehenda', mp: 4, effect: 'Enemy ST -30%' },
  { name: 'Tafuni', mp: 6, effect: 'Own ST +30%' },
  { name: 'Mamiroja', mp: 3, effect: 'Enemy cannot use herbs' },
];
const ATTACK_SPELL_RATE = { 1: 15, 2: 20 };
const HERB_FACTORS = [1, 2, 3, 5, 7];
const DAMAGE_CAP = 999;
const STAT_CAP = 199;
const MP_CAP = 99;

const mul = (x, rate) => Math.floor((x * rate) / 10);
const has = (f, s) => f.special1 === s || f.special2 === s;
const isWizard = (f) => f.job > HIGHEST_WARRIOR_JOB;

/** Guardian star from a roll in [0, 500) (FightingCalc.as:78-88). */
export const starFromRoll = (r) => (r < 110 ? 0 : r < 256 ? 1 : 2);

/** Initiative value; roll in [0, 9) (FightingCalc.as:104-156). */
export function firstSpeed(me, opp, star, roll) {
  let v = mul(me.speed * 5 + roll, STAR_TABLE[me.race1][star]);
  v = mul(v, RACE_TABLE[me.race1][opp.race1] + 1);
  return me.special1 === 37 ? v + 50 : v;
}

/** Hit if threshold > 255, else if a [0,256) roll <= threshold (FightingCalc.as:335-410). */
export function hitThreshold(me, opp, star, magicRate = 0) {
  // Faster fighters gain speed - HP/83. The simulator wraps a negative value to
  // ~255 (a sure hit); we clamp it to 0.
  const add = me.speed >= opp.speed ? Math.max(0, me.speed - Math.floor(me.hp / 83)) : 0;
  let base = 0xcc;
  if (has(me, 38)) base = 0xe6;
  else if (has(me, 39)) base = 0x80;
  else if (has(opp, 40)) base = 0xe6;
  else if (has(opp, 41)) base = 0x80;
  base -= magicRate;
  return mul(base, STAR_TABLE[me.race1][star]) + add;
}

/**
 * Damage before specials (FightingCalc.as:413-532).
 * roll: index 0-4 into ×{0,.2,.4,.6,.8}; timing: 1 or 2.
 */
export function baseDamage(att, def, { star, attackerIsP1, roll, timing }) {
  const atk = 2 * att.st + Math.floor((att.st * roll * 2) / 10);
  let d;
  if (atk < def.df) {
    d = 1;
  } else {
    d = atk - def.df;
    if (attackerIsP1 && def.union) {
      const race = att.union ? def.race1 : att.race1;
      d = race <= 1 ? Math.floor(d / 4) : race === 2 ? Math.floor(d / 3) : Math.floor(d / 2);
    } else {
      d = Math.floor(d / 2);
    }
    d = mul(d, STAR_TABLE[att.race1][star]);
    d = mul(d, RACE_TABLE[att.race1][def.race1]) + 1;
  }
  return d * timing;
}

/** Specials 1-18 of the attacker, attack magic, shields 20-22 of the defender (FightingCalc.as:534-682). */
export function applyMultipliers(damage, att, def, magicRate = 0) {
  const scale = (x, rate) => Math.min(DAMAGE_CAP, mul(x, rate));
  let d = damage;
  for (const s of [att.special1, att.special2]) {
    if (s >= 1 && s <= 10) {
      if ((s === 10 ? 0 : s) === def.job) d = scale(d, 30);
    } else if (s >= 11 && s <= 15) {
      if ((s === 15 ? 0 : s - 10) === def.race1) d = scale(d, 30);
    } else if (s === 16) d = Math.floor(d / 2);
    else if (s === 17) d = scale(d, 15);
    else if (s === 18) d = scale(d, 20);
  }
  if (magicRate > 1) d = scale(d, magicRate);
  for (const s of [def.special1, def.special2]) {
    const rate = { 20: 9, 21: 7, 22: 5 }[s];
    if (rate) d = scale(d, rate);
  }
  return Math.min(DAMAGE_CAP, d);
}

/** POWER herb heal; factor ∈ {1,2,3,5,7}, timing ∈ {10,14} (FightingCalc.as:718-789). */
export function herbHeal(me, opp, { factor, timing }) {
  return herbMods(me, opp, Math.floor((Math.floor(me.maxHp / 10) * factor * timing) / 10));
}

/** SELECT with n herbs (1-3): 20% max HP each (FightingCalc.as:846-894). */
export const multiHerbHeal = (me, opp, n) => herbMods(me, opp, mul(me.maxHp, 2 * n));

function herbMods(me, opp, heal) {
  // The simulator computes these two but discards the result; applied as intended.
  if (has(opp, 43)) heal = Math.floor(heal / 2);
  if (has(me, 44)) heal *= 2;
  return Math.max(0, Math.min(heal, me.maxHp - me.hp));
}

/** Pre-battle specials 45 and 23-29, both ways (barcode2.as:1796-1822, FightingCalc.as:158-332). */
export function applySpecialDowns(p1, p2) {
  const cancel1 = has(p2, 45), cancel2 = has(p1, 45);
  if (cancel1) p1.special1 = p1.special2 = 0;
  if (cancel2) p2.special1 = p2.special2 = 0;
  downOne(p2, p1);
  downOne(p1, p2);
}

const STRONGER = [[23, 24], [25, 26], [25, 27], [26, 27], [28, 29]];

function downOne(src, tgt) {
  for (const [weak, strong] of STRONGER) {
    if (src.special1 === weak && src.special2 === strong) src.special1 = 0;
    else if (src.special1 === strong && src.special2 === weak) src.special2 = 0;
  }
  // Only the first matching effect applies (else-if chain in the simulator).
  const effects = [
    [23, 'st', 7], [24, 'st', 5], [25, 'df', 7], [26, 'df', 5], [27, 'df', 2], [28, 'hp', 7], [29, 'hp', 5],
  ];
  for (const [s, stat, rate] of effects) {
    if (!has(src, s)) continue;
    if (stat === 'hp') {
      tgt.hp = tgt.maxHp = mul(tgt.hp, rate);
      tgt.downHp = true;
    } else {
      tgt[`${stat}1`] = mul(tgt[`${stat}1`], rate);
      tgt[stat] = tgt[`${stat}1`] + tgt[`${stat}2`];
      tgt[`down${stat === 'st' ? 'St' : 'Df'}`] = true;
    }
    return;
  }
}

function prepare(f) {
  return {
    ...f,
    brokeSt: false, brokeDf: false, herbsBlocked: false,
    downHp: false, downSt: false, downDf: false,
  };
}

/**
 * Start a battle between two fighters (from fuse()).
 * opts: { rng, first: 0|1 (force who starts), allowEscape: bool (story mode) }
 * Returns a battle object: { fighters, star, turn, over, winner, escaped, log, act(action) }.
 * Actions: {type:'attack'} | {type:'herb'} | {type:'herbs', n} | {type:'magic', spell} | {type:'escape'}.
 */
export function createBattle(f1, f2, opts = {}) {
  const rng = opts.rng ?? createRng();
  const fighters = [prepare(f1), prepare(f2)];
  const star = starFromRoll(rng.int(500));
  const start = { type: 'start', star, specials: null, firstSpeeds: null };

  applySpecialDowns(fighters[0], fighters[1]);
  start.specials = fighters.map((f) => ({ hp: f.downHp, st: f.downSt, df: f.downDf }));

  let turn = opts.first;
  if (turn === undefined) {
    const v = [firstSpeed(fighters[0], fighters[1], star, rng.int(9)), firstSpeed(fighters[1], fighters[0], star, rng.int(9))];
    start.firstSpeeds = v;
    turn = v[0] > v[1] ? 0 : v[0] < v[1] ? 1 : rng.int(2);
  }
  start.first = turn;

  const battle = {
    fighters, star, turn, over: false, winner: null, escaped: false, log: [start],
    act(action) {
      if (battle.over) return { error: 'battle-over' };
      const me = battle.turn;
      const ev = resolve(battle, me, action, rng, opts);
      if (ev.error) return ev;
      battle.log.push(ev);
      const opp = 1 - me;
      if (battle.escaped) {
        battle.over = true;
      } else if (fighters[opp].hp <= 0) {
        battle.over = true;
        battle.winner = me;
      } else if (fighters[me].hp <= 0) {
        battle.over = true;
        battle.winner = opp;
      }
      battle.turn = opp;
      return ev;
    },
  };
  return battle;
}

function resolve(battle, me, action, rng, opts) {
  const A = battle.fighters[me], D = battle.fighters[1 - me];
  switch (action.type) {
    case 'attack':
      return attack(battle, me, 0, rng);
    case 'herb': {
      if (A.herbsBlocked) return { error: 'herbs-blocked' };
      if (A.pp <= 0) return { error: 'no-herbs' };
      const heal = herbHeal(A, D, { factor: rng.pick(HERB_FACTORS), timing: rng.coin() ? 14 : 10 });
      A.pp -= 1;
      A.hp += heal;
      return { type: 'herb', by: me, heal, n: 1 };
    }
    case 'herbs': {
      const n = action.n;
      if (A.herbsBlocked) return { error: 'herbs-blocked' };
      if (!(n >= 1 && n <= 3) || n > A.pp) return { error: 'no-herbs' };
      const heal = multiHerbHeal(A, D, n);
      A.pp -= n;
      A.hp += heal;
      return { type: 'herb', by: me, heal, n };
    }
    case 'magic':
      return magic(battle, me, action.spell, rng);
    case 'escape': {
      if (!opts.allowEscape) return { error: 'cannot-escape' };
      const ok = rng.int(3) >= 1;
      if (ok) battle.escaped = true;
      return { type: 'escape', by: me, ok };
    }
    default:
      return { error: 'unknown-action' };
  }
}

function attack(battle, me, magicRate, rng) {
  const A = battle.fighters[me], D = battle.fighters[1 - me];
  const threshold = hitThreshold(A, D, battle.star, magicRate);
  const hit = threshold > 255 || rng.int(256) <= threshold;
  const ev = { type: 'attack', by: me, hit, damage: 0, critical: false, broke: { weapon: false, armour: false } };
  if (!hit) return ev;
  const base = baseDamage(A, D, { star: battle.star, attackerIsP1: me === 0, roll: rng.int(5), timing: rng.int(2) + 1 });
  const damage = applyMultipliers(base, A, D, magicRate);
  D.hp = Math.max(0, D.hp - damage);
  ev.damage = damage;
  ev.critical = damage > A.st + (A.st >> 1);
  // One-use items break after a damaging hit that doesn't finish the opponent.
  if (D.hp > 0) {
    if (A.race2 === 5 && !A.brokeSt) {
      A.st -= A.st2;
      A.brokeSt = ev.broke.weapon = true;
    }
    if (D.race2 === 7 && !D.brokeDf) {
      D.df -= D.df2;
      D.brokeDf = ev.broke.armour = true;
    }
  }
  return ev;
}

function magic(battle, me, spell, rng) {
  const A = battle.fighters[me], D = battle.fighters[1 - me];
  const def = MAGIC[spell];
  if (!def) return { error: 'unknown-spell' };
  if (!isWizard(A)) return { error: 'not-wizard' };
  if (A.mp < def.mp) return { error: 'not-enough-mp' };
  A.mp -= def.mp;
  const ev = { type: 'magic', by: me, spell, name: def.name };
  switch (spell) {
    case 0: {
      const mp = Math.min(D.mp, rng.int(6) + 1);
      D.mp -= mp;
      A.mp = Math.min(MP_CAP, A.mp + mp);
      return { ...ev, mp };
    }
    case 1:
    case 2:
      return { ...attack(battle, me, ATTACK_SPELL_RATE[spell], rng), ...ev };
    case 3:
    case 4: {
      const heal = Math.max(0, Math.min(mul(A.maxHp, spell === 3 ? 3 : 5), A.maxHp - A.hp));
      A.hp += heal;
      return { ...ev, heal };
    }
    case 5: return { ...ev, ...shift(D, 'df', -1) };
    case 6: return { ...ev, ...shift(A, 'df', +1) };
    case 7: return { ...ev, ...shift(D, 'st', -1) };
    case 8: return { ...ev, ...shift(A, 'st', +1) };
    case 9:
      D.herbsBlocked = true;
      return ev;
  }
}

/** ±30% of the base (card 1) stat, re-summed with the item, capped (barcode2.as:4270-4610). */
function shift(f, stat, sign) {
  const k1 = `${stat}1`, k2 = `${stat}2`;
  const amount = mul(f[k1], 3);
  f[k1] = Math.min(STAT_CAP, f[k1] + sign * amount);
  f[stat] = Math.min(STAT_CAP, f[k1] + f[k2]);
  return { stat, amount: sign * amount };
}

/** The CPU's choice for fighter `me` (FightingCalc.as:1064-1103). */
export function cpuAction(battle, me, rng = createRng()) {
  const A = battle.fighters[me], D = battle.fighters[1 - me];
  const r = rng.int(100) + 1, rm = rng.int(100) + 1;
  if (A.hp / A.maxHp < 0.2 && A.pp > 0 && !A.herbsBlocked && r > 50) return { type: 'herb' };
  if (A.mp > 0 && isWizard(A) && r >= 70) {
    if (rm >= 40 && rm < 60 && A.mp >= 3 && D.df <= 5) return { type: 'magic', spell: 5 };
    if (rm >= 70 && rm < 90 && A.mp >= 7 && D.st <= 5) return { type: 'magic', spell: 7 };
  }
  return { type: 'attack' };
}
