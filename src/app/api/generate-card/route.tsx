import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import type { NextRequest } from "next/server";
import satori from "satori";
import type { RunType } from "@/lib/classifier";
import { coordinatesToPath } from "@/lib/coordinatesToPath";
import type { NormalizedStats, RarityTier } from "@/lib/scorer";

export const runtime = "nodejs";

const CARD_WIDTH = 630;
const CARD_HEIGHT = 880;
const HERO_VIEWBOX_WIDTH = 510;
const HERO_VIEWBOX_HEIGHT = 348;

type RunTypeAccentRaw = {
  badgeBg: string;
  badgeText: string;
  barFill: string;
};

type RarityBorderRaw = {
  border: string;
  ring: string;
  stamp: string;
};

const RUN_TYPE_ACCENTS_RAW: Record<RunType, RunTypeAccentRaw> = {
  Sprinter: {
    badgeBg: "rgba(244,63,94,0.15)",
    badgeText: "#fda4af",
    barFill: "#fb7185",
  },
  Mountaineer: {
    badgeBg: "rgba(251,191,36,0.15)",
    badgeText: "#fcd34d",
    barFill: "#fbbf24",
  },
  Metronome: {
    badgeBg: "rgba(34,211,238,0.15)",
    badgeText: "#67e8f9",
    barFill: "#22d3ee",
  },
  Explorer: {
    badgeBg: "rgba(52,211,153,0.15)",
    badgeText: "#6ee7b7",
    barFill: "#34d399",
  },
  Grinder: {
    badgeBg: "rgba(148,163,184,0.20)",
    badgeText: "#e2e8f0",
    barFill: "#cbd5e1",
  },
  "Negative Splitter": {
    badgeBg: "rgba(16,185,129,0.15)",
    badgeText: "#6ee7b7",
    barFill: "#10b981",
  },
  Heartbreaker: {
    badgeBg: "rgba(236,72,153,0.15)",
    badgeText: "#f9a8d4",
    barFill: "#ec4899",
  },
};

const RARITY_BORDERS_RAW: Record<RarityTier, RarityBorderRaw> = {
  Common: {
    border: "#71717a",
    ring: "rgba(113,113,122,0.20)",
    stamp: "rgba(212,212,216,0.80)",
  },
  Rare: {
    border: "#38bdf8",
    ring: "rgba(56,189,248,0.30)",
    stamp: "rgba(125,211,252,0.80)",
  },
  Epic: {
    border: "#a78bfa",
    ring: "rgba(167,139,250,0.30)",
    stamp: "rgba(196,181,253,0.80)",
  },
  Legendary: {
    border: "#fbbf24",
    ring: "rgba(251,191,36,0.30)",
    stamp: "rgba(252,211,77,0.80)",
  },
};

let interRegularBuffer: ArrayBuffer | null = null;
let interBoldBuffer: ArrayBuffer | null = null;

async function getInterFonts() {
  if (!interRegularBuffer) {
    const regularFontBuffer = await readFile(
      join(process.cwd(), "assets/fonts/Inter-Regular.ttf"),
    );
    interRegularBuffer = regularFontBuffer.buffer.slice(
      regularFontBuffer.byteOffset,
      regularFontBuffer.byteOffset + regularFontBuffer.byteLength,
    );
  }
  if (!interBoldBuffer) {
    const boldFontBuffer = await readFile(
      join(process.cwd(), "assets/fonts/Inter-Bold.ttf"),
    );
    interBoldBuffer = boldFontBuffer.buffer.slice(
      boldFontBuffer.byteOffset,
      boldFontBuffer.byteOffset + boldFontBuffer.byteLength,
    );
  }

  return [
    {
      name: "Inter",
      data: interRegularBuffer,
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: "Inter",
      data: interBoldBuffer,
      weight: 700 as const,
      style: "normal" as const,
    },
  ];
}

type CardPayload = {
  runName: string;
  runType: RunType;
  rarity: RarityTier;
  stats: NormalizedStats;
  coordinates: Array<[number, number]>;
  runNumber: number;
  isFirstOnRoute: boolean;
};

function isCardPayload(value: unknown): value is CardPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.runName !== "string") return false;
  if (typeof v.runType !== "string") return false;
  if (!(v.runType in RUN_TYPE_ACCENTS_RAW)) return false;
  if (typeof v.rarity !== "string") return false;
  if (!(v.rarity in RARITY_BORDERS_RAW)) return false;
  if (typeof v.runNumber !== "number") return false;
  if (typeof v.isFirstOnRoute !== "boolean") return false;
  if (!Array.isArray(v.coordinates)) return false;
  if (typeof v.stats !== "object" || v.stats === null) return false;

  const stats = v.stats as Record<string, unknown>;
  const expected = [
    "distance",
    "elevation",
    "pace",
    "consistency",
    "suffer",
    "novelty",
  ];
  return expected.every((key) => typeof stats[key] === "number");
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function padRunNumber(runNumber: number): string {
  const safe = Math.max(0, Math.floor(runNumber));
  return safe.toString().padStart(3, "0");
}

function StatCell({
  label,
  score,
  barFill,
}: {
  label: string;
  score: number;
  barFill: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flex: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 2,
            color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "white",
          }}
        >
          {Math.round(score)}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          width: "100%",
          height: 4,
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.1)",
        }}
      >
        <div
          style={{
            height: 4,
            width: `${score}%`,
            borderRadius: 999,
            backgroundColor: barFill,
          }}
        />
      </div>
    </div>
  );
}

function CardLayout({
  payload,
  pathD,
}: {
  payload: CardPayload;
  pathD: string;
}) {
  const accent = RUN_TYPE_ACCENTS_RAW[payload.runType];
  const rarity = RARITY_BORDERS_RAW[payload.rarity];
  const stats = [
    { label: "Distance", score: clampScore(payload.stats.distance) },
    { label: "Elevation", score: clampScore(payload.stats.elevation) },
    { label: "Pace", score: clampScore(payload.stats.pace) },
    { label: "Consistency", score: clampScore(payload.stats.consistency) },
    { label: "Suffer", score: clampScore(payload.stats.suffer) },
    { label: "Novelty", score: clampScore(payload.stats.novelty) },
  ];

  return (
    <div
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: "#1a1a2e",
        border: `4px solid ${rarity.border}`,
        boxShadow: `0 0 0 8px ${rarity.ring}`,
        borderRadius: 28,
        padding: 36,
        display: "flex",
        flexDirection: "column",
        gap: 22,
        color: "white",
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: 396,
          backgroundColor: "rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 20,
          padding: 24,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={HERO_VIEWBOX_WIDTH}
          height={HERO_VIEWBOX_HEIGHT}
          viewBox={`0 0 ${HERO_VIEWBOX_WIDTH} ${HERO_VIEWBOX_HEIGHT}`}
        >
          <path
            d={pathD}
            stroke="white"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span
          style={{
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: -1,
            color: "white",
            lineHeight: 1.1,
          }}
        >
          {payload.runName}
        </span>
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            paddingLeft: 14,
            paddingRight: 14,
            paddingTop: 6,
            paddingBottom: 6,
            borderRadius: 999,
            backgroundColor: accent.badgeBg,
            color: accent.badgeText,
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          {payload.runType}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          flex: 1,
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
          {stats.slice(0, 3).map((stat) => (
            <StatCell
              key={stat.label}
              label={stat.label}
              score={stat.score}
              barFill={accent.barFill}
            />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
          {stats.slice(3, 6).map((stat) => (
            <StatCell
              key={stat.label}
              label={stat.label}
              score={stat.score}
              barFill={accent.barFill}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: 2,
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
          }}
        >
          Run {padRunNumber(payload.runNumber)}/365
        </span>
        {payload.isFirstOnRoute && (
          <div
            style={{
              display: "flex",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 4,
              paddingLeft: 8,
              paddingRight: 8,
              paddingTop: 3,
              paddingBottom: 3,
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: 2,
              color: rarity.stamp,
              textTransform: "uppercase",
            }}
          >
            1st Edition
          </div>
        )}
      </div>
    </div>
  );
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isCardPayload(payload)) {
    return Response.json({ error: "Invalid card payload" }, { status: 400 });
  }

  const pathD = coordinatesToPath(
    payload.coordinates,
    HERO_VIEWBOX_WIDTH,
    HERO_VIEWBOX_HEIGHT,
  );
  const cardElement = <CardLayout payload={payload} pathD={pathD} />;

  try {
    const fonts = await getInterFonts();
    const svg = await satori(cardElement, {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      fonts,
    });

    const png = await sharp(Buffer.from(svg)).png().toBuffer();

    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Card generation failed:", err);
    return Response.json(
      {
        error: err instanceof Error ? err.message : "Card generation failed",
      },
      { status: 500 },
    );
  }
}
