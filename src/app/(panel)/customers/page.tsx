"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "@/lib/store";
import type { CustomerRow } from "@/lib/admin-types";
import { cn, initials, lkr } from "@/lib/format";
import { formatDate, formatShort } from "@/lib/dates";
import { orderStatusLabel } from "@/lib/status";
import { Badge, Button, Drawer, PageHeader, SearchInput, Tabs, downloadCsv } from "@/components/ui";
import { OwnerOnly } from "@/components/Shell";
import { statusTone } from "@/components/orderUi";
import { Icon } from "@/components/Icon";

/** Customer directory with LTV and block/unblock (FR-ADMIN-06.1). */
export default function CustomersPage() {
  const { customers, orders, setCustomerStatus } = useAdmin();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "top" | "blocked">("all");
  const [sel, setSel] = useState<CustomerRow | null>(null);

  const list = customers
    .filter((c) => (tab === "blocked" ? c.status === "BLOCKED" : true))
    .filter((c) => !q || `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (tab === "top" ? b.ltv - a.ltv : b.lastOrder.localeCompare(a.lastOrder)))
    .slice(0, tab === "top" ? 10 : undefined);
  const current = sel ? customers.find((c) => c.id === sel.id) ?? sel : null;
  const theirOrders = current ? orders.filter((o) => o.customer.id === current.id) : [];

  return (
    <OwnerOnly>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} accounts · lifetime value counts verified payments only`}
        actions={<><div className="w-64"><SearchInput value={q} onChange={setQ} placeholder="Name, email or phone" /></div><Button variant="outline" size="sm" onClick={() => downloadCsv("customers.csv", [["Name", "Email", "Phone", "Orders", "LTV", "Status"], ...customers.map((c) => [c.name, c.email, c.phone, c.orders, c.ltv, c.status])])}><Icon name="download" size={15} /> CSV</Button></>}
      />
      <Tabs tabs={[{ key: "all", label: "All" }, { key: "top", label: "Top 10 by LTV" }, { key: "blocked", label: "Blocked", count: customers.filter((c) => c.status === "BLOCKED").length }]} value={tab} onChange={setTab} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-line bg-panel-2/50"><tr><th className="th">Customer</th><th className="th">Phone</th><th className="th text-right">Orders</th><th className="th text-right">LTV</th><th className="th">Last order</th><th className="th">Saved dates</th><th className="th">Status</th></tr></thead>
          <tbody className="divide-y divide-line">
            {list.map((c) => (
              <tr key={c.id} className="cursor-pointer hover:bg-panel-2/50" onClick={() => setSel(c)}>
                <td className="td"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent-fg">{initials(c.name)}</span><div><p className="font-medium">{c.name}</p><p className="text-xs text-muted">{c.email}</p></div></div></td>
                <td className="td text-muted">{c.phone}</td>
                <td className="td text-right tabular-nums">{c.orders}</td>
                <td className="td text-right font-semibold tabular-nums">{lkr(c.ltv)}</td>
                <td className="td text-muted">{c.lastOrder ? formatDate(c.lastOrder) : "—"}</td>
                <td className="td text-muted">{c.occasions}</td>
                <td className="td">{c.status === "ACTIVE" ? <Badge tone="green" dot>Active</Badge> : <Badge tone="red" dot>Blocked</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer
        open={!!current}
        onClose={() => setSel(null)}
        title={current?.name ?? ""}
        footer={current && (current.status === "ACTIVE" ? <Button variant="danger" onClick={() => setCustomerStatus(current.id, "BLOCKED")}><Icon name="ban" size={15} /> Block account</Button> : <Button onClick={() => setCustomerStatus(current.id, "ACTIVE")}>Unblock</Button>)}
      >
        {current && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              {[{ l: "Orders", v: current.orders }, { l: "Lifetime value", v: lkr(current.ltv) }, { l: "Member since", v: formatShort(current.joined) }].map((s) => (
                <div key={s.l} className="rounded-2xl bg-panel-2 p-3"><p className="text-[11px] text-muted">{s.l}</p><p className="mt-1 font-serif text-xl">{s.v}</p></div>
              ))}
            </div>
            <div className="space-y-1 text-sm"><p className="flex items-center gap-2"><Icon name="mail" size={15} className="text-muted" />{current.email}</p><p className="flex items-center gap-2"><Icon name="phone" size={15} className="text-muted" />{current.phone}</p></div>
            {current.status === "BLOCKED" && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">Blocked customers can&apos;t log in or place orders.</p>}
            <div>
              <p className="label">Orders</p>
              <ul className="divide-y divide-line">
                {theirOrders.map((o) => (
                  <li key={o.id}><Link href={`/orders/${o.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:opacity-80"><span><span className="font-mono text-xs">{o.orderNumber}</span><span className="block text-xs text-muted">{o.items[0]?.name} · {formatShort(o.deliveryDate)}</span></span><span className="flex items-center gap-2"><Badge tone={statusTone(o.orderStatus)}>{orderStatusLabel[o.orderStatus]}</Badge><span className={cn("tabular-nums")}>{lkr(o.total)}</span></span></Link></li>
                ))}
                {theirOrders.length === 0 && <p className="py-4 text-sm text-muted">No orders in the current window.</p>}
              </ul>
            </div>
          </div>
        )}
      </Drawer>
    </OwnerOnly>
  );
}
