/** Deterministic RNG (Mulberry32). */
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher–Yates shuffle (no mutation). Optional seed for stable random pages. */
export function shuffle(arr, seed = (Math.random() * 1e9) | 0) {
  const a = arr.slice()
  const rand = rng(seed)
  for (let i = a.length - 1; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Shuffle then take `n` items. */
export function sample(arr, n, seed) {
  return shuffle(arr, seed).slice(0, Math.min(n, arr.length))
}
