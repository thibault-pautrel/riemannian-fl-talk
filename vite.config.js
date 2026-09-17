import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

function includePartials() {
  const expand = (html, base) =>
    html.replace(/<!--\s*@include\s+(\S+)\s*-->/g, (_, file) => {
      const p = resolve(base, file);
      return expand(readFileSync(p, 'utf8'), dirname(p));
    });

  return {
    name: 'include-partials',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => expand(html, process.cwd())
    },
    handleHotUpdate({ file, server }) {
      if (file.includes('/src/slides/')) {
        server.hot.send({ type: 'full-reload' });
      }
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [includePartials()]
});