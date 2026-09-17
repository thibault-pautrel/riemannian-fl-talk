import { makeSaddleScene } from './saddle-scene.js';
import { makeTicker } from '../anim.js';
import { svgEl, polyline } from '../svg.js';

export default function manifoldCharts(el) {
  const sc = makeSaddleScene(el, { scale: 86, cx: 330, cy: 330 });
  const ticker = makeTicker();
  const RAD = Math.PI / 180;

  // two overlapping domains, and the flat square each one maps onto
  const A = { c: [-0.62,  0.35], r: 0.85, rot: 0,
              cx: 830, cy: 170, half: 96, color: '#4A8CD7' };
  const B = { c: [ 0.55, -0.30], r: 0.85, rot: 25 * RAD,
              cx: 830, cy: 458, half: 96, color: '#E1963C',
              warp: (a, b) => [a + 0.17 * b, b + 0.11 * a] };

  let x = [-0.10, 0.10];            // a point of the overlap, draggable

  // local square coordinates <-> surface parameters
  const toUV = (D, a, b) => {
    const c = Math.cos(D.rot), s = Math.sin(D.rot);
    return [D.c[0] + D.r * (c * a - s * b), D.c[1] + D.r * (s * a + c * b)];
  };
  const toLocal = (D, u, v) => {
    const c = Math.cos(D.rot), s = Math.sin(D.rot);
    const du = (u - D.c[0]) / D.r, dv = (v - D.c[1]) / D.r;
    return [c * du + s * dv, -s * du + c * dv];
  };
  const toChart = (D, a, b) => {
    const [p, q] = D.warp ? D.warp(a, b) : [a, b];
    return { x: D.cx + D.half * p, y: D.cy + D.half * q };
  };
  // m = 0 on the surface, m = 1 in the chart
  const morph = (D, a, b, m) => {
    const [u, v] = toUV(D, a, b);
    const s = sc.at(u, v), c = toChart(D, a, b);
    return { x: s.x + (c.x - s.x) * m, y: s.y + (c.y - s.y) * m };
  };

  // the domains are discs, so the charts are discs too
  const border = (D, m, n = 64) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = 2 * Math.PI * i / n;
      pts.push(morph(D, Math.cos(a), Math.sin(a), m));
    }
    return polyline(pts, true);
  };
  const gridOf = (D, m) => {
    let d = '';
    for (const r of [0.34, 0.67]) {              // concentric circles
      const ring = [];
      for (let i = 0; i <= 48; i++) {
        const a = 2 * Math.PI * i / 48;
        ring.push(morph(D, r * Math.cos(a), r * Math.sin(a), m));
      }
      d += polyline(ring, true);
    }
    for (let k = 0; k < 4; k++) {                 // diameters
      const a = Math.PI * k / 4, line = [];
      for (let i = 0; i <= 20; i++) {
        const s = -1 + 2 * i / 20;
        line.push(morph(D, s * Math.cos(a), s * Math.sin(a), m));
      }
      d += polyline(line);
    }
    return d;
  };

  sc.drawSurface();

  // overlap, drawn as B clipped by A
  const defs = svgEl('defs');
  sc.svg.insertBefore(defs, sc.svg.firstChild);
  const clipShape = svgEl('path', {});
  const clip = svgEl('clipPath', { id: sc.uid + '-clipA' });
  clip.appendChild(clipShape);
  defs.appendChild(clip);

  const mk = (D) => ({
    ghost: sc.node('plane', 'path', { fill: 'none', stroke: D.color,
             'stroke-opacity': .45, 'stroke-width': 1.2, 'stroke-dasharray': '4 4', opacity: 0 }),
    patch: sc.node('plane', 'path', { fill: D.color, 'fill-opacity': .22,
             stroke: D.color, 'stroke-width': 1.4, opacity: 0 }),
    grid:  sc.node('plane', 'path', { fill: 'none', stroke: D.color,
             'stroke-opacity': .45, 'stroke-width': .8, opacity: 0 })
  });
  const nA = mk(A), nB = mk(B);

  const overlap = sc.node('plane', 'path', {
    fill: '#6C4E9C', 'fill-opacity': .38, stroke: 'none',
    'clip-path': `url(#${sc.uid}-clipA)`, opacity: 0
  });

  const trans = sc.node('curves', 'path', {
    fill: 'none', stroke: '#243B54', 'stroke-opacity': .65, 'stroke-width': 1.6,
    'marker-end': sc.arrow('navy'), opacity: 0
  });

  const hX  = sc.handle('dots', '#243B54');
  const xA  = sc.node('dots', 'circle', { r: 5, fill: '#4A8CD7', opacity: 0 });
  const xB  = sc.node('dots', 'circle', { r: 5, fill: '#E1963C', opacity: 0 });

  const labM  = sc.label('$\\mathcal{M}$');
  const labU  = sc.label('$U$');
  const labV  = sc.label('$V$');
  const labPhi= sc.label('$\\varphi(U)\\subset\\mathbb{R}^d$', 'muted');
  const labPsi= sc.label('$\\psi(V)\\subset\\mathbb{R}^d$', 'muted');
  const labTr = sc.label('$\\psi\\circ\\varphi^{-1}$', 'muted');
  const labX  = sc.label('$x$');

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;   // the two domains
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;   // U flattens
    const g3 = step > 3 ? 1 : step === 3 ? t : 0;   // V flattens
    const g4 = step === 4 ? t : 0;                  // transition map

    labM.moveTo(sc.at(-1.9, 1.9), -6, -6); labM.show(true);

    const paint = (D, n, appear, m) => {
      n.patch.setAttribute('d', border(D, m));
      n.patch.setAttribute('opacity', appear);
      n.grid.setAttribute('d', gridOf(D, m));
      n.grid.setAttribute('opacity', appear * (m > .02 ? 1 : .8));
      n.ghost.setAttribute('d', border(D, 0));
      n.ghost.setAttribute('opacity', appear * m);
    };
    paint(A, nA, g1, g2);
    paint(B, nB, g1, g3);

    clipShape.setAttribute('d', border(A, 0));
    overlap.setAttribute('d', border(B, 0));
    overlap.setAttribute('opacity', g1 > .8 ? 1 : 0);

    labU.moveTo(morph(A, 0, -1, g2), 0, -24); labU.show(g1 > .5);
    labV.moveTo(morph(B, 0, -1, g3), 0, -24); labV.show(g1 > .5);
    labPhi.moveTo({ x: A.cx, y: A.cy + A.half }, 0, 28); labPhi.show(g2 > .8);
    labPsi.moveTo({ x: B.cx, y: B.cy + B.half }, 0, 28); labPsi.show(g3 > .8);

    // ---- the same point, read in both charts
    const la = toLocal(A, x[0], x[1]), lb = toLocal(B, x[0], x[1]);
    const onSurf = sc.at(x[0], x[1]);
    hX.moveTo(onSurf); hX.show(g1 > .8);
    labX.moveTo(onSurf, -6, 28); labX.show(g1 > .8);

    const pa = toChart(A, la[0], la[1]), pb = toChart(B, lb[0], lb[1]);
    xA.setAttribute('cx', pa.x); xA.setAttribute('cy', pa.y);
    xA.setAttribute('opacity', g2 > .9 ? 1 : 0);
    xB.setAttribute('cx', pb.x); xB.setAttribute('cy', pb.y);
    xB.setAttribute('opacity', g3 > .9 ? 1 : 0);

    if (g4 > 0.001) {
      const y0 = A.cy + A.half + 44, y1 = B.cy - B.half - 10;
      const ey = y0 + (y1 - y0) * g4;
      trans.setAttribute('d', `M${A.cx + 130} ${y0}Q${A.cx + 190} ${(y0 + y1) / 2} ${A.cx + 130} ${ey}`);
      trans.setAttribute('opacity', 1);
      labTr.moveTo({ x: A.cx + 232, y: (y0 + y1) / 2 }); labTr.show(g4 > .6);
    } else {
      trans.setAttribute('opacity', 0);
      labTr.show(false);
    }
  }

  // dragging the point, kept inside both domains
  sc.draggable(hX, (pt) => {
    const cand = sc.pickUV(pt, x);
    const la = toLocal(A, cand[0], cand[1]), lb = toLocal(B, cand[0], cand[1]);
    const inside = (l) => Math.hypot(l[0], l[1]) < 0.92;
    if (inside(la) && inside(lb)) { x = cand; render(); }
  });

  sc.onRedraw(() => render());
  sc.enableOrbit();
  sc.tool('reset', () => { x = [-0.10, 0.10]; sc.resetView(); });

  const durations = [0, 800, 1200, 1200, 800];
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