import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';

/* One communication round, following FL_schema.tex.
   Five clients, three selected. Steps: broadcast, local optimisation,
   upload, aggregation. Steps 2 and 4 are the ones that matter, so the
   rest of the picture dims while they play. */

const CW = 640, CH = 560;
const CX = 320, CY = 285, R = 215, CR = 52;
const SW = 200, SH = 84;

const NAVY = '#243B54', SLATE = '#8A9AA8';
const SRV = '#0072B2', SRV_T = '#E7F1F9';
const ACT = '#E69F00', ACT_T = '#FCF2DF';
const DOWN = '#009E73', UP = '#B2182B';

const CLIENTS = [
  { a:  90, id: 1, active: true  },
  { a: 210, id: 2, active: true  },
  { a: 330, id: 3, active: true  },
  { a: 150, id: 4, active: false },
  { a:  30, id: 5, active: false }
];

const rad = (d) => d * Math.PI / 180;
const at = (a) => ({ x: CX + R * Math.cos(rad(a)), y: CY - R * Math.sin(rad(a)) });

// where a ray leaving the server crosses its box
function serverExit(dir) {
  const hw = SW / 2, hh = SH / 2;
  const t = Math.min(Math.abs(hw / (dir.x || 1e-6)), Math.abs(hh / (dir.y || 1e-6)));
  return { x: CX + dir.x * (t + 9), y: CY + dir.y * (t + 9) };
}

const lerp = (A, B, t) => ({ x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t });
const bez = (P0, C, P1, t) => ({
  x: (1 - t) ** 2 * P0.x + 2 * (1 - t) * t * C.x + t * t * P1.x,
  y: (1 - t) ** 2 * P0.y + 2 * (1 - t) * t * C.y + t * t * P1.y
});
// the piece of the curve between 0 and t, by subdivision
const bezPart = (P0, C, P1, t) => {
  const L = lerp(P0, C, t), E = bez(P0, C, P1, t);
  return `M${P0.x.toFixed(1)} ${P0.y.toFixed(1)}Q${L.x.toFixed(1)} ${L.y.toFixed(1)} ` +
         `${E.x.toFixed(1)} ${E.y.toFixed(1)}`;
};

function ringPath(cx, cy, r, frac) {
  if (frac <= 0.001) return '';
  const f = Math.min(0.9999, frac);
  const a0 = -Math.PI / 2, a1 = a0 + 2 * Math.PI * f;
  return `M${(cx + r * Math.cos(a0)).toFixed(1)} ${(cy + r * Math.sin(a0)).toFixed(1)}` +
         `A${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ` +
         `${(cx + r * Math.cos(a1)).toFixed(1)} ${(cy + r * Math.sin(a1)).toFixed(1)}`;
}

function build(el, STATIC = false) {
  const sc = makeScene(el, { width: CW, height: CH });
  const ticker = makeTicker();

  const gLink = sc.g(), gNode = sc.g(), gTok = sc.g();

  // ---- server
  const halo = sc.node(gNode, 'rect', {
    x: CX - SW / 2 - 12, y: CY - SH / 2 - 12, width: SW + 24, height: SH + 24, rx: 14,
    fill: 'none', stroke: SRV, 'stroke-width': 3, opacity: 0
  });
  const server = sc.node(gNode, 'rect', {
    x: CX - SW / 2, y: CY - SH / 2, width: SW, height: SH, rx: 8,
    fill: SRV_T, stroke: SRV, 'stroke-width': 2
  });
  const labServer = sc.label('<strong>Server</strong>');
  labServer.moveTo({ x: CX, y: CY - 14 }); labServer.show(true);
  const labTheta = sc.label('$\\theta_t$', 'muted');
  labTheta.moveTo({ x: CX, y: CY + 16 }); labTheta.show(true);

  // ---- clients
  const nodes = CLIENTS.map((c) => {
    const p = at(c.a);
    const dir = { x: (p.x - CX) / R, y: (p.y - CY) / R };
    const circle = sc.node(gNode, 'circle', {
      cx: p.x, cy: p.y, r: CR,
      fill: c.active ? ACT_T : '#F5F7F8',
      stroke: c.active ? ACT : SLATE, 'stroke-width': c.active ? 2 : 1.4,
      'stroke-dasharray': c.active ? 'none' : '6 5'
    });
    const ring = sc.node(gNode, 'path', {
      fill: 'none', stroke: ACT, 'stroke-width': 3.4, 'stroke-linecap': 'round', opacity: 0
    });
    const name = sc.label(`<strong>Cl. ${c.id}</strong>`);
    name.moveTo({ x: p.x, y: p.y - 12 }); name.show(true);
    const data = sc.label(`$\\mathcal{D}^{(${c.id})}$`, 'muted');
    data.moveTo({ x: p.x, y: p.y + 15 }); data.show(true);
    if (!c.active) { name.node.style.color = SLATE; data.node.style.color = SLATE; }

    // the two curved links, only for selected clients
    let down = null, up = null;
    if (c.active) {
      const n = { x: -dir.y, y: dir.x };                 // perpendicular
      const S = serverExit(dir);
      const Cc = { x: p.x - dir.x * (CR + 9), y: p.y - dir.y * (CR + 9) };
      const mk = (sgn, color) => {
        const P0 = { x: S.x + n.x * 11 * sgn, y: S.y + n.y * 11 * sgn };
        const P1 = { x: Cc.x + n.x * 11 * sgn, y: Cc.y + n.y * 11 * sgn };
        const M = lerp(P0, P1, 0.5);
        const Ctl = { x: M.x + n.x * 26 * sgn, y: M.y + n.y * 26 * sgn };
        const path = sc.node(gLink, 'path', {
          fill: 'none', stroke: color, 'stroke-width': 2.2, opacity: 0,
          'marker-end': sc.arrow(color === DOWN ? 'down' : 'up')
        });
        return { path, P0, Ctl, P1 };
      };
      down = mk( 1, DOWN);
      up   = mk(-1, UP);
      up.P0 = { x: Cc.x - n.x * 11, y: Cc.y - n.y * 11 };  // upload runs the other way
      up.P1 = { x: S.x - n.x * 11, y: S.y - n.y * 11 };
      const M = lerp(up.P0, up.P1, 0.5);
      up.Ctl = { x: M.x - n.x * 26, y: M.y - n.y * 26 };
    }
    return { c, p, circle, ring, name, data, down, up };
  });

  // arrow heads in the two transfer colours
  const defs = sc.node(sc.svg, 'defs');
  [['down', DOWN], ['up', UP]].forEach(([n, col]) => {
    const m = sc.node(defs, 'marker', {
      id: `${sc.uid}-${n}`, viewBox: '0 0 10 10', refX: 9, refY: 5,
      markerWidth: 5.5, markerHeight: 5.5, orient: 'auto-start-reverse'
    });
    sc.node(m, 'path', { d: 'M0 0 L10 5 L0 10 z', fill: col });
  });

  const tokens = nodes.filter((n) => n.c.active).map(() =>
    sc.node(gTok, 'circle', { r: 7, fill: '#fff', stroke: NAVY, 'stroke-width': 2, opacity: 0 }));

  const labDown = sc.label('$\\theta_t$', 'muted');
  const labUp   = sc.label('$\\theta_t^{(i)}$', 'muted');
  const badge   = sc.label('', '');

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    let g1 = step > 1 ? 1 : step === 1 ? t : 0;
    let g2 = step > 2 ? 1 : step === 2 ? t : 0;
    let g3 = step > 3 ? 1 : step === 3 ? t : 0;
    let g4 = step === 4 ? t : 0;
    if (STATIC) { g1 = 1; g2 = 1; g3 = 1; g4 = 0; }

    // the two key steps dim the rest of the picture
    const dimServer = !STATIC && step === 2 ? 0.4 : 1;
    const dimClient = !STATIC && step === 4 ? 0.42 : 1;
    server.setAttribute('opacity', dimServer);
    labServer.node.style.opacity = dimServer;
    labTheta.node.style.opacity = dimServer;

    let k = 0;
    nodes.forEach((n) => {
      const o = n.c.active ? dimClient : Math.min(dimClient, 0.75);
      n.circle.setAttribute('opacity', o);
      n.name.node.style.opacity = o;
      n.data.node.style.opacity = o;
      if (!n.c.active) return;

      // broadcast
      n.down.path.setAttribute('d', g1 > 0.004 ? bezPart(n.down.P0, n.down.Ctl, n.down.P1, g1) : '');
      n.down.path.setAttribute('opacity', g1 > 0.004 ? dimClient : 0);

      // local optimisation, a ring filling around the client
      n.ring.setAttribute('d', ringPath(n.p.x, n.p.y, CR + 9, g2));
      n.ring.setAttribute('opacity', g2 > 0.004 ? 1 : 0);

      // upload
      n.up.path.setAttribute('d', g3 > 0.004 ? bezPart(n.up.P0, n.up.Ctl, n.up.P1, g3) : '');
      n.up.path.setAttribute('opacity', g3 > 0.004 ? 1 : 0);

      // the travelling parameter
      const tok = tokens[k++];
      if (step === 1 && g1 < 0.999) {
        const q = bez(n.down.P0, n.down.Ctl, n.down.P1, g1);
        tok.setAttribute('cx', q.x); tok.setAttribute('cy', q.y);
        tok.setAttribute('stroke', DOWN); tok.setAttribute('opacity', 1);
      } else if (step === 3 && g3 < 0.999) {
        const q = bez(n.up.P0, n.up.Ctl, n.up.P1, g3);
        tok.setAttribute('cx', q.x); tok.setAttribute('cy', q.y);
        tok.setAttribute('stroke', UP); tok.setAttribute('opacity', 1);
      } else tok.setAttribute('opacity', 0);
    });

    const top = nodes[0];
    labDown.moveTo(bez(top.down.P0, top.down.Ctl, top.down.P1, 0.5), -30, 0);
    labDown.show(g1 > 0.6 && step < 3);
    labUp.moveTo(bez(top.up.P0, top.up.Ctl, top.up.P1, 0.5), 34, 0);
    labUp.show(g3 > 0.6);

    // aggregation
    halo.setAttribute('opacity', g4 > 0.02 ? 0.35 + 0.45 * g4 : 0);
      const want = g4 > 0.5 ? '\\(\\theta_{t+1}\\)' : '\\(\\theta_t\\)';
    if (labTheta.node.dataset.tex !== want) {
      labTheta.node.dataset.tex = want;
      labTheta.node.innerHTML = want;
      window.renderFigureMath?.(labTheta.node);
    }

    if (step === 2)      { badge.node.innerHTML = '<strong>local optimisation</strong>'; badge.node.style.color = ACT; }
    else if (step === 4) { badge.node.innerHTML = '<strong>aggregation</strong>';        badge.node.style.color = SRV; }
    badge.moveTo({ x: CX, y: CH - 26 });
    badge.show(step === 2 || step === 4);
  }

  const durations = [0, 1400, 1800, 1400, 900];
  render(1);

  return {
    setStep(n) {
      if (STATIC || n === step) return;
      const back = n < step;
      step = n;
      ticker.run(back ? 0 : durations[n] ?? 600, render, { instant: back });
    },
    activate() {}, deactivate() { ticker.stop(); }
  };
}

export default (el) => build(el, false);
export const fedRoundStatic = (el) => build(el, true);