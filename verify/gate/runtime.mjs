// verify/gate/runtime.mjs — the runtime the gate and the mutation runner are allowed to use.
//
// A gate run under node 18 reported FAIL for every downstream step because vite and
// rolldown refuse to build there. That is an environment fault, not a property of the
// commit, and a gate that cannot tell the two apart is not trustworthy. So the runtime is
// resolved once, recorded in the report, and a run with no usable runtime is BLOCKED.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

export const MIN_NODE_MAJOR = 20;

export function resolveNode() {
  const cands = [
    process.env.PETROS_GATE_NODE,
    '/home/cua/workspace/tools/node20/bin/node',
    process.execPath,
  ].filter(Boolean);
  const tried = [];
  for (const c of cands) {
    if (!existsSync(c)) { tried.push(`${c} (missing)`); continue; }
    const r = spawnSync(c, ['-v'], { encoding: 'utf8' });
    const v = (r.stdout || '').trim();
    const major = Number((v.match(/^v(\d+)/) || [])[1]);
    if (r.status === 0 && major >= MIN_NODE_MAJOR) return { path: c, version: v, major, tried };
    tried.push(`${c} (${v || 'unreadable'})`);
  }
  return { path: null, version: null, major: null, tried };
}

/** True when a command genuinely exists (used instead of trusting a bare spawnSync status). */
export function hasBinary(name) {
  return existsSync(name) || (spawnSync('sh', ['-lc', `command -v ${name}`]).status === 0);
}
