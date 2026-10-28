# Deploy Open Source Canvas on a Mac/PC with Cloudflare Tunnel + Access

This setup keeps ComfyUI private, serves the app and ComfyUI through one local
reverse proxy, and protects the public hostname with Cloudflare Access.

```
Internet
  └─ Cloudflare Access → open-source-canvas.yourdomain.com
       └─ cloudflared tunnel
            └─ server/app.mjs :4173
                 ├─ /        built app (dist)
                 └─ /comfy   http://127.0.0.1:8188
```

## 1. Build and run the app

```bash
npm install
npm run build
PORT=4173 npm run serve
```

`server/app.mjs` serves `dist` and proxies `/comfy/*` to ComfyUI on
`127.0.0.1:8188`. The production build uses `VITE_COMFY_BASE_URL=/comfy`
from `.env.production`. The ComfyUI port is never exposed directly.

Start ComfyUI separately, bound to localhost:

```bash
cd comfyui
.venv/bin/python main.py --enable-cors-header
```

CORS is not required for the proxy path, but the flag is harmless.

## 2. Create the tunnel

Cloudflare Access requires a hostname in a Cloudflare-managed zone. A
`trycloudflare.com` quick tunnel will **not** support Access.

```bash
brew install cloudflared
cloudflared tunnel login
cloudflared tunnel create open-source-canvas
cloudflared tunnel route dns open-source-canvas open-source-canvas.yourdomain.com
```

Copy `deploy/cloudflared.example.yml` to `~/.cloudflared/config.yml`, replace
the tunnel UUID and hostname, then:

```bash
cloudflared tunnel run open-source-canvas
```

To keep it running after logout:

```bash
sudo cloudflared service install
```

Disable sleep on the Mac/PC and keep `npm run serve` and ComfyUI running.

## 3. Give people access

Cloudflare dashboard → **Zero Trust → Access → Applications → Add an
application → Self-hosted**.

- Application name: `Open Source Canvas`
- Hostname: `open-source-canvas.yourdomain.com`
- Path: `/*`

Add a policy:

- Action: **Allow**
- Include: **Emails** (list people), **Emails ending in** (e.g.
  `@yourcompany.com`), or an Access **Group**.

Enable **One-time PIN** under Zero Trust → Settings → Authentication so guests
can log in with an emailed code. Google/GitHub can be added as identity
providers instead.

Share `https://open-source-canvas.yourdomain.com`. Visitors see the Cloudflare login,
then the app.

## 4. Revoke access

Zero Trust → Access → Groups: remove the person from the group, or remove their
email from the policy. Access sessions last until the configured session
duration expires.

## 5. Free-tier limits

Cloudflare Zero Trust covers up to 50 users on the free plan. The tunnel itself
is free. A custom domain is required for Access; Cloudflare Registrar or any
registrar works once the domain is on Cloudflare.

## Optional: Cloudflare Access service token for ComfyUI

If `COMFY_URL` points at a ComfyUI hostname protected by Access, create a
service token in Zero Trust → Access → Service Auth, add a **Service Auth**
policy to that Access application, and start the proxy with:

```bash
COMFY_URL=https://comfy.yourdomain.com \
CF_ACCESS_CLIENT_ID=... \
CF_ACCESS_CLIENT_SECRET=... \
npm run serve
```

The proxy adds `CF-Access-Client-Id` / `CF-Access-Client-Secret` server-side,
so the token is never shipped to the browser. For the local setup
(`COMFY_URL=http://127.0.0.1:8188`) no service token is needed.
