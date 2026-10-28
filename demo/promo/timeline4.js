// v4: a 20 s hard-cut ad on a 120 BPM grid (1 beat = 0.5 s, 1 bar = 2 s). Shared by promo4.html and sfx4.mjs.
globalThis.PROMO4 = {
  fps: 60,
  duration: 25,
  bpm: 120,
  beat: 0.5,
  // scenes (absolute seconds), all on bar lines
  cuts: { hook: 0, montage: 2, logo: 4, site: 6, fj: 8, ms: 13, product: 16, comfy: 18, models: 20, end: 23 },
  // hard-hit moments the picture shakes on and the audio hits on: [time, strength 0..1]
  hits: [[0, 0.4], [4, 1], [23, 0.8]],   // the only moments the picture shakes: the opening hit, the logo drop, the end card
  montage: ['fj-actor', 'fj-car', 'fj-scene', 'ms-product'],        // one per beat, 2.0–4.0
  site: { scroll: 6.5, studio: 7.3 },
  fj: { refs: 8.1, select: 9.0, panel: 9.1, node: 10.5, out: 11.6 },  // FrameJutsu board
  ms: { refs: 13.1, select: 14.0, plus: 15.2 },                       // Marketing Studio board
  // stop-downs: the music and picture drop out for 0.2 s before the logo drop, the model list and the end card
  holes: [3.8, 19.8, 22.8],
};
