import { describe, it, expect, vi } from "vitest";
import RedisMock from "ioredis-mock";

// Mock ioredis with the in-memory mock so no real TCP connection is attempted
vi.mock("ioredis", () => ({ default: RedisMock }));

describe("redis singleton", () => {
  it("exports a redis client with expected methods", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const { redis } = await import("@/lib/redis");
    expect(redis).toBeDefined();
    expect(typeof redis.get).toBe("function");
    expect(typeof redis.set).toBe("function");
    expect(typeof redis.eval).toBe("function");
  });
});
