#!/usr/bin/env bash
# Runs the receiver: ComfyUI + the gateway (serves the app, protects /comfy with the access key) + the Cloudflare tunnel.
# If the machine is off, none of this runs, so the public site's ComfyUI badge reads offline. Ctrl-C stops all three.
# Each piece restarts by itself if it dies.   Usage: ./deploy/receiver/run-receiver.sh
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export PATH="${NODE_BIN:+$NODE_BIN:}$HOME/.local/bin:$PATH"   # NODE_BIN: a directory holding Node 20+ when the system one is older
COMFY_DIR="${COMFY_DIR:-$HOME/comfyui}"
KEY_FILE="$HOME/.config/osc/access_key"
TOKEN_FILE="$HOME/.config/osc/tunnel_token"
LOG_DIR="$HOME/.local/state/osc"
mkdir -p "$LOG_DIR"

[ -s "$KEY_FILE" ] || { echo "missing $KEY_FILE (run install-wsl.sh first)" >&2; exit 1; }
[ -s "$TOKEN_FILE" ] || { echo "missing $TOKEN_FILE: paste your Cloudflare tunnel token there (deploy/receiver/README.md)" >&2; exit 1; }
[ -x "$COMFY_DIR/.venv/bin/python" ] || { echo "ComfyUI not found at $COMFY_DIR (run install-wsl.sh)" >&2; exit 1; }
[ -f "$ROOT/dist/index.html" ] || { echo "dist/ missing: run npm run build in $ROOT" >&2; exit 1; }

keepalive() {   # keepalive <name> <command...>: restart on exit, log to a file
  local name="$1"; shift
  while true; do
    "$@" >>"$LOG_DIR/$name.log" 2>&1
    echo "$(date '+%F %T') $name exited, restarting in 5 s" >>"$LOG_DIR/$name.log"
    sleep 5
  done
}

pids=()
cleanup() { for p in "${pids[@]}"; do kill "$p" 2>/dev/null; done; pkill -P $$ 2>/dev/null; exit 0; }
trap cleanup INT TERM

# ComfyUI listens on localhost only; the gateway is the one public door
( cd "$COMFY_DIR" && keepalive comfyui .venv/bin/python main.py --listen 127.0.0.1 --port 8188 ) & pids+=($!)
( cd "$ROOT" && OSC_ACCESS_KEY="$(cat "$KEY_FILE")" HOST=127.0.0.1 PORT=4173 COMFY_URL=http://127.0.0.1:8188 keepalive gateway node server/app.mjs ) & pids+=($!)
( keepalive tunnel cloudflared tunnel --no-autoupdate run --token "$(cat "$TOKEN_FILE")" ) & pids+=($!)

echo "receiver running. logs: $LOG_DIR   stop: Ctrl-C"
echo "local check: curl -s http://127.0.0.1:4173/comfy/system_stats"
wait
