/**
 * Seeded gaussian noise for the flow-matching sampler.
 *
 * Ported from next-editor's `src/studio/tts/pocket/noise.ts` (Apache-2.0,
 * originally KevinAHM/pocket-tts-web@d0c0c79b7712256a32d691c67f20b8ae2e020d00).
 *
 * The upstream demo draws from Math.random(), making every synthesis unique.
 * Course narration must be reproducible from (text, seed), and pocket-tts
 * noise also shifts voice timbre — so a lesson has to hold one seed constant
 * across every line or the speaker audibly drifts between segments.
 */

/** mulberry32 — the same uniform stream next-editor's cadence.ts uses. */
export function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller over the seeded uniform stream. */
export function createSeededGaussian(seed) {
  const uniform = createSeededRandom(seed);
  return {
    next() {
      let u = 0;
      let v = 0;
      while (u === 0) u = uniform();
      while (v === 0) v = uniform();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    },
  };
}

export function narrationNoiseSeed(baseSeed) {
  return baseSeed >>> 0;
}
