import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const expected = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN?.trim();

  if (
    mode === "subscribe" &&
    expected &&
    token === expected &&
    challenge
  ) {
    return Response.json({ "hub.challenge": challenge });
  }

  return Response.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST() {
  return new Response(null, { status: 200 });
}
