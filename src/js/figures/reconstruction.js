import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';
import { rng, symMatrix, red } from '../data/matrices.js';
import { rdbu } from '../data/eeg.js';

/* Reconstruction from a submission.
   The map record -> submission is known to the server, since it knows the
   model, theta_t and the protocol. So it can search for the record whose
   submission matches the one observed. The optimisation below is really
   run at mount time and replayed, not faked. */

const CW = 1180, CH = 560;
const K = 6, N = 21, MM = 40;          // 6x6 record, its vech, submission size
const NAVY = '#243B54', SLATE = '#8A9AA8', RED = '#B2182B', GREEN = '#009E73';

const IU = [];
for (let a = 0; a < K; a++) for (let b = a; b < K; b++) IU.push([a, b]);
const unvech = (z) => {
  const M = Array.from({ length: K }, () => new Array(K).fill(0));
  IU.forEach(([a, b], k) => { M[a][b] = z[k]; M[b][a] = z[k]; });
  return M;
};
const gauss = (r) => {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v);
};

export default function reconstruction(el) {
  const sc = makeScene(el, { width: CW, height: CH });
  const ticker = makeTicker();

  let seed = 21;
  let Z = [], DTRUE = [], FRAMES = [], LOSS = [], SUBS = [];

  function solve() {
    const r = rng(seed);
    const C = symMatrix(K, seed * 3 + 5);
    Z = IU.map(([a, b]) => C[a][b]);

    const A = Array.from({ length: MM }, () => Array.from({ length: N }, () => gauss(r) / Math.sqrt(N)));
    const fwd = (z) => A.map((row) => Math.tanh(row.reduce((s, a, j) => s + a * z[j], 0)));
    DTRUE = fwd(Z);

    // plain gradient descent on || tanh(A zhat) - Delta ||^2
    let zh = Array.from({ length: N }, () => 0.5 * gauss(r));
    FRAMES = []; LOSS = []; SUBS = [];
    for (let k = 0; k <= 400; k++) {
      const t = fwd(zh);
      const res = t.map((x, i) => x - DTRUE[i]);
      if (k % 4 === 0) {
        FRAMES.push(zh.slice());
        SUBS.push(t.slice());
        LOSS.push(res.reduce((s, x) => s + x * x, 0));
      }
      const g = new Array(N).fill(0);
      for (let i = 0; i < MM; i++) {
        const c = 2 * res[i] * (1 - t[i] * t[i]);
        for (let j = 0; j < N; j++) g[j] += c * A[i][j];
      }
      zh = zh.map((x, j) => x - 0.2 * g[j]);
    }
  }
  solve();

  const txt = (parent, x, y, s, o = {}) => {
    const n = sc.node(parent, 'text', {
      x, y, 'text-anchor': o.anchor ?? 'middle', 'font-size': o.size ?? 17,
      'font-weight': o.weight ?? 400, fill: o.fill ?? SLATE,
      'font-family': o.mono ? 'var(--mono)' : 'var(--sans)'
    });
    n.textContent = s;
    return n;
  };

  // a K x K record, drawn as a block of cells
  function matrix(parent, x, y, size) {
    const cs = size / K, cells = [];
    for (let a = 0; a < K; a++)
      for (let b = 0; b < K; b++)
        cells.push(sc.node(parent, 'rect', { x: x + b * cs, y: y + a * cs,
                                             width: cs + 0.4, height: cs + 0.4, fill: '#fff' }));
    const box = sc.node(parent, 'rect', { x, y, width: size, height: size,
                                          fill: 'none', stroke: '#9A3D42', 'stroke-width': 1.5 });
    return {
      box,
      set(z, op = 1) {
        const M = unvech(z);
        cells.forEach((c, k) => {
          c.setAttribute('fill', red(M[Math.floor(k / K)][k % K]));
          c.setAttribute('opacity', op);
        });
      }
    };
  }

  // a submission, drawn as a grid of signed cells
  function submission(parent, x, y, cell = 26) {
    const cols = 8, cells = [];
    for (let k = 0; k < MM; k++)
      cells.push(sc.node(parent, 'rect', {
        x: x + (k % cols) * cell, y: y + Math.floor(k / cols) * cell,
        width: cell + 0.4, height: cell + 0.4, fill: '#fff'
      }));
    sc.node(parent, 'rect', { x, y, width: cols * cell, height: (MM / cols) * cell,
                              fill: 'none', stroke: SLATE, 'stroke-width': 1.4 });
    return { set(v, op = 1) { cells.forEach((c, k) => {
      c.setAttribute('fill', rdbu(v[k])); c.setAttribute('opacity', op); }); } };
  }

  const gL = sc.g(), gM = sc.g(), gR = sc.g();

  // ---- left, the client
  sc.node(gL, 'rect', { x: 40, y: 92, width: 250, height: 300, rx: 8,
                        fill: '#FBFCFD', stroke: SLATE, 'stroke-opacity': .45, 'stroke-width': 1.4 });
  txt(gL, 165, 78, 'client $i$'.replace('$i$', 'i'), { size: 18, fill: NAVY, weight: 600 });
  const recTrue = matrix(gL, 90, 126, 150);
  txt(gL, 165, 306, 'one record', { size: 16 });
  txt(gL, 165, 330, 'never leaves the client', { size: 14 });
  const lock = txt(gL, 165, 368, 'private', { size: 15, fill: GREEN, mono: true });

  const arrow = (parent, d, o = {}) => sc.node(parent, 'path', {
    d, stroke: o.stroke ?? NAVY, 'stroke-width': o.w ?? 1.6, fill: 'none',
    'marker-end': sc.arrow(o.m ?? 'navy'), opacity: o.opacity ?? 1,
    'stroke-dasharray': o.dash ?? 'none'
  });
  const sendArrow = arrow(gM, 'M300 232H352', { opacity: 0 });

  // ---- middle, what the server observes
  const obs = submission(gM, 364, 168);
  const obsTitle = txt(gM, 468, 150, 'Δ⁽ⁱ⁾ observed by the server', { size: 16, fill: NAVY });
  txt(gM, 468, 330, 'θₜ and the protocol', { size: 15, mono: true });
  txt(gM, 468, 352, 'are known too', { size: 15 });

  // ---- right, the search
  sc.node(gR, 'rect', { x: 618, y: 92, width: 522, height: 380, rx: 8,
                        fill: '#FDF6F6', stroke: RED, 'stroke-opacity': .3, 'stroke-width': 1.4 });
  txt(gR, 879, 78, 'the server searches for a matching record', { size: 18, fill: RED, weight: 600 });
  const recGuess = matrix(gR, 652, 126, 150);
  txt(gR, 727, 300, 'candidate record', { size: 15 });
  const guessArrow = arrow(gR, 'M812 200H858', { opacity: 0 });
  const cand = submission(gR, 870, 140, 24);
  txt(gR, 966, 126, 'its submission', { size: 15 });

  // loss curve
  const PX = 660, PY = 336, PW = 440, PH = 104;
  sc.node(gR, 'line', { x1: PX, y1: PY + PH, x2: PX + PW, y2: PY + PH, stroke: '#C8D2DA', 'stroke-width': 1 });
  sc.node(gR, 'line', { x1: PX, y1: PY, x2: PX, y2: PY + PH, stroke: '#C8D2DA', 'stroke-width': 1 });
  const curve = sc.node(gR, 'path', { fill: 'none', stroke: RED, 'stroke-width': 2.4,
                                      'stroke-linecap': 'round', opacity: 0 });
  const head = sc.node(gR, 'circle', { r: 5, fill: RED, opacity: 0 });
  txt(gR, PX + PW / 2, PY + PH + 28, 'distance between the two submissions', { size: 15 });
  txt(gR, PX - 10, PY + 6, 'log', { anchor: 'end', size: 13 });

  const match = arrow(sc.svg, 'M652 200H300', { stroke: GREEN, m: 'navy', dash: '7 6', opacity: 0 });
  const verdict = txt(sc.svg, CW / 2, CH - 22, '', { size: 19, fill: RED, weight: 600 });

  const LMAX = () => Math.log10(Math.max(LOSS[0], 1e-12));
  const LMIN = () => Math.log10(Math.max(LOSS[LOSS.length - 1], 1e-12));

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;   // the submission is sent
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;   // a first guess
    const g3 = step > 3 ? 1 : step === 3 ? t : 0;   // the search
    const g4 = step === 4 ? t : 0;                  // the verdict

    recTrue.set(Z, 1);
    lock.setAttribute('opacity', g3 > 0.8 ? 0.3 : 1);

    sendArrow.setAttribute('opacity', g1 > .05 ? 1 : 0);
    obs.set(DTRUE, g1);
    obsTitle.setAttribute('opacity', g1 > .5 ? 1 : 0);

    const nf = FRAMES.length - 1;
    const idx = g3 > 0.001 ? Math.round(g3 * nf) : 0;
    const shown = g2 > 0.02 || g3 > 0.001;

    recGuess.set(FRAMES[idx], shown ? Math.min(1, g2 * 2 + g3) : 0);
    recGuess.box.setAttribute('opacity', shown ? 1 : 0);
    guessArrow.setAttribute('opacity', shown ? 1 : 0);
    cand.set(SUBS[idx], shown ? Math.min(1, g2 * 2 + g3) : 0);

    if (g3 > 0.001) {
      const lo = LMIN(), hi = LMAX(), span = Math.max(1e-9, hi - lo);
      let d = '';
      for (let k = 0; k <= idx; k++) {
        const x = PX + PW * k / nf;
        const y = PY + PH * (1 - (Math.log10(Math.max(LOSS[k], 1e-12)) - lo) / span);
        d += (k ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      curve.setAttribute('d', d); curve.setAttribute('opacity', 1);
      const hx = PX + PW * idx / nf;
      const hy = PY + PH * (1 - (Math.log10(Math.max(LOSS[idx], 1e-12)) - lo) / span);
      head.setAttribute('cx', hx); head.setAttribute('cy', hy); head.setAttribute('opacity', 1);
    } else {
      curve.setAttribute('opacity', 0); head.setAttribute('opacity', 0);
    }

    match.setAttribute('opacity', g4 > .3 ? 1 : 0);
    verdict.textContent = g4 > .5 ? 'the record is recovered, and it never left the client' : '';
  }

  sc.tool('new record', () => { seed = (seed * 37 + 11) % 9973; solve(); render(1); });

  const durations = [0, 800, 700, 3000, 900];
  render(1);

  return {
    setStep(n) {
      if (n === step) return;
      const back = n < step;
      step = n;
      ticker.run(back ? 0 : durations[n] ?? 600, render, { instant: back });
    },
    activate() {}, deactivate() { ticker.stop(); }
  };
}