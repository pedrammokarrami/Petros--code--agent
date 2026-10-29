// P1 fallback gate: with WebGL unavailable the app must show a still poster, not a dead canvas.
import { chromium } from 'playwright';
import { startServer, stopServer, BASE } from './lib/server.mjs';

const server = await startServer();
let code = 1;
try {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (String(type).includes('webgl')) return null;
      return orig.call(this, type, ...rest);
    };
  });
  await page.goto(`${BASE}/?verify=1`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction('window.__sceneReady === true', null, { timeout: 30000 });
  const poster = await page.locator('[role="img"][aria-label^="Scene poster"]').count();
  const canvas = await page.locator('canvas').count();
  const text = await page.locator('[role="img"][aria-label^="Scene poster"]').innerText().catch(() => '');
  const ok = poster === 1 && canvas === 0;
  console.log(`poster=${poster} canvas=${canvas} text=${JSON.stringify(text.slice(0, 80))}`);
  console.log(ok ? 'WEBGL-OFF PASS' : 'WEBGL-OFF FAIL');
  code = ok ? 0 : 1;
  await browser.close();
} catch (e) {
  console.log('WEBGL-OFF ERROR', String(e).slice(0, 500));
  code = 1;
} finally {
  stopServer(server.child);
}
process.exit(code);
