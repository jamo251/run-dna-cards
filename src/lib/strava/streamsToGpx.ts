export type StravaStream = {
  data?: unknown;
  type?: string;
};

export type StravaStreamSet = {
  latlng?: StravaStream;
  altitude?: StravaStream;
  time?: StravaStream;
  heartrate?: StravaStream;
};

export type StreamsToGpxOptions = {
  name: string;
  startDate: string;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function asNumberArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const numbers: number[] = [];
  for (const item of value) {
    if (typeof item !== "number" || !Number.isFinite(item)) return null;
    numbers.push(item);
  }
  return numbers;
}

function asLatLngArray(value: unknown): Array<[number, number]> | null {
  if (!Array.isArray(value)) return null;
  const points: Array<[number, number]> = [];
  for (const item of value) {
    if (!Array.isArray(item) || item.length < 2) return null;
    const lat = item[0];
    const lon = item[1];
    if (typeof lat !== "number" || typeof lon !== "number") return null;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    points.push([lat, lon]);
  }
  return points;
}

export function normalizeStreams(raw: unknown): StravaStreamSet {
  if (Array.isArray(raw)) {
    const set: StravaStreamSet = {};
    for (const stream of raw) {
      if (!stream || typeof stream !== "object") continue;
      const typed = stream as StravaStream;
      if (typed.type === "latlng") set.latlng = typed;
      if (typed.type === "altitude") set.altitude = typed;
      if (typed.type === "time") set.time = typed;
      if (typed.type === "heartrate") set.heartrate = typed;
    }
    return set;
  }

  if (raw && typeof raw === "object") {
    return raw as StravaStreamSet;
  }

  return {};
}

export function streamsToGpx(
  streams: StravaStreamSet,
  options: StreamsToGpxOptions
): string {
  const latlng = asLatLngArray(streams.latlng?.data);
  if (latlng == null || latlng.length < 2) {
    throw new Error("This activity has no GPS track.");
  }

  const altitude = asNumberArray(streams.altitude?.data);
  const time = asNumberArray(streams.time?.data);
  const heartrate = asNumberArray(streams.heartrate?.data);
  const startMs = Date.parse(options.startDate);
  const hasStart = Number.isFinite(startMs);

  const pointsXml = latlng
    .map(([lat, lon], index) => {
      const parts = [
        `      <trkpt lat="${lat}" lon="${lon}">`,
      ];

      const ele = altitude?.[index];
      if (ele != null) {
        parts.push(`        <ele>${ele}</ele>`);
      }

      const timeSec = time?.[index];
      if (hasStart && timeSec != null) {
        const iso = new Date(startMs + timeSec * 1000).toISOString();
        parts.push(`        <time>${iso}</time>`);
      }

      const hr = heartrate?.[index];
      if (hr != null) {
        parts.push("        <extensions>");
        parts.push(
          `          <gpxtpx:TrackPointExtension><gpxtpx:hr>${Math.round(hr)}</gpxtpx:hr></gpxtpx:TrackPointExtension>`
        );
        parts.push("        </extensions>");
      }

      parts.push("      </trkpt>");
      return parts.join("\n");
    })
    .join("\n");

  const name = escapeXml(options.name || "Strava export");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Run DNA Cards" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <trk>
    <name>${name}</name>
    <trkseg>
${pointsXml}
    </trkseg>
  </trk>
</gpx>
`;
}
