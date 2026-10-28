// Renders promo.html to an MP4: steps window.render(t) at 60 fps (1920x1080) and pipes screenshots into ffmpeg.
//   node demo/promo/render.mjs [--out file.mp4] [--stills 1,5,9.5]
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const V = process.argv.includes('--v') ? process.argv[process.argv.indexOf('--v') + 1] : '3';   // --v 4 renders the 20 s hard-cut ad
const v4 = V === '4';
await import(v4 ? './timeline4.js' : './timeline.js');
const P = v4 ? globalThis.PROMO4 : globalThis.PROMO;

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => { const k = process.argv.indexOf(`--${name}`); return k > 0 ? process.argv[k + 1] : fallback; };
const stills = arg('stills', null)?.split(',').map(Number);
const out = path.resolve(arg('out', path.join(here, v4 ? 'openframe-promo-v4.mp4' : 'openframe-promo.mp4')));

// Serve demo/ over HTTP: the three.js scenes are ES modules, which browsers will not load from file://.
const root = path.resolve(here, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
page.on('pageerror', (e) => { console.error('page error:', e.message); process.exitCode = 1; });
page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
await page.goto(`${origin}/promo/${v4 ? 'promo4' : 'promo'}.html`);
await page.evaluate(() => window.ready);

if (stills) {
  for (const t of stills) {
    await page.evaluate((t) => window.render(t), t);
    await page.screenshot({ path: path.join(here, `still-${t}.png`) });
  }
} else {
  // Sound: synthesize sfx.wav, then level it for social (-16 LUFS, -1.5 dBTP).
  const audio = path.join(here, v4 ? 'sfx4-norm.wav' : 'sfx-norm.wav');
  spawnSync(process.execPath, [path.join(here, v4 ? 'sfx4.mjs' : 'sfx.mjs')], { stdio: 'inherit' });
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(here, v4 ? 'sfx4.wav' : 'sfx.wav'), '-af', v4 ? 'highpass=f=32,equalizer=f=45:t=q:w=1:g=-4,equalizer=f=450:t=q:w=0.8:g=3,equalizer=f=2200:t=q:w=0.8:g=4,loudnorm=I=-14:TP=-1:LRA=11' : 'loudnorm=I=-16:TP=-1.5:LRA=14', '-ar', '48000', audio], { stdio: 'inherit' });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(P.fps), '-i', '-', '-i', audio,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium', '-c:a', 'aac', '-b:a', '192k', '-shortest',
    '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(P.duration * P.fps);
  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.render(t), i / P.fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 180 === 0) console.log(`${((i / total) * 100).toFixed(0)}%`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(out);
}
await browser.close();
server.close();
