/**
 * Tests for the gap-closure engines: AST-aware patching, SAST scanning and the
 * codebase retrieval index. They run against the real server on a free port.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 34700 + Math.floor(Math.random() * 90);
const BASE = `http://127.0.0.1:${PORT}`;
const SAME_ORIGIN = { Origin: `http://127.0.0.1:${PORT}` };
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const FIXTURE = 'tests/fixtures/sample.ts';

let server;

async function waitForHealth(timeoutMs = 90_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('server did not become healthy in time');
}

const post = (route, body) =>
  fetch(`${BASE}${route}`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...SAME_ORIGIN },
    body: JSON.stringify(body),
  });

before(async () => {
  server = spawn(path.join(ROOT, 'node_modules', '.bin', 'tsx'), ['server.ts'], {
    cwd: ROOT,
    detached: true,
    env: { ...process.env, PORT: String(PORT), BIND_HOST: '127.0.0.1', DISABLE_HMR: 'true', CODGAR_AUTOSTART_ROUTERS: '0', CODGAR_PIN: '864209' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await waitForHealth();
});

after(async () => {
  if (!server) return;
  try { process.kill(-server.pid, 'SIGKILL'); } catch { try { server.kill('SIGKILL'); } catch { /* gone */ } }
});

test('SAST scanner flags a leaked key and eval in injected code', async () => {
  const res = await post('/api/security/scan', {
    fileName: 'snippet.ts',
    content: 'const key = "sk-live-abcdef0123456789abcdef";\neval(userInput);\n',
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  const rules = body.results[0].findings.map((f) => f.rule);
  assert.ok(rules.includes('secret-hardcoded'), 'leaked key not detected');
  assert.ok(rules.includes('code-exec-eval'), 'eval not detected');
  assert.equal(body.summary.passed, false, 'a critical finding must fail the summary');
});

test('SAST tree scan reports real numbers (no fabricated metrics)', async () => {
  const res = await post('/api/security/scan', { path: '.' });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.scope, 'tree');
  assert.ok(body.filesScanned > 50, 'scan did not walk the workspace');
  assert.equal(typeof body.summary.totals.critical, 'number');
});

test('AST patch applies a valid edit and verifies syntax', async () => {
  const original = fs.readFileSync(path.join(ROOT, FIXTURE), 'utf8');
  const res = await post('/api/patch/apply', {
    filePath: FIXTURE,
    find: "'1.0.0'",
    replace: "'1.0.1'",
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.applied, true, `patch rejected: ${body.reason} ${body.diagnostics?.join(' | ')}`);
  assert.equal(body.verifier, 'typescript-ast');

  const patched = fs.readFileSync(path.join(ROOT, FIXTURE), 'utf8');
  assert.match(patched, /1\.0\.1/);
  fs.writeFileSync(path.join(ROOT, FIXTURE), original); // restore fixture
});

test('AST patch refuses an edit that would break syntax', async () => {
  const res = await post('/api/patch/apply', {
    filePath: FIXTURE,
    find: "return `hello ${name}`;",
    replace: "return (hello ${name};",
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.applied, false);
  assert.equal(body.reason, 'PATCH_WOULD_BREAK_SYNTAX');
  assert.ok(body.diagnostics.length > 0, 'no diagnostics reported for a broken patch');
});

test('AST patch refuses non-unique anchors and path traversal', async () => {
  const dup = await post('/api/patch/apply', { filePath: FIXTURE, find: 'export', replace: 'export const x = 1; export', expectedCount: 1 });
  const dupBody = await dup.json();
  assert.equal(dupBody.applied, false);
  assert.match(dupBody.reason, /ANCHOR_NOT_UNIQUE/);

  const escape = await post('/api/patch/apply', { filePath: '../../etc/hosts', find: 'a', replace: 'b' });
  const escapeBody = await escape.json();
  assert.equal(escapeBody.applied, false);
  assert.equal(escapeBody.reason, 'PATH_OUTSIDE_WORKSPACE');
});

test('code index builds and retrieves relevant chunks', async () => {
  const build = await post('/api/index/build', {});
  const buildBody = await build.json();
  assert.equal(buildBody.success, true);
  assert.ok(buildBody.chunks > 100, 'index is unexpectedly small');

  const search = await post('/api/index/search', { query: 'secret-hardcoded severity critical scanSource rule', limit: 10 });
  const searchBody = await search.json();
  assert.ok(searchBody.hits.length > 0, 'no hits returned');
  assert.ok(searchBody.hits.some((h) => h.file.includes('securityScanner')), 'expected securityScanner.ts in the hits');
  assert.equal(searchBody.stats.mode, 'bm25-lexical');
});

test('exec endpoints stay protected for cross-origin callers', async () => {
  const res = await fetch(`${BASE}/api/patch/apply`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, Origin: 'https://evil.example.com' },
    body: JSON.stringify({ filePath: 'x.ts', find: 'a', replace: 'b' }),
  });
  assert.equal(res.status, 403);
});
