# Adding a local model

A local model runs through your own ComfyUI. Adding one takes four small edits and one check. Nothing here touches the canvas UI: the pickers, the Models page and the install checker read the model list.

## 1. Make it run in ComfyUI first

Put the model files in the ComfyUI folders they belong in, and run the model once in ComfyUI itself (a template workflow is fine). If it does not run there, it will not run here.

Then export the working graph: in ComfyUI turn on **Settings → Dev mode → Enable dev mode options**, and use **Save (API Format)**. That JSON is what this app sends.

## 2. Add the model

In `src/types.ts`, add its id to `ModelId`:

```ts
| 'my-model'
```

In `src/data.ts`, add an entry to `MODELS`:

```ts
{
  id: 'my-model',
  name: 'My Model',
  family: 'video',            // or 'image'
  runtime: 'comfyui',
  blurb: 'One line: what it makes and what it needs.',
  accent: '#7ad7ff',
  resolutions: ['480p', '720p'],   // the options offered in the node
  eta: { label: '~2 min', note: 'Where this number comes from.' },   // optional rough guide
  install: {                       // optional: makes the app check the files and show Install
    docs: 'https://…',
    files: [
      { node: 'UNETLoader', field: 'unet_name', file: 'my_model.safetensors', folder: 'models/diffusion_models', url: 'https://…', size: '10 GB' },
    ],
  },
},
```

`install.files[].node` and `field` are the ComfyUI loader node and input that list that kind of file (for example `UNETLoader` / `unet_name`, `CLIPLoader` / `clip_name`, `VAELoader` / `vae_name`, `LoraLoaderModelOnly` / `lora_name`). The app asks ComfyUI which files it can see; if one is missing the model shows an **Install** badge and opens the download steps.

## 3. Add the workflow

In `src/lib/comfyWorkflows.ts`, add a function that returns the API-format graph with the values that change filled in: prompt, seed, width and height, frame count, and the loader file names. `wan22Ti2vWorkflow` is a complete example. For sizes use `sizeForImageTier` or `sizeForVideoTier`, so the node's resolution and aspect ratio apply.

## 4. Route to it

In `src/lib/comfyProvider.ts`, add a branch for your model id that builds the graph with the request's `prompt`, `aspect`, `resolution`, `duration` and `seed`. "Number of generations" is handled for you: the provider calls your builder once per render with a different seed.

If a model cannot run from a plain graph yet, set `workflow: false` on its entry. It is then listed and its files are checked, and running it explains what is missing.

## 5. Check it

```bash
npm run build
```

To test the graph without loading the model, start ComfyUI and send the JSON to `POST /prompt`. ComfyUI's validator answers with the exact node and input that is wrong, and with `Value not in list` for model files you have not installed.

## API models

Models that run on a provider's servers (`runtime: 'api'`) are not listed here. They need a wrapper in `src/lib/modelWrappers.ts`; see **API models** in the README.
