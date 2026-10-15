/**
 * freePool.ts — agent-side client of the Laya Router.
 *
 * ARCHITECTURE RULE (product decision): models are reached ONLY through
 * routers — never by direct calls from inside agents. This module therefore
 * talks ONLY to the Laya Router gateway (http://127.0.0.1:20131), which
 * cascades across live router daemons + free backends and injects skills.
 *
 * All failures are thrown (never swallowed) so tasks report `failed`
 * honestly instead of fake-`completed`.
 */

export interface FreeChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface FreeChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  retries?: number;
  skillRepo?: string;
  skillPath?: string;
}

const ROUTER_URL =
  process.env.LAYA_ROUTER_URL || 'http://127.0.0.1:20131/v1/chat/completions';

/**
 * Chat via the Laya Router. The router owns cascade + quota backoff + skill
 * injection; this client only retries router-level (502) failures briefly.
 */
export async function freeChat(
  messages: FreeChatMessage[],
  options: FreeChatOptions = {}
): Promise<{ content: string; provider: string }> {
  const body: any = {
    model: options.model ?? 'laya-auto',
    messages,
    max_tokens: options.maxTokens ?? 3500,
    temperature: options.temperature ?? 0.3,
  };
  if (options.skillRepo && options.skillPath) {
    body.extra = { skillRepo: options.skillRepo, skillPath: options.skillPath };
  }
  const timeoutMs = options.timeoutMs ?? 420000;
  const retries = options.retries ?? 1;
  let lastErr: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(ROUTER_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(`laya-router HTTP ${res.status}: ${(data?.error || '').slice(0, 300)}`);
      }
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.length === 0) {
        throw new Error('laya-router returned empty content');
      }
      const backend = data?._laya?.backend || 'laya-router';
      const skill = data?._laya?.skillInjected ? '+skill' : '';
      return { content, provider: `laya-router(${backend}${skill})` };
    } catch (err: any) {
      lastErr = err?.name === 'AbortError' ? new Error(`laya-router timeout after ${timeoutMs}ms`) : err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 15000 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`laya-router failed after ${retries + 1} attempts: ${lastErr?.message || lastErr}`);
}

/** Human-readable label for task summaries. */
export function freePoolLabel(): string {
  return 'Laya Router (models via routers + skill, keyless)';
}
