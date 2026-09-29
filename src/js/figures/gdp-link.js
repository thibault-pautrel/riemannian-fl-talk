import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';

/* Where mu comes from.

   Two laws of the released quantity, one per adjacent database, seen
   along the line joining their means. The gap between the two, measured
   in units of the noise, is mu. Larger mu is easier to tell apart. */

const CW = 900, CH = 420;
const NAVY = '#243B54', SLATE = '#8A9AA8';
const D_COL = '#0072B2', N_COL = '#B2182B';

const BASE = 306;            // baseline of the bells
const AMP = 190;             // height of a bell
const SD = 62;               // pixels per standard deviation
const CX = CW / 2;

export default function gdpLink(el) {
  const sc = makeScene(el, { width: CW, height: CH });
  const ticker = makeTicker();

  let mu = 1.6;

  const g = sc.g();
  const txt = (x, y, s, o = {}) => {
    const n = sc.node(g, 'text', {
      x, y, 'text-anchor': o.anchor ?? 'middle', 'font-size': o.size ?? 17,
      'font-weight': o.weight ?? 400, fill: o.fill ?? SLATE,
      'font-family': o.mono ? 'var(--mono)' : 'var(--sans)'
    });
    n.textContent = s;
    return n;
  };

  sc.node(g, 'line', { x1: 40, y1: BASE, x2: CW - 40, y2: BASE,
                       stroke: '#C8D2DA', 'stroke-width': 1.4 });

  // one bell, filled and outlined, centred on cx
  const bellPath = (cx, close = false) => {
    let d = '';
    for (let i = 0; i <= 90; i++) {
      const t = -3.6 + 7.2 * i / 90;
      d += (i ? 'L' : 'M') + (cx + SD * t).toFixed(1) + ' ' +
           (BASE - AMP * Math.exp(-t * t / 2)).toFixed(1);
    }
    return close ? d + `L${(cx + SD * 3.6).toFixed(1)} ${BASE}L${(cx - SD * 3.6).toFixed(1)} ${BASE}Z` : d;
  };

  const fillD = sc.node(g, 'path', { fill: D_COL, 'fill-opacity': .10, stroke: 'none' });
  const fillN = sc.node(g, 'path', { fill: N_COL, 'fill-opacity': .10, stroke: 'none' });
  const lineD = sc.node(g, 'path', { fill: 'none', stroke: D_COL, 'stroke-width': 2.8 });
  const lineN = sc.node(g, 'path', { fill: 'none', stroke: N_COL, 'stroke-width': 2.8 });

  const labD = txt(0, BASE + 30, 'record used', { size: 18, fill: D_COL });
  const labN = txt(0, BASE + 30, 'record replaced', { size: 18, fill: N_COL });

  // the gap between the two means
  const tickD = sc.node(g, 'line', { stroke: NAVY, 'stroke-width': 1.4,
                                     'stroke-dasharray': '5 4', opacity: 0 });
  const tickN = sc.node(g, 'line', { stroke: NAVY, 'stroke-width': 1.4,
                                     'stroke-dasharray': '5 4', opacity: 0 });
  const span = sc.node(g, 'path', { fill: 'none', stroke: NAVY, 'stroke-width': 1.8, opacity: 0 });
  const labMu = txt(0, 0, 'μ', { size: 26, fill: NAVY, weight: 650 });
  const labGap = txt(CX, 58, '', { size: 18, fill: NAVY });
  const labFor = txt(CX, CH - 34, '', { size: 19, fill: NAVY, mono: true });
  [labMu, labGap, labFor].forEach((n) => n.setAttribute('opacity', 0));

  const sMu = sc.slider('μ', { min: 0.2, max: 3.2, step: 0.02, value: mu },
                        (v) => { mu = v; render(1); });

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;   // the two laws
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;   // the gap
    const g3 = step === 3 ? t : 0;                  // what sets it

    sMu.set(mu.toFixed(2));

    const c1 = CX - SD * mu / 2, c2 = CX + SD * mu / 2;

    fillD.setAttribute('d', bellPath(c1, true));
    lineD.setAttribute('d', bellPath(c1));
    labD.setAttribute('x', c1 - SD * 1.1);

    fillN.setAttribute('d', bellPath(c2, true));
    lineN.setAttribute('d', bellPath(c2));
    labN.setAttribute('x', c2 + SD * 1.3);
    [fillN, lineN, labN].forEach((n) => n.setAttribute('opacity', g1));

    const top = BASE - AMP - 26;
    tickD.setAttribute('x1', c1); tickD.setAttribute('y1', BASE);
    tickD.setAttribute('x2', c1); tickD.setAttribute('y2', top - 6);
    tickN.setAttribute('x1', c2); tickN.setAttribute('y1', BASE);
    tickN.setAttribute('x2', c2); tickN.setAttribute('y2', top - 6);
    [tickD, tickN].forEach((n) => n.setAttribute('opacity', g2));
    span.setAttribute('d',
      `M${c1} ${top}H${c2}M${c1} ${top - 7}V${top + 7}M${c2} ${top - 7}V${top + 7}`);
    span.setAttribute('opacity', g2);
    labMu.setAttribute('x', (c1 + c2) / 2);
    labMu.setAttribute('y', top - 14);
    labMu.setAttribute('opacity', g2 > .5 ? 1 : 0);

    labGap.textContent = g2 > .6 ? 'the gap, in units of the noise' : '';
    labGap.setAttribute('opacity', g2 > .6 ? 1 : 0);

    labFor.textContent = g3 > .5 ? 'μ = 2C / (B σ)  for one release' : '';
    labFor.setAttribute('opacity', g3 > .5 ? 1 : 0);
  }

  sc.tool('reset', () => { mu = 1.6; sMu.input.value = mu; render(1); });

  const durations = [0, 800, 900, 700];
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