import { svgEl, polyline } from '../svg.js';
import { makeCamera } from '../geometry/projection.js';
import { makeSurface } from '../geometry/surface.js';

/* Illustration only, no notation: a point on the surface, its tangent
   plane, the Riemannian gradient step inside that plane, and the
   retraction bringing it back to the surface. Loops for ever. */

const MESH = '#7EA8DC';
const RIM  = '#AECBF0';
const PLANE = '#CFE3FA';
const GRAD = '#FFD08A';
const PATH = '#6AC0D6';

export default function titleManifold(el) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const svg = svgEl('svg', {
    viewBox: '0 0 1600 900',
    preserveAspectRatio: 'xMidYMid slice',
    class: 'fig-svg'
  });
  el.appendChild(svg);

  const cam = makeCamera({ scale: 190, cx: 1120, cy: 470 });
  const S = makeSurface();

  // ---- the descent trajectory, computed once
  //  cost = height, direction = - g^{-1} grad(height), step = retraction
  /* Each step has the same Riemannian length, so the retraction arc is
     always clearly visible. Six steps from the summit span 2.2 units
     and stay inside the patch. */
  const ETA = 1, LEN = 0.42, NSTEP = 6;
  const iterates = [[0.10, 0.10]];
  const directions = [];
  for (let k = 0; k < NSTEP; k++) {
    const [u, v] = iterates[k];
    const [fu, fv] = S.grad(u, v);
    const g11 = 1 + fu * fu, g12 = fu * fv, g22 = 1 + fv * fv;
    const det = g11 * g22 - g12 * g12;
    let d = [-( g22 * fu - g12 * fv) / det, -(-g12 * fu + g11 * fv) / det];
    const nrm = Math.sqrt(g11 * d[0] * d[0] + 2 * g12 * d[0] * d[1] + g22 * d[1] * d[1]);
    d = nrm < 1e-9 ? [0, 0] : [LEN * d[0] / nrm, LEN * d[1] / nrm];
    directions.push(d);
    iterates.push([u + d[0], v + d[1]]);
  }

  const gMesh = svgEl('g'); svg.appendChild(gMesh);
  const gOver = svgEl('g'); svg.appendChild(gOver);

  const meshPaths = [];
  for (let i = 0; i < 18; i++) {
    const p = svgEl('path', { fill: 'none', stroke: MESH, 'stroke-width': 1.1 });
    gMesh.appendChild(p);
    meshPaths.push(p);
  }
  const rim   = svgEl('path', { fill: 'none', stroke: RIM, 'stroke-width': 1.8, opacity: .4 });
  const plane = svgEl('path', { fill: PLANE, 'fill-opacity': .13, stroke: PLANE,
                                'stroke-opacity': .5, 'stroke-width': 1.2 });
  const trail = svgEl('path', { fill: 'none', stroke: PATH, 'stroke-width': 2.6,
                                'stroke-opacity': .55, 'stroke-linecap': 'round' });
  const hop   = svgEl('path', { fill: 'none', stroke: PATH, 'stroke-width': 3.4,
                                'stroke-linecap': 'round' });
  const grad  = svgEl('line', { stroke: GRAD, 'stroke-width': 2.6, 'stroke-linecap': 'round' });
  const gtip  = svgEl('polygon', { fill: GRAD });
  const dot   = svgEl('circle', { r: 7, fill: '#fff' });
  gOver.append(rim, plane, trail, hop, grad, gtip, dot);

  const planeQuad = (p, r) => {
    const Xu = S.tangentU(p[0], p[1]), Xv = S.tangentV(p[0], p[1]);
    const o = S.point(p[0], p[1]);
    const corner = (a, b) => cam.project([
      o[0] + a * Xu[0] + b * Xv[0], o[1] + a * Xu[1] + b * Xv[1], o[2] + a * Xu[2] + b * Xv[2]]);
    return polyline([corner(-r, -r), corner(r, -r), corner(r, r), corner(-r, r)], true);
  };
  const planePoint = (p, a, b) => {
    const Xu = S.tangentU(p[0], p[1]), Xv = S.tangentV(p[0], p[1]);
    const o = S.point(p[0], p[1]);
    return cam.project([
      o[0] + a * Xu[0] + b * Xv[0], o[1] + a * Xu[1] + b * Xv[1], o[2] + a * Xu[2] + b * Xv[2]]);
  };
  const onSurf = (u, v) => cam.project(S.point(u, v));
  const segment = (k, s) => {                      // the retraction curve, partially drawn
    const [u, v] = iterates[k], d = directions[k], pts = [];
    for (let i = 0; i <= 26; i++) {
      const t = ETA * s * i / 26;
      pts.push(onSurf(u + t * d[0], v + t * d[1]));
    }
    return pts;
  };

  const STEP_MS = 1900, PAUSE_MS = 1800;
  const CYCLE = NSTEP * STEP_MS + PAUSE_MS;
  const ease = (x) => x * x * (3 - 2 * x);

  function draw(time) {
    const t = time / 1000;
    cam.azimuth   = 225 + (reduced ? 0 : 12 * Math.sin(t / 13));
    cam.elevation = 34  + (reduced ? 0 :  3 * Math.sin(t / 19));

    // ---- surface, shaded back to front
    const lines = S.meshLines(cam, { lines: 9, samples: 40 });
    const depths = lines.map((l) => l.depth);
    const lo = Math.min(...depths), hi = Math.max(...depths);
    lines.slice().sort((a, b) => a.depth - b.depth).forEach((l, rank) => {
      const node = meshPaths[rank];
      const s = hi === lo ? 1 : (l.depth - lo) / (hi - lo);
      node.setAttribute('d', l.d);
      node.setAttribute('opacity', (0.08 + 0.22 * s).toFixed(3));
    });
    rim.setAttribute('d', S.boundary(cam, 50));

    // ---- where we are in the descent
    const phase = reduced ? NSTEP * STEP_MS : (time % CYCLE);
    const k = Math.min(NSTEP - 1, Math.floor(phase / STEP_MS));
    const local = Math.min(1, (phase - k * STEP_MS) / STEP_MS);
    const done = phase >= NSTEP * STEP_MS;

    // plane, then the tangent step, then the retraction arc, each given time
    const gPlane = Math.min(1, local / 0.16);
    const gGrad  = Math.max(0, Math.min(1, (local - 0.14) / 0.24));
    const gHop   = Math.max(0, Math.min(1, (local - 0.42) / 0.52));

    const p = iterates[k], d = directions[k];

    plane.setAttribute('d', planeQuad(p, 0.95));
    plane.setAttribute('opacity', done ? 0 : (gHop > .92 ? 1 - (gHop - .92) / .08 : gPlane));

    // the tangent step, drawn inside the plane
    const o = onSurf(p[0], p[1]);
    const tip = planePoint(p, ETA * d[0] * ease(gGrad), ETA * d[1] * ease(gGrad));
    grad.setAttribute('x1', o.x); grad.setAttribute('y1', o.y);
    grad.setAttribute('x2', tip.x); grad.setAttribute('y2', tip.y);
    grad.setAttribute('opacity', done ? 0 : (gGrad > .02 ? 1 : 0));
    const ang = Math.atan2(tip.y - o.y, tip.x - o.x), L = 11, w = 5;
    gtip.setAttribute('points', [
      [tip.x, tip.y],
      [tip.x - L * Math.cos(ang) + w * Math.sin(ang), tip.y - L * Math.sin(ang) - w * Math.cos(ang)],
      [tip.x - L * Math.cos(ang) - w * Math.sin(ang), tip.y - L * Math.sin(ang) + w * Math.cos(ang)]
    ].map((q) => q.map((z) => z.toFixed(1)).join(',')).join(' '));
    gtip.setAttribute('opacity', done ? 0 : (gGrad > .3 ? 1 : 0));

    // the retraction, and the trail of everything already walked
    hop.setAttribute('d', gHop > .001 && !done ? polyline(segment(k, ease(gHop))) : '');
    let past = [];
    for (let j = 0; j < (done ? NSTEP : k); j++) past = past.concat(segment(j, 1));
    trail.setAttribute('d', past.length ? polyline(past) : '');

    const cur = done ? iterates[NSTEP]
                     : (gHop > .001 ? segment(k, ease(gHop)).at(-1) : o);
    dot.setAttribute('cx', cur.x); dot.setAttribute('cy', cur.y);
  }

  let raf = null;
  const loop = (time) => { draw(time); raf = requestAnimationFrame(loop); };

  return {
    setStep() {},
    activate() {
      if (raf !== null) return;
      if (reduced) { draw(0); return; }
      raf = requestAnimationFrame(loop);
    },
    deactivate() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }
  };
}