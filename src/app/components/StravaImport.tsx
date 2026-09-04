"use client";

import { useCallback, useEffect, useState } from "react";
import type { ImportableRun } from "@/lib/strava/activities";

type StravaStatus = {
  connected: boolean;
  configured: boolean;
};

type Props = {
  onImportGpx: (gpxText: string, sourceName: string) => Promise<void>;
};

function formatDistanceKm(km: number): string {
  return `${km.toFixed(2)} km`;
}

function formatMovingTime(minutes: number): string {
  const totalMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins} min`;
  return `${hours}h ${mins}m`;
}

function formatStartDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function readStravaQuery(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("strava");
}

function messageForStravaQuery(query: string | null): string | null {
  if (query === "denied") return "Strava access was denied.";
  if (query === "error") return "Could not connect to Strava. Try again.";
  if (query === "not-configured") {
    return "Strava import isn’t configured on this server. Upload a GPX file instead.";
  }
  if (query === "connected") return null;
  return null;
}

function clearStravaQuery(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("strava")) return;
  url.searchParams.delete("strava");
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

async function fetchStravaStatus(): Promise<StravaStatus> {
  const response = await fetch("/api/strava/status", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not check Strava connection.");
  }
  return (await response.json()) as StravaStatus;
}

async function fetchImportableRuns(): Promise<
  | { kind: "ok"; activities: ImportableRun[] }
  | { kind: "unauthorized" }
> {
  const response = await fetch("/api/strava/activities", {
    cache: "no-store",
  });
  if (response.status === 401) {
    return { kind: "unauthorized" };
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "Could not load Strava runs.");
  }
  const body = (await response.json()) as { activities?: ImportableRun[] };
  return {
    kind: "ok",
    activities: Array.isArray(body.activities) ? body.activities : [],
  };
}

export default function StravaImport({ onImportGpx }: Props) {
  const [status, setStatus] = useState<StravaStatus | null>(null);
  const [activities, setActivities] = useState<ImportableRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const callbackError = messageForStravaQuery(readStravaQuery());
      clearStravaQuery();

      try {
        const next = await fetchStravaStatus();
        if (cancelled) return;
        if (callbackError) setError(callbackError);
        setStatus(next);
        if (!next.connected) {
          setActivities([]);
          return;
        }

        setLoadingList(true);
        try {
          const result = await fetchImportableRuns();
          if (cancelled) return;
          if (result.kind === "unauthorized") {
            setStatus({ connected: false, configured: next.configured });
            setActivities([]);
            setError("Strava session expired. Connect again to import a run.");
            return;
          }
          setActivities(result.activities);
        } finally {
          if (!cancelled) setLoadingList(false);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not check Strava.");
        setStatus({ connected: false, configured: false });
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const onDisconnect = useCallback(async () => {
    setError(null);
    const response = await fetch("/api/strava/disconnect", { method: "POST" });
    if (!response.ok) {
      setError("Could not disconnect Strava.");
      return;
    }
    setStatus((prev) =>
      prev ? { ...prev, connected: false } : { connected: false, configured: true }
    );
    setActivities([]);
  }, []);

  const onImport = useCallback(
    async (activity: ImportableRun) => {
      setError(null);
      setImportingId(activity.id);
      try {
        const response = await fetch(`/api/strava/activities/${activity.id}/gpx`, {
          cache: "no-store",
        });
        if (response.status === 401) {
          setStatus((prev) =>
            prev
              ? { ...prev, connected: false }
              : { connected: false, configured: true }
          );
          setError("Strava session expired. Connect again to import a run.");
          return;
        }
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? "Could not import that run.");
        }
        const gpxText = await response.text();
        await onImportGpx(gpxText, activity.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not import that run.");
      } finally {
        setImportingId(null);
      }
    },
    [onImportGpx]
  );

  const connected = status?.connected === true;

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Import from Strava</h2>
          <p className="mt-1 text-xs text-white/50">
            Connect once, pick a recent run, and we turn it into GPX on this
            device.
          </p>
        </div>
        {connected ? (
          <button
            type="button"
            onClick={() => {
              void onDisconnect();
            }}
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/70 transition-colors hover:border-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            Disconnect
          </button>
        ) : (
          <a
            href="/api/strava/authorize"
            className="inline-flex items-center justify-center rounded-full bg-[#FC4C02] px-4 py-1.5 text-xs font-bold tracking-wide text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#FC4C02]/70"
          >
            Connect with Strava
          </a>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200"
        >
          {error}
        </p>
      )}

      {connected && (
        <div className="mt-4">
          {loadingList && activities == null && (
            <p className="text-xs text-white/50">Loading recent runs…</p>
          )}
          {activities != null && activities.length === 0 && !loadingList && (
            <p className="text-xs text-white/50">
              No recent GPS runs found. Upload a GPX file instead.
            </p>
          )}
          {activities != null && activities.length > 0 && (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {activities.map((activity) => {
                const busy = importingId === activity.id;
                return (
                  <li
                    key={activity.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {activity.name}
                      </p>
                      <p className="mt-0.5 text-xs text-white/45">
                        {formatStartDate(activity.startDate)} ·{" "}
                        {formatDistanceKm(activity.distanceKm)} ·{" "}
                        {formatMovingTime(activity.movingTimeMinutes)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={importingId != null}
                      onClick={() => {
                        void onImport(activity);
                      }}
                      className="shrink-0 rounded-full border border-emerald-400/50 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-400/20 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? "Importing…" : "Import"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <p className="mt-4 text-[10px] uppercase tracking-widest text-white/30">
        Powered by Strava
      </p>
    </section>
  );
}
