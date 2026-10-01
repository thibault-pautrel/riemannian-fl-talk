import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';

/* Structure of the privacy argument, in the order of the proof.

   Bottom, one local step at a fixed iterate: per-sample clipping fixes the
   sensitivity, Gaussian noise sets the budget on the ambient release, the
   tangent projection carries it by post-processing, and the batch draw
   amplifies it. Above, three lifts carry it to the transcript. */

const CW = 1500, CH = 700;
const NAVY = '#243B54', SLATE = '#8A9AA8';
const KEY = '#0072B2', OURS = '#6B3FA0';

const BW = 268, BH = 98, BY = 556;
const BX = [40, 330, 620, 910, 1200];

const RW = 700, RH = 78, RX = 300;
const RY = [386, 258, 130];

export default function proofSchema(el) {
  const sc = makeScene(el, { width: CW, height: CH });
  const ticker = makeTicker();

  const g = sc.g();
  const txt = (parent, x, y, s, o = {}) => {
    const n = sc.node(parent, 'text', {
      x, y, 'text-anchor': o.anchor ?? 'middle', 'font-size': o.size ?? 15,
      'font-weight': o.weight ?? 400, fill: o.fill ?? SLATE,
      'font-family': o.mono ? 'var(--mono)' : 'var(--sans)'
    });
    n.textContent = s;
    return n;
  };
  const arrow = (parent, d, w = 1.6) => sc.node(parent, 'path', {
    d, fill: 'none', stroke: NAVY, 'stroke-width': w, 'marker-end': sc.arrow('navy')
  });
  const eq = (tex, x, y, cls = '') => {
    const l = sc.label(tex, cls);
    l.moveTo({ x, y });
    l.show(false);
    return l;
  };

  // pieces[k] holds everything that appears at step k
  const pieces = Array.from({ length: 8 }, () => []);
  const add = (k, node, isLabel = false) => pieces[k].push({ node, isLabel });

  // ---- bottom: one local step, at a fixed iterate
  const frame = sc.node(g, 'rect', {
    x: 20, y: BY - 64, width: CW - 40, height: BH + 102, rx: 10,
    fill: '#F7F9FB', stroke: SLATE, 'stroke-width': 1.3, 'stroke-dasharray': '8 6'
  });
  const frameLab = txt(g, 38, BY - 40, 'one local step, at a fixed iterate x',
                       { anchor: 'start', size: 17, fill: NAVY, weight: 650 });
  add(1, frame); add(1, frameLab);

  const CHAIN = [
    { at: 1, eq: '$\\operatorname{clip}_C\\bigl(\\operatorname{grad}f(\\theta;z)\\bigr)$',
      cap: '$\\lVert\\cdot\\rVert_\\theta\\le C$, per sample' },
    { at: 1, eq: '$\\widehat{\\operatorname{grad}}^{C}\\!f(\\theta,\\mathcal{B})$',
      cap: 'fixed $\\mathcal{B}$, $\\Delta = 2C/B$' },
    { at: 2, eq: '$\\widehat{\\operatorname{grad}}^{C}\\!f(\\theta,\\mathcal{B})+\\xi$',
      cap: '$\\mu_0 = 2C/(B\\sigma)$-GDP' },
    { at: 3, eq: '$\\tilde g=\\widehat{\\operatorname{grad}}^{C}\\!f+P_\\theta\\xi$',
      cap: 'same $\\mu_0$' },
    { at: 4, eq: '$C_{q_i}(G_{\\mu_0})$-DP', cap: '$q_i=B/m_i$' }
  ];
  const OPS = [
    { at: 1, tex: 'average' },
    { at: 2, tex: '$+\\,\\xi\\sim\\mathcal{N}(0,\\sigma^2 I)$' },
    { at: 3, tex: '$P_\\theta$' },
    { at: 4, tex: '$\\mathcal{B}$ drawn at random' }
  ];

  CHAIN.forEach((S, k) => {
    const box = sc.node(g, 'rect', { x: BX[k], y: BY, width: BW, height: BH, rx: 6,
                                     fill: '#fff', stroke: k < 2 ? SLATE : KEY,
                                     'stroke-width': k < 2 ? 1.4 : 1.8 });
    add(S.at, box);
    add(S.at, eq(S.eq, BX[k] + BW / 2, BY + 38), true);
    add(S.at, eq(S.cap, BX[k] + BW / 2, BY + 74, 'muted'), true);
  });
  OPS.forEach((O, k) => {
    add(O.at, arrow(g, `M${BX[k] + BW + 5} ${BY + BH / 2}H${BX[k + 1] - 5}`));
    add(O.at, eq(O.tex, (BX[k] + BW + BX[k + 1]) / 2, BY + BH / 2 - 22, 'muted'), true);
  });

  // ---- the ladder
  const RUNGS = [
    { at: 5, eq: '$\\Gamma$ is $C_{q_{i^\\star}}(G_{\\mu_0})^{\\otimes T\\tau}$-DP',
      cap: 'adaptive composition over the steps of the affected client',
      accent: NAVY },
    { at: 6, eq: '$\\mathcal{V}_T=\\Psi(\\mathcal{R},\\Gamma)$',
      cap: '$\\Gamma$: privatised gradients &nbsp;·&nbsp; $\\mathcal{R}$: protocol randomness, data-independent',
      accent: OURS },
    { at: 7, eq: '$C_{q}(G_{\\mu_0})^{\\otimes T\\tau}$-DP', cap: '$q=B/m_\\star$',
      accent: NAVY }
  ];

  RUNGS.forEach((R, k) => {
    const own = R.accent === OURS;
    const box = sc.node(g, 'rect', { x: RX, y: RY[k], width: RW, height: RH, rx: 6,
                                     fill: own ? 'rgba(107,63,160,.08)' : '#fff',
                                     stroke: R.accent, 'stroke-width': own ? 2.4 : 1.6 });
    const yFrom = k === 0 ? BY - 64 : RY[k - 1];
    add(R.at, box);
    add(R.at, arrow(g, `M${RX + RW / 2} ${yFrom - 6}V${RY[k] + RH + 8}`, 2.2));
    add(R.at, eq(R.eq, RX + RW / 2, RY[k] + 30), true);
    add(R.at, eq(R.cap, RX + RW / 2, RY[k] + 60, 'muted'), true);
  });

  // ---- the readout
  const out = sc.node(g, 'rect', { x: RX + RW + 34, y: RY[2] + 8, width: 206, height: 62, rx: 6,
                                   fill: '#fff', stroke: SLATE, 'stroke-width': 1.4,
                                   'stroke-dasharray': '7 5' });
  add(7, out);
  add(7, arrow(g, `M${RX + RW + 6} ${RY[2] + RH / 2}H${RX + RW + 28}`));
  add(7, eq('$(\\varepsilon,\\delta)$ profile', RX + RW + 137, RY[2] + 39), true);

  // ---- one card per step, the rule being used
  const CARDS = [
    { at: 1, color: SLATE, tag: 'sensitivity', title: 'Clipping',
      eq: '$\\Delta=2C/B$',
      body: "Each clipped per-sample gradient has norm at most $C$, and the induced " +
            "metric makes the tangent norm the ambient one, so " +
            "$\\bigl\\lVert\\widehat{\\operatorname{grad}}^{C}\\!f(\\theta,\\mathcal{B})" +
            "-\\widehat{\\operatorname{grad}}^{C}\\!f(\\theta,\\mathcal{B}')" +
            "\\bigr\\rVert_\\theta\\le\\tfrac{2C}{B}$.",
      pos: { left: '2%', top: '3%', width: '31%' } },
    { at: 2, color: KEY, tag: 'f-DP calculus', title: 'Gaussian mechanism',
      eq: '$\\Theta+\\xi$ is $(\\Delta/\\sigma)$-GDP',
      body: 'The budget is settled on the <em>ambient</em> release, with ' +
            '$\\mu_0=\\Delta/\\sigma=2C/(B\\sigma)$.',
      pos: { left: '35%', top: '3%', width: '30%' } },
    { at: 3, color: KEY, tag: 'f-DP calculus', title: 'Post-processing',
      eq: '$P_x(\\Theta+\\xi)=\\Theta+P_x\\xi$',
      body: '$P_x$ is a fixed map that does not see the data, so the geometry only ' +
            'post-processes. The guarantee is uniform in $x$.',
      pos: { left: '67%', top: '3%', width: '31%' } },
    { at: 4, color: KEY, tag: 'f-DP calculus', title: 'Subsampling',
      eq: '$C_q(G_{\\mu_0})$-DP, $q=B/m$',
      body: 'Only now is $\\mathcal{B}$ random: a uniform $B$-subset drawn without ' +
            'replacement and never released, so it amplifies the budget.',
      pos: { left: '67%', top: '26%', width: '31%' } },
    { at: 5, color: NAVY, tag: 'f-DP calculus', title: 'Adaptive composition',
      eq: '$f^{\\otimes T\\tau}$',
      body: 'The other clients hold disjoint data, so their releases are ' +
            '$\\mathrm{Id}$-DP and drop out: the number $k$ of participants never ' +
            'appears.',
      pos: { left: '67%', top: '26%', width: '31%' } },
    { at: 6, color: OURS, tag: 'ours', title: 'Geometry-free reduction',
      eq: '$\\mathcal{M},\\Pi,\\mathrm{Agg},\\mathrm{Opt}\\subset\\Psi$',
      body: 'The transcript is rebuilt from $\\mathcal{R}$ and $\\Gamma$ by fixed, ' +
            'data-independent operations, so none of them enters the budget.',
      pos: { left: '67%', top: '26%', width: '31%' } },
    { at: 7, color: NAVY, tag: 'readout', title: 'Back to $(\\varepsilon,\\delta)$',
      eq: '$\\delta_{G_\\mu}(\\varepsilon)=\\Phi\\bigl(\\tfrac{\\mu}{2}-\\tfrac{\\varepsilon}{\\mu}\\bigr)' +
          '-e^{\\varepsilon}\\Phi\\bigl(-\\tfrac{\\mu}{2}-\\tfrac{\\varepsilon}{\\mu}\\bigr)$',
      body: 'One $\\mu$ gives the whole $(\\varepsilon,\\delta)$ family.',
      pos: { left: '67%', top: '48%', width: '31%' } }
  ];

  const cards = CARDS.map((c) => {
    const d = document.createElement('div');
    d.className = 'arch-card';
    d.style.borderLeftColor = c.color;
    Object.assign(d.style, { right: 'auto', ...c.pos });
    d.innerHTML =
      `<div class="tag" style="color:${c.color}">${c.tag}</div>` +
      `<h4 style="color:${c.color}">${c.title}</h4>` +
      `<div class="eq">${c.eq}</div>` +
      `<p>${c.body}</p>`;
    el.appendChild(d);
    window.renderFigureMath?.(d);
    return { node: d, at: c.at };
  });

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    pieces.forEach((list, k) => {
      const on = step > k ? 1 : step === k ? t : 0;
      list.forEach(({ node, isLabel }) => {
        if (isLabel) node.show(on > 0.55);
        else node.setAttribute('opacity', on);
      });
    });
    cards.forEach((c) => c.node.classList.toggle('on', c.at === step && t > 0.5));
  }

  const durations = [0, 900, 700, 700, 700, 800, 800, 800];
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