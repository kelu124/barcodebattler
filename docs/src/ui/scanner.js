// Camera barcode scanning. Uses the browser's BarcodeDetector when it supports
// EAN, else loads ZXing on first use (pinned version + integrity hash).
// We manage the camera stream ourselves; library helpers that wait for the
// video 'playing' event can miss it on fast cameras.

const ZXING_URL = 'https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js';
const ZXING_SRI = 'sha384-BzBxP10ZE72aitqj5UMmUsbKFliP/DZqA8Wq+BNNhlIJDGoEd1tpkMYXOg9+n6sB';
const FRAME_MS = 200;
const CONFIRMATIONS = 2; // same code on consecutive reads, to avoid misreads

let stream = null;
let timer = null;

export const cameraAvailable = () => !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;

async function nativeDetector() {
  if (!('BarcodeDetector' in window)) return null;
  try {
    const formats = await window.BarcodeDetector.getSupportedFormats();
    if (!formats.includes('ean_13')) return null;
    const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8'].filter((f) => formats.includes(f)) });
    return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
  } catch {
    return null;
  }
}

let zxingPromise = null;
function loadZxing() {
  zxingPromise ??= new Promise((resolve, reject) => {
    if (window.ZXing) return resolve(window.ZXing);
    const s = document.createElement('script');
    s.src = ZXING_URL;
    s.integrity = ZXING_SRI;
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve(window.ZXing);
    s.onerror = () => { zxingPromise = null; reject(new Error('Could not load the scanner library')); };
    document.head.append(s);
  });
  return zxingPromise;
}

async function zxingDetector() {
  const ZXing = await loadZxing();
  const hints = new Map([[ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8]]]);
  const reader = new ZXing.MultiFormatReader();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  // Grab the frame ourselves: the library's element helpers wait for load/playing
  // events that may already have fired, and then never resolve.
  return async (video) => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (!canvas.width) return null;
    ctx.drawImage(video, 0, 0);
    try {
      const bitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(new ZXing.HTMLCanvasElementLuminanceSource(canvas)));
      return reader.decode(bitmap, hints).getText();
    } catch {
      return null; // no code in this frame
    }
  };
}

/**
 * Start scanning into `video`. Calls onCode(digits) once a code is read
 * CONFIRMATIONS times in a row, then stops. Rejects on camera/library errors.
 */
export async function startScanner(video, onCode) {
  stopScanner();
  const detect = (await nativeDetector()) ?? (await zxingDetector());
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
    audio: false,
  });
  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  try { await video.play(); } catch { /* some browsers reject play() yet keep playing */ }

  let last = null, count = 0, busy = false;
  timer = setInterval(async () => {
    if (busy || video.readyState < video.HAVE_CURRENT_DATA) return;
    busy = true;
    try {
      const code = await detect(video);
      if (code && code === last) count++;
      else [last, count] = [code, code ? 1 : 0];
      if (count >= CONFIRMATIONS) {
        stopScanner();
        onCode(code);
      }
    } finally {
      busy = false;
    }
  }, FRAME_MS);
}

export function stopScanner() {
  clearInterval(timer);
  timer = null;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}
