#!/usr/bin/env bash
set -euo pipefail

# Install a local ComfyUI next to this repo and download the Framegraph models.
# Usage:
#   ./scripts/setup-comfyui.sh              # image only (SD-Turbo)
#   ./scripts/setup-comfyui.sh --with-video # image + LTX-Video 2B distilled
#
# Requirements: git, curl, uv (https://docs.astral.sh/uv/), ~16 GB free disk.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMFY_DIR="${COMFY_DIR:-$ROOT/../comfyui}"
WITH_VIDEO=0
[[ "${1:-}" == "--with-video" ]] && WITH_VIDEO=1

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required. Install it from https://docs.astral.sh/uv/ and rerun." >&2
  exit 1
fi

if [[ ! -d "$COMFY_DIR/.git" ]]; then
  echo "Cloning ComfyUI into $COMFY_DIR"
  git clone --depth 1 https://github.com/comfyanonymous/ComfyUI.git "$COMFY_DIR"
fi

cd "$COMFY_DIR"
if [[ ! -x .venv/bin/python ]]; then
  echo "Creating Python 3.12 environment"
  uv venv --python 3.12 .venv
fi
uv pip install --python .venv/bin/python -r requirements.txt

mkdir -p models/checkpoints models/text_encoders

if [[ ! -f models/checkpoints/sd_turbo.safetensors ]]; then
  echo "Downloading SD-Turbo (~5.2 GB)"
  curl -L --fail --retry 3 -o models/checkpoints/sd_turbo.safetensors \
    https://huggingface.co/stabilityai/sd-turbo/resolve/main/sd_turbo.safetensors
fi

if [[ "$WITH_VIDEO" == "1" ]]; then
  if [[ ! -f models/checkpoints/ltxv-2b-0.9.8-distilled-fp8.safetensors ]]; then
    echo "Downloading LTX-Video 2B distilled fp8 (~4.5 GB)"
    curl -L --fail --retry 3 -o models/checkpoints/ltxv-2b-0.9.8-distilled-fp8.safetensors \
      https://huggingface.co/Lightricks/LTX-Video/resolve/main/ltxv-2b-0.9.8-distilled-fp8.safetensors
  fi
  if [[ ! -f models/text_encoders/t5xxl_fp8_e4m3fn.safetensors ]]; then
    echo "Downloading T5-XXL fp8 text encoder (~4.9 GB)"
    curl -L --fail --retry 3 -o models/text_encoders/t5xxl_fp8_e4m3fn.safetensors \
      https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp8_e4m3fn.safetensors
  fi
fi

cat <<MSG

ComfyUI is ready at: $COMFY_DIR
Start it with CORS enabled:

  cd "$COMFY_DIR"
  .venv/bin/python main.py --enable-cors-header

Then run the app:

  cd "$ROOT"
  npm install
  npm run dev

Open http://127.0.0.1:4173 and click the ComfyUI badge to connect.
MSG
