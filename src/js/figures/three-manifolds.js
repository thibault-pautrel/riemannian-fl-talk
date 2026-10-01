import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';

/* Three thumbnails, one per column of the table above: the sphere, an
   orthonormal frame for Stiefel, and the SPD cone. */

const CW = 1200, CH = 200;
const NAVY = '#243B54', SLATE = '#9AA6B2', ACC = '#B2182B';
const BLUE = '#5F86AC', FILL = '#D6E4F2';

const CX = [323, 678, 1033];
const CY = 104;

export default function threeManifolds(el) {
  const sc = makeScene(el, { width: CW, height: CH });
  const ticker = makeTicker();

  const g = sc.g();
  const txt = (x, y, s, o = {}) => {
    const n = sc.node(g, 'text', {
      x, y, 'text-anchor': o.anchor ?? 'middle', 'font-size': o.size ?? 15,
      'font-weight': o.weight ?? 400, fill: o.fill ?? SLATE,
      'font-family': o.mono ? 'var(--mono)' : 'var(--sans)'
    });
    n.textContent = s;
    return n;
  };

  // ---- 1. the sphere, with a point and its tangent plane
  {
    const cx = CX[0], R = 60;
    sc.node(g, 'circle', { cx, cy: CY, r: R, fill: FILL, 'fill-opacity': .75,
                           stroke: BLUE, 'stroke-width': 1.6 });
    sc.node(g, 'ellipse', { cx, cy: CY, rx: R, ry: R * 0.3, fill: 'none',
                            stroke: BLUE, 'stroke-opacity': .5, 'stroke-width': 1 });
    sc.node(g, 'ellipse', { cx, cy: CY, rx: R * 0.42, ry: R, fill: 'none',
                            stroke: BLUE, 'stroke-opacity': .5, 'stroke-width': 1 });
    const px = cx + R * 0.56, py = CY - R * 0.72;
    sc.node(g, 'path', { d: `M${px - 34} ${py - 10}L${px + 30} ${py - 22}` +
                            `L${px + 22} ${py + 8}L${px - 42} ${py + 20}Z`,
                         fill: ACC, 'fill-opacity': .14, stroke: ACC,
                         'stroke-opacity': .6, 'stroke-width': 1.2 });
    sc.node(g, 'circle', { cx: px, cy: py, r: 4.6, fill: NAVY });
    txt(cx, CY + R + 26, 'unit vectors');
  }

  // ---- 2. Stiefel, as an orthonormal frame
  {
    const cx = CX[1];
    sc.node(g, 'circle', { cx, cy: CY, r: 58, fill: FILL, 'fill-opacity': .45,
                           stroke: BLUE, 'stroke-opacity': .5, 'stroke-width': 1.2,
                           'stroke-dasharray': '6 5' });
    const arrow = (dx, dy) => sc.node(g, 'path', {
      d: `M${cx} ${CY}L${cx + dx} ${CY + dy}`, fill: 'none', stroke: NAVY,
      'stroke-width': 2.2, 'marker-end': sc.arrow('navy')
    });
    arrow(52, -22);
    arrow(-20, -50);
    // the right angle between the two columns
    sc.node(g, 'path', { d: `M${cx + 17} ${CY - 7}L${cx + 11} ${CY - 23}` +
                            `L${cx - 6} ${CY - 16}`,
                         fill: 'none', stroke: SLATE, 'stroke-width': 1.2 });
    txt(cx + 62, CY - 26, 'x₁', { anchor: 'start', size: 16, fill: NAVY });
    txt(cx - 26, CY - 58, 'x₂', { anchor: 'end', size: 16, fill: NAVY });
    txt(cx, CY + 86, 'orthonormal columns');
  }

  // ---- 3. the SPD cone
  {
    const cx = CX[2];
    const apex = CY + 62, top = CY - 54, rx = 58, ry = 15;
    sc.node(g, 'path', { d: `M${cx - rx} ${top}L${cx} ${apex}L${cx + rx} ${top}Z`,
                         fill: FILL, 'fill-opacity': .8, stroke: BLUE, 'stroke-width': 1.6 });
    sc.node(g, 'ellipse', { cx, cy: top, rx, ry, fill: '#8FB0D3', 'fill-opacity': .6,
                            stroke: BLUE, 'stroke-width': 1.4 });
    [0.45, 0.75].forEach((f) => {
      const y = apex - (apex - top) * f;
      sc.node(g, 'path', { d: `M${cx - rx * f} ${y}Q${cx} ${y + 2 * ry * f} ` +
                              `${cx + rx * f} ${y}`,
                           fill: 'none', stroke: BLUE, 'stroke-opacity': .5,
                           'stroke-width': .9 });
    });
    sc.node(g, 'circle', { cx: cx - 14, cy: CY + 4, r: 4.6, fill: NAVY });
    sc.node(g, 'circle', { cx, cy: apex, r: 3.4, fill: NAVY });
    txt(cx, apex + 24, 'open convex cone');
  }

  return {
    setStep() {},
    activate() {}, deactivate() { ticker.stop(); }
  };
}
