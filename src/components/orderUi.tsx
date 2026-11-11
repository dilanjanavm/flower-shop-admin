"use client";

import Link from "next/link";
import type { OrderStatus, QuoteStatus } from "@/lib/types";
import type { AdminOrder } from "@/lib/admin-types";
import { cn, lkr } from "@/lib/format";
import { addDays, formatShort, todayISO } from "@/lib/dates";
import { settings, timeSlots } from "@/lib/mock/delivery";
import { riders } from "@/lib/mock/admin";
import { Badge, Thumb, type Tone } from "./ui";
import { Icon } from "./Icon";

export function statusTone(s: OrderStatus): Tone {
  return (
    {
      PENDING_PAYMENT: "amber",
      PAYMENT_REVIEW: "amber",
      CONFIRMED: "blue",
      PREPARING: "accent",
      READY_FOR_DISPATCH: "accent",
      OUT_FOR_DELIVERY: "ink",
      DELIVERED: "green",
      DELIVERY_FAILED: "red",
      CANCELLED: "neutral",
    } as const
  )[s];
}

/** Human labels for the action button that moves to a status. */
export const actionLabel: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "Approve payment",
  PREPARING: "Start preparing",
  READY_FOR_DISPATCH: "Ready for dispatch",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Mark delivered",
  DELIVERY_FAILED: "Delivery failed",
  CANCELLED: "Cancel order",
  PENDING_PAYMENT: "Reject slip",
  PAYMENT_REVIEW: "Slip received",
};

export function slotOrder(o: AdminOrder) {
  return timeSlots.findIndex((s) => s.code === o.timeSlot);
}

/** Board sort: delivery date, slot start, creation time (FR-ADMIN-04.1). */
export function boardSort(a: AdminOrder, b: AdminOrder) {
  return a.deliveryDate.localeCompare(b.deliveryDate) || slotOrder(a) - slotOrder(b) || a.createdAt.localeCompare(b.createdAt);
}

export function OrderCard({ o, compact, draggable, onDragStart }: { o: AdminOrder; compact?: boolean; draggable?: boolean; onDragStart?: (e: React.DragEvent) => void }) {
  const t = todayISO();
  const slot = timeSlots.find((s) => s.code === o.timeSlot);
  const urgent = o.orderStatus === "PENDING_PAYMENT" && o.deliveryDate <= addDays(t, 3);
  const rider = riders.find((r) => r.id === o.riderId);
  return (
    <Link
      href={`/orders/${o.id}`}
      draggable={draggable}
      onDragStart={onDragStart}
      className={cn(
"group block rounded-xl border bg-panel p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]",
        urgent ? "border-amber-400/70" : "border-line",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="flex items-start gap-3">
        <Thumb src={o.items[0]?.image} className="h-12 w-10 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{o.items[0]?.name}{o.items.length > 1 ? ` +${o.items.length - 1}` : ""}</p>
          <p className="font-mono text-[11px] text-muted">{o.orderNumber}</p>
        </div>
        {o.orderType === "CUSTOM" && <Badge tone="accent">Custom</Badge>}
      </div>
      {!compact && (
        <>
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <Icon name="calendar" size={13} className="text-muted" />
            <span className={cn("font-medium", o.deliveryDate === t && "text-accent")}>{o.deliveryDate === t ? "Today" : formatShort(o.deliveryDate)}</span>
            <span className="text-muted">· {slot?.label}</span>
            {o.fulfilment === "PICKUP" && <Badge tone="neutral" className="ml-auto">Pickup</Badge>}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
            <Icon name="pin" size={13} />
            <span className="truncate">{o.recipient.name} · {o.fulfilment === "PICKUP" ? "Store" : o.recipient.city}</span>
          </div>
          {(urgent || rider || o.isAnonymousSender) && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {urgent && <Badge tone="amber"><Icon name="alert" size={11} /> Unpaid · due soon</Badge>}
              {rider && <Badge tone="neutral"><Icon name="bike" size={11} /> {rider.name.split(" ")[0]}</Badge>}
              {o.isAnonymousSender && <Badge tone="neutral">Anonymous</Badge>}
            </div>
          )}
        </>
      )}
    </Link>
  );
}

/* ───────── Printables (FR-ADMIN-04.3, UI-06) ───────── */

export function JobSheet({ o }: { o: AdminOrder }) {
  const slot = timeSlots.find((s) => s.code === o.timeSlot);
  return (
    <div className="print-sheet mx-auto w-full max-w-[148mm] rounded-xl border border-line bg-white p-6 text-[#1b1714]">
      <div className="flex items-start justify-between border-b border-dashed border-gray-300 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Florist job sheet</p>
          <p className="font-mono text-lg font-semibold">{o.orderNumber}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{formatShort(o.deliveryDate)}</p>
          <p className="text-gray-600">{slot?.label} · {slot?.window}</p>
        </div>
      </div>
      <table className="mt-3 w-full text-sm">
        <tbody>
          {o.items.map((i) => (
            <tr key={i.id} className="border-b border-gray-200 align-top">
              <td className="py-2 pr-2 text-lg font-bold">{i.qty}×</td>
              <td className="py-2"><p className="font-semibold">{i.name}{i.sizeTier ? ` — ${i.sizeTier}` : ""}</p><p className="text-gray-600">{i.detail}</p></td>
              <td className="w-6 py-2"><span className="inline-block h-4 w-4 rounded border border-gray-400" /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {o.cardMessage && <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm"><p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Card</p><p className="italic">“{o.cardMessage}”</p><p className="text-xs text-gray-500">— {o.isAnonymousSender ? "Anonymous" : o.senderName || "unsigned"}</p></div>}
      {o.internalNotes && <p className="mt-3 text-sm"><strong>Notes:</strong> {o.internalNotes}</p>}
      <p className="mt-4 text-xs text-gray-500">{o.fulfilment === "PICKUP" ? "STORE PICKUP" : `Deliver to ${o.recipient.city}`} · Prepared by ________ · QC ☐</p>
    </div>
  );
}

export function GreetingCard({ o, font }: { o: AdminOrder; font: "serif" | "script" | "sans" }) {
  const ff = font === "serif" ? "font-semibold tracking-tight" : font === "script" ? "italic font-medium" : "font-sans";
  return (
    <div className="print-sheet mx-auto flex aspect-[148/105] w-full max-w-[148mm] flex-col items-center justify-center rounded-xl border border-line bg-white p-8 text-center text-[#1b1714]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-mark.png" alt="" className="h-8 opacity-80" />
      <p className={cn("mt-5 max-w-sm text-2xl leading-snug", ff)}>{o.cardMessage || "With love"}</p>
      <p className={cn("mt-4 text-base text-gray-600", ff)}>— {o.isAnonymousSender ? "Someone who cares" : o.senderName || ""}</p>
    </div>
  );
}

/** Waybill: never shows prices (R2); hides the sender when anonymous (R1). */
export function Waybill({ o }: { o: AdminOrder }) {
  const slot = timeSlots.find((s) => s.code === o.timeSlot);
  const maps = `https://maps.google.com/?q=${encodeURIComponent(`${o.recipient.line1}, ${o.recipient.city}`)}`;
  return (
    <div className="print-sheet mx-auto w-full max-w-[148mm] rounded-xl border border-line bg-white p-6 text-[#1b1714]">
      <div className="flex items-center justify-between border-b border-gray-300 pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span className="text-lg font-semibold tracking-tight">Sithuliya Flora</span>
        <p className="font-mono text-sm font-semibold">{o.orderNumber}</p>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_110px] gap-4">
        <div className="text-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Deliver to</p>
          <p className="text-xl font-semibold">{o.recipient.name}</p>
          <p>{o.recipient.phone}</p>
          <p className="mt-1">{o.recipient.line1}</p>
          <p className="font-semibold">{o.recipient.city}</p>
          {o.recipient.landmark && <p className="text-gray-600">Landmark: {o.recipient.landmark}</p>}
          {o.recipient.instructions && <p className="text-gray-600">Note: {o.recipient.instructions}</p>}
        </div>
        <div className="text-center">
          {/* QR placeholder: encode `maps` with a QR library in production */}
          <div className="grid aspect-square place-items-center rounded-lg border-2 border-gray-800 p-1" title={maps}>
            <div className="grid h-full w-full grid-cols-7 grid-rows-7 gap-px">
              {Array.from({ length: 49 }).map((_, i) => <span key={i} className={((i * 7919) % 3 === 0 || [0, 1, 2, 7, 9, 14, 15, 16, 4, 5, 6, 11, 13, 18, 19, 20, 28, 29, 30, 35, 37, 42, 43, 44].includes(i)) ? "bg-gray-900" : ""} />)}
            </div>
          </div>
          <p className="mt-1 text-[9px] text-gray-500">Scan for Google Maps</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-dashed border-gray-300 pt-3 text-sm">
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">When</p><p className="font-semibold">{formatShort(o.deliveryDate)} · {slot?.window}</p></div>
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">From</p><p>{o.isAnonymousSender ? "Sithuliya Flora (sender private)" : o.customer.name}</p></div>
      </div>
      <p className="mt-4 text-[10px] text-gray-500">{settings.shop.phone} · Items: {o.items.reduce((s, i) => s + i.qty, 0)} · No prices shown</p>
    </div>
  );
}

export function money(n: number) {
  return lkr(n);
}

export function SlipPreview({ name, amount, reference }: { name: string; amount: number; reference: string }) {
  // Mock slip image — production shows the pre-signed S3 URL (valid 5 minutes, NFR-SEC-05)
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-white p-4 font-mono text-[10px] leading-relaxed text-gray-700 shadow-inner">
      <p className="text-center text-xs font-bold text-gray-900">COMMERCIAL BANK</p>
      <p className="text-center">CASH DEPOSIT / TRANSFER</p>
      <div className="my-2 border-t border-dashed border-gray-300" />
      <p>A/C: 8001 2345 6789</p>
      <p>NAME: SITHULIYA FLORA (PVT) LTD</p>
      <p>REF: {reference}</p>
      <p className="mt-1 text-sm font-bold text-gray-900">LKR {amount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}</p>
      <div className="my-2 border-t border-dashed border-gray-300" />
      <p className="truncate text-gray-400">{name}</p>
      <span className="absolute right-3 top-10 rotate-[-14deg] rounded border-2 border-emerald-600/60 px-1.5 text-[9px] font-bold text-emerald-700/70">PAID</span>
    </div>
  );
}

export const quoteTone: Record<QuoteStatus, Tone> = {
  REQUESTED: "amber",
  QUOTED: "blue",
  ACCEPTED: "green",
  DECLINED_BY_SHOP: "red",
  DECLINED_BY_CUSTOMER: "neutral",
  EXPIRED: "neutral",
  CANCELLED: "neutral",
};
