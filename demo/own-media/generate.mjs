// Generates our own template media (no third-party people, brands or footage) with the local ComfyUI,
// using the same workflow builders the app ships (src/lib/comfyWorkflows.ts): SD-Turbo stills, LTX-Video 2B clips.
//   node demo/own-media/generate.mjs [still:name ...] [clip:name ...]     (no args = everything)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sdTurboWorkflow, ltxImageToVideoWorkflow, ltxVideoWorkflow } from '../../src/lib/comfyWorkflows.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'out');
fs.mkdirSync(out, { recursive: true });
const BASE = process.env.COMFY_URL || 'http://127.0.0.1:8188';
const CKPT = 'sd_turbo.safetensors', LTX = 'ltxv-2b-0.9.8-distilled-fp8.safetensors', T5 = 't5xxl_fp8_e4m3fn.safetensors';
const NEG = 'text, watermark, logo, brand name, lettering, deformed, extra fingers, blurry, low quality';

async function run(workflow) {
  const r = await fetch(`${BASE}/prompt`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: workflow }) });
  if (!r.ok) throw new Error(`/prompt ${r.status}: ${await r.text()}`);
  const { prompt_id: id } = await r.json();
  for (;;) {
    await new Promise((res) => setTimeout(res, 2000));
    const h = await (await fetch(`${BASE}/history/${id}`)).json();
    const e = h[id];
    if (e?.status?.status_str === 'error') throw new Error(JSON.stringify(e.status.messages.slice(-2)));
    if (e?.outputs && Object.keys(e.outputs).length) return e.outputs;
  }
}
async function fetchFile(f) {
  const r = await fetch(`${BASE}/view?filename=${encodeURIComponent(f.filename)}&subfolder=${encodeURIComponent(f.subfolder || '')}&type=${f.type}`);
  return Buffer.from(await r.arrayBuffer());
}
const firstFile = (outputs) => { for (const o of Object.values(outputs)) { const f = (o.images || o.gifs || o.videos)?.[0]; if (f) return f; } throw new Error('no output file'); };
async function upload(name, file) {
  const fd = new FormData();
  fd.append('image', new Blob([fs.readFileSync(file)]), name); fd.append('overwrite', 'true');
  const r = await fetch(`${BASE}/upload/image`, { method: 'POST', body: fd });
  return (await r.json()).name;
}

// ---- the set ----
const STILLS = {
  'fj-actor':   { w: 512, h: 640, seed: 11, prompt: 'studio portrait photo of a young woman with wavy auburn hair, white t-shirt, soft window light, neutral grey background, 85mm, natural skin' },
  'fj-car':     { w: 768, h: 432, seed: 21, prompt: 'close three-quarter front view of a sleek black sports car filling the frame, night, wet asphalt, street light reflections, editorial car photography' },
  'fj-scene':   { w: 768, h: 432, seed: 31, prompt: 'a young woman with wavy auburn hair in a white t-shirt leaning on the hood of a black sports car, empty parking lot at night, sodium street lights, medium shot, cinematic photo, 35mm' },
  'ms-scene':   { w: 512, h: 640, seed: 41, prompt: 'young woman with round sunglasses and a white knit top holding a soda can, bright blue sky, summer street, editorial lifestyle photo' },
  'ms-product': { w: 512, h: 640, seed: 51, prompt: 'product photo of a single aluminium soda can with an abstract orange and purple geometric label, no text, on a green jacket, shallow depth of field' },
  'ms-avatar':  { w: 512, h: 640, seed: 61, prompt: 'close portrait of a young woman wearing white oval sunglasses and a cap, blue sky, editorial photo' },
  'rc-frame':   { w: 768, h: 432, seed: 81, prompt: 'a young man in a blue shirt and a cap holding an aluminium soda can in a bright living room, tall green floor lamp beside him, editorial photo' },
  'banner':     { w: 768, h: 432, seed: 91, prompt: 'abstract poster collage of film frames and glowing node graph lines, acid lime green and black, bold geometric shapes, graphic design, no text' },
  'ms-out':     { w: 512, h: 640, seed: 71, prompt: 'young woman with white oval sunglasses holding an aluminium soda can with an abstract orange and purple geometric label, green jacket, bright blue sky, editorial lifestyle photo' },
};
const CLIPS = {
  'rc-source': { w: 640, h: 352, frames: 49, prompt: 'A young man in a blue shirt and a cap stands in a bright living room next to a tall green floor lamp. Handheld camera slowly circles him. Natural light.' },
  'rc-gen': { still: 'rc-frame', w: 640, h: 352, frames: 49, prompt: 'The young man lifts the soda can toward the camera and smiles. Slow handheld push-in, bright living room.' },
  'fj-gen': { still: 'fj-scene', w: 640, h: 352, frames: 49, prompt: 'The camera slowly pushes in on the young woman beside the black sports car. Sodium street lights flicker, her hair moves in the night air.' },
};

const args = process.argv.slice(2);
// --seeds name=1,2,3 renders extra candidates as name-<seed>.png (to pick the best by eye)
const sk = args.indexOf('--seeds');
const extra = sk >= 0 ? Object.fromEntries(args[sk + 1].split(';').map((x) => { const [n, v] = x.split('='); return [n, v.split(',').map(Number)]; })) : {};
const want = sk >= 0 ? args.slice(0, sk) : args;
const pick = (kind, name) => !want.length || want.includes(`${kind}:${name}`);
for (const [name, s0] of Object.entries(STILLS)) {
  const seeds = extra[name] ?? (sk >= 0 ? [] : [null]);
  for (const seed of seeds) {
  if (sk < 0 && !pick('still', name)) continue;
  const s = { ...s0, seed: seed ?? s0.seed };
  const t0 = Date.now();
  const file = firstFile(await run(sdTurboWorkflow({ prompt: s.prompt, negative: NEG, seed: s.seed, width: s.w, height: s.h, checkpoint: CKPT })));
  fs.writeFileSync(path.join(out, seed == null ? `${name}.png` : `${name}-${seed}.png`), await fetchFile(file));
  console.log('still', name, seed ?? '', ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
}
for (const [name, c] of Object.entries(CLIPS)) {
  if (sk >= 0 || !pick('clip', name)) continue;
  const t0 = Date.now();
  const up = c.still ? await upload(`${c.still}.png`, path.join(out, `${c.still}.png`)) : null;
  const file = firstFile(await run(c.still ? ltxImageToVideoWorkflow({ prompt: c.prompt, negative: NEG, seed: 7, width: c.w, height: c.h, frames: c.frames, checkpoint: LTX, textEncoder: T5, image: up }) : ltxVideoWorkflow({ prompt: c.prompt, negative: NEG, seed: 9, width: c.w, height: c.h, frames: c.frames, checkpoint: LTX, textEncoder: T5 })));
  fs.writeFileSync(path.join(out, `${name}.mp4`), await fetchFile(file));
  console.log('clip', name, ((Date.now() - t0) / 1000).toFixed(0) + 's', file.filename);
}
