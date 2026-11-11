"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAdmin } from "@/lib/store";
import { lkr, cn } from "@/lib/format";
import { addDays, ago, formatShort, todayISO } from "@/lib/dates";
import { timeSlots } from "@/lib/mock/delivery";
import { revenueSeries } from "@/lib/mock/admin";
import { orderStatusLabel } from "@/lib/status";
import { AreaChart, HBarChart } from "@/components/charts";
import { Badge, PageHeader, StatCard, Thumb, Tabs, LinkButton } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { statusTone } from "@/components/orderUi";

export default function DashboardPage() {
  const { orders, quotes, inventory, session, products } = useAdmin();
  const [range, setRange] = useState<"7" | "30">("30");
  const t = todayISO();
  const owner = session?.role === "OWNER";

  const paid = orders.filter((o) => o.paymentStatus === "PAID" || o.paymentStatus === "PARTIALLY_REFUNDED");
  const since = (days: number) => paid.filter((o) => o.createdAt.slice(0, 10) >= addDays(t, -days + 1));
  const series = useMemo(() => revenueSeries(Number(range)), [range]);
  const revToday = since(1).reduce((s, o) => s + o.total, 0) + series[series.length - 1].revenue;
  const revWeek = series.slice(-7).reduce((s, d) => s + d.revenue, 0);
  const revMonth = revenueSeries(30).reduce((s, d) => s + d.revenue, 0);
  const totalOrders = revenueSeries(30).reduce((s, d) => s + d.orders, 0);
  const aov = Math.round(revMonth / Math.max(1, totalOrders));

  const todays = orders.filter((o) => o.deliveryDate === t && !["CANCELLED"].includes(o.orderStatus));
  const pendingToday = todays.filter((o) => o.orderStatus !== "DELIVERED");
  const bySlot = timeSlots.map((s) => ({ ...s, n: pendingToday.filter((o) => o.timeSlot === s.code).length, total: todays.filter((o) => o.timeSlot === s.code).length }));
  const slips = orders.filter((o) => o.orderStatus === "PAYMENT_REVIEW");
  const openQuotes = quotes.filter((q) => q.status === "REQUESTED");
  const low = inventory.filter((i) => i.stockQty <= i.reorderLevel);

  // Near-date unpaid orders are flagged (FR-ADMIN-04.1)
  const atRisk = orders.filter((o) => o.orderStatus === "PENDING_PAYMENT" && o.deliveryDate <= addDays(t, 3));

  const byOccasion = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of paid) {
      const p = products.find((x) => x.name === o.items[0]?.name);
      const occ = p?.occasions[0] ?? "custom";
      m.set(occ, (m.get(occ) ?? 0) + o.total);
    }
    return [...m.entries()].map(([k, v]) => ({ label: k.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()), value: v })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [paid, products]);

  const upNext = orders
    .filter((o) => ["CONFIRMED", "PREPARING", "READY_FOR_DISPATCH"].includes(o.orderStatus))
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate) || timeSlots.findIndex((s) => s.code === a.timeSlot) - timeSlots.findIndex((s) => s.code === b.timeSlot))
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${session?.name.split(" ")[0]}`}
        subtitle={`${pendingToday.length} deliveries still to go today · ${slips.length} slips and ${openQuotes.length} quotations waiting`}
        actions={<><LinkButton href="/orders" variant="outline" size="sm"><Icon name="kanban" size={15} /> Orders board</LinkButton>{owner && <LinkButton href="/orders?new=1" size="sm"><Icon name="plus" size={15} /> Phone order</LinkButton>}</>}
      />

      {/* KPI tiles (FR-ADMIN-01.1) */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {owner ? (
          <>
            <StatCard label="Revenue today" value={lkr(revToday)} hint={<>Week {lkr(revWeek)} · Month {lkr(revMonth)}</>} icon="chart" tone="accent" href="/reports" />
            <StatCard label="Orders · 30 days" value={totalOrders} hint={<>Avg order value {lkr(aov)}</>} icon="receipt" delay={60} href="/reports" />
          </>
        ) : (
          <>
            <StatCard label="To prepare" value={orders.filter((o) => o.orderStatus === "CONFIRMED").length} hint="Confirmed, not started" icon="flower" tone="accent" href="/orders" />
            <StatCard label="In preparation" value={orders.filter((o) => o.orderStatus === "PREPARING").length} icon="clock" delay={60} href="/orders" />
          </>
        )}
        <StatCard label="Slips to verify" value={slips.length} hint={slips[0] ? `Oldest waiting ${ago(slips.reduce((a, o) => ((o.slipUploadedAt ?? a) < a ? o.slipUploadedAt ?? a : a), new Date().toISOString()))}` : "All clear"} icon="bank" tone={slips.length ? "amber" : "neutral"} delay={120} href={owner ? "/payments" : undefined} />
        <StatCard label="Open quotations" value={openQuotes.length} hint={`${low.length} stock items at or below reorder level`} icon="inbox" tone={openQuotes.length ? "accent" : "neutral"} delay={180} href="/quotations" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {owner ? (
          <section className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl">Revenue trend</h2>
                <p className="text-xs text-muted">Paid orders by order date · LKR</p>
              </div>
              <div className="w-48"><Tabs tabs={[{ key: "7", label: "7 days" }, { key: "30", label: "30 days" }]} value={range} onChange={setRange} /></div>
            </div>
            <AreaChart data={series.map((d) => ({ label: formatShort(d.date).replace(/^\w+, /, ""), value: d.revenue }))} />
          </section>
        ) : (
          <section className="card p-6">
            <h2 className="font-serif text-2xl">Up next in the studio</h2>
            <p className="text-xs text-muted">Sorted by delivery date, then slot</p>
            <UpNext list={upNext} />
          </section>
        )}

        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Today by slot</h2>
            <Badge tone="neutral">{todays.length} orders</Badge>
          </div>
          <ul className="mt-5 space-y-4">
            {bySlot.map((s) => (
              <li key={s.code}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{s.label} <span className="text-xs font-normal text-muted">{s.window}</span></span>
                  <span className="tabular-nums text-muted">{s.total - s.n}/{s.total} done</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel-2">
                  <div className="h-full rounded-full bg-accent transition-all duration-1000" style={{ width: `${s.total ? ((s.total - s.n) / s.total) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
          {atRisk.length > 0 && (
            <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              <p className="flex items-center gap-2 font-semibold"><Icon name="alert" size={16} /> {atRisk.length} unpaid order{atRisk.length > 1 ? "s" : ""} due soon</p>
              <ul className="mt-2 space-y-1">
                {atRisk.map((o) => <li key={o.id}><Link href={`/orders/${o.id}`} className="underline-offset-2 hover:underline">{o.orderNumber}</Link> · {formatShort(o.deliveryDate)} · {lkr(o.total)}</li>)}
              </ul>
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="card p-6 xl:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl">Slips waiting</h2>
            {owner && <Link href="/payments" className="text-sm text-muted hover:text-fg">Review all</Link>}
          </div>
          {slips.length === 0 ? <p className="py-6 text-center text-sm text-muted">No slips to verify 🎉</p> : (
            <ul className="divide-y divide-line">
              {slips.slice(0, 5).map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"><Icon name="file" size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{o.customer.name}</p>
                    <p className="font-mono text-xs text-muted">{o.orderNumber}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{lkr(o.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl">Quotation inbox</h2>
            <Link href="/quotations" className="text-sm text-muted hover:text-fg">Open</Link>
          </div>
          <ul className="divide-y divide-line">
            {openQuotes.slice(0, 5).map((q) => (
              <li key={q.id}>
                <Link href={`/quotations/${q.id}`} className="flex items-center gap-3 py-3 transition hover:opacity-80">
                  <div className="flex -space-x-2">{q.items.slice(0, 3).map((i) => <Thumb key={i.flowerId} src={i.image} className="h-8 w-8 rounded-full ring-2 ring-panel" />)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{q.customer.name}</p>
                    <p className="text-xs text-muted">{q.items.reduce((s, i) => s + i.qty, 0)} stems · for {formatShort(q.deliveryDate)}</p>
                  </div>
                  <Icon name="chevronRight" size={16} className="text-faint" />
                </Link>
              </li>
            ))}
            {openQuotes.length === 0 && <p className="py-6 text-center text-sm text-muted">Inbox zero.</p>}
          </ul>
        </section>

        {owner ? (
          <section className="card p-6">
            <h2 className="mb-1 font-serif text-2xl">Revenue by occasion</h2>
            <p className="mb-5 text-xs text-muted">Paid orders in the current data set</p>
            <HBarChart data={byOccasion} />
          </section>
        ) : (
          <section className="card p-6">
            <h2 className="mb-4 font-serif text-2xl">Low stock</h2>
            <LowStock />
          </section>
        )}
      </div>

      {owner && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <section className="card p-6">
            <h2 className="font-serif text-2xl">Up next in the studio</h2>
            <p className="text-xs text-muted">Sorted by delivery date, then slot</p>
            <UpNext list={upNext} />
          </section>
          <section className="card p-6">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-serif text-2xl">Low stock</h2><Link href="/inventory" className="text-sm text-muted hover:text-fg">Stock</Link></div>
            <LowStock />
          </section>
        </div>
      )}
    </>
  );
}

function UpNext({ list }: { list: ReturnType<typeof useAdmin>["orders"] }) {
  return (
    <ul className="mt-4 divide-y divide-line">
      {list.map((o) => (
        <li key={o.id}>
          <Link href={`/orders/${o.id}`} className="flex items-center gap-4 py-3 transition hover:opacity-80">
            <Thumb src={o.items[0]?.image} className="h-12 w-10 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{o.items[0]?.name}{o.items.length > 1 ? ` +${o.items.length - 1}` : ""} <span className="text-muted">· {o.items[0]?.sizeTier?.toLowerCase() ?? "custom"}</span></p>
              <p className="text-xs text-muted">{o.recipient.name} · {o.fulfilment === "PICKUP" ? "Pickup" : o.recipient.city}</p>
            </div>
            <div className="text-right">
              <p className={cn("text-sm font-medium", o.deliveryDate === todayISO() && "text-accent")}>{o.deliveryDate === todayISO() ? "Today" : formatShort(o.deliveryDate)}</p>
              <p className="text-xs text-muted">{timeSlots.find((s) => s.code === o.timeSlot)?.label}</p>
            </div>
            <Badge tone={statusTone(o.orderStatus)}>{orderStatusLabel[o.orderStatus]}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function LowStock() {
  const { inventory } = useAdmin();
  const low = inventory.filter((i) => i.stockQty <= i.reorderLevel).sort((a, b) => a.stockQty / a.reorderLevel - b.stockQty / b.reorderLevel).slice(0, 6);
  return (
    <ul className="space-y-3">
      {low.map((i) => (
        <li key={i.id} className="flex items-center gap-3">
          <Thumb src={i.image} className="h-9 w-9 rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{i.name}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel-2"><div className={cn("h-full rounded-full", i.stockQty === 0 ? "bg-red-500" : "bg-amber-500")} style={{ width: `${Math.min(100, (i.stockQty / i.reorderLevel) * 100)}%` }} /></div>
          </div>
          <span className="text-xs tabular-nums text-muted">{i.stockQty}/{i.reorderLevel} {i.unit}</span>
        </li>
      ))}
      <p className="pt-1 text-[11px] text-faint">Information only — stock never blocks orders in v1.0.</p>
    </ul>
  );
}
