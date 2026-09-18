import { makeSaddleScene } from './saddle-scene.js';
import { makeTicker } from '../anim.js';

/* The extrinsic mechanism.

   M is a compact submanifold of the ambient space, with the inherited
   metric. Everything is then an ambient object followed by one and the
   same projection onto T_theta M: the gradient, the clipping norm, and
   the noise. */

const NAVY = '#243B54', SLATE = '#9AA6B2', OK = '#009E73';
const D_COL = '#0072B2', N_COL = '#B2182B', MEAN = '#6B3FA0', AMB = '#8A93A8';
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

export default function riemProposed(el) {
  const sc = makeSaddleScene(el, { scale: 300, cx: 460, cy: 300, elevation: 30 });
  const ticker = makeTicker();
  const S = sc.surface;

  const th0 = [-0.35, 0.25];
  let th = th0.slice();
  let C = 0.62, sigma = 0.9, live = false;

  // each sample gradient is an ambient vector: a tangent part plus a normal part
  const r0 = rng(37);
  const BASE = 0.65;
  const SAMP = Array.from({ length: B }, (_, k) => {
    const a = BASE + 1.5 * (r0() - 0.5), len = 0.42 + 0.55 * r0();
    return { t: [len * Math.cos(a), len * Math.sin(a)], n: 0.55 * (r0() * 2 - 1), k };
  });
  SAMP[3].t = [0.98 * Math.cos(1.05), 0.98 * Math.sin(1.05)];   // record z
  SAMP[6].t = [0.74 * Math.cos(0.26), 0.74 * Math.sin(0.26)];   // record z'
  const IZ = 3, IZP = 6;

  sc.drawSurface();

  // ---- ambient helpers
  const unit = (v) => { const L = Math.hypot(v[0], v[1], v[2]); return v.map((x) => x / L); };
  const frame = (p) => {                       // orthonormal for the inherited metric
    const [fu, fv] = S.grad(p[0], p[1]);
    const g11 = 1 + fu * fu, g12 = fu * fv, g22 = 1 + fv * fv;
    const det = g11 * g22 - g12 * g12;
    const s = Math.sqrt(Math.max(1e-9, det / g11));
    return [[1 / Math.sqrt(g11), 0], [-g12 / g11 / s, 1 / s]];
  };
  const nrm = (p, v) => {                       // ambient norm of a tangent vector
    const [fu, fv] = S.grad(p[0], p[1]);
    return Math.sqrt((1 + fu * fu) * v[0] * v[0]
           + 2 * fu * fv * v[0] * v[1] + (1 + fv * fv) * v[1] * v[1]);
  };
  const clip = (p, v, c) => {
    const n = nrm(p, v);
    return n <= c ? v.slice() : [v[0] * c / n, v[1] * c / n];
  };
  // a point of the ambient space: theta + a X_u + b X_v + h N
  const ambPt = (p, a, b, h) => {
    const Xu = S.tangentU(p[0], p[1]), Xv = S.tangentV(p[0], p[1]);
    const N = unit(S.normal(p[0], p[1]));
    const o = S.point(p[0], p[1]);
    return sc.amb([o[0] + a * Xu[0] + b * Xv[0] + h * N[0],
                   o[1] + a * Xu[1] + b * Xv[1] + h * N[1],
                   o[2] + a * Xu[2] + b * Xv[2] + h * N[2]]);
  };

  // ---- nodes
  const plane = sc.node('plane', 'path', {
    fill: NAVY, 'fill-opacity': .07, stroke: NAVY,
    'stroke-opacity': .40, 'stroke-width': 1.2 });
  const sphere = sc.node('plane', 'circle', {
    fill: OK, 'fill-opacity': .05, stroke: OK, 'stroke-opacity': .5,
    'stroke-width': 1.4, 'stroke-dasharray': '3 4', opacity: 0 });
  const disc = sc.node('plane', 'path', {
    fill: OK, 'fill-opacity': .12, stroke: OK, 'stroke-width': 2,
    'stroke-dasharray': '7 5', opacity: 0 });

  const ambArr = SAMP.map(() => sc.node('vectors', 'line', {
    stroke: AMB, 'stroke-width': 1.5, 'stroke-opacity': .7,
    'marker-end': sc.arrow('slate'), opacity: 0 }));
  const drop = SAMP.map(() => sc.node('vectors', 'line', {
    stroke: NAVY, 'stroke-opacity': .3, 'stroke-width': 1,
    'stroke-dasharray': '3 4', opacity: 0 }));
  const tanArr = SAMP.map((s, k) => sc.node('vectors', 'line', {
    stroke: k === IZ ? D_COL : k === IZP ? N_COL : SLATE,
    'stroke-width': k === IZ || k === IZP ? 2.6 : 1.6,
    'stroke-dasharray': k === IZP ? '7 5' : 'none',
    'marker-end': sc.arrow(k === IZ ? 'navy' : k === IZP ? 'accent' : 'slate'),
    opacity: 0 }));

  const mD = sc.node('vectors', 'line', {
    stroke: MEAN, 'stroke-width': 3, 'marker-end': sc.arrow('mean'), opacity: 0 });
  const mN = sc.node('vectors', 'line', {
    stroke: MEAN, 'stroke-width': 2.4, 'stroke-dasharray': '7 5',
    'marker-end': sc.arrow('mean'), opacity: 0 });
  const relN = sc.node('vectors', 'line', {
    stroke: MEAN, 'stroke-width': 2.6, 'stroke-dasharray': '7 5',
    'marker-end': sc.arrow('mean'), opacity: 0 });
  const tipD = sc.node('dots', 'circle', { r: 6, fill: D_COL, stroke: '#fff',
                                           'stroke-width': 1.6, opacity: 0 });
  const tipN = sc.node('dots', 'circle', { r: 6, fill: N_COL, stroke: '#fff',
                                           'stroke-width': 1.6, opacity: 0 });
  const nzAmb = sc.node('vectors', 'line', {
    stroke: AMB, 'stroke-width': 1.6, 'stroke-dasharray': '5 4',
    'marker-end': sc.arrow('slate'), opacity: 0 });
  const nzDrop = sc.node('vectors', 'line', {
    stroke: NAVY, 'stroke-opacity': .35, 'stroke-width': 1,
    'stroke-dasharray': '3 4', opacity: 0 });
  const rel = sc.node('vectors', 'line', {
    stroke: MEAN, 'stroke-width': 3.2, 'marker-end': sc.arrow('mean'), opacity: 0 });


  const hTh = sc.handle('dots', NAVY);

  const labTh   = sc.label('$\\theta$');
  const labPl   = sc.label('$T_\\theta\\mathcal{M}$', 'muted');
  const labProj = sc.label('$P_\\theta$', 'muted');
  const labBall = sc.label('$\\lVert\\cdot\\rVert\\le C$', 'muted');
  const labNz   = sc.label('$\\mathcal{N}(0,\\sigma^2 I)$', 'muted');
  const labRel  = sc.label('$\\widetilde{\\operatorname{grad}}f$', 'muted');

  labBall.node.style.color = OK;
  labRel.node.style.color = MEAN;


  const sC = sc.slider('clip C', { min: 0.2, max: 1.3, step: 0.02, value: C },
                       (v) => { C = v; live = true; render(1); });
  const sS = sc.slider('noise σ', { min: 0, max: 1.6, step: 0.02, value: sigma },
                       (v) => { sigma = v; live = true; render(1); });

  const rn = rng(91);
  let w = [gauss(rn), gauss(rn), gauss(rn)];
  let timer = null;
  const resample = () => { w = [gauss(rn), gauss(rn), gauss(rn)]; render(1); };
  const startDraws = () => { if (timer === null) timer = setInterval(resample, 700); };
  const stopDraws = () => { if (timer !== null) { clearInterval(timer); timer = null; } };

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = live || step > 1 ? 1 : step === 1 ? t : 0;   // projection
    const g2 = live || step > 2 ? 1 : step === 2 ? t : 0;   // clipping
    const g3 = live || step > 3 ? 1 : step === 3 ? t : 0;   // noise
    const g4 = live || step > 4 ? 1 : step === 4 ? t : 0;   // the update

    sC.set(C.toFixed(2));
    sS.set(sigma.toFixed(2));

    const o = sc.at(th[0], th[1]);
    hTh.moveTo(o); labTh.moveTo(o, -26, 26); labTh.show(true);
    plane.setAttribute('d', sc.planeQuad(th, 1.05));
    labPl.moveTo(sc.planePoint(th, 1.05, -1.05), 34, 6); labPl.show(true);

    const [e1, e2] = frame(th);

    // ---- the ambient gradients, and their projection
    SAMP.forEach((s, k) => {
      const tip = ambPt(th, s.t[0], s.t[1], s.n * (1 - g1));
      ambArr[k].setAttribute('x1', o.x); ambArr[k].setAttribute('y1', o.y);
      ambArr[k].setAttribute('x2', tip.x); ambArr[k].setAttribute('y2', tip.y);
      ambArr[k].setAttribute('opacity', g1 < .95 ? 1 : 0);

      const flat = ambPt(th, s.t[0], s.t[1], 0);
      drop[k].setAttribute('x1', tip.x); drop[k].setAttribute('y1', tip.y);
      drop[k].setAttribute('x2', flat.x); drop[k].setAttribute('y2', flat.y);
      drop[k].setAttribute('opacity', g1 > .15 && g1 < .95 ? 1 : 0);

      const c = clip(th, s.t, C);
      const shown = [s.t[0] + (c[0] - s.t[0]) * g2, s.t[1] + (c[1] - s.t[1]) * g2];
      const q = sc.planePoint(th, shown[0], shown[1]);
      tanArr[k].setAttribute('x1', o.x); tanArr[k].setAttribute('y1', o.y);
      tanArr[k].setAttribute('x2', q.x); tanArr[k].setAttribute('y2', q.y);
      tanArr[k].setAttribute('opacity', g1 > .1 ? 1 : 0);
    });
    labProj.moveTo(ambPt(th, SAMP[0].t[0], SAMP[0].t[1], SAMP[0].n * 0.5), 26, 0);
    labProj.show(g1 > .2 && g1 < .95);

    // ---- one and the same ambient ball
    sphere.setAttribute('cx', o.x); sphere.setAttribute('cy', o.y);
    sphere.setAttribute('r', C * sc.cam.scale);
    sphere.setAttribute('opacity', g2 > .1 ? 1 : 0);
    const ring = [];
    for (let k = 0; k <= 60; k++) {
      const a = 6.2832 * k / 60;
      ring.push(sc.planePoint(th, C * (Math.cos(a) * e1[0] + Math.sin(a) * e2[0]),
                                  C * (Math.cos(a) * e1[1] + Math.sin(a) * e2[1])));
    }
    disc.setAttribute('d', ring.map((q, k) => (k ? 'L' : 'M') +
      q.x.toFixed(1) + ' ' + q.y.toFixed(1)).join('') + 'Z');
    disc.setAttribute('opacity', g2);
    labBall.moveTo(ring[45], -10, -22); labBall.show(g2 > .6);

    // ---- the two clipped averages: the batch with z, and the batch with z'
    const BB = B - 1;
    const cl = SAMP.map((s) => clip(th, s.t, C));
    const acc = (skip) => {
      let a = 0, b = 0;
      cl.forEach((v, k) => { if (k !== skip) { a += v[0]; b += v[1]; } });
      return [a / BB, b / BB];
    };
    const av = acc(IZP), avN = acc(IZ);
    const qa = sc.planePoint(th, av[0], av[1]);
    const qn = sc.planePoint(th, avN[0], avN[1]);
    mD.setAttribute('x1', o.x); mD.setAttribute('y1', o.y);
    mD.setAttribute('x2', qa.x); mD.setAttribute('y2', qa.y);
    mD.setAttribute('opacity', g2 > .5 ? 1 : 0);
    mD.setAttribute('stroke-opacity', g3 > .3 ? .3 : 1);
    mN.setAttribute('x1', o.x); mN.setAttribute('y1', o.y);
    mN.setAttribute('x2', qn.x); mN.setAttribute('y2', qn.y);
    mN.setAttribute('opacity', g2 > .7 ? 1 : 0);
    mN.setAttribute('stroke-opacity', g3 > .3 ? .3 : 1);

    // ---- an ambient Gaussian, then its projection
    const sd = sigma * 2 * C / BB * 3.2;      // magnified, the scale is not the point
    if (g3 > .02) {
      const shift = (base, wv) => [base[0] + sd * (wv[0] * e1[0] + wv[1] * e2[0]),
                                   base[1] + sd * (wv[0] * e1[1] + wv[1] * e2[1])];
      const sD = shift(av, w), sN = shift(avN, [w[1], -w[0]]);

      const tip = ambPt(th, sD[0], sD[1], sd * w[2] * (1 - g3));
      const flat = ambPt(th, sD[0], sD[1], 0);
      const flatN = ambPt(th, sN[0], sN[1], 0);

      nzAmb.setAttribute('x1', qa.x); nzAmb.setAttribute('y1', qa.y);
      nzAmb.setAttribute('x2', tip.x); nzAmb.setAttribute('y2', tip.y);
      nzAmb.setAttribute('opacity', g3 < .9 ? 1 : 0);
      nzDrop.setAttribute('x1', tip.x); nzDrop.setAttribute('y1', tip.y);
      nzDrop.setAttribute('x2', flat.x); nzDrop.setAttribute('y2', flat.y);
      nzDrop.setAttribute('opacity', g3 > .2 && g3 < .9 ? 1 : 0);

      rel.setAttribute('x1', o.x); rel.setAttribute('y1', o.y);
      rel.setAttribute('x2', flat.x); rel.setAttribute('y2', flat.y);
      rel.setAttribute('opacity', 1);
      relN.setAttribute('x1', o.x); relN.setAttribute('y1', o.y);
      relN.setAttribute('x2', flatN.x); relN.setAttribute('y2', flatN.y);
      relN.setAttribute('opacity', g3 > .8 ? 1 : 0);
      tipD.setAttribute('cx', flat.x); tipD.setAttribute('cy', flat.y);
      tipD.setAttribute('opacity', 1);
      tipN.setAttribute('cx', flatN.x); tipN.setAttribute('cy', flatN.y);
      tipN.setAttribute('opacity', g3 > .8 ? 1 : 0);

      labNz.moveTo(tip, 30, -14); labNz.show(g3 > .2 && g3 < .9);
      labRel.moveTo(flat, 44, 16); labRel.show(g3 > .9);
      startDraws();
    } else {
      [nzAmb, nzDrop, rel, relN, tipD, tipN].forEach((n) => n.setAttribute('opacity', 0));
      labNz.show(false); labRel.show(false);
      stopDraws();
    }

  }

  sc.onRedraw(() => render());
  sc.enableOrbit();
  sc.draggable(hTh, (pt) => { th = sc.pickUV(pt, th); render(); });
  sc.tool('reset', () => {
    th = th0.slice(); C = 0.62; sigma = 0.9; live = false;
    sC.input.value = C; sS.input.value = sigma; sc.resetView();
  });

  const durations = [0, 1100, 1000, 1200, 1100];
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