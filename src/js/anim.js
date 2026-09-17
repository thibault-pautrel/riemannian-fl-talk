const easeOut = (p) => 1 - Math.pow(1 - p, 3);

export function makeTicker() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = null;

  function stop() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }

  // calls onFrame(progress) with progress going from 0 to 1
  function run(ms, onFrame, { instant = false } = {}) {
    stop();
    if (reduced || instant || ms <= 0) { onFrame(1); return; }
    const t0 = performance.now();
    const loop = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      onFrame(easeOut(p));
      raf = p < 1 ? requestAnimationFrame(loop) : null;
    };
    raf = requestAnimationFrame(loop);
  }

  return { run, stop };
}