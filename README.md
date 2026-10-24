# Framegraph

**The graph is the studio.** An open-source node canvas that runs ComfyUI workflows: prompts, references and model adapters on one infinite board.

Built for **Comfy Org's Open Source Higgsfield challenge** — a working creative app on the Comfy Developer Platform, not a workflow export and not a UI clone.

- App surface: React + React Flow
- Engine: ComfyUI HTTP/WebSocket API
- Default image workflow: SD-Turbo on MPS/CUDA/CPU
- Video track: LTX-Video 2B distilled (working; draft mode on MPS)
- License: MIT

## Why this exists

Higgsfield promised to open source its platform. It didn't. Comfy Org's challenge asks for open rebuilds of creative apps on ComfyUI. Framegraph is our answer: a canvas where each node is a ComfyUI workflow, outputs flow downstream, and anyone can run the whole thing locally.

No Higgsfield code, copy, artwork or private endpoints are used.

## Quick start

### 0. Collaboration room (optional)

```bash
npm run room
```

This starts a local in-memory WebSocket room server on `:4180`. It syncs the canvas document, presence count and room chat. It is a demo sync layer: last-write-wins, no auth, no cursor presence. Production should replace it with Yjs + a real database.

### 1. ComfyUI

The repo expects a local ComfyUI at `http://127.0.0.1:8188`.

```bash
git clone https://github.com/comfyanonymous/ComfyUI.git comfyui
cd comfyui
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt
```

Put a checkpoint in `ComfyUI/models/checkpoints`. This build defaults to **SD-Turbo**:

```bash
curl -L -o models/checkpoints/sd_turbo.safetensors \
  https://huggingface.co/stabilityai/sd-turbo/resolve/main/sd_turbo.safetensors
```

Start ComfyUI with CORS enabled:

```bash
.venv/bin/python main.py --enable-cors-header
```

ComfyUI defaults to port `8188`. Open `http://127.0.0.1:8188` once to confirm it boots.

### 2. Framegraph

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4173`.

Click the **ComfyUI** badge in the header. The connection panel should show `Connected`, `mps`/`cuda`, the ComfyUI version and unified memory. If it shows offline, check the base URL and the `--enable-cors-header` flag.

### 3. First render

1. Create a canvas.
2. Add a **Prompt** node and a **Model** node.
3. Drag from the prompt’s right handle into the model’s left handle.
4. Select the model, write a direction, click **Render node**.

The model queues an API-format ComfyUI graph, polls `/history`, and displays the resulting `/view` image. A 512×512 SD-Turbo render takes roughly 10–20s on an Apple M5 Pro with MPS; CUDA is faster.

## What works

- Studio dashboard with saved canvases, search, templates, duplicate/delete, model library.
- Infinite canvas with pan, zoom, snap, multi-select and typed connections.
- Prompt, Model, **Image** (drag/drop or click to upload), Output and Note nodes.
- **Image-to-image**: connected images upload to ComfyUI and re-sample through SD-Turbo with partial denoise.
- **Image-to-video**: the connected still uploads to ComfyUI and becomes LTX's first frame.
- Compare tray, save-as-template, full-bleed structural canvas shell and floating generation panel.
- **Add-node menu**: searchable palette with Prompt, Image/Video Generator, Voice/LLM placeholders, Page, Upload, Assets and per-model rows. Image/Video Generator create full generation cards with inline prompts.
- **Generation panel**: references, prompt, model, resolution, aspect, duration, batch size, audio toggle and advanced seed controls.
- **Canvas editing**: undo/redo, multi-select, copy/paste, group/ungroup, drag nodes, delete and search.
- **Shortcuts**: `⌘Z` / `⌘⇧Z`, `⌘C` / `⌘V`, `⌘G` / `⌘⇧G`, `⌘K` search.
- Cycle detection, duplicate-edge rejection, per-node status, cancel and credit estimates.
- ComfyUI provider: `POST /prompt`, history polling, `/view` outputs, `/interrupt` cancellation, `/upload/image` ready for image-to-video.
- Connection panel for local ComfyUI or Comfy Cloud endpoint + API key.
- Deterministic mock provider for UI development without a GPU.
- Autosave to `localStorage`, JSON export, responsive mobile layout.
- Keyboard: `⌘/Ctrl + Enter` run, `⌘/Ctrl + S` save, `Esc` clear selection, `Delete` remove.

## Architecture

```text
src/
  components/
    Dashboard.tsx        studio shell, library, templates
    HeroGraph.tsx        live workflow preview
    CanvasEditor.tsx     React Flow board, toolbar, shortcuts
    CanvasNodeView.tsx   custom node renderer
    Inspector.tsx        prompt/image/output settings
    GenerationPanel.tsx  model prompt, model, duration, seed, generate
    NodePalette.tsx      add nodes / models
    CompareModal.tsx     side-by-side output tray
    SideRail.tsx         workspace navigation
    ConnectionModal.tsx  ComfyUI base URL / API key / checkpoint
    ProviderBadge.tsx    live connection status
  lib/
    comfy.ts             ComfyUI client: /prompt, /history, /view, /upload/image
    comfyProvider.ts     Provider implementation for ComfyUI
    comfyWorkflows.ts    API-format SD-Turbo workflow + bindings
    providers.ts         Provider interface, model router, mock fallback
    modelWrappers.ts     External model registry (Seedance, LTX-2.3, etc.)
    artwork.ts           deterministic SVG art for demo mode
    format.ts
  store/
    useCanvasStore.ts    graph documents, commands, run engine, persistence
    useRoomStore.ts      room join/leave and presence
    useSettingsStore.ts  ComfyUI connection settings
  data.ts                model catalog, node metadata, templates
server/
  room.mjs               local WebSocket room server
workflows/
  sd-turbo.api.json      runnable API-format reference workflow
```

The graph document is plain JSON: `{ id, title, updatedAt, nodes, edges }`. Each model node maps to a ComfyUI workflow. Add a workflow by exporting **File → Export Workflow (API)** from ComfyUI, dropping it in `workflows/`, and adding bindings in `src/lib/comfyWorkflows.ts`.

## Models

| Model | Family | Runtime | Status |
|---|---|---|---|
| SD-Turbo | image | ComfyUI local | Working on MPS |
| LTX-Video 2B | video | ComfyUI local | Working in draft mode |
| Nano Banana Pro | image | API wrapper | Seat ready, wrapper not connected |
| Soul 2.0 | image | API wrapper | Seat ready, wrapper not connected |
| LTX-2.3 | video | API wrapper | Seat ready, wrapper not connected |
| Seedance 2.0 | video | API wrapper | Seat ready, wrapper not connected |
| Seedance 2.5 | video | API wrapper | Seat ready, wrapper not connected |

Local models run through ComfyUI. API models route through `src/lib/modelWrappers.ts`; until a wrapper is registered they fail with a clear “wrapper required” message, not a fake render.

**API keys never go in the Vite bundle.** Add a local/serverless proxy that holds the key, then implement the wrapper in `src/lib/modelWrappers.ts`. The UI and graph schema stay the same.

Measured LTX local draft on an M5 Pro (24 GB, MPS): 17 frames at 256×256 in ~100 seconds. 512×512 and longer clips are several minutes; use Comfy Cloud for a faster demo. The 13B/22B LTX models do not fit comfortably in 24 GB.

### LTX on a MacBook

LTX-Video 2B distilled fp8 is ~4.5 GB; the T5-XXL fp8 encoder is ~4.9 GB. Both fit in 24 GB unified memory. Measured on an M5 Pro (24 GB, MPS):

- 256×256, 17 frames, 4 steps: **~102 seconds** per clip
- 512×512, 49 frames, 8 steps: several minutes; use Comfy Cloud if you need a faster demo

The app defaults to **Fast local video** (256×256, 17 frames, 4 steps). Turn it off in the connection panel for 512×512 and longer clips on a fast GPU. The 13B/22B LTX models do not fit comfortably in 24 GB.

## Contest

- Event: [Open Source Higgsfield](https://comfy.org/open-source-higgsfield)
- Deadline: **October 30, 2026, 9am PT**
- Requirements: working app, Comfy API/Router/SDK, open-source repo, setup docs, ≤2-minute demo
- Rules: lawful, SFW, no unlicensed IP or likenesses
- Submission: repo + demo video + optional live link + social post with `#OpenSourceHiggsfield`

## License

MIT. See [LICENSE](./LICENSE).

Built with [ComfyUI](https://github.com/comfyanonymous/ComfyUI), [React Flow](https://reactflow.dev/) (MIT), React, Vite and Zustand.
