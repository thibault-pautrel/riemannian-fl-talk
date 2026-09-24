import { makeScene } from './scene.js';
import { makeCamera } from '../geometry/projection.js';
import { makeTicker } from '../anim.js';
import { polyline } from '../svg.js';

/* Identify S = [[a, c], [c, b]] with a point of R^3.
   Writing  X = c,  Y = (b - a)/sqrt2,  Z = (a + b)/sqrt2,
   positive definiteness  a > 0, ab > c^2  becomes
        Z > 0   and   Z^2 > Y^2 + 2 X^2,
   an elliptic cone with vertical axis. The ray of the identity
   is the axis itself. */

const R2 = Math.SQRT2;
const toXYZ = (a, b, c) => [c, (b - a) / R2, (a + b) / R2];

/* 2x2 SPD helpers, a matrix is stored as [a, b, c] for [[a, c], [c, b]] */

// f(S) through the eigendecomposition of S
function funm([a, b, c], f) {
  const r = Math.hypot((a - b) / 2, c), m = (a + b) / 2;
  const th = 0.5 * Math.atan2(2 * c, a - b);
  const co = Math.cos(th), si = Math.sin(th);
  const f1 = f(m + r), f2 = f(m - r);
  return [f1 * co * co + f2 * si * si, f1 * si * si + f2 * co * co, (f1 - f2) * si * co];
}

// P S P for symmetric P and S, the result is symmetric
function sandwich([pa, pb, pc], [sa, sb, sd]) {
  const u = pa * sa + pc * sd, v = pa * sd + pc * sb;
  const w = pc * sa + pb * sd, z = pc * sd + pb * sb;
  return [u * pa + v * pc, w * pc + z * pb, u * pc + v * pb];
}

// affine-invariant geodesic  A^1/2 (A^-1/2 B A^-1/2)^t A^1/2
function geodesic(A, B, t) {
  const h = funm(A, Math.sqrt), ih = funm(A, (x) => 1 / Math.sqrt(x));
  return sandwich(h, funm(sandwich(ih, B), (x) => Math.pow(x, t)));
}

export default function spdCone(el) {
  const sc = makeScene(el, { width: 1000, height: 640 });
  const ticker = makeTicker();
  const cam = makeCamera({ scale: 78, zScale: 1, cx: 470, cy: 560, azimuth: 205, elevation: 22 });

  const TRACE = 5.2;                       // height at which the cone is cut
  const P = ([a, b, c]) => cam.project(toXYZ(a, b, c));

  // boundary of the cone at height Z, parameter phi
  const rim = (Z, phi) => {
    const Y = Z * Math.cos(phi), X = Z / R2 * Math.sin(phi);
    const a = (Z - Y) / R2, b = (Z + Y) / R2;
    return [a, b, X];
  };

  let pts = [
    { m: [1, 1, 0],       lab: '$I$' },
    { m: [3.0, 0.9, 1.0], lab: '$\\Sigma_1$' },
    { m: [0.7, 2.6, -0.6],lab: '$\\Sigma_2$' }
  ];
  const home = pts.map((p) => p.m.slice());

  const gCone = sc.g(), gCurve = sc.g(), gPts = sc.g();

  // vertical gradient for the lateral surface
  const defs = sc.node(sc.svg, 'defs');
  const grad = sc.node(defs, 'linearGradient', {
    id: `${sc.uid}-coneFill`, x1: 0, y1: 0, x2: 0, y2: 1
  });
  sc.node(grad, 'stop', { offset: '0%',   'stop-color': '#D6E4F2' });
  sc.node(grad, 'stop', { offset: '100%', 'stop-color': '#A4C0DD' });

  const ext  = sc.node(gCone, 'path', { fill: 'none', stroke: '#5F86AC',
                                        'stroke-opacity': .4, 'stroke-width': 1.4,
                                        'stroke-dasharray': '7 6' });
  // mesh on the hidden side, drawn under the translucent surface
  const meshBack = sc.node(gCone, 'path', { fill: 'none', stroke: '#4F7396',
                                            'stroke-width': 1, 'stroke-opacity': .28 });
  const body = sc.node(gCone, 'path', { fill: `url(#${sc.uid}-coneFill)`, 'fill-opacity': .55,
                                        stroke: '#5F86AC', 'stroke-width': 1.6,
                                        'stroke-linejoin': 'round' });
  const mouth = sc.node(gCone, 'path', { fill: '#BFD3E6', 'fill-opacity': .55,
                                         stroke: '#4F7396', 'stroke-width': 1.6 });
  // mesh on the visible side: generatrices and horizontal sections
  const meshFront = sc.node(gCone, 'path', { fill: 'none', stroke: '#4F7396',
                                             'stroke-width': 1.2, 'stroke-opacity': .75,
                                             'stroke-linecap': 'round' });
  const apex = sc.node(gCone, 'circle', { r: 4, fill: '#243B54' });

  const dots = pts.map(() => sc.node(gPts, 'g', { class: 'fig-handle', opacity: 0 }));
  dots.forEach((g) => {
    sc.node(g, 'circle', { r: 18, fill: 'transparent' });
    sc.node(g, 'circle', { r: 7, fill: '#fff', stroke: 'rgba(36,59,84,.35)', 'stroke-width': 1.2 });
    sc.node(g, 'circle', { r: 4.6, fill: '#243B54' });
  });

  const labs    = pts.map((p) => sc.label(p.lab));
  const labApex = sc.label('$0\\notin\\mathcal{S}^{++}_2$', 'muted');
  const labDet  = sc.label('$\\det S=0$, excluded', 'muted');

  const eucl = sc.node(gCurve, 'path', { fill: 'none', stroke: '#C77D24', 'stroke-width': 2.6,
                                         'stroke-dasharray': '9 6', 'stroke-linecap': 'round' });
  const geo  = sc.node(gCurve, 'path', { fill: 'none', stroke: '#009E73', 'stroke-width': 3.2,
                                         'stroke-linecap': 'round' });
  const labSeg = sc.label('', 'amber');
  const labGeo = sc.label('<span style="color:#009E73"> </span>');

  let step = 0, lastT = 1, dragging = null;

  // convex hull, which is exactly the silhouette of a convex cone
  function hull(points) {
    const s = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    const cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lo = [], up = [];
    for (const p of s) { while (lo.length >= 2 && cr(lo.at(-2), lo.at(-1), p) <= 0) lo.pop(); lo.push(p); }
    for (const p of s.slice().reverse()) { while (up.length >= 2 && cr(up.at(-2), up.at(-1), p) <= 0) up.pop(); up.push(p); }
    return lo.concat(up.slice(1, -1));
  }

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;   // the points
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;   // the excluded boundary
    const g3 = step > 3 ? 1 : step === 3 ? t : 0;   // the two paths

    const o = P([0, 0, 0]);
    const rimPts = [];
    for (let i = 0; i < 96; i++) rimPts.push(P(rim(TRACE, 2 * Math.PI * i / 96)));

    const H = hull([o, ...rimPts]);
    body.setAttribute('d', polyline(H, true));
    mouth.setAttribute('d', polyline(rimPts, true));

    // view direction: kernel of the projection, oriented upward
    // since the camera always sits above the cone (elevation > 0)
    const O = cam.project([0, 0, 0]);
    const J = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((e) => {
      const q = cam.project(e);
      return [q.x - O.x, q.y - O.y];
    });
    let v = [
      J[1][0] * J[2][1] - J[2][0] * J[1][1],
      J[2][0] * J[0][1] - J[0][0] * J[2][1],
      J[0][0] * J[1][1] - J[1][0] * J[0][1]
    ];
    if (v[2] < 0) v = v.map((x) => -x);
    // outward normal along generatrix phi is (sqrt2 sin phi, cos phi, -1)
    const front = (phi) => R2 * Math.sin(phi) * v[0] + Math.cos(phi) * v[1] - v[2] > 0;

    const NG = 16, NS = 96, RINGS = [0.2, 0.4, 0.6, 0.8];
    let dF = '', dB = '';
    for (let j = 0; j < NG; j++) {
      const phi = 2 * Math.PI * j / NG, q = P(rim(TRACE, phi));
      const seg = `M${o.x.toFixed(1)} ${o.y.toFixed(1)}L${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
      if (front(phi)) dF += seg; else dB += seg;
    }
    RINGS.forEach((f) => {
      let prev = null;
      for (let i = 0; i <= NS; i++) {
        const phi = 2 * Math.PI * i / NS, q = P(rim(f * TRACE, phi)), side = front(phi);
        const pt = `${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
        if (side) dF += (prev === true ? 'L' : 'M') + pt;
        else dB += (prev === false ? 'L' : 'M') + pt;
        prev = side;
      }
    });
    meshFront.setAttribute('d', dF);
    meshBack.setAttribute('d', dB);

    apex.setAttribute('cx', o.x); apex.setAttribute('cy', o.y);
    labApex.moveTo(o, 0, 30); labApex.show(true);

    // the two silhouette generatrices are the hull neighbours of the apex
    const k = H.findIndex((q) => q === o);
    let edges = '';
    let touch = null;
    if (k >= 0) {
      for (const n of [H[(k + 1) % H.length], H[(k - 1 + H.length) % H.length]]) {
        edges += `M${o.x} ${o.y}L${(o.x + 1.18 * (n.x - o.x)).toFixed(1)} ` +
                 `${(o.y + 1.18 * (n.y - o.y)).toFixed(1)}`;
        if (!touch || n.x < touch.x) touch = n;
      }
    }
    ext.setAttribute('d', edges);

    pts.forEach((p, i) => {
      const q = P(p.m);
      dots[i].setAttribute('transform', `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})`);
      dots[i].setAttribute('opacity', g1);
      labs[i].moveTo(q, 24, -16); labs[i].show(g1 > .6);
    });

    // Euclidean segment and affine-invariant geodesic, from Sigma_1 to Sigma_2
    const A = pts[1].m, B = pts[2].m, N = 60;
    const lin = [], arc = [];
    for (let k = 0; k <= N; k++) {
      const s = g3 * k / N;
      lin.push(P(A.map((x, i) => x + s * (B[i] - x))));
      arc.push(P(geodesic(A, B, s)));
    }
    eucl.setAttribute('d', polyline(lin));
    geo.setAttribute('d', polyline(arc));
    eucl.setAttribute('opacity', g3 > 0.01 ? 1 : 0);
    geo.setAttribute('opacity', g3 > 0.01 ? 1 : 0);
    labSeg.moveTo(P(A.map((x, i) => (x + B[i]) / 2)), 0, -24);
    labGeo.moveTo(P(geodesic(A, B, 0.5)), 0, 28);
    labSeg.show(g3 > 0.9);
    labGeo.show(g3 > 0.9);

    if (g2 > 0.5 && touch) { labDet.moveTo(touch, -6, 36); labDet.show(true); }
    else labDet.show(false);
  }

  // orbit
  let last = null;
  sc.svg.style.cursor = 'grab';
  sc.svg.addEventListener('pointerdown', (e) => {
    const idx = dots.findIndex((d) => d.contains(e.target));
    if (idx >= 0) { dragging = idx; }
    else last = { x: e.clientX, y: e.clientY };
    sc.svg.setPointerCapture(e.pointerId);
  });
  sc.svg.addEventListener('pointermove', (e) => {
    if (dragging !== null) {
      // move the matrix in its own (a, b) plane, keeping it definite
      const m = sc.svg.getScreenCTM();
      const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
      const p = pts[dragging].m.slice();
      // numeric two variable solve on (a, b), c kept fixed
      for (let k = 0; k < 8; k++) {
        const cur = P(p), h = 1e-3;
        const da = P([p[0] + h, p[1], p[2]]), db = P([p[0], p[1] + h, p[2]]);
        const A = (da.x - cur.x) / h, B = (db.x - cur.x) / h;
        const C = (da.y - cur.y) / h, D = (db.y - cur.y) / h;
        const det = A * D - B * C;
        if (Math.abs(det) < 1e-9) break;
        const rx = q.x - cur.x, ry = q.y - cur.y;
        p[0] += ( D * rx - B * ry) / det;
        p[1] += (-C * rx + A * ry) / det;
      }
      p[0] = Math.max(0.15, Math.min(4.5, p[0]));
      p[1] = Math.max(0.15, Math.min(4.5, p[1]));
      if (p[0] * p[1] - p[2] * p[2] > 0.08) pts[dragging].m = p;
      render();
      return;
    }
    if (!last) return;
    cam.azimuth -= (e.clientX - last.x) * 0.35;
    cam.elevation = Math.max(8, Math.min(60, cam.elevation + (e.clientY - last.y) * 0.22));
    last = { x: e.clientX, y: e.clientY };
    render();
  });
  const stop = () => { last = null; dragging = null; };
  sc.svg.addEventListener('pointerup', stop);
  sc.svg.addEventListener('pointercancel', stop);

  sc.tool('reset', () => {
    pts.forEach((p, i) => (p.m = home[i].slice()));
    cam.azimuth = 205; cam.elevation = 22; render();
  });

  const durations = [0, 700, 700, 1400];
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