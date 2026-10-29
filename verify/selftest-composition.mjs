// Metric controls for the composition distance. A metric that cannot separate
// "same" from "different" is not evidence, which is exactly how dHash failed.
//
// Two classes measure the live app (same scene, two runs / two moments). The "different"
// class uses controlled fixture inputs, because with placeholder art the five rooms are
// deliberately the same neutral slate and the app cannot tell them apart yet; when at
// least two rooms carry real art, the room pair is measured as well.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { compositionGrid, compositionDistance, decodePng } from './lib/metrics.mjs';
import { startServer, stopServer, BASE } from './lib/server.mjs';
import { ensureFreshDist } from './lib/fresh.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
ensureFreshDist(root, { build: !process.argv.includes('--no-build') });
const thresholds = JSON.parse(readFileSync(join(here, 'thresholds.json'), 'utf8'));
const min = thresholds.composition.minJaccardDistance;
const cfg = JSON.parse(readFileSync(join(here, 'scenes.json'), 'utf8'));

const { child } = await startServer();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const vp = { width: 1440, height: 900 };
const results = { same_time: [], same_run: [], different: [], different_app: [] };

async function capture(sceneKey, waitMs) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?verify=1`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction('typeof window.__setSpatialScene === "function"', null, { timeout: 20000 });
  await page.evaluate((k) => window.__setSpatialScene(k), sceneKey);
  await page.waitForFunction('window.__sceneReady === true', null, { timeout: 20000 });
  await page.waitForTimeout(waitMs);
  const canvas = await page.$('canvas');
  const buf = await canvas.screenshot();
  const state = await page.evaluate(() => window.__sceneState || null);
  await ctx.close();
  return { grid: compositionGrid(decodePng(buf)), placeholder: state?.placeholder === true };
}

try {
  // A: same scene, two moments in one page life (idle shimmer is the only change).
  {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/?verify=1`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForFunction('typeof window.__setSpatialScene === "function"', null, { timeout: 20000 });
    await page.evaluate(() => window.__setSpatialScene('welcome'));
    await page.waitForFunction('window.__sceneReady === true', null, { timeout: 20000 });
    const canvas = await page.$('canvas');
    const a = compositionGrid(decodePng(await canvas.screenshot()));
    await page.waitForTimeout(800);
    const b = compositionGrid(decodePng(await canvas.screenshot()));
    results.same_time.push(compositionDistance(a, b));
    await ctx.close();
  }
  const keyA = cfg.scenes[0].key;
  const a1 = await capture(keyA, 900);
  const a2 = await capture(keyA, 900);
  results.same_run.push(compositionDistance(a1.grid, a2.grid));

  // B: controlled inputs. Two fixtures with deliberately different massing.
  const fx = (n) => compositionGrid(decodePng(readFileSync(join(here, 'fixtures', n))));
  results.different.push(compositionDistance(fx('c-solid-blob.png'), fx('d-point-cloud.png')));
  results.different.push(compositionDistance(fx('c-solid-blob.png'), fx('b-flat-dark.png')));

  // C: live rooms, only once at least two of them carry real art.
  const rooms = [];
  for (const s of cfg.scenes.slice(1, 4)) {
    const c = await capture(s.key, 900);
    if (!c.placeholder) rooms.push({ key: s.key, grid: c.grid });
  }
  if (rooms.length >= 2) results.different_app.push(compositionDistance(rooms[0].grid, rooms[1].grid));
} finally {
  await browser.close();
  stopServer(child);
}

const fmt = (x) => x.toFixed(3);
const lines = [];
const classes = [
  ['same scene, same viewport, two runs', results.same_run, (v) => v < min],
  ['same scene, two moments (time)', results.same_time, (v) => v < min],
  ['two different fixture inputs', results.different, (v) => v >= min],
  ['two different rooms with real art', results.different_app, (v) => v >= min],
];
let bad = 0;
lines.push(`composition threshold ${min}`);
for (const [name, vals, ok] of classes) {
  if (!vals.length) { lines.push(`${name}: skipped (placeholder art: PENDING_HUMAN_INPUT §1)`); continue; }
  const pass = vals.every(ok);
  if (!pass) bad++;
  lines.push(`${name}: ${vals.map(fmt).join(', ')}  min=${fmt(Math.min(...vals))} max=${fmt(Math.max(...vals))}  ${pass ? 'PASS' : 'FAIL'}`);
}
mkdirSync(join(root, 'docs/redesign/evidence'), { recursive: true });
writeFileSync(join(root, 'docs/redesign/evidence/composition-controls.txt'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
process.exit(bad === 0 ? 0 : 1);
