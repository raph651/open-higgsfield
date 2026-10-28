#!/usr/bin/env bash
# Installs everything the "receiver" needs under $HOME, with no root: Node (if missing), uv, cloudflared, ComfyUI and its models.
# Run it inside WSL (or any Linux box / Mac) from the repository root:  ./deploy/receiver/install-wsl.sh [--with-video]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BIN="$HOME/.local/bin"
mkdir -p "$BIN" "$HOME/.config/osc"
export PATH="${NODE_BIN:+$NODE_BIN:}$BIN:$PATH"   # NODE_BIN: a directory holding Node 20+ when the system one is older
WITH_VIDEO="${1:-}"

echo "== Node"
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo "Node 20 or newer is required. Install it (for example with nvm: https://github.com/nvm-sh/nvm) and rerun." >&2
  exit 1
fi
node -v

echo "== uv (Python manager)"
command -v uv >/dev/null 2>&1 || curl -LsSf https://astral.sh/uv/install.sh | sh

echo "== cloudflared"
if ! command -v cloudflared >/dev/null 2>&1; then
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64)  ASSET=cloudflared-linux-amd64 ;;
    Linux-aarch64) ASSET=cloudflared-linux-arm64 ;;
    *) echo "Install cloudflared for $(uname -sm) from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/" >&2; exit 1 ;;
  esac
  curl -L --fail -o "$BIN/cloudflared" "https://github.com/cloudflare/cloudflared/releases/latest/download/$ASSET"
  chmod +x "$BIN/cloudflared"
fi
cloudflared --version

echo "== App"
cd "$ROOT"
npm ci
npm run build

echo "== ComfyUI and models (about 16 GB with video)"
COMFY_DIR="${COMFY_DIR:-$HOME/comfyui}" "$ROOT/scripts/setup-comfyui.sh" $WITH_VIDEO

if [ ! -s "$HOME/.config/osc/access_key" ]; then
  umask 077
  head -c 24 /dev/urandom | base64 | tr -d '/+=' | head -c 32 > "$HOME/.config/osc/access_key"
  echo "== Created an access key at ~/.config/osc/access_key (print it with: cat ~/.config/osc/access_key)"
fi

cat <<'MSG'

Installed. Two things are left, both yours:
  1. Put your Cloudflare tunnel token in ~/.config/osc/tunnel_token (see deploy/receiver/README.md)
  2. Start it:  ./deploy/receiver/run-receiver.sh
MSG
