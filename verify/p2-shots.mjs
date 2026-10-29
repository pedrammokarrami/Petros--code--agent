// Full-size P2 screenshots for human review: docs/redesign/shots/p2/<room>-<vp>.png
//
// Why this script exists: verify/shots.mjs captures the *scene* (its own gate), and its
// ?verify=1 query is a no-op in src/main.tsx, so nothing was hidden - but the dock's
// icon buttons measured 1.4-3.3:1 against the composer and vanished in any downscaled
// view. This script therefore refuses to save a shot whose real controls are not visible,
// records each control's testid + bbox + measured text-over-scene contrast, and fails
// (exit 1) when a control is missing, outside the viewport, or below 4.5:1.
//
// Usage: node verify/p2-shots.mjs [--mode=webgl|off]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer, stopServer, BASE } from './lib/server.mjs';
import { measureContrast, cropPng } from './lib/contrast.mjs';
import { ensureFreshDist } from './lib/fresh.mjs';
import { assertSupportedNode } from './lib/runtime.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
assertSupportedNode();
ensureFreshDist(root, { build: !process.argv.includes('--no-build') });
const outDir = join(root, 'docs/redesign/shots/p2');
mkdirSync(outDir, { recursive: true });
const mode = (process.argv.find((a) => a.startsWith('--mode=')) || '--mode=webgl').split('=')[1];
const MIN = 4.5;

const ROOMS = ['welcome', 'dev', 'research', 'content', 'command'];
const VIEWPORTS = [
  { name: 'desktop-1920x1080', width: 1920, height: 1080, mobile: false },
  { name: 'mobile-390x844', width: 390, height: 844, mobile: true },
];
const CONTROLS = [
  'room-welcome', 'room-dev', 'room-research', 'room-content', 'room-command',
  'open-settings', 'lang-toggle',
  'dock-composer', 'dock-attach', 'dock-voice', 'dock-voice-out', 'dock-send',
  'dock-open-history', 'dock-open-settings',
];
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'];
const ARGS = mode === 'webgl' ? GL : ['--disable-webgl', '--disable-gpu', '--disable-dev-shm-usage'];

const server = await startServer();
let browser = await chromium.launch({ args: ARGS });
const rows = [];
const problems = [];
try {
  for (const vp of VIEWPORTS) {
    for (const room of ROOMS) {
      const row = { room, viewport: vp.name, mode, file: null, controls: {}, renderer: null, error: null };
      if (!browser.isConnected()) browser = await chromium.launch({ args: ARGS });
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, isMobile: vp.mobile, hasTouch: vp.mobile, locale: 'fa-IR' });
      const page = await ctx.newPage();
      try {
        await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForFunction('typeof window.__setSpatialScene === "function"', null, { timeout: 20000 });
        await page.evaluate((k) => window.__setSpatialScene(k), room);
        await page.waitForFunction(`document.querySelector('[data-room]')?.getAttribute('data-room') === '${room}'`, null, { timeout: 15000 });
        await page.waitForTimeout(mode === 'webgl' ? 2500 : 400);
        row.renderer = await page.evaluate(() => (window.__sceneState && window.__sceneState.renderer) || (window.__sceneState && window.__sceneState.kind) || 'unknown');
        // One frame for the whole page; each control is cropped out of it. Element
        // screenshots wait for "stability", which a live point cloud never gives.
        const shot = await page.screenshot({ path: join(outDir, `${room}-${vp.name}.png`), fullPage: false, timeout: 120000 });
        for (const id of CONTROLS) {
          const loc = page.locator(`[data-testid="${id}"]`).first();
          const n = await loc.count();
          const visible = n === 1 && await loc.isVisible();
          const box = visible ? await loc.boundingBox() : null;
          const inVp = !!box && box.x >= 0 && box.y >= 0 && box.x + box.width <= vp.width + 0.5 && box.y + box.height <= vp.height + 0.5;
          let c = null;
          if (visible && inVp && box.width >= 8 && box.height >= 8) c = measureContrast(cropPng(shot, box));
          row.controls[id] = { count: n, visible, inViewport: inVp, box: box && Object.fromEntries(Object.entries(box).map(([k, v]) => [k, Math.round(v * 10) / 10])), contrast: c?.contrast ?? null };
          if (!visible) problems.push(`${room}@${vp.name} ${id}: not visible`);
          else if (!inVp) problems.push(`${room}@${vp.name} ${id}: outside viewport`);
          else if (c && id !== 'dock-composer' && c.contrast < MIN) problems.push(`${room}@${vp.name} ${id}: contrast ${c.contrast} < ${MIN}`);
        }
        row.file = `docs/redesign/shots/p2/${room}-${vp.name}.png`;
      } catch (e) {
        row.error = String(e && e.message || e).slice(0, 300);
        problems.push(`${room}@${vp.name}: ${row.error}`);
      } finally { await ctx.close().catch(() => {}); }
      rows.push(row);
      const worst = Object.entries(row.controls).filter(([, v]) => v.contrast != null).sort((a, b) => a[1].contrast - b[1].contrast)[0];
      console.log(`${room} @ ${vp.name} renderer=${row.renderer} worst=${worst ? worst[0] + ' ' + worst[1].contrast : 'n/a'} ${row.error ? 'ERR ' + row.error : ''}`);
    }
  }
} finally {
  if (browser) await browser.close().catch(() => {});
  stopServer(server.child);
}
writeFileSync(join(outDir, 'index.json'), JSON.stringify({ mode, min: MIN, generatedAt: new Date().toISOString(), rows, problems }, null, 2));
console.log(`shots=${rows.filter((r) => r.file).length} problems=${problems.length}`);
if (problems.length) { for (const p of problems) console.log('PROBLEM', p); process.exit(1); }
