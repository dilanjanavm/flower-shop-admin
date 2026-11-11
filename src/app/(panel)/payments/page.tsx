"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "@/lib/store";
import { cn, lkr } from "@/lib/format";
import { ago, formatDateTime, formatShort } from "@/lib/dates";
import { paymentStatusLabel } from "@/lib/status";
import { Badge, Button, Empty, Modal, PageHeader, Tabs } from "@/components/ui";
import { SlipPreview } from "@/components/orderUi";
import { OwnerOnly } from "@/components/Shell";
import { Icon } from "@/components/Icon";

const REASONS = ["Amount on slip doesn't match the order total", "Slip is unreadable or cropped", "Payment not received in our account", "Wrong reference number"];

/** Bank-slip approval queue (FR-ADMIN-04.2, FR-CUST-05). */
export default function PaymentsPage() {
  const { orders, approveSlip, rejectSlip } = useAdmin();
  const [tab, setTab] = useState<"review" | "awaiting" | "paid">("review");
  const [sel, setSel] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState(REASONS[0]);

  const review = orders.filter((o) => o.orderStatus === "PAYMENT_REVIEW").sort((a, b) => (a.slipUploadedAt ?? "").localeCompare(b.slipUploadedAt ?? ""));
  const awaiting = orders.filter((o) => o.orderStatus === "PENDING_PAYMENT");
  const paid = orders.filter((o) => o.paymentStatus === "PAID").sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 15);
  const list = tab === "review" ? review : tab === "awaiting" ? awaiting : paid;
  const current = review.find((o) => o.id === sel) ?? review[0];

  return (
    <OwnerOnly>
      <PageHeader title="Slip approvals" subtitle="Bank deposit is the only payment method — every slip is checked by hand before an order is confirmed." />
      <Tabs tabs={[{ key: "review", label: "To review", count: review.length }, { key: "awaiting", label: "Awaiting slip", count: awaiting.length }, { key: "paid", label: "Recently verified" }]} value={tab} onChange={setTab} />

      {tab === "review" ? (
        review.length === 0 ? (
          <div className="card"><Empty icon="check" title="All slips verified" body="New uploads appear here instantly, and you'll get an SMS." /></div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <ul className="card divide-y divide-line overflow-hidden">
              {review.map((o) => (
                <li key={o.id}>
                  <button onClick={() => setSel(o.id)} className={cn("flex w-full items-center gap-3 px-4 py-3.5 text-left transition", current?.id === o.id ? "bg-panel-2" : "hover:bg-panel-2/60")}>
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"><Icon name="file" size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{o.customer.name}</span>
                      <span className="block font-mono text-[11px] text-muted">{o.orderNumber}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold tabular-nums">{lkr(o.total)}</span>
                      <span className="block text-[11px] text-muted">{o.slipUploadedAt ? `${ago(o.slipUploadedAt)} ago` : ""}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {current && (
              <section key={current.id} className="card animate-fade-in p-6">
                <div className="grid gap-6 md:grid-cols-[260px_1fr]">
                  <SlipPreview name={current.slipFileName ?? "slip.jpg"} amount={current.total} reference={current.orderNumber} />
                  <div>
                    <p className="label">Check that the slip shows</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center justify-between rounded-xl bg-panel-2 px-3 py-2"><span className="text-muted">Amount</span><span className="font-serif text-2xl">{lkr(current.total, { decimals: true })}</span></li>
                      <li className="flex items-center justify-between rounded-xl bg-panel-2 px-3 py-2"><span className="text-muted">Reference</span><span className="font-mono">{current.orderNumber}</span></li>
                      <li className="flex items-center justify-between rounded-xl bg-panel-2 px-3 py-2"><span className="text-muted">Account</span><span>Sithuliya Flora (Pvt) Ltd</span></li>
                    </ul>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div><p className="label">Delivery</p><p>{formatShort(current.deliveryDate)}</p></div>
                      <div><p className="label">Pay before</p><p>{formatDateTime(current.paymentDueAt)}</p></div>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2">
                      <Button onClick={() => { approveSlip(current.id); setSel(null); }}><Icon name="check" size={16} /> Approve</Button>
                      <Button variant="outline" onClick={() => setRejecting(current.id)}>Reject…</Button>
                      <Link href={`/orders/${current.id}`} className="ml-auto self-center text-sm text-muted hover:text-fg">Open order →</Link>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        )
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line bg-panel-2/50"><tr><th className="th">Order</th><th className="th">Customer</th><th className="th">Delivery</th><th className="th">{tab === "awaiting" ? "Pay before" : "Status"}</th><th className="th text-right">Amount</th></tr></thead>
            <tbody className="divide-y divide-line">
              {list.map((o) => (
                <tr key={o.id} className="hover:bg-panel-2/50">
                  <td className="td"><Link href={`/orders/${o.id}`} className="font-mono text-xs hover:underline">{o.orderNumber}</Link></td>
                  <td className="td">{o.customer.name}</td>
                  <td className="td">{formatShort(o.deliveryDate)}</td>
                  <td className="td">{tab === "awaiting" ? <span className="flex items-center gap-2">{formatDateTime(o.paymentDueAt)}{o.paymentStatus === "REJECTED" && <Badge tone="red">Re-upload</Badge>}</span> : <Badge tone="green">{paymentStatusLabel[o.paymentStatus]}</Badge>}</td>
                  <td className="td text-right font-semibold tabular-nums">{lkr(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <Empty icon="bank" title="Nothing here" />}
        </div>
      )}

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Reject slip" footer={<><Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button><Button variant="danger" onClick={() => { if (rejecting) rejectSlip(rejecting, reason); setRejecting(null); setSel(null); }}>Reject & notify</Button></>}>
        <div className="space-y-2">
          {REASONS.map((r) => (
            <label key={r} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm", reason === r ? "border-fg" : "border-line")}>
              <input type="radio" checked={reason === r} onChange={() => setReason(r)} /> {r}
            </label>
          ))}
        </div>
      </Modal>
    </OwnerOnly>
  );
}
