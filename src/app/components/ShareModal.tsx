"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ShareModalProps = {
  isOpen: boolean;
  imageUrl: string;
  imageBlob: Blob;
  defaultCaption: string;
  onClose: () => void;
};

const TOAST_DURATION_MS = 2500;

export default function ShareModal({
  isOpen,
  imageUrl,
  imageBlob,
  defaultCaption,
  onClose,
}: ShareModalProps) {
  const [caption, setCaption] = useState(defaultCaption);
  const [lastDefaultCaption, setLastDefaultCaption] = useState(defaultCaption);
  const [toast, setToast] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (lastDefaultCaption !== defaultCaption) {
    setLastDefaultCaption(defaultCaption);
    setCaption(defaultCaption);
  }

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current != null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current != null) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  const handleShareToX = useCallback(() => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      caption
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [caption]);

  const handleShareToInstagram = useCallback(async () => {
    const file = new File([imageBlob], "run-card.png", { type: "image/png" });
    const sharePayload = { files: [file], text: caption };
    const canShareFiles =
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare(sharePayload);

    if (!canShareFiles || typeof navigator.share !== "function") {
      showToast("Open on mobile to share directly to Instagram");
      return;
    }

    try {
      await navigator.share(sharePayload);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      showToast("Couldn't open share sheet");
    }
  }, [caption, imageBlob, showToast]);

  const handleCopyImage = useCallback(async () => {
    const hasClipboardItem =
      typeof window !== "undefined" &&
      typeof window.ClipboardItem !== "undefined";
    const hasClipboardWrite =
      typeof navigator !== "undefined" &&
      typeof navigator.clipboard !== "undefined" &&
      typeof navigator.clipboard.write === "function";

    if (hasClipboardItem && hasClipboardWrite) {
      try {
        const item = new ClipboardItem({ "image/png": imageBlob });
        await navigator.clipboard.write([item]);
        showToast("Image copied");
        return;
      } catch {
        // Fall through to text fallback below.
      }
    }

    const hasClipboardText =
      typeof navigator !== "undefined" &&
      typeof navigator.clipboard !== "undefined" &&
      typeof navigator.clipboard.writeText === "function";

    if (hasClipboardText) {
      try {
        await navigator.clipboard.writeText(caption);
        showToast("Image copy not supported - caption copied instead");
        return;
      } catch {
        // Fall through to final error.
      }
    }

    showToast("Clipboard unavailable in this browser");
  }, [caption, imageBlob, showToast]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share your run"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-md flex-col gap-4 rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Share your run</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close share modal"
            className="rounded-full p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            <span aria-hidden className="block text-lg leading-none">
              ×
            </span>
          </button>
        </div>

        <div className="flex justify-center rounded-xl border border-white/10 bg-black/40 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Generated run card"
            className="max-h-72 w-auto rounded-md"
          />
        </div>

        <label className="flex flex-col gap-2 text-sm text-white/70">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Caption
          </span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-lg border border-white/15 bg-black/30 p-3 text-sm text-white placeholder:text-white/30 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
          />
          <span className="self-end text-xs text-white/40">
            {caption.length} / 280
          </span>
        </label>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleShareToX}
            className="flex-1 rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            Share to X
          </button>
          <button
            type="button"
            onClick={handleShareToInstagram}
            className="flex-1 rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            Share to Instagram
          </button>
          <button
            type="button"
            onClick={handleCopyImage}
            className="flex-1 rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            Copy Image
          </button>
        </div>

        <div
          aria-live="polite"
          className="min-h-[1.25rem] text-center text-xs text-white/60"
        >
          {toast}
        </div>
      </div>
    </div>
  );
}
