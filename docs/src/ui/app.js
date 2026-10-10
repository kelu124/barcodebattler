// BarClode Battler — boot and mode selection. Shared helpers live in kit.js.

import {
  ui, say, setPanel, waitFor, enablePad, setActive, clearScreen, render,
  enterFighter, runBattle, loadNames, setBookSet,
} from './kit.js';
import { storyMode } from './story-ui.js';
import { enemyCardsMode, setStoryMenu } from './cards-ui.js';

// --- Modes -------------------------------------------------------------------------

async function versus(cpu) {
  ui.mode.textContent = cpu ? 'C0 VS CPU' : 'C0 2P';
  clearScreen();
  const f1 = await enterFighter(0);
  let fighters = [f1, await enterFighter(1, { cpu, against: f1 })];
  for (;;) {
    setActive(null);
    say('Ready? Press BATTLE');
    setPanel([{ label: 'Menu', value: 'menu' }]);
    enablePad({ battle: true });
    const go = await waitFor(['battle', 'panel']);
    enablePad();
    setPanel([]);
    if (go.kind === 'panel') return;

    await runBattle(fighters[0], fighters[1], [false, cpu]);
    setPanel([
      { label: 'Rematch', value: 'again', primary: true },
      { label: 'New cards', value: 'new' },
      { label: 'Menu', value: 'menu' },
    ]);
    const next = await waitFor(['panel']);
    setPanel([]);
    if (next.value === 'menu') return;
    if (next.value === 'new') {
      clearScreen();
      const n1 = await enterFighter(0);
      fighters = [n1, await enterFighter(1, { cpu, against: n1 })];
    }
    render({ fighters });
  }
}

async function mainMenu() {
  for (;;) {
    clearScreen();
    ui.mode.textContent = 'MENU';
    say('Select mode');
    setPanel([
      { label: 'VS CPU', sub: 'C0 · you against the machine', value: 'cpu', primary: true },
      { label: '2 PLAYERS', sub: 'C0 · same device', value: 'pvp' },
      { label: 'STORY', sub: 'C1 · the built-in quest', value: 'c1' },
      { label: 'ENEMY CARDS', sub: 'C2 · fight any card', value: 'c2' },
      { label: 'SET STORIES', sub: 'one official card set', value: 'sets' },
    ]);
    const ev = await waitFor(['panel']);
    setPanel([]);
    setBookSet('');
    if (ev.value === 'cpu' || ev.value === 'pvp') await versus(ev.value === 'cpu');
    else if (ev.value === 'c1') await storyMode();
    else if (ev.value === 'c2') await enemyCardsMode();
    else if (ev.value === 'sets') await setStoryMenu();
  }
}

// --- Boot ------------------------------------------------------------------------------

loadNames();
mainMenu();
