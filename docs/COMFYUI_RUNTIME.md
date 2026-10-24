# How Framegraph uses ComfyUI

Framegraph is a **custom canvas front-end over the ComfyUI API**. It is not a ComfyUI UI clone, and it does not reimplement diffusion. Every local render is a ComfyUI workflow submitted to a running ComfyUI server.

## Request flow

```text
Canvas model node
  → ModelRouter           src/lib/providers.ts
  → ComfyProvider         src/lib/comfyProvider.ts
  → ComfyClient           src/lib/comfy.ts
      POST /prompt        API-format workflow JSON
      GET  /history/:id   poll execution status
      GET  /view          fetch the output image/video
      POST /upload/image  first frame for LTX image-to-video
      POST /interrupt     cancel a run
```

## Workflows

All three are API-format ComfyUI graphs:

| Workflow | Builder | Nodes |
|---|---|---|
| SD-Turbo text-to-image | `sdTurboWorkflow()` | CheckpointLoaderSimple, CLIPTextEncode, EmptyLatentImage, KSampler, VAEDecode, SaveImage |
| SD-Turbo image-to-image | `sdTurboImg2ImgWorkflow()` | LoadImage, VAEEncode, KSampler (denoise 0.55), VAEDecode, SaveImage |
| LTX text-to-video | `ltxVideoWorkflow()` | CLIPLoader, CheckpointLoaderSimple, EmptyLTXVLatentVideo, LTXVScheduler, SamplerCustom, VAEDecode, CreateVideo, SaveVideo |
| SD-Turbo image-to-image | `sdTurboImg2ImgWorkflow()` | LoadImage, VAEEncode, KSampler (denoise 0.55), VAEDecode, SaveImage |
| LTX image-to-video | `ltxImageToVideoWorkflow()` | LoadImage, LTXVImgToVideo, LTXVScheduler, SamplerCustom, VAEDecode, CreateVideo, SaveVideo |

Source: `src/lib/comfyWorkflows.ts`. Static reference copies: `workflows/*.api.json`.

## Proof it is live

- The top-right badge reads **ComfyUI 0.42.0** when connected.
- `GET http://127.0.0.1:8188/system_stats` returns the MPS device and 24 GB unified memory.
- Image renders return from `/history` and appear via `/view`.
- LTX image-to-video uploads the upstream still to `/upload/image`, then submits `LTXVImgToVideo`.
- The app refuses to run local models if ComfyUI is offline instead of pretending.

## What is not ComfyUI

The **API seats** — Seedance 2.0/2.5, LTX-2.3, Nano Banana Pro, Soul 2.0 — are optional external wrappers. They are marked `runtime: 'api'`, route through `src/lib/modelWrappers.ts`, and fail with “API wrapper required” until connected. They are not part of the ComfyUI demo path.

The mock provider is only used when **Use ComfyUI** is switched off. With the default settings, local models run on ComfyUI.

## Contest eligibility

The rules allow the **Comfy API, Comfy Router, and/or the Comfy SDK**. A custom canvas calling the local Comfy API is eligible; the canvas does not have to be ComfyUI’s node editor. The submission should demonstrate:

1. ComfyUI running locally.
2. A still generated through `/prompt`.
3. An image-to-video clip generated through `LTXVImgToVideo`.
4. The workflow JSON in the repo.
5. The README setup steps and MIT license.

For an unambiguous judge experience, use **local models only** in the demo and hide or disable the API seats until the wrappers are connected.

## Verify in one minute

```bash
curl http://127.0.0.1:8188/system_stats
```

In the app, the badge must say `ComfyUI 0.42.0`. Then run a model node and check ComfyUI’s queue/history; the same prompt ID should appear in `/history`.
