/**
 * Mulberry32 is a fast, 32-bit PRNG with good statistical properties.
 * It's perfect for a seedable RNG in a game prototype.
 */
export function createRNG(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
