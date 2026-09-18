const factories = new Map();
const instances = new WeakMap();

export function register(name, factory) {
  factories.set(name, factory);
}

// build every figure found in the document, once
export function mountAll(root = document) {
  root.querySelectorAll('[data-figure]').forEach((el) => {
    if (instances.has(el)) return;
    const make = factories.get(el.dataset.figure);
    if (!make) { console.warn('unknown figure:', el.dataset.figure); return; }
    try {
      instances.set(el, make(el));
    } catch (err) {
      console.error('figure failed:', el.dataset.figure, err);
    }
  });
}

export function figuresIn(slide) {
  if (!slide) return [];
  return [...slide.querySelectorAll('[data-figure]')]
    .map((el) => instances.get(el))
    .filter(Boolean);
}