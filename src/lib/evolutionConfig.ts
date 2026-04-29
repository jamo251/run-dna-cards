export const EVOLUTION_THRESHOLD_1 = 3;
export const EVOLUTION_THRESHOLD_2 = 10;

export type EvolutionStage = "base" | "evolved" | "final";

export function getEvolutionStage(evolutionCount: number): EvolutionStage {
  if (evolutionCount >= EVOLUTION_THRESHOLD_2) return "final";
  if (evolutionCount >= EVOLUTION_THRESHOLD_1) return "evolved";
  return "base";
}
