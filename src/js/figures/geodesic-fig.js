import { makeSaddleScene } from './saddle-scene.js';
import { makeGeodesics } from '../geometry/geodesic.js';
import { makeTicker } from '../anim.js';

export default function geodesicFig(el) {
  const sc = makeSaddleScene(el);
  const geo = makeGeodesics(sc.surface);
  const ticker = makeTicker();

  const p0 = [-1.25, 0.50];
  const q0 = [ 1.55, 0.85];
  let p = p0.slice(), q = q0.slice();

  // recomputed whenever a point moves
  let vel = geo.log(p, q);
  const reshoot = () => { vel = geo.log(p, q); };

  sc.drawSurface();

  const chord = sc.node('curves', 'line', {
    stroke: '#243B54', 'stroke-opacity': .55, 'stroke-width': 2,
    'stroke-dasharray': '8 6', opacity: 0
  });
  const geod = sc.node('curves', 'path', {
    fill: 'none', stroke: '#B2182B', 'stroke-width': 3,
    'stroke-linecap': 'round', opacity: 0
  });
  const vdot = sc.node('vectors', 'line', {
    stroke: '#B2182B', 'stroke-width': 2, 'marker-end': sc.arrow('accent'), opacity: 0
  });

  const hP = sc.handle('dots', '#243B54');
  const hQ = sc.handle('dots', '#243B54');

  const labP     = sc.label('$p$');
  const labQ     = sc.label('$q$');
  const labGamma = sc.label('$\\gamma$', 'accent');
  const labVdot  = sc.label('$\\dot\\gamma$', 'accent');

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;   // the chord
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;   // the geodesic
    const g3 = step === 3 ? t : 0;                  // velocity and length

    const a = sc.at(p[0], p[1]), b = sc.at(q[0], q[1]);
    hP.moveTo(a); labP.moveTo(a, -14, 26); labP.show(true);
    hQ.moveTo(b); labQ.moveTo(b, 16, 26);  labQ.show(true);

    // ---- the straight segment of the ambient space
    chord.setAttribute('x1', a.x); chord.setAttribute('y1', a.y);
    chord.setAttribute('x2', a.x + (b.x - a.x) * g1);
    chord.setAttribute('y2', a.y + (b.y - a.y) * g1);
    chord.setAttribute('opacity', g1 > .02 ? 1 : 0);

    // ---- the geodesic, drawn progressively
    if (g2 > 0.001) {
      const arc = geo.trace(p, vel, g2, 60);
      geod.setAttribute('d', sc.pathUV(arc));
      geod.setAttribute('opacity', 1);
      const mid = arc[Math.round(arc.length * 0.36)];
      labGamma.moveTo(sc.at(mid[0], mid[1]), -6, 30);
      labGamma.show(g2 > .5);
    } else {
      geod.setAttribute('opacity', 0);
      labGamma.show(false);
    }

    // ---- velocity at mid curve, and the two lengths
    if (g3 > 0.001) {
      const s = 0.55;
      const here = geo.trace(p, vel, s, 40).at(-1);
      const sp = geo.trace(p, vel, s + 0.02, 42).at(-1);
      const dir = [(sp[0] - here[0]) / 0.02, (sp[1] - here[1]) / 0.02];
      const o = sc.at(here[0], here[1]);
      const tip = sc.planePoint(here, dir[0] * 0.28 * g3, dir[1] * 0.28 * g3);
      vdot.setAttribute('x1', o.x); vdot.setAttribute('y1', o.y);
      vdot.setAttribute('x2', tip.x); vdot.setAttribute('y2', tip.y);
      vdot.setAttribute('opacity', 1);
      labVdot.moveTo(tip, 24, -12); labVdot.show(g3 > .6);
    } else {
      vdot.setAttribute('opacity', 0);
      labVdot.show(false);
    }
  }

  sc.onRedraw(() => render());
  sc.enableOrbit();
  sc.draggable(hP, (pt) => { p = sc.pickUV(pt, p); reshoot(); render(); });
  sc.draggable(hQ, (pt) => { q = sc.pickUV(pt, q); reshoot(); render(); });

  sc.tool('reset', () => { p = p0.slice(); q = q0.slice(); reshoot(); sc.resetView(); });

  const durations = [0, 800, 1500, 800];
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