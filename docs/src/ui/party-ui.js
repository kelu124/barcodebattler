// Shared screens for the two-hero modes (C1 story, C2 enemy cards, set stories).

import { RACE, readCard } from '../engine/card.js';
import { makeHero, createParty, checkItem, heroFighter, afterFight, postFightHeal } from '../engine/party.js';
import { showStats } from './lcd.js';
import { play } from './sound.js';
import { ERRORS, jobLabel } from './labels.js';
import {
  rng, sleep, say, setPanel, waitFor, askCard, cols, setInfo, setActive, runBattle, nameOf,
} from './kit.js';

export const heroStats = (h) => ({ ...h.cur, speed: h.raw.speed });
const heroName = (h) => nameOf(h.code) || (h.role === 'warrior' ? 'Warrior' : 'Wizard');

/** Show both heroes: warrior in the 1P column, wizard in the 2P column. */
export function showParty(party) {
  party.heroes.forEach((h, i) => {
    showStats(cols[i], h.live ? heroStats(h) : { ...heroStats(h), hp: 0 });
    setInfo(i, h.raw, `${heroName(h)}${h.live ? '' : ' (down)'}`);
  });
}

/**
 * Enter the warrior then the wizard. `allow(card)` may refuse a card with a message
 * (set stories). `quick` = [{label, code}] shortcuts per role.
 */
export async function enterParty({ allow = () => null, quick = () => [] } = {}) {
  const heroes = [];
  for (const [i, role] of [[0, 'warrior'], [1, 'wizard']]) {
    showStats(cols[i], null);
    setInfo(i, null);
    setActive(i);
    for (;;) {
      const extras = quick(role).map((q) => ({ label: q.label, sub: q.sub, value: q.code }));
      const got = await askCard(`Hero ${i + 1}: insert a ${role} hero card`, extras);
      let card = got.card;
      if (got.panel) card = readCard(got.panel);
      const refused = allow(card, role);
      const res = refused ? { ok: false, reason: refused } : makeHero(card, role);
      if (!res.ok) {
        say(ERRORS[res.reason] ?? res.reason);
        play('error');
        await sleep(1400);
        continue;
      }
      heroes.push(res.hero);
      showStats(cols[i], heroStats(res.hero));
      setInfo(i, card, nameOf(card.code) || got.name);
      break;
    }
  }
  setActive(null);
  return createParty(heroes[0], heroes[1]);
}

/**
 * One fight against `enemy` (a fighter). Options:
 *   mode 'C1'|'C2'; escapeBefore: offer a one-try escape; escapeInBattle: offer escape in battle;
 *   itemAllowed(card) → refusal reason or null; onInfoCard(card) → {ok, text} (C1).
 * Returns { outcome: 'win'|'lost'|'escaped'|'fled', heroIndex, battle }.
 */
export async function fightOnce(party, enemy, { mode, escapeBefore = false, escapeInBattle = false, itemAllowed = () => null, onInfoCard = null, enemyLabel = 'Enemy' } = {}) {
  // Choose the hero.
  const living = party.heroes.map((h, i) => [h, i]).filter(([h]) => h.live);
  let heroIndex = living[0][1];
  showStats(cols[1], enemy);
  if (living.length > 1 || escapeBefore) {
    say(`${enemyLabel}: who fights?`);
    const options = living.map(([h, i]) => ({ label: heroName(h), sub: `${h.role} · HP ${h.cur.hp * 100}`, value: i }));
    if (escapeBefore) options.push({ label: 'Escape', sub: 'one try · 2 in 3', value: 'escape' });
    setPanel(options);
    for (;;) {
      const pick = await waitFor(['panel']);
      if (pick.value !== 'escape') { heroIndex = pick.value; break; }
      if (rng.int(3) >= 1) {
        setPanel([]);
        say('Escaped!');
        play('down');
        await sleep(900);
        return { outcome: 'fled', heroIndex };
      }
      say('Could not escape!');
      play('error');
      setPanel(options.filter((o) => o.value !== 'escape'));
    }
    setPanel([]);
  }
  const hero = party.heroes[heroIndex];
  showStats(cols[0], heroStats(hero));
  setInfo(0, hero.raw, heroName(hero));
  setActive(0);

  // Optional item card.
  let item = null;
  for (;;) {
    const got = await askCard(`${heroName(hero)}: item card (tip: weapons win fights), or fight`, [
      { label: 'Fight', sub: 'no item', value: 'go', primary: true },
    ]);
    if (got.panel) break;
    const card = got.card;
    let reason = itemAllowed(card) ?? checkItem(hero, card, { mode });
    if (!reason && card.kind === 'powerup' && (card.job === 5 || card.job === 6)) {
      const info = onInfoCard ? onInfoCard(card) : { ok: false, reason: 'info-card' };
      if (!info.ok) reason = info.reason;
      else {
        say(info.text);
        play('read');
        await sleep(2200);
      }
    }
    if (reason) {
      say(ERRORS[reason] ?? reason);
      play('error');
      await sleep(1400);
      continue;
    }
    item = card;
    setInfo(0, hero.raw, `${heroName(hero)} + ${got.name || card.code}`);
    break;
  }

  const fighter = heroFighter(hero, item, rng);
  const b = await runBattle(fighter, enemy, [false, true], { allowEscape: escapeInBattle });
  afterFight(hero, b.fighters[0]);
  enemy.hp = b.fighters[1].hp;
  if (b.escaped) return { outcome: 'escaped', heroIndex, battle: b };
  return { outcome: b.winner === 0 ? 'win' : 'lost', heroIndex, battle: b };
}

/** After a win: one heal allowed, plus mode-specific extras [{label, sub, value, once}]. Resolves when the player continues. */
export async function afterWin(party, heroIndex, extras = [], onExtra = async () => {}) {
  let healed = false;
  const used = new Set();
  for (;;) {
    showParty(party);
    const hero = party.heroes[heroIndex];
    const options = [{ label: 'Continue', value: 'go', primary: true }];
    if (!healed && hero.live) options.push({ label: 'Heal', sub: 'herbs or cure magic, once', value: 'heal' });
    for (const x of extras) if (!used.has(x.value)) options.push(x);
    setPanel(options);
    const pick = await waitFor(['panel']);
    setPanel([]);
    if (pick.value === 'go') return;
    if (pick.value === 'heal') {
      const c = hero.cur;
      const heals = [];
      for (let n = 1; n <= Math.min(3, c.pp); n++) heals.push({ label: `${n} herb${n > 1 ? 's' : ''}`, sub: `+${20 * n}%`, value: { type: 'herbs', n } });
      if (hero.raw.job > 6) {
        heals.push({ label: 'F3 Riimo', sub: '2 MP · +30%', value: { type: 'magic', spell: 3 }, disabled: c.mp < 2 });
        heals.push({ label: 'F4 Deriimo', sub: '4 MP · +50%', value: { type: 'magic', spell: 4 }, disabled: c.mp < 4 });
      }
      heals.push({ label: 'Back', value: null });
      say(`${heroName(hero)}: heal how?`);
      setPanel(heals);
      const h = await waitFor(['panel']);
      setPanel([]);
      if (!h.value) continue;
      const r = postFightHeal(hero, h.value);
      if (r.error) { say(ERRORS[r.error] ?? r.error); play('error'); }
      else { say(`+${r.heal * 100} HP`); play('heal'); healed = true; }
      await sleep(900);
      continue;
    }
    used.add(pick.value);
    await onExtra(pick.value);
  }
}

export const describeHero = (h) => `${RACE[h.raw.race]} · ${jobLabel(h.raw)}`;
