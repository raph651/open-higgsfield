// Captures OpenFrame's own pages (dark theme) as a visitor sees them: no injected state. Defaults to the local build,
// which serves our own template media; set OPENFRAME_URL to capture a deployment instead.
// Output: demo/promo/site/*.png (2x) plus rects.js. The dashboard is one tall plate so the promo can scroll it.
//   node demo/promo/capture-live.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, 'site');
fs.mkdirSync(outDir, { recursive: true });
const BASE = process.env.OPENFRAME_URL || 'http://127.0.0.1:4173';
const rects = {};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => localStorage.setItem('framegraph-theme', JSON.stringify({ state: { theme: 'dark' }, version: 0 })));
const page = await ctx.newPage();
const shot = (name) => page.screenshot({ path: path.join(outDir, name) });
const box = async (name, loc) => { const b = await loc.first().boundingBox(); if (b) rects[name] = b; };

// dashboard as one tall plate
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const total = await page.evaluate(() => document.querySelector('.home').scrollHeight);
await page.setViewportSize({ width: 1440, height: total });
await page.waitForTimeout(1500);
await box('toggleTemplates', page.getByRole('button', { name: /^Templates\s*\d*$/ }).last());
await box('newCanvas', page.getByRole('button', { name: /New canvas/ }).first());
await shot('dash.png');
await page.getByText('Templates', { exact: false }).filter({ hasText: /^Templates\s*3?$/ }).last().click().catch(async () => { await page.locator('button:has-text("Templates")').last().click(); });
await page.waitForTimeout(1000);
await box('useTemplate', page.getByText('Product film'));
await shot('dash-templates.png');
await page.setViewportSize({ width: 1440, height: 900 });

// the two example boards from the main page cards
const boards = [['framejutsu', 'Music Video', 'LTX-2.5'], ['marketing', 'Marketing Studio', 'Seedream 5.0 Pro']];
for (const [slug, card, model] of boards) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.getByText(new RegExp(card, 'i')).first().click();
  await page.waitForSelector('.react-flow__node');
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.querySelectorAll('video').forEach((v) => { v.pause(); v.currentTime = 0; }));
  await page.waitForTimeout(400);
  await shot(`${slug}-open.png`);
  rects[slug] = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.react-flow__node')].map((n) => {
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    return [n.innerText.split('\n')[0], { node: r(n), media: r(n.querySelector('.node__media')) }];
  })));
  await page.locator('.react-flow__node').filter({ hasText: model }).first().click();
  await page.waitForTimeout(1000);
  await page.evaluate(() => document.querySelectorAll('video').forEach((v) => { v.pause(); v.currentTime = 0; }));
  await shot(`${slug}-select.png`);
  const g = await page.getByRole('button', { name: /^Generate/ }).last().boundingBox();
  rects[slug]._generate = g;
  await page.getByRole('button', { name: 'Add node' }).click();
  await page.waitForTimeout(900);
  await shot(`${slug}-add.png`);
}
fs.writeFileSync(path.join(outDir, 'rects.json'), JSON.stringify(rects, null, 2));
fs.writeFileSync(path.join(outDir, 'rects.js'), `globalThis.RECTS = ${JSON.stringify(rects)};\n`);
await browser.close();
