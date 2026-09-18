import { makeSaddleScene } from './saddle-scene.js';
import { makeTicker } from '../anim.js';

/* Proximal smoothness, on the surface.

   A point y off the manifold is projected onto its nearest point. Inside
   the tube of radius gamma the nearest point is unique, so Pi is a map.
   Push y further along the normal, past the centre of curvature, and a
   second nearest point appears: Pi stops being defined.

   Everything is computed, the nearest points are found by search over a
   grid on M followed by Newton refinement. */

const NAVY = '#243B54', SLATE = '#9AA6B2', OK = '#009E73', BAD = '#B2182B';
const GRID = 46;

export default function proximal(el) {
  // a narrow dip added to the usual terrain, so the focal point sits in frame
  const sc = makeSaddleScene(el, {
    scale: 168, cy: 320, elevation: 26,
    surface: {
      quad: { uu: 0.020, vv: -0.030, uv: 0.040 },
      bumps: [
        { A:  0.80, u0: -0.05, v0:  0.05, w: 2.80 },
        { A: -0.34, u0:  1.45, v0:  1.20, w: 1.40 },
        { A: -0.28, u0: -1.50, v0:  1.35, w: 1.50 },
        { A: -0.22, u0:  0.95, v0: -1.55, w: 1.60 },
        { A: -0.50, u0:  0.00, v0:  0.00, w: 0.42 }
      ]
    }
  });
  const ticker = makeTicker();
  const S = sc.surface;

  const base = [0, 0];                          // the bottom of the dip
  let hgt = 0.34, touched = false;              // how far along the normal

  const unit = (v) => { const L = Math.hypot(v[0], v[1], v[2]); return v.map((x) => x / L); };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const len = (v) => Math.hypot(v[0], v[1], v[2]);

  // a coarse grid of M, reused at every frame
  const NODES = [];
  for (let i = 0; i <= GRID; i++)
    for (let j = 0; j <= GRID; j++) {
      const u = -S.half + 2 * S.half * i / GRID, v = -S.half + 2 * S.half * j / GRID;
      NODES.push([u, v]);
    }

  // the nearest points of M to an ambient point y
  function nearest(y) {
    let best = [];
    NODES.forEach(([u, v]) => {
      const d = len(sub(S.point(u, v), y));
      best.push({ u, v, d });
    });
    best.sort((a, b) => a.d - b.d);
    // refine the few leading candidates, and keep those far apart in (u, v)
    const out = [];
    for (const c of best.slice(0, 60)) {
      let { u, v } = c;
      for (let k = 0; k < 20; k++) {            // gradient step on the squared distance
        const p = S.point(u, v), r = sub(p, y);
        const Xu = S.tangentU(u, v), Xv = S.tangentV(u, v);
        const gu = 2 * (r[0] * Xu[0] + r[1] * Xu[1] + r[2] * Xu[2]);
        const gv = 2 * (r[0] * Xv[0] + r[1] * Xv[1] + r[2] * Xv[2]);
        u -= 0.12 * gu; v -= 0.12 * gv;
        u = Math.max(-S.half, Math.min(S.half, u));
        v = Math.max(-S.half, Math.min(S.half, v));
      }
      const d = len(sub(S.point(u, v), y));
      if (!out.some((o) => Math.hypot(o.u - u, o.v - v) < 0.14)) out.push({ u, v, d });
      if (out.length >= 3) break;
    }
    out.sort((a, b) => a.d - b.d);
    const dmin = out[0].d;
    return out.filter((o) => o.d <= dmin * 1.04);
  }

  sc.drawSurface();

  const normal = sc.node('vectors', 'line', {
    stroke: NAVY, 'stroke-opacity': .45, 'stroke-width': 1.3,
    'stroke-dasharray': '5 4', opacity: 0 });
  const tube = sc.node('curves', 'path', {
    fill: 'none', stroke: OK, 'stroke-width': 2, 'stroke-dasharray': '7 5', opacity: 0 });
  const links = [0, 1, 2].map(() => sc.node('curves', 'line', {
    stroke: OK, 'stroke-width': 2, opacity: 0 }));
  const feet = [0, 1, 2].map(() => sc.node('dots', 'circle', {
    r: 6, fill: OK, stroke: '#fff', 'stroke-width': 1.8, opacity: 0 }));
  const dotY = sc.node('dots', 'circle', {
    r: 8, fill: '#fff', stroke: NAVY, 'stroke-width': 2.6, opacity: 0 });

  const labM = sc.label('$\\mathcal{M}$', 'muted');
  const labY = sc.label('$y$');
  const labG = sc.label('$\\gamma$', 'muted');
  const labPi = sc.label('$\\Pi(y)$', 'muted');
  const verdict = sc.label('', '');
  labG.node.style.color = OK;

  // the tube boundary, drawn as the offset of one section of M
  function tubePath(g) {
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const u = -S.half + 2 * S.half * i / 60;
      const p = S.point(u, base[1]);
      const n = unit(S.normal(u, base[1]));
      pts.push(sc.amb([p[0] + g * n[0], p[1] + g * n[1], p[2] + g * n[2]]));
    }
    return pts.map((q, i) => (i ? 'L' : 'M') + q.x.toFixed(1) + ' ' + q.y.toFixed(1)).join('');
  }

  // the reach along this normal: where a second nearest point appears
  const GAMMA = 0.57;

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;   // the tube
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;   // y inside, one foot
    const g3 = step === 3 ? t : 0;                  // y pushed out, two feet

    // during step 3 the point travels along the normal
    if (!touched) {
      if (step >= 3) hgt = 0.34 + (0.98 - 0.34) * g3;
      else if (step >= 2) hgt = 0.34;
    }

    const foot = S.point(base[0], base[1]);
    const n = unit(S.normal(base[0], base[1]));
    const Y = [foot[0] + hgt * n[0], foot[1] + hgt * n[1], foot[2] + hgt * n[2]];
    const qY = sc.amb(Y);

    labM.moveTo(sc.at(1.55, -1.55), 10, 16); labM.show(true);

    tube.setAttribute('d', tubePath(GAMMA));
    tube.setAttribute('opacity', g1);
    const gp = sc.amb([foot[0] + GAMMA * n[0], foot[1] + GAMMA * n[1], foot[2] + GAMMA * n[2]]);
    const fp = sc.amb(foot);
    labG.moveTo({ x: (gp.x + fp.x) / 2, y: (gp.y + fp.y) / 2 }, 22, 0);
    labG.show(g1 > .6);

    normal.setAttribute('x1', fp.x); normal.setAttribute('y1', fp.y);
    normal.setAttribute('x2', qY.x); normal.setAttribute('y2', qY.y);
    normal.setAttribute('opacity', g2 > .2 ? 1 : 0);

    dotY.setAttribute('cx', qY.x); dotY.setAttribute('cy', qY.y);
    dotY.setAttribute('opacity', step >= 2 ? 1 : 0);
    labY.moveTo(qY, 22, -16); labY.show(step >= 2);

    if (step >= 2) {
      const R = nearest(Y);
      const many = R.length > 1;
      links.forEach((l, k) => {
        const hit = R[k];
        if (!hit) { l.setAttribute('opacity', 0); feet[k].setAttribute('opacity', 0); return; }
        const q = sc.at(hit.u, hit.v);
        l.setAttribute('x1', qY.x); l.setAttribute('y1', qY.y);
        l.setAttribute('x2', q.x); l.setAttribute('y2', q.y);
        l.setAttribute('stroke', many ? BAD : OK);
        l.setAttribute('opacity', 1);
        feet[k].setAttribute('cx', q.x); feet[k].setAttribute('cy', q.y);
        feet[k].setAttribute('fill', many ? BAD : OK);
        feet[k].setAttribute('opacity', 1);
      });
      const q0 = sc.at(R[0].u, R[0].v);
      labPi.moveTo(q0, -6, 28); labPi.show(!many);
      verdict.node.innerHTML = many
        ? '<strong>several nearest points, Π is not a map</strong>'
        : '<strong>one nearest point, Π is well defined</strong>';
      verdict.node.style.color = many ? BAD : OK;
      verdict.moveTo({ x: sc.svg.viewBox.baseVal.width / 2,
                       y: sc.svg.viewBox.baseVal.height - 26 });
      verdict.show(true);
    } else {
      links.forEach((l) => l.setAttribute('opacity', 0));
      feet.forEach((f) => f.setAttribute('opacity', 0));
      labPi.show(false); verdict.show(false);
    }
  }

  const sH = sc.slider('height', { min: 0.08, max: 1.3, step: 0.01, value: hgt },
                       (v) => { hgt = v; touched = true; render(1); });
  sc.onRedraw(() => { sH.set(hgt.toFixed(2)); render(); });
  sc.enableOrbit();
  sc.tool('reset', () => {
    touched = false; hgt = 0.34; sH.input.value = hgt; sc.resetView();
  });

  const durations = [0, 800, 700, 2200];
  render(1);

  return {
    setStep(n) {
      if (n === step) return;
      const back = n < step;
      step = n;
      if (n <= 2) touched = false;
      ticker.run(back ? 0 : durations[n] ?? 600, render, { instant: back });
    },
    activate() {}, deactivate() { ticker.stop(); }
  };
}