// UI controller: screens are async functions awaiting player input.

import { readCard, RACE } from '../engine/card.js';
import { canPair, fuse } from '../engine/fuse.js';
import { createBattle, cpuAction, MAGIC } from '../engine/battle.js';
import { createRng } from '../engine/rng.js';
import { showStats } from './lcd.js';
import { play, setMuted, isMuted } from './sound.js';
import { loadSaved, saveCard, removeCard } from './store.js';
import { loadBook, searchBook } from './cardbook.js';
import { ERRORS, jobLabel, specialLabel } from './labels.js';

const $ = (s) => document.querySelector(s);
const DEBUG = new URLSearchParams(location.search).has('debug');
const rng = createRng(Date.now());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ui = {
  msg: $('#msg'), info: $('#info'), panel: $('#panel'), stars: [...$('#stars').children], mode: $('#mode-label'),
  slot: $('#slot'), code: $('#code'), read: $('#read'),
  openBook: $('#open-book'), openMine: $('#open-mine'), saveCard: $('#save-card'),
  battle: $('#btn-battle'), power: $('#btn-power'), select: $('#btn-select'), mute: $('#mute'),
  book: $('#book'), bookQ: $('#book-q'), bookKind: $('#book-kind'), bookList: $('#book-list'), bookCount: $('#book-count'),
  mine: $('#mine'), mineList: $('#mine-list'),
};
const cols = ['#p1', '#p2'].map((sel) => {
  const root = $(sel);
  const k = (n) => root.querySelector(`[data-k="${n}"]`);
  return { root, hp: k('hp'), st: k('st'), df: k('df'), extra: root.querySelector('.extra') };
});
const infoLines = ['', ''];
let names = new Map();          // barcode → official name
let lastRead = null;            // last card read into the slot, for "Save card"

// --- Input primitive ---------------------------------------------------------

let waiter = null;
function waitFor(kinds) {
  return new Promise((resolve) => { waiter = { kinds, resolve }; });
}
function emit(kind, value) {
  if (!waiter || !waiter.kinds.includes(kind)) return false;
  const w = waiter;
  waiter = null;
  w.resolve({ kind, value });
  return true;
}

// --- Small view helpers --------------------------------------------------------

const say = (text) => { ui.msg.textContent = text; };

function setPanel(buttons = []) {
  ui.panel.replaceChildren(...buttons.map((b) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.textContent = b.label;
    if (b.sub) {
      const s = document.createElement('small');
      s.textContent = b.sub;
      el.append(s);
    }
    if (b.primary) el.classList.add('primary');
    el.disabled = !!b.disabled;
    el.addEventListener('click', () => { play('key'); emit('panel', b.value); });
    return el;
  }));
}

function enableSlot(on) {
  for (const el of [ui.code, ui.read, ui.openBook, ui.openMine]) el.disabled = !on;
  if (on) ui.code.value = '';
}

function enablePad({ battle = false, power = false, select = false } = {}) {
  ui.battle.disabled = !battle;
  ui.power.disabled = !power;
  ui.select.disabled = !select;
  for (const b of [ui.battle, ui.power, ui.select]) b.classList.toggle('ready', !b.disabled);
}

function setInfo(p, card, name) {
  if (card === null) infoLines[p] = '';
  else {
    const what = [RACE[card.race], jobLabel(card), card.special ? specialLabel(card.special) : '']
      .filter(Boolean).join(' · ');
    infoLines[p] = { name: name || card.code, what };
  }
  ui.info.replaceChildren(...infoLines.map((l, i) => {
    const div = document.createElement('div');
    if (!l) return div;
    const b = document.createElement('b');
    b.textContent = `${i + 1}P `;
    const n = document.createElement('span');
    n.className = 'jp';
    n.textContent = l.name;
    div.append(b, n, document.createTextNode(` — ${l.what}`));
    return div;
  }));
}

function setActive(p) {
  cols.forEach((c, i) => c.root.classList.toggle('active', i === p));
}

function setStar(star) {
  ui.stars.forEach((s, i) => { s.className = i === star ? 'on' : ''; });
}

async function flash(p) {
  cols[p].root.classList.remove('flash');
  void cols[p].root.offsetWidth;
  cols[p].root.classList.add('flash');
}

function clearScreen() {
  cols.forEach((c) => showStats(c, null));
  setInfo(0, null);
  setInfo(1, null);
  setStar(null);
  setActive(null);
}

// --- Card input ----------------------------------------------------------------

ui.slot.addEventListener('submit', (e) => {
  e.preventDefault();
  submitCode(ui.code.value, null);
});

function submitCode(raw, name) {
  let card;
  try {
    card = readCard(raw);
  } catch (err) {
    const reason = /\((\w+)\)/.exec(err.message)?.[1];
    say(ERRORS[reason] ?? 'Cannot read that.');
    play('error');
    return;
  }
  lastRead = { code: card.code, name: name ?? names.get(card.code) ?? '' };
  ui.saveCard.disabled = false;
  ui.code.value = '';
  play('read');
  emit('card', { card, name: lastRead.name });
}

/** Ask for one card. Resolves {card, name} or {panel: value}. */
async function askCard(prompt, extras = []) {
  say(prompt);
  setPanel(extras);
  enableSlot(true);
  ui.code.focus({ preventScroll: true });
  const ev = await waitFor(['card', 'panel']);
  enableSlot(false);
  setPanel([]);
  return ev.kind === 'panel' ? { panel: ev.value } : ev.value;
}

/** A random official fighter of roughly the player's strength. */
async function randomFighter(against) {
  const book = await loadBook();
  const fighters = book.filter((e) => e.card.kind === 'fighter' && !canPair(e.card));
  if (!against) return rng.pick(fighters);
  const power = (f) => f.hp + 2 * (f.st + f.df);
  const target = power(against);
  const close = fighters.filter((e) => Math.abs(power(e.card) - target) <= target * 0.25);
  if (close.length >= 5) return rng.pick(close);
  const nearest = [...fighters].sort((a, b) => Math.abs(power(a.card) - target) - Math.abs(power(b.card) - target));
  return rng.pick(nearest.slice(0, 10));
}

/** Build player p's fighter from one or two cards. */
async function enterFighter(p, { cpu = false, against = null } = {}) {
  showStats(cols[p], null);
  setInfo(p, null);
  setActive(p);
  for (;;) {
    const first = await askCard(`${p + 1}P: insert card 1`, cpu ? [{ label: 'Random enemy', sub: 'an official card of similar strength', value: 'random' }] : []);
    let card1, name1;
    if (first.panel === 'random') {
      const e = await randomFighter(against);
      [card1, name1] = [e.card, e.name];
      lastRead = { code: e.code, name: e.name };
      ui.saveCard.disabled = false;
      play('read');
    } else {
      [card1, name1] = [first.card, first.name];
    }
    showStats(cols[p], card1);
    setInfo(p, card1, name1);
    const bad = canPair(card1);
    if (bad) {
      say(ERRORS[bad]);
      play('error');
      await sleep(1400);
      continue;
    }
    if (cpu && first.panel === 'random') return fuse(card1, null, { rng }).fighter;

    for (;;) {
      const second = await askCard(`${p + 1}P: card 2 (item or fighter), or fight`, [
        { label: 'Fight', sub: 'with one card', value: 'go', primary: true },
        { label: 'Change card 1', value: 'back' },
      ]);
      if (second.panel === 'back') break;
      const res = fuse(card1, second.card ?? null, { rng });
      if (!res.ok) {
        say(ERRORS[res.reason]);
        play('error');
        await sleep(1400);
        continue;
      }
      showStats(cols[p], res.fighter);
      if (second.card) {
        setInfo(p, card1, `${name1 || card1.code} + ${second.name || second.card.code}`);
        await sleep(700);
      }
      return res.fighter;
    }
  }
}

// --- Battle ----------------------------------------------------------------------

async function chooseAction(b) {
  const me = b.fighters[b.turn];
  const herbs = me.pp > 0 && !me.herbsBlocked;
  const wizard = me.job > 6;
  for (;;) {
    say(`${b.turn + 1}P: battle, power or select`);
    enablePad({ battle: true, power: herbs, select: herbs || wizard });
    const ev = await waitFor(['battle', 'power', 'select']);
    enablePad();
    if (ev.kind === 'battle') return { type: 'attack' };
    if (ev.kind === 'power') return { type: 'herb' };

    const options = [];
    if (herbs) {
      for (let n = 1; n <= Math.min(3, me.pp); n++) {
        options.push({ label: `${n} herb${n > 1 ? 's' : ''}`, sub: `heal ${20 * n}%`, value: { type: 'herbs', n } });
      }
    }
    if (wizard) {
      MAGIC.forEach((m, i) => options.push({
        label: `F${i} ${m.name}`, sub: `${m.mp} MP · ${m.effect}`, value: { type: 'magic', spell: i }, disabled: me.mp < m.mp,
      }));
    }
    options.push({ label: 'Back', value: null });
    say(`${b.turn + 1}P: select`);
    setPanel(options);
    const pick = await waitFor(['panel']);
    setPanel([]);
    if (pick.value) return pick.value;
  }
}

function render(b) {
  b.fighters.forEach((f, i) => showStats(cols[i], f));
}

async function showAttack(b, ev, label) {
  const p = ev.by, q = 1 - ev.by;
  say(`${p + 1}P ${label}!`);
  play('key');
  await sleep(550);
  if (!ev.hit) {
    say('Miss!');
    play('miss');
    await sleep(800);
    return;
  }
  say(`${ev.critical ? 'Critical! ' : ''}${ev.damage * 100} damage`);
  play(ev.critical ? 'critical' : 'hit');
  flash(q);
  await sleep(900);
  render(b);
  if (ev.broke.weapon) { say(`${p + 1}P weapon broke`); play('down'); await sleep(900); }
  if (ev.broke.armour) { say(`${q + 1}P armour broke`); play('down'); await sleep(900); }
}

async function animate(b, ev) {
  const p = ev.by;
  if (ev.type === 'attack') return showAttack(b, ev, 'attacks');
  if (ev.type === 'herb') {
    say(`${p + 1}P herb${ev.n > 1 ? ` ×${ev.n}` : ''}: +${ev.heal * 100} HP`);
    play('heal');
  } else if (ev.type === 'escape') {
    say(ev.ok ? 'Escaped!' : 'Could not escape');
    play(ev.ok ? 'down' : 'error');
  } else if (ev.type === 'magic') {
    say(`${p + 1}P casts ${ev.name}!`);
    play('magic');
    await sleep(700);
    if (ev.spell === 1 || ev.spell === 2) return showAttack(b, ev, ev.name);
    if (ev.spell === 0) say(`Stole ${ev.mp} MP`);
    else if (ev.spell <= 4) say(`+${ev.heal * 100} HP`);
    else if (ev.spell <= 8) say(`${ev.stat.toUpperCase()} ${ev.amount > 0 ? '+' : ''}${ev.amount * 100}`);
    else say(`${2 - p}P herbs sealed`);
  }
  await sleep(900);
  render(b);
}

async function starRoulette(star) {
  say('Guardian star…');
  for (let i = 0; i < 12; i++) {
    setStar(i % 3);
    play('star');
    await sleep(110 + i * 12);
  }
  setStar(star);
  play('read');
  await sleep(700);
}

async function runBattle(f1, f2, cpu) {
  const b = createBattle(f1, f2, { rng });
  render(b);
  await starRoulette(b.star);
  const downs = b.log[0].specials;
  for (const i of [0, 1]) {
    const d = downs[i];
    const what = [d.hp && 'HP', d.st && 'ST', d.df && 'DF'].filter(Boolean);
    if (what.length) {
      say(`${i + 1}P ${what.join('/')} down!`);
      play('down');
      render(b);
      await sleep(1100);
    }
  }
  say(`${b.turn + 1}P goes first`);
  setActive(b.turn);
  await sleep(1000);

  while (!b.over) {
    render(b);
    setActive(b.turn);
    let action;
    if (cpu[b.turn]) {
      say(`${b.turn + 1}P is thinking…`);
      await sleep(700);
      action = cpuAction(b, b.turn, rng);
    } else {
      action = await chooseAction(b);
    }
    const ev = b.act(action);
    if (DEBUG) console.log('[bb]', JSON.stringify(ev), JSON.stringify(b.fighters.map((f) => f.hp)));
    if (ev.error) {
      say(ERRORS[ev.error] ?? ev.error);
      play('error');
      await sleep(1000);
      continue;
    }
    await animate(b, ev);
  }
  render(b);
  setActive(null);
  if (b.winner === null) {
    say('Battle over');
  } else {
    say(`${b.winner + 1}P wins!`);
    play(cpu[b.winner] ? 'lose' : 'win');
  }
  return b;
}

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
      { label: 'STORY', sub: 'C1 · coming soon', value: 'c1', disabled: true },
      { label: 'ENEMY CARDS', sub: 'C2 · coming soon', value: 'c2', disabled: true },
    ]);
    const ev = await waitFor(['panel']);
    setPanel([]);
    if (ev.value === 'cpu' || ev.value === 'pvp') await versus(ev.value === 'cpu');
  }
}

// --- Hardware buttons, keyboard, sound -----------------------------------------------

for (const [el, kind] of [[ui.battle, 'battle'], [ui.power, 'power'], [ui.select, 'select']]) {
  el.addEventListener('click', () => { play('key'); emit(kind); });
}
document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
  const kind = { b: 'battle', p: 'power', s: 'select' }[e.key.toLowerCase()];
  const btn = kind && ui[kind];
  if (btn && !btn.disabled) { play('key'); emit(kind); }
});
ui.mute.addEventListener('click', () => {
  setMuted(!isMuted());
  ui.mute.setAttribute('aria-pressed', String(isMuted()));
});

// --- Card book & saved cards -----------------------------------------------------------

let bookKind = '';

function cardRow(entry, { onPick, onDelete }) {
  const li = document.createElement('li');
  const pick = document.createElement('button');
  pick.type = 'button';
  pick.className = 'pick';
  const n = document.createElement('span');
  n.className = 'name';
  n.textContent = entry.name || entry.code;
  const m = document.createElement('span');
  m.className = 'meta';
  const c = entry.card;
  const stats = c ? `${RACE[c.race]} · ${c.hp * 100}/${c.st * 100}/${c.df * 100}` : '';
  m.textContent = [entry.code, entry.set, stats].filter(Boolean).join(' · ');
  pick.append(n, m);
  pick.addEventListener('click', () => onPick(entry));
  li.append(pick);
  if (onDelete) {
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.textContent = 'Remove';
    del.addEventListener('click', () => onDelete(entry));
    li.append(del);
  }
  return li;
}

const pickFromSheet = (sheet) => (entry) => {
  sheet.close();
  submitCode(entry.code, entry.name);
};

async function renderBook() {
  const all = await loadBook();
  const found = searchBook(all, ui.bookQ.value, { kind: bookKind || null });
  const shown = found.slice(0, 150);
  ui.bookCount.textContent = `${found.length} of ${all.length} official cards${found.length > shown.length ? ' — refine to see more' : ''}. Names as printed (mostly Japanese).`;
  ui.bookList.replaceChildren(...shown.map((e) => cardRow(e, { onPick: pickFromSheet(ui.book) })));
}

ui.openBook.addEventListener('click', () => {
  ui.book.showModal();
  renderBook();
});
ui.bookQ.addEventListener('input', renderBook);
ui.bookKind.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  bookKind = btn.dataset.kind;
  for (const b of ui.bookKind.children) b.classList.toggle('on', b === btn);
  renderBook();
});

function renderMine() {
  const saved = loadSaved();
  if (!saved.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No saved cards yet. Read a card, then press “Save card”.';
    ui.mineList.replaceChildren(li);
    return;
  }
  ui.mineList.replaceChildren(...saved.map((s) => {
    let card = null;
    try { card = readCard(s.code); } catch { /* stored before a rule change */ }
    return cardRow({ ...s, card }, {
      onPick: pickFromSheet(ui.mine),
      onDelete: (e) => { removeCard(e.code); renderMine(); },
    });
  }));
}

ui.openMine.addEventListener('click', () => {
  renderMine();
  ui.mine.showModal();
});
ui.saveCard.addEventListener('click', () => {
  if (!lastRead) return;
  const ok = saveCard(lastRead.code, lastRead.name);
  say(ok ? 'Card saved' : 'Could not save (storage blocked)');
  play(ok ? 'read' : 'error');
});

// --- Boot ------------------------------------------------------------------------------

loadBook().then((book) => { names = new Map(book.map((e) => [e.code, e.name])); }).catch(() => {});
mainMenu();
