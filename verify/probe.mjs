// Sweep tuning knobs with the SAME measurement the gate uses.
// usage: node verify/probe.mjs <scene> <width> <height> "k=v,k=v" ["k=v,k=v" ...]
import { chromium } from 'playwright';
import { startServer, stopServer, BASE } from './lib/server.mjs';
import { evaluateFrame } from './lib/metrics.mjs';
import { readFileSync } from 'node:fs';

const [scene = 'dev_room', w = '1920', h = '1080', ...combos] = process.argv.slice(2);
const thresholds = JSON.parse(readFileSync(new URL('../verify/thresholds.json', import.meta.url)));
const cfg = JSON.parse(readFileSync(new URL('../verify/scenes.json', import.meta.url)));
const sc = cfg.scenes.find((s) => s.id === scene);
const focal = sc.focal || cfg.defaultFocal;

await startServer();
const b = await chromium.launch();
try {
  for (const combo of combos.length ? combos : ['']) {
    const extra = combo ? combo.split(',').map((x) => `&${x}`).join('') : '';
    const p = await b.newPage({ viewport: { width: +w, height: +h } });
    await p.goto(`${BASE}/?verify=1&renderer=points${extra}`, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction('typeof window.__setSpatialScene === "function"');
    if (scene === 'dev_room') await p.evaluate(() => { window.__taskRunning = true; });
    await p.evaluate((k) => window.__setSpatialScene(k), sc.key);
    await p.waitForFunction('window.__sceneReady === true', null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1200);
    const shot = await p.screenshot();
    const canvas = await p.$('canvas');
    const box = canvas && (await canvas.boundingBox());
    const cshot = canvas ? await canvas.screenshot() : null;
    const scale = cshot ? cshot.readUInt32BE(16) / box.width : 1;
    const r = evaluateFrame(shot, {
      sceneId: sc.id,
      blobBuffer: cshot,
      blobCropRect: cshot && box ? {
        x: (focal.xPct * +w - box.x) * scale,
        y: (focal.yPct * +h - box.y) * scale,
        width: focal.wPct * +w * scale,
        height: focal.hPct * +h * scale,
      } : null,
      focalRect: {
        x: focal.xPct * +w * (shot.readUInt32BE(16) / +w),
        y: focal.yPct * +h * (shot.readUInt32BE(16) / +w),
        width: focal.wPct * +w * (shot.readUInt32BE(16) / +w),
        height: focal.hPct * +h * (shot.readUInt32BE(16) / +w),
      },
      thresholds,
    });
    const g = Object.fromEntries(r.rows.map((x) => [x.name, x.value]));
    const fail = r.rows.filter((x) => !x.pass).map((x) => `${x.name}=${x.value}`);
    console.log(`${(combo || 'default').padEnd(42)} nearWhite=${g['near-white %']} luma=${g['mean luma']} nonBg=${g['non-bg %']} amber=${g['amber % of non-bg']} comps=${g['lit components']} largest=${g['largest component %']} ${fail.length ? 'FAIL[' + fail.join(';') + ']' : 'PASS'}`);
    await p.close();
  }
} finally {
  await b.close();
  await stopServer();
}
