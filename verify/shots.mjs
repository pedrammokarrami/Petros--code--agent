// Full-size per-scene screenshots for human review: docs/redesign/shots/<scene>-<vp>.png
// Each tile is captured only after the room under test is ready for ITSELF, and its
// renderer, hero screen bbox and canvas luminance are recorded next to it so nothing in
// the report is a guess.
//
// This is the one screenshot workflow: configurable output lives here instead of a second
// script. It refuses a stale dist, validates every tile it writes (present, non-empty,
// exact viewport dimensions, mtime inside this run) and exits non-zero on any failure.
//
// Usage: node verify/shots.mjs [--out=<dir>] [--prefix=<str>] [--room=<id,...>]
//                              [--vp=<name,[name]>] [--no-build]
import { mkdirSync, writeFileSync, readFileSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer, stopServer, BASE } from './lib/server.mjs';
import { ensureFreshDist } from './lib/fresh.mjs';
import { assertSupportedNode } from './lib/runtime.mjs';
import { decodePng } from './lib/metrics.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const argv = process.argv.slice(2);
const arg = (name, fallback) => (argv.find((a) => a.startsWith(`--${name}=`)) || `--${name}=${fallback}`).slice(name.length + 3);

assertSupportedNode();
ensureFreshDist(root, { build: !argv.includes('--no-build') });

const cfg = JSON.parse(readFileSync(join(here, 'scenes.json'), 'utf8'));
const DEFAULT_OUT = join(root, 'docs/redesign/shots');
const outDir = resolve(arg('out', DEFAULT_OUT));
const prefix = arg('prefix', '');
const vpOnly = arg('vp', '');
const roomOnly = arg('room', '');
mkdirSync(outDir, { recursive: true });

const VIEWPORTS = cfg.viewports.filter((v) => ['desktop-1920x1080', 'mobile-390x844'].includes(v.name))
  .filter((v) => !vpOnly || v.name.includes(vpOnly));
const scenes = cfg.scenes.filter((s) => !roomOnly || roomOnly.split(',').includes(s.id));
const LAUNCH_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'];

/** PNG width/height from the IHDR chunk. */
const pngSize = (buf) => ({ width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) });

const startedAt = Date.now();
const server = await startServer();
let browser = await chromium.launch({ args: LAUNCH_ARGS });
const rows = [];
try {
  for (const scene of scenes) {
    for (const vp of VIEWPORTS) {
      if (!browser.isConnected()) browser = await chromium.launch({ args: LAUNCH_ARGS });
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, locale: 'fa-IR' });
      const page = await ctx.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(`pageerror: ${String(e.message).slice(0, 140)}`));
      page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(`console: ${m.text().slice(0, 140)}`); });
      page.on('requestfailed', (r) => pageErrors.push(`request failed: ${r.url().slice(0, 120)}`));
      const row = { scene: scene.id, key: scene.key, viewport: vp.name, file: null, error: null, issues: [], ready: false, marker: null, sha256: null, bytes: null, width: null, height: null };
      try {
        await page.goto(`${BASE}/?verify=1`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForFunction('typeof window.__setSpatialScene === "function"', null, { timeout: 20000 });
        await page.evaluate((k) => window.__setSpatialScene(k), scene.key);
        // Ready must be scoped to this room: the mount's own welcome settles first and used
        // to satisfy a bare __sceneReady check.
        await page.waitForFunction((r) => window.__sceneReady === true && window.__sceneReadyRoom === r, scene.key, { timeout: 30000 });
        await page.waitForFunction((r) => document.querySelector('[data-room]')?.getAttribute('data-room') === r, scene.key, { timeout: 15000 });
        row.ready = true;
        row.marker = await page.evaluate(() => document.querySelector('[data-room]')?.getAttribute('data-room') ?? null);
        await page.waitForTimeout(600);
        const file = join(outDir, `${prefix}${scene.id}-${vp.name}.png`);
        const buf = await page.screenshot({ timeout: 120000 });
        writeFileSync(file, buf);
        row.file = file;
        row.bytes = buf.length;
        row.sha256 = createHash('sha256').update(buf).digest('hex');
        const size = pngSize(buf);
        row.width = size.width;
        row.height = size.height;
        // The tile must be this run's, this viewport's, and not an empty frame.
        const st = statSync(file);
        if (buf.length === 0 || st.size === 0) row.issues.push('empty file');
        if (size.width !== vp.width || size.height !== vp.height) row.issues.push(`dimensions ${size.width}x${size.height} != ${vp.width}x${vp.height}`);
        if (st.mtimeMs < startedAt) row.issues.push('file predates this run');
        const state = await page.evaluate(() => window.__sceneState || null);
        row.renderer = state?.renderer ?? await page.evaluate(() => window.__rendererKind || 'unknown');
        row.gpu = state?.rendererString ?? state?.gpu ?? null;
        row.points = state?.points ?? null;
        row.freeRegion = state?.freeRegion ?? null;
        const hero = (state?.instances || []).find((i) => i.role === 'hero');
        row.heroAssetId = hero?.assetId ?? null;
        row.heroBboxScreen = hero?.bboxScreen ?? null;
        row.heroHeightFrac = hero ? +(hero.bboxScreen.h / vp.height).toFixed(3) : null;
        // Canvas-only pixels: the UI text must not be counted as scene luminance.
        const blob = await page.evaluate(() => window.__sceneHost?.snapshot?.() || window.__pointsWorld?.snapshot?.() || null);
        if (blob) {
          const png = decodePng(Buffer.from(blob.split(',')[1], 'base64'));
          let sum = 0, lit = 0, n = 0;
          for (let i = 0; i < png.data.length; i += 4) {
            const l = 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2];
            sum += l; if (l > 8) lit++; n++;
          }
          row.canvasMeanLuma = +(sum / n).toFixed(2);
          row.canvasLitPct = +((lit / n) * 100).toFixed(2);
        }
        row.everythingElse = (state?.instances || []).filter((i) => i.role !== 'hero').map((i) => i.assetId);
      } catch (e) {
        row.error = String(e && e.message || e).slice(0, 300);
        row.issues.push(row.error);
      } finally {
        await ctx.close().catch(() => {});
      }
      row.errors = pageErrors.slice(0, 5);
      if (pageErrors.length) row.issues.push(`${pageErrors.length} page error(s)`);
      row.pass = !row.error && row.issues.length === 0;
      rows.push(row);
      console.log(`${row.scene} @ ${vp.name} renderer=${row.renderer} luma=${row.canvasMeanLuma} lit%=${row.canvasLitPct} heroH=${row.heroHeightFrac} ${row.pass ? 'PASS' : 'FAIL ' + row.issues.join('; ')}`);
      if (!row.pass) for (const e of row.errors) console.log(`    ! ${e}`);
    }
  }
} finally {
  if (browser) await browser.close().catch(() => {});
  stopServer(server.child);
}

// An empty selection is a failed run, not a green one: it would report "0 tiles, 0 failures".
if (rows.length === 0) {
  console.log(`no tiles selected (rooms="${roomOnly}" viewports="${vpOnly}"); nothing was verified`);
  process.exit(1);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  startedAt: new Date(startedAt).toISOString(),
  out: outDir,
  prefix,
  build: !argv.includes('--no-build'),
  rows,
};
const manifestPath = join(outDir, 'manifest.json');
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
// Legacy consumer: docs/redesign/evidence/shots.json. Only refreshed for the default
// output, so a scratch run can never rewrite committed evidence.
if (outDir === DEFAULT_OUT) {
  writeFileSync(join(root, 'docs/redesign/evidence/shots.json'), JSON.stringify(rows, null, 2));
}

const failed = rows.filter((r) => !r.pass);
const legacy = rows.filter((r) => r.renderer !== 'points');
console.log(`tiles=${rows.length} failed=${failed.length} notPoints=${legacy.length}${legacy.length ? ' -> ' + legacy.map((r) => r.scene + '@' + r.viewport + ':' + r.renderer).join(', ') : ''}`);
console.log(`manifest: ${manifestPath}`);
for (const r of failed) console.log(`FAILED ${r.scene}@${r.viewport}: ${r.issues.join('; ')}`);
process.exit(failed.length === 0 ? 0 : 1);
