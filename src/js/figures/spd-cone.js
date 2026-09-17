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

  const gCone = sc.g(), gPts = sc.g();

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
  const body = sc.node(gCone, 'path', { fill: `url(#${sc.uid}-coneFill)`, 'fill-opacity': .85,
                                        stroke: '#5F86AC', 'stroke-width': 1.6,
                                        'stroke-linejoin': 'round' });
  const mouth = sc.node(gCone, 'path', { fill: '#8FB0D3', 'fill-opacity': .62,
                                         stroke: '#4F7396', 'stroke-width': 1.4 });
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
  const labVal  = sc.label('', 'muted');

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

    const o = P([0, 0, 0]);
    const rimPts = [];
    for (let i = 0; i < 96; i++) rimPts.push(P(rim(TRACE, 2 * Math.PI * i / 96)));

    const H = hull([o, ...rimPts]);
    body.setAttribute('d', polyline(H, true));
    mouth.setAttribute('d', polyline(rimPts, true));
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

    if (g2 > 0.5 && touch) { labDet.moveTo(touch, -6, 36); labDet.show(true); }
    else labDet.show(false);

    const [a, b, c] = pts[1].m;
    labVal.node.innerHTML = `det &Sigma;<sub>1</sub> = ${(a * b - c * c).toFixed(2)}`;
    labVal.moveTo({ x: 500, y: 34 });
    labVal.show(g1 > .9);
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

  const durations = [0, 700, 700];
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