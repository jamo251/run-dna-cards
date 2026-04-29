import type { EvolutionStage } from "@/lib/evolutionConfig";

const PILL_BASE =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest";

const STAGE_VARIANTS: Record<
  Exclude<EvolutionStage, "base">,
  { className: string; label: string }
> = {
  evolved: {
    className: "bg-amber-400/20 text-amber-200 border border-amber-400/40",
    label: "✦ Evolved",
  },
  final: {
    className:
      "bg-gradient-to-r from-fuchsia-500 via-amber-300 to-emerald-400 text-black shadow-[0_0_12px_rgba(251,191,36,0.45)]",
    label: "✦ Final Form",
  },
};

export type EvolutionBadgeProps = {
  stage: EvolutionStage;
  className?: string;
};

export default function EvolutionBadge({
  stage,
  className,
}: EvolutionBadgeProps) {
  if (stage === "base") return null;
  const variant = STAGE_VARIANTS[stage];
  const composed = [PILL_BASE, variant.className, className]
    .filter(Boolean)
    .join(" ");
  return <span className={composed}>{variant.label}</span>;
}
