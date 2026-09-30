import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';

/* Four protocols, three cards, lit one per step.

   1 centralised   : data pooled, one model
   2 federated     : trunk, BN and head exchanged
   3 personalised  : trunk and BN exchanged, head stays local
   4 FedBN variant : the BN stays local too, in both federated cards */

const CW = 1560, CH = 650;
const NAVY = '#243B54', SLATE = '#8A9AA8', RULE = '#DCE3E8';
const TRUNK = '#0072B2', HEAD = '#5A6EC8', LOCAL = '#B2182B', BN = '#E69F00';

const PW = 490, GAP = 25, PY = 74, PH = 540;
const PX = [20, 20 + PW + GAP, 20 + 2 * (PW + GAP)];

export default function protocols(el) {
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
  const arrow = (parent, d, o = {}) => sc.node(parent, 'path', {
    d, fill: 'none', stroke: o.stroke ?? NAVY, 'stroke-width': o.w ?? 1.6,
    'marker-end': sc.arrow(o.marker ?? 'navy'),
    ...(o.both ? { 'marker-start': sc.arrow(o.marker ?? 'navy') } : {})
  });

  const tint = { [TRUNK]: 'rgba(0,114,178,.10)', [HEAD]: 'rgba(90,110,200,.10)',
                 [LOCAL]: 'rgba(178,24,43,.10)', [BN]: 'rgba(230,159,0,.14)' };

  /* trunk then head, with the BN drawn as a small block inside the trunk.
     dir 'h' side by side, dir 'v' stacked. Returns the BN nodes, so the
     caller can switch them to local later. */
  function model(parent, cx, cy, { scale = 1, dir = 'h', head = 'shared', bn = 'shared' } = {}) {
    const vert = dir === 'v';
    const w = (vert ? 92 : 104) * scale, h = (vert ? 44 : 56) * scale;
    const gap = (vert ? 16 : 22) * scale;
    const headCol = head === 'local' ? LOCAL : HEAD;
    const bnNodes = [];

    const box = (x, y, c, label, size) => {
      sc.node(parent, 'rect', { x, y, width: w, height: h, rx: 4,
                                fill: tint[c], stroke: c, 'stroke-width': 1.7 });
      txt(parent, x + w / 2, y + (bn === 'none' || c !== TRUNK ? h / 2 + 5 * scale : 16 * scale),
          label, { size, weight: 650, fill: c });
    };

    const placeTrunk = (x, y) => {
      box(x, y, TRUNK, 'trunk', (vert ? 15 : 17) * scale);
      if (bn !== 'none') {
        const bw = w * 0.62, bh = h * 0.36;
        const bx = x + (w - bw) / 2, by = y + h - bh - 5 * scale;
        const r = sc.node(parent, 'rect', { x: bx, y: by, width: bw, height: bh, rx: 3,
                                            fill: tint[BN], stroke: BN, 'stroke-width': 1.5 });
        const l = txt(parent, bx + bw / 2, by + bh / 2 + 4 * scale, 'BN',
                      { size: (vert ? 12 : 13) * scale, weight: 650, fill: BN });
        bnNodes.push(r, l);
      }
    };

    if (vert) {
      const y1 = cy - h - gap / 2, y2 = cy + gap / 2;
      placeTrunk(cx - w / 2, y1);
      if (head !== 'none') {
        box(cx - w / 2, y2, headCol, 'head', 15 * scale);
        arrow(parent, `M${cx} ${y1 + h + 3}V${y2 - 3}`, { w: 1.2 });
      }
      return bnNodes;
    }

    const x1 = cx - gap / 2 - w, x2 = cx + gap / 2;
    placeTrunk(x1, cy - h / 2);
    if (head !== 'none') {
      box(x2, cy - h / 2, headCol, 'head', 17 * scale);
      arrow(parent, `M${x1 + w + 3} ${cy}H${x2 - 3}`, { w: 1.3 });
    }
    return bnNodes;
  }

  function client(parent, cx, cy) {
    sc.node(parent, 'rect', { x: cx - 30, y: cy - 20, width: 60, height: 40, rx: 5,
                              fill: '#fff', stroke: SLATE, 'stroke-width': 1.4 });
    [0, 1, 2].forEach((k) => sc.node(parent, 'rect', {
      x: cx - 18, y: cy - 12 + k * 9, width: 36, height: 5, rx: 2,
      fill: NAVY, 'fill-opacity': .25 - k * 0.04 }));
  }

  const panels = [0, 1, 2].map((k) => {
    const gg = sc.g(g);
    sc.node(gg, 'rect', { x: PX[k], y: PY, width: PW, height: PH, rx: 10,
                          fill: '#FBFCFD', stroke: RULE, 'stroke-width': 1.6 });
    return gg;
  });

  const TITLES = ['centralised', 'federated', 'federated, personalised'];
  const SUB = ['pooled data, one model',
               'trunk and head exchanged',
               'trunk exchanged, head stays local'];
  panels.forEach((gg, k) => {
    const cx = PX[k] + PW / 2;
    txt(gg, cx, PY + 40, TITLES[k], { size: 25, weight: 650, fill: NAVY });
    txt(gg, cx, PY + 64, SUB[k], { size: 16 });
  });

  // ---- panel 1: centralised
  {
    const gg = panels[0], cx = PX[0] + PW / 2;
    const xs = [0, 1, 2, 3, 4].map((i) => PX[0] + 75 + i * 85);
    xs.forEach((x) => {
      client(gg, x, PY + 132);
      arrow(gg, `M${x} ${PY + 156}L${cx} ${PY + 224}`, { w: 1.3, stroke: SLATE, marker: 'slate' });
    });
    sc.node(gg, 'rect', { x: cx - 120, y: PY + 232, width: 240, height: 52, rx: 6,
                          fill: '#F2F5F7', stroke: NAVY, 'stroke-width': 1.6 });
    txt(gg, cx, PY + 264, 'pooled data', { size: 20, weight: 650, fill: NAVY });
    arrow(gg, `M${cx} ${PY + 288}V${PY + 344}`, { w: 1.8 });
    model(gg, cx, PY + 392, { scale: 0.86 });
    txt(gg, cx, PY + 458, 'one model fits all the data', { size: 16 });
  }

  // ---- panels 2 and 3: federated
  const P = { 1: null, 2: null };

  [1, 2].forEach((k) => {
    const gg = panels[k], cx = PX[k] + PW / 2;
    const personal = k === 2;
    const bag = { server: [], clients: [], chip: [], strike: [], fedbn: null, dp: null };

    sc.node(gg, 'rect', { x: cx - 150, y: PY + 92, width: 300, height: 96, rx: 8,
                          fill: '#fff', stroke: NAVY, 'stroke-width': 1.8 });
    txt(gg, cx, PY + 116, 'server', { size: 18, weight: 650, fill: NAVY, mono: true });
    bag.server.push(...model(gg, cx, PY + 152, {
      scale: 0.60, head: personal ? 'none' : 'shared'
    }));

    const xs = [0, 1, 2, 3, 4].map((i) => PX[k] + 75 + i * 85);
    xs.forEach((x) => {
      arrow(gg, `M${cx} ${PY + 196}L${x} ${PY + 300}`,
            { w: 1.5, both: true, stroke: TRUNK, marker: 'navy' });
      client(gg, x, PY + 324);
      bag.clients.push(...model(gg, x, PY + 420, {
        scale: 0.58, dir: 'v', head: personal ? 'local' : 'shared'
      }));
    });

    // what crosses the arrows
    const cyChip = PY + 244;
    const chips = personal ? ['trunk', 'BN'] : ['trunk', 'BN', 'head'];
    let x = PX[k] + 26;
    chips.forEach((c) => {
      const col = c === 'BN' ? BN : c === 'trunk' ? TRUNK : HEAD;
      const w = 22 + c.length * 10;
      const r = sc.node(gg, 'rect', { x, y: cyChip - 15, width: w, height: 30, rx: 15,
                                      fill: tint[col], stroke: col, 'stroke-width': 1.5 });
      const l = txt(gg, x + w / 2, cyChip + 6, c, { size: 16, weight: 650, fill: col });
      if (c === 'BN') {
        bag.chip.push(r, l);
        bag.strike.push(sc.node(gg, 'line', { x1: x - 3, y1: cyChip + 12, x2: x + w + 3,
                                              y2: cyChip - 12, stroke: SLATE,
                                              'stroke-width': 2, opacity: 0 }));
      }
      x += w + 10;
    });
    txt(gg, PX[k] + 26, cyChip - 26, 'exchanged', { anchor: 'start', size: 14 });

    txt(gg, cx, PY + 478, personal ? 'one head per client' : 'one shared model', { size: 16 });

    bag.fedbn = txt(gg, cx, PY + 502, 'FedBN: BN stays local', { size: 17, fill: BN, weight: 650 });
    bag.fedbn.setAttribute('opacity', 0);
    bag.dp = txt(gg, cx, PY + 502, 'under DP: no batch norm', { size: 17, fill: LOCAL, weight: 650 });
    bag.dp.setAttribute('opacity', 0);

    P[k] = bag;
  });

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    panels.forEach((p, k) => {
      const on = step > k + 1 ? 1 : step === k + 1 ? t : 0;
      p.setAttribute('opacity', 0.10 + 0.90 * on);
    });

    // step 4: the BN is no longer exchanged, in both federated cards
    const local = step === 4 ? t : step > 4 ? 1 : 0;
    // step 5: under privacy, the model carries no BN at all, federated card
    const dp = step === 5 ? t : 0;

    [1, 2].forEach((k) => {
      const b = P[k];
      const gone = k === 1 ? dp : 0;
      b.server.forEach((n) => n.setAttribute('opacity', (1 - 0.75 * local) * (1 - gone)));
      b.clients.forEach((n) => n.setAttribute('opacity', 1 - gone));
      b.chip.forEach((n) => n.setAttribute('opacity', (1 - 0.55 * local) * (1 - gone)));
      b.strike.forEach((n) => n.setAttribute('opacity', local * (1 - gone)));
      b.fedbn.setAttribute('opacity', local * (1 - gone));
      b.dp.setAttribute('opacity', gone);
    });
  }

  const durations = [0, 700, 700, 700, 800, 800];
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