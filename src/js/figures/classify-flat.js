import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';
import { makeEEG, rdbu } from '../data/eeg.js';

/* A covariance fed to a classifier, three ways.
   State 0 and 3: the matrix itself.
   State 1: vec, all C^2 entries stacked in one column.
   State 2: Vech, the upper triangle only. Each lower entry slides
            onto its mirror and fades, since it is a duplicate. */

const DATA = makeEEG();
const C = DATA.C;

const CY = 270;                                        // horizontal axis of the figure
const MAT  = { x: 90,  y: CY - C * 30 / 2, cell: 30 };
const VEC  = { x: 167, w: 26, h: 12, top: CY - C * C * 12 / 2 };
const VECH = { x: 167, w: 26, h: 16, top: CY - C * (C + 1) / 2 * 16 / 2 };

// position and opacity of cell (i, j) in a given state
function place(state, i, j) {
  if (state === 1) {
    const k = j * C + i;
    return { x: VEC.x, y: VEC.top + k * VEC.h, w: VEC.w, h: VEC.h, op: 1 };
  }
  if (state === 2) {
    const [a, b] = i <= j ? [i, j] : [j, i];            // a lower entry goes to its mirror
    const k = b * (b + 1) / 2 + a;
    return { x: VECH.x, y: VECH.top + k * VECH.h, w: VECH.w, h: VECH.h, op: i <= j ? 1 : 0 };
  }
  return { x: MAT.x + j * MAT.cell, y: MAT.y + i * MAT.cell, w: MAT.cell, h: MAT.cell, op: 1 };
}

export default function classifyFlat(el) {
  const sc = makeScene(el, { width: 760, height: 550 });
  const ticker = makeTicker();
  const gCells = sc.g(), gModel = sc.g();

  const cells = [];
  for (let i = 0; i < C; i++) {
    for (let j = 0; j < C; j++) {
      cells.push({ i, j, node: sc.node(gCells, 'rect', {
        fill: rdbu(DATA.corr[i][j]), stroke: '#ffffff', 'stroke-width': 1
      }) });
    }
  }

  // input, model, output
  const arrow = sc.arrow('slate');
  sc.node(gModel, 'path', { d: `M292 ${CY}L362 ${CY}`, fill: 'none', stroke: '#707F8F',
                            'stroke-width': 1.8, 'marker-end': arrow });
  sc.node(gModel, 'rect', { x: 372, y: CY - 50, width: 170, height: 100, rx: 10,
                            fill: 'rgba(106,192,214,.12)', stroke: '#243B54', 'stroke-width': 1.6 });
  sc.node(gModel, 'path', { d: `M552 ${CY}L622 ${CY}`, fill: 'none', stroke: '#707F8F',
                            'stroke-width': 1.8, 'marker-end': arrow });

  const labF = sc.label('$f_\\theta$');
  labF.node.style.fontSize = '30px';
  labF.moveTo({ x: 457, y: CY }); labF.show(true);
  const labY = sc.label('$\\hat y$');
  labY.node.style.fontSize = '30px';
  labY.moveTo({ x: 652, y: CY }); labY.show(true);
  const labKind = sc.label('', 'muted');
  labKind.moveTo({ x: 457, y: CY + 76 });

  // what enters the model, one label per state
  const labIn = [
    ['$\\Sigma\\in\\mathcal{S}^{++}_C$', MAT.y + C * MAT.cell + 30],
    ['$\\mathrm{vec}(\\Sigma)\\in\\mathbb{R}^{C^2}$', VEC.top + C * C * VEC.h + 30],
    ['$\\mathrm{Vech}(\\Sigma)\\in\\mathbb{R}^{C(C+1)/2}$', VECH.top + C * (C + 1) / 2 * VECH.h + 30]
  ].map(([tex, y]) => {
    const l = sc.label(tex);
    l.moveTo({ x: 180, y });
    return l;
  });
  const KIND = ['', 'Euclidean classifier', 'Euclidean classifier', 'Riemannian architecture'];

  const STATE = [0, 1, 2, 3];                            // figure state for each step
  let step = 0, from = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const to = STATE[step] ?? 3;
    const N = cells.length;

    cells.forEach((c, n) => {
      const u = Math.max(0, Math.min(1, (t - 0.4 * n / N) / 0.6));   // a cascade over the cells
      const p = place(from, c.i, c.j), q = place(to, c.i, c.j);
      const L = (a, b) => a + u * (b - a);
      c.node.setAttribute('x', L(p.x, q.x));
      c.node.setAttribute('y', L(p.y, q.y));
      c.node.setAttribute('width', L(p.w, q.w));
      c.node.setAttribute('height', L(p.h, q.h));
      c.node.setAttribute('opacity', L(p.op, q.op));
    });

    const shown = t > 0.95 ? (to === 3 ? 0 : to) : -1;
    labIn.forEach((l, k) => l.show(k === shown));
    labKind.node.innerHTML = KIND[to];
    labKind.show(t > 0.95 && to > 0);
  }

  render(1);

  return {
    setStep(n) {
      if (n === step) return;
      const back = n < step;
      from = STATE[step] ?? 3;
      step = n;
      ticker.run(back ? 0 : 1400, render, { instant: back });
    },
    activate() {}, deactivate() { ticker.stop(); }
  };
}