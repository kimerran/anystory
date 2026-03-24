import { describe, it, expect, vi, beforeEach } from "vitest";
import RedisMock from "ioredis-mock";

const mockRedis = new RedisMock();

vi.mock("@/lib/redis", () => ({ redis: mockRedis }));

describe("checkRateLimit", () => {
  beforeEach(async () => {
    await mockRedis.flushall();
    process.env.RATE_LIMIT_MAX_REQUESTS = "3";
    process.env.RATE_LIMIT_WINDOW_MINUTES = "60";
  });

  it("allows the first request", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = await checkRateLimit("1.2.3.4");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("allows request at the limit", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    await checkRateLimit("1.2.3.4");
    await checkRateLimit("1.2.3.4");
    const result = await checkRateLimit("1.2.3.4");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("denies request over the limit", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    await checkRateLimit("1.2.3.4");
    await checkRateLimit("1.2.3.4");
    await checkRateLimit("1.2.3.4");
    const result = await checkRateLimit("1.2.3.4");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("different IPs have independent limits", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    await checkRateLimit("1.2.3.4");
    await checkRateLimit("1.2.3.4");
    await checkRateLimit("1.2.3.4");
    const result = await checkRateLimit("5.6.7.8");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });
});
