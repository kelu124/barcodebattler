// LCD rendering: seven-segment numbers (inline SVG) with faint unlit segments.

const SEGMENTS = {
  a: [2, 0, 8, 2], b: [10, 2, 2, 7], c: [10, 11, 2, 7], d: [2, 18, 8, 2],
  e: [0, 11, 2, 7], f: [0, 2, 2, 7], g: [2, 9, 8, 2],
};
const GLYPHS = {
  0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc',
  7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '',
};

function digitSvg(ch) {
  const lit = GLYPHS[ch] ?? '';
  const rects = Object.entries(SEGMENTS).map(([k, [x, y, w, h]]) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.9" class="${lit.includes(k) ? 'on' : 'off'}"/>`).join('');
  return `<svg class="seg" viewBox="-1 -1 14 22" aria-hidden="true"><g transform="skewX(-6) translate(1.5 0)">${rects}</g></svg>`;
}

/** Render `value` right-aligned in `width` seven-segment digits into element `el`. */
export function setSeg(el, value, width = 5) {
  const text = value === null || value === undefined ? '' : String(value);
  const padded = text.slice(-width).padStart(width, ' ');
  if (el.dataset.v === padded) return;
  el.dataset.v = padded;
  el.innerHTML = [...padded].map(digitSvg).join('');
  el.setAttribute('aria-label', text.trim() || 'blank');
}

/** Show fighter or card stats (device units ×100) in a player column. */
export function showStats(col, s) {
  setSeg(col.hp, s ? s.hp * 100 : null);
  setSeg(col.st, s ? s.st * 100 : null);
  setSeg(col.df, s ? s.df * 100 : null);
  col.extra.textContent = s ? extraLine(s) : '';
}

function extraLine(s) {
  const parts = [];
  if (s.pp !== undefined) parts.push(`PP${String(s.pp).padStart(2, '0')}`);
  if (s.mp) parts.push(`MP${String(s.mp).padStart(2, '0')}`);
  if (s.speed !== null && s.speed !== undefined) parts.push(`DX${s.speed}`);
  return parts.join(' ');
}
