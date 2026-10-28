// Generates the demo's clips with LTX-2.5 through ComfyUI's partner "LTX 2.5" API nodes (runs on Lightricks' servers,
// paid with your Comfy credits), driven from the local ComfyUI at 127.0.0.1:8188.
//
//   node demo/own-media/generate-ltx25.mjs --plan                 print the shots and the cost, spend nothing
//   node demo/own-media/generate-ltx25.mjs --yes                  generate every shot
//   node demo/own-media/generate-ltx25.mjs --yes --only fj-scene  generate one shot (try one first); --only a,b for several
//   add --exp to include the multishot car experiment
//
// Auth: a Comfy API key (platform.comfy.org -> API Keys) read from $COMFY_API_KEY or ~/.config/comfy/api_key.
// The key is sent to your local ComfyUI as extra_data.api_key_comfy_org and is never printed or written anywhere.
// Cost guard: prices come from ComfyUI's own price table for these nodes (comfy_api_nodes/nodes_ltxv.py);
// the script refuses to run if the total would pass --max (default $15).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'ltx25');
const BASE = process.env.COMFY_URL || 'http://127.0.0.1:8188';
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const MAX_USD = Number(opt('max', 15));
const only = opt('only', null);   // one shot id, or several separated by commas

// USD per second of output, from ComfyUI's price badge for LtxApi25TextToVideo
const PRICE = {
  'LTX-2.5 (Fast)': { '1280x720': 0.1287, '1920x1080': 0.1859, '2560x1440': 0.2717, '3840x2160': 0.429 },
  'LTX-2.5 (Pro)': { '1280x720': 0.1716, '1920x1080': 0.2431 },
};
const NEG = 'no text, no logos, no brand names, no watermark';

// Music-video look for the car, a creative product film, the marketing shot left plain. Text-to-video with
// LTX-2.5's own synchronized sound (same price; --silent turns it off), 25 fps, 1080p. Pro tier for the hero shots (quality first), Fast for the rest.
const PRO = 'LTX-2.5 (Fast)', FAST = 'LTX-2.5 (Fast)';   // Fast tier for every shot (Pro is 'LTX-2.5 (Pro)', ~$0.24/s at 1080p)
const SHOTS = [
  // the car: music video
  { id: 'fj-scene', audio: 'heavy rain on wet asphalt, a low engine idle, wind, a slow cinematic synth drone with soft bass pulses', secs: 6, model: PRO, prompt: `Music video, night. A young woman with wavy auburn hair and a white t-shirt leans against the hood of a glossy black sports car on a rain-soaked neon street, wind lifting her hair in slow motion. Headlights flare through the rain, anamorphic lens flares, teal and magenta neon reflections on the wet asphalt. The camera orbits slowly around her. Shallow depth of field, film grain, high-contrast cinematic colour grade. ${NEG}.` },
  { id: 'car-a', audio: 'tires hissing and skidding through water, a throaty engine roar, rain, deep cinematic bass hits', secs: 5, model: PRO, prompt: `Music video shot. A glossy black sports car drifts through a rain-soaked neon city intersection at night, tires throwing sheets of water in slow motion. Low-angle tracking camera with a subtle whip pan, anamorphic lens flares, teal and magenta neon reflections, deep blacks, film grain, cinematic motion blur. ${NEG}.` },
  { id: 'car-b', audio: 'close rain drops pattering on metal, a faint idling engine, a low humming synth pad', secs: 4, model: PRO, prompt: `Extreme macro close-up of a black sports car headlight and glossy fender in the rain at night. Neon reflections slide across the paint, raindrops bead and run, shallow depth of field with anamorphic bokeh, slow push-in. Moody, high-contrast, cinematic. ${NEG}.` },
  { id: 'car-c', audio: 'a rising engine roar, wind rush, tire hum on the road, a pulsing synth bass', secs: 4, model: PRO, prompt: `Low aerial drone shot flying behind a black sports car speeding down an empty highway at night, red tail lights streaking, a glowing city skyline in the distance, rain mist, motion blur, teal and orange colour grade, music video energy. ${NEG}.` },
  { id: 'fj-actor', audio: 'soft rain, a quiet breath, a gentle ambient synth pad', secs: 4, model: FAST, prompt: `Extreme close portrait of a young woman with wavy auburn hair, rain on her skin, teal and magenta neon rim light, she looks into the camera with a slight smile. Slow push-in, anamorphic bokeh, film grain, cinematic. ${NEG}.` },
  // the product: creative, quality first
  { id: 'rc-gen', audio: 'a crisp can-opening hiss, soft fizzing, ice tinkling, a short happy laugh, a gentle whoosh, a calm light beat', secs: 6, model: PRO, prompt: `Pop-art product film in a bright, colourful studio. A young man in a blue shirt and a cap holds an aluminium soda can with an abstract orange and purple geometric label and cracks it open. A controlled slow-motion ring of orange fizz, ice crystals and citrus slices lifts gently around the can and orbits past his head, never covering his face. His face stays sharp, in focus and clearly visible as he smiles and laughs. Smooth, steady camera with a gentle slow orbit, clean high-speed photography look, saturated candy colours, calm and controlled. No readable text, no brand names.` },
  { id: 'product-hero', audio: 'a smooth studio whoosh, a splash, ice cubes clinking, soft fizz', secs: 5, model: PRO, prompt: `Product commercial. A single aluminium soda can with an abstract orange and purple geometric label levitates and slowly spins in a pastel studio. A slow-motion ring of liquid splash, floating ice cubes and citrus slices orbit the can, macro condensation droplets, glossy reflections; the camera pushes in with a smooth motion-control move. Bold colour-block background. No readable text, no brand names.` },
  // the marketing shot: fine as it is
  { id: 'ms-hero', audio: 'gentle summer street ambience, a soft breeze, a light upbeat pop beat', secs: 5, model: FAST, prompt: `A young woman in white oval sunglasses and a green jacket holds an aluminium soda can with an abstract orange and purple geometric label against a bright blue sky. Slow orbit around her, editorial lifestyle photography. No readable text, no brand names.` },
  // experiment: one generation that cuts between several car shots (LTX-2.5 does native multishot); add --exp
  { id: 'car-mv', audio: 'rain, engine roar, tire spray, rhythmic bass hits matching each cut', secs: 10, model: PRO, experimental: true, prompt: `Music video, three quick connected shots of the same glossy black sports car on a rain-soaked neon street at night. Shot one: extreme close-up of the headlights igniting through the rain. Shot two: low-angle tracking shot as the car drifts through a neon intersection in slow motion, water spraying. Shot three: overhead drone shot of the car speeding away, tail lights streaking. Teal and magenta neon, anamorphic lens flares, film grain, rhythmic cuts. ${NEG}.` },
];
const RES = '1920x1080', FPS = '25';
const cost = (s) => PRICE[s.model][RES] * s.secs;

const ids = only ? only.split(',') : null;
let list = ids ? SHOTS.filter((s) => ids.includes(s.id)) : SHOTS.filter((s) => !s.experimental || flag('exp'));
if (!list.length) { console.error(`no shot "${only}"`); process.exit(1); }
const total = list.reduce((t, s) => t + cost(s), 0);
console.log('shot            tier              secs   est. cost');
for (const s of list) console.log(`${s.id.padEnd(15)} ${s.model.padEnd(17)} ${String(s.secs).padStart(4)}   $${cost(s).toFixed(2)}`);
console.log(`total at ${RES}: $${total.toFixed(2)} (cap $${MAX_USD})${!ids && !flag('exp') ? '  [add --exp to include the multishot car experiment]' : ''}`);
if (flag('plan') || !flag('yes')) { console.log(flag('plan') ? '(plan only, nothing spent)' : 'add --yes to generate'); process.exit(0); }
if (total > MAX_USD) { console.error(`total $${total.toFixed(2)} is over the cap $${MAX_USD}; raise --max or use --only`); process.exit(1); }

const keyFile = path.join(os.homedir(), '.config', 'comfy', 'api_key');
const KEY = (process.env.COMFY_API_KEY || (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, 'utf8') : '')).trim();
if (!KEY) { console.error(`no Comfy API key: put it in ${keyFile} or $COMFY_API_KEY`); process.exit(1); }
fs.mkdirSync(out, { recursive: true });

async function submit(s) {
  const workflow = {
    1: { class_type: 'LtxApi25TextToVideo', inputs: { model: s.model, 'model.duration': String(s.secs), 'model.resolution': RES, 'model.fps': FPS, 'model.generate_audio': !flag('silent'), prompt: s.prompt + (flag('silent') || !s.audio ? '' : ` Audio: ${s.audio}`), seed: 42 } },
    2: { class_type: 'SaveVideo', inputs: { video: ['1', 0], filename_prefix: `ltx25/${s.id}`, format: 'auto', codec: 'auto' } },
  };
  const r = await fetch(`${BASE}/prompt`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: workflow, extra_data: { api_key_comfy_org: KEY } }) });
  const body = await r.json();
  if (!r.ok) throw new Error(`/prompt ${r.status}: ${JSON.stringify(body).slice(0, 400)}`);
  return body.prompt_id;
}
async function wait(id) {
  for (;;) {
    await new Promise((res) => setTimeout(res, 4000));
    const h = (await (await fetch(`${BASE}/history/${id}`)).json())[id];
    if (!h) continue;
    if (h.status?.status_str === 'error') {
      const m = h.status.messages.find((x) => x[0] === 'execution_error');
      throw new Error(String(m?.[1]?.exception_message || 'execution error').replace(KEY, '***').slice(0, 400));
    }
    if (h.outputs && Object.keys(h.outputs).length) return h.outputs;
  }
}
for (const s of list) {
  const dest = path.join(out, `${s.id}.mp4`);
  if (fs.existsSync(dest) && !flag('force')) { console.log(`${s.id}: already have it (use --force to redo)`); continue; }
  const t0 = Date.now();
  process.stdout.write(`${s.id}: generating (${s.secs}s, ${s.model}) ... `);
  const outputs = await wait(await submit(s));
  const f = Object.values(outputs).flatMap((o) => o.images || o.videos || o.gifs || [])[0];
  if (!f) throw new Error('no output file');
  const res = await fetch(`${BASE}/view?filename=${encodeURIComponent(f.filename)}&subfolder=${encodeURIComponent(f.subfolder || '')}&type=${f.type}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${path.relative(process.cwd(), dest)}`);
}
