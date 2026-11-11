"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "@/lib/store";
import type { SlotCode } from "@/lib/types";
import { cn, lkr } from "@/lib/format";
import { addDays, formatDate, formatShort, todayISO, weekdayIndex } from "@/lib/dates";
import { SLOT_CAPACITY, deliveryZones, slotRemaining, timeSlots } from "@/lib/mock/delivery";
import { riders } from "@/lib/mock/admin";
import { orderStatusLabel } from "@/lib/status";
import { Badge, Button, Field, Modal, PageHeader, Tabs, Thumb } from "@/components/ui";
import { OwnerOnly } from "@/components/Shell";
import { Icon } from "@/components/Icon";

/** Slots, capacity, zones, peak rules and rider dispatch (FR-ADMIN-05). */
export default function DeliveryPage() {
  const { orders, assignRider, transition, capacity, setCapacity, blackouts, addBlackout, removeBlackout, settings } = useAdmin();
  const [tab, setTab] = useState<"dispatch" | "capacity" | "zones" | "calendar">("dispatch");
  const [cell, setCell] = useState<{ date: string; slot: SlotCode } | null>(null);
  const [capVal, setCapVal] = useState(0);
  const [bo, setBo] = useState({ date: "", note: "" });
  const [day, setDay] = useState(todayISO());
  const t = todayISO();

  const dayOrders = orders.filter((o) => o.deliveryDate === day && o.fulfilment === "DELIVERY" && ["READY_FOR_DISPATCH", "OUT_FOR_DELIVERY", "DELIVERY_FAILED", "PREPARING", "CONFIRMED", "DELIVERED"].includes(o.orderStatus));
  const unassigned = dayOrders.filter((o) => !o.riderId && o.orderStatus !== "DELIVERED");
  const days = Array.from({ length: 14 }, (_, i) => addDays(t, i));
  const cap = (date: string, slot: SlotCode) => capacity[`${date}:${slot}`] ?? SLOT_CAPACITY[slot];
  const booked = (date: string, slot: SlotCode) => Math.max(0, SLOT_CAPACITY[slot] - slotRemaining(date, slot)) + orders.filter((o) => o.deliveryDate === date && o.timeSlot === slot && o.orderStatus !== "CANCELLED").length;

  return (
    <OwnerOnly>
      <PageHeader title="Delivery & riders" subtitle={`Lead time ${settings.leadTimeDays} days · ${timeSlots.length} slots · ${deliveryZones.length} zones`} />
      <Tabs tabs={[{ key: "dispatch", label: "Dispatch", count: unassigned.length }, { key: "capacity", label: "Slot capacity" }, { key: "zones", label: "Zones & fees" }, { key: "calendar", label: "Blackouts & peak days" }]} value={tab} onChange={setTab} />

      {tab === "dispatch" && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {[0, 1, 2].map((n) => { const d = addDays(t, n); return <button key={d} onClick={() => setDay(d)} className={cn("rounded-full border px-4 py-1.5 text-sm transition", day === d ? "border-fg bg-invert text-invert-fg" : "border-line hover:border-fg/40")}>{n === 0 ? "Today" : n === 1 ? "Tomorrow" : formatShort(d)}</button>; })}
            <Link href="/rider" className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><Icon name="phone" size={15} /> Open rider view</Link>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <section className="rounded-3xl bg-panel-2/60 p-4">
              <p className="mb-3 flex items-center justify-between px-1 text-sm font-semibold">Unassigned <span className="text-xs text-muted">{unassigned.length}</span></p>
              <div className="space-y-2.5">
                {unassigned.map((o) => (
                  <div key={o.id} className="rounded-2xl border border-line bg-panel p-3.5">
                    <div className="flex items-center gap-3">
                      <Thumb src={o.items[0]?.image} className="h-10 w-9 rounded-lg" />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{o.recipient.name}</p><p className="text-xs text-muted">{o.recipient.city} · {timeSlots.find((s) => s.code === o.timeSlot)?.label}</p></div>
                      <Badge tone="neutral">{o.orderStatus === "READY_FOR_DISPATCH" ? "Ready" : o.orderStatus === "DELIVERY_FAILED" ? "Failed" : "Preparing"}</Badge>
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      {riders.filter((r) => r.active).map((r) => <button key={r.id} onClick={() => assignRider(o.id, r.id)} className="flex-1 rounded-full border border-line py-1.5 text-xs transition hover:border-fg hover:bg-invert hover:text-invert-fg">→ {r.name.split(" ")[0]}</button>)}
                    </div>
                  </div>
                ))}
                {unassigned.length === 0 && <p className="py-8 text-center text-xs text-faint">All drops assigned</p>}
              </div>
            </section>
            {riders.filter((r) => r.active).map((r) => {
              const mine = dayOrders.filter((o) => o.riderId === r.id).sort((a, b) => timeSlots.findIndex((s) => s.code === a.timeSlot) - timeSlots.findIndex((s) => s.code === b.timeSlot));
              return (
                <section key={r.id} className="card p-4">
                  <div className="mb-3 flex items-center gap-3 px-1">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent-fg"><Icon name="bike" size={18} /></span>
                    <div className="flex-1"><p className="text-sm font-semibold">{r.name}</p><p className="text-xs text-muted">{mine.filter((o) => o.orderStatus === "DELIVERED").length}/{mine.length} delivered</p></div>
                    <a href={`tel:${r.phone}`} className="grid h-8 w-8 place-items-center rounded-full hover:bg-panel-2" aria-label={`Call ${r.name}`}><Icon name="phone" size={15} /></a>
                  </div>
                  <ol className="space-y-2">
                    {mine.map((o, i) => (
                      <li key={o.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-panel-2 text-[11px] font-bold">{i + 1}</span>
                        <div className="min-w-0 flex-1"><Link href={`/orders/${o.id}`} className="block truncate text-sm font-medium hover:underline">{o.recipient.name}</Link><p className="text-xs text-muted">{o.recipient.city} · {timeSlots.find((s) => s.code === o.timeSlot)?.window}</p></div>
                        {o.orderStatus === "READY_FOR_DISPATCH" ? <Button size="sm" onClick={() => transition(o.id, "OUT_FOR_DELIVERY")}>Send out</Button> : <Badge tone={o.orderStatus === "DELIVERED" ? "green" : o.orderStatus === "DELIVERY_FAILED" ? "red" : o.orderStatus === "OUT_FOR_DELIVERY" ? "ink" : "neutral"}>{o.orderStatus === "OUT_FOR_DELIVERY" ? "On the way" : orderStatusLabel[o.orderStatus]}</Badge>}
                      </li>
                    ))}
                    {mine.length === 0 && <p className="py-6 text-center text-xs text-faint">No drops</p>}
                  </ol>
                </section>
              );
            })}
          </div>
        </>
      )}

      {tab === "capacity" && (
        <div className="card overflow-x-auto p-4">
          <table className="w-full min-w-[900px] border-separate border-spacing-1 text-xs">
            <thead><tr><th className="th w-28" />{days.map((d) => <th key={d} className={cn("rounded-lg px-1 py-2 text-center font-semibold", d === t ? "bg-accent-soft text-accent-fg" : "text-muted")}>{formatShort(d).replace(",", "")}</th>)}</tr></thead>
            <tbody>
              {timeSlots.map((s) => (
                <tr key={s.code}>
                  <td className="pr-2 text-sm font-medium">{s.label}<span className="block text-[10px] font-normal text-muted">{s.window}</span></td>
                  {days.map((d) => {
                    const closed = weekdayIndex(d) === 0 || blackouts.some((b) => b.date === d);
                    const c = cap(d, s.code);
                    const b = Math.min(c, booked(d, s.code));
                    const pct = c ? b / c : 1;
                    return (
                      <td key={d}>
                        <button
                          disabled={closed}
                          onClick={() => { setCell({ date: d, slot: s.code }); setCapVal(c); }}
                          className={cn("relative h-12 w-full overflow-hidden rounded-lg border text-[11px] tabular-nums transition hover:border-fg/50", closed ? "border-transparent bg-panel-2 text-faint" : "border-line bg-panel")}
                          title={closed ? "Closed" : `${b}/${c} booked`}
                        >
                          {!closed && <span className={cn("absolute inset-x-0 bottom-0", pct >= 1 ? "bg-red-400/40" : pct > 0.75 ? "bg-amber-400/40" : "bg-accent/20")} style={{ height: `${pct * 100}%` }} />}
                          <span className="relative">{closed ? "—" : `${b}/${c}`}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 px-2 text-xs text-muted">Click a cell to override capacity for that date. Full slots are greyed out at checkout immediately; checkout locks the slot row so it can&apos;t be overbooked.</p>
        </div>
      )}

      {tab === "zones" && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line bg-panel-2/50"><tr><th className="th">Zone</th><th className="th">Areas</th><th className="th text-right">Fee</th><th className="th text-right">Free over</th></tr></thead>
            <tbody className="divide-y divide-line">
              {deliveryZones.map((z) => (
                <tr key={z.id}>
                  <td className="td font-medium">{z.name}</td>
                  <td className="td"><div className="flex flex-wrap gap-1">{z.cities.map((c) => <span key={c} className="rounded-full bg-panel-2 px-2 py-0.5 text-[11px]">{c}</span>)}</div></td>
                  <td className="td text-right tabular-nums">{lkr(z.fee)}</td>
                  <td className="td text-right tabular-nums text-muted">{z.freeOver ? lkr(z.freeOver) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-3 text-xs text-muted">Addresses outside every zone fall back to Google Maps distance × Rs 120/km (max 30 km), otherwise checkout blocks them.</p>
        </div>
      )}

      {tab === "calendar" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card p-6">
            <h2 className="font-serif text-2xl">Blackout dates</h2>
            <p className="text-sm text-muted">No orders can be placed for these dates. Sundays are always closed.</p>
            <ul className="mt-4 divide-y divide-line">
              {blackouts.map((b) => (
                <li key={b.date} className="flex items-center gap-3 py-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-panel-2 text-center text-[10px] leading-tight"><span><span className="block font-serif text-base">{Number(b.date.slice(8))}</span>{formatDate(b.date).split(" ")[1]}</span></span>
                  <span className="flex-1 text-sm">{b.note}</span>
                  <button onClick={() => removeBlackout(b.date)} className="text-muted hover:text-red-600" aria-label="Remove"><Icon name="trash" size={16} /></button>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-[150px_1fr_auto] gap-2">
              <input type="date" className="field" value={bo.date} min={t} onChange={(e) => setBo({ ...bo, date: e.target.value })} />
              <input className="field" placeholder="Reason, e.g. Poya day" value={bo.note} onChange={(e) => setBo({ ...bo, note: e.target.value })} />
              <Button disabled={!bo.date || !bo.note} onClick={() => { addBlackout(bo.date, bo.note); setBo({ date: "", note: "" }); }}>Add</Button>
            </div>
          </section>
          <section className="card p-6">
            <h2 className="font-serif text-2xl">Peak-day rules</h2>
            <p className="text-sm text-muted">Surcharges and minimum order values by date range.</p>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                { d: "10 – 14 Feb 2027", r: "Valentine's week", rule: "+Rs 1,000 surcharge · min order Rs 8,000 · capacity +40%" },
                { d: "9 May 2027", r: "Mother's Day", rule: "+Rs 500 surcharge · Midnight slot closed" },
                { d: "24 – 25 Dec 2026", r: "Christmas", rule: "Shop closed on 25th" },
              ].map((p) => (
                <li key={p.d} className="rounded-2xl border border-line p-4"><p className="font-medium">{p.r} <span className="text-xs font-normal text-muted">· {p.d}</span></p><p className="mt-1 text-muted">{p.rule}</p></li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <Modal open={!!cell} onClose={() => setCell(null)} title="Slot capacity" footer={<><Button variant="outline" onClick={() => setCell(null)}>Cancel</Button><Button onClick={() => { if (cell) setCapacity(`${cell.date}:${cell.slot}`, capVal); setCell(null); }}>Save override</Button></>}>
        {cell && (
          <>
            <p className="text-sm text-muted">{formatDate(cell.date)} · {timeSlots.find((s) => s.code === cell.slot)?.label}. Default is {SLOT_CAPACITY[cell.slot]}; {Math.min(cap(cell.date, cell.slot), booked(cell.date, cell.slot))} already booked.</p>
            <Field label="Maximum orders" className="mt-4"><input type="number" min={0} className="field" value={capVal} onChange={(e) => setCapVal(Number(e.target.value))} /></Field>
          </>
        )}
      </Modal>
    </OwnerOnly>
  );
}
