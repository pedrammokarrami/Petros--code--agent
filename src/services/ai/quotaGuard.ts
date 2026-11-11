/**
 * Client-side quota guard for the zero-cost domain feeds.
 *
 * Every free API PETROS depends on enforces a different shape of limit
 * (requests/minute, requests/day, "2 concurrent slots", "1 req/s"). The guard
 * turns those rules into one queue so an agent swarm cannot get the platform
 * banned: callers await `acquire(feedId)` before every outbound request.
 *
 * It is deliberately dependency-free and works in both the browser and Node, so
 * the same policy is applied on the server proxies (see server/routes/petrosFeeds.ts).
 */

import { FEED_SPECS, type FeedSpec } from '../../data/petrosBlueprint';

export interface QuotaState {
  feedId: string;
  limit: number | null;
  windowMs: number;
  /** Calls already spent inside the current window. */
  used: number;
  /** How long a caller would have to wait right now. */
  waitMs: number;
  /** Epoch ms when the oldest call in the window ages out. */
  resetsAt: number;
}

type Clock = () => number;
type Sleep = (ms: number) => Promise<void>;

const defaultSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class QuotaExceededError extends Error {
  readonly feedId: string;
  readonly retryAfterMs: number;
  constructor(feedId: string, retryAfterMs: number) {
    super(`Quota exhausted for ${feedId}; retry in ${Math.ceil(retryAfterMs / 1000)}s`);
    this.name = 'QuotaExceededError';
    this.feedId = feedId;
    this.retryAfterMs = retryAfterMs;
  }
}

export class QuotaGuard {
  private readonly rules: Record<string, FeedSpec>;
  private readonly clock: Clock;
  private readonly sleep: Sleep;
  private readonly calls = new Map<string, number[]>();
  private readonly lastCall = new Map<string, number>();
  private readonly queues = new Map<string, Promise<void>>();

  constructor(specs: Record<string, FeedSpec> = FEED_SPECS, options: { clock?: Clock; sleep?: Sleep } = {}) {
    this.rules = specs;
    this.clock = options.clock ?? Date.now;
    this.sleep = options.sleep ?? defaultSleep;
  }

  private prune(feedId: string, windowMs: number, now: number): number[] {
    const stamps = this.calls.get(feedId) ?? [];
    const fresh = stamps.filter((stamp) => now - stamp < windowMs);
    this.calls.set(feedId, fresh);
    return fresh;
  }

  /** Non-blocking check — used by the UI to grey out a feed before a call. */
  status(feedId: string): QuotaState {
    const spec = this.rules[feedId];
    if (!spec) throw new Error(`Unknown feed: ${feedId}`);
    const now = this.clock();
    const { limit, windowMs, minIntervalMs } = spec.quota;
    const stamps = this.prune(feedId, windowMs, now);
    const spacingWait = minIntervalMs
      ? Math.max(0, (this.lastCall.get(feedId) ?? 0) + minIntervalMs - now)
      : 0;
    const windowWait =
      limit === null || stamps.length < limit ? 0 : Math.max(0, stamps[0] + windowMs - now);
    return {
      feedId,
      limit,
      windowMs,
      used: stamps.length,
      waitMs: Math.max(spacingWait, windowWait),
      resetsAt: stamps.length ? stamps[0] + windowMs : now,
    };
  }

  /** Throws instead of waiting — for UI paths that must answer immediately. */
  assertAvailable(feedId: string): void {
    const state = this.status(feedId);
    if (state.waitMs > 0) throw new QuotaExceededError(feedId, state.waitMs);
  }

  /**
   * Reserves one call slot, waiting (FIFO per feed) until the policy allows it.
   * Pass an AbortSignal to bail out of a long queue.
   */
  async acquire(feedId: string, signal?: AbortSignal): Promise<void> {
    const previous = this.queues.get(feedId) ?? Promise.resolve();
    const next = previous.then(async () => {
      let state = this.status(feedId);
      while (state.waitMs > 0) {
        if (signal?.aborted) throw new DOMException('Quota wait aborted', 'AbortError');
        await this.sleep(state.waitMs);
        state = this.status(feedId);
      }
      const now = this.clock();
      const stamps = this.calls.get(feedId) ?? [];
      stamps.push(now);
      this.calls.set(feedId, stamps);
      this.lastCall.set(feedId, now);
    });
    // Keep the chain alive even if this caller rejects.
    this.queues.set(feedId, next.catch(() => undefined));
    return next;
  }

  /** Wraps any async outbound call with the correct pacing. */
  async run<T>(feedId: string, task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    await this.acquire(feedId, signal);
    return task();
  }

  /** All feeds with their live counters, for the telemetry HUD. */
  snapshot(): QuotaState[] {
    return Object.keys(this.rules).map((feedId) => this.status(feedId));
  }

  reset(feedId?: string): void {
    if (feedId) {
      this.calls.delete(feedId);
      this.lastCall.delete(feedId);
      return;
    }
    this.calls.clear();
    this.lastCall.clear();
  }
}

/** Shared instance for the browser swarm. */
export const feedQuota = new QuotaGuard();

/** Backoff helper for upstream 429s that ignore our pacing. */
export function backoffMs(attempt: number, baseMs = 750, maxMs = 30_000): number {
  const exponential = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
  return Math.round(exponential * (0.75 + Math.random() * 0.5));
}
