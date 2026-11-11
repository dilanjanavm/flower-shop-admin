"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useAdmin } from "@/lib/store";
import type { Product, SizeTier } from "@/lib/types";
import { taxonomies } from "@/lib/mock/catalogue";
import { IMG } from "@/lib/mock/images";
import { cn, lkr } from "@/lib/format";
import { Button, Field, PageHeader, Thumb, Toggle } from "@/components/ui";
import { OwnerOnly } from "@/components/Shell";
import { Icon } from "@/components/Icon";

const tiers: SizeTier[] = ["STANDARD", "DELUXE", "PREMIUM", "LUXURY"];
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function blank(): Product {
  const id = `p${Date.now()}`;
  return {
    id, sku: "SF-NEW-001", slug: "", name: "", tagline: "", description: "", careTips: ["Trim stems at an angle and change water every two days."], images: [IMG.assorted],
    occasions: [], flowerTypes: [], style: "hand-tied", colours: [],
    variants: tiers.map((t, i) => ({ id: `${id}-${t.toLowerCase()}`, sizeTier: t, price: [6500, 9100, 12400, 17500][i], stemCount: [10, 15, 20, 30][i], isActive: true })),
    isAvailable: true, isFeatured: false, popularity: 50, createdAt: new Date().toISOString().slice(0, 10), rating: 0, reviewCount: 0, reviews: [],
  };
}

/** Product CRUD (FR-ADMIN-02.1, 02.5, 02.6). */
export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { products, saveProduct } = useAdmin();
  const existing = products.find((p) => p.id === id);
  const [p, setP] = useState<Product>(() => existing ?? blank());
  const [seo, setSeo] = useState({ title: existing ? `${existing.name} — Sithuliya Flora` : "", description: existing?.tagline ?? "" });
  const [imgUrl, setImgUrl] = useState("");
  const [archived, setArchived] = useState(false);
  const [err, setErr] = useState("");

  const toggleIn = (k: "occasions" | "flowerTypes" | "colours", slug: string) => setP((x) => ({ ...x, [k]: x[k].includes(slug) ? x[k].filter((s) => s !== slug) : [...x[k], slug] }));
  const setVariant = (i: number, patch: Partial<Product["variants"][number]>) => setP((x) => ({ ...x, variants: x.variants.map((v, k) => (k === i ? { ...v, ...patch } : v)) }));

  const save = () => {
    if (!p.name.trim()) return setErr("Name is required.");
    const slug = p.slug || slugify(p.name);
    if (products.some((o) => o.slug === slug && o.id !== p.id)) return setErr("That slug is already used by another product.");
    if (!p.occasions.length) return setErr("Pick at least one occasion.");
    if (p.images.length > 8) return setErr("Up to 8 images per product.");
    saveProduct({ ...p, slug, isAvailable: archived ? false : p.isAvailable });
    router.push("/products");
  };

  return (
    <OwnerOnly>
      <Link href="/products" className="mb-2 flex items-center gap-1 text-sm text-muted hover:text-fg"><Icon name="arrowLeft" size={15} /> Products</Link>
      <PageHeader title={existing ? `Edit ${existing.name}` : "New product"} subtitle={existing ? <span className="font-mono">{existing.sku} · /product/{existing.slug}</span> : "Saved products appear on the storefront after ISR revalidation."} actions={<><Button variant="outline" onClick={() => router.push("/products")}>Cancel</Button><Button onClick={save}><Icon name="check" size={16} /> Save</Button></>} />
      {err && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{err}</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card space-y-4 p-6">
            <h2 className="font-semibold tracking-tight text-lg">Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name"><input className="field" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value, slug: existing ? p.slug : slugify(e.target.value) })} /></Field>
              <Field label="SKU"><input className="field font-mono" value={p.sku} onChange={(e) => setP({ ...p, sku: e.target.value.toUpperCase() })} /></Field>
              <Field label="Slug" hint="Used in the product URL"><input className="field font-mono" value={p.slug} onChange={(e) => setP({ ...p, slug: slugify(e.target.value) })} /></Field>
              <Field label="Tagline"><input className="field" value={p.tagline} onChange={(e) => setP({ ...p, tagline: e.target.value })} /></Field>
            </div>
            <Field label="Description"><textarea className="field resize-none" rows={4} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></Field>
            <Field label="Care tips" hint="One per line"><textarea className="field resize-none" rows={3} value={p.careTips.join("\n")} onChange={(e) => setP({ ...p, careTips: e.target.value.split("\n").filter(Boolean) })} /></Field>
          </section>

          <section className="card p-6">
            <h2 className="font-semibold tracking-tight text-lg">Size tiers & prices</h2>
            <p className="text-sm text-muted">Each tier is a product variant. Recipes (BOM) per tier are deferred until stock checks are switched on.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr><th className="th pl-0">Tier</th><th className="th">Price</th><th className="th">Sale price</th><th className="th">Stems</th><th className="th">Offered</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {p.variants.map((v, i) => (
                    <tr key={v.id}>
                      <td className="td pl-0 font-medium capitalize">{v.sizeTier.toLowerCase()}</td>
                      <td className="td"><input type="number" className="field w-28 py-1.5" value={v.price} onChange={(e) => setVariant(i, { price: Number(e.target.value) })} /></td>
                      <td className="td"><input type="number" className="field w-28 py-1.5" value={v.salePrice ?? ""} placeholder="—" onChange={(e) => setVariant(i, { salePrice: e.target.value ? Number(e.target.value) : undefined })} /></td>
                      <td className="td"><input type="number" className="field w-20 py-1.5" value={v.stemCount} onChange={(e) => setVariant(i, { stemCount: Number(e.target.value) })} /></td>
                      <td className="td"><Toggle checked={v.isActive} onChange={(b) => setVariant(i, { isActive: b })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card space-y-5 p-6">
            <h2 className="font-semibold tracking-tight text-lg">Classification</h2>
            {([["occasions", "Occasions", taxonomies.occasions], ["flowerTypes", "Flower types", taxonomies.flowerTypes], ["colours", "Colours", taxonomies.colours]] as const).map(([k, label, items]) => (
              <div key={k}>
                <p className="label">{label}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map((it) => (
                    <button key={it.slug} type="button" onClick={() => toggleIn(k, it.slug)} className={cn("rounded-full border px-3 py-1.5 text-xs transition", p[k].includes(it.slug) ? "border-fg bg-invert text-invert-fg" : "border-line hover:border-fg/40")}>{it.name}</button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="label">Arrangement style</p>
              <div className="flex flex-wrap gap-2">
                {taxonomies.styles.map((s) => <button key={s.slug} type="button" onClick={() => setP({ ...p, style: s.slug })} className={cn("rounded-full border px-3 py-1.5 text-xs transition", p.style === s.slug ? "border-fg bg-invert text-invert-fg" : "border-line hover:border-fg/40")}>{s.name}</button>)}
              </div>
            </div>
          </section>

          <section className="card space-y-4 p-6">
            <h2 className="font-semibold tracking-tight text-lg">SEO</h2>
            <Field label="SEO title" hint={`${seo.title.length}/60`}><input className="field" value={seo.title} maxLength={70} onChange={(e) => setSeo({ ...seo, title: e.target.value })} /></Field>
            <Field label="Meta description" hint={`${seo.description.length}/160`}><textarea className="field resize-none" rows={2} maxLength={170} value={seo.description} onChange={(e) => setSeo({ ...seo, description: e.target.value })} /></Field>
            <div className="rounded-xl bg-panel-2 p-4 text-sm">
              <p className="text-xs text-emerald-700 dark:text-emerald-400">sithuliyaflora.lk › product › {p.slug || "…"}</p>
              <p className="text-base text-sky-700 dark:text-sky-400">{seo.title || p.name || "Product title"}</p>
              <p className="text-xs text-muted">{seo.description || "Meta description preview"}</p>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-6">
            <p className="label">Images ({p.images.length}/8)</p>
            <div className="grid grid-cols-3 gap-2">
              {p.images.map((src, i) => (
                <div key={src + i} className="group relative">
                  <Thumb src={src} className={cn("aspect-square rounded-xl", i === 0 && "ring-2 ring-accent")} />
                  <button onClick={() => setP({ ...p, images: p.images.filter((_, k) => k !== i) })} className="absolute right-1 top-1 hidden h-6 w-6 place-items-center rounded-full bg-black/70 text-white group-hover:grid" aria-label="Remove image"><Icon name="close" size={12} /></button>
                </div>
              ))}
              {p.images.length < 8 && (
                <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-muted hover:border-fg/40">
                  <Icon name="upload" />
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setP({ ...p, images: [...p.images, URL.createObjectURL(f)] }); }} />
                </label>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <input className="field py-2 text-xs" placeholder="…or paste an image URL" value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} />
              <Button size="sm" variant="outline" disabled={!imgUrl} onClick={() => { setP({ ...p, images: [...p.images, imgUrl] }); setImgUrl(""); }}>Add</Button>
            </div>
            <p className="mt-2 text-[11px] text-faint">Uploads are converted to WebP/AVIF automatically. First image is the cover.</p>
          </section>
          <section className="card space-y-4 p-6">
            <Toggle checked={p.isAvailable && !archived} onChange={(v) => setP({ ...p, isAvailable: v })} label="Available to order" description="Off shows “Currently unavailable”" disabled={archived} />
            <Toggle checked={p.isFeatured} onChange={(v) => setP({ ...p, isFeatured: v })} label="Featured on home page" />
            <Toggle checked={!!p.isNew} onChange={(v) => setP({ ...p, isNew: v })} label="Show “New” badge" />
            <Toggle checked={archived} onChange={setArchived} label="Archived" description="Hidden from the storefront, kept for order history" />
          </section>
          {existing && (
            <section className="card p-6 text-sm">
              <p className="label">Performance</p>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="font-semibold tracking-tight text-lg">{existing.rating || "—"}</p><p className="text-xs text-muted">{existing.reviewCount} reviews</p></div>
                <div><p className="font-semibold tracking-tight text-lg">{existing.popularity}</p><p className="text-xs text-muted">popularity score</p></div>
              </div>
              <p className="mt-3 text-xs text-muted">Standard price {lkr(existing.variants[0].price)} · price changes are audit-logged.</p>
            </section>
          )}
        </aside>
      </div>
    </OwnerOnly>
  );
}
