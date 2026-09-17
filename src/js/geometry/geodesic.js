/* ============================================================
   Geodesics of a graph surface  w = f(u, v).

   A tangent vector is written in the basis (X_u, X_v), so it is
   a pair (a, b) of parameter velocities.

   Geodesic equation, with  H = f_uu a^2 + 2 f_uv a b + f_vv b^2
   and  D = 1 + f_u^2 + f_v^2:
        u'' = - f_u H / D ,   v'' = - f_v H / D
   Integrated with RK4.
   ============================================================ */

export function makeGeodesics(S) {

  const acc = (u, v, du, dv) => {
    const [fu, fv] = S.grad(u, v);
    const [uu, uv, vv] = S.hess(u, v);
    const H = uu * du * du + 2 * uv * du * dv + vv * dv * dv;
    const D = 1 + fu * fu + fv * fv;
    return [-fu * H / D, -fv * H / D];
  };

  const F = (s) => { const [au, av] = acc(s[0], s[1], s[2], s[3]); return [s[2], s[3], au, av]; };
  const add = (s, d, h) => s.map((x, i) => x + h * d[i]);

  function rk4(s, h) {
    const k1 = F(s);
    const k2 = F(add(s, k1, h / 2));
    const k3 = F(add(s, k2, h / 2));
    const k4 = F(add(s, k3, h));
    return s.map((x, i) => x + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }

  // the geodesic from p with initial velocity vel, sampled on [0, T]
  function trace(p, vel, T = 1, n = 64) {
    let s = [p[0], p[1], vel[0], vel[1]];
    const out = [[s[0], s[1]]];
    if (T === 0) return out;
    const h = T / n;
    for (let i = 0; i < n; i++) { s = rk4(s, h); out.push([s[0], s[1]]); }
    return out;
  }

  const exp = (p, vel, t = 1) => trace(p, vel, t, 48).at(-1);

  // log by shooting: Newton on the endpoint, numerical 2x2 Jacobian
  function log(p, q, iters = 14) {
    let vel = [q[0] - p[0], q[1] - p[1]];
    for (let i = 0; i < iters; i++) {
      const e = exp(p, vel);
      const r = [e[0] - q[0], e[1] - q[1]];
      if (Math.hypot(r[0], r[1]) < 1e-10) break;
      const eps = 1e-6, J = [[0, 0], [0, 0]];
      for (let j = 0; j < 2; j++) {
        const w = vel.slice(); w[j] += eps;
        const ej = exp(p, w);
        J[0][j] = (ej[0] - e[0]) / eps;
        J[1][j] = (ej[1] - e[1]) / eps;
      }
      const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
      if (Math.abs(det) < 1e-12) break;
      vel = [vel[0] - ( J[1][1] * r[0] - J[0][1] * r[1]) / det,
             vel[1] - (-J[1][0] * r[0] + J[0][0] * r[1]) / det];
    }
    return vel;
  }

  // Riemannian inner product of two tangent vectors at p,
  // both written in the basis (X_u, X_v)
  function inner(p, x, y) {
    const [fu, fv] = S.grad(p[0], p[1]);
    return (1 + fu * fu) * x[0] * y[0]
         + fu * fv * (x[0] * y[1] + x[1] * y[0])
         + (1 + fv * fv) * x[1] * y[1];
  }

  const norm = (p, vel) => Math.sqrt(inner(p, vel, vel));

  return { trace, exp, log, inner, norm };
}