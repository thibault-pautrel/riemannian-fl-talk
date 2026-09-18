import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';
import { symMatrix, red } from '../data/matrices.js';

/* Record-level adjacency. Two databases over the same cohort, identical
   everywhere except one substituted record inside one client. */

const CW = 1160, CH = 520;
const COLS = 4, ROWS = 3, TH = 74, PAD = 12;
const NAVY = '#243B54', SLATE = '#8A9AA8', RED = '#B2182B';

export default function adjacency(el) {
  const sc = makeScene(el, { width: CW, height: CH });
  const ticker = makeTicker();

  let pick = 5;                      // which record is substituted
  const GW = COLS * (TH + PAD) - PAD, GH = ROWS * (TH + PAD) - PAD;
  const PANEL = [{ x: 74, tag: '𝒟' }, { x: 640, tag: "𝒟′" }];

  const txt = (parent, x, y, s, o = {}) => {
    const n = sc.node(parent, 'text', {
      x, y, 'text-anchor': o.anchor ?? 'middle', 'font-size': o.size ?? 17,
      'font-weight': o.weight ?? 400, fill: o.fill ?? SLATE,
      'font-family': o.mono ? 'var(--mono)' : 'var(--sans)'
    });
    n.textContent = s;
    return n;
  };

  const panels = PANEL.map((P, side) => {
    const g = sc.g();
    const X0 = P.x, Y0 = 132;
    sc.node(g, 'rect', { x: X0 - 26, y: Y0 - 44, width: GW + 52, height: GH + 78, rx: 8,
                         fill: '#FBFCFD', stroke: SLATE, 'stroke-opacity': .45, 'stroke-width': 1.4 });
    txt(g, X0 + GW / 2, Y0 - 58, `${P.tag}`, { size: 26, weight: 650, fill: NAVY, mono: true });
    txt(g, X0 + GW / 2, Y0 - 20, 'client i⋆', { size: 15 });

    const cells = [];
    for (let k = 0; k < COLS * ROWS; k++) {
      const cx = X0 + (k % COLS) * (TH + PAD), cy = Y0 + Math.floor(k / COLS) * (TH + PAD);
      const gg = sc.g(g);
      const blocks = [];
      const n = 4, cs = TH / n;
      for (let a = 0; a < n; a++)
        for (let b = 0; b < n; b++)
          blocks.push(sc.node(gg, 'rect', { x: cx + b * cs, y: cy + a * cs,
                                            width: cs + 0.4, height: cs + 0.4, fill: '#fff' }));
      sc.node(gg, 'rect', { x: cx, y: cy, width: TH, height: TH, fill: 'none',
                            stroke: '#C88C8C', 'stroke-width': 1 });
      const hit = sc.node(gg, 'rect', { x: cx, y: cy, width: TH, height: TH,
                                        fill: 'transparent', cursor: 'pointer' });
      hit.addEventListener('click', () => { pick = k; render(); });
      const ring = sc.node(gg, 'rect', { x: cx - 4, y: cy - 4, width: TH + 8, height: TH + 8,
                                         rx: 3, fill: 'none', stroke: RED, 'stroke-width': 3, opacity: 0 });
      cells.push({ blocks, ring, n });
    }

    // the other clients, untouched
    const others = sc.g(g);
    [0, 1, 2].forEach((j) => {
      sc.node(others, 'rect', { x: X0 - 26 + j * 96, y: Y0 + GH + 42, width: 84, height: 26, rx: 4,
                                fill: '#F2F5F7', stroke: SLATE, 'stroke-opacity': .5, 'stroke-width': 1 });
    });
    txt(others, X0 + GW / 2, Y0 + GH + 82, 'all other clients identical', { size: 15 });
    others.setAttribute('opacity', 0);

    return { cells, others, X0, Y0 };
  });

  const link = sc.node(sc.svg, 'path', {
    d: `M${PANEL[0].x + GW + 34} ${132 + GH / 2}H${PANEL[1].x - 40}`,
    stroke: NAVY, 'stroke-width': 1.6, fill: 'none', opacity: 0, 'stroke-dasharray': '7 6'
  });
  const bow = txt(sc.svg, (PANEL[0].x + GW + PANEL[1].x) / 2 + 6, 132 + GH / 2 - 14,
                  '⋈', { size: 26, fill: NAVY });
  bow.setAttribute('opacity', 0);
  const caption = txt(sc.svg, CW / 2, CH - 26, '', { size: 19, fill: RED, weight: 600 });

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;   // the second database
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;   // the substitution
    const g3 = step === 3 ? t : 0;                  // the other clients

    panels.forEach((P, side) => {
      P.cells.forEach((cell, k) => {
        const changed = side === 1 && k === pick && g2 > 0.5;
        const Mx = symMatrix(cell.n, changed ? 901 + pick * 13 : 31 + k * 17);
        cell.blocks.forEach((b, idx) =>
          b.setAttribute('fill', red(Mx[Math.floor(idx / cell.n)][idx % cell.n])));
        cell.ring.setAttribute('opacity', k === pick && g2 > 0.25 ? 1 : 0);
      });
      P.others.setAttribute('opacity', g3);
    });

    panels[1].cells.forEach((c) => c.blocks.forEach((b) => b.setAttribute('opacity', g1)));
    panels[1].ring?.setAttribute?.('opacity', g1);
    link.setAttribute('opacity', g1 > 0.7 ? 1 : 0);
    bow.setAttribute('opacity', g1 > 0.7 ? 1 : 0);

    caption.textContent = g2 > 0.8 ? 'exactly one record substituted, everything else equal' : '';
  }

  sc.tool('reset', () => { pick = 5; render(); });

  const durations = [0, 800, 1100, 700];
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