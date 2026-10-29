// Negative controls: proves the verifier can actually fail a bad frame.
// (a) white, (b) flat dark, (c) one glowing blob must FAIL; (d) point cloud must PASS.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateFrame } from './lib/metrics.mjs';
import { classifyFreshness } from './lib/fresh.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const thresholds = JSON.parse(readFileSync(join(here, 'thresholds.json'), 'utf8'));
const controls = [
  ['a-solid-white.png', false],
  ['b-flat-dark.png', false],
  ['c-solid-blob.png', false],
  ['d-point-cloud.png', true],
];

let failures = 0;
console.log('case'.padEnd(22), 'expected'.padEnd(9), 'actual'.padEnd(9), 'deciding checks');
console.log('-'.repeat(96));
for (const [file, expectPass] of controls) {
  const buf = readFileSync(join(here, 'fixtures', file));
  const res = evaluateFrame(buf, { sceneId: 'welcome', focalRect: { x: 0, y: 0, width: 960, height: 540 }, thresholds });
  const expected = expectPass ? 'PASS' : 'FAIL';
  const actual = res.pass ? 'PASS' : 'FAIL';
  const failed = res.rows.filter((r) => !r.pass).map((r) => `${r.name}=${typeof r.value === 'number' ? r.value.toFixed(2) : r.value}`);
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(file.padEnd(22), expected.padEnd(9), (ok ? actual : actual + '  <-- WRONG').padEnd(9), failed.join(', ') || '(none)');
}
// Stale-build guard: a dist older than src must be refused, and a newer dist accepted.
{
  const d = mkdtempSync(join(tmpdir(), 'fresh-'));
  mkdirSync(join(d, 'src')); mkdirSync(join(d, 'dist'));
  writeFileSync(join(d, 'src/a.ts'), 'a');
  writeFileSync(join(d, 'dist/server.cjs'), 'x');
  // Source is newer than dist: exactly the state that produced the bad measurements.
  utimesSync(join(d, 'src/a.ts'), new Date(), new Date());
  utimesSync(join(d, 'dist/server.cjs'), new Date(Date.now() - 120000), new Date(Date.now() - 120000));
  const stale = classifyFreshness({ sources: [join(d, 'src')], dist: join(d, 'dist') });
  utimesSync(join(d, 'dist/server.cjs'), new Date(), new Date());
  const fresh = classifyFreshness({ sources: [join(d, 'src')], dist: join(d, 'dist') });
  const ok = stale.fresh === false && fresh.fresh === true;
  if (!ok) failures++;
  console.log('stale dist guard'.padEnd(22), 'FAIL,PASS'.padEnd(9), `${stale.fresh ? 'PASS' : 'FAIL'},${fresh.fresh ? 'PASS' : 'FAIL'}`.padEnd(9), ok ? 'guard refuses stale, accepts fresh' : '<-- WRONG');
}

console.log(failures === 0 ? '\nSELFTEST OK: all controls decided correctly' : `\nSELFTEST BROKEN: ${failures} control(s) decided wrongly`);
process.exit(failures === 0 ? 0 : 1);
