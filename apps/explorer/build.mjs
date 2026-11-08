// Bundles the explorer's page into dist/: app.js, app.css and index.html. dossier explore --install
// runs it in a copy of this folder, under the dossiers root, after npm ci.
import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(here, 'dist'), { recursive: true });
await build({
  entryPoints: [join(here, 'src/main.jsx')],
  bundle: true,
  outfile: join(here, 'dist/app.js'),
  format: 'esm',
  jsx: 'automatic',
  minify: true,
  target: 'es2022',
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none',
  logLevel: 'warning',
});
copyFileSync(join(here, 'src/index.html'), join(here, 'dist/index.html'));
console.log('built', join(here, 'dist'));
