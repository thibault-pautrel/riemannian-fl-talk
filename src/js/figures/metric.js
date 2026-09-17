import { makeSaddleScene } from './saddle-scene.js';
import { makeGeodesics } from '../geometry/geodesic.js';
import { makeTicker } from '../anim.js';

export default function metric(el) {
  const sc = makeSaddleScene(el);
  const geo = makeGeodesics(sc.surface);
  const ticker = makeTicker();

  const p0 = [-0.45, 0.20];
  const xi0 = [ 1.20, 0.18];          // two tangent vectors, in (X_u, X_v)
  const eta0 = [ 0.12, 1.15];
  const grad0 = [ 0.95, -0.75];       // tangential part of the ambient gradient
  const HEIGHT = 0.85;                // its normal component

  let p = p0.slice(), xi = xi0.slice(), eta = eta0.slice();

  sc.drawSurface();

  // ---- ambient helpers
  const S = sc.surface;
  const unit = (n) => { const L = Math.hypot(n[0], n[1], n[2]); return n.map((x) => x / L); };
  const combine = (p, a, b, h) => {
    const o = S.point(p[0], p[1]);
    const Xu = S.tangentU(p[0], p[1]), Xv = S.tangentV(p[0], p[1]);
    const N = unit(S.normal(p[0], p[1]));
    return [o[0] + a * Xu[0] + b * Xv[0] + h * N[0],
            o[1] + a * Xu[1] + b * Xv[1] + h * N[1],
            o[2] + a * Xu[2] + b * Xv[2] + h * N[2]];
  };

  const plane = sc.node('plane', 'path', {
    fill: '#B2182B', 'fill-opacity': .12, stroke: '#B2182B',
    'stroke-opacity': .55, 'stroke-width': 1.2
  });
  const arc = sc.node('curves', 'path', {
    fill: 'none', stroke: '#B2182B', 'stroke-opacity': .7, 'stroke-width': 1.4, opacity: 0
  });
  const vXi  = sc.node('vectors', 'line', { stroke: '#B2182B', 'stroke-width': 2.2, 'marker-end': sc.arrow('accent'), opacity: 0 });
  const vEta = sc.node('vectors', 'line', { stroke: '#B2182B', 'stroke-width': 2.2, 'marker-end': sc.arrow('accent'), opacity: 0 });
  const vAmb = sc.node('vectors', 'line', {
    stroke: '#243B54', 'stroke-opacity': .6, 'stroke-width': 2,
    'stroke-dasharray': '7 5', 'marker-end': sc.arrow('navy'), opacity: 0
  });
  const drop = sc.node('vectors', 'line', {
    stroke: '#243B54', 'stroke-opacity': .45, 'stroke-width': 1.2, 'stroke-dasharray': '3 4', opacity: 0
  });
  const vGrad = sc.node('vectors', 'line', { stroke: '#243B54', 'stroke-width': 2.4, 'marker-end': sc.arrow('navy'), opacity: 0 });
  const square = sc.node('vectors', 'path', {
    fill: 'none', stroke: '#243B54', 'stroke-opacity': .55, 'stroke-width': 1.1, opacity: 0
  });

  const hP   = sc.handle('dots', '#243B54');
  const hXi  = sc.handle('dots', '#B2182B');
  const hEta = sc.handle('dots', '#B2182B');

  const labP     = sc.label('$p$');
  const labPlane = sc.label('$T_p\\mathcal{M}$', 'accent');
  const labXi    = sc.label('$\\xi$', 'accent');
  const labEta   = sc.label('$\\eta$', 'accent');
  const labAmb   = sc.label('$\\nabla \\bar f(p)$', 'muted');
  const labGrad  = sc.label('$\\operatorname{grad} f(p)$');

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;   // the two vectors and the angle
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;   // ambient gradient
    const g3 = step === 3 ? t : 0;                  // projection

    const origin = sc.at(p[0], p[1]);
    hP.moveTo(origin);
    labP.moveTo(origin, -14, 26); labP.show(true);

    plane.setAttribute('d', sc.planeQuad(p, 1.25));
    plane.setAttribute('opacity', 1);
    labPlane.moveTo(sc.planePoint(p, 1.25, -1.25), 34, 8);
    labPlane.show(true);

    // ---- xi, eta, the angle between them
    const line = (node, tip, on) => {
      node.setAttribute('x1', origin.x); node.setAttribute('y1', origin.y);
      node.setAttribute('x2', tip.x);    node.setAttribute('y2', tip.y);
      node.setAttribute('opacity', on ? 1 : 0);
    };
    const tXi  = sc.planePoint(p, xi[0] * g1, xi[1] * g1);
    const tEta = sc.planePoint(p, eta[0] * g1, eta[1] * g1);
    line(vXi, tXi, g1 > .02);
    line(vEta, tEta, g1 > .02);
    hXi.moveTo(tXi);  hXi.show(g1 > .9);
    hEta.moveTo(tEta); hEta.show(g1 > .9);
    labXi.moveTo(tXi, 26, 2);    labXi.show(g1 > .5);
    labEta.moveTo(tEta, 4, -28); labEta.show(g1 > .5);

    if (g1 > .5) {
      const pts = [];
      for (let i = 0; i <= 26; i++) {
        const s = Math.PI / 2 * i / 26, c = Math.cos(s), sn = Math.sin(s);
        pts.push(sc.planePoint(p, 0.42 * (c * xi[0] + sn * eta[0]),
                                  0.42 * (c * xi[1] + sn * eta[1])));
      }
      arc.setAttribute('d', pts.map((q, i) => (i ? 'L' : 'M') + q.x.toFixed(2) + ' ' + q.y.toFixed(2)).join(''));
      arc.setAttribute('opacity', 1);
    } else {
      arc.setAttribute('opacity', 0);
    }

    // ---- ambient gradient, then its projection
    const tip3 = combine(p, grad0[0], grad0[1], HEIGHT * 1);
    const tipAmb = sc.amb(combine(p, grad0[0] * g2, grad0[1] * g2, HEIGHT * g2));
    line(vAmb, tipAmb, g2 > .02);
    labAmb.moveTo(tipAmb, 4, -26); labAmb.show(g2 > .6);

    if (g3 > 0.001) {
      const proj = sc.amb(combine(p, grad0[0], grad0[1], HEIGHT * (1 - g3)));
      const foot = sc.amb(combine(p, grad0[0], grad0[1], 0));
      drop.setAttribute('x1', sc.amb(tip3).x); drop.setAttribute('y1', sc.amb(tip3).y);
      drop.setAttribute('x2', proj.x);         drop.setAttribute('y2', proj.y);
      drop.setAttribute('opacity', 1);
      line(vGrad, proj, true);
      labGrad.moveTo(foot, 8, 30); labGrad.show(g3 > .8);

      // right angle mark at the foot
      const s = 0.14, k = 0.86;
      const a = sc.amb(combine(p, grad0[0] * k, grad0[1] * k, 0));
      const b = sc.amb(combine(p, grad0[0] * k, grad0[1] * k, s));
      const c = sc.amb(combine(p, grad0[0], grad0[1], s));
      square.setAttribute('d', `M${a.x} ${a.y}L${b.x} ${b.y}L${c.x} ${c.y}`);
      square.setAttribute('opacity', g3 > .8 ? 1 : 0);
    } else {
      drop.setAttribute('opacity', 0);
      vGrad.setAttribute('opacity', 0);
      square.setAttribute('opacity', 0);
      labGrad.show(false);
    }
  }

  const clamp = (ab, max = 1.5, min = 0.35) => {
    const n = Math.hypot(ab[0], ab[1]);
    if (n < min) return ab.map((x) => x * min / (n || 1));
    return n > max ? ab.map((x) => x * max / n) : ab;
  };

  sc.onRedraw(() => render());
  sc.enableOrbit();
  sc.draggable(hP,   (pt) => { p = sc.pickUV(pt, p); render(); });
  sc.draggable(hXi,  (pt) => { const ab = sc.pickPlane(p, pt); if (ab) { xi = clamp(ab); render(); } });
  sc.draggable(hEta, (pt) => { const ab = sc.pickPlane(p, pt); if (ab) { eta = clamp(ab); render(); } });

  sc.tool('reset', () => { p = p0.slice(); xi = xi0.slice(); eta = eta0.slice(); sc.resetView(); });

  const durations = [0, 900, 800, 900];
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