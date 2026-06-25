"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function GenerateButton({
  businessId,
  slug,
  compact = false,
}: {
  businessId: string;
  slug?: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [previewSlug, setPreviewSlug] = useState<string | null>(slug ?? null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/generate/${businessId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Generation failed");
      setPreviewSlug(data.slug);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "flex items-center gap-2" : "flex items-center gap-3"}>
      <button
        onClick={generate}
        disabled={busy}
        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
      >
        {busy ? "Generating…" : previewSlug ? "Regenerate" : "Generate site"}
      </button>
      {previewSlug ? (
        <a
          href={`/preview/${previewSlug}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-indigo-600 hover:underline whitespace-nowrap"
        >
          Open preview ↗
        </a>
      ) : null}
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}
