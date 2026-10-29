import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { classifyDist } from './fresh.mjs';
import { assertSupportedNode, childEnv } from './runtime.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PORT = Number(process.env.VERIFY_PORT || 4399);
export const BASE = `http://127.0.0.1:${PORT}`;

/**
 * Refuse to measure a bundle that predates its sources. Callers that may rebuild
 * (`verify/run.mjs`, `verify/shots.mjs`, ...) call ensureFreshDist first; everything else
 * gets this hard failure instead of a silently stale measurement.
 */
export function assertFreshDist(root = ROOT) {
  const res = classifyDist(root);
  const entry = join(root, 'dist/server.cjs');
  if (!existsSync(entry) || !res.fresh) {
    const dist = res.distTime ? new Date(res.distTime).toISOString() : 'missing';
    const src = new Date(res.newestSource).toISOString();
    throw new Error(
      `refusing to start a stale server: dist/server.cjs ${dist} is older than the newest source ${src}. ` +
        'Run `npm run build` (or use ensureFreshDist) before verifying.',
    );
  }
  return res;
}

export async function startServer() {
  assertSupportedNode();
  // Fail before touching the port: a stale build is not worth a browser run.
  assertFreshDist();
  // Refuse to run against a server we did not start. A stale `dist/server.cjs` left on the
  // port makes the health probe pass and silently measures an old build.
  try {
    const probe = await fetch(`${BASE}/api/health`);
    if (probe.ok) throw new Error(`port ${PORT} already has a server; stop it before measuring`);
  } catch (e) {
    if (String(e.message).includes('already has a server')) throw e;
  }
  // process.execPath, not 'node': the server must run on the same interpreter as the harness.
  const child = spawn(process.execPath, ['dist/server.cjs'], {
    cwd: ROOT,
    // Isolate app data: a gate run drives real flows and would otherwise append demo startups
    // to data/startups.json (measured: 2029 lines after one sweep).
    env: childEnv({
      PORT: String(PORT),
      NODE_ENV: 'production',
      VERIFY_MODE: '1',
      PETROS_STARTUPS_FILE: join(tmpdir(), `petros-verify-startups-${PORT}.json`),
    }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d.toString(); });
  child.stderr.on('data', (d) => { log += d.toString(); });
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return { child, log: () => log };
    } catch { /* not up yet */ }
    await sleep(500);
  }
  child.kill('SIGKILL');
  throw new Error(`server did not become healthy on ${BASE}\n--- server log ---\n${log.slice(-3000)}`);
}

export function stopServer(child) {
  try { child.kill('SIGKILL'); } catch { /* already gone */ }
}
