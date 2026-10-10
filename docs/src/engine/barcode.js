// Barcode parsing and validation (EAN-13 / EAN-8), as the Barcode Battler II reads them.
// Logic follows finalfighter/BarcodeBattler2-Simulator src/BarcodeRead.as:135-173 (MIT).

// Epoch's own boxes carry retail barcodes the device remaps to playable cards
// (gufranco/maeyomi decoder/decode.py:27-31).
const BOX_EXCEPTIONS = {
  '4905040352507': '0521501106508',
  '4905040352521': '0521501187507',
};

/** Check digit for the first 12 digits of an EAN-13 (string or digit array). */
export function checkDigit(first12) {
  const d = [...String(first12)].map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += i % 2 === 0 ? d[i] : 3 * d[i];
  return (10 - (sum % 10)) % 10;
}

/**
 * Parse user input into a barcode the device accepts.
 * Returns {ok:true, code, kind:'ean13'|'ean8', digits} or {ok:false, error:'digits'|'length'|'checksum'}.
 */
export function parseBarcode(input) {
  const raw = String(input).replace(/[\s-]/g, '');
  if (!/^\d+$/.test(raw)) return { ok: false, error: 'digits' };
  if (raw.length !== 13 && raw.length !== 8) return { ok: false, error: 'length' };
  const padded = raw.padStart(13, '0');
  if (checkDigit(padded.slice(0, 12)) !== Number(padded[12])) return { ok: false, error: 'checksum' };
  const code = BOX_EXCEPTIONS[raw] ?? raw;
  return {
    ok: true,
    code,
    kind: code.length === 13 ? 'ean13' : 'ean8',
    digits: [...code].map(Number),
  };
}
