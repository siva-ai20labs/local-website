import type { SiteCopy } from "../types";

/**
 * Self-contained single-page website templates. Each returns a complete HTML
 * document (Tailwind Play CDN + Google Fonts) that can be served as-is at a
 * preview URL. Two templates ship; the generator picks one per business.
 */

export type TemplateKey = "modern" | "classic";

export interface RenderInput {
  name: string;
  category: string;
  address?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  rating?: number | null;
  reviewCount?: number;
  highlights: string[];
  reviews: { author?: string | null; text?: string | null; rating?: number | null }[];
  copy: SiteCopy;
}

function esc(s: string | null | undefined): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}

function stars(rating?: number | null): string {
  if (!rating) return "";
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
}

function head(name: string, copy: SiteCopy, fonts: string): string {
  return `<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(name)} — ${esc(copy.tagline)}</title>
<meta name="description" content="${esc(copy.heroSubtitle)}" />
<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="${fonts}" rel="stylesheet" />
<style>:root{--brand:${esc(copy.primaryColor)};--accent:${esc(copy.accentColor)};}</style>
</head>`;
}

function renderModern(d: RenderInput): string {
  const { copy } = d;
  const hero = d.photoUrl
    ? `background-image:linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55)),url('${esc(d.photoUrl)}');background-size:cover;background-position:center;`
    : `background:var(--brand);`;
  return `<!doctype html>
<html lang="en">
${head(d.name, copy, "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Sora:wght@600;800&display=swap")}
<body class="bg-white text-slate-800" style="font-family:Inter,sans-serif">
  <header class="sticky top-0 z-20 backdrop-blur bg-white/80 border-b border-slate-100">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <span class="font-extrabold text-lg" style="font-family:Sora,sans-serif;color:var(--brand)">${esc(d.name)}</span>
      <a href="#contact" class="px-4 py-2 rounded-full text-white text-sm font-semibold" style="background:var(--accent)">${esc(copy.callToAction)}</a>
    </div>
  </header>

  <section class="text-white" style="${hero}">
    <div class="max-w-6xl mx-auto px-6 py-32 text-center">
      <p class="uppercase tracking-widest text-sm/relaxed opacity-90 mb-4">${esc(d.category)}</p>
      <h1 class="text-5xl md:text-6xl font-extrabold mb-5" style="font-family:Sora,sans-serif">${esc(copy.tagline)}</h1>
      <p class="text-xl max-w-2xl mx-auto opacity-95 mb-8">${esc(copy.heroSubtitle)}</p>
      <a href="#contact" class="inline-block px-8 py-3 rounded-full text-white font-semibold shadow-lg" style="background:var(--accent)">${esc(copy.callToAction)}</a>
      ${d.rating ? `<p class="mt-6 text-amber-300 text-lg">${stars(d.rating)} <span class="text-white/80 text-base">${d.rating} · ${d.reviewCount ?? 0} reviews</span></p>` : ""}
    </div>
  </section>

  ${d.highlights.length ? `<section class="bg-slate-50 border-y border-slate-100">
    <div class="max-w-6xl mx-auto px-6 py-6 flex flex-wrap gap-3 justify-center">
      ${d.highlights.map((h) => `<span class="px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-medium">${esc(h)}</span>`).join("")}
    </div>
  </section>` : ""}

  <section class="max-w-3xl mx-auto px-6 py-20 text-center">
    <h2 class="text-3xl font-extrabold mb-5" style="font-family:Sora,sans-serif;color:var(--brand)">About Us</h2>
    <p class="text-lg leading-relaxed text-slate-600">${esc(copy.about)}</p>
  </section>

  <section class="bg-slate-50 py-20">
    <div class="max-w-6xl mx-auto px-6">
      <h2 class="text-3xl font-extrabold mb-10 text-center" style="font-family:Sora,sans-serif;color:var(--brand)">What We Offer</h2>
      <div class="grid md:grid-cols-3 gap-6">
        ${copy.services.map((s) => `<div class="bg-white rounded-2xl p-7 shadow-sm border border-slate-100">
          <div class="w-11 h-11 rounded-xl mb-4 flex items-center justify-center text-white font-bold" style="background:var(--accent)">✦</div>
          <h3 class="font-bold text-lg mb-2">${esc(s.name)}</h3>
          <p class="text-slate-600 text-sm leading-relaxed">${esc(s.description)}</p>
        </div>`).join("")}
      </div>
    </div>
  </section>

  <section class="max-w-6xl mx-auto px-6 py-20">
    <div class="grid md:grid-cols-2 gap-12 items-center">
      <div>
        <h2 class="text-3xl font-extrabold mb-6" style="font-family:Sora,sans-serif;color:var(--brand)">Why Choose Us</h2>
        <ul class="space-y-4">
          ${copy.whyChooseUs.map((w) => `<li class="flex gap-3 items-start"><span class="mt-1 text-lg" style="color:var(--accent)">✓</span><span class="text-slate-700">${esc(w)}</span></li>`).join("")}
        </ul>
      </div>
      ${d.reviews.length ? `<div class="space-y-4">
        ${d.reviews.slice(0, 2).map((r) => `<blockquote class="bg-slate-50 rounded-2xl p-6 border border-slate-100">
          <p class="text-amber-500 mb-2">${stars(r.rating)}</p>
          <p class="text-slate-700 italic mb-3">"${esc(r.text)}"</p>
          <footer class="text-sm font-semibold text-slate-500">— ${esc(r.author) || "Verified customer"}</footer>
        </blockquote>`).join("")}
      </div>` : ""}
    </div>
  </section>

  <section id="contact" class="text-white" style="background:var(--brand)">
    <div class="max-w-3xl mx-auto px-6 py-20 text-center">
      <h2 class="text-3xl font-extrabold mb-4" style="font-family:Sora,sans-serif">Visit ${esc(d.name)}</h2>
      ${d.address ? `<p class="opacity-90 mb-1">${esc(d.address)}</p>` : ""}
      ${d.phone ? `<p class="opacity-90 mb-6">${esc(d.phone)}</p>` : '<p class="mb-6"></p>'}
      <a href="${d.phone ? `tel:${esc(d.phone)}` : "#"}" class="inline-block px-8 py-3 rounded-full font-semibold" style="background:var(--accent)">${esc(copy.callToAction)}</a>
    </div>
  </section>

  <footer class="bg-slate-900 text-slate-400 text-center text-sm py-6">
    © ${new Date().getFullYear()} ${esc(d.name)}. Site generated by Local Website.
  </footer>
</body>
</html>`;
}

function renderClassic(d: RenderInput): string {
  const { copy } = d;
  return `<!doctype html>
<html lang="en">
${head(d.name, copy, "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;800&family=Lora:wght@400;500&display=swap")}
<body class="bg-[#fbf8f3] text-stone-800" style="font-family:Lora,serif">
  <header class="border-b border-stone-200">
    <div class="max-w-5xl mx-auto px-6 py-8 text-center">
      <h1 class="text-3xl font-bold tracking-wide" style="font-family:'Playfair Display',serif;color:var(--brand)">${esc(d.name)}</h1>
      <p class="uppercase tracking-[0.3em] text-xs text-stone-400 mt-2">${esc(d.category)}</p>
    </div>
  </header>

  <section class="relative">
    ${d.photoUrl ? `<img src="${esc(d.photoUrl)}" alt="${esc(d.name)}" class="w-full h-[420px] object-cover" />` : `<div class="w-full h-64" style="background:var(--brand)"></div>`}
    <div class="max-w-3xl mx-auto px-6 text-center -mt-24 relative">
      <div class="bg-[#fbf8f3] rounded-t-3xl pt-12 px-8">
        <h2 class="text-4xl md:text-5xl font-bold mb-4" style="font-family:'Playfair Display',serif">${esc(copy.tagline)}</h2>
        <p class="text-lg text-stone-600 mb-6">${esc(copy.heroSubtitle)}</p>
        <a href="#contact" class="inline-block px-8 py-3 rounded-full text-white font-medium" style="background:var(--accent)">${esc(copy.callToAction)}</a>
        ${d.rating ? `<p class="mt-5 text-amber-600">${stars(d.rating)} <span class="text-stone-500">${d.rating} · ${d.reviewCount ?? 0} reviews</span></p>` : ""}
      </div>
    </div>
  </section>

  <section class="max-w-2xl mx-auto px-6 py-16 text-center">
    <p class="text-xl leading-relaxed text-stone-700">${esc(copy.about)}</p>
  </section>

  ${d.highlights.length ? `<div class="max-w-4xl mx-auto px-6 pb-10 flex flex-wrap gap-3 justify-center">
    ${d.highlights.map((h) => `<span class="px-4 py-1.5 rounded-full border border-stone-300 text-sm text-stone-600">${esc(h)}</span>`).join("")}
  </div>` : ""}

  <section class="border-y border-stone-200 bg-white/60 py-16">
    <div class="max-w-4xl mx-auto px-6">
      <h2 class="text-2xl font-bold text-center mb-10" style="font-family:'Playfair Display',serif;color:var(--brand)">Our Offerings</h2>
      <div class="grid md:grid-cols-2 gap-8">
        ${copy.services.map((s) => `<div class="text-center md:text-left">
          <h3 class="font-bold text-lg mb-1" style="color:var(--brand)">${esc(s.name)}</h3>
          <p class="text-stone-600">${esc(s.description)}</p>
        </div>`).join("")}
      </div>
    </div>
  </section>

  <section class="max-w-3xl mx-auto px-6 py-16 text-center">
    <h2 class="text-2xl font-bold mb-8" style="font-family:'Playfair Display',serif;color:var(--brand)">Why Choose Us</h2>
    <ul class="space-y-3 inline-block text-left">
      ${copy.whyChooseUs.map((w) => `<li class="flex gap-3"><span style="color:var(--accent)">❖</span><span>${esc(w)}</span></li>`).join("")}
    </ul>
  </section>

  ${d.reviews.length ? `<section class="bg-white/60 border-y border-stone-200 py-16">
    <div class="max-w-2xl mx-auto px-6 text-center">
      ${d.reviews.slice(0, 1).map((r) => `<p class="text-amber-600 mb-3 text-lg">${stars(r.rating)}</p>
      <blockquote class="text-2xl italic text-stone-700 mb-4" style="font-family:'Playfair Display',serif">"${esc(r.text)}"</blockquote>
      <p class="text-stone-500">— ${esc(r.author) || "Verified customer"}</p>`).join("")}
    </div>
  </section>` : ""}

  <section id="contact" class="max-w-2xl mx-auto px-6 py-16 text-center">
    <h2 class="text-2xl font-bold mb-4" style="font-family:'Playfair Display',serif;color:var(--brand)">Visit Us</h2>
    ${d.address ? `<p class="text-stone-600">${esc(d.address)}</p>` : ""}
    ${d.phone ? `<p class="text-stone-600 mb-6">${esc(d.phone)}</p>` : '<p class="mb-6"></p>'}
    <a href="${d.phone ? `tel:${esc(d.phone)}` : "#"}" class="inline-block px-8 py-3 rounded-full text-white font-medium" style="background:var(--accent)">${esc(copy.callToAction)}</a>
  </section>

  <footer class="text-center text-xs text-stone-400 py-6">
    © ${new Date().getFullYear()} ${esc(d.name)} · Site generated by Local Website
  </footer>
</body>
</html>`;
}

const TEMPLATES: Record<TemplateKey, (d: RenderInput) => string> = {
  modern: renderModern,
  classic: renderClassic,
};

export function renderTemplate(key: TemplateKey, d: RenderInput): string {
  return (TEMPLATES[key] ?? renderModern)(d);
}

/** Pick a template deterministically from the business name. */
export function pickTemplate(seed: string): TemplateKey {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 2 === 0 ? "modern" : "classic";
}
