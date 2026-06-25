import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GenerateButton } from "@/components/GenerateButton";
import { StatusBadge, Stars, WebsiteDot } from "@/components/ui";
import type { Branding } from "@/lib/types";

export const dynamic = "force-dynamic";

function parse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const business = await prisma.business.findUnique({
    where: { id },
    include: { reviews: { orderBy: { time: "desc" } }, site: true },
  });

  if (!business) notFound();

  const branding = parse<Branding>(business.brandingJson, {
    palette: [],
    vibe: "",
    photos: [],
    summary: "",
  });
  const highlights = parse<string[]>(business.highlightsJson, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900">
        ← Back to dashboard
      </Link>

      <div className="mt-4 grid md:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {business.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.photoUrl} alt={business.name} className="h-48 w-full object-cover" />
            ) : null}
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{business.name}</h1>
                  <p className="text-slate-500 capitalize">{business.category}</p>
                </div>
                <StatusBadge status={business.status} />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                <Stars rating={business.rating} count={business.reviewCount} />
                <WebsiteDot hasWebsite={business.hasWebsite} />
                {business.priceLevel != null ? (
                  <span className="text-sm text-slate-600">{"$".repeat(Math.max(1, business.priceLevel))}</span>
                ) : null}
              </div>

              <dl className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {business.address ? (
                  <div>
                    <dt className="text-slate-400">Address</dt>
                    <dd>{business.address}</dd>
                  </div>
                ) : null}
                {business.phone ? (
                  <div>
                    <dt className="text-slate-400">Phone</dt>
                    <dd>{business.phone}</dd>
                  </div>
                ) : null}
                {business.website ? (
                  <div>
                    <dt className="text-slate-400">Existing website</dt>
                    <dd>
                      <a href={business.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline break-all">
                        {business.website}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>

          {/* Branding */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold mb-3">Branding signals</h2>
            <p className="text-sm text-slate-600">{branding.summary}</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-sm text-slate-500">Vibe:</span>
              <span className="text-sm font-medium capitalize">{branding.vibe || "—"}</span>
            </div>
            {branding.palette.length ? (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-slate-500">Palette:</span>
                {branding.palette.map((c) => (
                  <span key={c} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="h-5 w-5 rounded-md ring-1 ring-slate-200" style={{ background: c }} />
                    {c}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* Highlights */}
          {highlights.length ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold mb-3">Highlights</h2>
              <div className="flex flex-wrap gap-2">
                {highlights.map((h) => (
                  <span key={h} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Reviews */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold mb-3">Reviews ({business.reviews.length})</h2>
            {business.reviews.length === 0 ? (
              <p className="text-sm text-slate-500">No reviews captured.</p>
            ) : (
              <ul className="space-y-4">
                {business.reviews.map((r) => (
                  <li key={r.id} className="border-b border-slate-100 pb-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{r.author ?? "Anonymous"}</span>
                      <Stars rating={r.rating} />
                    </div>
                    {r.text ? <p className="text-sm text-slate-600 mt-1">{r.text}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: generate + preview */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold mb-1">Website</h2>
            <p className="text-sm text-slate-500 mb-4">
              Fire AI copy into a template and get a live preview URL.
            </p>
            <GenerateButton businessId={business.id} slug={business.site?.slug} />
            {business.site ? (
              <p className="mt-3 text-xs text-slate-400">
                Template: <span className="capitalize">{business.site.template}</span>
                {business.site.model ? ` · ${business.site.model}` : " · fallback copy"}
              </p>
            ) : null}
          </div>

          {business.site ? (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-medium">Live preview</span>
                <a
                  href={`/preview/${business.site.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Open ↗
                </a>
              </div>
              <iframe
                title="preview"
                src={`/preview/${business.site.slug}`}
                className="w-full h-[480px] bg-white"
              />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
