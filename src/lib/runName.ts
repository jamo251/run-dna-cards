import type { RunType } from "@/lib/classifier";

const GENERIC_NAMES = new Set([
  "export",
  "activity",
  "track",
  "run",
  "untitled",
  "garmin export",
  "strava export",
  "running",
  "course",
  "workout",
]);

function stripGpxExtension(filename: string): string {
  return filename.replace(/\.gpx$/i, "");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter((word) => word.length > 0)
    .map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
}

function isGeneric(value: string): boolean {
  if (value.length === 0) return true;
  if (/^\d+$/.test(value)) return true;
  return GENERIC_NAMES.has(value.toLowerCase());
}

function timeOfDay(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour <= 11) return "Morning";
  if (hour >= 12 && hour <= 16) return "Afternoon";
  if (hour >= 17 && hour <= 20) return "Evening";
  return "Night";
}

export function deriveRunName(filename: string, runType: RunType): string {
  const stripped = stripGpxExtension(filename);
  const cleaned = normalizeWhitespace(stripped);
  const titled = titleCase(cleaned);

  if (isGeneric(titled)) {
    return `${timeOfDay(new Date())} ${runType}`;
  }

  return titled;
}
