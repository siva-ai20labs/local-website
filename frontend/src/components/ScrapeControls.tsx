"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const SUGGESTED = ["coffee shops", "bakeries", "plumbers", "yoga studios", "barbershops"];

export function ScrapeControls({
  liveSource,
  sourceLabel,
}: {
  liveSource: boolean;
  sourceLabel: string;
}) {
  const router = useRouter();
  const [category, setCategory] = useState("coffee shops");
  const [location, setLocation] = useState("Austin, TX");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function scrape(body: Record<string, unknown>, label: string) {
    setBusy(true);
    setMsg(`Running ${label}…`);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        runs?: { found: number; source?: string }[];
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Scrape failed");
      const runs = data.runs ?? [];
      const found = runs.reduce((n, r) => n + r.found, 0);
      const src = runs[0]?.source ?? "";
      setMsg(`✓ ${label}: ${found} businesses from ${src}.`);
      startTransition(() => router.refresh());
    } catch (err) {
      setMsg(`✗ ${err instanceof Error ? err.message : "Error"}`);
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || isPending;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Run the scraper</h2>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ring-1 ring-inset ${
            liveSource
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-amber-50 text-amber-700 ring-amber-200"
          }`}
          title={liveSource ? `Live source: ${sourceLabel}` : "No API token — using demo seed data"}
        >
          {liveSource ? `${sourceLabel}: live` : "Demo seed data"}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <label className="text-sm">
          <span className="text-slate-500">Category</span>
          <input
            list="cats"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. coffee shops"
          />
          <datalist id="cats">
            {SUGGESTED.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Location</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. Austin, TX"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => scrape({ category, location }, `scrape "${category}"`)}
          disabled={disabled || !category.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Scrape category
        </button>
        <button
          onClick={() => scrape({ location }, "daily sweep")}
          disabled={disabled}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          Run daily sweep
        </button>
        {liveSource ? (
          <button
            onClick={() => scrape({ category, location, forceSeed: true }, "demo seed")}
            disabled={disabled}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            Load demo data
          </button>
        ) : null}
      </div>

      {msg ? <p className="mt-3 text-sm text-slate-600">{msg}</p> : null}
    </div>
  );
}
