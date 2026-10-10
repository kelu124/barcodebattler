import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unionDigit, encodePasscode, decodePasscode, levelStats, calcHp } from '../docs/src/engine/passcode.js';

test('union digit: sum of the two heroes\' last digits, mod 10', () => {
  assert.equal(unionDigit('0401207336501', '0491406277149'), 0);
  assert.equal(unionDigit('96385074', '0401207336501'), 5); // EAN-8 uses its own last digit
});

test('passcodes round-trip and carry a check digit', () => {
  for (const ucd of [0, 3, 9]) {
    for (const n of [5, 10, 16, 31, 49, 99]) {
      const code = encodePasscode(n, ucd);
      assert.match(code, /^(\d)\1(\d)\2\d$/);
      assert.equal(decodePasscode(code, ucd), n);
    }
  }
  assert.equal(encodePasscode(31, 0), '33112'); // check = (0 + [0,0,1,1,2,..][(3+1)%10]) % 10
  assert.equal(decodePasscode('33115', 0), -1);
  assert.equal(decodePasscode('34112', 0), -1);
  assert.equal(decodePasscode('3311', 0), -1);
});

test('levelStats: worked example and identities', () => {
  const raw = { hp: 40, st: 12, df: 7 };
  assert.deepEqual(levelStats(raw, 10), { hp: 96, st: 27, df: 16 });
  assert.deepEqual(levelStats(raw, 0), raw);
  assert.deepEqual(levelStats(raw, 1), raw);
});

test('levelStats caps and table clamping', () => {
  const big = levelStats({ hp: 500, st: 150, df: 150 }, 99);
  assert.deepEqual([big.hp, big.st, big.df], [998, 199, 199]); // even k >= 90 loses 1 after the cap (simulator)
  const small = levelStats({ hp: 1, st: 1, df: 1 }, 99); // past the DF table: clamped, never 0
  assert.ok(small.df > 1 && small.st > 1);
});

test('calcHp subtracts the 655-wrap marker and the even-high-k quirk', () => {
  assert.equal(calcHp(50, 9), 50 + 45 + 20);
  assert.equal(calcHp(10, 91), Math.min(999, 10 + 91 + 45 * 46 - 3 * 655) - 1);
});
