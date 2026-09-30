import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';
import { makeEEG, CHANNELS, rdbu } from '../data/eeg.js';

/* Three perspectives, one card each, lit one per step.

   1 cross-subject : a trained federation, and a new client arriving
   2 heterogeneity : inputs of different sizes, then of different natures
   3 flow matching : a generative flow living on the manifold */

const DATA = makeEEG();
const CW = 1560, CH = 680;
const NAVY = '#243B54', SLATE = '#8A9AA8', RULE = '#DCE3E8';
const BLUE = '#0072B2', NEW = '#B2182B', VIO = '#6B3FA0', GREEN = '#009E73';

const PW = 490, GAP = 25, PY = 64, PH = 590;
const PX = [20, 20 + PW + GAP, 20 + 2 * (PW + GAP)];

export default function perspectives(el) {
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
  const line = (parent, d, o = {}) => sc.node(parent, 'path', {
    d, fill: 'none', stroke: o.stroke ?? SLATE, 'stroke-width': o.w ?? 1.4,
    ...(o.dash ? { 'stroke-dasharray': o.dash } : {}),
    ...(o.marker ? { 'marker-end': sc.arrow(o.marker) } : {})
  });

  // a small client, optionally with unlabelled data
  function client(parent, cx, cy, { color = SLATE, unlabelled = false, r = 21 } = {}) {
    sc.node(parent, 'circle', { cx, cy, r, fill: '#fff', stroke: color, 'stroke-width': 1.8 });
    [0, 1, 2].forEach((k) => sc.node(parent, 'rect', {
      x: cx - 10, y: cy - 8 + k * 7, width: 20, height: 3.6, rx: 1.8,
      fill: unlabelled ? NEW : NAVY, 'fill-opacity': unlabelled ? .35 : .3 - k * 0.05 }));
    if (unlabelled) txt(parent, cx + r + 4, cy - r + 6, '?', { size: 22, fill: NEW, weight: 700 });
  }

  const panels = [0, 1, 2].map((k) => {
    const gg = sc.g(g);
    sc.node(gg, 'rect', { x: PX[k], y: PY, width: PW, height: PH, rx: 10,
                          fill: '#FBFCFD', stroke: RULE, 'stroke-width': 1.6 });
    return gg;
  });

  const TITLES = ['cross-subject', 'heterogeneous/multimodal', 'flow matching'];
  panels.forEach((gg, k) => txt(gg, PX[k] + PW / 2, PY + 42, TITLES[k],
                                { size: 25, weight: 650, fill: NAVY }));

  // ---- 1. cross-subject
  {
    const gg = panels[0], cx = PX[0] + PW / 2, cy = PY + 190;
    sc.node(gg, 'circle', { cx, cy, r: 150, fill: 'rgba(0,114,178,.05)',
                            stroke: BLUE, 'stroke-width': 1.4, 'stroke-dasharray': '8 6' });
    sc.node(gg, 'rect', { x: cx - 52, y: cy - 26, width: 104, height: 52, rx: 6,
                          fill: '#fff', stroke: NAVY, 'stroke-width': 1.8 });
    txt(gg, cx, cy + 6, 'server', { size: 17, weight: 650, fill: NAVY, mono: true });

    [0, 1, 2, 3, 4].forEach((i) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
      const x = cx + 108 * Math.cos(a), y = cy + 108 * Math.sin(a);
      line(gg, `M${cx + 54 * Math.cos(a)} ${cy + 54 * Math.sin(a)}L${x} ${y}`,
           { stroke: BLUE, w: 1.3 });
      client(gg, x, y);
    });
    txt(gg, cx, cy + 176, 'trained together', { size: 16 });

    const nx = PX[0] + PW - 92, ny = PY + 410;
    client(gg, nx, ny, { color: NEW, unlabelled: true, r: 26 });
    txt(gg, nx, ny + 46, 'new subject', { size: 16, fill: NEW, weight: 650 });
    txt(gg, nx, ny + 68, 'unlabelled', { size: 15, fill: NEW });
    line(gg, `M${nx - 34} ${ny - 12}L${cx + 92} ${cy + 112}`,
         { stroke: NEW, w: 1.6, dash: '7 5', marker: 'accent' });

    [['client-level DP?', 0], ['personalisation?', 1], ['domain adaptation?', 2]]
      .forEach(([s, i]) => txt(gg, PX[0] + 34, PY + 470 + i * 32, s,
                               { anchor: 'start', size: 19, fill: NAVY }));
  }

  // ---- 2. heterogeneity and multimodality
  {
    const gg = panels[1];
    const cx = PX[1] + PW / 2;
    const sizes = [46, 70, 92];
    const labels = ['C = 22', 'C = 60', 'C = 64'];
    const xs = [PX[1] + 110, PX[1] + 245, PX[1] + 380];

    xs.forEach((x, i) => {
      const s = sizes[i], n = 6, c = s / n;
      for (let a = 0; a < n; a++)
        for (let b = 0; b < n; b++)
          sc.node(gg, 'rect', { x: x - s / 2 + b * c, y: PY + 130 - s / 2 + a * c,
                                width: c + 0.4, height: c + 0.4,
                                fill: rdbu(DATA.corr[a % DATA.C][b % DATA.C]) });
      sc.node(gg, 'rect', { x: x - s / 2, y: PY + 130 - s / 2, width: s, height: s,
                            fill: 'none', stroke: '#9A3D42', 'stroke-width': 1.2 });
      txt(gg, x, PY + 130 + s / 2 + 22, labels[i], { size: 15, mono: true });
    });
    txt(gg, cx, PY + 216, 'covariances of different sizes', { size: 17, fill: NAVY });

    // three modalities
    const my = PY + 300;
    const mods = [
      { x: PX[1] + 110, name: 'EEG' },
      { x: PX[1] + 245, name: 'fMRI' },
      { x: PX[1] + 380, name: 'text' }
    ];
    mods.forEach((m, i) => {
      sc.node(gg, 'rect', { x: m.x - 54, y: my - 42, width: 108, height: 84, rx: 6,
                            fill: '#fff', stroke: SLATE, 'stroke-width': 1.4 });
      if (i === 0) {
        [0, 1, 2].forEach((r) => {
          let d = '';
          for (let k = 0; k <= 40; k++) {
            const t = Math.round(k / 40 * (DATA.T - 1));
            d += (k ? 'L' : 'M') + (m.x - 42 + 84 * k / 40).toFixed(1) + ' ' +
                 (my - 24 + r * 22 - 7 * DATA.Xc[r][t] / 3.2).toFixed(1);
          }
          sc.node(gg, 'path', { d, fill: 'none', stroke: CHANNELS[r].color, 'stroke-width': 1.2 });
        });
      } else if (i === 1) {
        for (let a = 0; a < 4; a++)
          for (let b = 0; b < 4; b++)
            sc.node(gg, 'rect', { x: m.x - 36 + b * 18, y: my - 32 + a * 16,
                                  width: 17, height: 15,
                                  fill: BLUE, 'fill-opacity': 0.12 + 0.16 * ((a * 5 + b * 3) % 5) });
      } else {
        [0, 1, 2, 3].forEach((r) => sc.node(gg, 'rect', {
          x: m.x - 38, y: my - 30 + r * 16, width: [70, 54, 62, 40][r], height: 6, rx: 3,
          fill: NAVY, 'fill-opacity': .22 }));
      }
      txt(gg, m.x, my + 60, m.name, { size: 17, weight: 650, fill: NAVY });
    });
    txt(gg, cx, PY + 388, 'inputs of different natures', { size: 17, fill: NAVY });

    [0, 1, 2].forEach((i) => line(gg, `M${mods[i].x} ${my + 74}L${cx} ${PY + 452}`,
                                  { w: 1.3, marker: 'slate' }));
    sc.node(gg, 'rect', { x: cx - 160, y: PY + 460, width: 320, height: 58, rx: 6,
                          fill: 'rgba(107,63,160,.08)', stroke: VIO, 'stroke-width': 1.8 });
    txt(gg, cx, PY + 494, ' Riemannian model',
        { size: 18, weight: 650, fill: VIO });
    txt(gg, cx, PY + 546, 'multimodal Riemannian federated learning', { size: 16 });
  }

  // ---- 3. flow matching
  {
    const gg = panels[2], cx = PX[2] + PW / 2, cy = PY + 250;

    // the manifold, a curved patch
    sc.node(gg, 'path', {
      d: `M${cx - 180} ${cy + 40}C${cx - 120} ${cy - 70} ${cx + 60} ${cy - 110} ` +
         `${cx + 180} ${cy - 30}C${cx + 120} ${cy + 80} ${cx - 60} ${cy + 120} ` +
         `${cx - 180} ${cy + 40}Z`,
      fill: 'rgba(0,114,178,.08)', stroke: BLUE, 'stroke-width': 1.6
    });
    [0.3, 0.55, 0.8].forEach((f) => line(gg,
      `M${cx - 180 + 40 * f} ${cy + 40 - 60 * f}Q${cx} ${cy - 40 - 40 * f} ` +
      `${cx + 180 - 30 * f} ${cy - 30 + 40 * f}`, { stroke: '#8FB4D6', w: .9 }));
    txt(gg, cx + 176, cy + 86, 'ℳ', { size: 22, fill: BLUE });

    // noise on one side, data on the other, flow between them
    const src = [[-140, 34], [-118, 8], [-150, -6], [-106, 40], [-132, 58]];
    const tgt = [[118, -18], [142, 6], [96, -38], [128, 34], [150, -40]];
    src.forEach(([dx, dy]) => sc.node(gg, 'circle', { cx: cx + dx, cy: cy + dy, r: 5,
                                                      fill: SLATE, 'fill-opacity': .7 }));
    tgt.forEach(([dx, dy]) => sc.node(gg, 'circle', { cx: cx + dx, cy: cy + dy, r: 5.5,
                                                      fill: GREEN }));
    src.forEach(([dx, dy], i) => {
      const [ex, ey] = tgt[i];
      line(gg, `M${cx + dx} ${cy + dy}Q${cx + (dx + ex) / 2} ${cy + (dy + ey) / 2 - 62} ` +
               `${cx + ex} ${cy + ey}`, { stroke: VIO, w: 1.8, marker: 'mean' });
    });
    txt(gg, cx - 132, cy + 92, 'noise', { size: 16 });
    txt(gg, cx + 130, cy - 66, 'data', { size: 16, fill: GREEN, weight: 650 });

    txt(gg, cx, PY + 430, 'a velocity field on the manifold', { size: 18, fill: NAVY });
    [['generative model on ℳ', 0],
     ['synthetic covariances, private?', 1]]
      .forEach(([s, i]) => txt(gg, PX[2] + 34, PY + 480 + i * 32, s,
                               { anchor: 'start', size: 19, fill: NAVY }));
  }

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    panels.forEach((p, k) => {
      const on = step > k + 1 ? 1 : step === k + 1 ? t : 0;
      p.setAttribute('opacity', 0.10 + 0.90 * on);
    });
  }

  const durations = [0, 800, 800, 800];
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
