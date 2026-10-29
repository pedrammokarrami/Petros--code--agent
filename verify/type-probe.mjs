// Resolved typography probe: does every room's letter-spacing / text-transform actually
// collapse when the surface turns RTL/Persian?
//
// Why this exists. The M2 card probe measured `.room-card`, a surface that no longer renders
// (the styles remain in src/office/shell/shell.css as dead CSS) — so it was a one-off, not a
// tool. What it was really checking is a live invariant that verify/run.mjs does NOT cover:
// run.mjs enforces a minimum font size, but nothing asserts that the latin display spacing
// declared for `[dir="ltr"]` and `:lang(en)` disappears under `[dir=rtl]`, `[lang=fa]`, `.fa`
// (src/office/shell/shell.css and the global RTL block both say `letter-spacing: normal
// !important; text-transform: none !important`). A regression there is invisible to the pixel
// gates and obvious to a Persian reader, which is exactly the kind of thing a probe should own.
//
// Usage: node verify/type-probe.mjs [--room=dev,...] [--vp=desktop-1920x1080] [--json=<path>] [--no-build]
// Read-only: writes nothing unless --json is given. Exit 1 on any violation or measurement failure.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer, stopServer, BASE } from './lib/server.mjs';
import { ensureFreshDist } from './lib/fresh.mjs';
import { assertSupportedNode } from './lib/runtime.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const argv = process.argv.slice(2);
const arg = (name, fallback) => (argv.find((a) => a.startsWith(`--${name}=`)) || `--${name}=${fallback}`).slice(name.length + 3);

assertSupportedNode();
ensureFreshDist(root, { build: !argv.includes('--no-build') });

const cfg = JSON.parse(readFileSync(join(here, 'scenes.json'), 'utf8'));
const only = arg('room', '');
const verbose = argv.includes('--verbose');
const rooms = cfg.scenes.map((s) => s.id).filter((id) => !only || only.split(',').includes(id));
const vp = cfg.viewports.find((v) => v.name === arg('vp', 'desktop-1920x1080'));
if (!vp) throw new Error(`unknown viewport "${arg('vp', 'desktop-1920x1080')}" (see verify/scenes.json)`);
if (!rooms.length) throw new Error(`no room matched "${only}"`);

// One sampler, injected into both passes, so the two readings are index-aligned by construction.
const SAMPLER = () => {
  const out = [];
  const els = [...document.querySelectorAll('button, h1, h2, h3, a, p, span, li, [role="tab"], [role="button"]')];
  for (const el of els) {
    const text = (el.textContent || '').trim();
    if (!text || text.length > 120) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    out.push({
      tag: el.tagName.toLowerCase(),
      cls: typeof el.className === 'string' ? el.className.slice(0, 60) : '',
      text: text.slice(0, 40),
      letterSpacing: cs.letterSpacing,
      textTransform: cs.textTransform,
      fontSize: cs.fontSize,
    });
  }
  return out;
};

const { child } = await startServer();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
const rows = [];
const violations = [];
let measured = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?verify=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('typeof window.__setSpatialScene === "function"', null, { timeout: 30000 });

  for (const room of rooms) {
    await page.evaluate((r) => window.__setSpatialScene(r), room);
    await page.waitForFunction((r) => window.__sceneReady === true && window.__sceneReadyRoom === r, room, { timeout: 25000 });
    await page.evaluate(() => window.__scenePause && window.__scenePause());

    const ltr = await page.evaluate(() => {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', 'en');
      return null;
    }).then(() => page.evaluate(SAMPLER));

    await page.evaluate(() => {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'fa');
    });
    // Two frames is enough for computed style to re-resolve; the scene loop is paused, so this
    // waits on the document, not on the renderer.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const rtl = await page.evaluate(SAMPLER);

    if (rtl.length !== ltr.length) {
      violations.push({ room, kind: 'sample-mismatch', ltr: ltr.length, rtl: rtl.length });
    }
    let checked = 0;
    for (let i = 0; i < Math.min(ltr.length, rtl.length); i++) {
      const a = ltr[i], b = rtl[i];
      const hadSpacing = a.letterSpacing !== 'normal';
      const hadTransform = a.textTransform !== 'none';
      if (!hadSpacing && !hadTransform) continue;
      checked++;
      if (verbose) console.log(`    checked ${a.tag}${a.cls ? '.' + a.cls.split(' ')[0] : ''} ltr=${a.letterSpacing}/${a.textTransform} rtl=${b.letterSpacing}/${b.textTransform}`);
      const spacingLeaks = hadSpacing && b.letterSpacing !== 'normal';
      const transformLeaks = hadTransform && b.textTransform !== 'none';
      if (spacingLeaks || transformLeaks) {
        violations.push({
          room,
          kind: 'rtl-leak',
          tag: a.tag,
          cls: a.cls,
          text: a.text,
          ltr: { letterSpacing: a.letterSpacing, textTransform: a.textTransform },
          rtl: { letterSpacing: b.letterSpacing, textTransform: b.textTransform },
        });
      }
    }
    measured += checked;
    const row = `${room.padEnd(9)} sampled=${String(ltr.length).padStart(3)} spaced-or-shaped=${String(checked).padStart(3)} violations=${violations.filter((v) => v.room === room).length}`;
    rows.push(row);
    console.log(row);
    await page.evaluate(() => window.__sceneResume && window.__sceneResume());
  }
  await ctx.close();
} finally {
  await browser.close();
  stopServer(child);
}

console.log(`viewports=${vp.name} elements-with-latin-spacing-or-transform=${measured} violations=${violations.length}`);
const jsonAt = argv.find((a) => a.startsWith('--json='))?.slice('--json='.length);
if (jsonAt) { writeFileSync(resolve(jsonAt), JSON.stringify({ viewport: vp.name, rows, violations }, null, 2)); console.log(`wrote ${resolve(jsonAt)}`); }
if (violations.length) {
  for (const v of violations.slice(0, 20)) console.error(JSON.stringify(v));
  process.exit(1);
}
