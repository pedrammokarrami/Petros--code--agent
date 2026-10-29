// Additive gates G1-G5 from the human review. They read __sceneState and the
// canvas capture; they never change an existing threshold in thresholds.json.
import { decodePng } from './metrics.mjs';

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** G1: ambient dust may never exceed 15% of rendered points. */
export function gateDust(state) {
  const l = state?.layers;
  if (!l) return { name: 'G1 dust share', value: 'no layers', pass: false };
  const total = l.hero + l.mid + l.dust;
  const share = total ? l.dust / total : 1;
  return { name: 'G1 dust share', value: +(share * 100).toFixed(2), limit: '<= 15 %', pass: share <= 0.15 };
}

/** G2: every hero bbox inside the frame with a 6% margin. */
export function gateHeroInside(state) {
  const heroes = (state?.instances || []).filter((i) => i.role === 'hero');
  if (!heroes.length) return { name: 'G2 hero in frame', value: 'no hero', pass: false };
  const bad = heroes.filter((h) => !h.bboxScreen.inside).map((h) => h.assetId);
  return { name: 'G2 hero in frame', value: bad.length ? `out: ${bad.join(',')}` : 'all inside', limit: '6% margin', pass: bad.length === 0 };
}

/** G3: hero screen height 25-70% of the frame. */
export function gateHeroHeight(state, viewportHeight) {
  const heroes = (state?.instances || []).filter((i) => i.role === 'hero');
  if (!heroes.length) return { name: 'G3 hero height', value: 'no hero', pass: false };
  const fracs = heroes.map((h) => h.bboxScreen.h / viewportHeight);
  const bad = fracs.some((f) => f < 0.25 || f > 0.7);
  return { name: 'G3 hero height', value: `${(Math.min(...fracs) * 100).toFixed(0)}-${(Math.max(...fracs) * 100).toFixed(0)}%`, limit: '25-70%', pass: !bad };
}

/** G4: relative scales plausible. Humans 1.5-2.0 m, desks 0.65-0.85 m, monitors 0.25-0.6 m. */
export function gateScales(state) {
  const rules = [
    [/char_human|_human_|human/i, 1.5, 2.0, 'human'],
    [/desk|table/i, 0.65, 0.85, 'desk'],
    [/screen|monitor|display/i, 0.25, 0.6, 'monitor'],
  ];
  const out = [];
  for (const inst of state?.instances || []) {
    for (const [re, lo, hi, label] of rules) {
      if (!re.test(inst.assetId)) continue;
      const h = inst.bboxMeters.size[1];
      out.push({ label, asset: inst.assetId, h: +h.toFixed(2), ok: h >= lo && h <= hi, lo, hi });
    }
  }
  if (!out.length) return { name: 'G4 scale plausibility', value: 'no rule-matched asset', pass: true };
  const bad = out.filter((o) => !o.ok);
  return {
    name: 'G4 scale plausibility',
    value: bad.length ? bad.map((b) => `${b.asset}=${b.h}m`).join(', ') : `${out.length} ok`,
    limit: 'human 1.5-2.0 desk 0.65-0.85 monitor 0.25-0.6',
    pass: bad.length === 0,
  };
}

/**
 * G5: slab-edge detector. A hard straight lit/unlit boundary that persists over more
 * than 40% of the canvas height (vertical edge) or width (horizontal edge) is a slab.
 * A real silhouette is irregular, so its longest continuous run is far shorter.
 */
export function slabMetric(buffer) {
  const png = decodePng(buffer);
  const { width, height, data } = png;
  const lums = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    lums[p] = luma(data[i], data[i + 1], data[i + 2]);
  }
  // Contrast step in luma. A slab is a step, not a level: normalising against the
  // frame's brightest pixel hid dim slabs entirely (a dust wall at luma 10 against a
  // floor of 4 produced no "lit" transition at all), which is why the first version
  // of this gate passed a canvas the human could plainly see a rectangle in.
  const STEP = 5;
  let worstCol = 0, worstRow = 0;
  for (let x = 1; x < width; x++) {
    let run = 0, best = 0;
    for (let y = 0; y < height; y++) {
      if (lums[y * width + x] - lums[y * width + x - 1] > STEP) { run++; if (run > best) best = run; }
      else run = 0;
    }
    if (best > worstCol) worstCol = best;
  }
  for (let y = 1; y < height; y++) {
    let run = 0, best = 0;
    for (let x = 0; x < width; x++) {
      if (lums[y * width + x] - lums[(y - 1) * width + x] > STEP) { run++; if (run > best) best = run; }
      else run = 0;
    }
    if (best > worstRow) worstRow = best;
  }
  return { colEdge: worstCol / height, rowEdge: worstRow / width };
}

export function gateSlab(buffer, baseline = 0.40) {
  const m = slabMetric(buffer);
  const worst = Math.max(m.colEdge, m.rowEdge);
  return {
    name: 'G5 slab edge',
    value: `${(m.colEdge * 100).toFixed(0)}%v/${(m.rowEdge * 100).toFixed(0)}%h`,
    limit: `<= ${(baseline * 100).toFixed(0)}% of dimension`,
    pass: worst <= baseline,
    metric: m,
  };
}
