#!/usr/bin/env node
// verify/gate/gate.mjs — the independent quality gate.
//
// Why this exists: the agent that changes the code was also the body that signed off on it.
// Unit tests passing was treated as "done", while a full visual sweep in the same working
// tree failed 29 of 60 rows and `release:check` still printed PASS. Neither signal could
// block anything.
//
// What this does, in order:
//   1. Resolve the exact commit to judge and hash the protected definitions (this file,
//      requirements.json, mutants.mjs, thresholds.json) against verify/gate/lock.json.
//   2. Create a DETACHED WORKTREE at that commit, so nothing in the working tree can move
//      under the run. node_modules is symlinked because this machine has no npm.
//   3. Run lint, the production build, one unit process per test file, the
//      release records check and the SAST scan inside it.
//   4. Bind the result to the commit, the tree, the lock and the artifact hashes.
//   5. Evaluate every requirement in requirements.json: PASS / FAIL / BLOCKED / N/A.
//      A check that cannot run is BLOCKED. It is never PASS.
//   6. Write docs/redesign/gate/report.json plus a human summary, and exit
//      0 = PASS, 1 = FAIL, 2 = BLOCKED.
//
// Usage:
//   node verify/gate/gate.mjs                      judge HEAD
//   node verify/gate/gate.mjs --commit <sha>       judge another commit
//   node verify/gate/gate.mjs --lock               (re)write the definition lock
//   node verify/gate/gate.mjs --visual <file>      consume a stamped visual report
//
// There is deliberately no --refresh flag. It was documented here and never implemented:
// the flag it promised (refuse a report whose commit differs) is what --visual already
// does, and a stamped visual report is bound to the commit it was produced from.
// Re-stamping one for another commit would forge evidence, not refresh it.
//
// It never edits source, never touches .env, and never relaxes a threshold.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, symlinkSync, rmSync, readdirSync } from 'node:fs';
import { join, resolve, relative, sep, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { resolveNode, MIN_NODE_MAJOR } from './runtime.mjs';

const REPO = process.cwd();
const OUT_DIR = 'docs/redesign/gate';
const LOCK_PATH = 'verify/gate/lock.json';
const PROTECTED = [
  'verify/gate/gate.mjs',
  'verify/gate/requirements.json',
  'verify/gate/mutants.mjs',
  'verify/gate/runtime.mjs',
  'verify/run.mjs',
  'verify/lib/metrics.mjs',
  'verify/release-check.mjs',
  'verify/thresholds.json',
];

const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const fileSha = (p) => (existsSync(join(REPO, p)) ? sha(readFileSync(join(REPO, p))) : null);
const now = () => new Date().toISOString();

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}
const flag = (name) => process.argv.includes(`--${name}`);

function git(args, cwd = REPO) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${(r.stderr || '').trim()}`);
  return r.stdout.trim();
}

function run(id, cmd, args, cwd, { optionalFile = null, logDir = null, env = null } = {}) {
  if (optionalFile && !existsSync(join(cwd, optionalFile))) {
    return { id, cmd: [cmd, ...args].join(' '), status: 'absent', exit: null, ms: 0, stdoutSha: null, log: null, tail: `script not present at this commit: ${optionalFile}` };
  }
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, env: { ...process.env, CI: '1', FORCE_COLOR: '0', ...(env || {}) } });
  const ms = Date.now() - t0;
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  let log = null;
  if (logDir) {
    mkdirSync(join(REPO, logDir), { recursive: true });
    // A step id can contain a path (`unit:tests/x.test.mjs`); the log name has to
    // be a single file, or writeFileSync fails on a directory that does not exist.
    log = join(logDir, `${id.replace(/[^A-Za-z0-9._-]+/g, '-')}.log`);
    writeFileSync(join(REPO, log), out);
  }
  return {
    id,
    cmd: [cmd, ...args].join(' '),
    status: r.status === 0 ? 'pass' : 'fail',
    exit: r.status,
    ms,
    stdoutSha: sha(out),
    log,
    tail: out.split('\n').slice(-40).join('\n'),
  };
}

// Read the run's own TAP output instead of trusting "the suite exited 0".
// A title that is absent, skipped or TODO is not a pass for the requirement
// that names it; the previous version counted a green suite as proof for all
// of them, which is how a requirement could pass without its test running.
function parseTap(text) {
  // title -> 'ok' | 'skip' | 'todo' | 'not-ok'. The worst verdict wins, so a
  // title reported ok once and not ok once is a failure, never a pass.
  const rank = { ok: 0, todo: 1, skip: 1, 'not-ok': 2 };
  const titles = new Map();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const m = line.match(/^(not ok|ok)\s+\d+\s+-\s+(.+)$/);
    if (!m) continue;
    const [, verdict, rest] = m;
    const skip = /#\s*SKIP\b/i.test(rest);
    const todo = /#\s*TODO\b/i.test(rest);
    const title = rest.replace(/\s+#\s*(SKIP|TODO)\b.*$/i, '').trim();
    if (!title) continue;
    const next = verdict === 'not ok' ? 'not-ok' : skip ? 'skip' : todo ? 'todo' : 'ok';
    const prev = titles.get(title);
    if (prev === undefined || rank[next] > rank[prev]) titles.set(title, next);
  }
  return { titles };
}

/** TAP summary from `node --test`. */
function tapSummary(text) {
  const n = (k) => {
    const m = text.match(new RegExp(`^# ${k} (\\d+)$`, 'm'));
    return m ? Number(m[1]) : null;
  };
  return {
    tests: n('tests'),
    pass: n('pass'),
    fail: n('fail'),
    cancelled: n('cancelled'),
    skipped: n('skipped'),
    todo: n('todo'),
  };
}

function unitFiles(cwd) {
  const dir = join(cwd, 'tests');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.test.mjs')).sort().map((f) => `tests/${f}`);
}

// A per-file run is the only stream that binds a TAP line to one exact file:
// the suite-wide reporter interleaves every file's titles, so a title found in
// it does not prove which file emitted it. A file backs a requirement only
// when its own run exited 0 AND its own summary accounts for every test as a
// pass. A skip, a TODO, a cancel, an empty run and a partly-reported run are
// BLOCKED — never PASS — because none of them is an assertion that held.
function classifyFileRun({ file, status, tap, sum }) {
  if (status !== 'pass') return { status: 'FAIL', detail: `${file} run exited non-zero` };
  if (!sum || sum.tests === null || sum.tests === 0) {
    return { status: 'BLOCKED', detail: `${file} registered no tests` };
  }
  if ((sum.fail ?? 0) > 0) return { status: 'FAIL', detail: `${file} reported ${sum.fail} failing test(s)` };
  if ((sum.cancelled ?? 0) > 0) return { status: 'BLOCKED', detail: `${file} reported ${sum.cancelled} cancelled test(s)` };
  if ((sum.skipped ?? 0) > 0) return { status: 'BLOCKED', detail: `${file} skipped ${sum.skipped} test(s)` };
  if ((sum.todo ?? 0) > 0) return { status: 'BLOCKED', detail: `${file} reported ${sum.todo} TODO test(s)` };
  if ((sum.pass ?? 0) < sum.tests) {
    return { status: 'BLOCKED', detail: `${file}: only ${sum.pass}/${sum.tests} tests reported ok` };
  }
  if (![...tap.titles.values()].length) {
    return { status: 'BLOCKED', detail: `${file} emitted no parseable test titles` };
  }
  return { status: 'PASS', detail: `${file}: ${sum.pass}/${sum.tests} tests ok, 0 skipped, 0 todo` };
}

// The verdict rule as a pure function, so it can be tested: release severity
// and every step the gate declares are the only things that can fail or block
// the run. A tracked requirement is a risk, never a veto.
// A drifted lock means the gate's own definitions changed under it — the gate
// cannot trust itself, so it is BLOCKED before any other verdict is considered.
// A policy violation (e.g. thresholds edited without a changelog entry) is the
// same kind of self-audit failure and blocks before the ordinary checks run.
function decideVerdict({ release, stepAudit, lock, policy }) {
  if (lock !== undefined && !lock.ok) return 'BLOCKED';
  if (policy !== undefined && policy.some((p) => p.status !== 'PASS')) return 'BLOCKED';
  if (release.some((r) => r.status === 'FAIL') || stepAudit.some((v) => v.status === 'FAIL')) return 'FAIL';
  if (release.some((r) => r.status === 'BLOCKED') || stepAudit.some((v) => v.status === 'BLOCKED')) return 'BLOCKED';
  return 'PASS';
}

// A step is evidence whether or not a requirement happens to name it: a
// failing lint or a build that never ran must not disappear behind a PASS.
function stepVerdict(s) {
  if (!s) return { status: 'BLOCKED', detail: 'declared step never appears in the report' };
  if (s.status === 'pass') return { status: 'PASS', detail: `${s.id} exit 0` };
  if (s.status === 'absent') return { status: 'BLOCKED', detail: s.tail || `${s.id} not present at this commit` };
  return { status: 'FAIL', detail: `${s.id} exit ${s.exit ?? 'n/a'}` };
}

// ---------------------------------------------------------------- lock
function lockDefinitions() {
  const reason = arg('reason');
  const ticket = arg('ticket');
  if (!reason) throw new Error('--lock requires --reason (why the definitions changed)');
  if (!ticket) throw new Error('--lock requires --ticket (tracking ticket for the change)');
  const files = {};
  for (const p of PROTECTED) files[p] = fileSha(p);
  const body = { schema: 'petros-gate-lock/1', lockedAt: now(), reason, ticket, files };
  writeFileSync(join(REPO, LOCK_PATH), `${JSON.stringify(body, null, 2)}\n`);
  console.log(`locked ${PROTECTED.length} definitions -> ${LOCK_PATH} (ticket=${ticket})`);
  console.log(JSON.stringify(files, null, 2));
}

// The lock and the protected definitions are both read from the judged COMMIT.
// Reading them from the working tree meant a dirty tree could ship a forged lock
// that matched relaxed checks; a clean worktree at the commit costs nothing.
function readLock(commit) {
  const at = (path) => spawnSync('git', ['show', `${commit}:${path}`], { cwd: REPO, encoding: 'utf8' });
  const lr = at(LOCK_PATH);
  if (lr.status !== 0) return { ok: false, reason: 'no lock file at this commit: definitions are unprotected', files: null };
  let parsed;
  try {
    parsed = JSON.parse(lr.stdout);
  } catch (e) {
    return { ok: false, reason: `lock file unreadable at this commit: ${e.message}`, files: null };
  }
  const drift = [];
  for (const [f, want] of Object.entries(parsed.files || {})) {
    const fr = at(f);
    if (fr.status !== 0) { drift.push(`${f} missing at this commit`); continue; }
    if (sha(fr.stdout) !== want) drift.push(`${f} changed`);
  }
  for (const f of PROTECTED) if (!(f in (parsed.files || {}))) drift.push(`${f} not in lock`);
  return drift.length
    ? { ok: false, reason: `protected definitions changed since lock: ${drift.join('; ')}`, files: parsed.files }
    : { ok: true, reason: null, files: parsed.files };
}

// ---------------------------------------------------------------- visual evidence
function loadVisual(file) {
  if (!file || file === true) return { ok: false, reason: 'no visual report supplied' };
  const p = resolve(REPO, file);
  if (!existsSync(p)) return { ok: false, reason: `visual report missing: ${file}` };
  let j;
  try {
    j = JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    return { ok: false, reason: `visual report unparseable: ${e.message}` };
  }
  if (!j?.target?.commit) return { ok: false, reason: 'visual report carries no target.commit, so it can be reused for any commit' };
  if (!Array.isArray(j.rows) || !j.rows.length) return { ok: false, reason: 'visual report has no rows' };
  return { ok: true, commit: j.target.commit, rows: j.rows, file };
}

// ---------------------------------------------------------------- main
async function main() {
  if (flag('lock')) return lockDefinitions();

  const targetRef = String(arg('commit', 'HEAD'));
  const commit = git(['rev-parse', `${targetRef}^{commit}`]);
  const treeSha = git(['rev-parse', `${commit}^{tree}`]);
  const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).stdout.trim();
  const dirty = git(['status', '--porcelain']).length > 0;

  const lock = readLock(commit);
  const nodeEnv = resolveNode();
  const NODE = nodeEnv.path;
  const visual = loadVisual(arg('visual'));
  const report = {
    schema: 'petros-gate/1',
    generatedAt: now(),
    target: { commit, treeSha, branch, ref: targetRef, workingTreeDirty: dirty },
    definitions: { lock, protected: PROTECTED },
    environment: {
      node: nodeEnv.version,
      nodePath: nodeEnv.path,
      minNodeMajor: MIN_NODE_MAJOR,
      nodeCandidates: nodeEnv.tried,
      platform: `${process.platform}/${process.arch}`,
    },
    steps: [],
    artifacts: {},
    requirements: [],
    unresolved: [],
    verdict: null,
  };

  if (!NODE) {
    report.verdict = 'BLOCKED';
    report.unresolved = [{ id: 'ENV-NODE', title: `no node >= ${MIN_NODE_MAJOR}`, status: 'BLOCKED', detail: `tried: ${nodeEnv.tried.join(', ')}` }];
    mkdirSync(join(REPO, OUT_DIR), { recursive: true });
    writeFileSync(join(REPO, OUT_DIR, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`verdict   BLOCKED — no node >= ${MIN_NODE_MAJOR}; tried ${nodeEnv.tried.join(', ')}`);
    process.exit(2);
  }

  const worktree = join(tmpdir(), `petros-gate-${commit.slice(0, 8)}-${Date.now()}`);
  let cleaned = false;
  try {
    git(['worktree', 'add', '--detach', worktree, commit]);
    try {
      symlinkSync(join(REPO, 'node_modules'), join(worktree, 'node_modules'), 'dir');
    } catch (e) {
      // EEXIST means the link (or the directory) is already there, which is the
      // state this line exists to produce. Anything else is a real setup failure.
      if (!(e.code === 'EEXIST' && existsSync(join(worktree, 'node_modules')))) {
        report.steps.push({ id: 'setup:node_modules', required: true, status: 'fail', exit: null, ms: 0, cmd: 'symlink node_modules', tail: String(e.message), stdoutSha: null });
      }
    }

    const files = unitFiles(worktree);
    const buildStart = Date.now();
    let buildCmd;
    try {
      const pkgRaw = spawnSync('git', ['show', `${commit}:package.json`], { cwd: REPO, encoding: 'utf8' });
      buildCmd = JSON.parse(pkgRaw.stdout).scripts?.build;
      if (!buildCmd) throw new Error('package.json declares no "build" script');
    } catch (e) {
      buildCmd = 'node node_modules/vite/bin/vite.js build && node node_modules/esbuild/bin/esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs';
      report.steps.push({ id: 'setup:build', required: true, status: 'fail', exit: null, ms: 0, cmd: 'read build script', stdoutSha: null, tail: `declared build unreadable (${String(e.message).trim()}); using a fallback line` });
    }
    report.buildCommand = buildCmd;
    let unitRuns = [];

    const steps = [
      { id: 'lint', required: true, cmd: NODE, args: ['node_modules/typescript/bin/tsc', '--noEmit'] },
      // Run the build the project actually declares, parsed from the judged commit.
      // A hand-copied esbuild line drifted from package.json (--outfile vs --outfile=)
      // and failed for no reason; the declared script is the contract.
      // npm normally puts node_modules/.bin on PATH; the gate invokes the script directly,
      // so `vite` and `esbuild` would otherwise be "command not found".
      { id: 'build', required: true, cmd: '/bin/sh', args: ['-c', buildCmd], env: { PATH: `${dirname(NODE)}:${join(worktree, 'node_modules', '.bin')}:${process.env.PATH}` } },
      // unit runs AFTER the artifacts exist: several suites spawn dist/server.cjs,
      // which is untracked, so a clean worktree has no server until it is built.
      // It is expanded into one process per test file in the loop below.
      { id: 'unit', required: true, cmd: NODE, args: ['--import', 'tsx', '--test', '<file>'] },
      { id: 'release', required: true, cmd: NODE, args: ['verify/release-check.mjs'], optionalFile: 'verify/release-check.mjs' },
      // The security scan runs inline, on purpose. A separate harness file was tried
      // and removed: it made this step depend on a file that exists only in newer
      // commits (the gate judges any commit in a detached worktree, so the step would
      // read as "absent" -> BLOCKED for every older commit), and it put an unprotected
      // file inside a protected definition. Both forms were measured under the gate's
      // own runtime and print byte-identical totals, so the inline form stays, inside
      // the reach of the lock.
      {
        id: 'sast',
        required: true,
        cmd: NODE,
        args: ['--import', 'tsx', '--input-type=module', '-e', "import { scanTree, summarise } from './server/securityScanner.ts'; const s = summarise(scanTree(process.cwd(), 400).results); console.log(JSON.stringify(s.totals)); process.exit(s.passed ? 0 : 1);"],
        optionalFile: 'server/securityScanner.ts',
      },
    ];

    for (const s of steps) {
      if (s.id === 'unit') {
        // One process per test file. `node --test` already runs each file in its
        // own child, so this costs the same wall time, but it makes every TAP
        // line attributable: a title, a skip and a load failure belong to exactly
        // one file. A single combined stream proves none of that.
        const t0 = Date.now();
        const runs = [];
        for (const file of files) {
          const r = run(`unit:${file}`, NODE, ['--import', 'tsx', '--test', file], worktree, { logDir: `${OUT_DIR}/logs` });
          const body = r.log ? readFileSync(join(REPO, r.log), 'utf8') : '';
          const fileTap = parseTap(body);
          const sum = tapSummary(body);
          const verdict = classifyFileRun({ file, status: r.status, tap: fileTap, sum });
          runs.push({ file, status: r.status, exit: r.exit, ms: r.ms, log: r.log, tests: sum, titles: fileTap.titles, verdict });
          console.log(`  file ${file.replace(/^tests\//, '').padEnd(38)} ${verdict.status.padEnd(7)} ${(r.ms / 1000).toFixed(1)}s`);
        }
        unitRuns = runs;
        const bad = runs.filter((r) => r.status !== 'pass');
        const step = {
          id: 'unit',
          required: true,
          cmd: 'node --import tsx --test <file> (one process per test file)',
          status: bad.length ? 'fail' : 'pass',
          exit: bad.length ? (bad[0].exit ?? 1) : 0,
          ms: Date.now() - t0,
          stdoutSha: sha(JSON.stringify(runs.map((r) => [r.file, r.status, r.tests]))),
          log: null,
          tail: bad.length
            ? bad.slice(0, 3).map((r) => `${r.file} exit ${r.exit}`).join('\n')
            : `${runs.length} test files ran, all exited 0`,
          files: runs.length,
        };
        report.steps.push(step);
        console.log(`  step ${'unit'.padEnd(13)} ${step.status.padEnd(6)} ${step.exit}  ${(step.ms / 1000).toFixed(1)}s  (${runs.length} files)`);
        continue;
      }
      const r = run(s.id, s.cmd, s.args, worktree, { optionalFile: s.optionalFile ?? null, logDir: `${OUT_DIR}/logs`, env: s.env ?? null });
      report.steps.push(r);
      console.log(`  step ${s.id.padEnd(13)} ${r.status.padEnd(6)} ${r.exit ?? '-'}  ${(r.ms / 1000).toFixed(1)}s`);
    }

    // ---- artifacts, bound to this build
    for (const a of ['dist/index.html', 'dist/server.cjs']) {
      const p = join(worktree, a);
      if (!existsSync(p)) {
        report.artifacts[a] = { present: false };
        continue;
      }
      const st = statSync(p);
      report.artifacts[a] = { present: true, sha256: sha(readFileSync(p)), bytes: st.size, fresh: st.mtimeMs >= buildStart - 2000 };
    }

    // ---- requirements are read from the COMMIT under judgement, never from a
    // possibly-dirty working tree: an uncommitted edit must not be able to
    // weaken the checks that are judging it.
    let reqs;
    let reqSource;
    try {
      const fromCommit = spawnSync('git', ['show', `${commit}:verify/gate/requirements.json`], { cwd: REPO, encoding: 'utf8' });
      if (fromCommit.status !== 0) throw new Error(fromCommit.stderr || 'absent at this commit');
      reqs = JSON.parse(fromCommit.stdout).requirements;
      reqSource = 'commit';
    } catch (e) {
      report.steps.push({ id: 'setup:requirements', required: true, status: 'fail', exit: null, ms: 0, cmd: 'git show requirements.json', stdoutSha: null, tail: `requirements unreadable at ${commit.slice(0, 8)}: ${String(e.message).trim()}` });
      reqs = JSON.parse(readFileSync(join(REPO, 'verify/gate/requirements.json'), 'utf8')).requirements;
      reqSource = 'working-tree (commit copy unreadable)';
    }
    report.definitions.requirementsSource = reqSource;
    const stepById = Object.fromEntries(report.steps.map((s) => [s.id, s]));
    const unitByFile = Object.fromEntries(unitRuns.map((r) => [r.file, r]));
    report.unitFiles = unitRuns.map((r) => ({
      file: r.file,
      runStatus: r.status,
      tests: r.tests,
      verdict: r.verdict.status,
      detail: r.verdict.detail,
      ms: r.ms,
    }));
    // Files no requirement names still matter: a skip there is visible as a
    // risk even though it does not carry any requirement.
    report.unitAnomalies = report.unitFiles.filter((u) => u.verdict !== 'PASS');
    const checkStatus = (c) => {
      switch (c.kind) {
        case 'test-file': {
          if (!existsSync(join(worktree, c.file))) return { check: c, status: 'BLOCKED', detail: `test file missing: ${c.file}` };
          const s = stepById.unit;
          if (!s) return { check: c, status: 'BLOCKED', detail: 'unit step never ran' };
          const run = unitByFile[c.file];
          if (!run) return { check: c, status: 'BLOCKED', detail: `${c.file} has no run of its own in this report` };
          if (run.verdict.status !== 'PASS') return { check: c, status: run.verdict.status, detail: run.verdict.detail };
          if (s.status !== 'pass') return { check: c, status: 'FAIL', detail: `unit suite ${s.status}` };
          return { check: c, status: 'PASS', detail: run.verdict.detail };
        }
        case 'test-title': {
          if (!existsSync(join(worktree, c.file))) return { check: c, status: 'BLOCKED', detail: `test file missing: ${c.file}` };
          const s = stepById.unit;
          if (!s) return { check: c, status: 'BLOCKED', detail: 'unit step never ran' };
          const run = unitByFile[c.file];
          if (!run) return { check: c, status: 'BLOCKED', detail: `${c.file} has no run of its own in this report` };
          // The file must be sound before a single title from it is evidence:
          // a title reported ok inside a file that also skipped or failed is
          // not a clean pass for the requirement that cites it.
          if (run.verdict.status !== 'PASS') {
            return { check: c, status: run.verdict.status, detail: `"${c.title}": backing file — ${run.verdict.detail}` };
          }
          const verdict = run.titles.get(c.title);
          if (verdict === undefined) return { check: c, status: 'BLOCKED', detail: `"${c.title}" never reported in its own file's run` };
          if (verdict === 'skip') return { check: c, status: 'BLOCKED', detail: `"${c.title}" was skipped` };
          if (verdict === 'todo') return { check: c, status: 'BLOCKED', detail: `"${c.title}" is a TODO, not an assertion` };
          if (verdict === 'not-ok') return { check: c, status: 'FAIL', detail: `"${c.title}" reported not ok` };
          if (s.status !== 'pass') return { check: c, status: 'FAIL', detail: `"${c.title}" passed but the suite is ${s.status}` };
          return { check: c, status: 'PASS', detail: `"${c.title}" reported ok in its own file's run` };
        }
        case 'step': {
          const s = stepById[c.step];
          if (!s) return { check: c, status: 'BLOCKED', detail: `step ${c.step} not run` };
          if (s.status === 'absent') return { check: c, status: 'BLOCKED', detail: s.tail };
          if (s.status === 'pass') return { check: c, status: 'PASS', detail: `${c.step} exit 0` };
          return { check: c, status: 'FAIL', detail: `${c.step} exit ${s.exit}` };
        }
        case 'artifact': {
          const a = report.artifacts[c.path];
          if (!a || !a.present) return { check: c, status: 'FAIL', detail: `missing ${c.path}` };
          if (!a.fresh) return { check: c, status: 'BLOCKED', detail: `${c.path} was not produced by this run (stale artifact)` };
          return { check: c, status: 'PASS', detail: `${c.path} sha256 ${a.sha256.slice(0, 12)}…` };
        }
        case 'visual-report': {
          if (!visual.ok) return { check: c, status: 'BLOCKED', detail: visual.reason };
          if (visual.commit !== commit) return { check: c, status: 'BLOCKED', detail: `visual report is for ${visual.commit.slice(0, 8)}, target is ${commit.slice(0, 8)}` };
          const want = new Set(c.rows);
          const seen = new Set();
          const bad = [];
          for (const row of visual.rows) {
            for (const chk of row.checks || []) {
              if (!want.has(chk.name)) continue;
              seen.add(chk.name);
              if (chk.pass === false) bad.push(`${row.tag} :: ${chk.name}`);
            }
          }
          const missing = [...want].filter((w) => !seen.has(w));
          if (missing.length) return { check: c, status: 'BLOCKED', detail: `rows absent from report: ${missing.join(', ')}` };
          if (bad.length) return { check: c, status: 'FAIL', detail: `${bad.length} failing row(s): ${bad.slice(0, 4).join(' | ')}` };
          return { check: c, status: 'PASS', detail: `${seen.size} check name(s) across ${visual.rows.length} rows, no failures` };
        }
        case 'manual':
          return { check: c, status: 'NOT_APPLICABLE', detail: c.justification };
        default:
          return { check: c, status: 'BLOCKED', detail: `unknown check kind ${c.kind}` };
      }
    };

    for (const r of reqs) {
      const checks = r.checks.map(checkStatus);
      const statuses = checks.map((c) => c.status);
      let status = 'PASS';
      if (statuses.includes('FAIL')) status = 'FAIL';
      else if (statuses.includes('BLOCKED')) status = 'BLOCKED';
      else if (statuses.every((s) => s === 'NOT_APPLICABLE')) status = 'NOT_APPLICABLE';
      if (!checks.length) status = 'BLOCKED';
      report.requirements.push({ id: r.id, title: r.title, severity: r.severity, status, why: r.why, checks });
      console.log(`  req  ${r.id.padEnd(12)} ${status}`);
    }

    // ---- verdict: only release severity can block or fail the gate, plus every
    // step the gate declares itself. A step that no requirement names used to be
    // invisible: `release:check` could fail and the run still printed PASS.
    const release = report.requirements.filter((r) => r.severity === 'release');
    const tracked = report.requirements.filter((r) => r.severity !== 'release');
    // Audit EVERY step the run recorded, including the setup steps: a fallback
        // build line or a working-tree requirements file used to be invisible to
        // the verdict because only the declared list was inspected.
    report.stepAudit = report.steps.map((s) => ({ id: s.id, required: s.required === true, ...stepVerdict(s) }));
    const stepProblems = report.stepAudit.filter((v) => v.status !== 'PASS');
    // Threshold changelog: a commit that changes verify/thresholds.json must
    // document the change. Both sides are read from the judged COMMIT, so a
    // dirty working tree cannot supply a changelog for a commit that lacks one.
    report.policy = [];
    const thrParent = spawnSync('git', ['show', `${commit}^:verify/thresholds.json`], { cwd: REPO, encoding: 'utf8' });
    const thrCommit = spawnSync('git', ['show', `${commit}:verify/thresholds.json`], { cwd: REPO, encoding: 'utf8' });
    if (thrParent.status === 0 && thrCommit.status === 0 && thrParent.stdout !== thrCommit.stdout) {
      const cl = spawnSync('git', ['show', `${commit}:docs/redesign/THRESHOLD_CHANGES.md`], { cwd: REPO, encoding: 'utf8' });
      const changelog = cl.status === 0 ? cl.stdout : '';
      const hasEntry = /^\|\s*\d{4}-\d{2}-\d{2}\s*\|/m.test(changelog) && /threshold/i.test(changelog);
      if (!hasEntry) {
        report.policy.push({ id: 'threshold-changelog', title: 'thresholds changed without a changelog entry', status: 'BLOCKED', detail: `${commit} changes verify/thresholds.json but docs/redesign/THRESHOLD_CHANGES.md has no dated threshold row` });
      }
    }
    report.verdict = decideVerdict({ release, stepAudit: report.stepAudit, lock, policy: report.policy });
    report.unresolved = [
      ...report.policy,
      ...(lock.ok ? [] : [{ id: 'lock', title: 'gate definitions differ from the lock', status: 'BLOCKED', detail: lock.reason }]),
      ...tracked
        .filter((r) => r.status !== 'PASS')
        .map((r) => ({ id: r.id, title: r.title, status: r.status, detail: r.checks.map((c) => c.detail).join('; ') })),
      ...stepProblems.map((v) => ({ id: `step:${v.id}`, title: `gate step ${v.id}`, status: v.status, detail: v.detail })),
      ...report.unitAnomalies
        .filter((u) => !report.requirements.some((r) => r.checks.some((c) => c.file === u.file)))
        .map((u) => ({ id: `file:${u.file}`, title: `${u.file} is not clean`, status: u.verdict, detail: u.detail })),
    ];

    report.fingerprint = sha(
      JSON.stringify({
        commit,
        treeSha,
        lock: lock.files,
        steps: report.steps.map((s) => [s.id, s.status, s.exit, s.stdoutSha]),
        artifacts: Object.fromEntries(Object.entries(report.artifacts).map(([k, v]) => [k, v.sha256 ?? null])),
      }),
    );
  } finally {
    try {
      symlinkSync; // no-op reference so the import stays used
      rmSync(join(worktree, 'node_modules'), { force: true });
    } catch { /* symlink already gone */ }
    try {
      git(['worktree', 'remove', '--force', worktree]);
      cleaned = true;
    } catch { /* leave it for git worktree prune */ }
    report.worktreeRemoved = cleaned;
  }

  mkdirSync(join(REPO, OUT_DIR), { recursive: true });
  const outFile = join(REPO, OUT_DIR, 'report.json');
  writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);

  const blocked = report.requirements.filter((r) => r.status === 'BLOCKED');
  const failed = report.requirements.filter((r) => r.status === 'FAIL');
  const pass = report.requirements.filter((r) => r.status === 'PASS');
  console.log('');
  console.log(`commit    ${commit}`);
  console.log(`tree      ${treeSha}`);
  console.log(`lock      ${lock.ok ? 'intact' : `BROKEN — ${lock.reason}`}`);
  console.log(`steps     ${report.steps.map((s) => `${s.id}:${s.status}`).join(' ')}`);
  if (report.stepAudit.some((v) => v.status !== 'PASS')) console.log(`steprisk  ${report.stepAudit.filter((v) => v.status !== 'PASS').map((v) => `${v.id}:${v.status}`).join(' ')}`);
  if (report.unitAnomalies.length) console.log(`files     ${report.unitAnomalies.length} test file(s) not clean: ${report.unitAnomalies.slice(0, 4).map((u) => `${u.file}:${u.verdict}`).join(' ')}`);
  console.log(`reqs      ${pass.length} pass, ${failed.length} fail, ${blocked.length} blocked`);
  for (const u of report.unresolved) console.log(`risk      ${u.id} — ${u.title} [${u.status}]`);
  console.log(`verdict   ${report.verdict}`);
  console.log(`report    ${relative(REPO, outFile)}`);
  process.exit(report.verdict === 'PASS' ? 0 : report.verdict === 'FAIL' ? 1 : 2);
}

// Exported so the acceptance tests in tests/gate-evidence.test.mjs can exercise
// the classifiers on real TAP shapes without running the gate.
export { parseTap, tapSummary, classifyFileRun, stepVerdict, decideVerdict };

const invokedDirectly = Boolean(process.argv[1]) && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  main().catch((e) => {
    console.error(`gate crashed: ${e.stack || e.message}`);
    process.exit(3);
  });
}
