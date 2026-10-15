/**
 * Repository hygiene checks for Codgar Ultimate Core:
 * no leaked secrets, the security gate stays wired, and the one-shot patcher
 * scripts do not come back.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', 'public', 'projects']);
const TEXT_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|html|css|sh|bat|py|yml|yaml|example|env)$/i;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

const files = walk(ROOT);

test('no hardcoded sk- secrets in server sources', () => {
  const offenders = [];
  for (const file of files.filter((f) => f.startsWith(path.join(ROOT, 'server')) || f.endsWith('server.ts'))) {
    const content = fs.readFileSync(file, 'utf8');
    for (const match of content.matchAll(/['"`]sk-[A-Za-z0-9-]{16,}['"`]/g)) {
      if (/sk-(codgar|example|test)/i.test(match[0])) continue; // clearly-fake placeholders
      offenders.push(`${path.relative(ROOT, file)}: ${match[0].slice(0, 24)}...`);
    }
  }
  assert.deepEqual(offenders, [], `hardcoded secret found: ${offenders.join(', ')}`);
});

test('security gate is wired and covers the dangerous routes', () => {
  const gate = fs.readFileSync(path.join(ROOT, 'server', 'httpSecurity.ts'), 'utf8');
  for (const route of ['(shell|action)', '(exec|execute|cancel)', '(execute|install-tool', '(execute|organize-desktop', '(write|delete|move)']) {
    assert.ok(gate.includes(route), `security gate is missing pattern for ${route}`);
  }
  const server = fs.readFileSync(path.join(ROOT, 'server.ts'), 'utf8');
  assert.ok(server.includes('securityMiddleware()'), 'server.ts no longer installs the security middleware');
  assert.ok(server.includes('installProcessGuards()'), 'server.ts no longer installs the crash guard');
});

test('server binds to env-configurable PORT/BIND_HOST (no hardcoded 3000 listen)', () => {
  const server = fs.readFileSync(path.join(ROOT, 'server.ts'), 'utf8');
  assert.ok(/const PORT = Number\(process\.env\.PORT\)/.test(server), 'PORT is hardcoded again');
  assert.ok(/const BIND_HOST = process\.env\.BIND_HOST/.test(server), 'BIND_HOST is hardcoded again');
});

test('no backup or one-shot patcher artifacts are shipped', () => {
  const banned = [
    'server.ts.bak',
    'server.ts.laya_bak',
    'server/infiniteTokenPool.ts.bak',
    'server/infiniteTokenPool.ts.laya_bak',
    'server/routersRegistry.ts.laya_bak',
  ];
  const present = banned.filter((rel) => fs.existsSync(path.join(ROOT, rel)));
  assert.deepEqual(present, [], `these files must not exist: ${present.join(', ')}`);
});
