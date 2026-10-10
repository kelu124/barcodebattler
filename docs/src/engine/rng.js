// Seeded pseudo-random generator (mulberry32) so battles are reproducible.
// The device used its own timer-based randomness; only the distribution matters.

export function createRng(seed = Date.now()) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** Integer in [0, n). */
    int: (n) => Math.floor(next() * n),
    /** Pick one element of an array. */
    pick: (xs) => xs[Math.floor(next() * xs.length)],
    coin: () => next() < 0.5,
  };
}
