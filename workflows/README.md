# Workflows

Framegraph runs **API-format** ComfyUI graphs. Export one from ComfyUI with **File → Export Workflow (API)**, then add a binding in `src/lib/comfyWorkflows.ts`.

## Included

| File | Engine | Notes |
|---|---|---|
| `sd-turbo.api.json` | SD-Turbo | 512×512, 4 steps, CFG 1.0. Requires `sd_turbo.safetensors`. |
| `ltx-video.api.json` | LTX-Video 2B distilled | Text-to-video, 512×512, 49 frames. Requires LTX 2B fp8 + T5 fp8. |

## Model locations

```text
ComfyUI/
  models/
    checkpoints/
      sd_turbo.safetensors
      ltxv-2b-0.9.8-distilled-fp8.safetensors
    text_encoders/
      t5xxl_fp8_e4m3fn.safetensors
```

## API format

Node keys are numeric strings. Link inputs are `[source_node_id, output_index]`.

```json
{
  "1": {
    "class_type": "CheckpointLoaderSimple",
    "inputs": { "ckpt_name": "sd_turbo.safetensors" }
  }
}
```

The app injects prompt, seed, size, duration and checkpoint into these graphs at run time.
