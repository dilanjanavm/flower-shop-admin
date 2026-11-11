"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "@/lib/store";
import { cn, lkr } from "@/lib/format";
import { fromPrice } from "@/lib/pricing";
import { taxonomies } from "@/lib/mock/catalogue";
import { Badge, Empty, LinkButton, PageHeader, SearchInput, Tabs, Thumb, Toggle } from "@/components/ui";
import { OwnerOnly } from "@/components/Shell";
import { Icon } from "@/components/Icon";

export default function ProductsPage() {
  const { products, toggleAvailable } = useAdmin();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "available" | "unavailable" | "featured">("all");
  const [view, setView] = useState<"grid" | "table">("table");

  const list = products
    .filter((p) => (tab === "available" ? p.isAvailable : tab === "unavailable" ? !p.isAvailable : tab === "featured" ? p.isFeatured : true))
    .filter((p) => !q || `${p.name} ${p.sku} ${p.tagline}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <OwnerOnly>
      <PageHeader
        title="Products"
        subtitle="Availability is a manual switch in v1.0 — flip it off and the storefront shows “Currently unavailable” within 60 seconds."
        actions={<><div className="w-60"><SearchInput value={q} onChange={setQ} placeholder="Search name or SKU" /></div><LinkButton href="/products/new" size="sm"><Icon name="plus" size={15} /> New product</LinkButton></>}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={[{ key: "all", label: "All", count: products.length }, { key: "available", label: "Available" }, { key: "unavailable", label: "Unavailable", count: products.filter((p) => !p.isAvailable).length }, { key: "featured", label: "Featured" }]} value={tab} onChange={setTab} />
        <Tabs tabs={[{ key: "table", label: "Table" }, { key: "grid", label: "Grid" }]} value={view} onChange={setView} />
      </div>

      {list.length === 0 ? <div className="card"><Empty icon="flower" title="No products match" /></div> : view === "table" ? (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-line bg-panel-2/50"><tr><th className="th">Product</th><th className="th">Occasions</th><th className="th">Style</th><th className="th text-right">From</th><th className="th">Tiers</th><th className="th">Available</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-line">
              {list.map((p) => (
                <tr key={p.id} className={cn("transition hover:bg-panel-2/50", !p.isAvailable && "opacity-70")}>
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <Thumb src={p.images[0]} className="h-12 w-10 rounded-lg" />
                      <div>
                        <p className="flex items-center gap-2 font-medium">{p.name}{p.isFeatured && <Icon name="star" size={13} className="fill-amber-400 text-amber-400" />}{p.isNew && <Badge tone="ink">New</Badge>}</p>
                        <p className="font-mono text-[11px] text-muted">{p.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td text-xs text-muted">{p.occasions.map((o) => taxonomies.occasions.find((x) => x.slug === o)?.name).join(", ")}</td>
                  <td className="td text-xs">{taxonomies.styles.find((s) => s.slug === p.style)?.name}</td>
                  <td className="td text-right tabular-nums">{lkr(fromPrice(p))}</td>
                  <td className="td"><div className="flex gap-1">{p.variants.map((v) => <span key={v.id} title={`${v.sizeTier} ${lkr(v.price)}`} className={cn("h-2 w-5 rounded-full", v.isActive ? "bg-accent" : "bg-panel-2")} />)}</div></td>
                  <td className="td"><Toggle checked={p.isAvailable} onChange={() => toggleAvailable(p.id)} /></td>
                  <td className="td text-right"><Link href={`/products/${p.id}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><Icon name="edit" size={15} /> Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {list.map((p, i) => (
            <div key={p.id} className="card group animate-fade-up overflow-hidden" style={{ animationDelay: `${i * 30}ms` }}>
              <Link href={`/products/${p.id}`} className="relative block">
                <Thumb src={p.images[0]} className={cn("aspect-[4/5] transition", !p.isAvailable && "grayscale")} />
                {!p.isAvailable && <span className="absolute inset-x-3 top-3"><Badge tone="ink">Unavailable</Badge></span>}
              </Link>
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0"><p className="truncate text-sm font-medium">{p.name}</p><p className="text-xs text-muted">{lkr(fromPrice(p))}</p></div>
                <Toggle checked={p.isAvailable} onChange={() => toggleAvailable(p.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </OwnerOnly>
  );
}
