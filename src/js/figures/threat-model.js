import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';

/* The honest-but-curious server. It follows the protocol, and it keeps
   every message. The data never moves, but the transcript grows. */

const CW = 1180, CH = 560;
const SX = 320, SY = 270, R = 178, CR = 46;
const NAVY = '#243B54', SLATE = '#8A9AA8', SRV = '#0072B2', ACT = '#E69F00', RED = '#B2182B';

const ANG = [90, 210, 330, 150, 30];
const ACTIVE = [true, true, true, false, false];
const rad = (d) => d * Math.PI / 180;

export default function threatModel(el) {
  const sc = makeScene(el, { width: CW, height: CH });
  const ticker = makeTicker();

  const gNet = sc.g(), gEye = sc.g(), gLog = sc.g();

  const txt = (parent, x, y, s, o = {}) => {
    const n = sc.node(parent, 'text', {
      x, y, 'text-anchor': o.anchor ?? 'middle', 'font-size': o.size ?? 16,
      'font-weight': o.weight ?? 400, fill: o.fill ?? SLATE,
      'font-family': o.mono ? 'var(--mono)' : 'var(--sans)'
    });
    n.textContent = s;
    return n;
  };

  // ---- clients and links
  const nodes = ANG.map((a, i) => {
    const p = { x: SX + R * Math.cos(rad(a)), y: SY - R * Math.sin(rad(a)) };
    const c = sc.node(gNet, 'circle', {
      cx: p.x, cy: p.y, r: CR,
      fill: ACTIVE[i] ? '#FCF2DF' : '#F5F7F8',
      stroke: ACTIVE[i] ? ACT : SLATE, 'stroke-width': ACTIVE[i] ? 2 : 1.3,
      'stroke-dasharray': ACTIVE[i] ? 'none' : '6 5'
    });
    const lbl = txt(gNet, p.x, p.y - 2, `Cl. ${i + 1}`, { size: 15, weight: 600, fill: NAVY });
    const dat = txt(gNet, p.x, p.y + 17, `𝒟${'₁₂₃₄₅'[i]}`, { size: 15, mono: true });
    const link = ACTIVE[i] ? sc.node(gNet, 'path', {
      d: `M${p.x} ${p.y}L${SX} ${SY}`, stroke: RED, 'stroke-width': 2,
      fill: 'none', 'marker-end': sc.arrow('accent'), opacity: 0
    }) : null;
    return { p, c, lbl, dat, link, active: ACTIVE[i] };
  });
  gNet.insertBefore(sc.node(gNet, 'g'), gNet.firstChild);   // keep links under the circles

  const server = sc.node(gNet, 'rect', {
    x: SX - 96, y: SY - 40, width: 192, height: 80, rx: 8,
    fill: '#E7F1F9', stroke: SRV, 'stroke-width': 2
  });
  txt(gNet, SX, SY - 10, 'Server', { size: 19, weight: 650, fill: NAVY });
  txt(gNet, SX, SY + 14, 'honest but curious', { size: 14, fill: SRV });

  // ---- the eye
  const eye = sc.g(gEye);
  sc.node(eye, 'path', {
    d: `M${SX - 34} ${SY + 62}Q${SX} ${SY + 32} ${SX + 34} ${SY + 62}` +
       `Q${SX} ${SY + 92} ${SX - 34} ${SY + 62}Z`,
    fill: '#fff', stroke: SRV, 'stroke-width': 2
  });
  sc.node(eye, 'circle', { cx: SX, cy: SY + 62, r: 11, fill: SRV });
  sc.node(eye, 'circle', { cx: SX + 4, cy: SY + 58, r: 3.5, fill: '#fff' });
  eye.setAttribute('opacity', 0);

  // ---- the transcript
  const LX = 690, LY = 96, LW = 440, LH = 372, ROW = 34;
  sc.node(gLog, 'rect', { x: LX, y: LY, width: LW, height: LH, rx: 6,
                          fill: '#FBFCFD', stroke: SLATE, 'stroke-opacity': .5, 'stroke-width': 1.4 });
  const logTitle = txt(gLog, LX + LW / 2, LY - 16, 'what the server keeps', { size: 18 });
  const rows = Array.from({ length: 10 }, (_, k) =>
    txt(gLog, LX + 18, LY + 30 + k * ROW, '', { anchor: 'start', size: 16, mono: true, fill: NAVY }));
  const vt = txt(gLog, LX + LW / 2, LY + LH + 30, '', { size: 19, fill: RED, weight: 600 });

  const ROUNDS = 14;
  const line = (t) => t < ROUNDS
    ? `t = ${t}   θ${sub(t)},  S${sub(t)},  Δ⁽¹⁾ Δ⁽²⁾ Δ⁽³⁾`
    : `                       θ_T`;
  const sub = (n) => String(n).split('').map((d) => '₀₁₂₃₄₅₆₇₈₉'[+d]).join('');

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;   // the eye
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;   // rounds accumulate
    const g3 = step === 3 ? t : 0;                  // only the transcript is left

    eye.setAttribute('opacity', g1);

    const done = Math.floor(g2 * (ROUNDS + 1));
    nodes.forEach((n) => {
      if (n.link) n.link.setAttribute('opacity', g2 > 0.02 && g2 < 0.999 ? 0.9 : 0.25);
      const dim = 1 - 0.72 * g3;
      n.c.setAttribute('opacity', dim);
      n.lbl.setAttribute('opacity', dim);
      n.dat.setAttribute('opacity', dim);
    });
    server.setAttribute('opacity', 1 - 0.45 * g3);

    const first = Math.max(0, done - rows.length + 1);
    rows.forEach((r, k) => {
      const idx = first + k;
      r.textContent = idx <= done ? line(idx) : '';
      r.setAttribute('opacity', idx === done ? 1 : 0.55);
      r.setAttribute('fill', idx === ROUNDS ? RED : NAVY);
    });
    logTitle.setAttribute('opacity', g2 > 0.02 ? 1 : 0.4);
    vt.textContent = g3 > 0.4 ? 'the transcript 𝒱_T is the whole output' : '';
  }

  const durations = [0, 700, 3200, 900];
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