import {
  filterImportableRuns,
  type StravaActivity,
} from "@/lib/strava/activities";
import {
  jsonError,
  StravaApiError,
  stravaFetch,
} from "@/lib/strava/client";

export const runtime = "nodejs";

const PER_PAGE = 30;

export async function GET() {
  try {
    const response = await stravaFetch(
      `/athlete/activities?per_page=${PER_PAGE}`
    );
    if (!response.ok) {
      throw new StravaApiError(
        "Could not load Strava activities.",
        response.status
      );
    }

    const activities = (await response.json()) as StravaActivity[];
    if (!Array.isArray(activities)) {
      throw new StravaApiError("Unexpected Strava activities response.", 502);
    }

    return Response.json({ activities: filterImportableRuns(activities) });
  } catch (error) {
    return jsonError(error);
  }
}
