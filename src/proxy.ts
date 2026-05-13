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
    // `request.ip` not available on `NextRequest` typings in all setups
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

function contentSecurityPolicyValue(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = `'self' 'nonce-${nonce}' 'strict-dynamic'${
    isDev ? " 'unsafe-eval'" : ""
  }`;
  const styleSrc = isDev
    ? `'self' 'unsafe-inline'`
    : `'self' 'nonce-${nonce}'`;
  const cspHeader = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join("; ");
  return cspHeader.replace(/\s{2,}/g, " ").trim();
}

function passThroughWithCsp(request: NextRequest, nonce: string, csp: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cspHeader = contentSecurityPolicyValue(nonce);

  const isGenerateCard =
    request.nextUrl.pathname === "/api/generate-card" &&
    request.method === "POST";

  if (isGenerateCard) {
    const ip = clientIp(request);
    const now = Date.now();
    if (!allowRateLimit(ip, now)) {
      return NextResponse.json(
        { error: "Too many requests. Try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(WINDOW_MS / 1000).toString(),
            "Content-Security-Policy": cspHeader,
          },
        },
      );
    }
  }

  return passThroughWithCsp(request, nonce, cspHeader);
}

export const config = {
  matcher: [
    "/api/generate-card",
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
