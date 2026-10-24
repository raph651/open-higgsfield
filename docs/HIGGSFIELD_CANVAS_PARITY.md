# Higgsfield Canvas → Framegraph feature audit

**Date:** 2026-10-22  
**Method:** public Canvas pages, Creator Hub help docs, launch coverage, team-plan page, and the user-provided dashboard screenshots. No authenticated account access was used. Signed-in-only details are marked unverified.

**Sources**

- [Higgsfield Canvas help: multi-node generation](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas)
- [Canvas intro page](https://higgsfield.ai/canvas-intro)
- [Public Canvas dashboard](https://higgsfield.ai/canvas)
- [Team plan](https://higgsfield.ai/team-plan)
- [AI Primer launch coverage](https://www.ai-primer.com/creative/stories/higgsfield-launches-canvas-node-graph-for-content-pipelines)
- [MXDIA launch coverage](https://www.mxdia.com/posts/34xA3Kb34eAk)

Legend: ✅ working · 🟡 partial/prototype · ❌ missing · 🔒 needs auth/team backend · ❓ unverified signed-in behavior

## 1. What Higgsfield Canvas actually is

A node-based infinite canvas for image/video production:

- Drop a prompt, image, or reference.
- Chain prompts, style transfers, motion nodes, and render outputs.
- Mix models in one graph and route outputs between them.
- Run one node, a sequence, or the whole pipeline.
- Run models in parallel and compare outputs.
- Save a workflow as a reusable template.
- Share a live canvas and collaborate in real time.
- Keep every version and asset attached to the project.
- Charge credits only when a node generates.

The launch material frames it as production infrastructure, not a single-user generator: shared folders, versioned assets, comments, chat, roles, and team billing sit around the graph.

## 2. Feature inventory and current parity

### A. Workspace / dashboard

| Feature | Higgsfield | Framegraph | Priority |
|---|---|---|---|
| All Canvases tab | ✅ | ✅ | — |
| Templates tab | ✅ | ✅ | — |
| Quick Start / starter templates | ✅ | 🟡 badge + 3 templates | P1 |
| Search canvases and templates | ✅ | ✅ | — |
| Create new canvas | ✅ | ✅ | — |
| Canvas card preview + last edited | ✅ | ✅ | — |
| Rename canvas | ✅ | ✅ editor title | — |
| Duplicate canvas | ✅ | ✅ preserves edges | — |
| Delete canvas | ✅ | ✅ | — |
| Folders / shared workspace | ✅ | ❌ | P2 |
| Sort, filter, favorites | likely ✅ | ❌ | P2 |
| Team/workspace switcher | ✅ | ❌ | P2 |
| Account/auth | ✅ | ❌ | P2 |
| Share link + access control | ✅ | 🟡 copies local URL only | P1 |
| Credits / plan / upgrade | ✅ | 🟡 demo counter only | P2 |
| Notifications / activity | likely ✅ | ❌ | P2 |
| Onboarding / help center | ✅ | 🟡 README + tooltips | P3 |

### B. Canvas editor

| Feature | Higgsfield | Framegraph | Priority |
|---|---|---|---|
| Infinite pan/zoom board | ✅ | ✅ | — |
| Dot grid / canvas controls | ✅ | ✅ | — |
| Add nodes from a palette | ✅ | ✅ click-to-add | P1 drag/drop |
| Drag nodes from palette to board | ✅ | ❌ | P1 |
| Connect nodes with typed ports | ✅ | ✅ | — |
| Cycle/duplicate-edge protection | likely ✅ | ✅ | — |
| Multi-select | ✅ | ✅ modifier-click and box select | — |
| Group / ungroup | likely ✅ | ✅ parent groups, move together | — |
| Copy / paste | ✅ | ✅ `⌘C` / `⌘V` | — |
| Duplicate node | ✅ | ✅ | — |
| Undo / redo | ✅ | ✅ `⌘Z` / `⌘⇧Z` | — |
| Delete node/edge | ✅ | ✅ | — |
| Node search / quick add | likely ✅ | ❌ | P2 |
| Minimap | likely ✅ | ✅ toggle | — |
| Fit / zoom controls | ✅ | ✅ | — |
| Right-click context menu | likely ✅ | ❌ | P2 |
| Keyboard shortcuts | ✅ | 🟡 run/save/delete/escape | P1 |
| Autosave | ✅ | ✅ localStorage | P1 cloud |
| Version history / restore | ✅ | ❌ | P1 |
| Node-level comments | ✅ | ❌ | P1 |
| Live cursors / presence | ✅ | ❌ | P1 |
| Built-in chat | ✅ | 🟡 local preview panel | P2 |
| Share / permissions | ✅ | 🟡 room link, no auth/roles | P1 |
| Export / import | likely ✅ | 🟡 JSON export only | P2 |
| Save canvas as template | ✅ | ✅ title menu + Templates shelf | — |

### C. Nodes and models

| Feature | Higgsfield | Framegraph | Priority |
|---|---|---|---|
| Prompt node | ✅ | ✅ | — |
| Image model node | ✅ | ✅ SD-Turbo | — |
| Video model node | ✅ | ✅ LTX draft | — |
| Edit / style-transfer node | ✅ | ❌ | P1 |
| Motion / camera node | ✅ | ❌ | P1 |
| Reference image node | ✅ | ✅ upload + canvas drag/drop | — |
| Audio node / audio reference | ✅ | ❌ | P2 |
| Output / render node | ✅ | ✅ | — |
| Note / sticky node | ✅ | ✅ | — |
| Groups / frames | likely ✅ | ❌ | P1 |
| Model catalog (Soul, Nano Banana, Kling, Seedance, Wan, Veo) | ✅ | 🟡 real names, 2 local workflows, 5 API seats | P1 |
| Per-model parameter schema | ✅ | 🟡 aspect/duration/seed | P1 |
| Resolution / camera / advanced params | ✅ | ❌ | P2 |
| Seed lock / randomize UI | ✅ | 🟡 numeric field only | P1 |
| Negative prompt | ✅ | 🟡 hardcoded | P2 |
| Prompt enhancement | likely ✅ | ❌ | P3 |
| Reference semantics (Seedance role, Kling start frame, audio) | ✅ | ❌ | P1 |
| `@element` tags / reusable characters | ✅ | ❌ | P2 |
| Start/end frame conditioning | ✅ | 🟡 first frame works, end frame not yet | P1 |
| Image-to-video | ✅ | ✅ local LTX, reference or upstream still as first frame | — |
| Image-to-image | ✅ | ✅ SD-Turbo img2img from a connected Image node | — |
| Video-to-video | ✅ | ❌ | P2 |
| Upscale / enhance | ✅ | ❌ | P2 |
| Audio sync / voice reference | ✅ | ❌ | P2 |
| Batch / multiple outputs | ✅ | ❌ | P1 |
| Cost estimate per node | ✅ | 🟡 static credits | P1 |

### D. Execution

| Feature | Higgsfield | Framegraph | Priority |
|---|---|---|---|
| Run single node | ✅ | ✅ | — |
| Run selected / downstream | ✅ | 🟡 selected branch, not downstream | P1 |
| Run whole graph | ✅ | ✅ | — |
| Sequential execution | ✅ | ✅ | — |
| Parallel branches | ✅ | ✅ max 2 concurrent | — |
| Queue view | ✅ | ❌ | P1 |
| Per-node progress | ✅ | 🟡 status, no percent | P1 |
| Cancel run | ✅ | ✅ interrupts ComfyUI | — |
| Retry failed node | ✅ | ✅ Generate becomes Retry on error | — |
| Compare outputs side by side | ✅ | 🟡 compare tray; runs still sequential | P0 |
| Output history / gallery | ✅ | ✅ last 8 per node + asset shelf | — |
| Run history / logs | ✅ | ❌ | P1 |
| Cached / skip unchanged nodes | ✅ | ❌ | P2 |
| Credit charge only on generation | ✅ | ✅ demo | — |
| Detailed errors | ✅ | 🟡 toast + node error | P1 |
| Batch run | ✅ | ❌ | P2 |

### E. Collaboration / assets

| Feature | Higgsfield | Framegraph | Priority |
|---|---|---|---|
| Asset library | ✅ | ✅ local drawer with search/filter | — |
| Upload images/audio to library | ✅ | 🟡 node-local only | P1 |
| Drag asset from library to canvas | ✅ | ✅ drag or click | — |
| Shared folders | ✅ | ❌ | P2 |
| Searchable / versioned assets | ✅ | ❌ | P2 |
| Real-time collaboration | ✅ | 🟡 doc sync, chat, presence; no cursors | P1 |
| Presence / cursors / selection | ✅ | ❌ | P1 |
| Node comments | ✅ | ❌ | P1 |
| Chat | ✅ | ❌ | P2 |
| Video calls | ✅ | ❌ | P2 |
| Roles / permissions | ✅ | ❌ | P2 |
| SSO / admin | ✅ | ❌ | P3 |
| Notifications | likely ✅ | ❌ | P3 |

### F. Integrations / ecosystem

| Feature | Higgsfield | Framegraph | Priority |
|---|---|---|---|
| Figma / FigJam plugin | ✅ | ❌ | P3 |
| MCP connector | ✅ | ❌ | P3 |
| Public API | ✅ | ❌ | P3 |
| Template marketplace / community | ✅ | ❌ | P3 |
| ComfyUI execution | ❌ | ✅ | our differentiator |

### G. Billing

| Feature | Higgsfield | Framegraph | Priority |
|---|---|---|---|
| Credit balance | ✅ | 🟡 demo | P2 |
| Per-model credit cost | ✅ | 🟡 model metadata | P1 |
| Charge only on successful generation | ✅ | 🟡 charges on completion | — |
| Plans / upgrade flow | ✅ | ❌ | P2 |
| Team shared credit pool | ✅ | ❌ | P2 |

## 3. The five gaps that matter most

1. **Image-to-video is now working.** The upstream still is uploaded to ComfyUI and passed through `LTXVImgToVideo`; the prompt controls motion. Next: end-frame and motion strength controls.
2. **No compare / parallel runs.** “Run multiple models side by side” is a headline Canvas feature. We run sequentially and show only one output per node.
3. **No asset library.** Everything is node-local. Higgsfield keeps a searchable, versioned asset layer and lets you drag assets into the graph.
4. **No template save.** We ship three templates but cannot save a finished graph back as a reusable template.
5. **No undo/redo, copy/paste, groups, or comments.** These are table stakes for a production canvas and the reason it feels like a prototype.

## 4. What “working like Higgsfield” should mean for the contest

Do not try to clone the enterprise surface before October 30. The judges need a working creative app, not a half-built Figma clone.

### P0 — must ship

- **Image-to-video**: SD-Turbo still → LTX first frame; prompt controls motion.
- **Compare mode**: run two image models or two seeds side by side, keep both outputs.
- **Asset shelf**: uploaded/generated images, drag to canvas, reuse in a graph.
- **Save as template**: name a canvas, thumbnail, instantiate later.
- **Undo/redo + copy/paste + group** for nodes.
- **Output history + retry** per node.
- **Share**: at minimum a real room URL with read-only/comment access, even if collaboration is local-first.

### P1 — high value if time

- Node comments.
- Presence / cursors via Yjs.
- Version history snapshots.
- Prompt enhancement.
- Per-model parameter schemas.
- `@element`-style character anchors.
- Run queue with progress.

### P2 — post-contest

- Auth, teams, RBAC, SSO.
- Shared folders, enterprise admin.
- Figma plugin, MCP, public API.
- Billing and plan enforcement.
- Video calls.

## 5. Seven-day build plan (Oct 22–30)

**Day 1 — image-to-video**
- Add `LTXVImgToVideo` workflow.
- Upload upstream image to ComfyUI `/upload/image`.
- LTX consumes the image as first frame; prompt controls motion.
- Fix duration/draft metadata.

**Day 2 — compare + execution**
- Add a compare tray: select two model nodes, run both, show A/B.
- Parallel branch execution.
- Retry failed nodes; output history.

**Day 3 — assets + templates**
- Asset shelf with uploads and generated outputs.
- Drag asset to canvas.
- Save canvas as template with thumbnail.

**Day 4 — canvas ergonomics**
- Undo/redo command stack.
- Copy/paste, group/ungroup, multi-select.
- Node quick-add search and context menu.

**Day 5 — collaboration**
- Yjs document + presence.
- Share room URL.
- Node comments (local/serverless first).

**Day 6 — polish**
- Version snapshots.
- Empty states, onboarding, keyboard shortcuts.
- Demo assets and example outputs.

**Day 7 — submission**
- Record the 2-minute demo.
- Final README, license, setup script.
- Publish repo + post with `#OpenSourceHiggsfield`.

## 6. Acceptance test for “does it feel like Canvas?”

A new user can:

1. Open the dashboard and pick a template.
2. Add a prompt and a reference.
3. Generate a still.
4. Feed the still into a video node.
5. Run two variants side by side.
6. Compare and keep the better output.
7. Drag the result into a new graph.
8. Save the graph as a template.
9. Reload and find the canvas, versions, and assets.
10. Share a link with a teammate.

That is the bar for the demo. Everything else is platform/enterprise work that can come after the contest.
