import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';

/* (eps, delta)-DP, read straight off the formula.

   Two neighbouring databases give two laws for the released quantity.
   Draw the blue one, then e^eps times the red one. Wherever blue pokes
   above, the bound by e^eps alone fails, and the area of that excess
   is exactly delta. */

const CW = 1060, CH = 330;
const NAVY = '#243B54', SLATE = '#8A9AA8';
const D_COL = '#0072B2', N_COL = '#B2182B', EXC = '#E69F00';

export default function tradeoff(el) {
  const sc = makeScene(el, { width: CW, height: CH });
  const ticker = makeTicker();

  let sigma = 0.8, eps = 1.0;
  const SENS = 1;                                    // one record moves it by this much

  const LX = 70, LW = 920, LY = 232, LH = 178;
  const T0 = -3.4, T1 = 4.6;
  const tx = (t) => LX + LW * (t - T0) / (T1 - T0);
  const ty = (d) => LY - LH * d / 0.62;

  const pdf = (t, m) => Math.exp(-((t - m) ** 2) / (2 * sigma * sigma))
                      / (sigma * Math.sqrt(2 * Math.PI));

  const g = sc.g();
  const txt = (parent, x, y, s, o = {}) => {
    const n = sc.node(parent, 'text', {
      x, y, 'text-anchor': o.anchor ?? 'middle', 'font-size': o.size ?? 16,
      'font-weight': o.weight ?? 400, fill: o.fill ?? SLATE,
      'font-family': o.mono ? 'var(--mono)' : 'var(--sans)'
    });
    n.textContent = s;
    return n;
  };

  sc.node(g, 'line', { x1: LX - 10, y1: LY, x2: LX + LW + 10, y2: LY,
                       stroke: '#C8D2DA', 'stroke-width': 1.2 });

  const excess = sc.node(g, 'path', { fill: EXC, 'fill-opacity': .55, stroke: 'none', opacity: 0 });
  const curveQ = sc.node(g, 'path', { fill: 'none', stroke: N_COL, 'stroke-width': 2.6, opacity: 0 });
  const curveS = sc.node(g, 'path', { fill: 'none', stroke: N_COL, 'stroke-width': 2.4,
                                      'stroke-dasharray': '8 5', opacity: 0 });
  const curveP = sc.node(g, 'path', { fill: 'none', stroke: D_COL, 'stroke-width': 2.8 });
  const grow = sc.node(g, 'path', { fill: 'none', stroke: N_COL, 'stroke-opacity': .35,
                                    'stroke-width': 1.4, 'marker-end': sc.arrow('accent'),
                                    opacity: 0 });

  const labP = txt(g, 0, 0, 'released quantity under D', { size: 16, fill: D_COL });
  const labQ = txt(g, 0, 0, "under D′", { size: 16, fill: N_COL });
  const labS = txt(g, 0, 0, 'e^ε × that', { size: 16, fill: N_COL, mono: true });
  const labD = txt(g, 0, 0, 'δ', { size: 22, fill: '#9A6A0A', weight: 650 });
  const eBar = sc.node(g, 'line', { y1: LY + 12, y2: LY + 12, stroke: EXC,
                                    'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0 });
  const eLab = txt(g, 0, LY + 38, 'E', { size: 19, fill: '#9A6A0A', weight: 650 });
  const readout = txt(g, CW / 2, CH - 12, '', { size: 16, fill: NAVY, mono: true });

  const sSig = sc.slider('noise σ', { min: 0.25, max: 2.4, step: 0.01, value: sigma },
                         (v) => { sigma = v; render(1); });
  const sEps = sc.slider('ε', { min: 0.1, max: 3, step: 0.05, value: eps },
                         (v) => { eps = v; render(1); });

  const path = (m, scale, upTo = 1) => {
    let d = '';
    const n = 260;
    for (let i = 0; i <= n; i++) {
      const t = T0 + (T1 - T0) * i / n;
      const v = pdf(t, m) * (1 + (scale - 1) * upTo);
      d += (i ? 'L' : 'M') + tx(t).toFixed(1) + ' ' + ty(v).toFixed(1);
    }
    return d;
  };

  // the region where p exceeds e^eps q, and its area
  // E is the set where p exceeds e^eps q, the worst set for the definition
  function excessRegion(scale) {
    const n = 900, step = (T1 - T0) / n;
    let up = '', down = [], area = 0, inside = false, peak = { t: 0, v: 0 };
    let pE = 0, qE = 0, lo = null, hi = null;
    for (let i = 0; i <= n; i++) {
      const t = T0 + step * i;
      const p = pdf(t, 0), q = pdf(t, SENS) * scale;
      if (p > q) {
        area += (p - q) * step;
        pE += p * step;
        qE += q * step;
        if (lo === null) lo = t;
        hi = t;
        if (p - q > peak.v) peak = { t, v: p - q };
        up += (inside ? 'L' : 'M') + `${tx(t).toFixed(1)} ${ty(p).toFixed(1)}`;
        down.push(`L${tx(t).toFixed(1)} ${ty(q).toFixed(1)}`);
        inside = true;
      }
    }
    return { d: inside ? up + down.reverse().join('') + 'Z' : '',
             area, peak, pE, qE, lo, hi };
  }

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;   // the second law
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;   // scale it by e^eps
    const g3 = step >= 3 ? 1 : 0;                   // the leftover area

    sSig.set(sigma.toFixed(2));
    sEps.set(eps.toFixed(2));

    curveP.setAttribute('d', path(0, 1));
    curveQ.setAttribute('d', path(SENS, 1));
    curveQ.setAttribute('opacity', g1 * (g2 > .2 ? 0.35 : 1));

    const scale = 1 + (Math.exp(eps) - 1) * g2;
    curveS.setAttribute('d', path(SENS, scale));
    curveS.setAttribute('opacity', g2 > .03 ? 1 : 0);

    const top = tx(SENS);
    grow.setAttribute('d', `M${top} ${ty(pdf(SENS, SENS))}V${ty(pdf(SENS, SENS) * scale) + 8}`);
    grow.setAttribute('opacity', g2 > .05 && g2 < .95 ? 1 : 0);

    labP.setAttribute('x', tx(-0.1)); labP.setAttribute('y', ty(pdf(0, 0)) - 16);
    labQ.setAttribute('x', tx(SENS + 0.9)); labQ.setAttribute('y', ty(pdf(SENS + 0.9, SENS)) - 12);
    labQ.setAttribute('opacity', g1 > .5 ? 1 : 0);
    labS.setAttribute('x', tx(SENS + 1.0));
    labS.setAttribute('y', ty(Math.min(0.60, pdf(SENS, SENS) * scale)) - 14);
    labS.setAttribute('opacity', g2 > .7 ? 1 : 0);

    const R = excessRegion(Math.exp(eps));
    const onE = step >= 3 && R.d;
    if (onE) {
      eBar.setAttribute('x1', tx(R.lo)); eBar.setAttribute('x2', tx(Math.min(R.hi, T1)));
      eBar.setAttribute('opacity', 1);
      eLab.setAttribute('x', (tx(R.lo) + tx(Math.min(R.hi, T1))) / 2);
      eLab.setAttribute('opacity', 1);
    } else {
      eBar.setAttribute('opacity', 0); eLab.setAttribute('opacity', 0);
    }

    if (step >= 4 && R.d) {
      excess.setAttribute('d', R.d); excess.setAttribute('opacity', 1);
      labD.setAttribute('x', tx(R.peak.t) - 6);
      labD.setAttribute('y', ty(pdf(R.peak.t, 0)) - 14);
      labD.setAttribute('opacity', 1);
      readout.textContent =
        `Pr(A(D) ∈ E) = ${R.pE.toFixed(3)}    ` +
        `e^ε Pr(A(D′) ∈ E) = ${R.qE.toFixed(3)}    ` +
        `δ must cover ${R.area.toFixed(3)}`;
    } else {
      excess.setAttribute('opacity', 0);
      labD.setAttribute('opacity', 0);
      readout.textContent = '';
    }
  }

  sc.tool('reset', () => {
    sigma = 0.8; eps = 1.0;
    sSig.input.value = sigma; sEps.input.value = eps; render(1);
  });

  const durations = [0, 800, 1100, 600, 700];
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