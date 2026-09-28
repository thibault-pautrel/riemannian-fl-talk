import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';
import { makeEEG, CHANNELS } from '../data/eeg.js';

/* Wide diagram of EEGNet, built like spdnet-arch: each step animates the
   viewBox onto one block and fades in a detail card. Step 4 returns to the
   overview and says that every layer here is Euclidean.

   The input is the raw trial, drawn as traces with the same channel colours
   as the EEG pipeline figures. */

const DATA = makeEEG();
const C = DATA.C;

const CW = 1760, CH = 640;
const BH = 300, BY = 110, MID = BY + BH / 2;
const ZW = 1000, ZH = ZW * CH / CW;

const LAYERS = [
  { x: 262, w: 430, label: 'Temporal + spatial',
    eq: 'conv over time, then depthwise over channels',
    color: '#0072B2', tint: '#E7F1F9' },
  { x: 762, w: 390, label: 'Separable conv',
    eq: 'depthwise in time, then pointwise',
    color: '#009E73', tint: '#E4F5EE' }
];

/* ---- traces, reused by the diagram and by the card illustrations ---- */

// one channel, drawn inside the box (x, y, w, h) split into `rows` lanes
function tracePath(ch, lane, rows, x, y, w, h, n = 110, from = 0, span = 1) {
  const rowH = h / rows, base = y + rowH * (lane + 0.5), amp = rowH * 0.40;
  let d = '';
  for (let k = 0; k <= n; k++) {
    const f = from + span * k / n;
    const t = Math.min(DATA.T - 1, Math.max(0, Math.round(f * (DATA.T - 1))));
    d += (k ? 'L' : 'M') + (x + w * k / n).toFixed(1) + ' ' +
         (base - amp * DATA.Xc[ch][t] / 3.2).toFixed(1);
  }
  return d;
}

// the same block of traces as raw markup, for the card SVGs
function tracesMarkup(x, y, w, h, opts = {}) {
  const rows = opts.rows ?? C;
  const width = opts.width ?? 1.1;
  const from = opts.from ?? 0, span = opts.span ?? 1;
  const shift = opts.shift ?? 0;
  let s = '';
  for (let i = 0; i < rows; i++) {
    const ch = (i + shift) % C;
    s += `<path d="${tracePath(ch, i, rows, x, y, w, h, 70, from, span)}" fill="none" ` +
         `stroke="${CHANNELS[ch].color}" stroke-width="${width}" stroke-linejoin="round"/>`;
  }
  return s + `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ` +
             `stroke="#C3D0DA" stroke-width="1"/>`;
}

const ARROW_DEF = `<defs><marker id="en-a" viewBox="0 0 10 10" refX="9" refY="5"
  markerWidth="5" markerHeight="5" orient="auto">
  <path d="M0 0L10 5L0 10z" fill="#243B54"/></marker></defs>`;

const CARDS = [
  {
    tag: 'parametrised layers',
    title: 'Temporal + spatial',
    eq: '$F_1$ temporal filters, $D$ spatial filters each',
    body: 'Temporal convolutions pick up the rhythms, then a depthwise spatial ' +
          'convolution mixes the channels, with several spatial filters per ' +
          'temporal feature. Batch normalisation, ELU, average pooling and dropout follow.',
    art: `<svg viewBox="0 0 320 136">${ARROW_DEF}
      ${tracesMarkup(8, 16, 104, 84, { rows: 6, width: 1.1 })}
      <rect x="34" y="16" width="20" height="84" fill="none" stroke="#0072B2"
        stroke-width="1.8" stroke-dasharray="4 3"/>
      <text x="60" y="116" text-anchor="middle" font-size="12" fill="#707F8F">C × 𝒯</text>
      <path d="M118 58H146" stroke="#243B54" stroke-width="1.4" marker-end="url(#en-a)"/>
      ${[0, 1, 2].map((k) =>
        tracesMarkup(152 + k * 9, 12 + k * 13, 62, 56,
                     { rows: 3, width: 1, shift: 2 * k, from: 0.1 * k, span: 0.45 })).join('')}
      <text x="196" y="116" text-anchor="middle" font-size="12" fill="#707F8F">F₁D maps</text>
      <path d="M236 58H262" stroke="#243B54" stroke-width="1.4" marker-end="url(#en-a)"/>
      <rect x="268" y="36" width="46" height="44" rx="3" fill="#fff"
        stroke="#0072B2" stroke-width="1.6"/>
      <text x="291" y="56" text-anchor="middle" font-size="11" fill="#0072B2">BN, ELU</text>
      <text x="291" y="70" text-anchor="middle" font-size="11" fill="#0072B2">pool</text>
    </svg>`
  },
  {
    tag: 'parametrised layers',
    title: 'Separable conv',
    eq: 'depthwise $\\times$ pointwise, $F_2$ maps out',
    body: 'A separable convolution, factorised into a depthwise temporal kernel ' +
          'followed by pointwise filters. Same batch normalisation, ELU, pooling ' +
          'and dropout. Far fewer weights than a full convolution.',
    art: `<svg viewBox="0 0 320 136">${ARROW_DEF}
      ${[0, 1, 2].map((k) =>
        tracesMarkup(8 + k * 9, 16 + k * 13, 58, 52,
                     { rows: 3, width: 1, shift: k, from: 0.12 * k, span: 0.4 })).join('')}
      <text x="46" y="116" text-anchor="middle" font-size="12" fill="#707F8F">F₁D maps</text>
      <path d="M96 58H122" stroke="#243B54" stroke-width="1.4" marker-end="url(#en-a)"/>
      <rect x="128" y="32" width="26" height="52" rx="3" fill="#fff"
        stroke="#009E73" stroke-width="1.7"/>
      <text x="141" y="62" text-anchor="middle" font-size="10" fill="#009E73">1×k</text>
      <path d="M158 58H182" stroke="#243B54" stroke-width="1.4" marker-end="url(#en-a)"/>
      <rect x="188" y="32" width="26" height="52" rx="3" fill="#fff"
        stroke="#009E73" stroke-width="1.7"/>
      <text x="201" y="62" text-anchor="middle" font-size="10" fill="#009E73">1×1</text>
      <path d="M218 58H244" stroke="#243B54" stroke-width="1.4" marker-end="url(#en-a)"/>
      ${[0, 1].map((k) =>
        tracesMarkup(250 + k * 10, 30 + k * 13, 44, 40,
                     { rows: 2, width: 1, shift: 3 + k, from: 0.2 * k, span: 0.3 })).join('')}
      <text x="280" y="116" text-anchor="middle" font-size="12" fill="#707F8F">F₂ maps</text>
    </svg>`
  },
  {
    tag: 'parametrised layer',
    title: 'Linear head',
    eq: '$\\hat y=\\mathrm{softmax}(\\xi\\,h+\\beta)$',
    body: 'The maps are flattened and a single linear layer produces the class ' +
          'scores. No constraint anywhere: every weight of EEGNet is a free ' +
          'Euclidean parameter.',
    art: `<svg viewBox="0 0 320 124">${ARROW_DEF}
      ${[0, 1].map((k) =>
        tracesMarkup(10 + k * 10, 24 + k * 13, 46, 40,
                     { rows: 2, width: 1, shift: 4 + k, from: 0.15 * k, span: 0.3 })).join('')}
      <path d="M82 54H106" stroke="#243B54" stroke-width="1.4" marker-end="url(#en-a)"/>
      ${Array.from({ length: 12 }, (_, i) => {
        const v = DATA.Xc[i % C][20 + i * 7] / 3.2;
        const op = (0.25 + 0.65 * Math.min(1, Math.abs(v))).toFixed(2);
        return `<rect x="112" y="${16 + i * 6}" width="22" height="5.2"
                  fill="#5A6EC8" fill-opacity="${op}" stroke="#fff" stroke-width=".5"/>`;
      }).join('')}
      <text x="123" y="106" text-anchor="middle" font-size="12" fill="#707F8F">flatten</text>
      <path d="M140 54H166" stroke="#243B54" stroke-width="1.4" marker-end="url(#en-a)"/>
      <rect x="172" y="34" width="46" height="40" rx="3" fill="#fff"
        stroke="#5A6EC8" stroke-width="1.7"/>
      <text x="195" y="59" text-anchor="middle" font-size="14" font-weight="600"
        fill="#5A6EC8">FC</text>
      <path d="M222 54H248" stroke="#243B54" stroke-width="1.4" marker-end="url(#en-a)"/>
      ${[38, 22, 54, 14].map((h, i) =>
        `<rect x="${256 + i * 16}" y="${74 - h}" width="11" height="${h}"
           fill="#5A6EC8" fill-opacity=".55"/>`).join('')}
      <text x="286" y="106" text-anchor="middle" font-size="12" fill="#707F8F">K classes</text>
    </svg>`
  }
];

export default function eegnetArch(el) {
  const sc = makeScene(el, { width: CW, height: CH });
  const ticker = makeTicker();

  const txt = (parent, x, y, s, opts = {}) => {
    const n = sc.node(parent, 'text', {
      x, y, 'text-anchor': opts.anchor ?? 'middle',
      'font-size': opts.size ?? 20, 'font-weight': opts.weight ?? 400,
      fill: opts.fill ?? '#243B54',
      'font-family': opts.mono ? 'var(--mono)' : 'var(--sans)'
    });
    n.textContent = s;
    return n;
  };

  const g = sc.g();

  // ---- input, the raw trial as traces
  {
    const X0 = 46, W0 = 176, H0 = 168, Y0 = MID - H0 / 2;
    const rowH = H0 / C;
    for (let i = 0; i < C; i++) {
      sc.node(g, 'line', { x1: X0, y1: Y0 + i * rowH, x2: X0 + W0, y2: Y0 + i * rowH,
                           stroke: '#E4EAEF', 'stroke-width': 1 });
      sc.node(g, 'path', {
        d: tracePath(i, i, C, X0, Y0, W0, H0, 150),
        fill: 'none', stroke: CHANNELS[i].color, 'stroke-width': 1.5,
        'stroke-linejoin': 'round'
      });
      sc.node(g, 'rect', { x: X0 - 11, y: Y0 + i * rowH + rowH / 2 - 3,
                           width: 7, height: 6, fill: CHANNELS[i].color });
    }
    sc.node(g, 'rect', { x: X0, y: Y0, width: W0, height: H0, fill: 'none',
                         stroke: '#9AA6B2', 'stroke-width': 1.4 });
    txt(g, X0 + W0 / 2, Y0 - 22, 'raw trial', { size: 17, fill: '#707F8F', mono: true });
    txt(g, X0 + W0 / 2, Y0 + H0 + 32, 'X ∈ ℝ^(C × 𝒯)',
        { size: 18, fill: '#707F8F', mono: true });
  }

  const arrow = (x1, x2, y = MID) => sc.node(g, 'path', {
    d: `M${x1} ${y}H${x2}`, stroke: '#243B54', 'stroke-width': 1.8,
    fill: 'none', 'marker-end': sc.arrow('navy')
  });
  arrow(232, LAYERS[0].x - 6);

  // ---- the trunk, drawn behind the two blocks
  const TRUNK_X = LAYERS[0].x - 24;
  const TRUNK_W = LAYERS[1].x + LAYERS[1].w + 24 - TRUNK_X;
  sc.node(g, 'rect', {
    x: TRUNK_X, y: BY - 30, width: TRUNK_W, height: BH + 86, rx: 10,
    fill: '#F3F7FA', stroke: '#8A9AA8', 'stroke-width': 1.4, 'stroke-dasharray': '8 6'
  });

  // ---- the two convolution blocks
  const blocks = LAYERS.map((L, i) => {
    const gg = sc.g(g);
    const bar = sc.node(gg, 'rect', { x: L.x, y: BY, width: L.w, height: 11, rx: 2, fill: L.color });
    const box = sc.node(gg, 'rect', {
      x: L.x, y: BY + 11, width: L.w, height: BH - 11, rx: 4,
      fill: L.tint, stroke: L.color, 'stroke-width': 1.8
    });
    txt(gg, L.x + L.w / 2, MID - 4, L.label, { size: 30, weight: 650, fill: L.color });
    txt(gg, L.x + L.w / 2, MID + 30, L.eq, { size: 16, fill: '#5A6B7A', mono: true });
    txt(gg, L.x + L.w / 2, MID + 62, 'BN · ELU · pool · dropout',
        { size: 15, fill: '#8A9AA8', mono: true });
    if (i < LAYERS.length - 1) arrow(L.x + L.w + 6, LAYERS[i + 1].x - 6);
    return { bar, box, gg };
  });
  arrow(LAYERS[1].x + LAYERS[1].w + 6, 1198);

  txt(g, TRUNK_X + TRUNK_W / 2, BY - 44, 'trunk',
      { size: 22, weight: 600, fill: '#5A6B7A', mono: true });

  // ---- head of the network
  const headG = sc.g(g);
  sc.node(headG, 'circle', { cx: 1236, cy: MID, r: 34, fill: '#F2F5F7',
                             stroke: '#8A9AA8', 'stroke-width': 1.5 });
  txt(headG, 1236, MID + 6, 'flatten', { size: 15, weight: 600, fill: '#5A6B7A' });
  arrow(1272, 1300);
  [{ x: 1306, w: 118, t: 'FC', color: '#5A6EC8', tint: '#EDEFF9' },
   { x: 1462, w: 156, t: 'softmax', color: '#8A9AA8', tint: '#F2F5F7' }].forEach((b) => {
    sc.node(headG, 'rect', { x: b.x, y: MID - 40, width: b.w, height: 80, rx: 4,
                             fill: b.tint, stroke: b.color, 'stroke-width': 1.7 });
    txt(headG, b.x + b.w / 2, MID + 7, b.t, { size: 20, weight: 600, fill: b.color });
    arrow(b.x + b.w + 6, b.x + b.w + 34);
  });
  txt(headG, 1668, MID + 10, 'ŷ', { size: 30, fill: '#243B54' });
  txt(headG, 1540, BY - 44, 'head', { size: 22, weight: 600, fill: '#5A6B7A', mono: true });

  const hint = txt(g, CW / 2, CH - 34, 'press → to zoom on each block',
                   { size: 20, fill: '#8A9AA8', mono: true });

  // ---- detail cards, plain HTML so KaTeX renders
  const COLORS = [LAYERS[0].color, LAYERS[1].color, '#5A6EC8'];
  const cards = CARDS.map((c, i) => {
    const d = document.createElement('div');
    d.className = 'arch-card';
    d.style.borderLeftColor = COLORS[i];
    d.innerHTML =
      `<div class="tag" style="color:${COLORS[i]}">${c.tag}</div>` +
      `<h4 style="color:${COLORS[i]}">${c.title}</h4>` +
      `<div class="eq">${c.eq}</div>` +
      `<div class="art">${c.art}</div>` +
      `<p>${c.body}</p>`;
    el.appendChild(d);
    window.renderFigureMath?.(d);      // the slides were typeset before this card existed
    return d;
  });

  // ---- viewBox windows
  const clampX = (x) => Math.max(0, Math.min(CW - ZW, x));
  const VB = [
    [0, 0, CW, CH],
    [clampX(LAYERS[0].x - 70), MID - ZH / 2, ZW, ZH],
    [clampX(LAYERS[1].x - 70), MID - ZH / 2, ZW, ZH],
    [clampX(1136), MID - ZH / 2, ZW, ZH],
    [0, 0, CW, CH]
  ];

  let step = 0, from = VB[0].slice(), to = VB[0].slice();

  function render(t) {
    const vb = from.map((v, i) => v + (to[i] - v) * t);
    sc.svg.setAttribute('viewBox', vb.map((v) => v.toFixed(1)).join(' '));

    blocks.forEach((b, i) => {
      const focus = (step === 1 && i === 0) || (step === 2 && i === 1);
      b.box.setAttribute('stroke-width', focus ? 3.2 : 1.8);
    });

    cards.forEach((c, i) => c.classList.toggle('on', step - 1 === i && t > 0.55));
    hint.setAttribute('opacity', step === 0 ? 1 : 0);
    hint.textContent = step === 4
      ? 'every weight is a free Euclidean parameter'
      : 'press → to zoom on each block';
    if (step === 4) hint.setAttribute('opacity', t);
  }

  render(1);

  return {
    setStep(n) {
      if (n === step) return;
      const cur = (sc.svg.getAttribute('viewBox') || VB[0].join(' ')).split(' ').map(Number);
      from = cur;
      to = VB[Math.max(0, Math.min(VB.length - 1, n))].slice();
      step = n;
      ticker.run(620, render);
    },
    activate() {}, deactivate() { ticker.stop(); }
  };
}