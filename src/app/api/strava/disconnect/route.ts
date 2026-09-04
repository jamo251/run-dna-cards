import { deauthorizeStrava, jsonError } from "@/lib/strava/client";

export const runtime = "nodejs";

export async function POST() {
  try {
    await deauthorizeStrava();
    return Response.json({ connected: false });
  } catch (error) {
    return jsonError(error);
  }
}
