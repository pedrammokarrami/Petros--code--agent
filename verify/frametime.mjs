// Frame-time probe: what the machine actually draws, labelled software or GPU.
// Software rasterisers (SwiftShader/llvmpipe) are reported as such and never quoted as a
// product FPS. Writes nothing; prints one JSON line for gpu-check to capture.
import { chromium } from 'playwright';
import { startServer, stopServer, BASE } from './lib/server.mjs';

const ROOMS = ['welcome', 'dev', 'research', 'content', 'command'];
const server = await startServer();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
const out = { renderer: null, kind: null, rooms: [], ok: false };
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction('typeof window.__setSpatialScene === "function"', null, { timeout: 20000 });
  await page.waitForTimeout(3000);
  const gl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const g = c.getContext('webgl2') || c.getContext('webgl');
    if (!g) return null;
    const ext = g.getExtension('WEBGL_debug_renderer_info');
    return { renderer: ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER), vendor: ext ? g.getParameter(ext.UNMASKED_VENDOR_WEBGL) : g.getParameter(g.VENDOR) };
  });
  out.renderer = gl?.renderer ?? null;
  out.vendor = gl?.vendor ?? null;
  out.kind = !gl ? 'none' : /swiftshader|llvmpipe|software/i.test(gl.renderer) ? 'software' : 'gpu';
  for (const room of ROOMS) {
    await page.evaluate((k) => window.__setSpatialScene(k), room);
    await page.waitForFunction(`document.querySelector('[data-room]')?.getAttribute('data-room') === '${room}'`, null, { timeout: 15000 });
    await page.waitForTimeout(1200);
    const frames = await page.evaluate(() => new Promise((resolve) => {
      const t = []; let last = performance.now(); const end = last + 2500;
      const tick = (now) => { t.push(now - last); last = now; if (now < end) requestAnimationFrame(tick); else resolve(t); };
      requestAnimationFrame(tick);
    }));
    const s = frames.slice(5).sort((a, b) => a - b);
    const at = (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
    out.rooms.push({ room, frames: s.length, p50ms: +at(0.5).toFixed(1), p95ms: +at(0.95).toFixed(1), fps: +(1000 / at(0.5)).toFixed(1) });
  }
  out.ok = out.kind === 'gpu';
} finally {
  await browser.close().catch(() => {});
  stopServer(server.child);
}
console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 2);
