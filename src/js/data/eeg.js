/* ============================================================
   Synthetic EEG, generated once from a fixed seed.

   Three latent sources are mixed into six channels, so the
   covariance has real structure: neighbouring electrodes share
   a source and correlate, distant ones do not.
   ============================================================ */

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// the six channels kept in the figures, positions in head units
/* Positions are in units of the scalp radius, so every electrode of the
   10-20 montage sits inside the disc. The beamer used a radius of 1.5,
   hence the division. */
const K = 1 / 1.62;
const at = (x, y) => [x * K, y * K];

export const CHANNELS = [
  { name: 'F7', color: '#6EAAE6', pos: at(-1.09,  0.79) },
  { name: 'Fz', color: '#468CD7', pos: at( 0.00,  0.70) },
  { name: 'C3', color: '#1E64B4', pos: at(-0.70,  0.00) },
  { name: 'C4', color: '#5A6EC8', pos: at( 0.70,  0.00) },
  { name: 'P3', color: '#8273CD', pos: at(-0.61, -0.68) },
  { name: 'O2', color: '#AA82D7', pos: at( 0.42, -1.28) }
];

export const GHOST = [
  at(-0.42, 1.28), at(0.42, 1.28), at(-0.61, 0.68), at(0.61, 0.68), at(1.09, 0.79),
  at(-1.35, 0), at(0, 0), at(1.35, 0), at(-1.09, -0.79), at(1.09, -0.79),
  at(0, -0.70), at(0.61, -0.68), at(-0.42, -1.28)
].map(([x, y]) => [x, y]);

// instantaneous activity of every channel, for the topographic map
export function activityAt(data, frac) {
  const t = Math.max(0, Math.min(data.T - 1, Math.round(frac * (data.T - 1))));
  return data.Xc.map((row) => row[t] / 3.2);
}

export function makeEEG({ T = 320, seed = 11 } = {}) {
  const r = mulberry32(seed);
  const C = CHANNELS.length;

  const source = () => {
    const comp = Array.from({ length: 5 }, () => ({ f: 2 + 13 * r(), ph: 6.2832 * r(), a: 0.5 + r() }));
    return (s) => comp.reduce((acc, c) => acc + c.a * Math.sin(6.2832 * c.f * s + c.ph), 0);
  };
  const src = [source(), source(), source()];

  // mixing: frontal pair, central pair, posterior pair
  const A = [
    [1.00, 0.18, 0.00],
    [0.88, 0.32, 0.10],
    [0.15, 1.00, 0.18],
    [0.10, 0.92, 0.28],
    [0.18, 0.22, 1.00],
    [0.00, 0.14, 0.88]
  ];

  const X = [];
  for (let i = 0; i < C; i++) {
    const noise = Array.from({ length: 6 }, () => ({ f: 20 + 45 * r(), ph: 6.2832 * r(), a: 0.30 * r() }));
    const row = new Float64Array(T);
    const drift = 0.8 * (r() - 0.5);           // a non-zero mean, removed later
    for (let t = 0; t < T; t++) {
      const s = t / T;
      let val = drift;
      for (let k = 0; k < 3; k++) val += A[i][k] * src[k](s);
      for (const n of noise) val += n.a * Math.sin(6.2832 * n.f * s + n.ph);
      row[t] = val;
    }
    X.push(row);
  }

  const mean = X.map((row) => { let s = 0; for (const x of row) s += x; return s / T; });
  const Xc = X.map((row, i) => Float64Array.from(row, (x) => x - mean[i]));

  const S = [];
  for (let i = 0; i < C; i++) {
    S.push([]);
    for (let j = 0; j < C; j++) {
      let s = 0;
      for (let t = 0; t < T; t++) s += Xc[i][t] * Xc[j][t];
      S[i][j] = s / (T - 1);
    }
  }
  const corr = S.map((row, i) => row.map((x, j) => x / Math.sqrt(S[i][i] * S[j][j])));

  // the running sum that defines Sigma_ij, for the accumulation animation
  const partial = (i, j, frac) => {
    const n = Math.max(1, Math.round(frac * T));
    let s = 0;
    for (let t = 0; t < n; t++) s += Xc[i][t] * Xc[j][t];
    return s / (T - 1);
  };

  return { T, C, X, Xc, mean, S, corr, partial };
}

// diverging scale, blue to red, for a value in [-1, 1]
const STOPS = [
  [-1.0, [33, 102, 172]], [-0.5, [146, 197, 222]], [0, [247, 247, 247]],
  [ 0.5, [244, 165, 130]], [ 1.0, [178,  24,  43]]
];
export function rdbu(x) {
  const v = Math.max(-1, Math.min(1, x));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [a, ca] = STOPS[i], [b, cb] = STOPS[i + 1];
    if (v <= b) {
      const f = (v - a) / (b - a);
      const c = ca.map((x0, k) => Math.round(x0 + f * (cb[k] - x0)));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }
  return 'rgb(178,24,43)';
}