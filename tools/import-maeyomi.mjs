// Import the official Barcode Battler II card list from gufranco/maeyomi (MIT)
// into docs/data/cards.json. Re-run after updating projects/gufranco_maeyomi.
//
//   node tools/import-maeyomi.mjs [path/to/maeyomi/cards.json]
//
// Only sets maeyomi reads with the BB2 device are kept (see its
// src/maeyomi/official/catalogue.py: _DEVICES, _ENGLISH_TITLES). BB1-only sets,
// BB2 Double "7-read" sets and other barcode games are left out.

import { readFileSync, writeFileSync } from 'node:fs';
import { parseBarcode } from '../docs/src/engine/barcode.js';

const SRC = process.argv[2] ?? 'projects/gufranco_maeyomi/src/maeyomi/official/cards.json';
const OUT = 'docs/data/cards.json';
// Hand-maintained English names for Japanese card names: {jp: {en, source, basis}}.
const TRANSLATIONS = 'tools/data/name-translations.json';
const isJapanese = (s) => /[\u3040-\u30ff\u4e00-\u9fff\uff00-\uffef]/.test(s);
// Name source codes in the output: p = printed in English, o = official English name, i = interpreted.
const SOURCE_CODE = { official: 'o', interpreted: 'i' };

// Japanese wiki page name → [id, English title] (maeyomi's translations).
const BB2_SETS = {
  'バーコードバトラーⅡ カードリスト': ['bb2', 'Barcode Battler II'],
  'バーコードバトラーⅡ ボードゲーム付属カードリスト': ['board-game', 'Barcode Battler II board game'],
  '最強バトラー烈伝 カードリスト': ['strongest-battlers', 'Legends of the Strongest Battlers'],
  'コンビニ武闘伝第1弾 カードリスト': ['conveni-1', 'Convenience Store Fighters, series 1'],
  'コンビニ武闘伝第2弾 カードリスト': ['conveni-2', 'Convenience Store Fighters, series 2'],
  'バーコード皇帝からの挑戦状 カードリスト': ['barcode-emperor', 'A Challenge from the Barcode Emperor'],
  '外伝1 白魔術王ホカロンダーの陰謀 カードリスト': ['side-story-1', "Side Story 1: The White Sorcerer King's Plot"],
  '外伝2 古魔術王グロンサンダーの復讐 カードリスト': ['side-story-2', "Side Story 2: The Ancient Sorcerer King's Revenge"],
  '外伝3 最後の死闘！ＶＳ黒魔術王パノラマンダー カードリスト': ['side-story-3', 'Side Story 3: The Last Duel with the Black Sorcerer King'],
  '正伝1 超パワー生命体！ダークバーコード星人登場！！ カードリスト': ['main-story-1', 'Main Story 1: The Super-Powered Dark Barcode Aliens Arrive'],
  '正伝2 超合体伝説 カードリスト': ['main-story-2', 'Main Story 2: The Legend of Super Fusion'],
  '来襲！機械竜軍団！！ カードリスト': ['machine-dragons', 'The Machine Dragon Army Attacks'],
  'ゼルダの伝説 カードリスト': ['zelda', 'The Legend of Zelda'],
  '小学二年生 特製カードリスト': ['second-grade', 'Shogaku Ninensei special cards'],
  'ストリートファイターII カードリスト': ['street-fighter-2', 'Street Fighter II'],
  'ドラゴンスレイヤー英雄伝説 カードリスト': ['dragon-slayer', 'Dragon Slayer: The Legend of Heroes'],
  'ドラえもん のび太の恐竜 カードリスト': ['doraemon', "Doraemon: Nobita's Dinosaur"],
  '明治 フリーズランドの戦士達 カードリスト': ['meiji', 'Meiji: The Warriors of Freezeland'],
  'スーパーマリオワールド カードリスト': ['super-mario-world', 'Super Mario World'],
  'アーウィン版 バーコードバトラー カードリスト': ['irwin', 'Irwin Barcode Battler, United States and Canada'],
  'トミー版 バーコードバトラー カードリスト': ['tomy', 'Tomy Barcode Battler, United Kingdom, Ireland and Italy'],
  'トミー版 ドイツ バーコードバトラー カードリスト': ['tomy-de', 'Tomy Barcode Battler, Germany'],
  'トミー版 スペイン バーコードバトラー カードリスト': ['tomy-es', 'Tomy Barcode Battler, Spain'],
  'トミー版 フランス バーコードバトラー カードリスト': ['tomy-fr', 'Tomy Barcode Battler, France'],
};

const src = JSON.parse(readFileSync(SRC, 'utf8'));
const translations = JSON.parse(readFileSync(TRANSLATIONS, 'utf8'));
const untranslated = new Set();
const setIds = Object.values(BB2_SETS).map(([id, en]) => ({ id, en }));
const setIndex = Object.fromEntries(Object.values(BB2_SETS).map(([id], i) => [id, i]));

// German/Spanish/French Tomy releases print local names; their English name is
// the Tomy UK (else Irwin US) name of the same barcode.
const NON_ENGLISH_SETS = new Set(['tomy-de', 'tomy-es', 'tomy-fr']);
const englishByCode = new Map();
for (const setId of ['irwin', 'tomy']) {
  for (const entry of src.cards) {
    if (BB2_SETS[entry.set]?.[0] === setId) englishByCode.set(entry.barcode, entry.name);
  }
}

const cards = [];
const skipped = { otherDevice: 0, invalid: [] };
for (const entry of src.cards) {
  const set = BB2_SETS[entry.set];
  if (!set) { skipped.otherDevice++; continue; }
  // maeyomi's repair of a mistyped transcription takes precedence.
  const barcode = entry.correction?.barcode ?? entry.stand_in?.barcode ?? entry.barcode;
  const parsed = parseBarcode(barcode);
  if (!parsed.ok) { skipped.invalid.push(`${barcode} ${entry.name} (${parsed.error})`); continue; }
  let en = entry.name, code = 'p';
  if (NON_ENGLISH_SETS.has(set[0])) {
    en = englishByCode.get(barcode) ?? null;
    code = en ? 'o' : null;
    if (!en) untranslated.add(entry.name);
  } else if (isJapanese(entry.name)) {
    const t = translations[entry.name];
    if (t) [en, code] = [t.en, SOURCE_CODE[t.source] ?? 'i'];
    else { untranslated.add(entry.name); [en, code] = [null, null]; }
  }
  cards.push([barcode, entry.name, setIndex[set[0]], en, code]);
}

const out = {
  source: 'https://github.com/gufranco/maeyomi (src/maeyomi/official/cards.json), MIT — transcribed from wikiwiki.jp/barcode',
  fetched: src.fetched_utc,
  format: 'cards: [barcode, printed name, set index, English name, name source: p printed English | o official English | i interpreted]',
  sets: setIds,
  cards,
};
writeFileSync(OUT, JSON.stringify(out).replace(/\],\[/g, '],\n['));

console.log(`kept ${cards.length} cards in ${setIds.length} sets → ${OUT}`);
console.log(`skipped ${skipped.otherDevice} from non-BB2 sets, ${skipped.invalid.length} invalid:`);
for (const s of skipped.invalid) console.log('  ' + s);
if (untranslated.size) {
  console.log(`${untranslated.size} Japanese names without a translation in ${TRANSLATIONS}:`);
  for (const n of untranslated) console.log('  ' + n);
  process.exitCode = 1;
}
