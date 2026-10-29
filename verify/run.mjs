// PETROS visual + UX gate. Every limit comes from verify/thresholds.json.
// Fails (exit 1) if any row is red.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { evaluateFrame, compositionDistance, isDevRoomId } from './lib/metrics.mjs';
import { gateDust, gateHeroInside, gateHeroHeight, gateScales, gateSlab } from './lib/gates.mjs';
import { startServer, stopServer, BASE } from './lib/server.mjs';
import { ensureFreshDist } from './lib/fresh.mjs';
import { assertSupportedNode } from './lib/runtime.mjs';
import { findForbiddenCopy } from './lib/copy.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
assertSupportedNode();
// Refuse to measure a bundle that predates its sources.
ensureFreshDist(root, { build: !process.argv.includes('--no-build') });
const thresholds = JSON.parse(readFileSync(join(here, 'thresholds.json'), 'utf8'));
const cfg = JSON.parse(readFileSync(join(here, 'scenes.json'), 'utf8'));
const shotsDir = join(root, 'docs/redesign/verify_shots');
mkdirSync(shotsDir, { recursive: true });

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const evidenceDir = join(root, 'docs/redesign/evidence');
mkdirSync(evidenceDir, { recursive: true });
const scenes = cfg.scenes.filter((s) => only.length === 0 || only.includes(s.id));
const rows = [];
const hardErrors = [];
// Teardown failures of the headless GPU are harness noise, not an art or UI verdict.
const harnessWarnings = [];

const fmt = (v, d = 2) => (typeof v === 'number' ? v.toFixed(d) : String(v));

function domChecks({ t, mobile }) {
  const minFont = mobile ? t.ui.minFontPxMobile : t.ui.minFontPxDesktop;
  const textEls = [...document.querySelectorAll('body *')].filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!own) return false;
    const r = el.getBoundingClientRect();
    // Off-screen chrome (the skip link parked at -9999px) is not a small target.
    const onScreen = r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
    return r.width > 0 && r.height > 0 && onScreen;
  });
  const sizes = textEls.map((el) => ({
    size: parseFloat(getComputedStyle(el).fontSize),
    text: el.textContent.trim().slice(0, 40),
  }));
  const smallFonts = sizes.filter((s) => s.size < minFont);

  // What the eye can actually see: intersect every text box with the clip boxes of its
  // scroll/overflow ancestors. A card scrolled under the fixed dock inside `.office-main`
  // is clipped away, not overlapping the dock (measured: 8 phantom overlaps on a phone).
  const visibleRect = (el) => {
    const r = el.getBoundingClientRect();
    let x0 = 0, y0 = 0, x1 = innerWidth, y1 = innerHeight;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      const pr = p.getBoundingClientRect();
      if (cs.overflowX !== 'visible') { x0 = Math.max(x0, pr.left); x1 = Math.min(x1, pr.right); }
      if (cs.overflowY !== 'visible') { y0 = Math.max(y0, pr.top); y1 = Math.min(y1, pr.bottom); }
    }
    return { left: Math.max(r.left, x0), top: Math.max(r.top, y0), right: Math.min(r.right, x1), bottom: Math.min(r.bottom, y1) };
  };
  const visibleEls = [];
  const rects = [];
  textEls.forEach((el, i) => {
    const r = visibleRect(el);
    if (r.right - r.left > 2 && r.bottom - r.top > 2) { visibleEls.push(el); rects.push(r); }
  });
  let overlaps = 0;
  const overlapSamples = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      // A parent that owns text and also covers a child's text box is nesting, not overlap.
      if (w > 2 && h > 2 && !visibleEls[i].contains(visibleEls[j]) && !visibleEls[j].contains(visibleEls[i])) {
        overlaps++;
        if (overlapSamples.length < 3) overlapSamples.push(`${visibleEls[i].textContent.trim().slice(0, 20)} x ${visibleEls[j].textContent.trim().slice(0, 20)}`);
      }
    }
  }

  const interactive = [...document.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="link"], [role="tab"]')]
    .filter((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      // Only controls a finger can reach: parked off-screen skip links are excluded.
      const onScreen = r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
      return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0 && onScreen;
    });
  const smallTargets = mobile
    ? interactive
        .map((el) => ({ el: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 24), r: el.getBoundingClientRect() }))
        .filter((x) => x.r.width < 44 || x.r.height < 44)
        .map((x) => `${x.el}:${Math.round(x.r.width)}x${Math.round(x.r.height)}`)
    : [];

  return {
    horizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    minFont,
    smallFonts: smallFonts.slice(0, 5),
    textOverlaps: overlaps,
    overlapSamples,
    smallTargets: smallTargets.slice(0, 8),
    textCount: textEls.length,
  };
}

const server = await startServer();
const LAUNCH_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-lcd-text', '--disable-dev-shm-usage'];
let browser = await chromium.launch({ args: LAUNCH_ARGS });
// A 24-cell SwiftShader sweep can take the browser process down (OOM killing the
// renderer). Relaunch instead of aborting the whole gate with a stack trace.
const ensureBrowser = async () => {
  if (!browser.isConnected()) browser = await chromium.launch({ args: LAUNCH_ARGS });
  return browser;
};

try {
  // --vp=<substring> narrows the sweep while iterating; the full run passes no flag.
  const vpOnly = (process.argv.find((a) => a.startsWith('--vp=')) || '').slice(5);
  const viewports = cfg.viewports.filter((v) => !vpOnly || v.name.includes(vpOnly));
  const placeholderById = new Map();
  for (const vp of viewports) {
    const compositions = new Map();

    for (const scene of scenes) {
      // ONE FRESH CONTEXT PER CELL. Reusing a context across the five scenes of a
      // viewport made the same geometry measure differently depending on how many
      // pages had already rendered in it: content @ mobile-390x844 scored 545 lit
      // components as the first page of a context and 475 as the fourth, with an
      // identical 268.3x367.1 fit, the same tier (med), the same drawn count (53115)
      // and 20% fewer lit pixels. That is Chromium's SwiftShader/compositor state
      // drifting across pages, not the art, and a visitor never sees it. Each cell is
      // now measured in a pristine context, so the same frame scores the same number.
      const newContext = async () => {
        const b = await ensureBrowser();
        return b.newContext({
          viewport: { width: vp.width, height: vp.height },
          // Real devices: phones render at DPR 3, tablets at 2. A DPR-1 phone is not a phone.
          deviceScaleFactor: vp.mobile ? (vp.width < 700 ? 3 : 2) : 1,
          locale: 'fa-IR',
        });
      };
      let context = await newContext();
      // A headless-shell page can die under memory pressure (the 24-cell sweep does
      // exactly that). Retry once on a fresh context instead of aborting the sweep.
      let page;
      try {
        page = await context.newPage();
      } catch {
        await context.close().catch(() => {});
        context = await newContext();
        page = await context.newPage();
      }
      const consoleErrors = [];
      const consoleWarnings = [];
      const failedRequests = [];
      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160));
        if (m.type() === 'warning') consoleWarnings.push(m.text().slice(0, 160));
      });
      page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${String(e.message).slice(0, 160)}`));
      page.on('requestfailed', (r) => failedRequests.push(`${r.url().slice(0, 120)} :: ${r.failure()?.errorText}`));

      const tag = `${scene.id} @ ${vp.name}`;
      let ready = false;
      let shot = null;
      let blobShot = null;
      let canvasBox = null;
      let dom = null;
      let axeSerious = null;
      let sceneState = null;
      let fbShot = null;
      let roomMarker = null;
      let copyHits = null;
      let capDbg = null;
      try {
        await page.goto(`${BASE}/?verify=1`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForFunction('typeof window.__setSpatialScene === "function"', null, { timeout: 20000 });
        // `scene.id` is the id in scenes.json (`dev`), not the M2 harness's old name
        // (`dev_room`). Comparing against the stale name meant this branch never ran, so the
        // dev room was never measured in its live-work state and never turned amber on.
        const devRoom = isDevRoomId(scene.id);
        await page.evaluate((key) => window.__setSpatialScene(key), scene.key);
        try {
          // Ready means settled FOR THIS ROOM: the mount's own `welcome` scene settles first
          // and used to satisfy the wait, so the capture landed mid-reveal of the room under test.
          await page.waitForFunction((r) => window.__sceneReady === true && window.__sceneReadyRoom === r, scene.key, { timeout: 30000 });
          ready = true;
        } catch { ready = false; }
        await page.waitForTimeout(900);
        // A late data re-send or resize inside the settle window can restart the reveal, so
        // re-confirm settled FOR THIS ROOM right before the shutter (measured: a capture at
        // reveal 0.014 on welcome @ 1920x1080 slipped through the first wait).
        try {
          await page.waitForFunction((r) => window.__sceneReady === true && window.__sceneReadyRoom === r, scene.key, { timeout: 20000 });
          ready = true;
        } catch { ready = false; }
        // Amber is room-scoped and only means live work, so it is driven through the same
        // control the app uses (__setAmberLive -> Backdrop.setAmberLive), AFTER the room has
        // settled: setData() rebuilds the material, and a React re-render would overwrite a
        // value applied before it. Non-dev rooms are explicitly switched off.
        await page.evaluate((on) => {
          window.__taskRunning = on;
          window.__setAmberLive?.(on);
          window.__sceneHost?.setAmberLive?.(on);
        }, devRoom);
        await page.waitForTimeout(400);
        // Forbidden copy is checked only once the DOM is showing THIS room: a previous
        // room's text still in the tree would be measured as if it belonged here.
        try {
          roomMarker = await page.evaluate(() => document.querySelector('[data-room]')?.getAttribute('data-room') ?? null);
          copyHits = findForbiddenCopy(await page.evaluate(() => document.body.innerText), thresholds.copy);
        } catch (e) {
          copyHits = null;
          hardErrors.push(`${scene.id} @ ${vp.name}: copy probe failed: ${String(e).slice(0, 160)}`);
        }
        // SwiftShader composed a moving surface for every capture; freezing the loop first
        // lets Chromium present one settled frame instead of chasing the animation.
        await page.evaluate(() => window.__scenePause?.());
        await page.waitForTimeout(150);
        const shotTimeout = 120000;
        shot = await page.screenshot({ timeout: shotTimeout });
        writeFileSync(join(shotsDir, `${scene.id}-${vp.name}.png`), shot);
        // The point cloud alone: DOM text and dividers must not count as fused art.
        // `canvas.screenshot()` clips the COMPOSITED page to the canvas box, so every card,
        // caption and dock glyph painted over the plinth lands in the blob crop. Measured on
        // content @ 390x844 with one unchanged frame: the element shot gave 188 components /
        // 28 096 lit px while the canvas' own readback of the same crop gave 1 114 / 21 100.
        // The art verdict therefore reads the canvas backbuffer (the same pixels the slab
        // gate judges); the element shot stays only as a fallback for a canvas that cannot
        // hand back its pixels.
        const canvas = await page.$('canvas');
        if (canvas) {
          canvasBox = await canvas.boundingBox();
          try {
            const dataUrl = await page.evaluate(() => window.__sceneHost?.snapshot?.() || window.__pointsWorld?.snapshot?.() || null);
            if (dataUrl) {
              fbShot = Buffer.from(dataUrl.split(',')[1], 'base64');
              // keep the exact pixels the art gates judged, so a verdict can be re-examined
              writeFileSync(join(evidenceDir, `canvas-${scene.id}-${vp.name}.png`), fbShot);
            }
          } catch { fbShot = null; }
          blobShot = fbShot ?? await canvas.screenshot({ timeout: shotTimeout });
        }
        dom = await page.evaluate(domChecks, { t: thresholds, mobile: vp.mobile });
        sceneState = await page.evaluate(() => window.__sceneState || null);
        // Capture-time proof: which reveal value and fit the readback saw.
        capDbg = await page.evaluate(() => {
          const bd = window.__sceneHost?.bd;
          const u = bd?.material?.uniforms;
          return bd ? { reveal: u?.uReveal?.value ?? null, room: bd.data?.header?.room ?? null,
            fit: window.__sceneFit?.screen ?? null, free: window.__sceneFit?.free ?? null, raf: !!bd.raf,
            // Render knobs, so a pixel verdict can be traced to the frame that produced it.
            tier: window.__sceneState?.tier ?? null, budget: bd.budget ?? null,
            drawn: window.__sceneState?.drawn ?? null, soft: u?.uSoftScale?.value ?? null,
            maxPx: u?.uMaxPx?.value ?? null, rendererString: bd.rendererString ?? null } : null;
        });
        try {
          const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
          axeSerious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').length;
        } catch (e) { axeSerious = -1; consoleErrors.push(`axe: ${String(e).slice(0, 120)}`); }
        await page.evaluate(() => window.__sceneResume?.());
      } catch (e) {
        hardErrors.push(`${tag}: ${String(e).slice(0, 300)}`);
      }

      // The screenshot is in device pixels; focal rects are authored in CSS px.
      const shotScale = shot ? shot.readUInt32BE(16) / vp.width : 1;
      // The canvas crop is its own capture, so it has its own device-pixel scale.
      const blobScale = blobShot && canvasBox ? blobShot.readUInt32BE(16) / canvasBox.width : 1;
      const focal = () => scene.focal || cfg.defaultFocal;
      const result = shot
        ? evaluateFrame(shot, {
            sceneId: scene.id,
            blobBuffer: blobShot,
            // The blob gate measures the backdrop point cloud, so it crops to the SUBJECT the
            // camera actually framed (__sceneFit.screen), not a hand-authored rect that drifts
            // every time the fit changes: on 1920x1080 the stale rect covered mostly empty
            // frame and counted 51 components over 935 lit px, while the same pixels inside
            // the fitted subject box give 1603 components / 2.3% largest.
            blobCropRect: blobShot && canvasBox
              ? (() => {
                  const fit = capDbg?.fit ?? null;
                  const pad = 0.06;
                  if (fit && fit.w > 8 && fit.h > 8) {
                    const px_ = fit.w * pad, py_ = fit.h * pad;
                    return {
                      x: (fit.x - px_ - canvasBox.x) * blobScale,
                      y: (fit.y - py_ - canvasBox.y) * blobScale,
                      width: (fit.w + 2 * px_) * blobScale,
                      height: (fit.h + 2 * py_) * blobScale,
                    };
                  }
                  return {
                    x: (focal().xPct * vp.width - canvasBox.x) * blobScale,
                    y: (focal().yPct * vp.height - canvasBox.y) * blobScale,
                    width: focal().wPct * vp.width * blobScale,
                    height: focal().hPct * vp.height * blobScale,
                  };
                })()
              : null,
            focalRect: (() => {
              const f = focal();
              return {
                x: f.xPct * vp.width * shotScale,
                y: f.yPct * vp.height * shotScale,
                width: f.wPct * vp.width * shotScale,
                height: f.hPct * vp.height * shotScale,
              };
            })(),
            thresholds,
          })
        : null;

      const checks = [];
      if (!result) checks.push('no screenshot');
      else checks.push(...result.rows.map((r) => ({ name: r.name, value: r.value, limit: r.limit, pass: r.pass })));
      checks.push({ name: 'sceneReady', value: ready, limit: 'true', pass: ready });
      checks.push({ name: 'room marker', value: roomMarker, limit: scene.key, pass: roomMarker === scene.key });
      checks.push({ name: 'forbidden copy', value: copyHits === null ? 'n/a' : (copyHits.join('|') || 0), limit: '0', pass: copyHits !== null && copyHits.length === 0 });
      // Additive gates G1-G5 (human review): they do not replace or relax any existing
      // check, and their limits are fixed here rather than in thresholds.json.
      checks.push(gateDust(sceneState));
      checks.push(gateHeroInside(sceneState));
      checks.push(gateHeroHeight(sceneState, vp.height));
      checks.push(gateScales(sceneState));
      if (fbShot) checks.push(gateSlab(fbShot, 0.40));
      if (dom) {
        checks.push({ name: 'console errors', value: consoleErrors.length, limit: `<= ${thresholds.ui.maxConsoleErrors}`, pass: consoleErrors.length <= thresholds.ui.maxConsoleErrors });
        checks.push({ name: 'console warnings', value: consoleWarnings.length, limit: `<= ${thresholds.ui.maxConsoleWarnings}`, pass: consoleWarnings.length <= thresholds.ui.maxConsoleWarnings });
        checks.push({ name: 'failed requests', value: failedRequests.length, limit: `<= ${thresholds.ui.maxFailedRequests}`, pass: failedRequests.length <= thresholds.ui.maxFailedRequests });
        checks.push({ name: 'horizontal scroll', value: dom.horizontalScroll, limit: 'false', pass: dom.horizontalScroll === thresholds.ui.allowHorizontalScroll });
        checks.push({ name: 'text overlaps', value: dom.textOverlaps, limit: `<= ${thresholds.ui.maxTextOverlaps}`, pass: dom.textOverlaps <= thresholds.ui.maxTextOverlaps });
        checks.push({ name: 'small fonts', value: dom.smallFonts.length, limit: `0 (< ${dom.minFont}px)`, pass: dom.smallFonts.length === 0 });
        if (vp.mobile) checks.push({ name: 'small touch targets', value: dom.smallTargets.length, limit: '0 (< 44px)', pass: dom.smallTargets.length === 0 });
        checks.push({ name: 'axe serious/critical', value: axeSerious, limit: `<= ${thresholds.ui.maxAxeSeriousCritical}`, pass: axeSerious === 0 });
      }

      // Scope: a labelled placeholder is not art, so the look rows cannot be measured yet,
      // and a room with no frames declared has no hero boxes. Both are reported as N/A with
      // a reason (THRESHOLD_CHANGES.md, 2026-10-18 P1) and re-enable automatically.
      const LOOK = /near-white %|mean luma|non-bg %|amber % of non-bg|lit components \(2x crop\)|largest component %/;
      const HERO = /^G[1-4] /;
      const reason = (name) => {
        if (sceneState?.placeholder && LOOK.test(name)) return 'placeholder art: PENDING_HUMAN_INPUT §1';
        if (HERO.test(name) && !(sceneState?.instances?.length)) return 'procedural set: no asset instances (G1-G4 apply to instance scenes)';
        return null;
      };
      const scoped = checks.map((c) => { const r = reason(c.name); return r ? { ...c, pass: true, na: r } : c; });
      checks.length = 0; checks.push(...scoped);
      const naCount = scoped.filter((c) => c.na).length;

      placeholderById.set(scene.id, !!sceneState?.placeholder);
      if (result) compositions.set(scene.id, result.composition);
      rows.push({
        capDbg,
        tag, scene: scene.id, viewport: vp.name, checks,
        pass: checks.every((c) => c.pass),
        stats: result?.stats ?? null,
        blob: result?.blob ?? null,
        details: { consoleErrors, consoleWarnings, failedRequests, dom },
        naCount,
      });
      await page.close();
      try { await context.close(); } catch (e) { harnessWarnings.push(`context teardown @ ${tag}: ${String(e).slice(0, 120)}`); }
    }

    // distinctness: every pair of scenes must differ
    const ids = [...compositions.keys()];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const d = compositionDistance(compositions.get(ids[i]), compositions.get(ids[j]));
        const min = thresholds.composition.minJaccardDistance;
        // Identical placeholder slates are not expected to differ from each other.
        const na = placeholderById.get(ids[i]) && placeholderById.get(ids[j]) ? 'placeholder art: PENDING_HUMAN_INPUT §1' : null;
        rows.push({
          tag: `composition ${ids[i]} vs ${ids[j]} @ ${vp.name}`,
          scene: `composition:${ids[i]}|${ids[j]}`,
          viewport: vp.name,
          checks: [{ name: 'composition distance', value: d, limit: `>= ${min}`, pass: na ? true : d >= min, na }],
          pass: na ? true : d >= min,
          naCount: na ? 1 : 0,
          stats: null, blob: null, details: {},
        });
      }
    }
  }
} finally {
  try { await browser.close(); } catch { /* already gone */ }
  stopServer(server.child);
}

const header = ['scene', 'viewport', 'nearWhite%', 'meanLuma', 'nonBg%', 'amber%', 'litComps', 'largest%', 'console', 'a11y', 'RESULT'];
console.log(header.map((h, i) => h.padEnd([18, 18, 11, 9, 8, 8, 9, 9, 8, 6, 7][i])).join(' '));
console.log('-'.repeat(118));
let failed = 0;
for (const row of rows) {
  const g = (n) => row.checks.find((c) => c.name === n);
  const v = (n, d = 2) => { const c = g(n); return c ? fmt(c.value, d) : '-'; };
  const consoleBad = (g('console errors')?.value ?? 0) + (g('console warnings')?.value ?? 0);
  const out = [
    row.scene.slice(0, 17).padEnd(18),
    row.viewport.padEnd(18),
    v('near-white %').padEnd(11),
    v('mean luma').padEnd(9),
    v('non-bg %').padEnd(8),
    v('amber % of non-bg').padEnd(8),
    v('lit components (2x crop)', 0).padEnd(9),
    v('largest component %').padEnd(9),
    (/composition/.test(row.scene) ? '-' : String(consoleBad)).padEnd(8),
    (/composition/.test(row.scene) ? '-' : v('axe serious/critical', 0)).padEnd(6),
    (row.pass ? (row.naCount ? `PASS*` : 'PASS') : 'FAIL').padEnd(7),
  ].join(' ');
  console.log(out);
  if (!row.pass) {
    failed++;
    for (const c of row.checks.filter((x) => !x.pass)) {
      console.log(`    ^ ${row.tag}: ${c.name} = ${fmt(c.value)} (limit ${c.limit})`);
    }
    for (const e of row.details?.consoleErrors?.slice(0, 3) || []) console.log(`    ! console error: ${e}`);
    for (const e of row.details?.consoleWarnings?.slice(0, 2) || []) console.log(`    ! console warning: ${e}`);
    for (const e of row.details?.failedRequests?.slice(0, 3) || []) console.log(`    ! request failed: ${e}`);
    for (const e of row.details?.dom?.smallFonts?.slice(0, 3) || []) console.log(`    ! font ${e.size}px: ${e.text}`);
    for (const e of row.details?.dom?.smallTargets || []) console.log(`    ! touch target ${e}`);
    for (const e of row.details?.dom?.overlapSamples || []) console.log(`    ! overlap: ${e}`);
  }
}
for (const e of hardErrors) console.log(`HARD ERROR ${e}`);
for (const w of harnessWarnings) console.log(`HARNESS WARNING ${w}`);
writeFileSync(join(root, 'docs/redesign/verify_shots/last-run.json'), JSON.stringify({ thresholds, rows, hardErrors, harnessWarnings }, null, 2));
console.log('-'.repeat(118));
const naTotal = rows.reduce((n, r) => n + (r.naCount || 0), 0);
console.log(`rows: ${rows.length}  failed: ${failed}  hard errors: ${hardErrors.length}  not-applicable rows: ${naTotal}  thresholds: verify/thresholds.json`);
process.exit(failed === 0 && hardErrors.length === 0 ? 0 : 1);
