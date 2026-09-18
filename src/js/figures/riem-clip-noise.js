import { makeSaddleScene } from './saddle-scene.js';
import { makeTicker } from '../anim.js';

/* Clipping and noise on a manifold.

   Everything lives in T_theta M, and everything depends on theta:
   the norm used for clipping, the sensitivity, and the frame in which
   the noise is drawn. Drag theta and watch the ball change shape. */

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

export default function riemClipNoise(el) {
  // zoomed on theta: the tangent plane is the subject, the surface is context
  const sc = makeSaddleScene(el, { scale: 300, cx: 470, cy: 300, elevation: 30 });
  const ticker = makeTicker();
  const S = sc.surface;

  const th0 = [-0.35, 0.25];
  let th = th0.slice();
  let C = 0.85, sigma = 0.9, live = false;

  // per-sample Riemannian gradients, fixed in the basis (X_u, X_v)
  const r0 = rng(31);
  // a common direction with dispersion around it, as a real minibatch has
  const BASE = 0.65;
  const SHARED = Array.from({ length: B - 1 }, () => {
    const a = BASE + 1.5 * (r0() - 0.5), len = 0.55 + 0.7 * r0();
    return [len * Math.cos(a), len * Math.sin(a)];
  });
  // z and z' point in nearby directions, about 45 degrees apart
  const GZ  = [1.55 * Math.cos(1.05), 1.55 * Math.sin(1.05)];
  const GZP = [1.15 * Math.cos(0.26), 1.15 * Math.sin(0.26)];

  sc.drawSurface();

  // ---- the metric at theta, and an orthonormal frame for it
  // a deliberately non-inherited metric, so the ball is genuinely anisotropic
  // and its shape depends on theta
  function metric(p) {
    const [fu, fv] = S.grad(p[0], p[1]);
    const w = 1 + 1.6 * Math.abs(p[0] + 0.5 * p[1]);
    return { g11: (1 + fu * fu) * w, g12: fu * fv, g22: (1 + fv * fv) / w };
  }
  const dot = (p, u, v) => {
    const { g11, g12, g22 } = metric(p);
    return g11 * u[0] * v[0] + g12 * (u[0] * v[1] + u[1] * v[0]) + g22 * u[1] * v[1];
  };
  const nrm = (p, u) => Math.sqrt(Math.max(0, dot(p, u, u)));
  // Gram-Schmidt on (X_u, X_v), in (a, b) coordinates
  function frame(p) {
    const { g11, g12, g22 } = metric(p);
    const e1 = [1 / Math.sqrt(g11), 0];
    const det = g11 * g22 - g12 * g12;
    const s = Math.sqrt(Math.max(1e-9, det / g11));
    const e2 = [-g12 / g11 / s, 1 / s];
    return [e1, e2];
  }
  const clip = (p, v, c) => {
    const n = nrm(p, v);
    return n <= c ? v.slice() : [v[0] * c / n, v[1] * c / n];
  };

  // ---- nodes
  const plane = sc.node('plane', 'path', {
    fill: NAVY, 'fill-opacity': .07, stroke: NAVY,
    'stroke-opacity': .40, 'stroke-width': 1.2
  });
  const ball = sc.node('plane', 'path', {
    fill: OK, 'fill-opacity': .09, stroke: OK, 'stroke-width': 1.8,
    'stroke-dasharray': '7 5', opacity: 0
  });
  const shArr = SHARED.map(() => sc.node('vectors', 'line', {
    stroke: SLATE, 'stroke-width': 1.6, 'stroke-opacity': .8,
    'marker-end': sc.arrow('slate') }));
  const zArr = sc.node('vectors', 'line', {
    stroke: D_COL, 'stroke-width': 2.6, 'marker-end': sc.arrow('navy') });
  const zpArr = sc.node('vectors', 'line', {
    stroke: N_COL, 'stroke-width': 2.6, 'stroke-dasharray': '7 5',
    'marker-end': sc.arrow('accent') });
  const gap = sc.node('vectors', 'line', {
    stroke: NAVY, 'stroke-opacity': .55, 'stroke-width': 1.6,
    'stroke-dasharray': '4 4', opacity: 0 });
  const mD = sc.node('vectors', 'line', {
    stroke: MEAN, 'stroke-width': 3, 'marker-end': sc.arrow('mean'), opacity: 0 });
  const mN = sc.node('vectors', 'line', {
    stroke: MEAN, 'stroke-width': 2.4, 'stroke-dasharray': '7 5',
    'marker-end': sc.arrow('mean'), opacity: 0 });
  const eArr = [0, 1].map(() => sc.node('vectors', 'line', {
    stroke: NAVY, 'stroke-width': 2, 'marker-end': sc.arrow('navy'), opacity: 0 }));
  const sq = sc.node('vectors', 'path', {
    fill: 'none', stroke: NAVY, 'stroke-opacity': .5, 'stroke-width': 1.1, opacity: 0 });
  const relD = sc.node('vectors', 'line', {
    stroke: MEAN, 'stroke-width': 3.2, 'marker-end': sc.arrow('mean'), opacity: 0 });
  const relN = sc.node('vectors', 'line', {
    stroke: MEAN, 'stroke-width': 2.6, 'stroke-dasharray': '7 5',
    'marker-end': sc.arrow('mean'), opacity: 0 });
  const tipD = sc.node('dots', 'circle', { r: 6, fill: D_COL, stroke: '#fff',
                                           'stroke-width': 1.6, opacity: 0 });
  const tipN = sc.node('dots', 'circle', { r: 6, fill: N_COL, stroke: '#fff',
                                           'stroke-width': 1.6, opacity: 0 });

  const hTh = sc.handle('dots', NAVY);

  const labTh   = sc.label('$\\theta$');
  const labPl   = sc.label('$T_\\theta\\mathcal{M}$', 'muted');
  const labBall = sc.label('$\\lVert\\cdot\\rVert_\\theta=C$', 'muted');
  const labE1   = sc.label('$E_1(\\theta)$', 'muted');
  const labE2   = sc.label('$E_2(\\theta)$', 'muted');
  labBall.node.style.color = OK;



  const sC = sc.slider('clip C', { min: 0.25, max: 1.8, step: 0.05, value: C },
                       (v) => { C = v; live = true; render(1); });
  const sS = sc.slider('noise σ', { min: 0, max: 1.6, step: 0.02, value: sigma },
                       (v) => { sigma = v; live = true; render(1); });

  const rn = rng(83);
  let wD = [gauss(rn), gauss(rn)], wN = [gauss(rn), gauss(rn)];
  let timer = null;
  const resample = () => {
    wD = [gauss(rn), gauss(rn)];
    wN = [gauss(rn), gauss(rn)];
    render(1);
  };
  const startDraws = () => { if (timer === null) timer = setInterval(resample, 620); };
  const stopDraws = () => { if (timer !== null) { clearInterval(timer); timer = null; } };

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g0 = live || step > 1 ? 1 : step === 1 ? t : 0;   // the gradients
    const g1 = live || step > 2 ? 1 : step === 2 ? t : 0;   // clipping
    const g2 = live || step > 3 ? 1 : step === 3 ? t : 0;   // the frame
    const g3 = live || step > 4 ? 1 : step === 4 ? t : 0;   // the noise

    sC.set(C.toFixed(2));
    sS.set(sigma.toFixed(2));

    const o = sc.at(th[0], th[1]);
    hTh.moveTo(o); labTh.moveTo(o, -26, 26); labTh.show(true);
    plane.setAttribute('d', sc.planeQuad(th, 1.05));
    labPl.moveTo(sc.planePoint(th, 1.05, -1.05), 34, 6); labPl.show(true);

    const [e1, e2] = frame(th);

    // the clipping ball, a circle for the metric at theta
    const pts = [];
    for (let k = 0; k <= 60; k++) {
      const a = 6.2832 * k / 60;
      pts.push(sc.planePoint(th, C * (Math.cos(a) * e1[0] + Math.sin(a) * e2[0]),
                                 C * (Math.cos(a) * e1[1] + Math.sin(a) * e2[1])));
    }
    ball.setAttribute('d', pts.map((q, k) => (k ? 'L' : 'M') +
      q.x.toFixed(1) + ' ' + q.y.toFixed(1)).join('') + 'Z');
    ball.setAttribute('opacity', g1);
    labBall.moveTo(pts[6], 40, -6); labBall.show(g1 > .6);

    const blend = (v) => {
      const c = clip(th, v, C);
      return [v[0] + (c[0] - v[0]) * g1, v[1] + (c[1] - v[1]) * g1];
    };
    const line = (node, v, on) => {
      const q = sc.planePoint(th, v[0], v[1]);
      node.setAttribute('x1', o.x); node.setAttribute('y1', o.y);
      node.setAttribute('x2', q.x); node.setAttribute('y2', q.y);
      node.setAttribute('opacity', on ? 1 : 0);
      return q;
    };
    SHARED.forEach((v, k) => line(shArr[k], blend(v), g0 > .05));
    line(zArr, blend(GZ), g0 > .05);
    line(zpArr, blend(GZP), g0 > .05);

    // the two minibatch gradients
    const cl = SHARED.map((v) => clip(th, v, C));
    const sum = cl.reduce((s, v) => [s[0] + v[0], s[1] + v[1]], [0, 0]);
    const cz = clip(th, GZ, C), czp = clip(th, GZP, C);
    const avD = [(sum[0] + cz[0]) / B, (sum[1] + cz[1]) / B];
    const avN = [(sum[0] + czp[0]) / B, (sum[1] + czp[1]) / B];
    const qD = line(mD, avD, g1 > .3), qN = line(mN, avN, g1 > .5);
    gap.setAttribute('x1', qD.x); gap.setAttribute('y1', qD.y);
    gap.setAttribute('x2', qN.x); gap.setAttribute('y2', qN.y);
    gap.setAttribute('opacity', g1 > .7 ? 1 : 0);

    // the orthonormal frame, drawn short
    const F = 0.68;
    const t1 = line(eArr[0], [e1[0] * F * g2, e1[1] * F * g2], g2 > .03);
    const t2 = line(eArr[1], [e2[0] * F * g2, e2[1] * F * g2], g2 > .03);
    labE1.moveTo(t1, 34, 16); labE1.show(g2 > .6);
    labE2.moveTo(t2, -30, -18); labE2.show(g2 > .6);
    const c1 = sc.planePoint(th, (e1[0] + e2[0]) * F * 0.32, (e1[1] + e2[1]) * F * 0.32);
    const a1 = sc.planePoint(th, e1[0] * F * 0.32, e1[1] * F * 0.32);
    const b1 = sc.planePoint(th, e2[0] * F * 0.32, e2[1] * F * 0.32);
    sq.setAttribute('d', `M${a1.x} ${a1.y}L${c1.x} ${c1.y}L${b1.x} ${b1.y}`);
    sq.setAttribute('opacity', g2 > .7 ? 1 : 0);

    // the noise, drawn in that frame
    const sd = sigma * 2 * C / B * 3.2;      // magnified, the scale is not the point
    const add = (av, w) => [av[0] + sd * (w[0] * e1[0] + w[1] * e2[0]) * g3,
                            av[1] + sd * (w[0] * e1[1] + w[1] * e2[1]) * g3];
    const eD = line(relD, add(avD, wD), g3 > .03);
    const eN = line(relN, add(avN, wN), g3 > .03);
    tipD.setAttribute('cx', eD.x); tipD.setAttribute('cy', eD.y);
    tipD.setAttribute('opacity', g3 > .03 ? 1 : 0);
    tipN.setAttribute('cx', eN.x); tipN.setAttribute('cy', eN.y);
    tipN.setAttribute('opacity', g3 > .03 ? 1 : 0);
    mD.setAttribute('stroke-opacity', g3 > .3 ? .35 : 1);
    mN.setAttribute('stroke-opacity', g3 > .3 ? .35 : 1);

    if (g3 > .03) startDraws(); else stopDraws();
  }

  sc.onRedraw(() => render());
  sc.enableOrbit();
  sc.draggable(hTh, (pt) => { th = sc.pickUV(pt, th); render(); });
  sc.tool('reset', () => {
    th = th0.slice(); C = 0.85; sigma = 0.9; live = false;
    sC.input.value = C; sS.input.value = sigma; sc.resetView();
  });

  const durations = [0, 800, 1100, 900, 1000];
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