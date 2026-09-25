import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';

/* Clipping and noise, in the Euclidean case.

   grey   : the B-1 records shared by D and D'
   blue   : the record z, present in D
   red    : the record z', which replaces it in D'
   violet : the minibatch gradient, solid under D and dashed under D'  */

const CW = 1020, CH = 440;
const NAVY = '#243B54', SLATE = '#9AA6B2', OK = '#009E73';
const D_COL = '#0072B2', N_COL = '#B2182B', MEAN = '#6B3FA0';
const B = 8;

function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v);
};

export default function clipNoise(el) {
  const sc = makeScene(el, { width: CW, height: CH });
  const ticker = makeTicker();

  let C = 1.0, sigma = 0.6, live = false;

  // the B-1 shared records, then z and z'
  const r0 = rng(29);
  const SHARED = Array.from({ length: B - 1 }, () => {
    const a = 6.2832 * r0(), len = 0.45 + 0.8 * r0();
    return [len * Math.cos(a), len * Math.sin(a)];
  });
  const GZ  = [2.35 * Math.cos(1.15), 2.35 * Math.sin(1.15)];   // record z, in D
  const GZP = [1.75 * Math.cos(4.05), 1.75 * Math.sin(4.05)];   // record z', in D'

  // pixels per unit, one per panel. Raise them to make the drawing larger.
  const S1 = 78, S2 = 392;
  const OX = 252, OY = 232;
  const ZX = 742, ZY = 232;
  const p1 = (v) => ({ x: OX + S1 * v[0], y: OY - S1 * v[1] });
  const p2 = (v) => ({ x: ZX + S2 * v[0], y: ZY - S2 * v[1] });

  const gL = sc.g(), gR = sc.g();
  const txt = (parent, x, y, s, o = {}) => {
    const n = sc.node(parent, 'text', {
      x, y, 'text-anchor': o.anchor ?? 'middle', 'font-size': o.size ?? 17,
      'font-weight': o.weight ?? 400, fill: o.fill ?? SLATE,
      'font-family': o.mono ? 'var(--mono)' : 'var(--sans)'
    });
    n.textContent = s;
    return n;
  };
  const axes = (parent, cx, cy, half) => {
    sc.node(parent, 'line', { x1: cx - half, y1: cy, x2: cx + half, y2: cy,
                              stroke: '#E1E7EC', 'stroke-width': 1 });
    sc.node(parent, 'line', { x1: cx, y1: cy - half, x2: cx, y2: cy + half,
                              stroke: '#E1E7EC', 'stroke-width': 1 });
  };
  axes(gL, OX, OY, 196);
  axes(gR, ZX, ZY, 150);

  // ---- left panel
  const ball = sc.node(gL, 'circle', { cx: OX, cy: OY, fill: OK, 'fill-opacity': .06,
                                       stroke: OK, 'stroke-width': 1.8,
                                       'stroke-dasharray': '7 5', opacity: 0 });
  const ballLab = txt(gL, 0, 0, 'C', { size: 18, fill: OK, mono: true });

  const shArr = SHARED.map(() => sc.node(gL, 'line', {
    stroke: SLATE, 'stroke-width': 1.7, 'stroke-opacity': .75,
    'marker-end': sc.arrow('slate') }));
  const zArr = sc.node(gL, 'line', { stroke: D_COL, 'stroke-width': 2.8,
                                     'marker-end': sc.arrow('navy') });
  const zpArr = sc.node(gL, 'line', { stroke: N_COL, 'stroke-width': 2.8,
                                      'stroke-dasharray': '7 5',
                                      'marker-end': sc.arrow('accent') });
  const labZ  = txt(gL, 0, 0, '∇f(x, z)', { size: 16, fill: D_COL, mono: true });
  const labZP = txt(gL, 0, 0, "∇f(x, z′)", { size: 16, fill: N_COL, mono: true });
  txt(gL, OX, 36, 'one gradient per record of the minibatch', { size: 18, fill: NAVY });
  txt(gL, OX, CH - 22, "z and z′ are the substituted record", { size: 16 });

  // ---- right panel
  const gap = sc.node(gR, 'line', { stroke: NAVY, 'stroke-opacity': .55, 'stroke-width': 1.6,
                                    'stroke-dasharray': '4 4', opacity: 0 });
  const relD = sc.node(gR, 'line', { stroke: MEAN, 'stroke-width': 3.2,
                                     'stroke-opacity': .40, 'marker-end': sc.arrow('mean'),
                                     opacity: 0 });
  const relN = sc.node(gR, 'line', { stroke: MEAN, 'stroke-width': 2.6,
                                     'stroke-opacity': .40, 'stroke-dasharray': '7 5',
                                     'marker-end': sc.arrow('mean'), opacity: 0 });
  const tipD = sc.node(gR, 'circle', { r: 6, fill: D_COL, opacity: 0 });
  const tipN = sc.node(gR, 'circle', { r: 6, fill: N_COL, opacity: 0 });
  const mD = sc.node(gR, 'line', { stroke: MEAN, 'stroke-width': 3.2,
                                   'marker-end': sc.arrow('mean'), opacity: 0 });
  const mN = sc.node(gR, 'line', { stroke: MEAN, 'stroke-width': 2.6,
                                   'stroke-dasharray': '7 5',
                                   'marker-end': sc.arrow('mean'), opacity: 0 });
  // which database each minibatch gradient comes from, said by colour alone
  const markD = sc.node(gR, 'circle', { r: 7, fill: D_COL, stroke: '#fff',
                                        'stroke-width': 2, opacity: 0 });
  const markN = sc.node(gR, 'circle', { r: 7, fill: N_COL, stroke: '#fff',
                                        'stroke-width': 2, opacity: 0 });
  const labIter = txt(gR, ZX, CH - 70, 'each local step uses a fresh draw',
                      { size: 16, fill: NAVY });
  txt(gR, ZX, 36, 'what the client releases', { size: 18, fill: NAVY });
  const sensLab = txt(gR, ZX, CH - 46, '', { size: 17, mono: true, fill: NAVY });
  const noiseLab = txt(gR, ZX, CH - 22, '', { size: 17, mono: true, fill: NAVY });

  // a violet arrow head
  const defs = sc.node(sc.svg, 'defs');
  const mk = sc.node(defs, 'marker', {
    id: `${sc.uid}-mean`, viewBox: '0 0 10 10', refX: 9, refY: 5,
    markerWidth: 5.5, markerHeight: 5.5, orient: 'auto-start-reverse' });
  sc.node(mk, 'path', { d: 'M0 0 L10 5 L0 10 z', fill: MEAN });

  const sC = sc.slider('clip C', { min: 0.3, max: 2.6, step: 0.05, value: C },
                       (v) => { C = v; live = true; render(1); });
  const sS = sc.slider('noise σ', { min: 0, max: 1.6, step: 0.02, value: sigma },
                       (v) => { sigma = v; live = true; render(1); });

  const clip = (v, c) => {
    const n = Math.hypot(v[0], v[1]);
    return n <= c ? v.slice() : [v[0] * c / n, v[1] * c / n];
  };
  // the current noise draw, resampled while the mechanism is on screen
  const rn = rng(77);
  let nzD = [gauss(rn), gauss(rn)], nzN = [gauss(rn), gauss(rn)];
  let timer = null;
  const resample = () => {
    nzD = [gauss(rn), gauss(rn)];
    nzN = [gauss(rn), gauss(rn)];
    render(1);
  };
  const startDraws = () => { if (timer === null) timer = setInterval(resample, 620); };
  const stopDraws = () => { if (timer !== null) { clearInterval(timer); timer = null; } };

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    // step 1 is the plain minibatch gradient, so clipping starts at step 2
    // once a slider is touched, the whole mechanism stays on screen
    const g0 = live || step > 1 ? 1 : step === 1 ? t : 0;   // the plain average
    const g1 = live || step > 2 ? 1 : step === 2 ? t : 0;   // clipping
    const g2 = g1;                                          // the sensitivity gap
    const g3 = live || step > 3 ? 1 : step === 3 ? t : 0;   // the noise
    const g4 = live || step > 4 ? 1 : step === 4 ? t : 0;   // the local iterate

    sC.set(C.toFixed(2));
    sS.set(sigma.toFixed(2));

    ball.setAttribute('r', S1 * C);
    ball.setAttribute('opacity', g1);
    ballLab.setAttribute('x', OX + S1 * C * 0.74);
    ballLab.setAttribute('y', OY - S1 * C * 0.74);
    ballLab.setAttribute('opacity', g1 > .6 ? 1 : 0);

    const blend = (v) => {
      const c = clip(v, C);
      return [v[0] + (c[0] - v[0]) * g1, v[1] + (c[1] - v[1]) * g1];
    };
    SHARED.forEach((v, k) => {
      const q = p1(blend(v));
      shArr[k].setAttribute('x1', OX); shArr[k].setAttribute('y1', OY);
      shArr[k].setAttribute('x2', q.x); shArr[k].setAttribute('y2', q.y);
    });
    const qz = p1(blend(GZ)), qzp = p1(blend(GZP));
    zArr.setAttribute('x1', OX); zArr.setAttribute('y1', OY);
    zArr.setAttribute('x2', qz.x); zArr.setAttribute('y2', qz.y);
    zpArr.setAttribute('x1', OX); zpArr.setAttribute('y1', OY);
    zpArr.setAttribute('x2', qzp.x); zpArr.setAttribute('y2', qzp.y);
    labZ.setAttribute('x', qz.x + 10); labZ.setAttribute('y', qz.y - 15);
    labZP.setAttribute('x', qzp.x - 4); labZP.setAttribute('y', qzp.y + 26);

    // ---- the two minibatch gradients
    const cl = SHARED.map((v) => clip(v, C));
    const sum = cl.reduce((s, v) => [s[0] + v[0], s[1] + v[1]], [0, 0]);
    const cz = clip(GZ, C), czp = clip(GZP, C);
    const avgD = [(sum[0] + cz[0]) / B, (sum[1] + cz[1]) / B];
    const avgN = [(sum[0] + czp[0]) / B, (sum[1] + czp[1]) / B];
    const sens2 = 2 * C / B, sd = sigma * sens2;

    const aD = p2(avgD), aN = p2(avgN);
    mD.setAttribute('x1', ZX); mD.setAttribute('y1', ZY);
    mD.setAttribute('x2', aD.x); mD.setAttribute('y2', aD.y);
    mD.setAttribute('opacity', g0 > .03 ? 1 : 0);
    mN.setAttribute('x1', ZX); mN.setAttribute('y1', ZY);
    mN.setAttribute('x2', aN.x); mN.setAttribute('y2', aN.y);
    mN.setAttribute('opacity', g2 > .5 ? 1 : 0);

    // a coloured dot just above each arrow tip, no text
    markD.setAttribute('cx', aD.x); markD.setAttribute('cy', aD.y - 16);
    markD.setAttribute('opacity', g0 > .3 ? 1 : 0);
    markN.setAttribute('cx', aN.x); markN.setAttribute('cy', aN.y - 16);
    markN.setAttribute('opacity', g2 > .6 ? 1 : 0);

    // the gap the substitution can open, and what bounds it
    gap.setAttribute('x1', aD.x); gap.setAttribute('y1', aD.y);
    gap.setAttribute('x2', aN.x); gap.setAttribute('y2', aN.y);
    gap.setAttribute('opacity', g2 > .7 ? 1 : 0);

    // the released gradients, each one mean plus a noise draw
    const cap = (v) => {
      const n = Math.hypot(v[0], v[1]), L = 0.36;
      return n > L ? [v[0] * L / n, v[1] * L / n] : v;
    };
    const rD = p2(cap([avgD[0] + sd * nzD[0] * g3, avgD[1] + sd * nzD[1] * g3]));
    const rN = p2(cap([avgN[0] + sd * nzN[0] * g3, avgN[1] + sd * nzN[1] * g3]));
    const on = g3 > .03 ? 1 : 0;
    relD.setAttribute('x1', ZX); relD.setAttribute('y1', ZY);
    relD.setAttribute('x2', rD.x); relD.setAttribute('y2', rD.y);
    relD.setAttribute('opacity', on);
    relN.setAttribute('x1', ZX); relN.setAttribute('y1', ZY);
    relN.setAttribute('x2', rN.x); relN.setAttribute('y2', rN.y);
    relN.setAttribute('opacity', on);
    tipD.setAttribute('cx', rD.x); tipD.setAttribute('cy', rD.y);
    tipD.setAttribute('opacity', on);
    tipN.setAttribute('cx', rN.x); tipN.setAttribute('cy', rN.y);
    tipN.setAttribute('opacity', on);
    mD.setAttribute('stroke-opacity', g3 > .3 ? .35 : 1);
    mN.setAttribute('stroke-opacity', g3 > .3 ? .35 : 1);

    labIter.setAttribute('opacity', g4 > .4 ? 1 : 0);

    if (g3 > .03) startDraws(); else stopDraws();

    sensLab.textContent = g2 > .7 ? `2C/B = ${sens2.toFixed(3)}` : '';
    noiseLab.textContent = g3 > .4 ? `σ·2C/B = ${sd.toFixed(3)}` : '';
  }

  sc.tool('reset', () => {
    C = 1.0; sigma = 0.6; live = false;
    sC.input.value = C; sS.input.value = sigma; render(1);
  });

  const durations = [0, 900, 1200, 1200, 1300];
  render(1);

  return {
    setStep(n) {
      if (n === step) return;
      const back = n < step;
      step = n;
      if (n === 0) live = false;
      ticker.run(back ? 0 : durations[n] ?? 600, render, { instant: back });
    },
    activate() {}, deactivate() { ticker.stop(); stopDraws(); }
  };
}