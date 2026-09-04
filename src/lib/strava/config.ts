import type { NextRequest } from "next/server";

export const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
export const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
export const STRAVA_DEAUTHORIZE_URL = "https://www.strava.com/oauth/deauthorize";
export const STRAVA_API_BASE = "https://www.strava.com/api/v3";
export const STRAVA_ACTIVITY_SCOPE = "activity:read_all";

export const COOKIE_ACCESS = "strava_access_token";
export const COOKIE_REFRESH = "strava_refresh_token";
export const COOKIE_EXPIRES_AT = "strava_expires_at";
export const COOKIE_OAUTH_STATE = "strava_oauth_state";

export const ACCESS_TOKEN_MAX_AGE_SEC = 6 * 60 * 60;
export const REFRESH_TOKEN_MAX_AGE_SEC = 180 * 24 * 60 * 60;
export const OAUTH_STATE_MAX_AGE_SEC = 10 * 60;

export type StravaAppConfig = {
  clientId: string;
  clientSecret: string;
};

export function getStravaAppConfig(): StravaAppConfig | null {
  const clientId = process.env.STRAVA_CLIENT_ID?.trim();
  const clientSecret = process.env.STRAVA_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function isStravaConfigured(): boolean {
  return getStravaAppConfig() != null;
}

export function requestOrigin(request: NextRequest): string {
  const proto =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;
  return `${proto}://${host}`;
}

export function getStravaRedirectUri(request: NextRequest): string {
  const configured = process.env.STRAVA_REDIRECT_URI?.trim();
  if (configured) return configured;
  return `${requestOrigin(request)}/api/strava/callback`;
}

export function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}
