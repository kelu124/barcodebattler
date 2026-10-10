// Barcode → card, as the Barcode Battler II reads it. Pure and deterministic.
// Ported from finalfighter/BarcodeBattler2-Simulator src/BarcodeRead.as (MIT),
// with gufranco/maeyomi's hardware-checked rulings (MIT): speed from d9, job 6
// is a warrior, and the two-set high-HP bonus. See .claude/skills/bb-game-rules.
//
// Stats are in device units; the display shows them ×100 (see displayStat).

import { parseBarcode } from './barcode.js';

export const RACE = [
  'Mechanical', 'Animal', 'Aquatic', 'Bird', 'Human',
  'Weapon (one-use)', 'Weapon', 'Armour (one-use)', 'Armour', 'Power-up',
];
export const HIGHEST_WARRIOR_JOB = 6;
const START_PP = 5;
const START_MP = 10;

const HIGH_HP_THRESHOLD = 200;
const HIGH_HP_BONUS = 100;
const PARTNER_BONUS = new Set([13, 29, 45, 61, 77, 93]);
const BATTLE_BONUS = new Set([14, 30, 46, 62, 78, 94]);
const BATTLE_WRAP = 256;

export const displayStat = (units) => units * 100;

/** 'front' or 'back': which reading the device applies (BarcodeRead.as:176-203). */
export function readMode(code) {
  if (code.length === 8) return 'back';
  const d = [...code].map(Number);
  if (d[0] <= 1) {
    if (d[7] <= 4) return 'front';
    const within = num(d, 0, 3) <= 50 && num(d, 3, 5) <= 19 && num(d, 5, 7) <= 19;
    return within ? 'front' : 'back';
  }
  return d[2] === 9 && d[9] === 5 ? 'front' : 'back';
}

/** Read a barcode string into a card. Throws Error(reason) if the device would refuse it. */
export function readCard(input) {
  const parsed = parseBarcode(input);
  if (!parsed.ok) throw new Error(`Invalid barcode (${parsed.error})`);
  const { code, digits } = parsed;
  const mode = readMode(code);
  const card = mode === 'front' ? readFront(digits) : readBack(digits);
  return { code, readMode: mode, ...card };
}

export const kindOf = (race) =>
  race <= 4 ? 'fighter' : race <= 6 ? 'weapon' : race <= 8 ? 'armour' : 'powerup';

function base(race, special) {
  return {
    race, kind: kindOf(race), oneUse: race === 5 || race === 7,
    job: 0, hp: 0, st: 0, df: 0, battleSt: 0, battleDf: 0,
    speed: null, pp: 0, mp: 0, special, volatileSign: false,
  };
}

function fighter(card, { job, hp, st, df, battleSt = st, battleDf = df, speed }) {
  return Object.assign(card, {
    job, hp, st, df, battleSt, battleDf, speed,
    pp: START_PP, mp: job > HIGHEST_WARRIOR_JOB ? START_MP : 0,
  });
}

// --- Front read (BarcodeRead.as:206-307): fixed digit slices ---------------

function readFront(d) {
  const race = d[7];
  const special = num(d, 10, 12);
  const card = base(race, special);
  const hp = num(d, 0, 3), st = num(d, 3, 5), df = num(d, 5, 7), job = d[8];

  if (card.kind === 'fighter') {
    return fighter(card, { job, hp, ...highHpBonus(race, hp, st, df), speed: d[9] });
  }
  if (card.kind === 'weapon') return Object.assign(card, { st, battleSt: st, volatileSign: special === 31 });
  if (card.kind === 'armour') return Object.assign(card, { df, battleDf: df, volatileSign: special === 32 });
  // Power-up: sub-type in the job digit. 0-4 HP, 5-6 info (story mode), 7 PP, 8-9 MP.
  card.job = job;
  if (job <= 4) Object.assign(card, { hp, volatileSign: special === 30 });
  else if (job === 7) card.pp = st;
  else if (job >= 8) card.mp = df;
  return card;
}

/** Shown and battle ST/DF after the high-HP bonus (maeyomi decoder/front_read.py:99-136). */
export function highHpBonus(race, hp, st, df) {
  if (hp < HIGH_HP_THRESHOLD || race > 2) return { st, df };
  if (race === 2) return { st: st + HIGH_HP_BONUS, df: df + HIGH_HP_BONUS };
  const leadIsSt = race === 0;
  const lead = leadIsSt ? st : df;
  const partner = leadIsSt ? df : st;
  const partnerGains = BATTLE_BONUS.has(lead) || (leadIsSt && PARTNER_BONUS.has(lead));
  const shownLead = lead + HIGH_HP_BONUS;
  const shownPartner = partner + (partnerGains ? HIGH_HP_BONUS : 0);
  const battleLead = (shownLead + (BATTLE_BONUS.has(lead) ? HIGH_HP_BONUS : 0)) % BATTLE_WRAP;
  return leadIsSt
    ? { st: shownLead, df: shownPartner, battleSt: battleLead, battleDf: shownPartner }
    : { st: shownPartner, df: shownLead, battleSt: shownPartner, battleDf: battleLead };
}

// --- Back read (BarcodeRead.as:310-501): rotated digits ----------------------

// EAN-8 uses the EAN-13 layout with every index moved down by five.
const BACK_LAYOUT = {
  13: { race: 12, hpHigh: 11, hpMid: 10, hpLow: 9, dfLow: 8, job: 5 },
  8: { race: 7, hpHigh: 6, hpMid: 5, hpLow: 4, dfLow: 3, job: null },
};
const EAN8_JOB = 4;

function readBack(d) {
  const L = BACK_LAYOUT[d.length];
  const race = d[L.race];
  const sel = d[L.dfLow], v = d[L.hpMid];
  const special = sel <= 3 ? v : sel >= 8 ? 20 + v : 10 + v;
  const card = base(race, special);
  const high = d[L.hpHigh], mid = d[L.hpMid], low = d[L.hpLow], dfLow = d[L.dfLow];

  if (card.kind === 'fighter') {
    let tens = mid + 7;
    if (tens > 11) tens -= 10;
    const st = tens * 10 + ((low + 5) % 10);
    const df = ((low + 7) % 10) * 10 + ((dfLow + 7) % 10);
    const job = L.job === null ? EAN8_JOB : d[L.job];
    return fighter(card, { job, hp: Math.floor(high / 2) * 100 + mid * 10 + low, st, df, speed: mid });
  }
  if (card.kind === 'weapon') {
    const prefix = mid === 3 || mid === 4 ? 3 : mid >= 5 && mid <= 8 ? 1 : 2;
    const st = prefix * 10 + ((low + 5) % 10);
    return Object.assign(card, { st, battleSt: st });
  }
  if (card.kind === 'armour') {
    const units = (dfLow + 7) % 10;
    const df = low >= 3 && low <= 6 ? units : (low <= 2 && low >= 1 ? 20 : 10) + units;
    return Object.assign(card, { df, battleDf: df });
  }
  card.hp = Math.floor(high / 8) * 100 + mid * 10 + low;
  return card;
}

function num(d, from, to) {
  let n = 0;
  for (let i = from; i < to; i++) n = n * 10 + d[i];
  return n;
}
