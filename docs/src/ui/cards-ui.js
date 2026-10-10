// C2 — battles against enemy cards, free or as a set story (only that set's cards).

import { canPair } from '../engine/fuse.js';
import { makeHero, makeEnemy, applyC2Reward, applyLevel } from '../engine/party.js';
import { decodePasscode } from '../engine/passcode.js';
import { showStats } from './lcd.js';
import { play } from './sound.js';
import { ERRORS } from './labels.js';
import { loadBook, bookSets } from './cardbook.js';
import { ui, rng, sleep, say, setPanel, waitFor, askCard, askDigits, cols, clearScreen, setActive, setInfo, setBookSet, nameOf } from './kit.js';
import { enterParty, fightOnce, afterWin, showParty } from './party-ui.js';

/** Story sets offered in the menu: sets with at least one enemy. */
export async function storySets() {
  const book = await loadBook();
  return bookSets().map((st) => {
    const cards = book.filter((e) => e.setId === st.id);
    return { ...st, ...analyseSet(cards) };
  }).filter((s) => s.enemies.length);
}

function analyseSet(cards) {
  const heroes = { warrior: [], wizard: [] };
  for (const e of cards) {
    const designated = e.card.special === 18 || e.card.special === 50;
    for (const role of ['warrior', 'wizard']) if (designated && makeHero(e.card, role).ok) heroes[role].push(e);
  }
  const enemies = cards.filter((e) => e.card.kind === 'fighter' && !canPair(e.card) && e.card.special !== 18 && e.card.special !== 50);
  const codes = new Set(cards.map((e) => e.code));
  const ownHeroes = heroes.warrior.length > 0 && heroes.wizard.length > 0;
  return { heroes, enemies, codes, ownHeroes };
}

export async function setStoryMenu() {
  const sets = await storySets();
  say('Choose a card set');
  setPanel([...sets.map((s) => ({ label: s.en, sub: `${s.enemies.length} enemies${s.ownHeroes ? ' · own heroes' : ''}`, value: s.id })), { label: 'Back', value: null }]);
  const pick = await waitFor(['panel']);
  setPanel([]);
  if (pick.value) await enemyCardsMode({ set: sets.find((s) => s.id === pick.value) });
}

/** C2. `set` (from storySets) restricts heroes (if it has its own), items and enemies. */
export async function enemyCardsMode({ set = null } = {}) {
  ui.mode.textContent = set ? 'SET STORY' : 'C2 CARDS';
  clearScreen();
  setBookSet(set ? set.id : '');
  const inSet = (card) => !set || set.codes.has(card.code);

  const party = await enterParty(set?.ownHeroes ? {
    allow: (card, role) => (set.heroes[role].some((e) => e.code === card.code) ? null : 'not-set-hero'),
    quick: (role) => set.heroes[role].slice(0, 4).map((e) => ({ label: e.name, sub: 'hero of this set', code: e.code })),
  } : {});

  const remaining = set ? [...set.enemies] : null;
  let current = null; // {fighter, card, name} — kept when a hero falls

  for (;;) {
    if (set && !remaining.length) {
      say(`${set.en}: story cleared!`);
      play('win');
      await sleep(2000);
      return menuButton();
    }
    if (!current) {
      showParty(party);
      setActive(null);
      const left = set ? ` · ${remaining.length} left` : '';
      const extras = [
        ...(set ? [{ label: 'Next enemy', sub: 'random from the set', value: 'random', primary: true }] : []),
        { label: 'Passcode', sub: '5 digits', value: 'code' },
        { label: 'Quit', value: 'quit' },
      ];
      const got = await askCard(`Enemy card${left}: insert, or pick`, extras);
      if (got.panel === 'quit') return;
      if (got.panel === 'code') { await enterPasscode(party); continue; }
      let card, name;
      if (got.panel === 'random') {
        const e = rng.pick(remaining);
        [card, name] = [e.card, e.name];
      } else {
        [card, name] = [got.card, got.name || nameOf(got.card.code)];
      }
      if (set && !remaining.some((e) => e.code === card.code)) {
        say(set.codes.has(card.code) ? 'Already beaten (or not an enemy)' : ERRORS['not-in-set']);
        play('error');
        await sleep(1400);
        continue;
      }
      const res = makeEnemy(card);
      if (!res.ok) { say(ERRORS[res.reason] ?? res.reason); play('error'); await sleep(1400); continue; }
      current = { fighter: res.fighter, card, name };
      setInfo(1, card, name || card.code);
      showStats(cols[1], current.fighter);
      say(`${name || 'Enemy'} appears!`);
      play('star');
      await sleep(1100);
    }

    const res = await fightOnce(party, current.fighter, {
      mode: 'C2', enemyLabel: current.name || 'Enemy',
      itemAllowed: (card) => (inSet(card) ? null : 'not-in-set'),
    });
    if (res.outcome === 'win') {
      const r = applyC2Reward(party, current.card.special);
      say('Victory!');
      play('win');
      await sleep(1100);
      if (r.passcode) { say(`Passcode ${r.passcode} — level up!`); play('magic'); await sleep(2500); }
      if (set) remaining.splice(remaining.findIndex((e) => e.code === current.card.code), 1);
      current = null;
      await afterWin(party, res.heroIndex);
      continue;
    }
    // A hero fell: the enemy keeps its HP.
    current.fighter.maxHp = current.fighter.hp;
    if (party.heroes.every((h) => !h.live)) {
      say('Both heroes are down — game over');
      play('lose');
      await sleep(1800);
      return menuButton();
    }
    showParty(party);
    showStats(cols[1], current.fighter);
    say('Your partner can fight on');
    setPanel([{ label: 'Fight on', sub: 'same enemy', value: 'on', primary: true }, { label: 'Another enemy', value: 'new' }]);
    const next = await waitFor(['panel']);
    setPanel([]);
    if (next.value === 'new') current = null;
  }
}

async function enterPasscode(party) {
  const code = await askDigits('Passcode: 5 digits, then READ', 5);
  if (!code) return;
  const n = decodePasscode(code, party.ucd);
  if (n < 0) { say(ERRORS.invalid); play('error'); await sleep(1300); return; }
  applyLevel(party, n);
  showParty(party);
  say(`Level ${n}!`);
  play('magic');
  await sleep(1400);
}

async function menuButton() {
  setPanel([{ label: 'Menu', value: 'menu', primary: true }]);
  await waitFor(['panel']);
  setPanel([]);
}
