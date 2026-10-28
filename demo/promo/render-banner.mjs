// Renders banner.html (the Business-plan banner collage) to public/business-ad.mp4 (6 s loop, 1600x800, no audio) and a poster.
//   node demo/promo/render-banner.mjs [--stills 0.5,2.5]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const pub = path.resolve(root, '../public');
const args = process.argv.slice(2);
const stills = args.includes('--stills') ? args[args.indexOf('--stills') + 1].split(',').map(Number) : null;
const FPS = 30, LOOP = 6;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 800, height: 400 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => { console.error('page error:', e.message); process.exitCode = 1; });
await page.goto(`http://127.0.0.1:${server.address().port}/promo/banner.html`);
await page.evaluate(() => window.ready);

if (stills) {
  for (const t of stills) { await page.evaluate((t) => window.render(t), t); await page.screenshot({ path: path.join(here, `banner-still-${t}.png`) }); }
} else {
  const out = path.join(pub, 'business-ad.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow', '-an', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < FPS * LOOP; i++) {
    await page.evaluate((t) => window.render(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 94 });
    if (i === 75) fs.writeFileSync(path.join(pub, 'business-ad-poster.jpg'), buf);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(out);
}
await browser.close();
server.close();
