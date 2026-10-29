// Forbidden-copy gate: no engineering provenance on the product surface.
//
// The full sweep (verify/run.mjs) runs the same check per cell; this entry point is the
// CI-sized version: the rooms and two viewports from thresholds.copy, no screenshots, ~1 min.
// It exits non-zero when the copy leaks, when a room never becomes ready for itself, or when
// the room marker does not match the room under test (the "stale previous room" failure).
//
// Usage: node verify/copy.mjs [--no-build] [--json=<path>] [--query='?provenance=1']
//   --query exists to prove the gate fires on real output: the developer-only provenance
//   surface is exactly the copy this gate forbids. Production runs use the bare "/".
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer, stopServer, BASE } from './lib/server.mjs';
import { ensureFreshDist } from './lib/fresh.mjs';
import { assertSupportedNode } from './lib/runtime.mjs';
import { findForbiddenCopy } from './lib/copy.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

assertSupportedNode();
const argv = process.argv.slice(2);
ensureFreshDist(root, { build: !argv.includes('--no-build') });

const thresholds = JSON.parse(readFileSync(join(here, 'thresholds.json'), 'utf8'));
const scenes = JSON.parse(readFileSync(join(here, 'scenes.json'), 'utf8'));
const copy = thresholds.copy;
const arg = (name, fallback) => (argv.find((a) => a.startsWith(`--${name}=`)) || `--${name}=${fallback}`).slice(name.length + 3);
const query = arg('query', '');

// Viewport sizes are defined once, in scenes.json; this gate names them.
const viewports = copy.viewports.map((name) => {
  const vp = scenes.viewports.find((v) => v.name === name);
  if (!vp) throw new Error(`thresholds.copy.viewports names unknown viewport "${name}" (see verify/scenes.json)`);
  return vp;
});

const LAUNCH_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-lcd-text', '--disable-dev-shm-usage'];

const server = await startServer();
let browser = await chromium.launch({ args: LAUNCH_ARGS });
const rows = [];
let failed = 0;

try {
  for (const vp of viewports) {
    if (!browser.isConnected()) browser = await chromium.launch({ args: LAUNCH_ARGS });
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, locale: 'fa-IR' });
    for (const room of copy.rooms) {
      const page = await ctx.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(`pageerror: ${String(e.message).slice(0, 140)}`));
      page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(`console: ${m.text().slice(0, 140)}`); });
      const row = { room, viewport: vp.name, ready: false, marker: null, banned: [], errors: pageErrors, pass: false };
      try {
        // Plain "/", not "?verify=1": this gate judges the surface a visitor sees.
        await page.goto(`${BASE}/${query}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForFunction('typeof window.__setSpatialScene === "function"', null, { timeout: 20000 });
        await page.evaluate((k) => window.__setSpatialScene(k), room);
        try {
          await page.waitForFunction((r) => window.__sceneReady === true && window.__sceneReadyRoom === r, room, { timeout: 30000 });
          row.ready = true;
        } catch { row.ready = false; }
        // The marker is the anti-stale proof: the DOM must be showing THIS room, not the
        // previous one, before its text is read.
        try {
          await page.waitForFunction((r) => document.querySelector('[data-room]')?.getAttribute('data-room') === r, room, { timeout: 15000 });
        } catch { /* recorded below via row.marker */ }
        row.marker = await page.evaluate(() => document.querySelector('[data-room]')?.getAttribute('data-room') ?? null);
        const text = await page.evaluate(() => document.body.innerText);
        row.banned = findForbiddenCopy(text, copy);
        row.pass = row.ready && row.marker === room && row.banned.length === 0 && pageErrors.length === 0;
      } catch (e) {
        row.errors.push(String(e && e.message || e).slice(0, 200));
        row.pass = false;
      } finally {
        await page.close().catch(() => {});
      }
      if (!row.pass) failed++;
      rows.push(row);
      const status = row.pass ? 'PASS' : 'FAIL';
      console.log(`${row.room.padEnd(9)} ${vp.name.padEnd(19)} ready=${row.ready ? 'y' : 'n'} marker=${row.marker ?? '-'} banned=[${row.banned.join(',') || '-'}] ${status}`);
      if (!row.pass) {
        if (!row.ready) console.log(`    ^ ${row.room}@${vp.name}: __sceneReadyRoom never became "${row.room}"`);
        if (row.marker !== room) console.log(`    ^ ${row.room}@${vp.name}: room marker is "${row.marker}" (stale or wrong room)`);
        for (const id of row.banned) console.log(`    ^ ${row.room}@${vp.name}: forbidden copy pattern "${id}"`);
        for (const e of row.errors.slice(0, 3)) console.log(`    ! ${e}`);
      }
    }
    await ctx.close().catch(() => {});
  }
} finally {
  try { await browser.close(); } catch { /* already gone */ }
  stopServer(server.child);
}

const jsonArg = argv.find((a) => a.startsWith('--json='));
if (jsonArg) {
  const out = jsonArg.slice('--json='.length);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ patterns: copy.patterns.map((p) => p.id), rows }, null, 2) + '\n');
}
console.log(`rows: ${rows.length}  failed: ${failed}  patterns: ${copy.patterns.length}  thresholds: verify/thresholds.json`);
process.exit(failed === 0 ? 0 : 1);
