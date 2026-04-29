import type { ParsedGpxStats } from "@/lib/gpxParser";

export type RunType =
  | "Sprinter"
  | "Mountaineer"
  | "Metronome"
  | "Explorer"
  | "Grinder"
  | "Negative Splitter"
  | "Heartbreaker";

const SPRINTER_MAX_DISTANCE_KM = 5;
const SPRINTER_MIN_SPLIT_STDDEV = 0.45;
const MOUNTAINEER_MIN_GAIN_PER_KM = 20;
const METRONOME_MAX_SPLIT_STDDEV = 0.12;
const GRINDER_MIN_DURATION_MIN = 60;
const GRINDER_MIN_PACE = 4.5;
const GRINDER_MAX_PACE = 7.0;
const GRINDER_MAX_SPLIT_STDDEV = 0.35;
const NEGATIVE_SPLIT_MIN_GAIN = 0.15;
const HEARTBREAKER_MIN_HR_DRIFT = 8;
const HEARTBREAKER_MAX_PACE_IMPROVEMENT = 0.05;

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

function paceStdDev(stats: ParsedGpxStats): number | null {
  return standardDeviation(stats.paceSplitsMinPerKm);
}

function elevationGainPerKm(stats: ParsedGpxStats): number {
  if (stats.totalDistanceKm <= 0) return 0;
  return stats.totalElevationGainM / stats.totalDistanceKm;
}

function isNegativeSplitter(stats: ParsedGpxStats): boolean {
  const splits = stats.paceSplitsMinPerKm;
  if (splits.length < 2) return false;

  const [firstHalf, secondHalf] = splitHalves(splits);
  const firstAvg = mean(firstHalf);
  const secondAvg = mean(secondHalf);
  if (firstAvg == null || secondAvg == null) return false;

  return firstAvg - secondAvg >= NEGATIVE_SPLIT_MIN_GAIN;
}

function isMetronome(stats: ParsedGpxStats): boolean {
  if (stats.paceSplitsMinPerKm.length < 3) return false;
  const stdDev = paceStdDev(stats);
  return stdDev != null && stdDev <= METRONOME_MAX_SPLIT_STDDEV;
}

function isSprinter(stats: ParsedGpxStats): boolean {
  const stdDev = paceStdDev(stats);
  return (
    stats.totalDistanceKm <= SPRINTER_MAX_DISTANCE_KM &&
    stdDev != null &&
    stdDev >= SPRINTER_MIN_SPLIT_STDDEV &&
    elevationGainPerKm(stats) < MOUNTAINEER_MIN_GAIN_PER_KM
  );
}

function isHeartbreaker(stats: ParsedGpxStats): boolean {
  const hr = stats.heartRate.perTrackpoint;
  if (hr == null || hr.length < 4) return false;
  if (stats.paceSplitsMinPerKm.length < 2) return false;

  const [firstHrHalf, secondHrHalf] = splitHalves(hr);
  const [firstPaceHalf, secondPaceHalf] = splitHalves(stats.paceSplitsMinPerKm);
  const firstHrAvg = mean(firstHrHalf);
  const secondHrAvg = mean(secondHrHalf);
  const firstPaceAvg = mean(firstPaceHalf);
  const secondPaceAvg = mean(secondPaceHalf);
  if (
    firstHrAvg == null ||
    secondHrAvg == null ||
    firstPaceAvg == null ||
    secondPaceAvg == null
  ) {
    return false;
  }

  const hrDrift = secondHrAvg - firstHrAvg;
  const paceDelta = secondPaceAvg - firstPaceAvg;
  return (
    hrDrift >= HEARTBREAKER_MIN_HR_DRIFT &&
    paceDelta >= -HEARTBREAKER_MAX_PACE_IMPROVEMENT
  );
}

function isMountaineer(stats: ParsedGpxStats): boolean {
  return elevationGainPerKm(stats) > MOUNTAINEER_MIN_GAIN_PER_KM;
}

function isGrinder(stats: ParsedGpxStats): boolean {
  const stdDev = paceStdDev(stats);
  const pace = stats.averagePaceMinPerKm;
  const duration = stats.movingTimeMinutes;
  if (pace == null || duration == null || stdDev == null) return false;
  if (stats.paceSplitsMinPerKm.length < 3) return false;

  return (
    duration > GRINDER_MIN_DURATION_MIN &&
    pace >= GRINDER_MIN_PACE &&
    pace <= GRINDER_MAX_PACE &&
    stdDev <= GRINDER_MAX_SPLIT_STDDEV
  );
}

export function classifyRun(stats: ParsedGpxStats): RunType {
  if (isNegativeSplitter(stats)) return "Negative Splitter";
  if (isMetronome(stats)) return "Metronome";
  if (isSprinter(stats)) return "Sprinter";
  if (isHeartbreaker(stats)) return "Heartbreaker";
  if (isMountaineer(stats)) return "Mountaineer";
  if (isGrinder(stats)) return "Grinder";
  return "Explorer";
}
