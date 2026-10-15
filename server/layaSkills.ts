/**
 * layaSkills.ts — Laya skill acquisition from GitHub (docs-only, allowlisted).
 *
 * When Laya decides a task needs a skill it doesn't have, it fetches the
 * skill's DOCUMENTATION (SKILL.md / README / specs) from an allowlisted GitHub
 * repo and stores it under the workspace skills dir — fast, no cloning, and:
 * - NEVER executes fetched code (no install, no scripts, no binaries).
 * - Only .md/.mdx/.json/.yaml/.txt files, max 200KB each.
 * - Only repos on SKILL_ALLOWLIST (well-known skill/spec sources).
 * Every fetch records provenance (repo, path, sha/date, byte size).
 */

import fs from 'fs';
import path from 'path';

export interface SkillFetchResult {
  repo: string;
  path: string;
  savedTo: string;
  bytes: number;
  at: number;
}

const SKILL_ALLOWLIST = [
  'vercel-labs/agent-skills',
  'agentskills/agentskills',
  'anthropics/skills',
  'modelcontextprotocol/servers',
  'punkpeye/awesome-mcp-servers',
];

const ALLOWED_EXT = new Set(['.md', '.mdx', '.json', '.yaml', '.yml', '.txt']);
const MAX_BYTES = 200 * 1024;

export function skillAllowlist(): string[] {
  return [...SKILL_ALLOWLIST];
}

function slug(repo: string): string {
  return repo.replace('/', '__');
}

export async function fetchSkill(
  workspaceRoot: string,
  repo: string,
  filePath: string,
  timeoutMs = 30000
): Promise<SkillFetchResult> {
  const cleanRepo = (repo || '').trim();
  const cleanPath = (filePath || '').trim().replace(/^\/+/, '');
  if (!SKILL_ALLOWLIST.includes(cleanRepo)) {
    throw new Error(
      `repo not allowlisted: ${cleanRepo}. Allowlisted: [${SKILL_ALLOWLIST.join(', ')}]`
    );
  }
  if (!cleanPath || cleanPath.includes('..')) {
    throw new Error('invalid file path');
  }
  const ext = path.extname(cleanPath).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error(`only docs allowed (${[...ALLOWED_EXT].join(', ')}), got: ${ext || '(none)'}`);
  }
  const url = `https://raw.githubusercontent.com/${cleanRepo}/main/${cleanPath}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': 'Codgar-Laya/1.0 (skill-docs-fetch)' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw new Error(`GitHub raw returned HTTP ${res.status} for ${cleanRepo}/${cleanPath}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error('empty file from GitHub');
  if (buf.length > MAX_BYTES) {
    throw new Error(`file too large (${buf.length}B > ${MAX_BYTES}B)`);
  }
  const dir = path.join(workspaceRoot, 'skills', 'laya', slug(cleanRepo));
  fs.mkdirSync(dir, { recursive: true });
  const savedTo = path.join(dir, path.basename(cleanPath));
  fs.writeFileSync(savedTo, buf);
  // provenance record (append-only)
  try {
    fs.appendFileSync(
      path.join(workspaceRoot, 'skills', 'laya', 'manifest.jsonl'),
      JSON.stringify({ repo: cleanRepo, path: cleanPath, savedTo, bytes: buf.length, at: Date.now() }) + '\n',
      'utf8'
    );
  } catch {}
  return { repo: cleanRepo, path: cleanPath, savedTo, bytes: buf.length, at: Date.now() };
}

export function skillManifest(workspaceRoot: string, limit = 50): any[] {
  try {
    const lines = fs
      .readFileSync(path.join(workspaceRoot, 'skills', 'laya', 'manifest.jsonl'), 'utf8')
      .trim()
      .split('\n');
    return lines.slice(-limit).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}
