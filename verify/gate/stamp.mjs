#!/usr/bin/env node
// verify/gate/stamp.mjs — attach a commit to a visual sweep's rows.
//
// `verify/run.mjs` writes docs/redesign/verify_shots/last-run.json with no record of which
// commit produced it, so a green run could be presented after the code moved. This copies the
// rows into docs/redesign/gate/visual.json together with the commit they are claimed for, and
// the gate refuses any report whose commit differs from the one it is judging.
//
// It reproduces the harness output faithfully; it does not re-check it. The value it adds is
// that the claim is explicit and bound, not implicit and reusable.
//
// Usage: node verify/gate/stamp.mjs [docs/redesign/verify_shots/last-run.json]
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO = process.cwd();
const src = resolve(REPO, process.argv[2] || 'docs/redesign/verify_shots/last-run.json');
const out = resolve(REPO, 'docs/redesign/gate/visual.json');

if (!existsSync(src)) {
  console.error(`no sweep report at ${src} — run \`node verify/run.mjs\` first`);
  process.exit(1);
}

const commit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).stdout.trim();
const tree = spawnSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: REPO, encoding: 'utf8' }).stdout.trim();
const dirty = spawnSync('git', ['status', '--porcelain'], { cwd: REPO, encoding: 'utf8' }).stdout.trim().length > 0;

const raw = readFileSync(src);
const j = JSON.parse(raw.toString('utf8'));
if (!Array.isArray(j.rows) || !j.rows.length) {
  console.error('report has no rows; refusing to stamp an empty sweep');
  process.exit(1);
}

const failing = j.rows.filter((r) => r.pass === false).length;
const stamped = {
  schema: 'petros-visual/1',
  stampedAt: new Date().toISOString(),
  target: { commit, tree, workingTreeDirty: dirty },
  source: { file: process.argv[2] || 'docs/redesign/verify_shots/last-run.json', sha256: createHash('sha256').update(raw).digest('hex') },
  harness: { hardErrors: j.hardErrors ?? [], warnings: j.harnessWarnings ?? [] },
  counts: { rows: j.rows.length, failing },
  rows: j.rows,
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(stamped, null, 2)}\n`);
console.log(`stamped ${j.rows.length} rows (${failing} failing) for ${commit.slice(0, 8)}${dirty ? ' — WARNING: working tree was dirty' : ''}`);
console.log(`-> ${out}`);
