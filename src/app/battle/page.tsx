"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import RunCard from "@/app/components/RunCard";
import {
  STAT_KEYS,
  battleAll,
  type BattleResult,
} from "@/lib/battleEngine";
import { getAllCards, type StoredCard } from "@/lib/cardStorage";
import type { NormalizedStats } from "@/lib/scorer";

const STAT_LABELS: Record<keyof NormalizedStats, string> = {
  distance: "Distance",
  elevation: "Elevation",
  pace: "Pace",
  consistency: "Consistency",
  suffer: "Suffer",
  novelty: "Novelty",
};

const TIEBREAKER_LABELS: Record<
  NonNullable<BattleResult["tiebreaker"]>,
  string
> = {
  rarity: "Decided by rarity",
  evolution: "Decided by evolution",
  seniority: "Decided by seniority",
};

const REVEAL_INTERVAL_MS = 300;

type Side = "a" | "b";

export default function BattlePage() {
  const [cards, setCards] = useState<StoredCard[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedAId, setSelectedAId] = useState<number | null>(null);
  const [selectedBId, setSelectedBId] = useState<number | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [revealedRounds, setRevealedRounds] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getAllCards()
      .then((rows) => {
        if (cancelled) return;
        setCards(rows);
        setSelectedAId(rows[0]?.id ?? null);
        setSelectedBId(rows[1]?.id ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Failed to load battle roster", err);
        setLoadError(
          err instanceof Error ? err.message : "Couldn't load your collection."
        );
        setCards([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!battleResult) return;
    if (revealedRounds >= STAT_KEYS.length) return;
    const t = setTimeout(() => {
      setRevealedRounds((n) => n + 1);
    }, REVEAL_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [battleResult, revealedRounds]);

  const cardA = useMemo(
    () => cards?.find((c) => c.id === selectedAId) ?? null,
    [cards, selectedAId]
  );
  const cardB = useMemo(
    () => cards?.find((c) => c.id === selectedBId) ?? null,
    [cards, selectedBId]
  );

  const canBattle =
    cardA != null && cardB != null && cardA.id !== cardB.id;
  const isRevealing =
    battleResult != null && revealedRounds < STAT_KEYS.length;
  const isFullyRevealed =
    battleResult != null && revealedRounds >= STAT_KEYS.length;

  const handleSelect = useCallback((side: Side, id: number) => {
    if (side === "a") setSelectedAId(id);
    else setSelectedBId(id);
    setBattleResult(null);
    setRevealedRounds(0);
  }, []);

  const handleBattle = useCallback(() => {
    if (!canBattle || cardA == null || cardB == null) return;
    setBattleResult(battleAll(cardA, cardB));
    setRevealedRounds(0);
  }, [canBattle, cardA, cardB]);

  const handleRematch = useCallback(() => {
    setBattleResult(null);
    setRevealedRounds(0);
  }, []);

  const isLoading = cards == null;
  const tooFewCards = !isLoading && cards.length < 2;

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <Link
            href="/"
            className="self-start text-sm font-medium text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            ← Back to upload
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Card Battle
          </h1>
          <p className="text-sm text-white/50">
            Pick two cards, compare every stat, and crown a winner.
          </p>
        </header>

        {loadError && (
          <p
            role="alert"
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {loadError}
          </p>
        )}

        {isLoading && (
          <p className="text-sm text-white/50">Loading collection…</p>
        )}

        {tooFewCards && (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-8 py-16 text-center">
            <p className="text-lg font-semibold text-white">
              You need at least 2 cards to battle.
            </p>
            <p className="mt-2 text-sm text-white/50">
              Upload more runs to fill your roster.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-full border border-white/20 bg-white/[0.04] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
            >
              Upload a run
            </Link>
          </div>
        )}

        {!isLoading && !tooFewCards && (
          <>
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <SelectorPanel
                title="Card A"
                cards={cards}
                selectedId={selectedAId}
                otherSelectedId={selectedBId}
                onSelect={(id) => handleSelect("a", id)}
              />
              <SelectorPanel
                title="Card B"
                cards={cards}
                selectedId={selectedBId}
                otherSelectedId={selectedAId}
                onSelect={(id) => handleSelect("b", id)}
              />
            </section>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleBattle}
                disabled={!canBattle || isRevealing}
                className="rounded-full border border-white/25 bg-white/[0.06] px-6 py-3 text-base font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/[0.12] focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ⚔️ Battle!
              </button>
            </div>

            {battleResult && cardA && cardB && (
              <BattleReveal
                cardA={cardA}
                cardB={cardB}
                result={battleResult}
                revealedRounds={revealedRounds}
                isFullyRevealed={isFullyRevealed}
                onRematch={handleRematch}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

type SelectorPanelProps = {
  title: string;
  cards: StoredCard[];
  selectedId: number | null;
  otherSelectedId: number | null;
  onSelect: (id: number) => void;
};

function SelectorPanel({
  title,
  cards,
  selectedId,
  otherSelectedId,
  onSelect,
}: SelectorPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
        {title}
      </h2>
      <div className="max-h-[440px] overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <div className="flex flex-wrap items-start justify-center gap-3">
          {cards.map((card) => {
            const isSelected = card.id === selectedId;
            const isTakenByOther = card.id === otherSelectedId;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() =>
                  typeof card.id === "number" && onSelect(card.id)
                }
                disabled={isTakenByOther}
                aria-pressed={isSelected}
                className={`relative h-[202px] w-[144px] overflow-hidden rounded-xl transition-opacity focus:outline-none focus:ring-2 focus:ring-emerald-400/60 ${
                  isSelected ? "ring-2 ring-emerald-400/70" : ""
                } ${isTakenByOther ? "cursor-not-allowed opacity-30" : "hover:opacity-100"}`}
                aria-label={`Select ${card.runName}`}
              >
                <div
                  style={{
                    transform: "scale(0.4)",
                    transformOrigin: "top left",
                    width: 360,
                    height: 504,
                  }}
                >
                  <RunCard
                    runName={card.runName}
                    runType={card.runType}
                    rarity={card.rarity}
                    stats={card.stats}
                    coordinates={card.coordinates}
                    runNumber={card.id ?? 0}
                    isFirstOnRoute={card.isFirstOnRoute}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type BattleRevealProps = {
  cardA: StoredCard;
  cardB: StoredCard;
  result: BattleResult;
  revealedRounds: number;
  isFullyRevealed: boolean;
  onRematch: () => void;
};

function BattleReveal({
  cardA,
  cardB,
  result,
  revealedRounds,
  isFullyRevealed,
  onRematch,
}: BattleRevealProps) {
  const winnerCard =
    result.overallWinner === "a"
      ? cardA
      : result.overallWinner === "b"
        ? cardB
        : null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="mb-4 grid grid-cols-3 gap-3 text-xs font-semibold uppercase tracking-widest text-white/40">
        <span className="truncate text-left text-white/70">{cardA.runName}</span>
        <span className="text-center">Stat</span>
        <span className="truncate text-right text-white/70">{cardB.runName}</span>
      </div>

      <ul className="flex flex-col gap-2">
        {result.rounds.map((round, index) => {
          const revealed = index < revealedRounds;
          const aWins = revealed && round.winner === "a";
          const bWins = revealed && round.winner === "b";
          const isDraw = revealed && round.winner === "draw";

          return (
            <li
              key={round.stat}
              className={`grid grid-cols-3 items-center gap-3 rounded-lg border px-4 py-3 transition-opacity ${
                revealed
                  ? "border-white/10 bg-black/20 opacity-100"
                  : "border-white/5 bg-black/10 opacity-50"
              }`}
            >
              <span
                className={`text-right text-lg tabular-nums ${
                  aWins
                    ? "font-bold text-emerald-300"
                    : revealed
                      ? "text-white/40"
                      : "text-white/20"
                }`}
              >
                {revealed ? Math.round(round.scoreA) : "··"}
              </span>
              <span className="text-center text-xs font-semibold uppercase tracking-widest text-white/60">
                {STAT_LABELS[round.stat]}
                {isDraw && (
                  <span className="ml-1 text-white/40" aria-label="draw">
                    =
                  </span>
                )}
              </span>
              <span
                className={`text-left text-lg tabular-nums ${
                  bWins
                    ? "font-bold text-emerald-300"
                    : revealed
                      ? "text-white/40"
                      : "text-white/20"
                }`}
              >
                {revealed ? Math.round(round.scoreB) : "··"}
              </span>
            </li>
          );
        })}
      </ul>

      {isFullyRevealed && (
        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Final score · {result.winsA} – {result.draws} – {result.winsB}
          </p>
          {winnerCard ? (
            <p className="text-2xl font-bold text-white">
              🏆 {winnerCard.runName} wins!
            </p>
          ) : (
            <p className="text-2xl font-bold text-white">It&rsquo;s a draw.</p>
          )}
          {result.tiebreaker && (
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-200">
              {TIEBREAKER_LABELS[result.tiebreaker]}
            </p>
          )}
          <button
            type="button"
            onClick={onRematch}
            className="mt-3 rounded-full border border-white/20 bg-white/[0.04] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            Rematch
          </button>
        </div>
      )}
    </section>
  );
}
