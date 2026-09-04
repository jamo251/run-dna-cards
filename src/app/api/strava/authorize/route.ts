import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getStravaAppConfig,
  getStravaRedirectUri,
  requestOrigin,
  STRAVA_ACTIVITY_SCOPE,
  STRAVA_AUTHORIZE_URL,
} from "@/lib/strava/config";
import { writeOAuthState } from "@/lib/strava/cookies";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);
  const config = getStravaAppConfig();
  if (!config) {
    return NextResponse.redirect(new URL("/?strava=not-configured", origin));
  }

  const state = randomBytes(16).toString("hex");
  await writeOAuthState(state);

  const authorize = new URL(STRAVA_AUTHORIZE_URL);
  authorize.searchParams.set("client_id", config.clientId);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("redirect_uri", getStravaRedirectUri(request));
  authorize.searchParams.set("approval_prompt", "auto");
  authorize.searchParams.set("scope", STRAVA_ACTIVITY_SCOPE);
  authorize.searchParams.set("state", state);

  return NextResponse.redirect(authorize);
}
