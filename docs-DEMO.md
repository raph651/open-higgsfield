# Demo video outline (≤ 2 minutes)

**0:00–0:12 — The problem**
Higgsfield promised to open source its platform. It didn't. Comfy Org's challenge asks for open rebuilds on ComfyUI.

**0:12–0:25 — The app**
Framegraph: a node canvas where every node is a ComfyUI workflow. Show the studio dashboard, saved canvases and templates.

**0:25–0:45 — Build a pipeline**
New canvas → Prompt node → SD-Turbo image node → connect them. Show the connection panel proving `ComfyUI 0.42.0 · mps · 24 GB`.

**0:45–1:10 — Real render**
Run the image node. Show the ComfyUI queue/history and the result appearing on the canvas. Open the inspector to show model, aspect, seed and cost.

**1:10–1:35 — Video**
Add an LTX-Video 2B node after the SD-Turbo still, connect the still into it, and run it. The still becomes the first frame; the prompt controls motion. Note the local draft setting (256×256, 17 frames) and show the MP4 output playing in the node.

**1:35–1:50 — Open source**
Show the repo, MIT license, `workflows/` JSON, `scripts/setup-comfyui.sh`, and the README setup section.

**1:45–1:55 — Share**
Click Share, open the `#room=...` link in a second tab, and show the `Live · 2` presence pill plus a synced title change.

**1:55–2:00 — Close**
“The canvas is the app. ComfyUI is the engine. Fork it, self-host it, keep your outputs.”
