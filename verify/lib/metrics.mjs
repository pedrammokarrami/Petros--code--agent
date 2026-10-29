// Pure image metrics for the PETROS visual gate.
// No thresholds live here: every limit is read from verify/thresholds.json.
import { PNG } from 'pngjs';

export function decodePng(buffer) {
  return PNG.sync.read(buffer);
}

const lumaOf = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function hsv(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  const v = max / 255;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, v };
}

/** Median luma of a 2px border ring: the page's resting background. */
export function backgroundLuma(png) {
  const { width, height, data } = png;
  const samples = [];
  const ring = 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < ring || y < ring || x >= width - ring || y >= height - ring) {
        const i = (y * width + x) * 4;
        samples.push(lumaOf(data[i], data[i + 1], data[i + 2]));
      }
    }
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

export function imageStats(png, t, artPng) {
  // Coverage/near-white/mean-luma are claims about the RENDER, not the DOM. When a
  // canvas-only capture is supplied they are measured there: a paragraph of UI text
  // must never count as "art coverage" (verified: welcome desktop was 9.56% full-frame
  // vs 5.68% on the art region, i.e. 41% of the reading was chrome).
  const src = artPng || png;
  const { width, height, data } = src;
  const total = width * height;
  const bg = backgroundLuma(src);
  let nearWhite = 0, sumLuma = 0, nonBg = 0, amber = 0;
  for (let p = 0; p < total; p++) {
    const i = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const l = lumaOf(r, g, b);
    sumLuma += l;
    if (l > t.luma.nearWhiteThreshold) nearWhite++;
    const isNonBg = l > bg + t.luma.nonBgDelta;
    if (isNonBg) {
      nonBg++;
      const { h, s } = hsv(r, g, b);
      if (h >= t.amber.hueMin && h <= t.amber.hueMax && s > t.amber.satMin && l > t.amber.lumaMin) amber++;
    }
  }
  return {
    bgLuma: bg,
    nearWhitePercent: (nearWhite / total) * 100,
    meanLuma: sumLuma / total,
    nonBgPercent: (nonBg / total) * 100,
    amberPercentOfNonBg: nonBg === 0 ? 0 : (amber / nonBg) * 100,
    nonBgPixels: nonBg,
  };
}

/** Nearest-neighbour 2x upscale so touching points separate before counting. */
export function upscale2x(png, rect) {
  const x0 = Math.max(0, Math.round(rect.x)), y0 = Math.max(0, Math.round(rect.y));
  const w = Math.min(png.width - x0, Math.round(rect.width));
  const h = Math.min(png.height - y0, Math.round(rect.height));
  const out = new PNG({ width: w * 2, height: h * 2 });
  for (let y = 0; y < h * 2; y++) {
    for (let x = 0; x < w * 2; x++) {
      const si = ((y0 + (y >> 1)) * png.width + (x0 + (x >> 1))) * 4;
      const di = (y * w * 2 + x) * 4;
      out.data[di] = png.data[si];
      out.data[di + 1] = png.data[si + 1];
      out.data[di + 2] = png.data[si + 2];
      out.data[di + 3] = 255;
    }
  }
  return out;
}

/** 8-connected component count + largest share of lit area. */
export function blobStats(png, litLuma) {
  const { width, height, data } = png;
  const lit = new Uint8Array(width * height);
  let litCount = 0;
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    if (lumaOf(data[i], data[i + 1], data[i + 2]) >= litLuma) { lit[p] = 1; litCount++; }
  }
  if (litCount === 0) return { components: 0, largestPercent: litCount === 0 ? 100 : 0, litPixels: 0 };
  const seen = new Uint8Array(width * height);
  const stack = [];
  let components = 0, largest = 0;
  for (let p = 0; p < width * height; p++) {
    if (!lit[p] || seen[p]) continue;
    components++;
    let area = 0;
    stack.push(p);
    seen[p] = 1;
    while (stack.length) {
      const q = stack.pop();
      area++;
      const qx = q % width, qy = (q - qx) / width;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = qx + dx, ny = qy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const n = ny * width + nx;
          if (lit[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
        }
      }
    }
    if (area > largest) largest = area;
  }
  return { components, largestPercent: (largest / litCount) * 100, litPixels: litCount };
}

/**
 * Composition distance: Jaccard distance of two 32x18 occupancy grids of lit pixels
 * over the art region (drawer 28% and chat band 18% excluded).
 *
 * Why this replaced the 8x8 gradient dHash: dHash could not separate scene identity at
 * all in this corpus. Measured on 2026-10-18 over the committed shots:
 *   same scene, laptop vs desktop viewport : 3..14 (mean 7.0)   <- "identical" scores
 *   different scenes, same viewport        : 2..11 (mean 5.9)   <- should be far apart
 * The distance between "same" and "different" was inverted, so the >=12 threshold was
 * unreachable for real reasons, not an art defect. Occupancy distance on the same shots:
 *   same scene (identical frame, deterministic) : 0.000
 *   different scenes, per viewport              : mobile 0.376  tablet 0.613
 *                                                 laptop 0.570  desktop 0.726
 * See docs/redesign/THRESHOLD_CHANGES.md.
 */
export function compositionGrid(png, gridW = 32, gridH = 18) {
  const x1 = Math.floor(png.width * 0.72);
  const y1 = Math.floor(png.height * 0.82);
  const bg = backgroundLuma(png);
  const g = new Float64Array(gridW * gridH);
  for (let y = 0; y < y1; y++) {
    for (let x = 0; x < x1; x++) {
      const i = (y * png.width + x) * 4;
      if (lumaOf(png.data[i], png.data[i + 1], png.data[i + 2]) > bg + 10) {
        g[Math.min(gridH - 1, Math.floor((y / y1) * gridH)) * gridW + Math.min(gridW - 1, Math.floor((x / x1) * gridW))]++;
      }
    }
  }
  let max = 0;
  for (const v of g) if (v > max) max = v;
  return max ? Array.from(g, (v) => v / max) : Array.from(g, () => 0);
}

/** Jaccard distance of two occupancy grids; cells count as occupied at >=15% of peak. */
export function compositionDistance(a, b, level = 0.15) {
  let both = 0, either = 0;
  for (let k = 0; k < a.length; k++) {
    const A = a[k] > level, B = b[k] > level;
    if (A && B) both++;
    if (A || B) either++;
  }
  return either === 0 ? 0 : 1 - both / either;
}

/** 64-bit dHash (8x8 gradient) as a hex string. Retained for ad-hoc diffing only. */
export function dHash(png) {
  const w = 9, h = 8;
  const gray = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.min(png.width - 1, Math.floor((x * png.width) / w));
      const sy = Math.min(png.height - 1, Math.floor((y * png.height) / h));
      const i = (sy * png.width + sx) * 4;
      gray[y * w + x] = lumaOf(png.data[i], png.data[i + 1], png.data[i + 2]);
    }
  }
  let out = '';
  for (let y = 0; y < h; y++) {
    let byte = 0;
    for (let x = 0; x < 8; x++) {
      byte = (byte << 1) | (gray[y * w + x + 1] > gray[y * w + x] ? 1 : 0);
    }
    out += byte.toString(16).padStart(2, '0');
  }
  return out;
}

export function hamming(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i += 2) {
    let x = parseInt(a.slice(i, i + 2), 16) ^ parseInt(b.slice(i, i + 2), 16);
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}

/**
 * The dev room has been called `dev_room` since the M2 harness was written, but the scene ids
 * in scenes.json (and the app's own keys) are `dev`. The mismatch made the amber rule compare
 * against a name that never occurs, so every frame was measured with the non-dev `0-0` limit.
 */
export const DEV_ROOM_IDS = new Set(['dev', 'dev_room']);

export function isDevRoomId(id) {
  return DEV_ROOM_IDS.has(String(id ?? '').toLowerCase());
}

/**
 * Evaluate one frame against the committed thresholds.
 * sceneId drives the amber rule (the dev room needs amber, every other scene must have none).
 */
export function evaluateFrame(buffer, { sceneId, focalRect, thresholds, blobBuffer, blobCropRect }) {
  const png = decodePng(buffer);
  const t = thresholds;
  const artPng = blobBuffer ? decodePng(blobBuffer) : null;
  const stats = imageStats(png, t, artPng);
  // The anti-blob rule is about the point cloud fusing, so when a canvas-only
  // capture is supplied the blob is counted there: DOM text and dividers are
  // chrome, not art, and a caption line must never fail a points gate.
  const blobPng = artPng || png;
  const blobRect = blobCropRect || focalRect || { x: blobPng.width * 0.25, y: blobPng.height * 0.2, width: blobPng.width * 0.5, height: blobPng.height * 0.6 };
  const crop = upscale2x(blobPng, blobRect);
  const blob = blobStats(crop, t.blob.litLuma);

  const amberRule = isDevRoomId(sceneId)
    ? { min: t.amber.devRoomMinPercentOfNonBg, max: t.amber.maxPercentOfNonBg }
    : { min: t.amber.nonDevRoomExact, max: t.amber.nonDevRoomExact };

  const rows = [
    ['near-white %', stats.nearWhitePercent, `< ${t.luma.nearWhiteMaxPercent}`, stats.nearWhitePercent < t.luma.nearWhiteMaxPercent],
    ['mean luma', stats.meanLuma, `${t.luma.meanLumaMin}-${t.luma.meanLumaMax}`, stats.meanLuma >= t.luma.meanLumaMin && stats.meanLuma <= t.luma.meanLumaMax],
    ['non-bg %', stats.nonBgPercent, `${t.luma.nonBgMinPercent}-${t.luma.nonBgMaxPercent}`, stats.nonBgPercent >= t.luma.nonBgMinPercent && stats.nonBgPercent <= t.luma.nonBgMaxPercent],
    ['amber % of non-bg', stats.amberPercentOfNonBg, `${amberRule.min}-${amberRule.max}`, stats.amberPercentOfNonBg >= amberRule.min && stats.amberPercentOfNonBg <= amberRule.max],
    ['lit components (2x crop)', blob.components, `>= ${t.blob.minLitComponents}`, blob.components >= t.blob.minLitComponents],
    ['largest component %', blob.largestPercent, `< ${t.blob.maxLitAreaPercent}`, blob.largestPercent < t.blob.maxLitAreaPercent],
  ].map(([name, value, limit, pass]) => ({ name, value, limit, pass }));

  return { png, stats, blob, hash: dHash(png), composition: compositionGrid(blobPng), rows, pass: rows.every((r) => r.pass) };
}
