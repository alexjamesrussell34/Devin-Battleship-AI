/** Seedable PRNG (mulberry32) so games and tests are reproducible. */
export interface Rng {
  next(): number
  int(maxExclusive: number): number
  pick<T>(items: readonly T[]): T
}

export function createRng(seed: number = Date.now()): Rng {
  let state = seed >>> 0
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (maxExclusive: number): number => Math.floor(next() * maxExclusive)
  return {
    next,
    int,
    pick: <T,>(items: readonly T[]): T => items[int(items.length)],
  }
}
