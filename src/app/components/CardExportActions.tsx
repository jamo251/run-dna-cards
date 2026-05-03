"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ShareModal from "@/app/components/ShareModal";
import type { RunCardProps } from "@/app/components/RunCard";
import {
  fetchRunCardPng,
  slugifyCardDownloadName,
} from "@/lib/fetchRunCardPng";

type DownloadStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string };

type BlobCache = { blob: Blob; url: string } | null;

type CardExportActionsProps = {
  cardProps: RunCardProps;
  shareCaption: string;
  className?: string;
};

function cardPropsFingerprint(props: RunCardProps): string {
  return JSON.stringify({
    runName: props.runName,
    runType: props.runType,
    rarity: props.rarity,
    stats: props.stats,
    coordinates: props.coordinates,
    runNumber: props.runNumber,
    isFirstOnRoute: props.isFirstOnRoute,
  });
}

export default function CardExportActions({
  cardProps,
  shareCaption,
  className,
}: CardExportActionsProps) {
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>({
    kind: "idle",
  });
  const [shareStatus, setShareStatus] = useState<DownloadStatus>({
    kind: "idle",
  });
  const [cardBlobCache, setCardBlobCache] = useState<BlobCache>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareModalKey, setShareModalKey] = useState(0);
  const cacheRef = useRef<BlobCache>(null);
  const cachedFingerprintRef = useRef<string | null>(null);

  const fingerprint = useMemo(
    () => cardPropsFingerprint(cardProps),
    [cardProps]
  );

  const revokeBlobUrl = useCallback(() => {
    if (cacheRef.current) {
      URL.revokeObjectURL(cacheRef.current.url);
      cacheRef.current = null;
    }
    cachedFingerprintRef.current = null;
    setCardBlobCache(null);
  }, []);

  useEffect(() => {
    return () => revokeBlobUrl();
  }, [revokeBlobUrl]);

  const ensureCardBlob = useCallback(async (): Promise<{
    blob: Blob;
    url: string;
  }> => {
    if (
      cacheRef.current &&
      cachedFingerprintRef.current === fingerprint
    ) {
      return cacheRef.current;
    }

    revokeBlobUrl();

    const blob = await fetchRunCardPng(cardProps);
    const url = URL.createObjectURL(blob);
    const cache = { blob, url };
    cacheRef.current = cache;
    cachedFingerprintRef.current = fingerprint;
    setCardBlobCache(cache);
    return cache;
  }, [cardProps, fingerprint, revokeBlobUrl]);

  const handleDownload = useCallback(async () => {
    setDownloadStatus({ kind: "loading" });
    try {
      const { url } = await ensureCardBlob();
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${slugifyCardDownloadName(cardProps.runName)}-card.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setDownloadStatus({ kind: "idle" });
    } catch (err) {
      setDownloadStatus({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Couldn't generate the card.",
      });
    }
  }, [ensureCardBlob, cardProps.runName]);

  const handleShare = useCallback(async () => {
    setShareStatus({ kind: "loading" });
    try {
      await ensureCardBlob();
      setShareStatus({ kind: "idle" });
      setShareModalKey((k) => k + 1);
      setIsShareOpen(true);
    } catch (err) {
      setShareStatus({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Couldn't generate the card.",
      });
    }
  }, [ensureCardBlob]);

  const closeShareModal = useCallback(() => setIsShareOpen(false), []);

  const isDownloading = downloadStatus.kind === "loading";
  const isSharing = shareStatus.kind === "loading";

  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDownloading ? "Generating…" : "Download card"}
        </button>
        <button
          type="button"
          onClick={handleShare}
          disabled={isSharing}
          className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSharing ? "Preparing…" : "Share card"}
        </button>
      </div>

      {downloadStatus.kind === "error" && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300"
        >
          {downloadStatus.message}
        </p>
      )}

      {shareStatus.kind === "error" && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300"
        >
          {shareStatus.message}
        </p>
      )}

      {cardBlobCache != null && (
        <ShareModal
          key={shareModalKey}
          isOpen={isShareOpen}
          imageUrl={cardBlobCache.url}
          imageBlob={cardBlobCache.blob}
          defaultCaption={shareCaption}
          onClose={closeShareModal}
        />
      )}
    </div>
  );
}
