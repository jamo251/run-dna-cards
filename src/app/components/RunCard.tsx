import RouteMap from "@/app/components/RouteMap";
import type { RunType } from "@/lib/classifier";
import {
  RARITY_HEX,
  RARITY_PIPS,
  RUN_TYPE_ACCENTS,
  RUN_TYPE_HEX,
} from "@/lib/cardTheme";
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

const NOISE_BACKGROUND_IMAGE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")";

const CARD_BACKGROUND =
  "radial-gradient(ellipse at 50% 30%, #2a2a4a 0%, #1a1a2e 55%, #0f0f1a 100%)";

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
  accentHex,
}: StatEntry & { barFillClassName: string; accentHex: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <div className="relative h-2 flex-1 overflow-hidden rounded bg-white/[0.08]">
          <div
            className={`h-full rounded ${barFillClassName}`}
            style={{
              width: `${score}%`,
              boxShadow: `0 0 6px ${accentHex}`,
            }}
          />
        </div>
        <span className="w-7 text-right font-mono text-[10px] font-bold tabular-nums text-white">
          {Math.round(score)}
        </span>
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
  const accentHex = RUN_TYPE_HEX[runType];
  const rarityHex = RARITY_HEX[rarity];
  const rarityHex30 = `${rarityHex}4D`;
  const statEntries = buildStats(stats);
  const setNumberLabel = `Run ${padRunNumber(runNumber)}/365`;
  const showShimmer = rarity !== "Common";

  return (
    <div
      className="rounded-[20px]"
      style={{
        border: `3px solid ${rarityHex}`,
        padding: 4,
        background: "#0f0f1a",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}
    >
      <div
        className="relative h-[504px] w-[360px] overflow-hidden rounded-[16px]"
        style={{
          border: `1px solid ${rarityHex30}`,
          background: CARD_BACKGROUND,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.03]"
          style={{ backgroundImage: NOISE_BACKGROUND_IMAGE }}
        />

        {showShimmer && (
          <div
            aria-hidden
            className="card-shimmer pointer-events-none absolute left-0 top-0 h-[200%] w-[200%]"
            style={{
              background:
                "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)",
              animation: "shimmer 3s linear infinite",
            }}
          />
        )}

        <div className="relative flex h-full flex-col gap-4 p-5">
          <div
            className="route-svg-glow flex flex-[0_0_45%] items-center justify-center overflow-hidden rounded-xl border border-white/5 p-3 [&_svg]:!m-0 [&_svg]:h-full [&_svg]:w-full"
            style={{
              background: `radial-gradient(ellipse at 50% 50%, ${accentHex}14 0%, transparent 70%)`,
              boxShadow: "inset 0 0 40px rgba(0,0,0,0.6)",
            }}
          >
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ filter: `drop-shadow(0 0 4px ${accentHex})` }}
            >
              <RouteMap coordinates={coordinates} />
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-2">
            <h2
              className="line-clamp-3 min-h-0 break-words text-3xl font-extrabold leading-tight tracking-tight text-white"
              style={{ textShadow: `0 0 8px ${accentHex}33` }}
              title={runName}
            >
              {runName}
            </h2>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${accent.badgeBg} ${accent.badgeText}`}
                style={{ borderColor: accentHex }}
              >
                {runType}
              </span>
              <span
                className="text-[11px] leading-none"
                style={{ color: rarityHex, letterSpacing: "0.3em" }}
                aria-label={`${rarity} rarity`}
                title={rarity}
              >
                {RARITY_PIPS[rarity]}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 grid-rows-2 gap-x-4 gap-y-3">
            {statEntries.map((stat) => (
              <StatCell
                key={stat.label}
                label={stat.label}
                score={stat.score}
                barFillClassName={accent.barFill}
                accentHex={accentHex}
              />
            ))}
          </div>

          <div className="mt-auto flex items-center justify-between text-[10px] font-medium uppercase tracking-widest text-white/40">
            <span>{setNumberLabel}</span>
            {isFirstOnRoute && (
              <span
                className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase"
                style={{
                  borderColor: rarityHex,
                  color: rarityHex,
                  letterSpacing: "0.2em",
                }}
              >
                1st Edition
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
