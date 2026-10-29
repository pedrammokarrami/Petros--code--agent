// P1 leak gate: 20 scene switches on the depth-point scene host, GPU memory delta <= 2.
import { chromium } from 'playwright';
import { startServer, stopServer, BASE } from './lib/server.mjs';

const SWITCHES = 20;
const MAX_DELTA = 2;

const server = await startServer();
let code = 1;
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/?verify=1`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction('window.__sceneReady === true', null, { timeout: 45000 });
  await page.waitForFunction('typeof window.__sceneInfo === "function"', null, { timeout: 15000 });
  const before = await page.evaluate(() => window.__sceneInfo());

  for (let i = 0; i < SWITCHES; i++) {
    const id = i % 2 === 0 ? 'dev_room' : 'welcome';
    await page.evaluate((s) => window.__setSpatialScene(s), id);
    await page.waitForFunction('window.__sceneReady === true', null, { timeout: 30000 });
  }
  const after = await page.evaluate(() => window.__sceneInfo());
  const dGeo = after.geometries - before.geometries;
  const dTex = after.textures - before.textures;
  const ok = dGeo <= MAX_DELTA && dTex <= MAX_DELTA;
  console.log(`switches=${SWITCHES} before=${JSON.stringify(before)} after=${JSON.stringify(after)} dGeo=${dGeo} dTex=${dTex} limit<=${MAX_DELTA}`);
  console.log(ok ? 'LEAK PASS' : 'LEAK FAIL');
  code = ok ? 0 : 1;
  await browser.close();
} catch (e) {
  console.log('LEAK ERROR', String(e).slice(0, 500));
  code = 1;
} finally {
  stopServer(server.child);
}
process.exit(code);
