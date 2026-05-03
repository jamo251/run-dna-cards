"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import SiteNav from "@/app/components/SiteNav";
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

function mergeSelectedIntoRoster(
  roster: StoredCard[],
  all: StoredCard[] | null,
  selectedId: number | null
): StoredCard[] {
  if (!all || selectedId == null) return roster;
  if (roster.some((c) => c.id === selectedId)) return roster;
  const sel = all.find((c) => c.id === selectedId);
  return sel ? [sel, ...roster] : roster;
}

function BattleRosterSkeleton() {
  return (
    <section
      className="grid grid-cols-1 gap-6 md:grid-cols-2"
      role="status"
      aria-label="Loading roster"
    >
      <span className="sr-only">Loading roster…</span>
      {[0, 1].map((slot) => (
        <div key={slot} className="flex flex-col gap-3">
          <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
          <div className="h-[320px] max-h-[440px] animate-pulse rounded-xl border border-white/10 bg-white/[0.03] md:h-[440px]" />
        </div>
      ))}
    </section>
  );
}

export default function BattlePage() {
  const [cards, setCards] = useState<StoredCard[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedAId, setSelectedAId] = useState<number | null>(null);
  const [selectedBId, setSelectedBId] = useState<number | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [revealedRounds, setRevealedRounds] = useState(0);
  const [rosterQuery, setRosterQuery] = useState("");
  const [compactRoster, setCompactRoster] = useState(false);

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

  const rosterFiltered = useMemo(() => {
    if (!cards?.length) return [];
    const q = rosterQuery.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) => c.runName.toLowerCase().includes(q));
  }, [cards, rosterQuery]);

  const rosterWithSelectionA = useMemo(
    () => mergeSelectedIntoRoster(rosterFiltered, cards, selectedAId),
    [rosterFiltered, cards, selectedAId]
  );
  const rosterWithSelectionB = useMemo(
    () => mergeSelectedIntoRoster(rosterFiltered, cards, selectedBId),
    [rosterFiltered, cards, selectedBId]
  );

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
        <header className="flex flex-col gap-4">
          <SiteNav />
          <div className="flex flex-col gap-2">
            <h1
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
              id="battle-page-title"
            >
              Card Battle
            </h1>
            <p className="text-sm text-white/50">
              Pick two cards, compare every stat, and crown a winner.
            </p>
          </div>
        </header>

        {loadError && (
          <p
            role="alert"
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {loadError}
          </p>
        )}

        {isLoading && <BattleRosterSkeleton />}

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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <label className="flex w-full flex-col gap-1 text-xs uppercase tracking-widest text-white/40 sm:max-w-sm">
                Filter roster by name
                <input
                  type="search"
                  value={rosterQuery}
                  onChange={(e) => setRosterQuery(e.target.value)}
                  placeholder="Search run names…"
                  className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm font-medium text-white placeholder:text-white/30 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                />
              </label>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <button
                  type="button"
                  onClick={() => setCompactRoster((c) => !c)}
                  className="rounded-lg border border-white/20 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                >
                  {compactRoster ? "Gallery view" : "Compact list"}
                </button>
                {rosterQuery.trim() !== "" && cards != null && (
                  <p className="text-xs text-white/45">
                    {rosterFiltered.length} of {cards.length} cards match
                  </p>
                )}
              </div>
            </div>

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <SelectorPanel
                title="Card A"
                cards={rosterWithSelectionA}
                allCards={cards}
                compact={compactRoster}
                selectedId={selectedAId}
                otherSelectedId={selectedBId}
                otherSideTitle="Card B"
                onSelect={(id) => handleSelect("a", id)}
              />
              <SelectorPanel
                title="Card B"
                cards={rosterWithSelectionB}
                allCards={cards}
                compact={compactRoster}
                selectedId={selectedBId}
                otherSelectedId={selectedAId}
                otherSideTitle="Card A"
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
  /** Full roster — used only for contextual hint when thumbnails are omitted by filter */
  allCards: StoredCard[];
  compact: boolean;
  selectedId: number | null;
  otherSelectedId: number | null;
  otherSideTitle: string;
  onSelect: (id: number) => void;
};

function SelectorPanel({
  title,
  cards,
  allCards,
  compact,
  selectedId,
  otherSelectedId,
  otherSideTitle,
  onSelect,
}: SelectorPanelProps) {
  const otherTakenName =
    typeof otherSelectedId === "number"
      ? (allCards.find((c) => c.id === otherSelectedId)?.runName ??
        otherSideTitle)
      : otherSideTitle;

  if (compact) {
    const optionCards = [...cards].sort((a, b) =>
      (a.runName ?? "").localeCompare(b.runName ?? "", undefined, {
        sensitivity: "base",
      })
    );

    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
          {title}
        </h2>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4">
          {optionCards.length === 0 ? (
            <p className="text-sm text-white/55">
              No cards match your search. Clear the roster filter above.
            </p>
          ) : (
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-widest text-white/40">
                Choose a card
              </span>
              <select
                value={
                  typeof selectedId === "number"
                    ? String(selectedId)
                    : ""
                }
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") return;
                  const n = Number(raw);
                  if (Number.isNaN(n)) return;
                  onSelect(n);
                }}
                aria-label={`Select roster card for ${title}`}
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm font-medium text-white focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              >
                <option value="">Select a card…</option>
                {optionCards
                  .filter(
                    (
                      card
                    ): card is StoredCard & { id: number } =>
                      typeof card.id === "number"
                  )
                  .map((card) => {
                  const sid = card.id;
                  const isTaken = sid === otherSelectedId;
                  const labelSuffix = ` (#${sid})`;
                  const optionLabel = `${card.runName}${labelSuffix}${
                    isTaken ? ` — already in ${otherSideTitle}` : ""
                  }`;
                  return (
                    <option
                      key={sid}
                      value={String(sid)}
                      disabled={isTaken}
                      title={
                        isTaken
                          ? `Already chosen for ${otherSideTitle}`
                          : undefined
                      }
                    >
                      {optionLabel}
                    </option>
                  );
                })}
              </select>
            </label>
          )}
          {typeof otherSelectedId === "number" && (
            <p className="mt-3 text-xs text-white/45">
              A card highlighted for {otherSideTitle} slot can&rsquo;t be
              selected here.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
        {title}
      </h2>
      <div className="max-h-[440px] overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-3">
        {cards.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-white/55">
            No cards match your search. Clear the roster filter above.
          </p>
        ) : (
          <div className="flex flex-wrap items-start justify-center gap-3">
            {cards.map((card) => {
              const isSelected = card.id === selectedId;
              const isTakenByOther =
                typeof card.id === "number" &&
                card.id === otherSelectedId;
              const unavailableTitle = isTakenByOther
                ? `. Already chosen for ${otherTakenName}`
                : "";
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() =>
                    typeof card.id === "number" && onSelect(card.id)
                  }
                  disabled={isTakenByOther}
                  aria-pressed={isSelected}
                  title={
                    `${card.runName}${unavailableTitle}`.trim() ||
                    undefined
                  }
                  className={`relative h-[202px] w-[144px] overflow-hidden rounded-xl transition-opacity focus:outline-none focus:ring-2 focus:ring-emerald-400/60 ${
                    isSelected ? "ring-2 ring-emerald-400/70" : ""
                  } ${
                    isTakenByOther
                      ? "cursor-not-allowed opacity-30 hover:opacity-40"
                      : "hover:opacity-100"
                  }`}
                  aria-label={
                    isTakenByOther
                      ? `${card.runName}, unavailable — already chosen for ${otherTakenName}`
                      : `Select ${card.runName}`
                  }
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
                  {isTakenByOther && (
                    <span className="absolute bottom-1 left-1 right-1 rounded-md bg-black/70 px-1 py-1 text-[9px] font-bold uppercase tracking-wide text-white/90">
                      In {otherSideTitle}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
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
