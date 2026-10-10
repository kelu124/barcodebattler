// C1 — the built-in story: pick a world, meet its enemies, collect keys, beat the L-H boss.

import { createStory, openWorlds, drawEnemy, winFight, loseHero, storyPasscode, bonusEvent, useInfoCard, keysHeld, STAGES, WORLDS, ENEMY_IDS } from '../engine/story.js';
import { showStats } from './lcd.js';
import { play } from './sound.js';
import { ERRORS } from './labels.js';
import { ui, rng, sleep, say, setPanel, waitFor, askDigits, cols, clearScreen, setActive } from './kit.js';
import { enterParty, fightOnce, afterWin, showParty } from './party-ui.js';

const where = (story) => `${STAGES[story.stage]} · keys ${keysHeld(story)}/3`;

export async function storyMode() {
  ui.mode.textContent = 'C1 STORY';
  clearScreen();
  const party = await enterParty();
  const story = createStory(party);

  while (!story.over) {
    // World select.
    showParty(party);
    setActive(null);
    say(`${where(story)}: choose a world`);
    const worlds = openWorlds(story).map((w) => ({
      label: w.name, sub: `${w.enemies.length} enem${w.enemies.length > 1 ? 'ies' : 'y'}${w.name === 'L-H' ? ' · final boss' : ''}`, value: w.index,
      primary: w.name === 'L-H',
    }));
    const extra = story.stage === 0 ? [{ label: 'Passcode', sub: '3 digits', value: 'code' }] : [];
    setPanel([...worlds, ...extra, { label: 'Quit story', value: 'quit' }]);
    const pick = await waitFor(['panel']);
    setPanel([]);
    if (pick.value === 'quit') return;
    if (pick.value === 'code') {
      const code = await askDigits('Passcode: 3 digits, then READ', 3);
      if (code) {
        const r = storyPasscode(story, code);
        say(r.ok ? (r.type === 'jump' ? `Warp to ${STAGES[r.stage]}!` : 'Power up!') : ERRORS[r.reason]);
        play(r.ok ? 'magic' : 'error');
        await sleep(1300);
      }
      continue;
    }

    let enc = drawEnemy(story, pick.value, rng);
    let escapeTried = false;
    for (;;) {
      const id = `${WORLDS[enc.world]} ${ENEMY_IDS[enc.enemy]}`;
      say(`${id} appears!`);
      play('star');
      showStats(cols[1], enc.fighter);
      await sleep(1100);
      const res = await fightOnce(party, enc.fighter, {
        mode: 'C1', escapeBefore: !escapeTried, escapeInBattle: true, enemyLabel: id,
        onInfoCard: (card) => {
          const r = useInfoCard(story, card);
          if (!r.ok) return r;
          return { ok: true, text: `Info: a key is in ${r.world}${r.enemy ? `, enemy ${r.enemy}` : ''}` };
        },
      });
      escapeTried = true;
      if (res.outcome === 'fled') break;
      if (res.outcome === 'escaped') {
        enc = drawEnemy(story, enc.world, rng); // a new enemy of the same world
        escapeTried = false;
        continue;
      }
      if (res.outcome === 'win') {
        await celebrate(story, enc, res.heroIndex);
        break;
      }
      // Lost: the enemy keeps its remaining HP.
      enc.fighter.maxHp = enc.fighter.hp;
      const lost = loseHero(story, enc, res.heroIndex);
      if (lost.keyLost) { say('The enemy took a key!'); play('down'); await sleep(1300); }
      if (lost.gameOver) {
        say('Game over');
        play('lose');
        await sleep(1800);
        return endScreen();
      }
      showParty(party);
      say('Your partner can fight on');
      setPanel([{ label: 'Fight on', sub: 'same enemy', value: 'on', primary: true }, { label: 'Back to worlds', value: 'back' }]);
      const next = await waitFor(['panel']);
      setPanel([]);
      if (next.value === 'back') break;
    }
  }
}

async function celebrate(story, enc, heroIndex) {
  const r = winFight(story, enc, heroIndex);
  if (r.keyGained) { say(`Key found! ${keysHeld(story)}/3`); play('magic'); await sleep(1300); }
  if (r.unlockedLH) { say('All keys! L-H is open'); play('win'); await sleep(1500); }
  const rw = r.reward;
  const parts = [rw.hp && `HP +${rw.hp * 100}`, rw.st && `ST +${rw.st * 100}`, rw.df && `DF +${rw.df * 100}`, rw.pp && `PP +${rw.pp}`, rw.mp && `MP +${rw.mp}`].filter(Boolean);
  if (parts.length) { say(parts.join(' ')); play('heal'); await sleep(1400); }

  if (r.stageClear?.next) {
    say(`Stage cleared! Now ${STAGES[r.stageClear.stage]}`);
    play('win');
    await sleep(1800);
    say(`C2 passcode: ${r.stageClear.passcode}`);
    await sleep(2500);
    return;
  }
  if (r.stageClear?.fin) {
    say('FIN — the story is complete!');
    play('win');
    await sleep(2000);
    if (r.stageClear.code) say(`Secret passcode at E-1: ${r.stageClear.code}`);
    await sleep(3000);
    return endScreen();
  }

  const bonus = enc.enemy === 4 ? [] : [{ label: 'Bonus', sub: enc.enemy % 2 === 0 ? 'chance to revive' : 'chance of a hint', value: 'bonus' }];
  await afterWin(story.party, heroIndex, bonus, async () => {
    const b = bonusEvent(story, enc, heroIndex, rng);
    if (b.type === 'rebirth') { say('Your partner is revived!'); play('heal'); }
    else if (b.type === 'hint') { say(`Hint: a key is in ${b.world}${b.enemy ? `, enemy ${b.enemy}` : ''}`); play('read'); }
    else { say('Nothing happened'); play('miss'); }
    await sleep(1500);
  });
}

async function endScreen() {
  setPanel([{ label: 'Menu', value: 'menu', primary: true }]);
  await waitFor(['panel']);
  setPanel([]);
}
