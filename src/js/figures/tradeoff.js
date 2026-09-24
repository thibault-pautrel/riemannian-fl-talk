import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';

/* The definition, on what is actually transmitted.

   A client submission is random, because the gradients behind it are.
   Substituting one record moves its law. E is any set of outcomes the
   server may test, and the definition compares the two chances of
   landing in it. */

const CW = 1060, CH = 300;
const NAVY = '#243B54', SLATE = '#8A9AA8';
const D_COL = '#0072B2', N_COL = '#B2182B', OK = '#009E73';

const PX = 250, PY = 150, S = 98;               // cloud panel
const MD = [-0.30, 0.10], MN = [0.42, 0.34];    // the two means
const SD0 = 0.42;

export default function tradeoff(el) {
  const sc = makeScene(el, { width: CW, height: CH });
  const ticker = makeTicker();

  let sigma = 1.0, eps = 1.0, delta = 0.05;
  let E = { x: 0.52, y: 0.42, r: 0.62 };
  const E0 = { ...E };

  const P = (v) => ({ x: PX + S * v[0], y: PY - S * v[1] });

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

  // ---- the two clouds, as contour rings
  const rings = (col) => [0.55, 1.0, 1.55].map((k) => sc.node(g, 'circle', {
    fill: col, 'fill-opacity': .10, stroke: col, 'stroke-opacity': .25,
    'stroke-width': 1, opacity: 0, 'data-k': k }));
  const ringD = rings(D_COL), ringN = rings(N_COL);
  const coreD = sc.node(g, 'circle', { r: 4.5, fill: D_COL, opacity: 0 });
  const coreN = sc.node(g, 'circle', { r: 4.5, fill: N_COL, opacity: 0 });

  const region = sc.node(g, 'circle', {
    fill: 'none', stroke: NAVY, 'stroke-width': 2, 'stroke-dasharray': '7 5',
    cursor: 'move', opacity: 0 });
  const labE = txt(0, 0, 'E', { size: 19, fill: NAVY, weight: 650 });
  const labD = txt(0, 0, 'record used', { size: 14, fill: D_COL });
  const labN = txt(0, 0, 'record replaced', { size: 14, fill: N_COL });

  // ---- the inequality, as two bars
  const BX = 560, BW = 230;
  const row = (y, label) => {
    txt(BX, y - 10, label, { anchor: 'start', size: 14, fill: NAVY });
    sc.node(g, 'rect', { x: BX, y, width: BW, height: 20, rx: 3,
                         fill: '#F2F5F7', stroke: '#DDE4EA', 'stroke-width': 1 });
  };
  row(86, 'Pr( Δ lands in E )   if used');
  row(150, 'e^ε × Pr( … )  + δ   if not');
  const barD = sc.node(g, 'rect', { x: BX, y: 86, height: 20, rx: 3, fill: D_COL, width: 0 });
  const barN = sc.node(g, 'rect', { x: BX, y: 150, height: 20, rx: 3, fill: N_COL,
                                    'fill-opacity': .55, width: 0 });
  const barE = sc.node(g, 'rect', { x: BX, y: 150, height: 20, rx: 3, fill: OK,
                                    'fill-opacity': .6, width: 0 });
  const vD = txt(0, 101, '', { anchor: 'start', size: 14, mono: true, fill: NAVY });
  const vN = txt(0, 165, '', { anchor: 'start', size: 14, mono: true, fill: NAVY });
  const verdict = txt(BX, 206, '', { anchor: 'start', size: 16, weight: 650 });
  const moral = txt(BX, 232, '', { anchor: 'start', size: 14 });

  const sS = sc.slider('noise', { min: 0.3, max: 3, step: 0.02, value: sigma },
                       (v) => { sigma = v; render(1); });
  const sE = sc.slider('ε', { min: 0.1, max: 3, step: 0.05, value: eps },
                       (v) => { eps = v; render(1); });
  const sD = sc.slider('δ', { min: 0, max: 0.3, step: 0.005, value: delta },
                       (v) => { delta = v; render(1); });

  // chance that a Gaussian cloud lands in the disc, by quadrature
  function mass(mean, sd) {
    const n = 46;
    let acc = 0;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const x = E.x + E.r * (2 * (i + 0.5) / n - 1);
        const y = E.y + E.r * (2 * (j + 0.5) / n - 1);
        if ((x - E.x) ** 2 + (y - E.y) ** 2 > E.r * E.r) continue;
        const d2 = (x - mean[0]) ** 2 + (y - mean[1]) ** 2;
        acc += Math.exp(-d2 / (2 * sd * sd)) / (6.2832 * sd * sd);
      }
    return acc * (2 * E.r / n) ** 2;
  }

  const toLocal = (e) => {
    const m = sc.svg.getScreenCTM();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [(p.x - PX) / S, (PY - p.y) / S];
  };
  let drag = false;
  sc.svg.addEventListener('pointerdown', (e) => {
    const p = toLocal(e);
    if (Math.hypot(p[0] - E.x, p[1] - E.y) < E.r + 0.3) {
      drag = true; sc.svg.setPointerCapture(e.pointerId);
    }
  });
  sc.svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = toLocal(e);
    E.x = p[0]; E.y = p[1];
    render(1);
  });
  const stop = () => { drag = false; };
  sc.svg.addEventListener('pointerup', stop);
  sc.svg.addEventListener('pointercancel', stop);

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;   // the second cloud
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;   // the set E
    const g3 = step === 3 ? t : 0;                  // the comparison

    sS.set(sigma.toFixed(2));
    sE.set(eps.toFixed(2));
    sD.set(delta.toFixed(3));

    const sd = SD0 * sigma;
    const qD = P(MD), qN = P(MN);
    ringD.forEach((c) => {
      c.setAttribute('cx', qD.x); c.setAttribute('cy', qD.y);
      c.setAttribute('r', S * sd * +c.getAttribute('data-k'));
      c.setAttribute('opacity', 1);
    });
    ringN.forEach((c) => {
      c.setAttribute('cx', qN.x); c.setAttribute('cy', qN.y);
      c.setAttribute('r', S * sd * +c.getAttribute('data-k'));
      c.setAttribute('opacity', g1);
    });
    coreD.setAttribute('cx', qD.x); coreD.setAttribute('cy', qD.y);
    coreD.setAttribute('opacity', 1);
    coreN.setAttribute('cx', qN.x); coreN.setAttribute('cy', qN.y);
    coreN.setAttribute('opacity', g1);
    labD.setAttribute('x', qD.x); labD.setAttribute('y', qD.y + S * sd * 1.55 + 18);
    labN.setAttribute('x', qN.x); labN.setAttribute('y', qN.y - S * sd * 1.55 - 10);
    labN.setAttribute('opacity', g1 > .5 ? 1 : 0);

    const qE = P([E.x, E.y]);
    region.setAttribute('cx', qE.x); region.setAttribute('cy', qE.y);
    region.setAttribute('r', S * E.r);
    region.setAttribute('opacity', g2);
    labE.setAttribute('x', qE.x); labE.setAttribute('y', qE.y - S * E.r - 10);
    labE.setAttribute('opacity', g2 > .5 ? 1 : 0);

    const pD = mass(MD, sd), pN = mass(MN, sd);
    const shown = Math.max(g2, g3);
    barD.setAttribute('width', BW * Math.min(1, pD) * shown);
    vD.setAttribute('x', BX + BW * Math.min(1, pD) * shown + 10);
    vD.textContent = shown > .5 ? pD.toFixed(2) : '';

    const scaled = Math.min(1, Math.exp(eps) * pN);
    const total = Math.min(1, scaled + delta);
    barN.setAttribute('width', BW * scaled * shown);
    barE.setAttribute('x', BX + BW * scaled * shown);
    barE.setAttribute('width', BW * (total - scaled) * shown * (g3 > .1 ? 1 : 0));
    vN.setAttribute('x', BX + BW * total * shown + 10);
    vN.textContent = shown > .5 ? total.toFixed(2) : '';

    const holds = pD <= total + 1e-9;
    verdict.textContent = g3 > .5 ? (holds ? 'holds here' : 'fails here') : '';
    verdict.setAttribute('fill', holds ? OK : N_COL);
    moral.textContent = g3 > .7 ? 'must hold for every E' : '';
  }

  sc.tool('reset', () => {
    E = { ...E0 }; sigma = 1.0; eps = 1.0; delta = 0.05;
    sS.input.value = sigma; sE.input.value = eps; sD.input.value = delta;
    render(1);
  });

  const durations = [0, 900, 800, 900];
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