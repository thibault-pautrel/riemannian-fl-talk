/* ============================================================
   Orthographic camera.

   A 3D point is [u, v, w], with w the vertical axis.
   azimuth and elevation are in degrees.

   azimuth 225 and elevation 34 reproduce the view of the
   beamer figures, where x = 0.78 (u - v) and y = 0.40 (u + v) + 0.72 w.
   Unlike the TikZ version this is a true rotation, so the angles
   can be animated.
   ============================================================ */

const RAD = Math.PI / 180;

export function makeCamera(opts = {}) {
  const cam = {
    azimuth:   opts.azimuth   ?? 225,
    elevation: opts.elevation ?? 34,
    scale:     opts.scale     ?? 100,   // stage pixels per unit
    zScale:    opts.zScale    ?? 0.88,  // vertical squash, taste only
    cx:        opts.cx        ?? 0,     // screen position of the origin
    cy:        opts.cy        ?? 0
  };

  // returns { x, y, d }. x and y are SVG coordinates, y points down.
  // d is depth, larger means closer to the viewer.
  cam.project = ([u, v, w]) => {
    const a = cam.azimuth * RAD, e = cam.elevation * RAD;
    const ca = Math.cos(a), sa = Math.sin(a);
    const ce = Math.cos(e), se = Math.sin(e);
    const z = w * cam.zScale;

    const x = -sa * u + ca * v;
    const y = -se * ca * u - se * sa * v + ce * z;
    const d =  ce * ca * u + ce * sa * v + se * z;

    return { x: cam.cx + cam.scale * x, y: cam.cy - cam.scale * y, d };
  };

  return cam;
}