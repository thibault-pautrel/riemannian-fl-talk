import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';

/* Three sites, three colour families. Each thumbnail is a genuine
   correlation matrix, built as A A^T then normalised, so it is
   symmetric by construction. */

const SITES = [
  { name: 'Site 1', n: 18, light: [233, 246, 239], dark: [ 20, 120,  90], seed: 3 },
  { name: 'Site 2', n: 24, light: [232, 241, 250], dark: [ 27,  95, 174], seed: 17 },
  { name: 'Site 3', n: 14, light: [241, 235, 248], dark: [ 94,  58, 151], seed: 29 }
];

function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// a 3x3 correlation matrix, symmetric and positive definite
function corrMatrix(r) {
  const A = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => r() * 2 - 1));
  const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += A[i][k] * A[j][k];
      M[i][j] = s + (i === j ? 0.35 : 0);
    }
  }
  return M.map((row, i) => row.map((x, j) => x / Math.sqrt(M[i][i] * M[j][j])));
}

const mix = (light, dark, t) => {
  const c = light.map((x, k) => Math.round(x + t * (dark[k] - x)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

export default function sites(el) {
  const sc = makeScene(el, { width: 1100, height: 390 });
  const ticker = makeTicker();

  const W = 290, H = 250, Y = 44;
  const X = [40, 405, 770];

  const gCards = sc.g(), gLinks = sc.g();

  const cards = SITES.map((s, k) => {
    const g = sc.g(gCards);
    const accent = mix(s.light, s.dark, 0.85);
    sc.node(g, 'rect', { x: X[k], y: Y, width: W, height: H, rx: 8,
                         fill: '#ffffff', stroke: accent, 'stroke-opacity': .35, 'stroke-width': 1.4 });
    sc.node(g, 'rect', { x: X[k], y: Y, width: W, height: 5, rx: 2, fill: accent });

    const cols = 6, cell = 30, pad = 9;
    const gx = X[k] + (W - (cols * (cell + pad) - pad)) / 2, gy = Y + 58;
    const r = rng(s.seed);
    for (let i = 0; i < s.n; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const M = corrMatrix(r);
      const th = sc.g(g);
      for (let a = 0; a < 3; a++) {
        for (let b = 0; b < 3; b++) {
          sc.node(th, 'rect', {
            x: gx + col * (cell + pad) + b * (cell / 3),
            y: gy + row * (cell + pad) + a * (cell / 3),
            width: cell / 3 + 0.4, height: cell / 3 + 0.4,
            fill: mix(s.light, s.dark, (M[a][b] + 1) / 2)
          });
        }
      }
      sc.node(th, 'rect', {
        x: gx + col * (cell + pad), y: gy + row * (cell + pad),
        width: cell, height: cell, fill: 'none', stroke: accent, 'stroke-opacity': .3, 'stroke-width': .8
      });
    }
    return g;
  });

  const labs = SITES.map((s, k) => {
    const l = sc.label(`<strong>${s.name}</strong>`);
    l.moveTo({ x: X[k] + W / 2, y: Y + 32 });
    return l;
  });
  const subs = SITES.map((s, k) => {
    const l = sc.label(`${s.n} trials, kept local`, 'muted');
    l.moveTo({ x: X[k] + W / 2, y: Y + H + 26 });
    return l;
  });

  const links = [0, 1].map((k) => {
    const g = sc.g(gLinks);
    const x1 = X[k] + W + 8, x2 = X[k + 1] - 8, y = Y + H / 2;
    sc.node(g, 'line', { x1, y1: y, x2, y2: y, stroke: '#243B54',
                         'stroke-opacity': .28, 'stroke-width': 1.6, 'stroke-dasharray': '7 6' });
    const cx = (x1 + x2) / 2;
    sc.node(g, 'circle', { cx, cy: y, r: 17, fill: '#ffffff', stroke: '#B2182B', 'stroke-width': 2.2 });
    sc.node(g, 'path', {
      d: `M${cx - 6} ${y - 6}L${cx + 6} ${y + 6}M${cx + 6} ${y - 6}L${cx - 6} ${y + 6}`,
      stroke: '#B2182B', 'stroke-width': 2.4, 'stroke-linecap': 'round'
    });
    g.setAttribute('opacity', 0);
    return g;
  });

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;
    const g2 = step >= 2 ? (step === 2 ? t : 1) : 0;

    cards.forEach((c, k) => {
      const on = Math.max(0, Math.min(1, g1 * 3 - k * 0.7));
      c.setAttribute('opacity', on);
      labs[k].show(on > .6); subs[k].show(on > .6);
    });
    links.forEach((l, k) => l.setAttribute('opacity', Math.max(0, Math.min(1, g2 * 2 - k * 0.5))));
  }

  const durations = [0, 900, 800];
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