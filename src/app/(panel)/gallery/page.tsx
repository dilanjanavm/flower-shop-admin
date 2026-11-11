"use client";

import { useState } from "react";
import { useAdmin } from "@/lib/store";
import type { GalleryFlower } from "@/lib/types";
import { addOns, ribbons, wraps } from "@/lib/mock/catalogue";
import { cn, lkr } from "@/lib/format";
import { Badge, Button, Field, Modal, PageHeader, Tabs, Thumb, Toggle } from "@/components/ui";
import { OwnerOnly } from "@/components/Shell";
import { Icon } from "@/components/Icon";

type G = GalleryFlower & { visible: boolean };

/** Custom-bouquet gallery, fillers, wraps, ribbons and add-ons (FR-ADMIN-02.4). */
export default function GalleryPage() {
  const { gallery, toggleGallery, saveGallery } = useAdmin();
  const [tab, setTab] = useState<"FLOWER" | "FILLER" | "extras">("FLOWER");
  const [edit, setEdit] = useState<G | null>(null);

  return (
    <OwnerOnly>
      <PageHeader
        title="Custom bouquet gallery"
        subtitle="What customers can pick on the Design-your-own page. Hidden items disappear from the gallery at once."
        actions={<Button size="sm" onClick={() => setEdit({ id: `gf-${Date.now()}`, name: "", colour: "", hex: "#f4b6c5", image: "", indicativePrice: 0, kind: tab === "FILLER" ? "FILLER" : "FLOWER", visible: true })}><Icon name="plus" size={15} /> Add item</Button>}
      />
      <Tabs tabs={[{ key: "FLOWER", label: "Flowers", count: gallery.filter((g) => g.kind === "FLOWER").length }, { key: "FILLER", label: "Greens & fillers", count: gallery.filter((g) => g.kind === "FILLER").length }, { key: "extras", label: "Wraps, ribbons & add-ons" }]} value={tab} onChange={setTab} />

      {tab !== "extras" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {gallery.filter((g) => g.kind === tab).map((g, i) => (
            <div key={g.id} className={cn("card animate-fade-up overflow-hidden transition", !g.visible && "opacity-55")} style={{ animationDelay: `${i * 30}ms` }}>
              <button className="relative block w-full" onClick={() => setEdit(g)}>
                <Thumb src={g.image} className="aspect-square" />
                <span className="absolute left-3 top-3 h-5 w-5 rounded-full ring-2 ring-white" style={{ background: g.hex }} />
                {!g.visible && <span className="absolute right-3 top-3"><Badge tone="ink">Hidden</Badge></span>}
              </button>
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{g.name}</p>
                  <p className="text-xs text-muted">{g.indicativePrice ? `≈ ${lkr(g.indicativePrice)}/${g.kind === "FILLER" ? "bunch" : "stem"}` : "No price shown"}</p>
                </div>
                <Toggle checked={g.visible} onChange={() => toggleGallery(g.id)} label={`Show ${g.name}`} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="card p-6">
            <h2 className="mb-4 font-serif text-2xl">Wrapping</h2>
            <ul className="space-y-3">{wraps.map((w) => <li key={w.id} className="flex items-center gap-3"><span className="h-9 w-9 rounded-lg ring-1 ring-black/10" style={{ background: w.swatch }} /><span className="flex-1 text-sm"><span className="block font-medium">{w.name}</span><span className="text-xs text-muted">{w.price ? `+${lkr(w.price)}` : "Included"}</span></span>{w.available ? <Badge tone="green">On</Badge> : <Badge tone="neutral">Off</Badge>}</li>)}</ul>
          </section>
          <section className="card p-6">
            <h2 className="mb-4 font-serif text-2xl">Ribbons</h2>
            <div className="flex flex-wrap gap-3">{ribbons.map((r) => <span key={r.id} className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-sm"><span className="h-6 w-6 rounded-full ring-1 ring-black/10" style={{ background: r.hex }} />{r.name}</span>)}</div>
          </section>
          <section className="card p-6">
            <h2 className="mb-4 font-serif text-2xl">Add-ons</h2>
            <ul className="space-y-3">{addOns.map((a) => <li key={a.id} className="flex items-center gap-3"><Thumb src={a.image} className="h-9 w-9 rounded-lg" /><span className="flex-1 text-sm"><span className="block font-medium">{a.name}</span><span className="text-xs text-muted">{lkr(a.price)}</span></span>{a.available ? <Badge tone="green">In stock</Badge> : <Badge tone="red">Out</Badge>}</li>)}</ul>
          </section>
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.name ? `Edit ${edit.name}` : "New gallery item"} footer={<><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button disabled={!edit?.name} onClick={() => { if (edit) saveGallery(edit); setEdit(null); }}>Save</Button></>}>
        {edit && (
          <div className="space-y-4">
            <div className="grid grid-cols-[96px_1fr] gap-4">
              <Thumb src={edit.image} className="h-24 w-24 rounded-2xl" />
              <Field label="Photo URL"><input className="field" value={edit.image} onChange={(e) => setEdit({ ...edit, image: e.target.value })} placeholder="https://…" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name"><input className="field" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Colour"><div className="flex gap-2"><input type="color" className="h-10 w-12 rounded-lg border border-line" value={edit.hex} onChange={(e) => setEdit({ ...edit, hex: e.target.value })} /><input className="field" value={edit.colour} onChange={(e) => setEdit({ ...edit, colour: e.target.value })} /></div></Field>
              <Field label="Indicative price (LKR)" hint="Optional (OI-11). Shown as “≈” and never final."><input type="number" className="field" value={edit.indicativePrice ?? 0} onChange={(e) => setEdit({ ...edit, indicativePrice: Number(e.target.value) || undefined })} /></Field>
              <Field label="Type"><select className="field" value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as G["kind"] })}><option value="FLOWER">Flower</option><option value="FILLER">Filler / greens</option></select></Field>
            </div>
            <Toggle checked={edit.visible} onChange={(v) => setEdit({ ...edit, visible: v })} label="Show in gallery" />
          </div>
        )}
      </Modal>
    </OwnerOnly>
  );
}
