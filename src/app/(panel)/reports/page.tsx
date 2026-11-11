"use client";

import { useMemo, useState } from "react";
import { useAdmin } from "@/lib/store";
import { lkr } from "@/lib/format";
import { addDays, formatShort, todayISO } from "@/lib/dates";
import { revenueSeries } from "@/lib/mock/admin";
import { deliveryZones, zoneForCity } from "@/lib/mock/delivery";
import { AreaChart, ColumnChart, HBarChart } from "@/components/charts";
import { Button, PageHeader, Tabs, downloadCsv } from "@/components/ui";
import { OwnerOnly } from "@/components/Shell";
import { Icon } from "@/components/Icon";

/** Analytics (FR-ADMIN-01.2) with CSV export (FR-ADMIN-01.3). */
export default function ReportsPage() {
  const { orders, products, movements, inventory } = useAdmin();
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const [table, setTable] = useState(false);
  const days = Number(range);
  const series = useMemo(() => revenueSeries(days), [days]);
  const t = todayISO();
  const from = addDays(t, -days + 1);
  const revenue = series.reduce((s, d) => s + d.revenue, 0);
  const count = series.reduce((s, d) => s + d.orders, 0);

  const paid = orders.filter((o) => o.paymentStatus === "PAID" && o.createdAt.slice(0, 10) >= from);
  const top = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of paid) for (const i of o.items) m.set(i.name, (m.get(i.name) ?? 0) + i.qty);
    // pad with popularity so a fresh dataset still shows a useful top 10
    for (const p of products) if (!m.has(p.name)) m.set(p.name, Math.round(p.popularity / 12));
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [paid, products]);

  const byZone = deliveryZones.map((z) => ({ label: z.name, value: orders.filter((o) => o.fulfilment === "DELIVERY" && zoneForCity(o.recipient.city)?.id === z.id).length }));
  const wasteValue = movements.filter((m) => m.type === "WASTE" && m.at.slice(0, 10) >= from).reduce((s, m) => s + Math.abs(m.qty) * (inventory.find((i) => i.id === m.itemId)?.costPrice ?? 0), 0);
  const wasteRatio = revenue ? (wasteValue / revenue) * 100 : 0;
  const weekday = useMemo(() => {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const sums = Array(7).fill(0);
    for (const d of series) sums[new Date(`${d.date}T12:00:00Z`).getUTCDay()] += d.orders;
    return [1, 2, 3, 4, 5, 6, 0].map((i) => ({ label: names[i], value: sums[i] }));
  }, [series]);

  return (
    <OwnerOnly>
      <PageHeader
        title="Reports"
        subtitle={`${formatShort(from)} – ${formatShort(t)} · all values in LKR`}
        actions={
          <>
            <div className="w-64"><Tabs tabs={[{ key: "7", label: "7d" }, { key: "30", label: "30d" }, { key: "90", label: "90d" }]} value={range} onChange={setRange} /></div>
            <Button variant="outline" size="sm" onClick={() => downloadCsv(`revenue-${range}d.csv`, [["Date", "Revenue", "Orders"], ...series.map((d) => [d.date, d.revenue, d.orders])])}><Icon name="download" size={15} /> Export CSV</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { l: "Revenue", v: lkr(revenue) },
          { l: "Orders", v: count },
          { l: "Avg order value", v: lkr(Math.round(revenue / Math.max(1, count))) },
          { l: "Wastage vs sales", v: `${wasteRatio.toFixed(1)}%`, h: `${lkr(wasteValue)} of stems written off` },
        ].map((k) => (
          <div key={k.l} className="card p-5"><p className="text-xs text-muted">{k.l}</p><p className="mt-2 font-serif text-3xl tabular-nums">{k.v}</p>{k.h && <p className="mt-1 text-xs text-muted">{k.h}</p>}</div>
        ))}
      </div>

      <section className="card mt-6 p-6">
        <div className="flex items-center justify-between">
          <div><h2 className="font-serif text-2xl">Revenue trend</h2><p className="text-xs text-muted">Daily paid revenue</p></div>
          <button onClick={() => setTable((v) => !v)} className="text-sm text-muted hover:text-fg">{table ? "Show chart" : "Show as table"}</button>
        </div>
        {table ? (
          <div className="mt-4 max-h-80 overflow-y-auto"><table className="w-full text-sm"><thead><tr><th className="th">Date</th><th className="th text-right">Revenue</th><th className="th text-right">Orders</th></tr></thead><tbody className="divide-y divide-line">{series.map((d) => <tr key={d.date}><td className="td">{formatShort(d.date)}</td><td className="td text-right tabular-nums">{lkr(d.revenue)}</td><td className="td text-right tabular-nums">{d.orders}</td></tr>)}</tbody></table></div>
        ) : (
          <AreaChart data={series.map((d) => ({ label: formatShort(d.date).replace(/^\w+, /, ""), value: d.revenue }))} />
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-serif text-2xl">Top 10 bouquets</h2>
          <p className="mb-5 text-xs text-muted">Units sold</p>
          <HBarChart data={top} format={(n) => `${n} sold`} />
        </section>
        <section className="card p-6">
          <h2 className="font-serif text-2xl">Deliveries by zone</h2>
          <p className="mb-5 text-xs text-muted">Orders in the current dataset</p>
          <HBarChart data={byZone} format={(n) => `${n} orders`} />
          <h2 className="mt-8 font-serif text-2xl">Orders by weekday</h2>
          <p className="mb-4 text-xs text-muted">Sundays closed</p>
          <ColumnChart data={weekday} format={(n) => `${n} orders`} height={120} />
        </section>
      </div>
    </OwnerOnly>
  );
}
