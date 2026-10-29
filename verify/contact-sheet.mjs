// Human review surface: one labelled PNG per scene x viewport x 2x focal crop, composed
// as an HTML page and screenshotted with Chromium (real fonts, no bitmap-font hacks).
// Every tile carries sceneId, viewport and the renderer that actually drew it.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer, stopServer, BASE } from './lib/server.mjs';
import { decodePng } from './lib/metrics.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const cfg = JSON.parse(readFileSync(join(here, 'scenes.json'), 'utf8'));
const outPath = join(root, 'docs/redesign/contact-sheet.png');
const raw = join(root, 'docs/redesign/verify_shots');
mkdirSync(raw, { recursive: true });

const desktopVp = { name: 'desktop-1920x1080', width: 1920, height: 1080 };
const mobileVp = { name: 'mobile-390x844', width: 390, height: 844 };
const LAUNCH_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'];

let browser = await chromium.launch({ args: LAUNCH_ARGS });
const server = await startServer();
const tiles = [];
const fails = [];

function lumaOf(buf) {
  const png = decodePng(buf);
  let sum = 0, lit = 0, n = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const l = 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2];
    sum += l; if (l > 8) lit++; n++;
  }
  return { mean: +(sum / n).toFixed(2), lit: +((lit / n) * 100).toFixed(2) };
}

try {
  for (const scene of cfg.scenes) {
    for (const vp of [desktopVp, mobileVp]) {
      if (!browser.isConnected()) browser = await chromium.launch({ args: LAUNCH_ARGS });
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, locale: 'fa-IR' });
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE}/?verify=1`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForFunction('typeof window.__setSpatialScene === "function"', null, { timeout: 20000 });
        await page.evaluate((k) => window.__setSpatialScene(k), scene.key);
        await page.waitForFunction('window.__sceneReady === true', null, { timeout: 30000 });
        await page.waitForTimeout(600);
        const buf = await page.screenshot({ path: join(raw, `sheet-${scene.id}-${vp.width}.png`), timeout: 120000 });
        const st = await page.evaluate(() => window.__sceneState || null);
        const hero = (st?.instances || []).find((i) => i.role === 'hero');
        tiles.push({
          scene, vp, buf,
          renderer: st?.renderer ?? (await page.evaluate(() => window.__rendererKind || 'unknown')),
          luma: lumaOf(buf),
          hero: hero ? { assetId: hero.assetId, h: +(hero.bboxScreen.h / vp.height * 100).toFixed(0) } : null,
        });
      } catch (e) {
        fails.push({ scene: scene.id, vp: vp.name, error: String(e && e.message || e).slice(0, 300) });
        console.error(`[contact-sheet] ${scene.id}@${vp.name} failed: ${e && e.message || e}`);
      } finally {
        await ctx.close().catch(() => {});
      }
    }
  }

  const focal = (s) => s.focal || cfg.defaultFocal;
  // Compose with Pillow, not Chromium: one fullPage screenshot of twelve full-resolution
  // PNGs hung this step three times. Pillow lays out fixed cells and draws real TrueType
  // labels, so it is deterministic and cannot deadlock.
  const payload = join(raw, 'sheet-payload.json');
  writeFileSync(payload, JSON.stringify({
    out: outPath,
    tiles: tiles.map((t) => ({
      scene: t.scene.id,
      viewport: t.vp.name,
      width: t.vp.width,
      height: t.vp.height,
      file: join(raw, `sheet-${t.scene.id}-${t.vp.width}.png`),
      renderer: t.renderer,
      meanLuma: t.luma.mean,
      litPct: t.luma.lit,
      hero: t.hero,
      focal: focal(t.scene),
    })),
  }, null, 2));
  const py = spawnSync('python3', [join(here, 'compose-sheet.py'), payload], { encoding: 'utf8', timeout: 120000 });
  if (py.status !== 0) throw new Error(`compose-sheet.py failed: ${(py.stderr || py.stdout || '').slice(0, 400)}`);
  process.stdout.write((py.stdout || '') + '\n');
  writeFileSync(join(root, 'docs/redesign/evidence/contact-sheet-tiles.json'), JSON.stringify(tiles.map((t) => ({
    scene: t.scene.id, viewport: t.vp.name, renderer: t.renderer, meanLuma: t.luma.mean, litPct: t.luma.lit, hero: t.hero,
  })), null, 2));
  const nonPoints = tiles.filter((t) => t.renderer !== 'points');
  console.log(`contact sheet: docs/redesign/contact-sheet.png tiles=${tiles.length} notPoints=${nonPoints.length}`);
  for (const t of nonPoints) console.log(`  NOT POINTS: ${t.scene.id}@${t.vp.name} renderer=${t.renderer}`);
} finally {
  if (browser) await browser.close().catch(() => {});
  stopServer(server.child);
}
if (fails.length) {
  writeFileSync(join(root, 'docs/redesign/evidence/contact-sheet-fails.json'), JSON.stringify(fails, null, 2));
  console.error(`[contact-sheet] ${fails.length} tile(s) failed`);
}
