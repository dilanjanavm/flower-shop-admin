"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useAdmin, TRANSITIONS } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";
import type { AdminOrder } from "@/lib/admin-types";
import { cn, lkr, normalisePhone } from "@/lib/format";
import { addDays, formatShort, todayISO } from "@/lib/dates";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/status";
import { products } from "@/lib/mock/catalogue";
import { dayState, slotRemaining, timeSlots, zoneForCity, allCities } from "@/lib/mock/delivery";
import { Badge, Button, Field, Modal, PageHeader, SearchInput, Tabs, Thumb } from "@/components/ui";
import { OrderCard, boardSort, statusTone } from "@/components/orderUi";
import { Icon } from "@/components/Icon";
import Link from "next/link";

const columns: { status: OrderStatus; label: string }[] = [
  { status: "PENDING_PAYMENT", label: "Awaiting payment" },
  { status: "PAYMENT_REVIEW", label: "Slip review" },
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "PREPARING", label: "Preparing" },
  { status: "READY_FOR_DISPATCH", label: "Ready" },
  { status: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { status: "DELIVERED", label: "Delivered" },
];

function Board() {
  const sp = useSearchParams();
  const router = useRouter();
  const { orders, transition, session } = useAdmin();
  const [view, setView] = useState<"board" | "list">("board");
  const [q, setQ] = useState("");
  const [when, setWhen] = useState<"all" | "today" | "tomorrow" | "week">("all");
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<OrderStatus | null>(null);
  const t = todayISO();

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return orders
      .filter((o) => (when === "today" ? o.deliveryDate === t : when === "tomorrow" ? o.deliveryDate === addDays(t, 1) : when === "week" ? o.deliveryDate >= t && o.deliveryDate <= addDays(t, 7) : true))
      .filter((o) => !term || `${o.orderNumber} ${o.customer.name} ${o.recipient.name} ${o.items.map((i) => i.name).join(" ")}`.toLowerCase().includes(term))
      .sort(boardSort);
  }, [orders, q, when, t]);

  const drop = (to: OrderStatus) => {
    setOver(null);
    if (!drag) return;
    const o = orders.find((x) => x.id === drag);
    setDrag(null);
    if (!o || o.orderStatus === to) return;
    if ((to === "CONFIRMED" || (o.orderStatus === "PAYMENT_REVIEW" && to === "PENDING_PAYMENT")) && session?.role !== "OWNER") return;
    transition(o.id, to);
  };

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Earliest delivery slot first · drag a card to move it along the workflow"
        actions={
          <>
            <div className="w-64"><SearchInput value={q} onChange={setQ} placeholder="Order #, customer, recipient…" /></div>
            {session?.role === "OWNER" && <Button size="sm" onClick={() => router.push("/orders?new=1")}><Icon name="plus" size={15} /> Phone order</Button>}
          </>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={[{ key: "all", label: "All dates" }, { key: "today", label: "Today", count: orders.filter((o) => o.deliveryDate === t).length }, { key: "tomorrow", label: "Tomorrow" }, { key: "week", label: "Next 7 days" }]} value={when} onChange={setWhen} />
        <Tabs tabs={[{ key: "board", label: "Board" }, { key: "list", label: "List" }]} value={view} onChange={setView} />
      </div>

      {view === "board" ? (
        <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {columns.map((c) => {
            const list = filtered.filter((o) => o.orderStatus === c.status || (c.status === "OUT_FOR_DELIVERY" && o.orderStatus === "DELIVERY_FAILED"));
            const dragged = orders.find((o) => o.id === drag);
            const allowed = dragged ? TRANSITIONS[dragged.orderStatus].includes(c.status) : false;
            return (
              <section
                key={c.status}
                onDragOver={(e) => { if (allowed) { e.preventDefault(); setOver(c.status); } }}
                onDragLeave={() => setOver(null)}
                onDrop={() => drop(c.status)}
                className={cn(
                  "flex w-72 shrink-0 flex-col rounded-xl border p-3 transition-colors",
                  over === c.status ? "border-accent bg-accent-soft/50" : drag && allowed ? "border-dashed border-accent/60 bg-panel-2/60" : "border-transparent bg-panel-2/60",
                  drag && !allowed && dragged?.orderStatus !== c.status && "opacity-50",
                )}
              >
                <header className="mb-3 flex items-center justify-between px-1.5">
                  <p className="flex items-center gap-2 text-sm font-semibold"><Badge tone={statusTone(c.status)} dot>{c.label}</Badge></p>
                  <span className="text-xs tabular-nums text-muted">{list.length}</span>
                </header>
                <div className="flex min-h-24 flex-1 flex-col gap-2.5">
                  {list.map((o) => (
                    <div key={o.id} className={cn("transition-opacity", drag === o.id && "opacity-40")}>
                      <OrderCard o={o} draggable onDragStart={(e) => { setDrag(o.id); e.dataTransfer.effectAllowed = "move"; }} />
                    </div>
                  ))}
                  {list.length === 0 && <p className="rounded-xl border border-dashed border-line py-8 text-center text-xs text-faint">Nothing here</p>}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-line bg-panel-2/50"><tr><th className="th">Order</th><th className="th">Customer</th><th className="th">Delivery</th><th className="th">Status</th><th className="th">Payment</th><th className="th text-right">Total</th></tr></thead>
              <tbody className="divide-y divide-line">
                {filtered.map((o) => (
                  <tr key={o.id} className="cursor-pointer transition hover:bg-panel-2/60" onClick={() => router.push(`/orders/${o.id}`)}>
                    <td className="td"><div className="flex items-center gap-3"><Thumb src={o.items[0]?.image} className="h-10 w-9 rounded-lg" /><div><p className="font-mono text-xs">{o.orderNumber}</p><p className="text-xs text-muted">{o.items[0]?.name}</p></div></div></td>
                    <td className="td"><p>{o.customer.name}</p><p className="text-xs text-muted">→ {o.recipient.name}</p></td>
                    <td className="td"><p>{o.deliveryDate === t ? "Today" : formatShort(o.deliveryDate)}</p><p className="text-xs text-muted">{timeSlots.find((s) => s.code === o.timeSlot)?.label}</p></td>
                    <td className="td"><Badge tone={statusTone(o.orderStatus)}>{orderStatusLabel[o.orderStatus]}</Badge></td>
                    <td className="td text-xs text-muted">{paymentStatusLabel[o.paymentStatus]}</td>
                    <td className="td text-right font-semibold tabular-nums">{lkr(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ManualOrder open={sp.get("new") === "1"} onClose={() => router.replace("/orders")} />
    </>
  );
}

/** Owner creates phone / walk-in orders with the same lead-time and slot rules (FR-ADMIN-04.6). */
function ManualOrder({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createManualOrder, orders } = useAdmin();
  const [f, setF] = useState({ customer: "", phone: "", productId: products[0].id, tier: "STANDARD", qty: 1, date: "", slot: "", recipient: "", rphone: "", line1: "", city: "", message: "", paid: false });
  const [err, setErr] = useState("");
  const p = products.find((x) => x.id === f.productId)!;
  const v = p.variants.find((x) => x.sizeTier === f.tier) ?? p.variants[0];
  const zone = zoneForCity(f.city);
  const total = (v.salePrice ?? v.price) * f.qty + (zone?.fee ?? 0) + (timeSlots.find((s) => s.code === f.slot)?.surcharge ?? 0);

  const save = () => {
    if (!f.customer || !normalisePhone(f.phone)) return setErr("Customer name and a valid mobile are required.");
    if (!f.date || dayState(f.date).disabled) return setErr(`Pick a valid date — ${f.date ? dayState(f.date).reason : "orders need 2 days' notice"}.`);
    if (!f.slot || slotRemaining(f.date, f.slot as "MORNING") === 0) return setErr("Pick an available slot.");
    if (!zone) return setErr("Recipient city is outside the delivery zones.");
    const now = new Date().toISOString();
    const seq = orders.reduce((m, o) => Math.max(m, Number(o.orderNumber.slice(-5)) || 0), 0) + 1;
    const o: AdminOrder = {
      id: `ord-m${seq}`,
      orderNumber: `SF-${todayISO().slice(2).replace(/-/g, "")}-${String(seq).padStart(5, "0")}`,
      trackingToken: `tk-m${seq}`,
      orderType: "STANDARD",
      fulfilment: "DELIVERY",
      deliveryDate: f.date,
      timeSlot: f.slot as AdminOrder["timeSlot"],
      recipient: { name: f.recipient || f.customer, phone: normalisePhone(f.rphone) ?? f.rphone, line1: f.line1, city: f.city },
      isAnonymousSender: false,
      cardMessage: f.message,
      senderName: f.customer.split(" ")[0],
      items: [{ id: `oi-m${seq}`, name: p.name, image: p.images[0], sizeTier: v.sizeTier, qty: f.qty, unitPrice: v.salePrice ?? v.price, detail: `${v.sizeTier} · phone order`, isCustom: false }],
      subtotal: (v.salePrice ?? v.price) * f.qty,
      discount: 0,
      deliveryFee: zone.fee,
      surcharge: timeSlots.find((s) => s.code === f.slot)?.surcharge ?? 0,
      total,
      orderStatus: f.paid ? "CONFIRMED" : "PENDING_PAYMENT",
      paymentStatus: f.paid ? "PAID" : "UNPAID",
      paymentDueAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
      history: [{ status: "PENDING_PAYMENT", at: now, note: "Phone order" }, ...(f.paid ? [{ status: "CONFIRMED" as const, at: now, note: "Paid in store" }] : [])],
      createdAt: now,
      customer: { id: "walk-in", name: f.customer, email: "", phone: normalisePhone(f.phone) ?? f.phone },
    };
    createManualOrder(o);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New phone / walk-in order" wide footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Create order · {lkr(total)}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer name"><input className="field" value={f.customer} onChange={(e) => setF({ ...f, customer: e.target.value })} /></Field>
        <Field label="Customer mobile"><input className="field" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="077…" /></Field>
        <Field label="Product">
          <select className="field" value={f.productId} onChange={(e) => setF({ ...f, productId: e.target.value })}>
            {products.filter((x) => x.isAvailable).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-[1fr_80px] gap-2">
          <Field label="Size"><select className="field" value={f.tier} onChange={(e) => setF({ ...f, tier: e.target.value })}>{p.variants.filter((x) => x.isActive).map((x) => <option key={x.id} value={x.sizeTier}>{x.sizeTier} · {lkr(x.salePrice ?? x.price)}</option>)}</select></Field>
          <Field label="Qty"><input type="number" min={1} className="field" value={f.qty} onChange={(e) => setF({ ...f, qty: Math.max(1, Number(e.target.value)) })} /></Field>
        </div>
        <Field label="Delivery date" hint="At least 2 days from today" error={f.date && dayState(f.date).disabled ? dayState(f.date).reason : undefined}><input type="date" min={addDays(todayISO(), 2)} className="field" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Slot">
          <select className="field" value={f.slot} onChange={(e) => setF({ ...f, slot: e.target.value })}>
            <option value="">Choose…</option>
            {timeSlots.map((s) => { const left = f.date ? slotRemaining(f.date, s.code) : 1; return <option key={s.code} value={s.code} disabled={left === 0}>{s.label} {s.window}{left === 0 ? " — full" : ""}</option>; })}
          </select>
        </Field>
        <Field label="Recipient name"><input className="field" value={f.recipient} onChange={(e) => setF({ ...f, recipient: e.target.value })} /></Field>
        <Field label="Recipient mobile"><input className="field" value={f.rphone} onChange={(e) => setF({ ...f, rphone: e.target.value })} /></Field>
        <Field label="Address"><input className="field" value={f.line1} onChange={(e) => setF({ ...f, line1: e.target.value })} /></Field>
        <Field label="City" hint={zone ? `${zone.name} · ${lkr(zone.fee)}` : undefined}><input list="m-cities" className="field" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /><datalist id="m-cities">{allCities.map((c) => <option key={c} value={c} />)}</datalist></Field>
        <Field label="Card message" className="sm:col-span-2"><input className="field" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} maxLength={250} /></Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.paid} onChange={(e) => setF({ ...f, paid: e.target.checked })} className="h-4 w-4" /> Already paid in store (skip slip review)</label>
      </div>
      {err && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{err}</p>}
      <p className="mt-4 text-xs text-muted">Need the full order list? <Link href="/orders" className="underline">Close this dialog</Link>.</p>
    </Modal>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <Board />
    </Suspense>
  );
}
