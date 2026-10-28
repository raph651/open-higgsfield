// Regenerates the Marketing Studio template images with Seedream 5.0 Pro through ComfyUI's ByteDance partner node
// (runs on ByteDance's servers, paid with your Comfy credits), driven from the local ComfyUI at 127.0.0.1:8188.
// The output image is generated FROM the other three as reference images, so the template's graph is literally true.
//
//   node demo/own-media/generate-seedream.mjs --plan      print the shots and cost, spend nothing
//   node demo/own-media/generate-seedream.mjs --yes       generate all four
//   node demo/own-media/generate-seedream.mjs --yes --only ms-product,ms-avatar
//
// Auth: your Comfy API key from $COMFY_API_KEY or ~/.config/comfy/api_key (sent to local ComfyUI only, never printed).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'seedream');
const BASE = process.env.COMFY_URL || 'http://127.0.0.1:8188';
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const MAX_USD = Number(opt('max', 2));
const ids = opt('only', null)?.split(',') ?? null;

const SIZE = '(2K) 1728x2304 (3:4)';   // 3.98 MP: ComfyUI's price table puts anything over ~2.6 MP at $0.09 per image
const NEG = 'No readable text, no logos, no brand names, no watermark.';
const SHOTS = [
  { id: 'ms-scene', usd: 0.09, prompt: `Editorial lifestyle photograph of a sunlit pastel city street corner in summer, clean modern buildings in peach and mint, a bright blue sky with soft clouds, golden hour light, shallow depth of field, empty of people, vertical composition. ${NEG}` },
  { id: 'ms-product', usd: 0.09, prompt: `Premium product photograph: a single silver aluminium soda can with an abstract orange and purple geometric colour-block design and condensation droplets, standing on a pastel studio set, soft studio light, glossy reflections, shallow depth of field, vertical composition. The can has no words or letters on it. ${NEG}` },
  { id: 'ms-avatar', usd: 0.09, prompt: `Editorial portrait of a young woman with a short bob haircut wearing white oval sunglasses and a green jacket, bright natural light, relaxed confident expression, clean pastel background, sharp focus, vertical composition. ${NEG}` },
  { id: 'ms-out', usd: 0.096, refs: ['ms-scene', 'ms-product', 'ms-avatar'], prompt: `Place the woman from image 2 in the street scene from image 1, holding the silver soda can from image 3 up toward the camera with a bright smile. Keep her white oval sunglasses and green jacket, the can's orange and purple colour-block design and the scene's pastel colours and golden light. Editorial lifestyle advertising photograph, vertical composition. ${NEG}` },
];
// image order for the output prompt: image 1 = scene, image 2 = avatar, image 3 = product
const REF_ORDER = ['ms-scene', 'ms-avatar', 'ms-product'];

const list = ids ? SHOTS.filter((s) => ids.includes(s.id)) : SHOTS;
const total = list.reduce((t, s) => t + s.usd, 0);
console.log('image        refs  est. cost');
for (const s of list) console.log(`${s.id.padEnd(12)} ${String(s.refs ? s.refs.length : 0).padStart(4)}  $${s.usd.toFixed(3)}`);
console.log(`total: $${total.toFixed(2)} (cap $${MAX_USD}); Seedream 5.0 Pro at ${SIZE}`);
if (flag('plan') || !flag('yes')) { console.log(flag('plan') ? '(plan only, nothing spent)' : 'add --yes to generate'); process.exit(0); }
if (total > MAX_USD) { console.error(`total is over the cap $${MAX_USD}; raise --max`); process.exit(1); }

const keyFile = path.join(os.homedir(), '.config', 'comfy', 'api_key');
const KEY = (process.env.COMFY_API_KEY || (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, 'utf8') : '')).trim();
if (!KEY) { console.error(`no Comfy API key: put it in ${keyFile} or $COMFY_API_KEY`); process.exit(1); }
fs.mkdirSync(out, { recursive: true });

async function upload(file) {
  const fd = new FormData();
  fd.append('image', new Blob([fs.readFileSync(file)]), `osc-${path.basename(file)}`); fd.append('overwrite', 'true');
  return (await (await fetch(`${BASE}/upload/image`, { method: 'POST', body: fd })).json()).name;
}
async function run(workflow) {
  const r = await fetch(`${BASE}/prompt`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: workflow, extra_data: { api_key_comfy_org: KEY } }) });
  const body = await r.json();
  if (!r.ok) throw new Error(`/prompt ${r.status}: ${JSON.stringify(body).replace(KEY, '***').slice(0, 600)}`);
  for (;;) {
    await new Promise((res) => setTimeout(res, 3000));
    const h = (await (await fetch(`${BASE}/history/${body.prompt_id}`)).json())[body.prompt_id];
    if (!h) continue;
    if (h.status?.status_str === 'error') throw new Error(String(h.status.messages.find((x) => x[0] === 'execution_error')?.[1]?.exception_message || 'execution error').replace(KEY, '***').slice(0, 500));
    if (h.outputs && Object.keys(h.outputs).length) return Object.values(h.outputs).flatMap((o) => o.images || [])[0];
  }
}
for (const s of list) {
  const dest = path.join(out, `${s.id}.png`);
  if (fs.existsSync(dest) && !flag('force')) { console.log(`${s.id}: already have it (use --force to redo)`); continue; }
  const t0 = Date.now();
  process.stdout.write(`${s.id}: generating ... `);
  const inputs = { prompt: s.prompt, model: 'seedream 5.0 pro', 'model.size_preset': SIZE, 'model.width': 1728, 'model.height': 2304, 'model.prompt_optimization': 'standard', 'model.seed': 7, 'model.watermark': false, 'model.thinking': true };
  const wf = {};
  if (s.refs) {
    REF_ORDER.forEach((rid, i) => { wf[`L${i}`] = { class_type: 'LoadImage', inputs: { image: null } }; });
  }
  const refNames = [];
  if (s.refs) for (const rid of REF_ORDER) refNames.push(await upload(path.join(out, `${rid}.png`)));
  if (s.refs) REF_ORDER.forEach((rid, i) => { wf[`L${i}`].inputs.image = refNames[i]; inputs[`model.images.image_${i + 1}`] = [`L${i}`, 0]; });
  wf.S = { class_type: 'ByteDanceSeedreamNodeV3', inputs };
  wf.V = { class_type: 'SaveImage', inputs: { images: ['S', 0], filename_prefix: `seedream/${s.id}` } };
  const f = await run(wf);
  if (!f) throw new Error('no output file');
  const res = await fetch(`${BASE}/view?filename=${encodeURIComponent(f.filename)}&subfolder=${encodeURIComponent(f.subfolder || '')}&type=${f.type}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${path.relative(process.cwd(), dest)}`);
}
