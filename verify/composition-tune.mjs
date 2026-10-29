// Composition tuning tool: measure the whole composition matrix (every room pair x every
// viewport) in the real browser, optionally with a per-room floor disc override.
//
// Why it exists: the composition gate is a pairwise Jaccard distance over 32x18 occupancy
// grids, and a pair can be too close because two rooms share the same floor. The rooms do
// not have hard-coded coordinates - they have a floor disc (cx, cz, r) - and the browser
// exposes `__setFloorDisc(room, {cx, cz, r})` so a candidate can be measured without
// rebuilding the bundle. The browser is the arbiter; an offline plate is not.
//
//   OVER='{"dev":{"cx":1.6,"cz":-12,"r":2.8}}' node verify/composition-tune.mjs
//
// Prints every pair below 0.32 per viewport, the worst pair, and each room's look-lock rows.
import { chromium } from 'playwright';
import { startServer, stopServer, BASE } from '../verify/lib/server.mjs';
import { compositionGrid, compositionDistance, decodePng, evaluateFrame } from '../verify/lib/metrics.mjs';
import { readFileSync } from 'node:fs';
const thresholds = JSON.parse(readFileSync('verify/thresholds.json', 'utf8'));
const ROOMS = ['welcome', 'dev', 'research', 'content', 'command'];
const VPS = [['mobile', 390, 844], ['tablet', 768, 1024], ['laptop', 1440, 900], ['desktop', 1920, 1080]];
const OVER = JSON.parse(process.env.OVER || '{}');
const { child } = await startServer();
const browser = await chromium.launch();
const grab = async (page, room) => {
  await page.evaluate(() => { window.__sceneResume?.(); window.__taskRunning = false; window.__setAmberLive?.(false); });
  await page.waitForTimeout(150);
  await page.evaluate((r) => window.__setSpatialScene(r), room);
  await page.waitForFunction((r) => window.__sceneReady === true && window.__sceneReadyRoom === r, room, { timeout: 40000 });
  await page.waitForTimeout(900);
  await page.evaluate((on) => { window.__taskRunning = on; window.__setAmberLive?.(on); window.__sceneHost?.setAmberLive?.(on); }, room === 'dev');
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__scenePause?.());
  await page.waitForTimeout(150);
  const dataUrl = await page.evaluate(() => window.__sceneHost?.snapshot?.() || null);
  return Buffer.from(dataUrl.split(',')[1], 'base64');
};
try {
  for (const [tag, vw, vh] of VPS) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1, locale: 'fa-IR' });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/?verify=1`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForFunction('typeof window.__setFloorDisc === "function"', null, { timeout: 20000 });
    for (const [room, v] of Object.entries(OVER)) await page.evaluate(([r, val]) => window.__setFloorDisc(r, val), [room, v]);
    const grids = new Map();
    const stats = [];
    for (const room of ROOMS) {
      const buf = await grab(page, room);
      grids.set(room, compositionGrid(decodePng(buf)));
      const res = evaluateFrame(buf, { sceneId: room, thresholds });
      const bad = res.rows.filter(r => !r.pass).map(r => `${r.name}=${r.value}`);
      stats.push(`${room} lit ${res.stats.nonBgPercent.toFixed(1)}% luma ${res.stats.meanLuma.toFixed(1)} comp ${res.blob.components} max ${res.blob.largestPercent.toFixed(1)}%${bad.length ? ' ROWS:' + bad.join(',') : ''}`);
    }
    console.log(`--- ${tag} ${vw}x${vh}`);
    for (const s of stats) console.log('   ' + s);
    let worst = 1, worstPair = '';
    for (let i = 0; i < ROOMS.length; i++) for (let j = i + 1; j < ROOMS.length; j++) {
      const d = compositionDistance(grids.get(ROOMS[i]), grids.get(ROOMS[j]));
      if (d < worst) { worst = d; worstPair = `${ROOMS[i]}|${ROOMS[j]}`; }
      if (d < 0.32) console.log(`   ${ROOMS[i]} vs ${ROOMS[j]}: ${d.toFixed(3)}${d < 0.30 ? ' <<< FAIL' : ''}`);
    }
    console.log(`   worst ${worstPair} ${worst.toFixed(3)}`);
    await ctx.close();
  }
} finally { await browser.close().catch(() => {}); stopServer(child); }
