import {
  getStravaAppConfig,
  STRAVA_API_BASE,
  STRAVA_DEAUTHORIZE_URL,
  STRAVA_TOKEN_URL,
} from "@/lib/strava/config";
import {
  clearStravaTokens,
  isAccessTokenExpired,
  readStravaTokens,
  writeStravaTokens,
  type StravaTokens,
} from "@/lib/strava/cookies";

export class StravaAuthError extends Error {
  status = 401;
  constructor(message = "Not connected to Strava.") {
    super(message);
    this.name = "StravaAuthError";
  }
}

export class StravaApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "StravaApiError";
    this.status = status;
  }
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
};

function parseTokenResponse(data: TokenResponse): {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  expiresIn?: number;
} {
  if (
    typeof data.access_token !== "string" ||
    typeof data.refresh_token !== "string" ||
    typeof data.expires_at !== "number"
  ) {
    throw new StravaAuthError("Strava token response was incomplete.");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    expiresIn:
      typeof data.expires_in === "number" && data.expires_in > 0
        ? data.expires_in
        : undefined,
  };
}

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new StravaAuthError("Could not complete the Strava authorization.");
  }
  return (await response.json()) as TokenResponse;
}

export async function exchangeAuthorizationCode(code: string): Promise<void> {
  const config = getStravaAppConfig();
  if (!config) {
    throw new StravaAuthError("Strava is not configured.");
  }

  const data = await postToken(
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
    })
  );
  await writeStravaTokens(parseTokenResponse(data));
}

async function refreshAccessToken(refreshToken: string): Promise<StravaTokens> {
  const config = getStravaAppConfig();
  if (!config) {
    throw new StravaAuthError("Strava is not configured.");
  }

  const data = await postToken(
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    })
  );
  const tokens = parseTokenResponse(data);
  await writeStravaTokens(tokens);
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
  };
}

export async function ensureAccessToken(): Promise<string> {
  let tokens = await readStravaTokens();
  if (!tokens.accessToken && !tokens.refreshToken) {
    throw new StravaAuthError();
  }

  if (
    (isAccessTokenExpired(tokens.expiresAt) || !tokens.accessToken) &&
    tokens.refreshToken
  ) {
    tokens = await refreshAccessToken(tokens.refreshToken);
  }

  if (!tokens.accessToken) {
    await clearStravaTokens();
    throw new StravaAuthError();
  }

  return tokens.accessToken;
}

export async function getStravaConnectionStatus(): Promise<boolean> {
  const tokens = await readStravaTokens();
  if (!tokens.accessToken && !tokens.refreshToken) return false;

  try {
    await ensureAccessToken();
    return true;
  } catch {
    await clearStravaTokens();
    return false;
  }
}

export async function stravaFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  let accessToken = await ensureAccessToken();

  const request = (token: string) =>
    fetch(`${STRAVA_API_BASE}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });

  let response = await request(accessToken);
  if (response.status === 401) {
    const tokens = await readStravaTokens();
    if (!tokens.refreshToken) {
      await clearStravaTokens();
      throw new StravaAuthError();
    }
    const refreshed = await refreshAccessToken(tokens.refreshToken);
    if (!refreshed.accessToken) {
      await clearStravaTokens();
      throw new StravaAuthError();
    }
    accessToken = refreshed.accessToken;
    response = await request(accessToken);
  }

  return response;
}

export async function deauthorizeStrava(): Promise<void> {
  const tokens = await readStravaTokens();
  if (tokens.accessToken) {
    try {
      await fetch(STRAVA_DEAUTHORIZE_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        cache: "no-store",
      });
    } catch {
      // Still clear local cookies even if Strava is unreachable.
    }
  }
  await clearStravaTokens();
}

export function jsonError(error: unknown): Response {
  if (error instanceof StravaAuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof StravaApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json(
    { error: error instanceof Error ? error.message : "Unexpected Strava error." },
    { status: 500 }
  );
}
