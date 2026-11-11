"use client";

import { useState } from "react";
import { useAdmin } from "@/lib/store";
import type { CouponRow } from "@/lib/admin-types";
import { taxonomies } from "@/lib/mock/catalogue";
import { cn, lkr } from "@/lib/format";
import { addDays, formatDate, todayISO } from "@/lib/dates";
import { Badge, Button, Field, Modal, PageHeader, Toggle } from "@/components/ui";
import { OwnerOnly } from "@/components/Shell";
import { Icon } from "@/components/Icon";

/** Coupon engine (FR-ADMIN-06.2). The API re-validates every rule at checkout. */
export default function CouponsPage() {
  const { coupons, saveCoupon } = useAdmin();
  const [edit, setEdit] = useState<CouponRow | null>(null);
  const t = todayISO();
  const blank = (): CouponRow => ({ id: `cp${Date.now()}`, code: "", type: "PERCENT", value: 10, minSpend: 0, startsAt: t, endsAt: addDays(t, 30), usageLimit: 100, perUserLimit: 1, used: 0, firstOrderOnly: false, active: true });
  const live = (c: CouponRow) => c.active && c.startsAt <= t && c.endsAt >= t && c.used < c.usageLimit;

  return (
    <OwnerOnly>
      <PageHeader title="Coupons" subtitle="One coupon per order. Percentage or fixed, with spend, date, usage and category rules." actions={<Button size="sm" onClick={() => setEdit(blank())}><Icon name="plus" size={15} /> New coupon</Button>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {coupons.map((c, i) => (
          <div key={c.id} className={cn("card relative animate-fade-up overflow-hidden p-5", !live(c) && "opacity-70")} style={{ animationDelay: `${i * 50}ms` }}>
            <div aria-hidden className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent-soft" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="font-mono text-xl font-semibold tracking-wider">{c.code}</p>
                <p className="mt-1 font-serif text-3xl">{c.type === "PERCENT" ? `${c.value}% off` : `${lkr(c.value)} off`}</p>
              </div>
              {live(c) ? <Badge tone="green" dot>Live</Badge> : c.used >= c.usageLimit ? <Badge tone="neutral">Used up</Badge> : !c.active ? <Badge tone="neutral">Paused</Badge> : <Badge tone="amber">Scheduled / ended</Badge>}
            </div>
            <ul className="relative mt-4 space-y-1 text-xs text-muted">
              <li>{c.minSpend ? `Min spend ${lkr(c.minSpend)}` : "No minimum"}{c.maxDiscount ? ` · max ${lkr(c.maxDiscount)}` : ""}</li>
              <li>{formatDate(c.startsAt)} → {formatDate(c.endsAt)}</li>
              <li>{c.perUserLimit} per customer{c.firstOrderOnly ? " · first order only" : ""}{c.category ? ` · ${c.category} only` : ""}</li>
            </ul>
            <div className="relative mt-4">
              <div className="flex justify-between text-[11px] text-muted"><span>{c.used} used</span><span>{c.usageLimit} limit</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel-2"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (c.used / c.usageLimit) * 100)}%` }} /></div>
            </div>
            <div className="relative mt-4 flex items-center justify-between border-t border-line pt-3">
              <Toggle checked={c.active} onChange={(v) => saveCoupon({ ...c, active: v })} label="Active" />
              <button onClick={() => setEdit(c)} className="flex items-center gap-1 text-sm text-muted hover:text-fg"><Icon name="edit" size={15} /> Edit</button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.code ? `Edit ${edit.code}` : "New coupon"} wide footer={<><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button disabled={!edit?.code || (edit?.value ?? 0) <= 0 || (edit?.endsAt ?? "") < (edit?.startsAt ?? "")} onClick={() => { if (edit) saveCoupon(edit); setEdit(null); }}>Save coupon</Button></>}>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code"><input className="field font-mono uppercase" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase().replace(/\s/g, "") })} /></Field>
            <Field label="Type"><div className="grid grid-cols-2 gap-1 rounded-xl bg-panel-2 p-1">{(["PERCENT", "FIXED"] as const).map((k) => <button key={k} onClick={() => setEdit({ ...edit, type: k })} className={cn("rounded-lg py-1.5 text-sm", edit.type === k ? "bg-panel shadow-sm" : "text-muted")}>{k === "PERCENT" ? "Percentage" : "Fixed LKR"}</button>)}</div></Field>
            <Field label={edit.type === "PERCENT" ? "Percent off" : "Amount off (LKR)"}><input type="number" className="field" value={edit.value} onChange={(e) => setEdit({ ...edit, value: Number(e.target.value) })} /></Field>
            <Field label="Max discount (LKR)" hint="Optional cap for % coupons"><input type="number" className="field" value={edit.maxDiscount ?? ""} onChange={(e) => setEdit({ ...edit, maxDiscount: e.target.value ? Number(e.target.value) : undefined })} /></Field>
            <Field label="Minimum spend (LKR)"><input type="number" className="field" value={edit.minSpend} onChange={(e) => setEdit({ ...edit, minSpend: Number(e.target.value) })} /></Field>
            <Field label="Category"><select className="field" value={edit.category ?? ""} onChange={(e) => setEdit({ ...edit, category: e.target.value || undefined })}><option value="">All products</option>{taxonomies.occasions.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}</select></Field>
            <Field label="Starts"><input type="date" className="field" value={edit.startsAt} onChange={(e) => setEdit({ ...edit, startsAt: e.target.value })} /></Field>
            <Field label="Ends" error={edit.endsAt < edit.startsAt ? "Must be after start" : undefined}><input type="date" className="field" value={edit.endsAt} onChange={(e) => setEdit({ ...edit, endsAt: e.target.value })} /></Field>
            <Field label="Total usage limit"><input type="number" className="field" value={edit.usageLimit} onChange={(e) => setEdit({ ...edit, usageLimit: Number(e.target.value) })} /></Field>
            <Field label="Per customer"><input type="number" className="field" value={edit.perUserLimit} onChange={(e) => setEdit({ ...edit, perUserLimit: Number(e.target.value) })} /></Field>
            <div className="space-y-3 sm:col-span-2">
              <Toggle checked={edit.firstOrderOnly} onChange={(v) => setEdit({ ...edit, firstOrderOnly: v })} label="First order only" />
              <Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="Active" />
            </div>
          </div>
        )}
      </Modal>
    </OwnerOnly>
  );
}
