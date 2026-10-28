// Installs the generated media as the app's template assets (public/templates/*) and the dashboard banner,
// replacing the third-party files that used to live there.
//   node demo/own-media/install.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'out');
const pub = path.resolve(here, '../../public');
const ff = (...a) => { const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: 'inherit' }); if (r.status !== 0) throw new Error(`ffmpeg ${a.join(' ')}`); };
const jpg = (src, dst) => ff('-i', path.join(out, src), '-q:v', '3', dst);
const mp4 = (src, dst) => ff('-i', path.join(out, src), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', '-an', dst);
const frame0 = (src, dst) => ff('-i', path.join(out, src), '-frames:v', '1', '-q:v', '3', dst);

const clean = (dir, keep) => { for (const f of fs.readdirSync(dir)) if (!keep.includes(f)) fs.rmSync(path.join(dir, f)); };

const fj = path.join(pub, 'templates/objects-swap');
fs.mkdirSync(fj, { recursive: true });
jpg('fj-actor.png', path.join(fj, 'actor.jpg')); jpg('fj-car.png', path.join(fj, 'car.jpg')); jpg('fj-scene.png', path.join(fj, 'scene.jpg'));
mp4('fj-gen.mp4', path.join(fj, 'generation.mp4')); mp4('fj-gen.mp4', path.join(fj, 'preview.mp4')); frame0('fj-gen.mp4', path.join(fj, 'preview.jpg'));
clean(fj, ['actor.jpg', 'car.jpg', 'scene.jpg', 'generation.mp4', 'preview.mp4', 'preview.jpg']);

const ms = path.join(pub, 'templates/marketing-studio');
jpg('ms-scene.png', path.join(ms, 'reference.jpg')); jpg('ms-product.png', path.join(ms, 'product.jpg')); jpg('ms-avatar.png', path.join(ms, 'avatar.jpg')); jpg('ms-out.png', path.join(ms, 'output.jpg'));
clean(ms, ['reference.jpg', 'product.jpg', 'avatar.jpg', 'output.jpg']);

const rc = path.join(pub, 'templates/recreate');
mp4('rc-source.mp4', path.join(rc, 'source.mp4')); mp4('rc-gen.mp4', path.join(rc, 'preview.mp4')); frame0('rc-gen.mp4', path.join(rc, 'poster.jpg'));
jpg('ms-product.png', path.join(rc, 'product.jpg')); jpg('ms-avatar.png', path.join(rc, 'avatar.jpg'));
clean(rc, ['source.mp4', 'preview.mp4', 'poster.jpg', 'product.jpg', 'avatar.jpg']);

jpg('banner.png', path.join(pub, 'business-banner.jpg'));
fs.rmSync(path.join(pub, 'business-kling.webp'), { force: true });
console.log('installed');
