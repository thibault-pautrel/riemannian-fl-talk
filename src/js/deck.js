import Reveal from 'reveal.js';
import Notes from 'reveal.js/plugin/notes/notes.esm.js';
import renderMathInElement from 'katex/dist/contrib/auto-render.mjs';

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
});

// handy while building
window.deck = deck;