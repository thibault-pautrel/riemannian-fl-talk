export function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// a correlation matrix, symmetric and positive definite by construction
export function symMatrix(n, seed) {
  const r = rng(seed);
  const A = Array.from({ length: n }, () => Array.from({ length: n }, () => r() * 2 - 1));
  const M = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += A[i][k] * A[j][k];
      M[i][j] = s + (i === j ? 0.30 : 0);
    }
  return M.map((row, i) => row.map((x, j) => x / Math.sqrt(M[i][i] * M[j][j])));
}

// light to deep red, the data palette of the deck
export function red(v) {
  const t = Math.max(0, Math.min(1, (v + 1) / 2));
  const c = [253, 236, 232].map((a, k) => Math.round(a + t * ([178, 24, 43][k] - a)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}