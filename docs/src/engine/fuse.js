// Turning one or two read cards into a fighter.
// Validation: finalfighter simulator src/BarcodeRead.as:12-132 (MIT).
// Fusion:     src/CreateFightingData.as:6-104 (MIT).

import { HIGHEST_WARRIOR_JOB } from './card.js';
import { createRng } from './rng.js';

const isWizard = (card) => card.job > HIGHEST_WARRIOR_JOB;

/**
 * Why card1 (+ card2) cannot be used, or null if they can.
 * opts: { hero: bool (C1/C2 need a hero card), job: 'warrior'|'magician', mode: 'C0'|'C1'|'C2' }
 */
export function canPair(card1, card2 = null, opts = {}) {
  if (card1.kind !== 'fighter') return 'item-first';
  if (opts.hero && card1.readMode === 'front' && card1.special !== 18 && card1.special !== 50) return 'not-hero';
  if (card1.special === 50 && (card1.hp >= 60 || card1.st >= 20 || card1.df >= 20)) return 'hero-too-strong';
  if (opts.job === 'warrior' && isWizard(card1)) return 'need-warrior';
  if (opts.job === 'magician' && !isWizard(card1)) return 'need-magician';
  if (!card2) return null;
  if (tail(card1.code) === tail(card2.code)) return 'same-card';
  if (card2.kind === 'powerup') {
    if ((card2.job === 5 || card2.job === 6) && opts.mode !== 'C1') return 'info-card';
    if (!isWizard(card1) && card2.job >= 8) return 'warrior-mp';
  }
  // The simulator tests card2's job here, which is always 0 for equipment, so the
  // rule never fires; we apply the intended rule to the wizard holding it.
  if (isWizard(card1) && (card2.kind === 'weapon' || card2.kind === 'armour')) return 'wizard-equipment';
  return null;
}

/** Digits 6-12 (EAN-13) or 1-7 (EAN-8): cards equal here are "the same card". */
function tail(code) {
  return code.length >= 13 ? code.slice(6, 13) : code.slice(1, 8);
}

/**
 * Build a fighter. Returns {ok:true, fighter} or {ok:false, reason}.
 * opts as canPair, plus rng (for volatile-sign items).
 */
export function fuse(card1, card2 = null, opts = {}) {
  const reason = canPair(card1, card2, opts);
  if (reason) return { ok: false, reason };
  const rng = opts.rng ?? createRng();

  let c1 = card1;
  // Story / C2 modes rescale a back-read hero (BarcodeRead.as:127-132).
  if (opts.hero && c1.readMode === 'back') {
    c1 = { ...c1, hp: Math.floor(c1.hp / 10), st: Math.floor(c1.st / 10) + 1, df: Math.floor(c1.df / 10) + 3 };
    c1.battleSt = c1.st;
    c1.battleDf = c1.df;
  }

  const f = {
    maxHp: c1.hp, hp: c1.hp,
    st: c1.battleSt, st1: c1.battleSt, st2: 0,
    df: c1.battleDf, df1: c1.battleDf, df2: 0,
    speed: c1.speed, race1: c1.race, race2: null, job: c1.job,
    pp: c1.pp, mp: c1.mp, union: false,
    oneUseSt: false, oneUseDf: false,
    specials: [c1.special],
    cards: [c1.code],
  };
  if (!card2) return { ok: true, fighter: f };

  const c2 = applyVolatileSign(card2, rng);
  const clamp = (x) => Math.max(0, Math.min(199, x));
  f.maxHp = f.hp = Math.min(999, c1.hp + c2.hp);
  f.st2 = c2.battleSt;
  f.df2 = c2.battleDf;
  f.st = clamp(f.st1 + f.st2);
  f.df = clamp(f.df1 + f.df2);
  f.race2 = c2.race;
  f.oneUseSt = c2.race === 5;
  f.oneUseDf = c2.race === 7;
  f.specials.push(c2.special);
  f.cards.push(c2.code);

  if (c2.kind === 'fighter') {
    f.union = true;
    f.mp = isWizard(c1) && (c1.mp >= 10 || c2.mp >= 10) ? c1.mp : 0;
  } else {
    f.pp = Math.min(99, c1.pp + c2.pp);
    f.mp = isWizard(c1) ? Math.min(99, c1.mp + c2.mp) : 0;
  }
  return { ok: true, fighter: f };
}

// Specials 30/31/32 make an item's HP/ST/DF negative on a coin toss (BarcodeRead.as:276-293).
function applyVolatileSign(card, rng) {
  if (!card.volatileSign || !rng.coin()) return card;
  return { ...card, hp: -card.hp, st: -card.st, df: -card.df, battleSt: -card.battleSt, battleDf: -card.battleDf };
}
