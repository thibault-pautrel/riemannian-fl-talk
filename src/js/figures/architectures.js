import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';
import { makeEEG, CHANNELS, rdbu } from '../data/eeg.js';

/* The two models, each split into a trunk and a linear head.
   The trunk is opened up: SPDNet layer by layer, EEGNet block by block,
   with the batch norm marked, since it is switched on and off. */

const DATA = makeEEG();
const C = DATA.C;

const CW = 1560, CH = 520;
const NAVY = '#243B54', SLATE = '#8A9AA8', RULE = '#DCE3E8';
const TRUNK = '#0072B2', HEAD = '#5A6EC8', BN = '#E69F00';

const ROW = [142, 366];
const X_IN = 132;
const TRUNK_X = 236, TRUNK_W = 840;
const HEAD_X = 1140, HEAD_W = 210;
const X_OUT = 1440;

export default function architectures(el) {
  const sc = makeScene(el, { width: CW, height: CH });
  const ticker = makeTicker();

  const g = sc.g();
  const txt = (parent, x, y, s, o = {}) => {
    const n = sc.node(parent, 'text', {
      x, y, 'text-anchor': o.anchor ?? 'middle', 'font-size': o.size ?? 16,
      'font-weight': o.weight ?? 400, fill: o.fill ?? SLATE,
      'font-family': o.mono ? 'var(--mono)' : 'var(--sans)'
    });
    n.textContent = s;
    return n;
  };
  const arrow = (parent, x1, x2, y) => sc.node(parent, 'path', {
    d: `M${x1} ${y}H${x2}`, fill: 'none', stroke: NAVY, 'stroke-width': 1.7,
    'marker-end': sc.arrow('navy')
  });

  function covArt(parent, cx, cy, size) {
    const c = size / C;
    for (let i = 0; i < C; i++)
      for (let j = 0; j < C; j++)
        sc.node(parent, 'rect', {
          x: cx - size / 2 + j * c, y: cy - size / 2 + i * c,
          width: c + 0.4, height: c + 0.4, fill: rdbu(DATA.corr[i][j])
        });
    sc.node(parent, 'rect', { x: cx - size / 2, y: cy - size / 2, width: size, height: size,
                              fill: 'none', stroke: '#9A3D42', 'stroke-width': 1.3 });
  }

  function trialArt(parent, cx, cy, w, h) {
    const rowH = h / C;
    for (let i = 0; i < C; i++) {
      let d = '';
      for (let k = 0; k <= 90; k++) {
        const t = Math.round(k / 90 * (DATA.T - 1));
        d += (k ? 'L' : 'M') + (cx - w / 2 + w * k / 90).toFixed(1) + ' ' +
             (cy - h / 2 + rowH * (i + 0.5) - rowH * 0.4 * DATA.Xc[i][t] / 3.2).toFixed(1);
      }
      sc.node(parent, 'path', { d, fill: 'none', stroke: CHANNELS[i].color,
                                'stroke-width': 1.2, 'stroke-linejoin': 'round' });
    }
    sc.node(parent, 'rect', { x: cx - w / 2, y: cy - h / 2, width: w, height: h,
                              fill: 'none', stroke: '#9AA6B2', 'stroke-width': 1.3 });
  }

  // one layer inside a trunk
  const layer = (parent, x, y, w, h, name, sub, col) => {
    sc.node(parent, 'rect', { x, y: y - h / 2, width: w, height: h, rx: 4,
                              fill: '#fff', stroke: col, 'stroke-width': 1.7 });
    txt(parent, x + w / 2, y + (sub ? -2 : 7), name, { size: 20, weight: 650, fill: col });
    if (sub) txt(parent, x + w / 2, y + 22, sub, { size: 15 });
  };

  const TRUNKS = [
    { repeat: 'BiRe block × L',
      layers: [
        { n: 'BiMap', s: 'W on Stiefel', c: TRUNK, w: 200 },
        { n: 'ReEig', s: '', c: TRUNK, w: 150 },
        { n: 'LogEig', s: '', c: TRUNK, w: 150 },
        { n: 'Vech', s: '', c: TRUNK, w: 140 }
      ],
      group: 2 },
    { repeat: '',
      layers: [
        { n: 'temporal + spatial conv', s: '', c: TRUNK, w: 290 },
        { n: 'BN', s: 'on / off', c: BN, w: 110 },
        { n: 'separable conv', s: '', c: TRUNK, w: 240 },
        { n: 'BN', s: 'on / off', c: BN, w: 110 }
      ],
      group: 0 }
  ];

  const rows = [
    { name: 'SPDNet', input: 'covariance' },
    { name: 'EEGNet', input: 'raw trial' }
  ].map((R, k) => {
    const gg = sc.g(g);
    const y = ROW[k];
    const T = TRUNKS[k];

    txt(gg, 34, y - 74, R.name, { anchor: 'start', size: 26, weight: 650, fill: NAVY });

    if (k === 0) covArt(gg, X_IN, y, 96);
    else trialArt(gg, X_IN, y, 132, 96);
    txt(gg, X_IN, y + 72, R.input, { size: 16 });

    // the trunk, as a framed strip of layers
    sc.node(gg, 'rect', { x: TRUNK_X, y: y - 72, width: TRUNK_W, height: 144, rx: 8,
                          fill: 'rgba(0,114,178,.06)', stroke: TRUNK, 'stroke-width': 1.8 });
    txt(gg, TRUNK_X + 16, y - 80, 'trunk', { anchor: 'start', size: 20, weight: 650, fill: TRUNK });

    const inner = TRUNK_W - 56;
    const total = T.layers.reduce((s, l) => s + l.w, 0);
    const gap = (inner - total) / (T.layers.length - 1);
    let x = TRUNK_X + 28;
    const xs = [];
    T.layers.forEach((L, i) => {
      layer(gg, x, y + 6, L.w, 62, L.n, L.s, L.c);
      xs.push([x, x + L.w]);
      if (i < T.layers.length - 1) arrow(gg, x + L.w + 5, x + L.w + gap - 5, y + 6);
      x += L.w + gap;
    });

    if (T.repeat) {
      const a = xs[0][0], b = xs[T.group - 1][1];
      sc.node(gg, 'rect', { x: a - 8, y: y - 34, width: b - a + 16, height: 80, rx: 6,
                            fill: 'none', stroke: SLATE, 'stroke-width': 1.2,
                            'stroke-dasharray': '7 5' });
      txt(gg, (a + b) / 2, y - 42, T.repeat, { size: 15, mono: true });
    }

    arrow(gg, X_IN + 76, TRUNK_X - 6, y);
    arrow(gg, TRUNK_X + TRUNK_W + 6, HEAD_X - 6, y);

    sc.node(gg, 'rect', { x: HEAD_X, y: y - 48, width: HEAD_W, height: 96, rx: 8,
                          fill: 'rgba(90,110,200,.10)', stroke: HEAD, 'stroke-width': 2 });
    txt(gg, HEAD_X + HEAD_W / 2, y - 4, 'head', { size: 22, weight: 650, fill: HEAD });
    txt(gg, HEAD_X + HEAD_W / 2, y + 24, 'linear, softmax', { size: 15 });

    arrow(gg, HEAD_X + HEAD_W + 6, X_OUT - 36, y);
    txt(gg, X_OUT, y + 10, 'ŷ', { size: 28, fill: NAVY });

    return gg;
  });

  sc.node(g, 'line', { x1: 34, y1: (ROW[0] + ROW[1]) / 2, x2: CW - 34,
                       y2: (ROW[0] + ROW[1]) / 2, stroke: RULE, 'stroke-width': 1 });

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    rows.forEach((r, k) => {
      const on = step > k + 1 ? 1 : step === k + 1 ? t : 0;
      r.setAttribute('opacity', on);
    });
  }

  const durations = [0, 700, 700];
  render(1);

  return {
    setStep(n) {
      if (n === step) return;
      const back = n < step;
      step = n;
      ticker.run(back ? 0 : durations[n] ?? 600, render, { instant: back });
    },
    activate() {}, deactivate() { ticker.stop(); }
  };
}