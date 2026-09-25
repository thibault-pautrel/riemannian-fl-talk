import { makeSaddleScene } from './saddle-scene.js';
import { makeGeodesics } from '../geometry/geodesic.js';
import { makeTicker } from '../anim.js';

/* Three client iterates on the manifold, and the candidate answers.
   "existing" shows the Frechet mean, KFAvg and RetAvg.
   "proposed" shows RLAvg and ProjAvg. */

const NAVY = '#243B54', RED = '#B2182B', VIO = '#6B3FA0', NEW = '#14508C';

/* Pixels per unit of the surface, for these two figures only.
   Raise it to make the drawing larger inside the same box. */
const SCALE = 190;

// labels whose TeX changes while the figure runs
const setTex = (lab, tex) => {
  if (lab.node.dataset.tex === tex) return;
  lab.node.dataset.tex = tex;
  lab.node.innerHTML = tex;
  window.renderFigureMath?.(lab.node);
};

function build(el, mode) {
  const sc = makeSaddleScene(el, { scale: SCALE, cy: 322 });
  const geo = makeGeodesics(sc.surface);
  const ticker = makeTicker();
  const S = sc.surface;

  const T0 = [-0.20, 0.45];
  const C0 = [[-1.25, -0.30], [0.25, -0.80], [1.05, 0.50]];
  let T = T0.slice(), C = C0.map((c) => c.slice());

  sc.drawSurface();

  const mean = (v) => [v.reduce((s, x) => s + x[0], 0) / v.length,
                       v.reduce((s, x) => s + x[1], 0) / v.length];

  // ambient vector -> tangent coordinates at p
  function toTangent(p, s) {
    const [fu, fv] = S.grad(p[0], p[1]);
    const g11 = 1 + fu * fu, g12 = fu * fv, g22 = 1 + fv * fv;
    const r1 = s[0] + s[2] * fu, r2 = s[1] + s[2] * fv;
    const det = g11 * g22 - g12 * g12;
    return [(g22 * r1 - g12 * r2) / det, (-g12 * r1 + g11 * r2) / det];
  }

  // the four candidate answers, all recomputed when a point moves
  function solutions() {
    const kf = mean(C.map((c) => geo.log(T, c)));               // KFAvg
    const rt = mean(C.map((c) => [c[0] - T[0], c[1] - T[1]]));  // RetAvg, R is parameter straight
    const P = S.point(T[0], T[1]);
    const rl = mean(C.map((c) => {
      const Q = S.point(c[0], c[1]);
      return toTangent(T, [Q[0] - P[0], Q[1] - P[1], Q[2] - P[2]]);
    }));                                                        // RLAvg lifting
    const amb = [mean(C)[0], mean(C)[1],
                 C.reduce((s, c) => s + S.height(c[0], c[1]), 0) / C.length];  // ProjAvg
    // Frechet mean, by Karcher flow
    let f = T.slice(), track = [f.slice()];
    for (let k = 0; k < 12; k++) {
      const v = mean(C.map((c) => geo.log(f, c)));
      f = [f[0] + v[0], f[1] + v[1]];
      track.push(f.slice());
    }
    return { kf, rt, rl, amb, frechet: f, track };
  }
  let SOL = solutions();

  // ---- nodes
  const plane = sc.node('plane', 'path', {
    fill: RED, 'fill-opacity': .10, stroke: RED, 'stroke-opacity': .45, 'stroke-width': 1.2, opacity: 0
  });
  const arcs = C0.map(() => sc.node('curves', 'path', {
    fill: 'none', stroke: RED, 'stroke-opacity': .6, 'stroke-width': 2.2, opacity: 0
  }));
  const links = C0.map(() => sc.node('vectors', 'line', {
    stroke: NAVY, 'stroke-opacity': .35, 'stroke-width': 1.2, 'stroke-dasharray': '4 4', opacity: 0
  }));
  const vecs = C0.map(() => sc.node('vectors', 'line', {
    stroke: NAVY, 'stroke-opacity': .65, 'stroke-width': 1.8,
    'marker-end': sc.arrow('navy'), opacity: 0
  }));
  const vMean = sc.node('vectors', 'line', {
    stroke: VIO, 'stroke-width': 3, 'marker-end': sc.arrow('accent'), opacity: 0
  });
  const back = sc.node('vectors', 'line', {
    stroke: NAVY, 'stroke-opacity': .55, 'stroke-width': 1.5, 'stroke-dasharray': '6 5',
    'marker-end': sc.arrow('navy'), opacity: 0
  });
  const backArc = sc.node('curves', 'path', {
    fill: 'none', stroke: NEW, 'stroke-width': 2.8, 'stroke-linecap': 'round', opacity: 0
  });

  const hT = sc.handle('dots', NAVY);
  const hC = C0.map(() => sc.handle('dots', RED));
  const dotMean = sc.node('dots', 'circle', { r: 6, fill: VIO, opacity: 0 });
  const dotNew  = sc.node('dots', 'circle', { r: 7, fill: NEW, stroke: '#fff', 'stroke-width': 2, opacity: 0 });

  const labT   = sc.label('$\\theta_t$');
  const labC   = C0.map((c, i) => sc.label(`$\\theta_t^{(${i + 1})}$`, 'accent'));
  const labPl  = sc.label('$T_{\\theta_t}\\mathcal{M}$', 'accent');
  const labMean= sc.label('', '');
  const labPi  = sc.label('', 'muted');
  const labNew = sc.label('$\\theta_{t+1}$');
  labMean.node.style.color = VIO;
  labNew.node.style.color = NEW;

  let step = 0, lastT = 1;

  const hideAll = () => {
    arcs.forEach((a) => a.setAttribute('opacity', 0));
    links.forEach((a) => a.setAttribute('opacity', 0));
    vecs.forEach((a) => a.setAttribute('opacity', 0));
    [vMean, back, backArc, dotMean, dotNew].forEach((n) => n.setAttribute('opacity', 0));
    plane.setAttribute('opacity', 0);
    labPl.show(false); labMean.show(false); labNew.show(false); labPi.show(false);
  };

  // tangent based methods: vectors in the plane, their mean, then back to M
  function tangentMethod(vecsAB, meanAB, resultUV, g, useGeodesic, label) {
    const o = sc.at(T[0], T[1]);
    plane.setAttribute('d', sc.planeQuad(T, 1.25));
    plane.setAttribute('opacity', Math.min(1, g * 3));
    labPl.moveTo(sc.planePoint(T, 1.25, -1.25), 36, 8); labPl.show(g > .25);

    const gv = Math.min(1, g / 0.45), gm = Math.max(0, Math.min(1, (g - 0.42) / 0.25));
    const gb = Math.max(0, Math.min(1, (g - 0.66) / 0.34));

    vecsAB.forEach((ab, i) => {
      const tip = sc.planePoint(T, ab[0] * gv, ab[1] * gv);
      vecs[i].setAttribute('x1', o.x); vecs[i].setAttribute('y1', o.y);
      vecs[i].setAttribute('x2', tip.x); vecs[i].setAttribute('y2', tip.y);
      vecs[i].setAttribute('opacity', gv > .03 ? 1 : 0);
      const q = sc.at(C[i][0], C[i][1]);
      links[i].setAttribute('x1', q.x); links[i].setAttribute('y1', q.y);
      links[i].setAttribute('x2', tip.x); links[i].setAttribute('y2', tip.y);
      links[i].setAttribute('opacity', gv > .8 ? 1 : 0);
    });

    const mTip = sc.planePoint(T, meanAB[0] * gm, meanAB[1] * gm);
    vMean.setAttribute('x1', o.x); vMean.setAttribute('y1', o.y);
    vMean.setAttribute('x2', mTip.x); vMean.setAttribute('y2', mTip.y);
    vMean.setAttribute('opacity', gm > .03 ? 1 : 0);
    dotMean.setAttribute('cx', mTip.x); dotMean.setAttribute('cy', mTip.y);
    dotMean.setAttribute('opacity', gm > .9 ? 1 : 0);
    labMean.show(false);

    if (gb > 0.002) {
      const full = sc.planePoint(T, meanAB[0], meanAB[1]);
      const R = sc.at(resultUV[0], resultUV[1]);
      back.setAttribute('x1', full.x); back.setAttribute('y1', full.y);
      back.setAttribute('x2', full.x + (R.x - full.x) * gb);
      back.setAttribute('y2', full.y + (R.y - full.y) * gb);
      back.setAttribute('opacity', 1);
      if (useGeodesic) {
        backArc.setAttribute('d', sc.pathUV(geo.trace(T, meanAB, gb, 44)));
        backArc.setAttribute('opacity', 1);
      }
      dotNew.setAttribute('cx', R.x); dotNew.setAttribute('cy', R.y);
      dotNew.setAttribute('opacity', gb > .9 ? 1 : 0);
      labNew.moveTo(R, 26, 24); labNew.show(gb > .9);
    }
  }

  function render(t = lastT) {
    lastT = t;
    hideAll();

    const o = sc.at(T[0], T[1]);
    hT.moveTo(o); labT.moveTo(o, -24, 22); labT.show(true);
    C.forEach((c, i) => {
      const q = sc.at(c[0], c[1]);
      hC[i].moveTo(q); labC[i].moveTo(q, 4, 26); labC[i].show(true);
    });

    if (mode === 'existing') {
      if (step === 1) {                       // Frechet mean, by Karcher flow
        const n = SOL.track.length - 1;
        const pos = Math.min(n, t * n), k = Math.floor(pos), fr = pos - k;
        const a = SOL.track[k], b = SOL.track[Math.min(n, k + 1)];
        const cur = [a[0] + fr * (b[0] - a[0]), a[1] + fr * (b[1] - a[1])];
        C.forEach((c, i) => {
          arcs[i].setAttribute('d', sc.pathUV(geo.trace(cur, geo.log(cur, c), 1, 40)));
          arcs[i].setAttribute('opacity', 1);
        });
        const R = sc.at(cur[0], cur[1]);
        dotNew.setAttribute('cx', R.x); dotNew.setAttribute('cy', R.y);
        dotNew.setAttribute('opacity', 1);
        labNew.moveTo(R, 26, 24); labNew.show(t > .85);
      } else if (step === 2) {
        tangentMethod(C.map((c) => geo.log(T, c)), SOL.kf,
                      geo.exp(T, SOL.kf), t, true,
                      '$\\tfrac1k\\sum_i\\log_{\\theta_t}(\\theta_t^{(i)})$');
      } else if (step === 3) {
        tangentMethod(C.map((c) => [c[0] - T[0], c[1] - T[1]]), SOL.rt,
                      [T[0] + SOL.rt[0], T[1] + SOL.rt[1]], t, false,
                      '$\\tfrac1k\\sum_i \\mathrm{R}^{-1}_{\\theta_t}(\\theta_t^{(i)})$');
      }
    } else {
      if (step === 1) {                       // RLAvg
        const P = S.point(T[0], T[1]);
        const lifted = C.map((c) => {
          const Q = S.point(c[0], c[1]);
          return toTangent(T, [Q[0] - P[0], Q[1] - P[1], Q[2] - P[2]]);
        });
        tangentMethod(lifted, SOL.rl, [T[0] + SOL.rl[0], T[1] + SOL.rl[1]], t, false,
                      '$\\bar V=\\tfrac1k\\sum_i L_{\\theta_t}(\\theta_t^{(i)})$');
      } else if (step === 2) {                // ProjAvg
        const gm = Math.min(1, t / 0.5), gb = Math.max(0, Math.min(1, (t - 0.45) / 0.55));
        const A = sc.amb(SOL.amb);
        C.forEach((c, i) => {
          const q = sc.at(c[0], c[1]);
          links[i].setAttribute('x1', q.x); links[i].setAttribute('y1', q.y);
          links[i].setAttribute('x2', q.x + (A.x - q.x) * gm);
          links[i].setAttribute('y2', q.y + (A.y - q.y) * gm);
          links[i].setAttribute('opacity', gm > .03 ? 1 : 0);
        });
        dotMean.setAttribute('cx', A.x); dotMean.setAttribute('cy', A.y);
        dotMean.setAttribute('opacity', gm > .85 ? 1 : 0);
        labMean.show(false);

        if (gb > 0.002) {
          const R = sc.at(SOL.amb[0], SOL.amb[1]);
          back.setAttribute('x1', A.x); back.setAttribute('y1', A.y);
          back.setAttribute('x2', A.x + (R.x - A.x) * gb);
          back.setAttribute('y2', A.y + (R.y - A.y) * gb);
          back.setAttribute('opacity', 1);
          dotNew.setAttribute('cx', R.x); dotNew.setAttribute('cy', R.y);
          dotNew.setAttribute('opacity', gb > .9 ? 1 : 0);
          labNew.moveTo(R, 26, 24); labNew.show(gb > .9);
          setTex(labPi, '$\\Pi$');
          labPi.moveTo({ x: (A.x + R.x) / 2, y: (A.y + R.y) / 2 }, 24, 0);
          labPi.show(gb > .35);
        }
      }
    }
  }

  const refresh = () => { SOL = solutions(); render(); };
  sc.onRedraw(() => render());
  sc.enableOrbit();
  sc.draggable(hT, (pt) => { T = sc.pickUV(pt, T); refresh(); });
  hC.forEach((h, i) => sc.draggable(h, (pt) => { C[i] = sc.pickUV(pt, C[i]); refresh(); }));
  sc.tool('reset', () => { T = T0.slice(); C = C0.map((c) => c.slice()); SOL = solutions(); sc.resetView(); });

  const durations = mode === 'existing' ? [0, 2600, 2000, 1800] : [0, 2000, 1800];
  render(1);

  return {
    setStep(n) {
      if (n === step) return;
      const back2 = n < step;
      step = n;
      ticker.run(back2 ? 0 : durations[n] ?? 900, render, { instant: back2 });
    },
    activate() {}, deactivate() { ticker.stop(); }
  };
}

export const aggExisting = (el) => build(el, 'existing');
export const aggProposed = (el) => build(el, 'proposed');