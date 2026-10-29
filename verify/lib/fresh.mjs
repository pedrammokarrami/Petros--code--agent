// A gate that measures a stale bundle is a lie: the whole earlier round of
// measurements was taken against a dist that predated src/, so every scene kept
// serving the old point file. This module makes that impossible.
import { statSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { childEnv, npmCommand } from './runtime.mjs';

/**
 * Inputs that a build must be at least as new as. Shared with verify/lib/server.mjs.
 * `server` belongs here because `build` bundles `server.ts` with esbuild, and that entry
 * imports 22 modules from `./server/` into `dist/server.cjs` — leaving it out let a changed
 * server file ship a dist that this gate still called fresh.
 */
export const SOURCE_PATHS = ['src', 'server', 'server.ts', 'index.html', 'vite.config.ts', 'scripts/build-point-assets.mjs', 'public'];

/** Newest mtime under a path, recursive; 0 when missing. Pure enough to unit-test. */
export function newestMtime(p, isRoot = true) {
  if (!existsSync(p)) return 0;
  const st = statSync(p);
  // Only files count. A directory's own mtime changes when a file is added, which
  // made a freshly written dist/ look newer than sources it predates.
  if (!st.isDirectory()) return st.mtimeMs;
  let newest = 0;
  for (const e of readdirSync(p, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const t = newestMtime(join(p, e.name), false);
    if (t > newest) newest = t;
  }
  return newest;
}

/** Returns { fresh, newestSource, distTime }. No side effects. */
export function classifyFreshness({ sources, dist }) {
  const newestSource = Math.max(0, ...sources.map((p) => newestMtime(p)));
  const distTime = newestMtime(dist);
  return { fresh: distTime > 0 && distTime >= newestSource, newestSource, distTime };
}

/** Freshness of this repo's dist/ against this repo's sources. */
export function classifyDist(root) {
  return classifyFreshness({ sources: SOURCE_PATHS.map((p) => join(root, p)), dist: join(root, 'dist') });
}

/**
 * Ensures dist is at least as new as every source input. `build: true` rebuilds once
 * instead of failing, which is what `npm run verify` wants; `build: false` is for a
 * caller that must not mutate the tree. Throws with the exact stale paths on failure.
 */
export function ensureFreshDist(root, { build = true } = {}) {
  const res = classifyDist(root);
  if (res.fresh) return res;
  if (!build) {
    throw new Error(`dist is older than src/ (dist ${new Date(res.distTime).toISOString()}, newest source ${new Date(res.newestSource).toISOString()}). Run npm run build first.`);
  }
  console.warn(`[verify] dist is stale (source ${new Date(res.newestSource).toISOString()} > dist ${new Date(res.distTime).toISOString()}); rebuilding once.`);
  // Resolve npm next to the running node: PATH may hold an older node (or no npm at all),
  // and the build must land in the same toolchain the harness is executing on.
  const npm = npmCommand();
  if (!npm) {
    throw new Error(`npm not found next to ${process.execPath}; run the build with a Node >= 20 install that includes npm`);
  }
  const r = spawnSync(npm, ['run', 'build'], { cwd: root, stdio: 'inherit', env: childEnv() });
  if (r.status !== 0) throw new Error('npm run build failed while refreshing a stale dist');
  const after = classifyDist(root);
  if (!after.fresh) throw new Error('dist still older than src after build');
  return after;
}
