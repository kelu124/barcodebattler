// The built-in official card list (docs/data/cards.json, imported from maeyomi).

import { readCard } from '../engine/card.js';

let book = null;
let sets = [];

export async function loadBook() {
  if (book) return book;
  const res = await fetch(new URL('../../data/cards.json', import.meta.url));
  const data = await res.json();
  sets = data.sets.map((st, i) => ({ index: i, ...st }));
  book = data.cards.map(([code, printed, set, en, nameSource]) => {
    const name = en ?? printed;
    const nameJp = name !== printed ? printed : null;
    let card = null;
    try { card = readCard(code); } catch { /* listed but unreadable */ }
    return { code, name, nameJp, nameSource, set: data.sets[set].en, setId: data.sets[set].id, card };
  }).filter((e) => e.card);
  return book;
}

/** The 24 official sets, in catalogue order: {index, id, en}. Call after loadBook(). */
export const bookSets = () => sets;

export function searchBook(entries, query, { kind = null, set = null } = {}) {
  const q = query.trim().toLowerCase();
  return entries.filter((e) =>
    (!kind || e.card.kind === kind) &&
    (!set || e.setId === set) &&
    (!q || e.code.includes(q) || e.name.toLowerCase().includes(q) || (e.nameJp ?? '').includes(query.trim()) || e.set.toLowerCase().includes(q)));
}
