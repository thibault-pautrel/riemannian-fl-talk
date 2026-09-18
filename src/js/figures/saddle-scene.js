/* ============================================================
   Shared scene for every Riemannian tutorial figure.
   Draws the saddle patch once, and offers the primitives the
   overlays need: tangent plane, curves, vectors, dots, labels.

   Labels are HTML on top of the SVG, so KaTeX renders them.
   ============================================================ */

import { svgEl, polyline } from '../svg.js';
import { makeCamera } from '../geometry/projection.js';
import { makeSurface } from '../geometry/surface.js';

let seq = 0;

export function makeSaddleScene(el, opts = {}) {
  const W = opts.width ?? 1100, H = opts.height ?? 620;
  const uid = 'fig' + (++seq);

  el.classList.add('fig');
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg' });
  const labelBox = document.createElement('div');
  labelBox.className = 'fig-labels';
  const toolBox = document.createElement('div');
  toolBox.className = 'fig-tools';
  el.append(svg, labelBox, toolBox);

  // arrow heads, one set per figure instance
  const defs = svgEl('defs');
  const addMarker = (name, color) => {
    const m = svgEl('marker', {
      id: `${uid}-${name}`, viewBox: '0 0 10 10', refX: 9, refY: 5,
      markerWidth: 5.5, markerHeight: 5.5, orient: 'auto-start-reverse'
    });
    m.appendChild(svgEl('path', { d: 'M0 0 L10 5 L0 10 z', fill: color }));
    defs.appendChild(m);
  };
  addMarker('accent', '#B2182B');
  addMarker('navy', '#243B54');
  addMarker('amber', '#C77D24');
  addMarker('slate', '#9AA6B2');
  addMarker('mean', '#6B3FA0');
  svg.appendChild(defs);
  const arrow = (name) => `url(#${uid}-${name})`;

  const cam = makeCamera({
    scale: opts.scale ?? 105, zScale: opts.zScale ?? 1,
    cx: opts.cx ?? W / 2, cy: opts.cy ?? H * 0.53,
    azimuth: opts.azimuth ?? 225, elevation: opts.elevation ?? 34
  });
  const saddle = makeSurface(opts.surface ?? {});

  const layers = {};
  for (const name of ['surface', 'plane', 'curves', 'vectors', 'dots']) {
    layers[name] = svgEl('g');
    svg.appendChild(layers[name]);
  }

  // surface nodes are created once and only their d attribute changes,
  // so orbiting stays smooth
  const surfaceFill = svgEl('path', { fill: '#BAD1E6', 'fill-opacity': .55, stroke: 'none' });
  const surfaceRim  = svgEl('path', { fill: 'none', stroke: '#6C92B6', 'stroke-width': 1.6 });
  const meshPaths = [];
  layers.surface.appendChild(surfaceFill);
  for (let i = 0; i < 18; i++) {
    const n = svgEl('path', { fill: 'none', stroke: '#6C92B6', 'stroke-opacity': .55, 'stroke-width': .9 });
    layers.surface.appendChild(n);
    meshPaths.push(n);
  }
  layers.surface.appendChild(surfaceRim);

  function drawSurface() {
    const outline = saddle.boundary(cam, 54);
    surfaceFill.setAttribute('d', outline);
    surfaceRim.setAttribute('d', outline);
    saddle.meshLines(cam, { lines: 9, samples: 46 })
      .forEach((l, i) => { if (meshPaths[i]) meshPaths[i].setAttribute('d', l.d); });
  }

  // ---- coordinates -------------------------------------------------
  const at = (u, v) => cam.project(saddle.point(u, v));          // surface point
  const amb = (xyz) => cam.project(xyz);                          // ambient point

  // point of the tangent plane at p, coordinates (a, b) in (X_u, X_v)
  function planePoint(p, a, b) {
    const Xu = saddle.tangentU(p[0], p[1]), Xv = saddle.tangentV(p[0], p[1]);
    const o = saddle.point(p[0], p[1]);
    return amb([o[0] + a * Xu[0] + b * Xv[0],
                o[1] + a * Xu[1] + b * Xv[1],
                o[2] + a * Xu[2] + b * Xv[2]]);
  }

  const planeQuad = (p, r) => polyline(
    [planePoint(p, -r, -r), planePoint(p, r, -r), planePoint(p, r, r), planePoint(p, -r, r)], true);

  // a list of [u, v] turned into a path on the surface
  const pathUV = (list) => polyline(list.map(([u, v]) => at(u, v)));

  // ---- nodes -------------------------------------------------------
  function node(layer, tag, attrs = {}) {
    const n = svgEl(tag, attrs);
    layers[layer].appendChild(n);
    return n;
  }

  function dot(layer, cls = '') {
    const g = svgEl('g', { class: cls });
    g.appendChild(svgEl('circle', { r: 6.5, fill: '#fff' }));
    g.appendChild(svgEl('circle', { r: 4.4, fill: '#243B54' }));
    layers[layer].appendChild(g);
    return {
      node: g,
      moveTo(pt) { g.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`); },
      show(on) { g.setAttribute('opacity', on ? 1 : 0); }
    };
  }

  function label(html, cls = '') {
    const d = document.createElement('div');
    d.className = 'fig-label ' + cls;
    d.innerHTML = html;
    labelBox.appendChild(d);
    window.renderFigureMath?.(d);
    return {
      node: d,
      moveTo(pt, dx = 0, dy = 0) {
        d.style.left = (100 * (pt.x + dx) / W) + '%';
        d.style.top  = (100 * (pt.y + dy) / H) + '%';
      },
      show(on) { d.style.opacity = on ? 1 : 0; }
    };
  }

  // ---- interaction --------------------------------------------------

  const home = { azimuth: cam.azimuth, elevation: cam.elevation };
  const redrawFns = [];
  const onRedraw = (fn) => redrawFns.push(fn);
  function redraw() { drawSurface(); redrawFns.forEach((f) => f()); }

  // pointer position in viewBox coordinates, reveal scaling included
  function toLocal(e) {
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  }

  function enableOrbit() {
    let last = null;
    svg.style.cursor = 'grab';
    svg.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.fig-handle')) return;
      last = { x: e.clientX, y: e.clientY };
      svg.setPointerCapture(e.pointerId);
      svg.style.cursor = 'grabbing';
    });
    svg.addEventListener('pointermove', (e) => {
      if (!last) return;
      cam.azimuth  -= (e.clientX - last.x) * 0.35;
      cam.elevation = Math.max(8, Math.min(76, cam.elevation + (e.clientY - last.y) * 0.25));
      last = { x: e.clientX, y: e.clientY };
      redraw();
    });
    const stop = () => { last = null; svg.style.cursor = 'grab'; };
    svg.addEventListener('pointerup', stop);
    svg.addEventListener('pointercancel', stop);
  }

  function resetView() {
    cam.azimuth = home.azimuth;
    cam.elevation = home.elevation;
    redraw();
  }

  // a white grab handle
  function handle(layer, color = '#243B54') {
    const g = svgEl('g', { class: 'fig-handle' });
    g.appendChild(svgEl('circle', { r: 20, fill: 'transparent' }));  // hit area
    g.appendChild(svgEl('circle', { r: 7,  fill: '#fff' }));
    g.appendChild(svgEl('circle', { r: 4.6, fill: color }));
    layers[layer].appendChild(g);
    return {
      node: g,
      moveTo(pt) { g.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`); },
      show(on) { g.setAttribute('opacity', on ? 1 : 0); }
    };
  }

  // onDrag receives the pointer position in viewBox coordinates
  function draggable(h, onDrag) {
    const n = h.node ?? h;
    let active = false;
    n.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      active = true;
      n.setPointerCapture(e.pointerId);
    });
    n.addEventListener('pointermove', (e) => { if (active) onDrag(toLocal(e)); });
    const stop = () => { active = false; };
    n.addEventListener('pointerup', stop);
    n.addEventListener('pointercancel', stop);
  }

  // screen point -> parameters (u, v) of the surface, Newton from a guess
  function pickUV(target, guess) {
    let [u, v] = guess;
    for (let i = 0; i < 14; i++) {
      const c = at(u, v);
      const rx = c.x - target.x, ry = c.y - target.y;
      if (Math.hypot(rx, ry) < 0.05) break;
      const h = 1e-4;
      const du = at(u + h, v), dv = at(u, v + h);
      const a = (du.x - c.x) / h, b = (dv.x - c.x) / h;
      const cc = (du.y - c.y) / h, d = (dv.y - c.y) / h;
      const det = a * d - b * cc;
      if (Math.abs(det) < 1e-9) break;
      u -= ( d * rx - b * ry) / det;
      v -= (-cc * rx + a * ry) / det;
    }
    const lim = saddle.half - 0.25;
    return [Math.max(-lim, Math.min(lim, u)), Math.max(-lim, Math.min(lim, v))];
  }

  // screen point -> coordinates (a, b) in the tangent plane at p, exact
  function pickPlane(p, target) {
    const o = planePoint(p, 0, 0);
    const ea = planePoint(p, 1, 0), eb = planePoint(p, 0, 1);
    const a = ea.x - o.x, b = eb.x - o.x;
    const c = ea.y - o.y, d = eb.y - o.y;
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-9) return null;
    const rx = target.x - o.x, ry = target.y - o.y;
    return [( d * rx - b * ry) / det, (-c * rx + a * ry) / det];
  }

  function tool(text, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fig-tool';
    b.textContent = text;
    b.addEventListener('click', () => { onClick(); b.blur(); });
    toolBox.appendChild(b);
    return b;
  }

  function hint(text) {
    const d = document.createElement('div');
    d.className = 'fig-hint';
    d.textContent = text;
    toolBox.appendChild(d);
    return d;
  }

  function slider(label, { min = 0, max = 1, step = 0.01, value = 0.5 }, onInput) {
    const wrap = document.createElement('label');
    wrap.className = 'fig-slider';
    const name = document.createElement('span');
    name.className = 'nm';
    name.innerHTML = label;
    const input = document.createElement('input');
    Object.assign(input, { type: 'range', min, max, step, value });
    const out = document.createElement('span');
    out.className = 'vl';
    input.addEventListener('input', () => onInput(+input.value));
    wrap.append(name, input, out);
    toolBox.appendChild(wrap);
    return { node: wrap, input, set(txt) { out.textContent = txt; } };
  }

  return { svg, cam, saddle, surface: saddle, uid, arrow, layers,
           drawSurface, at, amb, planePoint, planeQuad, pathUV, node, dot, label,
           onRedraw, redraw, enableOrbit, resetView, handle, draggable,
           pickUV, pickPlane, tool, hint, slider };
}