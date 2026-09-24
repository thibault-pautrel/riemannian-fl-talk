import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';

/* The curve as a boundary.

   Each test the attacker could run is a point: how often it raises a
   false alarm, how often it misses. No test lands below the curve. An
   (eps, delta) pair says the curve clears one broken floor, and every
   eps gives another floor. */

const CW = 1060, CH = 340;
const NAVY = '#243B54', SLATE = '#8A9AA8';
const CURVE = '#0072B2', FLOOR = '#B2182B', DOT = '#6B3FA0';

const X0 = 96, Y0 = 26, SZ = 256;
const ax = (a) => X0 + SZ * a;
const ay = (b) => Y0 + SZ * (1 - b);

function erf(x) {
  const s = x < 0 ? -1 : 1, a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t
              - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}
const Phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
function Phinv(p) {
  let lo = -8, hi = 8;
  for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
const Gmu = (a, mu) => Phi(Phinv(1 - a) - mu);
const deltaOf = (eps, mu) =>
  Math.max(0, Phi(mu / 2 - eps / mu) - Math.exp(eps) * Phi(-mu / 2 - eps / mu));

function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function fdpCurve(el) {
  const sc = makeScene(el, { width: CW, height: CH });
  const ticker = makeTicker();

  let mu = 1.2;
  const EPS = 1.0;

  const g = sc.g();
  const txt = (x, y, s, o = {}) => {
    const n = sc.node(g, 'text', {
      x, y, 'text-anchor': o.anchor ?? 'middle', 'font-size': o.size ?? 15,
      'font-weight': o.weight ?? 400, fill: o.fill ?? SLATE,
      'font-family': o.mono ? 'var(--mono)' : 'var(--sans)'
    });
    n.textContent = s;
    return n;
  };

  const curvePts = (m) => {
    const p = [];
    for (let i = 0; i <= 150; i++) { const a = i / 150; p.push([ax(a), ay(Gmu(a, m))]); }
    return p;
  };
  const toPath = (p) => p.map((q, i) =>
    (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('');

  const forbidden = sc.node(g, 'path', { fill: FLOOR, 'fill-opacity': .07, stroke: 'none' });
  sc.node(g, 'rect', { x: X0, y: Y0, width: SZ, height: SZ,
                       fill: 'none', stroke: '#C8D2DA', 'stroke-width': 1.2 });
  sc.node(g, 'line', { x1: ax(0), y1: ay(1), x2: ax(1), y2: ay(0),
                       stroke: '#9AA6B2', 'stroke-width': 1.2, 'stroke-dasharray': '6 5' });
  txt(ax(0.63), ay(0.50), 'coin flip', { size: 13 });

  const dots = (() => {
    const r = rng(19), out = [];
    for (let k = 0; k < 34; k++) {
      const a = 0.04 + 0.9 * r();
      out.push({ a, lift: 0.06 + 0.75 * r() * (1 - a) });
    }
    return out.map((d) => ({ d, node: sc.node(g, 'circle', { r: 3.4, fill: DOT,
                              'fill-opacity': .55, opacity: 0 }) }));
  })();

  const floorPath = (eps, m) => {
    const del = deltaOf(eps, m);
    const f = (a) => Math.max(0, 1 - del - Math.exp(eps) * a,
                              Math.exp(-eps) * (1 - del - a));
    let d = '';
    for (let i = 0; i <= 110; i++) {
      const a = i / 110;
      d += (i ? 'L' : 'M') + ax(a).toFixed(1) + ' ' + ay(f(a)).toFixed(1);
    }
    return d;
  };
  const ghosts = Array.from({ length: 6 }, () => sc.node(g, 'path', {
    fill: 'none', stroke: FLOOR, 'stroke-opacity': .22, 'stroke-width': 1.4, opacity: 0 }));
  const floor = sc.node(g, 'path', { fill: 'none', stroke: FLOOR,
                                     'stroke-width': 2.2, opacity: 0 });
  const curve = sc.node(g, 'path', { fill: 'none', stroke: CURVE, 'stroke-width': 3 });

  txt(X0 + SZ / 2, Y0 + SZ + 28, 'false alarm rate', { size: 16, fill: NAVY });
  txt(X0 + SZ / 2, Y0 + SZ + 48, 'says “used”, but it was not', { size: 13 });
  const yl = txt(X0 - 48, Y0 + SZ / 2, 'miss rate', { size: 16, fill: NAVY });
  yl.setAttribute('transform', `rotate(-90 ${X0 - 48} ${Y0 + SZ / 2})`);
  const yl2 = txt(X0 - 30, Y0 + SZ / 2, 'says “not used”, but it was', { size: 13 });
  yl2.setAttribute('transform', `rotate(-90 ${X0 - 30} ${Y0 + SZ / 2})`);

  const labForbid = txt(0, 0, 'no test can reach here', { size: 14, fill: FLOOR });
  const labCurve = txt(0, 0, 'the boundary', { size: 15, fill: CURVE, weight: 650 });
  const labFloor = txt(0, 0, '', { size: 14, fill: FLOOR });

  const RX = 448;
  const lines = [
    'every test the attacker could run',
    'the curve bounds them all from below',
    'one (ε, δ)  =  one floor the curve clears',
    'every ε gives one, all true at once'
  ].map((s, k) => txt(RX, 60 + k * 40, s, { anchor: 'start', size: 18, fill: NAVY }));
  lines.forEach((l) => l.setAttribute('opacity', 0));

  const sMu = sc.slider('μ', { min: 0.15, max: 3, step: 0.02, value: mu },
                        (v) => { mu = v; render(1); });

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;
    const g3 = step > 3 ? 1 : step === 3 ? t : 0;
    const g4 = step === 4 ? t : 0;

    sMu.set(mu.toFixed(2));

    const pts = curvePts(mu);
    curve.setAttribute('d', toPath(pts));
    forbidden.setAttribute('d', toPath(pts) + `L${ax(0)} ${ay(0)}Z`);
    forbidden.setAttribute('opacity', g2);
    labForbid.setAttribute('x', ax(0.30)); labForbid.setAttribute('y', ay(0.12));
    labForbid.setAttribute('opacity', g2 > .6 ? 1 : 0);
    labCurve.setAttribute('x', ax(0.24));
    labCurve.setAttribute('y', ay(Gmu(0.24, mu)) - 14);
    labCurve.setAttribute('opacity', g2 > .3 ? 1 : 0);

    dots.forEach(({ d, node }, k) => {
      const b = Gmu(d.a, mu) + d.lift;
      node.setAttribute('cx', ax(d.a));
      node.setAttribute('cy', ay(Math.min(1 - d.a, b)));
      node.setAttribute('opacity', Math.max(0, Math.min(1, g1 * 2.4 - k * 0.04)) * 0.9);
    });

    floor.setAttribute('d', floorPath(EPS, mu));
    floor.setAttribute('opacity', g3);
    labFloor.textContent = `ε = ${EPS.toFixed(1)},  δ = ${deltaOf(EPS, mu).toFixed(3)}`;
    labFloor.setAttribute('x', ax(0.66)); labFloor.setAttribute('y', ay(0.06));
    labFloor.setAttribute('opacity', g3 > .6 ? 1 : 0);

    ghosts.forEach((p, k) => {
      const e = 0.4 + 0.5 * k;
      p.setAttribute('d', floorPath(e, mu));
      p.setAttribute('opacity', Math.max(0, Math.min(1, g4 * 2.2 - k * 0.25)));
    });

    lines.forEach((l, k) => {
      const on = [g1, g2, g3, g4][k];
      l.setAttribute('opacity', on > .5 ? 1 : 0);
    });
  }

  sc.tool('reset', () => { mu = 1.2; sMu.input.value = mu; render(1); });

  const durations = [0, 900, 800, 800, 1400];
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