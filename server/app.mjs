import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(root, '..', 'dist');
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const comfyUrl = new URL(process.env.COMFY_URL || 'http://127.0.0.1:8188');
const comfyKey = process.env.COMFY_API_KEY || '';
const cfAccessId = process.env.CF_ACCESS_CLIENT_ID || '';
const cfAccessSecret = process.env.CF_ACCESS_CLIENT_SECRET || '';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
};

const promptOwners = new Map();

function cookieValue(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function clientIdFor(req) {
  const raw = req.headers['x-openframe-client'];
  const header = Array.isArray(raw) ? raw[0] : raw;
  const value =
    typeof header === 'string' && header
      ? header
      : cookieValue(req, 'openframe_client');
  return typeof value === 'string' && /^[a-zA-Z0-9-]{8,64}$/.test(value) ? value : null;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function comfyHeaders(req, extra = {}) {
  const headers = { ...req.headers, host: comfyUrl.host, ...extra };
  delete headers.cookie;
  delete headers.origin;
  if (comfyKey) headers.authorization = `Bearer ${comfyKey}`;
  if (cfAccessId && cfAccessSecret) {
    headers['cf-access-client-id'] = cfAccessId;
    headers['cf-access-client-secret'] = cfAccessSecret;
  }
  return headers;
}

function requestComfy(method, targetPath, headers, body) {
  return new Promise((resolve, reject) => {
    const upstream = http.request(
      {
        protocol: comfyUrl.protocol,
        hostname: comfyUrl.hostname,
        port: comfyUrl.port || 80,
        method,
        path: targetPath,
        headers,
      },
      (upstreamRes) => {
        const chunks = [];
        upstreamRes.on('data', (chunk) => chunks.push(chunk));
        upstreamRes.on('end', () =>
          resolve({
            status: upstreamRes.statusCode || 502,
            headers: upstreamRes.headers,
            body: Buffer.concat(chunks),
          }),
        );
      },
    );
    upstream.on('error', reject);
    if (body) upstream.write(body);
    upstream.end();
  });
}

function scopeFilenamePrefixes(value, client) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) scopeFilenamePrefixes(item, client);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === 'filename_prefix' && typeof child === 'string') {
      value[key] = `openframe/${client}/${child.replace(/^\/+/, '')}`;
    } else {
      scopeFilenamePrefixes(child, client);
    }
  }
}

function promptClient(entry) {
  const extra = entry?.prompt?.[3];
  return typeof extra?.client_id === 'string' ? extra.client_id : null;
}

function sendJson(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': body.length,
    'cache-control': 'no-store',
  });
  res.end(body);
}

async function proxyPrompt(req, res, targetPath) {
  const client = clientIdFor(req);
  const raw = await readBody(req);
  let payload;
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON' });
    return;
  }
  if (payload?.prompt) scopeFilenamePrefixes(payload.prompt, client || 'shared');
  if (client) payload.client_id = client;

  const body = Buffer.from(JSON.stringify(payload));
  const headers = comfyHeaders(req, {
    'content-type': 'application/json',
    'content-length': body.length,
  });
  const upstream = await requestComfy('POST', targetPath, headers, body);
  const text = upstream.body.toString('utf8');
  if (client) {
    try {
      const data = JSON.parse(text);
      if (data?.prompt_id) promptOwners.set(data.prompt_id, client);
    } catch {
      // Keep the upstream response even if it is not JSON.
    }
  }
  res.writeHead(upstream.status, {
    'content-type': upstream.headers['content-type'] || 'application/json; charset=utf-8',
    'content-length': upstream.body.length,
    'cache-control': 'no-store',
  });
  res.end(upstream.body);
}

async function proxyHistory(req, res, targetPath) {
  const client = clientIdFor(req);
  const upstream = await requestComfy('GET', targetPath, comfyHeaders(req), null);
  if (!client) {
    sendJson(res, 200, {});
    return;
  }
  let data;
  try {
    data = JSON.parse(upstream.body.toString('utf8'));
  } catch {
    sendJson(res, 502, { error: 'Invalid history response' });
    return;
  }

  if (targetPath === '/history') {
    const filtered = {};
    for (const [id, entry] of Object.entries(data || {})) {
      if (promptOwners.get(id) === client || promptClient(entry) === client) filtered[id] = entry;
    }
    sendJson(res, 200, filtered);
    return;
  }

  const id = Object.keys(data || {})[0];
  if (id && (promptOwners.get(id) === client || promptClient(data[id]) === client)) {
    sendJson(res, 200, { [id]: data[id] });
  } else {
    sendJson(res, 200, {});
  }
}

function proxyView(req, res, incoming) {
  const client = clientIdFor(req);
  const type = incoming.searchParams.get('type') || 'output';
  const subfolder = incoming.searchParams.get('subfolder') || '';
  if (type !== 'input' && (!client || !subfolder.includes(`openframe/${client}`))) {
    sendJson(res, 403, { error: 'Not your output' });
    return;
  }
  const upstream = http.request(
    {
      protocol: comfyUrl.protocol,
      hostname: comfyUrl.hostname,
      port: comfyUrl.port || 80,
      method: 'GET',
      path: `${incoming.pathname.replace(/^\/comfy/, '')}${incoming.search}`,
      headers: comfyHeaders(req),
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );
  upstream.on('error', () => sendJson(res, 502, { error: 'ComfyUI unavailable' }));
  upstream.end();
}

async function proxyComfy(req, res) {
  const incoming = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const targetPath = incoming.pathname.replace(/^\/comfy/, '') || '/';

  try {
    if (targetPath === '/prompt' && req.method === 'POST') {
      await proxyPrompt(req, res, targetPath);
      return;
    }
    if (req.method === 'GET' && (targetPath === '/history' || /^\/history\/[^/]+$/.test(targetPath))) {
      await proxyHistory(req, res, targetPath);
      return;
    }
    if (req.method === 'GET' && targetPath === '/view') {
      proxyView(req, res, incoming);
      return;
    }
    if (req.method === 'GET' && targetPath === '/queue') {
      sendJson(res, 403, { error: 'Queue listing is private' });
      return;
    }
  } catch (error) {
    sendJson(res, 502, { error: `ComfyUI proxy failed: ${error.message}` });
    return;
  }

  const upstream = http.request(
    {
      protocol: comfyUrl.protocol,
      hostname: comfyUrl.hostname,
      port: comfyUrl.port || 80,
      method: req.method,
      path: `${targetPath}${incoming.search}`,
      headers: comfyHeaders(req),
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );

  upstream.on('error', (error) => {
    sendJson(res, 502, { error: `ComfyUI proxy failed: ${error.message}` });
  });

  req.pipe(upstream);
}

function serveStatic(req, res) {
  const incoming = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const requested = decodeURIComponent(incoming.pathname);
  const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
  let file = path.resolve(dist, relative);

  if (!file.startsWith(dist + path.sep) && file !== path.join(dist, 'index.html')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!existsSync(file) || !statSync(file).isFile()) {
    if (path.extname(requested)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    file = path.join(dist, 'index.html');
  }

  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    // only Vite's content-hashed files under /assets/ are immutable; templates, the banner and other public files can change under the same name
    'cache-control': file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  createReadStream(file).pipe(res);
}

if (!existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/index.html is missing. Run `npm run build` first.');
  process.exit(1);
}

http
  .createServer((req, res) => {
    if ((req.url || '').startsWith('/comfy')) {
      proxyComfy(req, res);
      return;
    }
    serveStatic(req, res);
  })
  .listen(port, host, () => {
    console.log(`Open Source Canvas running at http://${host}:${port}`);
    console.log(`ComfyUI proxy /comfy -> ${comfyUrl.href}`);
  });
