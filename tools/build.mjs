// Bundles the game into one self-contained file: dist/index.html
import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const out = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', target: 'es2019', write: false });
const js = out.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const html = (await readFile('index.html', 'utf8')).replace('<script type="module" src="src/main.js"></script>', () => `<script>${js}</script>`);
await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', html);
console.log(`dist/index.html  ${(html.length / 1024).toFixed(0)} KB`);

// A body-only variant for hosts that supply their own document skeleton.
const frag = `<title>Cherry Djinn</title>
<style>
  :root { --bg: #120e2c; --sat: env(safe-area-inset-top, 0px); --sab: env(safe-area-inset-bottom, 0px); color-scheme: dark; }
  html, body { margin: 0; height: 100%; background: var(--bg); overflow: hidden; overscroll-behavior: none; }
  #game { position: fixed; inset: 0; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
</style>
<div id="game"></div>
<script>${js}</script>
`;
await writeFile('dist/cherry-djinn.html', frag);
