// G5 selftest: a hard-edged rectangle MUST fail the slab detector; a soft radial
// blob MUST pass. If this fixture ever passes the rectangle, G5 is broken.
import { PNG } from 'pngjs';
import { slabMetric } from './lib/gates.mjs';

const W = 480, H = 270;
function make(fn) {
  const png = new PNG({ width: W, height: H });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const v = fn(x, y);
    png.data[i] = v; png.data[i + 1] = v; png.data[i + 2] = v; png.data[i + 3] = 255;
  }
  return PNG.sync.write(png);
}
const rect = make((x, y) => (x > W * 0.62 && y > H * 0.1 && y < H * 0.95) ? 200 : 6);
const soft = make((x, y) => {
  const dx = (x - W * 0.5) / (W * 0.35), dy = (y - H * 0.5) / (H * 0.35);
  return Math.round(180 * Math.max(0, 1 - dx * dx - dy * dy));
});
const r = slabMetric(rect), s = slabMetric(soft);
console.log(`hard rectangle: col=${(r.colEdge * 100).toFixed(1)}% row=${(r.rowEdge * 100).toFixed(1)}%  -> must exceed 40%`);
console.log(`soft blob:      col=${(s.colEdge * 100).toFixed(1)}% row=${(s.rowEdge * 100).toFixed(1)}%  -> must stay below 40%`);
const ok = Math.max(r.colEdge, r.rowEdge) > 0.40 && Math.max(s.colEdge, s.rowEdge) <= 0.40;
console.log(ok ? 'PASS: slab detector separates hard edges from soft falloff' : 'FAIL: slab detector is not discriminating');
process.exit(ok ? 0 : 1);
