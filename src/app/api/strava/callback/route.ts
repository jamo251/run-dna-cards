import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { exchangeAuthorizationCode } from "@/lib/strava/client";
import { requestOrigin } from "@/lib/strava/config";
import { clearOAuthState, readOAuthState } from "@/lib/strava/cookies";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);
  const params = request.nextUrl.searchParams;
  const error = params.get("error");
  const code = params.get("code");
  const state = params.get("state");

  if (error === "access_denied") {
    await clearOAuthState();
    return NextResponse.redirect(new URL("/?strava=denied", origin));
  }

  const expectedState = await readOAuthState();
  await clearOAuthState();

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/?strava=error", origin));
  }

  try {
    await exchangeAuthorizationCode(code);
    return NextResponse.redirect(new URL("/?strava=connected", origin));
  } catch {
    return NextResponse.redirect(new URL("/?strava=error", origin));
  }
}
