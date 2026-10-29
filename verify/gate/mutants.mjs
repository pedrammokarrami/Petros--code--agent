#!/usr/bin/env node
// verify/gate/mutants.mjs — mutation testing for the critical decision paths.
//
// A test that never fails is not evidence. This applies small, deliberate defects to a
// detached worktree of the target commit, runs the tests that are supposed to guard that
// behaviour, and requires the run to fail. A mutation that survives is reported by name:
// that is behaviour the suite does not actually pin down.
//
// It never writes to the working tree: each mutation runs in its own worktree, which is
// removed afterwards. Nothing is left in the product branch.
//
// Usage: node verify/gate/mutants.mjs [--commit <sha>] [--only M1,M3]
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, symlinkSync, rmSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveNode } from './runtime.mjs';

const REPO = process.cwd();
const runtime = resolveNode();
if (!runtime.path) {
  console.error(`BLOCKED — no node >= 20; tried ${runtime.tried.join(', ')}`);
  process.exit(2);
}
const NODE = runtime.path;
const OUT = 'docs/redesign/gate/mutations.json';

const sha = (b) => createHash('sha256').update(b).digest('hex');

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

/** Each mutant: one defect, the tests that must notice it, and a sentence on why it matters. */
const MUTANTS = [
  {
    id: 'M1',
    name: 'room collapse',
    file: 'src/office/scene/SceneHost.ts',
    find: "return (r ?? 'welcome') as Room;",
    replace: "return 'welcome' as Room;",
    tests: ['tests/workspace-scene.test.mjs'],
    why: 'Every business would open the welcome room: the product promise silently gone.',
  },
  {
    id: 'M2',
    name: 'panel bounds removed',
    file: 'src/workspace/spec.ts',
    find: 'panels: z.array(WorkspacePanel).min(2).max(4),',
    replace: 'panels: z.array(WorkspacePanel).min(0).max(99),',
    tests: ['tests/workspace-compose.test.mjs'],
    why: 'A model could return zero or twenty panels and still pass the schema.',
  },
  {
    id: 'M3',
    name: 'empty model answer not caught',
    file: 'src/workspace/compose.ts',
    find: "  if (!text.trim()) return fallback('model returned empty');",
    replace: "  if (!text.trim()) throw new Error('model returned empty');",
    tests: ['tests/workspace-compose.test.mjs'],
    why: 'An empty provider reply would throw instead of degrading to the fallback spec.',
  },
  {
    id: 'M4',
    name: 'spec becomes permissive',
    file: 'src/workspace/spec.ts',
    find: `  hero: z.object({\n    title: z.string().min(1).max(90),\n    subtitle: z.string().min(1).max(180),\n    metrics: z.array(WorkspaceMetric).min(1).max(4),\n  }).strict(),`,
    replace: `  hero: z.object({\n    title: z.string().min(1).max(90),\n    subtitle: z.string().min(1).max(180),\n    metrics: z.array(WorkspaceMetric).min(1).max(4),\n  }),`,
    tests: ['tests/workspace-compose.test.mjs'],
    why: 'Unknown keys (coordinates, colours, CSS) would be dropped instead of rejected.',
  },
  {
    id: 'M5',
    name: 'procedural set loses determinism',
    file: 'src/office/scene/proceduralSet.ts',
    find: 'function mulberry32(a: number) {',
    replace: 'function mulberry32(a: number) {\n  a = a ^ (Date.now() & 0xff);',
    tests: ['tests/office-camera-fit.test.mjs'],
    why: 'A non-deterministic cloud makes every downstream visual gate unreproducible.',
  },
];

function testFilesIn(cwd) {
  const dir = join(cwd, 'tests');
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.test.mjs')).sort().map((f) => `tests/${f}`) : [];
}

function main() {
  const commit = git(['rev-parse', `${String(arg('commit', 'HEAD'))}^{commit}`]);
  const only = arg('only') ? String(arg('only')).split(',').map((s) => s.trim()) : null;
  const selected = MUTANTS.filter((m) => !only || only.includes(m.id));

  const rows = [];
  let survived = 0;
  let unusable = 0;

  for (const m of selected) {
    const wt = join(tmpdir(), `petros-mut-${m.id}-${Date.now()}`);
    let row = { id: m.id, name: m.name, file: m.file, why: m.why, tests: m.tests, verdict: null };
    try {
      git(['worktree', 'add', '--detach', wt, commit]);
      try { symlinkSync(join(REPO, 'node_modules'), join(wt, 'node_modules'), 'dir'); } catch { /* exists */ }

      const p = join(wt, m.file);
      if (!existsSync(p)) {
        row.verdict = 'unusable';
        row.detail = `file absent at this commit: ${m.file}`;
        unusable++;
        rows.push(row);
        continue;
      }
      const src = readFileSync(p, 'utf8');
      const occurrences = src.split(m.find).length - 1;
      if (occurrences !== 1) {
        row.verdict = 'unusable';
        row.detail = `mutation anchor matched ${occurrences} times (needs exactly 1) — the code moved, update the mutant`;
        unusable++;
        rows.push(row);
        continue;
      }
      writeFileSync(p, src.replace(m.find, m.replace));

      const files = m.tests.filter((t) => existsSync(join(wt, t)));
      if (!files.length) {
        row.verdict = 'unusable';
        row.detail = `none of the guarding tests exist: ${m.tests.join(', ')}`;
        unusable++;
        rows.push(row);
        continue;
      }

      const t0 = Date.now();
      const r = spawnSync(NODE, ['--import', 'tsx', '--test', '--test-concurrency=1', ...files], {
        cwd: wt, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, CI: '1', FORCE_COLOR: '0' },
      });
      const out = `${r.stdout || ''}${r.stderr || ''}`;
      const failMatch = out.match(/^# fail (\d+)$/m);
      row.exit = r.status;
      row.ms = Date.now() - t0;
      row.failedTests = Number(failMatch ? failMatch[1] : 0);
      row.stdoutSha = sha(out);
      row.tail = out.split('\n').filter((l) => /^not ok|^# fail|^# pass/.test(l)).slice(0, 6).join('\n');
      row.verdict = r.status === 0 ? 'survived' : 'killed';
      if (r.status === 0) survived++;
      console.log(`  ${m.id} ${m.name.padEnd(28)} ${row.verdict}  (tests failed: ${row.failedTests})`);
    } catch (e) {
      row.verdict = 'error';
      row.detail = String(e.message || e);
      unusable++;
      console.log(`  ${m.id} ${m.name.padEnd(28)} error: ${row.detail}`);
    } finally {
      try { rmSync(join(wt, 'node_modules'), { force: true }); } catch { /* gone */ }
      try { git(['worktree', 'remove', '--force', wt]); } catch { /* prune later */ }
    }
    rows.push(row);
  }

  const report = {
    schema: 'petros-mutations/1',
    generatedAt: new Date().toISOString(),
    target: { commit },
    totals: {
      mutants: rows.length,
      killed: rows.filter((r) => r.verdict === 'killed').length,
      survived,
      unusable,
    },
    rows,
  };
  mkdirSync(resolve(REPO, 'docs/redesign/gate'), { recursive: true });
  writeFileSync(resolve(REPO, OUT), `${JSON.stringify(report, null, 2)}\n`);

  console.log('');
  console.log(`mutants   ${report.totals.mutants}`);
  console.log(`killed    ${report.totals.killed}`);
  console.log(`survived  ${survived}`);
  console.log(`unusable  ${unusable}`);
  console.log(`report    ${OUT}`);
  // Exit 1 on a survivor: undetected behaviour is a coverage gap, not a pass.
  process.exit(survived > 0 || unusable > 0 ? 1 : 0);
}

main();
