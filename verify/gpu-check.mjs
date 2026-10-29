// GPU-host check for a human on an ordinary laptop. No Docker, no VM, no cloud assumption:
// it starts the already-built app on this machine, runs the two gates that need a real
// renderer, probes frame time, prints the GL renderer string and writes the result to
// docs/redesign/evidence/gpu-host.txt. Exit 0 only when WebGL is hardware-accelerated AND
// both gates pass; 2 = software renderer (not a product measurement), 1 = gate failure.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'docs/redesign/evidence');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'gpu-host.txt');
const started = new Date().toISOString();
let buf = `# GPU host check\nstarted: ${started}\nhost: ${process.platform}/${process.arch}\nnode: ${process.version}\n\n`;
let ft = null;
let rc = 0;

buf += '$ node verify/frametime.mjs\n';
const f = spawnSync('node', ['verify/frametime.mjs'], { cwd: root, encoding: 'utf8' });
buf += `[exit ${f.status}]\n${(f.stdout || '').trimEnd()}\n${f.stderr ? '--- stderr ---\n' + f.stderr.trimEnd() + '\n' : ''}\n`;
try { ft = JSON.parse((f.stdout || '').trim().split('\n').filter((l) => l.trim().startsWith('{') || l.trim().startsWith('"')).join('\n')); } catch { /* parsed below via whole body */ }
if (!ft) { try { ft = JSON.parse(f.stdout.trim()); } catch { ft = null; } }

for (const [label, cmd] of [['npm run verify', 'node verify/run.mjs'], ['npm run verify:leak', 'node verify/leak.mjs']]) {
  buf += `\n$ ${label}\n`;
  const r = spawnSync(cmd, { cwd: root, shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  buf += `[exit ${r.status}]\n${(r.stdout || '').trimEnd()}\n${r.stderr ? '--- stderr ---\n' + r.stderr.trimEnd() + '\n' : ''}\n`;
  if (r.status !== 0) rc = 1;
}

buf += `\n## Summary\nrenderer: ${ft?.renderer ?? 'unavailable'}\nrenderer kind: ${ft?.kind ?? 'unknown'} (software renderers are not a product FPS)\n`;
if (ft?.rooms?.length) for (const r of ft.rooms) buf += `${r.room}: p50 ${r.p50ms}ms (${r.fps} fps), p95 ${r.p95ms}ms\n`;
if (rc === 0 && ft?.kind !== 'gpu') { rc = 2; buf += '\nRESULT: SOFTWARE RENDERER — gates ran but frame times are not a GPU measurement.\n'; }
else buf += `\nRESULT: ${rc === 0 ? 'GPU + gates PASS' : 'FAIL'}\n`;
writeFileSync(outFile, buf);
process.stdout.write(buf);
process.stdout.write(`\nwrote ${outFile}\n`);
process.exit(rc);
