/* A footer telling where we are: section name, progress across sections, and
   position inside the current section.

   Sections are detected from the divider slides: any slide whose .kicker reads
   "Section <n>" opens a new section, and its <h1> gives the name. Nothing to
   annotate in the slide files. */

export function mountFooter(deck) {
  const slides = Array.from(document.querySelectorAll('.reveal .slides > section'));

  // sections[]: { name, slides: [indices] }, and owner[i] = section index
  const sections = [];
  const owner = new Array(slides.length).fill(-1);

  slides.forEach((s, i) => {
    const kicker = s.querySelector('.kicker');
    const isDivider = kicker && /^\s*section\b/i.test(kicker.textContent);
    if (isDivider) {
      const h1 = s.querySelector('h1');
      sections.push({
        name: (h1 ? h1.textContent : kicker.textContent).replace(/\s+/g, ' ').trim(),
        slides: []
      });
    }
    if (sections.length) {
      owner[i] = sections.length - 1;
      sections.at(-1).slides.push(i);
    }
  });

  if (!sections.length) return;

  const bar = document.createElement('div');
  bar.className = 'deck-footer';
  const sec = document.createElement('span');
  sec.className = 'sec';
  const pills = document.createElement('span');
  pills.className = 'pills';
  sections.forEach(() => {
    const p = document.createElement('span');
    p.className = 'pill';
    pills.appendChild(p);
  });
  const pos = document.createElement('span');
  pos.className = 'pos';
  bar.append(sec, pills, pos);
  document.querySelector('.reveal').appendChild(bar);

  function update() {
    const slide = deck.getCurrentSlide();
    const i = slides.indexOf(slide);
    const k = owner[i];

    // title slides and dividers carry no footer
    const hide = k < 0 || slide.classList.contains('on-navy');
    bar.classList.toggle('hidden', hide);
    if (hide) return;

    sec.textContent = `${k + 1} · ${sections[k].name}`;
    Array.from(pills.children).forEach((p, j) => {
      p.className = 'pill' + (j < k ? ' done' : j === k ? ' on' : '');
    });

    const inside = sections[k].slides.filter((j) => !slides[j].classList.contains('on-navy'));
    pos.textContent = `${inside.indexOf(i) + 1} / ${inside.length}`;
  }

  deck.on('ready', update);
  deck.on('slidechanged', update);
  update();
}
