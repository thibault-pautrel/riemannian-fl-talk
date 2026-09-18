import Reveal from 'reveal.js';
import Notes from 'reveal.js/plugin/notes/notes.esm.js';
import renderMathInElement from 'katex/dist/contrib/auto-render.mjs';

import { register, mountAll, figuresIn } from './figures/registry.js';
import titleManifold from './figures/title-manifold.js';
import expMap from './figures/exp-map.js';
import tangentSpace from './figures/tangent-space.js';
import metric from './figures/metric.js';
import geodesicFig from './figures/geodesic-fig.js';
import logMap from './figures/log-map.js';
import manifoldCharts from './figures/manifold-charts.js';
import { eegHead, eegCov } from './figures/eeg-pipeline.js';
import spdCone from './figures/spd-cone.js';
import sites from './figures/sites.js';
import spdnetArch from './figures/spdnet-arch.js';
import fedRound, { fedRoundStatic } from './figures/fed-round.js';
import localOpt from './figures/local-opt.js';
import { aggExisting, aggProposed } from './figures/aggregation.js';
import reconstruction from './figures/reconstruction.js';
import threatModel from './figures/threat-model.js';
import adjacency from './figures/adjacency.js';
import clipNoise from './figures/clip-noise.js';
import tradeoff from './figures/tradeoff.js';

import '@fontsource-variable/inter';
import 'reveal.js/dist/reveal.css';
import 'katex/dist/katex.min.css';
import '../css/theme.css';

// LaTeX macros, mirroring the ones in main.tex
const macros = {
  '\\R': '\\mathbb{R}',
  '\\E': '\\mathbb{E}',
  '\\M': '\\mathcal{M}',
  '\\SPD': '\\mathcal{S}^{++}',
  '\\St': '\\mathrm{St}',
  '\\grad': '\\operatorname{grad}',
  '\\Tp': 'T_{p}\\mathcal{M}',
  '\\ip': '\\langle #1,#2 \\rangle'
};

const deck = new Reveal({
  width: 1600,
  height: 900,
  margin: 0.04,
  minScale: 0.2,
  maxScale: 2.0,
  center: false,          // slides start at the top, like beamer frames
  hash: true,
  slideNumber: 'c/t',
  transition: 'fade',
  transitionSpeed: 'fast',
  plugins: [Notes]
});

register('title-manifold', titleManifold);
register('exp-map', expMap);
register('tangent-space', tangentSpace);
register('metric', metric);
register('geodesic', geodesicFig);
register('log-map', logMap);
register('manifold-charts', manifoldCharts);
register('eeg-head', eegHead);
register('eeg-cov', eegCov);
register('spd-cone', spdCone);
register('sites', sites);
register('spdnet-arch', spdnetArch);
register('fed-round', fedRound);
register('fed-round-static', fedRoundStatic);
register('local-opt', localOpt);
register('agg-existing', aggExisting);
register('agg-proposed', aggProposed);
register('reconstruction', reconstruction);
register('threat-model', threatModel);
register('adjacency', adjacency);
register('clip-noise', clipNoise);
register('tradeoff', tradeoff);

// a figure step is the largest data-fig-step among the visible fragments
function stepOf(slide) {
  let step = 0;
  slide.querySelectorAll('[data-fig-step]').forEach((f) => {
    if (f.classList.contains('visible')) step = Math.max(step, +f.dataset.figStep);
  });
  return step;
}

function sync(slide) {
  if (!slide) return;
  const step = stepOf(slide);
  document.querySelectorAll('.reveal section').forEach((s) => {
    figuresIn(s).forEach((fig) => (s === slide ? fig.activate() : fig.deactivate()));
  });
  figuresIn(slide).forEach((fig) => fig.setStep(step));
}

deck.on('ready', (e) => sync(e.currentSlide));
deck.on('slidechanged', (e) => sync(e.currentSlide));
deck.on('fragmentshown', () => sync(deck.getCurrentSlide()));
deck.on('fragmenthidden', () => sync(deck.getCurrentSlide()));

// some figures rewrite a label in TeX while they animate
window.renderFigureMath = (node) => renderMathInElement(node, {
  delimiters: [
    { left: '$$', right: '$$', display: true },
    { left: '\\(', right: '\\)', display: false },
    { left: '$', right: '$', display: false }
  ],
  macros, throwOnError: false
});

deck.initialize().then(() => {
  renderMathInElement(document.querySelector('.reveal .slides'), {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\[', right: '\\]', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\(', right: '\\)', display: false }
    ],
    macros,
    throwOnError: false
  });

  mountAll();
  sync(deck.getCurrentSlide());
});

// handy while building
window.deck = deck;