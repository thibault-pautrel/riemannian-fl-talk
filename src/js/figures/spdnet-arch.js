import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';

/* Wide diagram of the architecture. Each step animates the viewBox onto
   one layer and fades in a detail card. Step 4 returns to the overview
   with only the parametrised layer still highlighted. */

const CW = 1760, CH = 640;
const BW = 250, BH = 300, BY = 110, MID = BY + BH / 2;
const ZW = 980, ZH = ZW * CH / CW;

const LAYERS = [
  { x: 250, label: 'BiMap',  eq: 'Xₖ = Wₖ Xₖ₋₁ Wₖᵀ',      color: '#0072B2', tint: '#E7F1F9' },
  { x: 580, label: 'ReEig',  eq: 'Xₖ = U max(εI, Σ) Uᵀ',  color: '#009E73', tint: '#E4F5EE' },
  { x: 910, label: 'LogEig', eq: 'Xₖ = U log(Σ) Uᵀ',      color: '#E69F00', tint: '#FCF2DF' }
];
/* ---- covariance matrices, symmetric by construction ---------------- */

function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A A^T normalised into a correlation matrix
function symMatrix(n, seed) {
  const r = rng(seed);
  const A = Array.from({ length: n }, () => Array.from({ length: n }, () => r() * 2 - 1));
  const M = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += A[i][k] * A[j][k];
      M[i][j] = s + (i === j ? 0.30 : 0);
    }
  return M.map((row, i) => row.map((x, j) => x / Math.sqrt(M[i][i] * M[j][j])));
}

// light to deep red, for a correlation in [-1, 1]
function red(v) {
  const t = Math.max(0, Math.min(1, (v + 1) / 2));
  const c = [253, 236, 232].map((a, k) => Math.round(a + t * ([178, 24, 43][k] - a)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// the same matrix as a block of <rect>, for the card illustrations
function matArt(M, x, y, size) {
  const n = M.length, c = size / n;
  let s = '';
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++)
      s += `<rect x="${(x + b * c).toFixed(1)}" y="${(y + a * c).toFixed(1)}" ` +
           `width="${(c + 0.4).toFixed(1)}" height="${(c + 0.4).toFixed(1)}" fill="${red(M[a][b])}"/>`;
  return s + `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="none" ` +
             `stroke="#9A3D42" stroke-width="1.2"/>`;
}
const CARDS = [
  {
    tag: 'parametrised layer',
    title: 'BiMap',
    eq: '$X_k = W_k\\,X_{k-1}\\,W_k^{\\top}$',
    body: 'A congruence by $W_k$. It reduces the dimension from $d_{k-1}$ to $d_k$ ' +
          'and keeps the output symmetric positive definite as long as $W_k$ has full rank. ' +
          'Taking orthonormal columns puts $W_k$ on the Stiefel manifold. ' +
          'This is the only layer that carries parameters.',
    art: `<svg viewBox="0 0 320 124">
      <rect x="22" y="30" width="72" height="72" fill="none" stroke="#C88C8C" stroke-width="1"/>
      <rect x="16" y="24" width="72" height="72" fill="none" stroke="#C88C8C" stroke-width="1"/>
      ${matArt(symMatrix(5, 3), 10, 18, 72)}
      <path d="M96 56H124" stroke="#243B54" stroke-width="1.4" marker-end="url(#bm-a)"/>
      <defs><marker id="bm-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5"
        markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#243B54"/></marker></defs>
      <rect x="130" y="38" width="54" height="36" rx="3" fill="#fff" stroke="#0072B2" stroke-width="1.7"/>
      <text x="157" y="62" text-anchor="middle" font-size="18" font-weight="600" fill="#0072B2">Wₖ</text>
      <path d="M190 56H218" stroke="#243B54" stroke-width="1.4" marker-end="url(#bm-a)"/>
      <rect x="230" y="36" width="50" height="50" fill="none" stroke="#C88C8C" stroke-width="1"/>
      ${matArt(symMatrix(3, 9), 224, 30, 50)}
      <text x="46" y="116" text-anchor="middle" font-size="13" fill="#707F8F">dₖ₋₁ × dₖ₋₁</text>
      <text x="249" y="116" text-anchor="middle" font-size="13" fill="#707F8F">dₖ × dₖ</text>
    </svg>`
  },
  {
    tag: 'no parameters',
    title: 'ReEig',
    eq: '$X_k = U\\max(\\varepsilon I,\\Sigma)\\,U^{\\top}$',
    body: 'The analogue of a ReLU, acting on the spectrum of $X_{k-1}=U\\Sigma U^{\\top}$. ' +
          'Eigenvalues below $\\varepsilon$ are lifted to $\\varepsilon$, which keeps the matrix ' +
          'away from the boundary $\\det = 0$ and restores non-linearity.',
    art: `<svg viewBox="0 0 320 124">
      <line x1="16" y1="84" x2="300" y2="84" stroke="#C8D2DA" stroke-width="1"/>
      <line x1="16" y1="62" x2="300" y2="62" stroke="#009E73" stroke-width="1.2" stroke-dasharray="5 4"/>
      <text x="306" y="66" font-size="13" fill="#009E73">ε</text>
      ${[56, 43, 29, 14, 8, 4].map((h, i) => {
        const x = 28 + i * 44, hi = Math.max(h, 22);
        return `<rect x="${x}" y="${84 - h}" width="24" height="${h}" fill="#CFE0DA"/>` +
               (hi > h ? `<rect x="${x}" y="${84 - hi}" width="24" height="${hi - h}"
                  fill="#009E73" fill-opacity=".55"/>` : '') +
               `<text x="${x + 12}" y="102" text-anchor="middle" font-size="13"
                  fill="#707F8F">λ${'₁₂₃₄₅₆'[i]}</text>`;
      }).join('')}
    </svg>`
  },
  {
    tag: 'no parameters',
    title: 'LogEig',
    eq: '$X_k = U\\log(\\Sigma)\\,U^{\\top}$',
    body: 'The matrix logarithm sends the cone onto the tangent space at the identity, ' +
          'a plain vector space. After this layer a fully connected layer and a softmax ' +
          'become legitimate. Everything before it stays on the manifold.',
    art: `<svg viewBox="0 0 320 186">
      <defs><marker id="le-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5.5"
        markerHeight="5.5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#243B54"/></marker></defs>

      <!-- tangent space at the identity -->
      <path d="M30 14L302 4L288 64L16 76Z" fill="#FEF8EC" stroke="#E69F00" stroke-width="1.6"/>
      ${[1, 2, 3, 4].map((i) => {
        const t = i / 5;
        const x1 = 30 + t * 272, y1 = 14 - t * 10;
        const x2 = 16 + t * 272, y2 = 76 - t * 12;
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}"
                  y2="${y2.toFixed(1)}" stroke="#E6B85E" stroke-width=".8"/>`;
      }).join('')}
      ${[1, 2].map((j) => {
        const t = j / 3;
        const x1 = 30 - t * 14, y1 = 14 + t * 62;
        const x2 = 302 - t * 14, y2 = 4 + t * 60;
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}"
                  y2="${y2.toFixed(1)}" stroke="#E6B85E" stroke-width=".8"/>`;
      }).join('')}

      <!-- the cone -->
      <path d="M74 118Q160 78 246 118L160 182Z" fill="#FCF2DF" stroke="none"/>
      ${[0.42, 0.70].map((s) => {
        const cy = 182 - 64 * s, rx = 86 * s, ry = 20 * s;
        return `<path d="M${(160 - rx).toFixed(1)} ${cy.toFixed(1)}Q160 ${(cy + 2 * ry).toFixed(1)}
                  ${(160 + rx).toFixed(1)} ${cy.toFixed(1)}" fill="none"
                  stroke="#E6B85E" stroke-width=".9"/>`;
      }).join('')}
      ${[-0.8, -0.4, 0, 0.4, 0.8].map((u) => {
        const x = 160 + 86 * u, y = 118 + 20 * Math.sqrt(Math.max(0, 1 - u * u));
        return `<line x1="160" y1="182" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"
                  stroke="#E6B85E" stroke-width=".9"/>`;
      }).join('')}
      <path d="M74 118Q160 158 246 118" fill="none" stroke="#E69F00"
        stroke-width="1.2" stroke-dasharray="5 4"/>
      <path d="M74 118Q160 78 246 118" fill="none" stroke="#E69F00" stroke-width="1.8"/>
      <path d="M74 118L160 182L246 118" fill="none" stroke="#E69F00" stroke-width="1.8"/>

      <!-- the point and its logarithm -->
      <circle cx="120" cy="140" r="6" fill="#243B54"/>
      <text x="104" y="146" text-anchor="end" font-size="14" font-weight="600" fill="#243B54">X</text>
      <circle cx="132" cy="42" r="6" fill="#243B54"/>
      <text x="132" y="28" text-anchor="middle" font-size="14" font-weight="600" fill="#243B54">log(X)</text>
      <path d="M118 132C108 104 112 76 128 54" fill="none" stroke="#243B54"
        stroke-width="1.6" marker-end="url(#le-a)"/>

      <text x="266" y="56" text-anchor="middle" font-size="12" fill="#A08048">T_I 𝒮⁺⁺</text>
      <text x="268" y="128" text-anchor="middle" font-size="12" fill="#A08048">𝒮⁺⁺</text>
    </svg>`
  }
];

export default function spdnetArch(el) {
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

  // ---- input stack, three covariance matrices
  [2, 1, 0].forEach((n) => {
    const ox = 40 + n * 12, oy = MID - 62 + n * 12, SZ = 120, k = 4, cs = SZ / k;
    const M = symMatrix(k, 5 + n * 7);
    for (let a = 0; a < k; a++)
      for (let b = 0; b < k; b++)
        sc.node(g, 'rect', {
          x: ox + b * cs, y: oy + a * cs, width: cs + 0.4, height: cs + 0.4,
          fill: red(M[a][b])
        });
    sc.node(g, 'rect', { x: ox, y: oy, width: SZ, height: SZ, fill: 'none',
                         stroke: '#9A3D42', 'stroke-width': 1.4 });
  });
  txt(g, 100, MID - 86, 'input', { size: 17, fill: '#707F8F', mono: true });
  txt(g, 100, MID + 108, 'Σ ∈ 𝒮⁺⁺', { size: 18, fill: '#707F8F', mono: true });

  const arrow = (x1, x2, y = MID) => sc.node(g, 'path', {
    d: `M${x1} ${y}H${x2}`, stroke: '#243B54', 'stroke-width': 1.8,
    fill: 'none', 'marker-end': sc.arrow('navy')
  });
  arrow(176, LAYERS[0].x - 6);

  // ---- the repeated BiRe block, drawn behind the layers
  const BIRE_X = LAYERS[0].x - 24;
  const BIRE_W = LAYERS[1].x + BW + 24 - BIRE_X;
  sc.node(g, 'rect', {
    x: BIRE_X, y: BY - 30, width: BIRE_W, height: BH + 86, rx: 10,
    fill: '#F3F7FA', stroke: '#8A9AA8', 'stroke-width': 1.4, 'stroke-dasharray': '8 6'
  });

  // ---- the three layers
  const blocks = LAYERS.map((L, i) => {
    const gg = sc.g(g);
    const bar = sc.node(gg, 'rect', { x: L.x, y: BY, width: BW, height: 11, rx: 2, fill: L.color });
    const box = sc.node(gg, 'rect', {
      x: L.x, y: BY + 11, width: BW, height: BH - 11, rx: 4,
      fill: L.tint, stroke: L.color, 'stroke-width': 1.8
    });
    txt(gg, L.x + BW / 2, MID + 4, L.label, { size: 30, weight: 650, fill: L.color });
    txt(gg, L.x + BW / 2, MID + 40, L.eq, { size: 16, fill: '#5A6B7A', mono: true });
    if (i < 2) arrow(L.x + BW + 6, LAYERS[i + 1].x - 6);
    return { bar, box, gg };
  });
  arrow(LAYERS[2].x + BW + 6, 1252);

  // ---- label of the BiRe block
  txt(g, BIRE_X + BIRE_W / 2, BY - 44, 'BiRe block   × L',
      { size: 22, weight: 600, fill: '#5A6B7A', mono: true });

  // ---- head of the network
  sc.node(g, 'circle', { cx: 1284, cy: MID, r: 32, fill: '#F2F5F7', stroke: '#8A9AA8', 'stroke-width': 1.5 });
  txt(g, 1284, MID + 6, 'Vech', { size: 17, weight: 600, fill: '#5A6B7A' });
  arrow(1318, 1344);
  [{ x: 1350, w: 112, t: 'FC', color: '#5A6EC8', tint: '#EDEFF9' },
   { x: 1502, w: 150, t: 'softmax', color: '#8A9AA8', tint: '#F2F5F7' }].forEach((b) => {
    sc.node(g, 'rect', { x: b.x, y: MID - 40, width: b.w, height: 80, rx: 4,
                         fill: b.tint, stroke: b.color, 'stroke-width': 1.7 });
    txt(g, b.x + b.w / 2, MID + 7, b.t, { size: 20, weight: 600, fill: b.color });
    arrow(b.x + b.w + 6, b.x + b.w + 32);
  });
  txt(g, 1706, MID + 10, 'ŷ', { size: 30, fill: '#243B54' });

  const hint = txt(g, CW / 2, CH - 34, 'press → to zoom on each layer',
                   { size: 20, fill: '#8A9AA8', mono: true });

  // ---- detail cards, plain HTML so KaTeX renders
  const cards = CARDS.map((c, i) => {
    const d = document.createElement('div');
    d.className = 'arch-card';
    d.style.borderLeftColor = LAYERS[i].color;
    d.innerHTML =
      `<div class="tag" style="color:${LAYERS[i].color}">${c.tag}</div>` +
      `<h4 style="color:${LAYERS[i].color}">${c.title}</h4>` +
      `<div class="eq">${c.eq}</div>` +
      `<div class="art">${c.art}</div>` +
      `<p>${c.body}</p>`;
    el.appendChild(d);
    return d;
  });

  // ---- viewBox windows
  const clampX = (x) => Math.max(0, Math.min(CW - ZW, x));
  const VB = [
    [0, 0, CW, CH],
    [clampX(LAYERS[0].x - 70), MID - ZH / 2, ZW, ZH],
    [clampX(LAYERS[1].x - 70), MID - ZH / 2, ZW, ZH],
    [clampX(LAYERS[2].x - 70), MID - ZH / 2, ZW, ZH],
    [0, 0, CW, CH]
  ];

  let step = 0, from = VB[0].slice(), to = VB[0].slice();

  function render(t) {
    const vb = from.map((v, i) => v + (to[i] - v) * t);
    sc.svg.setAttribute('viewBox', vb.map((v) => v.toFixed(1)).join(' '));

    blocks.forEach((b, i) => {
      const focus = step >= 1 && step <= 3 && step - 1 === i;
      const dim = step === 4 && i > 0;
      b.box.setAttribute('stroke-width', focus ? 3.2 : 1.8);
      b.gg.setAttribute('opacity', dim ? 0.42 : 1);
      b.bar.setAttribute('opacity', step === 4 && i > 0 ? 0.3 : 1);
    });

    cards.forEach((c, i) => c.classList.toggle('on', step - 1 === i && t > 0.55));
    hint.setAttribute('opacity', step === 0 ? 1 : 0);
    hint.textContent = step === 4 ? 'only BiMap carries parameters' : 'press → to zoom on each layer';
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