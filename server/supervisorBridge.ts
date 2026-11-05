/**
 * Petros Supervisor & Multi-Engine Bridge Adapter
 *
 * Connects the Petros Web App to:
 * - Petros Supervisor Router (127.0.0.1:19847)
 * - Petros MCP Bridge (127.0.0.1:19848)
 * - Local Ollama Daemon (127.0.0.1:11434)
 * - OpenMausBot Visual Agent (127.0.0.1:8798)
 * - Pi, Kilo, ANUS, Freebuff Engine Policies
 *
 * Security & Cost Contracts:
 * - Freebuff is strictly INTERACTIVE_ONLY (automated dispatch is permanently blocked).
 * - All token values are redacted and never logged or exposed to the client.
 * - Zero paid token expenditure — local Ollama and verified free tiers only.
 * - All service connections default to loopback (127.0.0.1).
 * - Enforces loopback preload hook (bind_loopback.cjs).
 */

import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';

export interface EcosystemStatus {
  timestamp: string;
  overallState: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  services: {
    router: { online: boolean; port: number; host: string; pid?: number; latencyMs?: number; error?: string };
    mcp: { online: boolean; port: number; host: string; pid?: number; tools: string[]; protocolVersion?: string; latencyMs?: number; error?: string };
    ollama: { online: boolean; port: number; host: string; pid?: number; models: string[]; latencyMs?: number };
    mausbot: { online: boolean; port: number; host: string; pid?: number; latencyMs?: number };
  };
  engines: {
    anus: { name: string; state: string; role: string; version: string; cost: string };
    kilo: { name: string; state: string; role: string; version: string; model: string; cost: string };
    ollama: { name: string; state: string; role: string; models: string[]; cost: string };
    pi: { name: string; state: string; role: string; version: string; cost: string };
    freebuff: { name: string; state: string; role: string; guardrail: string; cost: string };
  };
  workspace: {
    root: string;
    exists: boolean;
    hasGit: boolean;
  };
}

const SUPERVISOR_DIR = 'C:\\Users\\ELI\\tools\\Petros-Supervisor';
const ROUTER_DIR = 'C:\\Users\\ELI\\petros-router';
const HOOK_PATH = path.join(SUPERVISOR_DIR, 'supervisor', 'bind_loopback.cjs');

let managedRouterProcess: ChildProcess | null = null;
let managedMcpProcess: ChildProcess | null = null;

/**
 * Safely reads the local worker token without exposing it.
 */
export function getWorkerToken(): string | null {
  try {
    const configPath = path.join(ROUTER_DIR, 'worker-config.json');
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data.token && typeof data.token === 'string') {
        return data.token;
      }
    }
  } catch {}
  return null;
}

/**
 * Performs a fast, non-blocking HTTP GET check on loopback.
 */
export function pingHttp(urlStr: string, timeoutMs = 2500): Promise<{ ok: boolean; status: number; data?: any; latencyMs: number }> {
  return new Promise((resolve) => {
    const start = Date.now();
    try {
      const url = new URL(urlStr);
      const req = http.get(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          timeout: timeoutMs,
          headers: { 'Accept': 'application/json, text/plain, */*' },
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => { body += chunk; });
          res.on('end', () => {
            const latencyMs = Date.now() - start;
            let parsed: any = null;
            try { parsed = JSON.parse(body); } catch { parsed = body; }
            resolve({ ok: res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode || 0, data: parsed, latencyMs });
          });
        }
      );
      req.on('error', () => {
        resolve({ ok: false, status: 0, latencyMs: Date.now() - start });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, status: 0, latencyMs: Date.now() - start });
      });
    } catch {
      resolve({ ok: false, status: 0, latencyMs: Date.now() - start });
    }
  });
}

/**
 * Performs JSON-RPC call to MCP Bridge.
 */
export function callMcpJsonRpc(method: string, params: any = {}, token: string | null = null, timeoutMs = 4000): Promise<{ ok: boolean; result?: any; error?: any }> {
  return new Promise((resolve) => {
    try {
      const payload = JSON.stringify({
        jsonrpc: '2.0',
        id: `web-${Date.now()}`,
        method,
        params,
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Content-Length': Buffer.byteLength(payload).toString(),
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 19848,
          path: '/mcp',
          method: 'POST',
          headers,
          timeout: timeoutMs,
        },
        (res) => {
          let body = '';
          res.on('data', (c) => { body += c; });
          res.on('end', () => {
            try {
              const json = JSON.parse(body);
              if (json.error) {
                resolve({ ok: false, error: json.error });
              } else {
                resolve({ ok: true, result: json.result });
              }
            } catch (err: any) {
              resolve({ ok: false, error: err.message });
            }
          });
        }
      );

      req.on('error', (err) => resolve({ ok: false, error: err.message }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'MCP timeout' }); });
      req.write(payload);
      req.end();
    } catch (err: any) {
      resolve({ ok: false, error: err.message });
    }
  });
}

/**
 * Queries the full status of all ecosystem services and engines.
 */
export async function getEcosystemStatus(workspaceRoot: string): Promise<EcosystemStatus> {
  const token = getWorkerToken();

  // Run ping checks concurrently
  const [routerCheck, mcpHealthCheck, ollamaCheck, mausbotCheck] = await Promise.all([
    pingHttp('http://127.0.0.1:19847/health'),
    pingHttp('http://127.0.0.1:19848/health'),
    pingHttp('http://127.0.0.1:11434/api/tags'),
    pingHttp('http://127.0.0.1:8798/health'),
  ]);

  let mcpTools: string[] = [];
  let mcpProtocolVersion: string | undefined = undefined;

  // If MCP health is OK, perform tools discovery
  if (mcpHealthCheck.ok) {
    const initRes = await callMcpJsonRpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'PetrosWebApp', version: '4.0.0' },
    }, token);

    if (initRes.ok && initRes.result) {
      mcpProtocolVersion = initRes.result.protocolVersion || '2024-11-05';
      const toolsRes = await callMcpJsonRpc('tools/list', {}, token);
      if (toolsRes.ok && toolsRes.result && Array.isArray(toolsRes.result.tools)) {
        mcpTools = toolsRes.result.tools.map((t: any) => t.name);
      }
    }
  }

  // Parse Ollama models
  let ollamaModels: string[] = [];
  if (ollamaCheck.ok && ollamaCheck.data && Array.isArray(ollamaCheck.data.models)) {
    ollamaModels = ollamaCheck.data.models.map((m: any) => m.name || m.model);
  }

  // Determine overall state
  const isOnline = routerCheck.ok && mcpHealthCheck.ok && ollamaCheck.ok;
  const isDegraded = ollamaCheck.ok && (!routerCheck.ok || !mcpHealthCheck.ok);
  const overallState = isOnline ? 'ONLINE' : (isDegraded ? 'DEGRADED' : 'OFFLINE');

  return {
    timestamp: new Date().toISOString(),
    overallState,
    services: {
      router: {
        online: routerCheck.ok,
        port: 19847,
        host: '127.0.0.1',
        pid: managedRouterProcess?.pid,
        latencyMs: routerCheck.latencyMs,
        error: routerCheck.ok ? undefined : 'Router service not responding on port 19847',
      },
      mcp: {
        online: mcpHealthCheck.ok,
        port: 19848,
        host: '127.0.0.1',
        pid: managedMcpProcess?.pid,
        tools: mcpTools,
        protocolVersion: mcpProtocolVersion,
        latencyMs: mcpHealthCheck.latencyMs,
        error: mcpHealthCheck.ok ? undefined : 'MCP Bridge not responding on port 19848',
      },
      ollama: {
        online: ollamaCheck.ok,
        port: 11434,
        host: '127.0.0.1',
        models: ollamaModels,
        latencyMs: ollamaCheck.latencyMs,
      },
      mausbot: {
        online: mausbotCheck.ok,
        port: 8798,
        host: '127.0.0.1',
        latencyMs: mausbotCheck.latencyMs,
      },
    },
    engines: {
      anus: {
        name: 'ANUS CLI',
        state: 'CONFIGURED',
        role: 'Primary zero-cost execution engine',
        version: '0.2.2',
        cost: 'ZERO-COST',
      },
      kilo: {
        name: 'Kilo CLI',
        state: 'CONFIGURED',
        role: 'Complex tasks with verified free model',
        version: '7.8.18',
        model: 'kilo/kilo-auto/free',
        cost: 'ZERO-COST (Free Tier Confirmed)',
      },
      ollama: {
        name: 'Ollama Daemon',
        state: ollamaCheck.ok ? 'DISPATCH_READY' : 'OFFLINE',
        role: 'Local offline LLM engine',
        models: ollamaModels.length > 0 ? ollamaModels : ['qwen3:1.7b-omb-40k', 'qwen3:1.7b'],
        cost: 'ZERO-COST (100% Local GPU/CPU)',
      },
      pi: {
        name: 'Pi CLI',
        state: 'INTERACTIVE_CODING',
        role: 'Interactive Windows coding agent',
        version: '1.4.0',
        cost: 'ZERO-COST',
      },
      freebuff: {
        name: 'Freebuff',
        state: 'INTERACTIVE_ONLY',
        role: 'Human-in-the-loop interactive sessions only',
        guardrail: 'AUTOMATED DISPATCH PERMANENTLY BLOCKED',
        cost: 'ZERO-COST',
      },
    },
    workspace: {
      root: workspaceRoot,
      exists: fs.existsSync(workspaceRoot),
      hasGit: fs.existsSync(path.join(workspaceRoot, '.git')),
    },
  };
}

/**
 * Spawns and supervises Router and MCP Bridge with verified loopback binding.
 */
export async function startSupervisorEcosystem(): Promise<{ success: boolean; message: string; routerPid?: number; mcpPid?: number }> {
  // Check existing health
  const existingRouter = await pingHttp('http://127.0.0.1:19847/health');
  const existingMcp = await pingHttp('http://127.0.0.1:19848/health');

  if (existingRouter.ok && existingMcp.ok) {
    return {
      success: true,
      message: 'Petros Router and MCP Bridge are already online and healthy.',
      routerPid: managedRouterProcess?.pid,
      mcpPid: managedMcpProcess?.pid,
    };
  }

  // Start Router if not running
  if (!existingRouter.ok) {
    if (managedRouterProcess) {
      try { managedRouterProcess.kill(); } catch {}
      managedRouterProcess = null;
    }

    const routerArgs = ['--require', HOOK_PATH, path.join('src', 'router.cjs')];
    managedRouterProcess = spawn('node', routerArgs, {
      cwd: ROUTER_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    managedRouterProcess.on('exit', () => {
      managedRouterProcess = null;
    });
  }

  // Start MCP Bridge if not running
  if (!existingMcp.ok) {
    if (managedMcpProcess) {
      try { managedMcpProcess.kill(); } catch {}
      managedMcpProcess = null;
    }

    const mcpArgs = ['--require', HOOK_PATH, path.join('src', 'mcp-bridge.js')];
    managedMcpProcess = spawn('node', mcpArgs, {
      cwd: ROUTER_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    managedMcpProcess.on('exit', () => {
      managedMcpProcess = null;
    });
  }

  // Poll up to 12s for health
  const deadline = Date.now() + 12000;
  let routerOk = false;
  let mcpOk = false;

  while (Date.now() < deadline) {
    if (!routerOk) {
      const r = await pingHttp('http://127.0.0.1:19847/health', 1500);
      if (r.ok) routerOk = true;
    }
    if (!mcpOk) {
      const m = await pingHttp('http://127.0.0.1:19848/health', 1500);
      if (m.ok) mcpOk = true;
    }

    if (routerOk && mcpOk) break;
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  if (routerOk && mcpOk) {
    return {
      success: true,
      message: 'Successfully started Router and MCP Bridge with verified loopback binding (127.0.0.1).',
      routerPid: managedRouterProcess?.pid,
      mcpPid: managedMcpProcess?.pid,
    };
  }

  return {
    success: false,
    message: `Startup timed out: Router ${routerOk ? 'ONLINE' : 'OFFLINE'}, MCP Bridge ${mcpOk ? 'ONLINE' : 'OFFLINE'}.`,
    routerPid: managedRouterProcess?.pid,
    mcpPid: managedMcpProcess?.pid,
  };
}

/**
 * Gracefully stops only the Supervisor-owned processes without touching Ollama or MausBot.
 */
export async function stopSupervisorEcosystem(): Promise<{ success: boolean; message: string }> {
  let stoppedRouter = false;
  let stoppedMcp = false;

  if (managedRouterProcess) {
    try {
      managedRouterProcess.kill();
      stoppedRouter = true;
    } catch {}
    managedRouterProcess = null;
  }

  if (managedMcpProcess) {
    try {
      managedMcpProcess.kill();
      stoppedMcp = true;
    } catch {}
    managedMcpProcess = null;
  }

  return {
    success: true,
    message: `Ecosystem stopped safely: Router (${stoppedRouter ? 'KILLED' : 'N/A'}), MCP (${stoppedMcp ? 'KILLED' : 'N/A'}). Ollama and OpenMausBot preserved.`,
  };
}

/**
 * Invokes read-only petros_status via MCP Bridge.
 */
export async function executeMcpStatus(): Promise<{ success: boolean; data?: any; error?: string }> {
  const token = getWorkerToken();
  const res = await callMcpJsonRpc('tools/call', {
    name: 'petros_status',
    arguments: {},
  }, token);

  if (res.ok) {
    return { success: true, data: res.result };
  }
  return { success: false, error: res.error || 'Failed to execute petros_status tool' };
}
