"use client";

import { useMemo, useState } from "react";
import { useAdmin } from "@/lib/store";
import type { InventoryItem, RawType } from "@/lib/admin-types";
import { cn, lkr } from "@/lib/format";
import { addDays, diffDays, formatDate, formatDateTime, todayISO } from "@/lib/dates";
import { Badge, Button, Field, Modal, PageHeader, SearchInput, Tabs, Thumb, downloadCsv } from "@/components/ui";
import { Icon } from "@/components/Icon";

const WASTE_REASONS = ["Wilted", "Damaged in transit", "Production error", "Other"];
const typeLabel: Record<RawType, string> = { STEM: "Stems", FOLIAGE: "Foliage", WRAP: "Wraps", RIBBON: "Ribbons", BOX: "Boxes", ADDON: "Add-ons" };

/** Stem stock records, batches, wastage and ledger (FR-ADMIN-03). Information only — never blocks orders. */
export default function InventoryPage() {
  const { inventory, batches, movements, addBatch, logWastage, adjustStock, setReorder, session } = useAdmin();
  const owner = session?.role === "OWNER";
  const [tab, setTab] = useState<"items" | "batches" | "movements">("items");
  const [type, setType] = useState<RawType | "ALL">("ALL");
  const [q, setQ] = useState("");
  const [batchFor, setBatchFor] = useState<InventoryItem | null>(null);
  const [wasteFor, setWasteFor] = useState<InventoryItem | null>(null);
  const [adjustFor, setAdjustFor] = useState<InventoryItem | null>(null);
  const t = todayISO();

  const [bForm, setBForm] = useState({ supplier: "Colombo Flower Market", qty: 50, cost: 0, arrival: t, expiry: addDays(t, 5) });
  const [wForm, setWForm] = useState({ qty: 1, reason: WASTE_REASONS[0], note: "" });
  const [aForm, setAForm] = useState({ qty: 0, reason: "Stock-take", reorder: 0 });

  const items = inventory.filter((i) => (type === "ALL" || i.type === type) && (!q || i.name.toLowerCase().includes(q.toLowerCase())));
  const low = inventory.filter((i) => i.stockQty <= i.reorderLevel).length;
  const expiring = batches.filter((b) => b.qtyLeft > 0 && diffDays(t, b.expiryDate) <= 1);
  const stockValue = inventory.reduce((s, i) => s + i.stockQty * i.costPrice, 0);
  const wasteValue = useMemo(() => movements.filter((m) => m.type === "WASTE" && m.at > addDays(t, -30)).reduce((s, m) => s + Math.abs(m.qty) * (inventory.find((i) => i.id === m.itemId)?.costPrice ?? 0), 0), [movements, inventory, t]);
  const name = (id: string) => inventory.find((i) => i.id === id)?.name ?? id;

  return (
    <>
      <PageHeader
        title="Stock & wastage"
        subtitle="Records for the owner's information. In v1.0 stock never blocks or reserves against orders."
        actions={<><div className="w-56"><SearchInput value={q} onChange={setQ} placeholder="Search items" /></div><Button variant="outline" size="sm" onClick={() => downloadCsv("stock.csv", [["SKU", "Item", "Type", "Qty", "Unit", "Reorder level", "Cost"], ...inventory.map((i) => [i.sku, i.name, i.type, i.stockQty, i.unit, i.reorderLevel, i.costPrice])])}><Icon name="download" size={15} /> CSV</Button></>}
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { l: "Items tracked", v: inventory.length, icon: "box" as const },
          { l: "At / below reorder", v: low, icon: "alert" as const, tone: low ? "text-amber-600" : "" },
          { l: "Batches expiring ≤ 24 h", v: expiring.length, icon: "clock" as const, tone: expiring.length ? "text-red-600" : "" },
          { l: owner ? "Wastage · 30 days" : "Stock value", v: owner ? lkr(wasteValue) : "—", icon: "trash" as const },
        ].map((s) => (
          <div key={s.l} className="card p-4">
            <div className="flex items-center justify-between text-xs text-muted">{s.l}<Icon name={s.icon} size={16} className={s.tone} /></div>
            <p className={cn("mt-2 font-serif text-3xl tabular-nums", s.tone)}>{s.v}</p>
          </div>
        ))}
      </div>

      <Tabs tabs={[{ key: "items", label: "Items" }, { key: "batches", label: "Batches (FEFO)" }, { key: "movements", label: "Movement ledger" }]} value={tab} onChange={setTab} />

      {tab === "items" && (
        <>
          <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
            {(["ALL", "STEM", "FOLIAGE", "WRAP", "RIBBON", "BOX", "ADDON"] as const).map((k) => (
              <button key={k} onClick={() => setType(k)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs transition", type === k ? "border-fg bg-invert text-invert-fg" : "border-line hover:border-fg/40")}>{k === "ALL" ? "All" : typeLabel[k]}</button>
            ))}
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-line bg-panel-2/50"><tr><th className="th">Item</th><th className="th">Type</th><th className="th">Stock level</th><th className="th text-right">Qty</th><th className="th text-right">Reorder at</th>{owner && <th className="th text-right">Unit cost</th>}<th className="th text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-line">
                {items.map((i) => {
                  const ratio = i.reorderLevel ? i.stockQty / (i.reorderLevel * 3) : 1;
                  const state = i.stockQty === 0 ? "out" : i.stockQty <= i.reorderLevel ? "low" : "ok";
                  return (
                    <tr key={i.id} className="hover:bg-panel-2/40">
                      <td className="td"><div className="flex items-center gap-3"><Thumb src={i.image} className="h-9 w-9 rounded-lg" /><div><p className="font-medium">{i.name}</p><p className="font-mono text-[11px] text-muted">{i.sku}</p></div></div></td>
                      <td className="td text-xs text-muted">{typeLabel[i.type]}</td>
                      <td className="td w-48">
                        <div className="h-2 overflow-hidden rounded-full bg-panel-2"><div className={cn("h-full rounded-full transition-all duration-700", state === "out" ? "bg-red-500" : state === "low" ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(100, Math.max(3, ratio * 100))}%` }} /></div>
                        <span className="mt-1 block text-[11px] text-muted">{state === "out" ? "Out of stock" : state === "low" ? "Reorder" : "Healthy"}</span>
                      </td>
                      <td className="td text-right font-semibold tabular-nums">{i.stockQty} <span className="text-xs font-normal text-muted">{i.unit}</span></td>
                      <td className="td text-right tabular-nums text-muted">{i.reorderLevel}</td>
                      {owner && <td className="td text-right tabular-nums">{lkr(i.costPrice)}</td>}
                      <td className="td">
                        <div className="flex justify-end gap-1">
                          {owner && <button onClick={() => { setBatchFor(i); setBForm((f) => ({ ...f, cost: i.costPrice })); }} className="rounded-full px-2.5 py-1 text-xs hover:bg-panel-2" title="Record supplier batch">+ Batch</button>}
                          <button onClick={() => { setWasteFor(i); setWForm({ qty: 1, reason: WASTE_REASONS[0], note: "" }); }} className="rounded-full px-2.5 py-1 text-xs hover:bg-panel-2">Wastage</button>
                          {owner && <button onClick={() => { setAdjustFor(i); setAForm({ qty: i.stockQty, reason: "Stock-take", reorder: i.reorderLevel }); }} className="rounded-full px-2.5 py-1 text-xs hover:bg-panel-2">Adjust</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "batches" && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-line bg-panel-2/50"><tr><th className="th">Item</th><th className="th">Supplier</th><th className="th">Arrived</th><th className="th">Expires</th><th className="th text-right">Received</th><th className="th text-right">Left</th>{owner && <th className="th text-right">Unit cost</th>}</tr></thead>
            <tbody className="divide-y divide-line">
              {[...batches].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)).map((b) => {
                const d = diffDays(t, b.expiryDate);
                return (
                  <tr key={b.id} className="hover:bg-panel-2/40">
                    <td className="td font-medium">{name(b.itemId)}</td>
                    <td className="td text-muted">{b.supplier}</td>
                    <td className="td">{formatDate(b.arrivalDate)}</td>
                    <td className="td"><span className="flex items-center gap-2">{formatDate(b.expiryDate)}{d <= 1 ? <Badge tone="red">{d < 0 ? "Expired" : d === 0 ? "Today" : "Tomorrow"}</Badge> : d <= 3 ? <Badge tone="amber">{d} days</Badge> : null}</span></td>
                    <td className="td text-right tabular-nums">{b.qtyReceived}</td>
                    <td className="td text-right font-semibold tabular-nums">{b.qtyLeft}</td>
                    {owner && <td className="td text-right tabular-nums">{lkr(b.unitCost)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-3 text-xs text-muted">Sorted first-expiry-first-out. Consume the top rows first.</p>
        </div>
      )}

      {tab === "movements" && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line bg-panel-2/50"><tr><th className="th">When</th><th className="th">Item</th><th className="th">Type</th><th className="th text-right">Qty</th><th className="th">Reason / note</th><th className="th">By</th></tr></thead>
            <tbody className="divide-y divide-line">
              {movements.slice(0, 60).map((m) => (
                <tr key={m.id}>
                  <td className="td text-xs text-muted">{formatDateTime(m.at)}</td>
                  <td className="td">{name(m.itemId)}</td>
                  <td className="td"><Badge tone={m.type === "RECEIVE" ? "green" : m.type === "WASTE" ? "red" : "neutral"}>{m.type}</Badge></td>
                  <td className={cn("td text-right font-semibold tabular-nums", m.qty < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400")}>{m.qty > 0 ? `+${m.qty}` : m.qty}</td>
                  <td className="td text-xs text-muted">{[m.reason, m.note].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="td text-xs">{m.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!batchFor} onClose={() => setBatchFor(null)} title={`Record batch · ${batchFor?.name ?? ""}`} footer={<><Button variant="outline" onClick={() => setBatchFor(null)}>Cancel</Button><Button disabled={bForm.qty <= 0 || bForm.expiry < bForm.arrival} onClick={() => { if (batchFor) addBatch({ itemId: batchFor.id, supplier: bForm.supplier, qtyReceived: bForm.qty, unitCost: bForm.cost, arrivalDate: bForm.arrival, expiryDate: bForm.expiry }); setBatchFor(null); }}>Save batch</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Supplier" className="col-span-2"><input className="field" value={bForm.supplier} onChange={(e) => setBForm({ ...bForm, supplier: e.target.value })} list="suppliers" /><datalist id="suppliers">{["Nuwara Eliya Growers", "Colombo Flower Market", "Kandy Blooms Co.", "Imported — Dubai hub"].map((s) => <option key={s} value={s} />)}</datalist></Field>
          <Field label={`Quantity (${batchFor?.unit ?? ""})`}><input type="number" className="field" value={bForm.qty} onChange={(e) => setBForm({ ...bForm, qty: Number(e.target.value) })} /></Field>
          <Field label="Unit cost (LKR)"><input type="number" className="field" value={bForm.cost} onChange={(e) => setBForm({ ...bForm, cost: Number(e.target.value) })} /></Field>
          <Field label="Arrival date"><input type="date" className="field" value={bForm.arrival} onChange={(e) => setBForm({ ...bForm, arrival: e.target.value })} /></Field>
          <Field label="Expiry date" error={bForm.expiry < bForm.arrival ? "Must be after arrival" : undefined}><input type="date" className="field" value={bForm.expiry} onChange={(e) => setBForm({ ...bForm, expiry: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal open={!!wasteFor} onClose={() => setWasteFor(null)} title={`Log wastage · ${wasteFor?.name ?? ""}`} footer={<><Button variant="outline" onClick={() => setWasteFor(null)}>Cancel</Button><Button variant="danger" disabled={wForm.qty <= 0} onClick={() => { if (wasteFor) logWastage(wasteFor.id, wForm.qty, wForm.reason, wForm.note); setWasteFor(null); }}>Log wastage</Button></>}>
        <div className="space-y-4">
          <Field label={`Quantity (${wasteFor?.unit ?? ""})`} hint={owner && wasteFor ? `Value ≈ ${lkr(wForm.qty * wasteFor.costPrice)}` : undefined}><input type="number" min={1} className="field" value={wForm.qty} onChange={(e) => setWForm({ ...wForm, qty: Number(e.target.value) })} /></Field>
          <div><p className="label">Reason</p><div className="flex flex-wrap gap-2">{WASTE_REASONS.map((r) => <button key={r} onClick={() => setWForm({ ...wForm, reason: r })} className={cn("rounded-full border px-3 py-1.5 text-xs", wForm.reason === r ? "border-fg bg-invert text-invert-fg" : "border-line")}>{r}</button>)}</div></div>
          <Field label="Note (optional)"><input className="field" value={wForm.note} onChange={(e) => setWForm({ ...wForm, note: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal open={!!adjustFor} onClose={() => setAdjustFor(null)} title={`Stock-take · ${adjustFor?.name ?? ""}`} footer={<><Button variant="outline" onClick={() => setAdjustFor(null)}>Cancel</Button><Button onClick={() => { if (adjustFor) { if (aForm.qty !== adjustFor.stockQty) adjustStock(adjustFor.id, aForm.qty, aForm.reason); if (aForm.reorder !== adjustFor.reorderLevel) setReorder(adjustFor.id, aForm.reorder); } setAdjustFor(null); }}>Save</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Counted quantity" hint={adjustFor ? `System: ${adjustFor.stockQty}` : undefined}><input type="number" className="field" value={aForm.qty} onChange={(e) => setAForm({ ...aForm, qty: Number(e.target.value) })} /></Field>
          <Field label="Reorder level"><input type="number" className="field" value={aForm.reorder} onChange={(e) => setAForm({ ...aForm, reorder: Number(e.target.value) })} /></Field>
          <Field label="Reason" className="col-span-2"><input className="field" value={aForm.reason} onChange={(e) => setAForm({ ...aForm, reason: e.target.value })} /></Field>
        </div>
        <p className="mt-3 text-xs text-muted">Adjustments are audit-logged.</p>
      </Modal>
    </>
  );
}
