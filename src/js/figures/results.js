import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';

/* Accuracy bar charts, with standard deviation whiskers and a chance line.

   centralBars: three datasets, SPDNet against EEGNet.
   fedBars:     the three datasets side by side, four arms, four privacy
                budgets, one shared legend and one shared vertical axis. */

const OURS = '#6B3FA0', OURS2 = '#9166C4', RET = '#0072B2', EEG = '#009E73';
const NAVY = '#243B54', SLATE = '#8A9AA8', RULE = '#DCE3E8', CHANCE = '#B2182B';

const DATASETS = [
  {
    name: 'BNCI2014_001', chance: 25.0, subj: 9, chan: 22, cls: 4,
    central: { spd: [55.4, 3.0], eeg: [61.4, 1.5] },
    fed: {
      'SPDNet ProjAvg': [[52.8, 1.8], [43.3, 2.4], [39.6, 1.7], [35.1, 2.6]],
      'SPDNet RLAvg':   [[52.9, 1.6], [43.1, 2.3], [39.3, 2.0], [33.9, 2.8]],
      'SPDNet RetAvg':  [[53.2, 1.7], [42.5, 1.5], [39.3, 1.7], [36.4, 2.0]],
      'EEGNet':         [[57.0, 2.0], [35.7, 2.4], [33.8, 2.6], [30.3, 2.5]]
    }
  },
  {
    name: 'Weibo2014', chance: 14.3, subj: 10, chan: 60, cls: 7,
    central: { spd: [48.3, 1.4], eeg: [50.2, 1.8] },
    fed: {
      'SPDNet ProjAvg': [[41.6, 2.2], [24.3, 1.5], [20.2, 1.1], [17.9, 1.1]],
      'SPDNet RLAvg':   [[41.7, 1.9], [23.7, 1.7], [20.1, 1.8], [17.5, 0.9]],
      'SPDNet RetAvg':  [[42.8, 1.9], [23.2, 1.8], [20.7, 1.8], [18.1, 1.2]],
      'EEGNet':         [[47.0, 1.9], [17.4, 0.9], [15.9, 1.0], [15.4, 1.3]]
    }
  },
  {
    name: 'Cho2017', chance: 50.0, subj: 52, chan: 64, cls: 2,
    central: { spd: [63.5, 1.3], eeg: [67.7, 1.4] },
    fed: {
      'SPDNet ProjAvg': [[59.5, 1.0], [55.1, 1.5], [54.2, 1.6], [52.9, 1.7]],
      'SPDNet RLAvg':   [[59.6, 1.1], [55.3, 1.0], [54.3, 1.3], [52.3, 1.0]],
      'SPDNet RetAvg':  [[60.8, 1.0], [51.3, 1.7], [50.5, 1.5], [50.3, 0.5]],
      'EEGNet':         [[67.7, 0.6], [52.2, 1.3], [51.5, 1.1], [51.0, 0.8]]
    }
  }
];

const ARMS = [
  { key: 'SPDNet ProjAvg', short: 'SPDNet ProjAvg', color: OURS,  ours: true },
  { key: 'SPDNet RLAvg',   short: 'SPDNet RLAvg',   color: OURS2, ours: true },
  { key: 'SPDNet RetAvg',  short: 'SPDNet RetAvg',  color: RET,   ours: false },
  { key: 'EEGNet',         short: 'EEGNet',         color: EEG,   ours: false }
];

const BUDGETS = ['no DP', 'ε = 20', 'ε = 10', 'ε = 5'];

/* ---- small helpers ------------------------------------------------ */

function textNode(sc, parent, x, y, s, o = {}) {
  const n = sc.node(parent, 'text', {
    x, y, 'text-anchor': o.anchor ?? 'middle', 'font-size': o.size ?? 17,
    'font-weight': o.weight ?? 400, fill: o.fill ?? SLATE,
    'font-family': o.mono ? 'var(--mono)' : 'var(--sans)'
  });
  n.textContent = s;
  return n;
}

// a bar with its whisker, both driven by one progress value
function makeBar(sc, parent, color, ours, { values = true } = {}) {
  const rect = sc.node(parent, 'rect', {
    fill: color, 'fill-opacity': ours ? 0.92 : 0.72, rx: 2,
    stroke: ours ? color : 'none', 'stroke-width': ours ? 1.4 : 0
  });
  const whisk = sc.node(parent, 'path', {
    fill: 'none', stroke: NAVY, 'stroke-opacity': .6, 'stroke-width': 1.3
  });
  const val = values ? textNode(sc, parent, 0, 0, '', { size: 15, fill: NAVY, mono: true }) : null;
  return {
    place(x, w, yBase, yTop, sd, scale, g) {
      const h = Math.max(0, (yBase - yTop) * g);
      rect.setAttribute('x', x); rect.setAttribute('width', w);
      rect.setAttribute('y', yBase - h); rect.setAttribute('height', h);
      rect.setAttribute('opacity', g > 0.01 ? 1 : 0);
      const cx = x + w / 2, top = yBase - h;
      const e = sd * scale * g, cap = Math.min(7, w * 0.34);
      whisk.setAttribute('d',
        `M${cx - cap} ${top - e}H${cx + cap}M${cx} ${top - e}V${top + e}` +
        `M${cx - cap} ${top + e}H${cx + cap}`);
      whisk.setAttribute('opacity', g > 0.85 ? 1 : 0);
      if (val) {
        val.setAttribute('x', cx); val.setAttribute('y', top - e - 9);
        val.setAttribute('opacity', g > 0.9 ? 1 : 0);
      }
    },
    setValue(s) { if (val) val.textContent = s; }
  };
}

// one legend row, centred on cx at height y
function legend(sc, parent, cx, y, items, { size = 17, gap = 34 } = {}) {
  const widths = items.map((it) => 26 + it.label.length * size * 0.54);
  const total = widths.reduce((s, w) => s + w, 0) + gap * (items.length - 1);
  let x = cx - total / 2;
  items.forEach((it, i) => {
    sc.node(parent, 'rect', { x, y: y - 11, width: 22, height: 12, rx: 2,
                              fill: it.color, 'fill-opacity': it.ours ? 0.92 : 0.72 });
    textNode(sc, parent, x + 30, y, it.label, { anchor: 'start', size, fill: NAVY });
    x += widths[i] + gap;
  });
}

/* ====================================================================
   Centralised accuracy: three datasets, two architectures
   ==================================================================== */
export function centralBars(el) {
  const W = 1020, H = 430;
  const sc = makeScene(el, { width: W, height: H });
  const ticker = makeTicker();

  const X0 = 96, X1 = W - 40, Y0 = 72, Y1 = H - 84;
  const MAX = 75;
  const scale = (Y1 - Y0) / MAX;
  const yOf = (v) => Y1 - v * scale;

  const g = sc.g();
  for (let v = 0; v <= MAX; v += 25) {
    sc.node(g, 'line', { x1: X0, y1: yOf(v), x2: X1, y2: yOf(v),
                         stroke: RULE, 'stroke-width': 1 });
    textNode(sc, g, X0 - 14, yOf(v) + 6, String(v), { anchor: 'end', size: 15, mono: true });
  }
  textNode(sc, g, X0 - 62, (Y0 + Y1) / 2, 'accuracy (%)', { size: 16 })
    .setAttribute('transform', `rotate(-90 ${X0 - 62} ${(Y0 + Y1) / 2})`);

  const groupW = (X1 - X0) / DATASETS.length;
  const barW = groupW * 0.19;

  const bars = DATASETS.map((D, k) => {
    const cx = X0 + groupW * (k + 0.5);
    textNode(sc, g, cx, Y1 + 30, D.name, { size: 18, fill: NAVY, weight: 600 });
    textNode(sc, g, cx, Y1 + 52, `${D.subj} subjects · ${D.chan} channels · ${D.cls} classes`,
             { size: 15 });
    sc.node(g, 'line', { x1: cx - groupW * 0.34, y1: yOf(D.chance),
                         x2: cx + groupW * 0.34, y2: yOf(D.chance),
                         stroke: CHANCE, 'stroke-width': 1.6, 'stroke-dasharray': '6 5' });
    textNode(sc, g, cx + groupW * 0.34 + 4, yOf(D.chance) + 5,
             'chance', { anchor: 'start', size: 14, fill: CHANCE });
    const spd = makeBar(sc, g, OURS, true);
    const eeg = makeBar(sc, g, EEG, false);
    spd.setValue(D.central.spd[0].toFixed(1));
    eeg.setValue(D.central.eeg[0].toFixed(1));
    return { cx, spd, eeg, D };
  });

  legend(sc, g, (X0 + X1) / 2, Y0 - 34,
         [{ label: 'SPDNet', color: OURS, ours: true },
          { label: 'EEGNet', color: EEG, ours: false }]);

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = step >= 1 ? (step === 1 ? t : 1) : 0;
    bars.forEach((b) => {
      b.spd.place(b.cx - barW - 5, barW, Y1, yOf(b.D.central.spd[0]),
                  b.D.central.spd[1], scale, g1);
      b.eeg.place(b.cx + 5, barW, Y1, yOf(b.D.central.eeg[0]),
                  b.D.central.eeg[1], scale, g1);
    });
  }

  const ghost = el.classList.contains('ghost');
  render(1);
  if (ghost) { step = 1; render(1); }

  return {
    setStep(n) {
      if (ghost || n === step) return;
      const back = n < step;
      step = n;
      ticker.run(back ? 0 : 900, render, { instant: back });
    },
    activate() {}, deactivate() { ticker.stop(); }
  };
}

/* ====================================================================
   Federated accuracy: three panels, one per dataset
   ==================================================================== */
export function fedBars(el) {
  const W = 1620, H = 570;
  const sc = makeScene(el, { width: W, height: H });
  const ticker = makeTicker();

  const AX = 82;                       // left margin, the shared axis
  const GAP = 46;                      // space between two panels
  const Y0 = 132, Y1 = H - 92;         // plot area, same for the three panels
  const PW = (W - AX - 30 - 2 * GAP) / 3;
  const MAX = 70;
  const scale = (Y1 - Y0) / MAX;
  const yOf = (v) => Y1 - v * scale;

  const g = sc.g();

  // one shared legend, well above the panels
  legend(sc, g, W / 2, 40, ARMS.map((a) => ({ label: a.short, color: a.color, ours: a.ours })),
         { size: 18, gap: 40 });

  // one shared vertical axis
  textNode(sc, g, AX - 56, (Y0 + Y1) / 2, 'accuracy (%)', { size: 17 })
    .setAttribute('transform', `rotate(-90 ${AX - 56} ${(Y0 + Y1) / 2})`);

  const panels = DATASETS.map((D, k) => {
    const PX = AX + k * (PW + GAP);
    const groupW = PW / BUDGETS.length;
    const barW = groupW * 0.18;

    // grid, drawn per panel so the panels read as separate plots
    for (let v = 0; v <= MAX; v += 10) {
      sc.node(g, 'line', { x1: PX, y1: yOf(v), x2: PX + PW, y2: yOf(v),
                           stroke: RULE, 'stroke-width': 1 });
      if (k === 0) {
        textNode(sc, g, AX - 14, yOf(v) + 6, String(v),
                 { anchor: 'end', size: 15, mono: true });
      }
    }
    sc.node(g, 'line', { x1: PX, y1: Y1, x2: PX + PW, y2: Y1,
                         stroke: SLATE, 'stroke-opacity': .6, 'stroke-width': 1.4 });

    // dataset name, on its own line above the plot area
    textNode(sc, g, PX + PW / 2, Y0 - 44, D.name,
             { size: 22, weight: 650, fill: NAVY });
    textNode(sc, g, PX + PW / 2, Y0 - 22,
             `${D.subj} subjects · ${D.chan} channels · ${D.cls} classes`, { size: 15 });

    // chance level
    sc.node(g, 'line', { x1: PX, y1: yOf(D.chance), x2: PX + PW, y2: yOf(D.chance),
                         stroke: CHANCE, 'stroke-width': 1.6, 'stroke-dasharray': '6 5' });
    textNode(sc, g, PX + PW - 4, yOf(D.chance) - 8, `chance ${D.chance.toFixed(1)}`,
             { anchor: 'end', size: 14, fill: CHANCE });

    const groups = BUDGETS.map((b, j) => {
      const cx = PX + groupW * (j + 0.5);
      textNode(sc, g, cx, Y1 + 28, b, { size: 16, fill: NAVY, mono: true });
      const bars = ARMS.map((a) => makeBar(sc, g, a.color, a.ours, { values: false }));
      return { cx, bars, barW };
    });

    return { D, groups };
  });

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    panels.forEach((P) => {
      P.groups.forEach((G, j) => {
        // budget j appears at step j + 1, on the three panels at once
        const gj = step > j + 1 ? 1 : step === j + 1 ? t : 0;
        G.bars.forEach((bar, i) => {
          const [m, sd] = P.D.fed[ARMS[i].key][j];
          const x = G.cx + (i - ARMS.length / 2) * (G.barW + 3) + 1.5;
          bar.place(x, G.barW, Y1, yOf(m), sd, scale, gj);
        });
      });
    });
  }

  const durations = [0, 900, 900, 900, 900];
  render(1);

  return {
    setStep(n) {
      if (n === step) return;
      const back = n < step;
      step = n;
      ticker.run(back ? 0 : durations[n] ?? 700, render, { instant: back });
    },
    activate() {}, deactivate() { ticker.stop(); }
  };
}