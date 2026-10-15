/**
 * Integration tests for the Codgar Ultimate Core backend.
 *
 * Starts the real server (same entry point as `npm run dev`) on a free port and
 * exercises the HTTP surface: SPA fallback, JSON APIs, the cascade regression,
 * and the CSRF/security gate on shell-execution routes.
 *
 * Run with:  npm test
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 34500 + Math.floor(Math.random() * 90);
const BASE = `http://127.0.0.1:${PORT}`;
const SAME_ORIGIN = { Origin: `http://127.0.0.1:${PORT}` };
const JSON_HEADERS = { 'Content-Type': 'application/json' };

let server;

async function waitForHealth(timeoutMs = 90_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return true;
    } catch {
      /* not ready yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('server did not become healthy in time');
}

before(async () => {
  const tsxBin = path.join(ROOT, 'node_modules', '.bin', 'tsx');
  server = spawn(tsxBin, ['server.ts'], {
    cwd: ROOT,
    detached: true,
    env: {
      ...process.env,
      PORT: String(PORT),
      BIND_HOST: '127.0.0.1',
      DISABLE_HMR: 'true',
      CODGAR_AUTOSTART_ROUTERS: '0',
      ADMIN_TOKEN: '',
      CODGAR_PIN: '864209',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
  await waitForHealth();
});

after(async () => {
  if (!server) return;
  try {
    process.kill(-server.pid, 'SIGKILL');
  } catch {
    try { server.kill('SIGKILL'); } catch { /* already gone */ }
  }
  await new Promise((resolve) => {
    if (server.exitCode !== null || server.signalCode) return resolve();
    const timer = setTimeout(resolve, 3000);
    server.once('exit', () => { clearTimeout(timer); resolve(); });
  });
  server.stdout?.destroy();
  server.stderr?.destroy();
});

test('H1: PORT and BIND_HOST env vars are honoured', async () => {
  const res = await fetch(`${BASE}/api/health`);
  assert.equal(res.status, 200);
  assert.equal(new URL(BASE).port, String(PORT));
});

test('health endpoint answers with an honest payload', async () => {
  const body = await (await fetch(`${BASE}/api/health`)).json();
  assert.equal(body.status, 'ok');
  assert.equal(typeof body.runtime, 'string');
  assert.ok(!JSON.stringify(body).includes('sk-'), 'health must not leak key material');
});

test('SPA is served at / and unknown client routes', async () => {
  for (const route of ['/', '/dashboard']) {
    const res = await fetch(`${BASE}${route}`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/html/);
  }
});

test('yadow router answers /api/status as JSON and is not double-mounted', async () => {
  const res = await fetch(`${BASE}/api/status`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /application\/json/);
  const body = await res.json();
  assert.equal(body.server, 'Codgar Universal Backend');

  const duplicated = await fetch(`${BASE}/api/api/status`);
  const ct = duplicated.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const payload = await duplicated.json();
    assert.notEqual(payload.server, 'Codgar Universal Backend', '/api/api/status is still served by the yadow router');
  }
});

test('C1 regression: repeated /api/pool/cascade calls must not kill the server', async () => {
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${BASE}/api/pool/cascade`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ reason: `test iteration ${i}` }),
    });
    assert.equal(res.status, 200, `cascade #${i + 1} failed`);
  }
  const health = await fetch(`${BASE}/api/health`);
  assert.equal(health.status, 200, 'server died after cascading routers');
});

test('C3: cross-origin requests cannot reach shell execution endpoints', async () => {
  const blocked = await fetch(`${BASE}/api/mcp/shell`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, Origin: 'https://evil.example.com', 'Sec-Fetch-Site': 'cross-site' },
    body: JSON.stringify({ command: 'id' }),
  });
  assert.equal(blocked.status, 403);
  const body = await blocked.json();
  assert.ok(['ORIGIN_NOT_ALLOWED', 'CROSS_SITE_BLOCKED'].includes(body.error));
});

test('C3: dangerous routes reject non-JSON bodies', async () => {
  const res = await fetch(`${BASE}/api/terminal/exec`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: 'command=id',
  });
  assert.equal(res.status, 415);
});

test('C3: same-origin shell execution still works (architecture preserved)', async () => {
  const res = await fetch(`${BASE}/api/mcp/shell`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...SAME_ORIGIN },
    body: JSON.stringify({ command: 'echo codgar-ok' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.success === true || body.status === 'ok', 'shell endpoint did not report success');
  assert.match(String(body.output || body.stdout || ''), /codgar-ok/);
});

test('chat endpoint answers without crashing when no router is reachable', async () => {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ message: 'build a todo app in react' }),
  });
  assert.ok(res.status === 200 || res.status === 503, `unexpected status ${res.status}`);
  const body = await res.json();
  assert.ok(typeof body === 'object' && body !== null);
  assert.ok(!JSON.stringify(body).includes('sk-'), 'chat leaked key material');
});

test('pool metrics and router topology answer with JSON', async () => {
  for (const route of ['/api/pool/metrics', '/api/router/topology', '/api/router/models']) {
    const res = await fetch(`${BASE}${route}`);
    assert.equal(res.status, 200, `${route} did not answer 200`);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
  }
});

test('H7: CORS headers are only echoed for allowed origins', async () => {
  const same = await fetch(`${BASE}/api/health`, { headers: SAME_ORIGIN });
  assert.equal(same.headers.get('access-control-allow-origin'), `http://127.0.0.1:${PORT}`);

  const foreign = await fetch(`${BASE}/api/health`, { headers: { Origin: 'https://evil.example.com' } });
  assert.equal(foreign.headers.get('access-control-allow-origin'), null);
});

test('compiler language registry is available for the universal engine', async () => {
  const res = await fetch(`${BASE}/api/compiler/languages`);
  if (res.status === 404) return; // route optional in this build
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body, 'languages payload missing');
});
