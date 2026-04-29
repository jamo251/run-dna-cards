"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import EvolutionBadge from "@/app/components/EvolutionBadge";
import RunCard from "@/app/components/RunCard";
import { getAllCards, type StoredCard } from "@/lib/cardStorage";
import type { RunType } from "@/lib/classifier";
import {
  EVOLUTION_THRESHOLD_1,
  getEvolutionStage,
} from "@/lib/evolutionConfig";
import type { RarityTier } from "@/lib/scorer";

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

export default function CollectionPage() {
  const [cards, setCards] = useState<StoredCard[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [runTypeFilter, setRunTypeFilter] = useState<RunTypeFilter>("All");
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("All");
  const [selectedCard, setSelectedCard] = useState<StoredCard | null>(null);

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

  const closeModal = useCallback(() => setSelectedCard(null), []);

  useEffect(() => {
    if (!selectedCard) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedCard, closeModal]);

  const filteredCards = useMemo(() => {
    if (cards == null) return [];
    return cards.filter((card) => {
      const typeOk = runTypeFilter === "All" || card.runType === runTypeFilter;
      const rarityOk = rarityFilter === "All" || card.rarity === rarityFilter;
      return typeOk && rarityOk;
    });
  }, [cards, runTypeFilter, rarityFilter]);

  const isLoading = cards == null;
  const isEmpty = !isLoading && cards.length === 0;

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <Link
            href="/"
            className="self-start text-sm font-medium text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            ← Back to upload
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            My Collection
          </h1>
          <p className="text-sm text-white/50">
            Every run you&rsquo;ve uploaded, preserved as a card.
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

        {!isEmpty && !isLoading && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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
            <p className="text-xs uppercase tracking-widest text-white/40">
              Showing {filteredCards.length} of {cards.length}
            </p>
          </div>
        )}

        {isLoading && (
          <p className="text-sm text-white/50">Loading collection…</p>
        )}

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
                onClick={() => setSelectedCard(card)}
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

      {selectedCard && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedCard.runName} card`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col items-center gap-3"
          >
            <RunCard
              runName={selectedCard.runName}
              runType={selectedCard.runType}
              rarity={selectedCard.rarity}
              stats={selectedCard.stats}
              coordinates={selectedCard.coordinates}
              runNumber={selectedCard.id ?? 0}
              isFirstOnRoute={selectedCard.isFirstOnRoute}
            />
            <button
              type="button"
              onClick={closeModal}
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
