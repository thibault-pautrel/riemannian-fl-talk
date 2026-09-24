import { makeScene } from './scene.js';
import { makeTicker } from '../anim.js';
import { makeEEG, CHANNELS, GHOST, rdbu, activityAt } from '../data/eeg.js';

const DATA = makeEEG();
const C = DATA.C;

/* ====================================================================
   The head seen from above, with a topographic activity map.

   The map is six radial blobs, one per electrode, coloured by the
   instantaneous amplitude, blurred and clipped to the scalp.
   ==================================================================== */
let HEAD_ID = 0;                    // unique ids, the head is drawn in two figures
const ACTIVITY_BLUE = '#1E64B4';

function drawHead(sc, parent, cx, cy, R, { labels = 'outside' } = {}) {
  const P = (p) => ({ x: cx + R * p[0], y: cy - R * p[1] });
  const skin = '#F7F9FA', edge = '#9AA6B2';

  sc.node(parent, 'path', {
    fill: skin, stroke: edge, 'stroke-width': 1.4,
    d: `M${cx - 0.20 * R} ${cy - 0.96 * R}L${cx} ${cy - 1.26 * R}L${cx + 0.20 * R} ${cy - 0.96 * R}`
  });
  [-1, 1].forEach((s) => sc.node(parent, 'ellipse', {
    cx: cx + s * R, cy, rx: R * 0.06, ry: R * 0.11, fill: skin, stroke: edge, 'stroke-width': 1.2
  }));
  sc.node(parent, 'circle', { cx, cy, r: R, fill: skin, stroke: edge, 'stroke-width': 1.8 });

  // activity map: one blue radial gradient per electrode, clipped to the scalp
  const uid = `head${++HEAD_ID}`;
  const defs = sc.node(parent, 'defs', {});
  const clip = sc.node(defs, 'clipPath', { id: `${uid}-clip` });
  sc.node(clip, 'circle', { cx, cy, r: R - 1 });
  const grad = sc.node(defs, 'radialGradient', { id: `${uid}-grad` });
  sc.node(grad, 'stop', { offset: '0%',   'stop-color': ACTIVITY_BLUE, 'stop-opacity': 0.75 });
  sc.node(grad, 'stop', { offset: '45%',  'stop-color': ACTIVITY_BLUE, 'stop-opacity': 0.35 });
  sc.node(grad, 'stop', { offset: '100%', 'stop-color': ACTIVITY_BLUE, 'stop-opacity': 0 });
  const gMap = sc.node(parent, 'g', { 'clip-path': `url(#${uid}-clip)` });
  const blobs = CHANNELS.map((c) => {
    const q = P(c.pos);
    return sc.node(gMap, 'circle', { cx: q.x, cy: q.y, r: R * 0.4,
                                     fill: `url(#${uid}-grad)`, opacity: 0 });
  });

  GHOST.forEach((p) => {
    const q = P(p);
    sc.node(parent, 'circle', { cx: q.x, cy: q.y, r: R * 0.042,
                                fill: '#DCE3E8', stroke: '#B6C1CA', 'stroke-width': 1 });
  });

  const glow = CHANNELS.map((c) => {
    const q = P(c.pos);
    return sc.node(parent, 'circle', { cx: q.x, cy: q.y, r: R * 0.07,
                                       fill: 'none', stroke: c.color, 'stroke-width': 2, opacity: 0 });
  });
  const dots = CHANNELS.map((c) => {
    const q = P(c.pos);
    return sc.node(parent, 'circle', { cx: q.x, cy: q.y, r: R * 0.068,
                                       fill: c.color, stroke: '#ffffff', 'stroke-width': 2 });
  });

  let names = [];
  if (labels === 'outside') {
    names = CHANNELS.map((c) => {
      const q = P(c.pos), n = Math.hypot(c.pos[0], c.pos[1]) || 1;
      const l = sc.label(`<span style="color:${c.color}">${c.name}</span>`, 'muted');
      l.moveTo(q, 26 * c.pos[0] / n, -26 * c.pos[1] / n - 2);
      return l;
    });
  } else {
    names = CHANNELS.map((c) => {
      const q = P(c.pos);
      const tx = sc.node(parent, 'text', {
        x: q.x, y: q.y + 4, 'text-anchor': 'middle', fill: '#fff',
        'font-size': R * 0.085, 'font-weight': 600, 'font-family': 'var(--mono)'
      });
      tx.textContent = c.name;
      return { show(on) { tx.setAttribute('opacity', on ? 1 : 0); }, node: tx };
    });
  }

  return {
    at: (i) => P(CHANNELS[i].pos),
    // lit: per channel brightness in [0, 1]
    update({ lit = null, emph = null, showNames = true, activity = null } = {}) {
      dots.forEach((d, i) => {
        const on = emph === null || emph.includes(i);
        const a = activity ? activity[i] : 0;
        blobs[i].setAttribute('opacity', a * (on ? 1 : 0.25));
        blobs[i].setAttribute('r', R * (0.30 + 0.22 * a));
        const L = lit ? lit[i] : 1;
        d.setAttribute('opacity', on ? 0.35 + 0.65 * L : 0.3);
        d.setAttribute('r', R * 0.068 * (emph && on ? 1.3 : 1));
        glow[i].setAttribute('opacity', on ? 0.9 * L * (1 - L) * 4 : 0);
        glow[i].setAttribute('r', R * (0.07 + 0.10 * L));
        if (names[i]) names[i].show(showNames && on && L > 0.15);
      });
    }
  };
}

/* ---- a block of six traces ---------------------------------------- */
function drawSignals(sc, parent, box, { separators = false } = {}) {
  const { x, y, w, h } = box;
  const rowH = h / C;

  if (separators) {
    for (let i = 0; i < C; i++) {
      sc.node(parent, 'line', { x1: x, y1: y + i * rowH, x2: x + w, y2: y + i * rowH,
                                stroke: '#E4EAEF', 'stroke-width': 1 });
    }
  }
  const means = CHANNELS.map((c, i) => sc.node(parent, 'line', {
    x1: x, y1: y + rowH * (i + 0.5), x2: x + w, y2: y + rowH * (i + 0.5),
    stroke: '#B2182B', 'stroke-width': 0.9, 'stroke-dasharray': '2 4', opacity: 0
  }));
  const paths = CHANNELS.map((c) => sc.node(parent, 'path', {
    fill: 'none', stroke: c.color, 'stroke-width': 1.5, 'stroke-linejoin': 'round'
  }));
  const names = CHANNELS.map((c, i) => {
    const l = sc.label(`<span style="color:${c.color}">${c.name}</span>`, 'muted');
    l.moveTo({ x: x - 24, y: y + rowH * (i + 0.5) });
    return l;
  });
  const cursor = sc.node(parent, 'line', {
    y1: y, y2: y + h, stroke: '#B2182B', 'stroke-width': 1.8, 'stroke-opacity': .55, opacity: 0
  });

  // per channel progress in `grow`, 1 means fully drawn
  function update({ grow = null, centred = 1, emph = null, cursorFrac = null } = {}) {
    CHANNELS.forEach((c, i) => {
      const g = grow ? grow[i] : 1;
      const base = y + rowH * (i + 0.5), amp = rowH * 0.38;
      const n = Math.max(2, Math.round(DATA.T * g));
      let d = '';
      for (let t = 0; t < n; t++) {
        const val = DATA.Xc[i][t] + (1 - centred) * DATA.mean[i];
        d += (t ? 'L' : 'M') + (x + w * t / (DATA.T - 1)).toFixed(1) + ' ' +
             (base - amp * val / 3.2).toFixed(1);
      }
      paths[i].setAttribute('d', d);
      paths[i].setAttribute('opacity', g > 0.004 ? 1 : 0);
      const on = emph === null || emph.includes(i);
      paths[i].setAttribute('stroke-opacity', on ? 1 : 0.16);
      paths[i].setAttribute('stroke-width', emph && on ? 2.4 : 1.5);
      names[i].node.style.opacity = g > 0.1 ? (on ? 1 : 0.28) : 0;
      means[i].setAttribute('opacity', centred < 0.98 && centred > 0.02 ? 0.55 : 0);
    });
    if (cursorFrac === null) cursor.setAttribute('opacity', 0);
    else {
      const px = x + w * cursorFrac;
      cursor.setAttribute('x1', px); cursor.setAttribute('x2', px);
      cursor.setAttribute('opacity', 1);
    }
  }
  return { update, rowH };
}

/* ====================================================================
   Figure 1: electrodes to signals
   ==================================================================== */
export function eegHead(el) {
  const sc = makeScene(el, { width: 1100, height: 520 });
  const ticker = makeTicker();

  const gHead = sc.g(), gSig = sc.g();
  const head = drawHead(sc, gHead, 235, 268, 158);
  const sig = drawSignals(sc, gSig, { x: 610, y: 86, w: 410, h: 340 });

  const link = sc.node(sc.svg, 'path', {
    fill: 'none', stroke: '#707F8F', 'stroke-width': 1.6,
    'marker-end': sc.arrow('slate'), opacity: 0, d: 'M425 268L555 268'
  });
  const labTrial = sc.label('$X\\in\\mathbb{R}^{C\\times T}$');
  labTrial.moveTo({ x: 815, y: 48 });
  const labFront = sc.label('front', 'muted');
  labFront.moveTo({ x: 235, y: 76 });
  const labTime = sc.label('time', 'muted');
  labTime.moveTo({ x: 815, y: 462 });

  let step = 0, lastT = 1, picked = null;

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;
    const emph = picked === null ? null : [picked];

    // each channel lights up exactly while its own trace is being drawn
    const grow = CHANNELS.map((c, i) => {
      const start = i * 0.11, span = 0.42;
      return Math.max(0, Math.min(1, (g2 - start) / span));
    });
    // activity under each electrode, read where its trace has reached
    const lit = g2 > 0.01 ? grow : CHANNELS.map(() => g1);
    const activity = lit.map((L, i) => {
      const frac = g2 > 0.01 ? grow[i] : 0.5;
      const amp = Math.min(1, Math.abs(activityAt(DATA, frac)[i]));
      return L * (0.35 + 0.65 * amp);
    });
    head.update({ lit, emph, activity });
    labFront.show(true);
    link.setAttribute('opacity', g2 > 0.03 ? 1 : 0);
    sig.update({ grow: g2 > 0.01 ? grow : CHANNELS.map(() => 0), emph });
    labTrial.show(g2 > 0.9);
    labTime.show(g2 > 0.9);
  }

  CHANNELS.forEach((c, i) => {
    const q = head.at(i);
    const hit = sc.node(sc.svg, 'circle', { cx: q.x, cy: q.y, r: 20, fill: 'transparent', cursor: 'pointer' });
    hit.addEventListener('click', () => { picked = picked === i ? null : i; render(); });
  });

  sc.tool('all channels', () => { picked = null; render(); });

  const durations = [0, 600, 2400];
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

/* ====================================================================
   Figure 2: signals to covariance, three panels
   ==================================================================== */
export function eegCov(el) {
  const sc = makeScene(el, { width: 1180, height: 480 });
  const ticker = makeTicker();

  const gSig = sc.g(), gHead = sc.g(), gMat = sc.g();
  const BOX = { x: 62, y: 34, w: 400, h: 288 };
  const sig = drawSignals(sc, gSig, BOX, { separators: true });
  const head = drawHead(sc, gHead, 660, 186, 132, { labels: 'inside' });

  // the pair, drawn on the scalp
  const conn = sc.node(gHead, 'line', {
    'stroke-width': 3.4, 'stroke-linecap': 'round', opacity: 0
  });
  const allConn = [];
  for (let i = 0; i < C; i++) {
    for (let j = i + 1; j < C; j++) {
      const a = head.at(i), b = head.at(j);
      allConn.push({ i, j, node: sc.node(gHead, 'line', {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'stroke-linecap': 'round', opacity: 0 }) });
    }
  }
  gHead.insertBefore(conn, gHead.firstChild);

  // the matrix
  const CELL = 44, MX = 866, MY = 66;
  const cells = [];
  let pair = [2, 3];
  for (let i = 0; i < C; i++) {
    cells.push([]);
    for (let j = 0; j < C; j++) {
      const r = sc.node(gMat, 'rect', {
        x: MX + j * CELL, y: MY + i * CELL, width: CELL, height: CELL,
        fill: rdbu(DATA.corr[i][j]), stroke: '#ffffff', 'stroke-width': 1, cursor: 'pointer'
      });
      r.addEventListener('click', () => { pair = [i, j]; render(); });
      cells[i].push(r);
    }
  }
  sc.node(gMat, 'rect', { x: MX, y: MY, width: CELL * C, height: CELL * C,
                          fill: 'none', stroke: '#707F8F', 'stroke-width': 1.6 });
  CHANNELS.forEach((c, i) => {
    sc.node(gMat, 'rect', { x: MX - 12, y: MY + i * CELL + 13, width: 7, height: 18, fill: c.color });
    sc.node(gMat, 'rect', { x: MX + i * CELL + 13, y: MY - 12, width: 18, height: 7, fill: c.color });
  });
  const ring  = sc.node(gMat, 'rect', { fill: 'none', stroke: '#243B54', 'stroke-width': 3,
                                        width: CELL, height: CELL, opacity: 0 });
  const ringT = sc.node(gMat, 'rect', { fill: 'none', stroke: '#243B54', 'stroke-width': 3,
                                        'stroke-opacity': .4, width: CELL, height: CELL, opacity: 0 });

  const labSig  = sc.label('$C$ channels, $T$ samples', 'muted');
  labSig.moveTo({ x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h + 26 });
  const labRun  = sc.label('', 'muted');
  const labMat  = sc.label('$\\Sigma=\\tfrac{1}{T-1}\\bar X\\bar X^{\\top}$');
  labMat.moveTo({ x: MX + CELL * C / 2, y: MY + CELL * C + 34 });
  const labCentre = sc.label('remove the mean of each channel', 'muted');
  labCentre.moveTo({ x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h + 26 });
  const labHead = sc.label('', 'muted');
  labHead.moveTo({ x: 660, y: 352 });

  let step = 0, lastT = 1;

  function render(t = lastT) {
    lastT = t;
    const g1 = step > 1 ? 1 : step === 1 ? t : 0;   // centring
    const g2 = step > 2 ? 1 : step === 2 ? t : 0;   // one pair, cursor sweep
    const g3 = step > 3 ? 1 : step === 3 ? t : 0;   // the full matrix
    const g4 = step === 4 ? t : 0;                  // all connections

    const [i, j] = pair;
    const active = g2 > 0.02 && g4 < 0.02;
    const emph = active ? [i, j] : null;

    sig.update({
      centred: step === 1 ? 1 - 0.85 * (1 - g1) : 1,
      emph,
      cursorFrac: active && g2 < 0.995 ? g2 : null
    });
    labSig.show(g1 < 0.05);
    labCentre.show(step === 1);

    // running value of the entry
    if (active) {
      labRun.node.innerHTML =
        `<span style="color:${CHANNELS[i].color}">${CHANNELS[i].name}</span> &times; ` +
        `<span style="color:${CHANNELS[j].color}">${CHANNELS[j].name}</span> &nbsp; ` +
        `&Sigma;<sub>${i + 1}${j + 1}</sub> = ${DATA.partial(i, j, Math.max(0.02, g2)).toFixed(2)}`;
      labRun.moveTo({ x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h + 26 });
      labRun.show(true);
    } else labRun.show(false);

    // the connection on the scalp
    const absMax = Math.max(...DATA.S.flat().map(Math.abs));
    if (active) {
      const a = head.at(i), b = head.at(j);
      const val = DATA.S[i][j];
      conn.setAttribute('x1', a.x); conn.setAttribute('y1', a.y);
      conn.setAttribute('x2', a.x + (b.x - a.x) * g2); conn.setAttribute('y2', a.y + (b.y - a.y) * g2);
      conn.setAttribute('stroke', val < 0 ? '#2166AC' : '#B2182B');
      conn.setAttribute('opacity', Math.min(1, 0.35 + Math.abs(val) / absMax));
      labHead.node.innerHTML = 'one entry, one connection';
      labHead.show(g2 > 0.9);
    } else {
      conn.setAttribute('opacity', 0);
      labHead.show(g4 > 0.5);
      if (g4 > 0.5) labHead.node.innerHTML = 'the matrix is the whole connection pattern';
    }

    allConn.forEach((c, k) => {
      const val = DATA.S[c.i][c.j];
      const on = Math.max(0, Math.min(1, g4 * 2 - k / allConn.length));
      c.node.setAttribute('stroke', val < 0 ? '#2166AC' : '#B2182B');
      c.node.setAttribute('stroke-width', 1 + 3.4 * Math.abs(val) / absMax);
      c.node.setAttribute('opacity', on * Math.min(1, 0.3 + Math.abs(val) / absMax));
    });

    head.update({ emph, showNames: true });

    // the matrix
    for (let a = 0; a < C; a++) {
      for (let b = 0; b < C; b++) {
        const isPair = (a === i && b === j) || (a === j && b === i);
        const on = g3 > 0.01 ? Math.min(1, g3 * 3 - (a + b) * 0.1)
                             : (isPair && g2 > 0.9 ? 1 : 0);
        cells[a][b].setAttribute('opacity', Math.max(0, Math.min(1, on)));
      }
    }
    const place = (node, a, b, on) => {
      node.setAttribute('x', MX + b * CELL); node.setAttribute('y', MY + a * CELL);
      node.setAttribute('opacity', on ? 1 : 0);
    };
    place(ring,  i, j, active && g2 > 0.9);
    place(ringT, j, i, active && g2 > 0.9);
    labMat.show(g3 > 0.85);
  }

  sc.tool('reset', () => { pair = [2, 3]; render(); });

  const durations = [0, 900, 2600, 1000, 1200];
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