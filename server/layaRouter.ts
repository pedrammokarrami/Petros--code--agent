/**
 * layaRouter.ts — REAL Laya router layer (OpenAI-compatible gateway).
 *
 * Architecture (per product decision): models are reached ONLY through routers,
 * never by direct calls from inside agents. AgentRuntime → freePool →
 * Laya Router (http://127.0.0.1:20131) → backends.
 *
 * Backends (probed live, first success wins — never canned responses):
 *  1. External router daemons, if actually listening (9Router/vansrouter on
 *     20128, omni-engine 20129, alternates 20130/20132). Forwarded as-is.
 *  2. Internal free backends (keyless): Pollinations OpenAI POST, then GET.
 *
 * Skill injection happens HERE at router level: request may carry
 * extra.skillRepo + extra.skillPath (previously fetched into the skill store
 * by layaSkills); the doc is prepended as system context. No skill → no-op.
 *
 * Every failure is a real HTTP 502 with the honest error. No fake success.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

export interface RouterBackendStatus {
  name: string;
  alive: boolean;
  latencyMs: number;
}

interface ChatRequest {
  model?: string;
  messages: { role: string; content: string }[];
  max_tokens?: number;
  temperature?: number;
  extra?: { skillRepo?: string; skillPath?: string };
}

const DAEMON_URLS = [
  'http://127.0.0.1:20128',
  'http://127.0.0.1:20129',
  'http://127.0.0.1:20130',
  'http://127.0.0.1:20132',
];

const POLL_POST = process.env.FREE_PROVIDER_URL || 'https://text.pollinations.ai/openai';
const POLL_MODEL = process.env.FREE_POOL_MODEL || 'openai';

function slug(repo: string): string {
  return repo.replace('/', '__');
}

function loadSkillDoc(workspaceRoot: string, repo?: string, filePath?: string): string | null {
  try {
    if (!repo || !filePath) return null;
    const p = path.join(workspaceRoot, 'skills', 'laya', slug(repo), path.basename(filePath));
    if (!fs.existsSync(p)) return null;
    const buf = fs.readFileSync(p);
    if (buf.length > 60000) return buf.toString('utf8').slice(0, 60000);
    return buf.toString('utf8');
  } catch {
    return null;
  }
}

async function postJson(url: string, body: any, timeoutMs: number): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function extractContent(data: any): string | null {
  const c = data?.choices?.[0]?.message?.content;
  return typeof c === 'string' && c.length > 0 ? c : null;
}

async function tryDaemon(base: string, body: ChatRequest): Promise<{ content: string; backend: string }> {
  const data = await postJson(
    `${base}/v1/chat/completions`,
    { model: body.model || 'auto', messages: body.messages, max_tokens: body.max_tokens ?? 3500, temperature: body.temperature ?? 0.3 },
    60000
  );
  const content = extractContent(data);
  if (!content) throw new Error('daemon returned empty content');
  return { content, backend: `daemon:${base}` };
}

async function tryPollPost(body: ChatRequest): Promise<{ content: string; backend: string }> {
  const data = await postJson(
    POLL_POST,
    { model: POLL_MODEL, messages: body.messages, max_tokens: body.max_tokens ?? 3500, temperature: body.temperature ?? 0.3 },
    180000
  );
  const content = extractContent(data);
  if (!content) throw new Error('empty content');
  return { content, backend: `free:${POLL_MODEL}` };
}

async function tryPollGet(body: ChatRequest): Promise<{ content: string; backend: string }> {
  const last = [...body.messages].reverse().find((m) => m.role === 'user');
  const prompt = (last?.content || '').slice(0, 1500);
  if (!prompt) throw new Error('no user prompt for GET fallback');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  try {
    const res = await fetch(
      `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=${encodeURIComponent(POLL_MODEL)}`,
      { signal: controller.signal }
    );
    if (!res.ok) throw new Error(`GET HTTP ${res.status}`);
    const text = (await res.text()).trim();
    if (!text) throw new Error('empty content');
    return { content: text, backend: `free-get:${POLL_MODEL}` };
  } finally {
    clearTimeout(timer);
  }
}

export async function probeBackends(timeoutMs = 1500): Promise<RouterBackendStatus[]> {
  const out: RouterBackendStatus[] = [];
  for (const base of DAEMON_URLS) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${base}/v1/models`, { signal: AbortSignal.timeout(timeoutMs) });
      out.push({ name: `daemon:${base}`, alive: res.ok, latencyMs: Date.now() - t0 });
    } catch {
      out.push({ name: `daemon:${base}`, alive: false, latencyMs: Date.now() - t0 });
    }
  }
  const t0 = Date.now();
  try {
    const res = await fetch('https://text.pollinations.ai/models', { signal: AbortSignal.timeout(timeoutMs) });
    out.push({ name: 'free:pollinations', alive: res.ok, latencyMs: Date.now() - t0 });
  } catch {
    out.push({ name: 'free:pollinations', alive: false, latencyMs: Date.now() - t0 });
  }
  return out;
}

export async function routeChat(
  workspaceRoot: string,
  req: ChatRequest
): Promise<{ content: string; backend: string; skillInjected: boolean }> {
  if (!req.messages || !Array.isArray(req.messages) || req.messages.length === 0) {
    throw new Error('messages[] is required');
  }
  // Skill injection at router level (docs previously fetched via layaSkills).
  let skillInjected = false;
  let messages = req.messages;
  const doc = loadSkillDoc(workspaceRoot, req.extra?.skillRepo, req.extra?.skillPath);
  if (doc) {
    skillInjected = true;
    messages = [
      { role: 'system', content: `SKILL DOC (${req.extra!.skillRepo}):\n${doc}\nFollow this skill's conventions in your answer.` },
      ...req.messages,
    ];
  }
  const body: ChatRequest = { ...req, messages };
  const errors: string[] = [];

  // 1. External daemons first (real routers when alive).
  for (const base of DAEMON_URLS) {
    try {
      const r = await tryDaemon(base, body);
      return { ...r, skillInjected };
    } catch (e: any) {
      errors.push(`${base}: ${e?.message || e}`);
    }
  }
  // 2. Internal free backends with quota-aware backoff.
  const waits = [0, 45000, 90000];
  for (let i = 0; i < waits.length; i++) {
    if (waits[i] > 0) await new Promise((r) => setTimeout(r, waits[i]));
    try {
      const r = await tryPollPost(body);
      return { ...r, skillInjected };
    } catch (e: any) {
      errors.push(`poll-post try${i}: ${e?.message || e}`);
    }
  }
  try {
    const r = await tryPollGet(body);
    return { ...r, skillInjected };
  } catch (e: any) {
    errors.push(`poll-get: ${e?.message || e}`);
  }
  throw new Error(`all router backends failed: ${errors.join(' | ').slice(0, 600)}`);
}

export function startLayaRouter(workspaceRoot: string, port = 20131): http.Server {
  const server = http.createServer(async (req, res) => {
    const send = (code: number, obj: any) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };
    try {
      if (req.method === 'GET' && (req.url === '/v1/models' || req.url === '/models')) {
        const backends = await probeBackends(1200);
        return send(200, {
          object: 'list',
          data: [
            { id: 'laya-auto', object: 'model', owned_by: 'laya-router', tier: 'auto-cascade' },
            ...backends.filter((b) => b.alive).map((b) => ({ id: b.name, object: 'model', owned_by: 'laya-router', tier: 'live' })),
          ],
        });
      }
      if (req.method === 'GET' && (req.url === '/health' || req.url === '/api/health')) {
        return send(200, { status: 'ok', router: 'laya', backends: await probeBackends(1200) });
      }
      if (req.method === 'POST' && req.url === '/v1/chat/completions') {
        let raw = '';
        req.on('data', (c) => {
          raw += c;
          if (raw.length > 200000) req.destroy();
        });
        req.on('end', async () => {
          try {
            const body = JSON.parse(raw || '{}');
            const r = await routeChat(workspaceRoot, body);
            send(200, {
              id: `laya-${Date.now()}`,
              object: 'chat.completion',
              created: Math.floor(Date.now() / 1000),
              model: body.model || 'laya-auto',
              choices: [{ index: 0, message: { role: 'assistant', content: r.content }, finish_reason: 'stop' }],
              _laya: { backend: r.backend, skillInjected: r.skillInjected },
            });
          } catch (e: any) {
            send(502, { error: e?.message || String(e) });
          }
        });
        return;
      }
      send(404, { error: 'not found (try GET /v1/models, GET /health, POST /v1/chat/completions)' });
    } catch (e: any) {
      send(500, { error: e?.message || String(e) });
    }
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`[Laya Router] REAL gateway listening on http://127.0.0.1:${port} (models via routers, never direct)`);
  });
  return server;
}
