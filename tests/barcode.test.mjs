import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkDigit, parseBarcode } from '../docs/src/engine/barcode.js';

test('checkDigit computes the EAN check digit', () => {
  assert.equal(checkDigit('040120733650'), 1); // BB2 starter card
  assert.equal(checkDigit('490504035250'), 7); // BB box
  assert.equal(checkDigit('000000000000'), 0);
});

test('parseBarcode accepts a valid EAN-13', () => {
  const r = parseBarcode('0401207336501');
  assert.equal(r.ok, true);
  assert.equal(r.kind, 'ean13');
  assert.deepEqual(r.digits, [0, 4, 0, 1, 2, 0, 7, 3, 3, 6, 5, 0, 1]);
  assert.equal(r.code, '0401207336501');
});

test('parseBarcode accepts a valid EAN-8 and checks it padded to 13', () => {
  const r = parseBarcode('96385074');
  assert.equal(r.ok, true);
  assert.equal(r.kind, 'ean8');
  assert.equal(r.digits.length, 8);
});

test('parseBarcode ignores spaces and dashes', () => {
  assert.equal(parseBarcode(' 0401207-336501 ').ok, true);
});

test('parseBarcode rejects a wrong check digit', () => {
  const r = parseBarcode('0401207336502');
  assert.equal(r.ok, false);
  assert.equal(r.error, 'checksum');
});

test('parseBarcode rejects UPC-A, other lengths and non-digits', () => {
  assert.equal(parseBarcode('036000291452').error, 'length');
  assert.equal(parseBarcode('123').error, 'length');
  assert.equal(parseBarcode('04012073365a1').error, 'digits');
});

test('parseBarcode applies the Epoch box exceptions', () => {
  assert.equal(parseBarcode('4905040352507').code, '0521501106508');
  assert.equal(parseBarcode('4905040352521').code, '0521501187507');
});
