import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SlidingWindowRateLimiter } from "./rateLimit";

describe("SlidingWindowRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to the limit within the window", () => {
    const limiter = new SlidingWindowRateLimiter({ max: 5, windowMs: 60_000 });
    for (let i = 0; i < 5; i++) {
      expect(limiter.check("a@example.com")).toBe(true);
    }
  });

  it("blocks the (max+1)-th request inside the window", () => {
    const limiter = new SlidingWindowRateLimiter({ max: 5, windowMs: 60_000 });
    for (let i = 0; i < 5; i++) limiter.check("a@example.com");
    expect(limiter.check("a@example.com")).toBe(false);
  });

  it("isolates keys", () => {
    const limiter = new SlidingWindowRateLimiter({ max: 2, windowMs: 60_000 });
    expect(limiter.check("a@example.com")).toBe(true);
    expect(limiter.check("a@example.com")).toBe(true);
    expect(limiter.check("a@example.com")).toBe(false);
    expect(limiter.check("b@example.com")).toBe(true);
  });

  it("expires entries past the window", () => {
    const limiter = new SlidingWindowRateLimiter({ max: 1, windowMs: 60_000 });
    expect(limiter.check("a@example.com")).toBe(true);
    expect(limiter.check("a@example.com")).toBe(false);
    vi.advanceTimersByTime(60_001);
    expect(limiter.check("a@example.com")).toBe(true);
  });
});
