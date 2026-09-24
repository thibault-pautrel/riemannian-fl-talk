import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';

/* Where mu comes from.

   The two clouds of the previous slide, projected on the line joining
   their centres, become two bells. Their separation measured in units
   of the noise is mu. */

const CW = 1060, CH = 330;
const NAVY = '#243B54', SLATE = '#8A9AA8';
const D_COL = '#0072B2', N_COL = '#B2182B';

const PX = 210, PY = 150, S = 96;
const MD = [-0.30, 0.10], MN = [0.42, 0.34];
const SD = 0.42;

export default function gdpLink(el) {
  const sc = makeScene(el, { width: CW, height: CH });
  const ticker = makeTicker();

  const P = (v) => ({ x: PX + S * v[0], y: PY - S * v[1] });
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

  const rings = (col) => [0.55, 1.0, 1.55].map((k) => sc.node(g, 'circle', {
    fill: col, 'fill-opacity': .10, stroke: col, 'stroke-opacity': .25,
    'stroke-width': 1, 'data-k': k }));
  const ringD = rings(D_COL), ringN = rings(N_COL);
  const qD = P(MD), qN = P(MN);
  ringD.forEach((c) => { c.setAttribute('cx', qD.x); c.setAttribute('cy', qD.y);
                         c.setAttribute('r', S * SD * +c.getAttribute('data-k')); });
  ringN.forEach((c) => { c.setAttribute('cx', qN.x); c.setAttribute('cy', qN.y);
                         c.setAttribute('r', S * SD * +c.getAttribute('data-k')); });
  sc.node(g, 'circle', { cx: qD.x, cy: qD.y, r: 4.5, fill: D_COL });
  sc.node(g, 'circle', { cx: qN.x, cy: qN.y, r: 4.5, fill: N_COL });
  txt(qD.x - 10, qD.y + 86, 'not used', { size: 14, fill: D_COL });
  txt(qN.x + 16, qN.y - 78, 'used', { size: 14, fill: N_COL });

  // the axis joining the two centres
  const dir = [qN.x - qD.x, qN.y - qD.y];
  const L = Math.hypot(dir[0], dir[1]);
  const u = [dir[0] / L, dir[1] / L];
  const axis = sc.node(g, 'line', {
    x1: qD.x - 70 * u[0], y1: qD.y - 70 * u[1],
    x2: qN.x + 70 * u[0], y2: qN.y + 70 * u[1],
    stroke: NAVY, 'stroke-width': 1.6, 'stroke-dasharray': '6 5', opacity: 0 });
  const drops = Array.from({ length: 10 }, () => sc.node(g, 'line', {
    stroke: NAVY, 'stroke-opacity': .3, 'stroke-width': 1,
    'stroke-dasharray': '3 3', opacity: 0 }));

  // ---- the two bells
  const BX = 560, BY = 236, BW = 330, AMP = 120;
  const SEP = 118;
  sc.node(g, 'line', { x1: BX - 20, y1: BY, x2: BX + BW + 20, y2: BY,
                       stroke: '#C8D2DA', 'stroke-width': 1.2 });
  const bell = (cx, col) => {
    let d = '';
    for (let i = 0; i <= 70; i++) {
      const t = -3.4 + 6.8 * i / 70;
      d += (i ? 'L' : 'M') + (cx + 34 * t).toFixed(1) + ' ' +
           (BY - AMP * Math.exp(-t * t / 2)).toFixed(1);
    }
    return sc.node(g, 'path', { d, fill: 'none', stroke: col, 'stroke-width': 2.4, opacity: 0 });
  };
  const c1 = BX + 96, c2 = c1 + SEP;
  const bellD = bell(c1, D_COL), bellN = bell(c2, N_COL);
  const sep = sc.node(g, 'line', { x1: c1, y1: BY - AMP - 16, x2: c2, y2: BY - AMP - 16,
                                   stroke: NAVY, 'stroke-width': 1.6, opacity: 0 });
  const tick = [c1, c2].map((x) => sc.node(g, 'line', {
    x1: x, y1: BY - AMP - 22, x2: x, y2: BY - AMP - 10,
    stroke: NAVY, 'stroke-width': 1.6, opacity: 0 }));
  const labMu = txt((c1 + c2) / 2, BY - AMP - 26, 'μ', { size: 19, fill: NAVY, weight: 650 });
  const labFor = txt(BX + BW / 2, BY + 30, '', { size: 17, fill: NAVY });
  const labVal = txt(BX + BW / 2, BY + 58, '', { size: 16, mono: true, fill: NAVY });
  [labMu, labFor, labVal].forEach((l) => l.setAttribute('opacity', 0));

  const arrow = sc.node(g, 'path', {
    d: `M${PX + 190} ${PY}H${BX - 60}`, stroke: SLATE, 'stroke-width': 1.6,
    fill: 'none', 'marker-end': sc.arrow('slate'), opacity: 0 });
  const labProj = txt((PX + 190 + BX - 60) / 2, PY - 16, 'project', { size: 14 });
  labProj.setAttribute('opacity', 0);

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;   // the axis
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;   // the bells
    const g3 = step === 3 ? t : 0;                  // mu

    axis.setAttribute('opacity', g1);
    drops.forEach((d, k) => {
      const s = -1.4 + 2.8 * k / 9;
      const from = { x: qD.x + (qN.x - qD.x) * 0.5 + 62 * s * -u[1],
                     y: qD.y + (qN.y - qD.y) * 0.5 + 62 * s * u[0] };
      const proj = { x: qD.x + (qN.x - qD.x) * 0.5, y: qD.y + (qN.y - qD.y) * 0.5 };
      d.setAttribute('x1', from.x); d.setAttribute('y1', from.y);
      d.setAttribute('x2', proj.x + 0.0); d.setAttribute('y2', proj.y + 0.0);
      d.setAttribute('opacity', g1 > .5 ? 0.6 : 0);
    });

    arrow.setAttribute('opacity', g2 > .1 ? 1 : 0);
    labProj.setAttribute('opacity', g2 > .3 ? 1 : 0);
    bellD.setAttribute('opacity', g2);
    bellN.setAttribute('opacity', g2);

    sep.setAttribute('opacity', g3);
    tick.forEach((n) => n.setAttribute('opacity', g3));
    labMu.setAttribute('opacity', g3 > .4 ? 1 : 0);
    labFor.textContent = g3 > .5 ? 'the gap, measured in units of noise' : '';
    labFor.setAttribute('opacity', g3 > .5 ? 1 : 0);
    labVal.textContent = g3 > .7 ? 'μ = 2C / (B σ)' : '';
    labVal.setAttribute('opacity', g3 > .7 ? 1 : 0);
  }

  const durations = [0, 800, 900, 900];
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