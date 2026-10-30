// After `vite build` with VITE_STATIC_DEMO=1: add the demo video page to dist/ for GitHub Pages.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist', 'demo');
const video = join(root, 'docs', 'media', 'demo-1080p-v3.mp4');

if (!existsSync(join(root, 'dist'))) throw new Error('dist/ is missing: run the build first');
if (!existsSync(video)) throw new Error(`demo video not found: ${video}`);
mkdirSync(out, { recursive: true });
copyFileSync(join(root, 'scripts', 'pages', 'demo.html'), join(out, 'index.html'));
copyFileSync(video, join(out, 'open-source-canvas-demo.mp4'));
console.log('pages extras: dist/demo/index.html + open-source-canvas-demo.mp4');
