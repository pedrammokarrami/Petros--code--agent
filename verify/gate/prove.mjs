#!/usr/bin/env node
// verify/gate/prove.mjs — prove the gate actually catches things.
//
// A gate that has only ever printed PASS proves nothing. For each case this builds a
// throwaway commit in a detached worktree, runs the real gate against that commit, and
// compares the verdict to what the defect must produce. Nothing is written to the product
// branch: the worktree is removed afterwards and the commits are left unreferenced.
//
// Usage:
//   node verify/gate/prove.mjs              all cases
//   node verify/gate/prove.mjs --case N1    one case
//   node verify/gate/prove.mjs --list
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveNode } from './runtime.mjs';

const REPO = process.cwd();
const runtime = resolveNode();
if (!runtime.path) {
  console.error(`BLOCKED — no node >= 20; tried ${runtime.tried.join(', ')}`);
  process.exit(2);
}
const NODE = runtime.path;
const OUT = 'docs/redesign/gate/proof.json';

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}
function git(args, cwd = REPO) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${(r.stderr || '').trim()}`);
  return r.stdout.trim();
}

const CASES = [
  {
    id: 'N1',
    name: 'room selection collapses to welcome',
    expect: 'FAIL',
    why: 'The one behaviour this milestone shipped. If a broken room mapping still passes, the gate is decoration.',
    apply(dir) {
      const f = join(dir, 'src/office/scene/SceneHost.ts');
      const b = readFileSync(f, 'utf8');
      const want = "return (r ?? 'welcome') as Room;";
      if (!b.includes(want)) throw new Error(`anchor not found in ${f}`);
      writeFileSync(f, b.replace(want, "return 'welcome' as Room;"));
    },
  },
  {
    id: 'N2',
    name: 'a required test file is missing',
    expect: 'BLOCKED',
    why: 'Deleting the test that guards room selection must not read as "nothing failed".',
    apply(dir) {
      rmSync(join(dir, 'tests/workspace-scene.test.mjs'));
    },
  },
  {
    id: 'N3',
    name: 'requirements weakened without re-locking',
    expect: 'BLOCKED',
    why: 'Editing the checks so they are easier to satisfy must be visible, not silently accepted.',
    apply(dir) {
      const f = join(dir, 'verify/gate/requirements.json');
      const j = JSON.parse(readFileSync(f, 'utf8'));
      const r = j.requirements.find((x) => x.id === 'R-ROOM-01');
      r.checks = r.checks.slice(0, 1);
      writeFileSync(f, `${JSON.stringify(j, null, 2)}\n`);
    },
  },
  {
    id: 'N4',
    name: 'visual evidence stamped for another commit',
    expect: 'BLOCKED',
    why: 'A green sweep is not transferable; the gate must refuse a report that names a different commit.',
    apply(dir) {
      const f = join(dir, 'docs/redesign/gate/visual.json');
      mkdirSync(join(dir, 'docs/redesign/gate'), { recursive: true });
      writeFileSync(f, JSON.stringify({
        schema: 'petros-visual/1',
        target: { commit: '0000000000000000000000000000000000000000' },
        rows: [{ tag: 'x', checks: [{ name: 'near-white %', pass: true }] }],
      }, null, 2));
    },
  },
  {
    id: 'N5',
    name: 'unmodified commit (control)',
    expect: 'not-FAIL',
    why: 'A control run: with no defect planted, the gate must not report FAIL. A BLOCKED here is honest — it means evidence is still missing, not that the code is broken.',
    apply() {},
  },
];

function commitCase(c) {
  const dir = join(tmpdir(), `petros-prove-${c.id}-${Date.now()}`);
  git(['worktree', 'add', '--detach', dir, 'HEAD']);
  try {
    symlinkSync(join(REPO, 'node_modules'), join(dir, 'node_modules'), 'dir');
  } catch { /* already linked */ }
  c.apply(dir);
  git(['add', '-A'], dir);
  const msg = `prove(${c.id}): ${c.name}`;
  const r = spawnSync('git', ['-c', 'user.name=gate-prover', '-c', 'user.email=gate@local', 'commit', '-q', '-m', msg], { cwd: dir, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'gate-prover', GIT_AUTHOR_EMAIL: 'gate@local', GIT_COMMITTER_NAME: 'gate-prover', GIT_COMMITTER_EMAIL: 'gate@local' } });
  if (r.status !== 0) throw new Error(`commit failed: ${(r.stderr || r.stdout || '').trim()}`);
  const shaOut = git(['rev-parse', 'HEAD'], dir);
  return { dir, commit: shaOut };
}

function runGate(commit) {
  const r = spawnSync(NODE, ['verify/gate/gate.mjs', '--commit', commit], { cwd: REPO, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
  let report = null;
  try {
    report = JSON.parse(readFileSync(join(REPO, 'docs/redesign/gate/report.json'), 'utf8'));
  } catch { /* gate may have crashed before writing */ }
  return { exit: r.status, out: `${r.stdout || ''}${r.stderr || ''}`, report };
}

const only = arg('case');
if (process.argv.includes('--list')) {
  for (const c of CASES) console.log(`${c.id}  expect ${c.expect.padEnd(9)} ${c.name}`);
  process.exit(0);
}
const selected = only && only !== true ? CASES.filter((c) => c.id === only) : CASES;
if (!selected.length) {
  console.error(`no such case: ${only}`);
  process.exit(2);
}

const results = [];
for (const c of selected) {
  console.log(`\n== ${c.id} ${c.name} (expect ${c.expect})`);
  let made;
  try {
    made = commitCase(c);
  } catch (e) {
    results.push({ id: c.id, name: c.name, expect: c.expect, verdict: 'ERROR', ok: false, detail: String(e.message).trim() });
    console.log(`   ERROR ${String(e.message).trim()}`);
    continue;
  }
  const { exit, report } = runGate(made.commit);
  const verdict = report?.verdict ?? `CRASH(${exit})`;
  const failing = (report?.requirements || []).filter((r) => r.status === 'FAIL').map((r) => r.id);
  const blocked = (report?.requirements || []).filter((r) => r.status === 'BLOCKED').map((r) => r.id);
  const ok = c.expect === 'not-FAIL' ? verdict !== 'FAIL' : verdict === c.expect;
  results.push({
    id: c.id,
    name: c.name,
    expect: c.expect,
    verdict,
    ok,
    commit: made.commit,
    failing,
    blocked,
    why: c.why,
  });
  console.log(`   verdict ${verdict}  ${ok ? 'OK' : 'UNEXPECTED'}${failing.length ? `  failing: ${failing.join(',')}` : ''}${blocked.length ? `  blocked: ${blocked.join(',')}` : ''}`);
  try { rmSync(join(made.dir, 'node_modules'), { force: true }); } catch { /* gone */ }
  try { git(['worktree', 'remove', '--force', made.dir]); } catch { /* left for prune */ }
}

mkdirSync(join(REPO, 'docs/redesign/gate'), { recursive: true });
writeFileSync(join(REPO, OUT), `${JSON.stringify({ schema: 'petros-gate-proof/1', at: new Date().toISOString(), runtime: runtime.version, cases: results }, null, 2)}\n`);

const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} cases behaved as expected -> ${OUT}`);
process.exit(bad.length ? 1 : 0);
