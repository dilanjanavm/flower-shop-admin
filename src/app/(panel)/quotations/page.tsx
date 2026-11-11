"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "@/lib/store";
import { lkr } from "@/lib/format";
import { ago, formatShort, timeLeft } from "@/lib/dates";
import { quoteStatusLabel } from "@/lib/status";
import { Badge, Empty, PageHeader, Tabs, Thumb } from "@/components/ui";
import { quoteTone } from "@/components/orderUi";
import { Icon } from "@/components/Icon";


/** Quotation inbox sorted by delivery date (FR-ADMIN-04.7). */
export default function QuotationsPage() {
  const { quotes } = useAdmin();
  const [tab, setTab] = useState<"open" | "quoted" | "closed">("open");
  const list = quotes
    .filter((q) => (tab === "open" ? q.status === "REQUESTED" : tab === "quoted" ? q.status === "QUOTED" : !["REQUESTED", "QUOTED"].includes(q.status)))
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));

  return (
    <>
      <PageHeader title="Quotation inbox" subtitle="Custom bouquet requests — check availability, price each flower and send. No stock is reserved until the customer pays." />
      <Tabs
        tabs={[
          { key: "open", label: "New requests", count: quotes.filter((q) => q.status === "REQUESTED").length },
          { key: "quoted", label: "Sent, awaiting customer", count: quotes.filter((q) => q.status === "QUOTED").length },
          { key: "closed", label: "Closed" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {list.length === 0 ? (
        <div className="card"><Empty icon="inbox" title="Inbox zero" body="New requests from the custom bouquet page land here." /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((q, i) => (
            <Link key={q.id} href={`/quotations/${q.id}`} className="card group flex animate-fade-up flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-muted">{q.requestNumber}</p>
                  <p className="mt-0.5 font-medium">{q.customer.name}</p>
                </div>
                <Badge tone={quoteTone[q.status]}>{quoteStatusLabel[q.status]}</Badge>
              </div>
              <div className="mt-4 flex gap-2">
                {q.items.map((it) => (
                  <div key={it.flowerId} className="relative">
                    <Thumb src={it.image} className="h-14 w-14 rounded-xl" />
                    <span className="absolute -right-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-invert px-1 text-[10px] font-bold text-invert-fg">{it.qty}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-muted">{q.notes}</p>
              <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-xs">
                <span className="flex items-center gap-1.5"><Icon name="calendar" size={13} /> {q.fulfilment === "PICKUP" ? "Pickup" : "Delivery"} {formatShort(q.deliveryDate)}</span>
                {q.status === "REQUESTED" && <span className="text-muted">waiting {ago(q.createdAt)}</span>}
                {q.status === "QUOTED" && <span className="font-medium">{lkr(q.quotedTotal ?? 0)} · {q.validUntil ? timeLeft(q.validUntil) : ""} left</span>}
                {q.status === "ACCEPTED" && <span className="text-emerald-700 dark:text-emerald-300">{q.orderNumber}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
