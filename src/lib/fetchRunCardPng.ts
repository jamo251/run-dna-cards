import type { RunCardProps } from "@/app/components/RunCard";

export function slugifyCardDownloadName(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "run-card";
}

export async function fetchRunCardPng(props: RunCardProps): Promise<Blob> {
  const response = await fetch("/api/generate-card", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(props),
  });

  if (!response.ok) {
    let message = `Card generation failed (${response.status})`;
    try {
      const data = (await response.json()) as {
        error?: string;
        requestId?: string;
      };
      if (data.error) message = data.error;
      if (data.requestId) message = `${message} (ref: ${data.requestId})`;
    } catch {
      // Response wasn't JSON; keep default message.
    }
    throw new Error(message);
  }

  return response.blob();
}
