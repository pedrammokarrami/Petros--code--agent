/**
 * layaDecider.ts — Laya Decision Engine (REAL, deterministic, fast).
 *
 * Laya owns every routing decision: which lane (free pool vs local CLI agent),
 * which agent, which skill. Decisions are logged to .laya_decisions.jsonl so
 * they get measurably better over time (latency/outcome per lane).
 *
 * SAFETY (non-negotiable):
 * - Paid/subscription CLIs (codex, claude, gemini, grok, opencode) are DISABLED
 *   by default. They spend the user's own quota/money and get file-write
 *   access, so Laya NEVER dispatches to them until the person explicitly
 *   enables each one via POST /api/laya/agents/enable.
 * - Dispatch cwd is always constrained inside the Codgar workspace.
 * - No credentials are ever logged or returned.
 */

import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

export type Lane = 'free-pool' | 'cli-agent';
export type TaskKind = 'chat' | 'code-small' | 'frontend' | 'heavy';

export interface AgentInfo {
  id: string;
  bin: string;
  quality: 'high' | 'medium';
  cost: 'subscription' | 'free';
  enabled: boolean;
  verified: boolean;
  version?: string;
}

export interface Decision {
  lane: Lane;
  agent: string | null;
  skill: string | null;
  reason: string;
  at: number;
}

export interface JobRecord {
  id: string;
  agent: string;
  kind: string;
  prompt: string;
  cwd: string;
  status: 'running' | 'done' | 'failed';
  exitCode: number | null;
  startedAt: number;
  finishedAt: number | null;
  error?: string;
}

const AGENT_DEFS: Omit<AgentInfo, 'enabled' | 'verified' | 'version'>[] = [
  { id: 'codex', bin: 'codex', quality: 'high', cost: 'subscription' },
  { id: 'claude', bin: 'claude', quality: 'high', cost: 'subscription' },
  { id: 'opencode', bin: 'opencode', quality: 'high', cost: 'subscription' },
  { id: 'gemini', bin: 'gemini', quality: 'medium', cost: 'subscription' },
  { id: 'grok', bin: 'grok', quality: 'medium', cost: 'subscription' },
];

/** Non-interactive, background-safe argv per agent. Verified against --help. */
function argvFor(agent: string, prompt: string): string[] {
  switch (agent) {
    case 'codex':
      return ['exec', '--skip-git-repo-check', prompt];
    case 'claude':
      return ['-p', prompt, '--output-format', 'text', '--max-turns', '25'];
    case 'opencode':
      return ['run', prompt];
    case 'gemini':
      return ['-p', prompt];
    case 'grok':
      return ['-p', prompt];
    default:
      throw new Error(`unknown agent: ${agent}`);
  }
}

export class LayaDecider {
  private static instance: LayaDecider;
  private workspaceRoot: string;
  private agents = new Map<string, AgentInfo>();
  private jobs = new Map<string, { rec: JobRecord; proc: ChildProcess | null }>();
  private decisionsFile: string;
  private jobsDir: string;

  private constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.decisionsFile = path.join(workspaceRoot, '.laya_decisions.jsonl');
    this.jobsDir = path.join(workspaceRoot, '.laya_jobs');
    try {
      fs.mkdirSync(this.jobsDir, { recursive: true });
    } catch {}
    for (const d of AGENT_DEFS) {
      this.agents.set(d.id, { ...d, enabled: false, verified: false });
    }
  }

  public static getInstance(workspaceRoot?: string): LayaDecider {
    if (!LayaDecider.instance) {
      LayaDecider.instance = new LayaDecider(workspaceRoot || process.cwd());
    }
    return LayaDecider.instance;
  }

  // ---------- agents ----------

  public listAgents(): AgentInfo[] {
    return [...this.agents.values()].map((a) => ({ ...a }));
  }

  /** Free probe: version only. Never sends a prompt, never spends quota. */
  public async verifyAgent(id: string): Promise<AgentInfo> {
    const a = this.agents.get(id);
    if (!a) throw new Error(`unknown agent: ${id}`);
    try {
      const out = await this.execFile(a.bin, ['--version'], 15000);
      a.version = out.trim().slice(0, 80);
      a.verified = true;
    } catch (err: any) {
      a.verified = false;
      a.version = undefined;
      throw new Error(`${id} not usable: ${err?.message || err}`);
    }
    return { ...a };
  }

  public setEnabled(id: string, enabled: boolean): AgentInfo {
    const a = this.agents.get(id);
    if (!a) throw new Error(`unknown agent: ${id}`);
    a.enabled = enabled;
    return { ...a };
  }

  private execFile(bin: string, args: string[], timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      const t = setTimeout(() => {
        try {
          p.kill('SIGKILL');
        } catch {}
        reject(new Error('timeout'));
      }, timeoutMs);
      p.stdout.on('data', (d) => (out += d.toString().slice(0, 4000)));
      p.on('error', (e) => {
        clearTimeout(t);
        reject(e);
      });
      p.on('close', (code) => {
        clearTimeout(t);
        if (code === 0) resolve(out);
        else reject(new Error(`exit ${code}`));
      });
    });
  }

  // ---------- decisions ----------

  public decide(kind: string, note = ''): Decision {
    const k = (kind || 'chat') as TaskKind;
    const enabled = [...this.agents.values()].filter((a) => a.enabled && a.verified);
    let d: Decision;
    if (k === 'frontend' || k === 'heavy') {
      if (enabled.length > 0) {
        // best quality first: high-quality enabled agents, stable order
        const pick = enabled.sort((x, y) =>
          x.quality === y.quality ? x.id.localeCompare(y.id) : x.quality === 'high' ? -1 : 1
        )[0];
        d = {
          lane: 'cli-agent',
          agent: pick.id,
          skill: this.skillFor(note),
          reason: `professional work → best enabled CLI agent (${pick.id}); free pool is draft-quality only`,
          at: Date.now(),
        };
      } else {
        d = {
          lane: 'free-pool',
          agent: null,
          skill: this.skillFor(note),
          reason: 'no CLI agent enabled (paid CLIs stay off until the person enables them) → free-pool draft lane',
          at: Date.now(),
        };
      }
    } else if (k === 'code-small') {
      d = {
        lane: 'free-pool',
        agent: null,
        skill: this.skillFor(note),
        reason: 'small code task fits the free lane; escalate to frontend/heavy for CLI quality',
        at: Date.now(),
      };
    } else {
      d = {
        lane: 'free-pool',
        agent: null,
        skill: null,
        reason: 'chat is answered in-process; no lane needed',
        at: Date.now(),
      };
    }
    this.logDecision(k, note, d);
    return d;
  }

  /** Keyword → skill repo hint (fetched via layaSkills, docs-only). */
  private skillFor(note: string): string | null {
    const t = (note || '').toLowerCase();
    if (/react|next|frontend|tailwind|vue|svelte|ui\b/.test(t)) return 'vercel-labs/agent-skills';
    if (/mcp|tool|server/.test(t)) return 'modelcontextprotocol/servers';
    if (/skill|agent/.test(t)) return 'agentskills/agentskills';
    return null;
  }

  private logDecision(kind: string, note: string, d: Decision): void {
    try {
      fs.appendFileSync(
        this.decisionsFile,
        JSON.stringify({ kind, note: note.slice(0, 200), ...d }) + '\n',
        'utf8'
      );
    } catch {}
  }

  public recentDecisions(limit = 20): any[] {
    try {
      const lines = fs.readFileSync(this.decisionsFile, 'utf8').trim().split('\n');
      return lines.slice(-limit).map((l) => JSON.parse(l));
    } catch {
      return [];
    }
  }

  // ---------- background dispatch ----------

  private safeCwd(cwd?: string): string {
    const base = this.workspaceRoot;
    const resolved = cwd
      ? path.isAbsolute(cwd)
        ? path.normalize(cwd)
        : path.resolve(base, cwd)
      : base;
    if (!resolved.startsWith(base)) {
      throw new Error('cwd outside workspace denied');
    }
    try {
      fs.mkdirSync(resolved, { recursive: true });
    } catch {}
    return resolved;
  }

  public dispatch(opts: {
    agent: string;
    prompt: string;
    kind?: string;
    cwd?: string;
    timeoutMs?: number;
  }): JobRecord {
    const a = this.agents.get(opts.agent);
    if (!a) throw new Error(`unknown agent: ${opts.agent}`);
    if (!a.enabled) {
      throw new Error(
        `agent "${opts.agent}" is disabled (paid CLIs stay off until the person enables them). Enabled: [${[...this.agents.values()]
          .filter((x) => x.enabled)
          .map((x) => x.id)
          .join(', ')}]`
      );
    }
    if (!opts.prompt || opts.prompt.trim().length < 5) {
      throw new Error('prompt is required');
    }
    const cwd = this.safeCwd(opts.cwd);
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const logFile = path.join(this.jobsDir, `${id}.log`);
    const rec: JobRecord = {
      id,
      agent: a.id,
      kind: opts.kind || 'frontend',
      prompt: opts.prompt.slice(0, 2000),
      cwd,
      status: 'running',
      exitCode: null,
      startedAt: Date.now(),
      finishedAt: null,
    };
    const argv = argvFor(a.id, opts.prompt);
    const log = fs.createWriteStream(logFile, { flags: 'a' });
    log.write(`$ ${a.bin} ${argv.map((x) => (x.length > 60 ? x.slice(0, 60) + '…' : x)).join(' ')}\n`);
    log.write(`cwd: ${cwd}\n---\n`);
    const proc = spawn(a.bin, argv, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const timeoutMs = opts.timeoutMs || 20 * 60 * 1000;
    const timer = setTimeout(() => {
      try {
        proc.kill('SIGKILL');
      } catch {}
    }, timeoutMs);
    proc.stdout.on('data', (d) => log.write(d));
    proc.stderr.on('data', (d) => log.write(d));
    proc.on('error', (e) => {
      clearTimeout(timer);
      rec.status = 'failed';
      rec.finishedAt = Date.now();
      rec.error = e.message;
      try {
        log.write(`\n[SPAWN ERROR] ${e.message}\n`);
        log.end();
      } catch {}
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      rec.status = code === 0 ? 'done' : 'failed';
      rec.exitCode = code;
      rec.finishedAt = Date.now();
      try {
        log.write(`\n[EXIT ${code}]\n`);
        log.end();
      } catch {}
    });
    this.jobs.set(id, { rec, proc });
    this.logDecision(rec.kind, `dispatch:${a.id}`, {
      lane: 'cli-agent',
      agent: a.id,
      skill: null,
      reason: `background dispatch to ${a.id} (cwd inside workspace)`,
      at: Date.now(),
    });
    return { ...rec };
  }

  public listJobs(): JobRecord[] {
    return [...this.jobs.values()].map((j) => ({ ...j.rec }));
  }

  public getJob(id: string, tailBytes = 8000): (JobRecord & { logTail: string }) | null {
    const j = this.jobs.get(id);
    if (!j) return null;
    let logTail = '';
    try {
      const st = fs.statSync(path.join(this.jobsDir, `${id}.log`));
      const start = Math.max(0, st.size - tailBytes);
      const fd = fs.openSync(path.join(this.jobsDir, `${id}.log`), 'r');
      const buf = Buffer.alloc(Math.min(tailBytes, st.size));
      fs.readSync(fd, buf, 0, buf.length, start);
      fs.closeSync(fd);
      logTail = buf.toString('utf8');
    } catch {}
    return { ...j.rec, logTail };
  }
}
