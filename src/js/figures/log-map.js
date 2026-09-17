import { makeSaddleScene } from './saddle-scene.js';
import { makeGeodesics } from '../geometry/geodesic.js';
import { makeTicker } from '../anim.js';

export default function logMap(el) {
  const sc = makeSaddleScene(el);
  const geo = makeGeodesics(sc.surface);
  const ticker = makeTicker();

  const p0 = [-1.25, 0.50];
  const q0 = [ 1.55, 0.85];
  let p = p0.slice(), q = q0.slice();

  // the successive guesses of the shooting method, replayed on step 2
  let guesses = [], vel = [0, 0];

  function reshoot() {
    guesses = [];
    let w = [q[0] - p[0], q[1] - p[1]];
    for (let i = 0; i < 8; i++) {
      guesses.push(w.slice());
      const e = geo.exp(p, w);
      const r = [e[0] - q[0], e[1] - q[1]];
      if (Math.hypot(r[0], r[1]) < 1e-9) break;
      const eps = 1e-6, J = [[0, 0], [0, 0]];
      for (let j = 0; j < 2; j++) {
        const z = w.slice(); z[j] += eps;
        const ej = geo.exp(p, z);
        J[0][j] = (ej[0] - e[0]) / eps;
        J[1][j] = (ej[1] - e[1]) / eps;
      }
      const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
      if (Math.abs(det) < 1e-12) break;
      w = [w[0] - ( J[1][1] * r[0] - J[0][1] * r[1]) / det,
           w[1] - (-J[1][0] * r[0] + J[0][0] * r[1]) / det];
    }
    vel = geo.log(p, q);
    guesses.push(vel.slice());
  }
  reshoot();

  sc.drawSurface();

  const plane = sc.node('plane', 'path', {
    fill: '#B2182B', 'fill-opacity': .12, stroke: '#B2182B',
    'stroke-opacity': .55, 'stroke-width': 1.2, opacity: 0
  });
  const tries = sc.node('curves', 'path', {
    fill: 'none', stroke: '#243B54', 'stroke-opacity': .35,
    'stroke-width': 1.6, 'stroke-dasharray': '5 5', opacity: 0
  });
  const geod = sc.node('curves', 'path', {
    fill: 'none', stroke: '#B2182B', 'stroke-width': 3,
    'stroke-linecap': 'round', opacity: 0
  });
  const lift = sc.node('vectors', 'path', {
    fill: 'none', stroke: '#243B54', 'stroke-opacity': .6,
    'stroke-width': 1.4, 'marker-end': sc.arrow('navy'), opacity: 0
  });
  const vec = sc.node('vectors', 'line', {
    stroke: '#B2182B', 'stroke-width': 2.4, 'marker-end': sc.arrow('accent'), opacity: 0
  });

  const hP = sc.handle('dots', '#243B54');
  const hQ = sc.handle('dots', '#243B54');

  const labP    = sc.label('$p$');
  const labQ    = sc.label('$q$');
  const labPlane= sc.label('$T_p\\mathcal{M}$', 'accent');
  const labLog  = sc.label('$\\log_p(q)$', 'accent');

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;   // plane
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;   // shooting
    const g3 = step === 3 ? t : 0;                  // lift and distance

    const a = sc.at(p[0], p[1]), b = sc.at(q[0], q[1]);
    hP.moveTo(a); labP.moveTo(a, -14, 26); labP.show(true);
    hQ.moveTo(b); labQ.moveTo(b, 18, 26);  labQ.show(true);

    plane.setAttribute('d', sc.planeQuad(p, 1.25 * (0.3 + 0.7 * g1)));
    plane.setAttribute('opacity', g1);
    labPlane.moveTo(sc.planePoint(p, 1.25, -1.25), 34, 8);
    labPlane.show(g1 > .6);

    // ---- shooting: walk through the successive guesses
    if (g2 > 0.001) {
      const n = guesses.length;
      const pos = Math.min(n - 1, g2 * (n - 1));
      const i = Math.floor(pos), frac = pos - i;
      const w0 = guesses[i], w1 = guesses[Math.min(n - 1, i + 1)];
      const w = [w0[0] + frac * (w1[0] - w0[0]), w0[1] + frac * (w1[1] - w0[1])];

      geod.setAttribute('d', sc.pathUV(geo.trace(p, w, 1, 60)));
      geod.setAttribute('opacity', 1);

      // the discarded attempts, faint
      let d = '';
      for (let j = 0; j <= i && j < n - 1; j++) d += sc.pathUV(geo.trace(p, guesses[j], 1, 40));
      tries.setAttribute('d', d);
      tries.setAttribute('opacity', i > 0 ? 1 : 0);

      const tip = sc.planePoint(p, w[0], w[1]);
      vec.setAttribute('x1', a.x); vec.setAttribute('y1', a.y);
      vec.setAttribute('x2', tip.x); vec.setAttribute('y2', tip.y);
      vec.setAttribute('opacity', 1);
      labLog.moveTo(sc.planePoint(p, w[0] * .55, w[1] * .55), 6, -28);
      labLog.show(g2 > .9);
    } else {
      geod.setAttribute('opacity', 0);
      tries.setAttribute('opacity', 0);
      vec.setAttribute('opacity', 0);
      labLog.show(false);
    }

    // ---- the lift from q up to the tangent plane, and the distance
    if (g3 > 0.001) {
      const tip = sc.planePoint(p, vel[0], vel[1]);
      const mx = (b.x + tip.x) / 2, my = (b.y + tip.y) / 2;
      const nx = -(tip.y - b.y), ny = tip.x - b.x;
      const L = Math.hypot(nx, ny) || 1;
      const cx = mx + 0.16 * nx / L * Math.hypot(tip.x - b.x, tip.y - b.y);
      const cy = my + 0.16 * ny / L * Math.hypot(tip.x - b.x, tip.y - b.y);
      const ex = b.x + (tip.x - b.x) * g3, ey = b.y + (tip.y - b.y) * g3;
      lift.setAttribute('d', `M${b.x} ${b.y}Q${cx} ${cy} ${ex} ${ey}`);
      lift.setAttribute('opacity', 1);
    } else {
      lift.setAttribute('opacity', 0);
    }
  }

  sc.onRedraw(() => render());
  sc.enableOrbit();
  sc.draggable(hP, (pt) => { p = sc.pickUV(pt, p); reshoot(); render(); });
  sc.draggable(hQ, (pt) => { q = sc.pickUV(pt, q); reshoot(); render(); });

  sc.tool('reset', () => { p = p0.slice(); q = q0.slice(); reshoot(); sc.resetView(); });

  const durations = [0, 700, 2200, 900];
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