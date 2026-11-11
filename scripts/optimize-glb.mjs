#!/usr/bin/env node
/**
 * PETROS room asset optimizer.
 *
 * Implements the blueprint's compression pipeline without adding a build-time
 * dependency: every room GLB is re-written with Google Draco (geometry) and KTX2 /
 * Basis Universal (textures) so mobile GPUs keep the textures compressed in VRAM.
 *
 *   node scripts/optimize-glb.mjs                      # optimize assets/rooms/**
 *   node scripts/optimize-glb.mjs --dry                # report only
 *   node scripts/optimize-glb.mjs --in public/models/room.glb
 *
 * Output convention:
 *   <source>.glb  ->  <dir>/optimized/<name>.glb   (original is never overwritten)
 *
 * Requires the gltf-transform CLI. It is fetched on demand with `npx --yes`, which
 * keeps it out of package.json while still being reproducible:
 *   npx --yes @gltf-transform/cli@4 optimize in.glb out.glb --compress draco --texture-compress ktx2
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DEFAULT_GLOB_DIRS = ['assets/rooms', 'public/models', 'public/assets/rooms'];
const CLI = ['--yes', '@gltf-transform/cli@4'];
const BUDGET_MB = 5;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.toLowerCase().endsWith('.glb')) out.push(full);
  }
  return out;
}

function sizeMb(bytes) {
  return Number((bytes / (1024 * 1024)).toFixed(2));
}

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const dryRun = process.argv.includes('--dry');
const single = argValue('--in');

const sources = single
  ? [path.resolve(ROOT, single)]
  : DEFAULT_GLOB_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));

if (sources.length === 0) {
  console.log('[optimize-glb] No .glb files found.');
  console.log(`               Looked in: ${DEFAULT_GLOB_DIRS.join(', ')}`);
  console.log('               Drop room models in assets/rooms/<room-id>/<name>.glb and re-run.');
  process.exit(0);
}

let totalAfter = 0;
let failures = 0;

for (const source of sources) {
  if (!fs.existsSync(source)) {
    console.error(`[optimize-glb] Missing input: ${source}`);
    failures += 1;
    continue;
  }
  const before = fs.statSync(source).size;
  const targetDir = path.join(path.dirname(source), 'optimized');
  const target = path.join(targetDir, path.basename(source));

  if (dryRun) {
    console.log(`[dry] ${path.relative(ROOT, source)} — ${sizeMb(before)} MB`);
    totalAfter += before;
    continue;
  }

  fs.mkdirSync(targetDir, { recursive: true });
  try {
    execFileSync(
      'npx',
      [...CLI, 'optimize', source, target, '--compress', 'draco', '--texture-compress', 'ktx2'],
      { stdio: 'inherit', cwd: ROOT },
    );
    const after = fs.statSync(target).size;
    totalAfter += after;
    const saved = before > 0 ? Math.round((1 - after / before) * 100) : 0;
    console.log(
      `[optimize-glb] ${path.basename(source)}: ${sizeMb(before)} MB -> ${sizeMb(after)} MB (-${saved}%)`,
    );
  } catch (error) {
    failures += 1;
    console.error(`[optimize-glb] Failed on ${source}: ${error?.message ?? error}`);
  }
}

if (!dryRun && totalAfter > BUDGET_MB * 1024 * 1024) {
  console.error(
    `[optimize-glb] Optimized set is ${sizeMb(totalAfter)} MB, above the ${BUDGET_MB} MB streaming budget.`,
  );
  failures += 1;
}

if (failures > 0) process.exit(1);
console.log(`[optimize-glb] Done. Optimized payload: ${sizeMb(totalAfter)} MB (budget ${BUDGET_MB} MB).`);
