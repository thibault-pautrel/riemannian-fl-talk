import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';
import { CURVES, CHANCE } from '../data/curves-bnci-eps20.js';

/* Learning curves on BNCI2014_001 at epsilon = 20, full participation.
   Step 1 draws the three SPDNet arms, step 2 adds EEGNet, step 3 adds
   PriRFed. Each curve is swept from the first round to the last. */

const NAVY = '#243B54', SLATE = '#8A9AA8', RULE = '#DCE3E8', CHANCE_COL = '#B2182B';
const GROUPS = { 1: ['ProjAvg', 'RLAvg', 'RetAvg'], 2: ['EEGNet'], 3: ['PriRFed'] };

export default function curvesBnci(el) {
  const W = 1180, H = 560;
  const sc = makeScene(el, { width: W, height: H });
  const ticker = makeTicker();

  const X0 = 96, X1 = W - 210, Y0 = 46, Y1 = H - 76;
  const XMAX = Math.max(...CURVES.map((c) => c.mean.at(-1)[0]));
  const YMIN = 20, YMAX = 60;
  const xOf = (r) => X0 + (X1 - X0) * (r - 1) / (XMAX - 1);
  const yOf = (v) => Y1 - (Y1 - Y0) * (v - YMIN) / (YMAX - YMIN);

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

  // grid
  for (let v = YMIN; v <= YMAX; v += 10) {
    sc.node(g, 'line', { x1: X0, y1: yOf(v), x2: X1, y2: yOf(v),
                         stroke: RULE, 'stroke-width': 1 });
    txt(X0 - 14, yOf(v) + 6, String(v), { anchor: 'end', size: 15, mono: true });
  }
  for (let r = 0; r <= XMAX; r += 50) {
    const x = xOf(Math.max(1, r));
    sc.node(g, 'line', { x1: x, y1: Y0, x2: x, y2: Y1, stroke: RULE, 'stroke-width': 1 });
    txt(x, Y1 + 28, String(r), { size: 15, mono: true });
  }
  sc.node(g, 'line', { x1: X0, y1: Y1, x2: X1, y2: Y1,
                       stroke: SLATE, 'stroke-opacity': .6, 'stroke-width': 1.4 });
  txt((X0 + X1) / 2, Y1 + 56, 'communication rounds', { size: 17, fill: NAVY });
  txt(X0 - 60, (Y0 + Y1) / 2, 'test accuracy (%)', { size: 17 })
    .setAttribute('transform', `rotate(-90 ${X0 - 60} ${(Y0 + Y1) / 2})`);

  // chance level
  sc.node(g, 'line', { x1: X0, y1: yOf(CHANCE), x2: X1, y2: yOf(CHANCE),
                       stroke: CHANCE_COL, 'stroke-width': 1.6, 'stroke-dasharray': '6 5' });
  txt(X0 + 8, yOf(CHANCE) - 9, `chance ${CHANCE.toFixed(1)}`,
      { anchor: 'start', size: 14, fill: CHANCE_COL });

  // one band and one line per arm, plus its label at the right end
  const arms = CURVES.map((c) => {
    const band = sc.node(g, 'path', { fill: c.color, 'fill-opacity': .14, stroke: 'none', opacity: 0 });
    const line = sc.node(g, 'path', { fill: 'none', stroke: c.color, 'stroke-width': 2.6,
                                      'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: 0 });
    const tag = txt(0, 0, c.name, { anchor: 'start', size: 17, weight: 600, fill: c.color });
    tag.setAttribute('opacity', 0);
    return { c, band, line, tag };
  });

  let step = 0, lastT = 1;

  // how far along its own x range an arm is drawn
  function progress(name) {
    for (const [s, names] of Object.entries(GROUPS)) {
      if (names.includes(name)) {
        const k = +s;
        return step > k ? 1 : step === k ? lastT : 0;
      }
    }
    return 0;
  }

  function render(t = lastT) {
    lastT = t;
    arms.forEach(({ c, band, line, tag }) => {
      const p = progress(c.name);
      if (p < 0.01) {
        band.setAttribute('opacity', 0);
        line.setAttribute('opacity', 0);
        tag.setAttribute('opacity', 0);
        return;
      }
      const n = Math.max(2, Math.round(p * c.mean.length));
      let d = '';
      for (let i = 0; i < n; i++) {
        d += (i ? 'L' : 'M') + xOf(c.mean[i][0]).toFixed(1) + ' ' + yOf(c.mean[i][1]).toFixed(1);
      }
      line.setAttribute('d', d);
      line.setAttribute('opacity', 1);

      let b = '';
      for (let i = 0; i < n; i++) {
        b += (i ? 'L' : 'M') + xOf(c.hi[i][0]).toFixed(1) + ' ' + yOf(c.hi[i][1]).toFixed(1);
      }
      for (let i = n - 1; i >= 0; i--) {
        b += 'L' + xOf(c.lo[i][0]).toFixed(1) + ' ' + yOf(c.lo[i][1]).toFixed(1);
      }
      band.setAttribute('d', b + 'Z');
      band.setAttribute('opacity', 1);

      const last = c.mean[n - 1];
      tag.setAttribute('x', xOf(last[0]) + 12);
      tag.setAttribute('y', yOf(last[1]) + 6);
      tag.setAttribute('opacity', p > 0.92 ? 1 : 0);
    });
  }

  const durations = [0, 1600, 1200, 1200];
  const ghost = el.classList.contains('ghost');
  render(1);
  if (ghost) { step = 3; render(1); }

  return {
    setStep(n) {
      if (ghost || n === step) return;
      const back = n < step;
      step = n;
      ticker.run(back ? 0 : durations[n] ?? 900, render, { instant: back });
    },
    activate() {}, deactivate() { ticker.stop(); }
  };
}
