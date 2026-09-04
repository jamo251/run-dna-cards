import { getStravaConnectionStatus, jsonError } from "@/lib/strava/client";
import { isStravaConfigured } from "@/lib/strava/config";

export const runtime = "nodejs";

export async function GET() {
  try {
    const configured = isStravaConfigured();
    const connected = configured ? await getStravaConnectionStatus() : false;
    return Response.json({ connected, configured });
  } catch (error) {
    return jsonError(error);
  }
}
