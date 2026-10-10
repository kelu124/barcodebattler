// The built-in official card list (docs/data/cards.json, imported from maeyomi).

import { readCard } from '../engine/card.js';

let book = null;

export async function loadBook() {
  if (book) return book;
  const res = await fetch(new URL('../../data/cards.json', import.meta.url));
  const data = await res.json();
  book = data.cards.map(([code, name, set]) => {
    let card = null;
    try { card = readCard(code); } catch { /* listed but unreadable */ }
    return { code, name, set: data.sets[set].en, card };
  }).filter((e) => e.card);
  return book;
}

export function searchBook(entries, query, { kind = null } = {}) {
  const q = query.trim().toLowerCase();
  return entries.filter((e) =>
    (!kind || e.card.kind === kind) &&
    (!q || e.code.includes(q) || e.name.toLowerCase().includes(q) || e.set.toLowerCase().includes(q)));
}
