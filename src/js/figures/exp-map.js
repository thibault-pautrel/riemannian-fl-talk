import { makeSaddleScene } from './saddle-scene.js';
import { makeGeodesics } from '../geometry/geodesic.js';
import { makeTicker } from '../anim.js';

export default function expMap(el) {
  const sc = makeSaddleScene(el);
  const geo = makeGeodesics(sc.saddle);
  const ticker = makeTicker();

  // state, in parameter coordinates. v is written in the basis (X_u, X_v).
  const p0 = [-1.25,  0.50];
  const v0 = [ 2.8978, 0.7765];   // length 3.0, direction 15 degrees
  let p = p0.slice();
  let v = v0.slice();

  sc.drawSurface();

  const plane = sc.node('plane', 'path', {
    fill: '#B2182B', 'fill-opacity': .12, stroke: '#B2182B',
    'stroke-opacity': .55, 'stroke-width': 1.2
  });
  const retr = sc.node('curves', 'path', {
    fill: 'none', stroke: '#C77D24', 'stroke-width': 2.4,
    'stroke-dasharray': '9 5 2 5', 'stroke-linecap': 'round'
  });
  const geod = sc.node('curves', 'path', {
    fill: 'none', stroke: '#B2182B', 'stroke-width': 3, 'stroke-linecap': 'round'
  });
  const vec = sc.node('vectors', 'line', {
    stroke: '#B2182B', 'stroke-width': 2.2, 'marker-end': sc.arrow('accent')
  });
  const drop = sc.node('vectors', 'line', {
    stroke: '#243B54', 'stroke-opacity': .45, 'stroke-width': 1.2, 'stroke-dasharray': '3 4'
  });

  const hP = sc.handle('dots', '#243B54');   // drag the base point
  const hV = sc.handle('dots', '#B2182B');   // drag the tip of v
  const dotQ = sc.dot('dots');
  const walker = sc.node('dots', 'circle', { r: 5.5, fill: '#B2182B' });

  const labP     = sc.label('$p$');
  const labPlane = sc.label('$T_p\\mathcal{M}$', 'accent');
  const labV     = sc.label('$v$', 'accent');
  const labExp   = sc.label('$\\exp_p(v)$');
  const labRetr  = sc.label('$R_p(tv)$', 'amber');

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;
    const g3 = step === 3 ? t : 0;

    const origin = sc.at(p[0], p[1]);
    hP.moveTo(origin);
    labP.moveTo(origin, -8, 28);
    labP.show(true);

    // ---- tangent plane and the vector v
    plane.setAttribute('d', sc.planeQuad(p, 1.2 * (0.25 + 0.75 * g1)));
    plane.setAttribute('opacity', g1);
    labPlane.moveTo(sc.planePoint(p, 1.2, -1.2), 34, 8);
    labPlane.show(g1 > .6);

    const tip = sc.planePoint(p, v[0] * g1, v[1] * g1);
    vec.setAttribute('x1', origin.x); vec.setAttribute('y1', origin.y);
    vec.setAttribute('x2', tip.x);    vec.setAttribute('y2', tip.y);
    vec.setAttribute('opacity', g1 > .02 ? 1 : 0);
    hV.moveTo(tip); hV.show(g1 > .9);
    labV.moveTo(sc.planePoint(p, v[0] * .55 * g1, v[1] * .55 * g1), 4, -26);
    labV.show(g1 > .5);


    // ---- geodesic, and exp_p(tv) walking along it
    if (g2 > 0.001) {
      const arc = geo.trace(p, v, g2, 56);
      geod.setAttribute('d', sc.pathUV(arc));
      geod.setAttribute('opacity', 1);
      const end = arc.at(-1);
      const endPt = sc.at(end[0], end[1]);
      walker.setAttribute('cx', endPt.x); walker.setAttribute('cy', endPt.y);
      walker.setAttribute('opacity', 1);
      const onVec = sc.planePoint(p, v[0] * g2, v[1] * g2);
      drop.setAttribute('x1', onVec.x); drop.setAttribute('y1', onVec.y);
      drop.setAttribute('x2', endPt.x); drop.setAttribute('y2', endPt.y);
      drop.setAttribute('opacity', 1);
      dotQ.moveTo(endPt); dotQ.show(g2 > .99);
      labExp.moveTo(endPt, 30, -22); labExp.show(g2 > .9);
    } else {
      geod.setAttribute('opacity', 0);
      walker.setAttribute('opacity', 0);
      drop.setAttribute('opacity', 0);
      dotQ.show(false); labExp.show(false);
    }

    // ---- the retraction, straight in the parameter square
    if (g3 > 0.001) {
      const pts = [];
      for (let i = 0; i <= 48; i++) {
        const s = g3 * i / 48;
        pts.push([p[0] + s * v[0], p[1] + s * v[1]]);
      }
      retr.setAttribute('d', sc.pathUV(pts));
      retr.setAttribute('opacity', 1);
      const e = pts[Math.round(pts.length * 0.78)];   // label before the end
      labRetr.moveTo(sc.at(e[0], e[1]), -14, 32);
      labRetr.show(g3 > .8);
    } else {
      retr.setAttribute('opacity', 0);
      labRetr.show(false);
    }
  }

  // ---- interaction
  sc.onRedraw(() => render());
  sc.enableOrbit();

  sc.draggable(hP, (pt) => {
    p = sc.pickUV(pt, p);
    render();
  });

  sc.draggable(hV, (pt) => {
    const ab = sc.pickPlane(p, pt);
    if (!ab) return;
    const len = Math.hypot(ab[0], ab[1]);
    if (len < 0.25) return;                      // keep the vector visible
    v = len > 3.4 ? [ab[0] * 3.4 / len, ab[1] * 3.4 / len] : ab;
    render();
  });

  sc.tool('reset', () => { p = p0.slice(); v = v0.slice(); sc.resetView(); });

  const durations = [0, 700, 1500, 900];
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