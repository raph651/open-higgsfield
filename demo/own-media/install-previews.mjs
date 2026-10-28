// Cuts the preview clips for the three starter templates from our own LTX-2.5 renders (and the Business banner source).
//   node demo/own-media/install-previews.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pub = path.resolve(here, '../../public');
const ff = (...a) => { const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: 'inherit' }); if (r.status !== 0) throw new Error(`ffmpeg ${a.join(' ')}`); };
const enc = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '25', '-an', '-movflags', '+faststart'];
const dir = (p) => { fs.mkdirSync(p, { recursive: true }); return p; };

// Motion study: the LTX-2.5 "wall of glowing nodes" clip (demo/own-media/biz/biz-ltx.mp4)
const ms = dir(path.join(pub, 'templates/motion-study'));
ff('-i', path.join(here, 'biz/biz-ltx.mp4'), '-vf', 'fps=30,scale=960:-2', ...enc, path.join(ms, 'preview.mp4'));
ff('-ss', '3.5', '-i', path.join(here, 'biz/biz-ltx.mp4'), '-frames:v', '1', '-vf', 'scale=960:-2', '-q:v', '3', path.join(ms, 'poster.jpg'));

// Character loop: the last two seconds of the Music Video clip, where the camera settles on her face (LTX-2.5)
const cl = dir(path.join(pub, 'templates/character-loop'));
ff('-ss', '4.1', '-i', path.join(here, 'ltx25/fj-scene-silent.mp4'), '-vf', 'fps=30,scale=960:-2', ...enc, path.join(cl, 'preview.mp4'));
ff('-ss', '5.0', '-i', path.join(here, 'ltx25/fj-scene-silent.mp4'), '-frames:v', '1', '-vf', 'scale=960:-2', '-q:v', '3', path.join(cl, 'poster.jpg'));

// Product film: our levitating can (LTX-2.5)
const pf = dir(path.join(pub, 'templates/product-film'));
ff('-i', path.join(here, 'ltx25/product-hero.mp4'), '-t', '5', '-vf', 'fps=30,scale=960:-2', ...enc, path.join(pf, 'preview.mp4'));
ff('-ss', '3.0', '-i', path.join(here, 'ltx25/product-hero.mp4'), '-frames:v', '1', '-vf', 'scale=960:-2', '-q:v', '3', path.join(pf, 'poster.jpg'));

// Business banner ad: MiniMax H3 (lime node UI, a film frame blooms on the wall)
ff('-i', path.join(here, 'biz/biz-h3.mp4'), '-vf', 'fps=30,scale=960:-2', ...enc, path.join(pub, 'business-ad.mp4'));
ff('-ss', '4.2', '-i', path.join(here, 'biz/biz-h3.mp4'), '-frames:v', '1', '-vf', 'scale=960:-2', '-q:v', '3', path.join(pub, 'business-ad-poster.jpg'));

console.log('installed');
