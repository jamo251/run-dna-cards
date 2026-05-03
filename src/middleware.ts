import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value == null || value === "") return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const WINDOW_MS = parsePositiveInt(
  process.env.RATE_LIMIT_WINDOW_MS,
  60_000,
);
const MAX_REQUESTS = parsePositiveInt(process.env.RATE_LIMIT_MAX_REQUESTS, 30);

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function pruneBuckets(now: number): void {
  if (buckets.size < 2000) return;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt + WINDOW_MS) {
      buckets.delete(key);
    }
  }
  if (buckets.size > 8000) {
    buckets.clear();
  }
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return (
    first ??
    request.headers.get("x-real-ip") ??
    // `@vercel/functions` request.ip not available in middleware typings
    "unknown"
  );
}

function allowRateLimit(ip: string, now: number): boolean {
  pruneBuckets(now);
  let bucket = buckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(ip, bucket);
    return true;
  }
  if (bucket.count >= MAX_REQUESTS) {
    return false;
  }
  bucket.count += 1;
  return true;
}

export function middleware(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.next();
  }

  const ip = clientIp(request);
  const now = Date.now();
  if (!allowRateLimit(ip, now)) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(WINDOW_MS / 1000).toString(),
        },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/generate-card",
};
