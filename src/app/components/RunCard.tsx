import RouteMap from "@/app/components/RouteMap";
import type { RunType } from "@/lib/classifier";
import { RARITY_BORDERS, RUN_TYPE_ACCENTS } from "@/lib/cardTheme";
import type { NormalizedStats, RarityTier } from "@/lib/scorer";

export type RunCardProps = {
  runName: string;
  runType: RunType;
  rarity: RarityTier;
  stats: NormalizedStats;
  coordinates: Array<[number, number]>;
  runNumber: number;
  isFirstOnRoute: boolean;
};

type StatEntry = {
  label: string;
  score: number;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function padRunNumber(runNumber: number): string {
  const safeNumber = Math.max(0, Math.floor(runNumber));
  return safeNumber.toString().padStart(3, "0");
}

function buildStats(stats: NormalizedStats): StatEntry[] {
  return [
    { label: "Distance", score: clampScore(stats.distance) },
    { label: "Elevation", score: clampScore(stats.elevation) },
    { label: "Pace", score: clampScore(stats.pace) },
    { label: "Consistency", score: clampScore(stats.consistency) },
    { label: "Suffer", score: clampScore(stats.suffer) },
    { label: "Novelty", score: clampScore(stats.novelty) },
  ];
}

function StatCell({
  label,
  score,
  barFillClassName,
}: StatEntry & { barFillClassName: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
          {label}
        </span>
        <span className="text-sm font-bold tabular-nums text-white">
          {Math.round(score)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${barFillClassName}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function RunCard({
  runName,
  runType,
  rarity,
  stats,
  coordinates,
  runNumber,
  isFirstOnRoute,
}: RunCardProps) {
  const accent = RUN_TYPE_ACCENTS[runType];
  const rarityStyle = RARITY_BORDERS[rarity];
  const statEntries = buildStats(stats);
  const setNumberLabel = `Run ${padRunNumber(runNumber)}/365`;

  return (
    <div
      className={`relative h-[504px] w-[360px] overflow-hidden rounded-2xl border-2 bg-[#1a1a2e] shadow-[0_20px_60px_rgba(0,0,0,0.5)] ring-4 ${rarityStyle.border} ${rarityStyle.ring}`}
    >
      <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_24px_rgba(0,0,0,0.6)]" />

      <div className="relative flex h-full flex-col gap-4 p-5">
        <div className="flex flex-[0_0_45%] items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-black/60 p-3 [&_svg]:!m-0 [&_svg]:h-full [&_svg]:w-full">
          <RouteMap coordinates={coordinates} />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold leading-tight tracking-tight text-white">
            {runName}
          </h2>
          <span
            className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${accent.badgeBg} ${accent.badgeText}`}
          >
            {runType}
          </span>
        </div>

        <div className="grid flex-1 grid-cols-3 grid-rows-2 gap-x-4 gap-y-3">
          {statEntries.map((stat) => (
            <StatCell
              key={stat.label}
              label={stat.label}
              score={stat.score}
              barFillClassName={accent.barFill}
            />
          ))}
        </div>

        <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-widest text-white/40">
          <span>{setNumberLabel}</span>
          {isFirstOnRoute && (
            <span
              className={`rounded-sm border border-white/15 px-1.5 py-0.5 ${rarityStyle.stamp}`}
            >
              1st Edition
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
