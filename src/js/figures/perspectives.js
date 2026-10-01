import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';

/* Two perspectives, one card each, lit one per step.

   1 cross-subject   : a trained federation, a new unlabelled client, and the
                       recentring that aligns it
   2 decentralised   : no server, clients exchange with their neighbours, and
                       the privatised parameters must still agree on M */

const CW = 1560, CH = 680;
const NAVY = '#243B54', SLATE = '#8A9AA8', RULE = '#DCE3E8';
const BLUE = '#0072B2', NEW = '#B2182B', VIO = '#6B3FA0';

const PW = 750, GAP = 20, PY = 64, PH = 590;
const PX = [20, 20 + PW + GAP];

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
    ...(o.marker ? { 'marker-end': sc.arrow(o.marker) } : {}),
    ...(o.both ? { 'marker-start': sc.arrow(o.marker ?? 'slate') } : {})
  });

  // a client, as a small stack of records
  function client(parent, cx, cy, { color = SLATE, unlabelled = false, r = 21 } = {}) {
    sc.node(parent, 'circle', { cx, cy, r, fill: '#fff', stroke: color, 'stroke-width': 1.8 });
    [0, 1, 2].forEach((k) => sc.node(parent, 'rect', {
      x: cx - 10, y: cy - 8 + k * 7, width: 20, height: 3.6, rx: 1.8,
      fill: unlabelled ? NEW : NAVY, 'fill-opacity': unlabelled ? .35 : .3 - k * 0.05 }));
    if (unlabelled) txt(parent, cx + r + 4, cy - r + 6, '?', { size: 22, fill: NEW, weight: 700 });
  }

  const panels = [0, 1].map((k) => {
    const gg = sc.g(g);
    sc.node(gg, 'rect', { x: PX[k], y: PY, width: PW, height: PH, rx: 10,
                          fill: '#FBFCFD', stroke: RULE, 'stroke-width': 1.6 });
    return gg;
  });

  const TITLES = ['cross-subject, with domain adaptation',
                  'decentralised private Riemannian learning'];
  panels.forEach((gg, k) => txt(gg, PX[k] + PW / 2, PY + 42, TITLES[k],
                                { size: 25, weight: 650, fill: NAVY }));

  // ═══════ 1. cross-subject ═══════
  {
    const gg = panels[0];
    const cx = PX[0] + 252, cy = PY + 256;

    sc.node(gg, 'circle', { cx, cy, r: 140, fill: 'rgba(0,114,178,.05)',
                            stroke: BLUE, 'stroke-width': 1.4, 'stroke-dasharray': '8 6' });
    sc.node(gg, 'rect', { x: cx - 50, y: cy - 25, width: 100, height: 50, rx: 6,
                          fill: '#fff', stroke: NAVY, 'stroke-width': 1.8 });
    txt(gg, cx, cy + 6, 'server', { size: 17, weight: 650, fill: NAVY, mono: true });

    [0, 1, 2, 3, 4].forEach((i) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
      const x = cx + 100 * Math.cos(a), y = cy + 100 * Math.sin(a);
      line(gg, `M${cx + 52 * Math.cos(a)} ${cy + 52 * Math.sin(a)}L${x} ${y}`,
           { stroke: BLUE, w: 1.3 });
      client(gg, x, y);
    });
    txt(gg, cx, cy + 164, 'trained together', { size: 16 });

    const nx = PX[0] + 610, ny = PY + 240;
    client(gg, nx, ny, { color: NEW, unlabelled: true, r: 26 });
    txt(gg, nx, ny + 46, 'new subject', { size: 16, fill: NEW, weight: 650 });
    txt(gg, nx, ny + 68, 'no labels', { size: 15, fill: NEW });
    line(gg, `M${nx - 36} ${ny}H${cx + 150}`,
         { stroke: NEW, w: 1.6, dash: '7 5', marker: 'accent' });

    [['domain adaptation: recentring on a reference point', 0],
     ['client-level DP?', 1], ['personalisation?', 2]]
      .forEach(([s, i]) => txt(gg, PX[0] + 34, PY + 480 + i * 32, s,
                               { anchor: 'start', size: 19, fill: NAVY }));
  }

  // ═══════ 2. decentralised ═══════
  {
    const gg = panels[1];
    const cx = PX[1] + PW / 2, cy = PY + 236;
    const R = 150;
    const N = 6;
    const pos = Array.from({ length: N }, (_, i) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / N;
      return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
    });

    // the neighbour graph: the ring, plus two chords
    const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 3], [1, 4]];
    edges.forEach(([a, b], k) => {
      const A = pos[a], B = pos[b];
      const ux = (B.x - A.x), uy = (B.y - A.y);
      const n = Math.hypot(ux, uy);
      line(gg, `M${A.x + 24 * ux / n} ${A.y + 24 * uy / n}` +
               `L${B.x - 24 * ux / n} ${B.y - 24 * uy / n}`,
           { stroke: BLUE, w: 1.5, both: true, marker: 'navy' });
      if (k === 0 || k === 3) {
        txt(gg, (A.x + B.x) / 2 + 18, (A.y + B.y) / 2 - 8, '+ ξ',
            { size: 16, fill: VIO, weight: 650 });
      }
    });

    pos.forEach((P, i) => {
      client(gg, P.x, P.y, { color: i === 0 ? VIO : SLATE, r: 23 });
      txt(gg, P.x, P.y - 32, `θ${'₁₂₃₄₅₆'[i]}`, { size: 16, fill: NAVY, mono: true });
    });

    sc.node(gg, 'circle', { cx, cy, r: 46, fill: '#fff', stroke: NEW,
                            'stroke-width': 1.8, 'stroke-dasharray': '6 5' });
    sc.node(gg, 'path', { d: `M${cx - 13} ${cy - 13}L${cx + 13} ${cy + 13}` +
                             `M${cx + 13} ${cy - 13}L${cx - 13} ${cy + 13}`,
                          stroke: NEW, 'stroke-width': 2.4, 'stroke-linecap': 'round' });
    txt(gg, cx, cy + 66, 'no server', { size: 16, fill: NEW, weight: 650 });

    sc.node(gg, 'rect', { x: cx - 230, y: PY + 420, width: 460, height: 60, rx: 6,
                          fill: 'rgba(107,63,160,.08)', stroke: VIO, 'stroke-width': 1.8 });
    txt(gg, cx, PY + 448, 'consensus on ℳ, from local exchanges only',
        { size: 18, weight: 650, fill: VIO });

    [['who aggregates, and with which projection?', 0],
     ['privacy against neighbours, not a server?', 1],
     ['does the budget still detach from the geometry?', 2]]
      .forEach(([s, i]) => txt(gg, PX[1] + 34, PY + 512 + i * 28, s,
                               { anchor: 'start', size: 18, fill: NAVY }));
  }

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    panels.forEach((p, k) => {
      const on = step > k + 1 ? 1 : step === k + 1 ? t : 0;
      p.setAttribute('opacity', 0.10 + 0.90 * on);
    });
  }

  const durations = [0, 800, 800];
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