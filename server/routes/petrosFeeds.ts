/**
 * Zero-cost domain feed gateway.
 *
 * The swarm's specialists never call third-party APIs directly from the browser
 * when the upstream forbids it (Nominatim blocks browser UA strings) or when the
 * response is large enough to matter. This router applies the published quota of
 * each feed through QuotaGuard, sets the mandatory User-Agent, caches politely,
 * and normalises failures so agents can reason about them.
 */

import { Router, type Request, type Response } from 'express';
import { getFeedSpec } from '../../src/data/petrosBlueprint';
import { QuotaGuard, QuotaExceededError } from '../../src/services/ai/quotaGuard';

const router = Router();
const guard = new QuotaGuard();

/** Every call PETROS makes identifies itself; several upstreams block default agents. */
const USER_AGENT = 'PETROS-City/4.0 (+https://github.com/pedrammokarrami/Petros--code--agent; agent-swarm)';

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;

interface CacheEntry {
  expiresAt: number;
  status: number;
  body: unknown;
}
const cache = new Map<string, CacheEntry>();

function cacheKey(url: string, body?: string): string {
  return body ? `${url}::${body}` : url;
}

function cached(key: string): CacheEntry | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit;
}

function remember(key: string, status: number, body: unknown): void {
  if (status >= 400) return;
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, status, body });
  if (cache.size > 300) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

async function fetchUpstream(
  url: string,
  init: RequestInit = {},
): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    const text = await res.text();
    if (text.length > MAX_BODY_BYTES) {
      return { status: 502, body: { error: 'Upstream payload exceeded PETROS byte budget' } };
    }
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* keep raw text (Overpass and some APIs answer with XML/HTML on error) */
    }
    return { status: res.status, body: parsed };
  } finally {
    clearTimeout(timer);
  }
}

interface ProxyOptions {
  feedId: string;
  url: string;
  init?: RequestInit;
  /** POST body participating in the cache key. */
  cacheBody?: string;
}

async function proxy(res: Response, options: ProxyOptions): Promise<void> {
  const spec = getFeedSpec(options.feedId);
  if (!spec) {
    res.status(500).json({ success: false, error: `Unknown feed: ${options.feedId}` });
    return;
  }
  const key = cacheKey(options.url, options.cacheBody);
  const hit = cached(key);
  if (hit) {
    res.status(hit.status).json({ success: true, cached: true, feed: spec.id, data: hit.body });
    return;
  }

  try {
    await guard.acquire(spec.id);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      res.status(429).json({
        success: false,
        feed: spec.id,
        error: err.message,
        retryAfterMs: err.retryAfterMs,
      });
      return;
    }
    throw err;
  }

  try {
    const { status, body } = await fetchUpstream(options.url, options.init);
    if (status >= 200 && status < 300) remember(key, status, body);
    res.status(status).json({
      success: status >= 200 && status < 300,
      cached: false,
      feed: spec.id,
      quota: guard.status(spec.id),
      data: body,
    });
  } catch (err: any) {
    const aborted = err?.name === 'AbortError';
    res.status(aborted ? 504 : 502).json({
      success: false,
      feed: spec.id,
      error: aborted ? 'Upstream timed out' : err?.message || 'Upstream request failed',
    });
  }
}

function requireQuery(req: Request, res: Response, name: string): string | null {
  const value = String(req.query[name] ?? '').trim();
  if (!value) {
    res.status(400).json({ success: false, error: `Missing required query parameter: ${name}` });
    return null;
  }
  return value;
}

// ── Catalog & telemetry ────────────────────────────────────────────────────────

router.get('/feeds/catalog', (_req: Request, res: Response) => {
  res.json({
    success: true,
    userAgent: USER_AGENT,
    cacheTtlMs: CACHE_TTL_MS,
    quota: guard.snapshot(),
  });
});

router.get('/feeds/status', (_req: Request, res: Response) => {
  res.json({ success: true, quota: guard.snapshot() });
});

// ── Software & Technology ─────────────────────────────────────────────────────

router.get('/feeds/github/repos', async (req, res) => {
  const q = requireQuery(req, res, 'q');
  if (!q) return;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=12&sort=stars`;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  await proxy(res, {
    feedId: 'github',
    url,
    init: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  });
});

// ── Medical & Healthcare ──────────────────────────────────────────────────────

router.get('/feeds/openfda/drug-events', async (req, res) => {
  const search = String(req.query.search ?? 'patient.reaction.reactionmeddrapt:"nausea"').trim();
  await proxy(res, {
    feedId: 'openfda',
    url: `https://api.fda.gov/drug/event.json?search=${encodeURIComponent(search)}&limit=10`,
  });
});

router.get('/feeds/clinical-trials', async (req, res) => {
  const query = String(req.query.query ?? '').trim();
  const pageSize = Math.min(Number(req.query.pageSize ?? 10) || 10, 50);
  await proxy(res, {
    feedId: 'clinicalTrials',
    url: `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(query)}&pageSize=${pageSize}&format=json`,
  });
});

// ── Bio-Lab ───────────────────────────────────────────────────────────────────

router.get('/feeds/pubchem/compound/:name', async (req, res) => {
  const name = String(req.params.name ?? '').trim();
  if (!name) {
    res.status(400).json({ success: false, error: 'Missing compound name' });
    return;
  }
  await proxy(res, {
    feedId: 'pubchem',
    url: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(
      name,
    )}/property/MolecularFormula,MolecularWeight/JSON`,
  });
});

// ── Agriculture & Energy ──────────────────────────────────────────────────────

router.get('/feeds/weather', async (req, res) => {
  const lat = Number(req.query.lat ?? 35.6892);
  const lon = Number(req.query.lon ?? 51.389);
  await proxy(res, {
    feedId: 'openMeteo',
    url: `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,shortwave_radiation`,
  });
});

/** Overpass requires explicit timeouts/memory caps, otherwise it answers with HTML. */
router.post('/feeds/overpass', async (req, res) => {
  const query = String((req.body && req.body.query) ?? '').trim();
  if (!query) {
    res.status(400).json({ success: false, error: 'Missing Overpass QL in body.query' });
    return;
  }
  if (/\[\s*(out|timeout|maxsize)\s*:/i.test(query)) {
    res.status(400).json({
      success: false,
      error: 'Do not set [out:]/[timeout:]/[maxsize:] — PETROS injects safe limits',
    });
    return;
  }
  if (query.length > 4000) {
    res.status(400).json({ success: false, error: 'Overpass query too long (max 4000 chars)' });
    return;
  }
  const governed = `[out:json][timeout:180][maxsize:536870912];${query}`;
  await proxy(res, {
    feedId: 'overpass',
    url: 'https://overpass-api.de/api/interpreter',
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: governed }).toString(),
    },
    cacheBody: governed,
  });
});

// ── Commerce & Logistics ──────────────────────────────────────────────────────

router.get('/feeds/geocode', async (req, res) => {
  const q = requireQuery(req, res, 'q');
  if (!q) return;
  await proxy(res, {
    feedId: 'nominatim',
    url: `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=5`,
  });
});

// ── Finance ───────────────────────────────────────────────────────────────────

router.get('/feeds/fx', async (req, res) => {
  const base = String(req.query.base ?? 'EUR').toUpperCase().slice(0, 3);
  await proxy(res, { feedId: 'frankfurter', url: `https://api.frankfurter.app/latest?from=${base}` });
});

router.get('/feeds/crypto', async (req, res) => {
  const ids = String(req.query.ids ?? 'bitcoin,ethereum').slice(0, 200);
  await proxy(res, {
    feedId: 'coinGecko',
    url: `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true`,
  });
});

// ── Education ─────────────────────────────────────────────────────────────────

router.get('/feeds/wikipedia', async (req, res) => {
  const title = requireQuery(req, res, 'title');
  if (!title) return;
  await proxy(res, {
    feedId: 'wikipedia',
    url: `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
  });
});

router.get('/feeds/arxiv', async (req, res) => {
  const search = requireQuery(req, res, 'search');
  if (!search) return;
  await proxy(res, {
    feedId: 'arxiv',
    url: `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(search)}&max_results=5`,
  });
});

// ── AI & Robotics ─────────────────────────────────────────────────────────────

router.get('/feeds/hf/models', async (req, res) => {
  const search = String(req.query.search ?? 'llama').slice(0, 80);
  const token = process.env.HF_TOKEN;
  await proxy(res, {
    feedId: 'hfHub',
    url: `https://huggingface.co/api/models?search=${encodeURIComponent(search)}&limit=8&sort=downloads&direction=-1`,
    init: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  });
});

// ── Entertainment ─────────────────────────────────────────────────────────────

router.get('/feeds/unsplash', async (req, res) => {
  const query = String(req.query.query ?? 'studio').slice(0, 60);
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    res.status(501).json({
      success: false,
      feed: 'unsplash',
      error: 'UNSPLASH_ACCESS_KEY is not configured; storyboard agents fall back to procedural stills',
    });
    return;
  }
  await proxy(res, {
    feedId: 'unsplash',
    url: `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=8`,
    init: { headers: { Authorization: `Client-ID ${key}` } },
  });
});

export default router;
