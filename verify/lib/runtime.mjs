// One runtime contract for every verification entry point.
//
// Why this exists: Playwright 1.64 hard-exits on Node < 20 (bootstrap.js:26-33), and a
// harness launched by Node 20 can still spawn a `node` from PATH that is 18, or an `npm`
// that is not installed at all. Both failures used to surface as "the test is red" instead
// of "the toolchain is wrong", so the checks below fail loudly and in one place.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { delimiter } from 'node:path';

export const MIN_NODE_MAJOR = 20;

/** Major version as an integer, e.g. 'v20.19.0' -> 20. */
export function nodeMajor(version = process.versions.node) {
  return Number(String(version).replace(/^v/, '').split('.')[0]);
}

/**
 * Throws when the interpreter running this process is older than the supported floor.
 * Call it at the top of an entry point so the message names Node, not Playwright.
 */
export function assertSupportedNode(version = process.versions.node) {
  const major = nodeMajor(version);
  if (!Number.isFinite(major) || major < MIN_NODE_MAJOR) {
    throw new Error(
      `Node ${version} is not supported by the verification harness: Playwright 1.64 requires Node >= ${MIN_NODE_MAJOR}. ` +
        'Run the command with Node 20 or 22 (e.g. `nvm use 20` or the node-20 bin dir on PATH), then retry.',
    );
  }
  return major;
}

/**
 * npm that ships next to the node running this process. Resolving it relative to
 * process.execPath instead of trusting PATH is what keeps the build on the same Node as
 * the harness — PATH can point at an older node, and this VM's /usr/bin has no npm at all.
 */
export function npmCommand() {
  const dir = dirname(process.execPath);
  const candidate = join(dir, process.platform === 'win32' ? 'npm.cmd' : 'npm');
  return existsSync(candidate) ? candidate : null;
}

/** Env for child processes: the running node's own bin dir first on PATH. */
export function childEnv(extra = {}) {
  const dir = dirname(process.execPath);
  return {
    ...process.env,
    PATH: `${dir}${delimiter}${process.env.PATH ?? ''}`,
    ...extra,
  };
}
