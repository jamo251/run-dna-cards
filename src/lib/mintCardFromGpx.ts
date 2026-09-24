import {
  downsampleCoordinates,
  getAllCards,
  getCardCount,
  getRouteFingerprint,
} from "@/lib/cardStorage";
import { classifyRun, type RunType } from "@/lib/classifier";
import {
  getEvolutionStage,
  type EvolutionStage,
} from "@/lib/evolutionConfig";
import { parseGpx, type ParsedGpxStats } from "@/lib/gpxParser";
import { deriveRunName } from "@/lib/runName";
import {
  assignRarity,
  normalizeStats,
  type NormalizedStats,
  type RarityTier,
} from "@/lib/scorer";

export type MintSaveMode = { kind: "new" } | { kind: "evolve"; id: number };

const STAT_KEYS: Array<keyof NormalizedStats> = [
  "distance",
  "elevation",
  "pace",
  "consistency",
  "suffer",
  "novelty",
];

export type MintedCard = {
  kind: "minted";
  parsed: ParsedGpxStats;
  runType: RunType;
  normalized: NormalizedStats;
  rarity: RarityTier;
  runName: string;
  downsampledCoords: Array<[number, number]>;
  routeFingerprint: string;
  isFirstOnRoute: boolean;
  runNumber: number;
  evolutionCount: number;
  saveMode: MintSaveMode;
  outcome: { kind: "fresh" } | { kind: "evolved"; stage: EvolutionStage };
};

export type MintCardResult =
  | MintedCard
  | { kind: "no-improvement"; sourceName: string };

export async function mintCardFromGpx(
  gpxText: string,
  sourceName: string
): Promise<MintCardResult> {
  const parsed = parseGpx(gpxText);
  const assignedRunType = classifyRun(parsed);
  const normalized = normalizeStats(parsed);
  const assignedRarity = assignRarity(normalized);
  const derivedName = deriveRunName(sourceName, assignedRunType);
  const ds = downsampleCoordinates(parsed.coordinates);
  const fingerprint = getRouteFingerprint(ds);

  let computedRunNumber = 1;
  let computedFirstOnRoute = true;
  let computedEvolutionCount = 0;
  let computedSaveMode: MintSaveMode = { kind: "new" };
  let computedOutcome: MintedCard["outcome"] = { kind: "fresh" };

  try {
    const existingCards = await getAllCards();
    const matches = existingCards
      .filter((c) => c.routeFingerprint === fingerprint)
      .sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    const match = matches[0];

    if (!match) {
      const count = await getCardCount();
      computedRunNumber = count + 1;
      computedFirstOnRoute = true;
      computedEvolutionCount = 0;
      computedSaveMode = { kind: "new" };
      computedOutcome = { kind: "fresh" };
    } else {
      const improved = STAT_KEYS.some(
        (key) => normalized[key] > (match.stats[key] ?? 0)
      );
      if (!improved) {
        return { kind: "no-improvement", sourceName };
      }
      const matchId = match.id;
      if (typeof matchId !== "number") {
        throw new Error("Matched card is missing an id");
      }
      computedRunNumber = matchId;
      computedFirstOnRoute = match.isFirstOnRoute;
      computedEvolutionCount = (match.evolutionCount ?? 0) + 1;
      computedSaveMode = { kind: "evolve", id: matchId };
      computedOutcome = {
        kind: "evolved",
        stage: getEvolutionStage(computedEvolutionCount),
      };
    }
  } catch (storageErr) {
    console.warn(
      "Card storage unavailable; falling back to in-session defaults",
      storageErr
    );
    computedRunNumber = 1;
    computedFirstOnRoute = true;
    computedEvolutionCount = 0;
    computedSaveMode = { kind: "new" };
    computedOutcome = { kind: "fresh" };
  }

  return {
    kind: "minted",
    parsed,
    runType: assignedRunType,
    normalized,
    rarity: assignedRarity,
    runName: derivedName,
    downsampledCoords: ds,
    routeFingerprint: fingerprint,
    isFirstOnRoute: computedFirstOnRoute,
    runNumber: computedRunNumber,
    evolutionCount: computedEvolutionCount,
    saveMode: computedSaveMode,
    outcome: computedOutcome,
  };
}
