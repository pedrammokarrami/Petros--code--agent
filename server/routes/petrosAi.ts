/**
 * Free-tier reasoning endpoint for the agent swarm.
 *
 * Gemini 2.0 Flash is the only frontier-class model with a usable permanent free
 * tier (15 RPM / 1M TPM / 1,500 RPD). The key never leaves the server, the daily
 * budget is counted locally so we degrade before Google 429s us, and every failure
 * is returned as a readable string so a room can keep working with live feeds only.
 */

import { Router, type Request, type Response } from 'express';
import { getFeedSpec } from '../../src/data/petrosBlueprint';
import { QuotaGuard, QuotaExceededError } from '../../src/services/ai/quotaGuard';

const router = Router();
const guard = new QuotaGuard();

const MODEL = 'gemini-2.0-flash';
const DAILY_LIMIT = 1500;
const MAX_PROMPT_CHARS = 24_000;
const REQUEST_TIMEOUT_MS = 45_000;

let dailyCount = 0;
let dailyResetAt = nextUtcMidnight();

function nextUtcMidnight(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
}

function rollDailyWindow(): void {
  if (Date.now() >= dailyResetAt) {
    dailyCount = 0;
    dailyResetAt = nextUtcMidnight();
  }
}

function apiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
}

router.get('/status', (_req: Request, res: Response) => {
  rollDailyWindow();
  const spec = getFeedSpec('gemini');
  res.json({
    success: true,
    model: MODEL,
    configured: Boolean(apiKey()),
    daily: { used: dailyCount, limit: DAILY_LIMIT, resetsAt: dailyResetAt },
    minuteQuota: spec ? guard.status('gemini') : null,
  });
});

router.post('/reason', async (req: Request, res: Response) => {
  rollDailyWindow();
  const prompt = String((req.body && req.body.prompt) ?? '').trim();
  const system = String((req.body && req.body.system) ?? '').trim().slice(0, 2000);

  if (!prompt) {
    res.status(400).json({ success: false, error: 'Body must include a non-empty prompt' });
    return;
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    res.status(413).json({
      success: false,
      error: `Prompt too long (${prompt.length} > ${MAX_PROMPT_CHARS} chars). Summarise or chunk it.`,
    });
    return;
  }

  const key = apiKey();
  if (!key) {
    res.status(501).json({
      success: false,
      error:
        'GEMINI_API_KEY is not configured. Add a free Google AI Studio key to unlock lead-agent reasoning; rooms stay usable with live feeds only.',
    });
    return;
  }

  if (dailyCount >= DAILY_LIMIT) {
    res.status(429).json({
      success: false,
      error: 'Daily free-tier budget exhausted (1,500 requests). Resets at 00:00 UTC.',
      resetAt: dailyResetAt,
    });
    return;
  }

  try {
    await guard.acquire('gemini');
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      res.status(429).json({ success: false, error: err.message, retryAfterMs: err.retryAfterMs });
      return;
    }
    throw err;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 1024 },
        }),
      },
    );

    const payload: any = await response.json().catch(() => null);
    if (!response.ok) {
      res.status(response.status === 429 ? 429 : 502).json({
        success: false,
        error: payload?.error?.message || `Gemini responded ${response.status}`,
        retryAfterMs: response.status === 429 ? 60_000 : undefined,
      });
      return;
    }

    dailyCount += 1;
    const parts = payload?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((part: any) => part?.text ?? '').join('').trim();

    res.json({
      success: Boolean(text),
      model: MODEL,
      text: text || '',
      error: text ? undefined : 'Model returned an empty candidate',
      quota: { used: dailyCount, limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - dailyCount) },
      minuteQuota: guard.status('gemini'),
    });
  } catch (err: any) {
    const aborted = err?.name === 'AbortError';
    res.status(aborted ? 504 : 502).json({
      success: false,
      error: aborted ? 'Gemini request timed out' : err?.message || 'Gemini request failed',
    });
  } finally {
    clearTimeout(timer);
  }
});

export default router;
