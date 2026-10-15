/**
 * SAST / vulnerability scanner for generated and existing code.
 *
 * Everything here is *measured*: each finding is produced by a concrete,
 * deterministic rule over the source text. No heuristic claims "100% secure" —
 * the report always states rule count, scanned file count and severity totals.
 */
import fs from 'fs';
import path from 'path';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface ScanFinding {
  rule: string;
  severity: Severity;
  message: string;
  line: number;
  snippet: string;
}

export interface ScanFileResult {
  file: string;
  findings: ScanFinding[];
}

interface Rule {
  id: string;
  severity: Severity;
  title: string;
  pattern: RegExp;
  /** Extensions the rule applies to; empty means "all text sources". */
  exts: string[];
}

const JS_TS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const ALL = [] as string[];

const RULES: Rule[] = [
  {
    id: 'secret-hardcoded',
    severity: 'critical',
    title: 'Hardcoded credential (sk-/ghp_/glpat-/xoxb-/AKIA)',
    pattern: /['"`](sk-(?!codgar|example|test)[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|glpat-[A-Za-z0-9_-]{16,}|xox[bpas]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16})['"`]/,
    exts: ALL,
  },
  {
    id: 'secret-private-key',
    severity: 'critical',
    title: 'Embedded private key block',
    pattern: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
    exts: ALL,
  },
  {
    id: 'code-exec-eval',
    severity: 'high',
    title: 'Dynamic code execution (eval / new Function)',
    pattern: /\beval\s*\(|new\s+Function\s*\(/,
    exts: JS_TS,
  },
  {
    id: 'code-exec-child-shell',
    severity: 'high',
    title: 'Shell execution with interpolated input',
    pattern: /(?:exec|execSync|spawn|spawnSync)\s*\(\s*[`'"][^`'"]*\$\{/,
    exts: JS_TS,
  },
  {
    id: 'sql-concatenation',
    severity: 'high',
    title: 'SQL built by string concatenation (injection risk)',
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE)\b[\s\S]{0,120}?(?:\+|\$\{)[\s\S]{0,80}?(?:FROM|INTO|WHERE|SET)/i,
    exts: ALL,
  },
  {
    id: 'path-traversal-concat',
    severity: 'medium',
    title: 'File path built from variable input (traversal risk)',
    pattern: /(?:readFileSync|writeFileSync|createReadStream|createWriteStream|unlinkSync)\s*\(\s*(?:path\.join\()?(`[^`]*\$\{|[A-Za-z_$][\w$]*\s*\+\s*['"`])/,
    exts: JS_TS,
  },
  {
    id: 'weak-crypto',
    severity: 'medium',
    title: 'Weak cryptographic primitive (md5/sha1/des/rc4)',
    pattern: /\b(createHash|pseudoRandomBytes)\s*\(\s*['"`](md5|sha1|des|rc4)['"`]|\bMath\.random\s*\(\s*\)/,
    exts: JS_TS,
  },
  {
    id: 'insecure-http',
    severity: 'low',
    title: 'Cleartext http:// endpoint (prefer https)',
    pattern: /http:\/\/(?!127\.0\.0\.1|localhost|0\.0\.0\.0)[a-z0-9.-]+\.[a-z]{2,}/i,
    exts: ALL,
  },
  {
    id: 'python-exec',
    severity: 'high',
    title: 'Python dynamic execution (eval/exec/pickle.loads)',
    pattern: /\b(eval|exec|__import__)\s*\(|pickle\.loads?\s*\(/,
    exts: ['.py'],
  },
  {
    id: 'python-shell-true',
    severity: 'high',
    title: 'Python subprocess with shell=True',
    pattern: /shell\s*=\s*True/,
    exts: ['.py'],
  },
  {
    id: 'ignore-error-swallow',
    severity: 'low',
    title: 'Empty catch block swallows errors silently',
    pattern: /catch\s*(?:\([^)]*\))?\s*\{\s*\}/,
    exts: JS_TS,
  },
];

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next']);

function applies(rule: Rule, file: string): boolean {
  if (rule.exts.length === 0) return true;
  return rule.exts.includes(path.extname(file).toLowerCase());
}

/** Scans a single source string; returns deterministic findings with line numbers. */
export function scanSource(fileName: string, content: string): ScanFinding[] {
  const findings: ScanFinding[] = [];
  const lines = content.split('\n');
  for (const rule of RULES) {
    if (!applies(rule, fileName)) continue;
    const match = rule.pattern.exec(content);
    if (!match) continue;
    const before = content.slice(0, match.index);
    const line = before.split('\n').length;
    findings.push({
      rule: rule.id,
      severity: rule.severity,
      message: rule.title,
      line,
      snippet: (lines[line - 1] || '').trim().slice(0, 160),
    });
  }
  return findings;
}

/** Walks the workspace and scans every text source file. */
export function scanTree(root: string, limitFiles = 400): { results: ScanFileResult[]; filesScanned: number; truncated: boolean } {
  const results: ScanFileResult[] = [];
  let filesScanned = 0;
  let truncated = false;

  const walk = (dir: string) => {
    if (filesScanned >= limitFiles) {
      truncated = true;
      return;
    }
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (filesScanned >= limitFiles) {
        truncated = true;
        return;
      }
      filesScanned++;
      let content: string;
      try {
        content = fs.readFileSync(full, 'utf8');
      } catch {
        continue;
      }
      if (content.includes('\u0000')) continue; // binary
      const findings = scanSource(full, content);
      if (findings.length) results.push({ file: path.relative(root, full), findings });
    }
  };

  walk(root);
  return { results, filesScanned, truncated };
}

/** Summarises a scan into severity counts plus a hardening checklist. */
export function summarise(results: ScanFileResult[]) {
  const totals: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const r of results) for (const f of r.findings) totals[f.severity]++;
  return {
    totals,
    filesWithFindings: results.length,
    passed: totals.critical === 0 && totals.high === 0,
    rules: RULES.map((r) => ({ id: r.id, severity: r.severity, title: r.title })),
  };
}

export const RULE_COUNT = RULES.length;
