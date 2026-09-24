import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';

/* Privacy accounting as moves on one curve.

   Noise sets the budget, the projection leaves it alone, the minibatch
   draw gives it back, composing the steps spends it again, and rebuilding
   the transcript is free. Under the Gaussian approximation every stage
   stays in the same family, so one number follows the whole chain:
       mu0 = 2C/(B sigma),  then q*mu0,  then sqrt(T tau)*q*mu0. */

const CW = 1060, CH = 348;
const NAVY = '#243B54', SLATE = '#8A9AA8';
const CURVE = '#0072B2', DOWN = '#B2182B', UP = '#009E73', SAME = '#8A9AA8';

const X0 = 84, Y0 = 26, SZ = 244;
const ax = (a) => X0 + SZ * a;
const ay = (b) => Y0 + SZ * (1 - b);

function erf(x) {
  const s = x < 0 ? -1 : 1, a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t
              - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}
const Phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
function Phinv(p) {
  let lo = -8, hi = 8;
  for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
const Gmu = (a, mu) => Phi(Phinv(1 - a) - mu);

export default function accounting(el) {
  const sc = makeScene(el, { width: CW, height: CH });
  const ticker = makeTicker();

  let mu0 = 1.4, q = 0.25, steps = 36;

  const muAt = (k) => {
    if (k <= 0) return 0;
    if (k <= 2) return mu0;
    if (k === 3) return q * mu0;
    return Math.sqrt(steps) * q * mu0;
  };

  const g = sc.g();
  const txt = (x, y, s, o = {}) => {
    const n = sc.node(g, 'text', {
      x, y, 'text-anchor': o.anchor ?? 'middle', 'font-size': o.size ?? 15,
      'font-weight': o.weight ?? 400, fill: o.fill ?? SLATE,
      'font-family': o.mono ? 'var(--mono)' : 'var(--sans)'
    });
    n.textContent = s;
    return n;
  };

  sc.node(g, 'rect', { x: X0, y: Y0, width: SZ, height: SZ,
                       fill: '#FBFCFD', stroke: '#C8D2DA', 'stroke-width': 1.2 });
  sc.node(g, 'line', { x1: ax(0), y1: ay(1), x2: ax(1), y2: ay(0),
                       stroke: '#9AA6B2', 'stroke-width': 1.2, 'stroke-dasharray': '6 5' });
  txt(X0 + SZ / 2, Y0 + SZ + 24, 'false alarm rate', { size: 14 });
  const yl = txt(X0 - 34, Y0 + SZ / 2, 'miss rate', { size: 14 });
  yl.setAttribute('transform', `rotate(-90 ${X0 - 34} ${Y0 + SZ / 2})`);

  const ghost = sc.node(g, 'path', { fill: 'none', stroke: CURVE, 'stroke-opacity': .22,
                                     'stroke-width': 1.6, 'stroke-dasharray': '5 4' });
  const curve = sc.node(g, 'path', { fill: 'none', stroke: CURVE, 'stroke-width': 3 });
  const labMu = txt(0, 0, '', { size: 16, fill: CURVE, weight: 650, mono: true });

  const path = (mu) => {
    let d = '';
    for (let i = 0; i <= 140; i++) {
      const a = i / 140;
      d += (i ? 'L' : 'M') + ax(a).toFixed(1) + ' ' + ay(Gmu(a, mu)).toFixed(1);
    }
    return d;
  };

  // ---- the chain of stages
  const RX = 400, ROW = 50;
  const STAGES = [
    { nm: 'noise',          fx: 'down', ds: 'sets the budget' },
    { nm: 'projection',     fx: 'same', ds: 'post-processing, free' },
    { nm: 'minibatch draw', fx: 'up',   ds: 'rarely seen, budget given back' },
    { nm: 'Tτ local steps', fx: 'down', ds: 'composition, budget spent' },
    { nm: 'transcript',     fx: 'same', ds: 'geometry and aggregation, free' }
  ];
  const rows = STAGES.map((s, k) => {
    const y = 42 + k * ROW;
    const box = sc.node(g, 'rect', { x: RX, y: y - 18, width: 560, height: 40, rx: 6,
                                     fill: '#F4F7F9', stroke: '#E1E7EC', 'stroke-width': 1,
                                     opacity: .35 });
    const nm = txt(RX + 18, y - 1, s.nm, { anchor: 'start', size: 18, fill: NAVY, weight: 650 });
    const ds = txt(RX + 18, y + 17, s.ds, { anchor: 'start', size: 14 });
    const col = s.fx === 'down' ? DOWN : s.fx === 'up' ? UP : SAME;
    const mark = txt(RX + 530, y + 6, s.fx === 'down' ? '↓' : s.fx === 'up' ? '↑' : '=',
                     { size: 24, fill: col, weight: 700 });
    const val = txt(RX + 470, y + 6, '', { anchor: 'end', size: 15, mono: true, fill: NAVY });
    return { box, nm, ds, mark, val };
  });

  const total = txt(RX + 18, CH - 24, '', { anchor: 'start', size: 19, fill: NAVY, weight: 650 });

  const sQ = sc.slider('q = B/m⋆', { min: 0.05, max: 0.6, step: 0.01, value: q },
                       (v) => { q = v; render(1); });
  const sT = sc.slider('Tτ', { min: 1, max: 200, step: 1, value: steps },
                       (v) => { steps = v; render(1); });

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    sQ.set(q.toFixed(2));
    sT.set(String(Math.round(steps)));

    const from = muAt(step - 1), to = muAt(step);
    const mu = from + (to - from) * (step === 0 ? 1 : t);

    curve.setAttribute('d', path(mu));
    ghost.setAttribute('d', path(from));
    ghost.setAttribute('opacity', step > 0 && t < 0.98 && from !== to ? 1 : 0);
    labMu.textContent = step === 0 ? 'nothing released yet' : `μ = ${mu.toFixed(2)}`;
    labMu.setAttribute('x', ax(0.52));
    labMu.setAttribute('y', ay(Gmu(0.52, mu)) - 14);

    rows.forEach((r, k) => {
      const on = step >= k + 1;
      r.box.setAttribute('opacity', on ? 1 : .3);
      r.nm.setAttribute('opacity', on ? 1 : .35);
      r.ds.setAttribute('opacity', on ? 1 : .35);
      r.mark.setAttribute('opacity', on ? 1 : .25);
      r.val.textContent = on ? `μ = ${muAt(k + 1).toFixed(2)}` : '';
    });

    total.textContent = step >= 5
      ? `μ_tot = √(Tτ)·q·μ₀ = 2C√(Tτ) / (m⋆ σ) = ${muAt(5).toFixed(2)}`
      : '';
  }

  sc.tool('reset', () => {
    q = 0.25; steps = 36;
    sQ.input.value = q; sT.input.value = steps; render(1);
  });

  const durations = [0, 1000, 700, 1000, 1100, 700];
  render(1);

  return {
    setStep(n) {
      if (n === step) return;
      const back = n < step;
      step = n;
      ticker.run(back ? 0 : durations[n] ?? 700, render, { instant: back });
    },
    activate() {}, deactivate() { ticker.stop(); }
  };
}