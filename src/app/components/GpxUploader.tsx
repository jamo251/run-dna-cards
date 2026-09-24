"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import CardExportActions from "@/app/components/CardExportActions";
import RunCard, { type RunCardProps } from "@/app/components/RunCard";
import { evolveCard, saveCard } from "@/lib/cardStorage";
import { type RunType } from "@/lib/classifier";
import { type EvolutionStage } from "@/lib/evolutionConfig";
import { type ParsedGpxStats } from "@/lib/gpxParser";
import {
  mintCardFromGpx,
  type MintSaveMode,
} from "@/lib/mintCardFromGpx";
import {
  type NormalizedStats,
  type RarityTier,
} from "@/lib/scorer";
import { MAX_GPX_FILE_BYTES } from "@/lib/gpxLimits";
import { buildShareCaption } from "@/lib/shareCaption";
import StravaImport from "@/app/components/StravaImport";

type UploadOutcome =
  | { kind: "fresh" }
  | { kind: "evolved"; stage: EvolutionStage }
  | { kind: "no-improvement"; fileName: string };

const STAGE_LABELS: Record<EvolutionStage, string> = {
  base: "Stronger Form",
  evolved: "Evolved Form",
  final: "Final Form",
};

type Status =
  | { kind: "idle" }
  | { kind: "loading"; message: string }
  | { kind: "error"; message: string }
  | { kind: "success"; fileName: string };

function isGpxFile(file: File): boolean {
  const nameOk = file.name.toLowerCase().endsWith(".gpx");
  const typeOk =
    file.type === "" ||
    file.type === "application/octet-stream" ||
    file.type === "application/gpx+xml" ||
    file.type === "application/xml" ||
    file.type === "text/xml";
  return nameOk && typeOk;
}

async function readFileAsText(file: File): Promise<string> {
  return await file.text();
}

export default function GpxUploader() {
  const fileInputId = useId();
  const dropZoneInstructionsId = useId();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [parsedStats, setParsedStats] = useState<ParsedGpxStats | null>(null);
  const [runType, setRunType] = useState<RunType | null>(null);
  const [normalizedStats, setNormalizedStats] = useState<NormalizedStats | null>(
    null
  );
  const [rarityTier, setRarityTier] = useState<RarityTier | null>(null);
  const [runName, setRunName] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [runNumber, setRunNumber] = useState<number | null>(null);
  const [isFirstOnRoute, setIsFirstOnRoute] = useState<boolean | null>(null);
  const [routeFingerprint, setRouteFingerprint] = useState<string | null>(null);
  const [downsampledCoords, setDownsampledCoords] =
    useState<Array<[number, number]> | null>(null);
  const [evolutionCount, setEvolutionCount] = useState<number | null>(null);
  const [saveMode, setSaveMode] = useState<MintSaveMode | null>(null);
  const [uploadOutcome, setUploadOutcome] = useState<UploadOutcome | null>(null);
  const savedParsedRef = useRef<ParsedGpxStats | null>(null);

  const resetParsedState = useCallback(() => {
    setParsedStats(null);
    setRunType(null);
    setNormalizedStats(null);
    setRarityTier(null);
    setRunName(null);
    setRunNumber(null);
    setIsFirstOnRoute(null);
    setRouteFingerprint(null);
    setDownsampledCoords(null);
    setEvolutionCount(null);
    setSaveMode(null);
    setUploadOutcome(null);
    savedParsedRef.current = null;
  }, []);

  useEffect(() => {
    if (savedParsedRef.current === parsedStats) return;
    if (!parsedStats) return;
    if (!runType || !rarityTier || !normalizedStats || !runName) return;
    if (runNumber == null || isFirstOnRoute == null) return;
    if (routeFingerprint == null || downsampledCoords == null) return;
    if (saveMode == null || evolutionCount == null) return;

    savedParsedRef.current = parsedStats;

    if (saveMode.kind === "new") {
      saveCard({
        runName,
        runType,
        rarity: rarityTier,
        stats: normalizedStats,
        coordinates: downsampledCoords,
        routeFingerprint,
        isFirstOnRoute,
        createdAt: Date.now(),
        evolutionCount: 0,
      }).catch((err) => console.warn("Failed to save card", err));
    } else {
      evolveCard(saveMode.id, {
        stats: normalizedStats,
        rarity: rarityTier,
        coordinates: downsampledCoords,
        routeFingerprint,
        evolutionCount,
        evolvedAt: Date.now(),
      }).catch((err) => console.warn("Failed to evolve card", err));
    }
  }, [
    parsedStats,
    runType,
    rarityTier,
    normalizedStats,
    runName,
    runNumber,
    isFirstOnRoute,
    routeFingerprint,
    downsampledCoords,
    saveMode,
    evolutionCount,
  ]);

  const handleGpxText = useCallback(
    async (text: string, sourceName: string) => {
      try {
        const result = await mintCardFromGpx(text, sourceName);
        if (result.kind === "no-improvement") {
          resetParsedState();
          setUploadOutcome({
            kind: "no-improvement",
            fileName: result.sourceName,
          });
          setStatus({ kind: "idle" });
          return;
        }

        setParsedStats(result.parsed);
        setRunType(result.runType);
        setNormalizedStats(result.normalized);
        setRarityTier(result.rarity);
        setRunName(result.runName);
        setDownsampledCoords(result.downsampledCoords);
        setRouteFingerprint(result.routeFingerprint);
        setIsFirstOnRoute(result.isFirstOnRoute);
        setRunNumber(result.runNumber);
        setEvolutionCount(result.evolutionCount);
        setSaveMode(result.saveMode);
        setUploadOutcome(result.outcome);
        setStatus({ kind: "success", fileName: sourceName });
      } catch (err) {
        resetParsedState();
        setStatus({
          kind: "error",
          message: `Couldn't read the run: ${
            err instanceof Error ? err.message : "unknown error"
          }`,
        });
      }
    },
    [resetParsedState]
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!isGpxFile(file)) {
        resetParsedState();
        setStatus({
          kind: "error",
          message: `"${file.name}" isn't a .gpx file. Please upload a GPX export from your run.`,
        });
        return;
      }

      if (file.size > MAX_GPX_FILE_BYTES) {
        resetParsedState();
        setStatus({
          kind: "error",
          message: `"${file.name}" is too large. Maximum GPX size is ${Math.round(MAX_GPX_FILE_BYTES / (1024 * 1024))} MB.`,
        });
        return;
      }

      setStatus({ kind: "loading", message: "Reading your GPX…" });
      let text: string;
      try {
        text = await readFileAsText(file);
      } catch (err) {
        resetParsedState();
        setStatus({
          kind: "error",
          message: `Couldn't read the file: ${
            err instanceof Error ? err.message : "unknown error"
          }`,
        });
        return;
      }
      await handleGpxText(text, file.name);
    },
    [handleGpxText, resetParsedState]
  );

  const handleStravaImport = useCallback(
    async (text: string, sourceName: string) => {
      setStatus({ kind: "loading", message: "Minting a card from Strava…" });
      await handleGpxText(text, sourceName);
    },
    [handleGpxText]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  const baseBorder = isDragging
    ? "border-emerald-400 bg-emerald-400/5"
    : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]";

  const cardProps: RunCardProps | null =
    parsedStats != null &&
    runType != null &&
    normalizedStats != null &&
    rarityTier != null &&
    runName != null &&
    runNumber != null &&
    isFirstOnRoute != null &&
    downsampledCoords != null
      ? {
          runName,
          runType,
          rarity: rarityTier,
          stats: normalizedStats,
          coordinates: downsampledCoords,
          runNumber,
          isFirstOnRoute,
        }
      : null;
  const shareCaption =
    cardProps != null
      ? buildShareCaption(
          cardProps.runName,
          cardProps.runType,
          cardProps.rarity,
          cardProps.stats,
          typeof window !== "undefined" ? window.location.origin : ""
        )
      : "";

  return (
    <div className="w-full max-w-xl">
      <input
        id={fileInputId}
        type="file"
        accept=".gpx,application/gpx+xml,application/xml,text/xml"
        className="sr-only"
        onChange={onPick}
        aria-describedby={dropZoneInstructionsId}
      />

      <label
        htmlFor={fileInputId}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-colors focus-within:ring-2 focus-within:ring-emerald-400/60 ${baseBorder}`}
      >
        <div className="text-4xl" aria-hidden>
          ↥
        </div>
        <div className="text-lg font-medium text-white">
          Drop your .gpx file here
        </div>
        <p id={dropZoneInstructionsId} className="text-sm text-white/50">
          or click here to browse — your run becomes a card
        </p>
      </label>

      <StravaImport onImportGpx={handleStravaImport} />

      {status.kind === "loading" && (
        <p
          role="status"
          className="mt-4 rounded-lg border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white/70"
        >
          {status.message}
        </p>
      )}

      {status.kind === "error" && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {status.message}
        </p>
      )}

      {status.kind === "success" && (
        <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <p>
            Loaded <span className="font-mono">{status.fileName}</span>. Card
            rendered below.
          </p>
          <Link
            href="/collection"
            className="mt-3 inline-block rounded-full border border-emerald-400/50 bg-black/25 px-4 py-1.5 text-xs font-semibold text-emerald-200 transition-colors hover:bg-black/35 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            View in collection
          </Link>
        </div>
      )}

      {uploadOutcome?.kind === "no-improvement" && (
        <div className="mt-4 rounded-lg border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white/80">
          <p className="font-semibold text-white">
            No improvement on this route yet — keep training!
          </p>
          <p className="mt-1 text-xs text-white/50">
            <span className="font-mono">{uploadOutcome.fileName}</span> didn&rsquo;t
            beat any of the existing card&rsquo;s normalized stats, so the
            collection is unchanged.
          </p>
        </div>
      )}

      {uploadOutcome?.kind === "evolved" && (
        <div className="mt-4 overflow-hidden rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-400/15 via-fuchsia-500/10 to-emerald-400/15 px-5 py-4">
          <p className="text-base font-bold tracking-tight text-white">
            ⬆️ Card Evolved!
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-amber-200">
            {STAGE_LABELS[uploadOutcome.stage]}
          </p>
          <Link
            href="/collection"
            className="mt-3 inline-block rounded-full border border-amber-300/40 bg-black/25 px-4 py-1.5 text-xs font-semibold text-amber-100 transition-colors hover:bg-black/35 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
          >
            View in collection
          </Link>
        </div>
      )}

      {cardProps != null && parsedStats != null && (
        <div className="mt-6 flex flex-col items-center gap-4">
          <RunCard {...cardProps} />

          <CardExportActions
            cardProps={cardProps}
            shareCaption={shareCaption}
          />

          <button
            type="button"
            onClick={() => setShowDebug((prev) => !prev)}
            className="text-xs uppercase tracking-widest text-white/40 underline-offset-4 hover:text-white/70 hover:underline"
          >
            {showDebug ? "Hide debug stats" : "Show debug stats"}
          </button>

          {showDebug && (
            <div className="w-full space-y-1 text-sm text-white/70">
              <p>Total distance (km): {parsedStats.totalDistanceKm.toFixed(2)}</p>
              <p>
                Total elevation gain (m):{" "}
                {Math.round(parsedStats.totalElevationGainM)}
              </p>
              <p>
                Average pace (min/km):{" "}
                {parsedStats.averagePaceMinPerKm == null
                  ? "null"
                  : parsedStats.averagePaceMinPerKm.toFixed(2)}
              </p>
              <p>
                Pace splits (min/km):{" "}
                {JSON.stringify(
                  parsedStats.paceSplitsMinPerKm.map((split) =>
                    Number(split.toFixed(2))
                  )
                )}
              </p>
              <p>
                Moving time (minutes):{" "}
                {parsedStats.movingTimeMinutes == null
                  ? "null"
                  : parsedStats.movingTimeMinutes.toFixed(2)}
              </p>
              <p>
                Heart rate average:{" "}
                {parsedStats.heartRate.average == null
                  ? "null"
                  : parsedStats.heartRate.average.toFixed(1)}
              </p>
              <p>Run type: {cardProps.runType}</p>
              <p>Rarity tier: {cardProps.rarity}</p>
              <p>Derived run name: {cardProps.runName}</p>
              <p>
                Normalized scores:{" "}
                {JSON.stringify({
                  distance: Number(cardProps.stats.distance.toFixed(1)),
                  elevation: Number(cardProps.stats.elevation.toFixed(1)),
                  pace: Number(cardProps.stats.pace.toFixed(1)),
                  consistency: Number(cardProps.stats.consistency.toFixed(1)),
                  suffer: Number(cardProps.stats.suffer.toFixed(1)),
                  novelty: Number(cardProps.stats.novelty.toFixed(1)),
                })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
