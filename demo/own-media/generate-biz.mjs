// The Business-plan banner ad, made twice so we can pick: once with LTX-2.5 (Fast) and once with MiniMax H3, both through
// ComfyUI's partner API nodes on your Comfy credits, from the local ComfyUI at 127.0.0.1:8188.
//   node demo/own-media/generate-biz.mjs --plan
//   node demo/own-media/generate-biz.mjs --yes [--only biz-ltx,biz-h3]
// Key: $COMFY_API_KEY or ~/.config/comfy/api_key (sent to local ComfyUI only, never printed).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'biz');
const BASE = process.env.COMFY_URL || 'http://127.0.0.1:8188';
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const MAX_USD = Number(opt('max', 3));
const ids = opt('only', null)?.split(',') ?? null;

const AD = `Premium enterprise software commercial. A small diverse team of four colleagues in a dark, modern studio gathers around a huge wall-sized infinite canvas of softly glowing acid-lime node graphs and film frames. One of them drags a node across the wall, lines of light connect it to the others, and a finished film frame blooms on the canvas. Moody cinematic lighting with lime-green accents, shallow depth of field, slow smooth camera push-in, confident collaborative mood. No readable text, no logos, no brand names.`;
const SHOTS = [
  { id: 'biz-ltx', secs: 5, usd: 0.1859 * 5, node: 'ltx', prompt: AD + ' Audio: a low cinematic synth pulse, soft room tone, gentle UI sounds as nodes connect.' },
  { id: 'biz-h3', secs: 5, usd: 0.1287 * 5, node: 'h3', prompt: AD },
];
const list = ids ? SHOTS.filter((s) => ids.includes(s.id)) : SHOTS;
const total = list.reduce((t, s) => t + s.usd, 0);
console.log('shot     model                 secs  est. cost');
for (const s of list) console.log(`${s.id.padEnd(8)} ${(s.node === 'ltx' ? 'LTX-2.5 (Fast) 1080p' : 'MiniMax H3 768P').padEnd(21)} ${String(s.secs).padStart(3)}   $${s.usd.toFixed(2)}`);
console.log(`total: $${total.toFixed(2)} (cap $${MAX_USD})`);
if (flag('plan') || !flag('yes')) { console.log(flag('plan') ? '(plan only, nothing spent)' : 'add --yes to generate'); process.exit(0); }
if (total > MAX_USD) { console.error('over the cap; raise --max'); process.exit(1); }

const keyFile = path.join(os.homedir(), '.config', 'comfy', 'api_key');
const KEY = (process.env.COMFY_API_KEY || (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, 'utf8') : '')).trim();
if (!KEY) { console.error(`no Comfy API key: put it in ${keyFile} or $COMFY_API_KEY`); process.exit(1); }
fs.mkdirSync(out, { recursive: true });

const node = (s) => s.node === 'ltx'
  ? { class_type: 'LtxApi25TextToVideo', inputs: { model: 'LTX-2.5 (Fast)', 'model.duration': String(s.secs), 'model.resolution': '1920x1080', 'model.fps': '25', 'model.generate_audio': true, prompt: s.prompt, seed: 11 } }
  : { class_type: 'MinimaxHailuo03TextToVideoNode', inputs: { model: 'MiniMax H3', 'model.prompt': s.prompt, 'model.resolution': '768P', 'model.ratio': '16:9', 'model.duration': s.secs, seed: 11, watermark: false } };
async function run(workflow) {
  const r = await fetch(`${BASE}/prompt`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: workflow, extra_data: { api_key_comfy_org: KEY } }) });
  const body = await r.json();
  if (!r.ok) throw new Error(`/prompt ${r.status}: ${JSON.stringify(body).replace(KEY, '***').slice(0, 700)}`);
  for (;;) {
    await new Promise((res) => setTimeout(res, 4000));
    const h = (await (await fetch(`${BASE}/history/${body.prompt_id}`)).json())[body.prompt_id];
    if (!h) continue;
    if (h.status?.status_str === 'error') throw new Error(String(h.status.messages.find((x) => x[0] === 'execution_error')?.[1]?.exception_message || 'execution error').replace(KEY, '***').slice(0, 500));
    if (h.outputs && Object.keys(h.outputs).length) return Object.values(h.outputs).flatMap((o) => o.images || o.videos || o.gifs || [])[0];
  }
}
for (const s of list) {
  const dest = path.join(out, `${s.id}.mp4`);
  if (fs.existsSync(dest) && !flag('force')) { console.log(`${s.id}: already have it`); continue; }
  const t0 = Date.now();
  process.stdout.write(`${s.id}: generating ... `);
  const f = await run({ 1: node(s), 2: { class_type: 'SaveVideo', inputs: { video: ['1', 0], filename_prefix: `biz/${s.id}`, format: 'auto', codec: 'auto' } } });
  const res = await fetch(`${BASE}/view?filename=${encodeURIComponent(f.filename)}&subfolder=${encodeURIComponent(f.subfolder || '')}&type=${f.type}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${path.relative(process.cwd(), dest)}`);
}
