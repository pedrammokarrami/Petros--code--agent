import { chromium } from 'playwright';
import { startServer, stopServer, BASE } from './lib/server.mjs';
import { slabMetric } from './lib/gates.mjs';
await startServer(); const b = await chromium.launch();
for (const [key,w,h] of [['app',1920,1080],['app',390,844],['research',1920,1080],['research',390,844],['welcome',1920,1080],['dev_room',1920,1080]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(`${BASE}/?verify=1&renderer=points`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction('typeof window.__setSpatialScene === "function"');
  await p.evaluate((k) => window.__setSpatialScene(k), key);
  await p.waitForFunction('window.__sceneReady === true', null, { timeout: 30000 }).catch(()=>{});
  await p.waitForTimeout(1200);
  const c = await p.$('canvas'); const buf = await c.screenshot();
  const m = slabMetric(buf);
  const st = await p.evaluate(() => window.__sceneState);
  const t = st.layers.hero+st.layers.mid+st.layers.dust;
  console.log(key, w, `slab ${(m.colEdge*100).toFixed(1)}v/${(m.rowEdge*100).toFixed(1)}h`, `dust ${(st.layers.dust/t*100).toFixed(1)}%`, st.instances.filter(i=>i.role==='hero').map(i=>`${i.assetId} h=${(i.bboxScreen.h/h*100).toFixed(0)}% ${i.bboxScreen.inside?'in':'OUT'}`).join(' '));
  await p.screenshot({ path: `/tmp/canvas-${key}-${w}.png` });
  await p.close();
}
await b.close(); await stopServer();
