import { makeSaddleScene } from './saddle-scene.js';
import { makeGeodesics } from '../geometry/geodesic.js';
import { makeTicker } from '../anim.js';

/* The chord of the ambient space, then the geodesic.

   This figure shares a slide with the exponential one, which owns steps 3
   and 4, so everything here is done by step 2 and then stays on screen. */

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

  const hP = sc.handle('dots', '#243B54');
  const hQ = sc.handle('dots', '#243B54');

  const labP     = sc.label('$p$');
  const labQ     = sc.label('$q$');
  const labGamma = sc.label('$\\gamma$', 'accent');
  const labChord = sc.label('off the surface', 'muted');

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;   // the chord
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;   // the geodesic, then kept

    const a = sc.at(p[0], p[1]), b = sc.at(q[0], q[1]);
    hP.moveTo(a); labP.moveTo(a, -14, 26); labP.show(true);
    hQ.moveTo(b); labQ.moveTo(b, 16, 26);  labQ.show(true);

    // ---- the straight segment of the ambient space
    chord.setAttribute('x1', a.x); chord.setAttribute('y1', a.y);
    chord.setAttribute('x2', a.x + (b.x - a.x) * g1);
    chord.setAttribute('y2', a.y + (b.y - a.y) * g1);
    chord.setAttribute('opacity', g1 > .02 ? 1 : 0);
    labChord.moveTo({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, 0, -24);
    labChord.show(g1 > .85 && g2 < .3);

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
  }

  sc.onRedraw(() => render());
  sc.enableOrbit();
  sc.draggable(hP, (pt) => { p = sc.pickUV(pt, p); reshoot(); render(); });
  sc.draggable(hQ, (pt) => { q = sc.pickUV(pt, q); reshoot(); render(); });

  sc.tool('reset', () => { p = p0.slice(); q = q0.slice(); reshoot(); sc.resetView(); });

  const durations = [0, 800, 1500];
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