import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.TOKENDECK_DATA_DIR || path.join(ROOT, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const HOST = process.env.TOKENDECK_HOST || '127.0.0.1';
const PORT = Number(process.env.TOKENDECK_PORT || 8787);
const corsOrigins = (process.env.TOKENDECK_CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(',').map((x) => x.trim()).filter(Boolean);
fs.mkdirSync(DATA_DIR, { recursive: true });

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const mask = (value) => value ? `${value.slice(0, 4)}••••${value.slice(-4)}` : '••••';
const initial = { setupComplete: false, adminPasswordHash: null, tokens: [], keys: [], combos: [], events: [], requests: [] };
let state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : initial;
const save = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), { mode: 0o600 });
const clients = new Set();
const active = new Map();

function json(res, status, body, origin) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': origin || 'null', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'vary': 'Origin' });
  res.end(JSON.stringify(body));
}
function publicKey(k) { const { secret, ...safe } = k; return { ...safe, masked: mask(secret), cooldownMs: Math.max(0, (k.cooldownUntil || 0) - Date.now()) }; }
function emit(type, payload) { const event = { id: id(), type, timestamp: now(), payload }; state.events.push(event); if (state.events.length > 5000) state.events.shift(); save(); for (const res of clients) res.write(`id: ${event.id}\nevent: ${type}\ndata: ${JSON.stringify(event)}\n\n`); }
function body(req) { return new Promise((resolve, reject) => { let data = ''; req.on('data', (c) => { data += c; if (data.length > 2_000_000) req.destroy(); }); req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('invalid_json')); } }); req.on('error', reject); }); }
function auth(req, scope = 'read') { const raw = req.headers.authorization || ''; const token = raw.startsWith('Bearer ') ? raw.slice(7) : ''; const found = state.tokens.find((t) => t.hash === hash(token) && t.scopes.includes(scope)); return Boolean(found); }
function route(pathname, method) { return pathname.replace(/\/$/, '').split('/').filter(Boolean); }
async function proxy(req, res, key, requestBody) {
  const upstream = new URL(key.baseUrl.replace(/\/$/, '') + '/chat/completions');
  const started = Date.now();
  const upstreamReq = http.request(upstream, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key.secret}` } }, (up) => {
    const chunks = []; up.on('data', (c) => { chunks.push(c); res.write(c); }); up.on('end', () => { const raw = Buffer.concat(chunks).toString(); let parsed = {}; try { parsed = JSON.parse(raw); } catch {} const usage = parsed.usage || {}; const record = { id: id(), timestamp: now(), keyAlias: key.alias, provider: key.provider, model: requestBody.model, tokensIn: usage.prompt_tokens || 0, tokensOut: usage.completion_tokens || 0, tokensCached: usage.prompt_tokens_details?.cached_tokens || 0, latencyMs: Date.now() - started, status: up.statusCode || 500, estimatedCostUsd: Number(usage.total_tokens || 0) * Number(key.costPerToken || 0), streaming: requestBody.stream === true }; state.requests.push(record); if (state.requests.length > 100000) state.requests.shift(); key.requestsToday = (key.requestsToday || 0) + 1; key.tokensToday = (key.tokensToday || 0) + Number(usage.total_tokens || 0); if ((up.statusCode || 500) === 429 || (up.statusCode || 500) >= 500) key.cooldownUntil = Date.now() + Math.min(300000, 1000 * 2 ** Math.min(8, key.failures || 0)); else key.failures = 0; save(); emit('request.completed', record); res.end(); }); });
  });
  upstreamReq.on('error', () => { key.failures = (key.failures || 0) + 1; key.cooldownUntil = Date.now() + 5000; save(); if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: { message: 'upstream_unavailable', type: 'gateway_error' } })); });
  upstreamReq.write(JSON.stringify(requestBody)); upstreamReq.end();
}
function selectKey(model) { const candidates = state.keys.filter((k) => k.enabled !== false && (!k.cooldownUntil || k.cooldownUntil <= Date.now()) && (!k.models?.length || k.models.includes(model)) && (!k.requestsPerMinute || (k.requestsMinute || 0) < k.requestsPerMinute) && (!k.tokensPerDay || (k.tokensToday || 0) < k.tokensPerDay)); return candidates.sort((a, b) => (a.priority || 0) - (b.priority || 0) || (a.requestsToday || 0) - (b.requestsToday || 0))[0]; }
async function handler(req, res) {
  const origin = corsOrigins.includes(req.headers.origin) ? req.headers.origin : corsOrigins[0];
  if (req.method === 'OPTIONS') return json(res, 204, {}, origin);
  const url = new URL(req.url, `http://${HOST}:${PORT}`); const parts = route(url.pathname);
  if (url.pathname === '/healthz') return json(res, 200, { ok: true, service: 'tokendeck', timestamp: now() }, origin);
  if (parts[0] !== 'api' || parts[1] !== 'v1') return json(res, 404, { error: 'not_found' }, origin);
  if (parts[2] === 'setup' && req.method === 'POST') { const b = await body(req); if (state.setupComplete || !b.password || String(b.password).length < 12) return json(res, 400, { error: 'setup_unavailable_or_weak_password' }, origin); state.adminPasswordHash = hash(b.password); state.setupComplete = true; const t = crypto.randomBytes(32).toString('hex'); state.tokens.push({ id: id(), name: 'MausBot read-only', hash: hash(t), scopes: ['read'], createdAt: now() }); save(); return json(res, 201, { token: t, scopes: ['read'] }, origin); }
  if (parts[2] === 'events' && req.method === 'GET') { if (!auth(req)) return json(res, 401, { error: 'unauthorized' }, origin); res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'access-control-allow-origin': origin }); res.write(': connected\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return; }
  if (parts[2] === 'route' && req.method === 'POST') { if (!auth(req, 'route')) return json(res, 401, { error: 'unauthorized' }, origin); const b = await body(req); const k = selectKey(b.model); if (!k) return json(res, 503, { error: 'no_available_key' }, origin); active.set(k.id, { alias: k.alias, provider: k.provider, model: b.model, startedAt: now(), tokensStreaming: 0 }); emit('key.active', active.get(k.id)); res.setHeader('content-type', b.stream ? 'text/event-stream' : 'application/json'); return proxy(req, res, k, b); }
  if (!auth(req)) return json(res, 401, { error: 'unauthorized' }, origin);
  if (parts[2] === 'status' && req.method === 'GET') return json(res, 200, { setupComplete: state.setupComplete, keys: state.keys.length, enabledKeys: state.keys.filter((k) => k.enabled !== false).length, requests: state.requests.length }, origin);
  if (parts[2] === 'keys' && parts[3] === 'active' && req.method === 'GET') return json(res, 200, [...active.values()][0] || null, origin);
  if (parts[2] === 'keys' && req.method === 'GET') return json(res, 200, state.keys.map(publicKey), origin);
  if (parts[2] === 'keys' && req.method === 'POST') { if (!auth(req, 'manage')) return json(res, 403, { error: 'forbidden' }, origin); const b = await body(req); if (!b.alias || !b.secret || !b.baseUrl) return json(res, 400, { error: 'alias_secret_baseUrl_required' }, origin); const k = { id: id(), alias: b.alias, provider: b.provider || 'custom', secret: b.secret, baseUrl: b.baseUrl, model: b.model || null, enabled: true, priority: Number(b.priority || 0), requestsToday: 0, tokensToday: 0, failures: 0, cooldownUntil: 0, createdAt: now(), ...b }; state.keys.push(k); save(); emit('key.updated', publicKey(k)); return json(res, 201, publicKey(k), origin); }
  if (parts[2] === 'usage' && req.method === 'GET') { const from = Date.parse(url.searchParams.get('from') || '1970-01-01'); const to = Date.parse(url.searchParams.get('to') || now()); const rows = state.requests.filter((r) => Date.parse(r.timestamp) >= from && Date.parse(r.timestamp) <= to); return json(res, 200, { totalRequests: rows.length, tokensIn: rows.reduce((n, r) => n + r.tokensIn, 0), tokensOut: rows.reduce((n, r) => n + r.tokensOut, 0), estimatedCostUsd: rows.reduce((n, r) => n + r.estimatedCostUsd, 0), rows }, origin); }
  if (parts[2] === 'combos' && req.method === 'GET') return json(res, 200, state.combos, origin);
  return json(res, 404, { error: 'not_found' }, origin);
}
http.createServer((req, res) => handler(req, res).catch((e) => json(res, 500, { error: e.message || 'internal_error' }, corsOrigins[0]))).listen(PORT, HOST, () => console.log(`TokenDeck listening on http://${HOST}:${PORT}`));
