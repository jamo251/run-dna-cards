export const RUNNING_SPORT_TYPES = new Set([
  "Run",
  "TrailRun",
  "VirtualRun",
]);

export type StravaActivity = {
  id: number;
  name: string;
  type?: string;
  sport_type?: string;
  start_date: string;
  distance: number;
  moving_time: number;
  map?: {
    summary_polyline?: string | null;
  } | null;
};

export type ImportableRun = {
  id: number;
  name: string;
  startDate: string;
  distanceKm: number;
  movingTimeMinutes: number;
};

export function activitySportType(activity: StravaActivity): string {
  return activity.sport_type || activity.type || "";
}

export function hasGpsTrack(activity: StravaActivity): boolean {
  const polyline = activity.map?.summary_polyline;
  return typeof polyline === "string" && polyline.length > 0;
}

export function isRunningActivity(activity: StravaActivity): boolean {
  const sport = activitySportType(activity);
  return RUNNING_SPORT_TYPES.has(sport) || activity.type === "Run";
}

export function isImportableRun(activity: StravaActivity): boolean {
  return isRunningActivity(activity) && hasGpsTrack(activity);
}

export function toImportableRun(activity: StravaActivity): ImportableRun {
  return {
    id: activity.id,
    name: activity.name,
    startDate: activity.start_date,
    distanceKm: activity.distance / 1000,
    movingTimeMinutes: activity.moving_time / 60,
  };
}

export function filterImportableRuns(
  activities: StravaActivity[]
): ImportableRun[] {
  return activities.filter(isImportableRun).map(toImportableRun);
}
