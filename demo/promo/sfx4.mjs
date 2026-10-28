// v4 soundtrack: a 120 BPM tech-ad track built from scratch (kick, clap, hats, sub bass, detuned-saw stabs and arps,
// risers, reverb, sidechain ducking), plus real Pixabay SFX samples for whooshes, impacts and pops.
// Everything is timed from timeline4.js, the same numbers promo4.html animates on. Writes sfx4.wav (48 kHz stereo).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
await import('./timeline4.js');
const T = globalThis.PROMO4, C = T.cuts;
const SR = 48000, DUR = T.duration, N = SR * DUR, BEAT = T.beat;
const stem = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
const drums = stem(), bass = stem(), synth = stem(), pad = stem(), fx = stem();
const kickEnv = new Float32Array(N);

let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

function add(s, at, samples, gain = 1, pan = 0) {
  const start = Math.round(at * SR), gl = gain * Math.cos(((pan + 1) * Math.PI) / 4), gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < samples.length; i++) { const j = start + i; if (j < 0 || j >= N) continue; s.L[j] += samples[i] * gl; s.R[j] += samples[i] * gr; }
}
const env = (n, a, d) => (i) => Math.min(1, i / (a * SR)) * Math.exp(-i / (d * SR));

// ---- drum voices ----
function kick(at, g = 1) {
  const n = Math.round(0.42 * SR), o = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = 58 + 120 * Math.exp(-t * 38);
    ph += (2 * Math.PI * f) / SR;
    o[i] = Math.tanh(1.6 * Math.sin(ph)) * Math.exp(-t / 0.16) + (i < 90 ? (rand() * 2 - 1) * 0.4 * (1 - i / 90) : 0);
  }
  add(drums, at, o, 0.95 * g);
  const s = Math.round(at * SR); for (let i = 0; i < 0.3 * SR && s + i < N; i++) kickEnv[s + i] = Math.max(kickEnv[s + i], Math.exp(-i / (0.11 * SR)) * g);
}
function noiseBurst(dur, hp, decay, lpHz = 0) {
  const n = Math.round(dur * SR), o = new Float32Array(n); let a = 0, lp = 0, prev = 0;
  const k = lpHz ? 1 - Math.exp((-2 * Math.PI * lpHz) / SR) : 1;
  for (let i = 0; i < n; i++) { let v = rand() * 2 - 1; if (hp) { a = 0.96 * (a + v - prev); prev = v; v = a; } lp += k * (v - lp); o[i] = lp * Math.exp(-i / (decay * SR)); }
  return o;
}
function clap(at, g = 1) {
  const burst = (d) => noiseBurst(0.012, true, 0.006, 6000);
  for (const d of [0, 0.011, 0.022]) add(drums, at + d, burst(), 0.5 * g);
  add(drums, at + 0.03, noiseBurst(0.22, true, 0.07, 7000), 0.3 * g, -0.6); add(drums, at + 0.034, noiseBurst(0.22, true, 0.07, 7000), 0.3 * g, 0.6);
  add(drums, at, (() => { const n = Math.round(0.1 * SR), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { ph += (2 * Math.PI * (190 - 60 * (i / n))) / SR; o[i] = Math.sin(ph) * Math.exp(-i / (0.03 * SR)); } return o; })(), 0.35 * g);
}
function snare(at, g = 1) { clap(at, g * 0.6); add(drums, at, noiseBurst(0.18, true, 0.06, 9000), 0.35 * g); }
let hatSide = 1;
const hat = (at, open = false, g = 1) => { hatSide = -hatSide; add(drums, at, noiseBurst(open ? 0.3 : 0.06, true, open ? 0.09 : 0.016, 14000), (open ? 0.3 : 0.25) * g, hatSide * (0.25 + rand() * 0.35)); };

// ---- pitched voices ----
function subNote(at, m, dur, g = 1) {
  const n = Math.round(dur * SR), o = new Float32Array(n); let ph = 0; const f = midi(m);
  for (let i = 0; i < n; i++) { ph += (2 * Math.PI * f) / SR; const t = i / SR, e = Math.min(1, t / 0.006) * Math.min(1, (dur - t) / 0.03); o[i] = (Math.tanh(2.2 * Math.sin(ph)) * 0.8 + Math.sin(ph * 2) * 0.12) * e; }
  add(bass, at, o, 0.9 * g);
}
function sawStack(at, notes, dur, { g = 1, cutoff = [5200, 900], detune = 0.006, target = synth, pan = 0 } = {}) {
  const n = Math.round(dur * SR), o = new Float32Array(n);
  for (const m of notes) for (const d of [-detune, 0, detune]) {
    let ph = rand(); const f = midi(m) * (1 + d);
    for (let i = 0; i < n; i++) { ph += f / SR; if (ph >= 1) ph -= 1; o[i] += (2 * ph - 1) * 0.12; }
  }
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const x = i / n, c = cutoff[0] * Math.pow(cutoff[1] / cutoff[0], x), k = 1 - Math.exp((-2 * Math.PI * c) / SR);
    lp += k * (o[i] - lp);
    o[i] = lp * Math.min(1, i / (0.004 * SR)) * Math.pow(1 - x, 1.4);
  }
  add(target, at, o, g, pan);
}
function wide(at, notes, dur, opts = {}) {   // two independent stacks, panned apart
  sawStack(at, notes, dur, { ...opts, g: (opts.g ?? 1) * 0.75, pan: -0.92, detune: 0.008 });
  sawStack(at, notes, dur, { ...opts, g: (opts.g ?? 1) * 0.75, pan: 0.92, detune: 0.006 });
}
function riser(at, dur, g = 1) {
  const n = Math.round(dur * SR), o = new Float32Array(n); let lp = 0, ph = 0;
  for (let i = 0; i < n; i++) {
    const x = i / n, c = 250 * Math.pow(9000 / 250, x * x), k = 1 - Math.exp((-2 * Math.PI * c) / SR);
    lp += k * ((rand() * 2 - 1) - lp);
    ph += (2 * Math.PI * (180 * Math.pow(14, x))) / SR;
    o[i] = (lp * 0.8 + Math.sin(ph) * 0.12) * Math.pow(x, 1.6);
  }
  add(fx, at, o, 0.6 * g);
}
// (no metallic ticks: the old 3.4 kHz sine tick, the Pixabay sparkle and ping read as coins / a cash register; these are low wooden and air sounds from earshot's code-made bank)
const tick = (at, g = 1) => play('thock', at, 0.45 * g);

// ---- sample SFX (Pixabay, shipped in hyperframes/assets/sfx) ----
const sfxDir = path.resolve(here, '../hyperframes/assets/sfx');
function sample(name) {
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', path.join(sfxDir, name), '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
  const f = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4), n = f.length / 2, L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = f[2 * i]; R[i] = f[2 * i + 1]; }
  return { L, R };
}
const S = Object.fromEntries(['whoosh', 'whoosh-short', 'impact-bass-1', 'pop', 'click-soft'].map((k) => [k, sample(`${k}.mp3`)]));
function bank(name) {   // earshot sfx bank renders (wav)
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', path.join(here, 'sfxbank', name), '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'], { maxBuffer: 1 << 26 });
  const f = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4), n = f.length / 2, L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = f[2 * i]; R[i] = f[2 * i + 1]; }
  return { L, R };
}
S.thock = bank('thock.wav'); S.wood = bank('wood.wav'); S.air = bank('air.wav'); S.lip = bank('lip.wav');
S.sparkle = S.air; S.ping = S.wood;   // the accents that used to be bells
function play(name, at, g = 1, rate = 1) {
  const s = S[name], n = Math.floor(s.L.length / rate);
  for (let i = 0; i < n; i++) { const j = Math.round(at * SR) + i, src = Math.floor(i * rate); if (j < 0 || j >= N) continue; fx.L[j] += s.L[src] * g; fx.R[j] += s.R[src] * g; }
}

// ---- arrangement ----
const bar = (t) => Math.floor(t / (BEAT * 4));
const PROG = [[57, 60, 64, 67], [53, 57, 60, 64], [60, 64, 67, 71], [55, 59, 62, 66]];   // Am7 Fmaj7 Cmaj7 G(add9)-ish
const ROOT = [45, 41, 48, 43];
const chordOf = (b) => (b - 2 + 8) % 4;

// bar 0 (0-2): cold open. boom, two kicks, a snare roll into the montage
kick(0, 1); kick(1.0, 0.9);
[1.5, 1.625, 1.75, 1.8125, 1.875, 1.9375].forEach((t, i) => snare(t, 0.35 + i * 0.12));
subNote(0, 45, 1.9, 0.8);
play('impact-bass-1', 0, 0.9);
riser(0.9, 1.1, 0.7);

// bar 1 (2-4): montage. four on the floor, offbeat hats, pulsing bass, one riser, then a hole before the logo
for (let b = 0; b < 4; b++) {
  const t = 2 + b * BEAT; kick(t, 1);
  hat(t + 0.25, false, 0.9); subNote(t, 45, 0.22, 0.85); subNote(t + 0.25, 45, 0.2, 0.7);
  play('click-soft', t, 0.45, 1 + b * 0.12); if (b === 3) play('pop', t, 0.5);
}
clap(2.5, 0.8); clap(3.5, 0.9);
riser(2.0, 1.9, 1);
play('whoosh', 1.75, 0.55); play('whoosh', 3.5, 0.7);

// bar 2 (4-6): the drop. logo slam
play('impact-bass-1', 4.0, 1.2); play('sparkle', 4.1, 0.5);
wide(4.0, PROG[0].map((m) => m + 12), 1.0, { g: 1.3, cutoff: [8000, 1400] });
wide(5.0, PROG[0].map((m) => m + 12), 0.9, { g: 0.9, cutoff: [7000, 1500] });

// bars 2-7 (4-16): the groove
for (let t = 4; t < 23; t += BEAT) {
  if (t >= 18 && t < 20) continue;   // the 'local or API' scene is its own build-up
  const bi = bar(t), beatInBar = Math.round((t - bi * 2) / BEAT);
  kick(t, 1);
  if (beatInBar === 1 || beatInBar === 3) clap(t, 0.9);
  for (let s = 0; s < 4; s++) { const th = t + s * 0.125; if (s === 2) hat(th, true, 0.8); else hat(th, false, s === 0 ? 0.5 : 0.8); }
  const root = ROOT[chordOf(bi)];
  subNote(t, root, 0.22, 0.95); subNote(t + 0.25, root + (beatInBar % 2 ? 12 : 0), 0.2, 0.75);
  if (t >= 6) for (let s = 0; s < 4; s++) { const notes = PROG[chordOf(bi)], m = notes[(s + beatInBar) % 4] + 12; sawStack(t + s * 0.125, [m], 0.14, { g: 0.95, cutoff: [7500, 2200], detune: 0.004, pan: ((s + beatInBar) % 2 ? 0.6 : -0.6) }); }
  if (beatInBar === 0 && t >= 6) wide(t, PROG[chordOf(bi)].map((m) => m + 12), 1.8, { g: 0.9, cutoff: [4200, 1200], target: pad });
}
// cut whooshes and hits on the picture beats
for (const [t, w] of [[5.75, 0.5], [7.75, 0.55], [12.75, 0.6], [15.75, 0.55], [16.9, 0.45]]) play('whoosh-short', t, w);
for (const t of [9.0, 14.0]) play('pop', t, 0.7);
for (const t of [8.0, 13.0]) play('click-soft', t, 0.55);
for (const t of [10.5, 11.5, 15.25]) { play('sparkle', t, 0.4); tick(t, 0.8); }
play('ping', 11.6, 0.5);
// fills before the scene changes
for (const t0 of [7.0, 15.0, 17.0]) [0, 0.125, 0.25, 0.375].forEach((d, i) => snare(t0 + 0.5 + d, 0.35 + i * 0.1));

// visual events Earshot found without a hit: the first frame change, the montage cut, the FrameJutsu output, the two end-card slams
tick(0.17, 0.9); play('click-soft', 0.17, 0.5);
play('pop', 2.0, 0.8); tick(2.0, 1);
play('click-soft', 11.67, 0.7); play('pop', 11.67, 0.5); tick(11.67, 1);
play('pop', 23.35, 0.7); play('click-soft', 23.35, 0.5);
play('click-soft', 23.8, 0.7); play('pop', 23.8, 0.5);
// the hook's beat cuts and the product film's beat cuts
tick(0.5, 0.8); tick(1.5, 0.8);
for (const [t, k] of [[16.0, 'pop'], [16.5, 'click-soft'], [17.0, 'pop'], [17.5, 'click-soft']]) play(k, t, 0.6);

// 18-20 (local or API): drums out, a heartbeat of ticks that speeds up, a riser, then a stop-down at 19.8
riser(18.0, 1.8, 1.1);
{ let t = 18.0, gap = 0.3; while (t < 19.8) { tick(t, 0.9); t += gap; gap = Math.max(0.05, gap * 0.9); } }
kick(18.0, 0.9); kick(18.5, 0.7); kick(19.0, 0.7); kick(19.4, 0.7); kick(19.6, 0.8);
wide(18.0, [57, 64], 1.8, { g: 0.6, cutoff: [500, 3500], target: pad });
for (const t of [18.0, 18.5, 19.0]) play('pop', t, 0.5);   // the three slams

// 20-23 (model list): the groove drops back in on a boom, and every list row ticks in
play('impact-bass-1', 20.0, 0.7); play('whoosh', 19.6, 0.5);
for (let i = 0; i < 5; i++) { play('click-soft', 20.12 + i * 0.14, 0.45, 1 + i * 0.05); }
for (let i = 0; i < 3; i++) { play('pop', 21.0 + i * 0.16, 0.5, 1 + i * 0.08); }
play('sparkle', 21.0, 0.3);

// 23-25 (end card): boom, bell, a held chord
play('whoosh', 22.6, 0.6);
play('impact-bass-1', 23.0, 0.8); play('sparkle', 23.15, 0.4); play('ping', 23.1, 0.4);
kick(23.0, 0.9); subNote(23.0, 45, 1.6, 0.8);
wide(23.0, [57, 60, 64, 67, 71], 2.0, { g: 0.5, cutoff: [6000, 1200], target: pad });
wide(23.0, [69, 72, 76], 1.6, { g: 0.3, cutoff: [8000, 2000] });
clap(24.0, 0.7); kick(24.0, 0.8);

// ---- mix ----
// the music has a hole just before the logo drop and before the final slam
const gate = (t) => T.holes.some((h) => t >= h && t < h + 0.2) ? 0 : 1;
// sidechain: bass, synth and pad duck under every kick
function duck(s, amount) { for (let i = 0; i < N; i++) { const d = 1 - amount * kickEnv[i]; s.L[i] *= d; s.R[i] *= d; } }
duck(bass, 0.75); duck(synth, 0.6); duck(pad, 0.55);
// small Schroeder reverb on the synth and pad buses
function reverb(s, mix, size = 1) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => Math.round(d * 1.09 * size)), aps = [225, 556];
  for (const ch of ['L', 'R']) {
    const x = s[ch], y = new Float32Array(N), off = ch === 'R' ? 137 : 0;
    for (const d0 of combs) { const d = d0 + off, buf = new Float32Array(d); let p = 0; for (let i = 0; i < N; i++) { const v = x[i] + buf[p] * 0.82; buf[p] = v; y[i] += v * 0.16; p = (p + 1) % d; } }
    for (const d0 of aps) { const d = d0 + (ch === 'R' ? 41 : 0), buf = new Float32Array(d); let p = 0; for (let i = 0; i < N; i++) { const b = buf[p], v = y[i] + b * 0.5; buf[p] = v; y[i] = b - v * 0.5; p = (p + 1) % d; } }
    for (let i = 0; i < N; i++) x[i] = x[i] * (1 - mix) + y[i] * mix * 1.4;
  }
}
reverb(synth, 0.32); reverb(pad, 0.5, 1.3);
for (const s of [synth, pad]) { const d = 720; for (let i = N - 1; i >= 0; i--) s.R[i] = i >= d ? s.R[i - d] : 0; }

const outL = new Float32Array(N), outR = new Float32Array(N);
const bus = [[drums, 1.0], [bass, 0.75], [synth, 1.15], [pad, 0.9]];
for (let i = 0; i < N; i++) {
  const g = gate(i / SR);
  let l = fx.L[i] * g, r = fx.R[i] * g;
  for (const [s, k] of bus) { l += s.L[i] * k * g; r += s.R[i] * k * g; }
  outL[i] = l; outR[i] = r;
}
// master: soft clip, fade in/out, 16-bit WAV
const fadeOut = (DUR - 0.5) * SR, pcm = Buffer.alloc(N * 4); let peak = 0;
for (let i = 0; i < N; i++) {
  const f = i > fadeOut ? 1 - (i - fadeOut) / (N - fadeOut) : 1;
  const l = Math.tanh(outL[i] * 0.85) * f, r = Math.tanh(outR[i] * 0.85) * f;
  peak = Math.max(peak, Math.abs(l), Math.abs(r));
  pcm.writeInt16LE(Math.round(l * 32000), i * 4); pcm.writeInt16LE(Math.round(r * 32000), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8); header.write('fmt ', 12); header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22); header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
const out = path.join(here, 'sfx4.wav');
fs.writeFileSync(out, Buffer.concat([header, pcm]));
console.log(`${out} (peak ${peak.toFixed(2)})`);
