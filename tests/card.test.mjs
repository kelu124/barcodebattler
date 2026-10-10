import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readCard, readMode, RACE } from '../docs/src/engine/card.js';

const load = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url)));
const WIKI = load('wiki_cards.json').cards;
const CORPUS = load('simulator_corpus.json').barcodes;

test('readMode picks front or back read', () => {
  assert.equal(readMode('96385074'), 'back');            // EAN-8
  assert.equal(readMode('0401207336501'), 'front');      // d0=0, d7=3 fighter race
  assert.equal(readMode('4902102072618'), 'back');       // d0>=2, no marker
  assert.equal(readMode(withCheck('239012340500')), 'front');      // d2=9 && d9=5 enemy marker
});

test('readCard rejects an invalid barcode', () => {
  assert.throws(() => readCard('0401207336502'), /checksum/);
});

test('front-read fighter: starter card Rarman', () => {
  const c = readCard('0401207336501');
  assert.equal(c.readMode, 'front');
  assert.equal(c.kind, 'fighter');
  assert.deepEqual([c.hp, c.st, c.df, c.race, c.job, c.speed, c.special], [40, 12, 7, 3, 3, 6, 50]);
  assert.deepEqual([c.pp, c.mp], [5, 0]);
});

test('wizards (job 7-9) start with 10 MP, job 6 is a warrior', () => {
  assert.equal(readCard(withCheck('040120738650')).mp, 10);
  assert.equal(readCard(withCheck('040120736650')).mp, 0);
});

test('high-HP bonus: partner and hidden battle bonus (hardware-faithful)', () => {
  // HP 259 (enemy marker), mechanical, ST digits 14 (battle set) → shown 114, battle 214, DF +100
  const c = readCard(withCheck('259141000550'));
  assert.deepEqual([c.st, c.df, c.battleSt, c.battleDf], [114, 110, 214, 110]);
  // ST digits 13 (partner set) → DF gains, no hidden bonus
  const p = readCard(withCheck('259131000550'));
  assert.deepEqual([p.st, p.df, p.battleSt, p.battleDf], [113, 110, 113, 110]);
  // animal: lead is DF, partner set does not apply
  const a = readCard(withCheck('259101311550'));
  assert.deepEqual([a.st, a.df, a.battleSt, a.battleDf], [10, 113, 10, 113]);
  // aquatic: both +100
  const q = readCard(withCheck('259101021550'));
  assert.deepEqual([q.st, q.df], [110, 110]);
});

test(`every published card decodes to its published stats (${WIKI.length} cards)`, () => {
  assert.ok(WIKI.length >= 180);
  const failures = [];
  for (const w of WIKI) {
    const c = readCard(w.barcode);
    const st = c.kind === 'powerup' && c.pp ? c.pp : c.st;
    const df = c.kind === 'powerup' && c.mp ? c.mp : c.df;
    const got = [c.hp * 100, st * 100, df * 100, c.race, c.special];
    const want = [w.hp, w.st, w.df, w.race, w.special];
    if (w.job !== null) { got.push(c.job); want.push(w.job); }
    if (w.dx !== null && c.kind === 'fighter') { got.push(c.speed); want.push(w.dx); }
    if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(`${w.barcode} ${w.name}: got ${got} want ${want}`);
  }
  assert.deepEqual(failures, []);
});

test('every simulator corpus barcode decodes, covering both reads and every race', () => {
  const cards = CORPUS.map(readCard);
  assert.deepEqual(new Set(cards.map((c) => c.readMode)), new Set(['front', 'back']));
  assert.equal(new Set(cards.map((c) => c.race)).size, 10);
});

test('RACE names cover 0-9', () => {
  assert.equal(RACE.length, 10);
});

function withCheck(first12) {
  let s = 0;
  for (let i = 0; i < 12; i++) s += (i % 2 ? 3 : 1) * Number(first12[i]);
  return first12 + ((10 - (s % 10)) % 10);
}

test('every card in the built-in official list decodes', () => {
  const list = JSON.parse(readFileSync(new URL('../docs/data/cards.json', import.meta.url)));
  const failures = list.cards.filter(([code]) => { try { readCard(code); return false; } catch { return true; } });
  assert.ok(list.cards.length > 900);
  assert.deepEqual(failures, []);
});
