"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useAdmin, TRANSITIONS } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";
import { cn, lkr } from "@/lib/format";
import { formatDateTime, formatLong } from "@/lib/dates";
import { timeSlots } from "@/lib/mock/delivery";
import { riders } from "@/lib/mock/admin";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/status";
import { Badge, Button, Empty, Field, Modal, Tabs, Thumb } from "@/components/ui";
import { GreetingCard, JobSheet, SlipPreview, Waybill, actionLabel, statusTone } from "@/components/orderUi";
import { Icon } from "@/components/Icon";

const REJECT_REASONS = ["Amount on slip doesn't match the order total", "Slip is unreadable or cropped", "Payment not received in our account", "Wrong reference number"];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { orders, transition, approveSlip, rejectSlip, assignRider, updateOrder, refund, session, toast } = useAdmin();
  const o = orders.find((x) => x.id === id);
  const [print, setPrint] = useState<"job" | "card" | "waybill" | null>(null);
  const [font, setFont] = useState<"serif" | "script" | "sans">("script");
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [failOpen, setFailOpen] = useState(false);
  const [failReason, setFailReason] = useState("Recipient unreachable");
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmt, setRefundAmt] = useState(0);
  const [notes, setNotes] = useState(o?.internalNotes ?? "");

  if (!o) return <Empty icon="receipt" title="Order not found" action={<Link href="/orders" className="underline">Back to orders</Link>} />;

  const owner = session?.role === "OWNER";
  const slot = timeSlots.find((s) => s.code === o.timeSlot);
  // Florists may only move CONFIRMED → PREPARING → READY (SRS 4.2)
  const allowed = TRANSITIONS[o.orderStatus].filter((s) => {
    if (o.orderStatus === "PAYMENT_REVIEW") return false; // handled by slip panel
    if (!owner) return (o.orderStatus === "CONFIRMED" && s === "PREPARING") || (o.orderStatus === "PREPARING" && s === "READY_FOR_DISPATCH");
    if (s === "OUT_FOR_DELIVERY" && o.fulfilment === "DELIVERY" && !o.riderId) return false;
    if (s === "OUT_FOR_DELIVERY" && o.fulfilment === "PICKUP") return false;
    if (s === "DELIVERED" && o.orderStatus === "READY_FOR_DISPATCH" && o.fulfilment === "DELIVERY") return false;
    return true;
  });

  const act = (to: OrderStatus) => {
    if (to === "DELIVERY_FAILED") return setFailOpen(true);
    if (to === "DELIVERED" && o.fulfilment === "DELIVERY" && !o.podPhoto) updateOrder(o.id, { podPhoto: o.items[0]?.image });
    transition(o.id, to, to === "CANCELLED" ? "Cancelled by owner (audited)" : undefined);
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/orders" className="flex items-center gap-1 text-sm text-muted hover:text-fg"><Icon name="arrowLeft" size={15} /> Orders</Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold sm:text-3xl">{o.orderNumber}</h1>
            <Badge tone={statusTone(o.orderStatus)} dot>{orderStatusLabel[o.orderStatus]}</Badge>
            <Badge tone={o.paymentStatus === "PAID" ? "green" : o.paymentStatus === "REJECTED" ? "red" : "amber"}>{paymentStatusLabel[o.paymentStatus]}</Badge>
            {o.orderType === "CUSTOM" && <Badge tone="accent">Custom bouquet</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">Placed {formatDateTime(o.createdAt)} by {o.customer.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setPrint("job")}><Icon name="printer" size={15} /> Job sheet</Button>
          <Button variant="outline" size="sm" onClick={() => setPrint("card")}><Icon name="card" size={15} /> Card</Button>
          {o.fulfilment === "DELIVERY" && <Button variant="outline" size="sm" onClick={() => setPrint("waybill")}><Icon name="map" size={15} /> Waybill</Button>}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Slip review (FR-ADMIN-04.2) */}
          {o.orderStatus === "PAYMENT_REVIEW" && (
            <section className="card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-line bg-amber-50 px-6 py-3 text-sm font-medium text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"><Icon name="bank" size={16} /> Bank slip waiting for review</div>
              <div className="grid gap-6 p-6 md:grid-cols-[220px_1fr]">
                <SlipPreview name={o.slipFileName ?? "slip.jpg"} amount={o.total} reference={o.orderNumber} />
                <div>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div><dt className="label">Order total</dt><dd className="font-semibold tracking-tight text-2xl">{lkr(o.total, { decimals: true })}</dd></div>
                    <div><dt className="label">Reference</dt><dd className="font-mono">{o.orderNumber}</dd></div>
                    <div><dt className="label">Uploaded</dt><dd>{o.slipUploadedAt ? formatDateTime(o.slipUploadedAt) : "—"}</dd></div>
                    <div><dt className="label">Pay before</dt><dd>{formatDateTime(o.paymentDueAt)}</dd></div>
                  </dl>
                  {owner ? (
                    <div className="mt-6 flex flex-wrap gap-2">
                      <Button onClick={() => approveSlip(o.id)}><Icon name="check" size={16} /> Approve — confirm order</Button>
                      <Button variant="outline" onClick={() => setReject(true)}>Reject…</Button>
                    </div>
                  ) : (
                    <p className="mt-6 text-sm text-muted">Only the owner can approve slips.</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {o.orderStatus === "PENDING_PAYMENT" && (
            <section className="flex items-start gap-3 rounded-xl border border-line bg-panel p-5 text-sm">
              <Icon name="clock" className="mt-0.5 text-amber-600" />
              <div>
                <p className="font-medium">Waiting for the customer&apos;s bank slip</p>
                <p className="text-muted">Auto-cancels at {formatDateTime(o.paymentDueAt)} if no slip arrives; the slot is then released.{o.slipRejectReason ? ` Last slip rejected: ${o.slipRejectReason}.` : ""}</p>
              </div>
            </section>
          )}

          {/* Workflow actions */}
          <section className="card p-6">
            <h2 className="font-semibold tracking-tight text-lg">Workflow</h2>
            <Stepper status={o.orderStatus} />
            {allowed.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {allowed.map((s) => (
                  <Button key={s} variant={s === "CANCELLED" || s === "DELIVERY_FAILED" ? "outline" : "primary"} onClick={() => act(s)}>
                    {s === "CANCELLED" ? <Icon name="ban" size={15} /> : s === "DELIVERY_FAILED" ? <Icon name="alert" size={15} /> : <Icon name="arrowRight" size={15} />}
                    {s === "DELIVERED" && o.fulfilment === "PICKUP" ? "Collected by customer" : s === "READY_FOR_DISPATCH" && o.orderStatus === "DELIVERY_FAILED" ? "Re-dispatch" : actionLabel[s]}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">{["DELIVERED", "CANCELLED"].includes(o.orderStatus) ? "This order is closed." : o.orderStatus === "PAYMENT_REVIEW" ? "Review the slip above to continue." : "No actions available for your role at this step."}</p>
            )}
            {o.orderStatus === "READY_FOR_DISPATCH" && o.fulfilment === "DELIVERY" && !o.riderId && owner && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">Assign a rider to send this out for delivery.</p>}
          </section>

          {/* Items */}
          <section className="card divide-y divide-line">
            {o.items.map((i) => (
              <div key={i.id} className="flex items-center gap-4 p-5">
                <Thumb src={i.image} className="h-16 w-14 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{i.name} <span className="text-muted">× {i.qty}</span></p>
                  <p className="text-sm text-muted">{i.detail}</p>
                </div>
                {owner && <p className="font-semibold tabular-nums">{lkr(i.unitPrice * i.qty)}</p>}
              </div>
            ))}
            {o.cardMessage && (
              <div className="p-5"><p className="label">Card message</p><p className="font-semibold tracking-tight text-base italic">“{o.cardMessage}”</p><p className="text-xs text-muted">— {o.isAnonymousSender ? "Anonymous sender" : o.senderName}</p></div>
            )}
            {owner && (
              <dl className="space-y-1.5 p-5 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{lkr(o.subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{lkr(o.deliveryFee)}</dd></div>
                {o.surcharge > 0 && <div className="flex justify-between"><dt className="text-muted">Midnight surcharge</dt><dd>{lkr(o.surcharge)}</dd></div>}
                {o.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount {o.couponCode}</dt><dd>−{lkr(o.discount)}</dd></div>}
                <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Total</dt><dd className="tabular-nums">{lkr(o.total)}</dd></div>
              </dl>
            )}
          </section>

          {(o.bouquetPhoto || o.podPhoto || ["PREPARING", "READY_FOR_DISPATCH"].includes(o.orderStatus)) && (
            <section className="card p-6">
              <h2 className="mb-4 font-semibold tracking-tight text-lg">Photos</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <figure>
                  {o.bouquetPhoto ? <Thumb src={o.bouquetPhoto} className="aspect-[4/3] rounded-xl" /> : (
                    <label className="grid aspect-[4/3] cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-sm text-muted hover:border-fg/40">
                      <span className="flex flex-col items-center gap-2"><Icon name="camera" /> Upload finished-bouquet photo</span>
                      <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { updateOrder(o.id, { bouquetPhoto: URL.createObjectURL(f) }); toast({ title: "Photo added", body: "The customer can see it on their order.", tone: "success" }); } }} />
                    </label>
                  )}
                  <figcaption className="mt-2 text-xs text-muted">Finished bouquet (shown to customer)</figcaption>
                </figure>
                {o.podPhoto && <figure><Thumb src={o.podPhoto} className="aspect-[4/3] rounded-xl" /><figcaption className="mt-2 text-xs text-muted">Proof of delivery</figcaption></figure>}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="card p-6">
            <p className="label">{o.fulfilment === "PICKUP" ? "Store pickup" : "Delivery"}</p>
            <p className="font-medium">{formatLong(o.deliveryDate)}</p>
            <p className="text-sm text-muted">{slot?.label} · {slot?.window}</p>
            <div className="mt-5 border-t border-line pt-5">
              <p className="label">Recipient</p>
              <p className="font-medium">{o.recipient.name}</p>
              <a href={`tel:${o.recipient.phone}`} className="text-sm text-accent">{o.recipient.phone}</a>
              {o.fulfilment === "DELIVERY" && <p className="mt-1 text-sm">{o.recipient.line1}, {o.recipient.city}</p>}
              {o.recipient.landmark && <p className="text-xs text-muted">Landmark: {o.recipient.landmark}</p>}
              {o.recipient.instructions && <p className="text-xs text-muted">Note: {o.recipient.instructions}</p>}
            </div>
            {owner && (
              <div className="mt-5 border-t border-line pt-5">
                <p className="label">Customer</p>
                <p className="font-medium">{o.customer.name}</p>
                <p className="text-sm text-muted">{o.customer.phone}</p>
                <p className="text-sm text-muted">{o.customer.email}</p>
                {o.isAnonymousSender && <Badge tone="neutral" className="mt-2">Sender hidden from rider & recipient</Badge>}
              </div>
            )}
          </section>

          {owner && o.fulfilment === "DELIVERY" && !["DELIVERED", "CANCELLED"].includes(o.orderStatus) && (
            <section className="card p-6">
              <p className="label">Rider</p>
              <div className="space-y-2">
                {riders.filter((r) => r.active).map((r) => (
                  <button key={r.id} onClick={() => assignRider(o.id, r.id)} className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition", o.riderId === r.id ? "border-fg bg-panel-2" : "border-line hover:border-fg/40")}>
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-accent-fg"><Icon name="bike" size={16} /></span>
                    <span className="flex-1"><span className="block font-medium">{r.name}</span><span className="text-xs text-muted">{orders.filter((x) => x.riderId === r.id && x.deliveryDate === o.deliveryDate && x.orderStatus !== "DELIVERED").length} drops that day</span></span>
                    {o.riderId === r.id && <Icon name="check" size={16} />}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="card p-6">
            <Field label="Internal notes" hint="Shown on the job sheet, never to the customer">
              <textarea className="field resize-none" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => updateOrder(o.id, { internalNotes: notes })} />
            </Field>
          </section>

          <section className="card p-6">
            <p className="label">Timeline</p>
            <ol className="relative mt-2 space-y-4 border-l border-line pl-5">
              {[...o.history].reverse().map((h, i) => (
                <li key={h.at + h.status} className="relative">
                  <span className={cn("absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-panel", i === 0 ? "bg-accent" : "bg-line")} />
                  <p className="text-sm font-medium">{orderStatusLabel[h.status]}</p>
                  <p className="text-xs text-muted">{formatDateTime(h.at)}{h.note ? ` · ${h.note}` : ""}</p>
                </li>
              ))}
            </ol>
          </section>

          {owner && o.paymentStatus === "PAID" && ["CANCELLED", "DELIVERY_FAILED", "DELIVERED"].includes(o.orderStatus) && (
            <Button variant="outline" className="w-full" onClick={() => { setRefundAmt(o.total); setRefundOpen(true); }}><Icon name="refresh" size={15} /> Record bank refund</Button>
          )}
        </aside>
      </div>

      <Modal open={!!print} onClose={() => setPrint(null)} title={print === "job" ? "Florist job sheet (A5)" : print === "card" ? "Greeting card (A6)" : "Delivery waybill (A5)"} wide footer={<><Button variant="outline" onClick={() => setPrint(null)}>Close</Button><Button onClick={() => window.print()}><Icon name="printer" size={15} /> Print</Button></>}>
        {print === "card" && (
          <div className="no-print mb-4"><Tabs tabs={[{ key: "script", label: "Script" }, { key: "serif", label: "Serif" }, { key: "sans", label: "Sans" }]} value={font} onChange={setFont} /></div>
        )}
        <div className="rounded-xl bg-panel-2 p-4">
          {print === "job" && <JobSheet o={o} />}
          {print === "card" && <GreetingCard o={o} font={font} />}
          {print === "waybill" && <Waybill o={o} />}
        </div>
      </Modal>

      <Modal open={reject} onClose={() => setReject(false)} title="Reject bank slip" footer={<><Button variant="outline" onClick={() => setReject(false)}>Cancel</Button><Button variant="danger" onClick={() => { rejectSlip(o.id, reason); setReject(false); }}>Reject & notify customer</Button></>}>
        <p className="mb-4 text-sm text-muted">The customer will be asked to upload a new slip within the remaining payment window.</p>
        <div className="space-y-2">
          {REJECT_REASONS.map((r) => (
            <label key={r} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm", reason === r ? "border-fg" : "border-line")}>
              <input type="radio" checked={reason === r} onChange={() => setReason(r)} /> {r}
            </label>
          ))}
        </div>
      </Modal>

      <Modal open={failOpen} onClose={() => setFailOpen(false)} title="Delivery failed" footer={<><Button variant="outline" onClick={() => setFailOpen(false)}>Cancel</Button><Button variant="danger" onClick={() => { transition(o.id, "DELIVERY_FAILED", failReason); setFailOpen(false); }}>Mark failed</Button></>}>
        <Field label="Reason">
          <select className="field" value={failReason} onChange={(e) => setFailReason(e.target.value)}>
            {["Recipient unreachable", "Wrong address", "Refused by recipient", "Other"].map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
      </Modal>

      <Modal open={refundOpen} onClose={() => setRefundOpen(false)} title="Record bank refund" footer={<><Button variant="outline" onClick={() => setRefundOpen(false)}>Cancel</Button><Button onClick={() => { refund(o.id, refundAmt); setRefundOpen(false); }}>Record refund</Button></>}>
        <Field label="Amount refunded (LKR)" hint={`Order total ${lkr(o.total)} · audited`}><input type="number" className="field" value={refundAmt} max={o.total} onChange={(e) => setRefundAmt(Number(e.target.value))} /></Field>
      </Modal>
    </>
  );
}

function Stepper({ status }: { status: OrderStatus }) {
  const steps: OrderStatus[] = ["PENDING_PAYMENT", "PAYMENT_REVIEW", "CONFIRMED", "PREPARING", "READY_FOR_DISPATCH", "OUT_FOR_DELIVERY", "DELIVERED"];
  const idx = status === "DELIVERY_FAILED" ? 5 : status === "CANCELLED" ? -1 : steps.indexOf(status);
  return (
    <ol className="mt-5 grid grid-cols-7 gap-1">
      {steps.map((s, i) => (
        <li key={s} className="flex flex-col items-center text-center">
          <span className={cn("h-1.5 w-full rounded-full transition-colors duration-700", i <= idx ? (status === "DELIVERY_FAILED" && i === 5 ? "bg-red-500" : "bg-accent") : "bg-panel-2")} />
          <span className={cn("mt-2 text-[10px] leading-tight sm:text-[11px]", i === idx ? "font-semibold text-fg" : "text-muted")}>{orderStatusLabel[s]}</span>
        </li>
      ))}
    </ol>
  );
}
