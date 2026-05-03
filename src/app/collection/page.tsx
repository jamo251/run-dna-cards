"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CardExportActions from "@/app/components/CardExportActions";
import EvolutionBadge from "@/app/components/EvolutionBadge";
import SiteNav from "@/app/components/SiteNav";
import RunCard, { type RunCardProps } from "@/app/components/RunCard";
import { getAllCards, type StoredCard } from "@/lib/cardStorage";
import type { RunType } from "@/lib/classifier";
import {
  EVOLUTION_THRESHOLD_1,
  getEvolutionStage,
} from "@/lib/evolutionConfig";
import type { RarityTier } from "@/lib/scorer";
import { buildShareCaption } from "@/lib/shareCaption";

const RUN_TYPES: RunType[] = [
  "Sprinter",
  "Mountaineer",
  "Metronome",
  "Explorer",
  "Grinder",
  "Negative Splitter",
  "Heartbreaker",
];

const RARITY_TIERS: RarityTier[] = ["Common", "Rare", "Epic", "Legendary"];

type RunTypeFilter = RunType | "All";
type RarityFilter = RarityTier | "All";

function storedToRunProps(card: StoredCard): RunCardProps {
  return {
    runName: card.runName,
    runType: card.runType,
    rarity: card.rarity,
    stats: card.stats,
    coordinates: card.coordinates,
    runNumber: card.id ?? 0,
    isFirstOnRoute: card.isFirstOnRoute,
  };
}

function CollectionCardSkeleton() {
  return (
    <div className="h-[278px] w-[198px] animate-pulse rounded-2xl border border-white/10 bg-white/[0.05]" />
  );
}

function CollectionSkeletonGrid() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading collection"
      className="grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      <span className="sr-only">Loading collection…</span>
      {Array.from({ length: 6 }, (_, i) => (
        <CollectionCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function CollectionPage() {
  const [cards, setCards] = useState<StoredCard[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [runTypeFilter, setRunTypeFilter] = useState<RunTypeFilter>("All");
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("All");
  const [selectedCard, setSelectedCard] = useState<StoredCard | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    getAllCards()
      .then((all) => {
        if (cancelled) return;
        setCards(all);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Failed to load collection", err);
        setLoadError(
          err instanceof Error ? err.message : "Couldn't load your collection."
        );
        setCards([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCloseModal = useCallback(() => {
    const el = returnFocusRef.current;
    setSelectedCard(null);
    requestAnimationFrame(() => {
      el?.focus();
    });
  }, []);

  useEffect(() => {
    if (!selectedCard) return;
    closeButtonRef.current?.focus();
  }, [selectedCard]);

  useEffect(() => {
    if (!selectedCard) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCloseModal();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedCard, handleCloseModal]);

  const filteredCards = useMemo(() => {
    if (cards == null) return [];
    return cards.filter((card) => {
      const typeOk = runTypeFilter === "All" || card.runType === runTypeFilter;
      const rarityOk = rarityFilter === "All" || card.rarity === rarityFilter;
      return typeOk && rarityOk;
    });
  }, [cards, runTypeFilter, rarityFilter]);

  const filtersActive =
    runTypeFilter !== "All" || rarityFilter !== "All";

  const modalRunProps = useMemo(
    () => (selectedCard ? storedToRunProps(selectedCard) : null),
    [selectedCard]
  );

  const modalShareCaption = useMemo(() => {
    if (!selectedCard) return "";
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return buildShareCaption(
      selectedCard.runName,
      selectedCard.runType,
      selectedCard.rarity,
      selectedCard.stats,
      origin
    );
  }, [selectedCard]);

  const isLoading = cards == null;
  const isEmpty = !isLoading && cards.length === 0;

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <SiteNav />
          <div className="flex flex-col gap-2">
            <h1
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
              id="collection-page-title"
            >
              My Collection
            </h1>
            <p className="text-sm text-white/50">
              Every run you&rsquo;ve uploaded, preserved as a card.
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

        {!isEmpty && !isLoading && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <label className="flex flex-col gap-1 text-xs uppercase tracking-widest text-white/40">
                  Type
                  <select
                    value={runTypeFilter}
                    onChange={(e) =>
                      setRunTypeFilter(e.target.value as RunTypeFilter)
                    }
                    className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm font-medium text-white focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                  >
                    <option value="All">All</option>
                    {RUN_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs uppercase tracking-widest text-white/40">
                  Rarity
                  <select
                    value={rarityFilter}
                    onChange={(e) =>
                      setRarityFilter(e.target.value as RarityFilter)
                    }
                    className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm font-medium text-white focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                  >
                    <option value="All">All</option>
                    {RARITY_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {filtersActive && (
                <button
                  type="button"
                  onClick={() => {
                    setRunTypeFilter("All");
                    setRarityFilter("All");
                  }}
                  className="rounded-lg border border-white/20 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/80 transition-colors hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                >
                  Clear filters
                </button>
              )}
            </div>
            <p className="text-xs uppercase tracking-widest text-white/40">
              Showing {filteredCards.length} of {cards!.length}
            </p>
          </div>
        )}

        {isLoading && <CollectionSkeletonGrid />}

        {isEmpty && (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-8 py-16 text-center">
            <p className="text-lg font-semibold text-white">
              Your binder is empty.
            </p>
            <p className="mt-2 text-sm text-white/50">
              Upload a GPX file to mint your first card.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-full border border-white/20 bg-white/[0.04] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
            >
              Upload a run
            </Link>
          </div>
        )}

        {!isLoading && !isEmpty && filteredCards.length === 0 && (
          <p className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/60">
            No cards match these filters yet.
          </p>
        )}

        {!isLoading && filteredCards.length > 0 && (
          <div className="grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={(e) => {
                  returnFocusRef.current = e.currentTarget;
                  setSelectedCard(card);
                }}
                className="group relative h-[278px] w-[198px] overflow-hidden rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                aria-label={`Open ${card.runName}`}
              >
                <div
                  style={{
                    transform: "scale(0.55)",
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
                {card.evolutionCount >= EVOLUTION_THRESHOLD_1 && (
                  <EvolutionBadge
                    stage={getEvolutionStage(card.evolutionCount)}
                    className="absolute top-2 right-2 z-10"
                  />
                )}
                <span className="pointer-events-none absolute inset-0 rounded-2xl ring-0 transition group-hover:ring-2 group-hover:ring-emerald-400/40" />
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedCard && modalRunProps && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="collection-card-detail-title"
          className="fixed inset-0 z-50 flex max-h-[100dvh] items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center sm:overflow-visible"
          onClick={handleCloseModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative my-4 flex w-full max-w-lg flex-col items-center gap-4 sm:my-0"
          >
            <h2
              id="collection-card-detail-title"
              className="max-w-full truncate px-2 text-center text-base font-semibold text-white sm:text-lg"
              title={selectedCard.runName}
            >
              {selectedCard.runName}
            </h2>

            <RunCard {...modalRunProps} />

            <CardExportActions
              cardProps={modalRunProps}
              shareCaption={modalShareCaption}
            />

            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleCloseModal}
              className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
