import { svgEl } from '../svg.js';

let seq = 0;

export function makeScene(el, { width = 1100, height = 620 } = {}) {
  const W = width, H = height;
  const uid = 'sc' + (++seq);

  el.classList.add('fig');
  el.style.setProperty('--fig-ar', `${W}/${H}`);

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg' });
  const labelBox = document.createElement('div'); labelBox.className = 'fig-labels';
  const toolBox  = document.createElement('div'); toolBox.className  = 'fig-tools';
  el.append(svg, labelBox, toolBox);

  const defs = svgEl('defs'); svg.appendChild(defs);
  const addMarker = (name, color) => {
    const m = svgEl('marker', {
      id: `${uid}-${name}`, viewBox: '0 0 10 10', refX: 9, refY: 5,
      markerWidth: 5.5, markerHeight: 5.5, orient: 'auto-start-reverse'
    });
    m.appendChild(svgEl('path', { d: 'M0 0 L10 5 L0 10 z', fill: color }));
    defs.appendChild(m);
  };
  addMarker('navy', '#243B54');
  addMarker('accent', '#B2182B');
  addMarker('slate', '#707F8F');
  const arrow = (n) => `url(#${uid}-${n})`;

  const g = (parent) => { const n = svgEl('g'); (parent ?? svg).appendChild(n); return n; };
  const node = (parent, tag, attrs = {}) => { const n = svgEl(tag, attrs); parent.appendChild(n); return n; };

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

  function tool(text, onClick) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'fig-tool'; b.textContent = text;
    b.addEventListener('click', () => { onClick(); b.blur(); });
    toolBox.appendChild(b);
    return b;
  }
  function hint(text) {
    const d = document.createElement('div');
    d.className = 'fig-hint'; d.textContent = text;
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
  return { svg, W, H, uid, arrow, g, node, label, tool, hint, slider };
}