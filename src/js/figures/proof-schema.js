import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';

/* Structure of the privacy argument, in formulas.

   Bottom: one local step becomes a private release, one rule of the f-DP
   calculus per arrow. Above: three lifts carry it to the whole transcript.
   Each step raises a card with the rule it uses. */

const CW = 1500, CH = 660;
const NAVY = '#243B54', SLATE = '#8A9AA8';
const KEY = '#0072B2', OURS = '#6B3FA0';

const BW = 300, BH = 104, BY = 504;
const BX = [46, 396, 746, 1096];

const RW = 700, RH = 82, RX = 300;
const RY = [354, 218, 82];

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
  const pieces = [[], [], [], [], [], [], []];
  const add = (k, node, isLabel = false) => pieces[k].push({ node, isLabel });

  // ---- bottom: one local step
  const frame = sc.node(g, 'rect', {
    x: 22, y: BY - 70, width: CW - 44, height: BH + 104, rx: 10,
    fill: '#F7F9FB', stroke: SLATE, 'stroke-width': 1.3, 'stroke-dasharray': '8 6'
  });
  const frameLab = txt(g, 40, BY - 44, 'one local step, fixed iterate',
                       { anchor: 'start', size: 17, fill: NAVY, weight: 650 });
  add(1, frame); add(1, frameLab);

  const CHAIN = [
    { at: 1, eq: '$\\widehat{g}^{C}=\\tfrac1B\\sum_\\ell\\operatorname{clip}_C(\\nabla f)$',
      cap: '$\\Delta = 2C/B$' },
    { at: 1, eq: '$\\widehat{g}^{C}+\\xi$', cap: '$\\mu_0 = 2C/(B\\sigma)$' },
    { at: 2, eq: '$\\widehat{g}^{C}+P\\xi$', cap: '$\\mu_0$-GDP' },
    { at: 3, eq: '$C_q(G_{\\mu_0})$-DP', cap: '$q = B/m$' }
  ];
  const OPS = [
    { at: 1, tex: '$\\xi\\sim\\mathcal{N}(0,\\sigma^2 I)$' },
    { at: 2, tex: '$P$' },
    { at: 3, tex: 'subsample' }
  ];

  CHAIN.forEach((S, k) => {
    const box = sc.node(g, 'rect', { x: BX[k], y: BY, width: BW, height: BH, rx: 6,
                                     fill: '#fff', stroke: k === 0 ? SLATE : KEY,
                                     'stroke-width': k === 0 ? 1.4 : 1.8 });
    add(S.at, box);
    add(S.at, eq(S.eq, BX[k] + BW / 2, BY + 40), true);
    add(S.at, eq(S.cap, BX[k] + BW / 2, BY + 78, 'muted'), true);
  });
  OPS.forEach((O, k) => {
    add(O.at, arrow(g, `M${BX[k] + BW + 6} ${BY + BH / 2}H${BX[k + 1] - 6}`));
    add(O.at, eq(O.tex, (BX[k] + BW + BX[k + 1]) / 2, BY + BH / 2 - 20, 'muted'), true);
  });

  // ---- the ladder
  const RUNGS = [
    { at: 4, eq: '$C_{q_{i^\\star}}(G_{\\mu_0})^{\\otimes T\\tau}$-DP', cap: '', accent: NAVY },
    { at: 5, eq: '$\\mathcal{V}_T=\\Psi(\\mathcal{R},\\Gamma)$',
      cap: '$\\Gamma$: privatised gradients &nbsp;·&nbsp; $\\mathcal{R}$: protocol randomness',
      accent: OURS },
    { at: 6, eq: '$C_{q}(G_{\\mu_0})^{\\otimes T\\tau}$-DP', cap: '$q = B/m_\\star$', accent: NAVY }
  ];

  RUNGS.forEach((R, k) => {
    const own = R.accent === OURS;
    const box = sc.node(g, 'rect', { x: RX, y: RY[k], width: RW, height: RH, rx: 6,
                                     fill: own ? 'rgba(107,63,160,.08)' : '#fff',
                                     stroke: R.accent, 'stroke-width': own ? 2.4 : 1.6 });
    const yFrom = k === 0 ? BY - 70 : RY[k - 1];
    add(R.at, box);
    add(R.at, arrow(g, `M${RX + RW / 2} ${yFrom - 6}V${RY[k] + RH + 8}`, 2.2));
    add(R.at, eq(R.eq, RX + RW / 2, RY[k] + (R.cap ? 32 : RH / 2 + 2)), true);
    if (R.cap) add(R.at, eq(R.cap, RX + RW / 2, RY[k] + 62, 'muted'), true);
  });

  // ---- the readout
  const out = sc.node(g, 'rect', { x: RX + RW + 34, y: RY[2] + 10, width: 210, height: 62, rx: 6,
                                   fill: '#fff', stroke: SLATE, 'stroke-width': 1.4,
                                   'stroke-dasharray': '7 5' });
  add(6, out);
  add(6, arrow(g, `M${RX + RW + 6} ${RY[2] + RH / 2}H${RX + RW + 28}`));
  add(6, eq('$(\\varepsilon,\\delta)$ profile', RX + RW + 139, RY[2] + 41), true);

  // ---- one card per step, the rule being used
  const CARDS = [
    { at: 1, color: KEY, tag: 'f-DP calculus', title: 'Gaussian mechanism',
      eq: '$\\Theta+\\xi$ is $(\\Delta/\\sigma)$-GDP',
      body: 'with $\\Delta=\\sup_{D\\bowtie D\'}\\lVert\\Theta(D)-\\Theta(D\')\\rVert$ ' +
            'and $\\xi\\sim\\mathcal{N}(0,\\sigma^2 I)$.',
      pos: { left: '3%', top: '5%', width: '30%' } },
    { at: 2, color: KEY, tag: 'f-DP calculus', title: 'Post-processing',
      eq: '$h\\circ\\mathcal{A}$ is $f$-DP',
      body: 'for any $h$ that does not see the data. The projection is free.',
      pos: { left: '35%', top: '5%', width: '28%' } },
    { at: 3, color: KEY, tag: 'f-DP calculus', title: 'Subsampling',
      eq: '$\\mathcal{A}\\circ\\mathtt{Sample}_B$ is $C_q(f)$-DP',
      body: '$q=B/m$. The operator is non-increasing in $q$, with $C_1(f)=f$ and ' +
            '$C_0(f)=\\mathrm{Id}$: rarer participation is more private.',
      pos: { left: '66%', top: '5%', width: '31%' } },
    { at: 4, color: NAVY, tag: 'f-DP calculus', title: 'Adaptive composition',
      eq: '$N$ releases: $f^{\\otimes N}$-DP',
      body: 'Each release may depend on the previous outputs. No slack per release.',
      pos: { left: '2%', top: '44%', width: '22%' } },
    { at: 5, color: OURS, tag: 'ours', title: 'Geometry-free',
      eq: '$\\mathcal{M},\\Pi,\\mathrm{Agg},\\mathrm{Opt}\\subset\\Psi$',
      body: 'The transcript is rebuilt from $\\Gamma$ and $\\mathcal{R}$ alone, so none ' +
            'of them enters the budget.',
      pos: { left: '2%', top: '24%', width: '22%' } },
    { at: 6, color: NAVY, tag: 'readout', title: 'Back to $(\\varepsilon,\\delta)$',
      eq: '$\\delta_{G_\\mu}(\\varepsilon)=\\Phi\\bigl(\\tfrac{\\mu}{2}-\\tfrac{\\varepsilon}{\\mu}\\bigr)' +
          '-e^{\\varepsilon}\\Phi\\bigl(-\\tfrac{\\mu}{2}-\\tfrac{\\varepsilon}{\\mu}\\bigr)$',
      body: 'One $\\mu$ gives the whole $(\\varepsilon,\\delta)$ family.',
      pos: { left: '75%', top: '34%', width: '23%' } }
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

  const durations = [0, 800, 700, 700, 800, 800, 800];
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