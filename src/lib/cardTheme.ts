import type { RunType } from "@/lib/classifier";
import type { RarityTier } from "@/lib/scorer";

export type RunTypeAccent = {
  badgeBg: string;
  badgeText: string;
  barFill: string;
};

export type RarityBorder = {
  border: string;
  ring: string;
  stamp: string;
};

export const RUN_TYPE_ACCENTS: Record<RunType, RunTypeAccent> = {
  Sprinter: {
    badgeBg: "bg-rose-500/15",
    badgeText: "text-rose-300",
    barFill: "bg-rose-400",
  },
  Mountaineer: {
    badgeBg: "bg-amber-400/15",
    badgeText: "text-amber-300",
    barFill: "bg-amber-400",
  },
  Metronome: {
    badgeBg: "bg-cyan-400/15",
    badgeText: "text-cyan-300",
    barFill: "bg-cyan-400",
  },
  Explorer: {
    badgeBg: "bg-emerald-400/15",
    badgeText: "text-emerald-300",
    barFill: "bg-emerald-400",
  },
  Grinder: {
    badgeBg: "bg-slate-400/20",
    badgeText: "text-slate-200",
    barFill: "bg-slate-300",
  },
  "Negative Splitter": {
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-300",
    barFill: "bg-emerald-500",
  },
  Heartbreaker: {
    badgeBg: "bg-pink-500/15",
    badgeText: "text-pink-300",
    barFill: "bg-pink-500",
  },
};

export const RARITY_BORDERS: Record<RarityTier, RarityBorder> = {
  Common: {
    border: "border-zinc-500",
    ring: "ring-zinc-500/20",
    stamp: "text-zinc-300/80",
  },
  Rare: {
    border: "border-sky-400",
    ring: "ring-sky-400/30",
    stamp: "text-sky-300/80",
  },
  Epic: {
    border: "border-violet-400",
    ring: "ring-violet-400/30",
    stamp: "text-violet-300/80",
  },
  Legendary: {
    border: "border-amber-400",
    ring: "ring-amber-400/30",
    stamp: "text-amber-300/80",
  },
};

// Raw hex equivalents of the Tailwind palettes above. Used by surfaces that
// need real color values rather than class names: Satori inline styles, CSS
// box-shadow / drop-shadow / text-shadow, and any dynamic borderColor.
// Keep these in sync with RUN_TYPE_ACCENTS / RARITY_BORDERS.
export const RUN_TYPE_HEX: Record<RunType, string> = {
  Sprinter: "#fb7185",
  Mountaineer: "#fbbf24",
  Metronome: "#22d3ee",
  Explorer: "#34d399",
  Grinder: "#cbd5e1",
  "Negative Splitter": "#10b981",
  Heartbreaker: "#ec4899",
};

export const RARITY_HEX: Record<RarityTier, string> = {
  Common: "#71717a",
  Rare: "#38bdf8",
  Epic: "#a78bfa",
  Legendary: "#fbbf24",
};

export const RARITY_PIPS: Record<RarityTier, string> = {
  Common: "●",
  Rare: "●●",
  Epic: "●●●",
  Legendary: "★",
};
