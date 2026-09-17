/* ============================================================
   A graph surface  w = f(u, v)  on [-half, half]^2.

   f is a quadratic term plus a sum of Gaussian bumps, so the
   first and second derivatives are analytic. The geodesic
   solver needs the full Hessian, hence hess().

   The default preset is a broad basin with three low bumps:
   generic, mostly concave, curvature of both signs.
   ============================================================ */

import { polyline } from '../svg.js';

export const TERRAIN = {
  quad: { uu: 0.020, vv: -0.030, uv: 0.040 },
  bumps: [
    { A:  0.80, u0: -0.05, v0:  0.05, w: 2.80 },   // the central bump
    { A: -0.34, u0:  1.45, v0:  1.20, w: 1.40 },   // three shallow dips
    { A: -0.28, u0: -1.50, v0:  1.35, w: 1.50 },
    { A: -0.22, u0:  0.95, v0: -1.55, w: 1.60 }
  ]
};

export function makeSurface(opts = {}) {
  const S = {
    half:  opts.half  ?? 2,
    amp:   opts.amp   ?? 1,          // global height factor, animatable
    quad:  opts.quad  ?? TERRAIN.quad,
    bumps: opts.bumps ?? TERRAIN.bumps
  };

  const bump = (b, u, v) => {
    const du = u - b.u0, dv = v - b.v0;
    return b.A * Math.exp(-(du * du + dv * dv) / b.w);
  };

  S.height = (u, v) => {
    let z = S.quad.uu * u * u + S.quad.vv * v * v + S.quad.uv * u * v;
    for (const b of S.bumps) z += bump(b, u, v);
    return S.amp * z;
  };

  S.grad = (u, v) => {
    let fu = 2 * S.quad.uu * u + S.quad.uv * v;
    let fv = 2 * S.quad.vv * v + S.quad.uv * u;
    for (const b of S.bumps) {
      const e = bump(b, u, v);
      fu += -2 * (u - b.u0) / b.w * e;
      fv += -2 * (v - b.v0) / b.w * e;
    }
    return [S.amp * fu, S.amp * fv];
  };

  // [f_uu, f_uv, f_vv]
  S.hess = (u, v) => {
    let uu = 2 * S.quad.uu, vv = 2 * S.quad.vv, uv = S.quad.uv;
    for (const b of S.bumps) {
      const du = u - b.u0, dv = v - b.v0, e = bump(b, u, v), w2 = b.w * b.w;
      uu += e * (4 * du * du / w2 - 2 / b.w);
      vv += e * (4 * dv * dv / w2 - 2 / b.w);
      uv += e * (4 * du * dv / w2);
    }
    return [S.amp * uu, S.amp * uv, S.amp * vv];
  };

  S.point    = (u, v) => [u, v, S.height(u, v)];
  S.tangentU = (u, v) => [1, 0, S.grad(u, v)[0]];
  S.tangentV = (u, v) => [0, 1, S.grad(u, v)[1]];
  S.normal   = (u, v) => { const [a, b] = S.grad(u, v); return [-a, -b, 1]; };

  S.curve = (cam, uv, t0, t1, samples = 60) => {
    const pts = [];
    for (let i = 0; i <= samples; i++) {
      const t = t0 + (t1 - t0) * i / samples;
      const [u, v] = uv(t);
      pts.push(cam.project(S.point(u, v)));
    }
    return pts;
  };

  S.meshLines = (cam, { lines = 9, samples = 46 } = {}) => {
    const h = S.half, out = [];
    const build = (fixed, along) => {
      const pts = [];
      let depth = 0;
      for (let i = 0; i <= samples; i++) {
        const t = -h + 2 * h * i / samples;
        const p = cam.project(along ? S.point(fixed, t) : S.point(t, fixed));
        depth += p.d;
        pts.push(p);
      }
      out.push({ d: polyline(pts), depth: depth / (samples + 1) });
    };
    for (let i = 0; i < lines; i++) {
      const c = -h + 2 * h * i / (lines - 1);
      build(c, true);
      build(c, false);
    }
    return out;
  };

  S.boundary = (cam, samples = 60) => {
    const h = S.half, pts = [];
    const edge = (f) => {
      for (let i = 0; i <= samples; i++) {
        const t = -h + 2 * h * i / samples;
        pts.push(cam.project(S.point(...f(t))));
      }
    };
    edge(t => [t, -h]); edge(t => [h, t]);
    edge(t => [-t, h]); edge(t => [-h, -t]);
    return polyline(pts, true);
  };

  return S;
}