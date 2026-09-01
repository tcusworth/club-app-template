/**
 * In-memory sliding-window rate limiter. Process-local; swap for Redis
 * (e.g. ioredis + ZSET) when cross-replica enforcement matters.
 */
export interface RateLimiterOptions {
  max: number;
  windowMs: number;
}

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();
  constructor(private readonly opts: RateLimiterOptions) {}

  check(key: string): boolean {
    const now = Date.now();
    const cutoff = now - this.opts.windowMs;
    const existing = this.hits.get(key) ?? [];
    const fresh = existing.filter(t => t > cutoff);
    if (fresh.length >= this.opts.max) {
      this.hits.set(key, fresh);
      return false;
    }
    fresh.push(now);
    this.hits.set(key, fresh);
    return true;
  }
}
