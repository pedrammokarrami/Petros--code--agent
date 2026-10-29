// P2 a11y gate: axe-core in a real browser on every room, desktop and mobile.
// Fails on serious/critical impact. A crashed page is a failure, never a skip.
//
// Runs with --disable-webgl on purpose: the canvas is decorative, and headless SwiftShader
// crashes intermittently on this container (see DECISIONS.md D-P2-1). The poster path is a
// supported product mode (no-WebGL fallback), so the DOM audited here is the real DOM.
import { writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

process.env.VERIFY_PORT = process.env.AXE_PORT || '4401';
const { startServer, stopServer, BASE } = await import('./lib/server.mjs');

const ROOMS = ['welcome', 'dev', 'research', 'content', 'command'];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, dpr: 1, mobile: false },
  { name: 'mobile', width: 390, height: 844, dpr: 2, mobile: true },
];
const MODE = (process.argv.find((a) => a.startsWith('--mode=')) || '').split('=')[1] || process.env.AXE_MODE || 'off';
if (!['webgl', 'off'].includes(MODE)) throw new Error(`--mode must be webgl or off, got ${MODE}`);
const GL_ARGS = MODE === 'webgl'
  ? ['--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  : ['--disable-dev-shm-usage', '--disable-webgl', '--disable-gpu'];
const ONLY = String(process.env.AXE_ROOMS || '').split(',').filter(Boolean);
const rooms = ONLY.length ? ROOMS.filter((r) => ONLY.includes(r)) : ROOMS;

console.log(`# axe mode=${MODE}`);
const server = await startServer();
const rows = [];
let bad = 0;
let browser = null;
const healthy = async () => { try { const r = await fetch(`${BASE}/api/health`); return r.ok; } catch { return false; } };
const relaunch = async (extra = []) => {
  if (browser) await browser.close().catch(() => {});
  browser = await chromium.launch({ args: [...GL_ARGS, ...extra] });
};

async function audit(vp, room, attempt) {
  if (!(await healthy())) throw new Error(`server died before ${vp.name}/${room}`);
  if (!browser || browser.isConnected() === false) await relaunch(attempt ? ['--disable-gpu'] : []);
  {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dpr,
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
      locale: 'fa-IR',
    });
    try {
      const page = await ctx.newPage();
      await page.goto(BASE, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-dock]', { timeout: 20000 });
      await page.locator(`[data-testid="room-${room}"]`).click();
      await page.waitForTimeout(250);
      return await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    } finally {
      await ctx.close().catch(() => {});
    }
  }
}

try {
  for (const vp of VIEWPORTS) {
    for (const room of rooms) {
      let res = null;
      let err = null;
      for (let attempt = 0; attempt < 2 && !res; attempt++) {
        try {
          res = await audit(vp, room, attempt);
        } catch (e) {
          err = e;
          if (!(await healthy())) {
            console.log(`\n--- server log tail ---\n${server.log().slice(-1500)}\n---`);
          } else {
            await relaunch(['--disable-gpu']).catch(() => {});
          }
        }
      }
      if (!res) {
        bad++;
        rows.push({ viewport: vp.name, room, id: 'crash', impact: 'critical', nodes: 1, targets: [], summary: String(err?.message || err).slice(0, 160) });
        console.log(`FAIL axe ${vp.name}/${room} crashed :: ${String(err?.message || err).slice(0, 120)}`);
        continue;
      }
      const serious = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      for (const v of res.violations) {
        rows.push({
          mode, viewport: vp.name, room, id: v.id, impact: v.impact, nodes: v.nodes.length,
          targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
          summary: v.help?.slice(0, 120),
        });
      }
      if (serious.length) bad++;
      console.log(`${serious.length ? 'FAIL' : 'ok  '} axe[${MODE}] ${vp.name}/${room} violations=${res.violations.length} serious=${serious.length}`);
    }
  }
} finally {
  if (browser) await browser.close().catch(() => {});
  stopServer(server.child);
}

mkdirSync('docs/redesign/evidence', { recursive: true });
writeFileSync(`docs/redesign/evidence/axe-${MODE}.json`, JSON.stringify({ mode: MODE, rows }, null, 2));
if (MODE === 'off') writeFileSync('docs/redesign/evidence/axe.json', JSON.stringify(rows, null, 2));
const serious = rows.filter((r) => r.impact === 'serious' || r.impact === 'critical');
console.log(`\n# pages failing ${bad}\n# serious-critical ${serious.length}\n# all violations ${rows.length}`);
process.exit(serious.length ? 1 : 0);
