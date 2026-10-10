// Passcodes ("aabbc") and the stat levels they encode.
// Ported from finalfighter/BarcodeBattler2-Simulator src/C2PassCode.as (MIT).
// See .claude/skills/bb-game-rules/modes.md.

const CHECK = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
const ST_TABLE = [0,0,0,0,0,1,1,1,2,3,4,4,5,6,7,9,10,11,12,14,16,17,19,21,23,25,27,29,31,33,36,38,40,43,46,49,51,54,57,60,64,67,70,73,77,81,84,88,92,96,100,104,108,112,116,121,125,129,134,139,144,148,153,158,163,169,174,179,184,190,196];
const DF_TABLE = [0,0,0,0,0,1,1,2,3,4,5,6,7,8,9,11,12,14,16,18,20,22,24,26,28,31,33,36,39,42,45,48,51,54,57,61,64,68,72,76,80,84,88,92,96,101,105,110,115,120,125,130,135,140,145,151,156,162,168,174,180,186,192,198];

/** Union check digit of the two hero cards: sum of their last digits mod 10. */
export function unionDigit(code1, code2) {
  return (Number(code1.at(-1)) + Number(code2.at(-1))) % 10;
}

export function encodePasscode(n, ucd) {
  const a = Math.floor(n / 10), b = n % 10;
  const c = (ucd + CHECK[(a + b) % 10]) % 10;
  return `${a}${a}${b}${b}${c}`;
}

/** Level number 0-99, or -1 if the code is not valid for these heroes. */
export function decodePasscode(code, ucd) {
  if (!/^\d{5}$/.test(code)) return -1;
  const p = [...code].map(Number);
  if (p[0] !== p[1] || p[2] !== p[3]) return -1;
  const n = p[0] * 10 + p[2];
  return encodePasscode(n, ucd) === code ? n : -1;
}

/** C2PassCode.calchp with level index k (= n - 1). */
export function calcHp(hp, k) {
  if (k < 0) return hp;
  let cnt = 0;
  let fh = Math.floor((hp * k) / 10);
  while (fh > 655) { cnt = 1; fh -= 655; }
  let fc = Math.floor(k / 2) * Math.ceil(k / 2);
  while (fc > 655) { cnt = 1; fc -= 655; }
  let r = hp + fh + fc;
  r = r > 999 ? 999 : r - cnt;
  if (k >= 90 && k % 2 === 0) r -= 1;
  return r;
}

// Past the end of a table the simulator yields 0; we keep the last value.
const at = (table, k) => table[Math.min(k, table.length - 1)];

/** Raw hero stats raised to passcode level n (0 or 1 = unchanged). */
export function levelStats(raw, n) {
  const k = n - 1;
  if (k < 0) return { hp: raw.hp, st: raw.st, df: raw.df };
  return {
    hp: calcHp(raw.hp, k),
    st: Math.min(199, raw.st + Math.floor((raw.st * k) / 9) + at(ST_TABLE, k)),
    df: Math.min(199, raw.df + Math.floor((raw.df * k) / 12) + at(DF_TABLE, k)),
  };
}
