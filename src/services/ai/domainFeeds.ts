/**
 * Browser-side client for the zero-cost domain feed gateway.
 *
 * All calls go through `/api/petros/feeds/*` so the server can apply the real
 * quota, inject the mandatory User-Agent and cache politely. This module adds the
 * client half: a 429-aware retry with jittered backoff, and a uniform result shape
 * the room UI can render without try/catch sprawl.
 */

export interface FeedResult<T = unknown> {
  ok: boolean;
  feed: string;
  data?: T;
  error?: string;
  cached?: boolean;
  retryAfterMs?: number;
  attempts: number;
}

export interface FeedCallOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
  /** Total attempts including the first one. */
  maxAttempts?: number;
  timeoutMs?: number;
}

const GATEWAY = '/api/petros/feeds';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function backoff(attempt: number, baseMs = 800, maxMs = 20_000): number {
  const exponential = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
  return Math.round(exponential * (0.7 + Math.random() * 0.6));
}

export async function callFeed<T = unknown>(
  path: string,
  options: FeedCallOptions = {},
): Promise<FeedResult<T>> {
  const { method = 'GET', body, signal, maxAttempts = 3, timeoutMs = 25_000 } = options;
  let lastError = 'Feed request failed';

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${GATEWAY}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const payload = (await res.json().catch(() => null)) as
        | { success?: boolean; feed?: string; data?: T; error?: string; cached?: boolean; retryAfterMs?: number }
        | null;

      if (res.ok && payload?.success !== false) {
        return {
          ok: true,
          feed: payload?.feed ?? 'unknown',
          data: payload?.data as T,
          cached: payload?.cached,
          attempts: attempt,
        };
      }

      lastError = payload?.error ?? `HTTP ${res.status}`;
      const retryAfter = payload?.retryAfterMs ?? (res.status === 429 ? backoff(attempt) : 0);
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === maxAttempts) {
        return {
          ok: false,
          feed: payload?.feed ?? 'unknown',
          error: lastError,
          retryAfterMs: retryAfter,
          attempts: attempt,
        };
      }
      await sleep(Math.min(retryAfter, 15_000));
    } catch (err: any) {
      lastError = err?.name === 'AbortError' ? 'Request timed out' : err?.message ?? 'Network error';
      if (attempt === maxAttempts) break;
      await sleep(backoff(attempt));
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  return { ok: false, feed: 'unknown', error: lastError, attempts: maxAttempts };
}

/** One curated, low-cost probe per feed so each room can prove its data link live. */
export interface FeedProbe {
  feedId: string;
  label: string;
  path: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Condenses the upstream payload into one readable line for the room HUD. */
  summarise: (data: any) => string;
}

const first = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

export const FEED_PROBES: Record<string, FeedProbe> = {
  github: {
    feedId: 'github',
    label: 'Repository intelligence',
    path: '/github/repos?q=modelcontextprotocol',
    summarise: (d) =>
      d?.items?.length
        ? `${d.items.length} repos · top: ${first(d.items[0]?.full_name, 'n/a')} · ★${d.items[0]?.stargazers_count ?? 0}`
        : 'No repositories returned',
  },
  openfda: {
    feedId: 'openfda',
    label: 'Adverse drug events',
    path: '/openfda/drug-events?search=patient.reaction.reactionmeddrapt:%22nausea%22',
    summarise: (d) => `${d?.meta?.results?.total ?? 0} matching event reports`,
  },
  clinicalTrials: {
    feedId: 'clinicalTrials',
    label: 'Clinical trials',
    path: '/clinical-trials?query=cancer&pageSize=5',
    summarise: (d) => {
      const study = d?.studies?.[0]?.protocolSection?.identificationModule;
      return study ? `Top trial: ${first(study.briefTitle, study.nctId ?? 'n/a')}` : 'No trials returned';
    },
  },
  pubchem: {
    feedId: 'pubchem',
    label: 'Compound lookup',
    path: '/pubchem/compound/caffeine',
    summarise: (d) => {
      const prop = d?.PropertyTable?.Properties?.[0];
      return prop ? `${prop.MolecularFormula} · ${prop.MolecularWeight} g/mol` : 'No compound data';
    },
  },
  openMeteo: {
    feedId: 'openMeteo',
    label: 'Micro-climate',
    path: '/weather?lat=35.6892&lon=51.389',
    summarise: (d) =>
      d?.current
        ? `${d.current.temperature_2m}°C · ${d.current.relative_humidity_2m}% RH · ${d.current.shortwave_radiation} W/m²`
        : 'No weather sample',
  },
  overpass: {
    feedId: 'overpass',
    label: 'Building footprints',
    path: '/overpass',
    method: 'POST',
    body: { query: 'node["amenity"="charging_station"](35.60,51.30,35.78,51.48);out 5;' },
    summarise: (d) => `${d?.elements?.length ?? 0} OSM elements in the bbox`,
  },
  nominatim: {
    feedId: 'nominatim',
    label: 'Geocoding',
    path: '/geocode?q=Tehran%20warehouse',
    summarise: (d) => (Array.isArray(d) && d[0] ? `Resolved: ${first(d[0].display_name, 'n/a')}` : 'No match'),
  },
  frankfurter: {
    feedId: 'frankfurter',
    label: 'ECB FX rates',
    path: '/fx?base=EUR',
    summarise: (d) => {
      const usd = d?.rates?.USD;
      return usd ? `EUR→USD ${usd}` : 'No rate available';
    },
  },
  coinGecko: {
    feedId: 'coinGecko',
    label: 'Crypto quotes',
    path: '/crypto?ids=bitcoin,ethereum',
    summarise: (d) =>
      d?.bitcoin ? `BTC $${d.bitcoin.usd} · ETH $${d.ethereum?.usd ?? '—'}` : 'No quotes returned',
  },
  wikipedia: {
    feedId: 'wikipedia',
    label: 'Knowledge summary',
    path: '/wikipedia?title=Photovoltaics',
    summarise: (d) => first(d?.extract?.slice(0, 140), 'No summary'),
  },
  arxiv: {
    feedId: 'arxiv',
    label: 'Pre-prints',
    path: '/arxiv?search=multi-agent%20systems',
    summarise: (d) => (typeof d === 'string' ? `arXiv answered ${d.length} bytes of Atom XML` : 'No pre-print feed'),
  },
  hfHub: {
    feedId: 'hfHub',
    label: 'Model hub',
    path: '/hf/models?search=llama',
    summarise: (d) => (Array.isArray(d) && d[0] ? `Top model: ${first(d[0].id, 'n/a')}` : 'No models'),
  },
  unsplash: {
    feedId: 'unsplash',
    label: 'Storyboard stills',
    path: '/unsplash?query=studio',
    summarise: (d) => `${d?.total ?? 0} photos available`,
  },
};

export interface ReasoningResult {
  ok: boolean;
  text?: string;
  model?: string;
  error?: string;
  quota?: { used: number; limit: number; remaining: number };
}

/**
 * Free-tier reasoning. The server holds GEMINI_API_KEY; the browser never sees it.
 * When the daily free budget is gone the server answers 429 and we surface it as a
 * readable, non-fatal message so the room keeps working offline.
 */
export async function askFreeReasoning(
  prompt: string,
  options: { system?: string; signal?: AbortSignal } = {},
): Promise<ReasoningResult> {
  try {
    const res = await fetch('/api/petros/ai/reason', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, system: options.system }),
      signal: options.signal,
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) {
      return { ok: false, error: payload?.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, text: payload.text, model: payload.model, quota: payload.quota };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Reasoning request failed' };
  }
}
