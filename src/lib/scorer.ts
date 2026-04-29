import type { ParsedGpxStats } from "@/lib/gpxParser";

export type NormalizedStats = {
  distance: number;
  elevation: number;
  pace: number;
  consistency: number;
  suffer: number;
  novelty: number;
};

export type RarityTier = "Common" | "Rare" | "Epic" | "Legendary";

const DISTANCE_MIN_KM = 0;
const DISTANCE_MAX_KM = 50;
const ELEVATION_MIN_M = 0;
const ELEVATION_MAX_M = 2000;
const PACE_FAST_MIN_MIN_PER_KM = 3;
const PACE_SLOW_MAX_MIN_PER_KM = 10;
const CONSISTENCY_STDDEV_MIN = 0;
const CONSISTENCY_STDDEV_MAX = 1.5;
const NOVELTY_PLACEHOLDER_SCORE = 50;

const HR_AVERAGE_MIN = 100;
const HR_AVERAGE_MAX = 190;
const HR_DRIFT_MIN = 0;
const HR_DRIFT_MAX = 20;
const HR_AVERAGE_WEIGHT = 0.6;
const HR_DRIFT_WEIGHT = 0.4;

const DECAY_MIN_MIN_PER_KM = 0;
const DECAY_MAX_MIN_PER_KM = 1.5;
const DURATION_MIN_MINUTES = 20;
const DURATION_MAX_MINUTES = 150;
const DECAY_WEIGHT = 0.7;
const DURATION_WEIGHT = 0.3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeLinear(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const ratio = (value - min) / (max - min);
  return clamp(ratio * 100, 0, 100);
}

function normalizeInverted(value: number, min: number, max: number): number {
  return 100 - normalizeLinear(value, min, max);
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number | null {
  const avg = mean(values);
  if (avg == null) return null;
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function splitHalves(values: number[]): [number[], number[]] {
  const midpoint = Math.floor(values.length / 2);
  if (midpoint === 0) return [[], []];
  return [values.slice(0, midpoint), values.slice(midpoint)];
}

function getPaceDecay(stats: ParsedGpxStats): number {
  if (stats.paceSplitsMinPerKm.length < 2) return 0;
  const [firstHalf, secondHalf] = splitHalves(stats.paceSplitsMinPerKm);
  const firstAvg = mean(firstHalf);
  const secondAvg = mean(secondHalf);
  if (firstAvg == null || secondAvg == null) return 0;
  return Math.max(0, secondAvg - firstAvg);
}

function getHrDrift(hrValues: number[]): number {
  if (hrValues.length < 2) return 0;
  const [firstHalf, secondHalf] = splitHalves(hrValues);
  const firstAvg = mean(firstHalf);
  const secondAvg = mean(secondHalf);
  if (firstAvg == null || secondAvg == null) return 0;
  return Math.max(0, secondAvg - firstAvg);
}

function computeSufferScore(stats: ParsedGpxStats): number {
  const hrValues = stats.heartRate.perTrackpoint;
  if (hrValues != null && hrValues.length > 0) {
    const avgHr = mean(hrValues) ?? 0;
    const hrDrift = getHrDrift(hrValues);
    const averageHrScore = normalizeLinear(avgHr, HR_AVERAGE_MIN, HR_AVERAGE_MAX);
    const hrDriftScore = normalizeLinear(hrDrift, HR_DRIFT_MIN, HR_DRIFT_MAX);
    return clamp(
      averageHrScore * HR_AVERAGE_WEIGHT + hrDriftScore * HR_DRIFT_WEIGHT,
      0,
      100
    );
  }

  const paceDecay = getPaceDecay(stats);
  const duration = stats.movingTimeMinutes ?? 0;
  const paceDecayScore = normalizeLinear(
    paceDecay,
    DECAY_MIN_MIN_PER_KM,
    DECAY_MAX_MIN_PER_KM
  );
  const durationScore = normalizeLinear(
    duration,
    DURATION_MIN_MINUTES,
    DURATION_MAX_MINUTES
  );

  return clamp(
    paceDecayScore * DECAY_WEIGHT + durationScore * DURATION_WEIGHT,
    0,
    100
  );
}

export function normalizeStats(stats: ParsedGpxStats): NormalizedStats {
  const paceStdDev = standardDeviation(stats.paceSplitsMinPerKm) ?? CONSISTENCY_STDDEV_MAX;

  return {
    distance: normalizeLinear(
      stats.totalDistanceKm,
      DISTANCE_MIN_KM,
      DISTANCE_MAX_KM
    ),
    elevation: normalizeLinear(
      stats.totalElevationGainM,
      ELEVATION_MIN_M,
      ELEVATION_MAX_M
    ),
    pace:
      stats.averagePaceMinPerKm == null
        ? 0
        : normalizeInverted(
            stats.averagePaceMinPerKm,
            PACE_FAST_MIN_MIN_PER_KM,
            PACE_SLOW_MAX_MIN_PER_KM
          ),
    consistency: normalizeInverted(
      paceStdDev,
      CONSISTENCY_STDDEV_MIN,
      CONSISTENCY_STDDEV_MAX
    ),
    suffer: computeSufferScore(stats),
    novelty: NOVELTY_PLACEHOLDER_SCORE,
  };
}

export function assignRarity(normalized: NormalizedStats): RarityTier {
  const topScore = Math.max(
    normalized.distance,
    normalized.elevation,
    normalized.pace,
    normalized.consistency,
    normalized.suffer,
    normalized.novelty
  );

  if (topScore >= 90) return "Legendary";
  if (topScore >= 75) return "Epic";
  if (topScore >= 55) return "Rare";
  return "Common";
}
