import Link from "next/link";
import { backendFetch, fetchActiveSource, type BusinessRow, type RunRow } from "@/lib/backend";
import { ScrapeControls } from "@/components/ScrapeControls";
import { GenerateButton } from "@/components/GenerateButton";
import { StatCard, StatusBadge, Stars, WebsiteDot } from "@/components/ui";

// Always render fresh — the dashboard reflects live scrape/generate activity.
export const dynamic = "force-dynamic";

function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default async function DashboardPage() {
  const [businessesRes, runsRes, source] = await Promise.all([
    backendFetch("/businesses"),
    backendFetch("/runs"),
    fetchActiveSource(),
  ]);

  const { businesses: rawBusinesses } = (await businessesRes.json()) as { businesses: BusinessRow[] };
  const { runs } = (await runsRes.json()) as { runs: RunRow[] };

  // The backend orders by status/rating; the dashboard wants newest-scraped first.
  const businesses = [...rawBusinesses].sort(
    (a, b) => new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime(),
  );

  const total = businesses.length;
  const noWebsite = businesses.filter((b) => !b.hasWebsite).length;
  const generated = businesses.filter((b) => b.status === "GENERATED").length;
  const categories = new Set(businesses.map((b) => b.category)).size;
  const liveSource = source.live;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Discover local businesses, review their details, and spin up a website in minutes.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ScrapeControls liveSource={liveSource} sourceLabel={source.label} />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Businesses" value={total} hint={`${categories} categories`} />
            <StatCard label="No website" value={noWebsite} hint="prime targets" />
            <StatCard label="Sites generated" value={generated} />
            <StatCard label="In pipeline" value={total - generated} hint="awaiting a site" />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold">Businesses</h2>
              <span className="text-sm text-slate-400">{total} total</span>
            </div>

            {total === 0 ? (
              <div className="px-5 py-16 text-center text-slate-500">
                <p className="font-medium">No businesses yet.</p>
                <p className="text-sm mt-1">
                  Run the scraper above to discover local businesses
                  {liveSource ? "" : " (demo data — no API key configured)"}.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr className="text-left">
                      <th className="px-5 py-2.5 font-medium">Business</th>
                      <th className="px-3 py-2.5 font-medium">Category</th>
                      <th className="px-3 py-2.5 font-medium">Rating</th>
                      <th className="px-3 py-2.5 font-medium">Website</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-5 py-2.5 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {businesses.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <Link href={`/businesses/${b.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                            {b.name}
                          </Link>
                          <div className="text-xs text-slate-400">{b._count.reviews} reviews scraped</div>
                        </td>
                        <td className="px-3 py-3 text-slate-600 capitalize">{b.category}</td>
                        <td className="px-3 py-3">
                          <Stars rating={b.rating} count={b.reviewCount} />
                        </td>
                        <td className="px-3 py-3">
                          <WebsiteDot hasWebsite={b.hasWebsite} />
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={b.status} />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end">
                            <GenerateButton businessId={b.id} slug={b.site?.slug} compact />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Activity feed */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold mb-3">Recent scrape runs</h2>
            {runs.length === 0 ? (
              <p className="text-sm text-slate-500">No runs yet.</p>
            ) : (
              <ul className="space-y-3">
                {runs.slice(0, 8).map((r) => (
                  <li key={r.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{r.category ?? "sweep"}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          r.status === "SUCCEEDED"
                            ? "bg-emerald-50 text-emerald-700"
                            : r.status === "FAILED"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {r.found} found · {r.created} new · {r.source} · {timeAgo(r.startedAt)}
                    </div>
                    {r.error ? <div className="text-xs text-rose-600 mt-0.5 truncate">{r.error}</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            <h2 className="font-semibold text-slate-900 mb-2">How it works</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>Scraper pulls businesses + reviews, ratings, branding.</li>
              <li>Each is enriched with highlights & a brand palette.</li>
              <li>Hit <span className="font-medium">Generate site</span> to fire AI copy into a template.</li>
              <li>Open the preview URL — a live single-page site.</li>
            </ol>
            <p className="mt-3 text-xs text-slate-400">
              Automate step 1 by POSTing to <code>/api/scrape</code> on a daily cron.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
