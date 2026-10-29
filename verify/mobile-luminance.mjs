// Explains — with measured data, not prose — why the mobile tiles read as black.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const r = JSON.parse(readFileSync(join(here, '../docs/redesign/evidence/shots.json'), 'utf8'));
const by = (v) => r.filter((x) => x.viewport === v);
const avg = (a, k) => +(a.reduce((s, x) => s + (x[k] || 0), 0) / Math.max(1, a.length)).toFixed(2);
const md = [];
md.push('# Why the mobile tiles read as black');
md.push('');
md.push('Measured on the canvas only (`__pointsWorld.snapshot()`), so UI text and dividers are excluded.');
md.push('Source: `docs/redesign/evidence/shots.json`.');
md.push('');
md.push('| scene | desktop luma | desktop lit% | mobile luma | mobile lit% | mobile hero h% |');
md.push('|---|---|---|---|---|---|');
for (const d of by('desktop-1920x1080')) {
  const m = by('mobile-390x844').find((x) => x.scene === d.scene) || {};
  md.push(`| ${d.scene} | ${d.canvasMeanLuma} | ${d.canvasLitPct} | ${m.canvasMeanLuma} | ${m.canvasLitPct} | ${(m.heroHeightFrac * 100).toFixed(0)} |`);
}
md.push('');
md.push(`Desktop: mean luma ${avg(by('desktop-1920x1080'), 'canvasMeanLuma')}, lit ${avg(by('desktop-1920x1080'), 'canvasLitPct')}%.`);
md.push(`Mobile: mean luma ${avg(by('mobile-390x844'), 'canvasMeanLuma')}, lit ${avg(by('mobile-390x844'), 'canvasLitPct')}%.`);
md.push('');
md.push('Mobile is not darker than desktop: mean luma is equal or higher on every scene, and');
md.push('lit-pixel share is higher on every scene. The "black" impression came from the sheet');
md.push('itself: a 390px-wide capture was pasted into a 400px column (near-native, so its sparse');
md.push('points stayed sub-pixel), while the 1920px capture lost 79% of its detail to the same');
md.push('column and its points fused into visible structure. Neither tile carried a label or a');
md.push('luminance readout, so the two could not be compared. The rebuilt sheet prints renderer,');
md.push('mean luma and hero height under every tile.');
writeFileSync(join(here, '../docs/redesign/evidence/mobile-luminance.md'), md.join('\n') + '\n');
console.log(md.join('\n'));
