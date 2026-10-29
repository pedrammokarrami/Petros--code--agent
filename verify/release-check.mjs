// npm run release:check
//
// The gate that runs once, before a release, on the repository as shipped rather than on a
// live page. Three things it can catch that no browser gate can:
//
//   1. Script drift: a package.json entry pointing at a file that does not exist. That is how
//      this very check was missing; it is the first thing a release must not get wrong.
//   2. Art provenance: the ten `public/scene-sources/<room>-<orient>.png` records must exist,
//      decode, have the right dimensions, and carry actual structure — a flat slate fails.
//   3. Placeholder leakage: a room wired to a `*.placeholder.png` or a `placeholder: true`
//      `.dptscn` is a room that ships a promise instead of a picture.
//
// It exits 0 only when every row passes. It never runs the browser; `npm run verify` does
// that. This is the cheap, offline half of the release contract.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';

const ROOMS = ['welcome', 'dev', 'research', 'content', 'command'];
const ORIENTS = { '169': [1920, 1080], '916': [1080, 1920] };
const SRC_DIR = 'public/scene-sources';
const BAKED_DIR = 'public/scenes';

const rows = [];
const add = (name, pass, detail) => rows.push({ name, pass, detail });

// ---- 1. every local file a script names must exist --------------------------------
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const missingScripts = [];
for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) {
  for (const m of String(cmd).matchAll(/(?:^|&&|\|\||;)\s*(?:node|python3)\s+(?:"([^"]+)"|([^\s&|]+))/g)) {
    const rel = m[1] ?? m[2];
    if (!rel || !/\.(mjs|cjs|js|ts|py)$/.test(rel)) continue;
    if (!existsSync(rel)) missingScripts.push(`${name} -> ${rel}`);
  }
}
add('scripts resolve', missingScripts.length === 0, missingScripts.length ? missingScripts.join('; ') : `${Object.keys(pkg.scripts ?? {}).length} entries`);

// ---- 2. thresholds are present and complete ---------------------------------------
const REQUIRED_THRESHOLDS = [
  'luma.nearWhiteMaxPercent', 'luma.meanLumaMin', 'luma.meanLumaMax',
  'luma.nonBgMinPercent', 'luma.nonBgMaxPercent',
  'amber.maxPercentOfNonBg', 'amber.devRoomMinPercentOfNonBg', 'amber.nonDevRoomExact',
  'blob.minLitComponents', 'blob.maxLitAreaPercent',
  'ui.maxConsoleErrors', 'ui.maxAxeSeriousCritical',
];
let th = null;
let thErr = '';
try {
  th = JSON.parse(readFileSync('verify/thresholds.json', 'utf8'));
} catch (e) {
  thErr = String(e);
}
const dig = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const missingTh = th ? REQUIRED_THRESHOLDS.filter((p) => dig(th, p) === undefined) : REQUIRED_THRESHOLDS;
add('thresholds complete', !!th && missingTh.length === 0, thErr || (missingTh.length ? `missing ${missingTh.join(', ')}` : `${REQUIRED_THRESHOLDS.length} keys`));

// ---- 3. the ten backdrop records exist, decode, and vary --------------------------
function lumaStats(png) {
  const n = png.width * png.height;
  let sum = 0, sum2 = 0;
  for (let i = 0; i < n; i++) {
    const k = i * 4;
    const l = 0.2126 * png.data[k] + 0.7152 * png.data[k + 1] + 0.0722 * png.data[k + 2];
    sum += l; sum2 += l * l;
  }
  const mean = sum / n;
  return { mean, sd: Math.sqrt(Math.max(0, sum2 / n - mean * mean)) };
}
// A coarse fingerprint of the frame, so five rooms that are secretly one picture fail.
function fingerprint(png) {
  let h = 2166136261 >>> 0;
  const stepX = Math.max(1, Math.floor(png.width / 24));
  const stepY = Math.max(1, Math.floor(png.height / 14));
  for (let y = 0; y < png.height; y += stepY) {
    for (let x = 0; x < png.width; x += stepX) {
      const k = (y * png.width + x) * 4;
      h ^= (png.data[k] >> 3) | (png.data[k + 1] << 3) | (png.data[k + 2] << 9);
      h = Math.imul(h, 16777619) >>> 0;
    }
  }
  return h.toString(16);
}

const prints = new Map();
const badAssets = [];
let records = 0;
for (const room of ROOMS) {
  for (const [orient, [w, h]] of Object.entries(ORIENTS)) {
    records++;
    const p = join(SRC_DIR, `${room}-${orient}.png`);
    if (!existsSync(p)) { badAssets.push(`${room}-${orient}: missing`); continue; }
    let png;
    try { png = PNG.sync.read(readFileSync(p)); } catch (e) { badAssets.push(`${room}-${orient}: undecodable`); continue; }
    if (png.width !== w || png.height !== h) badAssets.push(`${room}-${orient}: ${png.width}x${png.height} != ${w}x${h}`);
    const { mean, sd } = lumaStats(png);
    if (sd < 3) badAssets.push(`${room}-${orient}: flat (sd ${sd.toFixed(2)})`);
    if (mean < 1 || mean > 80) badAssets.push(`${room}-${orient}: mean ${mean.toFixed(2)} out of range`);
    const fp = fingerprint(png);
    const twin = [...prints.entries()].find(([, other]) => other === fp);
    if (twin) badAssets.push(`${room}-${orient}: identical to ${twin[0]}`);
    prints.set(`${room}-${orient}`, fp);
  }
}
add('backdrop records', badAssets.length === 0, badAssets.length ? badAssets.slice(0, 6).join('; ') : `${records}/${records} records, all distinct`);

// ---- 4. no placeholder art left on the shipping surface --------------------------
const leftovers = [];
if (existsSync(SRC_DIR)) {
  for (const f of readdirSync(SRC_DIR)) if (f.endsWith('.placeholder.png')) leftovers.push(`scene-sources/${f}`);
}
if (existsSync(BAKED_DIR)) {
  for (const f of readdirSync(BAKED_DIR)) {
    if (!f.endsWith('.dptscn')) continue;
    const buf = readFileSync(join(BAKED_DIR, f));
    if (buf.subarray(0, 4).toString() !== 'DPT1') continue;
    // header magic is followed by a JSON header; a placeholder scene must not ship
    const jsonStart = buf.indexOf(0x7b);
    const jsonEnd = buf.indexOf(0x7d, jsonStart);
    if (jsonStart > 0 && jsonEnd > jsonStart) {
      try {
        const header = JSON.parse(buf.subarray(jsonStart, jsonEnd + 1).toString());
        if (header.placeholder) leftovers.push(`scenes/${f} (placeholder: true)`);
      } catch { /* opaque header: not a placeholder we can prove */ }
    }
  }
}
add('no placeholder art', leftovers.length === 0, leftovers.length ? leftovers.slice(0, 6).join('; ') : 'none');

// ---- 5. the release actually built ------------------------------------------------
const built = ['dist/index.html', 'dist/server.cjs'].filter((p) => existsSync(p));
add('build artifacts', built.length === 2, built.length === 2 ? 'dist/index.html + dist/server.cjs' : `missing ${['dist/index.html', 'dist/server.cjs'].filter((p) => !existsSync(p)).join(', ')} (run npm run build)`);

// ---- report -----------------------------------------------------------------------
let failed = 0;
for (const r of rows) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name.padEnd(20)} ${r.detail}`);
}
console.log(`\nrelease-check: ${rows.length - failed}/${rows.length} passed`);
process.exit(failed === 0 ? 0 : 1);
