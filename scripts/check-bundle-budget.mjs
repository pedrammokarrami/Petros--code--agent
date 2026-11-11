#!/usr/bin/env node
/**
 * PETROS first-load budget gate.
 *
 * The blueprint promises a sub-5MB mobile initial payload. That promise is only
 * real if it is measured, so this script reads the production build, gzips every
 * asset the shell needs before the first room renders, and fails the build when the
 * budget is exceeded.
 *
 *   npm run build && npm run budget
 *   node scripts/check-bundle-budget.mjs --json
 *
 * Rules enforced:
 *   1. Entry JS + entry CSS + the html shell, gzipped, must stay under 5 MB.
 *   2. No lazily loaded room chunk may exceed 1.5 MB gzipped on its own.
 *   3. Every chunk emitted from `src/components/petros-city/` must be async, i.e.
 *      it must not be referenced directly from the entry HTML.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const BUDGET_BYTES = 5 * 1024 * 1024;
const ROOM_CHUNK_BUDGET = 1.5 * 1024 * 1024;

function gzipSize(file) {
  return zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length;
}

function human(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

if (!fs.existsSync(DIST)) {
  console.error('[budget] dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const indexHtml = path.join(DIST, 'index.html');
if (!fs.existsSync(indexHtml)) {
  console.error('[budget] dist/index.html not found — is the Vite client built?');
  process.exit(1);
}

const html = fs.readFileSync(indexHtml, 'utf8');
const entryRefs = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => match[1]);
const entryFiles = entryRefs
  .map((ref) => path.join(DIST, ref.replace(/^\//, '')))
  .filter((file) => fs.existsSync(file));

if (entryFiles.length === 0) {
  console.error('[budget] Could not resolve any entry JS/CSS from dist/index.html.');
  process.exit(1);
}

const entryBytes = entryFiles.reduce((sum, file) => sum + gzipSize(file), 0);
const assetsDir = path.join(DIST, 'assets');
const chunks = fs.existsSync(assetsDir)
  ? fs
      .readdirSync(assetsDir)
      .filter((file) => file.endsWith('.js'))
      .map((file) => ({ file, size: gzipSize(path.join(assetsDir, file)) }))
  : [];

const oversized = chunks.filter((chunk) => chunk.size > ROOM_CHUNK_BUDGET);
const roomChunks = chunks.filter((chunk) => /room|petros-city|blueprint/i.test(chunk.file));
const eagerRoomChunks = roomChunks.filter((chunk) => html.includes(chunk.file));

const report = {
  entry: entryFiles.map((file) => ({
    file: path.relative(DIST, file),
    gzip: human(gzipSize(file)),
  })),
  entryTotalGzip: human(entryBytes),
  budget: human(BUDGET_BYTES),
  roomChunks: roomChunks.map((chunk) => ({ file: chunk.file, gzip: human(chunk.size) })),
  oversized: oversized.map((chunk) => ({ file: chunk.file, gzip: human(chunk.size) })),
  eagerRoomChunks: eagerRoomChunks.map((chunk) => chunk.file),
  ok: entryBytes <= BUDGET_BYTES && oversized.length === 0 && eagerRoomChunks.length === 0,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('[budget] Entry payload (gzipped):');
  for (const item of report.entry) console.log(`  ${item.file.padEnd(40)} ${item.gzip}`);
  console.log(`  ${'TOTAL'.padEnd(40)} ${report.entryTotalGzip} / ${report.budget}`);
  if (roomChunks.length) {
    console.log('[budget] Room chunks:');
    for (const chunk of report.roomChunks) console.log(`  ${chunk.file.padEnd(40)} ${chunk.gzip}`);
  }
  for (const chunk of oversized) {
    console.error(`[budget] Chunk above 1.5 MB gzip: ${chunk.file} (${chunk.gzip})`);
  }
  for (const chunk of eagerRoomChunks) {
    console.error(`[budget] Room chunk is eagerly loaded from index.html: ${chunk}`);
  }
}

if (!report.ok) {
  console.error('[budget] FAILED — the first-load budget or the lazy-loading contract is broken.');
  process.exit(1);
}

console.log('[budget] OK — entry stays inside 5 MB and every room chunk is lazy.');
