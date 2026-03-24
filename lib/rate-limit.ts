import { createHash } from "crypto";
import { redis } from "@/lib/redis";

// Atomic Lua: INCR key, set EXPIRE on first write, return current count
const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local windowSecs = tonumber(ARGV[1])
local current = redis.call("INCR", key)
if current == 1 then
  redis.call("EXPIRE", key, windowSecs)
end
return current
`;

export async function checkRateLimit(
  ip: string
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? "5", 10);
  const windowMinutes = parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES ?? "60", 10);
  const windowSecs = windowMinutes * 60;

  const hash = createHash("sha256").update(ip).digest("hex");
  const key = `ratelimit:ip:${hash}`;

  const current = (await redis.eval(RATE_LIMIT_SCRIPT, 1, key, String(windowSecs))) as number;

  const allowed = current <= limit;
  const remaining = allowed ? limit - current : 0;

  return { allowed, remaining };
}
