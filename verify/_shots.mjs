import { chromium } from 'playwright';
import { startServer, stopServer, BASE } from './lib/server.mjs';
await startServer();
const b = await chromium.launch();
const jobs = [['app','app',1920,1080],['research','research',1920,1080],['dev_room','dev_room',1920,1080],['app','app',390,844],['research','research',390,844]];
for (const [scene, key, w, h] of jobs) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(`${BASE}/?verify=1&renderer=points`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction('typeof window.__setSpatialScene === "function"');
  await p.evaluate((k) => window.__setSpatialScene(k), key);
  await p.waitForFunction('window.__sceneReady === true', null, { timeout: 30000 }).catch(()=>{});
  await p.waitForTimeout(1500);
  const st = await p.evaluate(() => window.__sceneState || null);
  await p.screenshot({ path: `/tmp/${scene}-${w}.png` });
  console.log(scene, w, JSON.stringify(st && {layers: st.layers, inst: st.instances && st.instances.map(i=>[i.assetId,i.role,Math.round(i.bboxScreen.x),Math.round(i.bboxScreen.y),Math.round(i.bboxScreen.w),Math.round(i.bboxScreen.h),i.bboxScreen.inside])}));
  await p.close();
}
await b.close(); await stopServer();
