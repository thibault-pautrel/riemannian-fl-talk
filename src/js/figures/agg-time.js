import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';

/* Aggregation time per round, log scale. Three datasets, three methods,
   full and half client participation. Median with its interval. */

const NAVY = '#243B54', SLATE = '#8A9AA8', RULE = '#DCE3E8';
const OURS = '#6B3FA0', OURS2 = '#9166C4', RET = '#0072B2';

const METHODS = [
  { name: 'ProjAvg', color: OURS,  shape: 'circle' },
  { name: 'RLAvg',   color: OURS2, shape: 'square' },
  { name: 'RetAvg',  color: RET,   shape: 'triangle' }
];

// milliseconds per round: median, low and high end of the interval
const TIMES = {
  BNCI2014_001: {
    ProjAvg: { full: [0.42, 0.32, 0.56], half: [0.31, 0.27, 0.38] },
    RLAvg:   { full: [0.80, 0.55, 1.03], half: [0.60, 0.51, 0.72] },
    RetAvg:  { full: [4.65, 3.00, 5.65], half: [2.49, 2.10, 2.89] }
  },
  Weibo2014: {
    ProjAvg: { full: [0.92, 0.73, 1.25], half: [0.55, 0.39, 0.65] },
    RLAvg:   { full: [1.56, 1.10, 2.16], half: [1.09, 0.95, 1.25] },
    RetAvg:  { full: [10.81, 9.49, 11.98], half: [6.00, 5.29, 6.82] }
  },
  Cho2017: {
    ProjAvg: { full: [1.79, 1.48, 2.12], half: [1.07, 0.70, 1.23] },
    RLAvg:   { full: [4.41, 3.74, 5.13], half: [1.89, 1.45, 2.45] },
    RetAvg:  { full: [24.18, 21.40, 28.35], half: [11.83, 9.25, 14.34] }
  }
};

const ORDER = ['BNCI2014_001', 'Weibo2014', 'Cho2017'];
const TICKS = [0.3, 0.5, 1, 2, 5, 10, 20, 30];

export default function aggTime(el) {
  const W = 1220, H = 470;
  const sc = makeScene(el, { width: W, height: H });
  const ticker = makeTicker();

  const X0 = 210, X1 = W - 40, Y0 = 92, Y1 = H - 66;
  const LO = 0.25, HI = 32;
  const xOf = (ms) => X0 + (X1 - X0) *
    (Math.log10(ms) - Math.log10(LO)) / (Math.log10(HI) - Math.log10(LO));

  const g = sc.g();
  const txt = (x, y, s, o = {}) => {
    const n = sc.node(g, 'text', {
      x, y, 'text-anchor': o.anchor ?? 'middle', 'font-size': o.size ?? 16,
      'font-weight': o.weight ?? 400, fill: o.fill ?? SLATE,
      'font-family': o.mono ? 'var(--mono)' : 'var(--sans)'
    });
    n.textContent = s;
    return n;
  };

  TICKS.forEach((v) => {
    sc.node(g, 'line', { x1: xOf(v), y1: Y0 - 16, x2: xOf(v), y2: Y1,
                         stroke: RULE, 'stroke-width': 1, 'stroke-dasharray': '4 4' });
    txt(xOf(v), Y1 + 26, String(v), { size: 15, mono: true });
  });
  sc.node(g, 'line', { x1: X0, y1: Y1, x2: X1, y2: Y1,
                       stroke: SLATE, 'stroke-opacity': .6, 'stroke-width': 1.4 });
  txt((X0 + X1) / 2, Y1 + 54, 'aggregation time per round (ms, log scale)',
      { size: 17, fill: NAVY });

  // marker of one method, filled for full participation, hollow for half
  function marker(x, y, m, full) {
    const fill = full ? m.color : '#ffffff';
    if (m.shape === 'circle') {
      return sc.node(g, 'circle', { cx: x, cy: y, r: 6, fill,
                                    stroke: m.color, 'stroke-width': 1.8 });
    }
    if (m.shape === 'square') {
      return sc.node(g, 'rect', { x: x - 5.5, y: y - 5.5, width: 11, height: 11, fill,
                                  stroke: m.color, 'stroke-width': 1.8 });
    }
    return sc.node(g, 'path', {
      d: `M${x} ${y - 7}L${x + 6.4} ${y + 5}L${x - 6.4} ${y + 5}Z`,
      fill, stroke: m.color, 'stroke-width': 1.8
    });
  }

  // legend: the three methods, then the participation convention
  METHODS.forEach((m, i) => {
    const x = X0 + i * 190;
    marker(x, 40, m, true);
    marker(x + 22, 40, m, false);
    txt(x + 36, 46, m.name, { anchor: 'start', size: 17, fill: NAVY });
  });
  txt(X0 + 3 * 190 + 10, 46, 'filled: full participation · hollow: half',
      { anchor: 'start', size: 15 });

  const rowH = (Y1 - Y0) / ORDER.length;
  const rows = [];

  ORDER.forEach((ds, k) => {
    const cy = Y0 + rowH * (k + 0.5);
    txt(X0 - 24, cy + 6, ds, { anchor: 'end', size: 19, weight: 650, fill: NAVY });
    if (k > 0) {
      sc.node(g, 'line', { x1: X0, y1: Y0 + rowH * k, x2: X1, y2: Y0 + rowH * k,
                           stroke: RULE, 'stroke-width': 1 });
    }
    ['full', 'half'].forEach((part, p) => {
      const y = cy + (p === 0 ? -17 : 17);
      METHODS.forEach((m) => {
        const [med, lo, hi] = TIMES[ds][m.name][part];
        const bar = sc.node(g, 'path', {
          d: `M${xOf(lo)} ${y}H${xOf(hi)}M${xOf(lo)} ${y - 6}V${y + 6}` +
             `M${xOf(hi)} ${y - 6}V${y + 6}`,
          fill: 'none', stroke: m.color, 'stroke-opacity': .7, 'stroke-width': 1.6, opacity: 0
        });
        const dot = marker(xOf(med), y, m, part === 'full');
        dot.setAttribute('opacity', 0);
        const lab = txt(xOf(med), y - 13, med.toFixed(2), { size: 14, fill: NAVY, mono: true });
        lab.setAttribute('opacity', 0);
        rows.push({ bar, dot, lab, k });
      });
    });
  });

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    rows.forEach((r) => {
      // one dataset per step, all three at step 3 and beyond
      const g1 = step > r.k + 1 ? 1 : step === r.k + 1 ? t : 0;
      r.bar.setAttribute('opacity', g1);
      r.dot.setAttribute('opacity', g1);
      r.lab.setAttribute('opacity', g1 > 0.9 ? 1 : 0);
    });
  }

  const durations = [0, 800, 800, 800];
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
