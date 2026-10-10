// Retro beeps synthesised with WebAudio (no audio files shipped).

let ctx = null;
let muted = false;

export const setMuted = (m) => { muted = m; };
export const isMuted = () => muted;

function tone(freq, start, dur, type = 'square', gain = 0.06) {
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const SEQ = {
  key: [[1200, 0, 0.04]],
  read: [[880, 0, 0.06], [1320, 0.07, 0.08]],
  error: [[220, 0, 0.12], [180, 0.13, 0.18]],
  hit: [[520, 0, 0.05], [260, 0.05, 0.1]],
  critical: [[880, 0, 0.05], [440, 0.05, 0.05], [880, 0.1, 0.05], [220, 0.15, 0.15]],
  miss: [[300, 0, 0.08, 'triangle'], [250, 0.09, 0.08, 'triangle']],
  heal: [[660, 0, 0.07], [880, 0.08, 0.07], [1100, 0.16, 0.1]],
  magic: [[400, 0, 0.05], [600, 0.05, 0.05], [800, 0.1, 0.05], [1000, 0.15, 0.08]],
  down: [[600, 0, 0.08], [450, 0.09, 0.08], [300, 0.18, 0.12]],
  star: [[1000, 0, 0.03]],
  win: [[523, 0, 0.12], [659, 0.13, 0.12], [784, 0.26, 0.12], [1047, 0.39, 0.3]],
  lose: [[392, 0, 0.18], [330, 0.2, 0.18], [262, 0.4, 0.4]],
};

export function play(name) {
  if (muted) return;
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    for (const [f, s, d, type] of SEQ[name] ?? []) tone(f, s, d, type);
  } catch { /* audio unavailable */ }
}
