import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { viteSingleFile } from 'vite-plugin-singlefile';

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
      if (file.includes('/src/slides/') || file.includes('/src/slides-bilan/')) {
        server.hot.send({ type: 'full-reload' });
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const single = mode === 'single';

  return {
    plugins: [includePartials(), ...(single ? [viteSingleFile()] : [])],
    build: {
      outDir: single ? 'dist-single' : 'dist',
      assetsInlineLimit: single ? Number.MAX_SAFE_INTEGER : 4096,
      cssCodeSplit: !single,
      rollupOptions: single
        ? { input: 'index.html', output: { inlineDynamicImports: true } }
        : { input: { main: 'index.html', bilan: 'bilan.html' } }
    }
  };
});