// Seeded RNG (mulberry32) so ?shot= scenes and replays are deterministic.
// One job: every random choice in the game flows through this, never Math.random.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function range(rng, min, max) {
  return min + rng() * (max - min);
}

export function parseSeed(query) {
  const raw = Number(query.get('seed'));
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
}
