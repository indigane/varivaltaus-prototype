/**
 * Mulberry32 is a fast, 32-bit PRNG with good statistical properties.
 * It's perfect for a seedable RNG in a game prototype.
 */
export function createRNG(seed) {
  seed = seed >>> 0;
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically derive an independent 32-bit seed from one or more numbers.
 * Useful for keeping board generation randomness separate from play randomness.
 */
export function mixSeeds(...values) {
  let h = 0x811c9dc5;
  for (const value of values) {
    let v = Number.isFinite(value) ? value >>> 0 : 0;
    h ^= v;
    h = Math.imul(h, 0x01000193) >>> 0;
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13;
  }
  return h >>> 0;
}
