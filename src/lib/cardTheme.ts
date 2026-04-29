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
