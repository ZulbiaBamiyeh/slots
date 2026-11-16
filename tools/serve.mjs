// Tiny static dev server: `npm run dev` then open http://localhost:5173
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const root = process.cwd(), port = +process.env.PORT || 5173;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
createServer(async (req, res) => {
  try {
    let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (p.endsWith('/') || p === '\\') p += 'index.html';
    const f = join(root, p);
    if (!f.startsWith(root)) throw new Error('nope');
    res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(await readFile(f));
  } catch (e) { res.writeHead(404); res.end('not found'); }
}).listen(port, () => console.log(`Cherry Djinn dev server: http://localhost:${port}`));
