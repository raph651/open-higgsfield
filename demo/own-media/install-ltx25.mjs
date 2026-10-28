// Installs the three LTX-2.5 clips (demo/own-media/ltx25) as the FrameJutsu and Recreate template media and as the promo's
// frame sequences. The reference stills are frames taken from the clips themselves.
//   node demo/own-media/install-ltx25.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const clips = path.join(here, 'ltx25');
const pub = path.resolve(here, '../../public/templates');
const frames = path.resolve(here, '../promo/frames');
const ff = (...a) => { const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: 'inherit' }); if (r.status !== 0) throw new Error(`ffmpeg ${a.join(' ')}`); };
const clip = (n) => path.join(clips, n);
const video = (src, dst) => ff('-i', clip(src), '-vf', 'scale=1280:-2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-an', '-movflags', '+faststart', dst);
const still = (src, n, dst, w = 960) => ff('-i', clip(src), '-vf', `select='eq(n,${n})',scale=${w}:-2`, '-frames:v', '1', '-q:v', '3', dst);

// FrameJutsu: the music-video car shot. Actor / Car / Scene are frames of that clip.
const fj = path.join(pub, 'objects-swap');
video('fj-scene-silent.mp4', path.join(fj, 'generation.mp4'));
video('fj-scene-silent.mp4', path.join(fj, 'preview.mp4'));
still('fj-scene-silent.mp4', 120, path.join(fj, 'actor.jpg'));
still('fj-scene-silent.mp4', 3, path.join(fj, 'car.jpg'));
still('fj-scene-silent.mp4', 148, path.join(fj, 'scene.jpg'));
still('fj-scene-silent.mp4', 120, path.join(fj, 'preview.jpg'));

// Recreate: the product film is the source clip, the pop-art take is the output.
const rc = path.join(pub, 'recreate');
video('product-hero.mp4', path.join(rc, 'source.mp4'));
video('rc-gen.mp4', path.join(rc, 'preview.mp4'));
still('product-hero.mp4', 0, path.join(rc, 'product.jpg'));
still('rc-gen.mp4', 118, path.join(rc, 'avatar.jpg'));
still('rc-gen.mp4', 118, path.join(rc, 'poster.jpg'));

// the promo draws these frame-exactly at the clips' own 25 fps
const manifest = {};
for (const [id, src] of Object.entries({ gen: 'fj-scene-silent.mp4', prod: 'product-hero.mp4', rc: 'rc-gen.mp4' })) {
  const dir = path.join(frames, id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  ff('-i', clip(src), '-vf', 'scale=1920:-2:flags=lanczos', '-q:v', '3', path.join(dir, '%04d.jpg'));
  manifest[id] = { n: fs.readdirSync(dir).length, fps: 25 };
  console.log(id, manifest[id]);
}
fs.writeFileSync(path.join(frames, 'manifest.js'), `globalThis.FJ = ${JSON.stringify(manifest)};\n`);
console.log('installed');
