// Generates docs/redesign/evidence/M2-failures.md straight from last-run.json.
// Every number in the table is read from the run, never retyped.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const run = JSON.parse(readFileSync(join(root, 'docs/redesign/verify_shots/last-run.json'), 'utf8'));
const rows = run.rows || [];
const failing = rows.filter((r) => !r.pass);

const num = (v) => (typeof v === 'number' ? (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2)) : String(v));
const cell = (s) => String(s).replace(/\|/g, '\\|');

let md = `# M2 failures\n\n`;
md += `Generated from \`docs/redesign/verify_shots/last-run.json\` — no number below was typed by hand.\n\n`;
md += `rows=${rows.length} failing=${failing.length} hardErrors=${(run.hardErrors || []).length}\n\n`;
md += `| # | gate | scene | viewport | measured | threshold |\n|---|------|-------|----------|----------|-----------|\n`;
let i = 0;
for (const r of failing) {
  for (const c of r.checks.filter((c) => !c.pass)) {
    md += `| ${++i} | ${cell(c.name)} | ${r.scene} | ${r.viewport} | ${cell(num(c.value))} | ${cell(c.limit)} |\n`;
  }
}
if (run.hardErrors?.length) {
  md += `\n## Hard errors\n\n`;
  for (const e of run.hardErrors) md += `- ${cell(e)}\n`;
}
// Gate summary, still straight from the run.
const byGate = new Map();
for (const r of rows) for (const c of r.checks) {
  const b = byGate.get(c.name) || { pass: 0, fail: 0 };
  c.pass ? b.pass++ : b.fail++;
  byGate.set(c.name, b);
}
md += `\n## Gate summary\n\n| gate | pass | fail |\n|------|------|------|\n`;
for (const [k, v] of [...byGate].sort()) md += `| ${cell(k)} | ${v.pass} | ${v.fail} |\n`;
writeFileSync(join(root, 'docs/redesign/evidence/M2-failures.md'), md);
console.log(`wrote M2-failures.md: ${i} failing checks across ${failing.length} rows`);
