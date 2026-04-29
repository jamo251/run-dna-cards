import type { StoredCard } from "@/lib/cardStorage";
import type { NormalizedStats, RarityTier } from "@/lib/scorer";

export const STAT_KEYS: Array<keyof NormalizedStats> = [
  "distance",
  "elevation",
  "pace",
  "consistency",
  "suffer",
  "novelty",
];

export type BattleSide = "a" | "b" | "draw";

export type BattleRoundResult = {
  stat: keyof NormalizedStats;
  scoreA: number;
  scoreB: number;
  winner: BattleSide;
};

export type BattleResult = {
  rounds: BattleRoundResult[];
  winsA: number;
  winsB: number;
  draws: number;
  overallWinner: BattleSide;
  tiebreaker?: "rarity" | "evolution" | "seniority";
};

const RARITY_RANK: Record<RarityTier, number> = {
  Legendary: 4,
  Epic: 3,
  Rare: 2,
  Common: 1,
};

export function battleStat(
  a: StoredCard,
  b: StoredCard,
  stat: keyof NormalizedStats
): BattleRoundResult {
  const scoreA = a.stats[stat];
  const scoreB = b.stats[stat];
  let winner: BattleSide;
  if (scoreA > scoreB) winner = "a";
  else if (scoreB > scoreA) winner = "b";
  else winner = "draw";
  return { stat, scoreA, scoreB, winner };
}

type Tiebreak = {
  winner: BattleSide;
  reason?: BattleResult["tiebreaker"];
};

function decideTiebreaker(a: StoredCard, b: StoredCard): Tiebreak {
  const rarityA = RARITY_RANK[a.rarity];
  const rarityB = RARITY_RANK[b.rarity];
  if (rarityA > rarityB) return { winner: "a", reason: "rarity" };
  if (rarityB > rarityA) return { winner: "b", reason: "rarity" };

  const evoA = a.evolutionCount ?? 0;
  const evoB = b.evolutionCount ?? 0;
  if (evoA > evoB) return { winner: "a", reason: "evolution" };
  if (evoB > evoA) return { winner: "b", reason: "evolution" };

  const idA = a.id ?? Number.MAX_SAFE_INTEGER;
  const idB = b.id ?? Number.MAX_SAFE_INTEGER;
  if (idA < idB) return { winner: "a", reason: "seniority" };
  if (idB < idA) return { winner: "b", reason: "seniority" };

  return { winner: "draw" };
}

export function battleAll(a: StoredCard, b: StoredCard): BattleResult {
  const rounds = STAT_KEYS.map((stat) => battleStat(a, b, stat));
  let winsA = 0;
  let winsB = 0;
  let draws = 0;
  for (const round of rounds) {
    if (round.winner === "a") winsA += 1;
    else if (round.winner === "b") winsB += 1;
    else draws += 1;
  }

  if (winsA > winsB) {
    return { rounds, winsA, winsB, draws, overallWinner: "a" };
  }
  if (winsB > winsA) {
    return { rounds, winsA, winsB, draws, overallWinner: "b" };
  }

  const tiebreak = decideTiebreaker(a, b);
  return {
    rounds,
    winsA,
    winsB,
    draws,
    overallWinner: tiebreak.winner,
    ...(tiebreak.reason ? { tiebreaker: tiebreak.reason } : {}),
  };
}
