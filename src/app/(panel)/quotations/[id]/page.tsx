"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useAdmin } from "@/lib/store";
import { ribbons, taxonomies, wraps } from "@/lib/mock/catalogue";
import { timeSlots, zoneForCity } from "@/lib/mock/delivery";
import { cn, lkr } from "@/lib/format";
import { formatDateTime, formatLong, timeLeft } from "@/lib/dates";
import { quoteStatusLabel } from "@/lib/status";
import { Badge, Button, Empty, Field, Modal, Thumb } from "@/components/ui";
import { quoteTone } from "@/components/orderUi";
import { Icon } from "@/components/Icon";

/** Price a quotation request (FR-ADMIN-04.7) or decline it (FR-ADMIN-04.8). */
export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { quotes, sendQuote, declineQuote, inventory, gallery, settings, session } = useAdmin();
  const q = quotes.find((x) => x.id === id);
  const [prices, setPrices] = useState<Record<string, number>>(() =>
    Object.fromEntries((q?.items ?? []).map((i) => [i.flowerId, i.unitPrice ?? gallery.find((g) => g.id === i.flowerId)?.indicativePrice ?? 0])),
  );
  const [wrapping, setWrapping] = useState(q?.wrappingPrice ?? wraps.find((w) => w.id === q?.wrapId)?.price ?? 0);
  const [delivery, setDelivery] = useState(q?.deliveryFee ?? (q?.fulfilment === "PICKUP" ? 0 : zoneForCity(q?.recipient.city ?? "")?.fee ?? 750));
  const [discount, setDiscount] = useState(q?.discount ?? 0);
  const [note, setNote] = useState(q?.quoteNote ?? "");
  const [validH, setValidH] = useState(settings.quotationValidityHours);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState("Some of these flowers aren't available for your date. ");

  const itemsTotal = useMemo(() => (q?.items ?? []).reduce((s, i) => s + (prices[i.flowerId] ?? 0) * i.qty, 0), [q, prices]);
  if (!q) return <Empty icon="inbox" title="Request not found" action={<Link href="/quotations" className="underline">Back to inbox</Link>} />;

  const total = itemsTotal + wrapping + delivery - discount;
  const editable = q.status === "REQUESTED" && session?.role === "OWNER";
  const slot = timeSlots.find((s) => s.code === q.timeSlot);
  // Validity never later than the lead-time limit for the requested date (FR-CUST-03.7)
  const latest = new Date(`${q.deliveryDate}T00:00:00Z`).getTime() - 330 * 60_000 - 24 * 3600_000;
  const validUntil = new Date(Math.min(Date.now() + validH * 3600_000, latest)).toISOString();

  return (
    <>
      <div className="mb-6">
        <Link href="/quotations" className="flex items-center gap-1 text-sm text-muted hover:text-fg"><Icon name="arrowLeft" size={15} /> Inbox</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold sm:text-3xl">{q.requestNumber}</h1>
          <Badge tone={quoteTone[q.status]} dot>{quoteStatusLabel[q.status]}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">From {q.customer.name} · {formatDateTime(q.createdAt)}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="font-serif text-2xl">Flowers requested</h2>
              <span className="text-sm text-muted">{q.items.reduce((s, i) => s + i.qty, 0)} stems</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-panel-2/50"><tr><th className="th">Flower</th><th className="th text-right">Qty</th><th className="th text-right">In stock</th><th className="th text-right">Unit price</th><th className="th text-right">Line</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {q.items.map((i) => {
                    const inv = inventory.find((x) => x.id === `inv-${i.flowerId}`);
                    const short = inv && inv.stockQty < i.qty;
                    return (
                      <tr key={i.flowerId}>
                        <td className="td"><span className="flex items-center gap-3"><Thumb src={i.image} className="h-10 w-10 rounded-lg" />{i.name}</span></td>
                        <td className="td text-right font-semibold tabular-nums">{i.qty}</td>
                        <td className="td text-right"><span className={cn("tabular-nums", short ? "text-amber-700 dark:text-amber-300" : "text-muted")}>{inv?.stockQty ?? "—"}{short && " ⚠"}</span></td>
                        <td className="td text-right">
                          {editable ? (
                            <input type="number" min={0} step={10} value={prices[i.flowerId] ?? 0} onChange={(e) => setPrices({ ...prices, [i.flowerId]: Number(e.target.value) })} className="field ml-auto w-28 py-1.5 text-right tabular-nums" aria-label={`Price per ${i.name}`} />
                          ) : (
                            <span className="tabular-nums">{lkr(i.unitPrice ?? 0)}</span>
                          )}
                        </td>
                        <td className="td text-right tabular-nums">{lkr((editable ? prices[i.flowerId] ?? 0 : i.unitPrice ?? 0) * i.qty)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="border-t border-line px-6 py-3 text-xs text-muted">Stock figures are for reference only — quotations never reserve stems (v1.0).</p>
          </section>

          <section className="card grid gap-6 p-6 sm:grid-cols-3">
            <div><p className="label">Style</p><p>{taxonomies.styles.find((s) => s.slug === q.style)?.name}</p></div>
            <div><p className="label">Wrap</p><p>{wraps.find((w) => w.id === q.wrapId)?.name}</p></div>
            <div><p className="label">Ribbon</p><p className="flex items-center gap-2"><span className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: ribbons.find((r) => r.id === q.ribbonId)?.hex }} />{ribbons.find((r) => r.id === q.ribbonId)?.name}</p></div>
            <div className="sm:col-span-3"><p className="label">Customer notes</p><p className="rounded-2xl bg-panel-2 p-4 text-sm">{q.notes || "—"}</p></div>
            {q.referencePhotos.length > 0 && <div className="sm:col-span-3"><p className="label">Reference photos</p><div className="flex gap-3">{q.referencePhotos.map((p, i) => <Thumb key={i} src={p} className="h-28 w-28 rounded-2xl" />)}</div></div>}
          </section>

          <section className="card grid gap-6 p-6 sm:grid-cols-2">
            <div>
              <p className="label">{q.fulfilment === "PICKUP" ? "Pickup" : "Delivery"}</p>
              <p className="font-medium">{formatLong(q.deliveryDate)}</p>
              <p className="text-sm text-muted">{slot?.label} · {slot?.window}</p>
            </div>
            <div>
              <p className="label">Recipient</p>
              <p className="font-medium">{q.recipient.name} · {q.recipient.phone}</p>
              {q.fulfilment === "DELIVERY" && <p className="text-sm text-muted">{q.recipient.line1}, {q.recipient.city}</p>}
            </div>
            {q.cardMessage && <div className="sm:col-span-2"><p className="label">Card</p><p className="font-serif text-lg italic">“{q.cardMessage}”</p></div>}
          </section>
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <section className="card overflow-hidden">
            <div className="bg-invert px-6 py-4 text-invert-fg">
              <p className="text-xs uppercase tracking-widest opacity-70">{editable ? "Build quotation" : "Quotation"}</p>
              <p className="mt-1 font-serif text-4xl tabular-nums">{lkr(editable ? total : q.quotedTotal ?? 0)}</p>
              {q.estimate ? <p className="text-xs opacity-60">Customer saw an indicative estimate of {lkr(q.estimate)}</p> : null}
            </div>
            {editable ? (
              <div className="space-y-4 p-6">
                <div className="flex items-center justify-between text-sm"><span className="text-muted">Flowers</span><span className="tabular-nums">{lkr(itemsTotal)}</span></div>
                <Field label="Wrapping (LKR)"><input type="number" className="field" value={wrapping} onChange={(e) => setWrapping(Number(e.target.value))} /></Field>
                <Field label="Delivery fee (LKR)" hint={q.fulfilment === "PICKUP" ? "Store pickup" : zoneForCity(q.recipient.city)?.name}><input type="number" className="field" value={delivery} onChange={(e) => setDelivery(Number(e.target.value))} /></Field>
                <Field label="Discount (LKR)"><input type="number" className="field" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></Field>
                <Field label="Note to customer" hint="Suggest substitutes here if something is unavailable"><textarea className="field resize-none" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
                <Field label="Valid for" hint={`Until ${formatDateTime(validUntil)}`}>
                  <select className="field" value={validH} onChange={(e) => setValidH(Number(e.target.value))}>{[6, 12, 24, 48].map((h) => <option key={h} value={h}>{h} hours</option>)}</select>
                </Field>
                <Button className="w-full" disabled={total <= 0} onClick={() => sendQuote(q.id, { items: q.items.map((i) => ({ ...i, unitPrice: prices[i.flowerId] ?? 0 })), wrappingPrice: wrapping, deliveryFee: delivery, discount, quoteNote: note, validUntil })}>
                  <Icon name="mail" size={16} /> Send quotation
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setDeclineOpen(true)}>Decline request</Button>
              </div>
            ) : (
              <div className="space-y-2 p-6 text-sm">
                {q.status === "QUOTED" && q.validUntil && <p className="rounded-xl bg-panel-2 p-3">Sent · expires in <strong>{timeLeft(q.validUntil)}</strong></p>}
                {q.quoteNote && <p className="italic text-muted">“{q.quoteNote}”</p>}
                {q.declineReason && <p className="rounded-xl bg-red-50 p-3 text-red-700 dark:bg-red-500/10 dark:text-red-300">{q.declineReason}</p>}
                {q.orderNumber && <p>Converted to order <span className="font-mono">{q.orderNumber}</span></p>}
                {q.status === "REQUESTED" && session?.role !== "OWNER" && <p className="text-muted">Florists can view requests; only the owner sends quotations.</p>}
              </div>
            )}
          </section>
        </aside>
      </div>

      <Modal open={declineOpen} onClose={() => setDeclineOpen(false)} title="Decline request" footer={<><Button variant="outline" onClick={() => setDeclineOpen(false)}>Cancel</Button><Button variant="danger" disabled={reason.trim().length < 5} onClick={() => { declineQuote(q.id, reason); setDeclineOpen(false); }}>Decline & notify</Button></>}>
        <Field label="Reason (sent to the customer)"><textarea className="field resize-none" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </Modal>
    </>
  );
}
