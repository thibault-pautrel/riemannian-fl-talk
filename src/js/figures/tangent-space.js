import { makeSaddleScene } from './saddle-scene.js';
import { makeTicker } from '../anim.js';

/* One figure, three ideas.

   step 2: curves through p, their velocities, and the plane they fill
   step 3: the picture cleans up to the plane and two vectors, the metric
   step 4: an ambient gradient, and its projection: the Riemannian gradient */

const AMB = '#C77D24';          // ambient objects
const ACC = '#B2182B';          // tangent objects

export default function tangentSpace(el) {
  const sc = makeSaddleScene(el);
  const ticker = makeTicker();

  const p0 = [-0.45, 0.20];
  const d10 = [ 1.15, 0.55];
  const d20 = [-0.55, 1.05];
  const bend1 = [ 0.30, 0.22];
  const bend2 = [-0.25, 0.30];
  const GRAD = [0.62, -0.22, 0.92];     // ambient gradient direction, fixed

  let p = p0.slice(), d1 = d10.slice(), d2 = d20.slice();

  sc.drawSurface();

  const gamma = (d, bend) => (t) => [
    p[0] + t * d[0] + bend[0] * t * t,
    p[1] + t * d[1] + bend[1] * t * t
  ];

  const plane = sc.node('plane', 'path', {
    fill: ACC, 'fill-opacity': .12, stroke: ACC,
    'stroke-opacity': .55, 'stroke-width': 1.2
  });
  const curve1 = sc.node('curves', 'path', {
    fill: 'none', stroke: '#243B54', 'stroke-width': 2.6, 'stroke-linecap': 'round'
  });
  const curve2 = sc.node('curves', 'path', {
    fill: 'none', stroke: '#243B54', 'stroke-width': 2.6, 'stroke-linecap': 'round'
  });
  const extra = Array.from({ length: 6 }, () => sc.node('vectors', 'line', {
    stroke: ACC, 'stroke-opacity': .32, 'stroke-width': 1.4,
    'marker-end': sc.arrow('accent'), opacity: 0
  }));
  const vec1 = sc.node('vectors', 'line', {
    stroke: ACC, 'stroke-width': 2.2, 'marker-end': sc.arrow('accent'), opacity: 0
  });
  const vec2 = sc.node('vectors', 'line', {
    stroke: ACC, 'stroke-width': 2.2, 'marker-end': sc.arrow('accent'), opacity: 0
  });
  const runner = sc.node('dots', 'circle', { r: 5.5, fill: '#243B54', opacity: 0 });

  // the gradient pair
  const gAmb = sc.node('vectors', 'line', {
    stroke: AMB, 'stroke-width': 2.6, 'marker-end': sc.arrow('amber'), opacity: 0
  });
  const gTan = sc.node('vectors', 'line', {
    stroke: ACC, 'stroke-width': 3, 'marker-end': sc.arrow('accent'), opacity: 0
  });
  const drop = sc.node('vectors', 'line', {
    stroke: '#243B54', 'stroke-opacity': .45, 'stroke-width': 1.2,
    'stroke-dasharray': '3 4', opacity: 0
  });

  const hP  = sc.handle('dots', '#243B54');
  const hD1 = sc.handle('dots', ACC);
  const hD2 = sc.handle('dots', ACC);

  const labP  = sc.label('$p$');
  const labPlane = sc.label('$T_p\\mathcal{M}$', 'accent');
  const labG1 = sc.label('$\\gamma_1$');
  const labG2 = sc.label('$\\gamma_2$');
  const labV1 = sc.label('$\\dot\\gamma_1(0)$', 'accent');
  const labV2 = sc.label('$\\dot\\gamma_2(0)$', 'accent');
  const labU = sc.label('$u$', 'accent');
  const labV = sc.label('$v$', 'accent');
  const labAmb = sc.label('$\\nabla\\bar f(p)$', 'amber');
  const labTan = sc.label('$\\operatorname{grad} f(p)$', 'accent');

  let step = 0, lastT = 1;

  // the curve is drawn from t = -1 up to t = -1 + 2g, and the runner sits there
  function sweep(node, d, bend, g, live) {
    if (g < 0.001) { node.setAttribute('opacity', 0); return; }
    node.setAttribute('opacity', 1);
    const f = gamma(d, bend), tEnd = -1 + 2 * g, pts = [];
    for (let i = 0; i <= 52; i++) pts.push(f(-1 + (tEnd + 1) * i / 52));
    node.setAttribute('d', sc.pathUV(pts));
    if (live) {
      const here = f(tEnd), q = sc.at(here[0], here[1]);
      runner.setAttribute('cx', q.x); runner.setAttribute('cy', q.y);
    }
  }

  // tangent coordinates of the ambient gradient at p
  function projGrad() {
    const Xu = sc.surface.tangentU(p[0], p[1]), Xv = sc.surface.tangentV(p[0], p[1]);
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const g11 = dot(Xu, Xu), g12 = dot(Xu, Xv), g22 = dot(Xv, Xv);
    const r1 = dot(GRAD, Xu), r2 = dot(GRAD, Xv);
    const det = g11 * g22 - g12 * g12;
    return [(g22 * r1 - g12 * r2) / det, (-g12 * r1 + g11 * r2) / det];
  }

  function render(t = lastT) {
    lastT = t;
    // step 2: curves, velocities, then the plane, in one sequenced animation
    const sC = step > 2 ? 1 : step === 2 ? t : 0;
    const seg = (a, b) => Math.max(0, Math.min(1, (sC - a) / (b - a)));
    const g1 = seg(0, 0.40), g2 = seg(0.36, 0.76);
    const g3 = Math.max(seg(0.72, 1), step > 2 ? 1 : 0);   // the plane
    const clean = step > 3 ? 1 : step === 3 ? t : 0;       // only plane and vectors
    const g4 = step > 4 ? 1 : step === 4 ? t : 0;          // the gradient

    const origin = sc.at(p[0], p[1]);
    hP.moveTo(origin);
    labP.moveTo(origin, -10, 28); labP.show(true);

    const live = step === 2 && t < 1 && sC < 0.76;
    sweep(curve1, d1, bend1, g1, live && g1 < 1);
    sweep(curve2, d2, bend2, g2, live && g1 >= 1);
    curve1.setAttribute('opacity', g1 > 0.001 ? 1 - clean : 0);
    curve2.setAttribute('opacity', g2 > 0.001 ? 1 - clean : 0);
    runner.setAttribute('opacity', live ? 1 : 0);

    const e1 = gamma(d1, bend1)(1), e2 = gamma(d2, bend2)(1);
    labG1.moveTo(sc.at(e1[0], e1[1]), 24, -10); labG1.show(g1 > .95 && clean < .4);
    labG2.moveTo(sc.at(e2[0], e2[1]), 24, -10); labG2.show(g2 > .95 && clean < .4);

    const arrow = (node, d, g) => {
      const tip = sc.planePoint(p, d[0] * g, d[1] * g);
      node.setAttribute('x1', origin.x); node.setAttribute('y1', origin.y);
      node.setAttribute('x2', tip.x);    node.setAttribute('y2', tip.y);
      node.setAttribute('opacity', g > .02 ? 1 : 0);
      return tip;
    };
    const a1 = Math.max(0, Math.min(1, (g1 - 0.5) / 0.28));
    const a2 = Math.max(0, Math.min(1, (g2 - 0.5) / 0.28));
    const t1 = arrow(vec1, d1, a1 * (1 - 0.8 * g4));
    const t2 = arrow(vec2, d2, a2 * (1 - 0.8 * g4));
    hD1.moveTo(t1); hD1.show(a1 > .9 && g4 < .1);
    hD2.moveTo(t2); hD2.show(a2 > .9 && g4 < .1);
    labV1.moveTo(t1, 46, -12); labV1.show(a1 > .7 && clean < .4);
    labV2.moveTo(t2, -8, -30); labV2.show(a2 > .7 && clean < .4);
    labU.moveTo(t1, 22, -16); labU.show(clean > .6 && g4 < .1);
    labV.moveTo(t2, -8, -26); labV.show(clean > .6 && g4 < .1);

    plane.setAttribute('d', sc.planeQuad(p, 1.25 * (0.3 + 0.7 * g3)));
    plane.setAttribute('opacity', g3);
    labPlane.moveTo(sc.planePoint(p, 1.25, -1.25), 34, 8);
    labPlane.show(g3 > .6);

    extra.forEach((node, k) => {
      const s = (k + 1) / (extra.length + 1);
      const w = [d1[0] + s * 2.1 * (d2[0] - d1[0]) - 0.5 * (d2[0] - d1[0]),
                 d1[1] + s * 2.1 * (d2[1] - d1[1]) - 0.5 * (d2[1] - d1[1])];
      const on = Math.max(0, Math.min(1, g3 * 2 - k * 0.22)) * (1 - clean);
      const tip = sc.planePoint(p, w[0] * on, w[1] * on);
      node.setAttribute('x1', origin.x); node.setAttribute('y1', origin.y);
      node.setAttribute('x2', tip.x);    node.setAttribute('y2', tip.y);
      node.setAttribute('opacity', on > .05 ? on * 0.8 : 0);
    });

    // ---- the Riemannian gradient, on the same picture
    if (g4 > 0.01) {
      const L = 1.15;
      const o3 = sc.surface.point(p[0], p[1]);
      const ambTip = sc.amb([o3[0] + L * GRAD[0] * g4,
                             o3[1] + L * GRAD[1] * g4,
                             o3[2] + L * GRAD[2] * g4]);
      gAmb.setAttribute('x1', origin.x); gAmb.setAttribute('y1', origin.y);
      gAmb.setAttribute('x2', ambTip.x); gAmb.setAttribute('y2', ambTip.y);
      gAmb.setAttribute('opacity', 1);
      labAmb.moveTo(ambTip, 30, -14); labAmb.show(g4 > .5);

      const ab = projGrad();
      const k = Math.max(0, Math.min(1, (g4 - 0.35) / 0.65));
      const tanTip = sc.planePoint(p, L * ab[0] * k, L * ab[1] * k);
      gTan.setAttribute('x1', origin.x); gTan.setAttribute('y1', origin.y);
      gTan.setAttribute('x2', tanTip.x); gTan.setAttribute('y2', tanTip.y);
      gTan.setAttribute('opacity', k > .02 ? 1 : 0);
      labTan.moveTo(tanTip, 6, 30); labTan.show(k > .6);

      const full = sc.amb([o3[0] + L * GRAD[0], o3[1] + L * GRAD[1], o3[2] + L * GRAD[2]]);
      drop.setAttribute('x1', full.x); drop.setAttribute('y1', full.y);
      drop.setAttribute('x2', tanTip.x); drop.setAttribute('y2', tanTip.y);
      drop.setAttribute('opacity', k > .6 ? 1 : 0);
    } else {
      [gAmb, gTan, drop].forEach((n) => n.setAttribute('opacity', 0));
      labAmb.show(false); labTan.show(false);
    }
  }

  function clamp(ab, max = 1.6, min = 0.3) {
    const n = Math.hypot(ab[0], ab[1]);
    if (n < min) return ab.map((x) => x * min / (n || 1));
    return n > max ? ab.map((x) => x * max / n) : ab;
  }

  sc.onRedraw(() => render());
  sc.enableOrbit();
  sc.draggable(hP, (pt) => { p = sc.pickUV(pt, p); render(); });
  sc.draggable(hD1, (pt) => { const ab = sc.pickPlane(p, pt); if (ab) { d1 = clamp(ab); render(); } });
  sc.draggable(hD2, (pt) => { const ab = sc.pickPlane(p, pt); if (ab) { d2 = clamp(ab); render(); } });

  sc.tool('reset', () => { p = p0.slice(); d1 = d10.slice(); d2 = d20.slice(); sc.resetView(); });

  const durations = [0, 0, 3200, 700, 1200];
  render(1);

  return {
    setStep(n) {
      if (n === step) return;
      const back = n < step;
      step = n;
      ticker.run(back ? 0 : durations[n] ?? 600, render, { instant: back });
    },
    activate() {},
    deactivate() { ticker.stop(); }
  };
}