# Receiver: publish the app and your ComfyUI from your own machine

One device runs three things: ComfyUI, the gateway (`server/app.mjs`, which serves the app and protects ComfyUI), and a
Cloudflare tunnel. The public address (for example `open-source-canvas.yourdomain.com`) reaches the gateway through the
tunnel.

```
visitor ── https://open-source-canvas.yourdomain.com ── Cloudflare ── tunnel ── gateway :4173 ┬─ /          the app (public)
                                                                                         └─ /comfy/*   ComfyUI :8188 (needs the access key)
```

- **Online or offline follows the machine.** The app's ComfyUI badge asks the gateway for health. Machine off or tunnel down: the
  site does not answer from the device, the badge reads offline. Machine on: online.
- **Anyone can open the site and see the examples. Only people with the access key can generate.** Without the key the
  badge says "ComfyUI online · key needed" and every generation call is refused with 401. ComfyUI itself never leaves localhost.
- Costs you nothing but your machine's electricity: the models run on your GPU.

## Which device
The always-on desktop with a CUDA GPU beats a laptop: it does not sleep, and CUDA is fast for the video model. A laptop
works too (use `--listen` only on localhost, keep it plugged in and awake).

## 1. Install (no root)
In WSL or any Linux shell, from the repository root:

```bash
NODE_BIN=/path/to/node/bin ./deploy/receiver/install-wsl.sh --with-video   # NODE_BIN only if the system Node is older than 20
cat ~/.config/osc/access_key                      # the key to share with people you trust
```

## 2. Create the Cloudflare tunnel (dashboard steps, once)
1. Cloudflare dashboard, your zone, then **Zero Trust, Networks, Tunnels, Create a tunnel, Cloudflared**. Name it, for example, `open-source-canvas`.
2. Copy the **tunnel token** from the install command it shows (the long string after `--token`) into the receiver:
   ```bash
   mkdir -p ~/.config/osc && printf '%s' 'PASTE_TOKEN_HERE' > ~/.config/osc/tunnel_token && chmod 600 ~/.config/osc/tunnel_token
   ```
3. In the tunnel's **Public hostnames** tab add `open-source-canvas.yourdomain.com` with service `HTTP` and URL `localhost:4173`.
   Cloudflare creates the DNS record for you (the zone must be on Cloudflare).
4. Do not also add a Cloudflare Access policy unless you want a second login in front of the whole site; the access key already
   protects generation.

## 3. Run it
```bash
NODE_BIN=/path/to/node/bin ./deploy/receiver/run-receiver.sh
```
Open `https://open-source-canvas.yourdomain.com`. The badge should read ComfyUI online. Open the ComfyUI panel, paste the access
key into **Access key**, and generate. The key lives in the page for the session only and is never stored.

Logs are in `~/.local/state/osc/`. Ctrl-C stops everything.

## 4. Start it automatically
- **WSL on Windows.** WSL stops when idle unless told otherwise; set `vmIdleTimeout=-1` in `%UserProfile%\.wslconfig`
  (that needs your admin PowerShell, not this script). To start the receiver at logon without admin rights, create a Task
  Scheduler task for your user that runs:
  `wsl.exe -d <your distro> -u <you> -- bash -lc "~/open-source-canvas/deploy/receiver/run-receiver.sh"`.
  Also set Windows power options to never sleep while plugged in.
- **macOS.** Use `caffeinate -i ./deploy/receiver/run-receiver.sh` and a Login Item, or a LaunchAgent.

## What is exposed (and what is not)
- **Exposed:** one hostname, `open-source-canvas.yourdomain.com`, which Cloudflare forwards through the tunnel to the gateway on
  `127.0.0.1:4173` and nothing else. The tunnel is an outbound connection from your machine: no router port is opened, no
  inbound firewall rule is added, and the machine's IP is not published.
- **Not exposed:** ComfyUI (`127.0.0.1:8188`), your files, your other machines, and every other port. The gateway forwards only six
  ComfyUI endpoints (health, queue a prompt, history, view an output, upload an image, interrupt); everything else answers 404 even
  with the key.
- **Check it yourself** while the receiver runs: `./deploy/receiver/check-exposure.sh` lists listening sockets and flags any that are
  not loopback, and the tunnel's Public hostnames tab in Cloudflare should show exactly one row.
- Keep one tunnel per machine and do not add a "Private network" route to it. When you retire a hostname, delete it and its old tunnel
  in Cloudflare so that name can never point at another machine.

## Security notes
- The access key is a shared secret. Rotate it by editing `~/.config/osc/access_key` and restarting. Share it only with people you trust:
  a key holder can use your GPU.
- Do not expose ComfyUI's own port (8188) to anything. `--listen 127.0.0.1` keeps it local.
- The gateway also keeps each visitor's outputs separate and refuses queue listings.
- Hosted API models (LTX-2.5, Seedream and others) bill the Comfy credits of whatever account the ComfyUI is logged in to. The
  gateway key protects that spending too.
