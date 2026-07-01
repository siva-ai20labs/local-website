import type { ReactNode } from "react";

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-600 ring-slate-200",
  ENRICHED: "bg-amber-50 text-amber-700 ring-amber-200",
  GENERATED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? STATUS_STYLES.NEW;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status}
    </span>
  );
}

export function Stars({ rating, count }: { rating?: number | null; count?: number }) {
  if (!rating) return <span className="text-slate-400 text-sm">—</span>;
  const full = Math.round(rating);
  return (
    <span className="text-sm whitespace-nowrap">
      <span className="text-amber-500">{"★".repeat(full)}</span>
      <span className="text-slate-300">{"★".repeat(Math.max(0, 5 - full))}</span>
      <span className="ml-1 text-slate-600">{rating.toFixed(1)}</span>
      {count != null ? <span className="ml-1 text-slate-400">({count})</span> : null}
    </span>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function WebsiteDot({ hasWebsite }: { hasWebsite: boolean }) {
  return hasWebsite ? (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
      <span className="h-2 w-2 rounded-full bg-slate-400" /> Has site
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
      <span className="h-2 w-2 rounded-full bg-emerald-500" /> No site
    </span>
  );
}
