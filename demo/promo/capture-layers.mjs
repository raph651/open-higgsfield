// Cuts OpenFrame's board UI into separate transparent layers for the three.js scenes: background grid,
// every node (compact and, for the model node, selected), the generation panel, the add-node menu and the
// chrome (top bar, dock, zoom, credits). Captured at 3x from the local build, no injected state.
//   node demo/promo/capture-layers.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outRoot = path.join(here, 'layers');
const BASE = process.env.OPENFRAME_URL || 'http://127.0.0.1:4173';
const DSF = 3, M = 22;   // capture scale, margin around each layer (css px) so shadows and ports survive

const CHROME = '.canvas-topbar, .canvas-dock, .canvas-footer, .canvas-credits, .demo-mode, .toast, [class*="credits"], [class*="zoom"], [class*="topbar"], [class*="toolbar"], [class*="dock"], .react-flow__controls, .react-flow__minimap';
const TRANSPARENT = 'html, body, #root, #root > *, .app, .editor, .editor--canvas, .canvas-stage, .flow, .react-flow, .react-flow__pane, .react-flow__renderer, .react-flow__viewport { background: transparent !important; background-image: none !important; }';
const hide = (sel) => `${sel} { visibility: hidden !important; }`;

const boards = [['framejutsu', /Music Video/i, 'LTX-2.5'], ['marketing', /Marketing Studio/i, 'Seedream 5.0 Pro']];
const browser = await chromium.launch();
const manifest = {};

for (const [slug, card, model] of boards) {
  const dir = path.join(outRoot, slug);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: DSF });
  await ctx.addInitScript(() => localStorage.setItem('framegraph-theme', JSON.stringify({ state: { theme: 'dark' }, version: 0 })));
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.getByText(card).first().click();
  await page.waitForSelector('.react-flow__node');
  await page.waitForTimeout(2200);
  await page.evaluate(() => document.querySelectorAll('video').forEach((v) => { v.pause(); v.currentTime = 0; }));
  await page.mouse.move(5, 5);

  const style = async (css) => page.addStyleTag({ content: css });
  const unstyle = async (h) => h.evaluate((e) => e.remove());
  const shot = (name, opts = {}) => page.screenshot({ path: path.join(dir, name), ...opts });
  const clip = (r, m = M) => ({ x: Math.max(0, r.x - m), y: Math.max(0, r.y - m), width: Math.min(1440, r.x + r.w + m) - Math.max(0, r.x - m), height: Math.min(900, r.y + r.h + m) - Math.max(0, r.y - m) });
  const rectOf = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };

  const nodes = await page.evaluate(() => [...document.querySelectorAll('.react-flow__node')].map((n) => {
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    return { id: n.getAttribute('data-id'), title: n.innerText.split('\n')[0], rect: r(n), media: r(n.querySelector('.node__media')) };
  }));
  const info = { nodes, layers: {} };

  // 1 background: grid and page gradient only
  let h = await style(hide('.react-flow__node, .react-flow__edges, .react-flow__edge, .generation-panel') + hide(CHROME));
  await shot('bg.png'); await unstyle(h);

  // 2 chrome only, on transparency
  h = await style(TRANSPARENT + hide('.react-flow__node, .react-flow__edges, .react-flow__background, .generation-panel'));
  await shot('chrome.png', { omitBackground: true }); await unstyle(h);

  // 3 each node alone, on transparency
  for (let i = 0; i < nodes.length; i++) {
    h = await style(TRANSPARENT + hide(CHROME) + hide('.react-flow__edges, .react-flow__background') + nodes.map((n, j) => (j === i ? '' : `.react-flow__node[data-id="${n.id}"] { visibility: hidden !important; }`)).join('\n'));
    await shot(`node-${i}.png`, { omitBackground: true, clip: clip(nodes[i].rect) });
    await unstyle(h);
  }

  // 4 select the model node: expanded node, then the panel
  await page.locator('.react-flow__node').filter({ hasText: model }).first().click();
  await page.waitForTimeout(1000);
  await page.evaluate(() => document.querySelectorAll('video').forEach((v) => { v.pause(); v.currentTime = 0; }));
  await page.mouse.move(5, 5);
  const mi = nodes.findIndex((n) => n.title.includes(model));
  const sel = await page.evaluate((id) => { const n = document.querySelector(`.react-flow__node[data-id="${id}"]`); const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }; return { rect: r(n), media: r(n.querySelector('.node__media')) }; }, nodes[mi].id);
  h = await style(TRANSPARENT + hide(CHROME) + hide('.react-flow__edges, .react-flow__background, .generation-panel') + nodes.map((n, j) => (j === mi ? '' : `.react-flow__node[data-id="${n.id}"] { visibility: hidden !important; }`)).join('\n'));
  await shot('node-sel.png', { omitBackground: true, clip: clip(sel.rect, 30) });
  await unstyle(h);
  const panel = await page.evaluate(() => { const b = document.querySelector('.generation-panel').getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
  h = await style(TRANSPARENT + hide(CHROME) + hide('.react-flow__node, .react-flow__edges, .react-flow__background'));
  await shot('panel.png', { omitBackground: true, clip: clip(panel, 30) });
  await unstyle(h);
  info.selected = { index: mi, ...sel, clipMargin: 30 };
  info.panel = { ...panel, clipMargin: 30 };

  // 5 the add-node menu
  await page.locator('.react-flow__pane').click({ position: { x: 700, y: 120 } });
  await page.getByRole('button', { name: 'Add node' }).click();
  await page.waitForTimeout(900);
  const menu = await page.evaluate(() => { let e = document.querySelector('input[placeholder="Search"]'); while (e && e.parentElement) { const b = e.getBoundingClientRect(); if (b.width > 220 && b.width < 480 && b.height > 250) break; e = e.parentElement; } const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
  h = await style(TRANSPARENT + hide(CHROME) + hide('.react-flow__node, .react-flow__edges, .react-flow__background, .generation-panel'));
  await shot('menu.png', { omitBackground: true, clip: clip(menu, 30) });
  await unstyle(h);
  info.menu = { ...menu, clipMargin: 30 };
  info.margin = M;
  manifest[slug] = info;
  await ctx.close();
  console.log(slug, nodes.map((n) => n.title).join(' | '));
}
fs.writeFileSync(path.join(outRoot, 'layers.js'), `globalThis.LAYERS = ${JSON.stringify(manifest)};\n`);
await browser.close();
