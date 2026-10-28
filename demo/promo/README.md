# Promo video and banner

Scripts that build the Open Source Canvas launch video (about 25 s, 1080p60) and the Business-plan banner loop.
Every frame is a pure function of time (`window.render(t)`), stepped by Playwright and piped into ffmpeg; the soundtrack is
synthesized in Node. Generated media is not committed (see `../.gitignore`).

| step | command |
|---|---|
| generate clips (ComfyUI partner API nodes, your Comfy credits) | `node demo/own-media/generate-ltx25.mjs --plan` then `--yes` |
| generate Marketing Studio images (Seedream 5.0 Pro) | `node demo/own-media/generate-seedream.mjs --plan` then `--yes` |
| install template media and frame sequences | `node demo/own-media/install-ltx25.mjs` and `install-previews.mjs` |
| capture the app (needs `npm run build` and `node server/app.mjs`) | `node demo/promo/capture-live.mjs` and `capture-layers.mjs` |
| render the video | `node demo/promo/render.mjs --v 4` |
| render the banner loop | `node demo/promo/render-banner.mjs` |

Notes
- API generation needs a Comfy account API key in `$COMFY_API_KEY` or `~/.config/comfy/api_key`. The scripts print a cost plan
  first, refuse to spend without `--yes`, and enforce a cap (`--max`).
- `sfx4.mjs` mixes a procedural 120 BPM track with short sound-effect samples. The samples are Pixabay sounds
  (Pixabay Content License) that are not in this repository; point `sfxDir` at your own folder of whoosh, impact, pop and click files.
- `vendor/three.module.js` is three.js r160 (MIT), used for the 3D board scenes.
