import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_MAX_AGE_SEC,
  COOKIE_ACCESS,
  COOKIE_EXPIRES_AT,
  COOKIE_OAUTH_STATE,
  COOKIE_REFRESH,
  OAUTH_STATE_MAX_AGE_SEC,
  REFRESH_TOKEN_MAX_AGE_SEC,
  cookieSecure,
} from "@/lib/strava/config";

export type StravaTokens = {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
};

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
  };
}

export async function readStravaTokens(): Promise<StravaTokens> {
  const store = await cookies();
  const expiresRaw = store.get(COOKIE_EXPIRES_AT)?.value;
  const expiresAt =
    expiresRaw != null && expiresRaw !== ""
      ? Number.parseInt(expiresRaw, 10)
      : null;

  return {
    accessToken: store.get(COOKIE_ACCESS)?.value ?? null,
    refreshToken: store.get(COOKIE_REFRESH)?.value ?? null,
    expiresAt: expiresAt != null && Number.isFinite(expiresAt) ? expiresAt : null,
  };
}

export async function writeStravaTokens(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  expiresIn?: number;
}): Promise<void> {
  const store = await cookies();
  const options = baseCookieOptions();
  const accessMaxAge =
    tokens.expiresIn != null && tokens.expiresIn > 0
      ? tokens.expiresIn
      : ACCESS_TOKEN_MAX_AGE_SEC;

  store.set(COOKIE_ACCESS, tokens.accessToken, {
    ...options,
    maxAge: accessMaxAge,
  });
  store.set(COOKIE_REFRESH, tokens.refreshToken, {
    ...options,
    maxAge: REFRESH_TOKEN_MAX_AGE_SEC,
  });
  store.set(COOKIE_EXPIRES_AT, String(tokens.expiresAt), {
    ...options,
    maxAge: accessMaxAge,
  });
}

export async function clearStravaTokens(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_ACCESS);
  store.delete(COOKIE_REFRESH);
  store.delete(COOKIE_EXPIRES_AT);
}

export async function writeOAuthState(state: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_OAUTH_STATE, state, {
    ...baseCookieOptions(),
    maxAge: OAUTH_STATE_MAX_AGE_SEC,
  });
}

export async function readOAuthState(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_OAUTH_STATE)?.value ?? null;
}

export async function clearOAuthState(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_OAUTH_STATE);
}

export function isAccessTokenExpired(
  expiresAt: number | null,
  nowSec: number = Math.floor(Date.now() / 1000)
): boolean {
  if (expiresAt == null) return true;
  return nowSec >= expiresAt - 60;
}
