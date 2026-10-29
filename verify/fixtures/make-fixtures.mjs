// Deterministic controls for verify:selftest. Regenerate with `npm run verify:fixtures`.
import { PNG } from 'pngjs';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const W = 960, H = 540;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas() {
  const png = new PNG({ width: W, height: H });
  return png;
}
function put(png, x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255;
}
function fill(png, r, g, b) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(png, x, y, r, g, b);
}

// (a) solid white: must FAIL (near-white, mean luma)
const a = canvas(); fill(a, 255, 255, 255);
writeFileSync(join(here, 'a-solid-white.png'), PNG.sync.write(a));

// (b) flat dark: must FAIL (no content at all)
const b = canvas(); fill(b, 7, 10, 16);
writeFileSync(join(here, 'b-flat-dark.png'), PNG.sync.write(b));

// (c) one glowing blob: must FAIL (a single lit component)
const c = canvas(); fill(c, 7, 10, 16);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const d = Math.hypot(x - W / 2, y - H / 2);
  if (d < 130) {
    const k = Math.pow(1 - d / 130, 1.6);
    put(c, x, y, Math.round(120 * k + 7), Math.round(160 * k + 10), Math.round(210 * k + 16));
  }
}
writeFileSync(join(here, 'c-solid-blob.png'), PNG.sync.write(c));

// (d) plausible point-cloud frame: must PASS (gaussian-ish dots, ~15% coverage)
const d = canvas(); fill(d, 7, 10, 16);
const rnd = mulberry32(20261018);
for (let i = 0; i < 40000; i++) {
  const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H);
  const lum = 45 + rnd() * 55;                       // cold ramp, never amber
  const r = Math.round(lum * 0.72), g = Math.round(lum * 0.86), bb = Math.round(Math.min(255, lum * 1.15));
  put(d, x, y, r, g, bb);
  if (rnd() > 0.35) { put(d, x + 1, y, r, g, bb); put(d, x, y + 1, r, g, bb); }
}
writeFileSync(join(here, 'd-point-cloud.png'), PNG.sync.write(d));
console.log('fixtures written:', ['a-solid-white.png', 'b-flat-dark.png', 'c-solid-blob.png', 'd-point-cloud.png'].join(', '));
