import { makeSaddleScene } from './saddle-scene.js';
import { makeTicker } from '../anim.js';

export default function tangentSpace(el) {
  const sc = makeSaddleScene(el);
  const ticker = makeTicker();

  const p0 = [-0.45, 0.20];
  const d10 = [ 1.15, 0.55];
  const d20 = [-0.55, 1.05];
  const bend1 = [ 0.30, 0.22];
  const bend2 = [-0.25, 0.30];

  let p = p0.slice(), d1 = d10.slice(), d2 = d20.slice();

  sc.drawSurface();

  const gamma = (d, bend) => (t) => [
    p[0] + t * d[0] + bend[0] * t * t,
    p[1] + t * d[1] + bend[1] * t * t
  ];

  const plane = sc.node('plane', 'path', {
    fill: '#B2182B', 'fill-opacity': .12, stroke: '#B2182B',
    'stroke-opacity': .55, 'stroke-width': 1.2
  });
  const curve1 = sc.node('curves', 'path', {
    fill: 'none', stroke: '#243B54', 'stroke-width': 2.6, 'stroke-linecap': 'round'
  });
  const curve2 = sc.node('curves', 'path', {
    fill: 'none', stroke: '#243B54', 'stroke-width': 2.6, 'stroke-linecap': 'round'
  });
  // a few more velocities, to say that they fill a plane
  const extra = Array.from({ length: 6 }, () => sc.node('vectors', 'line', {
    stroke: '#B2182B', 'stroke-opacity': .32, 'stroke-width': 1.4,
    'marker-end': sc.arrow('accent'), opacity: 0
  }));
  const vec1 = sc.node('vectors', 'line', {
    stroke: '#B2182B', 'stroke-width': 2.2, 'marker-end': sc.arrow('accent'), opacity: 0
  });
  const vec2 = sc.node('vectors', 'line', {
    stroke: '#B2182B', 'stroke-width': 2.2, 'marker-end': sc.arrow('accent'), opacity: 0
  });
  const runner = sc.node('dots', 'circle', { r: 5.5, fill: '#243B54', opacity: 0 });

  const hP  = sc.handle('dots', '#243B54');
  const hD1 = sc.handle('dots', '#B2182B');
  const hD2 = sc.handle('dots', '#B2182B');

  const labP  = sc.label('$p$');
  const labPlane = sc.label('$T_p\\mathcal{M}$', 'accent');
  const labG1 = sc.label('$\\gamma_1$');
  const labG2 = sc.label('$\\gamma_2$');
  const labV1 = sc.label('$\\dot\\gamma_1(0)$', 'accent');
  const labV2 = sc.label('$\\dot\\gamma_2(0)$', 'accent');

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

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;
    const g3 = step > 3 ? 1 : step === 3 ? t : 0;
    const g4 = step === 4 ? t : 0;

    const origin = sc.at(p[0], p[1]);
    hP.moveTo(origin);
    labP.moveTo(origin, -10, 28); labP.show(true);

    const live = (step === 1 && t < 1) || (step === 2 && t < 1);
    sweep(curve1, d1, bend1, g1, step === 1);
    sweep(curve2, d2, bend2, g2, step === 2);
    runner.setAttribute('opacity', live ? 1 : 0);

    const e1 = gamma(d1, bend1)(1), e2 = gamma(d2, bend2)(1);
    labG1.moveTo(sc.at(e1[0], e1[1]), 24, -10); labG1.show(g1 > .95);
    labG2.moveTo(sc.at(e2[0], e2[1]), 24, -10); labG2.show(g2 > .95);

    // the velocity at t = 0 appears when the curve reaches p, anchored at p
    // and it stays there, so the plane arrives with both vectors already on it
    const arrow = (node, d, g) => {
      const tip = sc.planePoint(p, d[0] * g, d[1] * g);
      node.setAttribute('x1', origin.x); node.setAttribute('y1', origin.y);
      node.setAttribute('x2', tip.x);    node.setAttribute('y2', tip.y);
      node.setAttribute('opacity', g > .02 ? 1 : 0);
      return tip;
    };
    const a1 = Math.max(0, Math.min(1, (g1 - 0.5) / 0.28));
    const a2 = Math.max(0, Math.min(1, (g2 - 0.5) / 0.28));
    const t1 = arrow(vec1, d1, a1), t2 = arrow(vec2, d2, a2);
    hD1.moveTo(t1); hD1.show(a1 > .9);
    hD2.moveTo(t2); hD2.show(a2 > .9);
    labV1.moveTo(t1, 46, -12); labV1.show(a1 > .7);
    labV2.moveTo(t2, -8, -30); labV2.show(a2 > .7);

    plane.setAttribute('d', sc.planeQuad(p, 1.25 * (0.3 + 0.7 * g3)));
    plane.setAttribute('opacity', g3);
    labPlane.moveTo(sc.planePoint(p, 1.25, -1.25), 34, 8);
    labPlane.show(g3 > .6);

    extra.forEach((node, k) => {
      const s = (k + 1) / (extra.length + 1);
      const w = [d1[0] + s * 2.1 * (d2[0] - d1[0]) - 0.5 * (d2[0] - d1[0]),
                 d1[1] + s * 2.1 * (d2[1] - d1[1]) - 0.5 * (d2[1] - d1[1])];
      const on = Math.max(0, Math.min(1, g4 * 2 - k * 0.22));
      const tip = sc.planePoint(p, w[0] * on, w[1] * on);
      node.setAttribute('x1', origin.x); node.setAttribute('y1', origin.y);
      node.setAttribute('x2', tip.x);    node.setAttribute('y2', tip.y);
      node.setAttribute('opacity', on > .05 ? on : 0);
    });
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

  const durations = [0, 1500, 1500, 700, 900];
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