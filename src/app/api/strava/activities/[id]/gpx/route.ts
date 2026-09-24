import type { NextRequest } from "next/server";
import type { StravaActivity } from "@/lib/strava/activities";
import { isRunningActivity } from "@/lib/strava/activities";
import {
  jsonError,
  StravaApiError,
  stravaFetch,
} from "@/lib/strava/client";
import { normalizeStreams, streamsToGpx } from "@/lib/strava/streamsToGpx";

export const runtime = "nodejs";

const STREAM_KEYS = "latlng,altitude,time,heartrate";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!/^\d+$/.test(id)) {
      return Response.json({ error: "Invalid activity id." }, { status: 400 });
    }

    const [activityResponse, streamsResponse] = await Promise.all([
      stravaFetch(`/activities/${id}`),
      stravaFetch(
        `/activities/${id}/streams?keys=${STREAM_KEYS}&key_by_type=true`
      ),
    ]);

    if (activityResponse.status === 404 || streamsResponse.status === 404) {
      throw new StravaApiError("Activity not found.", 404);
    }
    if (!activityResponse.ok) {
      throw new StravaApiError(
        "Could not load the Strava activity.",
        activityResponse.status
      );
    }
    if (!streamsResponse.ok) {
      throw new StravaApiError(
        "Could not load the activity GPS track.",
        streamsResponse.status
      );
    }

    const activity = (await activityResponse.json()) as StravaActivity;
    if (!isRunningActivity(activity)) {
      throw new StravaApiError(
        "Only GPS running activities can be imported.",
        422
      );
    }

    const streams = normalizeStreams(await streamsResponse.json());
    const gpx = streamsToGpx(streams, {
      name: activity.name || "Strava export",
      startDate: activity.start_date,
    });

    return new Response(gpx, {
      status: 200,
      headers: {
        "Content-Type": "application/gpx+xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
