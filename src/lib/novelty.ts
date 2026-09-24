const METERS_PER_KM = 1000;
const EARTH_RADIUS_M = 6371000;

const MAX_NOVELTY_POINTS = 400;
const GRID_CELL_SIZE_M = 40;
const EXPLORATION_RAW_MIN = 0.2;
const EXPLORATION_RAW_MAX = 1.0;
/** Blend between non-overlap along the path vs how fully the bbox is filled. */
const EXPLORATION_LENGTH_WEIGHT = 0.55;
const EXPLORATION_FILL_WEIGHT = 0.45;

/** Ignore heading deltas below this (degrees); downsampling already reduces GPS jitter. */
const TURN_NOISE_FLOOR_DEG = 2;
const COMPLEXITY_MIN_DEG_PER_KM = 50;
const COMPLEXITY_MAX_DEG_PER_KM = 320;

const NON_RETRACE_SAMPLE_POINTS = 50;
/**
 * Mean point distance (m) at which reverse-half alignment is treated as fully dissimilar.
 * Same-road out-and-backs land near 0; unrelated halves exceed this quickly.
 */
const RETRACE_DISTANCE_MAX_M = 120;

const SHORT_RUN_KM = 0.5;
const SHORT_RUN_COMPLEXITY_MAX_DEG_PER_KM = 550;
const SHORT_RUN_EXPLORATION_RAW_MAX = 1.15;

const EXPLORATION_WEIGHT = 0.4;
const COMPLEXITY_WEIGHT = 0.35;
const NON_RETRACE_WEIGHT = 0.25;

type Point2D = { x: number; y: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeLinear(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const ratio = (value - min) / (max - min);
  return clamp(ratio * 100, 0, 100);
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

function downsampleCoordinates(
  coordinates: Array<[number, number]>,
  max: number
): Array<[number, number]> {
  if (coordinates.length === 0) return [];
  if (coordinates.length <= max) return coordinates.slice();

  const step = Math.ceil(coordinates.length / max);
  const sampled: Array<[number, number]> = [];

  for (let i = 0; i < coordinates.length; i += step) {
    sampled.push(coordinates[i]);
  }

  const last = coordinates[coordinates.length - 1];
  const sampledLast = sampled[sampled.length - 1];
  if (
    sampledLast == null ||
    sampledLast[0] !== last[0] ||
    sampledLast[1] !== last[1]
  ) {
    sampled.push(last);
  }

  return sampled;
}

function projectToLocalMeters(
  coordinates: Array<[number, number]>
): Point2D[] {
  let sumLat = 0;
  let sumLon = 0;
  for (const [lat, lon] of coordinates) {
    sumLat += lat;
    sumLon += lon;
  }
  const originLat = sumLat / coordinates.length;
  const originLon = sumLon / coordinates.length;
  const cosLat = Math.cos(toRadians(originLat));

  return coordinates.map(([lat, lon]) => ({
    x: toRadians(lon - originLon) * EARTH_RADIUS_M * cosLat,
    y: toRadians(lat - originLat) * EARTH_RADIUS_M,
  }));
}

function distance2D(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

function pathLengthMeters(points: Point2D[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance2D(points[i - 1], points[i]);
  }
  return total;
}

function bearingDegrees(from: Point2D, to: Point2D): number {
  return toDegrees(Math.atan2(to.x - from.x, to.y - from.y));
}

function absoluteHeadingDelta(prev: number, next: number): number {
  let delta = next - prev;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return Math.abs(delta);
}

function computeExplorationScore(
  points: Point2D[],
  totalDistanceM: number,
  isShortRun: boolean
): number {
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;
  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }

  // Origin the grid at the bbox min so thin corridors are not split across a cell boundary.
  const cells = new Set<string>();
  for (const point of points) {
    const gx = Math.floor((point.x - minX) / GRID_CELL_SIZE_M);
    const gy = Math.floor((point.y - minY) / GRID_CELL_SIZE_M);
    cells.add(`${gx},${gy}`);
  }

  const lengthExpected = Math.max(totalDistanceM / GRID_CELL_SIZE_M, 1);
  const lengthEfficiency = clamp(cells.size / lengthExpected, 0, 1.25);

  const widthCells = Math.max(1, Math.ceil((maxX - minX) / GRID_CELL_SIZE_M));
  const heightCells = Math.max(1, Math.ceil((maxY - minY) / GRID_CELL_SIZE_M));
  const bboxCells = widthCells * heightCells;
  const bboxFill = clamp(cells.size / bboxCells, 0, 1);

  const raw =
    lengthEfficiency * EXPLORATION_LENGTH_WEIGHT +
    bboxFill * EXPLORATION_FILL_WEIGHT;
  const rawMax = isShortRun ? SHORT_RUN_EXPLORATION_RAW_MAX : EXPLORATION_RAW_MAX;
  return normalizeLinear(raw, EXPLORATION_RAW_MIN, rawMax);
}

function computeComplexityScore(
  points: Point2D[],
  totalDistanceKm: number,
  isShortRun: boolean
): number {
  if (points.length < 3 || totalDistanceKm <= 0) return 0;

  let totalTurningDeg = 0;
  let prevBearing: number | null = null;

  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    if (distance2D(from, to) < 1) continue;

    const bearing = bearingDegrees(from, to);
    if (prevBearing != null) {
      const delta = absoluteHeadingDelta(prevBearing, bearing);
      if (delta >= TURN_NOISE_FLOOR_DEG) {
        totalTurningDeg += delta;
      }
    }
    prevBearing = bearing;
  }

  const degPerKm = totalTurningDeg / Math.max(totalDistanceKm, 1e-6);
  const maxDeg = isShortRun
    ? SHORT_RUN_COMPLEXITY_MAX_DEG_PER_KM
    : COMPLEXITY_MAX_DEG_PER_KM;
  return normalizeLinear(degPerKm, COMPLEXITY_MIN_DEG_PER_KM, maxDeg);
}

function cumulativeDistances(points: Point2D[]): number[] {
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    distances.push(distances[i - 1] + distance2D(points[i - 1], points[i]));
  }
  return distances;
}

function pointAtDistance(
  points: Point2D[],
  distances: number[],
  target: number
): Point2D {
  if (target <= 0) return points[0];
  const total = distances[distances.length - 1];
  if (target >= total) return points[points.length - 1];

  let lo = 0;
  let hi = distances.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (distances[mid] < target) lo = mid + 1;
    else hi = mid;
  }

  const i = Math.max(1, lo);
  const d0 = distances[i - 1];
  const d1 = distances[i];
  const t = d1 > d0 ? (target - d0) / (d1 - d0) : 0;
  const a = points[i - 1];
  const b = points[i];
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function resampleByDistance(points: Point2D[], count: number): Point2D[] {
  if (points.length === 0) return [];
  if (count <= 1) return [points[0]];

  const distances = cumulativeDistances(points);
  const total = distances[distances.length - 1];
  if (total <= 0) return Array.from({ length: count }, () => ({ ...points[0] }));

  const resampled: Point2D[] = [];
  for (let i = 0; i < count; i++) {
    const target = (total * i) / (count - 1);
    resampled.push(pointAtDistance(points, distances, target));
  }
  return resampled;
}

function splitPathByDistance(points: Point2D[]): [Point2D[], Point2D[]] {
  if (points.length < 2) return [[], []];

  const distances = cumulativeDistances(points);
  const midpoint = distances[distances.length - 1] / 2;
  if (midpoint <= 0) return [[], []];

  let splitIndex = 1;
  for (let i = 1; i < distances.length; i++) {
    if (distances[i] >= midpoint) {
      splitIndex = i;
      break;
    }
  }

  const midPoint = pointAtDistance(points, distances, midpoint);
  const firstHalf = [...points.slice(0, splitIndex), midPoint];
  const secondHalf = [midPoint, ...points.slice(splitIndex)];
  return [firstHalf, secondHalf];
}

function computeNonRetraceScore(
  points: Point2D[],
  pathLengthM: number
): number {
  if (points.length < 4 || pathLengthM <= 0) return 50;

  const [firstHalf, secondHalf] = splitPathByDistance(points);
  if (firstHalf.length < 2 || secondHalf.length < 2) return 50;

  const firstSampled = resampleByDistance(firstHalf, NON_RETRACE_SAMPLE_POINTS);
  const secondReversed = resampleByDistance(
    [...secondHalf].reverse(),
    NON_RETRACE_SAMPLE_POINTS
  );

  let sumDistance = 0;
  for (let i = 0; i < NON_RETRACE_SAMPLE_POINTS; i++) {
    sumDistance += distance2D(firstSampled[i], secondReversed[i]);
  }
  const meanDistance = sumDistance / NON_RETRACE_SAMPLE_POINTS;
  const similarity = clamp(1 - meanDistance / RETRACE_DISTANCE_MAX_M, 0, 1);
  return (1 - similarity) * 100;
}

/**
 * Route-shape novelty (0–100): how much the path explores distinct ground
 * and avoids repeating itself. Deterministic from coordinates alone.
 */
export function computeNoveltyScore(
  coordinates: Array<[number, number]>,
  totalDistanceKm: number
): number {
  if (
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    !Number.isFinite(totalDistanceKm) ||
    totalDistanceKm <= 0
  ) {
    return 0;
  }

  const sampled = downsampleCoordinates(coordinates, MAX_NOVELTY_POINTS);
  if (sampled.length < 2) return 0;

  const points = projectToLocalMeters(sampled);
  const pathLengthM = pathLengthMeters(points);
  if (pathLengthM <= 0) return 0;

  const distanceKm = Math.max(totalDistanceKm, pathLengthM / METERS_PER_KM);
  const isShortRun = distanceKm < SHORT_RUN_KM;

  const exploration = computeExplorationScore(
    points,
    pathLengthM,
    isShortRun
  );
  const complexity = computeComplexityScore(
    points,
    pathLengthM / METERS_PER_KM,
    isShortRun
  );
  const nonRetrace = computeNonRetraceScore(points, pathLengthM);

  return clamp(
    exploration * EXPLORATION_WEIGHT +
      complexity * COMPLEXITY_WEIGHT +
      nonRetrace * NON_RETRACE_WEIGHT,
    0,
    100
  );
}
