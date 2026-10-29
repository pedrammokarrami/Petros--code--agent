// Text-over-scene contrast, measured from rendered pixels: no CSS guessing.
// A UI label sits on a live point cloud, so its real backdrop is unknown until the GPU
// has drawn it. We therefore measure what the compositor produced inside the element's
// own box: background = 20th percentile luma, text core = 99.9th percentile luma
// (thin 1px icon strokes occupy <1% of a 44x44 button, so the tail, not the mean, is the
// glyph). WCAG 2.x relative-luminance ratio, threshold 4.5 for normal text.
import { PNG } from 'pngjs';

const srgb = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export const relLum = (r, g, b) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
export const ratio = (a, b) => { const hi = Math.max(a, b), lo = Math.min(a, b); return (hi + 0.05) / (lo + 0.05); };

export function cropPng(pngBuffer, box) {
  const src = PNG.sync.read(pngBuffer);
  const x0 = Math.max(0, Math.round(box.x)), y0 = Math.max(0, Math.round(box.y));
  const w = Math.min(src.width - x0, Math.round(box.width)), h = Math.min(src.height - y0, Math.round(box.height));
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    const from = ((y0 + y) * src.width + x0) * 4;
    src.data.copy(out.data, y * w * 4, from, from + w * 4);
  }
  return PNG.sync.write(out);
}

export function measureContrast(pngBuffer) {
  const png = PNG.sync.read(pngBuffer);
  const ls = [];
  for (let i = 0; i < png.data.length; i += 4) ls.push(relLum(png.data[i], png.data[i + 1], png.data[i + 2]));
  ls.sort((a, b) => a - b);
  const at = (q) => ls[Math.min(ls.length - 1, Math.max(0, Math.floor(q * ls.length)))];
  const bg = at(0.20);
  const fg = at(0.999);
  return { contrast: +ratio(fg, bg).toFixed(2), bg: +bg.toFixed(4), fg: +fg.toFixed(4), pixels: ls.length };
}
