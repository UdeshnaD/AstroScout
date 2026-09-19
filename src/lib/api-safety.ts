import { createHash } from "node:crypto";
import { isIP } from "node:net";

const windowMs = 60000;
const counters = new Map<string, { count: number; expires: number }>();
let active = 0;

export function clientKey(request: Request) {
  // Only trust the forwarding header overwritten by Vercel's own proxy.
  const forwarded = process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for")?.trim()
    : undefined;
  const address = forwarded && isIP(forwarded) ? forwarded : "unidentified-client";
  return createHash("sha256").update(address).digest("hex");
}

export function localRateLimit(key: string, limit: number, now = Date.now()) {
  for (const [id, entry] of counters) {
    if (entry.expires <= now) counters.delete(id);
  }
  let entry = counters.get(key);
  if (!entry) {
    // Refuse new keys rather than allow attacker-controlled memory growth.
    if (counters.size >= 4096) return { allowed: false, retryAfter: 60 };
    entry = { count: 0, expires: now + windowMs };
    counters.set(key, entry);
  }
  entry.count++;
  return { allowed: entry.count <= limit, retryAfter: Math.max(1, Math.ceil((entry.expires - now) / 1000)) };
}

async function sharedRateLimit(key: string, limit: number) {
  const endpoint = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!endpoint && !token) return null;
  if (!endpoint || !token) throw new Error("Incomplete limiter configuration");
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".upstash.io") || url.username || url.password || url.search || url.hash)
    throw new Error("Invalid limiter endpoint");
  // Increment and expiry must be atomic, including simultaneous first requests.
  const script = "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end; return {n, redis.call('PTTL', KEYS[1])}";
  const namespace = createHash("sha256").update(process.env.VERCEL_PROJECT_ID || "space-interpreter").digest("hex").slice(0, 16);
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(["EVAL", script, "1", `space-interpreter:${namespace}:${process.env.VERCEL_ENV || "local"}:${key}`, String(windowMs)]),
    cache: "no-store",
    signal: AbortSignal.timeout(2000),
  });
  if (!response.ok) throw new Error("Limiter unavailable");
  const data = await response.json() as { result?: unknown };
  if (!Array.isArray(data.result) || data.result.length !== 2 || !data.result.every((value) => typeof value === "number" && Number.isFinite(value)) || data.result[0] < 1 || data.result[1] < 0)
    throw new Error("Invalid limiter response");
  return { allowed: data.result[0] <= limit, retryAfter: Math.max(1, Math.ceil(data.result[1] / 1000)) };
}

function unavailable(status: number, error: string, retryAfter?: number) {
  return Response.json({ error }, {
    status,
    headers: { "Cache-Control": "no-store", ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}) },
  });
}

export function withPublicApi(handler: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    if (request.url.length > 4096) return unavailable(414, "The request URL is too long.");
    if (request.method !== "GET") return unavailable(405, "Only GET requests are supported.");
    // A generous per-IP limit accommodates visitors sharing university Wi-Fi.
    const limit = 300;
    const key = clientKey(request);
    const local = localRateLimit(key, limit);
    if (!local.allowed) return unavailable(429, "Too many requests. Please wait before trying again.", local.retryAfter);
    if (active >= 8) return unavailable(503, "The observing service is busy. Please retry shortly.", 10);
    active++;
    try {
      let shared;
      try {
        shared = await sharedRateLimit(key, limit);
      } catch {
        // Do not bypass configured shared protection when its service fails.
        return unavailable(503, "Request protection is temporarily unavailable. Please retry shortly.", 10);
      }
      if (shared && !shared.allowed) return unavailable(429, "Too many requests. Please wait before trying again.", shared.retryAfter);
      const response = await handler(request);
      if (!response.headers.has("Cache-Control")) response.headers.set("Cache-Control", "no-store");
      response.headers.set("X-Content-Type-Options", "nosniff");
      return response;
    } catch {
      return unavailable(503, "The service is temporarily unavailable. Please retry shortly.", 10);
    } finally {
      active--;
    }
  };
}
