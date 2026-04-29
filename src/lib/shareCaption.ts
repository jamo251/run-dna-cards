import type { RunType } from "@/lib/classifier";
import type { NormalizedStats, RarityTier } from "@/lib/scorer";

const MAX_CAPTION_LENGTH = 280;
const HASHTAGS = "#RunDNACards #Running #Strava";

const RUN_TYPE_EMOJI: Record<RunType, string> = {
  Sprinter: "⚡",
  Mountaineer: "🏔️",
  Metronome: "⏱️",
  Explorer: "🗺️",
  Grinder: "🔥",
  "Negative Splitter": "🚀",
  Heartbreaker: "❤️‍🔥",
};

type StatEntry = {
  key: keyof NormalizedStats;
  label: string;
};

const STAT_ENTRIES: StatEntry[] = [
  { key: "distance", label: "Distance" },
  { key: "elevation", label: "Elevation" },
  { key: "pace", label: "Pace" },
  { key: "consistency", label: "Consistency" },
  { key: "suffer", label: "Suffer" },
  { key: "novelty", label: "Novelty" },
];

function pickTopTwoStats(stats: NormalizedStats): [StatEntry, StatEntry] {
  const ranked = [...STAT_ENTRIES].sort((a, b) => {
    const diff = stats[b.key] - stats[a.key];
    if (diff !== 0) return diff;
    return STAT_ENTRIES.indexOf(a) - STAT_ENTRIES.indexOf(b);
  });
  return [ranked[0], ranked[1]];
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function truncateForCap(text: string, max: number): string {
  if (text.length <= max) return text;
  if (max <= 1) return text.slice(0, max);
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function buildShareCaption(
  runName: string,
  runType: RunType,
  rarity: RarityTier,
  stats: NormalizedStats,
  appUrl?: string
): string {
  const emoji = RUN_TYPE_EMOJI[runType];
  const [topStat, secondStat] = pickTopTwoStats(stats);
  const topLine = `${topStat.label} ${clampScore(stats[topStat.key])} | ${secondStat.label} ${clampScore(stats[secondStat.key])}`;
  const cta = appUrl ? `Generate yours at ${appUrl}` : "";

  const buildLead = (name: string) =>
    `Just unlocked a ${rarity} ${runType} ${emoji}: ${name}.`;

  const assemble = (lead: string, includeCta: boolean): string => {
    const parts = [lead, topLine];
    if (includeCta && cta.length > 0) parts.push(cta);
    parts.push(HASHTAGS);
    return parts.join(" ");
  };

  let caption = assemble(buildLead(runName), true);
  if (caption.length <= MAX_CAPTION_LENGTH) return caption;

  caption = assemble(buildLead(runName), false);
  if (caption.length <= MAX_CAPTION_LENGTH) return caption;

  const fixedSuffix = ` ${topLine} ${HASHTAGS}`;
  const leadBudget = MAX_CAPTION_LENGTH - fixedSuffix.length;
  const leadTemplate = buildLead("");
  const nameBudget = leadBudget - leadTemplate.length;

  if (nameBudget > 0) {
    const truncatedName = truncateForCap(runName, nameBudget);
    return assemble(buildLead(truncatedName), false);
  }

  return truncateForCap(caption, MAX_CAPTION_LENGTH);
}
