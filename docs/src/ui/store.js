// Saved cards (barcode + optional name) in this browser only. No images, no progress:
// story progress uses the original passcodes.

const KEY = 'bb2.savedCards';

export function loadSaved() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((c) => typeof c?.code === 'string') : [];
  } catch {
    return [];
  }
}

function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; }
}

export function saveCard(code, name = '') {
  const list = loadSaved().filter((c) => c.code !== code);
  list.unshift({ code, name: name.slice(0, 40) });
  return write(list.slice(0, 200));
}

export function removeCard(code) {
  return write(loadSaved().filter((c) => c.code !== code));
}
