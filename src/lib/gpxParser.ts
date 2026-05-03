import { gpx } from "@tmcw/togeojson";
import {
  MAX_GPX_TRACKPOINTS,
  MAX_GPX_XML_CHARS,
} from "@/lib/gpxLimits";

type NullableNumber = number | null;

export type ParsedGpxStats = {
  totalDistanceKm: number;
  totalElevationGainM: number;
  averagePaceMinPerKm: NullableNumber;
  paceSplitsMinPerKm: number[];
  movingTimeMinutes: NullableNumber;
  heartRate: {
    average: NullableNumber;
    perTrackpoint: number[] | null;
  };
  coordinates: Array<[number, number]>;
};

type TrackPoint = {
  lat: number;
  lon: number;
  ele: NullableNumber;
  timeMs: NullableNumber;
  heartRate: NullableNumber;
};

const EARTH_RADIUS_M = 6371000;
const METERS_PER_KM = 1000;
const MS_PER_MINUTE = 60000;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

function parseNumber(value: string | null): NullableNumber {
  if (value == null) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTimeMs(value: string | null): NullableNumber {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function findTrackpointHeartRate(trackPointElement: Element): NullableNumber {
  const extensions = trackPointElement.getElementsByTagName("extensions")[0];
  if (!extensions) return null;

  const descendants = extensions.getElementsByTagName("*");
  for (const descendant of descendants) {
    if (descendant.localName?.toLowerCase() !== "hr") continue;
    return parseNumber(descendant.textContent?.trim() ?? null);
  }

  return null;
}

function countGeoJsonCoords(geoJson: ReturnType<typeof gpx>): number {
  let total = 0;
  for (const feature of geoJson.features) {
    const geometry = feature.geometry;
    if (!geometry) continue;

    if (geometry.type === "LineString") {
      total += geometry.coordinates.length;
      continue;
    }

    if (geometry.type === "MultiLineString") {
      for (const line of geometry.coordinates) {
        total += line.length;
      }
    }
  }
  return total;
}

function extractTrackPoints(xmlDocument: Document): TrackPoint[] {
  const trkptElements = Array.from(xmlDocument.getElementsByTagName("trkpt"));
  return trkptElements
    .map((trkpt) => {
      const lat = parseNumber(trkpt.getAttribute("lat"));
      const lon = parseNumber(trkpt.getAttribute("lon"));
      if (lat == null || lon == null) return null;

      const ele = parseNumber(
        trkpt.getElementsByTagName("ele")[0]?.textContent?.trim() ?? null
      );
      const timeMs = parseTimeMs(
        trkpt.getElementsByTagName("time")[0]?.textContent?.trim() ?? null
      );
      const heartRate = findTrackpointHeartRate(trkpt);

      return { lat, lon, ele, timeMs, heartRate };
    })
    .filter((point): point is TrackPoint => point !== null);
}

function flattenGeoJsonCoordinates(geoJson: ReturnType<typeof gpx>): Array<
  [number, number]
> {
  const coordinates: Array<[number, number]> = [];

  for (const feature of geoJson.features) {
    const geometry = feature.geometry;
    if (!geometry) continue;

    if (geometry.type === "LineString") {
      for (const point of geometry.coordinates) {
        coordinates.push([point[1], point[0]]);
      }
      continue;
    }

    if (geometry.type === "MultiLineString") {
      for (const line of geometry.coordinates) {
        for (const point of line) {
          coordinates.push([point[1], point[0]]);
        }
      }
    }
  }

  return coordinates;
}

function computeDistanceAndSegments(trackPoints: TrackPoint[]): {
  totalDistanceM: number;
  cumulativeDistanceM: number[];
} {
  const cumulativeDistanceM: number[] = [0];
  let totalDistanceM = 0;

  for (let i = 1; i < trackPoints.length; i += 1) {
    const prev = trackPoints[i - 1];
    const next = trackPoints[i];
    const segmentDistance = haversineDistanceMeters(
      prev.lat,
      prev.lon,
      next.lat,
      next.lon
    );
    totalDistanceM += segmentDistance;
    cumulativeDistanceM.push(totalDistanceM);
  }

  return { totalDistanceM, cumulativeDistanceM };
}

function computeElevationGain(trackPoints: TrackPoint[]): number {
  let gainM = 0;
  for (let i = 1; i < trackPoints.length; i += 1) {
    const prevEle = trackPoints[i - 1].ele;
    const nextEle = trackPoints[i].ele;
    if (prevEle == null || nextEle == null) continue;
    const delta = nextEle - prevEle;
    if (delta > 0) gainM += delta;
  }
  return gainM;
}

function computeMovingTimeMinutes(trackPoints: TrackPoint[]): NullableNumber {
  const timeSeries = trackPoints
    .map((point) => point.timeMs)
    .filter((value): value is number => value != null);
  if (timeSeries.length < 2) return null;

  const elapsedMs = timeSeries[timeSeries.length - 1] - timeSeries[0];
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return null;
  return elapsedMs / MS_PER_MINUTE;
}

function interpolateTimestampAtDistance(
  targetDistanceM: number,
  cumulativeDistanceM: number[],
  trackPoints: TrackPoint[]
): NullableNumber {
  for (let i = 1; i < cumulativeDistanceM.length; i += 1) {
    const prevDistance = cumulativeDistanceM[i - 1];
    const nextDistance = cumulativeDistanceM[i];

    if (targetDistanceM < prevDistance || targetDistanceM > nextDistance) {
      continue;
    }

    const prevTime = trackPoints[i - 1].timeMs;
    const nextTime = trackPoints[i].timeMs;
    if (prevTime == null || nextTime == null) return null;

    const segmentDistance = nextDistance - prevDistance;
    if (segmentDistance <= 0) return prevTime;

    const ratio = (targetDistanceM - prevDistance) / segmentDistance;
    return prevTime + (nextTime - prevTime) * ratio;
  }

  return null;
}

function computePaceSplitsMinPerKm(
  totalDistanceM: number,
  cumulativeDistanceM: number[],
  trackPoints: TrackPoint[]
): number[] {
  const firstTime = trackPoints[0]?.timeMs;
  if (firstTime == null) return [];

  const fullKmCount = Math.floor(totalDistanceM / METERS_PER_KM);
  if (fullKmCount <= 0) return [];

  const splitBoundaryTimes: number[] = [firstTime];
  for (let km = 1; km <= fullKmCount; km += 1) {
    const distanceBoundaryM = km * METERS_PER_KM;
    const boundaryTime = interpolateTimestampAtDistance(
      distanceBoundaryM,
      cumulativeDistanceM,
      trackPoints
    );
    if (boundaryTime == null) return [];
    splitBoundaryTimes.push(boundaryTime);
  }

  const splits: number[] = [];
  for (let i = 1; i < splitBoundaryTimes.length; i += 1) {
    const splitMs = splitBoundaryTimes[i] - splitBoundaryTimes[i - 1];
    if (!Number.isFinite(splitMs) || splitMs <= 0) return [];
    splits.push(splitMs / MS_PER_MINUTE);
  }

  return splits;
}

function computeHeartRate(trackPoints: TrackPoint[]): {
  average: NullableNumber;
  perTrackpoint: number[] | null;
} {
  const hrValues = trackPoints
    .map((point) => point.heartRate)
    .filter((value): value is number => value != null);

  if (hrValues.length === 0) {
    return { average: null, perTrackpoint: null };
  }

  const sum = hrValues.reduce((acc, value) => acc + value, 0);
  return { average: sum / hrValues.length, perTrackpoint: hrValues };
}

export function parseGpx(xmlString: string): ParsedGpxStats {
  if (xmlString.length > MAX_GPX_XML_CHARS) {
    throw new Error("GPX file is too large.");
  }

  const xmlDocument = new DOMParser().parseFromString(xmlString, "text/xml");
  if (xmlDocument.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Invalid GPX XML.");
  }

  const geoJson = gpx(xmlDocument);
  const trkptCount = xmlDocument.getElementsByTagName("trkpt").length;
  if (trkptCount > MAX_GPX_TRACKPOINTS) {
    throw new Error(
      `GPX contains too many track points (max ${MAX_GPX_TRACKPOINTS}).`,
    );
  }
  const geoCoordCount = countGeoJsonCoords(geoJson);
  if (geoCoordCount > MAX_GPX_TRACKPOINTS) {
    throw new Error(
      `GPX route geometry is too dense (max ${MAX_GPX_TRACKPOINTS} coordinates).`,
    );
  }

  const trackPoints = extractTrackPoints(xmlDocument);
  const coordinatesFromGeoJson = flattenGeoJsonCoordinates(geoJson);
  const coordinates =
    coordinatesFromGeoJson.length > 0
      ? coordinatesFromGeoJson
      : trackPoints.map((point) => [point.lat, point.lon] as [number, number]);

  if (trackPoints.length < 2) {
    return {
      totalDistanceKm: 0,
      totalElevationGainM: 0,
      averagePaceMinPerKm: null,
      paceSplitsMinPerKm: [],
      movingTimeMinutes: null,
      heartRate: computeHeartRate(trackPoints),
      coordinates,
    };
  }

  const { totalDistanceM, cumulativeDistanceM } =
    computeDistanceAndSegments(trackPoints);
  const movingTimeMinutes = computeMovingTimeMinutes(trackPoints);
  const totalDistanceKm = totalDistanceM / METERS_PER_KM;
  const averagePaceMinPerKm =
    movingTimeMinutes != null && totalDistanceKm > 0
      ? movingTimeMinutes / totalDistanceKm
      : null;

  return {
    totalDistanceKm,
    totalElevationGainM: computeElevationGain(trackPoints),
    averagePaceMinPerKm,
    paceSplitsMinPerKm: computePaceSplitsMinPerKm(
      totalDistanceM,
      cumulativeDistanceM,
      trackPoints
    ),
    movingTimeMinutes,
    heartRate: computeHeartRate(trackPoints),
    coordinates,
  };
}
