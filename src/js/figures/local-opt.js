import { makeSaddleScene } from './saddle-scene.js';
import { makeTicker } from '../anim.js';

/* One SGD step, Euclidean then Riemannian.
   The cost is a linear ambient function, so its gradient is a fixed
   ambient vector: the Euclidean step visibly leaves the manifold. */

const BLUE = '#0072B2', RED = '#B2182B', NAVY = '#243B54';

export default function localOpt(el) {
  const sc = makeSaddleScene(el);
  const ticker = makeTicker();
  const S = sc.surface;

  const x0 = [-0.35, 0.30];
  let x = x0.slice();
  const STEP = [-0.95, 0.72, 0.62];     // - eta * grad fbar, ambient and constant

  sc.drawSurface();

  // ambient vector -> coordinates in the basis (X_u, X_v)
  function toTangent(uv, s) {
    const [fu, fv] = S.grad(uv[0], uv[1]);
    const g11 = 1 + fu * fu, g12 = fu * fv, g22 = 1 + fv * fv;
    const r1 = s[0] + s[2] * fu, r2 = s[1] + s[2] * fv;
    const det = g11 * g22 - g12 * g12;
    return [(g22 * r1 - g12 * r2) / det, (-g12 * r1 + g11 * r2) / det];
  }
  const shifted = (uv) => {
    const o = S.point(uv[0], uv[1]);
    return [o[0] + STEP[0], o[1] + STEP[1], o[2] + STEP[2]];
  };

  const plane = sc.node('plane', 'path', {
    fill: RED, 'fill-opacity': .10, stroke: RED, 'stroke-opacity': .5, 'stroke-width': 1.2
  });
  const vEuc = sc.node('vectors', 'line', {
    stroke: BLUE, 'stroke-width': 2.8, 'marker-end': sc.arrow('navy'), opacity: 0
  });
  const vRie = sc.node('vectors', 'line', {
    stroke: RED, 'stroke-width': 2.6, 'marker-end': sc.arrow('accent'), opacity: 0
  });
  const projLine = sc.node('vectors', 'line', {
    stroke: NAVY, 'stroke-opacity': .45, 'stroke-width': 1.3, 'stroke-dasharray': '4 4', opacity: 0
  });
  const retrLine = sc.node('vectors', 'line', {
    stroke: NAVY, 'stroke-opacity': .5, 'stroke-width': 1.4, 'stroke-dasharray': '6 5',
    'marker-end': sc.arrow('navy'), opacity: 0
  });
  const onM = sc.node('curves', 'path', {
    fill: 'none', stroke: RED, 'stroke-opacity': .85, 'stroke-width': 2.8,
    'stroke-linecap': 'round', opacity: 0
  });

  const hX   = sc.handle('dots', NAVY);
  const dotE = sc.node('dots', 'circle', { r: 5.5, fill: BLUE, opacity: 0 });
  const dotN = sc.dot('dots');

  const labX     = sc.label('$x$');
  const labPlane = sc.label('$T_x\\mathcal{M}$', 'accent');
  const labEuc   = sc.label('$-\\eta\\,\\nabla f_i(x;\\mathcal{B}_j)$');
  const labOff   = sc.label('$\\notin\\mathcal{M}$', 'muted');
  const labRie   = sc.label('$\\xi=-\\eta\\,\\operatorname{grad}f_i(x)$', 'accent');
  const labR     = sc.label('$R_x(\\xi)$', 'muted');
  const labXi    = sc.label('$x+\\xi$', 'muted');
  const labPi    = sc.label('$\\Pi$', 'muted');
  const labNext  = sc.label('$x_{\\text{next}}$');
  labEuc.node.style.color = BLUE;

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;   // euclidean step, off M
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;   // riemannian gradient
    const g3 = step > 3 ? 1 : step === 3 ? t : 0;   // retraction
    const g4 = step === 4 ? t : 0;                  // the retraction is a projection

    const o = sc.at(x[0], x[1]);
    hX.moveTo(o); labX.moveTo(o, -18, 24); labX.show(true);

    plane.setAttribute('d', sc.planeQuad(x, 1.15));
    plane.setAttribute('opacity', g2 > 0.02 ? 1 : 0);
    labPlane.moveTo(sc.planePoint(x, 1.15, -1.15), 34, 8);
    labPlane.show(g2 > .5);

    // ---- the ambient step, shown alone on step 1 and dropped afterwards
    const euclid = step === 1;
    const base = S.point(x[0], x[1]);
    const E = sc.amb([base[0] + STEP[0] * g1, base[1] + STEP[1] * g1, base[2] + STEP[2] * g1]);
    vEuc.setAttribute('x1', o.x); vEuc.setAttribute('y1', o.y);
    vEuc.setAttribute('x2', E.x); vEuc.setAttribute('y2', E.y);
    vEuc.setAttribute('opacity', euclid && g1 > .02 ? 1 : 0);
    dotE.setAttribute('cx', E.x); dotE.setAttribute('cy', E.y);
    dotE.setAttribute('opacity', euclid && g1 > .9 ? 1 : 0);
    labEuc.moveTo(sc.amb([base[0] + STEP[0] * .5, base[1] + STEP[1] * .5, base[2] + STEP[2] * .5]), 96, -8);
    labEuc.show(euclid && g1 > .5);
    labOff.moveTo(E, 10, -26); labOff.show(euclid && g1 > .95);

    // ---- its tangential part
    const ab = toTangent(x, STEP);
    const T = sc.planePoint(x, ab[0] * g2, ab[1] * g2);
    vRie.setAttribute('x1', o.x); vRie.setAttribute('y1', o.y);
    vRie.setAttribute('x2', T.x); vRie.setAttribute('y2', T.y);
    vRie.setAttribute('opacity', g2 > .02 ? 1 : 0);
    const Tfull = sc.planePoint(x, ab[0], ab[1]);
    projLine.setAttribute('opacity', 0);
    labRie.moveTo(sc.planePoint(x, ab[0] * .55, ab[1] * .55), -26, -26);
    labRie.show(g2 > .5);

    // ---- the retraction, then the fact that it is a projection
    const next = [x[0] + ab[0], x[1] + ab[1]];
    const N = sc.at(next[0], next[1]);
    // the curve traced on M stays visible for the rest of the slide
    if (g3 > 0.001) {
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const s = g3 * i / 40;
        pts.push([x[0] + s * ab[0], x[1] + s * ab[1]]);
      }
      onM.setAttribute('d', sc.pathUV(pts));
      onM.setAttribute('opacity', 1);
      onM.setAttribute('stroke-dasharray', 'none');
      onM.setAttribute('stroke-opacity', .85);
      const head = sc.at(x[0] + ab[0] * g3, x[1] + ab[1] * g3);
      dotN.moveTo(g3 > .99 ? N : head); dotN.show(true);
      labNext.moveTo(N, 28, 24); labNext.show(g3 > .9);
      labR.moveTo(sc.at(x[0] + ab[0] * .5, x[1] + ab[1] * .5), -12, 34);
      labR.show(g3 > .5 && g4 < .05);
    } else {
      onM.setAttribute('opacity', 0); dotN.show(false);
      labNext.show(false); labR.show(false);
    }

    // ---- x + xi in the ambient space, and Pi bringing it back
    if (g4 > 0.001) {
      const Xi = sc.amb([base[0] + Tamb()[0], base[1] + Tamb()[1], base[2] + Tamb()[2]]);
      retrLine.setAttribute('x1', Xi.x); retrLine.setAttribute('y1', Xi.y);
      retrLine.setAttribute('x2', Xi.x + (N.x - Xi.x) * g4);
      retrLine.setAttribute('y2', Xi.y + (N.y - Xi.y) * g4);
      retrLine.setAttribute('opacity', 1);
      labXi.moveTo(Xi, 30, -22); labXi.show(true);
      labPi.moveTo({ x: (Xi.x + N.x) / 2, y: (Xi.y + N.y) / 2 }, 46, 18); labPi.show(g4 > .3);
    } else {
      retrLine.setAttribute('opacity', 0);
      labXi.show(false); labPi.show(false);
    }
  }

  // the tangential step written as an ambient vector, for x + xi
  function Tamb() {
    const ab = toTangent(x, STEP);
    const Xu = S.tangentU(x[0], x[1]), Xv = S.tangentV(x[0], x[1]);
    return [ab[0] * Xu[0] + ab[1] * Xv[0], ab[0] * Xu[1] + ab[1] * Xv[1], ab[0] * Xu[2] + ab[1] * Xv[2]];
  }

  sc.onRedraw(() => render());
  sc.enableOrbit();
  sc.draggable(hX, (pt) => { x = sc.pickUV(pt, x); render(); });
  sc.tool('reset', () => { x = x0.slice(); sc.resetView(); });

  const durations = [0, 900, 900, 1100, 900];
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